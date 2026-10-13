# A Fortaleza do Relâmpago Amarelo — protótipo Tibia 3D

Motor 3D (Three.js) com câmera fixa inclinada, estilo Tibia/Diablo (norte sempre para cima, Thomas no centro da tela). Desde 13/10/2026 a arte é **3D low-poly de bibliotecas abertas** (`assets3d/`, créditos em `assets3d/CREDITS.md`): Thomas, NPCs e moradores são personagens animados do KayKit e do Quaternius, os monstros são animais animados do Quaternius, árvores e objetos são modelos Kenney instanciados; as casas não têm telhado, então os interiores ficam sempre visíveis. O que ainda não tem modelo continua como sprite pixel art (Mordrak, baús, fogueiras) com os mesmos sistemas de antes.

Cobre: **Prólogo** (cidade medieval viva dentro das muralhas douradas), **Capítulo I** (Mordrak rouba a Luz), **Capítulo II** (o inverno retorna) e **Capítulo III** (o Lobisomem de Gelo e a Sábia Coruja), mais o reino de `docs/mundo.md` aberto para explorar: Lossot e o Pântano dos Sapos-Pantera, o Castelo dos Monstros de Geleca, a Floresta de Neveo com a Cidade dos Ursos-Corujas, a Colina do Rei Pássaro e o Desfiladeiro da Caveira com o Dragão Vermelho. Feito para **celular** (controles de toque, interface estilo Shop Titans, modo leve automático).

## Como rodar

```bash
cd Sir-Thomas-game
python3 tools/serve.py 8080      # servidor sem cache (ou: python3 -m http.server 8080 e recarregue com Ctrl+Shift+R após mudanças)
```

Abra `http://localhost:8080`: o jogo começa direto, continuando o jogo salvo quando existe um. Para recomeçar do zero, abra `http://localhost:8080/?novo`.

## Controles

| Ação | Teclado e mouse | Toque (celular) |
|---|---|---|
| Andar / correr | WASD · Shift | joystick à esquerda (empurre até o fim para correr) ou botão de correr |
| Andar até um ponto | clique no chão | toque no chão |
| Atacar | clique no monstro · F | botão de espadas (segure para repetir; mira o monstro mais próximo) |
| Giro do Relâmpago | Q | botão do raio |
| Escudo | botão direito (segurar) | botão do escudo (segurar) |
| Esquivar | Espaço | botão do vento |
| Usar / falar / abrir | E | toque no aviso que aparece |
| Poção · comida | 1 · 2 | botões redondos |
| Bolsa · herói · missões · mapa | I · C · J · M | botões do menu |
| Zoom | scroll | pinça com dois dedos |
| Menu (som, qualidade, FPS, novo jogo) | Esc | botão de engrenagem |

Parâmetros de endereço: `?novo` recomeça, `?q=low` ou `?q=high` força a qualidade, `?touch` mostra os controles de toque no PC, `?nodyn` desliga a resolução dinâmica.

## Sistemas

Monstros com XP e drops, níveis com pontos de atributo, inventário, lojas e comida: veja `docs/design.md`. O mundo completo planejado está em `docs/mundo.md`.

## Arte 3D

Os modelos ficam em `assets3d/` (`char_*` personagens, `mon_*` monstros, `nat_*` natureza Kenney, `town/`, `graveyard/`, `survival/`, `castle/` kits Kenney com o `Textures/colormap.png` de cada um, `dng_*` KayKit Dungeon). O mapeamento de quem usa o quê está em `src/models.js` (`CHAR_MODELS`, `VILLAGER_MODELS`, `MONSTER_MODELS`, `PROP_MODELS`). Para ver um modelo e suas animações: `http://localhost:8080/tools/models-preview.html?m=char_knight,mon_wolf&role=attack`.

## Arte 2D: como substituir os desenhos provisórios (fallback)

Coloque os PNGs gerados na pasta `assets/` com os nomes exatos do briefing (por exemplo `assets/hand_sword_idle.png`, `assets/tex_goldstone_wall.png`). O jogo tenta carregar cada nome ao abrir; o que existir substitui o desenho em código, o resto continua provisório. Lista completa de nomes em `src/assets.js`.

Arte em vista 3/4 (item 6 do épico): `tools/briefing-sheets.html`. Personagens e monstros são **sheets** `sheet_<nome>.png` com 4 linhas (baixo, esquerda, direita, cima) e 3 colunas (parado, pé esquerdo, pé direito); o jogo fatia pelas lacunas transparentes e alinha os quadros pelos pés. Árvores e objetos vistos de cima são `<nome>_top.png` e têm prioridade sobre a versão antiga de frente.

## Estrutura

```
index.html / style.css   layout: cena 3D, mãos (overlay), HUD, minimapa, painel de equipamentos
src/main.js              jogo: população da cidade, interações, combate, save, loop
src/city.js              a cidade: muralhas douradas, torre da Luz, praças, mercado, casas, campos, rio, floresta
src/player.js            Thomas visível, movimento WASD, ataque na direção do mouse, câmera de cima, esquiva, escudo, frio
src/view.js              parâmetros da câmera fixa (inclinação, zoom, inclinação dos sprites)
src/entities.js          NPCs e moradores, Lobo de Gelo, Mordrak (urubu), baús, fogueiras, Histórias do Mundo
src/overlay.js           mãos, espada, tocha e escudo em 2D por cima da cena
src/sky.js               céu pintado + presets de luz: dia, entardecer, noite, inverno
src/minimap.js           minimapa (seta do jogador, marcadores) e mapa grande
src/models.js            modelos glTF: Actor animado (personagens, monstros), PropSet instanciado (árvores, objetos), tabelas de mapeamento
src/billboard.js         sprites que encaram a câmera (fallback de tudo que não tem modelo), profundidade pela base, sombras
src/anim.js              passos de caminhada por direção a partir de uma sprite sheet
src/assets.js            carregador de PNGs com fallback para a arte em código
src/pixel.js             texturas e objetos provisórios gerados em código
src/sprites.js           personagens, criaturas e ícones provisórios
src/story.js             roteiro dos capítulos e diálogos
src/hud.js / items.js    HUD, cartas de item, equipamentos
src/audio.js             sons procedurais
```

## Gerar arte pela API

`tools/gen-assets.mjs` lê os prompts da página de briefing e gera os PNGs que faltam em `assets/` (pula os que já existem):

```bash
node tools/gen-assets.mjs caminho/do/briefing.html leva1        # leva1 | leva2 | leva3 | all
node tools/gen-assets.mjs tools/briefing-sheets.html amostra    # sheets 3/4: amostra | chars | monstros | cenario | all
node tools/gen-assets.mjs caminho/do/briefing.html leva1 hand_torch,sprite_maite   # só alguns
FORCE=1 ... para regenerar um arquivo existente
```

A chave da OpenAI é lida de `~/.config/sirthomas/openai.key`.
