// Trust and safety screens: the public DMCA page and form, and the admin queue for notices and AI-flag appeals.
// The pieces that sit on other screens (AI flag banner on a song, Dispute on a split) live with those screens.
import { app, html, api, toast, icon, on, busy, formData, date, ago } from '../app.js';

app.nav({ id: 'admin-trust', label: 'Notices and appeals', href: '/admin/trust', icon: 'flag', section: 'Admin', order: 93, auth: true, admin: true });

app.route('/legal/dmca', async ({ el, query }) => {
  el.innerHTML = html`<div style="max-width:640px;margin:24px auto" class="stack-lg">
    <div class="page-head"><div><h1>Copyright notices (DMCA)</h1>
      <p class="muted">If something on Audius uses your work without permission, tell us here. We hide the reported file right away while we review the notice, and we stop uploads from anyone with repeated upheld notices.</p></div></div>
    <section class="card card-pad stack">
      <h2 class="h3">Designated agent</h2>
      <p class="small muted">Audius DMCA Agent · <span class="quiet">[agent name and postal address to be filed with the US Copyright Office before launch]</span> · notices can also be sent with the form below.</p>
      <p class="small muted">If your file was taken down by mistake, you can send a counter-notice to the same agent. We restore it after 10 business days unless the claimant tells us they have gone to court.</p>
    </section>
    <form class="card card-pad stack" id="f">
      <h2 class="h3">Send a notice</h2>
      <label class="field"><span>Your full name</span><input class="input" name="name" required autocomplete="name"></label>
      <label class="field"><span>Your email</span><input class="input" type="email" name="email" required autocomplete="email"></label>
      <label class="field"><span>Your postal address <span class="hint">optional</span></span><input class="input" name="address" autocomplete="street-address"></label>
      <label class="field"><span>The work you own</span><textarea class="input" name="work" rows="2" required placeholder="e.g. My recording of “Night Bus”, released 2024"></textarea></label>
      <label class="field"><span>Link to the material on Audius</span><input class="input" name="url" required value="${query.get('url') || ''}" placeholder="https://…/#/song/…"></label>
      <label class="field"><span>File in the song's Workspace <span class="hint">optional · leave empty to report the streaming audio</span></span><input class="input" name="path" placeholder="e.g. stems/vocals.wav"></label>
      <label class="row" style="gap:10px;align-items:flex-start"><input type="checkbox" name="good_faith" required> <span class="small">I believe in good faith that this use is not authorized by the copyright owner, its agent, or the law.</span></label>
      <label class="row" style="gap:10px;align-items:flex-start"><input type="checkbox" name="accurate" required> <span class="small">The information in this notice is accurate, and under penalty of perjury, I am the owner or authorized to act for the owner.</span></label>
      <label class="field"><span>Signature <span class="hint">type your full name</span></span><input class="input" name="signature" required></label>
      <button class="btn btn-primary btn-lg">Send notice</button>
      <div id="done"></div>
    </form></div>`.s;
  el.querySelector('#f').addEventListener('submit', async e => {
    e.preventDefault();
    const f = formData(e.target);
    const r = await busy(e.target.querySelector('button'), () => api.post('/api/legal/dmca', { ...f, good_faith: !!f.good_faith, accurate: !!f.accurate })).catch(() => null);
    if (r) el.querySelector('#done').innerHTML = html`<div class="callout ok">${icon('check')}<div>${r.message}</div></div>`.s;
  });
}, { public: true, title: 'Copyright notices' });

app.route('/admin/trust', async ({ el }) => {
  const paint = async () => {
    const [{ notices }, { appeals }] = await Promise.all([api('/api/admin/dmca'), api('/api/admin/ai-appeals')]);
    const open = notices.filter(n => n.status === 'received');
    el.innerHTML = html`<div class="page-head"><div><h1>Notices and appeals</h1><p class="muted">Copyright notices hide the file at once. Uphold to keep it down and count a strike against the uploader, or reject to restore it.</p></div></div>
      <section class="card" style="margin-bottom:16px"><div class="card-head"><h2 class="h3">Copyright notices</h2><span class="small muted">${open.length} waiting</span></div>
        <div class="list">${notices.length ? notices.map(n => html`<div class="list-row" style="align-items:flex-start">
          <div style="flex:1;min-width:0"><b>${n.work}</b><div class="small muted">From ${n.claimant_name} (${n.claimant_email}) · ${ago(n.created_at)} · ${n.hash ? 'file hidden' : 'nothing hidden automatically'}</div>
            <div class="small"><a href="${n.url}" target="_blank" rel="noopener">${n.url}</a>${n.path ? ` · ${n.path}` : ''}</div>
            <div class="tiny muted">Uploader strikes: ${n.strikes}${n.strikes >= 3 ? ' · uploads blocked' : ''}</div></div>
          ${n.status === 'received' ? html`<div class="row"><button class="btn btn-sm" data-act="dmca" data-d="reject" data-id="${n.id}">Reject, restore</button><button class="btn btn-sm btn-danger" data-act="dmca" data-d="uphold" data-id="${n.id}">Uphold</button></div>`
            : html`<span class="badge">${n.status}</span>`}</div>`) : html`<div class="card-pad muted">No notices.</div>`}</div></section>
      <section class="card"><div class="card-head"><h2 class="h3">AI-flag appeals</h2><span class="small muted">${appeals.length} waiting</span></div>
        <div class="list">${appeals.length ? appeals.map(a => html`<div class="list-row" style="align-items:flex-start">
          <div style="flex:1;min-width:0"><a href="#/song/${a.song_id}"><b>${a.title}</b></a> <span class="muted">· ${a.artist_credit}</span>
            <div class="small muted">Flagged: ${a.reason} · appealed ${ago(a.appealed_at)}</div><div class="small">“${a.appeal}”</div></div>
          <div class="row"><button class="btn btn-sm" data-act="ai" data-d="reject" data-id="${a.song_id}">Keep flag</button><button class="btn btn-sm btn-primary" data-act="ai" data-d="accept" data-id="${a.song_id}">Clear flag</button></div></div>`)
          : html`<div class="card-pad muted">No appeals waiting.</div>`}</div></section>`.s;
  };
  await paint();
  on(el, 'click', '[data-act=dmca]', async (e, t) => { await busy(t, () => api.post(`/api/admin/dmca/${t.dataset.id}/${t.dataset.d}`, {})); toast(t.dataset.d === 'uphold' ? 'Upheld' : 'Restored'); paint(); });
  on(el, 'click', '[data-act=ai]', async (e, t) => { await busy(t, () => api.post(`/api/admin/ai-appeals/${t.dataset.id}/${t.dataset.d}`, {})); toast(t.dataset.d === 'accept' ? 'Flag cleared' : 'Flag kept'); paint(); });
}, { auth: true, title: 'Notices and appeals' });
