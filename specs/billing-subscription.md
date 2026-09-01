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
feature: -
updated: 2026-09-01
---

# Assinatura Stripe de ponta a ponta

## Problema

O boilerplate se declara pronto para SaaS por assinatura — existe até um `ProductMode` chamado `subscription` (`packages/next-config/product-mode.ts:12`) — mas **nenhum fork consegue cobrar de ninguém**. Não há planos, checkout, portal de cobrança, nem estado de assinatura gravado.

Quem precisar faturar escreve a integração inteira à mão, justamente a parte em que errar custa dinheiro do usuário final: cobrança duplicada, acesso liberado sem pagamento, cancelamento que não revoga. Pior — a documentação do próprio repo afirma que isso já existe.

## O que já existe no repo

- `packages/payments/index.ts:14-24` — **`getStripe()`**, server-only, que constrói o cliente sob demanda e devolve `null` quando não há `STRIPE_SECRET_KEY`; `:26` reexporta o tipo `Stripe`. É **tudo** o que o pacote expõe: nenhuma noção de plano, checkout ou portal. *(Deriva corrigida em 2026-09-01: até `ci-pipeline`, era um `new Stripe(... || "")` em escopo de módulo, na linha 5 — o que quebrava `api#build` em qualquer ambiente sem chave. **Consequência para esta spec: toda rota nova precisa tratar o `null`.**)*
- `packages/payments/ai.ts:4-5` — `paymentsAgentToolkit` (cria produtos/preços/payment links). Serve para **semear** o catálogo, não para vender. 🔴 **Ainda tem o defeito gêmeo que o `getStripe()` corrigiu**: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY || "" })` em escopo de módulo. Não explode hoje só porque nada importa `@repo/payments/ai` — explodiria no primeiro fork que importasse, e esta spec é justamente o que faria alguém importar.
- `packages/payments/keys.ts:7-8` — `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`, ambos `.optional()`; `:14` desliga a validação inteira quando não há secret.
- `apps/api/app/(routes)/webhooks/payments/route.ts:27` — o POST **valida a assinatura** do evento (`:43`, `constructEvent`). Essa metade está pronta. Já `:8` e `:18` são **stubs com `// TODO`** (`:11`, `:21`): checam `data.customer` e retornam sem persistir nada. Só dois eventos são roteados (`:50` `checkout.session.completed`, `:54` `subscription_schedule.canceled`). *(Refs de linha corrigidas em 2026-09-01; a variável morta `customerId` que existia aqui foi removida pelo saneamento de `ci-pipeline`, e a rota ganhou 11 testes.)*
- `apps/api/app/(guards)/common-panel.ts:28` (`requireCommonPanelApi`), `apps/api/package.json:6` (`dev:with-stripe`) e `.claude/skills/payments-flow/SKILL.md` — guard, listener local de webhook e procedimento de implementação já existem.
- **Lacuna:** `apps/api/app/(routes)/` tem 10 rotas e **nenhuma** sob `payments/`; `packages/sdk/src/client/index.ts:11-14` registra só `application`, `authApi`, `user` e `entity`; `UserDTO` (`packages/sdk/src/types/user/user.ts:7-14`) e `UserWithAuthDTO` (`:30-52`) não têm assinatura nem `stripeCustomerId`; `apps/web/app/[locale]/pricing/page.tsx:75-85` e `:118-128` mandam o CTA para a raiz do app (`env.NEXT_PUBLIC_APP_URL`), não para um fluxo de compra.

### ⚠️ Divergência doc × código (achado crítico)

`docs/PAYMENTS.md` tem uma seção **"Estado atual (implementado)"** (`:5`) que descreve como pronto:

| `docs/PAYMENTS.md` afirma | Realidade verificada |
|---|---|
| `:8` `GET /payments/plans`, `POST /payments/checkout`, `POST /payments/portal` | nenhuma existe |
| `:8` webhook trata `customer.subscription.updated\|deleted` | só `checkout.session.completed` e `subscription_schedule.canceled`, ambos vazios |
| `:9` `UserDTO.subscription` + `userRepository.updateSubscriptionByReferenceId` | campo inexistente; o repositório (`apps/api/(shared)/repositories/user.repository.ts:11-14`) não tem o método |
| `:10` `apiClient.payments.{listPlans,createCheckout,createPortal}` | módulo `payments` não existe no SDK |
| `:11` tela "Minha assinatura" em `apps/app` | não existe |
| `:12` "Falta por fork: criar os produtos/preços no Stripe" | falta a integração inteira |

Corrigir `docs/PAYMENTS.md` faz parte desta entrega: documentação que mente sobre o que existe é pior que documentação ausente, porque ninguém confere.

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
| `apps/app` | tela de assinatura na área comum + entrada na sidebar (hoje `Billing` é `url: "#"`, `routes.tsx:73-76`) |
| `apps/web` | CTAs do `pricing` apontando para o fluxo real no modo `subscription` |
| `packages/*` | `payments` ganha planos/checkout/portal; i18n para copy e novos `error.code` |
| Infra/env | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` deixam de ser decorativos; endpoint de webhook por ambiente; catálogo de produtos/preços criado no Stripe de cada fork |

## Riscos e trade-offs

- **Custo herdado por todo fork:** Stripe é serviço pago (taxa por transação) e a conta precisa existir antes do primeiro deploy útil. Em modo `simple` nada disso é obrigatório — mas o `skipValidation` de `keys.ts:14` hoje **esconde** a má configuração: um fork em modo `subscription` sem `STRIPE_WEBHOOK_SECRET` sobe calado e nunca reconcilia. Falhar cedo e visível é parte do escopo.
- **Estado divergente é o risco central.** Webhook que falha vira usuário que paga sem acesso, ou que cancela e continua com acesso. Sem dedupe por evento, um retry reprocessa.
- **O perfil vira dono de dado financeiro.** Assinatura no doc `user` acopla cobrança ao cadastro: `data-rights-lgpd` passa a ter de cancelar antes de excluir — a nota lista isso como a armadilha central da exclusão de conta.
- Enquanto `docs/PAYMENTS.md` não for corrigido, toda pessoa e todo agent que ler o repo parte de premissa falsa.

## Sinais de pronto

- Um usuário novo assina um plano de teste e a tela mostra plano e situação corretos; cancelar pelo portal reflete no app sem intervenção manual.
- Reentregar o mesmo evento de webhook não muda o estado nem duplica registro.
- Fork em modo `simple` continua subindo sem nenhuma variável da Stripe.
- `docs/PAYMENTS.md` descreve o que o código faz, e o que falta está marcado como falta.

## Perguntas em aberto

- Catálogo de planos vem do Stripe em tempo real ou de configuração local? — **recomendação:** do Stripe, para o fork não manter preço em dois lugares.
- Modo `simple` esconde a tela de assinatura ou mostra desabilitada? — **recomendação:** esconder, seguindo o que `isSubscriptionMode()` (`product-mode.ts:23`) já sinaliza.
- Bloquear o acesso quando a assinatura fica `past_due`? — **recomendação:** não neste corte; só exibir o estado. Bloqueio é decisão de produto de cada fork.
