# Pipeline de tarefas com agents

Como uma tarefa caminha neste repositório, de ponta a ponta, com o Claude Code. Complementa
[`AI-WORKFLOW.md`](AI-WORKFLOW.md) (o que está **instalado**: skills, harness, hooks) — aqui é o **fluxo de
trabalho**.

Tudo em português; código e mensagens de commit em inglês.

## O pipeline

```
Descobrir → Planejar  → Desenvolver → Revisar → QA        (+ opcional)
/spec     → /analyze  → /develop    → /review → /test      /observe · /mediate
   ↑                                                  │
   └────────────── /spec --sync fecha o ciclo ────────┘
```

Cada papel é um **slash command** (interativo, roda no loop principal e **pergunta antes de decidir**)
apoiado por um **subagent** (o motor autônomo que faz o trabalho pesado).

O ciclo é fechado de propósito. O `/spec` alimenta o pipeline a partir do backlog em
[`specs/`](../specs/README.md); no fim, `/spec --sync` **audita o backlog contra o código** e recomeça com
ele limpo. Sem esse retorno, o backlog vira lista de desejos — e uma lista de desejos que ninguém confere é
pior que nenhuma, porque parece confiável.

> Por que comandos e não só agents? Subagents rodam de forma autônoma e **não pausam para perguntar**. Os
> comandos rodam no loop principal, então conseguem usar `AskUserQuestion` (dúvidas de produto, gate de
> commit, confirmação para subir o app).

O estado vive **no disco**, por feature, em `docs/features/<slug>/` — cada etapa lê o que a anterior
deixou, sem depender da conversa.

## Comandos

| Comando | Papel | O que faz |
|---------|-------|-----------|
| `/spec [ideia \| --sync \| --next]` | Estrategista de Produto | Varre o repo, confronta com padrões de mercado (**com fontes**) e escreve/atualiza as specs em `specs/`. `--sync` reconcilia o backlog com o código **e arquiva as specs entregues**; `--next` recomenda a próxima. |
| `/analyze <nome-da-spec>` | PO + Tech Lead | **O argumento padrão é o nome de uma spec** (`/analyze audit-log`). Também aceita descrição livre ou ID/link do ClickUp; vazio, oferece as specs aprovadas do backlog. Salva **o plano** em `analyze/plan.md` + inicializa o `STATE.md`. |
| `/develop [slug? / --force]` | Desenvolvedor | Lê o plano e **implementa** o slice vertical (SDK → API → app/web → i18n); valida visualmente; escreve `develop/handoff.md`. Não cria branch nem commita. |
| `/review [foco? / --force]` | Revisor | Revisa o diff contra [`review-checklist.md`](review-checklist.md), valida visualmente, aplica correções, **resolve a branch**, escreve `review/review.md`, **pede aprovação antes de commitar** e, ao final, pergunta se deve dar **push**. |
| `/test [foco? / manual / --force]` | QA | Gera os critérios de aceite (§9.1) **E** roda os testes Vitest dos workspaces afetados + `pnpm test` do root; cria os testes que faltam; dirige o app com `agent-browser`. |
| `/observe [slug?]` | Observador *(opcional)* | Observação final de 2–3 parágrafos em linguagem de negócio, pronta para colar num card. Exige só o `/review`. |
| `/mediate [PR?]` | Mediador de PR *(avulso)* | Triagem dos comentários de uma PR aberta → markdown de replies com status por item. **Independente** do pipeline. |

> ⚠️ **Colisão de nome**: existe também um `/review` global (revisão de PR do GitHub). O deste projeto tem
> precedência. Para a revisão genérica de diff, use `/code-review`.

> `/spec` **não** faz parte do gate sequencial: ele roda antes de existir tarefa e pode ser chamado a
> qualquer momento. Uma tarefa não precisa nascer de spec — bug e ajuste pontual vão direto ao `/analyze`.
> Funcionalidade nova genérica, idealmente, nasce.

**Gate sequencial:** cada comando exige a etapa anterior concluída (`/develop`←`analyze`,
`/review`←`develop`, `/test`←`review`). Se faltar, ele **para** e manda rodar a etapa anterior. Use
`--force` (ou `--skip-gate`) para pular em casos legítimos (ex.: hotfix sem plano formal) — o bypass fica
registrado no `STATE.md`.

### Argumentos e foco padrão

O argumento é sempre **opcional**. **Sem foco, todos usam a feature mais recente** (o `STATE.md` mais novo
em `docs/features/`), e `/review`/`/test` focam nas mudanças atuais (`git diff`) à luz dos artefatos dessa
feature. O foco aceita: um **slug/caminho** de `docs/features/<slug>`, um caminho de arquivo, ou uma
descrição.

Assim o fluxo encadeia: `/analyze` gera o plano e o `STATE.md`, e os papéis seguintes leem o **handoff
conciso** da etapa anterior — não o plano inteiro. É o ganho de tokens do pipeline.

## Subagents (`.claude/agents/`)

Use via `@menção` para rodar isolado/em paralelo, ou deixe os comandos os acionarem.

- **`estrategista-produto`** — inventaria o repo, pesquisa o mercado e escreve as specs em `specs/`;
  reconcilia o backlog com o código; **não implementa nada**. Em `docs/features/` só toca para arquivar a
  spec entregue (`spec.md` + o campo `spec:` no `STATE.md`).
- **`planejador-tarefa`** — análise PO+TechLead; lê ClickUp/links; escreve `analyze/plan.md` + `STATE.md`;
  devolve blueprint + "Perguntas em aberto".
- **`desenvolvedor`** — lê o plano, implementa na ordem SDK → API → app/web → i18n, valida visualmente,
  escreve `develop/handoff.md`; **não cria branch nem commita**.
- **`revisor-codigo`** — revisa o diff + handoff, aplica correções, **é o dono da branch**, escreve
  `review/review.md`, devolve o plano de commits (**não commita nem pusha**).
- **`analista-qa`** — roda e cria testes, gera critérios em `test/`, dirige o app com `agent-browser`;
  **não cria/nomeia branch nem commita**.
- **`observador-tarefa`** — observação final de negócio (`observacao.md`).
- **`mediador-pr`** — triagem de comentários de PR (`pr-review/pr-<n>.md`).
- **`code-reviewer`** — revisor **read-only** avulso ("revise o diff"), mesmo checklist do
  `revisor-codigo`, sem tocar em arquivos nem em branch.

## Regras que valem para todos

**Convenções de código** — a fonte de verdade é o [`CLAUDE.md`](../CLAUDE.md) raiz + os `CLAUDE.md`
aninhados (`apps/api`, `apps/app`, `apps/web`, `packages`), **carregados automaticamente** ao trabalhar em
cada árvore, + [`AGENTS.md`](../AGENTS.md) para design system/RHF. O destilado acionável sobre um diff é
[`review-checklist.md`](review-checklist.md) — **fonte única** do que uma revisão cobra.

**Roteiro de análise** — [`feature-analysis-guide.md`](feature-analysis-guide.md): o checklist de tech lead
que o `/analyze` preenche e do qual o `/test` deriva os critérios de aceite (formato obrigatório na §9.1).

**Validação visual** — regra de ouro 11: front-end não está pronto sem validação visual com
`agent-browser`. É gate no `/develop`, no `/review` e no `/test`. Rode os comandos do `agent-browser`
**estritamente em sequência**; confira **light + dark + mobile**.

**O CI é o gate final, não o `/review`.** Toda PR roda `pnpm turbo run lint typecheck test` no GitHub
Actions ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)), então lint, tipos, testes e paridade
de i18n deixam de depender de alguém lembrar de rodá-los. Isso não desobriga ninguém: rodar antes de
commitar continua sendo mais rápido que descobrir na PR. O que muda é o **foco** — o `/review` e o `/test`
passam a valer pelo que a máquina não vê (convenção de camada, autorização, copy errada nos 3 idiomas,
comportamento na tela). ⚠️ O `build` **não** está no CI: `apps/api` exige as `FIREBASE_ADMIN_*`.

**Comentários no código** ([`.claude/rules/code-comments.md`](../.claude/rules/code-comments.md)) — o padrão
é **não comentar**; exceções só para regra de negócio não evidente ou trecho genuinamente difícil,
explicando o *porquê*. E **nunca** referenciar o fluxo de agents (`docs/features/**`, `plan.md`,
`handoff.md`, `review.md`, ID de card, "pedido no review") — mesmo estando versionado, o plano descreve a
intenção de um momento e o ponteiro apodrece; comentário precisa ser autossuficiente.

**Git** ([`.claude/rules/git-commits.md`](../.claude/rules/git-commits.md)):

- **Nenhum commit em `main`/`master`/`production`/`production-backup`** — exige branch nova + PR. O hook
  `PreToolUse` `.claude/hooks/block-protected-branch-write.sh` é a rede de segurança.
- **Só o `revisor-codigo` define e cria branch.** Os demais param e sinalizam.
- **Commit só com aprovação explícita** do usuário, bloco a bloco, no `/review`.
- **Push** só no fim do `/review`, depois de todos os commits, e **com confirmação**.
- Ordem de commit: **`packages/sdk` → `apps/api` → `apps/app`/`apps/web` → `packages/internationalization`**.

**ClickUp é somente leitura.** Nenhum agent ou comando escreve lá (sem `clickup_create_comment`,
`clickup_update_task`, anexos). Os artefatos ficam em `docs/features/<slug>/`; levar algo para o card é
colagem manual.

## Estrutura por feature (`STATE.md` + etapas)

```
docs/features/<slug>/          ← versionado: o histórico de como a feature foi construída
  STATE.md            ← índice + gate: status por etapa (pending/in-progress/done/blocked)
  spec.md             ← a spec de origem, movida de specs/ na entrega   [/spec --sync]
  analyze/plan.md     ← blueprint (Etapa 1 + Etapa 2)              [/analyze]
  develop/handoff.md  ← blueprint→arquivos, desvios, pendências     [/develop]
  review/review.md    ← achados, correções, branch, commits         [/review]
  test/               ← criterios-aceite.md, report.md, e2e/        [/test]
  observacao.md       ← resumo de negócio                           [/observe]
  pr-review/          ← triagem de comentários de PR                [/mediate]
```

Com o `spec.md` ao lado do plano, a pasta da feature passa a contar a história inteira em ordem:
**por que** (spec) → **como** (plano) → **o que saiu** (handoff) → **o que foi cobrado** (review) →
**como foi provado** (test). Nem toda feature tem `spec.md` — bugs e ajustes pontuais entram direto pelo
`/analyze`.

O `STATE.md` é a **fonte da ordem** e o **breadcrumb** entre etapas: como o contexto é limpo (`/compact`,
`/clear`) entre comandos, cada um lê esse arquivo pequeno para saber o que já rodou e onde estão os
artefatos. Os **handoffs concisos** (`handoff.md`, `review.md`) fazem a etapa seguinte trabalhar sem reler
o plano inteiro + o diff inteiro.

> `docs/features/` **é versionado de propósito**: junto com o histórico de commits, é o registro de *por
> que* cada feature ficou como ficou — a análise, os trade-offs, os critérios de aceite e as evidências de
> teste. Vale commitá-lo com a feature (o `revisor-codigo` inclui a pasta no plano de commits, tipicamente
> como um commit `docs(features): <slug>` no fim).
>
> Estar no repo, porém, **não** autoriza comentário de código a apontar para lá — ver
> [`.claude/rules/code-comments.md`](../.claude/rules/code-comments.md).

## Épicos (tarefas grandes com subtarefas)

Quando a tarefa tem **subtarefas**, o `/analyze` a trata como **épico**. Ele gera:

- `docs/features/<épico>/epic.md` + `STATE.md` do épico — visão, **fundações compartilhadas** (ex.: um DTO
  novo no SDK, um guard novo, um campo que várias subtarefas usam), mapa de impacto por app e
  **sequenciamento/dependências**;
- **um plano por subtarefa**: `docs/features/<épico>/<NN>-<subtask>/analyze/plan.md` (+ `STATE.md` próprio).

O `/analyze` pergunta se deve aprofundar **todas as subtarefas agora** ou só montar o `epic.md` + stubs.
Depois, **cada subtarefa roda o pipeline completo**: `/develop <subtask> → /review → /test`.

**Branch:** branch do épico `feat/<epic-slug>` (a partir de `main`); cada subtarefa é uma sub-branch
`<project>/feat/<epic-slug>-<subtask>` → PR **para a branch do épico**; ao final, **1 PR do épico para
`main`**. Siga a ordem de dependências do `epic.md` (a subtarefa-fundação primeiro).

## Exemplo de ponta a ponta

```text
0. /spec                                                                    (opcional, mas é a entrada)
   → varre o repo, pesquisa o mercado, propõe specs em specs/; você aprova "audit-log";
     spec fica approved no specs/BACKLOG.md.
1. /analyze audit-log                          ← o nome da spec é o argumento padrão
   → lê specs/audit-log.md (problema, evidência, corte de MVP já decidido) e produz o blueprint em
     docs/features/audit-log/analyze/plan.md + STATE.md (analyze=done, spec: audit-log);
     a spec passa a in-progress e CONTINUA em specs/ durante todo o desenvolvimento.
2. /develop
   → implementa SDK → API → app → i18n; typecheck + pnpm check + paridade de i18n;
     valida no browser (light/dark/mobile); escreve develop/handoff.md; develop=done.
3. /review
   → revisa (handoff + diff + raio de impacto), valida visualmente, corrige, cria a branch
     app/feat/user-notifications, propõe os commits e commita bloco a bloco após sua aprovação;
     no fim pergunta se deve dar push; review=done.
4. /test
   → gera critérios (§9.1), roda pnpm --filter app test + pnpm test, cria os testes que faltam,
     dirige o app e salva os prints em test/e2e/; test=done.
5. /observe            (opcional)
   → observação de negócio pronta para colar no card.
6. /spec --sync
   → confere no código que o corte de MVP foi entregue; audit-log vira done e é MOVIDA
     (git mv specs/audit-log.md docs/features/audit-log/spec.md);
     o BACKLOG.md a registra em "Entregues" e specs/ volta a conter só o que falta.
```

## Skills usadas pelo pipeline

Catálogo completo em [`AI-WORKFLOW.md`](AI-WORKFLOW.md). As que o fluxo aciona diretamente:

| Skill | Onde entra |
|-------|-----------|
| `/new-crud` · `/new-api-route` | `/develop` — scaffolding do slice |
| `/i18n-sync` | `/develop` — toda chave de UI e todo `error.code` novo |
| `/write-tests` | `/develop` e `/test` |
| `agent-browser` | `/develop`, `/review`, `/test` — validação visual (obrigatória) |
| `/code-review` | `/review` — passada genérica de bugs/simplificação |
| `brainstorming` | antes do `/develop`, quando a tarefa cria UI nova |
| `/payments-flow` | `/develop`, em tarefas de assinatura |
| `/security-review` | após o `/review`, em mudanças de auth/pagamento/dados |
