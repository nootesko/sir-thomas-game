# Épico — A Fortaleza do Relâmpago Amarelo

Registro único de tudo que foi pedido, decidido e feito. Atualizado em 12/10/2026. Detalhes de sistemas em `docs/design.md`; o reino inteiro em `docs/mundo.md`.

## Visão do produto

RPG de ação pixel art, vista de cima estilo Tibia, para público infantil com história rica (Sir Thomas, Princesa Eleonora, Mordrak). A cidade deve parecer viva e cheia de detalhes mesmo antes de o mundo inteiro existir. O jogador caça, ganha XP e moedas, distribui atributos, compra e equipa, conversa com personagens que reagem às escolhas e cumpre missões.

## Linha do tempo das decisões

| Data | Decisão |
|---|---|
| 11/10 | Protótipo 3D rejeitado; a referência visual é 2D pixel art com mãos na tela. |
| 12/10 manhã | Versão 2.5D em primeira pessoa (Three.js + sprites). Minimapa com clique abre o mapa inteiro. |
| 12/10 | Primeira pessoa "não está funcionando": câmera fixa de cima estilo Tibia, Thomas visível, clique ataca. |
| 12/10 | Imagens v1 "mal desenhadas": nova leva (v2) com prompts de pixel art limpa; sprites reduzidos a grade real de pixels ao carregar. |
| 12/10 | Monstros (coelho, lobo, abelha, serpente, rato, barata), XP e atributos, drops, inventário, comércio, comida e poções, esgoto. |
| 12/10 | Documento "O mundo de Sr. Thomas" recebido e guardado (Malace, Lossot, Neveo, Desfiladeiro da Caveira, Castelo de Geleca, Rei Pássaro). Só o protótipo por enquanto. |
| 12/10 | Avaliado trocar para o Intersect Engine (C#, editor só Windows); o usuário pediu para esperar. |
| 12/10 | Cidade maior (muralha 90, portão sul, Castelo Real, Jardins, Campo de Treino, Hortas), telhados transparentes perto do Thomas, ícone "$" dos vendedores nos mapas, render em resolução cheia, leva v3 de imagens em qualidade alta. |
| 12/10 | Pesquisa de projetos abertos (clientes Open Tibia em JS, RPG JS). Recomendação aceita: manter o código, trocar o cenário para tiles. |
| 12/10 | Mundo em tiles com transições de borda; movimento livre e suave com clique para andar (A*) e clique no monstro para perseguir e atacar; tecla F golpeia. |
| 12/10 noite | Item 6 no código: ordem de pintura estilo Tibia (sprites e prédios sortidos pela base no chão), sombras no chão, sprites quase deitados para a câmera, sheets de 4 direções x 3 passos (personagens, moradores e monstros), passos procedurais para os humanos desenhados em código. A arte 3/4 (54 imagens em `tools/briefing-sheets.html`) ficou pendente: a conta da OpenAI está sem créditos. |
| 12/10 noite | Pergunta: "Tibia 3D estilo Diablo" (referência: cena 3D com paredes, casas sem telhado, objetos e personagem em 3D). Avaliação registrada abaixo. |
| 13/10 | **Decisão: Tibia 3D estilo Diablo, "com tudo de melhor que houver de open source".** Feito: personagens, moradores e monstros viram modelos glTF animados (KayKit Adventurers, Quaternius via poly.pizza), árvores e objetos viram modelos Kenney instanciados, telhados removidos (interiores sempre visíveis), câmera mais inclinada. Créditos em `assets3d/CREDITS.md`. A geração das 54 imagens 3/4 deixou de ser necessária. |

## Estado do 3D (13/10/2026)

- `src/models.js`: carregador glTF, `Actor` (esqueleto + mixer; papéis idle/walk/run/attack/hit/death/block/dodge/sleep/sit achados por padrão de nome), `PropSet` (InstancedMesh por material) e as tabelas `CHAR_MODELS`, `VILLAGER_MODELS`, `MONSTER_MODELS`, `PROP_MODELS`. Tudo cai no sprite antigo se o `.glb` faltar.
- Prévia dos modelos: `tools/models-preview.html?m=char_knight,mon_wolf&role=attack`.
- Ainda em sprite: Mordrak (urubu), baús, fogueiras, escadas, bueiro, poço, boneco de treino, boca da caverna, ícones de loot. Candidatos: `survival/chest`, `survival/campfire-pit`, `mon_vulture` (estático, CC-BY).
- Polimento pendente: tochas nas paredes com luz à noite (`dng_torch_lit`), móveis KayKit nos interiores (`dng_table`, `dng_chair`, `dng_bed`, `dng_shelves`), muralha e castelo com peças do Kenney Castle Kit, Thomas com capa amarela de verdade (hoje só a tinta da malha `Knight_Cape`), ajuste fino de escala por modelo, orientação (`forward`) de cada monstro conferida em jogo.

## Performance e celular (13/10/2026)

O jogo é para celular: nada pode entrar que pese. Regras em `src/perf.js`:

- **Qualidade automática**: tela de toque usa `low` (sem mapa de sombras, sombra redonda sob os personagens, resolução até 1,25x, 4 luzes); PC usa `high` (sombra do sol perto do Thomas, 6 luzes). Forçar com `?q=low` ou `?q=high`.
- **Resolução dinâmica**: abaixo de ~42 fps a escala de render cai, acima de ~57 fps sobe (`?nodyn` desliga, para testes).
- **Modelos animados** longe da câmera não são desenhados nem animados (`LOD`).
- **Luzes**: a cena tem sempre N luzes reais que pulam para as fontes acesas mais próximas (`LightPool`); o resto do código cria luzes normalmente.
- **Cenário estático** sem referência no código é fundido por material em blocos de 48 m (`mergeStatic`); objetos instanciados (árvores, postes) são divididos em blocos de 40 m para a câmera descartar os de fora.
- Materiais glTF viram Lambert; armas e escudos sobrando nos modelos KayKit são removidos (cada personagem mostra só o seu equipamento).
- Medição na praça (render headless): de 3588 chamadas de desenho e 1,8 milhão de triângulos para 247 chamadas e 112 mil triângulos no modo celular.

## Estilo visual: referência Shop Titans (13/10/2026)

Pedido: personagens e visual "muito parecido com Shop Titans". Referência (capturas da Steam): personagens 3D estilizados com cabeça grande (~4 cabeças de altura), olhos grandes, mãos e pés robustos, texturas pintadas lisas, cores saturadas, luz quente e suave, câmera inclinada ~45-50°, interior das construções visível. Interface com botões roxos arredondados, contorno escuro grosso e letras com contorno. Feito: câmera mais inclinada e próxima, cabeças maiores nos modelos (osso da cabeça), texturas suavizadas, luz do dia mais quente, barra de vida sobre a cabeça. O usuário também citou o Whoa Adventure (personagens ainda mais "chibi", ~2 cabeças, estilo WoW em miniatura).

## Feito em 13/10/2026 (tarde, "continue com tudo")

- **Celular**: interface nova sem a faixa de madeira; joystick flutuante à esquerda, botões de ataque (segurar repete), esquiva, escudo (segurar) e correr; toque no chão anda, toque no monstro ataca, pinça dá zoom; ataque mira sozinho o monstro mais próximo; câmera se afasta em tela em pé; gazua por toque (arrastar mira, botão Girar). Teste no PC com `?touch`.
- **Estamina** (barra amarela sob a vida, sobre a cabeça): golpe 9, esquiva 22, correr 13/s, bloqueio gasta conforme o dano; recupera após 0,7 s; zerada correndo deixa "sem fôlego" até 35%. Atributo novo **Fôlego** (+12 de estamina por ponto).
- **Combate verificado**: monstros fazem um "preparo" piscando amarelo antes do bote (dá para defender ou esquivar; acertar interrompe); matilha se espalha em volta do Thomas; escudo passa a depender do escudo equipado (antes só funcionava na noite do Mordrak); barra de vida do chefe.
- **Barra de equipamentos / Herói** (estilo Shop Titans): retrato 3D do Thomas no canto e no painel, estatísticas com ícones, 8 espaços coloridos por raridade com nível, bolsa com detalhe do item, comparação (verde melhor, vermelho pior), seta ▲ em itens melhores, atalhos 1 e 2 para poção e comida, loja em abas Comprar/Vender, menu com som, qualidade, zoom, FPS e novo jogo.
- **3D**: móveis KayKit nas casas (cama, mesa, cadeiras, estante), tocha acesa ao lado de cada porta (luz só à noite), baús e fogueiras 3D com chamas, Mordrak como gavião animado escurecido (CC-BY Sherkiz), água do rio e lagos animada, neve caindo e névoa mais densa no inverno.
- **Download**: modelos de 28 MB para 9,6 MB (`tools/optimize-models.mjs`: só as animações usadas, animações compartilhadas entre personagens do mesmo esqueleto, meshopt nos modelos sem esqueleto; quantizar modelos com esqueleto quebra a escala no three.js).

## Feito em 13/10/2026 (noite): deuses, Guilda, KayKit 2.0 e equipamento visível

- **Deuses antigos** (`src/gods.js`, regras em `docs/mundo.md`): cinco deuses com santuário, favor, juramento a um só, bênçãos em 0/40/80 de favor e oração de 3 minutos. Aba **Deuses** no painel do herói.
- **Ataque e defesa**: o jogo salvo não apaga mais o escudo; o Lucas dá um Broquel e vende escudos; clique esquerdo perto de inimigo ataca; aviso quando não há escudo.
- **Arte só com licença vendável** (o jogo será vendido): KayKit Adventurers 2.0, Skeletons, Character Animations e Forest Nature, todos CC0 (`assets3d/kk`, `assets3d/forest`). Restam dois modelos CC-BY (gavião e coruja), vendáveis com crédito, a substituir.
- **Um estilo só para as pessoas**: todo humano usa o corpo KayKit 2.0, mais esguio (cabeça 0,82, pernas 1,16, largura 0,86) como a ficha do Sir Thomas. Acessórios feitos em código (coroa, tiara, chapéu de palha, lenço, avental, cachos). Cores trocadas por faixa da paleta do KayKit (`recolor`), sem textura nova.
- **Sir Thomas da ficha**: cabelo castanho cacheado, túnica azul, capa e detalhes dourados, calça bege, botas e luvas marrons, Espada Real de cristal e escudo azul e dourado (feitos em código).
- **Equipamento muda o modelo** (`thomasLook` em `src/models.js`): espada, escudo, elmo (com a cor do item), armadura, capa e botas.
- **Animações**: uma biblioteca só (`assets3d/kk/rig_medium_anims.glb`, 28 animações, 0,66 MB) serve todos os personagens.
- **Ursos-corujas** feitos em código sobre o bárbaro (cabeça de coruja, garras, rei com coroa, ancião de óculos, filhote).
- **Árvores, pedras e arbustos** do Forest Nature no mapa e nas regiões.
- **Galeria de modelos** (`viewer.html`): todos os modelos como no jogo, girar, trocar animação, testar cor e salvar notas de correção em `docs/notas-modelos.json` (o servidor `tools/serve.py` grava).
- **Guilda dos Aventureiros** (`src/guild.js`): Mestra Brígida e quadro no Campo de Treino; três missões por dia (caça, coleta, masmorra); patentes Recruta, Bronze, Prata, Ouro, Lenda; 74 plantas para colher (Erva-Prata, Flor-do-Sol, Cogumelo Lunar) que renascem em 3 minutos; **Cripta Antiga** no canto noroeste com esqueletos e o Rei Esqueleto (chama reforços, pode soltar a Coroa de Ossos).

Pendências: chão no estilo da floresta KayKit (verde liso com penhascos), cidade dos ursos-corujas completa (biblioteca, salão do rei, bala do conhecimento), trocar gavião e coruja CC-BY, monstros animais no mesmo estilo (lobos, sapo, rato, aranha), Rei Esqueleto como golem (pacote Skeletons Extra, pago, CC0), escurecer a cripta.

## Feito em 14/10/2026 ("pode continuar")

- **Nomes**: princesa **Eleonora** (antes Maite), **Capitão Cassios** (antes Duarte), **Ferreiro Lucas** (antes Bruno).
- **Sir Thomas**: cabelo preto liso em tigelinha (feito em código).
- **Chão estilo floresta KayKit**: grama, terra e neve lisas com manchas suaves, tufos de grama e arbustos do Forest Nature.
- **Cripta e subterrâneos escuros** (luz "under" no céu).
- **Cidade dos Ursos-Corujas completa**: Grande Biblioteca (dezenas de estantes, 4 livros que dão conhecimento), Salão do Rei Ulmo (trono, colunas), praça com estátua de coruja e postes. **Rei Ulmo** dá a **Bala do Conhecimento** (+2 pontos de atributo, +150 XP) a quem salvou Pluma e a quem completa **As Páginas Perdidas** (Pena-Velha, 5 páginas espalhadas: pântano, castelo de geleca, desfiladeiro, colina, cripta), que revela a origem do Mordrak.
- **Ursos-corujas sem roupa**: corpo de pelo feito em código e preso ao esqueleto (uma chamada de desenho), cabeça de coruja; só o Rei Ulmo usa capa vermelha e coroa.
- **Só arte vendável**: gavião, urubu do Mordrak, Rei Pássaro, Sábia Coruja e barata agora são feitos em código (`src/birds.js`); os modelos CC-BY foram para `backups/cc-by/`.
- **Animais no estilo KayKit** (`src/critters.js`, em código): lobos (cinza, alfa, gelo), coelho, rato, sapo, aranha e aranha rainha; Lobisomem de Gelo bípede com cabeça de lobo.

Pendências: reduzir triângulos no celular (praça com ~400 mil), princesa e mercador com roupas próprias, penhascos no estilo da floresta, mais masmorras.

## Backlog (atualizado 13/10/2026, noite)

Concluído nesta rodada ("continue com tudo"):

1. **Polimento do 3D**: tochas com luz à noite, móveis nos interiores, baús e fogueiras 3D, Mordrak 3D, cores reais dos modelos (a tinta agora multiplica a cor do modelo em vez de substituir), rochas e árvores com paleta verde do Shop Titans.
2. **Ambiente 3D**: água animada, neve e névoa no inverno, texturas suaves, lava no covil do dragão.
3. **Interface**: cartas de loot no estilo novo, retrato 3D, "!" e "?" de missão sobre as pessoas e no minimapa, menu de opções.
4. **Conteúdo**: Capítulo III completo (Sábia Coruja, Lobisomem de Gelo que nunca volta, Coração de Gelo, Pena da Coruja), 7 chefes e monstros novos, itens únicos, conjuntos por liga, Giro do Relâmpago, efeitos de estado, antídoto.
5. **Mundo de `docs/mundo.md`**: Lossot e o Pântano, Castelo de Geleca, Floresta de Neveo e Cidade dos Ursos-Corujas, Colina do Rei Pássaro, Desfiladeiro da Caveira e Covil do Dragão, com estradas, ponte, fogueiras, lojas e uma missão em cada (`src/regions.js`).
6. Fora do escopo por enquanto: banco, troca entre personagens, multiplayer.
7. **Combate verificado**, 8. **Estamina**, 9. **Barra de equipamentos**, 10. **Celular**: ver a seção "Feito em 13/10/2026" acima.

Próximos passos sugeridos: Capítulo IV (Montanha Negra e Mordrak humano), masmorras de vários andares (Salão da Geleca, caverna do Dragão), mais habilidades, testar num celular de verdade e medir o tempo de carregamento (hoje cerca de 11 MB de modelos).

## Perguntas respondidas

- **Dá para fazer um "Tibia 3D" estilo Diablo (paredes, casas sem telhado, objetos e personagens em 3D)?** Dá, e o motor atual já é metade disso: Three.js, câmera fixa inclinada, prédios em caixas com textura, luzes pontuais nas lamparinas, portas que abrem, casas com interior. O que muda é a arte: objetos e personagens viram modelos 3D low-poly (glTF) em vez de sprites, os telhados somem (vista por dentro das casas o tempo todo) e a câmera gira uns 30 graus para a diagonal. Vantagens: profundidade e passos vêm de graça (modelos animados com esqueleto, o Three.js toca as animações), sem depender de imagens geradas e sem o problema de sprites cortados por paredes. Custo: a identidade pixel art some, e os personagens (Thomas com capa amarela, Eleonora, Mordrak) teriam de ser montados a partir de kits CC0 (KayKit, Quaternius, Kenney) ou encomendados; gerar modelos por IA (Meshy, Tripo) ainda sai irregular e sem esqueleto bom. Esforço estimado: 2 a 3 dias para trocar os sprites por modelos de kit e ajustar câmera e luz; a lógica de jogo (combate, missões, rotina, lojas) fica igual.

- **Hexágonos em vez de tiles?** Não recomendado. A movimentação já é livre (qualquer ângulo, sem travar na grade), então a grade só serve para o chão e para o caminho do clique; hexágonos não encaixam com casas, muralhas e ruas retas, e nenhum editor ou tileset padrão usa hexágonos para esse gênero.
- **Por que a árvore parece papel?** Porque a arte é vista de frente e inclinada para a câmera. A solução é arte 3/4 de cima deitada no chão (item 6).

## Referências

- Intersect Engine (sistemas): https://github.com/AscensionGameDev/Intersect-Engine
- RPG JS (framework alternativo, MIT): https://github.com/RSamaium/RPG-JS
- Clientes Open Tibia em JS (só inspiração, dependem de sprites da CipSoft): Tibia74-JS-Engine, TibiaJS, otclient-web, otcts
- Tileset livre CC0: Tiny Top Down Pack (opengameart)

## Arte e custos

- Prompts: `tools/briefing-v2.html` (v2), `tools/briefing-v3.html` (v3, qualidade alta), `tools/briefing-sheets.html` (sprite sheets 3/4). Gerador: `tools/gen-assets.mjs` (OpenAI gpt-image-1).
- Versões anteriores em `assets_v1/` e `assets_v2/`. Cada leva completa custa por volta de 6 a 12 dólares.
