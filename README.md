# Zillion Hero

Zillion Hero é um RPG idle single-player, totalmente textual, inspirado na progressão automática de jogos como *7 Knights Idle* e na clareza de interfaces como *Trimps*. Não há sprites, multiplayer, compras reais ou backend: todo o jogo funciona no navegador e o progresso pertence ao jogador.

## Jogar

[Abrir Zillion Hero no GitHub Pages](https://math196.github.io/Zillion-Hero/)

## Marco atual — Fases 2, 3 e base da Fase 4

As decisões de desenvolvimento seguem os [princípios do jogo](GAME_DESIGN.md): primeiro um combate legível e interessante; depois, novas camadas de conteúdo.

- Catálogo com **200 heróis únicos**:
  - 100 Common
  - 60 Rare
  - 30 Epic
  - 10 Legendary
- Coleção sem limite de capacidade.
- Formação ativa que começa com 2 espaços e cresce a cada 3 andares, até 20 heróis.
- Cinco funções: DPS, Tank, Healer, Support e Controller.
- Oito elementos e sinergias de formação.
- Fichas completas com aparência textual, atributos e kit exclusivo de Ataque Básico, Especial e Passiva.
- Especiais usam cooldown no ATB; Passivas entram no cálculo ao alcançar 5 estrelas.
- IVs individuais de 90% a 110%.
- Summon de heróis: Common 60%, Rare 30%, Epic 8%, Legendary 2%.
- Pity lendário garantido no 100º summon sem Legendary.
- Duplicatas geram fragmentos, estrelas e podem melhorar os IVs existentes.
- Buffs e debuffs cumulativos multiplicativos.
- Combate automático em andares com hordas de 20 a 50 inimigos.
- Velocidades 2× e 3× liberadas por progresso, sem aumentar ganhos offline.
- Batalha textual ATB com HP, turno, estado e última ação de cada herói.
- IA por função: DPS ataca, Tank protege, Healer cura/revive, Support fortalece e Controller enfraquece.
- Inimigos atacam a formação, podem causar KO e obrigar um reagrupamento.
- Comandos manuais de Ataque Coordenado e Primeiros Socorros com cooldown.
- Boss a cada 10 andares, com fala e habilidades próprias.
- Dungeons paralelas com cristais, tokens e progressão por andar.
- XP e level-up para heróis e jogador.
- Equipamentos de 1 a 5 estrelas, com passiva em 5 estrelas.
- Loja rotativa, upgrades, craft e summon de equipamentos.
- Mineração idle com depósito e progresso offline.
- Base funcional de pets, fusão, habilidade ativa e passiva.
- Rebirth a partir do andar 50, concedendo Essência permanente.
- Save automático, exportação/importação JSON e novo jogo.
- Interface em português e inglês.
- Tutorial inicial em quatro passos, avisos contextuais e manual permanente.
- Sistemas liberados gradualmente conforme o avanço da campanha.
- Navegação por teclado, layout responsivo e redução de movimento.

## Progressão guiada

Uma campanha nova começa apenas com Expedição e Perfil. O restante aparece quando passa a ser útil:

1. Heróis: concluir o andar 1.
2. Mineração: alcançar o andar 3.
3. Summon: alcançar o andar 5, com 10 Cristais de introdução.
4. Mercado: alcançar o andar 7.
5. Dungeons: derrotar o boss do andar 10.
6. Pets: concluir a primeira dungeon.
7. Legado: alcançar o andar 50.

O botão **GUIA** reabre o objetivo atual e **AJUDA** explica recursos, IV, pity, buffs e o ciclo principal. Saves anteriores podem usar **RECOMEÇAR COM O TUTORIAL** na introdução para experimentar a curva desde o início.

### Regra dos buffs

Todos os efeitos percentuais são multiplicativos em cadeia. Eles nunca são somados diretamente.

```text
5% de crítico × 1,50 = 7,5%
7,5% × 1,50 = 11,25%
```

Essa regra vale para ataque, defesa, HP, crítico, dano crítico, recuperação, velocidade e demais modificadores percentuais.

## Estrutura

```text
index.html                 Interface principal
style.css                  Tema terminal e layout responsivo
src/
  main.js                  Roteamento, renderização e loop principal
  progression.js           Tutorial, marcos, recompensas e desbloqueios
  heroesData.js            Dados e kits dos 200 heróis
  heroes.js                Coleção, IVs, equipe, passivas, DPS e summon
  buffs.js                 Efeitos multiplicativos
  combat.js                ATB, HP individual, IA por função, hordas, bosses e recompensas
  gameData.js              Inimigos, equipamentos, dungeons e pets
  dungeons.js              Progressão paralela e cristais
  equipment.js             Loot, estrelas e equipamento de heróis
  mining.js                Produção idle de minério
  pets.js                  Gacha e fusão de pets
  shop.js                  Loja, craft e upgrades
  rebirth.js               Reset da run e Essência
  save.js                  LocalStorage, exportação e importação
  state.js                 Estado inicial e migração de saves
  i18n.js                  Português e inglês
tests/
  game.test.js             Regras críticas do jogo
```

## Executar localmente

Como o projeto usa módulos JavaScript, execute um servidor estático na pasta do projeto:

```bash
python -m http.server 4173
```

Depois abra `http://localhost:4173`.

## Testes

Requer Node.js 20 ou mais recente:

```bash
npm test
```

Os 14 testes verificam o catálogo e os kits únicos dos 200 heróis, passivas em 5 estrelas, alternância entre Ataque e Especial, raridades, buffs multiplicativos, pity, curva inicial, desbloqueios, formação, ATB, HP, cura, ataques inimigos, hordas, bosses e produção offline.

## Salvamento e privacidade

O GitHub Pages hospeda somente os arquivos estáticos. Saves, configurações e estatísticas ficam no `localStorage` do navegador. A exportação JSON permite que o próprio jogador faça backup ou transfira o progresso.

## Próximos marcos

1. Ampliar o catálogo de pets e suas sinergias.
2. Adicionar talentos específicos para cada função.
3. Expandir craft, encantamentos e materiais.
4. Criar missões, conquistas e eventos locais.
5. Adicionar laboratório de builds e histórico de runs.

## Licença

MIT. Consulte [LICENSE](LICENSE).

