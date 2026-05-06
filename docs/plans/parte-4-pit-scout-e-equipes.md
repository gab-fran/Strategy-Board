# Parte 4 — Pit Scout e tela de equipes

## Goal
Criar o formulário de pit scout e a listagem consolidada de todas as equipes scoutadas.

## Contexto
- `scoutService.ts` já existe com funções de match scout (Parte 3)
- Pit scout é por equipe, não por partida — formulário mais detalhado
- Tela de equipes une dados de match + pit scout em uma lista filtrável

## Tasks

- [ ] **T1**: Adicionar funções `savePitScout(entry)`, `getPitScoutByTeam(teamNumber)`, `getAllPitScouts()` em `src/services/scoutService.ts` → Verificar: salvar e buscar pit scout funciona no console
- [ ] **T2**: Criar HTML do pit scout em `index.html` (seção `#pit-scout-screen`) com campos: número da equipe, drivetrain, capacidades auto, climb, peso, observações técnicas → Verificar: todos os campos aparecem no DOM
- [ ] **T3**: Em `src/scoutView.ts`, adicionar `initPitScout()` — carregar dados existentes ao digitar número de equipe, permitir edição, salvar com metadados do perfil → Verificar: editar pit scout de uma equipe já scoutada atualiza o registro
- [ ] **T4**: Criar HTML da tela de equipes em `index.html` (seção `#teams-screen`) com lista de cards por equipe, filtros básicos (por aliança, por número de partidas) e barra de busca → Verificar: cards aparecem para cada equipe que tem dados
- [ ] **T5**: Criar `src/teamsView.ts` que lê todos os scouts, agrupa por equipe e renderiza os cards → Verificar: ao abrir a tela, equipes com dados aparecem listadas
- [ ] **T6**: Adicionar navegação entre telas: home → pit scout, home → lista de equipes → Verificar: todas as rotas funcionam

## Done When
- [ ] Pit scout salva e carrega dados por equipe
- [ ] Lista de equipes exibe todas que têm dados (match ou pit)
- [ ] Filtro por número de equipe funciona
- [ ] `bun run build` passa sem erros

## Arquivos afetados
- `index.html` (adicionar `#pit-scout-screen` e `#teams-screen`)
- `src/services/scoutService.ts` (adicionar funções de pit scout)
- `src/scoutView.ts` (adicionar `initPitScout()`)
- `src/teamsView.ts` (novo)

## Dependência
> Requer Partes 1, 2 e 3 concluídas
