# Handoff do `/develop`: acesso por plano espelhado na API

Rodada autônoma (`/cycle --no-audit`), 2026-09-30. Nenhuma branch criada, nada commitado, nada no índice.
Nenhum app, servidor de dev ou emulador foi levantado nesta etapa.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 Contrato | `packages/sdk/src/types/payments/plan-access.ts` (novo), `payments/index.ts`, `user/user.ts`, `account/account.ts` |
| 10.2 Checagem e guard | `apps/api/(shared)/lib/plan-access.ts` (novo), `apps/api/app/(guards)/plan.ts` (novo), `apps/api/(shared)/lib/entity-plan.ts` (novo), `apps/api/app/(routes)/entities/route.ts` |
| 10.3 Webhook | `apps/api/(shared)/lib/billing-state.ts` (`toEntitlementsState`, `decideEntitlementsWrite`), `apps/api/(shared)/lib/billing.ts` (`listActiveEntitlementKeys`), `apps/api/app/(routes)/webhooks/payments/route.ts` (`reconcileEntitlements` + `case`) |
| 10.4 Persistência | `apps/api/(shared)/repositories/user.repository.ts` (`applyEntitlementsState`) |
| 10.5 Conta e exportação | `apps/api/(shared)/lib/account-avatar.ts`, `apps/api/app/(routes)/account/route.ts` (`toAccountResponse` no GET e no PUT), `apps/api/(shared)/lib/account-export.ts` |
| 10.6 Env | `apps/api/env.ts`, `apps/api/.env.example`, `apps/app/env.ts`, `apps/app/.env.example` |
| 10.7 Front | `apps/app/shared/components/ui/PlanGate.tsx` (novo), `apps/app/shared/lib/entityPlanRequirement.ts` (novo), `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx` |
| 10.8 i18n | `packages/internationalization/translations/packages/shared/utils.ts` (`apiErrors`), `translations/apps/app/shared/index.ts` (`planGate`) |
| 10.9 Documentação | `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md` §12, `.claude/skills/payments-flow/SKILL.md` |
| 9. Testes novos | `apps/api/__tests__/planAccess.test.ts`, `planGuard.test.ts`, `entitiesRoutePlanGate.test.ts`, `entityPlanEnv.test.ts`; `apps/app/__tests__/planGate.test.tsx`, `entityPlanRequirement.test.ts`, `entityPlanRequirementEnv.test.ts`, `entityCreatePlanGate.test.tsx` |
| 9. Testes estendidos | `apps/api/__tests__/billingState.test.ts`, `userRepositoryBilling.test.ts`, `paymentsWebhookRoute.test.ts`, `accountRoute.test.ts`, `accountExportRoute.test.ts` |
| 9. Mocks em testes existentes | `apps/api/__tests__/entitiesRouteList.test.ts`, `entitiesRouteImpersonation.test.ts`, `entityPhotoReference.test.ts`, `storageUpload.emulator.test.ts` |

`specs/plan-entitlements.md` já vinha modificado do `/analyze` (frontmatter) e não foi tocado aqui.

## Contrato e raio de impacto

- **Novo:** `EntitlementsState`/`EntitlementsStateDTO`, `PlanRequirement`, `PLAN_ACCESS_DENIALS`,
  `PlanAccessDenial`, `PlanAccessDTO` e a função `planAccessDenial`, a primeira função de runtime em
  `packages/sdk/src/types`. Usada pela API (`plan-access.ts`) e pelo app (`PlanGate.tsx`).
- **`UserDTO.entitlements?`**: lido por `toPlanAccess` através de `ctx.subjectProfile`.
- **`AccountDTO`**: omite `entitlements` do `UserWithAuthDTO`, reexpõe como DTO e ganha `planAccess`
  obrigatório. Consumidores no app: `useMyAccount` e os componentes de `account/(components)/`. Nenhum monta
  um `AccountDTO` à mão; `accountPreferencesForm.test.tsx` usa `as unknown as AccountDTO`.
  `pnpm --filter app typecheck` passou sem tocar nesses arquivos.
- **`AccountDataExportDTO.account`** passa a `Omit<AccountDTO, "avatarUrl" | "planAccess">`.
- **`withAvatarUrl`** devolve `Omit<AccountDTO, "planAccess">`; quem acrescenta o campo é
  `toAccountResponse`, na rota.
- Nenhuma action nova no SDK.

## Códigos de erro novos

`PLAN_SUBSCRIPTION_REQUIRED` e `PLAN_FEATURE_REQUIRED`, ambos 403, em `apiErrors` nos 3 idiomas. A paridade
passou em `pnpm --filter @repo/internationalization test` (6 arquivos, 59 testes) e o
`apps/app/__tests__/apiErrorCopy.test.ts` passou dentro da suíte do app.

## Desvios do plano

1. **`Button` do design system não tem `asChild`.** O esqueleto do plano usava `<Button asChild><Link>`. O
   `Button` (`packages/design-system/components/ui/button.tsx`) não aceita a prop e embrulha os filhos num
   `<div>`. O convite usa `<Link className={buttonVariants()}>`, o mesmo padrão de
   `apps/app/shared/components/ui/NotFoundPage.tsx`.
2. **O plano não previu o teste que varre `app/(guards)/`.** `apps/api/__tests__/impersonationReadOnly.test.ts`
   exige que todo arquivo com `export function require*Api` contenha a string
   `assertReadOnlyWhileImpersonating`. O `plan.ts` herda a recusa porque compõe `requireCommonPanelApi`, e o
   teste reprovou (`plan.ts calls assertReadOnlyWhileImpersonating`). Estendi o teste em vez de citar a
   função num comentário só para passar: os guards base (`admin.ts`, `common-panel.ts`) continuam obrigados
   a chamar o helper, e um guard composto passa se chamar o helper ou se fizer `return require(CommonPanel|Admin)Api(...)`.
   O comportamento do composto é provado em `planGuard.test.ts` ("refuses an impersonated write as
   read-only, never with a plan code"). O revisor deve julgar se isso afrouxa a regra; a minha leitura é que
   não, porque a invariante é a recusa e ela tem teste de comportamento próprio.
3. **Os testes existentes precisaram também de `vi.mock("@/env")`, não só de `@/(shared)/lib/billing`.** A
   rota de `entities` passa a importar `entity-plan.ts`, que lê `@/env`, e o `createEnv` da API valida tudo
   com `NODE_ENV=test` (`Invalid environment variables` nas três suítes de `entities`). O mock é
   `{ env: {} }`, o que reproduz a variável ausente. No `accountRoute.test.ts` e no
   `storageUpload.emulator.test.ts` bastou o mock de `billing`.
4. **Constante no lugar do 80.** O Biome recusa número mágico (`lint/style/noMagicNumbers`) em `env.ts`; os
   dois `env.ts` declaram `STRIPE_LOOKUP_KEY_MAX_LENGTH = 80`.
5. **`.env.example` da API:** a variável da demo ficou no bloco `# Client`, junto das outras `NEXT_PUBLIC_*`,
   e não ao lado das chaves Stripe.
6. **`PRE-PRODUCTION.md` §12:** além do que o plano listou, o passo a passo ganhou o passo 5 (cadastrar os
   recursos no Dashboard) e o TTL passou a ser o passo 6. A referência `billing-state.ts:141-147` foi trocada
   por `:207-214` (P14), conferida com `sed -n 200,216p` no arquivo atual.
7. **`PAYMENTS.md`, "Fora do corte":** sai "bloquear acesso por plano" e entram os itens que a spec deixa de
   fora (bloqueio em `past_due`/`unpaid`/`paused`, cotas e créditos, assento por membro, tela de
   administração de recursos).
8. **Dois testes fora do plano**, `apps/api/__tests__/entityPlanEnv.test.ts` e
   `apps/app/__tests__/entityPlanRequirementEnv.test.ts`: carregam o `env.ts` real (sem mock) com a variável
   em `""` e com um valor, e conferem o requisito resultante. Os demais testes mockam `@/env`, então sem
   eles nada provava que o valor do `.env.example` passa pela validação.

Nenhuma decisão P1 a P14 foi revertida. Não achei decisão errada no plano.

## Decisões em aberto

Nenhuma nova. P3 (`unpaid` e `paused` passam pelo gate por status) continua sendo escolha do usuário, como o
plano registrou. O desvio 2 é o único ponto que pede o olhar do revisor.

## Validação (medida)

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 821 arquivos, sem erro |
| Gates do CI (sem `test:emulator`) | `pnpm turbo run lint typecheck test` | 28 de 28 tarefas com sucesso na última rodada (23 do cache) |
| Testes da API | `pnpm turbo run test --filter=api` | 83 arquivos, 1110 testes. A linha de base antes da mudança era 79 arquivos e 1036 testes (`pnpm --filter api test`) |
| Testes do app | `pnpm turbo run test --filter=app` | 95 arquivos, 772 testes |
| i18n | `pnpm --filter @repo/internationalization test` | 6 arquivos, 59 testes |
| Typecheck | `pnpm --filter api typecheck`, `pnpm --filter app typecheck` | sem erro |
| Build em modo degradado | `pnpm --filter api build`, `pnpm --filter app build` | os dois concluíram (`app` com exit 0 e nenhuma linha com "error" no log). O `.env` local da API tem `STRIPE_SECRET_KEY=""` e nenhum dos dois `.env` define `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` |

O modo degradado também tem teste: `planAccess.test.ts` e `planGuard.test.ts` ("lets everyone through while
billing is off"), `entitiesRoutePlanGate.test.ts` (variável ausente, variável `""` e cobrança desligada com a
variável preenchida criam com 201), `accountRoute.test.ts` (`enforced: false` com a cobrança desligada),
`entityPlanRequirement.test.ts` (`""` vira `null`) e `entityCreatePlanGate.test.tsx` (sem a variável, o
formulário aparece e `useMyAccount` nem é chamado).

## A verificar no `/test`

Nada abaixo foi medido nesta etapa: não subi app, API nem emulador.

- `storageUpload.emulator.test.ts` ganhou o mock de `@/(shared)/lib/billing` e não foi executado. Repro:
  `pnpm --filter api test:emulator`.
- Os fluxos 1 a 8 da seção 10 do plano, com o mesmo roteiro de produção de estado (chaves fictícias com o
  prefixo certo, webhook assinado com `generateTestHeaderString`, `stripeCustomerId` gravado no emulador).
  Em especial: `POST /entities` direto com o token responde 403 `PLAN_SUBSCRIPTION_REQUIRED` enquanto a UI
  mostra o convite, e o link "Ver planos" leva a `/<locale>/account?tab=billing`.
- O convite renderizado: light, dark e mobile nos 3 idiomas. Os testes de componente só conferem texto e
  `href` em pt-br; o layout do `Card` dentro do `Container contentOnly` não foi olhado.
- O toast traduzido de `PLAN_FEATURE_REQUIRED` quando a tela está desatualizada (recurso revogado com a tela
  aberta e clique em salvar). Nenhum teste cobre o caminho `handleClientError` com esse código.
- `GET /account` real devolve `entitlements.lastEventAt` como ISO: o teste da rota usa o registro já
  mesclado (mock de `getMergedUserByFirestoreDocId`), então a serialização do `Timestamp` gravado pela
  transação só se prova contra o emulador.
- Admin personificando um titular sem plano vê o convite (fluxo 7). Coberto só na API (`planGuard.test.ts`,
  "judges an impersonated read by the subject's plan").

## Lacunas de teste conhecidas

- `listActiveEntitlementKeys` não tem teste unitário próprio; no webhook ele é mockado. A paginação real fica
  🔒 (seção 11 do plano).
- Os dois testes de `env.ts` real provam que `""` carrega e vira "sem gate", mas não isolam o `|| undefined`:
  `z.string().max(80).optional()` também aceitaria a string vazia. O build local rodou sem a variável
  definida, não com ela vazia.
- Os critérios 🔒 da seção 11 do plano continuam sem como fechar sem conta Stripe.
