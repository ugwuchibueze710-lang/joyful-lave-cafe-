// Joy-Full Java + Juice — order server.
// ORDER ONLINE, PAY AT PICKUP. No online payment of any kind.
// Serves the built website, the JOYTRACK tracking page and the owner dashboard,
// and pushes live updates to customers and staff over Server-Sent Events.
import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
import { issue, clear, readSession, ownerPasswordOk, ownerConfigured, hashPin, checkPin, limited } from './auth.js';
import { priceCart, DEFAULT_TAX_RATE } from '../src/data/pricing.js';
import { pickupWindow, cafeClock } from '../src/data/schedule.js';
import { business, itemsById } from '../src/data/menu.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT || 3001);
const PROD = process.env.NODE_ENV === 'production';
const TAX_RATE = Number.isFinite(Number(process.env.TAX_RATE)) && process.env.TAX_RATE !== '' ? Number(process.env.TAX_RATE) : DEFAULT_TAX_RATE;

export const PAY_METHODS = {
  cash: 'Cash',
  card_at_counter: 'Card at counter',
  mobile_wallet: 'Apple Pay / Google Pay at counter',
  gift_card: 'Gift card',
  check: 'Check',
};
const STATUSES = ['received', 'preparing', 'ready', 'completed', 'cancelled'];
const PREP = ['queued', 'making', 'done'];
const NEXT = { received: ['preparing', 'ready', 'cancelled'], preparing: ['received', 'ready', 'cancelled'], ready: ['preparing', 'completed', 'cancelled'], completed: ['ready'], cancelled: ['received'] };

const store = await createStore();
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '64kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

/* ── live channels (Server-Sent Events) ─────────────────────────────────── */
const adminClients = new Set();
const trackClients = new Map(); // orderId -> Set(res)
function sse(res) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 3000\n\n');
  const ping = setInterval(() => res.write(': ping\n\n'), 20000);
  res.on('close', () => clearInterval(ping));
}
const send = (res, event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
function toAdmins(event, data) { for (const r of adminClients) send(r, event, data); }
function toTracker(order) {
  const set = trackClients.get(order.id); if (!set) return;
  const view = publicView(order);
  for (const r of set) send(r, 'order', view);
}
function broadcast(order) { toAdmins('order', adminView(order)); toTracker(order); }

/* ── views ──────────────────────────────────────────────────────────────── */
const nowISO = () => new Date().toISOString();
const code = (o) => `${o.number}-${o.token}`;
function publicView(o) {
  return {
    number: o.number, code: code(o), createdAt: o.createdAt, status: o.status,
    timeline: o.history.map((h) => ({ status: h.status, at: h.at })),
    items: o.items.map((l) => ({ lineId: l.lineId, name: l.name, size: l.size, options: l.options.map((x) => x.name), qty: l.qty, lineTotal: l.lineTotal, note: l.note, prep: l.prep })),
    subtotal: o.subtotal, tax: o.tax, taxRate: o.taxRate, total: o.total,
    pickup: o.pickup, estReadyAt: o.estReadyAt, firstName: o.customer.name.split(/\s+/)[0],
    payment: { status: o.payment.status, method: 'pay_at_pickup' },
    cafe: { name: business.name, phone: business.phone, phoneHref: business.phoneHref, street: business.street, city: business.city, mapsUrl: business.mapsUrl },
  };
}
function adminView(o) {
  const { token, ...rest } = o;
  return { ...rest, code: code(o), trackUrl: `/track/${code(o)}` };
}

/* ── live carts: staff see orders forming as customers build them ───────── */
const carts = new Map(); // sid -> cart
const CART_TTL = 20 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [sid, c] of carts) if (now - c.updatedAtMs > CART_TTL) { carts.delete(sid); toAdmins('cart:remove', { sid }); }
}, 30000).unref();

app.post('/api/carts/:sid', (req, res) => {
  const sid = String(req.params.sid).slice(0, 40);
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(sid)) return res.status(400).end();
  if (limited('cart:' + req.ip, 240, 60000)) return res.status(429).end();
  const { lines = [], step = 'browsing', firstName = '', viewing = '' } = req.body ?? {};
  const priced = Array.isArray(lines) && lines.length ? priceCart(lines, { taxRate: TAX_RATE }) : null;
  if (!priced?.ok && !(step === 'browsing' || step === 'customizing')) { carts.delete(sid); toAdmins('cart:remove', { sid }); return res.json({ ok: true }); }
  const cart = {
    sid, step: ['browsing', 'customizing', 'cart', 'details', 'review'].includes(step) ? step : 'browsing',
    firstName: String(firstName).trim().split(/\s+/)[0].slice(0, 30),
    viewing: itemsById[viewing]?.name ?? '',
    lines: priced?.ok ? priced.lines.map((l) => ({ name: l.name, size: l.size, options: l.options.map((x) => x.name), qty: l.qty, lineTotal: l.lineTotal })) : [],
    subtotal: priced?.ok ? priced.subtotal : 0, total: priced?.ok ? priced.total : 0,
    updatedAt: nowISO(), updatedAtMs: Date.now(), startedAt: carts.get(sid)?.startedAt ?? nowISO(),
  };
  if (!cart.lines.length && cart.step === 'browsing' && !cart.viewing) { if (carts.delete(sid)) toAdmins('cart:remove', { sid }); return res.json({ ok: true }); }
  carts.set(sid, cart);
  toAdmins('cart', cart);
  res.json({ ok: true });
});
app.delete('/api/carts/:sid', (req, res) => { if (carts.delete(String(req.params.sid))) toAdmins('cart:remove', { sid: String(req.params.sid) }); res.json({ ok: true }); });

/* ── public config ──────────────────────────────────────────────────────── */
function config() {
  const s = store.settings();
  return { taxRate: TAX_RATE, ordersPaused: !!s.ordersPaused, pauseMessage: s.pauseMessage || '', soldOut: s.soldOut || [], pickup: pickupWindow(new Date(), { prepMinutes: s.prepMinutes }), payAtPickup: true, prepMinutes: s.prepMinutes || 15 };
}
app.get('/api/config', (req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(config()); });

/* ── place an order ─────────────────────────────────────────────────────── */
app.post('/api/orders', async (req, res) => {
  try {
    const b = req.body ?? {};
    if (b.website) return res.status(400).json({ error: 'Could not place order.' }); // honeypot
    if (limited('order:' + req.ip, 8, 10 * 60000)) return res.status(429).json({ error: 'Too many orders from this device. Please call the cafe.' });
    const s = store.settings();
    if (s.ordersPaused) return res.status(409).json({ error: s.pauseMessage || 'Online ordering is paused right now. Please call the cafe.' });

    const name = String(b.customer?.name ?? '').replace(/\s+/g, ' ').trim();
    const phone = String(b.customer?.phone ?? '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'Please enter your name.', field: 'name' });
    if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(phone)) return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.', field: 'phone' });
    if (limited('phone:' + phone, 6, 60 * 60000)) return res.status(429).json({ error: 'Too many orders for this phone number. Please call the cafe.' });

    const priced = priceCart(b.lines, { taxRate: TAX_RATE, soldOut: s.soldOut || [] });
    if (!priced.ok) return res.status(400).json({ error: priced.error });

    const win = pickupWindow(new Date(), { prepMinutes: s.prepMinutes });
    let pickup;
    if (b.pickup?.type === 'scheduled') {
      const slot = win.slots.find((x) => x.mins === Number(b.pickup.mins));
      if (!slot) return res.status(400).json({ error: 'That pickup time is no longer available. Please pick another.', field: 'pickup' });
      pickup = { type: 'scheduled', mins: slot.mins, label: slot.label, ymd: win.ymd };
    } else {
      if (!win.asap) return res.status(409).json({ error: win.next ? `We're not taking ASAP orders right now. Schedule a pickup${win.slots.length ? ' later today' : ''} or order when we open ${win.next.day} at ${win.next.at}.` : 'Online ordering is closed right now.', field: 'pickup' });
      pickup = { type: 'asap', label: 'ASAP' };
    }

    const qty = priced.lines.reduce((a, l) => a + l.qty, 0);
    const prepMin = Math.max(s.prepMinutes || 15, 8 + Math.ceil(qty / 2) * 2);
    let estReadyAt;
    if (pickup.type === 'scheduled') {
      const c = cafeClock();
      estReadyAt = new Date(Date.now() + (pickup.mins - c.mins) * 60000).toISOString();
    } else estReadyAt = new Date(Date.now() + prepMin * 60000).toISOString();

    const number = await store.takeNumber();
    const at = nowISO();
    const order = {
      id: crypto.randomUUID(), number, token: crypto.randomBytes(9).toString('base64url'),
      createdAt: at, status: 'received', history: [{ status: 'received', at, by: 'Customer (online)' }],
      customer: { name, phone },
      notes: String(b.notes ?? '').trim().slice(0, 300),
      items: priced.lines.map((l, i) => ({ ...l, lineId: `L${i + 1}`, prep: 'queued' })),
      subtotal: priced.subtotal, tax: priced.tax, taxRate: priced.taxRate, total: priced.total,
      pickup, estReadyAt,
      payment: { status: 'unpaid', method: 'pay_at_pickup', collectedMethod: null, paidAt: null, paidBy: null, history: [] },
      source: 'website',
    };
    await store.putOrder(order);
    if (b.cartSid && carts.delete(String(b.cartSid))) toAdmins('cart:remove', { sid: String(b.cartSid) });
    toAdmins('order:new', adminView(order));
    res.status(201).json({ number: order.number, code: code(order), trackUrl: `/track/${code(order)}`, order: publicView(order) });
  } catch (e) {
    console.error('[order]', e);
    res.status(500).json({ error: 'Something went wrong placing your order. Please call the cafe.' });
  }
});

/* ── JOYTRACK ───────────────────────────────────────────────────────────── */
function byCode(c) {
  const m = /^(\d{3,7})-([A-Za-z0-9_-]{8,40})$/.exec(String(c)); if (!m) return null;
  const o = store.findByNumber(Number(m[1])); if (!o) return null;
  const a = Buffer.from(o.token), b = Buffer.from(m[2]);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? o : null;
}
app.get('/api/track/:code', (req, res) => {
  const o = byCode(req.params.code); if (!o) return res.status(404).json({ error: 'Order not found.' });
  res.setHeader('Cache-Control', 'no-store'); res.json(publicView(o));
});
app.get('/api/track/:code/stream', (req, res) => {
  const o = byCode(req.params.code); if (!o) return res.status(404).end();
  sse(res); send(res, 'order', publicView(o));
  if (!trackClients.has(o.id)) trackClients.set(o.id, new Set());
  trackClients.get(o.id).add(res);
  res.on('close', () => { const s = trackClients.get(o.id); s?.delete(res); if (s && !s.size) trackClients.delete(o.id); });
});

/* ── staff auth ─────────────────────────────────────────────────────────── */
const staffOnly = (role) => (req, res, next) => {
  const s = readSession(req, store);
  if (!s) return res.status(401).json({ error: 'Please sign in.' });
  if (role === 'owner' && s.role !== 'owner') return res.status(403).json({ error: 'Only the owner can do that.' });
  if (req.method !== 'GET' && req.get('X-Joyfull') !== '1') return res.status(403).json({ error: 'Bad request.' });
  req.staff = s; next();
};
app.get('/api/staff/roster', (req, res) => res.json({ ownerReady: ownerConfigured(), staff: store.staff().filter((x) => x.active !== false).map((x) => ({ id: x.id, name: x.name })) }));
app.get('/api/staff/me', (req, res) => { const s = readSession(req, store); res.json(s ? { id: s.id, name: s.name, role: s.role } : null); });
app.post('/api/staff/login', (req, res) => {
  if (limited('login:' + req.ip, 10, 10 * 60000)) return res.status(429).json({ error: 'Too many attempts. Wait a few minutes.' });
  const b = req.body ?? {};
  const secure = PROD || req.secure;
  if (b.mode === 'owner') {
    if (!ownerPasswordOk(String(b.password ?? ''))) return res.status(401).json({ error: 'Wrong owner password.' });
    const name = String(b.name || business.owner).trim().slice(0, 40) || 'Owner';
    issue(res, { id: 'owner', name, role: 'owner' }, secure);
    return res.json({ id: 'owner', name, role: 'owner' });
  }
  const st = store.staff().find((x) => x.id === b.staffId && x.active !== false);
  if (!st || !checkPin(String(b.pin ?? ''), st.pin)) return res.status(401).json({ error: 'Wrong PIN.' });
  issue(res, { id: st.id, name: st.name, role: 'staff' }, secure);
  res.json({ id: st.id, name: st.name, role: 'staff' });
});
app.post('/api/staff/logout', (req, res) => { clear(res); res.json({ ok: true }); });

/* ── dashboard API ──────────────────────────────────────────────────────── */
app.get('/api/admin/bootstrap', staffOnly(), (req, res) => {
  const s = store.settings();
  res.json({
    me: { id: req.staff.id, name: req.staff.name, role: req.staff.role },
    orders: store.orders().slice(0, 600).map(adminView),
    carts: [...carts.values()],
    settings: { ...s, taxRate: TAX_RATE },
    payMethods: PAY_METHODS,
    staff: req.staff.role === 'owner' ? store.staff().map(({ pin, ...x }) => x) : [],
    storage: store.kind, menu: Object.values(itemsById).map((i) => ({ id: i.id, name: i.name, category: i.category })),
    pickup: pickupWindow(new Date(), { prepMinutes: s.prepMinutes }),
  });
});
app.get('/api/admin/stream', staffOnly(), (req, res) => {
  sse(res); adminClients.add(res);
  send(res, 'hello', { at: nowISO(), carts: [...carts.values()] });
  res.on('close', () => adminClients.delete(res));
});

function loadOrder(req, res) {
  const o = store.getOrder(String(req.params.id));
  if (!o) { res.status(404).json({ error: 'Order not found.' }); return null; }
  return o;
}
app.post('/api/admin/orders/:id/status', staffOnly(), async (req, res) => {
  const o = loadOrder(req, res); if (!o) return;
  const to = String(req.body?.status);
  if (!STATUSES.includes(to)) return res.status(400).json({ error: 'Unknown status.' });
  if (to === o.status) return res.json(adminView(o));
  if (!NEXT[o.status]?.includes(to)) return res.status(409).json({ error: `Can't move an order from ${o.status} to ${to}.` });
  o.status = to;
  o.history.push({ status: to, at: nowISO(), by: req.staff.name });
  if (to === 'ready') o.items.forEach((l) => { l.prep = 'done'; });
  if (to === 'preparing') o.items.forEach((l) => { if (l.prep === 'queued') l.prep = 'making'; });
  // COMPLETED = handed over. It never touches payment.
  await store.putOrder(o); broadcast(o); res.json(adminView(o));
});
app.post('/api/admin/orders/:id/items/:lineId', staffOnly(), async (req, res) => {
  const o = loadOrder(req, res); if (!o) return;
  const l = o.items.find((x) => x.lineId === req.params.lineId);
  const prep = String(req.body?.prep);
  if (!l || !PREP.includes(prep)) return res.status(400).json({ error: 'Bad item update.' });
  if (['completed', 'cancelled'].includes(o.status)) return res.status(409).json({ error: 'This order is closed.' });
  l.prep = prep; l.prepBy = req.staff.name; l.prepAt = nowISO();
  if (o.status === 'received' && prep !== 'queued') { o.status = 'preparing'; o.history.push({ status: 'preparing', at: nowISO(), by: req.staff.name }); }
  await store.putOrder(o); broadcast(o); res.json(adminView(o));
});
app.post('/api/admin/orders/:id/eta', staffOnly(), async (req, res) => {
  const o = loadOrder(req, res); if (!o) return;
  const add = Math.max(-60, Math.min(120, Math.trunc(Number(req.body?.addMinutes))));
  if (!Number.isFinite(add)) return res.status(400).json({ error: 'Bad time.' });
  const base = Math.max(Date.now(), new Date(o.estReadyAt).getTime());
  o.estReadyAt = new Date((add < 0 ? new Date(o.estReadyAt).getTime() : base) + add * 60000).toISOString();
  await store.putOrder(o); broadcast(o); res.json(adminView(o));
});
app.post('/api/admin/orders/:id/pay', staffOnly(), async (req, res) => {
  const o = loadOrder(req, res); if (!o) return;
  if (o.payment.status === 'paid') return res.status(409).json({ error: `Already marked paid by ${o.payment.paidBy}.` });
  const method = String(req.body?.method);
  const enabled = store.settings().paymentMethods || [];
  if (!PAY_METHODS[method] || !enabled.includes(method)) return res.status(400).json({ error: 'Choose how the customer paid.' });
  const at = nowISO();
  o.payment = { ...o.payment, status: 'paid', collectedMethod: method, collectedLabel: PAY_METHODS[method], paidAt: at, paidBy: req.staff.name, amount: o.total,
    note: String(req.body?.note ?? '').trim().slice(0, 140), history: [...(o.payment.history ?? []), { action: 'paid', method, at, by: req.staff.name }] };
  await store.putOrder(o); broadcast(o); res.json(adminView(o));
});
app.post('/api/admin/orders/:id/unpay', staffOnly('owner'), async (req, res) => {
  const o = loadOrder(req, res); if (!o) return;
  if (o.payment.status !== 'paid') return res.json(adminView(o));
  const at = nowISO();
  o.payment = { ...o.payment, status: 'unpaid', collectedMethod: null, collectedLabel: null, paidAt: null, paidBy: null, amount: null,
    history: [...(o.payment.history ?? []), { action: 'reversed', at, by: req.staff.name, reason: String(req.body?.reason ?? '').slice(0, 140) }] };
  await store.putOrder(o); broadcast(o); res.json(adminView(o));
});

app.post('/api/admin/settings', staffOnly(), async (req, res) => {
  const b = req.body ?? {}, patch = {};
  // anyone on shift can pause ordering and mark items sold out
  if (typeof b.ordersPaused === 'boolean') patch.ordersPaused = b.ordersPaused;
  if (typeof b.pauseMessage === 'string') patch.pauseMessage = b.pauseMessage.slice(0, 160);
  if (Array.isArray(b.soldOut)) patch.soldOut = b.soldOut.filter((id) => itemsById[id]);
  if (req.staff.role === 'owner') {
    if (Number.isFinite(Number(b.prepMinutes))) patch.prepMinutes = Math.max(5, Math.min(90, Math.trunc(Number(b.prepMinutes))));
    if (Array.isArray(b.paymentMethods)) { const pm = b.paymentMethods.filter((m) => PAY_METHODS[m]); if (pm.length) patch.paymentMethods = pm; }
  } else if ('prepMinutes' in b || 'paymentMethods' in b) return res.status(403).json({ error: 'Only the owner can change that.' });
  const s = await store.setSettings(patch);
  toAdmins('settings', { ...s, taxRate: TAX_RATE });
  res.json({ ...s, taxRate: TAX_RATE });
});

app.post('/api/admin/staff', staffOnly('owner'), async (req, res) => {
  const b = req.body ?? {};
  let list = [...store.staff()];
  if (b.action === 'add') {
    const name = String(b.name ?? '').trim().slice(0, 40), pin = String(b.pin ?? '');
    if (name.length < 2) return res.status(400).json({ error: 'Enter a name.' });
    if (!/^\d{4,8}$/.test(pin)) return res.status(400).json({ error: 'PIN must be 4–8 digits.' });
    list.push({ id: crypto.randomUUID(), name, pin: hashPin(pin), active: true, createdAt: nowISO() });
  } else if (b.action === 'remove') list = list.filter((x) => x.id !== b.id);
  else if (b.action === 'pin') {
    if (!/^\d{4,8}$/.test(String(b.pin ?? ''))) return res.status(400).json({ error: 'PIN must be 4–8 digits.' });
    list = list.map((x) => (x.id === b.id ? { ...x, pin: hashPin(String(b.pin)) } : x));
  } else return res.status(400).json({ error: 'Unknown action.' });
  await store.setStaff(list);
  res.json(list.map(({ pin, ...x }) => x));
});

app.get('/healthz', (req, res) => res.json({ ok: true, storage: store.kind }));

/* ── website ────────────────────────────────────────────────────────────── */
if (fs.existsSync(DIST)) {
  app.use('/assets', express.static(path.join(DIST, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(DIST, { index: false, maxAge: '7d' }));
  const page = (f) => (req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(DIST, f)); };
  app.get(['/track', '/track/:code'], page('track.html'));
  app.get(['/admin', '/admin/'], (req, res, next) => { res.setHeader('X-Robots-Tag', 'noindex'); next(); }, page('admin.html'));
  app.get('/', page('index.html'));
  app.use((req, res) => (req.path.startsWith('/api/') ? res.status(404).json({ error: 'Not found' }) : res.status(404).sendFile(path.join(DIST, 'index.html'))));
}

app.listen(PORT, () => {
  console.log(`Joy-Full Java + Juice order server on :${PORT} · storage: ${store.kind} · tax ${(TAX_RATE * 100).toFixed(2)}%`);
  if (!process.env.OWNER_PASSWORD) console.warn(PROD ? '⚠ OWNER_PASSWORD is not set — the dashboard cannot be signed into.' : '⚠ Dev mode: owner password is "joyfull-dev". Set OWNER_PASSWORD in production.');
});
