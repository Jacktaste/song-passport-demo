// One Link: the artist's editor (/onelink), the public page listeners see (/l/:handle) and the listener's
// own Listener Keys (/key). Everything a listener buys here pays into the Song Wallet.
import { app, html, raw, api, toast, modal, money, ago, date, on, busy, formData, esc, comingBar } from '../app.js';
import { ico, KIND, cover, initialsOf, sheet, whereBar, copyText, shortDate } from '../pl.js';

app.nav({ id: 'onelink', label: 'One Link', href: '/onelink', icon: 'link', section: 'Listeners', order: 60, auth: true , artist: true, soon: true });
app.nav({ id: 'key', label: 'Listener Key', href: '/key', icon: 'key', section: 'Listeners', order: 61, auth: true, soon: true });

const SERVICES = [['audius', 'Audius', '#7E1BCC', 'A'], ['spotify', 'Spotify', '#1DB954', 'S'], ['apple', 'Apple Music', '#FA2D48', ''], ['youtube', 'YouTube', '#FF0000', '▶']];
const priceLabel = b => b.kind === 'membership' ? `${money(b.price_minor)}/mo` : money(b.price_minor);

// ---------- the page itself (used live, in the phone preview and in screenshots) ----------
export function renderPage(d, { compact = false, preview = false } = {}) {
  const p = d.page;
  return html`<div class="ol-page ${compact ? 'compact' : ''}" style="--acc:${p.accent}">
    <div class="ol-inner">
      <div class="ol-head">
        <div class="ol-avatar" style="${p.avatar_url ? `background-image:url('${esc(p.avatar_url)}')` : ''}">${p.avatar_url ? '' : initialsOf(p.name)}</div>
        <h1 class="ol-name">${p.name}</h1>
        ${p.tagline ? html`<div class="ol-tag">${p.tagline}</div>` : ''}
        ${d.key ? html`<button class="ol-keypill" data-key><span class="k">${ico('key', 2.2)}</span>Your Listener Key · ${d.key.name}</button>`
          : html`<button class="ol-keypill" data-join><span class="k">${ico('key', 2.2)}</span>Get your Listener Key</button>`}
      </div>
      ${d.blocks.map(b => block(b, preview))}
      <div class="ol-foot">${ico('audius')} One Link · Built on Audius</div>
    </div></div>`;
}

function block(b, preview) {
  const k = KIND[b.kind] || KIND.link;
  const tile = html`<div class="ol-tile" style="background:${k.color}">${ico(k.icon)}</div>`;
  const card = (t, title, sub, act) => html`<button class="ol-card" data-b="${b.id}">${t}<div class="ol-text"><div class="ol-title">${title}</div>${sub ? html`<div class="ol-sub">${sub}</div>` : ''}</div>${act}</button>`;
  switch (b.kind) {
    case 'music': {
      const links = b.links || {};
      return html`<div class="ol-hero"><div class="cover" style="${cover(b.title, b.song?.artwork_url)}"><div><div class="t">${b.title}</div><div class="s">${b.subtitle || 'Listen anywhere'}</div></div></div>
        <div class="ol-services">${SERVICES.map(([key, label, color, letter]) => {
          const href = key === 'audius' && b.song ? `#/listen/song/${b.song.id}` : links[key];
          const inner = html`<i style="background:${color}">${key === 'apple' ? raw('&#63743;') : letter}</i>${label}`;
          return href && !preview ? html`<a href="${href}" ${key === 'audius' ? '' : raw('target="_blank" rel="noopener"')} data-svc="${b.id}">${inner}</a>` : html`<span>${inner}</span>`;
        })}</div></div>`;
    }
    case 'buy': return card(html`<div class="ol-tile" style="${cover(b.title, b.song?.artwork_url)}">${ico('download')}</div>`, b.title, b.subtitle || (b.release ? `${b.release.tracks} songs · lossless download` : 'Lossless download'), html`<span class="ol-act">${priceLabel(b)}</span>`);
    case 'merch': return card(tile, b.title, b.left !== null && b.left <= 10 && !b.soldOut ? `Only ${b.left} left` : b.subtitle, b.soldOut ? html`<span class="ol-act ghost">Sold out</span>` : html`<span class="ol-act">${priceLabel(b)}</span>`);
    case 'tour': {
      const sd = shortDate(b.date);
      const t = html`<div class="ol-tile date"><small>${sd.m}</small><b>${sd.d}</b></div>`;
      if (!b.presale) return card(t, b.title, b.subtitle, html`<span class="ol-act">Tickets</span>`);
      return card(t, b.title, b.code ? `Your presale code: ${b.code}` : `Presale · ${b.needLabel}`, b.open ? html`<span class="ol-act">${b.code ? 'Tickets' : 'Get code'}</span>` : html`<span class="ol-act lock">${ico('lock', 2.2)} Presale</span>`);
    }
    case 'unlock': return card(tile, b.title, b.code ? 'Unlocked' : b.subtitle || b.needLabel, b.open ? html`<span class="ol-act">${b.code ? 'Open' : 'Unlock'}</span>` : html`<span class="ol-act lock">${ico('lock', 2.2)}</span>`);
    case 'tip': return card(tile, b.title, b.subtitle, html`<span class="ol-act">Tip</span>`);
    case 'membership': return card(tile, b.title, b.subtitle || (b.perks || []).join(' · '), html`<span class="ol-act">${priceLabel(b)}</span>`);
    default: return card(tile, b.title, b.subtitle, html`<span class="ol-act ghost">${ico('chev', 2.4)}</span>`);
  }
}

// ---------- public page ----------
app.route('/l/:handle', async ({ el, params, user }) => {
  const handle = params.handle;
  const pub = el.closest('.public');
  pub?.classList.add('ol-public');
  let d = await api(`/api/l/${encodeURIComponent(handle)}`);
  document.title = `${d.page.name} · One Link`;
  const paint = () => {
    el.innerHTML = html`${d.canEdit ? html`<div class="ol-preview-badge">This is your One Link${d.page.published ? '' : ' (hidden)'} · <a href="#/onelink">Edit</a></div>` : ''}${renderPage(d)}`.s;
  };
  paint();
  const reload = async () => { d = await api(`/api/l/${encodeURIComponent(handle)}`); paint(); };

  on(el, 'click', '[data-svc]', (e, t) => { api.post(`/api/l/${handle}/click`, { block_id: t.dataset.svc, ref: t.textContent.trim() }).catch(() => {}); });
  on(el, 'click', '[data-key]', () => app.go('/key'));
  on(el, 'click', '[data-join]', () => signInSheet(d, handle, 'Get your Listener Key', `Your Listener Key shows ${d.page.name} you're a real listener. It unlocks presales, early drops and extras. It's free.`, async () => { await api.post(`/api/l/${handle}/join`); toast('You have a Listener Key'); await reload(); }));
  on(el, 'click', '[data-b]', async (e, t) => {
    const b = d.blocks.find(x => x.id === t.dataset.b);
    if (!b) return;
    if (['buy', 'merch', 'tip', 'membership'].includes(b.kind)) {
      if (b.soldOut) return toast('Sold out');
      const done = await checkoutSheet(d, b, handle);
      if (done) await reload();
      return;
    }
    if (b.kind === 'link' || (b.kind === 'tour' && !b.presale)) {
      api.post(`/api/l/${handle}/click`, { block_id: b.id }).catch(() => {});
      if (b.url) window.open(b.url, '_blank', 'noopener');
      return;
    }
    // Unlockables and presales.
    if (!d.viewer) return signInSheet(d, handle, b.title, `Sign in with your email to use your Listener Key. ${b.needLabel} can open this.`);
    if (!b.open) return lockedSheet(d, b);
    try {
      const r = b.code ? { code: b.code, url: b.url, secret: b.secret, kind: b.kind } : await api.post(`/api/l/${handle}/unlock/${b.id}`);
      await unlockedSheet(d, b, r);
      await reload();
    } catch (err) { toast(err.message, { error: true }); }
  });
}, { public: true, title: 'One Link' });

function signInSheet(d, handle, title, body, after) {
  if (d.viewer && after) return after();
  return sheet((el, close) => {
    el.innerHTML = html`<div class="stack-lg" style="text-align:center">
      <div class="ol-avatar" style="--acc:${d.page.accent};width:64px;height:64px;font-size:22px;margin:0 auto">${ico('key', 2)}</div>
      <div class="stack-sm"><h2>${title}</h2><p class="muted">${body}</p></div>
      <form class="stack" id="f"><input class="input" type="email" name="email" required placeholder="you@email.com" autocomplete="email" style="padding:14px;font-size:16px;border-radius:14px">
        <button class="pl-pay">Continue with email</button></form>
      <div id="sent"></div></div>`.s;
    el.querySelector('#f').addEventListener('submit', async e => {
      e.preventDefault();
      const r = await busy(e.target.querySelector('button'), () => api.post('/api/auth/start', { email: formData(e.target).email, next: `/l/${handle}` }));
      el.querySelector('#sent').innerHTML = html`<div class="callout ok">${ico('check')}<div><b>Check your email.</b> Tap the link and you're in.
        ${r.devLink ? html`<div class="small" style="margin-top:6px">Email isn't connected on this server yet: <a href="${r.devLink}">open your link</a></div>` : ''}</div></div>`.s;
    });
  });
}

function lockedSheet(d, b) {
  return sheet((el, close) => {
    el.innerHTML = html`<div class="stack-lg" style="text-align:center">
      <div class="ol-tile" style="background:${KIND.unlock.color};width:72px;height:72px;border-radius:22px;margin:0 auto">${ico('lock')}</div>
      <div class="stack-sm"><h2>${b.title}</h2><p class="muted">${b.needLabel} can open this.</p></div>
      <div class="card card-pad stack-sm" style="text-align:left">
        <b>How to get there</b>
        ${[['shirt', 'Buy something from ' + d.page.name], ['music', 'Listen on Audius'], ['star', 'Join the membership']].map(([i, t]) => html`<div class="row" style="gap:12px"><span class="ol-tile" style="width:34px;height:34px;border-radius:10px;background:var(--au-grad)">${ico(i)}</span><span>${t}</span></div>`)}
      </div>
      <button class="pl-pay" data-close>Got it</button></div>`.s;
    el.querySelector('[data-close]').onclick = () => close();
  });
}

function unlockedSheet(d, b, r) {
  return sheet((el, close) => {
    el.innerHTML = html`<div class="pl-done">
      <div class="pl-check">${ico('unlock', 2.2)}</div>
      <h2>${b.kind === 'tour' ? 'You’re in the presale' : 'Unlocked'}</h2>
      <p class="muted">${b.kind === 'tour' ? `Use this code at checkout for ${b.title}.` : `Thanks for listening to ${d.page.name}.`}</p>
      ${b.kind === 'tour' ? html`<div class="chip" style="font-size:20px;padding:12px 18px;letter-spacing:.08em">${r.code}</div>` : ''}
      ${r.secret ? html`<div class="card card-pad" style="width:100%;text-align:left">${r.secret}</div>` : ''}
      ${r.url ? html`<a class="pl-pay" href="${r.url}" target="_blank" rel="noopener">${b.kind === 'tour' ? 'Get tickets' : 'Open'} ${ico('open')}</a>` : ''}
      <button class="btn btn-ghost" data-close>Done</button></div>`.s;
    el.querySelector('[data-close]').onclick = () => close();
  });
}

export function checkoutSheet(d, b, handle) {
  return sheet((el, close) => {
    let qty = 1, amount = b.kind === 'tip' ? (b.amounts?.[1] ?? 500) : b.price_minor;
    const k = KIND[b.kind];
    const total = () => (b.kind === 'tip' ? amount : b.price_minor * qty);
    const paint = () => {
      el.innerHTML = html`<div class="stack-lg">
        <div class="pl-item"><div class="ol-tile" style="${b.kind === 'buy' ? cover(b.title, b.song?.artwork_url) : `background:${k.color}`}">${ico(k.icon)}</div>
          <div style="flex:1;min-width:0"><div class="small muted">${d.page.name}</div><h3 style="font-size:18px">${b.title}</h3>${b.subtitle ? html`<div class="small muted">${b.subtitle}</div>` : ''}</div></div>
        ${b.kind === 'tip' ? html`<div class="row" style="gap:8px">${(b.amounts || [300, 500, 1000]).map(a => html`<button class="btn ${a === amount ? 'btn-dark' : ''}" style="flex:1;padding:14px;font-size:16px" data-amt="${a}">${money(a).replace('.00', '')}</button>`)}</div>` : ''}
        <div class="row between"><div class="pl-price">${money(total())}${b.kind === 'membership' ? html`<span class="muted" style="font-size:16px;font-weight:600"> /month</span>` : ''}</div>
          ${b.kind === 'merch' ? html`<div class="pl-step"><button data-q="-1" aria-label="Fewer">−</button><b>${qty}</b><button data-q="1" aria-label="More">+</button></div>` : ''}</div>
        ${b.payees > 1 ? html`<div class="callout" style="background:var(--surface-2)">${ico('heart')}<div class="small">This pays <b>${b.payees} people</b> who made the music, the same day.</div></div>` : ''}
        <form class="stack" id="pay">
          ${d.viewer ? '' : html`<input class="input" type="email" name="email" required placeholder="Email for your receipt" autocomplete="email" style="padding:14px;font-size:16px;border-radius:14px">`}
          <button class="pl-pay" data-m="card">${ico('lock', 2.2)} Pay ${money(total())}</button>
          <button class="pl-pay audio" type="button" data-m="audio">Pay with AUDIO · more reaches the artist</button>
        </form>
        <div class="pl-fine">Test mode: no card is charged yet.</div></div>`.s;
    };
    paint();
    el.addEventListener('click', e => {
      const q = e.target.closest('[data-q]'), a = e.target.closest('[data-amt]');
      if (q) { qty = Math.min(10, Math.max(1, qty + Number(q.dataset.q))); paint(); }
      if (a) { amount = Number(a.dataset.amt); paint(); }
    });
    const pay = async method => {
      const f = el.querySelector('#pay');
      if (!d.viewer && !f.reportValidity()) return;
      const btn = el.querySelector(`[data-m=${method}]`);
      const r = await busy(btn, () => api.post(`/api/l/${handle}/checkout`, { block_id: b.id, qty, amount: (amount / 100).toFixed(2), pay_method: method, email: f.email?.value }));
      receiptView(el, d, b, r, close);
    };
    el.addEventListener('submit', e => { e.preventDefault(); pay('card').catch(() => {}); });
    el.addEventListener('click', e => { if (e.target.closest('[data-m=audio]')) pay('audio').catch(() => {}); });
  });
}

function receiptView(el, d, b, r, close) {
  const o = r.order;
  el.innerHTML = html`<div class="pl-done">
    <div class="pl-check">${ico('check', 2.6)}</div>
    <h2>Thank you</h2>
    <p class="muted">${b.kind === 'tip' ? `${d.page.name} got your tip.` : b.kind === 'membership' ? `You're a member of ${d.page.name}.` : 'Your receipt is on its way to your inbox.'}</p>
    <div class="card card-pad" style="width:100%">
      <div class="eyebrow" style="margin-bottom:2px">Where your ${money(o.gross)} went</div>
      ${whereBar([
        { label: r.songs ? `Everyone on the ${r.songs > 1 ? 'album' : 'song'} (${r.splitTo})` : d.page.name, amount: o.net, color: 'var(--au-purple)' },
        { label: o.pay_method === 'audio' ? 'Card fees (none with AUDIO)' : 'Card fees', amount: o.card, color: '#C9C3D6' },
        { label: 'Audius (8%)', amount: o.platform, color: '#0C0F14' }
      ], o.currency)}
    </div>
    <div class="lk-pass" style="--acc:${d.page.accent};width:100%;text-align:left;min-height:150px">
      <div class="top"><div><div class="lbl">Listener Key</div><div class="nm">${d.page.name}</div></div><div class="lvl">${r.key.name}</div></div>
      <div class="stats"><div><b>${money(r.key.spent)}</b><small>supported</small></div><div><b>${r.key.orders}</b><small>${r.key.orders === 1 ? 'purchase' : 'purchases'}</small></div></div>
    </div>
    <button class="pl-pay" data-close>Done</button></div>`.s;
  el.querySelector('[data-close]').onclick = () => close(true);
}

// ---------- the listener's own Listener Keys ----------
app.route('/key', async ({ el }) => {
  const { keys } = await api('/api/key');
  el.innerHTML = html`<div class="page-head"><div><h1>Listener Key</h1><p class="lede">Proof you're a real listener. Artists use it to let you in first.</p></div></div>
    ${keys.length ? html`<div class="lk-stack">${keys.map(k => html`<a class="lk-pass" style="--acc:${k.page.accent};text-decoration:none" href="#/l/${k.page.handle}">
        <div class="top"><div><div class="lbl">Listener Key</div><div class="nm">${k.page.name}</div><div class="small" style="opacity:.75;margin-top:2px">Since ${date(k.since)}</div></div><div class="lvl">${k.name}</div></div>
        <div class="stats"><div><b>${money(k.spent)}</b><small>supported</small></div><div><b>${k.minutes}</b><small>minutes</small></div><div><b>${k.unlocked}</b><small>unlocked</small></div></div></a>`)}</div>`
      : html`<div class="card"><div class="empty"><div class="icon">${ico('key')}</div><h3>No Listener Keys yet</h3><p>Buy something from an artist's One Link, or tap "Get your Listener Key" on their page.</p></div></div>`}`.s;
}, { auth: true, title: 'Listener Key' });

// ---------- the artist's editor ----------
app.route('/onelink', async ({ el, query, user }) => {
  const mine = await api('/api/onelink');
  if (!mine.pages.length) return createScreen(el, mine, user);
  const pid = query.get('page') || mine.pages[0].id;
  let d = await api(`/api/onelink/${pid}`);
  let tab = query.get('tab') || 'page';
  let linkables = null;
  const getLinkables = async () => linkables ||= await api(`/api/onelink/${pid}/linkables`);

  const paint = async () => {
    const p = d.page;
    const handleUrl = d.url.replace(/^https?:\/\//, '');
    const [base, h] = [handleUrl.slice(0, handleUrl.lastIndexOf('/') + 1), handleUrl.slice(handleUrl.lastIndexOf('/') + 1)];
    let body = '';
    if (tab === 'page') body = pageTab(d);
    else if (tab === 'listeners') body = await listenersTab(pid);
    else body = await salesTab(pid);
    el.innerHTML = html`
    ${comingBar('One Link')}
    <div class="page-head" style="align-items:center">
      <div><h1>One Link</h1></div>
      <div class="row"><div class="seg">${[['page', 'Page'], ['listeners', 'Listeners'], ['sales', 'Sales']].map(([k, l]) => html`<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`)}</div></div>
    </div>
    <div class="ol-editor">
      <div class="ol-phone-wrap"><div class="ol-phone"><div class="screen"><div class="notch"></div>${renderPage(previewData(d), { compact: true, preview: true })}</div></div></div>
      <div class="stack-lg">
        <div class="ol-linkbar"><span class="u"><span>${base}</span>${h}</span>
          <button class="btn btn-sm" data-copy>${ico('copy')} Copy</button><a class="btn btn-sm btn-primary" href="#/l/${p.handle}">${ico('open')} Open</a></div>
        ${raw(String(body))}
      </div>
    </div>`.s;
  };
  await paint();

  const save = async (fn, btn) => { d = await busy(btn, fn); await paint(); };
  on(el, 'click', '[data-tab]', async (e, t) => { tab = t.dataset.tab; history.replaceState(null, '', `#/onelink?tab=${tab}`); await paint(); });
  on(el, 'click', '[data-copy]', () => copyText(d.url));
  on(el, 'click', '[data-accent]', (e, t) => save(() => api.patch(`/api/onelink/${pid}`, { accent: t.dataset.accent })));
  on(el, 'click', '[data-vis]', (e, t) => { const b = d.blocks.find(x => x.id === t.dataset.vis); save(() => api.patch(`/api/onelink/${pid}/blocks/${b.id}`, { visible: !b.visible })); });
  on(el, 'click', '[data-pub]', () => save(() => api.patch(`/api/onelink/${pid}`, { published: !d.page.published })));
  on(el, 'click', '[data-add]', async () => {
    const kind = await pickKind();
    if (!kind) return;
    const out = await blockForm(kind, null, await getLinkables(), pid);
    if (out?.page) { d = out; await paint(); toast('Added to the top of your page'); }
  });
  on(el, 'click', '[data-edit]', async (e, t) => {
    const b = d.blocks.find(x => x.id === t.dataset.edit);
    const out = await blockForm(b.kind, b, await getLinkables(), pid);
    if (out?.page) { d = out; await paint(); }
  });
  on(el, 'change', '[data-prof]', (e, t) => save(() => api.patch(`/api/onelink/${pid}`, { [t.name]: t.value })));
  on(el, 'click', '[data-csv]', () => { location.href = `/api/onelink/${pid}/listeners.csv`; });

  // Drag to reorder (and arrow keys on the grip for keyboards).
  let dragId = null;
  el.addEventListener('dragstart', e => { const r = e.target.closest('.ol-row'); if (!r) return; dragId = r.dataset.id; r.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  el.addEventListener('dragend', e => { e.target.closest('.ol-row')?.classList.remove('dragging'); el.querySelectorAll('.ol-row.over').forEach(x => x.classList.remove('over')); });
  el.addEventListener('dragover', e => { const r = e.target.closest('.ol-row'); if (!r || !dragId) return; e.preventDefault(); el.querySelectorAll('.ol-row.over').forEach(x => x.classList.remove('over')); r.classList.add('over'); });
  el.addEventListener('drop', e => {
    const r = e.target.closest('.ol-row'); if (!r || !dragId) return; e.preventDefault();
    const ids = d.blocks.map(b => b.id).filter(x => x !== dragId);
    ids.splice(ids.indexOf(r.dataset.id), 0, dragId);
    dragId = null;
    save(() => api.put(`/api/onelink/${pid}/order`, { ids }));
  });
  el.addEventListener('keydown', e => {
    const g = e.target.closest('.grip'); if (!g || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const ids = d.blocks.map(b => b.id), i = ids.indexOf(g.dataset.id), j = i + (e.key === 'ArrowUp' ? -1 : 1);
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    save(() => api.put(`/api/onelink/${pid}/order`, { ids })).then(() => el.querySelector(`.grip[data-id="${g.dataset.id}"]`)?.focus());
  });
}, { auth: true, title: 'One Link' });

// What the phone preview shows: the visible items, as a listener without a key sees them.
function previewData(d) {
  return {
    page: d.page, key: null,
    blocks: d.blocks.filter(b => b.visible).map(b => ({
      ...b, ...b.data, links: b.data.links, needLabel: d.needs[b.data.need || 'key'], open: false,
      soldOut: b.stock !== null && b.stock !== undefined && b.sold >= b.stock, left: b.stock !== null && b.stock !== undefined ? Math.max(0, b.stock - (b.sold || 0)) : null
    }))
  };
}

function rowSub(b, needs) {
  const bits = [];
  if (b.price_minor) bits.push(b.kind === 'membership' ? `${money(b.price_minor)}/mo` : money(b.price_minor));
  if (b.kind === 'tour') bits.push(date(b.data.date) + (b.data.presale ? ' · presale' : ''));
  if (b.kind === 'unlock') bits.push(needs[b.data.need || 'key']);
  if (b.payees) bits.push(`pays ${b.payees} ${b.payees === 1 ? 'person' : 'people'}`);
  else if (b.subtitle && bits.length < 2 && b.kind !== 'unlock') bits.push(b.subtitle);
  return bits.join(' · ');
}

function pageTab(d) {
  const s = d.stats;
  return html`
    <div class="grid grid-4">
      ${[['Views', s.views], ['Clicks', s.clicks], ['Sales', money(s.gross)], ['Listener Keys', s.listeners]].map(([l, v]) => html`<div class="card pl-stat"><div class="v">${v}</div><div class="l">${l} · 30 days</div></div>`)}
    </div>
    <div class="card" style="overflow:hidden">
      <div class="card-head"><h3>Your page</h3><button class="btn btn-primary btn-sm" data-add>${ico('plus')} Add</button></div>
      ${d.blocks.length ? d.blocks.map(b => {
        const k = KIND[b.kind];
        return html`<div class="ol-row ${b.visible ? '' : 'off'}" draggable="true" data-id="${b.id}">
          <span class="grip" tabindex="0" role="button" aria-label="Move ${b.title}. Use arrow keys." data-id="${b.id}">${ico('grip')}</span>
          <span class="kind" style="background:${k.color}">${ico(k.icon)}</span>
          <div class="grow"><div class="t">${b.title}</div><div class="s">${rowSub(b, d.needs)}</div></div>
          <div class="metric"><b>${b.sales ? money(b.revenue) : b.clicks}</b>${b.sales ? `${b.sales} sold` : 'clicks'}</div>
          <button class="btn btn-ghost btn-icon btn-sm" data-vis="${b.id}" title="${b.visible ? 'Hide' : 'Show'}">${ico(b.visible ? 'eye' : 'eyeoff')}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-edit="${b.id}" title="Edit">${ico('chev', 2.2)}</button>
        </div>`;
      }) : html`<div class="empty"><h3>Nothing here yet</h3><p>Tap Add to put your music, merch or tour dates on your page.</p></div>`}
    </div>
    <div class="card card-pad stack">
      <div class="row between"><h3>Look</h3><div class="row small muted">Live <button class="toggle ${d.page.published ? 'on' : ''}" data-pub aria-label="Live"></button></div></div>
      <div class="form-grid">
        <label class="field"><span>Name</span><input class="input" name="name" data-prof value="${d.page.name}" maxlength="80"></label>
        <label class="field"><span>One line about you</span><input class="input" name="tagline" data-prof value="${d.page.tagline || ''}" maxlength="140" placeholder="New album out now"></label>
      </div>
      <div class="row wrap" style="gap:10px">${d.accents.map(c => html`<button class="sw ${c === d.page.accent ? 'on' : ''}" style="background:${c}" data-accent="${c}" aria-label="Colour ${c}"></button>`)}</div>
    </div>`;
}

async function listenersTab(pid) {
  const { listeners } = await api(`/api/onelink/${pid}/listeners`);
  const lv = { 'Top listener': 'grad', Insider: 'accent', Supporter: 'info', Listener: '' };
  return html`<div class="card" style="overflow:hidden">
    <div class="card-head"><div><h3>${listeners.length} listeners with your Listener Key</h3><div class="small muted">This list is yours. Take it anywhere.</div></div>
      <button class="btn btn-sm" data-csv>${ico('download')} Export</button></div>
    ${listeners.length ? html`<div class="list">${listeners.map(l => html`<div class="list-item">
      <div class="avatar" style="background:var(--au-grad)">${initialsOf(l.email.split('@')[0].replace(/[._-]/g, ' '))}</div>
      <div class="grow"><div class="title">${l.email}</div><div class="sub">Since ${date(l.since)}${l.minutes ? ` · ${l.minutes} minutes listened` : ''}</div></div>
      <span class="badge ${lv[l.name]} plain">${l.name}</span><b class="num" style="width:80px;text-align:right">${money(l.spent)}</b></div>`)}</div>`
      : html`<div class="empty"><div class="icon">${ico('key')}</div><h3>No listeners yet</h3><p>Share your One Link. Anyone who buys or joins gets a Listener Key.</p></div>`}</div>`;
}

async function salesTab(pid) {
  const { orders } = await api(`/api/onelink/${pid}/sales`);
  const gross = orders.reduce((s, o) => s + o.gross, 0), net = orders.reduce((s, o) => s + o.net, 0);
  return html`<div class="grid grid-2">
      <div class="card pl-stat"><div class="v">${money(gross)}</div><div class="l">Listeners paid</div></div>
      <div class="card pl-stat"><div class="v" style="color:var(--money)">${money(net)}</div><div class="l">Paid into Song Wallets</div></div></div>
    <div class="card" style="overflow:hidden"><div class="card-head"><h3>Sales</h3>${orders.some(o => o.simulated) ? html`<span class="badge warn plain">Test mode</span>` : ''}</div>
    ${orders.length ? html`<div class="list">${orders.map(o => html`<div class="list-item">
      <span class="kind ol-tile" style="width:40px;height:40px;border-radius:11px;background:${KIND[o.kind].color}">${ico(KIND[o.kind].icon)}</span>
      <div class="grow"><div class="title">${o.title}${o.qty > 1 ? ` ×${o.qty}` : ''}</div><div class="sub">${ago(o.created_at)} · ${o.song_ids.length ? `split with everyone on ${o.song_ids.length > 1 ? `${o.song_ids.length} songs` : 'the song'}` : 'paid to you'}${o.pay_method === 'audio' ? ' · AUDIO' : ''}</div></div>
      <div style="text-align:right"><b class="num">${money(o.gross)}</b><div class="small" style="color:var(--money)">${money(o.net)} to wallets</div></div></div>`)}</div>`
      : html`<div class="empty"><div class="icon">${ico('shirt')}</div><h3>No sales yet</h3><p>When a listener buys, you'll see it here the same second.</p></div>`}</div>`;
}

function pickKind() {
  return sheet((el, close) => {
    el.innerHTML = html`<div class="stack-lg"><h2 style="text-align:center">Add to your page</h2>
      <div class="ol-tiles">${Object.entries(KIND).map(([k, v]) => html`<button class="ol-addtile" data-k="${k}"><span class="ic" style="background:${v.color}">${ico(v.icon)}</span><b>${v.label}</b></button>`)}</div></div>`.s;
    el.addEventListener('click', e => { const t = e.target.closest('[data-k]'); if (t) close(t.dataset.k); });
  });
}

// One short form per kind. Returns the updated editor view, or null.
async function blockForm(kind, b, linkables, pid) {
  const k = KIND[kind];
  const data = b?.data || {};
  const linkVal = b?.song_id ? `s:${b.song_id}` : b?.release_id ? `r:${b.release_id}` : '';
  const passportPicker = (label, required) => html`<label class="field full"><span>${label}</span><select class="input" name="link" ${required ? 'required' : ''}>
    ${required ? '' : html`<option value="">Nobody else (pays you)</option>`}
    ${linkables.releases.length ? html`<optgroup label="Albums">${linkables.releases.map(r => html`<option value="r:${r.id}" ${linkVal === `r:${r.id}` ? 'selected' : ''}>${r.title}</option>`)}</optgroup>` : ''}
    <optgroup label="Songs">${linkables.songs.map(s => html`<option value="s:${s.id}" ${linkVal === `s:${s.id}` ? 'selected' : ''}>${s.title}</option>`)}</optgroup></select></label>`;
  const inp = (name, label, value = '', attrs = '') => html`<label class="field ${attrs.includes('full') ? 'full' : ''}"><span>${label}</span><input class="input" name="${name}" value="${value ?? ''}" ${raw(attrs.replace('full', ''))}></label>`;
  const dollars = m => m ? (m / 100).toFixed(2) : '';
  const fields = {
    music: html`${passportPicker('Song', false)}${inp('title', 'Title', b?.title, 'required full')}
      <div class="field full"><span>Where to listen <span class="hint">Audius is added for you</span></span></div>
      ${inp('spotify', 'Spotify link', data.links?.spotify, 'placeholder="open.spotify.com/…"')}${inp('apple', 'Apple Music link', data.links?.apple, 'placeholder="music.apple.com/…"')}`,
    buy: html`${passportPicker('What are listeners buying?', true)}${inp('price', 'Price ($)', dollars(b?.price_minor) || '9.99', 'required inputmode="decimal"')}${inp('title', 'Title', b?.title, 'placeholder="Same as the song or album"')}`,
    merch: html`${inp('title', 'What is it?', b?.title, 'required full placeholder="Tour hoodie"')}${inp('price', 'Price ($)', dollars(b?.price_minor), 'required inputmode="decimal" placeholder="45"')}${inp('stock', 'How many? (optional)', b?.stock, 'inputmode="numeric"')}
      ${passportPicker('Who earns from it?', false)}<div class="small muted full" style="grid-column:1/-1">Link it to a song or album and everyone on it gets their share, the same day.</div>`,
    tour: html`${inp('title', 'City', b?.title, 'required placeholder="Brooklyn"')}${inp('subtitle', 'Venue', b?.subtitle, 'placeholder="Elsewhere"')}${inp('date', 'Date', data.date, 'required type="date"')}${inp('url', 'Ticket link', b?.url, 'placeholder="tickets.com/…"')}
      <label class="check full" style="grid-column:1/-1"><input type="checkbox" name="presale" ${data.presale ? 'checked' : ''}><span><b>Presale first</b><br><span class="small muted">Real listeners get a code before resellers.</span></span></label>`,
    unlock: html`${inp('title', 'What is it?', b?.title, 'required full placeholder="Unreleased demo"')}
      <label class="field full"><span>Who can open it?</span><select class="input" name="need">${Object.entries({ key: 'Anyone with a Listener Key', purchase: 'Listeners who bought something', spent: 'Listeners who spent $50 or more', top: 'Your top 10% of listeners' }).map(([v, l]) => html`<option value="${v}" ${(data.need || 'top') === v ? 'selected' : ''}>${l}</option>`)}</select></label>
      ${inp('url', 'Link they get', b?.url, 'full placeholder="A private link"')}${inp('secret', 'Or a message', data.secret, 'full placeholder="Thanks for being here from day one"')}`,
    tip: html`${inp('title', 'Title', b?.title || 'Tip me', 'required full')}${inp('subtitle', 'One line', b?.subtitle, 'full placeholder="Every cent goes to the music"')}`,
    membership: html`${inp('title', 'Name', b?.title || 'Inner circle', 'required')}${inp('price', 'Per month ($)', dollars(b?.price_minor) || '5', 'required inputmode="decimal"')}${inp('perks', 'Perks', (data.perks || []).join(', '), 'full placeholder="Early drops, demos, members chat"')}`,
    link: html`${inp('title', 'Title', b?.title, 'required full')}${inp('url', 'Link', b?.url, 'required full')}`
  }[kind];
  return modal({
    title: html`<span class="row" style="gap:10px"><span class="kind ol-tile" style="width:34px;height:34px;border-radius:10px;background:${k.color}">${ico(k.icon)}</span>${b ? 'Edit' : k.label}</span>`,
    body: html`<form class="form-grid" id="bf">${fields}</form>`,
    actions: [
      ...(b ? [{ label: 'Remove', danger: true, onClick: () => api.del(`/api/onelink/${pid}/blocks/${b.id}`) }] : []),
      { label: 'Cancel', value: null },
      { label: b ? 'Save' : 'Add', primary: true, onClick: (close, m) => {
        const f = m.querySelector('#bf');
        if (!f.reportValidity()) return false;
        const v = formData(f);
        const body = { kind, title: v.title, subtitle: v.subtitle };
        if (v.link !== undefined) { body.song_id = v.link.startsWith('s:') ? v.link.slice(2) : null; body.release_id = v.link.startsWith('r:') ? v.link.slice(2) : null; }
        if (!body.title && kind === 'buy') {
          const o = f.querySelector('select[name=link]').selectedOptions[0];
          body.title = o?.textContent;
        }
        if (v.price !== undefined) body.price = v.price;
        if (v.stock !== undefined) body.stock = v.stock === '' ? null : v.stock;
        if (v.url !== undefined) body.url = v.url;
        if (kind === 'tour') { body.date = v.date; body.presale = !!v.presale; body.need = 'key'; }
        if (kind === 'unlock') { body.need = v.need; body.secret = v.secret; }
        if (kind === 'music') body.links = { spotify: v.spotify, apple: v.apple };
        if (kind === 'membership') body.perks = (v.perks || '').split(',').map(x => x.trim()).filter(Boolean);
        return b ? api.patch(`/api/onelink/${pid}/blocks/${b.id}`, body) : api.post(`/api/onelink/${pid}/blocks`, body);
      } }
    ]
  });
}

function createScreen(el, mine, user) {
  const artist = mine.artists[0];
  const suggested = (artist?.name || user.name || user.email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
  el.innerHTML = html`<div class="stack-lg" style="max-width:860px;margin:0 auto">
    <div class="pl-hero"><h1>One Link.</h1><p>The only link you'll ever need. Your music, merch, tour dates and extras in one place, in any order you like. Every sale pays everyone on the song.</p>
      <div class="pl-strike">${['Website', 'Merch store', 'Smart links', 'Link in bio', 'Presale codes', 'Membership site'].map(t => html`<span>${t}</span>`)}</div></div>
    <form class="card card-pad stack" id="cf">
      <h2>Pick your link</h2>
      <div class="ol-linkbar" style="padding:6px 6px 6px 14px"><span class="muted" style="white-space:nowrap">${location.host}/l/</span>
        <input class="input" name="handle" value="${suggested}" required style="border:0;box-shadow:none;padding:8px 4px;font-weight:600" aria-label="Your link name">
        <button class="btn btn-primary">Create</button></div>
      ${artist ? html`<input type="hidden" name="artist_id" value="${artist.id}"><div class="small muted">For your artist page, ${artist.name}.</div>` : ''}
    </form></div>`.s;
  el.querySelector('#cf').addEventListener('submit', async e => {
    e.preventDefault();
    const v = formData(e.target);
    await busy(e.target.querySelector('button'), () => api.post('/api/onelink', { handle: v.handle, artist_id: v.artist_id || undefined, name: artist?.name }));
    toast('Your One Link is live');
    app.refresh();
  });
}
