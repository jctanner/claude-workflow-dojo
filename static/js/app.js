import { SLUGS, loadProblem } from '../problems/index.js';
import { BOOK, READING } from '../problems/_book.js';
import { fmtMs } from './judge.js';
import { boot, renderAccount, renderAccountMenu, renderLogin, renderUsers, store } from './account.js';
import { confirmSpend, liveStatus, mountLive, saveScript, selectedModel, sendPrompt } from './live.js';

const view = document.getElementById('view');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const show = v => (v === undefined ? 'undefined' : JSON.stringify(v, null, 2));

const solved = () => new Set(store.get('solved', []));

let catalog;
async function getCatalog() {
  catalog ??= await Promise.all(SLUGS.map(loadProblem));
  return catalog;
}
// Tier 0 is numbered 0.1, 0.2, …; workflow problems keep 1, 2, ….
function numberOf(all, p) {
  const peers = all.filter(q => (q.tier ?? 1) === (p.tier ?? 1));
  const n = peers.indexOf(p) + 1;
  const tier = p.tier ?? 1;
  return tier === 1 ? String(n) : `${tier}.${n}`;
}

const TIERS = [
  { tier: 0, title: 'Tier 0 · JavaScript for Python developers', blurb: 'Plain scripts, no meta. One JavaScript habit per problem, each shown beside its Python equivalent.' },
  { tier: 1, title: 'Tier 1 · Workflows', blurb: 'Real workflow scripts: meta, agent(), parallel(), pipeline(), schemas and budgets.' },
  { tier: 2, title: 'Tier 2 · Production patterns', blurb: 'One pattern each, generalized from a real production pipeline: fail fast, failure ledgers, verify-don’t-trust, coverage gates, per-item drops, strict schemas, and the recovery lessons from migrating a Bash pipeline: freshness, write-once side effects, per-item deferral, evidence-based completion.' },
];

const sourceCache = {};
async function source(slug, kind) {
  const key = `${slug}/${kind}`;
  sourceCache[key] ??= await (await fetch(`problems/${slug}/${kind}.workflow.js`)).text();
  return sourceCache[key];
}

async function updateProgress() {
  const all = await getCatalog();
  document.getElementById('progress').textContent = `${all.filter(p => solved().has(p.slug)).length} / ${all.length} solved`;
}

// ------------------------------------------------------------ worker
let worker;
function execute(message, timeoutMs = 8000) {
  worker ??= new Worker('js/worker.js', { type: 'module' });
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      worker.terminate();
      worker = null;
      resolve({ ok: false, error: 'Time Limit Exceeded (real time): the script never yielded. Look for a loop that spins without awaiting an agent.' });
    }, timeoutMs);
    worker.onmessage = ({ data }) => {
      clearTimeout(timer);
      resolve(data);
    };
    worker.onerror = e => {
      clearTimeout(timer);
      worker = null;
      resolve({ ok: false, error: e.message || 'worker failed to start' });
    };
    worker.postMessage(message);
  });
}

// ------------------------------------------------------------ editor
function makeEditor(host, value, onChange) {
  if (window.CodeMirror) {
    const cm = window.CodeMirror(host, {
      value,
      mode: 'javascript',
      lineNumbers: true,
      indentUnit: 2,
      tabSize: 2,
      matchBrackets: true,
      autoCloseBrackets: true,
      extraKeys: { Tab: c => c.replaceSelection('  ') },
    });
    let marked = null;
    cm.on('change', () => {
      if (marked != null) cm.removeLineClass(marked, 'background', 'cm-error-line');
      marked = null;
      onChange(cm.getValue());
    });
    return {
      get: () => cm.getValue(),
      set: v => cm.setValue(v),
      mark(line) {
        if (marked != null) cm.removeLineClass(marked, 'background', 'cm-error-line');
        marked = line - 1;
        cm.addLineClass(marked, 'background', 'cm-error-line');
        cm.scrollIntoView({ line: marked, ch: 0 }, 80);
        cm.setCursor({ line: marked, ch: 0 });
        cm.focus();
      },
      refresh: () => cm.refresh(),
    };
  }
  const ta = document.createElement('textarea');
  ta.value = value;
  ta.spellcheck = false;
  ta.addEventListener('input', () => onChange(ta.value));
  host.append(ta);
  return { get: () => ta.value, set: v => (ta.value = v), mark() {}, refresh() {} };
}

function splitters(root) {
  const gutter = root.querySelector('.gutter');
  const hgutter = root.querySelector('.hgutter');
  const right = root.querySelector('.right');
  const drag = (el, move) => el && el.addEventListener('mousedown', e => {
    e.preventDefault();
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  });
  drag(gutter, e => {
    const pct = Math.min(70, Math.max(22, (e.clientX / window.innerWidth) * 100));
    root.style.gridTemplateColumns = `${pct}% 6px 1fr`;
  });
  drag(hgutter, e => {
    const box = right.getBoundingClientRect();
    const h = Math.min(box.height - 120, Math.max(90, box.bottom - e.clientY));
    right.style.setProperty('--console-h', `${h}px`);
  });
}

// ------------------------------------------------------------ result views
const PALETTE = ['#e8a33d', '#6ea8fe', '#4cc38a', '#d6a2f0', '#f08d6a', '#5fd1d1', '#c9b458'];
function phaseColor(phase, phases) {
  const i = phases.indexOf(phase);
  return PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
}

function renderTimeline(run, selected) {
  const agents = run.trace.agents;
  if (!agents.length) return '<div class="empty">No agents were spawned.</div>';
  const end = Math.max(run.stats.wallClock, ...agents.map(a => a.end ?? a.start ?? 0), 1);
  const pct = t => `${(t / end) * 100}%`;
  const phases = [...new Set(agents.map(a => a.phase ?? '(none)'))];
  const step = [250, 500, 1000, 2000, 5000, 10000, 30000, 60000].find(s => end / s <= 10) || 120000;
  const ticks = [];
  for (let t = 0; t <= end; t += step) ticks.push(`<span style="left:${pct(t)}">${fmtMs(t)}</span>`);
  const marks = [
    ...run.trace.phases.map(p => `<div class="tl-mark phase" style="left:${pct(p.at)}" title="phase: ${esc(p.title)}"></div>`),
    ...run.trace.logs.map(l => `<div class="tl-mark log" style="left:${pct(l.at)}" title="log: ${esc(l.message)}"></div>`),
  ].join('');
  const rows = agents.map(a => {
    const start = a.start ?? end;
    const stop = a.end ?? end;
    const color = phaseColor(a.phase ?? '(none)', phases);
    const title = `#${a.id} ${a.label}\nqueued ${fmtMs(a.queuedAt)}, ${a.start == null ? 'never started' : `ran ${fmtMs(start)}–${a.end == null ? '…' : fmtMs(stop)}`}\n${a.status}${a.note ? `: ${a.note}` : ''}`;
    return `<div class="tl-row${selected === a.id ? ' sel' : ''}" data-agent="${a.id}" title="${esc(title)}">
      <div class="tl-label">#${a.id} ${esc(a.label)}</div>
      <div class="tl-track">${marks}
        ${start > a.queuedAt ? `<div class="tl-queue" style="left:${pct(a.queuedAt)};width:${pct(start - a.queuedAt)}"></div>` : ''}
        <div class="tl-bar ${a.status}" style="left:${pct(start)};width:max(3px, ${pct(stop - start)});background:${color}"></div>
      </div></div>`;
  }).join('');
  const legend = phases.map(p => `<span><i style="background:${phaseColor(p, phases)}"></i>${esc(p)}</span>`).join('')
    + '<span><i style="background:var(--bad)"></i>null result</span>'
    + '<span><i style="border:1px dashed var(--warn)"></i>orphaned</span>'
    + '<span><i style="background:repeating-linear-gradient(90deg,var(--faint) 0 3px,transparent 3px 6px)"></i>queued (cap)</span>';
  return `<div class="timeline"><div class="tl-axis">${ticks.join('')}</div>${rows}<div class="legend">${legend}</div></div>`;
}

function renderAgentDetail(a) {
  if (!a) return '';
  return `<div class="detail"><h4>#${a.id} ${esc(a.label)} <span class="st-${a.status}">${a.status}</span></h4>
    ${a.note ? `<div class="callout warn">${esc(a.note)}</div>` : ''}
    <div class="kv"><div><span>phase</span><b>${esc(a.phase ?? '—')}</b></div><div><span>queued</span><b>${fmtMs(a.queuedAt)}</b></div>
    <div><span>started</span><b>${a.start == null ? '—' : fmtMs(a.start)}</b></div><div><span>finished</span><b>${a.end == null ? '—' : fmtMs(a.end)}</b></div>
    <div><span>tokens</span><b>${a.tokens}</b></div></div>
    <b>Prompt</b><pre>${esc(a.prompt)}</pre>
    ${a.opts && Object.keys(a.opts).length ? `<b>Options</b><pre>${esc(show(a.opts))}</pre>` : ''}
    <b>Output</b><pre class="output-pre">${esc(show(a.output))}</pre></div>`;
}

function renderAgents(run) {
  if (!run.trace.agents.length) return '<div class="empty">No agents were spawned.</div>';
  return `<table class="agents"><tr><th>#</th><th>label</th><th>phase</th><th>status</th><th>start</th><th>end</th><th>output</th></tr>${run.trace.agents.map(a => `
    <tr><td class="mono">${a.id}</td><td>${esc(a.label)}</td><td>${esc(a.phase ?? '')}</td>
    <td class="st-${a.status}">${a.status}${a.note ? `<br><small>${esc(a.note)}</small>` : ''}</td>
    <td class="mono">${a.start == null ? '—' : fmtMs(a.start)}</td><td class="mono">${a.end == null ? '—' : fmtMs(a.end)}</td>
    <td class="mono">${esc(show(a.output)).slice(0, 160)}</td></tr>`).join('')}</table>`;
}

function renderLogs(run) {
  const lines = [
    ...run.trace.phases.map(p => ({ at: p.at, html: `<span class="ph">phase</span>${esc(p.title)}` })),
    ...run.trace.logs.map(l => ({ at: l.at, html: `${l.phase ? `<span class="ph">[${esc(l.phase)}]</span>` : ''}${esc(l.message)}` })),
  ].sort((a, b) => a.at - b.at);
  if (!lines.length) return '<div class="empty">No phase() or log() calls. Logs are how a workflow narrates progress and reports what it dropped.</div>';
  return lines.map(l => `<div class="logline"><span class="at">${fmtMs(l.at)}</span>${l.html}</div>`).join('');
}

function renderResult(out, selectedCase, reference) {
  const r = out.results[selectedCase];
  const run = r.run;
  const cls = out.verdict === 'Accepted' ? 'ok' : out.verdict === 'Finished' ? 'neutral' : 'bad';
  const chips = out.results.length > 1 || out.results[0].name !== 'playground'
    ? `<div class="case-chips">${out.results.map((c, i) => `<button class="case-chip ${c.verdict === 'Accepted' ? 'pass' : ''} ${i === selectedCase ? 'on' : ''}" data-case="${i}"><span class="dot"></span>${esc(c.name)}</button>`).join('')}</div>`
    : '';
  const s = run.stats;
  const ref = reference && reference[selectedCase];
  const over = r.limit != null && s.wallClock > r.limit;
  const err = run.error;
  return `<div class="verdict ${cls}">${esc(out.verdict)}</div>${chips}
    ${r.verdict !== out.verdict ? `<div><b>${esc(r.name)}</b>: <span class="${r.verdict === 'Accepted' ? 'st-done' : 'st-failed'}">${esc(r.verdict)}</span></div>` : ''}
    ${err ? `<div class="callout">${esc(err.message)}${err.line ? `<a href="#" class="jump" data-line="${err.line}">line ${err.line} →</a>` : ''}</div>` : r.detail ? `<div class="callout">${esc(r.detail)}</div>` : ''}
    ${err && err.hint ? `<div class="callout hint">${esc(err.hint)}</div>` : ''}
    ${run.trace.warnings.map(w => `<div class="callout warn">⚠ ${esc(w.message)}</div>`).join('')}
    <div class="kv">
      <div class="${over ? 'over' : ''}"><span>wall clock${r.limit != null ? ` / limit ${fmtMs(r.limit)}` : ''}</span><b>${fmtMs(s.wallClock)}</b></div>
      <div><span>agents</span><b>${s.agents}</b></div>
      <div><span>tokens</span><b>${s.tokens.toLocaleString()}</b></div>
      <div><span>peak concurrency</span><b>${s.peakConcurrency}</b></div>
      <div><span>parallelism</span><b>${s.wallClock ? (s.agentTime / s.wallClock).toFixed(1) : '0.0'}×</b></div>
      ${ref ? `<div><span>reference</span><b>${fmtMs(ref.wallClock)} · ${ref.agents} ag</b></div>` : ''}
    </div>
    ${run.ok ? `<b>Returned</b><pre class="output-pre">${esc(show(run.result))}</pre>` : ''}
    ${run.trace.logs.length ? `<b>Log</b> <a href="#" data-goto="logs">(${run.trace.logs.length} line${run.trace.logs.length === 1 ? '' : 's'}, timed view in Logs →)</a>
      <pre class="output-pre">${run.trace.logs.map(l => `${l.phase ? `[${esc(l.phase)}] ` : ''}${esc(l.message)}`).join('\n')}</pre>` : ''}`;
}

function mountConsole(host, editor) {
  let out = null;
  let reference = null;
  let tab = 'result';
  let selectedCase = 0;
  let selectedAgent = null;
  const body = host.querySelector('.pane-body');
  const liveHost = host.querySelector('.live-host');
  const draw = () => {
    host.querySelectorAll('.tabs button[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    const logCount = out && out.results ? out.results[selectedCase].run.trace.logs.length : 0;
    host.querySelector('[data-tab="logs"]').textContent = logCount ? `Logs (${logCount})` : 'Logs';
    body.hidden = tab === 'claude';
    liveHost.hidden = tab !== 'claude';
    if (tab === 'claude') {
      mountLive(liveHost);
      return;
    }
    if (!out) {
      body.innerHTML = '<div class="empty">Run your workflow to see results. <kbd>Ctrl</kbd>+<kbd>Enter</kbd> runs, <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> submits.</div>';
      return;
    }
    if (out.error) {
      body.innerHTML = `<div class="verdict bad">Error</div><div class="callout">${esc(out.error)}</div>`;
      return;
    }
    const run = out.results[selectedCase].run;
    if (tab === 'result') body.innerHTML = renderResult(out, selectedCase, reference);
    if (tab === 'timeline') body.innerHTML = renderTimeline(run, selectedAgent) + renderAgentDetail(run.trace.agents.find(a => a.id === selectedAgent));
    if (tab === 'agents') body.innerHTML = renderAgents(run);
    if (tab === 'logs') body.innerHTML = renderLogs(run);
  };
  host.querySelector('.tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (b) {
      tab = b.dataset.tab;
      draw();
    }
  });
  body.addEventListener('click', e => {
    const chip = e.target.closest('[data-case]');
    if (chip) {
      selectedCase = Number(chip.dataset.case);
      selectedAgent = null;
      return draw();
    }
    const row = e.target.closest('[data-agent]');
    if (row) {
      selectedAgent = Number(row.dataset.agent);
      return draw();
    }
    const goto = e.target.closest('[data-goto]');
    if (goto) {
      e.preventDefault();
      tab = goto.dataset.goto;
      return draw();
    }
    const jump = e.target.closest('[data-line]');
    if (jump) {
      e.preventDefault();
      editor.mark(Number(jump.dataset.line));
    }
  });
  draw();
  return {
    busy(label) {
      tab = 'result';
      draw();
      body.innerHTML = `<div class="empty">${esc(label)}…</div>`;
    },
    showClaude() {
      tab = 'claude';
      draw();
    },
    // One line describing the latest judge outcome, for prompts to Claude.
    summary() {
      if (!out || out.error) return out ? `The dojo reported an error: ${out.error}` : '';
      const r = out.results[selectedCase];
      const err = r.run.error;
      const warnings = r.run.trace.warnings.slice(0, 3).map(w => w.message).join(' ');
      return `The dojo's simulator says: ${out.verdict}${r.name ? ` on test "${r.name}"` : ''}${err ? ` (${err.message}${err.line ? ` at line ${err.line}` : ''})` : r.detail ? ` (${r.detail})` : ''}.${warnings ? ` Simulator warnings: ${warnings}` : ''}`;
    },
    show(result) {
      out = result.ok ? result.out : { error: result.error };
      reference = out.reference || null;
      selectedCase = out.results ? Math.max(0, out.results.findIndex(r => !['Accepted', 'Finished'].includes(r.verdict))) : 0;
      selectedAgent = null;
      tab = 'result';
      draw();
      const err = out.results && out.results[selectedCase].run.error;
      if (err && err.line) editor.mark(err.line);
    },
  };
}

const CONSOLE_HTML = `<div class="console">
  <div class="tabs"><button data-tab="result" class="on">Result</button><button data-tab="timeline">Timeline</button>
  <button data-tab="agents">Agents</button><button data-tab="logs">Logs</button>
  <span class="spacer"></span><button data-tab="claude">Claude ▸</button></div>
  <div class="pane-body"></div><div class="live-host" hidden></div></div>`;

const LIVE_BUTTONS = `<button class="btn live-btn" data-act="ask" hidden title="Ask the live Claude shell for a hint">Ask Claude</button>
  <button class="btn live-btn" data-act="real" hidden title="Run this script with the real Workflow tool">Run for real</button>`;

// Show the live buttons only when the dojo server (not a static host) is serving us.
async function revealLive(root) {
  if (await liveStatus()) root.querySelectorAll('.live-btn').forEach(b => (b.hidden = false));
}

const oneLine = html => {
  const text = new DOMParser().parseFromString(html, 'text/html').body.textContent || '';
  return text.replace(/\s+/g, ' ').trim();
};

async function runForReal(con, name, source, args) {
  con.showClaude();
  if (!confirmSpend(selectedModel())) return;
  const { path } = await saveScript(name, source);
  const argText = args === undefined ? '' : ` and pass args exactly as this JSON value: ${JSON.stringify(args)}`;
  await sendPrompt(`Use the Workflow tool to run the workflow script at ${path} (pass it as scriptPath${argText}). When it finishes, show its return value and summarize how many agents ran and anything that failed or was dropped.`);
}

// ------------------------------------------------------------ pages
async function renderList() {
  const all = await getCatalog();
  const done = solved();
  let filter = store.get('filter', 'All');
  const count = d => all.filter(p => p.difficulty === d);
  view.innerHTML = `<div class="list-page">
    <div class="hero"><h1>Learn Claude Code workflows by solving them</h1>
      <p>New to JavaScript? Start with <b>Tier 0</b>: ${all.filter(p => p.tier === 0).length} short problems on the JavaScript
      that workflows actually use, each with its Python equivalent.</p>
      <p>Each problem is a workflow script: <code>agent()</code>, <code>parallel()</code>, <code>pipeline()</code>, schemas, budgets.
      Scripts run in a deterministic simulator with mocked agents and a virtual clock. Runs are free and instant, and every
      one comes with a timeline. <b>Create</b> problems ask you to build a pattern. <b>Debug</b> problems hand you a broken workflow.</p></div>
    <div class="stats-row">
      <div class="stat"><b>${done.size}/${all.length}</b><span>solved</span></div>
      ${['Easy', 'Medium', 'Hard'].map(d => `<div class="stat"><b class="diff-${d}">${count(d).filter(p => done.has(p.slug)).length}/${count(d).length}</b><span>${d}</span></div>`).join('')}
    </div>
    <div class="filters">${['All', 'JS', 'Create', 'Debug', 'Pattern', 'Unsolved'].map(f => `<button class="chip" data-filter="${f}">${f === 'JS' ? 'JS basics' : f === 'Pattern' ? 'Patterns' : f}</button>`).join('')}</div>
    <table class="problems"><thead><tr><th></th><th>Title</th><th>Type</th><th>Concepts</th><th>Difficulty</th></tr></thead><tbody></tbody></table></div>`;
  const draw = () => {
    view.querySelectorAll('[data-filter]').forEach(b => b.classList.toggle('on', b.dataset.filter === filter));
    const keep = p => filter === 'All' || p.category === filter || (filter === 'Unsolved' && !done.has(p.slug));
    view.querySelector('tbody').innerHTML = TIERS.map(({ tier, title, blurb }) => {
      const rows = all.filter(p => (p.tier ?? 1) === tier && keep(p));
      if (!rows.length) return '';
      const solvedHere = all.filter(p => (p.tier ?? 1) === tier && done.has(p.slug)).length;
      const total = all.filter(p => (p.tier ?? 1) === tier).length;
      return `<tr class="tier-row"><td colspan="5"><b>${esc(title)}</b> <span class="tier-count">${solvedHere}/${total}</span>
        <div class="tier-blurb">${esc(blurb)}</div></td></tr>` + rows.map(p => `<tr>
        <td class="status-dot">${done.has(p.slug) ? '✓' : ''}</td>
        <td class="ptitle"><span class="num">${numberOf(all, p)}.</span><a href="#/p/${p.slug}">${esc(p.title)}</a></td>
        <td><span class="cat cat-${p.category}">${p.category === 'JS' ? 'JS basics' : p.category}</span></td>
        <td><div class="tags">${p.concepts.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div></td>
        <td class="diff-${p.difficulty}">${p.difficulty}</td></tr>`).join('');
    }).join('');
  };
  view.querySelector('.filters').addEventListener('click', e => {
    const b = e.target.closest('[data-filter]');
    if (b) {
      filter = b.dataset.filter;
      store.set('filter', filter);
      draw();
    }
  });
  draw();
}

// The task in one sentence, then the first test as input -> expected output.
function goalBox(p) {
  if (!p.goal) return '';
  const t = p.tests[0];
  // Short values on one line; longer ones break once, one element or key per line.
  const show = v => {
    const flat = JSON.stringify(v);
    if (flat.length <= 72 || v === null || typeof v !== 'object') return flat;
    const lines = Array.isArray(v)
      ? v.map(x => JSON.stringify(x))
      : Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`);
    return Array.isArray(v) ? `[\n  ${lines.join(',\n  ')}\n]` : `{\n  ${lines.join(',\n  ')}\n}`;
  };
  const rows = [];
  if (t && t.args !== undefined) rows.push(`<div class="goal-k">args</div><pre>${esc(show(t.args))}</pre>`);
  if (t && t.expected !== undefined) rows.push(`<div class="goal-k">you return</div><pre>${esc(show(t.expected))}</pre>`);
  return `<div class="goal-box"><div class="goal-label">Goal</div><p class="goal-text">${p.goal}</p>
    ${rows.length ? `<div class="goal-ex">${rows.join('')}</div>` : ''}</div>`;
}

// Page references into Speaking JavaScript for the Tier 0 problems.
function bookBox(slug) {
  const r = READING[slug];
  if (!r) return '';
  const code = t => esc(t).replace(/`([^`]+)`/g, '<code>$1</code>');
  const rows = r.pages.map(([pages, topic]) => `<li><b>p. ${esc(pages)}</b> ${code(topic)}</li>`).join('');
  return `<div class="book-box"><div class="book-label">Read in <i>${esc(BOOK.title)}</i> (${esc(BOOK.author)}, ${esc(BOOK.edition)})</div>
    ${rows ? `<ul>${rows}</ul>` : ''}
    ${r.gap ? `<p class="book-gap">${code(r.gap)} ${esc(BOOK.newer)}</p>` : ''}</div>`;
}

async function renderProblem(slug) {
  const all = await getCatalog();
  const idx = all.findIndex(p => p.slug === slug);
  if (idx < 0) return renderNotFound();
  const p = all[idx];
  const starter = await source(slug, 'starter');
  const saved = store.get(`code:${slug}`, null);
  view.innerHTML = `<div class="workspace">
    <section class="pane left">
      <div class="tabs"><button data-ltab="desc" class="on">Description</button><button data-ltab="hints">Hints</button>
        <button data-ltab="solution">Solution</button><button data-ltab="subs">Submissions</button></div>
      <div class="pane-body"></div>
    </section>
    <div class="gutter"></div>
    <section class="pane right">
      <div class="toolbar"><span class="file">${(p.tier ?? 1) === 0 ? 'script.js (plain JavaScript)' : 'workflow.js'}</span>
        <span class="kbd-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> run</span>
        <button class="btn" data-act="reset" title="Restore the starter script">Reset</button>
        ${LIVE_BUTTONS}
        <button class="btn" data-act="run">Run</button>
        <button class="btn primary" data-act="submit">Submit</button></div>
      <div class="editor-wrap"></div>
      <div class="hgutter"></div>
      ${CONSOLE_HTML}
    </section></div>`;
  const root = view.querySelector('.workspace');
  splitters(root);
  const editor = makeEditor(root.querySelector('.editor-wrap'), saved ?? starter, v => store.set(`code:${slug}`, v));
  const con = mountConsole(root.querySelector('.console'), editor);
  const left = root.querySelector('.left .pane-body');
  const prev = all[idx - 1];
  const next = all[idx + 1];

  const tests = p.tests.map((t, i) => {
    const bits = [];
    if (t.args !== undefined) bits.push(`args = ${JSON.stringify(t.args)}`);
    if (t.budget !== undefined) bits.push(`budget.total = ${JSON.stringify(t.budget)}`);
    const limit = t.wallClockMs ?? p.wallClockMs;
    if (limit != null) bits.push(`wall clock ≤ ${fmtMs(limit)}`);
    return `<li><b>${i === 0 ? 'Example' : `Test ${i + 1}`}: ${esc(t.name)}</b>${bits.length ? `<pre>${esc(bits.join('\n'))}</pre>` : ''}</li>`;
  }).join('');
  const views = {
    desc: () => `<div class="desc"><h2>${numberOf(all, p)}. ${esc(p.title)}</h2>
      <div class="meta-line"><span class="diff-${p.difficulty}">${p.difficulty}</span><span class="cat cat-${p.category}">${p.category}</span>
        ${solved().has(slug) ? '<span class="st-done">✓ Solved</span>' : ''}
        <div class="tags">${p.concepts.map(c => `<span class="tag">${esc(c)}</span>`).join('')}</div></div>
      ${goalBox(p)}
      <h3>Details</h3>
      ${p.description}
      ${p.python ? `<div class="python-box"><div class="python-label">In Python you'd write</div><pre><code>${esc(p.python)}</code></pre></div>` : ''}
      ${bookBox(slug)}
      <h3>Test cases</h3><ul>${tests}</ul>
      <div class="limits">Concurrency cap <b>${p.concurrency ?? 8}</b> · agent cap <b>${p.maxAgents ?? 200}</b>.
        <b>Run</b> executes the example; <b>Submit</b> runs every test.</div>
      <p>${prev ? `<a href="#/p/${prev.slug}">← ${esc(prev.title)}</a>` : ''}
         ${next ? `<a style="float:right" href="#/p/${next.slug}">${esc(next.title)} →</a>` : ''}</p></div>`,
    hints: () => p.hints.map((h, i) => `<details class="hint"><summary>Hint ${i + 1}</summary><div>${esc(h).replace(/`([^`]+)`/g, '<code>$1</code>')}</div></details>`).join(''),
    solution: () => `<div class="spoiler"><p>The reference solution is a spoiler.</p><button class="btn accent" data-act="reveal">Show solution</button></div>`,
    subs: () => {
      const subs = store.get(`subs:${slug}`, []);
      if (!subs.length) return '<div class="empty">No submissions yet.</div>';
      return `<table class="agents"><tr><th>when</th><th>verdict</th><th>wall clock</th><th>agents</th></tr>${subs.map(s => `
        <tr><td>${esc(new Date(s.at).toLocaleString())}</td><td class="${s.verdict === 'Accepted' ? 'st-done' : 'st-failed'}">${esc(s.verdict)}</td>
        <td class="mono">${s.wall == null ? '—' : fmtMs(s.wall)}</td><td class="mono">${s.agents ?? '—'}</td></tr>`).join('')}</table>`;
    },
  };
  const showLeft = name => {
    root.querySelectorAll('[data-ltab]').forEach(b => b.classList.toggle('on', b.dataset.ltab === name));
    left.innerHTML = views[name]();
  };
  root.querySelector('.left .tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-ltab]');
    if (b) showLeft(b.dataset.ltab);
  });
  left.addEventListener('click', async e => {
    if (e.target.closest('[data-act="reveal"]')) {
      const sol = await source(slug, 'solution');
      left.innerHTML = `<pre><code>${esc(sol)}</code></pre><button class="btn" data-act="load-solution">Load into editor</button>`;
    } else if (e.target.closest('[data-act="load-solution"]')) {
      editor.set(await source(slug, 'solution'));
    }
  });
  showLeft('desc');

  const buttons = root.querySelectorAll('.toolbar .btn');
  const go = async mode => {
    buttons.forEach(b => (b.disabled = true));
    con.busy(mode === 'run' ? 'Running example' : 'Judging all tests');
    const reference = mode === 'submit' ? await source(slug, 'solution') : null;
    const res = await execute({ kind: 'judge', slug, source: editor.get(), mode, reference });
    buttons.forEach(b => (b.disabled = false));
    con.show(res);
    if (mode === 'submit') {
      const first = res.ok && res.out.results.find(r => r.verdict !== 'Accepted') || (res.ok && res.out.results[0]);
      const subs = store.get(`subs:${slug}`, []);
      subs.unshift({ at: new Date().toISOString(), verdict: res.ok ? res.out.verdict : 'Error', wall: first ? first.run.stats.wallClock : null, agents: first ? first.run.stats.agents : null });
      store.set(`subs:${slug}`, subs.slice(0, 30));
      if (res.ok && res.out.verdict === 'Accepted') {
        store.set('solved', [...solved().add(slug)]);
        updateProgress();
      }
      if (root.querySelector('[data-ltab="subs"].on')) showLeft('subs');
    }
  };
  root.querySelector('.toolbar').addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'run' || act === 'submit') go(act);
    if (act === 'reset' && confirm('Replace your code with the starter script?')) editor.set(starter);
    if (act === 'real') runForReal(con, slug, editor.get(), p.tests[0].args).catch(err => alert(err.message));
    if (act === 'ask') askClaude().catch(err => alert(err.message));
  });
  const askClaude = async () => {
    con.showClaude();
    const { path } = await saveScript(slug, editor.get());
    await sendPrompt(`I'm practising Claude Code workflow scripts in the Workflow Dojo, problem "${p.title}": ${oneLine(p.description).slice(0, 700)} My current script is at ${path}. ${con.summary()} Read my script and give me one concrete hint toward the fix. Do not write the full solution, and do not run anything.`);
  };
  revealLive(root);
  keyHandler = e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      go(e.shiftKey ? 'submit' : 'run');
    }
  };
  editor.refresh();
}

const PLAY_SCRIPT = `export const meta = {
  name: 'playground',
  description: 'Experiment freely: scan then verify',
  phases: [{ title: 'Scan' }, { title: 'Verify' }],
}

// args comes from the args tab. Agents are answered by fixture.js.
const FINDINGS = {
  type: 'object',
  properties: { findings: { type: 'array', items: { type: 'string' } } },
  required: ['findings'],
}

const results = await pipeline(args.areas,
  area => agent(\`Scan \${area} for problems\`, { schema: FINDINGS, phase: 'Scan', label: \`scan \${area}\` }),
  (scan, area) => parallel((scan ? scan.findings : []).map(f => () =>
    agent(\`Verify "\${f}" in \${area}\`, { phase: 'Verify', label: \`verify \${f}\` }))))

log(\`verified \${results.flat().filter(Boolean).length} findings\`)
return results
`;

const PLAY_FIXTURE = `// The body of respond(call). Return { output, duration, tokens, fail } or nothing.
// call = { id, prompt, label, phase, schema, args, state }
// sample(schema) builds a schema-shaped placeholder. Returning nothing uses the default mock.
if (call.schema && call.schema.properties.findings) {
  const n = 1 + (call.id % 3)
  return { output: { findings: Array.from({ length: n }, (_, i) => \`issue-\${call.id}-\${i + 1}\`) }, duration: 800 * n }
}
if (/verify/i.test(call.prompt)) {
  return call.id % 4 === 0
    ? { fail: 'simulated terminal API error', duration: 500 }
    : { output: 'confirmed', duration: 1200 }
}
`;

function renderPlayground() {
  const files = {
    'workflow.js': store.get('play:workflow', PLAY_SCRIPT),
    'fixture.js': store.get('play:fixture', PLAY_FIXTURE),
    'args.json': store.get('play:args', '{ "areas": ["auth", "billing", "search"] }'),
  };
  let current = 'workflow.js';
  view.innerHTML = `<div class="workspace">
    <section class="pane left"><div class="tabs"><button class="on">Playground</button></div>
      <div class="pane-body desc">
        <h2>Playground</h2>
        <p>A free-form sandbox. Write any workflow, decide how the mocked agents answer in <code>fixture.js</code>, and
        study the timeline. Use it to try patterns before running them for real with the Workflow tool, where every agent
        costs tokens.</p>
        <div class="play-controls">
          <label>budget.total <input id="pg-budget" placeholder="null"></label>
          <label>concurrency <input id="pg-conc" value="8"></label>
        </div>
        <h3>Ideas</h3>
        <ul>
          <li>Swap <code>pipeline</code> for two <code>parallel</code> barriers and compare wall clock.</li>
          <li>Drop concurrency to 2 and watch the hatched queue segments grow.</li>
          <li>Make the fixture fail more often. Does the workflow say what it dropped?</li>
          <li>Set a budget and write a loop that scales to it.</li>
        </ul>
        <p><a href="#/learn">API reference →</a></p>
      </div></section>
    <div class="gutter"></div>
    <section class="pane right">
      <div class="toolbar"><span class="file" id="pg-files"></span>
        <span class="kbd-hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> run</span>
        <button class="btn" data-act="reset">Reset</button>
        <button class="btn live-btn" data-act="real" hidden title="Run workflow.js with the real Workflow tool">Run for real</button>
        <button class="btn accent" data-act="run">Run</button></div>
      <div class="editor-wrap"></div><div class="hgutter"></div>${CONSOLE_HTML}
    </section></div>`;
  const root = view.querySelector('.workspace');
  splitters(root);
  const keys = { 'workflow.js': 'play:workflow', 'fixture.js': 'play:fixture', 'args.json': 'play:args' };
  const editor = makeEditor(root.querySelector('.editor-wrap'), files[current], v => {
    files[current] = v;
    store.set(keys[current], v);
  });
  const con = mountConsole(root.querySelector('.console'), editor);
  const tabs = root.querySelector('#pg-files');
  const drawTabs = () => {
    tabs.innerHTML = Object.keys(files).map(f => `<a href="#" data-file="${f}" style="margin-right:12px;${f === current ? 'color:var(--text)' : 'color:var(--faint)'}">${f}</a>`).join('');
  };
  tabs.addEventListener('click', e => {
    const f = e.target.closest('[data-file]')?.dataset.file;
    if (!f) return;
    e.preventDefault();
    current = f;
    editor.set(files[f]);
    drawTabs();
  });
  drawTabs();
  revealLive(root);
  const run = async () => {
    let args;
    try {
      args = files['args.json'].trim() ? JSON.parse(files['args.json']) : undefined;
    } catch (e) {
      return con.show({ ok: false, error: `args.json is not valid JSON: ${e.message}` });
    }
    const b = root.querySelector('#pg-budget').value.trim();
    const conc = Number(root.querySelector('#pg-conc').value) || 8;
    con.busy('Running');
    if (current !== 'workflow.js') {
      current = 'workflow.js';
      editor.set(files[current]);
      drawTabs();
    }
    con.show(await execute({ kind: 'play', source: files['workflow.js'], fixtureSource: files['fixture.js'], args, budget: b ? Number(b) : null, concurrency: conc }));
  };
  root.querySelector('.toolbar').addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'run') run();
    if (act === 'real') {
      let args;
      try {
        args = files['args.json'].trim() ? JSON.parse(files['args.json']) : undefined;
      } catch (err) {
        return alert(`args.json is not valid JSON: ${err.message}`);
      }
      runForReal(con, 'playground', files['workflow.js'], args).catch(err => alert(err.message));
    }
    if (act === 'reset' && confirm('Reset all three playground files?')) {
      Object.assign(files, { 'workflow.js': PLAY_SCRIPT, 'fixture.js': PLAY_FIXTURE, 'args.json': '{ "areas": ["auth", "billing", "search"] }' });
      Object.entries(keys).forEach(([f, k]) => store.set(k, files[f]));
      editor.set(files[current]);
    }
  });
  keyHandler = e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  };
  editor.refresh();
}

function renderLearn() {
  view.innerHTML = `<div class="ref">
  <h1>Workflow script reference</h1>
  <p>Claude Code's <b>Workflow</b> tool runs a JavaScript script that orchestrates many subagents deterministically.
  It fits when control flow should be code (fan-out, loops, verification), not model judgment. Ask for it explicitly,
  for example "use a workflow", because it can spawn many agents.</p>

  <h2>JavaScript for Python developers</h2>
  <table>
    <tr><th>Python</th><th>JavaScript</th><th>Watch out</th></tr>
    <tr><td><code>lambda x: x * 2</code></td><td><code>x =&gt; x * 2</code></td><td><code>x =&gt; { x * 2 }</code> returns <code>undefined</code>, because braces need <code>return</code></td></tr>
    <tr><td><code>[f(x) for x in xs if p(x)]</code></td><td><code>xs.filter(p).map(f)</code></td><td></td></tr>
    <tr><td><code>sorted(xs, key=k, reverse=True)</code></td><td><code>[...xs].sort((a, b) =&gt; k(b) - k(a))</code></td><td><code>.sort()</code> mutates and compares as strings</td></tr>
    <tr><td><code>f"hi {name}"</code></td><td><code>\`hi \${name}\`</code></td><td>only backticks interpolate</td></tr>
    <tr><td><code>a if c else b</code></td><td><code>c ? a : b</code></td><td>use <code>===</code>, never <code>==</code></td></tr>
    <tr><td><code>None</code></td><td><code>null</code> / <code>undefined</code></td><td><code>x ?? d</code> keeps <code>0</code>; <code>x || d</code> doesn't; <code>x?.y</code> won't crash</td></tr>
    <tr><td><code>{**a, **b}</code>, <code>[*a, *b]</code></td><td><code>{...a, ...b}</code>, <code>[...a, ...b]</code></td><td></td></tr>
    <tr><td><code>first, *rest = xs</code></td><td><code>const [first, ...rest] = xs</code></td><td>objects unpack by name: <code>const { files } = r</code></td></tr>
    <tr><td><code>for i, x in enumerate(xs)</code></td><td><code>xs.forEach((x, i) =&gt; …)</code></td><td>callbacks are positional, with the item first</td></tr>
    <tr><td><code>d.items()</code>, <code>sum(xs)</code></td><td><code>Object.entries(d)</code>, <code>xs.reduce((a, b) =&gt; a + b, 0)</code></td><td><code>for…in</code> over an array yields string indexes</td></tr>
    <tr><td><code>lambda: work()</code></td><td><code>() =&gt; work()</code> (a "thunk")</td><td>JS <code>agent()</code> starts when <i>called</i>; Python coroutines start when <i>awaited</i></td></tr>
    <tr><td><code>await asyncio.gather(*cs)</code></td><td><code>await Promise.all(ps)</code></td><td>a missing <code>await</code> prints <code>[object Promise]</code> silently</td></tr>
    <tr><td><code>print(a, b)</code></td><td><code>log(\`\${a} \${b}\`)</code></td><td>the workflow <code>log()</code> takes one string</td></tr>
  </table>
  <p>Practise each row in <a href="#/">Tier 0</a>.</p>

  <h2>Shape</h2>
<pre><code>export const meta = {              // first statement; a PURE literal
  name: 'review-changes',
  description: 'Review changed files and verify findings',   // shown in the permission dialog
  phases: [{ title: 'Review' }, { title: 'Verify' }],          // titles match phase() calls exactly
}

phase('Review')
const found = await agent('Find bugs in src/', { schema: FINDINGS })
...
return result                       // the workflow's return value</code></pre>

  <h2>API</h2>
  <table>
    <tr><td><code>agent(prompt, opts?)</code></td><td>Spawn a subagent. Resolves to its final text, or with <code>opts.schema</code> to the validated object. Resolves <code>null</code> if skipped or dead after retries. opts: <code>label, phase, schema, model, effort, isolation: 'worktree', agentType</code>.</td></tr>
    <tr><td><i>thunk</i></td><td>A zero-argument function you call later: <code>() =&gt; agent(prompt)</code>. It's a recipe, not the cooking. <code>agent()</code> starts the moment it's called, so <code>parallel</code> and <code>pipeline</code> take thunks or functions and decide when each agent starts. Python analogy: <code>lambda: agent(prompt)</code>.</td></tr>
    <tr><td><code>parallel(thunks)</code></td><td>Run <code>() =&gt; Promise</code> thunks concurrently. A <b>barrier</b>: waits for all. A throwing thunk resolves to <code>null</code>; the call never rejects.</td></tr>
    <tr><td><code>pipeline(items, ...stages)</code></td><td>Each item flows through all stages independently, with <b>no barrier</b>. Stages receive <code>(prevResult, originalItem, index)</code>. A throwing stage drops that item to <code>null</code>. Prefer this by default.</td></tr>
    <tr><td><code>phase(title)</code></td><td>Group subsequent agents in the progress display. Inside pipeline/parallel, prefer <code>opts.phase</code>.</td></tr>
    <tr><td><code>log(message)</code></td><td>Narrator line for the user. Use it to report what was dropped: no silent caps.</td></tr>
    <tr><td><code>args</code></td><td>The tool call's <code>args</code>, verbatim. Pass arrays and objects as JSON values, not as a JSON-encoded string.</td></tr>
    <tr><td><code>budget</code></td><td><code>total</code> (or null), <code>spent()</code>, <code>remaining()</code> (Infinity without a target). A hard ceiling: <code>agent()</code> throws when spent.</td></tr>
    <tr><td><code>workflow(name|{scriptPath}, args?)</code></td><td>Run another workflow inline, one level deep. Not simulated in the dojo.</td></tr>
  </table>

  <h2>Rules that bite</h2>
  <ul>
    <li>Plain JavaScript only. TypeScript annotations, interfaces and generics fail to parse.</li>
    <li><code>Date.now()</code>, argless <code>new Date()</code> and <code>Math.random()</code> throw, because they would break resume. Pass timestamps via <code>args</code>; vary prompts by index.</li>
    <li>No filesystem, Node.js APIs or imports.</li>
    <li>Schemas need <code>{type: 'object', properties}</code> at the root, and <code>required</code> ⊆ properties.</li>
    <li>Concurrency is capped (about min(16, CPUs − 2)); excess agents queue. At most 1000 agents per run and 4096 items per parallel/pipeline call.</li>
  </ul>

  <h2>Patterns</h2>
  <table>
    <tr><td>Fan out</td><td>One agent per item with <code>parallel</code> or <code>pipeline</code>.</td></tr>
    <tr><td>Adversarial verify</td><td>N skeptics prompted to <em>refute</em>; keep a claim only on a majority. Use distinct lenses when a claim can fail more than one way.</td></tr>
    <tr><td>Loop until dry</td><td>Repeat discovery until K consecutive rounds add nothing new. Dedup against <em>seen</em>, not <em>confirmed</em>.</td></tr>
    <tr><td>Judge panel</td><td>N independent attempts from different angles, scored by judges, then synthesized from the winner.</td></tr>
    <tr><td>Completeness critic</td><td>A final agent asks what's missing; its answer becomes the next round of work.</td></tr>
    <tr><td>Budget scaling</td><td><code>while (budget.total &amp;&amp; budget.remaining() &gt; X)</code>. Guard on <code>total</code>, or the loop runs to the agent cap.</td></tr>
  </table>

  <h2>Running and debugging for real</h2>
  <ul>
    <li>Pass the script inline. Each run persists it to a file and returns its path; edit that file and re-run with <code>{scriptPath}</code>.</li>
    <li>Resume with <code>{scriptPath, resumeFromRunId}</code>. The longest unchanged prefix of <code>agent()</code> calls replays from cache.</li>
    <li>Before diagnosing an odd result, read the run's <code>journal.jsonl</code>: it records each agent's actual return value.</li>
    <li>Watch live progress with <code>/workflows</code>.</li>
  </ul>

  <h2>Running it for real here</h2>
  <ul>
    <li>Open the <b>Claude ▸</b> tab in any console to use the live Claude Code shell. It is one shared session behind Model Relay.</li>
    <li><b>Run for real</b> saves your script into the shell's workspace and asks Claude to run it with the Workflow tool. These agents are real and cost tokens.</li>
    <li><b>Ask Claude</b> sends the problem, your script's path and the latest verdict, and asks for one hint.</li>
    <li>In the shell, <code>/workflows</code> shows live progress, and saying "use a small workflow, 5 agents max" bounds the size.</li>
  </ul>

  <h2>How the dojo differs from the real runtime</h2>
  <ul>
    <li>Agents are answered by a per-problem fixture, not a model. Durations and tokens are simulated on a virtual clock.</li>
    <li>A schema mismatch makes the simulated agent resolve <code>null</code>; the real subagent retries until its output validates.</li>
    <li><code>workflow()</code>, <code>model</code>, <code>effort</code>, <code>isolation</code> and <code>agentType</code> are recorded but have no effect.</li>
  </ul></div>`;
}

function renderNotFound() {
  view.innerHTML = '<div class="list-page"><h1>Not found</h1><p><a href="#/">Back to problems</a></p></div>';
}

// ------------------------------------------------------------ router
let keyHandler = null;
window.addEventListener('keydown', e => keyHandler && keyHandler(e));

async function route() {
  keyHandler = null;
  const hash = location.hash.replace(/^#/, '') || '/';
  const nav = ['playground', 'learn', 'users', 'account'].find(n => hash.startsWith(`/${n}`)) || 'problems';
  document.querySelectorAll('[data-nav]').forEach(a => a.classList.toggle('active', a.dataset.nav === nav));
  const m = /^\/p\/([\w-]+)/.exec(hash);
  if (m) await renderProblem(m[1]);
  else if (nav === 'playground') renderPlayground();
  else if (nav === 'learn') renderLearn();
  else if (nav === 'users') await renderUsers(view);
  else if (nav === 'account') renderAccount(view);
  else await renderList();
}

// Log in first when the server asks for it; then load this user's progress.
if (await boot() === 'login') {
  document.querySelector('.topbar nav').style.display = 'none';
  renderLogin(view);
} else {
  renderAccountMenu(document.getElementById('account'));
  window.addEventListener('hashchange', route);
  route();
  updateProgress();
}
