import { categories, customizations, hours, ORDER_URL } from './data/menu.js';

const $ = (s, r = document) => r.querySelector(s);
const money = (n) => `$${n.toFixed(2)}`;
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ── menu ─────────────────────────────────────────── */
export function renderMenu() {
  const tabs = $('#menuTabs'), panel = $('#menuPanel'), search = $('#menuSearch');
  let current = 'all';
  const list = [{ id: 'all', short: 'Everything' }, ...categories];
  tabs.innerHTML = list.map((c) => `<button role="tab" data-cat="${c.id}" aria-selected="${c.id === current}">${esc(c.short)}</button>`).join('');

  const itemHTML = (it) => {
    const low = Math.min(...it.sizes.map((s) => s[1]));
    const multi = it.sizes.length > 1;
    const alt = it.stock ? `${esc(it.name)} (sample photo)` : `${esc(it.name)}, photographed at the cafe`;
    return `<article class="item${it.photo ? ' item--photo' : ''}">
      ${it.photo ? `<div class="item__photo"><img loading="lazy" decoding="async" src="${it.photo}" alt="${alt}" width="600" height="450" /><span class="item__src${it.stock ? '' : ' is-real'}">${it.stock ? 'Sample photo' : 'From the cafe'}</span></div>` : ''}
      ${it.feature ? '<span class="badge">Drink special</span>' : it.popular ? '<span class="badge">Popular</span>' : ''}
      <div class="item__top"><h4>${esc(it.name)}</h4><span class="item__price">${multi ? '<small style="font:600 13px var(--body);color:var(--ink-soft)">from </small>' : ''}${money(low)}</span></div>
      <p>${esc(it.desc)}</p>
      ${multi ? `<div class="item__sizes">${it.sizes.map(([n, p]) => `<span>${esc(n)} · ${money(p)}</span>`).join('')}</div>` : ''}
    </article>`;
  };

  function draw() {
    const q = search.value.trim().toLowerCase();
    const cats = categories.filter((c) => current === 'all' || c.id === current);
    let html = '', count = 0;
    cats.forEach((c) => {
      const items = c.items.filter((it) => !q || (it.name + ' ' + it.desc).toLowerCase().includes(q));
      if (!items.length) return;
      count += items.length;
      html += `<section class="menu__cat" id="cat-${c.id}"><h3>${esc(c.name)}</h3><p>${esc(c.blurb)}</p><div class="menu__grid">${items.map(itemHTML).join('')}</div></section>`;
    });
    panel.innerHTML = html || `<p class="menu__empty">Nothing matches “${esc(q)}”. Try another word — or <a href="${ORDER_URL}" target="_blank" rel="noopener">browse online ordering</a>.</p>`;
    panel.dataset.count = count;
    panel.querySelectorAll('.item').forEach((el, i) => { el.style.setProperty('--d', `${Math.min(i, 12) * 40}ms`); el.classList.add('is-in'); });
  }
  // 3D tilt + light glare that follows the cursor
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    panel.addEventListener('pointermove', (e) => {
      const el = e.target.closest('.item'); if (!el) return;
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', `${(0.5 - y) * 7}deg`); el.style.setProperty('--ry', `${(x - 0.5) * 9}deg`);
      el.style.setProperty('--gx', `${x * 100}%`); el.style.setProperty('--gy', `${y * 100}%`);
    });
    panel.addEventListener('pointerout', (e) => {
      const el = e.target.closest('.item'); if (!el || el.contains(e.relatedTarget)) return;
      el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
    });
  }
  tabs.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    current = b.dataset.cat;
    tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b));
    draw();
  });
  search.addEventListener('input', draw);
  draw();

  $('#customGrid').innerHTML = customizations.map((g) => `<div><h5>${esc(g.group)}</h5><ul>${g.options.map((o) => Array.isArray(o) ? `<li>${esc(o[0])} <b>+${money(o[1])}</b></li>` : `<li>${esc(o)}</li>`).join('')}</ul></div>`).join('');

  return {
    select(id) {
      const b = tabs.querySelector(`[data-cat="${id}"]`); if (b) b.click();
    },
  };
}

/* ── hours / open now ─────────────────────────────── */
const fmt = (hm) => { let [h, m] = hm.split(':').map(Number); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return m ? `${h}:${String(m).padStart(2, '0')}${ap}` : `${h}${ap}`; };
export function renderHours() {
  // the cafe is in Owensboro → America/Chicago
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const day = parts.find((p) => p.type === 'weekday').value;
  const mins = Number(parts.find((p) => p.type === 'hour').value) * 60 + Number(parts.find((p) => p.type === 'minute').value);
  const toMin = (hm) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const today = hours.find((h) => h.day === day);
  const open = today && mins >= toMin(today.open) && mins < toMin(today.close);

  const table = $('#hoursTable');
  table.insertAdjacentHTML('beforeend', hours.map((h) => `<tr class="${h.day === day ? 'is-today' : ''}"><td>${h.day}</td><td>${fmt(h.open)} – ${fmt(h.close)}</td></tr>`).join(''));

  let text;
  if (open) text = `Open now · until ${fmt(today.close)}`;
  else {
    const idx = hours.findIndex((h) => h.day === day);
    const laterToday = today && mins < toMin(today.open);
    const nxt = laterToday ? today : hours[(idx + 1) % 7];
    text = `Closed · opens ${laterToday ? 'today' : nxt.day === hours[(idx + 1) % 7].day ? 'tomorrow' : nxt.day} ${fmt(nxt.open)}`;
  }
  document.querySelectorAll('[data-open-chip]').forEach((c) => { c.classList.add(open ? 'is-open' : 'is-closed'); c.querySelector('b').textContent = text; });
}
