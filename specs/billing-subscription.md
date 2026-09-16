---
id: billing-subscription
title: Assinatura Stripe de ponta a ponta
status: proposed
value: alto
effort: M
audience: produto
area: [packages/sdk, apps/api, apps/app, apps/web, packages/payments, packages/internationalization]
mode: subscription
depends_on: []
contends_on: [apps/api/app/(routes)/webhooks/payments/route.ts, packages/sdk/src/client/index.ts, packages/sdk/src/types/user/user.ts, apps/api/(shared)/repositories/user.repository.ts, "apps/app/app/[locale]/(authenticated)/(common)/routes.tsx"]
feature: -
updated: 2026-09-16
---

# Assinatura Stripe de ponta a ponta

## Problema

O boilerplate se declara pronto para SaaS por assinatura — existe até um `ProductMode` chamado `subscription` (`packages/next-config/product-mode.ts:12`) — mas **nenhum fork consegue cobrar de ninguém**. Não há planos, checkout, portal de cobrança, nem estado de assinatura gravado.

Quem precisar faturar escreve a integração inteira à mão, justamente a parte em que errar custa dinheiro do usuário final: cobrança duplicada, acesso liberado sem pagamento, cancelamento que não revoga. *(Até 2026-09-14 havia um agravante — a documentação do próprio repo afirmava que isso já existia. **Não afirma mais**: `docs/PAYMENTS.md` foi corrigido na PR #12.)*

## O que já existe no repo

- `packages/payments/index.ts:14-24` — **`getStripe()`**, server-only, que constrói o cliente sob demanda e devolve `null` quando não há `STRIPE_SECRET_KEY`; `:26` reexporta o tipo `Stripe`. É **tudo** o que o pacote expõe: nenhuma noção de plano, checkout ou portal. *(Deriva corrigida em 2026-09-01: até `ci-pipeline`, era um `new Stripe(... || "")` em escopo de módulo, na linha 5 — o que quebrava `api#build` em qualquer ambiente sem chave. **Consequência para esta spec: toda rota nova precisa tratar o `null`.**)*
- `packages/payments/ai.ts:4-5` — `paymentsAgentToolkit` (cria produtos/preços/payment links). Serve para **semear** o catálogo, não para vender. 🔴 **Ainda tem o defeito gêmeo que o `getStripe()` corrigiu**: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY || "" })` em escopo de módulo. Não explode hoje só porque nada importa `@repo/payments/ai` — explodiria no primeiro fork que importasse, e esta spec é justamente o que faria alguém importar.
- `packages/payments/keys.ts:7-8` — `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`, ambos `.optional()`; `:14` desliga a validação inteira quando não há secret.
- `apps/api/app/(routes)/webhooks/payments/route.ts:27` — o POST **valida a assinatura** do evento (`:43`, `constructEvent`). Essa metade está pronta. Já `:8` e `:18` são **stubs com `// TODO`** (`:11`, `:21`): checam `data.customer` e retornam sem persistir nada. Só dois eventos são roteados (`:50` `checkout.session.completed`, `:54` `subscription_schedule.canceled`). *(Refs de linha corrigidas em 2026-09-01; a variável morta `customerId` que existia aqui foi removida pelo saneamento de `ci-pipeline`, e a rota ganhou 11 testes.)*
- `apps/api/app/(guards)/common-panel.ts:29` (`requireCommonPanelApi`), `apps/api/package.json:6` (`dev:with-stripe`) e `.claude/skills/payments-flow/SKILL.md` — guard, listener local de webhook e procedimento de implementação já existem.
- **Lacuna:** `apps/api/app/(routes)/` tem **18** `route.ts` (remedido em 2026-09-15; a PR #12 acrescentou as 3 de `account/`) e **nenhuma** sob `payments/` — o diretório não existe; `packages/sdk/src/client/index.ts:13-18` registra `application` (`:13`), `authApi` (`:14`), `user` (`:15`), `entity` (`:16`), `file` (`:17`) e `account` (`:18`) — **seis** actions, e nenhuma delas é `payments`; `UserDTO` (`packages/sdk/src/types/user/user.ts:12-22`) e `UserWithAuthDTO` (`:38-60`) não têm assinatura nem `stripeCustomerId`; `apps/web/app/[locale]/pricing/page.tsx:75-85` e `:118-128` mandam o CTA para a raiz do app (`env.NEXT_PUBLIC_APP_URL`), não para um fluxo de compra.

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
traduzida nos 3 idiomas (`translations/apps/app/pages/common/account.ts:170`).

Isso **encolhe** o corte em uma tela e muda o verbo: a UI de assinatura já tem endereço, rota, aba e copy
de espera. Falta o conteúdo.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md) · [`research/engineering-baseline.md`](research/engineering-baseline.md)
- Prevalência: **9/10 dos starters** entregam assinatura Stripe (checkout + portal) por padrão — o segundo item mais universal do painel, atrás só de auth. Valor "alto", esforço "M".
- A nota registra que **trial e downgrade quase nunca vêm testados** e que **a reconciliação de estado é o ponto frágil de todos** os kits: o diferencial não é ter checkout, é o estado bater. E o webhook da Stripe chega *at-least-once* e fora de ordem — idempotência é **exigência do provedor**, não otimização (`engineering-baseline.md`, prática 10).
- Fontes: <https://www.next-forge.com/packages/payments> · <https://saas-ui.dev/docs/nextjs-starter-kit/billing>

## Proposta — corte de MVP

- [ ] O usuário autenticado vê os planos ativos do catálogo Stripe do fork, com preço e moeda.
- [ ] Ao escolher um plano, é levado ao Stripe Checkout e volta ao app com o resultado visível.
- [ ] O estado da assinatura (cliente Stripe, plano, situação, fim do período) fica gravado no perfil e é lido pela UI — não recalculado a cada visita.
- [ ] O webhook deixa de ser stub: assinatura criada/atualizada/cancelada reconcilia esse estado, e um evento reentregue não produz efeito duplicado.
- [ ] O usuário com assinatura ativa abre o portal da Stripe para trocar plano, atualizar cartão ou cancelar.
- [ ] Os CTAs do `pricing` da `apps/web` levam ao fluxo real quando o fork está em modo `subscription`.

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
- **O perfil vira dono de dado financeiro.** Assinatura no doc `user` acopla cobrança ao cadastro: `data-rights-lgpd` passa a ter de cancelar antes de excluir — a nota lista isso como a armadilha central da exclusão de conta.
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
