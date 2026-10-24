// Releases: build a release from your passports, pass preflight, deliver to stores, watch it go live.
// Money from a live release lands in each song's Song Wallet and is split the same day.
import { useArtistCss } from './00-home.js';
import { app, html, raw, api, upload, toast, modal, confirmDialog, icon, on, busy, art, date, dateTime, ago, duration, bytes, formData, artStyle } from '../app.js';

app.nav({ id: 'releases', label: 'Releases', href: '/releases', icon: 'rocket', section: 'Money', order: 20, auth: true , artist: true });

// ---------- styles (prefixed, injected once) ----------
if (!document.getElementById('rl-style')) {
  const st = document.createElement('style');
  st.id = 'rl-style';
  st.textContent = `
  :where(.rl-root) svg { width: 1em; height: 1em; flex: none; vertical-align: -0.125em; }
  .rl-root .stat .label svg { width: 15px; height: 15px; }
  .rl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 18px; }
  .rl-card { display: flex; flex-direction: column; gap: 12px; padding: 14px; color: inherit; transition: transform .15s ease, box-shadow .15s ease; }
  .rl-card:hover { text-decoration: none; transform: translateY(-2px); box-shadow: var(--shadow); }
  .rl-cover { position: relative; width: 100%; aspect-ratio: 1; border-radius: 14px; overflow: hidden; display: grid; place-items: center; color: #fff;
    font: 800 42px var(--display); letter-spacing: -.03em; background-size: cover; background-position: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,.08); }
  .rl-cover .rl-cover-badge { position: absolute; left: 10px; top: 10px; }
  .rl-cover.xl { width: 260px; flex: none; border-radius: 22px; box-shadow: var(--shadow-lg); font-size: 72px; }
  .rl-cover.sm { width: 64px; flex: none; border-radius: 12px; font-size: 20px; }
  .rl-meter { height: 5px; border-radius: 99px; background: var(--surface-3); overflow: hidden; display: flex; gap: 2px; }
  .rl-meter i { display: block; height: 100%; }
  .rl-steps { display: flex; gap: 6px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 2px; }
  .rl-step { flex: 1; min-width: 132px; display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface);
    color: var(--muted); font-weight: 600; font-size: 13.5px; cursor: pointer; text-align: left; }
  .rl-step:hover { color: var(--fg); text-decoration: none; }
  .rl-step .n { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font: 700 12px var(--mono); background: var(--surface-3); color: var(--fg-2); flex: none; }
  .rl-step.on { border-color: var(--accent); color: var(--fg); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent); }
  .rl-step.on .n { background: var(--grad); color: #fff; }
  .rl-step.done .n { background: var(--ok-soft); color: var(--ok); }
  .rl-step.off { opacity: .45; pointer-events: none; }
  .rl-track { display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid var(--line); background: var(--surface); }
  .rl-track:last-child { border-bottom: 0; }
  .rl-track.dragging { opacity: .4; }
  .rl-track.over { box-shadow: inset 0 2px 0 var(--accent); }
  .rl-track .handle { cursor: grab; color: var(--faint); display: grid; place-items: center; }
  .rl-track .pos { width: 22px; text-align: center; font: 600 13px var(--mono); color: var(--muted); }
  .rl-track .grow { flex: 1; min-width: 0; }
  .rl-track .title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rl-stores { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
  .rl-store { display: flex; gap: 12px; align-items: center; padding: 12px 14px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface); cursor: pointer; transition: border-color .15s, background .15s; }
  .rl-store:hover { border-color: var(--line-strong); }
  .rl-store.on { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 6%, var(--surface)); }
  .rl-store input { accent-color: var(--accent); width: 16px; height: 16px; margin: 0; flex: none; }
  .rl-logo { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: #fff; font: 800 13px var(--display); flex: none; }
  .rl-store .nm { font-weight: 600; font-size: 14px; line-height: 1.25; }
  .rl-store .nt { font-size: 12px; color: var(--muted); line-height: 1.3; }
  .rl-chip { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; border: 1px solid var(--line); background: var(--surface-2); min-width: 0; }
  .rl-chip .grow { flex: 1; min-width: 0; }
  .rl-chip .nm { font-weight: 600; font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rl-chip .sub { font-size: 11.5px; color: var(--muted); }
  .rl-check { display: flex; gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--line); align-items: flex-start; }
  .rl-check:last-child { border-bottom: 0; }
  .rl-check .ic { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; flex: none; margin-top: 1px; }
  .rl-check .ic svg { width: 14px; height: 14px; }
  .rl-check.pass .ic { background: var(--ok-soft); color: var(--ok); }
  .rl-check.block .ic { background: var(--crit-soft); color: var(--crit); }
  .rl-check.warn .ic { background: var(--warn-soft); color: var(--warn); }
  .rl-check .grow { flex: 1; min-width: 0; }
  .rl-check .t { font-weight: 600; }
  .rl-check .w { font-size: 13px; color: var(--muted); margin-top: 2px; }
  .rl-hero { padding: 28px; display: flex; gap: 30px; align-items: flex-end; flex-wrap: wrap;
    background: radial-gradient(80% 140% at 0% 0%, color-mix(in srgb, var(--violet) 18%, transparent), transparent 60%), radial-gradient(60% 120% at 100% 100%, color-mix(in srgb, var(--blue) 12%, transparent), transparent 60%); }
  .rl-hero h1 { font-size: clamp(2rem, 1.4rem + 2vw, 3.2rem); }
  .rl-countries { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 6px 14px; max-height: 300px; overflow-y: auto; padding: 4px; }
  .rl-sim { background: var(--surface-3); color: var(--muted); }
  .rl-drop { min-height: 260px; display: grid; place-items: center; }
  .rl-specs li { margin: 6px 0; }
  .rl-foot { display: flex; justify-content: space-between; gap: 10px; padding: 16px 22px; border-top: 1px solid var(--line); flex-wrap: wrap; }
  @media (max-width: 720px) {
    .rl-money { flex-wrap: wrap; }
    .rl-money .grow { flex-basis: calc(100% - 40px); }
    .rl-cover.xl { width: 100%; max-width: 340px; }
    .rl-hero { padding: 18px; gap: 18px; }
    .rl-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .rl-card { padding: 10px; }
    .rl-step { min-width: auto; padding: 9px 11px; }
    .rl-step .lbl { display: none; }
    .rl-step.on .lbl { display: inline; }
    .rl-track { padding: 10px 12px; gap: 9px; }
    .rl-track .hide-sm { display: none; }
  }`;
  document.head.appendChild(st);
}

// ---------- shared bits ----------
let CFG = null;
const cfg = async () => CFG || (CFG = await api('/api/releases/config'));
const STEPS = [['details', 'Details'], ['tracks', 'Tracks'], ['artwork', 'Artwork'], ['stores', 'Stores'], ['review', 'Review & submit']];
const TYPE_LABEL = { single: 'Single', ep: 'EP', album: 'Album' };
const STATUS = {
  draft: ['', 'Draft'], submitted: ['info', 'Submitted'], processing: ['warn', 'Processing'], delivered: ['info', 'Delivered'], live: ['ok', 'Live'],
  takedown: ['crit', 'Taken down'], rejected: ['crit', 'Needs changes'], takedown_requested: ['warn', 'Removing'], removed: ['', 'Removed']
};
const badge = s => { const [c, l] = STATUS[s] || ['', s]; return html`<span class="badge ${c}">${l}</span>`; };
const STORE_COLORS = { audius: '#CC0FE0', spotify: '#1DB954', apple_music: '#FA243C', amazon_music: '#25D1DA', youtube_music: '#FF0000', deezer: '#A238FF', tidal: '#111111',
  tiktok: '#161823', meta: '#E1306C', soundcloud: '#FF5500', pandora: '#224099', boomplay: '#1E5BFF', anghami: '#8E44AD', shazam: '#0088FF' };
const logo = (id, name) => html`<span class="rl-logo" style="background:${STORE_COLORS[id] || '#555'}">${(name || id).replace(/[^A-Za-z]/g, '').slice(0, 2)}</span>`;
const initialsOf = s => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const cover = (r, size = '', extra = '') => r.artwork_url
  ? html`<div class="rl-cover ${size}" style="background-image:url('${r.artwork_url}')" role="img" aria-label="Cover art for ${r.title}">${raw(extra)}</div>`
  : html`<div class="rl-cover ${size}" style="${artStyle(r.title + r.primary_artist)}">${initialsOf(r.title)}${raw(extra)}</div>`;
const simBadge = p => p?.simulated ? html`<span class="badge plain rl-sim" title="No distribution partner credentials are configured on this server. Store statuses follow a realistic delivery schedule.">${icon('info')} Simulated delivery</span>` : '';
const artistLine = r => r.primary_artist + (r.featured_artists?.length ? ` feat. ${r.featured_artists.join(', ')}` : '');
const STAGE_COLOR = { live: 'var(--ok)', delivered: 'var(--info)', processing: 'var(--warn)', submitted: 'var(--line-strong)' };
function meter(deliveries) {
  if (!deliveries?.length) return '';
  const order = ['live', 'delivered', 'processing', 'submitted'];
  const sorted = [...deliveries].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  return html`<div class="rl-meter">${sorted.map(d => html`<i style="flex:1;background:${STAGE_COLOR[d.status] || 'var(--surface-3)'}"></i>`)}</div>`;
}
function mount(el) { el.innerHTML = '<div class="rl-root"></div>'; return el.firstChild; }

// ---------- list ----------
app.route('/releases', async ({ el }) => {
  const [{ items, partner }] = await Promise.all([api('/api/releases'), cfg()]);
  const root = mount(el);
  const count = s => items.filter(r => s.includes(r.status)).length;
  const storesLive = items.reduce((n, r) => n + (r.deliveries || []).filter(d => d.status === 'live').length, 0);
  root.innerHTML = html`
  <div class="page-head">
    <div><div class="eyebrow">Distribution</div><h1>Releases</h1>
      <p class="lede">Put your music in every store from the passports you already have. Money from each release lands in its songs' wallets and is split the same day.</p></div>
    <div class="row wrap">${simBadge(partner)}<a class="btn btn-primary" href="#/releases/new">${icon('plus')} New release</a></div>
  </div>
  ${items.length ? html`
  <div class="grid grid-4" style="margin-bottom:22px">
    <div class="card stat"><div class="label">${icon('edit')} Drafts</div><div class="value">${count(['draft', 'rejected'])}</div><div class="sub">Being built</div></div>
    <div class="card stat"><div class="label">${icon('clock')} In delivery</div><div class="value">${count(['submitted', 'processing', 'delivered'])}</div><div class="sub">On the way to stores</div></div>
    <div class="card stat"><div class="label">${icon('rocket')} Live</div><div class="value">${count(['live'])}</div><div class="sub">Earning now</div></div>
    <div class="card stat"><div class="label">${icon('globe')} Store placements</div><div class="value">${storesLive}</div><div class="sub">Live across all releases</div></div>
  </div>
  <div class="rl-grid">${items.map(r => html`<a class="card rl-card" href="#/releases/${r.id}">
    ${cover(r, '', html`<span class="rl-cover-badge">${badge(r.status)}</span>`.s)}
    <div class="stack-sm" style="gap:3px">
      <div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.title}</div>
      <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${artistLine(r)}</div>
      <div class="tiny faint">${TYPE_LABEL[r.type]} · ${r.track_count} track${r.track_count === 1 ? '' : 's'}${r.release_date ? ` · ${date(r.release_date)}` : ''}</div>
    </div>
    ${meter(r.deliveries)}
  </a>`)}</div>`
  : html`<div class="card"><div class="empty" style="padding:64px 20px">
      <div class="icon">${icon('rocket')}</div><h2 class="h3">Your first release</h2>
      <p style="max-width:460px;margin:0 auto">Pick songs you manage, add cover art, choose stores. We check codes and signed splits before anything ships, so every payment can be split the moment it arrives.</p>
      <div class="row wrap" style="justify-content:center;margin-top:20px;gap:18px">
        ${[['music', 'Pick tracks'], ['shield', 'Pass preflight'], ['globe', 'Deliver to 14 stores'], ['wallet', 'Paid same day']].map(([i, l]) => html`<span class="row small" style="gap:6px">${icon(i)} ${l}</span>`)}
      </div>
      <a class="btn btn-primary btn-lg" style="margin-top:24px" href="#/releases/new">${icon('plus')} Start a release</a></div></div>`}`.s;
}, { auth: true, title: 'Releases' });

// ---------- new / edit / view ----------
app.route('/releases/new', async ({ el, query }) => {
  const c = await cfg();
  const draft = { id: null, title: '', type: 'single', primary_artist: app.artists?.[0]?.name || '', featured_artists: [], label_name: '', release_date: '', genre: '', language: 'en',
    copyright_p: '', copyright_c: '', stores: c.stores.map(s => s.id), territories: ['Worldwide'], price_tier: 'standard', status: 'draft' };
  renderEditor(el, { release: draft, tracks: [], canEdit: true, partner: c.partner }, 'details', c);
}, { auth: true, title: 'New release' });

app.route('/releases/:id', async ({ el, params, query, isCurrent }) => {
  const [data, c] = await Promise.all([api(`/api/releases/${params.id}`), cfg()]);
  if (data.canEdit && ['draft', 'rejected'].includes(data.release.status) && query.get('view') !== '1')
    return renderEditor(el, data, query.get('step') || 'details', c);
  renderReleasePage(el, data, c, isCurrent);
}, { auth: true, title: 'Release' });

// ---------- editor ----------
function renderEditor(el, data, step, c) {
  const root = mount(el);
  let { release: r, tracks } = data;
  if (!STEPS.find(s => s[0] === step)) step = 'details';
  if (!r.id) step = 'details';
  let pf = null;
  const go = s => app.go(`/releases/${r.id}?step=${s}`);

  const paint = async () => {
    if (r.id && !pf) pf = await api(`/api/releases/${r.id}/preflight`).catch(() => null);
    const stepDone = { details: !!(r.title && r.genre && r.release_date && r.upc), tracks: tracks.length > 0 && pf?.items.filter(i => ['isrc', 'splits', 'track_claimed'].includes(i.code)).every(i => i.ok),
      artwork: pf?.items.find(i => i.code === 'artwork')?.ok, stores: (r.stores || []).length > 0, review: false };
    root.innerHTML = html`
    <div class="page-head" style="margin-bottom:18px">
      <div class="stack-sm"><a href="#/releases" class="small muted row" style="gap:4px">${icon('back')} Releases</a>
        <div class="row wrap"><h1>${r.title || 'New release'}</h1>${badge(r.status)}</div>
        ${r.status === 'rejected' ? html`<div class="callout crit" style="margin-top:8px">${icon('alert')}<div><b>Sent back for changes.</b> ${r.rejection_reason || ''} Fix it and submit again.</div></div>` : ''}</div>
      ${r.id ? html`<div class="row wrap">${pf ? html`<span class="badge ${pf.ok ? 'ok' : 'crit'}">${pf.ok ? 'Ready to submit' : `${pf.blockers} to fix`}</span>` : ''}</div>` : ''}
    </div>
    <nav class="rl-steps">${STEPS.map(([k, label], i) => html`<a class="rl-step ${k === step ? 'on' : ''} ${stepDone[k] && k !== step ? 'done' : ''} ${!r.id && k !== 'details' ? 'off' : ''}" href="#/releases/${r.id}?step=${k}">
      <span class="n">${stepDone[k] && k !== step ? icon('check') : i + 1}</span><span class="lbl">${label}</span></a>`)}</nav>
    <div id="rl-step"></div>`.s;
    const box = root.querySelector('#rl-step');
    const ctx = { r, tracks, pf, c, box, go, set: d => { r = d.release; tracks = d.tracks; pf = null; }, repaint: async () => { pf = null; await paint(); } };
    await ({ details: stepDetails, tracks: stepTracks, artwork: stepArtwork, stores: stepStores, review: stepReview }[step])(ctx);
  };
  paint().catch(e => { root.innerHTML = html`<div class="callout crit">${icon('alert')}<div>${e.message}</div></div>`.s; });
}

const foot = (back, next, nextLabel = 'Save and continue') => html`<div class="rl-foot">
  ${back ? html`<a class="btn btn-ghost" href="${back}">${icon('back')} Back</a>` : html`<span></span>`}
  <button class="btn btn-primary" data-act="next">${nextLabel} ${icon('arrow')}</button></div>`;

// Step 1: details.
async function stepDetails({ r, c, box, go, set }) {
  const year = new Date().getFullYear();
  box.innerHTML = html`<div class="card">
    <div class="card-head"><div><h2 class="h3">Release details</h2><div class="small muted">This is what stores show. Keep it exactly as you want it to appear.</div></div></div>
    <form class="card-body form-grid" id="rl-f" autocomplete="off">
      <label class="field full"><span>Release title</span><input class="input" name="title" required maxlength="200" value="${r.title}" placeholder="e.g. Night Drive"></label>
      <div class="field full"><span>Type</span>
        <div class="seg" id="rl-type">${c.types.map(t => html`<button type="button" data-type="${t}" class="${r.type === t ? 'on' : ''}">${TYPE_LABEL[t]}</button>`)}</div>
        <input type="hidden" name="type" value="${r.type}"><span class="hint">Single: 1 to 3 tracks. EP: up to 6 tracks under 30 minutes. Album: 7+ tracks or over 30 minutes.</span></div>
      <label class="field"><span>Primary artist</span><input class="input" name="primary_artist" required list="rl-artists" value="${r.primary_artist}">
        <datalist id="rl-artists">${(app.artists || []).map(a => html`<option value="${a.name}">`)}</datalist></label>
      <label class="field"><span>Featured artists <span class="hint">comma separated</span></span><input class="input" name="featured_artists" value="${(r.featured_artists || []).join(', ')}" placeholder="Leave blank if none"></label>
      <label class="field"><span>Label</span><input class="input" name="label_name" value="${r.label_name || ''}" placeholder="Your label, or your artist name if self-released"></label>
      <label class="field"><span>Catalog number <span class="hint">optional</span></span><input class="input mono" name="catalog_number" value="${r.catalog_number || ''}"></label>
      <label class="field"><span>Release date</span><input class="input" type="date" name="release_date" required min="${r.original_release_date ? '' : c.today}" value="${r.release_date || ''}">
        <span class="hint">Pick a date 3 to 4 weeks out so you can pitch to Spotify editorial and open Apple pre-orders.</span></label>
      <div class="field"><span>Previously released?</span>
        <label class="check"><input type="checkbox" id="rl-prev" ${r.original_release_date ? 'checked' : ''}><span class="small">Yes, this came out before</span></label>
        <input class="input ${r.original_release_date ? '' : 'hidden'}" type="date" name="original_release_date" value="${r.original_release_date || ''}" aria-label="Original release date"></div>
      <label class="field"><span>Genre</span><select class="input" name="genre" required><option value="">Choose a genre</option>${c.genres.map(g => html`<option ${r.genre === g ? 'selected' : ''}>${g}</option>`)}</select></label>
      <label class="field"><span>Language of lyrics</span><select class="input" name="language">${c.languages.map(([v, l]) => html`<option value="${v}" ${r.language === v ? 'selected' : ''}>${l}</option>`)}</select></label>
      <label class="field"><span>℗ line <span class="hint">who owns the recording</span></span><input class="input" name="copyright_p" value="${r.copyright_p || ''}" placeholder="${year} Your Label"></label>
      <label class="field"><span>© line <span class="hint">who owns the artwork and packaging</span></span><input class="input" name="copyright_c" value="${r.copyright_c || ''}" placeholder="${year} Your Label"></label>
      <div class="field"><span>UPC barcode</span>
        <div class="row"><input class="input mono" name="upc" value="${r.upc || ''}" placeholder="12 digits" inputmode="numeric" style="flex:1">
        ${r.id && c.upcPrefix && !r.upc ? html`<button type="button" class="btn" data-act="upc">${icon('sparkle')} Assign</button>` : ''}</div>
        <span class="hint">${c.upcPrefix ? 'Leave blank and press Assign to get one from our GS1 range.' : 'Enter the UPC your label or GS1 issued. We check the check digit.'}</span></div>
      <label class="field"><span>Download price</span><select class="input" name="price_tier">${c.priceTiers.map(p => html`<option value="${p}" ${r.price_tier === p ? 'selected' : ''}>${p[0].toUpperCase() + p.slice(1)}</option>`)}</select></label>
      <label class="check full"><input type="checkbox" name="explicit" ${r.explicit ? 'checked' : ''}><span>Explicit lyrics <span class="small muted">(shows the E label in stores)</span></span></label>
    </form>
    ${foot(null, true)}</div>`.s;
  const f = box.querySelector('#rl-f');
  on(box, 'click', '#rl-type button', (e, b) => {
    box.querySelectorAll('#rl-type button').forEach(x => x.classList.toggle('on', x === b));
    f.type.value = b.dataset.type;
  });
  box.querySelector('#rl-prev').addEventListener('change', e => {
    f.original_release_date.classList.toggle('hidden', !e.target.checked);
    if (!e.target.checked) f.original_release_date.value = '';
    f.release_date.min = e.target.checked ? '' : f.release_date.min || '';
  });
  // Prefill ℗/© from the label as the user types, until they edit them.
  f.label_name.addEventListener('input', () => {
    for (const k of ['copyright_p', 'copyright_c']) if (!f[k].dataset.touched) f[k].value = f.label_name.value ? `${year} ${f.label_name.value}` : '';
  });
  for (const k of ['copyright_p', 'copyright_c']) f[k].addEventListener('input', () => { f[k].dataset.touched = '1'; });
  on(box, 'click', '[data-act=upc]', async (e, b) => {
    const res = await busy(b, () => api.post(`/api/releases/${r.id}/upc`));
    f.upc.value = res.upc; b.remove(); toast(`UPC ${res.upc} assigned`);
  });
  on(box, 'click', '[data-act=next]', async (e, b) => {
    if (!f.reportValidity()) return;
    const d = formData(f);
    const body = { ...d, explicit: !!f.explicit.checked, featured_artists: d.featured_artists, original_release_date: f.querySelector('#rl-prev').checked ? d.original_release_date : '' };
    if (!body.label_name) body.label_name = body.primary_artist;
    if (!body.copyright_p) body.copyright_p = `${year} ${body.label_name}`;
    if (!body.copyright_c) body.copyright_c = body.copyright_p;
    await busy(b, async () => {
      let res;
      if (!r.id) {
        res = await api.post('/api/releases', { title: body.title, primary_artist: body.primary_artist, type: body.type, genre: body.genre || undefined, release_date: body.release_date || undefined });
        res = await api.patch(`/api/releases/${res.release.id}`, body);
        set(res); toast('Release started'); app.go(`/releases/${res.release.id}?step=tracks`);
      } else {
        res = await api.patch(`/api/releases/${r.id}`, body);
        set(res); go('tracks');
      }
    });
  });
}

// Step 2: tracks.
async function stepTracks({ r, tracks, pf, c, box, go, set, repaint }) {
  const { songs } = await api('/api/my/songs');
  const pick = songs.filter(s => s.manage && s.status !== 'draft');
  const splitOf = id => pf?.tracks.find(t => t.song_id === id)?.split || null;
  let filter = '';
  const order = () => tracks.map(t => t.id);
  const save = async ids => {
    const res = await api.put(`/api/releases/${r.id}/tracks`, { song_ids: ids });
    set(res); await repaint();
  };
  const splitBadge = s => s === 'executed' ? html`<span class="badge ok">Splits signed</span>` : s === 'out_for_signature' ? html`<span class="badge warn">Awaiting signatures</span>` : html`<span class="badge crit">${s === 'draft' ? 'Splits draft' : 'No signed splits'}</span>`;
  const paintPicker = () => {
    const inRel = new Set(order());
    const q = filter.toLowerCase();
    const list = pick.filter(s => !inRel.has(s.id) && (!q || `${s.title} ${s.artist_credit}`.toLowerCase().includes(q)));
    box.querySelector('#rl-pick').innerHTML = list.length ? html`${list.slice(0, 60).map(s => html`<div class="list-item" style="padding:10px 18px">
      ${art(s.title + s.artist_credit, { url: s.artwork_url, label: s.title })}
      <div class="grow"><div class="title">${s.title}${s.version_title ? html` <span class="muted">(${s.version_title})</span>` : ''}</div><div class="sub">${s.artist_credit}${s.isrc ? ` · ${s.isrc}` : ''}</div></div>
      <button class="btn btn-sm" data-act="add" data-id="${s.id}">${icon('plus')} Add</button></div>`)}`.s
      : html`<div class="empty" style="padding:30px 16px"><div class="icon">${icon('music')}</div><p>${pick.length ? (q ? 'No songs match.' : 'Every song you manage is on this release.') : 'You don\'t manage any claimed passports yet.'}</p>
        <a class="btn btn-sm" style="margin-top:12px" href="#/home">Find or create a passport</a></div>`.s;
  };
  box.innerHTML = html`<div class="split-main">
    <div class="card">
      <div class="card-head"><div><h2 class="h3">Tracklist</h2><div class="small muted">Drag to reorder. Every track needs an ISRC and fully signed splits.</div></div><span class="badge plain">${tracks.length} track${tracks.length === 1 ? '' : 's'} · ${duration(tracks.reduce((s, t) => s + (t.duration_ms || 0), 0)) || '0:00'}</span></div>
      <div id="rl-tl">${tracks.length ? tracks.map((t, i) => {
        const sp = splitOf(t.id);
        return html`<div class="rl-track" draggable="true" data-id="${t.id}">
          <span class="handle hide-sm" title="Drag to reorder">${icon('menu')}</span>
          <span class="pos">${i + 1}</span>
          ${art(t.title + t.artist_credit, { url: t.artwork_url, label: t.title })}
          <div class="grow"><div class="title"><a href="#/song/${t.id}" style="color:inherit">${t.title}</a>${t.version_title ? html` <span class="muted">(${t.version_title})</span>` : ''}</div>
            <div class="row wrap" style="gap:6px;margin-top:4px">
              ${t.isrc ? html`<span class="chip">${t.isrc}</span>` : c.isrcPrefix ? html`<button class="btn btn-sm" data-act="isrc" data-id="${t.id}">${icon('sparkle')} Assign ISRC</button>` : html`<a class="badge crit" href="#/song/${t.id}">No ISRC</a>`}
              ${pf ? (sp === 'executed' ? splitBadge(sp) : html`<a href="#/song/${t.id}?tab=splits">${splitBadge(sp)}</a>`) : ''}
            </div></div>
          <span class="small muted num hide-sm">${duration(t.duration_ms) || '—'}</span>
          <div class="row" style="gap:2px">
            <button class="btn btn-ghost btn-icon btn-sm" data-act="up" data-i="${i}" title="Move up" ${i === 0 ? 'disabled' : ''}>${raw('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg>')}</button>
            <button class="btn btn-ghost btn-icon btn-sm" data-act="down" data-i="${i}" title="Move down" ${i === tracks.length - 1 ? 'disabled' : ''}>${raw('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>')}</button>
            <button class="btn btn-ghost btn-icon btn-sm btn-danger" data-act="remove" data-id="${t.id}" title="Remove">${icon('x')}</button>
          </div></div>`;
      }) : html`<div class="empty" style="padding:44px 20px"><div class="icon">${icon('disc')}</div><h2 class="h3">No tracks yet</h2><p>Add songs from the list of passports you manage.</p></div>`}</div>
      ${foot(`#/releases/${r.id}?step=details`, true)}
    </div>
    <div class="card">
      <div class="card-head"><h2 class="h3">Songs you manage</h2></div>
      <div style="padding:12px 18px;border-bottom:1px solid var(--line)"><input class="input" id="rl-q" placeholder="Filter songs" autocomplete="off"></div>
      <div id="rl-pick" style="max-height:520px;overflow-y:auto"></div>
    </div></div>`.s;
  paintPicker();
  box.querySelector('#rl-q').addEventListener('input', e => { filter = e.target.value; paintPicker(); });
  on(box, 'click', '[data-act=add]', (e, b) => busy(b, () => save([...order(), b.dataset.id])).then(() => toast('Track added')).catch(() => {}));
  on(box, 'click', '[data-act=remove]', (e, b) => busy(b, () => save(order().filter(x => x !== b.dataset.id))).catch(() => {}));
  on(box, 'click', '[data-act=up],[data-act=down]', (e, b) => {
    const ids = order(), i = +b.dataset.i, j = b.dataset.act === 'up' ? i - 1 : i + 1;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    busy(b, () => save(ids)).catch(() => {});
  });
  on(box, 'click', '[data-act=isrc]', (e, b) => busy(b, async () => {
    const res = await api.post(`/api/releases/${r.id}/tracks/${b.dataset.id}/isrc`);
    toast(`ISRC ${res.isrc} assigned`);
    set(await api(`/api/releases/${r.id}`)); await repaint();
  }).catch(() => {}));
  on(box, 'click', '[data-act=next]', () => go('artwork'));
  // Drag and drop reorder.
  let dragId = null;
  const tl = box.querySelector('#rl-tl');
  tl.addEventListener('dragstart', e => { const row = e.target.closest('.rl-track'); if (!row) return; dragId = row.dataset.id; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragId); });
  tl.addEventListener('dragend', e => e.target.closest('.rl-track')?.classList.remove('dragging'));
  tl.addEventListener('dragover', e => { const row = e.target.closest('.rl-track'); if (!row) return; e.preventDefault(); tl.querySelectorAll('.over').forEach(x => x.classList.remove('over')); row.classList.add('over'); });
  tl.addEventListener('drop', e => {
    e.preventDefault();
    const row = e.target.closest('.rl-track');
    tl.querySelectorAll('.over').forEach(x => x.classList.remove('over'));
    if (!row || !dragId || row.dataset.id === dragId) return;
    const ids = order().filter(x => x !== dragId);
    ids.splice(ids.indexOf(row.dataset.id), 0, dragId);
    save(ids).catch(err => toast(err.message, { error: true }));
  });
}

// Step 3: artwork.
function artChecks(m) {
  if (!m) return [];
  return [
    [['png', 'jpeg'].includes(m.format), true, 'JPEG or PNG'],
    [m.width === m.height, true, `Square (${m.width}×${m.height})`],
    [Math.min(m.width, m.height) >= 1400, true, 'At least 1400×1400 (store minimum)'],
    [Math.min(m.width, m.height) >= 3000, false, '3000×3000 or larger (recommended)'],
    [m.colorSpace === 'rgb' || m.colorSpace === 'palette', true, `RGB color${m.colorSpace === 'cmyk' ? ' (this file is CMYK)' : ''}`],
    ...(m.alpha ? [[false, false, 'No transparency']] : [])
  ];
}
async function stepArtwork({ r, box, go, set, repaint }) {
  const m = r.artwork_meta;
  const checks = artChecks(m);
  box.innerHTML = html`<div class="card">
    <div class="card-head"><div><h2 class="h3">Cover art</h2><div class="small muted">Square, RGB, 3000×3000 recommended (1400×1400 minimum). JPEG or PNG.</div></div></div>
    <div class="card-body"><div class="grid grid-2" style="gap:24px;align-items:start">
      <label class="dropzone rl-drop" id="rl-dz" style="padding:${m ? '14px' : '30px'}">
        <input type="file" accept="image/jpeg,image/png" class="sr-only" id="rl-file">
        ${m ? html`<div style="width:100%;max-width:380px">${cover(r)}<div class="small muted" style="margin-top:10px">${icon('upload')} Drop a new image or click to replace</div></div>`
          : html`<div><div class="empty icon" style="width:56px;height:56px;border-radius:16px;display:grid;place-items:center;margin:0 auto 12px;background:var(--grad-soft);color:var(--accent)">${icon('upload')}</div>
            <b style="color:var(--fg)">Drop your cover here</b><div class="small">or click to choose a file</div></div>`}
        <div class="progress hidden" id="rl-prog" style="width:100%;margin-top:12px"><i style="width:0"></i></div>
      </label>
      <div class="stack">
        ${m ? html`<div class="card" style="box-shadow:none"><div class="list">
          ${checks.map(([ok, block, label]) => html`<div class="rl-check ${ok ? 'pass' : block ? 'block' : 'warn'}" style="padding:10px 14px"><span class="ic">${icon(ok ? 'check' : block ? 'x' : 'alert')}</span><div class="grow"><div class="t" style="font-weight:500">${label}</div></div></div>`)}
        </div></div>
        <dl class="kv small"><dt>File</dt><dd>${m.name || '—'}</dd><dt>Format</dt><dd>${m.format.toUpperCase()}${m.progressive ? ' (progressive)' : ''}</dd><dt>Size</dt><dd>${bytes(m.bytes)}</dd><dt>Dimensions</dt><dd class="mono">${m.width} × ${m.height}</dd><dt>Colour</dt><dd>${m.colorSpace.toUpperCase()}${m.alpha ? ' + alpha' : ''}</dd><dt>SHA-256</dt><dd class="hash">${r.artwork_hash}</dd></dl>`
        : html`<div class="callout info">${icon('info')}<div class="small">Stores reject covers with URLs, social handles, store logos, prices or blurry text. Keep the artist name and title on the cover matching the release exactly.</div></div>`}
      </div>
    </div></div>
    ${foot(`#/releases/${r.id}?step=tracks`, true)}</div>`.s;
  const input = box.querySelector('#rl-file'), dz = box.querySelector('#rl-dz'), prog = box.querySelector('#rl-prog');
  const send = async file => {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) return toast('Upload a JPEG or PNG', { error: true });
    prog.classList.remove('hidden');
    try {
      const res = await upload(`/api/releases/${r.id}/artwork`, file, { onProgress: p => { prog.firstChild.style.width = `${Math.round(p * 100)}%`; } });
      const bad = res.checks.filter(x => !x.ok && x.block);
      toast(bad.length ? `Uploaded, but: ${bad[0].title.toLowerCase()} is required` : 'Cover art looks great', { error: !!bad.length });
      set(await api(`/api/releases/${r.id}`)); await repaint();
    } catch (e) { toast(e.message, { error: true }); prog.classList.add('hidden'); }
  };
  input.addEventListener('change', () => send(input.files[0]));
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); send(e.dataTransfer.files[0]); });
  on(box, 'click', '[data-act=next]', () => go('stores'));
}

// Step 4: stores and territories.
const COUNTRIES = [['US', 'United States'], ['GB', 'United Kingdom'], ['CA', 'Canada'], ['AU', 'Australia'], ['NZ', 'New Zealand'], ['IE', 'Ireland'], ['DE', 'Germany'], ['FR', 'France'],
  ['NL', 'Netherlands'], ['BE', 'Belgium'], ['ES', 'Spain'], ['PT', 'Portugal'], ['IT', 'Italy'], ['SE', 'Sweden'], ['NO', 'Norway'], ['DK', 'Denmark'], ['FI', 'Finland'], ['PL', 'Poland'],
  ['AT', 'Austria'], ['CH', 'Switzerland'], ['MX', 'Mexico'], ['BR', 'Brazil'], ['AR', 'Argentina'], ['CO', 'Colombia'], ['CL', 'Chile'], ['NG', 'Nigeria'], ['GH', 'Ghana'], ['KE', 'Kenya'],
  ['ZA', 'South Africa'], ['EG', 'Egypt'], ['AE', 'United Arab Emirates'], ['SA', 'Saudi Arabia'], ['TR', 'Turkey'], ['IN', 'India'], ['JP', 'Japan'], ['KR', 'South Korea'], ['ID', 'Indonesia'],
  ['PH', 'Philippines'], ['TH', 'Thailand'], ['VN', 'Vietnam'], ['MY', 'Malaysia'], ['SG', 'Singapore'], ['HK', 'Hong Kong'], ['TW', 'Taiwan']];
const REGIONS = { 'North America': ['US', 'CA', 'MX'], Europe: ['GB', 'IE', 'DE', 'FR', 'NL', 'BE', 'ES', 'PT', 'IT', 'SE', 'NO', 'DK', 'FI', 'PL', 'AT', 'CH'],
  'Latin America': ['MX', 'BR', 'AR', 'CO', 'CL'], Africa: ['NG', 'GH', 'KE', 'ZA', 'EG'], 'Asia Pacific': ['AU', 'NZ', 'IN', 'JP', 'KR', 'ID', 'PH', 'TH', 'VN', 'MY', 'SG', 'HK', 'TW'] };
async function stepStores({ r, c, box, go, set }) {
  let stores = new Set(r.stores || []);
  let world = (r.territories || []).includes('Worldwide');
  let terr = new Set(world ? [] : r.territories || []);
  const paint = () => {
    box.innerHTML = html`<div class="stack-lg"><div class="card">
      <div class="card-head"><div><h2 class="h3">Stores</h2><div class="small muted">${stores.size} of ${c.stores.length} selected. Audius goes live in minutes; the others take hours to a few days.</div></div>
        <div class="row"><button class="btn btn-sm btn-ghost" data-act="all">Select all</button><button class="btn btn-sm btn-ghost" data-act="none">Clear</button></div></div>
      <div class="card-body"><div class="rl-stores">${c.stores.map(s => html`<label class="rl-store ${stores.has(s.id) ? 'on' : ''}">
        <input type="checkbox" data-store="${s.id}" ${stores.has(s.id) ? 'checked' : ''}>${logo(s.id, s.name)}
        <div style="min-width:0"><div class="nm">${s.name}</div>${s.note ? html`<div class="nt">${s.note}</div>` : ''}</div></label>`)}</div></div>
    </div>
    <div class="card">
      <div class="card-head"><div><h2 class="h3">Territories</h2><div class="small muted">Where listeners can stream and buy it.</div></div>
        <div class="seg"><button type="button" data-world="1" class="${world ? 'on' : ''}">Worldwide</button><button type="button" data-world="0" class="${world ? '' : 'on'}">Choose countries</button></div></div>
      ${world ? html`<div class="card-body"><div class="callout ok">${icon('globe')}<div>Available in every country the selected stores operate in.</div></div></div>`
      : html`<div class="card-body stack">
        <div class="row wrap">${Object.keys(REGIONS).map(k => html`<button class="btn btn-sm" data-region="${k}">${icon('plus')} ${k}</button>`)}<button class="btn btn-sm btn-ghost" data-act="tclear">Clear</button>
          <span class="small muted" style="margin-left:auto">${terr.size} selected</span></div>
        <div class="rl-countries">${COUNTRIES.map(([code, n]) => html`<label class="check small"><input type="checkbox" data-terr="${code}" ${terr.has(code) ? 'checked' : ''}><span>${n} <span class="faint mono">${code}</span></span></label>`)}</div>
      </div>`}
      ${foot(`#/releases/${r.id}?step=artwork`, true)}
    </div></div>`.s;
  };
  paint();
  on(box, 'change', '[data-store]', (e, t) => { t.checked ? stores.add(t.dataset.store) : stores.delete(t.dataset.store); paint(); });
  on(box, 'change', '[data-terr]', (e, t) => { t.checked ? terr.add(t.dataset.terr) : terr.delete(t.dataset.terr); paint(); });
  on(box, 'click', '[data-act=all]', () => { stores = new Set(c.stores.map(s => s.id)); paint(); });
  on(box, 'click', '[data-act=none]', () => { stores = new Set(); paint(); });
  on(box, 'click', '[data-act=tclear]', () => { terr = new Set(); paint(); });
  on(box, 'click', '[data-world]', (e, b) => { world = b.dataset.world === '1'; paint(); });
  on(box, 'click', '[data-region]', (e, b) => { REGIONS[b.dataset.region].forEach(x => terr.add(x)); paint(); });
  on(box, 'click', '[data-act=next]', (e, b) => {
    if (!stores.size) return toast('Pick at least one store', { error: true });
    if (!world && !terr.size) return toast('Pick at least one country, or choose Worldwide', { error: true });
    busy(b, async () => { set(await api.patch(`/api/releases/${r.id}`, { stores: [...stores], territories: world ? ['Worldwide'] : [...terr] })); go('review'); }).catch(() => {});
  });
}

// Step 5: review and submit.
function checklist(items, { actions = true, compactPasses = true, compactWarnings = false } = {}) {
  const blocks = items.filter(i => i.severity === 'block'), warns = items.filter(i => i.severity === 'warn'), passes = items.filter(i => i.severity === 'pass');
  const row = i => html`<div class="rl-check ${i.severity}">
    <span class="ic">${icon(i.severity === 'pass' ? 'check' : i.severity === 'block' ? 'x' : 'alert')}</span>
    <div class="grow"><div class="t">${i.title}</div>${i.why ? html`<div class="w">${i.why}${i.fix ? html` <b>${i.fix}</b>` : ''}</div>` : ''}</div>
    ${actions && i.action && i.severity !== 'pass' ? actionBtn(i) : ''}</div>`;
  return html`${blocks.map(row)}${compactWarnings && warns.length ? html`<details><summary class="rl-check warn" style="cursor:pointer;list-style:none"><span class="ic">${icon('alert')}</span><div class="grow"><div class="t">${warns.length} warning${warns.length > 1 ? 's' : ''}</div><div class="w">Worth fixing, not blocking. Show all</div></div></summary>${warns.map(row)}</details>` : warns.map(row)}
    ${passes.length ? (compactPasses ? html`<details><summary class="rl-check pass" style="cursor:pointer;list-style:none"><span class="ic">${icon('check')}</span><div class="grow"><div class="t">${passes.length} check${passes.length > 1 ? 's' : ''} passed</div><div class="w">Show all</div></div></summary>${passes.map(row)}</details>` : passes.map(row)) : ''}`;
}
function actionBtn(i) {
  const a = i.action;
  if (a.type === 'assign_isrc') return html`<button class="btn btn-sm" data-act="isrc" data-id="${a.song_id}">${icon('sparkle')} ${a.label}</button>`;
  if (a.type === 'assign_upc') return html`<button class="btn btn-sm" data-act="upc">${icon('sparkle')} ${a.label}</button>`;
  if (a.type === 'step') return html`<button class="btn btn-sm" data-step="${a.step}">${a.label}</button>`;
  if (a.type === 'link') return html`<a class="btn btn-sm" href="#${a.href}">${a.label} ${icon('arrow')}</a>`;
  return '';
}
// The release at a glance, in six plain checks (from preflight), with Insiders first and one button.
const READY = [
  ['Songs', c => ['metadata', 'tracks', 'track_claimed'].includes(c)], ['Artwork', c => c === 'artwork'], ['Splits', c => c === 'splits'],
  ['Codes', c => ['upc', 'isrc'].includes(c)], ['Stores', c => ['stores', 'territories'].includes(c)]
];
function readyCard(r, tracks, pf, page) {
  const groups = READY.map(([label, f]) => {
    const items = pf.items.filter(i => f(i.code));
    const bad = items.filter(i => !i.ok && i.severity === 'block');
    return { label, ok: items.length > 0 && !bad.length, sub: bad.length ? bad[0].why : label === 'Songs' ? `${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'}, all claimed` : label === 'Splits' ? 'Signed by everyone' : label === 'Codes' ? 'UPC and every ISRC' : label === 'Stores' ? `${(r.stores || []).length} stores, ${(r.territories || []).includes('Worldwide') ? 'worldwide' : (r.territories || []).join(', ')}` : 'Square, store-ready', action: bad[0]?.action };
  });
  groups.push({ label: 'One Link page', ok: !!page, sub: page ? `${page.name}’s One Link shows it on release day` : 'Make one so listeners can find it', href: '#/onelink' });
  const when = r.release_date ? new Date(r.release_date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  const presale = r.release_date ? new Date(new Date(r.release_date + 'T12:00:00Z').getTime() - 6 * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;
  return html`<section class="ah-card" style="margin-bottom:18px">
    <div class="row" style="gap:14px;margin-bottom:12px">${cover(r, 'sm')}<div><h2 style="margin:0">${r.title}</h2>
      <div class="small muted">${TYPE_LABEL[r.type]} · ${tracks.length} ${tracks.length === 1 ? 'song' : 'songs'} · ${pf.ok ? 'Ready to go' : `${pf.blockers} to fix`}</div></div></div>
    ${groups.map(g => html`<div class="rl-check ${g.ok ? '' : 'todo'}"><span class="ic">${icon(g.ok ? 'check' : 'dot')}</span>
      <div class="grow"><div class="t">${g.label}</div><div class="s">${g.sub}</div></div>
      ${!g.ok && g.action?.step ? html`<button class="btn btn-sm" data-step="${g.action.step}">${g.action.label}</button>` : !g.ok && g.href ? html`<a class="btn btn-sm" href="${g.href}">Set up</a>` : ''}</div>`)}
    ${page ? html`<div class="rl-insiders" style="margin-top:14px">${icon('key')}<div><b>Insiders hear it first</b><span>Presale and early listen${presale ? ` from ${presale}` : ''}, for your top listeners on One Link</span></div></div>` : ''}
    <p class="ah-quiet" style="text-align:left">Free to release. Releasing here also lowers your Wallet fee.</p>
    <button class="ah-cta" style="width:100%;margin-top:6px" data-act="submit" ${pf.ok ? '' : 'disabled'}>${icon('rocket')} ${when ? `Release on ${when}` : 'Release'}</button>
  </section>`;
}

async function stepReview({ r, tracks, pf, c, box, go, set, repaint }) {
  useArtistCss();
  const [pf2, ol] = await Promise.all([pf || api(`/api/releases/${r.id}/preflight`), api('/api/onelink').catch(() => null)]);
  pf = pf2;
  const page = ol?.pages?.find(p => p.published) || null;
  box.innerHTML = html`${readyCard(r, tracks, pf, page)}<div class="split-main">
    <div class="stack-lg">
      <div class="card">
        <div class="card-head"><div><h2 class="h3">Preflight</h2><div class="small muted">Everything stores and the Song Wallet need, checked before anything ships.</div></div>
          <span class="badge ${pf.ok ? 'ok' : 'crit'}">${pf.ok ? 'All clear' : `${pf.blockers} blocking`}</span></div>
        <div>${checklist(pf.items)}</div>
      </div>
      <div class="callout info">${icon('wallet')}<div><b>Money from this release lands in each song's Song Wallet and is split the same day.</b>
        <div class="small">That is why splits must be fully signed before release. No signed split, no automatic payout.</div></div></div>
    </div>
    <div class="stack-lg">
      <div class="card card-pad stack">
        <div class="row" style="align-items:flex-start;gap:14px">${cover(r, 'sm')}<div style="min-width:0"><div style="font-weight:700">${r.title}</div><div class="small muted">${artistLine(r)}</div>
          <div class="tiny faint">${TYPE_LABEL[r.type]} · ${tracks.length} track${tracks.length === 1 ? '' : 's'}</div></div></div>
        <dl class="kv small" style="grid-template-columns:110px 1fr">
          <dt>Release date</dt><dd>${r.release_date ? date(r.release_date) : '—'}</dd>
          <dt>UPC</dt><dd class="mono">${r.upc || '—'}</dd>
          <dt>Label</dt><dd>${r.label_name || '—'}</dd>
          <dt>Genre</dt><dd>${r.genre || '—'}</dd>
          <dt>Stores</dt><dd>${(r.stores || []).length}</dd>
          <dt>Territories</dt><dd>${(r.territories || []).includes('Worldwide') ? 'Worldwide' : (r.territories || []).join(', ')}</dd>
          <dt>Partner</dt><dd>${data_partner(c)} ${simBadge(c.partner)}</dd>
        </dl>
        <a class="btn" href="/api/releases/${r.id}/ddex.xml" download>${icon('download')} DDEX ERN 4.3 preview</a>
        ${r.status === 'draft' ? html`<button class="btn btn-ghost btn-danger btn-sm" data-act="delete">${icon('trash')} Delete draft</button>` : ''}
      </div>
    </div></div>`.s;
  on(box, 'click', '[data-step]', (e, b) => go(b.dataset.step));
  on(box, 'click', '[data-act=isrc]', (e, b) => busy(b, async () => { const x = await api.post(`/api/releases/${r.id}/tracks/${b.dataset.id}/isrc`); toast(`ISRC ${x.isrc} assigned`); set(await api(`/api/releases/${r.id}`)); await repaint(); }).catch(() => {}));
  on(box, 'click', '[data-act=upc]', (e, b) => busy(b, async () => { const x = await api.post(`/api/releases/${r.id}/upc`); toast(`UPC ${x.upc} assigned`); set(await api(`/api/releases/${r.id}`)); await repaint(); }).catch(() => {}));
  on(box, 'click', '[data-act=delete]', async () => {
    if (!await confirmDialog('Delete this draft?', 'The draft and its tracklist are removed. Your songs are not affected.', 'Delete', true)) return;
    await api.del(`/api/releases/${r.id}`); toast('Draft deleted'); app.go('/releases');
  });
  on(box, 'click', '[data-act=submit]', () => modal({
    title: `Submit “${r.title}”`,
    body: html`<div class="stack"><p>We send a DDEX ERN 4.3 package to ${data_partner(c)} for ${(r.stores || []).length} stores. It goes live on <b>${date(r.release_date)}</b>.</p>
      <p class="small muted">After submitting, changes need a takedown and re-delivery, so check the spelling of every title and credit.</p>
      ${c.partner.simulated ? html`<div class="callout">${icon('info')}<div class="small">No distribution partner is connected to this server yet, so delivery is simulated on a realistic schedule. Nothing is sent to real stores.</div></div>` : ''}</div>`,
    actions: [{ label: 'Cancel' }, { label: 'Submit release', primary: true, onClick: async () => {
      await api.post(`/api/releases/${r.id}/submit`); toast('Submitted. Delivery has started.'); app.go(`/releases/${r.id}?view=1`);
    } }]
  }));
}
const data_partner = c => c.partner?.simulated ? 'our distribution partner' : (c.partner?.name || 'our distribution partner');

// ---------- release page ----------
function renderReleasePage(el, data, c, isCurrent) {
  const root = mount(el);
  let timer = null;
  const paint = d => {
    const { release: r, tracks, deliveries, timeline, canEdit, isAdmin, partner } = d;
    const live = deliveries.filter(x => x.status === 'live').length;
    const inFlight = ['submitted', 'processing', 'delivered'].includes(r.status) || (r.status === 'live' && live < deliveries.length);
    const pre = r.preflight;
    root.innerHTML = html`
    <a href="#/releases" class="small muted row" style="gap:4px;margin-bottom:12px">${icon('back')} Releases</a>
    <div class="card" style="overflow:hidden;margin-bottom:20px">
      <div class="rl-hero">
        ${cover(r, 'xl')}
        <div class="stack-sm" style="flex:1;min-width:250px">
          <div class="row wrap"><span class="eyebrow">${TYPE_LABEL[r.type]} · ${tracks.length} track${tracks.length === 1 ? '' : 's'} · ${duration(tracks.reduce((s, t) => s + (t.duration_ms || 0), 0))}</span></div>
          <h1>${r.title}</h1>
          <div style="font-size:17px;font-weight:600">${artistLine(r)}</div>
          <div class="row wrap" style="margin-top:6px">${badge(r.status)}${simBadge(partner)}
            ${r.release_date ? html`<span class="chip">${icon('clock')} ${date(r.release_date)}</span>` : ''}${r.upc ? html`<span class="chip">UPC ${r.upc}</span>` : ''}
            ${r.status !== 'draft' ? html`<span class="small muted">${live} of ${deliveries.length} stores live</span>` : ''}</div>
          <div class="row wrap" style="margin-top:12px">
            <a class="btn btn-sm" href="/api/releases/${r.id}/ddex.xml" download>${icon('download')} DDEX</a>
            <button class="btn btn-sm" data-act="audius">${icon('audius')} Audius payload</button>
            ${canEdit && ['draft', 'rejected'].includes(r.status) ? html`<a class="btn btn-sm" href="#/releases/${r.id}">${icon('edit')} Edit</a>` : ''}
            ${canEdit && ['submitted', 'processing', 'delivered', 'live'].includes(r.status) ? html`<button class="btn btn-sm btn-ghost btn-danger" data-act="takedown">${icon('trash')} Takedown</button>` : ''}
          </div>
        </div>
      </div>
      ${r.status === 'takedown' ? html`<div class="callout crit" style="border-radius:0">${icon('alert')}<div><b>Takedown requested ${ago(r.takedown_at)}.</b> Stores usually remove a release within 1 to 3 days. Income already earned still lands in the songs' wallets.</div></div>` : ''}
      ${r.status === 'rejected' ? html`<div class="callout crit" style="border-radius:0">${icon('alert')}<div><b>Sent back for changes.</b> ${r.rejection_reason || ''}</div></div>` : ''}
    </div>

    <div class="callout ok rl-money" style="margin-bottom:20px;align-items:flex-start">${icon('wallet')}<div class="grow stack-sm">
      <b>Money from this release lands in each song's Song Wallet and is split the same day.</b>
      <div class="row wrap small" style="gap:6px 14px">${tracks.map(t => html`<a href="#/song/${t.id}?tab=wallet">${icon('wallet')} ${t.title}</a>`)}</div></div>
      <a class="btn btn-sm" href="#/wallet/import" style="flex:none">${icon('upload')} Import a store report</a></div>

    ${isAdmin && r.submitted_at && partner.simulated ? html`<div class="card card-pad row wrap" style="margin-bottom:20px;gap:8px">
      <span class="eyebrow" style="margin-right:6px">Admin · simulated clock</span>
      <button class="btn btn-sm" data-adv="step">Next step</button><button class="btn btn-sm" data-adv="day">+1 day</button><button class="btn btn-sm" data-adv="live">Jump to live</button>
      ${!['rejected', 'takedown'].includes(r.status) ? html`<button class="btn btn-sm btn-ghost btn-danger" data-act="reject">Send back</button>` : ''}</div>` : ''}

    <div class="split-main">
      <div class="stack-lg">
        <div class="card">
          <div class="card-head"><h2 class="h3">Stores</h2><span class="small muted">${inFlight ? 'Updates automatically' : ''}</span></div>
          <div class="card-body">${deliveries.length ? html`<div class="rl-stores">${deliveries.map(dl => html`<div class="rl-chip">
            ${logo(dl.store, dl.name)}<div class="grow"><div class="nm">${dl.name}</div>
            <div class="sub">${dl.status === 'live' ? 'Live now' : dl.expectedLive && STATUS[dl.status] && !['removed', 'takedown_requested', 'rejected'].includes(dl.status) ? `Live ${date(dl.expectedLive)}` : dl.message || ''}</div></div>
            ${badge(dl.status)}</div>`)}</div>` : html`<div class="muted small">Not submitted yet.</div>`}</div>
        </div>
        <div class="card">
          <div class="card-head"><h2 class="h3">Tracklist</h2></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Title</th><th>ISRC</th><th class="r">Length</th></tr></thead><tbody>
            ${tracks.map((t, i) => html`<tr><td class="muted num">${t.disc > 1 ? `${t.disc}.` : ''}${t.position}</td>
              <td><a href="#/song/${t.id}" style="color:inherit;font-weight:600">${t.title}</a>${t.version_title ? html` <span class="muted">(${t.version_title})</span>` : ''}${t.explicit ? html` <span class="badge plain" title="Explicit">E</span>` : ''}<div class="tiny muted">${t.artist_credit}</div></td>
              <td class="mono small">${t.isrc || '—'}</td><td class="r num muted">${duration(t.duration_ms) || '—'}</td></tr>`)}
          </tbody></table></div>
        </div>
        ${pre ? html`<div class="card"><div class="card-head"><div><h2 class="h3">Preflight at submission</h2><div class="small muted">Checked ${dateTime(pre.checkedAt)}</div></div><span class="badge ${pre.ok ? 'ok' : 'crit'}">${pre.passed} passed${pre.warnings ? ` · ${pre.warnings} warnings` : ''}</span></div>
          <div>${checklist(pre.items, { actions: false, compactWarnings: true })}</div></div>` : ''}
      </div>
      <div class="stack-lg">
        <div class="card card-pad">
          <h2 class="h3" style="margin-bottom:16px">Delivery</h2>
          ${timeline.length ? html`<div class="timeline">${timeline.map(e => html`<div class="tl-item ${e.complete || (e.done && !e.kind.startsWith('stage.')) ? 'ok' : e.done ? 'warn' : ''}" style="${e.done ? '' : 'opacity:.6'}">
            <div style="font-weight:600">${e.title}</div>
            <div class="when">${e.done && !e.expected ? dateTime(e.at) : e.expected ? `${e.done ? 'Finishing' : 'Expected'} ${dateTime(e.expected)}` : ''}</div></div>`)}</div>` : html`<div class="muted small">Nothing yet.</div>`}
        </div>
        <div class="card card-pad">
          <h2 class="h3" style="margin-bottom:12px">Details</h2>
          <dl class="kv small" style="grid-template-columns:100px 1fr">
            <dt>Label</dt><dd>${r.label_name || '—'}</dd><dt>℗</dt><dd>${r.copyright_p || '—'}</dd><dt>©</dt><dd>${r.copyright_c || '—'}</dd>
            <dt>Genre</dt><dd>${r.genre || '—'}</dd><dt>Language</dt><dd>${(c.languages.find(l => l[0] === r.language) || [, r.language])[1] || '—'}</dd>
            <dt>Territories</dt><dd>${r.territories.includes('Worldwide') ? 'Worldwide' : r.territories.join(', ')}</dd>
            ${r.catalog_number ? html`<dt>Catalog</dt><dd class="mono">${r.catalog_number}</dd>` : ''}
            ${r.partner_ref ? html`<dt>Reference</dt><dd class="mono">${r.partner_ref}</dd>` : ''}
            ${r.ddex_hash ? html`<dt>DDEX hash</dt><dd class="hash">${r.ddex_hash.slice(0, 32)}…</dd>` : ''}
            ${r.submitted_at ? html`<dt>Submitted</dt><dd>${dateTime(r.submitted_at)}</dd>` : ''}
          </dl>
        </div>
      </div>
    </div>`.s;
  };
  paint(data);
  const reload = async () => { data = await api(`/api/releases/${data.release.id}`); paint(data); };
  timer = setInterval(() => {
    if (!isCurrent() || !document.body.contains(root)) return clearInterval(timer);
    if (['submitted', 'processing', 'delivered', 'live', 'takedown'].includes(data.release.status)) reload().catch(() => {});
  }, 30000);
  on(root, 'click', '[data-adv]', (e, b) => busy(b, async () => { data = await api.post(`/api/releases/${data.release.id}/advance`, { by: b.dataset.adv }); paint(data); }).catch(() => {}));
  on(root, 'click', '[data-act=reject]', () => modal({
    title: 'Send back for changes', body: html`<label class="field"><span>What needs fixing?</span><textarea class="input" id="rl-reason" placeholder="e.g. Cover art contains a website address"></textarea></label>`,
    actions: [{ label: 'Cancel' }, { label: 'Send back', danger: true, onClick: async (close, m) => {
      data = await api.post(`/api/releases/${data.release.id}/reject`, { reason: m.querySelector('#rl-reason').value }); paint(data);
    } }]
  }));
  on(root, 'click', '[data-act=takedown]', () => modal({
    title: `Take down “${data.release.title}”?`,
    body: html`<div class="stack"><p class="muted">We ask every store to remove it. This usually takes 1 to 3 days. Income already earned still arrives and is split as normal.</p>
      <label class="field"><span>Reason <span class="hint">optional</span></span><input class="input" id="rl-td" placeholder="e.g. Re-releasing with a new master"></label></div>`,
    actions: [{ label: 'Cancel' }, { label: 'Request takedown', danger: true, onClick: async (close, m) => {
      data = await api.post(`/api/releases/${data.release.id}/takedown`, { reason: m.querySelector('#rl-td').value }); paint(data); toast('Takedown requested');
    } }]
  }));
  on(root, 'click', '[data-act=audius]', async () => {
    const p = await api(`/api/releases/${data.release.id}/audius.json`);
    modal({ title: 'Audius upload payload', wide: true,
      body: html`<div class="stack"><div class="callout">${icon('audius')}<div class="small">${p.why} This is the exact track metadata and Entity Manager call we send once the artist connects their Audius wallet.</div></div>
        <pre class="mono small" style="max-height:420px;overflow:auto;background:var(--surface-2);padding:14px;border-radius:12px;margin:0">${JSON.stringify(p.tracks, null, 2)}</pre></div>` });
  });
}

// ---------- song page tab ----------
app.songTab({
  id: 'releases', label: 'Releases', order: 40,
  show: (song, { canManage }) => song.status !== 'draft' && canManage,
  render: async ({ el, song }) => {
    const { items } = await api(`/api/songs/${song.id}/releases`);
    const root = mount(el);
    root.innerHTML = html`<div class="split-main">
      <div class="card">
        <div class="card-head"><h2 class="h3">Releases with this song</h2><button class="btn btn-sm btn-primary" data-act="new">${icon('rocket')} Release this song</button></div>
        ${items.length ? html`<div class="list">${items.map(r => html`<a class="list-item" href="#/releases/${r.id}">
          ${cover({ ...r, featured_artists: [] }, 'sm')}
          <div class="grow"><div class="title">${r.title}</div><div class="sub">${TYPE_LABEL[r.type]} · track ${r.position}${r.release_date ? ` · ${date(r.release_date)}` : ''}${r.upc ? ` · UPC ${r.upc}` : ''}</div></div>
          ${badge(r.status)}</a>`)}</div>`
        : html`<div class="empty"><div class="icon">${icon('rocket')}</div><h2 class="h3">Not released yet</h2><p>Put it in every store. Income lands in this song's wallet and is split the same day.</p></div>`}
      </div>
      <div class="card card-pad stack">
        <h2 class="h3">Before you release</h2>
        <ul class="small muted rl-specs" style="margin:0;padding-left:18px">
          <li>An ISRC for the recording (we can assign one)</li><li>Splits signed by every contributor</li><li>Square cover art, 3000×3000 recommended</li><li>A release date at least a week out</li>
        </ul>
      </div></div>`.s;
    on(root, 'click', '[data-act=new]', (e, b) => busy(b, async () => {
      const d = await api.post('/api/releases', { title: song.title, primary_artist: song.artist_credit, artist_id: song.artist_id || undefined, genre: undefined, song_ids: [song.id] })
        .catch(async err => { if (err.status === 403 && song.artist_id) return api.post('/api/releases', { title: song.title, primary_artist: song.artist_credit, song_ids: [song.id] }); throw err; });
      app.go(`/releases/${d.release.id}?step=details`);
    }).catch(() => {}));
  }
});
