// Song Wallet: the money side. Dashboard (#/wallet), statement import review, monthly statements, receipts,
// and the per-song Wallet tab. Every figure comes from the double-entry ledger on the server.
import { useArtistCss } from './00-home.js';
import { app, html, raw, api, toast, modal, icon, on, busy, confirmDialog, formData, money, pct, date, dateTime, ago, art, statusBadge, colorFor, initials, shareColors, esc, infoTip } from '../app.js';

app.nav({ id: 'wallet', label: 'Wallet', href: '/wallet', icon: 'wallet', section: 'Money', order: 10, auth: true , artist: true });
app.nav({ id: 'unclaimed', label: 'Unclaimed property', href: '/wallet/admin/unclaimed', icon: 'lock', section: 'Admin', order: 92, auth: true, admin: true });

const SOURCES = ['Spotify', 'Apple Music', 'YouTube', 'Audius', 'ASCAP', 'BMI', 'SESAC', 'MLC', 'SoundExchange', 'Sync', 'Tips', 'PRS', 'PPL', 'Other'];
const SOCIETY = ['ASCAP', 'BMI', 'SESAC', 'MLC', 'SoundExchange', 'PRS', 'PPL'];
const SOURCE_LABEL = { MLC: 'The MLC', PRS: 'PRS (international)', PPL: 'PPL (international)' };
const srcLabel = s => SOURCE_LABEL[s] || s;
const sourceOptions = sel => html`${SOURCES.map(s => html`<option value="${s}" ${s === sel ? 'selected' : ''}>${srcLabel(s)}</option>`)}`;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SEK'];
const SCOPE_LABEL = { gross: 'Whole song', own_share: 'Just my share' };
const TYPES = { master: 'Master (recording)', publishing: 'Publishing (composition)', neighbouring: 'Neighboring rights', sync: 'Sync license', tips: 'Tips', other: 'Other' };
const SOURCE_COLORS = { Spotify: '#1DB954', 'Apple Music': '#FA2D48', YouTube: '#FF3D3D', Audius: '#A855F7', ASCAP: '#2563EB', BMI: '#7C3AED', SESAC: '#0D9488', PRS: '#4A5CFF', MLC: '#0EA5E9', SoundExchange: '#F59E0B', PPL: '#14B8A6', Sync: '#EC4899', Tips: '#8B5CF6', Other: '#9A9AA3' };
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (m, long = false) => { const [y, mm] = m.split('-').map(Number); return long ? new Date(Date.UTC(y, mm - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }) : MONTHS[mm - 1]; };
const fmt = (v, c) => money(v, c);
const sum = (o = {}) => Object.values(o).reduce((s, v) => s + v, 0);

// ---------- one-time styles ----------
if (!document.getElementById('wl-style')) {
  const st = document.createElement('style');
  st.id = 'wl-style';
  st.textContent = `
  .wl-root svg { width: 18px; height: 18px; flex: none; }
  .wl-root .stat .label svg { width: 15px; height: 15px; }
  .wl-root .avatar svg { width: 14px; height: 14px; }
  .wl-root .list-item > svg { color: var(--muted); }
  .wl-hero { padding: 30px 30px 26px; }
  .wl-hero .wl-amount { font: 700 clamp(44px, 7vw, 68px)/1 var(--display); letter-spacing: -0.045em; font-variant-numeric: tabular-nums; margin: 10px 0 6px; }
  .wl-hero .wl-amount small { font-size: .45em; opacity: .7; letter-spacing: -0.02em; margin-left: 2px; }
  .wl-hero .eyebrow { color: rgba(255,255,255,.75); }
  .wl-hero-row { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 18px; position: relative; z-index: 1; }
  .wl-hero-row div b { display: block; font: 650 18px var(--display); font-variant-numeric: tabular-nums; }
  .wl-hero-row div span { font-size: 12.5px; color: rgba(255,255,255,.72); }
  .wl-hero .btn { position: relative; z-index: 1; }
  .wl-hero .btn-white { background: #fff; color: #1a1340; border-color: #fff; }
  .wl-hero .btn-white:hover { background: #f1efff; }
  .wl-hero .btn-glass { background: rgba(255,255,255,.12); color: #fff; border-color: rgba(255,255,255,.22); }
  .wl-hero .btn-glass:hover { background: rgba(255,255,255,.2); }
  .wl-hero .wl-badge { background: rgba(255,255,255,.14); color: #fff; }
  .wl-held { display: flex; gap: 16px; align-items: center; padding: 16px 20px; border-radius: var(--r-lg); background: var(--warn-soft); color: var(--fg); border: 1px solid color-mix(in srgb, var(--warn) 25%, transparent); }
  .wl-held .wl-held-amt { font: 700 24px/1.15 var(--display); color: var(--warn); font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
  .wl-held .wl-ico { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: color-mix(in srgb, var(--warn) 18%, transparent); color: var(--warn); flex: none; }
  .wl-held .wl-ico svg { width: 20px; height: 20px; }
  .wl-chart svg { display: block; width: 100%; height: auto; overflow: visible; }
  .wl-chart .bar { fill: var(--accent); opacity: .32; transition: opacity .15s; }
  .wl-chart .bar.now { opacity: 1; }
  .wl-chart g:hover .bar { opacity: .85; }
  .wl-chart text { fill: var(--muted); font: 500 11px var(--sans); }
  .wl-chart .grid { stroke: var(--line); stroke-width: 1; }
  .wl-chart .val { fill: var(--fg); font: 600 11px var(--mono); }
  .wl-delta { font-size: 12.5px; font-weight: 600; }
  .wl-delta.up { color: var(--ok); } .wl-delta.down { color: var(--crit); }
  .wl-src { display: flex; flex-direction: column; gap: 10px; }
  .wl-src-row { display: grid; grid-template-columns: 110px 1fr auto; gap: 12px; align-items: center; font-size: 13.5px; }
  .wl-src-row .track { height: 8px; border-radius: 99px; background: var(--surface-3); overflow: hidden; }
  .wl-src-row .track i { display: block; height: 100%; border-radius: 99px; }
  .wl-method { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .wl-method label { border: 1.5px solid var(--line-strong); border-radius: 14px; padding: 14px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; position: relative; }
  .wl-method label:has(input:checked) { border-color: var(--accent); background: var(--accent-soft); }
  .wl-method input[type=radio] { position: absolute; opacity: 0; }
  .wl-method .t { font-weight: 650; display: flex; align-items: center; gap: 8px; }
  .wl-method .t svg { width: 18px; height: 18px; }
  .wl-method .s { font-size: 12.5px; color: var(--muted); }
  .wl-quote { display: grid; grid-template-columns: 1fr auto; gap: 6px 14px; font-size: 14px; padding: 14px 16px; border-radius: 12px; background: var(--surface-2); border: 1px solid var(--line); }
  .wl-quote .tot { font-weight: 700; border-top: 1px solid var(--line); padding-top: 8px; }
  .wl-money { font-family: var(--mono); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .wl-pos { color: var(--money); }
  .wl-alloc { display: flex; flex-direction: column; gap: 0; }
  .wl-alloc-row { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto auto; gap: 12px; align-items: center; padding: 10px 0; border-bottom: 1px dashed var(--line); font-size: 14px; }
  .wl-alloc-row:last-child { border-bottom: 0; }
  .wl-alloc-row .who { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .wl-alloc-row .bps { color: var(--muted); font: 500 12px var(--mono); }
  .wl-pay { border-bottom: 1px solid var(--line); }
  .wl-pay:last-child { border-bottom: 0; }
  .wl-pay summary { list-style: none; cursor: pointer; display: flex; gap: 14px; align-items: center; padding: 14px 22px; }
  .wl-pay summary::-webkit-details-marker { display: none; }
  .wl-pay summary:hover { background: var(--surface-2); }
  .wl-pay[open] summary { background: var(--surface-2); }
  .wl-pay .body { padding: 6px 22px 16px 70px; }
  .wl-srcdot { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; color: #fff; font: 700 12px var(--sans); flex: none; }
  .wl-receipt { max-width: 640px; margin: 0 auto; }
  .wl-receipt .wl-r-top { text-align: center; padding: 34px 26px 22px; border-bottom: 1px dashed var(--line-strong); }
  .wl-receipt .wl-r-amt { font: 700 48px/1 var(--display); letter-spacing: -0.04em; margin: 10px 0; font-variant-numeric: tabular-nums; }
  .wl-receipt .wl-r-sec { padding: 20px 26px; border-bottom: 1px dashed var(--line-strong); }
  .wl-receipt .wl-r-sec:last-child { border-bottom: 0; }
  .wl-st { max-width: 860px; margin: 0 auto; }
  .wl-st table.table td, .wl-st table.table th { padding: 9px 12px; }
  .wl-st .tot td { font-weight: 700; border-top: 2px solid var(--line-strong); }
  .wl-drop { border: 2px dashed var(--line-strong); border-radius: var(--r-lg); padding: 34px 20px; text-align: center; color: var(--muted); transition: border-color .15s, background .15s; cursor: pointer; }
  .wl-drop.over { border-color: var(--accent); background: var(--accent-soft); }
  .wl-drop svg { width: 30px; height: 30px; color: var(--accent); }
  .wl-imp-row select { max-width: 260px; }
  .wl-imp-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .wl-imp-stats button { text-align: left; border: 1px solid var(--line); background: var(--surface); border-radius: 16px; padding: 14px 16px; cursor: pointer; color: inherit; }
  .wl-imp-stats button.on { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent); }
  .wl-imp-stats b { display: block; font: 700 22px var(--display); font-variant-numeric: tabular-nums; }
  .wl-sim { background: var(--surface-3); color: var(--muted); font-weight: 600; }
  @media (max-width: 720px) {
    .wl-hero { padding: 22px 20px; }
    .wl-method { grid-template-columns: 1fr; }
    .wl-imp-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .wl-pay .body { padding-left: 22px; }
    .wl-imp-row select { min-width: 150px; }
    .wl-src-row { grid-template-columns: 84px 1fr auto; }
    .wl-held { flex-wrap: wrap; }
    .wl-hide-sm { display: none; }
    .wl-receipt .wl-r-amt { font-size: 38px; }
  }
  @media print {
    .sidebar, .topbar, .wl-noprint, .toasts { display: none !important; }
    .shell { display: block; } .page { padding: 0; max-width: none; }
    .card { box-shadow: none; border-color: #ddd; }
    body { background: #fff; }
  }`;
  document.head.appendChild(st);
}

const simBadge = (label = 'Simulated', title = 'No real money moves in simulated mode') => html`<span class="badge plain wl-sim" title="${title}">${label}</span>`;
const srcDot = s => html`<span class="wl-srcdot" style="background:${SOURCE_COLORS[s] || '#9A9AA3'}">${s === 'Apple Music' ? 'AM' : s === 'SoundExchange' ? 'SX' : s.slice(0, 2)}</span>`;
const mount = (el, markup) => { el.innerHTML = `<div class="wl-root">${String(markup)}</div>`; return el.firstElementChild; };
const last12 = (n = 12) => {
  const out = []; const d = new Date(); d.setUTCDate(1);
  for (let i = n - 1; i >= 0; i--) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); out.push(x.toISOString().slice(0, 7)); }
  return out;
};

// Monthly income bars (inline SVG, no libraries).
function barChart(series, cur, { height = 210 } = {}) {
  const narrow = innerWidth < 640;
  const months = last12(narrow ? 6 : 12);
  if (narrow) height = 260;
  const vals = months.map(m => series?.[m] || 0);
  const max = Math.max(...vals, 1);
  const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); const n = max / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; })();
  const W = narrow ? 380 : 720, H = height, L = 8, B = 26, T = 18, bw = (W - L) / months.length;
  const y = v => T + (H - T - B) * (1 - v / nice);
  const grid = [0, .5, 1].map(f => html`<line class="grid" x1="${L}" x2="${W}" y1="${y(nice * f)}" y2="${y(nice * f)}"></line>`);
  const thisM = months.at(-1);
  return html`<div class="wl-chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Income by month">
    ${grid}
    <text x="${W}" y="${y(nice) - 5}" text-anchor="end">${fmt(nice, cur)}</text>
    ${months.map((m, i) => {
      const v = vals[i], x = L + i * bw + bw * 0.18, w = bw * 0.64, top = y(v);
      return html`<g><title>${monthLabel(m, true)}: ${fmt(v, cur)}</title>
        <rect class="bar ${m === thisM ? 'now' : ''}" x="${x}" y="${v ? top : y(0) - 2}" width="${w}" height="${v ? y(0) - top : 2}" rx="5"></rect>
        <text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${monthLabel(m)}</text>
        ${m === thisM && v ? html`<text class="val" x="${x + w / 2}" y="${top - 6}" text-anchor="middle">${fmt(v, cur)}</text>` : ''}</g>`;
    })}
  </svg></div>`;
}

function sourceBars(bySource, cur) {
  const rows = Object.entries(bySource || {}).sort((a, b) => b[1] - a[1]);
  const total = sum(bySource) || 1;
  if (!rows.length) return html`<p class="muted small">No income yet.</p>`;
  return html`<div class="wl-src">${rows.map(([s, v]) => html`<div class="wl-src-row"><span style="font-weight:600">${s}</span>
    <span class="track"><i style="width:${Math.max(2, v / total * 100)}%;background:${SOURCE_COLORS[s] || 'var(--accent)'}"></i></span><span class="wl-money">${fmt(v, cur)}</span></div>`)}</div>`;
}

function allocRows(f, { showSong = false } = {}) {
  const rows = f.allocations || [];
  const holds = f.holds || [];
  return html`<div class="wl-alloc">
    ${rows.map((a, i) => html`<div class="wl-alloc-row">
      ${a.payee_type === 'song' ? html`<span class="avatar sm" style="background:var(--grad)">${icon('git')}</span>` : html`<span class="avatar sm" style="background:${colorFor(a.email || a.name || i)}">${initials(a.name)}</span>`}
      <span class="who">${a.payee_type === 'song' ? html`<a href="#/song/${a.payee_song_id}?tab=wallet">${a.name}</a> <span class="muted small">(remix share, split again below)</span>` : a.name}
        ${a.kind === 'release' ? html` <span class="badge ok plain">Released</span>` : a.kind === 'own_share' ? html` <span class="badge info plain">Own share</span>` : a.kind === 'pay_now' ? html` <span class="badge warn plain">Paid now, owed</span>` : ''}${showSong ? html` <span class="muted small">· ${a.title}</span>` : ''}</span>
      <span class="bps">${a.kind === 'own_share' || a.kind === 'pay_now' ? 'all' : `${pct(a.bps)} ${a.pool === 'publishing' ? 'pub' : 'master income'}`}</span>
      <b class="wl-money">${fmt(a.amount, a.currency)}</b></div>`)}
    ${holds.map(h => html`<div class="wl-alloc-row"><span class="avatar sm" style="background:var(--warn)">${icon('clock')}</span>
      <span class="who">${h.status === 'held' ? html`<b>Held</b> <span class="muted small">${h.reason}${h.expires_at ? ` · back to the payer on ${date(h.expires_at)} if unsigned` : ''}</span>` : h.status === 'returned' ? html`<span class="muted">Not signed in time: returned to the payer of record ${date(h.released_at)}</span>` : h.status === 'reversed' ? html`<span class="muted">Reversed</span>` : html`<span class="muted">Was held, released ${date(h.released_at)}</span>`}</span><span></span>
      <b class="wl-money" style="color:${h.status === 'held' ? 'var(--warn)' : 'var(--muted)'}">${fmt(h.amount, h.currency || f.currency)}</b></div>`)}
  </div>`;
}

// ---------- dashboard ----------
app.route('/wallet', async ({ el, query }) => {
  useArtistCss();
  const [d, month] = await Promise.all([api('/api/wallet'), api('/api/my/month').catch(() => null)]);
  const cur = d.currencies.includes(query.get('cur')) ? query.get('cur') : d.currencies[0];
  // The latest payments, each with how it was split between everyone on the song.
  const latestIds = [...new Set(d.recent.filter(a => a.currency === cur).map(a => a.income_id))].slice(0, 3);
  const latest = (await Promise.all(latestIds.map(i => api(`/api/wallet/income/${i}`).catch(() => null)))).filter(Boolean);
  let method = 'bank';
  const avail = d.balances[cur] || 0;
  const pending = d.pending[cur] || 0;
  const held = d.held.filter(h => h.currency === cur);
  const heldTotal = held.reduce((s, h) => s + h.amount, 0);
  const series = d.months[cur] || {};
  const thisM = series[d.thisMonth] || 0, lastM = series[d.lastMonth] || 0;
  const delta = lastM ? Math.round((thisM - lastM) / lastM * 100) : null;
  const lifetime = sum(series);
  const songs = d.bySong.filter(s => s.currency === cur);
  const sim = d.drivers.payments === 'simulated';
  const root = mount(el, html`
  <div class="page-head"><div><h1>Wallet</h1>
    <p class="lede">Your share of every payment, split the same day. ${infoTip('Every payment routed here is split the same day by the signed passport. There is no cut on money coming in.', 'How the wallet works')}</p></div>
    <div class="row wrap">
      ${d.currencies.length > 1 ? html`<div class="seg">${d.currencies.map(c => html`<button class="${c === cur ? 'on' : ''}" data-cur="${c}">${c}</button>`)}</div>` : ''}
      <a class="btn" href="#/wallet/import">${icon('upload')} Import statement</a>
    </div>
  </div>
  <div class="stack-lg">
    <div class="card hero wl-hero">
      <div class="row between wrap" style="position:relative;z-index:1">
        <span class="eyebrow">Available to withdraw</span>
        ${sim ? html`<span class="badge plain wl-badge" title="Payouts are recorded in the ledger but no money moves until Stripe is connected">Simulated payouts</span>` : ''}
      </div>
      <div class="wl-amount" style="position:relative;z-index:1">${fmt(avail, cur)}</div>
      ${month?.splitWith?.length ? html`<div style="position:relative;z-index:1;margin-top:4px;font-weight:600;opacity:.9">${sameDay(month.splitWith)}</div>` : ''}
      <div class="row wrap" style="gap:10px;margin-top:14px">
        <a class="btn btn-glass btn-lg" href="#/wallet/statements/${d.thisMonth}?cur=${cur}">${icon('receipt')} Statement</a>
      </div>
      <div class="wl-hero-row">
        <div><b>${fmt(pending, cur)}</b><span>On its way to you</span></div>
        <div><b>${fmt(heldTotal, cur)}</b><span>Held for signatures</span></div>
        <div><b>${fmt(lifetime, cur)}</b><span>Earned in the last 12 months</span></div>
      </div>
    </div>

    <section class="ah-card" aria-labelledby="wd-h">
      <div class="eyebrow" id="wd-h" style="margin-bottom:10px">Withdraw to</div>
      <div class="aw-toggle" role="radiogroup">
        <button role="radio" aria-checked="true" class="on" data-method="bank">${icon('bank')} Bank<small>${d.payout.releaseDiscount ? '1%' : '1.5%'} fee · from ${fmt(d.payout.fees.minimumPayout, cur)}</small></button>
        <button role="radio" aria-checked="false" data-method="audio">${icon('audius')} AUDIO<small>0.5% fee · any amount</small></button>
      </div>
      <button class="ah-cta" style="width:100%;margin-top:12px" data-act="withdraw" ${avail > 0 ? '' : 'disabled'}>Withdraw ${fmt(avail, cur)}</button>
      <div class="aw-payline" id="wd-note">${payLine(d, cur, avail)}</div>
    </section>

    ${latest.length ? html`<section class="ah-card"><h2>Latest payments</h2>${latest.map(r => splitItem(r, cur))}</section>` : ''}

    ${held.length ? html`<div class="wl-held">
      <span class="wl-ico">${icon('clock')}</span>
      <div class="grow" style="flex:1;min-width:200px"><div class="wl-held-amt">${fmt(heldTotal, cur)} waiting for signatures</div>
        <div class="small muted">Paid out the moment everyone signs ${infoTip(`Money that arrived before everyone signed waits in the song's wallet and is paid out the moment the split is fully signed. If it is not signed within ${d.policy.holdMaxDays} days, it goes back to whoever paid it in.`, 'About held money')}</div></div>
    </div>
    <div class="card"><div class="list">${held.map(h => html`<a class="list-item" href="#/song/${h.song_id}?tab=${h.manage ? 'splits' : 'wallet'}">
      ${art(h.title + h.artist_credit, { label: h.title })}<div class="grow"><div class="title">${h.title}</div><div class="sub">${h.reason}</div></div>
      <b class="wl-money" style="color:var(--warn)">${fmt(h.amount, h.currency)}</b>${h.manage ? html`<span class="btn btn-sm wl-hide-sm">Get it signed ${icon('arrow')}</span>` : ''}</a>`)}</div></div>` : ''}

    ${lifetime ? html`<div class="grid grid-3">
      <div class="card stat"><div class="label">${icon('chart')} This month</div><div class="value money">${fmt(thisM, cur)}</div>
        <div class="sub">${delta === null ? (thisM ? 'First income this year' : 'Nothing yet this month') : html`<span class="wl-delta ${delta >= 0 ? 'up' : 'down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</span> vs ${monthLabel(d.lastMonth, true)}`}</div></div>
      <div class="card stat"><div class="label">${icon('clock')} ${monthLabel(d.lastMonth, true)}</div><div class="value">${fmt(lastM, cur)}</div><div class="sub">Last month</div></div>
      <div class="card stat"><div class="label">${icon('music')} Songs paying you</div><div class="value">${songs.length}</div><div class="sub">${songs.reduce((s, x) => s + x.payments, 0)} payments split to you</div></div>
    </div>` : ''}
    <div class="card"><div class="card-head"><h2 class="h3">Income by month</h2><span class="muted small">Your share, ${cur}</span></div>
      <div class="card-body">${lifetime ? barChart(series, cur) : html`<div class="empty" style="padding:30px"><div class="icon">${icon('chart')}</div><h2 class="h3">No income yet</h2><p>Add income on a song or import a distributor statement. Your share shows up here the same day.</p></div>`}</div></div>

    <div class="split-main ${songs.length || d.recent.some(a => a.currency === cur) ? '' : 'side-only'}">
      <div class="stack-lg">
        ${songs.length ? html`<div class="card"><div class="card-head"><h2 class="h3">By song</h2><span class="muted small">Your share</span></div>
          ${songs.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Song</th><th class="r wl-hide-sm">Payments</th><th class="r">This month</th><th class="r">Lifetime</th></tr></thead><tbody>
            ${songs.map(s => html`<tr class="click" data-href="/song/${s.song_id}?tab=wallet"><td><div class="row">${art(s.title + s.artist_credit, { label: s.title })}<div style="min-width:0"><div style="font-weight:600">${s.title}</div><div class="small muted">${s.artist_credit}</div></div></div></td>
              <td class="r wl-hide-sm num">${s.payments}</td><td class="r wl-money">${fmt(s.thisMonth, cur)}</td><td class="r wl-money"><b>${fmt(s.lifetime, cur)}</b></td></tr>`)}
          </tbody></table></div>` : ''}
        </div>` : ''}
        ${d.recent.some(a => a.currency === cur) ? html`<div class="card"><div class="card-head"><h2 class="h3">Recent payments</h2></div>
          ${d.recent.filter(a => a.currency === cur).length ? html`<div class="list">${d.recent.filter(a => a.currency === cur).map(a => html`<a class="list-item" href="#/wallet/receipt/${a.income_id}">
            ${srcDot(a.source)}<div class="grow"><div class="title">${a.title}</div><div class="sub">${a.source} · ${TYPES[a.type] || a.type} · ${a.kind === 'own_share' ? 'your own share' : a.kind === 'pay_now' ? 'paid to you early (owed to the split)' : `${pct(a.bps)} share`}${a.kind === 'release' ? ' · released after signing' : ''}${a.simulated ? ' · simulated' : ''}</div></div>
            <div style="text-align:right"><b class="wl-money wl-pos">+${fmt(a.amount, a.currency)}</b><div class="tiny muted">${ago(a.created_at)}</div></div></a>`)}</div>`
          : ''}
        </div>` : ''}
      </div>
      <div class="stack-lg">
        ${lifetime ? html`<div class="card"><div class="card-head"><h2 class="h3">Where it comes from</h2></div><div class="card-body">${sourceBars(d.bySource[cur], cur)}</div></div>` : ''}
        ${payeeCard(d)}
        ${d.owed.length ? html`<div class="card"><div class="card-head"><h2 class="h3">You owe the split</h2><span class="muted small">Paid to you early</span></div><div class="list">
          ${d.owed.map(o => html`<div class="list-item" style="align-items:flex-start"><div class="grow"><div class="title"><a href="#/song/${o.song_id}?tab=wallet">${o.title}</a> <span class="wl-money">${fmt(o.amount, o.currency)}</span></div>
            <div class="sub" style="white-space:normal">${o.status === 'due' ? (o.breakdown?.length ? o.breakdown.map(b => `${b.name} ${money(b.amount, o.currency)}`).join(' · ') : o.reason) : 'Waiting for the split to be signed. ' + o.reason}</div></div>
            ${o.status === 'due' ? html`<button class="btn btn-sm" data-settle="${o.id}">Mark paid</button>` : statusBadge('pending')}</div>`)}
        </div></div>` : ''}
        ${d.payouts.length ? html`        <div class="card"><div class="card-head"><h2 class="h3">Payouts</h2>${avail > 0 ? html`<button class="btn btn-sm" data-act="withdraw">Withdraw</button>` : ''}</div>
          ${d.payouts.length ? html`<div class="list">${d.payouts.map(p => html`<div class="list-item"><span class="avatar sm" style="background:${p.method === 'audio' ? 'var(--violet)' : 'var(--fg-2)'}">${icon(p.method === 'audio' ? 'audius' : 'bank')}</span>
            <div class="grow"><div class="title wl-money">${fmt(p.net, p.currency)}</div><div class="sub">${p.method === 'audio' ? 'AUDIO' : 'Bank'} · fee ${fmt(p.fee, p.currency)} · ${ago(p.created_at)}${p.failure_reason ? ' · ' + p.failure_reason : ''}</div></div>
            ${p.status === 'requested' ? statusBadge('pending') : statusBadge(p.status)}${p.driver === 'simulated' ? simBadge('Sim') : ''}</div>`)}</div>`
          : ''}
        </div>` : ''}
        ${d.statements.length ? html`        <div class="card"><div class="card-head"><h2 class="h3">Statements</h2></div>
          ${d.statements.length ? html`<div class="list">${d.statements.slice(0, 6).map(m => html`<a class="list-item" href="#/wallet/statements/${m}?cur=${cur}">${icon('file')}<div class="grow"><div class="title">${monthLabel(m, true)}</div></div>${icon('arrow')}</a>`)}</div>`
          : ''}
        </div>` : ''}
        <div class="card card-pad fees"><div class="fees-big"><b>0%</b><span class="quiet">on money coming in</span></div>
          <div class="fees-row"><span>Bank payout</span><b class="num">${d.payout.releaseDiscount ? '1%' : '1.5%'}</b></div>
          <div class="fees-row"><span>${icon('audius')} AUDIO payout</span><b class="num">0.5%</b></div>
          <div class="fees-foot quiet">Bank payouts from ${fmt(d.payout.fees.minimumPayout, cur)}, AUDIO at any amount ${infoTip(`Bank payouts are ${d.payout.releaseDiscount ? '1% (reduced because you released through us)' : '1.5% (1% when you release through us)'}, minimum 25¢. AUDIO payouts are optional and cost 0.5% because the network costs less to send on; there are no rewards for buying or holding AUDIO. Payouts are made by our licensed payments partner (Stripe Connect or Trolley).`, 'About fees')}</div></div>
        ${d.imports.length ? html`<div class="card"><div class="card-head"><h2 class="h3">Statement imports</h2><a class="btn btn-sm" href="#/wallet/import">New</a></div><div class="list">
          ${d.imports.map(i => html`<a class="list-item" href="#/wallet/import/${i.id}">${icon('file')}<div class="grow"><div class="title">${i.filename}</div><div class="sub">${i.line_count} lines · ${ago(i.created_at)}</div></div>${statusBadge(i.status === 'posted' ? 'approved' : 'pending')}</a>`)}
        </div></div>` : ''}
      </div>
    </div>
  </div>`);
  on(root, 'click', '[data-cur]', (e, b) => app.go(`/wallet?cur=${b.dataset.cur}`));
  on(root, 'click', 'tr[data-href]', (e, tr) => app.go(tr.dataset.href));
  on(root, 'click', '[data-act=withdraw]', () => d.payee.ready ? withdraw(d, cur, avail, method) : payeeSetup(d));
  on(root, 'click', '[data-method]', (e, b) => {
    method = b.dataset.method;
    root.querySelectorAll('[data-method]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', String(x === b)); });
    root.querySelector('#wd-note').textContent = payLine(d, cur, avail, method);
  });
  on(root, 'click', '[data-act=payee]', () => payeeSetup(d));
  on(root, 'click', '[data-settle]', async (e, b) => {
    if (!await confirmDialog('Mark as paid?', 'Confirm you have paid each contributor what this payment owed them, outside the wallet.', 'Mark paid')) return;
    await api.post(`/api/wallet/owed/${b.dataset.settle}/settle`); toast('Marked as paid'); app.refresh();
  });
  // Refresh while a payout is moving.
  if (d.payouts.some(p => ['requested', 'processing'].includes(p.status))) {
    setTimeout(() => { if (location.hash.split('?')[0] === '#/wallet') app.refresh(); }, 3500);
  }
}, { auth: true, title: 'Wallet' });

// "Theo and Mae were paid their share the same day."
function sameDay(names) {
  const who = names.length > 2 ? `${names.slice(0, 2).join(', ')} and ${names.length - 2} more` : names.join(' and ');
  return `${who} ${names.length === 1 ? 'was' : 'were'} paid their share the same day`;
}

// One quiet line under the withdraw button: the next automatic payout, or how close the bank minimum is. AUDIO has no minimum.
function payLine(d, cur, avail, method = 'bank') {
  const ps = d.payout_schedule, min = ps?.threshold_minor ?? d.payout.fees.minimumPayout;
  if (method === 'audio') return 'AUDIO payouts work at any amount.';
  if (ps?.eligible && ps.next_date) return `Next payout · ${new Date(ps.next_date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  if (ps && !ps.eligible) return `Payouts start at ${fmt(min, cur)} · ${fmt(ps.balance_minor ?? avail, cur)} so far, rolls over`;
  return d.payout.fees.autoPayout?.note || '';
}

// A payment with its split bar: what each person on the song got from it.
function splitItem(r, cur) {
  const inc = r.income, al = (r.family[0]?.allocations || []).filter(a => a.amount > 0);
  const colors = al.map((_, i) => shareColors[i % shareColors.length]);
  return html`<a class="aw-item" href="#/wallet/receipt/${inc.id}" style="display:block;color:inherit;text-decoration:none">
    <div class="top"><div><div class="t">${inc.title}</div><div class="small muted">${inc.source} · ${ago(inc.created_at)}</div></div><div class="a">${fmt(inc.amount, inc.currency)}</div></div>
    ${al.length > 1 ? html`<div class="aw-split">${al.map((a, i) => html`<i style="flex:${a.amount};background:${colors[i]}"></i>`)}</div>
    <div class="aw-who">${al.map(a => html`<span>${a.name || 'Unnamed'} <b>${fmt(a.amount, a.currency)}</b></span>`)}</div>` : ''}</a>`;
}

function payeeCard(d) {
  const p = d.payee;
  if (p.ready) return html`<div class="card"><div class="card-head"><h2 class="h3">Payee details</h2><span class="badge ok">Ready</span></div><div class="card-body small stack-sm">
    <div class="row between"><span class="muted">Legal name</span><b>${p.legal_name}</b></div>
    <div class="row between"><span class="muted">Tax form</span><b>${p.tax_form} · ${p.country}</b></div>
    ${p.withholding ? html`<div class="callout warn" style="margin-top:6px">${icon('info')}<div class="tiny">You have US-source royalties and are outside the US, so US tax may be withheld from some of them (up to 30%, or your treaty rate). We flag this; we don't calculate tax.</div></div>` : ''}
    <button class="btn btn-sm btn-ghost" data-act="payee" style="align-self:flex-start">Update</button></div></div>`;
  const what = { legal_name: 'legal name', country: 'country', tax_form: 'tax form (W-9 or W-8BEN)', identity: 'one-time code' };
  return html`<button class="card card-pad todo" data-act="payee"><span class="tile-ic">${icon('shield')}</span><span class="grow"><b>Add payee details</b><span class="quiet">Needed before your first payout</span></span>
    ${infoTip(`Add your ${p.missing.map(m => what[m]).join(', ')}. It takes about a minute and is required for tax reporting.`, 'Why this is needed')}</button>`;
}

async function payeeSetup(d) {
  const p = d.payee;
  if (p.missing.length === 1 && p.missing[0] === 'identity') return identityCheck();
  const prof = p;
  await modal({
    title: 'Payee details',
    wide: true,
    body: html`<form class="form-grid" id="pf">
      <p class="full small muted">Required before your first payout so royalties can be reported correctly. US persons complete a W-9; everyone else a W-8BEN. We keep only the last four digits of tax numbers; payouts are made by our licensed payments partner.</p>
      <label class="field"><span>Full legal name</span><input class="input" name="legal_name" value="${prof.legal_name || ''}" required></label>
      <label class="field"><span>Country of residence</span><input class="input mono" name="country" value="${prof.country || 'US'}" maxlength="2" placeholder="US" style="text-transform:uppercase"></label>
      <label class="field full"><span>Address</span><input class="input" name="address" placeholder="Street, city, state, ZIP"></label>
      <div class="full stack" id="pf-w9">
        <div class="eyebrow">Form W-9 · US person</div>
        <div class="form-grid">
          <label class="field"><span>Tax ID type</span><select class="input" name="tin_type"><option>SSN</option><option>EIN</option></select></label>
          <label class="field"><span>SSN or EIN</span><input class="input mono" name="tin" inputmode="numeric" placeholder="123-45-6789" autocomplete="off"></label>
          <label class="field full"><span>Federal tax classification</span><select class="input" name="entity_type"><option value="individual">Individual / sole proprietor</option><option value="llc">LLC</option><option value="c_corp">C corporation</option><option value="s_corp">S corporation</option><option value="partnership">Partnership</option><option value="trust">Trust / estate</option></select></label>
        </div></div>
      <div class="full stack hidden" id="pf-w8">
        <div class="eyebrow">Form W-8BEN · not a US person</div>
        <div class="form-grid">
          <label class="field"><span>Country of citizenship</span><input class="input mono" name="citizenship_country" maxlength="2" placeholder="GB" style="text-transform:uppercase"></label>
          <label class="field"><span>Date of birth</span><input class="input" type="date" name="date_of_birth"></label>
          <label class="field"><span>Foreign tax ID <span class="hint">optional</span></span><input class="input mono" name="foreign_tin" autocomplete="off"></label>
          <label class="field"><span>Treaty country <span class="hint">optional</span></span><input class="input mono" name="treaty_country" maxlength="2"></label>
        </div></div>
      <label class="field full"><span>Signature <span class="hint">type your full legal name</span></span><input class="input" name="signature"></label>
      <label class="check full"><input type="checkbox" name="certify"><span class="small">Under penalties of perjury, I certify that the information on this form is true, correct and complete.</span></label>
    </form>`,
    actions: [{ label: 'Cancel' }, { label: 'Save and certify', primary: true, onClick: async (close, m) => {
      const f = formData(m.querySelector('#pf'));
      f.country = String(f.country || '').toUpperCase(); f.certify = !!f.certify;
      f.tax_form = f.country === 'US' ? 'W-9' : 'W-8BEN';
      const r = await api.put('/api/wallet/payee', f);
      close(); toast('Payee details saved');
      if (r.missing?.includes('identity')) return identityCheck();
      app.refresh();
    } }],
    onOpen: m => {
      const form = m.querySelector('#pf');
      const sync = () => { const us = String(form.country.value).toUpperCase() === 'US'; m.querySelector('#pf-w9').classList.toggle('hidden', !us); m.querySelector('#pf-w8').classList.toggle('hidden', us); };
      form.country.addEventListener('input', sync); sync();
    }
  });
}

async function identityCheck() {
  const s = await api.post('/api/wallet/identity/start');
  await modal({
    title: 'Confirm it’s you',
    body: html`<p class="muted">We sent a 6-digit code to ${s.to}. Enter it to unlock withdrawals.</p>
      <label class="field" style="margin-top:12px"><span>Code</span><input class="input mono" id="otp" inputmode="numeric" maxlength="6" style="font-size:22px;letter-spacing:.3em" value="${s.devCode || ''}"></label>
      ${s.devCode ? html`<p class="tiny muted" style="margin-top:6px">Email isn't connected on this server, so the code is filled in for you.</p>` : ''}`,
    actions: [{ label: 'Cancel' }, { label: 'Confirm', primary: true, onClick: async (close, m) => { await api.post('/api/wallet/identity/verify', { code: m.querySelector('#otp').value }); toast('Confirmed'); close(); app.refresh(); } }]
  });
}

function withdraw(d, cur, avail, method = 'bank') {
  const major = (avail / 100).toFixed(2);
  const min = d.payout.fees.minimumPayout;
  if (avail < min) method = 'audio';   // bank payouts start at the minimum; AUDIO works at any amount
  let address = d.payout.walletAddress;
  modal({
    title: 'Withdraw',
    body: html`<form class="stack" id="wf">
      <label class="field"><span>Amount <span class="hint">available ${fmt(avail, cur)}</span></span>
        <div class="row"><input class="input mono" name="amount" inputmode="decimal" value="${major}" style="font-size:20px;font-weight:600"><button type="button" class="btn btn-sm" data-max>Max</button></div></label>
      <div class="field"><span>Send to</span>
        <div class="wl-method">
          <label><input type="radio" name="method" value="bank" ${method === 'bank' ? 'checked' : ''} ${avail < min ? 'disabled' : ''}><span class="t">${icon('bank')} Bank account</span><span class="s">${avail < min ? `From ${fmt(min, cur)} · ` : ''}${d.payout.releaseDiscount ? '1%' : '1.5%'} fee, min 25¢ · 1 to 3 business days${d.payout.bank.driver === 'simulated' ? ' · simulated' : ''}</span></label>
          <label><input type="radio" name="method" value="audio" ${method === 'audio' ? 'checked' : ''}><span class="t">${icon('audius')} AUDIO</span><span class="s">0.5% fee (lower network cost) · to your Solana wallet · optional</span></label>
        </div></div>
      <label class="field hidden" id="wf-addr"><span>Solana wallet address</span><input class="input mono" name="wallet_address" value="${address || ''}" placeholder="e.g. 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"></label>
      <div id="wf-quote"></div>
      ${d.payee.withholding ? html`<p class="tiny muted">${icon('info')} Some of your royalties are US-source and you are outside the US: US tax may be withheld under your ${d.payee.tax_form}. We flag it; we don't calculate tax.</p>` : ''}
      ${d.payout.bank.driver === 'simulated' ? html`<p class="tiny muted">${simBadge()} This server is not connected to Stripe yet: payouts go through every step and are recorded in your ledger, but no money moves.</p>` : ''}
    </form>`,
    actions: [{ label: 'Cancel' }, { label: 'Withdraw', primary: true, onClick: async (close, m) => {
      const f = formData(m.querySelector('#wf'));
      if (f.method === 'audio' && f.wallet_address && f.wallet_address !== address) { await api.patch('/api/me', { wallet_address: f.wallet_address }); address = f.wallet_address; }
      if (f.method === 'bank' && !d.payout.bank.connected) {
        const r = await api.post('/api/wallet/payout-method/bank');
        if (r.url) { location.href = r.url; return false; }
      }
      const r = await api.post('/api/wallet/payouts', { amount: f.amount, currency: cur, method: f.method });
      toast(`${fmt(r.payout.net, cur)} is on its way`);
      close(); app.refresh();
    } }],
    onOpen: m => {
      const form = m.querySelector('#wf');
      let t;
      const quote = async () => {
        const f = formData(form);
        m.querySelector('#wf-addr').classList.toggle('hidden', f.method !== 'audio');
        clearTimeout(t);
        t = setTimeout(async () => {
          const box = m.querySelector('#wf-quote');
          try {
            const q = await api(`/api/wallet/fees?amount=${encodeURIComponent(f.amount || 0)}&currency=${cur}`);
            const x = q.quote[f.method];
            box.innerHTML = html`<div class="wl-quote"><span>You withdraw</span><span class="wl-money">${fmt(q.amount, cur)}</span>
              <span class="muted">Fee (${x.rule.note})</span><span class="wl-money muted">−${fmt(x.fee, cur)}</span>
              <span class="tot">You receive</span><span class="tot wl-money">${fmt(x.net, cur)}</span></div>
              ${f.method === 'bank' && q.amount < d.payout.fees.minimumPayout ? html`<p class="small" style="color:var(--crit);margin-top:6px">Bank payouts start at ${fmt(d.payout.fees.minimumPayout, cur)}</p>` : q.amount > avail ? html`<p class="small" style="color:var(--crit);margin-top:6px">More than your available balance</p>` : ''}`.s;
          } catch { box.innerHTML = ''; }
        }, 150);
      };
      form.addEventListener('input', quote);
      form.addEventListener('change', quote);
      m.querySelector('[data-max]').addEventListener('click', () => { form.amount.value = major; quote(); });
      quote();
    }
  });
}

// ---------- receipt ----------
app.route('/wallet/receipt/:id', async ({ el, params }) => {
  const r = await api(`/api/wallet/income/${params.id}`);
  const inc = r.income;
  const root = mount(el, html`<div class="wl-receipt stack-lg">
    <div class="row between wl-noprint"><a class="btn btn-ghost" href="#/wallet">${icon('back')} Wallet</a><button class="btn" data-act="print">${icon('download')} Print or save PDF</button></div>
    <div class="card">
      <div class="wl-r-top">
        <span class="eyebrow">Receipt · ${date(inc.created_at)}</span>
        <div class="wl-r-amt">${fmt(inc.amount, inc.currency)}</div>
        <div style="font-weight:600;font-size:16px">${inc.source} ${TYPES[inc.type] ? '· ' + TYPES[inc.type] : ''}</div>
        <div class="muted">for <a href="#/song/${inc.song_id}?tab=wallet">${inc.title}</a> by ${inc.artist_credit}</div>
        <div class="row wrap" style="justify-content:center;margin-top:12px">
          ${statusBadge(inc.status === 'split' ? 'paid' : inc.status === 'reversed' ? 'voided' : 'held')}
          ${inc.period_start ? html`<span class="badge plain">${date(inc.period_start)} to ${date(inc.period_end)}</span>` : ''}
          ${inc.simulated ? simBadge() : ''}
        </div>
      </div>
      ${r.family.map((f, i) => html`<div class="wl-r-sec">
        <div class="row between" style="margin-bottom:6px"><h2 class="h3">${i === 0 ? 'How it was split' : html`Then split again by <a href="#/song/${f.song_id}">${f.title}</a>`}</h2><span class="wl-money muted">${fmt(f.amount, f.currency)}</span></div>
        ${f.allocations.length || f.holds.length ? allocRows(f) : html`<p class="muted small">Nothing allocated.</p>`}
      </div>`)}
      <div class="wl-r-sec small muted stack-sm">
        ${inc.note ? html`<div>${inc.note}</div>` : ''}
        <div>Split the same day by the signed passport. Amounts are exact to the cent; any odd cent goes to the largest remainder.</div>
        <div class="hash">Ledger transaction ${r.txn?.id} · ${r.txn?.hash}</div>
      </div>
    </div>
    ${r.canManage && inc.status !== 'reversed' ? html`<div class="row end wl-noprint"><button class="btn btn-ghost btn-danger btn-sm" data-act="reverse">Reverse this payment</button></div>` : ''}
  </div>`);
  on(root, 'click', '[data-act=print]', () => print());
  on(root, 'click', '[data-act=reverse]', async (e, b) => {
    const m = await modal({ title: 'Reverse this payment', body: html`<p class="muted">A reversing entry takes this money back from everyone it was paid to. The original stays in the history. Use it for duplicates or mistakes.</p>
      <label class="field" style="margin-top:12px"><span>Reason</span><input class="input" id="rv-reason" placeholder="e.g. Duplicate of the September statement"></label>`,
      actions: [{ label: 'Cancel' }, { label: 'Reverse', danger: true, onClick: async (close, mm) => { await api.post(`/api/wallet/income/${inc.id}/reverse`, { reason: mm.querySelector('#rv-reason').value }); return true; } }] });
    if (m) { toast('Payment reversed'); app.refresh(); }
  });
}, { auth: true, title: 'Receipt' });

// ---------- statements ----------
app.route('/wallet/statements/:period', async ({ el, params, query }) => {
  const cur = query.get('cur') || 'USD';
  const [{ statement: s }, meta] = await Promise.all([api(`/api/wallet/statements/${params.period}?currency=${cur}`), api('/api/wallet/statements')]);
  const [y, m] = params.period.split('-').map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7), next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  const bySong = {};
  for (const i of s.income) (bySong[i.song_id] ??= { title: i.title, artist: i.artist_credit, rows: [], total: 0 }).rows.push(i), bySong[i.song_id].total += i.amount;
  const root = mount(el, html`<div class="wl-st stack-lg">
    <div class="row between wrap wl-noprint">
      <div class="row"><a class="btn btn-ghost" href="#/wallet">${icon('back')} Wallet</a>
        <a class="btn btn-ghost btn-icon" href="#/wallet/statements/${prev}?cur=${cur}" title="Previous month">${icon('back')}</a>
        <a class="btn btn-ghost btn-icon" href="#/wallet/statements/${next}?cur=${cur}" title="Next month">${icon('arrow')}</a></div>
      <div class="row wrap">
        ${meta.currencies.length > 1 ? html`<div class="seg">${meta.currencies.map(c => html`<button class="${c === cur ? 'on' : ''}" data-cur="${c}">${c}</button>`)}</div>` : ''}
        <a class="btn" href="/api/wallet/statements/${params.period}.csv?currency=${cur}" download>${icon('download')} CSV</a>
        <button class="btn btn-primary" data-act="print">${icon('file')} Print</button></div>
    </div>
    <div class="card card-pad stack-lg">
      <div class="row between wrap" style="align-items:flex-start">
        <div><span class="eyebrow">Song Wallet statement</span><h1 style="margin-top:6px">${monthLabel(params.period, true)}</h1>
          <div class="muted">${s.account.name || ''} ${s.account.email} · ${s.currency}</div></div>
        <div style="text-align:right"><div class="small muted">Closing balance</div><div style="font:700 32px var(--display);letter-spacing:-0.03em" class="num">${fmt(s.closing, s.currency)}</div>
          ${s.reconciles ? html`<span class="seal" style="padding:4px 10px;font-size:12px;margin-top:4px">${icon('check')} Reconciles to the ledger</span>` : html`<span class="badge crit">Does not reconcile</span>`}</div>
      </div>
      <div class="grid grid-4">
        <div class="stat card"><div class="label">Opening</div><div class="value" style="font-size:20px">${fmt(s.opening, s.currency)}</div></div>
        <div class="stat card"><div class="label">Income</div><div class="value money" style="font-size:20px">+${fmt(s.lines.income + s.lines.corrections, s.currency)}</div></div>
        <div class="stat card"><div class="label">Paid out</div><div class="value" style="font-size:20px">−${fmt(s.lines.payouts, s.currency)}</div><div class="sub">incl. ${fmt(s.lines.fees, s.currency)} fees</div></div>
        <div class="stat card"><div class="label">Closing</div><div class="value" style="font-size:20px">${fmt(s.closing, s.currency)}</div></div>
      </div>
      <div><h2 class="h3" style="margin-bottom:8px">Income by song and source</h2>
        ${s.income.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Song</th><th>Source</th><th class="wl-hide-sm">Type</th><th class="r wl-hide-sm">Payments</th><th class="r">Your share</th></tr></thead><tbody>
          ${Object.values(bySong).map(g => html`${g.rows.map((i, k) => html`<tr><td>${k === 0 ? html`<b>${g.title}</b><div class="tiny muted">${g.artist}</div>` : ''}</td><td>${i.source}</td><td class="wl-hide-sm">${TYPES[i.type] || i.type}</td><td class="r wl-hide-sm num">${i.n}</td><td class="r wl-money">${fmt(i.amount, s.currency)}</td></tr>`)}`)}
          ${s.lines.corrections ? html`<tr><td colspan="2">Corrections (reversed payments)</td><td class="wl-hide-sm"></td><td class="wl-hide-sm"></td><td class="r wl-money">${fmt(s.lines.corrections, s.currency)}</td></tr>` : ''}
          <tr class="tot"><td colspan="2">Total income</td><td class="wl-hide-sm"></td><td class="wl-hide-sm"></td><td class="r wl-money">${fmt(s.lines.income + s.lines.corrections, s.currency)}</td></tr>
        </tbody></table></div>` : html`<p class="muted">No income this month.</p>`}</div>
      <div><h2 class="h3" style="margin-bottom:8px">Payouts and fees</h2>
        ${s.payouts.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Method</th><th>Status</th><th class="r">Amount</th><th class="r">Fee</th><th class="r">Sent</th></tr></thead><tbody>
          ${s.payouts.map(p => html`<tr><td>${date(p.created_at)}</td><td>${p.method === 'audio' ? 'AUDIO' : 'Bank'}</td><td>${statusBadge(p.status === 'requested' ? 'pending' : p.status)}</td>
            <td class="r wl-money">${fmt(p.amount, p.currency)}</td><td class="r wl-money">${fmt(p.fee, p.currency)}</td><td class="r wl-money">${p.status === 'failed' ? html`<span class="muted">returned</span>` : fmt(p.net, p.currency)}</td></tr>`)}
        </tbody></table></div>` : html`<p class="muted">No payouts this month.</p>`}</div>
      <p class="tiny muted">Generated ${dateTime(s.generated_at)}. Every figure comes from Song Wallet's double-entry ledger. Opening ${fmt(s.opening, s.currency)} + income ${fmt(s.lines.income + s.lines.corrections, s.currency)} − payouts ${fmt(s.lines.payouts, s.currency)} = closing ${fmt(s.closing, s.currency)}.</p>
    </div></div>`);
  on(root, 'click', '[data-act=print]', () => print());
  on(root, 'click', '[data-cur]', (e, b) => app.go(`/wallet/statements/${params.period}?cur=${b.dataset.cur}`));
}, { auth: true, title: 'Statement' });

// ---------- statement import ----------
app.route('/wallet/import', async ({ el }) => {
  const { imports } = await api('/api/wallet/imports');
  const root = mount(el, html`
  <div class="page-head"><div><a class="small" href="#/wallet">${icon('back')} Wallet</a><h1 style="margin-top:6px">Import a statement</h1>
    <p class="lede">Drop a CSV or TSV from your distributor, a DSP or a PRO. We read the columns, match each line to your songs by ISRC, then ISWC, then title and artist, and you check it before anything is posted.</p></div></div>
  <div class="split-main">
    <div class="card card-pad stack">
      <div class="wl-drop" id="drop">${icon('upload')}<div style="margin-top:8px;font-weight:600;color:var(--fg)">Drop a statement file here</div><div class="small">or click to choose · CSV, TSV, semicolon CSV · up to 20 MB</div>
        <input type="file" id="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden></div>
      <details><summary class="small" style="cursor:pointer;color:var(--accent)">Or paste the contents</summary>
        <textarea class="input mono" id="paste" rows="7" style="margin-top:10px" placeholder="Sale Month,Store,Artist,Title,ISRC,Quantity,Earnings (USD)"></textarea></details>
      <div class="form-grid">
        <label class="field"><span>Income type</span><select class="input" id="type"><option value="">Detect from the file</option>${Object.entries(TYPES).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
        <label class="field"><span>Currency <span class="hint">if the file does not say</span></span><select class="input" id="currency"><option value="">Detect (default USD)</option>${['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'SEK'].map(c => html`<option>${c}</option>`)}</select></label>
        <label class="field"><span>Whose money <span class="hint">society statements are already split</span></span><select class="input" id="scope"><option value="">Decide per line (societies = just my share)</option><option value="gross">Whole song: split by the passport</option><option value="own_share">Just my share: already split by the society</option></select></label>
        <label class="field"><span>Songs without a signed split</span><select class="input" id="hold_policy"><option value="hold">Hold for signatures (up to 90 days)</option><option value="pay_now">Pay me now, record what I owe</option></select></label>
        <label class="field full"><span>Who paid <span class="hint">used when lines have no store column</span></span><select class="input" id="source"><option value="">Detect from each line</option>${sourceOptions(null)}</select></label>
      </div>
      <div class="row end"><button class="btn btn-primary" data-act="go" disabled>${icon('scan')} Read statement</button></div>
    </div>
    <div class="stack-lg">
      <div class="card card-pad stack-sm small"><b>What we recognise</b>
        <span class="muted">ISRC, ISWC, UPC, Track/Title, Artist, Store/DSP, Territory, Quantity/Units, Net/Amount/Earnings/Royalty, Currency, Period. DistroKid, TuneCore, CD Baby, AWAL, Spotify for Artists, The MLC and most label statements work as exported.</span>
        <span class="muted">Importing the same file twice is safe: it is recognised and never posted twice.</span></div>
      <div class="card"><div class="card-head"><h2 class="h3">Past imports</h2></div>
        ${imports.length ? html`<div class="list">${imports.map(i => html`<a class="list-item" href="#/wallet/import/${i.id}">${icon('file')}<div class="grow"><div class="title">${i.filename}</div><div class="sub">${i.format} · ${i.line_count} lines · ${ago(i.created_at)}</div></div>${statusBadge(i.status === 'posted' ? 'approved' : 'pending')}</a>`)}</div>`
        : html`<div class="empty" style="padding:26px"><p class="small">Nothing imported yet.</p></div>`}</div>
    </div>
  </div>`);
  let file = null;
  const drop = root.querySelector('#drop'), go = root.querySelector('[data-act=go]');
  const ready = () => { go.disabled = !(file || root.querySelector('#paste').value.trim()); };
  const pick = f => { file = f; drop.querySelector('div').textContent = f ? `${f.name} (${Math.ceil(f.size / 1024)} KB)` : 'Drop a statement file here'; ready(); };
  drop.addEventListener('click', () => root.querySelector('#file').click());
  root.querySelector('#file').addEventListener('change', e => pick(e.target.files[0]));
  root.querySelector('#paste').addEventListener('input', ready);
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); pick(e.dataTransfer.files[0]); });
  go.addEventListener('click', () => busy(go, async () => {
    const text = file ? await file.text() : root.querySelector('#paste').value;
    const r = await api.post('/api/wallet/import', { text, filename: file?.name || 'pasted-statement.csv', type: root.querySelector('#type').value || undefined, currency: root.querySelector('#currency').value || undefined, source: root.querySelector('#source').value || undefined, scope: root.querySelector('#scope').value || undefined, hold_policy: root.querySelector('#hold_policy').value });
    if (r.duplicate) toast('You already imported this exact file, opening it');
    app.go(`/wallet/import/${r.import.id}`);
  }).catch(() => {}));
}, { auth: true, title: 'Import statement' });

app.route('/wallet/import/:id', async ({ el, params, query }) => {
  const { import: imp, songs } = await api(`/api/wallet/imports/${params.id}`);
  const filter = query.get('show') || (imp.status === 'posted' ? 'matched' : imp.lines.some(l => l.status === 'ambiguous') ? 'ambiguous' : imp.lines.some(l => l.status === 'unmatched') ? 'unmatched' : 'matched');
  const cur = imp.currency;
  const microFmt = (micro, c = cur) => money(Math.round(micro / 10000), c);
  const stat = st => { const t = imp.totals[st] || {}; const lines = Object.values(t).reduce((s, x) => s + x.lines, 0); return { lines, amount: Object.entries(t).map(([c, x]) => microFmt(x.micro, c)).join(' + ') || microFmt(0) }; };
  const suggestions = imp.lines.filter(l => l.status === 'ambiguous' && l.song_id).length;
  const previewTotal = imp.preview.reduce((s, g) => s + g.amount, 0);
  const shown = imp.lines.filter(l => l.status === filter);
  const label = { matched: 'Matched', ambiguous: 'Needs a check', unmatched: 'Unmatched', ignored: 'Ignored' };
  const songName = s => s ? `${s.title}${s.version_title ? ` (${s.version_title})` : ''} · ${s.artist_credit}` : '';
  const songSelect = l => html`<select class="input" data-line="${l.id}"><option value="">Choose a song…</option>
    ${l.candidates.length ? html`<optgroup label="Suggested">${l.candidates.map(id => imp.songs[id] ? html`<option value="${id}" ${l.song_id === id ? 'selected' : ''}>${songName(imp.songs[id])}</option>` : '')}</optgroup>` : ''}
    <optgroup label="All your songs">${songs.filter(s => !l.candidates.includes(s.id)).map(s => html`<option value="${s.id}" ${l.song_id === s.id ? 'selected' : ''}>${songName(s)}</option>`)}</optgroup></select>`;
  const posted = imp.status === 'posted';
  const root = mount(el, html`
  <div class="page-head"><div><a class="small" href="#/wallet/import">${icon('back')} Imports</a><h1 style="margin-top:6px">${imp.filename}</h1>
    <p class="lede">${imp.format} · ${imp.lines.length} lines · ${cur} · ${TYPES[imp.income_type]}</p></div>
    <div class="row wrap">${posted ? html`<span class="seal">${icon('check')} Posted ${date(imp.posted_at)}</span>` : html`
      <select class="input" id="itype" style="width:auto" title="Income type">${Object.entries(TYPES).map(([k, v]) => html`<option value="${k}" ${k === imp.income_type ? 'selected' : ''}>${v}</option>`)}</select>
      <select class="input" id="iscope" style="width:auto" title="Whose money is this?"><option value="" ${!imp.scope ? 'selected' : ''}>Per line: societies are just my share</option><option value="gross" ${imp.scope === 'gross' ? 'selected' : ''}>Whole song: split by passport</option><option value="own_share" ${imp.scope === 'own_share' ? 'selected' : ''}>Just my share</option></select>
      <select class="input" id="ihold" style="width:auto" title="Songs without a signed split"><option value="hold" ${imp.hold_policy !== 'pay_now' ? 'selected' : ''}>Unsigned songs: hold (90 days)</option><option value="pay_now" ${imp.hold_policy === 'pay_now' ? 'selected' : ''}>Unsigned songs: pay me now</option></select>
      <button class="btn btn-ghost btn-danger" data-act="discard">Discard</button>
      <button class="btn btn-primary" data-act="post" ${imp.preview.length ? '' : 'disabled'}>${icon('check')} Post ${imp.preview.length ? fmtGroups(imp.preview) : ''}</button>`}</div>
  </div>
  <div class="stack-lg">
    <div class="wl-imp-stats">${['matched', 'ambiguous', 'unmatched', 'ignored'].map(st => { const x = stat(st); return html`<button class="${st === filter ? 'on' : ''}" data-show="${st}">
      <span class="small muted">${label[st]}</span><b>${x.lines}</b><span class="small wl-money">${x.amount}</span></button>`; })}</div>
    ${posted && imp.posted_summary ? html`<div class="card"><div class="card-head"><h2 class="h3">Posted to the ledger</h2><span class="muted small">${imp.posted_summary.posted.length} payments</span></div><div class="list">
      ${imp.posted_summary.posted.map(p => html`<a class="list-item" href="#/wallet/receipt/${p.income_id}">${srcDot(p.source)}<div class="grow"><div class="title">${imp.songs[p.song_id]?.title || 'Song'}</div><div class="sub">${srcLabel(p.source)}${p.scope === 'own_share' ? ' · just my share' : p.held ? ` · ${money(p.held, p.currency)} held for signatures` : p.owed ? ` · paid to you now, ${money(p.owed, p.currency)} owed to the split` : ' · split the same day'}</div></div><b class="wl-money">${money(p.amount, p.currency)}</b></a>`)}
      ${imp.posted_summary.skipped.map(p => html`<div class="list-item"><span class="avatar sm" style="background:var(--faint)">${icon('x')}</span><div class="grow"><div class="title">${imp.songs[p.song_id]?.title || 'Song'} · ${p.source}</div><div class="sub">${p.reason}</div></div><span class="wl-money muted">${money(p.amount, p.currency)}</span></div>`)}
    </div></div>` : ''}
    ${!posted && filter === 'ambiguous' && suggestions ? html`<div class="callout info">${icon('sparkle')}<div class="grow" style="flex:1">We have a likely song for ${suggestions} line${suggestions === 1 ? '' : 's'} (title match, or one code used by several of your songs). Check them, or accept all suggestions.</div><button class="btn btn-sm" data-act="accept">Accept ${suggestions}</button></div>` : ''}
    ${!posted && filter === 'unmatched' && shown.length ? html`<div class="callout warn">${icon('info')}<div>These lines did not match any song you manage. Pick the song, ignore the line, or add the song's ISRC to its passport and import again.</div></div>` : ''}
    <div class="card">
      ${shown.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th class="wl-hide-sm">Line</th><th>Track</th><th class="wl-hide-sm">Codes</th><th class="wl-hide-sm">Store</th><th class="r">Amount</th><th>${filter === 'matched' ? 'Song' : 'Match to'}</th>${posted ? '' : html`<th><span class="sr-only">Actions</span></th>`}</tr></thead><tbody>
        ${shown.slice(0, 500).map(l => html`<tr class="wl-imp-row"><td class="muted num wl-hide-sm">${l.line_no}</td>
          <td><div style="font-weight:600">${l.title || html`<span class="muted">No title</span>`}</div><div class="small muted">${l.artist || ''}${l.territory ? ` · ${l.territory}` : ''}${l.period ? ` · ${l.period}` : ''}${l.quantity != null ? ` · ${l.quantity.toLocaleString()} units` : ''}</div></td>
          <td class="wl-hide-sm mono small">${l.isrc || ''}${l.iswc ? html`<div>${l.iswc}</div>` : ''}</td>
          <td class="wl-hide-sm"><span class="small">${l.store || ''}</span> <span class="badge plain">${l.source}</span></td>
          <td class="r wl-money">${microFmt(l.amount_micro, l.currency)}</td>
          <td>${filter === 'matched' ? html`<a href="#/song/${l.song_id}?tab=wallet">${imp.songs[l.song_id]?.title || 'Song'}</a> <span class="badge ${l.method === 'ISRC' || l.method === 'ISWC' ? 'ok' : 'info'} plain">${l.method}</span>`
            : posted || filter === 'ignored' ? html`<span class="muted small">${filter === 'ignored' ? 'Ignored' : 'Not posted'}</span>` : songSelect(l)}</td>
          ${posted ? '' : html`<td>${filter === 'ignored' ? html`<button class="btn btn-ghost btn-sm" data-unignore="${l.id}">Restore</button>` : filter === 'matched' ? html`<button class="btn btn-ghost btn-sm btn-icon" data-unmatch="${l.id}" title="Unmatch">${icon('x')}</button>` : html`<button class="btn btn-ghost btn-sm" data-ignore="${l.id}">Ignore</button>`}</td>`}</tr>`)}
      </tbody></table></div>${shown.length > 500 ? html`<p class="small muted" style="padding:12px 22px">Showing the first 500 of ${shown.length} lines.</p>` : ''}`
      : html`<div class="empty" style="padding:34px"><div class="icon">${icon('check')}</div><h2 class="h3">Nothing here</h2><p>${filter === 'matched' ? 'No lines matched yet.' : 'All clear.'}</p></div>`}
    </div>
    ${!posted && imp.preview.length ? html`<div class="card"><div class="card-head"><h2 class="h3">What posting will do</h2><span class="muted small">One payment per song and source, split the same day</span></div><div class="list">
      ${imp.preview.map(g => html`<div class="list-item">${srcDot(g.source)}<div class="grow"><div class="title">${imp.songs[g.song_id]?.title || 'Song'}</div><div class="sub">${srcLabel(g.source)} · ${g.lines} line${g.lines === 1 ? '' : 's'}${g.amount <= 0 ? ' · skipped (zero or negative)' : ''}</div></div><span class="badge ${g.scope === 'own_share' ? 'info' : 'accent'} plain" title="${g.scope === 'own_share' ? 'Already split by the society: all yours' : 'Split by the signed passport'}">${SCOPE_LABEL[g.scope]}</span><b class="wl-money">${money(g.amount, g.currency)}</b></div>`)}
    </div></div>` : ''}
  </div>`);
  const patch = async body => { await api.patch(`/api/wallet/imports/${imp.id}`, body); app.refresh(); };
  on(root, 'click', '[data-show]', (e, b) => app.go(`/wallet/import/${imp.id}?show=${b.dataset.show}`));
  root.addEventListener('change', e => {
    const s = e.target.closest('select[data-line]');
    if (s && s.value) patch({ lines: [{ id: s.dataset.line, song_id: s.value }] }).then(() => toast('Matched')).catch(err => toast(err.message, { error: true }));
    if (e.target.id === 'itype') patch({ type: e.target.value }).catch(err => toast(err.message, { error: true }));
    if (e.target.id === 'iscope') patch({ scope: e.target.value || null }).catch(err => toast(err.message, { error: true }));
    if (e.target.id === 'ihold') patch({ hold_policy: e.target.value }).catch(err => toast(err.message, { error: true }));
  });
  on(root, 'click', '[data-ignore]', (e, b) => patch({ lines: [{ id: b.dataset.ignore, ignore: true }] }));
  on(root, 'click', '[data-unignore]', (e, b) => patch({ lines: [{ id: b.dataset.unignore, song_id: null }] }));
  on(root, 'click', '[data-unmatch]', (e, b) => patch({ lines: [{ id: b.dataset.unmatch, song_id: null }] }));
  on(root, 'click', '[data-act=accept]', (e, b) => busy(b, () => patch({ accept_suggestions: true })).then(() => toast('Suggestions accepted')).catch(() => {}));
  on(root, 'click', '[data-act=discard]', async () => {
    if (!await confirmDialog('Discard this import?', 'Nothing has been posted from it. You can import the file again later.', 'Discard', true)) return;
    await api.del(`/api/wallet/imports/${imp.id}`); app.go('/wallet/import');
  });
  on(root, 'click', '[data-act=post]', async (e, b) => {
    const open = imp.lines.filter(l => l.status === 'ambiguous' || l.status === 'unmatched').length;
    if (!await confirmDialog(`Post ${fmtGroups(imp.preview)}?`, `${imp.preview.length} payment${imp.preview.length === 1 ? '' : 's'} will be added to the ledger and split by each song's signed passport today. Songs without a signed split hold the money until everyone signs.${open ? ` ${open} line${open === 1 ? '' : 's'} that are not matched will not be posted.` : ''}`, 'Post to ledger')) return;
    const r = await busy(b, () => api.post(`/api/wallet/imports/${imp.id}/post`)).catch(() => null);
    if (r) { toast(`Posted ${r.posted.length} payment${r.posted.length === 1 ? '' : 's'}`); app.go(`/wallet/import/${imp.id}?show=matched`); }
  });
}, { auth: true, title: 'Statement review' });

function fmtGroups(groups) {
  const t = {};
  for (const g of groups) if (g.amount > 0) t[g.currency] = (t[g.currency] || 0) + g.amount;
  return Object.entries(t).map(([c, v]) => money(v, c)).join(' + ');
}

// ---------- song tab ----------
app.songTab({
  id: 'wallet', label: 'Wallet', order: 30,
  show: (song, { canManage, isContributor }) => song.status !== 'draft' && (canManage || isContributor),
  render: async ({ el, song, canManage }) => {
    const w = await api(`/api/songs/${song.id}/wallet`);
    const t = w.totals[0];
    const cur = t?.currency || 'USD';
    const heldTotal = w.holds.filter(h => h.currency === cur).reduce((s, h) => s + h.amount, 0);
    const audiusSim = true;
    const root = mount(el, html`<div class="stack-lg">
      ${heldTotal ? html`<div class="wl-held"><span class="wl-ico">${icon('clock')}</span>
        <div style="flex:1;min-width:200px"><div class="wl-held-amt">${fmt(heldTotal, cur)} waiting for signatures</div><div class="small muted">${w.holdReason}. It is released to everyone the moment the split is fully signed${w.holdExpires ? `; if it is still unsigned on ${date(w.holdExpires)}, it goes back to whoever paid it in` : ''}.</div></div>
        ${canManage ? html`<a class="btn" href="#/song/${song.id}?tab=splits">${icon('sign')} Open the split</a>` : ''}</div>` : ''}
      <div class="grid grid-3">
        <div class="card stat"><div class="label">${icon('coins')} Lifetime income</div><div class="value money">${fmt(t?.lifetime || 0, cur)}</div><div class="sub">${w.incomes.filter(i => i.status !== 'reversed').length} payments</div></div>
        <div class="card stat"><div class="label">${icon('clock')} Held</div><div class="value" style="${heldTotal ? 'color:var(--warn)' : ''}">${fmt(heldTotal, cur)}</div><div class="sub">${heldTotal ? 'Waiting for signatures' : 'Nothing waiting'}</div></div>
        <div class="card stat"><div class="label">${icon('users')} Split</div><div class="value" style="font-size:20px">${w.split ? `Version ${w.split.version || 1}` : 'Not signed'}</div><div class="sub">${w.split ? `${w.split.lines.length} payee${w.split.lines.length === 1 ? '' : 's'} · paid the same day` : 'Income is held until it is'}</div></div>
      </div>
      ${w.totals.length > 1 ? html`<div class="callout">${icon('globe')}<div>Also earned: ${w.totals.slice(1).map(x => fmt(x.lifetime, x.currency)).join(', ')}. Currencies are kept separate; nothing is converted.</div></div>` : ''}
      <div class="split-main">
        <div class="card"><div class="card-head"><h2 class="h3">Payments and how each was split</h2>${canManage ? html`<div class="row"><button class="btn btn-sm btn-primary" data-act="add">${icon('plus')} Add income</button></div>` : ''}</div>
          ${w.incomes.length ? html`<div>${w.incomes.map((i, k) => html`<details class="wl-pay ${k >= 8 ? 'hidden wl-more' : ''}" ${k === 0 ? 'open' : ''}>
            <summary>${srcDot(i.source)}<div style="flex:1;min-width:0"><div style="font-weight:600">${i.source} <span class="muted" style="font-weight:500">· ${TYPES[i.type] || i.type}</span></div>
              <div class="small muted">${date(i.created_at)}${i.period_start ? ` · for ${date(i.period_start)} to ${date(i.period_end)}` : ''}${i.origin === 'split' ? ' · share from another song' : i.origin === 'import' ? ' · statement' : ''}</div></div>
              ${i.simulated ? simBadge() : ''}${i.scope === 'own_share' ? html`<span class="badge info plain">Just my share</span>` : ''}${i.status === 'held' ? statusBadge('held') : i.status === 'partial' ? html`<span class="badge warn">Part held</span>` : i.status === 'reversed' ? statusBadge('voided') : i.status === 'returned' ? html`<span class="badge plain">Returned</span>` : ''}
              <b class="wl-money" style="${i.status === 'reversed' ? 'text-decoration:line-through;color:var(--muted)' : ''}">${fmt(i.amount, i.currency)}</b></summary>
            <div class="body">${allocRows(i)}<div class="row" style="margin-top:8px"><a class="small" href="#/wallet/receipt/${i.id}">${icon('receipt')} Receipt</a>${i.note ? html`<span class="small muted">· ${i.note}</span>` : ''}</div></div>
          </details>`)}${w.incomes.length > 8 ? html`<div style="padding:12px 22px"><button class="btn btn-sm btn-ghost" data-act="more">Show all ${w.incomes.length} payments</button></div>` : ''}</div>`
          : html`<div class="empty"><div class="icon">${icon('wallet')}</div><h2 class="h3">No income yet</h2><p>${canManage ? 'Add a payment by hand, import a statement, or pull Audius tips. It is split by the signed passport the same day.' : 'Payments for this song show up here with exactly how they were split.'}</p>
            ${canManage ? html`<div class="row" style="justify-content:center;margin-top:14px"><button class="btn btn-primary" data-act="add">${icon('plus')} Add income</button><a class="btn" href="#/wallet/import">${icon('upload')} Import statement</a></div>` : ''}</div>`}
        </div>
        <div class="stack-lg">
          ${w.owed?.length ? html`<div class="card"><div class="card-head"><h2 class="h3">Owed to the split</h2><span class="muted small">Paid early</span></div><div class="list">
            ${w.owed.map(o => html`<div class="list-item"><div class="grow"><div class="title wl-money">${fmt(o.amount, o.currency)}</div><div class="sub" style="white-space:normal">${o.reason}</div>
              ${o.breakdown?.length ? html`<div class="tiny muted" style="margin-top:4px">${o.breakdown.map(b => `${b.name} ${money(b.amount, o.currency)}`).join(' · ')}</div>` : ''}</div>${statusBadge(o.status === 'due' ? 'open' : 'pending')}</div>`)}
          </div></div>` : ''}
          <div class="card"><div class="card-head"><h2 class="h3">By source</h2></div><div class="card-body">${sourceBars(t?.bySource, cur)}</div></div>
          ${canManage ? html`<div class="card"><div class="card-head"><h2 class="h3">Bring money in</h2></div><div class="list">
            <a class="list-item" href="#/wallet/import">${icon('upload')}<div class="grow"><div class="title">Import a statement</div><div class="sub">Distributor, DSP or PRO CSV</div></div>${icon('arrow')}</a>
            <button class="list-item" style="background:none;border:0;border-bottom:1px solid var(--line);width:100%;text-align:left;cursor:pointer;font:inherit" data-act="audius">${icon('audius')}<div class="grow"><div class="title">Pull Audius tips</div><div class="sub">This month's tips for this track</div></div>${audiusSim ? simBadge() : ''}</button>
            <button class="list-item" style="background:none;border:0;width:100%;text-align:left;cursor:pointer;font:inherit" data-act="add">${icon('plus')}<div class="grow"><div class="title">Add by hand</div><div class="sub">Sync fee, tips, any one-off payment</div></div></button>
          </div></div>` : ''}
          <div class="card"><div class="card-head"><h2 class="h3">Ledger</h2><span class="muted small">Immutable</span></div>
            ${w.txns.length ? html`<div class="list">${w.txns.slice(0, 12).map(x => html`<div class="list-item" style="padding:11px 22px"><div class="grow"><div class="title" style="font-weight:500;font-size:13px;white-space:normal">${x.memo}</div><div class="sub">${dateTime(x.created_at)} · <span class="mono">${x.hash.slice(0, 10)}</span></div></div><span class="wl-money small">${fmt(x.total, x.currency)}</span></div>`)}</div>`
            : html`<div class="empty" style="padding:24px"><p class="small">Every posting, release and correction is recorded here.</p></div>`}
          </div>
        </div>
      </div>
    </div>`);
    on(root, 'click', '[data-act=add]', () => addIncome(song, w));
    on(root, 'click', '[data-act=more]', (e, b) => { root.querySelectorAll('.wl-more').forEach(x => x.classList.remove('hidden')); b.remove(); });
    on(root, 'click', '[data-act=audius]', async (e, b) => {
      const r = await busy(b, () => api.post(`/api/songs/${song.id}/income/audius`, { period: new Date().toISOString().slice(0, 7) })).catch(() => null);
      if (!r) return;
      toast(r.already ? 'Audius tips for this month are already in' : r.results.some(x => x.amount) ? `Added Audius tips${r.simulated ? ' (simulated)' : ''}` : 'No new Audius tips');
      app.refresh();
    });
  }
});

const scopeField = (name, sel) => html`<div class="field full"><span>Whose money is this?</span>
  <div class="wl-method">
    <label><input type="radio" name="${name}" value="gross" ${sel === 'gross' ? 'checked' : ''}><span class="t">${icon('users')} Whole song</span><span class="s">Money for the whole song (a distributor, a DSP, a sync fee). Split by the signed passport.</span></label>
    <label><input type="radio" name="${name}" value="own_share" ${sel === 'own_share' ? 'checked' : ''}><span class="t">${icon('user')} Just my share</span><span class="s">Already split by a society (ASCAP, BMI, The MLC...). It is all yours; never re-split to co-writers.</span></label>
  </div></div>`;
const holdField = (maxDays = 90) => html`<div class="field full"><span>No fully signed split yet. What should happen to the money?</span>
  <div class="wl-method">
    <label><input type="radio" name="hold_policy" value="hold" checked><span class="t">${icon('clock')} Hold for signatures</span><span class="s">Kept in the song's wallet and paid out the moment everyone signs. If nobody signs within <input class="input mono" name="hold_days" value="${maxDays}" style="width:56px;padding:2px 6px;display:inline-block" inputmode="numeric"> days (max ${maxDays}), it comes back to you.</span></label>
    <label><input type="radio" name="hold_policy" value="pay_now"><span class="t">${icon('coins')} Pay me now</span><span class="s">Paid to you today, and we record what you owe each contributor once the split is signed.</span></label>
  </div></div>`;

function addIncome(song, w) {
  const today = new Date().toISOString().slice(0, 10);
  modal({
    title: `Add income to "${song.title}"`,
    wide: true,
    body: html`<form class="form-grid" id="inf">
      <label class="field"><span>Amount</span><input class="input mono" name="amount" inputmode="decimal" placeholder="0.00" required style="font-size:18px;font-weight:600"></label>
      <label class="field"><span>Currency</span><select class="input" name="currency">${CURRENCIES.map(c => html`<option>${c}</option>`)}</select></label>
      <label class="field"><span>From</span><select class="input" name="source">${sourceOptions('Spotify')}</select></label>
      <label class="field"><span>Type</span><select class="input" name="type">${Object.entries(TYPES).map(([k, v]) => html`<option value="${k}">${v}</option>`)}</select></label>
      ${scopeField('scope', 'gross')}
      ${w.split ? '' : holdField(w.holdMaxDays || 90)}
      <label class="field"><span>Period start <span class="hint">optional</span></span><input class="input" type="date" name="period_start"></label>
      <label class="field"><span>Period end <span class="hint">optional</span></span><input class="input" type="date" name="period_end" max="${today}"></label>
      <label class="field full"><span>Note <span class="hint">optional</span></span><input class="input" name="note" placeholder="e.g. Sync fee, Netflix trailer"></label>
      <div class="full small muted" id="inf-preview"></div>
    </form>`,
    actions: [{ label: 'Cancel' }, { label: 'Add income', primary: true, onClick: async (close, m) => {
      const f = formData(m.querySelector('#inf'));
      if (f.hold_policy !== 'hold') delete f.hold_days;
      const r = await api.post(`/api/songs/${song.id}/income`, f);
      close();
      showReceipt(r.receipt);
      app.refresh();
    } }],
    onOpen: m => {
      const form = m.querySelector('#inf'), box = m.querySelector('#inf-preview');
      let touchedScope = false;
      form.addEventListener('change', e => {
        if (e.target.name === 'scope') touchedScope = true;
        if (e.target.name === 'source' && !touchedScope) form.querySelector(`input[name=scope][value=${SOCIETY.includes(e.target.value) ? 'own_share' : 'gross'}]`).checked = true;
      });
      const upd = () => {
        const f = formData(form);
        if (f.scope === 'own_share') { box.innerHTML = html`<div class="callout">${icon('user')}<div>All of it goes to you. Societies pay each writer or performer their own share, so co-writers are paid by the society directly.</div></div>`.s; return; }
        if (!w.split) { box.innerHTML = ''; return; }
        const key = f.type === 'publishing' ? 'publishing_bps' : 'master_bps';
        const lines = w.split.lines.filter(l => l[key]);
        if (!lines.length) { box.innerHTML = html`<div class="callout warn">${icon('alert')}<div>The signed split has no ${key === 'publishing_bps' ? 'publishing' : 'master income'} shares, so this would be held until a split with them is signed.</div></div>`.s; return; }
        const n = Math.round(parseFloat(String(f.amount).replace(/,/g, '')) * 100);
        const total = lines.reduce((s, l) => s + l[key], 0) || 1;
        box.innerHTML = html`<div class="small muted" style="margin-bottom:6px">Split the same day by the signed passport (${key === 'publishing_bps' ? 'publishing' : 'master income'} shares):</div><div class="wl-quote">${lines.map(l => html`<span>${l.name} <span class="muted small">${pct(l[key])}</span></span><span class="wl-money">${n > 0 ? '≈ ' + money(Math.floor(n * l[key] / total), f.currency) : ''}</span>`)}</div>`.s;
      };
      form.addEventListener('input', upd); form.addEventListener('change', upd); upd();
    }
  });
}

function showReceipt(rc) {
  const inc = rc.income;
  modal({
    title: 'Receipt',
    body: html`<div class="stack">
      <div style="text-align:center"><div class="eyebrow">${inc.source} · ${TYPES[inc.type] || inc.type}</div><div style="font:700 40px var(--display);letter-spacing:-0.04em;margin:6px 0" class="num">${fmt(inc.amount, inc.currency)}</div>
        ${inc.status === 'split' ? html`<span class="seal">${icon('check')} Split the same day</span>` : html`<span class="badge warn">Held for signatures</span>`}</div>
      ${rc.family.map((f, i) => html`${i ? html`<div class="small muted" style="margin-top:6px">Then split again by <b>${f.title}</b></div>` : ''}${allocRows(f)}`)}
    </div>`,
    actions: [{ label: 'Full receipt', onClick: () => { app.go(`/wallet/receipt/${inc.id}`); } }, { label: 'Done', primary: true }]
  });
}

// ---------- admin: unclaimed property ----------
app.route('/wallet/admin/unclaimed', async ({ el }) => {
  const { items, reportable } = await api('/api/wallet/admin/unclaimed');
  const label = { holding: ['', 'Holding'], due_diligence_sent: ['warn', 'Notice sent'], reportable: ['crit', 'Due for state report'], reported: ['ok', 'Reported'] };
  const root = mount(el, html`
  <div class="page-head"><div><span class="eyebrow">Admin</span><h1>Unclaimed property</h1>
    <p class="lede">Shares held for known payees who have not claimed them. Reminders go out at days 7, 30 and 60, a due-diligence notice before the dormancy date (3 years unless a state rule is configured), then the item is reported to the state.</p></div>
    <span class="badge ${reportable.length ? 'crit' : 'ok'}">${reportable.length} due for reporting</span></div>
  <div class="card">${items.length ? html`<div class="table-wrap"><table class="table"><thead><tr><th>Payee</th><th>Songs</th><th class="r">Amount</th><th>First credit</th><th>Dormant on</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>
    ${items.map(i => html`<tr><td><b>${i.owner_name || 'Unknown'}</b><div class="small muted">${i.owner_email || 'No email'}${i.owner_state ? ` · ${i.owner_state}` : ''}</div></td>
      <td class="small">${i.songs}</td><td class="r wl-money">${money(i.balance, i.currency)}</td><td class="small">${date(i.first_credit)}</td><td class="small">${i.dormancy_date}</td>
      <td><span class="badge ${label[i.status][0]}">${label[i.status][1]}</span>${i.escheat_ref ? html`<div class="tiny muted">${i.escheat_ref}</div>` : ''}</td>
      <td>${i.status !== 'reported' ? html`<button class="btn btn-sm" data-report="${i.account_id}" data-state="${i.owner_state || ''}">Record report</button>` : ''}</td></tr>`)}
  </tbody></table></div>` : html`<div class="empty"><div class="icon">${icon('check')}</div><h2 class="h3">Nothing unclaimed</h2><p>Every share has been claimed by its payee.</p></div>`}</div>`);
  on(root, 'click', '[data-report]', async (e, b) => {
    const ok = await modal({ title: 'Record a state report', body: html`<p class="muted">Moves the balance to the state's unclaimed property payable account. Do this once the item is included in the state filing.</p>
      <div class="form-grid" style="margin-top:12px"><label class="field"><span>State</span><input class="input mono" id="rp-state" maxlength="2" value="${b.dataset.state}"></label><label class="field"><span>Report reference</span><input class="input" id="rp-ref"></label></div>`,
      actions: [{ label: 'Cancel' }, { label: 'Record', primary: true, onClick: async (close, m) => { await api.post(`/api/wallet/admin/unclaimed/${b.dataset.report}/report`, { state: m.querySelector('#rp-state').value, ref: m.querySelector('#rp-ref').value }); return true; } }] });
    if (ok) { toast('Recorded'); app.refresh(); }
  });
}, { auth: true, title: 'Unclaimed property' });
