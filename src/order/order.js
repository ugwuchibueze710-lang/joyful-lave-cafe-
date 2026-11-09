// Online ordering — ORDER ONLINE, PAY AT PICKUP.
// Customise → bag → pickup + details → review → PLACE ORDER → JOYTRACK.
// No card, no online payment. Prices shown here are re-checked by the server.
import { itemsById } from '../data/menu.js';
import { priceLine, priceCart, defaultChoices, lineSummary, money, DEFAULT_TAX_RATE } from '../data/pricing.js';
import { pickupWindow } from '../data/schedule.js';
import { applyOverrides } from '../data/overrides.js';
import './order.css';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const lock = () => dispatchEvent(new CustomEvent('jjj:lock'));
const unlock = () => { if (!$('.osheet.is-open') && !$('.obag.is-open')) dispatchEvent(new CustomEvent('jjj:unlock')); };

/* ── state ────────────────────────────────────────────────────────────── */
let config = { taxRate: DEFAULT_TAX_RATE, ordersPaused: false, soldOut: [], pickup: pickupWindow() };
let bag = store.get('jjj-bag', []).filter((l) => itemsById[l.itemId]); // [{ key, itemId, qty, choices, note }]
let details = store.get('jjj-details', { name: '', phone: '', notes: '', pickup: { type: 'asap' } });
let step = 'bag';
const sid = store.get('jjj-sid', null) || (() => { const id = (crypto.randomUUID?.() || String(Math.random()).slice(2) + Date.now()).replace(/-/g, '').slice(0, 24); store.set('jjj-sid', id); return id; })();
let viewing = '';

const saveBag = () => { store.set('jjj-bag', bag); renderFab(); syncLive(); };
const saveDetails = () => store.set('jjj-details', details);
const pricedBag = () => (bag.length ? priceCart(bag, { taxRate: config.taxRate }) : null);

export async function loadConfig() {
  try {
    const r = await fetch('/api/config', { cache: 'no-store' });
    if (r.ok) {
      const prev = JSON.stringify(config.overrides || null);
      config = await r.json();
      if (JSON.stringify(config.overrides || null) !== prev) { applyOverrides(config.overrides); dispatchEvent(new CustomEvent('jjj:menu-changed')); }
    }
  } catch { /* offline: keep local schedule */ }
  markSoldOut();
  renderBanner();
  return config;
}

/* ── site-wide announcement banner (set by the owner or the agency) ───── */
function renderBanner() {
  const a = config.announcement;
  let bar = document.getElementById('siteBanner');
  if (!a?.text) { bar?.remove(); document.documentElement.classList.remove('has-banner'); return; }
  if (!bar) { bar = document.createElement('div'); bar.id = 'siteBanner'; bar.setAttribute('role', 'status'); document.body.prepend(bar); }
  bar.className = `site-banner site-banner--${a.tone || 'info'}`;
  bar.textContent = a.text;
  document.documentElement.classList.add('has-banner');
}

/* ── live cart sync (staff see the order forming) ─────────────────────── */
let syncT = 0;
function syncLive() {
  clearTimeout(syncT);
  syncT = setTimeout(() => {
    const body = JSON.stringify({ lines: bag.map(({ itemId, qty, choices }) => ({ itemId, qty, choices })), step: isOpen() ? (step === 'bag' ? 'cart' : step) : viewing ? 'customizing' : 'browsing', firstName: details.name, viewing });
    fetch(`/api/carts/${sid}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
  }, 600);
}
addEventListener('pagehide', () => { if (!bag.length) navigator.sendBeacon?.(`/api/carts/${sid}`, new Blob([JSON.stringify({ lines: [], step: 'browsing' })], { type: 'application/json' })); });

/* ── floating bag button + active-order chip ──────────────────────────── */
function renderFab() {
  let fab = $('#obagFab');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'obagFab'; fab.className = 'ofab'; fab.type = 'button';
    fab.addEventListener('click', () => openBag());
    document.body.appendChild(fab);
  }
  const p = pricedBag();
  const n = bag.reduce((a, l) => a + l.qty, 0);
  fab.innerHTML = `<span class="ofab__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg><b>${n}</b></span><span class="ofab__txt">${n ? `Your order · ${money(p?.ok ? p.subtotal : 0)}` : 'Start an order'}</span>`;
  fab.classList.toggle('has-items', n > 0);
  fab.setAttribute('aria-label', n ? `Open your order, ${n} item${n > 1 ? 's' : ''}` : 'Start a pickup order');

  const recent = store.get('jjj-orders', []).filter((o) => Date.now() - new Date(o.at).getTime() < 12 * 3600e3);
  let chip = $('#otrackChip');
  if (recent.length) {
    if (!chip) { chip = document.createElement('a'); chip.id = 'otrackChip'; chip.className = 'otrack-chip'; document.body.appendChild(chip); }
    const o = recent[0];
    chip.href = `/track/${o.code}`;
    chip.innerHTML = `<i></i>Track order #${o.number}<span>JOYTRACK</span>`;
  } else chip?.remove();
}

/* ── customise sheet ──────────────────────────────────────────────────── */
let sheet;
function ensureSheet() {
  if (sheet) return sheet;
  sheet = document.createElement('div');
  sheet.className = 'osheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-modal', 'true'); sheet.setAttribute('aria-labelledby', 'osheetTitle');
  sheet.innerHTML = `<div class="osheet__scrim" data-close></div><div class="osheet__panel" tabindex="-1"><button class="oclose" type="button" data-close aria-label="Close">×</button><div class="osheet__body"></div><div class="osheet__foot"></div></div>`;
  sheet.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeSheet(); });
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
  document.body.appendChild(sheet);
  return sheet;
}

export function openItem(itemId, editKey = null) {
  const item = itemsById[itemId]; if (!item) return;
  if (config.soldOut.includes(item.id)) return toast(`${item.name} is sold out right now.`);
  const existing = editKey ? bag.find((l) => l.key === editKey) : null;
  const state = { choices: existing ? structuredClone(existing.choices) : defaultChoices(item), qty: existing?.qty ?? 1, note: existing?.note ?? '' };
  ensureSheet();
  viewing = item.id; syncLive();
  const body = $('.osheet__body', sheet), foot = $('.osheet__foot', sheet);
  body.innerHTML = `
    ${item.photo ? `<figure class="osheet__photo"><img src="${item.photo}" alt="" /><figcaption>${item.stock ? 'Sample photo' : 'From the cafe'}</figcaption></figure>` : ''}
    <div class="osheet__head"><p class="eyebrow">${esc(catName(item))}</p><h3 id="osheetTitle">${esc(item.name)}</h3><p>${esc(item.desc)}</p></div>
    ${item.groups.map((g) => `
      <fieldset class="ogroup" data-group="${g.id}">
        <legend>${esc(g.name)}<small>${g.type === 'one' ? ((g.min ?? 1) > 0 ? 'Required' : 'Optional') : g.max ? `Up to ${g.max}` : 'Optional'}</small></legend>
        <div class="ogroup__opts">${g.options.map(([n, p], i) => {
          const id = `o-${g.id}-${i}`;
          const on = g.type === 'one' ? state.choices[g.id] === n : (state.choices[g.id] || []).includes(n);
          return `<label class="ochip" for="${id}"><input id="${id}" type="${g.type === 'one' ? 'radio' : 'checkbox'}" name="${g.id}" value="${esc(n)}" ${on ? 'checked' : ''} ${g.type === 'one' && (g.min ?? 1) === 0 ? 'data-toggle' : ''}/><span>${esc(n)}</span>${g.isSize ? `<b>${money(p)}</b>` : p ? `<b>+${money(p)}</b>` : ''}</label>`;
        }).join('')}</div>
      </fieldset>`).join('')}
    <label class="onote"><span>Special requests <small>Optional</small></span><textarea maxlength="140" rows="2" placeholder="e.g. light ice, extra hot">${esc(state.note)}</textarea></label>`;
  const render = () => {
    const p = priceLine({ itemId: item.id, qty: state.qty, choices: state.choices, note: state.note });
    foot.innerHTML = `
      <div class="oqty" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Fewer">−</button><output aria-live="polite">${state.qty}</output><button type="button" data-q="1" aria-label="More">+</button></div>
      <button class="btn btn--red btn--lg oadd" type="button" ${p.ok ? '' : 'disabled'}>${existing ? 'Update' : 'Add to order'} · ${p.ok ? money(p.line.lineTotal) : '—'}</button>
      ${p.ok ? '' : `<p class="oerr">${esc(p.error)}</p>`}`;
  };
  body.oninput = body.onchange = (e) => {
    const inp = e.target;
    if (inp.tagName === 'TEXTAREA') { state.note = inp.value; return; }
    const gid = inp.name, g = item.groups.find((x) => x.id === gid); if (!g) return;
    if (g.type === 'one') state.choices[gid] = inp.value;
    else {
      const picked = $$(`input[name="${gid}"]:checked`, body).map((x) => x.value);
      if (g.max && picked.length > g.max) { inp.checked = false; toast(`Pick up to ${g.max}.`); return; }
      state.choices[gid] = picked;
    }
    render();
  };
  // optional single-choice groups (e.g. milk) can be un-picked by tapping again
  body.onclick = (e) => {
    const inp = e.target.closest('input[data-toggle]'); if (!inp) return;
    if (inp.dataset.was === '1') { inp.checked = false; inp.dataset.was = '0'; delete state.choices[inp.name]; render(); }
    else { $$(`input[name="${inp.name}"]`, body).forEach((x) => (x.dataset.was = '0')); inp.dataset.was = '1'; }
  };
  $$('input[data-toggle]:checked', body).forEach((x) => (x.dataset.was = '1'));
  foot.onclick = (e) => {
    const q = e.target.closest('[data-q]');
    if (q) { state.qty = Math.max(1, Math.min(20, state.qty + Number(q.dataset.q))); render(); return; }
    if (e.target.closest('.oadd')) {
      const p = priceLine({ itemId: item.id, qty: state.qty, choices: state.choices, note: state.note });
      if (!p.ok) return;
      if (existing) Object.assign(existing, { qty: state.qty, choices: state.choices, note: state.note });
      else bag.push({ key: Math.random().toString(36).slice(2, 10), itemId: item.id, qty: state.qty, choices: state.choices, note: state.note });
      viewing = ''; saveBag(); closeSheet(true);
      if (editKey) renderBag(); else { pulseFab(); toast(`Added ${item.name}`, 'View order', () => openBag()); }
    }
  };
  render();
  sheet.classList.add('is-open'); lock();
  requestAnimationFrame(() => $('.osheet__panel', sheet).focus());
}
function closeSheet(keepViewing) { if (!sheet) return; sheet.classList.remove('is-open'); if (!keepViewing) { viewing = ''; syncLive(); } unlock(); }
const catName = (item) => ({ java: 'Coffee, teas & more', specials: 'Drink special', acai: 'Acai bowl', smoothies: 'Smoothie', juice: 'Juice', breakfast: 'Breakfast', lunch: 'Lunch', chillers: 'Chiller' })[item.category] ?? '';

/* ── bag + checkout drawer ────────────────────────────────────────────── */
let drawer;
const isOpen = () => drawer?.classList.contains('is-open');
function ensureDrawer() {
  if (drawer) return drawer;
  drawer = document.createElement('aside');
  drawer.className = 'obag'; drawer.setAttribute('role', 'dialog'); drawer.setAttribute('aria-modal', 'true'); drawer.setAttribute('aria-label', 'Your pickup order');
  drawer.innerHTML = `<div class="obag__scrim" data-close></div><div class="obag__panel" tabindex="-1">
    <header class="obag__head"><div><p class="eyebrow">Pickup order</p><h3>Your order</h3></div><button class="oclose" type="button" data-close aria-label="Close">×</button></header>
    <ol class="osteps" aria-label="Checkout steps"><li data-s="bag">Bag</li><li data-s="details">Pickup</li><li data-s="review">Review</li></ol>
    <div class="obag__body"></div><footer class="obag__foot"></footer></div>`;
  drawer.addEventListener('click', onDrawerClick);
  drawer.addEventListener('input', onDrawerInput);
  drawer.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBag(); });
  document.body.appendChild(drawer);
  return drawer;
}
export function openBag(to) {
  ensureDrawer();
  if (!bag.length) { closeBag(); scrollToMenu(); toast('Pick something from the menu to start your order.'); return; }
  step = to || 'bag';
  loadConfig().then(() => renderBag());
  renderBag();
  drawer.classList.add('is-open'); lock(); syncLive();
  requestAnimationFrame(() => $('.obag__panel', drawer).focus());
}
function closeBag() { drawer?.classList.remove('is-open'); syncLive(); unlock(); }
function scrollToMenu() { dispatchEvent(new CustomEvent('jjj:goto', { detail: '#menu' })); }

function totalsHTML(p) {
  return `<dl class="ototals">
    <div><dt>Subtotal</dt><dd>${money(p.subtotal)}</dd></div>
    <div><dt>KY sales tax (${(p.taxRate * 100).toFixed(p.taxRate * 100 % 1 ? 2 : 0)}%)</dt><dd>${money(p.tax)}</dd></div>
    <div class="is-total"><dt>Total</dt><dd>${money(p.total)}</dd></div>
  </dl>
  <div class="opay"><b>PAY AT PICKUP</b><span>No card needed online. Pay ${money(p.total)} at the counter when you collect.</span></div>`;
}

function renderBag() {
  if (!drawer) return;
  const body = $('.obag__body', drawer), foot = $('.obag__foot', drawer);
  $$('.osteps li', drawer).forEach((li) => { const order = ['bag', 'details', 'review']; li.classList.toggle('is-on', li.dataset.s === step); li.classList.toggle('is-done', order.indexOf(li.dataset.s) < order.indexOf(step)); });
  const p = pricedBag();
  if (!bag.length || !p) { body.innerHTML = `<p class="oempty">Your bag is empty.</p>`; foot.innerHTML = `<button class="btn btn--red btn--lg" data-act="menu" type="button">Browse the menu</button>`; return; }
  if (!p.ok) {
    body.innerHTML = `<p class="oerr">${esc(p.error)}</p>` + linesHTML(); foot.innerHTML = ''; return;
  }
  const paused = config.ordersPaused;
  const win = config.pickup || pickupWindow();
  const canOrder = !paused && (win.asap || win.slots.length);
  const closedMsg = paused ? (config.pauseMessage || 'Online ordering is paused right now — please call the cafe.') : win.next ? `Online ordering is closed right now. We open ${win.next.day} at ${win.next.at}.` : 'Online ordering is closed right now.';

  if (step === 'bag') {
    body.innerHTML = linesHTML() + `<button class="olink" data-act="menu" type="button">+ Add more items</button>` + totalsHTML(p);
    foot.innerHTML = canOrder ? `<button class="btn btn--red btn--lg oblock" data-act="to-details" type="button">Continue · ${money(p.total)}</button>` : `<p class="oclosed">${esc(closedMsg)}</p>`;
  }
  if (step === 'details') {
    if (!win.asap && details.pickup.type === 'asap') details.pickup = { type: 'scheduled', mins: win.slots[0]?.mins };
    if (details.pickup.type === 'scheduled' && !win.slots.some((s) => s.mins === details.pickup.mins)) details.pickup.mins = win.slots[0]?.mins;
    body.innerHTML = `
      <fieldset class="ogroup"><legend>Pickup<small>At the counter · ${esc('3811 Leitchfield Rd (KY 54), Unit 103')}</small></legend>
        <div class="ogroup__opts">
          <label class="ochip ${win.asap ? '' : 'is-disabled'}"><input type="radio" name="ptype" value="asap" ${details.pickup.type === 'asap' ? 'checked' : ''} ${win.asap ? '' : 'disabled'}/><span>ASAP</span><b>${win.asap ? `about ${config.prepMinutes ?? 15} min` : 'Closed'}</b></label>
          <label class="ochip ${win.slots.length ? '' : 'is-disabled'}"><input type="radio" name="ptype" value="scheduled" ${details.pickup.type === 'scheduled' ? 'checked' : ''} ${win.slots.length ? '' : 'disabled'}/><span>Schedule for later today</span></label>
        </div>
        ${details.pickup.type === 'scheduled' ? `<label class="ofield"><span>Pickup time</span><select name="pmins">${win.slots.map((s) => `<option value="${s.mins}" ${s.mins === details.pickup.mins ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>` : ''}
        <p class="ohint">Online orders close at ${esc(win.lastOrderAt || '')}.</p>
      </fieldset>
      <label class="ofield"><span>Name for the order</span><input name="name" autocomplete="name" maxlength="60" value="${esc(details.name)}" placeholder="First and last name" required /></label>
      <label class="ofield"><span>Mobile number</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel-national" value="${esc(fmtPhone(details.phone))}" placeholder="(270) 555-0123" required /><small>So the cafe can reach you about your order.</small></label>
      <label class="ofield"><span>Notes for the cafe <small>Optional</small></span><textarea name="notes" rows="2" maxlength="300" placeholder="Anything we should know?">${esc(details.notes)}</textarea></label>
      <label class="ohp" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off" /></label>
      <p class="oerr" data-err hidden></p>`;
    foot.innerHTML = `<button class="btn btn--ghost" data-act="to-bag" type="button">Back</button><button class="btn btn--red btn--lg" data-act="to-review" type="button">Review order</button>`;
  }
  if (step === 'review') {
    const when = details.pickup.type === 'asap' ? 'ASAP — we start as soon as it comes in' : `Today at ${win.slots.find((s) => s.mins === details.pickup.mins)?.label ?? ''}`;
    body.innerHTML = `
      <div class="oreview">
        <div><span>Pickup</span><b>${esc(when)}</b></div>
        <div><span>Name</span><b>${esc(details.name)}</b></div>
        <div><span>Phone</span><b>${esc(fmtPhone(details.phone))}</b></div>
        ${details.notes ? `<div><span>Notes</span><b>${esc(details.notes)}</b></div>` : ''}
      </div>
      ${linesHTML(true)}
      ${totalsHTML(p)}
      <p class="oerr" data-err hidden></p>`;
    foot.innerHTML = `<button class="btn btn--ghost" data-act="to-details" type="button">Back</button><button class="btn btn--red btn--lg oplace" data-act="place" type="button" ${canOrder ? '' : 'disabled'}>PLACE ORDER · ${money(p.total)}</button>`;
  }
}

function linesHTML(readOnly = false) {
  return `<ul class="olines">${bag.map((l) => {
    const p = priceLine(l); const it = itemsById[l.itemId];
    if (!p.ok) return `<li class="oline is-bad"><div><b>${esc(it?.name ?? 'Item')}</b><p class="oerr">${esc(p.error)}</p></div>${readOnly ? '' : `<button class="olink" data-act="remove" data-key="${l.key}" type="button">Remove</button>`}</li>`;
    const sum = lineSummary(p.line);
    return `<li class="oline">
      ${it.photo ? `<img src="${it.photo}" alt="" loading="lazy" />` : '<span class="oline__ph"></span>'}
      <div class="oline__main"><b>${p.line.qty > 1 ? `${p.line.qty}× ` : ''}${esc(p.line.name)}</b>${sum ? `<small>${esc(sum)}</small>` : ''}${p.line.note ? `<small class="oline__note">“${esc(p.line.note)}”</small>` : ''}
        ${readOnly ? '' : `<span class="oline__acts"><button type="button" data-act="dec" data-key="${l.key}" aria-label="One fewer">−</button><output>${l.qty}</output><button type="button" data-act="inc" data-key="${l.key}" aria-label="One more">+</button><button class="olink" type="button" data-act="edit" data-key="${l.key}">Edit</button><button class="olink" type="button" data-act="remove" data-key="${l.key}">Remove</button></span>`}
      </div>
      <span class="oline__price">${money(p.line.lineTotal)}</span>
    </li>`;
  }).join('')}</ul>`;
}

function onDrawerInput(e) {
  const t = e.target;
  if (t.name === 'name') details.name = t.value;
  if (t.name === 'phone') details.phone = t.value.replace(/\D/g, '').slice(0, 11);
  if (t.name === 'notes') details.notes = t.value;
  if (t.name === 'ptype') { details.pickup = { type: t.value, mins: (config.pickup?.slots ?? [])[0]?.mins }; saveDetails(); renderBag(); return; }
  if (t.name === 'pmins') details.pickup.mins = Number(t.value);
  saveDetails(); syncLive();
}
async function onDrawerClick(e) {
  if (e.target.closest('[data-close]')) return closeBag();
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act, line = bag.find((l) => l.key === b.dataset.key);
  if (act === 'menu') { closeBag(); scrollToMenu(); }
  if (act === 'inc' && line) { line.qty = Math.min(20, line.qty + 1); saveBag(); renderBag(); }
  if (act === 'dec' && line) { if (line.qty > 1) line.qty--; else bag = bag.filter((l) => l !== line); saveBag(); if (bag.length) renderBag(); else closeBag(); }
  if (act === 'remove') { bag = bag.filter((l) => l.key !== b.dataset.key); saveBag(); if (bag.length) renderBag(); else closeBag(); }
  if (act === 'edit' && line) openItem(line.itemId, line.key);
  if (act === 'to-bag') { step = 'bag'; renderBag(); }
  if (act === 'to-details') { step = 'details'; renderBag(); syncLive(); $('.obag__body', drawer).scrollTop = 0; }
  if (act === 'to-review') {
    const err = validateDetails();
    if (err) return showErr(err.msg, err.field);
    step = 'review'; renderBag(); syncLive(); $('.obag__body', drawer).scrollTop = 0;
  }
  if (act === 'place') place(b);
}
function validateDetails() {
  const name = details.name.replace(/\s+/g, ' ').trim();
  const phone = details.phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  if (name.length < 2) return { msg: 'Please enter the name for the order.', field: 'name' };
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(phone)) return { msg: 'Please enter a valid 10-digit mobile number.', field: 'phone' };
  if (details.pickup.type === 'scheduled' && !details.pickup.mins) return { msg: 'Choose a pickup time.', field: 'pmins' };
  return null;
}
function showErr(msg, field) {
  const el = $('[data-err]', drawer); if (el) { el.hidden = false; el.textContent = msg; }
  if (field) { const f = $(`[name="${field}"]`, drawer); f?.focus(); f?.setAttribute('aria-invalid', 'true'); }
  if (!el) toast(msg);
}

let placing = false;
async function place(btn) {
  if (placing) return;
  const err = validateDetails(); if (err) { step = 'details'; renderBag(); return showErr(err.msg, err.field); }
  placing = true; btn.disabled = true; btn.classList.add('is-busy'); btn.textContent = 'Placing your order…';
  try {
    const r = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines: bag.map(({ itemId, qty, choices, note }) => ({ itemId, qty, choices, note })),
        pickup: details.pickup, customer: { name: details.name, phone: details.phone }, notes: details.notes,
        cartSid: sid, website: $('[name="website"]', drawer)?.value || '',
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(d.error || 'Could not place your order.'), { field: d.field });
    const orders = store.get('jjj-orders', []); orders.unshift({ number: d.number, code: d.code, at: new Date().toISOString() }); store.set('jjj-orders', orders.slice(0, 10));
    bag = []; store.set('jjj-bag', bag);
    details.notes = ''; saveDetails();
    showPlaced(d);
  } catch (e) {
    placing = false; btn.disabled = false; btn.classList.remove('is-busy'); btn.textContent = 'Try again';
    if (e.field) { step = e.field === 'pickup' ? 'details' : step; if (e.field === 'name' || e.field === 'phone') step = 'details'; renderBag(); }
    showErr(e.message, e.field);
    loadConfig().then(() => { if (step === 'details') renderBag(); });
  }
}
function showPlaced(d) {
  const body = $('.obag__body', drawer), foot = $('.obag__foot', drawer);
  $('.osteps', drawer).hidden = true;
  body.innerHTML = `<div class="oplaced">
    <div class="oplaced__ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52"/><path d="M38 62l15 15 30-33"/></svg></div>
    <p class="eyebrow">Order placed</p><h3>#${d.number}</h3>
    <p>Thanks, ${esc(details.name.split(' ')[0])}! We got it. Follow every step live on JOYTRACK.</p>
    <div class="opay"><b>PAY AT PICKUP</b><span>${money(d.order.total)} due at the counter.</span></div>
  </div>`;
  foot.innerHTML = `<a class="btn btn--red btn--lg oblock" href="${d.trackUrl}">Open JOYTRACK</a>`;
  renderFab();
  setTimeout(() => { location.href = d.trackUrl; }, 2600);
}

/* ── helpers ──────────────────────────────────────────────────────────── */
function fmtPhone(d) { d = String(d).replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); if (d.length < 4) return d; if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`; return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`; }
function pulseFab() { const f = $('#obagFab'); f?.classList.remove('is-pulse'); void f?.offsetWidth; f?.classList.add('is-pulse'); }
let toastT;
export function toast(msg, actionLabel, action) {
  let t = $('#otoast');
  if (!t) { t = document.createElement('div'); t.id = 'otoast'; t.className = 'otoast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = `<span>${esc(msg)}</span>${actionLabel ? `<button type="button">${esc(actionLabel)}</button>` : ''}`;
  if (action) t.querySelector('button').onclick = () => { t.classList.remove('is-on'); action(); };
  t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), 3600);
}
function markSoldOut() {
  $$('.item[data-item]').forEach((el) => {
    const out = config.soldOut.includes(el.dataset.item);
    el.classList.toggle('is-soldout', out);
    const btn = $('.item__add', el); if (btn) { btn.disabled = out; btn.textContent = out ? 'Sold out' : 'Add'; }
  });
}

/* ── wire the page ────────────────────────────────────────────────────── */
export function initOrdering() {
  renderFab();
  loadConfig();
  // any "Order Online" button opens the bag (or sends people to the menu)
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-order]');
    if (o) { e.preventDefault(); if (bag.length) openBag(); else { scrollToMenu(); toast('Pick something from the menu to start your order.'); } return; }
    const add = e.target.closest('.item__add, .item[data-item] .item__photo, .item[data-item] h4');
    if (add) { const card = add.closest('.item[data-item]'); if (card) { e.preventDefault(); openItem(card.dataset.item); } }
  });
  document.addEventListener('jjj:menu-drawn', markSoldOut);
  if (bag.length) syncLive();
  setInterval(loadConfig, 60000);
}
