// ─────────────────────────────────────────────────────────────────────────────
// The JOY marquee sign — modelled on the red "JOY" marquee letters on the
// cafe's own counter: deep-red channel letters with a row of white bulbs
// running down each stroke. Wired by a cord (running behind everything) to a
// wall rocker switch. Always on when the page loads; the switch turns it off/on.
// ─────────────────────────────────────────────────────────────────────────────

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, ns = SVGNS) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

// centre-lines of the three letters (units: letter cap height = 200)
const LETTERS = [
  { x: 0, d: ['M 32 16 H 132', 'M 106 16 V 138 C 106 182 84 202 58 202 C 31 202 14 186 14 158'] },
  { x: 150, d: ['M 88 16 C 130 16 162 56 162 109 C 162 163 130 202 88 202 C 46 202 14 163 14 109 C 14 56 46 16 88 16 Z'] },
  { x: 334, d: ['M 6 16 H 64', 'M 112 16 H 170', 'M 34 16 L 88 112 L 142 16', 'M 88 112 V 202', 'M 56 202 H 120'] },
];
const STROKE = 34, BULB_GAP = 21, DEPTH = 9;

export function mountNeon({ sign, switchEl, hero }) {
  const svg = sign.querySelector('.neon__tubes');
  const plate = sign.querySelector('.neon__rig');
  svg.setAttribute('viewBox', `-24 -12 ${520 + 24 + DEPTH + 18} ${232 + DEPTH + 12}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  const defs = el('defs');
  defs.innerHTML = `
    <linearGradient id="mqFace" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff4b43"/><stop offset=".45" stop-color="#ec2a2d"/><stop offset="1" stop-color="#c5161d"/></linearGradient>
    <radialGradient id="mqBulb" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#fff8ef"/><stop offset=".8" stop-color="#ffe7d3"/><stop offset="1" stop-color="#f3c9b2"/></radialGradient>
    <radialGradient id="mqBulbOff" cx=".38" cy=".34" r=".7"><stop offset="0" stop-color="#f4eeea"/><stop offset=".6" stop-color="#cfc4bf"/><stop offset="1" stop-color="#9d8f8a"/></radialGradient>
    <filter id="mqGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="mqHalo" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>`;
  const shadow = el('g', { class: 'mq-shadow' }), sides = el('g', { class: 'mq-side' }), faces = el('g', { class: 'mq-face' }),
    rims = el('g', { class: 'mq-rim' }), inlay = el('g', { class: 'mq-inlay' }), halo = el('g', { class: 'mq-halo' }), sockets = el('g', { class: 'mq-socket' }),
    glow = el('g', { class: 'mq-glow' }), bulbs = el('g', { class: 'mq-bulb' }), shine = el('g', { class: 'mq-shine' });
  svg.append(defs, shadow, sides, faces, rims, inlay, halo, sockets, glow, bulbs, shine);
  for (const L of LETTERS) {
    for (const d of L.d) {
      const tr = `translate(${L.x} 0)`;
      shadow.appendChild(el('path', { d, transform: `translate(${L.x + 16} 22)` }));
      for (let k = DEPTH; k > 0; k -= 1.5) sides.appendChild(el('path', { d, transform: `translate(${L.x + k * 0.7} ${k})` }));
      faces.appendChild(el('path', { d, transform: tr }));
      rims.appendChild(el('path', { d, transform: tr }));
      inlay.appendChild(el('path', { d, transform: tr }));
      // bulbs evenly along the stroke
      const probe = el('path', { d }); svg.appendChild(probe);
      const len = probe.getTotalLength();
      const n = Math.max(2, Math.round(len / BULB_GAP));
      const closed = /Z\s*$/.test(d);
      for (let i = 0; i < (closed ? n : n + 1); i++) {
        const pt = probe.getPointAtLength(Math.min(len, (len / n) * i));
        const cx = pt.x + L.x, cy = pt.y;
        if ([...bulbs.children].some((b) => Math.hypot(b.cx.baseVal.value - cx, b.cy.baseVal.value - cy) < BULB_GAP * 0.55)) continue;
        sockets.appendChild(el('circle', { cx, cy, r: 7.2 }));
        halo.appendChild(el('circle', { cx, cy, r: 13 }));
        glow.appendChild(el('circle', { cx, cy, r: 7.5 }));
        bulbs.appendChild(el('circle', { cx, cy, r: 5.2 }));
        shine.appendChild(el('circle', { cx: cx - 1.9, cy: cy - 2.1, r: 1.7 }));
      }
      probe.remove();
    }
  }

  function fit() {
    const vb = svg.viewBox.baseVal;
    const hpx = sign.getBoundingClientRect().height || 100;
    const wpx = (hpx * vb.width) / vb.height;
    svg.style.width = `${wpx}px`; plate.style.width = `${wpx}px`; sign.style.width = `${wpx}px`;
    drawCord();
  }

  /* ── power cord from the back of the sign to the wall switch ── */
  const cord = el('svg', { class: 'neon-cord', 'aria-hidden': 'true' });
  const cordShadow = el('path', { class: 'cord-shadow' });
  const cordPath = el('path', { class: 'cord' });
  const cordShine = el('path', { class: 'cord-shine' });
  const cordPulse = el('path', { class: 'cord-pulse' });
  const clipA = el('circle', { r: 4.5, class: 'cord-clip' });
  const clipB = el('circle', { r: 4.5, class: 'cord-clip' });
  cord.append(cordShadow, cordPath, cordShine, cordPulse, clipA, clipB);
  hero.appendChild(cord);

  function drawCord() {
    const h = hero.getBoundingClientRect();
    const a = svg.getBoundingClientRect();
    const b = switchEl.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const x1 = a.left - h.left + a.width * 0.6, y1 = a.top - h.top + a.height * 0.62; // hidden behind the O/Y
    const x2 = b.left - h.left + 6, y2 = b.top - h.top + b.height * 0.5;
    const sag = Math.max(60, Math.abs(y2 - y1) * 0.45 + 40);
    const d = `M ${x1} ${y1} C ${x1 + 10} ${y1 + sag}, ${x2 - 90} ${y2 + sag * 0.55}, ${x2} ${y2}`;
    cord.setAttribute('width', h.width); cord.setAttribute('height', h.height);
    cord.setAttribute('viewBox', `0 0 ${h.width} ${h.height}`);
    cordPath.setAttribute('d', d); cordShine.setAttribute('d', d); cordPulse.setAttribute('d', d);
    cordShadow.setAttribute('d', d); cordShadow.setAttribute('transform', 'translate(5 9)');
    clipA.setAttribute('cx', -99); clipA.setAttribute('cy', -99);
    clipB.setAttribute('cx', x2); clipB.setAttribute('cy', y2);
  }

  /* ── 3D float: the sign hangs off the wall and tilts with the cursor ── */
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !reduce) {
    addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  }
  function loop() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    plate.style.setProperty('--ry', `${-7 + cx * 18}deg`);
    plate.style.setProperty('--rx', `${4 - cy * 12}deg`);
    plate.style.setProperty('--sx', `${cx * -26 + 14}px`);
    plate.style.setProperty('--sy', `${cy * -18 + 20}px`);
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
  }

  /* ── switch ── */
  let on = true;
  const ctx = { a: null };
  function click(onState) {
    try {
      ctx.a ??= new (window.AudioContext || window.webkitAudioContext)();
      const ac = ctx.a, t = ac.currentTime;
      const buf = ac.createBuffer(1, ac.sampleRate * 0.05, ac.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ac.sampleRate * 0.004));
      const src = ac.createBufferSource(); src.buffer = buf;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = onState ? 2600 : 1900; f.Q.value = 1.4;
      const g = ac.createGain(); g.gain.value = 0.22;
      src.connect(f).connect(g).connect(ac.destination); src.start(t);
      if (onState) { // the faint transformer hum as the gas strikes
        const o = ac.createOscillator(), og = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = 120; og.gain.setValueAtTime(0.0001, t);
        og.gain.exponentialRampToValueAtTime(0.012, t + 0.05); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
        o.connect(lp).connect(og).connect(ac.destination); o.start(t); o.stop(t + 1);
      }
    } catch { /* audio is optional */ }
  }
  function set(next, sound = true) {
    on = next;
    hero.dataset.neon = on ? 'on' : 'off';
    switchEl.setAttribute('aria-pressed', String(on));
    switchEl.setAttribute('aria-label', on ? 'Turn the JOY neon sign off' : 'Turn the JOY neon sign on');
    sign.classList.remove('is-striking', 'is-dying');
    void sign.offsetWidth; // restart the animation
    sign.classList.add(on ? 'is-striking' : 'is-dying');
    if (sound) click(on);
  }
  switchEl.addEventListener('click', () => set(!on));

  // re-fit on font load / resize, follow the hero reveal for a moment
  const refit = () => { fit(); };
  (document.fonts?.ready ?? Promise.resolve()).then(refit);
  addEventListener('resize', refit);
  // keep the cord attached while the hero animates in / fonts settle / layout shifts
  let until = performance.now() + 7000;
  const follow = () => { drawCord(); if (performance.now() < until) requestAnimationFrame(follow); };
  follow();
  if ('ResizeObserver' in window) new ResizeObserver(() => { fit(); }).observe(hero);
  return { reveal() { until = performance.now() + 4000; follow(); set(true, false); }, fit: refit };
}
