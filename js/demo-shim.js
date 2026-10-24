// Demo shim: replays recorded API responses so the real app runs with no server, and draws the demo bar.
// A recorded write (Send a split, Agree and sign) moves the demo to the "after" state; other writes are refused politely.
import cfg from './demo-config.js';

const TOK = {};
for (const g of cfg.tour) for (const [t, mode, route] of g.items) TOK[t] = { mode, route };
if (TOK.licenses) TOK.licences = TOK.licenses; // the earlier spelling still works
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} }
};
const setHash = h => { try { history.replaceState(null, '', '#' + h); } catch { location.hash = '#' + h; } };

let mode = cfg.modes[store.get('demo-mode')] ? store.get('demo-mode') : 'artist';
const h = decodeURIComponent(location.hash.replace(/^#/, ''));
if (TOK[h]) { mode = TOK[h].mode; setHash(TOK[h].route); }
else if (/^as-(artist|listener|visitor)$/.test(h)) { mode = h.slice(3); setHash(cfg.modes[mode].home); }
else if (!h.startsWith('/')) setHash(cfg.modes[mode].home);
store.set('demo-mode', mode);
if (mode === 'artist') for (const [k, v] of Object.entries(cfg.session)) if (v && !store.get(k)) store.set(k, v);

// ---------- replay ----------
const realFetch = window.fetch.bind(window);
let step = 0;
const idx = new Map();
const ready = realFetch(new URL(`../data/${mode}.json`, import.meta.url)).then(r => r.json()).then(list => {
  for (const e of list) {
    const k = `${e.method} ${e.path}`;
    if (!idx.has(k)) idx.set(k, []);
    idx.get(k).push(e);
    if (e.method === 'GET' && e.path.includes('?')) {
      const k2 = `GET ${e.path.split('?')[0]}`;
      if (!idx.has(k2)) idx.set(k2, []);
      idx.get(k2).push(e);
    }
  }
});
const pickAt = list => { const upTo = list.filter(e => e.step <= step); return upTo.length ? upTo[upTo.length - 1] : list[0]; };
// Cover art ships with the demo: point its paths at this copy (absolute, since CSS resolves url() against the stylesheet).
const ART = new URL('../img/art/', import.meta.url).href;
const reply = e => {
  const body = e.enc === 'base64' ? Uint8Array.from(atob(e.body), c => c.charCodeAt(0)) : e.body.replace(/(["'(])\/img\/art\//g, `$1${ART}`);
  return new Response(e.status === 204 ? null : body, { status: e.status, headers: { 'content-type': e.ct || 'application/json' } });
};
const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
const SAFE = /\/api\/(notifications\/read|listen\/plays|l\/[^/]+\/(view|event|click)|events?)$/;

// Statements step month by month without end: a month the recorder never opened is a quiet one, carrying the balance of the
// nearest recorded month.
function quietMonth(month) {
  const recorded = [...idx.keys()].filter(k => /^GET \/api\/wallet\/statements\/\d{4}-\d{2}\?/.test(k))
    .map(k => JSON.parse(idx.get(k)[0].body).statement).filter(Boolean).sort((a, b) => a.period.localeCompare(b.period));
  if (!recorded.length) return null;
  const near = month > recorded.at(-1).period ? recorded.at(-1) : recorded[0];
  const bal = month > near.period ? near.closing : near.opening;
  return { ...near, period: month, opening: bal, closing: bal, lines: Object.fromEntries(Object.keys(near.lines).map(k => [k, 0])), income: [], payouts: [], reconciles: true };
}

function searchFallback(path) {
  const q = (new URLSearchParams(path.split('?')[1] || '').get('q') || '').toLowerCase();
  const all = (idx.get('GET /api/search') || []);
  const scored = all.map(e => ({ e, rq: (new URLSearchParams(e.path.split('?')[1] || '').get('q') || '').toLowerCase() }))
    .filter(x => x.rq && q && (x.rq.startsWith(q) || q.startsWith(x.rq)));
  return scored[0]?.e || null;
}

window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  const at = url.pathname.indexOf('/api/');
  if (at < 0 || url.origin !== location.origin) return realFetch(input, init);
  await ready;
  const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase();
  const path = url.pathname.slice(at) + url.search;
  const list = idx.get(`${method} ${path}`);
  if (method === 'GET') {
    const hit = list || (path.startsWith('/api/search') && searchFallback(path) && [searchFallback(path)]) || idx.get(`GET ${path.split('?')[0]}`);
    if (hit) return reply(pickAt(hit));
    const month = /^\/api\/wallet\/statements\/(\d{4}-\d{2})(\?|$)/.exec(path)?.[1];
    if (month) { const s = quietMonth(month); if (s) return json(200, { statement: s }); }
    return json(404, { error: 'This screen isn’t part of the demo yet.' });
  }
  if (list) {
    const next = list.find(e => e.step > step) || list[list.length - 1];
    step = Math.max(step, next.step);
    return reply(next);
  }
  if (SAFE.test(url.pathname)) return json(200, { ok: true });
  return json(409, { error: cfg.refuse || 'This is a demo with sample data, so nothing is saved. Try “Send a split” or “Agree and sign” from the tour.' });
};

// The player streams a short generated loop.
const RealAudio = window.Audio;
window.Audio = function (src) { return new RealAudio(src && /\/api\/listen\/songs\/[^/]+\/audio/.test(src) ? new URL('../media/loop.wav', import.meta.url).href : src); };

// ---------- demo bar ----------
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const go = (m, token) => {
  if (m === mode) { setHash(TOK[token]?.route || cfg.modes[m].home); dispatchEvent(new HashChangeEvent('hashchange')); return closeTour(); }
  store.set('demo-mode', m);
  location.hash = token || `as-${m}`;
  location.reload();
};
const bar = document.getElementById('demo-bar');
bar.innerHTML = `
  <div class="db-in">
    <span class="db-tag">Demo</span>
    <span class="db-note">${esc(cfg.note || 'Sample data. Nothing you do is saved.')}</span>
    <div class="db-seg" role="group" aria-label="View the app as">
      ${Object.entries(cfg.modes).map(([k, m]) => `<button type="button" data-mode="${k}" aria-pressed="${k === mode}">${esc(m.label)}</button>`).join('')}
    </div>
    <button type="button" class="db-tour-btn" aria-expanded="false" aria-controls="db-tour">Tour <span aria-hidden="true">▾</span></button>
  </div>
  <div class="db-tour" id="db-tour" hidden>
    <p class="db-who">Viewing as ${esc(cfg.modes[mode].who)}.</p>
    <div class="db-groups">
      ${cfg.tour.map(g => `<section><h4>${esc(g.group)}</h4>${g.items.map(([t, m, , label, sub]) => `<a href="#${t}" data-token="${t}" data-mode="${m}"><b>${esc(label)}</b><span>${esc(sub)}</span>${m !== mode ? `<i>${esc(cfg.modes[m].label)}</i>` : ''}</a>`).join('')}</section>`).join('')}
    </div>
  </div>`;
const tour = bar.querySelector('.db-tour'), tourBtn = bar.querySelector('.db-tour-btn');
function closeTour() { tour.hidden = true; tourBtn.setAttribute('aria-expanded', 'false'); }
tourBtn.addEventListener('click', () => { tour.hidden = !tour.hidden; tourBtn.setAttribute('aria-expanded', String(!tour.hidden)); });
bar.querySelectorAll('.db-seg button').forEach(b => b.addEventListener('click', () => go(b.dataset.mode)));
tour.addEventListener('click', e => { const a = e.target.closest('a[data-token]'); if (!a) return; e.preventDefault(); go(a.dataset.mode, a.dataset.token); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeTour(); });
document.addEventListener('click', e => { if (!bar.contains(e.target)) closeTour(); });

// The demo bar sits above the app, so full-height screens (the listening app on desktop) leave room for it.
{
  const bar = document.getElementById('demo-bar');
  const fit = () => document.documentElement.style.setProperty('--demo-bar', `${bar?.offsetHeight || 0}px`);
  if (bar) { new ResizeObserver(fit).observe(bar); fit(); }
}
