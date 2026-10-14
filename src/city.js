// The world: a medieval city inside golden walls laid out in blocks (quarteirões) with streets, sidewalks, plazas, gardens,
// enterable houses with furnished interiors and doors, the Light tower, the castle, fields, river, road and the frozen forest.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TileMap, T, TILE } from './tilemap.js';
import { Assets, TOP, sliceSheet } from './assets.js';
import * as PX from './pixel.js';
import * as S from './sprites.js';
import { BillboardSet, setBillboardImage, groundDepth, spriteMaterial } from './billboard.js';
import { Models, ModelSet, PropSet, PROP_MODELS } from './models.js';
import { VIEW } from './view.js';
import { familyFor, SPECIAL, JOBS } from './houses.js';
import { buildRegions, paintRegions, regionBlocked, regionName } from './regions.js';
import { buildCrypt, CRYPT, cryptBlocked, inCrypt } from './guild.js';

let seed = 4242; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const R = (a, b) => a + rng() * (b - a);
export const WALL = 90, GATE_HALF = 5, WORLD = 360;
// Sewer: a walled dungeon in the far south-west corner, reached through a grate in the city streets.
export const SEWER = { x0: -335, x1: -195, z0: 195, z1: 335, entry: [-205, 205], grate: [-36, 36] };
// Cave: a rock dungeon in the far north-east, reached through a cave mouth in the forest.
export const CAVE = { x0: 205, x1: 335, z0: -335, z1: -205, entry: [215, -215], mouth: [WALL + 150, -62] };
// City grid: six bands between the streets (index 0 = west/north ... 5 = east/south)
const BANDS = [[-84, -62], [-54, -34], [-26, -6], [6, 26], [34, 54], [62, 84]];
const DIRV = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
const oddNear = v => { const f = Math.floor(v); return (f % 2 === 0 || f % 2 === -0) ? (v - f < 0.5 ? f - 1 : f + 1) : f; };   // nearest tile center (odd integer)
const cell = (ix, iz) => ({ x0: BANDS[ix][0], x1: BANDS[ix][1], z0: BANDS[iz][0], z1: BANDS[iz][1] });
const overlaps = (a, b, pad = 0) => !(a.x1 + pad < b.x0 || a.x0 - pad > b.x1 || a.z1 + pad < b.z0 || a.z0 - pad > b.z1);

export class City {
  constructor(scene) {
    this.scene = scene; this.colliders = []; this.dynamic = []; this.buildings = []; this.roads = []; this.trees = []; this.lamps = []; this.scorch = [];
    this.doors = []; this.houses = []; this.containers = []; this.notes = []; this.floors = []; this.spots = {}; this.streets = []; this.fadeables = [];
    this.sets = {}; this.f3d = {}; this.torchLights = []; this.night = false; this.winter = false; this.darkness = 0;
    this.buildTextures(); this.buildGround(); this.buildWalls(); this.buildTower(); this.buildCity(); this.buildOutside(); buildRegions(this); this.buildSewer(); this.buildCave(); buildCrypt(this); this.finalizeSets(); this.buildTiles(); this.buildWater();
    for (const d of this.doors) this.dynamic.push(d.col);   // doors block only while closed; never baked into the walk grid
    this.buildHash();
    // painter's order: every solid thing of the city sorts by its footprint on the ground (see billboard.js); the tile floor stays as is
    if (VIEW.painter) { const tiles = new Set(this.tiles.meshes); this.scene.traverse(m => { if (m.isMesh && !tiles.has(m) && m.material && m.material.isMeshLambertMaterial) groundDepth(m.material); }); }
  }
  // ---------- materials ----------
  buildTextures() {
    const Tx = (name, fb, rep) => Assets.texture(name, fb, { repeat: rep });
    this.tex = {
      gold: Tx('tex_goldstone_wall', PX.texGoldstone(), 1), cobble: Tx('tex_cobblestone', PX.texCobble(), 1), grass: Tx('tex_grass', PX.texGrass(), 1), snow: Tx('tex_snow', PX.texSnow(), 1),
      dirt: Tx('tex_dirt_path', PX.texDirt(), 1), roof: Tx('tex_roof_red', PX.texRoof(), 1), plaster: Tx('tex_plaster_timber', PX.texPlaster(), 1), planks: Tx('tex_wood_planks', PX.texPlanks(), 1), water: Tx('tex_water', PX.texWater(), 1), ice: Tx(null, PX.texIce(), 1), stone: Tx(null, PX.texStoneGray(), 1), sewer: Tx('tex_sewer_stone', PX.texStoneGray(), 1), sewage: Tx('tex_sewer_water', PX.texWater(), 1),
      walk: Tx(null, PX.texWalk(), 1), rock: Tx(null, PX.texRock(), 1), gravel: Tx(null, PX.texGravel(), 1),
    };
    const mk = (tex, rx, ry, extra = {}) => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshLambertMaterial({ map: t, ...extra }); };
    this.mk = mk;
    this.winMat = new THREE.MeshLambertMaterial({ color: 0x9ad0ff, emissive: 0x224466 });
    this.woodMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2e }); this.darkWood = new THREE.MeshLambertMaterial({ color: 0x4a2a10 }); this.stoneMat = mk(this.tex.stone, 1, 1); this.clothMats = [0x2b5fc7, 0xc94a3f, 0x5fae45, 0xd9a1c9, 0xf6c12e].map(c => new THREE.MeshLambertMaterial({ color: c }));
    this.doorMat = mk(this.tex.planks, 1, 1); this.doorMat.color.setHex(0xa07040);
  }
  box(w, h, d, mat, x, y, z, shadow = true) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = shadow; m.receiveShadow = true; this.scene.add(m); return m; }
  addBox(cx, cz, w, d) { this.colliders.push({ type: 'box', minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 }); }
  addCircle(x, z, r) { this.colliders.push({ type: 'circle', x, z, r }); }
  addDynamic(c) { this.dynamic.push(c); return c; }
  // ground shadow width per set, as a fraction of the sprite width (0 = none: flat things, wall-mounted things, the cave mouth)
  static SHADOW = { oak: 0.6, pine: 0.5, pineW: 0.5, big: 0.5, bigW: 0.5, lamp: 0.8, statue: 0.7, well: 0.9, bench: 0.9, crates: 0.9, barrel: 0.9, cart: 0.9, sign: 0.6, stallA: 0.9, stallB: 0.9, fountain: 0.9, rock: 0.9, bush: 0.9, dummy: 0.7, grave: 0.8, banner: 0.4, mushroom: 0.8, hedge: 0.9, fence: 0, flowers: 0, cavemouth: 0, scorch: 0, stalactite: 0 };
  // a 3D model set when assets3d has the model for this set, else a sprite billboard set
  // the user's painted objects replace the old sprites of a set; the drawn height is kept and the width follows the art
  userArt(name) { if (!this._art) { this._art = {}; const cut = (img, c, r, names) => { if (!img) return; const cells = sliceSheet(img, c, r); if (cells.length !== c * r) return; cells.forEach((cv, i) => { if (names[i]) { cv.smooth = true; this._art[names[i]] = cv; } }); };
      cut(Assets.images.arbustos_pedras, 4, 2, ['bush', 'bushBig', 'bushBerry', 'hedge', 'pebbles', 'rock', 'rockMoss', 'cliff']);
      cut(Assets.images.inverno, 4, 2, ['W_treeRound', 'W_oak', 'W_pineSmall', 'W_pine', 'W_dead', 'W_bush', 'W_rock', 'W_grass']);
      cut(Assets.images.arvores, 4, 2, ['treeRound', 'oak', 'big', 'pineSmall', 'pine', 'bigW', 'treeSwamp', 'treeDark']); } return this._art[name] || null; }
  // nature on the ground (trees, stones, bushes, grass, flowers) casts no drop shadow (user's choice)
  static NO_SHADOW = /^(oak|pine|pineW|big|bigW|treeRound|pineSmall|treeSwamp|treeDark|rock|bush|bushBig|bushBerry|hedge|pebbles|rockMoss|cliff|flowers|mushroom|stalactite|plant_)/;
  set(name, src, max, w, h) { if (City.NO_SHADOW.test(name)) City.SHADOW[name] = 0; const art = this.userArt(name); if (art) { src = art; const s = new BillboardSet(this.scene, art, max, City.SHADOW[name] ?? 0.7), add = s.add.bind(s), k = art.width / art.height; s.add = (x, z, ww, hh, y) => add(x, z, hh * k, hh, y); s.w = h * k; s.h = h; this.sets[name] = s; return s; }
    const pm = PROP_MODELS[name]; const s = pm && Models.has(pm.model) ? new ModelSet(this.scene, pm, max) : new BillboardSet(this.scene, src, max, City.SHADOW[name] ?? 0.7); s.w = w; s.h = h; this.sets[name] = s; return s; }
  finalizeSets() { for (const s of Object.values(this.sets)) s.finalize(); for (const s of Object.values(this.f3d)) s.finalize(); }
  // instanced 3D furniture and fixtures (KayKit / Kenney), one set per model; null when the model is missing
  fset(model, max = 400, shadow = true) { if (!Models.has(model)) return null; return this.f3d[model] || (this.f3d[model] = new PropSet(this.scene, model, max, { shadow })); }
  faceAll() { for (const s of Object.values(this.sets)) s.face(); }
  spot(kind, x, z) { (this.spots[kind] = this.spots[kind] || []).push([x, z]); }

  // ---------- ground ----------
  buildGround() {
    const road = (x, z, w, d) => this.roads.push({ x, z, w, d });
    road(WALL + 95, 0, 190, 9); road(WALL + 110, 30, 9, 70); road(0, WALL + 45, 9, 90); road(WALL + 120, -40, 9, 60); road(WALL + 140, -62, 40, 9);
    // streets inside the walls: [axis, center, from, to, half] — half 6 = avenue (road 8 + sidewalks), half 4 = street (road 4 + sidewalks)
    this.streetDefs = [
      ['x', 0, -88, 88, 6], ['z', 0, -88, 88, 6],
      ['x', -30, -88, 88, 4], ['x', 30, -88, 88, 4], ['x', -58, -34, 88, 4], ['x', 58, -88, 88, 4],
      ['z', -30, -88, 88, 4], ['z', 30, -88, 88, 4], ['z', -58, -34, 88, 4], ['z', 58, -88, 88, 4],
    ];
    for (const [axis, c, a, b, h] of this.streetDefs) { const len = b - a, mid = (a + b) / 2; const rect = axis === 'x' ? { x: c, z: mid, w: h * 2, d: len } : { x: mid, z: c, w: len, d: h * 2 }; this.streets.push({ ...rect, kind: 'walk' }); this.streets.push(axis === 'x' ? { x: c, z: mid, w: (h - 2) * 2, d: len, kind: 'road' } : { x: mid, z: c, w: len, d: (h - 2) * 2, kind: 'road' }); }
    this.colliders.push({ type: 'box', minX: -163, maxX: -137, minZ: -WORLD, maxZ: WORLD });   // river
    this.colliders.push({ type: 'box', minX: -WORLD - 10, maxX: -WORLD, minZ: -WORLD, maxZ: WORLD }, { type: 'box', minX: WORLD, maxX: WORLD + 10, minZ: -WORLD, maxZ: WORLD }, { type: 'box', minX: -WORLD, maxX: WORLD, minZ: -WORLD - 10, maxZ: -WORLD }, { type: 'box', minX: -WORLD, maxX: WORLD, minZ: WORLD, maxZ: WORLD + 10 });
  }
  // ---------- walls ----------
  wallSeg(cx, cz, w, d, h = 9) {
    const m = this.box(w, h, d, this.mk(this.tex.gold, Math.max(w, d) / 4, h / 4), cx, h / 2, cz); this.addBox(cx, cz, w, d);
    const along = w > d, len = along ? w : d; const bm = this.mk(this.tex.gold, 1, 1);
    for (let i = 0; i < Math.floor(len / 3); i++) { const off = -len / 2 + 1.5 + i * 3; this.box(along ? 1.5 : w + 0.4, 1.4, along ? d + 0.4 : 1.5, bm, along ? cx + off : cx, h + 0.7, along ? cz : cz + off, false); }
    this.box(along ? w : w + 1, 0.3, along ? d + 1 : d, this.mk(this.tex.stone, len / 4, 1), cx, h + 0.15, cz, false);
    return m;
  }
  tower(cx, cz, r, h, roofColor = 0x2b5fc7) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, h, 12), this.mk(this.tex.gold, 6, h / 4)); m.position.set(cx, h / 2, cz); m.castShadow = true; m.receiveShadow = true; this.scene.add(m);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 1.25, r * 1.5, 12), new THREE.MeshLambertMaterial({ color: roofColor })); cone.position.set(cx, h + r * 0.75, cz); cone.castShadow = true; this.scene.add(cone);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.15, 1.2, 12), this.mk(this.tex.gold, 6, 1)); ring.position.set(cx, h - 0.3, cz); this.scene.add(ring);
    this.addCircle(cx, cz, r + 0.2); this.buildings.push({ x: cx, z: cz, w: r * 2, d: r * 2, kind: 'tower' }); return m;
  }
  buildWalls() {
    const W = WALL, Tk = 2.4;
    this.wallSeg(-W, 0, Tk, W * 2); this.wallSeg(0, -W, W * 2, Tk);
    const segLen = W - GATE_HALF; this.wallSeg(W, -(GATE_HALF + segLen / 2), Tk, segLen); this.wallSeg(W, GATE_HALF + segLen / 2, Tk, segLen);
    this.wallSeg(-(GATE_HALF + segLen / 2), W, segLen, Tk); this.wallSeg(GATE_HALF + segLen / 2, W, segLen, Tk);
    this.box(Tk + 1.5, 2.5, GATE_HALF * 2 + 1, this.mk(this.tex.gold, 3, 1), W, 9 - 1.25 + 1.2, 0); this.box(GATE_HALF * 2 + 1, 2.5, Tk + 1.5, this.mk(this.tex.gold, 3, 1), 0, 9 - 1.25 + 1.2, W);
    [[-W, -W], [W, -W], [-W, W], [W, W]].forEach(([x, z]) => this.tower(x, z, 5, 14));
    this.tower(W, -(GATE_HALF + 4.5), 4, 13); this.tower(W, GATE_HALF + 4.5, 4, 13); this.tower(-(GATE_HALF + 4.5), W, 4, 13); this.tower(GATE_HALF + 4.5, W, 4, 13);
    this.southGate = new THREE.Vector3(0, 0, W); this.eastGate = new THREE.Vector3(W, 0, 0);
    const ban = this.set('banner', Assets.src(TOP('prop_banner'), PX.propBanner()), 60, 1.6, 4);
    { const add = ban.add.bind(ban); ban.add = (x, z, w, h) => add(x, z, w, h, 0); }   // banners stand on their own pole on the ground (the old heights hung them on walls that the 2D view does not have)
    ban.add(W - 5.2, -(GATE_HALF + 4.5), 1.6, 4, 8); ban.add(W - 5.2, GATE_HALF + 4.5, 1.6, 4, 8);
    for (let z = -80; z <= 80; z += 20) if (Math.abs(z) > 10) ban.add(W - 1.6, z, 1.4, 3.5, 4.5);
    for (let x = -80; x <= 80; x += 20) ban.add(x, -W + 1.6, 1.4, 3.5, 4.5);
    for (let x = -80; x <= 80; x += 20) if (Math.abs(x) > 10) ban.add(x, W - 1.6, 1.4, 3.5, 4.5);
    this.spot('muralha', -84, 12); this.spot('muralha', 84, -22); this.spot('muralha', 20, 85); this.spot('muralha', -40, -85);
  }
  // ---------- the Light tower ----------
  buildTower() {
    const x = 0, z = -62, r = 6, h = 38;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 14), this.mk(this.tex.gold, 8, h / 4)); m.position.set(x, h / 2, z); m.castShadow = true; this.scene.add(m);
    for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.8, 14), this.mk(this.tex.gold, 8, 1)); ring.position.set(x, 10 + i * 12, z); this.scene.add(ring); }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.3, r * 1.3, 1.4, 14), this.mk(this.tex.gold, 8, 1)); top.position.set(x, h + 0.7, z); this.scene.add(top);
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; this.box(1.2, 1.4, 1.2, this.mk(this.tex.gold, 1, 1), x + Math.cos(a) * r * 1.2, h + 2.1, z + Math.sin(a) * r * 1.2, false); }
    this.box(1.6, 2.2, 1.6, this.mk(this.tex.stone, 1, 1), x, h + 2.5, z, false);
    this.lightPos = new THREE.Vector3(x, h + 4.6, z);
    this.lightMesh = new THREE.Mesh(new THREE.OctahedronGeometry(1.0, 0), new THREE.MeshBasicMaterial({ color: 0xffe066 })); this.lightMesh.position.copy(this.lightPos); this.scene.add(this.lightMesh);
    const glowTex = new THREE.CanvasTexture(PX.propGemGlow()); this.lightGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffd23a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); this.lightGlow.scale.set(12, 12, 1); this.lightGlow.position.copy(this.lightPos); this.scene.add(this.lightGlow);
    this.lightBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.9, 90, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); this.lightBeam.position.set(x, h + 50, z); this.scene.add(this.lightBeam);
    this.lightPoint = new THREE.PointLight(0xffd23a, 120, 90, 1.5); this.lightPoint.position.copy(this.lightPos); this.scene.add(this.lightPoint);
    this.addCircle(x, z, r + 0.3); this.buildings.push({ x, z, w: r * 2, d: r * 2, kind: 'light' });
    // Praça da Luz: a golden ring on the ground marks the fight zone, statues and banners
    const ring = new THREE.Mesh(new THREE.RingGeometry(7, 8, 32), new THREE.MeshBasicMaterial({ color: 0xf6c12e, transparent: true, opacity: 0.7 })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.07, -44); this.scene.add(ring); this.altar = new THREE.Vector3(0, 0, -44);
    const st = this.set('statue', Assets.src(TOP('prop_statue_knight'), PX.propStatue()), 12, 2.2, 4.4);
    [[-10, -52], [10, -52], [-14, -38], [14, -38]].forEach(([sx, sz]) => { st.add(sx, sz, 2.2, 4.4); this.addCircle(sx, sz, 0.9); });
    for (const [bx, bz] of [[-22, -80], [22, -80], [-22, -44], [22, -44]]) this.sets.banner.add(bx, bz, 1.6, 4, 5);
  }
  // ---------- buildings with interiors ----------
  // cx,cz centre; w = width of the front wall, d = depth from front to back, h = wall height; dir = side the door faces (n/s/e/w)
  house(cx, cz, w, d, h, dir, kind = 'house', o = {}) {
    if (!VIEW.roofs) h = Math.min(h, kind === 'keep' ? 4.5 : kind === 'chapel' || kind === 'tavern' || kind === 'barracks' ? 3.6 : 3.0);   // Diablo look: low walls, you see inside
    const F = DIRV[dir], Rv = [-F[1], F[0]], alongX = F[1] !== 0, t = 0.4, dw = 1.6, sx = alongX ? w : d, sz = alongX ? d : w;
    const L2W = (u, v) => [cx + u * Rv[0] - (v - d / 2) * F[0], cz + u * Rv[1] - (v - d / 2) * F[1]];
    const doorW = alongX ? oddNear(cx) : oddNear(cz); const du = alongX ? (doorW - cx) * Rv[0] : (doorW - cz) * Rv[1];   // door centred on a tile so paths run through it
    const g = new THREE.Group(); g.position.set(cx, 0, cz); const walls = []; const col = (u0, u1, v0, v1) => { const [ax, az] = L2W((u0 + u1) / 2, (v0 + v1) / 2); const su = Math.abs(u1 - u0), sv = Math.abs(v1 - v0); this.addBox(ax, az, alongX ? su : sv, alongX ? sv : su); };
    const wallBox = (u0, u1, v0, v1, y0, y1, collide = true) => { const su = Math.abs(u1 - u0), sv = Math.abs(v1 - v0); const geo = new THREE.BoxGeometry(alongX ? su : sv, y1 - y0, alongX ? sv : su); const [ax, az] = L2W((u0 + u1) / 2, (v0 + v1) / 2); geo.translate(ax - cx, (y0 + y1) / 2, az - cz); walls.push(geo); if (collide) col(u0, u1, v0, v1); };
    wallBox(-w / 2, w / 2, d - t, d, 0, h); wallBox(-w / 2, -w / 2 + t, 0, d, 0, h); wallBox(w / 2 - t, w / 2, 0, d, 0, h);
    wallBox(-w / 2, du - dw / 2, 0, t, 0, h); wallBox(du + dw / 2, w / 2, 0, t, 0, h); wallBox(du - dw / 2, du + dw / 2, 0, t, 2.4, h, false);
    const tint = o.tint ?? [0xffffff, 0xfff2cc, 0xe8f0ff, 0xffe4e0, 0xf0ffe0][Math.floor(rng() * 5)];
    const wallMat = o.wall ? this.mk(this.tex[o.wall], w / 4, h / 4) : kind === 'chapel' || kind === 'keep' || kind === 'barracks' ? this.mk(this.tex.stone, w / 4, h / 4) : kind === 'tavern' || kind === 'smithy' ? this.mk(this.tex.planks, w / 3, h / 3) : this.mk(this.tex.plaster, w / 5, h / 5); wallMat.color.setHex(tint);
    const wm = new THREE.Mesh(mergeGeometries(walls), wallMat); wm.castShadow = true; wm.receiveShadow = true; g.add(wm);
    const roofH = kind === 'chapel' ? h * 1.1 : kind === 'keep' ? 3 : Math.max(2.4, Math.min(sx, sz) * 0.42); const roofMat = kind === 'chapel' || kind === 'keep' ? new THREE.MeshLambertMaterial({ color: 0x2b5fc7 }) : this.mk(this.tex.roof, 3, 3); if (kind === 'house' || kind === 'home') roofMat.color.setHex([0xffffff, 0xd8c8b0, 0xb8c8d8, 0xffffff][Math.floor(rng() * 4)]);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), roofMat); roof.rotation.y = Math.PI / 4; roof.scale.set(sx * 0.78, roofH, sz * 0.78); roof.position.y = h + roofH / 2; roof.castShadow = true; if (VIEW.roofs) g.add(roof);
    const place = (u, y, v, su, sh, sv, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? su : sv, sh, alongX ? sv : su), mat); const [ax, az] = L2W(u, v); m.position.set(ax - cx, y, az - cz); g.add(m); return m; };
    // windows (two rows on sobrados), balcony, chimney, spire
    const rows = o.sobrado ? [h * 0.3, h * 0.72] : [h * 0.55];
    for (const y of rows) for (const s of [-1, 1]) { if (Math.abs(s * w * 0.3 - du) < 1.4 && y < 3) continue; place(s * w * 0.3, y, -0.06, 1.0, 1.0, 0.16, this.winMat); place(s * w * 0.3, y, d + 0.06, 1.0, 1.0, 0.16, this.winMat); }
    for (const y of rows) if (d > 7) place(w / 2 + 0.06, y, d * 0.5, 0.16, 1.0, 1.0, this.winMat);
    if (o.sobrado) { place(du, 4.0, -0.6, dw + 1.6, 0.16, 1.2, this.woodMat); place(du, 4.5, -1.15, dw + 1.6, 0.8, 0.1, this.darkWood); }
    if (VIEW.roofs && ((kind === 'house' && rng() < 0.55) || kind === 'bakery' || kind === 'tavern' || kind === 'smithy' || kind === 'home')) place(w * 0.3, h + roofH * 0.45, d * 0.3, 1, roofH * 0.9, 1, this.stoneMat);
    if (kind === 'chapel' && VIEW.roofs) { const spire = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 6), new THREE.MeshLambertMaterial({ color: 0x2b5fc7 })); spire.position.set(0, h + roofH + 3, 0); g.add(spire); place(0, h + roofH + 7, 0, 0.3, 1.6, 0.3, new THREE.MeshLambertMaterial({ color: 0xf6c12e })); place(0, h + roofH + 7.3, 0, 1.0, 0.3, 0.3, new THREE.MeshLambertMaterial({ color: 0xf6c12e })); }
    if (kind === 'tavern') place(du + 2.8, 3.2, -0.3, 2.0, 1.2, 0.2, new THREE.MeshLambertMaterial({ color: 0xd9a441 }));
    if (kind === 'smithy') place(du + 2.6, 2.6, -0.3, 1.6, 1.0, 0.2, new THREE.MeshLambertMaterial({ color: 0x3a3a40 }));
    this.scene.add(g); this.registerFade(g, cx, cz, sx, sz, h + (VIEW.roofs ? roofH : 0), VIEW.roofs ? roof : null, wm);
    // door: pivot at the hinge, swings inward
    const [hx, hz] = L2W(du - dw / 2, t / 2); const dg = new THREE.Group(); dg.position.set(hx, 0, hz); dg.rotation.y = alongX ? (Rv[0] > 0 ? 0 : Math.PI) : (Rv[1] > 0 ? -Math.PI / 2 : Math.PI / 2);
    const pivot = new THREE.Group(); dg.add(pivot); const panel = new THREE.Mesh(new THREE.BoxGeometry(dw, 2.3, 0.14), this.doorMat); panel.position.set(dw / 2, 1.15, 0); panel.castShadow = true; pivot.add(panel); const knob = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.2), new THREE.MeshLambertMaterial({ color: 0xf6c12e })); knob.position.set(dw - 0.25, 1.1, 0); pivot.add(knob); this.scene.add(dg);
    const [dx, dz] = L2W(du, t / 2); const dcol = { type: 'box', minX: dx - (alongX ? dw / 2 + 0.1 : 0.3), maxX: dx + (alongX ? dw / 2 + 0.1 : 0.3), minZ: dz - (alongX ? 0.3 : dw / 2 + 0.1), maxZ: dz + (alongX ? 0.3 : dw / 2 + 0.1), off: false };
    const house = { id: this.houses.length, x: cx, z: cz, w: sx, d: sz, h, dir, kind, F, inside: L2W(du, 2.0), outside: L2W(du, -1.6), spots: [], name: null };
    const door = { x: dx, z: dz, dir, house, pivot, col: dcol, open: false, angle: 0, locked: false, diff: 0, autoT: 0, kind: 'door' }; this.doors.push(door); house.door = door;
    // a lit torch on the facade beside the door; its light only exists at night (the scene's light pool picks the nearest)
    { const tu = du + (du < 0 ? 1.35 : -1.35); if (Math.abs(tu) < w / 2 - 0.3 && this.fset('dng_torch_lit')) { const [tx, tz] = L2W(tu, -0.22); this.fset('dng_torch_lit').add(tx, tz, 0.8, Math.atan2(-F[0], -F[1]), 1.25); const [lx, lz] = L2W(tu, -0.9); const l = new THREE.PointLight(0xffa040, 0, 9, 1.6); l.position.set(lx, 2.1, lz); this.scene.add(l); this.torchLights.push(l); } }
    // interior: floor, furniture, chest, note
    const [ix0, iz0] = L2W(-w / 2 + t, t), [ix1, iz1] = L2W(w / 2 - t, d - t); this.floors.push({ x0: Math.min(ix0, ix1), z0: Math.min(iz0, iz1), x1: Math.max(ix0, ix1), z1: Math.max(iz0, iz1), kind });
    const furn = (u, v, su, sv, sh, y, mat, collide = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? su : sv, sh, alongX ? sv : su), mat); const [ax, az] = L2W(u, v); m.position.set(ax, y, az); m.castShadow = true; m.receiveShadow = true; this.scene.add(m); if (collide) col(u - su / 2, u + su / 2, v - sv / 2, v + sv / 2); return m; };
    const bed = (u, v, blanket) => { if (m3('dng_bed', u, v, 2.9 * 1.70 / 3.06, 'v', -1)) { col(u - 1.0, u + 1.0, v - 1.5, v + 1.5); return L2W(u, v); } furn(u, v, 2.0, 3.0, 0.5, 0.25, this.woodMat); furn(u, v, 1.8, 2.8, 0.3, 0.55, this.clothMats[4], false).material = new THREE.MeshLambertMaterial({ color: 0xf4efe0 }); furn(u, v + 0.5, 1.8, 1.9, 0.14, 0.72, blanket, false); furn(u, v - 1.05, 1.2, 0.5, 0.2, 0.75, new THREE.MeshLambertMaterial({ color: 0xffffff }), false); return L2W(u, v); };
    const table = (u, v, su = 1.8, sv = 1.1) => { if (su <= 2 && m3('dng_table', u, v, 0.85)) { col(u - 0.85, u + 0.85, v - 0.85, v + 0.85); return L2W(u, v); } furn(u, v, su, sv, 0.12, 0.8, this.woodMat); furn(u, v, 0.3, 0.3, 0.8, 0.4, this.darkWood, false); return L2W(u, v); };
    const stool = (u, v, face = 0) => face && m3('dng_chair', u, v, 1.05, 'u', face) ? null : furn(u, v, 0.5, 0.5, 0.45, 0.22, this.darkWood, false);
    const shelf = (u, v) => { if (m3('dng_shelves', u, v, 2.0, 'u', u < 0 ? 1 : -1)) { col(u - 0.25, u + 0.25, v - 0.9, v + 0.9); return; } furn(u, v, 0.4, 1.6, 2.0, 1.0, this.darkWood); for (let i = 0; i < 3; i++) furn(u, v - 0.5 + i * 0.5, 0.42, 0.3, 0.3, 1.5 + (i % 2) * 0.3, this.clothMats[i], false); };
    const fireplace = (u, v) => { furn(u, v, 0.7, 1.8, 2.4, 1.2, this.stoneMat); furn(u - 0.2, v, 0.3, 0.9, 0.5, 0.3, new THREE.MeshLambertMaterial({ color: 0xff6a00, emissive: 0xff4400 }), false); };
    // a 3D model placed in house coordinates: +z of the model points along `ax` ('v' = into the house, 'u' = along the facade), times `sgn`
    const m3 = (model, u, v, height, ax = 'v', sgn = 1, y = 0) => { const set = this.fset(model); if (!set) return false; const [x, z] = L2W(u, v); const dx = ax === 'v' ? -F[0] : Rv[0], dz = ax === 'v' ? -F[1] : Rv[1]; set.add(x, z, height, Math.atan2(dx * sgn, dz * sgn), y); return true; };
    const rug = (u, v, su, sv, color) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(alongX ? su : sv, alongX ? sv : su), new THREE.MeshLambertMaterial({ color })); m.rotation.x = -Math.PI / 2; const [ax, az] = L2W(u, v); m.position.set(ax, 0.03, az); m.receiveShadow = true; this.scene.add(m); };
    const chest = (u, v, data) => { const base = furn(u, v, 1.1, 0.7, 0.6, 0.3, this.woodMat); const lid = furn(u, v, 1.1, 0.7, 0.2, 0.7, this.darkWood, false); const [ax, az] = L2W(u, v); const c = { x: ax, z: az, house, lid, base, items: { ...(data.items || {}) }, gold: data.gold || 0, locked: data.lock > 0, diff: data.lock || 0, opened: false, kind: 'container' }; this.containers.push(c); house.chest = c; return c; };
    const note = (u, v, y, title, text) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.42), new THREE.MeshLambertMaterial({ color: 0xf4efe0 })); m.rotation.x = -Math.PI / 2; m.rotation.z = R(-0.4, 0.4); const [ax, az] = L2W(u, v); m.position.set(ax, y, az); this.scene.add(m); this.notes.push({ x: ax, z: az, title, text, house, kind: 'note' }); };
    const info = o.info || null;
    if (kind === 'library') {
      // the greatest library in the world (Owl-Bear City): shelves along every wall and in rows, reading tables, books to read
      for (let v = 1.6; v < d - 1.0; v += 2.1) { shelf(-w / 2 + 0.7, v); shelf(w / 2 - 0.7, v); }
      for (const u of [-w * 0.22, w * 0.22]) for (let v = 4.5; v < d - 3; v += 2.6) { shelf(u - 0.3, v); shelf(u + 0.3, v); }
      for (const [u, v] of [[0, d * 0.35], [0, d * 0.65]]) { table(u, v, 1.8, 1.1); stool(u - 1.2, v, 1); stool(u + 1.2, v, -1); house.spots.push(L2W(u - 1.3, v), L2W(u + 1.3, v)); }
      rug(0, d * 0.5, 2.6, d * 0.7, 0x3a5aa0); fireplace(0, d - 0.7);
      (o.books || []).forEach(([title, text], i) => note(i % 2 ? 0.5 : -0.5, d * (i < 2 ? 0.35 : 0.65) + (i % 2 ? 0.2 : -0.2), 0.87, title, text));
    } else if (kind === 'throne') {
      // the owl-bear king's hall: a long rug to a raised throne between stone columns
      rug(0, d * 0.5, 2.2, d - 2.5, 0x8a2a3a); furn(0, d - 2.0, 4.2, 2.6, 0.35, 0.17, this.stoneMat); furn(0, d - 1.3, 1.8, 0.6, 3.0, 1.5, this.stoneMat); furn(0, d - 1.9, 1.6, 1.0, 0.5, 0.6, this.clothMats[1] || this.woodMat);
      for (let v = 3; v < d - 3; v += 3.2) for (const s of [-1, 1]) furn(s * (w / 2 - 2.2), v, 0.8, 0.8, 3.2, 1.6, this.stoneMat);
      house.throne = L2W(0, d - 2.4); house.spots.push(house.throne);
    } else if (kind === 'house' || kind === 'home') {
      house.bed = bed(-w / 2 + 1.5, d - 2.1, this.clothMats[Math.floor(rng() * 4)]); const tp = table(w * 0.15, d * 0.5); stool(w * 0.15 - 1.3, d * 0.5, 1); stool(w * 0.15 + 1.3, d * 0.5, -1); shelf(-w / 2 + 0.65, d * 0.35);
      if (o.sobrado || rng() < 0.5) fireplace(w / 2 - 0.8, d * 0.55); rug(du, 1.9, 2.0, 1.4, [0xa03030, 0x305090, 0x806020][Math.floor(rng() * 3)]);
      if (info) { chest(w / 2 - 1.0, d - 0.9, info.chest || {}); note(w * 0.15, d * 0.5, 0.87, info.note[0], info.note[1]); }
      house.spots.push(L2W(w * 0.15 - 1.3, d * 0.5 + 0.8), L2W(0, 1.8));
    } else if (kind === 'tavern') {
      furn(w / 2 - 1.0, d * 0.5, 1.2, d * 0.6, 1.1, 0.55, this.darkWood); for (let i = 0; i < 4; i++) furn(w / 2 - 1.0, d * 0.25 + i * d * 0.17, 0.6, 0.6, 0.8, 1.5, this.woodMat, false);
      for (const [u, v] of [[-w * 0.3, d * 0.3], [-w * 0.3, d * 0.7], [0, d * 0.3], [0, d * 0.7]]) { table(u, v, 1.6, 1.6); for (const [su, sv] of [[-1.2, 0], [1.2, 0], [0, 1.2], [0, -1.2]]) { stool(u + su, v + sv); house.spots.push(L2W(u + su * 1.1, v + sv * 1.1)); } }
      fireplace(-w / 2 + 0.8, d * 0.5); rug(du, 1.8, 2.4, 1.6, 0x804020); if (info) { chest(w / 2 - 1.2, d - 0.9, info.chest || {}); note(0, d * 0.3, 0.87, info.note[0], info.note[1]); }
    } else if (kind === 'chapel') {
      for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { furn(s * 2.0, 3 + i * 2.4, 2.8, 0.5, 0.9, 0.45, this.darkWood); house.spots.push(L2W(s * 2.0, 3.8 + i * 2.4)); }
      furn(0, d - 1.4, 2.4, 1.0, 1.1, 0.55, this.stoneMat); furn(0, d - 1.4, 0.6, 0.6, 0.7, 1.45, new THREE.MeshBasicMaterial({ color: 0xffe066 }), false); rug(0, d * 0.5, 1.6, d - 4, 0x8a2020);
      if (info) { chest(w / 2 - 1.0, d - 1.0, info.chest || {}); note(0, d - 1.4, 1.12, info.note[0], info.note[1]); }
    } else if (kind === 'smithy') {
      furn(w * 0.3, d - 1.2, 2.6, 1.6, 2.2, 1.1, this.stoneMat); furn(w * 0.3, d - 1.2, 1.2, 0.5, 0.6, 1.0, new THREE.MeshLambertMaterial({ color: 0xff6a00, emissive: 0xff4400 }), false);
      furn(-w * 0.2, d * 0.5, 1.0, 0.5, 0.5, 0.95, new THREE.MeshLambertMaterial({ color: 0x3a3a40 })); furn(-w * 0.2, d * 0.5, 0.6, 0.6, 0.7, 0.35, this.darkWood, false);
      furn(-w / 2 + 0.6, d * 0.5, 0.4, 2.4, 1.8, 0.9, this.darkWood); for (let i = 0; i < 4; i++) furn(-w / 2 + 0.6, d * 0.5 - 0.9 + i * 0.6, 0.1, 0.1, 1.2, 1.2, new THREE.MeshLambertMaterial({ color: 0xb0c8e0 }), false);
      if (info) { chest(w / 2 - 1.0, 1.2, info.chest || {}); note(-w * 0.2, d * 0.5, 1.02, info.note[0], info.note[1]); } house.spots.push(L2W(-w * 0.2, d * 0.5 + 1.2)); this.spot('forja', ...L2W(-w * 0.2, d * 0.5 + 1.2));
    } else if (kind === 'bakery') {
      for (const u of [-w * 0.25, w * 0.1]) { furn(u, d - 1.2, 2.2, 1.6, 2.0, 1.0, this.stoneMat); furn(u, d - 1.2, 1.0, 0.4, 0.6, 0.6, new THREE.MeshLambertMaterial({ color: 0xff8c2a, emissive: 0xff5a00 }), false); }
      const tp = table(0, d * 0.45, 2.8, 1.0); for (let i = 0; i < 4; i++) furn(-1.0 + i * 0.7, d * 0.45, 0.5, 0.4, 0.3, 1.0, new THREE.MeshLambertMaterial({ color: 0xd9a441 }), false); shelf(w / 2 - 0.65, d * 0.5);
      if (info) { chest(-w / 2 + 1.0, d - 0.9, info.chest || {}); note(0.9, d * 0.45, 0.87, info.note[0], info.note[1]); } house.spots.push(L2W(0, d * 0.45 - 1.2)); this.spot('padaria', ...L2W(0, d * 0.45 - 1.2));
    } else if (kind === 'barracks') {
      for (let i = 0; i < 4; i++) bed(-w / 2 + 1.5 + i * 2.6, d - 2.1, this.clothMats[0]); table(0, 2.6, 2.4, 1.2); stool(-1.5, 2.6); stool(1.5, 2.6);
      furn(w / 2 - 0.6, d * 0.4, 0.4, 2.4, 1.8, 0.9, this.darkWood); for (let i = 0; i < 4; i++) furn(w / 2 - 0.6, d * 0.4 - 0.9 + i * 0.6, 0.1, 0.1, 1.2, 1.2, new THREE.MeshLambertMaterial({ color: 0xb0c8e0 }), false);
      if (info) { chest(-w / 2 + 1.0, 1.2, info.chest || {}); note(0, 2.6, 0.87, info.note[0], info.note[1]); } house.spots.push(L2W(-1.5, 3.6), L2W(1.5, 3.6));
    } else if (kind === 'keep') {
      rug(0, d * 0.5, 2.4, d - 2, 0xa02020); furn(0, d - 1.6, 1.6, 1.2, 0.6, 0.3, this.stoneMat); furn(0, d - 1.3, 1.2, 0.5, 1.8, 1.2, new THREE.MeshLambertMaterial({ color: 0xf6c12e }), false); furn(0, d - 1.6, 1.0, 0.8, 0.4, 0.8, this.clothMats[1], false);
      for (const s of [-1, 1]) { furn(s * (w / 2 - 1.2), d * 0.5, 0.6, 0.6, 2.6, 1.3, this.stoneMat); for (let i = 0; i < 3; i++) furn(s * (w / 2 - 1.0), 3 + i * 3, 0.3, 0.3, 1.6, 0.8, new THREE.MeshLambertMaterial({ color: 0xffe066, emissive: 0x806000 }), false); }
      if (info) { chest(w / 2 - 1.2, 1.4, info.chest || {}); note(0, d - 2.6, 0.05, info.note[0], info.note[1]); } house.throne = L2W(0, d - 2.6); house.spots.push(L2W(-2, d * 0.5), L2W(2, d * 0.5)); this.spot('castelo', ...L2W(-2, d * 0.4));
    }
    this.houses.push(house); this.buildings.push({ x: cx, z: cz, w: sx, d: sz, kind, dir, house });
    if (info) { house.name = info.name; door.locked = (info.lock || 0) > 0; door.diff = info.lock || 0; }
    return house;
  }
  // a residential block: two rows of houses facing opposite streets, a shared yard with fences in between
  lots(c, orient, reserved = [], out = []) {
    const vert = orient === 'v'; const len = vert ? c.z1 - c.z0 : c.x1 - c.x0; const start = vert ? c.z0 : c.x0;
    for (const side of [0, 1]) {
      let cur = start + R(0.8, 1.6); const dir = vert ? (side ? 'e' : 'w') : (side ? 's' : 'n');
      while (cur < start + len - 6.5) {
        let w = R(7, 10); if (cur + w > start + len - 0.8) w = start + len - 0.8 - cur; if (w < 6) break; const depthAvail = (vert ? c.x1 - c.x0 : c.z1 - c.z0); const d = R(5.5, Math.min(7.5, (depthAvail - 7) / 2)), sob = rng() < 0.38, h = sob ? 7.4 : 4.8; const mid = cur + w / 2;
        const back = side ? (vert ? c.x1 : c.z1) - d / 2 - 0.5 : (vert ? c.x0 : c.z0) + d / 2 + 0.5; const cx = vert ? back : mid, cz = vert ? mid : back;
        const rect = { x0: cx - (vert ? d : w) / 2, x1: cx + (vert ? d : w) / 2, z0: cz - (vert ? w : d) / 2, z1: cz + (vert ? w : d) / 2 };
        if (!reserved.some(r => overlaps(rect, r, 1.2))) { const fam = familyFor(this.familyIdx++); const hs = this.house(cx, cz, w, d, h, dir, 'house', { sobrado: sob, info: fam }); hs.family = fam; out.push(hs); if (rng() < 0.5) { const [fx, fz] = hs.outside; this.sets.flowers.add(fx + (vert ? 0 : 2.2), fz + (vert ? 2.2 : 0), 2.0, 1.0); } }
        cur += w + R(1.8, 3.2);
      }
    }
    // yard: fences on the two open sides with a gap in the middle, something in the middle
    const fence = this.sets.fence, gapAt = (a, b) => (a + b) / 2; const yard = vert ? { a0: c.x0 + 9.5, a1: c.x1 - 9.5 } : { a0: c.z0 + 9.5, a1: c.z1 - 9.5 };
    const fenceLine = (fixed, from, to, alongXAxis) => { const mid = gapAt(from, to); for (let v = from; v < to; v += 3.0) { if (Math.abs(v + 1.5 - mid) < 1.6) continue; if (alongXAxis) fence.add(v + 1.5, fixed, 3.0, 1.3); else fence.add(fixed, v + 1.5, 3.0, 1.3); } if (alongXAxis) { this.addBox((from + mid - 1.6) / 2, fixed, mid - 1.6 - from, 0.3); this.addBox((mid + 1.6 + to) / 2, fixed, to - mid - 1.6, 0.3); } else { this.addBox(fixed, (from + mid - 1.6) / 2, 0.3, mid - 1.6 - from); this.addBox(fixed, (mid + 1.6 + to) / 2, 0.3, to - mid - 1.6); } };
    if (vert) { if (yard.a1 - yard.a0 > 4) { fenceLine(c.z0 + 0.4, yard.a0, yard.a1, true); fenceLine(c.z1 - 0.4, yard.a0, yard.a1, true); } } else if (yard.a1 - yard.a0 > 4) { fenceLine(c.x0 + 0.4, yard.a0, yard.a1, false); fenceLine(c.x1 - 0.4, yard.a0, yard.a1, false); }
    const yx = (c.x0 + c.x1) / 2, yz = (c.z0 + c.z1) / 2; const k = rng(); const yardRect = { x0: yx - 2.5, x1: yx + 2.5, z0: yz - 2.5, z1: yz + 2.5 };
    if (this.houses.some(h => overlaps(yardRect, { x0: h.x - h.w / 2, x1: h.x + h.w / 2, z0: h.z - h.d / 2, z1: h.z + h.d / 2 }, 1.0)) || reserved.some(r => overlaps(yardRect, r, 1.0))) return out;
    if (k < 0.35) { this.sets.oak.add(yx, yz, 6, 7.5); this.addCircle(yx, yz, 0.7); this.trees.push({ x: yx, z: yz, oak: true }); } else if (k < 0.55) { this.sets.well.add(yx, yz, 2.4, 2.4); this.addCircle(yx, yz, 1.2); this.spot('poco', yx + 1.8, yz + 1.2); } else if (k < 0.8) { this.sets.crates.add(yx, yz, 2.4, 2.0); this.addBox(yx, yz, 2, 1.6); this.sets.barrel.add(yx + 2.5, yz + 0.5, 2.4, 1.8); } else { this.sets.flowers.add(yx, yz, 2.2, 1.1); this.sets.bench.add(yx + 2.5, yz, 2.2, 1.0); }
    return out;
  }
  buildCity() {
    this.familyIdx = 0;
    // ---- shared prop sets ----
    const oak = this.set('oak', Assets.src(TOP('sprite_tree_oak'), PX.propOak(false)), 120, 6, 7.5);
    this.set('lamp', Assets.src(TOP('prop_lamp_post'), PX.propLamp(true)), 160, 1.1, 3.4); this.set('fence', Assets.src(TOP('prop_fence'), PX.propFence()), 400, 3.0, 1.3); this.set('hedge', Assets.src(TOP('prop_hedge'), PX.propHedge()), 160, 3.0, 1.5);
    this.set('bench', Assets.src(TOP('prop_bench'), PX.propBench()), 60, 2.2, 1.0); this.set('flowers', Assets.src(TOP('prop_flowers'), PX.propFlowers()), 160, 2.2, 1.1); this.set('dummy', Assets.src(TOP('prop_training_dummy'), PX.propDummy()), 12, 1.4, 2.2);
    this.set('crates', Assets.src(TOP('prop_crates'), PX.propCrates()), 60, 2.4, 2.0); this.set('barrel', Assets.src(TOP('prop_barrel_crate'), PX.propBarrel()), 80, 2.4, 1.8); this.set('well', Assets.src(TOP('prop_well'), S.WELL), 8, 2.4, 2.4);
    this.set('grave', Assets.src(TOP('prop_grave'), PX.propGrave()), 12, 1.0, 1.4); this.set('bush', Assets.src(TOP('prop_bush'), PX.propBush()), 160, 1.8, 1.2); this.set('cart', Assets.src(TOP('prop_hay_cart'), PX.propCart()), 6, 4, 2.7); this.set('sign', Assets.src(TOP('prop_signpost'), PX.propSign()), 8, 1.8, 2.4);
    const stallA = this.set('stallA', Assets.src(TOP('prop_market_stall'), PX.propStall('#d93b3b')), 12, 4.2, 3.5), stallB = this.set('stallB', Assets.src(TOP('prop_market_stall'), PX.propStall('#2b5fc7')), 12, 4.2, 3.5);
    const fountain = this.set('fountain', Assets.src(TOP('prop_fountain'), PX.propFountain()), 2, 5, 4.2);
    const treeAt = (x, z) => { oak.add(x, z, 6, 7.5); this.addCircle(x, z, 0.7); this.trees.push({ x, z, oak: true }); };
    const benchAt = (x, z) => { this.sets.bench.add(x, z, 2.2, 1.0); this.addBox(x, z, 2, 0.8); this.spot('jardins', x, z + 1.1); };
    // ---- Praça da Fonte (centre) ----
    fountain.add(0, 0, 5, 4.2); this.addCircle(0, 0, 2.6); this.plazaR = 15;
    [[-11, -11], [11, -11], [-11, 11], [11, 11]].forEach(([x, z]) => treeAt(x, z));
    for (let i = 0; i < 8; i++) { const a = (i + 0.5) / 8 * Math.PI * 2; const x = Math.cos(a) * 9, z = Math.sin(a) * 9; this.sets.bench.add(x, z, 2.2, 1.0); this.addBox(x, z, 2, 0.8); this.spot('praca', x + Math.cos(a) * 1.4, z + Math.sin(a) * 1.4); }
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; if (Math.abs(Math.sin(a)) < 0.35 || Math.abs(Math.cos(a)) < 0.35) continue; this.sets.bush.add(Math.cos(a) * 14, Math.sin(a) * 14, 1.8, 1.2); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8; this.sets.lamp.add(Math.cos(a) * 13, Math.sin(a) * 13, 1.1, 3.4); this.lamps.push({ x: Math.cos(a) * 13, z: Math.sin(a) * 13 }); }
    for (let i = 0; i < 6; i++) this.spot('praca', R(-6, 6), R(-6, 6));
    // ---- Mercado (cell 2,2): stalls in two rows, the merchant's own stall ----
    for (let i = 0; i < 6; i++) { const x = -22 + (i % 3) * 6, z = i < 3 ? -20 : -12; (i % 2 ? stallA : stallB).add(x, z, 4.2, 3.5); this.addBox(x, z, 4, 2.5); this.spot('market', x, z + 2.6); if (i < 3) this.spot('market', x, z - 2.6); }
    [[-25, -24], [-8, -24], [-25, -8]].forEach(([x, z]) => { this.sets.barrel.add(x, z, 2.4, 1.8); this.addBox(x, z, 2, 1.2); }); this.sets.crates.add(-8, -9, 2.4, 2.0); this.addBox(-8, -9, 2, 1.6);
    this.sets.lamp.add(-16, -16, 1.1, 3.4); this.lamps.push({ x: -16, z: -16 }); this.merchantPos = [-16, -9];
    // ---- Taverna (cell 3,2) with a terrace facing the avenue ----
    const tav = this.house(16, -16, 16, 12, 8, 's', 'tavern', { info: SPECIAL.tavern }); tav.name = 'Taverna do Urubu Dourado'; this.tavern = tav;
    [[10, -7.5], [22, -7.5]].forEach(([x, z]) => { this.sets.bench.add(x, z, 2.2, 1.0); this.addBox(x, z, 2, 0.8); this.spot('taverna', x, z + 1.2); }); this.sets.barrel.add(24.5, -11, 2.4, 1.8); this.addBox(24.5, -11, 2, 1.2); this.sets.sign.add(8, -9.5, 1.8, 2.4);
    for (const s of tav.spots) this.spot('taverna', s[0], s[1]);
    this.sets.crates.add(24, -24, 2.4, 2.0); this.addBox(24, -24, 2, 1.6); this.sets.cart.add(12, -24, 4, 2.7); this.addBox(12, -24, 3.6, 2);
    // ---- Capela (cell 2,3) with a small graveyard ----
    const chap = this.house(-17, 17, 10, 16, 9, 'n', 'chapel', { info: SPECIAL.chapel }); chap.name = 'Capela da Luz'; this.chapel = chap; for (const s of chap.spots) this.spot('capela', s[0], s[1]);
    [[-9, 12], [-9, 16], [-9, 20], [-9, 24]].forEach(([x, z]) => { this.sets.grave.add(x, z, 1.0, 1.4); this.addCircle(x, z, 0.4); }); treeAt(-24, 23); this.sets.flowers.add(-23, 10, 2.2, 1.1);
    for (let z = 7; z <= 25; z += 3) this.sets.hedge.add(-6.5, z + 1, 3.0, 1.5); this.addBox(-6.5, 16.5, 0.5, 18);
    // ---- Forja (cell 3,3): the smithy, forge and anvil outside ----
    const smith = this.house(18, 16, 12, 10, 5, 'w', 'smithy', { info: SPECIAL.smithy }); smith.name = 'Forja do Lucas'; this.smithy = smith;
    this.box(2.2, 1.6, 1.6, this.mk(this.tex.stone, 1, 1), 9, 0.8, 10); this.box(1.4, 0.3, 1.0, new THREE.MeshLambertMaterial({ color: 0xff6a00, emissive: 0xff4400 }), 9, 1.7, 10); this.addBox(9, 10, 2.2, 1.6);
    this.box(1.2, 0.5, 0.5, new THREE.MeshLambertMaterial({ color: 0x3a3a40 }), 9, 0.9, 13.5); this.box(0.6, 0.7, 0.6, new THREE.MeshLambertMaterial({ color: 0x5a3a1a }), 9, 0.35, 13.5); this.addBox(9, 13.5, 1.2, 0.6);
    this.forgeLight = new THREE.PointLight(0xff6a00, 12, 14); this.forgeLight.position.set(9, 2.2, 10); this.scene.add(this.forgeLight); this.forgePos = new THREE.Vector3(9, 0, 13.5); this.smithPos = [9, 17];
    this.sets.crates.add(9, 23, 2.4, 2.0); this.addBox(9, 23, 2, 1.6); this.sets.barrel.add(13, 24, 2.4, 1.8); this.addBox(13, 24, 2, 1.2); this.spot('forja', 11, 12);
    // ---- Thomas's home (cell 2,4) ----
    const home = this.house(-16, 40, 10, 8, 5, 'n', 'home', { info: SPECIAL.home }); home.name = 'Casa de Sir Thomas'; this.home = home; this.bedPos = new THREE.Vector3(home.bed[0], 0, home.bed[1]); this.homeSpawn = new THREE.Vector3(home.inside[0], 0, home.inside[1] + 1);
    // ---- Padaria (cell 1,2): on the avenue ----
    const bak = this.house(-44, -12, 12, 9, 5, 's', 'bakery', { info: SPECIAL.bakery }); bak.name = 'Padaria da Dona Rosa'; this.bakery = bak; this.cookPos = [-41, -4.5];
    this.box(2.2, 0.9, 0.9, this.woodMat, -44, 0.45, -5.2); for (let i = 0; i < 3; i++) this.box(0.5, 0.3, 0.4, new THREE.MeshLambertMaterial({ color: 0xd9a441 }), -44.7 + i * 0.7, 1.05, -5.2, false); this.addBox(-44, -5.2, 2.2, 0.9);
    // ---- Castelo Real (cells 0..1 x 0..1): keep, towers, courtyard, gate to the south ----
    const kx = -59, kz = -74; const keep = this.house(kx, kz, 30, 14, 12, 's', 'keep', { info: SPECIAL.keep }); keep.name = 'Castelo Real'; this.keep = keep; this.throne = new THREE.Vector3(keep.throne[0], 0, keep.throne[1]);
    [[kx - 15, kz - 7], [kx + 15, kz - 7], [kx - 15, kz + 7], [kx + 15, kz + 7]].forEach(([x, z]) => this.tower(x, z, 3.2, 17, 0x2b5fc7));
    const cw = this.mk(this.tex.gold, 8, 1); const yard = (x, z, w, d) => { this.box(w, 3.2, d, cw, x, 1.6, z); this.addBox(x, z, w, d); };
    yard(-34, -60, 1.2, 52); yard(-70.5, -34, 31, 1.2); yard(-44.5, -34, 21, 1.2); this.castleGate = new THREE.Vector3(kx, 0, -33); this.castleYard = { x0: -86, x1: -34, z0: -86, z1: -34 };
    this.sets.banner.add(kx - 8, kz + 7.6, 1.6, 4, 7); this.sets.banner.add(kx + 8, kz + 7.6, 1.6, 4, 7); this.sets.banner.add(kx - 4, -34.9, 1.4, 3.5, 3.5); this.sets.banner.add(kx + 4, -34.9, 1.4, 3.5, 3.5);
    [[kx - 10, kz + 14], [kx + 10, kz + 14], [kx - 10, kz + 24], [kx + 10, kz + 24]].forEach(([x, z]) => this.sets.flowers.add(x, z, 2.2, 1.1)); this.sets.statue.add(kx, kz + 24, 2.2, 4.4); this.addCircle(kx, kz + 24, 0.9);
    [[-80, -40], [-40, -40], [-80, -80], [-40, -82]].forEach(([x, z]) => treeAt(x, z)); [[kx - 16, -45], [kx + 16, -45]].forEach(([x, z]) => benchAt(x, z));
    for (const [x, z] of [[-50, -50], [-70, -50], [-44, -40]]) { this.sets.lamp.add(x, z, 1.1, 3.4); this.lamps.push({ x, z }); } this.spot('castelo', kx - 4, -40); this.spot('castelo', kx + 4, -40); this.guardPosts = [[kx - 2.5, -31], [kx + 2.5, -31]];
    this.buildings.push({ x: -60, z: -60, w: 52, d: 52, kind: 'castleyard' });
    // ---- Praça da Luz (cells 2..3 x 0..1) ----
    [[-22, -80], [22, -80]].forEach(([x, z]) => treeAt(x, z)); for (const [x, z] of [[-18, -56], [18, -56], [-18, -72], [18, -72], [-8, -36], [8, -36]]) { this.sets.lamp.add(x, z, 1.1, 3.4); this.lamps.push({ x, z }); }
    [[-20, -50], [20, -50]].forEach(([x, z]) => { this.sets.flowers.add(x, z, 2.2, 1.1); this.sets.flowers.add(x, z + 3, 2.2, 1.1); }); [[-14, -66], [14, -66]].forEach(([x, z]) => benchAt(x, z));
    // ---- Quartel e Campo de Treino (cells 4..5 x 0) ----
    const bar = this.house(44, -73, 16, 10, 6, 's', 'barracks', { info: SPECIAL.barracks }); bar.name = 'Quartel da Guarda'; this.barracks = bar;
    [[60, -76], [66, -76], [72, -76], [60, -68], [66, -68], [72, -68]].forEach(([x, z]) => { this.sets.dummy.add(x, z, 1.4, 2.2); this.addCircle(x, z, 0.5); this.spot('treino', x, z + 2.2); });
    for (let x = 56; x < 84; x += 3) if (Math.abs(x + 1.5 - 70) > 1.8) this.sets.fence.add(x + 1.5, -62.5, 3.0, 1.3); this.addBox(61, -62.5, 14, 0.3); this.addBox(79, -62.5, 10, 0.3);
    this.sets.crates.add(80, -80, 2.4, 2.0); this.addBox(80, -80, 2, 1.6); this.sets.barrel.add(78, -66, 2.4, 1.8); this.addBox(78, -66, 2, 1.2); this.sets.banner.add(36, -67.5, 1.4, 3.5, 3.5); this.sets.banner.add(52, -67.5, 1.4, 3.5, 3.5);
    // ---- Hortas (cells 0..1 x 5) ----
    this.plots = []; for (const [px, pz] of [[-76, 68], [-60, 68], [-44, 68], [-76, 78], [-60, 78], [-44, 78]]) { this.plots.push({ x: px, z: pz, w: 12, d: 7 }); for (let x = px - 6; x < px + 6; x += 3) { this.sets.fence.add(x + 1.5, pz - 3.8, 3.0, 1.3); if (Math.abs(x + 1.5 - px) > 1.8) this.sets.fence.add(x + 1.5, pz + 3.8, 3.0, 1.3); } this.addBox(px, pz - 3.8, 12, 0.3); this.addBox(px - 3.5, pz + 3.8, 5, 0.3); this.addBox(px + 3.5, pz + 3.8, 5, 0.3); for (let i = 0; i < 6; i++) this.sets.bush.add(px - 4.2 + (i % 3) * 4.2, pz - 1.5 + Math.floor(i / 3) * 3, 1.6, 1.0); this.spot('hortas', px, pz + 5.5); }
    this.sets.well.add(-52, 73, 2.4, 2.4); this.addCircle(-52, 73, 1.2); this.spot('poco', -50, 74.5); this.sets.cart.add(-38, 64, 4, 2.7); this.addBox(-38, 64, 3.6, 2); this.sets.crates.add(-82, 64, 2.4, 2.0); this.addBox(-82, 64, 2, 1.6);
    // ---- Jardins (cells 4..5 x 4..5): lawns, paths, hedges, flower beds, benches, a pond ----
    for (const [cx, cz] of [[44, 44], [73, 44], [44, 73], [73, 73]]) { for (let i = 0; i < 4; i++) this.sets.flowers.add(cx - 6 + (i % 2) * 12, cz - 5 + Math.floor(i / 2) * 10, 2.2, 1.1); benchAt(cx - 4, cz); benchAt(cx + 4, cz); }
    [[38, 38], [50, 38], [38, 50], [66, 38], [80, 38], [66, 80], [80, 66], [38, 80], [50, 80]].forEach(([x, z]) => treeAt(x, z)); this.pond = { x: 73, z: 73, r: 4.5 }; this.colliders.push({ type: 'circle', x: 73, z: 73, r: 4.6 });
    for (let x = 36; x < 84; x += 3) { if (Math.abs(x + 1.5 - 44) > 2 && Math.abs(x + 1.5 - 73) > 2 && Math.abs(x + 1.5 - 58) > 5) { this.sets.hedge.add(x + 1.5, 34.5, 3.0, 1.5); } } this.addBox(39, 34.5, 6, 0.4); this.addBox(49.5, 34.5, 5, 0.4); this.addBox(66, 34.5, 10, 0.4); this.addBox(80, 34.5, 8, 0.4);
    this.sets.statue.add(58, 58, 2.2, 4.4); this.addCircle(58, 58, 0.9); for (const [x, z] of [[44, 48], [73, 48], [44, 77], [73, 77]]) { this.sets.lamp.add(x, z, 1.1, 3.4); this.lamps.push({ x, z }); }
    // ---- residential blocks ----
    const reserved = [{ x0: -50.5, x1: -37.5, z0: -17, z1: -7 }, { x0: -21.5, x1: -10.5, z0: 35.5, z1: 44.5 }];
    const resCells = [[0, 2], [1, 2], [0, 3], [1, 3], [0, 4], [1, 4], [2, 5], [3, 5], [3, 4], [4, 1], [5, 1], [4, 2], [5, 2], [4, 3], [5, 3], [2, 4]];
    for (const [ix, iz] of resCells) this.lots(cell(ix, iz), (ix + iz) % 2 ? 'v' : 'h', reserved);
    // ---- street furniture: lamps and benches on the sidewalks ----
    const crosses = { x: [0, -30, 30, -58, 58], z: [0, -30, 30, -58, 58] };
    for (const [axis, c, a, b, h] of this.streetDefs) { let k = 0; for (let v = a + 8; v < b - 6; v += 14, k++) { const other = axis === 'x' ? 'z' : 'x'; if (crosses[other].some(cc => Math.abs(cc - v) < 7)) continue; const side = (k % 2 ? 1 : -1) * (h - 0.9); const x = axis === 'x' ? c + side : v, z = axis === 'x' ? v : c + side; if (Math.abs(x) < 16 && Math.abs(z) < 16) continue; if (x < -34 && z < -34) continue; this.sets.lamp.add(x, z, 1.1, 3.4); this.lamps.push({ x, z }); this.addCircle(x, z, 0.3); } }
    // plaza lights (night)
    this.plazaLights = []; [[10, 10], [-10, 10], [10, -10], [-10, -10], [0, -44], [-59, -45], [-16, -16], [16, -8], [58, 58], [9, 12]].forEach(([x, z]) => { const l = new THREE.PointLight(0xffb040, 0, 26, 1.2); l.position.set(x, 4, z); this.scene.add(l); this.plazaLights.push(l); });
    this.sets.sign.add(6, WALL - 8, 1.8, 2.4); this.sets.sign.add(0, WALL + 12, 1.8, 2.4); this.sets.sign.add(WALL + 10, 6, 1.8, 2.4); this.sets.sign.add(WALL + 110, 26, 1.8, 2.4);
    this.maitePos = [3.5, 5]; this.pipoPos = [-5, -8]; this.guardPos = [84, 3.5];
  }
  // ---------- outside ----------
  buildOutside() {
    const pine = this.set('pine', Assets.src(TOP('sprite_tree_pine'), S.TREES.summer), 1400, 5, 8), pineW = this.set('pineW', Assets.src(TOP('sprite_tree_pine_snow'), S.TREES.winter), 1400, 5, 8);
    const big = this.set('big', Assets.src(TOP('sprite_tree_pine'), S.TREES.bigSummer), 60, 9, 14), bigW = this.set('bigW', Assets.src(TOP('sprite_tree_pine_snow'), S.TREES.bigWinter), 60, 9, 14);
    const rock = this.set('rock', Assets.src(TOP('prop_rock'), S.ROCKS.summer), 300, 2.6, 1.6);
    const add = (x, z, isBig = false) => { const s = R(0.85, 1.3); if (isBig) { big.add(x, z, 9 * s, 14 * s); bigW.add(x, z, 9 * s, 14 * s); this.addCircle(x, z, 1.2); } else { pine.add(x, z, 5 * s, 8 * s); pineW.add(x, z, 5 * s, 8 * s); this.addCircle(x, z, 0.6); } this.trees.push({ x, z }); };
    const C = CAVE; const blocked = (x, z) => (Math.abs(x) < WALL + 12 && Math.abs(z) < WALL + 12) || (x > WALL && Math.abs(z) < 9) || (x > WALL + 100 && x < WALL + 120 && z > -8 && z < 70) || (x > WALL + 115 && x < WALL + 125 && z > -70 && z < 0) || (x > WALL + 120 && x < WALL + 162 && z > -67 && z < -57) || Math.abs(x + 150) < 20 || (x < SEWER.x1 + 8 && z > SEWER.z0 - 8) || (x > C.x0 - 8 && z < C.z1 + 8) || cryptBlocked(x, z) || regionBlocked(x, z);
    for (let i = 0; i < 700; i++) { const x = R(-WORLD, WORLD), z = R(-WORLD, WORLD); if (blocked(x, z)) continue; add(x, z, rng() < 0.08); }
    for (let i = 0; i < 700; i++) { const x = R(WALL + 180, WORLD), z = R(-WORLD, WORLD); if (blocked(x, z)) continue; add(x, z, rng() < 0.15); }
    for (let i = 0; i < 140; i++) { const x = R(-WORLD, WORLD), z = R(-WORLD, WORLD); if (blocked(x, z)) continue; rock.add(x, z, 2.6, 1.6); this.addCircle(x, z, 1.0); }
    // grass tufts and round bushes (KayKit Forest Nature, instanced per 40 m chunk): the fields read as the kit's forest floor
    const tuft = this.fset('forest/Grass_1_A', 2000, false), tuft2 = this.fset('forest/Grass_2_A', 1000, false), bush = this.fset('forest/Bush_1_A', 300);
    if (tuft) for (let i = 0; i < 2600; i++) { const x = R(-WORLD, WORLD), z = R(-WORLD, WORLD); if (blocked(x, z)) continue; (i % 3 ? tuft : tuft2 || tuft).add(x, z, R(0.6, 1.0), R(0, 6.28)); }
    if (bush) for (let i = 0; i < 260; i++) { const x = R(-WORLD, WORLD), z = R(-WORLD, WORLD); if (blocked(x, z)) continue; bush.add(x, z, R(0.7, 1.3), R(0, 6.28)); this.addCircle(x, z, 0.6); }
    // the user's painted ground plants (assets/plantas_rasteiras.png, grid 4x3), one instanced sprite set per kind
    const PL = Assets.images.plantas_rasteiras ? sliceSheet(Assets.images.plantas_rasteiras, 4, 3) : null;
    if (PL && PL.length === 12) { PL.forEach(c => c.smooth = true); this.plantSets = [];
      const kinds = [['tufoA', 0, 0.55, 14000], ['tufoB', 1, 0.55, 14000], ['tufoC', 2, 0.5, 6000], ['gramaAlta', 3, 0.95, 4000], ['florVermelha', 4, 0.55, 2400], ['florAmarela', 5, 0.55, 2400], ['florAzul', 6, 0.55, 2400], ['trevo', 7, 0.45, 4000], ['samambaia', 8, 0.85, 3000], ['lirios', 9, 0.9, 160], ['taboa', 10, 1.25, 300], ['cogumelos', 11, 0.6, 1200]];
      const S2 = {}; for (const [name, i, h0, max] of kinds) { const img = PL[i], h = h0 * 1.6; const set = new BillboardSet(this.scene, img, max, 0); set.w = h * img.width / img.height; set.h = h; this.sets['plant_' + name] = set; S2[name] = { set, h, r: img.width / img.height }; }   // no ground shadow: small plants read better without it
      const put = (k, x, z, s = 1) => { const p = S2[k]; p.set.add(x, z, p.h * p.r * s, p.h * s); };
      const water = (x, z) => Math.abs(x + 150) < 13 || Math.hypot(x - this.pond.x, z - this.pond.z) < this.pond.r;
      for (let i = 0; i < 110000; i++) { const x = R(-WORLD, WORLD), z = R(-WORLD, WORLD); if (blocked(x, z) || water(x, z)) continue; const forest = x > WALL + 175, k = rng(); const s = R(0.8, 1.25);
        if (forest) put(k < 0.3 ? 'samambaia' : k < 0.5 ? 'gramaAlta' : k < 0.62 ? 'cogumelos' : k < 0.8 ? 'tufoB' : 'trevo', x, z, s);
        else put(k < 0.3 ? 'tufoA' : k < 0.55 ? 'tufoB' : k < 0.68 ? 'tufoC' : k < 0.74 ? 'florVermelha' : k < 0.8 ? 'florAmarela' : k < 0.86 ? 'florAzul' : k < 0.94 ? 'trevo' : 'gramaAlta', x, z, s); }
      // river banks and the pond: cattails on the edges, water lilies on the water
      for (let z = -WORLD + 4; z < WORLD - 4; z += R(3, 7)) { if (rng() < 0.6) put('taboa', -164.5 + R(-1, 0.6), z, R(0.8, 1.2)); if (rng() < 0.6) put('taboa', -135.5 + R(-0.6, 1), z + 2, R(0.8, 1.2)); if (rng() < 0.25) put('lirios', -150 + R(-9, 9), z, R(0.8, 1.2)); }
      for (let i = 0; i < 18; i++) { const a = rng() * 6.28, r = rng() * this.pond.r * 0.8; put('lirios', this.pond.x + Math.cos(a) * r, this.pond.z + Math.sin(a) * r, R(0.7, 1)); } }
    // extra painted bushes and stones across the fields and the forest
    if (this.userArt('bushBig')) { const B = this.set('bushBig', null, 700, 2.2, 1.7), BB = this.set('bushBerry', null, 420, 1.6, 1.2), PB = this.set('pebbles', null, 1000, 1.2, 0.6), RM = this.set('rockMoss', null, 300, 2.2, 1.5), CL = this.set('cliff', null, 120, 3, 3.4);
      for (let i = 0; i < 7000; i++) { const x = R(-WORLD, WORLD), z = R(-WORLD, WORLD); if (blocked(x, z)) continue; const k = rng(), forest = x > WALL + 175, s = R(0.8, 1.25);
        if (k < 0.1) { B.add(x, z, 0, 1.7 * s); this.addCircle(x, z, 0.8 * s); } else if (k < 0.16) { BB.add(x, z, 0, 1.2 * s); this.addCircle(x, z, 0.6 * s); } else if (k < 0.3) PB.add(x, z, 0, 0.6 * s);
        else if (k < (forest ? 0.36 : 0.33)) { RM.add(x, z, 0, 1.5 * s); this.addCircle(x, z, 1.0 * s); } else if (k < (forest ? 0.38 : 0.34)) { CL.add(x, z, 0, 3.4 * s); this.addCircle(x, z, 1.3 * s); } } }
    this.forestGate = new THREE.Vector3(WALL + 185, 0, 0); add(WALL + 185, -9, true); add(WALL + 185, 9, true);
    // cave mouth at the end of the north road, flanked by rocks
    const cm = this.set('cavemouth', Assets.src(TOP('prop_cave_mouth'), PX.propCaveMouth()), 2, 7, 5); cm.add(C.mouth[0] + 4, C.mouth[1], 7, 5); this.addBox(C.mouth[0] + 4, C.mouth[1] - 1.2, 6, 1.6); rock.add(C.mouth[0] + 1, C.mouth[1] - 5, 2.6, 1.6); rock.add(C.mouth[0] + 7, C.mouth[1] + 4, 2.6, 1.6);
    const sc = this.set('scorch', Assets.src(TOP('prop_scorch_mark'), PX.propScorch()), 60, 3, 3);
    this.scorchGroup = new THREE.Group(); this.scene.add(this.scorchGroup); const scMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(Assets.src(TOP('prop_scorch_mark'), PX.propScorch())), transparent: true, depthWrite: false });
    scMat.map.magFilter = THREE.NearestFilter; scMat.map.colorSpace = THREE.SRGBColorSpace;
    for (let x = WALL + 6; x < WALL + 182; x += 6) { const z = Math.sin(x * 0.15) * 2.5; const m = new THREE.Mesh(new THREE.PlaneGeometry(R(2.5, 4), R(2, 3)), scMat); m.rotation.x = -Math.PI / 2; m.rotation.z = rng() * 6; m.position.set(x, 0.06, z); this.scorchGroup.add(m); this.scorch.push({ x, z }); }
    this.scorchGroup.visible = false; this.sets.pineW.visible = false; this.sets.bigW.visible = false;
  }
  // ---------- state ----------
  setWinter(on) {
    this.winter = on; this.paintTiles(on);
    this.sets.pine.visible = !on; this.sets.big.visible = !on; this.sets.pineW.visible = on; this.sets.bigW.visible = on; this.scorchGroup.visible = on;
    if (this.sets.oak && this.sets.oak.ps) this.sets.oak.setColor(on ? 0xdde8f4 : 0xffffff);
    else if (this.sets.oak && !this.userArt('oak')) { const img = on ? PX.propOak(true) : Assets.src(TOP('sprite_tree_oak'), PX.propOak(false)); this.sets.oak.mesh.material = this.sets.oak.mesh.material.clone(); const t = new THREE.Texture(img); t.needsUpdate = true; t.magFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; this.sets.oak.mesh.material.map = t; }
    if (!this.userArt('W_rock')) this.sets.rock.setColor(on ? 0xc9d6e2 : 0xffffff);
    for (const k of ['forest/Grass_1_A', 'forest/Grass_2_A']) if (this.f3d[k]) this.f3d[k].visible = !on;
    for (const k in this.sets) if (k.startsWith('plant_')) this.sets[k].visible = !on || k === 'plant_tufoA';   // ground plants sleep under the snow (dry grass stays)
    // the user's winter art: each set swaps to its snowy drawing and back
    const WIN = { oak: 'W_oak', pineW: 'W_pine', bigW: 'W_dead', bush: 'W_bush', bushBig: 'W_bush', bushBerry: 'W_bush', hedge: 'W_bush', rock: 'W_rock', rockMoss: 'W_rock', cliff: 'W_rock', plant_tufoA: 'W_grass' };
    for (const [k, w] of Object.entries(WIN)) { const set = this.sets[k], art = this.userArt(w); if (!set || !set.mesh || !art) continue; if (!set.summerMat) set.summerMat = set.mesh.material; set.mesh.material = on ? spriteMaterial(art) : set.summerMat; }   // tufts sleep under the snow
    if (this.f3d['forest/Bush_1_A']) this.f3d['forest/Bush_1_A'].setColor(on ? 0xe4ecf6 : 0xffffff);
  }
  // darkness 0..1 drives plaza lamps and lit windows
  setDarkness(k) { this.darkness = k; this.night = k > 0.5; for (const l of this.plazaLights) l.intensity = 40 * Math.max(0, (k - 0.35) / 0.65); this.winMat.emissive.setRGB(0.13 + 0.87 * k, 0.27 + 0.45 * k, 0.4 - 0.2 * k); this.forgeLight.intensity = this.night ? 16 : 8; const tk = Math.max(0, (k - 0.3) / 0.7) * 9; for (const l of this.torchLights) l.intensity = tk; }
  setNight(on) { this.setDarkness(on ? 1 : 0); }
  setLightStolen(on) { this.lightMesh.visible = this.lightGlow.visible = this.lightBeam.visible = !on; this.lightPoint.intensity = on ? 0 : 120; }
  buildSewer() {
    const Sw = SEWER, w = Sw.x1 - Sw.x0, d = Sw.z1 - Sw.z0, cx = (Sw.x0 + Sw.x1) / 2, cz = (Sw.z0 + Sw.z1) / 2;
    const wallMat = this.mk(this.tex.sewer, 4, 1); wallMat.color.setHex(0x6a7a70); const H = 3;
    const wall = (x, z, ww, dd) => { const m = this.box(ww, H, dd, wallMat, x, H / 2, z); this.addBox(x, z, ww, dd); return m; };
    wall(cx, Sw.z0, w + 2, 2); wall(cx, Sw.z1, w + 2, 2); wall(Sw.x0, cz, 2, d); wall(Sw.x1, cz, 2, d);
    wall(Sw.x0 + 45, Sw.z0 + 40, 70, 2); wall(Sw.x1 - 45, Sw.z0 + 70, 70, 2); wall(Sw.x0 + 45, Sw.z0 + 100, 70, 2);
    wall(Sw.x0 + 30, Sw.z0 + 20, 2, 30); wall(Sw.x1 - 30, Sw.z0 + 85, 2, 40); wall(Sw.x0 + 75, Sw.z1 - 20, 2, 30);
    this.colliders.push({ type: 'box', minX: Sw.x0 + 2, maxX: cx - 3, minZ: Sw.z1 - 12, maxZ: Sw.z1 - 4 }, { type: 'box', minX: cx + 3, maxX: Sw.x1 - 2, minZ: Sw.z1 - 12, maxZ: Sw.z1 - 4 });
    this.sewerLights = [[Sw.x0 + 20, Sw.z0 + 20], [Sw.x1 - 20, Sw.z0 + 55], [cx, Sw.z0 + 85], [Sw.x0 + 20, Sw.z1 - 25], [Sw.x1 - 25, Sw.z1 - 25]].map(([x, z]) => { const l = new THREE.PointLight(0x7fd08a, 14, 30, 1.6); l.position.set(x, 2.5, z); this.scene.add(l); return l; });
  }
  // Gruta do Norte: winding rock corridors and chambers, stalactites, glowing mushrooms, an underground pool
  buildCave() {
    const C = CAVE, w = C.x1 - C.x0, d = C.z1 - C.z0, cx = (C.x0 + C.x1) / 2, cz = (C.z0 + C.z1) / 2;
    const rockMat = this.mk(this.tex.rock, 4, 1); rockMat.color.setHex(0x8a8690); const H = 4;
    const wall = (x, z, ww, dd) => { const m = this.box(ww, H, dd, rockMat, x, H / 2, z); this.addBox(x, z, ww, dd); return m; };
    wall(cx, C.z0, w + 2, 2); wall(cx, C.z1, w + 2, 2); wall(C.x0, cz, 2, d); wall(C.x1, cz, 2, d);
    // chambers carved by walls: entry hall (south-west), long gallery, three chambers, the pool chamber in the north-east
    wall(C.x0 + 40, C.z1 - 30, 2, 50); wall(C.x0 + 60, C.z1 - 55, 40, 2); wall(C.x1 - 35, C.z1 - 40, 2, 60); wall(C.x0 + 30, C.z0 + 45, 50, 2); wall(C.x1 - 50, C.z0 + 30, 2, 50); wall(C.x0 + 75, C.z0 + 75, 2, 30);
    for (let i = 0; i < 14; i++) { const x = R(C.x0 + 6, C.x1 - 6), z = R(C.z0 + 6, C.z1 - 6); const r = R(1.5, 3.5); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat); m.position.set(x, r * 0.5, z); m.castShadow = true; this.scene.add(m); this.addCircle(x, z, r * 0.9); }
    const st = this.set('stalactite', Assets.src(TOP('prop_stalactite'), PX.propStalactite()), 80, 0.9, 1.8); for (let i = 0; i < 60; i++) { const x = R(C.x0 + 4, C.x1 - 4), z = R(C.z0 + 4, C.z1 - 4); st.add(x, z, 0.9, 1.8); this.addCircle(x, z, 0.35); }
    const mush = this.set('mushroom', Assets.src(TOP('prop_mushroom'), PX.propMushroom()), 40, 1.0, 0.9); this.caveLights = [];
    for (let i = 0; i < 30; i++) { const x = R(C.x0 + 5, C.x1 - 5), z = R(C.z0 + 5, C.z1 - 5); mush.add(x, z, 1.0, 0.9); if (i % 4 === 0) { const l = new THREE.PointLight(0x7fd0ff, 10, 18, 1.6); l.position.set(x, 1.2, z); this.scene.add(l); this.caveLights.push(l); } }
    this.cavePool = { x: C.x1 - 20, z: C.z0 + 18, r: 7 }; this.colliders.push({ type: 'circle', x: C.x1 - 20, z: C.z0 + 18, r: 7.2 });
  }
  // ---------- terrain tiles ----------
  // water surfaces over the water tiles: a translucent shiny layer whose ripples scroll (river, pond, cave pool)
  buildWater() {
    const t = this.tex.water.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1);
    this.waterMat = new THREE.MeshPhongMaterial({ color: 0x5ab0f0, map: t, transparent: true, opacity: 0.62, shininess: 90, specular: 0xbfe6ff, depthWrite: false });
    const add = (geo, x, z) => { geo.rotateX(-Math.PI / 2); const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + x) / 6, (p.getZ(i) + z) / 6); const m = new THREE.Mesh(geo, this.waterMat); m.position.set(x, 0.06, z); m.renderOrder = 1; this.scene.add(m); return m; };
    this.waters = [add(new THREE.PlaneGeometry(26, WORLD * 2, 1, 8), -150, 0), add(new THREE.CircleGeometry(this.pond.r + 0.2, 24), this.pond.x, this.pond.z), add(new THREE.CircleGeometry(this.cavePool.r + 0.2, 24), this.cavePool.x, this.cavePool.z)];
  }
  buildTiles() {
    const tm = this.tiles = new TileMap(this.scene, WORLD), Sw = SEWER, C = CAVE;
    tm.fillRect(-WALL, -WALL, WALL, WALL, T.grass);
    for (const s of this.streets) tm.fillRect(s.x - s.w / 2, s.z - s.d / 2, s.x + s.w / 2, s.z + s.d / 2, s.kind === 'road' ? T.cobble : T.walk);
    for (const r of this.roads) tm.fillRect(r.x - r.w / 2, r.z - r.d / 2, r.x + r.w / 2, r.z + r.d / 2, T.dirt);
    tm.fillRect(-88, -88, 88, -84, T.cobble); tm.fillRect(-88, 84, 88, 88, T.cobble); tm.fillRect(-88, -88, -84, 88, T.cobble); tm.fillRect(84, -88, 88, 88, T.cobble);   // lanes along the wall
    tm.fillRect(-163, -WORLD, -137, WORLD, T.water);
    tm.fillRect(WALL + 175, -WORLD, WORLD, WORLD, T.forest);   // the eastern forest floor: tall grass
    paintRegions(this, tm);
    tm.fillRect(-86, -86, -34, -34, T.plaza); tm.fillRect(-80, -62, -38, -36, T.plaza); tm.fillRect(-84, -60, -72, -40, T.grass); tm.fillRect(-46, -60, -36, -40, T.grass);   // castle courtyard with lawns
    tm.fillRect(-26, -86, 26, -34, T.plaza); tm.fillRect(-26, -86, -14, -74, T.grass); tm.fillRect(14, -86, 26, -74, T.grass);   // Praça da Luz
    tm.fillCircle(0, 0, this.plazaR, T.plaza); tm.fillRect(-26, -26, -6, -6, T.plaza);   // Praça da Fonte, Mercado
    tm.fillRect(6, -26, 26, -6, T.gravel); tm.fillRect(-26, 6, -6, 26, T.grass); tm.fillRect(-18, 6, -14, 10, T.gravel); tm.fillRect(6, 6, 26, 26, T.gravel);   // tavern yard, chapel lawn, smithy yard
    tm.fillRect(34, -84, 84, -62, T.dirt);   // Campo de Treino
    for (const p of this.plots) tm.fillRect(p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2, T.soil);   // Hortas
    for (const [cx, cz] of [[44, 44], [73, 44], [44, 73], [73, 73]]) { tm.fillRect(cx - 1, 34, cx + 1, 84, T.gravel); tm.fillRect(34, cz - 1, 84, cz + 1, T.gravel); } tm.fillCircle(this.pond.x, this.pond.z, this.pond.r, T.water);   // Jardins paths and pond
    for (const f of this.floors) tm.fillRect(f.x0, f.z0, f.x1, f.z1, f.kind === 'keep' || f.kind === 'chapel' ? T.plaza : T.planks);
    tm.fillRect(Sw.x0, Sw.z0, Sw.x1, Sw.z1, T.sewer); tm.fillRect(Sw.x0 + 2, Sw.z1 - 12, Sw.x1 - 2, Sw.z1 - 4, T.sewage);
    tm.fillRect(CRYPT.x0, CRYPT.z0, CRYPT.x1, CRYPT.z1, T.crypt);
    tm.fillRect(C.x0, C.z0, C.x1, C.z1, T.rock); tm.fillCircle(this.cavePool.x, this.cavePool.z, this.cavePool.r, T.water);
    tm.rasterize(this.colliders); this.paintTiles(false); tm.build();
  }
  paintTiles(winter) {
    const img = t => this.tex[t].image; const shade = (src, color, alpha) => { const n = Math.min(512, Math.max(128, src.width || 128)), c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'); x.imageSmoothingEnabled = n > 128; x.drawImage(src, 0, 0, n, n); x.fillStyle = color; x.globalAlpha = alpha; x.fillRect(0, 0, n, n); return c; };
    const soil = (() => { const c = shade(img('dirt'), '#3a2a18', 0.35); const x = c.getContext('2d'); x.globalAlpha = 0.5; x.fillStyle = '#2a1a0c'; for (let y = 6; y < 128; y += 16) x.fillRect(0, y, 128, 3); return c; })();
    // KayKit-forest look for open ground: flat colour with large soft patches (no pixel noise), seamless at the edges
    const smooth = (base, patches, seed) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 128, 128); let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (const [col, n, a] of patches) for (let i = 0; i < n; i++) { const px = r() * 128, pz = r() * 128, rad = 14 + r() * 30; for (const ox of [-128, 0, 128]) for (const oz of [-128, 0, 128]) { const g = x.createRadialGradient(px + ox, pz + oz, 0, px + ox, pz + oz, rad); g.addColorStop(0, col); g.addColorStop(1, col + '00'); x.globalAlpha = a; x.fillStyle = g; x.fillRect(px + ox - rad, pz + oz - rad, rad * 2, rad * 2); } } x.globalAlpha = 1; return c; };
    // the user's painted ground (assets/chao_cidade.png, grid 3x2): street cobbles, plaza, sidewalk slabs, gravel, dirt road,
    // garden soil; each image covers SPAN x SPAN tiles so stones keep a believable size
    const sheet = Assets.images.chao_cidade, cut = (i, c = 3, r = 2) => { if (!sheet) return null; const w = sheet.width / c, h = sheet.height / r, o = document.createElement('canvas'); o.width = o.height = 512; const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(sheet, (i % c) * w + 2, Math.floor(i / c) * h + 2, w - 4, h - 4, 0, 0, 512, 512); return o; };
    const P = sheet ? { cobble: cut(0), plaza: cut(1), walk: cut(2), gravel: cut(3), dirt: cut(4), soil: cut(5) } : {};
    // nature sheet (assets/chao_natureza.png, grid 3x2): grass, tall forest grass, snow, ice, water, swamp mud
    const nat = Assets.images.chao_natureza, cutN = i => { if (!nat) return null; const w = nat.width / 3, h = nat.height / 2, o = document.createElement('canvas'); o.width = o.height = 512; const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(nat, (i % 3) * w + 2, Math.floor(i / 3) * h + 2, w - 4, h - 4, 0, 0, 512, 512); return o; };
    const esp = Assets.images.chao_especial, cutE = i => { if (!esp) return null; const w = esp.width / 4, h = esp.height / 2, o = document.createElement('canvas'); o.width = o.height = 512; const x = o.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(esp, (i % 4) * w + 2, Math.floor(i / 4) * h + 2, w - 4, h - 4, 0, 0, 512, 512); return o; };
    if (esp) Object.assign(P, { planks: cutE(0), rock: cutE(1), ash: cutE(2), slime: cutE(3), crypt: cutE(4), sewer: cutE(5), sewage: cutE(6), boardwalk: cutE(7) });
    if (nat) Object.assign(P, { grass: cutN(0), forest: cutN(1), snow: cutN(2), ice: cutN(3), water: cutN(4), mud: cutN(5) });
    this.tiles.span = { ...(sheet ? { [T.cobble]: 3, [T.plaza]: 6, [T.walk]: 2, [T.gravel]: 2, [T.dirt]: 3, [T.soil]: 3 } : {}), ...(nat ? { [T.grass]: 2, [T.forest]: 3, [T.snow]: 3, [T.water]: 4, [T.mud]: 3 } : {}), ...(esp ? { [T.planks]: 2, [T.rock]: 3, [T.ash]: 3, [T.slime]: 3, [T.crypt]: 3, [T.sewer]: 2, [T.sewage]: 3 } : {}) };
    const grass = smooth('#86cb4c', [['#92d256', 6, 0.18], ['#7cc246', 5, 0.15]], 11), dirt = smooth('#cc9d60', [['#d6aa6c', 6, 0.2], ['#c09254', 5, 0.18]], 23), snow = smooth('#eef4fb', [['#ffffff', 6, 0.25], ['#e2ebf6', 5, 0.2]], 37);
    this.tiles.paintAtlas({ [T.grass]: winter ? P.snow || snow : P.grass || grass, [T.forest]: winter ? P.snow || snow : P.forest || P.grass || grass, [T.cobble]: winter ? shade(P.cobble || img('cobble'), '#dde6ee', 0.35) : P.cobble || img('cobble'), [T.dirt]: winter ? shade(P.dirt || dirt, '#e6ecf2', 0.45) : P.dirt || dirt, [T.water]: winter ? P.ice || img('ice') : P.water || img('water'), [T.plaza]: winter ? shade(P.plaza || img('cobble'), '#e8eef4', 0.5) : P.plaza || shade(img('cobble'), '#fff2d0', 0.22), [T.sewer]: P.sewer || img('sewer'), [T.crypt]: P.crypt || shade(img('cobble'), '#2a2236', 0.55), [T.sewage]: P.sewage || img('sewage'), [T.soil]: winter ? shade(P.soil || soil, '#e6ecf2', 0.5) : P.soil || soil, [T.planks]: P.planks || img('planks'), [T.walk]: winter ? shade(P.walk || img('walk'), '#e8eef4', 0.5) : P.walk || img('walk'), [T.rock]: P.rock || img('rock'), [T.gravel]: winter ? shade(P.gravel || img('gravel'), '#e6ecf2', 0.5) : P.gravel || img('gravel'), [T.snow]: P.snow || snow, [T.mud]: P.mud || smooth('#6a7440', [['#7c8648', 8, 0.5], ['#555e30', 7, 0.5]], 51), [T.ash]: P.ash || shade(img('rock'), '#3a1408', 0.45), [T.slime]: P.slime || shade(img('rock'), '#3a9a2a', 0.5) });
  }
  // nearest spot a character can stand on (spiral over the tile grid); used when a saved position ends up inside something
  nearestFree(x, z, r = 0.45) {
    if (!this.blocked(x, z, r)) return [x, z]; const tm = this.tiles, ix0 = tm.toTile(x), iz0 = tm.toTile(z);
    for (let d = 1; d < 12; d++) for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== d) continue; const ix = ix0 + dx, iz = iz0 + dz; if (!tm.walkable(ix, iz)) continue; const cx = tm.center(ix), cz = tm.center(iz); if (!this.blocked(cx, cz, r)) return [cx, cz]; }
    return [x, z];
  }
  inSewer(x, z) { return x < SEWER.x1 && z > SEWER.z0; }
  inCrypt(x, z) { return inCrypt(x, z); }
  inCave(x, z) { return x > CAVE.x0 && z < CAVE.z1; }
  houseAt(x, z) { for (const h of this.houses) if (Math.abs(x - h.x) < h.w / 2 && Math.abs(z - h.z) < h.d / 2) return h; return null; }
  // Top-down view: buildings standing between the camera (south) and Thomas turn see-through; the one he is inside loses its roof.
  registerFade(group, x, z, w, d, h, roof, walls) { group.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.transparent = true; } }); this.fadeables.push({ group, x, z, w, d, h, op: 1, roof, walls, inside: false }); }
  fadeNear(px, pz, dt) {
    for (const f of this.fadeables) {
      const inside = Math.abs(px - f.x) < f.w / 2 + 0.6 && Math.abs(pz - f.z) < f.d / 2 + 0.6;
      const inFront = !inside && f.z - f.d / 2 < pz + f.h * 0.45 + 0.6 && f.z + f.d / 2 > pz - 1 && Math.abs(px - f.x) < f.w / 2 + 1.2;   // south of Thomas, in the camera's line of sight
      const target = inside ? 0.45 : inFront ? 0.18 : 1; if (f.roof && f.inside !== inside) { f.inside = inside; f.roof.visible = !inside; }
      if (f.op === target) continue; f.op += (target - f.op) * Math.min(1, dt * 8); if (Math.abs(f.op - target) < 0.01) f.op = target;
      f.group.traverse(m => { if (m.isMesh) { m.material.opacity = f.op; m.castShadow = f.op > 0.5; } });
    }
  }
  regionAt(x, z) {
    if (Math.abs(x) < WALL && Math.abs(z) < WALL) {
      const h = this.houseAt(x, z); if (h && h.name) return h.name; if (h && h.family) return 'Casa de ' + h.family.name;
      if (x < -34 && z < -34) return 'Castelo Real'; if (Math.abs(x) < 26 && z < -34) return 'Praça da Luz'; if (Math.hypot(x, z) < 16) return 'Praça da Fonte'; if (x < -6 && x > -26 && z < -6 && z > -26) return 'Mercado';
      if (x > 34 && z > 34) return 'Jardins'; if (x > 34 && z < -62) return 'Campo de Treino'; if (x < -34 && z > 62) return 'Hortas'; if (x > 6 && x < 26 && z < -6 && z > -26) return 'Taverna'; if (x < -6 && x > -26 && z > 6 && z < 26) return 'Capela';
      if (z > 30) return x < 0 ? 'Bairro das Hortas' : 'Bairro dos Jardins'; if (z < -30) return x < 0 ? 'Bairro do Castelo' : 'Bairro do Quartel'; return x < 0 ? 'Bairro do Mercado' : 'Bairro da Forja';
    }
    if (x < SEWER.x1 && z > SEWER.z0) return 'Esgoto'; if (inCrypt(x, z)) return 'Cripta Antiga'; const rn = regionName(x, z); if (rn) return rn; if (x > CAVE.x0 && z < CAVE.z1) return 'Gruta do Norte'; if (x > WALL + 175) return 'Floresta Congelada'; if (x > WALL) return 'Campos do Vale'; if (x < -120) return 'Margem do Rio'; return 'Arredores da Fortaleza';
  }
  // ---------- physics: static colliders in a uniform grid, dynamic ones (NPCs, doors) in a short list ----------
  buildHash() { const CS = this.hashCell = 8; const h = this.hash = new Map(); const key = (ix, iz) => ix * 100000 + iz; for (const c of this.colliders) { const x0 = c.type === 'box' ? c.minX : c.x - c.r, x1 = c.type === 'box' ? c.maxX : c.x + c.r, z0 = c.type === 'box' ? c.minZ : c.z - c.r, z1 = c.type === 'box' ? c.maxZ : c.z + c.r; for (let iz = Math.floor(z0 / CS); iz <= Math.floor(z1 / CS); iz++) for (let ix = Math.floor(x0 / CS); ix <= Math.floor(x1 / CS); ix++) { const k = key(ix, iz); let a = h.get(k); if (!a) h.set(k, a = []); a.push(c); } } }
  hit(c, x, z, r) { if (c.off) return false; if (c.type === 'box') return x > c.minX - r && x < c.maxX + r && z > c.minZ - r && z < c.maxZ + r; const dx = x - c.x, dz = z - c.z; return dx * dx + dz * dz < (c.r + r) * (c.r + r); }
  blocked(x, z, r, ignore = null) {
    for (const c of this.dynamic) if (c !== ignore && this.hit(c, x, z, r)) return true;
    if (!this.hash) { for (const c of this.colliders) if (this.hit(c, x, z, r)) return true; return false; }
    const CS = this.hashCell; for (let iz = Math.floor((z - r) / CS); iz <= Math.floor((z + r) / CS); iz++) for (let ix = Math.floor((x - r) / CS); ix <= Math.floor((x + r) / CS); ix++) { const a = this.hash.get(ix * 100000 + iz); if (a) for (const c of a) if (this.hit(c, x, z, r)) return true; }
    return false;
  }
  resolveMove(pos, dx, dz, r = 0.45, ignore = null) { if (!this.blocked(pos.x + dx, pos.z, r, ignore)) pos.x += dx; if (!this.blocked(pos.x, pos.z + dz, r, ignore)) pos.z += dz; }
  // doors
  setDoor(door, open) { door.open = open; door.col.off = open; }
  pulseDoor(door, secs = 2.5) { this.setDoor(door, true); door.autoT = Math.max(door.autoT, secs); }
  update(dt, t) {
    const L = this.regions?.desfiladeiro; if (L) L.lavaMat.color.setHSL(0.06 + Math.sin(t * 2) * 0.015, 1, 0.5 + Math.sin(t * 3.1) * 0.06);
    if (this.waterMat) { this.waterMat.map.offset.set(t * 0.03, Math.sin(t * 0.4) * 0.05); this.waterMat.opacity = 0.58 + Math.sin(t * 1.3) * 0.05; }
    const pulse = 1 + Math.sin(t * 3) * 0.12; this.lightGlow.scale.set(12 * pulse, 12 * pulse, 1); this.lightMesh.rotation.y += dt * 1.5; this.lightMesh.rotation.x += dt; if (this.lightMesh.visible) this.lightPoint.intensity = 120 * pulse;
    this.forgeLight.intensity = (this.night ? 14 : 7) + Math.sin(t * 7) * 3;
    for (const d of this.doors) { if (d.autoT > 0) { d.autoT -= dt; if (d.autoT <= 0) this.setDoor(d, false); } const target = d.open ? -Math.PI / 2 : 0; if (d.angle !== target) { d.angle += (target - d.angle) * Math.min(1, dt * 7); if (Math.abs(d.angle - target) < 0.01) d.angle = target; d.pivot.rotation.y = d.angle; } }
    for (const l of this.caveLights || []) l.intensity = 9 + Math.sin(t * 2 + l.position.x) * 3;
  }
}
