---
id: billing-subscription
title: Assinatura Stripe de ponta a ponta
status: done
value: alto
effort: M
audience: produto
area: [packages/sdk, apps/api, apps/app, apps/web, packages/payments, packages/internationalization]
mode: subscription
depends_on: []
contends_on: [apps/api/app/(routes)/webhooks/payments/route.ts, packages/sdk/src/client/index.ts, packages/sdk/src/types/user/user.ts, apps/api/(shared)/repositories/user.repository.ts, "apps/app/app/[locale]/(authenticated)/(common)/routes.tsx", apps/api/(shared)/lib/account-erasure.ts]
feature: billing-subscription
updated: 2026-09-25
---

# Assinatura Stripe de ponta a ponta

## Problema

O boilerplate se declara pronto para SaaS por assinatura — existe até um `ProductMode` chamado `subscription` (`packages/next-config/product-mode.ts:12`) — mas **nenhum fork consegue cobrar de ninguém**. Não há planos, checkout, portal de cobrança, nem estado de assinatura gravado.

Quem precisar faturar escreve a integração inteira à mão, justamente a parte em que errar custa dinheiro do usuário final: cobrança duplicada, acesso liberado sem pagamento, cancelamento que não revoga. *(Até 2026-09-14 havia um agravante — a documentação do próprio repo afirmava que isso já existia. **Não afirma mais**: `docs/PAYMENTS.md` foi corrigido na PR #12.)*

## O que já existe no repo

> Esta seção descreve o repositório **antes** da PR #25, que entregou a spec. O estado atual está em
> [Estado da entrega](#estado-da-entrega).

- `packages/payments/index.ts:14-24` — **`getStripe()`**, server-only, que constrói o cliente sob demanda e devolve `null` quando não há `STRIPE_SECRET_KEY`; `:26` reexporta o tipo `Stripe`. É **tudo** o que o pacote expõe: nenhuma noção de plano, checkout ou portal. *(Deriva corrigida em 2026-09-01: até `ci-pipeline`, era um `new Stripe(... || "")` em escopo de módulo, na linha 5 — o que quebrava `api#build` em qualquer ambiente sem chave. **Consequência para esta spec: toda rota nova precisa tratar o `null`.**)*
- `packages/payments/ai.ts:4-5` — `paymentsAgentToolkit` (cria produtos/preços/payment links). Serve para **semear** o catálogo, não para vender. 🔴 **Ainda tem o defeito gêmeo que o `getStripe()` corrigiu**: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY || "" })` em escopo de módulo. Não explode hoje só porque nada importa `@repo/payments/ai` — explodiria no primeiro fork que importasse, e esta spec é justamente o que faria alguém importar.
- `packages/payments/keys.ts:7-8` — `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`, ambos `.optional()`; `:14` desliga a validação inteira quando não há secret.
- `apps/api/app/(routes)/webhooks/payments/route.ts:29` — o POST **valida a assinatura** do evento (`:45`, `constructEvent`). Essa metade está pronta. Já `:10` e `:20` são **stubs com `// TODO`** (`:13`, `:23`): checam `data.customer` e retornam sem persistir nada. Só dois eventos são roteados (`:52` `checkout.session.completed`, `:56` `subscription_schedule.canceled`). *(Refs de linha corrigidas em 2026-09-01; a variável morta `customerId` que existia aqui foi removida pelo saneamento de `ci-pipeline`, e a rota ganhou testes.)* **A rota tem hoje 13 casos** em `apps/api/__tests__/paymentsWebhookRoute.test.ts` — recontado em 2026-09-16; a spec dizia 11, número que era certo quando foi escrito e que a PR #15 aumentou ao correlacionar a falha com o `requestId` (`:201`, `:229`).
- `apps/api/app/(guards)/common-panel.ts:32` (`requireCommonPanelApi`), `apps/api/package.json:6` (`dev:with-stripe`) e `.claude/skills/payments-flow/SKILL.md` — guard, listener local de webhook e procedimento de implementação já existem.
- **Lacuna:** `apps/api/app/(routes)/` tem **26** `route.ts` (remedido em 2026-09-24; as PRs #19, #22, #23 e #24 acrescentaram `entities/summary`, `users/summary`, `users/activity-summary`, `account/export`, `account/deletion` e `account/onboarding`) e **nenhuma** sob `payments/` — o diretório não existe; `packages/sdk/src/client/index.ts:14-20` registra `application` (`:14`), `authApi` (`:15`), `user` (`:16`), `entity` (`:17`), `file` (`:18`), `account` (`:19`) e `audit` (`:20`) — **sete** actions, e nenhuma delas é `payments`; `UserDTO` (`packages/sdk/src/types/user/user.ts:42-60`) e `UserWithAuthDTO` (`:86-108`, empurrado pelos tipos do onboarding da PR #24) não têm assinatura nem `stripeCustomerId`; `apps/web/app/[locale]/pricing/page.tsx:75-85` e `:118-128` mandam o CTA para a raiz do app (`env.NEXT_PUBLIC_APP_URL`), não para um fluxo de compra.

### ✅ A divergência doc × código foi RESOLVIDA — por terceiros, em 2026-09-15

⚠️ **Esta seção acusava `docs/PAYMENTS.md` de descrever como pronto o que não existe. A acusação era
verdadeira até 2026-09-14 e é FALSA desde `a4df5ed`.** A PR #12 reescreveu o documento (32 linhas), sem
que a correção estivesse no escopo dela. Medido em 2026-09-15:

- `docs/PAYMENTS.md:5` deixou de ser "Estado atual (**implementado**)" e virou
  **"Estado atual (medido em 2026-09-14)"**;
- `:7-10` abre com `⚠️ **Não há fluxo de assinatura funcionando.**` e aponta para esta spec;
- `:17` introduz o bloco **"O que NÃO existe (e que versões anteriores deste documento afirmavam
  existir)"**, que lista nominalmente os 6 pontos falsos — handlers stub (`:19`), zero persistência
  (`:20`), zero rotas de plano/checkout/portal (`:21`), nada no SDK (`:22`), nenhuma UI (`:23`) e o
  webhook sem `customer.subscription.updated|deleted` (`:24`).

**Consequência para o corte:** "corrigir a documentação" **sai desta entrega** — já foi feito. O que resta
é escrever o código. E o documento adotou o formato que o resto do repo usa (afirmação **com data de
medição** ao lado), que é o que impede a mentira de voltar.

### 🆕 O lugar na sidebar já existe — preencher, não criar

Outro efeito colateral da PR #12: a entrada "Billing" **deixou de ser `url: "#"`**. Hoje
`(common)/routes.tsx:52-53` aponta para `routes.account.billing.url` → `/account?tab=billing`
(`paths.ts:54-56`), servida por `AccountBillingPlaceholder.tsx` — um empty state de 22 linhas com copy já
traduzida nos 3 idiomas (`translations/apps/app/pages/common/account.ts:79` pt-br, `:205` en, `:332` es, remedidas em 2026-09-23 depois de a PR #23 acrescentar a aba de privacidade —
a âncora anterior apontava para o meio do bloco em inglês).

Isso **encolhe** o corte em uma tela e muda o verbo: a UI de assinatura já tem endereço, rota, aba e copy
de espera. Falta o conteúdo.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md) · [`research/engineering-baseline.md`](../../../specs/research/engineering-baseline.md)
- Prevalência: **9/10 dos starters** entregam assinatura Stripe (checkout + portal) por padrão — o segundo item mais universal do painel, atrás só de auth. Valor "alto", esforço "M".
- A nota registra que **trial e downgrade quase nunca vêm testados** e que **a reconciliação de estado é o ponto frágil de todos** os kits: o diferencial não é ter checkout, é o estado bater. E o webhook da Stripe chega *at-least-once* e fora de ordem — idempotência é **exigência do provedor**, não otimização (`engineering-baseline.md`, prática 10).
- Fontes: <https://www.next-forge.com/packages/payments> · <https://saas-ui.dev/docs/nextjs-starter-kit/billing>

## Proposta — corte de MVP

- [x] O usuário autenticado vê os planos ativos do catálogo Stripe do fork, com preço e moeda.
- [x] Ao escolher um plano, é levado ao Stripe Checkout e volta ao app com o resultado visível.
- [x] O estado da assinatura (cliente Stripe, plano, situação, fim do período) fica gravado no perfil e é lido pela UI — não recalculado a cada visita.
- [x] O webhook deixa de ser stub: assinatura criada/atualizada/cancelada reconcilia esse estado, e um evento reentregue não produz efeito duplicado.
- [x] O usuário com assinatura ativa abre o portal da Stripe para trocar plano, atualizar cartão ou cancelar.
- [x] Os CTAs do `pricing` da `apps/web` levam ao fluxo real quando o fork está em modo `subscription`.

> **Obrigação transferida em 2026-09-23 — o passo `billing` da exclusão de conta.** O item 3 acima cria o
> vínculo perfil↔cliente Stripe, e é esse vínculo que faltava para a exclusão de conta cancelar a
> assinatura. **Paga pela PR #25:** o passo `billing` roda primeiro e cancela a assinatura viva antes de
> apagar qualquer coisa (`apps/api/(shared)/lib/account-erasure.ts:74-97`, ordem em `:142-156`), e o
> arquivo de exportação leva o estado da assinatura (`apps/api/(shared)/lib/account-export.ts:56-67`).
> Evidência completa em [Estado da entrega](#estado-da-entrega).

### Fora do corte

- **Trial, cupom, downgrade proporcional, reembolso e faturas em UI própria** — o Customer Portal já cobre; iteração seguinte.
- **Gate de acesso por plano** (limites, metering, créditos): 2/10 de prevalência na nota, spec própria. Aqui gravamos o estado, não o *enforcement*.
- **Cobrança por organização** — depende de `teams-organizations`.
- **Endurecimento do webhook além da idempotência** (fila, retry, alerta) — `api-hardening`.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | recurso novo de cobrança + campo de assinatura no DTO de usuário |
| `apps/api` | rotas de plano/checkout/portal atrás de `requireCommonPanelApi`; webhook com persistência e dedupe de evento |
| `apps/app` | **preencher** a aba `/account?tab=billing`, que já existe (`routes.tsx:52-53` → `paths.ts:54-56`, hoje servida pelo `AccountBillingPlaceholder.tsx`). A entrada na sidebar **não** precisa ser criada |
| `apps/web` | CTAs do `pricing` apontando para o fluxo real no modo `subscription` |
| `packages/*` | `payments` ganha planos/checkout/portal; i18n para copy e novos `error.code` |
| Infra/env | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` deixam de ser decorativos; endpoint de webhook por ambiente; catálogo de produtos/preços criado no Stripe de cada fork |

## Riscos e trade-offs

- **Custo herdado por todo fork:** Stripe é serviço pago (taxa por transação) e a conta precisa existir antes do primeiro deploy útil. Em modo `simple` nada disso é obrigatório — mas o `skipValidation` de `keys.ts:14` hoje **esconde** a má configuração: um fork em modo `subscription` sem `STRIPE_WEBHOOK_SECRET` sobe calado e nunca reconcilia. Falhar cedo e visível é parte do escopo.
- **Estado divergente é o risco central.** Webhook que falha vira usuário que paga sem acesso, ou que cancela e continua com acesso. Sem dedupe por evento, um retry reprocessa.
- **O perfil vira dono de dado financeiro.** Assinatura no doc `user` acopla cobrança ao cadastro: a exclusão de conta passa a ter de cancelar antes de excluir — a nota lista isso como a armadilha central da exclusão de conta.
  🆕 **Obrigação transferida em 2026-09-23, e com endereço.** `data-rights-lgpd` foi entregue pela PR #23 e
  arquivada em [`docs/features/data-rights-lgpd/spec.md`](../data-rights-lgpd/spec.md). O
  expurgo da conta roda em passos nomeados, e o passo `billing` é um ponto de extensão que hoje responde
  `skipped` com motivo `billing-not-linked` (`apps/api/(shared)/lib/account-erasure.ts:67-78`), porque não
  existe vínculo perfil↔cliente Stripe para cancelar. **Quem criar esse vínculo é esta spec, então é ela
  que preenche o passo**: cancelar a assinatura ativa antes de o perfil ser apagado, e acrescentar o
  estado de assinatura ao arquivo de exportação (`apps/api/(shared)/lib/account-export.ts:95-129`). Sem
  isso, a primeira conta com assinatura que for excluída continua sendo cobrada. É o mesmo tipo de
  transferência que `user-activity-tracking` fez para `data-rights-lgpd`, e aquela foi paga.
- ~~Enquanto `docs/PAYMENTS.md` não for corrigido, toda pessoa e todo agent que ler o repo parte de premissa falsa.~~ **Risco extinto em 2026-09-15** — a PR #12 corrigiu o documento. Registrado porque ele foi, por três rodadas, o achado 🔴 mais citado deste backlog.

## Sinais de pronto

- Um usuário novo assina um plano de teste e a tela mostra plano e situação corretos; cancelar pelo portal reflete no app sem intervenção manual.
- Reentregar o mesmo evento de webhook não muda o estado nem duplica registro.
- Fork em modo `simple` continua subindo sem nenhuma variável da Stripe.
- ✅ `docs/PAYMENTS.md` descreve o que o código faz, e o que falta está marcado como falta — **já
  satisfeito desde 2026-09-15**, antes de a spec começar.

## Perguntas em aberto

- Catálogo de planos vem do Stripe em tempo real ou de configuração local? — **recomendação:** do Stripe, para o fork não manter preço em dois lugares.
- Modo `simple` esconde a tela de assinatura ou mostra desabilitada? — **recomendação:** esconder, seguindo o que `isSubscriptionMode()` (`product-mode.ts:23`) já sinaliza.
- Bloquear o acesso quando a assinatura fica `past_due`? — **recomendação:** não neste corte; só exibir o estado. Bloqueio é decisão de produto de cada fork.

## Estado da entrega

Auditado em 2026-09-25 pelo `/spec --sync`. PR **#25** mergeada em `main` em 2026-09-24T14:46:15Z (merge
commit `a1f87d0`), com CI `success` nesse SHA (`gh run 36015211021`, `headSha` = `a1f87d04…`). Os seis
itens do corte e a obrigação herdada de `data-rights-lgpd` foram reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Planos ativos do catálogo, com preço e moeda | **implementado** | `GET /payments/plans` sob `requireCommonPanelApi` (`apps/api/app/(routes)/payments/plans/route.ts:12-29`). `listPlans` pede à Stripe os preços recorrentes ativos com o produto expandido (`apps/api/(shared)/lib/billing.ts:50-67`), e `toPlanDTO` descarta preço avulso e produto arquivado (`billing-state.ts:61-86`). Com a cobrança desligada, a rota responde `{ enabled: false, plans: [] }` sem chamar a Stripe (`:15-17`) |
| 2. Checkout e volta com o resultado visível | **implementado**, caminho real 🔒 | `POST /payments/checkout` (`payments/checkout/route.ts:20-78`) valida o corpo, recusa 409 `PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE` com assinatura viva (`:41-46`), cria ou reusa o cliente e devolve a URL. A volta cai em `?tab=billing&checkout=success\|canceled` (`billing.ts:34-44`), e o painel relê a conta a cada 3 s, até 10 vezes, enquanto o webhook não chega (`useCheckoutConfirmation.tsx:12-31`, `AccountBillingPanel.tsx:239-251`) |
| 3. Estado gravado no perfil e lido pela UI | **implementado** | `UserDTO.stripeCustomerId` e `UserDTO.subscription` (`packages/sdk/src/types/user/user.ts:62-65`), com o snapshot `SubscriptionState` em `packages/sdk/src/types/payments/payments.ts:30-44` (cliente, plano, situação, fim do período). A aba lê o snapshot da conta (`AccountBillingPanel.tsx:116-146`); nada é recalculado na visita |
| 4. Webhook reconcilia criação, troca e cancelamento, sem efeito duplicado | **implementado** | `customer.subscription.created\|updated\|deleted` roteados em `webhooks/payments/route.ts:107-111`. Dedupe por `event.id` na coleção `paymentEvent`, marcado só depois de o handler terminar (`route.ts:161-167`, `payment-event.repository.ts:27-55`). Regra de ordem numa transação (`user.repository.ts:71-104` sobre `decideSubscriptionWrite`, `billing-state.ts:130-165`) |
| 5. Portal da Stripe para quem assina | **implementado**, página real 🔒 | `POST /payments/portal` (`payments/portal/route.ts:14-56`), 409 `PAYMENTS_CUSTOMER_NOT_FOUND` sem cliente vinculado (`:35-38`) |
| 6. CTAs do `pricing` levam ao fluxo real em modo `subscription` | **implementado** | `resolvePlanCtaHref` (`apps/web/shared/lib/pricingCta.ts:13-27`) manda para `<app>/<locale>/account?tab=billing`; a página usa o segmento `[locale]` da rota (`apps/web/app/[locale]/pricing/page.tsx:39`, `:90`, `:128`) |
| Obrigação herdada: passo `billing` do expurgo e exportação | **implementado**, cancelamento real 🔒 | O passo roda primeiro e, se falhar, nada é apagado (`apps/api/(shared)/lib/account-erasure.ts:71-96`, `:142-156`); a rota responde 503 `ACCOUNT_DELETION_BILLING_FAILED` (`account/deletion/route.ts:81-90`). A exportação leva `subscription` (`account-export.ts:56-67`) |

Modo `simple`: a aba e o item da barra lateral somem (`AccountTabs.tsx:33-35`, `(common)/routes.tsx:52-58`), e
`isBillingEnabled()` exige o modo `subscription`, as duas chaves e `NEXT_PUBLIC_APP_URL` (`billing.ts:22-28`).
Os cinco `error.code` novos estão em `apiErrors` nos 3 idiomas
(`translations/packages/shared/utils.ts:53-60`, `:163-170`, `:272-279`).

Cobertura: a PR somou 124 testes na `apps/api`, 58 na `apps/app`, 6 na `apps/web` e 14 no
`@repo/payments` (remedido com `--force` em 2026-09-25). O `/test` fechou 19 critérios, reprovou 0 e deixou
5 como 🔒 porque só uma conta Stripe real prova: catálogo real, checkout real, entrega real de webhook,
página do portal e cancelamento real no expurgo. O resto rodou com chaves falsas no ambiente do processo,
webhook assinado localmente e o emulador (`test/report.md`, rodada B). Os passos manuais estão em
`docs/PRE-PRODUCTION.md` §12.

## Deriva de implementação

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "Falhar cedo e visível é parte do escopo" para o fork em modo `subscription` sem `STRIPE_WEBHOOK_SECRET` | Com uma chave só, a cobrança fica desligada e a API avisa no boot (`apps/api/instrumentation.ts:8-22`); o processo sobe. Chave com prefixo errado derruba o `next build` da API (`packages/payments/keys.ts:10-21`) | **A spec estava imprecisa.** O plano escolheu degradar com aviso em vez de derrubar o processo, e o `PRE-PRODUCTION.md` §12 descreve o comportamento |
| Estado da assinatura gravado no perfil | Gravado, mais um campo que a spec não pedia: `lastEventAt`, o instante do evento que produziu o snapshot, usado pela regra de ordem | Capacidade extra, necessária para o item 4 |
| Nada sobre assinatura duplicada | O checkout recusa só quando o perfil já tem assinatura viva gravada; duas abas pagas antes do primeiro webhook geram duas assinaturas | **Risco aceito** pelo usuário em 2026-09-24, com a correção descrita no `PRE-PRODUCTION.md` §12 |
| Fora do corte: soft delete pelo admin | `DELETE /users/[id]` não cancela a assinatura (`apps/api/app/(routes)/users/[id]/route.ts:117`), e o webhook deixa de achar o perfil porque `findByStripeCustomerId` ignora perfil apagado (`user.repository.ts:50-61`) | Registrado como achado no `BACKLOG.md` |
| `contends_on` com 6 arquivos | Tocou os 6. Tocou sem declarar `account-export.ts`, `account/deletion/route.ts`, `apps/api/instrumentation.ts`, `AccountTabs.tsx`, `queryKeys.ts`, `apps/web/env.ts`, `pricing/page.tsx`, `translations/packages/shared/utils.ts`, `translations/apps/app/pages/common/account.ts` e o `packages/sdk/src/types/account/account.ts` | Primeira previsão com 6 de 6. Os não declarados seguem o padrão: vizinhos dos declarados, na mesma camada |
