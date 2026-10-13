// Model gallery (viewer.html): every model the game uses, shown exactly as the game builds it (same Actor, tint, parts,
// owlbear head), orbitable, with its animations; the user writes a correction note per model, saved to
// docs/notas-modelos.json through the dev server (tools/serve.py) and also kept in this browser.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Models, Actor, applyLook, makeProp, CLIP_SOURCE, CHAR_MODELS, VILLAGER_MODELS, CHILD_MODEL, MONSTER_MODELS, PROP_MODELS, FIXTURE_MODELS } from './models.js';
import { MONSTERS } from './monsters.js';

const $ = id => document.getElementById(id);
const CHAR_NAMES = { thomas: 'Sir Thomas', maite: 'Princesa Eleonora', pipo: 'Pipo', guarda: 'Guarda', capitao: 'Capitão Cassios', castelo_g: 'Guarda do Castelo', g2: 'Guarda (corrida)', ferreiro: 'Ferreiro Lucas', cozinheira: 'Dona Rosa', mercador: 'Mercador', rei: 'Rei', taverneira: 'Helena (taverna)', padre: 'Padre Anselmo', barqueiro: 'Barqueiro Tobias', erveira: 'Erveira Lúcia', pescadora: 'Pescadora', andarilha: 'Andarilha Inês', anciao: 'Ancião Bruma (urso-coruja)', urso_pinho: 'Urso-Coruja Pinho', urso: 'Urso-Coruja', filhote: 'Pluma (filhote)', rei_urso: 'Rei Ulmo (ursos-corujas)', bibliotecaria: 'Pena-Velha (bibliotecária)', guilda: 'Mestra Brígida (Guilda)', coruja: 'Sábia Coruja', rei_passaro: 'Rei Pássaro' };
// ---- catalogue ----
const E = [];
for (const [id, cfg] of Object.entries(CHAR_MODELS)) E.push({ key: 'char:' + id, group: 'Personagens', name: CHAR_NAMES[id] || id, cfg, h: cfg.h });
VILLAGER_MODELS.forEach((cfg, i) => E.push({ key: 'villager:' + i, group: 'Moradores', name: `Morador ${i + 1}`, cfg, h: cfg.h }));
E.push({ key: 'child', group: 'Moradores', name: 'Criança', cfg: CHILD_MODEL, h: CHILD_MODEL.h });
for (const [id, cfg] of Object.entries(MONSTER_MODELS)) E.push({ key: 'mon:' + id, group: 'Monstros', name: MONSTERS[id]?.name || id, cfg, h: MONSTERS[id]?.h || 1.5 });
for (const [id, cfg] of Object.entries(PROP_MODELS)) if (cfg) E.push({ key: 'prop:' + id, group: 'Cenário', name: id, cfg, h: 2, prop: true });
// models generated from the user's art (assets3d/gen, image-to-3D), static until rigged
E.push({ key: 'gen:thomas_rig', group: 'Gerados por IA', name: 'Sir Thomas (IA, animado)', cfg: { ...CHAR_MODELS.thomas, skin: 'gen/thomas_trellis', skinYaw: 0 }, h: 1.8 });
for (const [m, name] of [['gen/thomas_trellis', 'Sir Thomas (gerado por IA, celular)'], ['gen/thomas_trellis_full', 'Sir Thomas (gerado por IA, original)']]) E.push({ key: 'gen:' + m, group: 'Gerados por IA', name, cfg: { model: m }, h: 1.8, prop: true });
for (const m of FIXTURE_MODELS) E.push({ key: 'fix:' + m, group: 'Objetos', name: m.split('/').pop(), cfg: { model: m }, h: 1.6, prop: true });

// ---- notes: docs/notas-modelos.json (server) + localStorage fallback ----
let notes = {}; try { notes = JSON.parse(localStorage.getItem('galeria-notas') || '{}'); } catch (e) {}
fetch('docs/notas-modelos.json', { cache: 'no-store' }).then(r => r.ok ? r.json() : {}).then(j => { notes = { ...j, ...notes }; renderList(); renderNotes(); }).catch(() => {});
async function saveNotes() {
  try { localStorage.setItem('galeria-notas', JSON.stringify(notes)); } catch (e) {}
  try { const r = await fetch('api/notas-modelos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notes) }); return r.ok; } catch (e) { return false; }
}

// ---- scene ----
const cv = $('cv'), renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x6fa8d8); scene.fog = new THREE.Fog(0x6fa8d8, 30, 80);
const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 200); camera.position.set(3, 2.5, 5);
const controls = new OrbitControls(camera, cv); controls.enableDamping = true; controls.target.set(0, 1, 0);
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a7a3a, 1.6)); const sun = new THREE.DirectionalLight(0xfff0d0, 2.2); sun.position.set(6, 10, 7); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6 }); scene.add(sun);
const ground = new THREE.Mesh(new THREE.CircleGeometry(12, 48), new THREE.MeshLambertMaterial({ color: 0x7cba5a })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(12, 12, 0x3a6a2a, 0x5a8a3a); grid.position.y = 0.01; scene.add(grid);
let cur = null, ref = null, sel = null, spin = false, gameCam = false; const clock = new THREE.Clock();

function build(entry) {
  const { cfg } = entry, g = Models.get(cfg.model); if (!g) return null;
  const animated = !entry.prop && (g.animations?.length || g.scene.getObjectByProperty('isSkinnedMesh', true) || cfg.model.startsWith('char_') || cfg.model.startsWith('mon_') || cfg.model.startsWith('npc_'));
  if (animated) { const a = new Actor(cfg.model, { height: entry.h, forward: cfg.forward || 0, width: cfg.w }); applyLook(a, cfg); a.play('idle'); a.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); return { root: a.root, actor: a }; }
  const root = makeProp(cfg.model, entry.h); const t = cfg.tint != null ? new THREE.Color(cfg.tint) : null;
  root.traverse(o => { if (!o.isMesh) return; o.castShadow = true; o.material = o.material.clone(); o.material.userData.orig = o.material.color.getHex(); o.material.userData.base = o.material.userData.orig; if (t) { o.material.color.multiply(t); o.material.userData.base = o.material.color.getHex(); } });
  return { root, actor: null };
}
function materialsOf(obj) { const out = []; obj.root.traverse(o => { if (o.isMesh && !o.material.vertexColors) out.push(o.material); }); return out; }
async function show(entry) {
  sel = entry; renderList(); $('title').textContent = entry.name; $('note').value = notes[entry.key]?.text || ''; $('saved').textContent = '';
  await Models.load(entry.cfg.model); if (CLIP_SOURCE[entry.cfg.model]) await Models.load(CLIP_SOURCE[entry.cfg.model]); if (entry.cfg.skin) await Models.load(entry.cfg.skin); for (const h of Object.values(entry.cfg.hold || {})) { const n = Array.isArray(h) ? h[0] : h; if (n && n.includes('/')) await Models.load(n); } if (cur) scene.remove(cur.root); cur = build(entry);
  if (!cur) { $('info').innerHTML = `<b>Arquivo</b><span>${entry.cfg.model}.glb — não encontrado</span>`; return; }
  scene.add(cur.root); placeRef();
  const hgt = Math.max(entry.h, 0.3);   // frame by the game height (skinned bounds are unreliable)
  if (!gameCam) { controls.target.set(0, hgt * 0.5, 0); camera.position.set(hgt * 1.4, hgt * 1.0, hgt * 2.4); }
  let tris = 0, meshes = 0; cur.root.traverse(o => { if (o.isMesh && o.visible) { meshes++; const gg = o.geometry; tris += (gg.index ? gg.index.count : gg.attributes.position.count) / 3; } });
  const a = cur.actor, sel2 = $('anim'); sel2.innerHTML = ''; if (a) { const clips = a.clips.map(c => c.name); for (const n of clips) { const op = document.createElement('option'); op.value = n; op.textContent = n.replace(/^.*\|/, ''); sel2.appendChild(op); } const idle = a.actions.idle?.getClip().name; if (idle) sel2.value = idle; } sel2.style.display = a && a.clips.length ? '' : 'none';
  const c = entry.cfg; $('info').innerHTML = [['Arquivo', c.model + '.glb'], ['Altura no jogo', entry.h + ' m'], ['Tinta', c.tint != null ? '#' + c.tint.toString(16).padStart(6, '0') : '—'], ['Largura', c.w ? '×' + c.w : '—'], ['Peças visíveis', meshes], ['Triângulos', Math.round(tris).toLocaleString('pt-BR')], ['Animações', a ? a.clips.length : 0], ['Urso-coruja', c.owl ? 'cabeça feita em código' : '—']].map(([k, v]) => `<b>${k}</b><span>${v}</span>`).join('');
  $('tint').value = '#' + (c.tint ?? 0xffffff).toString(16).padStart(6, '0');
}
// Thomas beside the model, for scale
async function placeRef() {
  if (ref) { scene.remove(ref.root); ref = null; } if (!$('cmp').classList.contains('on') || !sel || sel.key === 'char:thomas') return;
  await Models.load('char_knight'); if (!cur) return; ref = build({ cfg: CHAR_MODELS.thomas, h: CHAR_MODELS.thomas.h }); if (!ref) return; ref.root.position.x = Math.max(0.9, (sel.h || 1) * 0.55) + 0.5; scene.add(ref.root);
}

// ---- UI ----
function renderList() {
  const q = $('q').value.trim().toLowerCase(), box = $('items'); box.innerHTML = ''; let group = null;
  for (const e of E) { if (q && !(e.name + ' ' + e.cfg.model + ' ' + e.key).toLowerCase().includes(q)) continue;
    if (e.group !== group) { group = e.group; const h = document.createElement('h2'); h.textContent = group.toUpperCase(); box.appendChild(h); }
    const d = document.createElement('div'); d.className = 'it' + (sel === e ? ' on' : ''); d.innerHTML = `<span>${e.name}<br><small>${e.cfg.model}</small></span>${notes[e.key]?.text ? '<i class="dot" title="tem nota"></i>' : ''}`; d.onclick = () => show(e); box.appendChild(d); }
}
function renderNotes() { const ks = Object.keys(notes).filter(k => notes[k]?.text); $('allNotes').innerHTML = ks.length ? ks.map(k => `<p><b style="color:var(--ink)">${notes[k].name || k}</b>: ${notes[k].text.replace(/</g, '&lt;')}</p>`).join('') : 'Nenhuma nota ainda.'; }
$('q').oninput = renderList;
$('anim').onchange = () => { const a = cur?.actor; if (!a) return; const clip = a.clips.find(c => c.name === $('anim').value); if (!clip) return; a.mixer.stopAllAction(); const act = a.mixer.clipAction(clip); act.reset().setLoop(THREE.LoopRepeat, Infinity).play(); a.current = act; };
$('spin').onclick = () => { spin = !spin; $('spin').classList.toggle('on', spin); $('spin').style.background = spin ? '#d6a21e' : ''; };
$('cmp').onclick = () => { $('cmp').classList.toggle('on'); $('cmp').style.background = $('cmp').classList.contains('on') ? '#d6a21e' : ''; placeRef(); };
$('cam').onclick = () => { gameCam = !gameCam; $('cam').style.background = gameCam ? '#d6a21e' : ''; if (gameCam) { const d = 17; controls.target.set(0, 0.9, 0); camera.position.set(0, Math.sin(0.9) * d, Math.cos(0.9) * d); } else if (sel) show(sel); };
$('tint').oninput = () => { if (!cur) return; const t = new THREE.Color($('tint').value); for (const m of materialsOf(cur)) { m.color.setHex(m.userData.orig ?? 0xffffff).multiply(t); m.userData.base = m.color.getHex(); } };
$('tintReset').onclick = () => { if (sel) show(sel); };
$('saveNote').onclick = async () => { if (!sel) return; const text = $('note').value.trim(); const tint = $('tint').value; if (text) notes[sel.key] = { name: sel.name, model: sel.cfg.model, text, tint, at: new Date().toISOString() }; else delete notes[sel.key]; const ok = await saveNotes(); $('saved').textContent = ok ? 'Salvo em docs/notas-modelos.json' : 'Salvo só neste navegador (servidor sem suporte a notas)'; renderList(); renderNotes(); };

function resize() { const r = cv.parentElement.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
renderer.setAnimationLoop(() => { const dt = Math.min(0.05, clock.getDelta()); if (cur?.actor) cur.actor.update(dt); if (ref?.actor) ref.actor.update(dt); if (spin && cur) cur.root.rotation.y += dt * 0.8; controls.update(); renderer.render(scene, camera); });
renderList(); renderNotes(); const start = new URLSearchParams(location.search).get('m'); show(E.find(e => e.key === start) || E.find(e => e.key === 'char:rei_urso') || E[0]);
window.viewer = { show: k => show(E.find(e => e.key === k)), E };
