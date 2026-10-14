// Streets, squares and street furniture for the kingdom's towns outside the fortress (Lossot, the Owl-Bear City, the
// Jelly Castle courtyard, the Bird King's hill). A town is a list of streets (paved strips with sidewalks), squares
// (circles) and lanes from every house door to the nearest street; then lamps, benches, barrels, crates and flower
// beds line the streets. layoutTowns runs with the regions (props), paintTowns with the ground tiles.
import { T } from './tilemap.js';

const rng = (() => { let s = 9137; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const R = (a, b) => a + rng() * (b - a);

// town plans (world coordinates); street: [x0, z0, x1, z1, width, ground], square: [x, z, r, ground]
function plans(D) {
  const L = D.lossot, N = D.neveo;
  return {
    lossot: {
      squares: [[-255, 105, 9, T.walk]],
      streets: [[-292, 105, -218, 105, 4, T.gravel], [-255, 76, -255, 130, 4, T.gravel], [-255, 130, -250, 120, 4, T.gravel]],
      sidewalk: T.planks, doors: L.huts, lanes: T.gravel, lampEvery: 14, well: [-255, 105],
    },
    neveo: {
      squares: [[65, -265, 14, T.plaza]],
      streets: [[28, -300, 65, -300, 4, T.cobble], [65, -300, 108, -300, 4, T.cobble], [65, -300, 65, -251, 5, T.cobble], [65, -279, 65, -228, 5, T.cobble], [30, -265, 100, -265, 4, T.cobble]],
      sidewalk: T.walk, doors: N.houses, lanes: T.cobble, lampEvery: 12, well: null,
    },
    geleca: {
      squares: [[-268, -115, 6, T.cobble]],
      streets: [[-268, -115, -236, -115, 5, T.cobble], [-268, -146, -268, -84, 3, T.cobble]],
      sidewalk: null, doors: [D.geleca.keep], lanes: T.cobble, lampEvery: 0, well: null,
    },
  };
}

const segs = P => P.streets.map(([x0, z0, x1, z1, w, t]) => ({ x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), w, t }));
const rectOf = s => s.x0 === s.x1 || Math.abs(s.x1 - s.x0) < Math.abs(s.z1 - s.z0) ? [s.x0 - s.w / 2, s.z0, s.x1 + s.w / 2, s.z1] : [s.x0, s.z0 - s.w / 2, s.x1, s.z1 + s.w / 2];
// nearest point on any street centre line
function nearestOnStreets(P, x, z) { let best = null, bd = 1e9; for (const s of segs(P)) { const px = Math.max(s.x0, Math.min(s.x1, x)), pz = Math.max(s.z0, Math.min(s.z1, z)); const d = Math.hypot(px - x, pz - z); if (d < bd) { bd = d; best = [px, pz]; } } for (const [sx, sz, r] of P.squares) { const d = Math.hypot(x - sx, z - sz) - r; if (d < bd) { bd = d; const k = r / Math.max(1e-3, Math.hypot(x - sx, z - sz)); best = [sx + (x - sx) * k, sz + (z - sz) * k]; } } return best; }

export function paintTowns(c, tm) {
  const D = c.regions; if (!D) return; const PL = plans(D);
  for (const P of Object.values(PL)) {
    // sidewalks first (wider strip), then the street, then squares, then lanes to every door
    if (P.sidewalk != null) for (const s of segs(P)) { const [a, b, cc, d] = rectOf({ ...s, w: s.w + 3 }); tm.fillRect(a, b, cc, d, P.sidewalk); }
    for (const s of segs(P)) { const [a, b, cc, d] = rectOf(s); tm.fillRect(a, b, cc, d, s.t); }
    for (const [x, z, r, t] of P.squares) { if (P.sidewalk != null) tm.fillCircle(x, z, r + 2, P.sidewalk); tm.fillCircle(x, z, r, t); }
    for (const h of P.doors || []) { if (!h?.outside) continue; const [dx, dz] = h.outside, n = nearestOnStreets(P, dx, dz); if (!n) continue; tm.fillRect(Math.min(dx, n[0]) - 1, dz - 1, Math.max(dx, n[0]) + 1, dz + 1, P.lanes); tm.fillRect(n[0] - 1, Math.min(dz, n[1]) - 1, n[0] + 1, Math.max(dz, n[1]) + 1, P.lanes); }
  }
  // the Bird King's hill: a stone path winding up to the summit ring
  for (let a = 0; a < Math.PI * 1.6; a += 0.05) { const r = 34 - a * 8, x = -95 + Math.sin(a) * r * 0.3, z = -280 - a * 12; tm.fillCircle(x, z, 1.8, T.gravel); }
}

export function layoutTowns(c) {
  const D = c.regions; if (!D) return; const PL = plans(D), S = c.sets, free = (x, z, r = 0.8) => !c.blocked(x, z, r);
  for (const [key, P] of Object.entries(PL)) {
    // lamp posts on alternating sides of every street, a little outside the paving
    if (P.lampEvery && S.lamp) for (const s of segs(P)) { const len = Math.hypot(s.x1 - s.x0, s.z1 - s.z0), along = Math.abs(s.x1 - s.x0) >= Math.abs(s.z1 - s.z0); for (let t = 4, k = 0; t < len - 2; t += P.lampEvery, k++) { const side = k % 2 ? 1 : -1, off = s.w / 2 + 2.2; const x = along ? s.x0 + t : s.x0 + side * off, z = along ? s.z0 + side * off : s.z0 + t; if (free(x, z)) { S.lamp.add(x, z, 1.1, 3.4); c.addCircle(x, z, 0.35); } } }
    // squares: benches facing the middle, a well, flower beds and barrels at the edge
    for (const [x, z, r] of P.squares) {
      if (S.bench) for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, bx = x + Math.cos(a) * (r + 1.2), bz = z + Math.sin(a) * (r + 1.2); if (free(bx, bz)) S.bench.add(bx, bz, 2.2, 1.0); }
      if (S.flowers) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, fx = x + Math.cos(a) * (r + 3.2), fz = z + Math.sin(a) * (r + 3.2); if (free(fx, fz)) S.flowers.add(fx, fz, 2.2, 1.1); }
      if (key !== 'geleca' && S.barrel) for (let i = 0; i < 3; i++) { const a = R(0, 6.28), bx = x + Math.cos(a) * (r + 4.5), bz = z + Math.sin(a) * (r + 4.5); if (free(bx, bz)) { S.barrel.add(bx, bz, 2.4, 1.8); c.addCircle(bx, bz, 0.6); } }
    }
    if (P.well && S.well && free(P.well[0], P.well[1], 2)) { S.well.add(P.well[0], P.well[1], 3, 3); c.addCircle(P.well[0], P.well[1], 1.4); }
    // crates and barrels by the doors, like people live there
    for (const h of P.doors || []) { if (!h?.outside) continue; const [dx, dz] = h.outside; for (const [ox, oz] of [[1.8, 0.4], [-1.8, 0.4]]) { const x = dx + ox, z = dz + oz; if (rng() < 0.6 && free(x, z)) { (rng() < 0.5 ? S.barrel : S.crates)?.add(x, z, 2.0, 1.5); c.addCircle(x, z, 0.5); } } }
  }
  // the hill's summit: banners of the Bird King around the nests
  if (S.banner) for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, x = -95 + Math.cos(a) * 20, z = -308 + Math.sin(a) * 17; if (free(x, z)) S.banner.add(x, z, 1.6, 4); }
}
