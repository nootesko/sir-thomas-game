// The old gods of the kingdom. Each one has a shrine in its land, likes some deeds and dislikes others. Deeds raise
// (or lower) favor with every god who cares; Thomas may swear fidelity to one god, who then grants permanent blessings
// as favor grows (sworn at 0, Graça at 40, Escolhido at 80). Any god he is not sworn to can still answer a prayer with
// a short blessing when favor is high enough. State lives in story.flags.faith, so the normal save keeps it.
import * as THREE from 'three';
import { ITEMS } from './items.js';
import { regionName } from './regions.js';

export const TIERS = [0, 40, 80];
export const TIER_NAMES = ['Juramento', 'Graça', 'Escolhido'];
const PRAYER_SECS = 180, PRAYER_COST = 10, PRAYER_MIN = 15;

export const GODS = {
  ouren: {
    name: 'Ouren', title: 'o Senhor das Balanças', color: 0xffc83a, css: '#ffc83a', land: 'Fortaleza',
    lore: 'Deus das trocas justas e da palavra dada. Os primeiros mercadores do reino juravam por ele antes de apertar as mãos.',
    likes: ['Comprar e vender nas lojas', 'Cumprir missões (palavra dada)', 'Oferendas de moedas'], dislikes: ['Arrombar portas e mexer em baús alheios'],
    offer: { gold: 25, favor: 4 }, items: {},
    blessings: [{ name: 'Mão Justa', desc: 'Lojas cobram 10% menos', fx: { discount: 0.1 } }, { name: 'Bolsa Cheia', desc: '+30% de moedas dos monstros', fx: { goldMul: 0.3 } }, { name: 'Bom Negócio', desc: 'Vende itens por 30% a mais', fx: { sellMul: 0.3 } }],
    prayer: { name: 'Sorte de Ouren', desc: '+50% de moedas dos monstros', fx: { goldMul: 0.5 } },
    voice: ['A balança pende a seu favor, cavaleiro.', 'Palavra dada é moeda que não se gasta.'],
  },
  lodosa: {
    name: 'Lodosa', title: 'a Mãe do Lodo', color: 0x5fd06a, css: '#5fd06a', land: 'Lossot',
    lore: 'A deusa das águas paradas, das ervas e dos sapos. Dizem em Lossot que tudo o que apodrece volta a ela para nascer de novo.',
    likes: ['Destruir a geleca que envenena suas águas', 'Oferendas de mel silvestre, gosma e pele de sapo'], dislikes: ['Usar antídotos (ela prefere que o corpo aprenda)'],
    offer: { gold: 40, favor: 3 }, items: { pele_sapo: 6, mel: 3, gosma: 2 },
    blessings: [{ name: 'Pele de Lodo', desc: 'Imune a veneno', fx: { immune: ['poison'] } }, { name: 'Seiva', desc: 'Poções e comida curam 40% mais', fx: { healMul: 0.4 } }, { name: 'Água Viva', desc: 'Recupera 1 de vida por segundo fora de combate', fx: { hpRegen: 1 } }],
    prayer: { name: 'Bálsamo do Pântano', desc: 'Cura toda a vida e os venenos, e regenera devagar', fx: { hpRegen: 0.6 }, now: 'heal' },
    voice: ['O lodo guarda tudo, e devolve.', 'Respire devagar. A água também.'],
  },
  hiberno: {
    name: 'Hiberno', title: 'o Inverno Calado', color: 0x7f9dff, css: '#7f9dff', land: 'Floresta de Neveo',
    lore: 'O velho deus da neve funda e das noites longas. Os ursos-corujas o chamam de Avô Silencioso e o honram guardando o que sabem.',
    likes: ['Caçar à noite', 'Ajudar os ursos-corujas e o Rei Pássaro', 'Oferendas de peles de lobo'], dislikes: ['Matar bichos que não atacam (coelhos)'],
    offer: { gold: 40, favor: 3 }, items: { pele_lobo: 5 },
    blessings: [{ name: 'Pele de Inverno', desc: '+30% de resistência ao frio e +3 de defesa', fx: { cold: 0.3, defense: 3 } }, { name: 'Respiro Frio', desc: '+25 de estamina máxima', fx: { stamina: 25 } }, { name: 'Gelo nas Veias', desc: 'Imune a lentidão', fx: { immune: ['slow'] } }],
    prayer: { name: 'Manto de Neve', desc: '+6 de defesa', fx: { defense: 6 } },
    voice: ['Silêncio. Escute a neve cair.', 'O inverno não odeia ninguém. Só espera.'],
  },
  ventania: {
    name: 'Ventânia', title: 'a Dama dos Ventos', color: 0x6ff0d8, css: '#6ff0d8', land: 'Colina do Rei Pássaro',
    lore: 'Deusa dos caminhos, dos pássaros e de quem não para quieto. O Rei Pássaro diz que ela mora entre uma asa e outra.',
    likes: ['Descobrir lugares novos', 'Correr longas distâncias', 'Oferendas de penas'], dislikes: [],
    offer: { gold: 40, favor: 3 }, items: { pena: 6 },
    blessings: [{ name: 'Pés Leves', desc: '+10% de velocidade', fx: { speed: 0.1 } }, { name: 'Rajada', desc: 'Esquiva gasta 40% menos estamina', fx: { dodgeMul: -0.4 } }, { name: 'Fôlego do Vento', desc: 'Estamina volta 50% mais rápido', fx: { regenMul: 0.5 } }],
    prayer: { name: 'Vento nas Costas', desc: '+20% de velocidade', fx: { speed: 0.2 } },
    voice: ['Ande, ande! O mundo é largo.', 'Quem fica parado vira pedra.'],
  },
  ignar: {
    name: 'Ignar', title: 'o Ferreiro Vermelho', color: 0xff6a2a, css: '#ff6a2a', land: 'Desfiladeiro da Caveira',
    lore: 'Deus da forja, do fogo e da luta honesta. O Dragão Vermelho, dizem, foi a primeira coisa que ele martelou.',
    likes: ['Vencer monstros e, mais ainda, chefes', 'Oferendas de escamas e presas'], dislikes: ['Cair em combate'],
    offer: { gold: 40, favor: 3 }, items: { escama_vermelha: 8, escama_serpente: 2, presa_morcego: 1 },
    blessings: [{ name: 'Brasa', desc: '+4 de dano', fx: { damage: 4 } }, { name: 'Couro de Forja', desc: 'Imune a queimadura e +5% de crítico', fx: { immune: ['burn'], crit: 0.05 } }, { name: 'Lâmina em Brasa', desc: 'Seus golpes deixam o inimigo queimando', fx: { burnHit: true } }],
    prayer: { name: 'Fúria da Forja', desc: '+30% de dano', fx: { damageMul: 0.3 } },
    voice: ['Bata forte. Bata certo.', 'O fogo testa o metal. E o homem.'],
  },
};

export class Faith {
  constructor(game) { this.game = game; this.shrines = []; this.pending = {}; this.runDist = 0; this.t = 0; }
  get s() { const f = this.game.story.flags; if (!f.faith) f.faith = { oath: null, favor: {}, seen: {}, buff: null, visited: {}, prayed: {} }; return f.faith; }
  favor(id) { return this.s.favor[id] || 0; }
  // how many blessings of `id` Thomas holds: 0 unless sworn; 1..3 by favor
  tier(id) { if (this.s.oath !== id) return 0; const f = this.favor(id); return TIERS.filter(t => f >= t).length; }

  // ---------- favor ----------
  // n favor for `id` (negative for a dislike); sworn god counts 1.5x on likes. Toasts are batched per god.
  like(id, n, why) {
    const s = this.s; if (!GODS[id] || !n) return; const before = this.tier(id);
    const gain = n > 0 && s.oath === id ? n * 1.5 : n; s.favor[id] = Math.max(-50, Math.min(100, (s.favor[id] || 0) + gain));
    const p = this.pending[id] || (this.pending[id] = { n: 0, why, t: 0 }); p.n += gain; p.why = why; p.t = 1.2;
    const after = this.tier(id); if (after > before) { const b = GODS[id].blessings[after - 1]; this.game.audio.chime(); setTimeout(() => this.game.hud.toast(`${GODS[id].name} concede: ${b.name}! ${b.desc}`, 4500), 900); this.game.applyEquip(); }
    else if (after < before) this.game.applyEquip();
  }
  // ---------- deeds (called from the game) ----------
  onKill(m) {
    const c = m.cfg, night = this.game.day.hour >= 20 || this.game.day.hour < 5;
    this.like('ignar', c.boss ? 8 : 1, c.boss ? 'venceu um chefe' : null);
    if (m.id === 'geleca' || m.id === 'rei_geleca') this.like('lodosa', m.id === 'rei_geleca' ? 10 : 1.5, 'limpou a geleca');
    if (night && !c.boss) this.like('hiberno', 1, 'caçou à noite');
    if (m.id === 'coelho') this.like('hiberno', -2, 'matou um coelho');
  }
  onQuest(id) { this.like('ouren', 4, 'cumpriu a palavra'); if (['filhote', 'penas'].includes(id)) this.like('hiberno', 10, 'ajudou os povos do norte'); if (id === 'sapos') this.like('lodosa', 6, 'livrou o pântano'); if (id === 'dragao') this.like('ignar', 10, 'enfrentou o dragão'); }
  onTrade(gold) { this.tradeAcc = (this.tradeAcc || 0) + gold; while (this.tradeAcc >= 60) { this.tradeAcc -= 60; this.like('ouren', 1, 'fez bom comércio'); } }
  onCrime() { this.like('ouren', -6, 'roubou'); }
  onCure() { this.like('lodosa', -1, null); }
  onDeath() { this.like('ignar', -4, 'caiu em combate'); }

  // ---------- effects ----------
  // every effect Thomas has now: blessings of the sworn god up to his tier plus a prayer blessing
  effects() {
    const s = this.s, out = []; if (s.oath) GODS[s.oath].blessings.slice(0, this.tier(s.oath)).forEach(b => out.push(b.fx));
    if (s.buff && s.buff.t > 0) out.push(GODS[s.buff.god].prayer.fx); return out;
  }
  // folded into the player's numbers by Game.applyEquip
  apply(p) {
    const fx = this.effects(); const sum = k => fx.reduce((a, f) => a + (f[k] || 0), 0);
    p.damage = Math.round((p.damage + sum('damage')) * (1 + sum('damageMul'))); p.defense += sum('defense'); p.coldResist += sum('cold'); p.maxStamina += sum('stamina'); p.critChance += sum('crit');
    p.speedMul = 1 + sum('speed'); p.dodgeMul = 1 + sum('dodgeMul'); p.regenMul = 1 + sum('regenMul'); p.healMul = 1 + sum('healMul'); p.hpRegen = sum('hpRegen');
    p.goldMul = 1 + sum('goldMul'); p.sellMul = 1 + sum('sellMul'); p.discount = sum('discount'); p.burnHit = fx.some(f => f.burnHit);
    p.immune = {}; for (const f of fx) for (const k of f.immune || []) p.immune[k] = true;
  }

  // ---------- shrines ----------
  build(city) {
    const spots = { ouren: [13, -44], lodosa: [-240, 92], hiberno: [70, -236], ventania: [-86, -300], ignar: [184, 104] };
    const stone = new THREE.MeshLambertMaterial({ color: 0xb8b0a4 }), dark = new THREE.MeshLambertMaterial({ color: 0x7a7268 });
    const g1 = new THREE.CylinderGeometry(1.5, 1.7, 0.4, 10), g2 = new THREE.CylinderGeometry(0.55, 0.75, 1.3, 8), g3 = new THREE.CylinderGeometry(0.9, 0.6, 0.25, 8), gem = new THREE.OctahedronGeometry(0.42, 0), ring = new THREE.RingGeometry(1.9, 2.3, 28);
    for (const id in GODS) {
      let [x, z] = spots[id]; [x, z] = city.nearestFree(x, z, 1.8); const G = GODS[id];
      const base = new THREE.Mesh(g1, dark); base.position.set(x, 0.2, z); const col = new THREE.Mesh(g2, stone); col.position.set(x, 1.05, z); const top = new THREE.Mesh(g3, stone); top.position.set(x, 1.82, z);
      for (const m of [base, col, top]) city.scene.add(m);
      const crystal = new THREE.Mesh(gem, new THREE.MeshBasicMaterial({ color: G.color })); crystal.position.set(x, 2.5, z); city.scene.add(crystal);
      const halo = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: G.color, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending })); halo.rotation.x = -Math.PI / 2; halo.position.set(x, 0.06, z); city.scene.add(halo);
      const light = new THREE.PointLight(G.color, 6, 12, 1.6); light.position.set(x, 2.8, z); city.scene.add(light);
      city.addCircle(x, z, 1.6); this.shrines.push({ id, pos: new THREE.Vector3(x, 0, z), crystal, halo });
    }
  }
  update(dt) {
    const g = this.game, p = g.player, s = this.s; this.t += dt;
    for (const sh of this.shrines) { if (!g.lodNear || g.lodNear(sh.pos)) { sh.crystal.rotation.y = this.t * 1.2; sh.crystal.position.y = 2.5 + Math.sin(this.t * 2 + sh.pos.x) * 0.12; const on = s.oath === sh.id; sh.halo.material.opacity = (on ? 0.7 : 0.35) + Math.sin(this.t * 3) * 0.1; } }
    // batched "god liked that" toasts
    for (const id in this.pending) { const q = this.pending[id]; q.t -= dt; if (q.t <= 0) { delete this.pending[id]; if (Math.abs(q.n) >= 1 && q.why) g.hud.float(`${GODS[id].name} ${q.n > 0 ? '+' : ''}${Math.round(q.n)}`, p.pos.clone().setY(3.1), q.n > 0 ? 'god' : 'hurt'); } }
    // exploring: first visit to each named land pleases the wind
    const rn = regionName(p.pos.x, p.pos.z); if (rn && !s.visited[rn]) { s.visited[rn] = 1; this.like('ventania', 6, 'descobriu ' + rn); }
    if (p.running && p.moving) { this.runDist += 9.5 * dt; if (this.runDist > 250) { this.runDist = 0; this.like('ventania', 1, 'correu longe'); } }
    // prayer blessing timer
    if (s.buff) { s.buff.t -= dt; if (s.buff.t <= 0) { const n = GODS[s.buff.god].prayer.name; s.buff = null; g.applyEquip(); g.hud.toast(`${n} se dissipou.`); } }
    // Água Viva / Bálsamo: slow regen when nothing is chasing Thomas
    if (p.hpRegen && !p.dead && !(g.chasers && g.chasers.length) && p.hp < p.maxHp) p.heal(p.hpRegen * dt);
  }
  near(pos) { for (const sh of this.shrines) if (sh.pos.distanceTo(pos) < 3.6) return sh; return null; }

  // ---------- the shrine dialog ----------
  async visit(id) {
    const g = this.game, G = GODS[id], s = this.s, st = g.story, p = g.player, h = g.hud;
    if (!s.seen[id]) { s.seen[id] = 1; await h.lore(`Santuário de ${G.name}, ${G.title}`, `${G.lore}\n\nGosta de: ${G.likes.join('; ')}.${G.dislikes.length ? `\nNão gosta de: ${G.dislikes.join('; ')}.` : ''}`); }
    for (;;) {
      const f = Math.round(this.favor(id)), sworn = s.oath === id, t = this.tier(id), next = TIERS[t];
      const status = sworn ? `Você é jurado de ${G.name}. Favor ${f}/100.${next != null ? ` Próxima bênção (${G.blessings[t].name}) com ${next} de favor.` : ' Você é o Escolhido.'}` : `Favor ${f}/100.${s.oath ? ` Você é jurado de ${GODS[s.oath].name}.` : ''}`;
      const prayOk = !s.buff && f >= PRAYER_MIN; const items = Object.keys(G.items).filter(k => ITEMS[k] && g.has(k));
      const opts = [
        { label: 'Rezar', hint: s.buff ? 'já há uma bênção de oração ativa' : f < PRAYER_MIN ? `precisa de ${PRAYER_MIN} de favor` : `${G.prayer.name}: ${G.prayer.desc} por 3 min (custa ${PRAYER_COST} de favor)`, act: 'pray' },
        { label: `Oferecer ${G.offer.gold} moedas`, hint: `+${G.offer.favor} de favor${p.gold < G.offer.gold ? ' (moedas insuficientes)' : ''}`, act: 'gold' },
        ...(items.length ? [{ label: 'Oferecer itens', hint: items.map(k => `${ITEMS[k].name.toLowerCase()} +${G.items[k]}`).join(', '), act: 'items' }] : []),
        sworn ? { label: 'Renunciar ao juramento', hint: 'perde metade do favor e as bênçãos', act: 'renounce' } : { label: `Jurar fidelidade a ${G.name}`, hint: `${G.blessings[0].name}: ${G.blessings[0].desc}${s.oath ? `. Abandona ${GODS[s.oath].name}` : ''}`, act: 'swear' },
        { label: 'Bênçãos deste deus', hint: G.blessings.map((b, i) => `${TIER_NAMES[i]} (${TIERS[i]}): ${b.name}`).join(' · '), act: 'list' },
        { label: 'Sair', act: 'exit' },
      ];
      const c = await st.choose(`${G.name}, ${G.title}`, status, opts); const act = opts[c]?.act;
      if (act === 'exit' || act == null) break;
      if (act === 'pray') { if (!prayOk) { h.toast(s.buff ? 'Você já carrega uma bênção de oração.' : `${G.name} ainda não ouve você. Faça o que ${G.name} gosta.`, 2600); continue; }
        s.favor[id] -= PRAYER_COST; s.buff = { god: id, t: PRAYER_SECS }; if (G.prayer.now === 'heal') { p.hp = p.maxHp; p.cure(); } g.applyEquip(); g.audio.chime(); await st.say(G.name, G.voice[Math.floor(Math.random() * G.voice.length)]); h.toast(`${G.prayer.name}: ${G.prayer.desc} (3 min)`, 3500); break; }
      if (act === 'gold') { if (p.gold < G.offer.gold) { h.toast('Moedas insuficientes', 1500); continue; } p.gold -= G.offer.gold; this.like(id, G.offer.favor, 'aceitou a oferenda'); g.audio.pickup(); h.refreshPanels(); continue; }
      if (act === 'items') { let n = 0; for (const k of items) { const q = p.inventory[k] || 0; if (!q) continue; g.removeItem(k, q); n += q * G.items[k]; } this.like(id, n, 'aceitou a oferenda'); g.audio.pickup(); h.toast(`${G.name} aceitou a oferenda (+${Math.round(n * (s.oath === id ? 1.5 : 1))} de favor)`, 2500); continue; }
      if (act === 'swear') {
        const ok = await st.choose(G.name, s.oath ? `Jurar fidelidade a ${G.name} quebra o juramento com ${GODS[s.oath].name}: metade do favor dele se perde. Jurar mesmo assim?` : `Um juramento é para sempre, até que se quebre. Jurar fidelidade a ${G.name}, ${G.title}?`, [{ label: 'Juro.' }, { label: 'Ainda não.' }]);
        if (ok !== 0) continue; if (s.oath) s.favor[s.oath] = (s.favor[s.oath] || 0) / 2;
        s.oath = id; s.favor[id] = Math.max(0, s.favor[id] || 0); g.applyEquip(); g.audio.chime(); await st.say(G.name, G.voice[0]); h.toast(`Jurado de ${G.name}! ${G.blessings[0].name}: ${G.blessings[0].desc}`, 4500); g.save(); continue;
      }
      if (act === 'renounce') { const ok = await st.choose(G.name, `Renunciar a ${G.name}? Metade do favor se perde e as bênçãos somem.`, [{ label: 'Renuncio.' }, { label: 'Não.' }]); if (ok !== 0) continue; s.favor[id] = (s.favor[id] || 0) / 2; s.oath = null; g.applyEquip(); h.toast(`Você não é mais jurado de ${G.name}.`, 3000); g.save(); continue; }
      if (act === 'list') { await h.lore(`Bênçãos de ${G.name}`, G.blessings.map((b, i) => `${TIER_NAMES[i]} — favor ${TIERS[i]}: ${b.name}. ${b.desc}.`).join('\n') + `\n\nOração (sem juramento, favor ${PRAYER_MIN}+): ${G.prayer.name}. ${G.prayer.desc} por 3 minutos.\n\nGosta de: ${G.likes.join('; ')}.${G.dislikes.length ? `\nNão gosta de: ${G.dislikes.join('; ')}.` : ''}`); continue; }
    }
    g.save(); h.refreshPanels();
  }

  // ---------- hero panel tab ----------
  renderPane(el) {
    const s = this.s; el.innerHTML = `<div class="ui-note">Os deuses antigos ainda ouvem. Visite os santuários (cristais coloridos no mapa), faça o que eles gostam e jure fidelidade a um deles para receber bênçãos permanentes.</div>`;
    for (const id in GODS) { const G = GODS[id], f = Math.max(0, Math.round(this.favor(id))), t = this.tier(id), sworn = s.oath === id;
      const d = document.createElement('div'); d.className = 'god' + (sworn ? ' sworn' : ''); d.style.setProperty('--gc', G.css);
      d.innerHTML = `<div class="god-head"><i class="god-gem"></i><b>${G.name}</b> <small>${G.title} · ${G.land}</small>${sworn ? '<span class="god-tag">JURADO</span>' : ''}</div><div class="god-bar"><i style="width:${f}%"></i><span>${f}/100</span></div>` +
        `<div class="god-bless">${G.blessings.map((b, i) => `<span class="${sworn && i < t ? 'on' : ''}" title="${b.desc}">${TIER_NAMES[i]} · ${b.name}<small>${b.desc}</small></span>`).join('')}</div><div class="god-likes">Gosta: ${G.likes.join('; ')}${G.dislikes.length ? ` · Não gosta: ${G.dislikes.join('; ')}` : ''}</div>`;
      el.appendChild(d); }
    if (s.buff) { const b = document.createElement('div'); b.className = 'ui-note'; b.textContent = `Bênção de oração ativa: ${GODS[s.buff.god].prayer.name} (${Math.ceil(s.buff.t / 60)} min)`; el.appendChild(b); }
  }
}
