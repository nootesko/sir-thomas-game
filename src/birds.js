// Birds built in code (no third-party models): hawk (gaviões), vulture (Mordrak), the golden Bird King and the Wise Owl.
// Each bird is a small node tree with named parts (pivot > body, head, wingL, wingR) and its own animation clips, stored
// in the model cache like a loaded glTF, so Actor plays them like any other model (roles idle/walk/run/attack/hit/death).
import * as THREE from 'three';

export const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
export function merged(parts) {
  const geos = parts.map(([geo, color, m]) => { const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); g.applyMatrix4(m); const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color); for (let i = 0; i < n; i++) col.toArray(c, i * 3); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; });
  const out = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'color']) { const tot = geos.reduce((a, g) => a + g.attributes[k].array.length, 0), arr = new Float32Array(tot); let o = 0; for (const g of geos) { arr.set(g.attributes[k].array, o); o += g.attributes[k].array.length; } out.setAttribute(k, new THREE.BufferAttribute(arr, 3)); }
  return new THREE.Mesh(out, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
}
const S = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h), C = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);

const LOOKS = {
  hawk:    { body: 0x8a5a32, belly: 0xeedcb8, wing: 0x6e4424, tip: 0x3a2414, head: 0x8a5a32, beak: 0xf0c030, eye: 0xffd040, legs: 0xf0c030 },
  vulture: { body: 0x2c2030, belly: 0x3a2c3e, wing: 0x221828, tip: 0x0e0a10, head: 0xc89090, beak: 0xd8c8a0, eye: 0xff3030, legs: 0x8a7a70, ruff: 0xece4dc, bald: true },
  king:    { body: 0xd8a030, belly: 0xfff0c0, wing: 0xc88a20, tip: 0xffffff, head: 0xe0b040, beak: 0xff9a20, eye: 0x40a0ff, legs: 0xff9a20, crown: 0xffe066 },
  owl:     { body: 0xe4ded2, belly: 0xfffaf0, wing: 0xc8c0b2, tip: 0x8a8070, head: 0xe8e2d6, beak: 0x6a5a40, eye: 0xffb52e, legs: 0x9a8a70, owl: true, glasses: 0xd8b040 },
};

// a wing seen from above: rounded leading edge, feathered trailing edge (shape in XY, extruded thin; laid flat by the caller)
function wingGeo(span, k) {
  const sh = new THREE.Shape(); sh.moveTo(0, 0.16 * k); sh.quadraticCurveTo(span * 0.55, 0.26 * k, span, 0.04 * k);
  for (const [x, y] of [[0.92, -0.14], [0.82, -0.06], [0.72, -0.22], [0.6, -0.1], [0.48, -0.24], [0.34, -0.12], [0.18, -0.2], [0, -0.14]]) sh.lineTo(span * x, y * k);
  sh.closePath(); return new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false }).translate(0, 0, -0.02);
}
function buildBird(kind) {
  const L = LOOKS[kind], root = new THREE.Group(); root.name = 'Bird'; const pivot = new THREE.Group(); pivot.name = 'pivot'; root.add(pivot);
  const owl = !!L.owl, bodyR = owl ? 0.42 : 0.34;
  // body: egg-shaped torso, pale belly, tail fan, legs with talons
  const body = merged([
    [S(bodyR, 12, 10), L.body, M4(0, 0, 0, 0, 0, 0, 1, owl ? 1.2 : 0.9, owl ? 1 : 1.35)],
    [S(bodyR * 0.8, 10, 8), L.belly, M4(0, -0.04, bodyR * 0.35, 0, 0, 0, 0.9, owl ? 1.1 : 0.85, 0.7)],
    ...(owl ? [] : [-0.25, 0, 0.25].map(a => [C(0.12, 0.5, 4), L.tip, M4(Math.sin(a) * 0.12, 0.02, -0.55, -Math.PI / 2 - 0.15, 0, a, 1, 1, 0.35)])),
    ...[-1, 1].flatMap(s => [[new THREE.CylinderGeometry(0.035, 0.03, 0.16, 5), L.legs, M4(s * 0.12, -bodyR * 0.85 - 0.06, 0.05)], ...[-0.4, 0, 0.4].map(a => [C(0.025, 0.11, 4), L.legs, M4(s * 0.12 + Math.sin(a) * 0.05, -bodyR * 0.85 - 0.14, 0.1 + Math.cos(a) * 0.05, Math.PI / 2, 0, 0)])]),
    ...(L.ruff ? [[new THREE.TorusGeometry(0.2, 0.09, 6, 12), L.ruff, M4(0, 0.2, 0.28, Math.PI / 2 - 0.5, 0, 0)]] : []),
  ]); body.name = 'body'; pivot.add(body);
  // head: on the neck, with beak and eyes (owl: big round head, facial disc, ear tufts, glasses)
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, owl ? 0.48 : 0.26, owl ? 0.02 : 0.38); pivot.add(head);
  const hr = owl ? 0.34 : 0.19;
  const hp = [[S(hr, 10, 8), L.bald ? L.head : L.head, M4(0, 0, 0)],
    [C(owl ? 0.05 : 0.07, owl ? 0.12 : 0.2, 5), L.beak, M4(0, owl ? -0.06 : -0.03, hr + (owl ? 0.02 : 0.06), Math.PI / 2 + 0.4, 0, 0)],
    ...[-1, 1].flatMap(s => [[S(hr * (owl ? 0.3 : 0.24), 8, 6), owl ? 0x2b1a12 : 0x1a1010, M4(s * hr * 0.42, hr * 0.15, hr * 0.82, 0, 0, 0, 1, 1, 0.5)], [S(hr * (owl ? 0.22 : 0.16), 8, 6), L.eye, M4(s * hr * 0.42, hr * 0.15, hr * 0.9)], [S(hr * 0.08, 6, 4), 0x000000, M4(s * hr * 0.42, hr * 0.15, hr * (owl ? 1.1 : 1.02))]])];
  if (owl) hp.push([S(hr * 0.85, 10, 8), L.belly, M4(0, -0.02, hr * 0.55, 0, 0, 0, 1, 0.9, 0.4)], ...[-1, 1].map(s => [C(hr * 0.2, hr * 0.6, 4), L.tip, M4(s * hr * 0.62, hr * 0.8, 0, -0.1, 0, -s * 0.45)]), ...(L.glasses ? [-1, 1].map(s => [new THREE.TorusGeometry(hr * 0.27, hr * 0.035, 5, 14), L.glasses, M4(s * hr * 0.42, hr * 0.15, hr * 1.12)]) : []));
  if (L.crown) { hp.push([new THREE.CylinderGeometry(hr * 0.55, hr * 0.62, hr * 0.35, 8, 1, true), L.crown, M4(0, hr * 0.95, 0)]); for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; hp.push([C(hr * 0.1, hr * 0.35, 4), L.crown, M4(Math.sin(a) * hr * 0.55, hr * 1.25, Math.cos(a) * hr * 0.55)]); } }
  const hm = merged(hp); hm.name = 'headMesh'; head.add(hm);
  // wings: a pivot at each shoulder; feathers fan out sideways (+x / -x)
  for (const s of [-1, 1]) {
    const w = new THREE.Group(); w.name = s < 0 ? 'wingL' : 'wingR'; w.position.set(s * bodyR * 0.8, 0.1, 0); pivot.add(w); const span = owl ? 0.8 : 1.2;
    const wm = merged([[wingGeo(span, 1), L.wing, M4(0, 0, 0, -Math.PI / 2, 0, 0, s, 1, 1)], [wingGeo(span, 0.55), L.tip, M4(s * span * 0.42, -0.01, -0.02, -Math.PI / 2, 0, 0, s * 0.6, 1.05, 1)]]);
    wm.name = w.name + 'Mesh'; w.add(wm);
  }
  root.add(pivot); return root;
}

// animation clips on the named parts: wing flaps at different speeds, a dive for attacks, a wobble for hits, a fall for death
function clips(owl) {
  const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
  const flap = (name, period, amp, bob) => { const t = [0, period / 2, period], up = amp, down = -amp * 0.6;
    return new THREE.AnimationClip(name, period, [new THREE.QuaternionKeyframeTrack('wingL.quaternion', t, [...Q(0, 0, -up), ...Q(0, 0, -down), ...Q(0, 0, -up)]), new THREE.QuaternionKeyframeTrack('wingR.quaternion', t, [...Q(0, 0, up), ...Q(0, 0, down), ...Q(0, 0, up)]),
      new THREE.VectorKeyframeTrack('pivot.position', t, [0, 0, 0, 0, bob, 0, 0, 0, 0]), new THREE.VectorKeyframeTrack('head.position', [0, period], [0, owl ? 0.48 : 0.26, owl ? 0.02 : 0.38, 0, owl ? 0.48 : 0.26, owl ? 0.02 : 0.38])]); };
  const attack = new THREE.AnimationClip('Attack', 0.6, [new THREE.QuaternionKeyframeTrack('pivot.quaternion', [0, 0.25, 0.6], [...Q(0, 0, 0), ...Q(0.7, 0, 0), ...Q(0, 0, 0)]), new THREE.QuaternionKeyframeTrack('wingL.quaternion', [0, 0.25, 0.6], [...Q(0, 0, -0.2), ...Q(0, 0.6, -0.9), ...Q(0, 0, -0.2)]), new THREE.QuaternionKeyframeTrack('wingR.quaternion', [0, 0.25, 0.6], [...Q(0, 0, 0.2), ...Q(0, -0.6, 0.9), ...Q(0, 0, 0.2)])]);
  const hit = new THREE.AnimationClip('Hit', 0.35, [new THREE.QuaternionKeyframeTrack('pivot.quaternion', [0, 0.1, 0.35], [...Q(0, 0, 0), ...Q(-0.4, 0, 0.3), ...Q(0, 0, 0)])]);
  const death = new THREE.AnimationClip('Death', 1.0, [new THREE.QuaternionKeyframeTrack('pivot.quaternion', [0, 1.0], [...Q(0, 0, 0), ...Q(0, 0, Math.PI / 2)]), new THREE.VectorKeyframeTrack('pivot.position', [0, 1.0], [0, 0, 0, 0, -0.3, 0]), new THREE.QuaternionKeyframeTrack('wingL.quaternion', [0, 1.0], [...Q(0, 0, -0.5), ...Q(0, 0, 0.6)]), new THREE.QuaternionKeyframeTrack('wingR.quaternion', [0, 1.0], [...Q(0, 0, 0.5), ...Q(0, 0, -0.6)])]);
  return [flap('Flying_Idle', owl ? 1.1 : 0.9, owl ? 0.35 : 0.5, 0.06), flap('Flying', 0.55, 0.7, 0.08), flap('Fast_Flying', 0.38, 0.85, 0.1), attack, hit, death];
}

// the sewer cockroach: flat shell, small head, antennae, two leg sets that step in turns
function buildRoach() {
  const root = new THREE.Group(); root.name = 'Bug'; const pivot = new THREE.Group(); pivot.name = 'pivot'; root.add(pivot);
  const body = merged([[S(0.5, 12, 8), 0x5a3214, M4(0, 0.28, -0.05, 0, 0, 0, 0.75, 0.32, 1.1)], [S(0.46, 10, 6), 0x7a4a24, M4(0, 0.33, -0.1, 0, 0, 0, 0.66, 0.24, 0.95)], [new THREE.BoxGeometry(0.03, 0.02, 0.9), 0x2a160a, M4(0, 0.42, -0.1)],
    [S(0.2, 8, 6), 0x3a200c, M4(0, 0.26, 0.55, 0, 0, 0, 1.1, 0.8, 0.9)], ...[-1, 1].flatMap(s => [[S(0.05, 6, 4), 0xffe060, M4(s * 0.1, 0.32, 0.68)], [new THREE.CylinderGeometry(0.012, 0.012, 0.8, 4), 0x2a160a, M4(s * 0.18, 0.5, 0.95, 1.1, 0, -s * 0.35)]])]);
  body.name = 'body'; pivot.add(body);
  for (const [name, set] of [['legsA', [[-1, 0.3], [1, 0], [-1, -0.3]]], ['legsB', [[1, 0.3], [-1, 0], [1, -0.3]]]]) { const g = new THREE.Group(); g.name = name; pivot.add(g);
    const m = merged(set.flatMap(([s, z]) => [[new THREE.CylinderGeometry(0.03, 0.02, 0.5, 4), 0x2a160a, M4(s * 0.45, 0.18, z, 0, 0, s * 1.0)]])); m.name = name + 'Mesh'; g.add(m); }
  return root;
}
function roachClips() {
  const Q = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)).toArray();
  const walk = (name, p) => new THREE.AnimationClip(name, p, [new THREE.QuaternionKeyframeTrack('legsA.quaternion', [0, p / 2, p], [...Q(0, 0.35, 0), ...Q(0, -0.35, 0), ...Q(0, 0.35, 0)]), new THREE.QuaternionKeyframeTrack('legsB.quaternion', [0, p / 2, p], [...Q(0, -0.35, 0), ...Q(0, 0.35, 0), ...Q(0, -0.35, 0)])]);
  return [new THREE.AnimationClip('Idle', 1.5, [new THREE.VectorKeyframeTrack('pivot.position', [0, 0.75, 1.5], [0, 0, 0, 0, 0.02, 0, 0, 0, 0])]), walk('Walk', 0.4), walk('Run', 0.22),
    new THREE.AnimationClip('Attack', 0.5, [new THREE.VectorKeyframeTrack('pivot.position', [0, 0.2, 0.5], [0, 0, 0, 0, 0.1, 0.35, 0, 0, 0])]), new THREE.AnimationClip('Hit', 0.3, [new THREE.QuaternionKeyframeTrack('pivot.quaternion', [0, 0.1, 0.3], [...Q(0, 0, 0), ...Q(0, 0, 0.3), ...Q(0, 0, 0)])]),
    new THREE.AnimationClip('Death', 0.8, [new THREE.QuaternionKeyframeTrack('pivot.quaternion', [0, 0.8], [...Q(0, 0, 0), ...Q(0, 0, Math.PI)]), new THREE.VectorKeyframeTrack('pivot.position', [0, 0.8], [0, 0, 0, 0, 0.55, 0])])];
}
export const BIRDS = { bird_hawk: 'hawk', bird_vulture: 'vulture', bird_king: 'king', bird_owl: 'owl' };
// put the birds in a model cache ({ scene, animations } like GLTFLoader results)
export function registerBirds(cache) { for (const [name, kind] of Object.entries(BIRDS)) cache[name] = { scene: buildBird(kind), animations: clips(kind === 'owl') }; cache.bug_roach = { scene: buildRoach(), animations: roachClips() }; }
