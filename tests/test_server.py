"""End-to-end server checks with `cat` standing in for Claude.

Runs a real uvicorn process (Starlette's TestClient hangs on lifespan with a
live PTY, as context-inspector found).
"""

import asyncio
import json
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path

import httpx
import websockets

ROOT = Path(__file__).resolve().parent.parent


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class ServerTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.state = tempfile.TemporaryDirectory()
        cls.port = free_port()
        env = {**os.environ, "DOJO_PORT": str(cls.port), "DOJO_STATE_DIR": cls.state.name,
               "DOJO_COMMAND_JSON": json.dumps(["sh", "-c", "stty -echo; cat"]), "DOJO_MODELS": "m1,m2",
               "DOJO_DEFAULT_MODEL": "m1", "DOJO_ADMIN_USER": "admin", "DOJO_ADMIN_PASSWORD": "admin"}
        env.pop("ANTHROPIC_API_KEY", None)
        cls.proc = subprocess.Popen([sys.executable, "-m", "dojo"], cwd=ROOT, env=env,
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.base = f"http://127.0.0.1:{cls.port}"
        for _ in range(100):
            try:
                httpx.get(cls.base + "/healthz", timeout=0.5)
                break
            except httpx.HTTPError:
                time.sleep(0.1)
        cls.admin = cls.login("admin", "admin")

    @classmethod
    def login(cls, username, password):
        client = httpx.Client(base_url=cls.base, headers={"X-Dojo": "1"})
        res = client.post("/api/login", json={"username": username, "password": password})
        assert res.status_code == 200, res.text
        return client

    @classmethod
    def tearDownClass(cls):
        cls.proc.terminate()
        cls.proc.wait(5)
        cls.state.cleanup()

    def test_static_and_live_status(self):
        page = httpx.get(self.base + "/")
        self.assertEqual(page.status_code, 200)
        self.assertIn("Workflow Dojo", page.text)
        js = httpx.get(self.base + "/js/runtime.js")
        self.assertIn("javascript", js.headers["content-type"])
        live = self.admin.get("/api/live").json()
        self.assertTrue(live["available"])
        self.assertEqual(live["models"], ["m1", "m2"])
        self.assertEqual(live["default_model"], "m1")

    def test_api_needs_login(self):
        for path in ("/api/live", "/api/me", "/api/progress", "/api/users"):
            self.assertEqual(httpx.get(self.base + path).status_code, 401, path)
        self.assertEqual(httpx.get(self.base + "/api/health").status_code, 200)
        wrong = httpx.post(self.base + "/api/login", json={"username": "admin", "password": "nope"},
                           headers={"X-Dojo": "1"})
        self.assertEqual(wrong.status_code, 401)
        forged = httpx.get(self.base + "/api/me", cookies={"dojo_session": "admin.9999999999.forged"})
        self.assertEqual(forged.status_code, 401)
        self.assertEqual(self.admin.get("/api/me").json(), {"name": "admin", "admin": True})

    def test_users_and_progress(self):
        created = self.admin.post("/api/users", json={"username": "pat", "password": "pat-pw"})
        self.assertEqual(created.status_code, 200, created.text)
        self.assertEqual(self.admin.post("/api/users", json={"username": "pat", "password": "x1234"}).status_code, 400)
        pat = self.login("pat", "pat-pw")
        try:
            # Non-admins can't manage users, and the last admin can't be removed.
            self.assertEqual(pat.get("/api/users").status_code, 403)
            self.assertEqual(self.admin.patch("/api/users/admin", json={"admin": False}).status_code, 400)
            # Progress is per user, merges keys, and a null value deletes a key.
            self.assertEqual(pat.patch("/api/progress", json={"solved": ["js-arrows"], "code:x": "1"}).status_code, 200)
            self.assertEqual(pat.patch("/api/progress", json={"code:x": None}).status_code, 200)
            self.assertEqual(pat.get("/api/progress").json(), {"solved": ["js-arrows"]})
            self.assertNotIn("solved", self.admin.get("/api/progress").json())
            # Writes need the X-Dojo header.
            bare = httpx.patch(self.base + "/api/progress", json={"a": 1}, cookies=pat.cookies)
            self.assertEqual(bare.status_code, 403)
            # Password changes need the current password.
            self.assertEqual(pat.post("/api/me/password", json={"current": "bad", "password": "new-pw"}).status_code, 400)
            self.assertEqual(pat.post("/api/me/password", json={"current": "pat-pw", "password": "new-pw"}).status_code, 200)
            self.login("pat", "new-pw")
        finally:
            self.assertEqual(self.admin.delete("/api/users/pat").status_code, 200)
        self.assertEqual(pat.get("/api/me").status_code, 401)
        self.assertFalse((Path(self.state.name) / "users" / "pat").exists())

    def test_save_script_requires_header_and_valid_name(self):
        body = {"source": "export const meta = {}"}
        bare = httpx.put(self.base + "/api/workspace/scripts/fan-out", json=body, cookies=self.admin.cookies)
        self.assertEqual(bare.status_code, 403)
        bad = self.admin.put("/api/workspace/scripts/..%2Fx", json=body)
        self.assertIn(bad.status_code, (400, 404, 405))
        self.assertEqual(self.admin.put("/api/workspace/scripts/Bad_Name", json=body).status_code, 400)
        ok = self.admin.put("/api/workspace/scripts/fan-out", json=body)
        self.assertEqual(ok.status_code, 200)
        path = Path(ok.json()["path"])
        self.assertEqual(path.read_text(), body["source"])
        self.assertEqual(path.parent, Path(self.state.name) / "users" / "admin" / "workspace" / "scripts")

    def test_session_roundtrip(self):
        created = self.admin.post("/api/sessions", json={"model": "m1"}).json()
        sid = created["session_id"]
        self.admin.post("/api/users", json={"username": "sam", "password": "sam-pw"})
        sam = self.login("sam", "sam-pw")
        try:
            # Attaching again returns the same session; another model conflicts.
            self.assertEqual(self.admin.post("/api/sessions", json={}).json()["session_id"], sid)
            self.assertEqual(self.admin.post("/api/sessions", json={"model": "m2"}).status_code, 409)
            self.assertEqual(self.admin.get("/api/sessions/active").json()["model"], "m1")
            # Another user doesn't see or control it.
            self.assertIsNone(sam.get("/api/sessions/active").json())
            self.assertEqual(sam.delete(f"/api/sessions/{sid}").status_code, 404)
            # The Claude home was seeded for this user.
            seeded = json.loads((Path(self.state.name) / "users" / "admin" / "claude" / ".claude.json").read_text())
            self.assertTrue(seeded["hasCompletedOnboarding"])

            def cookie(client):
                return "dojo_session=" + client.cookies["dojo_session"]

            async def refused(client):
                url = f"ws://127.0.0.1:{self.port}/api/sessions/{sid}/terminal"
                headers = {"Cookie": cookie(client)} if client else {}
                try:
                    async with websockets.connect(url, additional_headers=headers) as ws:
                        await asyncio.wait_for(ws.recv(), 5)
                except Exception:  # noqa: BLE001 - any refusal is fine
                    return True
                return False

            self.assertTrue(asyncio.run(refused(None)))
            self.assertTrue(asyncio.run(refused(sam)))

            async def echo():
                url = f"ws://127.0.0.1:{self.port}/api/sessions/{sid}/terminal"
                async with websockets.connect(url, additional_headers={"Cookie": cookie(self.admin)}) as ws:
                    await ws.send(json.dumps({"type": "resize", "rows": 30, "cols": 100}))
                    await ws.send(json.dumps({"type": "input", "data": "hello dojo\r"}))
                    seen = b""
                    while b"hello dojo" not in seen:
                        frame = await asyncio.wait_for(ws.recv(), 5)
                        seen += frame if isinstance(frame, bytes) else frame.encode()
                    await ws.send(json.dumps({"type": "bogus"}))
                    while True:
                        frame = await asyncio.wait_for(ws.recv(), 5)
                        if isinstance(frame, str):
                            return json.loads(frame)

            self.assertEqual(asyncio.run(echo())["type"], "error")
        finally:
            self.assertEqual(self.admin.delete(f"/api/sessions/{sid}").status_code, 200)
            self.admin.delete("/api/users/sam")
        self.assertIsNone(self.admin.get("/api/sessions/active").json())


if __name__ == "__main__":
    unittest.main()
