// Interface over the 3D view (Shop Titans style, phone first): hero badge, menu buttons, quick slots, dialogs,
// loot cards, the hero panel (equipment, attributes, bag with item details), shops, options menu and the bars over heads.
import * as THREE from 'three';
import { ITEMS, SLOTS, SLOT_NAMES, SHOPS, sellPrice } from './items.js';
import { iconFor } from './icons.js';
import { Models, Actor, applyLook, CHAR_MODELS, thomasLook } from './models.js';
import { PERF } from './perf.js';
import { VIEW } from './view.js';
import { icon, applyIcons } from './uiicons.js';
const $ = id => document.getElementById(id);
const RARITY = { comum: 'Comum', raro: 'Raro', epico: 'Épico', lendario: 'Lendário' };
const STAT = { dano: [icon('sword', 16), 'Dano'], defesa: [icon('shield', 16), 'Defesa'], frio: [icon('snow', 16), 'Frio', '%'], vida: [icon('heart', 16), 'Vida'] };
const ATTR = { ataque: 'Ataque', velocidade: 'Velocidade de ataque', defesa: 'Defesa', folego: 'Fôlego (estamina)' };
const POTIONS = ['pocao_g', 'pocao_p'], FOODS = ['sopa', 'carne', 'mel', 'pao', 'queijo'];
export class HUD {
  constructor(game) {
    this.game = game; this.dialogResolve = null; this.loreResolve = null; this.cardResolve = null; this.toastT = null; this.floats = []; this.panel = null; this.shopId = null; this.tab = 'hero'; this.sel = null;
    this.e = {}; ['objective', 'objective-text', 'objective-dist', 'region', 'hint', 'toast', 'dialog', 'dialog-name', 'dialog-text', 'lore', 'lore-title', 'lore-text', 'card-wrap', 'card-rarity', 'card-name', 'card-icon', 'card-stats', 'chapter', 'bigtitle', 'fade', 'cold-pill', 'cold-fill', 'equip', 'fps'].forEach(id => this.e[id] = $(id));
    // dialogs advance on any press (mouse, touch, pen); option buttons stop the event themselves
    document.addEventListener('pointerdown', e => { if (e.button === 0 && this.dialogResolve && !this.choiceResolve) this.advanceDialog(); else if (this.loreResolve && e.target.closest('#lore')) this.closeLore(); });
    $('card-equip').onclick = () => this.closeCard('equip'); $('card-discard').onclick = () => this.closeCard('discard');
    $('btn-inv').onclick = () => this.togglePanel('inv'); $('btn-attr').onclick = () => this.togglePanel('attr'); $('hero-badge').onclick = () => this.togglePanel('attr');
    $('btn-quests').onclick = () => this.togglePanel('quests'); $('btn-map').onclick = () => game.toggleMap(); $('btn-menu').onclick = () => this.togglePanel('menu');
    for (const id of ['panel-close', 'shop-close', 'quests-close', 'menu-close']) $(id).onclick = () => this.closePanel();
    document.querySelectorAll('#panel-ui .tab').forEach(t => t.onclick = () => { this.tab = t.dataset.tab; this.refreshPanels(); });
    document.querySelectorAll('#shop-ui .tab').forEach(t => t.onclick = () => { this.shopTab = t.dataset.shop; this.refreshPanels(); });
    $('hint').addEventListener('pointerdown', e => { e.stopPropagation(); game.input.pressed.KeyE = true; });
    $('q1').onclick = () => this.quickUse(0); $('q2').onclick = () => this.quickUse(1);
    applyIcons(); this.buildMenu(); this.buildEquip();
  }
  // ---------- top bar ----------
  objective(text) { this.e['objective-text'].textContent = text; this.e.objective.classList.toggle('empty', !text); }
  distance(d) { const v = d == null ? '' : `${d}`; if (this._dist !== v) { this._dist = v; this.e['objective-dist'].textContent = v; } }
  region(name) { if (this.e.region.textContent !== name) this.e.region.textContent = name; }
  bars(p, winter) { const c = winter ? 'flex' : 'none'; if (this._cold !== c) { this._cold = c; this.e['cold-pill'].style.display = c; } if (winter) this.e['cold-fill'].style.width = `${Math.round(p.cold * 100)}%`; }
  hint(html) { if (html === this._hint) return; this._hint = html; this.e.hint.style.display = html ? 'block' : 'none'; if (html) this.e.hint.innerHTML = this.game.input.touch ? html.replace('<b>E</b>', icon('hand', 20)) : html; }
  toast(text, ms = 2200) { this.e.toast.textContent = text; this.e.toast.style.opacity = 1; clearTimeout(this.toastT); this.toastT = setTimeout(() => this.e.toast.style.opacity = 0, ms); }
  tired() { const now = performance.now(); if (now - (this._tiredT || 0) < 1500) return; this._tiredT = now; this.toast('Sem fôlego!', 900); }
  // ---------- dialogs ----------
  dialog(lines) { return new Promise(res => { this.lines = lines.slice(); this.dialogResolve = res; this.game.player.frozen = true; this.e.dialog.style.display = 'block'; this.showLine(); }); }
  showLine() { const [n, t] = this.lines.shift(); this.e['dialog-name'].textContent = n; this.e['dialog-name'].style.display = n ? '' : 'none'; this.e['dialog-text'].textContent = t; }
  advanceDialog() { if (!this.dialogResolve) return; if (this.lines.length) this.showLine(); else { this.e.dialog.style.display = 'none'; const r = this.dialogResolve; this.dialogResolve = null; this.game.player.frozen = false; this.game.input.pressed = {}; r(); } }
  // a line of dialogue followed by numbered options; resolves the chosen index (1-9 keys, click or tap)
  choose(name, text, options) {
    return new Promise(res => { this.choiceResolve = res; this.game.player.frozen = true; this.e.dialog.style.display = 'block'; this.e['dialog-name'].textContent = name; this.e['dialog-name'].style.display = name ? '' : 'none'; this.e['dialog-text'].textContent = text; $('dialog-hint').style.display = 'none';
      const box = $('dialog-choices'); box.innerHTML = ''; box.classList.add('show');
      options.forEach((o, i) => { const b = document.createElement('button'); b.className = 'choice'; b.innerHTML = `${i + 1}. ${o.label}${o.hint ? `<small>${o.hint}</small>` : ''}`; b.onpointerdown = e => e.stopPropagation(); b.onclick = e => { e.stopPropagation(); this.pick(i); }; box.appendChild(b); }); this.choiceN = options.length; });
  }
  pick(i) { if (!this.choiceResolve) return; const r = this.choiceResolve; this.choiceResolve = null; $('dialog-choices').classList.remove('show'); $('dialog-hint').style.display = ''; this.e.dialog.style.display = 'none'; this.game.player.frozen = false; this.game.input.pressed = {}; r(i); }
  lore(title, text) { return new Promise(res => { this.loreResolve = res; this.game.player.frozen = true; this.e['lore-title'].textContent = title; this.e['lore-text'].textContent = text; this.e.lore.style.display = 'block'; }); }
  closeLore() { if (!this.loreResolve) return; this.e.lore.style.display = 'none'; const r = this.loreResolve; this.loreResolve = null; this.game.player.frozen = false; r(); }
  // ---------- floating numbers and bars over heads ----------
  float(text, pos, cls = '') { if (this.floats.length > 24) { this.floats[0].el.remove(); this.floats.shift(); } const el = document.createElement('div'); el.className = 'dmg ' + cls; el.textContent = text; $('hud').appendChild(el); this.floats.push({ el, pos: pos.clone(), t: 0 }); }
  floaters(g) { const cam = g.camera, W = g.canvas.clientWidth, H = g.canvas.clientHeight, v = this._fv || (this._fv = new THREE.Vector3()); for (let i = this.floats.length - 1; i >= 0; i--) { const f = this.floats[i]; f.t += 0.016; if (f.t > 1) { f.el.remove(); this.floats.splice(i, 1); continue; } v.copy(f.pos).project(cam); f.el.style.left = ((v.x + 1) / 2 * W) + 'px'; f.el.style.top = ((1 - v.y) / 2 * H) + 'px'; } }
  headBar(cls) { const d = document.createElement('div'); d.className = 'hbar ' + cls; d.innerHTML = cls === 'me' ? '<i></i><b></b><u><s></s></u>' : '<i></i><b></b>'; $('hud').insertBefore(d, $('hint')); return { d, fill: d.firstChild, txt: d.children[1], st: d.querySelector('u s'), su: d.querySelector('u'), w: -1, t: '', s: -1 }; }
  worldBars(g) {
    const cam = g.camera, W = g.canvas.clientWidth, H = g.canvas.clientHeight, v = this._v || (this._v = new THREE.Vector3()); this.wb = this.wb || new Map();
    const place = (bar, x, y, z, frac, text) => { v.set(x, y, z).project(cam); const vis = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; if (bar.vis !== vis) { bar.vis = vis; bar.d.style.display = vis ? '' : 'none'; } if (!vis) return;
      bar.d.style.transform = `translate(${((v.x + 1) / 2 * W).toFixed(1)}px,${((1 - v.y) / 2 * H).toFixed(1)}px) translate(-50%,-100%)`; const w = Math.round(Math.max(0, Math.min(1, frac)) * 100); if (w !== bar.w) { bar.w = w; bar.fill.style.width = w + '%'; bar.d.classList.toggle('low', w < 30); } if (text !== bar.t) { bar.t = text; bar.txt.textContent = text; } };
    const p = g.player; this.pbar = this.pbar || this.headBar('me'); this.pbar.d.style.opacity = p.dead ? 0 : 1;
    place(this.pbar, p.pos.x, (p.h || 1.8) + 0.6, p.pos.z, p.hp / p.maxHp, `${Math.ceil(Math.max(0, p.hp))}/${p.maxHp}`);
    const s = Math.round(p.stamina / p.maxStamina * 100); if (s !== this.pbar.s) { this.pbar.s = s; this.pbar.st.style.width = s + '%'; } if (this.pbar.tired !== p.tired) { this.pbar.tired = p.tired; this.pbar.su.classList.toggle('tired', p.tired); }
    const seen = new Set();
    for (const e of g.entities) { const boss = e.kind === 'boss'; if (!(e.kind === 'monster' || boss) || !e.alive) continue; const max = boss ? e.maxHits : e.cfg.hp, hp = boss ? e.maxHits - e.hits : e.hp; if (!max || (hp >= max && !boss) || !g.lodNear(e.pos)) continue; if (boss && e.phase !== 'fight') continue;
      seen.add(e); let b = this.wb.get(e); if (!b) { b = this.headBar(boss || e.cfg.boss ? 'boss' : 'foe'); this.wb.set(e, b); } place(b, e.pos.x, boss ? e.pos.y + 3 : (e.h || 1) + 0.4 + (e.cfg.fly || 0), e.pos.z, hp / max, boss || e.cfg.boss ? e.name || 'Mordrak' : ''); }
    for (const [e, b] of this.wb) if (!seen.has(e)) { b.d.remove(); this.wb.delete(e); }
  }
  // ---------- loot card ----------
  card(item) {
    return new Promise(res => { this.cardResolve = res; this.game.player.frozen = true; const e = this.e; e['card-rarity'].textContent = RARITY[item.rarity] || item.rarity; e['card-rarity'].className = item.rarity; e['card-name'].textContent = title(item.name) + (item.lvl ? `  ·  Nv ${item.lvl}` : '');
      const x = e['card-icon'].getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 64, 64); x.drawImage(iconFor(item.icon), 8, 8, 48, 48);
      e['card-stats'].innerHTML = this.statLines(item) + (item.note ? `<br><i>${item.note}</i>` : '') + (item.slot ? `<br><small>Espaço: ${SLOT_NAMES[item.slot]}</small>` : '<br><small>Usar agora</small>');
      $('card-equip').textContent = item.consumable ? 'Usar' : 'Equipar'; $('card-discard').textContent = item.consumable || item.slot ? 'Guardar' : 'Descartar'; e['card-wrap'].className = 'show'; this.game.audio.pickup(); });
  }
  closeCard(choice) { if (!this.cardResolve) return; this.e['card-wrap'].className = ''; const r = this.cardResolve; this.cardResolve = null; this.game.player.frozen = false; r(choice); }
  // stat lines of an item, compared with what is equipped in the same slot (green better, red worse)
  statLines(it) {
    const eq = it.slot && this.game.equip[it.slot] && this.game.equip[it.slot] !== it.id ? ITEMS[this.game.equip[it.slot]] : null; const keys = new Set([...Object.keys(it.stats), ...Object.keys(eq?.stats || {})]);
    return [...keys].map(k => { const [ic, nm, suf = ''] = STAT[k] || ['', k]; const v = it.stats[k] || 0, d = eq ? v - (eq.stats[k] || 0) : 0; return `${ic} ${nm}<span class="${d < 0 ? 'down' : ''}">${v ? '+' + v + suf : '—'}${d ? ` (${d > 0 ? '+' : ''}${d})` : ''}</span>`; }).join('<br>');
  }
  chapter(small, big, ms = 4500) { this.e.chapter.innerHTML = `<small>${small}</small>${big}`; this.e.chapter.style.opacity = 1; setTimeout(() => this.e.chapter.style.opacity = 0, ms); }
  bigTitle(ms = 6000) { this.e.bigtitle.style.opacity = 1; setTimeout(() => this.e.bigtitle.style.opacity = 0, ms); }
  fade(to, sec = 1, color = '#000') { const f = this.e.fade; f.style.transition = `opacity ${sec}s`; f.style.background = color; f.style.opacity = to; return new Promise(r => setTimeout(r, sec * 1000)); }
  update() {
    const inp = this.game.input;
    if (inp.pressed.KeyE) { if (this.dialogResolve) this.advanceDialog(); else if (this.loreResolve) this.closeLore(); }
    if (this.choiceResolve) { for (let i = 1; i <= (this.choiceN || 0); i++) if (inp.pressed['Digit' + i] || inp.pressed['Numpad' + i]) this.pick(i - 1); }
    else if (!this.busy && !this.game.player.frozen) { if (inp.pressed.Digit1) this.quickUse(0); if (inp.pressed.Digit2) this.quickUse(1); }
    if (this.cardResolve) { if (inp.pressed.ArrowRight || inp.pressed.Digit1 || inp.pressed.KeyE) this.closeCard('equip'); else if (inp.pressed.ArrowLeft || inp.pressed.Digit2) this.closeCard('discard'); }
    const sk = this._sk || (this._sk = document.getElementById('act-skill')); const cool = this.game.player.skillCool > 0; if (sk && this._skc !== cool) { this._skc = cool; sk.classList.toggle('cool', cool); }
    if (PERF.showFps) { const f = this.game.governor; this.e.fps.textContent = `${f.fps} fps · escala ${PERF.scale.toFixed(2)} · ${this.game.renderer.info.render.calls} chamadas`; }
  }
  get busy() { return !!(this.dialogResolve || this.loreResolve || this.cardResolve || this.panel || this.choiceResolve || this.game.lockpick?.active); }
  // ---------- quick slots: best potion and best food in the bag ----------
  quickIds() { const inv = this.game.player.inventory; return [POTIONS.find(id => inv[id]) || null, FOODS.find(id => inv[id]) || null]; }
  quickUse(i) { const id = this.quickIds()[i]; if (!id) { this.toast(i ? 'Sem comida na bolsa' : 'Sem poções na bolsa', 1200); return; } this.game.useItem(id); }
  refreshQuick() { const ids = this.quickIds(), inv = this.game.player.inventory; ['q1', 'q2'].forEach((q, i) => { const b = $(q), id = ids[i] || (i ? 'pao' : 'pocao_p'); const x = b.querySelector('canvas').getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 16, 16); x.drawImage(iconFor(ITEMS[id].icon), 0, 0, 16, 16); b.querySelector('b').textContent = ids[i] ? inv[id] : ''; b.classList.toggle('empty', !ids[i]); b.title = ids[i] ? title(ITEMS[id].name) : (i ? 'Comida' : 'Poção'); }); }
  // ---------- panels ----------
  togglePanel(which) { const same = this.panel === which || ((this.panel === 'inv' || this.panel === 'attr') && (which === 'inv' || which === 'attr') && ((which === 'inv') === (this.tab === 'bag'))); if (same) return this.closePanel(); if (this.dialogResolve || this.loreResolve || this.cardResolve) return; this.openPanel(which); }
  openPanel(which) {
    if (this.panel) this.closePanel(false); this.panel = which; this.game.player.frozen = true;
    if (which === 'inv') this.tab = 'bag'; if (which === 'attr') this.tab = 'hero';
    $('panel-ui').classList.toggle('show', which === 'inv' || which === 'attr'); $('shop-ui').classList.toggle('show', which === 'shop'); $('quests').classList.toggle('show', which === 'quests'); $('menu-ui').classList.toggle('show', which === 'menu');
    if (which === 'quests') { this.game.quests.refresh(); return; } if (which === 'menu') { this.refreshMenu(); return; } if (which === 'shop') this.shopTab = 'buy';
    this.sel = null; this.refreshPanels(); if (which === 'attr' || which === 'inv') this.renderHero();
  }
  closePanel(unfreeze = true) { if (!this.panel) return; this.panel = null; this.shopId = null; if (unfreeze) this.game.player.frozen = false; ['panel-ui', 'shop-ui', 'quests', 'menu-ui'].forEach(id => $(id).classList.remove('show')); this.game.input.pressed = {}; }
  shop(id) { this.shopId = id; this.openPanel('shop'); $('shop-title').textContent = SHOPS[id].title; this.refreshPanels(); }
  iconCanvas(name) { const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(iconFor(name), 0, 0, 16, 16); return c; }
  buildEquip() {
    this.slots = {}; const box = this.e.equip;
    for (const s of SLOTS) { const d = document.createElement('div'); d.className = 'slot empty'; const c = document.createElement('canvas'); c.width = c.height = 16; d.appendChild(c); const n = document.createElement('div'); n.className = 'nm'; n.textContent = SLOT_NAMES[s]; d.appendChild(n); const l = document.createElement('div'); l.className = 'lvl'; d.appendChild(l);
      d.onclick = () => { const id = this.game.equip[s]; if (!id) { this.tab = 'bag'; this.filterSlot = s; this.refreshPanels(); return; } this.sel = { id, slot: s }; this.tab = 'bag'; this.refreshPanels(); }; box.appendChild(d); this.slots[s] = { d, c, n, l }; }
  }
  refreshEquip(equip) {
    for (const s of SLOTS) { const sl = this.slots[s], it = equip[s] ? ITEMS[equip[s]] : null; const x = sl.c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 16, 16); x.drawImage(iconFor(it ? it.icon : s === 'espada' ? 'espada' : s), 0, 0, 16, 16);
      sl.d.className = 'slot ' + (it ? it.rarity : 'empty'); sl.l.textContent = it ? it.lvl : ''; sl.l.style.display = it ? '' : 'none'; sl.d.title = it ? title(it.name) : SLOT_NAMES[s]; }
    this.portraitDirty = true;
  }
  refreshPanels() {
    const g = this.game, p = g.player; if (!p) return;
    $('lvl-text').textContent = p.level; $('xp-fill').style.width = `${Math.min(100, p.xp / p.xpToNext() * 100)}%`; $('gold-text').textContent = p.gold;
    $('pts-dot').classList.toggle('on', p.points > 0); $('pts-dot').textContent = p.points || ''; const ab = $('attr-badge'); ab.classList.toggle('on', p.points > 0); ab.textContent = p.points || '';
    this.refreshQuick(); if (this.portraitDirty) this.renderPortrait();
    if (!this.panel) return;
    if (this.panel === 'shop') return this.refreshShop();
    if (this.panel !== 'inv' && this.panel !== 'attr') return;
    document.querySelectorAll('#panel-ui .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === this.tab)); $('pane-hero').classList.toggle('on', this.tab === 'hero'); $('pane-bag').classList.toggle('on', this.tab === 'bag'); $('pane-gods').classList.toggle('on', this.tab === 'gods'); $('panel-title').textContent = this.tab === 'hero' ? 'Sir Thomas' : this.tab === 'gods' ? 'Deuses' : 'Bolsa'; if (this.tab === 'gods') this.game.faith.renderPane($('pane-gods'));
    // hero: stats, attributes
    const st = (ic, k, v) => `<div class="stat"><span class="k">${ic} ${k}</span><b>${v}</b></div>`;
    $('hero-stats').innerHTML = st(icon('star', 18), 'Nível', `${p.level} <small>(${p.xp}/${p.xpToNext()} XP)</small>`) + st(icon('heart', 18), 'Vida', `${Math.ceil(p.hp)}/${p.maxHp}`) + st(icon('bolt', 18), 'Estamina', p.maxStamina) + st(icon('sword', 18), 'Dano', p.damage) + st(icon('crit', 18), 'Crítico', Math.round(p.critChance * 100) + '%') + st(icon('shield', 18), 'Defesa', p.defense) + st(icon('snow', 18), 'Frio', Math.round(p.coldResist * 100) + '%') + st(icon('skull', 18), 'Abates', p.stats.kills || 0);
    $('attr-points').textContent = p.points; const list = $('attr-list'); list.innerHTML = '';
    for (const k of Object.keys(ATTR)) { const r = document.createElement('div'); r.className = 'attr-row'; r.innerHTML = `<span>${ATTR[k]} <b>${p.attr[k] || 0}</b></span>`; const b = document.createElement('button'); b.textContent = '+'; b.disabled = p.points <= 0; b.onclick = () => { p.spendPoint(k); this.refreshPanels(); }; r.appendChild(b); list.appendChild(r); }
    // bag
    $('inv-gold').textContent = p.gold; const grid = $('inv-grid'); grid.innerHTML = '';
    let ids = Object.keys(p.inventory); if (this.filterSlot) { ids = ids.filter(id => ITEMS[id].slot === this.filterSlot); if (!ids.length) this.toast(`Nada para ${SLOT_NAMES[this.filterSlot]} na bolsa`, 1400); this.filterSlot = null; if (!ids.length) ids = Object.keys(p.inventory); }
    if (!ids.length) grid.innerHTML = '<div class="ui-note">Vazia. Derrote monstros fora da cidade ou compre nas lojas.</div>';
    const order = it => it.slot ? 0 : it.consumable ? 1 : 2; ids.sort((a, b) => order(ITEMS[a]) - order(ITEMS[b]) || (ITEMS[b].lvl || 0) - (ITEMS[a].lvl || 0));
    for (const id of ids) { const it = ITEMS[id]; const d = document.createElement('div'); d.className = 'inv-item ' + it.rarity + (this.sel && this.sel.id === id && !this.sel.slot ? ' sel' : ''); d.appendChild(this.iconCanvas(it.icon)); const q = document.createElement('span'); q.className = 'q'; q.textContent = p.inventory[id] > 1 ? p.inventory[id] : ''; d.appendChild(q);
      if (it.slot && this.better(it)) { const u = document.createElement('span'); u.className = 'up'; u.textContent = '▲'; d.appendChild(u); }
      d.title = title(it.name); d.onclick = () => { this.sel = { id }; this.refreshPanels(); }; grid.appendChild(d); }
    this.detail();
  }
  // is this item better than what is in its slot (sum of stats)
  better(it) { const eq = this.game.equip[it.slot] ? ITEMS[this.game.equip[it.slot]] : null; const sum = x => x ? Object.values(x.stats).reduce((a, b) => a + b, 0) : 0; return sum(it) > sum(eq); }
  detail() {
    const box = $('item-detail'), g = this.game, p = g.player, s = this.sel; if (!s || !ITEMS[s.id] || (!s.slot && !p.inventory[s.id])) { box.classList.remove('on'); return; }
    const it = ITEMS[s.id]; box.classList.add('on'); box.innerHTML = '';
    const hd = document.createElement('div'); hd.className = 'hd'; const cv = this.iconCanvas(it.icon); hd.appendChild(cv); const t = document.createElement('div'); t.innerHTML = `<div class="nm">${title(it.name)}</div><div class="rr">${RARITY[it.rarity] || ''}${it.lvl ? ' · Nível ' + it.lvl : ''}${it.slot ? ' · ' + SLOT_NAMES[it.slot] : ''}${s.slot ? ' · equipado' : ''}</div>`; hd.appendChild(t); box.appendChild(hd);
    const stl = document.createElement('div'); stl.className = 'st'; stl.innerHTML = (s.slot ? this.statLinesPlain(it) : this.statLines(it)).replace(/<span class="down">/g, '<span class="down">') + (it.note ? `<br><i>${it.note}</i>` : '') + (it.price ? `<br><small>Vende por ${sellPrice(it)} moedas</small>` : ''); box.appendChild(stl);
    const bt = document.createElement('div'); bt.className = 'bt'; const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn ' + cls; b.textContent = label; b.onclick = fn; bt.appendChild(b); };
    if (s.slot) { if (s.slot !== 'espada') btn('Guardar na bolsa', '', () => { g.unequip(s.slot); this.sel = null; this.refreshPanels(); }); }
    else if (it.consumable) btn('Usar', 'green', () => { g.useItem(s.id); if (!p.inventory[s.id]) this.sel = null; this.refreshPanels(); });
    else if (it.slot) btn('Equipar', 'green', () => { g.useItem(s.id); this.sel = { id: s.id, slot: it.slot }; this.refreshPanels(); this.renderHero(); });
    btn('Fechar', '', () => { this.sel = null; this.refreshPanels(); }); box.appendChild(bt);
  }
  statLinesPlain(it) { return Object.entries(it.stats).map(([k, v]) => { const [ic, nm, suf = ''] = STAT[k] || ['', k]; return `${ic} ${nm} <b>+${v}${suf}</b>`; }).join('<br>'); }
  refreshShop() {
    const g = this.game, p = g.player, shop = SHOPS[this.shopId]; if (!shop) return; $('shop-gold').textContent = p.gold; $('shop-ui').classList.toggle('sell', this.shopTab === 'sell');
    document.querySelectorAll('#shop-ui .tab').forEach(t => t.classList.toggle('on', t.dataset.shop === (this.shopTab || 'buy')));
    const row = (it, price, label, onclick, dis, cls = '') => { const d = document.createElement('div'); d.className = 'shop-row ' + cls; d.appendChild(this.iconCanvas(it.icon)); const n = document.createElement('span'); n.className = 'nm'; n.innerHTML = `<b>${title(it.name)}</b>${it.lvl > 1 ? ` <small>Nv ${it.lvl}</small>` : ''}<br><small>${Object.entries(it.stats).map(([k, v]) => `${(STAT[k] || [''])[0]} +${v}`).join(' ')}${it.note ? ' · ' + it.note : ''}</small>`; d.appendChild(n); const pr = document.createElement('span'); pr.className = 'pr'; pr.innerHTML = `<i class="coin"></i>${price}`; d.appendChild(pr); const b = document.createElement('button'); b.className = 'btn ' + (dis ? '' : 'green'); b.textContent = label; b.disabled = dis; b.onclick = onclick; d.appendChild(b); return d; };
    const buy = $('shop-buy'); buy.innerHTML = ''; for (const id of shop.items) { const it = ITEMS[id]; buy.appendChild(row(it, g.priceFor(it), 'Comprar', () => g.buy(id), p.gold < g.priceFor(it), it.slot && g.equip[it.slot] === id ? 'eq' : '')); }
    const sell = $('shop-sell'); sell.innerHTML = ''; const ids = Object.keys(p.inventory).filter(id => ITEMS[id].price); if (!ids.length) sell.innerHTML = '<div class="ui-note">Nada para vender.</div>';
    for (const id of ids) { const it = ITEMS[id]; sell.appendChild(row(it, sellPrice(it), `Vender${p.inventory[id] > 1 ? ' (' + p.inventory[id] + ')' : ''}`, () => g.sell(id), false)); }
  }
  // ---------- options menu ----------
  buildMenu() {
    const g = this.game; let muted = false, fps = false; try { muted = localStorage.getItem('fortaleza-mute') === '1'; fps = localStorage.getItem('fortaleza-fps') === '1'; } catch (e) {}
    this.muted = muted; PERF.showFps = fps; this.e.fps.style.display = fps ? 'block' : 'none';
    $('opt-sound').onclick = () => { this.muted = !this.muted; try { localStorage.setItem('fortaleza-mute', this.muted ? '1' : '0'); } catch (e) {} this.applySound(); this.refreshMenu(); };
    $('opt-fps').onclick = () => { PERF.showFps = !PERF.showFps; try { localStorage.setItem('fortaleza-fps', PERF.showFps ? '1' : '0'); } catch (e) {} this.e.fps.style.display = PERF.showFps ? 'block' : 'none'; this.refreshMenu(); };
    $('opt-quality').onclick = () => { const next = PERF.tier === 'high' ? 'low' : 'high'; try { localStorage.setItem('fortaleza-q', next); } catch (e) {} g.save(); location.reload(); };
    $('opt-zoom-in').onclick = () => { VIEW.dist = Math.max(VIEW.minDist, VIEW.dist - 2); }; $('opt-zoom-out').onclick = () => { VIEW.dist = Math.min(VIEW.maxDist, VIEW.dist + 2); };
    $('opt-new').onclick = () => { if (confirm('Apagar o jogo salvo e começar de novo?')) location.href = location.pathname + '?novo'; };
  }
  applySound() { const a = this.game.audio; if (a.master) a.master.gain.value = this.muted ? 0 : 0.5; }
  refreshMenu() { $('opt-sound').textContent = this.muted ? 'Desligado' : 'Ligado'; $('opt-fps').textContent = PERF.showFps ? 'Sim' : 'Não'; $('opt-quality').textContent = PERF.tier === 'high' ? 'Alta (PC)' : 'Leve (celular)'; }
  // ---------- portrait: Thomas rendered once into the badge and the hero panel ----------
  renderPortrait() {
    this.portraitDirty = false; const g = this.game, cm = CHAR_MODELS.thomas; if (!g.renderer || !Models.has(cm.model)) return;
    const a = new Actor(cm.model, { height: cm.h }); applyLook(a, thomasLook(g.equip, ITEMS)); a.play('idle'); a.update(0.4);
    const sc = new THREE.Scene(); sc.add(a.root); a.root.rotation.y = 0.35; sc.add(new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 2.2)); const sun = new THREE.DirectionalLight(0xfff0d0, 2.2); sun.position.set(2, 4, 5); sc.add(sun);
    const shot = (cv, w, h, camY, lookY, dist, fov) => { const rt = new THREE.WebGLRenderTarget(w, h, { colorSpace: THREE.SRGBColorSpace }); const cam = new THREE.PerspectiveCamera(fov, w / h, 0.1, 50); cam.position.set(0, camY, dist); cam.lookAt(0, lookY, 0);
      const r = g.renderer; const old = r.getRenderTarget(), oldBg = sc.background; r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam); const px = new Uint8Array(w * h * 4); r.readRenderTargetPixels(rt, 0, 0, w, h, px); r.setRenderTarget(old); r.setClearColor(0x000000, 1); rt.dispose();
      const x = cv.getContext('2d'), img = x.createImageData(w, h); for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4); x.clearRect(0, 0, w, h); x.putImageData(img, 0, 0); };
    a.root.updateMatrixWorld(true); const hb = a.model.getObjectByName('head'), hy = hb ? hb.getWorldPosition(new THREE.Vector3()).y + 0.22 : cm.h * 0.8;   // frame the face wherever the proportions put it
    try { shot($('portrait-cv'), 128, 128, hy + 0.05, hy, 1.5, 30); shot($('hero-cv'), 200, 260, cm.h * 0.6, cm.h * 0.5, 4.2, 30); } catch (e) { console.warn('retrato', e); }
    a.root.traverse(o => { if (o.isMesh) o.material.dispose(); });
  }
  renderHero() { this.renderPortrait(); }
}
// "ESPADA DE FERRO" -> "Espada de Ferro"
function title(s) { return (s || '').toLowerCase().replace(/(^|\s)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(De|Da|Do|Das|Dos|E)\b/g, w => w.toLowerCase()); }
