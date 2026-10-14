import * as THREE from 'three';
import { Assets, ASSET_NAMES, TOP, sliceSheet } from './assets.js';
import * as S from './sprites.js';
import * as PX from './pixel.js';
import { Sky } from './sky.js';
import { Player } from './player.js';
import { Overlay } from './overlay.js';
import { Minimap } from './minimap.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { Audio } from './audio.js';
import { Story } from './story.js';
import { Quests } from './quests.js';
import { NPC, Boss, Prop } from './entities.js';
import { Monster, Loot, MONSTERS } from './monsters.js';
import { ITEMS, SLOTS, sellPrice } from './items.js';
import { City, WALL, SEWER, CAVE } from './city.js';
import { JOBS } from './houses.js';
import { Lockpick, DIFF_NAMES } from './lockpick.js';
import { VIEW } from './view.js';
import { Models, MODEL_NAMES, CHAR_MODELS, VILLAGER_MODELS, CHILD_MODEL } from './models.js';
import { PERF, LOD, LightPool, mergeStatic, FrameGovernor } from './perf.js';
import { Snow } from './weather.js';
import { Faith, GODS } from './gods.js';
import { Guild, GUILD_SPOT, CRYPT, HERBS } from './guild.js';

const PIXEL = 1, DAY_SECONDS = 720;   // one full day lasts 12 real minutes
const S_GRATE = (() => { const [c, x] = S.canvas(16, 16); x.fillStyle = '#2a2a30'; x.beginPath(); x.arc(8, 8, 7, 0, 7); x.fill(); x.fillStyle = '#55555f'; for (let i = 2; i < 14; i += 3) x.fillRect(i, 3, 1, 10); return c; })();
// a rolled page with a red ribbon (the Lost Pages of the Great Library)
const S_PAGE = (() => { const [c, x] = S.canvas(16, 12); x.fillStyle = '#7a5a2a'; x.fillRect(1, 2, 14, 8); x.fillStyle = '#f3e2b0'; x.fillRect(2, 3, 12, 6); x.fillStyle = '#c03030'; x.fillRect(7, 2, 2, 8); return c; })();
const S_LADDER = (() => { const [c, x] = S.canvas(10, 24); x.fillStyle = '#6b4423'; x.fillRect(1, 0, 2, 24); x.fillRect(7, 0, 2, 24); for (let y = 2; y < 24; y += 4) x.fillRect(1, y, 8, 1); return c; })();
const LOOKS = [{ hair: '#2a1a0a', tunic: '#7a4a9a' }, { hair: '#d9a441', tunic: '#3a7a4a' }, { hair: '#888', tunic: '#8a5a2e' }, { hair: '#5a2d12', tunic: '#2b5fc7' }, { hair: '#3a2a1a', tunic: '#c94a3f', apron: true }, { hair: '#d9a441', tunic: '#d9a1c9' }, { hair: '#2a1a0a', tunic: '#5fae45' }, { hair: '#888', tunic: '#9a7a4a' }, { hair: '#1a1a1a', tunic: '#4a6a8a', legs: '#2a3a4a' }, { hair: '#c04a2a', tunic: '#e0c060', legs: '#6a4a2a' }];
class Game {
  constructor() {
    this.canvas = document.getElementById('scene');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: PERF.tier === 'high', powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(PERF.scale); this.renderer.shadowMap.enabled = PERF.shadows; this.renderer.shadowMap.type = THREE.PCFShadowMap; this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(VIEW.fov, 1, 0.1, 900); this.scene.add(this.camera);
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.input = new Input(this.canvas); this.audio = new Audio();
    this.city = new City(this.scene); this.sky = new Sky(this.scene);
    this.lantern = new THREE.PointLight(0xffb060, 0, 16, 1.6); this.scene.add(this.lantern);
    this.player = new Player(this); this.overlay = new Overlay(document.getElementById('overlay'));
    this.minimap = new Minimap(this.city, document.getElementById('minimap'), document.getElementById('bigmap'));
    this.hud = new HUD(this); this.story = new Story(this); this.quests = new Quests(this); this.lockpick = new Lockpick(this);
    this.entities = []; this.npcs = {}; this.boss = null; this.flash = 0; this.running = false; this.time = 0; this.bigmap = false;
    this.day = { hour: 8.5, speed: 24 / DAY_SECONDS, locked: false, base: 'day', dark: 0 };
    this.equip = { espada: 'real', escudo: 'reino', armadura: 'roupa', elmo: null, capa: null, botas: null, amuleto: null, anel: null };
    this.faith = new Faith(this); this.faith.build(this.city); this.guild = new Guild(this); this.guild.placeHerbs(this.city); this.buildGuildBoard(); this.buildNPCs(); this.spawnMonsters(); this.applyEquip();
    // phone performance: a fixed pool of real lights, static scenery merged into few draw calls, resolution that follows the frame rate
    this.snow = new Snow(this.scene); this.lights = new LightPool(this.scene, PERF.lights); this.merged = mergeStatic(this.scene, [this]);
    this.governor = new FrameGovernor(s => { this.renderer.setPixelRatio(s); this.resize(); }); this.slowT = 0;
    document.getElementById('minimap-wrap').addEventListener('click', e => { e.stopPropagation(); if (this.running) this.toggleMap(true); });
    document.getElementById('bigmap-wrap').addEventListener('click', () => this.toggleMap(false, true));
    // no title menu: the page opens straight into the game, continuing the saved game when there is one (`?novo` in the URL starts over)
    if (new URLSearchParams(location.search).has('novo')) { try { localStorage.removeItem('fortaleza25d-save'); } catch (e) {} }
    const save = (() => { try { return JSON.parse(localStorage.getItem('fortaleza25d-save')); } catch (e) { return null; } })();
    document.getElementById('btn-end-continue').onclick = () => { document.getElementById('end').style.display = 'none'; this.input.lock(); };
    this.clock = new THREE.Clock(); this.applyHour(); this.loop(); this.start(save);
  }
  resize() { const w = this.canvas.parentElement.clientWidth || window.innerWidth, h = this.canvas.parentElement.clientHeight || window.innerHeight; this.renderer.setSize(Math.floor(w / PIXEL), Math.floor(h / PIXEL), false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  lodNear(pos) { return LOD.near(pos.x, pos.z); }
  toggleMap(open = !this.bigmap, relock = false) {
    if (this.hud.busy || open === this.bigmap) return; this.bigmap = open;
    document.getElementById('bigmap-wrap').style.display = open ? 'flex' : 'none'; this.player.frozen = open;
    if (open) this.input.unlock(); else if (relock) this.input.lock();
  }
  // ---------- day clock ----------
  setPreset(name) { const d = this.day; if (name === 'day') { d.hour = 8.5; d.locked = false; d.base = 'day'; } else if (name === 'dusk') { d.hour = 17.6; d.locked = false; } else if (name === 'night') { d.hour = 23.6; d.locked = true; } else if (name === 'winter') { d.base = 'winter'; d.hour = 8.5; d.locked = false; } this.applyHour(); }
  applyHour() { const d = this.day, p = this.player, c = this.city; const under = p && (c.inSewer(p.pos.x, p.pos.z) || c.inCave(p.pos.x, p.pos.z) || c.inCrypt(p.pos.x, p.pos.z)); if (under) { this.sky.mix('under', 'under', 0); d.dark = 1; } else d.dark = this.sky.setHour(d.hour, d.base); this.city.setDarkness(d.dark); const hh = Math.floor(d.hour), mm = Math.floor((d.hour - hh) * 60); document.getElementById('clock').textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; }
  // ---------- population ----------
  buildNPCs() {
    const s = this.story, c = this.city; const mk = (id, name, x, z, look, asset, color = '#fff', extra = {}) => { const n = new NPC(this, { id, name, x, z, look, asset, sheet: 'sheet_' + id.replace(/_g\d+$/, 'guarda'), model3d: CHAR_MODELS[id] || CHAR_MODELS[id.replace(/\d+$/, '')] || null, color, dialog: () => s.npcDialog(id), ...extra }); this.npcs[id] = n; this.entities.push(n); return n; };
    mk('maite', 'Princesa Eleonora', c.maitePos[0], c.maitePos[1], { hair: '#f2d26a', tunic: '#d9a1c9', legs: '#b07aa0', crown: true, trim: '#f6c12e' }, 'sprite_maite', '#f6c12e', { wander: 3 });
    mk('ferreiro', 'Ferreiro Lucas', c.smithPos[0], c.smithPos[1], { hair: '#2a1a0a', tunic: '#6b4a2a', apron: true }, 'sprite_ferreiro');
    mk('cozinheira', 'Dona Rosa', c.cookPos[0], c.cookPos[1], { hair: '#888', tunic: '#c94a3f', apron: true }, 'sprite_cozinheira');
    mk('guarda', 'Guarda Olavo', c.guardPos[0], c.guardPos[1], { hair: '#2a1a0a', tunic: '#9ea6b5', helmet: true, trim: '#9ea6b5', legs: '#2b5fc7' }, 'sprite_guarda');
    mk('pipo', 'Pipo', c.pipoPos[0], c.pipoPos[1], { hair: '#d9a441', tunic: '#5fae45', legs: '#3a5a2a' }, 'sprite_pipo', '#fff', { h: 1.4, wander: 5 });
    mk('mercador', 'Mercador Gaspar', c.merchantPos[0], c.merchantPos[1], { hair: '#2a1a0a', tunic: '#7a3a9a', legs: '#3a2a4a', trim: '#f6c12e' }, 'sprite_mercador', '#ffe066');
    mk('rei', 'Rei Ataúlfo', c.throne.x, c.throne.z + 1.2, { hair: '#dddddd', tunic: '#8a2030', legs: '#3a2a4a', crown: true, trim: '#f6c12e' }, 'sprite_rei', '#f6c12e');
    mk('taverneira', 'Helena Amaral', c.tavern.spots[0][0] + 1, c.tavern.spots[0][1], { hair: '#c04a2a', tunic: '#e0c060', apron: true }, null, '#fff', { wander: 2 });
    mk('padre', 'Padre Anselmo', c.chapel.spots[7][0], c.chapel.spots[7][1] + 2, { hair: '#888', tunic: '#3a3a44', legs: '#2a2a30' }, null, '#fff');
    mk('capitao', 'Capitão Cassios', c.barracks.spots[0][0], c.barracks.spots[0][1], { hair: '#2a1a0a', tunic: '#9ea6b5', helmet: true, trim: '#f6c12e', legs: '#2b5fc7' }, null, '#fff');
    // people of the regions
    const D = c.regions, L = D.lossot, N = D.neveo, H = D.colina, F = D.floresta;
    mk('barqueiro', 'Barqueiro Tobias', L.square[0] - 4, L.square[1] - 3, null, null, '#fff', { wander: 2 });
    mk('erveira', 'Erveira Lúcia', L.square[0] + 6, L.square[1] + 4, null, null, '#ffe066', { wander: 2 });
    mk('pescadora', 'Pescadora Ana', -286, 146, null, null, '#fff');
    mk('anciao', 'Ancião Bruma', N.elder[0], N.elder[1], null, null, '#f6c12e');
    mk('urso_pinho', 'Urso Pinho', N.city.x + 12, N.city.z - 4, null, null, '#ffe066');
    N.owls.forEach(([x, z], i) => mk('urso' + i, ['Urso-Coruja Névoa', 'Urso-Coruja Galho', 'Urso-Coruja Musgo', 'Urso-Coruja Garra'][i], x, z, null, null, '#ddd', { wander: 4, kind: 'villager' }));
    mk('filhote', 'Filhote Pluma', N.cub[0], N.cub[1], null, null, '#fff', { wander: 1.5 });
    mk('rei_passaro', 'Rei Pássaro', H.king[0], H.king[1], null, null, '#ffd23a', { fly: 3.2 });
    mk('andarilha', 'Andarilha Inês', 178, 112, null, null, '#fff');
    { const th = N.hall.throne, ls = N.library.spots[0]; mk('rei_urso', 'Rei Ulmo', th[0], th[1], null, null, '#ffe066'); mk('bibliotecaria', 'Pena-Velha', ls[0], ls[1], null, null, '#bfe6ff', { wander: 2 }); }
    mk('guilda', 'Mestra Brígida', GUILD_SPOT.master[0], GUILD_SPOT.master[1], null, null, '#9fd0ff', { wander: 2 });
    mk('coruja', 'Sábia Coruja', F.owl[0], F.owl[1] + 3, null, null, '#bfe6ff', { fly: 1.2 });
    c.guardPosts.forEach(([x, z], i) => mk('castelo_g' + i, null, x, z, { hair: '#2a1a0a', tunic: '#9ea6b5', helmet: true, trim: '#9ea6b5', legs: '#2b5fc7' }, null, '#fff', { kind: 'villager' }));
    // residents: one per family house, each with a job spot and a bed; streets fill as they go about their day
    const sheets = ['a', 'b', 'c', 'd', 'e', 'f'].map(k => 'sheet_villager_' + k).filter(k => Assets.has(k));
    const strip = Assets.has('sprite_villagers_sheet') ? sliceSheet(Assets.images.sprite_villagers_sheet, 6) : null; let i = 0; this.villagers = [];
    for (const h of c.houses) { if (!h.family) continue; const f = h.family; const job = JOBS[f.job] || JOBS.feirante; const look = LOOKS[i % LOOKS.length];
      const sheet = sheets.length && i % 3 !== 2 ? sheets[i % sheets.length] : null; const sprite = !sheet && strip && i % 3 !== 2 ? strip[i % strip.length] : null;
      const n = new NPC(this, { id: 'res' + i, name: f.name, x: h.outside[0], z: h.outside[1], sheet, sprite, look, model3d: f.job === 'crianca' ? CHILD_MODEL : VILLAGER_MODELS[i % VILLAGER_MODELS.length], color: '#ddd', dialog: () => s.residentDialog(n), kind: 'villager', routine: { home: h, job: f.job, spot: job.spot }, h: f.job === 'crianca' ? 1.4 : 1.9 }); n.family = f; n.house = h; h.resident = n; this.villagers.push(n); this.entities.push(n); i++; }
  }
  spawnMonsters() {
    const X = WALL, add = (id, list) => list.forEach(([x, z]) => this.entities.push(new Monster(this, id, x, z)));
    add('coelho', [[X + 18, 14], [X + 26, -16], [X + 40, 22], [X + 55, -24], [X + 30, 40], [-20, -95], [20, -100], [-90, 30], [-95, -40], [40, 95]]);
    add('abelha', [[X + 35, 30], [X + 50, 34], [X + 70, -30], [X + 22, -34], [-60, -100], [60, 100]]);
    add('serpente', [[-120, 40], [-115, -50], [-125, 90], [X + 90, 45], [X + 85, -45], [30, 120]]);
    add('lobo', [[X + 120, -40], [X + 135, 30], [X + 150, -25], [X + 110, 60], [-100, 140], [-60, -150], [100, -140]]);
    add('lobo_alfa', [[X + 160, 50]]);
    const Sw = SEWER, R = (a, b) => a + Math.random() * (b - a); const rooms = [[Sw.x0 + 20, Sw.z0 + 20], [Sw.x0 + 60, Sw.z0 + 25], [Sw.x1 - 25, Sw.z0 + 30], [Sw.x0 + 25, Sw.z0 + 60], [Sw.x1 - 30, Sw.z0 + 60], [Sw.x0 + 40, Sw.z0 + 85], [Sw.x1 - 20, Sw.z0 + 100], [Sw.x0 + 30, Sw.z1 - 25], [Sw.x1 - 40, Sw.z1 - 25], [Sw.x0 + 70, Sw.z0 + 115]];
    for (const [x, z] of rooms) { add('rato', [[x + R(-4, 4), z + R(-4, 4)], [x + R(-4, 4), z + R(-4, 4)]]); add('barata', [[x + R(-5, 5), z + R(-5, 5)], [x + R(-5, 5), z + R(-5, 5)], [x + R(-5, 5), z + R(-5, 5)]]); }
    const C = CAVE; const caves = [[C.x0 + 25, C.z1 - 25], [C.x0 + 60, C.z1 - 40], [C.x0 + 20, C.z0 + 70], [C.x0 + 60, C.z0 + 25], [C.x1 - 20, C.z1 - 25], [C.x1 - 50, C.z0 + 60], [C.x0 + 95, C.z0 + 95], [C.x1 - 30, C.z0 + 35]];
    for (const [x, z] of caves) { add('morcego', [[x + R(-5, 5), z + R(-5, 5)], [x + R(-5, 5), z + R(-5, 5)], [x + R(-5, 5), z + R(-5, 5)]]); add('aranha', [[x + R(-6, 6), z + R(-6, 6)], [x + R(-6, 6), z + R(-6, 6)]]); }
    add('aranha_rainha', [[C.x1 - 24, C.z0 + 28]]);
    // Cripta Antiga (guild dungeon): skeletons in every chamber, the Rei Esqueleto on his throne
    const K = CRYPT; add('esqueleto', [[K.x1 - 15, K.z1 - 30], [K.x1 - 45, K.z1 - 50], [K.x1 - 20, K.z0 + 60], [K.x0 + 70, K.z1 - 15], [K.x0 + 90, K.z1 - 50], [K.x0 + 25, K.z0 + 75], [K.x0 + 60, K.z0 + 70]]);
    add('esqueleto_guerreiro', [[K.x1 - 40, K.z0 + 30], [K.x0 + 100, K.z0 + 25], [K.x0 + 20, K.z1 - 25], [K.x0 + 55, K.z0 + 40]]); add('esqueleto_mago', [[K.x1 - 70, K.z1 - 20], [K.x0 + 30, K.z0 + 35]]); add('rei_esqueleto', [K.boss]);
    // the five Lost Pages (quest "As Páginas Perdidas"): swamp, jelly castle, gorge, Bird King's hill, crypt throne room
    [[-318, 160], [-282, -150], [262, 252], [-128, -336], [K.boss[0] + 8, K.boss[1] - 4]].forEach(([x, z], i) => { const pg = new Prop(this, { kind: 'page', x, z, w: 0.8, h: 0.6, src: S_PAGE, collide: false }); pg.page = i; this.entities.push(pg); });
    this.entities.push(new Prop(this, { kind: 'cryptexit', x: K.entry[0] + 4, z: K.entry[1] + 4, w: 1.2, h: 2.4, src: Assets.src(TOP('prop_ladder'), S_LADDER), collide: false }));
    // the kingdom's regions (src/regions.js)
    const D = this.city.regions;
    add('sapo', D.lossot.spawns); add('sapo_alfa', [D.lossot.alpha]); add('geleca', D.geleca.spawns); add('rei_geleca', [D.geleca.king]);
    add('lobo_gelo', D.neveo.spawns); add('gaviao', D.colina.spawns); add('aranha', D.desfiladeiro.spawns.slice(0, 3)); add('morcego', D.desfiladeiro.spawns.slice(3)); add('dragao', [D.desfiladeiro.dragon]);
    const fire = [Assets.src(TOP('prop_campfire_off'), S.FIRE_OFF), ...(Assets.has('prop_campfire_lit_top') || Assets.has('prop_campfire_lit') ? [Assets.src(TOP('prop_campfire_lit'))] : S.FIRE)];
    for (const [x, z] of [[-255, 112], D.neveo.fire, [-95, -290], [180, 132], [300, -48], [-232, -115]]) this.entities.push(new Prop(this, { kind: 'fire', x, z, w: 1.8, h: 2, src: fire, lit: true }));
    this.entities.push(new Prop(this, { kind: 'grate', x: Sw.grate[0], z: Sw.grate[1], w: 1.6, h: 1.0, src: Assets.src(TOP('prop_sewer_grate'), S_GRATE), yOff: 0.05, collide: false, flat: true }));
    this.entities.push(new Prop(this, { kind: 'ladder', x: Sw.entry[0], z: Sw.entry[1], w: 1.2, h: 2.4, src: Assets.src(TOP('prop_ladder'), S_LADDER), collide: false }));
    this.entities.push(new Prop(this, { kind: 'caveexit', x: C.entry[0], z: C.entry[1], w: 1.2, h: 2.4, src: Assets.src(TOP('prop_ladder'), S_LADDER), collide: false }));
    this.entities.push(new Prop(this, { kind: 'pedras', x: Sw.x0 + 12, z: Sw.z1 - 14, w: 2.6, h: 1.6, src: Assets.src(TOP('prop_rock'), S.ROCKS.summer), collide: false }));
    this.entities.push(new Prop(this, { kind: 'lore', x: C.x1 - 20, z: C.z0 + 27, w: 1.6, h: 2.4, src: S.LORE.statue, title: 'Altar da Gruta', text: '"Uma pedra lisa, gasta por mãos. Nela, gravado: QUEM TOMA A LUZ DEVE DEVOLVER O FRIO. Alguém esteve aqui muito antes da Fortaleza."' }));
  }
  // the guild's notice board on the Campo de Treino: two posts, a board, pinned papers (one merged mesh)
  buildGuildBoard() {
    const [x, z] = GUILD_SPOT.board, g = new THREE.Group(), wood = new THREE.MeshLambertMaterial({ color: 0x7a4a24 }), paper = new THREE.MeshLambertMaterial({ color: 0xf3e2b0 });
    for (const dx of [-1.1, 1.1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18), wood); p.position.set(dx, 1.2, 0); g.add(p); }
    const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.12), wood); b.position.set(0, 1.6, 0); g.add(b); const roof = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.12, 0.5), wood); roof.position.set(0, 2.35, 0); g.add(roof);
    [[-0.8, 1.7], [-0.15, 1.55], [0.5, 1.75], [0.85, 1.45], [-0.5, 1.35]].forEach(([px, py], i) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.52), paper); q.position.set(px, py, 0.07); q.rotation.z = (i % 2 ? 0.08 : -0.06); g.add(q); });
    g.position.set(x, 0, z); this.scene.add(g); this.city.addBox(x, z, 2.8, 0.4);
  }
  // people never stand inside each other: a soft push between nearby awake townsfolk (only those near the player)
  separatePeople(dt) {
    const list = this.peopleNear || []; this.sepT = (this.sepT || 0) - dt; if (this.sepT <= 0) { this.sepT = 0.5; const p = this.player.pos; this.peopleNear = this.entities.filter(e => (e.kind === 'npc' || e.kind === 'villager') && !e.sleeping && !e.hidden && Math.abs(e.pos.x - p.x) < 45 && Math.abs(e.pos.z - p.z) < 45); }
    const R = 0.95, k = Math.min(1, dt * 6);
    for (let i = 0; i < list.length; i++) { const a = list[i]; for (let j = i + 1; j < list.length; j++) { const b = list[j]; let dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z; const d2 = dx * dx + dz * dz; if (d2 >= R * R) continue; let d = Math.sqrt(d2); if (d < 1e-4) { dx = Math.random() - 0.5; dz = Math.random() - 0.5; d = Math.hypot(dx, dz); }
      const push = (R - d) * 0.5 * k / d, wa = a.kind === 'npc' && !a.routine ? 0.3 : 1, wb = b.kind === 'npc' && !b.routine ? 0.3 : 1;   // shopkeepers barely move
      const ax = a.pos.x - dx * push * wa, az = a.pos.z - dz * push * wa, bx = b.pos.x + dx * push * wb, bz = b.pos.z + dz * push * wb;
      if (!this.city.blocked(ax, az, 0.35)) { a.pos.x = ax; a.pos.z = az; } if (!this.city.blocked(bx, bz, 0.35)) { b.pos.x = bx; b.pos.z = bz; } } }
  }
  spawnLoot(pos, items, gold) { const R = () => (Math.random() - 0.5) * 1.6; for (const id of items) this.entities.push(new Loot(this, pos.x + R(), pos.z + R(), id, 1)); if (gold > 0) this.entities.push(new Loot(this, pos.x + R(), pos.z + R(), null, 0, gold)); }
  // ---------- inventory & trade ----------
  addItem(id, qty = 1) { const p = this.player; p.inventory[id] = (p.inventory[id] || 0) + qty; this.hud.toast(`+${qty} ${ITEMS[id].name}`, 1500); this.hud.refreshPanels(); this.quests.check(); }
  removeItem(id, qty = 1) { const p = this.player; if ((p.inventory[id] || 0) < qty) return false; p.inventory[id] -= qty; if (p.inventory[id] <= 0) delete p.inventory[id]; this.hud.refreshPanels(); return true; }
  has(id, qty = 1) { return (this.player.inventory[id] || 0) >= qty; }
  addGold(n) { this.player.gold += n; this.hud.toast(`+${n} moedas`, 1500); this.hud.refreshPanels(); }
  useItem(id) {
    const it = ITEMS[id], p = this.player; if (!it || !p.inventory[id]) return;
    if (it.knowledge) { this.removeItem(id); p.points += 2; this.audio.chime(); this.hud.toast('A bala derrete devagar... lembranças que não são suas. +2 pontos de atributo!', 4000); p.gainXp(150); this.hud.refreshPanels(); this.save(); return; }
    if (it.consumable) { this.removeItem(id); if (it.cures) { p.cure(); this.faith.onCure(); } const hm = p.healMul || 1; if (it.food) { p.regenPool += (it.stats.vida || 0) * (this.story.flags.foodBonus ? 1.5 : 1) * hm; if (it.warm) p.cold = 0; this.hud.toast(`${it.name}: recuperando vida aos poucos`); } else { const v = Math.round((it.stats.vida || 0) * hm); p.heal(v); this.hud.toast(`${it.name}: +${v} de vida`); } this.audio.pickup(); }
    else if (it.slot) { this.removeItem(id); const old = this.equip[it.slot]; this.equip[it.slot] = id; if (old) { p.inventory[old] = (p.inventory[old] || 0) + 1; } this.applyEquip(); this.hud.toast(`${it.name} equipado`); this.hud.refreshPanels(); }
  }
  unequip(slot) { const id = this.equip[slot]; if (!id || slot === 'espada') return; this.equip[slot] = null; this.player.inventory[id] = (this.player.inventory[id] || 0) + 1; this.applyEquip(); this.hud.refreshPanels(); }
  priceFor(it) { return Math.round(it.price * (this.story.flags.discount ? 0.8 : 1) * (1 - (this.player.discount || 0))); }
  buy(id) { const it = ITEMS[id], p = this.player; const price = this.priceFor(it); if (p.gold < price) { this.hud.toast('Moedas insuficientes'); return; } p.gold -= price; this.faith.onTrade(price); p.inventory[id] = (p.inventory[id] || 0) + 1; this.audio.pickup(); this.hud.toast(`Comprou ${it.name}`); this.hud.refreshPanels(); this.quests.check(); this.save(); }
  sell(id) { const it = ITEMS[id], p = this.player; if (!this.removeItem(id)) return; const v = Math.round(sellPrice(it) * (p.sellMul || 1)); p.gold += v; this.faith.onTrade(v); this.audio.pickup(); this.hud.toast(`Vendeu ${it.name} por ${v}`); this.hud.refreshPanels(); this.save(); }
  villagersVisible(v) { for (const n of this.villagers) n.setVisible(v); }
  guardsRun() { const g = new NPC(this, { id: 'g2', name: null, x: 30, z: 3, look: { hair: '#2a1a0a', tunic: '#9ea6b5', helmet: true, trim: '#9ea6b5', legs: '#2b5fc7' }, sheet: 'sheet_guarda', model3d: CHAR_MODELS.g2, kind: 'villager', path: [[8, 3], [3, -20], [4, -36], [30, 3]] }); g.speed = 6; this.entities.push(g); }
  placeWinterProps() {
    if (this.winterPlaced) return; this.winterPlaced = true; const X = WALL;
    const chest = [Assets.src(TOP('prop_chest_closed'), S.CHEST), Assets.src(TOP('prop_chest_open'), S.CHEST_OPEN)];
    [[X + 20, -12, 'capa'], [X + 45, 14, 'sopa'], [X + 80, -16, 'botas'], [X + 130, 18, 'glacial'], [X + 60, -45, 'elmo'], [X + 110, 40, 'amuleto']].forEach(([x, z, item]) => this.entities.push(new Prop(this, { kind: 'chest', x, z, w: 1.6, h: 1.2, src: chest, item })));
    const fire = [Assets.src(TOP('prop_campfire_off'), S.FIRE_OFF), ...(Assets.has('prop_campfire_lit_top') || Assets.has('prop_campfire_lit') ? [Assets.src(TOP('prop_campfire_lit'))] : S.FIRE)];
    [[-8, 20, true], [X + 30, 7, false], [X + 85, -8, false], [X + 140, 8, false]].forEach(([x, z, lit]) => this.entities.push(new Prop(this, { kind: 'fire', x, z, w: 1.8, h: 2, src: fire, lit })));
    [[X + 38, -9, 'sword', 'Espada Quebrada', '"Pertenceu a um cavaleiro que tentou atravessar o vale quando o inverno ainda dominava estas terras. Ele nunca chegou à floresta."'], [X + 100, 12, 'statue', 'Estátua Sem Rosto', '"Alguém esculpiu esta figura antes de a Fortaleza existir. Os braços estão erguidos, como se segurassem algo que brilhava."'], [X + 70, 30, 'toy', 'Brinquedo de Madeira', '"Um cavalinho de madeira, esquecido na neve. Alguma criança do vale brincava aqui quando ainda havia sol."']].forEach(([x, z, kind, title, text]) => this.entities.push(new Prop(this, { kind: 'lore', x, z, w: kind === 'statue' ? 1.6 : 1.1, h: kind === 'statue' ? 2.4 : 1.3, src: S.LORE[kind], title, text })));
    [[X + 25, -14], [X + 40, 16], [X + 58, -8], [X + 72, 14], [X + 90, -14], [X + 105, 10], [X + 120, -18], [X + 135, 12], [X + 150, -8], [X + 165, 10], [X + 60, -40], [X + 100, 36]].forEach(([x, z]) => this.entities.push(new Monster(this, 'lobo_gelo', x, z)));
    this.entities.push(new Prop(this, { kind: 'prop', x: this.city.forgePos.x, z: this.city.forgePos.z - 2, w: 1.2, h: 0.9, src: S.SHIELD_BROKEN, yOff: 1.1, collide: false }));
  }
  spawnMonster(id, x, z, temp = false) { const m = new Monster(this, id, x, z); m.temp = temp; if (temp) m.state = 'chase'; this.entities.push(m); return m; }
  spawnBoss() { this.boss = new Boss(this, this.city.lightPos); this.entities.push(this.boss); }
  applyEquip() {
    const p = this.player; p.damage = 10 + p.attr.ataque * 2; p.defense = p.attr.defesa; p.coldResist = 0; let maxHp = 100 + (p.level - 1) * 8; p.sword = 'real'; p.swingTime = 0.4 / (1 + p.attr.velocidade * 0.06); p.critChance = 0.08 + p.attr.velocidade * 0.01; p.maxStamina = 100 + (p.attr.folego || 0) * 12; p.stamina = Math.min(p.stamina, p.maxStamina);
    for (const s of SLOTS) { const it = this.equip[s] && ITEMS[this.equip[s]]; if (!it) continue; p.damage += it.stats.dano || 0; p.defense += it.stats.defesa || 0; p.coldResist += (it.stats.frio || 0) / 100; maxHp += it.stats.vida || 0; if (it.sword) p.sword = it.sword; }
    if (this.faith) this.faith.apply(p); p.coldResist = Math.min(0.85, p.coldResist); p.stamina = Math.min(p.stamina, p.maxStamina); if (p.maxHp !== maxHp) { p.hp = Math.min(maxHp, p.hp + Math.max(0, maxHp - p.maxHp)); p.maxHp = maxHp; }
    this.player.rebuildLook?.(); this.hud.portraitDirty = true; this.hud.refreshEquip(this.equip); this.hud.refreshPanels();
  }
  async start(save) { this.audio.init(); this.hud.applySound(); this.running = true; this.input.lock(); this.story.run(save).catch(e => console.error(e)); }
  // ---------- save ----------
  save() { const p = this.player, c = this.city; const data = { x: p.pos.x, z: p.pos.z, yaw: p.yaw, hp: p.hp, equip: this.equip, flags: this.story.flags, opened: this.entities.filter(e => e.kind === 'chest' && e.opened).map(e => [e.pos.x, e.pos.z]), lit: this.entities.filter(e => e.kind === 'fire' && e.lit).map(e => [e.pos.x, e.pos.z]), stats: p.stats, level: p.level, xp: p.xp, points: p.points, attr: p.attr, gold: p.gold, inventory: p.inventory, hour: this.day.hour, unlocked: c.doors.map((d, i) => d.locked ? 0 : 1), looted: c.containers.map(k => k.opened ? 1 : 0), quests: this.quests.state() }; try { localStorage.setItem('fortaleza25d-save', JSON.stringify(data)); } catch (e) {} }
  loadSave(s) { const p = this.player, c = this.city; const [fx, fz] = c.nearestFree(s.x, s.z); p.teleport(fx, fz, s.yaw); p.hp = s.hp; this.equip = { ...this.equip, ...s.equip }; p.canAttack = true; this.applyEquip(); p.stats = { ...p.stats, ...(s.stats || {}) }; p.level = s.level || 1; p.xp = s.xp || 0; p.points = s.points || 0; p.attr = { ...p.attr, ...(s.attr || {}) }; p.gold = s.gold || 0; p.inventory = s.inventory || {}; this.applyEquip(); this.story.flags = { ...this.story.flags, ...(s.flags || {}) }; if (s.talkedMaite2) this.story.flags.talkedMaite2 = true; this.applyEquip(); const k = (a, b) => Math.round(a) + ',' + Math.round(b); const op = new Set((s.opened || []).map(([x, z]) => k(x, z))), lt = new Set((s.lit || []).map(([x, z]) => k(x, z))); for (const e of this.entities) { if (e.kind === 'chest' && op.has(k(e.pos.x, e.pos.z))) e.opened = true; if (e.kind === 'fire' && lt.has(k(e.pos.x, e.pos.z))) e.lit = true; } if (s.unlocked) c.doors.forEach((d, i) => { if (s.unlocked[i]) d.locked = false; }); if (s.looted) c.containers.forEach((kk, i) => { if (s.looted[i]) this.markLooted(kk); }); if (s.hour != null) this.day.hour = s.hour; if (s.quests) this.quests.load(s.quests); }
  // ---------- events ----------
  onPlayerDeath() {
    const p = this.player, h = this.hud; p.frozen = true; this.faith.onDeath(); h.toast('Thomas caiu...', 3000);
    (async () => { await h.fade(1, 1.5); await new Promise(r => setTimeout(r, 800));
      let best = null, bd = 1e9; for (const e of this.entities) if (e.kind === 'fire' && e.lit) { const d = e.pos.distanceTo(p.pos); if (d < bd) { bd = d; best = e; } }
      const hs = this.city.homeSpawn; if (best) p.teleport(best.pos.x + 2, best.pos.z + 2); else if (this.story.chapter === 'night') p.teleport(0, -30, 0); else p.teleport(hs.x, hs.z, Math.PI);
      p.hp = p.maxHp; p.cold = 0; p.dead = false; p.frozen = false; p.canAttack = true;
      for (const e of this.entities) if (e.kind === 'monster' && e.alive) { e.state = 'idle'; e.pos.copy(e.home); e.hp = e.cfg.hp; }
      if (this.boss && this.boss.phase === 'fight') { this.boss.fightT = 0; this.boss.swoop = null; this.boss.cool = 3; }
      await h.fade(0, 1.5); })();
  }
  onBossCharge() { this.hud.toast('A fumaça negra vem contra você — LEVANTE O ESCUDO! (botão direito)', 3500); this.player.canAttack = false; }
  onBossBlast() { const p = this.player, h = this.hud; setTimeout(() => { if (p.blocking) { h.toast('O escudo se parte!', 2500); this.audio.block(); } else { h.toast('A fumaça atinge Thomas em cheio!', 2500); p.hp = Math.max(1, p.hp - 35); p.hurtT = 0.6; } p.shieldCrack = true; p.shake = 2; }, 700); this.player.canAttack = true; }
  // ---------- doors, chests and notes ----------
  async useDoor(d) {
    const c = this.city, h = this.hud;
    if (d.locked) {
      const keyId = Object.keys(ITEMS).find(id => ITEMS[id].key === d.house.kind && this.has(id));
      if (keyId) { d.locked = false; h.toast(`Destrancou com ${ITEMS[keyId].name}`); this.audio.pickup(); }
      else if (!this.has('gazua')) { h.toast(`Trancada (fechadura ${DIFF_NAMES[d.diff]}). Precisa de uma gazua.`, 2500); return; }
      else { const ok = await this.lockpick.start(d.diff); if (!ok) return; d.locked = false; h.toast('Fechadura aberta!'); this.noticeCrime(d.house, 'arrombar a porta'); }
    }
    c.setDoor(d, !d.open); this.audio.dodge(); this.save();
  }
  async useContainer(k) {
    const h = this.hud;
    if (k.locked) { const keyId = Object.keys(ITEMS).find(id => ITEMS[id].key === k.house.kind && this.has(id)); if (keyId) { k.locked = false; h.toast(`Destrancou com ${ITEMS[keyId].name}`); } else if (!this.has('gazua')) { h.toast(`Baú trancado (fechadura ${DIFF_NAMES[k.diff]}). Precisa de uma gazua.`, 2500); return; } else { const ok = await this.lockpick.start(k.diff); if (!ok) return; k.locked = false; } }
    const got = []; for (const [id, q] of Object.entries(k.items)) { this.player.inventory[id] = (this.player.inventory[id] || 0) + q; got.push(`${q}× ${ITEMS[id].name}`); } if (k.gold) { this.player.gold += k.gold; got.push(`${k.gold} moedas`); }
    this.markLooted(k); this.audio.pickup(); h.toast(got.length ? 'Pegou: ' + got.join(', ') : 'O baú está vazio.', 3000); this.hud.refreshPanels(); this.quests.check();
    if (k.house.kind !== 'home') this.noticeCrime(k.house, 'mexer no baú'); this.save();
  }
  markLooted(k) { k.opened = true; k.lid.position.y = 0.95; k.lid.rotation.x = -0.9; }
  // a resident at home who sees Thomas rummage remembers it; the guard hears about it
  noticeCrime(house, what) { const r = house.resident; const f = this.story.flags; f.crimes = (f.crimes || 0) + 1; this.faith.onCrime(); if (r && !r.hidden && Math.abs(r.pos.x - house.x) < house.w / 2 + 1 && Math.abs(r.pos.z - house.z) < house.d / 2 + 1) { r.say('quest', 4); this.hud.toast(`${r.family.name} viu você ${what}!`, 3000); f.caught = (f.caught || 0) + 1; r.angry = true; } }
  // ---------- interaction ----------
  findInteractable() {
    const p = this.player, c = this.city, st = this.story, f = p.forward; let best = null, bd = 3.4;
    const consider = (pos, r, label, use) => { const to = pos.clone().sub(p.pos).setY(0); const d = to.length(); if (d < bd + r && (d < 2.2 || to.normalize().dot(f) > 0.2)) { bd = d; best = { label, use }; } };
    const V = (x, z) => new THREE.Vector3(x, 0, z);
    for (const e of this.entities) {
      if ((e.kind === 'npc' || e.kind === 'villager') && e.dialog && !e.hidden && !e.sleeping && !(e.kind === 'villager' && this.story.chapter === 'night')) consider(e.pos, 0.6, `<b>E</b> — Falar${e.name ? ' com ' + e.name : ''}`, () => e.dialog());
      if (e.kind === 'chest' && !e.opened) consider(e.pos, 0.8, '<b>E</b> — Abrir baú', async () => { e.opened = true; p.stats.chests++; const it = ITEMS[e.item]; const choice = await this.hud.card(it); if (choice === 'equip') { if (it.consumable) { p.heal(it.stats.vida || 0); p.cold = 0; this.hud.toast('Thomas toma a sopa quente. +vida, frio zerado'); } else { this.equip[it.slot] = it.id; this.applyEquip(); this.hud.toast(`${it.name} equipado`); } } else { p.inventory[it.id] = (p.inventory[it.id] || 0) + 1; this.hud.toast(`${it.name} guardado no inventário`); } this.save(); });
      if (e.kind === 'fire') consider(e.pos, 0.9, e.lit ? '<b>E</b> — Descansar na fogueira' : '<b>E</b> — Acender fogueira', async () => { if (!e.lit) { e.lit = true; this.audio.fire(); } p.heal(p.maxHp); p.cold = 0; p.frozen = true; this.hud.toast('🔥 Thomas esquenta as mãos. Jogo salvo.', 3000); await this.hud.fade(0.6, 0.8); await new Promise(r => setTimeout(r, 1200)); await this.hud.fade(0, 0.8); p.frozen = false; this.save(); });
      if (e.kind === 'lore') consider(e.pos, 0.7, '<b>E</b> — Examinar', () => this.hud.lore(e.title, e.text));
      if (e.kind === 'grate') consider(e.pos, 0.9, '<b>E</b> — Descer ao esgoto', () => this.travel(SEWER.entry[0] + 1.5, SEWER.entry[1] + 1.5, 'Esgoto da Fortaleza'));
      if (e.kind === 'ladder') consider(e.pos, 0.9, '<b>E</b> — Subir a escada', () => this.travel(SEWER.grate[0] + 1.5, SEWER.grate[1], null));
      if (e.kind === 'pedras') consider(e.pos, 1.0, '<b>E</b> — Mexer nas pedras soltas', () => { if (this.quests.active('pedras')) { this.quests.complete('pedras'); this.story.flags.pedrasDone = true; this.spawnLoot(e.pos, ['gazua', 'gazua', 'gazua', 'pocao_g'], 30); this.hud.toast('Atrás das pedras: um esconderijo!', 3000); e.removed = true; this.scene.remove(e.mesh); } else this.hud.toast('Pedras empilhadas com cuidado. Alguém fechou algo aqui.', 2500); });
      if (e.kind === 'page' && !e.removed) { const fl = st.flags.pages || (st.flags.pages = {}); if (fl[e.page]) { e.removed = true; this.scene.remove(e.mesh); if (e.shadow) this.scene.remove(e.shadow); } else consider(e.pos, 0.7, '<b>E</b> — Pegar a página perdida', () => { fl[e.page] = true; this.addItem('pagina_perdida'); this.audio.chime(); const n = Object.keys(fl).length; this.hud.toast(`Página perdida ${n}/5${this.quests.q.biblioteca ? '' : ' — talvez a Grande Biblioteca de Neveo saiba de onde ela veio'}`, 3500); e.removed = true; this.scene.remove(e.mesh); if (e.shadow) this.scene.remove(e.shadow); this.quests.check(); this.save(); }); }
      if (e.kind === 'cryptexit') consider(e.pos, 0.9, '<b>E</b> — Sair da cripta', () => this.travel(GUILD_SPOT.master[0] - 3, GUILD_SPOT.master[1] + 4, 'Campo de Treino'));
      if (e.kind === 'caveexit') consider(e.pos, 0.9, '<b>E</b> — Sair da gruta', () => this.travel(CAVE.mouth[0] - 2, CAVE.mouth[1] + 4, 'Campos do Vale'));
    }
    { const hb = this.guild.nearHerb(p.pos); if (hb) consider(new THREE.Vector3(hb.x, 0, hb.z), 0.8, `<b>E</b> — Colher ${HERBS[hb.kind].name}`, () => this.guild.pick(hb)); }
    for (const sh of this.faith.shrines) if (Math.abs(sh.pos.x - p.pos.x) < 6 && Math.abs(sh.pos.z - p.pos.z) < 6) consider(sh.pos, 1.6, `<b>E</b> — Santuário de ${GODS[sh.id].name}`, () => this.faith.visit(sh.id));
    consider(V(CAVE.mouth[0] + 2, CAVE.mouth[1] + 1), 1.4, '<b>E</b> — Entrar na gruta', () => this.travel(CAVE.entry[0] + 2, CAVE.entry[1] - 2, 'Gruta do Norte'));
    for (const d of c.doors) if (Math.abs(d.x - p.pos.x) < 4 && Math.abs(d.z - p.pos.z) < 4) consider(V(d.x, d.z), 0.6, d.locked ? `<b>E</b> — Porta trancada <small>(${DIFF_NAMES[d.diff]})</small>` : d.open ? '<b>E</b> — Fechar porta' : '<b>E</b> — Abrir porta', () => this.useDoor(d));
    for (const k of c.containers) if (!k.opened && Math.abs(k.x - p.pos.x) < 4 && Math.abs(k.z - p.pos.z) < 4) consider(V(k.x, k.z), 0.6, k.locked ? `<b>E</b> — Baú trancado <small>(${DIFF_NAMES[k.diff]})</small>` : '<b>E</b> — Abrir baú', () => this.useContainer(k));
    for (const n of c.notes) if (Math.abs(n.x - p.pos.x) < 4 && Math.abs(n.z - p.pos.z) < 4) consider(V(n.x, n.z), 0.5, `<b>E</b> — Ler: ${n.title}`, () => { this.hud.lore(n.title, n.text); st.flags.notesRead = (st.flags.notesRead || 0) + 1; if (n.house.kind === 'keep') st.flags.readDecree = true; if (n.house.kind === 'library') { const rd = st.flags.booksRead || (st.flags.booksRead = {}); if (!rd[n.title]) { rd[n.title] = 1; p.gainXp(20); this.hud.toast('Conhecimento: +20 XP', 1800); } } if (n.house.family?.name === 'Vasco Barroso') { st.flags.notesVasco = true; this.quests.start('pedras'); } this.quests.check(); });
    if (st.flags.canSleep && !st.flags.slept) consider(c.bedPos, 1.4, '<b>E</b> — Dormir', () => { st.flags.slept = true; });
    else if (st.chapter !== 'night' && st.chapter !== 'prologue' && (this.day.hour >= 20 || this.day.hour < 5)) consider(c.bedPos, 1.4, '<b>E</b> — Dormir até de manhã', async () => { p.frozen = true; await this.hud.fade(1, 1.2); this.day.hour = 6.5; p.heal(p.maxHp); this.applyHour(); await this.hud.fade(0, 1.2); p.frozen = false; this.hud.toast('Uma noite de sono. Vida recuperada.'); this.save(); });
    return best;
  }
  async travel(x, z, label) { const p = this.player, h = this.hud; p.frozen = true; await h.fade(1, 0.6); p.teleport(x, z); if (label) h.toast(label, 2500); await h.fade(0, 0.8); p.frozen = false; }
  // ---------- loop ----------
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(0.05, this.clock.getDelta()); this.time += dt;
    if (this.running) {
      const p = this.player, h = this.hud, inp = this.input; h.update(); this.lockpick.update(dt);
      if (!this.day.locked && !p.frozen) { this.day.hour = (this.day.hour + dt * this.day.speed) % 24; }
      this.slowT -= dt; const slow = this.slowT <= 0; if (slow) this.slowT = 0.1;   // things that do not need 60 updates a second
      if (this.faith) this.faith.update(dt); if (this.guild) this.guild.update(dt); if (slow) { this.applyHour(); this.markT = (this.markT || 0) - 1; if (this.markT <= 0) { this.markT = 10; for (const id in this.npcs) this.npcs[id].questMark = this.story.questMark(id); } } LOD.set(p.pos.x, p.pos.z, p.camDist || VIEW.dist);
      if (inp.pressed.KeyM && !h.busy) this.toggleMap();
      if ((inp.pressed.KeyI || inp.pressed.KeyC) && !this.bigmap) h.togglePanel(inp.pressed.KeyC ? 'attr' : 'inv');
      if (inp.pressed.KeyJ && !this.bigmap) h.togglePanel('quests');
      if (inp.pressed.Escape) { if (this.bigmap) this.toggleMap(false); else if (h.panel) h.closePanel(); else if (!h.busy) h.togglePanel('menu'); }
      this.flash = Math.max(0, this.flash - dt * 1.2);
      p.update(dt); this.chasers = this.nextChasers || []; this.nextChasers = [];
      this.separatePeople(dt);
      for (const e of this.entities) e.update(dt); this.entities = this.entities.filter(e => !e.removed);
      this.city.faceAll(); this.city.fadeNear(p.pos.x, p.pos.z, dt); this.city.fadeSprites(p.pos.x, p.pos.z, dt); this.city.update(dt, this.time); this.sky.update(p.pos); this.snow.update(dt, p.pos, this.city.winter);
      this.lantern.position.set(p.pos.x, 1.6, p.pos.z);
      const under = this.city.inSewer(p.pos.x, p.pos.z) || this.city.inCave(p.pos.x, p.pos.z) || this.city.inCrypt(p.pos.x, p.pos.z);
      this.lantern.intensity = (under ? 12 : this.day.dark * 10 + (this.day.base === 'winter' ? 3 : 0)) + (p.leftItem === 'torch' ? 6 + Math.sin(this.time * 12) * 1.5 : 0);
      const busy = h.busy || p.frozen || p.dead; const it = busy ? null : this.findInteractable(); h.hint(it ? it.label : null);
      if (it && inp.pressed.KeyE) { inp.pressed.KeyE = false; it.use(); }
      h.bars(p, this.city.winter); h.region(this.city.regionAt(p.pos.x, p.pos.z));
      const t = this.story.target; h.distance(t ? Math.round(Math.hypot(t.x - p.pos.x, t.z - p.pos.z)) + ' m' : null);
      if (slow) this.minimap.draw(this); if (this.bigmap) this.minimap.drawBig(this);
      this.overlay.draw(p, this, dt); h.floaters(this); h.worldBars(this);
    }
    if (this.running) this.lights.update(this.player.pos.x, this.player.pos.z, dt); this.governor.tick(dt);
    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}
Promise.all([Assets.preload(ASSET_NAMES), Models.preload(MODEL_NAMES)]).then(() => {
  if (Assets.has('ui_logo')) { for (const id of ['bigtitle']) { const el = document.getElementById(id); const img = document.createElement('img'); img.src = 'assets/ui_logo.png'; img.className = 'logo'; const t1 = el.querySelector('.mt1, .t1'), t2 = el.querySelector('.mt2, .t2'); if (t1) t1.replaceWith(img); if (t2) t2.remove(); } }
  if (Assets.has('ui_card_frame')) { const card = document.getElementById('card'); card.classList.add('framed'); }
  window.game = new Game();
});
