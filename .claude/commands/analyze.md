---
description: Analisa e planeja uma tarefa como PO + Tech Lead (Etapa 1 + Etapa 2 do feature-analysis-guide) e salva o plano em docs/features/<slug>/analyze/plan.md. Aceita descrição livre ou ID/link do ClickUp; pergunta o que for ambíguo antes de decidir.
argument-hint: "[descrição da tarefa ou ID/link do ClickUp — opcional: vazio usa as mudanças atuais]"
allowed-tools: Agent, AskUserQuestion, Read, Write, Edit, Grep, Glob, Bash, ToolSearch
---

# /analyze

Tarefa a analisar: **$ARGUMENTS**

Você é o orquestrador (loop principal) do papel **Planejador (PO + Tech Lead)**. Conduza assim:

## Passo 1 — Identifique a entrada

- **Descrição em texto livre** → é o caso comum, siga direto.
- **ID/custom ID do ClickUp** (ex.: `DEV-1234`) ou **URL** (`https://app.clickup.com/t/<id>`) → trate como
  referência de tarefa do ClickUp.
- **Vazio** → verifique se há mudanças no working tree (`git status -s`); se houver, pergunte
  (`AskUserQuestion`) se deve planejar/documentar a feature a partir das **mudanças atuais** ou pedir uma
  descrição. Sem mudanças, peça a descrição (ou o ID/link).

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
