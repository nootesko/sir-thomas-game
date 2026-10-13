// Uso: npm i @gradio/client@1 (numa pasta de ferramentas) e: node tools/img-to-3d.mjs saida.glb frente.png [lado.png costas.png]
// Gera um modelo 3D com textura a partir da arte (TRELLIS, licença MIT, no Hugging Face). Sem login, a cota grátis é
// de ~1 geração por dia; com um token do Hugging Face (variável HF_TOKEN) a cota aumenta. Depois: tools/slim-model.mjs.
// trellis.mjs <out.glb> <img> [more views...]: image(s) -> textured GLB via the TRELLIS Hugging Face space (MIT)
import { Client, handle_file } from '@gradio/client'; import fs from 'node:fs';
const [out, ...imgs] = process.argv.slice(2); const c = await Client.connect('trellis-community/TRELLIS', process.env.HF_TOKEN ? { hf_token: process.env.HF_TOKEN } : {});
await c.predict('/start_session', {});
const multi = imgs.length > 1; let image = null, multiimages = [];
if (multi) { const r = await c.predict('/preprocess_images', { images: imgs.map(p => ({ image: handle_file(new Blob([fs.readFileSync(p)], { type: 'image/png' })), caption: null })) }); multiimages = r.data[0]; console.log('preprocessed', multiimages.length); }
else { const r = await c.predict('/preprocess_image', { image: handle_file(new Blob([fs.readFileSync(imgs[0])], { type: 'image/png' })) }); image = r.data[0]; console.log('preprocessed', image?.url?.slice(0, 80)); }
const t = Date.now();
const r = await c.predict('/generate_and_extract_glb', [image, multiimages, multi, 0, 7.5, 12, 3, 12, 'stochastic', 0.95, 1024]);
console.log('done in', ((Date.now() - t) / 1000).toFixed(0), 's');
const file = r.data[2] || r.data[1]; const url = file.url || file.path; console.log('glb', url);
const res = await fetch(url); fs.writeFileSync(out, Buffer.from(await res.arrayBuffer())); console.log('saved', out, fs.statSync(out).size);
process.exit(0);
