"""Seed an isolated Claude Code config so the TUI opens straight to a prompt.

The dojo runs Claude with CLAUDE_CONFIG_DIR pointing at its own state, never
at the operator's real ~/.claude. Seeding answers the first-run questions
(theme/onboarding, folder trust, custom API key approval, bypass-permissions
acknowledgement) that would otherwise block a browser user.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

WORKSPACE_GUIDE = """\
# Workflow Dojo workspace

This is the live Claude shell behind Workflow Dojo, a trainer for Claude Code
workflow scripts. The dojo rewrites this file at every session start.

## If you were given one small task (you are a workflow subagent)

Prompts like "Scan auth for hotspots", "Summarize api.py" or "Try to refute
finding F1" come from a workflow script, not a person. Answer that task
directly, in a few sentences, from general knowledge, then stop. The systems
named are imaginary exercise material: do not search, read or run any files,
do not run anything under `scripts/`, and do not mention or try to use the
Workflow tool. If a schema is required, return plausible values that satisfy it.

## If you are the main session

- Scripts saved from the dojo are in `scripts/<problem>.workflow.js`.
- To run one, call the Workflow tool with `scriptPath` set to that file and
  `args` as a JSON value (not a JSON-encoded string). Never run them with node.
- Keep runs small: the user is learning orchestration, not paying for depth.
"""


def _read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
    return value if isinstance(value, dict) else {}


def _write_json(path: Path, value: dict) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(path)


def prepare(config_dir: Path, workspace: Path, api_key: str | None) -> None:
    config_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    (workspace / "scripts").mkdir(parents=True, exist_ok=True)
    (workspace / "CLAUDE.md").write_text(WORKSPACE_GUIDE, encoding="utf-8")

    state_path = config_dir / ".claude.json"
    state = _read_json(state_path)
    state["hasCompletedOnboarding"] = True
    state.setdefault("theme", "dark")
    state["bypassPermissionsModeAccepted"] = True
    projects = state.setdefault("projects", {})
    project = projects.setdefault(str(workspace), {})
    project["hasTrustDialogAccepted"] = True
    project["hasCompletedProjectOnboarding"] = True
    if api_key:
        # Claude Code records approval by the key's last 20 characters.
        responses = state.setdefault("customApiKeyResponses", {})
        approved = responses.setdefault("approved", [])
        suffix = api_key[-20:]
        if suffix not in approved:
            approved.append(suffix)
        responses.setdefault("rejected", [])
    _write_json(state_path, state)

    settings_path = config_dir / "settings.json"
    settings = _read_json(settings_path)
    settings["skipDangerousModePermissionPrompt"] = True
    _write_json(settings_path, settings)
