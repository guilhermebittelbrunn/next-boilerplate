# Plano: devolução do e-mail ao desvincular a senha

Tarefa direta, sem spec. Origem: o achado 🟡 "Se a segunda chamada do desvínculo da senha falhar, a conta fica
sem e-mail e sem revogação" (`specs/BACKLOG.md:1535`), listado entre as candidatas diretas em
`specs/BACKLOG.md:285-287`. Plano feito em rodada autônoma do `/cycle`, a segunda tarefa da mesma PR que
`google-sign-in-error-contract`. A §11 traz as perguntas já com a opção adotada e a §12 lista as decisões tomadas
sem perguntar, cada uma com a alternativa descartada.

Referências `arquivo:linha` conferidas neste checkout (`4b0be90`, com o working tree da tarefa anterior) em
2026-10-19.

## 0. Sumário do desenho

Mudança numa rota só, `DELETE /account/sign-in-methods/[id]`, no ramo da senha:

1. a devolução do `email` e do `emailVerified` passa para uma função local, `restoreUnlinkedAddress`, que tenta
   até `ADDRESS_RESTORE_ATTEMPTS = 2` vezes, sem espera entre as tentativas;
2. a revogação das sessões (`revokeUserSessions`) roda **sempre** que a senha saiu, com ou sem a devolução do
   endereço;
3. se as duas tentativas falharem, a rota emite `logEvent("account", "password-unlink-email-restore-failed",
   { uid, requestId, reason, attempts })` e continua respondendo `500 ACCOUNT_UPDATE_FAILED`. O `reason` vem de
   `adminAuthErrorReason` (código do Admin SDK ou nome do erro, nunca a mensagem). O e-mail não entra no log;
   quem for consertar a conta o encontra no evento de trilha do desvínculo, gravado com o mesmo `requestId`.

Nada muda em `packages/sdk`, `apps/app`, `apps/web` ou `packages/internationalization`. Nenhum código de erro
novo, nenhuma env, nenhuma dependência. O teste de rota existente muda um caso (o que fixava o defeito) e ganha
três.

## 1. Contexto

### 1.1 Problema, pela leitura do código

`apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`:

- `:53-55`: `auth.updateUser(uid, { providersToUnlink: [providerId] })` desvincula o método;
- `:63-74`: a trilha grava `account.signInMethod.unlink`, com `actorLabel`/`targetLabel` = `ctx.user.email` e o
  `requestId` da requisição;
- `:76-78`: para o Google a rota responde 204 aqui;
- `:80-96`: para a senha, devolve `email` e `emailVerified` numa segunda chamada. O comentário de `:82-84`
  registra o motivo: o Firebase apaga os dois ao tirar a senha (medido no emulador, `docs/SECURITY.md:12` e
  `docs/features/linked-sign-in-methods/develop/handoff.md:58`). Se essa chamada falhar, a rota responde
  `500 ACCOUNT_UPDATE_FAILED` em `:91-94` e sai antes de `:100`;
- `:98-100`: `revokeUserSessions(uid)` só roda no caminho feliz.

Consequência, como o `/review` da feature de origem descreveu (`docs/features/linked-sign-in-methods/review/review.md:36-44`):

- a senha já saiu e a conta fica com `email` vazio e `emailVerified: false`;
- a copy de `ACCOUNT_UPDATE_FAILED` é "Não foi possível salvar a sua conta. Tente de novo."
  (`packages/internationalization/translations/packages/shared/utils.ts:52-53`), e tentar de novo responde
  `404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`, porque a senha não está mais no `providerData` (`:37-42`);
- as sessões abertas com a senha continuam válidas. Isoladamente, o desvínculo não revoga nada; quem revoga é a
  devolução do e-mail (medição em `docs/features/linked-sign-in-methods/develop/handoff.md:58`);
- nenhum log registra o `uid` afetado.

O caminho de volta que existe é "Definir senha" (`account/password/set/route.ts:34-38`), que usa o e-mail do
provedor quando a conta não tem endereço. Se o endereço da conta era outro, ela passa a usar o do Google, e o
`emailVerified` continua `false`.

### 1.2 O que o Admin SDK já tenta sozinho

`firebase-admin@13.6.0` (o resolvido no lockfile; `apps/api/package.json:30` pede `^13.0.2`) repete cada chamada
HTTP do cliente de Auth com a configuração padrão:
`node_modules/.pnpm/firebase-admin@13.6.0/node_modules/firebase-admin/lib/utils/api-request.js:99-107`
(`maxRetries: 4`, `statusCodes: [503]`, `ioErrorCodes: ['ECONNRESET', 'ETIMEDOUT']`, `backOffFactor: 0.5`),
herdada por `AuthorizedHttpClient` (`:787-791`, `:133`) e por `AuthHttpClient`
(`lib/auth/auth-api-request.js:184`). O atraso entre tentativas é `2^n * 0,5 s` (`api-request.js:207-217`).

Então uma falha que chega à rota já não é um 503 nem um reset de conexão que se resolveu em segundos. Sobram o
500/502/504 do Identity Toolkit, outros erros de rede (DNS, por exemplo) e a falha ao obter o token de acesso da
conta de serviço. Para esses o SDK não repete, e uma segunda chamada imediata da rota é o que falta. Uma espera
na rota em cima da espera do SDK só alongaria o caso em que o Auth está fora do ar.

### 1.3 Quem consome a rota e o que faz com o erro

`apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx:60-75`:

- sucesso com `password`: alerta `passwordUnlinked` e retorna; o painel chama `signOut`
  (`AccountSignInMethodsPanel.tsx:76-83`);
- erro: `refreshAccount()` e alerta pelo `error.code`.

Com a revogação passando a rodar também na falha, o `refreshAccount()` do `onError` sai com a credencial
revogada. A API confere revogação: no `/test` de `linked-sign-in-methods`, um ID token emitido antes do
desvínculo passou de 200 para `401 AUTH_INVALID_TOKEN` (`docs/features/linked-sign-in-methods/test/report.md:51`).
Todo 401 encerra a sessão no SDK (comentário em `account/password/set/route.ts:53-54`), então a pessoa cai no
login com o alerta de `ACCOUNT_UPDATE_FAILED`. Não muda código no app; o efeito é o mesmo de qualquer revogação
remota. A ordem exata entre o alerta e o redirecionamento não se observa sem injetar falha no Admin SDK (🔒, §8).

### 1.4 Logs estruturados já são padrão na API

O backlog diz que registrar o `uid` "depende do coletor (E1)". O coletor (Sentry ou equivalente) depende, mas a
linha de log não: `logEvent(scope, event, fields)` existe em `packages/shared/utils/helpers/log.ts:51-57`, com
escopos fechados (`:5-14`, `"account"` incluso) e valores só primitivos (`:21`), justamente para que um `Error`
com dado pessoal não passe. `git grep "logEvent("` dá 37 chamadas em `apps/api` fora dos testes, entre elas:

- `apps/api/(shared)/lib/user-merge.ts:61-65` (`archived-account-lockout-failed`, com `reason:
  adminAuthErrorReason(error)`);
- `apps/api/app/(routes)/users/[id]/route.ts:210-213` (`admin-user-delete-auth-failed`);
- `apps/api/app/(routes)/auth/password/reset/route.ts:52-55` (`session-revoke-failed`, depois de a operação
  principal dar certo);
- identificadores de pessoa já entram em log como pseudônimo: `actorUid` em
  `apps/api/(shared)/lib/audit-recorder.ts:163-168`, `userId` (id do perfil) em
  `apps/api/(shared)/lib/activity-recorder.ts:87-91`.

`adminAuthErrorReason` (`apps/api/(shared)/lib/toolkit-error-codes.ts:93-102`) devolve o código do Admin SDK ou
o nome do erro, nunca a mensagem, que pode ecoar o endereço. Emitir a linha agora é barato e segue o padrão; o
coletor continua fora e vai passar a receber essa linha quando chegar.

### 1.5 Objetivo e corte de MVP

Objetivo: uma falha passageira da devolução não deixa a conta sem e-mail, e uma falha persistente não deixa as
sessões abertas nem passa sem registro.

No corte:

- duas tentativas de devolução, sem espera;
- revogação das sessões sempre que a senha saiu;
- `logEvent` com `uid`, `requestId`, `reason` e `attempts` na falha persistente;
- resposta `500 ACCOUNT_UPDATE_FAILED` mantida;
- teste de rota atualizado e ampliado;
- `docs/SECURITY.md:12` descrevendo o comportamento na falha.

Fora do corte:

- coletor de erros (`observability-logging`, E1);
- código de erro novo com copy própria para "a senha saiu, mas o e-mail não voltou" (§11, pergunta 3);
- reparo automático posterior (job, reprocessamento na próxima requisição);
- os dois desvínculos simultâneos (🟢 em `specs/BACKLOG.md:1536`) e a janela de milissegundos sem e-mail entre
  as duas chamadas (`linked-sign-in-methods/review/review.md:120-122`);
- teste contra o emulador de Auth (🟢 em `specs/BACKLOG.md:1539`; o runner `test:emulator` não sobe o Auth);
- editar `specs/BACKLOG.md`: fechar o achado é do `/spec --sync`, e o arquivo já tem mudanças da auditoria que
  esta tarefa não toca.

### 1.6 Apps impactados

| Onde | Muda? |
|------|-------|
| `apps/api` | sim: `app/(routes)/account/sign-in-methods/[id]/route.ts` e `__tests__/accountSignInMethodsRoute.test.ts` |
| `docs/SECURITY.md` | sim: uma frase na entrada "Métodos de login" (`:12`) |
| `apps/app`, `apps/web` | não (efeito no app descrito em §1.3, sem mudança de código) |
| `packages/*` | não |

Área: painel comum (guard `requireCommonPanelApi`, `route.ts:27`). Modo de produto: indiferente, a rota é a mesma
nos dois. Não depende de plano.

## 2. Dados (Firestore)

N/A. Nenhum documento muda. O evento de trilha continua igual (`route.ts:64-74`).

## 3. Contrato `@repo/sdk`

N/A. `unlinkSignInMethod(providerId): Promise<void>` não muda; o 500 já existia.

## 4. API

### 4.1 Rota e guard

`DELETE /account/sign-in-methods/:id`, `requireCommonPanelApi<RouteIdParamsContext>` (`route.ts:27-28`). Guard,
recusa sob personificação (`:29-34`), validação do id (`:36-42`) e regra do último método (`:44-49`) ficam como
estão.

### 4.2 Validação na borda

N/A. A rota não lê corpo; o id passa por `parseSignInMethodId` (`:36`).

### 4.3 Persistência

N/A.

### 4.4 Erros

| situação | status | `error.code` | antes | depois |
|----------|--------|--------------|-------|--------|
| desvínculo recusado pelo Firebase | 500 | `ACCOUNT_UPDATE_FAILED` | igual | igual, sem nova tentativa do desvínculo |
| devolução falha uma vez e passa na segunda | 204 | - | 500, conta sem e-mail, sessões vivas | 204, e-mail devolvido, sessões revogadas |
| devolução falha nas duas tentativas | 500 | `ACCOUNT_UPDATE_FAILED` | sem revogação, sem log | sessões revogadas, `logEvent` emitido |

Nenhum código novo, então nada entra em `apiErrors`.

## 5. Front-end

N/A em código. Efeito observável descrito em §1.3.

## 6. Autorização e segurança

- Personificação: a rota recusa antes de qualquer chamada (`route.ts:29-34`), e o teste de `:288-299` continua
  provando isso. A nova tentativa não abre caminho novo.
- Revogação na falha: a senha saiu de qualquer forma, e no caminho feliz o desvínculo da senha encerra todas as
  sessões (`docs/SECURITY.md:12`, mesma regra da troca e da definição de senha). Sem a revogação, uma sessão aberta
  com a senha removida continua válida, que é o oposto do que a pessoa pediu. `revokeUserSessions` engole o
  próprio erro (`packages/auth/server.ts:330-336`), então não cria um caminho de falha novo.
- Dado pessoal no log: o e-mail não entra. Os campos são `uid` (pseudônimo, mesmo tratamento de `actorUid` em
  `audit-recorder.ts:164`), `requestId`, `reason` (código do Admin SDK ou nome do erro) e `attempts`. O teste
  confere que nenhuma chamada a `logEvent` contém o e-mail nem a mensagem do erro, como
  `apps/api/__tests__/userMergeArchivedProfile.test.ts:149-156` já faz.
- Reparo manual: o `uid` do log aponta a conta no console do Firebase; o endereço a devolver está no evento
  `account.signInMethod.unlink` da trilha com o mesmo `requestId` (`route.ts:63-74`, persistido em
  `audit-recorder.ts:108`).
- Rate limit: a rota não está na lista do Arcjet (`docs/SECURITY.md:158`), e o pior caso continua sendo uma
  chamada extra ao Admin SDK por requisição que falhou.

## 7. Testes (Vitest, de rota, com os colaboradores mockados)

Nível: handler da rota com `vi.mock` de `@repo/auth/server` (`getAuthInstance` → `{ updateUser }`), do resolvedor
do ator, do repositório, do recorder de auditoria e, novo neste arquivo, de `@repo/shared/utils/helpers/log`, no
molde de `userMergeArchivedProfile.test.ts:43-45`. Sem emulador: o objeto do teste é a ordem e a contagem de
chamadas da rota, e o comportamento do Firebase que ela supõe já foi medido à mão (§1.1). Sem espera entre
tentativas, a suíte não fica mais lenta.

### 7.1 `apps/api/__tests__/accountSignInMethodsRoute.test.ts`

Infra do arquivo:

- `logEventMock` no `vi.hoisted` (`:8-20`), na lista de `mockReset` do `beforeEach` (`:136-144`) e num
  `vi.mock("@repo/shared/utils/helpers/log", () => ({ logEvent: (...args) => logEventMock(...args) }))`.

Caso que muda, `:252-268` ("registra o desvínculo da senha mesmo quando a devolução do e-mail falha"):

- hoje usa `mockRejectedValueOnce` uma vez e afirma `revokeUserSessionsMock).not.toHaveBeenCalled()` (`:267`).
  Com a nova tentativa, a segunda devolução cai no `mockResolvedValue` padrão (`:147`) e a rota responde 204, então
  o caso falharia. A asserção de `:267` fixa exatamente o defeito que esta tarefa corrige; o caso não se afrouxa,
  passa a descrever o contrato novo da falha persistente:
  - `updateUserMock.mockResolvedValueOnce({ uid }).mockRejectedValue({ code: "auth/internal-error", message:
    "owner@example.com is unavailable" })`;
  - 500 `ACCOUNT_UPDATE_FAILED`;
  - `updateUserMock` chamado 3 vezes: o desvínculo e duas devoluções iguais (`{ email, emailVerified: true }`);
  - trilha gravada com `changedFields: ["password"]`;
  - `revokeUserSessionsMock` chamado com o `uid`, depois da última devolução (`invocationCallOrder`);
  - `logEventMock` chamado com `("account", "password-unlink-email-restore-failed", { uid: OWNER_UID,
    requestId: null, reason: "auth/internal-error", attempts: 2 })`;
  - `JSON.stringify(logEventMock.mock.calls)` não contém `OWNER_EMAIL` nem a mensagem do erro.
  - Título novo: "revoga as sessões e registra o uid quando a devolução do e-mail falha nas duas tentativas".

Casos novos:

| caso | arranjo | espera |
|------|---------|--------|
| devolução falha uma vez e passa na segunda | `mockResolvedValueOnce` (desvínculo), `mockRejectedValueOnce` (1ª devolução), padrão resolve a 2ª | 204; `updateUser` 3 vezes, 2ª e 3ª com `{ email, emailVerified: true }`; revogação depois da 3ª; `logEventMock` não chamado |
| desvínculo da senha recusado | `mockRejectedValue` em todas | 500 `ACCOUNT_UPDATE_FAILED`; `updateUser` 1 vez (o desvínculo não se repete); sem trilha, sem revogação, sem log |
| caminho feliz da senha não repete | caso existente `:174-195` | acrescentar `expect(updateUserMock).toHaveBeenCalledTimes(2)` e `logEventMock` não chamado |

`requestId: null` porque os headers do teste (`:66-71`) não trazem `x-request-id` e `requestIdFrom` devolve
`null` nesse caso (`packages/shared/utils/helpers/request-id.ts:10-11`). O `logEvent` real descarta `null`
(`log.ts:38-39`), mas o mock vê o objeto inteiro.

### 7.2 Prova de que os testes pegam o defeito

Contra a rota de `4b0be90`: "falha uma vez e passa" recebe 500 em vez de 204; "falha nas duas tentativas" vê 2
chamadas a `updateUser` em vez de 3, nenhuma revogação e nenhum log. O `/test` deve medir isso trocando a rota
pela de `4b0be90` e rodando o arquivo.

### 7.3 Suítes a rodar

`pnpm --filter api test` (o arquivo inteiro e o resto da api), `pnpm --filter api typecheck`, `pnpm check` e o
`pnpm test` da raiz, que gateia o build.

## 8. O que o `/test` vai ter de percorrer

Diff sem UI: nenhuma passada de `agent-browser` (`.claude/cycle-policy.md`, §3.1).

- Rodar as suítes de §7.3 e a prova de §7.2.
- 🔒 Falha real da devolução no produto: exige injetar falha no Admin SDK entre as duas chamadas. Não reprovar
  por isso; o contrato fica no teste de rota.
- 🔒 Sequência no navegador depois do 500 com revogação (alerta, 401, ida ao login): mesmo motivo.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Devolução passageira não deixa a conta sem e-mail**
  Quando a primeira chamada que devolve `email` e `emailVerified` falha e a segunda passa, `DELETE
  /account/sign-in-methods/password` responde 204, sem corpo. As duas devoluções levam o mesmo `email` e o mesmo
  `emailVerified` lidos antes do desvínculo, as sessões são revogadas depois da devolução que passou e nenhum
  `logEvent` é emitido.

- [ ] **Falha persistente revoga as sessões**
  Quando a devolução falha nas duas tentativas, `revokeUserSessions` é chamado com o `uid` do titular, depois da
  última tentativa. A senha já saiu, e o efeito de segurança do desvínculo (encerrar as sessões) acontece como no
  caminho feliz. Uma falha da própria revogação não muda a resposta, porque `revokeUserSessions` engole o erro.

- [ ] **Falha persistente responde com o código que já existe**
  A resposta é `500` com `{ "error": { "code": "ACCOUNT_UPDATE_FAILED" } }`, sem código novo e sem mudança em
  `apiErrors`. O evento `account.signInMethod.unlink` continua gravado na trilha, com `changedFields:
  ["password"]`, porque o desvínculo aconteceu.

- [ ] **Falha persistente fica registrada sem dado pessoal**
  A rota emite `logEvent("account", "password-unlink-email-restore-failed", ...)` com `uid`, `requestId`,
  `reason` e `attempts: 2`. O `reason` é o código do Admin SDK (por exemplo `auth/internal-error`) ou o nome do
  erro. O e-mail da conta e a mensagem do erro não aparecem em nenhuma chamada a `logEvent`.

- [ ] **Só a devolução é repetida**
  Se o próprio desvínculo (`providersToUnlink`) falha, a rota responde `500 ACCOUNT_UPDATE_FAILED` depois de uma
  única chamada ao Admin SDK, sem trilha, sem revogação e sem log. Desvincular o Google segue igual: uma chamada,
  204 e nenhuma revogação.

- [ ] **Caminho feliz da senha inalterado**
  Sem falha, a rota chama o Admin SDK exatamente duas vezes (desvínculo e devolução), grava a trilha, revoga as
  sessões depois da devolução e responde 204, sem log.

- [ ] **Recusas anteriores ao desvínculo inalteradas**
  Personificação (`403 AUTH_REQUEST_IMPERSONATION_FORBIDDEN`), titular divergente (403), id inválido ou provedor
  não vinculado (`404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`) e último método (`409 ACCOUNT_SIGN_IN_METHOD_LAST`)
  respondem como antes, sem nenhuma chamada a `updateUser`.

- [ ] **Teste rápido e prova contra a versão anterior**
  O arquivo de teste da rota não espera tempo real entre tentativas. Com a rota de `4b0be90`, os dois casos de
  falha da devolução falham; com a rota nova, passam.

- [ ] **Documentação de segurança atualizada**
  A entrada "Métodos de login" de `docs/SECURITY.md` diz que a devolução é tentada duas vezes, que na falha
  persistente as sessões são encerradas e a rota responde `500 ACCOUNT_UPDATE_FAILED`, e que o log traz `uid` e
  `requestId` para cruzar com o evento da trilha.

## 10. Blueprint técnico

### 10.1 `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`, pseudo-diff

```ts
 import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
 import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
 import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
+import { logEvent } from "@repo/shared/utils/helpers/log";
 import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
 import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
 import {
     hasProvider,
     PASSWORD_PROVIDER_ID,
 } from "@/(shared)/lib/auth-providers";
 ...
+import { adminAuthErrorReason } from "@/(shared)/lib/toolkit-error-codes";

 const NO_CONTENT = 204;
+const ADDRESS_RESTORE_ATTEMPTS = 2;

 function errorResponse(code: string, status: number) { ... }

+type AddressRestoreResult = { restored: true } | { restored: false; reason: string };
+
+/**
+ * The Admin SDK already retries 503s and dropped connections. Anything else gets one more
+ * immediate try here: a failed restore leaves the account without its address, and the
+ * caller cannot repeat the request because the password is already gone.
+ */
+async function restoreUnlinkedAddress(
+    uid: string,
+    address: { email: string; emailVerified: boolean }
+): Promise<AddressRestoreResult> {
+    let reason = "unknown";
+    for (let attempt = 1; attempt <= ADDRESS_RESTORE_ATTEMPTS; attempt += 1) {
+        try {
+            await getAuthInstance().updateUser(uid, address);
+            return { restored: true };
+        } catch (error) {
+            reason = adminAuthErrorReason(error);
+        }
+    }
+    return { restored: false, reason };
+}

 export const DELETE = requireCommonPanelApi<RouteIdParamsContext>(
     async (req, ctx) => {
         ... (inalterado até :78)

-        const email = ctx.user.email;
-        if (email) {
-            // Unlinking the password also clears ... (comentário de :82-84)
-            try {
-                await auth.updateUser(ctx.user.uid, {
-                    email,
-                    emailVerified: ctx.user.emailVerified,
-                });
-            } catch {
-                return errorResponse(
-                    "ACCOUNT_UPDATE_FAILED",
-                    HTTP_STATUS.INTERNAL_SERVER_ERROR
-                );
-            }
-        }
-
-        // Firebase treats the restored address as an e-mail change and revokes every
-        // refresh token, so the password unlink always ends every session, this one too.
-        await revokeUserSessions(ctx.user.uid);
-
-        return new Response(null, { status: NO_CONTENT });
+        // Unlinking the password also clears the account's address and its verified
+        // flag in Firebase. Put them back, or the account loses its e-mail and a
+        // password set later never becomes a sign-in method.
+        const email = ctx.user.email;
+        const restore: AddressRestoreResult = email
+            ? await restoreUnlinkedAddress(ctx.user.uid, {
+                  email,
+                  emailVerified: ctx.user.emailVerified,
+              })
+            : { restored: true };
+
+        // The password is gone either way, so every session ends, this one too. Firebase
+        // already revokes the refresh tokens when the address comes back; this call makes
+        // it hold when the address does not.
+        await revokeUserSessions(ctx.user.uid);
+
+        if (!restore.restored) {
+            logEvent("account", "password-unlink-email-restore-failed", {
+                uid: ctx.user.uid,
+                requestId: requestIdFrom(req),
+                reason: restore.reason,
+                attempts: ADDRESS_RESTORE_ATTEMPTS,
+            });
+            return errorResponse(
+                "ACCOUNT_UPDATE_FAILED",
+                HTTP_STATUS.INTERNAL_SERVER_ERROR
+            );
+        }
+
+        return new Response(null, { status: NO_CONTENT });
     }
 );
```

Pontos de atenção para o `/develop`:

- a função local usa `getAuthInstance()` em vez de receber o `auth` do handler; o mock do teste (`:39-42`)
  devolve o mesmo `updateUserMock` nos dois casos. Passar `auth` como parâmetro também serve, desde que a
  assinatura fique simples;
- `noAwaitInLoops` está desligado no preset (`node_modules/ultracite/config/core/biome.jsonc:281`), então o
  `await` dentro do `for` passa no `pnpm check`. `noExcessiveCognitiveComplexity` está ligado (`:127`): extrair a
  função é o que mantém o handler dentro do limite;
- conta sem `email` continua pulando a devolução e revogando (comportamento de hoje, `route.ts:81` e `:100`);
- o comentário de `:82-84` se mantém, os de `:98-99` são reescritos. Nenhum comentário cita o fluxo
  (`.claude/rules/code-comments.md`).

### 10.2 Exemplos

Falha persistente:

```http
DELETE /account/sign-in-methods/password
x-request-id: 3f0c...

HTTP/1.1 500
{ "error": { "code": "ACCOUNT_UPDATE_FAILED" } }
```

Linha de log (formato de `log.ts:56`):

```text
[account] password-unlink-email-restore-failed uid=<uid> requestId=3f0c... reason=auth/internal-error attempts=2
```

Recuperação na segunda tentativa: `204`, sem corpo, sem linha de log.

### 10.3 Teste

Ver §7.1. Ordem dentro do `describe("DELETE ...")`: o caso de "falha uma vez e passa" logo depois do caminho feliz
da senha; o caso reescrito de `:252` no mesmo lugar; o de "desvínculo da senha recusado" ao lado do de `:239`.

### 10.4 i18n

N/A. `ACCOUNT_UPDATE_FAILED` já existe nos três idiomas (`utils.ts:52`, `:198`, `:346`).

### 10.5 Documentação

`docs/SECURITY.md:12`, depois de "...a rota chama `revokeUserSessions` em seguida para deixar isso explícito, e a
tela sai da conta.", acrescentar:

> Se a devolução falhar, a rota tenta de novo uma vez. Se falhar outra vez, encerra as sessões mesmo assim,
> responde `500 ACCOUNT_UPDATE_FAILED` e registra `[account] password-unlink-email-restore-failed` com o `uid` e
> o `requestId`, sem o endereço. O endereço a devolver está no evento `account.signInMethod.unlink` da trilha,
> gravado com o mesmo `requestId`.

### 10.6 Ordem de implementação e de commit

1. `apps/api`: rota + teste no mesmo commit, `fix(api): retry the address restore when unlinking the password`;
2. `docs/SECURITY.md`: commit próprio de documentação (escopo a critério do `/review`);
3. `docs/features/password-unlink-email-restore/`: último, `docs(features): password-unlink-email-restore`.

Compartilha a PR com `google-sign-in-error-contract`; os commits desta tarefa vêm depois dos dela e não tocam
`auth/sign-in/google/route.ts`, `auth.schema.ts`, os testes novos daquela tarefa nem `specs/`.

### 10.7 Env e configuração

Nenhuma.

## Pré-requisitos manuais de infra

Nenhum. Sem env, sem serviço, sem regra do Firestore, sem índice, sem mudança no projeto Firebase.

## 11. Perguntas em aberto (decididas pela rodada autônoma)

1. **Quantas tentativas de devolução, e com espera?**
   Opções: (a) 2 tentativas, sem espera; (b) 3 tentativas, sem espera; (c) espera curta injetável entre
   tentativas.
   **Adotada: (a).** É a correção mínima que o backlog recomenda ("tentar a devolução de novo",
   `specs/BACKLOG.md:1535`). O Admin SDK já repete 503 e queda de conexão com espera (§1.2), então a espera na
   rota se somaria à dele no pior caso, e um relógio injetável só para isso é estrutura que o repo não tem. A
   constante deixa trocar para 3 sem mexer na lógica.

2. **Revogar as sessões depois de esgotar as tentativas?**
   Opções: (a) revogar sempre que a senha saiu; (b) manter como hoje, sem revogar na falha.
   **Adotada: (a).** O desvínculo da senha encerra todas as sessões no caminho feliz, como a troca e a
   definição de senha (`docs/SECURITY.md:12`; D5 em `docs/features/linked-sign-in-methods/analyze/plan.md:4`).
   Na falha a senha também saiu, e sem revogação uma sessão aberta com ela continua valendo. O custo é a pessoa
   ir para o login em vez de ficar na aba Segurança (§1.3); de lá ela entra com o Google, o único método que
   restou. Descartada (b): deixa a sessão de quem conhecia a senha viva, que é o motivo mais provável de alguém
   tirar a senha.

3. **Que resposta dar quando a devolução falha de vez?**
   Opções: (a) manter `500 ACCOUNT_UPDATE_FAILED`; (b) responder 204, já que o desvínculo aconteceu; (c) código
   novo, por exemplo `ACCOUNT_SIGN_IN_METHOD_EMAIL_RESTORE_FAILED`, com copy que diga que a senha saiu e o e-mail
   precisa de suporte.
   **Adotada: (a).** Sem código novo nem i18n, como pede o escopo da rodada, e ainda honesto: algo falhou ao
   salvar a conta. O "Tente de novo" da copy fica impreciso nesse caso raro, porque repetir dá 404. (b) esconde
   uma conta sem e-mail atrás de uma mensagem de sucesso; (c) é o caminho certo se a falha aparecer no log com
   alguma frequência, e custa as chaves nos três idiomas mais o tratamento no app.

4. **Registrar o `uid` agora ou esperar o coletor (E1)?**
   Opções: (a) `logEvent` estruturado agora; (b) esperar `observability-logging`.
   **Adotada: (a).** `logEvent` é o padrão vigente para falha de chamada ao Admin SDK (§1.4), não precisa de
   serviço nem de env, e o coletor, quando chegar, recebe a linha sem mudança aqui. O backlog ligava o registro
   ao E1 porque, quando o achado foi escrito, "as rotas da conta não têm log"; o helper já existia e só não era
   usado nessas rotas.

## 12. Decisões tomadas sem perguntar

| decisão | alternativa descartada | por quê |
|---------|------------------------|---------|
| repetir só a devolução, nunca o desvínculo | repetir o desvínculo também | uma falha no desvínculo deixa a conta intacta e o "Tente de novo" funciona; o problema está só na segunda chamada |
| repetir em qualquer erro | repetir só em códigos "transitórios" | os transitórios clássicos o SDK já repete; separar os demais exigiria uma lista de códigos do Admin SDK sem fonte no repo, e uma tentativa a mais num erro permanente custa uma chamada |
| função local no arquivo da rota | helper em `(shared)/lib` | um único chamador; `.claude/cycle-policy.md` §3 pede mudança mínima |
| campo `uid` no log | `userId` (id do perfil) | o reparo é no Firebase Auth, que se procura pelo `uid`; `actorUid` já entra em log em `audit-recorder.ts:164` |
| sem o e-mail no log | logar o endereço para facilitar o reparo | dado pessoal fora do log (`log.ts:16-21`, `specs/observability-logging.md:257`); o endereço já está na trilha, achável pelo `requestId` |
| reescrever o teste de `:252` | manter e criar outro ao lado | a asserção `not.toHaveBeenCalled()` de `:267` descreve o defeito; mantê-la deixaria dois contratos opostos no mesmo arquivo |

## 13. Riscos

- **Comportamento do Firebase não coberto pela suíte**: a rota supõe que o desvínculo apaga o e-mail e que a
  devolução revoga os tokens. Continua medido só à mão (🟢 de `specs/BACKLOG.md:1539`). Se o Firebase mudar, o
  teste de rota não percebe.
- **Login pelo Google numa conta sem e-mail**: com a revogação na falha, a pessoa precisa entrar de novo pelo
  Google com a conta ainda sem endereço. O vínculo do Google é pelo id federado, mas o comportamento do
  `signInWithIdp` nesse estado não foi medido. A alternativa (não revogar) também deixava a conta nesse estado,
  só que logada.
- **Latência no pior caso**: com o Auth respondendo 503 de forma contínua, cada chamada já espera pelas
  tentativas do SDK (§1.2); a segunda tentativa da rota dobra essa espera na falha persistente. A duração
  resultante contra o limite da função na Vercel não foi medida.
- **Copy imprecisa**: "Tente de novo" segue aparecendo no caso raro em que repetir não resolve (§11, pergunta 3).
