# Parte 2 — Tela inicial e estrutura de dados do scouting

## Goal
Criar a tela inicial de navegação entre módulos e definir os modelos de dados do scouting.

## Contexto
- Usuário já tem perfil salvo (Parte 1 concluída)
- A tela inicial substitui a entrada direta no Strategy Board
- Os modelos criados aqui serão usados em todas as fases seguintes

## Tasks

- [ ] **T1**: Criar `src/models/scoutModels.ts` com interfaces `MatchScoutEntry` e `PitScoutEntry` (campos conforme plano geral) → Verificar: TypeScript compila sem erro
- [ ] **T2**: Criar `src/models/teamModels.ts` com interface `TeamSummary` (aggregated data) → Verificar: arquivo existe e tipos compilam
- [ ] **T3**: Criar HTML da tela inicial em `index.html` (seção `#home-screen`) com 2 botões: "Scouting" e "Strategy Board", + badge do evento ativo e status de conexão → Verificar: elemento visível no DOM
- [ ] **T4**: Criar `src/homeView.ts` que gerencia a tela inicial (mostrar/esconder, navegar para módulos) → Verificar: clicar em "Strategy Board" abre o whiteboard existente sem erros
- [ ] **T5**: Atualizar `src/app.ts` para usar o fluxo: perfil → tela inicial → módulo escolhido → Verificar: sequência funciona do zero

## Done When
- [ ] Após identificação, usuário vê a tela inicial com os dois módulos
- [ ] Clicar em "Strategy Board" abre o sistema atual sem regressão
- [ ] Modelos TypeScript existem e compilam
- [ ] `bun run build` passa sem erros

## Arquivos afetados
- `index.html` (adicionar seção `#home-screen`)
- `src/app.ts` (atualizar fluxo de inicialização)
- `src/homeView.ts` (novo)
- `src/models/scoutModels.ts` (novo)
- `src/models/teamModels.ts` (novo)

## Dependência
> Requer Parte 1 concluída (`auth.ts`, `authView.ts`, `userModels.ts`)
