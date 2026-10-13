// Story, dialogues and side quests. Dialogues branch on choices that set flags; flags change later lines, prices and rewards.
import * as THREE from 'three';
import { ITEMS, SHOPS } from './items.js';
import { Loot } from './monsters.js';
import { SEWER } from './city.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
export class Story {
  constructor(game) { this.game = game; this.flags = {}; this.chapter = 'prologue'; this.target = null; }
  waitUntil(fn) { return new Promise(res => { const tick = () => fn() ? res() : requestAnimationFrame(tick); tick(); }); }
  objective(text, target) { this.game.hud.objective(text); this.target = target ? { x: target.x, z: target.z } : null; }
  say(name, ...lines) { return this.game.hud.dialog(lines.map(l => Array.isArray(l) ? l : [name, l])); }
  choose(name, text, options) { return this.game.hud.choose(name, text, options); }
  get hour() { return this.game.day.hour; }
  get greeting() { const h = this.hour; return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
  // ---------- named characters ----------
  npcDialog(id) {
    const fn = { maite: this.maite, ferreiro: this.ferreiro, cozinheira: this.cozinheira, guarda: this.guarda, pipo: this.pipo, mercador: this.mercador, rei: this.rei, taverneira: this.taverneira, padre: this.padre, capitao: this.capitao, barqueiro: this.barqueiro, erveira: this.erveira, pescadora: this.pescadora, anciao: this.anciao, urso_pinho: this.ursoPinho, filhote: this.filhote, rei_passaro: this.reiPassaro, andarilha: this.andarilha, coruja: this.coruja }[id];
    if (/^urso\d$/.test(id)) return this.say(this.game.npcs[id].name, ['Huu. Huu. Um humano de armadura. Faz tempo.', 'Nossas portas são largas para caber as asas. E o coração, para caber visitas.', 'O Ancião Bruma vê tudo. Até o que ainda não aconteceu.', 'Neve boa, neve funda. Cuidado com os lobos de gelo depois dos pinheiros.'][+id.slice(-1)]);
    if (id === 'guilda') return this.game.guild.talk();
    if (id === 'rei_urso') return this.reiUrso();
    if (id === 'bibliotecaria') return this.bibliotecaria();
    if (fn) return fn.call(this); if (id.startsWith('castelo_g')) return this.say('Guarda do Castelo', 'Ninguém entra no castelo sem licença do rei. Nem o senhor, Sir Thomas. Ordens.'); return this.say('Morador', 'Olá, Sir Thomas.');
  }
  async maite() {
    const g = this.game, q = g.quests, f = this.flags;
    if (q.active('flores') && !f.floresDone) {
      const c = await this.choose('Sir Thomas', 'Eleonora... trouxe flores dos Jardins. Clara me deu duas e eu... bom. Qual você prefere?', [{ label: 'As vermelhas.', hint: 'todo mundo gosta de vermelho' }, { label: 'As brancas.', hint: 'uma lembrança do diário de alguém' }]);
      f.floresDone = true; f.maiteWhite = c === 1;
      if (c === 1) { await this.say('Princesa Eleonora', 'Brancas. Nove anos, Thomas. Nove anos e você finalmente reparou.', 'Fique com isto. Era da minha mãe. Ela dizia que anel bom é o que protege quem usa, não quem dá.'); g.addItem('anel'); q.complete('flores', { choice: 'brancas' }); }
      else { await this.say('Princesa Eleonora', 'Vermelhas! Lindas. Obrigada, Thomas.', ['Sir Thomas', '...você está rindo.'], 'Não estou. Estou... apreciando. Vá, vá cuidar da cidade.'); g.addGold(10); q.complete('flores', { choice: 'vermelhas' }); }
      return;
    }
    if (this.chapter === 'prologue') {
      if (!f.talkedMaite) { await this.say('Princesa Eleonora', 'Thomas! O sol já está alto. Dormiu com a armadura de novo?', ['Sir Thomas', 'Sonhei com um urubu. Enorme, na torre. Acordei suando.'], 'Terceira noite seguida. Dalila diz que é o calor. Eu digo que você precisa andar mais e dormir menos.', 'Olha a torre. A Luz nunca brilhou tanto. A cidade inteira está viva por causa dela... e é por isso que eu quero você descansado.'); 
        const c = await this.choose('Princesa Eleonora', 'Faça uma coisa por mim hoje: dê uma volta pela cidade. Fale com o pessoal. Sabe o que dizem dos corvos?', [{ label: 'Corvos? Que corvos?', hint: 'ouvir' }, { label: 'Corvo não derruba muralha, Eleonora.', hint: 'tranquilizar' }, { label: 'Vou falar com o capitão agora.', hint: 'agir' }]);
        if (c === 0) await this.say('Princesa Eleonora', 'Grandes. Pousando na torre. O Olavo diz que é nada. Eu quero que VOCÊ me diga que é nada.'); else if (c === 1) { await this.say('Princesa Eleonora', 'Não derruba. Mas voa por cima dela.', 'Vá. E descanse cedo. Amanhã tem muito o que fazer.'); f.maiteCalm = true; } else { await this.say('Princesa Eleonora', 'O capitão vai dizer "ordens". Fale com as pessoas, Thomas. As pessoas veem mais que a guarda.'); f.maiteCaptain = true; }
        f.talkedMaite = true; return; }
      return this.say('Princesa Eleonora', f.maiteCalm ? 'Ainda aqui? Vá andar. E descanse cedo hoje.' : 'Fale com os moradores. Depois vá dormir cedo. Prometa.');
    }
    if (this.chapter === 'night') return this.say('Princesa Eleonora', 'Thomas, corre! A torre!');
    if (!f.talkedMaite2) {
      await this.say('Princesa Eleonora', 'Thomas... você acordou. Achei que o escudo tinha...', ['Sir Thomas', 'O escudo quebrou. A Luz... ele levou a Luz, Eleonora.'], 'Eu sei. O rio parou. As hortas congelaram numa noite. As pessoas estão com medo e olham para mim.', 'Aquilo não era um urubu. Na Floresta Congelada vive alguém que sabe de coisas antigas. Chamam de Sábia Coruja.');
      const c = await this.choose('Princesa Eleonora', 'O urubu deixou marcas de fumaça na estrada do leste. Siga as marcas até a floresta.', [{ label: 'Eu vou. Cuide da cidade.', hint: 'partir' }, { label: 'E se eu não voltar?', hint: 'duvidar' }, { label: f.knowsPrice ? 'O decreto do rei... "quem toma a Luz deve saber o preço".' : 'Antes, preciso de mantimentos.', hint: f.knowsPrice ? 'revelar' : 'preparar' }]);
      if (c === 1) await this.say('Princesa Eleonora', 'Então eu vou atrás de você. E você sabe que eu vou.', 'Volte inteiro, Thomas.'); else if (c === 2 && f.knowsPrice) { await this.say('Princesa Eleonora', 'Você leu. Meu pai rasgou aquilo porque tinha medo de que alguém fosse atrás da Luz sem saber o que ela custa.', 'Agora você sabe. Não é uma pedra, Thomas. É um empréstimo. Descubra com a Coruja quem emprestou.'); f.maiteTruth = true; } else if (c === 2) { await this.say('Princesa Eleonora', 'Dona Rosa tem sopa. Gaspar tem poções, pelo dobro do preço. Leve o que puder.'); } else await this.say('Princesa Eleonora', 'Deixa o escudo comigo. Lucas vai forjar um novo em volta do fragmento.');
      f.talkedMaite2 = true; return;
    }
    return this.say('Princesa Eleonora', f.maiteWhite ? 'Siga as marcas negras, Thomas. E volte. Tenho um jardim para te mostrar.' : 'Saia pelo portão leste e siga as marcas negras. Acenda fogueiras no caminho: o frio aqui fora é de verdade.');
  }
  async ferreiro() {
    const pro = this.chapter === 'prologue', g = this.game;
    if (pro) { await this.say('Ferreiro Lucas', `${this.greeting}, Sir Thomas. A espada está afiada? Passe aqui sempre que precisar.`, 'Hoje forjei dobradiças para o portão sul. Trabalho pequeno. É o trabalho pequeno que segura a fortaleza de pé.'); }
    else { await this.say('Ferreiro Lucas', 'O escudo partiu em três. O fragmento amarelo não sai de jeito nenhum: nem fogo, nem martelo.', 'A princesa mandou não tirar. Vou forjar um escudo novo em volta dele. Vai levar tempo, Thomas. Enquanto isso, compre aço.'); if (!this.flags.gotBuckler && !g.equip.escudo) { this.flags.gotBuckler = true; await this.say('Ferreiro Lucas', 'E não saia de mãos vazias. Este broquel é de madeira, mas segura uma mordida de lobo. Pode levar.'); g.equip.escudo = 'broquel'; g.applyEquip(); g.hud.toast('Broquel de Madeira equipado. Segure o botão direito (ou o escudo na tela) para defender', 4500); g.save(); } }
    g.hud.shop('ferreiro');
  }
  async cozinheira() {
    const g = this.game, q = g.quests, f = this.flags, pro = this.chapter === 'prologue';
    if (q.ready('mel')) {
      await this.say('Dona Rosa', 'Quatro ferrões! Menino, você é de ouro. Agora o pão de mel da minha avó volta ao forno.'); g.removeItem('ferrao_abelha', 4);
      const c = await this.choose('Dona Rosa', 'Como eu te pago? Tenho moedas, ou tenho a receita. A receita vale mais, mas não compra nada.', [{ label: 'A receita.', hint: 'comida passa a curar 50% mais' }, { label: 'As moedas.', hint: '+40 moedas' }]);
      if (c === 0) { f.foodBonus = true; await this.say('Dona Rosa', 'O segredo é esperar. Deixe o pão descansar; deixe a vida voltar devagar. Vai entender quando precisar.'); q.complete('mel', { choice: 'receita' }); } else { g.addGold(40); q.complete('mel', { choice: 'moedas' }); }
      g.hud.shop('cozinheira'); return;
    }
    if (pro && !q.q.mel) { await this.say('Dona Rosa', 'Thomas, menino! Tem sopa de abóbora no fogo. O vale deu uma colheita e tanto este ano.', 'Sabe o que eu queria? Quatro ferrões de abelha gigante. Pão de mel da minha avó leva ferrão moído, acredite. As abelhas estão nos campos a leste, do tamanho de pardais.');
      const c = await this.choose('Dona Rosa', 'Você me traz?', [{ label: 'Trago, Dona Rosa.', hint: 'aceitar missão' }, { label: 'Abelhas do tamanho de pardais? Depois.', hint: 'recusar por ora' }]);
      if (c === 0) q.start('mel'); else await this.say('Dona Rosa', 'Depois, depois. Todo mundo diz depois.'); }
    else if (pro) await this.say('Dona Rosa', q.active('mel') ? 'Quatro ferrões, Thomas. Moídos, claro, mas isso eu faço.' : 'Com a Luz lá em cima, nada falta por aqui. Que ela brilhe para sempre.');
    else await this.say('Dona Rosa', 'As hortas congelaram da noite para o dia. Estou racionando o que sobrou.', 'Leve uma sopa quente antes de sair. Lá fora o frio morde.');
    g.hud.shop('cozinheira');
  }
  async guarda() {
    const g = this.game, q = g.quests, f = this.flags, pro = this.chapter === 'prologue';
    if (f.caught && !f.fined) {
      const c = await this.choose('Guarda Olavo', 'Sir Thomas. Chegou uma reclamação: alguém mexendo em baú alheio. Eu não acredito, mas tenho que perguntar.', [{ label: 'Fui eu. Pago a multa.', hint: '-30 moedas, assunto encerrado' }, { label: 'Não sei do que você está falando.', hint: 'negar: os vendedores vão desconfiar' }]);
      f.fined = true; if (c === 0) { g.player.gold = Math.max(0, g.player.gold - 30); await this.say('Guarda Olavo', 'Trinta moedas e nunca mais se fala nisso. Um cavaleiro que admite vale mais que um que nega.'); f.caught = 0; } else { f.markup = true; await this.say('Guarda Olavo', 'Certo. Certo. Então não foi ninguém.', 'Só que o Gaspar já sabe. E o Gaspar cobra de quem ele desconfia.'); }
      g.hud.refreshPanels(); return;
    }
    if (q.ready('alfa')) { await this.say('Guarda Olavo', 'O Alfa caiu? Pela Luz... Thomas, metade da guarda não teria coragem. Aqui: a bolsa da recompensa, e uma coisa que eu guardava.'); g.addGold(80); g.addItem('elmo'); q.complete('alfa'); return; }
    if (pro && !q.q.alfa) { await this.say('Guarda Olavo', 'Tudo calmo no portão, Sir Thomas. Só uns corvos rondando a torre hoje de manhã. Corvos grandes. Deve ser nada.', 'Agora, o que não é nada: um lobo do tamanho de um pônei anda liderando a matilha do leste, perto da floresta. Os lavradores não passam mais do segundo marco.');
      const c = await this.choose('Guarda Olavo', 'A guarda paga oitenta moedas por ele. E eu pago com o que mais tenho: respeito.', [{ label: 'Considere feito.', hint: 'aceitar: o Lobo Alfa' }, { label: 'Lobo é problema da guarda.', hint: 'recusar' }]);
      if (c === 0) q.start('alfa'); else await this.say('Guarda Olavo', 'É. É sim. Por isso perguntei a um cavaleiro.'); return; }
    if (pro) return this.say('Guarda Olavo', q.active('alfa') ? 'O Alfa fica para lá da estrada do leste, perto das árvores grandes. Vá com poções.' : 'Tudo calmo no portão. Corvos, só.');
    return this.say('Guarda Olavo', 'Vi aquela coisa voar para leste, por cima da floresta. Deixou um rastro preto na estrada.', 'Se for atrás... volte inteiro.');
  }
  async pipo() {
    const g = this.game, f = this.flags, pro = this.chapter === 'prologue';
    if (!pro) return this.say('Pipo', 'Thomas... a Luz apagou. Minha mãe disse que o inverno voltou.', 'Você vai buscar ela de volta, né?');
    if (f.pipoStory) return this.say('Pipo', 'Conta de novo a do dragão! Não? Tá bom. Vou ver se a Dona Rosa deixou pão esfriando na janela.');
    await this.say('Pipo', 'Sir Thomas! Quando eu crescer vou ter uma espada igual à sua!', 'Conta uma história? Uma de verdade. Minha mãe só conta a do pão de abóbora.');
    const c = await this.choose('Sir Thomas', 'Uma história...', [{ label: 'A do dragão que dormia sob o castelo.', hint: 'mentira boa' }, { label: 'A da noite em que a Luz chegou.', hint: 'o que o padre conta' }, { label: 'Não tenho histórias, Pipo. Tenho ordens.', hint: 'seco' }]);
    f.pipoStory = true;
    if (c === 0) { await this.say('Pipo', 'UM DRAGÃO?! Embaixo do castelo?! Eu sabia! O Vasco disse que tem passagem no esgoto que vai até lá!', 'Toma. É um pé de coelho. Para a sorte. Você vai precisar mais que eu.'); g.addItem('pe_coelho'); f.pipoDragon = true; }
    else if (c === 1) { await this.say('Pipo', 'Essa eu conheço. "Luz que não pedimos, Luz que não pagamos." A Olívia canta na capela.', 'Minha mãe diz que tudo que não se paga alguém paga. Ela diz isso do pão.'); f.pipoLight = true; }
    else await this.say('Pipo', 'Ah. Tá. ... O Lúcio conta histórias. Vou lá.');
  }
  async mercador() {
    const g = this.game, f = this.flags, pro = this.chapter === 'prologue';
    if (f.markup && !f.markupTalk) { f.markupTalk = true; await this.say('Mercador Gaspar', 'Sir Thomas. Dizem coisas pela cidade. Eu não julgo: eu só ajusto os preços.'); }
    else if (pro && !f.haggled) {
      await this.say('Mercador Gaspar', 'Sir Thomas! Poções, pão, capas, gazuas para quem perde chave... e compro qualquer coisa que você trouxer da caça: peles, ferrões, escamas.');
      const c = await this.choose('Mercador Gaspar', 'Preço de tabela. A não ser que o senhor queira conversar.', [{ label: 'Um cavaleiro do reino merece desconto.', hint: 'pechinchar' }, { label: 'Tabela está bom.', hint: 'comprar' }]);
      f.haggled = true; if (c === 0) { if (g.player.gold >= 60 || f.maiteCalm) { f.discount = true; await this.say('Mercador Gaspar', 'Vinte por cento. Para o senhor, e só porque a princesa me olha feio quando eu digo não.'); } else await this.say('Mercador Gaspar', 'Merece. Mas desconto se dá a quem compra. Volte com a bolsa cheia e a gente conversa.'); }
    }
    else await this.say('Mercador Gaspar', pro ? 'Os campos a leste estão cheios de coelhos e abelhas. E dizem que ratos tomaram o esgoto, perto do cruzamento das ruas a sudoeste.' : 'Com esse frio as poções vendem como pão quente. Trouxe peles de lobo?');
    g.hud.shop('mercador');
  }
  async rei() {
    const g = this.game, q = g.quests, f = this.flags, c = g.city;
    if (q.active('decreto') && !f.royalPermission && !f.readDecree) {
      const ch = await this.choose('Rei Ataúlfo', 'Sir Thomas. Inácio anda perguntando pelo decreto. Ele mandou você?', [{ label: 'Mandou. Quero ler o que o senhor rasgou.', hint: 'honesto' }, { label: 'Não, Majestade. Só vim cumprimentar.', hint: 'mentir' }]);
      if (ch === 0) { if (f.talkedMaite) { f.royalPermission = true; c.keep.door.locked = false; await this.say('Rei Ataúlfo', 'Honesto. Minha filha disse que você seria.', 'A porta do salão está aberta para você. Leia. E depois decida se conta ao Inácio ou se faz o que eu fiz.'); } else await this.say('Rei Ataúlfo', 'Fale com minha filha primeiro. Se ela confiar em você, eu confio.'); }
      else await this.say('Rei Ataúlfo', 'Cumprimentado. Agora vá. Os guardas estão ficando nervosos.');
      return;
    }
    return this.say('Rei Ataúlfo', this.chapter === 'winter' ? 'A Luz se foi e o reino sabe de quem é a culpa: minha, por nunca ter contado o preço.' : 'A Luz brilha e o povo canta. Eu durmo pouco, Sir Thomas. Rei que dorme bem não está prestando atenção.');
  }
  async taverneira() {
    const g = this.game, q = g.quests;
    if (q.ready('ratos')) { await this.say('Helena Amaral', 'Dez ratos! Dá para ouvir o silêncio no porão daqui.'); const c = await this.choose('Helena Amaral', 'Pagamento: moedas, ou jantar na taverna por um mês?', [{ label: 'As moedas.', hint: '+50 moedas' }, { label: 'O jantar.', hint: '4 carnes assadas e 2 sopas' }]); if (c === 0) g.addGold(50); else { g.addItem('carne', 4); g.addItem('sopa', 2); } q.complete('ratos', { choice: c === 0 ? 'moedas' : 'jantar' }); return; }
    if (!q.q.ratos) { await this.say('Helena Amaral', `${this.greeting}, Sir Thomas. Cerveja? Não, você está de serviço. Sempre está.`, 'Os ratos voltaram ao porão. Vêm do esgoto, pela grade do cruzamento. Dez a menos e eu durmo.'); const c = await this.choose('Helena Amaral', 'Quem matar dez ganha jantar. Ou moedas, se preferir.', [{ label: 'Dez ratos. Feito.', hint: 'aceitar' }, { label: 'Chame o Olavo.', hint: 'recusar' }]); if (c === 0) q.start('ratos'); else await this.say('Helena Amaral', 'O Olavo tem medo de rato. Todo mundo sabe, menos o Olavo.'); return; }
    return this.say('Helena Amaral', q.active('ratos') ? 'A grade do esgoto fica no cruzamento a sudoeste da praça. Leve uma tocha.' : 'Sente, Thomas. Hoje o Lúcio canta.');
  }
  async padre() {
    const g = this.game, q = g.quests;
    if (q.ready('rainha')) { await this.say('Padre Anselmo', 'A rainha da gruta... morta? Então os morcegos vão sossegar. Ou não. Mas o senhor fez o que ninguém fez.', 'Leve isto. A capela guardava para um dia de precisão.'); g.addItem('pocao_g', 2); g.addGold(60); q.complete('rainha'); return; }
    if (!q.q.rainha) { await this.say('Padre Anselmo', 'Sir Thomas. Os morcegos saem da Gruta do Norte ao anoitecer, em nuvens. Nunca foi assim.', 'Algo lá dentro os expulsa. Algo grande.'); const c = await this.choose('Padre Anselmo', 'A boca da gruta fica no fim da estrada do norte, depois dos campos. Eu não pediria a ninguém... mas estou pedindo.', [{ label: 'Eu vou ver o que é.', hint: 'aceitar' }, { label: 'Morcego é coisa de Deus, padre.', hint: 'recusar' }]); if (c === 0) q.start('rainha'); else await this.say('Padre Anselmo', 'Tudo é. Até o que morde.'); return; }
    return this.say('Padre Anselmo', '"Luz que não pedimos, Luz que não pagamos." Reze, Sir Thomas. Ou pelo menos descanse.');
  }
  async capitao() {
    const g = this.game, q = g.quests, f = this.flags;
    if (q.active('chave') && g.has('chave_quartel')) { const c = await this.choose('Capitão Cassios', 'A chave do Quartel! Onde estava?', [{ label: 'No esgoto, com os ratos. Aqui está.', hint: 'devolver: +60 moedas' }, { label: 'Ainda estou procurando.', hint: 'ficar com a chave: o baú do Quartel é seu' }]); if (c === 0) { g.removeItem('chave_quartel'); f.chaveReturned = true; g.addGold(60); f.guardFriend = true; await this.say('Capitão Cassios', 'Um cavaleiro que devolve o que acha. Raro. A guarda deve uma ao senhor.'); q.complete('chave', { choice: 'devolveu' }); } else { f.keptKey = true; await this.say('Capitão Cassios', 'Continue procurando. Os ratos não têm bolso.'); } return; }
    if (!q.q.chave) { await this.say('Capitão Cassios', 'Sir Thomas. O Cassiano deixou cair a chave do baú do Quartel na grade do esgoto. Os ratos levam tudo que brilha.', 'Lá dentro tem o soldo da guarda e um elmo bom. Eu daria sessenta moedas para ter a chave de volta.'); const c = await this.choose('Capitão Cassios', 'Pega para mim?', [{ label: 'Pego.', hint: 'aceitar' }, { label: 'Mande o Cassiano.', hint: 'recusar' }]); if (c === 0) { q.start('chave'); this.placeKey(); } else await this.say('Capitão Cassios', 'O Cassiano tem medo de rato. Como o Olavo. Que guarda eu tenho.'); return; }
    return this.say('Capitão Cassios', f.keptKey ? 'A chave apareceu? Não? Engraçado: o baú do Quartel amanheceu aberto.' : 'Corvos, Luz piscando, um lobo gigante. Eu registro tudo. Alguém tem que registrar.');
  }
  placeKey() { const S = SEWER; const l = new Loot(this.game, S.x0 + 60, S.z0 + 25, 'chave_quartel', 1); l.life = 1e9; this.game.entities.push(l); }
  // ---------- residents ----------
  async residentDialog(n) {
    const g = this.game, q = g.quests, f = this.flags, fam = n.family, job = fam.job, first = fam.name.split(' ')[0];
    if (n.angry) return this.say(fam.name, 'Eu vi o que o senhor fez na minha casa. Cavaleiro ou não, baú é baú.');
    if (n.sleeping) return;
    // quest givers among the residents
    if (fam.name === 'Inácio Valente') {
      if (q.ready('decreto')) { await this.say('Inácio Valente', 'Você leu. E então? O que o rei escreveu?'); const c = await this.choose('Sir Thomas', '"A Luz não nos pertence. Foi deixada conosco. Se um dia for levada, que ninguém vá atrás dela sem saber o que ela custa."', [{ label: 'Contar tudo ao Inácio.', hint: 'ele registra; +50 moedas' }, { label: 'Dizer que não havia nada de mais.', hint: 'guardar o segredo do rei' }]); if (c === 0) { g.addGold(50); f.knowsPrice = true; await this.say('Inácio Valente', '"Sem saber o que ela custa." Então custa alguma coisa. Vou copiar isto em três lugares. Papel some; três papéis não.'); q.complete('decreto', { choice: 'contou' }); } else { f.knowsPrice = true; f.keptSecret = true; await this.say('Inácio Valente', 'Nada de mais. Sei. Um rei não rasga "nada de mais".', 'Tudo bem. Há segredos que um escriba não copia.'); q.complete('decreto', { choice: 'guardou' }); } return; }
      if (!q.q.decreto) { await this.say('Inácio Valente', 'Sir Thomas. Eu copio os decretos do rei. Um deles ele ditou, assinou e rasgou no mesmo dia. Guardei o rascunho no castelo, e nunca mais consegui entrar lá.', 'Quero saber o que assustou o rei. Peça licença a ele... ou entre do seu jeito. Eu não pergunto.'); const c = await this.choose('Inácio Valente', 'Descobre para mim?', [{ label: 'Descubro.', hint: 'aceitar' }, { label: 'Segredo de rei é de rei.', hint: 'recusar' }]); if (c === 0) q.start('decreto'); return; }
      return this.say('Inácio Valente', q.active('decreto') ? 'O salão do castelo. A porta é a mais trancada da cidade. O rei abre para quem a princesa confia.' : 'Copiando, copiando. Papel some; três papéis não.');
    }
    if (fam.name === 'Clara Teixeira') {
      if (!q.q.flores) { await this.say('Clara Teixeira', 'Sir Thomas! O senhor sempre para nas rosas. Leve duas para a princesa: uma vermelha, uma branca.', 'Só entregue a certa. Uma princesa repara nessas coisas.'); q.start('flores'); return; }
      return this.say('Clara Teixeira', q.done('flores') ? (f.maiteWhite ? 'As brancas. Eu sabia que o senhor ia acertar... um dia.' : 'Vermelhas, foi? Ah, Thomas.') : 'Vermelha ou branca, Thomas. Pense bem.');
    }
    if (fam.name === 'Vasco Barroso' && f.notesVasco) return this.say('Vasco Barroso', 'O senhor leu meu bilhete, não leu? Então sabe. As pedras são soltas. Não conte ao capitão.');
    // everyone else: lines by job, hour and chapter
    const pro = this.chapter === 'prologue'; const h = this.hour; const act = n.activity?.kind;
    const lines = [];
    if (act === 'shop') lines.push(`${this.greeting}, Sir Thomas. Feira hoje: o Aldo baixou a farinha. Diz que é a Luz.`);
    else if (act === 'drink' || act === 'eat') lines.push('Sente, Thomas. A Helena serve rápido e cobra devagar.');
    else if (act === 'pray') lines.push('"Luz que não pedimos..." Perdão, Sir Thomas, estava rezando.');
    else if (h >= 19) lines.push(`Boa noite, Sir Thomas. Hora de ir para casa. ${first} não gosta de rua escura, mesmo com as lâmpadas.`);
    else lines.push(`${this.greeting}, Sir Thomas. ${first} ${({ feirante: 'vende na feira hoje', lavrador: 'tem horta para cuidar', jardineiro: 'poda os Jardins', aprendiz: 'ajuda o Lucas na forja', pedreiro: 'conserta a muralha', guarda: 'treina no Campo', sacristao: 'cuida da capela', taverneiro: 'serve na taverna', costureira: 'costura para a feira', carpinteiro: 'serra madeira perto da muralha', escriba: 'copia decretos', menestrel: 'canta na praça', curandeira: 'atende na capela', lenhador: 'corta lenha', crianca: 'brinca na praça', padeiro: 'assa pão', pescador: 'pesca no rio' })[job] || 'trabalha'}.`);
    if (pro) lines.push(['Que dia bonito. A Luz nunca brilhou tanto.', 'Viu os corvos na torre? Grandes demais para corvos.', 'O Gaspar está cobrando o dobro pelas poções. "Preço da Luz", ele diz.', 'A Dona Rosa fez pão de abóbora. Corra antes do Pipo.', 'O Lúcio não termina a terceira estrofe. Diz que depois do inverno só rima "volta".', 'A água do rio perto da muralha está morna. Em pleno outono. O Paulo viu.'][Math.floor(Math.random() * 6)]);
    else lines.push(['Nunca vi neve dentro das muralhas.', 'O rio parou de correr. Isso não é normal.', 'A princesa está cuidando de todo mundo. Que menina corajosa.', 'Dizem que uma sombra voou para a floresta.', 'A lenha do Rui finalmente vendeu.'][Math.floor(Math.random() * 5)]);
    return this.say(fam.name, ...lines);
  }
  // quest markers: '!' someone has a quest to give, '?' a quest is ready to hand in, null nothing
  questMark(id) {
    const q = this.game.quests, f = this.flags; const QID = { barqueiro: 'sapos', erveira: 'geleca', anciao: 'filhote', rei_passaro: 'penas', andarilha: 'dragao', cozinheira: 'mel', guarda: 'alfa', taverneira: 'ratos', padre: 'rainha', capitao: 'chave' }[id];
    if (id === 'rei_urso') return this.game.quests.done('filhote') && !this.flags.bala1 ? '!' : this.game.quests.done('biblioteca') && !this.flags.bala2 ? '?' : null;
    if (id === 'bibliotecaria') return !this.game.quests.q.biblioteca ? '!' : this.game.quests.ready('biblioteca') ? '?' : null;
    if (id === 'guilda') { const G = this.game.guild?.s; return !G || !G.joined ? '!' : G.missions?.list.some(m => !m.claimed && m.have >= m.n) ? '?' : null; }
    if (id === 'coruja') return this.chapter === 'ch3' && (!f.metOwl || (f.wolfDead && !f.owlDone)) ? (f.metOwl ? '?' : '!') : null;
    if (id === 'filhote') return q.active('filhote') && !f.cubFound ? '?' : null;
    if (id === 'maite' && q.active('flores') && !f.floresDone) return '?';
    if (!QID) return null; if (q.ready(QID)) return '?';
    const pro = this.chapter === 'prologue'; const needsPrologue = { mel: 1, alfa: 1 }[QID];
    if (!q.q[QID] && (!needsPrologue || pro) && !(QID === 'geleca' && !f.metLucia)) return '!';
    return null;
  }
  // ---------- people of the regions ----------
  async barqueiro() {
    const g = this.game, q = g.quests;
    if (q.ready('sapos')) { await this.say('Barqueiro Tobias', 'O Alfa caiu?! Então amanhã os barcos saem de novo. Lossot inteira te deve uma, Sir Thomas.', 'Fique com estas moedas e com isto: a pescadora diz que o pântano gosta de quem o respeita.'); g.addGold(120); g.addItem('antidoto', 3); q.complete('sapos'); return; }
    if (!q.q.sapos) { await this.say('Barqueiro Tobias', 'Um cavaleiro de Malace em Lossot! Pise nas tábuas, senhor: a lama aqui engole bota.', 'Os sapos-pantera sempre caçaram no pântano. Mas agora tem um, enorme, manchado como onça, no poço grande a noroeste. Os barcos não passam.');
      const c = await this.choose('Barqueiro Tobias', 'Ninguém aqui tem espada. O senhor tem.', [{ label: 'Eu cuido do Alfa.', hint: 'aceitar' }, { label: 'Sapos? Volto depois.', hint: 'recusar por ora' }]); if (c === 0) q.start('sapos'); else await this.say('Barqueiro Tobias', 'Volte. A lama espera.'); return; }
    return this.say('Barqueiro Tobias', q.active('sapos') ? 'O poço grande fica a noroeste, depois das raízes. Leve antídoto: a mordida deles queima por dentro.' : 'A água voltou a correr. Venha pescar um dia.');
  }
  async erveira() {
    const g = this.game, q = g.quests;
    if (q.ready('geleca')) { await this.say('Erveira Lúcia', 'A gosma parou de descer! As raízes já estão verdes de novo. O que tinha lá dentro?', ['Sir Thomas', 'Um rei. Feito de geleca. Com coroa.'], 'Claro que tinha coroa. Tome: poções da melhor erva que eu tenho.'); g.addItem('pocao_g', 2); g.addGold(90); q.complete('geleca'); g.hud.shop('erveira'); return; }
    if (!q.q.geleca && this.flags.metLucia) { const c = await this.choose('Erveira Lúcia', 'Sir Thomas, a gosma que escorre do castelo a norte está matando minhas ervas. Algo lá dentro alimenta aquilo tudo.', [{ label: 'Vou ao castelo.', hint: 'aceitar' }, { label: 'Só quero comprar.', hint: 'loja' }]); if (c === 0) q.start('geleca'); g.hud.shop('erveira'); return; }
    if (!this.flags.metLucia) { this.flags.metLucia = true; await this.say('Erveira Lúcia', 'Ervas, poções, antídotos. Tudo colhido no pântano, tudo lavado três vezes.', 'Contra sapo-pantera, antídoto. Contra geleca, paciência. E antídoto.'); }
    g.hud.shop('erveira');
  }
  pescadora() { return this.say('Pescadora Ana', this.game.quests.done('sapos') ? 'Peixe de novo na rede! O senhor quer um? Não? Então leve a história: o cavaleiro que espantou o sapo.' : 'Daqui do píer eu vejo o Alfa. Ele fica parado no poço como uma pedra manchada. Até pular.'); }
  // Rei Ulmo of the owl-bears: trusts whoever helped Pluma; gives the Bala do Conhecimento (one for Pluma, one for the pages)
  async reiUrso() {
    const g = this.game, q = g.quests, f = this.flags, R = 'Rei Ulmo';
    if (!f.metUlmo) { f.metUlmo = true; await this.say(R, 'Huu-huu. Um cavaleiro da Fortaleza no meu salão. Eu sou Ulmo, rei de Neveo e guardião da maior biblioteca do mundo.', 'Nós temos a força dos ursos e a paciência das corujas. Lemos tudo. Esquecemos nada. É por isso que os humanos nos acham estranhos.'); }
    if (!q.done('filhote')) { await this.say(R, 'Mas confiança não se lê: se ganha. O pequeno Pluma se perdeu na nevasca, e o Ancião Bruma não dorme desde então. Ajude o meu povo, e eu abro para você o que guardamos.'); return; }
    if (!f.bala1) { f.bala1 = true; await this.say(R, 'Você trouxe Pluma de volta. Neveo não esquece, e eu menos ainda.', 'Tome. É uma Bala do Conhecimento: mel das abelhas do telhado da biblioteca, cozido com a tinta de um livro que ninguém mais lê. Quem come lembra de coisas que nunca aprendeu.', 'Coma quando quiser ficar mais sábio. Ou mais forte. O conhecimento escolhe a forma que você precisa.'); g.addItem('bala_conhecimento'); g.save(); return; }
    if (q.done('biblioteca') && !f.bala2) { f.bala2 = true; await this.say(R, 'Pena-Velha me contou: o livro do homem-urubu está inteiro outra vez. Você devolveu ao mundo uma história que ele quis apagar.', 'Mais uma bala. E um conselho de rei: o Mordrak não foge da Luz. Ele vai para onde ela nasceu.'); g.addItem('bala_conhecimento'); g.save(); return; }
    await this.say(R, ['Huu. A Montanha Negra fica além do Desfiladeiro da Caveira. Os gaviões do Rei Pássaro veem mais longe que nós.', 'Os deuses antigos ainda ouvem, sabia? Hiberno é o nosso. Ele gosta de quem caça de noite e de quem protege os pequenos.', 'A biblioteca está aberta para você. Leia. Ler é a única viagem que não cansa.'][Math.floor(Math.random() * 3)]);
  }
  // Pena-Velha, keeper of the Great Library: the Lost Pages quest
  async bibliotecaria() {
    const g = this.game, q = g.quests, f = this.flags, P = 'Pena-Velha';
    if (!q.q.biblioteca) { await this.say(P, 'Shhh. Huu. Fale baixo, cavaleiro: aqui dentro até o vento lê.', 'Um dos nossos livros foi rasgado. "Sobre o Homem que Virou Urubu". O próprio homem levou as páginas e espalhou pelo reino, para que ninguém soubesse dele.', 'Cinco páginas. Uma no pântano de Lossot, uma no castelo de geleca, uma no Desfiladeiro da Caveira, uma na colina do Rei Pássaro... e a última onde os mortos guardam coroa.'); q.start('biblioteca'); return; }
    if (q.active('biblioteca') && q.ready('biblioteca')) { while (g.has('pagina_perdida')) g.removeItem('pagina_perdida'); q.complete('biblioteca'); g.player.gainXp(120);
      await this.say(P, 'As cinco! Deixe-me costurar...', '(Pena-Velha lê em voz alta) "...o homem se chamava Mordrak, alquimista da Montanha Negra. Queria a Luz para si, porque acreditava que a Luz roubava o inverno de outro lugar, e que esse lugar era o lar dele. Trocou a pele por penas para voar até a torre..."', 'Huu. Então não é só ganância. É uma dívida. Leve isso ao Rei Ulmo; ele vai querer ouvir.'); return; }
    if (q.active('biblioteca')) { const n = Object.keys(f.pages || {}).length; await this.say(P, `Você tem ${n} de 5 páginas. Procure com calma: páginas gostam de se esconder perto de coisas que ninguém quer visitar.`); return; }
    await this.say(P, ['Leia o que quiser. Só não dobre as pontas.', 'Temos livros sobre tudo. Até sobre livros.', 'O Ancião Bruma escreveu o Tratado sobre a Luz. Ele diz que errou na conta. Eu acho que não.'][Math.floor(Math.random() * 3)]);
  }
  async anciao() {
    const g = this.game, q = g.quests, f = this.flags;
    if (q.ready('filhote')) { await this.say('Ancião Bruma', 'Pluma voltou para casa com neve até as orelhas, falando de um humano de capa amarela.', 'A floresta não esquece quem ajuda. Vestimos com isto quem merece andar entre nós.'); g.addItem('capa_real'); q.complete('filhote'); f.ursosFriends = true; return; }
    if (!q.q.filhote) { await this.say('Ancião Bruma', 'Huuu. Você chegou pela trilha certa, cavaleiro. Os lobos não te comeram. Isso já diz algo.', 'Nós, ursos-corujas, olhamos antes de abrir a porta. E esta noite olhamos com medo: a nevasca levou um filhote.');
      const c = await this.choose('Ancião Bruma', 'Pluma saiu para ver a neve e não voltou. Os rastros iam para nordeste.', [{ label: 'Eu encontro Pluma.', hint: 'aceitar' }, { label: 'Por que estão com medo do norte?', hint: 'perguntar' }]);
      if (c === 1) await this.say('Ancião Bruma', 'Porque do alto da colina o Rei Pássaro viu uma sombra de asas passar para leste, levando uma luz amarela.', 'E desde então a neve não para. Encontre Pluma, e eu conto o resto.');
      q.start('filhote'); return; }
    return this.say('Ancião Bruma', q.active('filhote') ? 'Nordeste, cavaleiro. Depois dos pinheiros grandes. Filhote assustado se esconde e pia baixinho.' : 'O Rei Pássaro vê o que nós só ouvimos. Suba a colina a oeste, se quiser respostas.');
  }
  async ursoPinho() { await this.say('Urso Pinho', 'Trocas, trocas! Capas que aguentam nevasca, botas que não escorregam.'); this.game.hud.shop('ursos'); }
  async filhote() {
    const g = this.game, f = this.flags, n = g.npcs.filhote;
    if (f.cubFound) return this.say('Filhote Pluma', 'Piu! O cavaleiro amarelo!');
    if (!g.quests.active('filhote')) return this.say('Filhote Pluma', 'Piu... piu... (o filhote treme na neve)');
    await this.say('Filhote Pluma', 'Piu?! Você é grande. E amarelo. O Ancião mandou você?', ['Sir Thomas', 'Mandou. Vamos para casa, Pluma.'], 'Piu! (o filhote sacode a neve e sai correndo pela trilha)');
    f.cubFound = true; const N = g.city.regions.neveo; n.moveTo(N.city.x - 6, N.city.z + 6); n.anchor.set(N.city.x - 6, 0, N.city.z + 6); g.quests.check();
  }
  async reiPassaro() {
    const g = this.game, q = g.quests, f = this.flags;
    if (q.ready('penas')) { g.removeItem('pena', 3); await this.say('Rei Pássaro', 'Três penas dos meus guardas. Você lutou para subir. Então merece ouvir.', 'Vi o urubu. Não era um urubu: era um homem que aprendeu a ser ave. Ele voou para leste, depois para o sul, e desceu atrás do Desfiladeiro da Caveira, onde a montanha fica preta.', 'A Montanha Negra. Lá ele guarda a sua luz. Para chegar, alguém precisa passar pelo dragão.');
      await this.say('Rei Pássaro', 'Leve este elmo de penas. Do alto, tudo parece pequeno. Até o medo.'); g.addItem('elmo_rei'); q.complete('penas'); f.knowsMountain = true; return; }
    if (!q.q.penas) { await this.say('Rei Pássaro', 'Um cavaleiro na minha colina. Ninguém sobe aqui por acaso.', 'Eu vejo o reino inteiro daqui de cima. Mas não falo de graça: traga três penas dos gaviões que guardam as encostas, e eu conto o que vi.'); q.start('penas'); return; }
    return this.say('Rei Pássaro', 'Três penas. Os gaviões rondam as encostas da colina.');
  }
  async andarilha() {
    const g = this.game, q = g.quests;
    if (q.ready('dragao')) { await this.say('Andarilha Inês', 'O dragão... caiu? Eu ouvi o rugido daqui e achei que era o fim do mundo.', 'Agora a passagem para as montanhas está aberta. O que você vai encontrar do outro lado, ninguém sabe. Leve minhas economias: é o mínimo.'); g.addGold(300); q.complete('dragao'); return; }
    if (!q.q.dragao) { await this.say('Andarilha Inês', 'Não siga em frente, cavaleiro. Aquela caveira de pedra é um aviso: o Dragão Vermelho dorme no fundo do desfiladeiro.', 'Quanto mais perto, mais quente o ar. A neve some, as pedras ficam pretas. E ele acorda com qualquer passo.');
      const c = await this.choose('Andarilha Inês', 'Eu queria atravessar as montanhas. Faz três luas que espero.', [{ label: 'Eu vou enfrentá-lo.', hint: 'chefe muito difícil: nível 8 ou mais' }, { label: 'Ainda não estou pronto.', hint: 'recusar' }]); if (c === 0) q.start('dragao'); else await this.say('Andarilha Inês', 'Sábio. Treine. Volte com poções e escamas de dragão no peito.'); return; }
    return this.say('Andarilha Inês', 'Siga a trilha entre as pedras. Leve antídotos: o fogo dele queima por muito tempo.');
  }
  async coruja() {
    const g = this.game, f = this.flags;
    if (this.chapter !== 'ch3') return this.say('Sábia Coruja', 'Huu. Ainda não é a sua hora de me ouvir, cavaleiro. Volte quando o inverno chegar.');
    if (!f.metOwl) {
      await this.say('Sábia Coruja', 'Huuu. Sir Thomas da capa amarela. Eu sonhei com você três noites, como você sonhou com o urubu.', ['Sir Thomas', 'Você sabe o que era aquilo? Levou a Luz da torre.'], 'Era Mordrak. Já foi homem: um feiticeiro da Montanha Negra que aprendeu a ser ave. Quem muda de forma sempre perde um pedaço de si. Ele perdeu o calor.', 'A Luz amarela não é uma pedra. É um empréstimo do Relâmpago, e o reino esqueceu de pagar.', 'Para seguir a trilha dele você precisa ver através do gelo. O Lobisomem de Gelo guarda um coração congelado na toca de pedras ao sul daqui. Traga-o, e eu derreto o caminho.');
      const c = await this.choose('Sábia Coruja', 'Ele não volta depois de cair. Uma vez só. Está pronto?', [{ label: 'Estou.', hint: 'aceitar' }, { label: 'Você vem comigo?', hint: 'perguntar' }]);
      if (c === 1) await this.say('Sábia Coruja', 'Não, cavaleiro. Corujas veem; quem anda é você. E a princesa tem a jornada dela também. Cada um carrega a sua luz.');
      f.metOwl = true; g.save(); return;
    }
    if (f.wolfDead && g.has('coracao_gelo') && !f.owlDone) {
      g.removeItem('coracao_gelo'); await this.say('Sábia Coruja', 'O coração ainda bate. Devagar, como o inverno.', '(A coruja abre as asas sobre o coração. O gelo racha, e dentro dele aparece uma pena negra.)', 'Uma pena de Mordrak. Ela aponta para onde ele está. Mas é longe, e o caminho tem dono.', 'Suba a Colina do Rei Pássaro. Do alto ele viu para onde o urubu voou. E leve isto: uma pena minha, para enxergar no escuro do inverno.');
      g.addItem('pena_coruja'); f.owlDone = true; g.save(); return;
    }
    if (!f.wolfDead) return this.say('Sábia Coruja', 'A toca de pedras fica ao sul, depois da trilha. Ele uiva antes de atacar. Escute o uivo.');
    return this.say('Sábia Coruja', 'O Rei Pássaro, cavaleiro. A oeste e ao norte, além da Floresta de Neveo.');
  }
  // ---------- chapters ----------
  async run(save) {
    const g = this.game, h = g.hud, p = g.player, c = g.city;
    if (save) return this.winter(save);
    const hs = c.homeSpawn; p.teleport(hs.x, hs.z, Math.PI); p.leftItem = 'none'; g.setPreset('day');
    await h.fade(0, 2.5); h.chapter('PRÓLOGO', 'O Vale Vivo'); await wait(2500);
    this.objective('Explore a cidade e fale com a Princesa Eleonora na praça', g.npcs.maite.pos);
    await this.waitUntil(() => this.flags.talkedMaite);
    g.setPreset('dusk'); this.objective('Converse com os moradores. Quando quiser, descanse na sua cama', c.bedPos); this.flags.canSleep = true;
    h.toast('Dica: as casas têm portas (E). Moradores voltam para casa ao anoitecer.', 5000);
    await this.waitUntil(() => this.flags.slept);
    // ---- Chapter I ----
    await h.fade(1, 1.5); this.chapter = 'night'; g.setPreset('night'); p.teleport(hs.x, hs.z, Math.PI); p.leftItem = 'shield'; p.frozen = true; g.villagersVisible(false);
    await wait(1200); h.fade(0, 2); await wait(2500);
    g.audio.crash(); p.shake = 1.8; h.toast('CRAASH!', 1500); await wait(1200);
    h.chapter('CAPÍTULO I', 'A Noite Sem Luz'); p.frozen = false;
    this.objective('Algo aconteceu na Torre da Luz! Corra até a Praça da Luz', c.altar);
    g.spawnBoss(); g.guardsRun(); h.toast('Mordrak está na torre!', 2000);
    await this.waitUntil(() => p.pos.distanceTo(c.altar) < 9);
    g.boss.phase = 'fight'; g.boss.t = 0;
    this.objective('Impeça o urubu! Acerte-o quando ele mergulhar', null);
    h.toast('CLIQUE para atacar · BOTÃO DIREITO para defender · ESPAÇO para esquivar', 6000);
    await this.waitUntil(() => g.boss && g.boss.phase === 'done');
    await wait(400); g.audio.boom(); p.shake = 2.5; g.flash = 1.6; await wait(500); await h.fade(1, 0.6); p.frozen = true; p.leftItem = 'none'; p.hp = Math.max(p.hp, 30);
    await wait(2500); await this.winter(null);
  }
  async winter(save) {
    const g = this.game, h = g.hud, p = g.player, c = g.city;
    this.chapter = 'winter'; this.flags.shieldBroken = true; if (g.boss) { g.boss.remove(); g.entities = g.entities.filter(e => e !== g.boss); g.boss = null; }
    g.setPreset('winter'); c.setWinter(true); c.setLightStolen(true); g.minimap.rebuild(true); g.audio.setWind(true); g.equip.escudo = null; g.applyEquip(); g.villagersVisible(true);
    g.npcs.maite.moveTo(c.smithPos[0], c.smithPos[1] + 3); g.npcs.ferreiro.moveTo(c.smithPos[0] + 1.5, c.smithPos[1] - 2.5); g.npcs.pipo.moveTo(c.cookPos[0] + 3, c.cookPos[1]);
    g.placeWinterProps();
    const hs = c.homeSpawn; if (save) g.loadSave(save); else { p.teleport(hs.x, hs.z, Math.PI); p.frozen = true; }
    p.dead = false; p.leftItem = 'torch'; p.cold = 0; p.hp = Math.max(p.hp, 40);
    await h.fade(0, 3.5);
    if (!save) { h.chapter('CAPÍTULO II', 'O Inverno Retorna'); await wait(3500); h.bigTitle(6500); g.audio.chime(); await wait(3000); p.frozen = false; }
    if (!this.flags.talkedMaite2) { this.objective('Fale com Eleonora, na forja', g.npcs.maite.pos); await this.waitUntil(() => this.flags.talkedMaite2); g.save(); }
    this.objective('Siga as marcas de fumaça negra pela estrada do leste até a Floresta Congelada', c.forestGate);
    h.toast('Dica: fogueiras aquecem, curam e salvam o jogo', 5000);
    if (!this.flags.reachedForest) { await this.waitUntil(() => p.pos.x > c.forestGate.x - 2 && Math.abs(p.pos.z) < 10); this.flags.reachedForest = true; g.save(); }
    await this.chapter3();
  }
  // ---------- Chapter III: the Ice Werewolf and the Wise Owl ----------
  async chapter3() {
    const g = this.game, h = g.hud, p = g.player, c = g.city, f = this.flags, F = c.regions.floresta, at = ([x, z]) => ({ x, z });
    this.chapter = 'ch3';
    if (!f.ch3Intro) { h.chapter('CAPÍTULO III', 'O Lobisomem de Gelo e a Sábia Coruja'); g.audio.chime(); f.ch3Intro = true; g.save(); await wait(4000); }
    if (!f.metOwl) { this.objective('Encontre a Sábia Coruja na grande árvore da Floresta Congelada', at(F.owl)); await this.waitUntil(() => f.metOwl); }
    if (!f.wolfDead) { this.objective('Derrote o Lobisomem de Gelo na toca de pedras', at(F.den)); g.spawnMonster('lobisomem', F.den[0] + 4, F.den[1]); h.toast('Um uivo corta a floresta...', 3000); g.audio.wolf(); await this.waitUntil(() => f.wolfDead); h.toast('O Lobisomem de Gelo caiu. Ele não voltará.', 3500); }
    if (!f.owlDone) { this.objective('Leve o Coração de Gelo à Sábia Coruja', at(F.owl)); await this.waitUntil(() => f.owlDone); }
    if (!f.ch3Done) { f.ch3Done = true; g.save(); this.finish(); }
    const K = c.regions.colina.king; this.objective(g.quests.done('penas') ? 'A Montanha Negra fica além do Desfiladeiro da Caveira. Prepare-se para o dragão' : 'Suba a Colina do Rei Pássaro: do alto ele viu para onde Mordrak voou', g.quests.done('penas') ? at(c.regions.desfiladeiro.dragon) : at(K));
  }
  finish() { const g = this.game, p = g.player; const e = document.getElementById('end'); e.querySelector('.et').textContent = 'FIM DO CAPÍTULO III'; e.querySelectorAll('.es')[0].textContent = 'A Sábia Coruja derreteu o coração de gelo e encontrou uma pena de Mordrak.'; e.querySelectorAll('.es')[1].textContent = 'A história continua no Capítulo IV — O Rei Pássaro e a Montanha Negra. O reino inteiro já está aberto para explorar.'; g.input.unlock(); document.getElementById('end-stats').innerHTML = `Golpes acertados: ${p.stats.hits}<br>Monstros derrotados: ${p.stats.kills || 0} (lobos: ${p.stats.wolves})<br>Baús abertos: ${p.stats.chests}`; document.getElementById('end').style.display = 'flex'; }
}
