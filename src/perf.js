// Performance for phones: quality tier, distance culling of animated models, a small pool of real point lights,
// merging of the static scenery into a few draw calls, and a dynamic render resolution that follows the frame rate.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const q = new URLSearchParams(location.search);
const touch = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let stored = null; try { stored = localStorage.getItem('fortaleza-q'); } catch (e) {}
const tier = q.get('q') || stored || (touch ? 'low' : 'high');
// low: phones (no shadow map, blob shadows, 4 lights, lower resolution); high: desktop (sun shadows near the player)
export const PERF = {
  tier, mobile: touch,
  shadows: tier === 'high',
  shadowSize: 1024,
  lights: tier === 'high' ? 6 : 4,
  maxScale: Math.min(window.devicePixelRatio || 1, tier === 'high' ? 2 : 1.25),
  minScale: tier === 'high' ? 0.8 : 0.6,
  dynamic: !q.has('nodyn'),
  cullR: 34,        // animated models farther than this from the player are neither drawn nor animated
  blob: tier !== 'high',
};
PERF.scale = PERF.maxScale;

// ---- distance culling of animated models (set every frame from the player position) ----
export const LOD = {
  x: 0, z: 0, r2: PERF.cullR * PERF.cullR,
  set(x, z, viewDist) { this.x = x; this.z = z; const r = Math.max(PERF.cullR, viewDist * 1.5 + 6); this.r2 = r * r; },
  near(x, z) { const dx = x - this.x, dz = z - this.z; return dx * dx + dz * dz < this.r2; },
};

// ---- point lights: the scene keeps N real lights that jump to the N nearest lit sources ----
// Every PointLight placed directly in the scene becomes a "virtual" light (removed from the scene, still edited by the
// game code as before); each frame the pool copies color/intensity/range of the nearest ones. Shaders then always see
// exactly N lights, which is what costs on a phone GPU.
export class LightPool {
  constructor(scene, n) {
    this.scene = scene; this.virtual = []; this.pool = []; this.t = 0;
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffffff, 0, 1, 2); l.userData.pooled = true; scene.add(l); this.pool.push(l); }
    this.collect();
  }
  collect() {
    for (const o of this.scene.children.slice()) if (o.isPointLight && !o.userData.pooled) { this.scene.remove(o); this.virtual.push(o); }
  }
  update(px, pz, dt) {
    this.t -= dt; if (this.t <= 0) { this.collect(); this.t = 1; }
    const cand = []; for (const l of this.virtual) { if (l.intensity <= 0 || !l.visible) continue; const dx = l.position.x - px, dz = l.position.z - pz; const reach = (l.distance || 30) + 26; const d2 = dx * dx + dz * dz; if (d2 < reach * reach) cand.push([d2, l]); }
    cand.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < this.pool.length; i++) { const p = this.pool[i], c = cand[i]; if (!c) { p.intensity = 0; continue; } const l = c[1]; p.position.copy(l.position); p.color.copy(l.color); p.intensity = l.intensity; p.distance = l.distance; p.decay = l.decay; }
  }
}

// ---- static scenery merge ----
// Meshes placed directly in the scene that no game object keeps a reference to never change after the city is built;
// they are merged by material into chunks of CHUNK x CHUNK units, so the frustum still culls them by area.
const CHUNK = 48;
function referenced(roots) {
  const seen = new Set(), objs = new Set(); const stack = roots.map(r => [r, 0]);
  while (stack.length) { const [v, d] = stack.pop(); if (!v || typeof v !== 'object' || seen.has(v)) continue; seen.add(v);
    if (v.isObject3D) { objs.add(v); continue; } if (v.isMaterial || v.isTexture || v.isBufferGeometry || v instanceof Node || ArrayBuffer.isView(v)) continue; if (d > 5) continue;
    if (Array.isArray(v)) { for (const x of v) stack.push([x, d + 1]); } else if (v instanceof Map || v instanceof Set) { for (const x of v.values()) stack.push([x, d + 1]); } else for (const k in v) { try { stack.push([v[k], d + 1]); } catch (e) {} } }
  return objs;
}
export function mergeStatic(scene, roots) {
  if (q.has('nomerge')) return 0; const keep = referenced(roots); const groups = new Map(); let n = 0;
  for (const o of scene.children) {
    if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || keep.has(o) || !o.visible || o.children.length) continue;
    const m = o.material; if (Array.isArray(m) || m.transparent || o.userData.noMerge || o.onBeforeRender !== THREE.Object3D.prototype.onBeforeRender) continue;
    const g = o.geometry; if (!g.attributes.position || !g.attributes.normal) continue;
    const sig = Object.keys(g.attributes).sort().join(',') + (g.index ? ':i' : ':n');
    o.updateMatrixWorld(true); const cx = Math.floor(o.position.x / CHUNK), cz = Math.floor(o.position.z / CHUNK);
    const key = m.uuid + '|' + sig + '|' + cx + ',' + cz + '|' + o.castShadow + o.receiveShadow + '|' + o.renderOrder;
    if (!groups.has(key)) groups.set(key, { m, list: [], cast: o.castShadow, recv: o.receiveShadow, ro: o.renderOrder }); groups.get(key).list.push(o);
  }
  for (const gr of groups.values()) {
    if (gr.list.length < 2) continue;
    const geos = gr.list.map(o => { const g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld); return g; });
    const merged = mergeGeometries(geos, false); if (!merged) continue; geos.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(merged, gr.m); mesh.castShadow = gr.cast; mesh.receiveShadow = gr.recv; mesh.renderOrder = gr.ro; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    for (const o of gr.list) scene.remove(o); scene.add(mesh); n += gr.list.length;
  }
  // everything left that never moves stops recomputing its matrix every frame
  for (const o of scene.children) if (o.isMesh && !keep.has(o) && !o.isSkinnedMesh) { o.updateMatrix(); o.matrixAutoUpdate = false; }
  return n;
}

// ---- dynamic resolution: drop the render scale when frames are slow, raise it again when there is headroom ----
export class FrameGovernor {
  constructor(onChange) { this.onChange = onChange; this.acc = 0; this.frames = 0; this.cool = 2; this.avg = 1 / 60; }
  tick(dt) {
    this.acc += Math.min(dt, 0.25); this.frames++; this.cool -= dt;
    if (this.acc < 1.5) return; const avg = this.acc / this.frames; this.avg = avg; this.acc = 0; this.frames = 0;
    if (!PERF.dynamic || this.cool > 0) return; let s = PERF.scale;
    if (avg > 1 / 42 && s > PERF.minScale) s = Math.max(PERF.minScale, s - 0.15); else if (avg < 1 / 57 && s < PERF.maxScale) s = Math.min(PERF.maxScale, s + 0.1);
    if (s !== PERF.scale) { PERF.scale = s; this.cool = 3; this.onChange(s); }
  }
  get fps() { return Math.round(1 / this.avg); }
}
