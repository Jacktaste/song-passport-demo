// Audius, the listening app. Familiar outside (Home, Search, Library, Receipt tabs; a mini player; big art in a dark
// room), and the money shown in pictures: who you paid, who made the song, and a monthly receipt.
// It has its own shell: listeners never see artist tools. Same account, same database as the rest of the app.
// Also the artist's "Audius" tab on every passport.
import { app, html, raw, api, toast, money, on, busy, esc } from '../app.js';
import { sheet, copyText } from '../pl.js';
import { checkoutSheet } from './70-onelink.js';

if (!document.querySelector('link[data-au]')) {
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = 'css/audius.css'; l.dataset.au = '1';
  document.head.appendChild(l);
}

app.nav({ id: 'listen', label: 'Audius', href: '/listen', icon: 'play', section: 'Listen', order: 80, soon: true });

// ---------- small helpers ----------
const SV = {
  home: '<path d="M3 11 12 4l9 7v9h-6v-6H9v6H3v-9Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  library: '<path d="M5 4v16M10 4v16M15 4l5 16"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 8h6M9 12h6"/>',
  heart: '<path d="M20 12.5c0 4-8 8.5-8 8.5s-8-4.5-8-8.5A4.5 4.5 0 0 1 12 9a4.5 4.5 0 0 1 8 3.5Z"/>',
  play: '<path d="M8 5v14l11-7L8 5Z" fill="currentColor"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  prev: '<path d="M19 5 9 12l10 7V5ZM5 5v14"/>',
  next: '<path d="m5 5 10 7-10 7V5ZM19 5v14"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  device: '<rect x="6" y="3" width="12" height="18" rx="3"/><circle cx="12" cy="14" r="3"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  dollar: '<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  bag: '<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  share: '<path d="M12 15V3M7 8l5-5 5 5M5 13v7h14v-7"/>',
  shirt: '<path d="M8 3 3 6l2 5 2-1v11h10V10l2 1 2-5-5-3a4 4 0 0 1-8 0Z"/>',
  ticket: '<path d="M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V8Z"/><path d="M14 8v10"/>',
  disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  seal: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  addlist: '<path d="M4 6h13M4 12h13M4 18h8M18 15v6M15 18h6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
};
const I = (n, style = '') => raw(`<svg class="ai" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${style ? ` style="${style}"` : ''}>${SV[n] || ''}</svg>`);
const COLORS = ['#2F6FDB', '#7E1BCC', '#E0703A', '#1F9E7A', '#B83D74', '#B8901A', '#5B2BE0', '#1F56B8'];
const hue = s => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
const shade = (hex, f = 0.45) => { const n = parseInt(hex.slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f)); return `rgb(${c.join(',')})`; };
const art = (seed, url, cls = '') => url
  ? html`<div class="au-art ${cls}" style="background-image:url('${esc(String(url).replace(/'/g, '%27'))}')"></div>`
  : html`<div class="au-art gen ${cls}" style="background:${hue(seed)}"></div>`;
const songArt = (s, cls = '') => art((s.title || '') + (s.artist_credit || ''), s.artwork_url, cls);
const initials = s => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const mmss = ms => `${Math.floor((ms || 0) / 60000)}:${String(Math.floor((ms || 0) / 1000) % 60).padStart(2, '0')}`;
const monthName = p => new Date(p + '-15').toLocaleDateString('en-US', { month: 'long' });
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const signIn = () => app.go(`/signin?next=${encodeURIComponent(location.hash.slice(1) || '/listen')}`);
const darkSheet = el => el.closest('.pl-sheet')?.classList.add('au-sheet');
const roleLine = roles => [].concat(roles || []).map(r => String(r).replace(/_/g, ' ')).map(r => r[0].toUpperCase() + r.slice(1)).slice(0, 2).join(', ');

// ---------- the player: one queue, kept across pages ----------
const P = { q: [], i: -1, song: null, d: null, audio: null, playing: false, pos: 0, dur: 0, sent: 0, tick: null, shuffle: false, rc: null, rcAt: 0 };
async function playList(list, i = 0, { shuffle = false } = {}) {
  if (!app.user && !list[i]?.open_audio) return signIn();
  P.q = list.slice(); P.i = i; P.shuffle = shuffle;
  await start();
}
export const playSong = s => playList([s], 0);
async function start() {
  stopAudio();
  const s = P.q[P.i];
  if (!s) { P.song = null; paintDock(); return; }
  P.song = s; P.d = null; P.pos = 0; P.sent = 0; P.dur = s.duration_ms || 180000;
  if (s.audio) {
    // Open Audio Protocol tracks stream straight from the network; songs here stream from their passport's master.
    P.audio = new Audio(s.open_audio ? s.stream : `/api/listen/songs/${s.id}/audio`);
    P.audio.addEventListener('loadedmetadata', () => { P.dur = P.audio.duration * 1000; paintDock(); });
    P.audio.addEventListener('ended', () => next());
    P.audio.play().catch(() => {});
  }
  P.playing = true;
  P.tick = setInterval(step, 1000);
  paintDock();
  if (s.open_audio) return;
  api(`/api/listen/songs/${s.id}`).then(d => { if (P.song?.id === s.id) { P.d = d; paintDock(); } }).catch(() => {});
  refreshReceipt();
}
function step() {
  if (!P.playing || !P.song) return;
  P.pos = P.audio ? P.audio.currentTime * 1000 : Math.min(P.dur, P.pos + 1000);
  // Listening is reported every 20 seconds; the server pays by minutes, never by raw plays.
  if (P.pos - P.sent >= 20000 && !P.song.open_audio) {
    const ms = Math.round(P.pos - P.sent); P.sent = P.pos;
    api.post('/api/listen/plays', { song_id: P.song.id, ms: Math.min(20000, ms), shuffle: P.shuffle || undefined })
      .catch(err => { if (err.status === 403) { pause(); previewEnded(); } });
  }
  if (!P.audio && P.pos >= P.dur) return next();
  document.querySelectorAll('[data-prog]').forEach(b => { b.style.width = `${Math.min(100, P.pos / (P.dur || 1) * 100)}%`; });
  document.querySelectorAll('[data-pos]').forEach(t => { t.textContent = mmss(P.pos); });
  document.querySelectorAll('[data-dur]').forEach(t => { t.textContent = mmss(P.dur); });
}
function stopAudio() { clearInterval(P.tick); P.tick = null; if (P.audio) { P.audio.pause(); P.audio = null; } P.playing = false; }
function pause() { P.playing = false; P.audio?.pause(); paintDock(); }
function toggle() { if (!P.song) return; P.playing = !P.playing; if (P.audio) P.playing ? P.audio.play().catch(() => {}) : P.audio.pause(); paintDock(); }
function next() { if (P.i < P.q.length - 1) { P.i++; start(); } else { stopAudio(); P.pos = 0; paintDock(); } }
function prev() { if (P.pos > 4000 || P.i === 0) { P.pos = 0; P.sent = 0; if (P.audio) P.audio.currentTime = 0; paintDock(); } else { P.i--; start(); } }
async function shuffleAll() {
  if (!app.user) return signIn();
  const d = await api('/api/listen/shuffle');
  if (!d.songs.length) return toast('Nothing to shuffle yet');
  playList(d.songs, 0, { shuffle: true });
}
async function refreshReceipt(force = false) {
  if (!app.user || (!force && Date.now() - P.rcAt < 60000)) return;
  P.rcAt = Date.now();
  P.rc = await api('/api/listen/receipt').catch(() => null);
  paintDock();
}
async function like(s, btn) {
  if (!app.user) return signIn();
  const on = !(P.d?.song?.id === s.id ? P.d.song.liked : s.liked);
  await api.put(`/api/listen/songs/${s.id}/like`, { on });
  if (P.d?.song?.id === s.id) P.d.song.liked = on;
  s.liked = on; LIB = null;
  btn?.classList.toggle('liked', on);
  toast(on ? 'Added to Liked songs' : 'Removed from Liked songs');
  paintDock();
}
function previewEnded() {
  sheet((el, close) => {
    darkSheet(el);
    const s = P.song;
    el.innerHTML = html`<div class="stack" style="text-align:center;align-items:center;gap:14px;padding:6px 0 4px">
      <h2>That was the preview</h2>
      <p class="muted" style="max-width:340px">Pick a plan to hear every song in full. Your money goes only to the artists you play.</p>
      <button class="au-btn block" data-go>See plans</button>
      ${s ? html`<button class="au-btn light block" data-own>${I('download')} Own “${s.title}” · ${money(s.price || 129)}</button>` : ''}
      <button class="au-pill ghost" data-sh>Shuffle play for free</button></div>`.s;
    el.querySelector('[data-go]').onclick = () => { close(); app.go('/listen/switch'); };
    el.querySelector('[data-sh]').onclick = () => { close(); shuffleAll(); };
    el.querySelector('[data-own]')?.addEventListener('click', () => { close(); buySheet(s, 'own'); });
  });
}

// ---------- Own it, Tip, credits ----------
function buySheet(s, kind) {
  if (!app.user) return signIn();
  return sheet((el, close) => {
    darkSheet(el);
    let amount = 200;
    const paint = () => {
      const gross = kind === 'own' ? (s.price || 129) : amount;
      el.innerHTML = html`<div class="stack" style="gap:16px">
        <div class="row" style="gap:14px">${songArt(s, '')}<div style="min-width:0"><div class="muted small">${kind === 'own' ? 'Own it' : 'Tip'}</div><h2 style="font-size:20px">${s.title}</h2><div class="muted small">${s.artist_credit}</div></div></div>
        ${kind === 'tip' ? html`<div class="au-pay">${[100, 200, 500, 1000].map(a => html`<button class="${a === amount ? 'on' : ''}" data-amt="${a}">${money(a).replace('.00', '')}</button>`)}</div>` : html`<p class="muted small" style="margin:0">A lossless download. It stays yours, even if you cancel.</p>`}
        <p style="margin:0;font-size:15px">Everyone on the song gets paid, by its signed split.</p>
        <button class="au-btn block" data-m="card">Pay ${money(gross)}</button>
        <button class="au-btn light block" data-m="audio">Pay with AUDIO · no card fee</button>
        <div class="muted small" style="text-align:center">Test mode: no card is charged yet.</div></div>`.s;
      el.querySelector('.au-art').style.cssText += ';width:64px;height:64px;border-radius:10px';
    };
    paint();
    el.addEventListener('click', async e => {
      const a = e.target.closest('[data-amt]'), m = e.target.closest('[data-m]');
      if (a) { amount = +a.dataset.amt; paint(); }
      if (m) {
        const r = await busy(m, () => api.post(`/api/listen/songs/${s.id}/buy`, { kind, amount, pay_method: m.dataset.m }));
        const b = r.buy;
        el.innerHTML = html`<div class="stack" style="gap:14px;text-align:center;align-items:center">
          <div class="au-pp" style="width:56px;height:56px;background:var(--acc,#7E1BCC);color:#fff">${I('check')}</div>
          <h2>${kind === 'own' ? 'It’s yours' : 'Thank you'}</h2>
          <p class="muted" style="margin:0">${money(b.net)} of your ${money(b.gross)} went to the ${r.payees} ${r.payees === 1 ? 'person' : 'people'} who made it.${b.card ? ` Card fees ${money(b.card)}.` : ''} Audius ${money(b.platform)}.</p>
          ${r.key ? html`<div class="au-pill done">${I('key', 'width:18px;height:18px;vertical-align:-4px')} ${r.key.name} with ${s.artist_credit}</div>` : ''}
          <button class="au-btn block" data-done>Done</button></div>`.s;
        el.querySelector('[data-done]').onclick = () => close(true);
        if (kind === 'own') { s.owned = true; if (P.d?.song?.id === s.id) P.d.song.owned = true; LIB = null; paintDock(); }
      }
    });
  });
}
function creditsSheet(d) {
  sheet((el) => {
    darkSheet(el);
    const total = d.people.reduce((a, p) => a + p.bps, 0) || 1;
    el.innerHTML = html`<div class="stack" style="gap:14px">
      <h2>${d.people.length} ${d.people.length === 1 ? 'person' : 'people'} made this. All get paid.</h2>
      <div class="au-rows">${d.people.map(p => html`<div class="au-row" style="cursor:default"><div class="au-faces"><span style="background:${hue(p.name)};width:40px;height:40px">${initials(p.name)}</span></div>
        <div class="t"><b>${p.name}</b><small>${roleLine(p.roles)}</small></div><b>${Math.round(p.bps / total * 100)}%</b></div>`)}</div>
      <div class="row" style="gap:8px;color:#C98BFF;font-weight:600;font-size:14px">${I('seal', 'width:20px;height:20px')} Signed Song Passport · every play splits this way</div></div>`.s;
  });
}

// ---------- the shell ----------
let LIB = null, LIBAT = 0;
async function lib() {
  if (!app.user) return null;
  if (!LIB || Date.now() - LIBAT > 60000) { LIB = await api('/api/listen/library').catch(() => null); LIBAT = Date.now(); }
  return LIB;
}
const TABS = [['/listen', 'Home', 'home'], ['/listen/search', 'Search', 'search'], ['/listen/library', 'Library', 'library'], ['/listen/receipt', 'Receipt', 'receipt']];
// The mini player, player bar and tabs live on <body>, outside the animated page, so they stay put.
function dock(active, full) {
  let d = document.getElementById('au-dock');
  if (!d) {
    d = document.createElement('div');
    d.id = 'au-dock'; d.className = 'au-dock';
    d.innerHTML = '<div class="au-mini" hidden></div><footer class="au-bar" hidden></footer><nav class="au-tabs" aria-label="Audius"></nav>';
    document.body.appendChild(d);
    addEventListener('hashchange', () => { if (!/^#\/listen(\/|$|\?)/.test(location.hash)) document.body.classList.remove('au-on', 'au-full'); });
  }
  d.querySelector('.au-tabs').innerHTML = html`${TABS.map(([h, l, i]) => html`<a href="#${h}" class="${active === h ? 'on' : ''}">${I(i)}${l}</a>`)}`.s;
  document.body.classList.add('au-on');
  document.body.classList.toggle('au-full', !!full);
}
function shell(el, active, inner, { full = false } = {}) {
  el.closest('.public')?.classList.add('au-public');
  el.innerHTML = html`<div class="au ${P.song ? 'np' : ''} ${full ? 'full' : ''}">
    <aside class="au-lib" aria-label="Your library"></aside>
    <main class="au-main">${inner}</main>
    <aside class="au-np" aria-label="Now playing"></aside>
  </div>`.s;
  dock(active, full);
  paintLib(el, active);
  paintDock();
  return el.querySelector('.au-main');
}
async function paintLib(el, active) {
  const box = el.querySelector('.au-lib');
  if (!box || getComputedStyle(box).display === 'none') return;
  const nav = html`<div class="brand"><span>${I('play', 'width:16px;height:16px;color:#fff')}</span>Audius</div>
    <nav>${TABS.map(([h, l, i]) => html`<a href="#${h}" class="${active === h ? 'on' : ''}">${I(i)}${l}</a>`)}</nav>`;
  if (!app.user) { box.innerHTML = html`${nav}<div class="au-card"><b>Your library</b><span class="muted small">Sign in to save songs, own them and get your monthly receipt.</span><button class="au-pill" data-signin>Sign in</button></div>`.s; box.querySelector('[data-signin]').onclick = signIn; return; }
  box.innerHTML = html`${nav}<h3>${I('library')}Your library</h3>`.s;
  const d = await lib();
  if (!d || !box.isConnected) return;
  box.innerHTML = html`${nav}<h3>${I('library')}Your library</h3>
    <div class="au-rows">
      <a class="au-row" href="#/listen/library?tab=liked"><div class="ico" style="background:#7E1BCC;color:#fff">${I('heart')}</div><div class="t"><b>Liked songs</b><small>${d.liked.length} ${d.liked.length === 1 ? 'song' : 'songs'}</small></div></a>
      <a class="au-row" href="#/listen/library?tab=owned"><div class="ico">${I('download')}</div><div class="t"><b>Songs I own</b><small>${d.owned.length} · yours forever</small></div></a>
      ${(d.playlists || []).map(plRow)}
      ${d.passes.map(p => html`<a class="au-row" href="#/listen/artist/${p.owner_id}">${art(p.name, null, 'round')}<div class="t"><b>${p.name}</b><small>Artist Pass${p.key ? ` · ${p.key}` : ''}</small></div></a>`)}
      ${d.following.filter(f => !d.passes.some(p => p.owner_id === f.owner_id)).map(f => html`<a class="au-row" href="#/listen/artist/${f.owner_id}">${art(f.name, null, 'round')}<div class="t"><b>${f.name}</b><small>Artist</small></div></a>`)}
    </div>`.s;
}
function paintDock() {
  P.onChange?.();
  const s = P.song, d = P.d;
  const mini = document.querySelector('.au-mini'), bar = document.querySelector('.au-bar'), np = document.querySelector('.au-np');
  document.querySelector('.au')?.classList.toggle('np', !!s);
  const liked = d?.song?.id === s?.id ? d?.song?.liked : false;
  if (mini) {
    mini.hidden = !s;
    if (s) {
      mini.style.background = shade(hue((s.title || '') + (s.artist_credit || '')), 0.42);
      mini.innerHTML = html`${songArt(s)}<div class="t" data-open><b>${s.title}</b><small>${s.artist_credit}${s.open_audio ? ' · Open Audio' : s.access === 'preview' && !P.shuffle ? ' · Preview' : ''}</small></div>
        ${s.open_audio ? '' : html`<button class="au-ib ${liked ? 'liked' : ''}" data-like aria-label="${liked ? 'Remove from Liked songs' : 'Add to Liked songs'}">${I('heart')}</button>`}
        <button class="au-ib" data-pp aria-label="${P.playing ? 'Pause' : 'Play'}">${I(P.playing ? 'pause' : 'play')}</button>
        <div class="prog"><i data-prog style="width:${Math.min(100, P.pos / (P.dur || 1) * 100)}%"></i></div>`.s;
    }
  }
  if (bar) {
    bar.hidden = !s;
    if (s) bar.innerHTML = html`<div class="l" data-open>${songArt(s)}<div><b>${s.title}</b><small>${s.artist_credit}${s.open_audio ? ' · Open Audio' : ''}</small></div>
        ${s.open_audio ? '' : html`<button class="au-ib ${liked ? 'liked' : ''}" data-like aria-label="Like">${I('heart')}</button>`}</div>
      <div class="c"><div class="b"><button class="au-ib ${P.shuffle ? 'liked' : ''}" data-shuffle aria-label="Shuffle">${I('shuffle')}</button><button class="au-ib" data-prev aria-label="Previous">${I('prev')}</button>
        <button class="pp" data-pp aria-label="${P.playing ? 'Pause' : 'Play'}">${I(P.playing ? 'pause' : 'play', 'width:18px;height:18px')}</button>
        <button class="au-ib" data-next aria-label="Next">${I('next')}</button><span style="width:44px"></span></div>
        <div class="sc"><span data-pos>${mmss(P.pos)}</span><div><i data-prog style="width:${Math.min(100, P.pos / (P.dur || 1) * 100)}%"></i></div><span data-dur>${mmss(P.dur)}</span></div></div>
      <div class="r">${s.open_audio ? 'Open Audio · not on your receipt yet' : 'No ads. Ever.'}</div>`.s;
  }
  if (np && getComputedStyle(np).display !== 'none') {
    if (!s) { np.innerHTML = ''; return; }
    const rc = P.rc, me = rc?.artists?.find(a => a.name === s.artist_credit);
    const total = rc?.recordings || 0;
    if (s.open_audio) { np.innerHTML = openAudioBox(s).s; return; }
    np.innerHTML = html`<div class="ttl">${s.title}</div>${songArt(s)}
      ${rc && rc.paid ? html`<div class="box"><div class="h">Where your money goes this month</div>
        <div class="au-bar-money">${rc.artists.filter(a => a.amount > 0).map(a => html`<i style="flex:${a.amount};background:${a.name === s.artist_credit ? '#C98BFF' : '#3A3A46'}"></i>`)}</div>
        <div class="small">${me ? html`<b>${s.artist_credit} gets ${Math.round(me.amount / (total || 1) * 100)}%</b><span class="muted"> so far, ${money(me.amount)}</span>` : html`<span class="muted">Keep listening: ${s.artist_credit} joins your receipt after a minute.</span>`}</div></div>` : ''}
      ${d?.people?.length ? html`<div class="box"><div class="h">Made by</div>${(d.credits?.length ? d.credits : d.people).slice(0, 6).map(p => html`<div class="who"><span>${p.name}</span><span>${roleLine(p.roles)}</span></div>`)}
        <div class="sealed">${I('seal', 'width:18px;height:18px')} Signed Song Passport</div></div>` : ''}
      <div class="two"><button data-tip>Tip $2</button><button data-merch>Merch</button></div>`.s;
  }
}
// What an Open Audio Protocol track is, said plainly wherever it plays.
const openAudioBox = (s, { head = true } = {}) => html`${head ? html`<div class="ttl">${s.title}</div>${songArt(s)}` : ''}
  <div class="box"><div class="h">From the Open Audio Protocol</div>
    <div class="small">${s.artist_credit} put this on the open network Audius runs on. It's free to play here.</div>
    <div class="small muted">It isn't on a Song Passport yet, so it isn't on your receipt. When ${s.artist_credit} joins, their plays pay everyone on the song.</div>
    ${s.url ? html`<a class="au-pill ghost" href="${s.url}" target="_blank" rel="noopener" style="align-self:flex-start">Open on Audius</a>` : ''}</div>`;
// One listener for the dock and side panels, wherever they are painted.
document.addEventListener('click', e => {
  const t = e.target.closest('[data-pp],[data-next],[data-prev],[data-like],[data-open],[data-shuffle],[data-tip],[data-merch]');
  if (!t || !t.closest('.au-mini,.au-bar,.au-np')) return;
  if (t.matches('[data-pp]')) toggle();
  else if (t.matches('[data-next]')) next();
  else if (t.matches('[data-prev]')) prev();
  else if (t.matches('[data-like]')) like(P.song, t);
  else if (t.matches('[data-shuffle]')) shuffleAll();
  else if (t.matches('[data-tip]')) quickTip();
  else if (t.matches('[data-merch]')) app.go(`/listen/artist/${P.song.owner_id}`);
  else if (t.matches('[data-open]')) app.go('/listen/now');
});
async function quickTip() {
  if (!app.user) return signIn();
  const s = P.song;
  if (!confirm(`Tip ${s.artist_credit} $2? Everyone on “${s.title}” gets their share. (Test mode)`)) return;
  const r = await api.post(`/api/listen/songs/${s.id}/buy`, { kind: 'tip', amount: 200, pay_method: 'card' });
  toast(`Thank you. ${money(r.buy.net)} went to the ${r.payees} people who made it.`);
}

// ---------- shared bits ----------
const openShelf = songs => songs?.length ? html`<div class="au-h2"><h2>Trending on the Open Audio Protocol</h2><small>Free to play · not on your receipt yet</small></div>
  <div class="au-shelf">${songs.slice(0, 12).map(s => tile(s, 'open'))}</div>` : '';
const tile = (s, list) => html`<button class="au-tile" data-play="${s.id}" data-list="${list}">${songArt(s)}<b>${s.title}${s.ai ? ' · AI' : ''}</b><small>${s.artist_credit}</small></button>`;
const songRow = (s, list, sub = '') => html`<button class="au-row ${P.song?.id === s.id ? 'on' : ''}" data-play="${s.id}" data-list="${list}">${songArt(s)}<div class="t"><b>${s.title}${s.ai ? ' · AI' : ''}</b><small>${sub || s.artist_credit}</small></div></button>`;
function wireLists(main, lists) {
  on(main, 'click', '[data-play]', (e, t) => {
    const list = lists[t.dataset.list] || [];
    const i = list.findIndex(x => x.id === t.dataset.play);
    if (i >= 0) playList(list, i);
  });
}
const signInCard = (title, text) => html`<div class="au-empty"><h2>${title}</h2><p>${text}</p><button class="au-btn" data-signin>Sign in</button></div>`;

// ---------- Home ----------
app.route('/listen', async ({ el, user }) => {
  const d = await api('/api/listen');
  const h = d.home || {};
  let chip = 'music';
  const main = shell(el, '/listen', '');
  const mixes = [
    { id: 'shuffle', title: 'Shuffle everything', color: '#B83D74' },
    { id: 'new', title: 'New from artists you play', color: '#1F9E7A' },
    { id: 'top', title: 'Top this month', color: '#B8901A' }
  ];
  const playedOwners = new Set((h.tiles || []).map(t => t.id));
  const newFromYours = d.latest.filter(s => playedOwners.has(s.owner_id));
  const paint = async () => {
    const lib0 = user && chip !== 'music' ? await lib() : null;
    const rc = h.receipt;
    main.innerHTML = html`
      <div class="au-head"><div class="au-hi">${user ? html`<button class="au-me" data-me aria-label="Your account">${initials(user.name || user.email)}</button>` : ''}<h1>${user ? greeting() : 'Audius'}</h1></div><span class="au-noads">No ads</span></div>
      <div class="au-chips">${[['music', 'Music'], ['presales', 'Presales'], ['owned', 'Owned'], ['following', 'Following']].map(([k, l]) => html`<button class="au-chip ${chip === k ? 'on' : ''}" data-chip="${k}">${l}</button>`)}</div>
      ${chip === 'music' ? html`
        ${user ? html`<div class="au-quick">
          ${(h.tiles || []).slice(0, 3).map(t => html`<a class="au-q" href="#/listen/artist/${t.id}">${art(t.title)}<b>${t.title}</b></a>`)}
          <a class="au-q" href="#/listen/library?tab=liked"><span class="ico" style="background:#7E1BCC;color:#fff">${I('heart')}</span><b>Liked songs</b></a>
          <a class="au-q" href="#/listen/library?tab=owned"><span class="ico">${I('download')}</span><b>Songs I own</b></a>
          <button class="au-q" data-mix="shuffle"><span class="ico">${I('shuffle')}</span><b>Shuffle</b></button></div>` : ''}
        ${rc && rc.paid ? html`<a class="au-card" href="#/listen/receipt">
            <div class="lbl"><span>Your ${monthName(new Date().toISOString().slice(0, 7))} receipt</span>${I('right', 'width:18px;height:18px')}</div>
            <div class="big">${money(rc.recordings)} went to the ${rc.count} ${rc.count === 1 ? 'artist' : 'artists'} you played</div>
            <div class="au-bar-money">${rc.artists.filter(a => a.amount > 0).map(a => html`<i style="flex:${a.amount};background:${hue(a.name)}"></i>`)}</div></a>`
          : html`<a class="au-card" href="#/listen/switch"><div class="lbl"><span>How Audius pays</span>${I('right', 'width:18px;height:18px')}</div>
            <div class="big">Your money goes only to the artists you play.</div><div class="muted small">Every month, a receipt shows exactly who you paid. Plans from ${money(d.plans.artist.price).replace(".00", "")}.</div></a>`}
        ${(h.presales || []).slice(0, 1).map(p => presaleCard(p))}
        <div class="au-h2"><h2>Made for you</h2></div>
        <div class="au-shelf">${mixes.map(m => html`<button class="au-tile" data-mix="${m.id}"><div class="au-art gen" style="background:${m.color}"></div><small style="margin-top:0">${m.title}</small></button>`)}</div>
        ${d.top.length ? html`<div class="au-h2"><h2>Top this month</h2><small>By minutes played</small></div><div class="au-shelf">${d.top.map(s => tile(s, 'top'))}</div>` : ''}
        <div class="au-h2"><h2>New on Audius</h2></div>
        ${d.latest.length ? html`<div class="au-shelf">${d.latest.map(s => tile(s, 'latest'))}</div>` : html`<p class="muted">Artists are adding their songs now.</p>`}
        ${d.artists.length ? html`<div class="au-h2"><h2>Artists</h2></div><div class="au-shelf">${dedupeArtists(d).map(a => html`<a class="au-tile round" href="#/listen/artist/${a.owner}">${art(a.name)}<b>${a.name}</b></a>`)}</div>` : ''}
        ${openShelf(lists.open)}`
      : chip === 'presales' ? html`${(h.presales || []).length ? h.presales.map(p => presaleCard(p)) : html`<div class="au-empty"><h2>No presales right now</h2><p>Follow artists and they'll show up here first.</p></div>`}`
      : chip === 'owned' ? (user ? html`${lib0?.owned.length ? html`<div class="au-rows">${lib0.owned.map(s => songRow(s, 'owned', `${s.artist_credit} · Yours forever`))}</div>` : html`<div class="au-empty"><h2>Nothing owned yet</h2><p>Tap “Own it” on any song. It stays yours, even if you cancel.</p></div>`}` : signInCard('Songs you own', 'Sign in to see them.'))
      : (user ? html`${lib0?.following.length ? html`<div class="au-rows">${lib0.following.map(f => html`<a class="au-row" href="#/listen/artist/${f.owner_id}">${art(f.name, null, 'round')}<div class="t"><b>${f.name}</b><small>Artist</small></div></a>`)}</div>` : html`<div class="au-empty"><h2>Not following anyone yet</h2><p>Follow artists for presales, drops and their One Link.</p></div>`}` : signInCard('Following', 'Sign in to follow artists.'))}`.s;
  };
  const lists = { top: d.top, latest: d.latest, owned: [], open: [] };
  await paint();
  // Trending on the Open Audio Protocol, when the network can be reached. Fills in without moving anything above it.
  api('/api/listen/open/trending').then(r => { lists.open = r.songs || []; if (lists.open.length && chip === 'music' && main.isConnected) paint(); }).catch(() => {});
  on(main, 'click', '[data-chip]', async (e, t) => { chip = t.dataset.chip; await paint(); lists.owned = (await lib())?.owned || []; });
  on(main, 'click', '[data-mix]', (e, t) => {
    const m = t.dataset.mix;
    if (m === 'shuffle') return shuffleAll();
    const list = m === 'top' ? d.top : (newFromYours.length ? newFromYours : d.latest);
    if (list.length) playList(list, 0);
  });
  on(main, 'click', '[data-remind]', async (e, t) => {
    if (!user) return signIn();
    await busy(t, () => api.post(`/api/listen/remind/${t.dataset.remind}`));
    t.textContent = 'We’ll remind you'; t.classList.add('done'); toast('We’ll remind you when it opens');
  });
  on(main, 'click', '[data-me]', () => accountSheet());
  on(main, 'click', '[data-signin]', signIn);
  wireLists(main, lists);
}, { public: true, title: 'Audius' });

function dedupeArtists(d) {
  const seen = new Map();
  for (const s of [...d.top, ...d.latest]) if (!seen.has(s.owner_id)) seen.set(s.owner_id, { owner: s.owner_id, name: s.artist_credit });
  return [...seen.values()];
}
function presaleCard(p) {
  const when = p.date ? new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  const need = { key: 'Listener Key holders get in first', purchase: 'Supporters get in first', spent: 'Insiders get in first', top: 'Top listeners get in first' }[p.need] || 'Listener Key holders get in first';
  return html`<div class="au-presale"><div class="au-art gen" style="background:${p.accent || hue(p.artist)}"></div>
    <a class="t" href="#/listen/artist/${p.owner_id}"><small>Presale${when ? ` · ${p.kind === 'tour' ? 'show on' : 'from'} ${when}` : ''}</small><b>${p.title}${p.subtitle && p.kind === 'tour' ? `, ${p.subtitle}` : ''}</b><small>${p.artist} · ${need}</small></a>
    <button class="au-pill ${p.reminded ? 'done' : ''}" data-remind="${p.block_id}" ${p.reminded ? 'disabled' : ''}>${p.reminded ? 'Reminder on' : 'Remind'}</button></div>`;
}
function accountSheet() {
  sheet((el, close) => {
    darkSheet(el);
    const u = app.user;
    el.innerHTML = html`<div class="stack" style="gap:12px">
      <div class="row" style="gap:12px"><span class="au-me" style="width:48px;height:48px;font-size:18px">${initials(u.name || u.email)}</span><div><b>${u.name || u.email.split('@')[0]}</b><div class="muted small">${u.email}</div></div></div>
      <a class="au-row" href="#/listen/switch">${I('star')}<div class="t"><b>Plan and AI music</b><small>Change plan, pay with AUDIO, AI on or off</small></div></a>
      <a class="au-row" href="#/key">${I('key')}<div class="t"><b>Listener Keys</b><small>Your level with each artist</small></div></a>
      <a class="au-row" href="#/home?artist=1">${I('user')}<div class="t"><b>Are you an artist?</b><small>Find your songs and get paid every cent</small></div></a>
      <button class="au-pill ghost" data-out>Sign out</button></div>`.s;
    el.addEventListener('click', e => { if (e.target.closest('a')) close(); });
    el.querySelector('[data-out]').onclick = async () => { await api.post('/api/auth/signout'); close(); location.hash = '#/listen'; location.reload(); };
  });
}

// ---------- Search (and the way in to "Bring my music") ----------
app.route('/listen/search', async ({ el, query }) => {
  const main = shell(el, '/listen/search', html`<h1 style="font-size:28px;font-weight:800;letter-spacing:-0.02em">Search</h1>
    <form class="au-search" data-q>${I('search')}<input name="q" placeholder="Songs and artists" value="${query.get('q') || ''}" autocomplete="off" aria-label="Search songs and artists"></form>
    <div data-results></div>`);
  const box = main.querySelector('[data-results]');
  let lists = {};
  const run = async q => {
    if (!q) {
      box.innerHTML = html`<a class="au-card" href="#/listen/switch" style="margin-top:4px"><div class="lbl"><span>Switching from Spotify, Apple Music or YouTube?</span>${I('right', 'width:18px;height:18px')}</div>
        <div class="big">Bring your music with you.</div><div class="muted small">See which of your artists are already here, and invite the rest.</div></a>`.s;
      return;
    }
    const [d, oa] = await Promise.all([api(`/api/listen/search?q=${encodeURIComponent(q)}`), api(`/api/listen/open/search?q=${encodeURIComponent(q)}`).catch(() => ({ songs: [] }))]);
    lists = { r: d.songs, o: oa.songs };
    box.innerHTML = html`${d.artists.length ? html`<div class="au-h2" style="margin-top:8px"><h2>Artists</h2></div><div class="au-rows">${d.artists.map(a => html`<a class="au-row" href="#/listen/artist/${a.id}">${art(a.name, null, 'round')}<div class="t"><b>${a.name}</b><small>Artist</small></div></a>`)}</div>` : ''}
      ${d.songs.length ? html`<div class="au-h2" style="margin-top:8px"><h2>Songs</h2></div><div class="au-rows">${d.songs.map(s => songRow(s, 'r'))}</div>` : ''}
      ${oa.songs.length ? html`<div class="au-h2" style="margin-top:8px"><h2>On the Open Audio Protocol</h2><small>Free to play · not on your receipt yet</small></div><div class="au-rows">${oa.songs.slice(0, 8).map(s => songRow(s, 'o', `${s.artist_credit} · Open Audio`))}</div>` : ''}
      ${!d.artists.length && !d.songs.length ? html`<div class="au-empty"><h2>Not here yet</h2><p>Invite them: when an artist joins, their passport makes sure everyone on the song gets paid.</p><button class="au-pill" data-invite="${q}">Invite ${q}</button></div>` : ''}`.s;
  };
  await run(query.get('q') || '');
  let tm;
  on(main, 'input', 'input[name=q]', (e, t) => { clearTimeout(tm); tm = setTimeout(() => run(t.value.trim()), 220); });
  on(main, 'submit', '[data-q]', e => e.preventDefault());
  on(main, 'click', '[data-invite]', (e, t) => copyText(inviteText(t.dataset.invite), 'Invite copied. Send it to them anywhere.'));
  on(main, 'click', '[data-play]', (e, t) => { const l = lists[t.dataset.list] || []; const i = l.findIndex(x => x.id === t.dataset.play); if (i >= 0) playList(l, i); });
}, { public: true, title: 'Search · Audius' });
const inviteText = name => `${name}, I want to listen to you on Audius. My money goes only to the artists I play, and a signed Song Passport makes sure everyone on the song gets paid. Start here: ${location.origin}/#/home?artist=1`;

// ---------- Library ----------
app.route('/listen/library', async ({ el, user, query }) => {
  let tab = query.get('tab') || 'all';
  const main = shell(el, '/listen/library', '');
  if (!user) { main.innerHTML = signInCard('Your library', 'Liked songs, songs you own, Artist Passes and the artists you follow.').s; on(main, 'click', '[data-signin]', signIn); return; }
  const d = await lib();
  const lists = { liked: d.liked, owned: d.owned, played: d.played };
  let keys = null;
  const paint = () => {
    main.innerHTML = html`<div class="au-head"><h1 style="font-size:28px;font-weight:800;letter-spacing:-0.02em">Your library</h1><button class="au-ib" data-newpl aria-label="New playlist" title="New playlist">${I('plus')}</button></div>
      <div class="au-chips">${[['all', 'All'], ['playlists', 'Playlists'], ['liked', 'Liked'], ['owned', 'Owned'], ['passes', 'Passes'], ['keys', 'Keys'], ['following', 'Following']].map(([k, l]) => html`<button class="au-chip ${tab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`)}</div>
      ${tab === 'all' ? html`<div class="au-rows">
          <button class="au-row" data-tab="liked"><div class="ico" style="background:#7E1BCC;color:#fff">${I('heart')}</div><div class="t"><b>Liked songs</b><small>${d.liked.length} ${d.liked.length === 1 ? 'song' : 'songs'}</small></div></button>
          <button class="au-row" data-tab="owned"><div class="ico">${I('download')}</div><div class="t"><b>Songs I own</b><small>${d.owned.length} · yours forever</small></div></button>
          ${(d.playlists || []).map(plRow)}
          ${d.passes.map(p => html`<a class="au-row" href="#/listen/artist/${p.owner_id}">${art(p.name, null, 'round')}<div class="t"><b>${p.name}</b><small>Artist Pass${p.key ? ` · ${p.key}` : ''}</small></div></a>`)}
          ${d.following.map(f => html`<a class="au-row" href="#/listen/artist/${f.owner_id}">${art(f.name, null, 'round')}<div class="t"><b>${f.name}</b><small>Artist</small></div></a>`)}</div>
        ${d.played.length ? html`<div class="au-h2"><h2>Recently played</h2></div><div class="au-rows">${d.played.slice(0, 12).map(s => songRow(s, 'played'))}</div>` : ''}`
      : tab === 'playlists' ? html`<div class="au-rows"><button class="au-row" data-newpl><div class="ico">${I('plus')}</div><div class="t"><b>New playlist</b><small>Add songs from anywhere with the + button</small></div></button>${(d.playlists || []).map(plRow)}</div>`
      : tab === 'keys' ? (keys === null ? '' : keys.length ? html`<div class="au-rows">${keys.map(k => html`<a class="au-row" href="#/l/${k.page.handle}">${art(k.page.name, k.page.avatar_url, 'round')}<div class="t"><b>${k.page.name}</b><small>${k.name || 'Listener'}${k.orders ? ` · ${k.orders} ${k.orders === 1 ? 'order' : 'orders'}` : ''}</small></div>${I('key', 'width:18px;height:18px;color:#C98BFF')}</a>`)}</div>`
          : html`<div class="au-empty"><h2>No Listener Keys yet</h2><p>Own a song, tip, or get an Artist Pass from an artist with a One Link page, and you get their Key: presales and early drops first.</p></div>`)
      : tab === 'liked' ? (d.liked.length ? html`<div class="au-rows">${d.liked.map(s => songRow(s, 'liked'))}</div>` : html`<div class="au-empty"><h2>No liked songs yet</h2><p>Tap the heart on anything you play.</p></div>`)
      : tab === 'owned' ? (d.owned.length ? html`<div class="au-rows">${d.owned.map(s => songRow(s, 'owned', `${s.artist_credit} · Yours forever`))}</div>` : html`<div class="au-empty"><h2>Nothing owned yet</h2><p>Tap “Own it” on any song. It stays yours, even if you cancel.</p></div>`)
      : tab === 'passes' ? (d.passes.length ? html`<div class="au-rows">${d.passes.map(p => html`<a class="au-row" href="#/listen/artist/${p.owner_id}">${art(p.name, null, 'round')}<div class="t"><b>${p.name}</b><small>Renews ${new Date(p.renews_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${p.key ? ` · ${p.key}` : ''}</small></div></a>`)}</div>` : html`<div class="au-empty"><h2>No Artist Passes</h2><p>${money(300)} a month backs one artist. All of it goes to them and their collaborators.</p></div>`)
      : (d.following.length ? html`<div class="au-rows">${d.following.map(f => html`<a class="au-row" href="#/listen/artist/${f.owner_id}">${art(f.name, null, 'round')}<div class="t"><b>${f.name}</b><small>Artist</small></div></a>`)}</div>` : html`<div class="au-empty"><h2>Not following anyone yet</h2><p>Follow artists for presales and drops.</p></div>`)}
      <a class="au-card" href="#/listen/switch" style="margin-top:6px"><div class="lbl"><span>Bring your music</span>${I('right', 'width:18px;height:18px')}</div><div class="muted small">Move your liked songs from another app, and invite the artists who aren't here yet.</div></a>`.s;
  };
  paint();
  on(main, 'click', '[data-tab]', async (e, t) => {
    tab = t.dataset.tab; paint();
    if (tab === 'keys' && keys === null) { keys = (await api('/api/key').catch(() => ({ keys: [] }))).keys || []; if (tab === 'keys') paint(); }
  });
  if (tab === 'keys') { keys = (await api('/api/key').catch(() => ({ keys: [] }))).keys || []; paint(); }
  on(main, 'click', '[data-newpl]', async () => { const p = await newPlaylist(); if (p) app.go(`/listen/playlist/${p.id}`); });
  wireLists(main, lists);
}, { public: true, title: 'Library · Audius' });

// ---------- Playlists ----------
const plSub = p => `Playlist · ${p.count} ${p.count === 1 ? 'song' : 'songs'}${p.source && p.source !== 'here' ? ` · from ${({ spotify: 'Spotify', apple: 'Apple Music', youtube: 'YouTube' })[p.source] || 'a file'}` : ''}`;
const plCover = (p, cls = '') => p.cover?.length >= 4
  ? html`<div class="au-art au-mosaic ${cls}">${p.cover.slice(0, 4).map(c => songArt(c))}</div>`
  : p.cover?.length ? songArt(p.cover[0], cls) : art(p.name, null, cls);
const plRow = p => html`<a class="au-row" href="#/listen/playlist/${p.id}">${plCover(p)}<div class="t"><b>${p.name}</b><small>${plSub(p)}</small></div></a>`;
async function newPlaylist(songIds = []) {
  if (!app.user) { signIn(); return null; }
  return sheet((el, close) => {
    darkSheet(el);
    el.innerHTML = html`<form class="stack" style="gap:14px" data-f><h2>New playlist</h2>
      <input class="au-input" name="name" maxlength="100" placeholder="Name it" autocomplete="off" required>
      <button class="au-btn block">Create</button></form>`.s;
    el.querySelector('input').focus();
    on(el, 'submit', '[data-f]', async (e, f) => {
      e.preventDefault();
      const name = f.name.value.trim();
      if (!name) return;
      const r = await api.post('/api/listen/playlists', { name, song_ids: songIds });
      LIB = null; toast(songIds.length ? `Added to ${name}` : `Made ${name}`); close(r.playlist);
    });
  });
}
// The + button anywhere: pick a playlist for this song, or start a new one with it.
async function addToPlaylist(s) {
  if (!app.user) return signIn();
  const { playlists } = await api('/api/listen/playlists');
  sheet((el, close) => {
    darkSheet(el);
    el.innerHTML = html`<div class="stack" style="gap:12px"><h2>Add to a playlist</h2><p class="muted" style="margin:0">${s.title} · ${s.artist_credit}</p>
      <div class="au-rows"><button class="au-row" data-new><div class="ico">${I('plus')}</div><div class="t"><b>New playlist</b></div></button>
      ${playlists.map(p => html`<button class="au-row" data-pl="${p.id}">${plCover(p)}<div class="t"><b>${p.name}</b><small>${plSub(p)}</small></div></button>`)}</div></div>`.s;
    on(el, 'click', '[data-new]', async () => { close(); await newPlaylist([s.id]); });
    on(el, 'click', '[data-pl]', async (e, b) => {
      const p = playlists.find(x => x.id === b.dataset.pl);
      await api.put(`/api/listen/playlists/${p.id}/songs/${s.id}`);
      LIB = null; close(); toast(`Added to ${p.name}`);
    });
  });
}
app.route('/listen/playlist/:id', async ({ el, params, user }) => {
  if (!user) { const main = shell(el, '/listen/library', ''); main.innerHTML = signInCard('Your playlists', 'Sign in to make playlists and bring yours over.').s; on(main, 'click', '[data-signin]', signIn); return; }
  let d = await api(`/api/listen/playlists/${params.id}`);
  let editing = false;
  const main = shell(el, '/listen/library', '');
  const mins = ms => { const m = Math.round(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const paint = () => {
    const p = d.playlist, tracks = d.songs;
    main.innerHTML = html`<div class="au-album-top">${plCover(p)}
        <div style="min-width:0"><div class="k">Playlist${p.source && p.source !== 'here' ? ` · from ${({ spotify: 'Spotify', apple: 'Apple Music', youtube: 'YouTube' })[p.source] || 'a file'}` : ''}</div><h1>${p.name}</h1>
          <div class="by">${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}${p.duration_ms ? ` · ${mins(p.duration_ms)}` : ''}</div></div></div>
      <div class="au-album-acts">${tracks.length ? html`<button class="au-play" data-playall aria-label="Play">${I('play', 'width:26px;height:26px')}</button>
        <button class="au-ib mut" data-shuf aria-label="Shuffle">${I('shuffle')}</button>` : ''}
        <button class="au-pill ghost" data-edit>${editing ? 'Done' : 'Edit'}</button>
        ${editing ? html`<button class="au-pill ghost" data-rename>Rename</button><button class="au-pill ghost" data-del style="color:#FF6B6B">Delete</button>` : ''}</div>
      ${tracks.length ? (editing
        ? html`<div class="au-rows">${tracks.map((t, i) => html`<div class="au-row au-edit">${songArt(t)}<div class="t"><b>${t.title}</b><small>${t.artist_credit}</small></div>
            <button class="au-ib" data-upi="${i}" ${i ? '' : 'disabled'} aria-label="Move up">${I('up')}</button>
            <button class="au-ib" data-rm="${t.id}" aria-label="Remove from playlist">${I('x')}</button></div>`)}</div>`
        : tracksTable(tracks))
        : html`<div class="au-empty"><h2>Nothing here yet</h2><p>Tap + on any song to add it.</p><a class="au-btn" href="#/listen/search">Find songs</a></div>`}`.s;
  };
  paint();
  wireLists(main, { tracks: d.songs });
  const save = async body => { d = await api.patch(`/api/listen/playlists/${params.id}`, body); LIB = null; paint(); };
  on(main, 'click', '[data-playall]', () => playList(d.songs, 0));
  on(main, 'click', '[data-shuf]', () => { const q = [...d.songs].sort(() => Math.random() - 0.5); playList(q, 0); });
  on(main, 'click', '[data-buy]', async (e, t) => { e.stopPropagation(); const s = d.songs.find(x => x.id === t.dataset.buy); if (await buySheet(s, 'own')) { d = await api(`/api/listen/playlists/${params.id}`); paint(); } });
  on(main, 'click', '[data-edit]', () => { editing = !editing; paint(); });
  on(main, 'click', '[data-upi]', (e, t) => { const i = +t.dataset.upi, ids = d.songs.map(s => s.id); [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; save({ song_ids: ids }); });
  on(main, 'click', '[data-rm]', (e, t) => save({ song_ids: d.songs.map(s => s.id).filter(x => x !== t.dataset.rm) }));
  on(main, 'click', '[data-rename]', () => sheet((sh, close) => {
    darkSheet(sh);
    sh.innerHTML = html`<form class="stack" style="gap:14px" data-f><h2>Rename</h2><input class="au-input" name="name" maxlength="100" value="${d.playlist.name}" required><button class="au-btn block">Save</button></form>`.s;
    on(sh, 'submit', '[data-f]', async (e, f) => { e.preventDefault(); close(); await save({ name: f.name.value.trim() }); });
  }));
  on(main, 'click', '[data-del]', () => sheet((sh, close) => {
    darkSheet(sh);
    sh.innerHTML = html`<div class="stack" style="gap:14px"><h2>Delete ${d.playlist.name}?</h2><p class="muted" style="margin:0">The songs stay in your library. This can't be undone.</p>
      <button class="au-btn block" data-yes style="background:#C0392B">Delete playlist</button></div>`.s;
    on(sh, 'click', '[data-yes]', async () => { await api.del(`/api/listen/playlists/${params.id}`); LIB = null; close(); toast('Playlist deleted'); app.go('/listen/library?tab=playlists'); });
  }));
}, { public: true, title: 'Playlist · Audius' });

// ---------- Now playing ----------
app.route('/listen/now', async ({ el }) => {
  const main = shell(el, '', '', { full: true });
  const paint = () => {
    const s = P.song, d = P.d;
    if (!s) {
      main.innerHTML = html`<div class="au-now"><div class="top"><a class="au-ib" href="#/listen" aria-label="Close player">${I('down')}</a></div>
        <div class="au-empty"><h2>Nothing playing</h2><p>Press Shuffle and we'll pick for you.</p><button class="au-btn" data-shufflenow>${I('shuffle')} Shuffle</button></div></div>`.s;
      return;
    }
    if (s.open_audio) {
      main.innerHTML = html`<div class="au-now-wrap"><div class="au-now"><div class="top"><a class="au-ib" href="#/listen" aria-label="Close player">${I('down')}</a><span>Open Audio Protocol</span><span style="width:44px"></span></div>
        ${songArt(s, 'cover')}
        <div class="ttl"><div style="min-width:0"><h1>${s.title}</h1><span class="muted">${s.artist_credit}</span></div></div>
        <div class="au-scrub"><div class="track"><i data-prog style="width:${Math.min(100, P.pos / (P.dur || 1) * 100)}%"></i></div><div class="times"><span data-pos>${mmss(P.pos)}</span><span data-dur>${mmss(P.dur)}</span></div></div>
        <div class="au-ctl"><span style="width:44px"></span>
          <button class="au-ib" data-prevnow aria-label="Previous">${I('prev', 'width:30px;height:30px')}</button>
          <button class="au-pp" data-ppnow aria-label="${P.playing ? 'Pause' : 'Play'}" style="color:#14213F">${I(P.playing ? 'pause' : 'play', 'width:28px;height:28px;stroke-width:2.6')}</button>
          <button class="au-ib" data-nextnow aria-label="Next">${I('next', 'width:30px;height:30px')}</button><span style="width:44px"></span></div>
        <div class="au-np-open">${openAudioBox(s, { head: false })}</div></div></div>`.s;
      return;
    }
    const c = hue((s.title || '') + (s.artist_credit || ''));
    const liked = d?.song?.liked;
    const owned = d?.song?.owned || s.access === 'owned';
    const people = d?.people || [];
    main.innerHTML = html`<div class="au-now-wrap" style="--np:${shade(c, 0.32)}"><div class="au-now">
      <div class="top"><a class="au-ib" href="#/listen" aria-label="Close player" style="justify-content:start;display:flex;align-items:center">${I('down')}</a>
        <div class="from"><small>PLAYING FROM</small><b>${P.shuffle ? 'Shuffle' : s.artist_credit}</b></div>
        <button class="au-ib" data-credits aria-label="Credits">${I('more')}</button></div>
      ${songArt(s, 'cover')}
      <div class="ttl"><div style="min-width:0"><h1>${s.title}</h1><a href="#/listen/artist/${s.owner_id}">${s.artist_credit}</a></div>
        <button class="au-ib ${liked ? 'liked' : ''}" data-likenow aria-label="${liked ? 'Remove from Liked songs' : 'Add to Liked songs'}">${I('heart')}</button></div>
      <div class="au-scrub"><div class="track"><i data-prog style="width:${Math.min(100, P.pos / (P.dur || 1) * 100)}%"></i></div><div class="times"><span data-pos>${mmss(P.pos)}</span><span data-dur>${mmss(P.dur)}</span></div></div>
      <div class="au-ctl">
        <button class="au-ib mut ${P.shuffle ? 'on' : ''}" data-shufflenow aria-label="Shuffle">${I('shuffle')}</button>
        <button class="au-ib" data-prevnow aria-label="Previous">${I('prev', 'width:30px;height:30px')}</button>
        <button class="au-pp" data-ppnow aria-label="${P.playing ? 'Pause' : 'Play'}" style="color:${shade(c, 0.32)}">${I(P.playing ? 'pause' : 'play', 'width:28px;height:28px;stroke-width:2.6')}</button>
        <button class="au-ib" data-nextnow aria-label="Next">${I('next', 'width:30px;height:30px')}</button>
        <button class="au-ib mut" data-device aria-label="Play on another device">${I('device')}</button></div>
      <div class="au-acts">
        ${owned ? html`<button class="au-act" disabled>${I('check')}You own it</button>` : html`<button class="au-act main" data-own>${I('download')}Own it · ${money(s.price || 129)}</button>`}
        <button class="au-act" data-tipnow>${I('dollar')}Tip</button>
        <button class="au-act" data-addnow>${I('addlist')}Add</button>
        <a class="au-act" href="#/listen/artist/${s.owner_id}">${I('bag')}Merch</a></div>
      ${people.length ? html`<button class="au-made" data-credits><div class="au-faces">${people.slice(0, 3).map(p => html`<span style="background:${hue(p.name)}">${initials(p.name)}</span>`)}</div>
        <div class="t"><b>${people.length} ${people.length === 1 ? 'person' : 'people'} made this. All get paid.</b><small>Signed Song Passport · tap for credits</small></div>${I('right', 'width:18px;height:18px')}</button>` : ''}
    </div></div>`.s;
  };
  paint();
  // Repaint when the song or its details change, until this page is left.
  P.onChange = () => { if (main.isConnected) paint(); else P.onChange = null; };
  on(main, 'click', '[data-ppnow]', () => toggle());
  on(main, 'click', '[data-nextnow]', () => next());
  on(main, 'click', '[data-prevnow]', () => prev());
  on(main, 'click', '[data-shufflenow]', () => shuffleAll());
  on(main, 'click', '[data-likenow]', (e, t) => like(P.song, t));
  on(main, 'click', '[data-own]', () => buySheet(P.song, 'own'));
  on(main, 'click', '[data-tipnow]', () => buySheet(P.song, 'tip'));
  on(main, 'click', '[data-addnow]', () => P.song && addToPlaylist(P.song));
  on(main, 'click', '[data-credits]', () => P.d && creditsSheet(P.d));
  on(main, 'click', '[data-device]', () => toast('Playing on this device. More devices come with the apps.'));
}, { public: true, title: 'Now playing · Audius' });

// ---------- The monthly receipt, as a story (design TBD) ----------
app.route('/listen/receipt', async ({ el, user, query }) => {
  if (!user) { const m = shell(el, '/listen/receipt', signInCard('Your monthly receipt', 'See exactly who your money paid, every month.')); on(m, 'click', '[data-signin]', signIn); return; }
  const d = await api(`/api/listen/receipt${query.get('period') ? `?period=${query.get('period')}` : ''}`);
  let step = 0;
  const main = shell(el, '/listen/receipt', '', { full: true });
  if (!d.paid) {
    main.innerHTML = html`<div class="au-story"><div class="au-story-in"><div class="hd"><span>Your receipt</span><a class="au-ib" href="#/listen" aria-label="Close">${I('x')}</a></div>
      <h1>No receipt yet.</h1><div class="sub">Pick a plan and press play. Every month you'll see exactly who your money paid.</div>
      <div class="foot"><a class="au-btn light" href="#/listen/switch">See plans</a></div></div></div>`.s;
    return;
  }
  const artists = d.artists || [];
  const maxMin = Math.max(1, ...artists.map(a => a.minutes));
  const top = artists[0];
  const mo = monthName(d.period);
  const STEPS = 4;
  const paint = () => {
    const segs = html`<div class="au-segs">${Array.from({ length: STEPS }, (_, i) => html`<i class="${i <= step ? 'on' : ''}"></i>`)}</div>
      <div class="hd"><span>Your receipt · ${mo}${d.final ? '' : ' so far'}<span class="tbd">DESIGN TBD</span></span><a class="au-ib" href="#/listen" aria-label="Close" style="justify-content:end;display:flex;align-items:center">${I('x')}</a></div>`;
    const foot = (last = false) => html`<div class="foot"><button class="au-btn light" data-share>${I('share', 'width:20px;height:20px')}Share my receipt</button>${last ? html`<a class="next" href="#/listen" style="display:flex;align-items:center">Done</a>` : html`<button class="next" data-next>Next</button>`}</div>`;
    const bodies = [
      () => html`<div><h1>You paid the people you played.</h1><div class="sub">${money(d.recordings)} of your ${money(d.paid)} went straight to them.</div></div>
        <div class="au-paper">${artists.slice(0, 6).map((a, i) => html`<button class="r" data-artist="${i}" style="border:0;background:none;padding:0;text-align:left;cursor:pointer;font:inherit;color:inherit">
          <div class="l"><span><b>${a.name}</b><small> · ${a.minutes} min${a.ai ? ' · AI' : ''}</small></span><strong>${money(a.amount)}</strong></div>
          <div class="bar"><i style="width:${Math.max(3, Math.round(a.minutes / maxMin * 100))}%;background:${hue(a.name)}"></i></div></button>`)}
          ${artists.length > 6 ? html`<div class="r"><div class="l"><span><b>${artists.length - 6} more ${artists.length - 6 === 1 ? 'artist' : 'artists'}</b></span><strong>${money(artists.slice(6).reduce((s, a) => s + a.amount, 0))}</strong></div></div>` : ''}
          <div class="muted small" style="color:#636366">Ranked by listening. Tap an artist to see how their share splits.</div></div>
        <div class="fine"><div><span>Songwriters, shared through The MLC and PROs</span><span>${money(d.songwriters)}</span></div><div><span>Keeps Audius running · no ads</span><span>${money(d.platform)}</span></div></div>
        ${foot()}`,
      () => html`<div><div class="sub" style="margin:0 0 10px">Your top artist</div><h1 style="font-size:56px">${top.name}</h1>
          <div class="sub">${top.minutes} minutes. ${money(top.amount)} of your money, split between the ${top.split?.length || 1} ${top.split?.length === 1 ? 'person' : 'people'} on the songs you played.</div></div>
        <div class="au-paper">${(top.split?.length ? top.split : [{ name: top.name, amount: top.amount, roles: [] }]).map(p => html`<div class="r"><div class="l"><span><b>${p.name}</b><small> · ${roleLine(p.roles) || 'Artist'}</small></span><strong>${money(p.amount)}</strong></div></div>`)}</div>
        ${foot()}`,
      () => html`<div><div class="sub" style="margin:0 0 10px">You listened ${hm(d.minutes)} this month</div><div class="huge">${money(d.recordings)}</div>
          <div class="sub" style="margin-top:16px">went to the ${artists.length} ${artists.length === 1 ? 'artist' : 'artists'} you played, and $0.00 to anyone you didn't. On most services your money goes into one big pot and is split by everyone's plays. Here, it only follows you.</div></div>
        <div class="fine" style="font-size:15px"><div><span>You listened</span><span>${hm(d.minutes)}</span></div><div><span>Artists you played</span><span>${artists.length}</span></div><div><span>Ads you heard</span><span>0</span></div></div>
        <button class="au-btn" data-compare style="align-self:flex-start;background:rgba(255,255,255,.14);color:#fff">How this compares</button>
        ${foot()}`,
      () => html`<div><h1>No ads. Ever.</h1><div class="sub">You paid ${money(d.paid)}. Here's all of it.</div></div>
        <div class="au-paper">
          <div class="r"><div class="l"><span><b>Artists you played</b></span><strong>${money(d.recordings)}</strong></div><div class="bar"><i style="width:${Math.round(d.recordings / d.paid * 100)}%;background:#7E1BCC"></i></div></div>
          <div class="r"><div class="l"><span><b>Songwriters</b><small> · MLC and PROs</small></span><strong>${money(d.songwriters)}</strong></div><div class="bar"><i style="width:${Math.round(d.songwriters / d.paid * 100)}%;background:#B98BE3"></i></div></div>
          <div class="r"><div class="l"><span><b>Audius</b></span><strong>${money(d.platform)}</strong></div><div class="bar"><i style="width:${Math.round(d.platform / d.paid * 100)}%;background:#1D1D1F"></i></div></div></div>
        ${d.note ? html`<div class="sub">${d.note}</div>` : ''}
        ${d.periods.length > 1 ? html`<div class="months">${d.periods.map(p => html`<a class="${p === d.period ? 'on' : ''}" href="#/listen/receipt?period=${p}">${monthName(p)}</a>`)}</div>` : ''}
        <div class="sub" style="font-size:13px">${d.final ? 'Paid out.' : 'This fills in as you listen and is paid out after the month ends.'} Songwriter money is shared by The MLC and PROs under their own rules, so it can't follow your listening yet. Before sales tax.</div>
        ${foot(true)}`
    ];
    main.innerHTML = html`<div class="au-story"><div class="au-story-in">${segs}${bodies[step]()}</div></div>`.s;
  };
  paint();
  on(main, 'click', '[data-next]', () => { step = Math.min(STEPS - 1, step + 1); paint(); });
  on(main, 'click', '[data-artist]', (e, t) => splitSheet(artists[+t.dataset.artist]));
  on(main, 'click', '[data-compare]', () => compareSheet(d));
  on(main, 'click', '[data-share]', () => copyText(`My ${mo} on Audius: ${money(d.recordings)} went to the ${artists.length} artists I played${top ? `, most to ${top.name}` : ''}. $0.00 to anyone I didn't. No ads.`, 'Copied. Paste it anywhere.'));
}, { public: true, title: 'Your receipt · Audius' });
const hm = min => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${m} m` : `${m} min`; };
// What the same listening would likely send these artists on a pooled service, with the assumption in plain sight.
// Pooled services pay per stream from one big pot; we assume about $0.004 a stream to the recording side and 3.5
// minutes a stream. It's an estimate, so it says "about".
const POOLED = { perStream: 0.4, minutesPerStream: 3.5 }; // cents
function compareSheet(d) {
  const streams = Math.round(d.minutes / POOLED.minutesPerStream);
  const pooled = Math.round(streams * POOLED.perStream);
  sheet(el => {
    darkSheet(el);
    el.innerHTML = html`<div class="stack" style="gap:14px">
      <h2>How this compares</h2>
      <div class="au-paper">
        <div class="r"><div class="l"><span><b>Here, on Audius</b><small> · your money follows your listening</small></span><strong>${money(d.recordings)}</strong></div></div>
        <div class="r"><div class="l"><span><b>On a pooled service, about</b><small> · one pot split by everyone's plays</small></span><strong>${money(pooled)}</strong></div></div>
      </div>
      <p class="muted small" style="margin:0">Today, a listener like you sends these artists about ${money(pooled)} a month under pooled payouts. The estimate assumes ${hm(d.minutes)} is about ${streams} streams (3.5 minutes each) at about $0.004 a stream to the recording side. Real rates vary by service, country and plan, so treat it as a guide.</p>
    </div>`.s;
  });
}
function splitSheet(a) {
  sheet(el => {
    darkSheet(el);
    const parts = a.split?.length ? a.split : [{ name: a.name, amount: a.amount, roles: [] }];
    const total = parts.reduce((s, p) => s + p.amount, 0) || 1;
    el.innerHTML = html`<div class="stack" style="gap:14px">
      <div><div class="muted small">You played ${a.name} for ${a.minutes} minutes</div><h2>How ${money(a.amount)} splits</h2></div>
      <div class="au-bar-money" style="height:14px">${parts.map(p => html`<i style="flex:${p.amount || 1};background:${hue(p.name)}"></i>`)}</div>
      <div class="au-rows">${parts.map(p => html`<div class="au-row" style="cursor:default"><div class="au-faces"><span style="background:${hue(p.name)};width:36px;height:36px">${initials(p.name)}</span></div>
        <div class="t"><b>${p.name}</b><small>${roleLine(p.roles) || 'Artist'} · ${Math.round(p.amount / total * 100)}%</small></div><b>${money(p.amount)}</b></div>`)}</div>
      <div class="row" style="gap:8px;color:#C98BFF;font-weight:600;font-size:14px">${I('seal', 'width:20px;height:20px')} By the song's signed Song Passport</div></div>`.s;
  });
}

// ---------- Artist page ----------
app.route('/listen/artist/:id', async ({ el, params, user }) => {
  const d = await api(`/api/listen/artists/${params.id}`);
  const a = d.artist;
  const color = hue(a.name);
  const main = shell(el, '', '');
  const k = d.key;
  const paint = () => {
    main.innerHTML = html`<div class="au-artist-top" style="background:${a.image_url ? `center/cover url('${esc(a.image_url)}')` : color}">
        <div class="halo"></div><a class="back" href="#/listen" aria-label="Back">${I('left')}</a>
        <div class="nm"><h1>${a.name}</h1><small>${a.listeners.toLocaleString('en-US')} ${a.listeners === 1 ? 'listener' : 'listeners'} this month</small></div></div>
      <div class="au-artist-acts">
        <button class="au-pill ghost" data-follow>${d.following ? 'Following' : 'Follow'}</button>
        ${d.tip ? html`<button class="au-pill ghost" data-tipblock style="display:flex;align-items:center;gap:6px">${I('dollar', 'width:18px;height:18px')}Tip</button>` : ''}
        ${d.onelink ? html`<button class="au-ib" data-share aria-label="Share One Link" style="color:#A1A1AA">${I('link')}</button>` : ''}
        <button class="au-play" data-playall aria-label="Play ${a.name}">${I('play', 'width:26px;height:26px')}</button></div>
      ${user && k ? html`<div class="au-card au-key"><div class="row1"><div class="kico">${I('key')}</div><div style="flex:1;display:flex;flex-direction:column;gap:2px"><b>${k.step === 1 ? 'You have a Listener Key' : `You're ${/^[AEIOU]/.test(k.name) ? 'an' : 'a'} ${k.name}`}</b><small>Level ${k.step} of 4${k.step >= 3 ? ' · first in line for presales' : ''}</small></div></div>
          <div class="au-steps">${[1, 2, 3, 4].map(n => n <= k.step ? html`<i class="on"></i>` : n === k.step + 1 ? html`<i><b style="width:${Math.round((k.progress || 0) * 100)}%"></b></i>` : html`<i></i>`)}</div>
          <div class="hint">${k.hint}</div></div>` : ''}
      <div class="au-pass"><div class="t"><b>${a.name} Artist Pass</b><small>Every song in full, early tickets. All of it goes to ${a.name} and their collaborators.</small></div>
        <button data-pass ${d.pass.active ? 'disabled' : ''}>${d.pass.active ? 'You have it' : `${money(d.pass.price).replace('.00', '')} a month`}</button></div>
      ${d.shop.length ? html`<div class="au-h2"><h2>Merch</h2><small>Everyone on the song earns</small></div>
        <div class="au-shelf">${d.shop.map((b, i) => html`<button class="au-shop" data-shop="${i}"><div class="box">${b.kind === 'tour' ? I('ticket') : b.kind === 'buy' ? I('disc') : b.kind === 'membership' ? I('star') : I('shirt')}</div>
          <b>${b.kind === 'tour' ? `${b.title}${b.date ? `, ${new Date(b.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}` : b.title}</b>
          <small class="${b.presale ? 'hot' : ''}">${b.presale ? 'Presale' : b.soldOut ? 'Sold out' : b.price_minor ? money(b.price_minor) + (b.kind === 'membership' ? ' a month' : '') : b.subtitle || ''}</small></button>`)}</div>` : ''}
      <div class="au-h2"><h2>Popular</h2></div>
      <div class="au-rows">${d.songs.slice(0, 10).map(s => songRow(s, 'songs', s.access === 'preview' ? 'Preview' : ''))}</div>
      ${d.albums.length ? html`<div class="au-h2"><h2>Albums</h2></div><div class="au-shelf">${d.albums.map(r => html`<a class="au-tile" href="#/listen/album/${r.id}">${art(r.title, r.artwork_url)}<b>${r.title}</b><small>${(r.release_date || '').slice(0, 4) || r.type}</small></a>`)}</div>` : ''}`.s;
  };
  paint();
  wireLists(main, { songs: d.songs });
  on(main, 'click', '[data-playall]', () => playList(d.songs, 0));
  on(main, 'click', '[data-follow]', async (e, t) => {
    if (!user) return signIn();
    const r = await api.put(`/api/listen/artists/${a.id}/follow`, { on: !d.following });
    d.following = r.following; LIB = null; paint();
  });
  on(main, 'click', '[data-share]', () => copyText(`${location.origin}/l/${d.onelink.page.handle}`, 'One Link copied'));
  on(main, 'click', '[data-tipblock]', async () => { await checkoutSheet(d.onelink, d.tip, d.onelink.page.handle); });
  on(main, 'click', '[data-shop]', async (e, t) => {
    const b = d.shop[+t.dataset.shop];
    if (b.kind === 'tour') { if (b.url) open(b.url, '_blank', 'noopener'); else app.go(`/l/${d.onelink.page.handle}`); return; }
    await checkoutSheet(d.onelink, b, d.onelink.page.handle);
  });
  on(main, 'click', '[data-pass]', () => passSheet(a, d));
}, { public: true, title: 'Artist · Audius' });
function passSheet(a, d) {
  if (!app.user) return signIn();
  sheet((el, close) => {
    darkSheet(el);
    const audio = Math.round(d.pass.price * 0.9);
    el.innerHTML = html`<div class="stack" style="gap:14px">
      <div><div class="muted small">Artist Pass</div><h2>${a.name}</h2></div>
      <div class="au-rows">${[['play', 'Every song in full, ad free'], ['ticket', 'Early tickets and presales'], ['dollar', `About 70% goes to ${a.name} and everyone on their songs`]].map(([i, t]) => html`<div class="au-row" style="cursor:default"><div class="ico">${I(i)}</div><div class="t"><b style="font-weight:500;white-space:normal">${t}</b></div></div>`)}</div>
      <button class="au-btn block" data-m="card">Start for ${money(d.pass.price)} a month</button>
      <button class="au-btn light block" data-m="audio">Pay with AUDIO · ${money(audio)} a month</button>
      <div class="muted small" style="text-align:center">Test mode: no card is charged yet. Cancel any time.</div></div>`.s;
    on(el, 'click', '[data-m]', async (e, t) => {
      await busy(t, () => api.post('/api/listen/subscribe', { plan: 'artist', artist_owner_id: a.id, pay_method: t.dataset.m }));
      close(); toast(`You back ${a.name}. Press play.`); LIB = null; app.refresh();
    });
  });
}

// ---------- Album and song pages ----------
function tracksTable(tracks, { album = false } = {}) {
  return html`<div class="au-tracks"><div class="au-tr-head"><span>#</span><span>Title</span><span></span><span>Time</span></div>
    ${tracks.map((t, i) => { const playing = P.song?.id === t.id; return html`<div class="au-tr ${playing ? 'on' : ''}" data-play="${t.id}" data-list="tracks">
      <span class="n">${playing ? '▶' : i + 1}</span><span class="tt"><b>${t.title}${t.ai ? ' · AI' : ''}</b><small>${t.credit || t.artist_credit}</small></span>
      <span class="own">${playing ? html`<span class="yes">Playing</span>` : t.owned ? html`<span class="yes">Owned</span>` : html`<button data-buy="${t.id}">${money(t.price || 129)}</button>`}</span>
      <span class="tm">${t.duration_ms ? mmss(t.duration_ms) : ''}</span></div>`; })}</div>`;
}
app.route('/listen/album/:id', async ({ el, params }) => {
  const d = await api(`/api/listen/albums/${params.id}`);
  const al = d.album;
  const main = shell(el, '', html`<div class="au-album-top">${art(al.title, al.artwork_url)}
      <div style="min-width:0"><div class="k">${al.type === 'single' ? 'Single' : al.type === 'ep' ? 'EP' : 'Album'}</div><h1>${al.title}</h1>
        <div class="by"><a href="#/listen/artist/${al.owner_id}">${al.artist}</a>${al.year ? ` · ${al.year}` : ''} · ${al.tracks} ${al.tracks === 1 ? 'song' : 'songs'}</div></div></div>
    <div class="au-album-acts"><button class="au-play" data-playall aria-label="Play album">${I('play', 'width:26px;height:26px')}</button>
      ${d.buy ? html`<button class="au-pill" data-buyalbum style="display:flex;align-items:center;gap:8px;padding:12px 18px">${I('download', 'width:18px;height:18px')}Own the album · ${money(d.buy.price_minor)}</button>` : ''}
      ${d.presale ? html`<button class="au-pill ghost" data-presale>${d.presale.title}</button>` : ''}</div>
    <div data-tracks>${tracksTable(d.tracks, { album: true })}</div>`);
  wireLists(main, { tracks: d.tracks });
  on(main, 'click', '[data-playall]', () => playList(d.tracks, 0));
  on(main, 'click', '[data-buy]', async (e, t) => { e.stopPropagation(); const s = d.tracks.find(x => x.id === t.dataset.buy); if (await buySheet(s, 'own')) main.querySelector('[data-tracks]').innerHTML = tracksTable(d.tracks).s; });
  const one = async blockId => { const pg = await api(`/api/l/${d.onelink.handle}`); const b = pg.blocks.find(x => x.id === blockId); if (b) await checkoutSheet(pg, b, d.onelink.handle); };
  on(main, 'click', '[data-buyalbum]', () => (app.user ? one(d.buy.block_id) : signIn()));
  on(main, 'click', '[data-presale]', () => (app.user ? one(d.presale.block_id) : signIn()));
}, { public: true, title: 'Album · Audius' });

app.route('/listen/song/:id', async ({ el, params }) => {
  const d = await api(`/api/listen/songs/${params.id}`);
  const s = d.song;
  const tracks = [s, ...d.more];
  const main = shell(el, '', html`<div class="au-album-top">${songArt(s)}
      <div style="min-width:0"><div class="k">Song${s.ai ? ' · declared AI' : ''}</div><h1>${s.title}</h1>
        <div class="by"><a href="#/listen/artist/${s.owner_id}">${s.artist_credit}</a> · ${d.listeners} ${d.listeners === 1 ? 'listener' : 'listeners'}</div></div></div>
    <div class="au-album-acts"><button class="au-play" data-playall aria-label="Play">${I('play', 'width:26px;height:26px')}</button>
      ${s.owned ? html`<span class="au-pill done">${I('check', 'width:18px;height:18px;vertical-align:-4px')} You own it</span>` : html`<button class="au-pill" data-own>Own it · ${money(s.price || 129)}</button>`}
      <button class="au-pill ghost" data-tip>Tip</button>
      <button class="au-ib mut" data-addpl aria-label="Add to a playlist" title="Add to a playlist">${I('addlist')}</button></div>
    ${d.people.length ? html`<button class="au-made" data-credits style="background:#1A1A21"><div class="au-faces">${d.people.slice(0, 3).map(p => html`<span style="background:${hue(p.name)}">${initials(p.name)}</span>`)}</div>
      <div class="t"><b>${d.people.length} ${d.people.length === 1 ? 'person' : 'people'} made this. All get paid.</b><small>Signed Song Passport · tap for credits</small></div>${I('right', 'width:18px;height:18px')}</button>` : ''}
    <div class="au-h2"><h2>${d.more.length ? `More by ${s.artist_credit}` : 'Track'}</h2></div>
    ${tracksTable(tracks)}`);
  wireLists(main, { tracks });
  on(main, 'click', '[data-playall]', () => playList(tracks, 0));
  on(main, 'click', '[data-own]', async () => { if (await buySheet(s, 'own')) app.refresh(); });
  on(main, 'click', '[data-tip]', () => buySheet(s, 'tip'));
  on(main, 'click', '[data-addpl]', () => addToPlaylist(s));
  on(main, 'click', '[data-credits]', () => creditsSheet(d));
  on(main, 'click', '[data-buy]', (e, t) => { e.stopPropagation(); buySheet(tracks.find(x => x.id === t.dataset.buy), 'own'); });
}, { public: true, title: 'Song · Audius' });

// ---------- Switch: bring your music from an export file, pick a plan, AI on or off ----------
const SOURCES = {
  spotify: { name: 'Spotify', how: 'In Spotify: Account › Privacy › Download your data. When the email arrives, open the zip and pick YourLibrary.json or a Playlist file.' },
  apple: { name: 'Apple Music', how: 'At privacy.apple.com: Get a copy of your data › Apple Media Services. Open the zip and pick the Apple Music Library Tracks file.' },
  youtube: { name: 'YouTube', how: 'At takeout.google.com: pick YouTube and YouTube Music › playlists. Export your library as a CSV with title and artist columns.' }
};
// Pull { title, artist } pairs out of any export: Spotify, Apple Music or a CSV.
function parseExport(text, filename) {
  const out = [];
  if (/\.csv$/i.test(filename) || !/^\s*[[{]/.test(text)) {
    const rows = text.split(/\r?\n/).filter(Boolean).map(l => (l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || []).map(c => c.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')));
    const head = (rows.shift() || []).map(h => h.toLowerCase());
    const ti = head.findIndex(h => /title|track|song|name/.test(h)), ai = head.findIndex(h => /artist/.test(h));
    if (ti < 0 && ai < 0) return out;
    for (const r of rows) out.push({ title: ti >= 0 ? r[ti] : '', artist: ai >= 0 ? r[ai] : '' });
    return out;
  }
  const walk = v => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (!v || typeof v !== 'object') return;
    const title = v.trackName || v.track || v.Title || v.title || v['Track Name'] || v.Name;
    const artist = v.artistName || v.artist || v.Artist || v['Artist Name'];
    if (typeof title === 'string' && typeof artist === 'string') { out.push({ title, artist }); return; }
    Object.values(v).forEach(walk);
  };
  const data = JSON.parse(text);
  walk(data);
  return out;
}
// Spotify's Playlist files list each playlist by name: [{ name, items: [{ title, artist }] }].
function parsePlaylists(text, filename) {
  if (/\.csv$/i.test(filename) || !/^\s*[[{]/.test(text)) return [];
  const data = JSON.parse(text);
  const lists = Array.isArray(data?.playlists) ? data.playlists : [];
  return lists.filter(l => l && typeof l.name === 'string').map(l => ({ name: l.name.slice(0, 100), items: parseExport(JSON.stringify(l.items || []), 'x.json') }))
    .filter(l => l.items.length).slice(0, 200);
}
app.route('/listen/switch', switchPage, { public: true, title: 'Switch · Audius' });
app.route('/listen/plans', switchPage, { public: true, title: 'Plans · Audius' });
async function switchPage({ el, user }) {
  const d = await api('/api/listen/plans');
  const cur = (d.me?.subs || []).find(s => s.plan !== 'artist');
  let src = 'spotify', plan = cur?.plan === 'student' ? 'all' : (cur?.plan || 'all'), method = 'card', ai = false, result = null;
  if (user) ai = !!(await api('/api/listen').catch(() => ({}))).aiOn;
  const main = shell(el, '', '');
  const price = p => method === 'audio' ? p - Math.round(p * d.audioOffBps / 10000) : p;
  const shown = Object.entries(d.plans).filter(([, p]) => !p.hidden);
  const paint = () => {
    const pct = result ? result.artistsHereShare : 0;
    const P0 = d.plans[plan];
    const isCur = cur ? cur.plan === plan : plan === 'free';
    main.innerHTML = html`<div class="au-switch-h"><h1>Bring your music with you.</h1><p>See which of your artists are here, and invite the rest.</p></div>
      <div class="au-srcs">${Object.entries(SOURCES).map(([k, s]) => html`<button class="${src === k ? 'on' : ''}" data-src="${k}">${s.name}</button>`)}</div>
      <div class="au-card" style="gap:12px">
        <div class="row" style="gap:16px"><div class="au-ring" style="background:conic-gradient(#C98BFF 0 ${pct}%, #33333D ${pct}% 100%)"><span>${result ? `${pct}%` : I('upload', 'width:20px;height:20px')}</span></div>
          <div style="display:flex;flex-direction:column;gap:4px;min-width:0">${result
            ? html`<b style="font-size:16px">${result.artistsHere.length} of your ${result.artistsTotal} artists are here</b><span class="muted small">${result.found} of ${result.songs.toLocaleString('en-US')} songs matched and saved to Liked songs.${result.playlists?.length ? ` ${result.playlists.length} ${result.playlists.length === 1 ? 'playlist' : 'playlists'} came over with the songs that are here.` : ''}</span>`
            : html`<b style="font-size:16px">Upload your ${SOURCES[src].name} data</b><span class="muted small">${SOURCES[src].how}</span>`}</div></div>
        ${result ? html`${result.playlists?.length ? html`<div class="au-rows">${result.playlists.slice(0, 6).map(p => html`<a class="au-row" href="#/listen/playlist/${p.id}"><div class="ico">${I('addlist')}</div><div class="t"><b>${p.name}</b><small>${p.songs} of ${p.total} songs here</small></div></a>`)}</div>` : ''}
            ${result.artistsHere.length ? html`<div class="au-chips" style="margin:0;padding:0;flex-wrap:wrap">${result.artistsHere.slice(0, 12).map(a => html`<a class="au-chip" href="#/listen/artist/${a.owner_id}">${a.name}</a>`)}</div>` : ''}
            ${result.missing.length ? html`<div><div class="row between" style="margin-bottom:6px"><b>Not here yet</b><button class="au-pill" data-inviteall>Invite the rest</button></div>
              ${result.missing.slice(0, 6).map(m => html`<div class="au-miss"><div class="t"><b>${m.name}</b><small>${m.songs} of your songs</small></div><button class="au-pill ghost" data-invite="${m.name}">Invite</button></div>`)}
              ${result.missing.length > 6 ? html`<div class="muted small" style="margin-top:6px">and ${result.missing.length - 6} more</div>` : ''}</div>` : ''}`
          : html`<label class="au-pill ghost au-file" style="text-align:center">${user ? 'Choose the file' : 'Sign in to upload'}<input type="file" accept=".json,.csv,application/json,text/csv" data-file ${user ? '' : 'disabled'}></label>
            <div class="muted small">${src === 'spotify' ? 'Spotify only lets small test apps connect directly, so moving music works from your data file for now.' : 'Nothing leaves your device except song titles and artist names.'}</div>`}
      </div>
      <div class="au-eyebrow">Pick a plan · no ads on any of them</div>
      <div class="au-plans">${shown.map(([k, p]) => html`<button class="au-plan ${plan === k ? 'on' : ''}" data-plan="${k}"><span>${p.name}</span><span>${money(price(p.price)).replace('.00', '')}</span><span>${p.note}</span>${(cur ? cur.plan === k : k === 'free') ? html`<span class="cur">Your plan</span>` : ''}</button>`)}</div>
      ${plan !== 'free' ? html`<div class="au-pay"><button class="${method === 'card' ? 'on' : ''}" data-m="card">Card</button><button class="${method === 'audio' ? 'on' : ''}" data-m="audio">AUDIO · save about 10%</button></div>` : html`<div class="muted small">Free is shuffle play with no ads. It pays no one, because there are no ads: pick a plan and your money follows what you play.</div>`}
      <button class="au-toggle" data-ai><span class="t"><b>AI-made music</b><small>${ai ? 'On · always labelled' : 'Off · only human-made in your mixes'}</small></span><span class="au-sw ${ai ? 'on' : ''}"></span></button>
      <button class="au-btn block" data-start ${isCur ? 'disabled' : ''}>${!user ? 'Sign in to start' : isCur ? `You're on ${P0.name}` : plan === 'free' ? 'Free is shuffle play' : plan === 'artist' ? `Pick an artist · ${money(price(P0.price))} a month` : `Start ${P0.name} · ${money(price(P0.price))} a month`}</button>
      ${plan === 'all' ? html`<button class="au-pill ghost" data-student style="align-self:center">I'm a student · ${money(price(d.plans.student.price))}</button>` : ''}
      <div class="muted small" style="text-align:center">Test mode: no card is charged yet. Cancel any time. Prices before sales tax.</div>`.s;
  };
  paint();
  on(main, 'click', '[data-src]', (e, t) => { src = t.dataset.src; result = null; paint(); });
  on(main, 'click', '[data-plan]', (e, t) => { plan = t.dataset.plan; paint(); });
  on(main, 'click', '[data-m]', (e, t) => { method = t.dataset.m; paint(); });
  on(main, 'click', '[data-ai]', async () => {
    if (!user) return signIn();
    ai = !ai; await api.put('/api/listen/prefs', { ai_on: ai }); paint();
    toast(ai ? 'AI music is on. It is always labelled.' : 'AI music is off');
  });
  on(main, 'change', '[data-file]', async (e, t) => {
    const f = t.files[0];
    if (!f) return;
    let items, playlists;
    try { const text = await f.text(); items = parseExport(text, f.name); playlists = parsePlaylists(text, f.name); } catch { return toast('That file doesn’t look like a music export', { error: true }); }
    if (!items.length) return toast(src === 'youtube' ? 'That file has no song titles and artists in it' : 'No songs found in that file', { error: true });
    result = await api.post('/api/listen/import', { source: src, items: items.slice(0, 20000), playlists });
    LIB = null; paint();
  });
  on(main, 'click', '[data-invite]', (e, t) => copyText(inviteText(t.dataset.invite), 'Invite copied. Send it to them anywhere.'));
  on(main, 'click', '[data-inviteall]', () => copyText(`${result.missing.slice(0, 20).map(m => m.name).join(', ')}: ${inviteText('Hi').replace(/^Hi, /, '')}`, 'Invite copied. Post it or send it to them.'));
  const subscribe = async (btn, body) => {
    await busy(btn, () => api.post('/api/listen/subscribe', { ...body, pay_method: method }));
    toast('You’re in. Press play.'); app.go('/listen');
  };
  on(main, 'click', '[data-student]', (e, t) => (user ? subscribe(t, { plan: 'student' }) : signIn()));
  on(main, 'click', '[data-start]', (e, t) => {
    if (!user) return signIn();
    if (plan === 'free') return;
    if (plan !== 'artist') return subscribe(t, { plan });
    sheet((el, close) => {
      darkSheet(el);
      el.innerHTML = html`<div class="stack" style="gap:12px"><h2>Which artist?</h2><p class="muted" style="margin:0">Your ${money(price(d.plans.artist.price))} goes to them and everyone on their songs.</p>
        <div class="au-rows">${d.artists.map((a, i) => html`<button class="au-row" data-pick="${i}">${art(a.name, null, 'round')}<div class="t"><b>${a.name}</b></div>${I('right', 'width:18px;height:18px')}</button>`)}</div></div>`.s;
      on(el, 'click', '[data-pick]', async (e2, b) => { const a = d.artists[+b.dataset.pick]; close(); await subscribe(t, { plan: 'artist', artist_owner_id: a.owner_account_id }); });
    });
  });
}

// ---------- the artist's side: the Audius tab on a passport ----------
app.songTab({
  id: 'audius', label: 'Audius', order: 68,
  show: (song, { canManage, isContributor }) => song.status !== 'draft' && (canManage || isContributor),
  render: async ({ el, song }) => {
    const paint = async () => {
      const d = await api(`/api/songs/${song.id}/audius`);
      el.innerHTML = html`<div class="split-main"><div class="stack-lg">
        <div class="card card-pad stack">
          <div class="row between"><div><h3>Stream on Audius</h3><div class="small muted">Listeners' money goes to the songs they play, split by your passport.</div></div>
            ${d.canManage ? html`<button class="toggle ${d.live ? 'on' : ''}" data-live ${d.signed ? '' : 'disabled'} aria-label="Stream on Audius"></button>` : ''}</div>
          ${d.signed ? '' : html`<div class="callout warn small"><div>Get the split signed first, so everyone who owns the recording has agreed.</div></div>`}
          ${d.canManage ? html`<label class="check small"><input type="checkbox" data-ai ${d.ai ? 'checked' : ''}><span><b>Made with AI.</b> Declared AI songs are only heard by listeners who switch AI on, and earn a quarter of the rate. The rest goes to human artists.</span></label>` : ''}
          ${d.audio.length ? html`<div class="small muted">Streaming file: ${d.audio.find(a => a.hash === d.audio_hash) ? 'your latest master' : 'none chosen'}.</div>` : html`<div class="small muted">Upload a master in Workspace and it streams from there.</div>`}
          ${d.live ? html`<a class="btn btn-sm" href="#/listen/song/${song.id}" style="align-self:flex-start">See it on Audius</a>` : ''}
        </div>
        <div class="grid grid-3">
          <div class="card pl-stat"><div class="v">${d.stats.listeners}</div><div class="l">Listeners this month</div></div>
          <div class="card pl-stat"><div class="v">${d.stats.minutes}</div><div class="l">Minutes played</div></div>
          <div class="card pl-stat"><div class="v" style="color:var(--money)">${money(d.stats.earned)}</div><div class="l">Paid in from Audius</div></div>
        </div></div>
        <div class="card card-pad small muted stack-sm"><b style="color:var(--fg)">How you're paid</b><span>Each listener's money goes only to the songs they play, by minutes. About 55% of a plan pays recordings, 15% songwriters (through The MLC and PROs), 30% Audius. Listeners can also own a song or tip, and that money splits by your passport too. No ads, ever.</span></div>
      </div>`.s;
      return d;
    };
    let d = await paint();
    on(el, 'click', '[data-live]', async (e, t) => { await busy(t, () => api.put(`/api/songs/${song.id}/audius`, { live: !d.live, ai: el.querySelector('[data-ai]')?.checked })); toast(d.live ? 'Taken off Audius' : 'Live on Audius'); d = await paint(); });
    on(el, 'change', '[data-ai]', async (e, t) => { if (d.live) { await api.put(`/api/songs/${song.id}/audius`, { live: true, ai: t.checked }); d = await paint(); } });
  }
});
