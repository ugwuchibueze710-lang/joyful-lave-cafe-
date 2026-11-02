import * as THREE from 'three';
import { solid, emissive } from '../materials.js';
import { slats, glow } from '../textures.js';

// VISIT — the store itself, from their photos: the red slat wall, white
// floating shelves of colourful mugs, and the glowing white "JOY" sign.

function mug(color) {
  const g = new THREE.Group();
  const m = solid(color, { roughness: 0.22, clearcoat: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.5, 32), m);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(0.235, 24), solid('#2a1a12')); inside.rotation.x = -Math.PI / 2; inside.position.y = 0.251;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 10, 20, Math.PI), m); handle.position.x = 0.26; handle.rotation.z = -Math.PI / 2;
  g.add(body, inside, handle);
  return g;
}

function neonJOY() {
  const g = new THREE.Group();
  const tube = emissive('#ffffff', 2.6);
  const r = 0.07;
  const add = (pts, closed = false) => g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), 120, r, 12, closed), tube));
  const V = (x, y) => new THREE.Vector3(x, y, 0);
  // J
  add([V(-1.55, 1.0), V(-1.55, 0.05), V(-1.75, -0.45), V(-2.1, -0.45), V(-2.3, -0.15)]);
  // O
  add(Array.from({ length: 24 }, (_, i) => { const a = (i / 24) * Math.PI * 2; return V(Math.sin(a) * 0.62, Math.cos(a) * 0.78 + 0.27, 0); }), true);
  // Y
  add([V(0.95, 1.0), V(1.45, 0.3), V(1.95, 1.0)]);
  add([V(1.45, 0.3), V(1.45, -0.5)]);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), new THREE.MeshBasicMaterial({ map: glow('#ffdfe0'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.position.set(-0.1, 0.25, -0.05);
  g.add(halo);
  g.traverse((o) => (o.userData.label = 'The JOY sign at the counter'));
  return g;
}

export function createVisit() {
  const group = new THREE.Group();
  const wallTex = slats(); wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(14, 22);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 36), solid('#ffffff', { map: wallTex, roughness: 0.6 }));
  wall.position.set(0, 4, -1.2);
  group.add(wall);

  const colors = ['#d9251f', '#2b5fb4', '#f5c400', '#3f9b3a', '#f07a12', '#ffffff', '#843a7c'];
  const mugs = [];
  [1.2, 2.9, 4.6].forEach((y, row) => {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.12, 0.8), solid('#ffffff', { roughness: 0.4 }));
    shelf.position.set(0.4, y, -0.75); group.add(shelf);
    for (let i = 0; i < 8; i++) {
      if (row === 1 && i > 2 && i < 6) continue; // the JOY sign sits here
      const m = mug(colors[(i + row * 3) % colors.length]);
      m.position.set(-2.8 + i * 0.85, y + 0.31, -0.7 + (i % 2) * 0.1);
      m.rotation.y = (i % 3) * 0.6 - 0.4;
      m.traverse((o) => (o.userData.label = 'Mug wall'));
      m.userData.base = m.position.clone(); m.userData.ph = Math.random() * 6;
      mugs.push(m); group.add(m);
    }
  });
  const joy = neonJOY(); joy.scale.setScalar(0.62); joy.position.set(0.5, 3.35, -0.55);
  group.add(joy);
  const light = new THREE.PointLight('#ffe9e9', 14, 8); light.position.set(0.5, 3.4, 0.6); group.add(light);

  function update(t, dt, s) {
    const flicker = 0.92 + Math.sin(t * 23) * 0.02 + (Math.random() < 0.01 ? -0.4 : 0);
    light.intensity = 14 * flicker;
    mugs.forEach((m, i) => { m.rotation.y += Math.sin(t + m.userData.ph) * 0.0015 + s.pointerVel.x * 0.05; m.position.y = m.userData.base.y + Math.max(0, Math.sin(t * 2 + m.userData.ph) - 0.98) * 2 * 0.06; });
    group.rotation.y = s.pointer.x * 0.12; group.rotation.x = s.pointer.y * 0.05;
  }
  const hoverables = []; group.traverse((o) => o.isMesh && o.userData.label && hoverables.push(o));
  return { group, update, hoverables };
}
