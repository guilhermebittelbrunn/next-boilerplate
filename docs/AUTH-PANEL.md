# Autenticação, papéis e contexto de painel

**Fonte única** da regra de negócio de acesso do `apps/app`: quem entra onde, como o admin assume o
contexto de um usuário comum, e o que a API valida. Visão de sistema em
[`ARCHITECTURE.md`](ARCHITECTURE.md) · sessão compartilhada entre apps em [`AUTH-SSO.md`](AUTH-SSO.md) ·
vocabulário em [`GLOSSARY.md`](GLOSSARY.md).

## 1. Papéis

| Papel | Origem | Onde opera |
|-------|--------|-----------|
| **comum** (`UserType.COMMON`) | cadastro público | `/{locale}/…` — área comum |
| **admin** (`UserType.ADMIN`) | criado por outro admin | `/{locale}/admin/…` — área administrativa |

O papel vive no documento `user` do Firestore (campo `type`), **não** no token. O token só prova
*identidade*; o papel é sempre lido do perfil persistido.

**Um admin não tem um perfil comum próprio.** Para ver a área comum ele **assume o contexto de um usuário
comum que existe na base** — é impersonação, não um segundo perfil.

## 2. Matriz papel × painel × rota

| Situação | Painel efetivo | `/{locale}` (comum) | `/{locale}/admin` |
|----------|----------------|---------------------|-------------------|
| anônimo | — | → `sign-in` | → `sign-in` |
| comum | comum | ✅ | → `/{locale}` |
| admin, painel admin | admin | → `/{locale}/admin` | ✅ |
| admin, painel comum **com** alvo | comum (impersonando) | ✅ (dados do alvo) | ✅ |
| admin, painel comum **sem** alvo | admin (degrada) | → `/{locale}/admin` | ✅ |

A última linha é uma invariante importante: **painel comum sem alvo não é impersonação.** A API rejeitaria
toda request (`AUTH_REQUEST_IMPERSONATION_REQUIRED`), então o estado degrada para o painel admin e o
layout redireciona — em vez de deixar o usuário numa área que não funciona.

## 3. Cadeia de gates (todos no servidor)

```
proxy.ts                  default-deny: tudo exige sessão, exceto /sign-in e /sign-up
  └── (authenticated)/layout.tsx     requireSession()      → sem sessão: /sign-in
        ├── (common)/layout.tsx      admin não-impersonando → /{locale}/admin
        └── (admin)/admin/layout.tsx requireAdmin()        → não-admin: /{locale}
              └── guard da API       requireAdminApi / requireCommonPanelApi
```

- O **proxy** é *default-deny*: uma rota autenticada nova já nasce protegida, sem allowlist para lembrar.
  Caminho terminado em extensão de arquivo passa direto (`isStaticAssetPath`), senão um arquivo de
  `public/` seria redirecionado para o sign-in. A checagem fica no corpo do proxy, não no `matcher`: o
  Next compila matchers com path-to-regexp, onde um lookahead ancorado não se comporta como regex puro.
- **Admin impersonando não escreve na área admin.** O guard `requireAdminApi` rejeita
  `requestRole === common` em métodos **mutantes** (`AUTH_REQUEST_PANEL_FORBIDDEN`) e o
  `(admin)/admin/layout.tsx` espelha isso redirecionando para a área comum. Sem isso o admin poderia
  criar/editar/apagar usuários declarando painel comum, mesmo com a leitura já escopada.
  ⚠️ **Leituras seguem abertas de propósito**: o próprio seletor de impersonação é alimentado por
  `GET /users`. Fechar a leitura tranca o admin no primeiro usuário que ele acessou, sem volta — e a
  listagem já vem restrita a usuários comuns pelo contexto da request, então nada de admin vaza.
- **UI oculta nunca é proteção.** Cada camada acima é redundante de propósito; a última palavra é sempre
  o guard da API, que revalida papel e alvo a cada request.
- O proxy **não** conhece o papel (ele está no Firestore, não no cookie de sessão): resolver isso ali
  custaria uma chamada de API no caminho quente. Ele manda todo mundo para `/{locale}` e o layout comum
  encaminha admins para `/admin` — um hop server-side, sem flash.

## 4. Estado de painel: cookie manda, localStorage espelha

| Onde | O quê | Papel |
|------|-------|-------|
| **cookie** `bp:panel-request-role` | `admin` \| `common` | **autoridade** — Server Components leem |
| **cookie** `bp:impersonate-firebase-uid` | uid do alvo | **autoridade** |
| **localStorage** `bp:panel-state` | os dois acima + `impersonatedLabel` | espelho: guarda o nome de exibição que o cookie não carrega |

Nenhum dos dois concede acesso — são **preferências**. O alvo é revalidado no servidor a cada request.
O snapshot do servidor sempre vence: a cada carga o espelho é reescrito a partir dele, nunca o contrário.

**Por que o cookie é a autoridade:** o servidor precisa decidir rota e prefetch **antes** do primeiro
paint. `apps/app/lib/server/panelSnapshot.ts` resolve o snapshot (sessão + cookies) e o
`app/layout.tsx` injeta no cliente via `initialPanel`. O store zustand é criado **sincronamente, durante
o render**, já com o snapshot, antes de qualquer filho montar.

> ⛔ **O store é criado por request, nunca é singleton de módulo.** `createPanelStore(snapshot)` roda num
> `useState` dentro do provider, e o acesso é por context (`usePanelState`). Um singleton de módulo seria
> lido enquanto o servidor renderiza — dois visitantes concorrentes no mesmo processo Node poderiam receber
> HTML com o painel um do outro. Pela mesma razão os headers do SDK (`apiClient`, também singleton de
> processo) só são aplicados no browser: Server Components falam com a API pelo cliente por-request de
> `lib/server/apiServerClient.ts`.

> ⚠️ **Não** reintroduza descoberta de contexto por rede no cliente (um `/auth/me` para saber o próprio
> papel). Era exatamente isso que fazia os controles de painel desaparecerem no meio de um reload: o
> servidor já renderizava a área comum pelo cookie enquanto o cliente ainda tinha `profileKind: null`.
> Ver o teste de regressão em `apps/app/__tests__/panelState.test.ts`.

**Duração do cookie**: `PANEL_COOKIE_MAX_AGE_SECONDS` (14 dias) **nunca** pode ser menor que a sessão —
senão o admin é expulso da área comum silenciosamente quando o cookie morre antes do login.

**Troca de contexto** usa `router.refresh()`, não `window.location.reload()`: os cookies já estão
atualizados, então só os Server Components precisam re-rodar. O bundle, o cache do React Query e o estado
de UI sobrevivem.

**Logout** limpa tudo: `resetPanel()` apaga os dois cookies e o localStorage, e o `signOut` do
`@repo/auth` chama `queryClient.clear()` para o cache não vazar para o próximo usuário na mesma aba.

## 5. Regras de negócio da impersonação

1. O admin **precisa** de um alvo para entrar no painel comum. Sem nenhum usuário comum na base, o modo é
   inalcançável.
2. **Sem alvo salvo, usa o primeiro da lista.** O seletor nunca fica vazio
   (`PanelNavbarControls` → `resolveImpersonationTarget`).
3. Escolher um alvo **é** a intenção de entrar no painel comum — as duas coisas mudam juntas, senão a
   normalização descartaria o alvo.
4. Voltar para o painel admin **limpa** o alvo.
5. Um usuário comum **nunca** tem painel ou alvo: qualquer tentativa é normalizada de volta.
6. Enquanto impersonando, o **prefetch RSC é desligado** (`isImpersonating()`): o cliente do servidor só
   carrega o Bearer token, então a API resolveria o admin como ele mesmo e a tela piscaria o usuário
   errado. O cliente refaz a busca com os headers corretos.
7. Trocar para o painel comum **sem alvo disponível** é impossível, então o seletor de ambiente fica
   **desabilitado** enquanto a lista carrega ou quando não há nenhum usuário comum — em vez de o clique
   virar um no-op silencioso.
8. **Trocar de sujeito descarta o cache de queries** (`queryClient.clear()` + `router.refresh()`). Todo
   dado em cache pertence ao sujeito que estava ativo quando foi buscado; sem isso as linhas do usuário
   anterior permanecem na tela até um refresh manual da tabela. Vale para trocar o usuário de contexto
   **e** para entrar/sair do painel comum.

### Um dono só para os headers de auth

`AuthRequestPanelProvider` é a **única** autoridade sobre os headers do `apiClient` — token **e** `x-*`,
escritos juntos na mesma passada. Nada mais pode escrever ou limpar.

> ⛔ **Não divida essa propriedade.** O `ClientLayout` já foi dono do token e, no branch "token ainda não
> resolvido", chamava `clearAuthRequestContext()`. Como o React roda efeito de filho **antes** do de pai,
> aquela limpeza apagava os `x-*` que o provider tinha acabado de aplicar, e nada os reaplicava quando o
> token chegava: toda request de impersonação saía sem sujeito e a API respondia
> **403 `COMMON_PANEL_FORBIDDEN`**. Travado por `apps/app/__tests__/authHeaderOwnership.test.tsx`, que
> renderiza a composição real.

Limpeza acontece **só** quando o servidor reporta ausência de sessão (`actorUid === null`) — nunca porque
o token está em trânsito.

### Hooks de dados: `useAuthorizedQuery`, não `useQuery`

Uma request que sai antes do token volta **401**, e o React Query **cacheia a falha** — foi assim que o
seletor de impersonação ficou permanentemente vazio e, por consequência, permanentemente desabilitado.

Todo hook que lê dado autenticado usa **`useAuthorizedQuery`** (`shared/hooks/useAuthorizedQuery.ts`), que
segura a query até `sdkAuthorized`. Gatear um hook na mão não basta: quando só o `useListUsers` tinha o
gate, o `/entities` continuava disparando 401 em carga fria.

A `queryKey` também tem de descrever o escopo que a API vai realmente devolver: em painel comum a listagem
é forçada a `common`, então a chave também.

### Trocar de sujeito: `resetQueries`, e uma navegação só

- **`queryClient.resetQueries()`**, não `clear()`. Os dois descartam o dado do sujeito anterior, mas só o
  primeiro **refaz** as queries que estão na tela; com `clear()` a tabela ficava vazia até o usuário
  clicar em atualizar.
- **Uma navegação por troca.** `router.refresh()` e `router.push()` no mesmo tick se cancelam e a rota não
  muda: trocar de painel faz `push` (a rota muda), trocar de usuário faz `refresh` (a rota é a mesma).
- **Não escreva no store de dentro de uma subscription dele.** `applyAuthHeaders` roda como subscriber;
  escrever estado ali re-entra na notificação que está sendo tratada e as atualizações são engolidas — era
  o que impedia o refetch depois da troca.

## 6. Contrato de headers (SDK → API)

| Header | Valor | Validação na API |
|--------|-------|------------------|
| `Authorization` | `Bearer <session cookie \| ID token>` | `resolveApiActor` → o **ator** |
| `x-user-id` | uid do **ator** | ⚠️ tem de bater com o uid do token → `AUTH_REQUEST_USER_ID_MISMATCH` |
| `x-request-user-id` | uid do **sujeito** (alvo) | admin+comum: ≠ ator, existe e é comum |
| `x-user-role` | papel real do ator | tem de bater com o perfil no Firestore |
| `x-request-role` | painel efetivo | comum: sempre `common` |
| `x-user-timezone` | timezone IANA do browser | validada; inválida → `null`. **Nunca** decide acesso |
| `x-role` | legado, espelha `x-request-role` | fallback de `x-request-role` |

Definições: `AUTH_REQUEST_HEADER` (`packages/shared/utils/helpers/auth-request-headers.ts`) ·
`IAuthContextProps` (`packages/auth/types.ts`) · escrita em `packages/sdk/src/client/base.ts` · leitura em
`apps/api/(shared)/lib/auth-request-context.ts`. Header novo precisa entrar no `allowHeaders` do CORS
(`apps/api/proxy.ts` — que já itera `AUTH_REQUEST_HEADER`).

**`x-user-id` é o cross-check anti-spoofing**: o ator é declarado *e* provado. Não remova.

### Derivação (`deriveAuthRequestProps`)

| Estado | `userId` | `requestUserId` | `userRole` | `requestRole` |
|--------|----------|-----------------|------------|---------------|
| comum | uid | uid | `common` | `common` |
| admin, painel admin | uid | uid | `admin` | `admin` |
| admin impersonando | uid do admin | **uid do alvo** | `admin` | `common` |

## 7. Códigos de erro de auth

| `error.code` | HTTP | Quando |
|--------------|------|--------|
| `AUTH_INVALID_TOKEN` | 401 | token/sessão inválidos ou expirados |
| `ADMIN_FORBIDDEN` | 403 | rota admin com perfil não-admin |
| `COMMON_PANEL_FORBIDDEN` | 403 | sem perfil, ou sujeito resolvido não é comum |
| `AUTH_REQUEST_USER_ID_MISMATCH` | 403 | `x-user-id` ≠ uid do token |
| `AUTH_REQUEST_USER_ROLE_MISMATCH` | 403 | `x-user-role` ≠ papel no Firestore |
| `AUTH_REQUEST_PANEL_FORBIDDEN` | 403 | painel incoerente com o perfil |
| `AUTH_REQUEST_IMPERSONATION_FORBIDDEN` | 403 | comum tentando agir como outro |
| `AUTH_REQUEST_ADMIN_TARGET_INVALID` | 403 | painel admin com alvo ≠ ele mesmo |
| `AUTH_REQUEST_IMPERSONATION_REQUIRED` | 403 | admin no painel comum sem alvo |
| `AUTH_REQUEST_IMPERSONATION_TARGET_INVALID` | 403 | alvo inexistente ou não-comum |

Todo código tem copy nos 3 idiomas em `translations/packages/shared/utils.ts` (`apiErrors`) — o teste de
paridade falha se faltar. Use `/i18n-sync`.

## 8. Listagem de usuários (o que alimenta o seletor)

`GET /users` é `requireAdminApi`, e o escopo vem do **contexto da request**, não de confiança no client:

- `requestRole === admin` → todos os usuários; `?type=` refina;
- `requestRole === common` (admin impersonando) → **somente comuns**, ignorando o `?type=`.

Perfil admin nunca vaza para um acesso em contexto comum. No cliente, `type` faz parte da `queryKey`
(`queryKeys.users.list(type)`) porque os dois escopos são dados diferentes; mutações invalidam o prefixo
`queryKeys.users.all`.

Um perfil cujo usuário do Firebase Auth foi apagado por fora é **omitido** da listagem, em vez de derrubar
a resposta inteira.

## 9. Onde mexer

| Arquivo | Responsabilidade |
|---------|------------------|
| `apps/app/shared/lib/panelState.ts` | **lógica pura**: normalização, visibilidade, espelhos |
| `apps/app/shared/stores/panelStore.ts` | store zustand, semeado pelo servidor |
| `apps/app/lib/server/panelSnapshot.ts` | resolução server-side (`resolvePanelSnapshot`, `isImpersonating`) |
| `apps/app/shared/lib/authRequestHeaders.ts` | derivação dos headers |
| `apps/app/shared/providers/AuthRequestPanelContext.tsx` | aplica headers + ações de painel |
| `apps/app/shared/components/ui/PanelNavbarControls.tsx` | UI do seletor |
| `apps/api/app/(guards)/{admin,common-panel}.ts` | guards |
| `apps/api/(shared)/lib/auth-request-context.ts` | validação dos headers |

Testes: `apps/app/__tests__/panel*.test.ts(x)`, `deriveAuthRequestProps.test.ts`,
`postAuthRedirectTarget.test.ts`, `serverGuards.test.ts` · `apps/api/__tests__/authRequestContext.test.ts`.

**Ao mudar qualquer regra desta página, atualize esta página.** É o que impede a regra de negócio de
existir só na cabeça de quem escreveu o código.
