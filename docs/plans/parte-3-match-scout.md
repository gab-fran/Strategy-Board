# Parte 3 — Match Scout funcional

## Goal
Criar a tela de coleta de dados durante as partidas com salvamento local.

## Contexto
- Modelos `MatchScoutEntry` e `PitScoutEntry` já existem (Parte 2)
- Perfil do usuário disponível via `auth.ts` (Parte 1)
- Dados salvos via `idb-keyval` no IndexedDB
- Interface deve ser rápida, simples e funcional em tablet/celular

## Tasks

- [ ] **T1**: Criar `src/services/scoutService.ts` com funções `saveMatchScout(entry)`, `getAllMatchScouts()`, `getMatchScoutsByTeam(teamNumber)` usando `idb-keyval` → Verificar: salvar e buscar retornam dados corretos no console
- [ ] **T2**: Criar HTML do match scout em `index.html` (seção `#match-scout-screen`) com campos: evento, partida, equipe (1-6), auto, teleop, endgame, observações → Verificar: todos os campos aparecem no DOM
- [ ] **T3**: Criar `src/scoutView.ts` com função `initMatchScout()` que lê o formulário, injeta `createdByTeam` / `createdByName` / `createdAt` do perfil salvo, e chama `scoutService.saveMatchScout()` → Verificar: ao submeter, dado aparece no IndexedDB (DevTools → Application)
- [ ] **T4**: Adicionar navegação: botão "Voltar" para `#home-screen` e botão "Novo Scout" para limpar formulário sem sair da tela → Verificar: navegação funciona sem reload
- [ ] **T5**: Integrar a tela ao `homeView.ts` — clicar em "Scouting" abre o match scout por padrão → Verificar: fluxo completo home → match scout → salvar → home funciona

## Done When
- [ ] Usuário consegue preencher e salvar um match scout
- [ ] Dados ficam no IndexedDB com campos `createdByTeam`, `createdByName`, `createdAt`
- [ ] Interface funciona em tela pequena (< 768px)
- [ ] `bun run build` passa sem erros

## Arquivos afetados
- `index.html` (adicionar seção `#match-scout-screen`)
- `src/scoutView.ts` (novo — começa com match scout)
- `src/services/scoutService.ts` (novo)

## Dependência
> Requer Partes 1 e 2 concluídas
