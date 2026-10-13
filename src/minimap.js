// Top-down map: pre-rendered base image + live markers. The player is always an arrow.
import { GODS } from './gods.js';
import { WALL, WORLD, SEWER, CAVE } from './city.js';
import { SHOPS } from './items.js';
import { MAP_LABELS } from './regions.js';
export class Minimap {
  constructor(city, small, big) { this.city = city; this.s = small.getContext('2d'); this.b = big.getContext('2d'); this.small = small; this.big = big; this.PPU = 2; this.base = document.createElement('canvas'); this.base.width = this.base.height = WORLD * 2 * this.PPU; this.rebuild(false); this.explored = new Set(); }
  w2m(v) { return (v + WORLD) * this.PPU; }
  rebuild(winter) {
    const x = this.base.getContext('2d'), c = this.city, P = this.PPU, m = v => this.w2m(v); const tm = c.tiles;
    const col = winter ? { 0: '#e4ecf4', 1: '#c9d2db', 2: '#cdd6de', 3: '#cfe3f2', 4: '#d8dfe6', 5: '#2a3330', 6: '#3a5a40', 7: '#d0c8c0', 8: '#9a6a3e', 9: '#dde4ea', 10: '#4a4650', 11: '#d8d4cc', 12: '#eef3f8', 13: '#6a5a3a', 14: '#3a2a26', 15: '#6aa04a' } : { 0: '#5fae45', 1: '#8a847a', 2: '#b7935b', 3: '#3f8fe0', 4: '#c8bca8', 5: '#2a3330', 6: '#3a5a40', 7: '#6b4a2a', 8: '#9a6a3e', 9: '#c9c2b4', 10: '#4a4650', 11: '#a69b86', 12: '#eef3f8', 13: '#5a4a30', 14: '#3a2a26', 15: '#5a9a3a' };
    const img = x.createImageData(this.base.width, this.base.height), d = img.data; const rgb = {}; for (const k in col) rgb[k] = [parseInt(col[k].slice(1, 3), 16), parseInt(col[k].slice(3, 5), 16), parseInt(col[k].slice(5, 7), 16)];
    const TP = 2 * P;   // pixels per tile
    for (let iz = 0; iz < tm.N; iz++) for (let ix = 0; ix < tm.N; ix++) { const t = rgb[tm.terrain[iz * tm.N + ix]] || rgb[0]; for (let py = 0; py < TP; py++) for (let px = 0; px < TP; px++) { const o = ((iz * TP + py) * this.base.width + ix * TP + px) * 4; d[o] = t[0]; d[o + 1] = t[1]; d[o + 2] = t[2]; d[o + 3] = 255; } }
    x.putImageData(img, 0, 0);
    x.fillStyle = winter ? '#aebccb' : '#2f6a2c'; for (const t of c.trees) if (!t.oak) x.fillRect(m(t.x) - 1.5, m(t.z) - 1.5, 3, 3);
    for (const b of c.buildings) { if (b.kind === 'tower') { x.fillStyle = '#e9b53a'; x.beginPath(); x.arc(m(b.x), m(b.z), b.w / 2 * P, 0, 7); x.fill(); continue; } if (b.kind === 'castleyard') { x.fillStyle = 'rgba(60,90,200,.25)'; x.fillRect(m(b.x - b.w / 2), m(b.z - b.d / 2), b.w * P, b.d * P); continue; } if (b.kind === 'light') { x.fillStyle = '#ffe066'; x.beginPath(); x.arc(m(b.x), m(b.z), b.w / 2 * P, 0, 7); x.fill(); continue; }
      x.fillStyle = b.kind === 'chapel' || b.kind === 'keep' ? '#3b5bc9' : b.kind === 'tavern' || b.kind === 'smithy' ? '#8a5a2e' : b.kind === 'home' ? '#f6c12e' : b.kind === 'barracks' ? '#7a7a88' : '#c75a3f'; x.fillRect(m(b.x - b.w / 2), m(b.z - b.d / 2), b.w * P, b.d * P); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(m(b.x - b.w / 2), m(b.z + b.d / 2) - 1.5, b.w * P, 1.5); }
    x.lineWidth = 2.4 * P; x.strokeStyle = '#e9b53a'; x.strokeRect(m(-WALL), m(-WALL), WALL * 2 * P, WALL * 2 * P);
    x.fillStyle = winter ? '#cdd6de' : '#b7935b'; x.fillRect(m(WALL - 2), m(-5), 5 * P, 10 * P); x.fillRect(m(-5), m(WALL - 2), 10 * P, 5 * P);
    x.fillStyle = '#2f8a3c'; for (const t of c.trees) if (t.oak) x.fillRect(m(t.x) - 2, m(t.z) - 2, 4, 4);
  }
  markers(x, g, m, scale) {
    const p = g.player;
    for (const e of g.entities) { if (e.kind === 'npc') x.fillStyle = '#ffffff'; else if (e.kind === 'villager') x.fillStyle = 'rgba(255,255,255,.55)'; else if (e.kind === 'monster' && e.alive && e.pos.distanceTo(p.pos) < 45) x.fillStyle = e.hostile ? '#ff3030' : '#ffd0a0'; else if (e.kind === 'loot') x.fillStyle = '#ffe066'; else if (e.kind === 'fire') x.fillStyle = e.lit ? '#ff8c2a' : '#7a5a3a'; else if (e.kind === 'chest' && !e.opened) x.fillStyle = '#ffe066'; else if (e.kind === 'boss') x.fillStyle = '#ff2020'; else continue; const [mx, my] = m(e.pos.x, e.pos.z); x.fillRect(mx - 2 * scale, my - 2 * scale, 4 * scale, 4 * scale); }
    // vendors: gold coin with a dark mark, drawn on top of the NPC dot
    for (const e of g.entities) { if (e.kind !== 'npc' || !SHOPS[e.id] || e.hidden) continue; const [mx, my] = m(e.pos.x, e.pos.z); const r = 4.5 * scale; x.fillStyle = '#ffd23a'; x.strokeStyle = '#3a2415'; x.lineWidth = 1.2; x.beginPath(); x.arc(mx, my - 2 * scale, r, 0, 7); x.fill(); x.stroke(); x.fillStyle = '#3a2415'; x.font = `bold ${Math.round(7 * scale)}px monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('$', mx, my - 2 * scale + 0.5); x.textBaseline = 'alphabetic'; }
    for (const sh of g.faith?.shrines || []) { const [mx, my] = m(sh.pos.x, sh.pos.z); const r = 4 * scale; x.fillStyle = GODS[sh.id].css; x.strokeStyle = '#1a0b1c'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(mx, my - r * 1.3); x.lineTo(mx + r, my); x.lineTo(mx, my + r * 1.3); x.lineTo(mx - r, my); x.closePath(); x.fill(); x.stroke(); }
    for (const id in g.npcs) { const n = g.npcs[id]; if (!n.questMark || n.hidden) continue; const [mx, my] = m(n.pos.x, n.pos.z); x.font = `bold ${Math.round(12 * scale)}px sans-serif`; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#000'; x.fillStyle = n.questMark === '!' ? '#ffe066' : '#8dff6a'; x.strokeText(n.questMark, mx, my - 5 * scale); x.fillText(n.questMark, mx, my - 5 * scale); }
    const t = g.story.target; if (t && Math.floor(performance.now() / 400) % 2) { const [mx, my] = m(t.x, t.z); x.fillStyle = '#ffe066'; x.beginPath(); x.moveTo(mx, my - 6 * scale); x.lineTo(mx + 5 * scale, my); x.lineTo(mx, my + 6 * scale); x.lineTo(mx - 5 * scale, my); x.closePath(); x.fill(); x.strokeStyle = '#000'; x.lineWidth = 1; x.stroke(); }
    // player arrow (yaw 0 = north = up)
    const [px, py] = m(p.pos.x, p.pos.z); x.save(); x.translate(px, py); x.rotate(-p.yaw); x.fillStyle = '#ffe066'; x.strokeStyle = '#000'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, -9 * scale); x.lineTo(6 * scale, 7 * scale); x.lineTo(0, 3 * scale); x.lineTo(-6 * scale, 7 * scale); x.closePath(); x.fill(); x.stroke(); x.restore();
  }
  draw(g) {
    const x = this.s, cv = this.small, p = g.player; const view = 90; const S = cv.width / (view * this.PPU);
    x.imageSmoothingEnabled = false; x.fillStyle = '#1a1410'; x.fillRect(0, 0, cv.width, cv.height);
    const sx = this.w2m(p.pos.x) - view * this.PPU / 2, sy = this.w2m(p.pos.z) - view * this.PPU / 2;
    x.drawImage(this.base, sx, sy, view * this.PPU, view * this.PPU, 0, 0, cv.width, cv.height);
    this.markers(x, g, (wx, wz) => [(this.w2m(wx) - sx) * S, (this.w2m(wz) - sy) * S], 1);
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(cv.width / 2 - 7, 2, 14, 12); x.fillStyle = '#fff'; x.font = 'bold 10px monospace'; x.textAlign = 'center'; x.fillText('N', cv.width / 2, 12);
  }
  drawBig(g) {
    const x = this.b, cv = this.big; x.imageSmoothingEnabled = false; x.fillStyle = '#1a1410'; x.fillRect(0, 0, cv.width, cv.height);
    const S = cv.width / this.base.width; x.drawImage(this.base, 0, 0, cv.width, cv.height);
    this.markers(x, g, (wx, wz) => [this.w2m(wx) * S, this.w2m(wz) * S], 1.2);
    x.fillStyle = '#fff'; x.font = 'bold 12px monospace'; x.textAlign = 'center'; x.fillText('N', cv.width / 2, 14);
    const lbl = [['Fortaleza', 0, -WALL - 10], ['Castelo', -68, -WALL - 2], ['Campos do Vale', WALL + 90, -14], ['Floresta Congelada', WALL + 230, -14], ['Rio', -150, -WALL - 10], ['Esgoto', (SEWER.x0 + SEWER.x1) / 2, SEWER.z0 - 8], ['Gruta do Norte', (CAVE.x0 + CAVE.x1) / 2, CAVE.z1 + 10], ...MAP_LABELS];
    x.font = 'bold 11px sans-serif'; x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 3; for (const [t, wx, wz] of lbl) { const px = this.w2m(wx) * S, py = this.w2m(wz) * S; x.strokeText(t, px, py); x.fillText(t, px, py); }
  }
}
