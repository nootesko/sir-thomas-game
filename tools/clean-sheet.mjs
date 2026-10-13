// Cleans a generated sprite sheet: drops the faint coloured fringe (low alpha), removes stray specks (small islands of
// pixels) and keeps a soft one-pixel edge. Usage: node tools/clean-sheet.mjs in.png out.png   (needs sharp)
import sharp from 'sharp';
const [inp, out] = process.argv.slice(2);
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width, H = info.height;
const solid = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) solid[i] = data[i * 4 + 3] >= 150 ? 1 : 0;
// connected islands; anything smaller than MIN pixels is noise
const MIN = 400, lab = new Int32Array(W * H).fill(-1), keep = []; let n = 0; const st = [];
for (let p = 0; p < W * H; p++) { if (!solid[p] || lab[p] >= 0) continue; let size = 0; st.push(p); lab[p] = n; const pix = [];
  while (st.length) { const q = st.pop(); size++; pix.push(q); const x = q % W, y = (q / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const r = ny * W + nx; if (solid[r] && lab[r] < 0) { lab[r] = n; st.push(r); } } }
  keep[n] = size >= MIN; n++; }
const outBuf = Buffer.from(data);
for (let p = 0; p < W * H; p++) { const k = lab[p] >= 0 && keep[lab[p]]; if (k) { outBuf[p * 4 + 3] = 255; continue; }
  // soft edge: a faint pixel touching a kept island keeps half alpha; everything else goes
  const x = p % W, y = (p / W) | 0; let near = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const r = ny * W + nx; if (lab[r] >= 0 && keep[lab[r]]) near = true; }
  outBuf[p * 4 + 3] = near && data[p * 4 + 3] > 60 ? 128 : 0; }
await sharp(outBuf, { raw: { width: W, height: H, channels: 4 } }).png().toFile(out);
console.log('islands', n, 'kept', keep.filter(Boolean).length);
