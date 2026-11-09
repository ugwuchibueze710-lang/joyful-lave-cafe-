// Owner dashboard — live online orders (customers pay at the counter when they pick up),
// live carts, order history, sold-out switches and settings.
import '../telemetry.js';
import { mountConnections } from './connections.js';
import './admin.css';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const money = (n) => `$${Number(n || 0).toFixed(2)}`;
const TZ = 'America/Chicago';
const clock = (d) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(d));
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(d));
const ago = (d) => { const m = Math.round((Date.now() - new Date(d)) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.floor(m / 60)}h ${m % 60}m ago`; };
const phoneFmt = (p) => p?.length === 10 ? `(${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}` : p;
const root = $('#root');

async function api(path, body) {
  const r = await fetch(path, body === undefined ? { cache: 'no-store' } : { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Joyfull': '1' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { showLogin(); throw new Error(d.error || 'Please sign in.'); }
  if (!r.ok) throw new Error(d.error || 'Something went wrong.');
  return d;
}

/* ── state ────────────────────────────────────────────────────────────── */
const S = { me: null, orders: new Map(), carts: new Map(), settings: {}, staff: [], menu: [], storage: '', view: 'live', filter: 'today', open: null, seen: new Set() };
try { JSON.parse(localStorage.getItem('jjj-seen') || '[]').forEach((id) => S.seen.add(id)); } catch {}
const saveSeen = () => { try { localStorage.setItem('jjj-seen', JSON.stringify([...S.seen].slice(-800))); } catch {} };

/* ── sign in ──────────────────────────────────────────────────────────── */
async function showLogin(err) {
  es?.close();
  const roster = await fetch('/api/staff/roster').then((r) => r.json()).catch(() => ({ staff: [], ownerReady: true }));
  root.innerHTML = `<main class="ad-login">
    <form class="ad-login__card" id="login" autocomplete="off">
      <img src="/photos/joyfull-logo.webp" alt="" width="64" height="64" />
      <h1>Orders dashboard</h1>
      <p>Joy-Full Java + Juice · staff only</p>
      <div class="ad-seg" role="tablist">
        <button type="button" data-mode="staff" class="${roster.staff.length ? 'is-on' : ''}" ${roster.staff.length ? '' : 'disabled'}>Staff PIN</button>
        <button type="button" data-mode="owner" class="${roster.staff.length ? '' : 'is-on'}">Owner</button>
      </div>
      <div data-pane="staff" ${roster.staff.length ? '' : 'hidden'}>
        <label>Who's on shift?<select name="staffId">${roster.staff.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
        <label>PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" /></label>
      </div>
      <div data-pane="owner" ${roster.staff.length ? 'hidden' : ''}>
        <label>Your name<input name="name" value="Ashley" maxlength="40" /></label>
        <label>Owner password<input name="password" type="password" autocomplete="current-password" /></label>
        ${roster.ownerReady ? '' : '<p class="ad-warn">OWNER_PASSWORD isn’t set on the server yet.</p>'}
      </div>
      <p class="ad-err" ${err ? '' : 'hidden'}>${esc(err || '')}</p>
      <button class="ad-btn ad-btn--red ad-btn--lg" type="submit">Sign in</button>
    </form></main>`;
  let mode = roster.staff.length ? 'staff' : 'owner';
  const f = $('#login');
  f.addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (!b) return; mode = b.dataset.mode; $$('[data-mode]', f).forEach((x) => x.classList.toggle('is-on', x === b)); $$('[data-pane]', f).forEach((p) => (p.hidden = p.dataset.pane !== mode)); });
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(f));
    const body = mode === 'owner' ? { mode, password: fd.password, name: fd.name } : { staffId: fd.staffId, pin: fd.pin };
    const r = await fetch('/api/staff/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { const el = $('.ad-err', f); el.hidden = false; el.textContent = d.error || 'Could not sign in.'; return; }
    boot();
  });
}

/* ── boot + live stream ───────────────────────────────────────────────── */
let es;
async function boot() {
  let d;
  try { d = await api('/api/admin/bootstrap'); } catch { return; }
  S.me = d.me; S.settings = d.settings; S.staff = d.staff; S.menu = d.menu; S.storage = d.storage; S.pickup = d.pickup;
  S.orders = new Map(d.orders.map((o) => [o.id, o]));
  S.carts = new Map(d.carts.map((c) => [c.sid, c]));
  if (!S.seen.size) d.orders.forEach((o) => S.seen.add(o.id));
  shell(); render(); connect();
}
function connect() {
  es?.close();
  es = new EventSource('/api/admin/stream');
  es.addEventListener('hello', (e) => { setLive(true); const d = JSON.parse(e.data); S.carts = new Map(d.carts.map((c) => [c.sid, c])); renderCarts(); });
  es.addEventListener('order:new', (e) => { const o = JSON.parse(e.data); S.orders.set(o.id, o); ding(); flash(`New order #${o.number} · ${o.customer.name} · ${money(o.total)}`); render(); });
  es.addEventListener('order', (e) => { const o = JSON.parse(e.data); S.orders.set(o.id, o); render(); });
  es.addEventListener('cart', (e) => { const c = JSON.parse(e.data); S.carts.set(c.sid, c); renderCarts(); });
  es.addEventListener('cart:remove', (e) => { S.carts.delete(JSON.parse(e.data).sid); renderCarts(); });
  es.addEventListener('signout', () => { es.close(); showLogin('You were signed out remotely. Please sign in again.'); });
  es.addEventListener('settings', (e) => { S.settings = JSON.parse(e.data); renderTop(); if (S.view === 'settings') renderSettings(); });
  es.onerror = () => { setLive(false); es.close(); setTimeout(async () => { try { await api('/api/staff/me').then((m) => { if (!m) throw 0; }); connect(); boot(); } catch { showLogin('Signed out. Please sign in again.'); } }, 3000); };
}
const setLive = (ok) => { const el = $('#adLive'); if (el) { el.classList.toggle('is-ok', ok); el.querySelector('b').textContent = ok ? 'Live' : 'Reconnecting…'; } };

/* ── sound ────────────────────────────────────────────────────────────── */
let ac;
function ding() {
  try {
    ac ??= new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320, 880, 1320].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = f; o.connect(g); g.connect(ac.destination); const t = ac.currentTime + i * 0.18; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o.start(t); o.stop(t + 0.52); });
  } catch {}
  try { if (document.hidden && Notification.permission === 'granted') new Notification('New online order', { icon: '/photos/joyfull-logo.webp' }); } catch {}
}

/* ── layout ───────────────────────────────────────────────────────────── */
let conn = null;
function shell() {
  root.innerHTML = `
  <header class="ad-top">
    <div class="ad-brand"><img src="/photos/joyfull-logo.webp" alt="" width="38" height="38" /><div><b>Online orders</b><small>Pay at pickup</small></div></div>
    <nav class="ad-tabs" id="adTabs">
      <button data-view="live">Live board</button><button data-view="history">Order history</button><button data-view="menu">Sold out</button><button data-view="settings">Settings</button>
    </nav>
    <div class="ad-top__r">
      <button class="ad-pause" id="adPause" type="button"></button>
      <span class="ad-live" id="adLive"><i></i><b>Connecting…</b></span>
      ${S.me.role === 'owner'
        ? `<span class="ad-mewrap"><button class="ad-me ad-me--btn" id="adMe" type="button" aria-haspopup="menu">${esc(S.me.name)}<small>${S.me.role}</small></button><span class="ad-menu" id="adMenu" hidden role="menu"><button type="button" role="menuitem" data-conn>Connections</button></span></span>`
        : `<span class="ad-me">${esc(S.me.name)}<small>${S.me.role}</small></span>`}
      <button class="ad-btn ad-btn--ghost ad-btn--sm" id="adOut" type="button">Sign out</button>
    </div>
  </header>
  <section class="ad-stats" id="adStats"></section>
  <div class="ad-body"><main id="adMain"></main><aside class="ad-carts" id="adCarts"></aside></div>
  <div class="ad-modal" id="adModal" hidden></div>
  <div class="ad-flash" id="adFlash" role="status"></div>
  <button class="ad-sound" id="adSound" type="button" hidden>🔔 Tap to turn on the new-order sound</button>`;
  $('#adTabs').onclick = (e) => { const b = e.target.closest('[data-view]'); if (!b) return; S.view = b.dataset.view; render(); };
  $('#adOut').onclick = async () => { await fetch('/api/staff/logout', { method: 'POST' }); showLogin(); };
  $('#adPause').onclick = togglePause;
  if (S.me.role === 'owner') {
    conn ??= mountConnections({ api, flash });
    const menu = $('#adMenu');
    $('#adMe').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    menu.querySelector('[data-conn]').onclick = () => { menu.hidden = true; conn.open(); };
    document.addEventListener('click', () => { menu.hidden = true; });
  }
  const snd = $('#adSound'); snd.hidden = false;
  snd.onclick = () => { ac ??= new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); snd.hidden = true; try { Notification.requestPermission?.(); } catch {} };
  root.addEventListener('click', onAction);
}

function render() {
  $$('#adTabs button').forEach((b) => b.classList.toggle('is-on', b.dataset.view === S.view));
  renderTop(); renderStats(); renderCarts();
  if (S.view === 'live') renderBoard();
  if (S.view === 'history') renderHistory();
  if (S.view === 'menu') renderMenu();
  if (S.view === 'settings') renderSettings();
  if (S.open) renderModal();
}
function renderTop() {
  const p = $('#adPause'); if (!p) return;
  p.classList.toggle('is-paused', !!S.settings.ordersPaused);
  p.innerHTML = S.settings.ordersPaused ? '<i></i>Online ordering PAUSED · resume' : '<i></i>Taking online orders';
}
const today = () => [...S.orders.values()].filter((o) => dayKey(o.createdAt) === dayKey(new Date()));
function renderStats() {
  const t = today().filter((o) => o.status !== 'cancelled');
  const active = t.filter((o) => ['received', 'preparing', 'ready'].includes(o.status)).length;
  const ready = t.filter((o) => o.status === 'ready').length;
  const done = t.filter((o) => o.status === 'completed').length;
  $('#adStats').innerHTML = `
    <div><span>Orders today</span><b>${t.length}</b></div>
    <div><span>In progress</span><b>${active}</b></div>
    <div><span>Ordered today</span><b>${money(t.reduce((a, o) => a + o.total, 0))}</b></div>
    <div><span>Ready for pickup</span><b>${ready}</b></div>
    <div><span>Picked up today</span><b>${done}</b></div>`;
}

/* ── live board ───────────────────────────────────────────────────────── */
const COLS = [
  { id: 'received', title: 'New', hint: 'Just came in' },
  { id: 'preparing', title: 'Preparing', hint: 'Being made' },
  { id: 'ready', title: 'Ready for pickup', hint: 'Waiting at the counter' },
  { id: 'completed', title: 'Picked up', hint: 'Handed over today' },
];
function renderBoard() {
  const list = [...S.orders.values()];
  const recentDone = (o) => o.status === 'completed' && Date.now() - new Date(o.history.at(-1).at) < 3 * 3600e3;
  $('#adMain').innerHTML = `<div class="ad-board">${COLS.map((c) => {
    const os = list.filter((o) => o.status === c.id && (c.id !== 'completed' || recentDone(o))).sort((a, b) => (c.id === 'completed' ? b.createdAt.localeCompare(a.createdAt) : sortKey(a) - sortKey(b)));
    return `<section class="ad-col ad-col--${c.id}"><header><h2>${c.title}</h2><span>${os.length}</span><small>${c.hint}</small></header>
      <div class="ad-col__list">${os.map(card).join('') || '<p class="ad-none">Nothing here.</p>'}</div></section>`;
  }).join('')}</div>`;
  list.forEach((o) => { if (!S.seen.has(o.id)) { S.seen.add(o.id); } }); saveSeen();
}
const sortKey = (o) => new Date(o.pickup.type === 'scheduled' ? o.estReadyAt : o.createdAt).getTime();

function payBadge(o) { return o.status === 'cancelled' ? '<span class="ad-pay is-void">Cancelled</span>' : ''; }
function card(o) {
  const fresh = !S.seen.has(o.id);
  const late = ['received', 'preparing'].includes(o.status) && new Date(o.estReadyAt) < Date.now();
  const done = o.items.filter((l) => l.prep === 'done').length;
  const next = { received: ['preparing', 'Start'], preparing: ['ready', 'Mark READY'], ready: ['completed', 'Picked up'] }[o.status];
  return `<article class="ad-card ${fresh ? 'is-fresh' : ''} ${late ? 'is-late' : ''}" data-open="${o.id}">
    <header><b>#${o.number}</b><span>${esc(o.customer.name)}</span><em>${money(o.total)}</em></header>
    <p class="ad-card__when">${o.pickup.type === 'scheduled' ? `⏰ Pickup ${esc(o.pickup.label)}` : `ASAP · ready ~${clock(o.estReadyAt)}`}${late ? ' · <b>LATE</b>' : ''} <small>${ago(o.createdAt)}</small></p>
    <ul>${o.items.map((l) => `<li class="is-${l.prep}"><i></i>${l.qty > 1 ? `<b>${l.qty}×</b> ` : ''}${esc(l.name)}${l.size ? ` <small>${esc(l.size)}</small>` : ''}</li>`).join('')}</ul>
    ${o.notes ? `<p class="ad-card__note">📝 ${esc(o.notes)}</p>` : ''}
    <footer>${payBadge(o)}<span class="ad-card__prog">${done}/${o.items.length}</span>
      ${next ? `<button class="ad-btn ad-btn--sm ${next[0] === 'ready' ? 'ad-btn--purple' : next[0] === 'completed' ? '' : 'ad-btn--red'}" data-status="${next[0]}" data-id="${o.id}">${next[1]}</button>` : ''}
    </footer>
  </article>`;
}

/* ── order detail ─────────────────────────────────────────────────────── */
function renderModal() {
  const o = S.orders.get(S.open); const m = $('#adModal'); if (!o) { m.hidden = true; return; }
  const P = { queued: 'Up next', making: 'Making', done: 'Done' };
  const closed = ['completed', 'cancelled'].includes(o.status);
  const statusBtns = { received: [['preparing', 'Start preparing', 'red'], ['ready', 'Mark READY', 'purple'], ['cancelled', 'Cancel order', 'ghost']], preparing: [['ready', 'Mark READY FOR PICKUP', 'purple'], ['received', 'Back to new', 'ghost'], ['cancelled', 'Cancel order', 'ghost']], ready: [['completed', 'Mark COMPLETED (picked up)', 'ink'], ['preparing', 'Back to preparing', 'ghost'], ['cancelled', 'Cancel order', 'ghost']], completed: [['ready', 'Undo — back to ready', 'ghost']], cancelled: [['received', 'Restore order', 'ghost']] }[o.status];
  m.hidden = false;
  m.innerHTML = `<div class="ad-modal__scrim" data-close></div>
  <div class="ad-modal__panel" role="dialog" aria-modal="true" aria-label="Order ${o.number}">
    <button class="ad-x" data-close aria-label="Close">×</button>
    <header class="ad-det__h">
      <div><p class="ad-eyebrow">Online order · ${clock(o.createdAt)} · ${ago(o.createdAt)}</p><h2>#${o.number} · ${esc(o.customer.name)}</h2>
        <p><a href="tel:+1${o.customer.phone}">${phoneFmt(o.customer.phone)}</a> · ${o.pickup.type === 'scheduled' ? `Pickup at <b>${esc(o.pickup.label)}</b>` : `ASAP · est. ready <b>${clock(o.estReadyAt)}</b>`}</p></div>
      <div class="ad-det__badges"><span class="ad-status is-${o.status}">${o.status === 'ready' ? 'READY FOR PICKUP' : o.status.toUpperCase()}</span>${payBadge(o)}</div>
    </header>

    <div class="ad-det__grid">
      <section>
        <h3>Items <small>tap to update each one — the customer sees it live</small></h3>
        <ul class="ad-items">${o.items.map((l) => `<li class="is-${l.prep}">
          <div><b>${l.qty > 1 ? `${l.qty}× ` : ''}${esc(l.name)}</b><small>${esc([l.size, ...l.options.map((x) => x.name)].filter(Boolean).join(' · '))}</small>${l.note ? `<small class="n">“${esc(l.note)}”</small>` : ''}</div>
          <span class="ad-items__p">${money(l.lineTotal)}</span>
          <div class="ad-prep">${['queued', 'making', 'done'].map((p) => `<button data-prep="${p}" data-id="${o.id}" data-line="${l.lineId}" class="${l.prep === p ? 'is-on' : ''}" ${closed ? 'disabled' : ''}>${P[p]}</button>`).join('')}</div>
        </li>`).join('')}</ul>
        ${o.notes ? `<p class="ad-card__note">📝 ${esc(o.notes)}</p>` : ''}
        <dl class="ad-tot"><div><dt>Subtotal</dt><dd>${money(o.subtotal)}</dd></div><div><dt>Sales tax</dt><dd>${money(o.tax)}</dd></div><div class="t"><dt>Total due</dt><dd>${money(o.total)}</dd></div></dl>
      </section>

      <section>
        <h3>Preparation</h3>
        <div class="ad-acts">${statusBtns.map(([s, label, tone]) => `<button class="ad-btn ad-btn--${tone}" data-status="${s}" data-id="${o.id}">${label}</button>`).join('')}</div>
        ${['received', 'preparing'].includes(o.status) ? `<div class="ad-eta"><span>Ready time</span><button class="ad-btn ad-btn--ghost ad-btn--sm" data-eta="-5" data-id="${o.id}">−5 min</button><b>${clock(o.estReadyAt)}</b><button class="ad-btn ad-btn--ghost ad-btn--sm" data-eta="5" data-id="${o.id}">+5 min</button><button class="ad-btn ad-btn--ghost ad-btn--sm" data-eta="10" data-id="${o.id}">+10</button></div>` : ''}

        <p class="ad-small">Customer pays ${money(o.total)} at the counter when they pick up.</p>

        <h3>Timeline</h3>
        <ol class="ad-hist">${[...o.history.map((h) => ({ at: h.at, t: `${h.status === 'ready' ? 'Ready for pickup' : h.status[0].toUpperCase() + h.status.slice(1)}`, by: h.by })), ].sort((a, b) => a.at.localeCompare(b.at)).map((h) => `<li class="${h.pay ? 'is-pay' : ''}"><time>${clock(h.at)}</time><span>${esc(h.t)}</span><small>${esc(h.by || '')}</small></li>`).join('')}</ol>
        <p class="ad-small"><a href="${o.trackUrl}" target="_blank" rel="noopener">Open the customer's JOYTRACK view ↗</a></p>
      </section>
    </div>
  </div>`;
}

async function onAction(e) {
  const t = e.target;
  if (t.closest('[data-close]')) { S.open = null; $('#adModal').hidden = true; return; }
  const back = t.closest('[data-back]'); if (back) { S.open = back.dataset.back; renderModal(); return; }
  try {
    const st = t.closest('[data-status]');
    if (st) {
      e.stopPropagation();
      const o = S.orders.get(st.dataset.id), to = st.dataset.status;
      if (to === 'cancelled' && !confirm(`Cancel order #${o.number}? The customer will see it was cancelled.`)) return;
      const u = await api(`/api/admin/orders/${st.dataset.id}/status`, { status: to }); S.orders.set(u.id, u); render(); return;
    }
    const pr = t.closest('[data-prep]');
    if (pr) { const u = await api(`/api/admin/orders/${pr.dataset.id}/items/${pr.dataset.line}`, { prep: pr.dataset.prep }); S.orders.set(u.id, u); render(); return; }
    const eta = t.closest('[data-eta]');
    if (eta) { const u = await api(`/api/admin/orders/${eta.dataset.id}/eta`, { addMinutes: Number(eta.dataset.eta) }); S.orders.set(u.id, u); render(); return; }
    const op = t.closest('[data-open]');
    if (op && !t.closest('button, a')) { S.open = op.dataset.open; S.seen.add(S.open); saveSeen(); render(); }
  } catch (err) { flash(err.message, true); }
}
function ask(title, text, buttons) {
  return new Promise((res) => {
    const d = document.createElement('div'); d.className = 'ad-ask';
    d.innerHTML = `<div class="ad-ask__card"><h3>${esc(title)}</h3><p>${esc(text)}</p><div class="ad-acts">${buttons.map(([v, l, tone]) => `<button class="ad-btn ad-btn--${tone}" data-v="${v}">${esc(l)}</button>`).join('')}<button class="ad-btn ad-btn--ghost" data-v="">Back</button></div></div>`;
    d.onclick = (e) => { const b = e.target.closest('[data-v]'); if (!b && e.target !== d) return; d.remove(); res(b?.dataset.v || null); };
    document.body.appendChild(d);
  });
}
let flashT;
function flash(msg, bad) { const f = $('#adFlash'); f.textContent = msg; f.className = `ad-flash is-on${bad ? ' is-bad' : ''}`; clearTimeout(flashT); flashT = setTimeout(() => f.classList.remove('is-on'), 4000); }

/* ── live carts (customers building orders right now) ─────────────────── */
const STEP = { browsing: 'Browsing the menu', customizing: 'Customizing an item', cart: 'Reviewing their bag', details: 'Entering pickup details', review: 'On the final review — about to order' };
function renderCarts() {
  const el = $('#adCarts'); if (!el) return;
  const list = [...S.carts.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  el.innerHTML = `<header><h2><i></i>Ordering right now</h2><span>${list.length}</span></header>
    <p class="ad-small">Customers building an order on the website, live. First name only once they type it.</p>
    ${list.map((c) => `<article class="ad-cart is-${c.step}">
      <header><b>${esc(c.firstName || 'Guest')}</b><small>${ago(c.updatedAt)}</small></header>
      <p class="ad-cart__step">${STEP[c.step] || c.step}${c.viewing ? ` · <b>${esc(c.viewing)}</b>` : ''}</p>
      ${c.lines.length ? `<ul>${c.lines.map((l) => `<li>${l.qty > 1 ? `${l.qty}× ` : ''}${esc(l.name)}${l.size ? ` <small>${esc(l.size)}</small>` : ''}${l.options.length ? `<small> · ${esc(l.options.join(', '))}</small>` : ''}</li>`).join('')}</ul><p class="ad-cart__t">${money(c.total)} with tax</p>` : '<p class="ad-small">Bag empty</p>'}
    </article>`).join('') || '<p class="ad-none">No one is building an order right now.</p>'}`;
}

/* ── history ──────────────────────────────────────────────────────────── */
const STAGES = [
  ['all', 'All orders'], ['received', 'Just entered'], ['preparing', 'In progress'], ['ready', 'Ready for pickup'], ['completed', 'Done (picked up)'], ['cancelled', 'Cancelled'],
];
const RANGES = [['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['all', 'All time'], ['custom', 'Pick dates']];
const H = { stage: 'all', range: 'today', from: '', to: '', q: '' };
function inRange(o) {
  const k = dayKey(o.createdAt), today = dayKey(new Date());
  const back = (n) => dayKey(new Date(Date.now() - n * 864e5));
  switch (H.range) {
    case 'today': return k === today;
    case 'yesterday': return k === back(1);
    case '7d': return k >= back(6);
    case '30d': return k >= back(29);
    case 'month': return k.slice(0, 7) === today.slice(0, 7);
    case 'custom': return (!H.from || k >= H.from) && (!H.to || k <= H.to);
    default: return true;
  }
}
function historyList() {
  let list = [...S.orders.values()].filter(inRange).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (H.q) {
    const q = H.q.toLowerCase().trim(), digits = q.replace(/\D/g, '');
    list = list.filter((o) => String(o.number).includes(q) || o.customer.name.toLowerCase().includes(q) || (digits.length >= 3 && o.customer.phone.includes(digits))
      || o.items.some((l) => l.name.toLowerCase().includes(q)));
  }
  return list;
}
const stageLabel = (s) => ({ received: 'Just entered', preparing: 'In progress', ready: 'Ready', completed: 'Done', cancelled: 'Cancelled' })[s] || s;
const dateFmt = (d) => new Date(d).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

function renderHistory() {
  const base = historyList();
  const counts = Object.fromEntries(STAGES.map(([k]) => [k, k === 'all' ? base.length : base.filter((o) => o.status === k).length]));
  const list = H.stage === 'all' ? base : base.filter((o) => o.status === H.stage);
  const valid = list.filter((o) => o.status !== 'cancelled');
  const sum = (a) => a.reduce((t, o) => t + o.total, 0);
  // group rows by day so the record reads like a ledger
  const days = []; for (const o of list) { const k = dayKey(o.createdAt); if (!days.length || days.at(-1).k !== k) days.push({ k, at: o.createdAt, rows: [] }); days.at(-1).rows.push(o); }

  $('#adMain').innerHTML = `<div class="ad-hist2">
    <div class="ad-hbar">
      <div class="ad-seg ad-seg--wrap" data-group="range">${RANGES.map(([k, l]) => `<button data-v="${k}" class="${H.range === k ? 'is-on' : ''}">${l}</button>`).join('')}</div>
      ${H.range === 'custom' ? `<div class="ad-dates"><label>From <input type="date" id="hFrom" value="${H.from}"></label><label>To <input type="date" id="hTo" value="${H.to}"></label></div>` : ''}
    </div>
    <div class="ad-stagebar" data-group="stage">${STAGES.map(([k, l]) => `<button data-v="${k}" class="${H.stage === k ? 'is-on' : ''} is-${k}">${l}<b>${counts[k]}</b></button>`).join('')}</div>
    <div class="ad-hbar">
      <input class="ad-search" id="adQ" placeholder="Search order #, name, phone or item" value="${esc(H.q)}" />
      <button class="ad-btn ad-btn--ghost ad-btn--sm" id="hCsv" type="button" ${list.length ? '' : 'disabled'}>Export CSV</button>
      <button class="ad-btn ad-btn--ghost ad-btn--sm" id="hPrint" type="button" ${list.length ? '' : 'disabled'}>Print</button>
    </div>
    <div class="ad-hsum">
      <div><span>Orders</span><b>${list.length}</b></div>
      <div><span>Ordered (excl. cancelled)</span><b>${money(sum(valid))}</b></div>
      <div><span>Picked up</span><b>${list.filter((o) => o.status === 'completed').length}</b></div>
      <div><span>Avg order</span><b>${money(valid.length ? sum(valid) / valid.length : 0)}</b></div>
    </div>
    ${days.map((d) => `<section class="ad-day"><h3>${dateFmt(d.at)}<small>${d.rows.length} order${d.rows.length > 1 ? 's' : ''} · ${money(sum(d.rows.filter((o) => o.status !== 'cancelled')))}</small></h3>
      <table class="ad-table"><thead><tr><th>#</th><th>Placed</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Finished</th></tr></thead>
      <tbody>${d.rows.map((o) => {
        const done = [...o.history].reverse().find((h) => h.status === 'completed' || h.status === 'cancelled');
        return `<tr data-open="${o.id}">
          <td><b>${o.number}</b></td>
          <td>${clock(o.createdAt)}<small>${o.pickup.type === 'scheduled' ? `Pickup ${esc(o.pickup.label)}` : 'ASAP'}</small></td>
          <td>${esc(o.customer.name)}<small>${phoneFmt(o.customer.phone)}</small></td>
          <td class="ad-items-cell">${o.items.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ''}${esc(l.name)}${l.size ? ` (${esc(l.size)})` : ''}`).join('<br>')}</td>
          <td>${money(o.total)}</td>
          <td><span class="ad-status is-${o.status}">${stageLabel(o.status).toUpperCase()}</span></td>
          <td>${done ? `${clock(done.at)}<small>${esc(done.by || '')}</small>` : '<small>—</small>'}</td>
        </tr>`;
      }).join('')}</tbody></table></section>`).join('') || '<p class="ad-none">No orders match these filters.</p>'}
  </div>`;

  const m = $('#adMain');
  m.querySelectorAll('[data-group]').forEach((g) => (g.onclick = (e) => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    H[g.dataset.group] = b.dataset.v; renderHistory();
  }));
  $('#hFrom')?.addEventListener('change', (e) => { H.from = e.target.value; renderHistory(); });
  $('#hTo')?.addEventListener('change', (e) => { H.to = e.target.value; renderHistory(); });
  const q = $('#adQ'); q.oninput = () => { H.q = q.value; const pos = q.selectionStart; renderHistory(); const n = $('#adQ'); n.focus(); n.setSelectionRange(pos, pos); };
  $('#hCsv').onclick = () => exportCsv(list);
  $('#hPrint').onclick = () => print();
}

function exportCsv(list) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Order #', 'Date', 'Placed', 'Pickup', 'Customer', 'Phone', 'Items', 'Notes', 'Subtotal', 'Tax', 'Total', 'Status', 'Status by']];
  for (const o of list) {
    const last = o.history.at(-1);
    rows.push([o.number, dayKey(o.createdAt), clock(o.createdAt), o.pickup.type === 'scheduled' ? o.pickup.label : 'ASAP', o.customer.name, phoneFmt(o.customer.phone),
      o.items.map((l) => `${l.qty}x ${l.name}${l.size ? ` (${l.size})` : ''}${l.options.length ? ` [${l.options.map((x) => x.name).join(', ')}]` : ''}${l.note ? ` "${l.note}"` : ''}`).join('; '),
      o.notes, o.subtotal.toFixed(2), o.tax.toFixed(2), o.total.toFixed(2), stageLabel(o.status), last?.by ?? '']);
  }
  const blob = new Blob(['﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `joyfull-orders-${H.range === 'custom' ? `${H.from || 'start'}_to_${H.to || 'today'}` : H.range}-${dayKey(new Date())}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ── sold out ─────────────────────────────────────────────────────────── */
function renderMenu() {
  const out = new Set(S.settings.soldOut || []);
  const cats = [...new Set(S.menu.map((i) => i.category))];
  $('#adMain').innerHTML = `<div class="ad-panel"><h2>Sold out today</h2><p class="ad-small">Switched-off items can't be ordered online. Customers see "Sold out".</p>
    ${cats.map((c) => `<h3 class="ad-cat">${esc(c)}</h3><div class="ad-sold">${S.menu.filter((i) => i.category === c).map((i) => `<label class="${out.has(i.id) ? 'is-out' : ''}"><input type="checkbox" data-sold="${i.id}" ${out.has(i.id) ? '' : 'checked'} /><span>${esc(i.name)}</span><em>${out.has(i.id) ? 'Sold out' : 'Available'}</em></label>`).join('')}</div>`).join('')}</div>`;
  $('#adMain').onchange = async (e) => {
    const c = e.target.closest('[data-sold]'); if (!c) return;
    const set = new Set(S.settings.soldOut || []); c.checked ? set.delete(c.dataset.sold) : set.add(c.dataset.sold);
    try { S.settings = await api('/api/admin/settings', { soldOut: [...set] }); renderMenu(); } catch (err) { flash(err.message, true); }
  };
}

/* ── settings ─────────────────────────────────────────────────────────── */
async function togglePause() {
  const paused = !S.settings.ordersPaused;
  let msg = S.settings.pauseMessage || '';
  if (paused) { const m = prompt('Message customers see while paused (optional):', msg || 'We’re slammed! Online ordering is paused for a bit — call us at 270-478-4409.'); if (m === null) return; msg = m; }
  try { S.settings = await api('/api/admin/settings', { ordersPaused: paused, pauseMessage: msg }); renderTop(); flash(paused ? 'Online ordering paused' : 'Online ordering is back on'); } catch (err) { flash(err.message, true); }
}
function renderSettings() {
  const owner = S.me.role === 'owner';
  $('#adMain').innerHTML = `<div class="ad-panel ad-settings">
    <section><h2>Online ordering</h2>
      <label class="ad-toggle"><input type="checkbox" id="setPause" ${S.settings.ordersPaused ? 'checked' : ''}/><span>Pause online ordering</span></label>
      <label class="ad-field">Message while paused<input id="setMsg" maxlength="160" value="${esc(S.settings.pauseMessage || '')}" /></label>
      <label class="ad-field">Default prep time (minutes)<input id="setPrep" type="number" min="5" max="90" value="${S.settings.prepMinutes}" ${owner ? '' : 'disabled'} /></label>
      <p class="ad-small">Sales tax: ${(S.settings.taxRate * 100).toFixed(2)}% (set with TAX_RATE on the server). Customers pay at the counter when they pick up.</p>
    </section>
    <section><h2>Staff</h2>
      ${owner ? `<p class="ad-small">Each person signs in with their own PIN, so every status change shows who did it.</p>
      <ul class="ad-staff">${S.staff.map((s) => `<li><b>${esc(s.name)}</b><button class="ad-link" data-pin="${s.id}">Reset PIN</button><button class="ad-link" data-rm="${s.id}">Remove</button></li>`).join('') || '<li class="ad-none">No staff yet — add your team below.</li>'}</ul>
      <form class="ad-addstaff" id="addStaff"><input name="name" placeholder="Name" maxlength="40" required /><input name="pin" placeholder="4–8 digit PIN" inputmode="numeric" pattern="[0-9]{4,8}" required /><button class="ad-btn ad-btn--red">Add staff</button></form>` : '<p class="ad-small">Only the owner can manage staff.</p>'}
    </section>
    <section><h2>System</h2><p class="ad-small">Order storage: <b>${S.storage === 'postgres' ? 'Supabase database ✓' : 'Local file (testing only — set DATABASE_URL for Supabase)'}</b></p></section>
  </div>`;
  const m = $('#adMain');
  const save = async (patch, ok) => { try { S.settings = await api('/api/admin/settings', patch); flash(ok || 'Saved'); renderTop(); } catch (err) { flash(err.message, true); renderSettings(); } };
  $('#setPause').onchange = (e) => save({ ordersPaused: e.target.checked, pauseMessage: $('#setMsg').value });
  $('#setMsg').onchange = (e) => save({ pauseMessage: e.target.value });
  $('#setPrep').onchange = (e) => save({ prepMinutes: Number(e.target.value) });
  m.onclick = async (e) => {
    const rm = e.target.closest('[data-rm]'), pin = e.target.closest('[data-pin]');
    try {
      if (rm && confirm('Remove this staff member? They will be signed out.')) { S.staff = await api('/api/admin/staff', { action: 'remove', id: rm.dataset.rm }); renderSettings(); }
      if (pin) { const p = prompt('New 4–8 digit PIN'); if (p) { S.staff = await api('/api/admin/staff', { action: 'pin', id: pin.dataset.pin, pin: p }); flash('PIN updated'); } }
    } catch (err) { flash(err.message, true); }
  };
  const f = $('#addStaff');
  if (f) f.onsubmit = async (e) => { e.preventDefault(); try { S.staff = await api('/api/admin/staff', { action: 'add', ...Object.fromEntries(new FormData(f)) }); flash('Staff added'); renderSettings(); } catch (err) { flash(err.message, true); } };
}

setInterval(() => { if (S.me && S.view === 'live' && !S.open) { renderBoard(); renderCarts(); } }, 30000);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.open) { S.open = null; $('#adModal').hidden = true; } });

fetch('/api/staff/me').then((r) => r.json()).then((me) => (me ? boot() : showLogin())).catch(() => showLogin());
