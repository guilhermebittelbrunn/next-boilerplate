# Plano — Autenticação e contexto de painel (`apps/app`)

**Slug:** `auth-panel-context` · **Escopo:** `apps/app`, `apps/api`, `packages/{sdk,auth,shared,internationalization}`

---

## Decisões consolidadas (aprovadas pelo usuário)

1. **Contrato de headers**: manter `requestUserId`. Ator = `userId` (validado contra o uid do token) ·
   contexto = `requestUserId`. **Adicionar `userTimezone`** (IANA), preservando a validação anti-spoofing.
2. **`userTimezone`** entra **agora**: enviado em toda request pelo SDK, disponível no `ctx` da API para
   formatação/auditoria de datas.
3. **Fonte de verdade do estado de painel**: **cookie** (o servidor decide) + **localStorage como espelho**
   para pintura instantânea no cliente.
4. **Entrega única** pelo pipeline `/analyze → /develop → /review → /test`.

---

## Etapa 1 — Análise

### 1. Contexto

O `apps/app` separa usuários por nível: **comum** (cadastro público) e **admin**. Admin não tem um perfil
comum próprio — para ver a área comum ele **assume o contexto de um usuário comum existente na base**
(impersonação). O nível efetivo dita rota, layout e o `subjectProfile` que a API usa para escopar dados.

**Regras de negócio a preservar:**

- Admin entra por `/{locale}/admin`; comum por `/{locale}`.
- Usuário comum **nunca** acessa `/admin` (hoje garantido por `requireAdmin`).
- Admin na área comum **obrigatoriamente** tem um usuário comum de contexto (a API rejeita admin em painel
  COMMON sem alvo válido — `AUTH_REQUEST_IMPERSONATION_REQUIRED`).
- **Sem `userId` salvo, seleciona o primeiro da lista** de usuários comuns.
- Ao sair, o estado de painel é limpo.

**Corte de escopo:** não mexer em provider de login (Firebase), SSO cross-app, nem no fluxo de assinatura.

### 2. Defeitos confirmados

**D1 — Split-brain de hidratação (é o bug relatado). Bloqueante.**

O servidor decide pelo **cookie** (síncrono); o cliente decide pelo **store** (localStorage/sessionStorage
async + `/auth/me` async). Eles divergem justamente durante o reload que o próprio fluxo dispara:

| # | Evidência | Efeito |
|---|-----------|--------|
| 1 | `PanelNavbarControls.tsx:129-135` — `setImpersonatedUser` + `window.location.reload()` | contexto JS descartado |
| 2 | `panelStore.ts:66-71` — defaults `profileKind: null`, `panelRequestRole: ADMIN` | estado inicial errado |
| 3 | `panelStore.ts:105-109` — `partialize` **não persiste `profileKind`** | `profileKind` só vem da rede |
| 4 | `AuthRequestPanelContext.tsx:34-41` — `getIdToken()` → `authApi.me()` (2 awaits) | janela de ~1 RTT |
| 5 | `PanelNavbarControls.tsx:181-183` — `if (!canSwitchEnvironment) return null` | **controles desaparecem** |
| 6 | `PanelNavbarControls.tsx:185-188` — fallback para `environmentOptions[0]` (ADMIN) | **"parece que voltou p/ admin"** |
| 7 | `(common)/layout.tsx:28-33` — servidor lê o cookie (`COMMON`) e não redireciona | **páginas comuns continuam** |

**Por que fica preso e não só pisca:** `AuthRequestPanelContext.tsx:53-55` tem `catch {}` silencioso — se
`/auth/me` falhar, `profileKind` fica `null` para sempre e os controles nunca voltam.

**D2 — O default do primeiro usuário dessincroniza servidor e cliente.**
`PanelNavbarControls.tsx:161-179` chama `setImpersonatedUser` num `useEffect` **sem** `router.refresh()`:
cookie e store mudam *depois* do render do servidor. A regra está certa; a aplicação está no lugar errado.

**D3 — `window.location.reload()` como mecanismo de sincronização.**
Descarta bundle, cache do React Query e estado de UI a cada troca de contexto. Com cookie como fonte de
verdade, o correto é `router.refresh()` (revalida só os Server Components).

**D4 — Cookie de painel expira antes da sessão.**
`panelStore.ts:41` `COOKIE_MAX_AGE = 3600` (1 h) contra sessão de 5 dias (`packages/auth/session.ts:29-36`).
Depois de 1 h de aba aberta, o cookie morre → `(common)/layout.tsx` deixa de ver `COMMON` → **admin é
expulso da área comum silenciosamente**.

**D5 — `hydrated` gate não cobre o caso comum.**
`AuthRequestPanelContext.tsx:65` só bloqueia headers de admin; um usuário comum aplica headers com
`panelRequestRole` ainda no default `ADMIN` até o `/auth/me` corrigir.

**D6 — Logout não limpa o cache do React Query.**
`packages/auth/provider.tsx:262-270` faz `signOut` + `syncSessionCookie(null)`. `resetPanel()` acontece por
efeito colateral (`AuthRequestPanelContext.tsx:97-102`), mas **nenhum `queryClient.clear()`** existe no repo
→ dados do usuário anterior podem aparecer para o próximo login na mesma aba.

### 3. Dados (Firestore)

**Nenhuma mudança.** O estado de painel é preferência de cliente (cookie + localStorage); a autorização
real deriva do token + perfil no Firestore. `userTimezone` **não é persistido** nesta tarefa.

### 4. Contrato — `@repo/sdk` / `@repo/auth` / `@repo/shared`

| Arquivo | Mudança |
|---------|---------|
| `packages/auth/types.ts:13-18` | `IAuthContextProps` += `userTimezone: string \| undefined` |
| `packages/shared/utils/helpers/auth-request-headers.ts:2-7` | `AUTH_REQUEST_HEADER` += `USER_TIMEZONE: "x-user-timezone"` |
| `packages/sdk/src/client/base.ts:31-59` | `setAuthRequestContext` envia o header; `clearAuthRequestContext` o remove |
| `apps/api/proxy.ts:6-12` | já usa `Object.values(AUTH_REQUEST_HEADER)` — o novo header entra no CORS automaticamente ✅ |

**Timezone é input não confiável**: validar com `new Intl.DateTimeFormat(undefined, { timeZone: v })` em
`try/catch` e cair no default do servidor se inválido. ⛔ **Nunca** usar em decisão de autorização.

### 5. API (`apps/api`)

- `(shared)/lib/auth-request-context.ts` — ler `x-user-timezone`, validar, expor
  `userTimezone: string | null` em `ResolvedAuthRequestContext` (`:9-15`, `:127-136`). A validação de
  `userId`/`userRole`/`requestUserId` **não muda**.
- **Nenhum `error.code` novo** — timezone inválida degrada para o default, não rejeita a request.
- `GET /users` (`app/(routes)/users/route.ts:13-16`) hoje devolve **admin + comum sem filtro** e o front
  filtra no cliente (`useListUsers.ts:29-34`). Ver "Decisões em aberto".

### 6. Front-end (`apps/app`) — a mudança central

**Eliminar a janela de hidratação passando o estado inicial do servidor para o cliente.**

O cookie já é legível no servidor. Em vez de o cliente descobrir seu contexto por rede, o
`(authenticated)/layout.tsx` resolve tudo e injeta como props:

```
(authenticated)/layout.tsx  (RSC)
  ├── requireSession(locale)                    → sessão + user.type (já disponível)
  ├── cookies(): PANEL_ROLE_COOKIE, IMPERSONATE_UID_COOKIE
  └── <AuthRequestPanelProvider initialPanelState={{ profileKind, panelRequestRole,
                                                    impersonatedFirebaseUid }}>
```

Com isso:

- `profileKind` chega **no primeiro paint** → `PanelNavbarControls` nunca faz `return null` por engano (D1).
- `panelRequestRole` já vem correto → o select não pisca "Admin" (D1).
- `/auth/me` no cliente passa a ser **revalidação**, não fonte primária → o `catch {}` deixa de ser fatal.
- localStorage vira só **espelho** para o label do usuário de contexto (pintura instantânea do select antes
  da lista carregar) — não é mais o caminho crítico.

**Demais mudanças:**

| Item | Ação |
|------|------|
| `panelStore.ts:102` | `sessionStorage` → **`localStorage`** (decisão 3) |
| `panelStore.ts:105-109` | `partialize` inclui `profileKind` |
| `panelStore.ts:41` | `COOKIE_MAX_AGE` alinhado à duração da sessão (D4) |
| `panelStore.ts` | store inicializável a partir de `initialPanelState` (sem `create` no módulo com default cego) |
| `PanelNavbarControls.tsx:129-135` | `window.location.reload()` → `router.refresh()` (D3) |
| `PanelNavbarControls.tsx:161-179` | default do primeiro usuário aplicado **junto** do `router.refresh()` (D2) |
| `PanelNavbarControls.tsx:40-44` | extrair a decisão de visibilidade para função **pura** e testável |
| `AuthRequestPanelContext.tsx:53-55` | `catch` deixa de ser silencioso: loga e mantém o estado do servidor |
| `packages/auth/provider.tsx:262-270` | logout limpa o cache do React Query (D6) |
| `apps/app/lib/server/resolveSessionToken.ts` | **código morto** (zero callers) — remover |

**Regra invariante a documentar**: a UI **nunca** é a proteção. Toda decisão é reespelhada em
`requireSession` / `requireAdmin` / guard da API. O estado de painel só escolhe *qual* contexto válido usar
— nunca concede acesso.

### 7. i18n

Sem chave nova de UI. Sem `error.code` novo → `apiErrors` intocado. (Se o logout ganhar toast próprio,
passa pela `/i18n-sync`.)

### 8. Testes (Vitest)

Cobertura atual de auth: apenas `deriveAuthRequestProps` (4 casos) e `panelStore` (4 casos rasos, e o
`beforeEach` nem reseta `impersonatedLabel`). **Nada** cobre cookie, persist, servidor, proxy ou guards.

| # | Alvo | Cenários |
|---|------|----------|
| T1 | `deriveAuthRequestProps` | + `userTimezone`; `profileKind: null`; `impersonatedUid: ""` (falsy → admin); asserção de `requestUserId` no caso 4 |
| T2 | `panelStore` | espelho de cookie (nome, `max-age`, `samesite`, delete com `max-age=0`); `partialize` com `profileKind`; `impersonatedLabel` = `null` quando `uid` é `null`; `resetPanel` limpa **tudo** |
| T3 | **regressão do D1** | store inicializado com `initialPanelState` (COMMON + uid) → a função pura de visibilidade retorna "mostrar controles" **antes** de qualquer `/auth/me` |
| T4 | `PanelNavbarControls` | admin+COMMON renderiza os dois selects; troca de usuário chama `router.refresh()` (não `reload`); default = primeiro da lista; comum não vê controle nenhum |
| T5 | `isImpersonating()` | combinações dos 2 cookies (mockando `next/headers`) |
| T6 | `resolveAuthRequestContext` | os 6 códigos 403 + timezone válida/inválida/ausente |
| T7 | `postAuthRedirectTarget` | guard de open-redirect (hoje **sem teste**, sendo controle de segurança) |
| T8 | `requireAdmin` / `requireSession` | redireciono de comum→`/{locale}` e anônimo→sign-in |

Mocks nas bordas (`@/shared/lib/client`, `@repo/auth/server`, `next/headers`, `next/navigation`), com
`vi.hoisted` + `vi.mock` antes do `await import`. Arquivos em `apps/app/__tests__/` e `apps/api/__tests__/`.

### 9. Validação visual (`agent-browser`, comandos em sequência)

Fluxos: login admin → `/admin` · admin → contexto comum (primeiro usuário) · **troca para um segundo
usuário comum** (o bug) · volta para admin · login comum → `/` · comum tentando `/admin` → redirect ·
logout e novo login na mesma aba. Cada um em **light + dark + mobile**, com screenshots em
`docs/features/auth-panel-context/test/e2e/`.

### 10. Segurança

- `userId` continua validado contra o uid do token (anti-spoofing preservado — decisão 1).
- Cookies de painel **não** são `httpOnly` (o cliente precisa escrevê-los) — aceitável porque são
  *preferência*, nunca autorização: a API revalida o alvo em `validateAdminProfile`.
- `userTimezone` nunca entra em decisão de acesso.

---

## Etapa 2 — Blueprint

### Ordem de implementação (= ordem dos commits)

1. **`packages/shared`** — `AUTH_REQUEST_HEADER.USER_TIMEZONE`.
2. **`packages/auth`** — `IAuthContextProps.userTimezone`; logout limpando o cache.
3. **`packages/sdk`** — `setAuthRequestContext`/`clearAuthRequestContext` com o novo header.
4. **`apps/api`** — `resolveAuthRequestContext` lê/valida/expõe `userTimezone` (+ testes T6).
5. **`apps/app`** — `initialPanelState` do servidor → provider → store; localStorage; `router.refresh()`;
   visibilidade pura; remoção do código morto (+ testes T1–T5, T7, T8).
6. **`docs/`** — `docs/AUTH-PANEL.md` (a documentação central que você pediu).
7. **`docs/features/auth-panel-context/`** — artefatos do fluxo, commit `docs(features): auth-panel-context`.

### Contrato final dos headers

| Header | Valor | Validação na API |
|--------|-------|------------------|
| `Authorization` | `Bearer <session cookie \| ID token>` | `resolveApiActor` → ator |
| `x-user-id` | uid do **ator** | deve bater com o uid do token |
| `x-request-user-id` | uid do **usuário de contexto** | admin+COMMON: ≠ ator, existe e é COMMON |
| `x-user-role` | papel real do ator | deve bater com o perfil no Firestore |
| `x-request-role` | painel efetivo | comum: sempre COMMON |
| `x-user-timezone` | IANA (`Intl...timeZone`) | validada; inválida → default do servidor |

### Documentação a criar — `docs/AUTH-PANEL.md`

Fonte única da regra de negócio: matriz papel × painel × rota, o contrato de headers acima, a tabela de
`error.code` de auth, a cadeia de gates server-side (proxy → `requireSession` → `requireAdmin` → guard da
API), o ciclo de vida do estado de painel (cookie × localStorage × store) e o que o logout limpa.
Referenciada em `docs/GLOSSARY.md` e `apps/app/CLAUDE.md`.

---

## Decisões resolvidas (2ª rodada)

| # | Questão | Decisão |
|---|---------|---------|
| A1 | Filtro em `GET /users` | **Aplicar, com enforcement no servidor.** A listagem é derivada do **contexto da request**, não de confiança no query param: `requestRole === ADMIN` → todos os usuários; `requestRole === COMMON` (admin em impersonação) → **somente comuns**. O `?type=` é aceito como refinamento, mas em contexto comum o servidor **força** `common` — perfil admin nunca vaza para acesso indevido. Corrigir também o N+1 sem `try/catch` (`user.repository.ts:36-48`): um usuário deletado no Auth degrada aquela linha, não quebra a lista. |
| A2 | Duplo hop no login de admin | **Corrigir** — o proxy passa a resolver o destino pelo papel. |
| A3 | `postAuthRedirectTarget` duplicado + 3 resolvedores de pós-login | **Consolidar** num só (o do pacote `@repo/auth`). |
| A4 | Header legado `x-role` | Manter por compatibilidade; remover em follow-up dedicado. |
| A5 | Placeholders `"#"` fora do i18n em `(common)/routes.tsx:41-81` | Fora de escopo (não é auth). |

> **Latitude aprovada pelo usuário**: a aplicação não roda em produção, então melhorias de experiência,
> integridade e qualidade de código no caminho do que já está sendo tocado podem ser aplicadas — sem
> preocupação com migração de dados ou compatibilidade retroativa.
