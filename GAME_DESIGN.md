# Zillion Hero — Princípios do jogo

## Promessa central

Zillion Hero é um RPG idle single-player em que o jogador monta uma formação, entende por que ela vence ou perde e melhora sua estratégia ao longo de uma campanha automática. A apresentação é totalmente textual: nenhuma informação importante pode depender de sprites.

## Ciclo principal

1. Observar HP, ATB, ações e efeitos da batalha.
2. Identificar o problema da formação: dano, sobrevivência, cura, velocidade ou controle.
3. Trocar heróis, melhorar a equipe ou usar um comando manual.
4. Ver imediatamente o impacto da decisão no combate.
5. Vencer a horda, receber recursos e avançar de andar.
6. Preparar uma composição melhor para o próximo boss.

Se uma funcionalidade não melhora pelo menos uma dessas etapas, ela não tem prioridade.

## Batalha textual ATB

- Cada herói possui HP, ATB, função, cooldown, estado e última ação.
- Velocidade de Ataque determina quanto tempo a barra ATB demora para chegar a 100%.
- Em 100%, a IA do herói escolhe uma ação coerente com sua função.
- O inimigo também possui ATB, escolhe alvos e pode causar KO.
- O registro informa ator, ação, alvo, dano, cura, crítico, guarda e KO.
- O combate continua automaticamente, mas o jogador pode usar Ataque Coordenado e Primeiros Socorros com cooldown.
- Uma derrota não concede progresso: a formação reagrupa, o inimigo recupera o HP e a tentativa recomeça.

## Funções

- **DPS:** prioriza dano e usa habilidades ofensivas quando disponíveis.
- **Tank:** entra em Guarda quando há risco, reduz dano e atrai ataques.
- **Healer:** cura o aliado vivo mais ferido e revive um aliado em KO.
- **Support:** causa dano menor e mantém buffs multiplicativos na formação.
- **Controller:** causa dano e mantém debuffs multiplicativos no inimigo.

## Progressão e ritmo

- Uma campanha começa com dois heróis modestos e apenas o necessário para entender a primeira batalha.
- O primeiro andar apresenta ATB, dano e cura antes de abrir a coleção.
- Sistemas são liberados somente quando o jogador já entende o recurso que eles usam.
- A formação começa com 2 espaços e cresce até 20; obter um herói não o adiciona automaticamente.
- O primeiro boss deve exigir uma mudança observável de composição ou melhoria, sem exigir cliques repetitivos.
- O progresso offline mantém o ganho idle, mas nunca substitui a necessidade de montar uma formação funcional.

## Critérios para novas funcionalidades

Antes de implementar algo novo, responder:

1. Qual decisão nova o jogador poderá tomar?
2. Onde o resultado dessa decisão aparece na interface?
3. Como isso afeta o ciclo idle sem exigir atenção constante?
4. Existe uma explicação curta no momento em que o sistema é liberado?
5. Há teste para a regra central e para evitar progressão gratuita?

## Ordem de desenvolvimento

1. Combate legível, equilibrado e com papéis funcionais.
2. Formação, comparação e evolução dos heróis.
3. Recompensas e economia conectadas ao combate.
4. Dungeons como variação estratégica do núcleo.
5. Pets, craft, talentos e demais camadas.

Quantidade de conteúdo nunca deve compensar um ciclo principal pouco claro.

