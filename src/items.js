// Item catalogue. Prices are in moedas; selling pays half. Food heals slowly over time, potions heal at once.
export const SLOTS = ['espada', 'escudo', 'armadura', 'elmo', 'capa', 'botas', 'amuleto', 'anel'];
export const SLOT_NAMES = { espada: 'Espada', escudo: 'Escudo', armadura: 'Armadura', elmo: 'Elmo', capa: 'Capa', botas: 'Botas', amuleto: 'Amuleto', anel: 'Anel' };
const sword = (id, name, dano, price, lvl, rarity, extra = {}) => ({ id, slot: 'espada', rarity, icon: 'esp_' + id, name, lvl, stats: { dano }, price, sword: id, ...extra });
const armor = (id, name, defesa, price, lvl, rarity, extra = {}) => ({ id, slot: 'armadura', rarity, icon: 'arm_' + id, name, lvl, stats: { defesa }, price, ...extra });
const food = (id, name, vida, price, note) => ({ id, slot: null, rarity: 'comum', icon: id, name, lvl: 1, stats: { vida }, price, consumable: true, food: true, stack: true, note: note || 'Recupera vida aos poucos' });
const mat = (id, name, icon, price, note) => ({ id, slot: null, rarity: 'comum', icon, name, lvl: 1, stats: {}, price, material: true, stack: true, note });
export const ITEMS = {
  // ---- espadas ----
  real:         { id: 'real', slot: 'espada', rarity: 'comum', icon: 'espada', name: 'ESPADA REAL', lvl: 1, stats: { dano: 18 }, sword: 'real', price: 120 },
  ferro:        sword('ferro', 'ESPADA DE FERRO', 14, 60, 1, 'comum'),
  aco:          sword('aco', 'ESPADA DE AÇO', 22, 220, 3, 'raro'),
  fogo:         sword('fogo', 'ESPADA DE FOGO', 30, 700, 6, 'epico', { note: 'Queima o inimigo por alguns segundos', burn: true }),
  dente_dragao: sword('dente_dragao', 'DENTE DE DRAGÃO', 42, 2600, 10, 'lendario'),
  glacial:      { id: 'glacial', slot: 'espada', rarity: 'epico', icon: 'glacial', name: 'ESPADA GLACIAL', lvl: 3, stats: { dano: 24, frio: 10 }, sword: 'glacial', note: 'Congela inimigos pequenos', price: 500 },
  // ---- armaduras ----
  roupa:         { id: 'roupa', slot: 'armadura', rarity: 'comum', icon: 'armadura', name: 'ROUPA AZUL DO REINO', lvl: 1, stats: { defesa: 2 }, price: 20 },
  couro:         armor('couro', 'ARMADURA DE COURO', 4, 50, 1, 'comum'),
  latao:         armor('latao', 'ARMADURA DE LATÃO', 6, 140, 2, 'comum'),
  bronze:        armor('bronze', 'ARMADURA DE BRONZE', 8, 260, 3, 'raro'),
  cobre:         armor('cobre', 'ARMADURA DE COBRE', 10, 420, 4, 'raro'),
  prata:         armor('prata', 'ARMADURA DE PRATA', 13, 800, 6, 'epico'),
  ouro:          armor('ouro', 'ARMADURA DE OURO', 16, 1500, 8, 'epico'),
  escama_dragao: armor('escama_dragao', 'ESCAMAS DE DRAGÃO', 24, 4000, 10, 'lendario', { stats: { defesa: 24, frio: 20 } }),
  // ---- outros equipamentos ----
  reino:   { id: 'reino', slot: 'escudo', rarity: 'raro', icon: 'escudo', name: 'ESCUDO DO REINO', lvl: 1, stats: { defesa: 6 }, price: 200 },
  broquel:        { id: 'broquel', slot: 'escudo', rarity: 'comum', icon: 'escudo', tint: '#8a5a2e', name: 'BROQUEL DE MADEIRA', lvl: 1, stats: { defesa: 2 }, price: 35 },
  escudo_ferro:   { id: 'escudo_ferro', slot: 'escudo', rarity: 'comum', icon: 'escudo', tint: '#9aa2ad', name: 'ESCUDO DE FERRO', lvl: 2, stats: { defesa: 4 }, price: 120 },
  escudo_bronze:  { id: 'escudo_bronze', slot: 'escudo', rarity: 'raro', icon: 'escudo', tint: '#8c5a3a', name: 'ESCUDO DE BRONZE', lvl: 4, stats: { defesa: 7 }, price: 380 },
  escudo_prata:   { id: 'escudo_prata', slot: 'escudo', rarity: 'epico', icon: 'escudo', tint: '#d8dde5', name: 'ESCUDO DE PRATA', lvl: 6, stats: { defesa: 10, vida: 10 }, price: 900 },
  capa:    { id: 'capa', slot: 'capa', rarity: 'comum', icon: 'capa', name: 'CAPA DE LÃ', lvl: 1, stats: { frio: 35, defesa: 1 }, price: 40 },
  botas:   { id: 'botas', slot: 'botas', rarity: 'raro', icon: 'botas', name: 'BOTAS DO CAMINHANTE', lvl: 2, stats: { frio: 30, defesa: 2 }, price: 90 },
  elmo:    { id: 'elmo', slot: 'elmo', rarity: 'raro', icon: 'elmo', name: 'ELMO DO VALE', lvl: 2, stats: { defesa: 4, vida: 25 }, price: 150 },
  anel:    { id: 'anel', slot: 'anel', rarity: 'epico', icon: 'anel', name: 'ANEL DA PRINCESA', lvl: 1, stats: { vida: 20, defesa: 2 }, price: 300, note: 'Protege quem usa, não quem dá' },
  amuleto: { id: 'amuleto', slot: 'amuleto', rarity: 'epico', icon: 'amuleto', name: 'AMULETO DA CHAMA', lvl: 3, stats: { frio: 50, vida: 10 }, price: 400 },
  // ---- conjuntos por liga (elmos, botas, capas, anéis, amuletos) ----
  elmo_couro:   { id: 'elmo_couro', slot: 'elmo', rarity: 'comum', icon: 'elmo', tint: '#8a5a2e', name: 'ELMO DE COURO', lvl: 1, stats: { defesa: 2 }, price: 40 },
  elmo_bronze:  { id: 'elmo_bronze', slot: 'elmo', rarity: 'raro', icon: 'elmo', tint: '#8c5a3a', name: 'ELMO DE BRONZE', lvl: 3, stats: { defesa: 5 }, price: 180 },
  elmo_prata:   { id: 'elmo_prata', slot: 'elmo', rarity: 'epico', icon: 'elmo', tint: '#d8dde5', name: 'ELMO DE PRATA', lvl: 6, stats: { defesa: 8, vida: 10 }, price: 650 },
  elmo_ouro:    { id: 'elmo_ouro', slot: 'elmo', rarity: 'epico', icon: 'elmo', tint: '#f6c12e', name: 'ELMO DE OURO', lvl: 8, stats: { defesa: 11, vida: 20 }, price: 1300 },
  botas_couro:  { id: 'botas_couro', slot: 'botas', rarity: 'comum', icon: 'botas', tint: '#8a5a2e', name: 'BOTAS DE COURO', lvl: 1, stats: { defesa: 1, frio: 10 }, price: 35 },
  botas_bronze: { id: 'botas_bronze', slot: 'botas', rarity: 'raro', icon: 'botas', tint: '#8c5a3a', name: 'BOTAS DE BRONZE', lvl: 3, stats: { defesa: 3, frio: 15 }, price: 160 },
  botas_prata:  { id: 'botas_prata', slot: 'botas', rarity: 'epico', icon: 'botas', tint: '#d8dde5', name: 'BOTAS DE PRATA', lvl: 6, stats: { defesa: 5, frio: 25 }, price: 560 },
  capa_veludo:  { id: 'capa_veludo', slot: 'capa', rarity: 'raro', icon: 'capa', tint: '#7a3a9a', name: 'CAPA DE VELUDO', lvl: 3, stats: { defesa: 2, frio: 45 }, price: 220 },
  capa_real:    { id: 'capa_real', slot: 'capa', rarity: 'epico', icon: 'capa', tint: '#f6c12e', name: 'CAPA AMARELA REAL', lvl: 5, stats: { defesa: 4, frio: 55, vida: 15 }, price: 0, note: 'Tecida pelos ursos-corujas para quem ajuda a floresta' },
  anel_cobre:   { id: 'anel_cobre', slot: 'anel', rarity: 'comum', icon: 'anel', tint: '#d07a3a', name: 'ANEL DE COBRE', lvl: 1, stats: { vida: 10 }, price: 60 },
  anel_prata:   { id: 'anel_prata', slot: 'anel', rarity: 'raro', icon: 'anel', tint: '#d8dde5', name: 'ANEL DE PRATA', lvl: 4, stats: { vida: 20, defesa: 1 }, price: 260 },
  anel_ouro:    { id: 'anel_ouro', slot: 'anel', rarity: 'epico', icon: 'anel', tint: '#f6c12e', name: 'ANEL DE OURO', lvl: 7, stats: { vida: 30, defesa: 2 }, price: 900 },
  amuleto_bronze: { id: 'amuleto_bronze', slot: 'amuleto', rarity: 'comum', icon: 'amuleto', tint: '#8c5a3a', name: 'AMULETO DE BRONZE', lvl: 2, stats: { frio: 20, vida: 5 }, price: 120 },
  // ---- únicos (só caem de chefes ou vêm de missões) ----
  presa_lobisomem: { id: 'presa_lobisomem', slot: 'espada', rarity: 'lendario', icon: 'glacial', tint: '#bfe6ff', name: 'PRESA DO LOBISOMEM', lvl: 6, stats: { dano: 34, frio: 15 }, sword: 'glacial', price: 1200, unique: true, note: 'Congela quem ela corta' },
  pena_coruja:  { id: 'pena_coruja', slot: 'amuleto', rarity: 'lendario', icon: 'amuleto', tint: '#e8e0cc', name: 'PENA DA SÁBIA CORUJA', lvl: 5, stats: { frio: 40, vida: 25, defesa: 2 }, price: 0, unique: true, note: 'Quem a usa enxerga no escuro do inverno' },
  coroa_geleca: { id: 'coroa_geleca', slot: 'anel', rarity: 'lendario', icon: 'anel', tint: '#6ad050', name: 'COROA DO REI GELECA', lvl: 5, stats: { vida: 40, defesa: 3 }, price: 800, unique: true, note: 'Pegajosa, mas protege' },
  botas_sapo:   { id: 'botas_sapo', slot: 'botas', rarity: 'epico', icon: 'botas', tint: '#c8b040', name: 'BOTAS DE SAPO-PANTERA', lvl: 4, stats: { defesa: 4, vida: 15 }, price: 420, unique: true, note: 'Leves como um salto' },
  olho_dragao:  { id: 'olho_dragao', slot: 'amuleto', rarity: 'lendario', icon: 'amuleto', tint: '#ff4a2a', name: 'OLHO DO DRAGÃO VERMELHO', lvl: 9, stats: { dano: 8, frio: 60, vida: 30 }, price: 3000, unique: true, note: 'Ainda está quente' },
  elmo_rei:     { id: 'elmo_rei', slot: 'elmo', rarity: 'lendario', icon: 'elmo', tint: '#ffe066', name: 'ELMO DE PENAS DO REI PÁSSARO', lvl: 6, stats: { defesa: 9, vida: 25 }, price: 0, unique: true, note: 'Presente do soberano das aves' },
  // ---- comida (cura lenta) ----
  pao:    food('pao', 'PÃO', 25, 8),
  queijo: food('queijo', 'QUEIJO', 20, 10),
  mel:    food('mel', 'MEL SILVESTRE', 35, 15),
  carne:  food('carne', 'CARNE ASSADA', 45, 20),
  sopa:   { id: 'sopa', slot: null, rarity: 'comum', icon: 'sopa', name: 'SOPA QUENTE', lvl: 1, stats: { vida: 50 }, consumable: true, food: true, warm: true, stack: true, price: 25, note: 'Recupera vida aos poucos e aquece' },
  // ---- poções (cura imediata) ----
  pocao_p: { id: 'pocao_p', slot: null, rarity: 'comum', icon: 'pocao_p', name: 'POÇÃO PEQUENA', lvl: 1, stats: { vida: 40 }, consumable: true, stack: true, price: 30, note: 'Cura na hora' },
  pocao_g: { id: 'pocao_g', slot: null, rarity: 'raro', icon: 'pocao_g', name: 'POÇÃO GRANDE', lvl: 3, stats: { vida: 120 }, consumable: true, stack: true, price: 90, note: 'Cura na hora' },
  coroa_ossos: { id: 'coroa_ossos', slot: 'elmo', rarity: 'lendario', icon: 'elmo', tint: '#e8e0cc', name: 'COROA DE OSSOS', lvl: 5, stats: { defesa: 9, vida: 30 }, price: 900, note: 'Do Rei Esqueleto. Os mortos baixam a cabeça para quem a usa' },
  antidoto: { id: 'antidoto', slot: null, rarity: 'comum', icon: 'pocao', tint: '#60e060', name: 'ANTÍDOTO', lvl: 1, stats: { vida: 10 }, consumable: true, stack: true, price: 20, cures: true, note: 'Cura veneno, queimadura e lentidão' },
  // ---- materiais (drops para vender) ----
  pe_coelho:       mat('pe_coelho', 'PÉ DE COELHO', 'pe_coelho', 8, 'Dizem que dá sorte'),
  pele_lobo:       mat('pele_lobo', 'PELE DE LOBO', 'pele_lobo', 24, 'Quente e resistente'),
  ferrao_abelha:   mat('ferrao_abelha', 'FERRÃO DE ABELHA', 'ferrao_abelha', 12, 'Afiado como agulha'),
  escama_serpente: mat('escama_serpente', 'ESCAMA DE SERPENTE', 'escama_serpente', 16, 'Brilha em verde'),
  rabo_rato:       mat('rabo_rato', 'RABO DE RATO', 'rabo_rato', 4, 'Ninguém quer isso'),
  asa_barata:      mat('asa_barata', 'ASA DE BARATA', 'asa_barata', 2, 'Crocante'),
  presa_morcego:   mat('presa_morcego', 'PRESA DE MORCEGO', 'presa_morcego', 9, 'Fina e oca'),
  seda_aranha:     mat('seda_aranha', 'SEDA DE ARANHA', 'seda_aranha', 20, 'Mais forte que corda'),
  pele_sapo:       mat('pele_sapo', 'PELE DE SAPO-PANTERA', 'escama_serpente', 22, 'Manchada como onça'),
  gosma:           mat('gosma', 'GOSMA DE GELECA', 'pocao_p', 6, 'Gruda em tudo'),
  pena:            mat('pena', 'PENA DE GAVIÃO', 'capa', 14, 'O Rei Pássaro coleciona'),
  erva_prata:      { ...mat('erva_prata', 'ERVA-PRATA', 'pocao_p', 8, 'Folhas que brilham ao luar. Curandeiros pagam bem'), tint: '#cfe8d0' },
  flor_sol:        { ...mat('flor_sol', 'FLOR-DO-SOL', 'pe_coelho', 12, 'Esquenta a mão de quem segura'), tint: '#ffc21a' },
  cogumelo_lunar:  { ...mat('cogumelo_lunar', 'COGUMELO LUNAR', 'pocao', 16, 'Azul, frio e um pouco luminoso'), tint: '#5aa0ff' },
  pagina_perdida:  { ...mat('pagina_perdida', 'PÁGINA PERDIDA', 'pocao_p', 0, 'De um livro da Grande Biblioteca de Neveo'), tint: '#f3e2b0' },
  bala_conhecimento: { id: 'bala_conhecimento', slot: null, rarity: 'lendario', icon: 'pocao', tint: '#c070ff', name: 'BALA DO CONHECIMENTO', lvl: 1, stats: {}, price: 0, consumable: true, stack: true, knowledge: true, note: 'Do Rei Ulmo. Quem come lembra do que nunca aprendeu: +2 pontos de atributo e +150 XP' },
  osso:            mat('osso', 'OSSO ANTIGO', 'rabo_rato', 5, 'Ainda se mexe de vez em quando'),
  escama_vermelha: mat('escama_vermelha', 'ESCAMA VERMELHA', 'escama_serpente', 90, 'Quente ao toque'),
  coracao_gelo:    { id: 'coracao_gelo', slot: null, rarity: 'lendario', icon: 'pocao_g', tint: '#bfe6ff', name: 'CORAÇÃO DE GELO', lvl: 1, stats: {}, price: 0, key: 'owl', note: 'Bate devagar. A Sábia Coruja sabe o que fazer com ele' },
  // ---- ferramentas ----
  gazua:   { id: 'gazua', slot: null, rarity: 'comum', icon: 'gazua', name: 'GAZUA', lvl: 1, stats: {}, price: 12, stack: true, tool: true, note: 'Abre fechaduras. Quebra se forçar' },
  chave_quartel: { id: 'chave_quartel', slot: null, rarity: 'raro', icon: 'chave', name: 'CHAVE DO QUARTEL', lvl: 1, stats: {}, price: 0, key: 'barracks', note: 'Abre o baú do Quartel' },
};
// items with a `tint` reuse a base icon recolored (iconFor understands 'base@#color')
for (const it of Object.values(ITEMS)) if (it.tint && !it.icon.includes('@')) it.icon = `${it.icon}@${it.tint}`;
export const sellPrice = it => Math.max(1, Math.floor((it.price || 0) / 2));
// What each NPC sells. Every shop buys any item that has a price.
export const SHOPS = {
  ferreiro:   { title: 'Forja do Lucas', items: ['broquel', 'escudo_ferro', 'escudo_bronze', 'escudo_prata', 'ferro', 'aco', 'fogo', 'dente_dragao', 'couro', 'latao', 'bronze', 'cobre', 'prata', 'ouro', 'escama_dragao', 'elmo_couro', 'elmo_bronze', 'elmo_prata', 'elmo_ouro', 'botas_couro', 'botas_bronze', 'botas_prata'] },
  cozinheira: { title: 'Cozinha da Dona Rosa', items: ['pao', 'queijo', 'mel', 'carne', 'sopa'] },
  mercador:   { title: 'Mercador Gaspar', items: ['pocao_p', 'pocao_g', 'antidoto', 'pao', 'queijo', 'capa', 'capa_veludo', 'botas', 'anel_cobre', 'anel_prata', 'anel_ouro', 'amuleto_bronze', 'gazua'] },
  erveira:    { title: 'Ervas da Lúcia (Lossot)', items: ['pocao_p', 'pocao_g', 'antidoto', 'mel', 'sopa', 'erva_prata', 'flor_sol', 'cogumelo_lunar'] },
  ursos:      { title: 'Trocas do Urso Pinho', items: ['capa_veludo', 'botas_prata', 'anel_prata', 'sopa', 'carne', 'pocao_g'] },
};
