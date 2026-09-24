# Handoff do develop: onboarding pós-cadastro

Rodada autônoma dentro de um `/cycle`. Nenhuma branch criada, nada commitado. O plano está em
`analyze/plan.md`; aqui fica o que saiu no código, onde saiu diferente e o que ninguém mediu ainda.

## Blueprint → arquivos

| Item do blueprint | Arquivos |
|---|---|
| 10.1 Contrato | `packages/sdk/src/types/user/user.ts` (`ONBOARDING_STEPS`, `OnboardingStepId`, `OnboardingState`, `OnboardingStateDTO`, `OnboardingStepOutcome`, `AdvanceOnboardingRequest`, `UserDTO.onboarding`); `packages/sdk/src/actions/account/action.ts` (`advanceOnboarding`) |
| 10.2 Regra de transição | `apps/api/(shared)/lib/onboarding.ts` (`initialOnboardingState`, `advanceOnboardingState`, `toOnboardingStateDTO`) |
| 10.2 Schema | `apps/api/(shared)/validation/account.schema.ts` (`advanceOnboardingSchema`, `parseAdvanceOnboarding`, `AdvanceOnboardingInput`) |
| 10.2 Rota | `apps/api/app/(routes)/account/onboarding/route.ts` (`POST`, `requireCommonPanelApi`) |
| 10.5 Estado inicial | `apps/api/(shared)/lib/user-merge.ts` (`createDefaultUserProfile` grava `onboarding`); `apps/api/app/(routes)/auth/sign-up/route.ts` (passa a chamar `createDefaultUserProfile`, imports de `userRepository`/`UserType` removidos) |
| 10.5 Header do proxy | `apps/app/proxy.ts` (`x-app-path` no `NextResponse.next({ request: { headers } })`) |
| 10.5 Env | `apps/app/env.ts` (`ONBOARDING_ENABLED: z.string().optional()`); `apps/app/.env.example` (`ONBOARDING_ENABLED=""` com aviso) |
| 10.4 Helpers | `apps/app/shared/lib/onboarding.ts` (`APP_PATH_HEADER`, `onboardingStepIndex`, `readOnboardingState`, `isOnboardingPending`, `isOnboardingEnabled`, `resolveOnboardingDestination`, `buildOnboardingPath`, `withDestinationLocale`); `apps/app/lib/server/onboarding.ts` (`resolvePendingOnboarding`, `resolveOnboardingRedirect`) |
| 10.5 Desvio no layout | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` |
| 10.4 Rota do onboarding | `apps/app/app/[locale]/(authenticated)/onboarding/page.tsx`, `loading.tsx`, `(components)/OnboardingClient.tsx`, `(components)/OnboardingProfileStep.tsx`, `(components)/OnboardingPreferencesStep.tsx`, `(hooks)/useOnboardingMutations.tsx`, `(validations)/onboardingFormSchema.ts` |
| 10.6 i18n | `packages/internationalization/translations/apps/app/pages/onboarding/index.ts` (novo); `translations/apps/app/pages/index.ts` (registro nos 3 idiomas); `translations/packages/shared/utils.ts` (`apiErrors`) |
| 10.5 Docs | `docs/SETUP.md` (linha `ONBOARDING_ENABLED`); `docs/AUTH-PANEL.md` (fora do plano, ver desvio 6) |

Testes:

| Arquivo | Casos |
|---|---|
| `apps/api/__tests__/onboardingState.test.ts` (novo) | 14 |
| `apps/api/__tests__/accountOnboardingRoute.test.ts` (novo) | 12 |
| `apps/api/__tests__/signUpProfile.test.ts` (novo) | 2 |
| `apps/api/__tests__/googleSignInProfile.test.ts` (estendido) | +1 |
| `apps/app/__tests__/onboardingState.test.ts` (novo) | 15 |
| `apps/app/__tests__/onboardingRedirect.test.ts` (novo) | 8 |
| `apps/app/__tests__/proxy.test.ts` (estendido) | +2 |
| `apps/app/__tests__/onboardingClient.test.tsx` (novo) | 10 |

## Contrato e raio de impacto

- `UserDTO.onboarding?` é opcional; nenhum consumidor existente quebra (`pnpm turbo run typecheck` nos 4
  workspaces tocados passou).
- `ONBOARDING_STEPS` é runtime dentro de `types/`, como o `enum UserType` já era. É lido pela API
  (`account.schema.ts`, `lib/onboarding.ts`) e pela app (`shared/lib/onboarding.ts`, `OnboardingClient`).
- `apiClient.account.advanceOnboarding` só é chamado por `useOnboardingMutations`.
- `createDefaultUserProfile` é chamado por `getMergedUserByUid`, `getMergedUserFromIdToken` e agora por
  `POST /auth/sign-up`. Todo perfil novo criado por esses caminhos nasce com
  `onboarding: { step: "profile", completedAt: null }`. `POST /users` (admin) não mudou.
- `apps/app/proxy.ts` agora devolve `NextResponse.next({ request: { headers } })` em todo pass-through,
  inclusive nas rotas públicas.

## Códigos de erro novos

`ONBOARDING_STEP_NOT_SKIPPABLE` (400), `ONBOARDING_STEP_OUT_OF_ORDER` (409) e `ONBOARDING_UPDATE_FAILED`
(500), os três em `apiErrors` de pt-br, en e es. A paridade passa
(`pnpm --filter @repo/internationalization test` → 44/44).

## Desvios do plano

1. **`isOnboardingEnabled` virou função pura em `shared/lib/onboarding.ts`**, recebendo o valor cru
   (`isOnboardingEnabled(env.ONBOARDING_ENABLED)`). O plano a punha em `lib/server` lendo `env` direto.
   Assim o teste cobre `undefined`, `""`, `"true"` e `"false"` sem mockar env. A comparação faz `trim` e
   `toLowerCase`, então `"FALSE"` e `" false "` também desligam.
2. **`resolvePendingOnboarding()` em `lib/server/onboarding.ts`**, usado pelo layout comum e pela página.
   O plano descrevia o gate da página à parte; os dois precisam da mesma regra (interruptor, perfil
   `common`, estado pendente), e agora ela existe num lugar só.
3. **Guard de clique duplo por `useRef` no `OnboardingClient`**, além do `isLoading` do `Footer`. O plano
   previa só o retorno antecipado no "Pular" lendo `isPending`, que é o valor do render anterior: dois
   cliques no mesmo frame passariam. A API já é idempotente nesse caso (o segundo pedido cai em
   `unchanged`), então o ref só evita a segunda requisição.
4. **Troca de idioma no fim faz `router.replace` + `router.refresh()`**, e não só `replace`. O root layout
   (`app/layout.tsx`) resolve o locale e não re-renderiza em navegação suave; o `AccountPreferencesForm`
   usa o mesmo par pelo mesmo motivo. Quando o idioma não muda, é só `replace`.
5. **`noValidate` no formulário do passo 1.** Sem ele o `required` do input faria o navegador barrar o
   envio vazio com a mensagem nativa dele, e a mensagem traduzida do Zod nunca apareceria.
6. **`docs/AUTH-PANEL.md` ganhou o desvio de onboarding na cadeia de gates** (seção 3). O documento é a
   referência de auth que `apps/app/CLAUDE.md` manda ler, e sem a linha ele descreveria uma cadeia que o
   código não segue mais.
7. **Título e subtítulo do fluxo ficam acima do card**; o card leva o progresso, o título e a descrição do
   passo. É só arranjo visual das chaves que o plano já previa.
8. **`withDestinationLocale`** é um helper novo em `shared/lib/onboarding.ts` para trocar o segmento de
   locale do destino (D7). O plano descrevia o comportamento sem nomear a função.

Nenhuma decisão do plano estava errada a ponto de ser revertida.

## Decisões em aberto

Nenhuma nova. P1 a P4 do plano seguem com a opção adotada lá. A P2 (botão "Sair") continua valendo a pena
reavaliar no `/test`: a tela não tem navbar, e sair antes de preencher o nome exige fechar a aba.

## Validação

| Gate | Comando | Resultado |
|---|---|---|
| Lint/format | `pnpm check` | 666 arquivos, sem erro (depois de `pnpm fix` e de trocar 4 números mágicos) |
| Typecheck | `pnpm turbo run typecheck --filter=app --filter=api --filter=@repo/sdk --filter=@repo/internationalization` | 4/4 tasks ok |
| Testes | `pnpm turbo run typecheck test --filter=app --filter=api --filter=@repo/sdk --filter=@repo/internationalization` | api 60 arquivos / 680 testes; app 68 / 497 (rodada final `pnpm turbo run typecheck test --filter=app`); internationalization 5 / 44 |
| Build com interruptor desligado | `ONBOARDING_ENABLED="false" pnpm exec next build` em `apps/app` | build concluído, rota `ƒ /[locale]/onboarding` listada |
| Boot com interruptor vazio | `ONBOARDING_ENABLED="" pnpm exec next start -p 3000` + `curl` | `/pt-br/onboarding` anônimo → `307` para `/pt-br/sign-in?redirect=%2Fpt-br%2Fonboarding`; `/pt-br/sign-in` → `200`. Processo derrubado pelo PID, porta 3000 livre depois; `.next` do build removido |

Modo degradado coberto por teste:

- Interruptor em `"false"` → layout não desvia (`onboardingRedirect.test.ts`, "sends nobody when the
  switch is off"); `""` mantém ligado ("keeps the flow on when the switch is empty").
- Perfil legado → layout não desvia (`onboardingRedirect.test.ts`) e a API responde `200 { data: null }`
  sem escrever (`accountOnboardingRoute.test.ts`).
- Campo malformado → tratado como concluído na app e na API (`onboardingState.test.ts` dos dois lados).
- Falha de escrita → `500 { error: { code: "ONBOARDING_UPDATE_FAILED" } }`, corpo sem mensagem interna
  (`accountOnboardingRoute.test.ts`).

## A verificar no `/test`

Nada abaixo foi medido com a app e a API de pé; o smoke acima não passou da tela de sign-in.

1. **Cadastro novo cai no onboarding num salto só.** Cadastrar `qa-onboarding@example.com` sob o emulador
   e conferir que a primeira navegação autenticada termina em `/pt-br/onboarding`, sem o painel piscar.
   Instrumento sugerido: `curl -i` com o cookie de sessão em `/pt-br` → `307` com `location`
   `/pt-br/onboarding`.
2. **Deep link.** Com onboarding pendente, `curl -i` em `/pt-br/entities/create` → `location`
   `/pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fcreate`; concluir e conferir a URL final.
3. **Router cache depois de concluir.** O `router.replace(destination)` entra em `(common)`, que tinha
   redirecionado antes. O esperado é o layout renderizar de novo no servidor e não desviar, mas não medi se
   o cache do router do cliente reaproveita alguma resposta anterior.
4. **Troca de idioma no fim.** Concluir escolhendo English: destino em `/en/...`, textos em inglês na
   primeira pintura, cookie `x-locale=en`. O par `replace` + `refresh` (desvio 4) precisa ser conferido
   no navegador; a regra do repo registra que `push` e `refresh` no mesmo tick podem se cancelar.
5. **409 ressincroniza.** `curl` autenticado com `{"step":"preferences","outcome":"completed"}` quando o
   passo atual é `profile` → `409 ONBOARDING_STEP_OUT_OF_ORDER`. O teste de componente cobre toast +
   `router.refresh()` com o erro mockado; falta ver a tela voltar ao passo certo depois do refresh.
6. **Admin personificando uma conta pendente** vê o painel comum sem desvio. Coberto no helper com o
   snapshot mockado; falta conferir com cookies reais de impersonação.
7. **Layout e tema.** Light, dark e mobile 375 px nas duas telas; o `Footer` é `sticky` dentro do card e
   pode ficar estranho em tela baixa.
8. **Nome preenchido pelo Google** aparece como default no passo 1 (`account.displayName`).

## Lacunas de teste conhecidas

- O `page.tsx` do onboarding (gate que redireciona para o destino, prefetch) não tem teste de RSC; a regra
  que ele usa está coberta em `onboardingRedirect.test.ts` e `onboardingState.test.ts`.
- O `(common)/layout.tsx` não tem teste próprio chamando `redirect`; o teste bate no
  `resolveOnboardingRedirect`.
