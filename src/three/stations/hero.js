import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { glass, solid, liquid, fruit } from '../materials.js';
import { speckle } from '../textures.js';

// HERO — their logo, rebuilt in 3D: a glass lemon "sun" rising behind a cup.
// The cup holds the real Drink Special: an iced Banana Bread Latte
// (espresso, milk, caramel, banana, cinnamon). Ingredients float around it.

export function lemonSlice() {
  const g = new THREE.Group();
  const R = 1.9, segs = 10, gap = 0.07, inner = 0.16;
  const wedgeMat = new THREE.MeshPhysicalMaterial({ color: '#ffd400', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.6, sheenColor: new THREE.Color('#fff2a0'), envMapIntensity: 0.8, iridescence: 0.25, emissive: new THREE.Color('#ff9a00'), emissiveIntensity: 0.12, side: THREE.DoubleSide });
  const wedges = [];
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, len = (Math.PI * 2) / segs - gap;
    const geo = new THREE.CylinderGeometry(R * 0.84, R * 0.84, 0.26, 24, 1, false, a0, len);
    geo.rotateX(Math.PI / 2);
    const mid = a0 + len / 2; // nudge each wedge out from the centre so pith lines show
    geo.translate(Math.sin(mid) * 0.07, Math.cos(mid) * 0.07, 0);
    const m = new THREE.Mesh(geo, wedgeMat);
    m.userData.home = new THREE.Vector3();
    m.userData.homeRot = new THREE.Euler();
    m.userData.label = 'Lemon — from the logo';
    wedges.push(m); g.add(m);
  }
  // pith + rind (opaque, so the wedges read as glass against them)
  const pith = new THREE.Mesh(new THREE.TorusGeometry(R * 0.9, 0.07, 16, 120), solid('#f6ecc0', { roughness: 0.7 }));
  const rind = new THREE.Mesh(new THREE.TorusGeometry(R * 0.99, 0.13, 24, 140), solid('#f2c400', { roughness: 0.42, clearcoat: 1 }));
  rind.scale.z = 1.4;
  const core = new THREE.Mesh(new THREE.CircleGeometry(R * 0.88, 64), solid('#f4ecd0', { roughness: 0.9, side: THREE.DoubleSide }));
  core.position.z = -0.16;
  g.add(pith, rind, core);
  g.userData = { wedges, ring: [pith, rind], core };
  return g;
}

function glassCup() {
  // clear 24 oz iced cup profile (outer wall up, inner wall down)
  const pts = [];
  const H = 2.6, rb = 0.62, rt = 0.82, wall = 0.045, base = 0.12;
  pts.push(new THREE.Vector2(0, 0));
  pts.push(new THREE.Vector2(rb - 0.05, 0));
  pts.push(new THREE.Vector2(rb, 0.05));
  pts.push(new THREE.Vector2(rt, H));
  pts.push(new THREE.Vector2(rt + 0.02, H + 0.03));
  pts.push(new THREE.Vector2(rt - wall, H + 0.03));
  pts.push(new THREE.Vector2(rb - wall, base));
  pts.push(new THREE.Vector2(0, base));
  const geo = new THREE.LatheGeometry(pts, 96);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, glass({ thickness: 0.15, roughness: 0.02, dispersion: 5, ior: 1.45, env: 1.8 }));
}

function bananaFace() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, '#f3e2a6'); gr.addColorStop(0.55, '#f8eec9'); gr.addColorStop(0.92, '#f4e6b4'); gr.addColorStop(1, '#e8d38a');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; g.strokeStyle = 'rgba(190,160,90,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 46, 128 + Math.sin(a) * 46); g.stroke(); }
  for (let i = 0; i < 9; i++) { const a = i * 0.7, r = 18 + (i % 3) * 7; g.fillStyle = '#4a3a1c'; g.beginPath(); g.ellipse(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 3.4, 2.2, a, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function bananaSlice() {
  const tex = bananaFace();
  const top = solid('#f8efc8', { roughness: 0.45, map: tex, clearcoat: 0.3 });
  const side = solid('#f1e3a8', { roughness: 0.5 });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.09, 40), [side, top, top]);
  return m;
}

function beanGeo() {
  const geo = new THREE.SphereGeometry(0.16, 40, 28);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.y *= 0.62; v.z *= 1.32;
    if (v.y > 0) v.y -= 0.045 * Math.exp(-(v.x * v.x) / 0.0009) * (1 - Math.abs(v.z) / 0.22); // the centre crease
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function cinnamonStick() {
  const g = new THREE.Group();
  const mat = solid('#5e2d12', { roughness: 0.9, map: speckle('#6b3416', '#3e1a08', 900, [1, 3], 256, 256) });
  // a rolled quill: two curled open shells
  for (const r of [0.11, 0.075]) {
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.5, 32, 1, true, 0, Math.PI * 1.75), mat);
    shell.material.side = THREE.DoubleSide;
    g.add(shell);
  }
  return g;
}

export function createHero() {
  const group = new THREE.Group();
  const lemon = lemonSlice();
  lemon.position.set(0, 2.1, -1.6);
  group.add(lemon);

  const cupRig = new THREE.Group();
  group.add(cupRig);
  const cup = glassCup();
  cupRig.add(cup);

  const liqMat = liquid({ bottom: '#f3e1c4', top: '#3e1d0b', surface: '#6b3718', height: 1.9 });
  const liqGeo = new THREE.CylinderGeometry(0.765, 0.575, 2.3, 64, 24);
  liqGeo.translate(0, 1.15, 0);
  const liq = new THREE.Mesh(liqGeo, liqMat);
  liq.position.y = 0.13;
  liq.scale.setScalar(0.985);
  cupRig.add(liq);
  liqMat.userData.uniforms.uFill.value = 1.95;

  // caramel ribbons on the inside wall
  const caramel = solid('#b8641c', { roughness: 0.2, clearcoat: 1, transmission: 0.2, thickness: 0.2 });
  for (let i = 0; i < 3; i++) {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 14 }, (_, k) => {
      const y = 0.35 + k * 0.15, a = i * 2.1 + k * 0.45, r = 0.6 + y * 0.075;
      return new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    }));
    cupRig.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.028, 8), caramel));
  }

  // ice cubes ride the liquid surface
  const iceMat = glass({ roughness: 0.12, thickness: 0.4, dispersion: 2, tint: '#eaf6ff', attenuation: 2 });
  const ice = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.07), iceMat);
    const a = i * 1.7 + 0.4, r = 0.32 + (i % 2) * 0.12;
    c.userData.base = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    c.rotation.set(Math.random(), Math.random(), Math.random());
    ice.push(c); cupRig.add(c);
  }

  // cinnamon stick standing in the drink
  const stick = cinnamonStick();
  stick.position.set(0.32, 2.45, 0.1); stick.rotation.z = -0.32; stick.rotation.x = 0.15;
  cupRig.add(stick);

  // floating real ingredients: banana coins, cinnamon, caramel drops, espresso beans
  const floaters = [];
  const addFloat = (m, p, label, s = 1) => {
    m.position.copy(p); m.scale.setScalar(s);
    m.userData.base = p.clone(); m.userData.spin = new THREE.Vector3(Math.random() - .5, Math.random() - .5, Math.random() - .5).multiplyScalar(0.8);
    m.userData.label = label; m.traverse((o) => { o.userData.label = label; });
    m.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    floaters.push(m); group.add(m);
  };
  [[-1.55, 2.6, 0.6], [1.6, 0.9, 0.9], [-1.25, 0.5, 1.2], [1.35, 3.2, -0.2]].forEach((p, i) =>
    addFloat(bananaSlice(), new THREE.Vector3(...p), 'Banana', 0.9 + (i % 2) * 0.25));
  addFloat(cinnamonStick(), new THREE.Vector3(1.9, 2.2, 0.2), 'Cinnamon', 0.75);
  addFloat(cinnamonStick(), new THREE.Vector3(-1.9, 1.35, -0.3), 'Cinnamon', 0.6);
  const dropMat = solid('#c06a1c', { roughness: 0.08, clearcoat: 1, transmission: 0.35, thickness: 0.4 });
  const beanMat = solid('#3b2213', { roughness: 0.35, clearcoat: 0.6 });
  [[-0.9, 3.4, 0.4], [1.0, 0.25, 1.4]].forEach((p) => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), dropMat); d.scale.y = 1.3;
    addFloat(d, new THREE.Vector3(...p), 'Caramel');
  });
  [[-1.7, 3.7, -0.6], [2.1, 3.9, -0.9], [-2.2, -0.1, 0.4], [0.9, 4.1, 0.3]].forEach((p) => {
    const b = new THREE.Mesh(beanGeo(), beanMat);
    addFloat(b, new THREE.Vector3(...p), 'Espresso by Mylke Coffee');
  });

  // contact shadow
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshBasicMaterial({ color: 0x3a0f22, transparent: true, opacity: 0.18, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005; shadow.scale.set(1, 0.6, 1);
  group.add(shadow);

  cupRig.userData.label = 'Banana Bread Latte — $6';
  cup.userData.label = 'Banana Bread Latte — $6';
  liq.userData.label = 'Banana Bread Latte — $6';

  const hoverables = [cup, liq, ...floaters.flatMap((f) => { const a = []; f.traverse((o) => o.isMesh && a.push(o)); return a; })];

  // slosh physics (spring) driven by pointer + scroll velocity
  const slosh = { x: 0, z: 0, vx: 0, vz: 0 };

  function update(t, dt, s) {
    const u = liqMat.userData.uniforms;
    u.uTime.value = t;
    // rig follows pointer (tilts) → liquid lags behind → slosh
    const targetRX = s.pointer.y * 0.18 + s.scrollVel * 0.004;
    const targetRZ = -s.pointer.x * 0.22;
    cupRig.rotation.x += (targetRX - cupRig.rotation.x) * Math.min(1, dt * 4);
    cupRig.rotation.z += (targetRZ - cupRig.rotation.z) * Math.min(1, dt * 4);
    const fx = -s.pointerVel.x * 0.9 - cupRig.rotation.z * 0.6;
    const fz = s.pointerVel.y * 0.9 + cupRig.rotation.x * 0.6 + s.scrollVel * 0.003;
    slosh.vx += (fx - slosh.x * 14) * dt; slosh.vz += (fz - slosh.z * 14) * dt;
    slosh.vx *= 1 - dt * 2.2; slosh.vz *= 1 - dt * 2.2;
    slosh.x += slosh.vx * dt * 6; slosh.z += slosh.vz * dt * 6;
    slosh.x = THREE.MathUtils.clamp(slosh.x, -0.35, 0.35); slosh.z = THREE.MathUtils.clamp(slosh.z, -0.35, 0.35);
    u.uTilt.value.set(slosh.x, slosh.z);

    const fill = u.uFill.value;
    ice.forEach((c, i) => {
      const b = c.userData.base;
      const y = fill + b.x * slosh.x + b.z * slosh.z - 0.12 + Math.sin(t * 1.6 + i) * 0.03;
      c.position.set(b.x + slosh.x * 0.25, y, b.z + slosh.z * 0.25);
      c.rotation.x += dt * 0.12 * (i % 2 ? 1 : -1); c.rotation.y += dt * 0.1;
    });

    lemon.rotation.z = t * 0.06;
    lemon.rotation.y = s.pointer.x * 0.25;
    lemon.rotation.x = -s.pointer.y * 0.15;

    floaters.forEach((f, i) => {
      const b = f.userData.base;
      f.position.set(
        b.x + Math.sin(t * 0.6 + i) * 0.08 + s.pointer.x * 0.25 * (1 + (i % 3) * 0.4),
        b.y + Math.sin(t * 0.9 + i * 2) * 0.14 - s.scrollVel * 0.002 * (i % 3 + 1),
        b.z + s.pointer.y * 0.15);
      f.rotation.x += f.userData.spin.x * dt; f.rotation.y += f.userData.spin.y * dt;
    });
  }

  return { group, update, hoverables, lemon, cupRig, floaters, liqMat };
}
