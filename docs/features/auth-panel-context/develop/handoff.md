# Handoff — `/develop` · auth-panel-context

## Blueprint → arquivos

### Contrato (`packages/`)
| Item | Arquivo |
|------|---------|
| `USER_TIMEZONE: "x-user-timezone"` + `isValidIanaTimeZone` + `resolveBrowserTimeZone` | `packages/shared/utils/helpers/auth-request-headers.ts` |
| `IAuthContextProps.userTimezone` (+ doc de cada campo) | `packages/auth/types.ts` |
| envia/limpa o header novo; `clearAuthRequestContext` itera `AUTH_REQUEST_HEADER`; `removeHeader` passou a `delete` a chave em vez de setar `undefined` | `packages/sdk/src/client/base.ts` |
| `list(params?: { type })` → `?type=` | `packages/sdk/src/actions/user/user/action.ts` |
| `postAuthRedirectTarget` (guard de open-redirect) extraído para o pacote + export `./redirect` | `packages/auth/redirect.ts`, `packages/auth/package.json` |
| logout faz `queryClient.clear()`; usa o `postAuthRedirectTarget` do pacote (cópia local removida) | `packages/auth/provider.tsx` |

### API (`apps/api`)
| Item | Arquivo |
|------|---------|
| lê/valida/expõe `userTimezone` (inválida → `null`, nunca rejeita) | `(shared)/lib/auth-request-context.ts` |
| `GET /users` escopa pelo **contexto**: `requestRole === COMMON` força `type=common` ignorando o query param | `app/(routes)/users/route.ts` |
| `list({ type })` + perfil sem conta no Auth é omitido em vez de derrubar a listagem | `(shared)/repositories/user.repository.ts` |

### App (`apps/app`)
| Item | Arquivo |
|------|---------|
| **novo** — lógica pura: `normalizePanelSnapshot`, `isImpersonatingSnapshot`, `shouldRenderPanelControls`, `shouldRenderImpersonationPicker`, espelhos de cookie/localStorage, `PANEL_COOKIE_MAX_AGE_SECONDS` | `shared/lib/panelState.ts` |
| **novo** — `resolvePanelSnapshot` (cache por request) + `isImpersonating` | `lib/server/panelSnapshot.ts` |
| store sem `persist`: semeado por `initializeFromServer`, localStorage como espelho, `initialized` gate | `shared/stores/panelStore.ts` |
| recebe `initialPanel`, aplica headers **no render**, sem `/auth/me` no cliente; `setPanelEnvironment(role, target?)`; `setImpersonatedUser` faz `router.refresh()` | `shared/providers/AuthRequestPanelContext.tsx` |
| `deriveAuthRequestProps` recebe `timeZone`; `mapUserTypeToProfileKind` removido | `shared/lib/authRequestHeaders.ts` |
| visibilidade via funções puras; sem `window.location.reload()`; seletor de ambiente desabilitado quando não há alvo possível | `shared/components/ui/PanelNavbarControls.tsx` |
| `enabled: enabled && initialized`; escopo efetivo espelha a regra do servidor | `shared/hooks/useListUsers.ts` |
| `list(type?)` na chave | `shared/lib/queryKeys.ts` |
| resolve snapshot + uid e injeta `initialPanel` | `app/layout.tsx`, `app/[locale]/clientLayout.tsx` |
| usa o snapshot (admin não-impersonando → `/admin`) | `app/[locale]/(authenticated)/(common)/layout.tsx` |
| default-deny: só `/sign-in` e `/sign-up` são públicas; uma leitura de sessão serve os dois branches | `proxy.ts` |
| invalida o prefixo `queryKeys.users.all` (o `type` move o usuário entre escopos) | `admin/(pages)/users/(hooks)/useUserCrud.tsx` |
| **removidos**: `shared/lib/authRedirect.ts` (duplicado), `lib/server/resolveSessionToken.ts` (morto), `lib/server/prefetch.ts` (barrel) | — |

### Docs
`docs/AUTH-PANEL.md` (novo, fonte única) · ponteiros em `apps/app/CLAUDE.md`, `docs/GLOSSARY.md`, `README.md` · link `provider.ts` → `provider.tsx` corrigido em `docs/AUTH-SSO.md`.

## Defeitos do plano → resolução

| # | Como foi resolvido |
|---|--------------------|
| D1 split-brain | snapshot do servidor injetado e aplicado **sincronamente no render**; `profileKind` não depende mais de rede |
| D2 default do 1º usuário dessincronizado | `setImpersonatedUser` agora faz `router.refresh()`, então servidor e cliente convergem |
| D3 `reload()` como sincronização | `router.refresh()` |
| D4 cookie de 1 h | `PANEL_COOKIE_MAX_AGE_SECONDS` = 14 dias (teto do session cookie do Firebase), com teste |
| D5 headers de comum com default ADMIN | `normalizePanelSnapshot` força o painel comum para perfil comum |
| D6 logout não limpava cache | `queryClient.clear()` no `signOut` |

## Desvios em relação ao plano

- **A2 (duplo hop no login) não foi "corrigido" como planejado.** Reavaliei: o papel vive no Firestore, não
  no cookie de sessão, então resolvê-lo no proxy custaria uma chamada de API em **toda** navegação — pior
  que o redirect que economiza. Mantido o hop (server-side, sem flash) e documentado o porquê no código e
  em `AUTH-PANEL.md`. Em troca, o proxy ganhou **default-deny**, que é um ganho real de integridade:
  `/entities`, `/entities/create` e `/playground` não eram protegidas por ele antes.
- **`zustand/persist` foi removido** em vez de trocado para localStorage. A rehidratação assíncrona do
  middleware era a própria origem da corrida; com o servidor semeando o estado ela deixou de ter função.
  O localStorage continua (leitura/escrita explícitas) atendendo ao requisito de persistir acesso e modo.

## Bugs encontrados durante a implementação

1. **Introduzido por mim, pego por teste**: escolher o alvo ainda no painel admin fazia a normalização
   descartá-lo, o que quebraria a troca admin→comum. Semântica corrigida: escolher um alvo **é** a intenção
   de entrar no painel comum.
2. **Dead-end silencioso** (achado na revisão dos testes): sem alvo disponível, o clique em "painel do
   usuário" não fazia nada — mesma classe de sintoma do D1. Seletor agora desabilitado enquanto carrega ou
   sem usuários comuns.
3. **Sessão sem `type`** resolvia como anônima e o SDK enviava requests **sem** headers de contexto. Agora
   é least-privilege: sessão sem tipo reconhecido = comum.
4. **Chave de cache** não descrevia o escopo forçado pelo servidor. Corrigido, mais `enabled: initialized`
   para nenhuma query sair antes dos headers.

## Validação

| Checagem | Resultado |
|----------|-----------|
| `pnpm --filter {api,app,web} typecheck` | OK nos três |
| `pnpm --filter app test` | **81 passando** (11 arquivos) |
| `pnpm --filter api test` | **16 passando** (2 arquivos) |
| `pnpm --filter @repo/internationalization test` | 2 passando (paridade dos 3 idiomas) |
| Biome no escopo tocado | limpo, exceto `useFilenamingConvention` (kebab-case) que **toda** a árvore já viola — conflita com a convenção camelCase do `apps/app/CLAUDE.md` |
| Gates anônimos (curl, app no ar) | `/`, `/admin`, `/admin/users`, `/entities`, `/entities/create`, `/playground` → `sign-in?redirect=…`; `/sign-in`, `/sign-up` → 200 |

### Cobertura de teste nova

`panelState` (21) · `panelStore` (9) · `deriveAuthRequestProps` (6) · `postAuthRedirectTarget` (8, guard de
open-redirect que não tinha nenhum) · `panelNavbarControls` (8) · `panelSnapshot` (6) · `serverGuards` (6) ·
`useListUsers` (6) · `authRequestContext` na api (15: os 7 `error.code`, 4 caminhos felizes, 3 de timezone).

O teste de regressão do bug relatado está em `panelState.test.ts` → "panel control visibility (server
snapshot only)": a visibilidade tem de ser decidível **sem nenhum estado assíncrono**.

## Pendente

- ⚠️ **Validação visual não executada** — falta credencial de admin de DEV. Os servidores sobem
  (API 3002, app 3000) e o `agent-browser` 0.27.0 está instalado; os gates anônimos foram validados por
  curl, mas o fluxo de impersonação (o bug relatado) exige login. Roteiro pronto na seção 9 do plano.
- Branch legado inalcançável em `validateAdminProfile` (`auth-request-context.ts`) — cosmético, deixado.
- Header legado `x-role` mantido por compatibilidade (A4), remoção em follow-up.
- N+1 do Admin SDK em `userRepository.list()` mitigado (não derruba mais a lista) mas não eliminado.
