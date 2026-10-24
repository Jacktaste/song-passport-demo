// Workspace: "GitHub for a song". Private files for everyone on the song (stems, mixes, masters, sessions),
// versions as commits with a git-like graph, diffs, restore, zip downloads, a studio player with waveform,
// A/B compare and timestamped notes, and remixes that fork the tree and carry their own split.
import { app, html, raw, api, upload, toast, modal, confirmDialog, icon, on, busy, bytes, ago, dateTime, colorFor, initials, statusBadge, esc } from '../app.js';

// ---------- look ----------
const CSS = `
#ws-player { scroll-margin-top: 84px; }
.ws-grid { display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 18px; align-items: start; }
@media (max-width: 1100px) { .ws-grid { grid-template-columns: 1fr; } }
.ws-head { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; padding: 18px 22px; }
.ws-head .ws-stats { display: flex; gap: 26px; flex-wrap: wrap; flex: 1; min-width: 0; }
.ws-head .ws-stat b { display: block; font: 700 20px/1.1 var(--display); letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }
.ws-head .ws-stat span { font-size: 12px; color: var(--muted); }
.ws-drop { position: relative; border: 1.5px dashed var(--line-strong); border-radius: var(--r-lg); padding: 26px 20px; text-align: center; cursor: pointer;
  transition: border-color .15s, background .15s, transform .15s; background: linear-gradient(180deg, var(--surface), var(--surface-2)); }
.ws-drop:hover { border-color: var(--accent); }
.ws-drop.over { border-color: var(--accent); background: var(--accent-soft); transform: scale(1.005); }
.ws-drop .ws-drop-icon { width: 46px; height: 46px; margin: 0 auto 10px; border-radius: 14px; display: grid; place-items: center; background: var(--accent-strong); color: #fff; }
.ws-drop .ws-drop-icon svg { width: 22px; height: 22px; }
.ws-q { display: flex; align-items: center; gap: 12px; padding: 10px 22px; border-top: 1px solid var(--line); }
.ws-q .ws-q-bar { height: 4px; border-radius: 9px; background: var(--surface-3); overflow: hidden; margin-top: 6px; }
.ws-q .ws-q-bar i { display: block; height: 100%; background: var(--grad); transition: width .2s; }
.ws-q.err .ws-q-bar i { background: var(--crit); }
.ws-ico { width: 38px; height: 38px; border-radius: 11px; flex: none; display: grid; place-items: center; color: #fff; }
.ws-ico svg { width: 19px; height: 19px; }
.ws-group { padding: 12px 22px 4px; display: flex; align-items: center; gap: 8px; }
.ws-file { display: flex; align-items: center; gap: 14px; padding: 11px 22px; border-top: 1px solid var(--line); cursor: default; transition: background .12s; }
.ws-file:hover { background: var(--surface-2); }
.ws-file.on { background: var(--accent-soft); }
.ws-file .grow { flex: 1; min-width: 0; }
.ws-file .ws-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ws-file .ws-sub { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ws-spark { display: flex; align-items: center; gap: 1px; height: 26px; width: 110px; flex: none; }
.ws-spark i { flex: 1; background: var(--line-strong); border-radius: 1px; min-height: 2px; }
.ws-file.on .ws-spark i { background: var(--accent); }
.ws-acts { display: flex; gap: 2px; flex: none; }
@media (max-width: 640px) { .ws-spark { display: none; } .ws-file, .ws-q, .ws-group { padding-left: 16px; padding-right: 16px; } .ws-head .ws-stats { gap: 16px; } }

/* Studio player: always dark, like a console. */
.ws-studio { position: relative; border-radius: var(--r-lg); overflow: hidden; color: #EDEDF2; background:
  radial-gradient(120% 120% at 0% 0%, rgba(126,27,204,.24), transparent 55%), radial-gradient(90% 120% at 100% 100%, rgba(193,123,245,.14), transparent 60%), #0B0B0E;
  box-shadow: 0 24px 60px rgba(10,10,40,.35), inset 0 0 0 1px rgba(255,255,255,.06); }
.ws-studio .muted { color: rgba(237,237,242,.6); }
.ws-studio-top { display: flex; align-items: center; gap: 12px; padding: 16px 18px 6px; }
.ws-studio-top .grow { flex: 1; min-width: 0; }
.ws-studio .ws-title { font-weight: 650; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ws-studio .chip { background: rgba(255,255,255,.08); color: #D9D9E3; }
.ws-studio .btn { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.1); color: #EDEDF2; }
.ws-studio .btn:hover { background: rgba(255,255,255,.13); }
.ws-wave { position: relative; height: 112px; margin: 8px 18px 0; cursor: pointer; touch-action: none; }
.ws-wave canvas { width: 100%; height: 100%; display: block; }
.ws-wave .ws-mark { position: absolute; top: -4px; width: 2px; bottom: 0; background: #FFC24B; border-radius: 2px; transform: translateX(-1px); }
.ws-wave .ws-mark::before { content: ""; position: absolute; top: -3px; left: -4px; width: 10px; height: 10px; border-radius: 50%; background: #FFC24B; box-shadow: 0 0 0 3px rgba(255,194,75,.25); }
.ws-wave .ws-mark.res { background: rgba(255,255,255,.25); }
.ws-wave .ws-mark.res::before { background: rgba(255,255,255,.35); box-shadow: none; }
.ws-wave .ws-load { position: absolute; inset: 0; display: grid; place-items: center; font-size: 12.5px; color: rgba(237,237,242,.6); }
.ws-ctrl { display: flex; align-items: center; gap: 14px; padding: 12px 18px 16px; flex-wrap: wrap; }
.ws-play { width: 52px; height: 52px; border-radius: 50%; border: 0; display: grid; place-items: center; cursor: pointer; color: #fff; background: var(--accent-strong); flex: none; }
.ws-play svg { width: 22px; height: 22px; }
.ws-play:active { transform: scale(.96); }
.ws-time { font: 500 13px var(--mono); color: #D9D9E3; font-variant-numeric: tabular-nums; }
.ws-ab { display: inline-flex; background: rgba(255,255,255,.07); border-radius: 12px; padding: 3px; gap: 2px; align-items: center; }
.ws-ab button { border: 0; background: transparent; color: rgba(237,237,242,.65); padding: 6px 12px; border-radius: 9px; font-weight: 700; font-size: 12.5px; cursor: pointer; font-family: var(--mono); }
.ws-ab button.on { background: #fff; color: #0B0B12; }
.ws-ab select { background: transparent; color: #EDEDF2; border: 0; font: 600 12.5px var(--sans); padding: 4px 6px; max-width: 160px; }
.ws-ab select option { color: #000; }
.ws-notes { border-top: 1px solid rgba(255,255,255,.08); padding: 12px 18px 16px; }
.ws-notes form { display: flex; gap: 8px; }
.ws-notes input { flex: 1; min-width: 0; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: #fff; border-radius: 11px; padding: 9px 12px; outline: none; }
.ws-notes input:focus { border-color: rgba(124,140,255,.8); }
.ws-note { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
.ws-note:last-child { border-bottom: 0; }
.ws-note .ws-at { font: 600 12px var(--mono); color: #FFC24B; background: rgba(255,194,75,.12); border-radius: 7px; padding: 2px 7px; cursor: pointer; border: 0; flex: none; }
.ws-note.res { opacity: .5; }
.ws-note.res .ws-body { text-decoration: line-through; }

/* Version graph */
.ws-graph { position: relative; }
.ws-graph svg.ws-lines { position: absolute; left: 0; top: 0; pointer-events: none; }
.ws-row { position: relative; display: flex; align-items: center; gap: 10px; height: 66px; padding-right: 16px; cursor: pointer; border-radius: 12px; }
.ws-row:hover { background: var(--surface-2); }
.ws-row > svg { width: 16px; height: 16px; flex: none; color: var(--muted); }
.ws-row .grow { flex: 1; min-width: 0; }
.ws-row .ws-msg { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 13.5px; }
.ws-row .ws-meta { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ws-row .ws-v { font: 700 11px var(--mono); padding: 2px 7px; border-radius: 7px; background: var(--surface-3); color: var(--fg-2); flex: none; }
.ws-row.head .ws-v { background: var(--grad); color: #fff; }
.ws-row.fork .ws-msg { color: var(--violet); }
.ws-delta { font: 600 11.5px var(--mono); }
.ws-delta .a { color: var(--ok); } .ws-delta .c { color: var(--warn); } .ws-delta .r { color: var(--crit); }
.ws-diff-row { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
.ws-diff-row:last-child { border-bottom: 0; }
.ws-tag { font: 700 10.5px var(--mono); width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; flex: none; }
.ws-tag.a { background: var(--ok-soft); color: var(--ok); } .ws-tag.c { background: var(--warn-soft); color: var(--warn); } .ws-tag.r { background: var(--crit-soft); color: var(--crit); } .ws-tag.m { background: var(--info-soft); color: var(--info); }
.ws-share { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 520px) { .ws-share { grid-template-columns: 1fr; } }
.ws-pctin { position: relative; } .ws-pctin input { padding-right: 32px; } .ws-pctin::after { content: "%"; position: absolute; right: 13px; top: 50%; transform: translateY(-50%); color: var(--muted); font-weight: 600; }
.ws-req { padding: 14px 22px; border-top: 1px solid var(--line); display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
`;
if (!document.getElementById('ws-style')) {
  const s = document.createElement('style'); s.id = 'ws-style'; s.textContent = CSS; document.head.appendChild(s);
}

const KINDS = {
  stem: { label: 'Stems', one: 'Stem', color: '#7E1BCC', svg: '<path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0"/>' },
  mix: { label: 'Mixes', one: 'Mix', color: '#8B5CF6', svg: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/>' },
  master: { label: 'Masters', one: 'Master', color: '#E11D48', svg: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>' },
  session: { label: 'Sessions', one: 'Session', color: '#F97316', svg: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>' },
  artwork: { label: 'Artwork', one: 'Artwork', color: '#10B981', svg: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>' },
  lyrics: { label: 'Lyrics', one: 'Lyrics', color: '#06B6D4', svg: '<path d="M4 6h16M4 10h16M4 14h10M4 18h7"/>' },
  notes: { label: 'Notes', one: 'Notes', color: '#64748B', svg: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>' },
  other: { label: 'Other files', one: 'File', color: '#6366F1', svg: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>' }
};
const KIND_ORDER = ['master', 'mix', 'stem', 'session', 'artwork', 'lyrics', 'notes', 'other'];
const RELATIONS = { remix: 'Remix', edit: 'Edit', cover: 'Cover', sample: 'Sample', version: 'Version' };
const kicon = (kind, size = 38) => raw(`<div class="ws-ico" style="background:${(KINDS[kind] || KINDS.other).color};width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${(KINDS[kind] || KINDS.other).svg}</svg></div>`);
const isAudio = f => /^audio\//.test(f.mime || '') || /\.(wav|aiff?|flac|mp3|m4a|aac|ogg|opus)$/i.test(f.path);
const isImage = f => /^image\//.test(f.mime || '') || /\.(png|jpe?g|webp|gif)$/i.test(f.path);
const blobUrl = (hash, name, dl) => `/blob/${hash}?name=${encodeURIComponent(name.split('/').pop())}${dl ? '&download=1' : ''}`;
const clock = s => { s = Math.max(0, s || 0); const m = Math.floor(s / 60); return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
const parseClock = v => { const m = /^(\d+):(\d{1,2})$/.exec(String(v).trim()); return m ? (+m[1] * 60 + +m[2]) * 1000 : null; };
const delta = st => html`<span class="ws-delta">${st.added ? html`<span class="a">+${st.added}</span> ` : ''}${st.changed ? html`<span class="c">~${st.changed}</span> ` : ''}${st.removed ? html`<span class="r">−${st.removed}</span>` : ''}</span>`;
const guessKind = name => {
  const f = name.toLowerCase();
  if (/\.(als|alp|logicx|ptx|ptf|flp|rpp|cpr|song|band|aup3?|reason|bwproject|zip)$/.test(f)) return 'session';
  if (/\.(png|jpe?g|webp|gif|tiff?|psd|heic)$/.test(f)) return 'artwork';
  if (/lyric/.test(f) || /\.lrc$/.test(f)) return 'lyrics';
  if (/\.(txt|md|rtf|docx?|pdf)$/.test(f)) return 'notes';
  if (/\.(wav|aiff?|flac|mp3|m4a|aac|ogg|opus|caf)$/.test(f)) return /master/.test(f) ? 'master' : /stem|vox|vocal|drum|bass|kick|snare|hat|synth|guitar|keys|piano|pad|fx|perc|bv|adlib|808/.test(f) ? 'stem' : 'mix';
  return 'other';
};

// ---------- waveform peaks (computed once in the browser, cached per content hash on the server) ----------
const peakCache = new Map();
async function peaksFor(file) {
  if (peakCache.has(file.hash)) return peakCache.get(file.hash);
  const p = (async () => {
    const cached = await api(`/api/blobs/${file.hash}/peaks`).catch(() => null);
    if (cached?.peaks) return { peaks: cached.peaks.map(v => v / 255), duration_ms: cached.duration_ms };
    if (file.size > 400 * 1048576) return null;
    const buf = await (await fetch(blobUrl(file.hash, file.path), { credentials: 'same-origin' })).arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    let audio;
    try { audio = await ac.decodeAudioData(buf); } finally { ac.close?.(); }
    const N = 960, len = audio.length, step = Math.max(1, Math.floor(len / N));
    const chans = Array.from({ length: audio.numberOfChannels }, (_, i) => audio.getChannelData(i));
    const peaks = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const a = Math.floor(i * len / N), b = Math.min(len, a + step);
      let m = 0;
      for (const ch of chans) for (let j = a; j < b; j += 4) { const v = Math.abs(ch[j]); if (v > m) m = v; }
      peaks[i] = m;
    }
    const max = Math.max(...peaks) || 1;
    const norm = peaks.map(v => Math.round(v / max * 1000) / 1000);
    const duration_ms = Math.round(audio.duration * 1000);
    api.post(`/api/blobs/${file.hash}/peaks`, { peaks: norm, duration_ms }).catch(() => {});
    return { peaks: norm, duration_ms };
  })();
  peakCache.set(file.hash, p);
  p.catch(() => peakCache.delete(file.hash));
  return p;
}

// ---------- the tab ----------
app.songTab({
  id: 'workspace', label: 'Workspace', order: 20,
  show: (song, { canManage, isContributor }) => song.status !== 'draft' && (canManage || isContributor),
  render: ({ el, song, user, reload }) => workspace(el, song, user, reload)
});

// People who are not on the song can ask to remix it.
app.songTab({
  id: 'remix', label: 'Remix', order: 21,
  show: (song, { canManage, isContributor, user }) => song.status !== 'draft' && !!user && !canManage && !isContributor,
  render: async ({ el, song, user }) => {
    const paint = async () => {
      const { requests } = await api(`/api/songs/${song.id}/remix-requests/mine`);
      const pending = requests.find(q => q.status === 'pending');
      el.innerHTML = html`<div class="grid grid-2" style="align-items:start">
        <div class="card hero card-pad stack">
          <div class="row" style="gap:12px"><span class="ws-ico" style="background:rgba(255,255,255,.16)">${icon('git')}</span><span class="eyebrow" style="color:rgba(255,255,255,.8)">Remix with a split built in</span></div>
          <h2 style="font-size:26px">Make a remix of “${song.title}”</h2>
          <p class="muted">Propose what the original keeps. If ${song.artist_credit} approves, you get your own workspace with every stem from the latest version, and a draft split that pays the original automatically.</p>
          <div class="row wrap">${pending ? html`<span class="badge warn">Request waiting for approval</span>` : html`<button class="btn btn-lg" style="background:#fff;color:#111;border:0" data-act="ws-request">${icon('git')} Request to remix</button>`}</div>
        </div>
        <div class="card"><div class="card-head"><h2 class="h3">Your requests</h2></div>
          ${requests.length ? html`<div class="list">${requests.map(q => html`<div class="list-item"><div class="grow"><div class="title">${q.title}</div>
            <div class="sub">${RELATIONS[q.relation]} · original keeps ${q.parent_master_bps / 100}% master, ${q.parent_publishing_bps / 100}% publishing · ${ago(q.created_at)}</div>
            ${q.decision_note ? html`<div class="sub">“${q.decision_note}”</div>` : ''}</div>
            ${q.status === 'approved' && q.child_song_id ? html`<a class="btn btn-sm btn-primary" href="#/song/${q.child_song_id}?tab=workspace">Open workspace</a>` : statusBadge(q.status)}
            ${q.status === 'pending' ? html`<button class="btn btn-sm btn-ghost" data-act="ws-cancel" data-id="${q.id}">Withdraw</button>` : ''}</div>`)}</div>`
          : html`<div class="empty"><div class="icon">${icon('git')}</div><h2 class="h3">No requests yet</h2><p>Requests and approvals show up here and in your notifications.</p></div>`}
        </div></div>`.s;
    };
    on(el, 'click', '[data-act=ws-request]', () => remixDialog(song, user, { direct: false }).then(r => r && paint()));
    on(el, 'click', '[data-act=ws-cancel]', async (e, b) => { await busy(b, () => api.post(`/api/remix-requests/${b.dataset.id}/cancel`, {})); toast('Request withdrawn'); paint(); });
    await paint();
  }
});

async function workspace(el, song, user, reloadSong) {
  let data = await api(`/api/songs/${song.id}/workspace`);
  const queue = [];           // uploads in flight: { id, name, size, p, status, error }
  let selected = null;        // path open in the player
  let player = null;
  let autoSave = false;

  el.innerHTML = html`<div class="stack-lg ws">
    <div id="ws-top"></div>
    <div class="ws-grid">
      <div class="stack-lg" style="min-width:0">
        <div id="ws-player"></div>
        <div class="card" id="ws-upload"></div>
        <div class="card" id="ws-files"></div>
      </div>
      <div class="stack-lg" style="min-width:0">
        <div class="card" id="ws-history"></div>
        <div id="ws-side"></div>
      </div>
    </div>
    <input type="file" multiple id="ws-input" class="hidden">
  </div>`.s;
  const $ = s => el.querySelector(s);

  const refresh = async () => { data = await api(`/api/songs/${song.id}/workspace`); paint(); };

  function paint() { paintTop(); paintUpload(); paintFiles(); paintHistory(); paintSide(); }

  function paintTop() {
    const h = data.head;
    const pending = data.requests.filter(q => q.status === 'pending');
    $('#ws-top').innerHTML = html`
      ${data.origin ? html`<div class="callout info" style="margin-bottom:14px">${icon('git')}<div>Forked from <a href="#/song/${data.origin.song_id}?tab=workspace"><b>${data.origin.title}</b></a> by ${data.origin.artist_credit} at <span class="mono">v${data.origin.seq} · ${data.origin.short}</span>. The original's share is set in this song's split.</div></div>` : ''}
      ${pending.length ? html`<div class="callout warn" style="margin-bottom:14px">${icon('git')}<div><b>${pending.length} remix request${pending.length > 1 ? 's' : ''} waiting for you.</b> <a href="#" data-act="ws-goto-req">Review</a></div></div>` : ''}
      <div class="card ws-head">
        <div class="ws-stats">
          <div class="ws-stat"><b>${h ? `v${h.seq}` : '—'}</b><span>Latest version</span></div>
          <div class="ws-stat"><b>${data.files.length}</b><span>Files</span></div>
          <div class="ws-stat"><b>${bytes(data.files.reduce((s, f) => s + f.size, 0))}</b><span>In this version</span></div>
          <div class="ws-stat"><b>${data.forks.length}</b><span>Remixes</span></div>
          ${h ? html`<div class="ws-stat" style="min-width:0"><b style="font-size:14px;font-weight:600;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px">${h.author_label}</b><span>Saved ${ago(h.created_at)}</span></div>` : ''}
        </div>
        <div class="row wrap">
          ${h ? html`<a class="btn" href="/api/songs/${song.id}/commits/${h.id}/zip" download>${icon('download')} Download v${h.seq}</a>` : ''}
          <button class="btn" data-act="ws-remix">${icon('git')} Remix</button>
          <button class="btn btn-primary" data-act="ws-save" ${data.staged.length ? '' : 'disabled'}>${icon('check')} Save version${data.staged.length ? html` <span class="badge plain" style="background:rgba(255,255,255,.22);color:#fff">${data.staged.length}</span>` : ''}</button>
        </div>
      </div>`.s;
  }

  function paintUpload() {
    const staged = data.staged;
    $('#ws-upload').innerHTML = html`
      <div class="card-body">
        <div class="ws-drop" id="ws-drop" tabindex="0" role="button" aria-label="Upload files">
          <div class="ws-drop-icon">${icon('upload')}</div>
          <div style="font-weight:650;color:var(--fg)">Drop stems, mixes, sessions or artwork</div>
          <div class="small muted" style="margin-top:4px">or click to choose files · up to ${bytes(data.maxUploadBytes)} each · stored privately, deduplicated by SHA-256</div>
        </div>
        <label class="check small" style="margin-top:12px"><input type="checkbox" id="ws-auto" ${autoSave ? 'checked' : ''}><span>Save a version as soon as uploads finish</span></label>
      </div>
      ${queue.map(q => html`<div class="ws-q ${q.status === 'error' ? 'err' : ''}">${kicon(guessKind(q.name), 32)}
        <div class="grow" style="flex:1;min-width:0"><div class="row between"><b class="small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${q.name}</b>
          <span class="tiny muted num">${q.status === 'error' ? q.error : q.status === 'done' ? (q.deduped ? 'Already stored · linked' : 'Uploaded') : q.status === 'hashing' ? 'Verifying…' : `${Math.round(q.p * 100)}% of ${bytes(q.size)}`}</span></div>
          <div class="ws-q-bar"><i style="width:${q.status === 'error' ? 100 : Math.round(q.p * 100)}%"></i></div></div></div>`)}
      ${staged.length ? html`<div class="card-head" style="border-top:1px solid var(--line);border-bottom:0"><div><h2 class="h3">Changes to save</h2><div class="small muted">Not in any version yet. Save a version to snapshot them.</div></div>
          <button class="btn btn-ghost btn-sm" data-act="ws-discard">Discard all</button></div>
        ${staged.map(s => html`<div class="ws-q">
          <span class="ws-tag ${s.action === 'delete' ? 'r' : s.action === 'meta' ? 'm' : data.files.find(f => f.path === s.path) ? 'c' : 'a'}">${s.action === 'delete' ? '−' : s.action === 'meta' ? 'i' : data.files.find(f => f.path === s.path) ? '~' : '+'}</span>
          <div style="flex:1;min-width:0"><div class="small" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.path}</div>
            <div class="tiny muted">${s.action === 'delete' ? 'Will be removed' : s.action === 'meta' ? `Details: ${KINDS[s.kind]?.one || s.kind}${s.label ? ` · ${s.label}` : ''}` : html`${bytes(s.size)} · <span class="mono">${s.hash.slice(0, 10)}</span>${s.label ? ` · ${s.label}` : ''}`}</div></div>
          ${s.action === 'put' ? html`<select class="input" style="width:auto;padding:5px 8px;font-size:12.5px" data-act="ws-stkind" data-id="${s.id}" aria-label="Kind">${Object.entries(KINDS).map(([k, v]) => html`<option value="${k}" ${k === s.kind ? 'selected' : ''}>${v.one}</option>`)}</select>
            <button class="btn btn-ghost btn-icon btn-sm" data-act="ws-stlabel" data-id="${s.id}" title="Label">${icon('edit')}</button>` : ''}
          <button class="btn btn-ghost btn-icon btn-sm" data-act="ws-unstage" data-id="${s.id}" title="Undo this change">${icon('x')}</button></div>`)}
        <div class="card-body row end" style="border-top:1px solid var(--line)"><button class="btn btn-primary" data-act="ws-save">${icon('check')} Save version</button></div>` : ''}`.s;
    const drop = $('#ws-drop');
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', e => startUploads([...e.dataTransfer.files]));
    drop.addEventListener('click', () => $('#ws-input').click());
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#ws-input').click(); } });
    $('#ws-auto').addEventListener('change', e => { autoSave = e.target.checked; });
  }

  function paintFiles() {
    const groups = KIND_ORDER.map(k => [k, data.files.filter(f => (f.kind || 'other') === k)]).filter(([, l]) => l.length);
    const stagedPaths = new Map(data.staged.map(s => [s.path, s]));
    $('#ws-files').innerHTML = html`
      <div class="card-head"><div><h2 class="h3">Files ${data.head ? html`<span class="muted" style="font-weight:500">in v${data.head.seq}</span>` : ''}</h2></div>
        ${data.commits.length > 1 ? html`<button class="btn btn-sm" data-act="ws-compare">${icon('layers')} Compare versions</button>` : ''}</div>
      ${groups.length ? groups.map(([k, list]) => html`
        <div class="ws-group"><span class="eyebrow">${KINDS[k].label}</span><span class="badge plain">${list.length}</span></div>
        ${list.map(f => {
          const st = stagedPaths.get(f.path);
          const notes = data.noteCounts[f.hash] || 0;
          return html`<div class="ws-file ${selected === f.path ? 'on' : ''}" data-path="${f.path}">
            ${kicon(f.kind)}
            <div class="grow"><div class="ws-name">${f.label || f.path}</div>
              <div class="ws-sub">${f.label ? html`${f.path} · ` : ''}${bytes(f.size)}${f.duration_ms ? html` · ${clock(f.duration_ms / 1000)}` : ''}<span class="mono"> · ${f.hash.slice(0, 7)}</span></div></div>
            ${notes ? html`<span class="badge warn" title="Open notes">${notes} note${notes > 1 ? 's' : ''}</span>` : ''}
            ${st ? html`<span class="badge ${st.action === 'delete' ? 'crit' : 'info'}">${st.action === 'delete' ? 'Removing' : st.action === 'meta' ? 'Edited' : 'Updated'}</span>` : ''}
            ${f.spark ? html`<div class="ws-spark" aria-hidden="true">${f.spark.map(v => html`<i style="height:${Math.max(8, v / 255 * 100)}%"></i>`)}</div>` : ''}
            <div class="ws-acts">
              ${isAudio(f) ? html`<button class="btn btn-ghost btn-icon btn-sm" data-act="ws-play" data-path="${f.path}" title="Play">${icon('play')}</button>` : ''}
              ${isImage(f) ? html`<button class="btn btn-ghost btn-icon btn-sm" data-act="ws-preview" data-path="${f.path}" title="Preview">${icon('scan')}</button>` : ''}
              <a class="btn btn-ghost btn-icon btn-sm" href="${blobUrl(f.hash, f.path, true)}" title="Download" download>${icon('download')}</a>
              <button class="btn btn-ghost btn-icon btn-sm" data-act="ws-more" data-path="${f.path}" title="More">${icon('settings')}</button>
            </div></div>`;
        })}`)
      : html`<div class="empty"><div class="icon">${icon('layers')}</div><h2 class="h3">${data.staged.length ? 'Save your first version' : 'Your song’s files live here'}</h2>
          <p>${data.staged.length ? 'Your uploads are staged. Save a version to snapshot them.' : 'Upload stems, mixes, masters and sessions. Every version is kept, so nothing is ever overwritten.'}</p></div>`}`.s;
  }

  function paintHistory() {
    const ROW = 66, LANE = 18, X0 = 18;
    const rows = [];
    for (const c of data.commits) rows.push({ type: 'commit', at: c.created_at, c });
    for (const f of data.forks) rows.push({ type: 'fork', at: f.created_at, f });
    rows.sort((a, b) => b.at.localeCompare(a.at) || (a.type === 'fork' ? -1 : 1));
    if (data.origin) rows.push({ type: 'origin', o: data.origin });
    const idx = new Map(rows.map((r, i) => [r.c?.id, i]));
    // Give each fork the first lane that is free between its row and the commit it branched from.
    const laneEnd = [];
    rows.forEach((r, i) => {
      if (r.type !== 'fork') return;
      const j = idx.get(r.f.base_commit_id) ?? i;
      let l = 1; while (laneEnd[l] !== undefined && laneEnd[l] >= i) l++;
      r.lane = l; laneEnd[l] = j;
    });
    const maxLane = Math.max(0, ...rows.map(r => r.lane || 0));
    const gutter = X0 + maxLane * LANE + 16;
    const y = i => i * ROW + ROW / 2;
    const x = l => X0 + l * LANE;
    const commitRows = rows.map((r, i) => [r, i]).filter(([r]) => r.type === 'commit' || r.type === 'origin');
    let svg = '';
    if (commitRows.length > 1) svg += `<line x1="${x(0)}" y1="${y(commitRows[0][1])}" x2="${x(0)}" y2="${y(commitRows[commitRows.length - 1][1])}" stroke="var(--line-strong)" stroke-width="2"/>`;
    rows.forEach((r, i) => {
      if (r.type === 'fork') {
        const j = idx.get(r.f.base_commit_id);
        if (j === undefined) return;
        const xl = x(r.lane), cy = y(j);
        svg += `<path d="M${xl} ${y(i)} L${xl} ${cy - 22} Q${xl} ${cy - 4} ${x(0)} ${cy}" fill="none" stroke="var(--violet)" stroke-width="2" stroke-dasharray="0" opacity=".85"/>`;
        svg += `<circle cx="${xl}" cy="${y(i)}" r="6" fill="var(--surface)" stroke="var(--violet)" stroke-width="2.5"/>`;
      }
    });
    rows.forEach((r, i) => {
      if (r.type === 'commit') {
        const headRow = r.c.id === data.head?.id;
        const color = r.c.kind === 'fork' ? 'var(--violet)' : r.c.kind === 'restore' ? 'var(--warn)' : 'var(--accent)';
        svg += headRow ? `<circle cx="${x(0)}" cy="${y(i)}" r="7" fill="${color}" stroke="color-mix(in srgb, ${color} 30%, transparent)" stroke-width="5"/>`
          : `<circle cx="${x(0)}" cy="${y(i)}" r="5.5" fill="var(--surface)" stroke="${color}" stroke-width="2.5"/>`;
      } else if (r.type === 'origin') {
        svg += `<circle cx="${x(0)}" cy="${y(i)}" r="5" fill="var(--surface)" stroke="var(--faint)" stroke-width="2" stroke-dasharray="2 2"/>`;
      }
    });
    $('#ws-history').innerHTML = html`
      <div class="card-head"><div><h2 class="h3">Version history</h2><div class="small muted">Every save is a snapshot. Restoring adds a new version, so history is never rewritten.</div></div></div>
      ${rows.length ? html`<div class="card-body" style="padding:8px 8px 8px 6px"><div class="ws-graph">
        <svg class="ws-lines" width="${gutter}" height="${rows.length * ROW}" viewBox="0 0 ${gutter} ${rows.length * ROW}">${raw(svg)}</svg>
        ${rows.map(r => r.type === 'commit' ? html`<div class="ws-row ${r.c.id === data.head?.id ? 'head' : ''}" data-act="ws-commit" data-id="${r.c.id}" style="padding-left:${gutter}px">
            <span class="ws-v">v${r.c.seq}</span>
            <div class="grow"><div class="ws-msg">${r.c.message}</div>
              <div class="ws-meta">${r.c.author_label} · ${ago(r.c.created_at)} · <span class="mono">${r.c.short}</span>${r.c.kind === 'restore' ? ' · restore' : ''}</div></div>
            ${delta(r.c.stats)}</div>`
          : r.type === 'fork' ? html`<a class="ws-row fork" href="#/song/${r.f.song_id}?tab=workspace" style="padding-left:${gutter}px;text-decoration:none;color:inherit">
            <span class="ws-v" style="background:color-mix(in srgb, var(--violet) 15%, transparent);color:var(--violet)">${RELATIONS[r.f.parent_relation] || 'Fork'}</span>
            <div class="grow"><div class="ws-msg">${r.f.title}</div><div class="ws-meta">${r.f.artist_credit} · branched ${ago(r.f.created_at)}</div></div>${icon('arrow')}</a>`
          : html`<a class="ws-row" href="#/song/${r.o.song_id}?tab=workspace" style="padding-left:${gutter}px;text-decoration:none;color:inherit">
            <span class="ws-v">${r.o.short}</span><div class="grow"><div class="ws-msg muted">Forked from ${r.o.title}</div><div class="ws-meta">${r.o.artist_credit} · v${r.o.seq}</div></div></a>`)}
      </div></div>`
      : html`<div class="empty" style="padding:32px 20px"><div class="icon">${icon('git')}</div><h2 class="h3">No versions yet</h2><p>Upload files, then save your first version.</p></div>`}`.s;
  }

  function paintSide() {
    const reqs = data.requests;
    $('#ws-side').innerHTML = html`
      ${data.canManage ? html`<div class="card" id="ws-requests">
        <div class="card-head"><h2 class="h3">Remix requests</h2>${reqs.filter(q => q.status === 'pending').length ? html`<span class="badge warn">${reqs.filter(q => q.status === 'pending').length} waiting</span>` : ''}</div>
        ${reqs.length ? reqs.map(q => html`<div class="ws-req">
          <div class="avatar" style="background:${colorFor(q.requester_email)}">${initials(q.requester_name || q.requester_email)}</div>
          <div style="flex:1;min-width:180px"><div style="font-weight:600">${q.title}</div>
            <div class="small muted">${q.requester_name || q.requester_email} · ${RELATIONS[q.relation]} · ${ago(q.created_at)}</div>
            <div class="small" style="margin-top:4px">Original keeps <b class="num">${q.parent_master_bps / 100}%</b> master · <b class="num">${q.parent_publishing_bps / 100}%</b> publishing</div>
            ${q.message ? html`<div class="small muted" style="margin-top:4px">“${q.message}”</div>` : ''}</div>
          ${q.status === 'pending' ? html`<div class="row"><button class="btn btn-sm" data-act="ws-decline" data-id="${q.id}">Decline</button><button class="btn btn-sm btn-primary" data-act="ws-approve" data-id="${q.id}">Approve</button></div>`
            : q.child_song_id ? html`<a class="btn btn-sm btn-ghost" href="#/song/${q.child_song_id}">${statusBadge(q.status)}</a>` : statusBadge(q.status)}
        </div>`) : html`<div class="card-body small muted">When someone who isn't on this song asks to remix it, you approve or decline here. Approving gives them a copy of the latest files and a split that pays this song.</div>`}
      </div>` : ''}`.s;
  }

  // ----- uploads -----
  async function startUploads(files) {
    if (!files.length) return;
    const items = files.map(f => ({ id: Math.random().toString(36).slice(2), file: f, name: f.webkitRelativePath || f.name, size: f.size, p: 0, status: 'queued' }));
    for (const it of items) {
      if (it.size > data.maxUploadBytes) { it.status = 'error'; it.error = `Over the ${bytes(data.maxUploadBytes)} limit`; }
      if (!it.size) { it.status = 'error'; it.error = 'Empty file'; }
    }
    queue.push(...items);
    paintUpload();
    let i = 0;
    const worker = async () => {
      while (i < items.length) {
        const it = items[i++];
        if (it.status === 'error') continue;
        it.status = 'uploading';
        try {
          const r = await upload(`/api/songs/${song.id}/files`, it.file, {
            headers: { 'x-kind': guessKind(it.name) },
            onProgress: p => { it.p = p; if (p >= 1) it.status = 'hashing'; paintQueueOnly(); }
          });
          it.status = 'done'; it.p = 1; it.deduped = r.deduped;
        } catch (e) { it.status = 'error'; it.error = e.message; }
        paintQueueOnly();
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    const ok = items.filter(x => x.status === 'done').length, failed = items.length - ok;
    data = await api(`/api/songs/${song.id}/workspace`);
    if (autoSave && data.staged.length) {
      try {
        await api.post(`/api/songs/${song.id}/commits`, { message: ok === 1 ? `Add ${items.find(x => x.status === 'done').name}` : `Add ${ok} files` });
        data = await api(`/api/songs/${song.id}/workspace`);
        toast(`Uploaded and saved v${data.head.seq}`);
      } catch (e) { toast(e.message, { error: true }); }
    } else if (ok) toast(`${ok} file${ok > 1 ? 's' : ''} uploaded. Save a version when you're ready.`);
    if (failed) toast(`${failed} upload${failed > 1 ? 's' : ''} failed`, { error: true });
    setTimeout(() => { for (const it of items) if (it.status === 'done') queue.splice(queue.indexOf(it), 1); paintUpload(); }, 1600);
    paint();
  }
  let qRaf = 0;
  const paintQueueOnly = () => { cancelAnimationFrame(qRaf); qRaf = requestAnimationFrame(paintUpload); };
  $('#ws-input').addEventListener('change', e => { startUploads([...e.target.files]); e.target.value = ''; });

  // ----- actions -----
  on(el, 'click', '[data-act=ws-save]', () => saveDialog());
  on(el, 'click', '[data-act=ws-goto-req]', e => { e.preventDefault(); $('#ws-requests')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
  on(el, 'click', '[data-act=ws-discard]', async () => {
    if (!await confirmDialog('Discard all changes?', 'Uploaded files stay stored, but they will not be in the next version.', 'Discard', true)) return;
    await api.del(`/api/songs/${song.id}/staged`); refresh();
  });
  on(el, 'click', '[data-act=ws-unstage]', async (e, b) => { await busy(b, () => api.del(`/api/songs/${song.id}/staged/${b.dataset.id}`)); refresh(); });
  on(el, 'change', '[data-act=ws-stkind]', async (e, s) => { await api.patch(`/api/songs/${song.id}/staged/${s.dataset.id}`, { kind: s.value }).catch(err => toast(err.message, { error: true })); refresh(); });
  on(el, 'click', '[data-act=ws-stlabel]', (e, b) => {
    const st = data.staged.find(s => s.id === b.dataset.id);
    modal({ title: 'Label', body: html`<label class="field"><span>Label <span class="hint">e.g. Lead vocal, Drums bus, Radio master</span></span><input class="input" id="ws-l" value="${st?.label || ''}" maxlength="120"></label>`,
      actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: async (close, m) => { await api.patch(`/api/songs/${song.id}/staged/${b.dataset.id}`, { label: m.querySelector('#ws-l').value }); refresh(); } }] });
  });
  on(el, 'click', '[data-act=ws-play]', (e, b) => { e.stopPropagation(); openPlayer(b.dataset.path); });
  on(el, 'click', '.ws-file', (e, row) => { if (e.target.closest('button, a')) return; const f = data.files.find(x => x.path === row.dataset.path); if (f && isAudio(f)) openPlayer(f.path); });
  on(el, 'click', '[data-act=ws-preview]', (e, b) => {
    const f = data.files.find(x => x.path === b.dataset.path);
    modal({ title: f.label || f.path, wide: true, body: html`<img src="${blobUrl(f.hash, f.path)}" alt="" style="width:100%;border-radius:14px;display:block">` });
  });
  on(el, 'click', '[data-act=ws-more]', (e, b) => fileMenu(data.files.find(x => x.path === b.dataset.path)));
  on(el, 'click', '[data-act=ws-commit]', (e, r) => versionDialog(r.dataset.id));
  on(el, 'click', '[data-act=ws-compare]', () => compareDialog());
  on(el, 'click', '[data-act=ws-remix]', () => remixDialog(song, user, { direct: true }).then(r => r?.forked && app.go(`/song/${r.song.id}?tab=workspace`)));
  on(el, 'click', '[data-act=ws-approve]', async (e, b) => {
    const q = data.requests.find(x => x.id === b.dataset.id);
    if (!await confirmDialog(`Approve “${q.title}”?`, `${q.requester_name || q.requester_email} gets their own workspace with a copy of the latest files, and a draft split where this song keeps ${q.parent_master_bps / 100}% of master and ${q.parent_publishing_bps / 100}% of publishing.`, 'Approve')) return;
    const r = await busy(b, () => api.post(`/api/remix-requests/${q.id}/approve`, {}));
    toast(r.splitError ? `Approved. Split needs attention: ${r.splitError}` : 'Approved. Their workspace is ready.');
    refresh();
  });
  on(el, 'click', '[data-act=ws-decline]', (e, b) => modal({
    title: 'Decline request', body: html`<label class="field"><span>Note to the requester <span class="hint">optional</span></span><textarea class="input" id="ws-dn" maxlength="1000"></textarea></label>`,
    actions: [{ label: 'Cancel' }, { label: 'Decline', danger: true, onClick: async (close, m) => { await api.post(`/api/remix-requests/${b.dataset.id}/decline`, { note: m.querySelector('#ws-dn').value }); toast('Request declined'); refresh(); } }]
  }));

  function saveDialog() {
    const s = data.staged;
    if (!s.length) return toast('Nothing to save yet', { error: true });
    const added = s.filter(x => x.action === 'put' && !data.files.find(f => f.path === x.path)).length;
    const changed = s.filter(x => (x.action === 'put' && data.files.find(f => f.path === x.path)) || x.action === 'meta').length;
    const removed = s.filter(x => x.action === 'delete').length;
    const suggestion = s.length === 1 ? `${s[0].action === 'delete' ? 'Remove' : added ? 'Add' : 'Update'} ${s[0].path}` : '';
    modal({
      title: `Save v${(data.head?.seq || 0) + 1}`,
      body: html`<div class="stack">
        <div class="row wrap">${added ? html`<span class="badge ok">${added} added</span>` : ''}${changed ? html`<span class="badge warn">${changed} changed</span>` : ''}${removed ? html`<span class="badge crit">${removed} removed</span>` : ''}</div>
        <label class="field"><span>What changed?</span><input class="input" id="ws-msg" maxlength="300" placeholder="e.g. New vocal comp, bass re-amped" value="${suggestion}"></label>
        <p class="small muted">Everyone on the song can open, play and download this version. It is recorded in the passport history.</p></div>`,
      actions: [{ label: 'Cancel' }, { label: 'Save version', primary: true, onClick: async (close, m) => {
        const message = m.querySelector('#ws-msg').value.trim();
        if (!message) { toast('Add a short message', { error: true }); return false; }
        const r = await api.post(`/api/songs/${song.id}/commits`, { message });
        toast(`Saved v${r.commit.seq}`); refresh();
      } }]
    });
  }

  function fileMenu(f) {
    modal({
      title: f.label || f.path,
      body: html`<div class="stack">
        <div class="row" style="gap:14px">${kicon(f.kind, 46)}<div style="min-width:0"><div style="font-weight:600;overflow-wrap:anywhere">${f.path}</div>
          <div class="small muted">${KINDS[f.kind]?.one || 'File'} · ${bytes(f.size)} · ${f.mime || ''}</div><div class="hash">${f.hash}</div></div></div>
        <div class="form-grid">
          <label class="field"><span>Kind</span><select class="input" id="ws-k">${Object.entries(KINDS).map(([k, v]) => html`<option value="${k}" ${k === f.kind ? 'selected' : ''}>${v.one}</option>`)}</select></label>
          <label class="field"><span>Label</span><input class="input" id="ws-lb" value="${f.label || ''}" maxlength="120" placeholder="e.g. Lead vocal"></label>
        </div>
        <div id="ws-fh" class="stack-sm"><div class="skeleton" style="height:60px"></div></div>
      </div>`,
      actions: [
        { label: 'Remove from next version', danger: true, onClick: async () => { await api.post(`/api/songs/${song.id}/staged`, { path: f.path, action: 'delete' }); toast('Staged for removal. Save a version to apply.'); refresh(); } },
        { label: 'Stage details', primary: true, onClick: async (close, m) => {
          await api.post(`/api/songs/${song.id}/staged`, { path: f.path, action: 'meta', kind: m.querySelector('#ws-k').value, label: m.querySelector('#ws-lb').value });
          toast('Details staged. Save a version to apply.'); refresh();
        } }
      ],
      onOpen: async m => {
        const { versions } = await api(`/api/songs/${song.id}/files/history?path=${encodeURIComponent(f.path)}`);
        m.querySelector('#ws-fh').innerHTML = html`<div class="label">This file across versions</div>
          ${versions.map(v => html`<div class="ws-diff-row"><span class="ws-v chip">v${v.seq}</span><div style="flex:1;min-width:0"><div class="small" style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.message}</div>
            <div class="tiny muted">${v.author_label} · ${ago(v.created_at)} · ${bytes(v.size)} · <span class="mono">${v.hash.slice(0, 7)}</span></div></div>
            <a class="btn btn-ghost btn-icon btn-sm" href="${blobUrl(v.hash, f.path, true)}" download title="Download">${icon('download')}</a>
            ${v.hash !== f.hash ? html`<button class="btn btn-sm" data-restore="${v.commit_id}">Restore</button>` : html`<span class="badge ok plain">Latest</span>`}</div>`)}`.s;
        m.querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', async () => {
          const r = await busy(b, () => api.post(`/api/songs/${song.id}/restore`, { commit_id: b.dataset.restore, path: f.path }));
          toast(`Restored as v${r.commit.seq}`); m.closest('.modal-back').remove(); refresh();
        }));
      }
    });
  }

  async function versionDialog(cid) {
    const { commit: c, files, diff } = await api(`/api/songs/${song.id}/commits/${cid}`);
    const isHead = c.id === data.head?.id;
    const row = (tag, cls, f, extra = '') => html`<div class="ws-diff-row"><span class="ws-tag ${cls}">${tag}</span>${kicon(f.kind, 26)}
      <div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.label ? html`<b>${f.label}</b> <span class="muted">${f.path}</span>` : f.path}</div>
      <span class="small muted num">${extra || bytes(f.size)}</span>
      ${!isHead && tag !== '−' ? html`<button class="btn btn-ghost btn-sm" data-rf="${f.path}">Restore</button>` : ''}</div>`;
    modal({
      title: `v${c.seq} · ${c.message}`, wide: true,
      body: html`<div class="stack">
        <div class="row wrap small muted"><span>${c.author_label}</span><span>·</span><span title="${dateTime(c.created_at)}">${dateTime(c.created_at)}</span><span>·</span><span class="mono">${c.hash.slice(0, 12)}</span>
          ${c.kind === 'fork' ? html`<span class="badge accent">Fork</span>` : c.kind === 'restore' ? html`<span class="badge warn">Restore</span>` : ''}${isHead ? html`<span class="badge ok">Latest</span>` : ''}</div>
        <div><div class="label" style="margin-bottom:4px">Changes from the previous version</div>
          ${diff.added.length + diff.changed.length + diff.removed.length ? html`
            ${diff.added.map(f => row('+', 'a', f))}
            ${diff.changed.map(f => row(f.meta_only ? 'i' : '~', f.meta_only ? 'm' : 'c', f, f.meta_only ? 'details changed' : `${bytes(f.before.size)} → ${bytes(f.size)}`))}
            ${diff.removed.map(f => row('−', 'r', f))}` : html`<div class="small muted">No file changes.</div>`}</div>
        <div><div class="label" style="margin-bottom:4px">All files in v${c.seq} (${files.length})</div>
          ${files.map(f => html`<div class="ws-diff-row">${kicon(f.kind, 26)}<div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.label || f.path}</div>
            <span class="small muted num">${bytes(f.size)}</span><a class="btn btn-ghost btn-icon btn-sm" href="${blobUrl(f.hash, f.path, true)}" download title="Download">${icon('download')}</a></div>`)}</div>
      </div>`,
      actions: [
        { label: 'Compare…', onClick: () => { compareDialog(c.id); } },
        { label: html`${icon('download')} Download zip`, onClick: () => { location.href = `/api/songs/${song.id}/commits/${c.id}/zip`; return false; } },
        ...(isHead ? [] : [{ label: `Restore v${c.seq}`, primary: true, onClick: async () => {
          const r = await api.post(`/api/songs/${song.id}/restore`, { commit_id: c.id }); toast(`Restored as v${r.commit.seq}`); refresh();
        } }])
      ],
      onOpen: m => m.querySelectorAll('[data-rf]').forEach(b => b.addEventListener('click', async () => {
        const r = await busy(b, () => api.post(`/api/songs/${song.id}/restore`, { commit_id: c.id, path: b.dataset.rf }));
        toast(`Restored ${b.dataset.rf} as v${r.commit.seq}`); m.closest('.modal-back').remove(); refresh();
      }))
    });
  }

  function compareDialog(toId) {
    const cs = data.commits;
    const to = toId || cs[0]?.id;
    const toIdx = cs.findIndex(c => c.id === to);
    const from = cs[toIdx + 1]?.id || cs[cs.length - 1]?.id;
    const opt = sel => cs.map(c => html`<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>v${c.seq} · ${c.message.slice(0, 50)}</option>`);
    modal({
      title: 'Compare versions', wide: true,
      body: html`<div class="stack"><div class="form-grid"><label class="field"><span>From</span><select class="input" id="ws-from">${opt(from)}</select></label>
        <label class="field"><span>To</span><select class="input" id="ws-to">${opt(to)}</select></label></div><div id="ws-diff"></div></div>`,
      onOpen: m => {
        const run = async () => {
          const out = m.querySelector('#ws-diff');
          out.innerHTML = '<div class="skeleton" style="height:80px"></div>';
          try {
            const d = await api(`/api/songs/${song.id}/diff?from=${m.querySelector('#ws-from').value}&to=${m.querySelector('#ws-to').value}`);
            const r = (tag, cls, f, extra) => html`<div class="ws-diff-row"><span class="ws-tag ${cls}">${tag}</span>${kicon(f.kind, 26)}<div style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.label || f.path}</div><span class="small muted num">${extra}</span></div>`;
            out.innerHTML = html`<div class="row wrap" style="margin-bottom:8px"><span class="badge ok">${d.added.length} added</span><span class="badge warn">${d.changed.length} changed</span><span class="badge crit">${d.removed.length} removed</span>
              <span class="small muted">Size ${d.bytes_delta >= 0 ? '+' : '−'}${bytes(Math.abs(d.bytes_delta))}</span></div>
              ${d.added.map(f => r('+', 'a', f, bytes(f.size)))}
              ${d.changed.map(f => r(f.meta_only ? 'i' : '~', f.meta_only ? 'm' : 'c', f, f.meta_only ? 'details' : `${bytes(f.before.size)} → ${bytes(f.size)} (${f.size_delta >= 0 ? '+' : '−'}${bytes(Math.abs(f.size_delta))})`))}
              ${d.removed.map(f => r('−', 'r', f, bytes(f.size)))}
              ${d.added.length + d.changed.length + d.removed.length ? '' : html`<div class="empty" style="padding:24px">These versions have identical files.</div>`}
              <div class="small muted" style="margin-top:8px">${d.unchanged.length} unchanged file${d.unchanged.length === 1 ? '' : 's'}</div>`.s;
          } catch (e) { out.innerHTML = html`<div class="callout crit">${icon('alert')}<div>${e.message}</div></div>`.s; }
        };
        m.querySelectorAll('select').forEach(s => s.addEventListener('change', run));
        run();
      }
    });
  }

  // ----- studio player -----
  async function openPlayer(p) {
    const f = data.files.find(x => x.path === p);
    if (!f) return;
    selected = p;
    paintFiles();
    player?.destroy();
    player = await studio($('#ws-player'), song, f, { onClose: () => { selected = null; player = null; paintFiles(); }, onNotes: () => refresh() });
    $('#ws-player').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  paint();
}

// The dark studio panel: waveform, transport, A/B between two versions of the same file, timestamped notes.
async function studio(box, song, file, { onClose, onNotes }) {
  const { versions } = await api(`/api/songs/${song.id}/files/history?path=${encodeURIComponent(file.path)}`);
  const A = { ...file, seq: versions.find(v => v.hash === file.hash)?.seq };
  let B = versions.find(v => v.hash !== file.hash) || null;
  let side = 'A';
  const audios = { A: new Audio(blobUrl(A.hash, A.path)), B: B ? new Audio(blobUrl(B.hash, file.path)) : null };
  Object.values(audios).forEach(a => { if (a) a.preload = 'metadata'; });
  let notes = [];
  let peaks = { A: null, B: null };
  let raf = 0, destroyed = false;
  const cur = () => audios[side];
  const curFile = () => side === 'A' ? A : { ...file, ...B };

  box.innerHTML = html`<div class="ws-studio fade-in">
    <div class="ws-studio-top">${kicon(file.kind, 40)}
      <div class="grow"><div class="ws-title">${file.label || file.path}</div>
        <div class="row wrap tiny" style="gap:6px;margin-top:3px"><span class="chip" id="ws-ver"></span><span class="muted">${file.label ? file.path : (KINDS[file.kind]?.one || '')}</span></div></div>
      <a class="btn btn-icon btn-sm" id="ws-dl" title="Download" download>${icon('download')}</a>
      <button class="btn btn-icon btn-sm" data-x title="Close player">${icon('x')}</button>
    </div>
    <div class="ws-wave" id="ws-wave"><canvas></canvas><div class="ws-load" id="ws-load">Drawing waveform…</div></div>
    <div class="ws-ctrl">
      <button class="ws-play" id="ws-pp" aria-label="Play">${icon('play')}</button>
      <div class="ws-time"><span id="ws-t">0:00</span> <span class="muted">/ <span id="ws-d">${A.duration_ms ? clock(A.duration_ms / 1000) : '0:00'}</span></span></div>
      <div class="spacer"></div>
      <div class="ws-ab" title="A/B compare two versions of this file">
        <button data-side="A" class="on">A · v${A.seq ?? '?'}</button>
        <button data-side="B" ${B ? '' : 'disabled'}>B</button>
        ${versions.length > 1 ? html`<select id="ws-bsel" aria-label="Version for B">${versions.filter(v => v.hash !== A.hash).map(v => html`<option value="${v.hash}" ${v.hash === B?.hash ? 'selected' : ''}>v${v.seq} · ${v.message.slice(0, 28)}</option>`)}</select>`
          : html`<span class="tiny muted" style="padding:0 8px">No other version yet</span>`}
      </div>
    </div>
    <div class="ws-notes">
      <form id="ws-nf"><input id="ws-nt" maxlength="2000" placeholder="Add a note at 0:00, e.g. vocal too loud" autocomplete="off"><button class="btn btn-sm">${icon('plus')} Note</button></form>
      <div id="ws-nl" style="margin-top:8px"></div>
    </div>
  </div>`.s;
  const $ = s => box.querySelector(s);
  const canvas = $('canvas');

  function setVer() {
    const f = curFile();
    const v = side === 'A' ? versions.find(x => x.hash === A.hash) : B;
    $('#ws-ver').textContent = v ? `${side} · v${v.seq} · ${f.hash.slice(0, 7)}` : `${side} · ${f.hash.slice(0, 7)} · not saved yet`;
    $('#ws-dl').href = blobUrl(f.hash, file.path, true);
  }

  function draw() {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(r.width * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
    const g = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    g.clearRect(0, 0, W, H);
    const pk = peaks[side];
    const a = cur();
    const dur = a.duration || (pk?.duration_ms || 0) / 1000;
    const prog = dur ? a.currentTime / dur : 0;
    const bars = Math.max(40, Math.floor(W / (3 * dpr)));
    const bw = Math.max(1, (W / bars) - 1 * dpr);
    const grad = g.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#5B23E1'); grad.addColorStop(1, '#C17BF5');
    for (let i = 0; i < bars; i++) {
      let v = 0.04;
      if (pk) { const a0 = Math.floor(i * pk.peaks.length / bars), a1 = Math.max(a0 + 1, Math.floor((i + 1) * pk.peaks.length / bars)); for (let j = a0; j < a1; j++) v = Math.max(v, pk.peaks[j]); }
      const h = Math.max(2 * dpr, v * (H * 0.92));
      const x = i * (W / bars);
      g.fillStyle = i / bars <= prog ? grad : 'rgba(255,255,255,0.22)';
      g.fillRect(x, (H - h) / 2, bw, h);
    }
    if (dur) { g.fillStyle = '#fff'; g.fillRect(Math.round(prog * W) - dpr, 0, 2 * dpr, H); }
    $('#ws-t').textContent = clock(a.currentTime);
    if (dur) $('#ws-d').textContent = clock(dur);
    $('#ws-nt').placeholder = `Add a note at ${clock(a.currentTime)}, e.g. vocal too loud`;
  }
  const loop = () => { draw(); if (!cur().paused && !destroyed) raf = requestAnimationFrame(loop); };

  async function loadPeaks(which) {
    const f = which === 'A' ? A : { ...file, ...B };
    try { peaks[which] = await peaksFor(f); }
    catch { peaks[which] = null; if (which === side) $('#ws-load').textContent = 'Waveform unavailable for this format'; return; }
    if (which === side) { $('#ws-load').classList.add('hidden'); draw(); paintMarks(); }
  }

  function paintMarks() {
    const wave = $('#ws-wave');
    wave.querySelectorAll('.ws-mark').forEach(m => m.remove());
    const f = curFile();
    const dur = cur().duration || (peaks[side]?.duration_ms || 0) / 1000;
    if (!dur) return;
    for (const n of notes.filter(n => n.hash === f.hash && n.at_ms != null)) {
      const m = document.createElement('div');
      m.className = 'ws-mark' + (n.resolved_at ? ' res' : '');
      m.style.left = `${Math.min(100, n.at_ms / 1000 / dur * 100)}%`;
      m.title = `${clock(n.at_ms / 1000)} ${n.body}`;
      wave.appendChild(m);
    }
  }

  async function loadNotes() {
    notes = (await api(`/api/songs/${song.id}/notes?path=${encodeURIComponent(file.path)}`)).notes;
    const f = curFile();
    const mine = notes.filter(n => n.hash === f.hash);
    $('#ws-nl').innerHTML = mine.length ? html`${mine.map(n => html`<div class="ws-note ${n.resolved_at ? 'res' : ''}">
        ${n.at_ms != null ? html`<button class="ws-at" data-seek="${n.at_ms}">${clock(n.at_ms / 1000)}</button>` : html`<span class="ws-at">—</span>`}
        <div style="flex:1;min-width:0"><div class="ws-body small">${n.body}</div><div class="tiny muted">${n.author_label} · ${ago(n.created_at)}</div></div>
        <button class="btn btn-sm" data-resolve="${n.id}" data-on="${n.resolved_at ? '0' : '1'}">${n.resolved_at ? 'Reopen' : html`${icon('check')} Resolve`}</button></div>`)}`.s
      : html`<div class="tiny muted">No notes on this version. Pause where something needs work and type a note.</div>`.s;
    paintMarks();
  }

  function switchTo(s) {
    if (s === side || !audios[s]) return;
    const from = cur(), to = audios[s];
    const playing = !from.paused;
    try { to.currentTime = Math.min(from.currentTime, to.duration || from.currentTime); } catch {}
    from.pause();
    side = s;
    box.querySelectorAll('.ws-ab button').forEach(b => b.classList.toggle('on', b.dataset.side === s));
    setVer();
    if (playing) to.play().catch(() => {});
    if (!peaks[s]) { $('#ws-load').classList.remove('hidden'); $('#ws-load').textContent = 'Drawing waveform…'; loadPeaks(s); }
    draw(); loadNotes();
  }

  $('#ws-pp').addEventListener('click', () => { const a = cur(); a.paused ? a.play().catch(e => toast(e.message, { error: true })) : a.pause(); });
  for (const a of Object.values(audios)) if (a) {
    a.addEventListener('play', () => { if (a === cur()) { $('#ws-pp').innerHTML = icon('pause').s; loop(); } });
    a.addEventListener('pause', () => { if (a === cur()) { $('#ws-pp').innerHTML = icon('play').s; draw(); } });
    a.addEventListener('loadedmetadata', () => { if (a === cur()) { draw(); paintMarks(); } });
    a.addEventListener('ended', () => draw());
  }
  const seekAt = clientX => {
    const r = canvas.getBoundingClientRect();
    const a = cur();
    const dur = a.duration || (peaks[side]?.duration_ms || 0) / 1000;
    if (!dur) return;
    a.currentTime = Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * dur;
    draw();
  };
  $('#ws-wave').addEventListener('pointerdown', e => { seekAt(e.clientX); const mv = ev => seekAt(ev.clientX); const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); });
  box.querySelectorAll('.ws-ab button').forEach(b => b.addEventListener('click', () => switchTo(b.dataset.side)));
  $('#ws-bsel')?.addEventListener('change', e => {
    B = versions.find(v => v.hash === e.target.value);
    const wasB = side === 'B';
    audios.B?.pause();
    audios.B = new Audio(blobUrl(B.hash, file.path)); audios.B.preload = 'metadata';
    audios.B.addEventListener('play', () => { if (side === 'B') { $('#ws-pp').innerHTML = icon('pause').s; loop(); } });
    audios.B.addEventListener('pause', () => { if (side === 'B') { $('#ws-pp').innerHTML = icon('play').s; draw(); } });
    box.querySelector('.ws-ab button[data-side=B]').disabled = false;
    peaks.B = null;
    if (wasB) { side = 'A'; switchTo('B'); } else loadPeaks('B');
  });
  $('#ws-nf').addEventListener('submit', async e => {
    e.preventDefault();
    const input = $('#ws-nt');
    let body = input.value.trim();
    if (!body) return;
    let at = Math.round(cur().currentTime * 1000);
    const m = /^(\d+:\d{2})\s+(.+)$/.exec(body);           // "1:32 vocal too loud" sets the time explicitly
    if (m && parseClock(m[1]) != null) { at = parseClock(m[1]); body = m[2]; }
    const f = curFile();
    const b = e.target.querySelector('button');
    await busy(b, () => api.post(`/api/songs/${song.id}/notes`, { path: file.path, hash: f.hash, at_ms: at, body, commit_id: side === 'A' ? undefined : B?.commit_id }));
    input.value = '';
    await loadNotes(); onNotes?.();
  });
  box.addEventListener('click', async e => {
    const s = e.target.closest('[data-seek]');
    if (s) { cur().currentTime = +s.dataset.seek / 1000; draw(); return; }
    const r = e.target.closest('[data-resolve]');
    if (r) { await busy(r, () => api.post(`/api/songs/${song.id}/notes/${r.dataset.resolve}/resolve`, { resolved: r.dataset.on === '1' })); await loadNotes(); onNotes?.(); return; }
    if (e.target.closest('[data-x]')) { destroy(); box.innerHTML = ''; onClose?.(); }
  });
  const onResize = () => draw();
  addEventListener('resize', onResize);
  function destroy() {
    destroyed = true; cancelAnimationFrame(raf); removeEventListener('resize', onResize);
    for (const a of Object.values(audios)) if (a) { a.pause(); a.removeAttribute('src'); a.load(); }
  }

  setVer(); draw();
  loadNotes();
  loadPeaks('A');
  if (B) setTimeout(() => !destroyed && loadPeaks('B'), 400);
  return { destroy };
}

// Remix / edit / cover / sample: fork directly (people on the song) or send a request (everyone else).
function remixDialog(song, user, { direct }) {
  const me = user?.name || (user?.email || '').split('@')[0];
  return modal({
    title: direct ? 'Start a remix' : 'Request to remix',
    body: html`<form class="stack" id="ws-rf">
      <div class="seg" id="ws-rel">${Object.entries(RELATIONS).map(([k, v]) => html`<button type="button" data-rel="${k}" class="${k === 'remix' ? 'on' : ''}">${v}</button>`)}</div>
      <div class="form-grid">
        <label class="field full"><span>Title</span><input class="input" name="title" value="${song.title} (${me} Remix)" maxlength="300" required></label>
        <label class="field full"><span>Artist credit</span><input class="input" name="artist_credit" value="${me}" maxlength="300" required></label>
      </div>
      <div><div class="label" style="margin-bottom:8px">What “${song.title}” keeps</div>
        <div class="ws-share">
          <label class="field"><span>Master share</span><div class="ws-pctin"><input class="input num" name="pm" type="number" min="0" max="100" step="0.01" value="50"></div></label>
          <label class="field"><span>Publishing share</span><div class="ws-pctin"><input class="input num" name="pp" type="number" min="0" max="100" step="0.01" value="50"></div></label>
        </div></div>
      <div id="ws-prev"></div>
      ${direct ? '' : html`<label class="field"><span>Message to the owner <span class="hint">optional</span></span><textarea class="input" name="message" maxlength="1000" placeholder="What you have in mind"></textarea></label>`}
      <div class="callout info">${icon('info')}<div class="small">${direct
        ? 'You get a new passport with its own workspace, starting from a copy of the latest version. A draft split pays the original its share automatically; you send it for signing from the Splits tab.'
        : `The owner of “${song.title}” reviews your request. If they approve, you get a workspace with every file from the latest version and a draft split that pays the original.`}</div></div>
    </form>`,
    actions: [{ label: 'Cancel' }, { label: direct ? 'Create remix' : 'Send request', primary: true, onClick: async (close, m) => {
      const f = Object.fromEntries(new FormData(m.querySelector('#ws-rf')));
      const rel = m.querySelector('#ws-rel .on').dataset.rel;
      const bps = v => Math.round(Math.max(0, Math.min(100, Number(v) || 0)) * 100);
      const r = await api.post(`/api/songs/${song.id}/remix`, { title: f.title, artist_credit: f.artist_credit, relation: rel, parent_master_bps: bps(f.pm), parent_publishing_bps: bps(f.pp), message: f.message });
      if (r.forked) toast(r.splitError ? `Remix created. Split needs attention: ${r.splitError}` : 'Remix created with a draft split');
      else toast('Request sent. You will be notified when they decide.');
      return r;
    } }],
    onOpen: m => {
      const form = m.querySelector('#ws-rf');
      const prev = () => {
        const pm = Math.max(0, Math.min(100, Number(form.pm.value) || 0)), pp = Math.max(0, Math.min(100, Number(form.pp.value) || 0));
        const bar = (label, keep) => html`<div class="stack-sm"><div class="row between small"><span class="muted">${label}</span><span class="num"><b>${keep}%</b> original · <b>${Math.round((100 - keep) * 100) / 100}%</b> ${esc(form.artist_credit.value || 'you')}</span></div>
          <div class="splitbar"><i style="width:${keep}%;background:#C17BF5"></i><i style="width:${100 - keep}%;background:#7E1BCC"></i></div></div>`;
        m.querySelector('#ws-prev').innerHTML = html`<div class="stack" style="background:var(--surface-2);border-radius:14px;padding:14px">${bar('Master', pm)}${bar('Publishing', pp)}</div>`.s;
      };
      form.addEventListener('input', prev);
      m.querySelectorAll('#ws-rel button').forEach(b => b.addEventListener('click', () => {
        m.querySelectorAll('#ws-rel button').forEach(x => x.classList.toggle('on', x === b));
        const t = form.title;
        t.value = t.value.replace(/\((.*) (Remix|Edit|Cover|Sample|Version)\)$/, `($1 ${RELATIONS[b.dataset.rel]})`);
      }));
      prev();
    }
  });
}
