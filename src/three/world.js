import * as THREE from 'three';
import { gsap } from 'gsap';
import { Stage } from './stage.js';
import { createHero } from './stations/hero.js';
import { createJava } from './stations/java.js';
import { createAcai } from './stations/acai.js';
import { createJuice } from './stations/juice.js';
import { createBreakfast } from './stations/breakfast.js';
import { createLunch } from './stations/lunch.js';
import { createChillers } from './stations/chillers.js';
import { createVisit } from './stations/visit.js';

// Background per station — all drawn from the cafe's palette.
const BG = {
  hero: '#ec3b3a', java: '#f3e1cb', acai: '#fbd94a', juice: '#843a7c', breakfast: '#fbe9d2',
  lunch: '#f2b6a9', chillers: '#5e2457', menu: '#ec3b3a', story: '#ec3b3a', visit: '#1d0b19',
};
// which side the 3D object sits on (opposite the text card)
const SIDE = { hero: 1, java: 1, acai: -1, juice: 1, breakfast: -1, lunch: 1, chillers: -1, visit: 0.9 };
const SPACING = 40;
const SCALE = { hero: 1, java: 1.55, acai: 1.45, juice: 1.4, breakfast: 1.35, lunch: 1.45, chillers: 1.5, visit: 1.25 };

export class World {
  constructor(canvas, labelsEl) {
    this.stage = new Stage(canvas);
    this.labelsEl = labelsEl;
    const st = this.stage;
    this.mobile = st.mobile;

    this.stations = {
      hero: createHero(), java: createJava(), acai: createAcai(), juice: createJuice(),
      breakfast: createBreakfast(), lunch: createLunch(), chillers: createChillers(), visit: createVisit(),
    };
    this.order = ['hero', 'java', 'acai', 'juice', 'breakfast', 'lunch', 'chillers', 'menu', 'story', 'visit'];
    this.anchors = {};
    this.order.forEach((k, i) => {
      const a = new THREE.Vector3(0, 0, -i * SPACING);
      this.anchors[k] = a;
      const s = this.stations[k];
      if (!s) return;
      const side = this.mobile ? 0 : SIDE[k] ?? 0;
      s.group.scale.setScalar(SCALE[k] * (this.mobile ? (k === 'hero' ? 0.62 : 0.72) : 1));
      s.group.position.set(a.x + side * 2.7, a.y + (this.mobile ? (k === 'hero' ? 3.0 : 2.6) : (k === 'hero' ? -0.6 : -1.0)), a.z);
      if (k === 'visit') s.group.position.set(a.x + side * 1.6, a.y - 2.6, a.z - 1);
      st.add(s);
    });

    // travel particles between stations (brand-coloured dust)
    const N = this.mobile ? 500 : 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const pal = ['#fde31a', '#ffffff', '#843a7c', '#ec3b3a'].map((c) => new THREE.Color(c));
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30; pos[i * 3 + 1] = (Math.random() - 0.3) * 16; pos[i * 3 + 2] = -Math.random() * SPACING * 10 + 10;
      const c = pal[i % pal.length]; col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.dust = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false }));
    st.scene.add(this.dust);

    this.state = { pointer: { x: 0, y: 0 }, pointerVel: { x: 0, y: 0 }, scrollVel: 0 };
    this._ptr = new THREE.Vector2(); this._lastPtr = new THREE.Vector2(); this._hasPtr = false;
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.camTarget = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
    this.active = 'hero'; this.blend = 0; this.local = {};
    this.introMode = false;

    this.label = document.createElement('div'); this.label.className = 'label3d'; labelsEl.appendChild(this.label);
    addEventListener('pointermove', (e) => {
      this._ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      this._hasPtr = true; this._mouse = { x: e.clientX, y: e.clientY };
    }, { passive: true });

    this.sections = [];
    this.measure();
    addEventListener('resize', () => this.measure());
    this.setView('hero', 0, true);
  }

  measure() {
    this.sections = [...document.querySelectorAll('[data-station]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { key: el.dataset.station, top: r.top + scrollY, h: r.height };
    });
    // collapse consecutive sections that share a station (menu+reel, story+more)
    this.sections = this.sections.reduce((acc, s) => {
      const last = acc[acc.length - 1];
      if (last && last.key === s.key) last.h = s.top + s.h - last.top; else acc.push({ ...s });
      return acc;
    }, []);
  }

  viewFor(key) {
    const a = this.anchors[key] ?? this.anchors.hero;
    const mob = this.mobile;
    const DIST = { hero: 12.5, java: 12.5, acai: 11, juice: 9.5, breakfast: 11, lunch: 10.5, chillers: 9.5, visit: 7.2 };
    const dist = (DIST[key] ?? 12.5) * (mob ? 1.15 : 1);
    return { pos: new THREE.Vector3(a.x, a.y + (mob ? 3.2 : 2.3), a.z + dist), look: new THREE.Vector3(a.x, a.y + (mob ? 2.4 : 1.3), a.z) };
  }

  setView(key, b = 0, snap = false, next = null) {
    const A = this.viewFor(key), B = next ? this.viewFor(next) : A;
    this.camTarget.pos.copy(A.pos).lerp(B.pos, b);
    this.camTarget.look.copy(A.look).lerp(B.look, b);
    this.camTarget.pos.y += Math.sin(b * Math.PI) * 2.2; // swoop between stations
    this.camTarget.pos.x += Math.sin(b * Math.PI) * (this.order.indexOf(key) % 2 ? -3 : 3);
    if (snap) { this.cam.pos.copy(this.camTarget.pos); this.cam.look.copy(this.camTarget.look); }
  }

  /** Map the page scroll to station + blend. */
  scroll(scrollY, vel) {
    this.state.scrollVel = vel;
    const c = scrollY + innerHeight * 0.5;
    const S = this.sections;
    if (!S.length) return;
    let i = 0;
    for (let k = 0; k < S.length; k++) if (c >= S[k].top + S[k].h * 0.5) i = k;
    const cur = S[i], nxt = S[i + 1];
    let b = 0;
    if (nxt && c >= cur.top + cur.h * 0.5) {
      const from = cur.top + cur.h * 0.5, to = nxt.top + nxt.h * 0.5;
      b = THREE.MathUtils.clamp((c - from) / (to - from), 0, 1);
    }
    if (c < S[0].top + S[0].h * 0.5) b = 0;
    b = THREE.MathUtils.smoothstep(b, 0.3, 0.7);
    this.active = cur.key; this.next = nxt ? nxt.key : null; this.blend = b;
    S.forEach((s) => (this.local[s.key] = THREE.MathUtils.clamp((c - s.top) / s.h, 0, 1)));
    const focus = b > 0.5 && this.next ? this.next : this.active;
    if (focus !== this._focus) { this._focus = focus; this.stations[focus]?.onEnter?.(this.time ?? 0); this.onFocus?.(focus); }
    if (!this.introMode) this.setView(cur.key, b, false, this.next);
  }

  hover() {
    const key = this._focus, s = this.stations[key];
    if (!s || !this._hasPtr || this.mobile) { this.label.classList.remove('is-on'); document.body.classList.remove('is-hovering-3d'); return; }
    const rc = this.stage.raycaster; rc.setFromCamera(this._ptr, this.stage.camera);
    const hit = rc.intersectObjects(s.hoverables, false)[0];
    if (hit && hit.object.userData.label) {
      this.label.textContent = hit.object.userData.label;
      this.label.style.transform = `translate(${this._mouse.x}px, ${this._mouse.y}px) translate(-50%, -150%)`;
      this.label.classList.add('is-on'); document.body.classList.add('is-hovering-3d');
    } else { this.label.classList.remove('is-on'); document.body.classList.remove('is-hovering-3d'); }
  }

  tick() {
    const st = this.stage, now = performance.now() / 1000;
    const dt = Math.min(0.05, this._last ? now - this._last : 0.016); this._last = now;
    const t = this.time = (this.time ?? 0) + dt;
    // pointer smoothing + velocity
    const p = this.state.pointer, pv = this.state.pointerVel;
    const nx = p.x + (this._ptr.x - p.x) * Math.min(1, dt * 5), ny = p.y + (this._ptr.y - p.y) * Math.min(1, dt * 5);
    pv.x = (nx - p.x) / Math.max(dt, 0.001) * 0.05; pv.y = (ny - p.y) / Math.max(dt, 0.001) * 0.05;
    p.x = nx; p.y = ny;
    this.state.scrollVel *= 0.9;

    // camera easing
    const k = Math.min(1, dt * (this.introMode ? 2.5 : 3.2));
    this.cam.pos.lerp(this.camTarget.pos, k); this.cam.look.lerp(this.camTarget.look, k);
    st.camera.position.copy(this.cam.pos);
    st.camera.position.x += p.x * 0.35; st.camera.position.y += p.y * 0.2;
    st.camera.lookAt(this.cam.look);
    st.camLights.position.copy(this.cam.look);

    // background colour follows the journey
    const target = new THREE.Color(this.bgOverride ?? BG[this.active]);
    if (this.next && !this.bgOverride) target.lerp(new THREE.Color(BG[this.next]), this.blend);
    st.bg.lerp(target, Math.min(1, dt * 4));

    // only update/draw stations near the camera (transmission is costly)
    for (const [key, s] of Object.entries(this.stations)) {
      const near = (key === this.active && this.blend < 0.98) || (key === this.next && this.blend > 0.02) || (this.introMode && key === 'hero');
      s.group.visible = near;
      if (near) s.update(t, dt, this.state, this.local[key] ?? 0);
    }
    this.dust.rotation.z = t * 0.01;
    st.finish.uniforms.uSplit.value = Math.min(0.012, Math.abs(this.state.scrollVel) * 0.00012);

    // skip rendering while an opaque section covers the screen
    const covered = (this.active === 'menu' || this.active === 'story') && (this.blend < 0.02 || this.blend > 0.98) && !(this.next === 'visit' && this.blend > 0.02);
    if (!covered) { this.hover(); st.render(t); }
  }

  /* ───────── opening sequence ───────── */
  prepareIntro() {
    this.introMode = true;
    const h = this.stations.hero;
    this.bgOverride = '#1d0b19';
    this.stage.bg.set('#1d0b19');
    h.cupRig.scale.setScalar(0.001);
    h.floaters.forEach((f) => f.scale.setScalar(0.001));
    const w = h.lemon.userData.wedges;
    w.forEach((m) => {
      m.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 10, (Math.random() - 0.2) * 8);
      m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    });
    h.lemon.userData.ring.forEach((r) => r.scale.setScalar(0.001));
    h.lemon.userData.core.scale.setScalar(0.001);
    // camera framed on the lemon, centred
    const lw = new THREE.Vector3(); h.lemon.getWorldPosition(lw);
    this.camTarget.pos.set(lw.x, lw.y, lw.z + 9); this.camTarget.look.copy(lw);
    this.cam.pos.copy(this.camTarget.pos).add(new THREE.Vector3(0, 0, 6)); this.cam.look.copy(lw);
  }

  /** returns a gsap timeline driving the 3D half of the intro */
  introTimeline() {
    const h = this.stations.hero, tl = gsap.timeline();
    const w = h.lemon.userData.wedges;
    w.forEach((m, i) => {
      tl.to(m.position, { x: 0, y: 0, z: 0, duration: 1.5, ease: 'expo.out' }, 0.05 * i);
      tl.to(m.rotation, { x: 0, y: 0, z: 0, duration: 1.6, ease: 'expo.out' }, 0.05 * i);
    });
    tl.to([...h.lemon.userData.ring.map((r) => r.scale), h.lemon.userData.core.scale], { x: 1, y: 1, z: 1, duration: 1.1, ease: 'back.out(1.6)' }, 0.7);
    tl.to(h.lemon.rotation, { y: Math.PI * 2, duration: 2.2, ease: 'power3.inOut' }, 0.4);
    // dive towards the lemon
    const lw = new THREE.Vector3(); h.lemon.getWorldPosition(lw);
    tl.to(this.camTarget.pos, { z: lw.z + 3.2, duration: 1.0, ease: 'power3.in' }, 2.1);
    tl.add('reveal', 2.9);
    tl.add(() => {
      this.bgOverride = null; this.stage.bg.set('#ec3b3a');
      const v = this.viewFor('hero'); this.camTarget.pos.copy(v.pos); this.camTarget.look.copy(v.look);
      this.cam.pos.copy(v.pos).add(new THREE.Vector3(0, -1.5, 4)); this.cam.look.copy(v.look);
      h.lemon.rotation.y = 0;
    }, 'reveal');
    tl.to(h.cupRig.scale, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'back.out(1.4)' }, 'reveal+=0.15');
    h.floaters.forEach((f, i) => tl.to(f.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'back.out(2)' }, `reveal+=${0.35 + i * 0.05}`));
    tl.add(() => { this.introMode = false; }, 'reveal+=1.3');
    return tl;
  }

  skipIntro() {
    const h = this.stations.hero;
    gsap.killTweensOf([h.cupRig.scale, this.camTarget.pos]);
    h.lemon.userData.wedges.forEach((m) => { gsap.killTweensOf([m.position, m.rotation]); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); });
    [...h.lemon.userData.ring, h.lemon.userData.core].forEach((r) => r.scale.setScalar(1));
    h.cupRig.scale.setScalar(1); h.floaters.forEach((f) => { gsap.killTweensOf(f.scale); f.scale.setScalar(1); });
    h.lemon.rotation.y = 0;
    this.bgOverride = null; this.introMode = false;
    this.setView('hero', 0, true);
  }

  setJuice(i) { this.stations.juice.setJuice(i); }
}
