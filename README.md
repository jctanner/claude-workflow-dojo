# Workflow Dojo

Learn to create, run and debug Claude Code **workflow scripts**, the
JavaScript that the Workflow tool uses to orchestrate subagents
(`agent`, `parallel`, `pipeline`, `phase`, `log`, `args`, `budget`).

**Tier 0** is eight plain-JavaScript problems (no `meta`) on the JavaScript
habits that trip up Python developers, each shown beside its Python equivalent:
arrow returns, `sort`, template strings, `??`/`?.`, spread, positional
callbacks, objects vs dicts, and `await`/`Promise.all`. Each Tier 0 problem
also lists printed page numbers in *Speaking JavaScript* (Rauschmayer, 2014),
kept in `static/problems/_book.js`; `npm test` checks that every Tier 0
problem has an entry. **Tier 1** is
workflows. **Tier 2** is production patterns, each generalized from a real
pipeline into one atomic lesson: validate before spending, hard stops,
skipping done work, failure ledgers, verify-don't-trust checkpoints,
cross-field checks (no root `oneOf`), coverage gates, per-item drops in a
`pipeline`, and schemas built from data. Four more come from the recovery
lessons of migrating a Bash pipeline to workflows: don't reuse stale work,
record intent before an external write, defer one stale item instead of
failing the batch, and decide completion from evidence. Tests can expect a throw
(`expectError: /regex/`).

Problems are LeetCode-style: a description, a starter script, hidden tests,
and verdicts (Accepted, Wrong Answer, Runtime Error, Compile Error, Time Limit
Exceeded). **Create** problems teach a pattern, and **Debug** problems hand you
a broken workflow. A **Playground** lets you write any script together with
the fixture that answers its agents, and a **Reference** page summarizes the
API.

## How it works

Nothing calls a model. `static/js/runtime.js` runs scripts on a virtual
clock with mocked agents:

- each agent's duration, tokens and answer come from the problem's fixture;
- the concurrency cap queues excess agents, so barriers and sequential
  `await`s show up as a longer simulated wall clock (Time Limit Exceeded);
- `meta` must be the first statement and a pure literal, TypeScript is
  rejected with a hint, and `Date.now()`, argless `new Date()` and
  `Math.random()` throw, as they do in the real runtime;
- `parallel` and `pipeline` null semantics, schema checks, budget ceilings,
  agent caps and deadlocks are reported, along with warnings for orphaned
  agents and promises passed where thunks were expected.

Every run produces a timeline, an agent table and a log view. Scripts run in
a Web Worker that is killed after 8 seconds of real time.

## Live Claude shell

`python -m dojo` (FastAPI) serves the page and owns one `claude` CLI session
per user in a PTY, bridged to xterm.js over `/api/sessions/{id}/terminal`. The
design is ported from `checkouts/context-inspector`. Every console has a
**Claude** tab:

- **Run for real** saves the script to `<state>/users/<name>/workspace/scripts/` and asks
  Claude to run it with the Workflow tool.
- **Ask Claude** requests a hint about the current script and verdict.

Claude uses an isolated `CLAUDE_CONFIG_DIR` under `DOJO_STATE_DIR`, seeded so
it skips onboarding, trust and API-key prompts. It reaches the model through
`ANTHROPIC_BASE_URL` and `ANTHROPIC_API_KEY`; in Breadboard, those point at
Model Relay. When the page is served statically, the live buttons stay hidden.

The server also has user accounts (`dojo/accounts.py`). Every `/api` route
except `/api/health` and `/api/login` needs a login cookie. Progress is a
per-user key/value document (`GET`/`PATCH /api/progress`) that the page
uses in place of `localStorage`. Served statically, the page has no accounts
and keeps progress in `localStorage`. Set `DOJO_ADMIN_PASSWORD` to create the
first admin.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DOJO_HOST` / `DOJO_PORT` | `127.0.0.1` / `8080` | listen address |
| `DOJO_STATE_DIR` | `./.state` | users, progress, and each user's Claude config + workspace |
| `DOJO_ADMIN_USER` / `DOJO_ADMIN_PASSWORD` | `admin` / — | create this admin if it doesn't exist (never resets a password) |
| `DOJO_MAX_SESSIONS` | `4` | live Claude sessions allowed at once |
| `DOJO_DEFAULT_MODEL` | `claude-haiku-5-5` | preselected model, if the key can see it |
| `DOJO_MODELS` | — | fallback model list when no relay catalog |
| `DOJO_SKIP_PERMISSIONS` | `1` | pass `--dangerously-skip-permissions` |
| `DOJO_COMMAND_JSON` | — | run this argv instead of `claude` (tests) |

## Run locally

```bash
uv venv && uv pip install -e '.[dev]'
ANTHROPIC_BASE_URL=... ANTHROPIC_API_KEY=... .venv/bin/python -m dojo   # http://127.0.0.1:8080
npm test                                        # simulator + every problem
.venv/bin/python -m unittest discover -s tests  # server, with `cat` as the shell
```

In Breadboard, deploy it with `make host-deploy-dojo` (see
`docs/workflow-dojo.md` there). The image is `Containerfile`.

## Add a problem

1. Create `static/problems/<slug>/` with `problem.js`, `starter.workflow.js`
   and `solution.workflow.js`.
2. Add the slug to `static/problems/index.js`.
3. Run `npm test`.

Set `tier: 0` for a plain-JavaScript problem (no `meta`; `respond` is optional)
and `python: '...'` to show a Python equivalent. `problem.js` exports `{title, difficulty, category, goal, concepts, description,
hints, respond(call, test), tests: [{name, args?, budget?, wallClockMs?,
check(result, run)}]}` plus optional `wallClockMs`, `concurrency` and
`maxAgents`. `check` returns `null` when the test passes, or a message. `goal` is one plain
sentence saying what to return; the page shows it first, with the first test's
`args` and `expected` as an example, and `npm test` requires it.
