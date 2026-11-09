// Live menu changes made from BDT (price per size, hidden items). Shared by the
// server (so prices are always re-checked) and the browser (so the menu shows them).
import { itemsById } from './menu.js';

const ORIGINAL = Object.fromEntries(Object.values(itemsById).map((i) => [i.id, i.sizes.map((s) => s[1])]));
export const sizeId = (name) => String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'standard';
export const originalPrice = (id, i) => ORIGINAL[id]?.[i];

/** overrides = { prices: { itemId: { sizeId: dollars } }, hidden: [itemId] } */
export function applyOverrides({ prices = {}, hidden = [] } = {}) {
  const hid = new Set(hidden);
  for (const it of Object.values(itemsById)) {
    it.hidden = hid.has(it.id);
    const g = it.groups?.find((x) => x.isSize);
    it.sizes.forEach((s, i) => {
      const p = prices[it.id]?.[sizeId(s[0])];
      s[1] = Number.isFinite(p) ? p : ORIGINAL[it.id][i];
      if (g?.options[i]) g.options[i][1] = s[1];
    });
  }
}
