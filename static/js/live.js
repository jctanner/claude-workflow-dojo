// The live Claude terminal: one shared server-side session, one xterm per page
// that is moved between consoles as the route changes. Protocol (from
// context-inspector): binary frames are PTY bytes; JSON text frames are
// {type: 'exit'|'error'}; the client sends {type: 'input'|'resize'}.

const live = {
  status: null,
  session: null,
  ws: null,
  term: null,
  fit: null,
  el: null,
  lastOutput: 0,
  confirmed: false,
};

const $ = sel => live.el.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function liveStatus() {
  try {
    const res = await fetch('api/live');
    if (!res.ok) return null;
    live.status = await res.json();
  } catch {
    live.status = null;
  }
  return live.status;
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Dojo': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const d = data && data.detail;
    throw new Error(typeof d === 'string' ? d : (d && d.message) || `${method} ${path} failed (${res.status})`);
  }
  return data;
}

function setState(text, kind = 'idle') {
  if (!live.el) return;
  $('.live-status').textContent = text;
  $('.live-dot').dataset.kind = kind;
  const running = live.session && live.ws && live.ws.readyState === WebSocket.OPEN;
  $('[data-live="start"]').hidden = Boolean(running);
  $('[data-live="stop"]').hidden = !live.session;
  $('.live-model').disabled = Boolean(live.session);
}

function build() {
  live.el = document.createElement('div');
  live.el.className = 'live';
  live.el.innerHTML = `
    <div class="live-bar">
      <span class="live-dot" data-kind="idle"></span><span class="live-status">Not connected</span>
      <label class="live-pick">model <select class="live-model"></select></label>
      <button class="btn accent" data-live="start">Start Claude</button>
      <button class="btn" data-live="stop" hidden>Stop</button>
    </div>
    <div class="live-off" hidden></div>
    <div class="live-term"></div>`;
  live.el.addEventListener('click', e => {
    const act = e.target.closest('[data-live]')?.dataset.live;
    if (act === 'start') start().catch(err => setState(err.message, 'bad'));
    if (act === 'stop') stop().catch(err => setState(err.message, 'bad'));
  });
  if (window.Terminal) {
    live.term = new window.Terminal({
      cursorBlink: true,
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      fontSize: 13,
      theme: { background: '#161412', foreground: '#ece6dd', cursor: '#e8a33d', selectionBackground: 'rgba(232,163,61,0.3)' },
      allowProposedApi: false,
      scrollback: 5000,
    });
    if (window.FitAddon) {
      live.fit = new window.FitAddon.FitAddon();
      live.term.loadAddon(live.fit);
    }
    live.term.open($('.live-term'));
    live.term.onData(data => send({ type: 'input', data }));
    new ResizeObserver(() => resize()).observe($('.live-term'));
  } else {
    $('.live-term').innerHTML = '<div class="empty">The terminal library failed to load.</div>';
  }
}

function send(message) {
  if (live.ws && live.ws.readyState === WebSocket.OPEN) live.ws.send(JSON.stringify(message));
}

function resize() {
  if (!live.fit || !live.el.isConnected || !live.el.offsetParent) return;
  try {
    live.fit.fit();
  } catch {
    return;
  }
  const { rows, cols } = live.term;
  // fit() reports tiny sizes while a pane is still laying out; ignore them.
  if (rows >= 5 && cols >= 20) send({ type: 'resize', rows, cols });
}

function renderStatus() {
  const s = live.status;
  const off = $('.live-off');
  const select = $('.live-model');
  if (!s) {
    off.hidden = false;
    off.innerHTML = 'Live Claude needs the dojo server (<code>python -m dojo</code>). This page is being served statically.';
    $('[data-live="start"]').hidden = true;
    return;
  }
  off.hidden = s.available && !s.catalog_error;
  off.innerHTML = s.available
    ? esc(s.catalog_error || '')
    : esc(s.reason);
  $('[data-live="start"]').disabled = !s.available;
  const current = live.session ? live.session.model : select.value || s.default_model;
  select.innerHTML = s.models.map(m => `<option ${m === current ? 'selected' : ''}>${esc(m)}</option>`).join('');
}

function connect(session) {
  if (live.ws && live.session && live.session.session_id === session.session_id && live.ws.readyState <= WebSocket.OPEN) return;
  if (live.ws) live.ws.close();
  live.session = session;
  const url = new URL(`api/sessions/${session.session_id}/terminal`, location.href);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(url);
  ws.binaryType = 'arraybuffer';
  live.ws = ws;
  setState(`Connecting to ${session.model}…`, 'busy');
  ws.onopen = () => {
    setState(`Claude · ${session.model}`, 'ok');
    resize();
    live.term && live.term.focus();
  };
  ws.onmessage = ({ data }) => {
    if (typeof data === 'string') {
      const msg = JSON.parse(data);
      if (msg.type === 'exit') {
        live.term && live.term.write(`\r\n\x1b[33m[claude exited with code ${msg.exit_code}]\x1b[0m\r\n`);
        live.session = null;
        setState('Claude exited', 'idle');
      } else if (msg.type === 'error') {
        setState(msg.message, 'bad');
      }
      return;
    }
    live.lastOutput = performance.now();
    live.term && live.term.write(new Uint8Array(data));
  };
  ws.onclose = () => {
    if (live.ws !== ws) return;
    live.ws = null;
    if (live.session) setState('Disconnected. Press Start to reattach.', 'bad');
    else setState('Not connected', 'idle');
    live.session = null;
  };
}

async function start() {
  const model = $('.live-model').value || undefined;
  setState('Starting Claude…', 'busy');
  const session = await api('POST', 'api/sessions', { model });
  if (!live.ws || !live.session || live.session.session_id !== session.session_id) live.term && live.term.reset();
  connect(session);
  return session;
}

async function stop() {
  if (!live.session) return;
  const id = live.session.session_id;
  live.session = null;
  await api('DELETE', `api/sessions/${id}`);
  setState('Stopped', 'idle');
}

// Move the shared terminal into a console's Claude tab.
export async function mountLive(host) {
  if (!live.el) build();
  host.append(live.el);
  await liveStatus();
  renderStatus();
  if (live.status && live.status.active && !live.ws) connect(live.status.active);
  setState($('.live-status').textContent, $('.live-dot').dataset.kind);
  requestAnimationFrame(resize);
}

async function ensureRunning() {
  if (live.ws && live.ws.readyState === WebSocket.OPEN && live.session) return false;
  const fresh = !(live.status && live.status.active);
  await start();
  for (let i = 0; i < 50 && !(live.ws && live.ws.readyState === WebSocket.OPEN); i++) await sleep(100);
  return fresh;
}

// Wait until the TUI has drawn and gone quiet, so typed input is not lost.
async function settle(maxMs) {
  const begin = performance.now();
  await sleep(300);
  while (performance.now() - begin < maxMs) {
    if (live.lastOutput && performance.now() - live.lastOutput > 1500) return;
    await sleep(200);
  }
}

export function confirmSpend(model) {
  if (live.confirmed) return true;
  live.confirmed = confirm(`This runs real agents on ${model || 'the selected model'} through Model Relay, and a workflow can spawn many of them. Continue?`);
  return live.confirmed;
}

export function selectedModel() {
  return live.session ? live.session.model : live.el ? $('.live-model').value : null;
}

// Type a single-line prompt into Claude and submit it.
export async function sendPrompt(text) {
  const fresh = await ensureRunning();
  await settle(fresh ? 20000 : 3000);
  send({ type: 'input', data: text.replace(/\s*\n\s*/g, ' ') });
  await sleep(250);
  send({ type: 'input', data: '\r' });
  live.term && live.term.focus();
}

export async function saveScript(name, source) {
  return api('PUT', `api/workspace/scripts/${name}`, { source });
}
