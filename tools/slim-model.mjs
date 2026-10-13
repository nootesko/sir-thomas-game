// Uso: node tools/slim-model.mjs entrada.glb saida.glb [proporção=0.2] [textura=512]   (ERR=0.02 controla o erro aceito)
// Deixa um modelo gerado leve para o celular: solda vértices, simplifica (meshoptimizer) e reduz a textura (JPEG).
// slim.mjs <in.glb> <out.glb> <ratio> <texSize>: weld + simplify (meshoptimizer) + resize textures, for phones
import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { weld, simplify, textureCompress, prune, dedup } from '@gltf-transform/functions'; import { MeshoptSimplifier } from 'meshoptimizer'; import sharp from 'sharp';
const [i, o, ratio = '0.2', tex = '512'] = process.argv.slice(2); const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const d = await io.read(i);
const tris = () => d.getRoot().listMeshes().flatMap(m => m.listPrimitives()).reduce((a, p) => a + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0);
console.log('before tris', tris(), 'textures', d.getRoot().listTextures().map(t => t.getSize()?.join('x')).join(','));
await d.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: +ratio, error: +(process.env.ERR || 0.02) }), textureCompress({ encoder: sharp, resize: [+tex, +tex], targetFormat: 'jpeg' }), prune(), dedup());
console.log('after tris', tris()); await io.write(o, d);
