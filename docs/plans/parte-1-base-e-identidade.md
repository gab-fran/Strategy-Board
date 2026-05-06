# Parte 1 — Base do projeto e identificação do usuário

## Goal
Preparar a estrutura de arquivos e criar a tela de identificação do usuário sem quebrar o que já existe.

## Contexto
- O Strategy Board atual funciona em `app.ts` + `view.ts` + `whiteboard.ts` + `model.ts`
- Novos módulos devem ser adicionados ao lado, sem reescrever o que existe
- Usar `idb-keyval` (já no projeto) para salvar perfil localmente

## Tasks

- [ ] **T1**: Criar pastas `src/models/` e `src/services/` → Verificar: estrutura existe no disco
- [ ] **T2**: Criar `src/models/userModels.ts` com interface `UserProfile { teamNumber, userName, role }` → Verificar: TypeScript compila sem erro
- [ ] **T3**: Criar `src/auth.ts` com funções `saveProfile(p)`, `loadProfile()`, `hasProfile()` usando `idb-keyval` → Verificar: console.log retorna dados salvos
- [ ] **T4**: Criar HTML da tela de identificação em `index.html` (modal ou seção oculta com id `#identity-screen`) com campos: team number, name, role (select) → Verificar: elemento existe no DOM
- [ ] **T5**: Criar `src/authView.ts` que controla o modal de identidade (mostrar/esconder, ler formulário, chamar `auth.ts`) → Verificar: ao preencher e clicar em Salvar, `loadProfile()` retorna os dados
- [ ] **T6**: Em `app.ts`, chamar `hasProfile()` na inicialização; se falso, mostrar tela de identidade antes de tudo → Verificar: abrir app sem perfil exibe o modal; com perfil salvo, vai direto

## Done When
- [ ] Novo usuário vê o formulário de identificação ao abrir o app
- [ ] Dados salvos localmente e reutilizados na próxima sessão
- [ ] Strategy Board atual continua funcionando normalmente
- [ ] `bun run build` passa sem erros de TypeScript

## Arquivos afetados
- `index.html` (adicionar seção `#identity-screen`)
- `src/app.ts` (chamar verificação de perfil)
- `src/auth.ts` (novo)
- `src/authView.ts` (novo)
- `src/models/userModels.ts` (novo)
