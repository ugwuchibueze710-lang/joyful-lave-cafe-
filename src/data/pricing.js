// Shared by the browser cart AND the order server: one source of truth for
// prices, options and tax. The server always re-runs this on every order.
import { itemsById } from './menu.js';

// Kentucky sales tax on prepared food & drinks. Override on the server with TAX_RATE.
export const DEFAULT_TAX_RATE = 0.06;

export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const money = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

/**
 * Validate + price one cart line.
 * line = { itemId, choices: { [groupId]: string | string[] }, qty, note }
 * Returns { ok, error?, line? } where line is fully priced and normalised.
 */
export function priceLine(raw, { soldOut = [] } = {}) {
  const item = itemsById[raw?.itemId];
  if (!item) return { ok: false, error: 'That item is no longer on the menu.' };
  if (soldOut.includes(item.id)) return { ok: false, error: `${item.name} is sold out right now.` };
  const qty = Math.trunc(Number(raw.qty));
  if (!(qty >= 1 && qty <= 20)) return { ok: false, error: 'Quantity must be between 1 and 20.' };

  let base = item.sizes.length === 1 ? item.sizes[0][1] : null;
  let size = item.sizes.length === 1 ? item.sizes[0][0] : null;
  const options = [];
  const choices = raw.choices && typeof raw.choices === 'object' ? raw.choices : {};

  for (const g of item.groups) {
    const picked = choices[g.id];
    const names = g.type === 'one' ? (picked == null || picked === '' ? [] : [String(picked)]) : (Array.isArray(picked) ? picked.map(String) : []);
    const unique = [...new Set(names)];
    if (g.type === 'one' && unique.length === 0 && (g.min ?? 1) > 0) return { ok: false, error: `Choose a ${g.name.toLowerCase()} for ${item.name}.` };
    if (g.max && unique.length > g.max) return { ok: false, error: `Pick up to ${g.max} for “${g.name}”.` };
    for (const n of unique) {
      const opt = g.options.find((o) => o[0] === n);
      if (!opt) return { ok: false, error: `“${n}” isn't an option for ${item.name}.` };
      if (g.isSize) { size = opt[0]; base = opt[1]; }
      else options.push({ group: g.name, name: opt[0], price: opt[1] });
    }
  }
  if (base == null) return { ok: false, error: `Choose a size for ${item.name}.` };

  const unit = round2(base + options.reduce((a, o) => a + o.price, 0));
  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, 140) : '';
  return {
    ok: true,
    line: { itemId: item.id, name: item.name, category: item.category, size, options, qty, unitPrice: unit, lineTotal: round2(unit * qty), note, choices: normaliseChoices(item, choices) },
  };
}

function normaliseChoices(item, choices) {
  const out = {};
  for (const g of item.groups) if (choices[g.id] != null) out[g.id] = choices[g.id];
  return out;
}

/** Price a whole cart. Returns { ok, error?, lines, subtotal, tax, total, taxRate }. */
export function priceCart(rawLines, { taxRate = DEFAULT_TAX_RATE, soldOut = [] } = {}) {
  if (!Array.isArray(rawLines) || rawLines.length === 0) return { ok: false, error: 'Your cart is empty.' };
  if (rawLines.length > 40) return { ok: false, error: 'That cart is too large for online ordering — please call the cafe.' };
  const lines = [];
  for (const r of rawLines) {
    const p = priceLine(r, { soldOut });
    if (!p.ok) return p;
    lines.push(p.line);
  }
  const subtotal = round2(lines.reduce((a, l) => a + l.lineTotal, 0));
  const tax = round2(subtotal * taxRate);
  return { ok: true, lines, subtotal, tax, total: round2(subtotal + tax), taxRate };
}

/** Default choices for the customise sheet (first option of required single groups). */
export function defaultChoices(item) {
  const c = {};
  for (const g of item.groups) {
    if (g.type === 'one' && (g.min ?? 1) > 0) c[g.id] = g.options[0][0];
    else if (g.type === 'many') c[g.id] = [];
  }
  return c;
}

/** Short human summary of a priced line's options, e.g. "Iced 24 oz · Oat · Vanilla". */
export function lineSummary(line) {
  return [line.size && line.size !== 'Regular' ? line.size : null, ...line.options.map((o) => o.name)].filter(Boolean).join(' · ');
}
