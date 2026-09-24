# Revisão: onboarding pós-cadastro

Rodada autônoma dentro de um `/cycle`. A revisão leu o diff inteiro, o `develop/handoff.md` e o
`analyze/plan.md`, rodou só os gates estáticos e não subiu app nem browser. Nada foi commitado.

## Branch

- Nome: `feat/onboarding-flow`, criada com `git switch -c` a partir de `yerevan`, cujo `HEAD` é `ab11a5b`
  (igual a `origin/main`). O working tree e o índice vieram intactos.
- `yerevan` não segue o padrão e não tinha upstream nem commit próprio. O diff toca `packages/sdk`,
  `apps/api`, `apps/app` e `packages/internationalization`, então o nome omite o `project`.
- Regex do padrão: `branch OK: feat/onboarding-flow`.
- O índice já carrega um rename da auditoria (`specs/data-rights-lgpd.md` para
  `docs/features/data-rights-lgpd/spec.md`, 0 linhas). Por isso ele entra no primeiro commit do plano.

## Revisão: diff do onboarding

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/app/shared/lib/onboarding.ts:65-72`: a recusa do destino `/onboarding` comparava o caminho com a
  query junto, então `?redirect=/pt-br/onboarding?x=1` passava. Não chegava a laço, porque o segundo salto
  perde o `?redirect=` e cai em `/pt-br`, mas contrariava o critério "apontando para `/onboarding` cai no
  fallback". **Corrigido**: query e hash saem antes da comparação (`QUERY_OR_HASH`, `:13`).
- `docs/SECURITY.md:13-23` e `:148`: as contagens de rotas foram medidas em `ab11a5b`, antes da rota nova.
  Com `account/onboarding` são 26 rotas, 15 com guard, `account/*` ×6, e quatro das seis rotas de
  `/account` ficam fora do rate limit. **Corrigido**, medido com `find` sobre `apps/api/app/(routes)`.
- `apps/app/app/[locale]/(authenticated)/onboarding/(components)/OnboardingClient.tsx:75-76`:
  `router.replace` e `router.refresh()` no mesmo tick, quando o idioma muda no fim. `docs/AUTH-PANEL.md:169`
  e o D4 de `auth-panel-context/test/report.md:139` registram que navegação e refresh no mesmo tick se
  cancelaram. Lendo a fila de ações do Next 16
  (`next/dist/client/components/app-router-instance.js:139-145`), uma navegação descarta a ação pendente,
  mas um refresh que chega depois da navegação entra na fila atrás dela, então esta ordem deve funcionar. O
  `AccountPreferencesForm.tsx:93-99` usa o mesmo par. Não mexi: vai para o `/test` como o item de maior
  risco.

### 🟢 Sugestão / nit

- `apps/app/proxy.ts:153-155`: caminho com extensão de arquivo devolve `NextResponse.next()` sem sobrescrever
  `x-app-path`, então um valor forjado pelo navegador chega ao layout nesses caminhos. O valor passa por
  `postAuthRedirectTarget` antes de virar URL (só caminho do mesmo domínio com locale), e o JSDoc de
  `APP_PATH_HEADER` (`shared/lib/onboarding.ts:9`) exagera um pouco ao dizer "every request". Sem ação.
- `apps/app/env.ts:10`: o comentário diz que só `"false"` desliga; `isOnboardingEnabled` também aceita
  `"FALSE"` e `" false "`. Sem ação.

### ✅ OK

- `POST /account/onboarding` é `export const POST = requireCommonPanelApi(...)` (`route.ts:14`). O guard
  recusa sem token (401), admin (403 `COMMON_PANEL_FORBIDDEN`) e escrita sob impersonação (403 via
  `assertReadOnlyWhileImpersonating`, `common-panel.ts:65-71`). O id vem de `ctx.subjectProfile.id`. O corpo
  passa por `parseRequestJson` e por um schema `.strict()` que recusa `id`/`uid`.
- Os três `error.code` novos estão em `apiErrors` nos 3 idiomas
  (`translations/packages/shared/utils.ts:51-55`, `:150-154`, `:248-252`), e a rota nunca devolve mensagem
  interna (`route.ts:48-53`).
- Laço `/onboarding` e `(common)`: o layout só desvia com `completedAt === null`, a página só redireciona sem
  isso, e as duas leem `getAppSessionUser` (`cache` do React) na mesma requisição.
- Impersonação: `getServerApiClient` só lê o cookie `access-token` (`apiServerClient.ts:18-31`), então o
  `/auth/me` do servidor resolve o ator admin e `resolvePendingOnboarding` para em
  `profileKind !== "common"` (`lib/server/onboarding.ts:24-27`).
- Proxy: a cópia `new Headers(request.headers)` leva o `cookie` inteiro, e o override do Next troca os
  headers da requisição por essa cópia completa (`resolve-routes.js:377-402`). O `x-locale` gravado por
  `cookies()` vira `set-cookie` na resposta depois do handler (`adapter.js:272-274`), independente do
  override. Cookies de impersonação e de sessão continuam chegando aos Server Components.
- Open redirect: `?redirect=` e `x-app-path` passam por `postAuthRedirectTarget`
  (`packages/auth/redirect.ts:10-33`) na montagem da URL do onboarding e no destino final.
- `createDefaultUserProfile` segue gravando `...dto` por último (`user-merge.ts:48-56`). `POST /auth/sign-up`
  mantém o rollback da conta do Auth.
- SDK: `advanceOnboarding` devolve `data.data` e deixa o erro propagar cru. `ONBOARDING_STEPS` não puxa
  runtime novo para o proxy, porque `packages/sdk/src/types` não tem import de valor.
- Formulários usam `HookFormInput`/`HookFormSelect`, `FormContainer` e `Footer` dentro do `<form>`. Zod recebe
  as mensagens do dicionário, e o hook de leitura é `useAuthorizedQuery`. Os comentários explicam o porquê e
  nenhum cita o fluxo de agents.
- Corte da spec: bate com o bloco de reescopo de `specs/onboarding-flow.md`. Os dois desvios (D3, D4) já
  estão registrados no plano.

### 👁 Verificar no `/test`

Veredito item a item da lista "A verificar no `/test`" do handoff:

| # do handoff | veredito | repro sugerido |
|---|---|---|
| 1. Cadastro novo cai no onboarding num salto | continua aberto | Conta nova sob o emulador; `curl -i` com o cookie `access-token` em `/pt-br` deve dar `307` com `location: /pt-br/onboarding`, sem `?redirect=`. No browser, conferir que nenhum pedaço do painel aparece antes. |
| 2. Deep link | continua aberto (a montagem da URL está coberta por teste) | `curl -i` em `/pt-br/entities/create` com onboarding pendente deve dar `location: /pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fcreate`. Concluir e conferir a URL final. |
| 3. Router cache depois de concluir | continua aberto | Concluir o passo 2 e conferir que a URL final é o destino e que o painel renderiza sem voltar a `/onboarding`. Depois, "voltar" no navegador não deve cair no onboarding. |
| 4. Troca de idioma no fim | continua aberto, **maior risco** | Concluir escolhendo English a partir de `/pt-br/onboarding?redirect=%2Fpt-br%2Fentities`. Esperado: URL `/en/entities`, textos em inglês na primeira pintura, `document.cookie` com `x-locale=en`, `<html lang="en">`. Se o `replace` for cancelado, o sintoma é a URL parar em `/pt-br/entities` com textos em pt-br, porque o refresh re-renderiza a página já concluída e ela redireciona para o destino no locale antigo. |
| 5. 409 ressincroniza | continua aberto | `curl` autenticado com `{"step":"preferences","outcome":"completed"}` com o passo atual em `profile` deve dar `409 ONBOARDING_STEP_OUT_OF_ORDER`. Na tela, forçar o conflito e conferir o toast traduzido e a volta ao passo certo. |
| 6. Admin personificando conta pendente | fechado por leitura (ver ✅) | Fica como checagem barata do fluxo 9 do plano, não como hipótese. |
| 7. Layout e tema | continua aberto | Light, dark e 375 px nas duas telas, 3 idiomas. O `Footer` sticky dentro do card precisa caber numa tela baixa. |
| 8. Nome do Google como default | fechado por leitura no código | O passo só monta depois de a conta chegar (`OnboardingClient.tsx:117-125`), então `defaultValues` recebe `account.displayName`. O valor real depende do provedor; só confira se houver conta Google no emulador. |

Itens novos desta revisão:

- **`set-cookie` do `x-locale` no pass-through.** Fechado por leitura, mas é a regressão mais cara se estiver
  errada e custa um comando: `curl -i` em `/en/entities` com cookie `x-locale=pt-br` e sessão válida deve
  trazer `set-cookie: x-locale=en`.
- **Redirect para o onboarding com query.** `/pt-br/onboarding?redirect=%2Fpt-br%2Fonboarding%3Fx%3D1` com o
  fluxo concluído deve dar um único `307` para `/pt-br`.

## Correções aplicadas

| arquivo | o que mudou |
|---|---|
| `apps/app/shared/lib/onboarding.ts:13`, `:65-67` | `isOnboardingPath` corta query e hash antes de comparar com `/onboarding` |
| `docs/SECURITY.md:13-15`, `:23`, `:148` | 26 rotas, 15 com guard, `account/*` ×6, quatro de seis rotas de `/account` fora do rate limit, data da medição |

## Raio de impacto

- `UserDTO.onboarding?` é opcional, então nenhum dos 11 arquivos que usam `UserDTO` em `apps/` e
  `packages/` precisa mudar. O typecheck dos 4 workspaces passa.
- `createDefaultUserProfile` é chamado por `getMergedUserByUid`, `getMergedUserFromIdToken` e
  `POST /auth/sign-up`. Todo perfil novo por esses caminhos nasce pendente. `POST /users` (admin) não mudou.
- `apps/app/proxy.ts` passou a repassar headers de requisição em todo pass-through, inclusive nas rotas
  públicas. O único efeito fora do onboarding é o header `x-app-path` a mais.
- `apps.app.pages.onboarding` é chave nova. `apiErrors` ganhou três códigos. `apps/web` não é afetado.

## Lacunas de teste

| lacuna | veredito |
|---|---|
| `onboarding/page.tsx` sem teste de RSC (handoff) | continua aberta. A regra está coberta em `onboardingRedirect.test.ts`; o `/test` cobre pelo fluxo 7 e 10 do plano |
| `(common)/layout.tsx` sem teste próprio chamando `redirect` (handoff) | continua aberta, baixa prioridade: o layout só chama `resolveOnboardingRedirect`, que tem teste |
| `resolveOnboardingDestination` com destino `/{locale}/onboarding?x=1` (nova, da correção) | aberta. Um caso em `apps/app/__tests__/onboardingState.test.ts`, bloco "never points back at the onboarding" |
| `proxy.test.ts` não confere o `set-cookie` do `x-locale` junto do override (nova) | aberta, barata |

## Decisões em aberto

- **P2, botão "Sair" na tela do onboarding**, herdada do plano. Recomendação: seguir sem botão no MVP e
  decidir no `/test`, se a tela se mostrar confinante.
- Nenhuma outra. A ordem dos commits (auditoria primeiro) é decisão técnica e está justificada no plano abaixo.

## Gates

| gate | comando | resultado |
|---|---|---|
| lint/format | `pnpm check` | 666 arquivos, nenhuma correção (antes e depois das edições) |
| typecheck | `pnpm turbo run typecheck --filter=app --filter=api --filter=@repo/sdk --filter=@repo/internationalization` | 4/4, do cache |
| typecheck depois da correção | `pnpm turbo run typecheck --filter=app` | 1/1, sem cache, 6,8 s |
| paridade de i18n | `pnpm --filter @repo/internationalization test` | 5 arquivos, 44/44 |

A suíte Vitest não rodou aqui; é do `/test`.

## Varredura de segredo

`rg` por padrão de senha (`Palavra2026!`), JWT (`eyJ...`), chave Stripe (`sk_`, `whsec_` real), chave PEM e
e-mail fora de `example.com/org` em `docs/features/onboarding-flow/`, nos artefatos de `data-rights-lgpd` e
`user-activity-tracking`, em `specs/*.md` e nos quatro `docs/*.md` do diff. Só apareceram
`qa-onboarding@example.com` (domínio reservado) e o placeholder `whsec_...` já existente em `docs/SETUP.md`.

## Plano de commits

Ordem: a auditoria vai primeiro porque o rename dela já está no índice, e começar por ela evita que ele
entre num commit de código. Depois vem o código em `sdk`, `api`, `app` e `internationalization`, seguido da
documentação e, por último, dos artefatos. `docs/SETUP.md` e `docs/AUTH-PANEL.md` ficam num commit `docs`
próprio, e não junto do `apps/app`, porque a regra é um commit por app ou pacote. Eles também ficam fora do
commit de `SECURITY.md`/`PRE-PRODUCTION.md`, que corrige medições da auditoria da PR #23 (a contagem de
rotas em `SECURITY.md` só é verdadeira depois do commit 3).

1. `docs(specs): audit the backlog after PR #23`
   - `specs/data-rights-lgpd.md` para `docs/features/data-rights-lgpd/spec.md` (rename já no índice; o
     conteúdo novo do arquivo ainda não está)
   - `docs/features/data-rights-lgpd/spec.md`
   - `docs/features/data-rights-lgpd/analyze/plan.md`
   - `docs/features/user-activity-tracking/spec.md`
   - `docs/features/user-activity-tracking/analyze/plan.md`
   - `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/admin-billing-insights.md`,
     `specs/billing-subscription.md`, `specs/e2e-testing.md`, `specs/observability-logging.md`,
     `specs/onboarding-flow.md`, `specs/teams-organizations.md`
2. `feat(sdk): onboarding state contract and advance action`
   - `packages/sdk/src/types/user/user.ts`, `packages/sdk/src/actions/account/action.ts`
3. `feat(api): advance onboarding endpoint`
   - `apps/api/(shared)/lib/onboarding.ts`, `apps/api/(shared)/validation/account.schema.ts`,
     `apps/api/app/(routes)/account/onboarding/route.ts`, `apps/api/__tests__/onboardingState.test.ts`,
     `apps/api/__tests__/accountOnboardingRoute.test.ts`
4. `feat(api): seed the onboarding state on new profiles`
   - `apps/api/(shared)/lib/user-merge.ts`, `apps/api/app/(routes)/auth/sign-up/route.ts`,
     `apps/api/__tests__/signUpProfile.test.ts`, `apps/api/__tests__/googleSignInProfile.test.ts`
5. `feat(app): onboarding state helpers and on/off switch`
   - `apps/app/shared/lib/onboarding.ts`, `apps/app/env.ts`, `apps/app/.env.example`,
     `apps/app/__tests__/onboardingState.test.ts`
6. `feat(app): forward the requested path from the proxy`
   - `apps/app/proxy.ts`, `apps/app/__tests__/proxy.test.ts`
7. `feat(app): send pending users to onboarding from the common layout`
   - `apps/app/lib/server/onboarding.ts`,
     `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx`,
     `apps/app/__tests__/onboardingRedirect.test.ts`
8. `feat(app): onboarding flow screens`
   - `apps/app/app/[locale]/(authenticated)/onboarding/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/onboarding/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/onboarding/(components)/OnboardingClient.tsx`
   - `apps/app/app/[locale]/(authenticated)/onboarding/(components)/OnboardingProfileStep.tsx`
   - `apps/app/app/[locale]/(authenticated)/onboarding/(components)/OnboardingPreferencesStep.tsx`
   - `apps/app/app/[locale]/(authenticated)/onboarding/(hooks)/useOnboardingMutations.tsx`
   - `apps/app/app/[locale]/(authenticated)/onboarding/(validations)/onboardingFormSchema.ts`
   - `apps/app/__tests__/onboardingClient.test.tsx`
9. `feat(internationalization): onboarding copy and error codes`
   - `packages/internationalization/translations/apps/app/pages/onboarding/index.ts`,
     `packages/internationalization/translations/apps/app/pages/index.ts`,
     `packages/internationalization/translations/packages/shared/utils.ts`
10. `docs: document the onboarding switch and gate chain`
    - `docs/SETUP.md`, `docs/AUTH-PANEL.md`
11. `docs: refresh security and pre-production measurements`
    - `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`
12. `docs(features): onboarding-flow`
    - `docs/features/onboarding-flow/STATE.md`, `docs/features/onboarding-flow/analyze/plan.md`,
      `docs/features/onboarding-flow/develop/handoff.md`, `docs/features/onboarding-flow/review/review.md`,
      `docs/features/onboarding-flow/test/criterios-aceite.md`, `docs/features/onboarding-flow/test/report.md`
      (a pasta `test/e2e/` é descartada pelo `.gitignore:300`)

Os commits 5 a 8 importam chaves de i18n que só entram no 9. A PR é mesclada por squash, então nenhum
commit intermediário precisa compilar sozinho.

Título de PR sugerido: `feat: post-sign-up onboarding flow`.

## Rodada 2: defeitos do `/test`

O `/test` (rodada 1) bloqueou a entrega com dois defeitos de produção, D1 e D2, descritos em
`test/report.md`. As duas correções ficaram no `OnboardingClient` e no hook dele. `GET /account`, a API e o
contrato do SDK não mudaram.

### D1: o passo 2 pré-selecionava Português

`resolvePreferences` (`apps/api/(shared)/lib/account-avatar.ts:10-24`) preenche `locale: "pt-br"` quando o
perfil não tem preferência gravada, e o `AccountDTO` não distingue preferência escolhida de preferência
padrão. O passo 2 usava esse valor, então toda conta nova via "Português" em `/en` e `/es`, e "Concluir"
sem mexer no campo trocava o idioma.

Correção: o default do passo 2 passa a ser o locale da tela
(`OnboardingClient.tsx:132`, `defaultLocale={locale}`). O guard `isOnboardingLocale` e a leitura de
`account.preferences` saíram porque ficaram sem uso. `resolvePreferences` continua igual: ele também
alimenta `GET /account` (`account-avatar.ts:69`), o `PUT /account` (`account/route.ts:65`) e o export de
dados (`account-export.ts:57`), e o default dele está correto para esses consumidores. Uma conta com
onboarding pendente não chega à área de conta (o layout comum desvia antes), então a preferência gravada
não tem por onde divergir da tela durante o fluxo.

### D2: o 409 não ressincronizava

A página monta `<OnboardingClient key={pendingOnboarding.step} />`. Quando a tela está à frente do servidor
e o servidor continua no passo com que a página foi montada, o `router.refresh()` devolve a mesma `key`, o
React não remonta e o `useState` mantém o passo local.

Correção: `useOnboardingMutations` recebe `onConflict`
(`(hooks)/useOnboardingMutations.tsx:19-25`) e o chama antes do `router.refresh()` no 409 (`:47-50`). O
`OnboardingClient` passa `() => setStep(initialStep)` (`OnboardingClient.tsx:52-54`). Os dois casos ficam
cobertos: se o servidor está no passo da montagem, o `setStep` já leva a tela para ele; se está em outro,
a `key` muda no refresh e o componente remonta com o passo novo. A API e o formato do 409 não mudaram.

### O3: `aria-invalid="false"` com erro visível

Achado, sem correção. A causa está no design system: `HookFormInput` usa `<Controller>` direto, sem o
`FormField` que publica o nome do campo no contexto. Sem esse nome, `useFormField` não encontra o erro e o
`FormControl` grava `aria-invalid={false}` e um `aria-describedby` sem o id da mensagem
(`packages/design-system/components/ui/form.tsx:109-123`). Os oito componentes de
`packages/design-system/components/form/hookform/` seguem o mesmo padrão, e o `HookFormInput` sozinho é
usado em 10 arquivos. Corrigir na raiz mexe em todo formulário do repositório, o que passa do mínimo desta
feature. Fica para o backlog, com esta causa.

### Instrumento

| defeito | teste (`apps/app/__tests__/onboardingClient.test.tsx`) | sem a correção | com a correção |
|---|---|---|---|
| D1 | "preselects the language of the screen, not the account default" (`:242`): cookie `x-locale=en`, conta com `locale: "pt-br"` (o que a API devolve), "Finish" sem mexer. Espera `PUT` com `en`, `replace` para o destino como está e nenhum `setCookie` | falha | passa |
| D2 | "goes back to the step the server rendered when a later step conflicts" (`:324`): monta em `profile`, avança para `preferences`, "Pular" recebe 409. Espera o título do passo 1 e nenhum botão "Pular" | falha | passa |

A prova de "falha sem a correção" foi feita revertendo as duas linhas no arquivo e rodando o teste: 2
falhas em 12, as duas esperadas. Com a correção de volta, 12/12.

O teste "carries a newly chosen language into the destination" (`:262`) dependia do comportamento de D1:
ele pré-selecionava English pela preferência da conta. Agora escolhe English no `<select>` nativo do campo
e confere o mesmo resultado (`replace` para `/en/entities/create` e cookie `x-locale=en`).

### Gates da rodada 2

| gate | comando | resultado |
|---|---|---|
| lint/format | `pnpm check` | 666 arquivos, nenhuma correção |
| typecheck | `pnpm turbo run typecheck --filter=app` | 1/1, sem cache |
| paridade de i18n | `pnpm --filter @repo/internationalization test` | 44/44 (i18n não mudou) |
| testes tocados | `vitest run` em `onboardingClient`, `onboardingState`, `onboardingRedirect` e `proxy` | 4 arquivos, 53/53 |

`api` e `sdk` não mudaram nesta rodada; o typecheck deles vale o da rodada 1.

### Para o `/test` remedir

- D1: cadastro em `/en/sign-up` e em `/es/sign-up`, nome, "Continue". O campo deve mostrar English (ou
  Español), e "Finish" sem mexer deve terminar em `/en/...` com `x-locale=en`.
- D2: o mesmo repro do relatório (tela no passo 2, servidor voltado para `profile`, "Omitir"). Esperado:
  toast, e a tela volta para "Paso 1 de 2" sem recarregar.
- Critério 5 do handoff (troca de idioma no fim): escolher English de verdade em `/pt-br/onboarding`, já que
  o default deixou de fazer essa troca por acidente.

### Plano de commits

Nenhum arquivo de código mudou de commit: o `OnboardingClient.tsx`, o `useOnboardingMutations.tsx` e o
`onboardingClient.test.tsx` seguem no commit 8. Os testes que o `/test` acrescentou em
`onboardingState.test.ts` e `proxy.test.ts` seguem nos commits 5 e 6. O commit 12 ganhou os dois arquivos de
`test/`, varridos por segredo (só aparecem contas `@example.com`).

## Commits realizados

(preenchido pelo `/review` depois dos commits)
