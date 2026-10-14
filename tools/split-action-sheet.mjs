// split a 4-column action sheet into a walk sheet (3 cols) and an attack sheet (1 col), pixels untouched; per-row split x
import sharp from 'sharp';
const [src, walkOut, atkOut, ...splits] = process.argv.slice(2); const S = splits.map(Number);
const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); const W = info.width, H = info.height, RH = H / 4;
const maxS = Math.max(...S), minS = Math.min(...S); const ww = maxS, aw = W - minS;
const walk = Buffer.alloc(ww * H * 4), atk = Buffer.alloc(aw * H * 4);
for (let y = 0; y < H; y++) { const s = S[Math.min(3, Math.floor(y / RH))]; for (let x = 0; x < W; x++) { const j = (y * W + x) * 4; if (x < s) data.copy(walk, (y * ww + x) * 4, j, j + 4); else data.copy(atk, (y * aw + x - minS) * 4, j, j + 4); } }
await sharp(walk, { raw: { width: ww, height: H, channels: 4 } }).png().toFile(walkOut); await sharp(atk, { raw: { width: aw, height: H, channels: 4 } }).png().toFile(atkOut); console.log('ok', ww, aw);
