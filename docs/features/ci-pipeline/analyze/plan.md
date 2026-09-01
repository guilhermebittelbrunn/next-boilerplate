# Análise e blueprint — Pipeline de CI no GitHub Actions

> Origem: [`specs/ci-pipeline.md`](../../../../specs/ci-pipeline.md) (`status: approved`, `value: alto`,
> `effort: M`, `audience: dx`, `depends_on: []`). O **problema**, a **evidência de mercado** e o **corte de
> MVP** são decisão de produto já tomada — este documento responde só ao *como*. Divergências viraram
> pergunta ao usuário, não decisão unilateral; as **sete respostas** estão em §11 e o blueprint já as
> reflete. **Nenhuma pergunta em aberto resta** — o `/develop` pode seguir o plano como está.
>
> **Baseline medida no commit `3089d71`**, em 2026-08-31, neste workspace. Todo número abaixo foi
> **executado**, não estimado. Os comandos estão citados para reexecução.

---

## 0. Sumário executivo da medição

| Gate | Estado hoje | Medido com |
|------|-------------|------------|
| **Lint** | 🔴 **192 erros / 37 warnings** em 391 arquivos (473 ms) | `pnpm check` |
| **Typecheck** | 🟡 3 apps ✅ · **`apps/email` ❌** · **`@repo/analytics` ❌** · **`@repo/typescript-config` ❌** · 4 pacotes **sem script** | `pnpm --filter <w> typecheck` |
| **Testes** | ✅ **244 testes / 37 arquivos**, 3 tasks, 29,8 s a frio · 387 ms com cache (`FULL TURBO`) | `pnpm test` |
| **Build** | 🔴 **`api#build` falha hoje**, e falha **também em `envMode: loose`** | `turbo run build` |
| **`envMode: strict`** | ✅ `test` passa **244/244 com zero env declarada** | `turbo run test --force --env-mode=strict` |
| **`turbo run typecheck`** | 🔴 `Could not find task 'typecheck' in project` | `turbo run typecheck --dry=json` |
| **`.github/`** | não existe | `git ls-files .github` |

**A conclusão que muda o desenho:** o corte da spec pressupõe ligar gates sobre uma base saudável. Dos
quatro gates, **dois estão vermelhos hoje** e um está parcialmente quebrado. Ligar o CI antes de zerar
isso produz exatamente o que a spec proíbe (`:87-89`): *"CI cronicamente vermelho é pior que CI nenhum"*.
Por isso o plano tem uma **fase 0 de saneamento** (P0–P3) que é pré-requisito, não extra — e o
`.github/workflows/ci.yml` é o **último** passo, não o primeiro.

---

## 1. Contexto da tarefa

### 1.1 Resumo

Fazer com que toda PR e todo push na branch principal executem automaticamente **lint + tipos + testes**
no GitHub Actions, com `lint` e `typecheck` promovidos a tasks do turbo para que o comando local e o do CI
sejam **o mesmo comando**.

### 1.2 Objetivos (o corte de MVP da spec, `:57-64`)

1. PR e push na principal disparam verificação automática, visível no GitHub antes do merge.
2. A verificação cobre lint/format, tipos de todos os workspaces e testes, **falhando o merge**.
3. `lint` e `typecheck` viram tasks do turbo (cache + paralelismo + paridade local/CI).
4. Envs consumidas pelas tasks ficam declaradas (fim do cache-hit com valor errado).
5. `apps/web` entra na suíte, deixando de ser o app não verificado.

### 1.3 Fora de escopo (da spec, `:66-72`)

Remote Cache do Turbo · limiar de cobertura · Renovate/Dependabot · preview deploy por PR · orçamento de
performance · testes E2E (spec `e2e-testing`).

**Fora de escopo acrescentado por esta análise** (viram achado ou pergunta, não entrega):

- Reescrever o `packages/analytics/server.ts` para funcionar (a recomendação é **apagar** — §4.3).
- Implementar os handlers de webhook da Stripe. Só a **variável morta** que trava o lint é tocada.
- Qualquer alteração de comportamento em runtime da API, do painel ou da landing.

### 1.4 Apps impactados

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Possivelmente ganha script `typecheck` (§4.3). Zero mudança de contrato. |
| `apps/api` | `vitest.config.mts` (jsdom → node) · 2 erros de lint no webhook · **nenhuma** mudança de rota, guard ou repositório. |
| `apps/app` | Correções de lint/format · remoção de `midd_teste.ts`. |
| `apps/web` | **Ganha `vitest.config.mts`, script `test`, `__tests__/` e devDep `vitest`.** |
| `apps/email` | Script `typecheck` quebrado (§4.3). |
| `packages/*` | Correções de lint/format · scripts `typecheck` acertados. |
| Raiz | `biome.jsonc`, `package.json`, `turbo.json`, `.github/workflows/`, docs. |

### 1.5 Itens do guia marcados `N/A`

Não há **Firestore** (§2), **contrato de SDK** (§3), **rota/guard/Zod/error.code** (§4), **UI/rota do
front** (§5.1, §5.3), **i18n** (§5.4) nem **impersonação/autorização de produto** (§6). Não há **modo de
produto** nem dependência de assinatura. A **validação visual com `agent-browser`** (§8) é `N/A` **como
verificação de layout** — nada de UI muda — mas **não** como prova de não-regressão: o P0 aplica
formatação automática em `apps/app`/`apps/web`/`packages/design-system`, e isso exige percorrer o painel e
a landing depois (§8 deste plano).

### 1.6 Genérico × específico

100% genérico e de infraestrutura: tudo que for entregue é herdado por todo fork. Isso eleva o custo de
errar — um `.github/workflows/ci.yml` mal desenhado é replicado em cada MVP gerado.

### 1.7 Fontes e referências

| Fonte | Estado |
|-------|--------|
| `specs/ci-pipeline.md` | lida integralmente |
| `specs/research/engineering-baseline.md` (práticas 1, 5, 13, 14, 18) | lida |
| `specs/BACKLOG.md` (aviso `FIREBASE_ADMIN_*` `:47-49` + tabela de achados) | lida e **reconferida no código** |
| `docs/features/firestore-admin-access/STATE.md` | lido (histórico do gate manual) |
| `.claude/rules/git-commits.md` · `docs/review-checklist.md` · `docs/feature-analysis-guide.md` | lidos |

**Referências não lidas: nenhuma.** A tarefa não veio de card, wiki, Figma ou print; todas as fontes são
arquivos deste repositório.

### 1.8 Deriva encontrada na spec (⚠️ não corrigida aqui)

A spec afirma em `:28`: *"Também não há `vercel.json` nem `.husky/`"*. **O `vercel.json` existe nos três
apps**: `apps/api/vercel.json` (com um `crons` para `/cron/keep-alive`), `apps/app/vercel.json` e
`apps/web/vercel.json`, os três com `ignoreCommand: node scripts/skip-ci.js`
(`apps/web/scripts/skip-ci.js:5-8` pula o build quando o commit contém `[skip ci]`). `.husky/` de fato não
existe. Isso **não muda o corte** — só significa que já existe um ponto de decisão de build na Vercel que
o pipeline precisa não contradizer. **Não editei a spec** (arquivá-la/corrigi-la é do `/spec --sync`);
registrado aqui e no `STATE.md`.

---

## 2. Baseline de lint — a medição que decide o corte

### 2.1 O que `pnpm check` realmente executa

`package.json:14` → `npx ultracite@latest check`. Desempacotando o binário do `ultracite@6.0.3`
(`node_modules/ultracite/dist/index.js`), o subcomando `check` monta e executa literalmente:

```
npx @biomejs/biome check --no-errors-on-unmatched ./
```

e propaga o exit code do Biome. Três consequências medidas:

1. **O motor já é fixo.** `npx @biomejs/biome --version` resolve para o binário local → **2.3.1**, a versão
   fixada em `package.json:24`. O que flutua é só o **wrapper**.
2. **Mas o wrapper é baixado da rede a cada execução** (`@latest`). Um CI sem acesso ao registry além do
   `pnpm install`, ou um dia em que o `ultracite` 7 mude os argumentos do spawn, muda o gate **sem
   commit**. É a armadilha de reprodutibilidade apontada no enunciado, e ela é real — só não é na versão
   do Biome.
3. **A substituição é comprovadamente byte-idêntica.** Rodando o binário fixado direto:
   `./node_modules/.bin/biome check --no-errors-on-unmatched ./` → `Checked 391 files in 473ms. Found 192
   errors. Found 37 warnings.` — exatamente o mesmo resultado de `pnpm check`.

O Biome 2.3.1 também expõe `biome ci`, com `--changed`/`--since=REF` (lint só do diff) e
`--reporter=github` (anotações inline na PR).

### 2.2 A baseline, decomposta

`biome check --reporter=json --max-diagnostics=1000` → **229 diagnósticos** (192 erros + 37 warnings),
107 arquivos distintos.

| Origem | Erros | Warnings |
|--------|------:|---------:|
| **`.claude/skills/brainstorming/scripts/`** (código de skill vendorizado) | **81** | 0 |
| `apps/web` | 24 | 3 |
| `apps/app` | 22 | 7 |
| `packages/internationalization` | 19 | 1 |
| `packages/auth` | 16 | 2 |
| `apps/api` | 10 | 6 |
| `packages/design-system` | 9 | 4 |
| demais `packages/*` + raiz | 11 | 14 |

**42% dos erros não são código deste boilerplate.** São 5 arquivos versionados sob
`.claude/skills/brainstorming/scripts/` (`server.cjs` sozinho gera 66 diagnósticos, `helper.js` 13). São
scripts de uma skill de terceiro, que ninguém deste repo mantém.

### 2.3 Cenários medidos

| Cenário | Erros | Warnings |
|---------|------:|---------:|
| hoje | 192 | 37 |
| **excluindo `.claude/` do `biome.jsonc`** | **111** | 37 |
| excluindo `.claude/` + `turbo/generators` | 110 | 37 |
| só `apps/` + `packages/` | 109 | 37 |

### 2.4 Os 111 erros restantes, por regra

| Regra | Qtd | Auto-corrigível por `biome check --write` (safe) |
|-------|----:|:--:|
| `format` | 70 | ✅ |
| `assist/source/useSortedAttributes` | 6 | ✅ |
| `assist/source/organizeImports` | 3 | ✅ |
| `lint/nursery/useSortedClasses` | 3 | ✅ |
| `lint/style/useBlockStatements` | 6 | ❌ manual |
| `lint/style/noMagicNumbers` | 4 | ❌ manual |
| `lint/suspicious/noArrayIndexKey` | 3 | ❌ manual |
| `lint/correctness/noUnusedVariables` | 2 | ❌ manual |
| `lint/nursery/noEmptySource` | 2 | ❌ manual |
| `lint/performance/noBarrelFile` | 2 | ❌ manual |
| `lint/a11y/noSvgWithoutTitle` | 2 | ❌ manual |
| 8 regras com 1 ocorrência cada | 8 | ❌ manual |

Warnings (37): **32 `suppressions/incorrect`** (comentários `biome-ignore` que ainda carregam o
placeholder `<explanation>`) + **5 `suppressions/unused`** (suppression que já não suprime nada).

**82 dos 111 erros caem com um `biome check --write` sem `--unsafe`.** Sobram **29 erros manuais** + 37
warnings mecânicos — algo em torno de meia dúzia de arquivos com trabalho real. Isso é uma tarefa de
horas, não a semana que "192 erros" sugere.

### 2.5 ⚠️ Correção de um achado do `specs/BACKLOG.md`

O backlog afirma que a variável morta no webhook da Stripe *"sugere que o arquivo não é coberto pelo
lint"*. **Medido: é coberto.** O relatório JSON traz, em
`apps/api/app/(routes)/webhooks/payments/route.ts`, **dois** `lint/correctness/noUnusedVariables` —
`"This variable customerId is unused."` — além de 1 `suppressions/incorrect`. O arquivo entra no lint
normalmente; a regra está ligada em `biome.jsonc:20` e dispara. O que nunca existiu foi **um gate que
falhasse por causa dela**. É exatamente o buraco que esta spec fecha, e não há bug de cobertura de lint
para investigar.

Do mesmo modo, `apps/app/midd_teste.ts` é confirmado como a **única** violação de
`useFilenamingConvention` no repo inteiro.

---

## 3. Baseline de typecheck

`tsc --noEmit --emitDeclarationOnly false` por workspace.

| Workspace | Script? | Resultado | Observação |
|-----------|:---:|---|---|
| `apps/api` | ✅ | **✅ limpo** | |
| `apps/app` | ✅ | **✅ limpo** | |
| `apps/web` | ✅ | **✅ limpo** | |
| `apps/email` | ✅ | 🔴 **TS18003** | `No inputs were found`. O workspace versiona só `package.json` e `tsconfig.json` — não há `.ts` para checar. |
| `@repo/design-system` · `@repo/email` · `@repo/next-config` · `@repo/payments` · `@repo/security` · `@repo/seo` | ✅ | ✅ limpo | |
| `@repo/analytics` | ✅ | 🔴 **3 erros** | `server.ts:2` `Cannot find module 'posthog-node'`; `:5` e `:6` leem `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST`, que `keys.ts` não declara. É o achado "código morto que não compila" do backlog. |
| `@repo/typescript-config` | ✅ | 🔴 **100+ erros** | **Não tem `tsconfig.json`** (só `base.json`, `nextjs.json`, `react-library.json`). O `tsc` sobe a árvore, encontra o `tsconfig.json` **da raiz** e tenta checar o repositório inteiro sem os `paths` dos apps → enxurrada de `TS2307`. |
| `@repo/auth` · `@repo/sdk` · `@repo/internationalization` | ❌ | — | têm `tsconfig.json`, **não** têm script. |
| `@repo/shared` | ❌ | — | **não tem `tsconfig.json` nem script.** |

### 3.1 `typecheck` depende de `^build`? — **Não. Medido.**

Este workspace **nunca foi buildado**: não existe `apps/*/.next/` nem `apps/*/next-env.d.ts` (ambos
ignorados por `.gitignore:47,71,155`). Mesmo assim, `apps/{api,app,web} typecheck` passam. Os `include`
dos três tsconfigs citam `next-env.d.ts` e `.next/types/**/*.ts`
(`apps/app/tsconfig.json:12-16`), mas o `tsc` ignora entradas de `include` inexistentes.

**Consequência para o `turbo.json`: `typecheck` NÃO deve declarar `dependsOn: ["^build"]`.** Fica rápido,
paralelo e cacheável. Ressalva honesta: sem `.next/types`, o typecheck **não** valida os tipos gerados de
rota do Next — é a mesma cobertura que a pessoa tem no editor e no gate manual de hoje, nem mais nem
menos.

### 3.2 Cobertura transitiva e um furo de hash

`@repo/auth`, `@repo/sdk`, `@repo/shared` e `@repo/internationalization` não têm script próprio, mas são
checados **transitivamente**: `apps/app/tsconfig.json:8` mapeia `@repo/*` → `../../packages/*`, então todo
arquivo desses pacotes **alcançável por import** entra no `tsc` do app. O que escapa é o código sem
importador — precisamente o caso do `packages/analytics/server.ts`.

🔴 **Furo de cache descoberto:** `apps/web/package.json` declara só `@repo/sdk`, `@repo/design-system`,
`@repo/email`, `@repo/next-config`, `@repo/security` e `@repo/typescript-config`. Mas
`apps/web/shared/lib/seo.ts` importa `@repo/internationalization/utils`, e
`apps/web/tsconfig.json:14-16` puxa **três arquivos de `packages/shared`** pelo `include`. Como o turbo
monta o hash da task a partir dos arquivos do workspace **mais as dependências declaradas**, uma mudança
em `@repo/internationalization` ou `@repo/shared` **não invalida** `web#typecheck`/`web#test`. Isso é
cache-hit com resultado errado — a mesma classe de problema que o `envMode: loose` causa com env. Precisa
entrar no plano (P6).

---

## 4. Baseline de testes

### 4.1 Números

`pnpm test` (`turbo test`), tudo verde:

| Workspace | Arquivos | Testes | Ambiente |
|-----------|---:|---:|---|
| `apps/api` | 15 | 107 | `jsdom` (`apps/api/vitest.config.mts:8`) |
| `apps/app` | 21 | 135 | `jsdom` (`apps/app/vitest.config.mts:8`) |
| `@repo/internationalization` | 1 | 2 | `node` (`vitest.config.mts:5`) |
| **total** | **37** | **244** | |

Tempo: **29,8 s** a frio · **387 ms** com cache (`>>> FULL TURBO`). O cache do turbo funciona.

> A spec (`:37-38`) fala em 23 arquivos; a suíte cresceu para 37 durante o pipeline de
> `firestore-admin-access`. Não é deriva relevante — só confirma que o número da spec envelheceu.

`test` tem `dependsOn: ["^test"]` (`turbo.json:18`) e **não declara `outputs`**, o que é correto: teste
não produz artefato, só log cacheável. Turbo enumera as 16 workspaces, mas só 3 têm script.

### 4.2 O `jsdom` de `apps/api` — confirmado como defeito, com A/B medido

A spec levanta a suspeita em `:95-96`. Medições:

- **Nenhum teste da `apps/api` usa DOM.** O grep por `document`/`window`/`localStorage`/`@testing-library`/
  `render(` nos 15 arquivos só bate na palavra *"document"* dentro de descrições sobre documentos do
  Firestore (`baseRepository.test.ts:185`, `:189`, `:308`…). Não há nenhum `.tsx` em `apps/api/__tests__/`.
- 🔴 **`jsdom` é dependência fantasma da `apps/api`.** `apps/api/package.json` não a declara; a única
  declaração no repo é `apps/app/package.json:48`. `require.resolve("jsdom")` a partir de `apps/api`
  resolve pelo store hoisted da raiz. Funciona por acidente de layout do pnpm.
- **A/B executado** (`vitest run --environment=node` vs. o config atual):

  | ambiente | resultado | duração | setup de ambiente |
  |---|---|---:|---:|
  | `jsdom` (hoje) | 107/107 ✅ | 6,14 s | 25,91 s |
  | `node` | **107/107 ✅** | **2,56 s** | **3 ms** |

Trocar uma linha corta 58% do tempo da suíte da api, elimina a dependência fantasma e alinha com o
config enxuto do `@repo/internationalization`. Vai para o plano.

### 4.3 `envMode: strict` — o item de maior risco, medido

`turbo run test --force --env-mode=strict` → **3 tasks, 244/244 verdes, com `env: []` em todas**.

Nenhum teste depende de env herdada do processo: `NODE_ENV=test` é setado *dentro* do comando
(`apps/api/package.json:11`), e os dois testes que mexem em env
(`apps/api/__tests__/serviceAccountEnv.test.ts`, `instrumentation.test.ts`) escrevem direto em
`process.env` in-process. Nenhum dos três `vitest.config.mts` define `test.env`, `envPrefix` ou
`setupFiles`, e não existe `vitest.setup.*` no repo.

**Portanto: `lint`, `typecheck` e `test` podem ir para `strict` com `env: []` hoje, sem risco.** O risco
do `strict` está inteiramente concentrado no `build` — e o `build` já está vermelho por outro motivo (§5).

---

## 5. 🔴 O build já está quebrado — e não é por causa do `envMode`

O enunciado e o `specs/BACKLOG.md:47-49` alertam que `pnpm --filter api build` passou a exigir as três
`FIREBASE_ADMIN_*`. Verdade (`apps/api/env.ts:12-16`, `skipValidation` só em `development` em `:17`, e o
único importador de produção é `app/(routes)/webhooks/payments/route.ts:6`). **Mas a primeira falha do
build acontece antes disso, e por outra razão.**

### 5.1 O experimento

```
turbo run build --env-mode=strict      → Failed: api#build   (1m00s)
turbo run build --filter=api --force   → Failed: api#build   (25s)   ← modo loose, o padrão de hoje
```

**O controle em modo `loose` falha igual.** O `envMode` não tem nada a ver.

### 5.2 A causa, no traço

```
api:build:  ✓ Compiled successfully in 20.2s
api:build:    Collecting page data ...
api:build: Error: Neither apiKey nor config.authenticator provided
api:build:     at new r (...)
api:build:     at Object.<anonymous> (.next/server/app/(routes)/webhooks/payments/route.js:10:3)
api:build: > Build error occurred
api:build: Error: Failed to collect page data for /webhooks/payments
```

A cadeia é determinística:

1. `packages/payments/keys.ts:14` — `skipValidation: !process.env.STRIPE_SECRET_KEY`. Com a variável
   **ausente ou vazia**, a validação é pulada e `keys().STRIPE_SECRET_KEY` sai `undefined`/`""`.
2. `packages/payments/index.ts:5` — `export const stripe = new Stripe(keys().STRIPE_SECRET_KEY || "", …)`,
   **em escopo de módulo**. O `|| ""` transforma "sem chave" em "chave vazia".
3. O SDK da Stripe rejeita string vazia no construtor. A exceção sobe durante o *collect page data* de
   `/webhooks/payments`, que importa `stripe` (`route.ts:3`).

Neste workspace, `apps/api/.env` **tem** `STRIPE_SECRET_KEY`, mas com **valor de comprimento 0**. Num
clone limpo a variável simplesmente não existe — mesmo resultado.

### 5.3 Por que isso é central para este plano

- **Decidiu a pergunta 2 da spec** (`build` na PR ou só na principal) com dado, não com preferência: o
  `build` fica **fora do CI** neste corte (Q2, §11).
- **Colide de frente com o sinal de pronto `:104`** — *"um clone limpo, sem nenhum segredo configurado,
  consegue rodar o pipeline até o fim"*. Com o `build` dentro, o sinal é inalcançável: são necessários
  `STRIPE_SECRET_KEY` **e** as três `FIREBASE_ADMIN_*`. Sem o `build`, o sinal é **alcançável hoje** — foi
  o que a medição de `--env-mode=strict` em `test` provou.
- **O repo já tem o padrão correto**, e a própria spec o cita em `:92-94`: `packages/security/index.ts`
  faz no-op quando `ARCJET_KEY` não existe. Aplicar o mesmo ao cliente Stripe (instanciação preguiçosa ou
  `null` sem chave) devolve o build ao verde sem segredo nenhum.
- ✅ **Decidido corrigir** (Q5, §11), no **P10**, em commit próprio de `packages/payments`. É a única
  mudança de código de produção do corte. Note que isso **não** faz o `build` entrar no CI: mesmo
  corrigido, ele continua exigindo as três `FIREBASE_ADMIN_*`. O ganho é o build voltar ao verde onde ele
  de fato roda — local e Vercel.

---

## 6. Inventário de env — o insumo para sair do `envMode: loose`

Levantado varrendo os três `env.ts`, os sete `keys.ts` e todo `process.env.`/`NEXT_PUBLIC_` do código.

### 6.1 Composição

| App | `extends` | `skipValidation` |
|-----|-----------|------------------|
| `apps/api` | `auth()`, `core()`, `email()`, `payments()` (`env.ts:9`) | `NODE_ENV === "development"` (`:17`) |
| `apps/app` | `core()`, `email()`, `security()` (`env.ts:7`) | — |
| `apps/web` | `core()`, `email()`, `security()` (`env.ts:7`) | `true` (`:11`) — **só do schema local, que é vazio**; os presets validam do mesmo jeito |
| `apps/email` | não tem `env.ts` | — |

### 6.2 Exigidas em **build**

| Variável | Onde é avaliada em build | Apps |
|----------|--------------------------|------|
| `FIREBASE_ADMIN_PROJECT_ID` / `_CLIENT_EMAIL` / `_PRIVATE_KEY` | `apps/api/env.ts:13-15`, via `webhooks/payments/route.ts:6` | api |
| `STRIPE_SECRET_KEY` | `packages/payments/index.ts:5` (escopo de módulo) | api |
| `ARCJET_KEY` | `packages/security/index.ts:10` (escopo de módulo), via os `proxy.ts` e layouts | app, web |
| `RESEND_TOKEN` / `RESEND_FROM` | `packages/email/index.ts:4` (escopo de módulo), via a contact action | web |
| 7× `NEXT_PUBLIC_FIREBASE_*` | `packages/auth/client.ts:30-36` — inlined | app, web |
| `NEXT_PUBLIC_API_URL` | `apps/{app,web}/shared/lib/client.ts:4` | app, web |
| `NEXT_PUBLIC_APP_URL` · `_WEB_URL` · `_DOCS_URL` | `packages/next-config/keys.ts:22-25` + componentes da web | app, web |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | `packages/internationalization/utils.ts:17` | todos |
| `NEXT_PUBLIC_PRODUCT_MODE` | `packages/next-config/product-mode.ts:17` | app, web |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | `packages/analytics/provider.tsx:10` (escopo de módulo) | app |
| `NEXT_PUBLIC_APP_NAME` · `_APP_AUTHOR` · `_APP_AUTHOR_URL` · `_TWITTER_HANDLE` | `packages/seo/metadata.ts:14-22` (escopo de módulo) | web |
| `VERCEL_PROJECT_PRODUCTION_URL` | `packages/seo/metadata.ts:23` | web |
| `NODE_ENV` · `ANALYZE` | `next.config.ts` de cada app | todos |

### 6.3 Só em runtime

`NEXT_RUNTIME` (`apps/api/instrumentation.ts:9`) · `FIREBASE_WEB_API_KEY` (leitura preguiçosa,
`firebase-identity-toolkit.ts:27`) · `SESSION_COOKIE_DOMAIN` / `SESSION_COOKIE_MAX_AGE_DAYS`
(`packages/auth/session.ts:30,49`) · `STRIPE_WEBHOOK_SECRET` · `CORS_ORIGIN` (`apps/api/proxy.ts:15`).

### 6.4 Usadas em código e **ausentes de todo `createEnv`**

`CORS_ORIGIN` (achado 🔴 já registrado no backlog, escopo de `api-hardening`) · `SESSION_COOKIE_DOMAIN` ·
`SESSION_COOKIE_MAX_AGE_DAYS` · `NEXT_PUBLIC_APP_NAME` · `NEXT_PUBLIC_APP_AUTHOR` ·
`NEXT_PUBLIC_APP_AUTHOR_URL` · `NEXT_PUBLIC_TWITTER_HANDLE` · os 7 `NEXT_PUBLIC_FIREBASE_*` · `NODE_ENV`.

**Precisam entrar no `env`/`globalEnv` do `turbo.json` mesmo assim** — o turbo hasheia a env do processo,
não o `createEnv`.

### 6.5 Duas armadilhas de cache além do `envMode`

1. **`globalDependencies: ["**/.env.*local"]` (`turbo.json:3`) não cobre `.env` nem `.env.production`.**
   Localmente, o Next carrega `apps/<app>/.env` sozinho (o log do build confirma: `- Environments: .env`),
   e o turbo **não hasheia esse arquivo**. Mudar o `.env` não invalida o cache. Declarar `env` por task
   resolve o lado do CI (onde a env vem de secret), mas **não** o lado local — para isso o padrão precisa
   virar `["**/.env.*local", "**/.env"]`.
2. **Código morto que só existe em env:** `LANGUNE_API_KEY`/`LANGUNE_PROJECT_ID`
   (`packages/internationalization/keys.ts:4-5`) não têm nenhum consumidor, e
   `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST` são lidas em `packages/analytics/server.ts:5-6` sem estarem
   declaradas. Nada disso deve entrar na allowlist do turbo.

---

## 7. Blueprint técnico (Etapa 2)

Eixo adaptado, conforme o enunciado: **saneamento → `biome.jsonc`/scripts → `turbo.json` → workflow →
docs**. As dependências são reais: sem P0 o gate de lint nasce vermelho; sem P2 não existe
`turbo run lint typecheck`; sem P2 o workflow não tem o que chamar.

### 7.1 Ordem de implementação

| # | Passo | Escopo | Gate para seguir |
|---|-------|--------|------------------|
| **P0** | Zerar a baseline de lint | `biome.jsonc` + repo | `pnpm check` → 0/0 |
| **P1** | Fixar o comando de lint | `package.json` raiz | `pnpm check` idêntico, sem rede |
| **P2** | `apps/api`: jsdom → node | `apps/api` | 107/107 verdes |
| **P3** | `apps/web` na suíte | `apps/web` | suíte nova verde; `turbo test` = 4 tasks |
| **P4** | Sanear os `typecheck` | `apps/email`, `packages/*` | todo `typecheck` existente verde |
| **P5** | Corrigir dependências não declaradas | `apps/web`, `apps/api` | hash do turbo correto |
| **P6** | `lint` + `typecheck` no `turbo.json` | `turbo.json` | `turbo run lint typecheck test` verde |
| **P7** | Declarar env / `envMode` | `turbo.json` | idem, com `--env-mode=strict` |
| **P8** | O workflow | `.github/workflows/ci.yml` | PR de teste vermelha e verde |
| **P9** | Documentação + runbook de branch protection | `docs/`, `CLAUDE.md` | — |
| **P10** | `build` de volta ao verde (cliente Stripe preguiçoso) | `packages/payments` | `turbo run build` sem `STRIPE_SECRET_KEY` não falha mais em `/webhooks/payments` |

> **P10 é firme, não condicional** (decisão Q5, §11). Mas ele **não** faz o `build` entrar no CI (decisão
> Q2): mesmo com a Stripe corrigida, `api#build` segue exigindo as três `FIREBASE_ADMIN_*`. O valor do P10
> é devolver o build ao verde onde ele realmente roda — local e Vercel. Por ser a **única** mudança de
> código de produção do corte, vai em commit próprio e pode ser feito por último, sem bloquear P0–P9.

### 7.2 P0 — Zerar a baseline de lint

**P0.a — excluir o código de skill vendorizado.** `biome.jsonc`, bloco `files.includes` (`:31-43`), que já
tem 9 exclusões no mesmo espírito:

```jsonc
"files": {
  "includes": [
    "**/*",
+   "!.claude/skills",
    "!packages/design-system/components/ui",
    …
  ]
}
```

Efeito **medido**: 192 → **111 erros**; 37 warnings inalterados. Justificativa autocontida: são scripts de
uma skill de terceiro (`server.cjs`, `helper.js`), não fonte deste boilerplate; corrigi-los seria manter
um fork de código que ninguém aqui edita.

**P0.b — aplicar os fixes seguros.** `biome check --write ./` (sem `--unsafe`), commit **isolado** de
formatação. Resolve os 82 diagnósticos mecânicos (70 `format` + 6 `useSortedAttributes` + 3
`organizeImports` + 3 `useSortedClasses`). Toca principalmente `apps/web`, `apps/app`,
`packages/internationalization`, `packages/auth` e `packages/design-system`.

> ⚠️ `packages/design-system/components/{ui,lib,hooks}` estão fora do Biome (`biome.jsonc:34-36`) e usam
> 2 espaços — não são tocados, e não devem ser (`docs/review-checklist.md:29-30`).

**P0.c — os ~29 erros manuais + 37 warnings.** Ordem sugerida, do mecânico ao pensado:

1. **32 `suppressions/incorrect` + 5 `suppressions/unused`** (37 warnings) — trocar o placeholder
   `<explanation>` pela razão real, e apagar as suppressions que não suprimem mais nada. Espalhadas por 30
   arquivos, 1–2 cada. Atenção à `.claude/rules/code-comments.md`: a razão tem de ser **autocontida**.
2. **`apps/app/midd_teste.ts`** (`useFilenamingConvention`) — **apagar**. É o achado "arquivo órfão sem
   exports" do backlog; confirmado sem exports e sem importador.
3. **2× `noUnusedVariables` em `apps/api/app/(routes)/webhooks/payments/route.ts`** — remover a extração
   morta de `customerId`. **Não** implementar os handlers: fora de escopo.
4. `useBlockStatements` (6), `noMagicNumbers` (4), `noArrayIndexKey` (3), `noEmptySource` (2),
   `noBarrelFile` (2), `noSvgWithoutTitle` (2) e as 8 regras avulsas.

> `noBarrelFile` e `noSvgWithoutTitle` podem exigir decisão (barril é padrão declarado do repo; `<title>`
> em SVG decorativo é discutível). Se a correção "certa" for uma suppression **com razão escrita**, tudo
> bem — o que não pode é sobrar diagnóstico.

**Gate do P0:** `pnpm check` → `Found 0 errors. Found 0 warnings.`, exit 0.

### 7.3 P1 — O mesmo comando local e no CI

`package.json` da raiz:

```diff
-  "check": "npx ultracite@latest check",
-  "fix": "npx ultracite@latest fix",
+  "check": "biome check --no-errors-on-unmatched ./",
+  "fix": "biome check --write --no-errors-on-unmatched ./",
```

Mantém `ultracite@6.0.3` em `devDependencies` — é ele que fornece os presets `ultracite/core|react|next`
que o `biome.jsonc:3` estende. O que sai é só a **execução** via `@latest`.

Ganhos: versão do gate presa ao lockfile · sem download em toda execução · `pnpm check` deixa de exigir
rede · comportamento **provado idêntico** (§2.1).

> Alternativa a avaliar no `/develop`: usar `biome ci` em vez de `biome check` no job. `ci` não escreve
> nada por construção e aceita `--reporter=github` (anotações inline na PR). Mas aí o comando local e o do
> CI voltam a divergir, contra o sinal de pronto `:102-103`. **Recomendação: manter `pnpm check` nos dois
> lados** e, se quiser anotações, adicionar só o `--reporter=github` no job.

### 7.4 P2 — `apps/api` em ambiente `node`

```diff
# apps/api/vitest.config.mts
   test: {
-    environment: "jsdom",
+    environment: "node",
   },
```

E remover de `apps/api/package.json` o `@vitejs/plugin-react` (`:36`), junto com o `plugins: [react()]` do
config — sem `.tsx` nos testes ele não faz nada. Medição do A/B em §4.2.

### 7.5 P3 — `apps/web` na suíte

Modelo declarado: `packages/internationalization/__tests__/parity.test.ts` — ambiente `node`, **zero**
devDep de teste, config de 6 linhas, e um teste que **falha de verdade** quando alguém esquece uma chave.

**Arquivos novos**

```
apps/web/
  vitest.config.mts          ← environment "node" + aliases @ e @repo
  __tests__/
    seo.test.ts              ← getWebBaseUrl + buildLocaleMetadata
    sitemap.test.ts          ← (opcional) 5 rotas × 3 locales
```

```ts
// apps/web/vitest.config.mts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    test: { environment: "node" },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./"),
            "@repo": path.resolve(__dirname, "../../packages"),
        },
    },
});
```

Os aliases **são necessários**, não cerimônia: `apps/web/app/sitemap.ts` e `robots.ts` importam
`@/shared/lib/seo`, e `apps/web/shared/lib/seo.ts` importa `@repo/internationalization/utils` e
`@repo/seo/metadata`. Sem `plugins: [react()]` e sem `jsdom` — nenhum componente é renderizado.

```diff
# apps/web/package.json
   "scripts": {
+    "test": "NODE_ENV=test vitest run",
   },
   "devDependencies": {
+    "vitest": "^4.0.3",
```

`vitest` **explícito**, e não herdado por hoisting — é exatamente o defeito que o P2 corrige na api.

**O que o teste cobre (e por que não é teatro).** `apps/web/shared/lib/seo.ts` é o único helper puro e
carregado do app, e concentra duas regras que quebram calado:

- `getWebBaseUrl()` — precedência `NEXT_PUBLIC_WEB_URL` → `VERCEL_PROJECT_PRODUCTION_URL` →
  `http://localhost:3001`, com normalização de origem (remoção de barra final, `https://` prefixado quando
  falta protocolo). Casos de borda reais: `"foo.com/"` → `https://foo.com`; `"http://x"` **preserva** o
  `http`. Lê env em *call time*, então `vi.stubEnv` basta — sem `resetModules`.
- `buildLocaleMetadata()` — tem de emitir `alternates.languages` com exatamente `pt-br`, `en`, `es` e
  `x-default`, canonical `/${locale}${path}`, e cair em `en_US` para locale desconhecido. É a peça de SEO
  que ninguém percebe quebrada olhando a tela.

Um teste opcional de `apps/web/app/sitemap.ts` (5 rotas × 3 locales = 15 entradas, sem URL duplicada, todas
absolutas sob a mesma base) é barato e igualmente load-bearing.

> ⚠️ **`build.dependsOn` inclui `test` (`turbo.json:8`)**: a partir daqui, teste do web quebrado bloqueia o
> build do web. É por isso que a suíte tem de ser `node`, sem rede e determinística.

> ⚠️ Não congelar em teste as strings pt-br hardcoded de
> `apps/web/app/[locale]/sign-{in,up}/validations/` — o padrão do repo é a factory
> `buildXFormSchema(dictionary)` (`apps/app/__tests__/authSchemas.test.ts`). Testar as strings literais
> **travaria** o bug de i18n em vez de expô-lo. Fica fora.

### 7.6 P4 — Sanear os `typecheck`

| Workspace | Ação recomendada | Motivo |
|-----------|------------------|--------|
| `apps/email` | **remover o script `typecheck`** | O workspace versiona só `package.json` + `tsconfig.json`. `TS18003` é a resposta correta a "não há o que checar". Alternativa: `"files": []` no tsconfig — mais obscuro. |
| `@repo/typescript-config` | **remover o script `typecheck`** | Pacote de configs JSON, sem `.ts`. Hoje o script sobe até o `tsconfig.json` da raiz e checa o repo inteiro com os `paths` errados. |
| `@repo/analytics` | **apagar `packages/analytics/server.ts`** | Zero importadores; depende de `posthog-node`, não instalada; lê duas chaves que `keys.ts` não declara. É o achado "código morto que não compila" do backlog. Reescrever seria feature nova. |
| `@repo/sdk` | ✅ **adicionar** `"typecheck": "tsc --noEmit --emitDeclarationOnly false"` | É o **contrato** entre front e API — merece gate próprio, não só cobertura transitiva. |
| `@repo/auth`, `@repo/internationalization` | ✅ **adicionar** (têm `tsconfig.json`) | Baixo custo. Se algum vier vermelho, é achado — e aí ou corrige ou fica fora deste corte. |
| `@repo/shared` | ❌ **fora do corte** (decisão Q6) | Único pacote sem `tsconfig.json`; criar um é escopo próprio. Segue coberto transitivamente pelos apps. |

**Gate:** todo workspace que tiver script `typecheck` passa. Um script que não pode passar é pior que
script nenhum.

### 7.7 P5 — Dependências não declaradas

```diff
# apps/web/package.json — dependencies
+    "@repo/internationalization": "workspace:*",
+    "@repo/shared": "workspace:*",
```

Sem isso o turbo não invalida `web#typecheck`/`web#test` quando esses pacotes mudam (§3.2) — cache-hit com
resultado errado, o gêmeo do problema de env que a spec já ataca. E `apps/api` perde o
`@vitejs/plugin-react` (P2).

### 7.8 P6 — `turbo.json`: as tasks novas

```diff
 {
   "$schema": "https://turborepo.com/schema.json",
-  "globalDependencies": ["**/.env.*local"],
+  "globalDependencies": ["**/.env.*local", "**/.env"],
   "ui": "tui",
   "envMode": "loose",
   "tasks": {
+    "//#lint": {
+      "outputs": [],
+      "env": [],
+      "inputs": ["$TURBO_DEFAULT$", "biome.jsonc"]
+    },
+    "typecheck": {
+      "dependsOn": [],
+      "outputs": [],
+      "env": []
+    },
     "build": { … },
```

**Por que `lint` é task da raiz (`//#lint`) e não task por workspace.** O Biome varre o repositório
inteiro em **473 ms** a partir de um único `biome.jsonc`. Espalhar um script `lint` por 16 workspaces
duplicaria configuração, checaria a raiz zero vezes ou N vezes, e trocaria meio segundo por 16 processos.
O repo **já tem o precedente**: `//#clean` (`turbo.json:34`). O `pnpm check` continua sendo o mesmo
comando, e `turbo run lint` passa a ser o wrapper cacheável.

**Por que `outputs: []` em ambas.** Nenhuma produz artefato — só o log importa. Deixar `outputs` implícito
funciona no turbo 2, mas explicitar documenta a intenção e evita regressão se o default mudar.

**Por que `typecheck` com `dependsOn: []`.** Medido em §3.1: não há dependência de `^build`, e não há
artefato entre pacotes (cada `tsc` lê as fontes dos `@repo/*` direto pelos `paths`). Paralelismo máximo.
O correto acoplamento entre workspaces vem do grafo de `dependencies`, corrigido no P5.

**`inputs` do `//#lint`.** `$TURBO_DEFAULT$` sozinho não enxerga o `biome.jsonc` como entrada de uma task
da raiz de forma óbvia; declarar explicitamente garante que mudar a config invalide o cache. **Verificar
com `turbo run lint --dry=json` no `/develop`** — se `$TURBO_DEFAULT$` já cobrir, simplificar.

### 7.9 P7 — Env declarada e `envMode`

✅ **Decidido: rota A** (§11, Q7).

**Rota A — a escolhida.** Manter `"envMode": "loose"` global e declarar `env: []` em `lint`, `typecheck` e
`test`. Turbo aplica `strict` **por task** quando `env` está declarado, então as três tasks do CI já ficam
herméticas — **e isso está medido como verde** (§4.3) — enquanto `build` segue como está. Risco: zero. Com
o `build` fora do CI (Q2), cobre o item 4 do corte para **tudo que o pipeline executa**.

**Rota B — registrada para depois, não implementada agora.** `"envMode": "strict"` global +
`env`/`globalEnv` com o inventário do §6. Cumpre o item 4 na letra, mas só faz sentido quando o `build`
entrar no CI. A lista sai pronta do §6.2 e fica abaixo para não se perder:

```jsonc
"globalEnv": ["NODE_ENV", "ANALYZE", "VERCEL", "VERCEL_ENV", "VERCEL_URL",
              "VERCEL_REGION", "VERCEL_PROJECT_PRODUCTION_URL", "NEXT_RUNTIME"],
"tasks": {
  "build": {
    "dependsOn": ["^build", "test"],
    "env": [
      "FIREBASE_ADMIN_*", "FIREBASE_WEB_API_KEY", "NEXT_PUBLIC_FIREBASE_*",
      "STRIPE_*", "RESEND_*", "ARCJET_KEY", "CORS_ORIGIN",
      "SESSION_COOKIE_*", "NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_WEB_URL", "NEXT_PUBLIC_DOCS_URL", "NEXT_PUBLIC_DEFAULT_LOCALE",
      "NEXT_PUBLIC_PRODUCT_MODE", "NEXT_PUBLIC_GA_MEASUREMENT_ID",
      "NEXT_PUBLIC_APP_NAME", "NEXT_PUBLIC_APP_AUTHOR",
      "NEXT_PUBLIC_APP_AUTHOR_URL", "NEXT_PUBLIC_TWITTER_HANDLE"
    ]
  }
}
```

Wildcards (`FIREBASE_ADMIN_*`) são suportados pelo turbo e reduzem a chance de esquecer uma. **Não**
declarar `LANGUNE_*` nem `NEXT_PUBLIC_POSTHOG_*` (§6.5).

### 7.10 P8 — `.github/workflows/ci.yml`

**Um job, não três.** Justificativa medida: lint 0,5 s, typecheck ~20 s, test 30 s a frio. O custo
dominante é `pnpm install`; três jobs o pagam três vezes para paralelizar 50 s de trabalho que o turbo já
paraleliza sozinho dentro de um runner. Um job dá também **um único status check** para a branch
protection — mais simples de configurar num fork.

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: verify
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - uses: pnpm/action-setup@v4          # versão vem de packageManager

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc         # 22.12.0
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - run: pnpm turbo run lint typecheck test
```

Decisões, com o porquê:

| Decisão | Razão |
|---|---|
| `pnpm/action-setup@v4` **sem `version:`** | A action lê `packageManager` do `package.json` (`pnpm@10.19.0`). Fonte única — se fixar no YAML, ele diverge do repo no primeiro bump. |
| `node-version-file: .nvmrc` | Mesma lógica: `22.12.0` sai do arquivo que o dev já usa. |
| `cache: pnpm` no `setup-node` | Cacheia o store do pnpm com base no `pnpm-lock.yaml`. Precisa vir **depois** do `action-setup`, senão o `setup-node` não encontra o pnpm. |
| `--frozen-lockfile` | Falha se o lockfile estiver dessincronizado do `package.json` — gate de graça. |
| `fetch-depth: 2` | Recomendação da nota de pesquisa (`engineering-baseline.md:49`); habilita `biome ci --since` e `turbo --filter=...[HEAD^1]` depois. |
| `concurrency` + `cancel-in-progress` | Push rápido em sequência não empilha runner. |
| **`build` ausente** | ✅ Decisão Q2. Mesmo com o P10, `api#build` exige as três `FIREBASE_ADMIN_*` em secret, o que contradiz o sinal de pronto `:104`. Entra numa rodada seguinte, como job à parte com `if: github.event_name == 'push'` + secrets. |
| **Sem `actions/cache` do turbo** | ✅ Decisão Q3. A execução é ~1 min, dominada pelo `pnpm install` — que o `setup-node` já cacheia. Cache de CI que ninguém observa vira "passou aqui, falhou lá" difícil de depurar. Entra quando doer, com medição que justifique. |

**Nenhum secret é referenciado pelo workflow.** Isso não é omissão: é o critério de aceite `:104` ("um
clone limpo, sem nenhum segredo configurado, roda o pipeline até o fim") escrito em YAML. Qualquer
`${{ secrets.* }}` que apareça neste arquivo está violando o corte.

### 7.11 P9 — Documentação

| Arquivo | O que muda |
|---------|-----------|
| `CLAUDE.md` (§"Comandos essenciais") | `pnpm check`/`fix` passam a ser Biome direto; entram `pnpm turbo run lint typecheck test`. |
| `docs/SETUP.md` | Seção de CI: o que roda, em que evento, e o **runbook de branch protection** (que não é versionável — §11, pergunta 1). |
| `docs/review-checklist.md` | Marcar o que o CI passou a cobrir automaticamente (`pnpm check`, typecheck, paridade de i18n), para a revisão humana focar no que a máquina não vê. |
| `docs/AI-WORKFLOW.md` / `docs/TASK-PIPELINE.md` | O `/review` e o `/test` deixam de ser o **único** gate. |
| `apps/web/CLAUDE.md` | Passa a ter suíte: onde ficam os testes e como rodar. |

**Não editar** `specs/ci-pipeline.md` nem `specs/BACKLOG.md` — é do `/spec --sync` (§1.8).

### 7.12 Env/config nova

**Nenhuma variável de ambiente nova** no repo. No GitHub, o corte recomendado **não exige secret algum** —
esse é justamente o sinal de pronto `:104`. Secrets só aparecem se o `build` entrar (pergunta 2):
`FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (atenção ao `\n`
escapado — `engineering-baseline.md:59-60`) e `STRIPE_SECRET_KEY`.

### 7.13 Plano de commits

Seguindo `.claude/rules/git-commits.md` (um commit por app/pacote, pulverizado por unidade). Nomes em
inglês; a branch é do `revisor-codigo`.

```
 1. chore(claude): drop vendored skill scripts from the Biome scope
 2. style: apply Biome formatting across the workspace
 3. fix(app): remove the orphan module and clear its lint errors
 4. fix(api): drop the dead customerId extraction in the Stripe webhook
 5. fix(packages): clear the remaining Biome diagnostics
 6. chore: run Biome from the pinned local binary
 7. chore(api): run the test suite in the node environment
 8. test(web): cover the SEO base url and locale metadata
 9. chore(packages): fix the broken typecheck scripts
10. chore: declare the missing workspace dependencies
11. fix(payments): build the Stripe client lazily so it works without a key
12. chore: add lint and typecheck to the turbo task graph
13. ci: verify lint, types and tests on every pull request
14. docs: document the CI pipeline and the branch protection runbook
15. docs(features): ci-pipeline
```

O commit 11 é a **única** mudança de código de produção do corte (decisão Q5) — isolado de propósito, para
ser revisável e revertível sozinho.

Sugestão de branch (**quem decide é o `revisor-codigo`**): `ci/feat/github-actions-pipeline`. A branch
atual é `gaborone` — não é protegida, mas não segue `<project>/<type>/<title>`.

---

## 8. Testes e validação

### 8.1 Testes a criar

| Arquivo | Cobre | Prova de que é load-bearing |
|---------|-------|------------------------------|
| `apps/web/__tests__/seo.test.ts` | `getWebBaseUrl` (3 níveis de precedência + normalização de origem) e `buildLocaleMetadata` (3 locales + `x-default`, canonical, fallback `en_US`) | inverter a precedência ou remover o `x-default` tem de derrubar o teste |
| `apps/web/__tests__/sitemap.test.ts` *(opcional)* | 5 rotas × 3 locales = 15 entradas, sem duplicata, todas absolutas | remover um locale derruba a contagem |

Nenhum teste novo em `apps/api`/`apps/app`: o P2 **preserva** os 107 existentes (medido) e o P0 só toca
formatação e código morto.

### 8.2 Validação executável do próprio pipeline

Um pipeline se prova com uma PR que **falha**. Sequência mínima, em branch descartável:

1. PR com erro de **lint** deliberado (ex.: `console.log`) → 🔴.
2. PR com erro de **tipo** deliberado → 🔴.
3. PR com **teste quebrado** → 🔴.
4. PR removendo uma chave de **um só idioma** em `packages/internationalization` → 🔴 pelo teste de
   paridade (`__tests__/parity.test.ts`) — este é o cenário nomeado no sinal de pronto `:100-101`.
5. Reverter tudo → 🟢, e conferir que a **2ª execução** aproveita o cache do turbo.

### 8.3 Validação visual — obrigatória, apesar de não haver UI nova

O P0.b aplica formatação automática em `apps/app`, `apps/web` e `packages/design-system`. Formatação não
deveria mudar comportamento, mas *"não deveria"* não é evidência (regra de ouro 11 +
`docs/review-checklist.md:143-156`). Com `agent-browser`, **em sequência**:

- `apps/app`: login, lista de `entities`, criar/editar, área admin, impersonação — light, dark e mobile.
- `apps/web`: home, pricing, contact (submit), sign-in/sign-up, troca de idioma — light, dark e mobile.
- Screenshots antes/depois nos pontos onde o `pnpm fix` tocou mais (`language-switcher.tsx`,
  `sign-up.tsx`, `hookform*`, `cases-client.tsx`, `stats.tsx`).

---

## 9. Critérios de aceite (Checklist)

- [ ] **`pnpm check` sai limpo, com exit code 0**
  Depois do P0, `pnpm check` reporta `Found 0 errors. Found 0 warnings.` e retorna 0, partindo de 192/37
  medidos em `3089d71`. O gate de lint precisa nascer verde: um CI que falha no dia 1 com centenas de
  diagnósticos ensina o time a ignorar sinal, que é exatamente o risco que a spec registra em `:87-89`. A
  exclusão de `.claude/skills` responde por 81 dos 192 erros e precisa estar declarada no `biome.jsonc`
  com o mesmo formato das exclusões já existentes.

- [ ] **`pnpm check` roda sem acesso à rede e com versão presa ao lockfile**
  Com `npx ultracite@latest` substituído pelo binário local, `pnpm check` executa offline depois de um
  `pnpm install`, e a versão do Biome usada é a de `package.json` (2.3.1). Rodar o comando novo e o antigo
  no mesmo commit tem de produzir **exatamente** os mesmos contadores — foi assim que a equivalência foi
  medida (`Checked 391 files`, mesmos 192/37 antes do P0). Se divergirem em um único diagnóstico, a troca
  não pode ser feita.

- [ ] **Todo workspace com script `typecheck` passa**
  Nenhum script `typecheck` pode existir e falhar. Hoje três falham: `apps/email` (`TS18003`, sem nenhum
  `.ts` no workspace), `@repo/typescript-config` (sem `tsconfig.json`, escapando para o `tsconfig.json` da
  raiz e disparando 100+ `TS2307`) e `@repo/analytics` (3 erros em `server.ts`, módulo sem importador que
  depende de `posthog-node` não instalada). Cada um resolvido por remoção do script ou do código morto —
  não por `skipLibCheck`, `@ts-ignore` ou exclusão silenciosa, que esconderiam o defeito em vez de fechá-lo.

- [ ] **`typecheck` não depende de `build`**
  `turbo run typecheck` funciona num clone que nunca rodou `next build` — sem `.next/` e sem
  `next-env.d.ts`. Foi medido neste workspace, que está exatamente nesse estado e passa nos três apps. O
  `turbo.json` não pode declarar `dependsOn: ["^build"]` em `typecheck`: transformaria um gate de segundos
  num gate de minutos e traria junto a exigência de segredo do build. Se algum workspace precisar de tipos
  gerados, isso vira exceção declarada, não regra geral.

- [ ] **`turbo run lint typecheck test` é verde e cacheável**
  A execução completa termina em 0 e a **segunda** execução consecutiva, sem mudar arquivo, reporta
  `FULL TURBO` para as três tasks. `lint` e `typecheck` declaram `outputs: []` — sem isso o turbo pode
  tentar restaurar artefato que não existe. A baseline de cache já medida para `test` é 29,8 s a frio e
  387 ms quente; as tasks novas têm de se comportar igual.

- [ ] **`apps/web` deixa de ser o app não verificado**
  `apps/web` passa a ter script `test`, `vitest.config.mts` e ao menos um arquivo em `__tests__/`, e
  `pnpm test` na raiz passa a reportar **4 tasks** em vez de 3. O teste cobre `getWebBaseUrl`
  (`NEXT_PUBLIC_WEB_URL` → `VERCEL_PROJECT_PRODUCTION_URL` → `http://localhost:3001`, com barra final
  removida e `https://` acrescentado quando falta protocolo) e `buildLocaleMetadata` (exatamente `pt-br`,
  `en`, `es` e `x-default`; locale desconhecido cai em `en_US`). Prova de que não é teatro: inverter a
  precedência das duas envs ou remover o `x-default` **tem** que derrubar a suíte. `vitest` fica declarado
  em `devDependencies` do próprio `apps/web` — herdar por hoisting é o defeito que o critério seguinte
  corrige na api.

- [ ] **`apps/api` roda no ambiente correto e sem dependência fantasma**
  `apps/api/vitest.config.mts` passa a `environment: "node"` e os 107 testes seguem verdes — medido: 2,56 s
  contra 6,14 s, com o setup de ambiente caindo de 25,91 s para 3 ms. Nenhum teste da api usa
  `document`/`window`/`@testing-library` (as ocorrências de "document" são a palavra "documento" em
  descrições sobre o Firestore). `jsdom` e `@vitejs/plugin-react` deixam de ser exigidos por um app de
  servidor que nunca os declarou — hoje `jsdom` só resolve por hoisting do `apps/app`.

- [ ] **As tasks do CI rodam herméticas em relação à env**
  `turbo run lint typecheck test --env-mode=strict` termina verde com `env: []` declarado nas três. Isso
  já foi medido para `test` (244/244 com zero env). O objetivo é fechar a armadilha da prática 1 da nota
  de pesquisa — env não declarada gerando cache-hit com valor errado — nas tasks que o CI executa.
  `envMode` global permanece `loose` (rota A); `build` fica intocado.

- [ ] **`globalDependencies` hasheia o `.env` que o Next realmente carrega**
  `turbo.json` passa a declarar `["**/.env.*local", "**/.env"]`. Hoje só o primeiro padrão está lá, mas o
  log do build confirma `- Environments: .env` — ou seja, o Next lê `apps/<app>/.env` e o turbo não hasheia
  esse arquivo, então mudar uma variável local **não** invalida o cache. Prova: alterar um valor em
  `apps/api/.env` e confirmar que a task seguinte sai de `FULL TURBO`.

- [ ] **`turbo run build` deixa de falhar por falta de chave da Stripe**
  Num ambiente sem `STRIPE_SECRET_KEY`, o build de `apps/api` não pode mais morrer em
  `Neither apiKey nor config.authenticator provided` durante o *collect page data* de `/webhooks/payments`.
  O cliente Stripe passa a ser construído sob demanda — ou a ser `null` sem chave — no padrão que
  `packages/security/index.ts:16-18` já usa com `ARCJET_KEY`. Prova: `turbo run build --filter=api --force`
  com a variável ausente avança **além** de `/webhooks/payments`. O build ainda vai parar depois, por
  exigir as três `FIREBASE_ADMIN_*` (`apps/api/env.ts:12-16`) — isso é esperado e é a razão de o `build`
  não entrar no CI. Verificar também que a rota de webhook continua funcionando **com** a chave presente:
  a correção não pode trocar um build quebrado por um webhook quebrado.

- [ ] **Uma PR com defeito fica vermelha, sem ninguém rodar nada à mão**
  Quatro PRs de prova, cada uma com um defeito único, resultam em verificação vermelha no GitHub: (a)
  `console.log` novo (o Biome trata como erro, `biome.jsonc:26-31`); (b) erro de tipo; (c) teste quebrado;
  (d) chave de tradução removida de **um só** idioma — este último tem de ser pego pelo teste de paridade
  `packages/internationalization/__tests__/parity.test.ts`, que é o cenário literal do sinal de pronto da
  spec. Revertidos os quatro, a verificação volta a verde.

- [ ] **Um clone limpo, sem nenhum segredo, roda o pipeline até o fim**
  Partindo de `git clone` + `pnpm install --frozen-lockfile`, sem nenhum arquivo `.env` e sem nenhum secret
  configurado no GitHub, `pnpm turbo run lint typecheck test` termina em 0. É o sinal de pronto `:104`, e é
  ele que **mantém o `build` fora do corte** (decisão Q2): `api#build` exige as três `FIREBASE_ADMIN_*`
  como secret mesmo depois de o cliente Stripe ser corrigido, e "roda sem nenhum segredo" e "roda o build"
  não coexistem. O `.github/workflows/ci.yml` entregue **não pode conter nenhum `${{ secrets.* }}`** — essa
  é a forma verificável do critério. Quando o `build` entrar, numa rodada seguinte, este texto passa a ser
  "o pipeline **de PR** roda sem segredo".

- [ ] **O comando local e o do CI são o mesmo**
  Não existe verificação que só rode de um lado. O workflow chama `pnpm turbo run lint typecheck test`, e
  qualquer pessoa roda a mesma linha no terminal com o mesmo resultado. Em particular, o `lint` do CI não
  pode ser um `biome ci --changed` enquanto o local é `biome check ./` — isso reintroduz o
  "passa local, quebra no CI" que a prática 1 da nota de pesquisa nomeia como a dor a evitar.

- [ ] **Node e pnpm são fixados a partir dos arquivos do repositório**
  O workflow obtém a versão do Node de `.nvmrc` (`22.12.0`) via `node-version-file`, e a do pnpm do campo
  `packageManager` (`pnpm@10.19.0`) deixando `pnpm/action-setup` sem `version`. Nenhuma das duas é
  repetida como literal no YAML: uma segunda cópia diverge no primeiro bump e produz um CI que roda numa
  versão que ninguém usa. O cache do store do pnpm funciona — a segunda execução do workflow reporta
  cache-hit no passo de setup.

- [ ] **O cache do turbo não devolve resultado errado por dependência não declarada**
  `apps/web` declara `@repo/internationalization` e `@repo/shared` em `dependencies`. Hoje não declara,
  embora `apps/web/shared/lib/seo.ts` importe o primeiro e `apps/web/tsconfig.json:14-16` inclua três
  arquivos do segundo — então mudar esses pacotes **não** invalida `web#typecheck`/`web#test`. Prova:
  alterar um arquivo de `@repo/internationalization` e confirmar que as tasks do web saem de `FULL TURBO`
  na execução seguinte.

- [ ] **Nada de comportamento muda em runtime**
  O diff inteiro é formatação, código morto removido, configuração de ferramenta e arquivos novos de CI e
  de teste. Painel e landing são percorridos com `agent-browser` em light, dark e mobile — login, lista e
  formulário de `entities`, área admin, impersonação, home, pricing, contact e troca de idioma — com
  screenshots, porque o `pnpm fix` toca `apps/app`, `apps/web` e `packages/design-system`. Zero erro novo
  no console do navegador em relação ao estado anterior.

- [ ] **A configuração que não cabe no repositório fica escrita**
  Branch protection e required checks são configuração do GitHub, não arquivo versionado: um fork **não**
  os herda. O runbook (quais checks marcar como obrigatórios, em quais branches) fica em `docs/SETUP.md`.
  Sem isso, o CI apenas sinaliza, e a regra de nunca commitar em `main` continua garantida só pelo hook
  local `.claude/hooks/block-protected-branch-write.sh`, que não existe num clone sem o ferramental de IA.

---

## 10. Riscos e pontos de atenção

| Risco | Mitigação |
|-------|-----------|
| O commit de formatação do P0.b é enorme e polui o histórico | Commit **isolado**, só `biome check --write`, nenhuma edição manual junto. Fica trivialmente auditável e revertível. |
| `pnpm fix` apaga import momentaneamente sem uso | Comportamento já conhecido (`docs/review-checklist.md:31-32`). Como o P0.b não edita código à mão, o risco fica confinado ao P0.c. |
| Excluir `.claude/` do lint parece varrer sujeira para baixo do tapete | É código de terceiro, versionado só para a skill funcionar. A exclusão é declarada no `biome.jsonc`, junto das 9 que já existem pela mesma razão. |
| `apps/web` na suíte passa a gatear o build do web (`turbo.json:8`) | Suíte `node`, sem rede, sem DOM, determinística — o modelo do teste de paridade do i18n. |
| Um fork herda um CI que pode ficar vermelho | É o objetivo (spec `:87-89`). O que este plano acrescenta é **nascer verde**: sem o P0, o fork herda 192 erros no dia 1. |
| O runner grátis do GitHub Actions tem cota | Um job, `concurrency` com `cancel-in-progress`, `timeout-minutes: 15`. A execução completa hoje é ~1 min de trabalho útil. |
| `pnpm/action-setup` sem `version` depende de `packageManager` | É a fonte única desejada. Se a action reclamar, a alternativa é ler o campo num step, nunca duplicar o literal. |

---

## 11. Decisões tomadas

As sete perguntas levantadas pela investigação foram **decididas pelo usuário em 2026-08-31**, no `/analyze`.
As três primeiras vinham da spec (`:106-113`); as demais nasceram da medição. Ficam registradas aqui com o
que foi decidido e por quê — o blueprint acima **já reflete todas**.

| # | Pergunta | Decisão |
|---|----------|---------|
| Q1 | CI bloqueia merge ou só sinaliza? | **Bloquear + runbook** em `docs/SETUP.md` |
| Q2 | `build` entra no CI? | **Fora deste corte** — só `lint` + `typecheck` + `test`, zero secret |
| Q3 | Remote Cache / `actions/cache` do turbo? | **Não** — nem o Remote Cache, nem a contraproposta |
| Q4 | O que fazer com a baseline de lint? | **Zerar tudo nesta tarefa**, com as 4 ações de saneamento autorizadas |
| Q5 | Corrigir o build da API (Stripe)? | **Sim** — commit próprio em `packages/payments` |
| Q6 | Escopo do `typecheck`? | **3 pacotes**: `@repo/sdk`, `@repo/auth`, `@repo/internationalization` |
| Q7 | Rota do `envMode`? | **Rota A** — `loose` global + `env: []` nas tasks do CI |

### Q1 — Bloquear, e escrever o runbook

Required checks é configuração de repositório no GitHub: um fork clona o `.github/workflows/` mas **não**
herda a proteção de branch. Por isso o corte entrega **os dois** — o workflow versionado e o runbook em
`docs/SETUP.md` (quais checks marcar como obrigatórios, em quais branches). Sem o runbook, a regra de nunca
commitar em `main` continuaria garantida só por `.claude/hooks/block-protected-branch-write.sh`, que não
existe num clone sem o ferramental de IA. **Ligar a proteção neste repositório não faz parte da entrega** —
é ação humana no GitHub, que o runbook descreve.

### Q2 — `build` fica fora do CI neste corte

Mesmo com o Q5 aprovado (Stripe corrigido), `api#build` continua exigindo as três `FIREBASE_ADMIN_*`
(`apps/api/env.ts:12-16`, validação eager alcançada por `webhooks/payments/route.ts:6`). Incluir o `build`
obrigaria a configurar secrets e **contradiria o sinal de pronto `:104`** — "um clone limpo, sem nenhum
segredo configurado, consegue rodar o pipeline até o fim". Sem o `build`, esse sinal é alcançável hoje, e
foi o que a medição de `--env-mode=strict` sobre `test` provou (244/244 com zero env).

O Q5 continua valendo por mérito próprio: devolve `turbo run build` ao verde **localmente e na Vercel**,
onde ele efetivamente roda. O `build` entra no CI numa rodada seguinte, quando os secrets forem uma decisão
consciente — e aí o critério de aceite `:104` precisará ser reescrito como "o pipeline **de PR** roda sem
segredo".

### Q3 — Nem Remote Cache, nem `actions/cache`

A execução completa é ~1 min, dominada pelo `pnpm install` — que já é cacheado pelo `setup-node`. O ganho
não paga a complexidade agora. **A contraproposta do `actions/cache` sobre `node_modules/.cache/turbo`
também fica fora**: cache de CI que ninguém observa é fonte de "passou aqui, falhou lá" difícil de depurar.
Entra quando doer, com medição que justifique.

### Q4 — Zerar a baseline nesta tarefa (P0 completo)

Decidido: **corrigir tudo antes de ligar o gate**, na ordem excluir → auto-fix → manual, para que o CI
nasça verde. Foram **rejeitadas** as três alternativas que deixariam resíduo permanente — `--max-diagnostics`,
allowlist e `biome ci --changed` (lint só do diff) — porque as duas primeiras normalizam o vermelho e a
terceira quebra o sinal de pronto `:102-103` (mesmo comando local e no CI).

As quatro ações de saneamento estão **autorizadas**:

1. ✅ Excluir `.claude/skills` do escopo do Biome (§7.2 P0.a) — 192 → 111 erros.
2. ✅ Commit isolado de formatação em massa (§7.2 P0.b) — ~70 arquivos, só whitespace/ordenação.
3. ✅ Apagar `apps/app/midd_teste.ts` — órfão, sem exports nem importador.
4. ✅ Apagar `packages/analytics/server.ts` — código morto, não compila, depende de pacote não instalado.

Os ~29 erros manuais + 37 warnings de suppression **entram nesta tarefa** (P0.c), não viram tarefa própria.

> Fica também autorizada, por ser consequência direta e provada byte-idêntica, a troca de
> `npx ultracite@latest` pelo binário fixado no lockfile (§7.3 P1).

### Q5 — Corrigir o cliente Stripe, em commit próprio

`turbo run build` falha hoje sem env nenhuma envolvida: `packages/payments/index.ts:5` faz
`new Stripe(keys().STRIPE_SECRET_KEY || "", …)` em escopo de módulo, e o SDK rejeita string vazia durante o
*collect page data* de `/webhooks/payments` (§5). Decidido **corrigir**, aplicando o padrão que o repo já
tem ao lado e que a própria spec cita em `:92-94`: `packages/security/index.ts:16-18` faz no-op quando
`ARCJET_KEY` não existe.

Vira o **P10**, promovido de condicional a passo firme, em commit próprio de `packages/payments` — separado
de tudo, porque é a única mudança de código de produção do corte.

### Q6 — `typecheck` em três pacotes

Entram `@repo/sdk` (é o contrato entre front e API, merece gate próprio), `@repo/auth` e
`@repo/internationalization` — os três já têm `tsconfig.json`, então o custo é uma linha de script cada.
**`@repo/shared` fica fora**: é o único sem `tsconfig.json`, e criar um é trabalho de escopo próprio que
não paga dentro desta tarefa. Segue coberto transitivamente pelos apps.

### Q7 — Rota A para o `envMode`

Manter `envMode: "loose"` global e declarar `env: []` em `lint`, `typecheck` e `test` (§7.9). O turbo
aplica strict **por task** quando `env` está declarado, então as três tasks do CI ficam herméticas — e isso
está **medido verde** (244/244 com zero env). Risco zero.

Com o `build` fora do CI (Q2), a rota A cumpre o item 4 do corte para **tudo que o pipeline executa**. A
rota B (`strict` global + allowlist das ~25 envs do §6) fica registrada para quando o `build` entrar.

**Item correlato, aprovado junto:** `globalDependencies` passa de `["**/.env.*local"]` para
`["**/.env.*local", "**/.env"]`. Hoje o Next carrega `apps/<app>/.env` sozinho e o turbo **não hasheia esse
arquivo** — mudar o `.env` local não invalida o cache, que é a mesma classe de cache-hit-errado que a spec
ataca no env (§6.5).
