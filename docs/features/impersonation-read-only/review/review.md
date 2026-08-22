# Review — `impersonation-read-only`

Revisão do diff completo (working tree, nada commitado). Checklist aplicado:
[`docs/review-checklist.md`](../../../review-checklist.md).

## Branch

- **`api/fix/impersonation-read-only`**, criada pelo `/review` a partir de `casablanca` (que segue
  existindo, intacta). PR para `origin/main`. Nada commitado.

## Veredito

O núcleo de segurança está **correto** e a equivalência que sustenta o refactor foi verificada. Nenhum
achado bloqueante no código da feature. O achado 1 — a copy de `apiErrors` nunca chegar ao usuário — era
pré-existente, mas o usuário decidiu **corrigi-lo neste PR** (ver "Decisões do usuário"); a feature deixa
de entregar meia solução.

## Achados

| # | Sev | Arquivo:linha | Problema | Ação |
|---|-----|---------------|----------|------|
| 1 | 🟡 | `packages/sdk/src/client/base.ts:78` · `packages/shared/utils/helpers/formattedError.ts:24-66` | Duplo embrulho: o SDK já lança `new FormattedError(error)` e o app faz `new FormattedError(error, locale)` por cima. No segundo, o argumento não é `AxiosError` e `FormattedError` **não estende `Error`** → cai no fallback. **Confirmado no browser**: 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` exibia "Um erro inesperado aconteceu". Pré-existente, atinge todos os `error.code` e perde o locale (SDK fixava pt-br) | **Corrigido** — ver "Correção do `FormattedError`" |
| 2 | 🟡 | `apps/api/scripts/create-dev-admin.mjs:48-64` | O script aceitava `<senha>` e a **descartava em silêncio** quando o e-mail já existia; a saída dizia só "already existed". Reproduzido: rodar de novo com senha nova não dava acesso. `docs/SETUP.md` induzia ao contrário ("cria ou reaproveita") | **Corrigido** |
| 3 | 🟢 | `docs/review-checklist.md:67` · `.claude/agents/code-reviewer.md:64` | Ponteiros para `(guards)/auth.ts`, **deletado neste diff** | **Corrigido** |
| 4 | 🟢 | `apps/app/shared/components/ui/ImpersonationReadOnlyNotice.tsx:14-18` | Docstring afirmava que o aviso vem "antes dos controles em ordem de DOM" — falso na lista, onde o `AddButton` está no `Header`, acima do aviso | **Corrigido** (reescrito sem a afirmação falsa) |
| 5 | 🟢 | `specs/BACKLOG.md:113` | O achado 🔴 que esta feature fecha continuava descrito como presente ("`common-panel.ts` não tem verificação alguma") e citava `admin.ts:13,74`, linhas que já não existem | **Corrigido** — linha removida (decisão do usuário) |
| 6 | 🟢 | `biome.jsonc:23-24` | Único comentário novo do diff em português; todo o resto do código novo comenta em inglês | Nit, não alterado |
| 7 | 🟢 | `apps/app/.../EntitiesListClient.tsx:112-118` | "Excluir" **some** enquanto as demais afordâncias ficam `disabled`. Coerente com o contrato do `ActionsMenu` (item só existe com handler), mas é um tratamento diferente para o mesmo motivo | Nit, não alterado |

## Verificações que o pedido pediu explicitamente

**Equivalência `requestRole !== ADMIN` ⟷ `isImpersonating` no `admin.ts` — confirmada, é refactor puro.**
`requireAdminApi` recusa `profile.type !== ADMIN` (`admin.ts:44`) **antes** de `resolveAuthRequestContext`,
então o helper só roda para ator admin. Para esse ator, `validateAdminProfile`
(`auth-request-context.ts:56-78`) garante:
- `requestRole = ADMIN` ⟹ `requestUserId === uid` (senão `AUTH_REQUEST_ADMIN_TARGET_INVALID`) ⟹ ambos falsos;
- `requestRole = COMMON` ⟹ `requestUserId !== uid` (senão `AUTH_REQUEST_IMPERSONATION_REQUIRED`) ⟹ ambos verdadeiros;
- terceiro valor é impossível: `parseRole` só devolve `ADMIN`/`COMMON` e o fallback é o `userRole` do perfil.

**Ordem no `common-panel.ts` — correta, e é a mais barata.** O caso combinado "impersonar alvo inválido
com POST" **não** chega ao helper: `validateAdminProfile` já resolve o alvo e devolve
`AUTH_REQUEST_IMPERSONATION_TARGET_INVALID` dentro do `resolveAuthRequestContext`. O que a ordem decide é
só `READ_ONLY` × `COMMON_PANEL_FORBIDDEN`, e nesse par não há sobreposição: quando `isImpersonating` é
verdadeiro o alvo já foi validado como comum. Checar antes evita uma leitura Firestore por request recusada.

**Fail-closed — sem furo.** `isImpersonating = requestUserId !== uid` e o sujeito **é** o `requestUserId`
(é por ele que o `subjectProfile` é resolvido): não existe "agir como outro" com `requestUserId === uid`.
Os três bypasses por header falham antes do sinal (mismatch de `x-user-id`, alvo admin, alvo ausente).
Varredura de handlers: **todas** as rotas mutantes passam por um dos dois guards —
`entities` (POST/PUT/DELETE) e `users` (POST/PUT/DELETE). Fora deles só sobram `auth/sign-in`,
`auth/sign-up`, `auth/sign-in/google` (públicas, não aceitam headers de painel) e `webhooks/payments`
(assinada pela Stripe). O teste de varredura de `app/(guards)/` trava guard novo que esqueça a regra.

**Espelho UI ⟷ API — coerente por construção.** O cliente usa a mesma função pura do servidor
(`isImpersonatingSnapshot`), e `normalizePanelSnapshot` garante
`impersonatedFirebaseUid !== null ⟺ painel comum + perfil admin`, que é exatamente o que
`deriveAuthRequestProps` traduz em `requestUserId !== uid`. UI e API não divergem. A mensagem traduzida
quando a request escapa da UI estava quebrada (achado 1) e passou a funcionar nesta revisão.

**Script `create-dev-admin.mjs`.** Não vaza credencial (senha só por argv/env, nunca impressa nem gravada);
o documento gravado é idêntico ao de `BaseRepository.create` (`reference_id`, `type`, `createdAt`,
`updatedAt`, `deletedAt: null`); falha com uso + exit 1 sem argumentos e sem `FIREBASE_ADMIN_*`. Avisa na
saída e em `docs/SETUP.md` que cria admin real. Corrigido o descarte silencioso da senha (achado 2).

**Comentários.** Nenhuma citação a `plan.md`, `handoff.md`, `docs/features/**`, "D2", "conforme o plano"
em código, teste, doc de produto ou i18n. Verificado por grep.

**Screenshots.** Os 14 PNGs de `develop/screenshots/` foram abertos: só e-mails `@example.com` e dados de
teste. Nenhum token, senha, cookie ou devtools aberto. Liberados para o commit de docs.

## Decisões do usuário (segunda rodada)

1. Branch aprovada e criada: `api/fix/impersonation-read-only`.
2. Ordem dos commits: i18n **antes** de `apps/app`, como recomendado.
3. Linha 🔴 do `BACKLOG.md`: **removida** neste PR.
4. **Achado 1 corrigido agora**, contra a recomendação do review. O argumento que venceu: sem a correção,
   as 3 chaves de `apiErrors` que este diff adiciona são copy que ninguém nunca lê, e a feature entrega
   metade da solução. Concordo com o resultado — a evidência abaixo mostra que a correção é contida.

## Correção do `FormattedError`

### Correção escolhida: **o SDK para de embrulhar**

`BaseClient.request` propaga o `AxiosError` cru; quem embrulha é a tela, uma vez, com o locale ativo.
É literalmente o que `packages/CLAUDE.md` manda para `@repo/sdk` ("erro propaga de forma que o app possa
mapear para toast/i18n"): hoje o SDK decidia copy **e** idioma, a inversão exata da regra. As alternativas
foram descartadas por tratarem o sintoma: fazer `FormattedError extends Error` devolveria a mensagem mas
manteria o locale congelado em pt-br pelo SDK; ensinar o construtor a reconhecer um `FormattedError`
mantém o embrulho duplo e obriga a carregar o `code` só para desfazê-lo.

### Raio de impacto levantado (nada quebra)

| Consumidor de erro do SDK | Antes | Depois |
|---|---|---|
| `useEntityCrud:34`, `useUserCrud:33`, `SignInForm:40`, `SignUpFormClient:39` (os 4 call sites) | recebiam `FormattedError`, re-embrulhavam → fallback genérico | recebem `AxiosError`, embrulham uma vez → copy correta, no locale certo |
| `packages/auth/provider.tsx` (5 sites: `signIn`, `signUp`, `signInWithGoogle`, `signOut`, `onAuthSuccess`) | erros do **Firebase client** (`@repo/auth/client`), nunca do SDK | inalterados |
| `postLoginNavigation.ts:20`, `authSession.ts:27` | `catch {}` — a forma do erro é irrelevante | inalterados |
| Prefetch RSC (3 páginas) | `prefetchQuery` engole | inalterado |
| `BaseClient.setInterceptorError:87` | monta `FormattedError` a partir do axios error que o interceptor já tem | inalterado — e **sem nenhum chamador** no repo |
| Decorator `FormatError` (`packages/shared/utils/decorators/formatError.ts`) | embrulha em `FormattedError` | inalterado — e **sem nenhum chamador**, só reexportado |
| `apps/web` | declara `@repo/sdk`; não consome erro | inalterado |
| `apps/app/__tests__/useEntityCrud.test.tsx:41` | mocka `FormattedError` **e** `handleClientError` | inalterado |

Nenhum consumidor faz `instanceof FormattedError` nem lê `.status`/`.message` de um erro vindo do SDK.
`SignInForm`/`SignUpFormClient` só usam o SDK no **botão do Google**; e-mail/senha vai direto ao Firebase
client, então o caminho de regressão que o pedido apontou não passa pelo SDK.

### A armadilha que o pedido antecipou, e que era real

`isFirebaseAuthError` fazia duck-typing por `code` + `message`. Um `AxiosError` tem os dois
(`ERR_NETWORK`, `ECONNABORTED`). Enquanto o SDK embrulhava, nenhum axios error chegava lá; ao parar de
embrulhar, uma falha de rede cairia no dicionário do Firebase, encontraria `undefined` e o método tipado
como `string` devolveria `undefined`. Trocado por `firebaseAuthMessage`, que só casa com **código que o
dicionário conhece**, mais um ramo explícito que manda `AxiosError` sem `response` para o fallback (senão
"Network Error" viraria copy de interface, contra a regra "nunca mensagem interna como copy").

## Correções aplicadas

| Arquivo | O que mudou |
|---|---|
| `packages/sdk/src/client/base.ts` | `request()` deixa de embrulhar em `FormattedError` e propaga o erro do axios; sai o `try/catch` e o bloco de `console.log` comentado |
| `packages/shared/utils/helpers/formattedError.ts` | `isFirebaseAuthError` → `firebaseAuthMessage`, que casa só com código presente no dicionário; ramo novo para `AxiosError` sem `response`; branch da resposta da API extraída em `apiResponseMessage` — o que derrubou a complexidade de 26 para abaixo do limite e permitiu **remover a supressão** `noExcessiveCognitiveComplexity` (o repo fica com 1 aviso a menos) |
| `apps/app/__tests__/apiErrorCopy.test.ts` | **novo** — 6 casos travando a cadeia inteira |
| `docs/review-checklist.md` | §4 passa a nomear o modo de falha ("o erro propaga cru — nunca embrulhe em `FormattedError` no SDK"); e removida a menção a `(guards)/auth.ts` |
| `apps/api/scripts/create-dev-admin.mjs` | `ensureAuthUser` passa a chamar `auth.updateUser(uid, { password })` quando a conta já existe; a saída diz "already existed, password reset" |
| `docs/SETUP.md` | Parágrafo novo: o script é idempotente e **serve para recuperar acesso**; o aviso de produção menciona que redefine a senha de conta existente |
| `apps/app/shared/components/ui/ImpersonationReadOnlyNotice.tsx` | Docstring reescrita — a justificativa de a11y agora é verdadeira nas três telas |
| `.claude/agents/code-reviewer.md` | Removida a menção a `(guards)/auth.ts` |
| `specs/BACKLOG.md` | Removida a linha 🔴 que esta feature fecha; achado do hydration mismatch mantido; nota do `midd_teste.ts` mantida |

**Nenhum dos 4 call sites de `apps/app` precisou mudar** — eles já faziam a coisa certa; era o SDK que
tornava impossível.

### Teste que trava a regressão

`apps/app/__tests__/apiErrorCopy.test.ts` (6 casos). `@repo/shared` e `@repo/sdk` não têm infraestrutura
de teste (sem `tsconfig`, sem script `test`), e montar uma só para isto seria mudança maior que a
correção; `apps/app` é onde a cadeia é consumida e onde o checklist manda o teste morar.

Cobre: código conhecido → copy nos 3 idiomas · código conhecido nunca cai no fallback · código do Firebase
continua traduzido (a regressão de sign-in/sign-up) · falha de transporte **não** é confundida com erro do
Firebase · `message`/status como fallback · e o SDK rejeitando com o próprio `AxiosError`.

**Verificado que o teste realmente pega**: reintroduzi o embrulho no `base.ts` e o caso de propagação
falhou (`expected FormattedError{…} to be AxiosError`); restaurado em seguida.

## Raio de impacto (da feature)

Sem mudança de contrato de dados: nenhum DTO, nenhuma action, nenhum header novo (nada a fazer no
`allowHeaders` do CORS). O `packages/sdk` só muda no formato do **erro** que propaga (tabela acima). O que
muda é runtime — `apiClient.entity.create/update/delete` e as
mutações admin podem responder 403 num cenário que antes retornava 2xx. Consumidores: as 3 telas de
`entities` e `/admin/users`, todos em `apps/app` e todos já cobertos (o painel admin some sob
impersonação por causa do redirect do `(admin)/admin/layout.tsx`). Único código de erro alterado:
`admin.ts` deixa de emitir `AUTH_REQUEST_PANEL_FORBIDDEN` (que continua vivo em `auth-request-context.ts`).
Área comum tem só `entities` e `playground` — não há afordância mutante esquecida.

## Validação visual

Ambiente real: `pnpm --filter api dev` (3002) + `pnpm --filter app dev` (3000), projeto Firebase
`next-boilerplate-576d0`, admin `dev-admin@example.com` (senha redefinida pelo script já corrigido),
alvo `readonly-check@example.com`. Comandos do `agent-browser` **em sequência**.

| Fluxo | Resultado |
|---|---|
| Login admin → painel comum → impersonar `readonly-check` | Contexto trocado, dados do alvo carregam |
| `/entities` desktop **dark** e **light** | Aviso com o e-mail do alvo, "Novo" `disabled`, os 2 `Switch` `disabled` (`data-state=checked`, `opacity .5` — o estado real do dado continua legível) |
| `/entities` **mobile** 390×844, light e dark | Aviso quebra bem; `Table` antd respeita os dois temas. No mobile o seletor de usuário some do navbar, então o aviso é a única indicação de quem está sendo personificado |
| Menu de ações da linha | Só "Editar" — "Excluir" ausente |
| `/entities/create` light | Aviso acima do formulário, "Salvar" `disabled` |
| `/entities/edit/[id]` dark | Dados carregam, "Salvar" `disabled` |
| **Bypass real da UI** (removi `disabled` do submit no DOM e submeti) | `POST /entities` → **403 `{"error":{"code":"AUTH_REQUEST_IMPERSONATION_READ_ONLY"}}`**, capturado no XHR. Entidade **não** criada. Antes da correção do achado 1 o toast dizia "Um erro inesperado aconteceu" |
| Sair da impersonação → `/admin/users` | "Novo" habilitado, todos os `Switch` habilitados, nenhum aviso — a regra não afeta o admin agindo como ele mesmo |

### Segunda rodada — depois da correção do `FormattedError`

Ambiente subido de novo, sessão nova, mesmos usuários. Screenshots em `review/screenshots/`.

| Fluxo | Resultado |
|---|---|
| **Mesmo bypass**, `/pt-br/entities/create` | Toast: **"Somente leitura: você está atuando como outro usuário."** — a copy de `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, no lugar do texto genérico (`01-read-only-403-translated-ptbr.png`) |
| **Mesmo bypass**, `/en/entities/create` | Toast: **"Read-only: you are acting as another user."** — prova de que o locale deixou de ficar preso em pt-br. Capturado por asserção no DOM (o `autoClose` de 3s da `react-toastify` venceu o screenshot nessa rodada) |
| **Regressão sign-in**, senha errada, credencial real | "Credenciais inválidas. Verifique e-mail e senha." (`02-signin-invalid-credential.png`) |
| **Regressão sign-up**, e-mail já cadastrado | "Este e-mail já está em uso." (`03-signup-email-already-in-use.png`) |
| Lista de `entities` depois de 5 tentativas de bypass | Continua com as **2** entidades originais — nenhuma escapou |

Console: só o `hydration mismatch` do Radix e o aviso de `Select` controlado/não-controlado, ambos
pré-existentes e já catalogados no `specs/BACKLOG.md`.

Dados deixados no projeto de DEV: nenhum registro novo (todo probe foi bloqueado pelo 403). A senha do
`dev-admin@example.com` foi redefinida durante a revisão e não está em nenhum arquivo.

## Lacunas de teste (para o `/test`)

1. `create/page.tsx` e `EditEntityClient.tsx` sem teste de componente — o `disabled` do `Footer` nessas
   duas telas só tem a validação visual.
2. `ImpersonationReadOnlyNotice` não tem teste isolado do caso `isImpersonating === false` → `null`.
3. Rotas de `entities` sob impersonação não têm teste de rota (só de guard).
4. `create-dev-admin.mjs` sem teste automatizado — inclusive o caminho novo (redefinir a senha de conta
   existente), validado só manualmente contra o projeto real.
5. ~~Não existe teste que prove que um `error.code` vira copy traduzida na UI~~ — **fechada** por
   `apiErrorCopy.test.ts`.

## Decisões em aberto

1. **`pnpm-lock.yaml` editado à mão.** **Concordo com a abordagem.** As 3 linhas registram só
   `firebase-admin@13.6.0` no importer `apps/api`, a versão já resolvida por `packages/auth`; um `pnpm
   install` completo arrastaria o bump de `radix-ui` (`"latest"` no design-system), que é ruído e risco
   fora do escopo. `pnpm install --frozen-lockfile` valida. A causa raiz — `"radix-ui": "latest"` — merece
   virar tarefa própria, mas não aqui.
2. **Dois trechos mortos encontrados ao mapear o raio de impacto**, ambos construindo `FormattedError` sem
   nenhum chamador: `BaseClient.setInterceptorError` (`packages/sdk/src/client/base.ts:87`) e o decorator
   `FormatError` (`packages/shared/utils/decorators/formatError.ts`, só reexportado no barrel). Não toquei
   — remoção é tarefa própria, fora do escopo desta feature. Se preferir, viram linha no `BACKLOG.md`.

## Typecheck / lint / paridade

Tudo re-executado **depois** da correção do `FormattedError`.

| Comando | Resultado |
|---|---|
| `pnpm --filter api typecheck` | ✅ |
| `pnpm --filter app typecheck` | ✅ |
| `pnpm --filter web typecheck` | ✅ (consome o SDK; incluído por causa da mudança de contrato de erro) |
| `pnpm test` (suíte inteira, 3 workspaces) | ✅ **173** — api 45, app **126** (+6), i18n 2 |
| `pnpm check` | **197 erros / 39 avisos** — erros idênticos à baseline, **um aviso a menos** (a supressão de complexidade removida do `formattedError.ts`) |
| `biome check` nos arquivos tocados | ✅ limpo |

`@repo/sdk` e `@repo/shared` não têm script de `typecheck` próprio (sem `tsconfig`); são checados
transitivamente pelos três apps, todos verdes. Os 197 erros restantes são dívida pré-existente, fora dos
arquivos deste diff.

## Plano de commits proposto

Ordem: `packages` (contrato de erro) → `api` → `internationalization` → `app` → docs/`specs`.

A correção do `FormattedError` entra **primeiro**: ela toca `@repo/sdk` + `@repo/shared`, dos quais tudo o
mais depende, e é o que faz a copy do commit 6 ter efeito. Escopo `packages` porque atravessa dois pacotes
(regra do `git-commits.md`). O bloco de i18n foi antecipado para antes de `apps/app`, como decidido.

1. `fix(packages): let the API error code reach the user in the active locale`
   - `packages/sdk/src/client/base.ts`
   - `packages/shared/utils/helpers/formattedError.ts`
2. `test(app): cover the API error code to user copy chain`
   - `apps/app/__tests__/apiErrorCopy.test.ts`
3. `fix(api): make impersonation read-only across every panel guard`
   - `apps/api/(shared)/lib/impersonation-read-only.ts`
   - `apps/api/app/(guards)/common-panel.ts`
   - `apps/api/app/(guards)/admin.ts`
4. `test(api): cover read-only impersonation on both panel guards`
   - `apps/api/__tests__/impersonationReadOnly.test.ts`
   - `apps/api/__tests__/commonPanelGuard.test.ts`
   - `apps/api/__tests__/adminGuard.test.ts`
5. `chore(api): drop the unused context-less auth guard`
   - `apps/api/app/(guards)/auth.ts` (deleção)
6. `chore(api): add a development bootstrap for the first admin`
   - `apps/api/scripts/create-dev-admin.mjs`
   - `apps/api/package.json`
   - `pnpm-lock.yaml`
7. `feat(internationalization): add the read-only impersonation copy`
   - `packages/internationalization/translations/apps/app/pages/impersonation/index.ts`
   - `packages/internationalization/translations/apps/app/pages/index.ts`
   - `packages/internationalization/translations/packages/shared/utils.ts`
8. `feat(app): hide mutating actions while acting as another user`
   - `apps/app/shared/providers/AuthRequestPanelContext.tsx`
   - `apps/app/shared/components/ui/ImpersonationReadOnlyNotice.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/(home)/EntitiesListClient.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx`
9. `test(app): cover the read-only impersonation UI`
   - `apps/app/__tests__/entitiesListReadOnly.test.tsx`
   - `apps/app/__tests__/authRequestPanel.test.tsx`
10. `chore(repo): let the filename rule accept the repository naming convention`
    *(decisão de escopo ampliado — não pertence à feature)*
    - `biome.jsonc`
    - `packages/design-system/components/ui/select/index.tsx`
    - `packages/design-system/components/form/hookform/hookformSelect.tsx`
    - `apps/app/.../entities/(hooks)/useFindEntityById.tsx`
    - `apps/app/.../entities/(hooks)/useListEntities.tsx`
    - `apps/app/.../entities/(hooks)/useEntityCrud.tsx`
    - `apps/app/.../entities/(components)/EntityFormFields.tsx`
    - `apps/app/.../entities/(validations)/entityFormSchema.ts`
11. `docs: record impersonation as read-only and the dev admin bootstrap`
    - `docs/AUTH-PANEL.md`
    - `docs/SETUP.md`
    - `docs/review-checklist.md`
    - `.claude/agents/code-reviewer.md`
12. `docs(specs): close the impersonation finding and log the hydration one`
    - `specs/BACKLOG.md`
13. `docs(features): impersonation-read-only`
    - `docs/features/impersonation-read-only/**` (inclui `review/review.md`, os screenshots das duas
      rodadas e o `STATE.md` final)

PR sugerido: **`fix(api): make impersonation read-only in every panel`** para `origin/main`.
Depois do último commit aprovado, o `/review` deve **perguntar** antes de `git push -u origin <branch>`.

## Commits realizados

Plano de 13 blocos aprovado integralmente pelo usuário, executado na branch
`api/fix/impersonation-read-only` (criada a partir de `casablanca`, que segue intacta).

| # | hash | mensagem |
|---|------|----------|
| 1 | `8028703` | `fix(packages): let the API error code reach the user in the active locale` |
| 2 | `774c619` | `test(app): cover the API error code to user copy chain` |
| 3 | `e1c7cf3` | `fix(api): make impersonation read-only across every panel guard` |
| 4 | `a020828` | `test(api): cover read-only impersonation on both panel guards` |
| 5 | `147ecf2` | `chore(api): drop the unused context-less auth guard` |
| 6 | `efda9c0` | `chore(api): add a development bootstrap for the first admin` |
| 7 | `7de1fef` | `feat(internationalization): add the read-only impersonation copy` |
| 8 | `97a334b` | `feat(app): hide mutating actions while acting as another user` |
| 9 | `612d03c` | `test(app): cover the read-only impersonation UI` |
| 10 | `970976b` | `chore(repo): let the filename rule accept the repository naming convention` |
| 11 | `ec757b9` | `docs: record impersonation as read-only and the dev admin bootstrap` |
| 12 | `13f8299` | `docs(specs): close the impersonation finding and log the hydration one` |
| 13 | `ac43bd9` | `docs(features): impersonation-read-only` |

Antes do bloco 13 os artefatos foram varridos por credencial (senha, token, chave privada, strings
longas): nada encontrado — só menções ao *assunto* senha, nunca a um valor.

**Enviados ao remoto**: sim, com o "sim" do usuário —
`git push -u origin api/fix/impersonation-read-only`. Nenhuma PR foi aberta.

Suíte re-executada com a árvore limpa após o último commit: **173 testes verdes** (api 45 · app 126 ·
internationalization 2).
