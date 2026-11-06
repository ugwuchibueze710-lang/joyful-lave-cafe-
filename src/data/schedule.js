// Pickup scheduling in the cafe's own time zone (Owensboro, KY → America/Chicago).
// Shared by the checkout and the server so both agree on what's allowed.
import { hours } from './menu.js';

export const TZ = 'America/Chicago';
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };

/** Wall-clock parts of `date` in the cafe's time zone. */
export function cafeClock(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return { day: p.weekday, ymd: `${p.year}-${p.month}-${p.day}`, mins: Number(p.hour) * 60 + Number(p.minute) };
}

export const fmtTime = (mins) => { let h = Math.floor(mins / 60), m = mins % 60; const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${String(m).padStart(2, '0')} ${ap}`; };
export const fmtClock = (date) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(date));

/** Today's open window in minutes, or null when closed all day. */
export function todayHours(date = new Date()) {
  const { day } = cafeClock(date);
  const h = hours.find((x) => x.day === day);
  return h ? { open: toMin(h.open), close: toMin(h.close) } : null;
}

/**
 * Pickup availability right now.
 * Online orders stop 15 minutes before close. Scheduled pickups are offered in
 * 15-minute slots for the rest of today.
 */
export const LAST_ORDER_BUFFER = 15;
export function pickupWindow(date = new Date(), { prepMinutes = 15 } = {}) {
  const c = cafeClock(date), h = todayHours(date);
  const next = nextOpening(date);
  if (!h) return { open: false, asap: false, slots: [], next };
  const lastOrder = h.close - LAST_ORDER_BUFFER;
  const openNow = c.mins >= h.open && c.mins < lastOrder;
  const first = Math.max(h.open, c.mins + prepMinutes);
  const slots = [];
  for (let m = Math.ceil(first / 15) * 15; m <= lastOrder; m += 15) slots.push({ mins: m, label: fmtTime(m) });
  return { open: openNow, asap: openNow, slots, closesAt: fmtTime(h.close), lastOrderAt: fmtTime(lastOrder), next, ymd: c.ymd };
}

export function nextOpening(date = new Date()) {
  const c = cafeClock(date);
  const idx = DAYS.indexOf(c.day);
  for (let k = 0; k < 8; k++) {
    const day = DAYS[(idx + k) % 7];
    const h = hours.find((x) => x.day === day);
    if (!h) continue;
    if (k === 0 && c.mins >= toMin(h.open)) continue;
    return { day: k === 0 ? 'today' : k === 1 ? 'tomorrow' : day, at: fmtTime(toMin(h.open)) };
  }
  return null;
}
