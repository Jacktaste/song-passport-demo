// Splits and signing: the song's "Splits" tab (editor + signature progress), the public signing page,
// the sealed certificate, the public verifier and the Signatures queue.
import { app, html, raw, api, toast, modal, icon, on, busy, confirmDialog, formData, pct, date, dateTime, ago, initials, colorFor, shareColors, statusBadge, art, esc, term, GLOSSARY, inkColor } from '../app.js';

// The payoff: the first time the sender sees a split everyone has agreed to (within two weeks of it sealing), a calm
// moment: the seal draws itself, one line says it's official, and the certificate slides in. Once per split.
function officialMoment(song, c) {
  const k = `sp-official-${c.id}`;
  try { if (localStorage.getItem(k) || Date.now() - Date.parse(c.executed_at) > 14 * 864e5) return; localStorage.setItem(k, '1'); } catch { return; }
  const back = document.createElement('div');
  back.className = 'official-back';
  back.innerHTML = html`<div class="official" role="dialog" aria-modal="true" aria-labelledby="off-h">
    <svg class="seal" viewBox="0 0 112 112" aria-hidden="true"><circle class="ring" cx="56" cy="56" r="52"/><path class="tick" d="M36 58l13 13 27-29"/></svg>
    <h2 id="off-h" style="font-size:1.7rem">Everyone’s agreed.<br>${song.title} is official.</h2>
    <div class="card card-pad cert stack-sm">
      <div class="eyebrow">Certificate of completion · v${c.version}</div>
      <div class="small muted">Sealed ${date(c.executed_at)}</div>
      <div class="stack-sm" style="margin-top:6px">${c.lines.map((l, i) => html`<div class="row between"><span class="row" style="gap:8px"><i style="width:9px;height:9px;border-radius:50%;background:${shareColors[i % shareColors.length]}"></i>${l.name}</span>
        <span class="num small muted">${pct(l.master_bps)} master · ${pct(l.publishing_bps)} publishing</span></div>`)}</div>
      <div class="row wrap" style="margin-top:10px"><a class="btn btn-primary" href="#/certificate/${c.id}">${icon('file')} View certificate</a><button class="btn" data-done>Done</button></div>
    </div></div>`.s;
  const close = () => { back.remove(); removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  back.addEventListener('click', e => { if (e.target === back || e.target.closest('[data-done], a')) close(); });
  addEventListener('keydown', onKey);
  document.body.appendChild(back);
  back.querySelector('[data-done]').focus();
}

const CONSENT_LINE_UI = 'I agree to these splits and to signing electronically.';
const ROLES = ['writer', 'producer', 'performer', 'engineer', 'mixer', 'featured artist', 'label', 'manager', 'publisher'];
// Claims once recorded the claimant as 'artist' or 'owner'; on a split sheet that is the performer.
const LEGACY_ROLES = { artist: 'performer', owner: 'performer', 'main artist': 'performer' };
const MASTER_ROLES = ['performer', 'producer', 'featured artist', 'engineer', 'mixer', 'label'];
const PUB_ROLES = ['writer', 'publisher'];

// ---------- one-time styles + fonts ----------
if (!document.getElementById('sp-style')) {
  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap';
  document.head.appendChild(fonts);
  const st = document.createElement('style');
  st.id = 'sp-style';
  st.textContent = `
  .sp-wrap { width: min(1100px, 100%); margin: 0 auto; }
  .sp-top { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:22px; }
  .sp-top .brand { padding:0; }
  .sp-lines { display:flex; flex-direction:column; }
  .sp-line { display:grid; grid-template-columns: minmax(0,1fr) 112px 112px 36px; gap:12px; align-items:center; padding:14px 22px; border-bottom:1px solid var(--line); }
  .sp-line.head { padding-top:10px; padding-bottom:10px; font-size:11.5px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); }
  .sp-line:last-child { border-bottom:0; }
  #sp-editor .card-head { flex-wrap:wrap; }
  #sp-editor .seg button { white-space:nowrap; }
  .sp-who { display:flex; gap:12px; align-items:center; min-width:0; }
  .sp-who .t { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sp-who .s { font-size:12.5px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sp-dot { width:10px; height:10px; border-radius:4px; flex:none; }
  .sp-pct { position:relative; }
  .sp-pct input { padding-right:28px; text-align:right; font-family:var(--mono); font-variant-numeric:tabular-nums; }
  .sp-pct::after { content:"%"; position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:13px; pointer-events:none; }
  .sp-pct input.bad { border-color:var(--crit); box-shadow:0 0 0 3px color-mix(in srgb, var(--crit) 15%, transparent); }
  .sp-pct small { display:none; }
  .sp-totals { display:grid; grid-template-columns:1fr 1fr; gap:18px; padding:18px 22px; border-top:1px solid var(--line); background:var(--surface-2); border-radius:0 0 var(--r-lg) var(--r-lg); }
  .sp-total .row b { font: 700 18px var(--display); font-variant-numeric: tabular-nums; }
  .sp-total.ok .row b { color: var(--ok); } .sp-total.bad .row b { color: var(--crit); }
  .sp-roles { display:flex; flex-wrap:wrap; gap:6px; }
  .sp-role { border:1px solid var(--line-strong); background:var(--surface); padding:5px 11px; border-radius:99px; font-size:12.5px; font-weight:600; cursor:pointer; color:var(--fg-2); text-transform:capitalize; }
  .sp-role.on { background:var(--accent-soft); color:var(--accent); border-color:transparent; }
  .sp-rolechip { display:inline-block; font-size:11px; font-weight:600; padding:1px 7px; border-radius:99px; background:var(--surface-3); color:var(--fg-2); text-transform:capitalize; margin-right:4px; }
  .sp-signer { display:flex; align-items:center; gap:12px; padding:12px 22px; border-bottom:1px solid var(--line); }
  .sp-signer:last-child { border-bottom:0; }
  .sp-sacts { display:flex; gap:4px; }
  @media (max-width:600px) { .sp-signer { flex-wrap:wrap; padding-left:16px !important; padding-right:16px; } .sp-signer > div:nth-child(2) { flex:1 1 0; } .sp-sacts { flex-basis:100%; padding-left:44px; } }
  .sp-anchor { display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:600; padding:3px 9px; border-radius:99px; background:var(--surface-3); color:var(--muted); }
  .sp-anchor svg { width:13px; height:13px; }
  @media (max-width:720px) {
    .sp-line { grid-template-columns: 1fr 1fr 36px; padding:14px 16px; }
    .sp-line .sp-who { grid-column: 1 / -1; }
    .sp-line.head { display:none; }
    .sp-pct small { display:block; position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:11px; color:var(--muted); font-weight:600; text-transform:uppercase; letter-spacing:.05em; pointer-events:none; }
    .sp-totals { grid-template-columns:1fr; padding:16px; }
  }

  /* signing page */
  .sp-sign { display:grid; grid-template-columns:minmax(0,1fr) 380px; gap:22px; align-items:start; }
  .sp-sign .panel { position:sticky; top:20px; }
  @media (max-width:960px) { .sp-sign { grid-template-columns:1fr; } .sp-sign .panel { position:static; } }
  .sp-doc { background:var(--surface); border:1px solid var(--line); border-radius:var(--r-lg); box-shadow:var(--shadow); overflow:hidden; }
  .sp-doc-head { padding:28px 30px 22px; background:radial-gradient(90% 140% at 0% 0%, color-mix(in srgb, var(--violet) 14%, transparent), transparent 60%); border-bottom:1px solid var(--line); }
  .sp-doc-sec { padding:22px 30px; border-bottom:1px solid var(--line); }
  .sp-doc-sec:last-child { border-bottom:0; }
  @media (max-width:640px) { .sp-doc-head, .sp-doc-sec { padding-left:18px; padding-right:18px; } }
  .sp-table { width:100%; border-collapse:collapse; }
  .sp-table th { text-align:left; font-size:11px; letter-spacing:.07em; text-transform:uppercase; color:var(--muted); font-weight:600; padding:0 0 10px; }
  .sp-table td { padding:11px 0; border-top:1px solid var(--line); vertical-align:middle; }
  .sp-table .r { text-align:right; font-family:var(--mono); font-variant-numeric:tabular-nums; white-space:nowrap; padding-left:12px; }
  .sp-table tr.mine td { background:color-mix(in srgb, var(--accent) 7%, transparent); }
  .sp-table tr.mine td:last-child { padding-right:10px; }
  .sp-wrap p svg, .sp-wrap .badge svg, .sp-wrap .tiny svg { width:13px; height:13px; vertical-align:-2px; }
  .sp-wrap .badge::before { display:none; }
  .sp-page .stat .label svg, .seal svg, .sp-page .seal svg { width:16px; height:16px; flex:none; }
  .sp-paper .lbl.head { padding-right:130px; }
  .sp-table tr.mine td:first-child { box-shadow: inset 3px 0 0 var(--accent); padding-left:10px; }
  .sp-terms { font-size:13px; color:var(--fg-2); white-space:pre-line; line-height:1.65; }
  .sp-share { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
  .sp-share div { background:var(--surface-2); border:1px solid var(--line); border-radius:var(--r); padding:12px 14px; }
  .sp-share b { display:block; font:700 26px/1.1 var(--display); letter-spacing:-.03em; font-variant-numeric:tabular-nums; margin-top:2px; }
  .sp-script { font-family:"Caveat", "Segoe Script", "Brush Script MT", cursive; font-weight:700; font-size:38px; line-height:1.1; color:#1b2a7a; }
  :root[data-theme="dark"] .sp-script { color:#c7d0ff; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .sp-script { color:#c7d0ff; } }
  .sp-preview { min-height:62px; border-bottom:1.5px solid var(--line-strong); display:flex; align-items:flex-end; padding:4px 4px 6px; overflow:hidden; white-space:nowrap; }
  .sp-pad { position:relative; border:1.5px dashed var(--line-strong); border-radius:var(--r); background:var(--surface-2); touch-action:none; }
  .sp-pad canvas { display:block; width:100%; height:130px; cursor:crosshair; border-radius:var(--r); }
  .sp-pad .ph { position:absolute; inset:0; display:grid; place-items:center; color:var(--faint); font-size:13px; pointer-events:none; }
  .sp-pad .clr { position:absolute; top:6px; right:6px; }
  .sp-done { text-align:center; padding:48px 28px 36px; }
  .sp-sealmark { width:108px; height:108px; margin:0 auto 22px; border-radius:50%; display:grid; place-items:center; background:var(--grad); color:#fff; box-shadow:var(--shadow); animation: sp-pop .6s cubic-bezier(.2,.9,.3,1.3); position:relative; }
  .sp-sealmark::before { content:""; position:absolute; inset:-10px; border-radius:50%; border:2px solid color-mix(in srgb, var(--violet) 40%, transparent); animation: sp-ring 1.6s ease-out .2s both; }
  .sp-sealmark svg { width:52px; height:52px; stroke-width:2.4; }
  .sp-sealmark svg path { stroke-dasharray:30; stroke-dashoffset:30; animation: sp-draw .5s ease .35s forwards; }
  @keyframes sp-pop { from { transform:scale(.4); opacity:0; } }
  @keyframes sp-ring { from { transform:scale(.8); opacity:1; } to { transform:scale(1.35); opacity:0; } }
  @keyframes sp-draw { to { stroke-dashoffset:0; } }
  .sp-progress { display:flex; gap:6px; justify-content:center; margin:18px 0 0; }
  .sp-progress i { width:34px; height:6px; border-radius:99px; background:var(--surface-3); }
  .sp-progress i.on { background:var(--ok); }

  /* one-screen signing */
  .sp-one { max-width:560px; }
  .sp-ask { overflow:hidden; }
  .sp-ask-head { padding:22px 22px 6px; background:radial-gradient(90% 140% at 0% 0%, color-mix(in srgb, var(--violet) 14%, transparent), transparent 60%); }
  .sp-ask-title { font-size:clamp(23px, 5.6vw, 30px); line-height:1.18; font-weight:600; letter-spacing:-.025em; margin-top:16px; }
  .sp-ask-title b { font-weight:750; }
  .sp-yours { text-align:center; padding:22px 22px 18px; }
  .sp-big { font:800 clamp(64px, 20vw, 92px)/1 var(--display); letter-spacing:-.05em; font-variant-numeric:tabular-nums; background:var(--grad); -webkit-background-clip:text; background-clip:text; color:transparent; margin:6px 0 4px; }
  .sp-big.sm { font-size:clamp(46px, 13vw, 64px); }
  .sp-others { margin:0 22px; padding:12px 14px; border-radius:var(--r); background:var(--surface-2); border:1px solid var(--line); }
  .sp-other { display:flex; align-items:center; gap:10px; padding:5px 0; font-size:14px; }
  .sp-other .grow { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .sp-act { padding:20px 22px 22px; display:flex; flex-direction:column; gap:12px; }
  .sp-cta { width:100%; padding:16px 22px; font-size:17px; border-radius:16px; }
  .sp-consent { font-size:13px; color:var(--fg-2); text-align:center; margin:0; line-height:1.5; }
  .sp-links { display:flex; flex-wrap:wrap; gap:6px 16px; justify-content:center; font-size:12.5px; }
  .sp-links a { color:var(--muted); text-decoration:underline; text-underline-offset:3px; }
  .sp-wrong { color:var(--muted); }
  .sp-code { font:600 28px var(--mono); letter-spacing:.4em; text-align:center; padding:14px; }
  .sp-foot { display:flex; gap:8px; align-items:flex-start; margin:14px 4px 0; line-height:1.5; }
  .sp-foot svg { width:14px; height:14px; flex:none; margin-top:2px; }
  .sp-shares { display:flex; flex-direction:column; }
  .sp-sharerow { display:flex; align-items:center; gap:12px; padding:13px 0; border-bottom:1px solid var(--line); }
  .sp-sharerow:last-child { border-bottom:0; }
  .sp-done { overflow:hidden; position:relative; }
  .sp-confetti { position:absolute; inset:0; pointer-events:none; }
  .sp-confetti i { position:absolute; top:-12px; left:calc(var(--i) * 5.6%); width:8px; height:14px; border-radius:2px; opacity:0; animation: sp-fall 1.6s cubic-bezier(.2,.7,.4,1) calc(var(--i) * 40ms) forwards; }
  @keyframes sp-fall { 0% { opacity:1; transform:translateY(0) rotate(0); } 100% { opacity:0; transform:translateY(340px) rotate(calc(var(--i) * 47deg)); } }
  .sp-edit { display:inline-block; min-width:220px; border-bottom:1.5px dashed rgba(20,20,40,.35); padding:2px 4px; outline:none; font-family:"Fraunces", Georgia, serif; }
  .sp-edit:empty::before { content:attr(data-ph); color:#9a9aa3; }
  @media print { .sp-edit { border-bottom-color:transparent; } .sp-edit:empty::before { content:""; } }
  .sp-audit { width:100%; border-collapse:collapse; font-size:12px; }
  .sp-audit td { padding:6px 0; border-bottom:1px solid rgba(20,20,40,.1); vertical-align:top; }
  .sp-audit td:first-child { color:#6b6b7b; width:38%; padding-right:10px; }
  /* certificate */
  .sp-cert-actions { display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; }
  .sp-paper { position:relative; background:#FBFAF6; color:#16161D; border-radius:8px; box-shadow:0 30px 80px rgba(10,10,30,.25), 0 2px 6px rgba(10,10,30,.08); padding:64px 64px 48px; overflow:hidden;
    background-image: radial-gradient(70% 50% at 50% 0%, rgba(106,82,224,.06), transparent 70%), repeating-linear-gradient(135deg, rgba(20,20,60,.018) 0 1px, transparent 1px 7px); }
  .sp-paper::before { content:""; position:absolute; inset:16px; border:1px solid rgba(40,40,90,.22); border-radius:4px; pointer-events:none; }
  .sp-paper::after { content:""; position:absolute; inset:21px; border:3px double rgba(40,40,90,.12); border-radius:3px; pointer-events:none; }
  .sp-paper .serif { font-family:"Fraunces", Georgia, "Times New Roman", serif; letter-spacing:-.01em; }
  .sp-paper h1.serif { font-size:clamp(28px, 4vw, 42px); font-weight:600; line-height:1.08; }
  .sp-paper .lbl { font:600 10.5px/1.2 var(--sans); letter-spacing:.16em; text-transform:uppercase; color:#6b6b7b; }
  .sp-paper .mut { color:#5d5d6d; }
  .sp-paper .hashv { font:500 11.5px/1.5 var(--mono); color:#3a3a4a; overflow-wrap:anywhere; }
  .sp-paper table { width:100%; border-collapse:collapse; }
  .sp-paper th { text-align:left; font:600 10.5px var(--sans); letter-spacing:.14em; text-transform:uppercase; color:#6b6b7b; padding:0 0 10px; border-bottom:1.5px solid #16161D; }
  .sp-paper td { padding:12px 0; border-bottom:1px solid rgba(20,20,40,.12); }
  .sp-paper td.r, .sp-paper th.r { text-align:right; font-family:var(--mono); font-variant-numeric:tabular-nums; padding-left:12px; }
  .sp-paper .rule { height:1px; background:rgba(20,20,40,.14); margin:30px 0; }
  .sp-sigs { display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:30px 40px; }
  .sp-sigblock .ink { height:74px; display:flex; align-items:flex-end; border-bottom:1.5px solid #16161D; padding-bottom:4px; overflow:hidden; }
  .sp-sigblock .ink svg { height:70px; width:auto; max-width:100%; }
  .sp-sigblock .ink .sp-script { color:#1b2a7a; font-size:40px; white-space:nowrap; }
  .sp-rosette { position:absolute; top:46px; right:54px; width:118px; height:118px; }
  .sp-ribbon { position:absolute; top:26px; left:-46px; transform:rotate(-35deg); background:#a86500; color:#fff; font:700 11px var(--sans); letter-spacing:.14em; padding:6px 60px; text-transform:uppercase; }
  .sp-verify { display:flex; gap:14px; align-items:center; padding:16px 20px; border-radius:var(--r); }
  .sp-verify.ok { background:var(--ok-soft); color:var(--ok); } .sp-verify.bad { background:var(--crit-soft); color:var(--crit); } .sp-verify.wait { background:var(--surface-3); color:var(--muted); }
  .sp-verify svg { width:26px; height:26px; flex:none; }
  .sp-checks { display:flex; flex-direction:column; gap:2px; }
  .sp-check { display:flex; gap:10px; align-items:flex-start; padding:9px 0; border-bottom:1px solid var(--line); font-size:13.5px; }
  .sp-check:last-child { border-bottom:0; }
  .sp-check svg { width:18px; height:18px; flex:none; margin-top:1px; }
  .sp-check.ok svg { color:var(--ok); } .sp-check.bad svg { color:var(--crit); }
  @media (max-width:720px) {
    .sp-paper { padding:52px 26px 34px; }
    .sp-paper::before { inset:9px; } .sp-paper::after { inset:13px; }
    .sp-rosette { width:74px; height:74px; top:30px; right:26px; }
    .sp-sigs { grid-template-columns:1fr; }
    .sp-paper .lbl.head { padding-right:84px; }
    .sp-top .brand small { display:none; }
  }
  @media print {
    .sp-noprint, .toasts { display:none !important; }
    .public { background:#fff !important; padding:0 !important; display:block !important; }
    .sp-paper { box-shadow:none !important; }
    body { background:#fff !important; }
  }`;
  document.head.appendChild(st);
}

// ---------- helpers ----------
const bpsStr = bps => { const v = (bps || 0) / 100; return v % 1 ? v.toFixed(2).replace(/0$/, '') : String(v); };
const parsePct = s => {
  const t = String(s ?? '').trim();
  if (t === '') return 0;
  if (!/^\d{1,3}(\.\d{0,2})?$/.test(t)) return NaN;
  const n = Math.round(parseFloat(t) * 100);
  return n > 10000 ? NaN : n;
};
const shortHash = h => h ? `${h.slice(0, 10)}…${h.slice(-8)}` : '';
const roleChips = roles => (roles || []).map(r => html`<span class="sp-rolechip">${r}</span>`);
const avatar = (name, cls = '') => html`<div class="avatar ${cls}" style="background:${colorFor(name || '?')}">${initials(name)}</div>`;

function bar(lines, key) {
  const total = lines.reduce((s, l) => s + (l[key] || 0), 0);
  if (!total) return html`<div class="splitbar"></div>`;
  return html`<div class="splitbar">${lines.map((l, i) => (l[key] || 0) > 0 ? html`<i style="width:${l[key] / Math.max(total, 10000) * 100}%;background:${shareColors[i % shareColors.length]}" title="${l.name}: ${pct(l[key])}"></i>` : '')}</div>`;
}
function legend(lines, key) {
  return html`<div class="legend" style="margin-top:10px">${lines.map((l, i) => (l[key] || 0) > 0 ? html`<span><i style="background:${shareColors[i % shareColors.length]}"></i>${l.name} <b class="num">${pct(l[key])}</b></span>` : '')}</div>`;
}
const anchorBadge = a => a ? html`<span class="sp-anchor" title="${a.status === 'simulated' ? 'The exact Audius Entity Manager payload is built and stored. It goes on chain once Audius anchoring keys are configured.' : a.tx_hash || ''}">${icon('audius')} Audius anchor: ${a.status}</span>` : '';

function equalBps(n) {
  const base = Math.floor(10000 / n), out = Array(n).fill(base);
  for (let i = 0; i < 10000 - base * n; i++) out[i]++;
  return out;
}

// ---------- browser-side verification (independent of the server) ----------
function canonical(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
}
async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const b64urlBytes = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
let keyCache = null;
async function platformKey() {
  if (keyCache) return keyCache;
  const k = await api('/api/keys');
  const der = Uint8Array.from(atob(k.publicKeyPem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  let cryptoKey = null;
  try { cryptoKey = await crypto.subtle.importKey('spki', der, { name: 'Ed25519' }, false, ['verify']); } catch { cryptoKey = null; }
  return (keyCache = { ...k, cryptoKey });
}
export async function verifyInBrowser(cert) {
  const checks = [];
  const add = (label, ok, detail) => checks.push({ label, ok: !!ok, detail });
  if (!cert?.doc || !cert?.doc_hash) { add('Certificate format', false, 'Not a Song Passport split certificate'); return { ok: false, checks, supported: true }; }
  const key = await platformKey();
  const docHash = await sha256Hex(canonical(cert.doc));
  add('Document hash matches', docHash === cert.doc_hash, docHash);
  const supported = !!key.cryptoKey;
  const ver = async (value, sig) => supported ? crypto.subtle.verify({ name: 'Ed25519' }, key.cryptoKey, b64urlBytes(sig || ''), new TextEncoder().encode(canonical(value))).catch(() => false) : null;
  for (const s of cert.signatures || []) {
    const p = s.payload || {};
    let ok = p.doc_hash === cert.doc_hash && p.split_id === cert.split_id;
    if (s.drawn_svg) ok = ok && (await sha256Hex(s.drawn_svg)) === p.drawn_sha256;
    const v = await ver(p, s.platform_signature);
    add(`Signature of ${p.typed_name || p.signer_name}`, ok && v !== false, v === null ? 'Hash checked; your browser cannot check Ed25519' : null);
  }
  const signed = new Set((cert.signatures || []).map(s => s.payload?.signer_email_sha256));
  const missing = (cert.doc.signers || []).filter(s => !signed.has(s.email_sha256));
  add('Every party signed', !missing.length && (cert.doc.signers || []).length > 0, missing.map(m => m.name).join(', '));
  const ex = cert.execution || {};
  const v = await ver(ex, cert.execution_signature);
  add('Platform seal', ex.doc_hash === cert.doc_hash && v !== false, v === null ? 'Your browser cannot check Ed25519' : null);
  return { ok: checks.every(c => c.ok), checks, supported, keyId: key.keyId };
}

const checkList = checks => html`<div class="sp-checks">${checks.map(c => html`<div class="sp-check ${c.ok ? 'ok' : 'bad'}">${icon(c.ok ? 'check' : 'x')}<div><b>${c.label}</b>${c.detail ? html`<div class="tiny muted mono" style="overflow-wrap:anywhere">${c.detail}</div>` : ''}</div></div>`)}</div>`;

// ======================================================================
// Song tab: Splits
// ======================================================================
app.songTab({
  id: 'splits', label: 'Splits', order: 10,
  show: song => song.status !== 'draft',
  render: async ({ el, song, user, canManage, reload }) => {
    let data = await api(`/api/songs/${song.id}/splits`);
    let editing = false;
    const refresh = async () => { data = await api(`/api/songs/${song.id}/splits`); paint(); };

    // Editor state.
    let lines = [], dirty = false, note = '';
    const fromLines = src => src.map(l => ({ k: Math.random().toString(36).slice(2), contributor_id: l.contributor_id || null, payee_type: l.payee_type || 'contributor', payee_song_id: l.payee_song_id || null, name: l.name, email: l.email || '', roles: [...new Set((l.roles || []).map(r => LEGACY_ROLES[r] || r))], ipi: l.ipi || '', pro: l.pro || '', entity: l.entity === 'company' ? 'company' : 'person', administered_by: l.administered_by || '', access_code: !!l.access_code, m: bpsStr(l.master_bps), p: bpsStr(l.publishing_bps) }));
    const resetEditor = () => {
      const src = data.open?.lines?.length ? data.open.lines : data.current?.lines?.length ? data.current.lines
        : (data.contributors || []).map(c => ({ ...c, contributor_id: c.id, master_bps: 0, publishing_bps: 0 }));
      lines = fromLines(src);
      if (!data.open && !data.current && lines.length) {
        const eq = equalBps(lines.length);
        lines.forEach((l, i) => { l.m = bpsStr(eq[i]); l.p = bpsStr(eq[i]); });
      }
      note = data.open?.note || '';
      dirty = false;
    };
    resetEditor();
    // True while every line holds the same master and publishing share (the starting state).
    const evenSplit = () => { const eq = equalBps(lines.length); return lines.every((l, i) => parsePct(l.m) === eq[i] && parsePct(l.p) === eq[i]); };
    const rebalanceEqual = () => { const eq = equalBps(lines.length); lines.forEach((l, i) => { l.m = bpsStr(eq[i]); l.p = bpsStr(eq[i]); }); };

    const totals = () => {
      const ms = lines.map(l => parsePct(l.m)), ps = lines.map(l => parsePct(l.p));
      const badInput = ms.some(Number.isNaN) || ps.some(Number.isNaN);
      const m = ms.reduce((s, x) => s + (x || 0), 0), p = ps.reduce((s, x) => s + (x || 0), 0);
      const problems = [];
      if (!lines.length) problems.push('Add at least one contributor');
      if (badInput) problems.push('Shares are percentages with up to two decimals');
      if (m && m !== 10000) problems.push(`Master totals ${pct(m)}; it must be exactly 100% or 0%`);
      if (p && p !== 10000) problems.push(`Publishing totals ${pct(p)}; it must be exactly 100% or 0%`);
      if (!m && !p && lines.length) problems.push('Give out master or publishing shares');
      lines.forEach((l, i) => { if (!badInput && !ms[i] && !ps[i]) problems.push(`${l.name} has no share`); });
      return { m, p, problems, ok: !problems.length };
    };
    const toPayload = () => lines.map(l => ({ contributor_id: l.contributor_id, payee_type: l.payee_type, payee_song_id: l.payee_song_id, name: l.name, email: l.email || null, roles: l.roles, ipi: l.ipi || null, pro: l.pro || null, entity: l.payee_type === 'song' ? undefined : l.entity, administered_by: l.administered_by || null, access_code: !!l.access_code, master_bps: parsePct(l.m) || 0, publishing_bps: parsePct(l.p) || 0 }));
    const barLines = () => lines.map(l => ({ name: l.name, master_bps: parsePct(l.m) || 0, publishing_bps: parsePct(l.p) || 0 }));

    function paintTotals() {
      const t = totals(), box = el.querySelector('#sp-totals');
      if (!box) return;
      const bl = barLines();
      const pool = (label, v, key) => html`<div class="sp-total ${v === 10000 ? 'ok' : v === 0 ? '' : 'bad'} stack-sm">
        <div class="row between"><span class="label">${label}</span><b>${pct(v)}</b></div>${bar(bl, key)}</div>`;
      box.innerHTML = html`${pool('Master', t.m, 'master_bps')}${pool('Publishing', t.p, 'publishing_bps')}`.s;
      const prob = el.querySelector('#sp-problems');
      prob.innerHTML = t.ok ? html`<span class="badge ok">Ready to send</span>`.s : html`<span class="small" style="color:var(--crit)">${t.problems[0]}</span>`.s;
      el.querySelector('[data-act=save]').disabled = !t.ok || !dirty;
      el.querySelector('[data-act=send]').disabled = !t.ok;
      el.querySelectorAll('.sp-line[data-k]').forEach(row => {
        const l = lines.find(x => x.k === row.dataset.k);
        row.querySelector('[data-f=m]').classList.toggle('bad', Number.isNaN(parsePct(l.m)));
        row.querySelector('[data-f=p]').classList.toggle('bad', Number.isNaN(parsePct(l.p)));
      });
    }

    function editorCard() {
      const out = data.open?.status === 'out_for_signature';
      return html`<div class="card" id="sp-editor">
        <div class="card-head"><div><h2 class="h3">${data.open ? `Split draft · version ${data.open.version}` : data.current ? 'Amend the split' : 'Set the split'}</h2>
          <div class="small muted">Master is the recording, publishing is the composition. Each pool totals 100%, or leave a pool at 0%.</div></div>
          <div class="seg" role="group" aria-label="Presets">
            <button data-preset="equal" title="Everyone gets the same share of both pools">${lines.length === 2 ? '50 / 50' : 'Equal split'}</button>
            <button data-preset="roles" title="Writers and publishers share publishing, performers and producers share master">By role</button>
            <button data-preset="mirror" title="Publishing shares copy the master shares">Pub = master</button>
          </div></div>
        ${out ? html`<div class="callout warn" style="border-radius:0">${icon('alert')}<div>Version ${data.open.version} is out for signature. Saving changes voids the requests still waiting and starts version ${data.open.version + 1}. Anyone who already signed signs again.</div></div>` : ''}
        <div class="sp-lines">
          <div class="sp-line head"><span>Contributor</span><span style="text-align:right">Master</span><span style="text-align:right">Publishing</span><span></span></div>
          ${lines.length ? lines.map((l, i) => html`<div class="sp-line" data-k="${l.k}">
            <div class="sp-who"><span class="sp-dot" style="background:${shareColors[i % shareColors.length]}"></span>
              ${l.payee_type === 'song' ? html`<div class="art" style="width:34px;height:34px;border-radius:9px;background:var(--grad)">${icon('git')}</div>` : avatar(l.name, 'sm')}
              <div style="min-width:0"><div class="t">${l.name}</div>
                <div class="s">${l.payee_type === 'song' ? 'Paid into that song · its owner signs' : html`${l.email || html`<span class="faint">No email: you'll copy their link</span>`}${l.entity === 'company' ? html` · <span class="sp-rolechip">company</span>` : ''}${l.access_code ? html` · ${icon('lock')}` : ''} · ${roleChips(l.roles)}`}</div></div>
              ${l.payee_type === 'contributor' ? html`<button class="btn btn-ghost btn-icon btn-sm" data-act="edit-line" title="Edit ${l.name}">${icon('edit')}</button>` : ''}
            </div>
            <label class="sp-pct"><small>Master</small><input class="input" data-f="m" inputmode="decimal" value="${l.m}" aria-label="${l.name} master share"></label>
            <label class="sp-pct"><small>Pub</small><input class="input" data-f="p" inputmode="decimal" value="${l.p}" aria-label="${l.name} publishing share"></label>
            <button class="btn btn-ghost btn-icon btn-sm btn-danger" data-act="rm-line" title="Remove">${icon('trash')}</button>
          </div>`) : html`<div class="empty" style="padding:30px"><div class="icon">${icon('users')}</div><h2 class="h3">No contributors yet</h2><p>Add everyone who wrote, produced, performed or owns a piece of this song.</p></div>`}
        </div>
        <div style="padding:14px 22px;border-top:1px solid var(--line)" class="row wrap">
          <button class="btn btn-sm" data-act="add-line">${icon('plus')} Add contributor</button>
          <button class="btn btn-sm btn-ghost" data-act="add-song">${icon('git')} Pay another song</button>
          ${(data.contributors || []).filter(c => !lines.some(l => l.contributor_id === c.id)).map(c => html`<button class="btn btn-sm btn-ghost" data-act="add-known" data-id="${c.id}">${icon('plus')} ${c.name}</button>`)}
        </div>
        <div class="sp-totals" id="sp-totals" style="border-radius:0"></div>
        <div style="padding:16px 22px" class="stack">
          <label class="field"><span>Note to signers <span class="hint">optional, shown on the split sheet</span></span><input class="input" data-f="note" value="${note}" maxlength="1000" placeholder="e.g. Final split agreed in the studio on 12 October"></label>
          <div class="row wrap between"><div id="sp-problems"></div>
            <div class="row wrap">${editing ? html`<button class="btn btn-ghost" data-act="cancel-edit">Cancel</button>` : ''}
              <button class="btn" data-act="save">Save draft</button>
              <button class="btn btn-primary" data-act="send">${icon('sign')} Send for signature</button></div></div>
        </div>
      </div>`;
    }

    function progressCard(o) {
      const signed = o.signatures.filter(s => s.status === 'signed').length;
      return html`<div class="card">
        <div class="card-head"><div><h2 class="h3">Version ${o.version} is out for signature</h2><div class="small muted">Sent ${ago(o.sent_at)} · ${signed} of ${o.signatures.length} signed</div></div>${statusBadge('out_for_signature')}</div>
        <div style="padding:16px 22px 4px"><div class="progress"><i style="width:${signed / Math.max(1, o.signatures.length) * 100}%"></i></div></div>
        <div>${o.signatures.map(s => html`<div class="sp-signer">${avatar(s.name, 'sm')}
          <div class="grow" style="flex:1;min-width:0"><div style="font-weight:600">${s.name}${s.on_behalf_song_id ? html` <span class="badge info plain">for a song</span>` : ''}</div>
            <div class="tiny muted">${s.status === 'signed' ? `Signed ${dateTime(s.signed_at)} as “${s.typed_name}”` : s.status === 'declined' ? `Declined: ${s.decline_reason}` : `${s.contact || 'Link only'} · ${s.viewed_at ? `opened ${ago(s.viewed_at)}` : `sent ${ago(s.last_sent_at)}`}${s.reminder_count ? ` · ${s.reminder_count} reminder${s.reminder_count > 1 ? 's' : ''}` : ''}`}</div></div>
          ${statusBadge(s.status)}
          ${canManage && s.status === 'pending' ? html`<span class="sp-sacts"><button class="btn btn-sm btn-ghost" data-act="copy-sig" data-id="${s.id}" title="Copy their signing link">${icon('copy')}</button><button class="btn btn-sm btn-ghost" data-act="remind" data-id="${s.id}" ${s.reminder_count >= 5 || !s.contact ? 'disabled' : ''}>${icon('mail')} Remind</button></span>` : ''}
          ${user && s.status === 'pending' && s.email === user.email ? html`<a class="btn btn-sm btn-primary" href="#/sign/${s.id}">Sign now</a>` : ''}
        </div>`)}</div>
        <div style="padding:14px 22px;border-top:1px solid var(--line)" class="row wrap between">
          <span class="hash" title="${o.doc_hash}">Document ${shortHash(o.doc_hash)}</span>
          ${canManage ? html`<div class="row wrap"><button class="btn btn-sm" data-act="edit">${icon('edit')} Edit split</button><button class="btn btn-sm btn-danger" data-act="void" data-id="${o.id}">Void</button></div>` : ''}
        </div></div>`;
    }

    function currentCard(c) {
      if (!c) return html`<div class="card card-pad"><div class="empty" style="padding:22px 6px"><div class="icon">${icon('sign')}</div><h2 class="h3">No signed split yet</h2>
        <p>${canManage ? 'Set the shares, send it, and every contributor signs from their inbox in about a minute.' : 'The owner has not had a split signed for this song yet.'}</p></div></div>`;
      return html`<div class="card">
        <div class="card-head"><div><h2 class="h3">Split in force</h2><div class="small muted">Version ${c.version} · fully signed ${date(c.executed_at)}</div></div><span class="seal" style="padding:5px 10px;font-size:12.5px">${icon('shield')} Sealed</span></div>
        <div class="card-body stack">
          <div class="stack-sm"><div class="row between"><span class="label">Master</span></div>${bar(c.lines, 'master_bps')}${legend(c.lines, 'master_bps')}</div>
          <div class="stack-sm"><div class="row between"><span class="label">Publishing</span></div>${bar(c.lines, 'publishing_bps')}${legend(c.lines, 'publishing_bps')}</div>
          <div class="row wrap between" style="margin-top:4px"><div class="row wrap"><a class="btn btn-sm btn-dark" href="#/certificate/${c.id}">${icon('file')} Certificate</a>${canManage && !data.open ? html`<button class="btn btn-sm" data-act="edit">${icon('edit')} Amend</button>` : ''}</div>${anchorBadge(c.anchor)}</div>
        </div></div>`;
    }

    function versionsCard() {
      if (!data.versions?.length) return '';
      return html`<div class="card"><div class="card-head"><h2 class="h3">Versions</h2></div><div class="list">
        ${data.versions.map(v => html`<${['executed', 'superseded'].includes(v.status) ? 'a' : 'div'} class="list-item" ${['executed', 'superseded'].includes(v.status) ? raw(`href="#/certificate/${esc(v.id)}"`) : ''}>
          <div class="chip">v${v.version}</div><div class="grow"><div class="sub">${v.executed_at ? `Signed ${date(v.executed_at)}` : v.voided_at ? `Voided ${date(v.voided_at)}${v.void_reason ? ' · ' + v.void_reason : ''}` : v.sent_at ? `Sent ${date(v.sent_at)}` : `Drafted ${date(v.created_at)}`}</div></div>
          ${statusBadge(v.status)}</${['executed', 'superseded'].includes(v.status) ? 'a' : 'div'}>`)}
      </div></div>`;
    }

    function paint() {
      const out = data.open?.status === 'out_for_signature';
      const showEditor = canManage && (editing || data.open?.status === 'draft' || (!data.open && !data.current));
      const currentLeft = !showEditor && !out;
      el.innerHTML = html`<div class="split-main">
        <div class="stack-lg">
          ${out && !editing ? progressCard(data.open) : ''}
          ${showEditor ? editorCard() : ''}
          ${currentLeft ? currentCard(data.current) : ''}
          ${!canManage && out ? html`<div class="callout info">${icon('info')}<div>A new version of this split is out for signature.</div></div>` : ''}
        </div>
        <div class="stack-lg">
          ${!currentLeft ? currentCard(data.current) : html`<div class="card card-pad stack-sm"><h2 class="h3">How splits work</h2><p class="small muted">Every share on this passport is signed by each contributor and sealed with a certificate anyone can verify, offline, with our public key.</p><a class="btn btn-sm" href="#/verify" style="align-self:flex-start">${icon('shield')} Verify a certificate</a></div>`}
          ${versionsCard()}
        </div></div>`.s;
      if (showEditor) paintTotals();
      if (canManage && data.current) officialMoment(song, data.current);
    }
    paint();
    // While a split is out for signature, check now and then, so the sender sees the moment the last person agrees.
    const poll = setInterval(async () => {
      if (!document.body.contains(el)) return clearInterval(poll);
      if (document.hidden || editing || data.open?.status !== 'out_for_signature') return;
      const next = await api(`/api/songs/${song.id}/splits`).catch(() => null);
      if (next && (next.open?.status !== data.open?.status || next.current?.id !== data.current?.id)) { data = next; paint(); }
    }, 8000);

    const lineOf = t => lines.find(l => l.k === t.closest('.sp-line').dataset.k);
    on(el, 'input', '.sp-pct input', (e, t) => { lineOf(t)[t.dataset.f] = t.value; dirty = true; paintTotals(); });
    on(el, 'input', '[data-f=note]', (e, t) => { note = t.value; dirty = true; paintTotals(); });
    on(el, 'click', '[data-act=rm-line]', (e, t) => { const l = lineOf(t); lines = lines.filter(x => x !== l); dirty = true; paint(); });
    on(el, 'click', '[data-preset]', (e, t) => {
      if (!lines.length) return toast('Add contributors first', { error: true });
      const kind = t.dataset.preset;
      if (kind === 'equal') { const eq = equalBps(lines.length); lines.forEach((l, i) => { l.m = bpsStr(eq[i]); l.p = bpsStr(eq[i]); }); }
      if (kind === 'mirror') lines.forEach(l => { l.p = l.m; });
      if (kind === 'roles') {
        const mIdx = lines.map((l, i) => l.payee_type === 'song' || l.roles.some(r => MASTER_ROLES.includes(r)) ? i : -1).filter(i => i >= 0);
        const pIdx = lines.map((l, i) => l.payee_type === 'song' || l.roles.some(r => PUB_ROLES.includes(r)) ? i : -1).filter(i => i >= 0);
        const me = mIdx.length ? equalBps(mIdx.length) : [], pe = pIdx.length ? equalBps(pIdx.length) : [];
        lines.forEach(l => { l.m = '0'; l.p = '0'; });
        mIdx.forEach((i, j) => { lines[i].m = bpsStr(me[j]); });
        pIdx.forEach((i, j) => { lines[i].p = bpsStr(pe[j]); });
      }
      dirty = true; paint();
    });

    const contributorForm = (l = {}) => html`<form class="form-grid" id="cf">
      <label class="field"><span>Full name</span><input class="input" name="name" required value="${l.name || ''}" placeholder="Legal or professional name"></label>
      <label class="field"><span>Email <span class="hint">we email them the signing link</span></span><input class="input" type="email" name="email" value="${l.email || ''}" placeholder="name@example.com"></label>
      <label class="check full"><input type="checkbox" name="company" ${l.entity === 'company' ? 'checked' : ''}><span class="small">This is a company (label, publisher, management). The person who signs confirms they have authority to sign for it.</span></label>
      <div class="field full"><span>Roles</span><div class="sp-roles">${ROLES.map(r => html`<button type="button" class="sp-role ${(l.roles || []).includes(r) ? 'on' : ''}" data-role="${r}">${r}</button>`)}</div></div>
      <label class="field"><span>${term('IPI')} <span class="hint">optional, 9–11 digits</span></span><input class="input mono" name="ipi" value="${l.ipi || ''}" inputmode="numeric"></label>
      <label class="field"><span>${term('PRO')} <span class="hint">optional</span></span><input class="input" name="pro" value="${l.pro || ''}" placeholder="ASCAP, BMI, SESAC, GMR…"></label>
      <label class="field full"><span>Administered by <span class="hint">optional, e.g. their publishing administrator</span></span><input class="input" name="administered_by" value="${l.administered_by || ''}" placeholder="e.g. Kobalt, Songtrust, Sony Music Publishing"></label>
      <label class="check full"><input type="checkbox" name="access_code" ${l.access_code ? 'checked' : ''}><span class="small">Require an access code: they confirm a 6-digit code sent to their email before signing.</span></label>
    </form>`;
    const readContributor = m => {
      const f = formData(m.querySelector('#cf'));
      const roles = [...m.querySelectorAll('.sp-role.on')].map(b => b.dataset.role);
      if (!f.name?.trim()) throw new Error('Name is required');
      if (!roles.length) throw new Error('Pick at least one role');
      if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) throw new Error('That email does not look right');
      if (f.ipi && !/^\d{9,11}$/.test(f.ipi.replace(/\D/g, ''))) throw new Error('An IPI number has 9 to 11 digits');
      if (f.email && lines.some(x => x.email && x.email.toLowerCase() === f.email.toLowerCase() && x._editing !== true)) throw new Error('That email is already on the split');
      if (f.access_code && !f.email) throw new Error('An access code needs an email to send it to');
      return { name: f.name.trim(), email: f.email.trim().toLowerCase(), roles, ipi: f.ipi.trim(), pro: f.pro.trim(), entity: f.company ? 'company' : 'person', administered_by: (f.administered_by || '').trim(), access_code: !!f.access_code };
    };
    const wireRoles = m => {
      let fresh = !m.querySelector('#cf input[name=name]')?.value;   // a new contributor: 'writer' is only a suggestion
      m.addEventListener('click', e => {
        const b = e.target.closest('.sp-role'); if (!b) return;
        if (fresh) { m.querySelectorAll('.sp-role.on').forEach(x => x !== b && x.classList.remove('on')); b.classList.add('on'); fresh = false; return; }
        b.classList.toggle('on');
      });
    };

    on(el, 'click', '[data-act=add-line]', () => modal({
      title: 'Add a contributor', body: contributorForm({ roles: ['writer'] }), onOpen: wireRoles,
      actions: [{ label: 'Cancel' }, { label: 'Add to split', primary: true, onClick: async (close, m) => {
        const c = readContributor(m);
        const even = evenSplit();
        lines.push({ k: Math.random().toString(36).slice(2), contributor_id: null, payee_type: 'contributor', payee_song_id: null, ...c, m: '0', p: '0' });
        if (even) rebalanceEqual();   // still an even split: keep it even, so the new person never starts at 0%
        dirty = true; close(); paint();
      } }]
    }));
    on(el, 'click', '[data-act=edit-line]', (e, t) => {
      const l = lineOf(t);
      l._editing = true;
      modal({
        title: `Edit ${l.name}`, body: contributorForm(l), onOpen: wireRoles,
        actions: [{ label: 'Cancel' }, { label: 'Save', primary: true, onClick: async (close, m) => {
          const c = readContributor(m); Object.assign(l, c); dirty = true; close(); paint();
        } }]
      }).finally(() => { delete l._editing; });
    });
    on(el, 'click', '[data-act=add-known]', (e, t) => {
      const c = data.contributors.find(x => x.id === t.dataset.id);
      const even = evenSplit();
      lines.push({ k: Math.random().toString(36).slice(2), contributor_id: c.id, payee_type: 'contributor', payee_song_id: null, name: c.name, email: c.email || '', roles: c.roles.length ? c.roles.map(r => LEGACY_ROLES[r] || r) : ['writer'], ipi: c.ipi || '', pro: c.pro || '', m: '0', p: '0' });
      if (even) rebalanceEqual();
      dirty = true; paint();
    });
    on(el, 'click', '[data-act=add-song]', () => {
      let timer;
      modal({
        title: 'Pay another song',
        body: html`<p class="muted small" style="margin-bottom:12px">For a remix, sample or cover: the share is paid into the original song, and its own signed split decides who gets it. Its owner signs on its behalf.</p>
          ${song.parent ? html`<button class="btn btn-sm" style="margin-bottom:12px" data-pick="${song.parent.id}" data-name="${song.parent.title} · ${song.parent.artist_credit}">${icon('git')} ${song.parent.title} (the original)</button>` : ''}
          <input class="input" id="sq" placeholder="Search songs by title, artist or ISRC" autocomplete="off"><div id="sr" class="list" style="margin-top:8px"></div>`,
        onOpen: m => {
          const pick = (id, name) => {
            if (lines.some(l => l.payee_song_id === id)) return toast('That song is already on the split', { error: true });
            lines.push({ k: Math.random().toString(36).slice(2), contributor_id: null, payee_type: 'song', payee_song_id: id, name, email: '', roles: ['original song'], ipi: '', pro: '', m: '0', p: '0' });
            dirty = true; m.closest('.modal-back').remove(); paint();
          };
          m.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) pick(b.dataset.pick, b.dataset.name); });
          m.querySelector('#sq').addEventListener('input', e => {
            clearTimeout(timer);
            timer = setTimeout(async () => {
              const { items } = await api(`/api/splits/song-lookup?q=${encodeURIComponent(e.target.value)}`).catch(() => ({ items: [] }));
              m.querySelector('#sr').innerHTML = html`${items.filter(s => s.id !== song.id).map(s => html`<button type="button" class="list-item" style="border:0;background:none;text-align:left;cursor:pointer;padding:10px 4px" data-pick="${s.id}" data-name="${s.title} · ${s.artist_credit}">
                ${art(s.title + s.artist_credit, { label: s.title })}<div class="grow"><div class="title">${s.title}</div><div class="sub">${s.artist_credit}</div></div>${statusBadge(s.status)}</button>`)}
                ${e.target.value.length > 1 && !items.length ? html`<div class="small muted" style="padding:10px 4px">No claimed songs match. A song needs a verified owner before it can be paid a share.</div>` : ''}`.s;
            }, 220);
          });
        },
        actions: [{ label: 'Close' }]
      });
    });

    async function save() {
      const r = await api.put(`/api/songs/${song.id}/splits`, { lines: toPayload(), note });
      if (r.voided) toast(`Version ${r.voided.version} voided. Draft is now version ${r.split.version}.`);
      editing = false;
      await refresh(); resetEditor(); paint();
      return r;
    }
    on(el, 'click', '[data-act=save]', (e, t) => busy(t, async () => { await save(); toast('Draft saved'); }).catch(() => {}));
    on(el, 'click', '[data-act=send]', async (e, t) => {
      const signers = lines.filter(l => l.payee_type === 'contributor');
      const songs = lines.filter(l => l.payee_type === 'song').map(l => l.name);
      const meLine = signers.find(l => user && (l.email === user.email));
      const ok = await modal({
        title: 'Send for signature?',
        body: html`<div class="stack"><p class="muted">Everyone with an email gets a link to review and agree. For anyone without one, you'll get a link to copy. Once everyone agrees, the split is sealed and everyone gets the certificate.</p>
          <div class="stack-sm">${signers.map(l => html`<div class="row">${avatar(l.name, 'sm')}<b>${l.name}</b><span class="muted small">${l.email ? 'emailed' : 'copy link'}</span></div>`)}${songs.map(n => html`<div class="row"><div class="avatar sm" style="background:var(--grad)">${icon('git')}</div><span><b>${n}</b> <span class="muted small">signed by its owner</span></span></div>`)}</div>
          ${meLine ? html`<p class="small" style="margin-top:4px">Sending signs it as you (${meLine.name}). ${CONSENT_LINE_UI}</p>` : ''}</div>`,
        actions: [{ label: 'Cancel', value: false }, { label: 'Send', primary: true, value: true }]
      });
      if (!ok) return;
      await busy(t, async () => {
        if (dirty || !data.open || data.open.status !== 'draft') await api.put(`/api/songs/${song.id}/splits`, { lines: toPayload(), note });
        const r = await api.post(`/api/songs/${song.id}/splits/send`, { sign_as_me: !!meLine });
        editing = false;
        const toCopy = r.links.filter(l => !l.you);
        await modal({
          title: r.executed ? 'Locked in' : 'Sent',
          body: html`<p class="muted" style="margin-bottom:10px">${r.executed ? 'Everyone has agreed.' : 'Emails are on their way. Copy a link to send it yourself, anywhere.'}</p>${shareLinksView(r.links, { song: song.title })}`,
          onOpen: m => wireShareLinks(m),
          actions: [{ label: 'Done', primary: true }]
        });
        await reload();
      }).catch(() => {});
    });
    on(el, 'click', '[data-act=edit]', () => { editing = true; resetEditor(); paint(); el.querySelector('#sp-editor')?.scrollIntoView({ behavior: 'smooth' }); });
    on(el, 'click', '[data-act=cancel-edit]', () => { editing = false; resetEditor(); paint(); });
    on(el, 'click', '[data-act=remind]', (e, t) => busy(t, async () => { await api.post(`/api/signatures/${t.dataset.id}/remind`); toast('Reminder emailed'); await refresh(); }).catch(() => {}));
    on(el, 'click', '[data-act=copy-sig]', (e, t) => busy(t, async () => {
      const r = await api.post(`/api/signatures/${t.dataset.id}/link`);
      try { await navigator.clipboard.writeText(r.message || r.url); toast('Link copied. Paste it anywhere.'); } catch { prompt('Copy this link', r.url); }
    }).catch(() => {}));
    on(el, 'click', '[data-act=void]', async (e, t) => {
      if (!await confirmDialog('Void this version?', 'Links still waiting stop working. The lines come back as a draft so you can fix and resend.', 'Void version', true)) return;
      await busy(t, async () => { await api.post(`/api/splits/${t.dataset.id}/void`, {}); toast('Version voided'); await reload(); }).catch(() => {});
    });
  }
});

// ======================================================================
// Public signing page: one screen, "Agree and sign".
// ======================================================================
const topBar = right => html`<div class="sp-top sp-noprint"><a class="brand" href="#/home"><span class="brand-mark">${icon('passport')}</span><span>Song Passport<small>Built on Audius</small></span></a>${right || ''}</div>`;
const shareOf = ls => {
  const m = ls.reduce((a, l) => a + l.master_bps, 0), p = ls.reduce((a, l) => a + l.publishing_bps, 0);
  return { m, p, same: m === p };
};

app.route('/sign/:token', async ({ el, params }) => {
  const key = encodeURIComponent(params.token);
  let v;
  try { v = await api(`/api/sign/${key}`); }
  catch (e) {
    return html`<div class="sp-wrap sp-one">${topBar()}<div class="card card-pad"><div class="empty" style="padding:26px 10px">
      <div class="icon">${icon(e.status === 410 ? 'clock' : 'link')}</div><h2 class="h3">${e.status === 410 ? 'This link has expired' : 'This link does not work'}</h2>
      <p>${e.message}</p></div></div></div>`;
  }
  // Local UI state: name fix, optional drawing, code step.
  const st = { name: '', person: '', showName: false, showDraw: false, step: 'review', email: v.verify?.email || '', codeTarget: null, devCode: null, pad: null };

  const paint = () => {
    const s = v.signature;
    if (s.status === 'signed') return paintDone();
    const mine = v.lines.filter(l => l.mine), others = v.lines.filter(l => !l.mine);
    const sh = shareOf(mine);
    const signerName = s.company ? (st.person || 'you') : (st.name || s.name);
    const consent = `${v.consent_line} Signing as ${signerName}${s.company ? ` for ${s.company}; I confirm I have authority to sign for ${s.company}` : ''}.`;
    const signedCount = v.signers.filter(x => x.status === 'signed').length;
    el.innerHTML = html`<div class="sp-wrap sp-one">${topBar(html`<span class="badge ok">${icon('lock')} Secure</span>`)}
      <div class="card sp-ask">
        <div class="sp-ask-head">
          <div class="row" style="gap:12px">${art(v.song.title + v.song.artist_credit, { url: v.song.artwork_url, label: v.song.title })}
            <div style="min-width:0"><div class="eyebrow">Split sheet · version ${v.split.version}</div><div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${v.song.artist_credit}${v.song.isrc ? ` · ISRC ${v.song.isrc}` : ''}</div></div></div>
          <h1 class="sp-ask-title"><b>${v.sender}</b> wants to lock in the splits for <span class="grad-text">${v.song.title}</span></h1>
        </div>
        ${v.readOnly ? html`<div style="padding:0 22px 22px">${closedPanel(v)}</div>` : html`
        <div class="sp-yours">
          <div class="label">${s.company ? `${s.company}'s share` : s.on_behalf ? `For ${s.on_behalf.title}` : 'Your share'}</div>
          ${sh.same ? html`<div class="sp-big">${pct(sh.m)}</div><div class="small muted">of the master and the publishing</div>`
            : html`<div class="row" style="gap:26px;justify-content:center"><div><div class="sp-big sm">${pct(sh.m)}</div><div class="small muted">master</div></div><div><div class="sp-big sm">${pct(sh.p)}</div><div class="small muted">publishing</div></div></div>`}
        </div>
        ${others.length ? html`<div class="sp-others">${others.map((l, i) => { const o = shareOf([l]); return html`<div class="sp-other"><span class="avatar sp-av" style="background:${inkColor(shareColors[(i + 1) % shareColors.length])}" aria-hidden="true">${initials(l.name)}</span><span class="grow">${l.name}${l.entity === 'company' ? html` <span class="faint small">company</span>` : ''}</span><b class="num">${o.same ? pct(o.m) : `${pct(o.m)} / ${pct(o.p)}`}</b></div>`; })}
          <div class="tiny muted" style="margin-top:6px">${signedCount} of ${v.signers.length} agreed${!sh.same || others.some(l => l.master_bps !== l.publishing_bps) ? ' · master / publishing' : ''}</div></div>` : ''}
        <div class="sp-act">
          ${s.company ? html`<label class="field"><span>Your name <span class="hint">the person signing for ${s.company}</span></span><input class="input" data-f="person" autocomplete="name" value="${st.person}" placeholder="Full name"></label>` : ''}
          ${st.showName && !s.company ? html`<label class="field"><span>Your full name</span><input class="input" data-f="name" autocomplete="name" value="${st.name || s.name}"></label>` : ''}
          ${st.step === 'email' ? html`<label class="field"><span>Your email <span class="hint">we'll send a 6-digit code to confirm it's you</span></span>
            <input class="input" data-f="email" type="email" inputmode="email" autocomplete="email" value="${st.email}" placeholder="you@example.com"></label>
            <button class="btn btn-primary btn-lg sp-cta" data-act="send-code">Send my code</button>` : ''}
          ${st.step === 'code' ? html`<div class="field"><span>Enter the code we emailed to ${st.codeTarget}</span>
            <input class="input sp-code" data-f="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]*" placeholder="••••••" value="${st.devCode || ''}">
            ${st.devCode ? html`<span class="tiny muted">Email isn't connected on this server, so your code is filled in for you.</span>` : ''}</div>
            <button class="btn btn-primary btn-lg sp-cta" data-act="confirm">${icon('check')} Confirm and sign</button>
            <button class="btn btn-ghost btn-sm" data-act="resend" style="align-self:center">Send a new code</button>` : ''}
          ${st.step === 'review' ? html`<button class="btn btn-primary btn-lg sp-cta" data-act="agree">${icon('sign')} Agree and sign</button>` : ''}
          <p class="sp-consent">${consent}</p>
          ${st.showDraw ? html`<div class="sp-pad"><canvas width="600" height="200" aria-label="Signature pad"></canvas><div class="ph">Draw your signature (optional)</div><button type="button" class="btn btn-ghost btn-sm clr hidden" data-act="clear">Clear</button></div>` : ''}
          <div class="sp-links">
            ${!s.company ? html`<a href="javascript:void 0" data-act="fix-name">Not you? Fix my name</a>` : ''}
            <a href="javascript:void 0" data-act="doc">Full split sheet and terms</a>
            <a href="javascript:void 0" data-act="disclosure">E-sign disclosure</a>
            ${!st.showDraw ? html`<a href="javascript:void 0" data-act="draw">Add a drawn signature</a>` : ''}
          </div>
          <div style="text-align:center"><a href="javascript:void 0" class="small sp-wrong" data-act="decline">Something's not right</a></div>
        </div>`}
      </div>
      <div class="sp-foot tiny faint">${icon('shield')} ${v.verify?.method === 'email_link' ? `Opened from the email we sent to ${v.verify.masked}, which confirms it's you.` : v.verify?.method === 'session' ? `Signed in as ${v.verify.masked}.` : 'We confirm your email with a one-time code before your signature counts.'}
        Every signature is witnessed by Song Passport and sealed in a certificate every party receives. Link expires ${date(s.expires_at)}.</div>
    </div>`.s;
    if (st.showDraw) st.pad = makePad(el.querySelector('.sp-pad'));
    el.querySelector('[data-f=code]')?.focus();
  };

  const body = () => ({ name: st.showName ? st.name : undefined, person_name: v.signature.company ? st.person : undefined, drawn_svg: st.pad?.path() || undefined });
  const finish = async r => {
    v = r;
    window.scrollTo(0, 0);
    // Signing signs you in; refresh the shell, then show the done state on the public page again.
    if (!app.user) { await app.reloadMe().catch(() => {}); app.refresh(); } else paintDone();
  };
  const needPerson = () => { if (v.signature.company && st.person.trim().length < 2) { toast(`Add your name, as the person signing for ${v.signature.company}`, { error: true }); el.querySelector('[data-f=person]')?.focus(); return true; } return false; };
  const sendCode = async btn => {
    const r = await busy(btn, () => api.post(`/api/sign/${key}/code`, { email: st.email || undefined }));
    if (r.needed === false) return agree(btn);
    st.codeTarget = r.target; st.devCode = r.devCode || null; st.step = 'code'; paint();
    if (st.devCode) setTimeout(() => el.querySelector('[data-act=confirm]')?.click(), 450);
    // Android Chrome can read the code from the email-free WebOTP API only for SMS, so we rely on autocomplete here.
  };
  async function agree(btn) {
    if (needPerson()) return;
    const r = await busy(btn, () => api.post(`/api/sign/${key}`, { action: 'sign', ...body() }));
    if (r.need_code) {
      if (v.verify?.reason === 'access_code' || st.email) return sendCode(btn);
      st.step = 'email'; paint(); el.querySelector('[data-f=email]')?.focus(); return;
    }
    await finish(r);
  }
  on(el, 'input', '[data-f]', (e, t) => {
    const f = t.dataset.f;
    if (f === 'code') { t.value = t.value.replace(/\D/g, '').slice(0, 6); if (t.value.length === 6) el.querySelector('[data-act=confirm]')?.click(); return; }
    st[f === 'person' ? 'person' : f] = t.value;
    const c = el.querySelector('.sp-consent');
    if (c && (f === 'name' || f === 'person')) {
      const s = v.signature, nm = s.company ? (st.person || 'you') : (st.name || s.name);
      c.textContent = `${v.consent_line} Signing as ${nm}${s.company ? ` for ${s.company}; I confirm I have authority to sign for ${s.company}` : ''}.`;
    }
  });
  on(el, 'click', '[data-act=agree]', (e, t) => agree(t).catch(() => {}));
  on(el, 'click', '[data-act=send-code]', (e, t) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(st.email)) return toast('Enter your email', { error: true });
    sendCode(t).catch(() => {});
  });
  on(el, 'click', '[data-act=resend]', (e, t) => sendCode(t).catch(() => {}));
  on(el, 'click', '[data-act=confirm]', async (e, t) => {
    const code = el.querySelector('[data-f=code]').value;
    if (code.length !== 6) return toast('Enter the 6-digit code', { error: true });
    if (needPerson()) return;
    const r = await busy(t, () => api.post(`/api/sign/${key}`, { action: 'sign', code, ...body() })).catch(() => null);
    if (r) await finish(r);
  });
  on(el, 'click', '[data-act=fix-name]', () => { st.showName = true; st.name = st.name || v.signature.name; paint(); el.querySelector('[data-f=name]')?.focus(); });
  on(el, 'click', '[data-act=draw]', () => { st.showDraw = true; paint(); });
  on(el, 'click', '[data-act=doc]', () => modal({ title: 'Split sheet', wide: true, body: documentView(v), actions: [{ label: 'Close' }] }));
  on(el, 'click', '[data-act=disclosure]', () => modal({ title: 'Consent to electronic signatures', body: html`<div class="sp-terms">${v.esign_disclosure}</div>`, actions: [{ label: 'Close' }] }));
  on(el, 'click', '[data-act=decline]', () => modal({
    title: "Something's not right?",
    body: html`<p class="muted" style="margin-bottom:12px">${v.sender} gets your note straight away and can send a fixed version. Nothing is signed.</p>
      <label class="field"><span>What needs to change?</span><textarea class="input" name="reason" maxlength="1000" placeholder="e.g. My share should be 30%, as we agreed"></textarea></label>`,
    actions: [{ label: 'Cancel' }, { label: 'Send note', danger: true, onClick: async (close, m) => {
      const reason = m.querySelector('[name=reason]').value.trim();
      if (!reason) throw new Error('Say what needs to change');
      v = await api.post(`/api/sign/${key}`, { action: 'decline', reason });
      close(); paint(); toast(`Sent. ${v.sender} has your note.`);
    } }]
  }));

  const paintDone = () => {
    const s = v.signature, signed = v.signers.filter(x => x.status === 'signed').length, executed = v.split.status === 'executed' || v.split.status === 'superseded';
    const who = s.signer_person || s.typed_name;
    el.innerHTML = html`<div class="sp-wrap sp-one">${topBar()}
      <div class="card sp-done fade-in">
        <div class="sp-confetti" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => raw(`<i style="--i:${i};background:${shareColors[i % shareColors.length]}"></i>`))}</div>
        <div class="sp-sealmark">${icon('check')}</div>
        <div class="eyebrow">${v.song.title}</div>
        <h1 style="margin-top:8px">${executed ? 'Locked in.' : "You're in."}</h1>
        <p class="muted" style="margin:10px auto 0;max-width:420px;font-size:15.5px">${executed ? "Everyone agreed. The split is sealed and in force, and the certificate is on its way to everyone's inbox." : `You agreed as ${who}${s.company ? ` for ${s.company}` : ''}. We'll let you know when everyone else has.`}</p>
        <div class="sp-progress" title="${signed} of ${v.signers.length} agreed">${v.signers.map(x => html`<i class="${x.status === 'signed' ? 'on' : ''}"></i>`)}</div>
        <div class="small" style="margin-top:8px;font-weight:600">${signed} of ${v.signers.length} agreed</div>
        <div style="margin-top:28px"><a class="btn btn-primary btn-lg" href="#${v.search}">${icon('search')} See your other songs</a></div>
        ${executed ? html`<div style="margin-top:10px"><a class="btn btn-ghost btn-sm" href="#/certificate/${v.split.id}">${icon('file')} Certificate</a></div>` : ''}
      </div></div>`.s;
  };
  paint();
}, { public: true, title: 'Agree the splits' });

function documentView(v) {
  return html`<div class="stack">
    <div><b>${v.song.title}</b> <span class="muted">· ${v.song.artist_credit}</span>
      <div class="row wrap" style="margin-top:6px">${v.song.isrc ? html`<span class="chip">ISRC ${v.song.isrc}</span>` : ''}${v.song.iswc ? html`<span class="chip">ISWC ${v.song.iswc}</span>` : ''}<span class="chip">Version ${v.split.version}</span></div></div>
    ${v.split.note ? html`<div class="callout">${icon('info')}<div class="small">${v.split.note}</div></div>` : ''}
    <table class="sp-table"><thead><tr><th>Party</th><th class="r">Master</th><th class="r">Publishing</th></tr></thead><tbody>
      ${v.lines.map(l => html`<tr class="${l.mine ? 'mine' : ''}"><td><div style="font-weight:600">${l.name}${l.mine ? html` <span class="badge accent plain">You</span>` : ''}</div>
        <div class="tiny muted">${[l.entity === 'company' ? 'Company' : '', ...(l.roles || [])].filter(Boolean).join(' · ')}${l.administered_by ? ` · administered by ${l.administered_by}` : ''}</div></td>
        <td class="r">${pct(l.master_bps)}</td><td class="r">${pct(l.publishing_bps)}</td></tr>`)}
    </tbody></table>
    <div><div class="label" style="margin-bottom:6px">Terms ${v.terms_version ? html`<span class="faint mono tiny">${v.terms_version}</span>` : ''}</div><div class="sp-terms">${v.terms}</div></div>
    <div><div class="label" style="margin-bottom:4px">Document fingerprint (SHA-256)</div><div class="hash">${v.split.doc_hash || '—'}</div>
      ${v.split.previous_version_hash ? html`<div class="label" style="margin:10px 0 4px">Replaces signed version</div><div class="hash">${v.split.previous_version_hash}</div>` : ''}</div>
  </div>`;
}

function closedPanel(v) {
  const s = v.signature;
  if (s.status === 'declined') return html`<div class="callout crit">${icon('x')}<div><b>You said something's not right</b><div class="small">“${s.decline_reason}”</div><div class="small" style="margin-top:4px">${v.sender} can send a fixed version; you'll get a new email.</div></div></div>`;
  return html`<div class="callout warn">${icon('info')}<div><b>This version is closed</b><div class="small">${v.split.status === 'voided' ? 'It was changed or withdrawn, or someone said something is not right.' : 'It is no longer waiting for signatures.'}${v.newer ? ` Version ${v.newer.version} replaces it; look for a newer email.` : ''}</div></div></div>`;
}

// Share links after sending: copy link or native share sheet, per person (also used by the quick composer).
export function shareLinksView(links, { song } = {}) {
  return html`<div class="sp-shares">${links.map(l => html`<div class="sp-sharerow" data-sig="${l.signature_id}">
    ${avatar(l.name)}<div class="grow" style="flex:1;min-width:0"><div style="font-weight:650">${l.name}${l.you ? html` <span class="muted small">(you)</span>` : ''}</div>
      <div class="tiny muted">${l.share}${l.you ? ' · agreed when you sent it' : l.emailed ? ` · emailed to ${l.email}` : ' · no email: send them the link'}</div></div>
    ${l.you ? html`<span class="badge ok">Agreed</span>` : html`<div class="row" style="gap:6px">
      <button class="btn ${l.emailed ? '' : 'btn-primary'} btn-sm" data-act="copy-link" data-url="${l.url}" data-msg="${l.message || ''}">${icon('copy')} Copy link</button>
      ${navigator.share ? html`<button class="btn btn-ghost btn-sm btn-icon" data-act="share-link" data-url="${l.url}" data-msg="${l.message || ''}" data-title="${song || 'Splits'}" title="Share">${icon('upload')}</button>` : ''}</div>`}
  </div>`)}</div>`;
}
export function wireShareLinks(el) {
  on(el, 'click', '[data-act=copy-link]', async (e, t) => {
    try { await navigator.clipboard.writeText(t.dataset.msg || t.dataset.url); } catch { prompt('Copy this link', t.dataset.url); }
    t.innerHTML = html`${icon('check')} Copied`.s; t.classList.remove('btn-primary');
    toast('Link copied with a short note. Paste it anywhere.');
  });
  on(el, 'click', '[data-act=share-link]', (e, t) => navigator.share({ title: t.dataset.title, text: t.dataset.msg.replace(t.dataset.url, '').trim(), url: t.dataset.url }).catch(() => {}));
}

// Signature pad: strokes in a 600x200 coordinate space, exported as an SVG path (M/L only).
function makePad(box) {
  const c = box.querySelector('canvas'), g = c.getContext('2d'), ph = box.querySelector('.ph'), clr = box.querySelector('[data-act=clear]');
  const strokes = [];
  let cur = null;
  const pt = e => { const r = c.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * 600 * 10) / 10, Math.round((e.clientY - r.top) / r.height * 200 * 10) / 10]; };
  const draw = () => {
    g.clearRect(0, 0, 600, 200);
    g.lineWidth = 4.5; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = getComputedStyle(box).color.includes('245') ? '#c7d0ff' : '#1b2a7a';
    for (const s of strokes) { g.beginPath(); s.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); if (s.length === 1) g.lineTo(s[0][0] + .1, s[0][1]); g.stroke(); }
  };
  c.addEventListener('pointerdown', e => { e.preventDefault(); c.setPointerCapture(e.pointerId); cur = [pt(e)]; strokes.push(cur); ph.classList.add('hidden'); clr.classList.remove('hidden'); draw(); });
  c.addEventListener('pointermove', e => { if (!cur) return; const p = pt(e), l = cur[cur.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 1.5) { cur.push(p); draw(); } });
  const end = () => { cur = null; };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  clr.addEventListener('click', () => { strokes.length = 0; draw(); ph.classList.remove('hidden'); clr.classList.add('hidden'); });
  return { path: () => strokes.filter(s => s.length).map(s => 'M' + s.map(([x, y]) => `${x} ${y}`).join(' L')).join(' ') };
}

// ======================================================================
// Certificate (public, printable)
// ======================================================================
const VERIFY_LABEL = { email_link: 'Opened the link emailed to them', email_code: 'Email one-time code', session: 'Signed-in verified account', sms_reply: 'Text reply (weaker)' };
const DELIVERY_LABEL = { email: 'Email from Song Passport', shared: 'Link shared by the sender', session: 'In the app' };
const rosette = () => raw(`<svg class="sp-rosette" viewBox="0 0 120 120" aria-hidden="true"><defs>
  <linearGradient id="spg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B44B8"/><stop offset="1" stop-color="#6A52E0"/></linearGradient>
  <path id="spc" d="M60 60 m-41 0 a41 41 0 1 1 82 0 a41 41 0 1 1 -82 0"/></defs>
  ${Array.from({ length: 24 }, (_, i) => `<path d="M60 4 L64 16 L56 16 Z" fill="url(#spg)" opacity=".9" transform="rotate(${i * 15} 60 60)"/>`).join('')}
  <circle cx="60" cy="60" r="48" fill="url(#spg)"/><circle cx="60" cy="60" r="45" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
  <circle cx="60" cy="60" r="31" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
  <text font-family="-apple-system, BlinkMacSystemFont, Helvetica, sans-serif" font-size="7.4" font-weight="700" letter-spacing="2.2" fill="#fff"><textPath href="#spc">SONG PASSPORT · SEALED · ED25519 ·</textPath></text>
  <path d="M48 61 l8 8 l16 -18" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`);

app.route('/certificate/:id', async ({ el, params }) => {
  let d;
  try { d = await api(`/api/splits/${encodeURIComponent(params.id)}/certificate/view`); }
  catch (e) { return html`<div class="sp-wrap" style="max-width:520px">${topBar()}<div class="card card-pad"><div class="empty"><div class="icon">${icon('file')}</div><h2 class="h3">No certificate</h2><p>${e.message}</p></div></div></div>`; }
  const { certificate: c, song, verification } = d;
  const doc = c.doc;
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(c, null, 2)], { type: 'application/json' }));
    a.download = `split-certificate-${song.title.replace(/[^\w]+/g, '-').toLowerCase()}-v${c.version}.json`;
    a.click();
  };
  el.innerHTML = html`<div class="sp-wrap" style="max-width:920px">
    ${topBar(html`<div class="sp-cert-actions"><button class="btn btn-sm" data-act="print">${icon('download')} Print / PDF</button><button class="btn btn-sm" data-act="json">${icon('file')} JSON</button><a class="btn btn-sm" href="#/certificate/${c.split_id}/lod" title="${GLOSSARY['Letter of direction']}">${icon('receipt')} Letter of direction</a><a class="btn btn-sm" href="#/verify?id=${c.split_id}">${icon('shield')} Verify</a></div>`)}
    <div class="sp-verify ${verification.ok ? 'ok' : 'bad'} sp-noprint" style="margin-bottom:18px" id="sp-vbox">
      ${icon(verification.ok ? 'shield' : 'alert')}<div style="flex:1"><b>${verification.ok ? 'Valid certificate' : 'This certificate does not verify'}</b>
      <div class="small" id="sp-vsub">${verification.ok ? `Server check passed (${verification.checks.length} checks). Checking again in your browser…` : verification.checks.filter(x => !x.ok).map(x => x.label).join(', ')}</div></div>
      ${anchorBadge(c.anchor)}</div>
    <article class="sp-paper">
      ${c.status === 'superseded' ? html`<div class="sp-ribbon">Superseded</div>` : ''}
      ${rosette()}
      <div class="lbl head">Song Passport · Certificate of completion · executed split</div>
      <h1 class="serif" style="margin-top:14px;max-width:72%">${song.title}${song.version_title ? html` <span style="font-weight:400">(${song.version_title})</span>` : ''}</h1>
      <div class="serif" style="font-size:20px;margin-top:6px">${song.artist_credit}</div>
      <div class="row wrap mut small" style="margin-top:14px;gap:18px">
        ${doc.song.isrc ? html`<span><span class="lbl">ISRC</span> <span class="mono">${doc.song.isrc}</span></span>` : ''}
        ${doc.song.iswc ? html`<span><span class="lbl">ISWC</span> <span class="mono">${doc.song.iswc}</span></span>` : ''}
        <span><span class="lbl">Version</span> <span class="mono">${c.version}</span></span>
        <span><span class="lbl">In force from</span> ${date(c.execution.executed_at)}</span>
      </div>
      ${c.status === 'superseded' && c.superseded_by ? html`<p class="small" style="margin-top:14px;color:#a86500">Replaced by <a href="#/certificate/${c.superseded_by.id}">version ${c.superseded_by.version}</a>. This record stays valid as history.</p>` : ''}
      <div class="rule"></div>
      <table><thead><tr><th>Party</th><th>Roles</th><th class="r">Master</th><th class="r">Publishing</th></tr></thead><tbody>
        ${doc.lines.map(l => html`<tr><td class="serif" style="font-size:16px;font-weight:600">${l.name}${l.ipi || l.administered_by ? html`<div class="mono" style="font-size:11px;font-weight:400;color:#6b6b7b">${[l.ipi && `IPI ${l.ipi}`, l.pro, l.administered_by && `Administered by ${l.administered_by}`].filter(Boolean).join(' · ')}</div>` : ''}</td>
          <td class="small mut" style="text-transform:capitalize">${[l.entity === 'company' ? 'Company' : '', ...(l.roles || [])].filter(Boolean).join(', ') || '—'}</td><td class="r">${pct(l.master_bps)}</td><td class="r">${pct(l.publishing_bps)}</td></tr>`)}
        <tr><td colspan="2" class="lbl" style="border-bottom:0">Total</td><td class="r" style="border-bottom:0;font-weight:600">${pct(doc.totals?.master_bps)}</td><td class="r" style="border-bottom:0;font-weight:600">${pct(doc.totals?.publishing_bps)}</td></tr>
      </tbody></table>
      <div class="rule"></div>
      <div class="lbl" style="margin-bottom:18px">Signed by every party</div>
      <div class="sp-sigs">${c.signatures.map(s => html`<div class="sp-sigblock">
        <div class="ink">${s.drawn_svg ? raw(`<svg viewBox="0 0 600 200" preserveAspectRatio="xMinYMax meet"><path d="${esc(s.drawn_svg)}" fill="none" stroke="#1b2a7a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`) : html`<span class="sp-script">${s.payload.typed_name}</span>`}</div>
        <div class="serif" style="font-weight:600;margin-top:8px">${s.payload.signer_person || s.payload.typed_name}${s.payload.company ? html` <span style="font-weight:400">for ${s.payload.company}</span>` : ''}</div>
        ${s.payload.company ? html`<div class="tiny mut">Confirmed authority to sign for ${s.payload.company}</div>` : ''}
        <div class="tiny mut">${s.payload.on_behalf_song_id ? 'For the original song · ' : ''}${dateTime(s.payload.signed_at)}${s.payload.verification ? ` · ${VERIFY_LABEL[s.payload.verification] || s.payload.verification}` : ''}</div>
        <div class="hashv" style="margin-top:4px;font-size:10.5px" title="Platform attestation, not a personal key">Witnessed by Song Passport · ${s.platform_signature.slice(0, 16)}…</div></div>`)}</div>
      <p class="tiny mut" style="margin-top:16px">${c.witness_note || ''}</p>
      <div class="rule"></div>
      <div class="grid grid-2" style="gap:16px 30px">
        <div><div class="lbl">Document SHA-256</div><div class="hashv">${c.doc_hash}</div></div>
        <div><div class="lbl">Certificate SHA-256</div><div class="hashv">${c.certificate_hash}</div></div>
        <div><div class="lbl">Platform key</div><div class="hashv">${c.algorithm} · ${c.key_id}</div></div>
        <div><div class="lbl">${doc.previous_version_hash ? 'Replaces document' : 'Prior version'}</div><div class="hashv">${doc.previous_version_hash || 'None, first signed split'}</div></div>
        <div><div class="lbl">Timestamp</div><div class="hashv">${c.timestamp ? (c.timestamp.kind === 'rfc3161' ? `RFC 3161 · ${c.timestamp.gen_time} · ${c.timestamp.imprint_ok ? 'imprint verified' : 'imprint MISMATCH'}` : `Platform timestamp · ${c.timestamp.gen_time} (no trusted timestamp authority configured)`) : '—'}</div></div>
        <div><div class="lbl">Terms</div><div class="hashv">${doc.terms_version || 'v1'} · ${doc.esign_version || ''}</div></div>
      </div>
      <div class="rule"></div>
      <div class="lbl" style="margin-bottom:14px">Audit trail</div>
      <div class="sp-sigs">${(c.audit || []).map(a => html`<div><div class="serif" style="font-weight:600;margin-bottom:6px">${a.signer}${a.company ? html` <span style="font-weight:400">for ${a.company}</span>` : ''}</div>
        <table class="sp-audit"><tbody>
          <tr><td>Delivered by</td><td>${DELIVERY_LABEL[a.delivered_by] || a.delivered_by || '—'}</td></tr>
          <tr><td>Verified by</td><td>${VERIFY_LABEL[a.verification] || a.verification || '—'}${a.address ? ` · ${a.address}` : ''}</td></tr>
          <tr><td>Viewed</td><td>${dateTime(a.viewed_at) || '—'}</td></tr>
          <tr><td>Consented</td><td>${dateTime(a.consented_at) || '—'}</td></tr>
          <tr><td>Signed</td><td>${dateTime(a.signed_at)}</td></tr>
          <tr><td>IP address</td><td class="mono">${a.ip || '—'}</td></tr>
          <tr><td>Device</td><td>${a.device || '—'}</td></tr>
          ${a.consent_text ? html`<tr><td>Agreed to</td><td>“${a.consent_text}”</td></tr>` : ''}
        </tbody></table></div>`)}</div>
      <p class="tiny mut" style="margin-top:28px;line-height:1.6">Anyone can check this certificate: re-hash the document, then verify each signature and the platform seal with the public key at ${c.public_key_url}. Song Passport · ${c.split_id}</p>
    </article>
    <div class="card card-pad sp-noprint" style="margin-top:18px" id="sp-browser"><div class="row between"><h2 class="h3">Checked in your browser</h2><span class="small muted">Independent of our server</span></div><div class="small muted" style="margin-top:6px">Running…</div></div>
  </div>`.s;
  on(el, 'click', '[data-act=print]', () => window.print());
  on(el, 'click', '[data-act=json]', download);
  const b = await verifyInBrowser(c).catch(e => ({ ok: false, checks: [{ label: 'Browser check failed', ok: false, detail: e.message }] }));
  el.querySelector('#sp-browser').innerHTML = html`<div class="row between"><h2 class="h3">Checked in your browser</h2>${b.ok ? html`<span class="badge ok">Passed</span>` : html`<span class="badge crit">Failed</span>`}</div>
    <div style="margin-top:10px">${checkList(b.checks)}</div>${b.supported === false ? html`<p class="tiny muted" style="margin-top:8px">Your browser cannot check Ed25519 signatures itself, so only the hashes were checked here. The server check above covers the signatures.</p>` : ''}`.s;
  const sub = el.querySelector('#sp-vsub');
  if (verification.ok && sub) sub.textContent = b.ok ? `Passed on our server and again in your browser · ${c.signatures.length} signatures · key ${c.key_id}` : 'Server check passed, but your browser check did not. See below.';
}, { public: true, title: 'Split certificate' });

// ======================================================================
// Letter of direction (printable, from an executed split)
// ======================================================================
app.route('/certificate/:id/lod', async ({ el, params }) => {
  let d;
  try { d = await api(`/api/splits/${encodeURIComponent(params.id)}/certificate/view`); }
  catch (e) { return html`<div class="sp-wrap" style="max-width:520px">${topBar()}<div class="card card-pad"><div class="empty"><div class="icon">${icon('file')}</div><h2 class="h3">No letter yet</h2><p>${e.message}</p></div></div></div>`; }
  const { certificate: c, song, owner } = d;
  const doc = c.doc;
  const ownerName = owner?.name || doc.issued_by || song.artist_credit;
  const ownerSig = c.signatures.find(s => (s.payload.signer_person || s.payload.typed_name) === ownerName) || c.signatures[0];
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const masterLines = doc.lines.filter(l => l.master_bps > 0), pubLines = doc.lines.filter(l => l.publishing_bps > 0);
  el.innerHTML = html`<div class="sp-wrap" style="max-width:860px">
    ${topBar(html`<div class="sp-cert-actions"><a class="btn btn-sm" href="#/certificate/${c.split_id}">${icon('back')} Certificate</a><button class="btn btn-sm btn-primary" data-act="print">${icon('download')} Print / PDF</button></div>`)}
    <div class="callout info sp-noprint" style="margin-bottom:16px">${icon('info')}<div class="small">Fill in who it's addressed to, then print or save as PDF and send it to the distributor or label. Fields with a dashed underline are editable.</div></div>
    <article class="sp-paper sp-lod">
      <div class="row between wrap" style="align-items:flex-start">
        <div><div class="lbl">Letter of direction</div><div class="serif" style="font-size:15px;margin-top:6px">${ownerName}</div></div>
        <div class="mut small" style="text-align:right">${today}</div>
      </div>
      <div style="margin-top:28px" class="stack-sm">
        <div><span class="lbl">To</span> <span class="sp-edit" contenteditable="true" data-ph="Distributor or label name"></span></div>
        <div><span class="lbl">Attn</span> <span class="sp-edit" contenteditable="true" data-ph="Royalties / accounts department"></span></div>
        <div><span class="lbl">Account</span> <span class="sp-edit" contenteditable="true" data-ph="Artist / account number"></span></div>
      </div>
      <h2 class="serif" style="margin-top:30px;font-size:22px;font-weight:600">Re: “${song.title}” by ${song.artist_credit}${doc.song.isrc ? html` <span class="mono" style="font-size:13px;font-weight:400">· ISRC ${doc.song.isrc}</span>` : ''}${doc.song.iswc ? html` <span class="mono" style="font-size:13px;font-weight:400">· ISWC ${doc.song.iswc}</span>` : ''}</h2>
      <p style="margin-top:16px;line-height:1.7">I, ${ownerName}, direct you to pay the royalties you collect for the recording identified above to the parties below, in the shares shown, effective from ${date(c.execution.executed_at)} until you receive written notice from me otherwise. Each payee's share is a share of the income you would otherwise pay to me for this recording.</p>
      ${masterLines.length ? html`<div class="lbl" style="margin:24px 0 10px">Master (sound recording) income</div>
      <table><thead><tr><th>Payee</th><th>Administered by</th><th class="r">Share</th></tr></thead><tbody>
        ${masterLines.map(l => html`<tr><td class="serif" style="font-weight:600">${l.name}${l.entity === 'company' ? html` <span class="mut small" style="font-weight:400">(company)</span>` : ''}</td><td class="small mut">${l.administered_by || '—'}</td><td class="r">${pct(l.master_bps)}</td></tr>`)}
      </tbody></table>` : ''}
      ${pubLines.length ? html`<div class="lbl" style="margin:24px 0 10px">Publishing (composition) income, where you collect it</div>
      <table><thead><tr><th>Payee</th><th>Administered by</th><th class="r">Share</th></tr></thead><tbody>
        ${pubLines.map(l => html`<tr><td class="serif" style="font-weight:600">${l.name}${l.ipi ? html` <span class="mono mut" style="font-size:11px;font-weight:400">IPI ${l.ipi}</span>` : ''}</td><td class="small mut">${l.administered_by || l.pro || '—'}</td><td class="r">${pct(l.publishing_bps)}</td></tr>`)}
      </tbody></table>` : ''}
      <p style="margin-top:22px;line-height:1.7">Each payee will send you their own payment and tax details. This direction carries out the split sheet signed electronically by every party on ${date(c.execution.executed_at)} (Song Passport certificate ${c.split_id}, document SHA-256 ${c.doc_hash.slice(0, 16)}…), which you can verify at ${location.origin}/#/verify. It applies between the signers, subject to their existing agreements.</p>
      <div class="sp-sigs" style="margin-top:34px">
        <div class="sp-sigblock">
          <div class="ink">${ownerSig?.drawn_svg ? raw(`<svg viewBox="0 0 600 200" preserveAspectRatio="xMinYMax meet"><path d="${esc(ownerSig.drawn_svg)}" fill="none" stroke="#1b2a7a" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`) : html`<span class="sp-script">${ownerSig ? (ownerSig.payload.signer_person || ownerSig.payload.typed_name) : ownerName}</span>`}</div>
          <div class="serif" style="font-weight:600;margin-top:8px">${ownerName}</div>
          <div class="tiny mut">E-signed ${ownerSig ? dateTime(ownerSig.payload.signed_at) : ''} · witnessed by Song Passport</div>
        </div>
        <div class="sp-sigblock"><div class="ink"></div><div class="serif" style="font-weight:600;margin-top:8px">Signature</div><div class="tiny mut">Only if your distributor asks for a wet signature · Date</div></div>
      </div>
    </article></div>`.s;
  on(el, 'click', '[data-act=print]', () => window.print());
}, { public: true, title: 'Letter of direction' });

// ======================================================================
// Verifier (public)
// ======================================================================
app.route('/verify', async ({ el, query }) => {
  let prefill = '';
  if (query.get('id')) prefill = JSON.stringify(await api(`/api/splits/${encodeURIComponent(query.get('id'))}/certificate`).catch(() => ({})), null, 2);
  el.innerHTML = html`<div class="sp-wrap" style="max-width:820px">${topBar()}
    <div class="stack-lg">
      <div class="stack-sm"><span class="eyebrow">Public verifier</span><h1>Verify a split certificate</h1>
        <p class="muted" style="font-size:15.5px;max-width:620px">Paste a certificate's JSON, or drop the file. We re-hash the document and check every Ed25519 signature against the platform public key, on our server and separately in your browser.</p></div>
      <div class="card card-pad stack">
        <textarea class="input mono" id="vj" style="min-height:220px;font-size:12px" placeholder='{"certificate":"song-passport/split-certificate@1", ...}'>${prefill}</textarea>
        <div class="row wrap between"><label class="btn btn-sm">${icon('upload')} Open file<input type="file" accept="application/json,.json" id="vf" hidden></label>
          <button class="btn btn-primary" data-act="verify">${icon('shield')} Verify</button></div>
      </div>
      <div id="vr"></div>
    </div></div>`.s;
  el.querySelector('#vf').addEventListener('change', async e => { const f = e.target.files[0]; if (f) el.querySelector('#vj').value = await f.text(); });
  const run = async btn => {
    let cert;
    try { cert = JSON.parse(el.querySelector('#vj').value); } catch { return toast('That is not valid JSON', { error: true }); }
    await busy(btn, async () => {
      const [server, browser] = await Promise.all([api.post('/api/verify', cert), verifyInBrowser(cert).catch(e => ({ ok: false, checks: [{ label: 'Browser check failed', ok: false, detail: e.message }] }))]);
      const ok = server.ok && browser.ok;
      el.querySelector('#vr').innerHTML = html`<div class="stack">
        <div class="sp-verify ${ok ? 'ok' : 'bad'}">${icon(ok ? 'shield' : 'alert')}<div><b>${ok ? 'Authentic and unaltered' : 'Does not verify'}</b>
          <div class="small">${ok ? `Every signature checks out against key ${server.key_id}.` : 'Something in this certificate was changed, or it was not issued by this platform.'}
          ${server.on_record ? (server.on_record.exists ? (server.on_record.matches ? ` Matches our record (${server.on_record.status}).` : ' It differs from the record we hold for this split.') : ' We hold no record of this split.') : ''}</div></div></div>
        <div class="grid grid-2">
          <div class="card card-pad"><div class="row between"><h2 class="h3">Server check</h2>${server.ok ? html`<span class="badge ok">Passed</span>` : html`<span class="badge crit">Failed</span>`}</div><div style="margin-top:10px">${checkList(server.checks)}</div></div>
          <div class="card card-pad"><div class="row between"><h2 class="h3">Your browser</h2>${browser.ok ? html`<span class="badge ok">Passed</span>` : html`<span class="badge crit">Failed</span>`}</div><div style="margin-top:10px">${checkList(browser.checks)}</div></div>
        </div>
        ${cert.split_id && server.on_record?.exists ? html`<a class="btn" href="#/certificate/${cert.split_id}" style="align-self:flex-start">${icon('file')} Open the certificate</a>` : ''}
      </div>`.s;
    }).catch(() => {});
  };
  on(el, 'click', '[data-act=verify]', (e, t) => run(t));
  if (prefill && prefill !== '{}') run(el.querySelector('[data-act=verify]'));
}, { public: true, title: 'Verify a certificate' });

// ======================================================================
// Signatures queue
// ======================================================================
app.nav({ id: 'signatures', label: 'Signatures', href: '/signatures', icon: 'sign', section: 'Passport', order: 20, auth: true });

app.route('/signatures', async ({ el }) => {
  const load = () => api('/api/signatures');
  let d = await load();
  const paint = () => {
    el.innerHTML = html`<div class="sp-page"><div class="page-head"><div><h1>Signatures</h1><p class="lede">Splits waiting for your signature, and the ones you've sent out.</p></div></div>
    <div class="grid grid-3" style="margin-bottom:22px">
      <div class="card stat"><div class="label">${icon('sign')} Waiting for you</div><div class="value">${d.waiting.length}</div></div>
      <div class="card stat"><div class="label">${icon('clock')} Out for signature</div><div class="value">${d.sent.length}</div><div class="sub">${d.sent.reduce((s, v) => s + v.signatures.filter(x => x.status === 'pending').length, 0)} still to sign</div></div>
      <div class="card stat"><div class="label">${icon('shield')} Recently sealed</div><div class="value">${d.completed.length}</div></div>
    </div>
    <div class="stack-lg">
      <div class="card"><div class="card-head"><h2 class="h3">Waiting for you</h2></div>
        ${d.waiting.length ? html`<div class="list">${d.waiting.map(w => html`<div class="list-item">${art(w.title + w.artist_credit, { url: w.artwork_url, label: w.title })}
          <div class="grow"><div class="title">${w.title}</div><div class="sub">${w.artist_credit} · split v${w.version} · sent ${ago(w.sent_at)}${w.on_behalf_song_id ? ' · on behalf of your song' : ''}</div></div>
          ${w.expired ? html`<span class="badge crit">Expired</span>` : html`<a class="btn btn-primary btn-sm" href="#${w.sign_url}">${icon('sign')} Review and sign</a>`}</div>`)}</div>`
        : html`<div class="empty" style="padding:30px"><div class="icon">${icon('check')}</div><h2 class="h3">Nothing to sign</h2><p>When someone adds you to a split, it shows up here and in your inbox.</p></div>`}
      </div>
      <div class="card"><div class="card-head"><h2 class="h3">Out for signature</h2></div>
        ${d.sent.length ? d.sent.map(v => html`<div style="border-bottom:1px solid var(--line)">
          <div class="list-item" style="border:0"><a href="#/song/${v.song_id}?tab=splits" style="display:contents;color:inherit">${art(v.title + v.artist_credit, { url: v.artwork_url, label: v.title })}
            <div class="grow"><div class="title">${v.title}</div><div class="sub">${v.artist_credit} · v${v.version} · sent ${ago(v.sent_at)} · ${v.signatures.filter(s => s.status === 'signed').length} of ${v.signatures.length} signed</div></div></a>
            <button class="btn btn-sm btn-danger" data-act="void" data-id="${v.id}">Void</button></div>
          ${v.signatures.map(s => html`<div class="sp-signer" style="padding-left:82px">${avatar(s.name, 'sm')}<div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">${s.name}</div>
            <div class="tiny muted">${s.status === 'signed' ? `Signed ${ago(s.signed_at)}` : `${s.contact || 'Link only'} · ${s.viewed_at ? `opened ${ago(s.viewed_at)}` : `sent ${ago(s.last_sent_at)}`} · ${s.reminder_count}/5 reminders`}</div></div>${statusBadge(s.status)}
            ${s.status === 'pending' ? html`<span class="sp-sacts"><button class="btn btn-sm btn-ghost" data-act="copy-sig" data-id="${s.id}" title="Copy their signing link">${icon('copy')}</button><button class="btn btn-sm btn-ghost" data-act="remind" data-id="${s.id}" ${s.reminder_count >= 5 || !s.contact ? 'disabled' : ''}>${icon('mail')} Remind</button></span>` : ''}</div>`)}
        </div>`) : html`<div class="empty" style="padding:30px"><div class="icon">${icon('sign')}</div><h2 class="h3">Nothing out for signature</h2><p>Open one of your songs, set the split on its Splits tab and send it.</p><a class="btn btn-sm" href="#/home" style="margin-top:12px">Go to your songs</a></div>`}
      </div>
      ${d.completed.length ? html`<div class="card"><div class="card-head"><h2 class="h3">Recently sealed</h2></div><div class="list">${d.completed.map(v => html`<a class="list-item" href="#/certificate/${v.id}">
        ${art(v.title + v.artist_credit, { url: v.artwork_url, label: v.title })}<div class="grow"><div class="title">${v.title}</div><div class="sub">${v.artist_credit} · v${v.version} · sealed ${date(v.executed_at)}</div></div><span class="seal" style="padding:4px 10px;font-size:12px">${icon('shield')} Certificate</span></a>`)}</div></div>` : ''}
    </div></div>`.s;
  };
  paint();
  on(el, 'click', '[data-act=remind]', (e, t) => busy(t, async () => { await api.post(`/api/signatures/${t.dataset.id}/remind`); toast('Reminder sent'); d = await load(); paint(); }).catch(() => {}));
  on(el, 'click', '[data-act=copy-sig]', (e, t) => busy(t, async () => {
    const r = await api.post(`/api/signatures/${t.dataset.id}/link`);
    try { await navigator.clipboard.writeText(r.message || r.url); toast('Link copied. Paste it anywhere.'); } catch { prompt('Copy this link', r.url); }
  }).catch(() => {}));
  on(el, 'click', '[data-act=void]', async (e, t) => {
    if (!await confirmDialog('Void this version?', 'Links still waiting stop working. The lines come back as a draft so you can fix and resend.', 'Void version', true)) return;
    await busy(t, async () => { await api.post(`/api/splits/${t.dataset.id}/void`, {}); toast('Voided'); d = await load(); paint(); }).catch(() => {});
  });
}, { auth: true, title: 'Signatures' });
