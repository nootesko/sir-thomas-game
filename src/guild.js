// Guilda dos Aventureiros: a guild master on the Campo de Treino hands out three daily missions (hunt, gather, dungeon),
// pays gold and XP and raises Thomas's guild rank; herbs grow around the kingdom and can be picked; the Cripta Antiga
// (a walled dungeon in the north-west corner of the map) holds skeletons and the Rei Esqueleto.
// State lives in story.flags.guild, so the normal save keeps it.
import * as THREE from 'three';
import { ITEMS } from './items.js';
import { MONSTERS } from './monsters.js';
import { PERF } from './perf.js';
import { Assets } from './assets.js';
import { BillboardSet } from './billboard.js';

export const CRYPT = { x0: -345, x1: -222, z0: -345, z1: -222, entry: [-236, -236], boss: [-300, -310] };
export const GUILD_SPOT = { master: [52, -70], board: [47, -73] };
export const RANKS = [['Recruta', 0], ['Bronze', 40], ['Prata', 120], ['Ouro', 300], ['Lenda', 700]];
const HUNTS = [['lobo', 8], ['coelho', 6], ['sapo', 6], ['geleca', 8], ['esqueleto', 6], ['gaviao', 4], ['aranha', 6], ['morcego', 8], ['rato', 10], ['lobo_gelo', 6], ['serpente', 5]];
export const HERBS = {
  erva_prata: { name: 'Erva-Prata', color: 0xcfe8d0, flower: 0xffffff },
  flor_sol: { name: 'Flor-do-Sol', color: 0x5aa83a, flower: 0xffc21a },
  cogumelo_lunar: { name: 'Cogumelo Lunar', color: 0xe8e0d0, flower: 0x5aa0ff },
};
const RESPAWN = 180;

// ---------- the crypt: stone walls, chambers, torches (built once with the city) ----------
export function buildCrypt(city) {
  const C = CRYPT, w = C.x1 - C.x0, d = C.z1 - C.z0, cx = (C.x0 + C.x1) / 2, cz = (C.z0 + C.z1) / 2, H = 3.4;
  const mat = city.mk(city.tex.stone, 4, 1); mat.color.setHex(0x6a6478);
  const wall = (x, z, ww, dd) => { city.box(ww, H, dd, mat, x, H / 2, z); city.addBox(x, z, ww, dd); };
  wall(cx, C.z0, w + 2, 2); wall(cx, C.z1, w + 2, 2); wall(C.x0, cz, 2, d); wall(C.x1, cz, 2, d);
  // entry hall (south-east) -> long corridor west -> bone chambers -> throne room (north-west)
  wall(C.x1 - 30, C.z1 - 25, 2, 46); wall(C.x1 - 60, C.z1 - 40, 2, 76); wall(cx + 10, C.z0 + 45, 70, 2); wall(C.x0 + 45, cz + 10, 2, 60);
  wall(C.x0 + 30, C.z0 + 55, 56, 2); wall(cx - 5, C.z1 - 30, 40, 2); wall(C.x0 + 75, C.z0 + 25, 2, 46);
  city.cryptLights = [];
  const torch = city.fset ? city.fset('dng_torch_lit') : null;
  for (const [x, z] of [[C.x1 - 10, C.z1 - 8], [C.x1 - 45, C.z1 - 15], [cx, cz], [C.x0 + 20, cz + 30], [C.x0 + 60, C.z0 + 35], [C.boss[0], C.boss[1] + 12], [C.boss[0] + 18, C.boss[1]], [cx + 30, C.z0 + 20]]) {
    if (torch) torch.add(x, z, 1.4, 0); const l = new THREE.PointLight(0xffa850, 34, 30, 1.3); l.position.set(x, 2.4, z); city.scene.add(l); city.cryptLights.push(l); }
  // the throne: a dais and a stone chair
  if (Assets.has('art_throne')) { city.addBox(C.boss[0], C.boss[1] - 9, 3, 1.4); return; }   // the throne is the user's art (a sprite placed by main.js)
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.5, 0.3, 16), mat); dais.position.set(C.boss[0], 0.15, C.boss[1] - 6); city.scene.add(dais);
  const throne = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 1.2), mat); throne.position.set(C.boss[0], 1.6, C.boss[1] - 9); throne.castShadow = PERF.shadows; city.scene.add(throne); city.addBox(C.boss[0], C.boss[1] - 9, 2.4, 1.2);
}
export const inCrypt = (x, z) => x >= CRYPT.x0 && x <= CRYPT.x1 && z >= CRYPT.z0 && z <= CRYPT.z1;
export const cryptBlocked = (x, z) => x < CRYPT.x1 + 10 && z < CRYPT.z1 + 10;

// one plant model per herb, merged and vertex-colored (one InstancedMesh per herb kind for the whole map)
function herbGeometry(kind) {
  const H = HERBS[kind], parts = [], col = (g, c) => { g = g.toNonIndexed(); g.deleteAttribute('uv'); const n = g.attributes.position.count, a = new Float32Array(n * 3), cc = new THREE.Color(c); for (let i = 0; i < n; i++) cc.toArray(a, i * 3); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
  if (kind === 'cogumelo_lunar') { for (const [x, z, s] of [[0, 0, 1], [0.28, 0.12, 0.7], [-0.22, 0.2, 0.6]]) { parts.push(col(new THREE.CylinderGeometry(0.07 * s, 0.09 * s, 0.35 * s, 6).translate(x, 0.17 * s, z), H.color)); parts.push(col(new THREE.SphereGeometry(0.22 * s, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(x, 0.33 * s, z), H.flower)); } }
  else { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; parts.push(col(new THREE.ConeGeometry(0.06, 0.55, 4).rotateZ(0.35).rotateY(a).translate(Math.cos(a) * 0.08, 0.26, Math.sin(a) * 0.08), H.color)); }
    for (const [x, z] of [[0, 0], [0.15, 0.1], [-0.12, 0.12]]) parts.push(col(new THREE.SphereGeometry(kind === 'flor_sol' ? 0.12 : 0.07, 7, 5).scale(1, kind === 'flor_sol' ? 0.5 : 1, 1).translate(x, 0.55, z), H.flower)); }
  const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'color']) { const tot = parts.reduce((s, p) => s + p.attributes[k].array.length, 0), arr = new Float32Array(tot); let o = 0; for (const p of parts) { arr.set(p.attributes[k].array, o); o += p.attributes[k].array.length; } g.setAttribute(k, new THREE.BufferAttribute(arr, 3)); }
  return g;
}

export class Guild {
  constructor(game) { this.game = game; this.herbs = []; this.meshes = {}; this.m = new THREE.Matrix4(); this.lastHour = null; }
  get s() { const f = this.game.story.flags; if (!f.guild) f.guild = { day: 0, missions: null, points: 0, done: 0, joined: false }; return f.guild; }
  rank(pts = this.s.points) { let r = RANKS[0]; for (const k of RANKS) if (pts >= k[1]) r = k; return r[0]; }
  nextRank() { return RANKS.find(k => k[1] > this.s.points) || null; }

  // ---------- herbs ----------
  placeHerbs(city) {
    const W = 90, rng = (() => { let s = 4242; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(), R = (a, b) => a + rng() * (b - a);
    const zones = { erva_prata: [[W + 15, -150, W + 170, 150, 22], [-80, 100, 60, 170, 8]], flor_sol: [[-150, -345, -40, -255, 10], [W + 20, 60, W + 150, 160, 10]], cogumelo_lunar: [[-345, 35, -175, 185, 9], [-55, -345, 195, -155, 9], [W + 185, -340, 345, -100, 6]] };
    for (const [kind, list] of Object.entries(zones)) for (const [x0, z0, x1, z1, n] of list) for (let i = 0, tries = 0; i < n && tries < n * 30; tries++) { const x = R(x0, x1), z = R(z0, z1); if (city.blocked(x, z, 0.8) || inCrypt(x, z)) continue; this.herbs.push({ kind, x, z, t: 0, rot: R(0, 6.28) }); i++; }
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    for (const kind of Object.keys(HERBS)) { const list = this.herbs.filter(h => h.kind === kind), art = Assets.images['art_' + kind];
      if (art) { const bb = new BillboardSet(this.game.scene, art, list.length, 0), H = 1.1, W = H * art.width / art.height; list.forEach((h, i) => { h.i = i; bb.add(h.x, h.z, W, H); }); bb.finalize(); bb.W = W; bb.H = H; this.meshes[kind] = { bb, instanceMatrix: {} }; continue; }   // the user's painted herb
      const mesh = new THREE.InstancedMesh(herbGeometry(kind), kind === 'cogumelo_lunar' ? Object.assign(mat.clone(), { emissive: new THREE.Color(0x10204a) }) : mat, list.length); list.forEach((h, i) => { h.i = i; this.setHerb(mesh, h, true); }); mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); mesh.castShadow = false; this.game.scene.add(mesh); this.meshes[kind] = mesh; }
  }
  setHerb(mesh, h, on) { if (mesh.bb) { const it = mesh.bb.items[h.i]; it.w = on ? mesh.bb.W : 0; it.h = on ? mesh.bb.H : 0; mesh.bb.fy = null; mesh.bb.face(); return; } this.m.makeRotationY(h.rot).scale(new THREE.Vector3(on ? 1.4 : 0, on ? 1.4 : 0, on ? 1.4 : 0)).setPosition(h.x, 0, h.z); mesh.setMatrixAt(h.i, this.m); }
  pick(h) {
    const g = this.game, mesh = this.meshes[h.kind]; h.t = RESPAWN; this.setHerb(mesh, h, false); mesh.instanceMatrix.needsUpdate = true;
    const n = 1 + (Math.random() < 0.25 ? 1 : 0); g.addItem(h.kind, n); g.audio.pickup(); this.progress('coleta', h.kind, n); g.player.gainXp(2);
  }
  nearHerb(pos) { let best = null, bd = 2.2; for (const h of this.herbs) { if (h.t > 0) continue; const d = Math.hypot(h.x - pos.x, h.z - pos.z); if (d < bd) { bd = d; best = h; } } return best; }

  // ---------- daily missions ----------
  newMissions(day) {
    const r = a => a[Math.floor(Math.random() * a.length)], [mon, n] = r(HUNTS), herb = r(Object.keys(HERBS)), hn = 4 + Math.floor(Math.random() * 4);
    const [mon2, n2] = r(HUNTS.filter(h => h[0] !== mon));
    return { day, list: [
      { type: 'caca', id: mon, n, have: 0, gold: 30 + n * 6, xp: 25 + n * 3, pts: 10 },
      { type: 'coleta', id: herb, n: hn, have: 0, gold: 20 + hn * 6, xp: 15 + hn * 3, pts: 8 },
      Math.random() < 0.6 ? { type: 'masmorra', id: 'rei_esqueleto', n: 1, have: 0, gold: 220, xp: 160, pts: 25 } : { type: 'caca', id: mon2, n: n2 + 2, have: 0, gold: 40 + n2 * 7, xp: 30 + n2 * 3, pts: 12 },
    ].map(m => ({ ...m, claimed: false })) };
  }
  missionText(m) { const what = m.type === 'coleta' ? `Colher ${m.n}× ${HERBS[m.id].name}` : m.type === 'masmorra' ? 'Limpar a Cripta Antiga (derrotar o Rei Esqueleto)' : `Caçar ${m.n}× ${MONSTERS[m.id]?.name || m.id}`; return `${what} — ${Math.min(m.have, m.n)}/${m.n}${m.claimed ? ' ✓ entregue' : m.have >= m.n ? ' · pronta!' : ''}`; }
  progress(type, id, n = 1) { const s = this.s; if (!s.joined || !s.missions) return; for (const m of s.missions.list) { if (m.claimed || m.have >= m.n) continue; if ((m.type === type || (type === 'caca' && m.type === 'masmorra')) && m.id === id) { m.have = Math.min(m.n, m.have + n); if (m.have >= m.n) { this.game.hud.toast(`Missão da Guilda pronta: ${this.missionText(m).split(' — ')[0]}. Volte à Mestra da Guilda`, 3500); this.game.audio.chime(); } } } this.game.quests.refresh(); }
  onKill(mon) { this.progress('caca', mon.id); }

  update(dt) {
    const g = this.game, s = this.s, h = g.day.hour;
    if (this.lastHour != null && h < this.lastHour - 12) { s.day = (s.day || 0) + 1; if (s.joined) g.hud.toast('Novo dia: a Guilda tem missões novas no quadro', 3000); }
    this.lastHour = h; if (s.joined && (!s.missions || s.missions.day !== s.day)) s.missions = this.newMissions(s.day);
    for (const hb of this.herbs) if (hb.t > 0) { hb.t -= dt; if (hb.t <= 0) { const mesh = this.meshes[hb.kind]; this.setHerb(mesh, hb, true); mesh.instanceMatrix.needsUpdate = true; } }
  }

  // ---------- the guild master ----------
  async talk() {
    const g = this.game, st = g.story, s = this.s, name = 'Mestra Brígida';
    if (!s.joined) {
      await st.say(name, 'Sir Thomas! A Guilda dos Aventureiros sempre teve as portas abertas para a espada do reino.', 'Aqui o trabalho é simples: o quadro tem três missões por dia. Caçar o que ameaça as estradas, colher ervas para a Erveira e os curandeiros, e descer na Cripta Antiga quando os mortos se levantam.', 'Cada missão cumprida rende moedas e reputação. Reputação vira patente: Recruta, Bronze, Prata, Ouro... e Lenda, para quem aguentar.');
      const c = await st.choose(name, 'Quer o seu nome no livro da Guilda?', [{ label: 'Pode escrever.', hint: 'entrar na Guilda' }, { label: 'Depois.', hint: '' }]); if (c !== 0) return;
      s.joined = true; s.missions = this.newMissions(s.day); await st.say(name, 'Bem-vindo, Recruta Thomas. As missões de hoje estão no quadro. Ervas crescem nos campos (Erva-Prata), nas colinas (Flor-do-Sol) e nos lugares úmidos e frios (Cogumelo Lunar).'); g.quests.refresh(); g.save();
    }
    for (;;) {
      const ready = s.missions.list.filter(m => !m.claimed && m.have >= m.n), nr = this.nextRank();
      const head = `Patente: ${this.rank()} · ${s.points} de reputação${nr ? ` (${nr[0]} com ${nr[1]})` : ''}\n` + s.missions.list.map((m, i) => `${i + 1}. ${this.missionText(m)}`).join('\n');
      const opts = [...(ready.length ? [{ label: `Entregar ${ready.length} missão(ões) pronta(s)`, hint: `+${ready.reduce((a, m) => a + m.gold, 0)} moedas`, act: 'claim' }] : []), { label: 'Descer na Cripta Antiga', hint: 'masmorra de esqueletos · o Rei Esqueleto guarda o fundo', act: 'crypt' }, { label: 'Sobre ervas e patentes', act: 'info' }, { label: 'Sair', act: 'exit' }];
      const c = await st.choose(name, head, opts); const act = opts[c]?.act;
      if (act === 'claim') { const before = this.rank(); let gold = 0, xp = 0; for (const m of ready) { m.claimed = true; gold += m.gold; xp += m.xp; s.points += m.pts; s.done = (s.done || 0) + 1; } g.addGold(gold); g.player.gainXp(xp); g.faith?.like('ouren', 2 * ready.length, 'cumpriu a palavra'); if (this.rank() !== before) { g.audio.chime(); await st.say(name, `Patente nova: ${this.rank()}! O livro da Guilda não mente.`); } g.quests.refresh(); g.save(); continue; }
      if (act === 'crypt') { if (s.points < RANKS[1][1]) { const ok = await st.choose(name, 'A cripta é perigosa para um Recruta. Os esqueletos batem forte e o Rei Esqueleto chama reforços. Vai mesmo assim?', [{ label: 'Vou.' }, { label: 'Ainda não.' }]); if (ok !== 0) continue; } await g.travel(CRYPT.entry[0], CRYPT.entry[1], 'Cripta Antiga'); return; }
      if (act === 'info') { await st.say(name, 'Ervas renascem em três minutos depois de colhidas. A Erveira compra todas, e algumas missões pedem as raras.', 'Patentes: Bronze com 40 de reputação, Prata com 120, Ouro com 300, Lenda com 700. Cada missão vale de 8 a 25.'); continue; }
      return;
    }
  }
  // quest log section (J)
  renderLog(list) {
    const s = this.s; if (!s.joined || !s.missions) return; const el = document.createElement('div'); el.className = 'quest';
    el.innerHTML = `<b>Guilda dos Aventureiros · ${this.rank()}</b>${s.missions.list.map(m => `<div class="st">${this.missionText(m)}</div>`).join('')}<div class="st">Entregue as missões prontas à Mestra Brígida (Campo de Treino).</div>`; list.appendChild(el);
  }
}
