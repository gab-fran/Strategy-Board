# Parte 7 — Offline-first, Firebase e permissões

## Goal
Garantir funcionamento offline com fila de sync, integrar Firebase como nuvem e controlar permissões por papel.

## Contexto
- Dados já são salvos localmente (IndexedDB) desde a Parte 3
- Firebase já é usado para o Strategy Board (`cloud.ts` existente)
- A interface nunca deve chamar Firebase diretamente — sempre via `sync.ts`
- Permissões são baseadas no `role` do perfil salvo em `auth.ts` (Parte 1)

## Tasks

### Offline & Sync
- [ ] **T1**: Criar `src/sync.ts` com funções `queueForSync(entry)`, `processSyncQueue()`, `isSynced(id)` — a fila usa IndexedDB com chave `"sync_queue"` → Verificar: salvar um scout adiciona item à fila; chamar `processSyncQueue()` sem internet não quebra
- [ ] **T2**: Em `src/services/scoutService.ts`, após salvar localmente, chamar `queueForSync(entry)` automaticamente → Verificar: todo novo scout entra na fila
- [ ] **T3**: Em `src/app.ts`, registrar listener `window.addEventListener("online", processSyncQueue)` → Verificar: reconectar a internet dispara a sincronização no console

### Firebase
- [ ] **T4**: Em `src/sync.ts`, implementar `uploadToFirebase(entry)` que usa o `cloud.ts` existente para salvar scouts na coleção `"scouting"` — carregar `cloud.ts` via `import()` dinâmico → Verificar: scout aparece no Firestore após sync
- [ ] **T5**: Adicionar `downloadScoutsFromFirebase(eventKey)` em `sync.ts` para buscar scouts de outros dispositivos → Verificar: abrir em segundo dispositivo, clicar "Sincronizar" e ver dados do primeiro

### Permissões
- [ ] **T6**: Criar `src/permissions.ts` com função `can(action, role)` baseado na tabela: Scout → criar scouts; Estrategista → ver equipes + Strategy Board; Admin → tudo → Verificar: `can("delete", "scout")` retorna `false`
- [ ] **T7**: Em `scoutView.ts` e `teamsView.ts`, chamar `can()` para esconder/mostrar botões de edição e exclusão conforme o papel do perfil → Verificar: usuário com role "scout" não vê botão "Editar" nas entradas de outros

## Done When
- [ ] Scouts salvos offline entram na fila e sincronizam ao voltar online
- [ ] Dados aparecem no Firestore após sincronização
- [ ] Papel "scout" não vê controles de admin/estrategista
- [ ] `bun run build` passa sem erros

## Arquivos afetados
- `src/sync.ts` (novo)
- `src/services/scoutService.ts` (adicionar chamada à fila)
- `src/permissions.ts` (novo)
- `src/app.ts` (adicionar listener online)
- `src/scoutView.ts` (aplicar permissões)
- `src/teamsView.ts` (aplicar permissões)

## Dependência
> Requer Partes 1–6 concluídas
