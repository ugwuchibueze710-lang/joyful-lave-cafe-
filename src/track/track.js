// JOYTRACK — live order tracking. Customers pay at the counter when they pick up.
import './track.css';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => `$${Number(n).toFixed(2)}`;
const clock = (d) => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' }).format(new Date(d));
const code = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop() || new URLSearchParams(location.search).get('code') || '');
const app = $('#app'), live = $('#live');

const STEPS = [
  { id: 'received', label: 'Order received', sub: 'The cafe has your order.' },
  { id: 'preparing', label: 'Preparing', sub: 'Your order is being made.' },
  { id: 'ready', label: 'Ready for pickup', sub: 'Come grab it at the counter.' },
  { id: 'completed', label: 'Picked up', sub: 'Enjoy — thank you!' },
];
const LEVEL = { received: 0.14, preparing: 0.5, ready: 0.92, completed: 1, cancelled: 0 };
const PREP = { queued: 'Up next', making: 'Making it', done: 'Done' };

let last = null, built = false;

function build(o) {
  app.innerHTML = `
  <section class="jt-hero">
    <div class="jt-cupwrap">
      <svg class="jt-cup" viewBox="0 0 200 240" aria-hidden="true">
        <defs>
          <clipPath id="cupClip"><path d="M40 60 L160 60 L148 214 Q146 226 134 226 L66 226 Q54 226 52 214 Z"/></clipPath>
          <linearGradient id="liq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6684f"/><stop offset=".55" stop-color="#ec3b3a"/><stop offset="1" stop-color="#843a7c"/></linearGradient>
        </defs>
        <g class="jt-steam"><path d="M80 40 q-10 -14 0 -28"/><path d="M100 44 q-10 -16 0 -32"/><path d="M120 40 q-10 -14 0 -28"/></g>
        <g clip-path="url(#cupClip)">
          <rect x="30" y="50" width="140" height="190" fill="#fff6ea"/>
          <g class="jt-liquid">
            <path class="jt-wave a" d="M-200 0 Q-175 -10 -150 0 T-100 0 T-50 0 T0 0 T50 0 T100 0 T150 0 T200 0 T250 0 T300 0 T350 0 T400 0 V300 H-200 Z" fill="url(#liq)"/>
            <path class="jt-wave b" d="M-200 4 Q-175 -6 -150 4 T-100 4 T-50 4 T0 4 T50 4 T100 4 T150 4 T200 4 T250 4 T300 4 T350 4 T400 4 V300 H-200 Z" fill="#ec3b3a" opacity=".45"/>
            <g class="jt-bubbles"><circle cx="70" cy="40" r="3"/><circle cx="104" cy="70" r="2.4"/><circle cx="130" cy="30" r="3.4"/><circle cx="88" cy="96" r="2"/></g>
          </g>
          <rect class="jt-sleeve" x="30" y="118" width="140" height="56" fill="#b98a5a"/>
          <image href="/photos/joyfull-logo.webp" x="76" y="122" width="48" height="48"/>
        </g>
        <path d="M40 60 L160 60 L148 214 Q146 226 134 226 L66 226 Q54 226 52 214 Z" fill="none" stroke="#1b1b1b" stroke-width="4" stroke-linejoin="round"/>
        <rect x="32" y="48" width="136" height="16" rx="7" fill="#1b1b1b"/>
        <path class="jt-check" d="M74 150 l18 18 36 -40" fill="none"/>
      </svg>
      <div class="jt-glow"></div>
    </div>
    <div class="jt-head">
      <p class="jt-eyebrow" id="hEyebrow"></p>
      <h1 id="hTitle"></h1>
      <p class="jt-sub" id="hSub"></p>
      <div class="jt-eta" id="hEta"></div>
    </div>
  </section>

  <ol class="jt-steps" id="steps">${STEPS.map((s) => `<li data-s="${s.id}"><i></i><div><b>${s.label}</b><small></small></div></li>`).join('')}</ol>

  <section class="jt-card jt-pay" id="pay"></section>

  <section class="jt-card">
    <header class="jt-card__h"><h2>Your items</h2><span id="itemsProg"></span></header>
    <ul class="jt-items" id="items"></ul>
    <dl class="jt-totals" id="totals"></dl>
  </section>

  <section class="jt-card jt-where">
    <div><h2>Pickup at the counter</h2><p id="where"></p></div>
    <div class="jt-where__acts" id="whereActs"></div>
  </section>

  <div class="jt-actions">
    <button class="jt-btn" id="notify" type="button" hidden>Alert me when it's ready</button>
    <a class="jt-btn jt-btn--ghost" href="/#menu">Back to the menu</a>
  </div>`;
  built = true;
  const n = $('#notify');
  if ('Notification' in window && Notification.permission === 'default') {
    n.hidden = false;
    n.onclick = () => Notification.requestPermission().then(() => { n.hidden = true; });
  }
}

function render(o) {
  if (!built) build(o);
  const prev = last; last = o;
  const cancelled = o.status === 'cancelled';
  document.body.dataset.status = o.status;
  document.title = `#${o.number} · ${cancelled ? 'Cancelled' : STEPS.find((s) => s.id === o.status)?.label} · JOYTRACK`;

  $('.jt-liquid').style.transform = `translateY(${226 - (226 - 60) * (LEVEL[o.status] ?? 0)}px)`;
  $('#hEyebrow').textContent = `Order #${o.number} · ${o.firstName}`;
  const heads = {
    received: ['We got your order', 'It’s in line at the cafe — we’ll start it shortly.'],
    preparing: ['Making your order', 'Fresh, by hand, right now.'],
    ready: ['READY FOR PICKUP', 'Head to the counter, give your name, and pay there.'],
    completed: ['Picked up — enJOY!', 'Thanks for ordering with Joy-Full Java + Juice.'],
    cancelled: ['Order cancelled', 'This order was cancelled by the cafe. Questions? Give us a call.'],
  };
  const [t, sub] = heads[o.status] ?? heads.received;
  $('#hTitle').textContent = t; $('#hSub').textContent = sub;

  const eta = $('#hEta');
  if (o.status === 'received' || o.status === 'preparing') {
    const mins = Math.max(0, Math.round((new Date(o.estReadyAt) - Date.now()) / 60000));
    eta.innerHTML = o.pickup.type === 'scheduled'
      ? `<span>Pickup time</span><b>${esc(o.pickup.label)}</b>`
      : `<span>Estimated ready</span><b>${clock(o.estReadyAt)}</b><em>${mins ? `about ${mins} min` : 'any minute'}</em>`;
    eta.hidden = false;
  } else eta.hidden = true;

  const order = STEPS.map((s) => s.id), idx = order.indexOf(o.status);
  [...$('#steps').children].forEach((li, i) => {
    const hit = o.timeline.filter((h) => h.status === li.dataset.s).pop();
    li.classList.toggle('is-done', !cancelled && i < idx);
    li.classList.toggle('is-on', !cancelled && i === idx);
    li.querySelector('small').textContent = hit && !cancelled && i <= idx ? `${clock(hit.at)} · ${STEPS[i].sub}` : STEPS[i].sub;
  });
  $('#steps').classList.toggle('is-cancelled', cancelled);

  // customers always pay at the counter when they pick up
  $('#pay').className = 'jt-card jt-pay';
  $('#pay').innerHTML = cancelled ? `<b>NOTHING TO PAY</b><span>This order was cancelled.</span><strong>${money(0)}</strong>`
    : o.status === 'completed' ? `<b>PICKED UP</b><span>Thanks for ordering with Joy-Full Java + Juice!</span><strong>${money(o.total)}</strong>`
    : `<b>PAY AT PICKUP</b><span>Nothing was charged online. Pay at the counter with cash or card when you collect.</span><strong>${money(o.total)}<small>due at pickup</small></strong>`;

  const done = o.items.filter((l) => l.prep === 'done').length;
  $('#itemsProg').textContent = cancelled ? '' : `${done} of ${o.items.length} ready`;
  $('#items').innerHTML = o.items.map((l) => `<li class="is-${l.prep}">
      <span class="jt-ring"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15"/><circle class="p" cx="18" cy="18" r="15"/><path d="M11 18.5l4.5 4.5 9-10"/></svg></span>
      <div><b>${l.qty > 1 ? `${l.qty}× ` : ''}${esc(l.name)}</b><small>${esc([l.size, ...l.options].filter(Boolean).join(' · '))}</small>${l.note ? `<small class="n">“${esc(l.note)}”</small>` : ''}</div>
      <em>${cancelled ? '—' : PREP[l.prep]}</em>
    </li>`).join('');
  $('#totals').innerHTML = `<div><dt>Subtotal</dt><dd>${money(o.subtotal)}</dd></div><div><dt>Sales tax</dt><dd>${money(o.tax)}</dd></div><div class="t"><dt>Total</dt><dd>${money(o.total)}</dd></div>`;

  $('#where').innerHTML = `${esc(o.cafe.name)}<br />${esc(o.cafe.street)}<br />${esc(o.cafe.city)}`;
  $('#whereActs').innerHTML = `<a class="jt-btn" href="${o.cafe.mapsUrl}" target="_blank" rel="noopener">Directions</a><a class="jt-btn jt-btn--ghost" href="${o.cafe.phoneHref}">Call ${esc(o.cafe.phone)}</a>`;

  // moments
  if (prev && prev.status !== o.status && o.status === 'ready') celebrate(o);
  if (prev) {
    o.items.forEach((l) => { const p = prev.items.find((x) => x.lineId === l.lineId); if (p && p.prep !== l.prep) $(`#items li:nth-child(${o.items.indexOf(l) + 1})`)?.classList.add('is-bump'); });
  }
}

function celebrate(o) {
  document.body.classList.add('is-celebrate');
  setTimeout(() => document.body.classList.remove('is-celebrate'), 2600);
  try { navigator.vibrate?.([120, 80, 120]); } catch {}
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    [659, 880, 1175].forEach((f, i) => { const os = ac.createOscillator(), g = ac.createGain(); os.type = 'sine'; os.frequency.value = f; os.connect(g); g.connect(ac.destination); const t = ac.currentTime + i * 0.16; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.6); os.start(t); os.stop(t + 0.62); });
  } catch {}
  if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
    try { new Notification(`Order #${o.number} is ready for pickup`, { body: `Pay ${money(o.total)} at the counter.`, icon: '/photos/joyfull-logo.webp' }); } catch {}
  }
}

function status(text, ok) { live.classList.toggle('is-ok', ok); live.querySelector('b').textContent = text; }

async function poll() {
  const r = await fetch(`/api/track/${encodeURIComponent(code)}`, { cache: 'no-store' });
  if (r.status === 404) return notFound();
  if (r.ok) render(await r.json());
}
function notFound() {
  app.innerHTML = `<section class="jt-card jt-missing"><h1>We can't find that order</h1><p>Check the link you were given after ordering, or call the cafe at <a href="tel:+12704784409">270-478-4409</a>.</p><a class="jt-btn" href="/">Go to the website</a></section>`;
  status('Not found', false);
}

let es, pollT, retry = 0;
function connect() {
  if (!code) return notFound();
  if (!('EventSource' in window)) { status('Live', true); poll(); pollT = setInterval(poll, 8000); return; }
  es = new EventSource(`/api/track/${encodeURIComponent(code)}/stream`);
  es.addEventListener('order', (e) => { retry = 0; status('Live', true); render(JSON.parse(e.data)); });
  es.onerror = () => {
    es.close(); status('Reconnecting…', false);
    poll().catch(() => {}).finally(() => { if (!last && retry > 1) return; setTimeout(connect, Math.min(15000, 1000 * 2 ** retry++)); });
  };
}
connect();
setInterval(() => { if (last && (last.status === 'received' || last.status === 'preparing')) render(last); }, 30000); // refresh "about N min"
document.addEventListener('visibilitychange', () => { if (!document.hidden) poll().catch(() => {}); });
