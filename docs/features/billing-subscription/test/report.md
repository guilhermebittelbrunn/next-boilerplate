# Relatório de QA: assinatura Stripe de ponta a ponta

Rodada autônoma do `/cycle`, workspace `port-vila`, branch `run-full-task-cycle` (não protegida; o nome
fora da regex já está registrado no `review/review.md`). Não criei branch, não commitei e não usei
`git stash`. O único arquivo de código que alterei foi `apps/app/__tests__/accountBillingPanel.test.tsx`.

## Placar

| Resultado | Critérios |
|---|---|
| ✅ aprovado | 19 |
| ❌ reprovado | 0 |
| 🔒 não verificado (só conta Stripe real prova) | 5 |

Dois defeitos de produção com repro, os dois com causa anterior a esta entrega: o locale dos CTAs de
`/pricing` vem de um cookie que chega atrasado (D1) e o texto de `past_due` tem contraste 2,0:1 no dark (D2).
Nenhum deles reprova critério da feature; detalhes na seção "Defeitos". Depois da rodada 2 do `/review`, remedi o D1: o href dos CTAs de plano está
corrigido (seção "Remedição do D1"). O D2 foi para o backlog sem mudança de código.

## Cobertura automatizada

| Comando | Resultado |
|---|---|
| `pnpm test` (raiz, antes do teste novo, sem `--force`) | 10/10 tasks, 7 em cache, 43,6 s. api 804/804 (66 arquivos), app 554/554 (73), web 39/39 (7), payments 22/22 (4), internationalization 44/44 (5), shared 44, security 31, email 137, auth 101, analytics 34 |
| `pnpm --filter app exec vitest run __tests__/accountBillingPanel.test.tsx` | 27/27 (eram 22) |
| Prova de mutação: `awaitingConfirmation \|\|` trocado por `false \|\|` em `actionsDisabled`, arquivo restaurado em seguida (conferido com `cmp`) | 2 dos 5 casos novos falham, como esperado |
| `pnpm test` (raiz, depois do teste novo, sem `--force`) | 10/10 tasks, 9 em cache, 34,6 s. app 559/559; os demais iguais |
| `pnpm --filter app typecheck` | código 0 |
| `pnpm exec biome check apps/app/__tests__/accountBillingPanel.test.tsx` | limpo |
| Paridade de i18n | 44/44 no `pnpm test` da raiz (o diff de i18n não mudou depois do `/review`) |
| `env -u STRIPE_SECRET_KEY -u STRIPE_WEBHOOK_SECRET pnpm --filter api build` | código 0 |
| `env -u STRIPE_SECRET_KEY -u STRIPE_WEBHOOK_SECRET pnpm --filter app build` | código 0 |
| `STRIPE_SECRET_KEY=pk_test_wrong_slot pnpm --filter api build` | código 1 |

Não remedi `pnpm check` nem o typecheck dos demais workspaces: o `/review` mediu os dois e depois dele só
entrou o arquivo de teste acima.

### Testes criados

Cinco casos novos em `apps/app/__tests__/accountBillingPanel.test.tsx`, bloco "volta do checkout":

- `com success e sem assinatura viva, trava assinar para não abrir uma segunda assinatura`: os dois
  "Assinar" desabilitados e o clique não chama o checkout;
- `com success e assinatura anterior cancelada, também trava assinar`: `canceled` não conta como viva, o
  aviso de confirmação aparece e a revalidação liga;
- `com success e a assinatura já viva, libera gerenciar`;
- `com tab=billing, assinar continua habilitado` e `com tab=billing&checkout=canceled, assinar continua
  habilitado`: o clique dispara `{ priceId: "price_pro" }`.

### Decisões de custo de teste

Nenhum teste da faixa cara. A trava do painel é lógica de componente, provada com mocks do hook de planos,
das mutations e do `useSearchParams`.

A transação `applySubscriptionState` e a consulta `findByStripeCustomerId` estão na lista fechada que
justificaria teste contra o emulador. Não criei esse teste: a suíte não tem infraestrutura de Vitest contra
emulador, e montá-la é o escopo da spec `e2e-testing`. Rodei os dois contra o emulador pelo harness da
rodada B (resultado abaixo). Como teste versionado, a lacuna continua aberta.

Rotas e módulos tocados sem teste novo, e o que já cobria cada um:

| Módulo | Cobertura existente |
|---|---|
| `payments/plans`, `checkout`, `portal` | `paymentsPlansRoute` (11), `paymentsCheckoutRoute` (31), `paymentsPortalRoute` (8), com guard real |
| webhook | `paymentsWebhookRoute` (30, três assinados com `generateTestHeaderString`) |
| `billing-state.ts` | `billingState` (33) |
| repositórios | `userRepositoryBilling` (8), `paymentEventRepository` (4) |
| expurgo e exportação | `accountErasure` (14), `accountDeletionRoute`, `accountExportRoute` |
| `packages/payments` | `keys`, `paymentsConfig`, `aiToolkit` (14) |
| app | `formatPlanPrice` (12), `usePaymentsMutations` (4), `useCheckoutConfirmation` (4), `accountTabsOverflow`, `commonNavRoutes`, `accountApiErrorCopy` |
| web | `pricingCta` (4) |

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|---|---|
| 1 | Transação e `findByStripeCustomerId` contra o emulador | **Confirmado.** `customer.subscription.created` sem `metadata.profileId` achou o perfil só por `stripeCustomerId=cus_qa` e gravou `subscription` com `currentPeriodEnd` e `lastEventAt` como `Timestamp`. `GET /account` devolveu `"currentPeriodEnd":"2026-11-04T12:00:00.000Z"`. Reenvio do mesmo `id`: `{"ok":true,"duplicate":true}` e documento idêntico, `updatedAt` inclusive. `updated` com `created` 110 s mais antigo: log `result=skipped` e documento inalterado |
| 2 | Trava do "Assinar" na volta do checkout | **Confirmado** (teste novo e browser). Com catálogo injetado no browser e `?checkout=success`: aviso "Confirmando o pagamento. A assinatura aparece aqui em instantes.", botões `Assinar disabled=true` (en "Subscribe", es "Suscribirse"). Com `?checkout=canceled`: `disabled=false`. A aba releu `GET /account` 10 vezes, de 4,0 s a 31,0 s, a cada 3 s, e parou |
| 3 | Aba degradada, skeleton e 200/503 | **Confirmado.** Texto exato nos três idiomas, light, dark e mobile (390 px, sem estouro de largura). O skeleton existe (3 blocos, painel de 256 px) e o placeholder ocupa 194 px: o painel encolhe 62 px, mas é o último elemento da página, então nada se desloca. API: plans 200 `{"enabled":false,"plans":[]}`, checkout e portal 503 `PAYMENTS_NOT_CONFIGURED` |
| 4 | Exclusão com assinatura viva e chave falsa | **Confirmado** nas duas configurações. Rodada A (Stripe desligada): 503 `ACCOUNT_DELETION_BILLING_FAILED`, log `step=billing status=failed reason=billing-not-configured`. Rodada B (chave falsa): 503, `reason=Error`. Nos dois casos `deletedAt: null`, assinatura intacta e o login continua funcionando; o único campo que muda é `lastAccessAt`, gravado pelo guard. Sem assinatura: 200 `{"confirmed":true}`, `skipped reason=no-subscription`, e o usuário some do Auth |
| 5 | Personificação | **Confirmado.** Aviso "Modo somente leitura / Atuando como: qa-billing@example.com", card "Plano atual" visível e "Gerenciar assinatura" `disabled=true`; clicar não gerou pedido ao portal. Checkout, portal e exclusão com headers de personificação: 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` |
| 6 | Webhook em `next dev` | **Confirmado** para `pnpm --filter api dev` com o segredo no ambiente do processo: todo o harness da rodada B rodou em `next dev`. O `dev:with-stripe` completo não rodou porque a Stripe CLI não está instalada; a entrega pelo `stripe listen` fica 🔒 |
| 7 | Chave malformada | **Confirmado** na forma do desvio 1 do handoff. Build com `pk_test_wrong_slot`: código 1, `path: ['STRIPE_SECRET_KEY']`, `Invalid string: must start with "sk_"`. `next start` de um build válido com a mesma chave: o processo sobe, `/health` e `/payments/plans` respondem 500 e o log mostra `Invalid environment variables` a cada requisição. O "derruba o boot" do plano não se confirma |
| 8 | Modo `simple` | **Confirmado** em `next dev` com `NEXT_PUBLIC_PRODUCT_MODE=simple` no processo: abas `Perfil*/Segurança/Preferências/Privacidade` (en e es iguais), submenu da sidebar sem "Cobrança" e `?tab=billing` abre o perfil. Não repeti em build; o `pnpm --filter app build` desta rodada foi no modo `subscription` |
| 9 | `/pricing` com `NEXT_PUBLIC_APP_URL` | **Confirmado**, com o defeito D1. Os dois primeiros CTAs levam a `http://localhost:3000/<locale>/account?tab=billing`, o terceiro a `/<locale>/contact`; header "Ir para o painel" → `http://localhost:3000/pt-br`; hero e CTA da home → `http://localhost:3000`. Sem a URL: `/<locale>/sign-up`. Em `simple`: `http://localhost:3000` |
| 10 | `?checkout=canceled` e `past_due` | **Confirmado** nos três idiomas: "Pagamento cancelado. Nenhuma cobrança foi feita." / "Payment canceled. You were not charged." / "Pago cancelado. No se realizó ningún cobro.". `past_due`: badge "Pagamento pendente" / "Payment due" / "Pago pendiente" com variante destrutiva e o `pastDueHint`. No dark o hint tem contraste baixo (D2) |
| 11 | Botão com `loading` perde o nome acessível | **Confirmado.** Durante o pedido de checkout, o botão clicado ficou com nome acessível `""` e `disabled=true`; o outro manteve "Assinar" |

## Critérios de aceite: status por item

Texto completo em `test/criterios-aceite.md`.

| # | Critério | Status | Meio |
|---|---|---|---|
| 1 | Sem chaves, o mesmo placeholder de antes | ✅ | e2e rodada A (3 idiomas, light, dark, mobile), `paymentsPlansRoute` |
| 2 | Sem chaves, escritas respondem com código | ✅ | e2e (HTTP), testes de rota |
| 3 | Build e boot sem Stripe, aviso de meia configuração, chave malformada | ✅ | builds de api e app com código 0, build malformado com código 1, `next start` malformado, log `[payments] billing is DISABLED (no STRIPE_WEBHOOK_SECRET)` com só a chave secreta |
| 4 | Modo `simple` sem cobrança | ✅ | e2e do app em `next dev`; API com as duas chaves e `simple`: plans 200 `enabled:false`, checkout e portal 503 |
| 5 | Falha do catálogo vira mensagem | ✅ | e2e rodada B (503 `PAYMENTS_PROVIDER_UNAVAILABLE`, `loadError`, card mantido), unit para `noPlans` |
| 6 | Planos com preço e moeda formatados | ✅ | e2e com catálogo injetado no browser ("R$ 29,00 / mês", "R$29.00 / month", "29,00 BRL / mes", "/ ano"), `formatPlanPrice` para JPY |
| 7 | Catálogo real da Stripe | 🔒 | exige conta Stripe com produtos |
| 8 | Checkout valida o preço e não duplica | ✅ | e2e (400, 409, duplo clique gera 1 pedido, toast e botões reabilitados), teste de rota para o 404 |
| 9 | Trava do "Assinar" na volta do checkout | ✅ | teste novo com prova de mutação, e2e com contagem da revalidação |
| 10 | Volta do checkout mostra o resultado | ✅ | e2e (alertas nos 3 idiomas), teste de rota para os parâmetros da sessão |
| 11 | Checkout real e volta com assinatura da Stripe | 🔒 | exige conta Stripe |
| 12 | Estado gravado no perfil e lido pela UI | ✅ | emulador (`Timestamp` no doc, ISO no `GET /account`), e2e |
| 13 | Webhook reconcilia criação, troca e cancelamento | ✅ | harness assinado contra o emulador, API em `next dev` |
| 14 | Reentrega, fora de ordem e adulteração | ✅ | harness (duplicado, antigo, `updated` depois de `deleted`, corpo adulterado, sem assinatura), teste de rota para handler que falha |
| 15 | Entrega real de webhook | 🔒 | exige Stripe ou Stripe CLI; a CLI não está instalada |
| 16 | Portal para quem tem cliente | ✅ | e2e (toast nos 3 idiomas, light e dark), teste de rota para o 409 |
| 17 | Página real do Customer Portal | 🔒 | exige conta Stripe com portal configurado |
| 18 | `past_due` exibido, não bloqueado | ✅ | e2e nos 3 idiomas, teste de componente; contraste do dark em D2 |
| 19 | Personificação é só leitura | ✅ | e2e (UI e HTTP) |
| 20 | Exclusão trata a assinatura antes de apagar | ✅ | e2e nas rodadas A e B, `accountErasure` |
| 21 | Cancelamento real no expurgo | 🔒 | exige conta Stripe |
| 22 | Exportação leva o estado | ✅ | e2e (com assinatura e com `null`) |
| 23 | CTAs do pricing | ✅ | e2e nos 3 modos; D1 afeta o locale na primeira visita |
| 24 | Copy e erros nos 3 idiomas | ✅ | paridade 44/44, `accountApiErrorCopy`, todos os rótulos observados no e2e saíram traduzidos |

## Evidências e2e (o texto é a prova)

Os screenshots em `test/e2e/` (01 a 16) serviram para eu conferir durante a execução. O `.gitignore`
descarta a pasta.

### Rodada A: repositório como vem, sem chave Stripe

API em `next dev` com os hosts do emulador no ambiente do processo. Usuário `qa-billing@example.com`.

- `GET /payments/plans` → `200 {"data":{"enabled":false,"plans":[]}}`.
- `POST /payments/checkout`, `POST /payments/portal` (com e sem corpo) e `POST /webhooks/payments` → `503
  {"error":{"code":"PAYMENTS_NOT_CONFIGURED"}}`. `priceId: "nope"` também dá 503, porque a configuração é
  checada antes da validação.
- Sem token: `401 AUTH_INVALID_TOKEN`. Admin sem personificar: `403 COMMON_PANEL_FORBIDDEN`.
- Aba: "Cobrança em breve / Planos, assinatura e faturas aparecerão aqui quando a cobrança for ativada."; en
  "Billing coming soon / Plans, subscription and invoices will show up here once billing is enabled."; es
  "Facturación próximamente / Planes, suscripción y facturas aparecerán aquí cuando se active la
  facturación.". Light (fundo `lab(100 0 0)`), dark e mobile 390 px com `scrollWidth` 390.

### Rodada B: chaves falsas só no ambiente do processo

`STRIPE_SECRET_KEY=sk_test_offline_qa` e `STRIPE_WEBHOOK_SECRET=whsec_offline_qa` passados ao processo da
API; o `.env` não foi tocado. Um harness Node em `/tmp` assinou os eventos com
`stripe.webhooks.generateTestHeaderString`.

| Passo | Resposta | Documento no emulador |
|---|---|---|
| `checkout.session.completed` com `client_reference_id` do perfil e `customer=cus_qa` | 200 | ganha `stripeCustomerId: "cus_qa"` |
| `customer.subscription.created`, `active`, R$ 29,00 mensal | 200, `result=applied` | `subscription` com `Timestamp` |
| mesmo evento de novo | 200 `{"ok":true,"duplicate":true}` | idêntico |
| `updated` com `created` anterior, `past_due` | 200, `result=skipped` | inalterado |
| corpo adulterado depois de assinado | 500 `{"message":"something went wrong","ok":false}`, log `webhook-failed` | inalterado |
| sem `stripe-signature` | 500 | inalterado |
| `updated` para `past_due`, mais recente | 200 | `status: past_due` |
| `deleted` | 200 | `status: canceled` |
| `updated` para `active` depois do `deleted` | 200 | continua `canceled` |
| `created` de outra assinatura (`sub_qa_2`) | 200 | `sub_qa_2`, `active` |

Rotas autenticadas com as chaves falsas:

- `GET /payments/plans` → 503 `PAYMENTS_PROVIDER_UNAVAILABLE` em 198 ms, log `plans-failed`.
- `POST /payments/checkout` com assinatura viva → 409 `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE`; `priceId`
  inválido → 400 `VALIDATION_FAILED`.
- `POST /payments/portal` → 503 `PAYMENTS_PROVIDER_UNAVAILABLE` em 421 ms.
- `GET /account/export` → `account.stripeCustomerId: "cus_qa"` e `account.subscription` com
  `currentPeriodEnd: "2026-11-04T12:00:00.000Z"`. Conta que nunca assinou: os dois `null`; o `GET /account`
  dessa conta omite os dois campos.
- Senha errada na exclusão → 400 `ACCOUNT_CURRENT_PASSWORD_INVALID`.

Aba com assinatura ativa e catálogo falhando: "Plano atual / Plano contratado / Ativa / R$ 29,00 / mês /
Renova em 4 de novembro de 2026 / Gerenciar assinatura". en: "Current plan / Subscribed plan / Active /
R$29.00 / month / Renews on November 4, 2026". es: "Plan actual / Plan contratado / Activa / 29,00 BRL / mes
/ Se renueva el 4 de noviembre de 2026". Clique em "Gerenciar": toast "O serviço de pagamento não respondeu.
Tente de novo em instantes. (Código do erro: …)", "The payment service did not respond. Try again in a
moment.", "El servicio de pago no respondió. Inténtalo de nuevo en unos instantes."; o tema do toast
acompanha a página (`theme--light` e `theme--dark`).

Catálogo com planos: a chave falsa não lista planos, então injetei um catálogo de dois planos na resposta de
`GET /payments/plans` por um script de página no browser, sem tocar no código. A página mostrou "Pro QA /
Plano de teste / R$ 29,00 / mês / 5 membros / Suporte / Assinar" e "Business QA / R$ 99,00 / ano /
Assinar". Um duplo clique real gerou um único `checkout-failed` no log da API e um toast. Três `click()`
programáticos no mesmo tick geraram três pedidos (ver observações).

### Web

`/pricing` servido em `next dev` com o `.env` local, que tem `NEXT_PUBLIC_APP_URL="http://localhost:3000"` (o
handoff dizia que a variável estava vazia; está preenchida). Os links estão no item 9 acima.

## Defeitos

Nenhum dos dois nasceu nesta entrega; as duas causas já existiam. A sugestão de correção é hipótese, para o
`/review` decidir.

**D1. `/pricing` usa o locale do cookie, que chega uma navegação atrasado.** `getDictionary()` de
`@repo/internationalization/server` lê o cookie `x-locale`, e o `apps/web/proxy.ts:104-108` grava esse
cookie na resposta. A página renderiza com o cookie da visita anterior.
Repro: com a web de pé, `curl -s http://localhost:3001/en/pricing | grep -o 'href="[^"]*account?tab=billing"[^>]*>[^<]*'`
devolve `href="http://localhost:3000/pt-br/account?tab=billing">Testar`. No browser, abrir `/pt-br/pricing`
e depois `/en/pricing` mostra CTAs "Testar" apontando para `/pt-br/`; um reload corrige. A copy dos planos
já saía no idioma errado antes; a novidade é que o CTA leva o visitante ao app no idioma errado.
Sugestão: usar o `locale` do segmento `[locale]` da rota em `apps/web/app/[locale]/pricing/page.tsx`, pelo
menos para montar o `href`.

**D2. `pastDueHint` com contraste 2,0:1 no dark.** O texto usa `text-destructive`; no dark ele sai
`lab(28.5 44.6 29.0)` sobre o card `lab(2.75 0 0)`, abaixo dos 4,5:1 do WCAG AA. No light passa (cerca de
4,75:1). A causa é o token `--destructive` do dark (`packages/design-system/styles/globals.css:63`,
`oklch(0.396 …)`), que também pinta as mensagens de erro de formulário.
Repro: rodada B, assinatura em `past_due`, `/pt-br/account?tab=billing` com tema dark.
Sugestão: corrigir o token no design system, em vez de pôr uma classe `dark:` só neste parágrafo.

## Remedição do D1 (depois da rodada 2 do `/review`)

O revisor passou a montar o href dos CTAs de plano com o locale do segmento `[locale]`
(`resolveLocale(routeLocale)` em `apps/web/app/[locale]/pricing/page.tsx`) e criou
`apps/web/__tests__/pricingPage.test.tsx`. Remedi com a web em `next dev` na 3001 (porta livre antes,
derrubada por PID depois).

Gates, sem `--force`: `pnpm --filter web test` deu 41/41 em 8 arquivos (`pricingPage.test.tsx` 2/2).
`pnpm test` na raiz deu 10/10 tasks, 9 em cache: api 804, app 559, web 41, payments 22, internationalization
44, shared 44, security 31, email 137, auth 101, analytics 34.

`curl -s [-H 'Cookie: …'] http://localhost:3001/<rota> | grep -o 'href="[^"]*account?tab=billing"[^>]*>[^<]*'`
(atributos de classe removidos da saída):

| Rota | Cookie | Href dos dois CTAs de plano | Rótulo | CTA de contato |
|---|---|---|---|---|
| `/en/pricing` | `x-locale=pt-br` | `http://localhost:3000/en/account?tab=billing` | Testar | `/pt-br/contact` |
| `/en/pricing` | nenhum | `http://localhost:3000/en/account?tab=billing` | Testar | `/pt-br/contact` |
| `/en/pricing` | `x-locale=en` | `http://localhost:3000/en/account?tab=billing` | Try it | `/en/contact` |
| `/es/pricing` | `x-locale=pt-br` | `http://localhost:3000/es/account?tab=billing` | Testar | `/pt-br/contact` |
| `/es/pricing` | nenhum | `http://localhost:3000/es/account?tab=billing` | Testar | `/pt-br/contact` |
| `/es/pricing` | `x-locale=en` | `http://localhost:3000/es/account?tab=billing` | Try it | `/en/contact` |
| `/pt-br/pricing` | `x-locale=en` | `http://localhost:3000/pt-br/account?tab=billing` | Try it | `/en/contact` |

Browser, em sequência e sem reload: `/pt-br/pricing` mostrou os CTAs de plano em
`http://localhost:3000/pt-br/account?tab=billing`; em seguida `/en/pricing` mostrou
`http://localhost:3000/en/account?tab=billing`, com o cookie já em `x-locale=en`.

Veredito: **D1 fechado** no que ele tinha de novo nesta entrega, que era o CTA levar o visitante ao app no
idioma errado. Continua o comportamento anterior à entrega: o rótulo dos botões ("Testar" em `/en/pricing`)
e o CTA de contato (`/pt-br/contact`) ainda saem do cookie da visita anterior, assim como o resto da copy da
página, porque `getDictionary()` lê o cookie. Não é regressão; se for corrigir, a correção é passar o
locale da rota para o dicionário da página, fora do escopo desta feature.

## Observações que não reprovam

- Três `click()` síncronos no mesmo tick disparam três checkouts, porque o `disabled` só entra no render
  seguinte. Um duplo clique real, evento a evento, gera um pedido só. O cliente Stripe é reutilizado pela
  chave de idempotência, mas as sessões seriam duas. Se isso importar, a guarda pode ir para o handler.
- Depois das 10 releituras, a aba segue em "Confirmando o pagamento" com "Assinar" travado enquanto a URL
  tiver `checkout=success` (desvio 8 do handoff). Só incomoda se o webhook nunca chegar.
- Em modo `simple` com as duas chaves presentes, o webhook continua reconciliando eventos (200). Checkout e
  portal ficam desligados, como o critério pede; o webhook não fazia parte dele.
- `createCheckoutSchema` e `openPortalSchema` aceitam campo extra (sem `.strict()`), ao contrário dos
  schemas de `account.schema.ts`.
- No modo degradado aparece agora um skeleton durante uma ida à API antes do placeholder; antes da entrega
  o placeholder aparecia direto.
- Numa aba de browser escondida (`visibilityState: hidden`), o React Query pausa o retry depois do primeiro
  503 de `/payments/plans`, e a aba fica no skeleton até voltar a ficar visível. Aconteceu na sessão de
  admin do teste; ao disparar `visibilitychange`, o retry saiu e o card apareceu. É o comportamento padrão da
  biblioteca, não do código da feature.
- Um aviso de hidratação (ids do Radix no `Collapsible` da sidebar) apareceu uma vez, logo depois de
  reiniciar o app; não se repetiu em três recargas de `/account` e `/entities`.
- Anteriores a esta entrega: rótulos das abas apertados em en no desktop ("Security Preferences" quase
  encostados), "Sign Up" em inglês na home pt-br e rolagem horizontal da grade de `/pricing` no mobile.

## Lacunas herdadas: veredito

| Lacuna (handoff e review) | Veredito |
|---|---|
| `applySubscriptionState` e `findByStripeCustomerId` só contra db falso | **Verificada aqui** contra o emulador; **continua aberta** como teste versionado (depende da spec `e2e-testing`) |
| `BillingPlanCard` sem teste isolado | **Continua aberta**, risco baixo. Renderizado no browser com catálogo injetado: nome, descrição, features, preço e botão corretos, e descrição `null` omitida |
| `pricing/page.tsx` sem teste de renderização | **Continua aberta**; comportamento verificado no e2e (item 9) |
| Efeito de `NEXT_PUBLIC_APP_URL` em hero, CTA e header | **Continua aberta** como teste; verificado no e2e |
| Trava do "Assinar" com `checkout=success` | **Fechada**: cinco casos novos, com prova de mutação |
| A1 (modo `simple` não restringe o painel comum) | **Fora de escopo**, continua aberto; o usuário comum entrou em `/account` com o app em `simple` |
| A2 (soft delete do admin não cancela a assinatura) | **Fora de escopo**, continua aberto; não medido |
| A3 (`STRIPE_*` nos `.env.example` de app e web) | **Fora de escopo**, continua aberto |
| A4 (assinatura inválida no webhook responde 500) | **Fora de escopo**, continua aberto; remedido: corpo adulterado e requisição sem assinatura dão 500 |

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 4400, 4500, 9150). Não
reutilizei nada do usuário.

| Serviço | Como subi |
|---|---|
| Emulador Auth e Firestore | `pnpm emulators` com `JAVA_HOME` do `openjdk@21`, projeto `demo-next-boilerplate`, seguido de `pnpm seed` |
| API (3002) | `pnpm dev` (rodada A), `pnpm dev` com as chaves falsas (rodada B), variações com `simple` e com uma chave só, e `next start` do build com chave malformada |
| App (3000) | `pnpm dev` nos modos `subscription` e `simple` |
| Web (3001) | `pnpm dev` com a URL do app, sem ela e em `simple` |

Os `.env` locais apontam para um projeto Firebase real. Passei os hosts do emulador e
`NEXT_PUBLIC_FIREBASE_PROJECT_ID`/`FIREBASE_ADMIN_PROJECT_ID=demo-next-boilerplate` no ambiente de cada
processo, sem editar arquivo. Nenhuma chamada foi ao projeto real.

Derrubei tudo por PID e, para os filhos presos às portas que eu abri, com `lsof -ti tcp:<porta> | xargs
kill`. O emulador deixou dois filhos (a CLI do Firebase e o JAR do Firestore), mortos por PID. No fim, as dez
portas acima estavam vazias. Removi o harness e os scripts de `/tmp/billing-qa` e o `firestore-debug.log`
que o emulador criou na raiz (ignorado pelo git). Fechei as sessões do `agent-browser`. Os builds `.next`
de `apps/api` e `apps/app` ficaram no disco, ignorados pelo git.

## Contas e dados de QA

Tudo viveu só no emulador e morreu com o processo. Não criei conta em projeto real, então nada entra na
lista do `docs/PRE-PRODUCTION.md`.

- Contas do seed: `admin@example.com`, `user@example.com`, `user2@example.com` (senha pública do seed,
  documentada em `docs/SETUP.md`).
- Contas criadas por `POST /auth/sign-up`: `qa-billing@example.com`, `qa-billing-delete@example.com`,
  `qa-billing-nosub@example.com` (apagada pela exclusão da rodada A) e `qa-billing-nosub2@example.com`
  (apagada na rodada B). Onboarding e e-mail marcados como concluídos direto no emulador.
- Documentos `paymentEvent` dos eventos do harness e o estado de assinatura do `qa-billing@example.com`.

Este arquivo não traz senha, token nem chave. `sk_test_offline_qa`, `whsec_offline_qa` e `cus_qa` são
strings falsas por construção.

## Roteiro manual (para quem tiver conta Stripe de teste)

1. Cadastrar dois preços recorrentes no Dashboard e configurar o Customer Portal (seção 9.1 do plano).
2. Subir a API com as chaves de teste por `pnpm --filter api dev:with-stripe` (exige a Stripe CLI).
3. Em `/account?tab=billing`: os dois planos aparecem do mais barato ao mais caro, na moeda do preço.
4. "Assinar" → página da Stripe → pagar com o cartão de teste `4242 4242 4242 4242` → a aba volta com
   "Confirmando o pagamento" e, em poucos segundos, "Assinatura ativa." e o card do plano.
5. "Gerenciar assinatura" → portal → cancelar no fim do período → a aba passa a mostrar "Termina em …".
6. Com outra conta assinada, excluir a conta pela aba Privacidade → a assinatura aparece cancelada no
   Dashboard e a conta some.

## Cross-check

`apps/app` × `apps/web` (CTAs), usuário comum × admin × admin personificando × sem token, `subscription` ×
`simple` (app e API), desktop 1440 px × mobile 390 px, light × dark, pt-br × en × es: todos percorridos
nesta rodada, exceto `simple` em build de produção do app.
