# Parte 5 — Detalhe da equipe e métricas agregadas

## Goal
Criar a tela de detalhe de uma equipe e o módulo de cálculo de métricas a partir dos dados brutos.

## Contexto
- Lista de equipes já existe (Parte 4)
- Métricas são calculadas em tempo real (não salvas), a partir dos match scouts
- Detalhe une: histórico de partidas + pit scout + médias calculadas

## Tasks

- [ ] **T1**: Criar `src/aggregate.ts` com funções puras: `calcAvgAuto(entries)`, `calcAvgTeleop(entries)`, `calcClimbRate(entries)`, `calcConsistency(entries)`, `buildTeamSummary(teamNumber)` → Verificar: chamar `buildTeamSummary(254)` retorna objeto com médias corretas
- [ ] **T2**: Criar HTML da tela de detalhe em `index.html` (seção `#team-detail-screen`) com: cabeçalho da equipe, grid de métricas (auto avg, teleop avg, climb rate, partidas), histórico de partidas em lista, bloco de pit scout → Verificar: estrutura HTML visível no DOM
- [ ] **T3**: Criar `src/teamDetailView.ts` que recebe número da equipe, chama `buildTeamSummary()`, e renderiza todos os dados na seção `#team-detail-screen` → Verificar: abrir detalhe de equipe exibe dados reais
- [ ] **T4**: Adicionar navegação "anterior / próxima equipe" usando a lista ordenada atual → Verificar: navegar entre equipes atualiza os dados sem reload
- [ ] **T5**: Em `src/teamsView.ts`, ao clicar em um card de equipe, abrir `teamDetailView` passando o número → Verificar: clique no card vai para o detalhe correto

## Done When
- [ ] Tela de detalhe exibe métricas calculadas para qualquer equipe com dados
- [ ] Navegação anterior/próxima funciona
- [ ] `aggregate.ts` é independente (sem dependências de DOM ou Firebase)
- [ ] `bun run build` passa sem erros

## Arquivos afetados
- `index.html` (adicionar `#team-detail-screen`)
- `src/aggregate.ts` (novo)
- `src/teamDetailView.ts` (novo)
- `src/teamsView.ts` (adicionar handler de clique)

## Dependência
> Requer Partes 1–4 concluídas
