import * as THREE from 'three';
import { glass, solid, fruit, liquid } from '../materials.js';

// JUICE — a cooler bottle refilled with each real juice. The ingredients that
// orbit it are exactly the ones in that juice's published recipe.

const JUICES = [
  { name: 'Main Squeeze', color: '#f28a1e', top: '#f7a33a', items: ['lemon', 'orange', 'carrot'] },
  { name: 'Fruit Root', color: '#8e1735', top: '#a8243f', items: ['beet', 'carrot', 'ginger', 'apple'] },
  { name: 'Old Faithful', color: '#a9442c', top: '#c0603a', items: ['lemon', 'celery', 'cucumber', 'carrot', 'apple', 'beet', 'ginger'] },
  { name: 'Joyous Jade', color: '#5f9e25', top: '#7fbb38', items: ['lemon', 'spinach', 'cucumber', 'apple'] },
];

const LABEL = { lemon: 'Lemon', orange: 'Orange', carrot: 'Carrot', beet: 'Beet', ginger: 'Ginger', apple: 'Apple', celery: 'Celery', cucumber: 'Cucumber', spinach: 'Spinach' };

function citrusSlice(rind, flesh) {
  const g = new THREE.Group();
  const R = 0.42, segs = 9;
  const fleshMat = fruit(flesh, { roughness: 0.3 });
  for (let i = 0; i < segs; i++) {
    const geo = new THREE.CylinderGeometry(R * 0.86, R * 0.86, 0.1, 10, 1, false, (i / segs) * Math.PI * 2, (Math.PI * 2) / segs - 0.08);
    geo.rotateX(Math.PI / 2); g.add(new THREE.Mesh(geo, fleshMat));
  }
  const pith = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.93, R * 0.93, 0.09, 40), solid('#fbf3d8')); pith.rotation.x = Math.PI / 2; pith.position.z = -0.006;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R * 0.96, 0.05, 10, 48), fruit(rind));
  g.add(pith, rim);
  return g;
}

function make(kind) {
  switch (kind) {
    case 'lemon': return citrusSlice('#f4c800', '#ffe25a');
    case 'orange': return citrusSlice('#f08a00', '#ffa62b');
    case 'carrot': {
      const g = new THREE.Group();
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.17, 1.15, 20), fruit('#f07a12', { roughness: 0.5 })); c.rotation.x = Math.PI;
      for (let i = 0; i < 4; i++) { const l = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.45, 6), solid('#3f8f2a')); l.position.set((i - 1.5) * 0.04, 0.78, 0); l.rotation.z = (i - 1.5) * 0.25; g.add(l); }
      g.add(c); return g;
    }
    case 'beet': {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.34, 28, 20), fruit('#6d0f2e', { roughness: 0.45 })); b.scale.y = 0.95;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 8), solid('#5a0d26')); tail.position.y = -0.48; tail.rotation.x = Math.PI;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.3, 8), solid('#a3193f')); stem.position.y = 0.42;
      g.add(b, tail, stem); return g;
    }
    case 'ginger': {
      const g = new THREE.Group(); const m = solid('#d6a55e', { roughness: 0.85 });
      [[0, 0, 0, 0.2], [0.26, 0.08, 0, 0.15], [-0.22, 0.1, 0.05, 0.14], [0.08, 0.26, -0.04, 0.12]].forEach(([x, y, z, r]) => { const k = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), m); k.position.set(x, y, z); k.scale.set(1.4, 1, 1); g.add(k); });
      return g;
    }
    case 'apple': {
      const g = new THREE.Group();
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.36, 32, 24), fruit('#c8102e', { roughness: 0.25 })); a.scale.y = 0.9;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.2, 6), solid('#5a3a1a')); stem.position.y = 0.36;
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), solid('#3f8f2a')); leaf.scale.set(1, 0.2, 0.5); leaf.position.set(0.09, 0.4, 0);
      g.add(a, stem, leaf); return g;
    }
    case 'celery': {
      const g = new THREE.Group();
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.3, 14, 1, false, 0, Math.PI * 1.3), solid('#9cc95a', { roughness: 0.4, side: THREE.DoubleSide }));
      const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), solid('#5fa338')); top.position.y = 0.72;
      g.add(s, top); return g;
    }
    case 'cucumber': {
      const g = new THREE.Group();
      const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.09, 36), [solid('#2f6b22'), solid('#cfe8a3', { roughness: 0.4 }), solid('#cfe8a3')]);
      skin.rotation.x = Math.PI / 2;
      const seeds = new THREE.Mesh(new THREE.CircleGeometry(0.18, 24), solid('#e8f5c8')); seeds.position.z = 0.047;
      g.add(skin, seeds); return g;
    }
    case 'spinach': {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 12), solid('#2f6e1e', { roughness: 0.35, side: THREE.DoubleSide, clearcoat: 0.5 }));
      leaf.scale.set(0.55, 0.06, 1); return leaf;
    }
  }
}

export function createJuice() {
  const group = new THREE.Group();
  // cooler bottle profile
  const prof = [[0, 0], [0.62, 0], [0.7, 0.08], [0.72, 2.0], [0.62, 2.35], [0.33, 2.7], [0.3, 3.05], [0.33, 3.1], [0.3, 3.12], [0.26, 3.12], [0.27, 2.72], [0.58, 2.33], [0.67, 2.0], [0.65, 0.12], [0, 0.12]];
  const bottle = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 80), glass({ thickness: 0.25, dispersion: 5, roughness: 0.02 }));
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 40), solid('#ffffff', { roughness: 0.35, clearcoat: 0.6 }));
  cap.position.y = 3.25;
  const labelBand = new THREE.Mesh(new THREE.CylinderGeometry(0.735, 0.735, 0.85, 64, 1, true, -0.9, 1.8), solid('#ec3b3a', { roughness: 0.4, side: THREE.DoubleSide }));
  labelBand.position.y = 1.1;
  const liqMat = liquid({ bottom: JUICES[0].color, top: JUICES[0].top, height: 2.4 });
  const lgeo = new THREE.CylinderGeometry(0.64, 0.62, 2.4, 48, 12); lgeo.translate(0, 1.2, 0);
  const liq = new THREE.Mesh(lgeo, liqMat); liq.position.y = 0.13;
  liqMat.userData.uniforms.uFill.value = 2.1;
  group.add(bottle, cap, liq, labelBand);
  [bottle, liq, labelBand].forEach((m) => (m.userData.label = 'Fresh Squeezed $8.50 · Cooler Bottle $7.50'));

  // orbiting ingredient pool (all nine), shown per juice
  const pool = {};
  Object.keys(LABEL).forEach((k) => {
    pool[k] = Array.from({ length: 2 }, () => {
      const m = make(k); m.scale.setScalar(0.001); m.userData.kind = k;
      m.traverse((o) => (o.userData.label = LABEL[k]));
      m.userData.orbit = { r: 1.8 + Math.random() * 1.0, a: Math.random() * Math.PI * 2, y: 0.4 + Math.random() * 2.8, sp: 0.25 + Math.random() * 0.2, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()) };
      group.add(m); return m;
    });
  });

  let current = 0, fillAnim = 1;
  const from = new THREE.Color(), to = new THREE.Color(), fromT = new THREE.Color(), toT = new THREE.Color();
  function setJuice(i) {
    if (i === current) return;
    from.copy(liqMat.userData.uniforms.uBottom.value); fromT.copy(liqMat.userData.uniforms.uTop.value);
    to.set(JUICES[i].color); toT.set(JUICES[i].top);
    current = i; fillAnim = 0;
  }

  function update(t, dt, s) {
    const u = liqMat.userData.uniforms; u.uTime.value = t;
    if (fillAnim < 1) {
      fillAnim = Math.min(1, fillAnim + dt / 1.4);
      // drain → swap colour → refill
      const k = fillAnim;
      u.uFill.value = 2.1 * (k < 0.4 ? 1 - k / 0.4 * 0.95 : 0.05 + (k - 0.4) / 0.6 * 0.95);
      if (k >= 0.4) { u.uBottom.value.copy(from).lerp(to, Math.min(1, (k - 0.4) * 4)); u.uTop.value.copy(fromT).lerp(toT, Math.min(1, (k - 0.4) * 4)); u.uSurface.value.copy(u.uTop.value); }
    }
    u.uTilt.value.set(-s.pointer.x * 0.12 + Math.sin(t * 1.3) * 0.02, s.pointer.y * 0.1);
    const wanted = new Set(JUICES[current].items);
    Object.values(pool).flat().forEach((m, i) => {
      const on = wanted.has(m.userData.kind) && (fillAnim > 0.4 || fillAnim === 1);
      const target = on ? 1 : 0.001;
      const sc = m.scale.x + (target - m.scale.x) * Math.min(1, dt * 5);
      m.scale.setScalar(sc);
      m.visible = sc > 0.01;
      const o = m.userData.orbit, a = o.a + t * o.sp;
      m.position.set(Math.cos(a) * o.r + s.pointer.x * 0.3, o.y + Math.sin(t * 0.8 + i) * 0.15, Math.sin(a) * o.r * 0.7);
      m.rotation.x += o.spin.x * dt * 0.6; m.rotation.y += o.spin.y * dt * 0.6;
    });
    group.rotation.y = s.pointer.x * 0.3;
  }
  const hoverables = []; group.traverse((o) => o.isMesh && o.userData.label && hoverables.push(o));
  return { group, update, setJuice, hoverables, JUICES };
}
