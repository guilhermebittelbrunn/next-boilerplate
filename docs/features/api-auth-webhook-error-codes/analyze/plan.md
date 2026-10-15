# Plano: contrato de erro de `/auth/me`, `/auth/sign-in` e do webhook de pagamentos

Tarefa direta, sem spec. Origem: recomendação #2 da auditoria pós-PR #45 em `specs/BACKLOG.md:286-328`, e os
achados das linhas `:862` (webhook, A4), `:920` (`/auth/sign-in`) e `:921` (`/auth/me`). Rodada autônoma do
`/cycle`: as decisões que dependeriam do usuário foram tomadas pela política (`.claude/cycle-policy.md`), pela
recomendação da auditoria e pelo padrão do repo, e estão no fim, em "Perguntas em aberto", com a alternativa
descartada.

Esta é a segunda de duas tarefas na branch `guilhermebittelbrunn/cycle-2-features-implement`. A primeira,
`web-docs-link-and-mobile-menu`, mexe só em `apps/web`. Os arquivos das duas não se cruzam.

---

## Etapa 1: análise

### 1. Contexto

Três respostas da API fogem da regra de ouro 3 (`{ error: { code } }` + status de `HTTP_STATUS`):

| rota | o que responde hoje | evidência |
|------|---------------------|-----------|
| `GET /auth/me` sem ator | `401 { message: "Invalid or expired token" }` | `apps/api/app/(routes)/auth/me/route.ts:8-13` |
| `GET /auth/me` com ator, sem usuário | o mesmo `401 { message }` | `auth/me/route.ts:17-22` |
| `POST /auth/sign-in` sem corpo | `req.json()` lança e a rota responde 500 | `auth/sign-in/route.ts:5`; medido em `docs/features/arcjet-key-lazy-validation/test/report.md:14` |
| `POST /auth/sign-in` com credencial recusada | `IdentityToolkitError` sem `try`, 500 | `auth/sign-in/route.ts:7`; mesma medição |
| `POST /auth/sign-in` sem usuário | `404 { error: "User not found" }`, string crua | `auth/sign-in/route.ts:11-13` |
| `POST /webhooks/payments` sem `stripe-signature` ou com assinatura que não confere | `500 { message: "something went wrong", ok: false }` | `webhooks/payments/route.ts:261-274` caindo em `failure()`, `:236-240` |
| `POST /webhooks/payments` com falha no handler | o mesmo `500 { message, ok: false }` | `webhooks/payments/route.ts:283-289` |

As rotas com guard já respondem `401 AUTH_INVALID_TOKEN` para a mesma situação do `/auth/me`
(`apps/api/app/(guards)/common-panel.ts:38-43`, `admin.ts:38`), e `GET /auth/session` faz o mesmo sem guard
(`auth/session/route.ts:21-26`).

**Objetivo.** As três rotas passam a responder `error.code` em todos os caminhos de erro causados por quem chama,
com o status certo, sem mudar o que acontece para quem usa o produto.

**Corte de MVP.**

1. `/auth/me`: os dois 401 passam a `{ error: { code: "AUTH_INVALID_TOKEN" } }`.
2. `/auth/sign-in`: corpo lido com `parseRequestJson`, validado com Zod (`400 VALIDATION_FAILED`); credencial
   recusada vira 4xx com código; usuário ausente vira `404 USERS_NOT_FOUND`.
3. Webhook: assinatura ausente ou inválida responde `400 VALIDATION_FAILED`; falha do handler segue 500, agora com
   `error.code`; o 503 sem configuração não muda.
4. Testes de rota que falham no código atual.
5. `docs/PAYMENTS.md` e `docs/SECURITY.md` descrevendo o comportamento novo.

**Fora do escopo.**

- Remover `/auth/sign-in` (D1). A rota não tem consumidor no repositório (`grep` por `auth/sign-in"` em `apps` e
  `packages` acha só `apps/api/proxy.ts:46`), mas um fork pode ter cliente externo.
- `POST /auth/sign-in/google` tem os mesmos dois defeitos: `req.json()` sem `try`
  (`auth/sign-in/google/route.ts:10`) e `{ error: e.message }` cru com 401 (`:27-29`). Ela tem consumidor
  (`apps/app/shared/lib/googleSignInApi.ts:36`), não está no corte da auditoria e não está no `contends_on`
  proposto. Fica como achado novo para o backlog (ver "Achados para a próxima auditoria").
- Mudar o formato de sucesso do `/auth/sign-in` (`{ session, user }`, sem `data`). Mudar quebraria um cliente
  externo, que é justamente o motivo de manter a rota.
- O `IdentityToolkitError` de chave ausente (`firebase-identity-toolkit.ts:47-49`) cai no mesmo mapeamento da
  credencial recusada. Já acontece igual em `account/password`, `account/email` e `account/deletion`. Fica como
  achado.

**Apps impactados.** `apps/api` (três rotas, um schema, testes) e `packages/internationalization` (dois códigos
novos em `apiErrors`). `packages/sdk`, `apps/app` e `apps/web` não mudam. Documentação: `docs/PAYMENTS.md` e
`docs/SECURITY.md`.

**Área do painel / modo de produto / plano.** N/A. As três rotas não têm guard de painel, o comportamento é o
mesmo em `subscription` e `simple`, e nada depende de assinatura.

**Dependências externas.** Stripe (só o SDK local: `constructEvent` e `generateTestHeaderString` calculam o HMAC
sem rede) e Identity Toolkit (mockado nos testes). Nenhuma env nova.

### 1.1 Fontes

- `specs/BACKLOG.md:286-328` (recomendação #2), `:862`, `:920`, `:921`, `:442` (D1).
- Documentação da Stripe sobre webhooks, lida em 2026-10-14: <https://docs.stripe.com/webhooks>.

**A premissa da auditoria sobre reentrega está errada.** O backlog afirma que "um 400 encerra as tentativas"
(`specs/BACKLOG.md:300-301` e `:862`). A documentação da Stripe diz outra coisa: a tabela de status lista `400` e
os demais `4xx` como `ERRO`, igual aos `5xx`; a seção "Novas tentativas automáticas" diz que a Stripe tenta
entregar por até três dias em produção, sem distinguir o status; e a seção sobre ataques de repetição diz que
cada nova tentativa, depois de uma resposta "diferente de `2xx`", leva assinatura e carimbo de tempo novos.

O 400 continua sendo a resposta certa, por outros motivos: os exemplos oficiais da Stripe respondem `400` quando
`construct_event` falha; o painel de entregas separa "o servidor recusou" (`4xx`) de "o servidor quebrou"
(`5xx`); e um alarme de `5xx` deixa de disparar com requisição forjada. Mas o plano **não** promete o fim das
reentregas, e a documentação do repo também não pode prometer. A correção da premissa vai para o `/spec --sync`
(este plano não edita o `BACKLOG.md`, que é da auditoria).

### 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta nova. `/auth/me` e `/auth/sign-in` continuam chamando
`getMergedUserByUid` (`apps/api/(shared)/lib/user-merge.ts:10-27`), sem mudança. Vale saber para os testes:
essa função devolve `null` **só** quando o usuário não existe no Firebase Auth (`getUser` lança, `:15-19`); perfil
Firestore ausente é criado na hora (`:20-24`). Logo, "usuário ausente" nas duas rotas quer dizer conta apagada
no Auth entre a emissão do token e a leitura.

### 3. Contrato `@repo/sdk`

Sem mudança. Conferido quem lê essas respostas:

| consumidor | o que lê | efeito da mudança |
|------------|----------|-------------------|
| `AuthActions.me()` (`packages/sdk/src/actions/auth/action.ts:79-86`) | só `data.data` do sucesso | nenhum |
| `getAppSessionUser` (`apps/app/lib/server/authSession.ts:15-32`) | captura qualquer erro e devolve `null` (`:28-30`); `requireSession` redireciona para `/<locale>/sign-in` (`:34-39`) | nenhum: o 401 continua 401 |
| `applyAccountPreferences` (`apps/app/shared/lib/postLoginNavigation.ts:63-80`) | captura qualquer erro e devolve `null` | nenhum |
| `BaseClient.setInterceptorError` (`packages/sdk/src/client/base.ts:81-91`) | dispara em 401 sem olhar o corpo | sem chamador no repo (`grep` só acha a definição) |
| `FormattedError.apiResponseMessage` (`packages/shared/utils/helpers/formattedError.ts:60-87`) | lê `error.code` primeiro e `message` só como fallback (`:83-85`) | passa a traduzir `AUTH_INVALID_TOKEN` em vez de mostrar `Invalid or expired token` cru |
| `/auth/sign-in` | sem action no SDK | N/A |
| `/webhooks/payments` | só a Stripe, que não lê o corpo | N/A |

Nenhum cliente do repo depende de `message` nessas três rotas.

### 4. API

#### 4.1 Rotas e guard

As três ficam sem guard, como hoje, cada uma pelo motivo registrado em `docs/SECURITY.md:21-23`. Nenhuma rota
nova. `apps/api/proxy.ts:45-58` não muda: `/auth/sign-in` segue no rate limit e `/auth/me` e o webhook seguem fora.

#### 4.2 Validação na borda

`/auth/sign-in` ganha `signInSchema` em `apps/api/(shared)/validation/auth.schema.ts`, ao lado do `signUpSchema`
(`:26-29`):

- `email`: `z.string().trim().max(EMAIL_MAX).email()`, o mesmo do cadastro.
- `password`: `existingPasswordSchema` (`apps/api/(shared)/validation/password.schema.ts:15-18`, mínimo 6, máximo
  1024). Login confere senha que já existe, e `packages/shared/utils/helpers/passwordPolicy.ts:5-10` manda aceitar 6.

`parseSignIn` usa `parseWith` (`auth.schema.ts:63-69`), não `parseWithPasswordPolicy`: senha curta no login é
dado inválido, não "senha nova curta demais", então responde `VALIDATION_FAILED`, não `AUTH_PASSWORD_TOO_SHORT`.

O webhook não tem corpo para validar com Zod: a borda dele é a assinatura.

#### 4.3 Persistência

N/A.

#### 4.4 Erros

| rota | caso | status | `error.code` | código novo? |
|------|------|--------|--------------|--------------|
| `GET /auth/me` | sem credencial ativa (ausente, inválida, expirada ou sessão encerrada) | 401 | `AUTH_INVALID_TOKEN` | não |
| `GET /auth/me` | credencial ativa, usuário não existe mais no Auth | 401 | `AUTH_INVALID_TOKEN` | não |
| `POST /auth/sign-in` | corpo ausente ou JSON inválido | 400 | `VALIDATION_FAILED` | não |
| `POST /auth/sign-in` | corpo fora do schema (`{}`, e-mail inválido, senha com menos de 6) | 400 | `VALIDATION_FAILED` | não |
| `POST /auth/sign-in` | Identity Toolkit recusa (`INVALID_LOGIN_CREDENTIALS`, `USER_DISABLED`, qualquer outra mensagem) | 400 | `AUTH_INVALID_CREDENTIALS` | **sim** |
| `POST /auth/sign-in` | Identity Toolkit limita (`TOO_MANY_ATTEMPTS_TRY_LATER`) | 429 | `USERS_AUTH_RATE_LIMITED` | não |
| `POST /auth/sign-in` | usuário não existe mais no Auth | 404 | `USERS_NOT_FOUND` | não |
| `POST /auth/sign-in` | erro que não é `IdentityToolkitError` (rede, Firestore) | 500 sem corpo (relança) | N/A | não |
| `POST /webhooks/payments` | sem configuração | 503 | `PAYMENTS_NOT_CONFIGURED` | não (inalterado) |
| `POST /webhooks/payments` | `stripe-signature` ausente | 400 | `VALIDATION_FAILED` | não |
| `POST /webhooks/payments` | assinatura que não confere (segredo errado, corpo adulterado, carimbo fora da tolerância) | 400 | `VALIDATION_FAILED` | não |
| `POST /webhooks/payments` | handler ou dedupe falha | 500 | `PAYMENTS_WEBHOOK_HANDLER_FAILED` | **sim** |

Mapeamento da recusa no login: reusa `mapPasswordCheckMessageToCode(message, "AUTH_INVALID_CREDENTIALS")` e
`statusForAuthErrorCode` (`apps/api/(shared)/lib/toolkit-error-codes.ts:58-70`, `:104-108`), o mesmo par que
`account/password/route.ts:37-51` usa para a senha atual. A função também devolve `USERS_AUTH_WEAK_PASSWORD` para
`WEAK_PASSWORD`, que não acontece num login, mas é inofensivo.

Os dois códigos novos precisam de texto nos três idiomas em
`packages/internationalization/translations/packages/shared/utils.ts` (regra de `apps/api/CLAUDE.md:33` e do
`parity.test.ts`).

### 5. Front-end

N/A. Nenhum arquivo de `apps/app` ou `apps/web` muda (ver §3).

### 5.4 i18n

Dois códigos em `apiErrors`, ver blueprint. Nenhuma chave de UI.

### 6. Autorização e segurança

- **`/auth/me`.** Status igual ao de hoje (401) nos dois ramos. Sessão encerrada noutro aparelho continua caindo em
  `AUTH_INVALID_TOKEN`, não em `AUTH_SESSION_REVOKED`, porque `resolveApiActor` junta "revogada" e "anônima" em
  `null` (`apps/api/(shared)/lib/resolve-api-actor.ts:82-87`). É o que os guards fazem. Quem precisa distinguir já
  tem `GET /auth/session`.
- **Impersonação.** N/A para `/auth/me` e `/auth/sign-in`: o `/auth/me` resolve o ator, não o personificado
  (`apps/app/lib/server/onboarding.ts:15`), e isso não muda.
- **Enumeração de contas no login.** Toda recusa do Identity Toolkit vira o mesmo `AUTH_INVALID_CREDENTIALS`. A
  resposta não diz se o e-mail existe, nem se a conta está desativada, e não ecoa a mensagem do provedor. O 404
  `USERS_NOT_FOUND` só aparece depois de uma senha **aceita**, então não revela nada que quem chama não tenha
  provado.
- **Webhook.** A resposta 400 não ecoa a mensagem do `constructEvent` (que pode citar o segredo), como o teste de
  `paymentsWebhookRoute.test.ts:302-312` já cobra. O `logEvent("payments", "webhook-failed", { requestId })` fica
  como está (`route.ts:272`).
- **Log no login.** Nenhum log novo. Se o `/develop` sentir falta, a linha não pode levar e-mail nem mensagem do
  provedor (`toolkit-error-codes.ts:93-102` explica por quê).

### 7. Testes

Todos no nível de rota com `vi.mock` dos colaboradores, que é o mais barato que prova status e corpo. Nenhum
precisa de emulador: as rotas não mudam o acesso ao Firestore, e a assinatura real da Stripe se calcula em
memória.

| arquivo | nível | casos | falha hoje? |
|---------|-------|-------|-------------|
| `apps/api/__tests__/authMeRoute.test.ts` (novo) | rota, `vi.mock` de `resolve-api-actor` e `user-merge` | sem ator → 401 `AUTH_INVALID_TOKEN` sem chave `message`; ator sem usuário → 401 `AUTH_INVALID_TOKEN`; sucesso → 200 `{ data: user }` | os dois primeiros, sim |
| `apps/api/__tests__/authSignInRoute.test.ts` (novo) | rota, `vi.mock` de `firebase-identity-toolkit` (com `FakeIdentityToolkitError`, padrão de `accountPasswordRoute.test.ts:26-35`) e `user-merge` | sem corpo → 400 `VALIDATION_FAILED` e toolkit não chamado; `{}` → 400; e-mail inválido → 400; senha com 5 → 400 `VALIDATION_FAILED`; senha com 6 aceita; `INVALID_LOGIN_CREDENTIALS` → 400 `AUTH_INVALID_CREDENTIALS` e corpo sem o texto do provedor; `TOO_MANY_ATTEMPTS_TRY_LATER` → 429 `USERS_AUTH_RATE_LIMITED`; usuário `null` → 404 `USERS_NOT_FOUND`; sucesso → 200 com `session` e `user` no formato atual; erro que não é do toolkit → a promessa rejeita | os de corpo, recusa e 404, sim |
| `apps/api/__tests__/paymentsWebhookRoute.test.ts` (existente) | rota | ver abaixo | sim, depois de trocar as asserções |

Mudanças no teste do webhook. As asserções de 500 nos casos de assinatura **descrevem o defeito**, então mudam de
valor; nenhuma é removida ou afrouxada:

- `:274-285` (header ausente) e `:287-300` (assinatura que não confere): de `500 { message, ok: false }` para
  `400 { error: { code: "VALIDATION_FAILED" } }`, mantendo `constructEvent` não chamado e `markProcessed` não
  chamado.
- `:1105-1126` (corpo adulterado) e `:1128-1146` (outro segredo), com o SDK real da Stripe: de 500 para 400
  `VALIDATION_FAILED`.
- Caso novo no bloco "assinatura real": `generateTestHeaderString({ payload, secret, timestamp })` com carimbo de
  uma hora atrás → 400 `VALIDATION_FAILED`, handler não roda. Prova a tolerância de cinco minutos sem conta.
- `:441-456` (handler falha) e `:458-469` (dedupe falha): acrescentar a asserção do corpo
  `{ error: { code: "PAYMENTS_WEBHOOK_HANDLER_FAILED" } }`.
- `:302-312` (não vaza a mensagem), `:360-386` (log com e sem `requestId`) e `:222-255` (503) ficam como estão e
  têm de seguir verdes.

i18n: `packages/internationalization/__tests__/parity.test.ts` já cobre os dois códigos novos nos três idiomas.

Gate: `pnpm --filter api test`, `pnpm --filter @repo/internationalization test`, `pnpm check`,
`pnpm --filter api typecheck`. O `test:emulator` roda na linha do CI, mas nenhum teste de emulador muda.

### 8. O que o `/test` vai percorrer

O diff não tem superfície de UI. Sem passada completa de navegador (`cycle-policy` §3.1).

1. **Contra a API em build** (`pnpm --filter api build && start`, porta 3002), com `curl -i`:
   - `GET /auth/me` sem credencial → 401 `AUTH_INVALID_TOKEN`; com `Authorization: Bearer lixo` → o mesmo.
   - `POST /auth/sign-in` sem corpo → 400 `VALIDATION_FAILED`; com `{}` → 400 `VALIDATION_FAILED`; com
     `qa-api-error-codes@example.com` e senha errada, contra o emulador do Auth → 400 `AUTH_INVALID_CREDENTIALS`.
   - `POST /webhooks/payments` sem as chaves da Stripe → 503 `PAYMENTS_NOT_CONFIGURED`. Com
     `STRIPE_SECRET_KEY=sk_test_<qualquer>` e `STRIPE_WEBHOOK_SECRET=whsec_<qualquer>` no ambiente do `start`: sem
     header → 400 `VALIDATION_FAILED`; com `stripe-signature: t=1,v1=00` → 400 `VALIDATION_FAILED`. Nenhuma das
     duas chaves é real e nada sai para a rede.
   - Em todas: resposta com `x-request-id`, sem stack, sem `message`.
2. **Passada curta de login na `apps/app`** (pedida no critério 6 da auditoria): entrar em `/pt-br/sign-in` com a
   credencial de dev de `.claude/dev-credentials.local.md`, chegar ao painel; sair; abrir `/pt-br` anônimo e cair
   no sign-in. Um tema e um idioma bastam: nada de UI mudou, e o objetivo é confirmar que o 401 novo do
   `/auth/me` ainda leva ao login.

Nada aqui fica 🔒: o único caminho que exigiria conta Stripe real (entrega de verdade com segredo trocado) é
coberto pelo `generateTestHeaderString`.

### 9. Critérios de aceite (rascunho para o `/test`)

1. `GET /auth/me` sem credencial, com credencial inválida e com credencial de conta apagada responde 401
   `AUTH_INVALID_TOKEN`, sem `message`. Com credencial válida, `200 { data }` igual a hoje.
2. Login da `apps/app` segue funcionando, e o anônimo segue indo ao sign-in.
3. `POST /auth/sign-in`: corpo ausente, JSON inválido, `{}`, e-mail inválido e senha com menos de 6 respondem 400
   `VALIDATION_FAILED` sem chamar o Identity Toolkit; senha de 6 é aceita pelo schema.
4. `POST /auth/sign-in` com credencial recusada responde 400 `AUTH_INVALID_CREDENTIALS` sem ecoar o provedor; com
   limite do provedor, 429 `USERS_AUTH_RATE_LIMITED`; com usuário ausente, 404 `USERS_NOT_FOUND`; o sucesso mantém
   `{ session, user }`.
5. Webhook sem header ou com assinatura que não confere (segredo errado, corpo adulterado, carimbo velho) responde
   400 `VALIDATION_FAILED`, não roda handler, não marca o evento e registra `webhook-failed` como antes.
6. Webhook com handler ou dedupe falhando responde 500 `PAYMENTS_WEBHOOK_HANDLER_FAILED` e não marca; sem
   configuração, 503 `PAYMENTS_NOT_CONFIGURED`.
7. `AUTH_INVALID_CREDENTIALS` e `PAYMENTS_WEBHOOK_HANDLER_FAILED` têm texto em pt-br, en e es, e a paridade passa.
8. `docs/PAYMENTS.md` e `docs/SECURITY.md` descrevem essas respostas, sem afirmar que o 400 encerra as reentregas
   da Stripe.

---

## Etapa 2: blueprint técnico

### 10.1 Contrato

Sem mudança no SDK. Respostas de exemplo:

```http
GET /auth/me            (sem credencial)
401 { "error": { "code": "AUTH_INVALID_TOKEN" } }

POST /auth/sign-in      (sem corpo)
400 { "error": { "code": "VALIDATION_FAILED" } }

POST /auth/sign-in      { "email": "qa-api-error-codes@example.com", "password": "errada1" }
400 { "error": { "code": "AUTH_INVALID_CREDENTIALS" } }

POST /auth/sign-in      (sucesso, formato inalterado)
200 { "session": { "idToken": "...", "refreshToken": "...", "expiresIn": "3600" }, "user": { "uid": "...", ... } }

POST /webhooks/payments (sem stripe-signature)
400 { "error": { "code": "VALIDATION_FAILED" } }

POST /webhooks/payments (handler lançou)
500 { "error": { "code": "PAYMENTS_WEBHOOK_HANDLER_FAILED" } }
```

### 10.2 Pseudo-diffs

`apps/api/app/(routes)/auth/me/route.ts`

```ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { resolveApiActor } from "@/(shared)/lib/resolve-api-actor";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";

const invalidToken = () =>
    Response.json(
        { error: { code: "AUTH_INVALID_TOKEN" } },
        { status: HTTP_STATUS.UNAUTHORIZED }
    );

export async function GET(req: NextRequest) {
    const actor = await resolveApiActor(req);
    if (!actor) {
        return invalidToken();
    }

    const user = await getMergedUserByUid(actor.uid);
    if (!user) {
        return invalidToken();
    }

    return Response.json({ data: user });
}
```

`apps/api/(shared)/validation/auth.schema.ts`

```ts
+ import { existingPasswordSchema, ... } from "./password.schema";
+
+ export const signInSchema = z.object({
+     email: z.string().trim().max(EMAIL_MAX).email(),
+     password: existingPasswordSchema,
+ });
+ export type SignInInput = z.infer<typeof signInSchema>;
+
+ export const parseSignIn = (body: unknown) => parseWith(signInSchema, body);
```

`apps/api/app/(routes)/auth/sign-in/route.ts`

```ts
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    IdentityToolkitError,
    identitySignInWithPassword,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapPasswordCheckMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";
import { parseSignIn } from "@/(shared)/validation/auth.schema";

export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseSignIn(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    let session: Awaited<ReturnType<typeof identitySignInWithPassword>>;
    try {
        session = await identitySignInWithPassword(
            parsed.value.email,
            parsed.value.password
        );
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            const code = mapPasswordCheckMessageToCode(
                error.message,
                "AUTH_INVALID_CREDENTIALS"
            );
            return Response.json(
                { error: { code } },
                { status: statusForAuthErrorCode(code) }
            );
        }
        throw error;
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

`apps/api/app/(routes)/webhooks/payments/route.ts` (`:236-289`)

```ts
- const failure = () =>
-     NextResponse.json(
-         { message: "something went wrong", ok: false },
-         { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
-     );
+ const signatureRejected = () =>
+     NextResponse.json(
+         { error: { code: "VALIDATION_FAILED" } },
+         { status: HTTP_STATUS.BAD_REQUEST }
+     );
+
+ const handlerFailed = () =>
+     NextResponse.json(
+         { error: { code: "PAYMENTS_WEBHOOK_HANDLER_FAILED" } },
+         { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
+     );

  /**
-  * Answering 503 while unconfigured makes Stripe keep retrying ... a failure answers 500 and Stripe delivers it again.
+  * (mesmo texto para 503 e 500; acrescentar que uma assinatura recusada responde 400. Não afirmar que o 400
+  *  encerra as reentregas: a Stripe reentrega qualquer resposta fora de 2xx.)
   */
  ...
      } catch {
          logEvent("payments", "webhook-failed", { requestId });
-         return failure();
+         return signatureRejected();
      }
  ...
      } catch {
          logEvent("payments", "webhook-handler-failed", { eventType: event.type, requestId });
-         return failure();
+         return handlerFailed();
      }
```

O bloco `try` da verificação (`:261-274`) continua único. Tudo que pode falhar ali (ler o corpo, ler o header,
`constructEvent`) dá o mesmo veredito para a mesma requisição, então tratar tudo como 400 é honesto.

### 10.3 i18n (`packages/internationalization/translations/packages/shared/utils.ts`)

Dentro de `apiErrors`, nos três blocos. `AUTH_INVALID_CREDENTIALS` perto dos outros `AUTH_*` de credencial;
`PAYMENTS_WEBHOOK_HANDLER_FAILED` depois de `PAYMENTS_PROVIDER_UNAVAILABLE`.

| código | pt-br | en | es |
|--------|-------|----|----|
| `AUTH_INVALID_CREDENTIALS` | E-mail ou senha incorretos. | Incorrect email or password. | Correo electrónico o contraseña incorrectos. |
| `PAYMENTS_WEBHOOK_HANDLER_FAILED` | Não foi possível processar o evento de pagamento. | The payment event could not be processed. | No se pudo procesar el evento de pago. |

Usar a skill `/i18n-sync` e rodar `pnpm --filter @repo/internationalization test`.

### 10.4 Documentação

- `docs/PAYMENTS.md`, parágrafo "Idempotência e ordem" (`:109-111`): o 500 do handler passa a citar
  `PAYMENTS_WEBHOOK_HANDLER_FAILED`. Antes da tabela de eventos (`:97`), um parágrafo curto: assinatura ausente ou
  que não confere responde `400 VALIDATION_FAILED`, registra `webhook-failed`, não roda handler nem marca o evento;
  a Stripe trata o 400 como falha e reentrega por até três dias, com assinatura nova a cada tentativa, então um
  segredo errado aparece no painel de entregas como `4xx`, e corrigir o `STRIPE_WEBHOOK_SECRET` dentro desse prazo
  recupera os eventos. Citar <https://docs.stripe.com/webhooks>.
- `docs/SECURITY.md:15-34` (inventário de guards): a linha do `/auth/*` cita `401 AUTH_INVALID_TOKEN` no
  `/auth/me`; a linha do webhook cita `400 VALIDATION_FAILED` para assinatura recusada. Como o `/develop` vai
  passar por essa tabela, ele **remede e corrige** os números, que estão defasados (`cycle-policy` §4). Contagem
  feita para este plano com `find "apps/api/app/(routes)" -name route.ts` e `grep -L "require(CommonPanel|Admin|Plan)Api"`:
  **36** arquivos, **23** com guard, **13** sem (10 em `/auth/*`, incluindo `auth/session`; os dois `health`; o
  webhook); `account/*` ×10; três guards (`requirePlanApi` em `apps/api/app/(guards)/plan.ts:21`). O documento
  diz 32, 20, 12, 9 e dois guards.

### 10.5 Ordem de implementação e commits

Nenhuma mudança em `packages/sdk`, `apps/app` ou `apps/web`.

1. `fix(api): answer /auth/me failures with AUTH_INVALID_TOKEN`: `auth/me/route.ts` + `authMeRoute.test.ts`.
2. `fix(api): validate /auth/sign-in and map its failures to error codes`: `auth.schema.ts`,
   `auth/sign-in/route.ts`, `authSignInRoute.test.ts`.
3. `fix(api): reject unsigned payment webhooks with 400`: `webhooks/payments/route.ts`,
   `paymentsWebhookRoute.test.ts`.
4. `feat(internationalization): add sign-in and webhook error codes`: `utils.ts`.
5. `docs: describe auth and webhook error responses`: `docs/PAYMENTS.md`, `docs/SECURITY.md`.
6. `docs(features): api-auth-webhook-error-codes`, por último.

Os commits 2 e 3 passam a emitir códigos que só ganham texto no 4. Nenhum teste da `api` lê o dicionário, então a
ordem não quebra nada entre commits.

### 10.6 Env e configuração

Nenhuma env nova. Nenhum pré-requisito manual de infraestrutura. Nada a acrescentar em `docs/PRE-PRODUCTION.md`.

---

## Riscos

- **Cliente externo do `/auth/sign-in`.** Quem lia `{ error: "User not found" }` como string passa a receber
  `{ error: { code } }`, e quem recebia 500 em credencial errada passa a receber 400. É a mudança pedida, mas é
  quebra de contrato para esse cliente hipotético. Registrar na descrição da PR.
- **Painel da Stripe.** Um fork com `STRIPE_WEBHOOK_SECRET` errado passa a ver `400` em vez de `500` nas entregas.
  As reentregas continuam (ver §1.1). Quem montou alarme só em `5xx` deixa de ser avisado de segredo errado; a
  linha `webhook-failed` no log segue sendo o sinal.
- **`IdentityToolkitError` de configuração.** Sem `FIREBASE_WEB_API_KEY` em produção, o login responde 400
  `AUTH_INVALID_CREDENTIALS` em vez de um erro de servidor. É o comportamento já existente nas três rotas de conta;
  fica como achado.

## Achados para a próxima auditoria (não implementar aqui)

- `specs/BACKLOG.md:300-301` e `:862` afirmam que um 400 encerra as reentregas da Stripe. A documentação da Stripe
  diz o contrário (§1.1). Corrigir no `/spec --sync`.
- `POST /auth/sign-in/google` (`auth/sign-in/google/route.ts:10`, `:27-29`): mesmo par de defeitos do
  `/auth/sign-in`, com consumidor em `apps/app/shared/lib/googleSignInApi.ts:36`. Tarefa direta P.
- `IdentityToolkitError` sem chave de API (`apps/api/(shared)/lib/firebase-identity-toolkit.ts:47-49`) cai no
  fallback de credencial recusada em quatro rotas.

## Perguntas em aberto

Todas já decididas nesta rodada. Cada uma traz a opção adotada, a descartada e o porquê.

1. **D1. `/auth/sign-in` sem consumidor no repo: corrigir ou remover?** Adotada: corrigir o contrato e manter a
   rota. Descartada: remover, o que mexe em `apps/api/proxy.ts:46` e `docs/SECURITY.md:21`, `:152`. Porquê:
   recomendação da auditoria (`specs/BACKLOG.md:306-308`, `:442`) e um fork pode ter cliente externo. Só o usuário
   sabe se algum fork usa.
2. **Código do `/auth/me` quando o usuário não existe mais.** Adotada: `401 AUTH_INVALID_TOKEN` nos dois ramos.
   Descartadas: `404 USERS_NOT_FOUND` (mudaria o status que o app espera) e `401 AUTH_SESSION_REVOKED` para sessão
   encerrada (exigiria trocar `resolveApiActor` por `resolveApiCredential`, arquivo que
   `account-security-mfa` declara em `contends_on`). Porquê: paridade com os guards e menor raio.
3. **Status da credencial recusada no login.** Adotada: 400, via `statusForAuthErrorCode`, como nas rotas de
   conta. Descartada: 401. Porquê: reusa o helper, e o 401 aciona `setInterceptorError` em qualquer cliente que o
   registre (`packages/sdk/src/client/base.ts:85`).
4. **Código da credencial recusada.** Adotada: `AUTH_INVALID_CREDENTIALS`, novo. Descartada: reusar
   `ACCOUNT_CURRENT_PASSWORD_INVALID`, cujo texto ("A senha atual está incorreta") não serve para login. Nenhum
   código existente cabe.
5. **Erro inesperado no login (rede, Firestore).** Adotada: relançar, e o Next responde 500 sem corpo, como
   `account/password/route.ts:50`. Descartada: capturar e responder 500 com um terceiro código novo
   (`AUTH_SIGN_IN_FAILED`), como faz o `sign-up`. Porquê: o critério da auditoria fala dos caminhos causados por
   quem chama; um 500 de infraestrutura é legítimo, não vaza string e não pede código novo.
6. **Código da assinatura recusada no webhook.** Adotada: `VALIDATION_FAILED`, reusado. Descartada:
   `PAYMENTS_WEBHOOK_SIGNATURE_INVALID`. Porquê: a instrução da rodada manda reusar antes de criar, ninguém traduz
   esse corpo, e a linha `webhook-failed` do log já distingue o caso.
7. **Corpo do 500 do handler do webhook.** Adotada: trocar `{ message, ok: false }` por
   `PAYMENTS_WEBHOOK_HANDLER_FAILED`, novo. Descartada: deixar como está. Porquê: é a mesma função `failure()`,
   viola a mesma regra, e a política manda corrigir defeito encontrado no caminho. Nenhum código 500 genérico
   existe para reusar.
8. **Números defasados do `docs/SECURITY.md`.** Adotada: corrigir na mesma passada, porque a tarefa edita a mesma
   tabela (`cycle-policy` §4). Descartada: deixar para a auditoria.
