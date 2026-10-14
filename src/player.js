import * as THREE from 'three';
import * as S from './sprites.js';
import { Assets } from './assets.js';
import { makeBillboard, faceView, setBillboardImage } from './billboard.js';
import { Walker } from './anim.js';
import { Models, Actor, applyLook, CHAR_MODELS, thomasLook } from './models.js';
import { ITEMS } from './items.js';
import { VIEW } from './view.js';
import { WALL } from './city.js';
import { TILE } from './tilemap.js';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const _v = new THREE.Vector3();
export class Player {
  constructor(game) {
    this.game = game; this.camera = game.camera; this.pos = new THREE.Vector3(-18, 0, 50); this.vel = new THREE.Vector3(); this.yaw = 0; this.pitch = 0; this.eye = 1.65;
    this.hp = 100; this.maxHp = 100; this.cold = 0; this.frozen = false; this.dead = false; this.moving = false; this.bobT = 0;
    this.swing = -1; this.swingType = 'h'; this.blocking = false; this.dodge = 0; this.dodgeDir = new THREE.Vector3(); this.hurtT = 0; this.shake = 0; this.invuln = 0; this.canAttack = true; this.hitDone = false; this.attackCool = 0;
    this.leftItem = 'none'; this.sword = 'real'; this.shieldCrack = false; this.coldResist = 0; this.defense = 0; this.damage = 18; this.stats = { hits: 0, wolves: 0, chests: 0, kills: 0, killsBy: {} }; this.poison = 0; this.critChance = 0.08;
    // progression: XP, level and attribute points (ataque, velocidade de ataque, defesa)
    this.level = 1; this.xp = 0; this.points = 0; this.attr = { ataque: 0, velocidade: 0, defesa: 0, folego: 0 };
    // stamina: running, dodging, swinging and blocking spend it; it comes back after a short rest
    this.stamina = 100; this.maxStamina = 100; this.staminaWait = 0; this.tired = false; this.gold = 0; this.inventory = {}; this.regenPool = 0; this.swingTime = 0.4;
    this.stepping = false; this.stepFrom = new THREE.Vector3(); this.stepTo = new THREE.Vector3(); this.stepT = 0; this.stepDur = 0.3; this.path = null; this.target = null;
    // visible body (third person): the three-quarter sheet (4 directions x 3 steps) when it exists, else the single front-view image
    const look = { hair: '#5a2d12', tunic: '#2b5fc7', legs: '#1e46a8', trim: '#f6c12e' };
    let frames = Assets.has('sheet_thomas') ? Assets.animAuto('sheet_thomas') : null; if (!frames && !Assets.has('sprite_thomas')) frames = S.humanFrames(look);
    const src = frames ? frames.down[0] : Assets.has('sprite_thomas') ? Assets.images.sprite_thomas : S.human(look);
    this.h = 1.9; this.w = this.h * src.width / src.height; this.mesh = makeBillboard(src, this.w, this.h, true); this.mesh.material.depthTest = false; this.mesh.renderOrder = 20; game.scene.add(this.mesh);   // always visible, even behind roofs and trees
    this.walker = new Walker(this.mesh, frames); this.running = false;
    // optional extra sheets in the same 4-direction layout: attack (3 frames: wind-up, strike, follow-through) and block
    this.atkFrames = frames && Assets.has('sheet_thomas_attack') ? Assets.animAuto('sheet_thomas_attack', Math.max(1, Math.round(Assets.images.sheet_thomas_attack.width / (Assets.images.sheet_thomas.width / 3)))) : null; this.blockFrames = frames && Assets.has('sheet_thomas_block') ? Assets.animAuto('sheet_thomas_block') : null;
    this.upp = frames ? this.h / frames.down[0].height : 0;   // world units per sprite pixel: every sheet keeps the same scale, whatever its cell size
    // 3D body (Diablo look): the KayKit knight, animated; the sprite stays as fallback when the model is missing
    const cm = CHAR_MODELS.thomas; this.actor = cm && Models.has(cm.model) ? new Actor(cm.model, { height: cm.h }) : null;
    if (this.actor) { this.mesh.visible = false; this.h = cm.h; this.rebuildLook(); }
    this.slash = new THREE.Mesh(new THREE.RingGeometry(1.0, 2.6, 18, 1, 0, 1.8), new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    this.slash.visible = false; game.scene.add(this.slash);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false })); this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = 0.04; game.scene.add(this.shadow); if (this.actor) this.shadow.visible = false;
  }
  // the 3D body follows the equipment: a new actor with the look of what Thomas wears (models.js thomasLook)
  rebuildLook() {
    const cm = CHAR_MODELS.thomas; if (!Models.has(cm.model)) return; const eq = this.game.equip || {}; const key = JSON.stringify(eq); if (key === this.lookKey) return; this.lookKey = key;
    const old = this.actor; const a = new Actor(cm.model, { height: cm.h }); applyLook(a, thomasLook(eq, ITEMS)); if (old && old.root.parent) { a.root.position.copy(old.root.position); a.root.rotation.copy(old.root.rotation); old.root.parent.remove(old.root); }
    this.game.scene.add(a.root); this.actor = a; this.shieldPart = a.model.getObjectByName('Held_l'); a.play('idle');
  }
  // stamina helpers: spend returns false (and flashes the bar) when there is not enough
  spend(n) { if (this.stamina < n) { this.game.hud.tired(); return false; } this.stamina -= n; this.staminaWait = 0.7; return true; }
  // status effects from monsters: 'slow' (jelly, ice), 'burn' (dragon); poison has its own timer
  status(kind, secs) { if (this.immune?.[kind]) return; const k = kind + 'T'; const fresh = !(this[k] > 0); this[k] = Math.max(this[k] || 0, secs); if (fresh) this.game.hud.float(kind === 'slow' ? 'Lento!' : 'Queimando!', _v.set(this.pos.x, 2.6, this.pos.z), kind === 'slow' ? 'miss' : 'hurt'); }
  cure() { this.poison = 0; this.slowT = 0; this.burnT = 0; }
  // Giro do Relâmpago: a spin that hits everything around Thomas (Q or the lightning button)
  spinAttack() {
    if (this.skillCool > 0 || this.swing >= 0 || this.blocking) return; if (!this.spend(30)) return; this.skillCool = 5; this.spin = 0.5; this.game.audio.swing(); this.shake = Math.max(this.shake, 0.3);
    let any = false; for (const e of this.game.entities) { if (!e.hittable || !e.alive) continue; const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z); if (d < 3.6 + (e.radius || 0.5)) { e.takeDamage(this.damage * 1.5 * (0.9 + Math.random() * 0.2), this.pos, this.sword, false); any = true; } }
    if (any) { this.game.audio.hit(); this.stats.hits++; } if (this.actor) this.actor.once('attack2', { duration: 0.45 });
  }
  get canBlock() { return !!this.game.equip.escudo || this.leftItem === 'shield'; }
  // nearest creature worth hitting (touch has no mouse to aim): within reach, preferring the one in front
  nearestFoe(r = 6) { let best = null, bd = r * r; for (const e of this.game.entities) { if (!e.hittable || !e.alive || e.removed || (e.kind === 'monster' && !e.hostile && e.state !== 'flee' && !e.cfg.flee)) continue; const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z; const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = e; } } return best; }
  aim() { const inp = this.game.input; if (inp.touch || !inp.mouseUsed) { const e = this.target || this.nearestFoe(); if (e) this.faceDir(e.pos.x - this.pos.x, e.pos.z - this.pos.z); return; } this.faceMouse(); }
  xpToNext() { return Math.floor(40 * Math.pow(this.level, 1.6)); }
  gainXp(n) { this.xp += n; let up = false; while (this.xp >= this.xpToNext()) { this.xp -= this.xpToNext(); this.level++; this.points += 3; up = true; } if (up) { this.game.applyEquip(); this.hp = this.maxHp; this.game.audio.chime(); this.game.hud.toast(`Nível ${this.level}! +3 pontos de atributo (tecla C)`, 3500); } }
  spendPoint(attr) { if (this.points <= 0 || !(attr in this.attr)) return false; this.points--; this.attr[attr]++; this.game.applyEquip(); return true; }
  get forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
  faceDir(dx, dz) { if (dx * dx + dz * dz > 1e-6) this.yaw = Math.atan2(-dx, -dz); }
  // World point under the mouse cursor (ground plane y = 0).
  aimPoint() {
    const m = this.game.input.mouse; _v.set(m.nx, m.ny, 0.5).unproject(this.camera); const dir = _v.sub(this.camera.position).normalize(); if (Math.abs(dir.y) < 1e-4) return null;
    const t = -this.camera.position.y / dir.y; if (t < 0) return null; return new THREE.Vector3(this.camera.position.x + dir.x * t, 0, this.camera.position.z + dir.z * t);
  }
  faceMouse() { const a = this.aimPoint(); if (a) this.faceDir(a.x - this.pos.x, a.z - this.pos.z); }
  teleport(x, z, yaw) { this.pos.set(x, 0, z); if (yaw != null) this.yaw = yaw; this.pitch = 0; this.vel.set(0, 0, 0); this.path = null; this.target = null; }
  snap(force = false) { const tm = this.game.city.tiles; if (!tm) return; const x = tm.snap(this.pos.x), z = tm.snap(this.pos.z); if (force || !this.game.city.blocked(x, z, 0.45)) this.pos.set(x, 0, z); }
  startSwing() { if (!this.spend(9)) return; this.swing = 0; this.hitDone = false; this.swingType = this.swingType === 'h' ? 'v' : 'h'; this.game.audio.swing(); }
  // click: a creature under the cursor becomes the target (walk up and auto-attack); otherwise walk to the clicked tile
  pickEntity() { const m = this.game.input.mouse, cam = this.camera; let best = null, bd = 1; for (const e of this.game.entities) { if (!e.hittable || !e.alive || e.removed) continue; _v.copy(e.pos); _v.y += (e.h || 1.2) * 0.5; _v.project(cam); const d = Math.hypot((_v.x - m.nx) * cam.aspect, _v.y - m.ny); const lim = Math.max(0.09, (e.radius || 0.6) * 0.1); if (d < lim && d < bd) { bd = d; best = e; } } return best; }
  onClick() { const e = this.pickEntity(); if (e) { this.target = e; this.path = null; return; } const a = this.aimPoint(); if (!a) return;
    // a click near Thomas while a creature is close is a swing toward the cursor, not a walk (Diablo-style)
    if (this.nearestFoe(3.6) && Math.hypot(a.x - this.pos.x, a.z - this.pos.z) < 7) { this.target = null; this.path = null; this.faceDir(a.x - this.pos.x, a.z - this.pos.z); if (this.swing < 0 && this.attackCool <= 0 && !this.blocking && this.canAttack) this.startSwing(); return; } this.target = null; this.path = this.game.city.tiles.findPath(this.pos.x, this.pos.z, a.x, a.z); if (!this.path) this.faceDir(a.x - this.pos.x, a.z - this.pos.z); }
  takeDamage(amount, fromPos) {
    if (this.dead || this.invuln > 0) return 'none'; const a = this.game.audio;
    if (this.blocking && this.canBlock) { let facing = true; if (fromPos) { const to = fromPos.clone().sub(this.pos).setY(0).normalize(); facing = to.dot(this.forward) > 0.2; } if (facing && this.stamina >= 6) { this.stamina = Math.max(0, this.stamina - Math.min(30, 6 + amount * 0.8)); this.staminaWait = 0.9; a.block(); this.shake = Math.max(this.shake, 0.25); this.blockFlash = 0.2; return 'blocked'; } }
    const dmg = Math.max(1, amount - this.defense * 0.5); this.hp = Math.max(0, this.hp - dmg); this.hurtT = 0.5; this.game.hud.float('-' + Math.round(dmg), _v.set(this.pos.x, 2.3, this.pos.z), 'hurt'); this.shake = Math.max(this.shake, 0.5); this.invuln = 0.35; a.hurt();
    if (this.hp <= 0) { this.dead = true; this.game.onPlayerDeath(); } return 'hit';
  }
  heal(v) { this.hp = Math.min(this.maxHp, this.hp + v); }
  update(dt) {
    const inp = this.game.input, city = this.game.city;
    if (inp.wheel) VIEW.dist = clamp(VIEW.dist + inp.wheel * 0.012, VIEW.minDist, VIEW.maxDist);
    const tm = city.tiles; this.moving = false;
    if (inp.mouse.leftClick && !this.frozen && !this.dead) this.onClick();
    if (!this.frozen && !this.dead) {
      // ---- Tibia-like movement: one tile per step, 8 directions, keyboard or click-to-walk ----
      let dx = 0, dz = 0; if (inp.down('fwd')) dz -= 1; if (inp.down('back')) dz += 1; if (inp.down('right')) dx += 1; if (inp.down('left')) dx -= 1;
      if (!dx && !dz && inp.joy.mag > 0.15) { dx = inp.joy.x; dz = inp.joy.z; }   // touch joystick (analog)
      if (dx || dz) { this.path = null; this.target = null; }
      this.blocking = inp.blockHeld && this.canBlock; if (this.blocking) this.aim();
      if (inp.blockHeld && !this.canBlock) { const now = performance.now(); if (now - (this.noShieldT || 0) > 2500) { this.noShieldT = now; this.game.hud.toast('Sem escudo! Equipe um na Bolsa ou compre na Forja do Lucas', 2200); } }
      const wantRun = inp.down('run') && !this.blocking && (dx || dz || this.path) && !this.tired; const running = this.running = wantRun && this.stamina > 0;
      const analog = !inp.down('fwd') && !inp.down('back') && !inp.down('left') && !inp.down('right') && inp.joy.mag > 0.15 ? Math.min(1, 0.35 + inp.joy.mag * 0.75) : 1;
      let sp = (running ? 9.5 : 5.6 * analog) * (this.blocking ? 0.55 : 1); if (city.winter) sp *= 0.9; if (this.slowT > 0) sp *= 0.55; sp *= this.speedMul || 1;
      // chase and auto-attack the clicked target
      if (this.target) { const t = this.target; if (!t.alive || t.removed || t.pos.distanceTo(this.pos) > 40) this.target = null;
        else { const d = t.pos.distanceTo(this.pos); if (d <= 2.6 + (t.radius || 0)) { this.path = null; if (!this.blocking) this.faceDir(t.pos.x - this.pos.x, t.pos.z - this.pos.z); if (this.swing < 0 && this.attackCool <= 0 && this.canAttack && !this.blocking) this.startSwing(); }
          else { this.repathT = (this.repathT || 0) - dt; if (this.repathT <= 0 || !this.path) { this.repathT = 0.5; this.path = tm.findPath(this.pos.x, this.pos.z, t.pos.x, t.pos.z) || null; } } } }
      // direction: keys, else the next waypoint of the click path
      const wish = new THREE.Vector3(dx, 0, dz);
      if (!dx && !dz && this.path) { while (this.path.length && Math.hypot(this.path[0][0] - this.pos.x, this.path[0][1] - this.pos.z) < 0.5) this.path.shift(); if (this.path.length) wish.set(this.path[0][0] - this.pos.x, 0, this.path[0][1] - this.pos.z); else this.path = null; }
      if (wish.lengthSq() > 0) { wish.normalize(); this.moving = this.dodge <= 0; if (!this.blocking && this.swing < 0) this.faceDir(wish.x, wish.z); }
      if (running && this.moving) { this.stamina -= 13 * dt; this.staminaWait = 0.5; if (this.stamina <= 0) { this.stamina = 0; this.tired = true; this.game.hud.tired(); } }
      this.vel.lerp(wish.multiplyScalar(this.moving ? sp : 0), 1 - Math.pow(0.0005, dt));
      if (this.moving) for (const dr of city.doors) { if (!dr.open && !dr.locked && Math.abs(dr.x - this.pos.x) < 1.6 && Math.abs(dr.z - this.pos.z) < 1.6) city.pulseDoor(dr, 3); }   // unlocked doors swing open as Thomas walks into them
      if (this.dodge <= 0) { const bx = this.pos.x, bz = this.pos.z; city.resolveMove(this.pos, this.vel.x * dt, this.vel.z * dt); if (this.path && Math.hypot(this.pos.x - bx, this.pos.z - bz) < 0.002 && this.moving) { this.stuckT = (this.stuckT || 0) + dt; if (this.stuckT > 0.4) { this.path = null; this.stuckT = 0; } } else this.stuckT = 0; }
      if (inp.pressed.Space && this.dodge <= 0 && this.dodgeCool <= 0 && this.spend(Math.round(22 * (this.dodgeMul || 1)))) { this.dodge = 0.28; this.dodgeCool = 0.9; this.dodgeDir.copy(this.forward.multiplyScalar(this.moving || dx || dz ? 1 : -1)); this.game.audio.dodge(); this.invuln = 0.4; this.path = null; }
      if (this.dodge > 0) { this.dodge -= dt; const d = 17 * dt; city.resolveMove(this.pos, this.dodgeDir.x * d, this.dodgeDir.z * d); }
      this.bobT += (running ? 13 : 9) * dt * (this.moving ? 1 : 0);
      if (inp.pressed.KeyQ) this.spinAttack();
      if ((inp.pressed.KeyF || inp.pressed.ControlLeft || inp.attackHeld) && this.swing < 0 && this.attackCool <= 0 && !this.blocking && this.canAttack) { this.aim(); this.startSwing(); }
    } else { this.blocking = false; this.vel.multiplyScalar(0.8); }
    this.staminaWait -= dt; if (this.staminaWait <= 0 && !this.blocking && !(this.running && this.moving)) this.stamina = Math.min(this.maxStamina, this.stamina + (this.moving ? 20 : 32) * (this.regenMul || 1) * dt); if (this.tired && this.stamina > this.maxStamina * 0.35) this.tired = false;
    this.dodgeCool = Math.max(0, (this.dodgeCool || 0) - dt); this.invuln = Math.max(0, this.invuln - dt); this.attackCool = Math.max(0, this.attackCool - dt);
    if (this.swing >= 0) { this.swing += dt / this.swingTime; if (this.swing > 0.35 && !this.hitDone) { this.hitDone = true; this.doHit(); } if (this.swing >= 1) { this.swing = -1; this.attackCool = 0.1; } }
    // cold
    if (city.winter) {
      let nearFire = false; for (const e of this.game.entities) if (e.kind === 'fire' && e.lit && e.pos.distanceTo(this.pos) < 6) nearFire = true;
      const inside = Math.abs(this.pos.x) < WALL && Math.abs(this.pos.z) < WALL;
      if (nearFire) this.cold = Math.max(0, this.cold - 0.5 * dt); else this.cold = clamp(this.cold + (inside ? 0.004 : 0.02) * (1 - this.coldResist) * dt, 0, 1);
      if (this.cold >= 1 && !this.dead) { this.hp = Math.max(0, this.hp - 2 * dt); if (this.hp <= 0) { this.dead = true; this.game.onPlayerDeath(); } }
    } else this.cold = 0;
    if (this.poison > 0 && !this.dead) { this.poison -= dt; this.hp = Math.max(1, this.hp - 1.5 * dt); }
    this.slowT = Math.max(0, (this.slowT || 0) - dt); this.skillCool = Math.max(0, (this.skillCool || 0) - dt);
    if (this.burnT > 0 && !this.dead) { this.burnT -= dt; this.hp -= 3 * dt; if (this.hp <= 0) { this.hp = 0; this.dead = true; this.game.onPlayerDeath(); } }
    if (this.spin > 0) { this.spin -= dt; const s = this.spinRing || (this.spinRing = (() => { const m = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.6, 28), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })); m.rotation.x = -Math.PI / 2; this.game.scene.add(m); return m; })()); s.visible = this.spin > 0; s.position.set(this.pos.x, 0.15, this.pos.z); s.material.opacity = Math.max(0, this.spin / 0.5) * 0.85; s.scale.setScalar(0.6 + (0.5 - this.spin) * 0.9); s.rotation.z += dt * 20; }
    if (this.regenPool > 0 && !this.dead) { const h = Math.min(this.regenPool, 5 * dt); this.heal(h); this.regenPool -= h; }
    this.hurtT = Math.max(0, this.hurtT - dt); this.shake = Math.max(0, this.shake - dt * 1.5); this.blockFlash = Math.max(0, (this.blockFlash || 0) - dt);
    this.updateBody(dt);
    // camera: fixed angle above and south of the player, north up
    const sh = this.shake, V = VIEW, asp = this.camera.aspect, dist = V.dist * (asp < 1 ? 1 + (1 - asp) * 0.75 : 1);   // tall phone screens see more ground
    this.camDist = dist; const cy = Math.sin(V.pitch) * dist, cz = Math.cos(V.pitch) * dist;
    this.camera.position.set(this.pos.x + (Math.random() - 0.5) * sh * 0.3, cy + (Math.random() - 0.5) * sh * 0.3, this.pos.z + cz);
    this.camera.lookAt(this.pos.x, 0.9, this.pos.z);
  }
  updateBody(dt = 0) {
    const m = this.mesh, f = this.forward, sw = this.swing >= 0 ? Math.sin(this.swing * Math.PI) : 0, wk = this.walker;
    if (this.actor) { this.updateActor(dt, f, sw); return; }
    const hop = this.moving && !wk.has ? Math.abs(Math.sin(this.bobT)) * 0.08 : 0; const lunge = sw * 0.45 + (this.dodge > 0 ? 0.2 : 0);
    m.position.set(this.pos.x + f.x * lunge, hop, this.pos.z + f.z * lunge); faceView(m);
    m.rotation.z = (this.dodge > 0 ? Math.sin(this.dodge / 0.28 * Math.PI) * 0.5 : sw * 0.3) * (f.x < -0.05 ? 1 : -1) + (this.moving && !wk.has ? Math.sin(this.bobT) * 0.05 : 0);
    let pose = null; if (wk.has) { wk.face(f.x, f.z); const set = this.swing >= 0 && this.atkFrames ? this.atkFrames : this.blocking && this.blockFrames ? this.blockFrames : null;
      if (set) { const fr = set[wk.dir] || set.down; pose = set === this.atkFrames ? fr[Math.min(fr.length - 1, Math.floor(this.swing * fr.length))] : fr[Math.min(fr.length - 1, 1)]; if (pose !== wk.cur) { wk.cur = pose; setBillboardImage(m, pose); } } else wk.update(dt, this.moving, this.running ? 11 : 8); }
    if (wk.has) { const img = wk.cur; m.scale.x = img ? img.width * this.upp : this.w; if (!pose) m.scale.x *= this.blocking && !this.blockFrames ? 0.9 : 1; }   // sheet: real steps in the facing direction
    else m.scale.x = (f.x < -0.05 ? -1 : 1) * this.w * (this.blocking ? 0.9 : 1);   // single image: mirrored when facing west, a small sway when walking
    m.scale.y = wk.has && wk.cur ? wk.cur.height * this.upp * (this.blocking && !this.blockFrames ? 0.92 : 1) : this.h * (this.blocking ? 0.92 : 1);
    if (pose) m.rotation.z = 0;   // drawn poses carry the motion themselves
    m.material.color.setHex(this.hurtT > 0 ? 0xff6060 : this.blocking ? 0xa0c0ff : this.game.sky.tint);
    this.shadow.position.x = this.pos.x; this.shadow.position.z = this.pos.z;
    const s = this.slash; s.visible = sw > 0.05; if (s.visible) { s.position.set(this.pos.x, 0.12, this.pos.z); s.rotation.set(-Math.PI / 2, 0, this.yaw + Math.PI / 2 - 0.9); s.material.opacity = 0.85 * sw; s.scale.setScalar(0.7 + 0.4 * this.swing); }
  }
  // animated 3D body: position, facing and which clip plays
  updateActor(dt, f, sw) {
    if (this.shieldPart) this.shieldPart.visible = this.canBlock;
    const a = this.actor, lunge = sw * 0.25 + (this.dodge > 0 ? 0.2 : 0);
    a.root.position.set(this.pos.x + f.x * lunge, 0, this.pos.z + f.z * lunge); a.face(f.x, f.z);
    if (this.dead) { if (a.role !== 'death') a.once('death', { hold: true }); }
    else if (this.swing >= 0) { if (!this.swingPlayed) { this.swingPlayed = true; a.once(this.swingType === 'h' ? 'attack' : 'attack2', { duration: this.swingTime * 1.1 }); } }
    else { this.swingPlayed = false; if (a.role === 'death') a.play('idle'); if (!a.busy) { if (this.blocking) a.play('block'); else if (this.dodge > 0) a.play('dodge'); else if (this.moving) a.play(this.running ? 'run' : 'walk', { speed: this.running ? 1.15 : 1.25 }); else a.play('idle'); } }
    a.setColor(this.hurtT > 0 ? 0xff6060 : this.blocking ? 0xa0c0ff : null); a.update(dt);
    const s = this.slash; s.visible = sw > 0.05; if (s.visible) { s.position.set(this.pos.x, 0.12, this.pos.z); s.rotation.set(-Math.PI / 2, 0, this.yaw + Math.PI / 2 - 0.9); s.material.opacity = 0.85 * sw; s.scale.setScalar(0.7 + 0.4 * this.swing); }
  }
  doHit() {
    const f = this.forward; let any = false;
    for (const e of this.game.entities) { if (!e.hittable || !e.alive) continue; const to = e.pos.clone().sub(this.pos); const dy = Math.abs(to.y - 1.2); to.y = 0; const d = to.length(); if (d < 2.8 + e.radius && dy < 4 && to.normalize().dot(f) > 0.5) { const crit = Math.random() < (this.critChance || 0.08); e.takeDamage(this.damage * (crit ? 1.8 : 1) * (0.9 + Math.random() * 0.2), this.pos, this.sword, crit); if (this.burnHit && e.alive && e.kind === 'monster') e.burn = Math.max(e.burn || 0, 3); any = true; if (crit) this.shake = Math.max(this.shake, 0.4); } }
    if (any) { this.game.audio.hit(); this.stats.hits++; this.shake = Math.max(this.shake, 0.15); }
  }
}
