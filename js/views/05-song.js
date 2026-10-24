// The passport page for one song: header, then tabs registered by each product area (app.songTab).
// This file provides the Overview and History tabs.
import { app, shownTitle, html, raw, api, shareLink, icon, term, art, artUrl, statusBadge, date, dateTime, ago, duration, on, modal, toast, formData, busy, esc, infoTip, moreMenu, ring, personRow, uploadImage } from '../app.js';

app.route('/song/:id', async ({ el, params, query, user }) => {
  const load = () => api(`/api/songs/${params.id}`);
  let data = await load();
  // Merged duplicate: the server sent the passport it was merged into. Show its address instead.
  if (data.song.id !== params.id) { history.replaceState(null, '', `#/song/${data.song.id}`); params.id = data.song.id; }
  const paint = async () => {
    const { song, canManage, isContributor } = data;
    const tabs = app.songTabs.filter(t => !t.show || t.show(song, { canManage, isContributor, user }));
    const active = tabs.find(t => t.id === query.get('tab')) || tabs[0];
    document.title = `${shownTitle(song)} by ${song.artist_credit} · Song Passport`;
    const year = song.release_date?.slice(0, 4), len = duration(song.duration_ms);
    const primary = song.status === 'draft' ? html`<a class="btn btn-primary btn-lg" href="#/claim/song/${song.id}">${icon('flag')} Claim</a>`
      : canManage ? html`<a class="btn btn-primary btn-lg" href="#/song/${song.id}?tab=splits">${icon('sign')} Send a split</a>` : '';
    el.innerHTML = html`
    <section class="song-hero" ${song.artwork_url ? raw(`style="--hero-art:url('${esc(artUrl(song.artwork_url, 250))}')"`) : ''}>
      ${canManage ? html`<button class="cover-btn" data-act="cover" aria-label="Change cover art" title="Change cover art">${art(song.title + song.artist_credit, { url: song.artwork_url, size: 'xl', label: song.title })}<span class="photo-add">${icon(song.artwork_url ? 'edit' : 'plus')}</span></button>`
        : art(song.title + song.artist_credit, { url: song.artwork_url, size: 'xl', label: song.title })}
      <div class="song-hero-txt">
        <div class="row wrap" style="gap:8px">${song.status === 'draft' ? html`<span class="badge plain">Unclaimed</span>${infoTip('Built from public data. Ownership shown is as published or registered, not signed splits. Claim it to agree splits with your collaborators.', 'About drafts')}` : statusBadge(song.status)}
          ${song.parent ? html`<span class="badge info plain">${icon('git')} ${song.parent_relation || 'remix'} of <a href="#/song/${song.parent.id}">${song.parent.title}</a></span>` : ''}</div>
        <h1>${shownTitle(song)}${song.version_title ? html` <span class="hero-version">${song.version_title}</span>` : ''}</h1>
        <div class="hero-artist">${song.artist_id ? html`<a href="#/artist/${song.artist_id}">${song.artist_credit}</a>` : song.artist_credit}</div>
        ${year || len ? html`<div class="hero-meta">${[year, len].filter(Boolean).join(' · ')}</div>` : ''}
        <div class="row" id="song-actions" style="margin-top:16px;gap:8px">${primary}<button class="btn btn-icon btn-lg-icon" data-act="share" aria-label="Share" title="Share">${icon('share')}</button></div>
      </div>
    </section>
    <nav class="tabs">${tabs.map(t => html`<a href="#/song/${song.id}?tab=${t.id}" class="${t === active ? 'on' : ''}">${t.label}</a>`)}</nav>
    <div id="tab"></div>`.s;
    const tabEl = el.querySelector('#tab');
    try {
      const out = await active.render({ el: tabEl, song, user, canManage, isContributor, query, reload: async () => { data = await load(); await paint(); } });
      if (out !== undefined && out !== null) tabEl.innerHTML = String(out);
    } catch (e) {
      tabEl.innerHTML = html`<div class="callout crit">${icon('alert')}<div>${e.message}</div></div>`.s;
    }
  };
  // Cover art: whoever manages the song can upload their own (it outranks every public source) or go back to the public one.
  on(el, 'click', '[data-act=cover]', async () => {
    const own = data.song.artwork_source === 'upload';
    const v = await modal({ title: 'Cover art', body: html`<p class="muted">Use a square picture, at least 500 pixels across. It shows on this passport and when you share it.</p>`,
      actions: [{ label: 'Cancel' }, ...(own ? [{ label: 'Remove mine', value: 'remove' }] : []), { label: 'Upload cover', primary: true, value: 'upload' }] });
    if (v === 'remove') { await api(`/api/images/song/${params.id}`, { method: 'DELETE' }); toast('Cover removed'); data = await load(); return paint(); }
    if (v !== 'upload') return;
    const file = await new Promise(res => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; f.onchange = () => res(f.files[0]); f.click(); });
    if (!file) return;
    try { await uploadImage('song', params.id, file); toast('Cover updated'); data = await load(); await paint(); } catch (e) { toast(e.message, { error: true }); }
  });
  on(el, 'click', '[data-act=share]', () => {
    shareLink(`${location.origin}/s/${params.id}`, { title: data.song.title, label: 'Passport link' });   // /s/ carries a preview card for messages and socials
  });
  await paint();
}, { title: 'Song', skeleton: 'song' });

// ---------- Overview ----------
// The six places a song should be registered. Tiles carry only a name and a dot; the sheet explains the rest.
const ORGS = [
  ['PRO', "Songwriters' society", 'users', 'Pays songwriters when the song is played or streamed. In the US that is ASCAP, BMI, SESAC or GMR.'],
  ['MLC', 'MLC', 'coins', 'The Mechanical Licensing Collective pays songwriters and publishers for US streams.'],
  ['SoundExchange', 'SoundExchange', 'wave', 'Pays the artist and the recording owner when the song plays on US digital radio, like Pandora and SiriusXM.'],
  ['International', 'Worldwide', 'globe', 'Pays for radio and public play outside the US, through a collecting society in each country.'],
  ['Distributor', 'Stores', 'disc', 'Your distributor puts the song in stores and on streaming services, and pays the recording income.'],
  ['Audius', 'Audius', 'audius', 'The song on the Audius network, where listeners can stream it and tip you directly.']
];
const STATE_TEXT = { done: 'In place', check: 'Worth checking', unknown: 'Not checked yet', na: 'Not needed' };

app.songTab({
  id: 'overview', label: 'Overview', order: 0,
  render: async ({ el, song, user, canManage, reload }) => {
    const regs = Object.fromEntries(song.registrations.map(r => [r.org, r]));
    // Auto-fill (07-enrich.js): where each value came from, and the registration checks.
    const en = app.enrich, [st, cr] = await Promise.all([en?.load(song.id), api(`/api/songs/${song.id}/credits`).catch(() => null)]);
    const mark = f => en ? en.mark(st, f) : '';
    const orgs = k => (cr?.orgs || []).filter(o => o.kind === k).map(o => o.name);
    const f = st?.fields || {}, found = st?.found || {};

    // Passport health: one state per place.
    const stateOf = org => {
      const r = regs[org], c = st?.checks?.[org];
      if (r?.status === 'registered' || c?.state === 'found') return 'done';
      if (r?.status === 'not_applicable') return 'na';
      if (c?.links?.length || c?.state === 'not_found' || song.status !== 'draft') return 'check';
      return 'unknown';
    };
    const tiles = ORGS.map(([org, name, ic, about]) => ({ org, name, ic, about, state: stateOf(org) }));
    const counted = tiles.filter(t => t.state !== 'na'), done = counted.filter(t => t.state === 'done').length;

    // Codes: one chip per code, duplicates folded (an EAN and UPC with the same digits are one barcode).
    const codes = [], seen = new Set();
    const addCode = (type, value, verified) => {
      if (!value) return; const v = String(value).replace(/[\s-]/g, ''), key = v;
      if (seen.has(key)) { const c = codes.find(x => x.key === key); if (c && verified) c.verified = true; if (c && type === 'UPC') c.type = 'UPC'; return; }
      seen.add(key); codes.push({ type, value, key, verified });
    };
    addCode('ISRC', song.isrc, song.codes.some(c => c.type === 'ISRC' && c.verified) || f.isrc?.verified);
    addCode('ISWC', song.iswc, f.iswc?.verified);
    for (const c of song.codes) addCode(c.type === 'EAN' ? 'UPC' : c.type, c.value, c.verified);
    if (f.upc) addCode('UPC', f.upc.value, f.upc.verified);
    // A song on many releases has many barcodes: show two of each kind, the rest behind "N more".
    const extraCode = i => codes.filter((x, j) => j < i && x.type === codes[i].type).length >= 2;
    const extraN = codes.filter((c, i) => extraCode(i)).length;

    // Publishing, in one line: as registered with The MLC, else writers and publishers from public credits.
    const mlc = found.mlc || {};
    const list = (xs, n = 4) => xs.slice(0, n).join(', ') + (xs.length > n ? ` and ${xs.length - n} more` : '');
    const pubs = [...new Set([...(found.publishers || []), ...orgs('publisher')])];
    const publishing = mlc.state === 'found' && (mlc.shares?.length || mlc.writers?.length)
      ? html`${list((mlc.shares?.length ? mlc.shares : mlc.writers).map(x => `${x.name}${x.share != null ? ` ${x.share}%` : ''}`))} ${en ? en.markText('Registered with The MLC') : ''}`
      : found.writers?.length || pubs.length ? html`${list([...(found.writers || []).map(w => w.name), ...pubs])} ${en ? en.markText('From MusicBrainz') : ''}` : '';
    const label = f.label?.value || orgs('label')[0], owner = f.copyright?.value || orgs('phonographic')[0];
    const facts = [
      song.release_date && ['Released', html`${date(song.release_date)}${song.release_title && song.release_title !== song.title ? html` <span class="quiet">on ${song.release_title}</span>` : ''}${mark('release_date')}`],
      song.version_title && ['Version', song.version_title],
      song.genre && ['Genre', html`${song.genre}${mark('genre')}`],
      song.duration_ms && ['Length', html`<span class="num">${duration(song.duration_ms)}</span>${mark('duration_ms')}`],
      label && ['Label', html`${label}${f.label ? mark('label') : ''}`],
      owner && [term('Master owner'), html`${owner}${f.copyright ? mark('copyright') : ''}`],
      [term('Publishing'), publishing || html`<span class="quiet">${mlc.state === 'not_found' ? 'Not registered with The MLC' : 'Not checked yet'}</span>`]
    ].filter(Boolean);
    const people = cr?.credits || [];

    el.innerHTML = html`
    <section class="card health" aria-labelledby="health-h">
      <div class="health-sum">${ring(done, counted.length)}<div><h2 class="h3" id="health-h">Passport health</h2><p class="quiet">${done === counted.length ? 'Everything is in place.' : `${counted.length - done} ${counted.length - done === 1 ? 'place' : 'places'} to check`}</p></div></div>
      <div class="tiles">${tiles.map(t => html`<button class="tile" data-act="tile" data-org="${t.org}" aria-label="${t.name}: ${STATE_TEXT[t.state]}">
        <span class="tile-ic">${icon(t.ic)}</span><span class="tile-name">${t.name}</span><span class="sdot ${t.state}" aria-hidden="true"></span></button>`)}</div>
    </section>
    <div class="split-main">
      <div class="stack-lg">
        <section class="card">
          <div class="card-head"><h2 class="h3">About this song</h2>${moreMenu(canManage ? [['Edit details', 'edit', 'edit']] : [])}</div>
          <dl class="facts">${facts.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
          ${en ? en.footer(st, { user }) : ''}
        </section>
      </div>
      <div class="stack-lg">
        <section class="card">
          <div class="card-head"><h2 class="h3">Codes</h2>${moreMenu(canManage ? [['Add a code', 'add-code', 'plus']] : [])}</div>
          <div class="codes">${codes.length ? html`${codes.map((c, i) => html`<span class="codeitem" ${extraCode(i) ? raw('hidden data-extra') : ''}><button class="code-chip" data-act="copy" data-value="${c.value}" aria-label="Copy ${c.type} ${c.value}" title="Tap to copy"><span class="code-k">${c.type}</span><span class="code-v">${c.value}</span>${c.verified ? html`<span class="code-ok" aria-hidden="true">${icon('check')}</span>` : ''}</button>${infoTip(c.type, `What is an ${c.type}`)}</span>`)}
            ${extraN ? html`<button class="code-chip more" data-act="more-codes">${extraN} more</button>` : ''}`
            : html`<p class="quiet">No codes yet.${canManage ? ' Add the ISRC from your distributor.' : ''}</p>`}</div>
        </section>
        ${people.length ? html`<section class="card">
          <div class="card-head"><h2 class="h3">Credits ${infoTip('From public credits. A credit shows who worked on the song; it is not a split.', 'About credits')}</h2><span class="quiet num">${people.length}</span></div>
          <div class="people">${people.slice(0, 8).map(p => personRow({ name: p.name, sub: p.labels.join(', '), href: `#/artist/${p.id}`, badge: p.verified ? html` <span class="verified" title="Claimed">${icon('check')}</span>` : '' }))}</div>
          ${people.length > 8 ? html`<div class="people more" hidden>${people.slice(8, 60).map(p => personRow({ name: p.name, sub: p.labels.join(', '), href: `#/artist/${p.id}` }))}</div>
            <button class="card-foot-btn" data-act="more-people">Show all ${people.length}</button>` : ''}
        </section>` : ''}
        ${song.children.length ? html`<section class="card"><div class="card-head"><h2 class="h3">Remixes and versions</h2></div><div class="list">
          ${song.children.map(c => html`<a class="list-item" href="#/song/${c.id}">${art(c.title + c.artist_credit, { label: c.title })}<div class="grow"><div class="title">${c.title}</div><div class="sub">${c.artist_credit} · ${c.parent_relation}</div></div>${statusBadge(c.status)}</a>`)}
        </div></section>` : ''}
      </div>
    </div>`.s;
    en?.mount(el, song, { st, reload });

    on(el, 'click', '[data-act=copy]', async (e, b) => {
      try { await navigator.clipboard.writeText(b.dataset.value); toast(`${b.querySelector('.code-k').textContent} copied`); } catch { prompt('Copy', b.dataset.value); }
    });
    on(el, 'click', '[data-act=more-codes]', (e, b) => { el.querySelectorAll('[data-extra]').forEach(x => { x.hidden = false; }); b.remove(); });
    on(el, 'click', '[data-act=more-people]', (e, b) => { el.querySelector('.people.more').hidden = false; b.remove(); });
    on(el, 'click', '[data-act=tile]', (e, b) => {
      const t = tiles.find(x => x.org === b.dataset.org), r = regs[t.org] || {}, c = st?.checks?.[t.org] || {};
      const status = t.state === 'done' ? `In place${c.source ? ` · found on ${c.source}` : r.status === 'registered' ? ' · marked registered' : ''}` : STATE_TEXT[t.state];
      const actions = [
        ...(c.copy ? [{ label: 'Copy ISRC', onClick: async () => { try { await navigator.clipboard.writeText(c.copy); toast('ISRC copied'); } catch {} return false; } }] : []),
        ...(canManage ? [{ label: 'Edit', onClick: (close) => { close(); openReg(t.org); } }] : []),
        ...(canManage && t.state !== 'done' ? [{ label: 'Mark as registered', primary: true, onClick: async () => {
          await api.put(`/api/songs/${song.id}/registrations/${encodeURIComponent(t.org)}`, { status: 'registered', note: 'Confirmed from a public search' }); toast(`${t.name} marked registered`); reload(); } }] : []),
        ...(!canManage || t.state === 'done' ? [{ label: 'Done', primary: true }] : [])
      ];
      modal({ title: t.name, body: html`<div class="sheet">
        <div class="sheet-top"><span class="tile-ic lg">${icon(t.ic)}</span><span class="sheet-status"><span class="sdot ${t.state}" aria-hidden="true"></span>${status}</span></div>
        <p>${t.about}</p>
        ${r.reference ? html`<p class="quiet">Reference <span class="mono">${r.reference}</span></p>` : ''}
        ${c.note ? html`<p class="quiet">${c.note}</p>` : ''}
        ${c.links?.length && t.state !== 'done' ? html`<div class="sheet-links">${c.links.map(l => html`<a class="btn" href="${l.url}" target="_blank" rel="noopener">${icon('search')} Check ${l.label}</a>`)}</div>` : ''}
      </div>`, actions });
    });
    on(el, 'click', '[data-act=edit]', () => modal({
      title: 'Edit details',
      body: html`<form class="form-grid" id="ef">
        <label class="field full"><span>Title</span><input class="input" name="title" value="${song.title}"></label>
        <label class="field"><span>Version</span><input class="input" name="version_title" value="${song.version_title || ''}" placeholder="e.g. Radio Edit"></label>
        <label class="field"><span>Artist credit</span><input class="input" name="artist_credit" value="${song.artist_credit}"></label>
        <label class="field"><span>ISRC</span><input class="input mono" name="isrc" value="${song.isrc || ''}" placeholder="US-ABC-26-00001"></label>
        <label class="field"><span>ISWC</span><input class="input mono" name="iswc" value="${song.iswc || ''}" placeholder="T-123.456.789-0"></label>
        <label class="field"><span>Release title</span><input class="input" name="release_title" value="${song.release_title || ''}"></label>
        <label class="field"><span>Release date</span><input class="input" type="date" name="release_date" value="${song.release_date || ''}"></label>
        <label class="field"><span>Genre</span><input class="input" name="genre" value="${song.genre || ''}"></label>
        <label class="field"><span>Artwork URL</span><input class="input" name="artwork_url" value="${song.artwork_url || ''}"></label>
      </form>`,
      actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: async (close, m) => {
        await api.patch(`/api/songs/${song.id}`, formData(m.querySelector('#ef'))); toast('Saved'); close(); reload();
      } }]
    }));
    on(el, 'click', '[data-act=add-code]', () => modal({
      title: 'Add a code',
      body: html`<form class="form-grid" id="cf">
        <label class="field"><span>Type</span><select class="input" name="type">${['ISRC', 'ISWC', 'UPC', 'EAN', 'IPI', 'ISNI', 'GRID', 'AUDIUS', 'OTHER'].map(t => html`<option>${t}</option>`)}</select></label>
        <label class="field"><span>Value</span><input class="input mono" name="value" required></label>
        <label class="field full"><span>Label <span class="hint">optional</span></span><input class="input" name="label"></label></form>`,
      actions: [{ label: 'Cancel' }, { label: 'Add', primary: true, onClick: async (close, m) => {
        await api.post(`/api/songs/${song.id}/codes`, formData(m.querySelector('#cf'))); toast('Code added'); close(); reload();
      } }]
    }));
    function openReg(org) {
      const r = regs[org] || {};
      modal({
        title: `${ORGS.find(o => o[0] === org)?.[1] || org}`,
        body: html`<form class="stack" id="rf">
          <label class="field"><span>Status</span><select class="input" name="status">${['missing', 'pending', 'registered', 'not_applicable'].map(s => html`<option value="${s}" ${r.status === s ? 'selected' : ''}>${{ missing: 'Not registered', pending: 'In progress', registered: 'Registered', not_applicable: 'Not needed' }[s]}</option>`)}</select></label>
          <label class="field"><span>Reference <span class="hint">work or member number</span></span><input class="input mono" name="reference" value="${r.reference || ''}"></label>
          <label class="field"><span>Territory</span><input class="input" name="territory" value="${r.territory || ''}" placeholder="Worldwide"></label>
          <label class="field"><span>Note</span><input class="input" name="note" value="${r.note || ''}"></label></form>`,
        actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: async (close, m) => {
          await api.put(`/api/songs/${song.id}/registrations/${encodeURIComponent(org)}`, formData(m.querySelector('#rf'))); toast('Registration updated'); close(); reload();
        } }]
      });
    }
  }
});

// ---------- History (hash-chained event log) ----------
const EVENT_LABELS = {
  'passport.created': 'Passport created', 'passport.updated': 'Details changed', 'code.added': 'Code added', 'registration.updated': 'Registration updated', 'passport.enriched': 'Filled in from public sources'
};
app.songTab({
  id: 'history', label: 'History', order: 90,
  render: async ({ el, song }) => {
    const { events, chain } = await api(`/api/songs/${song.id}/history`);
    return html`<div class="split-main"><div class="card card-pad">
      ${events.length ? html`<div class="timeline">${[...events].reverse().map(e => html`<div class="tl-item ${/signed|executed|approved/.test(e.type) ? 'ok' : ''}">
        <div class="row between"><b>${EVENT_LABELS[e.type] || e.type.replace(/[._]/g, ' ')}</b><span class="when" title="${dateTime(e.at)}">${ago(e.at)}</span></div>
        <div class="small muted">${e.actor_label || 'System'}</div>
        ${describe(e)}
        <div class="hash" style="margin-top:4px">#${e.hash.slice(0, 16)}</div></div>`)}</div>`
      : html`<div class="empty">No history yet.</div>`}
    </div>
    <div class="card card-pad stack">
      <h2 class="h3">Tamper-evident history</h2>
      <p class="muted small">Every change is chained to the one before it with SHA-256. Editing or deleting any past entry breaks the chain, so this check fails.</p>
      ${chain.ok ? html`<div class="seal">${icon('shield')} Chain intact · ${chain.checked} entries</div>` : html`<div class="callout crit">${icon('alert')}<div>Chain broken at ${chain.brokenAt}</div></div>`}
      ${chain.head ? html`<div><div class="label">Head hash</div><div class="hash">${chain.head}</div></div>` : ''}
    </div></div>`;
  }
});

function describe(e) {
  const p = e.payload || {};
  if (e.type === 'passport.updated' && p.after) return html`<div class="small" style="margin-top:4px">${Object.keys(p.after).map(k => html`<div><span class="muted">${k.replace(/_/g, ' ')}:</span> ${p.before?.[k] ?? '—'} → <b>${p.after[k] ?? '—'}</b></div>`)}</div>`;
  if (e.type === 'code.added') return html`<div class="small mono">${p.type} ${p.value}</div>`;
  if (e.type === 'registration.updated') return html`<div class="small">${p.org}: ${p.status}${p.reference ? ` (${p.reference})` : ''}</div>`;
  if (p.summary) return html`<div class="small">${p.summary}</div>`;
  return '';
}
