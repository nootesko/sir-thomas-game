// Side quests and the main objective, shown in the quest log (J). Each quest tracks a goal and remembers the player's choices.
import { ITEMS } from './items.js';
export const QUESTS = {
  main:        { title: 'A Fortaleza do Relâmpago Amarelo', giver: null, main: true },
  ratos:       { title: 'Ratos no porão', giver: 'Helena Amaral', desc: 'A taverneira quer dez ratos do esgoto a menos. A grade fica no cruzamento a sudoeste da praça.', goal: g => [Math.min(10, g.player.stats.killsBy.rato || 0), 10], turnIn: 'taverneira' },
  mel:         { title: 'Ferrões para o pão de mel', giver: 'Dona Rosa', desc: 'Dona Rosa precisa de 4 ferrões de abelha gigante para a receita da avó. As abelhas vivem nos campos a leste.', goal: g => [Math.min(4, g.player.inventory.ferrao_abelha || 0), 4], turnIn: 'cozinheira' },
  chave:       { title: 'A chave do Quartel', giver: 'Capitão Cassios', desc: 'Um guarda perdeu a chave do baú do Quartel no esgoto. Os ratos levam tudo que brilha.', goal: g => [g.has('chave_quartel') || g.story.flags.chaveReturned ? 1 : 0, 1], turnIn: 'capitao' },
  decreto:     { title: 'O decreto rasgado', giver: 'Inácio Valente', desc: 'O escriba quer saber o que o rei escreveu e rasgou. O decreto está no Castelo Real: peça licença ao rei ou arrombe a porta.', goal: g => [g.story.flags.readDecree ? 1 : 0, 1], turnIn: 'res_escriba' },
  flores:      { title: 'Flores para a princesa', giver: 'Clara Teixeira', desc: 'A jardineira deu a Thomas duas flores dos Jardins. Qual delas Eleonora prefere? Entregue à princesa.', goal: g => [g.story.flags.floresDone ? 1 : 0, 1], turnIn: 'maite' },
  pedras:      { title: 'As pedras soltas', giver: 'Bilhete de Vasco Barroso', desc: 'Um pedreiro escondeu uma passagem no esgoto, sob o canal do sul, fechada com pedras soltas. Vale a pena procurar o que ele deixou lá.', goal: g => [g.story.flags.pedrasDone ? 1 : 0, 1] },
  alfa:        { title: 'O Lobo Alfa', giver: 'Guarda Olavo', desc: 'Um lobo enorme lidera a matilha do leste, perto da Floresta Congelada. O guarda paga bem pela cabeça dele.', goal: g => [Math.min(1, g.player.stats.killsBy.lobo_alfa || 0), 1], turnIn: 'guarda' },
  sapos:       { title: 'Os Sapos-Pantera', giver: 'Barqueiro Tobias', desc: 'Um Sapo-Pantera enorme tomou o poço grande do pântano, a noroeste de Lossot. Os barcos não saem mais.', goal: g => [Math.min(1, g.player.stats.killsBy.sapo_alfa || 0), 1], turnIn: 'barqueiro' },
  geleca:      { title: 'A origem da geleca', giver: 'Erveira Lúcia', desc: 'A gosma que escorre do castelo a norte de Lossot está matando as ervas. Algo no Salão da Geleca a alimenta.', goal: g => [Math.min(1, g.player.stats.killsBy.rei_geleca || 0), 1], turnIn: 'erveira' },
  filhote:     { title: 'O filhote perdido', giver: 'Ancião Bruma', desc: 'Pluma, um filhote de urso-coruja, se perdeu na nevasca. Os rastros iam para nordeste da cidade dos ursos.', goal: g => [g.story.flags.cubFound ? 1 : 0, 1], turnIn: 'anciao' },
  penas:       { title: 'Audiência com o Rei Pássaro', giver: 'Rei Pássaro', desc: 'O soberano das aves só fala com quem traz três penas dos gaviões que guardam a colina.', goal: g => [Math.min(3, g.player.inventory.pena || 0), 3], turnIn: 'rei_passaro' },
  dragao:      { title: 'O Dragão Vermelho', giver: 'Andarilha Inês', desc: 'No fundo do Desfiladeiro da Caveira dorme o Dragão Vermelho. Ninguém atravessa as montanhas enquanto ele guarda o caminho.', goal: g => [Math.min(1, g.player.stats.killsBy.dragao || 0), 1], turnIn: 'andarilha' },
  biblioteca:  { title: 'As Páginas Perdidas', giver: 'Pena-Velha', desc: 'O livro "Sobre o Homem que Virou Urubu" perdeu cinco páginas, levadas pelo reino: no pântano, no castelo de geleca, no desfiladeiro, na colina do Rei Pássaro e na Cripta Antiga.', goal: g => [Math.min(5, Object.keys(g.story.flags.pages || {}).length), 5], turnIn: 'bibliotecaria' },
  rainha:      { title: 'A Rainha da Gruta', giver: 'Padre Anselmo', desc: 'Os morcegos saem da Gruta do Norte à noite. O padre acha que algo lá dentro os expulsa. Entre pela boca da gruta na estrada do norte.', goal: g => [Math.min(1, g.player.stats.killsBy.aranha_rainha || 0), 1], turnIn: 'padre' },
};
export class Quests {
  constructor(game) { this.game = game; this.q = {}; }
  state() { return this.q; }
  load(s) { this.q = s || {}; }
  start(id, extra = {}) { if (this.q[id]) return false; this.q[id] = { status: 'active', ...extra }; this.game.hud.toast(`Nova missão: ${QUESTS[id].title} (J)`, 3000); this.game.audio.chime(); this.refresh(); return true; }
  active(id) { return this.q[id]?.status === 'active'; }
  done(id) { return this.q[id]?.status === 'done'; }
  ready(id) { const d = QUESTS[id]; if (!this.active(id) || !d.goal) return false; const [c, n] = d.goal(this.game); return c >= n; }
  complete(id, extra = {}) { if (!this.q[id] || this.q[id].status === 'done') return; this.q[id] = { ...this.q[id], status: 'done', ...extra }; this.game.hud.toast(`Missão concluída: ${QUESTS[id].title}`, 3000); this.game.audio.chime(); this.game.player.gainXp(30); this.game.faith?.onQuest(id); this.refresh(); this.game.save(); }
  check() { for (const id in this.q) if (this.active(id) && !QUESTS[id].turnIn && this.ready(id)) this.complete(id); this.refresh(); }
  refresh() {
    const list = document.getElementById('quest-list'); if (!list || !document.getElementById('quests').classList.contains('show')) return; list.innerHTML = '';
    const main = document.createElement('div'); main.className = 'quest'; main.innerHTML = `<b>${QUESTS.main.title}</b>${document.getElementById('objective-text').textContent || 'Explore a cidade.'}`; list.appendChild(main); this.game.guild?.renderLog(list);
    const ids = Object.keys(this.q).filter(i => i !== 'main').sort((a, b) => (this.q[a].status === 'done') - (this.q[b].status === 'done'));
    if (!ids.length) { const d = document.createElement('div'); d.className = 'ui-note'; d.textContent = 'Nenhuma missão secundária ainda. Converse com os moradores: quem tem um "!" sobre a cabeça precisa de ajuda.'; list.appendChild(d); }
    for (const id of ids) { const d = QUESTS[id], s = this.q[id]; const el = document.createElement('div'); el.className = 'quest' + (s.status === 'done' ? ' done' : ''); let st = s.status === 'done' ? 'Concluída' : 'Em andamento'; if (d.goal && s.status !== 'done') { const [c, n] = d.goal(this.game); st += ` · ${c}/${n}`; if (c >= n && d.turnIn) st += ' · volte para entregar'; } el.innerHTML = `<b>${d.title}</b>${d.desc}<div class="st">${d.giver ? d.giver + ' · ' : ''}${st}${s.choice ? ' · escolha: ' + s.choice : ''}</div>`; list.appendChild(el); }
  }
}
