# Plano: política de senha (fatia 1 de `account-security-mfa`)

- **Spec:** [`specs/account-security-mfa.md`](../../../../specs/account-security-mfa.md), com o bloco "Reescopo que o `/analyze` deve aplicar" (auditoria de 2026-09-26).
- **Fatia:** só o item 4 do corte, a política de senha. Lista de sessões, logout local, encerramento seletivo e segundo fator ficam para fatias seguintes da mesma spec.
- **Rodada:** autônoma (`/cycle`). As decisões tomadas sem perguntar estão na seção 13, cada uma com a alternativa descartada.

---

## 1. Contexto

### 1.1 Resumo

Toda senha **definida** no produto (cadastro na `apps/app` e na `apps/web`, redefinição por link, troca na área de conta e criação de usuário pelo admin) passa a exigir no mínimo 8 caracteres, sem regra de composição, com a regra validada na borda da `apps/api` e declarada num único lugar (`@repo/shared`). O login e a confirmação da senha atual continuam aceitando as senhas de 6 e 7 caracteres que já existem.

### 1.2 Por que agora

- ASVS 5.0 L1 pede senha com pelo menos 8 caracteres e sem regra de composição (6.2.1 e 6.2.5), e pede que o usuário possa colar e usar gerenciador de senha (6.2.6 e 6.2.7). Fonte: [`specs/research/compliance-trust-baseline.md`](../../../../specs/research/compliance-trust-baseline.md), linhas 208-210, dentro da validade (`revalidate_after: 2027-08-21`).
- WCAG 2.2, critério 3.3.8: nada de CAPTCHA, de bloquear colar ou de exigir memorizar sequência de símbolos. Um mínimo de tamanho sem composição respeita isso.
- Hoje o mínimo é 6 e está declarado 11 vezes (`git grep "MIN_PASSWORD_LENGTH ="` em `apps/` e `packages/`, conferido nesta análise):

| camada | arquivo:linha | o que a senha ali faz |
|--------|---------------|-----------------------|
| `apps/api` | `(shared)/validation/auth.schema.ts:6` | nova senha na redefinição (`:20`) |
| `apps/api` | `(shared)/validation/account.schema.ts:8` | senha atual (`:42-45`, `:57-60`) e nova senha (`:46`) |
| `apps/api` | `(shared)/validation/user-admin.schema.ts:4` | senha do usuário criado pelo admin (`:9`), sem teto |
| `apps/app` | `sign-up/validations/signUpSchema.ts:6` | cadastro |
| `apps/app` | `reset-password/validations/resetPasswordSchema.ts:6` | redefinição |
| `apps/app` | `sign-in/validations/signInSchema.ts:6` | login |
| `apps/app` | `admin/(pages)/users/(validations)/userFormSchema.ts:7` | criação pelo admin |
| `apps/app` | `account/(validations)/accountFormSchema.ts:9` | senha atual (`:87`) e nova senha (`:91`), com a **mesma** mensagem |
| `apps/app` | `account/(validations)/accountDeletionSchema.ts:6` | senha atual na exclusão de conta |
| `apps/web` | `sign-up/validations/signUp.ts:3` | cadastro, mensagem em pt-br cravada (`:12`, `:18`) |
| `apps/web` | `sign-in/validations/signInSchema.ts:3` | login, mensagem em pt-br cravada (`:9`) |

### 1.3 O risco que a auditoria pediu para resolver

O cadastro das duas front-ends vai do navegador direto ao Firebase: `SignUpFormClient.tsx:112` (app) e `sign-up-form-client.tsx:41` (web) chamam `useAuth().signUp`, cuja mutation (`packages/auth/provider.tsx:358-363`) executa `createUserWithEmailAndPassword` (`packages/auth/client.ts:161-164`). Nenhum servidor nosso vê a senha, então validar só no formulário é o anti-padrão da regra de ouro 4.

O que já existe e muda a conta:

- **Já existe uma rota de cadastro na API, sem uso e sem validação.** `apps/api/app/(routes)/auth/sign-up/route.ts` lê o body cru (`:14`), não passa por Zod, responde erro fora do contrato (`{ error: e.message }`, `:29` e `:41-44`) e está na lista de rate limit do proxy (`apps/api/proxy.ts:46`). Nenhum front a chama (`git grep "auth/sign-up" packages/sdk` vazio). Qualquer pessoa pode criar conta por ela hoje com senha de 6 caracteres, então ela precisa da política de qualquer jeito.
- **A redefinição, a troca e a criação pelo admin já passam pela API**: `auth/password/reset/route.ts:21`, `account/password/route.ts:24`, `users/route.ts:42`. Basta a regra chegar nos schemas deles.
- **Precedente de front chamando a API antes de adotar a sessão no cliente**: o login com Google da `apps/app` (`apps/app/shared/lib/googleSignInApi.ts:21-60`).

O que o Firebase oferece, com fonte (Firebase developer knowledge, consultado em 2026-09-26):

- **Password policy do Firebase exige o upgrade para Firebase Authentication with Identity Platform** (doc `identity-platform/docs/password-policy`). A doc não diz se o emulador de Auth aplica a política.
- **Desligar o cadastro pelo cliente** (`auth/admin-restricted-operation`) também é recurso do Identity Platform.
- **Custo do upgrade** (doc `firebase.google.com/docs/auth`): no plano Spark o projeto passa a ter teto de 3.000 usuários ativos por dia; no Blaze, 50 mil MAU sem custo e depois US$ 0,0025 a 0,0055 por MAU. Não é serviço pago no tamanho de um MVP, mas exige cartão ou impõe teto de DAU, e cada fork herda a decisão.
- **Limite de criação de conta** (doc `firebase.google.com/docs/auth/limits`): 100 contas por hora **por IP**. Isso pesa na escolha de como a API cria a conta (seção 13, D4).

**Caminho escolhido, sem serviço pago e sem dependência nova:** o cadastro das duas front-ends passa pela rota `POST /auth/sign-up` da API, endurecida com Zod e com a política. A API cria a conta pelo Admin SDK e o front entra em seguida com `signIn` (e-mail e senha no cliente, como o login de hoje). O caminho direto (`createUserWithEmailAndPassword`) sai do código.

**O que continua aberto e está declarado:** a chave web do Firebase é pública, então quem chamar `identitytoolkit.googleapis.com/v1/accounts:signUp` na mão ainda cria conta com 6 ou 7 caracteres. O prejuízo fica com quem faz isso, que enfraquece a própria conta fora do produto. Fechar esse caminho exige Identity Platform e vira pergunta (seção 12, P1) e declaração no `docs/PRE-PRODUCTION.md`.

### 1.4 Objetivos

1. Uma fonte da regra: `PASSWORD_MIN_LENGTH = 8`, `PASSWORD_MAX_LENGTH = 1024` e `EXISTING_PASSWORD_MIN_LENGTH = 6` em `@repo/shared`, consumidos pelas três camadas. Zero `const MIN_PASSWORD_LENGTH` sobrando.
2. A regra vale na borda da API para cadastro, redefinição, troca e criação pelo admin, com `error.code` próprio (`AUTH_PASSWORD_TOO_SHORT`) traduzido nos 3 idiomas.
3. Cadastro das duas front-ends pela API, sem caminho direto ao Firebase no código.
4. Mensagens de validação com o número novo nos 3 idiomas; a mensagem do cadastro da `apps/web` sai do código e vai para o dicionário.
5. Quem já tem senha de 6 ou 7 caracteres continua entrando, trocando a senha e excluindo a conta.

### 1.5 Fora do escopo

- Itens 2, 3 e 5 da spec (sessões, logout local, encerramento seletivo, segundo fator).
- Checagem contra as 3.000 senhas mais comuns (ASVS 6.2.4): pergunta P2.
- Verificação contra base de senhas vazadas: a spec põe fora do corte (depende de serviço externo).
- Troca forçada das senhas curtas que já existem: pergunta P3.
- `apps/api/scripts/create-dev-admin.mjs` (script `.mjs` que não importa TypeScript): pergunta P4.
- A mensagem em pt-br cravada do login da `apps/web` (`sign-in/validations/signInSchema.ts:3` e `:9`): a spec registra como achado lateral fora do escopo. O arquivo só troca a constante.
- `autoComplete="new-password"` nos campos de senha nova: ajuda o gerenciador a sugerir senha, mas acrescentá-lo na redefinição, na troca e na criação pelo admin mexe em três componentes que esta fatia não toca por outro motivo. Fica como achado.
- Identity Platform (password policy ou cadastro desligado no cliente): pergunta P1.

### 1.6 Corte de MVP

A menor fatia que entrega o sinal de pronto "uma senha fraca é recusada no cadastro e na troca, com mensagem traduzida nos 3 idiomas, sem CAPTCHA e sem impedir colar" é: constante compartilhada + schemas das três camadas + cadastro pela API + copy. Tudo prova-se com teste unitário e de rota, e o fluxo de ponta a ponta roda sob o emulador.

### 1.7 Apps impactados, área, modo

| item | resposta |
|------|----------|
| Apps | `packages/shared`, `packages/sdk`, `apps/api`, `packages/auth`, `apps/app`, `apps/web`, `packages/internationalization`, `docs/` |
| Área do painel | pública (cadastro, redefinição), comum (troca de senha, exclusão), admin (criação de usuário) |
| Modo `subscription` × `simple` | igual nos dois. No `simple` o usuário comum se cadastra pela `apps/web`, que ganha a mesma mudança |
| Depende de plano | não |
| Env nova | nenhuma |
| Dependência nova | nenhuma |

---

## 2. Dados (Firestore)

N/A para a forma do documento. Nenhum campo novo, nenhuma consulta nova, nenhum índice, nenhuma regra.

Uma mudança de momento: o perfil (`user`) passa a nascer na rota de cadastro (`createDefaultUserProfile`, `apps/api/(shared)/lib/user-merge.ts:48-57`) em vez de nascer na primeira leitura de `/auth/me` (`user-merge.ts:22-24`). A forma do documento é a mesma (`type: COMMON`, `reference_id`, `onboarding` no primeiro passo), e a leitura preguiçosa continua lá para contas criadas pelo Google. A rota já desfaz a conta do Auth se o perfil falhar (`sign-up/route.ts:34-45`).

---

## 3. Contrato (`@repo/sdk`)

Uma ação nova em `packages/sdk/src/actions/auth/action.ts`, registrada no `Client` como parte de `authApi` (`packages/sdk/src/client/index.ts:28`, nada a registrar além disso). Contexto: nenhum (rota pública, anterior à sessão).

```ts
export type SignUpRequest = {
    email: string;
    password: string;
};

/** Carries no account data: the caller signs in right after with the same credentials. */
export type AuthAccountCreated = { created: true };

async signUp(body: SignUpRequest): Promise<AuthAccountCreated> {
    const { data } = await this.client.request<Response<AuthAccountCreated>>({
        url: "/auth/sign-up",
        method: "POST",
        data: body,
    });
    return data.data;
}
```

Segue a forma de `AuthActionRequested` e `AuthActionConfirmed` (`action.ts:48-50`). Nenhum consumidor quebra: a rota não tinha cliente.

---

## 4. API (`apps/api`)

### 4.1 Rotas tocadas

| rota | guard | o que muda |
|------|-------|-----------|
| `POST /auth/sign-up` | nenhum (superfície anterior à sessão, `docs/SECURITY.md:19`) | `parseRequestJson` + `parseSignUp` (Zod); conta criada por `getAuthInstance().createUser` em vez de `identitySignUp`; erros no contrato `{ error: { code } }`; resposta 201 `{ data: { created: true } }` |
| `POST /auth/password/reset` | nenhum | `password` com `newPasswordSchema`; senha curta responde `AUTH_PASSWORD_TOO_SHORT` antes de consumir o `oobCode` |
| `POST /account/password` | `requireCommonPanelApi` | `password` com `newPasswordSchema`, `currentPassword` com `existingPasswordSchema` |
| `POST /account/deletion` | `requireCommonPanelApi` | `currentPassword` com `existingPasswordSchema` (comportamento igual; só a constante muda de lugar) |
| `POST /users` | `requireAdminApi` | `password` com `newPasswordSchema` (ganha o teto de 1024 que não tinha) |

### 4.2 Validação

Arquivo novo `apps/api/(shared)/validation/password.schema.ts`:

```ts
import {
    EXISTING_PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@repo/shared/utils/helpers/passwordPolicy";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

export const newPasswordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH);

export const existingPasswordSchema = z
    .string()
    .min(EXISTING_PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH);

export function isPasswordTooShort(error: z.ZodError, field = "password"): boolean {
    return error.issues.some(
        (issue) => issue.code === "too_small" && issue.path[0] === field
    );
}

export const passwordTooShortResponse = (): Response =>
    Response.json(
        { error: { code: "AUTH_PASSWORD_TOO_SHORT" } },
        { status: HTTP_STATUS.BAD_REQUEST }
    );
```

Regra de precedência: se **qualquer** issue do body for `too_small` no campo `password`, a resposta é `AUTH_PASSWORD_TOO_SHORT`; senão, o código que o parser já devolvia (`VALIDATION_FAILED` ou `ACCOUNT_DELETION_CONFIRMATION_INVALID`). A senha não passa por `trim()`: espaço conta como caractere (ASVS 6.2.5 proíbe regra de composição, e truncar ou aparar muda a senha que a pessoa digitou).

Schema do cadastro, em `auth.schema.ts`:

```ts
export const signUpSchema = z.object({
    email: z.string().trim().max(EMAIL_MAX).email(),
    password: newPasswordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;
export const parseSignUp = (body: unknown) => parseWithPasswordPolicy(signUpSchema, body);
```

`parseWith` (`auth.schema.ts:48-61`) ganha uma irmã `parseWithPasswordPolicy`, que faz o mesmo mas devolve `passwordTooShortResponse()` quando `isPasswordTooShort`. `parsePasswordResetConfirm` passa a usá-la. `parseChangePassword` (`account.schema.ts:120-130`) e o `safeParse` inline de `users/route.ts:42-51` ganham o mesmo desvio.

### 4.3 Esqueleto do cadastro

```ts
export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseSignUp(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    let uid: string;
    try {
        ({ uid } = await getAuthInstance().createUser({
            email: parsed.value.email,
            password: parsed.value.password,
        }));
    } catch (error) {
        const code = mapAdminCreateUserErrorToCode(error);
        if (code) {
            return Response.json({ error: { code } }, { status: HTTP_STATUS.BAD_REQUEST });
        }
        logEvent("auth", "sign-up-failed", { requestId: requestIdFrom(req) });
        return Response.json(
            { error: { code: "USERS_AUTH_SIGN_UP_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    try {
        await createDefaultUserProfile(uid);
    } catch {
        await getAuthInstance().deleteUser(uid);
        logEvent("auth", "profile-create-failed", { requestId: requestIdFrom(req) });
        return Response.json(
            { error: { code: "USERS_PROFILE_CREATE_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    return Response.json({ data: { created: true } }, { status: HTTP_STATUS.CREATED });
}
```

`mapAdminCreateUserErrorToCode(error: unknown): string | null` entra em `apps/api/(shared)/lib/toolkit-error-codes.ts`, lendo o `code` do `FirebaseAuthError`:

| código do Admin SDK | `error.code` da API |
|---------------------|---------------------|
| `auth/email-already-exists` | `USERS_AUTH_EMAIL_ALREADY_IN_USE` |
| `auth/invalid-email` | `USERS_AUTH_INVALID_EMAIL` |
| `auth/invalid-password` | `USERS_AUTH_WEAK_PASSWORD` |
| qualquer outro | `null` (a rota responde 500 `USERS_AUTH_SIGN_UP_FAILED` e registra o evento sem e-mail) |

Confirme o nome exato dos códigos no `firebase-admin` instalado antes de escrever o mapa (`node_modules/firebase-admin/lib/utils/error.d.ts`, `AuthClientErrorCode`).

### 4.4 Payload e resposta de exemplo

```http
POST /auth/sign-up
Content-Type: application/json

{ "email": "qa-password-policy@example.com", "password": "oito-car" }
```

```json
201
{ "data": { "created": true } }
```

```json
400
{ "error": { "code": "AUTH_PASSWORD_TOO_SHORT" } }
```

### 4.5 Códigos de erro

| `error.code` | status | quando | novo? |
|--------------|--------|--------|-------|
| `AUTH_PASSWORD_TOO_SHORT` | 400 | senha nova com menos de 8 caracteres em cadastro, redefinição, troca ou criação pelo admin | **sim**, entra em `apiErrors` nos 3 idiomas |
| `VALIDATION_FAILED` | 400 | e-mail inválido, senha acima de 1024, campo faltando | não |
| `USERS_AUTH_EMAIL_ALREADY_IN_USE` | 400 | e-mail já cadastrado | não (antes vinha como `auth/email-already-in-use` do cliente, com a copy de `packages/auth`) |
| `USERS_AUTH_INVALID_EMAIL` | 400 | Admin SDK recusa o e-mail | não |
| `USERS_AUTH_WEAK_PASSWORD` | 400 | Admin SDK recusa a senha (só se um fork subir a regra no Identity Platform) | não |
| `USERS_AUTH_SIGN_UP_FAILED` | 500 | falha do Admin SDK fora do mapa | não |
| `USERS_PROFILE_CREATE_FAILED` | 500 | perfil não gravou; conta do Auth desfeita | não |
| `AUTH_RATE_LIMITED` | 429 | Arcjet (só com `ARCJET_KEY`) | não |
| JSON malformado | o que `parseRequestJson` já devolve | body que não é JSON | não |

Todos os códigos reaproveitados já têm copy nos 3 idiomas (`translations/packages/shared/utils.ts:70-84`, `:182-193` e equivalentes em `es`).

---

## 5. Front-end

### 5.1 `apps/app`

- **Cadastro** (`sign-up/components/SignUpFormClient.tsx`): o `onSubmit` (`:111-116`) deixa de chamar `useAuth().signUp`. Uma mutation local chama `apiClient.authApi.signUp`; no sucesso, dispara `useAuth().signIn.mutate(values, { onSuccess: requestVerificationEmail })`. O `signIn` do provider já faz cookie, alerta de sucesso e redirecionamento (`provider.tsx:333-356`), então o comportamento depois da criação é o mesmo de hoje. Os botões ficam desabilitados enquanto `createAccount.isPending || signIn.isPending || googleSignIn.isPending` (`:179`, `:201`).
- **Schemas**: `signUpSchema.ts`, `resetPasswordSchema.ts` e `userFormSchema.ts` usam `PASSWORD_MIN_LENGTH` com a mensagem de sempre (que passa a dizer 8). `signInSchema.ts` e `accountDeletionSchema.ts` usam `EXISTING_PASSWORD_MIN_LENGTH`. `accountFormSchema.ts` usa `EXISTING_PASSWORD_MIN_LENGTH` com `validation.min` para `currentPassword` e `PASSWORD_MIN_LENGTH` com a chave nova `validation.newPasswordMin` para `password`.

```diff
 // SignUpFormClient.tsx
-    const { signUp, loading: authLoading, user } = useAuth();
+    const { signIn, loading: authLoading, user } = useAuth();
+
+    const createAccount = useMutation({
+        mutationFn: (values: SignUpRequest) => apiClient.authApi.signUp(values),
+        onError: (error) =>
+            errorAlert(handleClientError(new FormattedError(error, locale))),
+        onSuccess: (_created, values) =>
+            signIn.mutate(values, { onSuccess: requestVerificationEmail }),
+    });
 ...
     const onSubmit = (data: SignUpFormValues) => {
-        signUp.mutate(
-            { email: data.email, password: data.password },
-            { onSuccess: requestVerificationEmail }
-        );
+        createAccount.mutate({ email: data.email, password: data.password });
     };
```

### 5.2 `apps/web`

- **Cadastro** (`sign-up/components/sign-up-form-client.tsx`): mesma troca, com o `apiClient` da web (`apps/web/shared/lib/client.ts`). A web não pede e-mail de verificação hoje e continua sem pedir.
- **Schema do cadastro** (`sign-up/validations/signUp.ts`): vira factory `buildSignUpSchema(dictionary)`, no padrão da `apps/app`, com as mensagens vindas de `dictionary.apps.web.pages.signUp.validation`. O form monta o schema com `useMemo` (hoje importa `signUpSchema` estático, `:18` e `:27`).
- **Login** (`sign-in/validations/signInSchema.ts`): só troca a constante local por `EXISTING_PASSWORD_MIN_LENGTH`.

### 5.3 `packages/auth`

- `client.ts`: sai `signUp` (`:157-164`) e o import de `createUserWithEmailAndPassword` (`:7`).
- `provider.tsx`: sai `signUp` do import (`:8`), do tipo `AuthContextType` (`:40`), a `signUpMutation` (`:358-363`) e a entrada no `value` (`:392`).
- `types.ts`: sai `SignUpDTO` (`:48-51`) se ficar sem uso depois das remoções.
- `components/sign-up.tsx` e a entrada `./components/sign-up` do `package.json` (`:18`): apagados. O componente não é importado em lugar nenhum (`git grep "@repo/auth/components/sign-up"` vazio), usa `useAuth().signUp` (`:18`, `:32`) e tem copy em inglês cravada, com "6 characters" (`:73`).

### 5.4 Estados

Sem tela nova. Estados que importam: erro inline do Zod (senha curta, senhas diferentes), botão desabilitado durante criação e durante o login que vem em seguida, toast traduzido para erro da API (e-mail em uso, senha curta vinda de bundle antigo, 429).

---

## 6. i18n

| arquivo | chave | pt-br | en | es |
|---------|-------|-------|----|----|
| `translations/apps/app/pages/signUp/index.ts` (`:19`, `:45`, `:71`) | `validation.passwordMin` | A senha deve ter pelo menos 8 caracteres | Password must be at least 8 characters | La contraseña debe tener al menos 8 caracteres |
| `translations/apps/app/pages/resetPassword/index.ts` (`:16`, `:45`, `:74`) | `validation.passwordMin` | idem | idem | idem |
| `translations/apps/app/pages/admin/users.ts` (`:47`, `:103`, `:158`) | `form.validation.passwordMin` | A senha deve ter pelo menos 8 caracteres. | Password must be at least 8 characters. | La contraseña debe tener al menos 8 caracteres. |
| `translations/apps/app/pages/common/account.ts` (bloco `security.validation`, perto de `:63`, `:224`, `:385`) | `newPasswordMin` (**nova**) | A nova senha deve ter ao menos 8 caracteres. | The new password must have at least 8 characters. | La nueva contraseña debe tener al menos 8 caracteres. |
| `translations/apps/web/pages/signUp/index.ts` | `validation.emailInvalid` (**nova**) | Email inválido | Invalid email | Email no válido |
| idem | `validation.passwordMin` (**nova**) | A senha deve ter pelo menos 8 caracteres | Password must be at least 8 characters | La contraseña debe tener al menos 8 caracteres |
| idem | `validation.passwordsDoNotMatch` (**nova**) | As senhas não coincidem | Passwords do not match | Las contraseñas no coinciden |
| `translations/packages/shared/utils.ts` (perto de `:72`, `:184`, `:295`) | `apiErrors.AUTH_PASSWORD_TOO_SHORT` (**nova**) | A senha deve ter pelo menos 8 caracteres. | The password must have at least 8 characters. | La contraseña debe tener al menos 8 caracteres. |

Não mudam, porque continuam falando da senha que já existe (6): `signIn.validation.passwordMin`, `account.security.validation.min` e `account.privacy.delete.validation.min`.

O número 8 fica escrito na copy, como o 6 fica hoje. Para a copy e a constante não divergirem, o teste da seção 7 confere que toda mensagem de senha nova contém `String(PASSWORD_MIN_LENGTH)` e toda mensagem de senha existente contém `String(EXISTING_PASSWORD_MIN_LENGTH)`, nos 3 idiomas.

---

## 7. Autorização e segurança

- **Borda no servidor**: cadastro, redefinição, troca e criação pelo admin validam a política na API. O front repete a regra por conveniência.
- **Guards**: nenhum muda. `/auth/sign-up` e `/auth/password/reset` são públicas por natureza; troca e exclusão seguem em `requireCommonPanelApi`; criação em `requireAdminApi`.
- **Impersonação**: a troca de senha e a exclusão já respondem sob o guard do painel comum, e esta fatia não mexe nisso. Nada novo a checar.
- **Rate limit**: `/auth/sign-up` já está em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:44-55`). Com o Admin SDK, o limite do Firebase de 100 contas por hora por IP deixa de valer para o cadastro, e o Arcjet (20 requisições por 60 s por IP, `docs/SECURITY.md:146`) vira a única trava. Sem `ARCJET_KEY` ele é no-op. Isso vai para o item 8 do `docs/PRE-PRODUCTION.md` e para a pergunta P5.
- **Enumeração de e-mail**: o cadastro responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`, como o cliente respondia `auth/email-already-in-use`. Postura igual à de hoje.
- **Log**: o evento `sign-up-failed` leva só o `requestId`, sem e-mail nem senha (mesmo padrão de `profile-create-failed`).
- **Caminho residual**: REST direto do Identity Toolkit com a chave pública (seção 1.3).

---

## 8. Testes planejados

Todos em Vitest, sem emulador e sem app de pé. Nenhum teste aqui tem a infra como objeto: a política é lógica nossa, e o Firebase só entra por mock.

| nível | arquivo | o que prova |
|-------|---------|-------------|
| schema (API) | `apps/api/__tests__/accountSchema.test.ts` (atualizar `:79-100`) | nova senha com 7 → `AUTH_PASSWORD_TOO_SHORT`; com 8 → ok; senha atual com 6 → ok; senha atual com 5 → `VALIDATION_FAILED`; exclusão aceita senha atual de 6 |
| rota (API) | `apps/api/__tests__/signUpProfile.test.ts` (reescrever o mock de `identitySignUp` para `createUser`) | 201 `{ data: { created: true } }` e `createUser` chamado com e-mail e senha; perfil com onboarding no primeiro passo (caso atual `:88-98` mantido); rollback (caso `:100-107` com `USERS_PROFILE_CREATE_FAILED`); 7 caracteres → 400 `AUTH_PASSWORD_TOO_SHORT` sem chamar `createUser`; e-mail inválido → `VALIDATION_FAILED`; JSON malformado → resposta do `parseRequestJson`; `auth/email-already-exists` → `USERS_AUTH_EMAIL_ALREADY_IN_USE`; erro desconhecido → 500 `USERS_AUTH_SIGN_UP_FAILED` |
| rota (API) | `apps/api/__tests__/authPasswordReset.test.ts` (trocar `SHORTEST_ACCEPTED_PASSWORD = 6`, `:73`, pela constante compartilhada) | 8 aceito; 7 → 400 `AUTH_PASSWORD_TOO_SHORT` e `identityResetPassword` não é chamado (o `oobCode` segue válido) |
| rota (API) | `apps/api/__tests__/accountPasswordRoute.test.ts` | nova senha com 7 → 400 `AUTH_PASSWORD_TOO_SHORT` sem conferir a senha atual; senha atual de 6 caracteres aceita |
| rota (API) | `apps/api/__tests__/usersRoute.test.ts` (acrescentar casos de `POST`) | senha de 7 → 400 `AUTH_PASSWORD_TOO_SHORT` sem chamar `identitySignUp`; 1025 → `VALIDATION_FAILED` |
| unit (API) | `apps/api/__tests__/adminCreateUserErrorCodes.test.ts` (novo) | o mapa da seção 4.3, incluindo `null` para erro sem `code` |
| schema (app) | `apps/app/__tests__/passwordPolicySchemas.test.ts` (novo) | com o dicionário real: cadastro, redefinição e criação pelo admin recusam 7 com a mensagem certa e aceitam 8; login aceita 6 (regressão: login não muda) |
| schema (app) | `apps/app/__tests__/accountFormSchema.test.ts` (atualizar `:80-90`) e `accountDeletionSchema.test.ts` | troca: atual de 6 ok, nova de 7 recusada com `newPasswordMin`; exclusão: atual de 6 ok |
| componente (app) | `apps/app/__tests__/signUpFormApi.test.tsx` (novo, no molde de `signInPersistedSessionRedirect.test.tsx`) | enviar o form chama `apiClient.authApi.signUp` e depois `useAuth().signIn.mutate` com as mesmas credenciais; erro da API mostra alerta traduzido e **não** chama `signIn`; senha de 7 mostra o erro inline e não chama a API |
| copy (app) | `apps/app/__tests__/passwordPolicyCopy.test.ts` (novo) | toda mensagem de senha nova (app, web, `apiErrors.AUTH_PASSWORD_TOO_SHORT`) contém `String(PASSWORD_MIN_LENGTH)` nos 3 idiomas; as de senha existente contêm `String(EXISTING_PASSWORD_MIN_LENGTH)` |
| copy (app) | `apps/app/__tests__/accountApiErrorCopy.test.ts` (acrescentar `AUTH_PASSWORD_TOO_SHORT` à lista, `:15-43`) | o código chega traduzido pelo `handleClientError` |
| schema (web) | `apps/web/__tests__/signUpSchema.test.ts` (novo) | a factory usa o dicionário web nos 3 idiomas; 7 recusado, 8 aceito, senhas diferentes recusadas |
| componente (web) | `apps/web/__tests__/signUpFormApi.test.tsx` (novo) | mesmo contrato do teste da app, sem o e-mail de verificação |
| paridade | `packages/internationalization/__tests__/parity.test.ts` (existente) | as chaves novas existem nos 3 idiomas |

O E2E existente (`apps/e2e/tests/signUp.spec.ts`) usa `SEED_PASSWORD = "demo1234"` (8 caracteres, `apps/e2e/support/seedAccounts.ts:3`) e passa a exercitar o cadastro pela API sem mudança. Não se acrescenta caso de Playwright: o unitário já prova a recusa.

---

## 9. O que o `/test` vai percorrer

Stack: emulador + `api` + `app` + `web` (`pnpm dev` com o emulador, ou o mesmo arranjo do `pnpm e2e`). Seed com `pnpm --filter api seed`; todas as contas usam `demo1234`.

| # | fluxo | como produzir | esperado |
|---|-------|---------------|----------|
| F1 | cadastro na `apps/app` (`/{locale}/sign-up`) | e-mail `qa-password-policy-app-<n>@example.com`, senha de 7 e depois de 8 | 7: erro inline com "8" no idioma da rota, nenhuma requisição à API; 8: conta criada, cai no onboarding, `POST /auth/sign-up` 201 seguido do login |
| F2 | cadastro na `apps/web` (`/{locale}/sign-up`) | idem, prefixo `qa-password-policy-web-` | igual ao F1; a mensagem agora muda de idioma (antes era pt-br em todos) |
| F3 | redefinição (`/{locale}/reset-password?oobCode=…`) | pedir o link na tela de esqueci a senha; ler o `oobCode` em `http://localhost:9099/emulator/v1/projects/<projectId>/oobCodes` | 7 recusado no form; 8 aceito; o mesmo link, se a senha curta tivesse ido ao servidor, seguiria válido |
| F4 | troca de senha (aba de segurança da conta) | `user@example.com` / `demo1234` | nova de 7 recusada com `newPasswordMin`; nova de 8 aceita (e derruba as sessões, como hoje) |
| F5 | conta antiga com senha de 6 | criar no emulador por REST: `POST http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key` com senha de 6 | entra pelo login da app e da web; troca a senha informando a atual de 6; confirma a exclusão com a atual de 6 |
| F6 | criação pelo admin | `admin@example.com` / `demo1234`, tela de usuários | 7 recusado no form; 8 cria |
| F7 | API direta | `curl` em `POST /auth/sign-up`, `/auth/password/reset` e `/users` com senha de 7 | 400 `{ "error": { "code": "AUTH_PASSWORD_TOO_SHORT" } }` nas três |
| F8 | colar senha | colar nos campos de senha de F1, F2, F4 | colar funciona, nenhum bloqueio (WCAG 3.3.8, ASVS 6.2.6) |
| F9 | e-mail repetido | repetir o e-mail do F1 | toast "Este e-mail já está em uso." traduzido |

Combinações: F1, F2 e F4 nos 3 idiomas, light e dark, e em 375 px (a mensagem de erro inline cabe sem quebrar o layout). F3, F5, F6, F7 e F9 em um idioma bastam.

O F5 também demonstra o caminho residual da seção 1.3: o REST direto aceita 6 caracteres. Isso é esperado e declarado, não é defeito da entrega.

Fica 🔒, sem como observar sem infra externa: password policy do Identity Platform; limite do Arcjet sem `ARCJET_KEY`; limite real de 100 contas por hora por IP num projeto Firebase de verdade.

Contas criadas pelo QA: só no emulador, com prefixo `qa-password-policy-`. Listar no relatório.

---

## 10. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Cadastro na `apps/app` recusa senha com menos de 8 caracteres**
  Com 7 caracteres (incluindo 7 espaços), o formulário mostra "A senha deve ter pelo menos 8 caracteres" no idioma da rota e não envia nada à API. Com exatamente 8, a conta é criada e a pessoa cai no onboarding, com o e-mail de verificação pedido como hoje. Duplo clique no botão não cria duas contas: o botão fica desabilitado durante a criação e durante o login que vem depois.

- [ ] **Cadastro na `apps/web` recusa senha curta, com mensagem no idioma da rota**
  O comportamento é o mesmo da `apps/app`. As mensagens de e-mail inválido, senha curta e senhas diferentes vêm do dicionário e trocam de idioma em `/en/sign-up` e `/es/sign-up`, o que antes não acontecia (eram pt-br em todos). Com 8 caracteres a conta é criada e a pessoa entra.

- [ ] **O cadastro passa pela API e não existe mais caminho direto no código**
  Um cadastro bem-sucedido gera `POST /auth/sign-up` com resposta 201 `{ "data": { "created": true } }`, seguido do login com e-mail e senha. `git grep createUserWithEmailAndPassword -- apps packages` não devolve nada, e `useAuth()` não expõe mais `signUp`. O perfil no Firestore nasce na rota, com `onboarding.step = "profile"`.

- [ ] **A API recusa senha curta em todas as rotas que definem senha**
  `POST /auth/sign-up`, `POST /auth/password/reset`, `POST /account/password` e `POST /users` respondem 400 `{ "error": { "code": "AUTH_PASSWORD_TOO_SHORT" } }` para senha nova de 7 caracteres, mesmo que o front seja contornado. Na redefinição, o `oobCode` não é consumido quando a senha é recusada. Senha acima de 1024 caracteres responde `VALIDATION_FAILED`.

- [ ] **Quem já tem senha de 6 ou 7 caracteres continua usando a conta**
  O login da `apps/app` e da `apps/web` aceita senha de 6. A troca de senha aceita a senha atual de 6, e a exclusão de conta aceita a confirmação com senha de 6. Nenhuma dessas telas mostra a mensagem de 8 para a senha atual.

- [ ] **Troca de senha distingue senha atual de senha nova**
  Na aba de segurança da conta, a senha atual segue com a mensagem de mínimo 6 e a nova usa a mensagem nova, "A nova senha deve ter ao menos 8 caracteres." (e equivalentes em en e es). Senhas diferentes seguem com "As senhas não conferem.".

- [ ] **Redefinição e criação pelo admin seguem a política**
  A tela de redefinição recusa 7 e aceita 8. O formulário de criação de usuário do admin recusa 7 com "A senha deve ter pelo menos 8 caracteres." e cria com 8.

- [ ] **Erros da API chegam traduzidos**
  `AUTH_PASSWORD_TOO_SHORT` tem copy nos 3 idiomas em `apiErrors`. E-mail repetido no cadastro mostra "Este e-mail já está em uso." (e en, es) por toast. Falha do Admin SDK fora do mapa responde 500 `USERS_AUTH_SIGN_UP_FAILED`, sem stack trace, e registra o evento com `requestId` e sem e-mail.

- [ ] **Colar senha e usar gerenciador continuam funcionando**
  Colar funciona em todos os campos de senha tocados, e não há CAPTCHA nem regra de composição (maiúscula, símbolo, número). Uma senha de 8 letras minúsculas é aceita. Isso cumpre WCAG 2.2 3.3.8 e ASVS 5.0 6.2.5 a 6.2.7.

- [ ] **Uma fonte só para a regra**
  `git grep "MIN_PASSWORD_LENGTH =" -- apps packages` não devolve nada. `PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH` e `EXISTING_PASSWORD_MIN_LENGTH` vivem em `packages/shared/utils/helpers/passwordPolicy.ts`. O teste de copy falha se alguém mudar a constante e esquecer a mensagem.

- [ ] **Layout e temas**
  A mensagem de erro inline no cadastro (app e web) e na troca de senha aparece legível em light e dark e cabe a 375 px de largura nos 3 idiomas, sem estourar o card do formulário.

- [ ] **Sem regressão no restante do fluxo de entrada**
  Login com Google, logout, verificação de e-mail e onboarding seguem iguais. `pnpm turbo run lint typecheck test` passa, e o E2E de cadastro (`apps/e2e/tests/signUp.spec.ts`) segue verde com `demo1234`.

---

## 11. Blueprint técnico (Etapa 2)

### 11.1 Fonte única

`packages/shared/utils/helpers/passwordPolicy.ts` (novo), reexportado em `packages/shared/utils/helpers/index.ts`:

```ts
/** ASVS 5.0 L1 (6.2.1, 6.2.5): length is the only rule; no composition requirements. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 1024;

/**
 * Accounts created before the policy may hold passwords of 6 or 7 characters, and
 * Firebase never accepted fewer than 6. Anything that checks a password someone
 * already has (sign-in, current-password confirmation) must keep accepting them.
 */
export const EXISTING_PASSWORD_MIN_LENGTH = 6;
```

Sem Zod em `@repo/shared` (o pacote não depende dele, `packages/shared/package.json`). Cada camada monta o próprio schema com as constantes, porque as mensagens são diferentes em cada uma.

### 11.2 Arquivos a tocar

| arquivo | mudança |
|---------|---------|
| `packages/shared/utils/helpers/passwordPolicy.ts` | novo (11.1) |
| `packages/shared/utils/helpers/index.ts` | `export * from "./passwordPolicy";` |
| `packages/sdk/src/actions/auth/action.ts` | `SignUpRequest`, `AuthAccountCreated`, `signUp()` (seção 3) |
| `apps/api/(shared)/validation/password.schema.ts` | novo (4.2) |
| `apps/api/(shared)/validation/auth.schema.ts` | sai `:6`; `passwordResetConfirmSchema.password` (`:20`) usa `newPasswordSchema`; `PASSWORD_MAX` (`:7`) sai; `signUpSchema`, `parseSignUp`, `parseWithPasswordPolicy` |
| `apps/api/(shared)/validation/account.schema.ts` | saem `:8-9`; `currentPassword` (`:42-45`, `:57-60`) com `existingPasswordSchema`; `password` (`:46`) com `newPasswordSchema`; `parseChangePassword` (`:120-130`) devolve `AUTH_PASSWORD_TOO_SHORT` |
| `apps/api/(shared)/validation/user-admin.schema.ts` | sai `:4`; `password` (`:9`) com `newPasswordSchema` |
| `apps/api/app/(routes)/users/route.ts` | `:42-51`: `isPasswordTooShort(parsed.error)` antes do `VALIDATION_FAILED` |
| `apps/api/app/(routes)/auth/sign-up/route.ts` | reescrita (4.3) |
| `apps/api/(shared)/lib/toolkit-error-codes.ts` | `mapAdminCreateUserErrorToCode` |
| `apps/api/__tests__/*` | seção 8 |
| `apps/app/.../sign-up/validations/signUpSchema.ts` | `:6` sai; `PASSWORD_MIN_LENGTH` em `:16` e `:19` |
| `apps/app/.../sign-up/components/SignUpFormClient.tsx` | mutation `createAccount` + `signIn` (5.1) |
| `apps/app/.../reset-password/validations/resetPasswordSchema.ts` | `:6` sai; `PASSWORD_MIN_LENGTH` em `:15` e `:18` |
| `apps/app/.../sign-in/validations/signInSchema.ts` | `:6` sai; `EXISTING_PASSWORD_MIN_LENGTH` em `:13` |
| `apps/app/.../admin/(pages)/users/(validations)/userFormSchema.ts` | `:7` sai; `PASSWORD_MIN_LENGTH` em `:16` |
| `apps/app/.../account/(validations)/accountFormSchema.ts` | `:9` sai; `:87` com `EXISTING_PASSWORD_MIN_LENGTH`; `:91` com `PASSWORD_MIN_LENGTH` e `validation.newPasswordMin` |
| `apps/app/.../account/(validations)/accountDeletionSchema.ts` | `:6` sai; `EXISTING_PASSWORD_MIN_LENGTH` em `:20` |
| `apps/app/__tests__/*` | seção 8 |
| `apps/web/app/[locale]/sign-up/validations/signUp.ts` | factory `buildSignUpSchema(dictionary)` com `PASSWORD_MIN_LENGTH` |
| `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx` | schema por `useMemo`; mutation `createAccount` + `signIn`; `disabled` em `:108` |
| `apps/web/app/[locale]/sign-in/validations/signInSchema.ts` | `:3` sai; `EXISTING_PASSWORD_MIN_LENGTH` em `:9` |
| `apps/web/__tests__/*` | seção 8 |
| `packages/auth/client.ts` | sai `signUp` (`:157-164`) e o import de `:7` |
| `packages/auth/provider.tsx` | sai `signUp` (`:8`, `:40`, `:358-363`, `:392`) |
| `packages/auth/types.ts` | sai `SignUpDTO` (`:48-51`) se ficar sem uso |
| `packages/auth/components/sign-up.tsx` + `packages/auth/package.json:18` | apagados |
| `packages/internationalization/translations/...` | seção 6 |
| `docs/SECURITY.md` | `:7` (cadastro passa pela API; login segue no cliente); `:153` (o formulário de login continua direto ao Firebase, o de cadastro não) |
| `docs/PRE-PRODUCTION.md` | item 8 (`:557-563`): o cadastro passa a depender do Arcjet como única trava; nova "Declaração — o que a política de senha não alcança" na seção Higiene |

### 11.3 Ordem de implementação e commit

1. `feat(shared): add shared password policy constants`
2. `feat(sdk): add auth sign-up action`
3. `feat(api): enforce password policy at the api edge` (schemas + `password.schema.ts` + testes de schema e rota de reset, troca, admin)
4. `feat(api): validate and create accounts server-side on sign-up` (rota de cadastro + mapa de erros + testes)
5. `feat(app): sign up through the api and apply the password policy`
6. `feat(web): sign up through the api with translated validation`
7. `refactor(auth): drop the client-side sign-up path`
8. `feat(internationalization): password policy copy and AUTH_PASSWORD_TOO_SHORT`
9. `docs: document the password policy and its residual path`
10. `docs(features): account-security-mfa`

Os commits 5 e 6 usam chaves de i18n que só chegam no 8, e o 7 só compila depois que 5 e 6 deixam de usar `signUp`. Os estados intermediários 5 a 7 podem falhar no typecheck; é a mesma ordem que o repo já adota (`.claude/rules/git-commits.md`), e o `/review` decide se junta ou mantém.

### 11.4 Env e configuração

Nenhuma variável nova. Nada a configurar para a fatia funcionar. O que é recomendado ou opcional está na seção 14.

---

## 12. Perguntas em aberto

Cada pergunta já vem com a opção adotada nesta rodada.

| # | pergunta | opções | adotada | por quê |
|---|----------|--------|---------|---------|
| P1 | Fechar também o cadastro por REST direto com a chave pública? | (a) não, declarar; (b) Identity Platform com password policy em `ENFORCE`, mínimo 8; (c) Identity Platform com cadastro pelo cliente desligado | (a) | (b) e (c) exigem o upgrade: teto de 3.000 DAU no Spark ou cartão no Blaze (50 mil MAU grátis, depois US$ 0,0025 a 0,0055 por MAU). A política proíbe adotar serviço pago sem passar pelo relatório, e o risco residual recai só sobre quem contorna o produto. Vai como declaração no `docs/PRE-PRODUCTION.md` |
| P2 | Checar a senha contra as 3.000 mais comuns (ASVS 6.2.4)? | (a) próxima fatia; (b) nesta, com lista estática só no servidor | (a) | A lista precisa de fonte e licença escolhidas, e mandá-la ao bundle do cliente custa peso. O brief desta fatia fixou "mínimo 8, sem composição" |
| P3 | Obrigar quem tem senha de 6 ou 7 a trocar? | (a) não; (b) aviso no login; (c) troca obrigatória | (a) | O servidor não sabe o tamanho das senhas existentes. (b) e (c) mudam o login, que o reescopo mandou deixar como está |
| P4 | `create-dev-admin` deve aplicar a política? | (a) não nesta fatia; (b) sim, com a constante repetida no `.mjs` | (a) | O script roda em Node puro e não importa TypeScript; repetir a constante cria a 12ª cópia, e não há precedente de teste que rode script por processo |
| P5 | `ARCJET_KEY` passa a ser obrigatória? | (a) segue recomendada, com o risco escrito; (b) bloqueador | (a) | A spec pede opt-in e modo degradado; o texto do item 8 ganha o cadastro como motivo |

Nenhuma discordância do corte da spec.

---

## 13. Decisões tomadas sem perguntar

| # | decisão | alternativa descartada | por quê |
|---|---------|------------------------|---------|
| D1 | Constantes em `@repo/shared` | `@repo/auth`; manter cópias | A spec pede a regra em `@repo/shared`, consumida pelas três camadas. `@repo/auth` puxaria Firebase para quem só precisa de um número |
| D2 | Dois números: 8 para definir senha, 6 para conferir senha existente | `min(1)` no login e na senha atual | Menor raio: login e confirmação ficam idênticos, inclusive a copy. O reescopo exclui o login da regra |
| D3 | Cadastro pela rota `POST /auth/sign-up` da API | Identity Platform; manter o cadastro direto e validar só no cliente | Único caminho sem custo que põe a regra num servidor nosso. A rota já existia e precisava de validação de qualquer jeito |
| D4 | A rota cria a conta com `getAuthInstance().createUser` | manter `identitySignUp` (REST) | O Firebase limita a criação a 100 contas por hora por IP; pelo REST, todo cadastro do produto sairia do IP do servidor e dividiria esse teto. O Admin SDK não passa por ele, e a rota já tem o Arcjet |
| D5 | O formulário chama o SDK e depois o `signIn` do provider | injetar callback de criação no `AuthProvider` | O layout da web é Server Component e não passa função, e o `DesignSystemProvider` já monta outro `AuthProvider` por dentro. Seriam três pacotes a mais para o mesmo efeito |
| D6 | Tirar `signUp` do provider e do client e apagar `components/sign-up.tsx` | manter como está | Fecha o caminho direto no código. O componente está sem uso e tem copy em inglês cravada |
| D7 | Código novo `AUTH_PASSWORD_TOO_SHORT` | `VALIDATION_FAILED`; reaproveitar `USERS_AUTH_WEAK_PASSWORD` | Durante o deploy, um bundle antigo (mínimo 6) chega à API nova; a pessoa precisa ler o motivo. `USERS_AUTH_WEAK_PASSWORD` também vem do Firebase, e num fork com regra no Identity Platform a copy "8 caracteres" mentiria |
| D8 | Cadastro responde 201 `{ data: { created: true } }` | manter `{ session, user }` | O Admin SDK não devolve sessão; o front entra em seguida. Mesma forma de `AuthActionRequested`/`AuthActionConfirmed` |
| D9 | Senha sem `trim()`; espaços contam | aparar | Aparar muda a senha digitada; ASVS proíbe regra de composição |
| D10 | Front sem teto; a API aplica 1024 | acrescentar `.max` com chave nova nos formulários | Ninguém digita 1025 caracteres; a API cobre o caso com `VALIDATION_FAILED` |
| D11 | Chave nova `newPasswordMin` na troca de senha | reaproveitar `validation.min` | `min` serve à senha atual (6) e à nova (8) no mesmo form; uma chave só não diz as duas coisas |
| D12 | Login da web só troca a constante | traduzir as mensagens junto | A spec põe essa copy fora do escopo, como achado lateral |
| D13 | Teste de copy amarra a mensagem ao número | interpolar `{min}` nas mensagens | Interpolação mexeria em todos os consumidores das chaves; o teste pega a divergência com custo menor |

---

## 14. Pré-requisitos manuais de infra

**Nenhum pré-requisito bloqueia esta entrega.** Não há variável, índice, regra do Firestore nem configuração do Firebase a fazer para a política funcionar, local ou em produção. O `/test` não deve reprovar nada por causa dos itens abaixo.

| item | tipo | onde fica | efeito se não fizer |
|------|------|-----------|---------------------|
| `ARCJET_KEY` em produção | recomendado (já é o item 8 do `docs/PRE-PRODUCTION.md`) | o `/develop` atualiza o texto do item 8 | `/auth/sign-up` fica sem limite nenhum, porque o Admin SDK não passa pelo limite por IP do Firebase |
| Identity Platform com password policy (mínimo 8, `ENFORCE`) ou cadastro pelo cliente desligado | opcional, decisão de custo (P1) | nova declaração na seção Higiene do `docs/PRE-PRODUCTION.md` | o REST direto com a chave pública continua aceitando senha de 6 ou 7 |

---

## 15. Riscos

- **O cadastro passa a depender da `apps/api` no ar.** Antes ia direto ao Firebase. Se a API cair, ninguém se cadastra (o login continua funcionando).
- **Conta criada e login falhando logo depois** (rede, por exemplo): a pessoa vê o erro, a conta existe, e tentar de novo responde "e-mail já em uso". O caminho de saída é a tela de login. Aceito nesta fatia; o QA registra se aparecer.
- **Sem Arcjet, criação de contas em massa pela API** (P5).
- **Contrato de `useAuth()` muda**: `signUp` some. Fork que o use quebra no typecheck, o que é o sinal certo.
- **Commits intermediários** podem falhar no typecheck (11.3).
- **Caminho residual** do REST direto (1.3, P1).
- **Código de erro do Admin SDK** pode ter nome diferente na versão instalada; conferir antes de escrever o mapa (4.3).
