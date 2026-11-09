// Site monitor — everything that can affect the website working, in one place.
// • Every request: count, status, latency, per route (ids collapsed), slow ones, 404s.
// • Server errors: 5xx responses, thrown errors, unhandled promise rejections, crashes.
// • Browser errors reported by customers' and staff browsers (see src/telemetry.js).
// • Page-load timings from real visitors.
// • Database health checks.
// Recent errors are saved so they survive restarts and deploys.
import os from 'node:os';

const MAX_ERRORS = 300, MAX_SLOW = 60, MAX_PERF = 400, SLOW_MS = 1500;
const pct = (arr, p) => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]); };

export function createMonitor({ store, onEvent = () => {} }) {
  const startedAt = new Date();
  let errors = store.kv('monitor:errors', []);
  const routes = new Map();     // key -> { count, errors, ms: [] }
  const minutes = new Map();    // minute bucket -> { req, err5, err4, ms: [] }
  const notFound = new Map();   // path -> count
  const slow = [];
  const perf = [];
  let db = { ok: true, latencyMs: 0, checkedAt: null, error: null, downSince: null };
  let saveT = 0;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => store.setKV('monitor:errors', errors.slice(0, MAX_ERRORS)).catch(() => {}), 1500); };

  const routeKey = (method, p) => `${method} ${p
    .replace(/\/track\/[^/]+/, '/track/:code')
    .replace(/\/api\/carts\/[^/]+/, '/api/carts/:sid')
    .replace(/\/orders\/[0-9a-f-]{20,}/i, '/orders/:id')
    .replace(/\/orders\/\d+/, '/orders/:number')
    .replace(/\/items\/[^/]+/, '/items/:line')
    .replace(/\/assets\/.*/, '/assets/*')
    .replace(/\/photos\/.*/, '/photos/*')
    .replace(/\/keys\/[^/]+/, '/keys/:id')
    .replace(/\/menu\/[^/]+/, '/menu/:item')}`;

  function record(e) {
    const entry = {
      id: Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      at: new Date().toISOString(), source: e.source || 'server', level: e.level || 'error',
      message: String(e.message || 'Unknown error').slice(0, 500),
      stack: e.stack ? String(e.stack).slice(0, 4000) : undefined,
      route: e.route, status: e.status, page: e.page ? String(e.page).slice(0, 300) : undefined,
      userAgent: e.userAgent ? String(e.userAgent).slice(0, 200) : undefined, resolved: false,
    };
    // fold repeats of the same error into one entry with a count
    const same = errors.find((x) => !x.resolved && x.source === entry.source && x.message === entry.message && (x.route || x.page) === (entry.route || entry.page));
    if (same) { same.count = (same.count || 1) + 1; same.lastAt = entry.at; }
    else { entry.count = 1; entry.lastAt = entry.at; errors.unshift(entry); if (errors.length > MAX_ERRORS) errors.length = MAX_ERRORS; }
    save();
    onEvent('error', same || entry);
    return same || entry;
  }

  /** Express middleware: time and count every request. */
  function middleware(req, res, next) {
    const t0 = process.hrtime.bigint();
    res.on('finish', () => {
      if (req.path === '/healthz' || req.path.endsWith('/stream') || req.path.endsWith('/events')) return;
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      const key = routeKey(req.method, req.path);
      const r = routes.get(key) ?? { count: 0, errors: 0, ms: [] };
      r.count++; if (res.statusCode >= 500) r.errors++;
      r.ms.push(ms); if (r.ms.length > 200) r.ms.shift();
      routes.set(key, r);
      const m = Math.floor(Date.now() / 60000);
      const b = minutes.get(m) ?? { req: 0, err5: 0, err4: 0, ms: [] };
      b.req++; if (res.statusCode >= 500) b.err5++; else if (res.statusCode >= 400) b.err4++;
      b.ms.push(ms); if (b.ms.length > 500) b.ms.shift();
      minutes.set(m, b);
      for (const k of minutes.keys()) if (k < m - 24 * 60) minutes.delete(k);
      if (res.statusCode === 404 && !req.path.startsWith('/api/agency')) notFound.set(req.path.slice(0, 160), (notFound.get(req.path.slice(0, 160)) || 0) + 1);
      if (notFound.size > 300) notFound.delete(notFound.keys().next().value);
      if (ms > SLOW_MS) { slow.unshift({ at: new Date().toISOString(), route: key, ms: Math.round(ms), status: res.statusCode }); if (slow.length > MAX_SLOW) slow.length = MAX_SLOW; }
      if (res.statusCode >= 500 && !res.locals.errorRecorded) record({ source: 'server', message: `HTTP ${res.statusCode} on ${key}`, route: key, status: res.statusCode });
    });
    next();
  }

  /** Express error handler (last in the chain). */
  function errorHandler(err, req, res, _next) {
    res.locals.errorRecorded = true;
    record({ source: 'server', message: err.message, stack: err.stack, route: routeKey(req.method, req.path), status: 500 });
    if (!res.headersSent) res.status(500).json({ error: 'Something went wrong.' });
  }

  process.on('unhandledRejection', (r) => record({ source: 'server', level: 'error', message: `Unhandled promise rejection: ${r?.message || r}`, stack: r?.stack }));
  process.on('uncaughtException', (err) => {
    record({ source: 'server', level: 'fatal', message: `Crash: ${err.message}`, stack: err.stack });
    // save immediately, then let Render restart the service
    store.setKV('monitor:errors', errors.slice(0, MAX_ERRORS)).finally(() => process.exit(1));
    setTimeout(() => process.exit(1), 2000).unref();
  });

  async function checkDb() {
    try {
      const ms = await store.ping();
      const wasDown = !db.ok;
      db = { ok: true, latencyMs: ms, checkedAt: new Date().toISOString(), error: null, downSince: null };
      if (wasDown) onEvent('db', { ok: true });
    } catch (e) {
      const first = db.ok;
      db = { ok: false, latencyMs: null, checkedAt: new Date().toISOString(), error: e.message, downSince: db.downSince || new Date().toISOString() };
      if (first) { record({ source: 'server', level: 'fatal', message: `Database unreachable: ${e.message}` }); onEvent('db', { ok: false, error: e.message }); }
    }
  }
  checkDb(); setInterval(checkDb, 30000).unref();

  function span(mins) {
    const now = Math.floor(Date.now() / 60000); let req = 0, e5 = 0, e4 = 0; const ms = [];
    for (const [k, b] of minutes) if (k > now - mins) { req += b.req; e5 += b.err5; e4 += b.err4; ms.push(...b.ms); }
    return { requests: req, serverErrors: e5, clientErrors4xx: e4, errorRate: req ? +(e5 / req * 100).toFixed(2) : 0, p50ms: pct(ms, 50), p95ms: pct(ms, 95) };
  }
  const since = (mins) => Date.now() - mins * 60000;
  const countErrors = (mins, source) => errors.filter((e) => e.source !== 'control' && new Date(e.lastAt || e.at).getTime() > since(mins) && (!source || e.source === source)).reduce((a, e) => a + (e.count || 1), 0);

  return {
    middleware, errorHandler, record,
    clientReport(b, req) {
      return record({
        source: 'browser', level: b.type === 'resource' ? 'warning' : 'error',
        message: `${b.type === 'unhandledrejection' ? 'Unhandled promise: ' : b.type === 'resource' ? 'Failed to load: ' : ''}${b.message || 'Unknown browser error'}`,
        stack: b.stack || (b.source ? `${b.source}:${b.line || 0}:${b.col || 0}` : undefined), page: b.page, userAgent: req.get('user-agent'),
      });
    },
    perfReport(b) {
      const v = { at: new Date().toISOString(), page: String(b.page || '').slice(0, 120), loadMs: Math.round(Number(b.loadMs) || 0), ttfbMs: Math.round(Number(b.ttfbMs) || 0), lcpMs: Math.round(Number(b.lcpMs) || 0) };
      if (v.loadMs > 0 && v.loadMs < 120000) { perf.unshift(v); if (perf.length > MAX_PERF) perf.length = MAX_PERF; }
    },
    errors: () => errors,
    resolve(ids) { let n = 0; for (const e of errors) if (ids === 'all' || ids.includes(e.id)) { if (!e.resolved) n++; e.resolved = true; e.resolvedAt = new Date().toISOString(); } save(); return n; },
    db: () => db,
    health() {
      const mem = process.memoryUsage();
      return {
        ok: db.ok, startedAt: startedAt.toISOString(), uptimeSec: Math.round(process.uptime()),
        version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) || 'local', node: process.version,
        memoryMB: { rss: Math.round(mem.rss / 1048576), heapUsed: Math.round(mem.heapUsed / 1048576) },
        load: os.loadavg().map((x) => +x.toFixed(2)), storage: store.kind, database: db,
        region: process.env.RENDER_REGION || null, service: process.env.RENDER_SERVICE_NAME || null,
      };
    },
    traffic: () => ({ last5m: span(5), last1h: span(60), last24h: span(24 * 60) }),
    errorCounts: () => ({ lastHour: countErrors(60), last24h: countErrors(1440), serverLastHour: countErrors(60, 'server'), browserLastHour: countErrors(60, 'browser'), unresolved: errors.filter((e) => !e.resolved && e.source !== 'control').length }),
    metrics() {
      return {
        routes: [...routes].map(([route, r]) => ({ route, count: r.count, serverErrors: r.errors, p50ms: pct(r.ms, 50), p95ms: pct(r.ms, 95) })).sort((a, b) => b.count - a.count),
        slowRequests: slow, notFound: [...notFound].map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 50),
        pageLoads: { samples: perf.length, loadP50ms: pct(perf.map((x) => x.loadMs), 50), loadP95ms: pct(perf.map((x) => x.loadMs), 95), ttfbP50ms: pct(perf.map((x) => x.ttfbMs).filter(Boolean), 50), lcpP50ms: pct(perf.map((x) => x.lcpMs).filter(Boolean), 50), recent: perf.slice(0, 20) },
      };
    },
  };
}
