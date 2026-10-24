// Audius, the listening app: Listen Now, a song page, plans (with Artist Pass), your library, the monthly receipt,
// a mini player that reports minutes, and the artist's "Audius" tab on every passport.
import { app, html, raw, api, toast, money, date, on, busy, esc } from '../app.js';
import { ico, cover, initialsOf, sheet, copyText } from '../pl.js';

app.nav({ id: 'listen', label: 'Listen', href: '/listen', icon: 'play', section: 'Audius', order: 80 });
app.nav({ id: 'library', label: 'Library', href: '/listen/library', icon: 'music', section: 'Audius', order: 81, auth: true });
app.nav({ id: 'receipt', label: 'Your receipt', href: '/listen/receipt', icon: 'receipt', section: 'Audius', order: 82, auth: true });

const mmss = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
const monthName = p => new Date(p + '-15').toLocaleDateString('en-US', { month: 'long' });
const AV = ['#7E1BCC', '#CC0FE0', '#5B23E1', '#E0115F', '#0EA5A4', '#F97316', '#2563EB'];
const avColor = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AV[h % AV.length]; };

// ---------- the player ----------
const P = { song: null, audio: null, playing: false, pos: 0, dur: 0, sent: 0, tick: null, el: null, people: [] };
function playerEl() {
  if (P.el) return P.el;
  P.el = document.createElement('div');
  P.el.className = 'au-player';
  P.el.style.display = 'none';
  document.body.appendChild(P.el);
  P.el.addEventListener('click', e => {
    if (e.target.closest('[data-pp]')) toggle();
    if (e.target.closest('[data-px]')) stop();
    if (e.target.closest('[data-pt]')) app.go(`/listen/song/${P.song.id}`);
  });
  return P.el;
}
function paintPlayer() {
  const el = playerEl();
  if (!P.song) { el.style.display = 'none'; return; }
  el.style.display = '';
  const s = P.song;
  el.innerHTML = html`<div class="art" style="${raw(cover(s.title + s.artist_credit, s.artwork_url))}" data-pt></div>
    <div class="meta" data-pt style="cursor:pointer"><b>${s.title}</b><small>${s.artist_credit}${s.access === 'preview' ? ' · Preview' : ''}</small></div>
    <button class="ctl" data-pp aria-label="${P.playing ? 'Pause' : 'Play'}">${ico(P.playing ? 'pause' : 'play')}</button>
    <div class="bar"><i style="width:${P.dur ? Math.min(100, P.pos / P.dur * 100) : 0}%"></i></div>
    <span class="time">${mmss(P.pos)} / ${mmss(P.dur)}</span>
    ${P.people.length ? html`<span class="pays">${ico('heart')} Paying ${P.people.slice(0, 2).map(p => p.name).join(', ')}${P.people.length > 2 ? ` +${P.people.length - 2}` : ''}</span>` : ''}
    <button class="x" data-px aria-label="Close">${ico('x')}</button>`.s;
}
export async function playSong(s) {
  if (!app.user) return app.go(`/signin?next=${encodeURIComponent(location.hash.slice(1))}`);
  stop(false);
  P.song = s; P.pos = 0; P.sent = 0; P.dur = s.duration_ms || 180000; P.people = [];
  api(`/api/listen/songs/${s.id}`).then(d => { P.people = d.people; paintPlayer(); }).catch(() => {});
  if (s.audio) {
    P.audio = new Audio(`/api/listen/songs/${s.id}/audio`);
    P.audio.addEventListener('loadedmetadata', () => { P.dur = P.audio.duration * 1000; paintPlayer(); });
    P.audio.addEventListener('ended', () => stop());
    P.audio.play().catch(() => {});
  }
  P.playing = true;
  P.tick = setInterval(step, 1000);
  paintPlayer();
}
function step() {
  if (!P.playing) return;
  P.pos = P.audio ? P.audio.currentTime * 1000 : Math.min(P.dur, P.pos + 1000);
  // Report listening every 20 seconds; the server pays by minutes, never by raw plays.
  if (P.pos - P.sent >= 20000) {
    const ms = Math.round(P.pos - P.sent); P.sent = P.pos;
    api.post('/api/listen/plays', { song_id: P.song.id, ms: Math.min(20000, ms) }).catch(err => { if (err.status === 403) { stop(); previewEnded(); } });
  }
  if (!P.audio && P.pos >= P.dur) return stop();
  const bar = P.el?.querySelector('.bar i'), t = P.el?.querySelector('.time');
  if (bar) bar.style.width = `${Math.min(100, P.pos / P.dur * 100)}%`;
  if (t) t.textContent = `${mmss(P.pos)} / ${mmss(P.dur)}`;
}
function toggle() { P.playing = !P.playing; if (P.audio) P.playing ? P.audio.play() : P.audio.pause(); paintPlayer(); }
function stop(repaint = true) {
  clearInterval(P.tick); P.tick = null;
  if (P.audio) { P.audio.pause(); P.audio = null; }
  P.playing = false;
  if (repaint) { P.song = null; paintPlayer(); }
}
function previewEnded() {
  sheet((el, close) => {
    el.innerHTML = html`<div class="pl-done"><div class="pl-check">${ico('lock', 2.2)}</div><h2>That was the preview</h2>
      <p class="muted">Pick a plan to hear the whole song. Your money goes only to the artists you play.</p>
      <button class="pl-pay" data-go>See plans</button><button class="btn btn-ghost" data-close>Not now</button></div>`.s;
    el.querySelector('[data-go]').onclick = () => { close(); app.go('/listen/plans'); };
    el.querySelector('[data-close]').onclick = () => close();
  });
}

const tile = s => html`<button class="au-tile" data-song="${s.id}">
  <div class="au-cover" style="${raw(cover(s.title + s.artist_credit, s.artwork_url))}">${s.ai ? html`<span class="tag">AI</span>` : ''}<span class="p">${ico('play')}</span></div>
  <div class="au-t">${s.title}</div><div class="au-s">${s.artist_credit}</div></button>`;

function wirePlay(el, list) {
  on(el, 'click', '[data-song]', (e, t) => {
    const s = list.find(x => x.id === t.dataset.song);
    if (e.target.closest('.p') || t.dataset.play === '1') playSong(s); else app.go(`/listen/song/${s.id}`);
  });
}

// ---------- Listen Now ----------
app.route('/listen', async ({ el, user }) => {
  const d = await api('/api/listen');
  const subs = d.me?.subs || [];
  const rc = user && subs.length ? await api('/api/listen/receipt').catch(() => null) : null;
  el.innerHTML = html`<div class="au-app">
    ${subs.length ? html`<div class="row between wrap" style="gap:12px"><div><div class="muted" style="font-weight:600">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div><div class="au-title">Listen Now</div></div>
        <div class="row" style="gap:8px">${subs.map(s => html`<span class="au-chip">${ico('check', 2.6)} ${s.label}${s.artist_name ? `: ${s.artist_name}` : ''}</span>`)}
          <button class="au-chip" data-ai>AI music <span class="au-switch ${d.aiOn ? 'on' : ''}" style="transform:scale(.8)"></span></button></div></div>
      ${rc && rc.paid ? html`<a class="au-glass row" href="#/listen/receipt" style="margin-top:22px;padding:18px 20px;gap:16px;text-decoration:none">
        <div class="ol-tile" style="background:var(--au-grad);width:52px;height:52px;border-radius:15px">${ico('receipt')}</div>
        <div style="flex:1;min-width:0"><b style="font-size:16px">Your ${monthName(rc.period)} so far</b><div class="muted small">${money(rc.recordings)} to ${new Set(rc.lines.map(l => l.artist)).size} artists you played. ${money(0)} to anyone you didn't.</div></div>
        <span class="au-btn dark" style="padding:9px 16px">See receipt</span></a>` : ''}`
    : html`<div class="au-hero"><h1>Audius.<br>Streaming, opened.</h1><p>Your money goes only to the artists you play. You see exactly where every cent went.</p>
        <div class="au-promises"><span>${ico('heart')} Paid by what you play</span><span>${ico('shield')} No ads. Ever.</span><span>${ico('download')} Buy it, own it</span><span>${ico('key')} Artist Pass ${money(d.plans.artist.price)}</span></div>
        <a class="au-btn" href="#/listen/plans">Choose a plan</a> <span class="muted small" style="position:relative;z-index:1;margin-left:10px">or play 30-second previews</span></div>`}
    ${d.top.length ? html`<div class="au-row-head"><h2>Top this month</h2></div><div class="au-shelf">${d.top.map(tile)}</div>` : ''}
    <div class="au-row-head"><h2>New on Audius</h2></div>
    ${d.latest.length ? html`<div class="au-shelf">${d.latest.map(tile)}</div>` : html`<p class="muted">Artists are adding their songs now.</p>`}
    ${d.artists.length ? html`<div class="au-row-head"><h2>Artists</h2></div><div class="au-shelf artists">${d.artists.map(a => html`<a class="au-artist" href="${a.handle ? `#/l/${a.handle}` : '#/listen'}">
      <div class="c" style="background:linear-gradient(315deg, ${a.accent || avColor(a.name)}, ${avColor(a.name + 'x')})">${initialsOf(a.name)}</div><b class="small">${a.name}</b></a>`)}</div>` : ''}
    </div>`.s;
  wirePlay(el, [...d.top, ...d.latest]);
  on(el, 'click', '[data-ai]', async () => { await api.put('/api/listen/prefs', { ai_on: !d.aiOn }); toast(d.aiOn ? 'AI music is off' : 'AI music is on. AI tracks are always labelled.'); app.refresh(); });
}, { title: 'Listen' });

// ---------- a song ----------
app.route('/listen/song/:id', async ({ el, params }) => {
  const d = await api(`/api/listen/songs/${params.id}`);
  const s = d.song;
  const total = d.people.reduce((a, p) => a + p.bps, 0) || 1;
  el.innerHTML = html`<div class="au-app">
    <div class="au-song">
      <div class="au-cover" style="${raw(cover(s.title + s.artist_credit, s.artwork_url))}">${s.ai ? html`<span class="tag">AI</span>` : ''}</div>
      <div class="stack-lg">
        <div><div class="muted" style="font-weight:700;letter-spacing:.08em;font-size:12px">SONG${s.ai ? ' · DECLARED AI' : ''}</div>
          <h1 style="font-size:clamp(2.2rem,1.4rem + 3vw,4rem);letter-spacing:-0.045em;margin-top:6px">${s.title}</h1>
          <div style="font-size:20px;margin-top:4px">${d.onelink ? html`<a href="#/l/${d.onelink.handle}">${s.artist_credit}</a>` : s.artist_credit}</div></div>
        <div class="row wrap" style="gap:12px">
          <button class="au-btn purple" data-playnow>${ico('play')} ${s.access === 'preview' ? 'Play preview' : 'Play'}</button>
          ${d.buy ? (d.buy.owned ? html`<span class="au-chip">${ico('check', 2.6)} You own this</span>` : html`<a class="au-btn dark" href="#/l/${d.onelink.handle}">${ico('download')} Buy and own · ${money(d.buy.price_minor)}</a>`) : ''}
          ${d.onelink ? html`<a class="au-btn dark" href="#/l/${d.onelink.handle}">${ico('link')} One Link</a>` : ''}
        </div>
        <div class="muted small">${d.listeners} ${d.listeners === 1 ? 'listener' : 'listeners'} on Audius</div>
      </div>
    </div>
    ${d.people.length ? html`<div class="au-row-head"><h2>When you play this, you pay</h2></div>
      <div class="au-people">${d.people.map(p => html`<div class="au-glass au-person"><div class="av" style="background:${avColor(p.name)}">${initialsOf(p.name)}</div>
        <div style="min-width:0"><b>${p.name}</b><div class="muted small">${[].concat(p.roles).slice(0, 2).join(', ')} · ${Math.round(p.bps / total * 100)}%</div></div></div>`)}</div>` : ''}
    ${d.more.length ? html`<div class="au-row-head"><h2>More by ${s.artist_credit}</h2></div><div class="au-shelf">${d.more.map(tile)}</div>` : ''}
  </div>`.s;
  on(el, 'click', '[data-playnow]', () => playSong(s));
  wirePlay(el, d.more);
}, { title: 'Song' });

// ---------- plans ----------
app.route('/listen/plans', async ({ el, user }) => {
  const d = await api('/api/listen/plans');
  let plan = 'all', method = 'card', artist = d.artists[0] || null;
  const price = p => method === 'audio' ? p - Math.round(p * d.audioOffBps / 10000) : p;
  const paint = () => {
    el.innerHTML = html`<div class="au-app">
      <div class="au-title" style="text-align:center;margin-top:8px">Pick your plan.</div>
      <p class="muted" style="text-align:center;font-size:17px;margin:8px 0 26px">Whatever you choose, your money goes only to the artists you play.</p>
      <div class="au-plans">${Object.entries(d.plans).map(([k, p]) => html`<button class="au-glass au-plan ${plan === k ? 'on' : ''}" data-plan="${k}">
        <b style="font-size:17px">${p.label}</b><div class="pr">${money(price(p.price))}<small> /month</small></div><div class="muted small">${p.note}</div>
        ${k === 'artist' ? html`<div class="small" style="color:#E9B8FF">Most of it goes straight to them.</div>` : ''}</button>`)}</div>
      ${plan === 'artist' ? html`<div class="au-glass" style="padding:16px 18px;margin-top:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <b>Which artist?</b>${d.artists.map((a, i) => html`<button class="au-chip" data-artist="${i}" style="${artist === a ? 'background:#fff;color:#0C0F14' : ''}">${a.name}</button>`)}</div>` : ''}
      <div style="max-width:420px;margin:26px auto 0" class="stack">
        <div class="seg" style="background:rgba(255,255,255,.08);width:100%"><button style="flex:1;color:#fff" class="${method === 'card' ? 'on' : ''}" data-m="card">Card</button><button style="flex:1;color:#fff" class="${method === 'audio' ? 'on' : ''}" data-m="audio">AUDIO · save 10%</button></div>
        <button class="au-btn purple" data-sub style="width:100%;padding:16px">${user ? `Start ${d.plans[plan].label} · ${money(price(d.plans[plan].price))}/mo` : 'Sign in to start'}</button>
        <div class="muted small" style="text-align:center">Test mode: no card is charged yet. Cancel any time. Prices before sales tax.</div>
      </div>
      <div class="au-glass" style="margin-top:36px;padding:26px;text-align:center"><div class="au-title" style="font-size:28px">No ads. Ever.</div>
        <p class="muted" style="max-width:520px;margin:8px auto 0">It's a promise written into how the company is set up. If we ever run an ad, every subscriber gets a free year.</p></div>
    </div>`.s;
    el.querySelectorAll('.seg button.on').forEach(b => { b.style.background = 'rgba(255,255,255,.18)'; b.style.color = '#fff'; });
  };
  paint();
  on(el, 'click', '[data-plan]', (e, t) => { plan = t.dataset.plan; paint(); });
  on(el, 'click', '[data-artist]', (e, t) => { artist = d.artists[+t.dataset.artist]; paint(); });
  on(el, 'click', '[data-m]', (e, t) => { method = t.dataset.m; paint(); });
  on(el, 'click', '[data-sub]', async (e, t) => {
    if (!user) return app.go('/signin?next=/listen/plans');
    await busy(t, () => api.post('/api/listen/subscribe', { plan, pay_method: method, artist_id: plan === 'artist' ? artist?.artist_id || undefined : undefined, artist_owner_id: plan === 'artist' && !artist?.artist_id ? artist?.owner_account_id : undefined }));
    toast('You’re in. Press play.'); app.go('/listen');
  });
}, { title: 'Plans' });

// ---------- library ----------
app.route('/listen/library', async ({ el }) => {
  const d = await api('/api/listen/library');
  const owned = d.bought.flatMap(o => o.songs);
  el.innerHTML = html`<div class="au-app"><div class="au-title">Library</div>
    <div class="au-row-head"><h2>Yours to keep</h2><span class="muted small">Bought on One Link</span></div>
    ${owned.length ? html`<div class="au-shelf">${owned.map(tile)}</div>` : html`<p class="muted">Songs and albums you buy live here next to everything you stream.</p>`}
    <div class="au-row-head"><h2>Recently played</h2></div>
    ${d.played.length ? html`<div class="au-shelf">${d.played.map(tile)}</div>` : html`<p class="muted">Nothing yet. <a href="#/listen">Start listening</a>.</p>`}</div>`.s;
  wirePlay(el, [...owned, ...d.played]);
}, { auth: true, title: 'Library' });

// ---------- the receipt (design TBD: the real one will be far more visual, like Wrapped) ----------
app.route('/listen/receipt', async ({ el, query }) => {
  const d = await api(`/api/listen/receipt${query.get('period') ? `?period=${query.get('period')}` : ''}`);
  const by = new Map();
  for (const l of d.lines) { const x = by.get(l.artist) || { artist: l.artist, amount: 0, minutes: 0, share: 0, ai: l.ai }; x.amount += l.amount; x.minutes += l.minutes; x.share += l.share; by.set(l.artist, x); }
  const artists = [...by.values()].sort((a, b) => b.amount - a.amount);
  const max = artists[0]?.amount || 1;
  el.innerHTML = html`<div class="au-app">
    ${d.periods.length > 1 ? html`<div class="row" style="justify-content:center;gap:8px;margin-bottom:18px">${d.periods.map(p => html`<a class="au-chip" href="#/listen/receipt?period=${p}" style="${p === d.period ? 'background:#fff;color:#0C0F14' : ''}">${monthName(p)}</a>`)}</div>` : ''}
    ${d.paid ? html`<div class="au-receipt" id="rc">
      <span class="au-tbd">DESIGN TBD</span>
      <div class="mo">Your ${monthName(d.period)}${d.final ? '' : ' so far'}</div>
      <div class="big">${money(d.recordings)}</div>
      <div class="lead">went to the recordings you actually played.</div>
      <div class="au-bubbles">${artists.slice(0, 5).map(a => { const sz = 34 + Math.round(a.amount / max * 26); return html`<div class="au-bubble">
        <div class="dot" style="width:${sz}px;height:${sz}px;font-size:${Math.round(sz / 3)}px">${initialsOf(a.artist)}</div>
        <div class="n"><b>${a.artist}${a.ai ? ' (AI)' : ''}</b><small>${Math.round(a.share)}% of your listening · ${a.minutes} min</small></div><div class="v">${money(a.amount)}</div></div>`; })}
        ${artists.length > 5 ? html`<div class="au-bubble"><div class="dot" style="width:34px;height:34px;font-size:12px">+${artists.length - 5}</div><div class="n"><b>${artists.length - 5} others</b></div><div class="v">${money(artists.slice(5).reduce((s, a) => s + a.amount, 0))}</div></div>` : ''}</div>
      <div class="au-zero"><span>Artists you never played</span><b>$0.00</b></div>
      <div class="au-fine"><span>Songwriters, via the MLC and PROs</span><b>${money(d.songwriters)}</b></div>
      <div class="au-fine"><span>Audius</span><b>${money(d.platform)}</b></div>
      <div class="au-fine" style="opacity:.6"><span>You paid ${money(d.paid)}${d.note ? '' : ''} · ${d.minutes} minutes</span><span>No ads. Ever.</span></div>
      ${d.note ? html`<div class="small" style="margin-top:12px;opacity:.85">${d.note}</div>` : ''}
    </div>
    <div class="row" style="justify-content:center;margin-top:22px;gap:10px"><button class="au-btn" data-share>${ico('copy')} Share my receipt</button></div>
    <p class="muted small" style="text-align:center;max-width:440px;margin:14px auto 0">${d.final ? 'Paid out.' : 'This fills in as you listen and is paid out after the month ends.'} Songwriter money is shared by the MLC and PROs under their own rules, so it can't follow your listening yet.</p>`
    : html`<div class="au-glass" style="max-width:520px;margin:30px auto;padding:34px;text-align:center"><div class="au-title" style="font-size:26px">No receipt yet</div><p class="muted" style="margin:8px 0 18px">Start a plan and press play. Every month you'll see exactly who your money paid.</p><a class="au-btn" href="#/listen/plans">Choose a plan</a></div>`}
  </div>`.s;
  on(el, 'click', '[data-share]', () => copyText(`${d.name}'s ${monthName(d.period)} on Audius: ${money(d.recordings)} to ${artists.length} artists I played. $0.00 to anyone I didn't.`, 'Copied. Paste it anywhere.'));
}, { auth: true, title: 'Your receipt' });

// ---------- the artist's side ----------
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
          ${d.signed ? '' : html`<div class="callout warn small">${ico('lock', 2)}<div>Get the split signed first, so everyone who owns the recording has agreed.</div></div>`}
          ${d.canManage ? html`<label class="check small"><input type="checkbox" data-ai ${d.ai ? 'checked' : ''}><span><b>Made with AI.</b> Declared AI songs are only heard by listeners who switch AI on, and earn a quarter of the rate. The rest goes to human artists.</span></label>` : ''}
          ${d.audio.length ? html`<div class="small muted">Streaming file: ${d.audio.find(a => a.hash === d.audio_hash) ? 'your latest master' : 'none chosen'}.</div>` : html`<div class="small muted">Upload a master in Workspace and it streams from there.</div>`}
        </div>
        <div class="grid grid-3">
          <div class="card pl-stat"><div class="v">${d.stats.listeners}</div><div class="l">Listeners this month</div></div>
          <div class="card pl-stat"><div class="v">${d.stats.minutes}</div><div class="l">Minutes played</div></div>
          <div class="card pl-stat"><div class="v" style="color:var(--money)">${money(d.stats.earned)}</div><div class="l">Paid in from Audius</div></div>
        </div></div>
        <div class="card card-pad small muted stack-sm"><b style="color:var(--fg)">How you're paid</b><span>Each listener's money goes only to the songs they play, by minutes. About 55% of a plan pays recordings, 15% songwriters (through the MLC and PROs), 30% Audius. No ads, ever.</span></div>
      </div>`.s;
      return d;
    };
    let d = await paint();
    on(el, 'click', '[data-live]', async (e, t) => { await busy(t, () => api.put(`/api/songs/${song.id}/audius`, { live: !d.live, ai: el.querySelector('[data-ai]')?.checked })); toast(d.live ? 'Taken off Audius' : 'Live on Audius'); d = await paint(); });
    on(el, 'change', '[data-ai]', async (e, t) => { if (d.live) { await api.put(`/api/songs/${song.id}/audius`, { live: true, ai: t.checked }); d = await paint(); } });
  }
});
