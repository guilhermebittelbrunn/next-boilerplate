---
id: admin-billing-insights
title: Seção de billing na home do admin
status: proposed
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/design-system, packages/internationalization]
mode: subscription
depends_on: [billing-subscription, dashboard-home]
contends_on: ["apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient.tsx", apps/app/shared/lib/queryKeys.ts, apps/api/app/(routes)/webhooks/payments/route.ts]
feature: -
updated: 2026-09-24
---

# Seção de billing na home do admin

## Problema

Um fork que cobra assinatura não tem, dentro do próprio produto, nenhuma leitura do que está vendendo.
Para saber quem assinou esta semana, qual plano sai mais e quanto entrou no mês, o operador abre o painel
da Stripe.

O painel da Stripe responde em termos de cliente e de cobrança, não em termos do produto: ele não sabe qual
usuário do fork é qual `customer`, nem o nome que o produto dá aos planos. Cruzar as duas coisas vira
trabalho manual, repetido toda semana, feito fora do sistema que tem a resposta.

## Por que esta spec está separada de [`admin-analytics-dashboard`](../docs/features/admin-analytics-dashboard/spec.md)

Porque amarrar as duas faria a parte construível nascer bloqueada.

[`billing-subscription`](billing-subscription.md) está em **0 de 6**, e isso foi remedido no código em
2026-09-17:

- **Não existe diretório `payments/`** entre as rotas da API. São 22 `route.ts` em
  `apps/api/app/(routes)/`, medidos nesta branch: `account/*` ×3, `audit-events`, `auth/*` ×8, `entities`,
  `entities/[id]`, `entities/summary`, `files`, `health`, `health/ready`, `users`, `users/[id]`,
  `users/summary` e `webhooks/payments`. *(O backlog registrava 20 na auditoria da manhã; `entities/summary`
  e `users/summary` são da `dashboard-home`, entregue nesta branch e ainda fora de `main`.)*
  *(Remedido em 2026-09-24: são **26**. As PRs #22, #23 e #24 acrescentaram `users/activity-summary`,
  `account/export`, `account/deletion` e `account/onboarding`, e `payments/` continua sem existir.)*
- `packages/sdk/src/types/user/user.ts:42-60` — o `UserDTO` **não tem** `subscription` nem
  `stripeCustomerId`.
- `packages/sdk/src/client/index.ts:13-31` — são **7 actions** (`application`, `authApi`, `user`, `entity`,
  `file`, `account`, `audit`). Não existe `payments`.
- `apps/api/app/(routes)/webhooks/payments/route.ts:13,23` — os dois handlers de evento são `// TODO`. A
  assinatura **é** validada (`:45-49`), mas nada é persistido e não há dedupe por `event.id`.

Os KPIs de atividade e o gráfico de acesso podem ser construídos hoje. A seção de billing não. Mantê-los na
mesma spec faria o `/analyze` planejar sobre uma dependência inexistente e devolver metade dos critérios
como não verificados.

## O que já existe no repo

- As peças da home, entregues por `dashboard-home` e em `main` desde 2026-09-17 (PR #19, merge `bfc4d8f`;
  spec arquivada em [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md)):
  `apps/app/shared/components/ui/MetricCard.tsx:11-17` (cartão de métrica com
  esqueleto), `packages/design-system/components/ui/category-bar-chart.tsx:25-77` (gráfico de barras já
  temático e com rótulo acessível),
  `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient.tsx:34-56` (o
  arranjo de cartões) e `apps/app/shared/lib/queryKeys.ts:11-48` (a factory de chaves).
- `apps/api/(shared)/repositories/base.repository.ts:138-141` — `countQuery` com `query.count().get()`, para
  contar assinatura por plano sem ler documento.
- `apps/api/app/(routes)/users/summary/route.ts:6-20` — o molde de rota de agregado sob `requireAdminApi`,
  com degradação traduzível quando falta índice.
- `packages/payments/` existe e expõe `getStripe`, consumido pelo webhook (`route.ts:2-3`).
- **Lacuna:** não há nenhum dado de cobrança persistido na base do fork. O webhook recebe o evento, despacha
  para dois stubs e responde — inclusive ecoando o objeto Stripe inteiro no corpo (`:67`). Não há o que
  agregar.

## Evidência de mercado

- Notas: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md) e
  [`research/compliance-trust-baseline.md`](research/compliance-trust-baseline.md) (ambas coletadas em
  2026-08-21, dentro da validade).

**O benchmark não sustenta esta spec.** Ele mede "Assinatura Stripe (checkout + portal)" em **9 em 10**, com
valor alto — mas isso é a dependência ([`billing-subscription`](billing-subscription.md)), não este painel.
**Não existe linha** no levantamento para leitura de receita, MRR ou painel financeiro dentro do produto, e
não medi prevalência disso entre os starters. A linha de "Dashboard de métricas do produto" está em 3/10 e
trata de métricas de uso, não de dinheiro.

O que sustenta a spec é o problema de cruzamento descrito acima: o dado de cobrança fica no provedor e o
dado de usuário fica no fork, e ninguém junta os dois. O `value: médio` reflete que isso só importa depois
que o fork vende alguma coisa.

**O que a nota de conformidade impõe ao desenho**, e que é o ponto mais importante desta spec:

- **Dedupe por `event.id` é obrigatório**, porque a Stripe **não garante ordem nem entrega única**.
  Agregar receita a partir de webhook sem dedupe produz um número inflado, e inflado de forma silenciosa.
- **Verificação de assinatura com corpo bruto** e tolerância padrão, nunca zero.
- **Guardar apenas `cus_`/`pm_`/bandeira/últimos 4/validade** mantém o fork em SAQ A. Qualquer rota que
  aceite número de cartão joga para SAQ D. Um painel de receita não precisa de nada além de identificador,
  valor, moeda e instante.
- Confirmação de pagamento por `invoice.paid`, com tratamento de `requires_action` e
  `invoice.payment_action_required` (SCA/3DS).

## Proposta — corte de MVP

Cobre o item **e** inteiro do pedido: contratações recentes, planos mais vendidos e receita mensal.

- [ ] **Contratações recentes:** as últimas N ativações de assinatura, com usuário, plano e data, sob
      `requireAdminApi`.
- [ ] **Planos mais vendidos:** contagem de assinaturas ativas por plano, no gráfico de barras que já
      existe.
- [ ] **Receita mensal:** o valor do mês corrente, com a **moeda** e o **critério** ("faturado" ou
      "recebido") escritos na tela junto do número.
- [ ] Os três leem **dado persistido na base do próprio fork**, alimentado pelo webhook de pagamento **com
      dedupe por `event.id`**. Nada de chamar a Stripe de forma síncrona ao renderizar a home.
- [ ] Estado vazio para o fork que ainda não vendeu nada, e i18n nos 3 idiomas, com moeda e data formatadas
      por idioma.

### Fora do corte

- Coorte, churn, MRR, ARR e LTV. São definições contábeis que exigem acordo sobre o que conta como o quê, e
  errar nelas é pior do que não tê-las.
- Reembolso, disputa e chargeback refletidos no número.
- Nota fiscal, imposto e conciliação contábil.
- Previsão e comparação com período anterior.
- Detalhamento por usuário a partir do número, e exportação.
- Consolidação multimoeda. O corte **declara** a moeda; não converte.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Agregado de cobrança para o painel admin, sobre o contrato que `billing-subscription` criar. |
| `apps/api` | Rota de agregado sob `requireAdminApi`; o webhook passa a persistir evento de cobrança com dedupe. |
| `apps/app` | Seção de billing no `AdminHomeClient`, com cartões e gráfico; chaves novas em `queryKeys.ts`. |
| `apps/web` | N/A. |
| `packages/*` | `design-system`: mais um consumidor do gráfico. i18n nos 3 idiomas, com formatação de moeda. |
| Infra/env | Nenhuma variável além das que `billing-subscription` já exige. Provável índice composto para a agregação por período. |

## Riscos e trade-offs

- **Nasce bloqueada por [`billing-subscription`](billing-subscription.md), que está em 0/6.** É o risco
  principal e está medido acima, não estimado.
- **Número de dinheiro na tela é um contrato de correção.** Uma receita que diverge da Stripe é pior que
  nenhuma receita, porque alguém vai tomar decisão em cima dela. O dedupe por `event.id` e o critério
  explícito são o mínimo; mesmo com os dois, isto é um painel operacional e **não** substitui contabilidade.
  Vale escrever isso na tela.
- **Verificar de ponta a ponta exige chaves reais da Stripe.** É a mesma razão pela qual
  `billing-subscription` não foi escolhida para o topo do backlog: uma rodada autônoma devolveria os
  critérios como não verificados.
- **Multimoeda quebra a soma.** Um fork que venda em mais de uma moeda não pode somar valores sem conversão,
  e conversão está fora do corte. A saída é declarar a moeda e, se houver mais de uma, mostrar separado em
  vez de somar errado.
- **Índice composto de novo.** Agregar por mês pede índice, e a fila de índices versionados e não publicados
  já tem **cinco entradas** (`docs/PRE-PRODUCTION.md` §1.1, §1.2 e §1.5), recontadas em 2026-09-17 depois da
  PR #19.
- **Modo de produto.** `mode: subscription` — um fork `simple` não instala isto, e a seção precisa sumir
  inteira em vez de mostrar zeros.

## Sinais de pronto

- O admin abre a home e vê quem assinou recentemente, qual plano vende mais e quanto entrou no mês.
- Cada número traz a moeda e o critério ao lado.
- Reentregar o mesmo evento de webhook não altera a receita exibida.
- Um fork sem nenhuma assinatura vê estado vazio com orientação, não uma seção de zeros.
- Um fork em `mode: simple` não vê a seção.
- A home não fica mais lenta nem quebra quando a Stripe está fora do ar, porque a leitura é da base local.

## Perguntas em aberto

- **Receita "faturada" ou "recebida"?** — **recomendação:** recebida, confirmada por `invoice.paid`, que é o
  evento que a nota de conformidade aponta para confirmação sob SCA/3DS. É o número que não encolhe depois
  por falha de cobrança. O critério vai escrito na tela de qualquer forma.
- **A agregação sai de uma coleção própria de eventos de cobrança, ou de consulta à API da Stripe sob
  demanda?** — **recomendação:** coleção própria, alimentada pelo webhook. Consultar ao renderizar acopla a
  disponibilidade da home à do provedor e gasta limite de requisição a cada visita. **Não levantei custo nem
  limites da API da Stripe para a alternativa — não assuma que consultar é de graça.**
- **Quem vê a seção: qualquer admin ou um papel separado?** — **recomendação:** qualquer admin no primeiro
  corte. Papel de finanças é problema de RBAC, que vive em
  [`teams-organizations`](teams-organizations.md), hoje `deferred`.
- **Quantas contratações recentes mostrar, e a partir de qual evento uma assinatura conta como "recente"?**
  — **recomendação:** as 5 últimas ativações, pelo instante em que a assinatura passou a ativa. Cinco cabe
  na home sem competir com o resto; a lista completa é assunto de uma tela própria, fora deste corte.
