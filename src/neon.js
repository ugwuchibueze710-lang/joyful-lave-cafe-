// ─────────────────────────────────────────────────────────────────────────────
// The JOY neon sign — real glass neon, rendered in 3D.
// Phosphor-coated white tubes (milky glass when off, glowing from inside when
// lit), hand-bent single-stroke letters, tube ends that bend back into black
// electrode caps, glass support posts, all on a clear acrylic backer with chrome
// standoffs. Wired by a cord (running behind everything) to a wall rocker
// switch. Always on when the page loads; the switch turns it off and on.
// Falls back to an SVG drawing when WebGL isn't available.
// ─────────────────────────────────────────────────────────────────────────────

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, ns = SVGNS) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

// single-stroke tube paths (units: cap height ≈ 200, y down) — each entry is one glass tube
const TUBES = [
  'M 118 14 V 140 C 118 186 92 206 62 206 C 34 206 14 188 12 160',                       // J
  'M 214 196 C 176 186 152 152 152 110 C 152 56 186 14 232 14 C 278 14 312 56 312 110 C 312 164 278 206 232 206 C 222 206 214 204 206 200', // O (ends meet at the back, lower left)
  'M 342 14 L 412 110 L 482 14',                                                          // Y arms
  'M 412 110 V 206',                                                                       // Y stem
];
const BOUNDS = { x: -6, y: -6, w: 500, h: 224 };

export function mountNeon({ sign, switchEl, hero }) {
  const holder = sign.querySelector('.neon__tubes');
  const plate = sign.querySelector('.neon__rig');
  let gl3d = null;

  function size() {
    const hpx = sign.getBoundingClientRect().height || 100;
    const wpx = (hpx * BOUNDS.w) / BOUNDS.h;
    plate.style.width = `${wpx}px`; sign.style.width = `${wpx}px`;
    holder.style.width = `${wpx}px`;
    gl3d?.resize(wpx, hpx);
    drawCord();
  }

  /* ── 3D glass tubes (Three.js) with SVG fallback ── */
  const canGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (canGL) {
    import('./neon3d.js').then(({ createNeon3D }) => {
      gl3d = createNeon3D({ holder, sign, tubes: TUBES, bounds: BOUNDS });
      sign.classList.add('is-3d');
      size();
    }).catch((e) => { console.warn('[neon] 3D failed, using SVG', e); drawSVG(); });
  } else drawSVG();

  function drawSVG() {
    holder.setAttribute('viewBox', `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`);
    holder.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    for (const cls of ['shadow', 'glow-wide', 'glow-mid', 'glass', 'core', 'spec']) {
      const g = el('g', { class: `tube tube--${cls}` });
      TUBES.forEach((d) => g.appendChild(el('path', { d })));
      holder.appendChild(g);
    }
  }

  /* ── power cord from behind the sign to the wall switch ── */
  const cord = el('svg', { class: 'neon-cord', 'aria-hidden': 'true' });
  const cordShadow = el('path', { class: 'cord-shadow' });
  const cordPath = el('path', { class: 'cord' });
  const cordShine = el('path', { class: 'cord-shine' });
  const cordPulse = el('path', { class: 'cord-pulse' });
  const clipB = el('circle', { r: 4.5, class: 'cord-clip' });
  cord.append(cordShadow, cordPath, cordShine, cordPulse, clipB);
  hero.appendChild(cord);

  function drawCord() {
    const h = hero.getBoundingClientRect();
    const a = holder.getBoundingClientRect();
    const b = switchEl.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const x1 = a.left - h.left + a.width * 0.62, y1 = a.top - h.top + a.height * 0.6; // leaves from behind the sign
    const x2 = b.left - h.left + 6, y2 = b.top - h.top + b.height * 0.5;
    const sag = Math.max(60, Math.abs(y2 - y1) * 0.45 + 40);
    const d = `M ${x1} ${y1} C ${x1 + 10} ${y1 + sag}, ${x2 - 90} ${y2 + sag * 0.55}, ${x2} ${y2}`;
    cord.setAttribute('width', h.width); cord.setAttribute('height', h.height);
    cord.setAttribute('viewBox', `0 0 ${h.width} ${h.height}`);
    for (const p of [cordPath, cordShine, cordPulse, cordShadow]) p.setAttribute('d', d);
    cordShadow.setAttribute('transform', 'translate(5 9)');
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
    gl3d?.tilt(cx, cy);
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
    gl3d?.wake(1600);
    if (sound) click(on);
  }
  switchEl.addEventListener('click', () => set(!on));

  // re-fit on font load / resize, follow the hero reveal for a moment
  (document.fonts?.ready ?? Promise.resolve()).then(size);
  addEventListener('resize', size);
  let until = performance.now() + 7000;
  const follow = () => { drawCord(); if (performance.now() < until) requestAnimationFrame(follow); };
  follow();
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(hero);
  return { reveal() { until = performance.now() + 4000; follow(); set(true, false); gl3d?.wake(4000); }, fit: size };
}
