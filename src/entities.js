import * as THREE from 'three';
import * as S from './sprites.js';
import { Assets } from './assets.js';
import { makeBillboard, setBillboardImage, faceView, makeShadow } from './billboard.js';
import { Walker } from './anim.js';
import { Models, Actor, applyLook, makeProp } from './models.js';
import { LOD } from './perf.js';
import { WALK_COST } from './tilemap.js';
const _v = new THREE.Vector3();
function label(text, color) { const c = document.createElement('canvas'); c.width = 256; c.height = 48; const x = c.getContext('2d'); x.font = 'bold 26px Trebuchet MS, sans-serif'; x.textAlign = 'center'; x.lineWidth = 6; x.strokeStyle = '#000'; x.strokeText(text, 128, 34); x.fillStyle = color; x.fillText(text, 128, 34); const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(3.2, 0.6, 1); return s; }
const bubbleCache = {};
function bubble(kind) { if (bubbleCache[kind]) return bubbleCache[kind]; const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); x.roundRect(6, 6, 52, 40, 8); x.fill(); x.beginPath(); x.moveTo(26, 46); x.lineTo(38, 46); x.lineTo(30, 58); x.fill(); x.fillStyle = '#2a1a0a'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText({ shop: '$', sleep: 'z', talk: '…', pray: '✝', drink: '♪', quest: '!', turnin: '?', work: '⚒' }[kind] || '?', 32, 27); const t = new THREE.CanvasTexture(c); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false })); s.scale.set(0.9, 0.9, 1); return bubbleCache[kind] = s.material; }

export class NPC {
  // routine: { home: house, job: 'feirante', ... } makes a resident with a daily schedule driven by game.day.hour
  // look: colors for the code-drawn human (gets 4 directions and steps); asset: single generated image; sheet: generated walking sheet (wins when present)
  constructor(game, { id, name, x, z, sprite = null, look = null, asset, sheet = null, model3d = null, color = '#fff', dialog, h = 1.9, kind = 'npc', path = null, routine = null, wander = 0, fly = 0 }) {
    this.game = game; this.id = id; this.name = name; this.kind = kind; this.alive = true; this.hittable = false; this.radius = 0.5; this.dialog = dialog; this.blocking = true;
    this.pos = new THREE.Vector3(x, 0, z);
    let frames = sheet && Assets.has(sheet) ? Assets.anim(sheet, 64) : null; if (!frames && !(asset && Assets.has(asset)) && !sprite && look) frames = S.humanFrames(look);
    const src = frames ? frames.down[0] : (asset && Assets.has(asset)) ? Assets.images[asset] : sprite || S.human(look || {}); const ratio = src.width / src.height;
    this.mesh = makeBillboard(src, h * ratio, h, true); this.mesh.position.copy(this.pos); game.scene.add(this.mesh); this.h = h; this.walker = new Walker(this.mesh, frames);
    this.shadow = makeShadow(h * ratio * 0.7); game.scene.add(this.shadow);
    // 3D body when its model exists (model3d from CHAR_MODELS / VILLAGER_MODELS); labels and bubbles then hang on the model
    if (model3d && Models.has(model3d.model)) { this.actor = new Actor(model3d.model, { height: model3d.h, width: model3d.w }); applyLook(this.actor, model3d); game.scene.add(this.actor.root); this.mesh.visible = false; this.shadow.visible = false; this.h = h = model3d.h; }
    if (name) { this.label = label(name, color); if (this.actor) { this.label.position.set(0, h + 0.35, 0); this.actor.root.add(this.label); } else { this.label.position.set(0, 1 + 0.3 / h, 0); this.mesh.add(this.label); this.label.scale.set(3.2 / (h * ratio), 0.6 / h, 1); } }
    this.t = Math.random() * 6; this.path = path; this.pi = 0; this.wait = 0; this.speed = 1.6; this.col = game.city.addDynamic({ type: 'circle', x, z, r: 0.4 });
    this.routine = routine; this.route = null; this.wp = 0; this.activity = null; this.actT = 0; this.sleeping = false; this.anchor = new THREE.Vector3(x, 0, z); this.wanderR = wander; this.bubbleT = 0; this.flyH = fly;
    if (routine) { this.wakeAt = 6.2 + Math.random() * 1.6; this.bedAt = 20.5 + Math.random() * 1.5; this.planT = 0; this.mood = Math.random(); }
    this.bub = new THREE.Sprite(bubble('talk')); this.bub.visible = false; if (this.actor) { this.bub.position.set(0, h + 0.8, 0); this.actor.root.add(this.bub); } else { this.bub.position.set(0, 1 + 0.75 / h, 0); this.bub.scale.set(0.9 / (h * ratio), 0.9 / h, 1); this.mesh.add(this.bub); }
  }
  setVisible(v) { this.hidden = !v; if (this.actor) this.actor.root.visible = v; else { this.mesh.visible = v; this.shadow.visible = v; } }
  moveTo(x, z) { this.pos.set(x, 0, z); this.mesh.position.copy(this.pos); this.col.x = x; this.col.z = z; this.anchor.set(x, 0, z); this.route = null; }
  say(kind, secs = 2.5) { this.bub.material = bubble(kind); this.bub.visible = true; this.bubbleT = secs; this.shownMark = undefined; }
  // walk to a world point along the tile grid, preferring sidewalks; door: the door to pass on arrival
  goTo(x, z, done = null) { const tm = this.game.city.tiles; this.route = tm.findPath(this.pos.x, this.pos.z, x, z, 70, WALK_COST, 30000); this.dest = [x, z]; this.onArrive = done; this.wp = 0; if (!this.route) { this.route = [[x, z]]; } }
  get busy() { return !!this.route; }
  // ---- daily schedule ----
  plan(hour) {
    const r = this.routine, c = this.game.city, pick = a => a && a.length ? a[Math.floor(Math.random() * a.length)] : null;
    const go = (kind, pt, secs, bub) => { if (!pt) return; this.activity = { kind, secs, bub }; const a = Math.random() * 6.28, r = 0.6 + Math.random() * 0.9; let x = pt[0] + Math.cos(a) * r, z = pt[1] + Math.sin(a) * r; if (c.blocked(x, z, 0.4)) { x = pt[0]; z = pt[1]; } this.goTo(x, z); };   // a little room around shared spots
    if (hour >= this.bedAt || hour < this.wakeAt) { if (this.activity?.kind !== 'sleep') { this.activity = { kind: 'sleep', secs: 1e9 }; const h = r.home; this.goTo(h.inside[0], h.inside[1], () => { this.sleepAt(h); }); } return; }
    if (this.sleeping) this.wakeUp();
    const k = Math.random();
    if (hour >= 18.5) { if (this.mood > 0.45 && k < 0.6) go('drink', pick(c.spots.taverna), 60 + Math.random() * 120, 'drink'); else go('stroll', pick(c.spots.praca), 30 + Math.random() * 60, null); return; }
    if (hour >= 11.5 && hour < 13 && k < 0.5) { go('eat', pick(c.spots.taverna) || pick(c.spots.praca), 40 + Math.random() * 40, 'drink'); return; }
    if (k < 0.55) { const spot = pick(c.spots[r.spot]) || pick(c.spots.praca); go('work', spot, 50 + Math.random() * 90, 'work'); }
    else if (k < 0.8) go('shop', pick(c.spots.market), 12 + Math.random() * 20, 'shop');
    else if (k < 0.9) go('pray', pick(c.spots.capela), 20 + Math.random() * 30, 'pray');
    else go('stroll', pick(c.spots.praca) || pick(c.spots.jardins), 20 + Math.random() * 40, null);
  }
  sleepAt(h) { this.sleeping = true; const b = h.bed || h.inside; h.sleepers = (h.sleepers || 0) + 1; this.sleepHouse = h; const k = h.sleepers - 1, off = k ? ((k % 2) ? 1 : -1) * Math.ceil(k / 2) * 0.9 : 0; this.pos.set(b[0] + off, 0, b[1] + off * 0.3); this.col.x = b[0]; this.col.z = b[1]; this.say('sleep', 1e9); }
  wakeUp() { if (this.sleepHouse) { this.sleepHouse.sleepers = Math.max(0, (this.sleepHouse.sleepers || 1) - 1); this.sleepHouse = null; } this.sleeping = false; this.bub.visible = false; this.activity = null; }
  update(dt) {
    this.t += dt; const g = this.game, c = g.city; if (this.hidden) return;
    if (this.bubbleT > 0) { this.bubbleT -= dt; if (this.bubbleT <= 0) this.bub.visible = false; }
    else if (this.questMark !== this.shownMark) { this.shownMark = this.questMark; this.bub.visible = !!this.questMark; if (this.questMark) this.bub.material = bubble(this.questMark === '!' ? 'quest' : 'turnin'); }
    let walking = false;
    if (this.routine && !g.player.frozen) {
      const hour = g.day.hour; this.planT -= dt;
      if (!this.route && (this.planT <= 0 || !this.activity)) { this.actT -= dt; if (this.actT <= 0 || !this.activity || (this.activity.kind !== 'sleep' && (hour >= this.bedAt || hour < this.wakeAt)) || (this.activity.kind === 'sleep' && hour >= this.wakeAt && hour < this.bedAt)) { this.plan(hour); this.actT = this.activity ? this.activity.secs : 10; if (this.activity?.bub) this.say(this.activity.bub, this.actT); } this.planT = 2 + Math.random() * 3; }
    }
    if (this.route) {
      const tgt = this.wp < this.route.length ? this.route[this.wp] : this.dest; _v.set(tgt[0] - this.pos.x, 0, tgt[1] - this.pos.z); const d = _v.length();
      if (d < 0.45) { this.wp++; if (this.wp > this.route.length) { this.route = null; const f = this.onArrive; this.onArrive = null; if (f) f(); } }
      else { _v.normalize(); const sp = this.speed * (this.routine ? 1.5 : 1); this.pos.x += _v.x * sp * dt; this.pos.z += _v.z * sp * dt; walking = true; }
      // doors swing open as residents pass through
      if (walking && (this.t % 0.5) < dt * 1.5) for (const dr of c.doors) { if (!dr.open && Math.abs(dr.x - this.pos.x) < 1.8 && Math.abs(dr.z - this.pos.z) < 1.8) c.pulseDoor(dr, 2.5); }
    } else if (this.path && !g.player.frozen) {
      if (this.wait > 0) this.wait -= dt; else { const tgt = this.path[this.pi]; _v.set(tgt[0] - this.pos.x, 0, tgt[1] - this.pos.z); const d = _v.length(); if (d < 0.4) { this.pi = (this.pi + 1) % this.path.length; this.wait = 1 + Math.random() * 3; } else { _v.normalize(); this.pos.x += _v.x * this.speed * dt; this.pos.z += _v.z * this.speed * dt; walking = true; } }
    } else if (this.wanderR > 0 && !this.sleeping && !g.player.frozen) {
      if (this.wait > 0) this.wait -= dt; else if (!this.wtgt) { this.wtgt = [this.anchor.x + (Math.random() - 0.5) * this.wanderR * 2, this.anchor.z + (Math.random() - 0.5) * this.wanderR * 2]; }
      if (this.wtgt) { _v.set(this.wtgt[0] - this.pos.x, 0, this.wtgt[1] - this.pos.z); const d = _v.length(); if (d < 0.3) { this.wtgt = null; this.wait = 2 + Math.random() * 5; } else { _v.normalize(); const nx = this.pos.x + _v.x * this.speed * 0.7 * dt, nz = this.pos.z + _v.z * this.speed * 0.7 * dt; if (!c.blocked(nx, nz, 0.4, this.col)) { this.pos.x = nx; this.pos.z = nz; walking = true; } else { this.wtgt = null; this.wait = 1; } } }
    }
    this.col.x = this.pos.x; this.col.z = this.pos.z;
    if (this.actor) { this.updateActor(dt, walking); return; }
    this.shadow.position.x = this.pos.x; this.shadow.position.z = this.pos.z; this.shadow.visible = this.mesh.visible && !this.sleeping;
    if (this.sleeping) { this.mesh.position.set(this.pos.x, 0.5, this.pos.z); faceView(this.mesh); this.mesh.rotation.z = Math.PI / 2; this.mesh.scale.x = Math.abs(this.mesh.scale.x); return; }
    const wk = this.walker, p = g.player;
    this.mesh.position.set(this.pos.x, Math.abs(Math.sin(this.t * 2)) * 0.02 + (walking && !wk.has ? Math.abs(Math.sin(this.t * 10)) * 0.08 : 0), this.pos.z);
    faceView(this.mesh); this.mesh.rotation.z = walking && !wk.has ? Math.sin(this.t * 10) * 0.05 : 0;
    if (walking) wk.face(_v.x, _v.z); else if (!this.routine || this.activity?.kind !== 'work') { const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z; if (dx * dx + dz * dz < 9) wk.face(dx, dz); }   // idle: turn to Thomas when he comes close
    wk.update(dt, walking, this.routine ? 8 : 6);
    if (!wk.has && walking && Math.abs(_v.x) > 0.1) this.mesh.scale.x = Math.abs(this.mesh.scale.x) * (_v.x < 0 ? -1 : 1);
    this.mesh.material.color.setHex(g.sky.tint);
  }
}

// NPC with a 3D body: facing, walking/idle/sleeping clips
NPC.prototype.updateActor = function (dt, walking) {
  const a = this.actor, p = this.game.player; if (!a.cull(this.pos.x, this.pos.z)) return; a.root.position.set(this.pos.x, this.flyH ? this.flyH + Math.sin(this.t * 1.6) * 0.25 : 0, this.pos.z);
  if (this.sleeping) { if (a.has('sleep')) { a.root.visible = true; a.play('sleep'); } else a.root.visible = false; a.update(dt); return; }
  a.root.visible = true;
  if (walking) { a.face(_v.x, _v.z); a.play('walk', { speed: this.routine ? 1.3 : 1 }); }
  else { if (!this.routine || this.activity?.kind !== 'work') { const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z; if (dx * dx + dz * dz < 9) a.face(dx, dz); } a.play(this.activity?.kind === 'drink' || this.activity?.kind === 'eat' ? 'sit' : 'idle'); }
  a.update(dt);
};

export class Boss {   // Mordrak as a giant vulture; scripted Chapter I fight
  constructor(game, center) {
    this.game = game; this.kind = 'boss'; this.alive = true; this.hittable = true; this.radius = 2.5; this.blocking = false;
    this.center = center.clone(); this.pos = center.clone().add(new THREE.Vector3(0, 50, 40)); this.phase = 'arrive'; this.t = 0; this.hits = 0; this.maxHits = 4; this.name = 'Mordrak'; this.fightT = 0; this.flash = 0; this.swoop = null; this.cool = 2; this.smoke = []; this.carrying = false;
    const src0 = Assets.has('sprite_mordrak_vulture') ? Assets.images.sprite_mordrak_vulture : S.VULTURE[0]; const ratio = src0.width / src0.height; this.w = 9; this.h = 9 / ratio;
    this.mesh = makeBillboard(src0, this.w, this.h); this.game.scene.add(this.mesh); this.frames = Assets.has('sprite_mordrak_vulture') ? [src0] : S.VULTURE;
    this.smokeMat = new THREE.MeshBasicMaterial({ color: 0x1a1020, transparent: true, opacity: 0.8 });
    // 3D body: an animated hawk (flapping), darkened into a giant vulture
    if (Models.has('bird_vulture')) { this.actor = new Actor('bird_vulture', { height: 3.2 }); applyLook(this.actor, {}); this.actor.root.scale.setScalar(1.6); game.scene.add(this.actor.root); this.mesh.visible = false; this.actor.play('walk'); this.prevPos = this.pos.clone(); }
  }
  takeDamage() { if (this.phase !== 'fight' || !this.near) return; this.hits++; this.flash = 0.2; this.game.audio.vulture(); this.game.hud.toast(`Acertou Mordrak! (${this.hits}/4)`); }
  grab() { const c = this.game.city; c.lightMesh.visible = false; c.lightBeam.visible = false; c.lightGlow.visible = false; this.carrying = true; this.gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.8, 0), new THREE.MeshBasicMaterial({ color: 0xffe066 })); this.game.scene.add(this.gem); this.gemLight = new THREE.PointLight(0xffd23a, 60, 40); this.game.scene.add(this.gemLight); c.lightPoint.intensity = 0; }
  puff(at, size) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), this.smokeMat.clone()); m.position.copy(at); m.userData = { t: 0, vel: new THREE.Vector3(S.rand(-1, 1), S.rand(0.5, 1.5), S.rand(-1, 1)) }; this.game.scene.add(m); this.smoke.push(m); }
  update(dt) {
    const p = this.game.player; this.t += dt; const c = this.center; this.flash -= dt; this.near = false;
    if (this.frames.length > 1) setBillboardImage(this.mesh, this.frames[Math.floor(this.t * (this.phase === 'fight' ? 8 : 5)) % 2]);
    if (this.phase === 'arrive') { _v.set(c.x, c.y + 1.5, c.z); this.pos.lerp(_v, 1 - Math.pow(0.001, dt)); if (this.pos.distanceTo(_v) < 0.8) { this.grab(); this.phase = 'hover'; this.t = 0; this.game.audio.vulture(); } }
    else if (this.phase === 'hover') { const a = this.t * 0.6; _v.set(c.x + Math.cos(a) * 12, c.y - 8 + Math.sin(this.t) * 1.5, c.z + Math.sin(a) * 12); this.pos.lerp(_v, 1 - Math.pow(0.01, dt)); }
    else if (this.phase === 'fight') {
      this.fightT += dt; this.cool -= dt; const ap = this.game.city.altar;
      if (!this.swoop) { const a = this.t * 0.9; _v.set(ap.x + Math.cos(a) * 10, 9 + Math.sin(this.t * 1.3), ap.z + Math.sin(a) * 10); this.pos.lerp(_v, 1 - Math.pow(0.02, dt)); if (this.cool <= 0) { this.swoop = { t: 0, from: this.pos.clone(), to: p.pos.clone().add(new THREE.Vector3(0, 1.6, 0)), hit: false }; this.game.audio.vulture(); } }
      else { const s = this.swoop; s.t += dt / 1.1; const k = s.t;
        if (k < 1) { this.pos.lerpVectors(s.from, s.to, k); this.pos.y += Math.sin(k * Math.PI) * -2; if (k > 0.55) this.near = this.pos.distanceTo(p.pos) < 6; if (k > 0.8 && !s.hit) { s.hit = true; if (this.pos.distanceTo(p.pos) < 4.5) p.takeDamage(14, this.pos); } }
        else if (k < 1.7) { this.near = this.pos.distanceTo(p.pos) < 5; this.pos.y += 7 * dt; this.pos.addScaledVector(_v.copy(s.to).sub(s.from).setY(0).normalize(), 5 * dt); }
        else { this.swoop = null; this.cool = 2.0; } }
      if (this.hits >= 4 || this.fightT > 60) { this.phase = 'charge'; this.t = 0; this.swoop = null; this.game.onBossCharge(); }
    }
    else if (this.phase === 'charge') { _v.copy(p.pos).add(p.forward.multiplyScalar(8)).setY(p.pos.y + 4); this.pos.lerp(_v, 1 - Math.pow(0.01, dt)); if (Math.random() < dt * 25) this.puff(this.pos.clone().add(new THREE.Vector3(S.rand(-2, 2), S.rand(-1, 1), S.rand(-2, 2))), S.rand(0.3, 0.9)); if (this.t > 2.8) { this.phase = 'blast'; this.t = 0; for (let i = 0; i < 40; i++) this.puff(this.pos.clone().add(new THREE.Vector3(S.rand(-2, 2), S.rand(-1, 1), S.rand(-2, 2))), S.rand(0.5, 1.5)); this.game.onBossBlast(); } }
    else if (this.phase === 'blast') { this.smoke.forEach(m => m.userData.vel.lerp(_v.copy(p.pos).setY(p.pos.y + 1.4).sub(m.position).normalize().multiplyScalar(14), 0.2)); if (this.t > 0.9) { this.phase = 'done'; this.t = 0; } }
    else if (this.phase === 'done') { this.pos.y += 14 * dt; this.pos.x += 10 * dt; }
    if (this.actor) { const a = this.actor; a.root.position.copy(this.pos); a.root.position.y -= 2.4; const dx = this.pos.x - this.prevPos.x, dz = this.pos.z - this.prevPos.z; if (dx * dx + dz * dz > 1e-5) { const want = Math.atan2(dx, dz); let d = want - a.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); a.yaw += d * Math.min(1, dt * 6); a.root.rotation.y = a.yaw; } this.prevPos.copy(this.pos);
      a.play('walk', { speed: this.swoop ? 1.8 : 1 }); a.setColor(this.flash > 0 ? 0xff6060 : null); a.update(dt); }
    else { this.mesh.position.copy(this.pos); this.mesh.position.y -= this.h / 2; faceView(this.mesh); this.mesh.material.color.setHex(this.flash > 0 ? 0xff6060 : this.game.sky.tint); }
    if (this.gem) { this.gem.position.copy(this.pos).add(new THREE.Vector3(0, -this.h / 2 - 0.3, 0)); this.gem.rotation.y += dt * 2; this.gemLight.position.copy(this.gem.position); }
    for (let i = this.smoke.length - 1; i >= 0; i--) { const m = this.smoke[i]; m.userData.t += dt; m.position.addScaledVector(m.userData.vel, dt); m.scale.multiplyScalar(1 + dt * 0.6); m.material.opacity = Math.max(0, 0.8 - m.userData.t * 0.35); if (m.material.opacity <= 0) { this.game.scene.remove(m); this.smoke.splice(i, 1); } }
  }
  remove() { this.game.scene.remove(this.mesh); if (this.actor) this.game.scene.remove(this.actor.root); if (this.gem) { this.game.scene.remove(this.gem); this.game.scene.remove(this.gemLight); } this.smoke.forEach(m => this.game.scene.remove(m)); }
}

const FLAME_GEO = new THREE.ConeGeometry(0.28, 0.9, 7); const FLAME_MAT = new THREE.MeshBasicMaterial({ color: 0xffb030, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }); const FLAME_MAT2 = new THREE.MeshBasicMaterial({ color: 0xff5a10, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
export class Prop {   // chests, campfires, lore objects, shield prop, grates, ladders
  constructor(game, { kind, x, z, w, h, src, item, lit, title, text, yOff = 0, collide = true, flat = false }) {
    this.game = game; this.kind = kind; this.pos = new THREE.Vector3(x, 0, z); this.item = item; this.opened = false; this.lit = !!lit; this.title = title; this.text = text; this.alive = true; this.hittable = false; this.radius = 0.5; this.t = Math.random() * 6; this.blocking = collide;
    this.srcs = Array.isArray(src) ? src : [src]; this.w = w; this.h = h; this.mesh = makeBillboard(this.srcs[0], w, h); this.mesh.position.set(x, yOff, z); this.flat = flat; if (flat) { this.mesh.rotation.x = -Math.PI / 2; this.mesh.position.z += h / 2; } game.scene.add(this.mesh);
    if (!flat && yOff === 0) { this.shadow = makeShadow(w * 0.8); this.shadow.position.set(x, 0.03, z); game.scene.add(this.shadow); }
    if (collide) game.city.addDynamic({ type: 'circle', x, z, r: 0.6 });
    if (kind === 'fire') { this.light = new THREE.PointLight(0xff8c2a, 0, 18, 1.5); this.light.position.set(x, 1.4, z); game.scene.add(this.light); }
    // 3D versions: a KayKit chest, a Kenney fire pit with flickering flames
    const model = kind === 'chest' ? ['dng_chest_gold', 0.95] : kind === 'fire' ? ['survival/campfire-pit', 0.62] : null;
    if (model && Models.has(model[0])) { this.model = makeProp(model[0], model[1], Math.random() * 6.28); this.model.position.set(x, 0, z); game.scene.add(this.model); this.mesh.visible = false;
      if (kind === 'fire') { this.flame = new THREE.Group(); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(FLAME_GEO, i ? FLAME_MAT2 : FLAME_MAT); f.position.set(Math.cos(i * 2.1) * 0.18 * (i ? 1 : 0), 0.45, Math.sin(i * 2.1) * 0.18 * (i ? 1 : 0)); f.scale.setScalar(i ? 0.6 : 1); this.flame.add(f); } this.flame.position.set(x, 0.2, z); game.scene.add(this.flame); } }
  }
  update(dt) {
    this.t += dt;
    if (this.model) {
      if (this.kind === 'fire') { this.flame.visible = this.lit && LOD.near(this.pos.x, this.pos.z); if (this.flame.visible) this.flame.children.forEach((f, i) => { const k = 1 + Math.sin(this.t * (9 + i * 3) + i) * 0.15; f.scale.set((i ? 0.6 : 1) * k, (i ? 0.6 : 1) * (2 - k), (i ? 0.6 : 1) * k); }); this.light.intensity = this.lit ? 22 + Math.sin(this.t * 9) * 4 : 0; }
      if (this.kind === 'chest' && this.opened && !this.shownOpen) { this.shownOpen = true; this.model.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.setHex(0x8a7a6a); } }); }
      return;
    }
    if (!this.flat) faceView(this.mesh);
    if (this.kind === 'fire') { const img = this.lit ? (this.srcs.length > 2 ? this.srcs[1 + Math.floor(this.t * 8) % 2] : this.srcs[1] || this.srcs[0]) : this.srcs[0]; setBillboardImage(this.mesh, img); this.light.intensity = this.lit ? 22 + Math.sin(this.t * 9) * 4 : 0; }
    if (this.kind === 'chest') setBillboardImage(this.mesh, this.srcs[this.opened ? 1 : 0]);
  }
}
