# Plano: contrato de erro de `POST /auth/sign-in/google`

Tarefa direta, sem spec. Origem: o achado 🟡 "`POST /auth/sign-in/google` devolve a mensagem crua do provedor e
lê o corpo sem validação" (`specs/BACKLOG.md:1496`), que a auditoria pós-PR #50 indicou como a próxima tarefa
direta (`specs/BACKLOG.md:246-266` e `:281-282`). Plano feito em rodada autônoma do `/cycle`: a §11 traz as
perguntas já com a opção adotada e a §12 lista as decisões tomadas sem perguntar, cada uma com a alternativa
descartada.

Referências `arquivo:linha` conferidas neste checkout (`4b0be90`) em 2026-10-19.

## 0. Sumário do desenho

A rota do Google passa a seguir o mesmo molde que `POST /auth/sign-in` ganhou na PR #46
(`apps/api/app/(routes)/auth/sign-in/route.ts:15-43`):

1. o corpo é lido por `parseRequestJson` e validado por um schema Zod novo, `googleSignInSchema`, em
   `apps/api/(shared)/validation/auth.schema.ts`. Corpo vazio, JSON inválido ou `idToken` ausente respondem
   `400 VALIDATION_FAILED` sem chamar o provedor;
2. toda recusa do Identity Toolkit vira `{ error: { code } }`, mapeada por `mapPasswordCheckMessageToCode` com
   fallback `AUTH_INVALID_CREDENTIALS`, e o status vem de `statusForAuthErrorCode`: `429` para
   `USERS_AUTH_RATE_LIMITED` e `400` para o resto. A mensagem do provedor (`USER_DISABLED`,
   `INVALID_IDP_RESPONSE`, a de chave de API ausente) deixa de aparecer na resposta.

O `404 USERS_NOT_FOUND` sem perfil (`google/route.ts:19-24`, da PR #50) e a forma de sucesso
`{ session, user }` (`:26-33`) ficam como estão.

Só `apps/api` muda: um arquivo de rota, um schema e um arquivo de teste novo. Nenhum código novo em `apiErrors`,
nenhuma mudança em `packages/sdk`, `apps/app` ou `apps/web`. Sem env nova e sem pré-requisito manual de
infraestrutura.

## 1. Contexto

### 1.1 Problema, pela leitura do código

`apps/api/app/(routes)/auth/sign-in/google/route.ts`:

- `:11` faz `const { idToken, requestUri } = await req.json();` antes do `try` (`:15-39`). Com corpo vazio ou
  JSON inválido, `Request.json()` lança `SyntaxError` e o handler responde 500. O mecanismo foi medido em
  2026-10-16 (`specs/BACKLOG.md:1496`). Não há validação de tipo: `idToken` numérico ou ausente chega ao
  `identitySignInWithGoogleIdToken` (`apps/api/(shared)/lib/firebase-identity-toolkit.ts:204-221`), que o
  interpola em `encodeURIComponent` e manda ao provedor.
- `:35-37` responde `{ error: e.message }` com 401 para qualquer `IdentityToolkitError`. O corpo é uma string,
  e não `{ error: { code } }` (regra de ouro 3). O `/test` da PR #50 mediu `{ "error": "USER_DISABLED" }` para
  conta desativada, no emulador (`docs/features/admin-archive-access-revocation/test/report.md:120-122`).
- O mesmo `catch` também devolve, em 401, a mensagem de configuração que `getWebApiKey` lança quando falta a
  chave fora do emulador: `"FIREBASE_WEB_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY is not configured"`
  (`firebase-identity-toolkit.ts:39-51`). É um detalhe de configuração do servidor exposto a quem chama.

### 1.2 Quem consome a rota e o que ele faz com o erro

- SDK: `packages/sdk/src/actions/auth/action.ts:104-115` (`signInWithGoogle`) só repassa o erro do axios; não
  tipa a forma do erro.
- App: `apps/app/shared/lib/googleSignInApi.ts:26-39` chama `exchangeForApiSession` (`:41-79`), que chama o SDK
  em `:55-58`. Se a API recusar, `:35-38` desloga o usuário do popup e relança o mesmo erro (correção da PR
  #50). Os dois formulários tratam o erro igual: `SignInForm.tsx:43-46` e `SignUpFormClient.tsx:46-49` fazem
  `errorAlert(handleClientError(new FormattedError(error, locale)))`.
- `FormattedError.apiResponseMessage` (`packages/shared/utils/helpers/formattedError.ts:60-88`) procura
  `data.error.code` em `apiErrors`. Com o corpo de hoje, `data.error` é string, `data.error.code` é
  `undefined`, não há `data.message`, e o toast mostra `"401 - Unauthorized"` (`:87`). Com
  `{ error: { code } }`, o toast passa a mostrar o texto traduzido do código.
- Nada no repositório depende do 401 desta rota. O interceptor de 401 do SDK (`packages/sdk/src/client/base.ts:81-91`,
  `setInterceptorError`) não é registrado em nenhum lugar (grep sem chamador), e `isSessionRevokedError`
  (`packages/sdk/src/client/sessionAuthority.ts:9-20`) só olha `AUTH_SESSION_REVOKED`.
- `apps/web` e `packages/auth` não chamam esta rota: o `signInWithGoogle` deles é o popup do Firebase client
  (`packages/auth/client.ts:152-157`, `packages/auth/provider.tsx:372-373`). A suíte `apps/e2e` não cita a rota.

### 1.3 A app depende de distinguir "conta desativada" no Google?

Não. Pela app, a conta desativada nunca chega à API: o `signInWithPopup` do Firebase client recusa antes com
`auth/user-disabled`, e o `FormattedError.firebaseAuthMessage` (`formattedError.ts:154-168`) traduz esse
código para "Esta conta foi desativada." (`packages/internationalization/translations/packages/auth/index.ts:16`,
`:55`, `:96`). O `/test` da PR #50 mediu exatamente isso na tela (`test/report.md:154`) e registrou que o
`USER_DISABLED` da API "pela app não chega a acontecer, [...] afeta quem chama a API direto"
(`test/report.md:120-122`). O teste `apps/app/__tests__/googleSignInApi.test.ts:127-135` cobre o popup
recusando com `auth/user-disabled` sem chamar a API.

Por isso a regra do `/auth/sign-in`, um código só para toda recusa do provedor, vale para o Google sem perda
para a app.

### 1.4 Objetivo e corte de MVP

Objetivo: a rota responde só com `error.code` estável, nunca com 500 por corpo ruim e nunca com a mensagem do
provedor.

Corte (tudo entra):

1. corpo validado na borda, com `400 VALIDATION_FAILED` para corpo vazio, JSON inválido e campos fora do schema;
2. recusa do provedor em `{ error: { code } }`, com `AUTH_INVALID_CREDENTIALS` (400) e
   `USERS_AUTH_RATE_LIMITED` (429);
3. teste de rota que cai se a correção for revertida.

Fora do escopo:

- mudar o `/auth/sign-in`, o `toolkit-error-codes.ts` ou o tratamento da chave de API ausente, que é o achado
  🟢 `specs/BACKLOG.md:1464` (ver §13);
- qualquer coisa da spec `social-sign-in-providers` (`deferred`): provedores novos, generalizar a rota,
  `providerId` configurável. A correção mexe só no contrato de erro da rota existente e não toca nos arquivos
  do `contends_on` daquela spec (`specs/social-sign-in-providers.md:11`);
- texto de UI novo, mudança no SDK ou na app;
- trocar o `DEFAULT_REQUEST_URI` (`google/route.ts:8`).

### 1.5 Apps impactados

| App/pacote | Muda? | O quê |
|------------|-------|-------|
| `apps/api` | sim | `auth/sign-in/google/route.ts`, `(shared)/validation/auth.schema.ts`, teste novo |
| `packages/sdk` | não | o tipo `GoogleSignInRequest` (`action.ts:17-20`) já descreve o corpo que o schema aceita |
| `apps/app` | não | o consumidor já lê `error.code` (§1.2) |
| `apps/web` | não | não chama a rota |
| `packages/internationalization` | não | os três códigos já existem nos 3 idiomas (§4.4) |

Área do painel: N/A (rota pública anterior à sessão, `docs/SECURITY.md:24`). Modo de produto: o comportamento
é o mesmo em `subscription` e `simple`. Sem dependência de assinatura.

## 2. Dados (Firestore)

N/A. A rota não muda o acesso ao Firestore; o `getMergedUserByUid` (`google/route.ts:17`) continua igual.

## 3. Contrato `@repo/sdk`

Sem mudança. `GoogleSignInRequest` (`packages/sdk/src/actions/auth/action.ts:17-20`) tem `idToken: string` e
`requestUri: string`, e o schema aceita esse corpo. A resposta de sucesso não muda. O erro nunca foi tipado no
SDK, então quem chama pela fachada não quebra.

Para quem chama a API direto, o contrato de erro muda: o status de recusa do provedor sai de 401 para 400 (ou
429) e o corpo sai de string para `{ error: { code } }`. É a mesma mudança que a PR #46 fez no `/auth/sign-in`.

## 4. API

### 4.1 Rota e guard

`POST /auth/sign-in/google`, sem guard, como hoje: é superfície anterior à sessão (`docs/SECURITY.md:24`) e
está no rate limit do proxy (`apps/api/proxy.ts:56`). Nada disso muda.

### 4.2 Validação na borda

Schema novo em `apps/api/(shared)/validation/auth.schema.ts`, ao lado de `signInSchema` (`:32-35`):

- `idToken`: `z.string().min(1).max(GOOGLE_ID_TOKEN_MAX)`, com `GOOGLE_ID_TOKEN_MAX = 4096`. É o mesmo teto que
  `account.schema.ts:15` usa para o ID token Google da reautenticação (`REAUTH_ID_TOKEN_MAX`).
- `requestUri`: `z.string().url().max(REQUEST_URI_MAX).optional()`, com `REQUEST_URI_MAX = 2048`. Opcional
  porque a rota já tem default (`google/route.ts:8`, `:13`) e porque `googleSignInProfile.test.ts:46-52`
  manda o corpo sem `requestUri`. A app manda `window.location.origin` ou `"http://localhost"`
  (`googleSignInApi.ts:50-53`), e os dois passam em `.url()`.
- objeto não estrito, como `signInSchema`: chave a mais é descartada.

Parser: `export const parseGoogleSignIn = (body: unknown) => parseWith(googleSignInSchema, body);`, que reusa o
`validationFailed()` de `auth.schema.ts:64-68`. O tipo `GoogleSignInInput` segue o padrão de `:45-58`.

### 4.3 Persistência

N/A.

### 4.4 Erros

| situação | status | `error.code` | já existe em `apiErrors`? |
|----------|--------|--------------|---------------------------|
| corpo vazio ou JSON inválido | 400 | `VALIDATION_FAILED` | sim, `translations/packages/shared/utils.ts:95` (pt-br), `:242` (en), `:390` (es) |
| `idToken` ausente, vazio, não string ou acima de 4096 | 400 | `VALIDATION_FAILED` | sim |
| `requestUri` presente e não URL, ou acima de 2048 | 400 | `VALIDATION_FAILED` | sim |
| provedor recusa por limite (`TOO_MANY_ATTEMPTS*`, `TOO_MANY_REQUESTS`) | 429 | `USERS_AUTH_RATE_LIMITED` | sim, `:101`, `:248`, `:396` |
| qualquer outra recusa do provedor (`USER_DISABLED`, `INVALID_IDP_RESPONSE`, resposta sem `idToken`, chave de API ausente) | 400 | `AUTH_INVALID_CREDENTIALS` | sim, `:10`, `:157`, `:302` |
| token aceito, sem perfil vivo | 404 | `USERS_NOT_FOUND` | sim (inalterado) |
| erro que não é `IdentityToolkitError` | propaga | (500 do Next) | inalterado, como `sign-in/route.ts:32-34` |
| estouro do rate limit do proxy | 429 | `AUTH_RATE_LIMITED` | inalterado (`proxy.ts`) |

Nenhum código novo. O `/i18n-sync` não precisa rodar.

## 5. Front-end

N/A. Nenhum arquivo de `apps/app` ou `apps/web` muda (§1.2). O efeito visível é indireto: se um dia a API
recusar o token depois do popup, o toast da tela de login e de cadastro passa de `"401 - Unauthorized"` para o
texto de `AUTH_INVALID_CREDENTIALS` (§11, P1, discute esse texto).

## 6. Autorização e segurança

- **Mensagem do provedor fora da resposta.** A resposta deixa de ecoar `e.message`, o que também esconde a
  mensagem de configuração de `getWebApiKey` (§1.1). Nenhum log novo; se o `/develop` sentir falta de um, ele
  não pode levar a mensagem do provedor nem o token (`toolkit-error-codes.ts:93-102` explica por quê).
- **Enumeração.** No Google, quem chama já provou a posse da conta Google ao apresentar um ID token válido, então
  o risco de enumeração é menor que no e-mail e senha. O código único continua sendo a escolha mais simples e é
  o que a app espera (§1.3). Se um fork precisar distinguir conta desativada, o ponto de extensão é o fallback
  de `mapPasswordCheckMessageToCode`.
- **Impersonação.** N/A: rota anterior à sessão.
- **Rate limit.** Inalterado (`proxy.ts:56`). O 429 do provedor ganha o mesmo `USERS_AUTH_RATE_LIMITED` que o
  `/auth/sign-in` devolve.

## 7. Testes (Vitest, de rota, com os colaboradores mockados)

Nível: handler de rota com `vi.mock` do Identity Toolkit e do `user-merge`, como
`apps/api/__tests__/authSignInRoute.test.ts:20-30`. É o mais barato que prova status e corpo. Nenhum teste
precisa de emulador: a rota não muda acesso ao Firestore, e o mapeamento é função pura da mensagem.

### 7.1 `apps/api/__tests__/authSignInGoogleRoute.test.ts` (novo)

Mocks: `@/(shared)/lib/firebase-identity-toolkit` com `IdentityToolkitError` falso (mesma classe de
`authSignInRoute.test.ts:10-18`) e `identitySignInWithGoogleIdToken`; `@/(shared)/lib/user-merge` com
`getMergedUserByUid`. `parseRequestJson`, `auth.schema.ts` e `toolkit-error-codes.ts` rodam de verdade.

| id | caso | esperado | falha hoje? |
|----|------|----------|-------------|
| GC1 | sem corpo | 400 `VALIDATION_FAILED`, provedor não chamado | sim (lança `SyntaxError`) |
| GC2 | JSON inválido (`"{idToken:"`) | idem | sim |
| GC3 | `{}` | idem | sim (provedor chamado com `undefined`) |
| GC4 | `idToken` vazio, numérico, acima de 4096 | idem (`it.each`) | sim |
| GC5 | `requestUri` que não é URL | idem | sim |
| GC6 | `idToken` válido sem `requestUri` | provedor chamado com `(idToken, "http://localhost:3000")`, 200 | não (garante o default) |
| GC7 | `idToken` e `requestUri` válidos | provedor chamado com os dois, 200 | não |
| GC8 | provedor lança `USER_DISABLED` | 400 `{ error: { code: "AUTH_INVALID_CREDENTIALS" } }`, corpo sem a string `USER_DISABLED`, `getMergedUserByUid` não chamado | sim (401 com string) |
| GC9 | provedor lança `INVALID_IDP_RESPONSE : ...` | 400 `AUTH_INVALID_CREDENTIALS` | sim |
| GC10 | provedor lança a mensagem de chave ausente | 400 `AUTH_INVALID_CREDENTIALS`, corpo sem `FIREBASE_WEB_API_KEY` | sim |
| GC11 | provedor lança `TOO_MANY_ATTEMPTS_TRY_LATER` | 429 `USERS_AUTH_RATE_LIMITED` | sim |
| GC12 | provedor lança `Error("network down")` | a promessa rejeita com `network down` | não (garante que só `IdentityToolkitError` é tratado) |
| GC13 | sem perfil | 404 `USERS_NOT_FOUND`, sem `session` | não (já coberto em `googleSignInProfile.test.ts`, repetido aqui no nível do `user-merge` mockado) |
| GC14 | sucesso | 200 `{ session: { idToken, refreshToken, expiresIn }, user }` | não |

### 7.2 Suítes existentes

- `apps/api/__tests__/googleSignInProfile.test.ts` não muda e tem de continuar passando: o corpo dele é
  `{ idToken: "google-id-token" }` (`:46-52`), válido pelo schema. O mock de `IdentityToolkitError` ali é
  `class extends Error {}` (`:19-23`), e nenhum caso dele exercita o `catch`.
- `apps/app/__tests__/googleSignInApi.test.ts` não muda; o caso `:95-107` já usa o corpo novo
  (`{ error: { code: "USERS_NOT_FOUND" } }`).

### 7.3 Prova de que os testes pegam o defeito

O `/develop` reverte só `google/route.ts` para `4b0be90` e roda `authSignInGoogleRoute.test.ts`: GC1 a GC5 e
GC8 a GC11 têm de cair. Registra os números no `handoff.md`.

## 8. O que o `/test` vai ter de percorrer

O diff é só de API e não tem superfície de UI, então a passada de `agent-browser` não se aplica
(`.claude/cycle-policy.md` §3.1). O `/test`:

- roda `pnpm --filter api test` (inclui o arquivo novo) e o `pnpm test` da raiz;
- confere por leitura que `apps/app` e `packages/sdk` ficaram fora do diff;
- se quiser medir contra o provedor real, a forma mais barata é o emulador do Auth com a API de pé: `POST` sem
  corpo (esperado 400 `VALIDATION_FAILED`) e com o token de uma conta desativada (esperado 400
  `AUTH_INVALID_CREDENTIALS`). É opcional: o mapeamento é função da mensagem e o teste de rota já prova o
  contrato. A medição pela tela não acrescenta nada, porque o popup recusa a conta desativada antes (§1.3).

Nada aqui depende de infra externa; nenhum critério deve terminar 🔒.

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **CA1. Corpo vazio ou JSON inválido responde 400 `VALIDATION_FAILED`**
  `POST /auth/sign-in/google` sem corpo, ou com um corpo que não é JSON, responde 400 com
  `{ error: { code: "VALIDATION_FAILED" } }` e não chama o Identity Toolkit. Antes da correção, o mesmo pedido
  terminava em 500, porque `req.json()` ficava fora do `try`.

- [ ] **CA2. Campos fora do schema respondem 400 `VALIDATION_FAILED`**
  `{}`, `idToken` vazio, `idToken` que não é string, `idToken` com mais de 4096 caracteres e `requestUri`
  presente que não é URL (ou passa de 2048 caracteres) respondem 400 `VALIDATION_FAILED`, sem chamar o
  provedor. Chaves a mais no objeto são ignoradas, como no `/auth/sign-in`.

- [ ] **CA3. `requestUri` continua opcional**
  Um corpo só com `idToken` válido chega ao provedor com `requestUri` igual a `http://localhost:3000`, o
  default de hoje. Com `requestUri` válido, o provedor recebe o valor enviado. O formato do corpo que a app
  manda (`window.location.origin` ou `http://localhost`) é aceito.

- [ ] **CA4. Conta desativada responde 400 `AUTH_INVALID_CREDENTIALS`, sem a mensagem do provedor**
  Quando o Identity Toolkit recusa com `USER_DISABLED`, a rota responde 400 com
  `{ error: { code: "AUTH_INVALID_CREDENTIALS" } }`. O corpo não contém a string `USER_DISABLED`, não traz
  `session` e o `getMergedUserByUid` não é chamado. Antes da correção a resposta era 401 com
  `{ "error": "USER_DISABLED" }`.

- [ ] **CA5. Qualquer outra recusa do provedor cai no mesmo código**
  `INVALID_IDP_RESPONSE`, a resposta do provedor sem `idToken` ("Invalid response from identity provider") e a
  falta de `FIREBASE_WEB_API_KEY` fora do emulador respondem 400 `AUTH_INVALID_CREDENTIALS`. Nenhuma delas ecoa
  a mensagem original no corpo; em particular, o nome da variável de ambiente deixa de aparecer na resposta.

- [ ] **CA6. Limite do provedor responde 429 `USERS_AUTH_RATE_LIMITED`**
  Uma recusa com `TOO_MANY_ATTEMPTS_TRY_LATER` ou `TOO_MANY_REQUESTS` responde 429 com
  `{ error: { code: "USERS_AUTH_RATE_LIMITED" } }`, o mesmo do `/auth/sign-in`. O rate limit do proxy
  (`AUTH_RATE_LIMITED`) continua valendo antes da rota e não muda.

- [ ] **CA7. Erro que não vem do provedor continua propagando**
  Uma falha que não é `IdentityToolkitError` (rede, bug) não é convertida em código de credencial: o handler
  relança, como o `/auth/sign-in` faz. Isso evita mascarar falha de servidor como "credencial incorreta".

- [ ] **CA8. Sucesso e conta sem perfil ficam como estão**
  Token aceito com perfil vivo responde 200 com `{ session: { idToken, refreshToken, expiresIn }, user }`.
  Token aceito sem perfil vivo (conta arquivada) responde 404 `USERS_NOT_FOUND` sem `session`, como desde a PR
  #50. Conta nova continua ganhando um perfil, e conta com perfil não ganha um segundo
  (`googleSignInProfile.test.ts` passa sem mudança).

- [ ] **CA9. A app continua entrando com Google e mostra texto traduzido na recusa**
  `apps/app` e `packages/sdk` não mudam. Uma recusa da API depois do popup passa a mostrar no toast o texto
  de `apiErrors` do código recebido nos 3 idiomas, em vez de `"401 - Unauthorized"`, e o popup continua sendo
  deslogado (`googleSignInApi.ts:35-38`). A conta desativada continua recusada pelo popup com "Esta conta foi
  desativada." antes de chegar à API.

- [ ] **CA10. Antes × depois provado pelos testes**
  Com `google/route.ts` revertido para `4b0be90`, os casos GC1 a GC5 e GC8 a GC11 de
  `authSignInGoogleRoute.test.ts` falham; com a correção, passam todos. `pnpm --filter api test` e o
  `pnpm test` da raiz terminam com exit 0.

## 10. Blueprint técnico

### 10.1 `apps/api/(shared)/validation/auth.schema.ts`, pseudo-diff

```ts
 const EMAIL_MAX = 320;
 const OOB_CODE_MAX = 2048;
+const GOOGLE_ID_TOKEN_MAX = 4096;
+const REQUEST_URI_MAX = 2048;
 ...
 export const signInSchema = z.object({
     email: z.string().trim().max(EMAIL_MAX).email(),
     password: existingPasswordSchema,
 });
+
+export const googleSignInSchema = z.object({
+    idToken: z.string().min(1).max(GOOGLE_ID_TOKEN_MAX),
+    requestUri: z.string().url().max(REQUEST_URI_MAX).optional(),
+});
 ...
 export type SignInInput = z.infer<typeof signInSchema>;
+export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
 ...
 export const parseSignIn = (body: unknown) => parseWith(signInSchema, body);
+
+export const parseGoogleSignIn = (body: unknown) =>
+    parseWith(googleSignInSchema, body);
```

A `apps/api` usa Zod 4 (`apps/api/package.json:34`), onde `z.string().url()` ainda existe (marcado como
legado em favor de `z.url()`). Nenhum schema de `apps/api/(shared)/validation/` valida URL hoje; o `/develop`
escolhe a forma que o Biome e o `typecheck` aceitarem sem aviso e registra no `handoff.md`.

### 10.2 `apps/api/app/(routes)/auth/sign-in/google/route.ts`, depois

```ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    IdentityToolkitError,
    identitySignInWithGoogleIdToken,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapPasswordCheckMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";
import { parseGoogleSignIn } from "@/(shared)/validation/auth.schema";

const DEFAULT_REQUEST_URI = "http://localhost:3000";

export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseGoogleSignIn(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    let session: Awaited<ReturnType<typeof identitySignInWithGoogleIdToken>>;
    try {
        session = await identitySignInWithGoogleIdToken(
            parsed.value.idToken,
            parsed.value.requestUri ?? DEFAULT_REQUEST_URI
        );
    } catch (error) {
        if (!(error instanceof IdentityToolkitError)) {
            throw error;
        }
        const code = mapPasswordCheckMessageToCode(
            error.message,
            "AUTH_INVALID_CREDENTIALS"
        );
        return Response.json(
            { error: { code } },
            { status: statusForAuthErrorCode(code) }
        );
    }

    const user = await getMergedUserByUid(session.localId);

    if (!user) {
        return Response.json(
            { error: { code: "USERS_NOT_FOUND" } },
            { status: HTTP_STATUS.NOT_FOUND }
        );
    }

    return Response.json({
        session: {
            idToken: session.idToken,
            refreshToken: session.refreshToken,
            expiresIn: session.expiresIn,
        },
        user,
    });
}
```

Ponto de atenção: hoje o `getMergedUserByUid` está dentro do `try` (`google/route.ts:15-39`), então um
`IdentityToolkitError` lançado por ele também vira 401. No desenho novo, como no `/auth/sign-in`
(`sign-in/route.ts:25-45`), o `try` cobre só a chamada ao provedor. O `apps/api/(shared)/lib/user-merge.ts` não importa
`firebase-identity-toolkit` (grep sem resultado em `4b0be90`), então não há `IdentityToolkitError` a perder por
ali.

### 10.3 Exemplos

Pedido:

```http
POST /auth/sign-in/google
Content-Type: application/json

{ "idToken": "<google-id-token>", "requestUri": "http://localhost:3000" }
```

Respostas:

```json
// 200
{ "session": { "idToken": "…", "refreshToken": "…", "expiresIn": "3600" }, "user": { "uid": "…" } }

// 400, corpo vazio, JSON inválido ou campo fora do schema
{ "error": { "code": "VALIDATION_FAILED" } }

// 400, recusa do provedor (USER_DISABLED, INVALID_IDP_RESPONSE, chave ausente)
{ "error": { "code": "AUTH_INVALID_CREDENTIALS" } }

// 429, limite do provedor
{ "error": { "code": "USERS_AUTH_RATE_LIMITED" } }

// 404, token aceito sem perfil vivo
{ "error": { "code": "USERS_NOT_FOUND" } }
```

### 10.4 Teste novo

`apps/api/__tests__/authSignInGoogleRoute.test.ts`, no formato de `authSignInRoute.test.ts` (hoisted mocks,
`await import("@/app/(routes)/auth/sign-in/google/route")`, helpers `request(body?)` e `jsonRequest(body)`), com
os casos GC1 a GC14 da §7.1. E-mail de teste no padrão `qa-<feature>@example.com`.

### 10.5 i18n

Nenhuma chave nova.

### 10.6 Documentação

Nenhum documento afirma o 401 ou a string crua desta rota (grep em `docs/*.md`, `README.md`). `docs/SECURITY.md:24`
e `:158` só listam o caminho e continuam certos. As âncoras de linha da rota em `specs/BACKLOG.md:1496` e
`specs/social-sign-in-providers.md:47` vão mudar; quem as atualiza é o `/spec --sync`, não esta tarefa.

### 10.7 Ordem de implementação e de commit

1. `fix(api): validate the Google sign-in body and answer provider refusals by code`
   (`auth.schema.ts`, `google/route.ts`, `authSignInGoogleRoute.test.ts`). Um commit só: o schema não tem uso
   fora da rota, e o teste acompanha a funcionalidade que cobre.
2. `docs(features): google-sign-in-error-contract`, por último.

Sem commit de SDK, app, web ou i18n.

### 10.8 Env e configuração

Nenhuma variável nova, nenhuma mudança de configuração por fork.

## Pré-requisitos manuais de infra

Nenhum. A mudança não cria índice, regra do Firestore, variável de ambiente, webhook nem passo no console do
Firebase. Nada vai para `docs/PRE-PRODUCTION.md`.

## 11. Perguntas em aberto (decididas pela rodada autônoma)

- **P1. Qual código para a recusa do provedor no Google?**
  Opções: (a) `AUTH_INVALID_CREDENTIALS`, o do `/auth/sign-in`; (b) `ACCOUNT_REAUTH_INVALID`, que já existe nos
  3 idiomas com o texto "Não conseguimos confirmar a sua conta Google. Tente de novo."
  (`translations/packages/shared/utils.ts:46`, `:192`, `:340`), mas pertence à reautenticação de `account/password/set/route.ts:58`;
  (c) um código novo, por exemplo `AUTH_GOOGLE_SIGN_IN_FAILED`, com texto próprio nos 3 idiomas.
  **Adotada: (a).** É a recomendação do backlog (`specs/BACKLOG.md:256-259`), segue o molde direto e não toca
  em `packages/internationalization`. O custo é o texto "E-mail ou senha incorretos." aparecer num fluxo do
  Google. Pela app esse caminho é quase inalcançável, porque o popup recusa antes (§1.3), e quem vê o código é
  quem chama a API direto. Se você preferir o texto certo na tela, (c) é a troca limpa: um código, três chaves,
  um commit de i18n.

- **P2. O status da recusa passa de 401 para 400?**
  **Adotada: sim**, por `statusForAuthErrorCode`, como no `/auth/sign-in`. Nenhum cliente do repositório lê o
  401 desta rota (§1.2), e `account/password/set/route.ts:53-54` registra que 401 é reservado a sessão. Quem
  chama a API direto e testava 401 precisa ajustar; a mudança vai na mensagem do commit.

- **P3. `requestUri` obrigatório, como no tipo do SDK?**
  **Adotada: não, continua opcional** com o default de hoje. Tornar obrigatório quebraria
  `googleSignInProfile.test.ts` e qualquer cliente direto que já omite o campo, sem ganho de segurança: o valor
  só é repassado ao provedor.

## 12. Decisões tomadas sem perguntar

| decisão | alternativa descartada | por quê |
|---------|------------------------|---------|
| Reusar `mapPasswordCheckMessageToCode` para o Google | helper novo `mapGoogleSignInMessageToCode` | o comportamento necessário (limite → 429, resto → fallback) é exatamente o dele; o ramo `WEAK_PASSWORD` nunca dispara no `signInWithIdp`. Helper novo seria código duplicado sem caso de uso diferente |
| Schema em `auth.schema.ts`, com `parseWith` | schema inline na rota | é onde mora o `signInSchema` e o `validationFailed()` que dá o `VALIDATION_FAILED` (regra de ouro 6) |
| `try` só em volta do provedor | manter `getMergedUserByUid` dentro do `try` | é o molde do `/auth/sign-in`; o `user-merge` não lança `IdentityToolkitError` (§10.2) |
| Teto de 4096 para `idToken` | sem teto, ou 2048 | é o teto que o repo já usa para o mesmo tipo de token (`account.schema.ts:15`) |
| Teste em arquivo novo `authSignInGoogleRoute.test.ts` | casos novos em `googleSignInProfile.test.ts` | o arquivo existente mocka o repositório para testar a criação de perfil; o contrato de erro precisa mockar o `user-merge`, como `authSignInRoute.test.ts`. Misturar os dois níveis de mock no mesmo arquivo confunde |
| Não mexer no achado da chave de API ausente (`BACKLOG.md:1464`) | responder 500 ou um código de configuração | mudaria também o `/auth/sign-in` e as rotas de conta, fora do corte. A rota do Google passa a se comportar como as outras, e o achado ganha mais uma rota afetada |
| Sem browser no `/test` | percorrer o login Google na tela | o diff não tem UI e a recusa do provedor não é alcançável pela tela (§1.3, §8) |

## 13. Riscos

- **Cliente direto que lê a string.** Quem chama a API sem o SDK e faz `if (body.error === "USER_DISABLED")`
  passa a receber um objeto. Nenhum cliente do repositório faz isso (§1.2). A mudança é a mesma que a PR #46
  aplicou ao `/auth/sign-in`.
- **Chave de API ausente mascarada como credencial.** Hoje a rota do Google mostra a mensagem de configuração
  em 401; depois, responde 400 `AUTH_INVALID_CREDENTIALS`, igual ao `/auth/sign-in`. O vazamento some, mas quem
  configura o fork continua sem ver que falta a chave. É o achado 🟢 `specs/BACKLOG.md:1464`, que o `/review`
  deve ampliar para incluir esta rota.
- **`z.string().url()` no Zod 4.** Pode gerar aviso de API legada no editor ou no Biome. Mitigação na §10.1.
- **Âncoras de linha.** `specs/BACKLOG.md:1496` e `specs/social-sign-in-providers.md:47` citam linhas desta
  rota e ficam defasadas depois do merge, para o `/spec --sync` corrigir.
