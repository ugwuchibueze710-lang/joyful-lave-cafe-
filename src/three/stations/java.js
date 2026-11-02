import * as THREE from 'three';
import { solid } from '../materials.js';
import { kraftSleeve, speckle } from '../textures.js';

// JAVA — two things from the cafe's own photos: the white cup with the kraft
// sleeve hand-written "happy :)", and the red mug holding a cappuccino.
// Espresso beans (roasted by Mylke Coffee) orbit the pair.

export function beanGeo(r = 0.16) {
  const geo = new THREE.SphereGeometry(r, 36, 24);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.y *= 0.62; v.z *= 1.32;
    if (v.y > 0) v.y -= r * 0.28 * Math.exp(-(v.x * v.x) / (r * r * 0.035)) * Math.max(0, 1 - Math.abs(v.z) / (r * 1.4));
    p.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function paperCup() {
  const g = new THREE.Group();
  const H = 2.5, rb = 0.6, rt = 0.85;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, H, 72, 1, true), solid('#fbfaf7', { roughness: 0.6, side: THREE.DoubleSide }));
  body.position.y = H / 2;
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rt, 0.035, 12, 72), solid('#ffffff', { roughness: 0.5 }));
  lip.rotation.x = Math.PI / 2; lip.position.y = H;
  const base = new THREE.Mesh(new THREE.CircleGeometry(rb, 48), solid('#eeeae2'));
  base.rotation.x = -Math.PI / 2; base.position.y = 0.01;
  // foam with a caramel lattice, like the mocha in their photo
  const foamTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    const gr = x.createRadialGradient(256, 256, 30, 256, 256, 256); gr.addColorStop(0, '#f6e7cf'); gr.addColorStop(1, '#e6c99d');
    x.fillStyle = gr; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = '#c47a2c'; x.lineWidth = 12; x.lineCap = 'round';
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(60 + i * 75, 60); x.bezierCurveTo(30 + i * 75, 200, 110 + i * 75, 330, 50 + i * 75, 460); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const foam = new THREE.Mesh(new THREE.SphereGeometry(rt * 0.97, 48, 16, 0, Math.PI * 2, 0, 0.35), solid('#ffffff', { roughness: 0.75, map: foamTex }));
  foam.position.y = H - rt * 0.97 * Math.cos(0.35) + 0.04;
  const sleeveTex = kraftSleeve('happy :)');
  sleeveTex.wrapS = THREE.RepeatWrapping; sleeveTex.offset.x = 0.5;
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(rt * 0.93 + 0.025, rb + (rt - rb) * 0.25 + 0.025, 1.05, 72, 1, true), solid('#ffffff', { map: sleeveTex, roughness: 0.95 }));
  sleeve.position.y = 1.15;
  sleeve.rotation.y = 0.25;
  g.add(body, lip, base, foam, sleeve);
  g.traverse((o) => { o.userData.label = 'Latte — “happy :)” on every sleeve'; });
  return g;
}

function redMug() {
  const g = new THREE.Group();
  const red = solid('#d9251f', { roughness: 0.18, clearcoat: 1 });
  const R = 0.82, H = 1.25;
  const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(R * 0.82, 0), new THREE.Vector2(R * 0.95, 0.1), new THREE.Vector2(R, H), new THREE.Vector2(R - 0.07, H), new THREE.Vector2(R * 0.87, 0.12), new THREE.Vector2(0, 0.12)];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), red);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.085, 18, 40, Math.PI * 1.25), red);
  handle.position.set(R + 0.02, H * 0.5, 0); handle.rotation.z = -Math.PI * 0.62;
  const cocoa = speckle('#e9d2b0', '#8a5532', 900, [1, 3], 512, 512);
  const foam = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.07, R - 0.07, 0.06, 64), solid('#f4e4ca', { roughness: 0.8, map: cocoa }));
  foam.position.y = H - 0.07;
  g.add(body, handle, foam);
  g.traverse((o) => { o.userData.label = 'Cappuccino — $5'; });
  return g;
}

export function createJava() {
  const group = new THREE.Group();
  const cup = paperCup(); cup.position.set(-0.55, 0, 0); cup.rotation.y = -0.3;
  const mug = redMug(); mug.position.set(1.15, 0, 1.0); mug.rotation.y = -2.4;
  group.add(cup, mug);

  const beanMat = solid('#3a1f10', { roughness: 0.32, clearcoat: 0.7 });
  const beans = new THREE.InstancedMesh(beanGeo(0.15), beanMat, 46);
  beans.userData.label = 'Espresso — roasted by Mylke Coffee, Island KY';
  const seeds = Array.from({ length: 46 }, (_, i) => ({ r: 2.2 + Math.random() * 1.2, a: Math.random() * Math.PI * 2, y: 0.2 + Math.random() * 3.4, sp: 0.15 + Math.random() * 0.25, rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), s: 0.7 + Math.random() * 0.6 }));
  group.add(beans);

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.MeshBasicMaterial({ color: 0x5a2a10, transparent: true, opacity: 0.16, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004; shadow.scale.set(1, 0.55, 1);
  group.add(shadow);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  function update(t, dt, s) {
    seeds.forEach((b, i) => {
      const a = b.a + t * b.sp + s.scrollVel * 0.0006;
      p.set(Math.cos(a) * b.r + s.pointer.x * 0.3, b.y + Math.sin(t + i) * 0.1, Math.sin(a) * b.r * 0.6 - 0.4);
      b.rot.x += dt * 0.6; b.rot.y += dt * 0.4;
      q.setFromEuler(b.rot); sc.setScalar(b.s);
      beans.setMatrixAt(i, m4.compose(p, q, sc));
    });
    beans.instanceMatrix.needsUpdate = true;
    cup.rotation.y = -0.3 + s.pointer.x * 0.35; mug.rotation.y = -2.4 + s.pointer.x * 0.25;
  }
  const hoverables = []; group.traverse((o) => o.isMesh && o.userData.label && hoverables.push(o));
  return { group, update, hoverables };
}
