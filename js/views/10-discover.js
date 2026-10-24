// Discovery: search every song and artist, artist pages, claiming draft passports, claim review,
// and "I'm on this song" contributor requests.
import { app, shownTitle, html, raw, api, upload, shareLink, toast, modal, icon, on, busy, formData, money, date, ago, duration, statusBadge, art, artStyle, initials, esc, ring, infoTip, artUrl, artImg, uploadImage, creditLine } from '../app.js';

app.nav({ id: 'search', label: 'Find songs', href: '/search', icon: 'search', section: 'Passport', order: 2 });
app.nav({ id: 'claims', label: 'Claims', href: '/claims', icon: 'flag', section: 'Passport', order: 26, auth: true });
app.nav({ id: 'admin-claims', label: 'Claim review', href: '/admin/claims', icon: 'shield', section: 'Admin', order: 90, auth: true, admin: true });

// ---------- one-time styles ----------
if (!document.getElementById('dc-style')) {
  const st = document.createElement('style');
  st.id = 'dc-style';
  st.textContent = `
  .dc-scope svg { width: 18px; height: 18px; flex: none; }
  .dc-scope .empty .icon svg { width: 24px; height: 24px; }
  .dc-scope .dropzone svg { width: 28px; height: 28px; color: var(--accent); }
  .dc-scope .art.xl, .dc-scope .art.lg { flex: none; }
  .dc-hero { padding: 56px 48px 48px; overflow: visible !important; z-index: 5; }
  .dc-hero::after { border-radius: inherit; }
  .dc-hero h1 { font-size: clamp(2rem, 1.3rem + 2.8vw, 3.4rem); letter-spacing: -0.035em; max-width: 760px; position: relative; z-index: 1; }
  .dc-hero p.lede { font-size: 17px; color: rgba(255,255,255,.82); max-width: 600px; margin-top: 14px; position: relative; z-index: 1; }
  .dc-search { position: relative; max-width: 680px; margin-top: 28px; z-index: 2; }
  .dc-search input { width: 100%; padding: 18px 130px 18px 52px; font-size: 17px; border-radius: 99px; border: 0; background: #fff; color: #16161A; box-shadow: 0 8px 24px rgba(11,11,14,.18); outline: none; }
  .dc-search input::placeholder { color: #8a8a96; }
  .dc-search > svg { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); width: 21px; height: 21px; color: #6e6e78; }
  .dc-search .btn { position: absolute; right: 8px; top: 8px; bottom: 8px; }
  .dc-ta { position: absolute; left: 0; right: 0; top: calc(100% + 8px); background: var(--surface); color: var(--fg); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-lg); overflow: hidden; z-index: 40; }
  .dc-ta .muted { color: var(--muted) !important; }
  .dc-ta .eyebrow { color: var(--muted); }
  .dc-ta a { display: flex; align-items: center; gap: 12px; padding: 10px 14px; color: inherit; }
  .dc-ta a:hover, .dc-ta a.on { background: var(--surface-2); text-decoration: none; }
  .dc-ta .eyebrow { padding: 10px 14px 4px; }
  .dc-ta .art { width: 36px; height: 36px; border-radius: 9px; font-size: 12px; }
  .dc-ta .art.round { border-radius: 50%; }
  .dc-stats { display: flex; gap: 36px; margin-top: 34px; position: relative; z-index: 1; flex-wrap: wrap; }
  .dc-stats b { display: block; font: 800 26px var(--display); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
  .dc-stats span { color: rgba(255,255,255,.7); font-size: 13px; }
  .dc-steps { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; margin-top: 20px; }
  .dc-step { padding: 22px; }
  .dc-step .n { width: 30px; height: 30px; border-radius: 99px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; font-weight: 700; margin-bottom: 12px; }
  .dc-artists { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
  .dc-artist { padding: 18px; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; color: inherit; transition: transform .12s ease, box-shadow .15s ease; }
  a.dc-artist:hover { text-decoration: none; transform: translateY(-2px); box-shadow: var(--shadow); }
  .dc-artist .art { width: 88px; height: 88px; border-radius: 50%; font-size: 28px; }
  .dc-artist .nm { font-weight: 650; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dc-ahero { display: flex; gap: 28px; align-items: flex-end; flex-wrap: wrap; padding: 30px; background: radial-gradient(90% 140% at 0% 0%, color-mix(in srgb, var(--violet) 18%, transparent), transparent 60%); }
  .dc-ahero .art.xl { border-radius: 50%; }
  .dc-wedge { padding: 28px; display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 24px; align-items: center; }
  .dc-wedge .big { font: 800 clamp(1.5rem, 1.1rem + 1.6vw, 2.2rem)/1.15 var(--display); letter-spacing: -0.03em; }
  .dc-wedge .big em { font-style: normal; }
  .dc-bars { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; max-width: 520px; }
  .dc-bar { display: grid; grid-template-columns: 170px 1fr 70px; gap: 10px; align-items: center; font-size: 13px; }
  .dc-bar .progress > i { background: linear-gradient(90deg, #ff8a5b, #ff4d6d); }
  .dc-stepper { display: flex; gap: 0; margin: 4px 0 26px; counter-reset: s; }
  .dc-stepper > div { flex: 1; display: flex; align-items: center; gap: 10px; color: var(--muted); font-weight: 600; font-size: 13.5px; position: relative; padding-right: 12px; }
  .dc-stepper > div::after { content: ""; flex: 1; height: 2px; background: var(--line); border-radius: 2px; }
  .dc-stepper > div:last-child::after { display: none; }
  .dc-stepper .dot { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; border: 2px solid var(--line-strong); background: var(--surface); flex: none; font-size: 13px; }
  .dc-stepper .on { color: var(--fg); } .dc-stepper .on .dot { border-color: var(--accent); color: var(--accent); }
  .dc-stepper .done .dot { background: var(--accent); border-color: var(--accent); color: #fff; } .dc-stepper .done::after { background: var(--accent); }
  .dc-stepper .dot svg { width: 15px; height: 15px; }
  .dc-methods { display: grid; gap: 14px; }
  .dc-method { padding: 20px 22px; display: grid; grid-template-columns: 46px minmax(0,1fr); gap: 16px; align-items: start; border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--surface); }
  .dc-method.rec { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 8%, transparent); }
  .dc-method .ic { width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; background: var(--grad-soft); color: var(--accent); }
  .dc-method .ic svg { width: 22px; height: 22px; }
  .dc-method.off { opacity: .75; }
  .dc-result { text-align: center; padding: 40px 24px 30px; }
  .dc-result .badge-xl { width: 74px; height: 74px; border-radius: 24px; display: grid; place-items: center; margin: 0 auto 18px; }
  .dc-result .badge-xl svg { width: 34px; height: 34px; }
  .dc-result.ok .badge-xl { background: var(--ok-soft); color: var(--ok); }
  .dc-result.wait .badge-xl { background: var(--warn-soft); color: var(--warn); }
  .dc-result.no .badge-xl { background: var(--crit-soft); color: var(--crit); }
  .dc-ev { font-size: 13px; }
  .dc-ev td { padding: 8px 12px; }
  .dc-review { padding: 20px 22px; display: grid; grid-template-columns: minmax(0,1fr) 300px; gap: 20px; }
  .dc-roles { display: flex; flex-wrap: wrap; gap: 6px; }
  .dc-role:first-letter { text-transform: uppercase; }
  .dc-role { border: 1px solid var(--line-strong); background: var(--surface); padding: 6px 12px; border-radius: 99px; font-size: 13px; font-weight: 600; cursor: pointer; color: var(--fg-2); }
  .dc-role.on { background: var(--accent-soft); color: var(--accent); border-color: transparent; }
  .dc-isyou { display: flex; align-items: center; gap: 16px; padding: 18px 20px; }
  .dc-isyou .grow { flex: 1; min-width: 0; }
  @media (max-width: 560px) { .dc-isyou { flex-wrap: wrap; } .dc-isyou .btn { width: 100%; } }
  @media (max-width: 900px) { .dc-review { grid-template-columns: 1fr; } }
  @media (max-width: 720px) {
    .dc-hero { padding: 34px 20px 30px; }
    .dc-search input { padding: 15px 16px 15px 46px; font-size: 16px; }
    .dc-search .btn { display: none; }
    .dc-steps { grid-template-columns: 1fr; }
    .dc-stats { gap: 22px; }
    .dc-wedge { grid-template-columns: 1fr; padding: 22px; }
    .dc-bar { grid-template-columns: 120px 1fr 54px; }
    .dc-stepper > div span.lbl { display: none; }
    .dc-ahero { padding: 22px; gap: 18px; }
    .dc-ahero .art.xl { width: 120px; height: 120px; font-size: 38px; }
    .dc-artists { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .dc-songrow .hide-sm, .dc-hide-sm { display: none; }
  }`;
  document.head.appendChild(st);
}

const fmt = n => Number(n || 0).toLocaleString('en-US');
const draftBadge = status => status === 'draft' ? html`<span class="badge">Draft</span>` : status === 'claimed' ? html`<span class="badge info">Claimed</span>` : statusBadge(status);
const artistArt = (a, size = '') => html`<div class="art ${size}" style="${artStyle('artist:' + a.name)};border-radius:50%">${initials(a.name)}${artImg(a.image_url, size === 'lg' ? 250 : size === 'xl' ? 500 : 120)}</div>`;

// ---------- typeahead ----------
function typeahead(input, { onPick } = {}) {
  const box = document.createElement('div');
  box.className = 'dc-ta hidden';
  input.parentElement.appendChild(box);
  let timer, ctrl, items = [], on = -1;
  const close = () => { box.classList.add('hidden'); on = -1; };
  const paint = (r) => {
    items = [...r.artists.slice(0, 3).map(a => ({ href: `/artist/${a.id}`, a })), ...r.songs.slice(0, 5).map(s => ({ href: `/song/${s.id}`, s }))];
    if (!items.length) { box.innerHTML = html`<div class="small muted" style="padding:14px">No matches yet. Press Enter to search everything.</div>`.s; box.classList.remove('hidden'); return; }
    box.innerHTML = html`
      ${r.artists.length ? html`<div class="eyebrow">Artists</div>` : ''}
      ${items.filter(i => i.a).map((i) => html`<a href="#${i.href}" data-i="${items.indexOf(i)}">${artistArt(i.a)}<div style="flex:1;min-width:0"><div style="font-weight:600">${i.a.name}</div><div class="tiny muted">${fmt(i.a.song_count)} songs</div></div>${draftBadge(i.a.status)}</a>`)}
      ${r.songs.length ? html`<div class="eyebrow">Songs</div>` : ''}
      ${items.filter(i => i.s).map((i) => html`<a href="#${i.href}" data-i="${items.indexOf(i)}">${art(i.s.title + i.s.artist_credit, { url: i.s.artwork_url, label: i.s.title })}<div style="min-width:0;flex:1"><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.s.title}</div><div class="tiny muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${i.s.artist_credit}</div></div>${draftBadge(i.s.status)}</a>`)}`.s;
    box.classList.remove('hidden');
  };
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 2) return close();
    timer = setTimeout(async () => {
      ctrl?.abort(); ctrl = new AbortController();
      try { paint(await api(`/api/search?q=${encodeURIComponent(q)}&limit=5`, { signal: ctrl.signal })); } catch { /* aborted */ }
    }, 140);
  });
  input.addEventListener('keydown', e => {
    if (box.classList.contains('hidden') || !items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      on = (on + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      box.querySelectorAll('a').forEach(a => a.classList.toggle('on', +a.dataset.i === on));
    } else if (e.key === 'Enter' && on >= 0) { e.preventDefault(); const pick = items[on]; close(); app.go(pick.href); onPick?.(); }
    else if (e.key === 'Escape') close();
  });
  // Pressing a result must not blur the input first (that closed the box before a slow click landed).
  box.addEventListener('mousedown', e => e.preventDefault());
  box.addEventListener('click', e => {
    const a = e.target.closest('a[data-i]');
    if (!a) return;
    e.preventDefault(); const pick = items[+a.dataset.i]; close(); app.go(pick.href); onPick?.();
  });
  input.addEventListener('blur', () => setTimeout(close, 150));
}

// ---------- search ----------
app.route('/search', async ({ el, query }) => {
  const q = (query.get('q') || '').trim();
  const type = ['all', 'songs', 'artists'].includes(query.get('type')) ? query.get('type') : 'all';
  const top = document.querySelector('.topbar .search input');
  if (top) top.value = q;
  if (!q) return hero(el);

  const r = await api(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
  const norm = x => String(x || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  const isYou = r.artists.find(a => a.status === 'draft' && a.song_count > 1 && norm(a.name) === norm(q)) || null;
  const songsList = songs => songs.map(s => html`<div class="list-item dc-songrow">
      <a href="#/song/${s.id}" aria-label="${s.title}" tabindex="-1">${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title })}</a>
      <a class="grow" href="#/song/${s.id}" style="color:inherit;text-decoration:none"><div class="title">${shownTitle(s)}${s.version_title ? html` <span class="muted" style="font-weight:500">(${s.version_title})</span>` : ''}</div>
        <div class="sub">${s.artist_credit}${s.release_date ? ` · ${s.release_date.slice(0, 4)}` : ''}${s.duration_ms ? ` · ${duration(s.duration_ms)}` : ''}</div></a>
      ${s.isrc ? html`<span class="chip hide-sm">${s.isrc}</span>` : ''}
      ${s.status === 'draft' ? '' : draftBadge(s.status)}
      ${s.status === 'draft' ? html`<a class="btn btn-sm claim-btn" href="#/claim/song/${s.id}">${icon('flag')} Claim</a>` : ''}
    </div>`);
  el.innerHTML = html`<div class="dc-scope">
  <div class="page-head"><div><div class="eyebrow">Search</div><h1>Results for “${q}”</h1>
    <p class="lede">${r.code ? html`Looked up ${r.code.type} <span class="mono">${r.code.formatted}</span>.` : 'Every draft and passport, matched on title, artist and codes.'}</p></div>
    <div class="seg">${['all', 'songs', 'artists'].map(t => html`<button class="${t === type ? 'on' : ''}" data-type="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`)}</div></div>
  ${r.code && !r.code.valid ? html`<div class="callout warn" style="margin-bottom:18px">${icon('alert')}<div><b>That ${r.code.type} doesn't look valid.</b> ${r.code.errors[0] || ''}</div></div>` : ''}
  <div class="stack-lg">
    ${isYou ? html`<div class="card dc-isyou">${artistArt(isYou)}<div class="grow"><b style="font-size:17px">Is this you?</b>
        <div class="muted">${isYou.name} has ${fmt(isYou.song_count)} unclaimed song${isYou.song_count === 1 ? '' : 's'}. Claim them all in one go.</div></div>
        <a class="btn btn-primary" href="#/claim/artist/${isYou.id}">${icon('flag')} Claim all ${fmt(isYou.song_count)} songs</a></div>` : ''}
    ${r.artists.length ? html`<section class="stack"><h2 class="h3">Artists</h2><div class="dc-artists">${r.artists.map(a => html`<a class="card dc-artist" href="#/artist/${a.id}">
        ${artistArt(a)}<div class="nm">${a.name}</div><div class="tiny muted">${fmt(a.song_count)} songs${a.country ? ` · ${a.country}` : ''}</div>${draftBadge(a.status)}</a>`)}</div>
      ${type === 'artists' && r.next ? html`<div class="row" style="justify-content:center"><button class="btn" data-more="artists">Load more artists</button></div>` : ''}</section>` : ''}
    ${type !== 'artists' ? html`<section class="stack"><h2 class="h3">Songs</h2>
      ${r.songs.length ? html`<div class="card"><div class="list" id="songs">${songsList(r.songs)}</div></div>
        ${r.next ? html`<div class="row" style="justify-content:center"><button class="btn" data-more="songs">Load more songs</button></div>` : ''}`
      : html`<div class="card"><div class="empty"><div class="icon">${icon('music')}</div><h2 class="h3">No songs match “${q}”</h2>
        <p>Try the artist name on its own, or paste an ISRC, ISWC or UPC. Not here at all? Start a passport for it.</p>
        <div class="row" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="#/songs/new">${icon('plus')} New passport</a></div></div></div>`}
    </section>` : ''}
    ${type === 'artists' && !r.artists.length ? html`<div class="card"><div class="empty"><div class="icon">${icon('user')}</div><h2 class="h3">No artists match “${q}”</h2><p>Try a shorter spelling, or look through songs instead.</p>
      <div class="row" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="#/search?q=${encodeURIComponent(q)}&type=songs">${icon('music')} Search songs</a></div></div></div>` : ''}
    <p class="tiny faint">${r.approximate ? 'Many matches: showing the best of the first thousand, then the rest in catalog order. ' : ''}Searched in ${Math.max(1, Math.round(r.ms))} ms.</p>
  </div></div>`.s;

  let next = r.next;
  on(el, 'click', '[data-type]', (e, b) => app.go(`/search?q=${encodeURIComponent(q)}&type=${b.dataset.type}`));
  on(el, 'click', '[data-more]', async (e, b) => {
    const kind = b.dataset.more;
    const more = await busy(b, () => api(`/api/search?q=${encodeURIComponent(q)}&type=${kind}&cursor=${encodeURIComponent(next)}`));
    next = more.next;
    if (kind === 'songs') el.querySelector('#songs').insertAdjacentHTML('beforeend', html`${songsList(more.songs)}`.s);
    else el.querySelector('.dc-artists').insertAdjacentHTML('beforeend', html`${more.artists.map(a => html`<a class="card dc-artist" href="#/artist/${a.id}">${artistArt(a)}<div class="nm">${a.name}</div><div class="tiny muted">${fmt(a.song_count)} songs</div>${draftBadge(a.status)}</a>`)}`.s);
    if (!next) b.remove();
  });
}, { title: 'Find songs' });

function hero(el) {
  const st = app.meta?.stats || {};
  el.innerHTML = html`<div class="dc-scope">
  <div class="card hero dc-hero">
    <div class="eyebrow" style="color:rgba(255,255,255,.92);position:relative;z-index:1">Find your songs</div>
    <h1 style="margin-top:10px">Your songs are already here. Claim them.</h1>
    <p class="lede">We built a draft passport for every song we could find. Search your artist name, a song title or an ISRC, then prove it's you in a couple of minutes.</p>
    <form class="dc-search" id="hs" autocomplete="off">${icon('search')}
      <input name="q" placeholder="Artist, song title or ISRC" aria-label="Search songs and artists" autofocus>
      <button class="btn btn-primary">Search</button></form>
    <div class="dc-stats">
      <div><b>${fmt(st.songs)}</b><span>songs with a passport</span></div>
      <div><b>${fmt(st.artists)}</b><span>artists</span></div>
      <div><b>${fmt(st.claimed)}</b><span>claimed so far</span></div>
    </div>
  </div>
  <div class="dc-steps">
    ${[['Search', 'Find your artist page or any song you are on. Drafts are built from open music data.', 'Search now'],
       ['Prove it is you', 'Log in with Audius, upload a statement from your distributor, or send links for a quick review.', 'How proving works'],
       ['See what is missing', 'Every claimed song gets a health check: missing codes, unsigned splits and registrations that cost you money.', null]]
      .map(([t, d, cta], i) => html`<div class="card dc-step"><div class="n">${i + 1}</div><h2 class="h3">${t}</h2><p class="muted small" style="margin-top:6px">${d}</p>
        ${cta ? html`<button class="btn btn-sm" style="margin-top:12px" data-step="${i + 1}">${cta}</button>` : ''}</div>`)}
  </div></div>`.s;
  const input = el.querySelector('#hs input');
  typeahead(input);
  el.querySelector('#hs').addEventListener('submit', e => { e.preventDefault(); const q = input.value.trim(); if (q) app.go(`/search?q=${encodeURIComponent(q)}`); });
  on(el, 'click', '[data-step="1"]', () => { el.querySelector('.dc-hero').scrollIntoView({ behavior: 'smooth' }); input.focus(); });
  on(el, 'click', '[data-step="2"]', () => modal({
    title: 'How proving it is you works',
    body: html`<div class="stack small">
      <p><b>Log in with Audius.</b> If your Audius account is linked to the artist, you're verified straight away.</p>
      <p><b>Upload a distributor statement.</b> A royalty statement from DistroKid, TuneCore, CD Baby and the like. When enough ISRCs and titles match, the claim is approved automatically.</p>
      <p><b>Send links.</b> Your socials, website or a press page. Someone reviews them.</p>
      <p class="muted">Find your song or artist first, then press Claim to start.</p></div>`,
    actions: [{ label: 'Got it', primary: true }]
  }));
  setTimeout(() => input.focus(), 50);
}

// ---------- artist page ----------
app.route('/artist/:id', async ({ el, params, query, user }) => {
  const d = await api(`/api/artists/${encodeURIComponent(params.id)}`);
  const a = d.artist, draft = a.status === 'draft';
  const [first, cr] = await Promise.all([api(`/api/artists/${a.id}/songs?limit=50`), api(`/api/artists/${a.id}/credits?limit=50`).catch(() => null)]);
  // Anyone with a name gets this page: a solo artist, a producer, a writer, a mastering engineer. Credits come from
  // public data and are never a split; claiming the name links every credited song to the person's account.
  const credits = cr?.total || 0;
  const crew = credits > 0 && !d.counts.songs;
  const kindLabel = crew ? cr.roles.slice().sort((x, y) => y.n - x.n)[0].label : 'Artist';
  const creditRow = s => html`<a class="list-item" href="#/song/${s.id}">${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title })}
    <div class="grow"><div class="title">${shownTitle(s)}${s.version_title ? html` <span class="muted" style="font-weight:500">(${s.version_title})</span>` : ''}</div>
    <div class="sub">${s.artist_credit}${s.release_date ? ` · ${s.release_date.slice(0, 4)}` : ''}</div></div>
    <span class="small muted dc-hide-sm" style="text-align:right">${s.roles.map(r => cr.roles.find(x => x.role === r)?.label || r).join(', ')}</span>
    ${draftBadge(s.status)}</a>`;
  const creditsCard = credits ? html`<div class="card" id="credits" style="margin-bottom:20px">
    <div class="card-head"><div><h2 class="h3">Songs ${d.isMine ? 'you’re' : `${a.name} is`} credited on</h2><div class="small muted" style="white-space:normal">From public credits (MusicBrainz). A credit isn’t a split${d.isMine ? ': open a song to ask to be added' : ''}.</div></div><span class="muted small">${fmt(credits)}</span></div>
    <div class="row wrap" style="padding:0 18px 12px;gap:6px"><button class="fchip on" data-role="">All</button>${cr.roles.map(r => html`<button class="fchip" data-role="${r.role}">${r.label} <span class="faint">${fmt(r.n)}</span></button>`)}</div>
    <div class="list" id="credit-list">${cr.items.map(creditRow)}</div>
    ${cr.next ? html`<div class="row" style="justify-content:center;padding:16px"><button class="btn" data-act="more-credits">Load more</button></div>` : ''}</div>` : '';
  const songRow = s => html`<a class="list-item" href="#/song/${s.id}">${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title })}
    <div class="grow"><div class="title">${shownTitle(s)}${s.version_title ? html` <span class="muted" style="font-weight:500">(${s.version_title})</span>` : ''}</div>
    <div class="sub">${[s.release_title, s.release_date?.slice(0, 4), duration(s.duration_ms)].filter(Boolean).join(' · ') || s.artist_credit}</div></div>
    ${s.isrc ? '' : html`<span class="sdot check" role="img" aria-label="No ISRC" title="No ISRC"></span>`}
    ${s.status === 'draft' ? '' : draftBadge(s.status)}</a>`;
  const heroArt = a.banner_url || a.image_url || first.items.find(s => s.artwork_url)?.artwork_url;
  el.innerHTML = html`<div class="dc-scope">
  <div class="card" style="overflow:hidden;margin-bottom:24px">
    <div class="dc-ahero" ${heroArt ? raw(`style="--hero-art:url('${esc(artUrl(heroArt, 250))}')"`) : ''}>
      ${a.image_url || d.isMine ? html`<button class="photo-btn" data-act="photo" aria-label="${a.image_url ? 'Photo credit' : 'Add a photo'}">${artistArt(a, 'xl')}${d.isMine && !a.image_url ? html`<span class="photo-add">${icon('plus')}</span>` : ''}</button>` : artistArt(a, 'xl')}
      <div class="stack-sm" style="flex:1;min-width:220px">
        <div class="row wrap"><span class="eyebrow">${kindLabel}</span>${draft ? html`<span class="badge">Unclaimed draft</span>` : html`<span class="badge info">Claimed</span>`}
          ${a.on_audius ? html`<span class="badge plain">${icon('audius')} On Audius</span>` : ''}</div>
        <h1>${a.name}</h1>
        <div class="muted">${[a.disambiguation, a.country, a.kind].filter(Boolean).join(' · ')}</div>
        <div class="row wrap" style="gap:22px;margin-top:8px">
          ${d.counts.songs || !credits ? html`<div><b class="num" style="font-size:20px">${fmt(d.counts.songs)}</b> <span class="muted small">songs</span></div>` : ''}
          ${credits ? html`<div><b class="num" style="font-size:20px">${fmt(credits)}</b> <span class="muted small">credits</span></div>` : ''}
          ${d.counts.claimedSongs ? html`<div><b class="num" style="font-size:20px">${fmt(d.counts.claimedSongs)}</b> <span class="muted small">claimed one by one</span></div>` : ''}
          ${a.isni ? html`<div class="small muted">ISNI <span class="mono">${a.isni}</span></div>` : ''}
        </div>
      </div>
      <div class="row wrap">
        ${draft && !d.isMine && !d.myClaim?.status?.match(/pending/) ? html`<a class="btn btn-primary btn-lg" href="#/claim/artist/${a.id}">${icon('flag')} ${crew ? 'This is me' : 'Claim this artist'}</a>` : ''}
        ${d.isMine ? html`<a class="btn btn-primary" href="#/gaps">${icon('scan')} Money check</a>` : ''}
        <button class="btn" data-act="share">${icon('link')} Share</button>
      </div>
    </div>
    ${d.isMine && d.myClaim?.verification === 'provisional' ? html`<div class="callout info" style="border-radius:0">${icon('key')}<div><b>You manage this artist.</b> One more step to verify it and unlock payouts. <a href="#/claims/${d.myClaim.id}">Finish verifying</a></div></div>`
      : d.myClaim?.status === 'pending' ? html`<div class="callout warn" style="border-radius:0">${icon('clock')}<div>Your claim is being reviewed. <a href="#/claims/${d.myClaim.id}">See its status</a></div></div>`
      : d.isMine ? html`<div class="callout ok" style="border-radius:0">${icon('shield')}<div><b>This is your page.</b> ${crew ? 'Every song you’re credited on is linked to your account.' : 'Every song here is yours to manage.'}</div></div>`
      : !draft ? html`<div class="callout" style="border-radius:0">${icon('shield')}<div>Verified owner${a.owner_name ? html`: <b>${a.owner_name}</b>` : ''}. Claimed ${date(a.claimed_at)}. Think this is wrong? <a href="#/claim/artist/${a.id}">Dispute the claim</a></div></div>`
      : d.counts.openClaims ? html`<div class="callout info" style="border-radius:0">${icon('info')}<div>Someone has asked to claim this artist and it is being reviewed. If it's you, claim it too and we'll sort it out.</div></div>` : ''}
  </div>
  ${crew ? creditsCard : ''}
  ${draft && !crew ? html`<div class="card" id="wedge" style="margin-bottom:20px"><div class="dc-wedge"><div class="stack-sm"><div class="skeleton" style="height:34px;width:70%"></div><div class="skeleton" style="height:16px;width:50%"></div></div></div></div>` : ''}
  ${crew ? '' : html`<div class="card" style="margin-bottom:20px">
    <div class="card-head"><h2 class="h3">Songs</h2><span class="muted small">${fmt(d.counts.songs)}</span></div>
    ${first.items.length ? html`<div class="list" id="songs">${first.items.map(songRow)}</div>` : html`<div class="empty"><div class="icon">${icon('music')}</div><h2 class="h3">No songs yet</h2><p>Songs linked to this artist will show up here.</p></div>`}
    ${first.next ? html`<div class="row" style="justify-content:center;padding:16px"><button class="btn" data-act="more">Load more</button></div>` : ''}
  </div>`}
  ${crew ? '' : creditsCard}</div>`.s;

  let role = '', ccur = cr?.next;
  const loadCredits = async (append, b) => {
    const r = await busy(b, () => api(`/api/artists/${a.id}/credits?limit=50${role ? `&role=${role}` : ''}${append ? `&cursor=${ccur}` : ''}`));
    const list = el.querySelector('#credit-list');
    if (append) list.insertAdjacentHTML('beforeend', html`${r.items.map(creditRow)}`.s); else list.innerHTML = html`${r.items.map(creditRow)}`.s;
    ccur = r.next;
    const more = el.querySelector('[data-act=more-credits]');
    if (more) more.parentElement.hidden = !ccur;
  };
  on(el, 'click', '[data-role]', (e, b) => {
    role = b.dataset.role; el.querySelectorAll('#credits [data-role]').forEach(x => x.classList.toggle('on', x === b)); loadCredits(false);
  });
  on(el, 'click', '[data-act=more-credits]', (e, b) => loadCredits(true, b));
  // The photo: tap for who took it and its licence; the artist can change it.
  on(el, 'click', '[data-act=photo]', () => {
    const c = a.image_credit;
    const pick = () => new Promise(res => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = () => res(f.files[0]); f.click(); });
    const change = async () => {
      const file = await pick(); if (!file) return;
      try { await uploadImage('artist', a.id, file); toast('Photo updated'); app.refresh(); } catch (e) { toast(e.message, { error: true }); }
    };
    if (!a.image_url) return change();
    modal({
      title: c?.source === 'upload' ? 'Your photo' : 'Photo credit',
      body: html`<p>${creditLine(c) || 'From public data'}</p>${c?.url ? html`<p><a href="${c.url}" target="_blank" rel="noopener">See the original</a></p>` : ''}`,
      actions: d.isMine ? [{ label: 'Close' }, ...(c?.source === 'upload' ? [{ label: 'Remove', value: 'remove' }] : []), { label: 'Upload a photo', primary: true, value: 'upload' }] : [{ label: 'Close' }]
    }).then(async v => {
      if (v === 'upload') return change();
      if (v === 'remove') { await api(`/api/images/artist/${a.id}`, { method: 'DELETE' }); toast('Photo removed'); app.refresh(); }
    });
  });
  if (query.get('tab') === 'credits') el.querySelector('#credits')?.scrollIntoView({ block: 'start' });

  let cursor = first.next;
  on(el, 'click', '[data-act=more]', async (e, b) => {
    const r = await busy(b, () => api(`/api/artists/${a.id}/songs?limit=50&cursor=${cursor}`));
    el.querySelector('#songs').insertAdjacentHTML('beforeend', html`${r.items.map(songRow)}`.s);
    cursor = r.next; if (!cursor) b.parentElement.remove();
  });
  on(el, 'click', '[data-act=share]', () => shareLink(`${location.origin}/#/artist/${a.id}`, { title: a.name, label: 'Artist link' }));

  if (draft && !crew) {
    const w = el.querySelector('#wedge');
    try {
      const g = await api(`/api/artists/${a.id}/gaps`);
      const pctOf = n => g.total ? Math.round(n / g.total * 100) : 0;
      const about = g.exact ? '' : 'about ';
      const bar = (label, n) => n ? html`<div class="dc-bar"><span class="muted">${label}</span><div class="progress"><i style="width:${pctOf(n)}%"></i></div><b class="num small" style="text-align:right">${fmt(n)}</b></div>` : '';
      const how = [g.teaser ? 'Claim and verify the artist to see exactly what is missing on each song and how much it is worth.' : 'Missing or broken codes are the most common reason royalties go unmatched.', ...(g.assumptions?.lines || []), g.exact ? '' : `Checked a sample of ${fmt(g.sampled)} songs and scaled up.`].filter(Boolean).join(' ');
      w.innerHTML = html`<div class="dc-wedge">
        <div class="wedge-main">
          ${ring(g.flagged || 0, g.total || 0, { size: 104, label: 'songs may be missing money' })}
          <div class="stack-sm" style="min-width:0">
            <div class="eyebrow" style="display:flex;align-items:center;gap:6px">Money check ${infoTip(how, 'How we estimate this')}</div>
            <div class="wedge-big">${g.flagged ? `${about}${fmt(g.flagged)} of ${fmt(g.total)} songs may be missing money` : 'The codes on these songs look healthy'}</div>
            ${g.atRiskMinor && !g.teaser ? html`<div class="wedge-money"><b>${money(g.atRiskMinor)}</b><span class="quiet"> a year, estimated</span></div>` : ''}
            ${g.teaser ? '' : html`<div class="dc-bars">${bar('No ISRC', g.missingIsrc)}${bar('Broken ISRC', g.invalidIsrc)}${bar('ISRC used twice', g.duplicateIsrc)}${bar('No ISWC', g.missingIswc)}${bar('Broken ISWC', g.invalidIswc)}</div>`}
          </div>
        </div>
        <div class="stack" style="align-items:stretch;min-width:220px">
          ${d.isMine ? html`<a class="btn btn-primary btn-lg" href="#/claims/${d.myClaim?.id}">${icon('key')} Finish verifying</a>` : html`<a class="btn btn-lg" href="#/claim/artist/${a.id}">${icon('flag')} Claim ${a.name}</a>`}
          <span class="small quiet" style="text-align:center">Free · about two minutes</span>
        </div></div>`.s;
    } catch { w.remove(); }
  }
}, { title: 'Artist' });

// ---------- claim flow ----------
const stepper = (step) => html`<div class="dc-stepper">${['Confirm', 'Verify', 'Done'].map((l, i) => html`<div class="${i < step ? 'done' : i === step ? 'on' : ''}"><span class="dot">${i < step ? icon('check') : i + 1}</span><span class="lbl">${l}</span></div>`)}</div>`;

app.route('/claim/:kind/:id', async ({ el, params, query, user }) => {
  if (!['artist', 'song'].includes(params.kind)) return app.go('/404');
  const m = await api(`/api/claims/methods?kind=${params.kind}&id=${encodeURIComponent(params.id)}`);
  if (m.provisional && !query.get('audius_error')) return app.go(`/claims/${m.provisional.id}`);
  const t = m.target, isArtist = m.kind === 'artist';
  // A producer, writer or engineer: a name with credits but no songs of its own. Same claim, their own words.
  const crew = isArtist && !t.song_count && t.credit_count > 0;
  const label = isArtist ? t.name : t.title;
  const back = isArtist ? `#/artist/${t.id}` : `#/song/${t.id}`;
  let step = query.get('audius_error') ? 1 : 0, role = 'artist', scope = 'song';
  let myName = isArtist ? t.name : t.artist_credit || '';
  // A song by an unclaimed artist with other songs: offer to claim them all at once.
  const whole = !isArtist && t.artist_id ? await api(`/api/artists/${encodeURIComponent(t.artist_id)}`).then(d => d.artist.status === 'draft' && d.artist.song_count > 1 ? d.artist : null).catch(() => null) : null;
  if (query.get('audius_error')) toast(query.get('audius_error'), { error: true, ms: 6000 });

  const summary = html`<div class="row" style="gap:16px">
    ${isArtist ? artistArt({ name: t.name, image_url: t.image_url }, 'lg') : art(t.title + t.artist_credit, { url: t.artwork_url, size: 'lg', label: t.title })}
    <div class="stack-sm" style="min-width:0"><div class="row wrap">${draftBadge(t.status)}<span class="eyebrow">${crew ? 'Credited name' : isArtist ? 'Artist' : 'Song'}</span></div>
      <h2 style="font-size:1.6rem">${label}</h2>
      <div class="muted">${isArtist ? html`${crew ? `Credited on ${fmt(t.credit_count)} songs` : `${fmt(t.song_count)} songs`}${t.country ? ` · ${t.country}` : ''}${t.disambiguation ? ` · ${t.disambiguation}` : ''}` : html`${t.artist_credit}${t.isrc ? html` · <span class="mono">${t.isrc}</span>` : ''}${t.release_date ? ` · ${t.release_date.slice(0, 4)}` : ''}`}</div></div></div>`;

  const paint = () => {
    if (m.mine) {
      el.innerHTML = html`<div class="dc-scope"><div style="max-width:760px;margin:0 auto"><div class="card dc-result ok"><div class="badge-xl">${icon('check')}</div><h2>This is already yours</h2>
        <p class="muted" style="margin-top:8px">You manage ${label}.</p><div class="row" style="justify-content:center;margin-top:18px"><a class="btn btn-primary" href="${back}">Open it</a></div></div></div></div>`.s;
      return;
    }
    el.innerHTML = html`<div class="dc-scope"><div style="max-width:820px;margin:0 auto">
      <a href="${back}" class="small muted row" style="gap:6px;margin-bottom:14px">${icon('back')} Back</a>
      <h1 style="margin-bottom:18px">Claim ${label}</h1>
      ${stepper(step)}
      ${m.myClaim?.status === 'pending' ? html`<div class="callout warn" style="margin-bottom:16px">${icon('clock')}<div>You already have a claim under review. Adding proof here strengthens it. <a href="#/claims/${m.myClaim.id}">See your claim</a></div></div>` : ''}
      ${m.owned && !m.draft ? html`<div class="callout warn" style="margin-bottom:16px">${icon('alert')}<div><b>This ${m.kind} is already claimed.</b> If that's a mistake, continue and our team will review both claims. Nothing changes until then.</div></div>` : ''}
      <div id="stepbody"></div></div></div>`.s;
    const body = el.querySelector('#stepbody');
    if (step === 0) {
      body.innerHTML = html`<div class="card card-pad stack-lg">${summary}
        <div class="field"><span>How are you connected to ${crew ? 'this name' : isArtist ? 'this artist' : 'this song'}?</span>
          <div class="dc-roles" id="roles">${(isArtist ? ['artist', 'manager', 'label'] : ['artist', 'producer', 'writer', 'label', 'publisher']).map(r => html`<button type="button" class="dc-role ${r === role ? 'on' : ''}" data-role="${r}">${r === 'artist' ? (crew ? 'This is me' : "I'm the artist") : r}</button>`)}</div></div>
        ${crew ? html`<p class="small muted" style="white-space:normal">Claiming your name links every song you're credited on to your account. It doesn't put you on anyone's split: from each song you can ask the owner to add you.</p>` : ''}
        ${!isArtist && whole ? html`<div class="field"><span>Which songs?</span><div class="dc-roles">
          <button type="button" class="dc-role on" data-scope="song">Just ${label}</button>
          <button type="button" class="dc-role" data-scope="artist">All ${fmt(whole.song_count)} ${whole.name} songs</button></div></div>` : ''}
        ${!user?.name ? html`<label class="field"><span>Your name <span class="hint">as it should appear on split sheets and certificates</span></span>
          <input class="input" id="myname" autocomplete="name" value="${myName}" placeholder="Artist or legal name"></label>` : ''}
        <label class="check"><input type="checkbox" id="agree"><span>${crew ? `I am ${label}, or I represent them.` : `I have the right to manage ${label}${isArtist ? ' and its songs' : ''}.`} I understand false claims are removed and the account may be closed.</span></label>
        <div class="row end"><a class="btn btn-ghost" href="${back}">Cancel</a><button class="btn btn-primary" id="next" disabled>Continue ${icon('arrow')}</button></div></div>`.s;
      on(body, 'click', '[data-role]', (e, b) => { role = b.dataset.role; body.querySelectorAll('[data-role]').forEach(x => x.classList.toggle('on', x === b)); });
      on(body, 'click', '[data-scope]', (e, b) => { scope = b.dataset.scope; body.querySelectorAll('[data-scope]').forEach(x => x.classList.toggle('on', x === b)); });
      body.querySelector('#myname')?.addEventListener('input', e => { myName = e.target.value; });
      body.querySelector('#agree').addEventListener('change', e => { body.querySelector('#next').disabled = !e.target.checked; });
      body.querySelector('#next').addEventListener('click', async e => {
        if (body.querySelector('#myname') && myName.trim()) await busy(e.currentTarget, () => api.patch('/api/me', { name: myName.trim() })).catch(() => {});   // saved now; the sidebar picks it up on the next page
        if (scope === 'artist') return app.go(`/claim/artist/${whole.id}`);
        step = 1; paint();
      });
      return;
    }
    const au = m.methods.audius;
    body.innerHTML = html`<div class="stack">
      <p class="muted">Show us it's really you. ${au.configured ? 'The first two approve you instantly.' : 'A distributor statement approves you instantly.'}</p>
      <div class="dc-methods">
        ${au.configured ? html`<div class="dc-method rec">
          <div class="ic">${icon('audius')}</div>
          <div class="stack-sm"><div class="row wrap"><h2 class="h3">Log in with Audius</h2>${au.configured && au.linked ? html`<span class="badge ok plain">Instant</span>` : ''}</div>
            <p class="muted small">${au.linked ? `This ${m.kind} is linked to an Audius account. Sign in with that account and you're approved straight away.` : `Sign in with your Audius account. It isn't linked to this ${m.kind} yet, so a person will check it.`}</p>
            <div><button class="btn btn-dark" data-act="audius">${icon('audius')} Continue with Audius</button></div></div>
        </div>` : ''}
        <div class="dc-method ${au.configured ? '' : 'rec'}">
          <div class="ic">${icon('receipt')}</div>
          <div class="stack-sm"><div class="row wrap"><h2 class="h3">Upload a distributor statement</h2><span class="badge ok plain">Instant</span></div>
            <p class="muted small">Export a royalty or sales report (CSV or TSV) from DistroKid, TuneCore, CD Baby, Amuse, UnitedMasters or any distributor. When enough ISRCs and titles match ${crew ? `songs ${label} is credited on` : isArtist ? `${label}'s songs` : 'this song'}, you're approved automatically.</p>
            <label class="dropzone" id="dz" style="padding:20px"><input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" class="sr-only" id="file">
              ${icon('upload')}<div style="margin-top:6px"><b>Drop your statement here</b> or click to choose</div><div class="tiny">We only read ISRCs, titles and artist names. The file is kept privately as evidence.</div></label></div>
        </div>
        <div class="dc-method">
          <div class="ic">${icon('link')}</div>
          <div class="stack-sm"><h2 class="h3">Send links for review</h2>
            <p class="muted small">Official website, socials, distributor or label page, or an official email address. Our team reviews claims within two working days.</p>
            <form class="stack" id="ev">
              <label class="field"><span>Links <span class="hint">one per line</span></span><textarea class="input" name="links" rows="3" placeholder="https://instagram.com/yourname&#10;https://yourname.com"></textarea></label>
              <div class="form-grid"><label class="field"><span>Official email <span class="hint">optional</span></span><input class="input" type="email" name="official_email" placeholder="management@yourname.com"></label>
              <label class="field"><span>Anything else? <span class="hint">optional</span></span><input class="input" name="note" placeholder="e.g. I'm the manager, contract available"></label></div>
              <div><button class="btn">${icon('flag')} Send for review</button></div></form></div>
        </div>
      </div>
      <div class="row"><button class="btn btn-ghost" data-act="back">${icon('back')} Back</button></div></div>`.s;
    on(body, 'click', '[data-act=back]', () => { step = 0; paint(); });
    on(body, 'click', '[data-act=audius]', async (e, b) => {
      const r = await busy(b, () => api.post('/api/claims/audius/start', { kind: m.kind, id: t.id }));
      location.href = r.url;
    });
    const dz = body.querySelector('#dz'), file = body.querySelector('#file');
    const send = async f => {
      if (!f) return;
      dz.innerHTML = html`<div class="stack-sm" style="align-items:center"><b>Reading ${f.name}…</b><div class="progress" style="width:220px"><i style="width:0%" id="pr"></i></div></div>`.s;
      try {
        const r = await upload(`/api/claims/statement?kind=${m.kind}&id=${encodeURIComponent(t.id)}`, f, { onProgress: p => { const pr = body.querySelector('#pr'); if (pr) pr.style.width = `${Math.round(p * 100)}%`; } });
        done(r.claim);
      } catch (err) { toast(err.message, { error: true, ms: 6000 }); paint(); }
    };
    file.addEventListener('change', () => send(file.files[0]));
    dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
    dz.addEventListener('dragleave', () => dz.classList.remove('over'));
    dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); send(e.dataTransfer.files[0]); });
    body.querySelector('#ev').addEventListener('submit', async e => {
      e.preventDefault();
      const f = formData(e.target);
      const r = await busy(e.submitter, () => api.post('/api/claims', { kind: m.kind, id: t.id, role, links: f.links.split(/\s+/).filter(Boolean), official_email: f.official_email, note: f.note }));
      done(r.claim);
    });
  };
  const done = c => { app.reloadMe(); app.go(`/claims/${c.id}`); };
  paint();
}, { auth: true, title: 'Claim' });

// Result of a claim (also where Audius sends people back to).
function claimResult(c) {
  const isArtist = c.kind === 'artist';
  const label = isArtist ? c.artist_name : c.song_title;
  const href = isArtist ? `#/artist/${c.artist_id}` : `#/song/${c.song_id}`;
  const m = c.match;
  const songsClaimed = m?.songsClaimed;
  const head = c.status === 'approved' && c.verification === 'provisional' ? oneMoreStep(c, label, href)
    : c.status === 'approved'
    ? html`<div class="dc-result ok"><div class="badge-xl">${icon('check')}</div><h2>Verified. ${label} is yours.</h2>
        <p class="muted" style="margin-top:8px">${isArtist && songsClaimed ? `${fmt(songsClaimed)} song passport${songsClaimed === 1 ? ' is' : 's are'} now in your name. ` : ''}${c.auto ? `Approved automatically by ${methodName(c.method)}.` : 'Approved by our team.'}</p>
        <div class="row wrap" style="justify-content:center;margin-top:20px">${isArtist && songsClaimed === 0 ? html`<a class="btn btn-primary" href="#/artist/${c.artist_id}?tab=credits">${icon('users')} See songs you're credited on</a>` : html`<a class="btn btn-primary" href="${isArtist ? '#/songs' : `#/song/${c.song_id}?tab=splits`}">${icon('sign')} ${isArtist ? 'Pick a song to split' : 'Set the split'}</a>`}<a class="btn" href="#/gaps">${icon('scan')} Run the money check</a></div></div>`
    : c.status === 'pending'
      ? html`<div class="dc-result wait"><div class="badge-xl">${icon('clock')}</div><h2>Thanks. We're checking it.</h2>
        <p class="muted" style="margin-top:8px;max-width:520px;margin-inline:auto">${m?.reason ? m.reason + ' ' : ''}Our team reviews claims within two working days. We'll email you as soon as it's decided.</p>
        <div class="row wrap" style="justify-content:center;margin-top:20px"><a class="btn" href="#/claim/${c.kind}/${isArtist ? c.artist_id : c.song_id}">Add more proof</a><a class="btn btn-ghost" href="${href}">Back to ${label}</a></div></div>`
      : html`<div class="dc-result no"><div class="badge-xl">${icon(c.status === 'withdrawn' ? 'x' : 'alert')}</div><h2>${c.status === 'withdrawn' ? 'You withdrew this claim' : c.status === 'revoked' ? 'Another account verified this' : "We couldn't verify this claim"}</h2>
        ${c.review_note ? html`<p class="muted" style="margin-top:8px">Reviewer note: ${c.review_note}</p>` : ''}
        <div class="row" style="justify-content:center;margin-top:20px"><a class="btn btn-primary" href="#/claim/${c.kind}/${isArtist ? c.artist_id : c.song_id}">Try another way</a></div></div>`;
  return html`<div class="card">${head}</div>${evidenceCard(c)}`;
}
// Provisional claims: manage rights now, payouts and the verified badge after a second signal.
function oneMoreStep(c, label, href) {
  const isArtist = c.kind === 'artist';
  const confirmUrl = `${location.origin}/#/claims/${c.id}/confirm`;
  const songs = c.match?.songsClaimed;
  const head = html`<div class="dc-result wait" style="padding-bottom:10px"><div class="badge-xl">${icon('key')}</div>
    <h2>You can manage ${label} now. One more step to verify.</h2>
    <p class="muted" style="margin-top:8px;max-width:600px;margin-inline:auto">Your statement matched${isArtist && songs ? `, so ${fmt(songs)} passport${songs === 1 ? ' is' : 's are'} in your hands` : ''}. You can edit details, invite contributors and send splits. Payouts and the verified badge unlock once one more thing confirms it's you.</p>
    <div class="row wrap" style="justify-content:center;margin-top:18px">${isArtist && songs === 0 ? html`<a class="btn btn-primary" href="#/artist/${c.artist_id}?tab=credits">${icon('users')} See songs you're credited on</a>` : html`<a class="btn btn-primary" href="${isArtist ? '#/songs' : `#/song/${c.song_id}?tab=splits`}">${icon('sign')} ${isArtist ? 'Pick a song to split' : 'Set the split now'}</a>`}</div>
    <p class="small muted" style="margin-top:18px">To finish verifying:</p></div>`;
  // The quickest way first; the others fold away under "Other ways to verify".
  const ways = [
    app.meta?.audius ? html`<div class="dc-method rec"><div class="ic">${icon('audius')}</div><div class="stack-sm"><h2 class="h3">Log in with Audius</h2>
      <p class="muted small">If ${isArtist ? 'this artist' : 'this song'} is on Audius, signing in with that account verifies you instantly.</p>
      <div><button class="btn btn-dark btn-sm" data-act="audius" data-kind="${c.kind}" data-id="${isArtist ? c.artist_id : c.song_id}">${icon('audius')} Continue with Audius</button></div></div></div>` : null,
    html`<div class="dc-method"><div class="ic">${icon('users')}</div><div class="stack-sm"><h2 class="h3">Ask a collaborator to confirm</h2>
      <p class="muted small">A co-writer, producer or label who was already on one of these songs can confirm with one click. Send them this link:</p>
      <div class="row wrap"><span class="chip" style="overflow-wrap:anywhere;max-width:100%">${confirmUrl}</span><button class="btn btn-sm" data-act="copy" data-url="${confirmUrl}">${icon('copy')} Copy</button></div></div></div>`,
    html`<div class="dc-method"><div class="ic">${icon('bank')}</div><div class="stack-sm"><h2 class="h3">Money arrives through your distributor</h2>
      <p class="muted small">When your label or distributor imports a paid statement for these songs into the wallet, you're verified automatically.</p>
      <div><button class="btn btn-sm btn-ghost" data-act="recheck">Check again</button></div></div></div>`,
    html`<div class="dc-method"><div class="ic">${icon('shield')}</div><div class="stack-sm"><h2 class="h3">Ask our team</h2>
      <p class="muted small">${c.review_requested_at ? `You asked ${ago(c.review_requested_at)}. We'll email you when it's done.` : 'Send links or a contract and we will verify you, usually within two working days.'}</p>
      <div class="row wrap"><a class="btn btn-sm" href="${href}">Open ${isArtist ? 'artist page' : 'passport'}</a>${c.review_requested_at ? '' : html`<button class="btn btn-sm" data-act="review">Request a review</button>`}</div></div></div>`
  ].filter(Boolean);
  return html`${head}<div style="padding:6px 22px 24px"><div class="dc-methods">${ways[0]}</div>
    <details class="dc-more" style="margin-top:12px"><summary class="small" style="cursor:pointer;padding:8px 0;font-weight:600">Other ways to verify</summary>
      <div class="dc-methods" style="margin-top:8px">${ways.slice(1)}</div></details></div>`;
}

const methodName = m => ({ audius: 'Audius sign-in', statement: 'your distributor statement', evidence: 'evidence review', request: 'request' }[m] || m);

function evidenceCard(c, { admin = false } = {}) {
  const m = c.match, ev = c.evidence || {};
  const rows = m?.evidence || [];
  return html`<div class="card" style="margin-top:16px">
    <div class="card-head" style="flex-wrap:wrap;gap:8px"><h2 class="h3">Evidence</h2>${c.flagged ? html`<span class="badge crit" style="white-space:normal;max-width:100%">${c.flag_reason || 'Flagged'}</span>` : ''}</div>
    <div class="card-body stack">
      ${ev.audius ? html`<div class="row wrap">${icon('audius')}<span>Signed in on Audius as <b>@${ev.audius.handle || ev.audius.userId}</b>${ev.audius.name ? ` (${ev.audius.name})` : ''}</span>${ev.audius.verified ? html`<span class="badge ok">Audius verified</span>` : ''}</div>` : ''}
      ${ev.statement ? html`<div class="row wrap">${icon('receipt')}<span>Statement <b>${ev.statement.filename}</b> · ${fmt(m?.rows)} rows · ${fmt(m?.isrcsInFile)} ISRCs</span>${admin ? html`<span class="hash">sha256 ${ev.statement.sha256.slice(0, 16)}…</span>` : ''}</div>` : ''}
      ${m && 'matchedIsrcs' in m ? html`<div class="grid grid-3">
          <div class="card stat" style="box-shadow:none"><div class="label">ISRCs matched</div><div class="value">${fmt(m.matchedIsrcs)}</div></div>
          <div class="card stat" style="box-shadow:none"><div class="label">Titles matched</div><div class="value">${fmt(m.matchedTitles)}</div></div>
          <div class="card stat" style="box-shadow:none"><div class="label">Rows credited to this artist</div><div class="value">${m.nameRatio === null ? '—' : Math.round(m.nameRatio * 100) + '%'}</div></div></div>` : ''}
      ${m?.reason ? html`<div class="callout ${m.ok ? 'ok' : 'info'}">${icon(m.ok ? 'check' : 'info')}<div>${m.reason}</div></div>` : ''}
      ${rows.length ? html`<div class="table-wrap"><table class="table dc-ev"><thead><tr><th>Song</th><th>ISRC</th><th>Matched by</th></tr></thead><tbody>
        ${rows.map(r => html`<tr><td><a href="#/song/${r.songId}">${r.title}</a></td><td class="mono">${r.isrc || '—'}</td><td><span class="badge ${r.by === 'isrc' ? 'ok' : 'info'} plain">${r.by === 'isrc' ? 'ISRC' : 'Title'}</span></td></tr>`)}</tbody></table></div>` : ''}
      ${ev.links?.length ? html`<div class="stack-sm"><div class="label">Links</div>${ev.links.map(l => html`<a href="${l}" target="_blank" rel="noopener noreferrer nofollow" class="small" style="overflow-wrap:anywhere">${l}</a>`)}</div>` : ''}
      ${ev.officialEmail ? html`<div class="small"><span class="muted">Official email:</span> ${ev.officialEmail}</div>` : ''}
      ${ev.note || c.message ? html`<div class="small"><span class="muted">Note:</span> ${ev.note || c.message}</div>` : ''}
      ${!ev.audius && !ev.statement && !ev.links?.length && !m ? html`<div class="muted small">No evidence attached.</div>` : ''}
    </div></div>`;
}

app.route('/claims/:id', async ({ el, params }) => {
  const { claim } = await api(`/api/claims/${params.id}`);
  el.innerHTML = html`<div class="dc-scope"><div style="max-width:820px;margin:0 auto">
    <a href="#/claims" class="small muted row" style="gap:6px;margin-bottom:14px">${icon('back')} All claims</a>
    ${claim.kind !== 'contributor' ? stepper(claim.status === 'approved' && claim.verification !== 'provisional' ? 3 : 2) : ''}
    ${claimResult(claim)}
    ${claim.status === 'pending' ? html`<div class="row end" style="margin-top:14px"><button class="btn btn-ghost btn-danger btn-sm" data-act="withdraw">Withdraw claim</button></div>` : ''}
  </div></div>`.s;
  on(el, 'click', '[data-act=withdraw]', async (e, b) => { await busy(b, () => api.post(`/api/claims/${claim.id}/withdraw`)); toast('Claim withdrawn'); app.refresh(); });
  on(el, 'click', '[data-act=copy]', (e, b) => { navigator.clipboard?.writeText(b.dataset.url); toast('Link copied'); });
  on(el, 'click', '[data-act=recheck]', () => app.refresh());
  on(el, 'click', '[data-act=review]', async (e, b) => { await busy(b, () => api.post(`/api/claims/${claim.id}/request-review`)); toast('Review requested'); app.refresh(); });
  on(el, 'click', '[data-act=audius]', async (e, b) => {
    const r = await busy(b, () => api.post('/api/claims/audius/start', { kind: b.dataset.kind, id: b.dataset.id }));
    location.href = r.url;
  });
}, { auth: true, title: 'Claim' });

// ---------- collaborator confirmation ----------
app.route('/claims/:id/confirm', async ({ el, params }) => {
  const { claim: c, isClaimant } = await api(`/api/claims/${params.id}/confirm`);
  const label = c.kind === 'artist' ? c.artist_name : `“${c.song_title}” by ${c.song_artist}`;
  const done = c.verification === 'verified';
  el.innerHTML = html`<div class="dc-scope" style="max-width:640px;margin:0 auto"><div class="card"><div class="dc-result ${done ? 'ok' : 'wait'}">
    <div class="badge-xl">${icon(done ? 'check' : 'users')}</div>
    <h2>${done ? `${label} is verified` : `Is ${c.claimant_name} behind ${label}?`}</h2>
    <p class="muted" style="margin-top:8px">${done ? 'Thanks, nothing else is needed.' : isClaimant ? 'Send this page to a collaborator. You cannot confirm your own claim.'
      : `${c.claimant_name} claimed ${label}. If you worked on these songs and know this is really them, confirm it. Only confirm people you know.`}</p>
    ${!done && !isClaimant ? html`<div class="row" style="justify-content:center;margin-top:20px"><a class="btn" href="#/home">Not sure</a><button class="btn btn-primary" data-act="confirm">${icon('check')} Yes, that's them</button></div>` : ''}
  </div></div></div>`.s;
  on(el, 'click', '[data-act=confirm]', async (e, b) => { await busy(b, () => api.post(`/api/claims/${c.id}/confirm`)); toast('Thanks. The claim is now verified.'); app.refresh(); });
}, { auth: true, title: 'Confirm a claim' });

// ---------- my claims + requests waiting on me ----------
app.route('/claims', async ({ el }) => {
  const { claims, requests } = await api('/api/my/claims');
  const target = c => c.kind === 'artist' ? html`<a href="#/artist/${c.artist_id}">${c.artist_name}</a>` : html`<a href="#/song/${c.song_id}">${c.song_title}</a> <span class="muted">· ${c.song_artist}</span>`;
  el.innerHTML = html`<div class="dc-scope">
  <div class="page-head"><div><h1>Claims</h1><p class="lede">Artists and songs you've claimed, and people asking to join your songs.</p></div>
    <a class="btn btn-primary" href="#/search">${icon('search')} Find more songs</a></div>
  <div class="stack-lg">
    ${requests.length ? html`<div class="card"><div class="card-head"><h2 class="h3">Waiting for you</h2><span class="badge warn">${requests.length}</span></div><div class="list">
      ${requests.map(c => html`<div class="list-item" data-id="${c.id}">
        <div class="avatar" style="background:var(--grad)">${initials(c.name || c.claimant_name || '?')}</div>
        <div class="grow"><div class="title">${c.name || c.claimant_name || 'Someone'} says they're on “${c.song_title}”</div>
          <div class="sub">As ${(c.roles || []).join(', ')}${c.message ? ` · “${c.message}”` : ''} · ${ago(c.created_at)}</div></div>
        <button class="btn btn-sm" data-act="decline">Decline</button><button class="btn btn-sm btn-primary" data-act="accept">${icon('check')} Add them</button></div>`)}</div></div>` : ''}
    <div class="card"><div class="card-head"><h2 class="h3">Your claims</h2></div>
      ${claims.length ? html`<div class="list">${claims.map(c => html`<a class="list-item" href="#/claims/${c.id}">
        <div class="avatar" style="background:var(--surface-3);color:var(--fg-2)">${icon(c.kind === 'artist' ? 'user' : c.kind === 'song' ? 'music' : 'users')}</div>
        <div class="grow"><div class="title">${c.kind === 'artist' ? c.artist_name : c.song_title}${c.kind === 'contributor' ? html` <span class="muted" style="font-weight:500">· join request</span>` : ''}</div>
          <div class="sub">${c.kind === 'artist' ? 'Artist' : 'Song'} · ${methodName(c.method)} · ${ago(c.created_at)}</div></div>
        ${c.status === 'pending' ? html`<span class="badge warn">In review</span>` : c.verification === 'provisional' && c.status === 'approved' ? html`<span class="badge accent">One more step</span>` : statusBadge(c.status)}</a>`)}</div>`
      : html`<div class="empty"><div class="icon">${icon('flag')}</div><h2 class="h3">No claims yet</h2><p>Search your artist name to find the draft passports already waiting for you.</p>
        <div class="row" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="#/search">Find my songs</a></div></div>`}</div>
  </div></div>`.s;
  void target;
  on(el, 'click', '[data-act=accept],[data-act=decline]', async (e, b) => {
    const id = b.closest('[data-id]').dataset.id, accept = b.dataset.act === 'accept';
    await busy(b, () => api.post(`/api/contributor-requests/${id}/${accept ? 'accept' : 'decline'}`, {}));
    toast(accept ? 'Added as a contributor' : 'Request declined');
    app.refresh();
  });
}, { auth: true, title: 'Claims' });

// ---------- admin review ----------
app.route('/admin/claims', async ({ el, query, user }) => {
  if (user.role !== 'admin') { el.innerHTML = html`<div class="dc-scope"><div class="empty"><div class="icon">${icon('lock')}</div><h2 class="h3">Admins only</h2></div></div>`.s; return; }
  const status = query.get('status') || 'pending';
  const r = await api(`/api/admin/claims?status=${status}`);
  const card = c => {
    const isArtist = c.kind === 'artist';
    return html`<div class="card" data-id="${c.id}"><div class="dc-review">
      <div class="stack">
        <div class="row wrap">${c.status === 'pending' ? html`<span class="badge warn">In review</span>` : c.verification === 'provisional' && c.status === 'approved' ? html`<span class="badge accent">Provisional</span>` : statusBadge(c.status)}<span class="badge plain">${isArtist ? 'Artist' : 'Song'}</span>
          <span class="badge accent plain">${methodName(c.method)}</span>${c.flagged ? html`<span class="badge crit">${c.flag_reason}</span>` : ''}${c.auto ? html`<span class="badge ok plain">Auto</span>` : ''}</div>
        <h2 class="h3" style="font-size:1.2rem">${isArtist ? html`<a href="#/artist/${c.artist_id}">${c.artist_name}</a> <span class="muted small" style="font-weight:500">${fmt(c.artist_song_count)} songs · ${c.artist_status}</span>`
          : html`<a href="#/song/${c.song_id}">${c.song_title}</a> <span class="muted small" style="font-weight:500">${c.song_artist} · ${c.song_status}</span>`}</h2>
        <div class="small"><b>${c.claimant_name || c.claimant_email}</b> <span class="muted">${c.claimant_name ? c.claimant_email : ''}${c.role ? ` · says: ${c.role}` : ''} · ${ago(c.created_at)}</span></div>
        ${evidenceCard(c, { admin: true })}
      </div>
      <div class="stack">
        ${c.status === 'pending' ? html`<label class="field"><span>Note to the claimant</span><textarea class="input" name="note" rows="4" placeholder="Optional. Sent with the decision."></textarea></label>
          <button class="btn btn-primary" data-act="approve">${icon('check')} Approve</button><button class="btn btn-danger" data-act="reject">${icon('x')} Reject</button>
          <p class="tiny muted">Approving an artist moves every draft song under it to the claimant in one step.</p>`
        : c.status === 'approved' && c.verification === 'provisional' ? html`<div class="callout info">${icon('key')}<div class="small"><b>Provisional.</b> They can manage these passports; payouts wait for verification.${c.review_requested_at ? html` They asked for a review ${ago(c.review_requested_at)}.` : ''}</div></div>
          <label class="field"><span>Note to the claimant</span><textarea class="input" name="note" rows="3" placeholder="Optional"></textarea></label>
          <button class="btn btn-primary" data-act="verify">${icon('shield')} Verify ownership</button>`
        : html`<div class="small muted">${c.reviewed_at ? `Decided ${ago(c.reviewed_at)}` : ''}${c.verified_via ? ` · verified by ${c.verified_via}` : ''}${c.review_note ? html`<div style="margin-top:6px">“${c.review_note}”</div>` : ''}</div>`}
      </div></div></div>`;
  };
  el.innerHTML = html`<div class="dc-scope"><div class="page-head"><div><div class="eyebrow">Admin</div><h1>Claim review</h1><p class="lede">Claims that could not be verified automatically, competing claims and disputes.</p></div>
    <div class="seg">${['pending', 'provisional', 'approved', 'rejected', 'all'].map(s => html`<button class="${s === status ? 'on' : ''}" data-status="${s}">${s === 'provisional' ? 'To verify' : s[0].toUpperCase() + s.slice(1)}${s !== 'all' && r.counts[s] ? ` · ${r.counts[s]}` : ''}</button>`)}</div></div>
  <div class="stack-lg" id="list">${r.items.length ? r.items.map(card) : html`<div class="card"><div class="empty"><div class="icon">${icon('shield')}</div><h2 class="h3">${status === 'pending' ? 'Nothing to review' : 'No claims here'}</h2><p>${status === 'pending' ? 'New claims that need a person show up here.' : ''}</p></div></div>`}</div>
  ${r.next ? html`<div class="row" style="justify-content:center;margin-top:16px"><button class="btn" data-act="more">Load more</button></div>` : ''}</div>`.s;
  let next = r.next;
  on(el, 'click', '[data-status]', (e, b) => app.go(`/admin/claims?status=${b.dataset.status}`));
  on(el, 'click', '[data-act=more]', async (e, b) => {
    const m = await busy(b, () => api(`/api/admin/claims?status=${status}&cursor=${encodeURIComponent(next)}`));
    el.querySelector('#list').insertAdjacentHTML('beforeend', html`${m.items.map(card)}`.s); next = m.next; if (!next) b.remove();
  });
  on(el, 'click', '[data-act=verify]', async (e, b) => {
    const box = b.closest('[data-id]');
    await busy(b, () => api.post(`/api/admin/claims/${box.dataset.id}/verify`, { note: box.querySelector('[name=note]').value }));
    toast('Ownership verified. Payouts are unlocked.');
    app.refresh();
  });
  on(el, 'click', '[data-act=approve],[data-act=reject]', async (e, b) => {
    const box = b.closest('[data-id]'), approve = b.dataset.act === 'approve';
    const note = box.querySelector('[name=note]').value;
    await busy(b, () => api.post(`/api/admin/claims/${box.dataset.id}/${approve ? 'approve' : 'reject'}`, { note }));
    toast(approve ? 'Claim approved. The claimant has been emailed.' : 'Claim rejected. The claimant has been emailed.');
    app.refresh();
  });
}, { auth: true, title: 'Claim review' });

// ---------- "I'm on this song" (song tab for signed-in people who are not on a claimed song) ----------
const JOIN_ROLES = ['writer', 'producer', 'performer', 'featured artist', 'engineer', 'mixer', 'publisher', 'label'];
app.songTab({
  id: 'join', label: "I'm on this song", order: 80,
  show: (song, { canManage, isContributor }) => song.status !== 'draft' && !canManage && !isContributor,
  render: async ({ el, song, user, query }) => {
    if (!user) return html`<div class="card dc-scope"><div class="empty"><div class="icon">${icon('users')}</div><h2 class="h3">Are you on this song?</h2>
      <p>Sign in to ask the owner to add you as a contributor.</p><div class="row" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="#/signin?next=${encodeURIComponent(`/song/${song.id}?tab=join`)}">Sign in</a></div></div></div>`;
    const { mine } = await api(`/api/songs/${song.id}/contributor-requests`);
    if (mine && mine.status === 'pending') return html`<div class="card dc-scope"><div class="dc-result wait"><div class="badge-xl">${icon('clock')}</div><h2>Request sent</h2>
      <p class="muted" style="margin-top:8px">The owner of “${song.title}” has been asked to add you as ${(mine.roles || []).join(', ')}. We'll let you know.</p></div></div>`;
    // Coming from "Credited, not yet on the split": the roles the public credits name are already picked.
    const roles = new Set((query?.get('roles') || '').split(',').filter(r => JOIN_ROLES.includes(r)));
    el.innerHTML = html`<div class="dc-scope"><div class="card card-pad stack-lg" style="max-width:720px">
      <div class="stack-sm"><h2 class="h3">Ask to be added to “${song.title}”</h2><p class="muted small">The owner gets your request and can add you as a contributor. Once you're on the passport you can sign the split and get paid from the song's wallet.</p></div>
      ${mine?.status === 'rejected' ? html`<div class="callout warn">${icon('info')}<div>Your last request was declined${mine.review_note ? `: “${mine.review_note}”` : ''}. You can send a new one with more detail.</div></div>` : ''}
      <div class="field"><span>Your role</span><div class="dc-roles">${JOIN_ROLES.map(r => html`<button type="button" class="dc-role ${roles.has(r) ? 'on' : ''}" data-role="${r}">${r}</button>`)}</div></div>
      <form class="stack" id="jf">
        <label class="field"><span>Name as credited</span><input class="input" name="name" value="${user.name || ''}" placeholder="Your name or alias"></label>
        <label class="field"><span>Message to the owner <span class="hint">optional</span></span><textarea class="input" name="message" rows="3" placeholder="e.g. I co-wrote the chorus in the March session"></textarea></label>
        <div><button class="btn btn-primary">${icon('users')} Send request</button></div></form></div></div>`.s;
    on(el, 'click', '[data-role]', (e, b) => { roles.has(b.dataset.role) ? roles.delete(b.dataset.role) : roles.add(b.dataset.role); b.classList.toggle('on'); });
    el.querySelector('#jf').addEventListener('submit', async e => {
      e.preventDefault();
      if (!roles.size) return toast('Pick at least one role', { error: true });
      await busy(e.submitter, () => api.post(`/api/songs/${song.id}/contributor-requests`, { ...formData(e.target), roles: [...roles] }));
      toast('Request sent to the owner');
      app.refresh();
    });
  }
});

void raw; void esc; void modal;

// ---------- "Is this your song?" ----------
// Before making a new passport or sending a quick split: if this recording already has a passport, offer it.
// Resolves true to carry on making a new one, false when the person went to the existing passport instead.
export async function confirmNewSong({ title, artist }) {
  if (!title || !artist) return true;
  const { matches } = await api(`/api/match/songs?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`).catch(() => ({ matches: [] }));
  if (!matches.length) return true;
  const s = matches[0];
  const detail = [s.release_title, s.release_date?.slice(0, 4), s.duration_ms ? duration(s.duration_ms) : null].filter(Boolean).join(' · ');
  const pick = await modal({
    title: 'Is this your song?',
    body: html`<div class="stack">
      <p class="muted small">There's already a passport for a song with this title and artist.</p>
      <div class="row" style="gap:14px;align-items:center">${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title, size: 'lg' })}
        <div class="stack-sm" style="min-width:0"><b>${s.title}${s.version_title ? ` (${s.version_title})` : ''}</b><span>${s.artist_credit}</span>
          ${detail ? html`<span class="small muted">${detail}</span>` : ''}
          <div class="row wrap">${s.isrc ? html`<span class="chip">ISRC ${s.isrc}</span>` : ''}${draftBadge(s.status)}</div></div></div>
      ${matches.length > 1 ? html`<p class="tiny muted">${matches.length - 1} more passport${matches.length > 2 ? 's' : ''} also match.</p>` : ''}</div>`,
    actions: [{ label: "No, it's a different song", value: 'new' }, { label: s.status === 'draft' ? 'Yes, claim it' : 'Yes, open it', primary: true, value: 'existing' }]
  });
  if (pick === 'existing') app.go(s.status === 'draft' ? `/claim/song/${s.id}` : `/song/${s.id}`);
  return pick === 'new';
}
