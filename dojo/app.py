"""FastAPI app: the static dojo, user accounts, and a live Claude terminal per user.

The session model follows context-inspector (ADR-0008/ADR-0013 there): the
server owns the PTY and browser sockets are detachable views. Each user has at
most one session, with its own Claude config and workspace, and every browser
that user has open shares it.
"""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
import urllib.request
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from . import claude_home
from .accounts import COOKIE, COOKIE_TTL, AccountError, Accounts
from .config import Settings
from .terminal import TerminalExit, TerminalManager

SCRIPT_NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
MAX_SCRIPT_BYTES = 200_000
MODELS_TTL = 300.0


class CreateSession(BaseModel):
    model: str | None = None


class SessionInfo(BaseModel):
    session_id: str
    pid: int
    alive: bool
    model: str


class SaveScript(BaseModel):
    source: str = Field(max_length=MAX_SCRIPT_BYTES)


class Login(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)


class NewUser(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)
    admin: bool = False


class ChangeUser(BaseModel):
    password: str | None = Field(default=None, max_length=256)
    admin: bool | None = None


class ChangePassword(BaseModel):
    current: str = Field(max_length=256)
    password: str = Field(max_length=256)


# Reachable without logging in. Everything else under /api needs a session cookie.
PUBLIC_API = {"/api/health", "/api/login"}


def apply_terminal_message(session, message: object) -> str | None:
    """Apply one browser control message and return a safe error, if any."""
    if not isinstance(message, dict):
        return "terminal message must be an object"
    kind = message.get("type")
    if kind == "input":
        data = message.get("data")
        if not isinstance(data, str):
            return "input.data must be a string"
        session.write(data.encode("utf-8"))
        return None
    if kind == "resize":
        try:
            session.resize(int(message.get("rows")), int(message.get("cols")))
        except (TypeError, ValueError) as exc:
            return str(exc)
        return None
    return "unsupported terminal message"


def fetch_models(settings: Settings) -> list[str]:
    """Models the relay key can use, from the relay's own catalog."""
    request = urllib.request.Request(
        settings.base_url.rstrip("/") + "/v1/models?limit=1000",
        headers={"x-api-key": settings.api_key, "anthropic-version": "2023-06-01"},
    )
    with urllib.request.urlopen(request, timeout=10) as response:
        body = json.load(response)
    return sorted({item["id"] for item in body.get("data", []) if isinstance(item, dict) and item.get("id")})


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or Settings.from_env()
    accounts = Accounts(settings.state_dir)
    if settings.admin_password:
        accounts.ensure_admin(settings.admin_user, settings.admin_password)
    manager = TerminalManager()
    lifecycle = asyncio.Lock()
    models_by_session: dict[str, str] = {}
    session_by_user: dict[str, str] = {}
    catalog: dict[str, object] = {"at": 0.0, "models": None, "error": None}

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        await manager.stop_all()

    app = FastAPI(title="Workflow Dojo", lifespan=lifespan)

    @app.middleware("http")
    async def guard(request: Request, call_next):
        path = request.url.path
        if path.startswith("/api/") and path not in PUBLIC_API:
            user = accounts.read(request.cookies.get(COOKIE))
            if user is None:
                return JSONResponse({"detail": "Log in first."}, status_code=401)
            # A custom header forces a CORS preflight, so other sites can't post here.
            if request.method not in ("GET", "HEAD") and request.headers.get("x-dojo") != "1":
                return JSONResponse({"detail": "Missing X-Dojo header"}, status_code=403)
            request.state.user = user
        response = await call_next(request)
        response.headers.setdefault("Cache-Control", "no-cache")
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    def me(request: Request) -> dict:
        return request.state.user

    def require_admin(request: Request) -> dict:
        user = me(request)
        if not user["admin"]:
            raise HTTPException(403, "Admins only.")
        return user

    @app.get("/healthz")
    @app.get("/api/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    # ------------------------------------------------------------ accounts
    def set_cookie(request: Request, response: Response, value: str, max_age: int) -> None:
        secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
        response.set_cookie(COOKIE, value, max_age=max_age, httponly=True, samesite="strict", secure=secure, path="/")

    @app.post("/api/login")
    async def login(body: Login, request: Request, response: Response) -> dict:
        if request.headers.get("x-dojo") != "1":
            raise HTTPException(403, "Missing X-Dojo header")
        name = body.username.strip().lower()
        if not await asyncio.to_thread(accounts.verify, name, body.password):
            await asyncio.sleep(0.5)  # slows password guessing
            raise HTTPException(401, "Wrong username or password.")
        set_cookie(request, response, accounts.issue(name), COOKIE_TTL)
        return accounts.get(name)

    @app.post("/api/logout")
    async def logout(request: Request, response: Response) -> dict:
        set_cookie(request, response, "", 0)
        return {"ok": True}

    @app.get("/api/me")
    async def whoami(request: Request) -> dict:
        return me(request)

    @app.post("/api/me/password")
    async def change_own_password(body: ChangePassword, request: Request) -> dict:
        name = me(request)["name"]
        if not await asyncio.to_thread(accounts.verify, name, body.current):
            raise HTTPException(400, "Your current password is wrong.")
        try:
            await asyncio.to_thread(accounts.set_password, name, body.password)
        except AccountError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {"ok": True}

    @app.get("/api/progress")
    async def get_progress(request: Request) -> dict:
        return await asyncio.to_thread(accounts.progress, me(request)["name"])

    @app.patch("/api/progress")
    async def patch_progress(request: Request) -> dict[str, bool]:
        changes = await request.json()
        if not isinstance(changes, dict):
            raise HTTPException(400, "Send an object of {key: value}.")
        try:
            await asyncio.to_thread(accounts.update_progress, me(request)["name"], changes)
        except AccountError as exc:
            raise HTTPException(413, str(exc)) from exc
        return {"ok": True}

    @app.get("/api/users")
    async def list_users(request: Request) -> list[dict]:
        require_admin(request)
        return [{**u, "live": owned_session(u["name"]) is not None} for u in accounts.list()]

    @app.post("/api/users")
    async def add_user(body: NewUser, request: Request) -> dict:
        require_admin(request)
        try:
            return await asyncio.to_thread(accounts.create, body.username.strip().lower(), body.password, body.admin)
        except AccountError as exc:
            raise HTTPException(400, str(exc)) from exc

    @app.patch("/api/users/{name}")
    async def change_user(name: str, body: ChangeUser, request: Request) -> dict:
        require_admin(request)
        try:
            if body.password is not None:
                await asyncio.to_thread(accounts.set_password, name, body.password)
            if body.admin is not None:
                await asyncio.to_thread(accounts.set_admin, name, body.admin)
        except KeyError as exc:
            raise HTTPException(404, "No such user.") from exc
        except AccountError as exc:
            raise HTTPException(400, str(exc)) from exc
        return accounts.get(name)

    @app.delete("/api/users/{name}")
    async def remove_user(name: str, request: Request) -> dict:
        if require_admin(request)["name"] == name:
            raise HTTPException(400, "You can't delete yourself.")
        await stop_user_session(name)
        try:
            await asyncio.to_thread(accounts.delete, name)
        except KeyError as exc:
            raise HTTPException(404, "No such user.") from exc
        except AccountError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {"deleted": name}

    # ------------------------------------------------------------ live Claude
    async def available_models() -> tuple[list[str], str | None]:
        if settings.command_override is not None or not (settings.base_url and settings.api_key):
            return list(settings.fallback_models), None
        if catalog["models"] is not None and time.monotonic() - catalog["at"] < MODELS_TTL:
            return catalog["models"], catalog["error"]
        try:
            models = await asyncio.to_thread(fetch_models, settings) or list(settings.fallback_models)
            error = None
        except Exception as exc:  # noqa: BLE001 - surfaced to the UI, never fatal
            models, error = list(settings.fallback_models), f"Relay model catalog unavailable: {exc}"
        catalog.update(at=time.monotonic(), models=models, error=error)
        return models, error

    def info(session) -> SessionInfo:
        return SessionInfo(session_id=session.id, pid=session.pid, alive=session.alive,
                           model=models_by_session.get(session.id, ""))

    def owned_session(name: str):
        session = manager.get(session_by_user.get(name, ""))
        return session if session is not None and session.alive else None

    async def stop_user_session(name: str) -> bool:
        session_id = session_by_user.pop(name, None)
        models_by_session.pop(session_id or "", None)
        return bool(session_id) and await manager.stop(session_id)

    @app.get("/api/live")
    async def live(request: Request) -> dict:
        reason = settings.live_unavailable_reason()
        models, error = await available_models() if reason is None else ([], None)
        default = settings.default_model if settings.default_model in models else (models[0] if models else None)
        active = owned_session(me(request)["name"])
        return {
            "available": reason is None,
            "reason": reason,
            "models": models,
            "default_model": default,
            "catalog_error": error,
            "skip_permissions": settings.skip_permissions,
            "active": info(active).model_dump() if active else None,
        }

    @app.post("/api/sessions", response_model=SessionInfo)
    async def create_session(body: CreateSession, request: Request) -> SessionInfo:
        name = me(request)["name"]
        async with lifecycle:
            reason = settings.live_unavailable_reason()
            if reason:
                raise HTTPException(409, reason)
            active = owned_session(name)
            if active is not None:
                if body.model and body.model != models_by_session.get(active.id):
                    raise HTTPException(409, {"message": "A session with a different model is running. Stop it first.",
                                              **info(active).model_dump()})
                return info(active)
            running = sum(1 for sid in session_by_user.values() if (s := manager.get(sid)) and s.alive)
            if running >= settings.max_sessions:
                raise HTTPException(409, f"All {settings.max_sessions} Claude sessions are in use. Try again later.")
            await stop_user_session(name)  # clear out a session that has exited
            models, _ = await available_models()
            model = body.model or (settings.default_model if settings.default_model in models else models[0])
            if model not in models:
                raise HTTPException(400, f"Model {model!r} is not available to the dojo's relay key")
            config_dir, workspace = settings.claude_config_dir(name), settings.workspace(name)
            await asyncio.to_thread(claude_home.prepare, config_dir, workspace, settings.api_key)
            env = os.environ.copy()
            env.update({
                "CLAUDE_CONFIG_DIR": str(config_dir),
                "DISABLE_AUTOUPDATER": "1",
                "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
                "TERM": "xterm-256color",
                "COLORTERM": "truecolor",
            })
            session = manager.create(settings.session_command(model), cwd=workspace, env=env)
            models_by_session[session.id] = model
            session_by_user[name] = session.id
            return info(session)

    @app.get("/api/sessions/active", response_model=SessionInfo | None)
    async def active_session(request: Request) -> SessionInfo | None:
        session = owned_session(me(request)["name"])
        return info(session) if session else None

    @app.delete("/api/sessions/{session_id}")
    async def stop_session(session_id: str, request: Request) -> dict[str, bool]:
        name = me(request)["name"]
        async with lifecycle:
            if session_by_user.get(name) != session_id or not await stop_user_session(name):
                raise HTTPException(404, "Session not found")
            return {"stopped": True}

    @app.put("/api/workspace/scripts/{name}")
    async def save_script(name: str, body: SaveScript, request: Request) -> dict[str, str]:
        if not SCRIPT_NAME.match(name):
            raise HTTPException(400, "Script names are lowercase letters, digits and dashes")
        scripts = settings.scripts_dir(me(request)["name"])
        scripts.mkdir(parents=True, exist_ok=True)
        path = scripts / f"{name}.workflow.js"
        await asyncio.to_thread(path.write_text, body.source, "utf-8")
        return {"path": str(path)}

    @app.websocket("/api/sessions/{session_id}/terminal")
    async def terminal_socket(websocket: WebSocket, session_id: str) -> None:
        user = accounts.read(websocket.cookies.get(COOKIE))
        if user is None:
            await websocket.close(code=4401, reason="Log in first")
            return
        session = manager.get(session_id)
        if session is None or session_by_user.get(user["name"]) != session_id:
            await websocket.close(code=4404, reason="Session not found")
            return
        await websocket.accept()
        output = session.subscribe()

        async def send_output() -> None:
            while True:
                message = await output.get()
                if isinstance(message, TerminalExit):
                    await websocket.send_text(json.dumps({"type": "exit", "exit_code": message.exit_code}))
                    return
                await websocket.send_bytes(message)

        async def receive_input() -> None:
            while True:
                error = apply_terminal_message(session, await websocket.receive_json())
                if error is not None:
                    await websocket.send_json({"type": "error", "message": error})

        sender = asyncio.create_task(send_output())
        receiver = asyncio.create_task(receive_input())
        try:
            done, _ = await asyncio.wait({sender, receiver}, return_when=asyncio.FIRST_COMPLETED)
            for task in done:
                task.result()
        except (WebSocketDisconnect, RuntimeError):
            pass
        finally:
            for task in (sender, receiver):
                if not task.done():
                    task.cancel()
            await asyncio.gather(sender, receiver, return_exceptions=True)
            session.unsubscribe(output)

    app.mount("/", StaticFiles(directory=settings.static_dir, html=True), name="static")
    return app
