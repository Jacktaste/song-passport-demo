// Gap checker views: the song "Health" tab and the "Money check" page across all my songs.
import { app, html, api, icon, money } from '../app.js';

app.nav({ id: 'gaps', label: 'Money check', href: '/gaps', icon: 'scan', section: 'Passport', order: 4, auth: true , artist: true });

if (!document.getElementById('gp-style')) {
  const st = document.createElement('style');
  st.id = 'gp-style';
  st.textContent = `
  .gp-scope svg { width: 18px; height: 18px; flex: none; }
  .gp-scope .empty .icon svg { width: 24px; height: 24px; }
  .gp-teaser-ic { width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center; background: var(--grad-soft); color: var(--accent); flex: none; }
  .gp-scope .gp-teaser-ic svg { width: 38px; height: 38px; }
  .gp-top { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 28px; align-items: center; padding: 26px; }
  .gp-ring { position: relative; width: 132px; height: 132px; flex: none; }
  .gp-scope .gp-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .gp-ring .v { position: absolute; inset: 0; display: grid; place-items: center; text-align: center; }
  .gp-ring .v b { font: 800 34px/1 var(--display); letter-spacing: -0.04em; display: block; }
  .gp-ring .v span { font-size: 11px; color: var(--muted); font-weight: 600; letter-spacing: .08em; text-transform: uppercase; }
  .gp-ring.sm { width: 46px; height: 46px; }
  .gp-ring.sm .v b { font-size: 14px; letter-spacing: -0.02em; }
  .gp-money { font: 800 clamp(1.8rem, 1.3rem + 1.8vw, 2.6rem)/1.05 var(--display); letter-spacing: -0.035em; font-variant-numeric: tabular-nums; }
  .gp-sev { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
  .gp-fixes { display: grid; gap: 12px; }
  .gp-fix { display: grid; grid-template-columns: 6px minmax(0,1fr) auto; gap: 0 18px; padding: 0; overflow: hidden; }
  .gp-fix .rail { background: var(--line-strong); }
  .gp-fix.critical .rail { background: var(--crit); } .gp-fix.high .rail { background: var(--warn); } .gp-fix.medium .rail { background: var(--info); }
  .gp-fix .body { padding: 18px 0; min-width: 0; }
  .gp-fix .act { padding: 18px 20px 18px 0; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; justify-content: center; }
  .gp-fix .why { color: var(--fg-2); margin-top: 6px; font-size: 14px; }
  .gp-fix .how { margin-top: 8px; font-size: 13px; color: var(--muted); display: flex; gap: 6px; }
  .gp-fix .how svg { width: 15px; height: 15px; flex: none; margin-top: 2px; color: var(--accent); }
  .gp-amt { font: 700 15px var(--mono); color: var(--crit); white-space: nowrap; }
  .gp-amt.soft { color: var(--muted); font-weight: 500; font-size: 13px; }
  .gp-row { display: grid; grid-template-columns: 46px minmax(0,1fr) 150px 120px; gap: 16px; align-items: center; padding: 14px 22px; border-bottom: 1px solid var(--line); color: inherit; }
  .gp-row:last-child { border-bottom: 0; }
  a.gp-row:hover { background: var(--surface-2); text-decoration: none; }
  .gp-row .t { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gp-row .s { font-size: 12.5px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .gp-chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .gp-hero-money { color: #fff; }
  @media (max-width: 720px) {
    .gp-top { grid-template-columns: 1fr; justify-items: start; padding: 20px; gap: 18px; }
    .gp-fix { grid-template-columns: 5px minmax(0,1fr); }
    .gp-fix .act { grid-column: 2; padding: 0 16px 16px 0; align-items: flex-start; flex-direction: row; flex-wrap: wrap; }
    .gp-fix .body { padding-right: 16px; }
    .gp-row { grid-template-columns: 46px minmax(0,1fr) auto; padding: 12px 16px; }
    .gp-row .top-gap { display: none; }
  }`;
  document.head.appendChild(st);
}

const SEV_LABEL = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
const SEV_CLASS = { critical: 'crit', high: 'warn', medium: 'info', low: '' };
const scoreColor = s => s >= 80 ? 'var(--ok)' : s >= 50 ? 'var(--warn)' : 'var(--crit)';
const CODE_LABEL = {
  DRAFT_UNCLAIMED: 'Unclaimed', ISRC_MISSING: 'No ISRC', ISRC_INVALID: 'Broken ISRC', ISRC_DUPLICATE: 'ISRC used twice', PASSPORT_DUPLICATE: 'Duplicate passport',
  ISWC_MISSING: 'No ISWC', ISWC_INVALID: 'Broken ISWC', SPLIT_UNSIGNED: 'No signed split', SPLIT_PENDING: 'Split awaiting signatures', NO_WRITERS: 'No writers',
  WRITER_NO_PRO: 'Writer without PRO', WRITER_NO_IPI: 'Writer without IPI', WRITER_IPI_INVALID: 'Wrong IPI', CONTRIBUTOR_NO_EMAIL: 'Contributor without email',
  REG_PRO: 'PRO registration', REG_MLC: 'MLC registration', REG_SOUNDEXCHANGE: 'SoundExchange', REG_INTERNATIONAL: 'International rights', RELEASE_DATE_MISSING: 'No release date', DURATION_MISSING: 'No duration', ISRC_WARNING: 'Odd ISRC'
};

export function scoreRing(score, { size = '', label = 'Health' } = {}) {
  const r = 52, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, score)) / 100;
  return html`<div class="gp-ring ${size}" role="img" aria-label="${label} score ${score} out of 100"><svg viewBox="0 0 120 120">
    <circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="${size ? 12 : 10}"/>
    ${p > 0 ? html`<circle cx="60" cy="60" r="${r}" fill="none" stroke="${scoreColor(score)}" stroke-width="${size ? 12 : 10}" stroke-linecap="round" stroke-dasharray="${c * p} ${c}"/>` : ''}</svg>
    <div class="v"><div><b>${score}</b>${size ? '' : html`<span>${label}</span>`}</div></div></div>`;
}

const fixCard = g => html`<div class="card gp-fix ${g.severity}">
  <div class="rail"></div>
  <div class="body">
    <div class="row wrap" style="gap:8px"><span class="badge ${SEV_CLASS[g.severity]}">${SEV_LABEL[g.severity]}</span><h2 class="h3">${g.title}</h2></div>
    <p class="why">${g.why}</p>
    <div class="how">${icon('sparkle')}<span>${g.fix}</span></div>
  </div>
  <div class="act">
    ${g.moneyMinor ? html`<span class="gp-amt" title="${g.basis === 'statements' ? 'Worked out from your statements' : 'Estimated a year'}">about ${money(g.moneyMinor)}<span class="tiny muted" style="font-family:var(--sans);font-weight:500"> /yr</span></span>`
      : g.check ? html`<span class="badge info plain" title="We can't put a number on this until it's checked">To check</span>` : ''}
    ${g.action ? html`<a class="btn btn-sm ${g.severity === 'critical' ? 'btn-primary' : ''}" href="#${g.action.href}">${g.action.label} ${icon('arrow')}</a>` : ''}
  </div></div>`;

const assumptionsBlock = a => html`<details class="card card-pad small" style="margin-top:4px"><summary style="cursor:pointer;font-weight:600">How these estimates work</summary>
  <div class="stack-sm muted" style="margin-top:10px">${a.lines.map(l => html`<div>${l}</div>`)}</div></details>`;

// ---------- Health tab ----------
app.songTab({
  id: 'health', label: 'Health', order: 5,
  show: (song, { canManage, isContributor }) => song.status === 'draft' || canManage || isContributor,
  render: async ({ el, song }) => {
    const g = await api(`/api/songs/${song.id}/gaps`);
    if (g.teaser) {
      el.innerHTML = html`<div class="gp-scope"><div class="card gp-top">
        <div class="gp-teaser-ic">${icon('scan')}</div>
        <div class="stack-sm">
          <div class="eyebrow">Public health check</div>
          <div class="gp-money" style="font-size:clamp(1.4rem,1.1rem + 1.2vw,2rem)">${g.missingMoney ? 'This song looks like it is missing money.' : g.issueCount ? `${g.issueCount} thing${g.issueCount === 1 ? '' : 's'} to check on this song.` : 'The basics look fine.'}</div>
          <p class="muted">${g.issueCount ? `We found ${g.issueCount} thing${g.issueCount === 1 ? '' : 's'} to check. ` : ''}The details, and what they're worth, are only shown to the verified owner.</p>
          <div class="row wrap" style="margin-top:6px"><a class="btn btn-primary" href="#/claim/song/${song.id}">${icon('flag')} Claim this song</a>
            ${song.artist_id ? html`<a class="btn" href="#/artist/${song.artist_id}">Claim the whole artist</a>` : ''}</div>
        </div></div></div>`.s;
      return;
    }
    const fixable = g.gaps.length;
    el.innerHTML = html`<div class="gp-scope"><div class="stack-lg">
      <div class="card gp-top">
        ${scoreRing(g.score)}
        <div class="stack-sm">
          <div class="eyebrow">${g.publicView ? 'Public health check' : 'Passport health'}</div>
          ${g.atRiskMinor ? html`<div class="gp-money" style="color:var(--crit)">About ${money(g.atRiskMinor)}<span class="muted" style="font-size:.45em;font-weight:600;letter-spacing:0"> a year may be waiting for you</span></div>`
            : html`<div class="gp-money">${g.toCheck ? `${g.toCheck} thing${g.toCheck === 1 ? '' : 's'} to check` : fixable ? 'Nothing confirmed missing' : 'All clear'}</div>`}
          <p class="muted">${g.atRiskMinor && g.plays ? 'Worked out from your statements. ' : ''}${g.atRiskMinor && g.toCheck ? `Plus ${g.toCheck} thing${g.toCheck === 1 ? '' : 's'} to check. ` : ''}${fixable ? `${fixable} thing${fixable === 1 ? '' : 's'} to fix, worst first.` : 'Every code, split and registration we check is in place.'}</p>
          <div class="gp-sev">${['critical', 'high', 'medium', 'low'].filter(s => g.counts[s]).map(s => html`<span class="badge ${SEV_CLASS[s]}">${g.counts[s]} ${SEV_LABEL[s].toLowerCase()}</span>`)}</div>
        </div>
      </div>
      ${song.status === 'draft' ? html`<div class="callout info">${icon('info')}<div><b>Unclaimed draft.</b> Only codes and details are checked until someone claims it.</div></div>` : ''}
      ${g.hidden ? html`<div class="callout warn">${icon('key')}<div><b>${g.hidden} registration and writer check${g.hidden === 1 ? ' is' : 's are'} hidden</b> until ownership of this song is verified.${g.ownership?.claimId ? html` <a href="#/claims/${g.ownership.claimId}">Finish verifying</a>` : ''}</div></div>` : ''}
      ${fixable ? html`<div class="gp-fixes">${g.gaps.map(fixCard)}</div>`
        : html`<div class="card"><div class="empty"><div class="icon">${icon('shield')}</div><h2 class="h3">Nothing missing</h2><p>We'll flag anything new here, like a split that needs signing or a registration that lapses.</p></div></div>`}
      ${assumptionsBlock(g.assumptions)}
    </div></div>`.s;
  }
});

// ---------- Money check page ----------
app.route('/gaps', async ({ el }) => {
  const r = await api('/api/my/gaps');
  const t = r.totals;
  if (!r.songs.length) {
    el.innerHTML = html`<div class="gp-scope"><div class="page-head"><div><h1>Money check</h1><p class="lede">Find the gaps that stop your songs getting paid.</p></div></div>
      <div class="card"><div class="empty"><div class="icon">${icon('scan')}</div><h2 class="h3">No songs to check yet</h2><p>Claim your songs or start a passport, and we'll check every code, split and registration.</p>
      <div class="row" style="justify-content:center;margin-top:16px"><a class="btn btn-primary" href="#/search">${icon('search')} Find my songs</a><a class="btn" href="#/songs/new">New passport</a></div></div></div></div>`.s;
    return;
  }
  el.innerHTML = html`<div class="gp-scope">
  <div class="page-head"><div><h1>Money check</h1><p class="lede">Worst first. Fix the top of the list and you collect more.</p></div></div>
  <div class="card hero" style="padding:30px;margin-bottom:18px">
    <div class="row wrap" style="gap:34px;position:relative;z-index:1;align-items:flex-end">
      <div>${t.atRiskMinor ? html`<div class="eyebrow" style="color:rgba(255,255,255,.75)">May be waiting for you</div>
        <div class="gp-money gp-hero-money" style="font-size:clamp(2.2rem,1.5rem + 2.6vw,3.4rem);margin-top:8px">About ${money(t.atRiskMinor)}<span style="font-size:.38em;font-weight:600;opacity:.8;letter-spacing:0"> a year</span></div>
        <div class="muted" style="margin-top:6px">Worked out from your statements.${t.toCheck ? ` Plus ${t.toCheck} thing${t.toCheck === 1 ? '' : 's'} to check.` : ''}</div>`
        : html`<div class="eyebrow" style="color:rgba(255,255,255,.75)">Money check</div>
        <div class="gp-money gp-hero-money" style="font-size:clamp(2.2rem,1.5rem + 2.6vw,3.4rem);margin-top:8px">${t.toCheck ? `${t.toCheck} thing${t.toCheck === 1 ? '' : 's'} to check` : 'All clear'}</div>
        <div class="muted" style="margin-top:6px">We show a dollar figure once your statements and a check confirm it.</div>`}</div>
      <div class="spacer"></div>
      <div class="row wrap" style="gap:30px">
        <div><div style="font:800 28px var(--display)">${t.songsWithGaps}</div><div class="muted small">songs need fixes</div></div>
        <div><div style="font:800 28px var(--display)">${t.critical}</div><div class="muted small">critical gaps</div></div>
        <div><div style="font:800 28px var(--display)">${t.score}</div><div class="muted small">average health</div></div>
      </div>
    </div>
  </div>
  ${t.sampled ? html`<div class="callout info" style="margin-bottom:18px">${icon('info')}<div>You have ${t.totalSongs.toLocaleString('en-US')} songs. This check covers the ${t.songs.toLocaleString('en-US')} most recently updated.</div></div>` : ''}
  ${r.commonGaps.length ? html`<div class="stack-sm" style="margin-bottom:18px"><div class="eyebrow">Most common</div><div class="gp-chips">${r.commonGaps.map(c => html`<span class="chip">${CODE_LABEL[c.code] || c.code} · ${c.songs}</span>`)}</div></div>` : ''}
  <div class="card">
    <div class="card-head"><h2 class="h3">Songs</h2><span class="muted small">${t.songs} checked · ${t.healthy} healthy</span></div>
    ${r.songs.map(s => html`<a class="gp-row" href="#/song/${s.songId}?tab=health">
      ${scoreRing(s.score, { size: 'sm' })}
      <div style="min-width:0"><div class="t">${s.title}</div><div class="s">${s.artist}${s.top[0] ? ` · ${s.top[0].title}` : ' · All clear'}</div></div>
      <div class="top-gap">${s.counts.critical ? html`<span class="badge crit">${s.counts.critical} critical</span>` : s.counts.high ? html`<span class="badge warn">${s.counts.high} high</span>` : s.counts.medium + s.counts.low ? html`<span class="badge info">${s.counts.medium + s.counts.low} minor</span>` : html`<span class="badge ok">Healthy</span>`}</div>
      <div style="text-align:right">${s.atRiskMinor ? html`<span class="gp-amt">about ${money(s.atRiskMinor)}</span>` : s.toCheck ? html`<span class="gp-amt soft">${s.toCheck} to check</span>` : html`<span class="muted small">—</span>`}</div>
    </a>`)}
  </div>
  <div style="margin-top:18px">${assumptionsBlock(r.assumptions)}</div></div>`.s;
}, { auth: true, title: 'Money check' });
