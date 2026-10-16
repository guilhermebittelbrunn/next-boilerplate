# Handoff do `/develop`: pricing-page-catalog

Rodada autônoma do `/cycle`, 2026-10-16. Nenhuma pergunta ao usuário. Nada foi commitado nem preparado no
índice (`git diff --cached --stat` vazio). Nenhum arquivo de `specs/` foi tocado.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 Contrato SDK | `packages/sdk/src/actions/payments/action.ts` (`listCatalog()`); teste novo `packages/sdk/__tests__/paymentsCatalog.test.ts` |
| 10.2 Cache e rota pública | novos `apps/api/(shared)/lib/plan-catalog-cache.ts`, `apps/api/app/(routes)/payments/catalog/route.ts`, `apps/api/__tests__/planCatalogCache.test.ts`, `apps/api/__tests__/paymentsCatalogRoute.test.ts`; `apps/api/.env.example` |
| 10.3 Proxy da API (docblock) | `apps/api/proxy.ts`, `apps/api/__tests__/proxyArcjetKey.test.ts` (+1 caso) |
| 10.5 Proxy da app | `apps/app/proxy.ts`; `apps/app/__tests__/proxy.test.ts` (+5), `onboardingRedirect.test.ts` (+1), `onboardingState.test.ts` (+1) |
| 10.6 Links cadastro ↔ login | novo `apps/app/shared/lib/authRedirectLink.ts`; `sign-up/page.tsx`, `sign-up/components/SignUpFormClient.tsx`, `sign-in/page.tsx`, `sign-in/components/SignInForm.tsx`; testes `authRedirectLink.test.ts` (novo), `signUpFormApi.test.tsx` (+1), `signInEnterResubmit.test.tsx` (+1) |
| 10.7 Destaque na aba | `AccountBillingPanel.tsx`, `BillingPlanCard.tsx`; `accountBillingPanel.test.tsx` (+3) |
| 10.8 Formatador em `@repo/shared` | `apps/app/shared/lib/formatPlanPrice.ts` → `packages/shared/utils/helpers/formatPlanPrice.ts`; teste movido para `packages/shared/__tests__/formatPlanPrice.test.ts`; barril `packages/shared/utils/helpers/index.ts`; imports em `AccountBillingPanel.tsx`, `BillingPlanCard.tsx`, `BillingRevenueCard.tsx`, `billingInsights.ts` |
| 10.9 Landing | `apps/web/app/[locale]/pricing/page.tsx` (reescrito); novos `components/plan-card.tsx`, `components/contact-plan-card.tsx`, `components/pricing-empty-state.tsx`, `apps/web/shared/lib/planCatalog.ts`; `apps/web/shared/lib/pricingCta.ts`; testes `planCatalog.test.ts` (novo), `pricingCta.test.ts` e `pricingPage.test.tsx` (reescritos) |
| 10.10 i18n | `translations/apps/web/pages/pricing/index.ts`, `translations/apps/app/pages/common/account.ts` (`billing.chosenPlan`) |
| 10.11 Docs | `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md`, `docs/SECURITY.md`, `docs/FORKING.md`, `docs/SUBPROCESSORS.md`, `.claude/skills/payments-flow/SKILL.md`; referências de linha em `docs/ROPA.md` e `docs/INCIDENT-RESPONSE.md` (ver desvio 5) |

## Contrato

- `PaymentsActions.listCatalog(): Promise<PaymentPlansDTO>`, `GET /payments/catalog`, sem credencial e com
  `timeout: 5000`. Tipos `PlanDTO` e `PaymentPlansDTO` sem mudança.
- Quem consome: só `apps/web/shared/lib/planCatalog.ts`. `listPlans()` segue igual e continua sendo a fonte
  da aba de cobrança.
- `SignInForm` e `SignUpFormClient` ganharam a prop opcional `redirect`. Os testes que os renderizam sem ela
  continuam passando.
- `@repo/shared` passou a exportar `formatPlanPrice`, `describePlanPrice`, `formatPeriodEnd`,
  `toBcp47Locale` e o tipo `PlanPriceCopy`. Nenhum nome colide no barril (conferido com `grep` nos
  `packages/`).

## Códigos de erro

Nenhum novo. A rota responde `PAYMENTS_PROVIDER_UNAVAILABLE` (503), que já existe em `apiErrors` nos três
idiomas.

## Desvios do plano

Nenhuma decisão do plano estava errada. Os desvios abaixo são acréscimos ou ajustes de forma.

1. **Timeout de 5 s em `listCatalog()`.** O plano não previa. A landing renderiza o catálogo a cada visita, e
   o axios não tem prazo por padrão: uma API travada seguraria a página. Segue o precedente de
   `SESSION_STANDING_TIMEOUT_MS` em `packages/sdk/src/actions/auth/action.ts`. Descartado: deixar sem prazo.
2. **Linha de log da landing com `reason`.** Além de `status`, a linha leva o `code` do axios
   (`ECONNREFUSED`, `ECONNABORTED`, `ERR_BAD_RESPONSE`), para distinguir API desligada, timeout e erro de
   resposta. Nenhum dado pessoal entra.
3. **Estado vazio em arquivo próprio** (`components/pricing-empty-state.tsx`), opção que o plano deixava em
   aberto. Ele ocupa duas colunas no `xl`, para o card de contato fechar a linha.
4. **Nome do plano como `h2` dentro do `CardTitle`**, na landing, e título do estado vazio também como `h2`,
   para a hierarquia de títulos seguir o novo `h1`.
5. **Referências de linha nos docs.** As 4 linhas do docblock em `apps/api/proxy.ts` deslocaram trechos que
   os docs citam por linha. Atualizei `docs/SECURITY.md` (`45-58`→`49-62`, `:70`→`:74`), `docs/ROPA.md`
   (`45-58`→`49-62`, `64-76`→`68-80`), `docs/INCIDENT-RESPONSE.md` e `docs/SUBPROCESSORS.md` (`64-76`→`68-80`,
   `:147`→`:151`), e em `docs/PRE-PRODUCTION.md` a linha do cookie `x-locale` em `apps/app/proxy.ts`
   (`214,218`→`230,234`). Em `SECURITY.md` recontei os caminhos limitados (12) e atualizei a data da medição.
   **`specs/` ficou com as referências antigas**, porque esta etapa não edita `specs/`. Para o
   `/spec --sync`: `apps/api/proxy.ts:45-58` em `specs/BACKLOG.md` (602, 925, 956),
   `specs/contact-support-channel.md:54`, `specs/magic-link-sign-in.md:44`,
   `specs/social-sign-in-providers.md:41`, `specs/pricing-page-catalog.md:124`; `:47`, `:70`, `:109`, `:125`
   em `specs/BACKLOG.md:949,972` e `specs/observability-logging.md:49,80,169,209`; e as citações de
   `apps/app/proxy.ts` acima da linha 154 seguem válidas, mas as de 197 em diante em `specs/BACKLOG.md`
   (603, 604, 928, 986, 987, 1212, 1213) deslocaram entre 13 e 17 linhas.
6. **Arquivos movidos com `mv`, não `git mv`**, porque esta etapa não mexe no índice. Com a divisão de
   commits do plano (10.13, itens 4 e 5), a adição em `packages/shared` e a remoção em `apps/app` ficam em
   commits diferentes, e o git registra adição e remoção em vez de rename. O conteúdo do arquivo e do teste
   não mudou, fora o caminho do import no teste.
7. **`docs/FORKING.md` §7.2** também ganhou uma frase sobre a landing, além da linha `:149` que o plano
   listava.
8. **Testes além da lista do plano**: o teste do SDK (desvio 1); no proxy da app, um alvo com barra invertida
   depois do locale (`/pt-br/\evil.example.com`) que prova que o host da resposta continua o da requisição;
   na landing, um `h1` único e o estado vazio nos três idiomas.

## Decisões em aberto / bloqueios

Nenhum bloqueio. Os riscos e achados do plano continuam como estavam (cache por instância, decodificação
dupla em `postAuthRedirectTarget`, sessão expirada perdendo a query).

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint | `pnpm check` | 901 arquivos, nenhuma correção |
| Typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=web --filter=@repo/sdk --filter=@repo/internationalization` | 5/5 (`@repo/shared` não tem task de typecheck; o formatador é checado pela `app` e pela `web`, que o importam) |
| Testes | `pnpm turbo run test --filter=api --filter=app --filter=web --filter=@repo/sdk --filter=@repo/shared --filter=@repo/internationalization` | api 97 arquivos / 1236 testes; app 106 / 849; web 20 / 131; shared 5 / 56; i18n 7 / 67 (paridade incluída); sdk 2 / 10 (depois do teste novo) |
| Linha do CI | `pnpm turbo run lint typecheck test` | 29/29 tasks |

Mutação, para conferir que os testes novos falham sem o código: com `/payments/catalog` na lista de rate limit,
o caso novo de `proxyArcjetKey.test.ts` falha (1 de 3). Com o `apps/app/proxy.ts` de `HEAD`, 4 dos 5 casos
novos de `proxy.test.ts` falham; o quinto (barra invertida) passa nas duas versões, porque guarda contra
regressão.

**Smoke em `next dev`, não é validação.** Com as chaves Stripe vazias em `apps/api/.env`:
`curl -i http://localhost:3002/payments/catalog` → `HTTP/1.1 200 OK` e `{"data":{"enabled":false,"plans":[]}}`.
`curl http://localhost:3001/{pt-br,en,es}/pricing` → 200 nos três, cópia do estado vazio presente, zero links
`sign-up?redirect`, um `<h1`. Com a API derrubada, `/en/pricing` → 200 com o estado vazio, e o log da web
registrou `[payments] catalog-unavailable reason=ECONNREFUSED`. Os dois servidores que subi foram derrubados;
as portas 3000, 3001 e 3002 terminaram livres (`lsof -ti tcp:<porta>` vazio).

## A verificar no `/test`

- **Fluxo do visitante novo** (plano, seção 11, fluxos 4 e 5): CTA da landing → cadastro da app → onboarding
  com `plan` no `redirect` → aba com o selo só no plano escolhido, inclusive trocando o idioma no fim do
  onboarding. Os saltos têm teste unitário cada um; o caminho inteiro no browser não foi percorrido.
- **Visitante já logado clicando o CTA**: a `Location` sem `%3F` e sem 404. O teste do proxy usa `URL` do
  WHATWG no lugar do `NextURL` real; conferir a resposta do servidor (`curl -i` com o cookie de sessão).
- **"Entrar" a partir do cadastro e deep link anônimo** (fluxos 7 e 8).
- **503 da Stripe**: API com `STRIPE_SECRET_KEY=sk_test_offline_qa` e `STRIPE_WEBHOOK_SECRET=whsec_offline_qa`
  → `GET /payments/catalog` 503 `PAYMENTS_PROVIDER_UNAVAILABLE`, landing no estado vazio e linha
  `status=503 reason=ERR_BAD_RESPONSE`. Só coberto por teste com mocks.
- **Modo `simple`** na web: estado vazio e zero acessos ao stub. Só coberto por `planCatalog.test.ts`.
- **Catálogo com planos na landing**, pelo stub da seção 11: preço "R$ 29,00 / mês", "R$29.00 / month",
  "R$ 29,00 / mes"; grade no mobile (um card por linha), light e dark.
- **Selo e anel do destaque**: anel visível no dark; "Plan elegido" no card estreito em `es`.
- **Build sem Stripe e sem API** (fluxo 9): `pnpm --filter api build` e `pnpm --filter web build`. Não rodei.

## Lacunas de teste conhecidas

- Nenhum teste renderiza as páginas `sign-in/page.tsx` e `sign-up/page.tsx` (Server Components que leem
  `searchParams.redirect`); os testes cobrem o formulário com a prop.
- O proxy da app é testado com `URL` comum, não com o `NextURL` do Next.
- O layout da landing (grade, colunas do estado vazio, tema) não tem teste automatizado; é da passada de
  browser.
