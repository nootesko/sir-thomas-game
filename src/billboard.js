// Camera-facing pixel-art sprites (y-axis billboards). Static sets use InstancedMesh; dynamic ones are single meshes.
// Painter's order like Tibia: every pixel of a sprite is written with the depth of the sprite's FEET, so a sprite sorts by where it
// stands on the ground. A wall north of a character never cuts its head, a tree south of a house covers the house's base, and two
// characters overlap by who is further south. Each sprite also gets a flat shadow ellipse on the ground.
import * as THREE from 'three';
import { VIEW } from './view.js';
const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
const FEET_DEPTH = `#include <project_vertex>
{
  vec4 feet = vec4(0.0, 0.0, 0.0, 1.0);
  #ifdef USE_INSTANCING
    feet = instanceMatrix * feet;
  #endif
  feet = modelMatrix * feet; feet.y += 0.06; feet = viewMatrix * feet;
  vec4 fc = projectionMatrix * feet;
  gl_Position.z = fc.z / fc.w * gl_Position.w;
}`;
function patch(m) { m.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <project_vertex>', FEET_DEPTH); }; m.customProgramCacheKey = () => 'feetdepth'; return m; }
// Buildings get the same treatment per vertex: a wall pixel is written with the depth of the ground right under it, so a character
// standing south of a wall paints over it and one standing north is covered by it, instead of the wall's top leaning over everyone.
const GROUND_DEPTH = `#include <project_vertex>
{
  vec4 g = modelMatrix * vec4(transformed, 1.0); g.y = 0.0; g = viewMatrix * g;
  vec4 gc = projectionMatrix * g;
  if (gc.w > 0.1) gl_Position.z = gc.z / gc.w * gl_Position.w;
}`;
export function groundDepth(m) { if (m.userData.groundDepth) return m; m.userData.groundDepth = true; m.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <project_vertex>', GROUND_DEPTH); }; m.customProgramCacheKey = () => 'grounddepth'; m.needsUpdate = true; return m; }

const texCache = new Map();
export function spriteTexture(src) {
  let t = texCache.get(src); if (t) return t;
  t = new THREE.Texture(src); t.needsUpdate = true; t.magFilter = src.smooth ? THREE.LinearFilter : THREE.NearestFilter; t.minFilter = src.smooth ? THREE.LinearMipmapLinearFilter : THREE.NearestMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace; texCache.set(src, t); return t;
}
const matCache = new Map(), ownMats = new Set();
function build(src, opts) { const m = new THREE.MeshBasicMaterial({ map: spriteTexture(src), transparent: true, alphaTest: src.smooth ? 0.06 : 0.5, alphaToCoverage: !!src.smooth,   // HD art: soft antialiased edges (MSAA)
   side: THREE.DoubleSide, depthWrite: true, fog: opts.fog !== false }); return opts.feet === false ? m : patch(m); }
// shared material for everything drawn from the same image (static sets, props)
export function spriteMaterial(src, opts = {}) { const k = src; if (matCache.has(k)) return matCache.get(k); const m = build(src, opts); matCache.set(k, m); return m; }
// private material for a sprite that animates frames or flashes its own color
export function newSpriteMaterial(src, opts = {}) { const m = build(src, opts); ownMats.add(m); return m; }
export function tintAll(color) { for (const m of matCache.values()) m.color.set(color); for (const m of ownMats) m.color.set(color); }
export function makeBillboard(src, w, h, own = false) { const m = new THREE.Mesh(geo, own ? newSpriteMaterial(src) : spriteMaterial(src)); m.scale.set(w, h, 1); m.userData.w = w; m.userData.h = h; return m; }
// swap the image: own materials just change their texture, shared ones switch to the cached material of the new image
export function setBillboardImage(mesh, src) { if (ownMats.has(mesh.material)) { const t = spriteTexture(src); if (mesh.material.map !== t) mesh.material.map = t; } else mesh.material = spriteMaterial(src); }
// Orient a dynamic sprite toward the fixed camera (keeps any z-roll the caller sets afterwards).
export function faceView(mesh) { mesh.rotation.order = 'YXZ'; mesh.rotation.x = VIEW.tilt; mesh.rotation.y = VIEW.yaw; }

// ---- ground shadows: flat dark ellipses drawn before the sprites, so the body paints over its own shadow ----
const shadowGeo = new THREE.CircleGeometry(0.5, 14); shadowGeo.rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
export function makeShadow(w, d = w * 0.5) { const m = new THREE.Mesh(shadowGeo, shadowMat); m.scale.set(w, 1, d); m.position.y = 0.03; m.renderOrder = -1; return m; }
export class ShadowSet {
  constructor(scene, max) { this.mesh = new THREE.InstancedMesh(shadowGeo, shadowMat, max); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = -1; this.items = []; scene.add(this.mesh); this.m = new THREE.Matrix4(); }
  add(x, z, w, d) { this.items.push({ x, z, w, d }); }
  finalize() { this.mesh.count = this.items.length; for (let i = 0; i < this.items.length; i++) { const it = this.items[i]; this.m.makeScale(it.w, 1, it.d); this.m.setPosition(it.x, 0.03, it.z); this.mesh.setMatrixAt(i, this.m); } this.mesh.instanceMatrix.needsUpdate = true; }
}

export class BillboardSet {
  // shadow: shadow width as a fraction of the sprite width (0 = no shadow)
  constructor(scene, src, max, shadow = 0) { this.mesh = new THREE.InstancedMesh(geo, spriteMaterial(src), max); this.mesh.count = 0; this.mesh.frustumCulled = false; this.items = []; scene.add(this.mesh); this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.p = new THREE.Vector3(); this.s = new THREE.Vector3(); this.shadowK = shadow; this.shadows = shadow > 0 ? new ShadowSet(scene, max) : null; }
  add(x, z, w, h, y = 0) { this.items.push({ x, y, z, w, h }); if (this.shadows) this.shadows.add(x, z, w * this.shadowK, w * this.shadowK * 0.5); }
  finalize() { this.mesh.count = this.items.length; this.face(0); if (this.shadows) this.shadows.finalize(); }
  face(yaw = VIEW.yaw, tilt = VIEW.tilt) { this.q.setFromEuler(new THREE.Euler(tilt, yaw, 0, 'YXZ')); for (let i = 0; i < this.items.length; i++) { const it = this.items[i]; this.p.set(it.x, it.y, it.z); this.s.set(it.w, it.h, 1); this.m.compose(this.p, this.q, this.s); this.mesh.setMatrixAt(i, this.m); } this.mesh.instanceMatrix.needsUpdate = true; }
  set visible(v) { this.mesh.visible = v; if (this.shadows) this.shadows.mesh.visible = v; }
  get visible() { return this.mesh.visible; }
  setColor(hex) { if (!this.ownMat) { this.mesh.material = this.mesh.material.clone(); this.ownMat = true; } this.mesh.material.color.setHex(hex); }
}
