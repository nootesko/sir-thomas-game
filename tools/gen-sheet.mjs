// Generates a character sprite sheet with the OpenAI Images API, using the user's character art as the reference.
// Usage: node tools/gen-sheet.mjs <reference.png> <out.png> "<character description>"
// Sheet layout expected by the game (src/assets.js sliceAnimSheet): 4 rows (down, left, right, up) x 3 columns
// (stand, left foot forward, right foot forward), transparent background. Key: ~/.config/sirthomas/openai.key (never printed).
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const KEY = fs.readFileSync(path.join(os.homedir(), '.config/sirthomas/openai.key'), 'utf8').trim();
const [ref, out, desc = ''] = process.argv.slice(2);
const prompt = `Game sprite sheet of the character in the reference image (${desc}). Keep the character EXACTLY as in the reference: same face, hair, outfit, colors and the same soft stylized 3D render look.
Layout: a clean grid of 4 rows and 3 columns, 12 poses total, evenly spaced, every pose full body, same scale, feet on the same baseline in each row, nothing touching the cell borders.
Camera: top-down three-quarter view used by RPGs like Tibia and Diablo (seen from above at about 45 degrees), the same camera angle in every pose.
Row 1: facing down toward the viewer. Row 2: facing left (side view walking left). Row 3: facing right (side view walking right). Row 4: facing up, back to the viewer.
Column 1: standing still. Column 2: walking, left foot forward. Column 3: walking, right foot forward.
Transparent background, no ground, no shadows, no text, no labels, no grid lines, no borders.`;
const models = (process.env.IMG_MODEL || 'gpt-image-2,gpt-image-1.5,gpt-image-1').split(',');
for (const model of models) {
  const fd = new FormData(); fd.append('model', model); fd.append('prompt', prompt); fd.append('size', process.env.SIZE || '1024x1536'); fd.append('quality', process.env.QUALITY || 'high'); fd.append('background', 'transparent'); fd.append('output_format', 'png'); fd.append('n', '1');
  fd.append('image[]', new Blob([fs.readFileSync(ref)], { type: 'image/png' }), path.basename(ref));
  const t = Date.now(); const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: fd });
  if (!r.ok) { const msg = (await r.text()).replaceAll(KEY, '***').slice(0, 300); console.log('FAIL', model, r.status, msg); if (r.status === 400 || r.status === 404) continue; process.exit(1); }
  const j = await r.json(); const b64 = j.data?.[0]?.b64_json; if (!b64) { console.log('no image', model); continue; }
  fs.writeFileSync(out, Buffer.from(b64, 'base64')); console.log('ok', model, out, ((Date.now() - t) / 1000).toFixed(0) + 's', j.usage ? 'tokens=' + j.usage.total_tokens : ''); process.exit(0);
}
process.exit(1);
