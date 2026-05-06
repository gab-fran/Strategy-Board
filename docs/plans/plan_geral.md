# Plano completo de implementação da plataforma com Scouting e Strategy Board

## 1. Objetivo geral

O objetivo desse projeto é evoluir o atual **Strategy Board** para uma plataforma mais completa, que una em um só lugar:

* **Coleta de dados de scouting**
* **Organização e visualização desses dados**
* **Uso dos dados na estratégia da partida**
* **Sincronização local e em nuvem**
* **Funcionamento mesmo sem internet**

A ideia principal é que a plataforma continue leve, rápida e prática para uso em competição, mas ao mesmo tempo fique mais poderosa e organizada. O sistema deve ser construído de forma **modular**, para evitar bagunça e permitir futuras melhorias sem precisar reescrever tudo.

---

## 2. Visão geral da arquitetura

A aplicação deve ser dividida em quatro partes principais:

### a) Interface

Responsável pelas telas, navegação e exibição dos dados.

### b) Dados locais

Responsável por salvar informações no dispositivo, mesmo sem internet.

### c) Sincronização com a nuvem

Responsável por enviar e receber dados quando houver conexão.

### d) Processamento e agregação

Responsável por transformar os dados brutos em informações úteis para estratégia.

---

## 3. Princípios do projeto

Antes de começar a implementação, a IA deve seguir estas regras:

### 3.1. Não quebrar o sistema atual

O Strategy Board atual já existe. A nova solução deve ser adicionada com o mínimo de alterações possíveis no que já funciona.

### 3.2. Separação de responsabilidades

Cada parte do sistema deve ter uma função clara:

* telas em um lugar;
* lógica de dados em outro;
* sincronização em outro;
* cálculo de métricas em outro.

### 3.3. Offline-first

O sistema deve funcionar sem internet. A internet deve servir apenas para sincronizar depois.

### 3.4. Preparação para evolução

Agora o projeto pode usar Firebase. No futuro, se necessário, pode trocar para uma API própria. Por isso, o código não deve ficar preso diretamente ao Firebase na interface.

### 3.5. Praticidade em competição

As telas precisam ser rápidas, simples e fáceis de usar durante eventos reais.

---

# Estrutura funcional do sistema

A plataforma deve ter três grandes áreas:

## A. Tela de entrada

Tela inicial obrigatória, onde o usuário informa:

* número da equipe;
* nome do usuário;
* papel no sistema.

Essa etapa é importante para identificar quem está usando o sistema e registrar quem fez cada modificação ou scout.

## B. Módulo de Scouting

Área para coletar dados de:

* match scout;
* pit scout;
* histórico de equipes;
* visão consolidada.

## C. Strategy Board

Área para análise e planejamento da estratégia da partida, agora com dados de scouting integrados ao painel lateral.

---

# Identificação obrigatória do usuário

## Objetivo

Antes de entrar no sistema, o usuário deve digitar o **número da sua equipe**. Isso serve para rastrear quem fez cada ação, quem editou informações e de qual equipe vem o scout.

## Funcionamento

Ao abrir a aplicação pela primeira vez, o usuário deve ser levado para uma tela de identificação com os seguintes campos:

* **Número da equipe**: obrigatório
* **Nome do usuário**: recomendado
* **Papel**: Scout, Estrategista ou Admin

Essas informações devem ser salvas localmente e reaproveitadas automaticamente nas próximas sessões.

## Estrutura sugerida

```ts
{
  teamNumber: number,
  userName: string,
  role: "scout" | "strategist" | "admin"
}
```

## Uso dessa informação

Todas as ações feitas dentro do sistema devem registrar:

* quem fez;
* de qual equipe é;
* quando foi feito;
* se foi alterado depois.

Exemplos de campos úteis:

* `createdByTeam`
* `createdByName`
* `lastModifiedBy`
* `lastModifiedAt`

## Importância

Isso não substitui um login completo, mas resolve bem o problema de rastreamento interno sem complicar o uso durante a competição.

---

# Fases de implementação

---

## Fase 1 — Organização da base do projeto

### Objetivo

Preparar o projeto para receber os novos módulos sem bagunçar o que já existe.

### O que deve ser feito

* Separar claramente o que pertence ao Strategy Board atual.
* Definir o que será novo no módulo de Scouting.
* Criar uma estrutura de arquivos organizada.
* Mapear quais arquivos precisam de pequenas alterações.
* Definir nomes consistentes para funções, modelos e serviços.

### Arquivos sugeridos

* `app.ts` → inicialização geral
* `view.ts` → Strategy Board atual e tela principal
* `scoutView.ts` → interface do scouting
* `scout.ts` → lógica de dados do scouting
* `aggregate.ts` → cálculo de métricas
* `sync.ts` → sincronização local/nuvem
* `auth.ts` → identificação e permissões
* `db.ts` → banco local
* `cloud.ts` → Firebase
* `tba.ts` → integração com The Blue Alliance

### Resultado esperado

O projeto fica pronto para crescer sem virar uma mistura de código difícil de manter.

---

## Fase 2 — Tela inicial e seleção de módulo

### Objetivo

Criar um ponto de entrada único para a aplicação.

### O que deve ser feito

* Criar uma tela inicial obrigatória.
* Exibir os dois módulos principais:

  * Scouting
  * Strategy Board
* Exibir o evento ativo.
* Exibir status de conexão.
* Exibir status de sincronização.
* Permitir navegação entre módulos.

### Detalhes importantes

A tela inicial deve aparecer sempre que:

* o usuário abrir a aplicação pela primeira vez;
* não houver perfil salvo;
* o usuário quiser trocar de módulo.

### Resultado esperado

O usuário entende rapidamente onde está e para onde pode ir.

---

## Fase 3 — Identificação do usuário e equipe

### Objetivo

Fazer com que o sistema saiba quem está usando a aplicação.

### O que deve ser feito

* Criar a tela obrigatória de identificação.
* Solicitar número da equipe.
* Solicitar nome do usuário.
* Solicitar papel no sistema.
* Salvar essas informações localmente.
* Reusar esses dados automaticamente depois.

### Regras

* O número da equipe deve ser obrigatório.
* O nome pode ser obrigatório ou opcional, dependendo da decisão final.
* O papel define as permissões no sistema.
* Deve existir uma opção para editar o perfil depois.

### Resultado esperado

Toda modificação feita no sistema poderá ser rastreada com base no perfil salvo.

---

## Fase 4 — Estrutura de dados do scouting

### Objetivo

Definir como os dados do scouting serão armazenados.

### O que deve ser feito

Criar os modelos para:

### Match Scout

Campos sugeridos:

* número da equipe scoutada;
* chave do evento;
* chave da partida;
* equipe ou usuário que fez o scout;
* data e hora;
* status de sincronização;
* dados de auto;
* dados de teleop;
* dados de endgame;
* observações.

### Pit Scout

Campos sugeridos:

* número da equipe;
* evento;
* tipo de drivetrain;
* capacidades do auto;
* capacidades de climb;
* peso, se houver;
* foto, se houver;
* observações técnicas;
* status de sincronização.

### Dados agregados

Esses não precisam ser salvos prontos. Podem ser gerados na hora:

* média de pontos;
* consistência;
* taxa de climb;
* número de partidas;
* resumo geral da equipe.

### Resultado esperado

A estrutura de dados fica pronta para alimentar as telas e os cálculos.

---

## Fase 5 — Match Scout funcional

### Objetivo

Criar o fluxo principal de coleta de dados durante as partidas.

### O que deve ser feito

* Criar a tela de match scout.
* Permitir escolher o evento.
* Permitir escolher a partida.
* Permitir escolher uma das seis equipes.
* Exibir o formulário de scout.
* Salvar os dados localmente.
* Permitir continuar coletando dados sem voltar para o início.

### Requisitos da interface

* rápida;
* simples;
* objetiva;
* fácil de usar em tablet ou celular;
* poucos cliques para salvar.

### Resultado esperado

Os scouts conseguem registrar dados durante a competição de forma eficiente.

---

## Fase 6 — Pit Scout funcional

### Objetivo

Criar o fluxo de coleta de informações técnicas do robô.

### O que deve ser feito

* Criar a tela de pit scout.
* Permitir buscar a equipe pelo número.
* Exibir dados já existentes, se houver.
* Permitir edição.
* Salvar localmente.
* Permitir anexar observações e foto, se necessário.

### Diferença para o Match Scout

O pit scout é feito por equipe, e não por partida. Ele pode ter um formulário mais detalhado.

### Resultado esperado

A equipe passa a ter uma visão técnica completa dos robôs que está analisando.

---

## Fase 7 — Tela de equipes e visão consolidada

### Objetivo

Juntar os dados coletados em uma visão útil para análise.

### O que deve ser feito

* Criar uma lista com todas as equipes scoutadas.
* Unificar dados de match scout e pit scout.
* Criar filtros.
* Criar ordenação por métricas.
* Mostrar resumo visual da equipe.
* Permitir abrir o detalhe de uma equipe.

### Filtros sugeridos

* por aliança;
* por presença de pit scout;
* por quantidade de partidas;
* por desempenho;
* por consistência.

### Resultado esperado

O time consegue comparar as equipes de forma prática e organizada.

---

## Fase 8 — Detalhe da equipe

### Objetivo

Exibir todas as informações de uma equipe específica em uma única tela.

### O que deve ser feito

* Exibir histórico de partidas.
* Exibir médias de desempenho.
* Exibir notas do pit scout.
* Exibir consistência.
* Exibir observações.
* Permitir navegação para equipe anterior/próxima.
* Permitir edição, se o papel permitir.

### Resultado esperado

O usuário tem acesso rápido a todas as informações importantes de uma equipe.

---

## Fase 9 — Cálculo de métricas e agregações

### Objetivo

Transformar os dados brutos em informações úteis para estratégia.

### O que deve ser feito

Criar funções para calcular:

* média de pontos no auto;
* média de pontos no teleop;
* taxa de climb;
* quantidade de partidas analisadas;
* consistência;
* resumo das últimas observações;
* indicadores úteis para o Strategy Board.

### Por que isso é importante

Um scout isolado não diz tudo. O valor real está em analisar o conjunto dos dados.

### Resultado esperado

O sistema passa a exibir números inteligentes, não só formulários preenchidos.

---

## Fase 10 — Integração com o Strategy Board

### Objetivo

Fazer o Strategy Board consumir os dados de scouting.

### O que deve ser feito

* Manter o whiteboard como está.
* Adicionar uma seção nova no painel lateral.
* Exibir os dados das equipes da partida.
* Mostrar médias de auto, teleop e endgame.
* Mostrar informações do pit scout.
* Fazer a carga dos dados sem travar a interface.

### Ideia principal

O Strategy Board deixa de ser apenas um quadro de desenho e passa a ser uma ferramenta de estratégia baseada em dados reais.

### Resultado esperado

Quando a equipe abrir uma partida, verá os dados importantes imediatamente.

---

## Fase 11 — Sistema offline-first

### Objetivo

Garantir que tudo funcione mesmo sem internet.

### O que deve ser feito

* Salvar dados primeiro localmente.
* Criar uma fila de sincronização.
* Marcar entradas pendentes.
* Sincronizar quando a conexão voltar.
* Criar um botão manual de sincronização.
* Fazer cache dos dados da TBA.

### Fluxo esperado

1. Usuário cria ou edita dados.
2. Sistema salva no dispositivo.
3. Dados entram na fila.
4. Quando houver internet, o sistema envia automaticamente.
5. Se falhar, tenta depois.

### Resultado esperado

O sistema não depende da internet para funcionar durante a competição.

---

## Fase 12 — Uso do Firebase agora

### Objetivo

Usar Firebase como nuvem inicial, sem criar API própria neste momento.

### O que deve ser feito

* Criar a integração com Firebase.
* Salvar os dados de scouting na nuvem.
* Permitir leitura entre dispositivos.
* Manter a lógica de sync organizada.

### Regra importante

A interface não deve falar diretamente com o Firebase. Ela deve usar uma camada intermediária de serviço.

### Resultado esperado

Os dados ficam salvos localmente e também na nuvem, podendo ser compartilhados entre dispositivos.

---

## Fase 13 — Preparação para uma API futura

### Objetivo

Deixar o projeto pronto para, no futuro, trocar Firebase por uma API própria se necessário.

### O que deve ser feito

* Centralizar acesso aos dados em serviços.
* Evitar chamadas diretas ao Firebase nas telas.
* Separar lógica de negócio da lógica de banco.
* Criar funções como:

  * salvar scout;
  * buscar scout;
  * sincronizar dados;
  * buscar agregados.

### Resultado esperado

Se um dia a equipe quiser migrar para uma API própria, a transição será muito mais fácil.

---

## Fase 14 — Permissões e papéis

### Objetivo

Controlar o que cada usuário pode fazer dentro da aplicação.

### Papéis sugeridos

* Scout
* Estrategista
* Admin

### Permissões sugeridas

#### Scout

* criar match scout;
* criar pit scout;
* ver o necessário para a coleta.

#### Estrategista

* ver a tela de equipes;
* abrir detalhes;
* usar o Strategy Board;
* exportar relatórios.

#### Admin

* fazer tudo;
* trocar evento;
* editar entradas;
* apagar dados;
* configurar acesso.

### Resultado esperado

A plataforma fica mais organizada e segura para o uso do time.

---

## Fase 15 — Testes, ajustes e refinamento

### Objetivo

Garantir que a plataforma funcione bem na prática.

### O que deve ser feito

* Testar todos os fluxos.
* Verificar se o perfil é salvo corretamente.
* Testar funcionamento offline.
* Testar sincronização.
* Testar em notebook, tablet e celular.
* Ajustar interface, textos e botões.
* Testar cenário sem internet, sem evento e sem partidas publicadas.

### Resultado esperado

A aplicação fica pronta para uso real em competição.

---

# Ordem recomendada de implementação

A ordem mais inteligente é esta:

1. Organização da base
2. Tela inicial
3. Identificação do usuário e equipe
4. Estrutura de dados
5. Match Scout
6. Pit Scout
7. Tela de equipes
8. Detalhe da equipe
9. Métricas e agregações
10. Integração com Strategy Board
11. Offline-first
12. Firebase
13. Preparação para API futura
14. Permissões
15. Testes e refinamento

---

# Estrutura sugerida de arquivos

```txt
src/
  app.ts
  view.ts
  scoutView.ts
  scout.ts
  aggregate.ts
  sync.ts
  auth.ts
  db.ts
  cloud.ts
  tba.ts
  models/
    scoutModels.ts
    userModels.ts
    teamModels.ts
```

---

# Instruções finais para a IA que vai implementar

A IA deve seguir estas regras:

* Não reescrever o projeto inteiro.
* Preservar o Strategy Board atual.
* Criar os novos módulos de forma organizada.
* Fazer tudo funcionar offline.
* Salvar localmente antes de sincronizar.
* Usar Firebase agora.
* Não acoplar a interface diretamente ao Firebase.
* Deixar tudo pronto para uma futura API.
* Registrar número da equipe e nome do usuário antes do uso.
* Guardar quem fez cada alteração.

---

# Resumo final

Esse plano transforma o Strategy Board em uma plataforma completa, com:

* scouting organizado;
* identificação do usuário;
* rastreabilidade de alterações;
* armazenamento local e na nuvem;
* integração com estratégia;
* estrutura pronta para crescer depois.

