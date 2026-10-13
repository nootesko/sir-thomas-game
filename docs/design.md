# A Fortaleza do Relâmpago Amarelo — documento de design (protótipo)

Registro vivo do que o jogo é, do que já existe no protótipo e do que fica para depois. O mundo completo está em `docs/mundo.md`. Referência de sistemas (atributos, drops, lojas, respawn): [Intersect Engine](https://github.com/AscensionGameDev/Intersect-Engine), um motor de ORPG 2D vista de cima.

## Visão geral

- Jogo de ação/aventura pixel art, **vista de cima estilo Tibia** (câmera fixa, norte para cima, Thomas no centro). Three.js com modelos 3D low-poly animados (KayKit, Quaternius, Kenney) desde 13/10/2026, casas sem telhado; sprites 2D só como fallback do que não tem modelo.
- Público infantil, história rica. Protagonista: Sir Thomas. Co-protagonista: Princesa Eleonora. Vilão: Mordrak.
- Loop: explorar, caçar monstros, ganhar XP e moedas, distribuir atributos, comprar e equipar itens melhores, avançar na história.

## Estado do protótipo (12/10/2026)

Implementado:

- Prólogo, Capítulo I (Mordrak na torre) e início do Capítulo II (inverno) com a fortaleza, campos e Floresta Congelada.
- Combate: clique ataca na direção do mouse, botão direito defende com escudo, Espaço esquiva.
- **Monstros** com XP, drops e respawn: coelho (passivo, foge), lobo, abelha gigante, serpente, lobo de gelo (inverno), rato e barata (esgoto).
- **Esgoto**: masmorra murada no canto sudoeste do mapa; entrada por um bueiro no cruzamento das ruas (-36, 36); saída pela escada.
- **Progressão**: XP por abate, nível (XP necessário = 40 × nível^1.6), +3 pontos por nível em Ataque (+2 de dano cada), Velocidade de ataque (+6% cada) e Defesa (+1 cada). Vida máxima +8 por nível.
- **Inventário** (tecla I) e **atributos** (tecla C). Clique no item usa ou equipa; clique no equipamento guarda na mochila.
- **Comércio**: Ferreiro Lucas vende espadas e armaduras, Dona Rosa vende comida, Mercador Gaspar vende poções e compra qualquer coisa. Venda paga metade do preço.
- **Comida** cura aos poucos (5 de vida por segundo até esgotar); **poções** curam na hora.
- Save em localStorage (posição, equipamento, nível, XP, atributos, moedas, mochila, baús e fogueiras).

Feito em 13/10/2026: estamina (golpe, esquiva, corrida, bloqueio; atributo Fôlego), Giro do Relâmpago (Q: golpe em círculo, 30 de estamina, recarga 5 s), efeitos de estado (veneno, lentidão da geleca e do gelo, queimadura do dragão; o antídoto cura todos), monstros com preparo visível antes do bote, chefes com itens únicos, conjuntos de elmos, botas, capas, anéis e amuletos por liga, Capítulo III e as regiões de `docs/mundo.md` com uma missão cada.

Ainda não implementado (anotado para depois):

- Capítulo IV em diante (Rei Pássaro já revela a Montanha Negra; faltam Mordrak humano, Gigante de Pedra e a Montanha Negra em si).
- Interior da caverna do Dragão e do Salão da Geleca como masmorras de vários andares.
- Mais habilidades (hoje só o Giro do Relâmpago).
- Banco, troca entre personagens, multiplayer (fora do escopo por enquanto).

## Tabelas

### Monstros

| Id | Nome | Onde | Vida | Dano | XP | Drops (chance) | Moedas |
|---|---|---|---|---|---|---|---|
| coelho | Coelho | campos | 12 | 0 (foge) | 4 | pé de coelho 35%, carne 50% | 0–2 |
| abelha | Abelha Gigante | campos | 18 | 6 | 10 | ferrão 50%, mel 35% | 1–3 |
| serpente | Serpente | margem do rio, campos | 30 | 14 | 16 | escama 50% | 2–5 |
| lobo | Lobo | floresta, longe da cidade | 40 | 10 | 18 | pele 50%, carne 40% | 2–6 |
| lobo_gelo | Lobo de Gelo | vale congelado (inverno) | 42 | 12 | 24 | pele 60% | 3–8 |
| rato | Rato do Esgoto | esgoto | 14 | 5 | 6 | rabo 60%, queijo 25% | 0–3 |
| barata | Barata Gigante | esgoto | 10 | 3 | 4 | asa 70% | 0–1 |

Respawn: 15 a 60 s depois de morrer, quando o jogador está longe. Dados em `src/monsters.js`.

### Monstros das regiões (13/10/2026)

| Id | Nome | Onde | Vida | Dano | XP | Especial | Únicos |
|---|---|---|---|---|---|---|---|
| sapo | Sapo-Pantera | Pântano (Lossot) | 55 | 12 | 26 | veneno | — |
| sapo_alfa | Sapo-Pantera Alfa | poço grande do pântano | 220 | 20 | 140 | veneno, chefe | Botas de Sapo-Pantera |
| geleca | Geleca | Castelo de Geleca | 45 | 9 | 22 | lentidão | — |
| rei_geleca | Rei Geleca | Salão da Geleca | 380 | 22 | 220 | lentidão, se divide em 3 gelecas ao morrer | Coroa do Rei Geleca |
| gaviao | Gavião | Colina do Rei Pássaro | 30 | 9 | 18 | voa; solta penas | — |
| lobisomem | Lobisomem de Gelo | Toca de pedras (Floresta Congelada) | 520 | 26 | 350 | lentidão, chama 3 lobos de gelo na metade da vida, nunca volta | Presa do Lobisomem, Coração de Gelo |
| dragao | Dragão Vermelho | Covil no fundo do Desfiladeiro | 900 | 34 | 600 | queimadura, chefe | Olho do Dragão Vermelho, Escamas de Dragão |

### Espadas

| Item | Dano | Preço | Nível | Observação |
|---|---|---|---|---|
| Espada de Ferro | 14 | 60 | 1 | |
| Espada Real | 18 | — | 1 | inicial |
| Espada de Aço | 22 | 220 | 3 | |
| Espada Glacial | 24 | — | 3 | baú do inverno, congela |
| Espada de Fogo | 30 | 700 | 6 | queima por 3 s |
| Dente de Dragão | 42 | 2600 | 10 | |

### Armaduras

| Item | Defesa | Preço | Nível |
|---|---|---|---|
| Roupa Azul do Reino | 2 | — | 1 (inicial) |
| Couro | 4 | 50 | 1 |
| Latão | 6 | 140 | 2 |
| Bronze | 8 | 260 | 3 |
| Cobre | 10 | 420 | 4 |
| Prata | 13 | 800 | 6 |
| Ouro | 16 | 1500 | 8 |
| Escamas de Dragão | 24 (+20% frio) | 4000 | 10 |

### Comida e poções

| Item | Cura | Preço | Tipo |
|---|---|---|---|
| Pão | 25 | 8 | lenta |
| Queijo | 20 | 10 | lenta |
| Mel Silvestre | 35 | 15 | lenta |
| Carne Assada | 45 | 20 | lenta |
| Sopa Quente | 50 | 25 | lenta, zera o frio |
| Poção Pequena | 40 | 30 | imediata |
| Poção Grande | 120 | 90 | imediata |

Materiais vendáveis: pé de coelho (8), pele de lobo (24), ferrão de abelha (12), escama de serpente (16), rabo de rato (4), asa de barata (2). Catálogo em `src/items.js`.

## Arte

- Toda arte é pixel art gerada por IA (OpenAI gpt-image-1) a partir dos prompts em `tools/briefing-v2.html`, executados por `tools/gen-assets.mjs`. A versão anterior (v1, primeira pessoa) está em `assets_v1/` para comparação.
- Ao carregar, `src/assets.js` recorta as margens transparentes e **reduz cada sprite a uma grade real de pixels** (64 px de altura por padrão) para o visual ficar nítido em jogo.
- Ícones de itens vêm das folhas `ui_icons_sheet`, `ui_icons_equip` e `ui_icons_goods` (grade 4×3); sem a folha, `src/icons.js` tinge um ícone base.
- Imagens que faltam caem no desenho provisório em código (`src/sprites.js`, `src/pixel.js`).
- Personagens e monstros andam com sheets `assets/sheet_<nome>.png` (4 direções x 3 passos, fatiadas em `sliceAnimSheet` e animadas por `src/anim.js`); os humanos em código têm as mesmas 4 direções e passos (`humanFrames`). Objetos vistos de cima usam `<nome>_top.png` quando existem. Prompts em `tools/briefing-sheets.html` (54 imagens, pendentes de créditos na OpenAI em 12/10/2026).
