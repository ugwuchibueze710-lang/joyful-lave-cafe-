import * as THREE from 'three';
import { glass, solid, fruit } from '../materials.js';
import { speckle } from '../textures.js';

// ACAI — the Happy Acai Bowl as photographed in the cafe: a clear bowl, acai
// base, topped with gluten-free granola, coconut, cacao nibs, strawberry,
// blueberry, banana, chia seeds & almond butter. Toppings drop in on arrival.

const rnd = (a, b) => a + Math.random() * (b - a);

function bumpy(geo, amt) {
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + (Math.random() - 0.5) * amt); p.setXYZ(i, v.x, v.y, v.z); }
  geo.computeVertexNormals(); return geo;
}

export function createAcai() {
  const group = new THREE.Group();
  const R = 1.55;
  // clear plastic bowl, as in their photo
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(R * 0.55, 0), new THREE.Vector2(R * 0.8, 0.25), new THREE.Vector2(R * 0.97, 0.85), new THREE.Vector2(R, 1.05), new THREE.Vector2(R + 0.04, 1.08), new THREE.Vector2(R - 0.04, 1.06), new THREE.Vector2(R * 0.93, 0.85), new THREE.Vector2(R * 0.76, 0.3), new THREE.Vector2(R * 0.52, 0.07), new THREE.Vector2(0, 0.07)];
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 96), glass({ thickness: 0.2, dispersion: 5, roughness: 0.03 }));
  bowl.userData.label = 'Happy Acai Bowl — $11.50';
  group.add(bowl);

  // acai base (deep purple, slightly icy)
  const baseGeo = bumpy(new THREE.SphereGeometry(R * 0.9, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), 0.025);
  baseGeo.scale(1, 0.55, 1);
  const base = new THREE.Mesh(baseGeo, solid('#4a1640', { roughness: 0.42, clearcoat: 0.4, sheen: 0.5, sheenColor: '#b05aa8' }));
  base.position.y = 0.45; base.userData.label = 'Acai, pineapple & apple base';
  group.add(base);
  const surfaceY = (x, z) => 0.45 + Math.sqrt(Math.max(0, (R * 0.9) ** 2 - x * x - z * z)) * 0.55;

  const toppings = [];
  const add = (mesh, x, z, lift, label, rot = new THREE.Euler(rnd(-.3, .3), rnd(0, 6), rnd(-.3, .3))) => {
    const y = surfaceY(x, z) + lift;
    mesh.position.set(x, y, z); mesh.rotation.copy(rot);
    mesh.userData = { label, home: new THREE.Vector3(x, y, z), delay: Math.random() * 0.6 };
    toppings.push(mesh); group.add(mesh);
  };

  // banana coins fanned along one side (like the photo)
  const banTex = speckle('#f8eec9', '#5b4a22', 10, [2, 3], 128, 128);
  const banMat = [solid('#f1e1a6'), solid('#f8efcb', { map: banTex, roughness: 0.45 }), solid('#f8efcb', { map: banTex })];
  for (let i = 0; i < 7; i++) {
    const a = -0.9 + i * 0.28;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.08, 36), banMat), Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.06, 'Banana', new THREE.Euler(0.35, 0, -0.5 + i * 0.1));
  }
  // strawberries (halved)
  const strawTex = speckle('#d61f2c', '#ffe36a', 160, [1.2, 2], 256, 256);
  const strawMat = fruit('#d61f2c', { map: strawTex });
  const cutMat = fruit('#ff8a8a', { roughness: 0.35 });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group();
    const half = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 16, 0, Math.PI), strawMat); half.scale.set(1, 1.25, 0.8);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.28, 28, 0, Math.PI), cutMat); face.scale.set(1, 1.25, 1); face.rotation.y = Math.PI;
    g.add(half, face);
    const a = 2.2 + i * 0.45;
    add(g, Math.cos(a) * 0.8, Math.sin(a) * 0.7, 0.1, 'Strawberry');
  }
  // blueberries
  const blueMat = fruit('#1f2350', { roughness: 0.3, sheen: '#8a9bd6' });
  for (let i = 0; i < 16; i++) {
    const a = rnd(0, Math.PI * 2), r = rnd(0, 0.7);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), blueMat), Math.cos(a) * r, Math.sin(a) * r - 0.1, 0.1, 'Blueberry');
  }
  // granola clusters, coconut, cacao nibs, chia (instanced, scattered)
  const scatter = (geo, mat, n, label, spread = 1.05, lift = 0.05) => {
    const im = new THREE.InstancedMesh(geo, mat, n);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (let i = 0; i < n; i++) {
      const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * spread, x = Math.cos(a) * r, z = Math.sin(a) * r;
      q.setFromEuler(e.set(rnd(0, 6), rnd(0, 6), rnd(0, 6)));
      m.compose(new THREE.Vector3(x, surfaceY(x, z) - 0.42 + lift, z), q, new THREE.Vector3().setScalar(rnd(0.7, 1.3)));
      im.setMatrixAt(i, m);
    }
    im.position.y = 0.42;
    im.userData = { label, home: new THREE.Vector3(0, 0.42, 0), delay: Math.random() * 0.4 };
    toppings.push(im); group.add(im);
  };
  scatter(bumpy(new THREE.DodecahedronGeometry(0.09, 0), 0.4), solid('#b77a3b', { roughness: 0.9 }), 70, 'Gluten-free granola', 1.15);
  scatter(new THREE.BoxGeometry(0.11, 0.02, 0.03), solid('#ffffff', { roughness: 0.8 }), 70, 'Coconut', 1.0, 0.08);
  scatter(bumpy(new THREE.TetrahedronGeometry(0.045, 0), 0.3), solid('#3b1d0f', { roughness: 0.7 }), 50, 'Cacao nibs', 0.9, 0.06);
  scatter(new THREE.SphereGeometry(0.018, 6, 4), solid('#1a1a1a', { roughness: 0.4 }), 220, 'Chia seeds', 1.0, 0.1);

  // almond butter drizzle
  const pts3 = [];
  for (let i = 0; i < 40; i++) { const k = i / 39, x = -1 + k * 2, z = Math.sin(k * 12) * 0.55 * (1 - Math.abs(x) * 0.4); pts3.push(new THREE.Vector3(x, surfaceY(x, z) + 0.2, z)); }
  const drizzle = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts3), 260, 0.045, 10), solid('#b0743a', { roughness: 0.18, clearcoat: 1 }));
  drizzle.userData = { label: 'Almond butter', home: new THREE.Vector3(), delay: 0.9 };
  toppings.push(drizzle); group.add(drizzle);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.2, 48), new THREE.MeshBasicMaterial({ color: 0x5a3a00, transparent: true, opacity: 0.18, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.005; group.add(shadow);

  let entered = -10;
  function onEnter(t) { entered = t; }
  function update(t, dt, s) {
    const k = t - entered;
    toppings.forEach((m, i) => {
      const local = THREE.MathUtils.clamp((k - m.userData.delay) / 0.9, 0, 1);
      const e = 1 - Math.pow(1 - local, 3) + Math.sin(local * Math.PI) * 0.08; // drop with a little bounce
      m.position.y = m.userData.home.y + (1 - e) * (4 + (i % 5));
      m.visible = local > 0;
    });
    group.rotation.y = t * 0.12 + s.pointer.x * 0.5;
    group.rotation.x = 0.35 + s.pointer.y * 0.15;
  }
  const hoverables = [bowl, base]; toppings.forEach((m) => m.traverse((o) => { if (o.isMesh) { o.userData.label = m.userData.label; hoverables.push(o); } }));
  return { group, update, onEnter, hoverables };
}
