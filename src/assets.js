// Asset loader: tries assets/<name>.png and falls back to a procedural placeholder canvas.
import * as THREE from 'three';
// Trim transparent margins so sprites stand on their feet and hands anchor to the screen corner.
function autoCrop(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const id = x.getImageData(0, 0, c.width, c.height), d = id.data; let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 140 ? 0 : 255;   // crisp pixel edges: no soft glow haze
  x.putImageData(id, 0, 0);
  for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) { if (d[(y * c.width + i) * 4 + 3] > 24) { if (i < minX) minX = i; if (i > maxX) maxX = i; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
  if (maxX < 0) return img; const w = maxX - minX + 1, h = maxY - minY + 1; const o = document.createElement('canvas'); o.width = w; o.height = h; o.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, w, h); return o;
}
// The generated art is drawn at 1024px with "fake" big pixels. Shrinking it to a real low-res grid keeps the pixel look crisp in game
// (textures are then shown near 1:1) instead of a blurry minified photo. Halve repeatedly with smoothing, then snap alpha.
// smooth = true keeps soft painted art (new HD sheets): no hard alpha cut, and the texture is filtered linearly
function pixelize(img, targetH, smooth = false) {
  let c = img; while (c.height / 2 >= targetH) { const n = document.createElement('canvas'); n.width = Math.max(1, Math.round(c.width / 2)); n.height = Math.max(1, Math.round(c.height / 2)); const x = n.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); c = n; }
  if (c.height !== targetH && !(smooth && c.height < targetH)) { const n = document.createElement('canvas'); n.height = targetH; n.width = Math.max(1, Math.round(c.width * targetH / c.height)); const x = n.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); c = n; }
  if (smooth) { c.smooth = true; return c; }
  const x = c.getContext('2d'); const id = x.getImageData(0, 0, c.width, c.height), d = id.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 128 ? 0 : 255; x.putImageData(id, 0, 0); return c;
}
const PIXEL_H = { sprite_tree_pine: 96, sprite_tree_pine_snow: 96, sprite_tree_oak: 80, sprite_mordrak_vulture: 72, sprite_villagers_sheet: 64, prop_lamp_post: 80, prop_banner: 72, prop_statue_knight: 80, prop_ladder: 64 };
function finish(name, img) { if (/^tex_/.test(name)) return pixelize(img, 128); if (/^sheet_/.test(name)) return img; if (!/^(sprite_|prop_)/.test(name)) return img; const cropped = autoCrop(img); return pixelize(cropped, PIXEL_H[name] || PIXEL_H[name.replace(/_top$/, '')] || 64); }
export const Assets = {
  images: {}, frames: {},
  load(name) {
    if (name in this.images) return Promise.resolve(this.images[name]);
    return new Promise(res => { const img = new Image(); img.onload = () => { this.images[name] = /^hand_/.test(name) ? autoCrop(img) : finish(name, img); res(this.images[name]); }; img.onerror = () => { this.images[name] = null; res(null); }; img.src = `assets/${name}.png`; });
  },
  async preload(names) { await Promise.all(names.map(n => this.load(n))); },
  has(name) { return !!this.images[name]; },
  // name may be a list: the first existing image wins (new three-quarter art, then the older front-view art, then the code drawing)
  src(name, fallback) { if (Array.isArray(name)) { for (const n of name) if (this.images[n]) return this.images[n]; return fallback; } return this.images[name] || fallback; },
  // walking frames of a character sheet, sliced once and shared: { down: [stand, left, right], left: [...], right: [...], up: [...] }
  anim(name, targetH = 64, smooth = false, cols = 3) { const k = name + '@' + targetH + (smooth ? 's' : '') + cols; if (!(k in this.frames)) this.frames[k] = this.images[name] ? sliceAnimSheet(this.images[name], targetH, cols, 4, smooth) : null; return this.frames[k]; },
  // HD painted sheets (big images) stay smooth at high resolution; old pixel-art sheets keep their pixel grid
  animAuto(name, cols = 3) { const img = this.images[name]; return img && img.height > 1000 ? this.anim(name, 512, true, cols) : this.anim(name, 64, false, cols); },
  texture(name, fallback, { repeat = 1, repeatY = null, wrap = true, mips = true } = {}) {
    const src = this.images[name] || fallback; const t = new THREE.Texture(src); t.needsUpdate = true;
    t.magFilter = THREE.LinearFilter; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.generateMipmaps = mips;   // smooth, painted look (Shop Titans) instead of hard pixels
    t.wrapS = t.wrapT = wrap ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; t.repeat.set(repeat, repeatY ?? repeat); t.colorSpace = THREE.SRGBColorSpace;
    return t;
  },
};
export const ASSET_NAMES = ['chao_cidade', 'chao_natureza', 'chao_especial', 'plantas_rasteiras', 'arbustos_pedras', 'arvores', 'hand_sword_idle', 'hand_sword_attack', 'hand_torch', 'hand_shield', 'hand_shield_broken', 'skybox_day', 'skybox_night', 'skybox_winter', 'tex_goldstone_wall', 'tex_cobblestone', 'tex_grass', 'tex_snow', 'tex_dirt_path', 'tex_roof_red', 'tex_plaster_timber', 'tex_wood_planks', 'tex_water', 'sprite_thomas', 'sprite_maite', 'sprite_ferreiro', 'sprite_cozinheira', 'sprite_guarda', 'sprite_pipo', 'sprite_wolf_ice', 'sprite_mordrak_vulture', 'sprite_tree_pine', 'sprite_tree_pine_snow', 'sprite_tree_oak', 'prop_market_stall', 'prop_fountain', 'prop_well', 'prop_lamp_post', 'prop_banner', 'prop_statue_knight', 'prop_barrel_crate', 'prop_hay_cart', 'prop_signpost', 'prop_chest_closed', 'prop_chest_open', 'prop_campfire_lit', 'prop_campfire_off', 'prop_rock', 'prop_bush', 'prop_scorch_mark', 'sprite_villagers_sheet', 'ui_card_frame', 'ui_icons_sheet', 'ui_icons_equip', 'ui_icons_goods', 'ui_logo', 'sprite_coelho', 'sprite_lobo', 'sprite_abelha', 'sprite_serpente', 'sprite_rato', 'sprite_barata', 'sprite_mercador', 'tex_sewer_stone', 'tex_sewer_water', 'prop_sewer_grate', 'prop_ladder', 'prop_fence', 'prop_hedge', 'prop_bench', 'prop_flowers', 'prop_training_dummy', 'prop_crates', 'prop_grave', 'prop_cave_mouth', 'prop_stalactite', 'prop_mushroom', 'sprite_morcego', 'sprite_aranha', 'sprite_rei',
  // three-quarter top-down art (item 6): character sheets with 4 directions x 3 walking frames, and scenery drawn from above
  ...['thomas', 'maite', 'pipo', 'guarda', 'ferreiro', 'cozinheira', 'mercador', 'rei', 'taverneira', 'padre', 'capitao', 'villager_a', 'villager_b', 'villager_c', 'villager_d', 'villager_e', 'villager_f', 'coelho', 'lobo', 'wolf_ice', 'abelha', 'serpente', 'rato', 'barata', 'morcego', 'aranha'].map(n => 'sheet_' + n), 'sheet_thomas_attack', 'sheet_thomas_block', ...['dragao'].flatMap(n => ['sheet_' + n, 'sheet_' + n + '_attack']),
  ...['sprite_tree_oak', 'sprite_tree_pine', 'sprite_tree_pine_snow', 'prop_market_stall', 'prop_fountain', 'prop_well', 'prop_lamp_post', 'prop_banner', 'prop_statue_knight', 'prop_barrel_crate', 'prop_hay_cart', 'prop_signpost', 'prop_chest_closed', 'prop_chest_open', 'prop_campfire_lit', 'prop_campfire_off', 'prop_rock', 'prop_bush', 'prop_training_dummy', 'prop_fence', 'prop_flowers', 'prop_bench', 'prop_crates', 'prop_grave', 'prop_hedge', 'prop_cave_mouth', 'prop_mushroom', 'prop_stalactite'].map(n => n + '_top')];
export const TOP = name => [name + '_top', name];   // prefer the three-quarter version of an asset

// Split a sprite sheet into cells by looking for fully transparent gaps (falls back to a uniform grid). Returns raw cell canvases.
function sheetCells(img, cols, rows = 1) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  // occupancy per column/row; gaps are nearly empty lines; overly wide segments get split at their thinnest point
  const segments = (len, other, test) => { const occ = new Array(len).fill(0); for (let i = 0; i < len; i++) for (let j = 0; j < other; j++) if (test(i, j)) occ[i]++;
    const thr = other * 0.015; const segs = []; let start = -1; for (let i = 0; i <= len; i++) { const on = i < len && occ[i] > thr; if (on && start < 0) start = i; if (!on && start >= 0) { if (i - start > 4) segs.push([start, i]); start = -1; } }
    for (let pass = 0; pass < 6; pass++) { const med = segs.map(s => s[1] - s[0]).sort((x, y) => x - y)[Math.floor(segs.length / 2)] || 0; const wide = segs.findIndex(s => s[1] - s[0] > med * 1.6); if (wide < 0 || !med) break;
      const [x0, x1] = segs[wide]; let best = -1, bv = Infinity; for (let i = x0 + Math.floor((x1 - x0) * 0.25); i < x1 - Math.floor((x1 - x0) * 0.25); i++) if (occ[i] < bv) { bv = occ[i]; best = i; } segs.splice(wide, 1, [x0, best], [best, x1]); }
    return segs; };
  const rowSegs = rows > 1 ? segments(c.height, c.width, (y, i) => d[(y * c.width + i) * 4 + 3] > 24) : [[0, c.height]];
  let bands = rowSegs.length === rows ? rowSegs : Array.from({ length: rows }, (_, r) => [Math.floor(r * c.height / rows), Math.floor((r + 1) * c.height / rows)]);
  const cells = [];
  for (const [y0, y1] of bands) {
    let colSegs = segments(c.width, y1 - y0, (i, j) => d[((y0 + j) * c.width + i) * 4 + 3] > 24);
    if (colSegs.length > 1) { const med = colSegs.map(s => s[1] - s[0]).sort((a, b) => a - b)[Math.floor(colSegs.length / 2)]; colSegs = colSegs.filter(([a, b]) => !((a <= 1 || b >= c.width - 1) && (b - a) < med * 0.7)); }   // drop characters cut by the sheet edge
    if (colSegs.length > cols) colSegs = colSegs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, cols).sort((a, b) => a[0] - b[0]);
    if (colSegs.length < 2) colSegs = Array.from({ length: cols }, (_, k) => [Math.floor(k * c.width / cols), Math.floor((k + 1) * c.width / cols)]);
    for (const [x0, x1] of colSegs) { const o = document.createElement('canvas'); o.width = x1 - x0; o.height = y1 - y0; o.getContext('2d').drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height); cells.push(o); }
  }
  return cells;
}
export function sliceSheet(img, cols, rows = 1) { return sheetCells(img, cols, rows).map(autoCrop); }
function bbox(c) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let minX = c.width, minY = c.height, maxX = -1, maxY = -1; for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 140) { if (i < minX) minX = i; if (i > maxX) maxX = i; if (y < minY) minY = y; if (y > maxY) maxY = y; } return maxX < 0 ? null : { x0: minX, y0: minY, x1: maxX + 1, y1: maxY + 1 }; }
// A character sheet of 4 rows (down, left, right, up) x 3 columns (stand, left foot, right foot). Every frame is cut to the same
// size, anchored at the feet and centered, so the animation does not jitter; then shrunk to the real pixel grid.
export function sliceAnimSheet(img, targetH = 64, cols = 3, rows = 4, smooth = false) {
  const cells = sheetCells(img, cols, rows); if (cells.length !== cols * rows) return null;
  const boxes = cells.map(bbox); if (boxes.some(b => !b)) return null;
  const W = Math.max(...boxes.map(b => b.x1 - b.x0)) + 2, H = Math.max(...boxes.map(b => b.y1 - b.y0)) + 2;
  const frames = cells.map((c, i) => { const b = boxes[i]; const o = document.createElement('canvas'); o.width = W; o.height = H; const x = o.getContext('2d'); x.drawImage(c, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, Math.floor((W - (b.x1 - b.x0)) / 2), H - 1 - (b.y1 - b.y0), b.x1 - b.x0, b.y1 - b.y0); return pixelize(o, targetH, smooth); });
  const out = {}; ['down', 'left', 'right', 'up'].forEach((d, r) => { out[d] = frames.slice(r * cols, r * cols + cols); }); return out;
}
