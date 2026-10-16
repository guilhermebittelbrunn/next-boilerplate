---
id: pricing-page-catalog
title: Página de preços a partir do catálogo da Stripe
status: in-progress
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

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
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

- [ ] Um visitante sem login vê em `/pricing` os planos ativos do catálogo da Stripe: nome, preço formatado na moeda
      do preço e no idioma da página, intervalo de cobrança e a lista de recursos de marketing do produto. Os três
      idiomas usam o mesmo catálogo; só o texto em volta vem do dicionário.
- [ ] A leitura pública do catálogo passa pela API, sem login, com cache, para que uma visita não vire uma chamada à
      Stripe. Ela expõe só o que a página mostra.
- [ ] Cada plano tem um botão que preserva a escolha: o visitante cria a conta (ou entra), passa pelo onboarding se
      ele estiver ligado e chega à aba de cobrança com o plano escolhido em destaque, a um clique do checkout. Quem
      já está logado vai direto para a aba com o plano em destaque.
- [ ] Sem Stripe configurada, ou em modo `simple`, a página continua coerente com o que a app mostra hoje: nenhum
      preço inventado. A cópia do estado vazio vem do dicionário nos três idiomas.
- [ ] Os preços, nomes e a tabela de exemplo saem do dicionário da landing; o que sobra nele é cópia de página.

### Fora do corte

- **Alternar entre mensal e anual** quando o mesmo produto tem os dois preços: a lista do corte já mostra os dois
  como planos separados. O seletor é refinamento de layout.
- **Tabela comparativa de recursos por plano**: a Stripe guarda recursos de marketing por produto, sem a matriz
  "tem/não tem". Montar a matriz é decisão de cada fork.
- **Nome e descrição do plano traduzidos**: já está na tabela de lacunas ("nome do plano traduzido"); o nome vem da
  Stripe, num idioma só.
- **Trial e cupom no checkout**: mesma linha da tabela de lacunas.
- **Plano "fale conosco"** (Enterprise) gerado do catálogo: continua como cópia fixa que leva ao contato, coberto
  por [`contact-support-channel`](contact-support-channel.md).

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

- **Deep link do onboarding.** A entrega de [`onboarding-flow`](../docs/features/onboarding-flow/spec.md)
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
  `/analyze` livre para escolher o mecanismo.
