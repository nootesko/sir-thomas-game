// Usage: npm i @gltf-transform/core@4 @gltf-transform/functions@4 @gltf-transform/extensions@4 meshoptimizer sharp
//        node tools/optimize-models.mjs <originals dir> <output dir>   (then copy the smaller of each file into assets3d/;
//        Kenney kit folders keep their originals because they share Textures/colormap.png)
// Shrinks the game's glTF models: keeps only the animation clips the game plays (one per role, same rules as
// src/models.js), drops clips from models that borrow them from a rig twin, resizes big textures and compresses
// geometry with meshopt (decoded in the browser by three's MeshoptDecoder).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, textureCompress, meshopt, weld, quantize } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'node:fs'; import path from 'node:path';
const ROLES = {
  idle: [/^(.*\|)?Idle$/i, /Idle_Neutral$/i, /Flying_Idle$/i, /Unarmed_Idle$/i, /_Idle$/i, /Idle/i],
  walk: [/Walking_A$/i, /(^|\|)Walk$/i, /_Walk$/i, /Walk/i, /(^|\|)Flying$/i, /_Flying$/i, /Fly/i],
  run: [/Running_A$/i, /(^|\|)Run$/i, /_Run$/i, /Gallop$/i, /Fast_Flying$/i, /Run/i],
  attack: [/1H_Melee_Attack_Slice_Diagonal$/i, /1H_Melee_Attack_Chop$/i, /(^|\|)Attack$/i, /_Attack$/i, /Bite_Front$/i, /Headbutt$/i, /Punch_Left$/i, /Punch/i, /Attack/i, /Kick/i],
  attack2: [/1H_Melee_Attack_Slice_Horizontal$/i, /1H_Melee_Attack_Stab$/i, /Attack2$/i, /Punch_Right$/i, /Bite/i],
  hit: [/^Hit_A$/i, /HitRecieve$/i, /HitReact$/i, /Idle_HitReact_Left$/i, /_Hit$/i, /Hit/i],
  death: [/^Death_A$/i, /(^|\|)Death$/i, /_Death$/i, /Death/i],
  block: [/^Blocking$/i, /^Block$/i], dodge: [/^Dodge_Forward$/i, /Roll$/i], sleep: [/^Lie_Idle$/i, /Lie/i], sit: [/^Sit_Chair_Idle$/i, /Sit/i],
  cheer: [/^Cheer$/i, /Wave$/i, /Yes$/i], interact: [/^Interact$/i, /PickUp$/i, /Use_Item$/i],
  cast: [/Spellcast_Shoot$/i, /Spellcast_Raise$/i], jump: [/^Jump_Full_Short$/i, /Jump$/i],
};
const BORROW = new Set(['char_mage', 'char_barbarian', 'char_rogue', 'char_rogue_hooded', 'char_king']);   // clips come from char_knight / char_farmer
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready;
const [src, dst] = process.argv.slice(2); let before = 0, after = 0;
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else if (f.endsWith('.glb')) files.push(p); } })(src);
for (const f of files) {
  const rel = path.relative(src, f), name = rel.replace(/\.glb$/, ''); const doc = await io.read(f); const root = doc.getRoot(); before += fs.statSync(f).size;
  const anims = root.listAnimations(); const keep = new Set();
  if (!BORROW.has(name)) for (const pats of Object.values(ROLES)) { for (const re of pats) { const a = anims.find(a => re.test(a.getName())); if (a) { keep.add(a); break; } } }
  for (const a of anims) if (!keep.has(a)) { for (const s of a.listSamplers()) { const i = s.getInput(), o = s.getOutput(); s.dispose(); if (i && !i.listParents().some(p => p.propertyType !== "Root")) i.dispose(); if (o && !o.listParents().some(p => p.propertyType !== "Root")) o.dispose(); } for (const c of a.listChannels()) c.dispose(); a.dispose(); }
  const skinned = root.listSkins().length > 0;   // quantizing skinned meshes breaks their scale in three.js: only meshopt for those
  await doc.transform(resample(), dedup(), prune({ keepAttributes: false }), textureCompress({ encoder: sharp, resize: [512, 512] }), weld(), ...(skinned ? [] : [quantize(), meshopt({ encoder: MeshoptEncoder, level: "medium" })]));
  const out = path.join(dst, rel); fs.mkdirSync(path.dirname(out), { recursive: true }); await io.write(out, doc); after += fs.statSync(out).size;
  console.log(rel.padEnd(36), anims.length, '->', keep.size, 'clips', Math.round(fs.statSync(f).size / 1024) + 'KB ->', Math.round(fs.statSync(out).size / 1024) + 'KB');
}
console.log('TOTAL', Math.round(before / 1024) + 'KB ->', Math.round(after / 1024) + 'KB');
