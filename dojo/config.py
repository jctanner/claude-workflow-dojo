"""Environment-driven settings for the dojo server."""

from __future__ import annotations

import json
import os
import shutil
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _flag(name: str, default: bool) -> bool:
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    host: str = "127.0.0.1"
    port: int = 8080
    static_dir: Path = ROOT / "static"
    state_dir: Path = ROOT / ".state"
    claude_bin: str = "claude"
    default_model: str = "claude-haiku-5-5"
    fallback_models: tuple[str, ...] = ("claude-haiku-5-5",)
    skip_permissions: bool = True
    command_override: tuple[str, ...] | None = None
    base_url: str | None = None
    api_key: str | None = field(default=None, repr=False)
    admin_user: str = "admin"
    admin_password: str | None = field(default=None, repr=False)
    max_sessions: int = 4

    # Each user gets their own Claude config and workspace.
    def claude_config_dir(self, user: str) -> Path:
        return self.state_dir / "users" / user / "claude"

    def workspace(self, user: str) -> Path:
        return self.state_dir / "users" / user / "workspace"

    def scripts_dir(self, user: str) -> Path:
        return self.workspace(user) / "scripts"

    def live_unavailable_reason(self) -> str | None:
        """Why a Claude session cannot start, or None when it can."""
        if self.command_override is not None:
            return None
        if shutil.which(self.claude_bin) is None:
            return f"The `{self.claude_bin}` CLI is not installed on the dojo server."
        if not self.api_key:
            return "No ANTHROPIC_API_KEY is configured. Provision a Model Relay key for the dojo."
        if not self.base_url:
            return "No ANTHROPIC_BASE_URL is configured. Point it at Model Relay."
        return None

    def session_command(self, model: str) -> list[str]:
        if self.command_override is not None:
            return list(self.command_override)
        argv = [self.claude_bin, "--model", model]
        if self.skip_permissions:
            argv.append("--dangerously-skip-permissions")
        return argv

    @classmethod
    def from_env(cls) -> "Settings":
        override = os.environ.get("DOJO_COMMAND_JSON")
        command = None
        if override:
            parsed = json.loads(override)
            if not isinstance(parsed, list) or not parsed or not all(isinstance(a, str) for a in parsed):
                raise ValueError("DOJO_COMMAND_JSON must be a non-empty JSON array of strings")
            command = tuple(parsed)
        models = tuple(m.strip() for m in os.environ.get("DOJO_MODELS", "").split(",") if m.strip())
        default_model = os.environ.get("DOJO_DEFAULT_MODEL", cls.default_model)
        return cls(
            host=os.environ.get("DOJO_HOST", cls.host),
            port=int(os.environ.get("DOJO_PORT", cls.port)),
            state_dir=Path(os.environ.get("DOJO_STATE_DIR", str(cls.state_dir))).expanduser(),
            claude_bin=os.environ.get("DOJO_CLAUDE_BIN", cls.claude_bin),
            default_model=default_model,
            fallback_models=models or (default_model,),
            skip_permissions=_flag("DOJO_SKIP_PERMISSIONS", True),
            command_override=command,
            base_url=os.environ.get("ANTHROPIC_BASE_URL") or None,
            api_key=os.environ.get("ANTHROPIC_API_KEY") or None,
            admin_user=os.environ.get("DOJO_ADMIN_USER", cls.admin_user),
            admin_password=os.environ.get("DOJO_ADMIN_PASSWORD") or None,
            max_sessions=int(os.environ.get("DOJO_MAX_SESSIONS", cls.max_sessions)),
        )
