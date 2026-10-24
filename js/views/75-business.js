// Audius for Business: the licensing store businesses use (/business), a song's license page, the license
// certificate, streamer plans, and the artist's side (a "Licensing" tab on every passport, plus the emailed opt-in).
import { app, html, raw, api, toast, money, date, ago, on, busy, formData, modal, esc, comingBar } from '../app.js';
import { ico, USE, cover, sheet } from '../pl.js';

app.nav({ id: 'business', label: 'License music', href: '/business', icon: 'coins', section: 'Business', order: 70, soon: true });
app.nav({ id: 'streamers', label: 'Streamers', href: '/business/streamers', icon: 'play', section: 'Business', order: 71, soon: true });
app.nav({ id: 'licenses', label: 'My licenses', href: '/business/licenses', icon: 'receipt', section: 'Business', order: 72, auth: true, soon: true });

const useTile = (use, size = 44) => html`<span class="ol-tile" style="width:${size}px;height:${size}px;border-radius:${Math.round(size / 3.6)}px;background:${USE[use].color}">${ico(USE[use].icon)}</span>`;
const priceOf = u => u.use === 'stream' ? 'Streamer plan' : money(u.price ?? u.rate);

// ---------- the store ----------
app.route('/business', async ({ el, query }) => {
  let use = query.get('use') || '';
  let q = query.get('q') || '';
  const paint = async () => {
    const d = await api(`/api/business/catalogue?use=${use}&q=${encodeURIComponent(q)}`);
    el.innerHTML = html`
    ${comingBar('Audius for Business')}
    <div class="pl-hero" style="margin-bottom:22px"><h1>License music in minutes.</h1>
      <p>Real artists' songs, cleared by everyone who owns them. Pick a use, pay, and get your license. No emails.</p></div>
    <div class="row wrap" style="gap:10px;margin-bottom:18px">
      <button class="btn ${use ? '' : 'btn-dark'}" data-use="">All</button>
      ${d.uses.map(u => html`<button class="btn ${use === u.use ? 'btn-dark' : ''}" data-use="${u.use}">${u.label}</button>`)}
      <div class="spacer"></div>
      <form id="s" style="min-width:240px"><input class="input" name="q" value="${q}" placeholder="Search songs or artists"></form>
    </div>
    ${d.songs.length ? html`<div class="grid grid-4">${d.songs.map(s => html`<a class="card" href="#/business/song/${s.id}" style="overflow:hidden;color:inherit;text-decoration:none">
        <div style="aspect-ratio:1.25;${raw(cover(s.title + s.artist_credit, s.artwork_url))};display:flex;align-items:flex-end;padding:12px;gap:6px">
          ${s.oneClick ? html`<span class="badge plain" style="background:rgba(255,255,255,.92);color:#0C0F14"><span style="width:7px;height:7px;border-radius:50%;background:#34C759"></span> Ready now</span>` : ''}
          ${s.streamerSafe ? html`<span class="badge plain" style="background:rgba(0,0,0,.45);color:#fff">Streamer-safe</span>` : ''}</div>
        <div class="card-pad" style="padding:14px 16px"><div style="font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.title}</div>
          <div class="row between small muted"><span>${s.artist_credit}</span><span>${s.from ? `from ${money(s.from)}` : 'Quote'}</span></div></div></a>`)}</div>`
      : html`<div class="card"><div class="empty"><div class="icon">${ico('search')}</div><h3>Nothing here yet</h3><p>Try another use, or clear the search.</p></div></div>`}`.s;
  };
  await paint();
  on(el, 'click', '[data-use]', async (e, t) => { use = t.dataset.use; await paint(); });
  on(el, 'submit', '#s', async e => { e.preventDefault(); q = formData(e.target).q; await paint(); });
}, { title: 'License music' });

// ---------- one song ----------
app.route('/business/song/:id', async ({ el, params, user }) => {
  const d = await api(`/api/business/songs/${params.id}`);
  const s = d.song;
  const buyable = d.uses.filter(u => u.use !== 'stream');
  let pick = (buyable.find(u => u.oneClick) || buyable[0])?.use;
  const paint = () => {
    const u = d.uses.find(x => x.use === pick);
    el.innerHTML = html`<a href="#/business" class="small">← All music</a>
    <div class="split-main" style="margin-top:14px;grid-template-columns:minmax(0,1fr) 400px">
      <div class="stack-lg">
        <div class="row" style="gap:22px;align-items:flex-end;flex-wrap:wrap">
          <div style="width:180px;height:180px;border-radius:26px;flex:none;box-shadow:var(--shadow-lg);${raw(cover(s.title + s.artist_credit, s.artwork_url))}"></div>
          <div class="stack-sm"><div class="eyebrow">Song</div><h1>${s.title}</h1><div class="muted" style="font-size:17px">${s.artist_credit}</div>
            <div class="row wrap" style="margin-top:6px">${s.isrc ? html`<span class="chip">ISRC ${s.isrc}</span>` : ''}${d.uses.some(x => x.use === 'stream' && x.oneClick) ? html`<span class="badge grad plain">Streamer-safe</span>` : ''}
            ${d.onelink ? html`<a class="badge accent plain" href="#/l/${d.onelink.handle}">${ico('link')} ${d.onelink.name}'s One Link</a>` : ''}</div></div>
        </div>
        <div class="card" style="overflow:hidden"><div class="card-head"><h3>What's it for?</h3></div>
          ${buyable.map(x => html`<label class="ol-row" style="cursor:pointer;padding-left:18px">
            <input type="radio" name="use" value="${x.use}" ${x.use === pick ? 'checked' : ''} style="accent-color:var(--au-purple);width:18px;height:18px">
            ${useTile(x.use, 40)}
            <div class="grow"><div class="t">${x.label}</div><div class="s">${x.hint}</div></div>
            <div style="text-align:right"><b class="num">${x.oneClick ? money(x.rate) : 'Quote'}</b>
              <div class="small" style="color:${x.oneClick ? '#1F9D4C' : 'var(--muted)'}">${x.oneClick ? 'Ready now' : `${x.in} of ${x.total} said yes`}</div></div></label>`)}
        </div>
      </div>
      <div class="card card-pad stack-lg" style="position:sticky;top:84px">
        ${u ? html`<div class="row" style="gap:12px">${useTile(u.use, 48)}<div><div class="eyebrow">License</div><h3 style="font-size:19px">${u.label}</h3></div></div>
        ${u.oneClick ? html`<div class="pl-price">${money(u.rate)}</div>
          <div class="stack-sm">${u.owners.map(o => html`<div class="row small"><span style="width:18px;height:18px;border-radius:50%;background:#34C759;color:#fff;display:grid;place-items:center">${ico('check', 3)}</span>${o.name} said yes</div>`)}</div>`
        : html`<div class="callout" style="background:var(--surface-2)">${ico('info')}<div class="small">${u.reason}. Send a request and the artist replies with a price.</div></div>`}
        <form class="stack" id="lf">
          ${user ? '' : html`<div class="callout warn small">${ico('info')}<div>Sign in with your email to license.</div></div>`}
          <input class="input" name="project" required placeholder="Project name, e.g. Spring campaign" style="padding:13px">
          <input class="input" name="name" placeholder="Your name or company" value="${user?.name || ''}" style="padding:13px">
          ${u.oneClick ? '' : html`<input class="input" name="budget" placeholder="Budget in $ (optional)" inputmode="decimal" style="padding:13px">`}
          <button class="pl-pay ${u.oneClick ? '' : 'audio'}">${u.oneClick ? html`${ico('lock', 2.2)} License for ${money(u.rate)}` : 'Ask for a quote'}</button>
        </form>
        <div class="pl-fine">${u.oneClick ? 'Your license arrives instantly, signed. Test mode: no card is charged yet.' : 'Everyone who owns the song hears about it at once.'}</div>` : html`<p class="muted">Pick a use.</p>`}
      </div></div>`.s;
  };
  paint();
  on(el, 'change', 'input[name=use]', (e, t) => { pick = t.value; paint(); });
  on(el, 'submit', '#lf', async e => {
    e.preventDefault();
    if (!user) return app.go(`/signin?next=${encodeURIComponent(`/business/song/${s.id}`)}`);
    const u = d.uses.find(x => x.use === pick), v = formData(e.target), btn = e.target.querySelector('button');
    if (u.oneClick) {
      const lic = await busy(btn, () => api.post('/api/business/licenses', { song_id: s.id, use: pick, project: v.project, name: v.name }));
      app.go(`/business/license/${lic.id}?new=1`);
    } else {
      await busy(btn, () => api.post('/api/business/quotes', { song_id: s.id, use: pick, project: v.project, name: v.name, budget: v.budget || undefined }));
      toast('Request sent. You’ll get a price soon.');
      app.go('/business/licenses');
    }
  });
}, { title: 'License' });

// ---------- the license (anyone can verify it) ----------
app.route('/business/license/:id', async ({ el, params, query }) => {
  const { valid, licence: l } = await api(`/api/business/licenses/${params.id}`);
  el.innerHTML = html`<div style="max-width:720px;margin:0 auto" class="stack-lg">
    ${query.get('new') ? html`<div class="pl-done"><div class="pl-check">${ico('check', 2.6)}</div><h1 style="font-size:30px">You're licensed.</h1><p class="muted">Use the song in ${l.project}. Here's your license.</p></div>` : ''}
    <div class="card" style="overflow:hidden">
      <div style="padding:28px;display:flex;gap:18px;align-items:center;background:var(--au-grad);color:#fff">
        <div style="width:76px;height:76px;border-radius:18px;flex:none;${raw(cover(l.title + l.artist_credit))}"></div>
        <div style="flex:1;min-width:0"><div class="eyebrow" style="color:rgba(255,255,255,.7)">${l.useLabel} license</div><h2 style="color:#fff;font-size:24px">${l.title}</h2><div style="opacity:.8">${l.artist_credit}</div></div>
        <span class="badge plain" style="background:${valid ? 'rgba(255,255,255,.95)' : '#fde7e9'};color:${valid ? '#1F9D4C' : '#D12C3B'};padding:6px 12px">${valid ? html`${ico('check', 3)} Verified` : 'Not valid'}</span>
      </div>
      <div class="card-pad stack">
        <dl class="kv"><dt>Licensee</dt><dd>${l.buyer_name}</dd><dt>Project</dt><dd>${l.project}</dd><dt>Paid</dt><dd>${money(l.price)}${l.simulated ? ' (test mode)' : ''}</dd>
          <dt>Issued</dt><dd>${date(l.created_at)}</dd><dt>License no.</dt><dd class="mono">${l.id}</dd>${l.isrc ? html`<dt>ISRC</dt><dd class="mono">${l.isrc}</dd>` : ''}</dl>
        <div class="divider"></div>
        <p style="font-size:14px;line-height:1.6">${l.terms}</p>
        <div class="hash">Seal ${l.doc_hash}</div>
      </div></div>
    <div class="row" style="justify-content:center"><a class="btn" href="#/business/licenses">My licenses</a><a class="btn btn-primary" href="#/business">License more music</a></div></div>`.s;
}, { title: 'License' });

// The old spelling still opens (links already shared).
app.route('/business/licences', () => app.go('/business/licenses'), { auth: true, title: 'My licenses' });
app.route('/business/licence/:id', ({ params, query }) => app.go(`/business/license/${params.id}${query.get('new') ? '?new=1' : ''}`), { title: 'License' });

// ---------- my licenses and quotes ----------
app.route('/business/licenses', async ({ el }) => {
  const d = await api('/api/business/licenses');
  const quoteBadge = { open: ['warn', 'Waiting for a price'], quoted: ['accent', 'Price ready'], paid: ['ok', 'Licensed'], declined: ['', 'Declined'] };
  el.innerHTML = html`<div class="page-head"><div><h1>My licenses</h1></div><a class="btn btn-primary" href="#/business">License music</a></div>
    ${d.quotes.filter(q => q.status !== 'paid').length ? html`<div class="card" style="overflow:hidden;margin-bottom:18px"><div class="card-head"><h3>Requests</h3></div><div class="list">
      ${d.quotes.filter(q => q.status !== 'paid').map(q => html`<div class="list-item">${useTile(q.use, 40)}<div class="grow"><div class="title">${q.title} · ${q.useLabel}</div><div class="sub">${q.project} · ${ago(q.created_at)}${q.reply ? ` · “${q.reply}”` : ''}</div></div>
        <span class="badge ${quoteBadge[q.status][0]} plain">${quoteBadge[q.status][1]}</span>
        ${q.status === 'quoted' ? html`<button class="btn btn-primary btn-sm" data-accept="${q.id}">Pay ${money(q.price)}</button>` : ''}</div>`)}</div></div>` : ''}
    <div class="card" style="overflow:hidden">${(d.licenses || d.licences).length ? html`<div class="list">${(d.licenses || d.licences).map(l => html`<a class="list-item" href="#/business/license/${l.id}">${useTile(l.use, 40)}
      <div class="grow"><div class="title">${l.title}</div><div class="sub">${l.useLabel} · ${l.project} · ${date(l.created_at)}</div></div><b class="num">${money(l.price)}</b>${ico('chev')}</a>`)}</div>`
      : html`<div class="empty"><div class="icon">${ico('receipt')}</div><h3>No licenses yet</h3><p>Licenses you buy show up here, ready to show anyone who asks.</p></div>`}</div>`.s;
  on(el, 'click', '[data-accept]', async (e, t) => { const lic = await busy(t, () => api.post(`/api/business/quotes/${t.dataset.accept}/accept`)); app.go(`/business/license/${lic.id}?new=1`); });
}, { auth: true, title: 'My licenses' });

// ---------- streamers ----------
app.route('/business/streamers', async ({ el, user }) => {
  const d = user ? await api('/api/business/streamer') : { streamer: null, plan: 999, songs: (await api('/api/business/catalogue?use=stream')).songs.filter(s => s.streamerSafe), plays: [] };
  const active = d.streamer?.active;
  const mins = Object.fromEntries((d.plays || []).map(p => [p.song_id, p.minutes]));
  const total = (d.plays || []).reduce((s, p) => s + p.minutes, 0);
  el.innerHTML = html`
    ${comingBar('Streamer licensing')}
    <div class="pl-hero" style="margin-bottom:22px"><h1>Play real artists on stream.</h1>
      <p>No copyright strikes. Every hour a song plays on your stream pays the people who made it.</p>
      ${active ? html`<div class="row wrap" style="margin-top:20px;gap:10px"><span class="badge plain" style="background:rgba(255,255,255,.95);color:#1F9D4C;padding:7px 12px">${ico('check', 3)} ${d.streamer.channel} is cleared</span><span style="opacity:.8">until ${date(d.streamer.active_until)}</span></div>`
        : html`<div style="margin-top:20px;font:800 34px var(--display);letter-spacing:-.03em">${money(d.plan)}<span style="font-size:16px;opacity:.75;font-weight:600"> a month</span></div>`}</div>
    ${active ? html`<div class="grid grid-3" style="margin-bottom:18px">
        <div class="card pl-stat"><div class="v">${(total / 60).toFixed(1)}</div><div class="l">Hours of music this month</div></div>
        <div class="card pl-stat"><div class="v">${d.plays.length}</div><div class="l">Artists you paid</div></div>
        <div class="card pl-stat"><div class="v">${d.songs.length}</div><div class="l">Streamer-safe songs</div></div></div>`
      : html`<form class="card card-pad stack" id="jf" style="margin-bottom:18px"><h3>Clear your channel</h3>
        <div class="row wrap" style="gap:10px"><select class="input" name="platform" style="width:170px">${['Twitch', 'YouTube', 'Kick', 'TikTok Live'].map(p => html`<option>${p}</option>`)}</select>
          <input class="input" name="channel" required placeholder="twitch.tv/yourchannel" style="flex:1;min-width:200px">
          <button class="btn btn-primary">${user ? `Start for ${money(d.plan)}/mo` : 'Sign in to start'}</button></div>
        <div class="small muted">Test mode: no card is charged yet. Channel allow-listing switches on with our distribution partner.</div></form>`}
    <div class="card" style="overflow:hidden"><div class="card-head"><h3>Streamer-safe songs</h3><span class="small muted">${d.songs.length} songs</span></div>
      ${d.songs.length ? html`<div class="list">${d.songs.map(s => html`<div class="list-item"><div class="ol-tile" style="width:46px;height:46px;border-radius:12px;${raw(cover(s.title + s.artist_credit, s.artwork_url))}"></div>
        <div class="grow"><div class="title">${s.title}</div><div class="sub">${s.artist_credit}${mins[s.id] ? ` · ${mins[s.id]} min on your stream this month` : ''}</div></div>
        ${active ? html`<button class="btn btn-sm" data-play="${s.id}">${ico('play')} Now playing</button>` : ''}</div>`)}</div>`
        : html`<div class="empty"><h3>No streamer-safe songs yet</h3></div>`}</div>`.s;
  on(el, 'submit', '#jf', async e => {
    e.preventDefault();
    if (!user) return app.go('/signin?next=/business/streamers');
    await busy(e.target.querySelector('button'), () => api.post('/api/business/streamer', formData(e.target)));
    toast('Your channel is cleared'); app.refresh();
  });
  // Stands in for the stream overlay plugin, which reports plays as they happen.
  on(el, 'click', '[data-play]', async (e, t) => { await busy(t, () => api.post('/api/business/streamer/plays', { song_id: t.dataset.play, minutes: 3 })); toast('Logged 3 minutes'); app.refresh(); });
}, { title: 'Streamers' });

// ---------- the artist's side: a Licensing tab on every signed passport ----------
app.songTab({
  id: 'business', label: 'Licensing', order: 65,
  show: (song, { canManage, isContributor }) => song.status !== 'draft' && (canManage || isContributor),
  render: async ({ el, song, canManage }) => {
    const paint = async () => {
      const d = await api(`/api/songs/${song.id}/business`);
      const listed = d.card.filter(c => c.listed);
      el.innerHTML = html`<div class="split-main">
        <div class="stack-lg">
          ${!d.signed ? html`<div class="callout warn">${ico('info')}<div>Get the split signed first. Then everyone on it can say yes to licensing.</div></div>` : ''}
          <div class="card" style="overflow:hidden">
            <div class="card-head"><div><h3>Your rate card</h3><div class="small muted">Turn on what businesses can license, and set your price.</div></div>
              ${canManage ? html`<button class="btn btn-primary btn-sm" data-save>Save</button>` : ''}</div>
            ${d.card.map(c => html`<div class="ol-row" style="padding-left:18px" data-use="${c.use}">
              ${useTile(c.use, 40)}
              <div class="grow"><div class="t">${c.label}</div><div class="s">${c.hint}</div></div>
              ${c.listed ? html`<span class="small" style="color:${c.oneClick ? '#1F9D4C' : 'var(--muted)'};min-width:96px;text-align:right">${c.oneClick ? 'Ready now' : `${c.yes} of ${c.total} said yes`}</span>` : ''}
              ${c.use === 'stream' ? html`<span class="small muted" style="width:110px;text-align:right">Paid by hours</span>`
                : html`<div style="position:relative;width:110px"><span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);color:var(--muted)">$</span>
                  <input class="input num" name="price" value="${c.price != null ? (c.price / 100).toFixed(0) : (USES_SUGGEST[c.use] / 100).toFixed(0)}" ${canManage ? '' : 'disabled'} inputmode="decimal" style="padding-left:24px;text-align:right"></div>`}
              <button class="toggle ${c.listed ? 'on' : ''}" ${canManage ? '' : 'disabled'} data-toggle aria-label="${c.label}"></button></div>`)}
          </div>
          ${(d.licenses || d.licences).length ? html`<div class="card" style="overflow:hidden"><div class="card-head"><h3>Licenses sold</h3></div><div class="list">${(d.licenses || d.licences).map(l => html`<a class="list-item" href="#/business/license/${l.id}">${useTile(l.use, 36)}
            <div class="grow"><div class="title">${l.buyer_name}</div><div class="sub">${l.project} · ${ago(l.created_at)}</div></div><div style="text-align:right"><b class="num">${money(l.price)}</b><div class="small" style="color:var(--money)">${money(l.net)} to the wallet</div></div></a>`)}</div></div>` : ''}
          ${d.quotes.filter(q => q.status === 'open').length ? html`<div class="card" style="overflow:hidden"><div class="card-head"><h3>Requests</h3></div><div class="list">${d.quotes.filter(q => q.status === 'open').map(q => html`<div class="list-item">${useTile(q.use, 36)}
            <div class="grow"><div class="title">${q.buyer_name} · ${q.project}</div><div class="sub">${q.budget ? `Budget ${money(q.budget)}` : 'No budget given'}${q.message ? ` · ${q.message}` : ''}</div></div>
            <button class="btn btn-sm" data-decline="${q.id}">Decline</button><button class="btn btn-primary btn-sm" data-quote="${q.id}" data-budget="${q.budget || ''}">Send a price</button></div>`)}</div></div>` : ''}
        </div>
        <div class="stack-lg">
          <div class="card card-pad stack">
            <h3>Who said yes</h3>
            ${d.owners.length ? d.owners.map(o => html`<div class="row"><div class="avatar" style="background:var(--au-grad)">${o.name.split(/\s+/).map(w => w[0]).join('').slice(0, 2)}</div>
              <div style="flex:1;min-width:0"><b>${o.name}</b><div class="small muted">${o.uses.length ? (listed.every(c => o.uses.includes(c.use)) ? 'Yes to everything' : `Yes to ${listed.filter(c => o.uses.includes(c.use)).length} of ${listed.length}`) : o.asked_at ? 'Asked, no answer yet' : 'Not asked yet'}</div></div>
              ${listed.length && listed.every(c => o.uses.includes(c.use)) ? html`<span style="color:#1F9D4C">${ico('check', 2.6)}</span>` : ''}</div>`) : html`<p class="small muted">Everyone on the signed split shows up here.</p>`}
            ${canManage && d.owners.length ? html`<button class="btn" data-ask>Ask everyone</button>` : ''}
          </div>
          ${d.me ? html`<div class="card card-pad stack"><h3>Your say</h3><p class="small muted">Which uses do you agree to? Change it any time. Licenses already sold stay valid.</p>
            ${listed.map(c => html`<label class="check"><input type="checkbox" name="mine" value="${c.use}" ${d.me.uses.includes(c.use) ? 'checked' : ''}><span>${c.label}${c.use === 'stream' ? '' : html` <span class="muted">· ${money(c.price)}</span>`}</span></label>`)}
            ${listed.length ? html`<label class="check small"><input type="checkbox" name="consent"><span>I agree that Audius may license my share for the uses I ticked, until I untick them.</span></label>
              <button class="btn btn-primary" data-mine>Agree</button>` : html`<p class="small muted">Nothing is switched on yet.</p>`}</div>` : ''}
          <div class="card card-pad small muted">We keep 15% of each license. The rest splits by your signed passport the same day.</div>
        </div></div>`.s;
      return d;
    };
    let d = await paint();
    on(el, 'click', '[data-toggle]', (e, t) => t.classList.toggle('on'));
    on(el, 'click', '[data-save]', async (e, t) => {
      const rates = {};
      el.querySelectorAll('[data-use]').forEach(r => { const on = r.querySelector('[data-toggle]').classList.contains('on'); rates[r.dataset.use] = on ? { price: r.querySelector('[name=price]')?.value || '0' } : { listed: false }; });
      await busy(t, () => api.put(`/api/songs/${song.id}/business/rates`, { rates }));
      toast('Rate card saved'); d = await paint();
    });
    on(el, 'click', '[data-ask]', async (e, t) => { const r = await busy(t, () => api.post(`/api/songs/${song.id}/business/ask`)); toast(r.sent ? `Sent to ${r.sent} ${r.sent === 1 ? 'person' : 'people'}` : 'Everyone has already answered'); d = await paint(); });
    on(el, 'click', '[data-mine]', async (e, t) => {
      const uses = [...el.querySelectorAll('[name=mine]:checked')].map(i => i.value);
      await busy(t, () => api.put(`/api/songs/${song.id}/business/optin`, { uses, consent: el.querySelector('[name=consent]').checked }));
      toast('Saved'); d = await paint();
    });
    on(el, 'click', '[data-quote]', async (e, t) => {
      const r = await modal({ title: 'Send a price', body: html`<form id="qf" class="stack"><label class="field"><span>Price ($)</span><input class="input" name="price" required value="${t.dataset.budget ? (t.dataset.budget / 100).toFixed(0) : ''}" inputmode="decimal"></label>
        <label class="field"><span>Message <span class="hint">optional</span></span><input class="input" name="reply"></label></form>`,
        actions: [{ label: 'Cancel', value: null }, { label: 'Send', primary: true, onClick: (c, m) => { const f = m.querySelector('#qf'); if (!f.reportValidity()) return false; return api.post(`/api/quotes/${t.dataset.quote}/reply`, formData(f)); } }] });
      if (r?.ok) { toast('Price sent'); d = await paint(); }
    });
    on(el, 'click', '[data-decline]', async (e, t) => { await busy(t, () => api.post(`/api/quotes/${t.dataset.decline}/reply`, { action: 'decline' })); d = await paint(); });
  }
});
const USES_SUGGEST = { creator: 2500, stream: 0, podcast: 4900, ad: 150000, game: 50000, film: 250000, ai: 1500 };

// ---------- the emailed opt-in (no account needed) ----------
app.route('/optin/:token', async ({ el, params }) => {
  const d = await api(`/api/optin/${params.token}`);
  const share = d.share ? Math.max(d.share.master_bps, d.share.publishing_bps) / 100 : null;
  el.innerHTML = html`<div class="card card-pad stack-lg" style="max-width:520px;margin:0 auto">
    <div class="row" style="gap:16px"><div style="width:72px;height:72px;border-radius:18px;flex:none;${raw(cover(d.song.title + d.song.artist_credit, d.song.artwork_url))}"></div>
      <div><div class="eyebrow">Licensing</div><h2>${d.song.title}</h2><div class="muted">${d.song.artist_credit}</div></div></div>
    <p style="font-size:16px">Hi ${d.name.split(' ')[0]}. Can businesses license this song without weeks of email? Pick the uses you're happy with.${share ? ` You get your ${share}% of every license, the same day.` : ''}</p>
    <form class="stack" id="of">
      <div class="card" style="overflow:hidden">${d.card.map(c => html`<label class="ol-row" style="padding-left:14px;cursor:pointer">${useTile(c.use, 38)}
        <div class="grow"><div class="t">${c.label}</div><div class="s">${c.use === 'stream' ? 'Paid by hours played' : money(c.price)}</div></div>
        <input type="checkbox" name="uses" value="${c.use}" ${d.uses.includes(c.use) || (!d.uses.length && c.use !== 'ai') ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--au-purple)"></label>`)}</div>
      <label class="check small"><input type="checkbox" name="consent" required><span>I agree that Audius may license my share for the uses I ticked, until I untick them. Licenses already sold stay valid.</span></label>
      <button class="pl-pay">Agree</button>
      <div class="pl-fine">No account needed. You can change this any time from the same link.</div>
    </form><div id="done"></div></div>`.s;
  el.querySelector('#of').addEventListener('submit', async e => {
    e.preventDefault();
    const uses = [...e.target.querySelectorAll('[name=uses]:checked')].map(i => i.value);
    await busy(e.target.querySelector('button'), () => api.post(`/api/optin/${params.token}`, { uses, consent: true }));
    el.querySelector('#done').innerHTML = html`<div class="pl-done"><div class="pl-check">${ico('check', 2.6)}</div><h3>Thanks, ${d.name.split(' ')[0]}.</h3><p class="muted">${uses.length ? 'Businesses can now license it for what you ticked.' : 'You opted out. Nothing will be licensed in your name.'}</p></div>`.s;
    e.target.remove();
  });
}, { public: true, title: 'Licensing' });
