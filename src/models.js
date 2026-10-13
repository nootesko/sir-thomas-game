// 3D models (glTF) for the Diablo/Tibia-3D look: animated characters and creatures, and static props placed in bulk.
// Every model is optional: Models.has(name) is false when assets3d/<name>.glb is missing, and callers fall back to sprites.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { PERF, LOD } from './perf.js';
import { registerBirds } from './birds.js';
import { registerCritters } from './critters.js';
// models are compressed with meshopt + quantization (tools/optimize-models.mjs) to keep the phone download small
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
// models without their own clips borrow them from a twin with the same skeleton (bones bind by name)
// KayKit 2.0 characters and skeletons (assets3d/kk, CC0) all use Rig_Medium; their clips live in one library
const KK = ['kk/knight', 'kk/barbarian', 'kk/mage', 'kk/ranger', 'kk/rogue', 'kk/rogue_hooded', 'kk/skeleton_minion', 'kk/skeleton_warrior', 'kk/skeleton_rogue', 'kk/skeleton_mage'];
export const CLIP_SOURCE = { ...Object.fromEntries(KK.map(k => [k, 'kk/rig_medium_anims'])), char_mage: 'char_knight', char_barbarian: 'char_knight', char_rogue: 'char_knight', char_rogue_hooded: 'char_knight' };
export const Models = {
  cache: {}, base: '',   // base: path prefix to assets3d/ (pages outside the root set it)
  load(name) {
    if (name in this.cache) return Promise.resolve(this.cache[name]);
    return new Promise(res => loader.load(`${this.base}assets3d/${name}.glb`, g => { prepare(g.scene); this.cache[name] = g; res(g); }, undefined, () => { this.cache[name] = null; res(null); }));
  },
  async preload(names) { await Promise.all(names.map(n => this.load(n))); },
  has(name) { return !!this.cache[name]; },
  get(name) { return this.cache[name] || null; },
};// the game is 2D again (14/10/2026): no 3D model is loaded unless the URL has ?3d (the 3D version stays in the code)
export const MODE3D = typeof location !== 'undefined' && new URLSearchParams(location.search).has('3d');
if (MODE3D) { registerBirds(Models.cache); registerCritters(Models.cache); }   // code-built birds (src/birds.js) live in the cache like loaded models

// Lambert instead of the glTF PBR material: much cheaper on phone GPUs, and its soft diffuse light suits the painted look
function lambert(m) {
  if (!m || m.isMeshLambertMaterial || !(m.isMeshStandardMaterial || m.isMeshPhysicalMaterial)) return m;
  const l = new THREE.MeshLambertMaterial({ name: m.name, color: m.color, map: m.map, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest, side: m.side, vertexColors: m.vertexColors, emissive: m.emissive, emissiveMap: m.emissiveMap, emissiveIntensity: m.emissiveIntensity });
  m.dispose(); return l;
}
function prepare(root) { root.traverse(o => { if (o.isMesh) { if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();   /* image-to-3D exports often skip normals */ o.material = Array.isArray(o.material) ? o.material.map(lambert) : lambert(o.material); o.castShadow = PERF.shadows; o.receiveShadow = PERF.shadows; o.frustumCulled = !o.isSkinnedMesh; if (o.material && o.material.map) o.material.map.colorSpace = THREE.SRGBColorSpace; } }); }
// bounding box of a model in its rest pose (skinned meshes report their bind-pose geometry)
function bounds(root) {
  const b = new THREE.Box3(); root.updateWorldMatrix(true, true);
  root.traverse(o => { if (!o.isMesh) return;
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); b.union(g.boundingBox.clone().applyMatrix4(o.matrixWorld)); });
  return b;
}

// ---- animation roles: each model names its clips differently, so roles are found by pattern (first match wins) ----
const ROLES = {
  idle: [/^Idle_A$/i, /^(.*\|)?Idle$/i, /Idle_Neutral$/i, /Flying_Idle$/i, /Unarmed_Idle$/i, /_Idle$/i, /Idle/i],
  walk: [/Walking_A$/i, /(^|\|)Walk$/i, /_Walk$/i, /Walk/i, /(^|\|)Flying$/i, /_Flying$/i, /Fly/i],
  run: [/Running_A$/i, /(^|\|)Run$/i, /_Run$/i, /Gallop$/i, /Fast_Flying$/i, /Run/i],
  attack: [/^Melee_1H_Attack_Slice_Diagonal$/i, /1H_Melee_Attack_Slice_Diagonal$/i, /1H_Melee_Attack_Chop$/i, /(^|\|)Attack$/i, /_Attack$/i, /Bite_Front$/i, /Headbutt$/i, /Punch_Left$/i, /Punch/i, /Attack/i, /Kick/i],
  attack2: [/^Melee_1H_Attack_Slice_Horizontal$/i, /1H_Melee_Attack_Slice_Horizontal$/i, /1H_Melee_Attack_Stab$/i, /Attack2$/i, /Punch_Right$/i, /Bite/i],
  hit: [/^Hit_A$/i, /HitRecieve$/i, /HitReact$/i, /Idle_HitReact_Left$/i, /_Hit$/i, /Hit/i],
  death: [/^Death_A$/i, /(^|\|)Death$/i, /_Death$/i, /Death/i],
  block: [/^Melee_Blocking$/i, /^Blocking$/i, /^Block$/i], spin: [/^Melee_2H_Attack_Spin$/i, /Spin/i], work: [/^Hammering$/i, /^Working_A$/i],
  dodge: [/^Dodge_Forward$/i, /Roll$/i],
  sleep: [/^Lie_Idle$/i, /Lie/i],
  sit: [/^Sit_Chair_Idle$/i, /Sit/i],
  cheer: [/^Cheering$/i, /^Cheer$/i, /Wave$/i, /Yes$/i], wave: [/^Waving$/i],
  interact: [/^Interact$/i, /PickUp$/i, /Use_Item$/i],
};
function findClip(clips, role) { for (const re of ROLES[role] || []) { const c = clips.find(c => re.test(c.name)); if (c) return c; } return null; }

// An animated character: a scaled clone of the model standing on its feet at the origin, facing +z, with a mixer.
export class Actor {
  constructor(name, { height = 1.8, forward = 0, width = 0 } = {}) {
    const g = Models.get(name); const src = g.scene; const skinned = src.getObjectByProperty('isSkinnedMesh', true);
    this.model = skinned ? cloneSkinned(src) : src.clone(true); this.root = new THREE.Group(); this.root.add(this.model);
    const b = bounds(src); const size = b.getSize(new THREE.Vector3()); const s = height / Math.max(size.y, 1e-3); const w = width || BODY_WIDTH[name] || 1; this.model.scale.set(s * w, s, s * w);   // slim models get a fuller body
    this.model.position.set(-(b.min.x + b.max.x) / 2 * s * w, -b.min.y * s, -(b.min.z + b.max.z) / 2 * s * w); this.model.rotation.y = forward;   // feet on the ground, centered
    this.height = height; this.radius = Math.max(size.x, size.z) * s / 2; this.forwardOffset = forward;
    this.mixer = new THREE.AnimationMixer(this.model); this.clips = g.animations && g.animations.length ? g.animations : (Models.get(CLIP_SOURCE[name])?.animations || []); this.actions = {}; this.current = null; this.role = null; this.yaw = 0;
    for (const role of Object.keys(ROLES)) { const c = findClip(this.clips, role); if (c) this.actions[role] = this.mixer.clipAction(c); }
    this.mixer.addEventListener('finished', e => { if (this.onceDone && e.action === this.onceAction) { const f = this.onceDone; this.onceDone = null; f(); } });
    this.name = name;
    this.materials = []; this.model.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); this.materials.push(o.material); } });   // own materials: hit flash and tint per actor
    // Shop Titans proportions: a slightly bigger head on the humanoid models (between chibi and realistic)
    const hs = HEAD_SCALE[name]; if (hs) this.model.traverse(o => { if (!this.head && o.isBone && /^(mixamorig:?)?head$/i.test(o.name)) this.head = o; }); this.headScale = this.head ? hs : 1;
    if (PERF.blob) { const sh = new THREE.Mesh(BLOB_GEO, BLOB_MAT); sh.scale.setScalar(Math.max(0.45, Math.min(1.6, this.radius * 1.3, height * 0.45))); sh.position.y = 0.03; sh.renderOrder = -1; this.root.add(sh); this.blob = sh; }
  }
  // props hanging from bones (weapons, shields, hats, capes): the kits ship all of them at once; only `list` stays
  keepAttachments(list) { const drop = []; this.model.traverse(o => { if (o.isMesh && !o.isSkinnedMesh && o.parent && o.parent.isBone && !list.includes(o.name)) drop.push(o); }); for (const o of drop) o.parent.remove(o); this.materials = []; this.model.traverse(o => { if (o.isMesh) this.materials.push(o.material); }); }
  has(role) { return !!this.actions[role]; }
  // play a looping role (idle/walk/run/...) with a short cross-fade; same role keeps playing
  play(role, { fade = 0.15, speed = 1 } = {}) {
    const a = this.actions[role] || this.actions.idle || this.actions.walk; if (!a) return; if (this.current === a) { a.timeScale = speed; return; }
    a.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1).fadeIn(fade).play(); a.timeScale = speed; if (this.current) this.current.fadeOut(fade); this.current = a; this.role = role;
  }
  // play a one-shot role (attack/hit/death) over the current loop; onDone runs when it finishes (death keeps its last frame)
  once(role, { speed = 1, duration = 0, onDone = null, hold = false } = {}) {
    const a = this.actions[role]; if (!a) { if (onDone) onDone(); return false; } if (duration > 0) speed = a.getClip().duration / duration;
    a.reset().setLoop(THREE.LoopOnce, 1).setEffectiveWeight(1).fadeIn(0.05).play(); a.timeScale = speed; a.clampWhenFinished = hold;
    if (this.current && this.current !== a) this.current.fadeOut(0.1); this.current = a; this.role = role; this.onceAction = a; this.onceDone = () => { if (!hold) this.current = null; if (onDone) onDone(); };
    return true;
  }
  get busy() { return !!this.onceDone; }
  face(dx, dz) { if (dx * dx + dz * dz > 1e-6) this.yaw = Math.atan2(dx, dz); this.root.rotation.y = this.yaw; }
  // hex: flash color; null restores the look's own tint
  setColor(hex) { for (const m of this.materials) m.color.setHex(hex ?? (m.userData.base ?? 0xffffff)); }
  setOpacity(op) { for (const m of this.materials) { m.transparent = op < 1; m.opacity = op; } }
  update(dt) { this.mixer.update(dt); if (this.head) this.head.scale.setScalar(this.headScale); if (this.boneScales) for (const [b, s] of this.boneScales) b.scale.copy(s); }
  // phone draw calls: the kit splits a body into 6-10 skinned parts that share one skeleton and one texture; parts with
  // the same look are merged into one skinned mesh (one draw call) once the look is final. Hidden parts are dropped.
  mergeParts() {
    const groups = new Map(), drop = [];
    this.model.traverse(o => { if (!o.isSkinnedMesh) return; if (!o.visible) { drop.push(o); return; } const m = o.material, g = o.geometry;
      const key = [o.skeleton.bones.map(b => b.uuid).join(), o.skeleton.boneInverses.map(m => m.elements.map(v => v.toFixed(3)).join()).join(';'), o.parent.uuid, m.map?.uuid, m.color.getHex(), m.emissive?.getHex(), m.transparent, !!g.index, Object.keys(g.attributes).sort().join(), o.bindMatrix.elements.map(v => v.toFixed(4)).join()].join('|');
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o); });
    for (const o of drop) o.parent.remove(o);
    for (const list of groups.values()) { if (list.length < 2) continue; const geo = mergeGeometries(list.map(o => toFloat(o.geometry.clone()))); if (!geo) continue;
      const f = list[0], m = new THREE.SkinnedMesh(geo, f.material); m.name = f.name + '_merged'; m.castShadow = f.castShadow; m.receiveShadow = f.receiveShadow; m.frustumCulled = false; f.parent.add(m); m.bind(f.skeleton, f.bindMatrix); for (const o of list) o.parent.remove(o); }
    this.materials = []; this.model.traverse(o => { if (o.isMesh) this.materials.push(o.material); });
  }
  setRoles(map) { for (const [role, name] of Object.entries(map)) { const c = this.clips.find(c => c.name === name); if (c) this.actions[role] = this.mixer.clipAction(c); } }
  // slimmer, taller people than the kit (user: 'menos gordinhos'): smaller head, longer legs, narrower body
  proportions({ head = 0.82, legs = 1.16, width = 0.86 } = {}) { this.model.scale.x *= width; this.model.scale.z *= width; this.model.position.x *= width; this.model.position.z *= width; const list = this.boneScales || []; this.model.traverse(o => { if (!o.isBone) return; if (/^head$/i.test(o.name)) { this.head = o; this.headScale = head; } else if (/^upperleg|^lowerleg/i.test(o.name)) list.push([o, new THREE.Vector3(1, legs, 1)]); }); this.boneScales = list; }
  // chibi proportions for the realistic animal models: bigger head, short thick legs (re-applied after every animation frame)
  chibify({ head = 1.5, legs = 0.75, thick = 1.2 } = {}) { const list = []; this.model.traverse(o => { if (!o.isBone) return; if (/^head$/i.test(o.name)) list.push([o, new THREE.Vector3(head, head, head)]); else if (/(Up(per)?Leg|^thigh)/i.test(o.name)) list.push([o, new THREE.Vector3(thick, legs, thick)]); }); this.boneScales = list; }
  // distance culling: far away the model is hidden and its animation paused; returns whether it is near
  cull(x, z) { const n = LOD.near(x, z); if (this.root.visible !== n) this.root.visible = n; return n; }
}

// Many copies of a static model (trees, lamps, barrels...): one InstancedMesh per material and per CHUNK x CHUNK area,
// so the camera frustum skips the areas off screen (one mesh spanning the whole map would always be drawn whole).
const CHUNK = 40;
export class PropSet {
  constructor(scene, name, max, { shadow = true } = {}) {
    const g = Models.get(name); this.scene = scene; this.parts = []; this.meshes = []; this.items = []; this.max = max; this.shadow = shadow && PERF.shadows; this.vis = true; this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.p = new THREE.Vector3(); this.s = new THREE.Vector3();
    const b = bounds(g.scene); this.size = b.getSize(new THREE.Vector3()); this.center = new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2);
    g.scene.traverse(o => { if (!o.isMesh) return; const geo = toFloat(o.geometry.clone()).applyMatrix4(o.matrixWorld); geo.translate(-this.center.x, -this.center.y, -this.center.z); this.parts.push({ geo, material: o.material }); });
  }
  // place a copy with its base at (x, z); height: desired height in world units (scales uniformly); rot: yaw in radians
  add(x, z, height, rot = 0, y = 0) { if (this.items.length >= this.max) return; this.items.push({ x, y, z, s: height / Math.max(this.size.y, 1e-3), rot }); }
  finalize() {
    for (const m of this.meshes) this.scene.remove(m); this.meshes = [];
    const cells = new Map(); for (const it of this.items) { const k = Math.floor(it.x / CHUNK) + ',' + Math.floor(it.z / CHUNK); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(it); }
    for (const list of cells.values()) for (const part of this.parts) {
      const mesh = new THREE.InstancedMesh(part.geo, part.material, list.length); mesh.castShadow = this.shadow; mesh.receiveShadow = PERF.shadows; mesh.userData.part = part;
      list.forEach((it, i) => { this.p.set(it.x, it.y, it.z); this.q.setFromAxisAngle(UP, it.rot); this.s.setScalar(it.s); this.m.compose(this.p, this.q, this.s); mesh.setMatrixAt(i, this.m); });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.matrixAutoUpdate = false; mesh.visible = this.vis; this.scene.add(mesh); this.meshes.push(mesh);
    }
  }
  set visible(v) { this.vis = v; for (const mesh of this.meshes) mesh.visible = v; }
  get visible() { return this.vis; }
  // tint relative to the model's own colors: light tints (snow) blend the leaves toward them and keep dark wood dark; others multiply
  setColor(hex) { const t = new THREE.Color(hex), light = t.r > 0.75 && t.g > 0.75 && t.b > 0.75 && hex !== 0xffffff;
    for (const part of this.parts) { const base = part.base || (part.base = part.material.color.clone()); part.material = part.material.clone(); const c = base.clone(); if (hex === 0xffffff) {} else if (light) { const lum = base.r * 0.3 + base.g * 0.59 + base.b * 0.11; c.lerp(t, lum > 0.12 ? 0.72 : 0.15); } else c.multiply(t); part.material.color.copy(c); }
    for (const mesh of this.meshes) mesh.material = mesh.userData.part.material; }
}
const UP = new THREE.Vector3(0, 1, 0);
// quantized (int16/int8, normalized or interleaved) attributes -> plain floats, so geometry can be transformed and merged
function toFloat(geo) {
  for (const [k, a] of Object.entries(geo.attributes)) { if (a.array instanceof Float32Array && !a.normalized && !a.isInterleavedBufferAttribute) continue;
    const n = a.count, s = a.itemSize, f = new Float32Array(n * s), get = [a.getX, a.getY, a.getZ, a.getW];
    for (let i = 0; i < n; i++) for (let j = 0; j < s; j++) f[i * s + j] = get[j].call(a, i);
    geo.setAttribute(k, new THREE.BufferAttribute(f, s)); }
  return geo;
}
// tint and hidden parts of a character (cfg from CHAR_MODELS / VILLAGER_MODELS / MONSTER_MODELS)
// ---- KayKit palette recolor: the kit textures are 8 x 4 cells of vertical gradients; a look swaps whole cells for a new
// color (keeping each pixel's shading), per mesh if needed: recolor: { all: { '3,0': 0x2b4fb0 }, Knight_LegLeft: {...} }.
// Same texture + same swaps = one shared texture.
const _recolorCache = new Map();
function recolorTexture(tex, map) {
  const key = tex.uuid + JSON.stringify(map); if (_recolorCache.has(key)) return _recolorCache.get(key);
  const img = tex.image, w = img.width, h = img.height, cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); x.drawImage(img, 0, 0);
  const cw = w / 8, ch = h / 4, col = new THREE.Color();
  for (const [cell, hex] of Object.entries(map)) { const [c, r] = cell.split(',').map(Number); const d = x.getImageData(c * cw, r * ch, cw, ch), p = d.data; col.setHex(hex).convertLinearToSRGB?.(); const t = new THREE.Color(hex); let mean = 0; for (let i = 0; i < p.length; i += 4) mean += p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11; mean = Math.max(1, mean / (p.length / 4));
    for (let i = 0; i < p.length; i += 4) { const k = Math.min(1.6, (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) / mean); p[i] = Math.min(255, t.r * 255 * k); p[i + 1] = Math.min(255, t.g * 255 * k); p[i + 2] = Math.min(255, t.b * 255 * k); }
    x.putImageData(d, c * cw, r * ch); }
  const out = new THREE.CanvasTexture(cv); out.flipY = tex.flipY; out.colorSpace = tex.colorSpace; out.magFilter = tex.magFilter; out.minFilter = tex.minFilter; out.wrapS = tex.wrapS; out.wrapT = tex.wrapT; _recolorCache.set(key, out); return out;
}
function applyRecolor(actor, rc) { actor.model.traverse(o => { if (!o.isMesh || !o.material.map) return; const map = { ...(rc.all || {}), ...(rc[o.name] || {}) }; if (Object.keys(map).length) o.material.map = recolorTexture(o.material.map, map); }); }
// ---- things held in the hands (KayKit 2.0 handslot bones): a kit model name, or a code-built item (see CODE_ITEMS)
function holdItem(actor, side, spec) {
  if (!spec) return; const bone = actor.model.getObjectByName('handslot' + side); if (!bone) return; const [name, rc] = Array.isArray(spec) ? spec : [spec, null];
  let obj = null; if (CODE_ITEMS[name]) obj = CODE_ITEMS[name](); else { const g = Models.get(name); if (!g) return; obj = g.scene.clone(true); obj.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); if (rc && o.material.map) o.material.map = recolorTexture(o.material.map, rc); o.castShadow = PERF.shadows; } }); }
  obj.name = 'Held_' + side; bone.add(obj); actor.materials = []; actor.model.traverse(o => { if (o.isMesh) actor.materials.push(o.material); });
}
// code-built gear for Sir Thomas's look (docs: ficha do Sir Thomas): the crystal Espada Real and the lion shield
const CODE_ITEMS = {
  espada_real: () => { const L = 0.95, mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    const m = partsMesh([[new THREE.CylinderGeometry(0.045, 0.06, 0.3, 6), 0x6a3a1e, M4(0, 0.02, 0)], [new THREE.BoxGeometry(0.34, 0.06, 0.08), 0xf6c12e, M4(0, 0.19, 0)], [new THREE.OctahedronGeometry(0.06, 0), 0x2f7cff, M4(0, 0.19, 0.045)], [new THREE.SphereGeometry(0.06, 8, 6), 0xf6c12e, M4(0, -0.15, 0)],
      [new THREE.CylinderGeometry(0.045, 0.085, L * 0.82, 4), 0xbfeaff, M4(0, 0.22 + L * 0.41, 0, 0, Math.PI / 4, 0, 1, 1, 0.45)], [new THREE.ConeGeometry(0.045, 0.16, 4), 0xdff6ff, M4(0, 0.22 + L * 0.82 + 0.08, 0, 0, Math.PI / 4, 0, 1, 1, 0.45)]], mat);
    m.material.emissive = new THREE.Color(0x1a3a5a); m.scale.setScalar(1.3); return m; },
  espada_glacial: () => { const m = CODE_ITEMS.espada_real(); const c = m.geometry.attributes.color; for (let i = 0; i < c.count; i++) if (c.getX(i) > 0.9 && c.getY(i) > 0.6 && c.getZ(i) < 0.4) c.setXYZ(i, 0.75, 0.9, 1); m.material.emissive.setHex(0x2a5a8a); return m; },
  escudo_reino: () => { const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); const sh = new THREE.Shape(); sh.moveTo(-0.32, 0.32); sh.lineTo(0.32, 0.32); sh.lineTo(0.32, -0.05); sh.quadraticCurveTo(0.3, -0.32, 0, -0.45); sh.quadraticCurveTo(-0.3, -0.32, -0.32, -0.05); sh.closePath();
    const rim = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }), face = new THREE.ShapeGeometry(sh);
    const g = partsMesh([[rim, 0xf6c12e, M4(0, 0, -0.03)], [face, 0x24418f, M4(0, 0, 0.035, 0, 0, 0, 0.86, 0.86, 1)], [new THREE.CircleGeometry(0.11, 5), 0xf6c12e, M4(0, 0.02, 0.04)], [new THREE.BoxGeometry(0.22, 0.05, 0.02), 0xf6c12e, M4(0, 0.17, 0.04)]], mat); g.scale.setScalar(1.35); return g; },
};
export function applyLook(actor, cfg) { const show = cfg.show === null ? null : cfg.show ?? ATTACH[actor.name]; if (show) actor.keepAttachments(show); if (cfg.skin && Models.get(cfg.skin)) { autoRig(actor, cfg.skin, cfg.skinYaw || 0); cfg = { ...cfg, hair: null, acc: null, style: null, recolor: null }; } if (cfg.recolor) applyRecolor(actor, cfg.recolor); if (cfg.roles) actor.setRoles(cfg.roles); if (cfg.hold) { holdItem(actor, 'r', cfg.hold.r); holdItem(actor, 'l', cfg.hold.l); } if (cfg.style) actor.proportions(cfg.style); if (cfg.glow) actor.model.traverse(o => { if (o.isMesh && /_Eyes$/.test(o.name)) { o.material.emissive = new THREE.Color(cfg.glow); o.material.emissiveIntensity = 1.2; } }); if (cfg.hair) dress(actor, [[cfg.hairStyle || 'bowl', cfg.hair]]); if (cfg.chibi) actor.chibify(cfg.chibi); if (cfg.owl) owlbearize(actor, cfg.owl); if (cfg.acc) dress(actor, cfg.acc); if (cfg.headScale) { actor.head = actor.head || actor.model.getObjectByName('head'); actor.headScale = cfg.headScale; } const tint = cfg.tint ?? 0xffffff; actor.model.traverse(o => { if (!o.isMesh) return; if (cfg.hide && cfg.hide.includes(o.name)) o.visible = false; const c = o.material.vertexColors ? 0xffffff : cfg.partTint && cfg.partTint[o.name] != null ? cfg.partTint[o.name] : tint; const orig = o.material.userData.orig ?? (o.material.userData.orig = o.material.color.getHex()); const col = new THREE.Color(orig).multiply(_tc.setHex(c)); o.material.color.copy(col); o.material.userData.base = col.getHex(); });  actor.mergeParts(); }
const _tc = new THREE.Color();
// ---- owlbears, built in code on the KayKit barbarian (so they keep its skeleton and every animation) ----
// The human head is hidden; an owl head (feathered dome, pale facial disc, big amber eyes, hooked beak, ear tufts, neck
// ruff) is merged into ONE vertex-colored mesh and hung on the head bone; bear claws hang on the hands. One draw call per
// part group, no textures. o: { fur, face, beak, eyes, tuft, claw, crown, glasses }
const OWL = { fur: 0x8a5a36, face: 0xf1dfc0, beak: 0x3b2c26, eyes: 0xffb52e, tuft: 0x5e3b22, claw: 0xf4ead8, ruff: 0xb88a5c };
function partsMesh(parts, mat) {
  const geos = parts.map(([geo, color, m4]) => { const g = geo.toNonIndexed(); g.applyMatrix4(m4); g.deleteAttribute('uv'); const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color); for (let i = 0; i < n; i++) col.toArray(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; });
  const out = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'color']) { const tot = geos.reduce((a, g) => a + g.attributes[k].array.length, 0), arr = new Float32Array(tot); let o = 0; for (const g of geos) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(arr, 3)); }
  const m = new THREE.Mesh(out, mat); m.castShadow = PERF.shadows; return m;
}
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
const fwdOf = m => new THREE.Vector3(0, 0, 1).transformDirection(m.matrixWorld);
function hang(m, bone, mesh, pos) { mesh.position.copy(pos); mesh.lookAt(pos.clone().add(fwdOf(m))); bone.attach(mesh); }
// world box of a part (skinned parts report their bind pose, which is the pose the model is built in)
function partBox(o) { const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); return g.boundingBox.clone().applyMatrix4(o.matrixWorld); }
// Code-built clothes and props for the KayKit humans, so every person shares one body style (no thin, realistic models):
// head: crown, tiara, strawhat, kerchief, chef; body: apron. Each list item is [kind, color]. One merged mesh per bone.
const ACC_HEAD = {
  crown: (x, y, z, c) => { const p = [[new THREE.CylinderGeometry(x * 0.58, x * 0.64, y * 0.32, 10, 1, true), c, M4(0, y * 0.95, 0)], [new THREE.SphereGeometry(x * 0.1, 6, 4), 0x3fa9ff, M4(0, y * 0.95, z * 0.62)]]; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; p.push([new THREE.ConeGeometry(x * 0.11, y * 0.32, 4), c, M4(Math.sin(a) * x * 0.58, y * 1.25, Math.cos(a) * x * 0.58)]); } return p; },
  tiara: (x, y, z, c) => [[new THREE.TorusGeometry(x * 0.66, x * 0.05, 5, 18, Math.PI), c, M4(0, y * 0.7, z * 0.05, -0.35, 0, 0)], [new THREE.SphereGeometry(x * 0.1, 6, 4), 0xff5aa0, M4(0, y * 1.25, z * 0.25)]],
  strawhat: (x, y, z, c) => [[new THREE.CylinderGeometry(x * 1.6, x * 1.6, y * 0.07, 16), c, M4(0, y * 0.62, 0)], [new THREE.CylinderGeometry(x * 0.66, x * 0.76, y * 0.5, 12), c, M4(0, y * 0.9, 0)], [new THREE.CylinderGeometry(x * 0.77, x * 0.77, y * 0.13, 12), 0x8a3a24, M4(0, y * 0.72, 0)]],
  kerchief: (x, y, z, c) => [[new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), c, M4(0, y * 0.12, 0, 0, 0, 0, x * 1.06, y * 0.98, z * 1.08)], [new THREE.SphereGeometry(x * 0.2, 6, 4), c, M4(0, y * 0.3, -z * 1.02)]],
  // straight bowl cut (Sir Thomas): a smooth cap, fringe straight across the brows, longer at the back and over the ears
  bowl: (x, y, z, c) => { const d = new THREE.Color(c).multiplyScalar(0.82).getHex(); return [
    [new THREE.SphereGeometry(1, 12, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), c, M4(0, y * 0.02, -z * 0.03, 0, 0, 0, x * 1.1, y * 1.04, z * 1.12)],
    [new THREE.SphereGeometry(1, 12, 5, Math.PI, Math.PI, Math.PI * 0.5, Math.PI * 0.22), c, M4(0, y * 0.02, -z * 0.03, 0, 0, 0, x * 1.07, y * 0.92, z * 1.08)],
    [new THREE.CylinderGeometry(1, 1.03, 1, 12, 1, true, -Math.PI * 0.55, Math.PI * 1.1), d, M4(0, y * 0.0, -z * 0.03, 0, 0, 0, x * 1.085, y * 0.2, z * 1.11)],
    ...[-0.5, -0.2, 0.15, 0.45].map(t => [new THREE.ConeGeometry(x * 0.13, y * 0.22, 4), d, M4(Math.sin(t) * x * 1.06, -y * 0.1, Math.cos(t) * z * 1.08, Math.PI, 0, 0)])]; },
  curls: (x, y, z, c) => { const p = []; const R = (a, b) => a + (Math.sin(a * 91.7 + b * 13.3) * 0.5 + 0.5) * (b - a); for (let i = 0; i < 30; i++) { const a = i * 2.39996, t = (i + 0.5) / 30; const el = Math.acos(1 - t * 1.1); if (el > 1.6) continue; const sx = Math.sin(el) * Math.cos(a), sz = Math.sin(el) * Math.sin(a), sy = Math.cos(el); if (sz > 0.5 && sy < 0.55) continue; p.push([new THREE.SphereGeometry(x * R(0.2, 0.26), 7, 5), c, M4(sx * x * 0.9, y * 0.12 + sy * y * 0.82, sz * z * 0.9 - z * 0.04)]); } return p; },
  chef: (x, y, z, c) => [[new THREE.CylinderGeometry(x * 0.7, x * 0.66, y * 0.7, 12), c, M4(0, y * 1.05, 0)], [new THREE.SphereGeometry(x * 0.82, 10, 6), c, M4(0, y * 1.5, 0, 0, 0, 0, 1, 0.55, 1)]],
};
const ACC_CHEST = {
  // a cloak from the shoulders to the knees, open at the front, with a gold clasp collar
  cape: (x, y, z, c) => [[new THREE.CylinderGeometry(x * 1.08, x * 1.45, y * 2.1, 12, 1, true, Math.PI * 0.62, Math.PI * 0.76), c, M4(0, -y * 0.25, -z * 0.15)], [new THREE.TorusGeometry(x * 0.95, x * 0.12, 5, 14), 0xf6c12e, M4(0, y * 0.78, -z * 0.05, Math.PI / 2, 0, 0, 1, 1.1, 1)]],
};
const ACC_BODY = {
  apron: (x, y, z, c) => [[new THREE.BoxGeometry(x * 1.5, y * 1.5, z * 0.08), c, M4(0, -y * 0.35, z * 1.02)], [new THREE.BoxGeometry(x * 1.62, y * 0.12, z * 0.1), 0x8a5a36, M4(0, y * 0.18, z * 1.0)]],
};
export function dress(actor, list) {
  const m = actor.model; m.updateMatrixWorld(true); let head = null, body = null; m.traverse(o => { if (o.isSkinnedMesh && /_Head/.test(o.name)) head = head || o; if (o.isSkinnedMesh && /_Body$/.test(o.name)) body = body || o; });
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }); const hp = [], bp = [], cp = [];
  let hb = null, bb = null; if (head) { hb = partBox(head); } if (body) { bb = partBox(body); }
  for (const [k, c] of list) { if (ACC_HEAD[k] && hb) { const s = hb.getSize(new THREE.Vector3()); hp.push(...ACC_HEAD[k](s.x / 2, s.y / 2, s.z / 2, c)); } if (ACC_BODY[k] && bb) { const s = bb.getSize(new THREE.Vector3()); bp.push(...ACC_BODY[k](s.x / 2, s.y / 2, s.z / 2, c)); } if (ACC_CHEST[k] && bb) { const s = bb.getSize(new THREE.Vector3()); cp.push(...ACC_CHEST[k](s.x / 2, s.y / 2, s.z / 2, c)); } }
  if (hp.length) hang(m, m.getObjectByName('head'), partsMesh(hp, mat), hb.getCenter(new THREE.Vector3()));
  if (bp.length) hang(m, m.getObjectByName('hips') || m.getObjectByName('spine'), partsMesh(bp, mat), bb.getCenter(new THREE.Vector3()));
  if (cp.length) hang(m, m.getObjectByName('chest') || m.getObjectByName('spine'), partsMesh(cp, mat), bb.getCenter(new THREE.Vector3()));
  if (hp.length || bp.length || cp.length) actor.materials.push(mat);
}
// rigid low-poly pieces skinned to the actor's own skeleton: one skinned mesh (one draw call) that follows every animation.
// parts: [geometry in world space (rest pose), color, bone name]
function skinnedParts(actor, parts, mat) {
  let ref = null; actor.model.traverse(o => { if (!ref && o.isSkinnedMesh) ref = o; }); if (!ref) return null; const sk = ref.skeleton, inv = ref.matrixWorld.clone().invert();
  const geos = parts.map(([geo, color, bone]) => { const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); g.applyMatrix4(inv); const n = g.attributes.position.count, c = new Float32Array(n * 3), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), col = new THREE.Color(color), bi = Math.max(0, sk.bones.findIndex(b => b.name === bone));
    for (let i = 0; i < n; i++) { col.toArray(c, i * 3); si[i * 4] = bi; sw[i * 4] = 1; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); return g; });
  const geo = mergeGeometries(geos); const m = new THREE.SkinnedMesh(geo, mat); m.name = 'Fur_Body'; m.frustumCulled = false; m.castShadow = PERF.shadows; ref.parent.add(m); m.bind(sk, ref.bindMatrix); return m;
}
// the owl-bear's own furry body: round belly, thick limbs, big paws with claws (the barbarian's clothed body is hidden)
function furBody(actor, o) {
  const m = actor.model; m.updateMatrixWorld(true); const P = n => { const b = m.getObjectByName(n); return b ? b.getWorldPosition(new THREE.Vector3()) : null; }; const H = actor.height;
  const F = new THREE.Color(o.fur), L = F.clone().lerp(new THREE.Color(0xf4e8d4), 0.5).getHex(), D = F.clone().multiplyScalar(0.6).getHex(), f = F.getHex(), parts = [];
  const seg = (a, b, r0, r1, color, bone) => { const A = P(a), B = P(b); if (!A || !B) return; const len = A.distanceTo(B); const g = new THREE.CylinderGeometry(r1, r0, len + r0 * 0.9, 8, 1); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); g.applyQuaternion(q); const mid = A.clone().add(B).multiplyScalar(0.5); g.translate(mid.x, mid.y, mid.z); parts.push([g, color, bone]);
    for (const [pt, r] of [[A, r0], [B, r1]]) { const s = new THREE.SphereGeometry(r, 8, 6); s.translate(pt.x, pt.y, pt.z); parts.push([s, color, bone]); } };
  const ball = (at, r, sx, sy, sz, color, bone, off = [0, 0, 0]) => { const p = P(at); if (!p) return; const g = new THREE.SphereGeometry(r, 10, 8); g.scale(sx, sy, sz); g.translate(p.x + off[0], p.y + off[1], p.z + off[2]); parts.push([g, color, bone]); };
  const fwd = new THREE.Vector3(0, 0, 1).transformDirection(m.matrixWorld);
  const hips = P('hips'), chest = P('chest'); const torsoC = hips.clone().lerp(chest, 0.55);
  { const g = new THREE.SphereGeometry(H * 0.19, 12, 10); g.scale(1.05, 1.15, 0.95); g.translate(torsoC.x, torsoC.y, torsoC.z); parts.push([g, f, 'spine']); }
  { const b = torsoC.clone().addScaledVector(fwd, H * 0.125); const g = new THREE.SphereGeometry(H * 0.135, 10, 8); g.scale(1, 1.2, 0.55); g.translate(b.x, b.y - H * 0.02, b.z); parts.push([g, L, 'spine']); }
  ball('hips', H * 0.15, 1.15, 0.85, 1, f, 'hips'); ball('chest', H * 0.16, 1.2, 0.9, 1, f, 'chest');
  for (const s of ['l', 'r']) {
    seg('upperarm' + s, 'lowerarm' + s, H * 0.065, H * 0.058, f, 'upperarm' + s); seg('lowerarm' + s, 'wrist' + s, H * 0.058, H * 0.052, f, 'lowerarm' + s); ball('hand' + s, H * 0.06, 1.1, 1, 1.1, D, 'hand' + s);
    seg('upperleg' + s, 'lowerleg' + s, H * 0.08, H * 0.07, f, 'upperleg' + s); seg('lowerleg' + s, 'foot' + s, H * 0.07, H * 0.062, f, 'lowerleg' + s);
    { const p = P('foot' + s), t = P('toes' + s) || p; const c = p.clone().lerp(t, 0.5); const g = new THREE.SphereGeometry(H * 0.07, 9, 6); g.scale(1, 0.55, 1.45); g.translate(c.x, Math.max(H * 0.035, c.y - H * 0.02), c.z); parts.push([g, D, 'foot' + s]);
      for (const k of [-1, 0, 1]) { const cg = new THREE.ConeGeometry(H * 0.012, H * 0.04, 4); cg.rotateX(Math.PI / 2); const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize(); const tip = c.clone().addScaledVector(fwd, H * 0.1).addScaledVector(side, k * H * 0.03); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), fwd)); cg.translate(tip.x, H * 0.03, tip.z); parts.push([cg, 0xf4ead8, 'foot' + s]); } }
  }
  actor.model.traverse(x => { if (x.isSkinnedMesh && x.name !== 'Fur_Body') x.visible = false; });
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true }); if (skinnedParts(actor, parts, mat)) actor.materials.push(mat);
}
// ---- auto-rig: a static model (e.g. image-to-3D of the user's art) skinned onto the actor's KayKit skeleton ----
// The skeleton is put in the first frame of its idle (arms down, like a character sheet), the model is fitted to it
// (height, centre, facing), each vertex follows its 2 nearest bone segments, and that pose becomes the bind pose.
// The kit's own body is hidden; animations and held items keep working on the same bones.
export function autoRig(actor, skinName, yaw = 0) {
  const g = Models.get(skinName); if (!g) return false; const m = actor.model;
  actor.play('idle'); actor.mixer.update(0); m.updateMatrixWorld(true);
  const P = n => { const b = m.getObjectByName(n); return b ? b.getWorldPosition(new THREE.Vector3()) : null; };
  const segs = [['hips', 'spine'], ['spine', 'chest'], ['chest', 'head'], ['head', null], ...['l', 'r'].flatMap(s => [['upperarm' + s, 'lowerarm' + s], ['lowerarm' + s, 'wrist' + s], ['wrist' + s, 'hand' + s], ['upperleg' + s, 'lowerleg' + s], ['lowerleg' + s, 'foot' + s], ['foot' + s, 'toes' + s]])]
    .map(([a, b]) => { const A = P(a); if (!A) return null; const B = b ? P(b) : A.clone().add(new THREE.Vector3(0, actor.height * 0.2, 0)); return B ? { bone: a, A, B } : null; }).filter(Boolean);
  let ref = null; m.traverse(o => { if (!ref && o.isSkinnedMesh) ref = o; }); if (!ref) return false; const sk = ref.skeleton;
  // the static model in world space, fitted to the rig
  const src = []; g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (o.isMesh) src.push(o); }); const box = new THREE.Box3(); for (const o of src) box.expandByObject(o);
  const size = box.getSize(new THREE.Vector3()), s = actor.height / size.y, rot = new THREE.Matrix4().makeRotationY(yaw), fit = new THREE.Matrix4().makeTranslation(m.parent ? 0 : 0, 0, 0).multiply(rot).multiply(new THREE.Matrix4().makeScale(s, s, s)).multiply(new THREE.Matrix4().makeTranslation(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2));
  const toLocal = ref.matrixWorld.clone().invert(), seg = new THREE.Vector3(), q = new THREE.Vector3(), cp = new THREE.Vector3();
  for (const o of src) {
    const geo = o.geometry.clone(); geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(fit, o.matrixWorld)); const pos = geo.attributes.position, n = pos.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { q.fromBufferAttribute(pos, i); let b1 = -1, d1 = 1e9, b2 = -1, d2 = 1e9;
      for (let k = 0; k < segs.length; k++) { const S = segs[k]; seg.subVectors(S.B, S.A); const t = Math.max(0, Math.min(1, cp.subVectors(q, S.A).dot(seg) / Math.max(1e-6, seg.lengthSq()))); const d = cp.copy(S.A).addScaledVector(seg, t).distanceTo(q); if (d < d1) { d2 = d1; b2 = b1; d1 = d; b1 = k; } else if (d < d2) { d2 = d; b2 = k; } }
      const w1 = 1 / Math.pow(d1 + 1e-3, 4), w2 = b2 >= 0 && d2 < d1 * 1.6 ? 1 / Math.pow(d2 + 1e-3, 4) : 0, t = w1 + w2;
      si[i * 4] = Math.max(0, sk.bones.findIndex(b => b.name === segs[b1].bone)); sw[i * 4] = w1 / t; if (w2) { si[i * 4 + 1] = Math.max(0, sk.bones.findIndex(b => b.name === segs[b2].bone)); sw[i * 4 + 1] = w2 / t; } }
    geo.applyMatrix4(toLocal); geo.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4)); if (!geo.attributes.normal) geo.computeVertexNormals();
    const mat = o.material.clone(); const sm = new THREE.SkinnedMesh(geo, mat); sm.name = 'Rigged_' + o.name; sm.frustumCulled = false; sm.castShadow = PERF.shadows; sm.position.copy(ref.position); sm.quaternion.copy(ref.quaternion); sm.scale.copy(ref.scale); ref.parent.add(sm); sm.updateMatrixWorld(true);
    sk.calculateInverses(); sm.bind(sk, ref.matrixWorld.clone()); actor.materials.push(mat); }
  m.traverse(o => { if (o.isSkinnedMesh && !o.name.startsWith('Rigged_')) o.visible = false; });
  // the other kit meshes still bind with their old inverses; they are hidden, so only the rigged model matters
  return true;
}
export function owlbearize(actor, opts = {}) {
  const o = { ...OWL, ...opts }, m = actor.model; m.updateMatrixWorld(true);
  const headMesh = m.getObjectByName('Barbarian_Head'), bone = m.getObjectByName('head'); if (!headMesh || !bone) return;
  const g = headMesh.geometry; if (!g.boundingBox) g.computeBoundingBox(); const box = g.boundingBox.clone().applyMatrix4(headMesh.matrixWorld);
  headMesh.visible = false; const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3()); if (opts.body !== false) furBody(actor, { ...OWL, ...opts }); const r = Math.min(size.x, size.y, size.z) * 0.5 * (o.scale || 1); c.y += r * 0.1;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const S = (rad, w = 12, h = 9) => new THREE.SphereGeometry(rad, w, h), C = (rad, hgt, seg = 7) => new THREE.ConeGeometry(rad, hgt, seg);
  const parts = [
    [S(r), o.fur, M4(0, 0.05 * r, 0, 0, 0, 0, 1.06, 0.98, 0.98)],                         // feathered dome
    [S(r * 0.82), o.face, M4(0, -0.02 * r, 0.6 * r, 0, 0, 0, 1, 0.92, 0.42)],            // facial disc
    [S(r * 0.3, 10, 8), 0x2b1a12, M4(-0.34 * r, 0.12 * r, 0.86 * r, 0, 0, 0, 1, 1, 0.5)], [S(r * 0.3, 10, 8), 0x2b1a12, M4(0.34 * r, 0.12 * r, 0.86 * r, 0, 0, 0, 1, 1, 0.5)],   // eye rims
    [S(r * 0.24, 10, 8), o.eyes, M4(-0.34 * r, 0.12 * r, 0.93 * r)], [S(r * 0.24, 10, 8), o.eyes, M4(0.34 * r, 0.12 * r, 0.93 * r)],
    [S(r * 0.12, 8, 6), 0x0d0806, M4(-0.33 * r, 0.12 * r, 1.12 * r)], [S(r * 0.12, 8, 6), 0x0d0806, M4(0.33 * r, 0.12 * r, 1.12 * r)],
    [S(r * 0.045, 6, 4), 0xffffff, M4(-0.29 * r, 0.18 * r, 1.22 * r)], [S(r * 0.045, 6, 4), 0xffffff, M4(0.37 * r, 0.18 * r, 1.22 * r)],   // eye shine
    [C(r * 0.17, r * 0.5), o.beak, M4(0, -0.2 * r, 1.0 * r, Math.PI / 2 + 0.55, 0, 0)],   // hooked beak, pointing forward and down
    [C(r * 0.2, r * 0.62), o.tuft, M4(-0.62 * r, 0.78 * r, 0.05 * r, -0.15, 0, 0.45)], [C(r * 0.2, r * 0.62), o.tuft, M4(0.62 * r, 0.78 * r, 0.05 * r, -0.15, 0, -0.45)],   // ear tufts
    [new THREE.TorusGeometry(r * 0.78, r * 0.3, 6, 14), o.ruff, M4(0, -0.78 * r, 0, Math.PI / 2, 0, 0, 1, 1, 0.8)],   // feather ruff around the neck
  ];
  if (o.crown) { parts.push([new THREE.CylinderGeometry(r * 0.55, r * 0.6, r * 0.28, 10, 1, true), o.crown, M4(0, 0.98 * r, 0)]); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; parts.push([C(r * 0.1, r * 0.3, 4), o.crown, M4(Math.sin(a) * r * 0.55, 1.24 * r, Math.cos(a) * r * 0.55)]); } parts.push([S(r * 0.09, 6, 4), 0x3fa9ff, M4(0, 1.0 * r, 0.6 * r)]); }
  if (o.glasses) for (const sx of [-1, 1]) parts.push([new THREE.TorusGeometry(r * 0.27, r * 0.035, 5, 14), o.glasses, M4(sx * 0.34 * r, 0.12 * r, 1.13 * r)]);
  if (o.head === 'wolf') parts.splice(0, parts.length,   // the Ice Werewolf: a snarling wolf head on the same furry body
    [S(r), o.fur, M4(0, 0.05 * r, 0, 0, 0, 0, 1.0, 0.95, 1.0)], [S(r * 0.55), o.ruff, M4(0, -0.3 * r, 0.85 * r, 0, 0, 0, 1, 0.75, 1.35)], [S(r * 0.14, 6, 5), o.beak, M4(0, -0.12 * r, 1.55 * r)],
    [new THREE.BoxGeometry(r * 0.6, r * 0.12, r * 0.5), 0x7a2a2a, M4(0, -0.48 * r, 1.0 * r)], ...[-1, 1].flatMap(sx => [[C(r * 0.07, r * 0.25, 4), 0xffffff, M4(sx * 0.2 * r, -0.5 * r, 1.25 * r, Math.PI, 0, 0)], [C(r * 0.3, r * 0.8, 4), o.tuft, M4(sx * 0.55 * r, 0.85 * r, -0.05 * r, 0, 0, -sx * 0.25)], [S(r * 0.17, 8, 6), o.eyes, M4(sx * 0.36 * r, 0.18 * r, 0.82 * r)], [S(r * 0.07, 5, 4), 0x0d0806, M4(sx * 0.36 * r, 0.18 * r, 0.97 * r)], [new THREE.BoxGeometry(r * 0.35, r * 0.07, r * 0.08), 0x2a3a4a, M4(sx * 0.33 * r, 0.42 * r, 0.85 * r, 0, 0, sx * 0.35)], [S(r * 0.4, 8, 6), o.ruff, M4(sx * 0.75 * r, -0.3 * r, 0.1 * r)]]),
    [new THREE.TorusGeometry(r * 0.8, r * 0.32, 6, 14), o.ruff, M4(0, -0.78 * r, 0, Math.PI / 2, 0, 0, 1, 1, 0.8)]);
  const head = partsMesh(parts, mat); head.name = 'Owl_Head'; head.position.copy(c); head.lookAt(c.clone().add(new THREE.Vector3(0, 0, 1).transformDirection(m.matrixWorld))); bone.attach(head);
  // bear claws on both hands
  for (const side of ['l', 'r']) { const hb = m.getObjectByName('hand' + side); if (!hb) continue; const p = new THREE.Vector3(); hb.getWorldPosition(p); const k = r * 0.5;
    const claws = partsMesh([-1, 0, 1].map(i => [C(k * 0.16, k * 0.6, 5), o.claw, M4(i * k * 0.24, -k * 0.55, k * 0.25, 0.4, 0, 0)]), mat); claws.position.copy(p); claws.lookAt(p.clone().add(new THREE.Vector3(0, 0, 1).transformDirection(m.matrixWorld))); hb.attach(claws); }
  actor.materials.push(mat); mat.userData.orig = 0xffffff;
}
// default bone props per model (weapons and shields only on whoever fights: see CHAR_MODELS `show`)
const ATTACH = { char_knight: ['Knight_Cape', 'Knight_Helmet'], char_mage: ['Mage_Hat', 'Mage_Cape'], char_barbarian: ['Barbarian_Cape'], char_rogue: ['Rogue_Cape'], char_rogue_hooded: ['Rogue_Cape'] };
// head bone scale for chibi proportions (KayKit already has big heads; the Quaternius humans need more)
const HEAD_SCALE = { char_knight: 1.04, char_mage: 1.04, char_barbarian: 1.04, char_rogue: 1.04, char_rogue_hooded: 1.04, char_farmer: 1.15, char_king: 1.15 };
const BODY_WIDTH = { char_farmer: 1.18, char_king: 1.18 };
const BLOB_GEO = new THREE.CircleGeometry(0.5, 14).rotateX(-Math.PI / 2); const BLOB_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false });
// Drop-in replacement for a BillboardSet of the city: same add/finalize/face/visible API, backed by a PropSet of a model.
export class ModelSet {
  constructor(scene, cfg, max) { this.cfg = cfg; this.ps = new PropSet(scene, cfg.model, max); if (cfg.tint) this.ps.setColor(cfg.tint); this.items = this.ps.items; }
  // fit 'w': the model is scaled so its width matches the sprite width (wide things like fountains); default: height matches
  add(x, z, w, h, y = 0) { const c = this.cfg; const height = c.fit === 'w' ? w * (c.wScale ?? 1) * this.ps.size.y / Math.max(this.ps.size.x, 1e-3) : h * (c.hScale ?? 1); this.ps.add(x, z, height, c.rot ? Math.random() * Math.PI * 2 : 0, y); }
  finalize() { this.ps.finalize(); }
  face() {}
  setColor(hex) { this.ps.setColor(hex); }
  get mesh() { return this.ps.meshes[0]; }
  set visible(v) { this.ps.visible = v; }
  get visible() { return this.ps.visible; }
}
// A single static prop (chest, campfire, statue...): a clone of the model with its base at the origin, scaled to a height.
export function makeProp(name, height, rot = 0) {
  const g = Models.get(name); const b = bounds(g.scene); const size = b.getSize(new THREE.Vector3()); const s = height / Math.max(size.y, 1e-3);
  const root = new THREE.Group(); const m = g.scene.clone(true); m.scale.setScalar(s); m.position.set(-(b.min.x + b.max.x) / 2 * s, -b.min.y * s, -(b.min.z + b.max.z) / 2 * s); root.add(m); root.rotation.y = rot; root.userData.h = height; return root;
}

// ---- what uses which model ----
// Named characters: model, height, tint (multiplies the texture) and which named parts to hide
// owl-bears wear no clothes: every palette cell of the barbarian body becomes fur (lighter belly, darker paws)
const OWL_FUR = fur => { const F = new THREE.Color(fur), L = F.clone().lerp(new THREE.Color(0xf4e8d4), 0.45).getHex(), D = F.clone().multiplyScalar(0.62).getHex(), f = F.getHex();
  return { '0,0': L, '6,0': f, '5,1': f, '7,2': D, '2,1': f, '3,0': f, '7,0': f, '1,3': L, '6,1': D, '7,1': D, '3,2': f, '3,1': D, '2,0': D, '1,0': f }; };
const GUARD = ['1H_Sword', 'Rectangle_Shield', 'Knight_Cape', 'Knight_Helmet'];
export const CHAR_MODELS = {
  // Sir Thomas (ficha do personagem): KayKit 2.0 knight, slimmer, straight black bowl cut, blue tunic, gold trims and cape,
  // beige trousers, brown boots and gloves, crystal Espada Real and the blue-and-gold shield of the kingdom
  thomas:     { model: 'kk/knight', h: 1.8, skin: 'gen/thomas_trellis', skinYaw: 0, show: [], hide: ['Knight_Helmet', 'Knight_HelmetVisor'], style: {}, hair: 0x24201f, hold: { r: 'espada_real', l: 'escudo_reino' },
    recolor: { all: { '1,0': 0x1e1a1c, '0,1': 0xffd23a, '3,0': 0x2b4fb0, '7,0': 0x2b4fb0, '4,0': 0x5a3418, '6,0': 0x6a3a1e, '7,1': 0xd9a520 }, Knight_LegLeft: { '3,0': 0xd8c8a8, '7,0': 0x6a3a1e, '6,0': 0x6a3a1e }, Knight_LegRight: { '3,0': 0xd8c8a8, '7,0': 0x6a3a1e, '6,0': 0x6a3a1e }, Knight_ArmLeft: { '3,0': 0xd8c8a8, '7,0': 0x6a3a1e }, Knight_ArmRight: { '3,0': 0xd8c8a8, '7,0': 0x6a3a1e } } },
  maite:      { model: 'char_mage', h: 1.7, tint: 0xf7dfef, show: ['Mage_Cape'] },
  pipo:       { model: 'char_rogue_hooded', h: 1.25, tint: 0xd7ffc7 },
  guarda:     { model: 'char_knight', h: 1.85, tint: 0xe3e7ed, show: GUARD },
  capitao:    { model: 'char_knight', h: 1.9, tint: 0xebe3c7, show: GUARD },
  castelo_g:  { model: 'char_knight', h: 1.85, tint: 0xe3e7ed, show: GUARD },
  g2:         { model: 'char_knight', h: 1.85, tint: 0xe3e7ed, show: GUARD },
  ferreiro:   { model: 'char_barbarian', h: 1.95, tint: 0xebd7c7, show: [] },
  cozinheira: { model: 'char_rogue', h: 1.7, tint: 0xffe7e0, show: [], acc: [['kerchief', 0xd84a4a], ['apron', 0xf6f0e4]] },
  mercador:   { model: 'char_rogue', h: 1.8, tint: 0xe7cfff },
  rei:        { model: 'char_barbarian', h: 1.95, tint: 0xffefe0, show: ['Barbarian_Cape'], partTint: { Barbarian_Cape: 0xc02a3a }, acc: [['crown', 0xf6c12e]] },
  taverneira: { model: 'char_mage', h: 1.72, tint: 0xfff0d0, show: [], acc: [['kerchief', 0x3a8a5a], ['apron', 0xe8d8b0]] },
  padre:      { model: 'char_mage', h: 1.8, tint: 0xc7c7cf, show: ['Spellbook', 'Mage_Cape'] },
  barqueiro:  { model: 'char_barbarian', h: 1.8, tint: 0xe0e8ff, show: [], acc: [['strawhat', 0xe8c860]] },
  erveira:    { model: 'char_mage', h: 1.7, tint: 0xebffe7, show: ['Mage_Hat'] },
  pescadora:  { model: 'char_rogue', h: 1.7, tint: 0xeff7ff, show: [] },
  andarilha:  { model: 'char_rogue_hooded', h: 1.75, tint: 0xe7d7c7 },
  // owlbears: the barbarian with an owl head built in code (owlbearize); fur tints the body, w widens it like a bear
  anciao:     { model: 'char_barbarian', h: 2.5, w: 1.3, style: { head: 1, legs: 0.95, width: 1 }, show: [], recolor: { all: OWL_FUR(0xc8c0b4) }, owl: { fur: 0xd8d0c4, ruff: 0xeee6da, tuft: 0xb0a698, glasses: 0xd8b040 } },
  urso_pinho: { model: 'char_barbarian', h: 2.4, w: 1.3, style: { head: 1, legs: 0.95, width: 1 }, show: [], recolor: { all: OWL_FUR(0x7a5236) }, owl: { fur: 0x7a5236 } },
  urso:       { model: 'char_barbarian', h: 2.3, w: 1.3, style: { head: 1, legs: 0.95, width: 1 }, show: [], recolor: { all: OWL_FUR(0x8a6440) }, owl: { fur: 0x8a6440 } },
  filhote:    { model: 'char_barbarian', h: 1.05, w: 1.25, style: { head: 1, legs: 0.95, width: 1 }, show: [], recolor: { all: OWL_FUR(0xb08a62) }, headScale: 1.35, owl: { fur: 0xb08a62, ruff: 0xe0c8a0 } },
  bibliotecaria: { model: 'char_barbarian', h: 2.35, w: 1.3, style: { head: 1, legs: 0.95, width: 1 }, show: [], owl: { fur: 0x9a8a78, ruff: 0xe8dcc8, tuft: 0x6a5a4a, glasses: 0xc0c8d8 } },
  rei_urso:   { model: 'char_barbarian', h: 2.8, w: 1.35, style: { head: 1, legs: 0.95, width: 1 }, show: [], recolor: { all: OWL_FUR(0x6a4428) }, acc: [['cape', 0xc0202a]], owl: { fur: 0x6a4428, crown: 0xf6c12e } },
  coruja:     { model: 'bird_owl', h: 1.3 },
  guilda:     { model: 'char_rogue', h: 1.8, tint: 0xffe8d0, show: ['Rogue_Cape'], partTint: { Rogue_Cape: 0x3a6ad0 }, acc: [['tiara', 0xc0c8d8]] },
  rei_passaro:{ model: 'bird_king', h: 2.6 },
};
// ---- what Thomas wears changes his model (user: "capacete vermelho muda") ----
// weapons and shields map to kit models or code-built ones; helmets, armour, capes and boots recolor palette cells
const ALLOY = { couro: 0x8a5a2e, latao: 0xd8b04a, bronze: 0xa8683a, cobre: 0xc0703a, prata: 0xd8dde5, ouro: 0xf6c12e, ferro: 0x9aa2ad, aco: 0xb8c4d0, escama_dragao: 0xc0302a, veludo: 0x7a3a9a, real: 0xf6c12e, rei: 0xffe066, sapo: 0xc8b040, roupa: 0x2b4fb0 };
const colorOf = (id, it) => it?.tint ? parseInt(it.tint.slice(1), 16) : ALLOY[id] ?? ALLOY[(id || '').split('_').pop()] ?? null;
const SWORDS = { real: 'espada_real', ferro: 'kk/sword_1handed', aco: ['kk/sword_1handed', { '3,0': 0xc8d8e8 }], fogo: ['kk/sword_1handed', { '3,0': 0xff6a2a, '7,0': 0xffb040 }], glacial: 'espada_glacial', dente_dragao: ['kk/sword_2handed', { '3,0': 0xf4ead8 }] };
const SHIELDS = { reino: 'escudo_reino', broquel: 'kk/shield_round', escudo_ferro: 'kk/shield_square', escudo_bronze: ['kk/shield_spikes', { '3,0': 0xa8683a }], escudo_prata: ['kk/shield_badge', { '3,0': 0xe8eef5 }] };
export function thomasLook(equip = {}, items = {}) {
  const base = CHAR_MODELS.thomas, rc = JSON.parse(JSON.stringify(base.recolor)), cfg = { ...base, recolor: rc, hide: [...base.hide], hold: { r: SWORDS[equip.espada] || 'espada_real', l: equip.escudo ? SHIELDS[equip.escudo] || 'escudo_reino' : null } };
  if (typeof location === 'undefined' || new URLSearchParams(location.search).get('thomas') !== 'ia') delete cfg.skin;   // ?thomas=ia: the image-to-3D Thomas (experiment)
  const it = k => items[equip[k]];
  if (equip.elmo) { cfg.hide = []; cfg.hair = null; const c = colorOf(equip.elmo, it('elmo')) ?? 0xb8c4d0; rc.Knight_Helmet = { '3,0': c, '7,0': c }; rc.Knight_HelmetVisor = { '3,0': c }; if (!/rei|ouro|prata/.test(equip.elmo)) cfg.hide.push('Knight_HelmetVisor'); }
  if (equip.armadura && equip.armadura !== 'roupa') { const c = colorOf(equip.armadura, it('armadura')); if (c != null) { rc.all['3,0'] = c; rc.all['7,0'] = c; } }
  if (equip.capa) { const c = colorOf(equip.capa, it('capa')); if (c != null) rc.Knight_Cape = { '0,1': c }; }
  if (equip.botas) { const c = colorOf(equip.botas, it('botas')); if (c != null) for (const k of ['Knight_LegLeft', 'Knight_LegRight']) { rc[k]['6,0'] = c; rc[k]['7,0'] = c; } }
  return cfg;
}
// residents cycle through these looks (index = resident number); children use the hooded rogue, small
export const VILLAGER_MODELS = [
  { model: 'char_rogue', h: 1.72, tint: 0xfff4e0, show: [], acc: [['strawhat', 0xe8c860]] }, { model: 'char_rogue', h: 1.75, tint: 0xc7dfff }, { model: 'char_barbarian', h: 1.85, tint: 0xdfcfbf },
  { model: 'char_barbarian', h: 1.78, tint: 0xd8f0d0, show: [], acc: [['apron', 0x9a6a3a]] }, { model: 'char_mage', h: 1.75, tint: 0xe7e7ff }, { model: 'char_rogue', h: 1.8, tint: 0xffe7cf },
  { model: 'char_mage', h: 1.7, tint: 0xffe0e0, show: [], acc: [['kerchief', 0x4a7ad8]] }, { model: 'char_rogue_hooded', h: 1.8, tint: 0xdfdfdf }, { model: 'char_barbarian', h: 1.8, tint: 0xd0e4ff, show: [], acc: [['strawhat', 0xd8b850]] },
];
export const CHILD_MODEL = { model: 'char_rogue_hooded', h: 1.25, tint: 0xffffc7 };
// Every person moves to the KayKit 2.0 bodies (one style, slimmer like Sir Thomas's sheet). The old 1.0 tables above
// keep their meaning: weapons in `show` become held kit items, hats/helmets/capes not listed are hidden.
const KK_OF = { char_knight: 'kk/knight', char_mage: 'kk/mage', char_barbarian: 'kk/barbarian', char_rogue: 'kk/rogue', char_rogue_hooded: 'kk/rogue_hooded' };
const KK_OPTIONAL = { 'kk/knight': ['Knight_Helmet', 'Knight_HelmetVisor', 'Knight_Cape'], 'kk/mage': ['Mage_Hat', 'Mage_Cape'], 'kk/barbarian': ['Barbarian_BearHat'], 'kk/rogue': ['Rogue_Cape'], 'kk/rogue_hooded': ['RogueHooded_Mask', 'RogueHooded_Cape'] };
const HELD = { '1H_Sword': ['r', 'kk/sword_1handed'], Rectangle_Shield: ['l', 'kk/shield_square'], Badge_Shield: ['l', 'kk/shield_badge'], Spellbook: ['l', 'kk/spellbook_closed'], '1H_Axe': ['r', 'kk/axe_1handed'] };
function toKK(cfg) {
  const model = KK_OF[cfg.model]; if (!model) return; const show = cfg.show ?? ATTACH[cfg.model] ?? [], keep = new Set();
  for (const s of show) { if (HELD[s]) { cfg.hold = cfg.hold || {}; cfg.hold[HELD[s][0]] = HELD[s][1]; } else keep.add(s.replace('Knight_Helmet', 'Knight_Helmet').replace('Rogue_Cape', model === 'kk/rogue_hooded' ? 'RogueHooded_Cape' : 'Rogue_Cape')); }
  if (keep.has('Knight_Helmet')) keep.add('Knight_HelmetVisor');
  cfg.hide = [...(cfg.hide || []), ...KK_OPTIONAL[model].filter(p => !keep.has(p))]; cfg.show = null; cfg.model = model; cfg.style = cfg.style || (cfg.h < 1.4 ? { head: 1, legs: 1.05, width: 0.92 } : {});
  if (cfg.partTint) cfg.partTint = Object.fromEntries(Object.entries(cfg.partTint).map(([k, v]) => [k.replace('Rogue_Cape', model === 'kk/rogue_hooded' ? 'RogueHooded_Cape' : 'Rogue_Cape'), v]));
}
// Monsters: model, forward = extra yaw so the model's front points +z, hover = flying height
const SK = { idle: 'Skeletons_Idle', walk: 'Skeletons_Walking', death: 'Skeletons_Death' };
export const MONSTER_MODELS = {
  esqueleto: { model: 'kk/skeleton_minion', forward: 0, roles: SK, hold: { r: 'kk/Skeleton_Blade' }, glow: 0xffb020 }, esqueleto_guerreiro: { model: 'kk/skeleton_warrior', forward: 0, roles: SK, hold: { r: 'kk/Skeleton_Axe', l: 'kk/Skeleton_Shield_Small_A' }, glow: 0xffb020 },
  esqueleto_mago: { model: 'kk/skeleton_mage', forward: 0, roles: SK, hold: { r: 'kk/Skeleton_Staff' }, glow: 0x60c0ff }, rei_esqueleto: { model: 'kk/skeleton_warrior', forward: 0, roles: SK, hold: { r: 'kk/Skeleton_Axe', l: 'kk/Skeleton_Shield_Large_A' }, hide: ['Skeleton_Warrior_Helmet'], acc: [['crown', 0xf6c12e]], tint: 0xdde8ff, glow: 0x50e0ff },
  coelho: { model: 'beast_rabbit', forward: 0 }, lobo: { model: 'beast_wolf', forward: 0 }, lobo_alfa: { model: 'beast_wolf_alpha', forward: 0 }, lobo_gelo: { model: 'beast_wolf_ice', forward: 0 },
  abelha: { model: 'mon_bee', forward: 0 }, serpente: { model: 'mon_snake', forward: 0 }, rato: { model: 'beast_rat', forward: 0 }, barata: { model: 'bug_roach', forward: 0 },
  morcego: { model: 'mon_bat', forward: 0 }, sapo: { model: 'beast_frog', forward: 0, tint: 0xf0e070 }, sapo_alfa: { model: 'beast_frog', forward: 0, tint: 0xffb050 }, geleca: { model: 'mon_slime', forward: 0 }, rei_geleca: { model: 'mon_slime_king', forward: 0 }, gaviao: { model: 'bird_hawk', forward: 0 }, dragao: { model: 'mon_dragon', forward: 0, tint: 0xff5a40 }, lobisomem: { model: 'kk/barbarian', forward: 0, style: { head: 1, legs: 1, width: 1.05 }, owl: { head: 'wolf', fur: 0xd8e6f2, ruff: 0xffffff, tuft: 0x8fb0cc, eyes: 0x50c0ff, beak: 0x2a4a6a } }, aranha: { model: 'beast_spider', forward: 0 }, aranha_rainha: { model: 'beast_spider_queen', forward: 0 },
};
// City sets (billboard name -> model); hScale corrects the model height relative to the old sprite height; rot = random yaw
for (const c of [...Object.values(CHAR_MODELS), ...VILLAGER_MODELS, CHILD_MODEL]) if (c !== CHAR_MODELS.thomas) toKK(c);
export const PROP_MODELS = {
  oak: { model: 'forest/Tree_1_A', hScale: 1.05, rot: true }, pine: { model: 'forest/Tree_4_A', hScale: 1.0, rot: true }, pineW: { model: 'forest/Tree_4_A', hScale: 1.0, rot: true, tint: 0xe8f0fa }, big: { model: 'forest/Tree_1_C', hScale: 0.85, rot: true }, bigW: { model: 'forest/Tree_Bare_1_A', hScale: 0.7, rot: true, tint: 0xe8e0d8 },
  lamp: { model: 'graveyard/lightpost-single', hScale: 1.0, tint: 0x8a8a90 }, statue: { model: 'nat_statue_column', hScale: 1.0 }, banner: { model: 'town/banner-red', hScale: 1.0 }, fence: { model: 'town/fence', hScale: 1.0 }, hedge: { model: 'town/hedge', hScale: 1.0 },
  bench: { model: 'graveyard/bench', hScale: 1.0 }, flowers: { model: 'nat_flower_red', hScale: 1.0, rot: true }, dummy: null, crates: { model: 'survival/box-large', hScale: 0.8, rot: true }, barrel: { model: 'survival/barrel', hScale: 0.8, rot: true }, well: null,
  grave: { model: 'graveyard/gravestone-round', hScale: 1.0 }, bush: { model: 'forest/Bush_1_A', hScale: 1.0, rot: true }, cart: { model: 'town/cart', hScale: 1.0 }, sign: { model: 'survival/signpost', hScale: 1.0 }, stallA: { model: 'town/stall-red', hScale: 1.0 }, stallB: { model: 'town/stall-green', hScale: 1.0 },
  fountain: { model: 'town/fountain-round', fit: 'w', wScale: 1.1 }, rock: { model: 'forest/Rock_3_A', hScale: 0.9, rot: true }, cavemouth: null, scorch: null, stalactite: { model: 'forest/Rock_1_A', hScale: 1.2, rot: true }, mushroom: { model: 'nat_mushroom_red', hScale: 1.0, rot: true },
};
// fixtures placed by code (furniture, torches, chests, campfires, Mordrak)
export const FIXTURE_MODELS = ['forest/Grass_1_A', 'forest/Grass_2_A', 'forest/Bush_1_A', 'dng_bed', 'dng_table', 'dng_chair', 'dng_shelves', 'dng_torch_lit', 'dng_chest_gold', 'survival/campfire-pit',
  'forest/Tree_3_A', 'forest/Tree_1_B', 'nat_grass_leafs', 'nat_mushroom_tan', 'nat_log', 'nat_stump', 'forest/Rock_1_C', 'forest/Rock_3_B', 'forest/Rock_1_E', 'nat_statue_obelisk', 'nat_statue_column', 'forest/Tree_4_A', 'forest/Tree_4_B',
  'mon_frog', 'mon_slime', 'mon_slime_king', 'mon_dragon'];
const heldNames = () => [...Object.values(CHAR_MODELS), ...VILLAGER_MODELS, CHILD_MODEL, ...Object.values(MONSTER_MODELS)].flatMap(c => c.hold ? Object.values(c.hold) : []).concat(Object.values(SWORDS), Object.values(SHIELDS)).map(h => Array.isArray(h) ? h[0] : h).filter(n => n && n.includes('/'));
const USED = [...[...FIXTURE_MODELS.map(model => ({ model })), ...Object.values(CHAR_MODELS), ...VILLAGER_MODELS, CHILD_MODEL, ...Object.values(MONSTER_MODELS), ...Object.values(PROP_MODELS)].filter(Boolean).map(m => m.model), ...heldNames(), ...Object.values(CHAR_MODELS).map(c => c.skin).filter(Boolean)];
export const MODEL_NAMES = MODE3D ? [...new Set(USED.flatMap(n => CLIP_SOURCE[n] ? [n, CLIP_SOURCE[n]] : [n]))] : [];
