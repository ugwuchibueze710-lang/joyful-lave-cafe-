import * as THREE from 'three';
import { glass, solid } from '../materials.js';
import { speckle } from '../textures.js';

// CHILLERS — the Vanilla Chai Chiller as photographed on their counter: a clear
// cup of icy blended chai, a swirl of whipped cream and a dusting of spice.

export function createChillers() {
  const group = new THREE.Group();
  const prof = [[0, 0], [0.6, 0], [0.64, 0.05], [0.86, 2.55], [0.9, 2.6], [0.85, 2.6], [0.6, 0.11], [0, 0.11]];
  const cup = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x, y]) => new THREE.Vector2(x, y)), 80), glass({ thickness: 0.12, dispersion: 5, roughness: 0.05 }));
  // icy blended drink: frosty, slightly translucent, with ice-crystal speckle
  const frost = speckle('#d8b48c', '#f6ead9', 1800, [1, 2.5]);
  const drinkGeo = new THREE.CylinderGeometry(0.82, 0.58, 2.42, 64, 1); drinkGeo.translate(0, 1.21 + 0.12, 0);
  const drink = new THREE.Mesh(drinkGeo, solid('#ffffff', { map: frost, roughness: 0.65, sheen: 0.6, sheenColor: '#fff4e2' }));
  drink.scale.setScalar(0.985);

  // whipped cream swirl: a lathe of star-profile rings tapering upward
  const cream = new THREE.Group();
  const creamMat = solid('#f4ece0', { roughness: 0.6, sheen: 0.5, sheenColor: '#ffffff', map: speckle('#fffaf2', '#9a5a2a', 120, [1.5, 3]) });
  for (let i = 0; i < 6; i++) {
    const r = 0.78 * (1 - i / 6.5), geo = new THREE.TorusGeometry(r, 0.2 - i * 0.022, 16, 64);
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) { v.fromBufferAttribute(p, k); const a = Math.atan2(v.y, v.x); const ridge = 1 + Math.sin(a * 8 + Math.atan2(v.z, Math.hypot(v.x, v.y) - r) * 1) * 0.02; p.setXYZ(k, v.x * ridge, v.y * ridge, v.z * 1.15); }
    geo.computeVertexNormals();
    const ring = new THREE.Mesh(geo, creamMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = 2.62 + i * 0.2; ring.rotation.z = i * 0.6;
    cream.add(ring);
  }
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 16), creamMat); tip.position.y = 2.62 + 6 * 0.2; cream.add(tip);
  group.add(drink, cup, cream);
  [cup, drink].forEach((m) => (m.userData.label = 'Vanilla Chai Chiller — $5.50'));
  cream.traverse((o) => (o.userData.label = 'Whipped cream'));

  // spice dust drifting down
  const dustGeo = new THREE.BufferGeometry();
  const N = 400, pos = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) { seeds.push([Math.random() * 6.28, Math.random() * 1.2, Math.random() * 4, 0.2 + Math.random() * 0.4]); }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#8a4a1e', size: 0.035, sizeAttenuation: true }));
  group.add(dust);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), new THREE.MeshBasicMaterial({ color: 0x14000f, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; group.add(shadow);

  function update(t, dt, s) {
    seeds.forEach(([a, r, h, sp], i) => {
      const y = 5.2 - ((t * sp + h) % 4);
      pos[i * 3] = Math.cos(a + t * 0.3) * r * (1 + (5.2 - y) * 0.15);
      pos[i * 3 + 1] = Math.max(y, 2.7 + (1.3 - r) * 0.6);
      pos[i * 3 + 2] = Math.sin(a + t * 0.3) * r;
    });
    dustGeo.attributes.position.needsUpdate = true;
    group.rotation.y = s.pointer.x * 0.6 + t * 0.15;
    cream.rotation.y = -t * 0.2;
    group.rotation.x = s.pointer.y * 0.12;
  }
  const hoverables = []; group.traverse((o) => o.isMesh && o.userData.label && hoverables.push(o));
  return { group, update, hoverables };
}
