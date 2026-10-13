// Generates the briefing images with the OpenAI Images API. Key is read from ~/.config/sirthomas/openai.key (never printed).
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import os from 'node:os';
const KEY = fs.readFileSync(path.join(os.homedir(), '.config/sirthomas/openai.key'), 'utf8').trim();
const ROOT = new URL('..', import.meta.url).pathname; const OUT = path.join(ROOT, 'assets');
const html = fs.readFileSync(process.argv[2], 'utf8');
const js = html.slice(html.indexOf('const STYLE'), html.indexOf('const KEY')); const ctx = {}; vm.createContext(ctx); vm.runInContext(js + '\nthis.batches = batches;', ctx);
const only = (process.argv[3] || 'leva1').split(','); const filter = process.argv[4] ? process.argv[4].split(',') : null;
const items = ctx.batches.filter(b => only.includes(b.id) || only.includes('all')).flatMap(b => b.items).filter(i => !filter || filter.includes(i.file.replace('.png', '')));
const sizeOf = s => s.replace('×', 'x');
let model = process.env.IMG_MODEL || 'gpt-image-1';
async function gen(it, attempt = 0) {
  const file = path.join(OUT, it.file); if (fs.existsSync(file) && !process.env.FORCE) { console.log('skip (exists)', it.file); return; }
  const body = { model, prompt: it.prompt, size: sizeOf(it.size), quality: process.env.QUALITY || (it.cat === 'mãos' || it.cat === 'personagem' ? 'high' : 'medium'), output_format: 'png', n: 1 };
  if (it.bg === 'transparente') body.background = 'transparent';
  const r = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) { const t = await r.text(); const msg = t.replace(KEY, '***').slice(0, 300);
    if (/model/i.test(msg) && model !== 'gpt-image-1' && attempt === 0) { console.log(`model ${model} unavailable, falling back to gpt-image-1`); model = 'gpt-image-1'; return gen(it, 1); }
    if (r.status === 429 && attempt < 4) { await new Promise(res => setTimeout(res, 8000 * (attempt + 1))); return gen(it, attempt + 1); }
    console.log('FAIL', it.file, r.status, msg); return; }
  const j = await r.json(); const b64 = j.data?.[0]?.b64_json; if (!b64) { console.log('FAIL no image', it.file); return; }
  fs.writeFileSync(file, Buffer.from(b64, 'base64')); console.log('ok', it.file, j.usage ? `tokens=${j.usage.total_tokens}` : '');
}
fs.mkdirSync(OUT, { recursive: true });
const CONC = +(process.env.CONC || 3); let i = 0;
await Promise.all(Array.from({ length: CONC }, async () => { while (i < items.length) { const it = items[i++]; try { await gen(it); } catch (e) { console.log('ERR', it.file, String(e).replace(KEY, '***').slice(0, 200)); } } }));
console.log('done', items.length);
