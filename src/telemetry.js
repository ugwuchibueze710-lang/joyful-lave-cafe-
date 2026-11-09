// Reports visitors' browser errors and real page-load times to the server monitor,
// so problems customers hit show up for the owner and the agency (BDT) right away.
const seen = new Set();
let sent = 0;
function beacon(body) {
  if (sent > 25) return; // never flood
  sent++;
  const data = JSON.stringify({ ...body, page: location.pathname + location.search });
  try { if (navigator.sendBeacon?.('/api/telemetry', data)) return; } catch { /* fall through */ }
  fetch('/api/telemetry', { method: 'POST', body: data, keepalive: true }).catch(() => {});
}
function report(type, message, extra = {}) {
  const key = type + message + (extra.source || '');
  if (seen.has(key)) return; seen.add(key);
  beacon({ kind: 'error', type, message: String(message).slice(0, 500), ...extra });
}
addEventListener('error', (e) => {
  const t = e.target;
  if (t && t !== window && (t.src || t.href)) return report('resource', t.src || t.href, { source: t.tagName });
  report('error', e.message || 'Script error', { source: e.filename, line: e.lineno, col: e.colno, stack: e.error?.stack?.slice(0, 3000) });
}, true);
addEventListener('unhandledrejection', (e) => report('unhandledrejection', e.reason?.message || String(e.reason), { stack: e.reason?.stack?.slice(0, 3000) }));

// one page-load sample per visit
let lcp = 0;
try { new PerformanceObserver((l) => { const x = l.getEntries().at(-1); if (x) lcp = x.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch { /* unsupported */ }
addEventListener('load', () => setTimeout(() => {
  const n = performance.getEntriesByType('navigation')[0];
  if (n) beacon({ kind: 'perf', loadMs: n.loadEventEnd || n.duration, ttfbMs: n.responseStart, lcpMs: lcp });
}, 3000), { once: true });
