// Passport auto-fill on the song page (server/modules/enrich.js): progress while public sources are checked,
// a quiet verified mark next to every filled field, and the "Checked … · Refresh" line. The registration checks
// themselves (Check links, Mark as registered) live in the health tiles' sheets in 05-song.js.
import { app, html, api, icon, toast, on, busy, ago } from '../app.js';

const NAMES = { musicbrainz: 'MusicBrainz', deezer: 'Deezer', itunes: 'iTunes', audius: 'Audius', owner: 'Owner', manual: 'Owner' };
const nameOf = s => NAMES[s] || (s.startsWith('open:') ? 'Open data' : s);

async function load(songId) {
  return api(`/api/songs/${songId}/enrich/status`).catch(() => null);
}

const joinNames = xs => xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

// Beside a value: a small tick when two or more sources agree, a quiet dot when only one has it. Tap to see which.
function mark(st, field) {
  const f = st?.fields?.[field];
  if (!f) return '';
  const names = [...new Set(f.sources.map(nameOf))];
  const tip = f.verified ? `Verified: ${joinNames(names)} agree` : `From ${joinNames(names)}`;
  return html`<button class="src ${f.verified ? 'ok' : ''}" data-act="src" data-tip="${tip}" aria-label="${tip}" title="${tip}">${f.verified ? icon('check') : ''}</button>`;
}
// The same mark for a value with a fixed provenance (e.g. "Registered with The MLC").
const markText = tip => html`<button class="src ok" data-act="src" data-tip="${tip}" aria-label="${tip}" title="${tip}">${icon('check')}</button>`;

// One line at the foot of the About card: when public sources were last checked, and Refresh.
function footer(st, { user }) {
  if (!st) return '';
  if (st.status === 'running' || st.status === 'never') return html`<div class="card-foot" data-enrich="running">${icon('clock')} Filling in from public sources…</div>`;
  const found = Object.entries(st.found || {}).filter(([k, v]) => NAMES[k] && v?.ok).map(([k]) => NAMES[k]);
  return html`<div class="card-foot"><span title="${found.length ? `Checked ${joinNames(found)}` : 'Not found in public sources'}">${st.status === 'failed' ? 'Couldn’t check public sources' : `Checked ${ago(st.finished_at)}`}</span>
    ${user ? html`<span aria-hidden="true">·</span><button class="link-btn" data-act="enrich-refresh">Refresh</button>` : ''}</div>`;
}

// Wire up the buttons and keep checking while a fill is running, then reload the page once it lands.
function mount(el, song, { st, reload }) {
  on(el, 'click', '[data-act=enrich-refresh]', (e, b) => busy(b, async () => {
    await api.post(`/api/songs/${song.id}/enrich`, {});
    toast('Looking it up again');
    reload();
  }));
  on(el, 'click', '[data-act=src]', (e, b) => toast(b.dataset.tip, { ms: 2600 }));
  if (st && (st.status === 'running' || st.status === 'never')) {
    const t = setInterval(async () => {
      if (!el.isConnected) return clearInterval(t);
      const now = await load(song.id);
      if (now && now.status !== 'running' && now.status !== 'never') { clearInterval(t); reload(); }
    }, 2000);
  }
}

app.enrich = { load, mark, markText, footer, mount };
