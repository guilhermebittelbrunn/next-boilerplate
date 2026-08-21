# Review — `/review` · auth-panel-context

Revisão do working tree completo (dois corpos de trabalho independentes: ferramental de IA/Conductor e a
feature `auth-panel-context`).

## Branch

| | |
|---|---|
| **Atual** | `feat/initial-files-v1` (não protegida) |
| **Decisão** | **reutilizar** — recomendação; confirmação no `/review` |
| **Base** | já existente; os 5 commits mais recentes (`SSO`, `SEO i18n`, `skills`, `RSC prefetch`, `allowlist`) são exatamente esse tipo de build-out do boilerplate |
| **Alternativa** | dividir em `claude/chore/task-pipeline` + `feat/auth-panel-context` a partir de `main` — descartada porque órfã o trabalho já commitado que estas docs descrevem (o commit de SSO ↔ `AUTH-SSO.md`) |

O nome não segue `<project>/<type>/<title>`, mas é uma branch de acumulação pré-existente com histórico
relacionado. Trocar agora custa mais do que ganha.

## Achados

| Sev | Local | Problema | Ação |
|-----|-------|----------|------|
| 🔴 | `apps/app/shared/providers/AuthRequestPanelContext.tsx:44` | O efeito colateral em render roda **também no SSR**, mutando dois singletons de processo: `apiClient` e `usePanelStore`. `apps/app/CLAUDE.md`/`docs/review-checklist.md:73` e o comentário de `lib/server/apiServerClient.ts` proíbem explicitamente reusar o `apiClient` no servidor ("headers de auth vazam entre requests concorrentes") | **corrigido** o `apiClient` (guard `typeof window`); o store ficou em decisão aberta |
| 🟡 | `apps/api/(shared)/repositories/user.repository.ts:52-60` | `mergeWithAuthUser` engole **todo** erro do Admin SDK, não só "conta apagada". Falha transitória/rate-limit → usuários desaparecem da listagem admin sem sinal | decisão aberta (muda comportamento em falha) |
| 🟡 | `apps/api/app/(guards)/admin.ts` | `requireAdminApi` ignora `requestRole`. O `GET /users` passou a escopar **leitura** pelo painel, mas `POST`/`PUT`/`DELETE /users` continuam liberados com `x-request-role: common` | decisão aberta |
| 🟡 | `apps/app/shared/hooks/useListUsers.ts:34` | O gate `initialized` existe **só** aqui; `useListEntities`/`useFindEntityById` disparam sem ele. E com `actorUid === null` o gate não vale (o render marca `initialized: true` antes do efeito resetar) | decisão aberta |
| 🟡 | `apps/app/proxy.ts:85-93` | Autenticado que cai em `/sign-in?redirect=…` é jogado em `/{locale}` com `search = ""` — o deep link é descartado | decisão aberta |
| 🟢 | `apps/app/shared/lib/panelState.ts:8-13` | Comentário prometia "recuperação de cookie perdido" via localStorage; nenhum código faz isso (`initializeFromServer` sobrescreve o espelho) | **corrigido** (comentário + `AUTH-PANEL.md` §4) |
| 🟢 | `admin/(pages)/users/(pages)/(home)/page.tsx:14` | Comentário dizia "admin-only (never impersonated)" na linha acima do guard que trata impersonação — e a rota **é** alcançável impersonando (voltar no histórico) | **corrigido** (comentário) |
| 🟢 | `apps/app/__tests__/panelState.test.ts:22,222` | 2 erros novos de Biome (`noDocumentCookie`, `noMagicNumbers`) | **corrigido** |
| 🟢 | `docs/review-checklist.md:90` | O checklist novo exigia `window.location.reload()` na impersonação — exatamente o que a feature substituiu por `router.refresh()`. Contradição interna ao próprio diff | **corrigido** |
| 🟢 | `apps/app/proxy.ts:25` | `apps/app` não tem `public/`, então nada quebrou; mas qualquer asset colocado lá passa a ser redirecionado para `sign-in` para anônimo (matcher só exclui `_next/static`, `_next/image`, `favicon.ico`, `api`) | apontado |
| 🟢 | `apps/app/proxy.ts:78-83` | `not-found` ficou inalcançável para anônimo (`/pt-br/rota-inexistente` → `sign-in`) | apontado |
| 🟢 | `apps/api/(shared)/repositories/user.repository.ts:35-46` | Filtro de `type` em memória depois de `findAll()`; `Promise.all` sobre todos os perfis = concorrência ilimitada contra o Admin SDK. `where("type","==",…)` + `getUsers()` (lote de 100) resolveriam o N+1 | follow-up |
| 🟢 | 2 abas | O `useState` inicializador roda 1× por mount; se outra aba trocar o painel, uma navegação client-side renderiza conteúdo do servidor com o alvo novo e store com o antigo | apontado |

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `apps/app/shared/providers/AuthRequestPanelContext.tsx` | `applyPanelHeaders` retorna cedo quando `typeof window === "undefined"`; o ternário de `timeZone` virou `resolveBrowserTimeZone()` direto; docstring menciona idempotência sob render descartado/duplicado |
| `apps/app/shared/lib/panelState.ts` | Docstring do espelho descreve o que o código faz (guarda o label; o snapshot do servidor sempre vence) |
| `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/page.tsx` | Comentário do guard de prefetch reescrito com o motivo real |
| `apps/app/__tests__/panelState.test.ts` | `FOURTEEN_DAYS_IN_SECONDS` extraído; `biome-ignore` justificado no `document.cookie` |
| `docs/AUTH-PANEL.md` | §4: papel do localStorage corrigido + "o snapshot do servidor sempre vence" |
| `docs/review-checklist.md` | §2: `router.refresh()` em vez de `window.location.reload()` |

Única correção não óbvia (before/after):

```ts
// antes — mutava o singleton de processo durante o SSR
function applyPanelHeaders(actorUid: string): void {
    const state = usePanelStore.getState();
    …
    timeZone: typeof window === "undefined" ? undefined : resolveBrowserTimeZone(),

// depois
function applyPanelHeaders(actorUid: string): void {
    if (typeof window === "undefined") {
        return;
    }
    …
    timeZone: resolveBrowserTimeZone(),
```

Comportamento no cliente é idêntico (headers continuam aplicados no render, antes de qualquer filho
montar); no servidor a aplicação era **inerte** hoje (Server Components usam `getServerApiClient`), então
a mudança remove um vazamento latente sem alterar nada observável.

## Raio de impacto (verificado)

| Mudança de contrato | Consumidores | Resultado |
|---------------------|--------------|-----------|
| `removeHeader`: `= undefined` → `delete` | `clearAuthRequestContext` (sdk), `apps/web/app/[locale]/components/header/index.tsx:202`, `apps/app/app/[locale]/clientLayout.tsx:32` | **sem quebra** — ninguém lê o header de volta nem testa presença da chave; o getter `requestRole` devolve `undefined` nos dois casos. `delete` é estritamente melhor (a chave deixava de sujar `defaults.headers.common`) |
| `IAuthContextProps.userTimezone` (obrigatório) | único construtor: `deriveAuthRequestProps`; único leitor: `BaseClient.setAuthRequestContext` — ambos atualizados. `apps/web` nunca chama `setAuthRequestContext` | **sem quebra** (typecheck verde nos 3 apps) |
| `packages/auth` export `./redirect` | `packages/auth/provider.tsx`, `apps/app/shared/lib/postLoginNavigation.ts`, `apps/app/__tests__/postAuthRedirectTarget.test.ts`. O deletado `apps/app/shared/lib/authRedirect.ts` não tinha outro importador | **sem quebra** |
| `provider.tsx` passou a usar `useQueryClient()` | `AuthProvider` é montado em `apps/app/app/layout.tsx` e `apps/web/app/[locale]/layout.tsx` — **os dois dentro de `QueryProvider`** | **sem quebra** (teria lançado "No QueryClient set"). Efeito colateral correto: o `queryClient.clear()` do logout também limpa o cache da `web` |
| `queryKeys.users.list(type?)` | `useListUsers`, `useUserCrud`, prefetch de `admin/users`, testes — todos atualizados | **coerente**: prefetch `list()` = `["users","list","all"]` bate com a chave do cliente para admin no painel admin → hidrata sem refetch |
| `userRepository.list(options?)` | único caller: `GET /users` | ok |
| `AUTH_REQUEST_HEADER.USER_TIMEZONE` | CORS de `apps/api/proxy.ts` espalha `Object.values(AUTH_REQUEST_HEADER)` | ok — **confirmado ao vivo**: preflight devolve `x-user-timezone` em `access-control-allow-headers` |
| deleção de `lib/server/prefetch.ts` | 3 importadores repontados para `panelSnapshot` | ok |
| deleção de `lib/server/resolveSessionToken.ts` | 0 importadores | ok |
| `apps/web` | tocada só transitivamente (`@repo/auth/provider`, `removeHeader` do sdk) | `pnpm --filter web typecheck` verde |

## Validação visual

Servidores no ar (`api` 3002, `app` 3000), `agent-browser` em sequência estrita, viewport 1440×900 e
390×844, `set media light|dark`.

| Fluxo | light | dark | mobile |
|-------|-------|------|--------|
| `/pt-br/sign-in` | ✅ `01-signin-desktop-light.png` | ✅ `02-signin-desktop-dark.png` | ✅ `03-signin-mobile-light.png` |
| `/pt-br/sign-up` | ✅ `04-signup-desktop-light.png` | — | — |

Gates anônimos percorridos **no browser** (não só curl): `/pt-br/entities/create` e `/pt-br/admin/users`
→ `sign-in?redirect=…` preservando o path. Console limpo: **zero** erro/warning de hidratação nas rotas
anônimas — relevante porque o store é semeado durante o render.

Cobertura por `curl` do default-deny: `/`, `/pt-br`, `/pt-br/admin`, `/pt-br/admin/users`,
`/pt-br/entities`, `/pt-br/entities/create`, `/pt-br/playground`, `/pt-br/rota-inexistente` → 307 para
`sign-in?redirect=…`; `/pt-br/sign-in`, `/pt-br/sign-up` → 200; `/api/auth/session` → 405 (proxy não roda,
matcher exclui).

> ⚠️ **O fluxo de impersonação NÃO foi validado** — falta credencial de admin de DEV. Painel admin, troca
> de ambiente, seletor de "agindo como", `router.refresh()`, persistência entre reloads e o bug original
> (controles desaparecendo) seguem **sem validação visual**. Não trate como aprovado.

## Lacunas de teste (para o `/test`)

1. **A garantia central não tem teste**: que o provider aplica os headers do SDK **durante o render**,
   antes de um filho disparar query — nem que **não** toca no `apiClient` durante SSR (a correção acima).
2. **`GET /users` sem teste de rota**: `requestRole === COMMON` forçando `type=common` e `?type=` inválido
   sendo ignorado. Os 16 testes da api cobrem só `resolveAuthRequestContext`.
3. `userRepository.list` — nenhum teste de que um perfil sem conta no Auth é omitido em vez de derrubar a
   listagem (comportamento novo).
4. `isValidIanaTimeZone` / `resolveBrowserTimeZone` (`@repo/shared`) sem teste direto.
5. **`proxy.ts` sem nenhum teste** — passou a ser o gate mais externo (default-deny) e só foi validado por
   `curl`: casamento de prefixo em `PUBLIC_PATHS` (`/sign-in/...`), redirect de locale, bounce do
   autenticado em rota pública.
6. `apps/web` sem teste do sign-out depois de o provider ganhar `useQueryClient`.

## Decisões em aberto

1. **Store de painel por request (o 🔴 restante).** `usePanelStore` é singleton de módulo e é semeado
   durante o render, que roda também no SSR. Como o render do cliente pode suspender esperando chunk RSC,
   o render de outra request pode intercalar e sobrescrever o estado antes de `PanelNavbarControls` ler —
   o HTML de um visitante sairia com `profileKind`/`impersonatedFirebaseUid` de outro. Não é escalada de
   privilégio (a API revalida) e hidrata corrigido, mas é vazamento cross-request no primeiro paint.
   **Recomendo** o padrão canônico Zustand+Next: `createPanelStore(snapshot)` num `useState` do provider +
   context, eliminando o singleton. Toca store, provider, `PanelNavbarControls`, `useListUsers` e 3 testes
   — refactor grande demais para eu aplicar sozinho no review.
2. **`requireAdminApi` deve rejeitar `requestRole === COMMON`?** Hoje um admin impersonando alcança
   `/admin/users` (voltar no histórico) e consegue criar/editar/apagar usuários enquanto declara painel
   comum. A leitura é escopada, a escrita não. **Recomendo** rejeitar (ou `requireAdminPanelApi`
   dedicado) — e, no front, o `(admin)/layout.tsx` fazer o espelho do `(common)/layout.tsx`, mandando
   admin impersonando para a área comum.
3. **Estreitar o `catch` de `mergeWithAuthUser`** para `auth/user-not-found` e propagar o resto.
   **Recomendo sim**: numa tela de gestão de usuários, esconder registros em silêncio é pior que falhar
   visivelmente. Muda o comportamento em falha transitória (voltaria a 500), por isso não apliquei.
4. **Onde vive a invariante "nenhuma query antes dos headers"?** Ou o gate `initialized` vai para todos os
   hooks de dados, ou se assume que a aplicação no render é a garantia e o gate sai (ficando documentado).
   **Recomendo** a segunda: a aplicação no render já ordena tudo, e o gate atual dá falsa segurança
   (não cobre `actorUid === null`).
5. **Honrar `?redirect=` no bounce do autenticado** em `proxy.ts`, via `postAuthRedirectTarget`, em vez de
   `search = ""`. Ganho de UX pequeno, custo pequeno.
6. **Excluir extensão de arquivo do matcher do proxy** (ex.: `(?!.*\\.[\\w]+$)`) para que
   `apps/app/public/*` continue servível num fork. Hoje inofensivo (não existe `public/`).
7. **`docs/AUTH-SSO.md` e `docs/PAYMENTS.md` descrevem código que não existe neste workspace** — ver
   abaixo. Precisam de decisão antes de entrar em qualquer commit.

## Typecheck / lint / paridade de i18n

| Checagem | Resultado |
|----------|-----------|
| `pnpm --filter api typecheck` | ✅ |
| `pnpm --filter app typecheck` | ✅ (depois das correções) |
| `pnpm --filter web typecheck` | ✅ |
| Biome no escopo (`apps/{app,api}`, `packages/{auth,sdk,shared}`) | ✅ limpo, **exceto** `useFilenamingConvention` (69 ocorrências em toda a árvore, pré-existente e em conflito com a convenção camelCase do `apps/app/CLAUDE.md`). Os 2 erros novos do diff foram corrigidos |
| `pnpm --filter @repo/internationalization test` | ✅ 2/2 (o diff não altera i18n; os 7 `AUTH_REQUEST_*` × 3 idiomas = 21 chaves presentes) |
| CORS do header novo | ✅ preflight ao vivo em `localhost:3002` |
| Suíte Vitest | **não executada** — é do `/test` |

## Pré-existente, fora do diff (não conta como achado)

- **`docs/AUTH-SSO.md` e `docs/PAYMENTS.md` (edições anteriores do usuário) documentam código ausente**:
  `commonUserUsesPanel()`, `apps/web/app/[locale]/(authenticated)/layout.tsx`, `GET /payments/plans`,
  `POST /payments/checkout|portal`, `apiClient.payments.*`, `UserDTO.subscription`,
  `updateSubscriptionByReferenceId`, tela "Minha assinatura". Verificado: não existem aqui.
- **`docs/SETUP.md`** afirma que os `.env.example` foram limpos das chaves do upstream — os três ainda
  têm `CLERK_*`, `DATABASE_URL`, `BETTERSTACK_*`, `SVIX_TOKEN`, `LIVEBLOCKS_SECRET`, `BASEHUB_TOKEN`,
  `KNOCK_API_KEY`. O resto das vars que ele cita existe de fato.
- `/favicon.ico` (não há favicon em `apps/app`) cai em `[locale]` como `locale="favicon.ico"` e devolve
  307 → `/favicon.ico/sign-in`, renderizando o sign-in com locale inválido. O matcher já exclui o path, o
  proxy não participa — é anterior ao diff.
- Copy do sign-up (`apps/app`): `noAccount: "Não tem uma conta? "` acima de um link "Entrar" (deveria ser
  "Já tem uma conta?") e subtítulo repetindo o do sign-in — nos 3 idiomas.
- `apps/web/app/[locale]/layout.tsx` importa `QueryProvider` de `../../../app/shared/providers/…`:
  `apps/web` alcançando dentro de `apps/app`.
- `apps/app/midd_teste.ts` — arquivo vazio esquecido.
- `packages/sdk/src/client/base.ts:74-79` — bloco de `console.log` comentado (código morto).

## Hook de branch protegida

`.claude/hooks/block-protected-branch-write.sh` testado: nega `git push origin main`,
`git push origin HEAD:main` e `--force`; libera `git status`, `git commit` em branch de feature e
`git push -u origin feat/initial-files-v1`. Não cobre `git -C`/`git switch main && git commit` na mesma
linha — é rede de segurança, não a garantia.

## Plano de commits proposto

Ordem: ferramental (corpo 1) → contrato → api → app → docs da feature → artefatos.
`docs/AUTH-SSO.md` e `docs/PAYMENTS.md` ficam **de fora** (decisão 7).

### Corpo 1 — ferramental de IA / Conductor

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `chore(claude): add the task pipeline agents and commands` | `.claude/agents/{analista-qa,desenvolvedor,mediador-pr,observador-tarefa,planejador-tarefa,revisor-codigo,code-reviewer}.md`, `.claude/commands/{analyze,develop,review,test,observe,mediate}.md` |
| 2 | `chore(claude): add branch, commit and comment rules with a protected-branch hook` | `.claude/rules/git-commits.md`, `.claude/rules/code-comments.md`, `.claude/hooks/block-protected-branch-write.sh`, `.claude/settings.json` |
| 3 | `chore(conductor): add the shared workspace settings` | `.conductor/settings.toml` |
| 4 | `chore: ignore local credential and Conductor settings files` | `.gitignore` |
| 5 | `docs: document the task pipeline, review checklist and analysis guide` | `docs/TASK-PIPELINE.md`, `docs/review-checklist.md`, `docs/feature-analysis-guide.md`, `docs/AI-WORKFLOW.md`, `docs/GLOSSARY.md`, `docs/SETUP.md`, `CLAUDE.md`, `README.md` |

### Corpo 2 — feature `auth-panel-context`

| # | Mensagem | Arquivos |
|---|----------|----------|
| 6 | `feat(shared): add the caller time zone to the auth request header contract` | `packages/shared/utils/helpers/auth-request-headers.ts` |
| 7 | `feat(auth): add the caller time zone to the request context type` | `packages/auth/types.ts` |
| 8 | `refactor(auth): share the post-auth redirect guard and clear the cache on sign out` | `packages/auth/redirect.ts`, `packages/auth/package.json`, `packages/auth/provider.tsx` |
| 9 | `feat(sdk): carry the caller time zone in the auth request headers` | `packages/sdk/src/client/base.ts` |
| 10 | `feat(sdk): let the user listing be filtered by type` | `packages/sdk/src/actions/user/user/action.ts` |
| 11 | `feat(api): resolve and validate the caller time zone on the request context` | `apps/api/(shared)/lib/auth-request-context.ts`, `apps/api/__tests__/authRequestContext.test.ts` |
| 12 | `feat(api): scope the user listing by request context` | `apps/api/app/(routes)/users/route.ts`, `apps/api/(shared)/repositories/user.repository.ts` |
| 13 | `feat(app): model the panel state and resolve its snapshot on the server` | `apps/app/shared/lib/panelState.ts`, `apps/app/lib/server/panelSnapshot.ts`, `apps/app/shared/lib/authRequestHeaders.ts`, `apps/app/shared/stores/panelStore.ts`, `apps/app/__tests__/{panelState,panelSnapshot,panelStore,deriveAuthRequestProps}.test.ts` |
| 14 | `feat(app): seed the panel from the server and apply the SDK headers during render` | `apps/app/app/layout.tsx`, `apps/app/app/[locale]/clientLayout.tsx`, `apps/app/shared/providers/AuthRequestPanelContext.tsx`, `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` |
| 15 | `feat(app): keep the panel controls snapshot-driven and never a silent no-op` | `apps/app/shared/components/ui/PanelNavbarControls.tsx`, `apps/app/__tests__/panelNavbarControls.test.tsx` |
| 16 | `feat(app): key the user listing by the scope the API returns` | `apps/app/shared/hooks/useListUsers.ts`, `apps/app/shared/lib/queryKeys.ts`, `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(hooks)/useUserCrud.tsx`, `apps/app/__tests__/useListUsers.test.tsx` |
| 17 | `refactor(app): use the shared post-auth redirect guard` | `apps/app/shared/lib/authRedirect.ts` (D), `apps/app/shared/lib/postLoginNavigation.ts`, `apps/app/__tests__/postAuthRedirectTarget.test.ts` |
| 18 | `refactor(app): read the panel snapshot instead of the prefetch barrel` | `apps/app/lib/server/prefetch.ts` (D), `apps/app/lib/server/resolveSessionToken.ts` (D), `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/page.tsx`, `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/(home)/page.tsx`, `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/page.tsx` |
| 19 | `feat(app): make the proxy default-deny` | `apps/app/proxy.ts` |
| 20 | `test(app): cover the server session and admin guards` | `apps/app/__tests__/serverGuards.test.ts` |
| 21 | `docs: add AUTH-PANEL as the single source for auth and panel rules` | `docs/AUTH-PANEL.md`, `apps/app/CLAUDE.md` |
| 22 | `docs(features): auth-panel-context` | `docs/features/auth-panel-context/**` |

**Notas do plano**
- `packages/auth/provider.tsx` traz duas mudanças (import do guard compartilhado + `queryClient.clear()`)
  e não dá para separar sem staging por hunk — daí o commit 8 carregar os dois assuntos.
- `README.md` (commit 5) também adiciona os links para `AUTH-PANEL.md`/`GLOSSARY.md`, que só existem a
  partir do commit 21: link relativo quebrado em commits intermediários da branch. Sem CI de link, ok.
- `docs/features/auth-panel-context/` conferido: **sem credencial, sem token, sem segredo**.
- **PR sugerido**: `feat(app): server-seeded panel context and default-deny proxy`
- Depois do último commit aprovado, **perguntar** ao usuário antes de
  `git push -u origin feat/initial-files-v1`.

## Commits realizados

_(preenchido pelo orquestrador do `/review` após cada bloco aprovado)_

---

## Commits realizados

Branch `feat/initial-files-v1`, a partir de `999150f`. 21 commits de código/docs + este artefato.
**Ainda não enviados ao remoto** (aguardando confirmação de push).

### Ferramental de IA
| # | Commit | Mensagem |
|---|--------|----------|
| 1 | `4b8e0a4` | `chore(claude): add task pipeline agents and commands` |
| 2 | `c9b6457` | `chore(claude): add branch, commit and comment rules with a protected-branch hook` |
| 3 | `028ea12` | `chore(conductor): add shared workspace settings` |
| 4 | `d8c2b54` | `chore: ignore local credential and Conductor settings files` |
| 5 | `36cb857` | `docs: document the task pipeline, review checklist and analysis guide` |

### Feature — contrato
| # | Commit | Mensagem |
|---|--------|----------|
| 6 | `ac15620` | `feat(shared): carry the caller time zone in the auth request headers` |
| 7 | `face00a` | `feat(auth): add userTimezone to the auth request context` |
| 8 | `398a5a7` | `refactor(auth): share the redirect guard and clear the query cache on sign-out` |
| 9 | `20240b6` | `feat(sdk): send the time zone header and delete cleared headers` |
| 10 | `fd19ce5` | `feat(sdk): allow narrowing the user listing by type` |

### Feature — API
| # | Commit | Mensagem |
|---|--------|----------|
| 11 | `b1f9b95` | `feat(api): resolve and validate the caller time zone` |
| 12 | `c1a1e25` | `feat(api): scope the user listing by request context and close the admin write path` |

### Feature — app
| # | Commit | Mensagem |
|---|--------|----------|
| 13 | `b46ed5a` | `feat(app): model the panel state and resolve it on the server` |
| 14 | `d7741ef` | `feat(app): seed the panel per request and apply headers during render` |
| 15 | `292439a` | `feat(app): drive the panel controls from the snapshot` |
| 16 | `9d3997d` | `feat(app): key the user listing by its effective scope` |
| 17 | `e2b7b81` | `refactor(app): use the shared redirect guard and drop dead code` |
| 18 | `b76ad57` | `refactor(app): import the panel snapshot directly instead of a barrel` |
| 19 | `36b1b3e` | `feat(app): make the proxy default-deny` |
| 20 | `625307c` | `test(app): cover the server session and admin guards` |
| 21 | `d6da1c8` | `docs: add AUTH-PANEL as the single source for the panel rules` |

### Fora dos commits, por decisão do usuário
`docs/AUTH-SSO.md` e `docs/PAYMENTS.md` seguem modificados no working tree. Verificado em **todas** as
branches: `commonUserUsesPanel`, as rotas de payments, `apiClient.payments` e `UserDTO.subscription` não
existem em lugar nenhum — só `getProductMode()`/`isSubscriptionMode()`. O `PAYMENTS.md` marca como
"implementado" o que não existe. Limpeza planejada para depois.

## Estado da validação no fechamento

| Checagem | Resultado |
|----------|-----------|
| typecheck `api`/`app`/`web` | OK |
| `pnpm --filter app test` | 81 passando |
| `pnpm --filter api test` | 16 passando |
| paridade i18n | 2 passando |
| Biome no escopo | limpo (exceto `useFilenamingConvention`, pré-existente em toda a árvore) |
| runtime | gates anônimos, rotas públicas e asset real em `public/` conferidos; zero aviso de hidratação |
| **impersonação** | ⚠️ **não validada visualmente** — falta credencial de admin de DEV |
