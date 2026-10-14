// Tile world (Tibia-like): a grid of terrain tiles drawn as chunked meshes from one texture atlas, with pixel-edged
// transitions between terrains, plus a walkability grid used by click-to-walk pathfinding.
import * as THREE from 'three';
export const TILE = 2;
export const T = { grass: 0, cobble: 1, dirt: 2, water: 3, plaza: 4, sewer: 5, sewage: 6, soil: 7, planks: 8, walk: 9, rock: 10, gravel: 11, snow: 12, mud: 13, ash: 14, slime: 15, crypt: 16, forest: 17 };
const PRIORITY = { 0: 1, 1: 3, 2: 2, 3: 6, 4: 4, 5: 3, 6: 6, 7: 2, 8: 0.5, 9: 3, 10: 3, 11: 2, 12: 1, 13: 2, 14: 2, 15: 2, 16: 3, 17: 1.5 };   // higher spreads its border over lower
// walking cost per terrain for pedestrians (they keep to sidewalks and paths; roads and lawns cost more)
export const WALK_COST = { 0: 1.6, 1: 1.9, 2: 1.2, 4: 1.0, 5: 1.0, 7: 1.8, 8: 1.0, 9: 1.0, 10: 1.0, 11: 1.1, 16: 1.0, 17: 1.8 };
const CELLS = 5, CELL = 512;   // atlas: 5x5 cells of 512px (painted ground art keeps its detail)
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, 1], [-1, -1]];   // N E S W NE SE SW NW (z grows south)
let seed = 99; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

// 8 edge masks (N E S W NE SE SW NW) with a jagged pixel boundary, packed in one 4x2 canvas
function buildMasks() {
  const S = 64, c = document.createElement('canvas'); c.width = S * 4; c.height = S * 2; const x = c.getContext('2d'); const img = x.createImageData(S * 4, S * 2); const d = img.data;
  const noise = []; for (let i = 0; i < S; i++) noise.push(Math.floor(rng() * 7) - 3);
  for (let k = 0; k < 8; k++) { const ox = (k % 4) * S, oy = Math.floor(k / 4) * S; const [dx, dz] = DIRS[k];
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) { let on;
      const q = (px >> 2) & 15, qy = (py >> 2) & 15; const nx = noise[q] * 1.2, nz = noise[qy] * 1.2;
      if (k < 4) { const depth = 22; on = dx === 1 ? px > S - depth + nz : dx === -1 ? px < depth + nz : dz === 1 ? py > S - depth + nx : py < depth + nx; }
      else { const r = 16; const cx = dx === 1 ? S : 0, cy = dz === 1 ? S : 0; on = Math.hypot(px - cx, py - cy) < r + noise[q] * 0.8; }
      const i = ((oy + py) * S * 4 + ox + px) * 4; d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = on ? 255 : 0; } }
  x.putImageData(img, 0, 0); return c;
}

export class TileMap {
  constructor(scene, world) {
    this.scene = scene; this.world = world; this.N = Math.round(world * 2 / TILE); this.terrain = new Uint8Array(this.N * this.N); this.walk = new Uint8Array(this.N * this.N); this.meshes = [];
    this.atlas = document.createElement('canvas'); this.atlas.width = this.atlas.height = CELLS * CELL; this.atlasTex = new THREE.CanvasTexture(this.atlas); this.atlasTex.magFilter = this.atlasTex.minFilter = THREE.LinearFilter; this.atlasTex.generateMipmaps = false; this.atlasTex.colorSpace = THREE.SRGBColorSpace;
    this.maskTex = new THREE.CanvasTexture(buildMasks()); this.maskTex.magFilter = this.maskTex.minFilter = THREE.NearestFilter; this.maskTex.generateMipmaps = false; this.maskTex.channel = 1;
    this.baseMat = new THREE.MeshLambertMaterial({ map: this.atlasTex }); this.edgeMat = new THREE.MeshLambertMaterial({ map: this.atlasTex, alphaMap: this.maskTex, alphaTest: 0.5 });
  }
  // ---- grid helpers ----
  toTile(v) { return Math.floor((v + this.world) / TILE); }
  center(i) { return -this.world + i * TILE + TILE / 2; }
  snap(v) { return this.center(Math.max(0, Math.min(this.N - 1, this.toTile(v)))); }
  get(ix, iz) { return ix < 0 || iz < 0 || ix >= this.N || iz >= this.N ? -1 : this.terrain[iz * this.N + ix]; }
  at(x, z) { return this.get(this.toTile(x), this.toTile(z)); }
  // only tiles whose centre lies inside the rectangle (house floors must not spill past the walls)
  fillInside(x0, z0, x1, z1, t) { for (let iz = 0; iz < this.N; iz++) { const cz = this.center(iz); if (cz < z0 || cz > z1) continue; for (let ix = 0; ix < this.N; ix++) { const cx = this.center(ix); if (cx >= x0 && cx <= x1) this.terrain[iz * this.N + ix] = t; } } }
  fillRect(x0, z0, x1, z1, t) { for (let iz = Math.max(0, this.toTile(z0)); iz <= Math.min(this.N - 1, this.toTile(z1 - 0.01)); iz++) for (let ix = Math.max(0, this.toTile(x0)); ix <= Math.min(this.N - 1, this.toTile(x1 - 0.01)); ix++) this.terrain[iz * this.N + ix] = t; }
  fillCircle(cx, cz, r, t) { for (let iz = this.toTile(cz - r); iz <= this.toTile(cz + r); iz++) for (let ix = this.toTile(cx - r); ix <= this.toTile(cx + r); ix++) if (ix >= 0 && iz >= 0 && ix < this.N && iz < this.N && Math.hypot(this.center(ix) - cx, this.center(iz) - cz) < r) this.terrain[iz * this.N + ix] = t; }
  // walkability from the city's colliders (used only for path planning; live moves still ask the city)
  rasterize(colliders, pad = 0.4) {
    for (const c of colliders) {
      if (c.type === 'box') { for (let iz = Math.max(0, this.toTile(c.minZ - pad)); iz <= Math.min(this.N - 1, this.toTile(c.maxZ + pad)); iz++) for (let ix = Math.max(0, this.toTile(c.minX - pad)); ix <= Math.min(this.N - 1, this.toTile(c.maxX + pad)); ix++) { const x = this.center(ix), z = this.center(iz); if (x > c.minX - pad && x < c.maxX + pad && z > c.minZ - pad && z < c.maxZ + pad) this.walk[iz * this.N + ix] = 1; } }
      else { const r = c.r + pad; for (let iz = Math.max(0, this.toTile(c.z - r)); iz <= Math.min(this.N - 1, this.toTile(c.z + r)); iz++) for (let ix = Math.max(0, this.toTile(c.x - r)); ix <= Math.min(this.N - 1, this.toTile(c.x + r)); ix++) if (Math.hypot(this.center(ix) - c.x, this.center(iz) - c.z) < r) this.walk[iz * this.N + ix] = 1; }
    }
  }
  walkable(ix, iz) { return ix >= 0 && iz >= 0 && ix < this.N && iz < this.N && !this.walk[iz * this.N + ix] && this.terrain[iz * this.N + ix] !== T.water && this.terrain[iz * this.N + ix] !== T.sewage; }
  // A* on the grid, 8 directions, no corner cutting, binary heap, bounded search window; returns tile centers [[x,z],...]
  // cost: optional { terrainId: multiplier } so pedestrians prefer sidewalks; limit: half size of the search window in tiles
  findPath(fx, fz, tx, tz, limit = 48, cost = null, maxIt = 8000) {
    const N = this.N, sx = this.toTile(fx), sz = this.toTile(fz); let gx = this.toTile(tx), gz = this.toTile(tz);
    if (!this.walkable(gx, gz)) { let best = null, bd = 9; for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const d = Math.hypot(dx, dz); if (this.walkable(gx + dx, gz + dz) && d < bd) { bd = d; best = [gx + dx, gz + dz]; } } if (!best) return null; [gx, gz] = best; }
    if (Math.abs(gx - sx) > limit || Math.abs(gz - sz) > limit) return null;
    if (!this._g) { this._g = new Float32Array(N * N); this._stamp = new Int32Array(N * N); this._came = new Int32Array(N * N); this._gen = 0; }
    const g = this._g, stamp = this._stamp, came = this._came, gen = ++this._gen; const heapK = [], heapF = [];
    const push = (k, f) => { heapK.push(k); heapF.push(f); let i = heapK.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heapF[p] <= heapF[i]) break; [heapK[p], heapK[i]] = [heapK[i], heapK[p]]; [heapF[p], heapF[i]] = [heapF[i], heapF[p]]; i = p; } };
    const pop = () => { const k = heapK[0]; const lk = heapK.pop(), lf = heapF.pop(); if (heapK.length) { heapK[0] = lk; heapF[0] = lf; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heapK.length && heapF[l] < heapF[m]) m = l; if (r < heapK.length && heapF[r] < heapF[m]) m = r; if (m === i) break; [heapK[m], heapK[i]] = [heapK[i], heapK[m]]; [heapF[m], heapF[i]] = [heapF[i], heapF[m]]; i = m; } } return k; };
    const h = (x, z) => { const dx = Math.abs(x - gx), dz = Math.abs(z - gz); return Math.max(dx, dz) + 0.41 * Math.min(dx, dz); };
    const sk = sx + sz * N; g[sk] = 0; stamp[sk] = gen; came[sk] = -1; push(sk, h(sx, sz)); let it = 0;
    while (heapK.length && it++ < maxIt) {
      const k = pop(); const cx = k % N, cz = (k - cx) / N; if (stamp[k] === -gen) continue; stamp[k] = -gen;   // negative stamp = closed
      if (cx === gx && cz === gz) { const path = []; let c = k; while (c >= 0 && c !== sk) { path.push([this.center(c % N), this.center(Math.floor(c / N))]); c = came[c]; } return path.reverse(); }
      const gk = g[k];
      for (let i = 0; i < 8; i++) { const dx = DIRS[i][0], dz = DIRS[i][1], nx = cx + dx, nz = cz + dz; if (!this.walkable(nx, nz)) continue; if (dx && dz && (!this.walkable(cx + dx, cz) || !this.walkable(cx, cz + dz))) continue;
        const nk = nx + nz * N; if (stamp[nk] === -gen) continue; const step = (dx && dz ? 1.41 : 1) * (cost ? (cost[this.terrain[nk]] ?? 1) : 1); const ng = gk + step;
        if (stamp[nk] !== gen || ng < g[nk]) { g[nk] = ng; stamp[nk] = gen; came[nk] = k; push(nk, ng + h(nx, nz)); } }
    }
    return null;
  }
  // ---- rendering ----
  paintAtlas(images) {   // images: { terrainId: canvas/img }
    const x = this.atlas.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, this.atlas.width, this.atlas.height);
    for (const [t, img] of Object.entries(images)) { const i = +t; x.drawImage(img, (i % CELLS) * CELL, Math.floor(i / CELLS) * CELL, CELL, CELL); }
    this.atlasTex.needsUpdate = true;
  }
  // span[t] = K: one image covers K x K tiles (painted textures are drawn at their real scale), so each tile takes its slice
  uvCell(t, ix = 0, iz = 0) { const u0 = (t % CELLS) / CELLS, v0 = 1 - (Math.floor(t / CELLS) + 1) / CELLS, K = (this.span && this.span[t]) || 1, s = 1 / CELLS / K;
    if (K === 1) return [u0, v0, u0 + 1 / CELLS, v0 + 1 / CELLS]; const a = ((ix % K) + K) % K, b = K - 1 - ((iz % K) + K) % K; return [u0 + a * s, v0 + b * s, u0 + (a + 1) * s, v0 + (b + 1) * s]; }
  build() {
    for (const m of this.meshes) this.scene.remove(m); this.meshes = [];
    const CH = 40, pad = 0.0005;
    for (let cz = 0; cz < this.N; cz += CH) for (let cx = 0; cx < this.N; cx += CH) {
      const base = { p: [], uv: [], n: [] }, edge = { p: [], uv: [], uv1: [], n: [] };
      const quad = (o, x0, z0, x1, z1, y, [u0, v0, u1, v1], m) => { o.p.push(x0, y, z0, x0, y, z1, x1, y, z0, x1, y, z0, x0, y, z1, x1, y, z1); o.uv.push(u0 + pad, v1 - pad, u0 + pad, v0 + pad, u1 - pad, v1 - pad, u1 - pad, v1 - pad, u0 + pad, v0 + pad, u1 - pad, v0 + pad); for (let i = 0; i < 6; i++) o.n.push(0, 1, 0); if (m) o.uv1.push(m[0], m[3], m[0], m[1], m[2], m[3], m[2], m[3], m[0], m[1], m[2], m[1]); };
      for (let iz = cz; iz < Math.min(this.N, cz + CH); iz++) for (let ix = cx; ix < Math.min(this.N, cx + CH); ix++) {
        const t = this.terrain[iz * this.N + ix]; const x0 = -this.world + ix * TILE, z0 = -this.world + iz * TILE;
        quad(base, x0, z0, x0 + TILE, z0 + TILE, 0, this.uvCell(t, ix, iz));
        // transitions: each neighbour of higher priority paints its border over this tile
        for (let k = 0; k < 8; k++) { const nt = this.get(ix + DIRS[k][0], iz + DIRS[k][1]); if (nt < 0 || nt === t || PRIORITY[nt] <= PRIORITY[t]) continue;
          if (k >= 4) { const a = this.get(ix + DIRS[k][0], iz), b = this.get(ix, iz + DIRS[k][1]); if (a === nt || b === nt) continue; }   // corner only when no straight edge already covers it
          const mu0 = (k % 4) / 4, mv0 = 1 - (Math.floor(k / 4) + 1) / 2; quad(edge, x0, z0, x0 + TILE, z0 + TILE, 0.01 + k * 0.0005, this.uvCell(nt, ix, iz), [mu0, mv0, mu0 + 0.25, mv0 + 0.5]); }
      }
      const mk = (o, mat, withUv1) => { if (!o.p.length) return; const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); gg.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2)); gg.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3)); if (withUv1) gg.setAttribute('uv1', new THREE.Float32BufferAttribute(o.uv1, 2)); const m = new THREE.Mesh(gg, mat); m.receiveShadow = true; this.scene.add(m); this.meshes.push(m); };
      mk(base, this.baseMat, false); mk(edge, this.edgeMat, true);
    }
  }
}
