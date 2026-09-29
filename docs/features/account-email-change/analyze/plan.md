# Plano: troca de e-mail do titular

Spec de origem: `specs/account-email-change.md` (status `approved`). Plano feito em rodada autônoma do
`/cycle`: as decisões que a spec não tomou estão na §13, cada uma com a alternativa descartada, e as
perguntas na §12 já trazem a opção adotada.

Todas as referências `arquivo:linha` foram conferidas neste checkout em 2026-09-29.

## 0. Sumário do desenho

O titular pede a troca na aba Perfil, informando o novo endereço e a senha atual. A API confere a senha
pelo Identity Toolkit, gera pelo Admin SDK um link `VERIFY_AND_CHANGE_EMAIL`, reescreve o link para a
página `/verify-email` da própria `apps/app` (com `mode=verifyAndChangeEmail`), avisa o endereço antigo e
manda o link ao novo, os dois pela Resend. Nada muda no Firebase até alguém abrir o link.

Ao abrir o link, a página chama uma rota pública nova, `POST /auth/email-change/confirm`. A rota confere
que o código é mesmo de troca de e-mail, aplica o código, encerra todas as sessões da conta e grava o
evento `account.email.change` na trilha de auditoria. O perfil passa a mostrar o endereço novo sem gravar
nada no Firestore, porque o e-mail vem do Firebase Auth (`apps/api/(shared)/lib/user-merge.ts:59-67`).

Sem Resend ou sem `NEXT_PUBLIC_APP_URL`, o pedido responde `503 EMAIL_NOT_CONFIGURED` antes de ler o
corpo, e a UI mostra a mensagem traduzida.

## 1. Contexto

### 1.1 Resumo

Permitir que o titular de uma conta com senha troque o próprio e-mail, com prova de posse do novo endereço
e da senha atual, aviso ao endereço antigo, encerramento das sessões e registro na trilha.

### 1.2 O que existe hoje

- A aba Perfil mostra o e-mail num `Input` desabilitado (`AccountProfileForm.tsx:92-105`) com a frase
  `emailHint` "A troca de e-mail estará disponível em breve." (`packages/internationalization/translations/apps/app/pages/common/account.ts:18`, `:180`, `:342`).
  `emailHint` só é lido nesse arquivo.
- `PUT /account` é `.strict()` e não aceita `email` (`apps/api/(shared)/validation/account.schema.ts:31-42`).
- Links de ação: `buildAuthActionLink` gera pelo Admin SDK e reconstrói o link contra a `apps/app`
  (`apps/api/(shared)/lib/auth-action-links.ts:38-87`), com os tipos `reset-password` e `verify-email`
  (`:7-12`). `canSendAuthActionLink` exige Resend e `NEXT_PUBLIC_APP_URL` (`:15-17`).
- `firebase-admin` 13.6.0 traz `generateVerifyAndChangeEmailLink(email, newEmail, actionCodeSettings?)`
  (`node_modules/.pnpm/firebase-admin@13.6.0/.../lib/auth/base-auth.d.ts:506`).
- Reautenticação por senha: troca de senha (`app/(routes)/account/password/route.ts:37-51`) e exclusão
  (`app/(routes)/account/deletion/route.ts:48-72`), que recusa conta sem provedor de senha com código
  próprio e explica em `:55-57` por que não confia na idade da sessão. `hasPasswordProvider` está em
  `apps/api/(shared)/lib/auth-providers.ts:10-14`.
- A troca de senha encerra todas as sessões com `revokeUserSessions` (`account/password/route.ts:64-66`;
  implementação em `packages/auth/server.ts:323-329`). O proxy da `apps/app` valida o cookie de sessão com
  `checkRevoked: true` (`packages/auth/server.ts:290-303`, usado por `getUserFromSessionCookie` em `:314-317`).
- Confirmação de código de ação já existe para verificação (`app/(routes)/auth/email-verification/confirm/route.ts`),
  com `identityApplyOobCode` (`apps/api/(shared)/lib/firebase-identity-toolkit.ts:134-145`) e
  `mapOobActionMessageToCode` (`apps/api/(shared)/lib/toolkit-error-codes.ts:29-47`).
- Template de link de ação: `packages/email/templates/action-link.tsx`. Ação nova é só um slug no
  dicionário (`:12-13`); os slugs atuais estão em `packages/internationalization/translations/packages/email/index.ts:18-43`.
- Eventos de auditoria: `packages/sdk/src/types/audit/audit.ts:2-10`, sem troca de e-mail. Os rótulos da
  tela de auditoria do admin estão em `translations/apps/app/pages/admin/auditTrail.ts:14-22` e são
  indexados por `AuditAction` em `AuditListClient.tsx:50-52`, então um valor novo no enum obriga o rótulo
  nos 3 idiomas no `typecheck`.
- `grep` por `verifyBeforeUpdateEmail`, `updateEmail` e `generateVerifyAndChangeEmailLink` em `apps/` e
  `packages/` fora de `node_modules`: 0 ocorrências (reconferido).

### 1.3 Comportamento do provedor medido no emulador

O repo fixa `firebase-tools` 15.30.1. No código do emulador de Auth
(`node_modules/.pnpm/firebase-tools@15.30.1_*/node_modules/firebase-tools/lib/emulator/auth/operations.js`):

| Ponto | Linha | O que faz |
|-------|-------|-----------|
| Gerar link `VERIFY_AND_CHANGE_EMAIL` | `:690-706` | Recusa com `EMAIL_EXISTS` se o novo endereço já tem conta. |
| Conferir código (`accounts:resetPassword` só com `oobCode`) | `:615-642` | Devolve `requestType`, `email` (antigo) e `newEmail`, sem consumir o código. É o que o `checkActionCode` do SDK cliente faz. |
| Aplicar código (`accounts:update` com `oobCode`) | `:800-812` | Troca o e-mail, marca `emailVerified: true`, recusa `EMAIL_EXISTS` se o endereço foi tomado depois do pedido e `INVALID_OOB_CODE` se o endereço antigo já não existe. |
| `validSince` (revogação) | `:861-863` | Só no ramo sem `oobCode`. Aplicar o código **não** revoga as sessões no emulador. |
| Resposta do `accounts:update` | `:944-955` | Traz `localId`, `email` e `newEmail`. |

Duas consequências para o desenho. A rota de confirmação precisa chamar `revokeUserSessions` por conta
própria, e isso é observável no emulador. E, como cada link está preso ao endereço antigo, o primeiro link
aplicado invalida os outros pedidos pendentes, sem estado nosso no Firestore.

### 1.4 Objetivos (corte de MVP da spec, `specs/account-email-change.md:71-80`)

1. Na aba Perfil, o titular pede a troca com novo e-mail e senha atual; a frase "em breve" some.
2. O novo endereço recebe um link; o e-mail só muda quando o link é aberto.
3. O endereço antigo recebe um aviso com o canal para contestar.
4. Depois da troca, as sessões são encerradas, o perfil mostra o endereço novo e a troca entra na trilha.
5. Erros traduzidos nos 3 idiomas para senha errada, endereço em uso, endereço igual ao atual e conta sem
   provedor de senha, sem revelar mais do que o cadastro já revela.

### 1.5 Fora do escopo (da spec, `:82-92`)

Troca pelo administrador; conta só Google; desfazer pela ação de recuperação do link antigo; avisos de
segurança por e-mail para outras mudanças; vários e-mails por conta. Também fica fora a sincronização do
e-mail do `customer` da Stripe, decidida pelo usuário em 2026-09-26 (`:100-101`); o plano só documenta a
divergência em `docs/PAYMENTS.md`.

### 1.6 Apps impactados, área e modo

| Onde | Impacto |
|------|---------|
| `packages/sdk` | `account.requestEmailChange`, `authApi.confirmEmailChange`, `AuditAction.ACCOUNT_EMAIL_CHANGE`, tipos. |
| `apps/api` | `POST /account/email` (guard do painel comum), `POST /auth/email-change/confirm` (pública), helpers em `auth-action-links.ts` e `firebase-identity-toolkit.ts`, schemas, rate limit. |
| `apps/app` | Botão e diálogo na aba Perfil; `/verify-email` passa a tratar `mode=verifyAndChangeEmail`. |
| `packages/email` | Slug `changeEmail` no template de link; template novo `email-change-notice` para o endereço antigo, com previews. |
| `packages/internationalization` | Copy do app, do e-mail, rótulo da auditoria e `apiErrors`. |
| `apps/web` | N/A. |
| Docs | `docs/PAYMENTS.md`, `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`. |

- Área: painel comum. O guard `requireCommonPanelApi` recusa perfil que não é `common`
  (`apps/api/app/(guards)/common-panel.ts:77-82`), então o admin não troca o próprio e-mail por aqui, igual
  à troca de senha hoje.
- Modo de produto: a rota funciona nos dois modos. A UI só existe no painel comum da `apps/app`; em
  `simple`, onde o usuário comum opera na `apps/web`, não há tela de conta, e isso não muda nesta fatia.
- Não depende de assinatura.
- Dependências externas: Firebase Auth (Admin SDK e Identity Toolkit REST, já usados) e Resend (já usada).
  Nenhuma dependência nova, nenhuma variável de ambiente nova.
- Genérico: sim. O trabalho específico fica em `apps/*`; `packages/email` é pacote de integração.

## 2. Dados (Firestore)

N/A. O e-mail vive no Firebase Auth e o perfil é mesclado na leitura (`user-merge.ts:59-67`); a rota de
conta já evita gravar campos do Auth no documento (`app/(routes)/account/route.ts:128-129`). Não há estado
de pedido pendente (ver §13, D4). Não há índice nem mudança em `firestore.rules`.

A trilha de auditoria ganha documentos com a ação nova na coleção existente. Os rótulos com os dois
endereços são apagados pelo expurgo da conta, que zera `actorLabel`/`targetLabel` pelo id do perfil
(`apps/api/(shared)/repositories/audit-event.repository.ts:54-58`).

## 3. Contrato (`@repo/sdk`)

### 3.1 Tipos

`packages/sdk/src/types/account/account.ts`:

```ts
export type ChangeEmailRequest = {
    newEmail: string;
    currentPassword: string;
    /** Language of both emails. Absent falls back to the fork's default locale. */
    locale?: string;
};

export type AccountEmailChangeRequested = { requested: true };
```

`packages/sdk/src/actions/auth/action.ts` (ao lado de `EmailVerificationConfirmBody`, `:48-50`):

```ts
export type EmailChangeConfirmBody = { oobCode: string };
```

`packages/sdk/src/types/audit/audit.ts:2-10`:

```ts
ACCOUNT_EMAIL_CHANGE = "account.email.change",
```

### 3.2 Actions

```ts
// AccountActions (packages/sdk/src/actions/account/action.ts)
async requestEmailChange(body: ChangeEmailRequest): Promise<AccountEmailChangeRequested>
// POST /account/email → data.data

// AuthActions (packages/sdk/src/actions/auth/action.ts)
async confirmEmailChange(body: EmailChangeConfirmBody): Promise<AuthActionConfirmed>
// POST /auth/email-change/confirm → data.data
```

Nenhuma registração nova no `Client` (`packages/sdk/src/client/index.ts:20-28`): os dois grupos já existem.

### 3.3 Quem quebra

Ninguém: tudo é aditivo. O valor novo em `AuditAction` exige o rótulo em `auditTrail.ts` nos 3 idiomas
(senão `AuditListClient.tsx:52` não compila). `AccountDataExportRecord.action` é `string`
(`account.ts:29-35`), então a exportação aceita a ação nova sem mudança.

## 4. API (`apps/api`)

### 4.1 Rotas

| Método e path | Guard | Rate limit | Resposta |
|---------------|-------|------------|----------|
| `POST /account/email` | `requireCommonPanelApi` | sim, novo em `RATE_LIMITED_PATHS` | `200 { data: { requested: true } }` |
| `POST /auth/email-change/confirm` | nenhum (o `oobCode` é a prova) | sim, novo em `RATE_LIMITED_PATHS` | `200 { data: { confirmed: true } }` |

As duas entram na lista de `apps/api/proxy.ts:44-55`: o pedido gasta cota do Identity Toolkit a cada
tentativa de senha e manda dois e-mails; a confirmação é pública e gasta cota a cada código, como
`/auth/email-verification/confirm`, que já está na lista.

### 4.2 Validação

`apps/api/(shared)/validation/account.schema.ts`, ao lado de `changePasswordSchema` (`:44-49`):

```ts
const EMAIL_MAX = 320;

/** Same `.strict()` guard: whose address changes comes from the token, never from the body. */
export const changeEmailSchema = z
    .object({
        newEmail: z.string().trim().max(EMAIL_MAX).email(),
        currentPassword: existingPasswordSchema,
        locale: localeSchema.optional(),
    })
    .strict();

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

export function parseChangeEmail(body: unknown): { ok: true; value: ChangeEmailInput } | { ok: false; response: Response }
// falha → 400 VALIDATION_FAILED (validationFailed(), :80-84)
```

`apps/api/(shared)/validation/auth.schema.ts` ganha, ao lado de `parseEmailVerificationConfirm` (`:100-101`):

```ts
export const parseEmailChangeConfirm = (body: unknown) =>
    parseWith(emailVerificationConfirmSchema, body);
```

O schema é o mesmo (`{ oobCode }`, `:35-37`); o parser separado deixa a rota legível e o teste independente.

### 4.3 Helpers

**`apps/api/(shared)/lib/auth-action-links.ts`**

```ts
export type AuthActionKind = "reset-password" | "verify-email" | "change-email";

const APP_PATH_BY_KIND: Record<AuthActionKind, string> = {
    "reset-password": "reset-password",
    "verify-email": "verify-email",
    "change-email": "verify-email",
};

const APP_MODE_BY_KIND: Partial<Record<AuthActionKind, string>> = {
    "change-email": "verifyAndChangeEmail",
};

// extraído de :75-86, sem mudar o comportamento dos tipos atuais
function toAppLink(kind: AuthActionKind, firebaseLink: string, locale: Locale): string | null
// → `${base}/${locale}/${path}?oobCode=...` e, quando houver modo, `&mode=verifyAndChangeEmail`

export type EmailChangeLinkResult =
    | { ok: true; url: string }
    | { ok: false; reason: "email-in-use" | "refused" };

export async function buildEmailChangeLink(
    currentEmail: string,
    newEmail: string,
    locale: Locale
): Promise<EmailChangeLinkResult> {
    const auth = getAuthInstance();
    // 1. auth.getUserByEmail(newEmail): achou → { ok: false, reason: "email-in-use" };
    //    auth/user-not-found → segue; outro erro → throw
    // 2. auth.generateVerifyAndChangeEmailLink(currentEmail, newEmail):
    //    auth/email-already-exists → "email-in-use"; outro código Firebase → logRefusedLink("change-email", code) + "refused"
    // 3. toAppLink("change-email", link, locale) → null vira "refused"
}
```

A consulta explícita do passo 1 não depende de o gerador de produção recusar endereço em uso do mesmo
jeito que o emulador (`operations.js:706`); o mapeamento do passo 2 fica como segunda barreira.

**`apps/api/(shared)/lib/firebase-identity-toolkit.ts`**, ao lado de `identityApplyOobCode` (`:134-145`):

```ts
type ToolkitCheckOob = { requestType: string; email?: string; newEmail?: string };

/** Reads what an action code would do without spending it. */
export async function identityCheckOobCode(oobCode: string): Promise<ToolkitCheckOob>
// POST `${base()}/accounts:resetPassword?key=...` com { oobCode }

// ToolkitApplyOob (:114-118) ganha `newEmail?: string`
```

**`apps/api/(shared)/lib/toolkit-error-codes.ts`**: `mapOobActionMessageToCode` (`:29-47`) ganha
`EMAIL_EXISTS` → `USERS_AUTH_EMAIL_ALREADY_IN_USE`, antes do fallback. Redefinição de senha e verificação
nunca recebem essa mensagem, então os dois fluxos existentes não mudam.

### 4.4 Esqueleto de `POST /account/email`

Arquivo novo `apps/api/app/(routes)/account/email/route.ts`. A ordem é deliberada: primeiro o que depende
só da configuração e do contexto, depois o que gasta cota, e o aviso ao endereço antigo sai antes do link.

```ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    if (ctx.subjectProfile.reference_id !== ctx.user.uid) {
        return 403 AUTH_REQUEST_IMPERSONATION_FORBIDDEN;         // mesmo cinto de deletion/route.ts:23-28
    }
    if (!canSendAuthActionLink()) {
        return 503 EMAIL_NOT_CONFIGURED;
    }
    const parsedBody = await parseRequestJson(req);             // → 400
    const parsed = parseChangeEmail(parsedBody.value);          // → 400 VALIDATION_FAILED

    const email = ctx.user.email;
    if (!email) return 400 ACCOUNT_PASSWORD_UNSUPPORTED;        // mesmo tratamento de password/route.ts:29-35
    if (!hasPasswordProvider(ctx.user)) return 400 ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED;

    const newEmail = parsed.value.newEmail.toLowerCase();
    if (newEmail === email.toLowerCase()) return 400 ACCOUNT_EMAIL_UNCHANGED;

    try {
        await identitySignInWithPassword(email, parsed.value.currentPassword);
    } catch (error) {
        // IdentityToolkitError → mapPasswordCheckMessageToCode(msg, "ACCOUNT_CURRENT_PASSWORD_INVALID")
        // + statusForAuthErrorCode (400 ou 429); outro erro → throw
    }

    const locale = resolveLocale(parsed.value.locale);
    let link: EmailChangeLinkResult;
    try {
        link = await buildEmailChangeLink(email, newEmail, locale);
    } catch {
        logEvent("account", "email-change-link-failed", { requestId });
        return 500 ACCOUNT_UPDATE_FAILED;
    }
    if (!link.ok) {
        return link.reason === "email-in-use"
            ? 400 USERS_AUTH_EMAIL_ALREADY_IN_USE
            : 503 EMAIL_SEND_FAILED;                           // mesmo raciocínio de email-verification/send/route.ts:49-60
    }

    const name = ctx.user.displayName ?? email;
    const notice = await sendEmail({ template: emailChangeNoticeEmail, to: email, locale, data: { name, newEmail } });
    if (!notice.sent) return 503 EMAIL_SEND_FAILED;

    const delivered = await sendEmail({ template: actionLinkEmail, to: newEmail, locale, data: { name, url: link.url, action: "changeEmail" } });
    if (!delivered.sent) return 503 EMAIL_SEND_FAILED;

    return Response.json({ data: { requested: true } });
});
```

A rota não grava evento de auditoria no pedido; a trilha registra a troca efetiva (ver §13, D6).

### 4.5 Esqueleto de `POST /auth/email-change/confirm`

Arquivo novo `apps/api/app/(routes)/auth/email-change/confirm/route.ts`, no grupo `/auth/*` porque o link
pode ser aberto em outro aparelho, sem sessão.

```ts
const EMAIL_CHANGE_REQUEST_TYPE = "VERIFY_AND_CHANGE_EMAIL";

export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    const parsed = parseEmailChangeConfirm(parsedBody.value);  // → 400 VALIDATION_FAILED

    let previousEmail: string | null;
    try {
        const checked = await identityCheckOobCode(parsed.value.oobCode);
        if (checked.requestType !== EMAIL_CHANGE_REQUEST_TYPE) {
            return 400 AUTH_OOB_CODE_INVALID;                   // um código de verificação ou de senha não passa por aqui
        }
        previousEmail = checked.email ?? null;
    } catch (error) { /* IdentityToolkitError → mapOobActionMessageToCode(msg, "AUTH_EMAIL_CHANGE_FAILED") */ }

    let applied: ToolkitApplyOob;
    try {
        applied = await identityApplyOobCode(parsed.value.oobCode);
    } catch (error) { /* mesmo mapeamento; EMAIL_EXISTS → 400 USERS_AUTH_EMAIL_ALREADY_IN_USE */ }

    // O provedor já trocou o endereço: daqui em diante nenhuma falha vira erro para quem abriu o link.
    await revokeUserSessions(applied.localId);

    const profile = await userRepository.findByReferenceId(applied.localId).catch(() => null);
    if (profile) {
        await recordAuditEvent({
            action: AuditAction.ACCOUNT_EMAIL_CHANGE,
            actorUserId: profile.id,
            actorUid: applied.localId,
            actorLabel: previousEmail,
            targetType: AuditTargetType.ACCOUNT,
            targetUserId: profile.id,
            targetLabel: applied.email ?? null,
            changedFields: ["email"],
            requestId: requestIdFrom(req),
        });
    } else {
        logEvent("account", "email-change-audit-skipped", { requestId });
    }

    return Response.json({ data: { confirmed: true } });
}
```

`revokeUserSessions` já engole o próprio erro (`packages/auth/server.ts:323-329`) e `recordAuditEvent`
registra a falha de escrita sem lançar (`apps/api/(shared)/lib/audit-recorder.ts:111-112`).

### 4.6 Payload e resposta de exemplo

```http
POST /account/email
Authorization: Bearer <idToken>
Content-Type: application/json

{ "newEmail": "qa-account-email-change-novo@example.com", "currentPassword": "<senha atual>", "locale": "pt-br" }
```

```json
{ "data": { "requested": true } }
```

```http
POST /auth/email-change/confirm
Content-Type: application/json

{ "oobCode": "<código do link>" }
```

```json
{ "data": { "confirmed": true } }
```

### 4.7 Códigos de erro

| `error.code` | Status | Rota | Quando | Novo? |
|--------------|--------|------|--------|-------|
| `AUTH_INVALID_TOKEN` | 401 | pedido | sem sessão (guard) | não |
| `AUTH_REQUEST_IMPERSONATION_READ_ONLY` | 403 | pedido | admin personificando (`impersonation-read-only.ts:19-31`) | não |
| `AUTH_REQUEST_IMPERSONATION_FORBIDDEN` | 403 | pedido | ator diferente do titular (inalcançável hoje; cinto) | não |
| `COMMON_PANEL_FORBIDDEN` | 403 | pedido | perfil admin | não |
| `EMAIL_NOT_CONFIGURED` | 503 | pedido | sem Resend ou sem `NEXT_PUBLIC_APP_URL` | não |
| `VALIDATION_FAILED` | 400 | as duas | corpo inválido, campo extra, e-mail malformado | não |
| `ACCOUNT_PASSWORD_UNSUPPORTED` | 400 | pedido | conta sem e-mail | não |
| `ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED` | 400 | pedido | conta sem provedor de senha | **sim** |
| `ACCOUNT_EMAIL_UNCHANGED` | 400 | pedido | novo igual ao atual, sem diferenciar maiúsculas | **sim** |
| `ACCOUNT_CURRENT_PASSWORD_INVALID` | 400 | pedido | senha atual errada | não |
| `USERS_AUTH_RATE_LIMITED` | 429 | as duas | limite do Identity Toolkit | não |
| `AUTH_RATE_LIMITED` | 429 | as duas | limite do Arcjet no proxy | não |
| `USERS_AUTH_EMAIL_ALREADY_IN_USE` | 400 | as duas | endereço com conta (no pedido ou tomado antes da confirmação) | não |
| `EMAIL_SEND_FAILED` | 503 | pedido | provedor recusou gerar o link ou a Resend não entregou | não |
| `ACCOUNT_UPDATE_FAILED` | 500 | pedido | falha inesperada do Admin SDK | não |
| `AUTH_OOB_CODE_INVALID` | 400 | confirmação | código inválido, já usado ou de outro tipo | não |
| `AUTH_OOB_CODE_EXPIRED` | 400 | confirmação | código expirado | não |
| `AUTH_EMAIL_CHANGE_FAILED` | 400 | confirmação | outra recusa do toolkit | **sim** |

Sobre enumeração: o cadastro anônimo já responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`
(`app/(routes)/auth/sign-up/route.ts:36-43` com `toolkit-error-codes.ts:68-73`). Aqui a mesma resposta só
sai para quem tem sessão, passou pela senha e está sob o rate limit, então não revela nada que o cadastro
não revele.

## 5. Front-end (`apps/app`)

### 5.1 Aba Perfil

`AccountProfileForm.tsx` hoje é um `<Form><form>` só (`:66-140`). O diálogo novo tem o próprio `<form>`,
e o evento `submit` do React sobe pela árvore de componentes mesmo quando o conteúdo está num portal. Se o
diálogo ficar dentro do `<form>` do perfil, confirmar a troca dispararia também o "Salvar" do perfil. Por
isso o componente passa a devolver um fragmento: o `<Form>` do perfil e, como irmão, o diálogo controlado.
Dentro do formulário fica só o gatilho (`type="button"`).

Bloco do e-mail (`:92-105`), depois da mudança:

- o `Input` desabilitado com o endereço atual continua;
- `emailHint` sai;
- conta com provedor de senha, ou conta ainda carregando: botão "Trocar e-mail" (`variant="outline"`),
  desabilitado quando `isImpersonating` ou sem `account`;
- conta sem provedor de senha: texto `emailChange.unsupported` no lugar do botão, mesma regra de
  `requiresPrivacyChannel` (`AccountPrivacyPanel.tsx:29-48`).

Componente novo `(components)/AccountEmailChangeDialog.tsx` (`"use client"`), no molde do diálogo de
exclusão (`AccountPrivacyPanel.tsx:123-171`):

| Campo | Componente | Validação (mensagem do dicionário) |
|-------|-----------|-------------------------------------|
| `newEmail` | `HookFormInput` `type="email"`, `autoComplete="email"` | obrigatório; e-mail válido; até 320; diferente do atual (sem diferenciar maiúsculas) |
| `currentPassword` | `HookFormInputPassword` | obrigatório; `EXISTING_PASSWORD_MIN_LENGTH` |

Rodapé com `Footer` dentro do `<form>` do diálogo (cancelar fecha; confirmar com `isLoading` do mutation,
o que bloqueia o duplo clique). No sucesso: toast, `form.reset()` e diálogo fechado. No erro: toast pelo
`handleClientError`, diálogo aberto.

Schema novo em `(validations)/accountEmailChangeSchema.ts`:

```ts
export type AccountEmailChangeFormValues = { newEmail: string; currentPassword: string };
export function buildAccountEmailChangeSchema(dictionary: Dictionary, currentEmail: string | null)
```

Mutation nova em `(hooks)/useAccountMutations.tsx`:

```ts
const requestEmailChangeMutation = useMutation({
    mutationFn: (body: ChangeEmailRequest) => apiClient.account.requestEmailChange({ ...body, locale }),
    onSuccess: () => successAlert(accountMessages.emailChangeRequested),
    onError: (error) => errorAlert(formatClientError(error)),
});
```

Sem `invalidateQueries`: nada muda na conta até o link ser aberto.

### 5.2 Página do link

`/verify-email` já é pública e pula o redirecionamento de quem tem sessão (`apps/app/proxy.ts:84-97`,
`:197`), então o `proxy.ts` não muda.

- `(unauthenticated)/verify-email/page.tsx` lê também `mode` e, com `mode === "verifyAndChangeEmail"`,
  renderiza `ConfirmEmailChangeResult`; sem `mode`, segue com `VerifyEmailResult`, intocado.
- Componente novo `(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx`, espelho de
  `VerifyEmailResult.tsx` (gasta o código uma vez por montagem com `useRef`, estados sem código, erro,
  sucesso, carregando). Sucesso leva a `/${locale}/sign-in`; erro leva ao painel.
- `shared/hooks/useEmailVerification.ts` ganha `confirmEmailChangeMutation`: chama
  `apiClient.authApi.confirmEmailChange` e depois `logout()` de `@repo/auth/client` com `.catch(() => null)`.
  Se o link for aberto no mesmo navegador da sessão, o usuário Firebase em memória ainda tem o endereço
  antigo e um refresh token revogado. O `logout` não navega: o provider cai em `adoptSharedSession`
  (`packages/auth/provider.tsx:307-322`), que falha porque o cookie foi revogado, e a página segue no
  cartão de sucesso.

### 5.3 Estados

| Estado | Como produzir |
|--------|---------------|
| Botão visível | conta de senha do seed |
| Texto "sem senha" | conta criada só com Google no emulador |
| Botão desabilitado | admin personificando um usuário comum |
| Diálogo inválido | e-mail vazio, malformado ou igual ao atual; senha vazia |
| Enviando | submit com rede lenta; botão em carregamento |
| Erro `EMAIL_NOT_CONFIGURED` | ambiente local sem `RESEND_TOKEN`/`RESEND_FROM` |
| Confirmação: carregando, sucesso, erro, sem código | `/verify-email?mode=verifyAndChangeEmail&oobCode=...` com código válido, repetido ou ausente |

## 6. i18n

### 6.1 `apps/app/pages/common/account.ts` (3 idiomas)

```ts
profile: {
    // emailHint removido
    emailChange: {
        action: "Trocar e-mail",
        unsupported: "Esta conta entra pelo Google e não tem senha para confirmar a troca de e-mail.",
        dialogTitle: "Trocar o e-mail da conta",
        dialogDescription: "Enviamos um link para o novo endereço. O e-mail só muda quando você abrir esse link; até lá, você continua entrando com o atual. O endereço atual recebe um aviso.",
        newEmail: "Novo e-mail",
        newEmailPlaceholder: "voce@exemplo.com",
        currentPassword: "Senha atual",
        confirm: "Enviar link",
        cancel: "Cancelar",
        validation: {
            emailRequired: "Informe o novo e-mail.",
            emailInvalid: "Informe um e-mail válido.",
            emailSameAsCurrent: "O novo e-mail é igual ao atual.",
            passwordRequired: "Informe a senha.",
            passwordMin: "A senha deve ter ao menos 6 caracteres.",
        },
    },
},
messages: {
    emailChangeRequested: "Link enviado para o novo e-mail. A troca acontece quando você abrir o link.",
},
```

### 6.2 `apps/app/pages/emailVerification/index.ts` (3 idiomas)

```ts
changeEmail: {
    confirming: "Confirmando o novo e-mail...",
    success: { title: "E-mail alterado", description: "Entre de novo usando o novo endereço. As sessões abertas desta conta foram encerradas." },
    error: { title: "Não foi possível trocar o e-mail", description: "O link pode ter expirado, já ter sido usado, ou o endereço passou a pertencer a outra conta. Peça a troca de novo na sua conta." },
    signIn: "Entrar",
},
```

`invalidLink` e `goToPanel` existentes servem aos dois modos.

### 6.3 `packages/email/index.ts` (3 idiomas)

```ts
actionLink.actions.changeEmail: {
    subject: "Confirme seu novo e-mail em {brand}",
    preview: "Confirme a troca de e-mail em {brand}",
    title: "Confirme seu novo e-mail",
    body: "Recebemos um pedido para usar este endereço na sua conta. O e-mail da conta só muda quando você usar o botão abaixo. O link é pessoal e tem prazo de validade.",
    cta: "Confirmar novo e-mail",
},
emailChangeNotice: {
    subject: "Pedido de troca de e-mail em {brand}",
    preview: "Alguém pediu para trocar o e-mail da sua conta em {brand}",
    title: "Olá, {name}",
    body: "Recebemos um pedido para trocar o e-mail da sua conta para {newEmail}. Nada muda até alguém abrir o link enviado a esse endereço.",
    advice: "Se não foi você, troque sua senha agora e fale com o suporte.",
},
```

O `ignoreNote` do template de link ("Se você não pediu isso, ignore este e-mail") serve ao endereço novo.
No aviso, o canal de contestação é o `supportNote` do layout, que só aparece quando a marca tem
`supportEmail` (`packages/email/components/layout.tsx:98-104`, `packages/next-config/brand.ts:57`).

### 6.4 Outros

- `apps/app/pages/admin/auditTrail.ts` `actionLabels`: `"account.email.change": "E-mail alterado pelo titular"` / `"Email changed by the account holder"` / `"Correo cambiado por el titular"`.
- `packages/shared/utils.ts` `apiErrors` (3 idiomas):
  - `ACCOUNT_EMAIL_UNCHANGED`: "O novo e-mail é igual ao atual."
  - `ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED`: "Esta conta não tem senha para confirmar a troca de e-mail."
  - `AUTH_EMAIL_CHANGE_FAILED`: "Não foi possível trocar o e-mail. Peça a troca de novo."

Use `/i18n-sync`; a paridade é conferida por `packages/internationalization/__tests__/parity.test.ts`.

## 7. Autorização e segurança

- Senha atual obrigatória, conferida no servidor pelo Identity Toolkit, pelo mesmo motivo registrado na
  exclusão (`deletion/route.ts:55-57`): o login pelo cookie compartilhado reescreve o instante de
  autenticação, então sessão "recente" não prova nada.
- Impersonação: o guard já recusa escrita com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`
  (`common-panel.ts:65-71`). A rota repete a checagem de ator × titular da exclusão porque a senha
  conferida e o e-mail trocado são os de `ctx.user`, o ator.
- O corpo `.strict()` impede passar `uid` ou `id`; a conta vem do token.
- A confirmação não confia no corpo além do `oobCode`: o `uid` para revogar e auditar vem da resposta do
  Identity Toolkit, e o tipo do código é conferido antes de aplicar.
- Log sem endereço: as linhas novas usam `logEvent` com `requestId` ou código do provedor, como
  `auth-action-links.ts:24-27`.
- Rate limit nas duas rotas (§4.1).
- Limite conhecido: quem tem o link pode aplicar o código direto no Identity Toolkit com a chave pública,
  sem passar pela nossa rota. O e-mail muda do mesmo jeito, mas a revogação explícita e o evento de
  auditoria não acontecem. Ver §15.

## 8. Testes planejados

Todos em Vitest, sem emulador. Nenhum teste aqui tem a infra como objeto: o comportamento do provedor
está lido no código do emulador (§1.3), e a passada ponta a ponta contra o emulador de Auth é do `/test`.
Hoje o `test:emulator` só sobe Firestore e Storage (`apps/api/scripts/emulator-tests.mjs:35-52`); pôr o
Auth lá é mudança de infra fora desta fatia.

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `apps/api/__tests__/accountSchema.test.ts` (estender) | schema | `changeEmailSchema`: campo extra, e-mail malformado, 321 caracteres, senha curta, `locale` inválido. |
| `apps/api/__tests__/authActionLinks.test.ts` (estender) | helper, Admin SDK mockado | `buildEmailChangeLink`: endereço em uso pela consulta e pelo gerador, recusa do gerador, link com `mode=verifyAndChangeEmail`; tipos atuais sem mudança. |
| `apps/api/__tests__/firebaseIdentityToolkit.test.ts` (estender) | helper, `fetch` mockado | `identityCheckOobCode` monta `accounts:resetPassword` só com `oobCode` e propaga o erro. |
| `apps/api/__tests__/oobActionErrorCodes.test.ts` (novo; hoje só `adminCreateUserErrorCodes.test.ts` importa `toolkit-error-codes.ts`) | unit | `EMAIL_EXISTS` → `USERS_AUTH_EMAIL_ALREADY_IN_USE`. |
| `apps/api/__tests__/accountEmailRoute.test.ts` (novo) | rota, guard e dependências mockados | Caminho feliz (aviso antes do link, destinatários certos, sem revogar sessão); cada código da §4.7 do pedido; e-mail igual com maiúsculas diferentes; aviso que falha impede o envio do link; `EMAIL_NOT_CONFIGURED` sem ler o corpo nem chamar o toolkit. |
| `apps/api/__tests__/authEmailChangeConfirm.test.ts` (novo) | rota, toolkit mockado | Caminho feliz revoga o `localId` devolvido e grava `account.email.change` com `changedFields: ["email"]` e os dois rótulos; código de outro tipo não é aplicado; `EXPIRED`/`INVALID`/`EMAIL_EXISTS`; perfil ausente responde 200 sem evento. |
| `apps/api/__tests__/corsOrigin.test.ts` (estender, onde a lista de rate limit é conferida, `:292-318`) | proxy | Os dois paths novos recebem `429 AUTH_RATE_LIMITED`. |
| `packages/email/__tests__/templates.test.tsx` e `previews.test.tsx` (estender) | render | `emailChangeNotice` com marca, assinatura, `lang` e o novo endereço; slug `changeEmail` com CTA. |
| `apps/app/__tests__/accountEmailChangeSchema.test.ts` (novo) | schema com dicionário real | Mensagens nos 3 idiomas, igual ao atual. |
| `apps/app/__tests__/accountEmailChangeDialog.test.tsx` (novo) | componente, SDK mockado | Submit chama `requestEmailChange` com `locale`; submit do diálogo não chama `account.update`; conta Google mostra `unsupported`; impersonação desabilita. |
| `apps/app/__tests__/useEmailVerification.test.tsx` (estender) | hook | `confirmEmailChangeMutation` chama a action e o `logout`; falha do `logout` não vira erro. |
| `apps/app/__tests__/verifyEmailPage.test.tsx` (novo, ou no teste do resultado) | componente | `mode=verifyAndChangeEmail` renderiza o componente novo; sem `mode`, o antigo. |
| `apps/app/__tests__/accountApiErrorCopy.test.ts` (estender, `:16-40`) | copy | Os 3 códigos novos traduzidos nos 3 idiomas. |

## 9. O que o `/test` vai percorrer

Base: `pnpm dev` com emuladores e seed. Dados de QA: `qa-account-email-change@example.com` (conta de
senha) e `qa-account-email-change-novo@example.com` (destino). Senha fica fora do artefato.

1. **Pedido sem Resend (modo degradado)**: Perfil → "Trocar e-mail" → preencher → confirmar. Esperado:
   toast com `EMAIL_NOT_CONFIGURED` traduzido, diálogo aberto, nada muda. Nos 3 idiomas.
2. **Validação do diálogo**: vazio, malformado, igual ao atual, senha curta. Mensagens nos 3 idiomas.
3. **Confirmação pelo link** (o envio real está bloqueado sem Resend): gerar o link com o Admin SDK contra o
   emulador de Auth (`FIREBASE_AUTH_EMULATOR_HOST`, `generateVerifyAndChangeEmailLink`), abrir
   `/pt-br/verify-email?mode=verifyAndChangeEmail&oobCode=<código>`. Esperado: cartão de sucesso; o login
   com o endereço antigo falha e com o novo entra; a sessão aberta noutra aba cai; o Perfil mostra o novo
   endereço; a trilha do admin mostra "E-mail alterado pelo titular" com os dois endereços.
4. **Link repetido e link sem código**: abrir o mesmo link de novo mostra o erro; sem `oobCode` mostra
   "Link inválido".
5. **Conta Google**: texto `unsupported`, sem botão.
6. **Admin personificando**: botão desabilitado; `POST /account/email` forçado responde 403.
7. Combinações: light, dark e 375 px na aba Perfil com o diálogo aberto e na página de confirmação.

Não observável sem infra externa (vira 🔒): entrega real dos dois e-mails pela Resend, o conteúdo
renderizado na caixa de entrada, e o comportamento do Firebase de produção descrito na §15.

## 10. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Pedido de troca na aba Perfil**
  O titular de uma conta com senha vê o e-mail atual e o botão "Trocar e-mail"; a frase "A troca de e-mail estará disponível em breve" não aparece em nenhum idioma. O diálogo pede o novo e-mail e a senha atual e, com a Resend configurada, responde `200 { requested: true }`, mostra o toast de link enviado e fecha. Confirmar o diálogo não dispara o salvar do perfil. Nível mais barato: teste de componente do diálogo e teste da rota com `sendEmail` mockado.

- [ ] **Nada muda antes do link**
  Depois do pedido, o e-mail da conta continua o antigo: login com ele funciona e o Perfil mostra o antigo. A rota do pedido não chama `revokeUserSessions` nem grava evento de auditoria. Pedir de novo gera outro link; os dois são válidos até um deles ser aplicado, e o segundo passa a falhar com `AUTH_OOB_CODE_INVALID` porque o endereço antigo já não existe. Nível: teste da rota (sem revogação) e passada do `/test` no emulador para os links concorrentes.

- [ ] **Aviso ao endereço antigo**
  O endereço atual recebe o aviso `emailChangeNotice` com o novo endereço e a orientação de trocar a senha e falar com o suporte; o link sai para o novo endereço só depois que o aviso foi aceito pela Resend. Se o aviso falhar, a rota responde `503 EMAIL_SEND_FAILED` e o link não é enviado. Com `NEXT_PUBLIC_APP_SUPPORT_EMAIL` vazia, o aviso sai sem a linha de suporte. Nível: teste da rota (ordem e destinatários) e render do template; a entrega real fica 🔒.

- [ ] **Confirmação troca o e-mail e encerra as sessões**
  Abrir `/verify-email?mode=verifyAndChangeEmail&oobCode=...` confirma a troca: o login com o endereço novo funciona, com o antigo falha, as sessões abertas da conta caem (cookie rejeitado pelo proxy) e o Perfil mostra o endereço novo. A página mostra o cartão de sucesso com o link "Entrar", mesmo que o link seja aberto no navegador da sessão antiga. Nível: teste da rota de confirmação (revogação do `localId`) e passada do `/test` no emulador.

- [ ] **Trilha de auditoria**
  Cada troca confirmada grava um evento `account.email.change` com `changedFields: ["email"]`, ator e alvo iguais ao perfil do titular, `actorLabel` com o endereço antigo e `targetLabel` com o novo. A tela de auditoria do admin mostra "E-mail alterado pelo titular" (e as versões em inglês e espanhol). Se o perfil não for encontrado, a troca responde 200 e o evento não é gravado, com uma linha de log sem endereço. Nível: teste da rota e `typecheck` do rótulo.

- [ ] **Senha atual errada**
  Senha errada responde `400 ACCOUNT_CURRENT_PASSWORD_INVALID` com "A senha atual está incorreta." nos 3 idiomas; nenhum link é gerado e nenhum e-mail sai. Muitas tentativas respondem `429 USERS_AUTH_RATE_LIMITED` (toolkit) ou `429 AUTH_RATE_LIMITED` (proxy). Senha com menos de 6 caracteres é barrada no diálogo e, forçada, responde `400 VALIDATION_FAILED`. Nível: teste da rota e do schema.

- [ ] **Endereço já em uso**
  Um endereço que já tem conta responde `400 USERS_AUTH_EMAIL_ALREADY_IN_USE` ("Este e-mail já está em uso."), a mesma resposta que o cadastro anônimo já dá. Se o endereço for tomado entre o pedido e o clique, a confirmação responde o mesmo código e o e-mail não muda. Nível: teste do helper, da rota do pedido e da rota de confirmação.

- [ ] **Endereço igual ao atual**
  O diálogo recusa o endereço atual, sem diferenciar maiúsculas, com a mensagem do dicionário; forçado na API, responde `400 ACCOUNT_EMAIL_UNCHANGED` antes de conferir a senha. Espaços nas pontas são removidos antes da comparação. Nível: schema do app e teste da rota.

- [ ] **Conta sem provedor de senha**
  Conta só Google vê a explicação `emailChange.unsupported` no lugar do botão. Se o pedido for forçado, a API responde `400 ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED` sem chamar o toolkit. Conta sem e-mail responde `400 ACCOUNT_PASSWORD_UNSUPPORTED`. Nível: teste de componente e da rota.

- [ ] **Modo degradado sem Resend**
  Sem `RESEND_TOKEN`/`RESEND_FROM` ou sem `NEXT_PUBLIC_APP_URL` na API, a app sobe, o build passa e o pedido responde `503 EMAIL_NOT_CONFIGURED` antes de ler o corpo e sem gastar cota do toolkit. A UI mostra "O envio de e-mails não está configurado. Fale com o suporte." e mantém o diálogo aberto; nenhuma resposta é 500. Nível: teste da rota com `canSendAuthActionLink` falso e passada do `/test` no ambiente local.

- [ ] **Códigos de ação inválidos na confirmação**
  Link sem código mostra "Link inválido". Código expirado responde `400 AUTH_OOB_CODE_EXPIRED`, código já usado ou adulterado `400 AUTH_OOB_CODE_INVALID`, e código de verificação de e-mail ou de redefinição de senha enviado a esta rota é recusado com `AUTH_OOB_CODE_INVALID` sem ser aplicado. A página mostra o cartão de erro, e o código é enviado uma única vez por montagem. Nível: teste da rota e do componente.

- [ ] **Impersonação e perfis**
  Admin personificando vê o botão desabilitado e, forçando o `POST /account/email`, recebe `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. Sem sessão, `401 AUTH_INVALID_TOKEN`; perfil admin, `403 COMMON_PANEL_FORBIDDEN`. O corpo com `uid` ou `id` responde `400 VALIDATION_FAILED`. Nível: teste da rota.

- [ ] **Duplo clique e cancelamento**
  Durante o envio o botão de confirmar fica em carregamento e não aceita outro clique; cancelar fecha o diálogo e limpa os campos. Um segundo pedido depois do primeiro é aceito e gera outro par de e-mails. Nível: teste de componente.

- [ ] **Tema, responsivo e idiomas**
  A aba Perfil com o diálogo aberto e a página de confirmação ficam legíveis em light, dark e 375 px, nos 3 idiomas, sem texto fora do dicionário. Nível: passada do `/test`.

- [ ] **Stripe documentada**
  `docs/PAYMENTS.md` diz que o `customer` da Stripe mantém o e-mail do checkout depois da troca e que o titular atualiza o endereço de cobrança pelo Customer Portal. Nível: leitura no `/review`.

## 11. Blueprint técnico (Etapa 2)

### 11.1 Arquivos

**Novos**

```
apps/api/app/(routes)/account/email/route.ts
apps/api/app/(routes)/auth/email-change/confirm/route.ts
apps/api/__tests__/accountEmailRoute.test.ts
apps/api/__tests__/authEmailChangeConfirm.test.ts
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountEmailChangeDialog.tsx
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountEmailChangeSchema.ts
apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx
apps/app/__tests__/accountEmailChangeSchema.test.ts
apps/app/__tests__/accountEmailChangeDialog.test.tsx
packages/email/templates/email-change-notice.tsx
packages/email/templates/previews/email-change-notice.en.tsx
packages/email/templates/previews/email-change-notice.es.tsx
```

**Alterados**

| Arquivo | Mudança |
|---------|---------|
| `packages/sdk/src/types/account/account.ts` | `ChangeEmailRequest`, `AccountEmailChangeRequested` |
| `packages/sdk/src/actions/account/action.ts` | `requestEmailChange` |
| `packages/sdk/src/actions/auth/action.ts` | `EmailChangeConfirmBody`, `confirmEmailChange` |
| `packages/sdk/src/types/audit/audit.ts` | `ACCOUNT_EMAIL_CHANGE` |
| `apps/api/(shared)/lib/auth-action-links.ts` | tipo `change-email`, `toAppLink`, `buildEmailChangeLink` |
| `apps/api/(shared)/lib/firebase-identity-toolkit.ts` | `identityCheckOobCode`, `newEmail` em `ToolkitApplyOob` |
| `apps/api/(shared)/lib/toolkit-error-codes.ts` | `EMAIL_EXISTS` no mapper de código de ação |
| `apps/api/(shared)/validation/account.schema.ts` | `changeEmailSchema`, `parseChangeEmail` |
| `apps/api/(shared)/validation/auth.schema.ts` | `parseEmailChangeConfirm` |
| `apps/api/proxy.ts` | 2 paths em `RATE_LIMITED_PATHS` |
| `apps/app/.../account/(components)/AccountProfileForm.tsx` | fragmento com o diálogo como irmão, botão ou texto no bloco do e-mail, sem `emailHint` |
| `apps/app/.../account/(hooks)/useAccountMutations.tsx` | `requestEmailChangeMutation` |
| `apps/app/app/[locale]/(unauthenticated)/verify-email/page.tsx` | lê `mode` |
| `apps/app/shared/hooks/useEmailVerification.ts` | `confirmEmailChangeMutation` |
| `packages/email/templates/action-link.tsx` | nenhuma (o slug vem do dicionário) |
| `packages/email/preview-data.ts` | `emailChangeNoticePreviewData` |
| `packages/internationalization/translations/...` | §6 |
| testes existentes | §8 |
| `docs/PAYMENTS.md`, `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md` | §11.4 |

### 11.2 Pseudo-diffs

`apps/api/proxy.ts:44-55`:

```diff
     "/auth/email-verification/confirm",
+    "/auth/email-change/confirm",
     "/files",
     "/account/export",
     "/account/deletion",
+    "/account/email",
 ];
```

O comentário de `:30-43` ganha "o pedido de troca de e-mail" ao lado das exceções autenticadas, porque
confere senha e manda dois e-mails.

`apps/app/.../verify-email/page.tsx:11-29`:

```diff
 type VerifyEmailProps = LocaleParams & {
-    readonly searchParams: Promise<{ oobCode?: string | string[] }>;
+    readonly searchParams: Promise<{ oobCode?: string | string[]; mode?: string | string[] }>;
 };
 ...
-    const { oobCode } = await searchParams;
+    const { oobCode, mode } = await searchParams;
     const code = typeof oobCode === "string" && oobCode !== "" ? oobCode : null;
+    if (mode === EMAIL_CHANGE_MODE) {
+        return <ConfirmEmailChangeResult oobCode={code} />;
+    }
     return <VerifyEmailResult oobCode={code} />;
```

`AccountProfileForm.tsx:66-105`:

```diff
+    const [emailChangeOpen, setEmailChangeOpen] = useState(false);
+    const canChangeEmail = !lacksPasswordProvider(account);
     return (
-        <Form {...form}>
+        <>
+        <Form {...form}>
             ...
                         <Input disabled id="account-email" readOnly value={account?.email ?? ""} />
-                        <p className="mt-1 text-muted-foreground text-xs">{accountProfile.emailHint}</p>
+                        {canChangeEmail ? (
+                            <Button className="mt-2" disabled={isImpersonating || !account}
+                                onClick={() => setEmailChangeOpen(true)} type="button" variant="outline">
+                                {accountProfile.emailChange.action}
+                            </Button>
+                        ) : (
+                            <p className="mt-1 text-muted-foreground text-xs">{accountProfile.emailChange.unsupported}</p>
+                        )}
             ...
         </Form>
+        <AccountEmailChangeDialog currentEmail={account?.email ?? null}
+            onOpenChange={setEmailChangeOpen} open={emailChangeOpen} />
+        </>
     );
```

`lacksPasswordProvider` fica no arquivo do diálogo e é exportado para o formulário. É a segunda cópia da
regra de `AccountPrivacyPanel.tsx:29-48`; unificar as duas mexeria num arquivo fora da tarefa, então vira
achado para o backlog.

`docs/PAYMENTS.md`, seção "Exclusão e exportação de conta" (`:152`) ou "Fora do corte" (`:165`): um
parágrafo dizendo que a troca de e-mail não atualiza o `customer` da Stripe criado em
`apps/api/(shared)/lib/billing.ts:93-104`, que recibos seguem para o endereço do checkout e que o titular
muda o endereço de cobrança pelo Customer Portal.

`docs/SECURITY.md:14-20` e `:150`: medir de novo antes de editar. Hoje são 30 rotas; passam a 32, com
`/auth/*` indo de 8 para 9, as rotas com guard de 19 para 20 (`account/*` de 6 para 7) e a lista de rate
limit de 10 para 12 caminhos.

### 11.3 Ordem de implementação e commit

1. `feat(sdk): add email change actions and audit action`: tipos, actions, `AuditAction`.
2. `feat(api): add identity toolkit action code check and email change link`: `firebase-identity-toolkit.ts`, `auth-action-links.ts`, `toolkit-error-codes.ts` e testes.
3. `feat(api): add account email change request route`: schema, rota do pedido, rate limit e testes.
4. `feat(api): add email change confirmation route`: parser, rota de confirmação e testes.
5. `feat(email): add email change notice template`: template, previews, preview data e testes.
6. `feat(app): request an email change from the profile tab`: diálogo, schema, mutation, formulário e testes.
7. `feat(app): confirm an email change from the action link`: página, componente, hook e testes.
8. `feat(internationalization): add email change copy and error codes`: todas as chaves da §6.
9. `docs: document email change in payments, security and pre-production`.
10. `docs(features): account-email-change`.

As mudanças de i18n são pré-requisito de `typecheck` para os passos 1 (rótulo da auditoria), 5 e 6. O
`desenvolvedor` implementa tudo antes de rodar os gates; a separação vale para os commits.

### 11.4 Env e configuração

Nenhuma variável nova. As que já existem e esta feature usa: `RESEND_TOKEN`, `RESEND_FROM`,
`NEXT_PUBLIC_APP_URL` e `FIREBASE_WEB_API_KEY` na `apps/api`, e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` para o
canal de contestação no aviso. O modelo "Email address change" do console do Firebase não é usado, porque
o envio é nosso.

## 12. Perguntas em aberto

Todas já têm opção adotada; nenhuma bloqueia o `/develop`.

| # | Pergunta | Opções | Adotada e por quê |
|---|----------|--------|-------------------|
| P1 | O aviso ao endereço antigo mostra o novo endereço? | (a) mostra por inteiro; (b) mascarado (`q***@example.com`); (c) não mostra | (a). O destinatário é o dono verificado da conta, e saber para onde a troca foi pedida é o que permite contestar. Mascarar pede um helper novo sem regra de mercado conferida. |
| P2 | Encerrar todas as sessões depois da troca? (pergunta da própria spec, `:139-140`) | sim; não | Sim, como a spec recomenda e como a troca de senha já faz. No emulador, aplicar o código não revoga nada sozinho (§1.3). |
| P3 | Como a UI sabe que a troca está indisponível sem Resend? | (a) reage ao `503 EMAIL_NOT_CONFIGURED` no envio; (b) a API expõe a capacidade em `GET /account` e a UI esconde o botão | (a). Não muda o `AccountDTO` e segue o que a recuperação de senha já faz. O custo é a pessoa preencher o diálogo antes de saber. |
| P4 | Gravar também o pedido na trilha, além da troca? | só a troca; pedido e troca | Só a troca. A spec pede "a troca fica na trilha"; o pedido é um segundo valor em `AuditAction` com rótulos, e fica fácil acrescentar se algum fork precisar investigar pedidos. |
| P5 | Discordância com a spec: "o pedido novo invalida o anterior?" (`:119-120`) | (a) sem estado, o primeiro link aplicado vence; (b) guardar o pedido pendente no perfil e recusar confirmação de pedido velho | (a). Quem tem o link aplica o código direto no Identity Toolkit, então um estado nosso não protege nada; só mudaria os efeitos colaterais da nossa rota. |

## 13. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---------|------------------------|---------|
| D1 | Link `VERIFY_AND_CHANGE_EMAIL` pelo Admin SDK, reescrito para a `apps/app` | `verifyBeforeUpdateEmail` no cliente com o template do Firebase | A spec pede envio pela Resend (`:112`), e é o desenho de `auth-action-links.ts:29-37`. |
| D2 | Confirmação por rota nossa (`POST /auth/email-change/confirm`) | Cliente chama `applyActionCode` direto | A revogação e a auditoria precisam do servidor; é o padrão de `email-verification/confirm`. |
| D3 | Mesma página `/verify-email` com `mode=verifyAndChangeEmail` | Página nova `/confirm-email-change` | A spec diz que "a página que recebe o link de ação passa a tratar o novo tipo" (`:109`); dispensa mudar o `proxy.ts` da `apps/app`. |
| D4 | Sem estado de pedido no Firestore | Campo `pendingEmailChange` no perfil | Ver P5; o provedor controla a validade (`spec:119-120`). |
| D5 | Rotas `POST /account/email` e `POST /auth/email-change/confirm` | `/account/email-change`; confirmação dentro de `/account` | Paralelas a `/account/password` e `/auth/email-verification/confirm`; a confirmação precisa ser pública. |
| D6 | Um evento `account.email.change` na confirmação, com os dois endereços nos rótulos | Evento no pedido; rótulo só com o novo | A trilha registra a troca efetiva; os dois endereços identificam a conta antes e depois e são apagados pelo expurgo. |
| D7 | Aviso ao antigo antes do link ao novo, e falha do aviso aborta | Aviso em `after()`, como melhor esforço | O aviso é a proteção contra sessão roubada; sem ele a troca não deve começar. |
| D8 | Reusar `ACCOUNT_CURRENT_PASSWORD_INVALID`, `USERS_AUTH_EMAIL_ALREADY_IN_USE`, `EMAIL_*`, `AUTH_OOB_CODE_*`, `ACCOUNT_UPDATE_FAILED` | Códigos novos por rota | A copy existente serve; só entram três códigos cujo texto é próprio da troca. |
| D9 | Código novo `ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED` | Reusar `ACCOUNT_PASSWORD_UNSUPPORTED` | Precedente da exclusão (`ACCOUNT_DELETION_REAUTH_UNSUPPORTED`); o texto atual manda "entrar pelo provedor original", que não responde à troca. |
| D10 | Consulta `getUserByEmail(newEmail)` antes de gerar o link | Confiar só no erro do gerador | O emulador recusa (`operations.js:706`), mas o comportamento em produção não foi medido. |
| D11 | Diálogo renderizado como irmão do `<form>` do perfil | Diálogo dentro do formulário com `stopPropagation` | Evita o submit do diálogo disparar o "Salvar" do perfil sem depender de lembrar o `stopPropagation`. |
| D12 | `logout()` do cliente depois da confirmação | `signOut` do provider | O `signOut` navega (`provider.tsx:363-373`) e tiraria o cartão de sucesso da tela. |
| D13 | Sem teste de emulador | Pôr o Auth no `test:emulator` | Mudaria o script de infra; o comportamento do emulador está lido no código e o `/test` percorre o fluxo contra ele. |

## 14. Pré-requisitos manuais de infra

Nenhum bloqueia a entrega, e o `/test` não reprova por eles: o que depender deles fica 🔒.

- [ ] `RESEND_TOKEN` e `RESEND_FROM` com domínio verificado (`docs/PRE-PRODUCTION.md` §3). Sem isso a
      troca responde `EMAIL_NOT_CONFIGURED`. A entrega real nunca foi provada no repo.
- [ ] `NEXT_PUBLIC_APP_URL` na `apps/api` e `FIREBASE_WEB_API_KEY` (§4 do mesmo documento).
- [ ] `NEXT_PUBLIC_APP_SUPPORT_EMAIL` para o aviso trazer o canal de contestação (§13 do mesmo documento).
- [ ] Depois de configurar, rodar o ciclo real uma vez: pedir a troca, receber o aviso no endereço antigo e
      o link no novo, abrir, entrar com o novo e ver a sessão antiga cair.

O `desenvolvedor` acrescenta ao `docs/PRE-PRODUCTION.md` §3 a troca de e-mail como mais um fluxo que
depende da Resend, junto do ciclo real acima. Nenhuma configuração no console do Firebase é necessária.

## 15. Riscos

- **Comportamento de produção não medido.** O desenho se apoia no emulador para três pontos: o
  `accounts:resetPassword` só com `oobCode` devolver `requestType` e `newEmail`, o link pendente ficar
  inválido depois que outro é aplicado, e o gerador recusar endereço em uso. O primeiro é o que o
  `checkActionCode` do SDK cliente usa; os outros dois têm a consulta explícita (D10) e o erro
  `AUTH_OOB_CODE_INVALID` como rede. Fica 🔒 até o ciclo real da §14.
- **Aplicação direta pelo Identity Toolkit.** Quem tem o link pode trocar o e-mail sem a nossa rota, e aí
  nem a revogação explícita nem o evento de auditoria acontecem. A documentação do Firebase diz que troca
  de e-mail revoga refresh tokens em produção; o emulador não faz isso (`operations.js:861-863`). O caso
  exige ter o link, que só chega ao endereço novo. Não tem solução nesta fatia.
- **Aviso sem saída automática.** Trocar a senha depois do aviso não invalida um link já emitido no
  emulador. O canal de contestação é o suporte, que reverte a troca à mão no console; desfazer pelo link
  antigo está fora do corte.
- **Stripe divergente.** Recibos seguem para o endereço do checkout até o titular atualizar no portal.
  Decisão do usuário, documentada em `docs/PAYMENTS.md`.
- **Cópia de regra.** `lacksPasswordProvider` duplica `requiresPrivacyChannel`. Achado para o backlog.
