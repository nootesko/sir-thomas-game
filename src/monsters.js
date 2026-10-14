// Monsters: one data-driven class for every creature. Killing one gives XP, drops items and coins, and it respawns later.
import * as THREE from 'three';
import * as S from './sprites.js';
import { Assets } from './assets.js';
import { ITEMS } from './items.js';
import { iconFor } from './icons.js';
import { makeBillboard, setBillboardImage, faceView, makeShadow } from './billboard.js';
import { Walker, dirFrom } from './anim.js';
import { Models, Actor, applyLook, MONSTER_MODELS } from './models.js';
const _v = new THREE.Vector3();
const R = (a, b) => a + Math.random() * (b - a);
export const MONSTERS = {
  coelho:    { name: 'Coelho', hp: 12, dmg: 0, speed: 5.5, aggro: 0, flee: 6, xp: 4, h: 0.8, asset: 'sprite_coelho', fb: 'RABBIT', drops: [['pe_coelho', 0.35], ['carne', 0.5]], gold: [0, 2], respawn: 25, rare: [['anel', 0.01]] },
  lobo:      { name: 'Lobo', hp: 40, dmg: 10, speed: 6, aggro: 16, xp: 18, h: 1.4, asset: 'sprite_lobo', fb: 'WOLF_GRAY', drops: [['pele_lobo', 0.5], ['carne', 0.4]], gold: [2, 6], respawn: 45, rare: [['botas', 0.03]] },
  lobo_gelo: { name: 'Lobo de Gelo', hp: 42, dmg: 12, speed: 6.2, aggro: 22, xp: 24, h: 1.5, asset: 'sprite_wolf_ice', fb: 'WOLF', drops: [['pele_lobo', 0.6]], gold: [3, 8], respawn: 60, howl: true },
  abelha:    { name: 'Abelha Gigante', hp: 18, dmg: 6, speed: 7.5, aggro: 12, xp: 10, h: 0.9, fly: 0.9, asset: 'sprite_abelha', fb: 'BEE', drops: [['ferrao_abelha', 0.5], ['mel', 0.35]], gold: [1, 3], respawn: 30, rare: [['pocao_g', 0.03]] },
  serpente:  { name: 'Serpente', hp: 30, dmg: 14, speed: 3.5, aggro: 8, xp: 16, h: 0.9, asset: 'sprite_serpente', fb: 'SNAKE', drops: [['escama_serpente', 0.5]], gold: [2, 5], respawn: 40, rare: [['amuleto', 0.02]], poison: true },
  rato:      { name: 'Rato do Esgoto', hp: 14, dmg: 5, speed: 5.5, aggro: 10, xp: 6, h: 0.7, asset: 'sprite_rato', fb: 'RAT', drops: [['rabo_rato', 0.6], ['queijo', 0.25]], gold: [0, 3], respawn: 20, rare: [['gazua', 0.06]] },
  barata:    { name: 'Barata Gigante', hp: 10, dmg: 3, speed: 6.5, aggro: 9, xp: 4, h: 0.6, asset: 'sprite_barata', fb: 'ROACH', drops: [['asa_barata', 0.7]], gold: [0, 1], respawn: 15, rare: [['gazua', 0.03]] },
  morcego:   { name: 'Morcego', hp: 16, dmg: 5, speed: 7.5, aggro: 13, xp: 8, h: 0.8, fly: 1.3, asset: 'sprite_morcego', fb: 'BAT', drops: [['presa_morcego', 0.5]], gold: [0, 3], respawn: 30, rare: [['pocao_p', 0.08]] },
  aranha:    { name: 'Aranha da Gruta', hp: 36, dmg: 11, speed: 4.8, aggro: 11, xp: 20, h: 1.0, asset: 'sprite_aranha', fb: 'SPIDER', drops: [['seda_aranha', 0.45]], gold: [2, 6], respawn: 45, rare: [['aco', 0.02]], poison: true },
  aranha_rainha: { name: 'Aranha Rainha', hp: 170, dmg: 20, speed: 4.2, aggro: 15, xp: 120, h: 2.4, asset: 'sprite_aranha', fb: 'SPIDER', drops: [['seda_aranha', 1.0], ['seda_aranha', 0.8]], gold: [30, 60], respawn: 600, rare: [['prata', 0.35], ['pocao_g', 0.6]], poison: true, boss: true },
  // ---- regions (docs/mundo.md) ----
  sapo:      { name: 'Sapo-Pantera', hp: 55, dmg: 12, speed: 6.5, aggro: 14, xp: 26, h: 1.0, fb: 'SNAKE', drops: [['pele_sapo', 0.5]], gold: [3, 8], respawn: 50, rare: [['antidoto', 0.1]], poison: true },
  sapo_alfa: { name: 'Sapo-Pantera Alfa', hp: 220, dmg: 20, speed: 7, aggro: 18, xp: 140, h: 1.8, fb: 'SNAKE', drops: [['pele_sapo', 1.0], ['pele_sapo', 0.8]], gold: [40, 70], respawn: 900, rare: [['botas_sapo', 1.0]], poison: true, boss: true },
  geleca:    { name: 'Geleca', hp: 45, dmg: 9, speed: 3.6, aggro: 11, xp: 22, h: 1.0, fb: 'SNAKE', drops: [['gosma', 0.6]], gold: [2, 6], respawn: 40, rare: [['pocao_p', 0.08]], slows: true },
  rei_geleca:{ name: 'Rei Geleca', hp: 380, dmg: 22, speed: 3.2, aggro: 16, xp: 220, h: 2.6, fb: 'SNAKE', drops: [['gosma', 1.0], ['pocao_g', 0.8]], gold: [70, 120], respawn: 1200, rare: [['coroa_geleca', 1.0]], slows: true, boss: true, split: 'geleca' },
  gaviao:    { name: 'Gavião', hp: 30, dmg: 9, speed: 8.5, aggro: 15, xp: 18, h: 1.0, fly: 1.6, fb: 'BAT', drops: [['pena', 0.55]], gold: [1, 4], respawn: 35 },
  dragao:    { name: 'Dragão Vermelho', hp: 900, dmg: 34, speed: 5.5, aggro: 22, xp: 600, h: 5.2, fb: 'BAT', drops: [['escama_vermelha', 1.0], ['escama_vermelha', 1.0], ['escama_dragao', 1.0]], gold: [300, 500], respawn: 1800, rare: [['olho_dragao', 1.0]], burns: true, boss: true },
  // Cripta Antiga (Guilda dos Aventureiros): KayKit skeletons, the Rei Esqueleto raises more of them at half life
  esqueleto:   { name: 'Esqueleto', hp: 55, dmg: 11, speed: 4.6, aggro: 15, xp: 26, h: 1.65, fb: 'SPIDER', drops: [['osso', 0.6]], gold: [3, 10], respawn: 120, rare: [['escudo_ferro', 0.03]] },
  esqueleto_guerreiro: { name: 'Esqueleto Guerreiro', hp: 90, dmg: 15, speed: 4.4, aggro: 16, xp: 42, h: 1.8, fb: 'SPIDER', drops: [['osso', 0.8]], gold: [6, 16], respawn: 150, rare: [['escudo_bronze', 0.03]] },
  esqueleto_mago: { name: 'Esqueleto Mago', hp: 60, dmg: 17, speed: 4.2, aggro: 18, xp: 40, h: 1.75, fb: 'SPIDER', drops: [['osso', 0.6], ['cogumelo_lunar', 0.3]], gold: [6, 14], respawn: 150, slows: true },
  rei_esqueleto: { name: 'Rei Esqueleto', hp: 700, dmg: 28, speed: 4.4, aggro: 20, xp: 450, h: 3.0, fb: 'SPIDER', drops: [['osso', 1.0], ['pocao_g', 1.0]], gold: [150, 260], respawn: 900, rare: [['coroa_ossos', 0.5]], boss: true, summon: 'esqueleto' },
  lobisomem: { name: 'Lobisomem de Gelo', hp: 520, dmg: 26, speed: 7.2, aggro: 26, xp: 350, h: 2.6, fb: 'WOLF', drops: [['coracao_gelo', 1.0], ['pele_lobo', 1.0]], gold: [80, 140], respawn: Infinity, rare: [['presa_lobisomem', 1.0]], slows: true, howl: true, boss: true, unique: 'wolfDead', summon: 'lobo_gelo' },
  lobo_alfa: { name: 'Lobo Alfa', hp: 140, dmg: 16, speed: 6.6, aggro: 22, xp: 90, h: 1.9, asset: 'sprite_lobo', fb: 'WOLF_GRAY', drops: [['pele_lobo', 1.0], ['carne', 0.8]], gold: [20, 40], respawn: 600, howl: true, rare: [['botas', 0.4]], boss: true },
};

export class Monster {
  constructor(game, id, x, z) {
    const c = MONSTERS[id]; this.game = game; this.id = id; this.cfg = c; this.name = c.name; this.kind = 'monster'; this.hittable = true; this.blocking = false; this.radius = 0.6;
    this.pos = new THREE.Vector3(x, 0, z); this.home = this.pos.clone(); this.hp = c.hp; this.alive = true; this.state = 'idle'; this.cool = 0; this.t = Math.random() * 6; this.flash = 0; this.slow = 0; this.burn = 0; this.dieT = 0; this.respawnT = 0; this.lunge = null; this.wander = null; this.wanderWait = R(1, 4);
    // HD sheets named after the monster id (the user's art: 4 directions x 3 steps, plus an optional 1-column attack sheet)
    const hd = Assets.has('sheet_' + id), sheet = hd ? 'sheet_' + id : 'sheet_' + (c.asset || '').replace(/^sprite_/, ''); const frames = Assets.has(sheet) ? (hd ? Assets.animAuto(sheet) : Assets.anim(sheet, Math.round(c.h * 40))) : null;
    this.atkFrames = hd && Assets.has(sheet + '_attack') ? Assets.animAuto(sheet + '_attack', 1) : null; this.upp = hd && frames ? c.h / frames.down[0].height : 0;
    const src = frames ? frames.down[0] : Assets.has(c.asset) ? Assets.images[c.asset] : S[c.fb]; const ratio = src.width / src.height; this.h = c.h; this.mesh = makeBillboard(src, c.h * ratio, c.h, true); this.mesh.position.copy(this.pos); game.scene.add(this.mesh);   // own material: the hit flash tints only this one
    this.walker = new Walker(this.mesh, frames); this.shadow = makeShadow(c.h * ratio * (c.fly ? 0.5 : 0.8)); game.scene.add(this.shadow); this.prev = this.pos.clone();
    const mm = MONSTER_MODELS[id]; if (mm && Models.has(mm.model)) { this.actor = new Actor(mm.model, { height: c.h, forward: mm.forward || 0 }); applyLook(this.actor, mm); game.scene.add(this.actor.root); this.mesh.visible = false; this.shadow.visible = false; this.actor.play('idle'); }
  }
  get hostile() { return this.cfg.aggro > 0; }
  takeDamage(d, from, sword, crit = false) {
    if (!this.alive) return; this.hp -= d; this.flash = 0.15; this.game.hud.float(Math.round(d) + (crit ? '!' : ''), _v.set(this.pos.x, this.h + 0.6, this.pos.z), crit ? 'crit' : ''); if (sword === 'glacial') this.slow = 2.5; if (sword === 'fogo') this.burn = 3;
    if (this.cfg.summon && !this.summoned && this.hp < this.cfg.hp * 0.5 && this.hp > 0) { this.summoned = true; this.game.audio.wolf(); this.game.hud.toast(this.cfg.summon === 'esqueleto' ? `${this.cfg.name} bate o cetro no chão: os mortos se levantam!` : `${this.cfg.name} uiva e chama a matilha!`, 2500); for (let i = 0; i < 3; i++) this.game.spawnMonster(this.cfg.summon, this.pos.x + (Math.random() - 0.5) * 8, this.pos.z + (Math.random() - 0.5) * 8, true); }
    _v.copy(this.pos).sub(from).setY(0).normalize(); if (!this.cfg.boss) this.game.city.resolveMove(this.pos, _v.x * 0.8, _v.z * 0.8, 0.5); this.cool = Math.max(this.cool, 0.4);
    this.state = this.hostile ? 'chase' : 'flee'; this.fleeT = 3;
    if (this.hp <= 0) this.die();
  }
  die() {
    const g = this.game, p = g.player, c = this.cfg; this.alive = false; this.dieT = 0; this.respawnT = c.respawn; p.stats.kills = (p.stats.kills || 0) + 1; p.stats.killsBy = p.stats.killsBy || {}; p.stats.killsBy[this.id] = (p.stats.killsBy[this.id] || 0) + 1; if (this.id.startsWith('lobo')) p.stats.wolves++; g.faith?.onKill(this); g.guild?.onKill(this);
    if (c.howl || this.id === 'lobo') g.audio.wolf(); else g.audio.squeak(); p.gainXp(c.xp); g.hud.toast(`${c.name} derrotado · +${c.xp} XP`, 1800);
    const items = []; for (const [id, chance] of c.drops) if (Math.random() < chance) items.push(id); for (const [id, chance] of c.rare || []) if (Math.random() < chance) { items.push(id); g.hud.toast(`Drop raro: ${ITEMS[id].name}!`, 3000); } g.quests.check();
    const gold = Math.round(R(c.gold[0], c.gold[1]) * (p.goldMul || 1)); g.spawnLoot(this.pos, items, gold);
    if (this.actor) this.actor.once('death', { hold: true });
    if (c.unique) { g.story.flags[c.unique] = true; g.save(); }   // unique bosses never come back
    if (c.split) for (let i = 0; i < 3; i++) g.spawnMonster(c.split, this.pos.x + (Math.random() - 0.5) * 4, this.pos.z + (Math.random() - 0.5) * 4, true);
  }
  revive() { this.alive = true; this.hp = this.cfg.hp; this.pos.copy(this.home); this.state = 'idle'; this.burn = 0; this.slow = 0; if (this.actor) { this.actor.root.visible = true; this.actor.play('idle'); this.actor.setColor(null); } else { this.mesh.visible = true; this.mesh.rotation.z = 0; } }
  update(dt) {
    const p = this.game.player, c = this.cfg, m = this.mesh; this.t += dt;
    if (!this.alive && this.actor) { this.dieT += dt; this.actor.update(dt); if (this.dieT >= 4) { this.actor.root.visible = false; this.respawnT -= dt; if (this.temp) { this.removed = true; this.actor.root.visible = false; } else if (this.respawnT <= 0 && this.pos.distanceTo(p.pos) > 30 && this.respawnT > -1e9) this.revive(); } return; }
    if (!this.alive) { this.dieT += dt; if (this.dieT < 4) { m.rotation.z = Math.min(Math.PI / 2, this.dieT * 4); m.position.y = -Math.max(0, this.dieT - 1.5) * 0.6; } else { m.visible = false; this.respawnT -= dt; if (this.respawnT <= 0 && this.pos.distanceTo(p.pos) > 30) this.revive(); } faceView(m); m.rotation.z = m.visible ? m.rotation.z : 0; this.shadow.visible = m.visible; return; }
    this.shadow.visible = !this.actor;   // 3D bodies carry their own (blob or real) shadow
    this.flash -= dt; if (this.actor) { const warn = this.state === 'windup' && Math.sin(this.t * 40) > 0; if (this.flash > 0 || this.burn > 0 || warn || this.tinted) { this.tinted = this.flash > 0 || this.burn > 0 || warn; this.actor.setColor(this.tinted ? (this.flash > 0 ? 0xff6060 : warn ? 0xffe070 : 0xffa050) : null); } } else m.material.color.setHex(this.flash > 0 ? 0xff6060 : this.burn > 0 ? 0xffa050 : this.game.sky.tint);
    if (this.burn > 0) { this.burn -= dt; this.hp -= 4 * dt; if (this.hp <= 0) { this.die(); return; } }
    this.slow = Math.max(0, this.slow - dt); const sp = this.slow > 0 ? c.speed * 0.4 : c.speed; this.cool -= dt;
    const d = this.pos.distanceTo(p.pos); const canSee = !p.dead && !p.frozen;
    if (this.state === 'flee') { this.fleeT -= dt; _v.copy(this.pos).sub(p.pos).setY(0).normalize(); this.game.city.resolveMove(this.pos, _v.x * sp * 1.3 * dt, _v.z * sp * 1.3 * dt, 0.4); if (this.fleeT <= 0 || d > 25) this.state = 'idle'; }
    else if (this.state === 'idle') {
      if (this.hostile && canSee && d < c.aggro) { this.state = 'chase'; if (c.howl) this.game.audio.wolf(); }
      else if (!this.hostile && canSee && c.flee && d < c.flee) { this.state = 'flee'; this.fleeT = 2.5; }
      else this.doWander(dt, sp);
    }
    else if (this.state === 'chase') {
      if (!canSee || d > c.aggro * 2.5 || this.pos.distanceTo(this.home) > 60) this.state = 'return';
      else if (d < 2.2 && this.cool <= 0) { this.state = 'windup'; this.windT = c.boss ? 0.6 : 0.42; }   // a visible wind-up before every bite: time to block or dodge
      else if (d >= 1.8) { _v.copy(p.pos).sub(this.pos).setY(0).normalize(); const strafe = Math.sin(this.t * 1.5) * 0.4; let sx = 0, sz = 0;
        // keep apart from the other attackers so a pack surrounds Thomas instead of stacking on one spot
        for (const o of this.game.chasers || []) { if (o === this) continue; const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, od = ox * ox + oz * oz; if (od < 2.2 && od > 1e-4) { const k = (2.2 - od) / 2.2 / Math.sqrt(od); sx += ox * k; sz += oz * k; } }
        this.game.city.resolveMove(this.pos, ((_v.x - _v.z * strafe) + sx * 1.5) * sp * dt, ((_v.z + _v.x * strafe) + sz * 1.5) * sp * dt, 0.5); }
      if (this.game.nextChasers) this.game.nextChasers.push(this);
    }
    else if (this.state === 'windup') {
      this.windT -= dt; if (!canSee) this.state = 'chase';
      else if (this.windT <= 0) { this.state = 'lunge'; this.lunge = { t: 0, dir: _v.copy(p.pos).sub(this.pos).setY(0).normalize().clone(), hit: false }; }
    }
    else if (this.state === 'lunge') {
      const L = this.lunge; L.t += dt; const k = L.t / 0.5; this.game.city.resolveMove(this.pos, L.dir.x * 9 * dt, L.dir.z * 9 * dt, 0.5);
      if (k > 0.35 && !L.hit && this.pos.distanceTo(p.pos) < 2.3 + (c.boss ? 0.8 : 0)) { L.hit = true; const r = p.takeDamage(c.dmg, this.pos); if (r === 'hit') { if (c.poison && !p.immune?.poison) p.poison = Math.max(p.poison || 0, 4); if (c.slows) p.status('slow', 2.5); if (c.burns) p.status('burn', 3.5); } }
      if (k >= 1) { this.state = 'chase'; this.cool = 1.4; }
    }
    else if (this.state === 'return') { _v.copy(this.home).sub(this.pos).setY(0); if (_v.length() < 1) { this.state = 'idle'; this.hp = Math.min(c.hp, this.hp + c.hp * 0.5); } else { _v.normalize(); this.game.city.resolveMove(this.pos, _v.x * sp * dt, _v.z * sp * dt, 0.4); } }
    const hop = this.state === 'lunge' ? Math.sin(this.lunge.t / 0.5 * Math.PI) * 0.6 : 0; const fly = c.fly ? c.fly + Math.sin(this.t * 6) * 0.15 : 0;
    const mdx = this.pos.x - this.prev.x, mdz = this.pos.z - this.prev.z; const moving = mdx * mdx + mdz * mdz > 1e-6; this.prev.copy(this.pos);
    if (this.actor) { const a = this.actor; if (!a.cull(this.pos.x, this.pos.z)) return; a.root.position.set(this.pos.x, (this.actor ? hop * 0.5 : hop) + fly, this.pos.z);
      if (moving) a.face(mdx, mdz); else if (this.state === 'chase' || this.state === 'lunge' || this.state === 'windup') a.face(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      if (this.state === 'lunge') { if (!this.lungeAnim) { this.lungeAnim = true; a.once('attack', { duration: 0.5 }); } } else { this.lungeAnim = false; if (!a.busy) a.play(this.state === 'chase' || this.state === 'flee' ? 'run' : moving ? 'walk' : 'idle', { speed: this.slow > 0 ? 0.5 : 1 }); }
      a.update(dt); return; }
    m.position.set(this.pos.x, hop + fly, this.pos.z); faceView(m); m.rotation.z = 0;
    const wk = this.walker; if (moving) wk.face(mdx, mdz); else if (this.state === 'chase' || this.state === 'lunge' || this.state === 'windup') wk.face(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
    if (this.atkFrames && (this.state === 'windup' || this.state === 'lunge')) { const img = (this.atkFrames[wk.dir] || this.atkFrames.down)[0]; if (img !== wk.cur) { wk.cur = img; setBillboardImage(m, img); } } else wk.update(dt, moving || this.state === 'lunge', 6 + c.speed * 0.6);
    if (this.upp && wk.cur) { m.scale.x = wk.cur.width * this.upp; m.scale.y = wk.cur.height * this.upp; }   // HD frames keep one pixel scale
    if (!wk.has) m.scale.x = Math.abs(m.scale.x) * ((moving ? mdx < 0 : p.pos.x < this.pos.x) ? -1 : 1);
    this.shadow.position.set(this.pos.x, 0.03, this.pos.z);
  }
  doWander(dt, sp) {
    if (this.wander) { _v.copy(this.wander).sub(this.pos).setY(0); if (_v.length() < 0.5) { this.wander = null; this.wanderWait = R(1, 5); } else { _v.normalize(); this.game.city.resolveMove(this.pos, _v.x * sp * 0.4 * dt, _v.z * sp * 0.4 * dt, 0.4); } }
    else { this.wanderWait -= dt; if (this.wanderWait <= 0) this.wander = new THREE.Vector3(this.home.x + R(-6, 6), 0, this.home.z + R(-6, 6)); }
  }
}

// An item or a pile of coins lying on the ground; picked up by walking over it.
export class Loot {
  constructor(game, x, z, item, qty = 1, gold = 0) {
    this.game = game; this.kind = 'loot'; this.item = item; this.qty = qty; this.gold = gold; this.alive = true; this.hittable = false; this.blocking = false; this.radius = 0.3; this.t = Math.random() * 6; this.life = 120;
    this.pos = new THREE.Vector3(x, 0, z); this.mesh = makeBillboard(gold ? iconFor('moedas') : iconFor(ITEMS[item].icon), 0.6, 0.6); this.mesh.material = this.mesh.material.clone(); this.mesh.material.depthTest = false; this.mesh.renderOrder = 15; game.scene.add(this.mesh);
  }
  update(dt) {
    this.t += dt; this.life -= dt; const p = this.game.player; this.mesh.position.set(this.pos.x, 0.15 + Math.abs(Math.sin(this.t * 3)) * 0.15, this.pos.z); faceView(this.mesh);
    if (this.life <= 0) this.remove(); else if (!p.dead && this.pos.distanceTo(p.pos) < 1.6) { if (this.gold) this.game.addGold(this.gold); else this.game.addItem(this.item, this.qty); this.game.audio.pickup(); this.remove(); }
  }
  remove() { this.game.scene.remove(this.mesh); this.removed = true; }
}
