// Item icons: cut from the generated sheets when present, otherwise tinted procedural fallbacks.
import { ICONS, canvas } from './sprites.js';
import { Assets, sliceSheet } from './assets.js';
const SHEETS = {
  ui_icons_sheet: ['espada', 'escudo', 'armadura', 'elmo', 'capa', 'botas', 'amuleto', 'anel', 'sopa', 'tocha', 'pocao', 'chave'],
  ui_icons_equip: ['esp_ferro', 'esp_aco', 'esp_fogo', 'esp_dente_dragao', 'arm_couro', 'arm_latao', 'arm_bronze', 'arm_cobre', 'arm_prata', 'arm_ouro', 'arm_escama_dragao', 'moedas'],
  ui_icons_goods: ['pao', 'carne', 'mel', 'queijo', 'pocao_p', 'pocao_g', 'pele_lobo', 'ferrao_abelha', 'escama_serpente', 'rabo_rato', 'asa_barata', 'pe_coelho'],
};
// [base icon, tint color] used when a sheet is missing
const FALLBACK = {
  esp_ferro: ['espada', '#9aa0a8'], esp_aco: ['espada', '#dfe6ee'], esp_fogo: ['espada', '#ff7a1a'], esp_dente_dragao: ['espada', '#fff2d0'],
  arm_couro: ['armadura', '#8a5a2e'], arm_latao: ['armadura', '#c9a84a'], arm_bronze: ['armadura', '#8c5a3a'], arm_cobre: ['armadura', '#d07a3a'], arm_prata: ['armadura', '#d8dde5'], arm_ouro: ['armadura', '#f6c12e'], arm_escama_dragao: ['armadura', '#c0302a'],
  moedas: ['anel', '#f6c12e'], pao: ['sopa', '#d9a441'], carne: ['sopa', '#a0402a'], mel: ['sopa', '#f0b020'], queijo: ['sopa', '#f0d040'],
  pocao_p: ['pocao', '#ff4040'], pocao_g: ['pocao', '#ff2020'], pele_lobo: ['capa', '#9a9a9a'], ferrao_abelha: ['chave', '#f0d020'], escama_serpente: ['escudo', '#3a9a3a'], rabo_rato: ['tocha', '#e0a0a0'], asa_barata: ['capa', '#6a3a1a'], pe_coelho: ['tocha', '#f0f0f0'], gazua: ['chave', '#b0b8c0'], chave_quartel: ['chave', '#f6c12e'], presa_morcego: ['chave', '#f0f0e0'], seda_aranha: ['capa', '#e8e8ff'],
};
let cache = null;
// Cut a sheet on a fixed 4x3 grid and trim each cell's transparent margin (more reliable than gap detection for busy icon sheets).
function gridCells(img, cols, rows) {
  const cw = img.width / cols, ch = img.height / rows, out = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const [cv, x] = canvas(Math.floor(cw), Math.floor(ch)); x.drawImage(img, c * cw, r * ch, cw, ch, 0, 0, cv.width, cv.height);
    const d = x.getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1; for (let y = 0; y < cv.height; y++) for (let i = 0; i < cv.width; i++) if (d[(y * cv.width + i) * 4 + 3] > 128) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) { out.push(cv); continue; } const side = Math.max(x1 - x0, y1 - y0) + 2, [o, ox] = canvas(side, side); ox.drawImage(cv, x0 - 1 + Math.floor(((x1 - x0) - side) / 2 + 1), y0 - 1 + Math.floor(((y1 - y0) - side) / 2 + 1), side, side, 0, 0, side, side); out.push(o); }
  return out;
}
function tint(src, color) { const [c, x] = canvas(src.width, src.height); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.globalAlpha = 0.6; x.fillRect(0, 0, c.width, c.height); return c; }
export function iconFor(name) {
  if (!cache) { cache = {}; for (const [sheet, names] of Object.entries(SHEETS)) { if (!Assets.has(sheet)) continue; let cells = sliceSheet(Assets.images[sheet], 4, 3); if (cells.length !== 12) cells = gridCells(Assets.images[sheet], 4, 3); cells.forEach((c, i) => { if (names[i] && !cache[names[i]]) cache[names[i]] = c; }); } }
  if (cache[name]) return cache[name];
  if (name.includes('@')) { const [base, color] = name.split('@'); return cache[name] = tint(iconFor(base), color); }
  if (ICONS[name]) return cache[name] = ICONS[name];
  const fb = FALLBACK[name]; if (fb) { const base = iconFor(fb[0]); if (base) return cache[name] = tint(base, fb[1]); }
  return cache[name] = ICONS.espada;
}
