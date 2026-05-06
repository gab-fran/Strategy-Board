# Índice — Plano de implementação dividido

> Este arquivo organiza as 7 partes de implementação derivadas do `plan_geral.md`.
> Cada parte é independente e sequencial. Conclua uma antes de começar a próxima.

---

## Visão geral

| Parte | Arquivo | Fases do plano geral | Status |
|-------|---------|----------------------|--------|
| 1 | `parte-1-base-e-identidade.md` | Fase 1 + Fase 3 | ⬜ Pendente |
| 2 | `parte-2-home-e-modelos.md` | Fase 2 + Fase 4 | ⬜ Pendente |
| 3 | `parte-3-match-scout.md` | Fase 5 | ⬜ Pendente |
| 4 | `parte-4-pit-scout-e-equipes.md` | Fase 6 + Fase 7 | ⬜ Pendente |
| 5 | `parte-5-detalhe-e-metricas.md` | Fase 8 + Fase 9 | ⬜ Pendente |
| 6 | `parte-6-integracao-strategy-board.md` | Fase 10 | ⬜ Pendente |
| 7 | `parte-7-offline-firebase-permissoes.md` | Fase 11 + 12 + 13 + 14 | ⬜ Pendente |

> Fase 15 (testes e refinamento) é feita ao longo de cada parte, não separadamente.

---

## Regras de ouro para a implementação

1. **Nunca reescrever** `whiteboard.ts`, `model.ts` ou `db.ts` — apenas extender
2. **Sempre compilar** (`bun run build`) ao terminar cada tarefa
3. **Salvar local primeiro** — só então sincronizar com Firebase
4. **Interface nunca chama Firebase diretamente** — sempre via `sync.ts`
5. **Cada parte tem arquivos claramente listados** — não misturar responsabilidades

---

## Novos arquivos que serão criados

```
src/
  auth.ts           ← Parte 1
  authView.ts       ← Parte 1
  homeView.ts       ← Parte 2
  scoutView.ts      ← Parte 3 (match) + Parte 4 (pit)
  teamsView.ts      ← Parte 4
  teamDetailView.ts ← Parte 5
  aggregate.ts      ← Parte 5
  scoutPanel.ts     ← Parte 6
  sync.ts           ← Parte 7
  permissions.ts    ← Parte 7
  models/
    userModels.ts   ← Parte 1
    scoutModels.ts  ← Parte 2
    teamModels.ts   ← Parte 2
  services/
    scoutService.ts ← Parte 3
```

## Arquivos existentes que serão modificados

```
index.html   ← novas seções de tela em cada parte
src/app.ts   ← fluxo de inicialização (Partes 1, 2, 7)
src/view.ts  ← adicionar #scout-panel (Parte 6 apenas)
```
