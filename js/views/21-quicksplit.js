// Quick split (#/send): one screen, song title, people, shares, one "Send".
// Equal split by default, one percentage for master and publishing (an advanced toggle separates them).
// Signed-out senders confirm their email with a 6-digit code inline, then everything is created in one call.
import { app, html, api, toast, icon, on, busy, initials, colorFor, pct } from '../app.js';
import { shareLinksView, wireShareLinks } from './20-splits.js';
import { confirmNewSong } from './10-discover.js';

app.nav({ id: 'send', label: 'Send a split', href: '/send', icon: 'sign', section: 'Passport', order: 2 });

const KEY = 'ob-quick-split';
let lastResult = null;
const uid = () => Math.random().toString(36).slice(2, 9);
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
const toBps = s => { const t = String(s ?? '').trim(); if (t === '') return 0; if (!/^\d{1,3}(\.\d{0,2})?$/.test(t)) return NaN; const n = Math.round(parseFloat(t) * 100); return n > 10000 ? NaN : n; };
const toStr = b => { const v = b / 100; return v % 1 ? v.toFixed(2).replace(/0$/, '') : String(v); };
function equal(n) { const base = Math.floor(10000 / n), out = Array(n).fill(base); for (let i = 0; i < 10000 - base * n; i++) out[i]++; return out; }

if (!document.getElementById('qs-style')) {
  const st = document.createElement('style');
  st.id = 'qs-style';
  st.textContent = `
  .qs { max-width:620px; margin:0 auto; }
  .qs-card { padding:22px; }
  .qs-title { width:100%; border:0; background:transparent; font:700 clamp(24px, 6vw, 32px)/1.15 var(--display); letter-spacing:-.03em; padding:4px 0 10px; outline:none; border-bottom:1.5px solid var(--line); }
  .qs-title:focus { border-bottom-color:var(--accent); }
  .qs-row { display:grid; grid-template-columns:36px minmax(0,1fr) 92px 28px; gap:10px; align-items:center; padding:10px 0; border-bottom:1px solid var(--line); }
  .qs-row.sep { grid-template-columns:36px minmax(0,1fr) 78px 78px 28px; }
  .qs-row .who { display:flex; flex-direction:column; gap:4px; min-width:0; }
  .qs-row input.n { font-weight:600; }
  .qs-row input { border:0; background:transparent; padding:4px 2px; outline:none; width:100%; min-width:0; }
  .qs-row input.e { font-size:13px; color:var(--muted); }
  .qs-row input:focus { box-shadow: 0 1.5px 0 var(--accent); }
  .qs-row .pc { position:relative; }
  .qs-row .pc input { text-align:right; padding-right:20px; font:600 17px var(--mono); border:1px solid var(--line-strong); border-radius:10px; padding-top:8px; padding-bottom:8px; background:var(--surface); }
  .qs-row .pc input.bad { border-color:var(--crit); }
  .qs-row .pc::after { content:"%"; position:absolute; right:8px; top:50%; transform:translateY(-50%); color:var(--muted); font-size:13px; pointer-events:none; }
  .qs-row .pc small { position:absolute; left:8px; top:3px; font-size:9.5px; font-weight:700; letter-spacing:.06em; color:var(--faint); text-transform:uppercase; pointer-events:none; }
  .qs-row.ghost .avatar { background:var(--surface-3) !important; color:var(--faint); }
  .qs-row.ghost .pc, .qs-row.ghost .x { visibility:hidden; }
  .qs-x { border:0; background:none; color:var(--faint); cursor:pointer; padding:4px; }
  .qs-meta { display:flex; flex-wrap:wrap; gap:8px 14px; align-items:center; justify-content:space-between; margin-top:12px; font-size:13px; }
  .qs-meta a { color:var(--muted); text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
  .qs-send { position:sticky; bottom:0; padding:14px 0 6px; background:linear-gradient(to top, var(--bg) 70%, transparent); margin-top:8px; z-index:5; }
  .qs-send .btn { width:100%; padding:16px; font-size:17px; border-radius:16px; }
  .qs-consent { text-align:center; font-size:12.5px; color:var(--muted); margin-top:8px; }
  .qs-code { font:600 28px var(--mono); letter-spacing:.4em; text-align:center; padding:14px; }
  .qs-sent-head { text-align:center; padding:26px 22px 8px; }
  .qs-sent-head .ok { width:64px; height:64px; border-radius:50%; margin:0 auto 14px; display:grid; place-items:center; background:var(--grad); color:#fff; box-shadow:var(--shadow); }
  .qs-sent-head .ok svg { width:32px; height:32px; stroke-width:2.4; }
  @media (max-width:520px) {
    .qs-card { padding:18px 16px; }
    .qs-row { grid-template-columns:32px minmax(0,1fr) 84px 24px; gap:8px; }
    .qs-row.sep { grid-template-columns:32px minmax(0,1fr) 66px 66px 24px; }
  }`;
  document.head.appendChild(st);
}

app.route('/send', async ({ el, user }) => {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch {}
  const st = saved || { title: '', separate: false, manual: false, rows: [{ k: uid(), name: user?.name || '', email: '', s: '100', m: '100', p: '100' }] };
  if (user && !st.rows[0].name) st.rows[0].name = user.name || '';
  let step = 'compose', codeFor = '', devCode = null;
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch {} };
  const named = () => st.rows.filter((r, i) => i === 0 || r.name.trim());
  // Keep exactly one empty row at the end so adding a person costs no taps.
  const ensureGhost = () => {
    while (st.rows.length > 2 && !st.rows[st.rows.length - 1].name.trim() && !st.rows[st.rows.length - 2].name.trim()) st.rows.pop();
    const last = st.rows[st.rows.length - 1];
    if (st.rows.length === 1 || last.name.trim()) st.rows.push({ k: uid(), name: '', email: '', s: '', m: '', p: '' });
  };
  const rebalance = () => {
    if (st.manual) return;
    const people = named(), eq = equal(people.length);
    people.forEach((r, i) => { r.s = r.m = r.p = toStr(eq[i]); });
    st.rows.filter(r => !people.includes(r)).forEach(r => { r.s = r.m = r.p = ''; });
  };
  const totals = () => {
    const people = named();
    const keys = st.separate ? ['m', 'p'] : ['s'];
    const t = Object.fromEntries(keys.map(k => [k, people.reduce((a, r) => a + (toBps(r[k]) || 0), 0)]));
    const bad = people.some(r => keys.some(k => Number.isNaN(toBps(r[k]))));
    const problems = [];
    if (!st.title.trim()) problems.push('Name the song');
    if (!people[0].name.trim()) problems.push('Add your name');
    if (!user && !isEmail(people[0].email)) problems.push('Add your email so we can confirm it');
    if (bad) problems.push('Shares are percentages, like 25 or 12.5');
    for (const k of keys) if (!bad && t[k] !== 10000 && !(st.separate && t[k] === 0 && Object.values(t).some(x => x === 10000))) problems.push(`${st.separate ? (k === 'm' ? 'Master' : 'Publishing') : 'Shares'} add up to ${pct(t[k])}, not 100%`);
    people.slice(1).forEach(r => { if (r.email && !isEmail(r.email)) problems.push(`Check ${r.name}'s email`); });
    return { t, problems, ok: !problems.length, people };
  };

  const rowHtml = (r, i) => {
    const ghost = i > 0 && !r.name.trim();
    const pc = (k, label) => html`<label class="pc">${st.separate ? html`<small>${label}</small>` : ''}<input data-f="${k}" inputmode="decimal" value="${r[k]}" aria-label="${label} share"></label>`;
    return html`<div class="qs-row ${st.separate ? 'sep' : ''} ${ghost ? 'ghost' : ''}" data-k="${r.k}">
      <div class="avatar" style="background:${colorFor(r.name || 'x')}">${r.name ? initials(r.name) : icon('plus')}</div>
      <div class="who">
        <input class="n" data-f="name" value="${r.name}" placeholder="${i === 0 ? 'Your name' : i === 1 ? 'Who else is on it?' : 'Add someone'}" autocomplete="${i === 0 ? 'name' : 'off'}" aria-label="Name">
        ${i === 0 && user ? html`<span class="tiny muted" style="padding:0 2px">You · agree when you send</span>`
          : html`<input class="e" data-f="email" type="email" inputmode="email" value="${r.email}" placeholder="${i === 0 ? 'Your email (we send you a code)' : 'Email (optional)'}" autocomplete="${i === 0 ? 'email' : 'off'}" aria-label="Email">`}
      </div>
      ${st.separate ? html`${pc('m', 'Master')}${pc('p', 'Pub')}` : pc('s', 'Share')}
      ${i === 0 ? html`<span></span>` : html`<button class="qs-x x" data-act="rm" aria-label="Remove">${icon('x')}</button>`}
    </div>`;
  };

  const paintCompose = () => {
    ensureGhost(); rebalance(); save();
    const t = totals();
    const n = t.people.length - 1;
    el.innerHTML = html`<div class="qs">
      <div class="page-head" style="margin-bottom:14px"><div><h1 style="font-size:clamp(26px,6vw,34px)">Send a split</h1><p class="lede" style="margin-top:4px">Everyone gets one link, taps Agree, done.</p></div></div>
      <div class="card qs-card">
        <input class="qs-title" data-f="title" value="${st.title}" placeholder="Song title" aria-label="Song title" autocomplete="off">
        <div style="margin-top:6px" id="qs-rows">${st.rows.map(rowHtml)}</div>
        <div class="qs-meta">
          <span>${st.manual ? html`<a data-act="even">Even it out</a>` : html`<span class="badge accent plain">Equal split</span>`}</span>
          <span class="row" style="gap:14px">${'contacts' in navigator && 'select' in (navigator.contacts || {}) ? html`<a data-act="contacts">${icon('users')} From contacts</a>` : ''}
            <a data-act="separate">${st.separate ? 'Same % for master and publishing' : 'Separate master / publishing'}</a></span>
        </div>
      </div>
      <div class="qs-send" id="qs-send">${sendArea(t, n)}</div>
    </div>`.s;
  };
  const sendArea = (t, n) => {
    if (step === 'code') return html`<div class="card card-pad stack">
      <div class="field"><span>Enter the code we emailed to ${codeFor}</span>
        <input class="input qs-code" data-f="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" value="${devCode || ''}"></div>
      ${devCode ? html`<span class="tiny muted">Email isn't connected on this server, so your code is filled in.</span>` : ''}
      <button class="btn btn-primary" data-act="verify">${icon('check')} Confirm and send</button>
      <button class="btn btn-ghost btn-sm" data-act="back" style="align-self:center">Use a different email</button></div>`;
    return html`<button class="btn btn-primary" data-act="send" aria-disabled="${t.ok ? 'false' : 'true'}">${icon('sign')} ${n > 0 ? `Send to ${n} ${n === 1 ? 'person' : 'people'}` : 'Send'}</button>
      <div class="qs-consent" id="qs-msg">${t.ok ? 'Sending signs it as you: I agree to these splits and to signing electronically.' : html`<span style="color:var(--crit)">${t.problems[0]}</span>`}</div>`;
  };
  const repaintSend = () => {
    const t = totals();
    el.querySelector('#qs-send').innerHTML = sendArea(t, t.people.length - 1).s;
    el.querySelectorAll('.qs-row').forEach(rowEl => {
      const r = st.rows.find(x => x.k === rowEl.dataset.k);
      rowEl.querySelectorAll('.pc input').forEach(inp => inp.classList.toggle('bad', Number.isNaN(toBps(r[inp.dataset.f]))));
    });
  };

  on(el, 'input', '[data-f]', (e, t) => {
    const f = t.dataset.f;
    if (f === 'title') { st.title = t.value; save(); return repaintSend(); }
    if (f === 'code') { t.value = t.value.replace(/\D/g, '').slice(0, 6); if (t.value.length === 6) el.querySelector('[data-act=verify]')?.click(); return; }
    const rowEl = t.closest('.qs-row'), r = st.rows.find(x => x.k === rowEl.dataset.k);
    const wasGhost = rowEl.classList.contains('ghost');
    r[f] = t.value;
    if (['s', 'm', 'p'].includes(f)) { st.manual = true; if (!st.separate) { r.m = r.p = r.s; } save(); el.querySelector('.qs-meta span').innerHTML = html`<a data-act="even">Even it out</a>`.s; return repaintSend(); }
    if (f === 'name' && (wasGhost !== !t.value.trim())) {
      // A row became real (or empty): rebalance and add/remove the trailing empty row without losing focus.
      const pos = t.selectionStart;
      paintCompose();
      const again = el.querySelector(`.qs-row[data-k="${r.k}"] [data-f=name]`);
      again?.focus(); again?.setSelectionRange(pos, pos);
      return;
    }
    if (f === 'name') { rowEl.querySelector('.avatar').textContent = initials(t.value); rowEl.querySelector('.avatar').style.background = colorFor(t.value); }
    save(); repaintSend();
  });
  on(el, 'click', '[data-act=rm]', (e, t) => { const k = t.closest('.qs-row').dataset.k; st.rows = st.rows.filter(r => r.k !== k); paintCompose(); });
  on(el, 'click', '[data-act=even]', () => { st.manual = false; paintCompose(); });
  on(el, 'click', '[data-act=separate]', () => { st.separate = !st.separate; if (!st.separate) st.rows.forEach(r => { r.s = r.m; r.p = r.m; }); else st.rows.forEach(r => { r.m = r.p = r.s; }); paintCompose(); });
  on(el, 'click', '[data-act=contacts]', async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'email'], { multiple: true });
      for (const c of picked) {
        const ghost = st.rows[st.rows.length - 1];
        ghost.name = (c.name || [])[0] || (c.email || [])[0] || ''; ghost.email = (c.email || [])[0] || '';
        ensureGhost();
      }
      paintCompose();
    } catch {}
  });
  on(el, 'click', '[data-act=back]', () => { step = 'compose'; paintCompose(); });

  const payload = () => ({
    title: st.title.trim(), separate: st.separate,
    people: named().map((r, i) => ({ name: r.name.trim(), email: i > 0 ? (r.email.trim() || undefined) : undefined,
      share_bps: toBps(r.s) || 0, master_bps: toBps(r.m) || 0, publishing_bps: toBps(r.p) || 0 }))
  });
  const submit = async btn => {
    if (!await confirmNewSong({ title: st.title.trim(), artist: named()[0]?.name.trim() })) return;
    const r = await busy(btn, () => api.post('/api/quick-split', payload()));
    lastResult = r;
    try { sessionStorage.removeItem(KEY); } catch {}
    if (!user) await app.reloadMe().catch(() => {});
    app.go('/send/sent');
  };
  on(el, 'click', '[data-act=send]', async (e, t) => {
    const tt = totals();
    if (!tt.ok) { toast(tt.problems[0], { error: true }); return; }
    if (user) return submit(t).catch(() => {});
    // Signed out: confirm the email with a code, right here.
    const em = named()[0].email.trim();
    const r = await busy(t, () => api.post('/api/auth/code/start', { email: em })).catch(() => null);
    if (!r) return;
    codeFor = r.target; devCode = r.devCode || null; step = 'code';
    repaintSend();
    el.querySelector('[data-f=code]')?.focus();
    if (devCode) setTimeout(() => el.querySelector('[data-act=verify]')?.click(), 450);
  });
  on(el, 'click', '[data-act=verify]', async (e, t) => {
    const code = el.querySelector('[data-f=code]').value;
    if (code.length !== 6) return toast('Enter the 6-digit code', { error: true });
    const ok = await busy(t, () => api.post('/api/auth/code/verify', { email: named()[0].email.trim(), code })).catch(() => null);
    if (ok) await submit(t).catch(() => {});
  });
  paintCompose();
  if (!st.title) el.querySelector('.qs-title')?.focus();
}, { title: 'Send a split' });

app.route('/send/sent', async ({ el }) => {
  const r = lastResult;
  if (!r) return app.go('/send');
  const waiting = r.links.filter(l => !l.you);
  el.innerHTML = html`<div class="qs">
    <div class="card">
      <div class="qs-sent-head"><div class="ok">${icon('check')}</div>
        <h1 style="font-size:clamp(24px,6vw,32px)">${r.executed ? 'Locked in.' : `Sent: ${r.song.title}`}</h1>
        <p class="muted" style="margin-top:6px">${r.executed ? 'Everyone has agreed.' : waiting.every(l => l.emailed) ? `${waiting.length === 1 ? waiting[0].name.split(' ')[0] + ' has' : 'Everyone has'} an email with the link. You can also copy it to send yourself.` : 'Emails are on their way. Copy the link for anyone without an email and send it however you like.'}</p>
      </div>
      <div style="padding:6px 22px 18px">${shareLinksView(r.links, { song: r.song.title })}</div>
      <div class="row wrap" style="padding:0 22px 22px;gap:10px"><a class="btn" href="#/song/${r.song.id}?tab=splits">${icon('passport')} Open the passport</a><a class="btn btn-ghost" href="#/send" data-act="again">${icon('plus')} Send another</a></div>
    </div>
    <p class="tiny muted" style="text-align:center;margin-top:12px">You'll get a notification as each person agrees, and everyone gets the certificate when it's locked in.</p>
  </div>`.s;
  wireShareLinks(el);
  on(el, 'click', '[data-act=again]', () => { lastResult = null; });
}, { title: 'Sent' });
