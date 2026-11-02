import * as THREE from 'three';
import { gsap } from 'gsap';

// ─────────────────────────────────────────────────────────────────────────────
// LIVING PHOTOGRAPHS — every visual is one of the cafe's real photos.
// Each photo has an AI depth map (Depth Anything V2 Small, Apache-2.0,
// generated offline) which turns it into a real 3D surface. On top of that:
//   • the cursor is a warm light — the food is relit from its depth normals
//   • cinematic depth-of-field that racks focus to wherever you point
//   • the camera pushes in and orbits as you scroll (true parallax)
//   • steam rising off hot drinks, dust drifting through the light
//   • photos pour into each other with a liquid transition
// The photo dissolves into the cafe's brand colour instead of sitting in a box.
// ─────────────────────────────────────────────────────────────────────────────

export const STACKED = '(max-width: 760px), (max-aspect-ratio: 1/1)';

const P = (n) => ({ src: `/photos/${n}.webp`, depth: `/photos/${n}.depth.jpg` });
// focus = which part of the photo to keep when cropping (0..1, y from top)
// steam = [x, y, strength] source in photo space for hot drinks
export const SHOTS = {
  hero: { ...P('acai-bowl-booth'), side: 1, bg: ['#ec3b3a', '#7d0d13'], focus: [0.5, 0.6] },
  java: { ...P('mocha-happy-sleeve'), side: 1, bg: ['#ead6bf', '#8f6847'], focus: [0.52, 0.58], steam: [0.53, 0.25, 1] },
  acai: { ...P('menu-happy-acai'), side: -1, bg: ['#fde35a', '#9c7400'], focus: [0.5, 0.5] },
  juice: { ...P('main-squeeze'), side: 1, bg: ['#f6a73a', '#8a3a06'], focus: [0.5, 0.55] },
  breakfast: { ...P('menu-avocado-toast'), side: -1, bg: ['#f4e3cc', '#a77c4f'], focus: [0.45, 0.5] },
  lunch: { ...P('summer-berry'), side: 1, bg: ['#f2a49a', '#8f2a2a'], focus: [0.5, 0.45] },
  chillers: { ...P('menu-vanilla-chai-chiller'), side: -1, bg: ['#843a7c', '#1c0519'], focus: [0.5, 0.36] },
  menu: { ...P('acai-bowl-booth'), side: 1, bg: ['#ec3b3a', '#7d0d13'], hidden: true },
  story: { ...P('acai-bowl-booth'), side: 1, bg: ['#ec3b3a', '#7d0d13'], hidden: true },
  visit: { ...P('avocado-toast-mug-shelves'), side: 1, bg: ['#3a1230', '#070205'], focus: [0.5, 0.3] },
};
// the four juices the Juice chapter can pour between (+ backdrop tint)
export const JUICES = {
  'main-squeeze': { ...P('main-squeeze'), bg: ['#f6a73a', '#8a3a06'] },
  'fruit-root': { ...P('fruit-root'), bg: ['#c2304f', '#3d0614'] },
  'old-faithful': { ...P('old-faithful'), bg: ['#e0703c', '#5a1a08'] },
  'joyous-jade': { ...P('joyous-jade'), bg: ['#8fc24a', '#244a0c'] },
};

const NOISE = /* glsl */ `
  vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;} vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
  vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
  float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
    vec2 i=floor(v+dot(v,C.yy)); vec2 x0=v-i+dot(i,C.xx); vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
    vec4 x12=x0.xyxy+C.xxzz; x12.xy-=i1; i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
    vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.); m=m*m; m=m*m;
    vec3 x=2.*fract(p*C.www)-1.; vec3 h=abs(x)-.5; vec3 ox=floor(x+.5); vec3 a0=x-ox;
    m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
    vec3 g; g.x=a0.x*x0.x+h.x*x0.y; g.yz=a0.yz*x12.xz+h.yz*x12.yw; return 130.*dot(m,g);}
  float fbm(vec2 p){ float f=0.; float a=.5; for(int i=0;i<5;i++){ f+=a*snoise(p); p*=2.03; a*=.5; } return f; }
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
`;

const COVER = /* glsl */ `
  // frame uv (0..1, y up) -> photo uv (y up) with cover-crop around a focus point
  vec2 cover(vec2 uv, float frameAsp, float texAsp, vec2 focus){
    vec2 s = frameAsp > texAsp ? vec2(1., texAsp / frameAsp) : vec2(frameAsp / texAsp, 1.);
    vec2 f = vec2(focus.x, 1. - focus.y);
    return (uv - .5) * s + clamp(f, s * .5, 1. - s * .5);
  }
`;

const VS = /* glsl */ `
  uniform sampler2D dA; uniform sampler2D dB; uniform float uMix; uniform float uRelief; uniform float uZoom;
  uniform float uFrameAsp; uniform float aspA; uniform float aspB; uniform vec2 fA; uniform vec2 fB;
  varying vec2 vUv; varying vec3 vWorld;
  ${COVER}
  void main(){
    vUv = uv;
    vec2 zu = (uv - .5) / uZoom + .5;
    float a = texture2D(dA, cover(zu, uFrameAsp, aspA, fA)).r;
    float b = texture2D(dB, cover(zu, uFrameAsp, aspB, fB)).r;
    float d = mix(a, b, smoothstep(.3, .7, uMix));
    vec3 p = position;
    p.z += (d - .35) * uRelief;
    vec4 w = modelMatrix * vec4(p, 1.);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FS = /* glsl */ `
  uniform sampler2D tA; uniform sampler2D tB; uniform sampler2D dA; uniform sampler2D dB;
  uniform float uMix; uniform float uTime; uniform vec2 uMouse; uniform float uHover; uniform vec2 uPar;
  uniform float uFrameAsp; uniform float aspA; uniform float aspB; uniform vec2 fA; uniform vec2 fB;
  uniform float uReveal; uniform float uVel; uniform float uZoom; uniform float uSide; uniform float uStacked;
  uniform vec3 sA; uniform vec3 sB; uniform vec2 uTexel; uniform vec3 uEdgeCol;
  varying vec2 vUv; varying vec3 vWorld;
  ${NOISE}
  ${COVER}

  // depth-of-field: blur by distance from the focus depth (mip bias = cheap bokeh)
  vec3 dof(sampler2D t, vec2 pu, float blur){
    vec3 c = texture2D(t, pu, blur).rgb * .4;
    vec2 o = vec2(.0018, .0024) * blur;
    c += texture2D(t, pu + vec2( o.x,  o.y), blur).rgb * .15;
    c += texture2D(t, pu + vec2(-o.x,  o.y), blur).rgb * .15;
    c += texture2D(t, pu + vec2( o.x, -o.y), blur).rgb * .15;
    c += texture2D(t, pu + vec2(-o.x, -o.y), blur).rgb * .15;
    return c;
  }

  vec3 living(sampler2D t, sampler2D dm, vec2 fuv, float asp, vec2 f, vec2 off, vec3 steam, out float depth){
    vec2 c = cover(fuv, uFrameAsp, asp, f);
    float d = texture2D(dm, c).r;
    vec2 pu = c + (d - .45) * uPar * .028 + off;
    depth = d;

    // focus: subject by default, racks to the cursor while hovering
    vec2 mc = cover((uMouse - .5) / uZoom + .5, uFrameAsp, asp, f);
    float focusD = mix(.82, texture2D(dm, mc).r, uHover);
    float blur = clamp(abs(d - focusD) * 7. - .35, 0., 3.2);
    vec3 col = dof(t, pu, blur);

    // relight: normals from the depth map, warm light at the cursor
    float dx = texture2D(dm, c + vec2(uTexel.x, 0.)).r - texture2D(dm, c - vec2(uTexel.x, 0.)).r;
    float dy = texture2D(dm, c + vec2(0., uTexel.y)).r - texture2D(dm, c - vec2(0., uTexel.y)).r;
    vec3 n = normalize(vec3(-dx * 9., -dy * 9., 1.));
    vec3 L = normalize(vec3((uMouse - fuv) * vec2(uFrameAsp, 1.) * 1.6, .55));
    float diff = max(dot(n, L), 0.);
    vec3 H = normalize(L + vec3(0., 0., 1.));
    float spec = pow(max(dot(n, H), 0.), 42.) * smoothstep(.25, .9, d);
    float near = 1. - smoothstep(0., .9, length((uMouse - fuv) * vec2(uFrameAsp, 1.)));
    float lit = uHover * near;
    col *= mix(1., .78 + .42 * diff, lit * .9 + .15);
    col += vec3(1., .9, .75) * spec * (.25 + lit * .9);

    // steam rising off hot drinks
    if (steam.z > 0.) {
      vec2 sp = vec2(steam.x, 1. - steam.y);
      vec2 q = (c - sp) * vec2(asp, 1.);
      float rise = max(q.y, 0.);
      float w = .07 + rise * .35;
      float sway = fbm(vec2(q.y * 2.4 - uTime * .35, uTime * .1)) * .12 * rise * 4.;
      float s = fbm(vec2((q.x + sway) * 9., q.y * 4. - uTime * .55));
      float wisp = smoothstep(.0, .55, s + .35) * exp(-abs(q.x + sway) / w) * smoothstep(0., .03, rise) * exp(-rise * 4.5);
      col += vec3(1.) * wisp * .42 * steam.z;
    }
    return col;
  }

  void main(){
    vec2 uv = vUv;
    vec2 fuv = (uv - .5) / uZoom + .5;

    // ripple + liquid pour
    vec2 m = (uv - uMouse) * vec2(uFrameAsp, 1.);
    float r = length(m);
    vec2 off = normalize(m + 1e-5) * sin(r * 70. - uTime * 7.) * exp(-r * 10.) * uVel * .003;
    float n1 = fbm(uv * 2.2 + vec2(0., uTime * .04));
    float edge = uMix * 1.6 - .3 + n1 * .38 - (1. - uv.y) * .12;
    float t = smoothstep(0., .14, edge);
    float mid = 1. - abs(uMix * 2. - 1.);
    vec2 flow = vec2(n1, fbm(uv * 2.2 + 7.3)) * .07 * mid;

    float da, db;
    vec3 ca = living(tA, dA, fuv, aspA, fA, off - flow, sA, da);
    vec3 cb = living(tB, dB, fuv, aspB, fB, off + flow, sB, db);
    vec3 col = mix(ca, cb, t);
    col += smoothstep(.1, 0., abs(edge - .05)) * .14 * mid;   // wet edge of the pour
    float depth = mix(da, db, t);

    // dust drifting through the light
    vec2 g = uv * vec2(uFrameAsp, 1.) * 26.; g.y += uTime * .25; g.x += sin(uTime * .2 + floor(g.y)) * .5;
    vec2 id = floor(g); vec2 fp = fract(g) - .5;
    float h = hash(id);
    float mote = smoothstep(.06, .0, length(fp - (vec2(hash(id + 3.), hash(id + 7.)) - .5) * .6)) * step(.86, h);
    col += mote * .35 * (.4 + uHover * .6) * smoothstep(.6, 1., depth + .3);

    // cinematic grade: lift blacks a touch, warm highlights, vignette, grain
    col = pow(col, vec3(.96)); col *= vec3(1.03, 1., .97);
    col *= 1. - smoothstep(.4, 1.05, length((uv - .5) * vec2(1.05, 1.15))) * .25;
    col += (hash(uv * 900. + uTime) - .5) * .028;

    // dissolve into the brand colour (organic edge, no box)
    float inner = uStacked > .5 ? uv.y : (uSide > 0. ? uv.x : 1. - uv.x);
    float edgeN = fbm(uv * 3. + uTime * .03) * .08;
    float fade = smoothstep(.0, .34, inner + edgeN);
    float outer = uStacked > .5 ? 1. : smoothstep(0., .04, uSide > 0. ? 1. - uv.x : uv.x);
    float tb = smoothstep(0., .05, uv.y) * smoothstep(0., .05, 1. - uv.y);
    if (uStacked > .5) tb = smoothstep(0., .05, 1. - uv.y);
    float rv = smoothstep(0., .18, uReveal * 1.35 - .2 + n1 * .3 + (uSide > 0. ? 1. - uv.x : uv.x) * .15);
    float a = fade * outer * tb * rv;
    gl_FragColor = vec4(col, a);
    #include <colorspace_fragment>
  }
`;

const BACK_FS = /* glsl */ `
  uniform vec3 uC; uniform vec3 uE; uniform float uAsp; uniform float uTime; uniform vec2 uGlow; uniform vec3 uGlowCol;
  varying vec2 vUv;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main(){
    vec2 p = vUv - vec2(.5, .55); p.x *= uAsp;
    vec3 c = mix(uC, uE, smoothstep(.05, 1.05, length(p)));
    vec2 g = (vUv - uGlow) * vec2(uAsp, 1.);
    c += uGlowCol * .22 * (1. - smoothstep(0., .9, length(g)));      // light spilling from the photo
    c += (hash(vUv * 900. + uTime) - .5) * .022;
    gl_FragColor = vec4(c, 1.);
    #include <colorspace_fragment>
  }
`;

export class PhotoWorld {
  constructor(canvas) {
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    this.camera.position.z = 10;

    const loader = new THREE.TextureLoader();
    this.tex = {};
    const cache = {};
    const load = (url, color) => (cache[url] ??= new Promise((res) => loader.load(url, (t) => {
      t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 8; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
      res(t);
    }, undefined, () => res(null))));
    this.loadShot = (key, s) => Promise.all([load(s.src, true), load(s.depth, false)]).then(([img, dep]) => {
      this.tex[key] = { img, dep, asp: img ? img.image.width / img.image.height : 1, texel: dep ? [1 / dep.image.width, 1 / dep.image.height] : [0.002, 0.002], col: img ? avgColor(img.image) : new THREE.Color('#fff') };
    });
    Object.entries(JUICES).forEach(([k, s]) => this.loadShot('juice:' + k, s));
    this.ready = Promise.all(Object.entries(SHOTS).map(([k, s]) => Promise.all([load(s.src, true), load(s.depth, false)]).then(([img, dep]) => {
      this.tex[k] = { img, dep, asp: img ? img.image.width / img.image.height : 1, texel: dep ? [1 / dep.image.width, 1 / dep.image.height] : [0.002, 0.002], col: img ? avgColor(img.image) : new THREE.Color('#fff') };
    })));

    this.bgC = new THREE.Color('#1d0b19'); this.bgE = new THREE.Color('#050104'); this.glowCol = new THREE.Color(0, 0, 0);
    this.back = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { uC: { value: this.bgC }, uE: { value: this.bgE }, uAsp: { value: 1 }, uTime: { value: 0 }, uGlow: { value: new THREE.Vector2(.7, .5) }, uGlowCol: { value: this.glowCol } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, .9999, 1.); }',
      fragmentShader: BACK_FS, depthWrite: false, depthTest: false,
    }));
    this.back.frustumCulled = false; this.back.renderOrder = -10;
    this.scene.add(this.back);

    const blank = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1); blank.needsUpdate = true;
    this.u = {
      tA: { value: blank }, tB: { value: blank }, dA: { value: blank }, dB: { value: blank },
      aspA: { value: 1 }, aspB: { value: 1 }, fA: { value: new THREE.Vector2(.5, .5) }, fB: { value: new THREE.Vector2(.5, .5) },
      sA: { value: new THREE.Vector3() }, sB: { value: new THREE.Vector3() }, uTexel: { value: new THREE.Vector2(.002, .002) },
      uMix: { value: 0 }, uTime: { value: 0 }, uMouse: { value: new THREE.Vector2(.5, .5) }, uHover: { value: 0 }, uPar: { value: new THREE.Vector2() },
      uFrameAsp: { value: 1 }, uReveal: { value: 0 }, uVel: { value: 0 }, uZoom: { value: 1 }, uRelief: { value: 0.5 },
      uSide: { value: 1 }, uStacked: { value: 0 }, uEdgeCol: { value: new THREE.Color() },
    };
    this.frame = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 220, 220), new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false }));
    this.scene.add(this.frame);

    // the real logo, poured in for the opening
    this.logoU = { t: { value: blank }, uP: { value: 0 }, uTime: { value: 0 } };
    this.logo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({
      uniforms: this.logoU, transparent: true, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: `uniform sampler2D t; uniform float uP; uniform float uTime; varying vec2 vUv; ${NOISE}
        void main(){ float n = fbm(vUv * 2.6 + uTime * .15); float e = uP * 1.5 - .25 + n * .32 + (1. - vUv.y) * .1;
          vec2 o = vec2(n, fbm(vUv * 2.6 + 4.)) * .06 * (1. - uP);
          vec4 c = vec4(texture2D(t, vUv + o * 1.03).r, texture2D(t, vUv + o).g, texture2D(t, vUv + o * .97).b, texture2D(t, vUv + o).a);
          float a = smoothstep(0., .07, e);
          c.rgb += smoothstep(.07, 0., abs(e - .035)) * vec3(1., .86, .25) * (1. - uP * .7);
          gl_FragColor = vec4(c.rgb, c.a * a);
          #include <colorspace_fragment>
        }`,
    }));
    this.logo.visible = false; this.scene.add(this.logo);
    loader.load('/photos/joyfull-logo.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; this.logoU.t.value = t; this.logoAsp = t.image.width / t.image.height; this.sizeLogo(); });

    this.ptr = new THREE.Vector2(); this.ptrS = new THREE.Vector2(); this.ptrVel = 0; this.hasPtr = false;
    addEventListener('pointermove', (e) => {
      const nx = (e.clientX / innerWidth) * 2 - 1, ny = -(e.clientY / innerHeight) * 2 + 1;
      this.ptrVel = Math.min(1, this.ptrVel + Math.hypot(nx - this.ptr.x, ny - this.ptr.y) * 3);
      this.ptr.set(nx, ny); this.hasPtr = true;
    }, { passive: true });
    // on touch, gently drift the light so phones still feel alive
    this.touch = matchMedia('(hover: none)').matches;

    this.active = 'hero'; this.next = null; this.blend = 0; this.local = {}; this.frameVis = 1;
    this.sections = [];
    this.raycaster = new THREE.Raycaster();
    this.layout(); this.measure();
    addEventListener('resize', () => { this.layout(); this.measure(); this.scroll(scrollY, 0); });
  }

  layout() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.back.material.uniforms.uAsp.value = w / h;
    this.stacked = matchMedia(STACKED).matches;
    this.vh = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.vw = this.vh * this.camera.aspect;
    // the photo region: full height on desktop, top 64% when stacked
    this.fw = this.stacked ? this.vw * 1.08 : this.vw * 0.64;
    this.fh = this.stacked ? this.vh * 0.66 : this.vh * 1.1;
    this.frame.scale.set(this.fw, this.fh, 1);
    this.u.uFrameAsp.value = this.fw / this.fh;
    this.u.uStacked.value = this.stacked ? 1 : 0;
    this.sizeLogo();
  }
  sizeLogo() { if (!this.logoAsp || !this.vh) return; const s = Math.min(this.vh * 0.46, this.vw * 0.62); this.logo.scale.set(s, s / this.logoAsp, 1); }

  framePos(key) {
    const s = SHOTS[key] ?? SHOTS.hero;
    if (this.stacked) return new THREE.Vector3(0, this.vh * 0.5 - this.fh * 0.5 + this.vh * 0.02, 0);
    return new THREE.Vector3(Math.sign(s.side) * (this.vw * 0.5 - this.fw * 0.5 + this.vw * 0.02), 0, 0);
  }

  measure() {
    const raw = [...document.querySelectorAll('[data-station]')].map((el) => { const r = el.getBoundingClientRect(); return { key: el.dataset.station, top: r.top + scrollY, h: r.height }; });
    this.sections = raw.reduce((acc, s) => { const l = acc[acc.length - 1]; if (l && l.key === s.key) l.h = s.top + s.h - l.top; else acc.push({ ...s }); return acc; }, []);
  }

  scroll(y, vel) {
    this.scrollVel = vel || 0;
    const c = y + innerHeight * 0.5, S = this.sections;
    if (!S.length) return;
    let i = 0;
    for (let k = 0; k < S.length; k++) if (c >= S[k].top + S[k].h * 0.5) i = k;
    const cur = S[i], nxt = S[i + 1];
    let b = 0;
    if (nxt && c >= cur.top + cur.h * 0.5) b = THREE.MathUtils.clamp((c - (cur.top + cur.h * 0.5)) / ((nxt.top + nxt.h * 0.5) - (cur.top + cur.h * 0.5)), 0, 1);
    this.active = cur.key; this.next = nxt?.key ?? null;
    this.blend = THREE.MathUtils.smoothstep(b, 0.2, 0.8);
    S.forEach((s) => (this.local[s.key] = THREE.MathUtils.clamp((c - s.top) / s.h, 0, 1)));
  }

  /** Juice picker: pour the frame from the current juice into another. */
  setJuice(name) {
    const j = JUICES[name]; if (!j || this.juiceName === name) return;
    const prev = this.tex.juice;
    this.juiceName = name;
    this.tex.juice = this.tex['juice:' + name] ?? prev;
    SHOTS.juice.bg = j.bg;
    if (this.active !== 'juice' || this.blend > 0.05) { this.shownA = this.shownB = null; return; }
    // pour: previous juice in slot A, new juice in slot B, animate the mix
    this.pouring = true;
    this.bindTex('A', prev, SHOTS.juice); this.bindTex('B', this.tex.juice, SHOTS.juice);
    gsap.fromTo(this.u.uMix, { value: 0 }, { value: 1, duration: 1.4, ease: 'power2.inOut', onComplete: () => { this.pouring = false; this.shownA = this.shownB = null; this.u.uMix.value = 0; } });
  }

  bindTex(slot, t, s) {
    if (!t || !t.img) return;
    this.u['t' + slot].value = t.img; this.u['d' + slot].value = t.dep ?? t.img;
    this.u['asp' + slot].value = t.asp; this.u['f' + slot].value.set(...(s.focus ?? [0.5, 0.5]));
    this.u['s' + slot].value.set(...(s.steam ?? [0, 0, 0]));
    if (slot === 'A') this.u.uTexel.value.set(...t.texel);
  }

  bind(slot, key) {
    const t = this.tex[key]; if (!t || !t.img) return;
    const s = SHOTS[key];
    this.u['t' + slot].value = t.img; this.u['d' + slot].value = t.dep ?? t.img;
    this.u['asp' + slot].value = t.asp; this.u['f' + slot].value.set(...(s.focus ?? [0.5, 0.5]));
    this.u['s' + slot].value.set(...(s.steam ?? [0, 0, 0]));
    if (slot === 'A') this.u.uTexel.value.set(...t.texel);
  }

  tick() {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, this._last ? now - this._last : 0.016); this._last = now;
    const t = (this.time = (this.time ?? 0) + dt);
    const u = this.u;
    u.uTime.value = t; this.back.material.uniforms.uTime.value = t; this.logoU.uTime.value = t;

    const A = this.active, B = this.next && this.blend > 0 ? this.next : A;
    if (!this.pouring) {
      if (A !== this.shownA) { this.bind('A', A); this.shownA = A; }
      if (B !== this.shownB) { this.bind('B', B); this.shownB = B; }
      if (!this.introMode) u.uMix.value = A === B ? 0 : this.blend;
    }

    const sa = SHOTS[A] ?? SHOTS.hero, sb = SHOTS[B] ?? sa;
    const pa = this.framePos(A), pb = this.framePos(B);
    const target = pa.lerp(pb, this.blend);
    const vis = (sa.hidden ? this.blend : 1) * (sb.hidden ? 1 - this.blend : 1);
    if (!this.introMode) {
      this.frame.position.x += (target.x - this.frame.position.x) * Math.min(1, dt * 4);
      this.frame.position.y += (target.y - this.frame.position.y) * Math.min(1, dt * 4);
      this.frameVis += (vis - this.frameVis) * Math.min(1, dt * 6);
    }
    const side = Math.sign(this.blend > 0.5 ? sb.side : sa.side) || 1;
    u.uSide.value += (side - u.uSide.value) * Math.min(1, dt * 5);
    const fv = this.introMode ? 1 : this.frameVis;
    this.frame.visible = fv > 0.01;

    // pointer + camera move (push-in and orbit through each chapter)
    if (this.touch && !this.hasPtr) this.ptr.set(Math.sin(t * 0.35) * 0.45, Math.cos(t * 0.27) * 0.3);
    this.ptrS.lerp(this.ptr, Math.min(1, dt * 3.5));
    this.ptrVel *= 0.92; u.uVel.value = this.ptrVel;
    u.uPar.value.set(this.ptrS.x, this.ptrS.y);
    const loc = this.local[A] ?? 0;
    u.uZoom.value = 1.0 + loc * 0.05 + (1 - fv) * 0.12;
    this.frame.rotation.y = this.ptrS.x * 0.09 + (loc - 0.5) * 0.12 * side;
    this.frame.rotation.x = -this.ptrS.y * 0.06 + (this.scrollVel || 0) * 0.0004;
    this.frame.position.z = -1.5 * (1 - fv);

    // light/focus target in frame uv
    let over = false;
    if (this.hasPtr && this.frame.visible) {
      this.raycaster.setFromCamera(this.ptr, this.camera);
      const hit = this.raycaster.intersectObject(this.frame, false)[0];
      if (hit) { over = true; u.uMouse.value.lerp(hit.uv, Math.min(1, dt * 10)); }
    }
    if (this.touch) { over = true; u.uMouse.value.set(0.5 + this.ptrS.x * 0.35, 0.5 + this.ptrS.y * 0.35); }
    u.uHover.value += ((over ? 1 : 0.25) - u.uHover.value) * Math.min(1, dt * 3);
    document.body.classList.toggle('is-hovering-3d', over && !this.touch);

    // backdrop in the brand colour + light spill from the photo
    const tc = new THREE.Color(this.bgOverride ?? sa.bg[0]).lerp(new THREE.Color(this.bgOverride ?? sb.bg[0]), this.blend);
    const te = new THREE.Color(this.bgOverride ? '#050104' : sa.bg[1]).lerp(new THREE.Color(this.bgOverride ? '#050104' : sb.bg[1]), this.blend);
    this.bgC.lerp(tc, Math.min(1, dt * 4)); this.bgE.lerp(te, Math.min(1, dt * 4));
    const ga = this.tex[A]?.col ?? new THREE.Color(0, 0, 0), gb = this.tex[B]?.col ?? ga;
    this.glowCol.copy(ga).lerp(gb, this.blend).multiplyScalar(fv * u.uReveal.value);
    const fp = this.frame.position.clone().project(this.camera);
    this.back.material.uniforms.uGlow.value.set(fp.x * 0.5 + 0.5, fp.y * 0.5 + 0.5);

    const covered = (A === 'menu' || A === 'story') && (this.blend < 0.02 || this.blend > 0.98) && !(B === 'visit' && this.blend > 0.02);
    if (!covered || this.introMode) this.renderer.render(this.scene, this.camera);
  }

  /* ── opening: the real logo pours in out of liquid, then the hero photo ── */
  prepareIntro() {
    this.introMode = true;
    this.bgOverride = '#1d0b19';
    this.u.uReveal.value = 0;
    this.logo.visible = true; this.logoU.uP.value = 0; this.logo.position.set(0, 0.15, 0);
    this.frame.position.copy(this.framePos('hero'));
  }
  introTimeline() {
    const tl = gsap.timeline();
    tl.to(this.logoU.uP, { value: 1, duration: 1.9, ease: 'power2.inOut' }, 0.1);
    tl.to(this.logo.position, { z: 7, duration: 0.9, ease: 'power3.in' }, 2.1);
    tl.add(() => { this.logo.visible = false; this.bgOverride = null; this.bgC.set(SHOTS.hero.bg[0]); this.bgE.set(SHOTS.hero.bg[1]); }, 2.95);
    tl.to(this.u.uReveal, { value: 1, duration: 2.2, ease: 'power2.out' }, 3.0);
    tl.add(() => { this.introMode = false; this.frameVis = 1; }, 3.2);
    return tl;
  }
  skipIntro() {
    gsap.killTweensOf([this.logoU.uP, this.u.uReveal, this.logo.position]);
    this.logo.visible = false; this.bgOverride = null; this.introMode = false; this.frameVis = 1;
    gsap.to(this.u.uReveal, { value: 1, duration: 1.4, ease: 'power2.out' });
  }
}

function avgColor(img) {
  try {
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data; let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    const n = d.length / 4;
    return new THREE.Color(r / n / 255, gg / n / 255, b / n / 255).convertSRGBToLinear();
  } catch { return new THREE.Color(0.5, 0.4, 0.3); }
}
