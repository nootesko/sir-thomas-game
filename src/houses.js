// Who lives in the city: families, their jobs, the notes they leave at home and what their chests hold.
// Houses are assigned in order; houses beyond the curated list get a family generated from the name pools.
let seed = 777; const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = a => a[Math.floor(rng() * a.length)];
export const FIRST = ['Aldo', 'Berta', 'Cassiano', 'Dalila', 'Ernesto', 'Fiona', 'Gael', 'Helena', 'Inácio', 'Joana', 'Lúcio', 'Marta', 'Nuno', 'Olívia', 'Paulo', 'Quitéria', 'Rui', 'Sofia', 'Teodoro', 'Úrsula', 'Vasco', 'Zélia', 'Bento', 'Clara', 'Davi', 'Elisa', 'Fausto', 'Gilda', 'Hugo', 'Iara', 'Jorge', 'Lia', 'Matias', 'Nina', 'Otávio', 'Perpétua', 'Raul', 'Selma', 'Tomé', 'Violeta'];
export const LAST = ['Ferreira', 'Pedreiro', 'Moleiro', 'Carvalho', 'Fonseca', 'Ribeiro', 'Serrano', 'Barroso', 'Teixeira', 'Amaral', 'Castelo', 'Valente', 'Dourado', 'Nogueira', 'Pires', 'Rocha', 'Lobo', 'Sol', 'Prado', 'Vale'];
// job -> where they spend the day (resolved by the city into a world position) and how they describe it
export const JOBS = {
  feirante:   { spot: 'market',  label: 'vende na feira' },
  lavrador:   { spot: 'hortas',  label: 'cuida das hortas' },
  jardineiro: { spot: 'jardins', label: 'poda os Jardins' },
  aprendiz:   { spot: 'forja',   label: 'ajuda na forja' },
  pedreiro:   { spot: 'muralha', label: 'conserta a muralha' },
  guarda:     { spot: 'treino',  label: 'treina no Campo' },
  sacristao:  { spot: 'capela',  label: 'cuida da capela' },
  taverneiro: { spot: 'taverna', label: 'serve na taverna' },
  costureira: { spot: 'market',  label: 'costura para a feira' },
  carpinteiro:{ spot: 'muralha', label: 'serra madeira' },
  escriba:    { spot: 'castelo', label: 'copia decretos no castelo' },
  menestrel:  { spot: 'praca',   label: 'canta na praça' },
  curandeira: { spot: 'capela',  label: 'atende doentes na capela' },
  lenhador:   { spot: 'hortas',  label: 'corta lenha' },
  crianca:    { spot: 'praca',   label: 'brinca na praça' },
  padeiro:    { spot: 'padaria', label: 'assa pão' },
  pescador:   { spot: 'poco',    label: 'pesca no rio' },
};
const JOB_LIST = Object.keys(JOBS).filter(j => j !== 'crianca');
// Curated households. lock: 0 open, 1 fácil, 2 média, 3 difícil, 4 muito difícil. chest: what they keep.
export const FAMILIES = [
  { name: 'Aldo Moleiro', job: 'feirante', note: ['Caderno de contas', 'Três sacos de farinha para a Dona Rosa, pagos. Dois para a taverna, fiados. O Gaspar quer comprar a mula... diz que o preço cai "com a Luz tão forte". Que a Luz tenha a ver com mulas, só ele explica.'], lock: 0, chest: { gold: 6, items: { pao: 2 } } },
  { name: 'Berta Carvalho', job: 'costureira', note: ['Carta não enviada', 'Mãe, costurei a capa azul para a Princesa Eleonora. Ela veio em pessoa buscar, sem séquito, sem nada. Sentou na minha cozinha e tomou chá. Diz que o Thomas vai dormir até o meio-dia se ninguém o acordar. Uma princesa que ri assim... o reino está em boas mãos.'], lock: 1, chest: { gold: 14, items: { capa: 1 } } },
  { name: 'Cassiano Rocha', job: 'guarda', note: ['Diário de ronda', 'Noite 3: corvos na torre outra vez. Grandes. O Olavo diz que é nada. Noite 4: um deles pousou na pedra da Luz e a Luz piscou. Eu vi. Não escrevi no relatório porque o capitão ia rir.'], lock: 2, chest: { gold: 22, items: { pocao_p: 1 } } },
  { name: 'Dalila Fonseca', job: 'curandeira', note: ['Receituário', 'Para febre: casca de salgueiro e mel silvestre das abelhas do vale. Para o frio nos ossos: sopa quente, e ficar perto de quem se ama. Para o medo: não há remédio, só companhia.'], lock: 0, chest: { gold: 4, items: { mel: 2, pocao_p: 1 } } },
  { name: 'Ernesto Barroso', job: 'pedreiro', note: ['Nota rabiscada', 'A pedra dourada da muralha não é daqui. Nenhuma pedreira do vale dá essa cor. Meu avô dizia que a muralha foi erguida na mesma noite em que a Luz chegou. Mentira de avô, claro. Mas as juntas não têm argamassa.'], lock: 1, chest: { gold: 9, items: {} } },
  { name: 'Fiona Serrano', job: 'jardineiro', note: ['Lista de sementes', 'Rosas do vale, girassóis, lavanda da margem do rio. Tudo floresce cedo demais este ano. As abelhas estão do tamanho de pardais. Ninguém acha estranho porque está tudo bonito. Eu acho estranho.'], lock: 0, chest: { gold: 3, items: { mel: 1 } } },
  { name: 'Gael Teixeira', job: 'aprendiz', note: ['Papel de forja', 'O mestre Lucas disse que o escudo do Sir Thomas é o único objeto da cidade que não enferruja. Nem a Espada Real. Ele acha que é a Luz. Eu acho que é o Thomas que limpa todo dia, mas não digo.'], lock: 1, chest: { gold: 11, items: { ferro: 1 } } },
  { name: 'Rute Amaral', job: 'taverneiro', note: ['Caderno da irmã da taverneira', 'Dívidas: Aldo (2 sacos). Gaspar (não paga, "cobra do rei"). Um viajante do norte pagou com uma moeda preta que não é de nenhum reino. Perguntei de onde vinha. Ele disse "de onde o sol não chega" e foi embora antes do pão.'], lock: 2, chest: { gold: 30, items: { queijo: 2 } } },
  { name: 'Inácio Valente', job: 'escriba', note: ['Rascunho de decreto', '"Por ordem de Sua Majestade, fica proibido subir à Torre da Luz sem escolta." O rei ditou isso e rasgou no mesmo dia. Disse que proibir chama atenção. Guardei o rascunho. Alguma coisa o assustou.'], lock: 3, chest: { gold: 40, items: {} } },
  { name: 'Joana Pires', job: 'lavrador', note: ['Almanaque das hortas', 'Colheita de abóbora: o dobro do ano passado. Batata: o triplo. A terra não cansa. O padre diz que é bênção. Meu pai dizia que o que não cansa, um dia para de vez.'], lock: 0, chest: { gold: 5, items: { pao: 1, queijo: 1 } } },
  { name: 'Lúcio Dourado', job: 'menestrel', note: ['Letra inacabada', '"Na torre de ouro um brilho nasceu / o vale floriu, o inverno morreu..." Falta a terceira estrofe. Toda vez que tento escrever o que vem depois do inverno, só me ocorre a palavra "volta". Não rima com nada.'], lock: 0, chest: { gold: 2, items: {} } },
  { name: 'Marta Nogueira', job: 'feirante', note: ['Recado para o filho', 'Pipo, se você ler isto é porque mexeu na minha gaveta de novo. O pão está no cesto, as moedas NÃO são para doces, e não vá atrás do Sir Thomas quando ele sair da cidade. Ele tem espada. Você tem onze anos.'], lock: 1, chest: { gold: 8, items: { pao: 3 } } },
  { name: 'Nuno Castelo', job: 'carpinteiro', note: ['Medidas', 'Portão sul: dobradiças novas do Lucas, encaixe perfeito. Caixões: nenhum encomendado este ano. Nenhum. Numa cidade deste tamanho. Guardei a madeira mesmo assim.'], lock: 1, chest: { gold: 12, items: {} } },
  { name: 'Olívia Lobo', job: 'sacristao', note: ['Oração copiada', '"Luz que não pedimos, Luz que não pagamos, que não cobre o preço de uma vez só." É a oração mais antiga do livro da capela. Nenhum padre sabe explicar a última parte.'], lock: 2, chest: { gold: 18, items: { pocao_p: 1 } } },
  { name: 'Paulo Prado', job: 'pescador', note: ['Marcas no caderno', 'O rio dá peixe como nunca. Mas a água perto da muralha oeste está morna. Em pleno outono. Pus a mão e tirei depressa. Não contei para a Joana para não assustar.'], lock: 0, chest: { gold: 6, items: { carne: 1 } } },
  { name: 'Quitéria Vale', job: 'costureira', note: ['Encomenda', 'Capa de lã para o Gaspar, forro duplo. Ele pediu "para uma viagem longa, para o norte". Ninguém viaja para o norte. Não há nada no norte além da floresta.'], lock: 2, chest: { gold: 15, items: { capa: 1 } } },
  { name: 'Rui Ferreira', job: 'lenhador', note: ['Conta de lenha', 'Vendi lenha para a cidade inteira e ninguém acendeu lareira. Está quente demais. Os pinheiros do leste estão com a casca rachada, como se tivessem sido queimados por dentro.'], lock: 0, chest: { gold: 7, items: {} } },
  { name: 'Sofia Ribeiro', job: 'crianca', note: ['Desenho', 'Um desenho a carvão: a torre, a Luz, e um pássaro enorme em cima, maior que a torre. Embaixo, em letras tortas: "O PASSARO QUER A LUZ". Está datado de três dias atrás.'], lock: 0, chest: { gold: 1, items: { pe_coelho: 1 } } },
  { name: 'Teodoro Sol', job: 'guarda', note: ['Ordem do dia', 'Capitão mandou dobrar a guarda do portão leste "até segunda ordem". Não disse por quê. O Olavo acha que é por causa dos corvos. Eu acho que o capitão também viu a Luz piscar.'], lock: 3, chest: { gold: 35, items: { elmo: 1 } } },
  { name: 'Úrsula Moleiro', job: 'padeiro', note: ['Receita da avó', 'Pão de abóbora: farinha do Aldo, abóbora da Joana, mel da Fiona, e tempo. A Dona Rosa diz que o segredo é o forno. O segredo é esperar.'], lock: 0, chest: { gold: 5, items: { pao: 4 } } },
  { name: 'Vasco Barroso', job: 'pedreiro', note: ['Bilhete escondido', 'Se alguém achar isto: há uma passagem nos esgotos, sob a grade do cruzamento, que leva para fora da muralha. Fechei com pedras. Se um dia a cidade precisar sair sem ser vista... as pedras são soltas.'], lock: 4, chest: { gold: 60, items: { gazua: 3 } } },
  { name: 'Zélia Fonseca', job: 'curandeira', note: ['Lembrete', 'A Princesa Eleonora perguntou se existe remédio para "um sonho que se repete". Disse que é do Sir Thomas. Um urubu, toda noite. Receitei chá de camomila. Não é remédio para isso.'], lock: 1, chest: { gold: 10, items: { pocao_p: 2 } } },
  { name: 'Bento Serrano', job: 'feirante', note: ['Lista de preços', 'Pele de lobo: 24 moedas, ninguém traz há meses. Ferrão de abelha: 12. Escama de serpente: 16. Rabo de rato: 4, e só compro porque o Gaspar compra. Dizem que os ratos do esgoto estão do tamanho de gatos.'], lock: 1, chest: { gold: 13, items: {} } },
  { name: 'Clara Teixeira', job: 'jardineiro', note: ['Diário', 'Hoje o Sir Thomas passou pelos Jardins e parou para olhar as rosas. Ele sempre para. Diz que a Princesa gosta das vermelhas. Ela gosta das brancas. Um dia alguém conta para ele.'], lock: 0, chest: { gold: 4, items: {} } },
];
const NOTE_TEMPLATES = [
  ['Bilhete na mesa', (f, j) => `${f} saiu cedo: "${JOBS[j].label}" é o que responde quando perguntam. A sopa está no fogo. Não deixem o gato sair.`],
  ['Conta de gastos', (f) => `Pão, 8. Queijo, 10. Vela, 2. Uma moeda para o menestrel da praça, que cantou a música da Luz de novo. ${f} anota tudo, menos o que gasta na taverna.`],
  ['Carta de parente', (f) => `"${f.split(' ')[0]}, aqui no vale do sul chove há um mês. Vocês aí com esse sol o ano todo. Um dia venho ver essa Luz de perto. Dizem que ela nunca apaga."`],
  ['Lista de tarefas', (f, j) => `Consertar a cerca. Pagar o Aldo. Levar os sapatos ao sapateiro. ${JOBS[j].label.charAt(0).toUpperCase() + JOBS[j].label.slice(1)} antes do meio-dia. Dormir cedo: amanhã tem feira.`],
  ['Página de diário', (f) => `Dormi mal. Sonhei com um pássaro preto no telhado. ${f.split(' ')[0]} diz que é só o calor. Mas acordei com frio, no meio do verão.`],
  ['Recado', (f) => `${f.split(' ')[0]}: a Dona Rosa deixou pão de abóbora. O guarda Olavo passou perguntando se vimos corvos. Corvos! Como se faltasse corvo nesta cidade.`],
];
let gi = 0; const USED_NAMES = new Set();
export function familyFor(index) {
  if (!USED_NAMES.size) for (const f of FAMILIES) USED_NAMES.add(f.name);
  if (index < FAMILIES.length) return { ...FAMILIES[index], curated: true };
  // every resident gets a name nobody else in town has (the combinations used to repeat after a few dozen houses)
  let first, last, name; for (let k = 0; ; k++) { first = FIRST[(index * 7 + gi + k) % FIRST.length]; last = LAST[(index * 3 + Math.floor(k / FIRST.length)) % LAST.length]; name = `${first} ${last}`; if (!USED_NAMES.has(name) || k > FIRST.length * LAST.length) break; } gi++; USED_NAMES.add(name);
  const job = JOB_LIST[(index * 5) % JOB_LIST.length];
  const [title, fn] = NOTE_TEMPLATES[index % NOTE_TEMPLATES.length]; const lock = rng() < 0.55 ? 0 : rng() < 0.6 ? 1 : 2;
  return { name, job, note: [title, fn(name, job)], lock, chest: { gold: Math.floor(rng() * 10), items: rng() < 0.3 ? { pao: 1 } : {} }, curated: false };
}
// What the special buildings hold
export const SPECIAL = {
  home:     { name: 'Sir Thomas', note: ['Bilhete da Eleonora', '"Thomas: deixei duas gazuas no baú, caso você se tranque para fora de novo. Não conte ao Olavo. — M."'], lock: 0, chest: { gold: 0, items: { gazua: 2 } } },
  tavern:   { name: 'Helena Amaral', note: ['Quadro de avisos', '"Procura-se: quem tirou o barril de cerveja do porão. Recompensa: outro barril." · "Ratos no porão de novo. Quem matar dez ganha jantar de graça." · "Noite de música: Lúcio Dourado, toda sexta."'], lock: 0, chest: { gold: 20, items: { queijo: 2, pao: 2 }, lock: 2 } },
  chapel:   { name: 'Padre Anselmo', note: ['Livro da capela', '"A Luz chegou numa noite sem lua, carregada por ninguém. Pousou na torre como se a torre fosse feita para ela. Desde então o vale não conhece inverno. Que o preço disso nunca seja cobrado de nós."'], lock: 0, chest: { gold: 25, items: { pocao_g: 1 }, lock: 3 } },
  smithy:   { name: 'Ferreiro Lucas', note: ['Anotações do Lucas', 'Escudo do Thomas: sem ferrugem, sem arranhão, 9 anos. Espada Real: idem. Dobradiças do portão: ferro comum, trocar a cada 2 anos. Conclusão: o que é do reino não gasta. O que é meu gasta.'], lock: 0, chest: { gold: 30, items: { ferro: 1 }, lock: 2 } },
  bakery:   { name: 'Dona Rosa', note: ['Caderno da Dona Rosa', 'Sopa de abóbora para o Thomas (ele finge que não gosta). Pão de mel para a Eleonora. Para o Pipo, nada: ele já comeu o de ontem, o de hoje e o de amanhã.'], lock: 0, chest: { gold: 8, items: { pao: 3, sopa: 1 }, lock: 1 } },
  barracks: { name: 'Capitão Cassios', note: ['Registro da guarda', 'Dia 12: corvos, muitos. Dia 13: a Luz piscou duas vezes à noite. Dia 14: ordem de dobrar a guarda do leste. Dia 15: o rei pediu para não registrar mais os corvos. Registrando mesmo assim.'], lock: 0, chest: { gold: 45, items: { elmo: 1, pocao_p: 2 }, lock: 3 } },
  keep:     { name: 'Rei Ataúlfo', note: ['Decreto rasgado', '"...a Luz não nos pertence. Foi deixada conosco. Se um dia for levada, que ninguém da Fortaleza vá atrás dela sem saber o que ela custa." Assinado e rasgado pelo rei, no mesmo dia.'], lock: 4, chest: { gold: 150, items: { aco: 1, amuleto: 1 }, lock: 4 } },
};
