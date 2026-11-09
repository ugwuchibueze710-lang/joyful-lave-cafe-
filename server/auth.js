// Staff sign-in for the owner dashboard.
// • Owner: signs in with OWNER_PASSWORD (set on Render). Can manage staff/settings.
// • Staff: name + PIN, created by the owner in the dashboard. Can run orders and
//   record payments. Every status change and payment records who did it.
import crypto from 'node:crypto';

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const COOKIE = 'jjj_staff';
const MAX_AGE = 14 * 24 * 3600; // 14 days

export function hashPin(pin, salt = crypto.randomBytes(16).toString('hex')) {
  const h = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${h}`;
}
export function checkPin(pin, stored) {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  const test = crypto.scryptSync(String(pin), salt, 32);
  const want = Buffer.from(h, 'hex');
  return want.length === test.length && crypto.timingSafeEqual(want, test);
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
export function issue(res, user, secure) {
  const body = Buffer.from(JSON.stringify({ ...user, exp: Math.floor(Date.now() / 1000) + MAX_AGE })).toString('base64url');
  res.setHeader('Set-Cookie', `${COOKIE}=${body}.${sign(body)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${MAX_AGE}${secure ? '; Secure' : ''}`);
}
export function clear(res) { res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`); }

export function readSession(req, store) {
  const raw = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [body, mac] = raw.slice(COOKIE.length + 1).split('.');
  if (!body || !mac || !safeEqual(mac, sign(body))) return null;
  try {
    const s = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (s.exp < Date.now() / 1000) return null;
    if ((s.epoch || 0) !== (store.settings().sessionEpoch || 0)) return null; // "sign everyone out" was used
    if (s.role === 'staff') { // removed or renamed staff lose access immediately
      const st = store.staff().find((x) => x.id === s.id && x.active !== false);
      if (!st) return null;
      s.name = st.name;
    }
    return s;
  } catch { return null; }
}

export function ownerPasswordOk(pw) {
  const want = process.env.OWNER_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'joyfull-dev');
  return !!want && safeEqual(pw, want);
}
export const ownerConfigured = () => !!process.env.OWNER_PASSWORD || process.env.NODE_ENV !== 'production';

// tiny in-memory rate limiter
const buckets = new Map();
export function limited(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) ?? { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n++; buckets.set(key, b);
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
  return b.n > max;
}
