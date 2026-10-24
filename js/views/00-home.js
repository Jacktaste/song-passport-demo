// Home: a welcome page for visitors (find your songs, claim them) and a dashboard once signed in.
// Also "My songs" and the new-passport flow.
import { app, shownTitle, html, api, icon, art, statusBadge, money, ago, on, formData, busy, toast, esc, shareLink, infoTip } from '../app.js';
import { confirmNewSong } from './10-discover.js';

app.nav({ id: 'home', label: 'Home', href: '/home', icon: 'home', section: 'Passport', order: 0 });
app.nav({ id: 'songs', label: 'My songs', href: '/songs', icon: 'music', section: 'Passport', order: 1, auth: true , artist: true });

const soft = p => p.catch(() => null);
// The artist screens' stylesheet (home, Passport, Wallet, Release), loaded once.
export function useArtistCss() {
  if (document.querySelector('link[data-ah]')) return;
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = 'css/artist.css'; l.dataset.ah = '1';
  document.head.appendChild(l);
}
// Where money came from, one colour each (the same in the bar and the legend).
export const SOURCE_COLOR = { plays: '#7E1BCC', owned: '#2F6FDB', pass: '#E07038', tips: '#1E9E78', merch: '#B8901E', licensing: '#5B6B7F', stores: '#0EA5A4', songwriting: '#C2185B', other: '#A1A1AA' };
// "about $4,200": estimates are rounded, never shown to the cent.
export const about = minor => { const d = minor / 100; const r = d >= 1000 ? Math.round(d / 100) * 100 : d >= 100 ? Math.round(d / 10) * 10 : Math.round(d); return '$' + r.toLocaleString('en-US'); };
const fmt = n => new Intl.NumberFormat('en-US', { notation: n > 99999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(n || 0);

app.route('/home', async ({ el, user, query }) => {
  const meta = app.meta || {};
  if (!user) return welcome(el, meta);
  // Listeners (no songs yet) live in Audius. "?artist=1" opens the artist start page to find and claim songs.
  if (!app.isArtist && !query.get('artist')) return app.go('/listen');

  useArtistCss();
  const [mine, gaps, wallet, sigs, cred, month] = await Promise.all([
    api('/api/my/songs'), soft(api('/api/my/gaps')), soft(api('/api/wallet/summary')), soft(api('/api/signatures/mine')), soft(api('/api/my/credits')), soft(api('/api/my/month'))
  ]);
  // Songs a name I've claimed is credited on (producer, writer, engineer...) that I'm not on the split for yet.
  const credited = cred?.items || [];
  const persona = cred?.persona || 'artist';
  const WORK = { artist: 'songs', producer: 'productions', writer: 'songs', engineer: 'songs' };
  const songs = mine.songs;
  const waiting = sigs?.waitingForMe || [];
  // A set name may be an artist name ("Mr. Berryhill", "KESLR"): use it whole. Otherwise the first part of the email.
  const first = user.name || user.email.split('@')[0].split(/[\s._-]/)[0];
  const name = first.charAt(0).toUpperCase() + first.slice(1);
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const atRisk = gaps?.totals?.atRiskMinor ?? null;
  const available = wallet?.available?.[0];
  const held = wallet?.held?.[0];

  // First-run guide: three steps, each ticked off from real state; it disappears once all three are done.
  const managed = songs.filter(s => s.manage);
  const sent = songs.some(s => s.status === 'active') || (sigs?.sentPending?.length || 0) > 0;
  const crew = persona !== 'artist';   // producers, writers and engineers get the same features, in their own words
  const steps = crew ? [
    { done: true, title: 'Claim your name', sub: 'Done. Every song you’re credited on is linked to you.', href: '#/search', cta: '', icon: 'flag' },
    { done: songs.length > 0, title: 'Get on the split', sub: credited.length ? `You’re credited on ${fmt(credited.length)} ${credited.length === 1 ? 'song' : 'songs'} but not on the split yet. Ask the owner to add you.` : 'Ask the owner of a song you worked on to add you to its split.', href: `#/artist/${app.artists[0]?.id || ''}?tab=credits`, cta: 'See my credits', icon: 'users' },
    { done: sent, title: 'Send a split', sub: 'Made something new? Everyone on it gets one link and taps Agree. No account needed.', href: managed.length ? `#/song/${managed[0].id}?tab=splits` : '#/send', cta: 'Send a split', icon: 'sign' }
  ] : [
    { done: songs.length > 0, title: 'Find your songs', sub: 'Search your name. Most songs are already here as drafts, with who produced and wrote them.', href: '#/search', cta: 'Find my songs', icon: 'search' },
    { done: managed.length > 0, title: 'See who’s on them', sub: 'Claim a song to see everyone credited on it. Usually instant.', href: songs.length ? `#/song/${songs[0].id}` : '#/search', cta: 'Claim a song', icon: 'flag' },
    { done: sent, title: 'Get everyone paid', sub: 'Everyone on the song gets one link and taps Agree. Money then splits the same day.', href: managed.length ? `#/song/${managed[0].id}?tab=splits` : '#/send', cta: 'Send a split', icon: 'sign' }
  ];
  const nextStep = steps.findIndex(x => !x.done);
  const guide = nextStep >= 0;

  el.innerHTML = html`
  <div class="ah-head"><div><h1>${greet}, ${name}</h1><p class="muted" style="margin-top:6px">Find your songs, see who’s on them, get everyone paid.</p></div>
    <div class="row"><a class="btn" href="#/send">${icon('sign')} Send a split</a><a class="ah-cta" href="#/releases/new">${icon('plus')} Release a song</a></div></div>
  ${moneyAlert(gaps)}
  ${guide ? html`<section class="card steps" style="margin-bottom:24px" aria-label="Get started">
    ${steps.map((x, i) => html`<a class="step ${x.done ? 'done' : ''} ${i === nextStep ? 'next' : ''}" href="${x.href}">
      <span class="step-n" aria-hidden="true">${x.done ? icon('check') : String(i + 1)}</span>
      <span class="step-t">${x.title}</span><span class="step-s">${x.done ? 'Done' : i === nextStep ? x.cta : 'Next'}</span></a>`)}</section>` : ''}

  ${waiting.length ? html`<a class="card card-pad row" href="#/signatures" style="margin-bottom:16px;border-color:var(--warn);text-decoration:none;color:inherit">
    <div class="avatar" style="background:var(--warn)">${icon('sign')}</div>
    <div class="grow" style="flex:1"><b>${waiting.length} split${waiting.length > 1 ? 's' : ''} waiting for your signature</b></div>
    <span class="btn btn-sm">Review ${icon('arrow')}</span></a>` : ''}

  ${month ? monthView(month, gaps) : ''}
  <div class="split-main ${app.artists.length ? '' : 'solo'}">
    <div class="stack-lg" style="min-width:0">
    ${credited.length ? html`<div class="card" id="credited"><div class="card-head"><div><h2 class="h3">Credited, not yet on the split</h2>
      <div class="small muted" style="white-space:normal">Public credits name you on ${credited.length === 1 ? 'this song' : `these ${fmt(credited.length)} ${WORK[persona]}`}. A credit isn’t a split: ask to be added so you’re paid.</div></div></div>
      <div class="list">${credited.slice(0, 8).map(creditRow)}</div>
      ${credited.length > 8 ? html`<div class="row" style="justify-content:center;padding:14px"><a class="btn btn-sm" href="#/artist/${app.artists[0]?.id || ''}?tab=credits">See all ${fmt(credited.length)}</a></div>` : ''}</div>` : ''}
    ${(songs.length || !credited.length) && !month?.songs?.length ? html`<section class="card">
      <div class="card-head"><h2 class="h3">Recent songs</h2>${songs.length ? html`<a class="btn btn-ghost btn-sm" href="#/songs">See all</a>` : ''}</div>
      ${songs.length ? html`<div class="covers">${songs.slice(0, 8).map(coverTile)}</div>`
        : html`<div class="empty"><div class="icon">${icon('music')}</div><h2 class="h3">No songs yet</h2><p>Search for your name to claim the songs already waiting for you.</p>
          <div class="row" style="justify-content:center;margin-top:16px"><a class="btn" href="#/search">Find my songs</a><a class="btn ${guide ? '' : 'btn-primary'}" href="#/songs/new">New passport</a></div></div>`}
    </section>` : ''}</div>
    <div class="stack-lg">
      ${app.artists.length ? html`<div class="card"><div class="card-head"><h2 class="h3">Your artist pages</h2></div><div class="list">
        ${app.artists.map(a => html`<a class="list-item" href="#/artist/${a.id}">${art(a.name, { url: a.image_url, label: a.name })}<div class="grow"><div class="title">${a.name}</div></div>${statusBadge(a.status)}</a>`)}</div></div>` : ''}
    </div>
  </div>`.s;
  on(el, 'click', '[data-act=invite]', (e, b) => shareLink(`${location.origin}/#/claim/song/${b.dataset.id}`, { title: b.dataset.title, label: 'Claim link' }));
}, { title: 'Home' });

// The money at stake, first: from the money check. A dollar figure only when the check is confident of it.
function moneyAlert(gaps) {
  const t = gaps?.totals;
  if (!t?.songsWithGaps && !t?.toCheck) return '';
  const sure = t.atRiskMinor > 0 && (!t.confidence || t.confidence === 'high');
  const worst = [...(gaps.songs || [])].filter(x => x.top?.length).sort((a, b) => (b.atRiskMinor || 0) - (a.atRiskMinor || 0))[0];
  const n = sure ? (gaps.songs || []).filter(x => x.atRiskMinor > 0).length || t.songsWithGaps : t.toCheck || t.songsWithGaps;
  const head = sure ? `${n} ${n === 1 ? 'song' : 'songs'} may be missing about ${about(t.atRiskMinor)}` : `${n} ${n === 1 ? 'thing' : 'things'} to check`;
  const top = worst?.top[0];
  const sub = top ? `${worst.title}: ${top.title}.${sure && worst.atRiskMinor ? ` About ${about(worst.atRiskMinor)} may be waiting there.` : ''}` : 'Run the money check to see where.';
  const href = top?.action?.href ? '#' + top.action.href : '#/gaps';
  return html`<div class="ah-alert" role="status"><div class="bell" aria-hidden="true">${icon('bell')}</div>
    <div class="grow"><b>${head}</b><span>${sub}</span></div><a class="ah-dark" href="${href}">Fix it for me</a></div>`;
}

// This month at a glance: what was paid, who listened, passes, songs owned, where the money came from, songs and listeners.
function monthView(m, gaps) {
  const names = m.splitWith || [];
  const splitLine = names.length ? `Already split with ${names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(' and ')}` : 'Split the day it arrives';
  const total = m.sources.reduce((a, x) => a + x.amount, 0);
  const bySong = Object.fromEntries((gaps?.songs || []).map(g => [g.songId, g]));
  const pill = s => {
    if (s.status !== 'active') return html`<span class="pill wait">Waiting on signatures</span>`;
    const g = bySong[s.id];
    if (g?.top?.length) return html`<span class="pill miss">${g.top[0].code?.startsWith('REG_') ? 'Not registered' : 'Missing info'}</span>`;
    return html`<span class="pill ok">All set</span>`;
  };
  const maxLevel = Math.max(1, ...m.levels.map(l => l.n));
  return html`
  <div class="ah-tiles">
    <a class="ah-tile" href="#/wallet"><div class="k">Paid to you this month</div><div class="v">${money(m.paid, m.currency)}</div><div class="s ${m.paid ? 'good' : ''}">${m.paid ? splitLine : 'Nothing yet this month'}</div></a>
    <div class="ah-tile"><div class="k">Listeners this month</div><div class="v">${fmt(m.listeners)}</div><div class="s">On Audius and your One Link</div></div>
    <div class="ah-tile"><div class="k">Artist Passes</div><div class="v">${fmt(m.passes)}</div><div class="s">${m.passes ? `${money(m.passMonthly)} a month` : 'Listeners who back just you'}</div></div>
    <div class="ah-tile"><div class="k">Songs bought to own</div><div class="v">${fmt(m.owned)}</div><div class="s">${money(m.ownedThisMonth)} this month</div></div>
  </div>
  ${total ? html`<section class="ah-card"><h2>Where this month’s money came from</h2>
    <div class="ah-bar" role="img" aria-label="${m.sources.map(x => `${x.label} ${money(x.amount)}`).join(', ')}">${m.sources.map(x => html`<i style="flex:${x.amount};background:${SOURCE_COLOR[x.key]}"></i>`)}</div>
    <div class="ah-legend">${m.sources.map(x => html`<span><i style="background:${SOURCE_COLOR[x.key]}"></i>${x.label} <b>${money(x.amount)}</b></span>`)}</div></section>` : ''}
  <div class="ah-two">
    <section class="ah-card"><div class="row" style="justify-content:space-between;margin-bottom:12px"><h2 style="margin:0">Your songs</h2><a class="small" href="#/songs">See all</a></div>
      <div class="ah-songs">${m.songs.slice(0, 6).map(s => html`<a class="ah-song" href="#/song/${s.id}">${art(s.title + s.artist_credit, { label: s.title })}
        <div class="grow"><div class="t">${s.title}</div><div class="m">${money(s.amount)} this month</div></div>${pill(s)}</a>`)}</div></section>
    <section class="ah-card"><h2>Your listeners</h2>
      ${m.levels.filter(l => l.name !== 'Listener' || l.n).map(l => html`<div class="ah-level"><div class="row"><b>${l.name}</b><span class="muted">${fmt(l.n)}</span></div>
        <div class="track"><i style="width:${Math.round(l.n / maxLevel * 100)}%"></i></div></div>`)}
      <a class="ah-soft" href="#/onelink">Start a presale for Insiders</a></section>
  </div>`;
}

// A credited song: claimed ones get "Ask to be added" (the owner decides); unclaimed drafts have no owner yet, so
// the artist is invited to claim it first.
function creditRow(s) {
  const roles = s.labels.join(', ');
  const action = s.request === 'pending' ? html`<span class="badge plain">${icon('clock')} Asked</span>`
    : s.claimed ? html`<a class="btn btn-sm" href="#/song/${s.id}?tab=join&roles=${encodeURIComponent(s.join_roles.join(','))}">Ask to be added</a>`
    : html`<button class="btn btn-sm" data-act="invite" data-id="${s.id}" data-title="${s.title}" title="Nobody has claimed this song yet. Send the artist a link to claim it, then ask to be added.">Invite the artist</button>`;
  return html`<div class="list-item"><a href="#/song/${s.id}" class="row grow" style="min-width:0;gap:12px;color:inherit;text-decoration:none">${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title })}
    <div style="min-width:0;flex:1"><div class="title">${shownTitle(s)}</div><div class="sub">${s.artist_credit} · ${roles}</div></div></a>${action}</div>`;
}

// A song as cover art with its title under it, and one status dot.
function coverTile(s) {
  const st = s.status === 'active' ? 'done' : s.status === 'draft' ? 'unknown' : 'check';
  return html`<a class="cover" href="#/song/${s.id}">${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title, px: 250 })}
    <span class="cover-t"><span class="sdot ${st}" aria-hidden="true"></span>${shownTitle(s)}</span><span class="cover-s">${s.artist_credit}</span></a>`;
}

function songRow(s) {
  return html`<a class="list-item" href="#/song/${s.id}">${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title })}
    <div class="grow"><div class="title">${shownTitle(s)}${s.version_title ? html` <span class="muted">(${s.version_title})</span>` : ''}</div>
    <div class="sub">${s.artist_credit}${s.isrc ? html` · <span class="mono">${s.isrc}</span>` : ''}</div></div>
    ${s.parent_song_id ? html`<span class="badge info plain">${icon('git')} Remix</span>` : ''}
    ${statusBadge(s.status)}<span class="small faint" style="width:70px;text-align:right">${ago(s.updated_at)}</span></a>`;
}

// ---------- Welcome (signed out) ----------
function welcome(el, meta) {
  const st = meta.stats || {};
  el.innerHTML = html`
  <section style="text-align:center;padding:48px 0 30px" class="stack-lg">
    <div><span class="badge grad plain">${icon('audius')} Audius: one place that makes sure everyone on your song gets paid</span></div>
    <h1 style="font-size:clamp(2.4rem,1.6rem + 3.4vw,4.4rem);letter-spacing:-0.04em;max-width:900px;margin:0 auto">Your songs are already here.<br><span class="grad-text">Claim them.</span></h1>
    <p class="muted" style="font-size:18px;max-width:640px;margin:0 auto">Find your songs, see who’s on them, and get everyone paid. Every song gets a passport with who made it, who owns it and every registration, and a wallet that splits the money the same day.</p>
    <form id="hs" style="max-width:620px;margin:6px auto 0;width:100%;position:relative">
      <input class="input" name="q" placeholder="Search your artist name, a song or an ISRC" style="padding:18px 150px 18px 22px;font-size:17px;border-radius:18px;box-shadow:var(--shadow)">
      <button class="btn btn-primary" style="position:absolute;right:8px;top:8px;bottom:8px">Find my songs</button>
    </form>
    <div class="live" id="live" aria-live="polite" style="max-width:820px;margin-inline:auto;width:100%"></div>
    <div><a href="#/send" class="btn btn-lg">${icon('sign')} Or send a split in a minute</a></div>
    <div class="row" style="justify-content:center;gap:28px;flex-wrap:wrap">
      <div><div style="font:800 26px var(--display);letter-spacing:-.03em">${fmt(st.songs)}</div><div class="small muted">song passports</div></div>
      <div><div style="font:800 26px var(--display);letter-spacing:-.03em">${fmt(st.artists)}</div><div class="small muted">artists</div></div>
      <div><div style="font:800 26px var(--display);letter-spacing:-.03em">${fmt(st.claimed)}</div><div class="small muted">claimed</div></div>
    </div>
  </section>
  <section class="grid grid-3" style="margin-top:20px">
    ${[
      ['sign', 'Signed splits', 'Send one link to everyone on the song. They sign on their phone in a minute. Every signature is verifiable.'],
      ['git', 'Every version, kept', 'Stems, mixes and masters with full history. A remix starts as a copy that carries its own split.'],
      ['scan', 'Nothing left in limbo', 'The passport flags missing codes and registrations so no money sits unclaimed.'],
      ['wallet', 'Paid the same day', 'Income lands in the Song Wallet and splits to the cent the day it arrives.'],
      ['rocket', 'Release from the passport', 'Send music to every store with the codes and splits already done.'],
      ['shield', 'Yours, provably', 'A tamper-evident history for every song, anchored on the Open Audio Protocol.']
    ].map(([i, t, d]) => html`<div class="card card-pad stack-sm"><div class="feature-icon">${icon(i)}</div><h2 class="h3">${t}</h2><p class="muted">${d}</p></div>`)}
  </section>
  <section class="card hero card-pad" style="margin-top:22px;text-align:center;padding:42px 22px">
    <h2 style="color:#fff;font-size:28px">Free for every artist, writer and producer.</h2>
    <p class="muted" style="margin:10px auto 20px;max-width:520px">Sign in with your email. No password.</p>
    <a class="btn btn-lg" href="#/signin" style="background:#fff;color:#111;border:0">Get started</a>
  </section>`.s;
  el.querySelector('#hs').addEventListener('submit', e => { e.preventDefault(); app.go(`/search?q=${encodeURIComponent(formData(e.target).q || '')}`); });
  liveSearch(el.querySelector('#hs input'), el.querySelector('#live'));
}

// Type your name, see yourself: the closest artist (or credited name) with their songs and cover art, as you type,
// and one button to claim them all. Each keystroke cancels the last request, so only the latest answer paints.
function liveSearch(input, box) {
  let timer, ctrl, last = '';
  const paint = async q => {
    ctrl?.abort(); ctrl = new AbortController();
    const signal = ctrl.signal;
    try {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, { signal }).then(x => x.json());
      const a = (r.artists || [])[0];
      let songs = (r.songs || []).slice(0, 8), crew = false;
      if (a) {
        crew = !a.song_count && a.credit_count > 0;
        const more = await fetch(crew ? `/api/artists/${a.id}/credits?limit=8` : `/api/artists/${a.id}/songs?limit=8`, { signal }).then(x => x.json());
        if (more.items?.length) songs = more.items;
      }
      if (signal.aborted) return;
      if (!a && !songs.length) { box.innerHTML = html`<p class="muted small" style="text-align:center">Nothing called “${q}” yet. <a href="#/send">Start a passport</a> instead.</p>`.s; return; }
      const n = crew ? a.credit_count : a?.song_count || 0;
      box.innerHTML = html`<div class="card fade-in">
        ${a ? html`<div class="live-artist">${art(a.name, { url: a.image_url || songs.find(s => s.artwork_url)?.artwork_url, size: 'lg', label: a.name })}
          <div class="grow"><div class="eyebrow">${crew ? 'Credited name' : 'Artist'}${a.status === 'claimed' ? ' · Claimed' : ''}</div><h2 style="margin-top:4px">${a.name}</h2>
            <div class="small muted">${[a.disambiguation, crew ? `Credited on ${fmt(n)} songs` : `${fmt(n)} songs`].filter(Boolean).join(' · ')}</div></div>
          ${a.status === 'claimed' ? html`<a class="btn btn-lg" href="#/artist/${a.id}">Open</a>`
            : html`<a class="btn btn-primary btn-lg" href="#/claim/artist/${a.id}">This is me: ${crew ? `link ${fmt(n)} songs` : `claim ${n === 1 ? 'it' : `all ${fmt(n)} songs`}`}</a>`}</div>` : ''}
        <div class="live-songs">${songs.map(s => html`<a class="live-song" href="#/song/${s.id}">${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title, px: 250 })}<b>${shownTitle(s)}</b><span>${s.artist_credit}</span></a>`)}</div>
        ${a ? html`<div class="row" style="justify-content:center;padding:0 20px 18px"><a class="small" href="#/search?q=${encodeURIComponent(q)}">Not you? See everyone called “${q}”</a></div>` : ''}</div>`.s;
    } catch (e) { if (e.name !== 'AbortError') box.innerHTML = ''; }
  };
  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(timer);
    if (q === last) return;
    last = q;
    if (q.length < 2) { ctrl?.abort(); box.innerHTML = ''; return; }
    timer = setTimeout(() => paint(q), 90);
  });
}

// ---------- My songs ----------
app.route('/songs', async ({ el, query }) => {
  const { songs } = await api('/api/my/songs');
  let filter = query.get('f') || 'all';
  const paint = () => {
    const list = songs.filter(s => filter === 'all' || (filter === 'manage' ? s.manage : !s.manage));
    el.innerHTML = html`<div class="page-head"><div><h1>My songs</h1><p class="lede">Songs you own, manage through your artist page, or appear on as a contributor.</p></div>
      <a class="btn btn-primary" href="#/songs/new">${icon('plus')} New passport</a></div>
      <div class="row" style="margin-bottom:14px"><div class="seg">${[['all', 'All'], ['manage', 'I manage'], ['on', "I'm on"]].map(([k, l]) => html`<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`)}</div>
      <span class="small muted">${list.length} songs</span></div>
      <div class="card">${list.length ? html`<div class="list">${list.map(songRow)}</div>` : html`<div class="empty"><div class="icon">${icon('music')}</div><h2 class="h3">${filter === 'on' ? 'No songs you’re on yet' : 'Nothing here yet'}</h2><p>${filter === 'on' ? 'When someone adds you to a split, the song shows up here.' : 'Find your name to claim the songs already waiting for you.'}</p>
        <div class="row" style="justify-content:center;margin-top:14px"><a class="btn btn-primary" href="#/search">${icon('search')} Find my songs</a></div></div>`}</div>`.s;
  };
  on(el, 'click', '[data-f]', (e, t) => { filter = t.dataset.f; paint(); });
  paint();
}, { auth: true, title: 'My songs' });

// ---------- New passport ----------
const ROLES = ['writer', 'producer', 'performer', 'featured artist', 'engineer', 'mixer', 'label', 'manager', 'publisher'];
app.route('/songs/new', async ({ el, query }) => {
  el.innerHTML = html`<div style="max-width:720px;margin:0 auto" class="stack-lg">
    <div><a href="#/songs" class="small">${icon('back')} My songs</a><h1 style="margin-top:8px">New Song Passport</h1>
      <p class="lede muted" style="margin-top:6px">Start with the basics. You'll add everyone on the song and send the split for signature next.</p></div>
    <form class="card card-pad stack-lg" id="nf">
      <div class="form-grid">
        <label class="field full"><span>Song title</span><input class="input" name="title" required maxlength="300" placeholder="e.g. Midnight Static" value="${query.get('title') || ''}"></label>
        <label class="field"><span>Artist credit</span><input class="input" name="artist_credit" required placeholder="As it appears on stores"></label>
        ${app.artists.length ? html`<label class="field"><span>Artist page</span><select class="input" name="artist_id"><option value="">None</option>${app.artists.map(a => html`<option value="${a.id}">${a.name}</option>`)}</select></label>`
          : html`<label class="field"><span>Version <span class="hint">optional</span></span><input class="input" name="version_title" placeholder="e.g. Acoustic"></label>`}
        <label class="field"><span>ISRC <span class="hint">if you have one</span></span><input class="input mono" name="isrc" placeholder="US-ABC-26-00001"></label>
        <label class="field"><span>ISWC <span class="hint">if you have one</span></span><input class="input mono" name="iswc" placeholder="T-123.456.789-0"></label>
        <label class="field"><span>Release date <span class="hint">optional</span></span><input class="input" type="date" name="release_date"></label>
        <label class="field"><span>Genre <span class="hint">optional</span></span><input class="input" name="genre"></label>
      </div>
      <div class="field"><span>Your roles on this song</span>
        <div class="row wrap">${ROLES.map(r => html`<label class="chip" style="cursor:pointer;font-family:var(--sans)"><input type="checkbox" name="role" value="${r}" ${r === 'writer' ? 'checked' : ''}> ${r}</label>`)}</div></div>
      <div class="row end"><a class="btn btn-ghost" href="#/songs">Cancel</a><button class="btn btn-primary btn-lg">Create passport ${icon('arrow')}</button></div>
    </form></div>`.s;
  el.querySelector('#nf').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, body = formData(f);
    body.my_roles = [...f.querySelectorAll('input[name=role]:checked')].map(i => i.value);
    delete body.role;
    if (!body.artist_id) delete body.artist_id;
    if (!await confirmNewSong({ title: body.title, artist: body.artist_credit })) return;
    const r = await busy(f.querySelector('button.btn-primary'), () => api.post('/api/songs', body));
    toast('Passport created');
    app.go(`/song/${r.song.id}?tab=splits`);
  });
}, { auth: true, title: 'New passport' });
