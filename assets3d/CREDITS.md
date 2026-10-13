# Créditos dos modelos 3D (`assets3d/`)

Todos os modelos usados no jogo são CC0 (uso comercial livre, sem exigir crédito) ou feitos em código no próprio projeto. Os antigos modelos CC-BY (gavião, coruja, urubu e barata) foram substituídos por versões feitas em código (`src/birds.js`) e guardados em `backups/cc-by/`.

| Arquivos | Fonte | Licença |
|---|---|---|
| `char_knight`, `char_barbarian`, `char_mage`, `char_rogue`, `char_rogue_hooded` | [KayKit Character Pack: Adventurers](https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0) (Kay Lousberg) | CC0 |
| `dng_*` (tochas, barris, caixas, mesas, cadeiras, cama, estantes, entulho, pilar, escada, estátua) | [KayKit Dungeon Remastered](https://github.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0) (Kay Lousberg) | CC0 |
| `char_king`, `char_farmer`, `mon_wolf`, `mon_wolf2`, `mon_rabbit`, `mon_bee`, `mon_snake`, `mon_rat`, `mon_spider`, `mon_bat` | Quaternius, via [poly.pizza](https://poly.pizza) | CC0 |
| `prop_*` (árvores, pinheiros, poste, barril, caixas, baú, banco, cerca, sebe, placa, pedras, fogueira, lápides, barracas, fonte, carroça, feno, bandeiras, capim, lanterna, bigorna) | [Kenney](https://kenney.nl): Nature Kit, Fantasy Town Kit, Graveyard Kit, Survival Kit, Castle Kit, Furniture Kit | CC0 |

Three.js (MIT) carrega os glTF. Os pacotes completos ficam fora do repositório; só os arquivos usados foram copiados.

Os arquivos foram otimizados com `tools/optimize-models.mjs` (só as animações usadas, texturas até 512 px, compressão meshopt nos modelos sem esqueleto). Os personagens KayKit que não têm animação própria usam as do cavaleiro, e o rei usa as do fazendeiro (mesmo esqueleto).

## KayKit 2.0 (CC0, Kay Lousberg, kaylousberg.itch.io)
- `kk/` — Adventurers 2.0 (personagens e armas), Skeletons 1.1 (esqueletos e armas), Character Animations 1.1 (biblioteca `rig_medium_anims.glb`, só as animações usadas). Licença CC0: uso comercial livre.
- `forest/` — Forest Nature Pack 1.0 (árvores, pedras, arbustos). CC0.

## Feito em código (sem licença de terceiros)
- Cabeças dos ursos-corujas, Espada Real de cristal, Escudo do Reino, acessórios (coroa, tiara, chapéu de palha, lenço, avental, cachos), plantas colhíveis, quadro da Guilda.

- Pássaros (gavião, urubu do Mordrak, Rei Pássaro, Sábia Coruja) e a barata do esgoto: feitos em código em `src/birds.js`.
- Corpo e cabeça dos ursos-corujas, capa do Rei Ulmo: feitos em código em `src/models.js`.
