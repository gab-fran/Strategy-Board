# Parte 6 — Integração com o Strategy Board

## Goal
Exibir dados de scouting no painel lateral do Strategy Board existente, sem alterar o whiteboard.

## Contexto
- O whiteboard (`whiteboard.ts`) e o painel lateral (`view.ts`) não devem ser reescritos
- A integração é feita adicionando uma nova seção ao painel lateral existente
- Os dados são carregados de forma assíncrona para não travar a interface
- `aggregate.ts` já existe com `buildTeamSummary()` (Parte 5)

## Tasks

- [ ] **T1**: Em `view.ts`, identificar onde o painel lateral é construído (buscar por `sidebar` ou `panel`) e adicionar um container `#scout-panel` no final → Verificar: `#scout-panel` existe no DOM quando o Strategy Board é aberto
- [ ] **T2**: Criar `src/scoutPanel.ts` com função `loadScoutPanel(matchTeams: number[])` que, dado os números das 6 equipes da partida, chama `buildTeamSummary()` para cada uma e renderiza no `#scout-panel` → Verificar: passar `[254, 1678, 972, 330, 3310, 1114]` exibe cards no painel
- [ ] **T3**: Em `view.ts` (ou `model.ts`), ao carregar uma partida do Strategy Board, extrair os números das equipes e chamar `loadScoutPanel()` de forma assíncrona (sem await no fluxo principal) → Verificar: abrir uma partida mostra dados de scouting sem atraso perceptível na UI
- [ ] **T4**: Adicionar estado de vazio no painel: se não houver scouts para as equipes, exibir mensagem "Sem dados de scouting" → Verificar: partida sem scouts mostra a mensagem correta
- [ ] **T5**: Testar que o whiteboard continua funcionando normalmente após a integração → Verificar: desenhar, adicionar robôs e salvar partida funcionam sem regressão

## Done When
- [ ] Painel lateral do Strategy Board exibe médias de auto, teleop e endgame das equipes
- [ ] Integração não adiciona lag perceptível
- [ ] Whiteboard (canvas) sem qualquer regressão
- [ ] `bun run build` passa sem erros

## Arquivos afetados
- `src/view.ts` (adicionar `#scout-panel` no painel lateral + chamar `loadScoutPanel`)
- `src/scoutPanel.ts` (novo)

## Dependência
> Requer Partes 1–5 concluídas
