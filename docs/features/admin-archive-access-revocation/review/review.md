# Revisão: arquivar um usuário pelo admin tira o acesso dele

Revisão do working tree sobre `4eeb07b`, em 2026-10-19, dentro de uma rodada autônoma do `/cycle`. O código da
feature (`apps/api`, `packages/internationalization`, `docs/PAYMENTS.md`, `docs/INCIDENT-RESPONSE.md`) foi lido
por inteiro. A auditoria do backlog (`specs/*`, arquivamento de `contact-support-channel`, link em
`pricing-page-catalog/spec.md`) e os artefatos desta pasta entraram só para o plano de commits e a varredura de
segredo.

## Branch

- Atual: `guilhermebittelbrunn/cycle-v3`. Regex do repo: `BRANCH INVALIDA`. Sem upstream e sem commit além
  de `main` (`git log origin/main..HEAD` vazio).
- Proposta: `fix/admin-archive-access-revocation`. Regex: `branch OK`. Na rodada 1 a proposta era
  `api/fix/admin-archive-access-revocation`; a correção da rodada 2 pôs `apps/app` no diff, e com dois apps o
  padrão manda omitir o `project`.
- Nada foi criado nem renomeado: o `/cycle` não commita e o ambiente pede para não mexer na branch sem
  instrução do usuário. Como a branch não tem remoto nem commit de terceiro, o caminho na aprovação é
  `git branch -m fix/admin-archive-access-revocation` antes do primeiro `git add`.

## Revisão: `apps/api` + `apiErrors`

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/api/(shared)/lib/user-merge.ts:60-66`: se `revokeAccountAccess` falhar de forma persistente para uma
  conta arquivada antes da correção, a pessoa entra num laço de redirecionamento. A conta continua habilitada,
  então o proxy aceita o cookie (`apps/app/proxy.ts:241`), o `/auth/me` responde 401, o layout manda para
  `/sign-in` (`apps/app/lib/server/authSession.ts:34-39`) e o proxy devolve para a home porque a sessão é
  válida numa rota pública (`proxy.ts:251-266`). Antes da correção esse caminho criava um perfil novo e não
  tinha laço. A falha transitória se resolve sozinha, porque cada volta tenta desativar de novo. É a decisão D4
  do plano e só acontece quando o Admin SDK recusa o `updateUser`; nesse cenário o `DELETE` também falharia.
  Não corrigi: a saída mexe em `apps/app`, fora do corte. Vai para "Decisões em aberto".
- `apps/api/(shared)/lib/account-access.ts:19`: `revokeUserSessions` engole o próprio erro
  (`packages/auth/server.ts:330-336`). O `503 USERS_DELETE_AUTH_FAILED` cobre só a recusa do `updateUser`; uma
  revogação que falha passa em silêncio e o arquivamento segue. O bloqueio continua valendo pela checagem de
  `disabled` (`server.ts:184-186` para o bearer e `verifySessionCookie(…, true)` em `server.ts:305` para o
  cookie). O plano escreveu isso na §4.1 e a linha nova do `INCIDENT-RESPONSE.md` herda a ressalva da linha de
  cima. Sem ação.

### 🟢 Sugestão / nit

- Âncoras deslocadas pelo diff. Os dois imports novos em `users/[id]/route.ts` empurraram o resto do arquivo
  em duas linhas, e quatro docs fora desta pasta apontavam para ele. Corrigido (ver "Correções aplicadas").
- Âncoras de `specs/` que o mesmo diff desloca e que deixei como estão, porque `specs/` está no commit da
  auditoria, medido contra `4eeb07b`: `specs/account-security-mfa.md:241` (`utils.ts:96`, `:241`, `:387`, que
  passam a `:98`, `:245`, `:393`), `specs/account-security-mfa.md:323` (`route.ts:151-153` passa a `:153-155`),
  `specs/observability-logging.md:65` (`route.ts:194` passa a `:196`) e as âncoras do achado em
  `specs/BACKLOG.md:1543`. Ficam para o próximo `/spec --sync`, que fecha esse achado de qualquer forma.
- `user.repository.ts:70-80` e `:49-64`: o primeiro login de uma conta nova agora faz duas consultas em
  `reference_id` (`findByReferenceId` e `hasArchivedProfile`). Uma consulta só, filtrando em memória, resolveria
  os dois casos, mas mudaria `findByReferenceId`, que tem outros cinco chamadores. O plano registrou o custo na
  §13. Sem ação.

### ✅ OK

- `DELETE /users/[id]` continua `export const DELETE = requireAdminApi<RouteIdParamsContext>(…)` com
  `resolveIdFromContext`. O guard recusa escrita sob impersonação antes do handler.
- Ordem conferida por leitura (`route.ts:177-233`): 404, 403 de auto-bloqueio, rótulo de auditoria, billing
  (`:194-204`), desativação e revogação (`:207-218`), soft delete (`:220`), auditoria (`:222-231`), 204. A
  recusa do billing sai antes de tocar no Auth. A recusa do Auth sai sem soft delete e sem evento de auditoria.
- Falha parcial "Auth ok, soft delete falha": `userRepository.delete` lança e a exceção sobe como antes. A conta
  fica desativada com o perfil vivo, e a nova tentativa pula o billing quando o webhook já gravou o
  cancelamento (`isLiveSubscription`, `route.ts:74`), repete o `updateUser` (idempotente) e arquiva. Quando o
  webhook ainda não chegou, a Stripe é chamada de novo; se ela recusar o cancelamento repetido, a rota responde
  `503 USERS_DELETE_BILLING_FAILED`. Isso vai para o `/test`.
- `auth/user-not-found` como sucesso (`account-access.ts:3-5`, `:13-17`): o `FirebaseAuthError` do Admin SDK
  expõe `code` com prefixo `auth/`, o mesmo valor que `user.repository.ts:398` já compara. A revogação é pulada
  nesse caso, e T4 cobre.
- `hasArchivedProfile` (`user.repository.ts:70-80`): uma igualdade em `reference_id` com `.select("deletedAt")`,
  o mesmo formato de `countLiveSubscriptionsByPrice` (`:272-283`) e `identifyByStripeCustomerIds` (`:337-341`).
  O índice automático de campo único atende, sem índice composto. Documento sem o campo `deletedAt` volta com
  `data()` vazio e conta como não arquivado.
- Nenhum outro caminho cria perfil para um uid existente. `createDefaultUserProfile` só é chamado em
  `user-merge.ts:69` e em `auth/sign-up/route.ts:55`, que usa o uid recém-criado por `createUser`; o e-mail de
  uma conta arquivada continua ocupado no Auth, então o cadastro falha antes. `userRepository.create` só aparece
  fora disso em `users/route.ts:74`, também com uid novo de `identitySignUp`. Guards (`admin.ts:45`,
  `common-panel.ts:45`, `:73`), impersonação (`auth-request-context.ts:71`) e troca de e-mail
  (`email-change/confirm/route.ts:83`) só leem. O webhook de pagamentos resolve o perfil por id ou customer e
  não cria. Os scripts `seed-emulator.mjs` e `create-dev-admin.mjs` são de dev e não passam pela API.
- Quem recebe o `null` novo: `/auth/me` (401 `AUTH_INVALID_TOKEN`), `/auth/sign-in` (404 `USERS_NOT_FOUND`),
  `/auth/sign-in/google` (404 novo, sem `session`), `GET /users/[id]` por uid (404).
  `getMergedUserByFirestoreDocId` só chega a `findOrCreateProfile` com o uid de um perfil vivo, porque `findById`
  ignora arquivado (`base.repository.ts:148-150`). `getMergedUserFromIdToken` não tem chamador fora do módulo.
- Erros no formato `{ error: { code } }` com `HTTP_STATUS`. `USERS_DELETE_AUTH_FAILED` aparece nos 3 idiomas
  (`utils.ts:34`, `:180`, `:327`), com o mesmo molde de frase do `USERS_DELETE_BILLING_FAILED`.
- Logs sem PII: `requestId` e `adminAuthErrorReason(error)`, que devolve só o código do provedor. T3 e M4
  conferem que a mensagem do provedor não vaza.
- Comentários: os três JSDoc novos e a linha acima do `try` no `DELETE` explicam o porquê e não citam o fluxo.
- Testes: os mocks nas bordas usam `vi.hoisted` antes do `await import`, com `vitest` importado. Os casos de erro
  (Auth recusa, Auth sem conta, billing recusa, auto-bloqueio, 404) estão cobertos, e a ordem
  `cancel → disable → revoke → delete` é verificada por array de chamadas. Os dois mocks antigos foram
  completados sem afrouxar asserção.
- `docs/PAYMENTS.md:259-262` e a linha nova de `docs/INCIDENT-RESPONSE.md:52` batem com o código: âncoras
  `route.ts:174`, `:208`, `:220` e `user-merge.ts:54-70` conferidas.

### 👁 Verificar no `/test`

Em ordem de risco.

1. Laço de redirecionamento da conta arquivada antes da correção (F3, sustenta o corte). Gravar `deletedAt`
   direto no perfil de uma conta habilitada com sessão aberta na app e abrir `/pt-br`. Contar os redirects HTTP
   e também os `window.location.replace` do efeito do `SignInForm` (`SignInForm.tsx:81-115`): o Firebase client
   ainda tem o usuário em cache e tenta `POST /api/auth/session` com o ID token antigo. Esperado: termina parado
   no login, `disabled: true` no emulador de Auth e nenhum perfil novo. Conferir que a rota de sessão responde
   401 para conta desativada; se `createSessionCookie` aceitar, o efeito navega e o laço volta pelo cliente.
2. Mesmo cenário com Google (F4). A conta legada habilitada passa pelo `signInWithPopup` no cliente, a API
   desativa e responde 404 `USERS_NOT_FOUND`. Medir se o usuário do Firebase client que sobra do popup dispara
   o mesmo efeito do item 1 e em que tela a pessoa termina. Esperado: toast de erro e login parado.
3. `hasArchivedProfile` contra o emulador de Firestore. Os testes usam Firestore falso. Repro: o próprio F3; se
   o Admin SDK exigir índice para o `where` + `select`, o `/auth/me` responde 500 em vez de 401.
4. Sessão aberta no momento do arquivamento (F2).
   `curl -i http://localhost:3002/auth/me -H 'Authorization: Bearer <token anterior>'` depois do `DELETE`, e o
   mesmo com o cookie de sessão. Esperado: 401 `AUTH_INVALID_TOKEN` nos dois e a contagem de perfis com aquele
   `reference_id` igual a 1.
5. Arquivamento pela tela (F1): `disabled: true` e `tokensValidAfterTime` avançado no emulador de Auth,
   `deletedAt` no perfil e evento `USER_DELETE` na trilha.
6. Defeito no código anterior (F0, no `4eeb07b`): arquivar, entrar de novo, contar perfis com o mesmo
   `reference_id` (esperado 2) e o status do `/auth/me` (esperado 200).
7. Segunda tentativa depois de `503 USERS_DELETE_AUTH_FAILED` com assinatura viva e webhook ainda não entregue:
   a Stripe recebe o cancelamento de uma assinatura já cancelada. Só mede com Stripe real; sem conta, fica 🔒.
8. Toast de `USERS_DELETE_AUTH_FAILED` no admin (F5). Sem harness para forçar a recusa do `updateUser` no
   emulador, fica coberto só pelo T3.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `docs/INCIDENT-RESPONSE.md:51` | âncoras do `PUT` de `route.ts:110`, `:144-149`, `:151-153` para `:112`, `:146-151`, `:153-155` |
| `docs/SECURITY.md:36` | âncoras do auto-bloqueio de `route.ts:43-45`, `:131-133`, `:184-186` para `:45-47`, `:133-135`, `:186-188` |
| `docs/BACKUP.md:94` | soft delete do `DELETE` de `route.ts:204` para `:220` |
| `docs/SUBPROCESSORS.md:35` | chamada à Stripe no arquivamento de `route.ts:76` para `:78` |

Nenhuma correção em código. Os quatro arquivos entram no commit de docs.

## Raio de impacto

- Sem mudança em `packages/sdk`, `apps/app`, `apps/web` ou `packages/auth`.
- `DELETE /users/[id]` ganha `503 USERS_DELETE_AUTH_FAILED`. Consumidor: `apiClient.user.delete` via
  `useUserCrud.tsx` no admin, que já traduz `error.code`.
- `POST /auth/sign-in/google` passa de 200 com `user: null` para 404 sem `session`. Consumidor:
  `apps/app/shared/lib/googleSignInApi.ts`, que trata a resposta de erro como exceção, usado em `SignInForm.tsx`
  e `SignUpFormClient.tsx`.
- `getMergedUserByUid` devolve `null` para uid com perfil arquivado: `/auth/me`, `/auth/sign-in`, Google e
  `GET /users/[id]` por uid. Neste último, o admin abrir o uid de uma conta arquivada desativa a conta (§13 do
  plano); antes, a mesma chamada criava um perfil.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Nenhum teste de emulador para desativação, revogação e consulta nova | continua aberta. A §6 do checklist aceita emulador quando a infra é o objeto; aqui o `/test` mede no emulador (itens 3 a 5) e decide se vale um teste permanente |
| Laço da §6.2 sem teste automatizado | continua aberta. Depende do proxy da app e do cookie reais; o item 1 mede |
| Nova: revogação que falha depois de desativar não tem caso no `DELETE` | aberta. Barato em unidade (`revokeUserSessionsMock` rejeitando não muda nada porque o real engole); só faria sentido testar contra o helper real de `@repo/auth`, que já tem `serverSessionRevocation.test.ts`. Sugiro não cobrir |

## Decisões em aberto

1. Branch: renomear `guilhermebittelbrunn/cycle-v3` para `fix/admin-archive-access-revocation` com
   `git branch -m`, antes do primeiro commit. Recomendação: renomear (sem remoto, sem commit de terceiro).
2. Laço quando o lockout no primeiro contato falha de forma persistente (🟡 acima). Adotada a opção (b) na
   rodada 2: virou achado 🟡 em `specs/BACKLOG.md`, na seção da tarefa, sem mexer nesta entrega.

## Gates (rodada 1)

Não rodei de novo: minhas correções da rodada 1 são só em markdown, fora do escopo do Biome, do `tsc` e do
teste de paridade. Números do `/develop`:

| gate | resultado |
|------|-----------|
| `npx -y pnpm@10.19.0 check` | `Checked 932 files`, sem correções |
| `npx -y pnpm@10.19.0 --filter api typecheck` | exit 0 |
| `npx -y pnpm@10.19.0 --filter @repo/internationalization test` | 7 arquivos, 67 testes |

## Rodada 2: correção depois do `/test`

O `/test` reprovou CA8 (parte Google) e CA13: conta Google arquivada antes da correção, ao entrar pelo botão
"Continuar com Google", recebe o toast "Usuário não encontrado." e a tela de login fica no `FullScreenLoader`
até recarregar (30 s em `next dev`, 20 s em `next start`, três contas).

### Onde está a raiz

O fluxo do Google em `apps/app/shared/lib/googleSignInApi.ts` tem duas fases: `signInWithPopup` autentica o
Firebase client e só depois a API decide se aceita a conta. Quando a API recusava, nada desfazia a primeira
fase. O usuário ficava no Firebase client, o `SignInForm` mostra o loader enquanto há `user`
(`SignInForm.tsx:117-119`), o efeito dele recebe 401 do `/api/auth/session` e não navega (`:97-102`), e o
provider não desloga porque `AUTH_INVALID_TOKEN` não está em `sessionEndReasonFor`
(`packages/auth/provider.tsx:59-64`, `:291-303`).

A correção ficou na função que abre o estado pela metade, não no provider. O `AUTH_INVALID_TOKEN` do
`/api/auth/session` também sai de falha transitória: `mintSessionCookie` devolve `invalid-token` para qualquer
erro do `createSessionCookie` e para qualquer `null` do `verifyIdTokenClaims` (`packages/auth/session.ts:150-163`).
Deslogar no provider por esse código tiraria a sessão de quem só pegou uma instabilidade, na app e na web.

O mesmo vazamento não existe na entrada por e-mail e senha: ali o provider só autentica o Firebase client e
grava o cookie, e quem recusa o perfil é o `/auth/me` do layout, depois da navegação. O `/test` mediu que esse
caminho volta ao formulário (sem mensagem na primeira vez, achado registrado no backlog). O cadastro com Google
(`SignUpFormClient.tsx:47`) usa a mesma `signInWithGoogleViaApi`, então a correção cobre os dois botões.

### O que mudou

`apps/app/shared/lib/googleSignInApi.ts`: depois do popup, a troca pela sessão da API (validação do token
Google, `apiClient.authApi.signInWithGoogle`, `POST /api/auth/session`, cabeçalho de autorização) foi para
`exchangeForApiSession`. Uma falha ali chama `signOut(auth)` e relança o erro original. Se o próprio `signOut`
falhar, o erro dele é descartado para o toast continuar mostrando a recusa da API. Falha do popup não chama
`signOut`, porque não há usuário para desfazer.

Teste novo: `apps/app/__tests__/googleSignInApi.test.ts`, 5 casos com `firebase/auth`, `@repo/auth/client` e o
`apiClient` mockados: aceite sem `signOut`; recusa da API com `signOut` e o mesmo erro relançado; cookie recusado
com `signOut`; `signOut` que falha sem mascarar a recusa; popup que falha sem `signOut`.

Prova de reversão: com a linha do `signOut` trocada por `void auth;`, caem 2 de 5 (recusa da API e cookie
recusado). Restaurada a linha, 5 de 5.

O efeito na tela (formulário de volta, toast visível, sem loader) não foi medido aqui. Fica para o `/test`
remedir CA8 e CA13 com o mesmo repro.

### Gates (rodada 2)

| gate | resultado |
|------|-----------|
| `npx -y pnpm@10.19.0 check` | `Checked 934 files`, sem correções (a primeira passada apontou `noStaticOnlyClass` no mock e `noUselessUndefined` no `catch`; corrigidos) |
| `npx -y pnpm@10.19.0 --filter app typecheck` | exit 0 |
| `npx -y pnpm@10.19.0 --filter app exec vitest run __tests__/googleSignInApi.test.ts` | 1 arquivo, 5 testes |

A suíte inteira da `apps/app` não rodou aqui. Os testes que importam `googleSignInApi` (`signInEnterResubmit`,
`signInPersistedSessionRedirect`, `signUpFormApi`, `signUpFormSubmitLock`) mockam o módulo inteiro e não
dependem do corpo da função.

### Achados registrados no `specs/BACKLOG.md`

- Seção nova "Achados da tarefa `admin-archive-access-revocation` (2026-10-19)", com quatro linhas: o laço quando
  o lockout falha sempre (decisão 2), a primeira entrada por e-mail e senha de conta legada sem mensagem,
  `POST /auth/sign-in` de conta desativada respondendo 400 `AUTH_INVALID_CREDENTIALS` e o caso instável de
  `actionMenu.test.tsx:419`.
- A linha existente do contrato de erro de `POST /auth/sign-in/google` foi ampliada com a medição do `/test`
  (conta desativada recebe 401 `{ "error": "USER_DISABLED" }`) e teve as âncoras remedidas (`route.ts:11`, `:36`;
  `googleSignInApi.ts:55`).
- A linha "Detector de teste instável no CI" ganhou o terceiro caso local.

O aviso de hidratação na tela de usuários do admin em `next dev`, que o `/test` também listou, ficou de fora:
não houve pedido para registrá-lo e não há mudança de `apps/app` naquela tela.

## Varredura de segredo

`docs/features/admin-archive-access-revocation/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
`test/criterios-aceite.md`, `test/report.md`, este arquivo), `docs/features/contact-support-channel/spec.md`, o
diff de `specs/` e os dois testes novos: só aparecem endereços `@example.com` e identificadores `qa-archive-*`. O
relatório do `/test` diz que a senha da rodada viveu só em `/tmp` e não a transcreve. `test/e2e/` é descartado
pelo `.gitignore` (`.gitignore:300`). Nada a remover.

## Plano de commits

Antes do primeiro: `git branch -m fix/admin-archive-access-revocation` e `git diff --cached --stat` vazio.

1. `fix(api): disable the account and revoke its sessions when the admin archives a user`
   - `apps/api/(shared)/lib/account-access.ts`
   - `apps/api/app/(routes)/users/[id]/route.ts`
   - `apps/api/__tests__/usersAdminArchiveAccess.test.ts`
   - `apps/api/__tests__/usersAdminDeleteBilling.test.ts`
2. `fix(api): never recreate the profile of an archived account at sign-in`
   - `apps/api/(shared)/repositories/user.repository.ts`
   - `apps/api/(shared)/lib/user-merge.ts`
   - `apps/api/app/(routes)/auth/sign-in/google/route.ts`
   - `apps/api/__tests__/userRepositoryBilling.test.ts`
   - `apps/api/__tests__/userMergeArchivedProfile.test.ts`
   - `apps/api/__tests__/userArchivedProfile.emulator.test.ts`
   - `apps/api/__tests__/googleSignInProfile.test.ts`
3. `fix(app): sign the Google popup user out when the API refuses the account`
   - `apps/app/shared/lib/googleSignInApi.ts`
   - `apps/app/__tests__/googleSignInApi.test.ts`
4. `feat(internationalization): add USERS_DELETE_AUTH_FAILED copy`
   - `packages/internationalization/translations/packages/shared/utils.ts`
5. `docs: document the archive lockout and re-anchor shifted references`
   - `docs/PAYMENTS.md`
   - `docs/INCIDENT-RESPONSE.md`
   - `docs/SECURITY.md`
   - `docs/BACKUP.md`
   - `docs/SUBPROCESSORS.md`
6. `docs(specs): archive contact-support-channel and log the admin archive findings`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/magic-link-sign-in.md`
   - `specs/observability-logging.md`
   - `specs/one-time-purchase.md`
   - `specs/social-sign-in-providers.md`
   - `specs/contact-support-channel.md` (remoção: `git add -A specs/contact-support-channel.md`)
   - `docs/features/contact-support-channel/spec.md`
   - `docs/features/pricing-page-catalog/spec.md`
7. `docs(features): admin-archive-access-revocation`
   - `docs/features/admin-archive-access-revocation/STATE.md`
   - `docs/features/admin-archive-access-revocation/analyze/plan.md`
   - `docs/features/admin-archive-access-revocation/develop/handoff.md`
   - `docs/features/admin-archive-access-revocation/review/review.md`
   - `docs/features/admin-archive-access-revocation/test/criterios-aceite.md`
   - `docs/features/admin-archive-access-revocation/test/report.md`
   - (`test/e2e/` fica de fora pelo `.gitignore`)

O commit 6 junta a auditoria do backlog e os achados desta tarefa porque os dois mexem em `specs/BACKLOG.md`;
separar exigiria `git add -p`.

Título de PR sugerido: `fix: archiving a user takes their access away`.

Commits realizados: (preenchido pelo orquestrador)
