# Trabalhando com IA neste repo

Este repositório vem integrado com o **Claude Code**. Este guia explica o que está configurado e quando usar cada coisa. O objetivo é que cada fork já nasça com uma base sólida para desenvolvimento assistido por IA.

## O que está configurado

| Artefato | Caminho | Para quê |
|----------|---------|----------|
| Memória do projeto | [`CLAUDE.md`](../CLAUDE.md) | Lido automaticamente pelo Claude. Mapa do repo, comandos, regras de ouro e ponteiros. **Curto** — referencia `AGENTS.md` e os `CLAUDE.md` aninhados. |
| Convenções completas | [`AGENTS.md`](../AGENTS.md) | Fonte de verdade detalhada (API, app, design system/RHF). |
| Regras por escopo | `apps/*/CLAUDE.md`, `packages/CLAUDE.md` | `CLAUDE.md` aninhados, **auto-carregados** ao trabalhar em cada pasta (equivalente nativo às antigas regras por glob do Cursor). |
| Documentação | [`docs/`](.) | `ARCHITECTURE`, `SETUP` (env), `SECURITY`, `PAYMENTS`, este `AI-WORKFLOW`. |
| Skills do projeto | `.claude/skills/*` | Procedimentos invocáveis com `/`. |
| Agente revisor | `.claude/agents/code-reviewer.md` | Revisão afinada às convenções. |
| Harness | `.claude/settings.json` + `.claude/hooks/` | Permissões (menos prompts) + auto-format ao editar. |

## Skills do projeto

Digite `/` no Claude Code para invocar. Cada skill encapsula o passo a passo já alinhado às convenções:

### Criadas para este repo (scaffolding)

- **`/new-crud`** — scaffold de um **CRUD vertical completo** (SDK → API → hooks → UI → i18n), seguindo o recurso de referência `entity`. Use para "criar o recurso X de ponta a ponta".
- **`/new-api-route`** — cria uma **rota HTTP** em `apps/api` (validação Zod, guard, repositório+mapper Firestore, `error.code` traduzível). Use para endpoints isolados.
- **`/i18n-sync`** — adiciona/valida **chaves de tradução** nos 3 idiomas (pt-br/en/es) + `apiErrors`, com teste de paridade determinístico (`pnpm --filter @repo/internationalization test`). Use sempre que criar texto de UI ou um código de erro novo.
- **`/payments-flow`** — implementa/estende o **fluxo de assinatura Stripe** (planos, checkout, portal de cobrança, webhook). Ver [`PAYMENTS.md`](PAYMENTS.md).
- **`/write-tests`** — escreve **testes Vitest** (schema, mapper, rota da API, hook, componente) no setup do repo, com mocks de SDK/Firebase.

`new-crud` compõe `new-api-route` e `i18n-sync` automaticamente nas etapas correspondentes.

### Baixadas da comunidade (orientação)

Instaladas via `npx skills add ...` e **movidas para `.claude/skills/`** para o Claude descobri-las e auto-acioná-las (a pasta `.agents/skills/` original não é varrida pelo Claude Code):

- **`agent-browser`** — automação de browser (CDP) para navegar, preencher, clicar, **tirar screenshots** e testar o app. Base da validação visual descrita abaixo. É um stub de descoberta: carregue o uso real com `agent-browser skills get core` (e `... get dogfood` para QA exploratório). Requer instalação global: `npm i -g agent-browser && agent-browser install`.
- **`vercel-react-best-practices`** — 70 regras de performance React/Next da Vercel (waterfalls, bundle, RSC, re-render). Auto-aciona ao escrever, revisar ou refatorar componentes/data fetching. As regras detalhadas ficam em `rules/*.md` dentro da skill.
- **`frontend-design`** — direção de design visual (paleta, tipografia, layout) para UI distintiva, não-templated. Mais útil na `apps/web` e em telas novas.
- **`web-design-guidelines`** — revisão de código de UI contra Web Interface Guidelines (acessibilidade, UX). Use em "revise minha UI / cheque acessibilidade".
- **`copywriting`** — escrita/melhoria de copy de marketing (hero, headline, CTA, pricing) — landing/CTA da `apps/web`.
- **`brainstorming`** — transforma uma ideia em design/spec via diálogo, **antes** de codar. Tem um `HARD-GATE`: não implementa nada até apresentar o design e você aprovar. Use ao iniciar features/componentes novos. Inclui scripts próprios (`scripts/`) e um companion visual.
- **`ui-ux-pro-max`** — base de design UI/UX consultável (50+ estilos, paletas, pares de fonte, guidelines de UX, tipos de gráfico) com recomendações por stack (React/Next/shadcn etc.). Os dados ficam em `data/*.csv` e a busca em `scripts/*.py`. Complementa `frontend-design` (direção) com referência estruturada.
- **`seo-audit`** — auditoria de SEO técnico/on-page (meta tags, Core Web Vitals, indexação, queda de tráfego). Voltada à `apps/web`. Lê contexto opcional de `.agents/product-marketing.md`/`.claude/product-marketing.md` se existir.
- **`ai-seo`** — otimização para **AI search** (AEO/GEO/LLMO): ser citado por AI Overviews, ChatGPT, Perplexity, Claude, Gemini. Complementa `seo-audit` (SEO tradicional) e `copywriting`. Também lê o contexto opcional de product-marketing.

> Para atualizar/baixar mais skills da comunidade: rode `npx skills add <repo> --skill <nome>` e **mova a pasta resultante de `.agents/skills/<nome>` para `.claude/skills/<nome>`** (é lá que o Claude Code descobre skills do projeto). Veja também as locations pessoais (`~/.claude/skills/`).

## Validação visual com `agent-browser` (obrigatória)

**Política**: todo fluxo que toca front-end (`apps/app`, `apps/web`, `packages/design-system`) **e** toda entrega de código devem passar por validação visual com `agent-browser`. Front-end não é "pronto" só porque compila e o lint passa.

Como validar:
1. Suba o app afetado: `pnpm --filter app dev` (3000) / `pnpm --filter web dev` (3001).
2. Carregue o workflow da skill: `agent-browser skills get core` (e `agent-browser skills get dogfood` para QA exploratório/bug hunt).
3. Abra o app e **percorra os fluxos tocados** pela mudança: navegue, preencha formulários, dispare as ações.
4. **Tire screenshots** e confira: layout, estados de erro/vazio, **responsividade** (mobile + desktop) e **tema** (light/dark/system).
5. Registre o que foi validado (telas/fluxos + screenshots) e qualquer regressão. Se o `agent-browser` não estiver instalado, **sinalize** que a validação não foi feita — não conte como aprovado.

O agente `code-reviewer` já executa esse passo automaticamente quando o diff é de front-end.

## Agente `code-reviewer`

Revisor read-only afinado a este repo. Invoque pedindo "revise o diff/o PR" ou via Task. Ele checa SDK como fachada, i18n nos 3 idiomas, guards espelhados na API, padrão repo+mapper Firestore, uso do design system e conformidade Biome/Ultracite — reportando por severidade com `arquivo:linha`.

## Skills globais úteis

Disponíveis fora do projeto e relevantes aqui:

- **`/code-review`** — revisão de diff de propósito geral (bugs + simplificação).
- **`/security-review`** — revisão de segurança das mudanças pendentes (importante para auth/pagamentos).
- **`/verify`** — sobe o app e confirma que uma mudança funciona de verdade.

## Harness (`.claude/settings.json`)

- **Permissões**: allowlist dos comandos rotineiros do repo (`pnpm check/fix/test/dev`, `turbo`, `pnpm --filter ...`, `git` read-only) para reduzir prompts.
- **Hook de formatação**: a cada `Edit/Write`, o `.claude/hooks/format-edited-file.sh` roda `biome check --write` **apenas no arquivo editado**. É não-bloqueante (sempre sai com 0) e mantém o estilo consistente sem rodar lint no repo inteiro.
- **Typecheck**: não roda por hook (custo alto por edição). Rode manualmente `pnpm --filter <app> typecheck` ou `pnpm check` antes de concluir.

## Fluxo recomendado para uma feature

1. Descreva o recurso. Se for CRUD, peça `/new-crud`.
2. As regras do escopo (`apps/*/CLAUDE.md`, `packages/CLAUDE.md`) são carregadas automaticamente; aponte o recurso de referência `entity`.
3. Ao concluir, rode `pnpm check` + typechecks.
4. **Se tocou front-end**: valide visualmente com `agent-browser` (suba o app, percorra os fluxos, screenshots, responsivo + tema).
5. Passe o agente `code-reviewer` (ou `/code-review`) no diff. Para mudanças sensíveis (auth, pagamentos, dados), rode `/security-review`.
6. Antes de qualquer entrega de código, repita a validação `agent-browser` dos fluxos de UI impactados.

## Mantendo a base de IA saudável

- Atualize `CLAUDE.md` (regras de ouro / mapa) quando uma convenção mudar — mas mantenha-o **curto**, deixando o detalhe em `AGENTS.md`/cursor rules.
- Ao criar um padrão novo reutilizável, considere transformá-lo em skill (`.claude/skills/<nome>/SKILL.md`).
- Ao herdar este boilerplate num fork, revise nomes de exemplo (`entity`) e os valores neutros do dicionário.
