# Handoff do develop: arquivar um usuário pelo admin tira o acesso dele

Implementação de `analyze/plan.md` (§10). Só `apps/api`, `packages/internationalization` e dois docs.
Nada em `packages/sdk`, `apps/app`, `apps/web` ou `packages/auth`. Nenhuma env nova e nenhum pré-requisito
de infraestrutura.

## Blueprint → arquivos

| item | arquivos |
|------|----------|
| 10.1 helper `revokeAccountAccess(uid)` | `apps/api/(shared)/lib/account-access.ts` (novo) |
| 10.2 `hasArchivedProfile(referenceId)` | `apps/api/(shared)/repositories/user.repository.ts` |
| 10.3 `DELETE /users/[id]` desativa e revoga entre o billing e o soft delete | `apps/api/app/(routes)/users/[id]/route.ts` (`:206-218`) |
| 10.4 `findOrCreateProfile` nos dois `getMergedUser*` | `apps/api/(shared)/lib/user-merge.ts` (`:50-70`) |
| 10.5 `/auth/sign-in/google` responde 404 sem perfil | `apps/api/app/(routes)/auth/sign-in/google/route.ts` |
| 10.6 `USERS_DELETE_AUTH_FAILED` em `apiErrors` | `packages/internationalization/translations/packages/shared/utils.ts` (`:34`, `:180`, `:327`) |
| 10.7 docs | `docs/PAYMENTS.md` (bullet novo depois do `USERS_DELETE_BILLING_FAILED`), `docs/INCIDENT-RESPONSE.md` (linha "O admin arquiva uma conta" na tabela de contenção) |
| 7.1 T1 a T7 | `apps/api/__tests__/usersAdminArchiveAccess.test.ts` (novo, 7 testes) |
| 7.2 M1 a M6 | `apps/api/__tests__/userMergeArchivedProfile.test.ts` (novo, 6 testes) |
| 7.3 suítes existentes | `googleSignInProfile.test.ts` (mock de `hasArchivedProfile`, `updateUser` e `revokeUserSessions`, mais o caso G1); `usersAdminDeleteBilling.test.ts` (mock de `revokeUserSessions`) |
| extra | `apps/api/__tests__/userRepositoryBilling.test.ts`: 2 testes de `hasArchivedProfile` (ver Desvios) |

## Contrato

Sem mudança de DTO nem de action no SDK. O efeito chega aos consumidores por três respostas:

- `DELETE /users/[id]` pode responder `503 { error: { code: "USERS_DELETE_AUTH_FAILED" } }`. Quem consome é
  `apiClient.user.delete`, pelo `useUserCrud.tsx` do admin, que já traduz `error.code`.
- `POST /auth/sign-in/google` responde `404 USERS_NOT_FOUND` sem `session` quando o uid não tem perfil vivo.
  Antes respondia 200 com `user: null` e a sessão. Consumidor: `apps/app/shared/lib/googleSignInApi.ts`, que
  trata resposta de erro como exceção.
- `getMergedUserByUid` e `getMergedUserFromIdToken` devolvem `null` para uid com perfil arquivado. Chamadores:
  `GET /auth/me` (401 `AUTH_INVALID_TOKEN`), `POST /auth/sign-in` (404 `USERS_NOT_FOUND`), `GET /users/[id]`
  do admin por uid (404) e `/auth/sign-in/google`. Nenhum deles mudou de código além do Google.

Raio de impacto conferido por `grep`: `createDefaultUserProfile` só tem outro chamador em
`auth/sign-up/route.ts:55`, que cria o perfil de uma conta que acabou de nascer no Auth e por isso não passa
pelo desvio.

## Códigos de erro novos

`USERS_DELETE_AUTH_FAILED` (503). Entrada em `apiErrors` nos 3 idiomas, com o texto da §10.6. Paridade:
`pnpm --filter @repo/internationalization test` → 7 arquivos, 67 testes, todos passando.

Eventos de log novos (sem PII, só `requestId` e o código do provedor via `adminAuthErrorReason`):
`auth/admin-user-delete-auth-failed` e `auth/archived-account-lockout-failed`.

## Desvios

1. **T4 ganhou uma asserção.** Como estava escrito no plano ("204, `delete` chamado, `revokeUserSessions` não
   chamado"), o T4 continuava passando com a chamada a `revokeAccountAccess` removida do `DELETE`, porque sem
   a chamada o arquivamento também termina em 204 sem revogar. A §7.4 esperava que ele caísse. Acrescentei
   `expect(updateUserMock).toHaveBeenCalledWith(TARGET_UID, { disabled: true })`, que prova que a desativação
   foi tentada antes de seguir. Com isso o T4 cai na reversão (medição abaixo).
2. **Teste de repositório para `hasArchivedProfile`.** Não estava no plano. `userRepositoryBilling.test.ts`
   já tem um Firestore falso com `where` e `select`, então dois testes ali cobrem o formato da consulta (um
   `where` só, de igualdade em `reference_id`, com `select("deletedAt")`) e o tratamento do documento sem
   `deletedAt` como não arquivado. Custo baixo e cobre a premissa da §2 de que não precisa de índice composto.
3. **Comentário no `DELETE`.** O plano deixava opcional. Entrou uma linha acima do `try`: "Billing first: a
   refused cancellation must leave the account untouched."
4. **Suítes da §7.3 que não precisaram mudar.** `mergedUserPayload.test.ts`, `usersRoute.test.ts` e
   `usersAdminAuditTrail.test.ts` passaram sem alteração. Nenhum caso delas chega ao desvio de
   `hasArchivedProfile`, e o mock do `usersAdminAuditTrail` já tinha `updateUser` e `revokeUserSessions`.

Nenhuma decisão do plano estava errada.

## Decisões em aberto, pendências e bloqueios

Nenhum bloqueio. As perguntas P1 a P4 da §11 seguem como o plano adotou. P2 (revogar o acesso de quem já
ganhou um perfil novo pelo defeito) continua fora do corte e é decisão de produto.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| lint | `npx -y pnpm@10.19.0 check` | `Checked 932 files`, sem correções |
| typecheck | `npx -y pnpm@10.19.0 --filter api typecheck` | exit 0 |
| testes da api | `npx -y pnpm@10.19.0 --filter api test` | 103 arquivos, 1320 testes, todos passando (antes da tarefa: 101 arquivos e 1304 testes) |
| paridade i18n | `npx -y pnpm@10.19.0 --filter @repo/internationalization test` | 7 arquivos, 67 testes, todos passando |

Prova de que os testes pegam o defeito (§7.4), com `npx vitest run` e restaurando o arquivo depois de cada
rodada:

- Chamada a `revokeAccountAccess` retirada do `DELETE`: caem 4 de 7 em `usersAdminArchiveAccess.test.ts`
  (T1, T2, T3 e T4). T5, T6 e T7 passam, como esperado, porque testam recusas que acontecem antes da
  desativação.
- Desvio de `hasArchivedProfile` desligado no `findOrCreateProfile`: caem M2, M4, M5 e G1 (4 de 10 nas duas
  suítes). M1, M3 e M6 passam, como esperado.

Antes do ajuste nos mocks, a mudança de código derrubava 11 testes existentes: os 9 do
`usersAdminDeleteBilling.test.ts` que esperam 204 (o mock não exportava `revokeUserSessions`, a rota caía no
`catch` e respondia 503) e 2 do `googleSignInProfile.test.ts` que criam perfil (o mock não tinha
`hasArchivedProfile`). Os dois mocks foram completados, sem afrouxar asserção.

Não subi app, emulador nem browser.

## A verificar no `/test`

Nada abaixo foi medido fora dos testes de unidade com Firebase mockado.

- **F0, defeito no código anterior.** No `4eeb07b`: arquivar pelo `DELETE`, entrar de novo, contar os
  documentos `user` com o mesmo `reference_id` (esperado 2) e o status do `/auth/me` (esperado 200).
- **F1.** Arquivar pela tela `/pt-br/admin/users` e conferir no emulador de Auth `disabled: true` e
  `tokensValidAfterTime` avançado, e no Firestore o `deletedAt` do perfil.
- **F2, sessão aberta.** `curl -i http://localhost:3002/auth/me -H 'Authorization: Bearer <token antigo>'`
  depois do arquivamento. Esperado 401 `AUTH_INVALID_TOKEN` e nenhum perfil novo. Repetir com o cookie de
  sessão.
- **F3, conta arquivada antes da correção.** Gravar `deletedAt` direto no documento de uma conta habilitada
  e entrar pela app. Esperado: termina na tela de login sem laço de redirecionamento (contar os redirects), a
  conta fica `disabled: true` e nenhum perfil nasce. Um segundo login mostra "Esta conta foi desativada.".
- **F4, Google.** `POST /auth/sign-in/google` de conta arquivada responde 404 `USERS_NOT_FOUND`, sem
  `session`.
- **Consulta real.** `hasArchivedProfile` contra o emulador de Firestore: os testes usam um Firestore falso,
  então a execução do `where` + `select` no Admin SDK de verdade só é confirmada pelo F3.
- **Toast do admin.** O texto de `USERS_DELETE_AUTH_FAILED` no toast depende de forçar o `updateUser` a falhar
  (F5). Sem harness no emulador, fica coberto só pelo T3.

## Lacunas de teste conhecidas

- Nenhum teste de emulador. A desativação, a revogação e a consulta nova só têm cobertura de unidade.
- O laço de redirecionamento da §6.2 (F3) não tem teste automatizado. Depende do proxy da app e do cookie de
  sessão reais.
