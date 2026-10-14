// Generates ground TRANSITION tiles with the OpenAI Images API (gpt-image-2), in the style of the user's painted ground
// sheets (assets/chao_cidade.png and assets/chao_natureza.png are sent as references).
// Usage: node tools/gen-tiles.mjs [name ...]      (no names = all). Output: assets/gen/tiles/<name>.png
// Key: ~/.config/sirthomas/openai.key (never printed). Cost: about one high-quality square image per tile.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const KEY = fs.readFileSync(path.join(os.homedir(), '.config/sirthomas/openai.key'), 'utf8').trim();
const ROOT = new URL('..', import.meta.url).pathname, OUT = path.join(ROOT, 'assets/gen/tiles'); fs.mkdirSync(OUT, { recursive: true });
const BASE = 'Seamless top-down (90 degrees, straight down) game ground texture, square, hand-painted stylized fantasy RPG look, exactly the same painting style, colors and scale as the reference ground textures. No shadows from above, no perspective, no text, no borders.';
const TILES = {
  grama_rua_n: 'Transition tile: the top half is grass, the bottom half is cobblestone road (irregular stones), the border runs horizontally across the middle with grass tufts spilling a little over the stones.',
  grama_rua_canto_ext: 'Transition tile: cobblestone road fills the bottom-right quarter only, rounded corner; the rest is grass with tufts over the edge.',
  grama_rua_canto_int: 'Transition tile: grass fills only the top-left quarter with a rounded corner; the rest is cobblestone road.',
  rua_cruzamento: 'Crossroads of two cobblestone streets meeting at a right angle, with stone sidewalks (square slabs) on the four corners and a drain grate in the middle.',
  rua_t: 'T-junction of cobblestone streets: one street runs horizontally across the tile, another comes from the bottom; stone sidewalk slabs on the remaining corners.',
  grama_calcada_n: 'Transition tile: the top half is grass, the bottom half is a sidewalk of square stone slabs with a neat curb between them.',
  grama_calcada_canto: 'Transition tile: sidewalk of square stone slabs fills the bottom-right quarter with a neat curved curb; the rest is grass.',
  calcada_rua_n: 'Transition tile: the top half is a sidewalk of square stone slabs, the bottom half is cobblestone road, separated by a straight stone curb.',
  grama_terra_n: 'Transition tile: the top half is grass, the bottom half is a dirt path, with a soft natural border, small pebbles and grass tufts along the edge.',
  grama_terra_canto: 'Transition tile: dirt path fills the bottom-right quarter with a soft natural curved border; the rest is grass.',
  terra_cruzamento: 'Crossroads of two dirt paths meeting at a right angle on grass, soft natural edges, small pebbles.',
  grama_agua_n: 'Transition tile: the top half is grass, the bottom half is clear blue water, with a muddy bank, small stones and reeds along the shore.',
};
const refs = ['assets/chao_cidade.png', 'assets/chao_natureza.png'].map(p => path.join(ROOT, p)).filter(fs.existsSync);
const only = process.argv.slice(2), list = Object.entries(TILES).filter(([n]) => !only.length || only.includes(n));
for (const [name, desc] of list) {
  const file = path.join(OUT, name + '.png'); if (fs.existsSync(file) && !process.env.FORCE) { console.log('skip', name); continue; }
  const fd = new FormData(); fd.append('model', process.env.IMG_MODEL || 'gpt-image-2'); fd.append('prompt', BASE + ' ' + desc); fd.append('size', '1024x1024'); fd.append('quality', process.env.QUALITY || 'high'); fd.append('n', '1');
  for (const r of refs) fd.append('image[]', new Blob([fs.readFileSync(r)], { type: 'image/png' }), path.basename(r));
  const res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd });
  if (!res.ok) { console.log('FAIL', name, res.status, (await res.text()).replaceAll(KEY, '***').slice(0, 200)); if (res.status === 429) break; continue; }
  const j = await res.json(); fs.writeFileSync(file, Buffer.from(j.data[0].b64_json, 'base64')); console.log('ok', name);
}
