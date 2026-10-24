// Shared UI for One Link, Listener Key, Audius for Business and Audius listening: extra icons, a bottom sheet,
// and the "where your money went" bar. Kept out of app.js so those screens can be merged without touching the shell.
import { html, raw, money, toast } from './app.js';

// Load platforms.css once.
if (!document.querySelector('link[data-pl]')) {
  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = 'css/platforms.css'; l.dataset.pl = '1';
  document.head.appendChild(l);
}

const P = {
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  shirt: '<path d="M8 3l-5 3 2 5 3-1v11h8V10l3 1 2-5-5-3c0 2-1.8 3-4 3S8 5 8 3z"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  unlock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
  heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  grip: '<circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4.4-1"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  play: '<path d="M7 4.5v15l13-7.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  open: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  audius: '<path d="M12 3l9 16H3z"/><path d="M12 10l3.5 6h-7z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  stream: '<rect x="3" y="5" width="18" height="12" rx="2.5"/><path d="M8 21h8M12 17v4"/><path d="M10 9l4 2-4 2z" fill="currentColor"/>',
  video: '<rect x="2" y="6" width="14" height="12" rx="2.5"/><path d="M16 10l6-3v10l-6-3"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  game: '<path d="M6 8h12a4 4 0 0 1 4 4v1a4 4 0 0 1-7 2.6L14 15h-4l-1 .6A4 4 0 0 1 2 13v-1a4 4 0 0 1 4-4z"/><path d="M7 11v3M5.5 12.5h3M16 12h.01M18 13.5h.01"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
  podcast: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  library: '<path d="M4 4v16M9 4v16M14 5l5 15"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  skip: '<path d="M5 5l10 7-10 7z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
  back: '<path d="M19 5L9 12l10 7z" fill="currentColor" stroke="none"/><path d="M5 5v14"/>'
};
export const ico = (name, sw = 1.9) => raw(`<svg class="pl-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.spark}</svg>`);

// Each One Link item kind: icon, colour and plain name.
export const KIND = {
  music: { icon: 'music', color: 'linear-gradient(315deg,#5B23E1,#A22FEB)', label: 'Music', hint: 'A song on every service' },
  buy: { icon: 'download', color: 'linear-gradient(315deg,#0C0F14,#3A3550)', label: 'Sell music', hint: 'Buy and own, lossless' },
  merch: { icon: 'shirt', color: 'linear-gradient(315deg,#E0115F,#FF6A88)', label: 'Merch', hint: 'Hoodies, vinyl, anything' },
  tour: { icon: 'ticket', color: 'linear-gradient(315deg,#F97316,#FDBA74)', label: 'Tour date', hint: 'Tickets and presales' },
  unlock: { icon: 'lock', color: 'linear-gradient(315deg,#7E1BCC,#CC0FE0)', label: 'Unlockable', hint: 'For your best listeners' },
  tip: { icon: 'heart', color: 'linear-gradient(315deg,#CC0FE0,#F472B6)', label: 'Tips', hint: 'Listeners say thanks' },
  membership: { icon: 'star', color: 'linear-gradient(315deg,#0EA5A4,#5EEAD4)', label: 'Membership', hint: 'Monthly, with perks' },
  link: { icon: 'link', color: 'linear-gradient(315deg,#2563EB,#60A5FA)', label: 'Link', hint: 'Anything else' }
};

// Stable cover art from a seed, in the Audius range.
const ARTS = [['#5B23E1', '#A22FEB'], ['#7E1BCC', '#CC0FE0'], ['#E0115F', '#7E1BCC'], ['#0EA5A4', '#5B23E1'], ['#F97316', '#CC0FE0'], ['#2563EB', '#A22FEB']];
export function cover(seed, url) {
  if (url) return `background-image:url('${String(url).replace(/'/g, '%27')}')`;
  let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = ARTS[h % ARTS.length];
  return `background:radial-gradient(90% 90% at 80% 10%, ${b} 0%, transparent 60%), linear-gradient(315deg, ${a}, #0C0F14)`;
}
// Audius for Business uses: icon and colour.
export const USE = {
  creator: { icon: 'video', color: 'linear-gradient(315deg,#E0115F,#FF6A88)' },
  stream: { icon: 'stream', color: 'linear-gradient(315deg,#7E1BCC,#CC0FE0)' },
  podcast: { icon: 'podcast', color: 'linear-gradient(315deg,#F97316,#FDBA74)' },
  ad: { icon: 'megaphone', color: 'linear-gradient(315deg,#2563EB,#60A5FA)' },
  game: { icon: 'game', color: 'linear-gradient(315deg,#0EA5A4,#5EEAD4)' },
  film: { icon: 'film', color: 'linear-gradient(315deg,#0C0F14,#3A3550)' },
  ai: { icon: 'spark', color: 'linear-gradient(315deg,#5B23E1,#A22FEB)' }
};
export const initialsOf = s => String(s || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

// A bottom sheet. render(sheetEl, close) fills it; resolves with what close() is given.
export function sheet(render) {
  return new Promise(resolve => {
    const back = document.createElement('div');
    back.className = 'pl-back';
    back.innerHTML = '<div class="pl-sheet" role="dialog" aria-modal="true"><div class="pl-grab"></div><div class="pl-body"></div></div>';
    const close = v => { back.remove(); removeEventListener('keydown', esc); resolve(v); };
    const esc = e => { if (e.key === 'Escape') close(null); };
    back.addEventListener('click', e => { if (e.target === back) close(null); });
    addEventListener('keydown', esc);
    document.body.appendChild(back);
    render(back.querySelector('.pl-body'), close);
  });
}

// "Where your $45 went": one bar and three plain lines.
export function whereBar(parts, cur = 'USD') {
  const total = parts.reduce((s, p) => s + p.amount, 0) || 1;
  return html`<div class="pl-where"><div class="pl-bar">${parts.filter(p => p.amount > 0).map(p => html`<i style="width:${p.amount / total * 100}%;background:${p.color}"></i>`)}</div>
    <div class="pl-legend">${parts.map(p => html`<div><i style="background:${p.color}"></i><span>${p.label}</span><b>${money(p.amount, cur)}</b></div>`)}</div></div>`;
}

export async function copyText(text, label = 'Link copied') {
  try { await navigator.clipboard.writeText(text); toast(label); }
  catch { prompt('Copy this link', text); }
}

export const shortDate = d => { const x = new Date(d + 'T12:00:00'); return { m: x.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(), d: x.getDate() }; };
