import * as THREE from 'three';
import { Assets } from './assets.js';
import * as PX from './pixel.js';
import { tintAll } from './billboard.js';
import { PERF } from './perf.js';
const PRESETS = {
  day:    { bg: 0x7ec8ff, fog: 0xa8ddff, near: 90, far: 420, sun: 0xffe6b8, sunI: 2.0, sky: 0xd6ecff, ground: 0x9a8a5a, hemiI: 1.35, tint: 0xffffff, sunPos: [60, 90, 30], tex: 'day' },
  dusk:   { bg: 0xf0a060, fog: 0xf2b07a, near: 70, far: 380, sun: 0xffb060, sunI: 1.1, sky: 0xf0b080, ground: 0x5a6a3a, hemiI: 0.8, tint: 0xffd9b0, sunPos: [-90, 25, 40], tex: 'dusk' },
  night:  { bg: 0x070b1f, fog: 0x0a1030, near: 25, far: 200, sun: 0x6f84ff, sunI: 0.5, sky: 0x2e3a6c, ground: 0x14141f, hemiI: 0.6, tint: 0x6f7fb8, sunPos: [-40, 70, -60], tex: 'night' },
  under:  { bg: 0x07060c, fog: 0x0a0812, near: 22, far: 75, sun: 0x9a8ab0, sunI: 0.45, sky: 0x6a6088, ground: 0x2a2434, hemiI: 1.0, tint: 0x8a80a0, sunPos: [20, 80, 20], tex: 'night' },
  winter: { bg: 0xb9c9d6, fog: 0xd0dce6, near: 18, far: 140, sun: 0xe8f0ff, sunI: 0.9, sky: 0xcfdcea, ground: 0x8d9db0, hemiI: 0.9, tint: 0xe4ecf4, sunPos: [40, 50, 60], tex: 'winter' },
};
export class Sky {
  constructor(scene) {
    this.scene = scene; this.name = 'day';
    this.sun = new THREE.DirectionalLight(0xfff2c8, 1.6); this.sun.castShadow = PERF.shadows; const s = this.sun.shadow; s.mapSize.set(PERF.shadowSize, PERF.shadowSize); s.camera.near = 1; s.camera.far = 400; s.camera.left = s.camera.bottom = -42; s.camera.right = s.camera.top = 42; s.bias = -0.002; s.normalBias = 0.05;
    scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfe3ff, 0x6a8a4a, 1.0); scene.add(this.hemi);
    scene.background = new THREE.Color(0x7ec8ff); scene.fog = new THREE.Fog(0xa8ddff, 90, 420);
    this.textures = {}; for (const k of ['day', 'dusk', 'night', 'winter']) { const name = k === 'dusk' ? 'skybox_day' : 'skybox_' + k; const t = new THREE.Texture(Assets.src(name, PX.skybox(k))); t.needsUpdate = true; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearFilter; t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; this.textures[k] = t; }
    this.dome = new THREE.Mesh(new THREE.CylinderGeometry(460, 460, 300, 48, 1, true), new THREE.MeshBasicMaterial({ map: this.textures.day, side: THREE.BackSide, fog: false, depthWrite: false })); this.dome.position.y = 300 * 0.2; this.dome.renderOrder = -10; scene.add(this.dome);
    this.cap = new THREE.Mesh(new THREE.CircleGeometry(460, 48), new THREE.MeshBasicMaterial({ color: 0x3f8fe0, side: THREE.BackSide, fog: false, depthWrite: false })); this.cap.rotation.x = Math.PI / 2; this.cap.position.y = 300 * 0.2 + 150; this.cap.renderOrder = -11; scene.add(this.cap);
    this.setPreset('day', true);
  }
  setPreset(name, instant = false) {
    this.name = name; const p = PRESETS[name];
    this.scene.background.setHex(p.bg); this.scene.fog.color.setHex(p.fog); this.scene.fog.near = p.near; this.scene.fog.far = p.far;
    this.sun.color.setHex(p.sun); this.sun.intensity = p.sunI; this.hemi.color.setHex(p.sky); this.hemi.groundColor.setHex(p.ground); this.hemi.intensity = p.hemiI; this.sunDir = new THREE.Vector3(...p.sunPos).normalize();
    this.dome.material.map = this.textures[p.tex]; this.dome.material.color.setHex(name === 'dusk' ? 0xffc090 : 0xffffff); this.dome.material.needsUpdate = true; this.cap.material.color.setHex(name === 'night' ? 0x05081a : name === 'winter' ? 0x8fa3b8 : name === 'dusk' ? 0x5a3a7a : 0x3f8fe0);
    tintAll(p.tint); this.tint = p.tint;
  }
  // blend two presets (k = 0 -> a, 1 -> b); used by the day clock
  mix(a, b, k) {
    const A = PRESETS[a], B = PRESETS[b]; const lc = (x, y) => new THREE.Color(x).lerp(new THREE.Color(y), k); const ln = (x, y) => x + (y - x) * k;
    this.name = k < 0.5 ? a : b; this.scene.background.copy(lc(A.bg, B.bg)); this.scene.fog.color.copy(lc(A.fog, B.fog)); this.scene.fog.near = ln(A.near, B.near); this.scene.fog.far = ln(A.far, B.far);
    this.sun.color.copy(lc(A.sun, B.sun)); this.sun.intensity = ln(A.sunI, B.sunI); this.hemi.color.copy(lc(A.sky, B.sky)); this.hemi.groundColor.copy(lc(A.ground, B.ground)); this.hemi.intensity = ln(A.hemiI, B.hemiI);
    this.sunDir = new THREE.Vector3(...A.sunPos).lerp(new THREE.Vector3(...B.sunPos), k).normalize();
    const tex = this.textures[k < 0.5 ? A.tex : B.tex]; if (this.dome.material.map !== tex) { this.dome.material.map = tex; this.dome.material.needsUpdate = true; }
    this.dome.material.color.copy(lc(a === 'dusk' ? 0xffc090 : 0xffffff, b === 'dusk' ? 0xffc090 : 0xffffff)); const capC = n => n === 'night' ? 0x05081a : n === 'winter' ? 0x8fa3b8 : n === 'dusk' ? 0x5a3a7a : 0x3f8fe0; this.cap.material.color.copy(lc(capC(a), capC(b)));
    const tint = lc(A.tint, B.tint).getHex(); tintAll(tint); this.tint = tint;
  }
  // hour 0..24 -> sky; base is 'day' or 'winter'. Returns darkness 0..1 for lamps and windows.
  setHour(h, base = 'day') {
    let dark;
    if (h >= 20 || h < 5) { this.mix('night', 'night', 0); dark = 1; }
    else if (h < 6.5) { const k = (h - 5) / 1.5; this.mix('night', 'dusk', k); dark = 1 - k * 0.6; }
    else if (h < 8) { const k = (h - 6.5) / 1.5; this.mix('dusk', base, k); dark = 0.4 - k * 0.4; }
    else if (h < 17) { this.mix(base, base, 0); dark = 0; }
    else if (h < 18.5) { const k = (h - 17) / 1.5; this.mix(base, 'dusk', k); dark = k * 0.4; }
    else { const k = (h - 18.5) / 1.5; this.mix('dusk', 'night', k); dark = 0.4 + k * 0.6; }
    return dark;
  }
  update(playerPos) { this.dome.position.x = playerPos.x; this.dome.position.z = playerPos.z; this.cap.position.x = playerPos.x; this.cap.position.z = playerPos.z; this.sun.position.copy(playerPos).addScaledVector(this.sunDir, 150); this.sun.target.position.copy(playerPos); }
}
