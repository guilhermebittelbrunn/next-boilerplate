---
id: pricing-page-catalog
title: Página de preços a partir do catálogo da Stripe
status: done
value: alto
effort: M
audience: produto
area: [apps/web, apps/api, apps/app, packages/sdk, packages/internationalization]
mode: subscription
depends_on: []
contends_on: ["apps/web/app/[locale]/pricing/page.tsx", apps/web/shared/lib/pricingCta.ts, apps/api/app/(routes)/payments/plans/route.ts, apps/api/(shared)/lib/billing.ts, "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx", apps/api/proxy.ts, apps/app/proxy.ts]
feature: pricing-page-catalog
updated: 2026-10-16
---

# Página de preços a partir do catálogo da Stripe

## Problema

O visitante que abre `/pricing` na landing de qualquer fork vê três planos de exemplo com o mesmo preço ("R$ 40"
em pt-br, "$40" em en e es), com uma tabela de recursos que fala de SSO e assistente de IA. Nada disso vem do que o fork vende. Para corrigir, quem
mantém o fork precisa reescrever preço, nome e recursos à mão nos três idiomas do dicionário, e repetir isso a
cada mudança de preço na Stripe. O preço publicado na landing e o cobrado no checkout passam a ser duas fontes que
divergem sem aviso.

O botão do plano também não carrega a escolha: leva à aba de cobrança da app, onde o visitante procura de novo o
plano que já tinha escolhido, depois de criar a conta.

## O que já existe no repo

- `apps/api/(shared)/lib/billing.ts:52-68` — `listPlans` lê os preços recorrentes ativos da Stripe, com o produto
  expandido, e ordena por valor. `billing-state.ts:63-88` (`toPlanDTO`) devolve nome, descrição, recursos de
  `marketing_features`, valor, moeda e intervalo, e descarta preço avulso e produto arquivado.
- `apps/api/app/(routes)/payments/plans/route.ts:12-28` — a rota que expõe o catálogo fica atrás de
  `requireCommonPanelApi`, então só serve a quem já está logado. Com a cobrança desligada, responde
  `{ enabled: false, plans: [] }` em vez de erro.
- `apps/app/.../account/(components)/AccountBillingPanel.tsx:199-206`, `:238-304` — a aba de cobrança já mostra o
  catálogo real em cards (`BillingPlanCard`) e abre o checkout do plano clicado; lê `?checkout=` na volta, mas não
  recebe um plano escolhido de fora.
- `apps/web/app/[locale]/pricing/page.tsx:31-60`, `:176`, `:187-294` — a página da landing lê tudo do dicionário,
  manda "Enterprise" para `/contact` e desenha uma tabela comparativa de exemplo.
- `packages/internationalization/translations/apps/web/pages/pricing/index.ts:10`, `:20`, `:30` — o preço "R$ 40"
  repetido nos três planos em pt-br; em en e es o preço é "$40" (`:55`, `:66`, `:77` e `:101`, `:111`, `:121`).
  *(Corrigido na auditoria de 2026-10-16, pós-PR #46: a versão anterior dizia "R$ 40" nos três idiomas.)*
- `apps/web/shared/lib/pricingCta.ts:13-27` — o CTA aponta para `APP/<locale>/account?tab=billing` em modo
  assinatura, sem plano na URL.
- **Lacuna:** não há leitura pública do catálogo, a landing não usa o SDK para preços, e a escolha do plano se perde
  entre a landing, o cadastro e o checkout.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md), adendo de
  2026-10-16, seção "Página de preços".
- Prevalência: **4 de 10** starters do painel geram a página de uma fonte única (Makerkit, Supastarter e ShipFast a
  partir de um arquivo de configuração; o starter de assinatura da Vercel, hoje arquivado, a partir da Stripe). O
  next-forge, de onde este repositório herdou a página, é estático como aqui. O sucessor do starter da Vercel,
  `nextjs/saas-starter`, lê preços e produtos da Stripe na página, com cache de uma hora, e o botão dispara o
  checkout do preço escolhido.
- Fontes: <https://makerkit.dev/nextjs-saas-starter-kit> · <https://supastarter.dev/docs/nextjs/payments/plans> ·
  <https://raw.githubusercontent.com/nextjs/saas-starter/main/app/(dashboard)/pricing/page.tsx> (lidas em
  2026-10-16).

O repositório já trata a Stripe como fonte do catálogo dentro da app, então a página pública só precisa ler a
mesma fonte. Um arquivo de configuração, como nos kits pagos, seria uma segunda fonte para manter sincronizada.

## Proposta — corte de MVP

- [x] Um visitante sem login vê em `/pricing` os planos ativos do catálogo da Stripe: nome, preço formatado na moeda
      do preço e no idioma da página, intervalo de cobrança e a lista de recursos de marketing do produto. Os três
      idiomas usam o mesmo catálogo; só o texto em volta vem do dicionário.
- [x] A leitura pública do catálogo passa pela API, sem login, com cache, para que uma visita não vire uma chamada à
      Stripe. Ela expõe só o que a página mostra.
- [x] Cada plano tem um botão que preserva a escolha: o visitante cria a conta (ou entra), passa pelo onboarding se
      ele estiver ligado e chega à aba de cobrança com o plano escolhido em destaque, a um clique do checkout. Quem
      já está logado vai direto para a aba com o plano em destaque.
- [x] Sem Stripe configurada, ou em modo `simple`, a página continua coerente com o que a app mostra hoje: nenhum
      preço inventado. A cópia do estado vazio vem do dicionário nos três idiomas.
- [x] Os preços, nomes e a tabela de exemplo saem do dicionário da landing; o que sobra nele é cópia de página.

### Fora do corte

- **Alternar entre mensal e anual** quando o mesmo produto tem os dois preços: a lista do corte já mostra os dois
  como planos separados. O seletor é refinamento de layout.
- **Tabela comparativa de recursos por plano**: a Stripe guarda recursos de marketing por produto, sem a matriz
  "tem/não tem". Montar a matriz é decisão de cada fork.
- **Nome e descrição do plano traduzidos**: já está na tabela de lacunas ("nome do plano traduzido"); o nome vem da
  Stripe, num idioma só.
- **Trial e cupom no checkout**: mesma linha da tabela de lacunas.
- **Plano "fale conosco"** (Enterprise) gerado do catálogo: continua como cópia fixa que leva ao contato, coberto
  por [`contact-support-channel`](../../../specs/contact-support-channel.md).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Uma ação pública de listagem do catálogo, com o tipo de plano que já existe. |
| `apps/api` | Leitura do catálogo sem guard, com cache e o mesmo contrato de "cobrança desligada"; entra na lista de rate limit se o `/analyze` achar necessário. |
| `apps/app` | A aba de cobrança aceita um plano escolhido de fora e o destaca. |
| `apps/web` | A página de preços passa a ler o catálogo e monta o CTA com o plano. |
| `packages/*` | i18n: sai o preço de exemplo, entram os textos de estado vazio e intervalo nos três idiomas. |
| Infra/env | Nenhuma variável nova; o catálogo é o mesmo da `billing-subscription`. |

## Riscos e trade-offs

- **Deep link do onboarding.** A entrega de [`onboarding-flow`](../onboarding-flow/spec.md)
  registrou uma deriva: o deep link volta sem a query string. É exatamente onde o plano escolhido viajaria. O
  `/analyze` precisa provar que a escolha sobrevive ao cadastro e ao onboarding, ou guardá-la por outro meio.
  A auditoria de 2026-10-16 (pós-PR #46) localizou a perda em três pontos de `apps/app/proxy.ts`:
  - o portão do onboarding recebe só o caminho, porque o proxy grava o `pathname` no header `x-app-path`
    (`:263`); `buildOnboardingPath` (`apps/app/shared/lib/onboarding.ts:94-105`) preservaria a query se ela
    chegasse até ele;
  - o visitante sem sessão que abre uma rota protegida vai para o login com `redirect` igual ao `pathname`, sem a
    query (`:230`);
  - quem já tem sessão e abre o cadastro ou o login com `?redirect=` é devolvido por `:247-249`, que limpa a
    query da página e escreve o destino inteiro no `pathname`. Medido com o `NextURL` do Next 16.0.0: o destino
    `/pt-br/account?tab=billing&plan=price_1` sai como `/pt-br/account%3Ftab=billing&plan=price_1`, um caminho
    sem rota (o 404 em si não foi medido).

  Do lado do cadastro, a query sobrevive: `resolveAppPostLoginPath`
  (`apps/app/shared/lib/postLoginNavigation.ts:112-129`) e `postAuthRedirectTarget` (`packages/auth/redirect.ts:10-33`)
  não a cortam. Por isso `apps/app/proxy.ts` entrou no `contends_on`.
- **Endpoint público consulta a Stripe.** Sem cache, um robô transforma cada visita em chamada paga em cota. O
  bloqueio de bot da landing está desligado (E13), então a proteção tem de ficar na API. A lista de rate limit da
  API é fechada e casada por igualdade (`apps/api/proxy.ts:45-58`), e as rotas de `payments/` estão fora dela hoje;
  por isso `apps/api/proxy.ts` entrou no `contends_on`.
- **Moeda e idioma.** O preço sai na moeda do `Price`; um fork que vende em BRL e mostra a página em inglês vai
  exibir "R$" com formatação inglesa. É o comportamento correto, mas precisa estar escrito para o fork.
- **Fork sem Stripe.** Quem não cobra não pode ganhar página quebrada nem chamada falha a cada visita. O estado
  "desligado" já existe na API e deve ser reaproveitado.
- O `/test` não prova o catálogo contra uma conta Stripe real (mesmo 🔒 de `billing-subscription`); prova com o
  SDK da Stripe simulado.

## Sinais de pronto

- Com um catálogo de teste de dois preços, `/pt-br/pricing`, `/en/pricing` e `/es/pricing` mostram os dois planos
  com nome, valor formatado no idioma da página, intervalo e recursos; nenhum preço de exemplo sobra no
  dicionário.
- Um visitante clica num plano, cria a conta, conclui o onboarding e chega à aba de cobrança com aquele plano em
  destaque.
- Sem as chaves da Stripe, a página mostra o estado vazio traduzido e a API responde sem erro.
- Duas visitas seguidas à página não geram duas chamadas à Stripe.

## Decisões

- **D4, 2026-10-16:** o CTA do visitante leva ao cadastro da app. É ele que envia a verificação de e-mail e passa
  pelo onboarding (`SignUpFormClient.tsx:106`); o cadastro da landing não envia a verificação.

## Perguntas em aberto

- Por quanto tempo o catálogo fica em cache? — **recomendação:** uma hora, como o `nextjs/saas-starter`, com o
  `/analyze` livre para escolher o mecanismo. *(Respondida na entrega: uma hora, em memória, por instância do
  servidor. Ver "Estado da entrega".)*

## Estado da entrega

Entregue pela PR #47, mergeada em `main` em 2026-10-16 às 23:39 UTC (`dd31a95`), a partir da branch
`feat/pricing-page-catalog`. A execução de merge do CI (`gh run 38982571426`, SHA `dd31a95`) terminou em `success`
nos quatro jobs: `changes`, `verify`, `coverage` e `e2e`. O `/test` da feature fechou com 21 ✅, 0 ❌ e 3 🔒; os três
🔒 exigem uma conta Stripe real (catálogo real, chamadas reais e checkout real), como previsto em "Riscos".
Arquivada pelo `/spec --sync` de 2026-10-16, que releu cada item do corte no código de `dd31a95`.

| item do corte | situação | evidência |
|---------------|----------|-----------|
| 1. O visitante vê em `/pricing` os planos ativos da Stripe, com preço, intervalo e recursos no idioma da página | **implementado** | `apps/web/app/[locale]/pricing/page.tsx:29-81` lê o catálogo e desenha um `PlanCard` por plano; `components/plan-card.tsx:34` formata o preço com `describePlanPrice`, `:52-54` lista os recursos; o formatador está em `packages/shared/utils/helpers/formatPlanPrice.ts`; os intervalos estão no dicionário (`translations/apps/web/pages/pricing/index.ts:6-13` e equivalentes em en e es) |
| 2. Leitura pública do catálogo pela API, sem login e com cache | **implementado** | `apps/api/app/(routes)/payments/catalog/route.ts:13-32`, sem guard; `apps/api/(shared)/lib/plan-catalog-cache.ts:19-37`, validade de uma hora e uma chamada só para visitas simultâneas; `packages/sdk/src/actions/payments/action.ts:33-35` (`listCatalog`); quatro casos em `apps/api/__tests__/planCatalogCache.test.ts` |
| 3. O botão do plano preserva a escolha pelo cadastro, pelo onboarding e até a aba de cobrança | **implementado** | `apps/web/shared/lib/pricingCta.ts:16-32` monta `sign-up?redirect=` com `plan`; o proxy da app mantém a query no redirecionamento ao login (`apps/app/proxy.ts:247`), no bounce de quem já tem sessão (`pointAt`, `:161-165` e `:265`) e no header do portão do onboarding (`:280`); a aba lê `?plan=` (`AccountBillingPanel.tsx:243`, `:301`) e o card mostra o selo (`BillingPlanCard.tsx:43-50`) |
| 4. Sem Stripe ou em modo `simple`, nenhum preço inventado, e o estado vazio traduzido | **implementado** | a rota responde `{ enabled: false, plans: [] }` (`route.ts:16-18`); `apps/web/shared/lib/planCatalog.ts:23-37` devolve lista vazia fora do modo assinatura, sem API ou em falha; `components/pricing-empty-state.tsx` usa `emptyTitle` e `emptyDescription` (`index.ts:14-16` e equivalentes) |
| 5. Preços, nomes e a tabela de exemplo saem do dicionário | **implementado** | `git grep` por "R$ 40" e "$40" em `translations/apps/web`: 0; o dicionário da página guarda só cópia, os intervalos e o card "Enterprise" |

**Deriva, com a leitura de cada uma:**

- **Rota nova em vez de abrir a existente.** A spec previa mexer em `payments/plans/route.ts` e em `billing.ts` (os
  dois estavam no `contends_on`). O plano criou `GET /payments/catalog` e deixou os dois intactos: a rota da aba
  continua atrás de `requireCommonPanelApi` e sem cache. A spec estava imprecisa; o resultado pedido é o mesmo.
- **"Duas visitas não geram duas chamadas" vale por instância.** O cache é memória do processo. Em serverless, N
  instâncias quentes fazem até N chamadas por hora; o total para de crescer com o tráfego, mas não é uma chamada
  global. A spec não distinguia os dois casos; o plano registrou o limite, e o `/test` deixou a medição em
  produção como 🔒.
- **A rota pública ficou fora do rate limit, de propósito** (`apps/api/proxy.ts:43-45`): o servidor da landing pede o
  catálogo em nome de todo visitante, de um endereço só, então um limite por endereço barraria a própria página.
  A spec deixava a escolha ao `/analyze`. A rota responde do cache e não alcança a Stripe a cada chamada.
- **Quem já tem sessão passa pelo cadastro e é devolvido pelo proxy**, em vez de um link direto para a aba. O
  destino final é o mesmo do corte.

**Além do corte:** a correção da query no proxy fechou a deriva do deep link registrada em
[`onboarding-flow`](../onboarding-flow/spec.md); o `/review` encontrou e fechou um open redirect real em `main`
(`postAuthRedirectTarget` aceitava `..` com barra invertida e devolvia `Location: //evil.example.com`), hoje barrado
em `packages/auth/redirect.ts:40-43`, com casos em `apps/app/__tests__/postAuthRedirectTarget.test.ts` e
`proxy.test.ts`; e o formatador de preço saiu da `apps/app` para `@repo/shared`, que a landing e a aba usam.

**Ficou para o backlog** (achados em `specs/BACKLOG.md`): a decodificação dupla em `postAuthRedirectTarget`
(`redirect.ts:27`), a sessão expirada que perde a query (`packages/auth/provider.tsx:80-90`), o teste do guard
fora do `@repo/auth`, as abas da conta apertadas em en a 1280 px e as seções da home coladas na borda a 375 px.
