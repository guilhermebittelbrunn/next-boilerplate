# Revisão: `ARCJET_KEY` malformada deixa de derrubar a API

Rodada autônoma do `/cycle`. Li o diff e o handoff, apliquei o `docs/review-checklist.md` e rodei só os gates
estáticos. Não subi app e não usei navegador. A suíte só rodou no fechamento, a pedido do orquestrador, do
cache do turbo e para contar testes (ver "Fechamento depois do `/test`").

## Branch

- Atual: `run-full-task-cycle-v3`. O regex do padrão recusa esse nome (`BRANCH INVALIDA`).
- Proposta: `security/fix/arcjet-key-lazy-validation`. O regex aceita (`branch OK`). O projeto é `security`
  porque a correção vive em `packages/security`; a `apps/api` só ganhou o ramo novo do aviso de boot.
- Não criei nem renomeei a branch: o `/cycle` não cria branch sem o usuário. A branch atual não tem upstream
  e não tem commit à frente de `origin/main` (as duas apontam para `1936369`), então o caminho na aprovação é
  `git branch -m security/fix/arcjet-key-lazy-validation`, sem criar outra.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/ROPA.md:142`: a seção 8 dizia que o tratamento pela Arcjet "existe só com `ARCJET_KEY` definida".
  Com este diff, uma chave definida e sem o prefixo desliga o limite na API, e nenhum dado vai para a Arcjet.
  Corrigido: a frase agora exige o prefixo `ajkey_` e diz o que acontece sem ele.
- Âncoras em `specs/` ficaram deslocadas por este diff, porque `instrumentation.ts` ganhou 23 linhas e
  `index.ts` perdeu 2. Não corrigi: `specs/` é da auditoria, e o `/spec --sync` que fecha o ciclo passa por
  esses arquivos. Lista exata em "Decisões em aberto".

### 🟢 Sugestão / nit

- `docs/FORKING.md:317`: "Na `web` a chave hoje só é validada no build" não era exato. O `env.ts` da web roda
  o schema estrito em qualquer avaliação, no build e em runtime. Reescrito para "só serve para essa validação".
- `docs/SECURITY.md:161`: a âncora do `logEvent` apontava para `apps/api/proxy.ts:67`, e a chamada está em
  `:70`. O erro é anterior a este diff, mas estava no mesmo trecho do documento. Corrigido.
- `packages/security/keys.ts:35-41`: o `preprocess` do schema estrito repete a regra de aparar e tratar vazio
  como ausência que `trimmedString`/`arcjetKeyState` (`:8-17`) já implementam. Se uma das duas cópias mudar, o
  schema do build e o leitor de runtime passam a discordar sobre o que é chave válida. Não apliquei: é
  duplicação, não defeito, e o schema estrito ficou fora do escopo por decisão do plano.
- `apps/app/.env.example:29` e `apps/web/.env.example:8` não dizem que um valor sem `ajkey_` derruba o build
  daquelas apps. Fora do diff; fica como sugestão.

### ✅ OK

- `packages/security/index.ts:30,40,84` leem a chave por chamada com `readArcjetKey()`, que não lança
  (`keys.ts:23-26`). Não sobrou leitura no topo do módulo, então importar o pacote com chave malformada não
  derruba o proxy da API.
- `keys()` continua estrito (`keys.ts:35-50`), agora com a constante `ARCJET_KEY_PREFIX` compartilhada.
  `apps/app/env.ts:8` e `apps/web/env.ts:8` seguem estendendo o mesmo schema.
- `apps/api/instrumentation.ts:41-43`: o `console.error` é uma string literal, sem interpolar o valor da
  chave. O teste em `corsOriginBoot.test.ts:92-109` confere que "invalida" não aparece nos argumentos.
- A afirmação de que o bloqueio de bot da landing nunca roda confere por leitura. O `createEnv` de
  `@t3-oss/env-core@0.13.8` devolve o `runtimeEnv` na linha 37 do `dist/src-Bb3GbGAa.js`
  (`if (skip) return runtimeEnv;`), antes do merge dos `extends` na linha 70. O `runtimeEnv` de
  `apps/web/env.ts:24-32` não declara `ARCJET_KEY`, então `env.ARCJET_KEY` em `apps/web/proxy.ts:63` é sempre
  `undefined`. O comentário de `apps/web/env.ts:10-12` já registrava esse efeito para as `NEXT_PUBLIC_*`.
- Âncoras que o diff escreveu, conferidas contra o código atual: `keys.ts:23-26` (`readArcjetKey`),
  `keys.ts:35-41` (schema estrito), `index.ts:37` e `:37-47` (`checkRateLimit` até `characteristics`),
  `index.ts:47` (`characteristics`), `index.ts:80` (`secure`), `instrumentation.ts:30-45`
  (`warnOnDisabledRateLimit`), `apps/web/env.ts:33` (`skipValidation`), `apps/web/proxy.ts:63` (guard) e
  `:68` (`secure(`), `apps/app/proxy.ts:138` (`secure(`), `apps/api/proxy.ts:147` (`checkRateLimit`). Todas
  batem.
- Comentários novos (`keys.ts:19-22`, `keys.ts:32-33`, `instrumentation.ts:25-29`) explicam o porquê e não
  citam artefato do fluxo, etapa nem card. Os comentários dentro dos `mockImplementation` dos testes seguem o
  padrão que o arquivo já usava para bloco vazio.
- Pacote genérico, sem domínio de produto; sem `console.log`; testes em `__tests__/` com imports explícitos
  de `vitest`.
- Corte: a tarefa nasceu de `specs/BACKLOG.md:640` e da recomendação em `:229-265`, sem spec própria. Os
  arquivos e o comportamento batem com o que o backlog listou em `:243-245`.

### 👁 Verificar no `/test`

Cada item traz o veredito do `/test` (`test/report.md:13-16`).

1. O `next build` de `apps/app` e de `apps/web` continua falhando com `ARCJET_KEY=invalida`. É a afirmação que
   sustenta manter o schema estrito, e o `PRE-PRODUCTION.md` §8 e o `SECURITY.md` a repetem. Repro:
   `cd apps/web && ARCJET_KEY=invalida npx next build` (e o mesmo em `apps/app`), esperando falha na coleta de
   páginas com `Invalid environment variables` e `path: [ 'ARCJET_KEY' ]`. Confira também se a mensagem bate
   com o texto do `PRE-PRODUCTION.md:579-581` ("Collecting page data").
   Veredito: ✅ confirmado. As duas apps saem com exit 1 em "Collecting page data", com a causa esperada, e o
   texto do `PRE-PRODUCTION.md` bate.
2. A API builda e responde com a chave malformada. `instrumentation.ts:1` passou a importar
   `@repo/security/keys` de forma estática, e o build não está no CI. Repro:
   `ARCJET_KEY=invalida pnpm --filter api build && pnpm --filter api start` (com as `FIREBASE_ADMIN_*` de dev),
   depois `curl -i localhost:3002/health` (espera `200`) e
   `curl -i -X POST localhost:3002/auth/sign-up -H 'content-type: application/json' -d '{}'` (espera `400
   VALIDATION_FAILED`). Não use `POST /auth/sign-in`: ele responde 500 por um defeito do próprio handler, que
   não tem `try` nem valida o corpo (`specs/BACKLOG.md:671`), e o 500 esconde se o import passou.
   Veredito: ✅ confirmado. Build com exit 0, `GET /health` com `200` e `POST /auth/sign-up {}` com `400`, 25
   vezes seguidas. A primeira versão deste repro usava `POST /auth/sign-in` e induzia a erro. O QA separou as
   causas: o 500 do `sign-in` traz `x-request-id` e os cabeçalhos que só o proxy aplica, então a requisição
   passou pelo proxy. Com o `index.ts` antigo e a mesma chave, as três rotas deram 500 sem `x-request-id`, com
   `Invalid environment variables` saindo do `middleware.js`.
3. No mesmo `start`, o boot mostra uma linha `console.error` com `does not start with "ajkey_"` e não mostra
   o valor da chave. Com `ARCJET_KEY=""`, mostra o `console.warn` antigo e nenhum `console.error`.
   Veredito: ✅ confirmado. `grep -c invalida` nos logs deu 0. Como o Node manda `warn` e `error` para o
   stderr, o método em si é provado pelo espião de `corsOriginBoot.test.ts`, não pelo log.
4. Chave válida contra a Arcjet de verdade fica 🔒 não verificado: exige credencial real.
   Veredito: 🔒, como previsto.

## Correções aplicadas

| arquivo | o que mudou |
|---|---|
| `docs/ROPA.md:142` | a seção 8 passa a exigir o prefixo `ajkey_` e diz que um valor sem ele desliga o limite na API |
| `docs/FORKING.md:317-318` | "só é validada no build" virou "só serve para essa validação", com a linha reembrulhada |
| `docs/SECURITY.md:161` | âncora do `logEvent`: `apps/api/proxy.ts:67` para `:70` |
| `docs/PRE-PRODUCTION.md:614-615` e `:622` | contagem da suíte de "2452 testes em 226 arquivos" para "2485 testes em 227 arquivos", com a frase de abertura dizendo que só essa linha foi remedida depois da PR #35 |

Nenhuma correção em código.

## Fechamento depois do `/test`

O `/test` terminou com 10 ✅, nenhum ❌ e 1 🔒, sem defeito de produção.

- O QA criou `apps/api/__tests__/proxyArcjetKey.test.ts`, com dois casos que rodam o `proxy` da API com o
  `@repo/security` real e a Arcjet substituída por mock: chave `invalida` deixa `/auth/sign-up` passar sem
  chamar a Arcjet, e chave `ajkey_test` com o orçamento esgotado responde `429 AUTH_RATE_LIMITED` com
  `Retry-After`. Revisei contra o checklist: o mock fica na borda (`@/env` e `@arcjet/next`), com `vi.hoisted`
  antes do `await import`; os imports de `vitest` são explícitos; o único comentário (`:51`) é o do bloco vazio
  e não cita o fluxo; o ambiente é restaurado com `vi.unstubAllEnvs()` e `vi.restoreAllMocks()`. O Biome não
  reclamou. O arquivo entra no commit 2.
- A contagem da suíte no `PRE-PRODUCTION.md` foi medida com `pnpm turbo run test`, sem `--force`: 13 tasks, as
  13 do cache. O cache é confiável aqui porque a `api` já reporta 79 arquivos e 1036 testes, ou seja, inclui o
  arquivo novo do QA (o handoff media 78 e 1034). Soma: 2485 testes em 227 arquivos (`api` 1036/79, `app`
  756/91, `@repo/email` 202/7, `@repo/auth` 112/9, `web` 82/13, `@repo/internationalization` 59/6,
  `@repo/security` 45/3, `@repo/design-system` 45/6, `@repo/shared` 44/4, `@repo/analytics` 34/2,
  `@repo/next-config` 32/1, `@repo/payments` 22/4, `e2e` 16/2). O `test:emulator` fica fora, como a linha do
  documento já dizia. A tabela de distribuição de 2026-09-25 logo abaixo não foi remedida.

## Raio de impacto

- `@repo/security` ganhou os exports `arcjetKeyState`, `readArcjetKey` e o tipo `ArcjetKeyState`. As
  assinaturas de `checkRateLimit`, `isRateLimitEnforced` e `secure` não mudaram.
- Consumidores de `index.ts`: `apps/api/proxy.ts:1`, `apps/app/proxy.ts:5`, `apps/web/proxy.ts:5` e os
  layouts `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:5` e `.../(admin)/admin/layout.tsx:5`.
  Os de `app` e `web` continuam atrás do guard `env.ARCJET_KEY`, e o `secure()` relê a mesma chave.
- Consumidores de `keys.ts`: `apps/app/env.ts:3`, `apps/web/env.ts:3` (usam `keys()`, que não mudou) e
  `apps/api/instrumentation.ts:1` (novo, usa `arcjetKeyState`).
- Os testes de `app`, `web` e do proxy da `api` substituem `@repo/security` com `vi.mock` e não dependem dos
  exports novos.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---|---|
| Nenhum teste percorre `apps/api/proxy.ts` com o `@repo/security` real e a chave malformada | fechada no `/test`: `apps/api/__tests__/proxyArcjetKey.test.ts` roda o `proxy` com o pacote real, e o HTTP contra o build de produção foi medido no item 2 |
| Nenhum teste automatizado prende o build de `app`/`web` falhando com chave errada | fora de escopo para teste automatizado: o build não está no CI e `keys.test.ts:47-51` protege a causa (o schema estrito). Medição manual no item 1 |

Nenhuma lacuna nova.

## Decisões em aberto

1. Branch: renomear `run-full-task-cycle-v3` para `security/fix/arcjet-key-lazy-validation` antes do primeiro
   commit. Recomendação: renomear com `git branch -m`, já que não há upstream nem commit próprio.
2. Âncoras de `specs/` que este diff deslocou. Recomendação: o `/spec --sync` do fim do ciclo corrige. No
   fechamento, as de `specs/observability-logging.md` já apareciam corrigidas no working tree.
   - `specs/observability-logging.md:56` e `:60`: `apps/api/instrumentation.ts:19` agora é `:20`.
   - `specs/observability-logging.md:81` e `:163`: `apps/api/instrumentation.ts:58-59` agora é `:76-77`.
   - `specs/observability-logging.md:123`: `apps/api/instrumentation.ts:35-56` agora é `:58-74`.
   - `specs/observability-logging.md:148` e `:241`, `specs/account-security-mfa.md:341`:
     `packages/security/index.ts:42-44` agora é `:41-43`.
   - `specs/BACKLOG.md:641`: o `throw` do `CORS_ORIGIN` em `instrumentation.ts:40-44` agora está em `:63-67`.
   - `specs/BACKLOG.md:657`: `isRateLimitEnforced` em `index.ts:32` agora está em `:30`.
   - `specs/BACKLOG.md:640` (o 🔴) fecha com esta tarefa.
3. O bloqueio de bot da landing que nunca roda (D8 do plano) segue como achado para o backlog, como o handoff
   pede. Não é decisão desta revisão.

## Gates

| gate | resultado |
|---|---|
| `pnpm turbo run typecheck --filter=@repo/security --filter=api --filter=app --filter=web` | 4 de 4 tasks ok (2 do cache) |
| `pnpm check` | 806 arquivos, nenhum erro, nenhuma correção (primeira passada) |
| `pnpm check`, no fechamento | 807 arquivos (o teste novo do QA entrou na conta), nenhum erro, nenhuma correção |
| `pnpm turbo run test`, só para a contagem do `PRE-PRODUCTION.md` | 13 de 13 tasks ok, todas do cache; 2485 testes em 227 arquivos |
| paridade de i18n | não se aplica: o diff não toca `@repo/internationalization` |

Varredura de segredo em `docs/features/arcjet-key-lazy-validation/` (incluindo `test/`) e no diff de `specs/`: nenhuma senha,
token, chave PEM ou e-mail real. As chaves citadas nos artefatos são de mentira (`ajkey_ok`, `ajkey_test`,
`ajkey_x`, `ajkey_qa`).

## Plano de commits

Antes do primeiro commit: `git branch -m security/fix/arcjet-key-lazy-validation` e
`git diff --cached --stat` vazio.

1. `fix(security): read ARCJET_KEY per call and treat a malformed key as absent`
   - `packages/security/keys.ts`
   - `packages/security/index.ts`
   - `packages/security/__tests__/keys.test.ts`
   - `packages/security/__tests__/rateLimit.test.ts`
2. `fix(api): log a boot error when ARCJET_KEY is malformed`
   - `apps/api/instrumentation.ts`
   - `apps/api/__tests__/corsOriginBoot.test.ts`
   - `apps/api/__tests__/proxyArcjetKey.test.ts`
   - `apps/api/.env.example`
3. `docs: describe the malformed ARCJET_KEY behavior and fix stale anchors`
   - `docs/SECURITY.md`
   - `docs/PRE-PRODUCTION.md`
   - `docs/FORKING.md`
   - `docs/ROPA.md`
   - `docs/SUBPROCESSORS.md`
4. `docs(specs): backlog audit after PR #35`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md` (apareceu modificado no working tree durante o fechamento, só com as
     âncoras da decisão 2 remedidas; não fui eu que editei)
5. `docs(features): arcjet-key-lazy-validation`
   - `docs/features/arcjet-key-lazy-validation/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
     `review/review.md`, `test/criterios-aceite.md`, `test/report.md`)

Título sugerido da PR: `fix(security): malformed ARCJET_KEY no longer takes down the API`.

## Commits realizados

(preenchido pelo orquestrador depois dos commits)
