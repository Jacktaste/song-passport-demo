// App shell, router, API client and UI helpers. View modules in /js/views register routes and nav items:
//
//   import { app, html, raw, api, toast, modal, icon } from '/js/app.js';
//   app.nav({ id: 'wallet', label: 'Wallet', href: '/wallet', icon: 'wallet', section: 'Money', order: 20, auth: true });
//   app.route('/wallet/:id', async ({ el, params, query, user }) => { el.innerHTML = html`<h1>${params.id}</h1>`; }, { auth: true, title: 'Wallet' });
//
// Routes use the hash (#/path) so the server can stay a plain static host plus API.

const routes = [];
const navItems = [];
const songTabs = [];
let current = { user: null, artists: [], unread: 0, meta: null };

// ---------- HTML templating (escapes by default) ----------
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ESC[c]);
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = s => new Raw(String(s ?? ''));
const render = v => v == null || v === false ? '' : v instanceof Raw ? v.s : Array.isArray(v) ? v.map(render).join('') : esc(v);
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => { out += render(v) + strings[i + 1]; });
  return raw(out);
}

// ---------- API ----------
export async function api(path, { method = 'GET', body, headers = {}, signal } = {}) {
  const opts = { method, headers: { ...headers }, credentials: 'same-origin', signal };
  if (body instanceof Blob || body instanceof ArrayBuffer || body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['content-type'] = 'application/json'; }
  const res = await fetch(path, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status; err.details = data && data.details;
    if (res.status === 401 && !path.startsWith('/api/auth')) current.user = null;
    throw err;
  }
  return data;
}
api.get = (p, o) => api(p, o);
api.post = (p, body, o) => api(p, { ...o, method: 'POST', body });
api.patch = (p, body, o) => api(p, { ...o, method: 'PATCH', body });
api.put = (p, body, o) => api(p, { ...o, method: 'PUT', body });
api.del = (p, o) => api(p, { ...o, method: 'DELETE' });

// Upload a file with progress. onProgress(fraction).
export function upload(path, file, { headers = {}, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', path);
    x.setRequestHeader('x-filename', encodeURIComponent(file.name));
    x.setRequestHeader('content-type', file.type || 'application/octet-stream');
    for (const [k, v] of Object.entries(headers)) x.setRequestHeader(k, v);
    x.upload.onprogress = e => e.lengthComputable && onProgress?.(e.loaded / e.total);
    x.onload = () => {
      let data; try { data = JSON.parse(x.responseText); } catch { data = x.responseText; }
      x.status < 300 ? resolve(data) : reject(new Error(data?.error || `Upload failed (${x.status})`));
    };
    x.onerror = () => reject(new Error('Upload failed: network error'));
    x.send(file);
  });
}

// ---------- Router ----------
export const app = {
  route(pattern, handler, opts = {}) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\/:([a-zA-Z_]+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
    routes.push({ pattern, re, keys, handler, ...opts });
  },
  nav(item) { navItems.push({ order: 50, section: 'Passport', ...item }); },
  // Tabs on the song (passport) page. render({ el, song, user, canManage, isContributor, reload }) fills el.
  // show(song, ctx) decides visibility (e.g. hide wallet on drafts).
  songTab(tab) { songTabs.push({ order: 50, ...tab }); songTabs.sort((a, b) => a.order - b.order); },
  get songTabs() { return songTabs; },
  go(path) { location.hash = '#' + path; },
  refresh() { route(); },
  get user() { return current.user; },
  get artists() { return current.artists; },
  get meta() { return current.meta; },
  async reloadMe() { await loadMe(); paintShell(); },
  // Public pages (signing, verification) render without the sidebar.
  setPublic(on) { document.getElementById('app').dataset.public = on ? '1' : ''; }
};

function parseHash() {
  const h = location.hash.replace(/^#/, '') || '/home';
  const [path, qs] = h.split('?');
  return { path, query: new URLSearchParams(qs || '') };
}

let routeSeq = 0;
const skRows = n => Array.from({ length: n }, (_, i) => `<div class="sk-row"><div class="skeleton sk-art"></div><div style="flex:1" class="stack-sm"><div class="skeleton" style="height:13px;width:${46 + (i * 17) % 30}%"></div><div class="skeleton" style="height:11px;width:${24 + (i * 11) % 20}%"></div></div></div>`).join('');
const SKELETONS = {
  list: `<div class="stack-lg" aria-busy="true" aria-label="Loading"><div class="skeleton" style="height:40px;width:42%;border-radius:12px"></div><div class="card">${skRows(6)}</div></div>`,
  song: `<div class="stack-lg" aria-busy="true" aria-label="Loading"><div class="card card-pad row" style="gap:20px"><div class="skeleton" style="width:120px;height:120px;border-radius:16px;flex:none"></div><div class="stack-sm" style="flex:1"><div class="skeleton" style="height:12px;width:20%"></div><div class="skeleton" style="height:38px;width:55%"></div><div class="skeleton" style="height:14px;width:35%"></div></div></div>
    <div class="split-main"><div class="card card-pad stack">${'<div class="skeleton" style="height:14px"></div>'.repeat(7)}</div><div class="card">${skRows(4)}</div></div></div>`
};
async function route() {
  const seq = ++routeSeq;
  const { path, query } = parseHash();
  let match = null, params = {};
  for (const r of routes) {
    const m = r.re.exec(path);
    if (m) { match = r; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); break; }
  }
  if (!match) match = routes.find(r => r.pattern === '/404');
  if (match.auth && !current.user) return app.go(`/signin?next=${encodeURIComponent(path)}`);
  const publicPage = !!match.public;
  const root = document.getElementById('app');
  if (publicPage) {
    root.innerHTML = `<main class="public"><div class="public-inner fade-in" id="view"></div></main>`;
  } else {
    if (!root.querySelector('.shell')) paintShell();
    markActive(path);
    document.querySelector('.shell')?.classList.remove('nav-open');
  }
  // A fresh #view per navigation so delegated listeners from the previous page don't pile up. The swap runs inside a
  // view transition where the browser has one (a short cross-fade and rise), and the skeleton is shaped like the page.
  const old = document.getElementById('view');
  const el = old.cloneNode(false);
  const swap = () => { old.replaceWith(el); el.innerHTML = SKELETONS[match.skeleton] || SKELETONS.list; };
  if (document.startViewTransition && routeSeq > 1 && !publicPage && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    await document.startViewTransition(swap).updateCallbackDone.catch(() => {});
    if (seq !== routeSeq) return;
  } else swap();
  document.title = (match.title ? match.title + ' · ' : '') + 'Song Passport';
  window.scrollTo(0, 0);
  try {
    const out = await match.handler({ el, params, query, user: current.user, path, isCurrent: () => seq === routeSeq });
    if (seq !== routeSeq) return;
    if (out !== undefined && out !== null) el.innerHTML = String(out);
    el.classList.add('fade-in');
  } catch (e) {
    if (seq !== routeSeq) return;
    if (e.status === 401) return app.go(`/signin?next=${encodeURIComponent(path)}`);
    el.innerHTML = html`<div class="empty"><div class="icon">${icon('alert')}</div><h2 class="h3">${e.status === 404 ? 'Not found' : 'Something went wrong'}</h2><p>${e.message}</p></div>`.s;
    console.error(e);
  }
}

// ---------- Shell ----------
async function loadMe() {
  try {
    const me = await api('/api/me');
    current.user = me.account; current.artists = me.artists || []; current.unread = me.unread || 0;
  } catch { current.user = null; }
}

// Bottom tab bar on phones: the five places people go most.
const TABS = [
  { href: '/home', label: 'Home', icon: 'home' }, { href: '/songs', label: 'My songs', icon: 'music', auth: true },
  { href: '/search', label: 'Find', icon: 'search' }, { href: '/send', label: 'Send', icon: 'sign' },
  { href: '/wallet', label: 'Wallet', icon: 'wallet', auth: true }, { href: '/signin', label: 'Sign in', icon: 'key', guest: true }
];
function paintShell() {
  const root = document.getElementById('app');
  // Keep the page being shown: repainting the shell (e.g. after reloadMe) must not throw away a view a route is rendering into.
  const keep = root.querySelector('.shell #view');
  const u = current.user;
  const sections = [];
  for (const n of navItems.filter(n => !n.auth || u).filter(n => !n.admin || u?.role === 'admin').sort((a, b) => a.order - b.order)) {
    let s = sections.find(x => x.name === n.section);
    if (!s) sections.push(s = { name: n.section, items: [] });
    s.items.push(n);
  }
  root.innerHTML = html`
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="#/home"><span class="brand-mark">${icon('passport')}</span><span>Song Passport<small>Built on Audius</small></span></a>
      <nav class="nav" aria-label="Sections">
        ${sections.map(s => html`<div class="nav-section eyebrow">${s.name}</div>
          ${s.items.map(n => html`<a href="#${n.href}" data-href="${n.href}">${icon(n.icon || 'dot')}<span>${n.label}</span>${n.badge ? html`<span class="count">${n.badge()}</span>` : ''}</a>`)}`)}
      </nav>
      <div class="sidebar-foot">
        ${u ? html`<div class="avatar" style="background:${colorFor(u.email)}">${initials(u.name || u.email)}</div>
          <div style="min-width:0;flex:1"><div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.name || (u.contact || 'You').split('@')[0]}</div>
          <div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.contact ?? u.email}</div></div>
          <button class="btn btn-ghost btn-icon btn-sm" data-act="signout" title="Sign out" aria-label="Sign out">${icon('logout')}</button>`
        : html`<a class="btn btn-primary" style="width:100%" href="#/signin">Sign in</a>`}
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <button class="btn btn-ghost btn-icon menu-btn" data-act="menu" aria-label="Menu">${icon('menu')}</button>
        <form class="search" data-act="search"><input name="q" placeholder="Search every song and artist" autocomplete="off" aria-label="Search">${icon('search')}</form>
        <div class="spacer"></div>
        <button class="btn btn-ghost btn-icon" data-act="theme" title="Light or dark" aria-label="Switch light or dark appearance">${icon('moon')}</button>
        ${u ? '' : html`<a class="btn btn-primary btn-sm" href="#/signin">Sign in</a>`}
        ${u ? html`<a class="btn btn-ghost btn-icon" href="#/notifications" title="Notifications" aria-label="Notifications${current.unread ? ' (new)' : ''}" style="position:relative">${icon('bell')}${current.unread ? html`<span style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:var(--crit)"></span>` : ''}</a>` : ''}
      </header>
      <main class="page" id="view"></main>
    </div>
    <nav class="tabbar" aria-label="Main">${TABS.filter(t => (!t.auth || u) && !(t.guest && u)).slice(0, 5).map(t => html`<a href="#${t.href}" data-href="${t.href}">${icon(t.icon)}<span>${t.label}</span></a>`)}</nav>
  </div>`.s;
  if (keep) root.querySelector('#view').replaceWith(keep);
  markActive(parseHash().path);
}

function markActive(path) {
  document.querySelectorAll('.nav a, .tabbar a').forEach(a => {
    const h = a.dataset.href;
    a.classList.toggle('active', path === h || (h !== '/home' && path.startsWith(h + '/')));
  });
}

document.addEventListener('click', async e => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  if (act === 'menu') document.querySelector('.shell').classList.toggle('nav-open');
  if (act === 'theme') {
    const dark = getComputedStyle(document.documentElement).colorScheme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ob-theme', document.documentElement.dataset.theme); } catch {}
  }
  if (act === 'signout') { await api.post('/api/auth/signout'); current.user = null; paintShell(); app.go('/home'); }
});
document.addEventListener('submit', e => {
  if (e.target.matches('form[data-act=search]')) {
    e.preventDefault();
    const q = new FormData(e.target).get('q');
    app.go(`/search?q=${encodeURIComponent(q)}`);
  }
});
addEventListener('scroll', () => document.querySelector('.topbar')?.classList.toggle('scrolled', scrollY > 4), { passive: true });

// ---------- UI helpers ----------
// One toast at a time: a new one replaces the current one.
let toastTimer;
export function toast(msg, { error = false, ms = 2000 } = {}) {
  const box = document.getElementById('toasts');
  box.innerHTML = '';
  const t = document.createElement('div');
  t.className = 'toast' + (error ? ' err' : '');
  t.textContent = msg;
  box.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 250); }, error ? Math.max(ms, 4000) : ms);
}

// Share a link: the native share sheet on touch devices, otherwise copy it.
export async function shareLink(url, { title = 'Song Passport', label = 'Link' } = {}) {
  if (navigator.share && matchMedia('(pointer: coarse)').matches) {
    try { await navigator.share({ title, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(url); toast(`${label} copied`); }
  catch { prompt('Copy this link', url); }
}

// modal({ title, body (html), wide, actions: [{ label, primary, danger, onClick(close, modalEl) -> may return false to stay open }] })
export function modal({ title, body = '', wide = false, actions = [{ label: 'Close' }], onOpen } = {}) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = html`<div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true">
      <div class="modal-head"><h2>${title}</h2><button class="btn btn-ghost btn-icon btn-sm" data-x aria-label="Close">${icon('x')}</button></div>
      <div class="modal-body">${raw(String(body))}</div>
      <div class="modal-foot">${actions.map((a, i) => html`<button class="btn ${a.primary ? 'btn-primary' : ''} ${a.danger ? 'btn-danger' : ''}" data-i="${i}">${a.label}</button>`)}</div>
    </div>`.s;
    const m = back.querySelector('.modal');
    const close = v => { back.remove(); resolve(v); };
    back.addEventListener('click', async e => {
      if (e.target === back || e.target.closest('[data-x]')) return close(null);
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const a = actions[+b.dataset.i];
      if (!a.onClick) return close(a.value ?? a.label);
      b.classList.add('loading');
      try { const r = await a.onClick(close, m); if (r !== false && document.body.contains(back)) close(r); }
      catch (err) { toast(err.message, { error: true }); }
      finally { b.classList.remove('loading'); }
    });
    document.body.appendChild(back);
    addEventListener('keydown', function k(e) { if (e.key === 'Escape') { removeEventListener('keydown', k); close(null); } });
    onOpen?.(m);
    m.querySelector('input, select, textarea')?.focus();
  });
}

export const confirmDialog = (title, body, label = 'Confirm', danger = false) =>
  modal({ title, body: html`<p class="muted">${body}</p>`, actions: [{ label: 'Cancel', value: false }, { label, primary: !danger, danger, value: true }] }).then(Boolean);

// Wire a button to an async action with loading state and error toast.
export async function busy(btn, fn) {
  btn?.classList.add('loading');
  try { return await fn(); }
  catch (e) { toast(e.message, { error: true }); throw e; }
  finally { btn?.classList.remove('loading'); }
}

// Delegate events inside a view: on(el, 'click', '[data-act=save]', (e, target) => ...)
export function on(el, type, selector, fn) {
  el.addEventListener(type, e => { const t = e.target.closest(selector); if (t && el.contains(t)) fn(e, t); });
}

export const formData = form => Object.fromEntries(new FormData(form));

// ---------- Formatting ----------
export const money = (minor, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format((minor || 0) / 100);
export const pct = bps => `${((bps || 0) / 100).toFixed((bps || 0) % 100 ? 2 : 0)}%`;
export const date = d => d ? new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
export const dateTime = d => d ? new Date(d).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
export function ago(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return date(d);
}
export const duration = ms => ms ? `${Math.floor(ms / 60000)}:${String(Math.round(ms / 1000) % 60).padStart(2, '0')}` : '';
export const bytes = n => n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`;
export const initials = s => String(s || '?').replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

// Stable color per name, from a premium palette.
const PALETTE = ['#6A52E0', '#8B5CF6', '#EC4899', '#F97316', '#10B981', '#06B6D4', '#6366F1', '#E11D48', '#14B8A6', '#A855F7', '#F59E0B', '#3B82F6'];
export function colorFor(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; }
export const shareColors = PALETTE;
// The same color, darkened until white text on it passes AA (4.5:1). For initials on avatars.
export function inkColor(hex) {
  let [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const lum = (...c) => c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((t, v, i) => t + v * [.2126, .7152, .0722][i], 0);
  while (1.05 / (lum(r, g, b) + .05) < 4.6) { r *= .92; g *= .92; b *= .92; }
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}
// Generated artwork for songs without art: a two-tone gradient from the title.
// Cover art and photos sized for where they show, so a 46px tile never pulls a 1000px original.
// Deezer and Apple serve any square size; the others have fixed steps.
export function artUrl(url, px = 500) {
  const u = String(url);
  if (u.startsWith('img/u/')) return `${u.split('?')[0]}?w=${px <= 250 ? 250 : px <= 500 ? 500 : 1000}`;
  if (u.includes('coverartarchive.org')) return u.replace(/\/front(-\d+)?$/, `/front-${px <= 250 ? 250 : px <= 500 ? 500 : 1200}`);
  if (u.includes('Special:FilePath')) return u.replace(/([?&]width=)\d+/, `$1${Math.min(1000, px)}`);
  if (/\/content\/[^/]+\/\d+x\d+\.jpg$/.test(u)) return u.replace(/\/(150x150|480x480|1000x1000)\.jpg$/, `/${px <= 150 ? '150x150' : px <= 480 ? '480x480' : '1000x1000'}.jpg`);
  return u.replace(/\/\d{2,4}x\d{2,4}(-\d+-\d+-\d+-\d+\.jpg)$/, `/${px}x${px}$1`).replace(/\/\d{2,4}x\d{2,4}bb(\.\w+)$/, `/${px}x${px}bb$1`);
}
// Generated artwork for songs without art: a two-tone gradient from the title.
export function artStyle(seed, url, px) {
  if (url) return `background-image:url('${esc(px ? artUrl(url, px) : url)}')`;
  let h = 0; for (const c of String(seed)) h = (h * 33 + c.charCodeAt(0)) >>> 0;
  const a = PALETTE[h % PALETTE.length], b = PALETTE[(h >>> 5) % PALETTE.length];
  return `background:linear-gradient(135deg, ${a}, ${b === a ? '#111' : b})`;
}
const ART_PX = { '': 120, lg: 250, xl: 500 };
// The image sits over the generated art and initials: it fades in when it arrives, and if it never does, the fallback is already there.
export const artImg = (url, px) => url ? raw(`<img src="${esc(artUrl(url, px))}" srcset="${esc(artUrl(url, px))} 1x, ${esc(artUrl(url, px * 2))} 2x" width="${px}" height="${px}" alt="" loading="lazy" decoding="async">`) : '';
export const art = (seed, { url, size = '', label, px } = {}) => html`<div class="art ${size}" style="${artStyle(seed)}">${initials(label || seed)}${artImg(url, px || ART_PX[size] || 500)}</div>`;

export function splitBar(lines, key = 'bps') {
  const total = lines.reduce((s, l) => s + (l[key] || 0), 0) || 1;
  return html`<div class="splitbar">${lines.map((l, i) => html`<i style="width:${(l[key] || 0) / total * 100}%;background:${shareColors[i % shareColors.length]}" title="${l.name}: ${pct(l[key])}"></i>`)}</div>
  <div class="legend" style="margin-top:10px">${lines.map((l, i) => html`<span><i style="background:${shareColors[i % shareColors.length]}"></i>${l.name} <b class="num">${pct(l[key])}</b></span>`)}</div>`;
}

export function statusBadge(status) {
  const map = {
    draft: ['', 'Draft'], claimed: ['info', 'Claimed'], active: ['ok', 'Active'], pending: ['warn', 'Pending'], signed: ['ok', 'Signed'],
    declined: ['crit', 'Declined'], executed: ['ok', 'Fully signed'], out_for_signature: ['warn', 'Out for signature'], superseded: ['', 'Superseded'],
    missing: ['crit', 'Missing'], registered: ['ok', 'Registered'], not_applicable: ['', 'Not needed'], held: ['warn', 'Held'], paid: ['ok', 'Paid'],
    failed: ['crit', 'Failed'], approved: ['ok', 'Approved'], rejected: ['crit', 'Rejected'], live: ['ok', 'Live'], delivered: ['info', 'Delivered'],
    scheduled: ['info', 'Scheduled'], processing: ['warn', 'Processing'], voided: ['', 'Voided'], open: ['warn', 'Open'], sent: ['info', 'Sent']
  };
  const [cls, label] = map[status] || ['', String(status || '').replace(/_/g, ' ')];
  return html`<span class="badge ${cls}">${label}</span>`;
}

// ---------- Icons (inline SVG, 24px grid, stroke) ----------
const I = {
  share: '<path d="M12 3v12"/><path d="M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
  passport: '<path d="M6 3h10a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H6z"/><circle cx="12" cy="10" r="3"/><path d="M9 16h6"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  sign: '<path d="M3 17c3 0 4-6 6-6s1 5 3 5 2-3 4-3 2 2 5 2"/><path d="M3 21h18"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="16" cy="13.5" r="1.4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  git: '<circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M6 7.2v9.6M18 10.2c0 4-6 3-11 6.5"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor"/>',
  pause: '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  coins: '<ellipse cx="9" cy="7" rx="6" ry="3"/><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7"/><path d="M9 15v3c0 1.7 2.7 3 6 3s6-1.3 6-3v-5c0-1.7-2.7-3-6-3"/>',
  bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>',
  rocket: '<path d="M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2"/><path d="M9 15l-3-3c2-6 6-9 14-9 0 8-3 12-9 14z"/><circle cx="15" cy="9" r="1.6"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  wave: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  audius: '<path d="M12 3l9 16H3z"/><path d="M12 10l3.5 6h-7z"/>'
};
// Plain-English explanations for industry terms. term('ISRC') renders the word with a hover/tap tooltip.
export const GLOSSARY = {
  ISRC: 'The recording’s ID code. Every version of a song (radio edit, remix, live) has its own. Your distributor gives you one.',
  ISWC: 'The composition’s ID code: the song as written, not a recording of it. Publishers and PROs register it.',
  UPC: 'The barcode for a release (single, EP or album). Stores use it to find the product.',
  EAN: 'The barcode for a release, used outside the US. Same job as a UPC.',
  IPI: 'A songwriter’s or publisher’s ID number with their PRO. It’s how royalties find the right person.',
  PRO: 'Performing rights organization (ASCAP, BMI, SESAC or GMR). Collects money when a song is played in public, streamed or broadcast.',
  MLC: 'The Mechanical Licensing Collective. Collects US streaming “mechanical” royalties for songwriters and publishers.',
  SoundExchange: 'Collects US digital radio royalties (Pandora, SiriusXM) for the recording’s artists and owner.',
  'Neighboring rights': 'Royalties for the recording when it’s played on radio or in public outside the US, collected by a society in each country. SoundExchange can collect them for you.',
  Master: 'The recording itself. Master shares decide who gets the money the recording earns.',
  Publishing: 'The song as written: melody and lyrics. Publishing shares decide who gets the songwriting money.',
  'Master owner': 'Who owns the recording, as printed on the release (the ℗ line or label). It is not a signed split.',
  '℗': 'The ℗ (phonographic copyright) line names who owns the recording, as printed on the release.',
  Publisher: 'A company that looks after songwriters’ compositions and collects their songwriting money.',
  Distributor: 'The service that puts your music in stores, like DistroKid, TuneCore or CD Baby.',
  'Letter of direction': 'A signed instruction telling a label or society to pay each person their share directly.'
};
export function term(word, label = word) {
  const tip = GLOSSARY[word];
  return tip ? raw(`<span class="term" tabindex="0" data-tip="${esc(tip)}">${esc(label)}</span>`) : raw(esc(label));
}

// A small info icon that explains a term on hover, focus or tap (same tooltip as term()).
export function infoTip(text, label = 'More about this') {
  const tip = GLOSSARY[text] || text;
  return raw(`<span class="term info-tip" tabindex="0" role="note" aria-label="${esc(label)}: ${esc(tip)}" data-tip="${esc(tip)}">${icon('info')}</span>`);
}

// The "…" menu on a card: items are [label, act, iconName]. Each item is a button with data-act, so views handle it as usual.
export function moreMenu(items, label = 'More actions') {
  if (!items.length) return '';
  return html`<div class="menu-wrap"><button class="btn btn-ghost btn-icon btn-sm" data-menu aria-haspopup="menu" aria-expanded="false" aria-label="${label}">${icon('more')}</button>
    <div class="menu" role="menu" hidden>${items.map(([l, act, ic, extra = '']) => html`<button role="menuitem" data-act="${act}" ${raw(extra)}>${ic ? icon(ic) : ''}${l}</button>`)}</div></div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-menu]');
  for (const m of document.querySelectorAll('.menu:not([hidden])')) if (!b || m !== b.nextElementSibling) { m.hidden = true; m.previousElementSibling?.setAttribute('aria-expanded', 'false'); }
  if (b) { const m = b.nextElementSibling; m.hidden = !m.hidden; b.setAttribute('aria-expanded', String(!m.hidden)); if (!m.hidden) m.querySelector('button')?.focus(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') for (const m of document.querySelectorAll('.menu:not([hidden])')) { m.hidden = true; m.previousElementSibling?.focus(); } });

// A progress ring: done of total, drawn in the accent color. Label sits under the number for screen readers too.
export function ring(done, total, { size = 88, label = 'in place' } = {}) {
  const r = 40, c = 2 * Math.PI * r, f = total ? done / total : 0;
  return html`<div class="pring" style="--size:${size}px" role="img" aria-label="${done} of ${total} ${label}">
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${r}" class="track"/><circle cx="50" cy="50" r="${r}" class="fill" style="stroke-dasharray:${c.toFixed(1)};stroke-dashoffset:${(c * (1 - f)).toFixed(1)}"/></svg>
    <span><b>${done}</b><small>of ${total}</small></span></div>`;
}

// A person: initials avatar (or photo), name, one quiet line.
export function personRow({ name, sub = '', href = '', photo = '', badge = '' }) {
  const av = photo ? html`<span class="avatar" style="background:var(--surface-3) center/cover no-repeat url('${photo}')"></span>`
    : html`<span class="avatar" style="background:${inkColor(colorFor(name))}" aria-hidden="true">${initials(name)}</span>`;
  const inner = html`${av}<span class="grow person-txt"><span class="person-name">${name}${badge}</span>${sub ? html`<span class="person-sub">${sub}</span>` : ''}</span>`;
  return href ? html`<a class="person" href="${href}">${inner}</a>` : html`<div class="person">${inner}</div>`;
}

// Some imported catalogs put the artist in the title ("Renoise - Lost Soul"). Show it without the repeat; the stored title is unchanged.
export function shownTitle(song) {
  const t = song?.title || '', a = (song?.artist_credit || '').trim();
  if (!a) return t;
  const lower = t.toLowerCase(), pre = a.toLowerCase();
  for (const sep of [' - ', ' – ', ' — ']) if (lower.startsWith(pre + sep) && t.length > a.length + sep.length) return t.slice(a.length + sep.length);
  return t;
}

export function icon(name, cls = '') {
  return raw(`<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || I.dot}</svg>`);
}

// ---------- Built-in pages: sign in, notifications, 404 ----------
app.route('/signin', async ({ el, query }) => {
  if (current.user) return app.go(query.get('next') || '/home');
  el.innerHTML = html`<div style="max-width:440px;margin:40px auto" class="card card-pad stack-lg">
    <div class="stack-sm"><span class="brand-mark" style="width:44px;height:44px;border-radius:13px">${icon('passport')}</span>
      <h1 style="font-size:28px">${/^\/claim\//.test(query.get('next') || '') ? 'Sign in to claim it' : /^\/send/.test(query.get('next') || '') ? 'Sign in to send it' : 'Sign in'}</h1>
      <p class="muted">We email you a link. Tap it and you're straight back here. No password, and new here is fine: the same link sets up your free account.</p></div>
    ${query.get('expired') ? html`<div class="callout warn">${icon('alert')}<div>That link expired or was already used. Request a new one.</div></div>` : ''}
    <form class="stack" id="f">
      <label class="field"><span>Email</span><input class="input" type="email" name="email" required autocomplete="email" placeholder="you@studio.com"></label>
      <button class="btn btn-primary btn-lg">Email me a sign-in link</button>
    </form>
    <div id="sent"></div>
  </div>`.s;
  el.querySelector('#f').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const r = await busy(btn, () => api.post('/api/auth/start', { email: formData(e.target).email, next: query.get('next') || '/home' }));
    el.querySelector('#sent').innerHTML = html`<div class="callout ok">${icon('mail')}<div><b>Check your inbox.</b> The link expires in 30 minutes.
      ${r.devLink ? html`<div class="small" style="margin-top:6px">Email isn't connected on this server yet, so here is your link: <a href="${r.devLink}">Sign in now</a></div>` : ''}</div></div>`.s;
  });
}, { title: 'Sign in' });

app.route('/notifications', async ({ el }) => {
  const { items } = await api('/api/notifications');
  api.post('/api/notifications/read').then(() => { current.unread = 0; });
  return html`<div class="page-head"><div><h1>Notifications</h1></div></div>
  <div class="card">${items.length ? html`<div class="list">${items.map(n => html`<a class="list-item" href="${n.url ? '#' + n.url : '#/home'}">
    <div class="avatar" style="background:var(--grad)">${icon('bell')}</div><div class="grow"><div class="title">${n.title}</div><div class="sub">${n.body || ''}</div></div>
    <span class="small muted">${ago(n.created_at)}</span>${n.read_at ? '' : html`<span class="badge accent plain">New</span>`}</a>`)}</div>`
    : html`<div class="empty"><div class="icon">${icon('bell')}</div><h2 class="h3">All caught up</h2><p>Signing requests, claims and payouts show up here.</p></div>`}</div>`;
}, { auth: true, title: 'Notifications' });

app.route('/404', () => html`<div class="empty"><div class="icon">${icon('alert')}</div><h2 class="h3">Page not found</h2><p><a href="#/home">Go home</a></p></div>`);

// ---------- Boot ----------
async function boot() {
  const [meta] = await Promise.all([api('/api/meta').catch(() => ({ views: [] })), loadMe()]);
  current.meta = meta;
  // Load every view module; one failing never blocks the rest.
  await Promise.all((meta.views || []).map(v => import(v).catch(e => console.error('View failed to load', v, e))));
  addEventListener('hashchange', route);
  route();

  setTimeout(homeScreenHint, 4000);
}
boot();

// iPhone and iPad Safari have no install prompt: once, a quiet hint showing how to add the app to the Home Screen.
function homeScreenHint() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent);
  let seen = true; try { seen = !!localStorage.getItem('sp-a2hs'); } catch {}
  if (!ios || navigator.standalone || seen || !current.user) return;
  const box = document.createElement('div');
  box.className = 'a2hs'; box.setAttribute('role', 'note');
  box.innerHTML = html`<span class="brand-mark" style="flex:none">${icon('passport')}</span><div style="flex:1">Add Song Passport to your Home Screen: tap ${icon('share')} Share, then <b>Add to Home Screen</b>.</div>
    <button class="btn btn-ghost btn-icon btn-sm" aria-label="Dismiss">${icon('x')}</button>`.s;
  box.querySelector('button').onclick = () => box.remove();
  try { localStorage.setItem('sp-a2hs', '1'); } catch {}
  document.body.appendChild(box);
}

// Lazy art: fade in on arrival; drop it (showing the generated art beneath) if it fails.
document.addEventListener('load', e => { if (e.target.tagName === 'IMG' && e.target.parentNode?.classList?.contains('art')) e.target.classList.add('in'); }, true);
document.addEventListener('error', e => { if (e.target.tagName === 'IMG' && e.target.parentNode?.classList?.contains('art')) e.target.remove(); }, true);

// Upload a picture as three square JPEGs (1000, 500 and 250 px). Drawing to a canvas also drops EXIF (location, camera).
export async function uploadImage(kind, id, file) {
  if (!/^image\//.test(file.type)) throw new Error('Choose a photo (JPEG, PNG, HEIC or WebP)');
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  if (side < 250) throw new Error('That picture is too small. Use one at least 250 pixels across');
  const hashes = {};
  for (const px of [1000, 500, 250]) {
    const c = document.createElement('canvas'); c.width = c.height = Math.min(px, side);
    c.getContext('2d').drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, c.width, c.height);
    const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.86));
    hashes[px] = (await api('/api/images/blob', { method: 'POST', body: blob, headers: { 'content-type': 'image/jpeg' } })).hash;
  }
  return api(`/api/images/${kind}/${id}`, { method: 'PUT', body: hashes });
}
// Who took a photo or made a cover, for the small credit shown on tap.
export function creditLine(c) {
  if (!c) return '';
  return [c.author ? `Photo: ${c.author}` : '', c.license, c.from].filter(Boolean).join(' · ');
}
