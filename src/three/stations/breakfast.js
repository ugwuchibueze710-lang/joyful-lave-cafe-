import * as THREE from 'three';
import { solid, fruit } from '../materials.js';
import { bake, speckle } from '../textures.js';

// BREAKFAST — The Ultimate, exploded into its published layers:
// buttery croissant, eggs, crispy bacon, sausage, avocado, house-made garlic
// tomato jam & Pepper Jack cheese. Scrolling through the chapter separates it.

function croissantHalf(top) {
  // crescent of overlapping laminated "rolls"
  const g = new THREE.Group();
  const mat = solid('#ffffff', { map: bake(top ? '#b8621c' : '#d99a4e', '#e9b065'), roughness: 0.55, clearcoat: top ? 0.6 : 0.1, sheen: 0.4, sheenColor: '#ffd28a' });
  const n = 7;
  for (let i = 0; i < n; i++) {
    const k = i / (n - 1), a = -1.15 + k * 2.3;
    const r = 0.42 * (1 - Math.abs(k - 0.5) * 1.1) + 0.12;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18, 0, Math.PI * 2, 0, top ? Math.PI / 2 : Math.PI), mat);
    if (!top) s.scale.y = 0.38;
    else s.scale.set(1, 0.8, 1);
    s.position.set(Math.sin(a) * 1.25, 0, Math.cos(a) * 0.55 - 0.55);
    s.rotation.y = a;
    g.add(s);
  }
  return g;
}

function egg() {
  const g = new THREE.Group();
  const white = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.2, 0.12, 48), solid('#fbf8ef', { roughness: 0.35 }));
  const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), fruit('#f6a700', { roughness: 0.2 }));
  yolk.scale.y = 0.45; yolk.position.set(0.2, 0.06, 0.1);
  g.add(white, yolk); return g;
}
function bacon() {
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(2.4, 0.38, 60, 4);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 5) * 0.1);
  geo.computeVertexNormals(); geo.rotateX(-Math.PI / 2);
  const tex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); for (let y = 0; y < 64; y += 8) { x.fillStyle = y % 16 ? '#f0c9a6' : '#8a2814'; x.fillRect(0, y, 256, 8); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const mat = solid('#ffffff', { map: tex, roughness: 0.4, clearcoat: 0.6, side: THREE.DoubleSide });
  [-0.35, 0.35].forEach((z, i) => { const m = new THREE.Mesh(geo, mat); m.position.z = z; m.rotation.y = i ? 0.25 : -0.2; g.add(m); });
  return g;
}
function sausage() {
  const geo = new THREE.CylinderGeometry(1.0, 1.0, 0.22, 48, 2);
  const m = new THREE.Mesh(geo, solid('#ffffff', { map: speckle('#7a3d1e', '#a85a2a', 500, [2, 5]), roughness: 0.75 }));
  return m;
}
function avocado() {
  const g = new THREE.Group();
  const flesh = solid('#b9cf4f', { roughness: 0.35, clearcoat: 0.4 });
  const skinEdge = solid('#4e7a1c');
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 12, 0, Math.PI), [flesh]);
    s.scale.set(0.42, 0.16, 1); s.rotation.y = -0.7 + i * 0.28; s.position.set(-0.6 + i * 0.24, 0, 0);
    const edge = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 24, Math.PI), skinEdge); edge.scale.set(1, 1, 1); s.add(edge);
    g.add(s);
  }
  return g;
}
function tomatoJam() {
  const geo = new THREE.CircleGeometry(1.0, 48);
  const p = geo.attributes.position;
  for (let i = 1; i < p.count; i++) { const k = 1 + Math.sin(i * 1.7) * 0.08; p.setXY(i, p.getX(i) * k, p.getY(i) * k); }
  geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, solid('#b3170f', { roughness: 0.1, clearcoat: 1, transmission: 0.2, thickness: 0.2, side: THREE.DoubleSide }));
  return m;
}
function pepperJack() {
  const geo = new THREE.BoxGeometry(2.0, 0.07, 2.0, 16, 1, 16);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) - (Math.max(0, Math.abs(x) - 0.6) ** 2 + Math.max(0, Math.abs(z) - 0.6) ** 2) * 0.55); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, solid('#ffffff', { map: speckle('#f6ecc4', '#c4351c', 260, [1.5, 3.5]), roughness: 0.45, clearcoat: 0.2 }));
  m.rotation.y = Math.PI / 4; return m;
}

export function createBreakfast() {
  const group = new THREE.Group();
  const layers = [
    [croissantHalf(false), 'Buttery croissant'],
    [tomatoJam(), 'House-made garlic tomato jam'],
    [egg(), 'Eggs'],
    [sausage(), 'Sausage'],
    [bacon(), 'Crispy bacon'],
    [pepperJack(), 'Pepper Jack cheese'],
    [avocado(), 'Avocado'],
    [croissantHalf(true), 'Buttery croissant'],
  ];
  const stackGap = 0.17;
  layers.forEach(([m, label], i) => {
    m.traverse((o) => (o.userData.label = label));
    m.userData.i = i; m.userData.base = i * stackGap;
    group.add(m);
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshBasicMaterial({ color: 0x6a3a10, transparent: true, opacity: 0.16, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.2; group.add(shadow);

  let explode = 0;
  function update(t, dt, s, local = 0) {
    const want = THREE.MathUtils.smoothstep(local, 0.05, 0.55);
    explode += (want - explode) * Math.min(1, dt * 4);
    layers.forEach(([m], i) => {
      m.position.y = 0.3 + m.userData.base + explode * i * 0.55 + Math.sin(t * 1.2 + i) * 0.03 * explode;
      m.rotation.y = explode * (i - 3.5) * 0.12 + s.pointer.x * 0.4;
    });
    group.rotation.x = 0.28 + s.pointer.y * 0.12 + explode * 0.1;
  }
  const hoverables = []; group.traverse((o) => o.isMesh && o.userData.label && hoverables.push(o));
  return { group, update, hoverables };
}
