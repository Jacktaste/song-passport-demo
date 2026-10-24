// Pilot invites. #/join/:code is what a friend lands on from the short link: who invited them, three steps, one button.
// #/invites is the inviter's side: the link and the message to send, and who has joined so far.
import { app, html, api, toast, icon, on, busy, initials, colorFor, ago, shareLink } from '../app.js';

app.nav({ id: 'invites', label: 'Invite artists', href: '/invites', icon: 'users', section: 'Passport', order: 90, auth: true, artist: true });

const STEPS = [
  ['search', 'Find your songs', 'Search your artist name and claim what is yours.'],
  ['shield', 'See what is missing', 'Codes, splits and registrations, checked for you.'],
  ['sign', 'Send your splits', 'Everyone signs from a link in a minute. No account needed.']
];

app.route('/join/:code', async ({ el, params, user }) => {
  let inv;
  try { inv = (await api(`/api/invites/${encodeURIComponent(params.code)}`)).invite; }
  catch { el.innerHTML = html`<div class="empty"><div class="icon">${icon('link')}</div><h2 class="h3">This invite link doesn't work</h2><p class="muted">Check the link, or ask for a new one.</p><p><a class="btn" href="#/home">Go to Audius</a></p></div>`.s; return; }
  if (user && inv.open !== false) {
    try { inv = (await api(`/api/invites/${encodeURIComponent(params.code)}/accept`, { method: 'POST' })).invite; } catch { /* full: still show the page */ }
  }
  const go = user ? `#/search` : `#/signin?next=${encodeURIComponent(`/join/${params.code}`)}`;
  el.innerHTML = html`<div class="join stack-lg" style="max-width:520px;margin:32px auto">
    <div class="card card-pad stack-lg" style="text-align:center">
      <div class="avatar" style="width:72px;height:72px;margin:0 auto;font-size:26px;background:${colorFor(inv.inviter)}">${inv.inviter_photo ? html`<img src="${inv.inviter_photo}" alt="">` : initials(inv.inviter)}</div>
      <div class="stack-sm"><span class="eyebrow">Audius pilot</span>
        <h1 style="font-size:28px">${inv.inviter} invited you</h1>
        <p class="muted">One place that makes sure everyone on your song gets paid. Free, about five minutes.</p></div>
      ${!inv.open && !inv.joined ? html`<div class="callout warn">${icon('alert')}<div>This link is full. Ask ${inv.inviter} for a new one.</div></div>` : ''}
    </div>
    <ol class="card join-steps" style="list-style:none;margin:0;padding:6px 0">
      ${STEPS.map(([ic, t, s], i) => html`<li class="row" style="gap:14px;padding:14px 20px;${i ? 'border-top:.5px solid var(--line)' : ''}">
        <span class="brand-mark" style="width:36px;height:36px;border-radius:11px;flex:none">${icon(ic)}</span>
        <div><b>${t}</b><div class="small muted">${s}</div></div></li>`)}
    </ol>
    ${inv.open || inv.joined || inv.self ? html`<a class="btn btn-primary btn-lg" style="width:100%" href="${go}">${user ? 'Find my songs' : 'Get started'}</a>` : ''}
    ${user ? '' : html`<p class="small muted" style="text-align:center">We email you a sign-in link. No password.</p>`}
  </div>`.s;
}, { title: 'You are invited' });

app.route('/invites', async ({ el }) => {
  const paint = async () => {
    const { invites } = await api('/api/invites');
    el.innerHTML = html`<div class="page-head"><div><h1>Invite artists</h1>
        <p class="muted">Send one link to a few artist friends. You'll see who joins and how far they get.</p></div>
        <button class="btn btn-primary" data-act="new">${icon('plus')} New link</button></div>
      ${!invites.length ? html`<div class="empty"><div class="icon">${icon('users')}</div><h2 class="h3">No invite link yet</h2><p class="muted">Make one link for up to 10 friends.</p></div>` : ''}
      ${invites.map(i => html`<section class="card" style="margin-bottom:16px" data-code="${i.code}">
        <div class="card-head"><div><h2 class="h3">${i.label || 'Invite link'}</h2>
          <div class="small muted">${i.used} of ${i.max_uses} joined${i.closed_at ? ' · closed' : ''}</div></div>
          ${i.closed_at ? '' : html`<button class="btn btn-ghost btn-sm" data-act="close">Close link</button>`}</div>
        <div class="card-pad stack">
          <label class="field"><span>Message to send</span><textarea class="input" rows="4" readonly data-f="msg">${i.message}\n${i.url}</textarea></label>
          <div class="row wrap"><button class="btn btn-primary" data-act="copy-msg">${icon('copy')} Copy message and link</button>
            <button class="btn" data-act="copy-link">${icon('link')} Copy link only</button></div>
          ${i.joins.length ? html`<div class="stack-sm">${i.joins.map(j => html`<div class="row" style="gap:12px">
            <span class="avatar" style="background:${colorFor(j.email)}">${initials(j.name || j.email)}</span>
            <div style="flex:1;min-width:0"><b>${j.name || j.audius_handle || j.email}</b><div class="small muted">Joined ${ago(j.joined_at)} · ${j.claims} claim${j.claims === 1 ? '' : 's'} · ${j.songs} song${j.songs === 1 ? '' : 's'}</div></div></div>`)}</div>`
            : html`<p class="small muted">Nobody has joined yet.</p>`}
        </div></section>`)}`.s;
  };
  await paint();
  const card = t => t.closest('[data-code]');
  const find = code => api('/api/invites').then(r => r.invites.find(i => i.code === code));
  on(el, 'click', '[data-act=new]', async (e, t) => {
    await busy(t, () => api('/api/invites', { method: 'POST', body: { label: 'Artist friends', max_uses: 10 } }));
    await paint();
  });
  on(el, 'click', '[data-act=copy-msg]', async (e, t) => {
    const text = card(t).querySelector('[data-f=msg]').value;
    try { await navigator.clipboard.writeText(text); toast('Message copied'); } catch { card(t).querySelector('[data-f=msg]').select(); }
  });
  on(el, 'click', '[data-act=copy-link]', async (e, t) => { const i = await find(card(t).dataset.code); shareLink(i.url, { title: 'Join me on Audius', label: 'Invite link' }); });
  on(el, 'click', '[data-act=close]', async (e, t) => {
    await busy(t, () => api(`/api/invites/${card(t).dataset.code}/close`, { method: 'POST' }));
    await paint();
  });
}, { auth: true, title: 'Invite artists' });
