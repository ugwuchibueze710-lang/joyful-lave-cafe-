// Real-glass neon tubes in Three.js.
// • Tube: phosphor-coated glass — milky white when cold, luminous from inside when lit.
// • Inner gas core: an over-bright line that the CSS glow (drop-shadow) blooms around.
// • Each open end bends back toward the wall into a black-painted "blockout" return
//   and a black electrode cap; small glass posts hold the tubes off the acrylic.
// • Reflections come from a studio environment map, so highlights slide along the
//   glass as the sign tilts with the cursor.
// Brightness follows the CSS custom property --lit on the sign (1 = on, 0 = off),
// so the gas-strike flicker and the switch drive the 3D glass too.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Vector3, CatmullRomCurve3, TubeGeometry, CylinderGeometry, SphereGeometry,
  Mesh, MeshPhysicalMaterial, MeshBasicMaterial, MeshStandardMaterial, PMREMGenerator, Color, SRGBColorSpace, ACESFilmicToneMapping, PointLight,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const R_TUBE = 6.6, R_CORE = 2.7, RETURN = 34;

/** Sample an SVG path string (M/L/H/V/C only, absolute) into points. */
function samplePath(d, step = 3) {
  const tok = d.match(/[MLHVCZ]|-?\d*\.?\d+/g); const pts = []; let i = 0, cmd = '', x = 0, y = 0;
  const num = () => Number(tok[i++]);
  const push = (px, py) => { const last = pts[pts.length - 1]; if (!last || Math.hypot(last.x - px, last.y - py) > 0.01) pts.push({ x: px, y: py }); };
  while (i < tok.length) {
    if (/[A-Z]/.test(tok[i])) cmd = tok[i++];
    if (cmd === 'M') { x = num(); y = num(); push(x, y); cmd = 'L'; }
    else if (cmd === 'L' || cmd === 'H' || cmd === 'V') {
      const nx = cmd === 'V' ? x : num(), ny = cmd === 'H' ? y : cmd === 'V' ? num() : num();
      const n = Math.max(1, Math.ceil(Math.hypot(nx - x, ny - y) / step));
      for (let k = 1; k <= n; k++) push(x + ((nx - x) * k) / n, y + ((ny - y) * k) / n);
      x = nx; y = ny;
    } else if (cmd === 'C') {
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
      const n = 24;
      for (let k = 1; k <= n; k++) {
        const t = k / n, u = 1 - t;
        push(u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3);
      }
      x = x3; y = y3;
    } else i++;
  }
  return pts;
}

export function createNeon3D({ holder, sign, tubes, bounds }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'neon__gl';
  canvas.setAttribute('aria-hidden', 'true');
  holder.after(canvas);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new PerspectiveCamera(16, bounds.w / bounds.h, 10, 6000);
  const root = new Group(); scene.add(root);
  const cx = bounds.x + bounds.w / 2, cy = bounds.y + bounds.h / 2;
  const toV = (p, z = 0) => new Vector3(p.x - cx, -(p.y - cy), z);

  // materials
  const glass = new MeshPhysicalMaterial({ color: 0xf6efec, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04,
    sheen: 0.4, sheenColor: new Color(0xffe3e6), emissive: new Color(0xff8fa0), emissiveIntensity: 0, envMapIntensity: 1.25, transparent: true, opacity: 0.92 });
  const core = new MeshBasicMaterial({ color: new Color(1, 1, 1), toneMapped: false, transparent: true, opacity: 1 });
  const paint = new MeshStandardMaterial({ color: 0x141214, roughness: 0.55, metalness: 0.1, envMapIntensity: 0.8 });
  const cap = new MeshStandardMaterial({ color: 0x0d0d0f, roughness: 0.35, metalness: 0.2, envMapIntensity: 1 });
  const post = new MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0, clearcoat: 1, transparent: true, opacity: 0.35, envMapIntensity: 1.4 });

  for (const d of tubes) {
    const pts = samplePath(d).map((p) => toV(p));
    const curve = new CatmullRomCurve3(pts, false, 'centripetal', 0.1);
    const segs = Math.max(60, Math.round(curve.getLength() / 2.2));
    root.add(new Mesh(new TubeGeometry(curve, segs, R_TUBE, 18, false), glass));
    root.add(new Mesh(new TubeGeometry(curve, segs, R_CORE, 10, false), core));
    // both ends: bend back toward the wall, painted black, into an electrode cap
    for (const end of [0, 1]) {
      const p = curve.getPoint(end), t = curve.getTangent(end).multiplyScalar(end ? 1 : -1);
      const bend = new CatmullRomCurve3([p.clone(), p.clone().addScaledVector(t, 5).add(new Vector3(0, 0, -4)), p.clone().addScaledVector(t, 6).add(new Vector3(0, 0, -RETURN * 0.5)), p.clone().addScaledVector(t, 6).add(new Vector3(0, 0, -RETURN))]);
      root.add(new Mesh(new TubeGeometry(bend, 16, R_TUBE * 1.02, 16, false), paint));
      const e = bend.getPoint(1);
      const housing = new Mesh(new CylinderGeometry(R_TUBE * 1.35, R_TUBE * 1.35, 16, 20), cap);
      housing.rotation.x = Math.PI / 2; housing.position.set(e.x, e.y, e.z - 6); root.add(housing);
      const lip = new Mesh(new SphereGeometry(R_TUBE * 1.36, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), cap);
      lip.rotation.x = Math.PI / 2; lip.position.set(e.x, e.y, e.z + 2); root.add(lip);
    }
    // glass support posts holding the tube off the backer
    for (const f of curve.getLength() > 260 ? [0.3, 0.72] : [0.5]) {
      const p = curve.getPoint(f);
      const m = new Mesh(new CylinderGeometry(2.2, 2.6, RETURN, 10), post);
      m.rotation.x = Math.PI / 2; m.position.set(p.x, p.y, -RETURN / 2 - R_TUBE * 0.4); root.add(m);
    }
  }
  const warm = new PointLight(0xffd2d8, 0, 600, 1.6); warm.position.set(0, 0, 80); scene.add(warm);

  // frame the sign exactly in the canvas
  function frame() {
    const dist = (bounds.h / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.02;
    camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0);
  }
  frame();

  let w = 0, h = 0;
  function resize(wpx, hpx) {
    w = wpx; h = hpx;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(wpx, hpx, false);
    canvas.style.width = `${wpx}px`; canvas.style.height = `${hpx}px`;
    camera.aspect = wpx / hpx; camera.updateProjectionMatrix();
    draw(true);
  }

  let tiltX = 0, tiltY = 0, lastLit = -1;
  function draw(force) {
    const lit = Math.max(0, Math.min(1, Number(getComputedStyle(sign).getPropertyValue('--lit')) || 0));
    if (!force && Math.abs(lit - lastLit) < 0.004) return;
    lastLit = lit;
    // phosphor glass glows from inside; cold glass is milky and reflective
    glass.emissiveIntensity = lit * 1.7;
    glass.emissive.setRGB(1, 0.62 + lit * 0.2, 0.68 + lit * 0.18);
    glass.opacity = 0.9 - lit * 0.12;
    glass.roughness = 0.34 - lit * 0.12;
    core.color.setRGB(0.55 + lit * 3.2, 0.5 + lit * 2.4, 0.52 + lit * 2.6);
    core.opacity = 0.25 + lit * 0.75;
    warm.intensity = lit * 2.2;
    renderer.render(scene, camera);
  }

  // render loop only while something is changing (strike flicker, tilt), and only on screen
  let raf = 0, wakeUntil = 0, visible = true;
  const tick = () => { draw(false); raf = performance.now() < wakeUntil && visible ? requestAnimationFrame(tick) : 0; };
  function wake(ms = 1200) { wakeUntil = Math.max(wakeUntil, performance.now() + ms); if (!raf) raf = requestAnimationFrame(tick); }
  if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(400); }).observe(canvas);
  wake(5000);

  return {
    resize,
    wake,
    tilt(x, y) {
      tiltX = x; tiltY = y;
      root.rotation.y = x * 0.22; root.rotation.x = y * 0.14;
      draw(true);
    },
  };
}
