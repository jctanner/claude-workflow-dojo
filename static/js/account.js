// Accounts and progress. Behind the dojo server, progress is stored per user
// on the server, so it follows you between machines. Served as plain static
// files (no /api), the page falls back to this browser's localStorage.

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOCAL = 'dojo:';

const state = {
  user: null,
  mode: 'local', // 'server' once logged in
  data: {},
  dirty: {},
  timer: null,
};

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Dojo': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const d = data && data.detail;
    const err = new Error(typeof d === 'string' ? d : `${method} ${path} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function localEntries() {
  const out = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(LOCAL)) out[k.slice(LOCAL.length)] = JSON.parse(localStorage.getItem(k));
    }
  } catch { /* storage blocked */ }
  return out;
}

// Returns 'ready', or 'login' when the server wants a login first.
export async function boot() {
  let res;
  try {
    res = await fetch('api/me');
  } catch {
    return 'ready';
  }
  if (res.status === 401) return 'login';
  if (!res.ok) return 'ready'; // static hosting: keep using localStorage
  state.user = await res.json();
  state.mode = 'server';
  state.data = await api('GET', 'api/progress');
  await adoptLocalProgress();
  window.addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush(true));
  return 'ready';
}

// Progress saved in this browser before accounts existed is uploaded once,
// into an account that has none yet.
async function adoptLocalProgress() {
  const marker = `dojo-adopted:${state.user.name}`;
  try {
    if (localStorage.getItem(marker)) return;
  } catch {
    return;
  }
  const local = localEntries();
  if (Object.keys(local).length && !Object.keys(state.data).length) {
    await api('PATCH', 'api/progress', local);
    state.data = local;
  }
  try {
    localStorage.setItem(marker, '1');
  } catch { /* ignore */ }
}

function flush(leaving = false) {
  clearTimeout(state.timer);
  state.timer = null;
  const changes = state.dirty;
  if (!Object.keys(changes).length) return;
  state.dirty = {};
  fetch('api/progress', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Dojo': '1' },
    body: JSON.stringify(changes),
    keepalive: leaving,
  }).then(r => {
    if (!r.ok) throw new Error(r.status);
  }).catch(() => {
    // Keep the changes for the next save, unless newer ones replaced them.
    state.dirty = { ...changes, ...state.dirty };
  });
}

export const store = {
  get(key, fallback) {
    if (state.mode === 'server') return key in state.data ? structuredClone(state.data[key]) : fallback;
    try {
      const v = localStorage.getItem(LOCAL + key);
      return v == null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    if (state.mode === 'server') {
      state.data[key] = value;
      state.dirty[key] = value;
      clearTimeout(state.timer);
      state.timer = setTimeout(flush, 800);
      return;
    }
    try {
      localStorage.setItem(LOCAL + key, JSON.stringify(value));
    } catch { /* private mode: progress just isn't kept */ }
  },
};

export const currentUser = () => state.user;

// ------------------------------------------------------------ header menu
export function renderAccountMenu(el) {
  if (!state.user) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<span class="who">${esc(state.user.name)}</span>
    ${state.user.admin ? '<a href="#/users" data-nav="users">Users</a>' : ''}
    <a href="#/account" data-nav="account">Account</a>
    <button class="linkish" data-act="logout">Log out</button>`;
  el.querySelector('[data-act="logout"]').onclick = async () => {
    flush();
    await api('POST', 'api/logout').catch(() => {});
    location.hash = '#/';
    location.reload();
  };
}

// ------------------------------------------------------------ login
export function renderLogin(view) {
  view.innerHTML = `<div class="auth-page"><form class="auth-card">
    <h1>Log in</h1>
    <label>Username <input name="username" autocomplete="username" autocapitalize="none" required></label>
    <label>Password <input name="password" type="password" autocomplete="current-password" required></label>
    <div class="auth-error" hidden></div>
    <button class="btn accent" type="submit">Log in</button>
    <p class="auth-note">Ask a dojo admin for an account.</p>
  </form></div>`;
  const form = view.querySelector('form');
  form.username.focus();
  form.onsubmit = async e => {
    e.preventDefault();
    const err = form.querySelector('.auth-error');
    err.hidden = true;
    try {
      await api('POST', 'api/login', { username: form.username.value, password: form.password.value });
      location.reload();
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  };
}

// ------------------------------------------------------------ own account
export function renderAccount(view) {
  if (!state.user) {
    view.innerHTML = '<div class="list-page"><h1>Account</h1><p>Accounts need the dojo server. Progress is kept in this browser.</p></div>';
    return;
  }
  view.innerHTML = `<div class="list-page"><h1>Account</h1>
    <p>Logged in as <b>${esc(state.user.name)}</b>${state.user.admin ? ' (admin)' : ''}. Your progress is saved on the dojo server.</p>
    <form class="auth-card inline">
      <h2>Change password</h2>
      <label>Current password <input name="current" type="password" autocomplete="current-password" required></label>
      <label>New password <input name="password" type="password" autocomplete="new-password" required></label>
      <div class="auth-error" hidden></div>
      <button class="btn accent" type="submit">Change password</button>
    </form></div>`;
  const form = view.querySelector('form');
  form.onsubmit = async e => {
    e.preventDefault();
    const msg = form.querySelector('.auth-error');
    try {
      await api('POST', 'api/me/password', { current: form.current.value, password: form.password.value });
      form.reset();
      msg.textContent = 'Password changed.';
      msg.classList.add('ok');
    } catch (ex) {
      msg.textContent = ex.message;
      msg.classList.remove('ok');
    }
    msg.hidden = false;
  };
}

// ------------------------------------------------------------ admin
export async function renderUsers(view) {
  if (!state.user || !state.user.admin) {
    view.innerHTML = '<div class="list-page"><h1>Users</h1><p>Only admins can manage users.</p></div>';
    return;
  }
  const users = await api('GET', 'api/users');
  view.innerHTML = `<div class="list-page"><h1>Users</h1>
    <table class="users"><thead><tr><th>Name</th><th>Admin</th><th>Claude</th><th></th></tr></thead><tbody>
    ${users.map(u => `<tr data-user="${esc(u.name)}">
      <td>${esc(u.name)}${u.name === state.user.name ? ' <span class="muted">(you)</span>' : ''}</td>
      <td><input type="checkbox" data-act="admin" ${u.admin ? 'checked' : ''} ${u.name === state.user.name ? 'disabled' : ''}></td>
      <td>${u.live ? 'running' : ''}</td>
      <td class="actions"><button class="btn" data-act="password">Set password</button>
        ${u.name === state.user.name ? '' : '<button class="btn" data-act="delete">Delete</button>'}</td></tr>`).join('')}
    </tbody></table>
    <div class="auth-error" hidden></div>
    <form class="auth-card inline">
      <h2>Add a user</h2>
      <label>Username <input name="username" autocomplete="off" autocapitalize="none" required></label>
      <label>Password <input name="password" type="password" autocomplete="new-password" required></label>
      <label class="check"><input name="admin" type="checkbox"> Admin</label>
      <button class="btn accent" type="submit">Add user</button>
    </form></div>`;
  const err = view.querySelector('.auth-error');
  const attempt = async fn => {
    err.hidden = true;
    try {
      await fn();
      await renderUsers(view);
    } catch (ex) {
      err.textContent = ex.message;
      err.hidden = false;
    }
  };
  view.querySelector('tbody').addEventListener('click', e => {
    const act = e.target.dataset.act;
    const name = e.target.closest('tr')?.dataset.user;
    const path = `api/users/${encodeURIComponent(name)}`;
    if (act === 'password') {
      const pw = prompt(`New password for ${name}:`);
      if (pw) attempt(() => api('PATCH', path, { password: pw }));
    } else if (act === 'delete' && confirm(`Delete ${name} and all of their progress?`)) {
      attempt(() => api('DELETE', path));
    }
  });
  view.querySelector('tbody').addEventListener('change', e => {
    if (e.target.dataset.act !== 'admin') return;
    const name = e.target.closest('tr').dataset.user;
    attempt(() => api('PATCH', `api/users/${encodeURIComponent(name)}`, { admin: e.target.checked }));
  });
  const form = view.querySelector('form');
  form.onsubmit = e => {
    e.preventDefault();
    attempt(() => api('POST', 'api/users', { username: form.username.value, password: form.password.value, admin: form.admin.checked }));
  };
}
