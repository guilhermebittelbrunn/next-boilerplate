# Trabalhando com IA neste repo

Este repositório vem integrado com o **Claude Code**. Este guia é o **hub**: o que está configurado e
quando usar cada coisa. O objetivo é que cada fork já nasça com uma base sólida para desenvolvimento
assistido por IA.

> **Vai executar uma tarefa?** O fluxo de trabalho (`/spec → /analyze → /develop → /review → /test`,
> fechando com `/spec --sync`) está em [`TASK-PIPELINE.md`](TASK-PIPELINE.md). Este documento cobre o
> **ferramental**.

## O que está configurado

| Artefato | Caminho | Para quê |
|----------|---------|----------|
| Memória do projeto | [`CLAUDE.md`](../CLAUDE.md) | Lido automaticamente. Mapa do repo, comandos, regras de ouro e ponteiros. **Curto** de propósito. |
| Convenções completas | [`AGENTS.md`](../AGENTS.md) | Fonte de verdade detalhada (API, app, design system/RHF). |
| Regras por escopo | `apps/*/CLAUDE.md`, `packages/CLAUDE.md` | `CLAUDE.md` aninhados, **auto-carregados** ao trabalhar em cada pasta. |
| Regras globais de conduta | `.claude/rules/*.md` | Sempre em contexto: commits/branches e comentários no código. |
| Pipeline de tarefas | [`TASK-PIPELINE.md`](TASK-PIPELINE.md) | Comandos, subagents, `STATE.md`, gates, épicos. |
| Backlog de funcionalidades | [`specs/`](../specs/README.md) | O que **ainda falta** no core, com evidência de mercado e status auditado contra o código. Entrada do ciclo — a spec entregue **sai daqui** e é arquivada em `docs/features/<slug>/spec.md`. |
| Roteiro de análise | [`feature-analysis-guide.md`](feature-analysis-guide.md) | Checklist de tech lead + formato dos critérios de aceite (§9.1). |
| Checklist de revisão | [`review-checklist.md`](review-checklist.md) | **Fonte única** das invariantes que uma revisão cobra. |
| Glossário | [`GLOSSARY.md`](GLOSSARY.md) | Vocabulário do boilerplate (guard, subject, DTO/mapper, slice, modo de produto…). |
| Slash commands | `.claude/commands/*` | `/spec`, `/analyze`, `/develop`, `/review`, `/test`, `/observe`, `/mediate`. |
| Subagents | `.claude/agents/*` | Os motores do pipeline + o `code-reviewer` read-only. |
| Skills do projeto | `.claude/skills/*` | Procedimentos invocáveis com `/`. |
| Harness | `.claude/settings.json` + `.claude/hooks/` | Permissões, auto-format ao editar, bloqueio de commit em branch protegida. |

Documentação de produto/infra: [`ARCHITECTURE.md`](ARCHITECTURE.md) · [`SETUP.md`](SETUP.md) (env) ·
[`SECURITY.md`](SECURITY.md) · [`PAYMENTS.md`](PAYMENTS.md) · [`AUTH-SSO.md`](AUTH-SSO.md).

## Subagents (`.claude/agents/`)

| Agent | Papel |
|-------|-------|
| `estrategista-produto` | Descobre e especifica o que vale construir → `specs/<id>.md` + `specs/BACKLOG.md`. |
| `planejador-tarefa` | Analisa e planeja (PO + Tech Lead) → `analyze/plan.md`. |
| `desenvolvedor` | Implementa o slice vertical → `develop/handoff.md`. |
| `revisor-codigo` | Revisa e corrige o diff, **dono da branch**, propõe os commits → `review/review.md`. |
| `analista-qa` | Roda/cria testes, critérios de aceite e validação e2e → `test/`. |
| `observador-tarefa` | Observação final em linguagem de negócio → `observacao.md`. |
| `mediador-pr` | Triagem de comentários de PR → `pr-review/pr-<n>.md`. |
| `code-reviewer` | Revisão **read-only** avulsa ("revise o diff"), sem tocar em arquivos nem em branch. |

`code-reviewer` e `revisor-codigo` aplicam o **mesmo** [`review-checklist.md`](review-checklist.md) — a
diferença é que o primeiro só relata e o segundo corrige, resolve a branch e monta os commits.

## Skills do projeto

Digite `/` no Claude Code para invocar. Cada skill encapsula o passo a passo já alinhado às convenções.

### Criadas para este repo (descoberta)

- **`/market-research`** — pesquisa de mercado **com fontes** para decidir se uma feature merece entrar no
  core: hierarquia de fontes (lei/regulador > doc de provedor > página do produto > blog **nunca**),
  **prevalência** medida sobre um painel declarado ("7 de 11"), ceticismo sobre hype e **custo herdado por
  todo fork**. Grava nota citável em `specs/research/<topico>.md` com `collected`/`revalidate_after`.
- **`/spec-audit`** — reconcilia `specs/` com a realidade do **código** (não com o `status` gravado):
  confere o corte de MVP de cada spec, cruza com `docs/features/*/STATE.md`, aplica transições, detecta
  **deriva** e regressão, e regrava o `BACKLOG.md`. É o motor do `/spec --sync` — o passo que fecha o loop.

### Criadas para este repo (scaffolding)

- **`/new-crud`** — scaffold de um **CRUD vertical completo** (SDK → API → hooks → UI → i18n), seguindo o
  recurso de referência `entity`. Use para "criar o recurso X de ponta a ponta".
- **`/new-api-route`** — cria uma **rota HTTP** em `apps/api` (validação Zod, guard, repositório+mapper
  Firestore, `error.code` traduzível). Use para endpoints isolados.
- **`/i18n-sync`** — adiciona/valida **chaves de tradução** nos 3 idiomas (pt-br/en/es) + `apiErrors`, com
  teste de paridade determinístico (`pnpm --filter @repo/internationalization test`). Use sempre que criar
  texto de UI ou um código de erro novo.
- **`/payments-flow`** — implementa/estende o **fluxo de assinatura Stripe** (planos, checkout, portal de
  cobrança, webhook). Ver [`PAYMENTS.md`](PAYMENTS.md).
- **`/write-tests`** — escreve **testes Vitest** (schema, mapper, rota da API, hook, componente) no setup do
  repo, com mocks de SDK/Firebase.

`new-crud` compõe `new-api-route` e `i18n-sync` automaticamente nas etapas correspondentes.

### Baixadas da comunidade (orientação)

Instaladas via `npx skills add ...` e **movidas para `.claude/skills/`** para o Claude descobri-las e
auto-acioná-las (a pasta `.agents/skills/` original não é varrida pelo Claude Code):

- **`agent-browser`** — automação de browser (CDP) para navegar, preencher, clicar, **tirar screenshots** e
  testar o app. Base da validação visual descrita abaixo. É um stub de descoberta: carregue o uso real com
  `agent-browser skills get core` (e `... get dogfood` para QA exploratório). Requer instalação global:
  `npm i -g agent-browser && agent-browser install`.
- **`vercel-react-best-practices`** — 70 regras de performance React/Next da Vercel (waterfalls, bundle,
  RSC, re-render). Auto-aciona ao escrever, revisar ou refatorar componentes/data fetching.
- **`frontend-design`** — direção de design visual (paleta, tipografia, layout) para UI distintiva,
  não-templated. Mais útil na `apps/web` e em telas novas.
- **`web-design-guidelines`** — revisão de código de UI contra Web Interface Guidelines (acessibilidade,
  UX). Use em "revise minha UI / cheque acessibilidade".
- **`copywriting`** — escrita/melhoria de copy de marketing (hero, headline, CTA, pricing) — `apps/web`.
- **`brainstorming`** — transforma uma ideia em design/spec via diálogo, **antes** de codar. Tem um
  `HARD-GATE`: não implementa nada até apresentar o design e você aprovar. Use ao iniciar features/
  componentes novos.
- **`ui-ux-pro-max`** — base de design UI/UX consultável (estilos, paletas, pares de fonte, guidelines de
  UX, tipos de gráfico) com recomendações por stack. Complementa `frontend-design` (direção) com referência
  estruturada.
- **`seo-audit`** — auditoria de SEO técnico/on-page (meta tags, Core Web Vitals, indexação, queda de
  tráfego). Voltada à `apps/web`.
- **`ai-seo`** — otimização para **AI search** (AEO/GEO/LLMO): ser citado por AI Overviews, ChatGPT,
  Perplexity, Claude, Gemini. Complementa `seo-audit` e `copywriting`.

> Para baixar mais skills da comunidade: rode `npx skills add <repo> --skill <nome>` e **mova a pasta
> resultante de `.agents/skills/<nome>` para `.claude/skills/<nome>`** (é lá que o Claude Code descobre
> skills do projeto).

## Validação visual com `agent-browser` (obrigatória)

**Política** (regra de ouro 11): todo fluxo que toca front-end (`apps/app`, `apps/web`,
`packages/design-system`) **e** toda entrega de código passam por validação visual. Front-end não é
"pronto" só porque compila e o lint passa.

Como validar:

1. Suba o app afetado: `pnpm --filter app dev` (3000) / `pnpm --filter web dev` (3001) — e
   `pnpm --filter api dev` (3002) quando o fluxo carrega dados.
2. Carregue o workflow da skill: `agent-browser skills get core` (e `... get dogfood` para QA
   exploratório/bug hunt).
3. Abra o app e **percorra os fluxos tocados** pela mudança: navegue, preencha formulários, dispare as
   ações, **observe o resultado**.
4. **Tire screenshots** e confira: layout, estados de erro/vazio, **responsividade** (mobile + desktop) e
   **tema** (light/dark/system). O `Table` é antd — confirme que respeita o tema.
5. ⚠️ **Rode os comandos do `agent-browser` estritamente em sequência.** Chamadas concorrentes travam o
   daemon e os screenshots passam a sair da aba errada, silenciosamente.
6. Registre o que foi validado (telas/fluxos + screenshots) e qualquer regressão. Se o `agent-browser` não
   estiver instalado, **sinalize** que a validação não foi feita — não conte como aprovado.

Os agents `desenvolvedor`, `revisor-codigo`, `analista-qa` e `code-reviewer` já executam esse passo quando
o diff é de front-end.

## Skills globais úteis

- **`/code-review`** — revisão de diff de propósito geral (bugs + simplificação). Usada dentro do
  `/review`.
- **`/security-review`** — revisão de segurança das mudanças pendentes (importante para auth/pagamentos).
- **`/verify`** e **`/run`** — sobem o app e confirmam que uma mudança funciona de verdade.

## Harness (`.claude/settings.json`)

- **Permissões**: allowlist dos comandos rotineiros do repo (`pnpm check/fix/test/dev`, `turbo`,
  `pnpm --filter ...`, `git` read-only, `agent-browser`) para reduzir prompts.
- **Hook de formatação** (`PostToolUse`): a cada `Edit/Write`, o `.claude/hooks/format-edited-file.sh` roda
  `biome check --write` **apenas no arquivo editado**. É não-bloqueante (sempre sai com 0).
  ⚠️ Ele **apaga imports não usados** — ao adicionar um import antes do uso, escreva os dois juntos.
- **Hook de proteção de branch** (`PreToolUse`): o `.claude/hooks/block-protected-branch-write.sh` nega
  `git commit` em `main`/`master`/`production`/`production-backup`, `git push` para uma dessas branches e
  qualquer `git push --force`. É rede de segurança para
  [`.claude/rules/git-commits.md`](../.claude/rules/git-commits.md), não substituto da verificação
  proativa.
- **Typecheck**: não roda por hook (custo alto por edição). Rode `pnpm --filter <app> typecheck` e
  `pnpm check` antes de concluir.
- `.claude/settings.local.json` é pessoal e **não** vai para o git.

> ⚠️ Os dois hooks e todos os comandos `pnpm` dependem de `node_modules` **no workspace atual**. Em
> workspaces do Conductor isso é resolvido pelo `scripts.setup` de
> [`.conductor/settings.toml`](../.conductor/settings.toml) — ver a seção Conductor em
> [`SETUP.md`](SETUP.md). Fora dele, rode `pnpm install` antes de pedir validação a um agent.

## Regras sempre em contexto (`.claude/rules/`)

Estes arquivos são carregados em toda sessão — por isso são curtos:

- [`git-commits.md`](../.claude/rules/git-commits.md) — branch protegida, padrão de branch/commit, um commit
  por app, push só com aprovação.
- [`code-comments.md`](../.claude/rules/code-comments.md) — o padrão é não comentar; e **nunca** referenciar
  o fluxo de agents no código, mesmo `docs/features/` estando versionado (o ponteiro apodrece; o comentário
  tem de ser autossuficiente).

## Fluxo recomendado para uma feature

Formal, com rastreio em disco → use o [pipeline](TASK-PIPELINE.md):
`/spec → /analyze → /develop → /review → /test` (+ `/observe`), fechando com `/spec --sync`.

Informal, para mudanças pequenas:

1. Descreva o recurso. Se for CRUD, peça `/new-crud`.
2. As regras do escopo (`apps/*/CLAUDE.md`, `packages/CLAUDE.md`) carregam automaticamente; aponte o
   recurso de referência `entity`.
3. Ao concluir: `pnpm check`, `pnpm --filter <app> typecheck` e `pnpm test`
   (⚠️ `turbo build` depende de `test`). Se tocou i18n:
   `pnpm --filter @repo/internationalization test`.
4. **Se tocou front-end**: valide visualmente com `agent-browser` (fluxos, screenshots, responsivo + tema).
5. Passe o agente `code-reviewer` (ou `/code-review`) no diff. Para mudanças sensíveis (auth, pagamentos,
   dados), rode `/security-review`.

## Mantendo a base de IA saudável

- **Rode `/spec --sync` ao fim de cada entrega.** É o passo que impede o backlog de virar ficção: ele
  confere no código o que foi entregue, em vez de acreditar no `status` gravado. Backlog que ninguém audita
  é pior que backlog nenhum, porque parece confiável.
- Nota de pesquisa vencida (`revalidate_after`) → revalide **só o que mudou** (preço, versão, prevalência),
  não a nota inteira.
- Atualize o `CLAUDE.md` (regras de ouro / mapa) quando uma convenção mudar — mas mantenha-o **curto**,
  deixando o detalhe em `AGENTS.md` e nos `CLAUDE.md` aninhados.
- Invariante nova que a revisão deve cobrar → entra em [`review-checklist.md`](review-checklist.md)
  (**um** lugar; os dois revisores leem de lá).
- Padrão novo reutilizável → considere transformá-lo em skill (`.claude/skills/<nome>/SKILL.md`).
- Ao herdar este boilerplate num fork: revise os nomes de exemplo (`entity`), os valores neutros do
  dicionário e substitua os exemplos do [`GLOSSARY.md`](GLOSSARY.md) pelo vocabulário do seu produto.
