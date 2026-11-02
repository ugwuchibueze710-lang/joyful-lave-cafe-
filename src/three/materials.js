import * as THREE from 'three';

// Shared physically-based materials. Colors come from real ingredients / the
// cafe's own palette (logo red #EC3B3A, cup purple #843A7C, lemon #FDE31A).

export const BRAND = {
  red: new THREE.Color('#ec3b3a'),
  purple: new THREE.Color('#843a7c'),
  lemon: new THREE.Color('#fde31a'),
  cream: new THREE.Color('#fff9f1'),
};

let quality = 'high';
export function setQuality(q) { quality = q; }

/** Clear glass/plastic — used ONLY for things that are clear in real life:
 *  iced-drink cups, chiller cups, the acai bowl, juice cooler bottles. */
export function glass(opts = {}) {
  const m = new THREE.MeshPhysicalMaterial({
    color: opts.color ?? 0xffffff,
    metalness: 0,
    roughness: opts.roughness ?? 0.04,
    transmission: 1,
    thickness: opts.thickness ?? 0.6,
    ior: opts.ior ?? 1.5,
    dispersion: quality === 'high' ? (opts.dispersion ?? 4) : 0,
    iridescence: opts.iridescence ?? 0.15,
    iridescenceIOR: 1.3,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    specularIntensity: 1,
    envMapIntensity: opts.env ?? 1.4,
    attenuationColor: new THREE.Color(opts.tint ?? 0xffffff),
    attenuationDistance: opts.attenuation ?? 3,
    side: opts.side ?? THREE.FrontSide,
    transparent: false,
  });
  return m;
}

export function solid(color, opts = {}) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: opts.roughness ?? 0.55, metalness: 0,
    clearcoat: opts.clearcoat ?? 0, clearcoatRoughness: 0.3,
    sheen: opts.sheen ?? 0, sheenColor: new THREE.Color(opts.sheenColor ?? 0xffffff), sheenRoughness: 0.6,
    map: opts.map ?? null, bumpMap: opts.bumpMap ?? null, bumpScale: opts.bumpScale ?? 1,
    side: opts.side ?? THREE.FrontSide,
    emissive: opts.emissive ?? 0x000000, emissiveIntensity: opts.emissiveIntensity ?? 1,
    transmission: opts.transmission ?? 0, thickness: opts.thickness ?? 0,
    vertexColors: !!opts.vertexColors,
  });
}

/** Wet fruit (strawberry, blueberry): glossy with subsurface-ish sheen. */
export function fruit(color, opts = {}) {
  return solid(color, { roughness: opts.roughness ?? 0.28, clearcoat: 0.7, sheen: 0.4, sheenColor: opts.sheen ?? 0xffffff, ...opts });
}

/**
 * Liquid that sloshes: fragments above a tilting surface plane are discarded and
 * back faces are drawn as the liquid's top surface. `uniforms.plane` = (nx,ny,nz,d)
 * in the mesh's local space; `uniforms.fill` = surface height.
 */
export function liquid({ bottom, top, surface, height = 1, opacity = 1 }) {
  const uniforms = {
    uFill: { value: 0.5 },
    uTilt: { value: new THREE.Vector2(0, 0) },
    uBottom: { value: new THREE.Color(bottom) },
    uTop: { value: new THREE.Color(top) },
    uSurface: { value: new THREE.Color(surface ?? top) },
    uHeight: { value: height },
    uTime: { value: 0 },
  };
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.18, clearcoat: 0.6, side: THREE.DoubleSide, transparent: opacity < 1, opacity });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLocal = position;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vLocal; uniform float uFill; uniform vec2 uTilt; uniform vec3 uBottom; uniform vec3 uTop; uniform vec3 uSurface; uniform float uHeight; uniform float uTime;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float wave = sin(vLocal.x * 7.0 + uTime * 2.2) * 0.012 + sin(vLocal.z * 6.0 - uTime * 1.7) * 0.01;
        float surfaceY = uFill + vLocal.x * uTilt.x + vLocal.z * uTilt.y + wave;
        if (vLocal.y > surfaceY) discard;
        float h = clamp(vLocal.y / uHeight, 0.0, 1.0);
        vec3 body = mix(uBottom, uTop, smoothstep(0.0, 1.0, h));
        diffuseColor.rgb = gl_FrontFacing ? body : uSurface;`);
  };
  m.userData.uniforms = uniforms;
  m.customProgramCacheKey = () => 'liquid';
  return m;
}

export function emissive(color, intensity = 2) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), toneMapped: false });
}
