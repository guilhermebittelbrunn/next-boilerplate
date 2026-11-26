# Handoff do develop: falha da revogação de sessões nos chamadores restantes

Plano: `analyze/plan.md`. Rodada autônoma do `/cycle`, sem perguntas. Nenhum arquivo alvo estava modificado
no working tree antes desta tarefa, exceto os listados em "Arquivos já modificados por outra tarefa".

## Decisões D1 a D7 conferidas

Nenhuma estava errada. O que foi conferido lendo o código antes de implementar:

- B: no `PUT /users/:id` a auditoria é gravada antes da resposta 500. A ordem medida no teste é
  `updateUser → revoke → audit`, e só depois a rota devolve `USERS_SESSIONS_NOT_REVOKED`.
- C: `user-merge.ts` continua só logando. O `.catch` de `findOrCreateProfile` captura qualquer erro de
  `revokeAccountAccess`, grava `[auth] archived-account-lockout-failed` com `adminAuthErrorReason` e devolve
  `null`. O arquivo não mudou.
- A: a ordem continua desvincular → auditar → devolver o e-mail → revogar. Com a devolução falhando, prevalece
  `500 ACCOUNT_UPDATE_FAILED`, e a falha da revogação aparece só no log `[auth] session-revoke-failed`.

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| 2.1 `sessionsNotRevokedResponse(code)` | `apps/api/(shared)/lib/session-revocation.ts` |
| 2.2 A, desvincular a senha | `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts` |
| 2.3 B, admin desativa | `apps/api/app/(routes)/users/[id]/route.ts` (só o `PUT`) |
| 2.4 C, `revokeAccountAccess` | `apps/api/(shared)/lib/account-access.ts` |
| 2.5 D, expurgo | sem mudança |
| 2.6 toggle do admin | `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud.tsx` |
| 2.7 i18n | `packages/internationalization/translations/packages/shared/utils.ts` |
| 2.8 docs | `docs/SECURITY.md`, `docs/INCIDENT-RESPONSE.md`, mais âncoras de linha em `docs/BACKUP.md` e `docs/SUBPROCESSORS.md` |

Testes:

| arquivo | o que mudou |
|---------|-------------|
| `apps/api/__tests__/accountSignInMethodsRoute.test.ts` | mock passa a `revokeUserSessionsOrThrow`; 2 testes novos (revogação recusada com devolução ok → `500 AUTH_SESSIONS_NOT_REVOKED`; devolução e revogação falhando → `500 ACCOUNT_UPDATE_FAILED`) |
| `apps/api/__tests__/usersAdminAuditTrail.test.ts` | mock passa a `revokeUserSessionsOrThrow`; 1 teste novo (`500 USERS_SESSIONS_NOT_REVOKED`, `type` gravado, `updateUser` chamado, ordem `updateUser → revoke → audit`, `changedFields: ["type", "disabled"]`) |
| `apps/api/__tests__/usersAdminArchiveAccess.test.ts` | mock passa a `revokeUserSessionsOrThrow`; 3 testes novos (revogação recusada → `503 USERS_DELETE_AUTH_FAILED` sem arquivar nem auditar; repetir depois arquiva; conta que some entre a desativação e a revogação é arquivada) |
| `apps/api/__tests__/userMergeArchivedProfile.test.ts` | mock passa a `revokeUserSessionsOrThrow`; 1 teste novo (revogação recusada → `null` e um único log `archived-account-lockout-failed`) |
| `apps/api/__tests__/usersAdminDeleteBilling.test.ts`, `googleSignInProfile.test.ts`, `welcomeNotification.test.ts` | só a chave do mock de `@repo/auth/server` (`revokeUserSessions` → `revokeUserSessionsOrThrow`). O primeiro reprovava 9 testes sem isso; os outros dois passavam porque o `TypeError` caía no `.catch` do `user-merge`, o que esconderia uma regressão |
| `apps/app/__tests__/useUserCrudSessionsNotRevoked.test.tsx` (novo) | 3 idiomas: `USERS_SESSIONS_NOT_REVOKED` mantém `disabled: true` na lista e no detalhe e mostra a mensagem traduzida; outro código faz rollback |

## Contrato

- SDK: nada mudou.
- `sessionsNotRevokedResponse` ganhou o parâmetro opcional `code`, com default `AUTH_SESSIONS_NOT_REVOKED`. Os
  chamadores atuais (`account/password`, `account/password/set`, `auth/email-change/confirm`) não mudaram.
- `revokeAccountAccess` passa a lançar quando a revogação é recusada. Chamadores: `DELETE /users/:id` (já
  envolvia em `try/catch` e responde `503`) e `user-merge.ts` (já capturava). `organizationOwnerExitArchivedMember`
  mocka o módulo inteiro e não é afetado.

## Códigos de erro

- Novo: `USERS_SESSIONS_NOT_REVOKED` (500), em `apiErrors` nos três idiomas, logo depois de
  `USERS_DELETE_AUTH_FAILED`. Texto conforme a tabela 2.7 do plano.
- Reutilizados: `AUTH_SESSIONS_NOT_REVOKED` (A) e `USERS_DELETE_AUTH_FAILED` (C).

## Desvios

1. Em `revokeAccountAccess`, a revogação entrou no mesmo `try` da desativação, então `auth/user-not-found`
   vindo de `revokeRefreshTokens` também é tratado como conta inexistente (arquiva). O plano trocava só a
   variante. Sem isso, uma conta apagada no Firebase Auth entre as duas chamadas faria o `DELETE` responder
   `503` para sempre, contra o que o JSDoc da função já prometia. Coberto pelo teste "archives when the
   account disappears between the disable and the revocation".
2. Comentário novo no `PUT` de `users/[id]` explicando por que a rota não reverte a desativação quando a
   revogação falha. O plano não previa comentário ali.
3. Docs: além de `SECURITY.md:12` e `INCIDENT-RESPONSE.md:51`, corrigi `INCIDENT-RESPONSE.md:52` (o arquivamento
   agora também recusa por falha da revogação) e as âncoras de linha de `users/[id]/route.ts` que o import novo
   deslocou em 4 (`PUT`) e 10 (`DELETE`) linhas: `SECURITY.md:39-40`, `BACKUP.md:96`, `SUBPROCESSORS.md:35`,
   `INCIDENT-RESPONSE.md:51-52`. Cada âncora nova foi conferida com `sed -n` contra o arquivo. A âncora
   `user-merge.ts:55-71` já estava uma linha fora antes desta tarefa e virou `:56-72`.
4. Em `SECURITY.md`, a frase "o Firebase trata essa devolução como troca de e-mail e revoga os refresh tokens"
   saiu e virou "não foi medido", como o plano pede.

## Arquivos já modificados por outra tarefa

Nenhum dos arquivos de código desta tarefa estava modificado antes. Em `docs/`, `git diff --word-diff` de
`SECURITY.md` mostra só os hunks desta tarefa (linha 12, "Métodos de login", e as âncoras das linhas 39-40).
`docs/AUTH-PANEL.md` e `docs/review-checklist.md` aparecem modificados no working tree, mas não foram
tocados aqui.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| testes novos e afetados | `npx vitest run` nos 5 arquivos da API (dentro de `apps/api`) | 103/103 |
| suíte da API | `pnpm --filter api test` | 130 arquivos, 1859 testes, todos passam |
| suíte do app | `pnpm --filter app test` | 152 arquivos, 1371 testes, todos passam |
| typecheck | `pnpm turbo run typecheck --filter=api --filter=app` | 2/2 tasks ok |
| lint | `pnpm check` | 1151 arquivos, sem erro |
| paridade i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes |

### Prova de que os testes novos reprovam o código antigo

Com `git checkout` dos quatro arquivos de código da API e um mock que expunha também `revokeUserSessions`
engolindo a recusa (o comportamento do pacote), os testes novos falharam assim:

- A: 2 de 2 falham (o primeiro recebe `204`; o segundo falha porque o log `session-revoke-failed` não sai pelo
  caminho da rota). O segundo é sobretudo guarda de precedência, porque o código antigo já respondia
  `ACCOUNT_UPDATE_FAILED` nesse caso.
- B: o teste novo falha (recebe `200`).
- C, `DELETE`: "refuses to archive when Firebase Auth rejects the session revocation" e "archives on the retry"
  falham. "archives when the account disappears" passa também no código antigo; ele guarda o desvio 1.
- C, `user-merge`: o teste novo falha (nenhum log sai).
- App: com `git checkout` de `useUserCrud.tsx`, os 3 casos de `USERS_SESSIONS_NOT_REVOKED` falham (rollback) e o
  de outro código passa.

Os arquivos foram restaurados do backup e `git diff` do código da API saiu idêntico ao patch salvo antes.

### Expurgo (D)

Sem teste novo. Fica provado pela composição de dois testes existentes: `packages/auth/__tests__/serverSessionRevocation.test.ts`
("revokeUserSessions continua engolindo a recusa e registrando o código") e `accountErasure.test.ts`, que fixa
`revokeSessions` antes de `authAccount` e mocka só a variante que não lança. Trocar o expurgo pela variante que
lança quebraria esse mock.

## Ajuste pós-review: código do erro no log da revogação

O `/review` apontou uma regressão desta tarefa. Antes, A e B chamavam `revokeUserSessions`, que grava
`[auth] session-revoke-failed` com o código do Firebase (`authErrorFields` em `packages/auth/server.ts:150-158`:
`code` quando o erro tem um, senão `reason` com o nome do erro). Ao passarem para `revokeSessionsOrReport`, a
linha ficou só com o `requestId`.

Correção em `apps/api/(shared)/lib/session-revocation.ts`: o helper grava `requestId` mais os mesmos campos que
o pacote grava (`code`, ou `reason` com o nome do erro). Nunca a mensagem, que pode trazer o endereço. Vale para
os cinco chamadores: `account/password`, `account/password/set`, `auth/email-change/confirm`,
`account/sign-in-methods/[id]` e `users/[id]`. A função ficou duplicada no helper porque `authErrorFields` não é
exportada pelo pacote, e exportá-la obrigaria a mudar o mock de `@repo/auth/server` em todos os testes dos
cinco chamadores.

Testes:

- `accountSignInMethodsRoute.test.ts`: o payload exato passa a ser
  `{ requestId: REQUEST_ID, code: "auth/internal-error" }`. A recusa agora traz o e-mail na mensagem, e o
  teste confere que o e-mail não aparece no log.
- `authEmailChangeConfirm.test.ts:222`: o payload exato passa a ser `{ requestId: REQUEST_ID, reason: "Error" }`
  (o mock rejeita com `new Error(...)`, sem `code`). Este arquivo não tinha outra mudança no working tree.
- `usersAdminAuditTrail.test.ts`: o teste de B passa a conferir a linha impressa pelo `logEvent` real:
  `[auth] session-revoke-failed requestId=req-42 code=auth/internal-error`.

Prova de reprovação: com a linha `...revokeFailureFields(error)` removida do helper, os três testes acima
falharam (3 falhas, 70 passaram nos três arquivos). Restaurado do backup em seguida.

Gates depois do ajuste: `pnpm --filter api test` 130 arquivos, 1859 testes, todos passam;
`pnpm turbo run typecheck --filter=api` 1/1; `pnpm check` 1151 arquivos sem erro. A suíte do app e a paridade
de i18n não foram rodadas de novo porque o ajuste não toca nesses workspaces.

## A verificar no `/test`

- A tela de Segurança, ao receber `AUTH_SESSIONS_NOT_REVOKED` no desvincular da senha, não desloga, recarrega
  os métodos e mostra a mensagem. Li no código (`useSignInMethodMutations.tsx`: `onError` chama
  `refreshAccount` e `alertUnlessDismissed`; o `signOut` do painel só roda no `onSuccess`), sem medir. Não há
  teste de componente para isso. Repro: teste de hook com `unlinkAccountSignInMethod` rejeitando com esse código.
- O switch da lista de usuários continuar desativado no browser depois do 500. O teste de hook prova o cache,
  não a renderização. Reproduzir a recusa de `revokeRefreshTokens` exige alterar código, então o plano
  recomenda não abrir browser.
- O `apiClient` não repete o `PUT` ao receber 500: `grep -rni retry packages/sdk/src` não devolve nada, e o
  React Query não repete mutation por padrão. Não medi com a rede de pé; um retry duplicaria o evento de
  auditoria.
- 🔒 Se o Firebase revoga os refresh tokens ao devolver o e-mail no desvincular da senha. Não medido (Pergunta 3
  do plano).

## Lacunas de teste conhecidas

- Nenhum teste de componente para o painel de métodos de login com `AUTH_SESSIONS_NOT_REVOKED`.
- Nenhum teste de rota para `PUT` com `disabled: true` e `updateUser` recusado; o comportamento (lança, sem
  revogar nem auditar) é anterior a esta tarefa e já está em "does not revoke when Firebase Auth fails".

## Decisões em aberto

As três perguntas do plano seguem abertas, sem bloquear nada:

1. Repetir só a revogação pelo painel do admin. Hoje, depois de `USERS_SESSIONS_NOT_REVOKED`, a única saída é
   reativar e desativar de novo, e reativar é o que expõe as sessões antigas. O `INCIDENT-RESPONSE.md` agora
   diz isso.
2. Se a copy de `USERS_SESSIONS_NOT_REVOKED` deve avisar para não reativar a conta.
3. Medir no emulador se a devolução do e-mail revoga os refresh tokens.
