import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { setQuality } from './materials.js';

// Film grain + vignette + a chromatic split that kicks in on fast scrolls.
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uSplit: { value: 0 }, uGrain: { value: 0.035 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; uniform float uSplit; uniform float uGrain; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)) + uTime) * 43758.5453); }
    void main(){
      vec2 d = (vUv - 0.5) * uSplit;
      vec4 c = texture2D(tDiffuse, vUv);
      c.r = texture2D(tDiffuse, vUv + d).r;
      c.b = texture2D(tDiffuse, vUv - d).b;
      float v = smoothstep(1.15, 0.35, length(vUv - 0.5));
      c.rgb *= mix(0.82, 1.0, v);
      c.rgb += (rnd(vUv * 900.0) - 0.5) * uGrain;
      gl_FragColor = c;
    }`,
};

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    const mobile = matchMedia('(max-width: 720px)').matches || navigator.maxTouchPoints > 1;
    const lowPower = mobile || (navigator.hardwareConcurrency || 8) <= 4;
    this.mobile = mobile;
    this.quality = lowPower ? 'medium' : 'high';
    setQuality(this.quality);

    const r = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance', alpha: false });
    r.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 1.75));
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.95;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.transmissionResolutionScale = lowPower ? 0.5 : 0.8;
    this.renderer = r;

    this.scene = new THREE.Scene();
    this.bg = new THREE.Color('#1a0a17');
    this.scene.background = this.bg;
    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
    this.camera.position.set(0, 2, 12);
    this.lookAt = new THREE.Vector3(0, 1.6, 0);

    const hemi = new THREE.HemisphereLight('#fff6ea', '#7a2950', 0.45);
    const key = new THREE.DirectionalLight('#fff3e0', 1.5); key.position.set(4, 8, 6);
    const rimR = new THREE.PointLight('#ec3b3a', 30, 30); rimR.position.set(-6, 3, -4);
    const rimP = new THREE.PointLight('#843a7c', 26, 30); rimP.position.set(6, 1, -5);
    this.camLights = new THREE.Group();
    this.camLights.add(hemi, key, rimR, rimP);
    this.scene.add(this.camLights);

    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), lowPower ? 0.14 : 0.22, 0.45, 0.97);
    this.composer.addPass(this.bloom);
    this.finish = new ShaderPass(FinishShader);
    this.composer.addPass(this.finish);
    this.composer.addPass(new OutputPass());

    this.stations = [];
    this.raycaster = new THREE.Raycaster();
    this.running = true;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // keep objects a similar size on portrait screens
    this.camera.fov = w / h < 0.8 ? 46 : w / h < 1.2 ? 38 : 32;
    this.camera.updateProjectionMatrix();
  }

  add(station) { this.stations.push(station); this.scene.add(station.group); return station; }

  render(t) {
    this.finish.uniforms.uTime.value = t % 100;
    this.composer.render();
  }
}
