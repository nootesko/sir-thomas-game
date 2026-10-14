// The kingdom outside the fortress (docs/mundo.md): Lossot and the Frog-Panther Swamp (southwest), the Castle of the
// Jelly Monsters (west), the Neveo Forest and the Owl-Bear City (north), the Bird King's Hill (far north), the Skull Gorge
// with the Red Dragon's lair (southeast) and, in the Frozen Forest east, the Wise Owl's tree and the Ice Werewolf's den
// (Chapter III). Everything here is built once with the city; monsters, people and quests live in main.js / story.js.
import * as THREE from 'three';
import { T } from './tilemap.js';
import { PropSet, Models } from './models.js';
import { Assets } from './assets.js';
import { BillboardSet } from './billboard.js';
import { layoutTowns, paintTowns } from './towns.js';

// name shown on the HUD; rectangles are tested in order
export const REGIONS = [
  { id: 'lossotVila', name: 'Lossot', x0: -290, z0: 80, x1: -220, z1: 135 },
  { id: 'lossot', name: 'Pântano dos Sapos-Pantera', x0: -352, z0: 30, x1: -172, z1: 188 },
  { id: 'geleca', name: 'Castelo dos Monstros de Geleca', x0: -320, z0: -170, x1: -215, z1: -60 },
  { id: 'gelecaArr', name: 'Charco da Geleca', x0: -352, z0: -200, x1: -172, z1: -30 },
  { id: 'ursos', name: 'Cidade dos Ursos-Corujas', x0: 25, z0: -300, x1: 105, z1: -230 },
  { id: 'colina', name: 'Colina do Rei Pássaro', x0: -150, z0: -352, x1: -40, z1: -250 },
  { id: 'neveo', name: 'Floresta de Neveo', x0: -60, z0: -352, x1: 200, z1: -150 },
  { id: 'covil', name: 'Covil do Dragão Vermelho', x0: 268, z0: 268, x1: 352, z1: 352 },
  { id: 'desfiladeiro', name: 'Desfiladeiro da Caveira', x0: 135, z0: 110, x1: 352, z1: 352 },
  { id: 'coruja', name: 'Árvore da Sábia Coruja', x0: 300, z0: -80, x1: 345, z1: -35 },
  { id: 'toca', name: 'Toca do Lobisomem de Gelo', x0: 305, z0: 45, x1: 352, z1: 95 },
];
export function regionName(x, z) { for (const r of REGIONS) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.name; return null; }
// labels on the big map
export const MAP_LABELS = [['Cripta Antiga', -284, -350], ['Lossot', -255, 70], ['Pântano', -320, 170], ['Castelo de Geleca', -268, -180], ['Floresta de Neveo', 80, -160], ['Ursos-Corujas', 65, -310], ['Rei Pássaro', -95, -340], ['Desfiladeiro da Caveira', 245, 160], ['Dragão', 305, 260], ['Sábia Coruja', 305, -92], ['Lobisomem', 318, 38]];
// keep the random trees of the open fields out of the places built here
export function regionBlocked(x, z) {
  if ((x < -170 && z > 28 && z < 190) || (x < -170 && z < -28 && z > -205)) return true;   // swamp and jelly castle manage their own plants
  if (x > -62 && x < 202 && z < -148) return true;   // Neveo (snowy pines of its own)
  if (x > -152 && x < -38 && z < -248) return true;   // hill
  if (x > 133 && z > 108) return true;   // gorge
  if (Math.abs(z - 120) < 6 && x < 4 && x > -170) return true;   // west road
  if (Math.abs(x + 250) < 6 && z > -80 && z < 125) return true;   // Lossot - Geleca road
  if (Math.abs(x - 210) < 6 && z < -60 && z > -155) return true; if (Math.abs(z + 152) < 6 && x > 30 && x < 214) return true;   // north road to Neveo
  if ((x > 298 && x < 345 && z > -82 && z < -33) || (x > 303 && z > 43 && z < 97)) return true;   // owl tree, werewolf den
  return false;
}
const rng = (() => { let s = 77; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const R = (a, b) => a + rng() * (b - a);

export function buildRegions(c) {
  const fs = (m) => c.fset(m), tinted = (key, model, tint, max = 600) => { if (!Models.has(model)) return c.artSet(key, model, max); if (!c.f3d[key]) { c.f3d[key] = new PropSet(c.scene, model, max); c.f3d[key].setColor(tint); } return c.f3d[key]; };
  const tree = (set, x, z, h, r = 0.9) => { if (!set) return; set.add(x, z, h, R(0, 6.28)); c.addCircle(x, z, r); c.trees.push({ x, z }); };
  const stoneMat = c.mk(c.tex.stone, 1, 1); const D = c.regions = {};
  // ---------- roads ----------
  const road = (x0, z0, x1, z1, w = 4) => c.roads.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: Math.abs(x1 - x0) || w, d: Math.abs(z1 - z0) || w });
  road(-2, 120, -170, 120); road(-170, 120, -250, 120); road(-250, 80, -250, 120); road(-250, -60, -250, 80); road(-250, -60, -232, -60);   // south gate -> bridge -> Lossot -> jelly castle
  road(210, -60, 210, -152); road(210, -152, 40, -152); road(62, -152, 62, -228);   // east road's north branch -> Neveo -> Owl-Bear City
  road(25, -265, -95, -265); road(-95, -265, -95, -280);   // to the Bird King's hill
  road(120, 70, 175, 70); road(175, 70, 175, 125);   // south branch -> Skull Gorge
  D.bridge = { x0: -166, x1: -134, z0: 116, z1: 124 };
  // ---------- Lossot and the swamp ----------
  const L = D.lossot = { center: new THREE.Vector3(-255, 0, 105), pools: [], huts: [] };
  for (let i = 0; i < 16; i++) { const x = R(-345, -180), z = R(36, 184); if (Math.hypot(x + 255, z - 105) < 34 || Math.abs(x + 250) < 7 || Math.abs(z - 120) < 7) continue; L.pools.push({ x, z, r: R(3, 7) }); }
  const swampTree = tinted('swampT', 'forest/Tree_3_A', 0x7aa860), dark = tinted('darkT', 'forest/Tree_1_B', 0x5a8a50), reeds = tinted('reeds', 'nat_grass_leafs', 0x9ab860, 900), mush = fs('nat_mushroom_tan'), logs = fs('nat_log'), stump = fs('nat_stump');
  for (let i = 0; i < 130; i++) { const x = R(-350, -175), z = R(32, 186); if (Math.hypot(x + 255, z - 105) < 30 || Math.abs(x + 250) < 6 || Math.abs(z - 120) < 6 || L.pools.some(p => Math.hypot(x - p.x, z - p.z) < p.r + 2)) continue; if (rng() < 0.5) tree(swampTree, x, z, R(5, 8)); else tree(dark, x, z, R(6, 9)); }
  for (let i = 0; i < 160; i++) { const p = L.pools[i % L.pools.length]; if (!p) break; const a = R(0, 6.28); reeds && reeds.add(p.x + Math.cos(a) * (p.r + 0.6), p.z + Math.sin(a) * (p.r + 0.6), R(0.7, 1.3), a); }
  for (let i = 0; i < 40; i++) { const x = R(-345, -180), z = R(36, 184); if (Math.hypot(x + 255, z - 105) < 26) continue; if (rng() < 0.5) mush && mush.add(x, z, R(0.5, 1.0), R(0, 6)); else logs && logs.add(x, z, 0.6, R(0, 6)); }
  // stilt huts of planks around a little square, and a jetty over the biggest pool
  [[-270, 92, 'e', 7, 6], [-240, 92, 'w', 7, 6], [-272, 118, 'e', 8, 6], [-238, 118, 'w', 7, 6], [-255, 82, 's', 9, 6]].forEach(([x, z, dir, w, d], i) => { const h = c.house(x, z, w, d, 3, dir, 'house', { wall: 'planks', tint: [0xd8c0a0, 0xc8b090, 0xe0c8a8][i % 3] }); h.name = ['Cabana do Barqueiro', 'Cabana da Pescadora', 'Casa de Ervas', 'Cabana dos Gêmeos', 'Salão de Lossot'][i]; L.huts.push(h); });
  L.pool = { x: -300, z: 150, r: 9 }; L.pools.push(L.pool); L.jetty = { x0: -292, x1: -284, z0: 146, z1: 149 };
  L.spawns = [[-320, 60], [-310, 165], [-200, 160], [-205, 50], [-335, 120], [-290, 175], [-215, 95], [-300, 45], [-195, 135], [-330, 90]];
  L.alpha = [-312, 150]; L.square = [-255, 105];
  // ---------- Castle of the Jelly Monsters ----------
  const G = D.geleca = { center: new THREE.Vector3(-270, 0, -115) };
  const gm = c.mk(c.tex.stone, 4, 1); gm.color.setHex(0x9ac890); const wall = (x, z, w, d) => { c.box(w, 5, d, gm, x, 2.5, z); c.addBox(x, z, w, d); };
  wall(-270, -150, 70, 2); wall(-305, -115, 2, 70); wall(-270, -80, 70, 2); wall(-235, -136, 2, 28); wall(-235, -94, 2, 28);   // gate on the east side (z -122..-108)
  for (const [x, z] of [[-305, -150], [-235, -150], [-305, -80], [-235, -80]]) { c.tower(x, z, 3.2, 9, 0x2f6a2c); c.addCircle(x, z, 3.4); }
  const keep = c.house(-282, -115, 16, 12, 4.5, 'e', 'house', { wall: 'stone', tint: 0xa8d8a0 }); keep.name = 'Salão da Geleca'; G.keep = keep;
  G.puddles = []; const goo = new THREE.MeshLambertMaterial({ color: 0x6ad050, transparent: true, opacity: 0.75, emissive: 0x1a4a10 });
  for (let i = 0; i < 26; i++) { const x = R(-302, -238), z = R(-147, -83), r = R(0.8, 2.2); const m = new THREE.Mesh(new THREE.CircleGeometry(r, 12), goo); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.05, z); c.scene.add(m); G.puddles.push({ x, z, r }); }
  for (let i = 0; i < 40; i++) { const x = R(-350, -175), z = R(-198, -32); if (x > -312 && x < -228 && z > -158 && z < -72) continue; if (Math.abs(x + 250) < 6) continue; tree(dark, x, z, R(5, 8)); }
  G.spawns = [[-290, -100], [-255, -130], [-260, -95], [-295, -140], [-245, -100], [-280, -135], [-250, -145], [-300, -90], [-225, -60], [-330, -120], [-215, -170], [-200, -90]];
  G.king = [-286, -115];
  // ---------- Neveo Forest and the Owl-Bear City ----------
  const N = D.neveo = { city: new THREE.Vector3(65, 0, -265), houses: [] };
  const sp = tinted('pineN', 'forest/Tree_4_A', 0xdde8f4, 900), sp2 = tinted('pineN2', 'forest/Tree_4_B', 0xe4ecf6, 300);
  for (let i = 0; i < 700; i++) { const x = R(-58, 198), z = R(-350, -150); if ((x > -8 && x < 140 && z > -342 && z < -222) || Math.abs(z + 152) < 6 || Math.abs(x - 62) < 6 && z > -230 || Math.abs(z + 265) < 6 && x < 30 || (x > 200 && z < -200)) continue; tree(rng() < 0.15 ? sp2 : sp, x, z, rng() < 0.15 ? R(9, 13) : R(5, 8)); }
  [[45, -285, 's', 9, 8], [85, -285, 's', 9, 8], [40, -250, 'e', 8, 7], [90, -250, 'w', 8, 7], [65, -298, 's', 14, 10], [65, -232, 'n', 8, 7]].forEach(([x, z, dir, w, d], i) => { const h = c.house(x, z, w, d, 3.6, dir, 'house', { wall: i === 4 ? 'stone' : 'planks', tint: i === 4 ? 0xe0e4f0 : 0xd8c8b8 }); h.name = ['Toca de Bruma', 'Toca de Pinho', 'Toca do Vigia', 'Toca das Penas', 'Grande Salão Aquecido', 'Toca do Ferreiro-Urso'][i]; N.houses.push(h); });
  // the greatest library in the world and the king's hall, both of pale stone, facing the plaza
  const BOOKS = [
    ['Crônica dos Deuses Antigos', 'Antes da Luz, o reino rezava a cinco deuses: Ouren das balanças, Lodosa do lodo, Hiberno do inverno, Ventânia dos ventos e Ignar da forja. Quando a Luz pousou na torre, os homens pararam de subir aos santuários. Os deuses não morreram. Só ficaram em silêncio, esperando quem se lembre deles.'],
    ['Tratado sobre a Luz da Torre', 'Registro do Ancião Bruma, inverno do ano da Luz: na mesma noite em que a Luz chegou ao vale, a neve de Neveo dobrou de altura. Nada se dá sem que algo se tire. Quem toma a luz deve devolver o frio. Os humanos riram quando contamos. Nós anotamos.'],
    ['Bestiário do Norte', 'Lobo de gelo: anda em matilha, morde e congela. Gavião da colina: guarda o Rei Pássaro e não tolera estranhos. Lobisomem de gelo: dorme na toca de pedras a leste; acordado, chama a matilha. Esqueleto da cripta: obedece a quem usa a coroa de ossos.'],
    ['Sobre o Homem que Virou Urubu', 'Fragmento, páginas arrancadas. "...veio da Montanha Negra, pedindo para ler sobre a Luz. Lia de noite e não dormia. Na última visita, as penas já lhe nasciam nos braços. Levou consigo três volumes que nunca devolveu..." O resto se perdeu. Talvez as páginas estejam espalhadas pelo reino.'],
  ];
  const lib = c.house(16, -300, 24, 18, 4.2, 'e', 'library', { wall: 'stone', tint: 0xeae6f4, books: BOOKS }); lib.name = 'Grande Biblioteca de Neveo'; N.library = lib; N.houses.push(lib);
  const hall = c.house(118, -300, 20, 16, 4.6, 'w', 'throne', { wall: 'stone', tint: 0xe6ecf8 }); hall.name = 'Salão do Rei Ulmo'; N.hall = hall; N.houses.push(hall);
  // plaza: an owl statue on a plinth and lanterns
  if (Assets.has('art_owlstatue')) { const art = Assets.images.art_owlstatue, bb = new BillboardSet(c.scene, art, 1, 0); bb.add(65, -258, 5.5 * art.width / art.height, 5.5); c.sets.owlStatue = bb; c.addCircle(65, -258, 2.2); } else
  { const st = c.mk(c.tex.stone, 1, 1); const base = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.1, 1.0, 8), st); base.position.set(65, 0.5, -258); c.scene.add(base); const body = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), st); body.scale.set(1, 1.35, 0.9); body.position.set(65, 2.5, -258); c.scene.add(body); const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), st); head.position.set(65, 4.3, -258); c.scene.add(head);
    for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.7, 4), st); ear.position.set(65 + sx * 0.5, 5.2, -258); ear.rotation.z = -sx * 0.3; c.scene.add(ear); } c.addCircle(65, -258, 2.2);
    const lamp = c.fset('graveyard/lightpost-single'); for (const [x, z] of [[40, -268], [90, -268], [52, -240], [78, -240], [30, -292], [104, -292]]) { if (lamp) { lamp.add(x, z, 3.2, 0); c.addCircle(x, z, 0.3); } const l = new THREE.PointLight(0xffb060, 0, 18, 1.5); l.position.set(x, 3.0, z); c.scene.add(l); (c.torchLights || (c.torchLights = [])).push(l); } }
  N.fire = [65, -265]; N.elder = [65, -283]; N.owls = [[52, -262], [78, -268], [60, -246], [72, -276]]; N.cub = [150, -320];
  N.spawns = [[0, -200], [120, -200], [160, -260], [-30, -300], [130, -330], [20, -330]];
  // ---------- the Bird King's Hill ----------
  const H = D.colina = { top: new THREE.Vector3(-95, 0, -312) };
  const rockL = fs('forest/Rock_3_B'), rockT = fs('forest/Rock_1_E'), obel = fs('nat_statue_obelisk'), col = fs('nat_statue_column'), cliff = fs('forest/Rock_1_C'), cliff2 = fs('forest/Rock_3_B');
  for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2; const r = 40 + Math.sin(i * 1.7) * 3; const x = -95 + Math.cos(a) * r, z = -300 + Math.sin(a) * r * 0.9; if (Math.abs(x + 95) < 5 && z > -300) continue; const s = i % 2 ? cliff2 : cliff; if (s) { s.add(x, z, R(2.6, 3.6), a); c.addCircle(x, z, 2.4); } }
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const x = -95 + Math.cos(a) * 14, z = -310 + Math.sin(a) * 12; (i % 2 ? obel : col) && (i % 2 ? obel : col).add(x, z, R(3.5, 5), a); c.addCircle(x, z, 0.8); }
  const nestMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2e }); H.nests = [];
  const nestArt = c.userArt('nest'), nestSet = nestArt ? new BillboardSet(c.scene, nestArt, 8, 0) : null; if (nestSet) c.sets.nests = nestSet;
  for (const [x, z, r] of [[-95, -318, 4], [-120, -295, 2.5], [-70, -292, 2.5], [-110, -330, 2], [-78, -328, 2]]) { if (nestSet) { nestSet.add(x, z, r * 2.6, r * 2.6 * nestArt.height / nestArt.width); c.addCircle(x, z, r * 0.6); H.nests.push([x, z]); continue; } const m = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.35, 6, 14), nestMat); m.rotation.x = -Math.PI / 2; m.position.set(x, r * 0.3, z); c.scene.add(m); c.addCircle(x, z, r * 0.6); H.nests.push([x, z]); }
  H.king = [-95, -318]; H.spawns = [[-125, -270], [-60, -275], [-130, -320], [-55, -335], [-100, -270]];
  // ---------- Skull Gorge and the Red Dragon's lair ----------
  const S = D.desfiladeiro = { lair: new THREE.Vector3(305, 0, 305) };
  // the gorge winds from the entrance (175,130) to the lair; cliffs on both sides
  const path = [[175, 128], [190, 170], [225, 200], [250, 240], [270, 270], [300, 300]];
  for (let k = 0; k < path.length - 1; k++) { const [ax, az] = path[k], [bx, bz] = path[k + 1]; const len = Math.hypot(bx - ax, bz - az), nx = -(bz - az) / len, nz = (bx - ax) / len;
    for (let t = 0; t < len; t += 4.5) { const px = ax + (bx - ax) * t / len, pz = az + (bz - az) * t / len; for (const s of [-1, 1]) { const off = 11 + Math.sin(t * 0.3 + k) * 2; const x = px + nx * s * off, z = pz + nz * s * off; const s2 = (t + k) % 9 < 4.5 ? cliff : cliff2; if (s2) { s2.add(x, z, R(4, 6.5), R(0, 6)); c.addCircle(x, z, 3.6); } } } }
  for (let i = 0; i < 90; i++) { const x = R(140, 350), z = R(112, 350); const near = path.some(([px, pz], k) => k < path.length - 1 && distSeg(x, z, px, pz, path[k + 1][0], path[k + 1][1]) < 16) || Math.hypot(x - 305, z - 305) < 36; if (near) continue; if (rockT && rng() < 0.6) { rockT.add(x, z, R(3, 6), R(0, 6)); c.addCircle(x, z, 2.6); } else if (rockL) { rockL.add(x, z, R(2.5, 5), R(0, 6)); c.addCircle(x, z, 3); } }
  // the skull: a pale dome with two dark eye holes, at the gorge entrance
  const bone = new THREE.MeshLambertMaterial({ color: 0xe8e0cc }), hole = new THREE.MeshBasicMaterial({ color: 0x1a1410 });
  const sk = new THREE.Group(); const dome = new THREE.Mesh(new THREE.DodecahedronGeometry(6, 1), bone); dome.scale.set(1, 0.9, 0.85); dome.position.y = 5; sk.add(dome); const jaw = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 5), bone); jaw.position.set(0, 1.2, 1.5); sk.add(jaw);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), hole); e.position.set(s * 2.2, 5.6, 4.4); sk.add(e); } const nose = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.6, 3), hole); nose.rotation.x = Math.PI; nose.position.set(0, 3.6, 4.9); sk.add(nose);
  sk.position.set(160, 0, 118); sk.rotation.y = 0.5; c.scene.add(sk); c.addCircle(160, 118, 6); S.skull = sk;
  // lava pool in the lair
  S.lavaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, map: (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const x = cv.getContext('2d'); const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, '#fff2a0'); g.addColorStop(0.35, '#ffb020'); g.addColorStop(0.7, '#e0400a'); g.addColorStop(0.92, '#6a1004'); g.addColorStop(1, '#2a0802'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 40; i++) { const px = 128 + R(-95, 95), pz = 128 + R(-95, 95), rr = R(4, 14), gg = x.createRadialGradient(px, pz, 0, px, pz, rr); gg.addColorStop(0, i % 3 ? 'rgba(255,240,150,0.8)' : 'rgba(90,15,4,0.6)'); gg.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = gg; x.beginPath(); x.arc(px, pz, rr, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t; })(), transparent: true }); const lava = new THREE.Mesh(new THREE.CircleGeometry(8, 20), S.lavaMat); lava.rotation.x = -Math.PI / 2; lava.position.set(322, 0.06, 322); c.scene.add(lava); c.addCircle(322, 322, 8.2); S.lava = lava;
  const lavaLight = new THREE.PointLight(0xff5a10, 30, 30, 1.6); lavaLight.position.set(322, 3, 322); c.scene.add(lavaLight);
  S.dragon = [300, 296]; S.spawns = [[200, 175], [230, 205], [255, 245], [215, 190], [265, 262], [185, 150]];
  // ---------- Frozen Forest: the Wise Owl's tree and the Ice Werewolf's den (Chapter III) ----------
  const F = D.floresta = { owl: [322, -58], den: [330, 70] };
  if (cliff) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; if (Math.abs(a - Math.PI) < 0.45) continue; const x = 330 + Math.cos(a) * 17, z = 70 + Math.sin(a) * 15; cliff.add(x, z, R(2.4, 3.4), a); c.addCircle(x, z, 2.4); }   // ring of rocks, open to the west
  const bigP = tinted('owlTree', 'forest/Tree_4_B', 0xe4ecf6, 4); tree(bigP, 330, -62, 13, 2.4);   // the owl's great tree
  layoutTowns(c);
  if (stump) { stump.add(322, -55, 1.2, 0); c.addCircle(322, -55, 0.7); }
  for (let i = 0; i < 12; i++) { const a = R(0, 6.28), r = R(8, 20); tree(sp, 322 + Math.cos(a) * r, -58 + Math.sin(a) * r, R(5, 8)); }
  return D;
}
function distSeg(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az; const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz))); return Math.hypot(px - ax - dx * t, pz - az - dz * t); }

// terrain of the regions (runs after the river, before house floors)
export function paintRegions(c, tm) {
  const D = c.regions; if (!D) return;
  tm.fillRect(-352, 30, -172, 188, T.mud); for (const p of D.lossot.pools) tm.fillCircle(p.x, p.z, p.r, T.water); tm.fillRect(-275, 103, -235, 107, T.planks); tm.fillRect(-257, 88, -253, 122, T.planks); tm.fillRect(-292, 146, -284, 150, T.planks);   // swamp, village boardwalk, jetty
  tm.fillRect(-352, -200, -172, -30, T.mud); tm.fillRect(-304, -149, -236, -81, T.slime);
  tm.fillRect(-60, -352, 200, -150, T.snow); tm.fillCircle(65, -265, 40, T.snow);
  tm.fillRect(-150, -352, -40, -250, T.gravel); tm.fillCircle(-95, -305, 30, T.grass);
  tm.fillRect(135, 110, 352, 352, T.rock); tm.fillCircle(305, 305, 34, T.ash);
  for (const r of c.roads) tm.fillRect(r.x - r.w / 2, r.z - r.d / 2, r.x + r.w / 2, r.z + r.d / 2, T.dirt);   // roads on top
  tm.fillRect(D.bridge.x0, D.bridge.z0, D.bridge.x1, D.bridge.z1, T.planks);   // bridge over the river
  paintTowns(c, tm);
}
