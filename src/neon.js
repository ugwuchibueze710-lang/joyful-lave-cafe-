// ─────────────────────────────────────────────────────────────────────────────
// The JOY neon sign — the real glass sign, photographed lit and unlit, cut out
// of its wall so it hangs on ours. The unlit photo is the hardware (clear glass
// tubes, acrylic backer, electrode caps); the lit photo is layered on top once
// per letter so each tube can strike, flicker and warm up on its own like real
// neon. A dark cord runs behind everything to the wall rocker switch.
// Always on when the page loads; the switch turns it off and on.
// ─────────────────────────────────────────────────────────────────────────────

const SVGNS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, ns = SVGNS) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };

// photo geometry (in the cut-out photo's own pixels, 800 × 540): where the acrylic plate sits
const PHOTO = { w: 800, h: 540, plate: { x: 43, y: 92, w: 715, h: 362 }, cordExit: { x: 616, y: 470 } };
const LETTERS = ['j', 'o', 'y'];

export function mountNeon({ sign, switchEl, hero }) {
  const rig = sign.querySelector('.neon__rig');
  const photo = document.createElement('span');
  photo.className = 'neon__photo';
  photo.innerHTML = `<img class="neon__off" src="/photos/joy-neon-off.webp" alt="" decoding="async" draggable="false">`
    + LETTERS.map((l) => `<img class="neon__on neon__on--${l}" src="/photos/joy-neon-on.webp" alt="" decoding="async" draggable="false">`).join('');
  rig.appendChild(photo);
  sign.classList.add('is-photo');
  const onImgs = Object.fromEntries(LETTERS.map((l) => [l, photo.querySelector(`.neon__on--${l}`)]));

  function size() {
    const hpx = sign.getBoundingClientRect().height || 100;
    const wpx = (hpx * PHOTO.plate.w) / PHOTO.plate.h;
    sign.style.width = `${wpx}px`; rig.style.width = `${wpx}px`;
    const k = wpx / PHOTO.plate.w;
    Object.assign(photo.style, { width: `${PHOTO.w * k}px`, height: `${PHOTO.h * k}px`, left: `${-PHOTO.plate.x * k}px`, top: `${-PHOTO.plate.y * k}px` });
    const h = hero.getBoundingClientRect(), r = sign.getBoundingClientRect();
    if (r.width) { hero.style.setProperty('--nx', `${r.left - h.left + r.width / 2}px`); hero.style.setProperty('--ny', `${r.top - h.top + r.height / 2}px`); hero.style.setProperty('--nw', `${r.width}px`); }
    drawCord();
  }

  /* ── power cord: continues the sign's own cable, running behind all the text ── */
  const cord = el('svg', { class: 'neon-cord', 'aria-hidden': 'true' });
  const cordShadow = el('path', { class: 'cord-shadow' });
  const cordPath = el('path', { class: 'cord' });
  const cordShine = el('path', { class: 'cord-shine' });
  const clipB = el('circle', { r: 4.5, class: 'cord-clip' });
  cord.append(cordShadow, cordPath, cordShine, clipB);
  hero.appendChild(cord);
  // the room: lit by the sign when on, noticeably darker when off
  const room = document.createElement('div'); room.className = 'neon-room'; room.setAttribute('aria-hidden', 'true');
  room.innerHTML = '<i class="neon-room__glow"></i><i class="neon-room__dark"></i>';
  hero.insertBefore(room, hero.firstChild?.nextSibling ?? null);

  function drawCord() {
    const h = hero.getBoundingClientRect(), a = sign.getBoundingClientRect(), b = switchEl.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const k = a.width / PHOTO.plate.w;
    const x1 = a.left - h.left + (PHOTO.cordExit.x - PHOTO.plate.x) * k, y1 = a.top - h.top + (PHOTO.cordExit.y - PHOTO.plate.y) * k;
    const x2 = b.left - h.left + 6, y2 = b.top - h.top + b.height * 0.5;
    const sag = Math.max(60, Math.abs(y2 - y1) * 0.45 + 40);
    const d = `M ${x1} ${y1 - 30 * k} L ${x1} ${y1} C ${x1} ${y1 + sag}, ${x2 - 90} ${y2 + sag * 0.55}, ${x2} ${y2}`;
    cord.setAttribute('width', h.width); cord.setAttribute('height', h.height);
    cord.setAttribute('viewBox', `0 0 ${h.width} ${h.height}`);
    for (const p of [cordPath, cordShine, cordShadow]) p.setAttribute('d', d);
    cordPath.style.strokeWidth = `${Math.max(4, 11 * k)}px`;
    cordShadow.setAttribute('transform', 'translate(5 9)');
    clipB.setAttribute('cx', x2); clipB.setAttribute('cy', y2);
  }

  /* ── tilt: the sign hangs off the wall and turns slightly with the cursor ── */
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (fine && !reduce) addEventListener('pointermove', (e) => { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
  function loop() {
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    rig.style.setProperty('--ry', `${-4 + cx * 10}deg`);
    rig.style.setProperty('--rx', `${2 - cy * 7}deg`);
    photo.style.setProperty('--gx', `${50 + cx * 60}%`);
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
  }

  /* ── the gas: per-letter brightness, strike flicker, warm-up, idle shimmer ── */
  const lit = { j: 1, o: 1, y: 1 };
  let on = true, timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearAll = () => { timers.forEach(clearTimeout); timers = []; };
  function paint() {
    for (const l of LETTERS) onImgs[l].style.opacity = lit[l].toFixed(3);
    const avg = (lit.j + lit.o + lit.y) / 3;
    sign.style.setProperty('--lit', avg.toFixed(3));
    photo.querySelector('.neon__off').style.opacity = (1 - avg * 0.55).toFixed(3);
  }
  // a real tube strikes with a few stutters before the gas holds, then warms up
  function strike(l, delay) {
    const seq = reduce ? [[0, 1]] : [[0, 0.55], [40, 0.05], [90, 0.8], [130, 0.12], [175, 0.95], [205, 0.35], [250, 0.9]];
    const jitter = Math.random() * 60;
    for (const [t, v] of seq) later(delay + t + jitter, () => { lit[l] = v; paint(); });
    later(delay + 270 + jitter, () => warm(l, 0.9));
  }
  function warm(l, from) {
    const t0 = performance.now(), dur = 650;
    const step = (now) => { const p = Math.min(1, (now - t0) / dur); lit[l] = from + (1 - from) * (1 - (1 - p) ** 3); paint(); if (p < 1 && on) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function kill() {
    // the gas dies almost instantly; the phosphor leaves a faint afterglow
    for (const l of LETTERS) lit[l] = 0.28;
    paint();
    const t0 = performance.now();
    const step = (now) => { const p = Math.min(1, (now - t0) / 520); for (const l of LETTERS) lit[l] = 0.28 * (1 - p) ** 2; paint(); if (p < 1 && !on) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  // idle: the faint living shimmer of the gas, and the odd stutter of one tube
  function shimmer() {
    if (on && !reduce && !document.hidden) {
      for (const l of LETTERS) lit[l] = Math.min(1, Math.max(0.93, lit[l] + (Math.random() - 0.5) * 0.04));
      paint();
    }
    timers.push(setTimeout(shimmer, 90 + Math.random() * 140));
  }
  function stutter() {
    if (on && !reduce && !document.hidden) {
      const l = LETTERS[Math.floor(Math.random() * 3)];
      [[0, 0.55], [55, 1], [120, 0.7], [170, 1]].forEach(([t, v]) => later(t, () => { if (on) { lit[l] = v; paint(); } }));
    }
    setTimeout(stutter, 14000 + Math.random() * 26000);
  }

  /* ── switch ── */
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
      if (onState) { // transformer buzz as the gas strikes
        const o = ac.createOscillator(), og = ac.createGain();
        o.type = 'sawtooth'; o.frequency.value = 120; og.gain.setValueAtTime(0.0001, t);
        og.gain.exponentialRampToValueAtTime(0.014, t + 0.05); og.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
        o.connect(lp).connect(og).connect(ac.destination); o.start(t); o.stop(t + 1.2);
      }
    } catch { /* audio is optional */ }
  }
  function set(next, sound = true) {
    on = next; clearAll();
    hero.dataset.neon = on ? 'on' : 'off';
    switchEl.setAttribute('aria-pressed', String(on));
    switchEl.setAttribute('aria-label', on ? 'Turn the JOY neon sign off' : 'Turn the JOY neon sign on');
    if (on) { LETTERS.forEach((l, i) => { lit[l] = 0; strike(l, [0, 120, 60][i] + Math.random() * 80); }); paint(); timers.push(setTimeout(shimmer, 1400)); }
    else kill();
    if (sound) click(on);
  }
  switchEl.addEventListener('click', () => set(!on));

  paint(); shimmer(); setTimeout(stutter, 9000);
  (document.fonts?.ready ?? Promise.resolve()).then(size);
  addEventListener('resize', size);
  let until = performance.now() + 7000;
  const follow = () => { drawCord(); if (performance.now() < until) requestAnimationFrame(follow); };
  follow();
  if ('ResizeObserver' in window) new ResizeObserver(size).observe(hero);
  return { reveal() { until = performance.now() + 4000; follow(); set(true, false); }, fit: size };
}
