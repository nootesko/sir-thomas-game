// All art is generated in code: pixel maps (strings) + small procedural drawers.
export const rand = (a, b) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }

export function fromRows(rows, pal) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const [c, x] = canvas(w, h);
  for (let y = 0; y < h; y++) for (let i = 0; i < rows[y].length; i++) { const col = pal[rows[y][i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } }
  return c;
}
export function recolor(src, map) {   // map: {'#rrggbb': '#rrggbb'}
  const [c, x] = canvas(src.width, src.height); x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height), d = img.data;
  const lut = {}; for (const k in map) { const a = hex(k), b = hex(map[k]); lut[a.join()] = b; }
  for (let i = 0; i < d.length; i += 4) { const k = [d[i], d[i + 1], d[i + 2]].join(); if (lut[k]) { d[i] = lut[k][0]; d[i + 1] = lut[k][1]; d[i + 2] = lut[k][2]; } }
  x.putImageData(img, 0, 0); return c;
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ---------- humans ----------
const HUMAN = [
'......hhhh......',
'....hhhhhhhh....',
'...hhhhhhhhhh...',
'...hhhhhhhhhh...',
'...hhssssssshh..',
'...hssssssssh...',
'...hseessseesh..',
'....ssssssss....',
'....ssssssss....',
'.....sssmms.....',
'......ssss......',
'....acccccca....',
'...cccccccccc...',
'..cccccccccccc..',
'..ccccbbbbcccc..',
'.sccccccccccccs.',
'.s..cccccccc..s.',
'....cccccccc....',
'....llllllll....',
'....lll..lll....',
'....lll..lll....',
'....lll..lll....',
'...ffff..ffff...',
'...ffff..ffff...'];
const CROWN = ['....G.GG.G......', '....GGGGGG......'];
const HELMET = ['.....aaaaa......', '....aaaaaaaa....', '...aaaaaaaaaa...', '...aaaaaaaaaa...', '...aassssssaa...'];
const HUMAN_PAL = (hair, skin, tunic, legs, feet, belt, trim) => ({ h: hair, s: skin, e: '#1a1a1a', m: '#c0705a', c: tunic, b: belt, a: trim || tunic, l: legs, f: feet, G: '#f6c12e', p: '#f4efe0' });
function humanRows({ crown = false, helmet = false, apron = false }) {
  let rows = HUMAN.slice();
  if (crown) rows = [...CROWN, ...rows.slice(2)];
  if (helmet) rows = [...HELMET, ...rows.slice(5)];
  if (apron) rows = rows.map((r, y) => (y >= 12 && y <= 17) ? r.slice(0, 5) + r.slice(5, 11).replace(/c/g, 'p') + r.slice(11) : r);
  return rows;
}
export function human(look) { const { hair = '#4a2a12', skin = '#f1c7a0', tunic = '#6b4a9a', legs = '#3a2a4a', feet = '#5a3a1a', belt = '#f6c12e', trim = null } = look; return fromRows(humanRows(look), HUMAN_PAL(hair, skin, tunic, legs, feet, belt, trim)); }
export function flipH(src) { const [c, x] = canvas(src.width, src.height); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; }
// Walking frames of the code-drawn human: { down, left, right, up } x [stand, left foot forward, right foot forward] (16x24 each).
export function humanFrames(look) {
  const { hair = '#4a2a12', skin = '#f1c7a0', tunic = '#6b4a9a', legs = '#3a2a4a', feet = '#5a3a1a', belt = '#f6c12e', trim = null } = look; const pal = HUMAN_PAL(hair, skin, tunic, legs, feet, belt, trim);
  const base = humanRows(look); const H = base.length, top = H - 24;   // rows below `top` are the standard 24-row body
  const set = (rows, y, str) => { rows[y] = str; }; const put = (rows, y, i, ch) => { rows[y] = rows[y].slice(0, i) + ch + rows[y].slice(i + 1); };
  // raise one leg: its pixels in the leg rows move up one row (shorter leg, lifted foot) while the other leg stays planted
  const raise = (rows, a, b) => { const r = rows.slice(); for (let y = top + 19; y <= top + 23; y++) { const below = y + 1 < H ? r[y + 1] : '.'.repeat(16); r[y] = r[y].slice(0, a) + below.slice(a, b) + r[y].slice(b); } return r; };
  const front = base, back = base.map((r, y) => (y >= top + 4 && y <= top + 8) ? r.replace(/[sem]/g, 'h') : y === top + 9 ? r.replace(/m/g, 's') : r);
  // side view: face turned to the left (skin on the left, hair behind), narrow body, one arm in front, legs overlapping
  const side = base.slice();
  for (let y = top + 4; y <= top + 8; y++) { const r = side[y]; const s0 = r.indexOf('s'), s1 = r.lastIndexOf('s') + 1; if (s0 < 0) continue; const cap = r[s1] && r[s1] !== '.' ? r[s1] : 'h'; const cut = s0 + Math.ceil((s1 - s0) * 0.55); side[y] = r.slice(0, s0) + 's'.repeat(cut - s0) + cap.repeat(s1 - cut) + r.slice(s1); if (y === top + 6) put(side, y, s0 + 1, 'e'); }
  { const r = side[top + 9]; const s0 = r.indexOf('s'); if (s0 >= 0) side[top + 9] = r.replace(/m/g, 's').slice(0, s0) + 'm' + r.replace(/m/g, 's').slice(s0 + 1); }
  const ap = look.apron ? r => r.slice(0, 5) + r.slice(5, 9).replace(/c/g, 'p') + r.slice(9) : r => r;
  set(side, top + 11, '....accccca.....'); set(side, top + 12, ap('....cccccccc....')); set(side, top + 13, ap('....cccccccc....')); set(side, top + 14, ap('....ccbbbbcc....')); set(side, top + 15, ap('...scccccccc....')); set(side, top + 16, ap('...s.cccccc.....')); set(side, top + 17, ap('....cccccccc....'));
  set(side, top + 18, '....llllll......'); for (let y = top + 19; y <= top + 21; y++) set(side, y, '.....lllll......'); set(side, top + 22, '....ffffff......'); set(side, top + 23, '....ffffff......');
  const stride = side.slice(); set(stride, top + 19, '....lll.lll.....'); set(stride, top + 20, '...lll...lll....'); set(stride, top + 21, '...lll...lll....'); set(stride, top + 22, '..ffff....ffff..'); set(stride, top + 23, '..ffff....ffff..');
  const R = rows => fromRows(rows, pal);
  const left = [R(side), R(stride), R(stride)];
  return { down: [R(front), R(raise(front, 3, 7)), R(raise(front, 9, 13))], up: [R(back), R(raise(back, 3, 7)), R(raise(back, 9, 13))], left, right: left.map(flipH) };
}

// ---------- creatures ----------
export const WOLF = fromRows([
'..KK..............KK..',
'.KwwK............KwwK.',
'.KwwwK..........KwwwK.',
'.KwwwwKKKKKKKKKKwwwwK.',
'..KwwwwwwwwwwwwwwwwK..',
'..KwwwwwwwwwwwwwwwwK..',
'..KwwwRRwwwwwwRRwwwK..',
'..KwwwwwwwwwwwwwwwwK..',
'...KwwwwwwwwwwwwwwK...',
'....KwwwwKKKKwwwwK....',
'.....KwwwKggKwwwK.....',
'.....KwwwwKKwwwwK.....',
'......KKwwwwwwKK......',
'....KKwwwwwwwwwwKK....',
'...KwwwwwwwwwwwwwwK...',
'...KwwwKwwwwwwKwwwK...',
'...KwwwK.KwwK.KwwwK...',
'...KKKKK.KKKK.KKKKK...'], { K: '#1a1a24', w: '#aebfd0', R: '#4fc3ff', g: '#2a2a34' });
export const WOLF_HIT = recolor(WOLF, { '#aebfd0': '#ff8080' });

export function vulture(frame = 0) {   // 48x24, wings up (0) or down (1)
  const [c, x] = canvas(48, 24);
  const K = '#120f16', F = '#2a2432', R = '#ff2a2a', B = '#e0b040';
  // wings: stepped parallelograms
  for (let i = 0; i < 18; i++) {
    const y = frame === 0 ? 2 + Math.floor(i * 0.5) : 10 - Math.floor(i * 0.3);
    const h = 4 + (i < 4 ? 2 : 0);
    x.fillStyle = K; x.fillRect(i, y, 1, h + 2); x.fillRect(47 - i, y, 1, h + 2);
    x.fillStyle = i % 4 === 0 ? K : F; x.fillRect(i, y + 1, 1, h); x.fillRect(47 - i, y + 1, 1, h);
  }
  // body
  x.fillStyle = K; x.fillRect(18, 8, 12, 12); x.fillStyle = F; x.fillRect(19, 9, 10, 10);
  // neck + head
  x.fillStyle = '#5a1f1f'; x.fillRect(21, 3, 6, 6); x.fillStyle = K; x.fillRect(20, 2, 8, 1); x.fillRect(20, 3, 1, 6); x.fillRect(27, 3, 1, 6);
  x.fillStyle = R; x.fillRect(22, 5, 1, 1); x.fillRect(25, 5, 1, 1);
  x.fillStyle = B; x.fillRect(23, 7, 2, 3); x.fillStyle = K; x.fillRect(23, 10, 2, 1);
  // tail + talons
  x.fillStyle = K; x.fillRect(20, 20, 8, 2); x.fillStyle = B; x.fillRect(21, 21, 2, 3); x.fillRect(25, 21, 2, 3);
  return c;
}
export const VULTURE = [vulture(0), vulture(1)];

// ---------- props ----------
export const CHEST = fromRows([
'.KKKKKKKKKKKKKK.',
'KbbbbbbbbbbbbbbK',
'KbBBBBBBBBBBBBbK',
'KbbbbbbbbbbbbbbK',
'KKKKKKKKKKKKKKKK',
'KbbbbbbGGbbbbbbK',
'KbbbbbbGGbbbbbbK',
'KbbbbbbbbbbbbbbK',
'KbBbbbbbbbbbbBbK',
'KbbbbbbbbbbbbbbK',
'KbbbbbbbbbbbbbbK',
'KKKKKKKKKKKKKKKK'], { K: '#2a1a0a', b: '#8a5a2e', B: '#a8703a', G: '#f6c12e' });
export const CHEST_OPEN = fromRows([
'KKKKKKKKKKKKKKKK',
'KbbbbbbbbbbbbbbK',
'KbyyyyyyyyyyyybK',
'KbyYYYYYYYYYYybK',
'KbyyyyyyyyyyyybK',
'KKKKKKKKKKKKKKKK',
'KbbbbbbGGbbbbbbK',
'KbbbbbbbbbbbbbbK',
'KbBbbbbbbbbbbBbK',
'KbbbbbbbbbbbbbbK',
'KbbbbbbbbbbbbbbK',
'KKKKKKKKKKKKKKKK'], { K: '#2a1a0a', b: '#8a5a2e', B: '#a8703a', G: '#f6c12e', y: '#ffe066', Y: '#fff6c0' });

export function campfire(frame) {   // 16x18
  const [c, x] = canvas(16, 18);
  x.fillStyle = '#6a6a72'; for (let i = 0; i < 6; i++) x.fillRect(1 + i * 2.5, 14 + (i % 2), 2, 2);
  x.fillStyle = '#5a3a1a'; x.fillRect(2, 12, 12, 2); x.fillRect(4, 10, 8, 2); x.fillStyle = '#3a2210'; x.fillRect(3, 12, 1, 2); x.fillRect(11, 12, 1, 2);
  if (frame >= 0) {
    const j = frame % 2;
    x.fillStyle = '#ff7a1a'; x.fillRect(5, 6 + j, 6, 5); x.fillRect(6, 3 + j, 4, 3); x.fillRect(7 - j, 1 + j, 2, 2);
    x.fillStyle = '#ffd23a'; x.fillRect(6, 8, 4, 3); x.fillRect(7, 5 + j, 2, 3);
    x.fillStyle = '#fff6c0'; x.fillRect(7, 9, 2, 2);
  }
  return c;
}
export const FIRE = [campfire(0), campfire(1)], FIRE_OFF = campfire(-1);

export function tree(winter = false, big = false) {   // pine, 20x32 (big: 28x44)
  const w = big ? 28 : 20, h = big ? 44 : 32; const [c, x] = canvas(w, h);
  const K = '#163a1e', leaf = winter ? '#e9f1fa' : '#2f8a3c', leaf2 = winter ? '#c9d9e8' : '#1f6a2c', trunk = '#6b4423';
  const layers = big ? 4 : 3; const cx = w / 2;
  for (let L = 0; L < layers; L++) {
    const top = 1 + L * (h * 0.22), span = (h * 0.3) + L * (h * 0.08);
    for (let r = 0; r < span; r++) {
      const half = Math.max(1, Math.floor((r / span) * (w / 2 - 1)));
      x.fillStyle = (r % 3 === 2) ? leaf2 : leaf; x.fillRect(cx - half, top + r, half * 2, 1);
      x.fillStyle = winter ? '#7f95ad' : K; x.fillRect(cx - half - 1, top + r, 1, 1); x.fillRect(cx + half, top + r, 1, 1);
    }
  }
  x.fillStyle = trunk; x.fillRect(cx - 2, h - 7, 4, 7); x.fillStyle = '#3a2210'; x.fillRect(cx - 3, h - 7, 1, 7); x.fillRect(cx + 2, h - 7, 1, 7);
  if (winter) { x.fillStyle = '#ffffff'; x.fillRect(cx - 1, 0, 2, 2); }
  return c;
}
export const TREES = { summer: tree(false), winter: tree(true), bigSummer: tree(false, true), bigWinter: tree(true, true) };

export function rock(winter) { const [c, x] = canvas(16, 10); x.fillStyle = '#3a3a44'; x.fillRect(1, 3, 14, 7); x.fillStyle = winter ? '#c9d6e2' : '#7d7f86'; x.fillRect(2, 4, 12, 5); x.fillRect(4, 2, 8, 2); x.fillStyle = winter ? '#eef4fa' : '#9a9ca5'; x.fillRect(5, 3, 4, 2); x.fillStyle = '#3a3a44'; x.fillRect(3, 2, 1, 1); x.fillRect(12, 2, 1, 1); return c; }
export const ROCKS = { summer: rock(false), winter: rock(true) };

export function house(winter) {   // 32x30
  const [c, x] = canvas(32, 30);
  x.fillStyle = '#2a1a0a'; x.fillRect(3, 12, 26, 18); x.fillStyle = '#e9dcc0'; x.fillRect(4, 13, 24, 16);
  x.fillStyle = '#c9a06a'; for (let i = 0; i < 4; i++) x.fillRect(4, 14 + i * 4, 24, 1);
  // roof
  for (let r = 0; r < 12; r++) { x.fillStyle = r % 3 === 0 ? '#9e3b27' : (winter && r < 4 ? '#eef4fa' : '#c75a3f'); x.fillRect(16 - r - 3, r + 1, (r + 3) * 2, 1); }
  x.fillStyle = '#2a1a0a'; x.fillRect(0, 12, 32, 1); for (let r = 0; r < 12; r++) { x.fillRect(16 - r - 4, r + 1, 1, 1); x.fillRect(16 + r + 3, r + 1, 1, 1); }
  // door + window
  x.fillStyle = '#5a3a1a'; x.fillRect(13, 20, 6, 9); x.fillStyle = '#f6c12e'; x.fillRect(17, 25, 1, 1);
  x.fillStyle = '#2a1a0a'; x.fillRect(6, 16, 6, 6); x.fillStyle = '#9ad0ff'; x.fillRect(7, 17, 4, 4); x.fillStyle = '#2a1a0a'; x.fillRect(9, 17, 1, 4); x.fillRect(7, 19, 4, 1);
  x.fillStyle = '#2a1a0a'; x.fillRect(21, 16, 6, 6); x.fillStyle = '#ffd98a'; x.fillRect(22, 17, 4, 4);
  return c;
}
export const HOUSES = { summer: house(false), winter: house(true) };

export function tower() {   // 24x72 stone tower, light gem drawn separately
  const [c, x] = canvas(24, 72);
  x.fillStyle = '#3a3a44'; x.fillRect(3, 12, 18, 60); x.fillStyle = '#8a8d95'; x.fillRect(4, 13, 16, 59);
  x.fillStyle = '#6f727a'; for (let r = 0; r < 15; r++) for (let i = 0; i < 4; i++) x.fillRect(4 + i * 4 + ((r % 2) * 2), 14 + r * 4, 3, 1);
  x.fillStyle = '#3a3a44'; for (let i = 0; i < 5; i++) x.fillRect(2 + i * 4, 9, 3, 4);
  x.fillStyle = '#1a1a24'; x.fillRect(10, 40, 4, 6); x.fillRect(10, 56, 4, 6);
  x.fillStyle = '#2b5fc7'; x.fillRect(1, 7, 22, 2); x.fillStyle = '#3b5bc9'; x.fillRect(6, 3, 12, 4); x.fillRect(9, 0, 6, 3);
  return c;
}
export const TOWER = tower();
export function gem(frame) { const [c, x] = canvas(16, 16); const p = frame % 2; x.fillStyle = '#ffd23a'; x.fillRect(6, 1 + p, 4, 14 - p * 2); x.fillRect(3, 4 + p, 10, 8 - p * 2); x.fillRect(1, 6 + p, 14, 4 - p); x.fillStyle = '#fff6c0'; x.fillRect(7, 3 + p, 2, 10 - p * 2); x.fillRect(4, 7, 8, 2); return c; }
export const GEM = [gem(0), gem(1)];

export function wall(winter) {   // 16x16 brick tile pattern (used as fill pattern)
  const [c, x] = canvas(16, 16); x.fillStyle = winter ? '#8e97a8' : '#8a8d95'; x.fillRect(0, 0, 16, 16);
  x.fillStyle = winter ? '#6c7484' : '#6f727a'; for (let r = 0; r < 4; r++) { x.fillRect(0, r * 4 + 3, 16, 1); x.fillRect(((r % 2) * 4 + 1) % 8, r * 4, 1, 3); x.fillRect(((r % 2) * 4 + 9) % 16, r * 4, 1, 3); }
  x.fillStyle = winter ? '#aab3c2' : '#9ea1a9'; x.fillRect(2, 1, 2, 1); x.fillRect(10, 5, 3, 1); x.fillRect(6, 9, 2, 1); x.fillRect(13, 13, 2, 1);
  return c;
}
export const WALLS = { summer: wall(false), winter: wall(true) };

export const WELL = fromRows([
'......KKKK......',
'....KKrrrrKK....',
'..KKrrrrrrrrKK..',
'.KrrrrrrrrrrrrK.',
'.KKKKKKKKKKKKKK.',
'...Kw......wK...',
'...Kw......wK...',
'...Kw......wK...',
'...Kw......wK...',
'..KssssssssssK..',
'.KsSsssSsssSssK.',
'.KssssssssssssK.',
'.KsSssssSssssSK.',
'.KssssssssssssK.',
'.KKKKKKKKKKKKKK.'], { K: '#2a2a34', r: '#c75a3f', w: '#6b4423', s: '#8a8d95', S: '#6f727a' });
export const FORGE = (() => { const [c, x] = canvas(28, 20); x.fillStyle = '#2a2a34'; x.fillRect(0, 6, 18, 14); x.fillStyle = '#55575f'; x.fillRect(1, 7, 16, 12); x.fillStyle = '#ff6a00'; x.fillRect(4, 9, 10, 4); x.fillStyle = '#ffd23a'; x.fillRect(6, 10, 6, 2); x.fillStyle = '#2a2a34'; x.fillRect(20, 10, 8, 3); x.fillRect(22, 13, 4, 7); x.fillStyle = '#5a3a1a'; x.fillRect(22, 14, 4, 5); return c; })();
export const BED = fromRows([
'KKKKKKKKKKKKKKKKKKKK',
'KwwwwwwKbbbbbbbbbbbK',
'KwwwwwwKbbbbbbbbbbbK',
'KwwwwwwKBBBBBBBBBBBK',
'KwwwwwwKbbbbbbbbbbbK',
'KKKKKKKKKKKKKKKKKKKK',
'KddddddddddddddddddK',
'KKK..............KKK',
'KKK..............KKK'], { K: '#2a1a0a', w: '#f4efe0', b: '#2b5fc7', B: '#4a7fe0', d: '#8a5a2e' });
export const LORE = {
  sword: fromRows(['......K.....', '.....KwK....', '.....KwK....', '....KwwK....', '....KwwK....', '...KwwK.....', '...KwwK.....', '..KKKKKK....', '..KgggggK...', '...KbbK.....', '...KbbK.....', '..KKKKKK....', '.KddddddK...', 'KddddddddK..'], { K: '#2a2a34', w: '#9ea6b5', g: '#f6c12e', b: '#5a3a1a', d: '#6a6a72' }),
  statue: fromRows(['.....KKKK.....', '....KssssK....', '....KssssK....', '.....KssK.....', '..KKKKssKKKK..', '.KssssssssssK.', '.KssKssssKssK.', '.KssKssssKssK.', '....KssssK....', '....KssssK....', '....KssssK....', '...KssssssK...', '..KKKKKKKKKK..', '.KssssssssssK.', '.KKKKKKKKKKKK.'], { K: '#3a3a44', s: '#8d8f96' }),
  toy: fromRows(['......KK....', '.....KbbK...', '..KKKKbbbK..', '.KbbbbbbbK..', '.KbbbbbbK...', '.KbKbbKbK...', '.KKK.KKK....', 'KwwwwwwwwK..', 'KKKKKKKKKK..'], { K: '#2a1a0a', b: '#d45a5a', w: '#8a5a2e' }),
};
export const SHIELD_BROKEN = (() => { const [c, x] = canvas(20, 16); x.fillStyle = '#2b5fc7'; x.fillRect(2, 4, 6, 8); x.fillRect(10, 3, 5, 9); x.fillRect(15, 6, 4, 6); x.fillStyle = '#f6c12e'; x.fillRect(3, 5, 1, 6); x.fillRect(11, 4, 3, 1); x.fillStyle = '#ffe066'; x.fillRect(8, 6, 2, 4); x.fillStyle = '#fff6c0'; x.fillRect(8, 7, 1, 2); return c; })();

// ---------- item icons (16x16) ----------
const I = { K: '#2a1a0a', g: '#f6c12e', b: '#9fdcff', B: '#e6f7ff', w: '#5a3a1a', c: '#2b5fc7', C: '#4a7fe0', s: '#9ea6b5', r: '#c75a3f', y: '#ffe066', p: '#d9a1c9', t: '#8a4b1f', o: '#ff7a1a', v: '#7fe8ff', m: '#2a2a34', f: '#f4efe0' };
export const ICONS = {
  espada: fromRows(['............KK..', '...........KBbK.', '..........KBbbK.', '.........KBbbK..', '........KBbbK...', '.......KBbbK....', '......KBbbK.....', '..K..KBbbK......', '..KgKBbbK.......', '...KggbK........', '...KKgK.........', '..KwwKgK........', '.KwwK..K........', 'KwwK............', 'KKK.............', '................'], I),
  glacial: fromRows(['............KK..', '...........KBvK.', '..........KBvvK.', '.........KBvvK..', '........KBvvK...', '.......KBvvK....', '......KBvvK.....', '..K..KBvvK......', '..KgKBvvK.......', '...KggvK........', '...KKgK.........', '..KwwKgK........', '.KwwK..K........', 'KwwK............', 'KKK.............', '................'], I),
  escudo: fromRows(['..KKKKKKKKKKK...', '.KggggggggggK...', 'KgccccccccccgK..', 'KgccccgccccccgK.', 'KgcccgggcccccgK.', 'KgccgggggccccgK.', 'KgcccgggcccccgK.', 'KgccccgcccccgK..', '.KgcccccccccgK..', '.KgccccccccgK...', '..KgccccccgK....', '...KgccccgK.....', '....KgccgK......', '.....KggK.......', '......KK........', '................'], I),
  armadura: fromRows(['....KK...KK.....', '...KssK.KssK....', '..KccccKccccK...', '.KccccccccccccK.', 'KsccccccccccccsK', 'KsKccccccccccKsK', 'KKKccgggggccKKK.', '..KcccccccccK...', '..KcccccccccK...', '..KccccccccccK..', '..KggggggggggK..', '..KcccccccccK...', '..KcccccccccK...', '..KKKKKKKKKKK...', '................', '................'], I),
  elmo: fromRows(['.....KKKKKK.....', '...KKssssssKK...', '..KssssssssssK..', '.KssssssssssssK.', '.KssssssssssssK.', '.KsssKKKKKKsssK.', '.KssK......KssK.', '.KssK......KssK.', '.KsssKKKKKKsssK.', '.KssssssssssssK.', '..KssssssssssK..', '...KKKKKKKKKK...', '......gggg......', '................', '................', '................'], I),
  capa: fromRows(['....KKKKKKKK....', '...KrrrrrrrrK...', '..KrrrrrrrrrrK..', '..KrrrrrrrrrrK..', '.KrrrrrrrrrrrrK.', '.KrrrrrrrrrrrrK.', '.KrrrrrrrrrrrrK.', 'KrrrrrrrrrrrrrrK', 'KrrrrrrrrrrrrrrK', 'KrrrrrrrrrrrrrrK', 'KrrrrrrrrrrrrrrK', 'KrrrrrrrrrrrrrrK', 'KKKKKKKKKKKKKKKK', '................', '................', '................'], I),
  botas: fromRows(['................', '....KKKK........', '...KttttK.......', '...KttttK.......', '...KttttK.......', '...KttttK.......', '...KttttKKKK....', '...KttttttttK...', '..KtttttttttK...', '.KttttttttttK...', 'KtttttttttttK...', 'KKKKKKKKKKKKK...', '................', '................', '................', '................'], I),
  amuleto: fromRows(['......KKKK......', '.....Kg..gK.....', '....Kg....gK....', '...Kg......gK...', '...Kg......gK...', '....Kg....gK....', '.....KgggggK....', '....KgggggggK...', '...KgggoooggK...', '...KggooooogK...', '...KggooooogK...', '...KgggoooggK...', '....KgggggggK...', '.....KKKKKKK....', '................', '................'], I),
  anel: fromRows(['................', '................', '......KKKK......', '....KKbbbbKK....', '...KbbBBBBbbK...', '...KgggKKgggK...', '..KggK....KggK..', '..KggK....KggK..', '..KggK....KggK..', '...KggKKKKggK...', '....KggggggK....', '.....KKKKKK.....', '................', '................', '................', '................'], I),
  sopa: fromRows(['................', '......KKKK......', '.....Ko..oK.....', '....KooooooK....', 'KKKKKKKKKKKKKKKK', 'KwwwwwwwwwwwwwwK', '.KwwwwwwwwwwwwK.', '.KwwwwwwwwwwwwK.', '..KwwwwwwwwwwK..', '..KwwwwwwwwwwK..', '...KwwwwwwwwK...', '....KKKKKKKK....', '................', '................', '................', '................'], I),
  mao: fromRows(['................', '....KK.KK.KK....', '...KttKttKttK...', '...KttKttKttK...', 'KK.KttttttttK...', 'KttKttttttttK...', 'KttKttttttttK...', '.KttttttttttK...', '.KttttttttttK...', '..KtttttttttK...', '..KtttttttttK...', '..KgggggggggK...', '..KcccccccccK...', '..KcccccccccK...', '..KKKKKKKKKKK...', '................'], I),
  tocha: fromRows(['......KoK.......', '.....KoyoK......', '.....KoyoK......', '....KooyooK.....', '....KoooooK.....', '.....KKKKK......', '.....KmmmK......', '.....KmmmK......', '......KwK.......', '......KwK.......', '......KwK.......', '......KwK.......', '......KwK.......', '......KwK.......', '......KKK.......', '................'], I),
};

// ---- placeholder monsters (replaced by assets/sprite_<id>.png when present) ----
export const RABBIT = fromRows([
'..K.....K...',
'.KwK...KwK..',
'.KwK...KwK..',
'.KwwKKKwwK..',
'KwwwwwwwwwK.',
'KwkwwwwwkwK.',
'KwwwwpwwwwK.',
'.KwwwwwwwwKK',
'KwwwwwwwwwwK',
'KwwwwwwwwwwK',
'.KKwwKKwwKK.',
'...KK..KK...'], { K: '#2a2a2a', w: '#d9c5a8', k: '#111', p: '#e08090' });
export const BEE = fromRows([
'...gg....gg...',
'..gggg..gggg..',
'.KggggKKggggK.',
'KKyyKKyyKKyyKK',
'KkyyKKyyKKyyKK',
'KkyyKKyyKKyyKK',
'.KyyKKyyKKyyK.',
'..KKKKKKKKKK..',
'....K....K.K..',
'.............K'], { K: '#1a1a1a', y: '#f2c21a', g: '#cfe8f0', k: '#fff' });
export const SNAKE = fromRows([
'........KKK.....',
'.......KggkK....',
'.......KgggK.K..',
'........KgK.rK..',
'..KKKK..KgK.....',
'.KggggKKggK.....',
'KggKKggggggK....',
'KggK.KKKKggK....',
'.KK......KK.....',
'................'], { K: '#143a14', g: '#4fa83a', k: '#fff', r: '#e03030' });
export const RAT = fromRows([
'...........KK...',
'..........KggK..',
'....KKKKKKKggK..',
'...KggggggggK...',
'..KggggggrgggK..',
'.KgggggggggggKpp',
'.KggggggggggKKp.',
'..KKgKKgKKgK....',
'....K..K..K.....'], { K: '#1a1a1a', g: '#6a6a72', r: '#e03030', p: '#e8a0a0' });
export const ROACH = fromRows([
'..K.........K.',
'...K.......K..',
'....KKKKKKK...',
'...KbbbbbbbK..',
'..KbbBbbbBbbK.',
'.K.KbbbbbbbK.K',
'..KbbbbbbbbbK.',
'.K.KKKKKKKKK.K',
'..K...K.K...K.'], { K: '#1a0e06', b: '#7a4a1e', B: '#a86a30' });
export const WOLF_GRAY = recolor(WOLF, { '#aebfd0': '#8a8f99', '#dfe8f0': '#b8bcc4', '#ffffff': '#d8dadd' });

export const BAT = fromRows([
'K......K......K.',
'KK....KKK....KK.',
'KKK..KKKKK..KKK.',
'.KKKKKkkkKKKKK..',
'..KKKkrkrkKKK...',
'...KKkkkkkKK....',
'....KKkkkKK.....',
'.....KKKKK......',
'......K.K.......',
], { K: '#2a2030', k: '#4a3a5a', r: '#ff4040' });
export const SPIDER = fromRows([
'K...K......K...K',
'.K..K.KKKK.K..K.',
'..K.KKkkkkKK.K..',
'...KKkkkkkkKK...',
'KKKKkkkrkkkkKKKK',
'...KKkkkkkkKK...',
'..K.KKkkkkKK.K..',
'.K..K.KKKK.K..K.',
'K...K......K...K',
], { K: '#1a1a1a', k: '#3a2a2a', r: '#ff3030' });
