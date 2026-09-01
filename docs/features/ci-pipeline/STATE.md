---
slug: ci-pipeline
title: Pipeline de CI no GitHub Actions
task: -
spec: ci-pipeline
branch: ci/feat/github-actions-pipeline
epic: -
updated: 2026-09-01 01:45
---

# Pipeline — Pipeline de CI no GitHub Actions

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-08-31 23:40 | analyze/plan.md | Plano em 11 passos no eixo saneamento → `biome.jsonc`/scripts → `turbo.json` → workflow → docs, com baseline **medida** (lint 192/37, 3 `typecheck` quebrados, 244 testes verdes, **`build` vermelho hoje**): P0 zera o lint (81 dos 192 erros são código de skill vendorizado; 82 dos 111 restantes caem com auto-fix seguro), `//#lint` como task da raiz e `typecheck` com `dependsOn: []` (provado que **não** depende de `^build`), `apps/web` ganha suíte `node` sobre `seo.ts`, `apps/api` sai do `jsdom` (107/107 em 2,56 s contra 6,14 s), 1 job `verify` **sem nenhum secret** e `build` fora do corte. **As 7 perguntas foram decididas pelo usuário**: zerar a baseline de lint inteira nesta tarefa (com as 4 ações de saneamento autorizadas), corrigir o cliente Stripe em commit próprio (P10, única mudança de produção), `typecheck` em 3 pacotes, rota A do `envMode`, branch protection com runbook, sem `actions/cache`. **Zero pergunta em aberto** |
| develop | done    | 2026-09-01 00:38 | develop/handoff.md | **P0–P10 entregues nas duas passadas: a base foi saneada (lint 192/37 → 0/0, 3 `typecheck` quebrados corrigidos, `apps/web` na suíte, 244 → 259 testes) e o pipeline foi ligado (`//#lint` + `typecheck` no turbo com `env: []`, `.github/workflows/ci.yml` com 1 job `verify` e zero secret, runbook de branch protection em `docs/SETUP.md`, cliente Stripe preguiçoso destravando o `api#build`)** — 18 tasks verdes, `FULL TURBO` na 2ª execução, verde em `--env-mode=strict`, job executado de verdade no `act` e num clone limpo sem nenhum `.env`, e os 4 defeitos deliberados (lint, tipo, teste, chave faltando em 1 idioma) provados como derrubando o gate |
| review  | done    | 2026-09-01 01:05 | review/review.md | **Branch `ci/feat/github-actions-pipeline` criada a partir de `3089d71` (= `origin/main`); nada commitado.** 3 achados 🔴 corrigidos, todos do mesmo raio de impacto que o `/develop` não fechou: a suppression de `packages/auth/provider.tsx` cuja razão (`jsx: "react"`) o próprio diff invalidou ao mudar o `tsconfig` — com runtime automático o `import React` virou código morto —, e o rename `stripe` → `getStripe()` que ficou desatualizado em `docs/PAYMENTS.md` e na skill `payments-flow` (que **scaffolda** todo fluxo Stripe e geraria código que não compila). Mais 11 razões de suppression recém-escritas com diacríticos corrompidos, uma delas invertendo o sentido ("o corpo **e** sincrono" → "**é** síncrono"). **Commit de formatação auditado por multiset de caracteres**: 51 dos 52 candidatos são só reordenação/whitespace, e o 52º escondia uma remoção manual de suppression (`sign-up-form-client.tsx`), realocada. Confirmado que nenhum valor de tradução mudou e que `design-system/components/{ui,lib,hooks}` seguem intocados. Gates depois das correções: `pnpm check` 383 arquivos **0/0**, `turbo run lint typecheck test --force` **18/18**, `FULL TURBO` (141 ms) na 2ª, verde em `--env-mode=strict`, **259 testes** em 4 tasks, 13/13 `typecheck`, `--frozen-lockfile` exit 0. Validação visual reconferida com `agent-browser` (login, troca de idioma, dropdown antd `danger` em light **e** dark, form com erro, breadcrumb, mobile), PII filtrada por `qa-`. **Maior lacuna: `packages/auth/middleware.ts` — refactor de complexidade 43 num caminho de auth, sem teste e com ZERO consumidores no repo, logo não exercitado por nenhum fluxo de browser.** `packages/payments/ai.ts` deixado fora do corte de propósito. **Plano de 29 commits** pronto; 5 decisões em aberto (nome da branch, `permissions:` no `ci.yml`, HTTP 200 do "Not configured", `<></>` nos 4 `HookForm*` restantes, `ai.ts`) |
| test    | done    | 2026-09-01 01:45 | test/report.md  | **As três lacunas 🔴/🟡 do `/review` fechadas com 72 testes novos (259 → 331, 4 → 7 tasks) e 39 mutações — 39 mortas, 0 sobreviventes**: `packages/auth` ganhou suíte (21 testes de `authMiddleware`, incluindo a aridade factory×middleware e o catch de credenciais ausentes, + 8 de `getFirebaseApp`), `packages/payments` idem (8 de `getStripe`, com o SDK real da Stripe para que remover o guard de chave vazia derrube o teste), `packages/shared` idem (15 de cookies) e mais 11 da rota do webhook e 9 do `getCookie` do i18n. **Os 4 defeitos deliberados do §8.2 reconferidos de forma independente** (lint 18/21 · tipo 19/21 · teste 19/21 · chave só no `es` 15/17) e o cenário do sinal de pronto levado até o fim **dentro do runner**: `act` com `Job failed` + anotação `::error::`, e `Job succeeded` com o repo íntegro. Gates: `pnpm check` 392 arquivos **0/0** · `turbo run lint typecheck test` **21/21** · `FULL TURBO` 144 ms · verde em `--env-mode=strict` · **331 testes em 7 tasks** · 13/13 `typecheck` · `--frozen-lockfile` exit 0 sem tocar o lockfile. **e2e com conta comum de verdade** (`qa-common-ci@example.com`, sem impersonação): CRUD completo de `entities` — criar, toggle otimista com persistência, editar, buscar, excluir — mais dropdown antd `danger` em light **e** dark, troca de idioma, mobile 390×844, SSO web↔app e login com `?redirect=` preservado; 17 screenshots, zero erro novo no console. **15 ✅ · 0 ❌ · 2 ⚠️** — os dois bloqueados (PR real vermelha/verde no GitHub e runbook de branch protection executado) exigem push + ação humana, exatamente como a decisão Q1 previu |
| observe | pending | -                | -               | - (opcional)     |

## Notas

### Origem

- **Spec**: `specs/ci-pipeline.md` (`status: approved`, `value: alto`, `effort: M`, `audience: dx`,
  `depends_on: []`, `updated: 2026-08-22`). É a **#1 da fila** do `specs/BACKLOG.md`. O problema, a
  evidência de mercado e o corte de MVP são decisão de produto tomada — o plano responde só ao *como*.
  **Não editar a spec**: arquivá-la é do `/spec --sync`, na entrega.
- Nota de pesquisa citada: `specs/research/engineering-baseline.md`, práticas **1** (CI + Remote Caching,
  *padrão de facto*, entre as 4 sem as quais nada se sustenta), **5** (cobertura), **13** (dependências),
  **14** (preview deploy) e **18** (orçamento de performance). Só a 1 está no corte.
- Substitui o **gate manual** documentado em `docs/features/firestore-admin-access/STATE.md`, onde a
  baseline de `pnpm check` foi conferida à mão a cada etapa (197/39 → 192/37).

### Commit de baseline

**`3089d71`** — `refactor(api): read and write Firestore through the Admin SDK (#4)`. Branch `gaborone`,
working tree limpo, workspace **nunca buildado** (não existe `apps/*/.next/` nem `apps/*/next-env.d.ts`).
Todos os números abaixo foram **executados** neste commit em 2026-08-31, não estimados.

### Baseline medida — lint

`pnpm check` → `Checked 391 files in 944ms.` · **192 erros / 37 warnings** · exit 1.

- `pnpm check` (`package.json:14`) é `npx ultracite@latest check`, que por dentro executa
  `npx @biomejs/biome check --no-errors-on-unmatched ./`. O **motor já é fixo** (`npx @biomejs/biome`
  resolve o local → **2.3.1**, de `package.json:24`); o que flutua é o **wrapper**, baixado da rede a cada
  execução. Rodar `./node_modules/.bin/biome check --no-errors-on-unmatched ./` direto dá **exatamente**
  192/37 — a substituição é comprovadamente byte-idêntica.
- **81 dos 192 erros (42%) vêm de `.claude/skills/brainstorming/scripts/`** — 5 arquivos versionados de
  uma skill de terceiro (`server.cjs` sozinho: 66). Excluindo `.claude/` no `biome.jsonc`: **111 erros /
  37 warnings**.
- Dos 111 restantes, **82 caem com `biome check --write` seguro** (70 `format` + 6 `useSortedAttributes` +
  3 `organizeImports` + 3 `useSortedClasses`). Sobram ~29 erros manuais + 37 warnings
  (32 `suppressions/incorrect` com placeholder `<explanation>` + 5 `suppressions/unused`).
- 🔴 **Achado do `BACKLOG.md` refutado por medição**: o webhook da Stripe **é** coberto pelo lint. O
  relatório JSON traz 2× `lint/correctness/noUnusedVariables` (`"This variable customerId is unused."`) em
  `apps/api/app/(routes)/webhooks/payments/route.ts`. Não há bug de cobertura — o que nunca existiu foi um
  gate que falhasse por causa disso.
- Confirmado: `apps/app/midd_teste.ts` é a **única** violação de `useFilenamingConvention` no repo.
- `biome ci` existe no 2.3.1, com `--changed`/`--since=REF` e `--reporter=github`.

### Baseline medida — typecheck

| Workspace | Resultado |
|-----------|-----------|
| `apps/api`, `apps/app`, `apps/web` | ✅ limpo |
| `@repo/design-system`, `@repo/email`, `@repo/next-config`, `@repo/payments`, `@repo/security`, `@repo/seo` | ✅ limpo |
| `apps/email` | 🔴 `TS18003 No inputs were found` — versiona só `package.json` + `tsconfig.json` |
| `@repo/analytics` | 🔴 3 erros — `server.ts:2` `posthog-node` não instalada; `:5-6` leem chaves que `keys.ts` não declara |
| `@repo/typescript-config` | 🔴 100+ `TS2307` — **não tem `tsconfig.json`**, o `tsc` escapa para o da raiz e checa o repo inteiro sem `paths` |
| `@repo/auth`, `@repo/sdk`, `@repo/internationalization` | **sem script** (têm `tsconfig.json`) |
| `@repo/shared` | **sem script e sem `tsconfig.json`** |

- ✅ **`typecheck` NÃO depende de `^build`** — medido neste workspace, que nunca foi buildado. Os
  `include` citam `next-env.d.ts` e `.next/types/**/*.ts` (`apps/app/tsconfig.json:12-16`), mas o `tsc`
  ignora entrada de `include` inexistente. Ressalva: sem `.next/types`, os tipos gerados de rota do Next
  não são validados — mesma cobertura do gate manual atual.
- `turbo run typecheck` hoje: `Could not find task 'typecheck' in project`.

### Baseline medida — testes

`pnpm test` → 3 tasks, **37 arquivos / 244 testes**, tudo verde. **29,8 s** a frio · **387 ms** com cache
(`>>> FULL TURBO`). api 15/107 · app 21/135 · i18n 1/2. (A spec fala em 23 arquivos — o número envelheceu
durante o pipeline de `firestore-admin-access`.)

- ✅ **`turbo run test --force --env-mode=strict` → 244/244 verdes com `env: []` em todas as tasks.**
  Nenhum teste depende de env do processo: `NODE_ENV=test` é setado dentro do comando
  (`apps/api/package.json:11`) e os dois testes que mexem em env (`serviceAccountEnv.test.ts`,
  `instrumentation.test.ts`) escrevem em `process.env` in-process. Nenhum `vitest.config.mts` define
  `test.env`/`envPrefix`/`setupFiles`, e não há `vitest.setup.*` no repo.
- 🟡 **`jsdom` em `apps/api` confirmado como defeito.** Nenhum teste da api usa DOM (os hits de
  "document" são a palavra "documento" em descrições sobre o Firestore) e não há `.tsx` em
  `apps/api/__tests__/`. **`jsdom` é dependência fantasma**: só é declarada em `apps/app/package.json:48`
  e resolve por hoisting. A/B medido: `--environment=node` → **107/107 em 2,56 s** (setup de ambiente
  3 ms) contra **6,14 s** com jsdom (setup 25,91 s).

### 🔴 Baseline medida — build: já está vermelho, e não é por env

```
turbo run build --env-mode=strict      → Failed: api#build   (1m00s)
turbo run build --filter=api --force   → Failed: api#build   (25s)   ← modo loose, o padrão de hoje
```

**O controle em `loose` falha igual — o `envMode` não tem nada a ver.** Traço:

```
api:build:  ✓ Compiled successfully in 20.2s
api:build:    Collecting page data ...
api:build: Error: Neither apiKey nor config.authenticator provided
api:build:     at Object.<anonymous> (.next/server/app/(routes)/webhooks/payments/route.js:10:3)
api:build: Error: Failed to collect page data for /webhooks/payments
```

Cadeia: `packages/payments/keys.ts:14` (`skipValidation: !process.env.STRIPE_SECRET_KEY`) → com a var
ausente **ou vazia** a validação é pulada → `packages/payments/index.ts:5` faz
`new Stripe(keys().STRIPE_SECRET_KEY || "", …)` **em escopo de módulo** → o SDK rejeita string vazia →
explode no *collect page data* de `/webhooks/payments`, que importa `stripe` (`route.ts:3`). Neste
workspace `apps/api/.env` **tem** `STRIPE_SECRET_KEY` com **valor de comprimento 0**; num clone limpo ela
simplesmente não existe — mesmo resultado.

Isso **decidiu a pergunta 2 da spec com dado**: o `build` fica fora do CI. E colide com o sinal de pronto
`:104` ("clone limpo, sem nenhum segredo, roda o pipeline até o fim"), que **sem** o `build` é alcançável
hoje. O padrão da correção já existe no repo e a própria spec o cita em `:92-94`:
`packages/security/index.ts` faz no-op sem `ARCJET_KEY`.

✅ **Decidido corrigir** (Q5) — vira o **P10**, em commit próprio. Atenção: corrigir a Stripe **não** faz o
`build` entrar no CI, porque `api#build` segue exigindo as três `FIREBASE_ADMIN_*`. O ganho é o build
voltar ao verde onde ele de fato roda: local e Vercel.

### Achados novos desta análise (para o `/spec --sync`, não agora)

> O achado do `build`/Stripe **saiu desta lista**: virou o P10 e é corrigido dentro desta tarefa (Q5).
> Os demais continuam sem dono.
- 🔴 **`apps/web` não declara `@repo/internationalization` nem `@repo/shared`**, embora
  `apps/web/shared/lib/seo.ts` importe o primeiro e `apps/web/tsconfig.json:14-16` inclua três arquivos do
  segundo. O turbo hasheia workspace + deps **declaradas** → mudar esses pacotes **não invalida**
  `web#typecheck`/`web#test`. Cache-hit com resultado errado, o gêmeo do problema de env que a spec ataca.
- 🔴 **`@repo/typescript-config` tem script `typecheck` e nenhum `tsconfig.json`** → o `tsc` sobe até o
  `tsconfig.json` da raiz e tenta checar o repositório inteiro sem os `paths` dos apps.
- 🟡 **`jsdom` é dependência fantasma da `apps/api`** (ver acima).
- 🟡 **`globalDependencies: ["**/.env.*local"]` (`turbo.json:3`) não hasheia `.env`.** Localmente o Next
  carrega `apps/<app>/.env` sozinho (o log do build confirma: `- Environments: .env`) e o turbo não vê o
  arquivo — mudar o `.env` não invalida o cache.
- ⚠️ **Deriva na spec (`:28`): `vercel.json` EXISTE.** Nos três apps (`apps/api`, `apps/app`, `apps/web`),
  os três com `ignoreCommand: node scripts/skip-ci.js` (`apps/web/scripts/skip-ci.js:5-8` pula o build
  quando o commit contém `[skip ci]`); o da api ainda tem um `crons` para `/cron/keep-alive`. `.husky/` de
  fato não existe. Não muda o corte. **Spec não editada** — é do `/spec --sync`.

### Decisões de desenho já tomadas no plano (não são perguntas)

- **`lint` vira `//#lint`, task da raiz**, não task por workspace: o Biome varre o repo inteiro em 473 ms
  a partir de um único `biome.jsonc`, e o repo já tem o precedente `//#clean` (`turbo.json:34`).
- **`typecheck` com `dependsOn: []`** e `outputs: []` nas duas tasks novas — medido que não há dependência
  de build nem artefato entre pacotes.
- **1 job `verify`, não 3.** O custo dominante é o `pnpm install`; 3 jobs o pagam 3× para paralelizar ~50 s
  que o turbo já paraleliza dentro de um runner. E dá **um** status check para a branch protection.
- **Node e pnpm saem dos arquivos do repo**: `node-version-file: .nvmrc` (22.12.0) e
  `pnpm/action-setup` **sem `version`** (lê `packageManager: pnpm@10.19.0`). Nenhum literal duplicado no
  YAML — a cópia diverge no primeiro bump.

### Decisões do usuário (2026-08-31) — as 7 perguntas estão fechadas

Detalhe e justificativa em `analyze/plan.md` §11. **Nenhuma pergunta em aberto resta**; o `/develop` pode
seguir o blueprint como está.

| # | Pergunta | Decisão |
|---|----------|---------|
| Q1 | Bloquear merge ou só sinalizar? | **Bloquear + runbook** em `docs/SETUP.md`. Ligar a proteção no GitHub é ação humana, **fora** da entrega |
| Q2 | `build` entra no CI? | **Fora deste corte.** Só `lint` + `typecheck` + `test`. O workflow **não pode conter nenhum `${{ secrets.* }}`** |
| Q3 | Remote Cache / `actions/cache`? | **Não** — nem um, nem outro. Entra quando doer, com medição |
| **Q4** | **Baseline de lint** | **Zerar tudo nesta tarefa** (P0 completo, inclusive os ~29 manuais). Autorizado: excluir `.claude/skills` do Biome · commit isolado de formatação em massa · apagar `apps/app/midd_teste.ts` · apagar `packages/analytics/server.ts`. Rejeitados: `--max-diagnostics`, allowlist e lint só do diff |
| **Q5** | **Corrigir o build (Stripe)?** | **Sim** — P10, commit próprio em `packages/payments`, padrão no-op de `packages/security:16-18`. **Única mudança de código de produção do corte.** Não faz o `build` entrar no CI (Q2) |
| Q6 | Escopo do `typecheck` | **3 pacotes**: `@repo/sdk`, `@repo/auth`, `@repo/internationalization`. **`@repo/shared` fora** (é o único sem `tsconfig.json`) |
| Q7 | `envMode` | **Rota A** — `loose` global + `env: []` em `lint`/`typecheck`/`test` (medido verde). Aprovado junto: `globalDependencies` passa a incluir `**/.env` |

### Estado da implementação — `develop` completo (duas passadas)

**P0–P10 entregues.** Detalhe passo a passo, números antes/depois, desvios e provas em
`develop/handoff.md` (uma seção por passada).

**Passada 1 (P0–P5, saneamento)** — 2026-09-01 00:16. Lint **192/37 → 0/0** (exclusão de `.claude/skills`
192→111, auto-fix seguro 111→28 em 72 arquivos, 28 erros + 37 warnings resolvidos à mão); `pnpm check`
passa a rodar o Biome fixado no lockfile (equivalência provada com defeitos deliberados); `apps/api` sai do
jsdom (107/107, setup 25,9 s → 2 ms) e perde o `@vitejs/plugin-react`; `apps/web` entra na suíte com
`vitest.config.mts` + **15 testes** sobre `seo.ts` → `pnpm test` vira **4 tasks / 259 testes**; `typecheck`
saneado em **13 workspaces com script e 13 passando**; `apps/web` declara `@repo/internationalization` e
`@repo/shared`. **2 achados que o plano não previa**: `packages/internationalization/next-headers.d.ts`
declarava um módulo ambiente `next/headers` sem `cookies()` que mascarava os tipos reais do Next
(apagado), e `@repo/auth` tinha `jsx: "react"` + `@types/react` fora do pino do repo, gerando árvore
duplicada de tipos (corrigidos). Validação visual completa em light/dark/mobile nos dois apps, 20
screenshots, PII filtrada por `qa-`; zero erro novo no console.

**Passada 2 (P6–P10, o pipeline)** — 2026-09-01 00:38. `//#lint` (task da raiz) e `typecheck`
(`dependsOn: []`) no `turbo.json`, ambas com `outputs: []` e `env: []`, mais `env: []` em `test` e
`globalDependencies` incluindo `**/.env`; `.github/workflows/ci.yml` com **1 job `verify` e zero
`${{ secrets.* }}`**, Node e pnpm lidos de `.nvmrc`/`packageManager`; 6 arquivos de documentação, incluindo
o **runbook de branch protection** em `docs/SETUP.md`; e o **cliente Stripe preguiçoso**
(`packages/payments/index.ts` → `getStripe()`), que devolve `api#build` ao verde.

Provas executadas nesta passada: **18 tasks verdes** · `FULL TURBO` (201 ms) na 2ª execução · verde em
`--env-mode=strict` · `pnpm install --frozen-lockfile` exit 0 com o lockfile intocado · job rodado de
verdade num container Linux via **`act`** (`Job succeeded`) · pipeline rodado num **clone limpo sem nenhum
`.env`** (exit 0, `FULL TURBO` na 2ª) · os **4 defeitos deliberados** (lint, tipo, teste, chave faltando em
1 idioma) derrubam o gate · A/B do build (antes: `Neither apiKey…` em `/webhooks/payments`; depois: 13/13
páginas) · webhook exercitado em `next start` com POST assinado em HMAC → **200 com o evento**, e no-op
`"Not configured"` sem chave.

**Não validado localmente (lacuna do `/test`)**: o comportamento do status check na interface da PR
(nome `verify`, merge bloqueado) exige PR real no GitHub. E o runbook de branch protection é ação humana,
fora da entrega (Q1) — até ser executado, o CI **sinaliza mas não bloqueia**.

Achados novos levantados durante a implementação (para o `/spec --sync`, **não** corrigidos aqui):

- 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta**: o cliente grava com expiração, mas
  `apps/web/proxy.ts:60` e `apps/app/proxy.ts:87` fazem `cookieStore.set("x-locale", …)` **sem `maxAge`**
  na requisição seguinte, rebaixando-o a cookie de sessão. Confirmado no browser (`expires = -1`).
- 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps — origem do aviso
  `deprecated next@15.5.2` no `pnpm install`.
- 🟡 **Strings de UI soltas**: `"Switch language"` (`sr-only`) nos dois `LanguageSwitcher` e `"Início"` +
  `href="/painel"` em `apps/app/shared/components/ui/PageBreadcrumb.tsx`.
- 🟡 **`setTimeout` sem cleanup** no `useEffect` de `apps/web/.../(home)/components/cases-client.tsx`.
- 🔴 **`packages/payments/ai.ts:4-5` tem o gêmeo exato do defeito que o P10 corrigiu** —
  `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY || "" })` em escopo de módulo. Não explode
  hoje só porque nada importa `@repo/payments/ai`; explodiria no primeiro fork que importasse. **Deixado
  de propósito**: o corte autorizava uma única mudança de código de produção.
- 🟡 **O `env.ts` da api perde as chaves de `extends` em desenvolvimento.** Com `skipValidation: true`
  (`env.ts:23`), o `@t3-oss/env-nextjs` devolve só o `runtimeEnv` local, então `env.STRIPE_WEBHOOK_SECRET`
  — e qualquer chave vinda de `auth()`, `core()`, `email()`, `payments()` — é `undefined` em `next dev`,
  mesmo com a variável exportada. Efeito: o webhook da Stripe é **inalcançável em desenvolvimento**.
- 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` por default), então uma PR com dois tipos
  de defeito mostra só o primeiro. `--continue` no CI resolveria, mas faria o comando divergir do local.

### Restrições de processo

- **Nada foi commitado e nenhuma branch foi criada** — as ~124 mudanças (119 da passada 1 + 11 da passada
  2, com sobreposição em 2 arquivos) estão no working tree, para o `/review`. A branch atual é
  `loop-develop-review-test-sync` (não é protegida, mas não segue `<project>/<type>/<title>`; quem nomeia é
  o `revisor-codigo`).
- **Conta de QA criada** para a validação visual: `qa-ci-admin@example.com` (admin, projeto de dev
  `next-boilerplate-576d0`), via `pnpm --filter api create-dev-admin`. Deixada no projeto, como as demais
  contas `qa-` de QAs anteriores.
- `specs/ci-pipeline.md` aparece modificado no `git status` desde **antes** desta etapa — não foi tocado
  pelo `/develop`.
- As medições de build deixaram diretórios `apps/*/.next/` no disco (ignorados por `.gitignore:47,155`).
  Apagar com `pnpm clean` se atrapalhar — e **refazer a medição de `typecheck` num workspace sem `.next/`**
  não é necessário: a que está registrada aqui foi feita exatamente nesse estado.
- **Branch**: dono é o `revisor-codigo`. Sugestão registrada no plano §7.13:
  `ci/feat/github-actions-pipeline`. A branch atual é `gaborone` — não é protegida, mas não segue o padrão
  `<project>/<type>/<title>`.
- **Sem SDK, sem i18n, sem `error.code` novo, sem rota nova, sem guard, sem Firestore, sem migração de
  dado.** A validação visual com `agent-browser` foi obrigatória na **passada 1** (o P0 aplica formatação
  automática em `apps/app`, `apps/web` e `packages/design-system`) e foi feita. Na **passada 2** ela é
  `N/A`: os 11 arquivos alterados são config, workflow, documentação, um módulo `server-only` e uma rota de
  API — zero componente, zero estilo, zero rota de front. O que substituiu a prova de comportamento ali foi
  o exercício em runtime do webhook.
