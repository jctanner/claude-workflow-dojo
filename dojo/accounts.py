"""Users, login cookies and per-user progress, kept as JSON under the state dir.

Layout under ``state_dir``:

- ``users.json``: ``{name: {salt, hash, admin}}``; scrypt password hashes.
- ``secret.key``: the HMAC key that signs login cookies (created on first run).
- ``users/<name>/progress.json``: the browser's key/value progress store.
- ``users/<name>/claude`` and ``users/<name>/workspace``: that user's Claude
  config and workspace (see app.py).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import threading
import time
from pathlib import Path

USERNAME = re.compile(r"^[a-z0-9][a-z0-9_.-]{0,31}$")
MIN_PASSWORD = 4
COOKIE = "dojo_session"
COOKIE_TTL = 30 * 24 * 3600
MAX_PROGRESS_BYTES = 5_000_000


class AccountError(ValueError):
    """A request the caller can fix: bad name, short password, last admin."""


def _hash(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32)


def _write_json(path: Path, value: object) -> None:
    # Write then rename, so a crash never leaves half a file.
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(value, separators=(",", ":")), "utf-8")
    os.replace(tmp, path)


class Accounts:
    def __init__(self, state_dir: Path) -> None:
        self.state_dir = state_dir
        self._lock = threading.Lock()
        self._users_path = state_dir / "users.json"
        key_path = state_dir / "secret.key"
        state_dir.mkdir(parents=True, exist_ok=True)
        if not key_path.exists():
            key_path.write_bytes(secrets.token_bytes(32))
            key_path.chmod(0o600)
        self._key = key_path.read_bytes()

    # ------------------------------------------------------------ users
    def _load(self) -> dict[str, dict]:
        try:
            return json.loads(self._users_path.read_text("utf-8"))
        except FileNotFoundError:
            return {}

    def list(self) -> list[dict]:
        return [{"name": name, "admin": bool(u.get("admin"))} for name, u in sorted(self._load().items())]

    def get(self, name: str) -> dict | None:
        user = self._load().get(name)
        return {"name": name, "admin": bool(user.get("admin"))} if user else None

    def create(self, name: str, password: str, admin: bool = False) -> dict:
        if not USERNAME.match(name):
            raise AccountError("Usernames are 1-32 lowercase letters, digits, '.', '_' or '-'.")
        self._check_password(password)
        with self._lock:
            users = self._load()
            if name in users:
                raise AccountError(f"User {name!r} already exists.")
            users[name] = self._record(password, admin)
            _write_json(self._users_path, users)
        return {"name": name, "admin": admin}

    def ensure_admin(self, name: str, password: str) -> bool:
        """Create the bootstrap admin if missing. Never resets an existing password."""
        if not name or not password or self.get(name):
            return False
        self.create(name, password, admin=True)
        return True

    def set_password(self, name: str, password: str) -> None:
        self._check_password(password)
        with self._lock:
            users = self._load()
            if name not in users:
                raise KeyError(name)
            users[name] = {**self._record(password, users[name].get("admin", False))}
            _write_json(self._users_path, users)

    def set_admin(self, name: str, admin: bool) -> None:
        with self._lock:
            users = self._load()
            if name not in users:
                raise KeyError(name)
            if not admin and self._last_admin(users, name):
                raise AccountError("You can't remove the last admin.")
            users[name]["admin"] = admin
            _write_json(self._users_path, users)

    def delete(self, name: str) -> None:
        with self._lock:
            users = self._load()
            if name not in users:
                raise KeyError(name)
            if self._last_admin(users, name):
                raise AccountError("You can't delete the last admin.")
            del users[name]
            _write_json(self._users_path, users)
        shutil.rmtree(self.user_dir(name), ignore_errors=True)

    def verify(self, name: str, password: str) -> bool:
        user = self._load().get(name)
        if not user:
            _hash(password, b"0" * 16)  # same cost either way, so timing doesn't reveal names
            return False
        expected = base64.b64decode(user["hash"])
        return hmac.compare_digest(_hash(password, base64.b64decode(user["salt"])), expected)

    @staticmethod
    def _check_password(password: str) -> None:
        if len(password) < MIN_PASSWORD:
            raise AccountError(f"Passwords need at least {MIN_PASSWORD} characters.")

    @staticmethod
    def _record(password: str, admin: bool) -> dict:
        salt = secrets.token_bytes(16)
        return {"salt": base64.b64encode(salt).decode(), "hash": base64.b64encode(_hash(password, salt)).decode(),
                "admin": bool(admin)}

    @staticmethod
    def _last_admin(users: dict, name: str) -> bool:
        admins = [n for n, u in users.items() if u.get("admin")]
        return admins == [name]

    # ------------------------------------------------------------ cookies
    def issue(self, name: str) -> str:
        """A signed ``name.expiry.signature`` token."""
        body = f"{name}.{int(time.time()) + COOKIE_TTL}"
        return f"{body}.{self._sign(body)}"

    def read(self, token: str | None) -> dict | None:
        """The logged-in user for a cookie, or None if it's missing, forged, expired or deleted."""
        if not token or token.count(".") < 2:
            return None
        body, _, signature = token.rpartition(".")
        name, _, expiry = body.rpartition(".")
        if not hmac.compare_digest(signature, self._sign(body)):
            return None
        if not expiry.isdigit() or int(expiry) < time.time():
            return None
        return self.get(name)

    def _sign(self, body: str) -> str:
        return base64.urlsafe_b64encode(hmac.new(self._key, body.encode(), hashlib.sha256).digest()).decode().rstrip("=")

    # ------------------------------------------------------------ progress
    def user_dir(self, name: str) -> Path:
        return self.state_dir / "users" / name

    def progress(self, name: str) -> dict:
        try:
            return json.loads((self.user_dir(name) / "progress.json").read_text("utf-8"))
        except FileNotFoundError:
            return {}

    def update_progress(self, name: str, changes: dict) -> dict:
        """Apply ``{key: value}``; a None value deletes the key."""
        with self._lock:
            data = self.progress(name)
            for key, value in changes.items():
                if value is None:
                    data.pop(key, None)
                else:
                    data[key] = value
            if len(json.dumps(data)) > MAX_PROGRESS_BYTES:
                raise AccountError("Progress is over the 5 MB limit.")
            _write_json(self.user_dir(name) / "progress.json", data)
        return data
