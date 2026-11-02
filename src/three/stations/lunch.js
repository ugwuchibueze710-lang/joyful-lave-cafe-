import * as THREE from 'three';
import { solid, fruit } from '../materials.js';

// LUNCH — the Summer Berry Splender salad: tender baby spinach, strawberries,
// blueberries, cranberry pecan crunch, Feta & poppy seed vinaigrette, served
// on the colorful dinnerware seen in the cafe's photos.

const rnd = (a, b) => a + Math.random() * (b - a);

function leafGeo() {
  const geo = new THREE.PlaneGeometry(0.55, 0.8, 6, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const w = Math.sin(((y + 0.4) / 0.8) * Math.PI) * 0.28 + 0.01; // leaf outline
    p.setX(i, (x / 0.275) * w);
    p.setZ(i, -(x * x) * 1.6 + Math.sin(y * 6) * 0.03);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createLunch() {
  const group = new THREE.Group();
  // blue ceramic bowl
  const pts = [[0, 0], [0.9, 0], [1.0, 0.05], [1.6, 0.55], [1.9, 0.95], [1.95, 1.0], [1.88, 1.0], [1.55, 0.6], [0.95, 0.12], [0, 0.12]].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 80), solid('#2b5fb4', { roughness: 0.2, clearcoat: 1 }));
  bowl.userData.label = 'Summer Berry Splender Salad — $10.50';
  group.add(bowl);

  const H = (x, z) => 0.35 + Math.max(0, 0.75 - (x * x + z * z) * 0.32);
  const lettuce = new THREE.InstancedMesh(leafGeo(), solid('#2f6e1e', { roughness: 0.35, clearcoat: 0.5, sheen: 0.4, sheenColor: '#9fd17a', side: THREE.DoubleSide }), 90);
  lettuce.userData.label = 'Tender baby spinach';
  const leaves = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < 90; i++) {
    const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * 1.45, x = Math.cos(a) * r, z = Math.sin(a) * r;
    leaves.push({ p: new THREE.Vector3(x, H(x, z) + rnd(-0.1, 0.15), z), r: new THREE.Euler(rnd(-1.3, -0.3), a + rnd(-1, 1), rnd(-0.6, 0.6)), ph: rnd(0, 6) });
  }
  group.add(lettuce);

  const items = [];
  const place = (mesh, n, label, lift = 0.12, spread = 1.25) => {
    for (let i = 0; i < n; i++) {
      const m = mesh.clone(); const a = rnd(0, Math.PI * 2), r = Math.sqrt(Math.random()) * spread;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      m.position.set(x, H(x, z) + lift, z); m.rotation.set(rnd(0, 6), rnd(0, 6), rnd(0, 6));
      m.traverse((o) => (o.userData.label = label));
      m.userData.base = m.position.clone(); items.push(m); group.add(m);
    }
  };
  const straw = new THREE.Group();
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI), fruit('#d61f2c')); sh.scale.set(1, 1.2, 0.7);
  const sf = new THREE.Mesh(new THREE.CircleGeometry(0.22, 20, 0, Math.PI), fruit('#ff8f8f')); sf.scale.y = 1.2; sf.rotation.y = Math.PI;
  straw.add(sh, sf);
  place(straw, 9, 'Sweet strawberries');
  place(new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), fruit('#1f2350', { sheen: '#8a9bd6' })), 16, 'Blueberries');
  place(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, 0.15), solid('#fbfbf6', { roughness: 0.9 })), 14, 'Feta cheese');
  const pecan = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.16, 4, 8), solid('#7a3f1b', { roughness: 0.7 })); pecan.scale.z = 0.6;
  place(pecan, 12, 'Cranberry pecan crunch');
  place(new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), fruit('#9e1030')), 12, 'Cranberry pecan crunch');

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshBasicMaterial({ color: 0x2a0010, transparent: true, opacity: 0.18, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; group.add(shadow);

  function update(t, dt, s) {
    leaves.forEach((l, i) => {
      e.copy(l.r); e.x += Math.sin(t * 1.4 + l.ph) * 0.06 + s.pointerVel.y * 0.4; e.z += s.pointerVel.x * 0.4;
      q.setFromEuler(e); v.copy(l.p);
      lettuce.setMatrixAt(i, m4.compose(v, q, one));
    });
    lettuce.instanceMatrix.needsUpdate = true;
    items.forEach((m, i) => { m.position.y = m.userData.base.y + Math.sin(t * 1.6 + i) * 0.015 - Math.min(0, s.scrollVel * 0.0004); });
    group.rotation.y = t * 0.1 + s.pointer.x * 0.5; group.rotation.x = 0.42 + s.pointer.y * 0.12;
  }
  const hoverables = [bowl, lettuce]; items.forEach((m) => m.traverse((o) => o.isMesh && hoverables.push(o)));
  return { group, update, hoverables };
}
