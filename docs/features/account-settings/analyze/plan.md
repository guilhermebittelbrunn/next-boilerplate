# Plano — Área de conta e preferências do usuário

- **Slug**: `account-settings`
- **Spec de origem**: `specs/account-settings.md` (corte de MVP já decidido — este plano responde só o *como*)
- **Base**: `dubai` @ `9154776` (== `origin/main`)
- **Slice de referência**: `entity` · **Precedente mais fresco**: `file-upload-storage` (PR #11)

---

# Etapa 1 — Análise

## 1. Contexto

O usuário autenticado não tem onde mexer na própria conta. Não existe página de conta/perfil/configurações
em `apps/app` (confirmado: nenhum diretório `*account*`/`*settings*`/`*profile*` sob
`apps/app/app/[locale]/(authenticated)/`), o menu do avatar tem uma única ação — sair
(`apps/app/shared/components/ui/ProfileDropdown.tsx:49-52`) — e o grupo "Settings" da sidebar declara
quatro itens com `url: "#"` (`apps/app/app/[locale]/(authenticated)/(common)/routes.tsx:60-82`), além de
outros quatro em "Documentation" (`:37-59`).

Do lado do servidor, **toda rota de usuário é de administrador**: `users/route.ts:21,34` e
`users/[id]/route.ts:15,33,75` estão sob `requireAdminApi`. Não existe caminho pelo qual um usuário comum
edite a si mesmo. Escrita de usuário fora do `admin` é **novidade estrutural no repo** — e é onde mora o
risco desta entrega.

## 2. Objetivos (o que precisa ser verdade no fim)

1. Existe `/[locale]/account`, acessível pelo menu do avatar e pela sidebar; nenhum item da área comum
   aponta para `#`.
2. O usuário edita nome de exibição e telefone, e o resultado aparece no cabeçalho sem recarregar.
3. O usuário troca a própria senha **informando a senha atual**; a troca encerra as sessões.
4. Tema e idioma acompanham a conta (outro navegador, mesma preferência).
5. O usuário envia uma foto de perfil, validada em tipo e tamanho **no servidor**.
6. A API garante que cada um só altera a si mesmo — guard de painel comum, ownership derivado do token.

## 3. Fora de escopo (herdado da spec, não re-litigado)

Exclusão/anonimização de conta · exportação de dados · troca de e-mail · item **Team** · item **Limits**
(placeholder **removido**) · lista de sessões/dispositivos ativos (só a ação global "sair de todos") ·
preferências de notificação por canal.

**Billing**: o lugar é reservado — o item da sidebar aponta para a aba `/account?tab=billing`, que renderiza
um estado vazio ("em breve"), **não** um `#`. Isso satisfaz "nenhum item aponta para `#`" sem antecipar
`billing-subscription`.

## 4. Corte de MVP (a menor fatia vertical que entrega os 6 objetivos)

Uma página `/account` com **três abas** (`profile`, `security`, `preferences`) + uma quarta inerte
(`billing`). Quatro rotas novas na API sob `requireCommonPanelApi`. Nenhuma coleção nova, nenhum guard
novo, nenhum componente de design system novo.

| Entra | Não entra (e por quê) |
|---|---|
| `GET/PUT /account` | rota genérica `PATCH /users/me` — abstração antes do 2.º caso de uso |
| `POST /account/password` | fluxo de reautenticação com MFA — não há MFA no repo |
| `POST /account/sessions/revoke` | listar sessões — 1/10 na nota de mercado |
| Avatar reusando `POST /files` | qualquer código novo de storage — a cadeia já existe |
| Preferências `theme` + `locale` no doc do usuário | coleção `preferences` separada — leitura extra por render |

## 5. Apps impactados e modo de produto

| Camada | Impacto |
|---|---|
| `packages/sdk` | novo `AccountActions` (`apiClient.account`) + campos aditivos em `UserDTO` |
| `apps/api` | 4 rotas novas em `app/(routes)/account/` + schema + lib de avatar |
| `apps/app` | página `/account` com abas, hooks, `ProfileDropdown`, `routes.tsx`, `paths.ts`, sign-in |
| `apps/web` | **N/A** |
| `packages/design-system` | **N/A** — os 8 `HookForm*` cobrem o formulário inteiro (`components/form/hookform/index.ts:2-9`) |
| `packages/internationalization` | namespace `account` nos 3 idiomas + 6 `apiErrors` novos |
| Infra/env | **nenhuma variável nova** (ver §Pré-requisitos manuais) |

- **Área do painel**: comum (`(common)`), nunca admin.
- **Modo de produto**: agnóstico — não depende de `subscription` nem de plano. A aba `billing` é inerte.
- **Impersonação**: `requireCommonPanelApi` já chama `assertReadOnlyWhileImpersonating`
  (`apps/api/(shared)/lib/impersonation-read-only.ts:19-31`), que bloqueia todo método ≠ GET/HEAD/OPTIONS
  com `AUTH_REQUEST_IMPERSONATION_READ_ONLY` (403). Logo **as 3 rotas de escrita já nascem bloqueadas sob
  impersonação sem uma linha de código**. A UI deve desabilitar os `Footer` com `disabled={isImpersonating}`,
  como faz `entities/(pages)/create/page.tsx`.

## 6. Dados (Firestore) — coleção `user`

⚠️ **Dois achados medidos que governam todo o desenho dos dados:**

**(a) `mergeAuthAndFirestore` faz o Firebase Auth VENCER.**
`apps/api/(shared)/mappers/user.mapper.ts:59` retorna `{ ...serializeFirestoreData(firestore), ...serializeUserRecord(auth) }`.
Qualquer campo do Firestore que colida com uma chave serializada do Auth — `uid`, `email`,
`emailVerified`, `displayName`, `photoURL`, `phoneNumber`, `disabled`, `metadata`, `providerData`,
`customClaims`, `tokensValidAfterTime` — **fica invisível**. Consequência direta: o telefone **não** pode se
chamar `phoneNumber` no Firestore, e o avatar **não** pode se chamar `photoURL`.

**(b) `BaseRepository.update` escreve `{...currentData, ...data}` sem passar pelo mapper**
(`apps/api/(shared)/repositories/base.repository.ts:104-114`). `userRepository` **não passa mapper**
(`user.repository.ts`, `super(db, "user")`), então `findById` devolve o doc cru — o round-trip é seguro.
O perigo é outro: **jamais passar para `userRepository.update` um objeto vindo de
`getMergedUserByFirestoreDocId`/`mergeWithAuthUser`**, senão `uid`/`email`/`photoURL` do Auth são
persistidos no documento e passam a shadowar o Auth para sempre. O handler **constrói o patch do zero**:
`{ id, phone?, avatar?, preferences? }` e nada mais.

### Campos novos no documento `user`

| Campo | Tipo | Default | `null`? | Justificativa |
|---|---|---|---|---|
| `phone` | `string` | ausente | sim | Nome deliberadamente ≠ `phoneNumber` (achado **a**). Evita também a unicidade/E.164 que o Firebase Auth impõe a `phoneNumber` como *identificador de login*. |
| `avatar` | `string` | ausente | sim | Guarda a **referência** (caminho no bucket `uploads/<ownerId>/<uuid>.<ext>` ou URL http(s)), nunca a URL assinada. Espelha `entity.photo`. |
| `preferences` | `map` | ausente | sim | `{ theme, locale }`. Map aninhado: `update` faz merge **raso**, então o handler monta o objeto completo (atual + patch) antes de gravar. |

- **Ownership**: o documento **é** o do usuário; a chave é `ctx.subjectProfile.id`, derivado do token pelo
  guard (`apps/api/app/(guards)/common-panel.ts:12-17,70-79`). Nunca de `body.id`, de `params` ou de header.
- **Soft delete**: fora do corte — nenhuma rota de exclusão aqui.
- **Consultas**: nenhuma nova. Todo acesso é `findById`/`findByReferenceId` por chave — o limite conhecido do
  `BaseRepository` (sem paginação, sem `orderBy`, filtro em memória) **não é tocado**.

### `displayName` fica no Firebase Auth

`displayName` já existe em `UserWithAuthDTO` (`packages/sdk/src/types/user/user.ts:34`) e é gravado via
`getAuthInstance().updateUser(uid, { displayName })` — mesmo caminho de `users/[id]/route.ts:67`.
Não duplicar no Firestore (seria shadowado de qualquer forma, achado **a**).

## 7. Avatar — como a foto se comporta (decisão explícita)

O avatar **consome** a cadeia de `file-upload-storage`, sem inaugurar nada:
`POST /files` (`apps/api/app/(routes)/files/route.ts:13`, já sob `requireCommonPanelApi`) →
`apiClient.file.upload` → `useFileUpload()` (`apps/app/shared/hooks/useFileUpload.ts`) →
`HookFormImageUpload`.

Reusa-se **integralmente** a lógica de `apps/api/(shared)/lib/entity-photo.ts`, generalizada:

- **O que é gravado**: a referência (`avatar`), nunca a URL assinada — `signReadUrl` dura 15 min
  (`apps/api/(shared)/lib/storage.ts`, `SIGNED_URL_TTL_MINUTES = 15`). Gravar a URL assinada seria um
  avatar que quebra sozinho depois do almoço.
- **O que é lido**: `avatarUrl`, **derivado no handler** e nunca escrito de volta — exatamente a razão pela
  qual `withPhotoUrl` existe (`entity-photo.ts:37-40`, e o achado **b** acima).
- **Ownership do objeto**: `isUsablePhotoReference(value, ctx.subjectProfile.id)` já resolve —
  aceita URL http(s) absoluta ou objeto **sob o próprio prefixo** do dono (`isOwnedBy`, `storage.ts`).
  Apontar o perfil para o objeto de outra pessoa é recusado com `ACCOUNT_AVATAR_INVALID` (400).
- **Troca/remoção do objeto anterior** (🟡 não há contagem de referência): o handler de `PUT /account`
  replica `entities/[id]/route.ts:81-86` — se `avatar` mudou, o objeto anterior é apagado com
  `deleteObjectQuietly(previous)` (`storage.ts`), **só quando** `isOwnStorageObject(previous, ownerId)`
  (nunca apaga URL externa) e **depois** da gravação bem-sucedida. Remover a foto (`avatar: null`) segue a
  mesma regra. A falha ao apagar nunca derruba o salvamento (a função já engole e loga).
- **`photoURL` do Firebase Auth NÃO é escrito.** É durável e público por natureza; o objeto do bucket é
  privado (`cacheControl: "private, no-store"`, `storage.rules`). Manter os dois desincronizados de
  propósito e ler sempre `avatarUrl`.

**Consequência de front que isso força**: `ProfileDropdown.tsx:36,42` lê `user?.photoURL`/`displayName` do
**client SDK do Firebase** (`useAuth()`). Esses valores não mudam após um `updateUser` no servidor sem
refresh de token, e nunca conheceriam o `avatarUrl`. Para cumprir o objetivo 2 ("vê no cabeçalho sem
recarregar"), o `ProfileDropdown` passa a ler `useMyAccount()` (React Query), com fallback para
`useAuth()` enquanto a query não resolve. Invalidar `queryKeys.account.me()` no `onSuccess` do PUT atualiza
o cabeçalho imediatamente.

## 8. Preferências × primeira pintura (decisão explícita — não "resolve no cliente")

**Idioma.** O `x-locale` cookie já é a fonte de verdade de render, lida no servidor por `getDictionary()`
(`packages/internationalization/server.ts:18-35`) e mantida em sincronia com o segmento da URL pelo proxy
(`apps/app/proxy.ts:146-159`). Portanto:
- **Ao trocar** na aba de preferências: salva no perfil **e** repete o mecanismo que já existe em
  `LanguageSwitcher.tsx:50` — `setCookie("x-locale", locale)` + `router.push("/<locale>/account")`.
- **Em outro dispositivo**: o cookie é projetado a partir do perfil **no sucesso do sign-in**. A resposta de
  `POST /auth/sign-in` já devolve `getMergedUserByUid(...)` (`apps/api/app/(routes)/auth/sign-in/route.ts`),
  que inclui os campos do Firestore — logo **inclui `preferences`**, sem uma requisição extra. O handler de
  sucesso do sign-in grava `x-locale` e `x-theme` antes de navegar. Como o cookie é lido no servidor,
  o primeiro render já sai no idioma certo: **zero mismatch, zero pisca**.

**Tema.** Mesmo mecanismo, cookie `x-theme`:
- `apps/app/app/layout.tsx` lê `cookies().get("x-theme")` e emite `<html className={theme}>` +
  `suppressHydrationWarning`, e repassa `defaultTheme` ao `ThemeProvider`
  (`packages/design-system/providers/theme.tsx:4-17`). O script bloqueante do `next-themes` continua
  reconciliando com o `localStorage` antes da pintura — a classe do servidor só elimina o caso "dispositivo
  novo, `localStorage` vazio".
- **Ao trocar**: `setTheme(value)` (localStorage, imediato) + `setCookie("x-theme", value)` + PUT no perfil.

**Limitação conhecida e aceita**: uma sessão longa que nunca re-autentica não vê a preferência mudada em
outro dispositivo até o próximo sign-in. Registrada em "Perguntas em aberto" (Q4).

> ⛔ Não se escreve cookie durante o render de um RSC (Next só permite em route handler / server action /
> middleware). É por isso que a projeção acontece **no sign-in**, e não no `(common)/layout.tsx`.

## 9. Troca de senha (decisão explícita)

O `firebase-admin` **não verifica senha** — confirmado. O repo já contorna isso pelo Identity Toolkit REST:
`identitySignInWithPassword(email, password)` (`apps/api/(shared)/lib/firebase-identity-toolkit.ts:74-89`),
usado hoje em `auth/sign-in/route.ts`.

Fluxo de `POST /account/password`:
1. Guard `requireCommonPanelApi` (⇒ bloqueado sob impersonação, de graça).
2. `identitySignInWithPassword(ctx.user.email, currentPassword)` → falhou ⇒ `ACCOUNT_CURRENT_PASSWORD_INVALID`
   (400), ou `USERS_AUTH_RATE_LIMITED` (429) via o `mapIdentityToolkitMessageToCode`/`statusForAuthErrorCode`
   já existentes (`toolkit-error-codes.ts`).
3. `getAuthInstance().updateUser(ctx.user.uid, { password })` — senha nova validada pelo **mesmo** schema já
   testado de `(unauthenticated)/reset-password/validations/resetPasswordSchema.ts` (front) e
   `auth.schema.ts` (servidor, `min(6).max(1024)`).
4. `revokeUserSessions(uid)` (`packages/auth/server.ts:226`), como faz `auth/password/reset/route.ts:49`.
5. `200 { data: { confirmed: true } }`.

**A sessão atual também cai** — `getUserFromSessionCookie` verifica com `checkRevoked: true`
(`packages/auth/server.ts:206-210`) e o Firebase não revoga seletivamente. Decisão: **não re-emitir sessão**
(re-emitir exigiria a `apps/api` escrever cookie no domínio da `apps/app` — raio de impacto grande, mexe no
modelo de SSO). O front, no `onSuccess`, mostra o toast "Senha alterada. Entre novamente." e dispara
`signOut` → `/sign-in`. É honesto e satisfaz o sinal de pronto da spec.

## 10. Autorização e segurança

| Vetor | Mitigação |
|---|---|
| **IDOR** (risco central) | Nenhuma rota recebe id de usuário. A chave é `ctx.subjectProfile.id` / `ctx.user.uid`, derivados do token pelo guard. O schema Zod **rejeita** `id`/`uid`/`type`/`email` no corpo (`.strict()`). |
| Escalonamento de privilégio | `type` (`admin`/`common`) **não** está no schema de `PUT /account` — continua exclusivo de `PUT /users/[id]` sob `requireAdminApi`. |
| Impersonação | Já bloqueada para escrita pelo guard; UI desabilita os botões. |
| Upload | `parseUploadedImage` valida `content-length`, tamanho real (4 MiB) e **magic bytes** no servidor (`file.schema.ts:104`). Nada novo a fazer. |
| Apontar o avatar para objeto alheio | `isUsablePhotoReference(value, ownerId)` — fail-closed. |
| Sequestro de sessão trocando a senha | Exige a senha atual (recomendação da spec, adotada). |
| Vazamento de URL assinada | TTL de 15 min, objeto privado, `no-store`. |

## 11. Testes e validação visual

**Vitest a criar** (`/write-tests`):
- `apps/api/__tests__/account.schema.test.ts` — rejeita `id`/`type` no corpo; aceita patch parcial; recusa
  corpo vazio (`ACCOUNT_NOTHING_TO_UPDATE`); valida `theme`/`locale` contra o enum.
- `apps/api/__tests__/account-avatar.test.ts` — `isUsablePhotoReference` com objeto de outro dono ⇒ `false`.
- `apps/app` — teste do `useMyAccount`/mutation com SDK mockado; teste do `AccountProfileForm` (RHF).
- `packages/internationalization/__tests__/parity.test.ts` — já existe e **falha sozinho** se faltar chave
  em algum idioma. É o gate de i18n.

**Validação visual obrigatória** (`agent-browser`, regra de ouro 11): as 4 abas, em **claro e escuro**, em
**desktop e mobile**; sidebar sem nenhum `#`; upload de avatar no **modo degradado** (ver §Pré-requisitos).

---

# Etapa 2 — Blueprint técnico

Ordem obrigatória do slice: **`packages/sdk` → `apps/api` → `apps/app` → `packages/internationalization`**.

## 12. Contrato `@repo/sdk`

### 12.1 Tipos — `packages/sdk/src/types/user/user.ts` (mudança **aditiva e mínima**)

> ⚠️ Arquivo em contenção com `billing-subscription`. **Só acrescentar campos opcionais**; não reordenar,
> não renomear, não tocar em `AdminCreateUserRequest`/`AdminUpdateUserRequest`.

```ts
export type UserPreferences = {
    theme: "light" | "dark" | "system";
    locale: "pt-br" | "en" | "es";
};

export type UserDTO = {
    id: string;
    type: UserType;
    reference_id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    // --- aditivo (account-settings) ---
    phone?: string | null;
    avatar?: string | null;          // referência: caminho no bucket ou URL http(s). NUNCA a URL assinada.
    preferences?: UserPreferences | null;
};
```

`UserWithAuthDTO` (`:30-52`) fica **intocado**.

### 12.2 Tipos novos — `packages/sdk/src/types/account/account.ts` (arquivo novo, zero contenção)

```ts
import type { UserWithAuthDTO, UserPreferences } from "../user/user";

export type AccountDTO = UserWithAuthDTO & {
    phone: string | null;
    avatar: string | null;
    avatarUrl: string | null;        // derivado na leitura, assinado, efêmero
    preferences: UserPreferences;    // sempre preenchido na saída (defaults aplicados)
};

export type UpdateAccountRequest = {
    displayName?: string | null;
    phone?: string | null;
    avatar?: string | null;
    preferences?: Partial<UserPreferences>;
};

export type ChangePasswordRequest = {
    currentPassword: string;
    password: string;
};
```

Barril: `packages/sdk/src/types/account/index.ts` (`export * from "./account";`) + registrar em
`packages/sdk/src/types/index.ts` no mesmo padrão do barril de `user`.

### 12.3 Action — `packages/sdk/src/actions/account/action.ts` (arquivo novo)

Espelha `EntityActions` (`actions/entity/action.ts`): classe, `constructor(private readonly client: Client)`,
`this.client.request<Response<T>>({...})` e desembrulho de `.data.data`.

```ts
export default class AccountActions {
    constructor(private readonly client: Client) {}

    async me(): Promise<AccountDTO> { /* GET  /account            */ }
    async update(body: UpdateAccountRequest): Promise<AccountDTO> { /* PUT /account */ }
    async changePassword(body: ChangePasswordRequest): Promise<{ confirmed: true }> { /* POST /account/password */ }
    async revokeSessions(): Promise<{ confirmed: true }> { /* POST /account/sessions/revoke */ }
}
```

Registro em `packages/sdk/src/client/index.ts` (mesmo padrão das linhas `:12-16` e `:20-24`):
`account!: AccountActions;` + `this.account = new AccountActions(this);`.
Nenhum app precisa mudar — `apps/app/shared/lib/client.ts` e `lib/server/apiServerClient.ts` já instanciam
`Client` e ganham `apiClient.account` de graça.

**Quem quebra**: ninguém. Tudo aditivo; os campos novos de `UserDTO` são opcionais.

## 13. API — `apps/api`

### 13.1 Rotas

| Método | Rota | Guard | Ownership | Escreve em |
|---|---|---|---|---|
| `GET`  | `/account` | `requireCommonPanelApi` | `ctx.subjectProfile.id` | — |
| `PUT`  | `/account` | `requireCommonPanelApi` | `ctx.subjectProfile.id` / `ctx.user.uid` | Firestore + Auth |
| `POST` | `/account/password` | `requireCommonPanelApi` | `ctx.user.uid` / `ctx.user.email` | Auth |
| `POST` | `/account/sessions/revoke` | `requireCommonPanelApi` | `ctx.user.uid` | Auth |

> **Por que `/account` e não `/users/me`**: `users/` é namespace 100% `requireAdminApi`
> (`users/route.ts:21,34`, `users/[id]/route.ts:15,33,75`). Misturar um guard comum ali é um convite a
> alguém colar o guard errado no próximo handler. Namespace separado + nome de action igual (`apiClient.account`).

### 13.2 Arquivos novos em `apps/api`

```
apps/api/app/(routes)/account/route.ts                    ← GET + PUT
apps/api/app/(routes)/account/password/route.ts           ← POST
apps/api/app/(routes)/account/sessions/revoke/route.ts    ← POST
apps/api/(shared)/validation/account.schema.ts            ← Zod + parse helpers
apps/api/(shared)/lib/account-avatar.ts                   ← withAvatarUrl (espelha entity-photo.ts)
```

### 13.3 Esqueleto dos handlers

```ts
// account/route.ts
export const GET = requireCommonPanelApi(async (_req, ctx) => {
    const merged = await getMergedUserByFirestoreDocId(ctx.subjectProfile.id);
    if (!merged) return Response.json({ error: { code: "USERS_NOT_FOUND" } }, { status: HTTP_STATUS.NOT_FOUND });
    return Response.json({ data: await withAvatarUrl(merged) });   // aplica defaults de preferences
});

export const PUT = requireCommonPanelApi(async (req, ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = parseUpdateAccount(parsedBody.value);   // VALIDATION_FAILED | ACCOUNT_NOTHING_TO_UPDATE
    if (!parsed.ok) return parsed.response;

    const input = parsed.value;
    const ownerId = ctx.subjectProfile.id;
    const previousAvatar = ctx.subjectProfile.avatar ?? null;

    const avatar = input.avatar !== undefined ? normalizePhotoReference(input.avatar) : undefined;
    if (avatar && !isUsablePhotoReference(avatar, ownerId)) {
        return Response.json({ error: { code: "ACCOUNT_AVATAR_INVALID" } }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    // ⚠️ patch construído do zero. NUNCA espalhar o objeto merged aqui (o Auth venceria e seria persistido).
    const patch = omitUndefined({
        phone: input.phone !== undefined ? (input.phone?.trim() || null) : undefined,
        avatar,
        preferences: input.preferences
            ? { ...resolvePreferences(ctx.subjectProfile.preferences), ...input.preferences }  // merge raso manual
            : undefined,
    });

    if (Object.keys(patch).length > 0) {
        await userRepository.update({ id: ownerId, ...patch });
    }

    if (input.displayName !== undefined) {
        await getAuthInstance().updateUser(ctx.subjectProfile.reference_id, {
            displayName: input.displayName?.trim() || null,
        });
    }

    if (avatar !== undefined && previousAvatar && previousAvatar !== avatar
        && isOwnStorageObject(previousAvatar, ownerId)) {
        await deleteObjectQuietly(previousAvatar);      // só depois do save; nunca derruba a resposta
    }

    const merged = await getMergedUserByFirestoreDocId(ownerId);
    return Response.json({ data: await withAvatarUrl(merged) });
});
```

```ts
// account/password/route.ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = parseChangePassword(parsedBody.value);
    if (!parsed.ok) return parsed.response;

    const email = ctx.user.email;
    if (!email) {
        return Response.json({ error: { code: "ACCOUNT_PASSWORD_UNSUPPORTED" } }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    try {
        await identitySignInWithPassword(email, parsed.value.currentPassword);
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            const code = mapIdentityToolkitMessageToCode(error.message, "ACCOUNT_CURRENT_PASSWORD_INVALID");
            return Response.json({ error: { code } }, { status: statusForAuthErrorCode(code) });
        }
        throw error;
    }

    await getAuthInstance().updateUser(ctx.user.uid, { password: parsed.value.password });
    await revokeUserSessions(ctx.user.uid);      // engole erro internamente

    return Response.json({ data: { confirmed: true } });
});
```

```ts
// account/sessions/revoke/route.ts
export const POST = requireCommonPanelApi(async (_req, ctx) => {
    await revokeUserSessions(ctx.user.uid);
    return Response.json({ data: { confirmed: true } });
});
```

### 13.4 `account.schema.ts` — Zod na borda

```ts
const themeSchema  = z.enum(["light", "dark", "system"]);
const localeSchema = z.enum(["pt-br", "en", "es"]);

export const updateAccountSchema = z
    .object({
        displayName: z.union([z.string().trim().max(120), z.null()]).optional(),
        phone:       z.union([z.string().trim().max(32), z.null()]).optional(),
        avatar:      z.union([z.string().trim().max(2048), z.null()]).optional(),
        preferences: z.object({ theme: themeSchema.optional(), locale: localeSchema.optional() })
                      .strict().partial().optional(),
    })
    .strict()                                   // ⛔ id/uid/type/email no corpo ⇒ VALIDATION_FAILED
    .refine((v) => Object.keys(v).length > 0);

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(6).max(1024),
    password:        z.string().min(6).max(1024),
}).strict();
```

Helpers `parseUpdateAccount(body)` / `parseChangePassword(body)` no formato
`{ ok: true; value } | { ok: false; response }`, idêntico a `parseCreateEntity`
(`entity.schema.ts:72`). Corpo válido porém vazio ⇒ `ACCOUNT_NOTHING_TO_UPDATE` (400), espelhando
`USERS_NOTHING_TO_UPDATE` de `user-admin.schema.ts:47-51`.

`.strict()` é o que transforma "esqueci de tratar `id`" em 400 em vez de IDOR silencioso.

### 13.5 `account-avatar.ts`

Cópia dirigida de `entity-photo.ts`, reusando `isUsablePhotoReference`, `isOwnStorageObject` e
`normalizePhotoReference` **exportados de lá** (não reimplementar — mover para um módulo neutro só se o
`/develop` julgar que `entity-photo.ts` vira dependência estranha; caso contrário, importar direto e
acrescentar só `withAvatarUrl` + `resolvePreferences`).

```ts
const DEFAULT_PREFERENCES = { theme: "system", locale: "pt-br" } as const;
export const resolvePreferences = (raw: unknown): UserPreferences => ({ ...DEFAULT_PREFERENCES, ...(raw ?? {}) });

export async function withAvatarUrl(merged: Record<string, unknown>): Promise<AccountDTO> {
    // mesma decisão de withPhotoUrl (entity-photo.ts:37-64):
    //   sem avatar            -> avatarUrl: null
    //   URL http(s) absoluta  -> avatarUrl = avatar
    //   storage não config.   -> avatarUrl: null   (NUNCA lança)
    //   signReadUrl falhou    -> avatarUrl: null + console.warn  (NUNCA lança)
    // + preferences: resolvePreferences(merged.preferences)
}
```

### 13.6 Tabela `error.code` → status (todos NOVOS)

| `error.code` | Status | Quando |
|---|---|---|
| `ACCOUNT_NOTHING_TO_UPDATE` | 400 | `PUT /account` com corpo válido e vazio |
| `ACCOUNT_AVATAR_INVALID` | 400 | referência de avatar fora do prefixo do dono / malformada |
| `ACCOUNT_CURRENT_PASSWORD_INVALID` | 400 | senha atual não confere |
| `ACCOUNT_PASSWORD_UNSUPPORTED` | 400 | conta sem e-mail/senha (provedor federado) |
| `ACCOUNT_UPDATE_FAILED` | 500 | falha ao gravar no Auth/Firestore após a validação |
| `ACCOUNT_SESSIONS_REVOKE_FAILED` | 500 | reservado; `revokeUserSessions` engole erro hoje |

**Reusados, nada a criar**: `VALIDATION_FAILED` (400), `USERS_NOT_FOUND` (404), `USERS_AUTH_WEAK_PASSWORD`
(400), `USERS_AUTH_RATE_LIMITED` (429), `COMMON_PANEL_FORBIDDEN` (403),
`AUTH_REQUEST_IMPERSONATION_READ_ONLY` (403), `AUTH_INVALID_TOKEN` (401), `STORAGE_NOT_CONFIGURED` (503),
`UPLOAD_FILE_TOO_LARGE` (413), `UPLOAD_FILE_TYPE_NOT_ALLOWED` (415), `UPLOAD_FAILED` (503).

### 13.7 Forma do documento `user` depois da entrega

```json
{
  "type": "common",
  "reference_id": "<firebase-uid>",
  "phone": "+55 51 99999-0000",
  "avatar": "uploads/<firestoreDocId>/<uuid>.webp",
  "preferences": { "theme": "dark", "locale": "es" },
  "createdAt": "<Timestamp>", "updatedAt": "<Timestamp>", "deletedAt": null
}
```

### 13.8 Payload / resposta de exemplo

```http
PUT /account
{ "displayName": "Ana Souza", "phone": "+55 51 99999-0000",
  "avatar": "uploads/abc123/9f2c….webp", "preferences": { "theme": "dark" } }

200 { "data": { "id": "abc123", "uid": "…", "email": "ana@x.com", "displayName": "Ana Souza",
                "phone": "+55 51 99999-0000", "avatar": "uploads/abc123/9f2c….webp",
                "avatarUrl": "https://storage.googleapis.com/…&X-Goog-Expires=900",
                "preferences": { "theme": "dark", "locale": "pt-br" } } }

400 { "error": { "code": "ACCOUNT_AVATAR_INVALID" } }
403 { "error": { "code": "AUTH_REQUEST_IMPERSONATION_READ_ONLY" } }
```

## 14. Front — `apps/app`

### 14.1 Árvore de arquivos

```
app/[locale]/(authenticated)/(common)/(pages)/account/
  (components)/AccountProfileForm.tsx        ← nome, telefone, avatar
  (components)/AccountSecurityForm.tsx       ← senha atual + nova + "sair de todos"
  (components)/AccountPreferencesForm.tsx    ← tema + idioma
  (components)/AccountBillingPlaceholder.tsx ← estado vazio "em breve"
  (components)/AccountTabs.tsx               ← tabs controladas por ?tab=
  (hooks)/useMyAccount.tsx                   ← useMyAccount + fetchMyAccount
  (hooks)/useAccountMutations.tsx            ← update / changePassword / revokeSessions
  (validations)/accountFormSchema.ts         ← buildAccountProfileSchema + buildPasswordSchema
  (pages)/(home)/page.tsx                    ← RSC, prefetch + HydrationBoundary
  (pages)/(home)/AccountClient.tsx
  (pages)/(home)/loading.tsx
```

### 14.2 Prefetch RSC + `queryKeys`

`page.tsx` copia `entities/(pages)/(home)/page.tsx:11-31` linha a linha:

```tsx
const queryClient = new QueryClient();
if (!(await isImpersonating())) {
    const client = await getServerApiClient("common");
    await queryClient.prefetchQuery({
        queryKey: queryKeys.account.me(),
        queryFn: () => client.account.me(),
    });
}
return <HydrationBoundary state={dehydrate(queryClient)}><AccountClient /></HydrationBoundary>;
```

`apps/app/shared/lib/queryKeys.ts` ganha (aditivo, ao lado de `entities`/`users`):

```ts
account: { all: ["account"] as const, me: () => [...queryKeys.account.all, "me"] as const },
```

### 14.3 Hooks de dados (padrão obrigatório do repo)

- `useMyAccount.tsx`: `export function fetchMyAccount(): Promise<AccountDTO>` + `export const useMyAccount = () =>`
  usando `useAuthorizedQuery({ queryKey: queryKeys.account.me(), queryFn: fetchMyAccount })`. Mesmo arquivo,
  como manda a regra de ouro 8.
- `useAccountMutations.tsx`: espelha `useEntityCrud.tsx:27-167` — `useAlert()`,
  `formatClientError = (e) => handleClientError(new FormattedError(e, locale))`,
  `onSuccess` invalida `queryKeys.account.me()`, `onError: (e) => errorAlert(formatClientError(e))`.
  Nenhum `try/catch` com string crua.

### 14.4 Campos × componente

| Aba | Campo | Componente |
|---|---|---|
| profile | Nome de exibição | `HookFormInput` |
| profile | Telefone | `HookFormInput` |
| profile | Foto | `HookFormImageUpload` (com `uploadPhoto` = `useFileUpload().uploadFile`) ou nada, se storage desligado |
| profile | E-mail (somente leitura) | `HookFormInput` `disabled` + hint "trocar e-mail em breve" |
| security | Senha atual / Nova / Confirmar | `HookFormInputPassword` ×3 |
| security | Sair de todos os dispositivos | `Button` `variant="outline"` + `AlertDialog` de confirmação |
| preferences | Tema | `HookFormRadioGroup` (claro / escuro / sistema) |
| preferences | Idioma | `HookFormSelect` (pt-br / en / es) |

Envelope de cada aba: `Container` + `FormContainer` + `Footer` (`apps/app/shared/components/ui/`), com
`disabled={isImpersonating || isUploading}` e `isLoading={mutation.isPending}`, exatamente como
`entities/(pages)/create/page.tsx:53-98`. Prop de erro é `error`, nunca `errorMessage`.
**Não existe `HookFormCheckbox`** (`hookform/index.ts` tem 8 exports, sem checkbox) — o desenho acima não
precisa de um; não criar.

### 14.5 Estados

| Estado | Tratamento |
|---|---|
| Carregando | `loading.tsx` + `isLoading` do `useMyAccount` |
| Erro de leitura | `<Container loadError={accountMessages.loadError} />` (padrão de `EditEntityClient.tsx`) |
| Sob impersonação | sem prefetch; formulários renderizam com `Footer disabled` + `ImpersonationReadOnlyNotice` |
| Storage desligado | aba de perfil some o `HookFormImageUpload`, mantém o resto (ver §16) |
| Upload falhou (503) | toast traduzido via `apiErrors`, formulário preservado |
| Senha alterada | toast + `signOut` + redirect para `/sign-in` |

### 14.6 Navegação — `routes.tsx` e `paths.ts`

> ⚠️ `routes.tsx` está em contenção com `billing-subscription` **e** `onboarding-flow`. Mudança mínima.

`paths.ts` (`COMMON_ROUTES`, aditivo após `entities`):

```ts
account: {
    root:        { label: dictionary…account.title,       url: buildPath("/account") },
    profile:     { label: …account.tabs.profile,          url: buildPath("/account?tab=profile") },
    security:    { label: …account.tabs.security,         url: buildPath("/account?tab=security") },
    preferences: { label: …account.tabs.preferences,      url: buildPath("/account?tab=preferences") },
    billing:     { label: …account.tabs.billing,          url: buildPath("/account?tab=billing") },
},
```

`routes.tsx`:
- Grupo **Settings** (`:60-82`): `General` → `routes.account.profile`, `Team` → **removido**,
  `Billing` → `routes.account.billing`, `Limits` → **removido** (recomendação da spec, adotada).
  Acrescentar `Security` e `Preferences`. **Todos os títulos vêm do dictionary** — hoje são literais em
  inglês no JSX, o que viola a regra de ouro 2.
- Grupo **Documentation** (`:37-59`): **removido por inteiro** (4 placeholders `#`, recomendação da spec).

`ProfileDropdown.tsx`: acrescenta `DropdownMenuItem` "Minha conta" (ícone `UserIcon`) apontando para
`/account`; troca `user?.photoURL`/`displayName` por `useMyAccount()` com fallback para `useAuth()`;
e **troca o `<span> Sair </span>` literal da `:51` pela chave do dictionary** (dívida existente que esta
entrega quita).

### 14.7 Projeção de preferências no sign-in

No handler de sucesso do sign-in de `apps/app` (o que consome `POST /auth/sign-in` e já recebe `user`):

```ts
const prefs = user?.preferences;
if (prefs?.locale) setCookie("x-locale", prefs.locale, LOCALE_COOKIE_TTL_SECONDS);
if (prefs?.theme)  setCookie("x-theme",  prefs.theme,  LOCALE_COOKIE_TTL_SECONDS);
```

e o destino pós-login passa a usar o locale da preferência. `apps/app/app/layout.tsx` lê `x-theme` e
emite a classe no `<html>` (§8). `setCookie` já existe em `@repo/shared/utils` (usado em
`LanguageSwitcher.tsx:50`).

## 15. i18n — `packages/internationalization`

### 15.1 Namespace novo

Arquivo: `translations/apps/app/pages/common/account.ts`, exportando
`accountPageTranslations = { "pt-br": {…}, en: {…}, es: {…} }` — mesma forma de
`common/entities.ts`. Registro em `translations/apps/app/pages/common/index.ts` nas **3** entradas
(linhas ~9 / ~14 / ~19, ao lado de `entities`).

### 15.2 Árvore de chaves (idêntica nos 3 idiomas)

```
apps.app.pages.common.account
├─ title, subtitle
├─ tabs: { profile, security, preferences, billing }
├─ profile: { displayName, displayNamePlaceholder, phone, phonePlaceholder,
│             email, emailHint, avatar, avatarHint, save,
│             avatarUpload: { label, choose, replace, remove, uploading, hint, alt,
│                             errors: { tooLarge, typeNotAllowed, failed } },
│             validation: { displayNameRequired, displayNameMax, phoneInvalid } }
├─ security: { currentPassword, newPassword, confirmPassword, save,
│              signOutEverywhere, signOutEverywhereDescription, signOutEverywhereConfirm,
│              validation: { required, min, mismatch } }
├─ preferences: { theme, themeOptions: { light, dark, system },
│                 language, save }
├─ billing: { emptyTitle, emptyDescription }
└─ messages: { profileUpdated, passwordChanged, passwordChangedSignOut,
               preferencesUpdated, sessionsRevoked, loadError }
```

Além disso: `apps.app.shared.profileDropdown.{ myAccount, signOut }` (a `:51` literal) e os títulos do
grupo Settings da sidebar.

### 15.3 `apiErrors` — `translations/packages/shared/utils.ts`

Acrescentar as **6** chaves de §13.6 nos **3** blocos (`pt-br` ~`:7-63`, `en` ~`:66-125`, `es` ~`:126-192`).
`packages/internationalization/__tests__/parity.test.ts` reprova automaticamente se faltar uma. Usar a
skill `/i18n-sync`.

## 16. ⚠️ Modo degradado — item de primeira classe

**Medido hoje: o Cloud Storage está DESATIVADO em `next-boilerplate-576d0`** (`firebasestorage…/o` ⇒ 404).
O caminho feliz do avatar **não é verificável** nesta máquina. O `/test` **não deve reprovar** por isso —
deve verificar o **modo degradado**, que é requisito de produto aqui.

| Condição | Comportamento exigido |
|---|---|
| `FIREBASE_STORAGE_BUCKET` vazio | `POST /files` ⇒ **503 `STORAGE_NOT_CONFIGURED`** (`files/route.ts:15-18`). Nunca 500. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` vazio | `isStorageEnabled()` (`apps/app/shared/lib/storageEnabled.ts:3`) ⇒ `false`; a aba de perfil **não renderiza** o `HookFormImageUpload`. Nome, telefone e todas as outras abas continuam funcionando. |
| Bucket configurado, **serviço desligado** (o caso real) | `putObject` lança ⇒ `catch` ⇒ **503 `UPLOAD_FAILED`**, com toast traduzido. `withAvatarUrl` devolve `avatarUrl: null` e **nunca lança** (`entity-photo.ts:57-63`). Avatar cai no `AvatarFallback` (iniciais). |
| Avatar já gravado mas não assinável | `avatarUrl: null`, iniciais no cabeçalho, resto da conta intacto. |

Regras invioláveis: **app sobe sem a env**, `pnpm build` passa, `pnpm turbo run lint typecheck test` passa,
a UI degrada em vez de quebrar, e a API responde com `error.code` traduzido — **nunca 500, nunca stack trace**.

> 🔴 **Env**: esta entrega **não introduz variável nova**. Se o `/develop` concluir que precisa de uma,
> ela **tem** de ser redeclarada em `apps/api/env.ts` (o `skipValidation` em dev descarta tudo que vem por
> `extends` — foi o que matou o `NEXT_PUBLIC_APP_URL`), e lida com `|| undefined`, porque `.env.example`
> publica `VAR=""` como forma de desligar a feature e `z.string().min(1)` derrubaria a app.

## 17. Pré-requisitos manuais de infra (o `/develop` NÃO consegue satisfazer)

| # | Pré-requisito | Quem faz | Impacto se não for feito |
|---|---|---|---|
| 1 | **Ativar o Cloud Storage** em `next-boilerplate-576d0` (console do Firebase → Storage → "Começar") | humano, no console | Upload de avatar responde 503 `UPLOAD_FAILED`. **Todo o resto da feature funciona.** O `/test` valida o modo degradado, não reprova. |
| 2 | Publicar `storage.rules` (`firebase deploy --only storage`) depois do item 1 | humano | Objetos sem regra; leitura só pela URL assinada do servidor continua funcionando. |
| 3 | Preencher `FIREBASE_STORAGE_BUCKET` e `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` nos `.env` locais e na Vercel | humano | `isStorageEnabled()` ⇒ `false`; campo de avatar não aparece (degradação prevista). |
| 4 | Conferir que a **Identity Toolkit API** aceita `accounts:signInWithPassword` com a chave web em uso | humano | Troca de senha falha na verificação da senha atual. Já é usado por `auth/sign-in`, então deve estar OK. |
| 5 | Registrar os itens 1–3 em `docs/PRE-PRODUCTION.md` | `/cycle` | Pendência some do radar na hora do deploy. |

## 18. Nota de contenção (mudanças mínimas e aditivas)

| Arquivo | Colide com | Regra |
|---|---|---|
| `packages/sdk/src/types/user/user.ts` | `billing-subscription` | **Só** acrescentar 3 campos opcionais + `UserPreferences`. Não tocar em `UserWithAuthDTO`, `AdminCreateUserRequest`, `AdminUpdateUserRequest`. |
| `apps/api/(shared)/repositories/user.repository.ts` | `billing-subscription` | **Nenhuma mudança prevista.** `update`/`findById` herdados bastam. Se o `/develop` precisar de um método, que seja um `findByX` novo — não alterar os existentes. |
| `apps/app/…/(common)/routes.tsx` | `billing-subscription`, `onboarding-flow` | Editar só o grupo Settings e remover o grupo Documentation. Não refatorar o tipo `NavItem` nem `useCommonNavRoutes`. |
| `apps/app/…/(common)/paths.ts` | `billing-subscription` | Só acrescentar o bloco `account` no fim do objeto. |

## 19. Ordem de implementação e plano de commits

Branch (criada pelo `revisor-codigo`, **não** por esta etapa): `app/feat/account-settings`.

| # | Commit | Escopo |
|---|---|---|
| 1 | `feat(sdk): account preferences and avatar fields on the user contract` | `types/user/user.ts` (aditivo) + `types/account/*` + barris |
| 2 | `feat(sdk): self-service account actions` | `actions/account/action.ts` + registro em `client/index.ts` |
| 3 | `feat(api): validate self-service account payloads` | `validation/account.schema.ts` + testes de schema |
| 4 | `feat(api): read and update the authenticated account` | `(routes)/account/route.ts` + `lib/account-avatar.ts` |
| 5 | `feat(api): change the authenticated password and revoke sessions` | `(routes)/account/password/` + `(routes)/account/sessions/revoke/` |
| 6 | `feat(app): account data hooks and query keys` | `(hooks)/*` + `shared/lib/queryKeys.ts` |
| 7 | `feat(app): account page with profile, security and preferences tabs` | `(pages)/account/**`, `(components)/*`, `(validations)/*` |
| 8 | `feat(app): link the account area from the sidebar and the avatar menu` | `routes.tsx`, `paths.ts`, `ProfileDropdown.tsx` |
| 9 | `feat(app): carry theme and language preferences across devices` | cookie `x-theme`, `app/layout.tsx`, projeção no sign-in |
| 10 | `feat(internationalization): account area copy and new api error codes` | `pages/common/account.ts` + `index.ts` + `apiErrors` ×3 |
| 11 | `test(app): cover the account forms and hooks` | Vitest do front |
| 12 | `docs(features): account-settings` | `docs/features/account-settings/**` (último, separado) |

Um commit por app/pacote, pulverizado por funcionalidade, na ordem de dependência
**sdk → api → app → internationalization**. ⛔ Nada disso é executado por esta etapa.

## 20. Critérios de validação visual (`agent-browser`, obrigatório)

1. `/pt-br/account` — 4 abas navegáveis por `?tab=`, tema **claro** e **escuro**, **desktop** e **mobile**.
2. Editar nome → salvar → **cabeçalho e menu do avatar atualizam sem reload**.
3. Sidebar: nenhum item com `href="#"` (inspecionar o DOM, não só olhar).
4. Trocar idioma para `es` → app recarrega em espanhol → `x-locale` gravado.
5. Trocar tema → persiste após reload **e** após novo sign-in.
6. Aba de segurança com senha atual errada → toast traduzido, sem stack trace.
7. Storage desligado → campo de avatar ausente ou 503 traduzido; nenhuma outra aba afetada.
8. Sob impersonação → todos os `Footer` desabilitados + aviso de somente leitura.

## 21. Perguntas em aberto

> Nenhuma bloqueia o `/develop`. Todas já foram **decididas** pela precedência do `/cycle`.

| # | Pergunta | Opções | **Adotada** | Por quê |
|---|---|---|---|---|
| Q1 | Preferências no doc do usuário ou em coleção separada? | doc / coleção | **no documento** | Recomendação explícita da spec; evita leitura extra por render. |
| Q2 | Troca de senha exige a senha atual? | sim / não | **sim** | Recomendação da spec; sem isso, sessão roubada assume a conta em um clique. |
| Q3 | Manter "Documentation" e "Limits"? | manter / remover | **remover os dois** | Recomendação da spec; placeholder morto é a dívida que esta entrega existe para quitar. |
| Q4 | Sessão longa não vê preferência mudada em outro dispositivo até o próximo sign-in. Aceitar? | aceitar / sincronizar por render | **aceitar** | Sincronizar exigiria escrever cookie fora de route handler (Next não permite em RSC) ou uma leitura de perfil por request. Menor raio de impacto; limitação documentada. |
| Q5 | Namespace da API: `/account` ou `/users/me`? | `/account` / `/users/me` | **`/account`** | `users/` é 100% `requireAdminApi`; misturar guards no mesmo namespace é armadilha para o próximo handler. |
| Q6 | Telefone no Firebase Auth (`phoneNumber`) ou no Firestore (`phone`)? | Auth / Firestore | **Firestore, campo `phone`** | `mergeAuthAndFirestore` faz o Auth vencer (`user.mapper.ts:59`) e `phoneNumber` no Auth é *identificador de login* (E.164 + unicidade global) — não é um campo de perfil. |
| Q7 | Re-emitir a sessão do navegador atual após trocar a senha? | re-emitir / deslogar | **deslogar + redirect** | Re-emitir exigiria a `apps/api` escrever cookie no domínio da `apps/app`, mexendo no modelo de SSO. |
| Q8 | Gravar a URL assinada em `photoURL` do Firebase Auth? | sim / não | **não** | Assinatura expira em 15 min; o avatar quebraria sozinho. Guarda-se a referência, assina-se na leitura. |
| Q9 | Aba "Billing" some ou vira placeholder navegável? | some / placeholder | **placeholder navegável** | O corte diz "só reserva o lugar", e o sinal de pronto exige zero `#`. Estado vazio traduzido satisfaz os dois. |


