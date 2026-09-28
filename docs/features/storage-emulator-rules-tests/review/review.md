# Revisão: emulador de Storage e testes das security rules

Rodada autônoma do `/cycle`, 2026-09-28. A revisão leu o diff inteiro (32 arquivos modificados, 11 novos),
aplicou duas correções de documentação e rodou só os gates estáticos. Nada foi commitado nem preparado no
índice além do rename que já estava lá.

## Branch

- **Nome:** `feat/storage-emulator-rules-tests`, criada com `git switch -c` a partir do mesmo commit de
  `origin/main` (`e07252a`) depois que os commits foram aprovados. O working tree foi junto.
- **Por que sem `project`:** o diff cruza `packages/auth`, `apps/api`, `apps/app`, a raiz e o CI. Vários
  apps levam à forma `feat/<title>`.
- **Validação do nome:** regex de `.claude/rules/git-commits.md` → `branch OK: feat/storage-emulator-rules-tests`.
- `barcelona` continua existindo, intocada.

## Revisão: storage-emulator-rules-tests

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/SETUP.md:180-183`: "O `verify` leva cerca de um minuto" deixou de ser um número medido. O job passou a
  instalar o Temurin 21, subir as JVMs do Firestore e do Storage e, no primeiro run, baixar o JAR de rules
  do Storage, e ninguém mediu o tempo novo (o próprio handoff registra isso como R-4). Regra: documento não
  pode afirmar o que ninguém mediu (`.claude/cycle-policy.md` §4). **Corrigido:** o parágrafo agora diz o
  que o `verify` passou a fazer e mantém como comparação só o teto de 25 min do `e2e`, que está no `ci.yml`.

### 🟢 Sugestão / nit

- `apps/api/scripts/emulator-tests.mjs:68-76`: o script não repassa sinal ao filho. Se o `turbo` ou o
  terminal entregarem o SIGINT só ao processo do script, o `firebase emulators:exec` pode ficar órfão com
  as JVMs em 8080/9199. O `apps/e2e/playwright.config.ts:64-67` já registra que matar o grupo deixa o Java
  do Firestore de pé. Não mexi: repassar SIGINT às cegas pode entregar dois sinais ao `firebase-tools`, que
  no segundo encerra na hora, e isso só se decide medindo. Foi para a lista do `/test`.
- `CLAUDE.md:57`: a linha passava de 170 colunas no meio de um parágrafo quebrado em ~110. **Corrigido:**
  parágrafo requebrado, texto igual.
- `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` copiado por engano para a Vercel mostraria o seletor de
  arquivo e poria `http://<host>` no `img-src` de produção. O upload falharia com erro traduzido, sem
  vazamento. É o mesmo caso do R-5 do plano (nenhum host de emulador tem trava de boot em produção), que
  segue como sugestão de backlog fora do corte.

### ✅ OK

- **Isolamento do bucket real.** `storageEmulatorHost()` (`packages/auth/emulator.ts:43-44`) lê só
  `FIREBASE_STORAGE_EMULATOR_HOST`, com `||`, então string vazia vale ausência. É a mesma variável que o
  `firebase-admin` usa para preencher `STORAGE_EMULATOR_HOST`
  (`node_modules/.pnpm/firebase-admin@13.6.0/.../lib/storage/storage.js`, conferido no código instalado:
  ele só preenche quando `STORAGE_EMULATOR_HOST` está vazio). Com o host preenchido, `bucketName()`
  (`apps/api/(shared)/lib/storage.ts:39-42`) devolve sempre `DEMO_STORAGE_BUCKET`, e o `signReadUrl`
  (`:84-95`) não chama `getSignedUrl`, o que evita o `signBlob` no IAM do Google. Sem o host, a regra antiga
  (`bucket && !isEmulated()`) fica intacta. `isEmulated()` não passou a considerar o host de Storage.
- **Variante pública ignorada na API.** `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` e
  `STORAGE_EMULATOR_HOST` sozinhos deixam o Storage desligado. Há teste nos dois pacotes
  (`storageEmulatorHost.test.ts:43-53`, `storageEmulatorIsolation.test.ts:300-315`).
- **Todos os consumidores do bucket passam por `storage.ts`.** `git grep` por `FIREBASE_STORAGE_BUCKET` e
  `getStorageAdmin` fora de testes: só `storage.ts` monta o bucket; `files/route.ts`, `account-avatar.ts`,
  `entity-photo.ts`, `account-erasure.ts` e `account-export.ts` perguntam `isStorageConfigured()`.
- **CSP do `apps/app`.** `proxy.ts:47-49` e `:67` põem `http://<host>` só no `img-src`, e o teste confere
  que não chega ao `connect-src` (`securityPolicySources.test.ts:284-294`). As imagens que recebem a URL
  emulada usam `ResponsiveImage unoptimized` (`EntitiesListClient.tsx:64-70`, `image-upload-input.tsx:163-169`)
  ou o `<img>` do Radix (`ProfileDropdown.tsx:36`), então o `remotePatterns` do `next.config.ts` não entra.
  O `UsersListClient.tsx:71` usa `next/image` otimizado, mas com o `photoURL` do Firebase Auth, não com o
  avatar do Storage. A `apps/web` não renderiza avatar nem foto.
- **Env do `apps/app`.** `z.string().optional()` aceita `""`, e `isStorageEnabled()` e a CSP testam por
  truthiness. O `.env.example` pode publicar `VAR=""` sem derrubar a app.
- **Gate hermético.** `apps/api/vitest.config.mts:8` exclui `**/*.emulator.test.ts`. O `vitest.config.mts`
  da raiz (usado pelo `pnpm coverage`) só lista `apps/*/vitest.config.mts` e `packages/*/vitest.config.mts`,
  então o `vitest.emulator.config.mts` fica de fora. O `emulatorTestRun.test.ts`, que roda no gate
  hermético, importa o `.mjs` sem disparar o `main()`, porque o `process.argv[1]` do worker não é o script
  (`emulator-tests.mjs:105`). Nenhum outro workspace tem teste contra emulador.
- **Build sem Java.** `turbo.json:16-17` mantém `build.dependsOn = ["^build", "test"]`. Os três
  `vercel.json` não mudam o comando de build. `test:emulator` tem `cache: false` e depende do `test` da
  própria `apps/api`.
- **CI.** `actions/setup-java@v6` já estava no job `e2e` em `main` (`git show HEAD:.github/workflows/ci.yml:83`).
  A chave do cache dos JARs passou a incluir `firebase.json` nos dois jobs, e o `verify` roda
  `pnpm turbo run lint typecheck test test:emulator`.
- **Suíte emulada presa ao loopback.** O config zera credenciais, `STORAGE_EMULATOR_HOST`, hosts de Auth,
  project id e buckets, e liga `METADATA_SERVER_DETECTION=none`. O `setupFiles` recusa host fora de
  `127.0.0.1:<porta>`. Os testes de rules conferem o **código** do erro sobre sonda que existe, então uma
  regra aberta não passa por `not-found`. Cada arquivo limpa só o que gravou, por prefixo aleatório, e
  nenhum chama o reset total do emulador.
- **Comentários.** Nenhum cita o fluxo (`grep` por `plan.md`, `handoff`, `docs/features`, etapas: zero). Os
  que ficaram explicam restrição externa: a ausência de chave para assinar, a sonda do metadata server, o
  código do erro de Storage.
- **Corte da spec.** Os cinco itens do corte têm código e teste. Duas divergências estão registradas no
  plano e continuam valendo: o `apps/app` mudou (a spec dizia "nenhum código"; sem flag e CSP o avatar local
  não aparece) e o `build` não depende de `test:emulator` (a Vercel não tem Java).
- **Artefatos sem segredo.** Varredura por senha, token, chave e e-mail em `docs/features/storage-emulator-rules-tests/`,
  `docs/features/brand-config/{spec.md,analyze/plan.md}` e nas specs alteradas: só `user@example.com`,
  `hi@acme.com` como exemplo de formato e nomes de variável.

### 👁 Verificar no `/test`

Em ordem de risco. Os números entre parênteses são os do handoff, que ninguém mediu de novo.

1. **Mutação das rules quebra a suíte** (Firestore 90 falhas, Storage 13). É a afirmação que sustenta o
   corte. Repro: `export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"`; trocar `firestore.rules` para
   `allow read, write: if true`; `pnpm --filter api test:emulator` com os emuladores parados deve sair com
   exit 1; reverter; repetir com `storage.rules`; conferir `git diff firestore.rules storage.rules` vazio.
2. **Modo reaproveitado não suja nem apaga o seed.** O handoff mediu 0 objeto no bucket, mas disse que
   "sobraram documentos" da primeira mutação, antes do desvio 2. Repro: `pnpm emulators` + `pnpm seed`;
   contar documentos em `user` e `entity` pela REST do emulador; `pnpm --filter api test:emulator`; contar de
   novo. Esperado: mesmas contagens, nenhum `__rules_probe__*`, `created-*` nem coleção `rules-probe-*`, e
   `GET /storage/v1/b/demo-next-boilerplate.appspot.com/o` sem objeto sob `uploads/emu-*`.
3. **Recusa com o `pnpm emulators` antigo.** Repro: `pnpm exec firebase emulators:start --only auth,firestore --project demo-next-boilerplate`
   de pé; `pnpm --filter api test:emulator` → exit 1 com "must be either both running or both stopped".
4. **Limpeza de processo quando a execução é interrompida.** Achado desta revisão, sem medição. Repro: com
   as portas livres, `pnpm test` (modo `emulators:exec`), Ctrl-C durante os testes; depois
   `lsof -nP -i :8080 -i :9199 -i :4400 -i :4500 -i :9150` tem de sair vazio. Se sobrar Java, o script
   precisa repassar sinal ao filho.
5. **O `setupFiles` aborta com host fora do loopback** (escrito, nunca exercitado). Repro: trocar
   temporariamente o `loopback()` de `vitest.emulator.config.mts` para `localhost:${port}`, rodar com os
   emuladores de pé e esperar a falha no setup antes de qualquer teste; reverter.
6. **Fluxo visual sob o emulador** (§8 do plano, fluxos 1 a 6): seletor de avatar em `/account`,
   pré-visualização, `ProfileDropdown` com imagem de `127.0.0.1:9199`, nenhuma violação de CSP no console,
   miniatura da entidade, prefixo vazio depois do expurgo e 503 `STORAGE_NOT_CONFIGURED` sem o host.
   Light, dark, mobile e 3 idiomas. Precisa do bloco de emulador inline como `apps/e2e/support/stackEnv.ts`,
   porque os `.env` desta máquina apontam para um projeto real.
7. **`pnpm e2e`.** Confirmado lendo: `stackEnv.ts:42-55` não força vazio o
   `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST`, então a stack do e2e herda o valor do `.env.example` e o
   `ImageUploadInput` passa a aparecer em `/entities/create` e `/account`. O que falta medir é se o axe do
   `a11yDark.spec.ts` acha violação nova nesse campo.
8. **Zero conexão fora de `127.0.0.1` durante a suíte** (0 com `METADATA_SERVER_DETECTION=none`, 2 sem).
   Remedir só se sobrar tempo, com o mesmo hook de `net`/`dns` do handoff.
9. 🔒 **Job `verify` no GitHub**: Temurin 21, acerto do cache dos JARs e tempo total. Só observável na PR.

## Raio de impacto

| Símbolo | Consumidores | Efeito |
|---|---|---|
| `DEMO_STORAGE_BUCKET`, `storageEmulatorHost` (`@repo/auth/emulator`) | `apps/api/(shared)/lib/storage.ts`, `storageRules.emulator.test.ts`, `storageEmulatorHost.test.ts` | exports novos, nada existente muda |
| `isStorageConfigured()` | `files/route.ts:14`, `account-avatar.ts:35`, `entity-photo.ts:52`, `account-erasure.ts:57`, `account-export.ts:91` | com o host de Storage passa a ser `true`; sem ele, idêntico |
| `signReadUrl()` | upload, avatar da conta, foto de entidade | sob o emulador devolve URL `http://` sem assinatura; em produção, igual |
| `isStorageEnabled()` (`apps/app`) | `AccountProfileForm.tsx:36`, `EntityFormFields.tsx:48` | seletor de arquivo aparece com só o host do emulador |
| `img-src` (`apps/app/proxy.ts`) | toda página do `app` | ganha `http://<host>` só com a variável preenchida |
| `pnpm emulators`, `pnpm test` | dev local, `apps/e2e` (`playwright.config.ts:60`) | sobe também o Storage na 9199; `pnpm test` passa a exigir JDK 21 |

Contrato do `@repo/sdk`: nenhum DTO, action ou `error.code` mudou.

## Lacunas de teste

As três do handoff, com veredito:

- Nenhum teste do `apps/app` renderizando o seletor com só o host de emulador. **Continua aberta**, fora do
  corte: a cobertura é o unitário de `isStorageEnabled()` e o da CSP, e a prova visual é o item 6 acima.
- `signReadUrl` emulado não codifica o `path`. **Continua aberta, condicional**: hoje o
  `STORAGE_OBJECT_PATH_RE` (`storage.ts:26-27`) só deixa passar caracteres seguros. Vira lacuna real se a
  regex afrouxar.
- Objeto que não abre sem assinatura e expiração da URL V4. **Fora de escopo** desta entrega: exige bucket
  real, `docs/PRE-PRODUCTION.md` §6.

Nenhuma lacuna nova.

## Decisões em aberto

- As quatro perguntas do §14 do plano seguem com a opção adotada. Nada na revisão mudou a recomendação.
- `review` fica `in-progress` no `STATE.md`: a revisão termina antes dos commits, e quem marca `done` é
  quem commita.
- Repassar sinal no `emulator-tests.mjs` depende do item 4 do `/test`. Se sobrar Java, a recomendação é
  ignorar SIGINT no script (o terminal já entrega ao grupo) e repassar SIGTERM ao filho.

## Gates

| Gate | Resultado |
|---|---|
| `pnpm check` | 782 arquivos, 0 erro, sem fix aplicado |
| `pnpm turbo run typecheck --filter app --filter @repo/auth --filter api` | 3/3 ok (do cache, mesmo hash do handoff; as correções desta revisão foram só em markdown) |
| Paridade de i18n | não se aplica: nenhuma chave nova |
| Suíte Vitest e `test:emulator` | não rodados aqui (são do `/test`). Número do handoff: `pnpm test` com JDK 21, 13 tarefas, `api#test:emulator` 119 testes |

## Correções aplicadas

- `docs/SETUP.md:180-183`: sai "O `verify` leva cerca de um minuto", que ninguém mediu depois da mudança; entra
  o que o job passou a subir e o teto do `e2e`.
- `CLAUDE.md:54-60`: parágrafo requebrado na largura do resto do arquivo, texto igual.

## Plano de commits

O índice já tem o rename `specs/brand-config.md → docs/features/brand-config/spec.md`. Ele pertence ao
commit 1, então o `git diff --cached --stat` antes do primeiro commit mostra só essa linha, e isso é o
esperado. Depois de cada commit, conferir `git show --stat --oneline HEAD` contra a lista.

1. `docs(specs): archive brand-config and refresh the backlog after PR #30`
   - `docs/features/brand-config/spec.md` (rename já no índice + o conteúdo modificado, que precisa de `git add`)
   - `specs/brand-config.md` (lado removido do rename, já no índice)
   - `docs/features/brand-config/analyze/plan.md`
   - `specs/BACKLOG.md`
   - `specs/observability-logging.md`
   - `specs/teams-organizations.md`
2. `docs(specs): mark storage-emulator-rules-tests in progress`
   - `specs/storage-emulator-rules-tests.md`
3. `feat(auth): expose the storage emulator host and demo bucket`
   - `packages/auth/emulator.ts`
   - `packages/auth/__tests__/storageEmulatorHost.test.ts`
4. `feat(api): use the storage emulator when its host is set`
   - `apps/api/(shared)/lib/storage.ts`
   - `apps/api/__tests__/storageEmulatorIsolation.test.ts`
   - `apps/api/.env.example`
   - `apps/api/scripts/seed-emulator.mjs`
5. `test(api): run upload, erasure and security rules against the emulators`
   - `apps/api/vitest.config.mts`
   - `apps/api/vitest.emulator.config.mts`
   - `apps/api/scripts/emulator-tests.mjs`
   - `apps/api/__tests__/emulatorTestRun.test.ts`
   - `apps/api/__tests__/emulatorGuard.emulator-setup.ts`
   - `apps/api/__tests__/storageUpload.emulator.test.ts`
   - `apps/api/__tests__/accountErasureStorage.emulator.test.ts`
   - `apps/api/__tests__/firestoreRules.emulator.test.ts`
   - `apps/api/__tests__/storageRules.emulator.test.ts`
   - `apps/api/package.json`
   - `pnpm-lock.yaml`
6. `feat(app): allow uploads and images from the storage emulator`
   - `apps/app/env.ts`
   - `apps/app/shared/lib/storageEnabled.ts`
   - `apps/app/proxy.ts`
   - `apps/app/.env.example`
   - `apps/app/__tests__/storageEnabled.test.ts`
   - `apps/app/__tests__/securityPolicySources.test.ts`
7. `chore: start the storage emulator and add the test:emulator task`
   - `firebase.json`
   - `package.json`
   - `turbo.json`
8. `ci: run the emulator suite in verify`
   - `.github/workflows/ci.yml`
9. `docs: document the storage emulator and the emulator test gate`
   - `CLAUDE.md`
   - `README.md`
   - `docs/SETUP.md`
   - `docs/AI-WORKFLOW.md`
   - `docs/TASK-PIPELINE.md`
   - `docs/review-checklist.md`
   - `docs/SECURITY.md`
   - `docs/PRE-PRODUCTION.md`
   - `.claude/skills/payments-flow/SKILL.md` (uma linha, o comando do gate; entra aqui para não abrir um
     commit `docs(claude)` só por ela)
10. `docs(features): storage-emulator-rules-tests`
    - `docs/features/storage-emulator-rules-tests/STATE.md`
    - `docs/features/storage-emulator-rules-tests/analyze/plan.md`
    - `docs/features/storage-emulator-rules-tests/develop/handoff.md`
    - `docs/features/storage-emulator-rules-tests/review/review.md`

Título de PR sugerido: `feat: storage emulator and security rules tests`.

Push, depois de todos os commits aprovados e só com confirmação: `git push -u origin feat/storage-emulator-rules-tests`.

### Commits realizados

(preenchido por quem commitar)
