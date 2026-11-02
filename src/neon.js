// ─────────────────────────────────────────────────────────────────────────────
// The JOY neon sign — modelled on the white outline "JOY" sign on the cafe's
// own counter. Glass tubes follow the letter outlines, mounted on a clear
// acrylic backplate with chrome standoffs, wired by a cord to a wall rocker
// switch. Always on when the page loads; the switch turns it off and on.
// ─────────────────────────────────────────────────────────────────────────────

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, ns = SVGNS) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

export function mountNeon({ sign, switchEl, hero }) {
  const svg = sign.querySelector('.neon__tubes');
  const text = 'JOY';
  const layers = ['shadow', 'glow-wide', 'glow-mid', 'glass', 'core', 'spec'];
  const texts = layers.map((cls) => {
    const t = el('text', { class: `tube tube--${cls}`, x: '50%', y: '50%', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    t.textContent = text;
    svg.appendChild(t);
    return t;
  });

  const plate = sign.querySelector('.neon__rig');

  function fit() {
    // tight glyph box from canvas metrics (SVG getBBox includes the font's empty ascent/descent)
    const c = document.createElement('canvas').getContext('2d');
    const fam = getComputedStyle(document.documentElement).getPropertyValue('--display') || 'Archivo, sans-serif';
    c.font = `900 200px ${fam}`;
    if ('letterSpacing' in c) c.letterSpacing = '10px';
    const m = c.measureText(text);
    const left = m.actualBoundingBoxLeft, right = m.actualBoundingBoxRight;
    const asc = m.actualBoundingBoxAscent, desc = m.actualBoundingBoxDescent;
    texts.forEach((t) => { t.setAttribute('x', 0); t.setAttribute('y', 0); t.setAttribute('text-anchor', 'start'); t.removeAttribute('dominant-baseline'); });
    const pad = 22;
    const x0 = -left - pad, y0 = -asc - pad, vw = left + right + pad * 2, vh = asc + desc + pad * 2;
    svg.setAttribute('viewBox', `${x0} ${y0} ${vw} ${vh}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const hpx = sign.getBoundingClientRect().height || 100;
    const wpx = (hpx * vw) / vh;
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
    const a = sign.querySelector('.neon__plate').getBoundingClientRect();
    const b = switchEl.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const x1 = a.right - h.left - a.width * 0.08, y1 = a.bottom - h.top - 4;
    const x2 = b.left - h.left + 6, y2 = b.top - h.top + b.height * 0.5;
    const sag = Math.max(60, Math.abs(y2 - y1) * 0.45 + 40);
    const d = `M ${x1} ${y1} C ${x1 + 10} ${y1 + sag}, ${x2 - 90} ${y2 + sag * 0.55}, ${x2} ${y2}`;
    cord.setAttribute('width', h.width); cord.setAttribute('height', h.height);
    cord.setAttribute('viewBox', `0 0 ${h.width} ${h.height}`);
    cordPath.setAttribute('d', d); cordShine.setAttribute('d', d); cordPulse.setAttribute('d', d);
    cordShadow.setAttribute('d', d); cordShadow.setAttribute('transform', 'translate(5 9)');
    clipA.setAttribute('cx', x1); clipA.setAttribute('cy', y1);
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
