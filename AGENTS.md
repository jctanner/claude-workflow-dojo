# Workflow Dojo

A LeetCode-style trainer for Claude Code workflow scripts, deployed as an
optional Breadboard service.

- `static/js/runtime.js` is the simulator. It must stay faithful to the
  Workflow tool's documented semantics. When it differs on purpose, say so on
  the Reference page (`renderLearn` in `static/js/app.js`).
- Each problem is a directory under `static/problems/` with `problem.js`
  (description, fixture `respond`, tests), `starter.workflow.js` and
  `solution.workflow.js`. Register new slugs in `static/problems/index.js`.
- Run `npm test` (plain Node, no dependencies) after any change. Every
  solution must be Accepted and every starter must not be.
- `dojo/` is the server: `terminal.py` is ported from
  `checkouts/context-inspector`; keep it generic. One uvicorn worker only,
  because live sessions are in-process state. Sessions and workspaces are
  per user; `accounts.py` owns users, cookies and progress.
- Never point the dojo at the operator's real `~/.claude`; it always uses
  `CLAUDE_CONFIG_DIR` under `DOJO_STATE_DIR`.
- Never log or return `ANTHROPIC_API_KEY`, password hashes or `secret.key`.
- Run `.venv/bin/python -m unittest discover -s tests` for server changes.
- The frontend has no build step and no npm dependencies; xterm.js and
  CodeMirror load from pinned CDN URLs. Keep it that way.
- Deploy through Breadboard (`make host-rebuild-dojo`), not a component-local
  command.
