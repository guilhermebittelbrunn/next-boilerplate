# Plano: arquivar um usuário pelo admin tira o acesso dele

Tarefa direta, sem spec. Origem: o achado 🟡 "O usuário arquivado pelo admin consegue entrar de novo, com um
perfil novo" (`specs/BACKLOG.md:1543`), que a auditoria de 2026-10-16 indicou como a próxima tarefa direta
(`specs/BACKLOG.md:276-300`). Plano feito em rodada autônoma do `/cycle`: as decisões tomadas sem perguntar
estão na §12, cada uma com a alternativa descartada, e a §11 traz as perguntas já com a opção adotada.

Referências `arquivo:linha` conferidas neste checkout (`4eeb07b`) em 2026-10-19.

## 0. Sumário do desenho

A correção fecha o defeito em dois pontos da `apps/api`, sem tocar em SDK, app ou web.

1. **No arquivamento.** `DELETE /users/[id]` passa a desativar a conta no Firebase Auth e revogar as sessões
   dela antes do soft delete. A ordem fica: cancelar a assinatura viva (como hoje) → desativar no Auth →
   revogar sessões → soft delete → evento de auditoria. Se a desativação falhar, a rota responde
   `503 USERS_DELETE_AUTH_FAILED` (código novo) e não arquiva, no mesmo molde do
   `USERS_DELETE_BILLING_FAILED`.
2. **No login.** `getMergedUserByUid` e `getMergedUserFromIdToken` deixam de criar perfil quando o uid já tem
   um perfil arquivado. Nesse caso devolvem `null` e, de passagem, desativam a conta no Auth e revogam as
   sessões. Isso cobre quem foi arquivado antes desta correção (conta ainda habilitada no Auth) e evita o laço
   de redirecionamento descrito na §6.2.

Os dois pontos usam o mesmo helper novo, `revokeAccountAccess(uid)`. `POST /auth/sign-in/google` ganha o
mesmo `404 USERS_NOT_FOUND` que `/auth/sign-in` já devolve quando não há usuário, em vez de responder 200
com `user: null` e uma sessão válida.

Sem env nova, sem índice, sem regra do Firestore e sem pré-requisito manual de infraestrutura.

## 1. Contexto

### 1.1 Problema, pela leitura do código

- `DELETE /users/[id]` (`apps/api/app/(routes)/users/[id]/route.ts:172-218`) lê o rótulo de auditoria,
  cancela a assinatura viva (`:192-202`) e chama `userRepository.delete(id)` (`:204`), que só grava
  `deletedAt` (`apps/api/(shared)/repositories/base.repository.ts:225-227`). A conta no Firebase Auth
  continua habilitada e as sessões continuam válidas.
- No próximo login, `getMergedUserByUid` (`apps/api/(shared)/lib/user-merge.ts:10-27`) procura o perfil com
  `findByReferenceId`, que filtra `deletedAt == null` (`user.repository.ts:49-64`). Não encontra e chama
  `createDefaultUserProfile` (`user-merge.ts:22-24`, `:48-57`), que grava um perfil `COMMON` novo com
  onboarding zerado. `getMergedUserFromIdToken` (`:29-46`) repete o padrão, mas não tem chamador hoje.
- Quem dispara isso: `GET /auth/me` (`auth/me/route.ts:19`), chamado pelo layout autenticado da app
  (`apps/app/lib/server/authSession.ts:23`, via `requireSession` em
  `apps/app/app/[locale]/(authenticated)/layout.tsx:14`) e pelo pós-login
  (`apps/app/shared/lib/postLoginNavigation.ts:69`); `POST /auth/sign-in` (`auth/sign-in/route.ts:45`);
  `POST /auth/sign-in/google` (`auth/sign-in/google/route.ts:16`); e o `GET /users/[id]` do admin quando o id
  é um uid (`users/[id]/route.ts:95-98`).
- Com o perfil novo, o guard comum passa a aceitar (`apps/api/app/(guards)/common-panel.ts:45-54`, `:73-82`).
  A sessão aberta nem precisa de login novo: `resolveApiActor` só confere a credencial no Firebase
  (`apps/api/(shared)/lib/resolve-api-actor.ts:57-87`) e não lê perfil; o próximo `/auth/me` recria o perfil.
- A confirmação que o admin vê promete o contrário: "O usuário sai da listagem e perde o acesso, mas o
  cadastro é preservado e o e-mail continua ocupado"
  (`packages/internationalization/translations/apps/app/pages/admin/users.ts:35`, com `:95` e `:153` em en e
  es). A direção da correção está escrita na tela, então não há pergunta de produto.

O achado diz "precisa de medição no emulador de Auth antes da correção". Essa medição é a primeira tarefa do
`/test` (§8, fluxo F0): o `/analyze` e o `/develop` não sobem processo para medir.

### 1.2 O padrão que já existe para bloquear

- `PUT /users/[id]` com `disabled: true` chama `updateUser(uid, { disabled })` e depois
  `revokeUserSessions(uid)` (`users/[id]/route.ts:139-153`), entregue por `disabled-account-revocation`.
- A conta desativada já é recusada nos dois transportes: o bearer em `getIdTokenSession`
  (`packages/auth/server.ts:184`) e o cookie em `getSessionFromCookie`, que verifica com revogação
  (`server.ts:305`). O guard responde `401 AUTH_INVALID_TOKEN`.
- O login pelo SDK do Firebase no navegador falha com `auth/user-disabled`, que já tem texto nos 3 idiomas
  (`packages/internationalization/translations/packages/auth/index.ts:16`, `:55`, `:96`).
- `revokeUserSessions` engole a própria falha (`packages/auth/server.ts:330-336`).

Então arquivar passa a reaproveitar exatamente o que desativar já faz, com a mesma garantia.

### 1.3 Objetivo e corte de MVP

- Arquivar desativa a conta no Auth e revoga as sessões antes do soft delete. Falha na desativação não
  arquiva e responde `error.code`, nunca 500.
- Nenhum caminho de login recria perfil para um uid que tem perfil arquivado, e a conta arquivada antes da
  correção é desativada no primeiro contato.
- `POST /auth/sign-in/google` não devolve sessão com `user: null`.

Fora do corte:

- **Restaurar usuário arquivado.** Não existe rota, botão nem método para isso: `findById` ignora perfil com
  `deletedAt` (`base.repository.ts:143-151`), então `PUT /users/[id]` responde 404 para ele, e a listagem usa
  `findAll`, que filtra `deletedAt == null` (`base.repository.ts:80-89`). Quem precisar restaurar faz à mão:
  limpar `deletedAt` no Firestore e reativar a conta no console do Firebase, nessa ordem (ao contrário, o
  login desativa a conta de novo, pela §5.3).
- **Uids que já ganharam um perfil novo pelo defeito.** Se a pessoa arquivada já voltou e ganhou um perfil
  `COMMON` vivo, `findByReferenceId` acha esse perfil e nada muda para ela. Revogar o acesso dela agora é
  decisão de produto (§11, P2). O admin pode arquivar de novo, e desta vez o arquivamento vale.
- O resto do contrato de `POST /auth/sign-in/google` (corpo sem Zod em `:10`, mensagem crua do provedor em
  `:28`). É outro achado do backlog (`specs/BACKLOG.md:1544`); aqui entra só o `if (!user)`.
- Script de backfill para as contas já arquivadas. A desativação no primeiro contato (§5.3) cobre o caso
  sem operação manual (§12, D3).
- Corrida de dois primeiros logins simultâneos criando dois perfis. Anterior à tarefa.

### 1.4 Apps impactados

| Área | Impacto |
|------|---------|
| `apps/api` | `DELETE /users/[id]`, `user-merge.ts`, `user.repository.ts` (método novo), helper novo `account-access.ts`, `auth/sign-in/google/route.ts` |
| `packages/internationalization` | `USERS_DELETE_AUTH_FAILED` em `apiErrors` nos 3 idiomas |
| `apps/app`, `apps/web`, `packages/sdk`, `packages/auth` | nenhum arquivo |
| docs | `docs/PAYMENTS.md:254-258` e uma linha nova em `docs/INCIDENT-RESPONSE.md` (§10.7) |

Área do painel: admin (quem arquiva) e comum (quem é arquivado; um admin também pode ser arquivado por outro
admin). Modo de produto (`subscription` × `simple`): indiferente, porque o login e o arquivamento são os
mesmos nos dois. Sem dependência de plano.

## 2. Dados (Firestore)

- Coleção `user`, sem campo novo. `deletedAt` já existe em todo documento criado pelo `BaseRepository`
  (`base.repository.ts:172`).
- Consulta nova: `where("reference_id", "==", uid)` com `select("deletedAt")`, e o filtro de arquivado em
  memória. Filtro de igualdade num campo só, servido pelo índice automático, no mesmo molde de
  `findByStripeCustomerId` (`user.repository.ts:66-82`). Um uid tem um perfil, raramente dois, então o filtro
  em memória custa nada.
- A consulta só roda quando `findByReferenceId` não acha perfil vivo, ou seja, no primeiro login de cada
  conta e no login de quem foi arquivado. O caminho comum não ganha leitura.
- Documento antigo sem `deletedAt`: `findByReferenceId` já não o encontra (a igualdade com `null` não casa
  campo ausente) e hoje ele seria recriado. `hasArchivedProfile` trata ausência como "não arquivado"
  (`deletedAt != null` é falso para `undefined`), então esse caso segue como está. O `backfill-instants`
  (`apps/api/scripts/backfill-instants.mjs:5-12`) já existe para estampar `deletedAt: null`.
- Regras do Firestore: N/A, a API usa o Admin SDK.

## 3. Contrato `@repo/sdk`

N/A. `apiClient.user.delete` continua recebendo 204 no sucesso; o erro novo chega como
`{ error: { code } }` e o hook do admin já o traduz
(`apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud.tsx:33`, `:133`).
`authApi.signInWithGoogle` já trata resposta de erro como exceção no cliente
(`apps/app/shared/lib/googleSignInApi.ts:36-44`).

## 4. API

### 4.1 Helper `revokeAccountAccess(uid)`, em `apps/api/(shared)/lib/account-access.ts` (novo)

- `getAuthInstance().updateUser(uid, { disabled: true })`, depois `revokeUserSessions(uid)`. Mesma ordem do
  `PUT` (`users/[id]/route.ts:148-153`): com a conta já desativada, nenhum token novo sai entre as duas
  chamadas.
- `auth/user-not-found` conta como feito: sem conta no Auth não há acesso a tirar. Os perfis nessa situação
  nem aparecem na listagem (`user.repository.ts:369-387`).
- Qualquer outra falha do `updateUser` sobe para quem chamou decidir. A falha da revogação continua engolida
  pelo `revokeUserSessions`, e o bloqueio segue valendo pela checagem de `disabled`.

### 4.2 `DELETE /users/[id]`

Guard `requireAdminApi<RouteIdParamsContext>`, sem mudança. Sob impersonação o guard já recusa escrita
(`admin.ts:65-71`). Ordem nova dentro do handler:

1. 404 `USERS_NOT_FOUND` e 403 `USERS_SELF_LOCKOUT_FORBIDDEN`, como hoje (`:177-186`).
2. Rótulo de auditoria lido antes de tudo (`:190`). O e-mail continua legível no Auth depois da desativação,
   mas a ordem atual fica.
3. Cancelamento da assinatura viva, como hoje (`:192-202`). Falha → 503 `USERS_DELETE_BILLING_FAILED` e nada
   muda no Auth.
4. **Novo:** `revokeAccountAccess(profile.reference_id)`. Falha → log
   `logEvent("auth", "admin-user-delete-auth-failed", { requestId, reason })`, com `reason` vindo de
   `adminAuthErrorReason` (`apps/api/(shared)/lib/toolkit-error-codes.ts:97-102`, só o código do provedor
   ou o nome do erro, nunca a mensagem), e resposta 503 `USERS_DELETE_AUTH_FAILED`. Sem soft delete e sem
   evento de auditoria.
5. Soft delete e `USER_DELETE`, como hoje (`:204-215`). 204.

Atomicidade, caso a caso:

| falha em | estado que fica | saída |
|----------|-----------------|-------|
| billing | nada mudou | admin tenta de novo (comportamento atual) |
| desativação no Auth, com assinatura já cancelada | assinatura cancelada, conta habilitada, perfil vivo | 503; o webhook grava `canceled` no perfil e a nova tentativa pula o billing (`isLiveSubscription` falso), como o plano de `i18n-hydration-admin-delete-billing` já previa para a falha do soft delete |
| desativação no Auth, sem assinatura | nada mudou | admin tenta de novo |
| revogação | conta desativada; sessões antigas recusadas pela checagem de `disabled` | segue e arquiva; só se perde a garantia em uma reativação manual futura |
| soft delete (Firestore fora) | conta desativada e revogada, perfil vivo na listagem com o switch "Desativado" | a exceção sobe como hoje; o admin tenta de novo e a desativação repetida é idempotente |

Desativar antes do billing foi descartado (§12, D2): a Stripe desligada com assinatura viva recusa sempre, e
cada tentativa deixaria a pessoa bloqueada sem arquivar.

### 4.3 `user-merge.ts`

Os dois `getMergedUser*` passam por um helper interno:

```ts
async function findOrCreateProfile(uid: string): Promise<UserDTO | null> {
    const profile = await userRepository.findByReferenceId(uid);
    if (profile) {
        return profile;
    }

    if (await userRepository.hasArchivedProfile(uid)) {
        await revokeAccountAccess(uid).catch((error: unknown) =>
            logEvent("auth", "archived-account-lockout-failed", {
                reason: adminAuthErrorReason(error),
            })
        );
        return null;
    }

    return createDefaultUserProfile(uid);
}
```

- `getMergedUserByUid` mantém o `getUser` primeiro (`:13-19`): conta inexistente no Auth continua `null`
  sem tocar no Firestore.
- Falha na desativação não muda a resposta: o perfil não é recriado e o chamador recebe `null`. O próximo
  `/auth/me` tenta de novo.
- `getMergedUserByFirestoreDocId` (`:59-67`) só chega aqui com o uid de um perfil vivo, porque `findById`
  ignora arquivado. Não muda.

O que cada chamador responde com o `null`, sem mudança de código neles:

| chamador | resposta |
|----------|----------|
| `GET /auth/me` (`auth/me/route.ts:21-23`) | 401 `AUTH_INVALID_TOKEN` |
| `POST /auth/sign-in` (`auth/sign-in/route.ts:47-52`) | 404 `USERS_NOT_FOUND`. Sem consumidor nas front-ends (`docs/SECURITY.md:11`). No segundo login a conta já está desativada e o Identity Toolkit recusa antes, com 400 `AUTH_INVALID_CREDENTIALS` |
| `GET /users/[id]` por uid (`users/[id]/route.ts:96-105`) | 404 `USERS_NOT_FOUND`, em vez de criar um perfil para o arquivado |

### 4.4 `POST /auth/sign-in/google`

Depois de `getMergedUserByUid` (`auth/sign-in/google/route.ts:16`), o mesmo bloco de `/auth/sign-in`
(`auth/sign-in/route.ts:47-52`): sem usuário, 404 `USERS_NOT_FOUND`, sem `session` no corpo. Hoje a rota
responde 200 com a sessão e `user: null` (`:18-25`). O resto do contrato da rota fica para o outro achado.

### 4.5 Erros

| `error.code` | status | quando |
|--------------|--------|--------|
| `USERS_NOT_FOUND` | 404 | sem mudança no `DELETE`; novo em `/auth/sign-in/google` quando não há perfil vivo |
| `USERS_SELF_LOCKOUT_FORBIDDEN` | 403 | sem mudança |
| `USERS_DELETE_BILLING_FAILED` | 503 | sem mudança |
| `USERS_DELETE_AUTH_FAILED` (novo) | 503 `HTTP_STATUS.SERVICE_UNAVAILABLE` | `updateUser` recusou a desativação por motivo que não é `auth/user-not-found` |
| `AUTH_INVALID_TOKEN` | 401 | `/auth/me` de conta arquivada; guards com credencial de conta desativada |

503 pelo mesmo motivo do billing: a operação pode ser repetida e nada foi arquivado.

## 5. Front-end

N/A em código. O comportamento observável muda em três lugares, sem diff:

- O admin vê o texto de `USERS_DELETE_AUTH_FAILED` no toast de erro do arquivamento, quando a desativação
  falhar (`useUserCrud.tsx:33`).
- Quem foi arquivado depois da correção tenta entrar e o SDK do Firebase recusa com `auth/user-disabled`:
  "Esta conta foi desativada." (`translations/packages/auth/index.ts:16`).
- Quem foi arquivado antes da correção entra no Firebase (conta ainda habilitada), o `/auth/me` desativa a
  conta e responde 401, e a pessoa termina na tela de login (§6.2).

## 6. Autorização e segurança

### 6.1 Camadas

- A regra entra só na API: `DELETE /users/[id]` e `user-merge.ts`. Os guards (`admin.ts:45-54`,
  `common-panel.ts:45-54`) já recusam uid sem perfil vivo, e o `resolveApiActor` já recusa conta desativada.
- Sessão aberta no momento do arquivamento: a desativação e a revogação derrubam o bearer
  (`server.ts:184`) e o cookie (`server.ts:305`) na requisição seguinte. Teste em unidade cobre a chamada
  (§7); o efeito no Firebase já é coberto por `packages/auth/__tests__/serverSessionRevocation.test.ts`
  (citado em `docs/INCIDENT-RESPONSE.md:51`).
- Impersonação: o admin que personifica não consegue arquivar (escrita recusada pelo guard). Personificar um
  usuário que outro admin arquivou falha no `resolveAuthRequestContext`, que procura o alvo com
  `findByReferenceId` (`auth-request-context.ts:71`). Sem mudança.
- Log sem PII: só `requestId` e `reason` com o código do provedor.

### 6.2 Por que a desativação no primeiro contato é necessária

Só recusar o perfil (sem desativar) deixaria a conta arquivada antes da correção num laço de
redirecionamento. A conta continua habilitada no Auth, então o cookie de sessão é válido: o proxy da app
aceita a sessão (`apps/app/proxy.ts:241`), o layout autenticado chama `/auth/me`, recebe 401 e redireciona
para o login (`authSession.ts:34-39`), e o proxy, vendo sessão válida numa rota pública, manda de volta para
a home (`proxy.ts:251-266`). Com a desativação, o mesmo `/auth/me` que responde 401 desativa a conta, o
proxy deixa de aceitar o cookie na volta (`getUserFromSessionCookie` verifica com revogação), e a tela de
login fica parada: o efeito do `SignInForm` tenta renovar o cookie, recebe 401 e não navega
(`apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx:81-110`). Se a desativação falhar
de forma transitória, cada volta do laço chama `/auth/me` de novo e tenta outra vez. O `/test` mede isso
(F3).

## 7. Testes (Vitest, todos de unidade com o Firebase mockado)

Nível: rota e helper com `vi.mock`, no padrão de `apps/api/__tests__/usersAdminDeleteBilling.test.ts:1-120`.
Nada aqui exige emulador: o objeto do teste é a ordem das chamadas e o que a rota responde, não a infra. A
consulta nova é de igualdade num campo só e não depende de índice composto.

### 7.1 `apps/api/__tests__/usersAdminArchiveAccess.test.ts` (novo)

Mocks iguais aos de `usersAdminDeleteBilling.test.ts`, com `updateUser` e `revokeUserSessions` que empurram
para o array `calls`.

| id | cenário | esperado |
|----|---------|----------|
| T1 | perfil sem assinatura | `updateUser(uid, { disabled: true })` e `revokeUserSessions(uid)` chamados com o `reference_id` do alvo; `calls` = `["disable", "revoke", "delete"]`; 204; `USER_DELETE` gravado |
| T2 | assinatura `active` | `calls` = `["cancel", "disable", "revoke", "delete"]` |
| T3 | `updateUser` lança `{ code: "auth/internal-error", message: "provider-detail" }` | 503 `USERS_DELETE_AUTH_FAILED`; `delete` e `recordAuditEvent` não chamados; log `admin-user-delete-auth-failed` com `{ requestId: "req-7", reason: "auth/internal-error" }`; nenhuma linha de log contém `provider-detail` |
| T4 | `updateUser` lança `{ code: "auth/user-not-found" }` | 204, `delete` chamado, `revokeUserSessions` não chamado |
| T5 | billing falha (Stripe desligada com assinatura viva) | 503 `USERS_DELETE_BILLING_FAILED`; `updateUser` não chamado |
| T6 | alvo é a própria conta | 403 `USERS_SELF_LOCKOUT_FORBIDDEN`; `updateUser` não chamado |
| T7 | perfil inexistente | 404 `USERS_NOT_FOUND`; `updateUser` não chamado |

### 7.2 `apps/api/__tests__/userMergeArchivedProfile.test.ts` (novo)

`user-merge.ts` real, com `user.repository`, `@repo/auth/server` e o log mockados.

| id | cenário | esperado |
|----|---------|----------|
| M1 | perfil vivo | devolve o merge; `hasArchivedProfile` e `create` não chamados |
| M2 | sem perfil vivo, com arquivado | `null`; `create` não chamado; `updateUser(uid, { disabled: true })` e `revokeUserSessions(uid)` chamados |
| M3 | sem perfil vivo e sem arquivado | cria `COMMON` e devolve o merge (primeiro login continua funcionando) |
| M4 | M2 com `updateUser` falhando | `null`, sem lançar; log `archived-account-lockout-failed` com o código do provedor |
| M5 | `getMergedUserFromIdToken` com token válido e perfil arquivado | `null`, `create` não chamado |
| M6 | `getUser` lança (conta inexistente no Auth) | `null`; nenhuma consulta ao repositório |

### 7.3 Suítes existentes que mudam

- `googleSignInProfile.test.ts`: acrescentar `hasArchivedProfile` ao mock do repositório (`:20-25`); sem ele
  o caso que cria perfil quebra. Caso novo G1: perfil arquivado → 404 `USERS_NOT_FOUND`, corpo sem
  `session`, `create` não chamado.
- `usersAdminDeleteBilling.test.ts`: o mock de `@repo/auth/server` (`:61-64`) ganha `revokeUserSessions`.
  As asserções de `calls` (`:168`) seguem valendo se o `updateUser` do mock não empurrar para o array.
- `mergedUserPayload.test.ts` (`:37-45`): acrescentar `hasArchivedProfile` (resolvendo `false`) se algum
  caso usar `findByReferenceId` resolvendo `null`. `usersRoute.test.ts` também usa o `user-merge` real;
  conferir pelo mesmo critério.
- `usersAdminAuditTrail.test.ts` já mocka `updateUser` e `revokeUserSessions` (`:62-66`); conferir que
  nenhuma asserção do `DELETE` contradiz as chamadas novas.

### 7.4 Prova de que os testes pegam o defeito

O `/develop` reverte, um de cada vez, a chamada a `revokeAccountAccess` no `DELETE` e o desvio de
`hasArchivedProfile` no `user-merge`, e registra no handoff quais testes caem (esperado: T1 a T4 no primeiro,
M2, M4, M5 e G1 no segundo).

Comandos: `pnpm --filter api test`, `pnpm --filter @repo/internationalization test` (paridade).

## 8. O que o `/test` vai ter de percorrer

A diff não muda UI, então não há matriz de tema, viewport ou idioma. A passada é de fluxo, contra o
emulador (`pnpm emulators` e `pnpm seed`, `package.json:14-15`), com contas de
QA identificáveis (`qa-archive-<n>@example.com`), listadas no relatório para limpeza.

- **F0, antes da correção (medição pedida pelo backlog):** no código de `4eeb07b`, arquivar uma conta pelo
  `DELETE`, entrar de novo e confirmar que o `/auth/me` responde 200 e que um segundo documento `user` com o
  mesmo `reference_id` nasceu. Registrar o número de documentos antes e depois.
- **F1, arquivamento com a correção:** arquivar pela tela do admin (`/pt-br/admin/users`, ação "Arquivar").
  Conferir no emulador que a conta ficou `disabled: true`, que `tokensValidAfterTime` avançou e que o perfil
  ganhou `deletedAt`.
- **F2, sessão aberta:** com a conta logada em outra janela, arquivar e repetir uma chamada da conta
  (`curl` com o bearer antigo em `/auth/me` ou numa rota do painel comum). Esperado: 401
  `AUTH_INVALID_TOKEN`; nenhum perfil novo.
- **F3, conta arquivada antes da correção:** gravar `deletedAt` direto no documento de uma conta habilitada
  no Auth (simula o legado) e entrar pela app. Esperado: a tela termina no login sem laço de
  redirecionamento (conferir o número de redirecionamentos no `agent-browser`), a conta fica
  `disabled: true` no emulador e nenhum perfil novo nasce. Um segundo login mostra "Esta conta foi
  desativada.".
- **F4, Google:** com o emulador de Auth, uma conta Google arquivada não recebe sessão de
  `POST /auth/sign-in/google` (404 `USERS_NOT_FOUND`) nem perfil novo.
- **F5, falha na desativação:** não dá para forçar o `updateUser` a falhar no emulador sem harness. Fica
  coberto por T3 e marcado como 🔒 na passada de browser.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **CA1. Arquivar desativa a conta e revoga as sessões antes do soft delete**
  O `DELETE /users/[id]` de um admin sobre outro usuário chama `updateUser(uid, { disabled: true })` e
  `revokeUserSessions(uid)` com o `reference_id` do perfil alvo, nessa ordem, antes de gravar `deletedAt`.
  Com assinatura viva, o cancelamento na Stripe vem antes de tudo. A resposta continua 204 sem corpo e o
  evento `USER_DELETE` é gravado uma vez.

- [ ] **CA2. Falha na desativação não arquiva e responde `USERS_DELETE_AUTH_FAILED`**
  Se o Firebase Auth recusar a desativação por qualquer motivo que não seja conta inexistente, a rota
  responde 503 com `{ error: { code: "USERS_DELETE_AUTH_FAILED" } }`, sem soft delete e sem evento de
  auditoria. O log registra só o `requestId` e o código do provedor, nunca a mensagem. O admin vê o texto
  traduzido do código nos 3 idiomas e pode tentar de novo; a segunda tentativa, com a Stripe já cancelada,
  não chama a Stripe outra vez depois que o webhook gravou o cancelamento.

- [ ] **CA3. Conta que não existe mais no Auth é arquivada normalmente**
  Quando `updateUser` responde `auth/user-not-found`, o arquivamento segue: soft delete, evento de
  auditoria e 204. Não há acesso a tirar de uma conta que não existe, e recusar deixaria um perfil órfão
  impossível de arquivar.

- [ ] **CA4. A ordem com o billing e com as recusas existentes é preservada**
  Com a Stripe desligada e assinatura viva, ou com o cancelamento falhando, a rota responde 503
  `USERS_DELETE_BILLING_FAILED` sem tocar no Auth. Arquivar a própria conta continua 403
  `USERS_SELF_LOCKOUT_FORBIDDEN` e perfil inexistente continua 404 `USERS_NOT_FOUND`, também sem tocar no
  Auth. O admin personificando alguém não consegue arquivar.

- [ ] **CA5. A sessão aberta de quem foi arquivado deixa de valer na hora**
  Uma conta logada no momento do arquivamento recebe 401 `AUTH_INVALID_TOKEN` na requisição seguinte, tanto
  com o bearer quanto com o cookie de sessão. O `/auth/me` dessa conta não cria perfil novo, e o número de
  documentos `user` com aquele `reference_id` continua um.

- [ ] **CA6. Nenhum caminho de login recria perfil para um uid arquivado**
  `getMergedUserByUid` e `getMergedUserFromIdToken` devolvem `null` quando o uid não tem perfil vivo e tem
  um arquivado, sem chamar `createDefaultUserProfile`. `/auth/me` responde 401 `AUTH_INVALID_TOKEN`,
  `/auth/sign-in` responde 404 `USERS_NOT_FOUND` e o `GET /users/[id]` do admin por uid responde 404. O
  primeiro login de uma conta sem perfil nenhum continua criando o perfil `COMMON`.

- [ ] **CA7. A conta arquivada antes da correção é desativada no primeiro contato**
  Para um perfil arquivado cuja conta segue habilitada no Auth, o primeiro `/auth/me` (ou login pela API)
  desativa a conta e revoga as sessões, além de responder como no CA6. Se essa desativação falhar, a
  resposta não muda, o perfil não é recriado, o erro vai para o log sem PII e a próxima chamada tenta de
  novo.

- [ ] **CA8. Entrar pela app com conta arquivada não gera laço de redirecionamento**
  A pessoa arquivada antes da correção que entra pela tela de login termina na própria tela de login, sem
  laço entre `/sign-in` e a home. Quem foi arquivado depois da correção nem passa do SDK do Firebase e vê
  "Esta conta foi desativada." (ou o equivalente em en e es).

- [ ] **CA9. Login com Google de conta arquivada não devolve sessão**
  `POST /auth/sign-in/google` para um uid sem perfil vivo responde 404 `USERS_NOT_FOUND`, sem `session` no
  corpo e sem perfil novo. O login com Google de uma conta nova continua criando o perfil e devolvendo a
  sessão; uma conta com perfil vivo continua sem ganhar um segundo perfil.

- [ ] **CA10. `USERS_DELETE_AUTH_FAILED` tem texto nos 3 idiomas**
  O código existe em `apiErrors` em pt-br, en e es, e o teste de paridade de
  `@repo/internationalization` passa. O texto diz que o usuário não foi arquivado e que dá para tentar de
  novo, sem detalhe técnico do provedor.

- [ ] **CA11. Antes × depois medido**
  No código anterior à correção, arquivar e entrar de novo cria um segundo documento `user` para o mesmo
  uid e o `/auth/me` responde 200 (F0). Depois da correção, o mesmo roteiro termina com a conta
  desativada, um documento só e 401. Os testes de unidade T1 a T4, M2, M4, M5 e G1 caem quando a correção
  é revertida.

## 10. Blueprint técnico

### 10.1 `apps/api/(shared)/lib/account-access.ts` (novo)

```ts
import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";

function isMissingAccount(error: unknown): boolean {
    return (error as { code?: unknown } | null)?.code === "auth/user-not-found";
}

/**
 * Disabled first, so no new token can be minted between the two calls. An account
 * already gone from Firebase Auth has no access left to take.
 */
export async function revokeAccountAccess(uid: string): Promise<void> {
    try {
        await getAuthInstance().updateUser(uid, { disabled: true });
    } catch (error) {
        if (isMissingAccount(error)) {
            return;
        }
        throw error;
    }
    await revokeUserSessions(uid);
}
```

### 10.2 `user.repository.ts`, método novo

```ts
/**
 * Equality on one field, so the automatic index serves it; the archived check runs in
 * memory because a uid maps to one profile, rarely two.
 */
async hasArchivedProfile(referenceId: string): Promise<boolean> {
    const snapshot = await this.db
        .collection(this.table)
        .where("reference_id", "==", referenceId)
        .select("deletedAt")
        .get();

    return snapshot.docs.some((docSnap) => docSnap.data().deletedAt != null);
}
```

### 10.3 `users/[id]/route.ts`, pseudo-diff do `DELETE`

```diff
+import { revokeAccountAccess } from "@/(shared)/lib/account-access";
+import { adminAuthErrorReason } from "@/(shared)/lib/toolkit-error-codes";
 ...
         if (!billing.ok) { ... USERS_DELETE_BILLING_FAILED ... }

+        try {
+            await revokeAccountAccess(profile.reference_id);
+        } catch (error) {
+            logEvent("auth", "admin-user-delete-auth-failed", {
+                requestId: requestIdFrom(req),
+                reason: adminAuthErrorReason(error),
+            });
+            return Response.json(
+                { error: { code: "USERS_DELETE_AUTH_FAILED" } },
+                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
+            );
+        }
+
         await userRepository.delete(id);
```

O comentário da função `cancelLiveSubscription` (`:63-67`) segue certo. Se o `/develop` achar que a ordem
billing → Auth precisa de explicação no código, ela cabe numa linha autocontida acima do `try` ("Billing
first: refusing it must leave the account untouched").

### 10.4 `user-merge.ts`, pseudo-diff

```diff
 export async function getMergedUserByUid(uid: string) {
     ...
-    let profile = await userRepository.findByReferenceId(uid);
-    if (!profile) {
-        profile = await createDefaultUserProfile(uid);
-    }
+    const profile = await findOrCreateProfile(uid);
+    if (!profile) {
+        return null;
+    }
     return mergeAuthAndFirestore(userRecord, profile);
 }
```

Mesmo diff em `getMergedUserFromIdToken` (`:39-45`). `findOrCreateProfile` como na §4.3, não exportado.

### 10.5 `auth/sign-in/google/route.ts`, pseudo-diff

```diff
         const user = await getMergedUserByUid(session.localId);
+
+        if (!user) {
+            return Response.json(
+                { error: { code: "USERS_NOT_FOUND" } },
+                { status: HTTP_STATUS.NOT_FOUND }
+            );
+        }
```

### 10.6 i18n, `packages/internationalization/translations/packages/shared/utils.ts`

Logo depois de `USERS_DELETE_BILLING_FAILED` (`:32`, `:176`, `:321`):

| idioma | texto |
|--------|-------|
| pt-br | "Não foi possível bloquear o acesso deste usuário, então ele não foi arquivado. Tente de novo em instantes." |
| en | "We couldn't block this user's access, so they were not archived. Try again in a moment." |
| es | "No pudimos bloquear el acceso de este usuario, así que no se archivó. Inténtalo de nuevo en unos instantes." |

Usar a skill `/i18n-sync` e rodar a paridade.

### 10.7 Documentação

- `docs/PAYMENTS.md:254-258`: acrescentar que, depois do cancelamento, o arquivamento desativa a conta no
  Auth, e que a falha dessa etapa responde 503 `USERS_DELETE_AUTH_FAILED` com a assinatura já cancelada.
- `docs/INCIDENT-RESPONSE.md`, tabela de contenção (`:51-52`): linha nova "O admin arquiva uma conta", com
  `DELETE /users/:id`, a desativação e a revogação, e a observação de que não há restauração pelo painel.

### 10.8 Ordem de implementação e de commit

1. `feat(api): revoke account access when an admin archives a user` (helper, `DELETE`, T1 a T7, mocks de
   `usersAdminDeleteBilling.test.ts`).
2. `fix(api): stop recreating the profile of an archived account` (`hasArchivedProfile`, `user-merge.ts`,
   `/auth/sign-in/google`, M1 a M6, G1, mocks das suítes da §7.3).
3. `feat(internationalization): add USERS_DELETE_AUTH_FAILED to apiErrors`.
4. `docs: archiving locks the account out` (`PAYMENTS.md`, `INCIDENT-RESPONSE.md`).
5. `docs(features): admin-archive-access-revocation` (último).

Sem mudança no SDK, então a API vem primeiro.

### 10.9 Env e configuração

Nenhuma variável nova. Pré-requisitos manuais de infraestrutura: nenhum. Um fork que já tem usuários
arquivados não precisa rodar nada: cada conta é desativada no primeiro contato.

## 11. Perguntas em aberto (decididas pela rodada autônoma)

| id | pergunta | opções | adotada e por quê |
|----|----------|---------|-------------------|
| P1 | Onde fechar: no arquivamento, no `getMergedUser*`, ou nos dois? | (a) só arquivamento; (b) só login; (c) os dois | (c). Só o arquivamento deixa os já arquivados abertos e não protege contra perfil arquivado por outro caminho; só o login deixa a sessão aberta viva até o próximo `/auth/me` e deixa a conta habilitada no Auth |
| P2 | Revogar o acesso de quem já ganhou um perfil novo pelo defeito? | (a) não tocar; (b) detectar uid com perfil arquivado e perfil vivo e bloquear | (a). A pessoa pode estar usando a conta desde então; tirar o acesso agora é decisão de produto. O admin pode arquivar de novo, e agora vale |
| P3 | Código de erro próprio para a conta arquivada no login (`AUTH_ACCOUNT_ARCHIVED`)? | (a) reaproveitar `AUTH_INVALID_TOKEN`/`USERS_NOT_FOUND`/`auth/user-disabled`; (b) código novo nos 3 idiomas | (a). A conta desativada já é tratada assim, e a arquivada passa a ser uma conta desativada; código novo pediria mudança no cliente sem ganho para quem foi bloqueado |
| P4 | Restaurar usuário arquivado entra? | (a) fora do corte; (b) rota de restauração | (a). Não existe hoje e a tela não promete; registrado o caminho manual na §1.3 |

## 12. Decisões tomadas sem perguntar

| id | decisão | alternativa descartada |
|----|---------|------------------------|
| D1 | Desativar a conta no Auth, não apagar | `deleteUser`: a confirmação diz que "o cadastro é preservado e o e-mail continua ocupado" (`users.ts:35`); apagar liberaria o e-mail e perderia o rótulo da auditoria |
| D2 | Ordem billing → Auth → revogação → soft delete | Auth antes do billing: com a Stripe desligada e assinatura viva a recusa é certa, e cada tentativa bloquearia a pessoa sem arquivar |
| D3 | Desativar no primeiro contato as contas arquivadas antes da correção | Script de backfill: exige alguém rodar em cada fork, e até lá a conta legada fica no laço da §6.2 |
| D4 | Falha da desativação no login não muda a resposta (`null`) e só loga | Responder 503: o `/auth/me` vira 401 de qualquer jeito, e um 503 no layout autenticado mostraria erro em vez do login |
| D5 | `auth/user-not-found` no arquivamento conta como feito | Recusar: o perfil órfão ficaria impossível de arquivar |
| D6 | `if (!user)` em `/auth/sign-in/google` entra aqui; o resto do contrato da rota, não | Corrigir a rota inteira: é outro achado (`BACKLOG.md:1544`) e aumentaria o diff sem relação com o arquivamento |
| D7 | Helper compartilhado `revokeAccountAccess` em arquivo próprio | Duplicar `updateUser` + `revokeUserSessions` nos dois lugares; ou reaproveitar no `PUT` (fora da tarefa, o `PUT` não precisa mudar) |
| D8 | Testes só de unidade | Teste de emulador: a consulta nova não depende de índice composto, e a desativação no emulador é medida pelo `/test` (F1 a F4) |

## 13. Riscos

- Leitura extra no primeiro login de cada conta nova (`hasArchivedProfile`). Uma consulta de igualdade, só
  quando não há perfil vivo.
- O `GET /users/[id]` do admin por uid de conta arquivada desativa a conta. É o mesmo invariante (arquivado
  implica desativado), e hoje essa chamada criava um perfil.
- Quem reativar a conta no console do Firebase sem limpar `deletedAt` vê a conta desativada de novo no
  próximo login. Está escrito na §1.3 e entra na linha nova do `INCIDENT-RESPONSE.md`.
