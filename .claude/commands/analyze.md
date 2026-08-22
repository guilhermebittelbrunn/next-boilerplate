---
description: Analisa e planeja uma tarefa como PO + Tech Lead (Etapa 1 + Etapa 2 do feature-analysis-guide) e salva o plano em docs/features/<slug>/analyze/plan.md. O argumento padrão é o nome de uma spec de specs/; também aceita descrição livre ou ID/link do ClickUp. Pergunta o que for ambíguo antes de decidir.
argument-hint: "<nome-da-spec> (padrão) | descrição livre | ID/link do ClickUp | vazio escolhe do backlog"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, ToolSearch
---

# /analyze

Tarefa a analisar: **$ARGUMENTS**

Você é o orquestrador (loop principal) do papel **Planejador (PO + Tech Lead)**. Conduza assim:

## Passo 1 — Resolva a entrada (spec é o padrão)

**A entrada esperada é o nome de uma spec.** Resolva `$ARGUMENTS` nesta ordem — pare na primeira que casar:

1. **Vazio** → leia `specs/BACKLOG.md` e ofereça as specs com status `approved` (e, se não houver, as
   `proposed`) via `AskUserQuestion`, na ordem recomendada do backlog. Ofereça também "nenhuma — vou
   descrever a tarefa" e "usar as mudanças atuais do working tree". Sem backlog, caia no comportamento
   antigo: `git status -s` e, se houver mudanças, pergunte se deve planejar em cima delas.
2. **ID/custom ID do ClickUp** (`DEV-1234`) ou **URL** (`https://app.clickup.com/t/<id>`) → modo ClickUp.
3. **Parece nome de spec** — o caso padrão. O discriminador é a **forma**: um token único, sem espaço, em
   kebab-case (aceite também os prefixos/sufixos `spec:`, `.md` e `specs/`, normalizando-os). Se a forma
   casar, o usuário **quis dizer uma spec** — e a partir daqui o argumento nunca vira descrição livre:
   - `specs/<id>.md` existe → **Modo spec** (abaixo);
   - `docs/features/*/spec.md` tem esse `id` → a spec **já foi entregue e arquivada**. Diga isso, mostre a
     feature, e pergunte se é para tratar como evolução/regressão daquilo;
   - não achou em lugar nenhum → **é typo**. Liste os ids disponíveis em `specs/` e pergunte qual era.
4. **Descrição em texto livre** (qualquer coisa com espaço) → modo descrição. Antes de seguir, **procure em
   `specs/` uma spec que já cubra o assunto** (`grep` por palavras-chave nos títulos e no `id`). Se
   encontrar, avise e pergunte se deve usá-la em vez da descrição solta — é o que evita planejar duas vezes
   a mesma coisa.

### Modo spec

1. Leia `specs/<id>.md` **por completo**. O problema, a evidência e o **corte de MVP** são **decisão de
   produto já tomada** — não as re-litigue no plano.
2. Confira o `status` no frontmatter:
   - `approved` → siga.
   - `proposed` → **avise que ela ainda não foi triada** e pergunte (`AskUserQuestion`) se deve seguir
     assim mesmo ou rodar `/spec` antes para aprovar.
   - `in-progress` → já existe feature em andamento; mostre o `feature: <slug>` e pergunte se é para
     continuar aquela ou abrir outra.
   - `done` → estado inconsistente: entregue deveria ter sido arquivado. Pare e mande rodar
     **`/spec --sync`**, que resolve o caso (arquiva se o código confirmar, ou reporta regressão).
   - `deferred` / `rejected` → pare e pergunte. Reabrir exige decisão explícita.
3. Verifique o `depends_on`: se alguma dependência **não** estiver entregue, avise antes de planejar.
4. Repasse o conteúdo da spec ao `planejador-tarefa` e instrua-o a gravar `spec: <id>` no frontmatter do
   `STATE.md`.
5. Ao final, marque a spec como `status: in-progress`, `feature: <slug>` e `updated` de hoje.
   **Não mova o arquivo** — arquivar é do `/spec --sync` (ciclo de vida em
   [`specs/README.md`](../../specs/README.md)).

> **Épico?** Se a tarefa tiver **subtarefas**, é um épico. Pergunte (`AskUserQuestion`) se deve
> **aprofundar todas as subtarefas agora** ou montar só o `epic.md` (visão + sequenciamento) + stubs por
> subtarefa. Instrua o `planejador-tarefa` conforme a escolha — ele gera
> `docs/features/<epic-slug>/epic.md` + um plano por subtarefa. Os passos abaixo valem para o épico e para
> cada plano de subtarefa gerado.

## Passo 2 — Acione o motor

Invoque o subagent **`planejador-tarefa`** (Agent tool, `subagent_type: "planejador-tarefa"`), repassando
`$ARGUMENTS` (ou o contexto das mudanças) e instruindo a:

- buscar o contexto no ClickUp quando for o caso (**somente leitura**);
- **seguir e ler todos os links acessíveis** citados na tarefa/comentários (doc/wiki do ClickUp via
  `clickup_*_document_pages`, URLs externas via `WebFetch`) — a wiki/doc é fonte autoritativa de produto;
  links inacessíveis (Figma com senha) viram "referência não lida". Se você (orquestrador) já leu
  prints/imagens enviados pelo usuário, **repasse o conteúdo descrito** (quais informações e em que
  posição) ao agente, pois ele não enxerga as imagens;
- **ler o slice de referência `entity`** antes de desenhar qualquer coisa nova, e propor o **corte de MVP**
  (a menor fatia vertical que entrega valor);
- produzir Etapa 1 (produto) + Etapa 2 (blueprint do slice `packages/sdk` → `apps/api` → `apps/app`/`web`
  → i18n) seguindo [`docs/feature-analysis-guide.md`](../../docs/feature-analysis-guide.md), e salvar o
  plano em `docs/features/<slug>/analyze/plan.md`;
- **criar/atualizar o `docs/features/<slug>/STATE.md`** marcando `analyze = done`;
- retornar o resumo, o caminho do arquivo e a seção **"Perguntas em aberto"**.

## Passo 3 — Pergunte antes de decidir

Pegue as "Perguntas em aberto" e faça-as ao usuário com `AskUserQuestion` (decisões de produto/escopo/nome
de campo mais relevantes; ofereça a recomendação default como primeira opção). Não invente respostas.

Perguntas que costumam importar neste repo e que valem a pena confirmar quando o agente as levantar:

- **corte de MVP** (o que fica para depois);
- **área do painel**: comum, admin ou ambas (define o guard);
- **modo de produto**: o comportamento difere entre `subscription` e `simple`?
- **volume esperado**: se a listagem pode crescer, o `BaseRepository` (sem paginação, filtro em memória)
  precisa evoluir — isso é decisão de arquitetura, não detalhe de implementação.

## Passo 4 — Consolide

Aplique as respostas ao `analyze/plan.md`, ajustando o blueprint. Garanta que o `STATE.md` reflita
`analyze = done`. Apresente um resumo executivo e o caminho do arquivo. Confirme o `<slug>` usado (os
outros comandos localizam a feature pelo `STATE.md` mais recente em `docs/features/`).

## Passo 5 — ClickUp é somente leitura

**Não** poste comentário, não atualize a tarefa, não anexe nada (`clickup_create_comment`,
`clickup_update_task` e afins estão fora do fluxo). O resultado vive em `docs/features/<slug>/` — se o
usuário quiser levar algo para o card, ele copia de lá.

## Passo 6 — Próximo passo

Sugira rodar **`/develop`** para implementar o blueprint.

Se a tarefa **não** veio de uma spec e é uma funcionalidade nova genérica (não um bug, nem ajuste pontual),
mencione que **`/spec <ideia>`** teria confrontado a ideia com o que já existe e com o mercado antes do
plano — útil na próxima.

Se veio de uma spec, confirme que ela ficou `in-progress` com `feature: <slug>` apontando para a feature
criada, e lembre o ciclo completo: `/develop → /review → /test → /spec --sync`.

## Estado do pipeline (`STATE.md`)

Toda feature tem um `docs/features/<slug>/STATE.md` — o **índice + gate** que encadeia
`analyze → develop → review → test → observe (opcional)`. Como o contexto é limpo entre etapas, **o disco é
a memória**. Layout:

```
docs/features/<slug>/          (versionado — o histórico de como a feature foi construída)
  STATE.md            ← índice + gate
  analyze/plan.md     ← este passo
  develop/handoff.md  ← /develop
  review/review.md    ← /review
  test/               ← /test (criterios-aceite.md, report.md, e2e/)
  observacao.md       ← /observe (opcional)
```

Mantenha tudo em português e em Markdown estruturado. **Não implemente código aqui** — só análise/plano.
