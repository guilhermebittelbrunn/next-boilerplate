# Handoff do `/develop`: core aprovado na parte 1 da entrega (fatia 1)

Os cinco itens do plano estão no working tree. Nada foi commitado e nenhuma branch foi criada. Há dois desvios
de forma e um de conteúdo (o `@grpc/grpc-js` virou exceção escrita), descritos em [Desvios](#desvios).

## Blueprint → arquivos

| Item | Arquivos | O que mudou |
|------|----------|-------------|
| 1. Dependências (§8) | 9 `package.json` com `next`; `apps/api` e `packages/auth` (`firebase-admin`); `packages/sdk` (`axios`); `packages/security` (`@arcjet/next`); `packages/payments` (toolkit removido); `apps/email`; `package.json` raiz; `pnpm-lock.yaml` | `next`, `@next/bundle-analyzer` e `@next/third-parties` 16.4.3 → 16.4.6; `firebase-admin` `^13.0.2` → `^13.10.0`; `axios` `^1.13.5` → `^1.21.1`; `@arcjet/next` `1.0.0-beta.13` → `1.16.0`; override do `zod` 4.1.12 → 4.6.7; `@react-email/preview-server` e `react-email` foram para `devDependencies`; `@stripe/agent-toolkit` saiu, com `packages/payments/ai.ts` e `__tests__/aiToolkit.test.ts`. A raiz ganhou o campo `"//"` com a justificativa de cada override e da exceção, e `pnpm.auditConfig.ignoreGhsas` com os dois GHSA da exceção |
| B1. Contrato do SDK | `packages/sdk/src/actions/auth/action.ts` | `AuthMePayload` fechado em `uid`, `type`, `email`, `preferences`, `onboarding`; `GoogleSignInResponse.user` passa a `AuthMePayload \| null`; `me()` perdeu o `as` |
| B2. `@repo/security` | `packages/security/index.ts`, `__tests__/rateLimit.test.ts` | `RateLimitBudget` (`strict` \| `standard`) e `RateLimitOptions`; `checkRateLimit(req, { budget, subject })` com `strict` como padrão (20/60 s, `["ip.src"]`) e `standard` (60/60 s, `["ip.src", "subject"]`, `protect(req, { subject })`) |
| B3. Proxy da API | `apps/api/proxy.ts`, `apps/api/(shared)/lib/rate-limit-subject.ts` (novo), `apps/api/instrumentation.ts`, `__tests__/corsOrigin.test.ts`, `__tests__/rateLimitSubject.test.ts` (novo), `__tests__/rateLimitDegraded.test.ts` (novo) | lista estrita de 21 caminhos (os 17 de antes + `/account/password`, `/account/password/set`, `/payments/checkout`, `/payments/portal`); todo `POST`/`PUT`/`PATCH`/`DELETE` fora dela cai no `standard`; `/webhooks/payments` isento; `rateLimitSubject` devolve os 32 primeiros hex do SHA-256 do `sub` do bearer, ou `"anonymous"`. O aviso de boot diz "Mutating routes accept unlimited requests." |
| B4. Allowlist | `apps/api/(shared)/mappers/user.mapper.ts` (`toSessionUser`), `auth/me/route.ts`, `auth/sign-in/route.ts`, `auth/sign-in/google/route.ts`; testes `userProfileSerialization`, `authMeRoute`, `authSignInRoute`, `authSignInGoogleRoute`, `mergedUserPayload` | as três rotas devolvem só as 5 chaves. `getMergedUserByUid` não mudou |
| B5. Revogação | `packages/auth/server.ts` (`revokeUserSessionsOrThrow`), `apps/api/(shared)/lib/session-revocation.ts` (novo), as 5 rotas; testes `serverSessionRevocation`, `accountPasswordRoute`, `accountPasswordSetRoute`, `authPasswordReset`, `authEmailChangeConfirm`, `accountAuditTrail` | ver tabela abaixo |
| B6. Front | `apps/app/shared/lib/apiErrorCode.ts` (novo), `invite/hooks/useInvitation.ts`, `invite/components/InvitationAcceptance.tsx`, `verify-email/components/ConfirmEmailChangeResult.tsx`, `lib/server/authSession.ts`, `shared/lib/googleSignInApi.ts`, `lib/server/panelSnapshot.ts`, `shared/lib/postLoginNavigation.ts`; testes `verifyEmailPage.test.tsx`, `accountApiErrorCopy.test.ts` | `AppSessionUser = AuthMePayload`; com `AUTH_SESSIONS_NOT_REVOKED` a tela de troca de e-mail mostra `changeEmail.success.title`, a cópia do `apiErrors` e o link "Entrar"; com outro código, o cartão de erro de antes |
| B7. `next-config` | `packages/next-config/index.ts`, `__tests__/config.test.ts` (novo) | `poweredByHeader: false` |
| B8. i18n | `packages/internationalization/translations/packages/shared/utils.ts` | `AUTH_SESSIONS_NOT_REVOKED` nos 3 idiomas, com a cópia da §6 do plano |
| B9. Docs | `docs/SECURITY.md`, `docs/delivery/01-security-review.md` (§1.8, §1.12, §1.14, §1.15), `docs/PAYMENTS.md`, `docs/SUBPROCESSORS.md`, `.claude/skills/payments-flow/SKILL.md`, `docs/PRE-PRODUCTION.md` (só o item 8) | `docs/ROPA.md:110` conferido e sem mudança: `/contact` continua no estrito, 20/min por IP |

Rotas com revogação visível:

| Rota | Revogação falha → | Auditoria |
|------|-------------------|-----------|
| `POST /account/password` | `500 AUTH_SESSIONS_NOT_REVOKED` | grava |
| `POST /account/password/set` | `500 AUTH_SESSIONS_NOT_REVOKED` | grava |
| `POST /auth/password/reset` | `500 AUTH_SESSIONS_NOT_REVOKED` (também quando `getUserByEmail` falha) | a rota não audita |
| `POST /auth/email-change/confirm` | `500 AUTH_SESSIONS_NOT_REVOKED`, nos dois caminhos (com e sem perfil) | grava |
| `POST /account/sessions/revoke` | `500 ACCOUNT_SESSIONS_REVOKE_FAILED` | não grava |

As cinco registram `[auth] session-revoke-failed requestId=…`, sem uid nem e-mail. `revokeUserSessions` mantém o
comportamento antigo (engole e loga) para os outros chamadores (expurgo LGPD, admin, desvincular método).

## Contrato e raio de impacto

- `AuthMePayload` mudou de forma. Consumidores no repo: `apps/app/lib/server/authSession.ts` (e por ele
  `panelSnapshot.ts`, `requireAdmin.ts`, `notFoundHome.ts`, `onboarding.ts`, `invite/page.tsx`, `layout.tsx`),
  `shared/lib/postLoginNavigation.ts` e `shared/lib/googleSignInApi.ts`. `type` passou a `UserType | null`, então
  duas chamadas ganharam `?? undefined` (`panelSnapshot.ts:34`, `postLoginNavigation.ts:72`). `apps/web` e
  `apps/e2e` não leem `/auth/me` (`grep -rn "auth/me\|authApi.me\|getAppSessionUser"` vazio nos dois).
- `checkRateLimit` ganhou um segundo parâmetro opcional. Chamado sem ele, o comportamento é o de antes.
- `apiErrorCodeOf` mudou de casa para `apps/app/shared/lib/apiErrorCode.ts`; único consumidor anterior,
  `InvitationAcceptance.tsx`, foi ajustado.

## Códigos de erro

`AUTH_SESSIONS_NOT_REVOKED` (novo, 500) está em `apiErrors` nos 3 idiomas e na lista `ACCOUNT_ERROR_CODES` de
`apps/app/__tests__/accountApiErrorCopy.test.ts`. `ACCOUNT_SESSIONS_REVOKE_FAILED` já existia nos 3 idiomas e
ganhou o primeiro emissor.

## Dependências: `pnpm audit --prod`

| Momento | Comando | Resultado |
|---------|---------|-----------|
| Antes | `pnpm audit --prod --audit-level=high` | saída 1; 8 críticas, 120 altas, 115 moderadas, 32 baixas |
| Depois das diretas | idem | saída 1; 2 críticas, 19 altas, 17 moderadas, 5 baixas |
| Depois de `pnpm update -r --depth Infinity jws lodash protobufjs @grpc/grpc-js form-data ws websocket-driver browserslist @fastify/busboy source-map-js` | `pnpm audit --prod --json` | 0 críticas, 1 alta (`@grpc/grpc-js` 1.9.16), 7 moderadas, 4 baixas |
| Final, com a exceção | `pnpm audit --prod --audit-level=high; echo $?` | saída 0; "4 low (1 ignored) \| 7 moderate \| 1 high (1 ignored)" |

O `pnpm update` não mexeu em nenhum `package.json` (conferido com `git diff -- '*package.json'` antes e depois).
`pnpm install --frozen-lockfile --offline` passa com o lockfile final. No lockfile não sobra `undici@5`,
`@arcjet/next@1.0.0-beta`, `@stripe/agent-toolkit`, `firebase-admin@13.6`, `axios@1.13`, `next@16.4.3`,
`zod@4.1.12` nem `connect-node@1` (`grep -c` = 0 para cada). `next@15.5.2` continua no lockfile, só pela
cadeia de dev do preview de e-mail.

O Arcjet 1.16 entrou sem plano B: `@repo/security` passou no `typecheck` depois de um ajuste de tipo (o
`protectWithBudget` aceita `Request | ArcjetNextRequest`) e nos testes.

## Desvios

- **`@grpc/grpc-js` virou exceção escrita, não override.** `firebase` → `@firebase/firestore` 4.8.0 declara
  `~1.9.0`, e o `@firebase/firestore` mais recente no registro declara o mesmo (`npm view @firebase/firestore@latest
  dependencies`). A correção é a 1.13.6, fora do til. Os dois avisos (GHSA-m9gg-hp2v-232j e GHSA-f596-whhp-79r4)
  são de servidor gRPC; aqui o `grpc-js` só é cliente, e só o build Node do SDK cliente do Firestore o carrega, que
  o repo usa apenas nos testes de emulador (`grep` de `firebase/firestore` e `firebase/storage` em `apps`/`packages`
  só acha `firestoreRules.emulator.test.ts` e `storageRules.emulator.test.ts`). Forçar 1.9 → 1.14 por override
  numa lib de transporte do Firestore era risco maior que o aviso. Justificativa e prazo de revisão (2027-05-19)
  estão no `"//"` da raiz.
- **`pnpm.auditConfig.ignoreGhsas` na raiz.** O plano pedia a exceção escrita; acrescentei o ignore nativo do pnpm
  para os dois GHSA, de modo que `pnpm audit --prod --audit-level=high` saia 0 e o comando da parte 1 sirva de gate.
  O `"//"` diz para remover os dois juntos.
- **Justificativa do override do `parse5`.** Não achei a origem no histórico (`git log -S'"parse5"'` só mostra os
  commits iniciais). O texto no `"//"` registra o que medi: `pnpm why parse5 -r` mostra `jsdom` (Vitest) e
  `cli-highlight` (firebase-tools), as duas cadeias de dev.
- **Helper `session-revocation.ts`.** O plano escrevia o `try/catch` + `logEvent` + resposta 500 inline em cada
  rota. Quatro rotas repetiriam o mesmo bloco, então ele virou `revokeSessionsOrReport` e
  `sessionsNotRevokedResponse`. A redefinição usa só a resposta, porque o `try` dela também cobre o
  `getUserByEmail`; `/account/sessions/revoke` responde outro código e ficou inline.
- **Teste do componente no arquivo existente.** O plano previa `confirmEmailChangeResult.test.tsx` novo; os casos
  foram para `apps/app/__tests__/verifyEmailPage.test.tsx`, que já monta `ConfirmEmailChangeResult` com os mocks
  necessários.
- **Teste antigo que mudou de expectativa.** `authPasswordReset.test.ts` tinha "still confirms when the sessions
  could not be revoked" (200). É exatamente o comportamento que a spec manda trocar; o caso agora espera
  `500 AUTH_SESSIONS_NOT_REVOKED`. Os casos de proxy que afirmavam "unlimited" para vizinhos e para o resto de
  `/account` e `/organization` passaram a afirmar o orçamento `standard`. Nenhum teste foi desligado.
- Teste extra fora da §9: `apps/api/__tests__/rateLimitDegraded.test.ts` importa o proxy com o `@repo/security`
  real e sem mock do Arcjet. Para chave ausente, vazia e malformada, 70 rodadas de `POST` em
  `/notifications/read-all` e `/auth/sign-in` (140 respostas) não trazem nenhum 429 e nenhuma chamada `fetch`
  para fora do processo. O Arcjet carrega o WebAssembly de uma URL `data:` no import; o teste deixa essa passar.

Nenhuma decisão do plano estava errada.

## Validação

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | "Checked 1075 files … No fixes applied", saída 0 |
| `pnpm turbo run typecheck --concurrency=4` | 14/14 tarefas, 0 em cache |
| `pnpm --filter @repo/internationalization test` (dentro do `turbo run test`) | 7 arquivos passaram, incluindo a paridade |
| `pnpm turbo run test --concurrency=2`, depois `--concurrency=1` | 11 tarefas verdes (`security` 3 arquivos, `shared` 5, `next-config` 2, `internationalization` 7, `payments` 3, `auth` 12, `email` 7, `sdk` 4, `design-system` 14, `analytics` 2). `api`: 126 arquivos e 1718 testes passaram, mas a tarefa sai 1 por dois "[vitest-pool]: Timeout starting forks runner" (load average entre 21 e 46 na máquina). Ver nota abaixo |
| `pnpm turbo run test --filter=app --filter=web --concurrency=1 --continue` | `app`: 1165 de 1173 testes passaram, 8 falharam; `web`: 208 de 210, 2 falharam. Os 10 falharam todos por tempo (entre 24970 e 25141 ms), com load average 137 |
| os 8 arquivos da `app` de novo, `npx vitest run <arquivos> --maxWorkers=1` | 8 arquivos, 104 testes passaram |
| os 2 arquivos da `web` de novo, idem | 2 arquivos, 22 testes passaram |

Os 10 casos que falharam por tempo estão em arquivos que esta entrega não tocou (`accountEmailChangeDialog`,
`accountSecurityForm`, `accountSignInMethodsPanel`, `authProviderLanguageSwitch`, `organizationMembersEnabled`,
`securityPolicySources` nas duas apps, `signInPersistedSessionRedirect`, `usersListArchiveLabels`, `docsUrlEnv`).

Nota sobre a `api`: as duas execuções completas terminaram com todos os arquivos verdes e só o erro de pool, que
é do runner do Vitest esperando um fork sob carga, não de asserção. Uma terceira execução com `--maxWorkers=2`
passou de 64 arquivos sem falha e foi interrompida pelo limite de tempo do shell. O `/review` deve rodar
`pnpm --filter api test` numa máquina sem carga para fechar o número com saída 0.

Rodados à parte, com `--maxWorkers` baixo: `rateLimitSubject` 13, `corsOrigin` 52, `corsOriginBoot` 8,
`rateLimitDegraded` 3, as 5 rotas de revogação + `accountAuditTrail` + `accountSessionsRoute` 104, as 5 de
allowlist 61; `verifyEmailPage` + `accountApiErrorCopy` 56; `@repo/security` 53.

Não rodei `test:emulator` nem `pnpm e2e` (JDK 21, emulador, browser). A spec exige os dois verdes depois das
subidas de `firebase-admin` e `next`.

## A verificar no `/test`

1. `curl -sI` em `:3000`, `:3001` e `:3002/health` sem linha `x-powered-by`, em `next dev` e num `build && start`.
   Só o valor da config está medido (`config.test.ts`).
2. `curl -s -H "Authorization: Bearer $ID_TOKEN" $API/auth/me | jq '.data | keys'` →
   `["email","onboarding","preferences","type","uid"]`; o mesmo no `user` de `POST /auth/sign-in`. Medido só com
   mock do merge.
3. Boot da API sem `ARCJET_KEY`: o aviso aparece uma vez com "Mutating routes accept unlimited requests." e 70
   `POST` autenticados numa rota mutável não dão 429. O teste de unidade cobre o proxy; o boot real não subi.
4. Com `ARCJET_KEY` real (🔒 sem ela): 429 a partir da 21ª em `/account/password`, a partir da 61ª em
   `POST /notifications/read-all` com o mesmo bearer, nunca em `/webhooks/payments`. O comportamento do Arcjet 1.16
   contra a API de decisão real não foi exercitado.
5. F1 a F3 do plano (§10) com a mutação temporária em `revokeUserSessionsOrThrow`: toast com a cópia nova na troca,
   na definição e na redefinição; cartão "E-mail alterado" com a cópia nova na confirmação de troca de e-mail;
   toast "Não foi possível encerrar as sessões" no "Sair de todos os dispositivos".
6. F4 e F5 do plano: pós-login aplica tema e idioma, admin cai em `/admin`, convite mostra o e-mail; CRUD de
   `entities`, upload de avatar (o `@google-cloud/storage` subiu junto com o `firebase-admin`), checkout sem Stripe
   e `pnpm --filter email dev` abrindo com o preview em `devDependencies`.
7. `test:emulator` e `pnpm e2e` verdes.

## Lacunas de teste conhecidas

- Nenhum teste prova que `rateLimitSubject` é chamado só no orçamento `standard` com bearer de sessão real (cookie
  de sessão encaminhado como bearer); os testes usam JWT montado à mão.
- O caso "70 POST sem 429" do `rateLimitDegraded` não pega uma chamada de rede feita por HTTP/2 (o
  `connect-node` 2 não usa `fetch`). O que garante a ausência de rede sem chave é `rateLimit.test.ts`, que afirma
  `arcjet` e `protect` nunca chamados.

## Para o `/review`

- `docs/PRE-PRODUCTION.md` já tinha um hunk da auditoria do backlog (linha ~967). O meu é só o item 8. Separar os
  dois exige `git add -p`.
- O plano de commits B10 continua valendo; o commit 1 (dependências) leva também o `"//"` e o
  `pnpm.auditConfig` da raiz.
