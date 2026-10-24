// Admin: catalog imports. Totals of draft passports, per-source counts, run history, CSV upload,
// and the exact commands for loading the full MusicBrainz and Audius catalogs.
import { app, html, raw, api, toast, modal, icon, on, busy, upload, ago, dateTime, bytes, esc } from '../app.js';

if (!document.getElementById('im-style')) {
  const st = document.createElement('style');
  st.id = 'im-style';
  st.textContent = `
  .im-hero { position:relative; overflow:hidden; padding:28px; background:
    radial-gradient(80% 140% at 0% 0%, color-mix(in srgb, var(--blue) 18%, transparent), transparent 60%),
    radial-gradient(70% 120% at 100% 100%, color-mix(in srgb, var(--violet) 16%, transparent), transparent 60%), var(--surface); }
  .im-hero h1 { font-size: clamp(26px, 4vw, 34px); letter-spacing: -0.03em; }
  .im-hero .big { font: 700 clamp(40px, 7vw, 64px)/1 var(--display); letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
  .im-hero .lede { color: var(--muted); max-width: 640px; font-size: 15px; }
  .im-stats { display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:16px; }
  .im-src { display:grid; grid-template-columns: minmax(0,1.6fr) 110px 90px minmax(80px,1fr); gap:14px; align-items:center; padding:13px 22px; border-bottom:1px solid var(--line); }
  .im-src:last-child { border-bottom:0; }
  .im-src.head { font-size:11.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); padding-top:10px; padding-bottom:10px; }
  .im-src .t { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .im-src .s { font-size:12px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .im-src .n { font-family:var(--mono); font-variant-numeric:tabular-nums; text-align:right; font-size:13px; }
  .im-code { position:relative; background: #0B0B12; color:#E6E6F0; border-radius: var(--r-sm); padding: 14px 16px; font: 12.5px/1.65 var(--mono); overflow-x:auto; white-space:pre; margin:0; }
  .im-code .c { color:#8C8CA6; }
  .im-copy { position:absolute; top:8px; right:8px; background:rgba(255,255,255,.08); color:#E6E6F0; border:0; border-radius:8px; padding:4px 9px; font-size:11.5px; cursor:pointer; }
  .im-copy:hover { background:rgba(255,255,255,.16); }
  .im-step { display:grid; grid-template-columns: 28px minmax(0,1fr); gap:12px; }
  .im-step .num { width:28px; height:28px; border-radius:9px; background:var(--grad-soft); color:var(--accent); display:grid; place-items:center; font-weight:700; font-size:13px; }
  .im-pulse::before { animation: im-pulse 1.2s ease-in-out infinite; }
  @keyframes im-pulse { 50% { opacity:.2; } }
  .im-runs td { font-variant-numeric: tabular-nums; }
  .im-srccell { max-width: 280px; }
  #im-drop svg { width:30px; height:30px; color:var(--accent); }
  .im-hosts { display:flex; flex-wrap:wrap; gap:6px; }
  @media (max-width: 860px) { .im-stats { grid-template-columns: repeat(2, minmax(0,1fr)); } }
  @media (max-width: 560px) {
    .im-hero { padding:20px; }
    .im-src { grid-template-columns: minmax(0,1fr) 84px; }
    .im-src .hide-sm { display:none; }
    .im-runs .hide-sm { display:none; }
    .im-srccell { max-width: 190px; }
    .im-runs td, .im-runs th { padding-left: 10px; padding-right: 10px; }
  }`;
  document.head.appendChild(st);
}

const n = v => (v ?? 0).toLocaleString('en-US');
const compact = v => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(v || 0);

function runBadge(r) {
  if (r.stalled) return html`<span class="badge warn">Stalled</span>`;
  if (r.status === 'running') return html`<span class="badge info im-pulse">Running</span>`;
  if (r.status === 'done') return html`<span class="badge ok">Done</span>`;
  if (r.status === 'failed') return html`<span class="badge crit">Failed</span>`;
  if (r.status === 'cancelled') return html`<span class="badge">Cancelled</span>`;
  return html`<span class="badge">${r.status}</span>`;
}

const sourceName = (src, datasets) => {
  if (src.startsWith('open:')) return datasets.find(d => 'open:' + d.id === src)?.title || src.slice(5);
  return { musicbrainz: 'MusicBrainz', audius: 'Audius', 'csv-upload': 'CSV uploads', csv: 'CSV files', manual: 'Created by artists' }[src] || src;
};

const code = (text) => html`<div style="position:relative"><button class="im-copy" data-act="copy">Copy</button><pre class="im-code">${raw(esc(text).replace(/^(#.*)$/gm, '<span class="c">$1</span>'))}</pre></div>`;

const MB_STEPS = `# 1. A machine with 8 GB RAM, 4 cores and 150 GB free disk (SSD). Node 22.13+ and xz:
sudo apt-get install -y xz-utils            # macOS: brew install xz

# 2. Get the code and point it at your production database
cd openbox && export OB_DB_PATH=/srv/openbox/openbox.db

# 3. Load every artist, recording, release and work (streams from data.metabrainz.org; nothing kept on disk)
node --disable-warning=ExperimentalWarning scripts/import/run.js musicbrainz --stream

#    or download first (about 25 GB of .tar.xz), import, and delete each archive afterwards:
node --disable-warning=ExperimentalWarning scripts/import/run.js musicbrainz --download

# 4. If it stops, run the same command with --resume; it continues from the last committed batch
node --disable-warning=ExperimentalWarning scripts/import/run.js musicbrainz --stream --resume`;

const AUDIUS_STEPS = `# Trending tracks in every genre and window, then each artist's full catalog
node --disable-warning=ExperimentalWarning scripts/import/run.js audius --max-users 5000

# One artist, or a search
node --disable-warning=ExperimentalWarning scripts/import/run.js audius --user nkwLb
node --disable-warning=ExperimentalWarning scripts/import/run.js audius --query "afrobeats" --max-users 500

# Optional: an Audius API key raises rate limits
export AUDIUS_API_KEY=... AUDIUS_APP_NAME=song-passport`;

const OPEN_STEPS = `# Every open dataset reachable from GitHub (cached in data/imports/open, safe to re-run)
node --disable-warning=ExperimentalWarning scripts/import/run.js open --all

# Your own catalog file (title, artist, isrc, iswc, upc, release, date, duration ... header aliases understood)
node --disable-warning=ExperimentalWarning scripts/import/run.js csv ./catalog.csv`;

const HOSTS = ['data.metabrainz.org', 'musicbrainz.org', 'api.audius.co', 'discoveryprovider.audius.co', 'discoveryprovider2.audius.co', 'discoveryprovider3.audius.co', '*.audius.co', 'raw.githubusercontent.com'];

app.nav({ id: 'imports', label: 'Imports', href: '/admin/imports', icon: 'layers', section: 'Admin', order: 90, auth: true, admin: true });

app.route('/admin/imports', async ({ el, user, isCurrent }) => {
  if (user?.role !== 'admin') {
    return html`<div class="empty"><div class="icon">${icon('lock')}</div><h2 class="h3">Admins only</h2><p>Imports load draft passports for every song in the world. Ask an admin for access.</p></div>`;
  }
  let data = await api('/api/admin/imports');
  let tab = 'musicbrainz';
  let timer = null;

  const paint = () => {
    const t = data.totals;
    const maxSongs = Math.max(1, ...t.songs_by_source.map(s => s.n));
    const artistsBy = Object.fromEntries(t.artists_by_source.map(s => [s.source, s.n]));
    const isrc = t.codes_by_type.find(c => c.type === 'ISRC')?.n || 0;
    const active = data.runs.filter(r => r.status === 'running' && !r.stalled);
    el.innerHTML = html`
    <div class="card im-hero" style="margin-bottom:20px">
      <div class="row between wrap" style="align-items:flex-start;gap:20px">
        <div class="stack-sm" style="max-width:660px">
          <span class="eyebrow">${icon('globe')} Catalog imports</span>
          <h1>Draft passports for every song</h1>
          <p class="lede">Built from open data so artists can find their songs and claim them. Drafts are unverified and never show splits or ownership. Only codes that pass ISRC, ISWC and UPC validation are kept.</p>
        </div>
        <div class="stack-sm" style="text-align:right;min-width:180px">
          <div class="big grad-text">${compact(t.songs_draft)}</div>
          <div class="small muted">draft passports waiting to be claimed</div>
        </div>
      </div>
      <div class="row wrap" style="margin-top:18px">
        <button class="btn btn-primary" data-act="upload">${icon('upload')} Upload a CSV</button>
        <button class="btn" data-act="refresh">${icon('clock')} Refresh totals</button>
        ${active.length ? html`<span class="badge info im-pulse">${active.length} import${active.length > 1 ? 's' : ''} running</span>` : ''}
      </div>
    </div>

    <div class="im-stats" style="margin-bottom:20px">
      <div class="card stat"><div class="label">${icon('music')} Songs</div><div class="value">${n(t.songs)}</div><div class="sub">${n(t.songs - t.songs_draft)} claimed or created by artists</div></div>
      <div class="card stat"><div class="label">${icon('users')} Artists</div><div class="value">${n(t.artists)}</div><div class="sub">${n(t.artists - t.artists_draft)} claimed</div></div>
      <div class="card stat"><div class="label">${icon('shield')} Songs with an ISRC</div><div class="value">${n(t.songs_with_isrc)}</div><div class="sub">${n(isrc)} valid ISRCs in total</div></div>
      <div class="card stat"><div class="label">${icon('key')} Codes</div><div class="value">${n(t.codes)}</div><div class="sub">${t.codes_by_type.slice(0, 3).map(c => `${c.type === 'OTHER' ? 'Spotify/other' : c.type} ${compact(c.n)}`).join(' · ') || 'None yet'}</div></div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-head"><h2 class="h3">By source</h2><span class="small muted">Songs are merged across sources by MBID, Audius id, ISRC and artist + title</span></div>
      ${t.songs_by_source.length ? html`
      <div class="im-src head"><span>Source</span><span class="n">Songs</span><span class="n hide-sm">Artists</span><span class="hide-sm">Share</span></div>
      ${t.songs_by_source.map(s => {
        const ds = data.datasets.find(d => 'open:' + d.id === s.source);
        return html`<div class="im-src">
          <div style="min-width:0"><div class="t">${sourceName(s.source, data.datasets)}</div>
            <div class="s">${ds ? ds.licence : s.source === 'manual' ? 'Passports artists created themselves' : s.source}</div></div>
          <span class="n">${n(s.n)}</span>
          <span class="n hide-sm">${n(artistsBy[s.source] || 0)}</span>
          <div class="hide-sm"><div class="progress"><i style="width:${Math.max(2, s.n / maxSongs * 100)}%"></i></div></div>
        </div>`;
      })}` : html`<div class="empty"><div class="icon">${icon('layers')}</div><h2 class="h3">No songs yet</h2><p>Run <span class="chip">node scripts/import/run.js open --all</span> or upload a CSV to create the first draft passports.</p></div>`}
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-head"><h2 class="h3">Run history</h2><span class="small muted">${data.runs.length ? `Last ${data.runs.length}` : ''}</span></div>
      ${data.runs.length ? html`<div class="table-wrap"><table class="table im-runs">
        <thead><tr><th class="hide-sm">Started</th><th>Source</th><th>Status</th><th class="r hide-sm">Rows</th><th class="r">New songs</th><th class="r hide-sm">Merged</th><th class="r hide-sm">Codes</th><th class="r hide-sm">Rejected</th></tr></thead>
        <tbody>${data.runs.map(r => {
          const c = r.counts || {}, rej = c.rejected || {};
          const rejected = (rej.ISRC || 0) + (rej.ISWC || 0) + (rej.UPC || 0);
          return html`<tr class="click" data-run="${r.id}">
            <td class="hide-sm"><div style="font-weight:600">${ago(r.started_at)}</div><div class="tiny muted hide-sm">${dateTime(r.started_at)}</div></td>
            <td class="im-srccell"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.label || sourceName(r.source, data.datasets)}</div><div class="tiny muted" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ago(r.started_at)} · ${r.source}${r.input ? ' · ' + r.input : ''}</div></td>
            <td>${runBadge(r)}</td>
            <td class="r mono hide-sm">${n(c.rows)}</td>
            <td class="r mono">${n(c.songs_created)}</td>
            <td class="r mono hide-sm">${n(c.songs_merged)}</td>
            <td class="r mono hide-sm">${n(c.codes_added)}</td>
            <td class="r mono hide-sm">${rejected ? html`<span title="ISRC ${rej.ISRC || 0} · ISWC ${rej.ISWC || 0} · UPC ${rej.UPC || 0}">${n(rejected)}</span>` : '0'}</td>
          </tr>`;
        })}</tbody></table></div>`
      : html`<div class="empty"><div class="icon">${icon('clock')}</div><h2 class="h3">No imports have run</h2><p>Each import, from the command line or this page, is recorded here with its counts.</p></div>`}
    </div>

    <div class="grid grid-2" style="margin-bottom:20px;align-items:start">
      <div class="card">
        <div class="card-head"><h2 class="h3">Upload a catalog</h2><span class="badge plain">CSV or TSV</span></div>
        <div class="card-pad stack">
          <div class="dropzone" data-act="pick" id="im-drop" role="button" tabindex="0" aria-label="Choose a catalogue file">${icon('upload')}<div style="margin-top:8px"><b>Drop a file</b> or click to choose</div><div class="small">Up to 512 MB. Re-uploading the same file never creates duplicates.</div></div>
          <input type="file" id="im-file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden>
          <div id="im-up"></div>
          <div class="small muted">Recognised columns (any of these names):</div>
          <div class="row wrap">${['title / track / song', 'artist / performer', 'isrc', 'iswc', 'upc / barcode', 'release / album', 'date / year', 'duration / duration_ms', 'genre', 'mbid', 'spotify_id'].map(c => html`<span class="chip">${c}</span>`)}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h2 class="h3">Open datasets</h2><span class="small muted">${data.datasets.length} listed</span></div>
        <div class="list" style="max-height:420px;overflow:auto">${data.datasets.map(d => html`<div class="list-item">
          <div class="grow" style="min-width:0"><div class="title" style="white-space:normal">${d.title} ${d.hasIsrc ? html`<span class="badge ok plain">ISRCs</span>` : ''}</div>
            <div class="sub" style="white-space:normal">${d.licence}</div></div>
          <button class="btn btn-sm" data-act="rerun" data-ds="${d.id}">Run</button></div>`)}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <div class="card-head"><h2 class="h3">Load the full catalogs</h2><span class="badge warn plain">${icon('globe')} Needs network access</span></div>
      <div class="card-pad stack-lg">
        <div class="callout info">${icon('info')}<div>This server can't reach MusicBrainz or Audius from where it runs, so those two sources are loaded from a machine (or a cloud environment) that can. Everything else above loads from here. Full details are in <span class="chip">docs/DATA.md</span>.</div></div>
        <nav class="tabs" style="margin-bottom:0">${[['musicbrainz', 'MusicBrainz'], ['audius', 'Audius'], ['open', 'Open data and CSV'], ['hosts', 'Network allow-list']].map(([id, label]) => html`<button class="${tab === id ? 'on' : ''}" data-tab="${id}">${label}</button>`)}</nav>
        ${tab === 'musicbrainz' ? html`
          <div class="grid grid-3">
            <div class="card stat"><div class="label">Disk</div><div class="value">60-80 GB</div><div class="sub">database after import; keep 150 GB free (+25 GB to download archives first)</div></div>
            <div class="card stat"><div class="label">Memory</div><div class="value">~1 GB</div><div class="sub">streaming importer; 8 GB machine recommended</div></div>
            <div class="card stat"><div class="label">Time</div><div class="value">6-12 h</div><div class="sub">on 4 cores and an SSD; resumable</div></div>
          </div>
          ${code(MB_STEPS)}
          <p class="small muted">About 2.5 million artists and 35 million recordings. Order matters and is automatic: artists, then recordings (songs, ISRCs), then releases (UPCs, release titles), then works (ISWCs). MusicBrainz core data is CC0.</p>`
        : tab === 'audius' ? html`${code(AUDIUS_STEPS)}<p class="small muted">Track ids become <span class="chip">songs.audius_track_id</span> and an AUDIUS code; user ids become <span class="chip">artists.audius_user_id</span>, so Audius artists can claim with their Audius account.</p>`
        : tab === 'open' ? code(OPEN_STEPS)
        : html`<p class="small">Allow these hosts in the environment's network policy (Claude Code cloud environment: Settings, Network access, Custom allow-list):</p>
          <div class="im-hosts">${HOSTS.map(h => html`<span class="chip">${h}</span>`)}</div>
          <p class="small muted">Then run the MusicBrainz and Audius commands above in that environment, pointed at the production database with <span class="chip">OB_DB_PATH</span>.</p>`}
      </div>
    </div>`.s;

    clearTimeout(timer);
    if (active.length || data.runs.some(r => r.active)) {
      timer = setTimeout(async () => {
        if (!isCurrent()) return;
        try { data = await api('/api/admin/imports?fresh=1'); if (isCurrent()) paint(); } catch {}
      }, 3000);
    }
  };

  const reload = async (fresh = true) => { data = await api(`/api/admin/imports${fresh ? '?fresh=1' : ''}`); paint(); };

  const startUpload = async file => {
    if (!file) return;
    const box = el.querySelector('#im-up');
    box.innerHTML = html`<div class="stack-sm"><div class="row between small"><span>${file.name}</span><span class="muted">${bytes(file.size)}</span></div><div class="progress"><i style="width:0%"></i></div></div>`.s;
    const bar = box.querySelector('.progress i');
    try {
      const r = await upload(`/api/admin/imports/csv?label=${encodeURIComponent(file.name)}`, file, { onProgress: f => { bar.style.width = `${Math.round(f * 100)}%`; } });
      toast(`Importing ${file.name}: found ${r.detected.join(', ')}`);
      await reload();
    } catch (e) {
      box.innerHTML = html`<div class="callout crit">${icon('alert')}<div>${e.message}</div></div>`.s;
    }
  };

  on(el, 'click', '[data-act=refresh]', (e, b) => busy(b, () => reload(true)));
  on(el, 'click', '[data-act=upload], [data-act=pick]', () => el.querySelector('#im-file')?.click());
  on(el, 'change', '#im-file', e => startUpload(e.target.files[0]));
  on(el, 'dragover', '#im-drop', (e, d) => { e.preventDefault(); d.classList.add('over'); });
  on(el, 'dragleave', '#im-drop', (e, d) => d.classList.remove('over'));
  on(el, 'drop', '#im-drop', (e, d) => { e.preventDefault(); d.classList.remove('over'); startUpload(e.dataTransfer.files[0]); });
  on(el, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; paint(); });
  on(el, 'click', '[data-act=copy]', (e, b) => {
    navigator.clipboard?.writeText(b.nextElementSibling.textContent);
    b.textContent = 'Copied'; setTimeout(() => { b.textContent = 'Copy'; }, 1400);
  });
  on(el, 'click', '[data-act=rerun]', (e, b) => busy(b, async () => {
    await api.post(`/api/admin/imports/open/${b.dataset.ds}`);
    toast('Import started');
    await reload(false);
  }));
  on(el, 'click', 'tr[data-run]', async (e, tr) => {
    const { run } = await api(`/api/admin/imports/${tr.dataset.run}`);
    const c = run.counts || {}, rej = c.rejected || {};
    const secs = Math.max(1, ((run.finished_at ? new Date(run.finished_at) : new Date(run.updated_at)) - new Date(run.started_at)) / 1000);
    const rows = [
      ['Source', run.source], ['Input', run.input || '—'], ['Started', dateTime(run.started_at)], ['Finished', run.finished_at ? dateTime(run.finished_at) : 'Not yet'],
      ['Rows read', n(c.rows)], ['Speed', `${n(Math.round((c.rows || 0) / secs))} rows/s`],
      ['New songs', n(c.songs_created)], ['Merged into existing', n(c.songs_merged)], ['Facts added (releases, works)', n(c.songs_patched)],
      ['New artists', n(c.artists_created)], ['Codes added', n(c.codes_added)],
      ['Rejected codes', `ISRC ${n(rej.ISRC)} · ISWC ${n(rej.ISWC)} · UPC ${n(rej.UPC)}`],
      ['Skipped', `${n(c.skipped_duplicate)} repeats · ${n(c.skipped_invalid)} incomplete · ${n(c.skipped_claimed)} claimed · ${n(c.skipped_unmatched)} unmatched`],
      ['Checkpoint', `${n(run.checkpoint?.rows)} rows committed`]
    ];
    await modal({
      title: run.label || run.source, wide: true,
      body: html`<div class="stack">
        <div class="row">${runBadge(run)}<span class="small muted mono">${run.id}</span></div>
        <dl class="kv">${rows.map(([k, v]) => html`<dt>${k}</dt><dd>${v}</dd>`)}</dl>
        ${run.errors?.length ? html`<div class="callout warn">${icon('alert')}<div><b>${run.errors.length} message${run.errors.length > 1 ? 's' : ''}</b><ul style="margin:6px 0 0;padding-left:18px">${run.errors.slice(0, 12).map(x => html`<li class="small">${x}</li>`)}</ul></div></div>` : ''}
      </div>`,
      actions: [
        ...(run.active ? [{ label: 'Cancel import', danger: true, onClick: async () => { await api.post(`/api/admin/imports/${run.id}/cancel`); toast('Cancelling'); await reload(false); } }] : []),
        { label: 'Close' }
      ]
    });
  });

  paint();
}, { auth: true, title: 'Imports' });
