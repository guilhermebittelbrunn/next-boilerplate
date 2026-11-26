# Plano: falha da revogação de sessões nos quatro chamadores restantes

Tarefa direta, sem spec. Origem: `specs/reference/AUDIT.md`, seção "Achados da PR #64", primeira linha
("Quatro chamadores ainda engolem a falha da revogação", 🟡, P). A fatia 2 de `delivery-security-review`
deixou os quatro de fora de propósito (Q9 em `docs/features/delivery-security-review-slice-2/analyze/plan.md:770-776`).

Rodada autônoma do `/cycle`. Nenhuma pergunta foi feita; as decisões estão na seção "Decisões tomadas sem
perguntar", com a alternativa descartada.

## Etapa 1. Análise

### 1.1 Contexto

`@repo/auth` tem duas variantes de revogação (`packages/auth/server.ts:349-365`):

- `revokeUserSessionsOrThrow(uid)` propaga a recusa do Firebase;
- `revokeUserSessions(uid)` captura a recusa, grava `[auth] session-revoke-failed` e segue.

O contrato vigente nas rotas em que encerrar as sessões faz parte do que a pessoa pediu está em
`apps/api/(shared)/lib/session-revocation.ts`: `revokeSessionsOrReport(uid, req)` devolve `false` quando a
revogação falha, a rota grava o evento de auditoria (a mudança já aconteceu) e responde
`sessionsNotRevokedResponse()`, que é `500 { error: { code: "AUTH_SESSIONS_NOT_REVOKED" } }`. É 500 e não
401 porque o SDK desloga em todo 401 (`session-revocation.ts:22-25`). Usam esse caminho
`account/password/route.ts:70-85`, `account/password/set/route.ts:78-92`,
`auth/email-change/confirm/route.ts:82-86` e, com a variante que lança, `auth/password/reset/route.ts:52-57`.
O `docs/SECURITY.md:12-13` descreve esse contrato.

Os quatro chamadores que ainda usam a variante que engole:

| # | onde | o que faz antes da revogação | hoje, se a revogação falha |
|---|------|------------------------------|----------------------------|
| A | `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts:122` (`DELETE`, desvincular a senha) | desvincula o provedor (`:81-83`), grava `account.signInMethod.unlink` (`:92-102`), devolve e-mail e `emailVerified` (`:111-117`) | responde `204` (ou `500 ACCOUNT_UPDATE_FAILED` se a devolução do e-mail falhou); a tela trata o `204` como "sessões encerradas" e desloga |
| B | `apps/api/app/(routes)/users/[id]/route.ts:155` (`PUT` do admin com `disabled: true`) | grava `type` no Firestore (`:139-141`), desativa a conta no Firebase Auth (`:151-153`) | grava a auditoria e responde `200` |
| C | `apps/api/(shared)/lib/account-access.ts:20` (`revokeAccountAccess`) | desativa a conta (`:13`) | retorna normalmente. Chamado por `DELETE /users/[id]` (`users/[id]/route.ts:216`), que em seguida arquiva o perfil, e por `user-merge.ts:62-68`, que bloqueia conta arquivada no primeiro contato |
| D | `apps/api/(shared)/lib/account-erasure.ts:237` (passo `authAccount` do expurgo) | todos os passos de dados; a revogação vem logo antes de `deleteUser` (`:236-239`) | segue para `deleteUser` |

#### O que a conta desativada já garante

A API recusa conta desativada nos dois transportes: o cookie de sessão é conferido com `checkRevoked: true`
(`packages/auth/server.ts:323-327`), que recusa `auth/user-disabled`, e o bearer passa por
`getIdTokenSession`, que olha `user.disabled` no registro carregado (`server.ts:198-201`). O
`docs/INCIDENT-RESPONSE.md:51` registra a medição contra um projeto de dev e diz o que se perde quando a
revogação falha: "perde-se apenas essa garantia na reativação". Ou seja, em B e C a falha não abre acesso
enquanto a conta continua desativada. Ela abre se a conta for reativada: as sessões anteriores voltam a
valer.

### 1.2 Comportamento correto por chamador

**A. Desvincular a senha: muda.** É o caso que a auditoria destacou. Quem remove a senha para cortar um
acesso recebe `204`, a tela desloga e diz que acabou, mas a revogação pode ter falhado. O comentário da
rota (`:119-121`) afirma que o Firebase já revoga os refresh tokens ao devolver o endereço; isso não tem
medição no repo, então o plano não conta com ele. Correção: trocar por `revokeSessionsOrReport` e, quando
a devolução do e-mail deu certo e a revogação não, responder `sessionsNotRevokedResponse()`. A ordem fica
igual: desvincular, auditar, devolver o e-mail, revogar. Precedência: se a devolução do e-mail falhou, a
resposta continua `500 ACCOUNT_UPDATE_FAILED` (o defeito mais grave, com log próprio); a falha da
revogação, nesse caso, fica só no `logEvent` de `revokeSessionsOrReport`.

A copy existente serve sem ajuste: "A alteração foi salva, mas não conseguimos encerrar as outras sessões
desta conta. Entre de novo e use 'Sair de todos os dispositivos' em Segurança."
(`translations/packages/shared/utils.ts:58-59`). No app, o `onError` de `unlinkMutation`
(`useSignInMethodMutations.tsx:71-74`) já recarrega a conta e mostra o toast; o `signOut` do painel só roda
no sucesso (`AccountSignInMethodsPanel.tsx:75-80`). Nada muda no app para A.

**B. Admin desativa a conta: muda.** A desativação e o `type` já foram gravados quando a revogação falha,
e não há como desfazer sem piorar (reativar a conta para "voltar atrás" seria exatamente o que expõe as
sessões). Correção: `revokeSessionsOrReport`, auditoria gravada do mesmo jeito (a mudança aconteceu) e, se
a revogação falhou, `500 USERS_SESSIONS_NOT_REVOKED`. Código novo porque a copy de
`AUTH_SESSIONS_NOT_REVOKED` fala com a dona da conta ("Entre de novo e use...") e aqui quem lê é o admin.

No app, quem manda `disabled` é só o toggle de status (`useUserCrud.tsx:77-128`; o formulário de edição
não envia `disabled`, `:54-64`). O toggle é otimista e, no `onError`, devolve o estado anterior
(`:114-127`). Com o código novo isso mentiria: a conta está desativada no servidor e o switch voltaria a
mostrar "ativo". Correção: no `onError`, quando `apiErrorCodeOf(error) === "USERS_SESSIONS_NOT_REVOKED"`,
manter o estado otimista e só mostrar o alerta. `apiErrorCodeOf` já existe em
`apps/app/shared/lib/apiErrorCode.ts` e é o padrão do `ResetPasswordForm.tsx:23,51`.

**C. `revokeAccountAccess`: muda.** Passa a usar `revokeUserSessionsOrThrow`. Efeito nos dois chamadores:

- `DELETE /users/[id]` já envolve a chamada em `try/catch` e responde `503 USERS_DELETE_AUTH_FAILED`
  sem arquivar o perfil (`users/[id]/route.ts:215-227`). A copy desse código já diz o certo: "Não foi
  possível bloquear o acesso deste usuário, então ele não foi arquivado. Tente de novo em instantes."
  Repetir é seguro: `updateUser({ disabled: true })` é idempotente e a revogação roda de novo. Nenhum
  código novo.
- `user-merge.ts:62-68` já captura qualquer erro de `revokeAccountAccess`, grava
  `[auth] archived-account-lockout-failed` e devolve `null`. O comportamento visível não muda; o log
  passa a sair também quando só a revogação falhou, com `adminAuthErrorReason(error)`.

Efeito colateral a registrar: quando a revogação falha no `DELETE`, a conta fica desativada no Firebase
Auth e o perfil continua ativo no Firestore até o admin repetir. É o mesmo estado que já acontecia quando
o `updateUser` passava e algo depois falhava; a conta segue bloqueada pela checagem de `disabled`.

**D. Expurgo da conta: não muda.** Motivo legítimo para seguir em frente: a revogação vem imediatamente
antes de `deleteUser` (`account-erasure.ts:236-239`), e apagar a conta invalida todo cookie e todo bearer
dela (`auth/user-not-found` está entre os códigos benignos, `server.ts:117-131`). Trocar pela variante que
lança faria o passo parar antes do `deleteUser` e deixaria a conta viva no Firebase Auth, o oposto do que o
expurgo promete (`:243-253`: "The account in Firebase Auth goes last"). A revogação ali é reforço, e o log
de `revokeUserSessions` continua registrando a falha. `revokeUserSessions` fica no pacote com esse único
chamador.

### 1.3 Fora do corte

- Medir se o Firebase revoga os refresh tokens ao devolver o e-mail em A. Fica como 🔒 no `/test`; o plano
  não depende disso.
- Dar ao admin um jeito de repetir só a revogação de uma conta desativada (ex.: botão "encerrar sessões"
  na tela do usuário). Hoje o admin não tem retry em B sem reativar a conta. Registrado em "Perguntas em
  aberto".
- O estado desatualizado da lista de usuários depois de `503 USERS_DELETE_AUTH_FAILED` (conta já
  desativada, linha ainda "ativa"). É anterior a esta tarefa.

### 1.4 Apps impactados

| área | muda? | o quê |
|------|-------|-------|
| `apps/api` | sim | A, B, C + um parâmetro opcional em `sessionsNotRevokedResponse` |
| `apps/app` | sim, pouco | `onError` do toggle de status em `useUserCrud.tsx` |
| `packages/internationalization` | sim | `USERS_SESSIONS_NOT_REVOKED` em `apiErrors` nos 3 idiomas |
| `packages/auth` | não | as duas variantes ficam |
| `packages/sdk` | não | nenhum contrato novo; o código de erro trafega no corpo de erro que já existe |
| `apps/web` | não | |
| docs | sim | `docs/SECURITY.md:12` (A) e `docs/INCIDENT-RESPONSE.md:51` (B) descrevem o comportamento antigo |

Modo de produto: indiferente. Área do painel: A é comum (rota da própria conta); B e C são admin.

### 1.5 Dados, contrato e API

- Firestore: nada novo.
- SDK: nada novo.
- Códigos de erro:

| código | status | onde | novo? |
|--------|--------|------|-------|
| `AUTH_SESSIONS_NOT_REVOKED` | 500 | `DELETE /account/sign-in-methods/password` (A) | não, reutilizado |
| `USERS_SESSIONS_NOT_REVOKED` | 500 | `PUT /users/:id` com `disabled: true` (B) | sim |
| `USERS_DELETE_AUTH_FAILED` | 503 | `DELETE /users/:id` (C) | não, só passa a cobrir também a falha da revogação |

### 1.6 Autorização, impersonação, segurança

Nenhum guard muda. A já recusa impersonação (`sign-in-methods/[id]/route.ts:57-62`); B e C são
`requireAdminApi`, e a autoproteção (`selfLockoutRefusal`) roda antes de qualquer escrita. A mudança só
deixa de esconder uma falha: nenhuma resposta passa a revelar dado novo. O 500 e o 503 não deslogam
ninguém no SDK.

### 1.7 Testes (nível mais barato)

Tudo é teste de rota com `vi.mock` de `@repo/auth/server` e do guard, mais um teste de hook. Nenhum
emulador: o objeto do teste é a decisão da rota sobre a recusa, e o emulador de Auth não sabe simular uma
recusa de `revokeRefreshTokens`.

| arquivo | nível | o que prova |
|---------|-------|-------------|
| `apps/api/__tests__/accountSignInMethodsRoute.test.ts` | rota | mock passa a expor `revokeUserSessionsOrThrow`; novo: devolução ok + revogação recusada → `500 AUTH_SESSIONS_NOT_REVOKED`, auditoria gravada, `logEvent("auth","session-revoke-failed")`; devolução falha + revogação recusada → `500 ACCOUNT_UPDATE_FAILED`; desvincular Google não chama revogação (já existe, conferir) |
| `apps/api/__tests__/usersAdminAuditTrail.test.ts` | rota | mock passa a `revokeUserSessionsOrThrow`; novo: `disabled: true` com revogação recusada → `500 USERS_SESSIONS_NOT_REVOKED`, `updateUser` e auditoria chamados, ordem `updateUser → revoke → audit` mantida |
| `apps/api/__tests__/usersAdminArchiveAccess.test.ts` | rota | mock passa a `revokeUserSessionsOrThrow`; novo: revogação recusada → `503 USERS_DELETE_AUTH_FAILED`, perfil não arquivado (`deleteMock` não chamado), sem auditoria de arquivamento |
| `apps/api/__tests__/userMergeArchivedProfile.test.ts` | unit | mock passa a `revokeUserSessionsOrThrow`; novo: revogação recusada → devolve `null` e grava `archived-account-lockout-failed` |
| `apps/api/__tests__/accountErasure.test.ts` | unit | sem mudança de código; conferir que segue verde (o mock de `revokeUserSessions` continua válido) |
| `apps/app/__tests__/useUserCrudSessionsNotRevoked.test.tsx` (novo) | hook | toggle para `disabled: true` com erro `USERS_SESSIONS_NOT_REVOKED` → cache de lista e de detalhe mantém `disabled: true` e o alerta é chamado; com outro código → rollback como hoje |
| paridade de i18n (teste existente de `apiErrors`) | unit | a chave nova existe nos 3 idiomas |

Os mocks de `@repo/auth/server` nos testes que já expõem as duas variantes com o mesmo `vi.fn`
(`accountPasswordSetRoute`, `authPasswordReset`, `accountAuditTrail`) não precisam de ajuste.

### 1.8 O que o `/test` percorre

Superfície de UI: **mínima e não observável no browser**. As duas telas afetadas (aba Segurança da conta e
toggle de status na lista de usuários do admin) só mudam quando o Firebase recusa `revokeRefreshTokens`, e
nem o emulador nem o projeto de dev deixam produzir essa recusa sem alterar código. Recomendação: o `/test`
não abre browser; roda a suíte Vitest de `api`, `app` e `internationalization` e `pnpm test` da raiz. Os
dois comportamentos de tela ficam provados pelo teste de hook e pelo texto do `onError` já existente.

🔒 a registrar: se o Firebase revoga os refresh tokens ao devolver o e-mail no desvincular da senha
(afirmado no comentário da rota e em `docs/SECURITY.md:12`, sem medição).

### 1.9 Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Desvincular a senha com revogação recusada responde 500 AUTH_SESSIONS_NOT_REVOKED**
  Com a senha e o Google na conta, a devolução do e-mail bem-sucedida e o Firebase recusando
  `revokeRefreshTokens`, `DELETE /account/sign-in-methods/password` responde `500` com
  `{ error: { code: "AUTH_SESSIONS_NOT_REVOKED" } }`. A senha continua desvinculada, o evento
  `account.signInMethod.unlink` é gravado e o log `[auth] session-revoke-failed` sai com o `requestId`. A
  tela não desloga, recarrega a conta e mostra a mensagem que manda usar "Sair de todos os dispositivos".

- [ ] **Falha da devolução do e-mail continua prevalecendo**
  Se a devolução do e-mail falha nas duas tentativas, a resposta é `500 ACCOUNT_UPDATE_FAILED` e o log
  `[account] password-unlink-email-restore-failed` sai, com ou sem falha da revogação. A revogação é
  tentada mesmo assim, depois da devolução, como hoje.

- [ ] **Desvincular sem falha segue respondendo 204**
  Com revogação aceita, desvincular a senha responde `204` e a tela desloga. Desvincular o Google continua
  `204` sem chamar a revogação. Impersonação continua recusada com `403 AUTH_REQUEST_IMPERSONATION_FORBIDDEN`
  antes de qualquer escrita.

- [ ] **Admin desativa a conta e a revogação falha**
  `PUT /users/:id` com `disabled: true` e revogação recusada responde `500 USERS_SESSIONS_NOT_REVOKED`. A
  conta fica desativada no Firebase Auth, o `type` enviado junto fica gravado e o evento `user.update` é
  gravado com `changedFields` contendo `disabled`. A ordem é desativar, revogar, auditar.

- [ ] **Toggle de status mantém "desativado" quando só a revogação falhou**
  No admin, ao desativar pelo switch e receber `USERS_SESSIONS_NOT_REVOKED`, a lista e o detalhe continuam
  mostrando a conta desativada (sem rollback) e aparece o alerta com a mensagem traduzida. Para qualquer
  outro erro o switch volta ao estado anterior, como hoje. Reativar (`disabled: false`) não chama a
  revogação.

- [ ] **Arquivar usuário com revogação recusada não arquiva**
  `DELETE /users/:id` com a desativação aceita e a revogação recusada responde
  `503 USERS_DELETE_AUTH_FAILED`, o perfil não é arquivado e nenhum evento de arquivamento é gravado. Repetir
  a ação com a revogação aceita arquiva normalmente, porque desativar de novo é idempotente.

- [ ] **Conta arquivada no primeiro contato continua sem perfil**
  Quando uma conta com perfil arquivado entra de novo e a revogação falha, `findOrCreateProfile` devolve
  `null` e grava `[auth] archived-account-lockout-failed`. Nenhum perfil novo é criado.

- [ ] **Expurgo da conta não muda**
  No passo `authAccount`, uma revogação recusada é registrada em log e `deleteUser` roda em seguida. O passo
  só reporta `failed` se `deleteUser` falhar.

- [ ] **Mensagem nova nos três idiomas**
  `USERS_SESSIONS_NOT_REVOKED` existe em `apiErrors` em pt-br, en e es, e o teste de paridade passa. A
  mensagem diz que a conta foi desativada, que as sessões abertas não foram encerradas e que, enquanto a
  conta continuar desativada, a pessoa não entra.

## Etapa 2. Blueprint

### 2.1 `apps/api/(shared)/lib/session-revocation.ts`

```ts
export function sessionsNotRevokedResponse(
    code = "AUTH_SESSIONS_NOT_REVOKED"
): Response {
    return Response.json(
        { error: { code } },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
}
```

Os chamadores atuais não mudam (usam o default).

### 2.2 A: `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`

```diff
-import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
+import { getAuthInstance } from "@repo/auth/server";
+import {
+    revokeSessionsOrReport,
+    sessionsNotRevokedResponse,
+} from "@/(shared)/lib/session-revocation";
 ...
-        // The password is gone either way, so every session ends, this one too. Firebase
-        // already revokes the refresh tokens when the address comes back; this call makes
-        // it hold when the address does not.
-        await revokeUserSessions(ctx.user.uid);
+        // The password is gone either way, so every session ends, this one too.
+        const sessionsRevoked = await revokeSessionsOrReport(ctx.user.uid, req);

         if (!restore.restored) {
             logEvent(...);
             return errorResponse("ACCOUNT_UPDATE_FAILED", HTTP_STATUS.INTERNAL_SERVER_ERROR);
         }

+        if (!sessionsRevoked) {
+            return sessionsNotRevokedResponse();
+        }
+
         return new Response(null, { status: NO_CONTENT });
```

O comentário perde a frase sobre o Firebase revogar ao devolver o endereço: é afirmação sem medição e a
rota já não depende dela.

### 2.3 B: `apps/api/app/(routes)/users/[id]/route.ts` (`PUT`)

```diff
-import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
+import { getAuthInstance } from "@repo/auth/server";
+import {
+    revokeSessionsOrReport,
+    sessionsNotRevokedResponse,
+} from "@/(shared)/lib/session-revocation";
 ...
-    if (parsed.value.disabled === true) {
-        await revokeUserSessions(profile.reference_id);
-    }
+    const sessionsRevoked =
+        parsed.value.disabled !== true ||
+        (await revokeSessionsOrReport(profile.reference_id, req));

     await recordAuditEvent({ ... });

+    if (!sessionsRevoked) {
+        return sessionsNotRevokedResponse("USERS_SESSIONS_NOT_REVOKED");
+    }
+
     const merged = await getMergedUserByFirestoreDocId(id);
```

Resposta de erro:

```json
{ "error": { "code": "USERS_SESSIONS_NOT_REVOKED" } }
```

### 2.4 C: `apps/api/(shared)/lib/account-access.ts`

```diff
-import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
+import { getAuthInstance, revokeUserSessionsOrThrow } from "@repo/auth/server";
 ...
-    await revokeUserSessions(uid);
+    await revokeUserSessionsOrThrow(uid);
```

Atualizar o JSDoc da função para dizer que ela lança quando a desativação ou a revogação falham (exceto
conta que já não existe). `users/[id]/route.ts` (`DELETE`) e `user-merge.ts` não mudam.

### 2.5 D: `apps/api/(shared)/lib/account-erasure.ts`

Sem mudança.

### 2.6 App: `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud.tsx`

```diff
+import { apiErrorCodeOf } from "@/shared/lib/apiErrorCode";
+
+const SESSIONS_NOT_REVOKED = "USERS_SESSIONS_NOT_REVOKED";
 ...
         onError: (error, input, context) => {
+            // The account is disabled on the server; only ending its sessions failed.
+            if (apiErrorCodeOf(error) === SESSIONS_NOT_REVOKED) {
+                errorAlert(formatClientError(error));
+                return;
+            }
             if (context?.previousList) { ... }
```

### 2.7 i18n: `packages/internationalization/translations/packages/shared/utils.ts`

Logo depois de `USERS_DELETE_AUTH_FAILED` em cada bloco (`:34`, `:218`, `:403`):

| idioma | texto |
|--------|-------|
| pt-br | "O usuário foi desativado, mas não conseguimos encerrar as sessões abertas dele. Enquanto a conta continuar desativada, ele não consegue entrar." |
| en | "The user was disabled, but we couldn't end their open sessions. While the account stays disabled, they can't sign in." |
| es | "El usuario fue desactivado, pero no pudimos cerrar sus sesiones abiertas. Mientras la cuenta siga desactivada, no puede iniciar sesión." |

Usar a skill `/i18n-sync`.

### 2.8 Docs

- `docs/SECURITY.md:12`: trocar "a rota chama `revokeUserSessions` em seguida para deixar isso explícito"
  pela descrição nova (falha da revogação com a devolução bem-sucedida → `500 AUTH_SESSIONS_NOT_REVOKED`;
  com a devolução falha, prevalece `500 ACCOUNT_UPDATE_FAILED`), e marcar como não medida a revogação feita
  pelo Firebase na devolução do e-mail.
- `docs/INCIDENT-RESPONSE.md:51`: trocar "Se a revogação falhar, o erro vai só para o log" por "a rota
  responde `500 USERS_SESSIONS_NOT_REVOKED` e o switch continua mostrando a conta desativada", mantendo a
  frase sobre o que se perde na reativação. Atualizar as âncoras de linha que mudarem.
- `docs/AUTH-SSO.md:21` cita `revokeUserSessions` como export do pacote; continua verdadeiro.

### 2.9 Ordem de implementação e commits

1. `apps/api`: `session-revocation.ts` + A + testes de A (`fix(api): report failed session revocation when unlinking the password`).
2. `apps/api`: B + C + testes (`fix(api): report failed session revocation when an admin disables or archives a user`).
3. `apps/app`: `useUserCrud.tsx` + teste de hook (`fix(app): keep the disabled state when only session revocation failed`).
4. `packages/internationalization`: `USERS_SESSIONS_NOT_REVOKED` (`feat(internationalization): add USERS_SESSIONS_NOT_REVOKED`).
5. `docs`: `SECURITY.md` + `INCIDENT-RESPONSE.md`.
6. `docs(features): auth-revocation-failure`.

Sem env nova, sem config nova.

### 2.10 Estado do working tree

Nenhum arquivo alvo aparece no `git status` atual. As quatro tarefas não commitadas tocam
`account/password/route.ts`, `account/password/set/route.ts`, `account/route.ts`, `files/route.ts`,
`common-panel.ts` e as páginas `create`/`edit` de usuários do admin, mas não `sign-in-methods/[id]/route.ts`,
`users/[id]/route.ts`, `account-access.ts`, `account-erasure.ts`, `session-revocation.ts`, `useUserCrud.tsx`
nem `translations/packages/shared/utils.ts`. Os testes de `accountPasswordRoute` e `accountPasswordSetRoute`
estão modificados por outra tarefa e não precisam mudar aqui. Atenção no commit: a mudança de assinatura de
`sessionsNotRevokedResponse` é compatível, então não interfere nas rotas de senha alteradas por
`admin-own-account`.

## Decisões tomadas sem perguntar

| decisão | adotada | alternativa descartada | por quê |
|---------|---------|------------------------|---------|
| D1. Expurgo (D) | não muda | trocar pela variante que lança | lançar pararia o passo antes de `deleteUser`, e a conta ficaria viva; apagar a conta já invalida as sessões |
| D2. Código em B | novo `USERS_SESSIONS_NOT_REVOKED` | reutilizar `AUTH_SESSIONS_NOT_REVOKED` | a copy existente fala com a dona da conta e manda entrar de novo; o leitor aqui é o admin |
| D3. Status em B | 500, via `sessionsNotRevokedResponse(code)` | 503, como `USERS_DELETE_AUTH_FAILED` | mesmo contrato das outras falhas de revogação ("mudança salva, sessões não encerradas"); 503 sugere que nada foi feito |
| D4. Código em C | reutilizar `USERS_DELETE_AUTH_FAILED` 503 | código novo | a copy já descreve o caso ("não foi possível bloquear o acesso... não foi arquivado") e o retry é seguro |
| D5. A com a devolução ok | reportar `AUTH_SESSIONS_NOT_REVOKED` | manter `204` confiando que o Firebase revoga ao devolver o e-mail | a afirmação não tem medição; o custo de um alarme falso é um toast que sugere "Sair de todos os dispositivos" |
| D6. Toggle do admin | manter o estado otimista só para esse código | invalidar a lista | a regra do app pede toggle sem `invalidateQueries`; o estado otimista já é o do servidor |
| D7. `revokeUserSessions` no pacote | fica, com o expurgo como único chamador | remover | o expurgo precisa da variante que não lança |

## Perguntas em aberto

1. **O admin precisa de um jeito de repetir só a revogação?** Em B, depois de `USERS_SESSIONS_NOT_REVOKED`,
   o único caminho é reativar e desativar de novo, e reativar é justamente o que expõe as sessões antigas.
   Recomendação: deixar fora desta tarefa e abrir achado no backlog (botão "encerrar sessões" na tela do
   usuário, rota admin que chama `revokeUserSessionsOrThrow`).
2. **A copy de `USERS_SESSIONS_NOT_REVOKED` deve avisar para não reativar a conta antes de resolver?**
   Recomendação: não, enquanto não existir o retry da pergunta 1; o aviso sem ação disponível confunde.
3. **Vale medir no emulador se a devolução do e-mail revoga os refresh tokens?** Recomendação: não nesta
   tarefa. Se a medição mostrar que revoga, D5 pode ser revista para evitar o alarme falso.
