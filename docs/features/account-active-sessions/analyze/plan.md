# Plano: sessões ativas da conta (fatia 2 de `account-security-mfa`)

Spec de origem: [`specs/account-security-mfa.md`](../../../../specs/account-security-mfa.md), fatia 2 da
tabela "Estado das fatias" (`:278-284`). Itens do corte: item 2 (`:199-200`, ver onde a conta está
conectada) e o resíduo do item 3 (`:201-211`, encerrar uma sessão ou todas as outras mantendo a atual, e
logout comum deixando de ser "sair de todos"). A fatia 1 (política de senha) está registrada em
`docs/features/account-security-mfa/`, que este plano não altera. A fatia 3 (segundo fator, códigos de
recuperação, opt-in) fica fora.

Plano escrito numa rodada autônoma do `/cycle --no-audit`. Nenhuma pergunta foi feita ao usuário: as
escolhas estão na §12, cada uma com a opção adotada e a descartada.

## 0. Sumário do desenho

- Uma sessão é identificada pelo instante do login que a originou: `resolveSessionOriginSeconds(claims)`
  (`packages/auth/session.ts:111-122`), que lê a claim `sessionAuthTime` carregada pelo SSO e, sem ela, o
  `auth_time`. O `firebase-admin` documenta que o `auth_time` é o mesmo em todos os ID tokens de uma
  sessão (`firebase-admin/lib/auth/token-verifier.d.ts:36-44`). O cookie de sessão herda o mesmo valor, e
  o front-end que entra por SSO herda pela claim. App e web no mesmo navegador contam como uma sessão.
- O registro fica numa coleção nova, `session`, com id determinístico `<uid>_<chave>`. A
  `resolveApiActor` lê esse documento a cada requisição autenticada (1 leitura por id), recusa a sessão
  encerrada e atualiza `lastSeenAt` no máximo uma vez a cada 15 minutos.
- Encerrar uma sessão ou "todas as outras" grava `revokedAt` no Firestore. O Firebase não revoga refresh
  token de uma sessão só (`revokeRefreshTokens` derruba todas, `base-auth.d.ts:304-320`), então a recusa
  acontece na API. "Todas as outras" grava também uma marca d'água que cobre sessões que a API ainda não
  viu. O "Sair de todos os dispositivos" que já existe continua sendo a revogação no Firebase.
- Os front-ends passam a consultar a API antes de gravar o cookie compartilhado (login, renovação e
  bootstrap de SSO) e ao sair. Sem isso, o logout local abriria dois defeitos: o loop de redirect entre o
  proxy e o layout, e o outro front-end regravando o cookie de uma sessão encerrada (§1.3).
- O logout comum fica local: `sessionDELETE` marca a sessão atual como encerrada na API e limpa o cookie,
  sem `revokeRefreshTokens`.
- Nada de índice composto, regra do Firestore ou env obrigatória (§14).

## 1. Contexto

### 1.1 Resumo

O titular vê, na aba Segurança da conta, em quais navegadores a conta está conectada (navegador, sistema,
tipo de aparelho, quando entrou e quando foi usada pela última vez), reconhece a sessão atual, encerra uma
sessão específica ou todas as outras sem sair da atual, e o botão "Sair" passa a encerrar só a sessão
deste navegador.

### 1.2 O que existe hoje

| Peça | Onde | O que faz |
|---|---|---|
| Logout | `packages/auth/session-routes.ts:125-137` | `sessionDELETE` chama `revokeUserSessions` (`server.ts:323-329`): todo "Sair" encerra todas as sessões |
| "Sair de todos" explícito | `apps/api/app/(routes)/account/sessions/revoke/route.ts:7-24` | `revokeUserSessions` + evento `account.sessions.revoke` |
| UI | `account/(components)/AccountSecurityForm.tsx:104-147` | Bloco "Sair de todos os dispositivos" com `AlertDialog`; comentário em `:53-54` explica que o Firebase não revoga seletivamente |
| Verificação do bearer | `packages/auth/server.ts:173-194` | `verifyIdToken` + `getUser`, recusa conta desativada e token anterior a `tokensValidAfterTime` (`:153-166`) |
| Verificação do cookie | `packages/auth/server.ts:289-311` | `verifySessionCookie(cookie, true)` + `getUser` |
| Resolução na API | `apps/api/(shared)/lib/resolve-api-actor.ts:15-40` | Bearer como ID token, depois bearer como cookie (o SSR manda o cookie como bearer, `apps/app/lib/server/apiServerClient.ts:15-32`), depois o cookie |
| Guards | `apps/api/app/(guards)/common-panel.ts:36`, `admin.ts:34` | Chamam `resolveApiActor`; `null` vira `401 AUTH_INVALID_TOKEN` |
| Proxy da `apps/app` | `apps/app/proxy.ts` (função `route`) | Confere o cookie só no Firebase (`getUserFromSessionCookie`); em rota pública com cookie válido, manda para a home |
| Layout autenticado | `apps/app/lib/server/authSession.ts:15-40` | `requireSession` chama `/auth/me` pela API; qualquer falha redireciona para `/sign-in` |
| Provider | `packages/auth/provider.tsx:262-290` | Com usuário Firebase e sem cookie (`no-session`), regrava o cookie (`syncSessionCookie`) |
| Registro de último acesso | `apps/api/(shared)/lib/activity-recorder.ts:64-93` | Precedente de escrita em janela de 15 min (`activity-windows.ts:8`) sem ler de novo o perfil |

`git grep` por `session` nas coleções: nenhum repositório usa esse nome hoje
(`apps/api/(shared)/repositories/*.repository.ts`).

### 1.3 Por que os front-ends precisam consultar a API

Hoje proxy, layout e API concordam porque os três confiam no Firebase. Uma recusa que só a API conhece
cria dois caminhos quebrados:

1. **Loop de redirect.** Dispositivo B tem a sessão encerrada por A. O cookie de B continua válido no
   Firebase. B abre uma página protegida: o proxy deixa passar, `requireSession` recebe 401 de `/auth/me` e
   redireciona para `/sign-in`, e o proxy, vendo cookie válido numa rota pública, manda de volta para a
   home. O ciclo se repete até o navegador desistir.
2. **Logout que volta.** Com o logout local, sair no app limpa o cookie compartilhado e o Firebase do app,
   mas o cliente Firebase da web (outra origem, outro armazenamento) continua logado. Na próxima carga da
   web, `applySignedInUser` vê `no-session` e regrava o cookie (`provider.tsx:269-270`), e o app volta a
   ter sessão. Hoje isso não acontece porque o logout revoga tudo no Firebase.

O desenho fecha os dois: o proxy pergunta à API antes de desviar uma rota pública e limpa o cookie de
sessão encerrada; as rotas que gravam o cookie perguntam antes de gravar e respondem
`401 AUTH_SESSION_REVOKED`, que o provider trata como sessão expirada (logout local + aviso).

### 1.4 Objetivos

- Lista de sessões ativas na aba Segurança, com a atual identificada.
- Encerrar uma sessão que não é a atual.
- Encerrar todas as outras, mantendo a atual.
- "Sair" encerra só a sessão deste navegador (as duas origens dele).
- A API recusa, a partir da requisição seguinte, qualquer credencial de uma sessão encerrada, nos dois
  transportes (ID token e cookie).

### 1.5 Fora do escopo

- Segundo fator, códigos de recuperação, opt-in de MFA (fatia 3).
- Reautenticação para ação sensível, alerta de novo dispositivo, login suspeito (spec `:309-324`).
- Localização por IP: o plano não grava IP (P7).
- Lista de sessões para o admin: o painel admin não tem página de conta (`(admin)/admin/(pages)/` só tem
  `audit` e `users`). A recusa e o logout local valem para admins também.
- Exigir o teto absoluto da sessão no bearer da API e TTL da coleção (P15).
- Limite de requisições nas rotas novas (§7).

### 1.6 Apps impactados, área e modo

| App/pacote | Impacto |
|---|---|
| `packages/sdk` | Tipos e ações de sessão; fábrica `createSessionAuthority` usada pelos front-ends no servidor |
| `packages/auth` | `getIdTokenSession`; rotas de sessão aceitam uma autoridade injetada; logout local; provider trata `AUTH_SESSION_REVOKED` |
| `apps/api` | Coleção `session`, rastreio em `resolveApiActor`, rotas `/auth/session` e `/account/sessions/*`, exclusão e exportação de dados |
| `apps/app` | Rotas `/api/auth/*` com a autoridade, proxy, painel de sessões na aba Segurança |
| `apps/web` | Rotas `/api/auth/*` com a autoridade |
| `packages/internationalization` | Cópia nos 3 idiomas, 4 códigos em `apiErrors`, 2 rótulos da trilha |

Área: painel comum (`requireCommonPanelApi`). Modo de produto: igual em `subscription` e `simple`; a aba
Segurança existe nos dois (`AccountTabs.tsx:21-35` só tira a cobrança). Não depende de assinatura.
Genérico: sim, nada de domínio de produto.

## 2. Dados (Firestore)

### 2.1 Coleção `session`

Id do documento: `${encodeURIComponent(uid)}_${sessionKey}`. O `encodeURIComponent` protege contra uid com
`/`, que o Admin SDK aceita em `createUser` e o Firestore não aceita em id. A chave é só dígitos, então o
id não colide.

| Campo | Tipo | Default | `null`? | Por quê |
|---|---|---|---|---|
| `uid` | string | obrigatório | não | Dono (uid do Firebase). A sessão pertence à credencial, não ao perfil, e o rastreio roda antes do guard ler o perfil |
| `sessionKey` | string | obrigatório | não | Segundos do login de origem. Vira o `id` do DTO |
| `signedInAt` | Timestamp | `sessionKey × 1000` | não | Quando a sessão começou |
| `lastSeenAt` | Timestamp | instante da 1ª requisição | não | Último uso, com precisão de 15 min |
| `browser` | string | `null` | sim | Família do navegador (Chrome, Safari, ...) |
| `os` | string | `null` | sim | Sistema (Windows, macOS, iOS, Android, ...) |
| `deviceType` | `"desktop" \| "mobile" \| "tablet"` | `null` | sim | Para o rótulo traduzido |
| `revokedAt` | Timestamp | ausente | sim | Presente = sessão encerrada; ausente é lido como `null` |
| `revokedReason` | `"signed-out" \| "revoked" \| "others"` | ausente | sim | Logout, encerramento individual, "todas as outras" |
| `othersRevokedBefore` | Timestamp | ausente | sim | Só na sessão que pediu "encerrar as outras": marca d'água (§4.4) |
| `createdAt`, `updatedAt`, `deletedAt` | Timestamp / `null` | carimbados | `deletedAt` sim | Convenção do `BaseRepository` (`base.repository.ts:163-188`) |

O user agent bruto não é gravado: o mapper só guarda o que o parser reconhece (P8).

### 2.2 Consultas

| Consulta | Forma | Índice |
|---|---|---|
| Rastreio por requisição | `doc(id).get()` | Nenhum |
| Lista do titular | `where("uid", "==", uid)` | Automático de campo único |
| Marca d'água ao ver uma sessão nova | Mesma consulta acima, só no primeiro contato da sessão | Automático |
| Exclusão de dados | `where("uid", "==", uid)` em lotes (`purgeAll`, `base.repository.ts:243-261`) | Automático |

O filtro de `deletedAt`, de revogadas e a ordenação ficam em memória, como em `findByStripeCustomerId`
(`user.repository.ts:62-78`). Volume esperado: uma sessão por login, dezenas por usuário no ano. Não
precisa de paginação.

### 2.3 Dados existentes

A coleção nasce vazia. Sessões abertas antes do deploy aparecem na lista no primeiro uso depois dele.
Enquanto isso não acontece, elas não aparecem nem podem ser encerradas uma a uma, mas a marca d'água do
"encerrar as outras" as alcança (§4.4) e o "Sair de todos" também. Não há backfill possível: o Firebase não
lista sessões.

### 2.4 Custo

| Evento | Leituras | Escritas |
|---|---|---|
| Requisição autenticada à API | +1 (o guard do painel comum já faz 2, `common-panel.ts:45` e `:73`) | 0, ou 1 a cada 15 min por sessão |
| Primeiro contato de uma sessão | +N (sessões do titular) | 1 |
| Gravação do cookie (login, renovação a cada ~2,5 dias, bootstrap de SSO), logout, rota pública com cookie no proxy | +1 chamada à API | 0 ou 1 |
| Listar | N | 0 |
| Encerrar as outras | N | N |

A leitura por requisição é sequencial depois de `getUser`; paralelizar fica como otimização futura, medida
antes (P2).

## 3. Contrato (`@repo/sdk`)

### 3.1 Tipos (`packages/sdk/src/types/account/account.ts`)

```ts
export type AccountSessionDeviceType = "desktop" | "mobile" | "tablet";

export type AccountSessionDTO = {
    /** Instant, in seconds, of the sign-in that started the session. */
    id: string;
    current: boolean;
    browser: string | null;
    os: string | null;
    deviceType: AccountSessionDeviceType | null;
    signedInAt: string;
    lastSeenAt: string;
};

export type AccountOtherSessionsRevoked = { revoked: number };
```

`AccountDataExportDTO` ganha `sessions: { items: AccountDataExportSession[] }` com os mesmos campos menos
`current`, mais `revokedAt`.

Tipo para os front-ends, em `packages/auth/types.ts` (o SDK já importa de `@repo/auth/types`,
`client/base.ts:3`; o contrário criaria ciclo):

```ts
export type SessionStanding = "active" | "revoked" | "unknown";

export type SessionAuthority = {
    check: (credential: string, userAgent: string | null) => Promise<SessionStanding>;
    end: (credential: string) => Promise<void>;
};
```

`packages/sdk/src/types/audit/audit.ts`: `ACCOUNT_SESSION_REVOKE = "account.session.revoke"` e
`ACCOUNT_SESSIONS_REVOKE_OTHERS = "account.sessions.revokeOthers"`.

### 3.2 Ações

`AccountActions` (`actions/account/action.ts`):

```ts
listSessions(): Promise<AccountSessionDTO[]>                      // GET /account/sessions
revokeSession(id: string): Promise<void>                          // DELETE /account/sessions/:id
revokeOtherSessions(): Promise<AccountOtherSessionsRevoked>       // POST /account/sessions/revoke-others
```

`AuthActions` (`actions/auth/action.ts`), usadas só no servidor dos front-ends, com `timeout` de 3 s no
`request` para o proxy não ficar preso numa API lenta:

```ts
sessionStanding(): Promise<{ active: true }>                      // GET /auth/session
endSession(): Promise<void>                                       // DELETE /auth/session
```

Fábrica nova `packages/sdk/src/client/sessionAuthority.ts`:

```ts
export function createSessionAuthority(url: string | undefined, project: Project): SessionAuthority {
    const clientFor = (credential: string, userAgent: string | null) => {
        const client = new Client({ url: url ?? "", project, context: "common" });
        client.setAuthorizationHeader(credential);
        if (userAgent) client.setHeader("User-Agent", userAgent);
        return client;
    };
    return {
        async check(credential, userAgent) {
            if (!url) return "unknown";
            try {
                await clientFor(credential, userAgent).authApi.sessionStanding();
                return "active";
            } catch (error) {
                return isSessionRevokedError(error) ? "revoked" : "unknown";
            }
        },
        async end(credential) {
            if (!url) return;
            await clientFor(credential, null).authApi.endSession().catch(() => undefined);
        },
    };
}
```

`isSessionRevokedError`: resposta 401 com `error.code === "AUTH_SESSION_REVOKED"`. Qualquer outra falha é
`unknown`. Repassar o `User-Agent` do navegador é o que faz a sessão nascer, já no login, com o aparelho
certo: a chamada parte do servidor do front-end, cujo user agent seria o do Node.

### 3.3 Quem quebra

Nada. Tipos e métodos são novos; `AccountDataExportDTO` só ganha campo, e o único consumidor é o download em
`useAccountDataRights.tsx`, que grava o JSON como veio.

## 4. API (`apps/api`)

### 4.1 Rotas

| Método e path | Guard | Resposta | Erros |
|---|---|---|---|
| `GET /auth/session` | nenhum (usa `resolveApiCredential`) | `200 { data: { active: true } }` | `401 AUTH_SESSION_REVOKED`, `401 AUTH_INVALID_TOKEN` |
| `DELETE /auth/session` | nenhum (usa `resolveApiCredential`) | `204` sempre | nenhum: sair é idempotente |
| `GET /account/sessions` | `requireCommonPanelApi` | `200 { data: AccountSessionDTO[] }` | do guard |
| `DELETE /account/sessions/[id]` | `requireCommonPanelApi<RouteIdParamsContext>` | `204` | `404 ACCOUNT_SESSION_NOT_FOUND`, `409 ACCOUNT_SESSION_IS_CURRENT` |
| `POST /account/sessions/revoke-others` | `requireCommonPanelApi` | `200 { data: { revoked: n } }` | `409 ACCOUNT_SESSION_UNIDENTIFIED` |
| `POST /account/sessions/revoke` | existente | sem mudança | |

`/auth/session` não usa guard de painel de propósito: a sessão é da credencial, então o admin que sai
enquanto personifica alguém encerra a sessão dele, e o guard do painel comum recusaria a escrita
(`impersonation-read-only.ts:19-31`). A rota não confia em nenhum header de contexto.

Segmento estático tem prioridade sobre `[id]` no App Router, então `revoke` e `revoke-others` não colidem
com `DELETE /account/sessions/[id]`.

### 4.2 Resolução da credencial (`resolve-api-actor.ts`)

A assinatura de `resolveApiActor(req): Promise<UserRecord | null>` não muda. 31 arquivos de teste mockam
esse módulo com só essa função (`git grep -l resolve-api-actor -- apps/api/__tests__`), e os dois guards
seguem chamando-a sem alteração. A sessão encerrada vira `null`, e o guard responde
`401 AUTH_INVALID_TOKEN` como hoje (P9).

```ts
type FirebaseCredential = { user: UserRecord; claims: DecodedIdToken };

export type ApiCredential =
    | { status: "active"; user: UserRecord; sessionKey: string | null }
    | { status: "revoked" }
    | { status: "anonymous" };

async function resolveFirebaseCredential(req: NextRequest): Promise<FirebaseCredential | null> {
    // mesma ordem de hoje: bearer como ID token, bearer como cookie, cookie
    // getIdTokenSession(bearer) e getSessionFromCookie(...) devolvem { user, decoded }
}

export async function resolveApiCredential(req: NextRequest): Promise<ApiCredential> {
    const credential = await resolveFirebaseCredential(req);
    if (!credential) return { status: "anonymous" };
    const sessionKey = sessionKeyFromClaims(credential.claims);
    if (sessionKey === null) return { status: "active", user: credential.user, sessionKey };
    const standing = await trackSession({
        uid: credential.user.uid,
        sessionKey,
        userAgent: req.headers.get("user-agent"),
    });
    return standing === "revoked"
        ? { status: "revoked" }
        : { status: "active", user: credential.user, sessionKey };
}

export async function resolveApiActor(req: NextRequest): Promise<UserRecord | null> {
    const credential = await resolveApiCredential(req);
    return credential.status === "active" ? credential.user : null;
}
```

`packages/auth/server.ts` ganha `getIdTokenSession(token)`, com o corpo atual de `getCurrentUser` devolvendo
`{ user, decoded }`; `getCurrentUser` passa a delegar. Os 9 casos de `serverSessionRevocation.test.ts`
continuam valendo.

### 4.3 Chave da sessão (`(shared)/lib/session-key.ts`, novo)

```ts
export function sessionKeyFromClaims(claims: Record<string, unknown>): string | null {
    const seconds = resolveSessionOriginSeconds(claims);
    return seconds === null ? null : String(Math.trunc(seconds));
}

export const sessionDocId = (uid: string, sessionKey: string) =>
    `${encodeURIComponent(uid)}_${sessionKey}`;

/** Decode only: the guard already verified the credential and the session standing. */
export async function resolveRequestSessionKey(req: NextRequest): Promise<string | null>;
```

`resolveRequestSessionKey` usa `verifyIdTokenClaims` (`server.ts:243-256`) no bearer e
`decodeSessionCookie` (`server.ts:262-282`) no cookie: criptografia local, sem chamada ao Firebase nem ao
Firestore. As rotas de `/account/sessions` usam essa função para saber qual é a sessão atual sem repetir o
trabalho do guard.

### 4.4 Rastreio (`(shared)/lib/session-tracker.ts`, novo)

```ts
export async function trackSession(input: {
    uid: string; sessionKey: string; userAgent: string | null; now?: Date;
}): Promise<"active" | "revoked"> {
    const now = input.now ?? new Date();
    let record: SessionRecord | null;
    try {
        record = await sessionRepository.findByUidAndKey(input.uid, input.sessionKey);
    } catch (error) {
        logEvent("auth", "session-check-failed", { reason: reasonOf(error) });
        return "active";
    }
    if (record?.revokedAt) return "revoked";

    const device = describeUserAgent(input.userAgent);
    try {
        if (!record) {
            const covered = await isCoveredByOthersRevocation(input.uid, input.sessionKey);
            await sessionRepository.createSeen({ ...input, at: now, device, revokedAt: covered ? now : null });
            return covered ? "revoked" : "active";
        }
        if (isStale(record.lastSeenAt, now) || (device && record.browser === null)) {
            await sessionRepository.touchSeen(record.id, now, device);
        }
    } catch (error) {
        logEvent("auth", "session-touch-failed", { reason: reasonOf(error) });
    }
    return "active";
}
```

- `isStale`: `now - lastSeenAt >= ACTIVITY_WINDOW_MINUTES` (15, `activity-windows.ts:8`), a mesma precisão
  do último acesso do perfil.
- `isCoveredByOthersRevocation`: lê as sessões do `uid` e responde se alguma outra (chave diferente) tem
  `othersRevokedBefore` posterior a `sessionKey × 1000`. Só roda no primeiro contato de cada sessão.
- `createSeen` grava com `set(..., { merge: true })` e omite `revokedAt` quando a sessão está ativa, para
  não apagar uma revogação gravada em paralelo. Quando a marca d'água cobre a sessão, a resposta é
  `"revoked"` mesmo se a escrita falhar.
- Falha de leitura deixa passar (P6). O log leva só o nome do erro, como `activity-recorder.ts:43-47`.

### 4.5 User agent (`(shared)/lib/user-agent.ts`, novo)

`describeUserAgent(ua: string | null): { browser: string; os: string | null; deviceType: AccountSessionDeviceType } | null`.
Regex em ordem: `Edg/` Edge, `OPR/` Opera, `SamsungBrowser` Samsung Internet, `Firefox|FxiOS` Firefox,
`CriOS|Chrome` Chrome, `Version/.*Safari` Safari. Sistema: `iPhone|iPod` iOS, `iPad` iPadOS, `Android`,
`Windows NT` Windows, `Mac OS X|Macintosh` macOS, `CrOS` ChromeOS, `Linux`. Tipo: `iPad|Tablet` tablet,
`Mobi|iPhone|Android` mobile, o resto desktop. Navegador não reconhecido devolve `null`, e nesse caso nada
de aparelho é gravado: é o que mantém o user agent do Node (SSR) e do axios fora da lista. Sem dependência
nova.

### 4.6 Repositório e mapper

`(shared)/repositories/session.repository.ts`:

```ts
class SessionRepository extends BaseRepository<SessionRecord> {
    constructor() { super(db, "session", sessionMapper); }
    findByUidAndKey(uid: string, key: string): Promise<SessionRecord | null>;   // this.findById(sessionDocId(...))
    async listByUid(uid: string): Promise<SessionRecord[]>;                     // where uid ==, sem deletedAt em memória
    async createSeen(input): Promise<void>;                                      // set merge, id determinístico
    async touchSeen(id: string, at: Date, device: DeviceInfo | null): Promise<void>; // update sem updatedAt, como touchLastAccess
    async revoke(uid: string, key: string, reason: SessionRevokedReason, at: Date): Promise<void>;
    async revokeOthers(uid: string, keepKey: string, at: Date): Promise<number>; // batch; marca d'água na sessão mantida
    purgeAllByUid(uid: string): Promise<number>;                                 // purgeAll(where uid ==)
}
export const sessionRepository = new SessionRepository();
```

`touchSeen` segue `user.repository.ts:118-127`: um acesso não é edição, então não carimba `updatedAt`.

`(shared)/mappers/session.mapper.ts`: `SessionRecord` é tipo interno da API (o DTO público tem `current`,
calculado na rota). `toDTO` normaliza os instantes com `normalizeFirestoreInstant`, usa `stringIfExists`
nos campos de aparelho e lê `revokedAt`/`othersRevokedBefore` ausentes como `null`. `toPersistence` usa
whitelist.

Seleção para a lista, função pura em `session-tracker.ts`:

```ts
export function selectActiveSessions(
    records: SessionRecord[],
    options: { currentKey: string | null; tokensValidAfterTime: string | undefined }
): AccountSessionDTO[]
```

Descarta revogadas, as anteriores a `tokensValidAfterTime` (mortas pelo "Sair de todos", troca de senha,
troca de e-mail ou desativação) e as fora do teto absoluto (`isWithinAbsoluteCap`, `session.ts:124-134`).
Ordena a atual primeiro, depois `lastSeenAt` decrescente.

### 4.7 Esqueletos das rotas

```ts
// app/(routes)/auth/session/route.ts
export async function GET(req: NextRequest) {
    const credential = await resolveApiCredential(req);
    if (credential.status === "revoked") return errorResponse("AUTH_SESSION_REVOKED", HTTP_STATUS.UNAUTHORIZED);
    if (credential.status === "anonymous") return errorResponse("AUTH_INVALID_TOKEN", HTTP_STATUS.UNAUTHORIZED);
    return Response.json({ data: { active: true } });
}

export async function DELETE(req: NextRequest) {
    const credential = await resolveApiCredential(req);
    if (credential.status === "active" && credential.sessionKey) {
        await sessionRepository.revoke(credential.user.uid, credential.sessionKey, "signed-out", new Date());
    }
    return new Response(null, { status: 204 });
}
```

```ts
// app/(routes)/account/sessions/route.ts
export const GET = requireCommonPanelApi(async (req, ctx) => {
    const subjectUid = ctx.authRequest.requestUserId;
    const impersonating = ctx.authRequest.isImpersonating;
    const [records, currentKey, subject] = await Promise.all([
        sessionRepository.listByUid(subjectUid),
        impersonating ? null : resolveRequestSessionKey(req),
        impersonating ? getUserById(subjectUid) : ctx.user,
    ]);
    return Response.json({
        data: selectActiveSessions(records, {
            currentKey,
            tokensValidAfterTime: subject?.tokensValidAfterTime,
        }),
    });
});
```

```ts
// app/(routes)/account/sessions/[id]/route.ts
export const DELETE = requireCommonPanelApi<RouteIdParamsContext>(async (req, ctx) => {
    const id = parseSessionId(await resolveIdFromContext(ctx));
    if (!id) return errorResponse("ACCOUNT_SESSION_NOT_FOUND", HTTP_STATUS.NOT_FOUND);
    if (id === (await resolveRequestSessionKey(req))) {
        return errorResponse("ACCOUNT_SESSION_IS_CURRENT", HTTP_STATUS.CONFLICT);
    }
    const session = await sessionRepository.findByUidAndKey(ctx.user.uid, id);
    if (!session) return errorResponse("ACCOUNT_SESSION_NOT_FOUND", HTTP_STATUS.NOT_FOUND);
    if (!session.revokedAt) {
        await sessionRepository.revoke(ctx.user.uid, id, "revoked", new Date());
        await recordAuditEvent({ action: AuditAction.ACCOUNT_SESSION_REVOKE, targetType: AuditTargetType.SESSION, ... });
    }
    return new Response(null, { status: 204 });
});
```

A posse sai da construção do id: o documento procurado é sempre `sessionDocId(ctx.user.uid, id)`, então um
id de outra pessoa só pode dar 404. Sob personificação o guard recusa antes (`403
AUTH_REQUEST_IMPERSONATION_READ_ONLY`), e `ctx.user` é o próprio titular.

```ts
// app/(routes)/account/sessions/revoke-others/route.ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    const currentKey = await resolveRequestSessionKey(req);
    if (!currentKey) return errorResponse("ACCOUNT_SESSION_UNIDENTIFIED", HTTP_STATUS.CONFLICT);
    const revoked = await sessionRepository.revokeOthers(ctx.user.uid, currentKey, new Date());
    await recordAuditEvent({ action: AuditAction.ACCOUNT_SESSIONS_REVOKE_OTHERS, ... });
    return Response.json({ data: { revoked } });
});
```

O evento de auditoria segue os campos de `account/sessions/revoke/route.ts:10-21`.

### 4.8 Validação

`(shared)/validation/session.schema.ts`: `sessionIdSchema = z.string().regex(/^\d{1,12}$/)` e
`parseSessionId(raw): string | null`. Id malformado responde 404, sem distinguir de inexistente. Não há
body em nenhuma rota nova.

### 4.9 Exclusão e exportação de dados

- `account-erasure.ts`: passo novo `"sessions"` antes de `"profile"`, chamando
  `sessionRepository.purgeAllByUid(input.uid)`. O `ErasureStepName` (`:16-22`) e a lista ordenada de passos
  ganham o item.
- `account-export.ts`: seção `sessions` com as sessões do titular (incluindo encerradas), limitada a
  `EXPORT_MAX_RECORDS`.

### 4.10 Códigos de erro

| `error.code` | Status | Onde |
|---|---|---|
| `AUTH_SESSION_REVOKED` | 401 | `GET /auth/session`; rotas de cookie dos front-ends (`packages/auth/session-routes.ts`) |
| `ACCOUNT_SESSION_NOT_FOUND` | 404 | `DELETE /account/sessions/[id]` |
| `ACCOUNT_SESSION_IS_CURRENT` | 409 | `DELETE /account/sessions/[id]` com a sessão atual |
| `ACCOUNT_SESSION_UNIDENTIFIED` | 409 | `POST /account/sessions/revoke-others` sem chave derivável |

Os quatro entram em `apiErrors` nos 3 idiomas e na lista de `apps/app/__tests__/accountApiErrorCopy.test.ts`.

### 4.11 Payload e resposta de exemplo

```http
GET /account/sessions
Authorization: Bearer <idToken>
```

```json
{
  "data": [
    { "id": "1790800000", "current": true, "browser": "Chrome", "os": "macOS", "deviceType": "desktop",
      "signedInAt": "2026-09-30T20:26:40.000Z", "lastSeenAt": "2026-09-30T22:00:00.000Z" },
    { "id": "1790500000", "current": false, "browser": "Safari", "os": "iOS", "deviceType": "mobile",
      "signedInAt": "2026-09-27T09:06:40.000Z", "lastSeenAt": "2026-09-29T11:45:00.000Z" }
  ]
}
```

```http
POST /account/sessions/revoke-others  →  200 { "data": { "revoked": 1 } }
DELETE /account/sessions/1790500000   →  204
DELETE /account/sessions/1790800000   →  409 { "error": { "code": "ACCOUNT_SESSION_IS_CURRENT" } }
GET /auth/session (sessão encerrada)   →  401 { "error": { "code": "AUTH_SESSION_REVOKED" } }
```

## 5. `packages/auth`

### 5.1 Rotas de sessão (`session-routes.ts`)

Todas aceitam uma `SessionAuthority` opcional. Sem ela, o comportamento é o de hoje menos a revogação
global no logout.

| Handler | Mudança |
|---|---|
| `sessionPOST(request, authority?)` | Antes de `mintSessionCookie`, `authority.check(idToken, ua)`. `revoked` limpa o cookie e responde `401 AUTH_SESSION_REVOKED` |
| `sessionRefreshPOST(request, authority?)` | A consulta entra depois do `shouldRefreshSession` (o caminho quente, `:108-110`, continua sem rede) e antes do `mintSessionCookie`, usando o cookie atual |
| `customTokenPOST(request?, authority?)` | Depois de `getSessionFromCookie`, `check(cookie, ua)`. `revoked` limpa o cookie e responde 401 sem emitir custom token |
| `sessionDELETE(authority?)` | Lê o cookie, chama `authority.end(cookie)` (melhor esforço), limpa o cookie. Não chama mais `revokeUserSessions` nem `getUserFromSessionCookie` |

`unknown` deixa gravar: com a API fora do ar a credencial ainda passa pela verificação do Firebase dentro
de `mintSessionCookie`, e a API recusaria o uso de qualquer forma (P6). O comentário de `sessionDELETE`
(`:125`) passa a dizer "sign out this browser".

### 5.2 Provider (`provider.tsx`)

- `REVOKED_CODE = "AUTH_SESSION_REVOKED"`; `RefreshOutcome` ganha `"revoked"`.
- `refreshSessionCookie` devolve `"revoked"` para esse código.
- `handleSessionExpired` vira `handleSessionEnded(reason: "expired" | "revoked")`, com a mesma guarda de
  reentrada (`sessionExpiredHandledRef`) e o aviso `dictionary.packages.auth.provider.session[reason]`.
- `applySignedInUser` trata `"revoked"` como trata `"expired"`, no resultado e no `catch` do
  `SessionCookieRejectedError`.

É isso que desliga o cliente Firebase de uma origem cuja sessão foi encerrada: na próxima tentativa de
gravar o cookie (carga da página ou renovação do ID token, de hora em hora) ele recebe o 401, faz logout
local e manda para o login.

## 6. Front-end

### 6.1 Montagem da autoridade

`apps/app/lib/server/sessionAuthority.ts` e `apps/web/shared/lib/sessionAuthority.ts`:

```ts
import "server-only";
import { createSessionAuthority } from "@repo/sdk/src/client/sessionAuthority";

export const sessionAuthority = createSessionAuthority(process.env.NEXT_PUBLIC_API_URL, "app"); // "web" na web
```

Rotas das duas apps (`app/api/auth/session/route.ts`, `session/refresh/route.ts`,
`custom-token/route.ts`) passam `request` e `sessionAuthority`. O comentário de
`apps/app/app/api/auth/session/route.ts:3-7` ("DELETE revokes + clears it everywhere") muda para o
comportamento novo.

### 6.2 Proxy da `apps/app`

No ramo que desvia rota pública com cookie válido:

```ts
if (isPublic && sessionUser && !isOobActionPath(appPath)) {
    const standing = await sessionAuthority.check(token, request.headers.get("user-agent"));
    if (standing === "revoked") {
        await clearSessionCookie();
        return NextResponse.next({ request: { headers: requestHeaders } });
    }
    // desvio para a home, como hoje
}
```

A chamada só acontece quando alguém com cookie visita uma rota pública: depois de um 401 do layout ou
navegando de volta ao login. O login normal sai pela navegação do cliente direto para a home. `requireSession`
e `/auth/me` não mudam. `clearSessionCookie` usa `cookies()` de `next/headers`, que o proxy já usa para
`x-locale`; o `/test` confere que o cookie sai na resposta.

### 6.3 Aba Segurança

Árvore em `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/`:

```
(components)/AccountSessionsPanel.tsx      novo, "use client"
(components)/AccountSecurityForm.tsx       renderiza o painel entre o formulário de senha e o bloco "Sair de todos"
(hooks)/useListAccountSessions.tsx         novo: fetchAccountSessionsList + useListAccountSessions (useAuthorizedQuery)
(hooks)/useAccountSessionMutations.tsx     novo: revokeSessionMutation, revokeOtherSessionsMutation
```

`apps/app/shared/lib/queryKeys.ts`: `account.sessions: () => [...queryKeys.account.all, "sessions"]`.

Painel:

- Título, descrição (inclui a precisão de 15 min do último uso).
- `Table` de `@repo/design-system/components/ui` (como `AuditListClient.tsx:3`), `rowKey="id"`,
  `onRefresh`/`refreshLoading`, `locale.emptyText`, sem `searchFields` (lista curta).
- Colunas: Dispositivo (`browser · os` ou "Dispositivo desconhecido", rótulo traduzido do `deviceType`,
  selo "Esta sessão" na atual), Entrou em, Último uso (`useFormatDisplayDateTime`,
  `formatDisplayDateTime.ts:37-41`), Ações (botão "Encerrar" com `aria-label` interpolando o aparelho; a
  linha atual não tem botão).
- Botão "Encerrar as outras sessões" com `AlertDialog` (mesmo padrão de `AccountSecurityForm.tsx:111-146`),
  desabilitado sem outras sessões, sob personificação ou com a mutation pendente.
- Sob personificação: lista visível, sem "Esta sessão", botões desabilitados, e o
  `ImpersonationReadOnlyNotice` que `AccountTabs.tsx:80` já mostra.
- Mutations invalidam `queryKeys.account.sessions()`, avisam com `successAlert` e tratam erro com
  `handleClientError(new FormattedError(error, locale))` + `errorAlert`, como `useAccountMutations.tsx:20-21`.

Sem prefetch RSC: é um painel dentro de uma aba cliente; a página não prefetcha as outras abas.

### 6.4 Estados

| Estado | Como aparece |
|---|---|
| Carregando | `Table` com `loading` |
| Normal | Atual primeiro, depois por último uso |
| Só a atual | Botão "Encerrar as outras" desabilitado |
| Vazio | Só sob personificação de quem não tem sessão: `emptyText` |
| Erro de carga | `errorAlert` com a cópia do `error.code`; tabela vazia, botão de atualizar ativo |
| Encerrando | Botão da linha e do diálogo com `isPending`, sem duplo envio |
| Sessão encerrada noutro aparelho | Próximas chamadas do aparelho: 401 `AUTH_INVALID_TOKEN` (guard); na navegação, proxy limpa o cookie e o provider faz logout com o aviso de sessão encerrada |

## 7. i18n

`translations/apps/app/pages/common/account.ts`, nos 3 idiomas (pt-br abaixo):

```ts
security: {
    // chaves atuais sem mudança
    sessions: {
        title: "Sessões ativas",
        description: "Navegadores em que a sua conta está conectada. O último uso é atualizado a cada 15 minutos.",
        columns: { device: "Dispositivo", signedInAt: "Entrou em", lastSeenAt: "Último uso", actions: "Ações" },
        current: "Esta sessão",
        unknownDevice: "Dispositivo desconhecido",
        deviceTypes: { desktop: "Computador", mobile: "Celular", tablet: "Tablet" },
        revoke: "Encerrar",
        revokeAriaLabel: "Encerrar a sessão em {device}",
        revokeOthers: "Encerrar as outras sessões",
        revokeOthersDescription: "Mantém esta sessão e encerra as demais.",
        revokeOthersConfirm: "Tem certeza que deseja encerrar todas as outras sessões?",
        revokeOthersAction: "Encerrar outras",
        empty: "Nenhuma sessão ativa.",
    },
},
messages: {
    // chaves atuais sem mudança
    sessionRevoked: "Sessão encerrada.",
    otherSessionsRevoked: "As outras sessões foram encerradas.",
},
```

`translations/packages/auth/index.ts`: `provider.session.revoked: "Esta sessão foi encerrada. Entre
novamente para continuar."`.

`translations/packages/shared/utils.ts` (`apiErrors`): os 4 códigos da §4.10.

`translations/apps/app/pages/admin/auditTrail.ts`: `"account.session.revoke": "Sessão encerrada"` e
`"account.sessions.revokeOthers": "Outras sessões encerradas"`.

Nomes de navegador e sistema vêm do parser e não são traduzidos (são nomes próprios).

## 8. Autorização e segurança

- Toda rota nova tem a regra no servidor: `/account/sessions/*` sob `requireCommonPanelApi`, posse por
  construção do id, escrita bloqueada sob personificação pelo guard.
- A recusa vale em toda rota autenticada porque mora em `resolveApiActor`, que guards e rotas soltas
  (`auth/me`, `auth/email-verification/send`) já chamam.
- Nenhum header de contexto decide de quem é a sessão: a chave vem das claims da credencial verificada.
- O DTO não expõe uid, IP nem user agent bruto.
- Sem limite de requisições nas rotas novas. `/auth/session` é chamada pelo servidor dos front-ends, com o
  IP do servidor, e um limite por IP derrubaria todos os usuários juntos. `docs/SECURITY.md` registra isso
  junto do aviso de `:153`.

### 8.1 O que o modelo garante e o que não garante

| Situação | Comportamento |
|---|---|
| Aparelho B encerrado por A, bearer de B | Recusado pela API a partir da requisição seguinte, inclusive os ID tokens renovados depois, porque todos têm o mesmo `auth_time` |
| Aparelho B, cookie no SSR | Recusado pela API; o proxy limpa o cookie quando B cai no login; regravar o cookie é recusado |
| Outra aba, mesma origem | Mesma sessão (mesmo IndexedDB e cookie). "Encerrar as outras" a mantém; o logout local desconecta todas as abas daquela origem |
| Mesmo navegador, outra origem (app e web) | Mesma sessão pela claim do SSO. Sair numa encerra a outra na próxima tentativa de gravar o cookie: carga da página ou renovação do token, até 1 hora, como hoje |
| Refresh token de B no Firebase | **Continua válido.** B ainda consegue emitir ID tokens e chamar o Identity Toolkit direto com a chave pública. Firestore e Storage negam todo cliente (`firestore.rules`, `storage.rules`), e trocar senha, e-mail ou excluir a conta pelo Identity Toolkit exige login recente, ou seja, a senha. Para cortar no Firebase, o titular usa "Sair de todos" ou troca a senha |
| Dois logins no mesmo segundo | Mesma chave, uma linha só; encerrar uma encerra as duas |
| Firestore falhando na leitura do rastreio | A requisição passa (P6). O guard lê o perfil no mesmo Firestore logo depois, então a falha tende a derrubar a requisição de qualquer jeito |
| API fora do ar ao gravar o cookie | O cookie é gravado; a API recusaria o uso quando voltasse |
| Sessão anterior ao deploy e nunca usada depois | Fora da lista; coberta pela marca d'água do "encerrar as outras" e pelo "Sair de todos" |
| `apps/web` com sessão encerrada | O cabeçalho da web segue mostrando "logado" até a próxima gravação de cookie; chamadas à API falham com 401 |
| Fork com `SESSION_ABSOLUTE_MAX_AGE_DAYS` diferente só nos front-ends | A API usa o padrão (30 dias) para esconder sessões vencidas da lista; a variável precisa ir para a API também (§14) |

## 9. Testes planejados

Todos em Vitest, sem emulador. Nível mais barato que prova cada comportamento.

| Arquivo | Nível | O que prova |
|---|---|---|
| `apps/api/__tests__/sessionUserAgent.test.ts` | unit, tabela | Chrome/Edge/Opera/Samsung/Firefox/Safari em desktop, iOS, iPadOS, Android; user agent do Node e do axios dão `null` |
| `apps/api/__tests__/sessionMapper.test.ts` | unit | `Timestamp`→ISO, campos ausentes viram `null`, whitelist do `toPersistence` |
| `apps/api/__tests__/sessionKey.test.ts` | unit | Chave pela claim `sessionAuthTime` antes de `auth_time`; `null` sem nenhuma; id com uid contendo `/` |
| `apps/api/__tests__/sessionTracker.test.ts` | unit, repositório mockado | Sessão nova é criada com aparelho; nova coberta pela marca d'água sai revogada; revogada recusa; `lastSeenAt` recente não escreve; antigo escreve; aparelho que faltava é gravado; falha de leitura passa e loga; falha de escrita não muda a resposta |
| `apps/api/__tests__/selectActiveSessions.test.ts` | unit | Tira revogadas, anteriores a `tokensValidAfterTime` e fora do teto; marca a atual; ordena |
| `apps/api/__tests__/resolveApiActorSession.test.ts` | unit, `@repo/auth/server` e tracker mockados | Revogada vira `null` nos dois transportes; ativa devolve o usuário; credencial sem chave não rastreia; ordem bearer → cookie mantida |
| `apps/api/__tests__/authSessionRoute.test.ts` | rota, `vi.mock` | GET 200/401 revogada/401 anônima; DELETE grava `signed-out` e responde 204 sem credencial também |
| `apps/api/__tests__/accountSessionsRoute.test.ts` | rota, guard passthrough | Lista; personificação sem `current` e com o `tokensValidAfterTime` do titular; DELETE 404 malformado e inexistente, 409 atual, 204, idempotente com revogada, evento gravado; revoke-others conta, mantém a atual, grava a marca d'água e o evento; 409 sem chave |
| `apps/api/__tests__/accountErasure.test.ts` (existente) | unit | Passo `sessions` chama `purgeAllByUid` antes do perfil |
| `apps/api/__tests__/accountExportRoute.test.ts` (existente) | rota | Seção `sessions` no arquivo |
| `packages/auth/__tests__/sessionRoutesAuthority.test.ts` | rota, Firebase mockado | POST/refresh/custom-token com `revoked` respondem 401 e limpam o cookie sem gravar; `unknown` e `active` gravam; sem autoridade grava; refresh no caminho quente não consulta; DELETE chama `end` e nunca `revokeRefreshTokens`, e limpa o cookie mesmo se `end` rejeitar |
| `packages/auth/__tests__/serverSessionRevocation.test.ts` (existente) | unit | `getIdTokenSession` devolve as claims e aplica as mesmas recusas |
| `packages/sdk/__tests__/sessionAuthority.test.ts` | unit, axios mockado | 200 `active`; 401 `AUTH_SESSION_REVOKED` `revoked`; 401 outro, 500 e rede `unknown`; sem URL `unknown`; repassa `Authorization` e `User-Agent`; `end` engole erro |
| `apps/app/__tests__/proxy.test.ts` (existente) | unit | Rota pública com cookie: `revoked` limpa o cookie e não desvia; `active` e `unknown` desviam |
| `apps/app/__tests__/useAccountSessions.test.tsx` | hook | Lista no cache pela chave; encerrar invalida e avisa; erro vai para `errorAlert` |
| `apps/app/__tests__/accountSessionsPanel.test.tsx` | componente | Selo da atual sem botão; desabilitado sob personificação; "Dispositivo desconhecido" |
| `apps/app/__tests__/accountApiErrorCopy.test.ts` (existente) | unit | Os 4 códigos têm cópia |
| Provider | unit | Se a extração de `refreshOutcomeFor(status, code)` em função pura couber, testar ela; senão, o `/test` cobre pelo navegador |

Teste de emulador não entra. A recusa mora no nosso Firestore e o repositório mockado prova a lógica. O
achado da spec (`:305-307`) vale aqui: sob o emulador, `verifyIdToken` confere revogação e `disabled`
sozinho (`firebase-admin/lib/auth/base-auth.js:119-121`), então um teste de emulador sobre revogação no
Firebase passaria sem o nosso código. A suíte `firestoreRules.emulator.test.ts` descobre a coleção nova
sozinha pelo `super(db, "session"` (`:28-42`) e passa a confirmar que clientes não leem `session`.

## 10. O que o `/test` vai percorrer

Contra o emulador (`pnpm emulators` + `pnpm seed` + `pnpm dev`), com `agent-browser` em comandos
sequenciais. Duas sessões do mesmo usuário de QA exigem dois contextos de navegador separados e logins com
pelo menos 1 segundo de diferença (a chave tem precisão de segundo).

1. **Lista**: contexto A e contexto B logados; em A, aba Segurança mostra 2 linhas, A com "Esta sessão" e
   sem botão.
2. **Encerrar uma**: em A, encerrar B. B, ao chamar a API, recebe 401; ao navegar, cai no login com o aviso
   de sessão encerrada, sem loop de redirect (contar os redirects). B entra de novo com senha e aparece como
   sessão nova.
3. **Encerrar as outras**: três contextos; em C, "Encerrar as outras" com confirmação; A e B caem, C segue.
4. **Logout local**: "Sair" em A; B continua usando o app. A lista em B não mostra A.
5. **SSO**: em A, logar no app (`:3000`), abrir a web (`:3001`), sair no app, recarregar a web: a web
   desconecta com o aviso e o app não volta logado.
6. **"Sair de todos"** continua derrubando a atual e as outras.
7. **Personificação**: admin personificando o usuário vê a lista sem "Esta sessão" e com botões
   desabilitados; `DELETE` direto responde 403.
8. **Aparelho**: user agent de celular (viewport mobile do `agent-browser` com UA de iPhone) aparece como
   "Safari · iOS · Celular".
9. Light, dark e mobile (375 px); pt-br, en, es; a tabela antd respeita o tema.

Não observável sem infra externa: nada. O comportamento do refresh token no Firebase real (§8.1) é
documentado, não medido.

## 11. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Lista de sessões ativas na aba Segurança**
  O titular vê uma linha por sessão ativa, com navegador e sistema, tipo de aparelho, quando entrou e o
  último uso. A sessão atual aparece primeiro, com o selo "Esta sessão" e sem botão de encerrar; as demais
  vêm por último uso, do mais recente para o mais antigo. Sessão de aparelho não reconhecido mostra
  "Dispositivo desconhecido". Sessões encerradas, as derrubadas por "Sair de todos" ou troca de senha e as
  além do teto absoluto não aparecem.

- [ ] **Encerrar uma sessão específica**
  "Encerrar" numa linha que não é a atual responde 204, a linha some depois da atualização e aparece o aviso
  "Sessão encerrada.". O aparelho encerrado recebe 401 na chamada seguinte à API, nos dois transportes. Id
  malformado, inexistente ou de outra pessoa responde `404 ACCOUNT_SESSION_NOT_FOUND`; o id da sessão atual
  responde `409 ACCOUNT_SESSION_IS_CURRENT`; repetir o pedido para uma sessão já encerrada responde 204 sem
  gravar evento novo. Duplo clique não dispara duas requisições.

- [ ] **Encerrar todas as outras mantendo a atual**
  Depois da confirmação no diálogo, `POST /account/sessions/revoke-others` encerra todas as outras sessões
  listadas, responde com a contagem e a sessão atual continua funcionando. Uma sessão aberta antes e ainda
  não vista pela API também é recusada no primeiro uso. O botão fica desabilitado quando só existe a sessão
  atual. Sem chave derivável da credencial a rota responde `409 ACCOUNT_SESSION_UNIDENTIFIED` e não encerra
  nada.

- [ ] **Logout local**
  "Sair" encerra só a sessão deste navegador: o cookie é limpo, a sessão fica registrada como encerrada e os
  outros aparelhos continuam usando o app. `DELETE /api/auth/session` não chama `revokeRefreshTokens`. Se a
  API não responder, o cookie é limpo mesmo assim.

- [ ] **Sem loop de redirect para sessão encerrada**
  O aparelho cuja sessão foi encerrada, ao abrir qualquer página do painel, termina na tela de login depois
  de um número finito de redirects, com o cookie removido e o aviso "Esta sessão foi encerrada." nos 3
  idiomas. Entrar de novo com a senha cria uma sessão nova, que aparece na lista.

- [ ] **Sair num front-end desconecta o outro**
  Com app e web logados no mesmo navegador, sair no app faz a web desconectar na próxima carga ou renovação
  de token: `POST /api/auth/session` responde `401 AUTH_SESSION_REVOKED` e o provider faz logout local. O app
  não volta a ter sessão por causa da web. Com a API fora do ar, o cookie é gravado como antes.

- [ ] **"Sair de todos os dispositivos" continua igual**
  O botão existente encerra todas as sessões, inclusive a atual, no Firebase. Depois dele a lista fica
  vazia até um novo login, que aparece como sessão nova.

- [ ] **Personificação**
  O admin personificando um usuário vê a lista daquele usuário, sem nenhuma linha marcada como atual, com os
  botões desabilitados. `DELETE /account/sessions/<id>` e `POST /account/sessions/revoke-others` sob
  personificação respondem `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`. O admin que sai enquanto personifica
  encerra a própria sessão.

- [ ] **Último uso e aparelho**
  O último uso avança no máximo uma vez a cada 15 minutos por sessão. A sessão aberta pelo login já nasce
  com o aparelho do navegador, não com o do servidor do front-end. Requisições do SSR não sobrescrevem o
  aparelho.

- [ ] **Trilha de auditoria**
  Encerrar uma sessão grava `account.session.revoke` e encerrar as outras grava
  `account.sessions.revokeOthers`, com os rótulos traduzidos na trilha do admin nos 3 idiomas. Logout comum
  não grava evento.

- [ ] **Exclusão e exportação de dados**
  Excluir a conta apaga os documentos de `session` do titular, num passo próprio do relatório da exclusão. A
  exportação traz as sessões, encerradas inclusive.

- [ ] **Erros traduzidos**
  `AUTH_SESSION_REVOKED`, `ACCOUNT_SESSION_NOT_FOUND`, `ACCOUNT_SESSION_IS_CURRENT` e
  `ACCOUNT_SESSION_UNIDENTIFIED` têm mensagem em pt-br, en e es, sem stack trace nem texto interno.

- [ ] **Tema e responsivo**
  O painel e o diálogo funcionam em light e dark e a 375 px sem rolagem horizontal da página. A tabela antd
  segue o tema e os textos (incluindo `aria-label` do botão por linha) vêm do dicionário nos 3 idiomas.

## 12. Perguntas em aberto

Cada item traz a opção adotada nesta rodada e a descartada.

| # | Pergunta | Adotada | Por quê | Descartada |
|---|---|---|---|---|
| P1 | Como identificar a sessão? | `resolveSessionOriginSeconds` (`sessionAuthTime` ou `auth_time`) | O `firebase-admin` garante o mesmo `auth_time` em todos os tokens da sessão (`token-verifier.d.ts:36-44`); o repo já carrega a claim no SSO (`session-routes.ts:151-162`); zero mudança no login | Id aleatório em claim de custom token: obriga todo login a passar por um `signInWithCustomToken` extra, reescreve o `auth_time` e mexe em todos os fluxos de entrada |
| P2 | Onde guardar e checar a recusa? | Coleção `session`, leitura por id a cada requisição (+1 leitura) | Fica fora do perfil; não precisa de índice | Lista no documento do perfil, que o guard já lê (0 leitura extra): `findByReferenceId` espalha o documento cru no DTO (`user.repository.ts:56-59`) e ele sai em `/auth/me` e no detalhe do admin (`user.mapper.ts:59-68`) |
| P3 | Como encerrar "todas as outras"? | Recusa na API + marca d'água para sessões não vistas | Uma requisição, sem dança no cliente; serve também para o encerramento individual | `revokeRefreshTokens` + custom token reemitido para a sessão atual: corta no Firebase, mas exige novo login no cliente atual, derruba a outra origem do mesmo navegador e não resolve o encerramento individual |
| P4 | Os front-ends consultam a API? | Sim, por uma `SessionAuthority` injetada nas rotas de cookie e no proxy | Sem isso há loop de redirect e o logout de um front-end é desfeito pelo outro (§1.3) | Ler o Firestore de dentro de `packages/auth`: fura o padrão repositório + mapper, que mora na `apps/api` |
| P5 | Logout local por padrão? | Sim, com "Sair de todos" explícito | Recomendação da spec (`:369-370`) | Manter o logout global e só avisar |
| P6 | Falha do Firestore no rastreio ou API fora ao gravar cookie | Deixa passar, com log | O guard lê o perfil no mesmo Firestore logo depois; recusar transformaria instabilidade em logout geral | Recusar a requisição (fail-closed) |
| P7 | Guardar IP ou localização? | Não | Minimização (LGPD) e nenhum serviço de geolocalização no repo; o aparelho basta para reconhecer a sessão | IP truncado ou cidade por serviço externo |
| P8 | Guardar o user agent bruto? | Não, só navegador, sistema e tipo | Minimização; o bruto ajuda a identificar o aparelho de forma única | Gravar o bruto truncado em 256 caracteres |
| P9 | Código próprio nos guards para sessão encerrada? | Não: guards seguem com `AUTH_INVALID_TOKEN`; `AUTH_SESSION_REVOKED` só em `/auth/session` e nas rotas de cookie | Mantém os 31 mocks de `resolve-api-actor` e os dois guards sem mudança | Canal lateral por `WeakMap` da requisição, ou trocar a função dos guards e atualizar os 31 arquivos de teste |
| P10 | Admin ganha lista de sessões? | Não nesta fatia | Não existe página de conta no painel admin | Criar a página |
| P11 | Personificação vê as sessões do usuário? | Sim, só leitura | Personificação é leitura por desenho (`impersonation-read-only.ts:7-15`) | Esconder a lista |
| P12 | Exportação inclui sessões? | Sim | A exportação cobre o que guardamos sobre o titular; o RoPA cita a exportação (`docs/ROPA.md:57`) | Só a exclusão |
| P13 | Encerrar a atual pela lista? | `409 ACCOUNT_SESSION_IS_CURRENT`; a atual sai por "Sair" | Encerrar pela lista deixaria cookie e cliente Firebase vivos na tela | Tratar como logout |
| P14 | Auditar? | Sim, `account.session.revoke` e `account.sessions.revokeOthers` | Precedente: `account.sessions.revoke` | Não auditar |
| P15 | TTL na coleção e teto absoluto no bearer? | Nenhum dos dois | A API não exige o teto absoluto no bearer, então apagar uma sessão encerrada a ressuscitaria para um cliente Firebase que ainda tem refresh token | TTL + exigir o teto no bearer em `resolveApiActor`: fatia própria, muda o comportamento de quem usa só bearer |

Discordância com o corte da spec: nenhuma. Os "Sinais de pronto" pedem que encerrar as outras "derrube o
resto" (`:354-355`); isso vale na API e nos front-ends, mas o refresh token do Firebase nos outros
aparelhos continua vivo (§8.1). O usuário decide se isso basta ou se "encerrar as outras" deve também
revogar no Firebase pela dança da P3.

## 13. Blueprint técnico (Etapa 2)

### 13.1 Arquivos

Novos:

```
packages/sdk/src/client/sessionAuthority.ts
packages/sdk/__tests__/sessionAuthority.test.ts
packages/auth/__tests__/sessionRoutesAuthority.test.ts
apps/api/(shared)/lib/session-key.ts
apps/api/(shared)/lib/session-tracker.ts
apps/api/(shared)/lib/user-agent.ts
apps/api/(shared)/mappers/session.mapper.ts
apps/api/(shared)/repositories/session.repository.ts
apps/api/(shared)/validation/session.schema.ts
apps/api/app/(routes)/auth/session/route.ts
apps/api/app/(routes)/account/sessions/route.ts
apps/api/app/(routes)/account/sessions/[id]/route.ts
apps/api/app/(routes)/account/sessions/revoke-others/route.ts
apps/api/__tests__/{sessionUserAgent,sessionMapper,sessionKey,sessionTracker,selectActiveSessions,resolveApiActorSession,authSessionRoute,accountSessionsRoute}.test.ts
apps/app/lib/server/sessionAuthority.ts
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSessionsPanel.tsx
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useListAccountSessions.tsx
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useAccountSessionMutations.tsx
apps/app/__tests__/{useAccountSessions,accountSessionsPanel}.test.tsx
apps/web/shared/lib/sessionAuthority.ts
```

Alterados:

```
packages/sdk/src/types/account/account.ts
packages/sdk/src/types/audit/audit.ts
packages/sdk/src/actions/account/action.ts
packages/sdk/src/actions/auth/action.ts
packages/auth/types.ts
packages/auth/server.ts
packages/auth/session-routes.ts
packages/auth/provider.tsx
packages/auth/__tests__/serverSessionRevocation.test.ts
apps/api/(shared)/lib/resolve-api-actor.ts
apps/api/(shared)/lib/account-erasure.ts
apps/api/(shared)/lib/account-export.ts
apps/api/.env.example
apps/api/__tests__/accountErasure.test.ts
apps/api/__tests__/accountExportRoute.test.ts
apps/app/proxy.ts
apps/app/app/api/auth/session/route.ts
apps/app/app/api/auth/session/refresh/route.ts
apps/app/app/api/auth/custom-token/route.ts
apps/app/shared/lib/queryKeys.ts
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx
apps/app/__tests__/proxy.test.ts
apps/app/__tests__/accountApiErrorCopy.test.ts
apps/web/app/api/auth/session/route.ts
apps/web/app/api/auth/session/refresh/route.ts
apps/web/app/api/auth/custom-token/route.ts
packages/internationalization/translations/apps/app/pages/common/account.ts
packages/internationalization/translations/packages/shared/utils.ts
packages/internationalization/translations/packages/auth/index.ts
packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts
docs/AUTH-SSO.md
docs/ROPA.md
docs/SECURITY.md
docs/PRE-PRODUCTION.md
```

Não muda: `packages/auth/session.ts`, os dois guards, `apps/api/app/(routes)/auth/me/route.ts`,
`apps/app/lib/server/authSession.ts`, `firestore.rules`, `firestore.indexes.json`,
`packages/design-system`.

### 13.2 Pseudo-diffs

`packages/auth/session-routes.ts`:

```diff
-/** DELETE /api/auth/session — sign out everywhere (revoke + clear the shared cookie). */
-export async function sessionDELETE(): Promise<Response> {
-    const current = await readSessionCookie();
-    if (current) {
-        const user = await getUserFromSessionCookie(current);
-        if (user) {
-            // Other origins' ID-token refresh then fails too (cross-app sign-out).
-            await revokeUserSessions(user.uid);
-        }
-    }
-    await clearSessionCookie();
+/** DELETE /api/auth/session: sign out this browser, leaving the account's other sessions alive. */
+export async function sessionDELETE(authority?: SessionAuthority): Promise<Response> {
+    const current = await readSessionCookie();
+    if (current && authority) {
+        await authority.end(current).catch(() => undefined);
+    }
+    await clearSessionCookie();
     return Response.json({ ok: true });
 }
```

```diff
 export async function sessionPOST(request: Request, authority?: SessionAuthority): Promise<Response> {
     ...
+    if ((await authority?.check(idToken, request.headers.get("user-agent"))) === "revoked") {
+        await clearSessionCookie();
+        return jsonError("AUTH_SESSION_REVOKED", HTTP_STATUS.UNAUTHORIZED);
+    }
     const minted = await mintSessionCookie(idToken);
```

`packages/auth/server.ts`:

```diff
-export const getCurrentUser = async (token: string | null) => {
+export const getIdTokenSession = async (
+    token: string | null
+): Promise<{ user: UserRecord; decoded: DecodedIdToken } | null> => {
     ...
-        return user;
+        return { user, decoded: decodedToken };
     ...
 };
+
+export const getCurrentUser = async (token: string | null) =>
+    (await getIdTokenSession(token))?.user ?? null;
```

`apps/api/(shared)/lib/account-erasure.ts`:

```diff
 export type ErasureStepName =
     | "storage" | "billing" | "entities" | "auditTrail"
+    | "sessions"
     | "profile" | "authAccount";
 ...
+        await runStep("sessions", () => sessionRepository.purgeAllByUid(input.uid)),
         await runStep("profile", () => userRepository.purgeProfile(profileId)),
```

`apps/api/.env.example`:

```diff
+# Absolute session lifetime, in days. Leave empty for the default (30). Only needed when the
+# front-ends set it: the API uses it to hide sessions past the cap from the account's session
+# list, so the value has to match theirs.
+SESSION_ABSOLUTE_MAX_AGE_DAYS=""
```

`AccountSecurityForm.tsx`: renderiza `<AccountSessionsPanel />` entre o `</Form>` (`:102`) e o bloco
"Sair de todos" (`:104`). O comentário de `:53-54` continua verdadeiro e fica.

Docs:

- `docs/AUTH-SSO.md` §Logout (`:52-57`) e o passo 3 de validação (`:95`): logout local, o outro front-end
  desconecta na próxima gravação do cookie, a consulta à API e o que ela não cobre.
- `docs/ROPA.md` registro 2 (`:59-69`): navegador, sistema e tipo de aparelho, início e último uso de cada
  sessão, na coleção `session`, guardados até a exclusão da conta.
- `docs/SECURITY.md`: rotas novas fora do limite e o motivo (§8).
- `docs/PRE-PRODUCTION.md`: declaração curta do que a lista de sessões não corta no Firebase e da paridade
  de `SESSION_ABSOLUTE_MAX_AGE_DAYS`.

Comentários de código seguem `.claude/rules/code-comments.md`: só onde a regra não é evidente (por exemplo,
por que a autoridade "unknown" deixa gravar, por que `createSeen` omite `revokedAt`), escrita no próprio
comentário, sem apontar para este plano.

### 13.3 Ordem de implementação e commit

| # | Commit | Conteúdo |
|---|---|---|
| 1 | `feat(sdk): account session types and actions` | tipos, ações de conta e de auth, ações de auditoria |
| 2 | `feat(auth): sign out this browser only and accept a session authority` | `types.ts`, `getIdTokenSession`, `session-routes.ts` + testes |
| 3 | `feat(auth): end the client session when the API reports it revoked` | `provider.tsx` (+ teste, se a função pura sair) |
| 4 | `feat(sdk): session authority backed by the API` | `sessionAuthority.ts` + teste (depende do tipo do commit 2) |
| 5 | `feat(api): track and refuse sessions per request` | chave, user agent, mapper, repositório, tracker, `resolve-api-actor.ts`, `.env.example` + testes |
| 6 | `feat(api): session standing and sign-out endpoints` | `/auth/session` + teste |
| 7 | `feat(api): list and revoke account sessions` | `/account/sessions/*`, schema + teste |
| 8 | `feat(api): erase and export account sessions` | erasure, export + testes |
| 9 | `feat(app): consult the API before writing the session cookie` | rotas `/api/auth/*`, `sessionAuthority.ts`, proxy + teste |
| 10 | `feat(app): active sessions panel in account security` | queryKeys, hooks, painel, `AccountSecurityForm.tsx` + testes |
| 11 | `feat(web): consult the API before writing the session cookie` | rotas `/api/auth/*`, `sessionAuthority.ts` |
| 12 | `feat(internationalization): active sessions copy and error codes` | 4 arquivos de tradução + `accountApiErrorCopy.test.ts` |
| 13 | `docs: active sessions and local sign-out` | AUTH-SSO, ROPA, SECURITY, PRE-PRODUCTION |
| 14 | `docs(features): account-active-sessions` | esta pasta |

O teste de cópia (`accountApiErrorCopy.test.ts`) vai no commit 12 porque depende das chaves.

### 13.4 Env e configuração

Nenhuma variável nova obrigatória. `SESSION_ABSOLUTE_MAX_AGE_DAYS` passa a ser lida também pela API, só
para a lista, e só importa se o fork mudou o valor nos front-ends. Vazia vale o padrão
(`session.ts:97-99` já trata `""` como ausente).

## 14. Pré-requisitos manuais de infra

O `/develop` não os satisfaz e o `/test` não reprova por eles.

| Item | Obrigatório? | O quê |
|---|---|---|
| Índice do Firestore | Não | Só consultas de igualdade num campo (`uid`), servidas pelo índice automático |
| Regras do Firestore | Não | A negação total de `firestore.rules` já cobre `session`; nada a publicar |
| `SESSION_ABSOLUTE_MAX_AGE_DAYS` na API | Só se o fork mudou o valor nos front-ends | Mesmo valor na API (Vercel), senão a lista esconde sessões vivas entre o padrão e o valor do fork |
| TTL da coleção `session` | Não configurar | Apagar sessão encerrada a ressuscitaria (P15) |

## 15. `contends_on` previsto

```
packages/auth/server.ts
packages/auth/session-routes.ts
packages/auth/provider.tsx
packages/auth/types.ts
packages/sdk/src/types/account/account.ts
packages/sdk/src/types/audit/audit.ts
packages/sdk/src/actions/account/action.ts
packages/sdk/src/actions/auth/action.ts
apps/api/(shared)/lib/resolve-api-actor.ts
apps/api/(shared)/lib/account-erasure.ts
apps/api/(shared)/lib/account-export.ts
apps/api/.env.example
apps/app/proxy.ts
apps/app/app/api/auth/**
apps/app/shared/lib/queryKeys.ts
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx
apps/web/app/api/auth/**
packages/internationalization/translations/apps/app/pages/common/account.ts
packages/internationalization/translations/packages/shared/utils.ts
packages/internationalization/translations/packages/auth/index.ts
packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts
docs/AUTH-SSO.md, docs/ROPA.md, docs/SECURITY.md, docs/PRE-PRODUCTION.md
```

Mais os arquivos novos da §13.1. O `contends_on` da spec cita `packages/auth/session.ts`, que este plano
não toca. Arquivos de alta disputa com outra feature em paralelo: `packages/sdk/src/types/*`,
`translations/packages/shared/utils.ts` (`apiErrors`) e `queryKeys.ts`, todos com acréscimo no fim de
blocos, o que tende a resolver por merge simples.

## 16. Riscos

- **Mudança de comportamento visível para forks:** "Sair" deixa de derrubar os outros aparelhos. Fica
  documentado em `AUTH-SSO.md`; quem quiser o antigo chama `/account/sessions/revoke` antes do `signOut`.
- **Proxy dependente da API no desvio de rota pública:** com a API lenta, a autoridade espera até 3 s e
  devolve `unknown`, e o desvio acontece como hoje.
- **Latência:** +1 leitura sequencial por requisição autenticada. Medir antes de paralelizar com `getUser`.
- **`clearSessionCookie` dentro do proxy:** depende de `cookies()` aplicar o `Set-Cookie` na resposta do
  proxy; o precedente é o `x-locale`. Fica na lista do `/test`.
- **Precisão de segundo da chave:** dois logins no mesmo segundo viram uma sessão. Raro em uso real; no
  `/test`, espaçar os logins.
- **Arquivos de alta disputa** com outra feature em paralelo (§15).
