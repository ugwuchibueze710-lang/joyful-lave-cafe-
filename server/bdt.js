// BDT Site Protocol v1 — connects this website to BDT Admin (blackdaddytech).
// Spec: bdt-website/docs/SITE-PROTOCOL.md
//
//   Connection key shown to the owner:  bdtc1_<base64url({"u": "<site>/api/it/bdt", "k": "itk_…"})>
//   BDT → site (pull):  GET /summary /info /issues /control /preview, POST /connect /commands /messages /disconnect
//   Site → BDT (push):  signed POST {bdt.url}/api/connect/errors | visits | messages (+ file uploads)
//
// Keys are hashed here; BDT's own secret (from the handshake) is stored encrypted.
import crypto from 'node:crypto';
import { sizeId, originalPrice, applyOverrides } from '../src/data/overrides.js';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const nowISO = () => new Date().toISOString();
const ENC_KEY = crypto.createHash('sha256').update(`${process.env.SESSION_SECRET || 'dev-only'}:bdt`).digest();
function enc(text) { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv); const out = Buffer.concat([c.update(text, 'utf8'), c.final()]); return `${iv.toString('base64url')}.${c.getAuthTag().toString('base64url')}.${out.toString('base64url')}`; }
function dec(s) { try { const [iv, tag, data] = s.split('.').map((x) => Buffer.from(x, 'base64url')); const d = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv); d.setAuthTag(tag); return Buffer.concat([d.update(data), d.final()]).toString('utf8'); } catch { return null; } }
const CAPS = ['summary', 'info', 'issues', 'commands', 'metrics', 'traffic', 'messages', 'power', 'preview', 'control'];
const KIND_LIMIT = { image: 10 * 1048576, audio: 20 * 1048576, video: 50 * 1048576 };

export function mountBdt(app, express, ctx) {
  const { store, monitor, toAdmins, config, itemsById, categories, TAX_RATE, business, staffOnly, limited, live } = ctx;
  const base = (req) => `${req.protocol}://${req.get('host')}`;
  const S = () => store.settings();
  const keys = () => store.kv('bdt:keys', []);
  const link = () => store.kv('bdt:link', null);            // { url, siteId, secretEnc, connectedAt, lastPullAt }
  const inbox = () => store.kv('bdt:messages', []);
  const auditList = () => store.kv('bdt:audit', []);
  let auditBuf = null, auditT = 0;
  function audit(e) {
    auditBuf ??= [...auditList()]; auditBuf.unshift({ at: nowISO(), ...e }); if (auditBuf.length > 500) auditBuf.length = 500;
    clearTimeout(auditT); auditT = setTimeout(() => { store.setKV('bdt:audit', auditBuf).catch(() => {}); auditBuf = null; }, 1000);
  }
  const auditNow = () => auditBuf ?? auditList();

  /* ── live menu changes (price / hidden) ── */
  const ov = () => S().overrides || { prices: {}, hidden: [] };
  applyOverrides(ov());
  async function setOverrides(next) { const s = await store.setSettings({ overrides: next, liveChangesUpdatedAt: nowISO() }); applyOverrides(next); toAdmins('settings', { ...s, taxRate: TAX_RATE }); }

  /* ── power + back-soon mode ── */
  const power = () => ({ on: S().siteOnline !== false, message: S().offlineMessage || null, since: S().powerSince || null });
  const maint = () => ({ on: !!S().maintenance?.on, message: S().maintenance?.message || null, since: S().maintenance?.since || null });
  async function setPower(on, message, by) {
    const prev = power().on;
    const s = await store.setSettings({ siteOnline: on, ...(message !== undefined ? { offlineMessage: String(message || '').slice(0, 300) } : {}), ...(prev !== on ? { powerSince: nowISO() } : {}) });
    toAdmins('settings', { ...s, taxRate: TAX_RATE });
    if (prev !== on) monitor.record({ source: 'control', level: 'info', message: `Website switched ${on ? 'ON' : 'OFF'} by ${by}` });
    return power();
  }
  async function setMaint(on, message, by) {
    const cur = maint();
    const s = await store.setSettings({ maintenance: { on, message: message !== undefined ? String(message || '').slice(0, 300) || null : cur.message, since: on !== cur.on ? nowISO() : cur.since } });
    toAdmins('settings', { ...s, taxRate: TAX_RATE });
    if (on !== cur.on) monitor.record({ source: 'control', level: 'info', message: `Back-soon mode ${on ? 'ON' : 'OFF'} by ${by}` });
    return maint();
  }

  /* ── preview links (show the site inside BDT, even while it's off) ── */
  const sign = (s) => crypto.createHmac('sha256', ENC_KEY).update(s).digest('base64url');
  const previewOk = (t) => { if (!t) return false; const [exp, mac] = String(t).split('.'); return Number(exp) > Date.now() / 1000 && mac === sign(`preview:${exp}`); };

  /* ── gate: power off → "currently unavailable", back-soon → message page ── */
  const OPEN = [/^\/admin/, /^\/api\/admin/, /^\/api\/staff/, /^\/api\/it\//, /^\/healthz/, /^\/assets\//, /^\/photos\//, /^\/favicon/, /^\/apple-touch-icon/, /^\/api\/telemetry/];
  function siteGate(req, res, next) {
    const l = link();
    if (l?.url) { try { res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${new URL(l.url).origin}`); res.removeHeader('X-Frame-Options'); } catch { /* bad url */ } }
    const p = power(), m = maint();
    if ((p.on && !m.on) || OPEN.some((r) => r.test(req.path))) return next();
    const tok = req.query.bdt_preview || (req.headers.cookie || '').match(/(?:^|;\s*)jjj_preview=([^;]+)/)?.[1];
    if (previewOk(tok)) {
      if (req.query.bdt_preview) res.setHeader('Set-Cookie', `jjj_preview=${tok}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=28800`);
      return next();
    }
    res.locals.errorRecorded = true;
    const msg = !p.on ? p.message : m.message;
    if (req.path.startsWith('/api/')) return res.status(503).json({ error: msg || 'The website is temporarily offline.', offline: true });
    res.status(503).setHeader('Retry-After', '600'); res.setHeader('Cache-Control', 'no-store');
    res.type('html').send(offlinePage(!p.on ? 'This website is currently unavailable' : 'We’ll be right back', msg, business));
  }

  /* ── signed push to BDT ── */
  function bdtCreds() { const l = link(); if (!l?.url || !l.secretEnc) return null; const secret = dec(l.secretEnc); return secret ? { ...l, secret } : null; }
  function headers(c, signed) {
    const ts = String(Math.floor(Date.now() / 1000)), nonce = crypto.randomBytes(12).toString('base64url');
    return { 'x-bdt-site': c.siteId, 'x-bdt-timestamp': ts, 'x-bdt-nonce': nonce, 'x-bdt-signature': crypto.createHmac('sha256', c.secret).update(`${ts}.${nonce}.${signed}`).digest('hex') };
  }
  async function push(path, body) {
    const c = bdtCreds(); if (!c) throw new Error('This website is not connected to BDT yet.');
    const raw = JSON.stringify(body);
    const r = await fetch(`${c.url.replace(/\/+$/, '')}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers(c, raw) }, body: raw, signal: AbortSignal.timeout(15000) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || `BDT answered HTTP ${r.status}`), { status: r.status, data });
    return data;
  }
  async function pushFile(path, buf, filename) {
    const c = bdtCreds(); if (!c) throw new Error('This website is not connected to BDT yet.');
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    const r = await fetch(`${c.url.replace(/\/+$/, '')}${path}`, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-bdt-content-sha256': hash, 'x-bdt-filename': encodeURIComponent(filename || 'file'), ...headers(c, hash) }, body: buf, signal: AbortSignal.timeout(60000) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(data.error || (r.status === 507 ? 'BDT media storage is full — try again later.' : `BDT answered HTTP ${r.status}`)), { status: r.status });
    return data;
  }

  /* ── issues (errors → protocol issues) ── */
  function toIssue(e) {
    const kind = e.source === 'browser' ? (/^Failed to load/.test(e.message) ? 'failed_request' : 'browser_error')
      : /Database unreachable/.test(e.message) ? 'other' : e.source === 'server' ? 'server_error' : 'other';
    return { id: `iss_${e.id}`, kind, level: e.level === 'fatal' ? 'fatal' : e.level === 'warning' ? 'warning' : 'error', title: e.message.slice(0, 140), message: e.message, stack: e.stack,
      path: e.page || undefined, route: e.route || undefined, source: e.source === 'browser' ? 'browser' : /Database/.test(e.message) ? 'check' : 'server',
      count: e.count || 1, firstSeen: e.at, lastSeen: e.lastAt || e.at, release: version(), meta: { status: e.status, resolved: !!e.resolved, userAgent: e.userAgent } };
  }
  function slowIssues() {
    return monitor.metrics().routes.filter((r) => r.count >= 10 && r.p95ms > 2000).map((r) => ({ id: `iss_slow_${sha(r.route).slice(0, 10)}`, kind: 'slow_page', level: 'warning', title: `${r.route} is slow`, message: `95% of requests take up to ${r.p95ms} ms`, route: r.route, source: 'check', count: r.count, firstSeen: nowISO(), lastSeen: nowISO(), release: version() }));
  }
  function securityIssues() {
    const out = [], prod = process.env.NODE_ENV === 'production';
    if (prod && !process.env.OWNER_PASSWORD) out.push({ id: 'iss_sec_owner_pw', kind: 'security', level: 'fatal', title: 'OWNER_PASSWORD is not set', message: 'Nobody can sign in to the dashboard.', source: 'check', count: 1, firstSeen: nowISO(), lastSeen: nowISO(), release: version() });
    if (prod && store.kind !== 'postgres') out.push({ id: 'iss_sec_db', kind: 'security', level: 'fatal', title: 'Orders are not saved to the database', message: 'DATABASE_URL is not set — orders are lost on every deploy.', source: 'check', count: 1, firstSeen: nowISO(), lastSeen: nowISO(), release: version() });
    if (prod && !process.env.SESSION_SECRET) out.push({ id: 'iss_sec_session', kind: 'security', level: 'warning', title: 'SESSION_SECRET is not set', message: 'Staff are signed out on every restart.', source: 'check', count: 1, firstSeen: nowISO(), lastSeen: nowISO(), release: version() });
    return out;
  }
  // push new errors to BDT the moment they happen (batched, max 20)
  let queue = [], qT = 0;
  function onError(e) {
    if (e.source === 'control' || !bdtCreds()) return;
    queue = queue.filter((x) => x.id !== `iss_${e.id}`); queue.push(toIssue(e));
    clearTimeout(qT); qT = setTimeout(() => { const batch = queue.splice(0, 20); push('/api/connect/errors', { errors: batch }).catch(() => {}); }, 4000);
  }

  /* ── visitors (page views + "still here" pings from the browser) ── */
  const visits = []; let vQueue = [];
  function onVisit(b, req) {
    if (!b || !/^[A-Za-z0-9_-]{6,64}$/.test(b.sessionId || '') || !['view', 'ping'].includes(b.type)) return;
    const path = String(b.path || '/').split('?')[0].replace(/^\/track\/.+/, '/track').slice(0, 200);
    if (/^\/(admin|api)/.test(path)) return;
    const ua = req.get('user-agent') || '';
    if (/bot|crawl|spider|headless|lighthouse/i.test(ua)) return;
    const ev = { type: b.type, sessionId: b.sessionId, ts: nowISO(), path, ...(b.type === 'view' && b.referrer ? { referrer: String(b.referrer).slice(0, 300) } : {}), ...(b.timezone ? { timezone: String(b.timezone).slice(0, 60) } : {}), userAgent: ua.slice(0, 300) };
    visits.push({ ...ev, at: Date.now(), device: /iPad|Tablet/i.test(ua) ? 'tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop' });
    while (visits.length && visits[0].at < Date.now() - 24 * 3600e3) visits.shift();
    if (visits.length > 20000) visits.splice(0, visits.length - 20000);
    vQueue.push(ev);
  }
  setInterval(() => { if (!vQueue.length || !bdtCreds()) { if (vQueue.length > 1000) vQueue = vQueue.slice(-1000); return; } const batch = vQueue.splice(0, 200); push('/api/connect/visits', { events: batch }).catch(() => { vQueue.unshift(...batch); vQueue = vQueue.slice(-1000); }); }, 20000).unref();
  function traffic(mins = 60) {
    const since = Date.now() - mins * 60000, v = visits.filter((x) => x.at >= since);
    const views = v.filter((x) => x.type === 'view');
    const count = (arr, key) => Object.entries(arr.reduce((m, x) => { m[key(x)] = (m[key(x)] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
    const sessions = new Map(); for (const x of views) if (!sessions.has(x.sessionId)) sessions.set(x.sessionId, x.device);
    const liveCut = Date.now() - 150000;
    return {
      pageviews: views.length, visitors: sessions.size,
      topPages: count(views, (x) => x.path).slice(0, 10).map(([path, views]) => ({ path, views })),
      referrers: count(views.filter((x) => x.referrer), (x) => { try { return new URL(x.referrer).hostname.replace(/^www\./, ''); } catch { return 'other'; } }).slice(0, 10).map(([source, visits]) => ({ source, visits })),
      devices: [...sessions.values()].reduce((m, d) => { m[d] = (m[d] || 0) + 1; return m; }, { mobile: 0, desktop: 0, tablet: 0 }),
      liveNow: new Set(visits.filter((x) => x.at >= liveCut).map((x) => x.sessionId)).size,
    };
  }

  /* ── what BDT sees ── */
  const version = () => process.env.RENDER_GIT_COMMIT?.slice(0, 7) || 'local';
  const day = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago' }).format(new Date(d));
  function business_() {
    const orders = store.orders().filter((o) => o.status !== 'cancelled'), today = day(new Date());
    const wk = day(new Date(Date.now() - 6 * 864e5)), mo = today.slice(0, 7);
    const pick = (f) => orders.filter((o) => f(day(o.createdAt)));
    const sets = { today: pick((d) => d === today), week: pick((d) => d >= wk), month: pick((d) => d.slice(0, 7) === mo), total: orders };
    const cents = (a) => Math.round(a.reduce((s, o) => s + o.total, 0) * 100);
    const active = store.orders().filter((o) => ['received', 'preparing'].includes(o.status));
    return {
      currency: 'usd',
      orders: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, v.length])),
      revenueCents: Object.fromEntries(Object.entries(sets).map(([k, v]) => [k, cents(v)])),
      custom: [
        { label: 'Orders being made', value: active.length, hint: 'right now' },
        { label: 'Ready for pickup', value: store.orders().filter((o) => o.status === 'ready').length, hint: 'waiting at the counter' },
        { label: 'Late orders', value: active.filter((o) => new Date(o.estReadyAt) < Date.now()).length, hint: 'past ready time' },
        { label: 'Customers ordering', value: live.carts.size, hint: 'building an order now' },
        { label: 'Online ordering', value: S().ordersPaused ? 'Paused' : config().pickup.asap ? 'Open' : 'Closed', hint: S().ordersPaused ? (S().pauseMessage || '') : 'by opening hours' },
        { label: 'Items sold out', value: (S().soldOut || []).length },
      ],
      // no customer names / phones — protocol rule
      recent: store.orders().slice(0, 15).map((o) => ({ kind: 'order', title: `Order #${o.number} — ${o.items.reduce((a, l) => a + l.qty, 0)} item(s), ${o.status === 'ready' ? 'ready for pickup' : o.status}`, amountCents: Math.round(o.total * 100), at: o.createdAt })),
    };
  }
  function summary() {
    const h = monitor.health(), t = monitor.traffic().last1h, ec = monitor.errorCounts(), m = monitor.metrics();
    const status = !h.database.ok || (store.kind !== 'postgres' && process.env.NODE_ENV === 'production') ? 'down' : (t.requests > 20 && t.errorRate > 5) || ec.serverLastHour > 5 || t.p95ms > 2500 ? 'degraded' : 'ok';
    return {
      status, version: version(), startedAt: h.startedAt,
      maintenance: { on: maint().on, message: maint().message },
      power: power(),
      runtime: { node: h.node, memoryMb: h.memoryMB.rss, uptimeMin: Math.round(h.uptimeSec / 60), region: h.region || undefined },
      checks: [
        { name: 'database', ok: h.database.ok, ms: h.database.latencyMs ?? undefined },
        { name: 'supabase configured', ok: store.kind === 'postgres' },
        { name: 'owner password set', ok: !!process.env.OWNER_PASSWORD || process.env.NODE_ENV !== 'production' },
        { name: 'online ordering', ok: !S().ordersPaused },
        { name: 'staff dashboard open', ok: live.adminClients.size > 0 },
      ],
      metrics: {
        windowMinutes: 60, requests: t.requests, errors: t.serverErrors, errorRate: t.requests ? +(t.serverErrors / t.requests).toFixed(4) : 0,
        p50Ms: t.p50ms, p95Ms: t.p95ms,
        slowRoutes: m.routes.filter((r) => r.p95ms > 800).slice(0, 8).map((r) => ({ route: r.route, p95Ms: r.p95ms, count: r.count })),
        traffic: traffic(60),
        vitals: { lcpMs: m.pageLoads.lcpP50ms || undefined },
      },
      business: business_(),
    };
  }

  /* ── key auth for BDT's calls ── */
  function auth(req, res, next) {
    const raw = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const h = Buffer.from(sha(raw));
    const k = raw.startsWith('itk_') && keys().find((x) => !x.revokedAt && x.hash.length === h.length && crypto.timingSafeEqual(Buffer.from(x.hash), h));
    if (!k) { audit({ who: 'unknown', action: `${req.method} ${req.path}`, result: 'rejected (bad key)', ip: req.ip }); return res.status(401).json({ error: 'Invalid or revoked key.' }); }
    if (limited('bdt:' + k.id, 600, 60000)) return res.status(429).json({ error: 'Too many requests.' });
    req.bdtKey = k;
    const l = link(); if (l) store.setKV('bdt:link', { ...l, lastPullAt: nowISO(), lastPullPath: req.path }).catch(() => {});
    if (!k.lastUsedAt || Date.now() - new Date(k.lastUsedAt) > 60000) store.setKV('bdt:keys', keys().map((x) => (x.id === k.id ? { ...x, lastUsedAt: nowISO() } : x))).catch(() => {});
    res.setHeader('Cache-Control', 'no-store');
    next();
  }

  /* ── protocol endpoints ── */
  const P = '/api/it/bdt';
  app.post(`${P}/connect`, auth, async (req, res) => {
    const b = req.body?.bdt || {};
    if (!/^https?:\/\//.test(b.url || '') || !b.siteId || !b.secret) return res.status(400).json({ error: 'Missing bdt.url, bdt.siteId or bdt.secret.' });
    await store.setKV('bdt:link', { url: String(b.url).replace(/\/+$/, ''), siteId: String(b.siteId), secretEnc: enc(String(b.secret)), ssoPublicKey: b.ssoPublicKey ? String(b.ssoPublicKey).slice(0, 4000) : null, connectedAt: nowISO(), keyId: req.bdtKey.id });
    audit({ who: 'BDT', action: 'connected', result: `site ${b.siteId}`, ip: req.ip });
    const u = base(req);
    res.json({ protocol: 1, site: { name: business.name, url: u, adminUrl: `${u}/admin`, itUrl: `${u}/admin` }, version: version(), capabilities: CAPS });
  });
  app.post(`${P}/disconnect`, auth, async (req, res) => { await store.setKV('bdt:link', null); audit({ who: 'BDT', action: 'disconnected', ip: req.ip }); res.json({ ok: true }); });
  app.get(`${P}/summary`, auth, (req, res) => res.json(summary()));
  app.get(`${P}/info`, auth, (req, res) => res.json({
    app: { name: business.name, description: 'Cafe website with online ordering (pay at pickup), live order tracking (JOYTRACK) and an owner dashboard', framework: 'Express 5 + Vite + Three.js', repo: 'https://github.com/ugwuchibueze710-lang/joyful-lave-cafe-' },
    versions: { node: process.version, express: '5', three: '0.187', vite: '8' },
    integrations: [{ name: 'Supabase (Postgres)', configured: store.kind === 'postgres', ok: monitor.db().ok }, { name: 'Render', configured: !!process.env.RENDER }],
    routes: [{ path: '/', kind: 'page' }, { path: '/track/:code', kind: 'page' }, { path: '/admin', kind: 'page' }, { method: 'GET', path: '/api/config', kind: 'api' }, { method: 'POST', path: '/api/orders', kind: 'api' }, { method: 'GET', path: '/api/track/:code', kind: 'api' }, { method: 'POST', path: '/api/carts/:sid', kind: 'api' }],
    jobs: [{ name: 'database health check (every 30s)', lastRunAt: monitor.db().checkedAt, ok: monitor.db().ok }],
    counts: { menuItems: Object.keys(itemsById).length, ordersStored: store.orders().length, staff: store.staff().length, soldOut: (S().soldOut || []).length, hidden: ov().hidden.length },
  }));
  app.get(`${P}/issues`, auth, (req, res) => {
    const since = String(req.query.since || ''), limit = Math.min(500, Number(req.query.limit) || 200);
    let list = monitor.errors().filter((e) => e.source !== 'control').map(toIssue).concat(slowIssues(), securityIssues());
    if (since) list = list.filter((i) => i.lastSeen > since);
    list.sort((a, b) => a.lastSeen.localeCompare(b.lastSeen));
    const out = list.slice(-limit);
    res.json({ issues: out, cursor: out.length ? out.at(-1).lastSeen : since || nowISO() });
  });
  app.get(`${P}/preview`, auth, (req, res) => {
    const hours = Math.max(1, Math.min(24, Number(req.query.hours) || 8)), exp = Math.floor(Date.now() / 1000) + hours * 3600;
    res.json({ url: `${base(req)}/?bdt_preview=${exp}.${sign(`preview:${exp}`)}`, expiresAt: new Date(exp * 1000).toISOString() });
  });
  function products() {
    const so = new Set(S().soldOut || []), o = ov();
    return Object.values(itemsById).map((it) => ({
      slug: it.id, name: it.name, category: categories.find((c) => c.id === it.category)?.name ?? it.category, hidden: !!it.hidden, fulfillment: 'pickup', url: undefined,
      variations: it.sizes.map(([n, p]) => ({ id: sizeId(n), options: it.sizes.length > 1 ? { Size: n } : {}, price: p, stock: so.has(it.id) ? 0 : null })),
      changed: o.hidden.includes(it.id) || !!o.prices[it.id] ? true : undefined,
    }));
  }
  const COMMANDS = {
    ping: 'Answers with the site version.',
    revalidate: 'Clears caches (this site has none to clear).',
    power: '{ on, message? } — turn the whole website on/off.',
    maintenance: '{ on, message? } — back-soon page for visitors; the dashboard keeps working.',
    announcement: '{ text|null, link?, tone? } — banner across the top of the website.',
    product: '{ slug, variation?, price?, stock?, hidden? } — live price, sold out (stock 0) or hide a menu item.',
    'product-reset': '{ slug? } — undo live changes to one item or all.',
    ordering: '{ paused, message? } — pause / resume online ordering.',
    'prep-time': '{ minutes } — default “ready in” time.',
    'clear-issue': '{ id } — mark an issue resolved.',
    settings: 'Not supported — contact details and links are part of the site design.',
  };
  app.get(`${P}/control`, auth, (req, res) => {
    const a = S().announcement;
    res.json({
      version: version(), power: power(), maintenance: maint(),
      announcement: a?.active ? { text: a.text, link: a.link || null, tone: a.tone === 'promo' ? 'sale' : a.tone || 'info' } : null,
      liveChangesUpdatedAt: S().liveChangesUpdatedAt || null,
      settings: { contact: { phone: business.phone }, social: {}, url: base(req) },
      products: products(), categories: categories.map((c) => ({ id: c.id, name: c.name })),
      content: { menuCategories: categories.map((c) => c.name), openingHours: true, onlineOrdering: S().ordersPaused ? 'paused' : 'on' },
      commands: COMMANDS,
    });
  });
  app.post(`${P}/commands`, auth, async (req, res) => {
    const { command, args = {} } = req.body ?? {};
    const who = 'BDT';
    let result;
    try {
      switch (command) {
        case 'ping': result = { ok: true, version: version() }; break;
        case 'revalidate': result = { cleared: true }; break;
        case 'power': result = await setPower(!!args.on, args.message, who); break;
        case 'maintenance': result = await setMaint(!!args.on, args.message, who); break;
        case 'announcement': {
          const text = args.text ? String(args.text).slice(0, 200) : '';
          const a = { text, link: args.link ? String(args.link).slice(0, 300) : null, tone: args.tone === 'sale' ? 'promo' : ['alert', 'info'].includes(args.tone) ? args.tone : 'info', active: !!text };
          await store.setSettings({ announcement: a }); result = a; break;
        }
        case 'product': {
          const it = itemsById[args.slug]; if (!it) return res.status(404).json({ error: 'Unknown menu item.' });
          const o = structuredClone(ov()); o.prices ||= {}; o.hidden ||= [];
          if (typeof args.hidden === 'boolean') { o.hidden = o.hidden.filter((x) => x !== it.id); if (args.hidden) o.hidden.push(it.id); }
          if (args.price !== undefined) {
            const price = Math.round(Number(args.price) * 100) / 100; if (!Number.isFinite(price) || price < 0 || price > 500) return res.status(400).json({ error: 'Bad price.' });
            o.prices[it.id] ||= {};
            it.sizes.forEach(([n], i) => { const id = sizeId(n); if (!args.variation || args.variation === id) { if (price === originalPrice(it.id, i)) delete o.prices[it.id][id]; else o.prices[it.id][id] = price; } });
            if (!Object.keys(o.prices[it.id]).length) delete o.prices[it.id];
          }
          await setOverrides(o);
          if (args.stock !== undefined) { const set = new Set(S().soldOut || []); args.stock === 0 ? set.add(it.id) : set.delete(it.id); const s = await store.setSettings({ soldOut: [...set], liveChangesUpdatedAt: nowISO() }); toAdmins('settings', { ...s, taxRate: TAX_RATE }); }
          result = products().find((p) => p.slug === it.id); break;
        }
        case 'product-reset': {
          const o = structuredClone(ov()); o.prices ||= {}; o.hidden ||= [];
          if (args.slug) { delete o.prices[args.slug]; o.hidden = o.hidden.filter((x) => x !== args.slug); } else { o.prices = {}; o.hidden = []; }
          await setOverrides(o); result = { reset: args.slug || 'all' }; break;
        }
        case 'ordering': { const s = await store.setSettings({ ordersPaused: !!args.paused, ...(typeof args.message === 'string' ? { pauseMessage: args.message.slice(0, 160) } : {}) }); toAdmins('settings', { ...s, taxRate: TAX_RATE }); result = { paused: !!s.ordersPaused, message: s.pauseMessage || '' }; break; }
        case 'prep-time': { const s = await store.setSettings({ prepMinutes: Math.max(5, Math.min(90, Math.trunc(Number(args.minutes) || 15))) }); toAdmins('settings', { ...s, taxRate: TAX_RATE }); result = { minutes: s.prepMinutes }; break; }
        case 'clear-issue': { const id = String(args.id || '').replace(/^iss_/, ''); result = { resolved: monitor.resolve([id]) }; break; }
        case 'settings': audit({ who, action: 'command settings', result: 'not supported', ip: req.ip }); return res.status(400).json({ error: COMMANDS.settings });
        default: return res.status(400).json({ error: `Unknown command "${command}".` });
      }
    } catch (e) { audit({ who, action: `command ${command}`, result: `failed: ${e.message}`, args, ip: req.ip }); return res.status(500).json({ error: e.message }); }
    audit({ who, action: `command ${command}`, result: 'ok', args, ip: req.ip });
    res.json({ ok: true, result });
  });
  app.post(`${P}/messages`, auth, async (req, res) => {
    const b = req.body ?? {};
    if (!b.id || (!b.body && !b.attachments?.length)) return res.status(400).json({ error: 'Missing id or body.' });
    const list = inbox().filter((m) => m.id !== b.id);
    list.unshift({ id: String(b.id), dir: 'in', from: b.from?.name || 'BDT', body: String(b.body || '').slice(0, 5000), inReplyTo: b.inReplyTo || null, sentAt: b.sentAt || nowISO(), attachments: (b.attachments || []).map((a) => ({ ref: a.ref, kind: a.kind, filename: a.filename, size: a.size })), unread: true });
    await store.setKV('bdt:messages', list.slice(0, 300));
    toAdmins('bdt:message', { id: b.id, from: b.from?.name || 'BDT' });
    res.json({ ok: true });
  });

  /* ── owner-only: the hidden Connections window ── */
  const owner = staffOnly('owner');
  const pubKey = ({ hash, ...k }) => k;
  function overview(req) {
    const l = link(), sm = summary();
    return {
      siteUrl: base(req), protocolUrl: `${base(req)}${P}`, keys: keys().map(pubKey), power: power(), maintenance: maint(),
      link: l ? { url: l.url, siteId: l.siteId, connectedAt: l.connectedAt, lastPullAt: l.lastPullAt || null, lastPullPath: l.lastPullPath || null } : null,
      summary: sm, issues: monitor.errors().slice(0, 80), audit: auditNow().slice(0, 80), messages: inbox().slice(0, 100),
      traffic: traffic(60), traffic24h: traffic(1440), commands: COMMANDS,
    };
  }
  app.get('/api/admin/bdt', owner, (req, res) => res.json(overview(req)));
  app.post('/api/admin/bdt/keys', owner, async (req, res) => {
    const k = 'itk_' + crypto.randomBytes(32).toString('base64url');
    const rec = { id: crypto.randomUUID(), name: String(req.body?.name || 'BDT').slice(0, 40), prefix: k.slice(0, 10), hash: sha(k), createdAt: nowISO(), createdBy: req.staff.name, lastUsedAt: null, revokedAt: null };
    // one key at a time: a new key replaces the old one
    await store.setKV('bdt:keys', [rec, ...keys().map((x) => (x.revokedAt ? x : { ...x, revokedAt: nowISO(), revokedBy: `${req.staff.name} (replaced)` }))]);
    audit({ who: req.staff.name, action: 'created a BDT connection key', result: rec.prefix + '…' });
    const code = 'bdtc1_' + Buffer.from(JSON.stringify({ u: `${base(req)}${P}`, k })).toString('base64url');
    res.status(201).json({ code, ...pubKey(rec) });
  });
  app.post('/api/admin/bdt/keys/:id/revoke', owner, async (req, res) => {
    await store.setKV('bdt:keys', keys().map((x) => (x.id === req.params.id ? { ...x, revokedAt: nowISO(), revokedBy: req.staff.name } : x)));
    audit({ who: req.staff.name, action: 'revoked a BDT connection key' });
    res.json(keys().map(pubKey));
  });
  app.post('/api/admin/bdt/power', owner, async (req, res) => res.json(await setPower(!!req.body?.on, req.body?.message, req.staff.name)));
  app.post('/api/admin/bdt/maintenance', owner, async (req, res) => res.json(await setMaint(!!req.body?.on, req.body?.message, req.staff.name)));
  app.post('/api/admin/bdt/issues/resolve', owner, (req, res) => res.json({ resolved: monitor.resolve(req.body?.ids === 'all' ? 'all' : [].concat(req.body?.ids || [])) }));
  app.post('/api/admin/bdt/messages/read', owner, async (req, res) => { await store.setKV('bdt:messages', inbox().map((m) => ({ ...m, unread: false }))); res.json({ ok: true }); });
  // send a message (+ photos / audio / video) to BDT Admin → Messages → From websites
  app.post('/api/admin/bdt/messages', owner, async (req, res) => {
    const b = req.body ?? {}, body = String(b.body || '').trim().slice(0, 5000);
    const atts = (Array.isArray(b.attachments) ? b.attachments : []).slice(0, 10).map((a, i) => ({ ref: `f${i + 1}`, kind: ['image', 'audio', 'video'].includes(a.kind) ? a.kind : 'image', filename: String(a.filename || '').slice(0, 120) }));
    if (!body && !atts.length) return res.status(400).json({ error: 'Write a message or add a file.' });
    const id = `msg_${crypto.randomBytes(8).toString('hex')}`;
    try {
      const r = await push('/api/connect/messages', { id, from: { name: req.staff.name, role: 'owner' }, subject: String(b.subject || '').slice(0, 160) || undefined, body: body || undefined, pageUrl: `${base(req)}/admin`, sentAt: nowISO(), inReplyTo: b.inReplyTo || null, attachments: atts.map(({ ref, kind }) => ({ ref, kind })) });
      const list = inbox(); list.unshift({ id, dir: 'out', from: req.staff.name, body, subject: b.subject || '', sentAt: nowISO(), inReplyTo: b.inReplyTo || null, attachments: atts.map((a) => ({ ...a, uploaded: false })), bdtId: r.id });
      await store.setKV('bdt:messages', list.slice(0, 300));
      audit({ who: req.staff.name, action: 'sent a message to BDT', result: `${atts.length} file(s)` });
      res.status(201).json({ id, bdtId: r.id, upload: r.upload || [] });
    } catch (e) { res.status(502).json({ error: `Couldn’t reach BDT: ${e.message}` }); }
  });
  app.put('/api/admin/bdt/messages/:id/files/:ref', owner, express.raw({ type: '*/*', limit: '50mb' }), async (req, res) => {
    const m = inbox().find((x) => x.id === req.params.id && x.dir === 'out'); if (!m) return res.status(404).json({ error: 'Message not found.' });
    const a = m.attachments.find((x) => x.ref === req.params.ref); if (!a) return res.status(404).json({ error: 'File not found.' });
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!buf.length) return res.status(400).json({ error: 'Empty file.' });
    if (buf.length > KIND_LIMIT[a.kind]) return res.status(413).json({ error: `Too big: ${a.kind} files can be up to ${KIND_LIMIT[a.kind] / 1048576} MB.` });
    const url = req.get('x-upload-url'); if (!url || !url.startsWith('/api/connect/messages/')) return res.status(400).json({ error: 'Missing upload address.' });
    try {
      const r = await pushFile(url, buf, a.filename);
      await store.setKV('bdt:messages', inbox().map((x) => (x.id === m.id ? { ...x, attachments: x.attachments.map((y) => (y.ref === a.ref ? { ...y, uploaded: true, size: buf.length } : y)) } : x)));
      res.json({ ok: true, duplicate: !!r.duplicate });
    } catch (e) { res.status(e.status === 507 ? 507 : 502).json({ error: e.message }); }
  });

  return { siteGate, onError, onVisit, summary };
}

function offlinePage(title, message, business) {
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(business.name)} · Back soon</title>
<link rel="icon" href="/photos/joyfull-logo.webp"><link href="https://fonts.googleapis.com/css2?family=Archivo:wght@800;900&family=Geist:wght@400;600&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:24px;font-family:Geist,system-ui,sans-serif;color:#fff;text-align:center;background:radial-gradient(120% 90% at 50% 30%,#f2453f,#c92a2a 55%,#7d0d13)}
main{max-width:560px}img{width:96px;height:96px;border-radius:50%;background:#fff;box-shadow:0 20px 40px -18px rgba(0,0,0,.5)}h1{font:900 clamp(34px,7vw,60px)/.98 Archivo,system-ui,sans-serif;letter-spacing:-.02em;margin:22px 0 12px;text-transform:uppercase}
p{font-size:18px;line-height:1.5;margin:0 0 10px;opacity:.95}a{display:inline-block;margin-top:18px;padding:14px 22px;border-radius:999px;background:#fff;color:#c92a2a;font-weight:700;text-decoration:none}small{display:block;margin-top:26px;opacity:.75}</style></head>
<body><main><img src="/photos/joyfull-logo.webp" alt="${esc(business.name)}"><h1>${esc(title)}</h1><p>${esc(message || 'Our website is taking a short break. The cafe is still serving — come see us!')}</p>
<a href="${esc(business.phoneHref)}">Call ${esc(business.phone)}</a><small>${esc(business.street)} · ${esc(business.city)}</small></main></body></html>`;
}
