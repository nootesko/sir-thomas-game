// Animals built in code in the KayKit chibi look (big head, short sturdy legs, smooth low-poly): wolves, rabbit, rat,
// frog and spiders. Same scheme as src/birds.js: named parts (pivot > body, head, legsA, legsB, tail) and animation clips,
// registered in the model cache so Actor plays idle/walk/run/attack/hit/death on them. No third-party models.
import * as THREE from 'three';
import { M4, merged } from './birds.js';

const S = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h), C = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s), Cy = (r0, r1, h, s = 7) => new THREE.CylinderGeometry(r0, r1, h, s);
const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
const eyes = (x, y, z, r, iris = 0x1a1010) => [-1, 1].flatMap(s => [[S(r, 8, 6), 0xffffff, M4(s * x, y, z)], [S(r * 0.62, 6, 5), iris, M4(s * x, y, z + r * 0.55)], [S(r * 0.18, 4, 3), 0xffffff, M4(s * x + r * 0.18, y + r * 0.25, z + r * 0.85)]]);

const LOOKS = {
  wolf:       { fur: 0x8e939c, light: 0xdfe3e8, dark: 0x5a5e66, nose: 0x1a1a1e },
  wolf_alpha: { fur: 0x6a4a36, light: 0xc8a888, dark: 0x3e2a1e, nose: 0x1a1210, scar: true },
  wolf_ice:   { fur: 0xcfe4f4, light: 0xffffff, dark: 0x8fb0cc, nose: 0x2a4a6a, eye: 0x50c0ff },
  rabbit:     { fur: 0xf0e6da, light: 0xffffff, dark: 0xd8b8a8, nose: 0xff9aa8 },
  rat:        { fur: 0x8a7a70, light: 0xc8b8ac, dark: 0x5e5048, nose: 0xff9aa8 },
  frog:       { fur: 0x9ac83a, light: 0xe8e8a0, dark: 0x5e8a24, nose: 0x2a3a10 },
  spider:     { fur: 0x3a3440, light: 0x5a5262, dark: 0x1e1a22, nose: 0xff3030 },
  spider_q:   { fur: 0x4a1e3a, light: 0x8a3a6a, dark: 0x2a0e20, nose: 0xffd040, crown: 0xf6c12e },
};

function quad(kind) {
  const L = LOOKS[kind], root = new THREE.Group(), pivot = new THREE.Group(); pivot.name = 'pivot'; root.add(pivot);
  const wolf = kind.startsWith('wolf'), rabbit = kind === 'rabbit', rat = kind === 'rat', frog = kind === 'frog';
  const legH = frog ? 0.22 : rabbit ? 0.24 : rat ? 0.22 : 0.36, bodyY = legH + (frog ? 0.2 : 0.3);
  const bp = [[S(0.42, 12, 9), L.fur, M4(0, bodyY, 0, 0, 0, 0, frog ? 1.25 : rat ? 0.8 : 0.85, frog ? 0.62 : 0.78, frog ? 1.0 : rat ? 1.35 : 1.2)], [S(0.32, 10, 8), L.light, M4(0, bodyY - 0.08, frog ? 0.12 : 0.22, 0, 0, 0, frog ? 1.2 : 0.8, 0.7, 0.9)]];
  if (wolf) bp.push([S(0.3, 9, 7), L.light, M4(0, bodyY + 0.12, 0.34, 0, 0, 0, 0.9, 0.9, 0.7)]);
  if (L.scar) bp.push([new THREE.BoxGeometry(0.04, 0.3, 0.02), 0xe8c8b0, M4(0.2, bodyY + 0.15, 0.25, 0, 0.5, 0.3)]);
  const body = merged(bp); body.name = 'body'; pivot.add(body);
  // head: big (chibi), snout by species, eyes, ears
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, bodyY + (frog ? 0.12 : 0.32), frog ? 0.42 : rat ? 0.48 : 0.5); pivot.add(head);
  const hr = frog ? 0.36 : rat ? 0.27 : rabbit ? 0.34 : 0.36; const hp = [[S(hr, 12, 9), L.fur, M4(0, 0, 0, 0, 0, 0, frog ? 1.3 : 1, frog ? 0.7 : 1, 1)]];
  if (wolf) hp.push([S(hr * 0.5, 9, 7), L.light, M4(0, -hr * 0.28, hr * 0.85, 0, 0, 0, 1, 0.75, 1.3)], [S(hr * 0.13, 6, 5), L.nose, M4(0, -hr * 0.14, hr * 1.45)], ...[-1, 1].map(s => [C(hr * 0.32, hr * 0.8, 4), L.dark, M4(s * hr * 0.55, hr * 0.85, -hr * 0.05, 0, 0, -s * 0.25)]), ...[-1, 1].map(s => [S(hr * 0.35, 7, 5), L.light, M4(s * hr * 0.72, -hr * 0.25, hr * 0.2)]));
  if (rabbit) hp.push([S(hr * 0.35, 8, 6), L.light, M4(0, -hr * 0.35, hr * 0.75, 0, 0, 0, 1.2, 0.8, 0.8)], [S(hr * 0.1, 6, 4), L.nose, M4(0, -hr * 0.18, hr * 1.0)], ...[-1, 1].flatMap(s => [[S(hr * 0.26, 7, 6), L.fur, M4(s * hr * 0.35, hr * 1.35, -hr * 0.1, -0.15, 0, -s * 0.15, 0.85, 3.0, 0.5)], [S(hr * 0.16, 6, 5), L.nose, M4(s * hr * 0.35, hr * 1.35, -hr * 0.0, -0.15, 0, -s * 0.15, 0.7, 2.4, 0.35)]]));
  if (rat) hp.push([C(hr * 0.5, hr * 1.3, 8), L.fur, M4(0, -hr * 0.15, hr * 1.0, Math.PI / 2, 0, 0)], [S(hr * 0.13, 6, 4), L.nose, M4(0, -hr * 0.15, hr * 1.65)], ...[-1, 1].map(s => [new THREE.CylinderGeometry(hr * 0.42, hr * 0.42, hr * 0.08, 10), L.nose, M4(s * hr * 0.6, hr * 0.7, -hr * 0.1, Math.PI / 2, 0, -s * 0.3)]));
  if (frog) hp.push([new THREE.TorusGeometry(hr * 0.6, hr * 0.06, 5, 12, Math.PI), L.dark, M4(0, -hr * 0.28, hr * 0.62, Math.PI, 0, 0, 1.3, 0.6, 1)]);
  hp.push(...(frog ? eyes(hr * 0.55, hr * 0.62, hr * 0.15, hr * 0.32) : eyes(hr * (rat ? 0.4 : 0.42), hr * 0.18, hr * 0.78, hr * (rat ? 0.17 : 0.2), L.eye || 0x1a1010)));
  const hm = merged(hp); hm.name = 'headMesh'; head.add(hm);
  // legs: two diagonal pairs that swing in turns
  const lx = frog ? 0.42 : 0.24, lzF = frog ? 0.25 : 0.3, lzB = frog ? -0.3 : -0.3;
  for (const [name, set] of [['legsA', [[-1, lzF], [1, lzB]]], ['legsB', [[1, lzF], [-1, lzB]]]]) { const g = new THREE.Group(); g.name = name; g.position.y = legH; pivot.add(g);
    g.add(Object.assign(merged(set.flatMap(([s, z]) => { const back = z < 0, r = (rabbit && back) || (frog && back) ? 0.13 : 0.1; return [[Cy(r, r * 0.9, legH + 0.06), L.fur, M4(s * lx, -legH / 2, z, frog ? 0 : 0, 0, frog ? s * 0.5 : 0)], [S(r * 1.25, 7, 5), L.dark, M4(s * (lx + (frog ? 0.15 : 0)), -legH + 0.03, z + 0.06, 0, 0, 0, 1, 0.6, 1.4)]]; })), { name: name + 'Mesh' })); }
  // tail
  const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(0, bodyY + 0.05, frog ? -0.4 : -0.48); pivot.add(tail);
  if (!frog) tail.add(merged(wolf ? [[S(0.13, 7, 6), L.fur, M4(0, 0.12, -0.15, 0, 0, 0, 1, 1, 2.2)], [S(0.1, 6, 5), L.light, M4(0, 0.22, -0.42, 0, 0, 0, 1, 1, 1.4)]] : rabbit ? [[S(0.13, 7, 6), L.light, M4(0, 0, -0.04)]] : [0, 1, 2, 3].map(i => [Cy(0.035 - i * 0.006, 0.04 - i * 0.006, 0.22, 5), L.nose, M4(0, 0.02 + i * 0.04, -0.1 - i * 0.2, Math.PI / 2 - 0.25 + i * 0.12, 0, 0)])));
  return root;
}

function spider(kind) {
  const L = LOOKS[kind], root = new THREE.Group(), pivot = new THREE.Group(); pivot.name = 'pivot'; root.add(pivot);
  const bp = [[S(0.5, 12, 9), L.fur, M4(0, 0.6, -0.45, 0, 0, 0, 1, 0.85, 1.1)], [S(0.36, 10, 8), L.light, M4(0, 0.82, -0.55, 0, 0, 0, 0.8, 0.45, 0.9)], [S(0.3, 10, 8), L.fur, M4(0, 0.52, 0.18)]];
  if (L.crown) { bp.push([Cy(0.2, 0.24, 0.14, 8), L.crown, M4(0, 0.86, 0.18)]); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; bp.push([C(0.04, 0.14, 4), L.crown, M4(Math.sin(a) * 0.2, 1.0, 0.18 + Math.cos(a) * 0.2)]); } }
  const body = merged(bp); body.name = 'body'; pivot.add(body);
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, 0.55, 0.42); pivot.add(head);
  head.add(merged([...[[-0.1, 0.06], [0.1, 0.06], [-0.18, 0], [0.18, 0], [-0.06, 0.13], [0.06, 0.13]].map(([x, y]) => [S(0.055, 6, 5), L.nose, M4(x, y, 0.06)]), ...[-1, 1].map(s => [C(0.05, 0.2, 4), L.dark, M4(s * 0.07, -0.12, 0.08, Math.PI * 0.9, 0, 0)])]));
  for (const [name, idx] of [['legsA', [0, 2, 5, 7]], ['legsB', [1, 3, 4, 6]]]) { const g = new THREE.Group(); g.name = name; g.position.y = 0.55; pivot.add(g); const parts = [];
    for (const i of idx) { const s = i < 4 ? -1 : 1, k = i % 4, z = 0.3 - k * 0.2, ang = (0.5 - k * 0.33) * s; const dir = new THREE.Vector3(s * Math.cos(ang), 0, Math.sin(Math.abs(ang)) * (k < 2 ? 1 : -1)).normalize();
      const knee = new THREE.Vector3(dir.x * 0.55, 0.28, z + dir.z * 0.4), foot = new THREE.Vector3(dir.x * 0.95, -0.52, z + dir.z * 0.7), hip = new THREE.Vector3(s * 0.2, 0, z);
      for (const [a, b] of [[hip, knee], [knee, foot]]) { const len = a.distanceTo(b), gg = Cy(0.045, 0.035, len, 5); gg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())); const m = a.clone().add(b).multiplyScalar(0.5); parts.push([gg, L.dark, M4(m.x, m.y, m.z)]); } parts.push([S(0.06, 5, 4), L.dark, M4(knee.x, knee.y, knee.z)]); }
    g.add(Object.assign(merged(parts), { name: name + 'Mesh' })); }
  return root;
}

function clips(kind) {
  const frog = kind === 'frog', rabbit = kind === 'rabbit', spiderK = kind.startsWith('spider'), axis = spiderK ? 'y' : 'x', amp = spiderK ? 0.25 : 0.55;
  const R = a => axis === 'x' ? Q(a, 0, 0) : Q(0, a, 0);
  const step = (name, p, bob) => frog || rabbit
    ? new THREE.AnimationClip(name, p, [new THREE.VectorKeyframeTrack('pivot.position', [0, p * 0.35, p * 0.7, p], [0, 0, 0, 0, bob * 3, 0.05, 0, 0, 0, 0, 0, 0]), new THREE.QuaternionKeyframeTrack('legsA.quaternion', [0, p * 0.35, p], [...R(0), ...R(-0.7), ...R(0)]), new THREE.QuaternionKeyframeTrack('legsB.quaternion', [0, p * 0.35, p], [...R(0), ...R(-0.7), ...R(0)])])
    : new THREE.AnimationClip(name, p, [new THREE.QuaternionKeyframeTrack('legsA.quaternion', [0, p / 2, p], [...R(amp), ...R(-amp), ...R(amp)]), new THREE.QuaternionKeyframeTrack('legsB.quaternion', [0, p / 2, p], [...R(-amp), ...R(amp), ...R(-amp)]),
      new THREE.VectorKeyframeTrack('pivot.position', [0, p / 4, p / 2, p * 3 / 4, p], [0, 0, 0, 0, bob, 0, 0, 0, 0, 0, bob, 0, 0, 0, 0]), new THREE.QuaternionKeyframeTrack('tail.quaternion', [0, p / 2, p], [...Q(0, 0.3, 0), ...Q(0, -0.3, 0), ...Q(0, 0.3, 0)])]);
  return [
    new THREE.AnimationClip('Idle', 2, [new THREE.VectorKeyframeTrack('pivot.position', [0, 1, 2], [0, 0, 0, 0, 0.015, 0, 0, 0, 0]), new THREE.QuaternionKeyframeTrack('tail.quaternion', [0, 1, 2], [...Q(0, 0.25, 0), ...Q(0, -0.25, 0), ...Q(0, 0.25, 0)]), new THREE.QuaternionKeyframeTrack('head.quaternion', [0, 1, 2], [...Q(0, 0, 0), ...Q(0.06, 0.1, 0), ...Q(0, 0, 0)])]),
    step('Walk', frog || rabbit ? 0.6 : 0.55, 0.03), step('Run', frog || rabbit ? 0.42 : 0.32, 0.06),
    new THREE.AnimationClip('Attack', 0.5, [new THREE.VectorKeyframeTrack('pivot.position', [0, 0.18, 0.5], [0, 0, 0, 0, 0.08, 0.35, 0, 0, 0]), new THREE.QuaternionKeyframeTrack('head.quaternion', [0, 0.18, 0.5], [...Q(0, 0, 0), ...Q(0.35, 0, 0), ...Q(0, 0, 0)])]),
    new THREE.AnimationClip('Hit', 0.3, [new THREE.QuaternionKeyframeTrack('pivot.quaternion', [0, 0.1, 0.3], [...Q(0, 0, 0), ...Q(-0.25, 0, 0.2), ...Q(0, 0, 0)])]),
    new THREE.AnimationClip('Death', 0.8, [new THREE.QuaternionKeyframeTrack('pivot.quaternion', [0, 0.8], [...Q(0, 0, 0), ...Q(0, 0, spiderK ? Math.PI : Math.PI / 2)]), new THREE.VectorKeyframeTrack('pivot.position', [0, 0.8], [0, 0, 0, 0, spiderK ? 1.0 : 0.1, 0])]),
  ];
}

export const CRITTERS = { beast_wolf: 'wolf', beast_wolf_alpha: 'wolf_alpha', beast_wolf_ice: 'wolf_ice', beast_rabbit: 'rabbit', beast_rat: 'rat', beast_frog: 'frog', beast_spider: 'spider', beast_spider_queen: 'spider_q' };
export function registerCritters(cache) { for (const [name, kind] of Object.entries(CRITTERS)) cache[name] = { scene: kind.startsWith('spider') ? spider(kind) : quad(kind), animations: clips(kind) }; }
