---
id: admin-analytics-dashboard
title: Métricas de atividade na home do admin
status: proposed
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: [user-activity-tracking, dashboard-home]
contends_on: ["apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient.tsx", apps/app/shared/lib/queryKeys.ts, apps/api/app/(routes)/users/summary/route.ts, firestore.indexes.json]
feature: -
updated: 2026-09-17
---

# Métricas de atividade na home do admin

## Problema

A home do admin conta cabeças. Ela responde quantas contas existem e de que tipo, e para por aí: uma base
de mil cadastros dos quais novecentos foram abandonados aparece exatamente igual a uma base de mil pessoas
usando o produto todo dia.

Quem opera um fork precisa da outra pergunta: quantos estão usando agora, quantos pararam, e para onde a
curva aponta. Nenhuma das três tem resposta hoje, porque nada no produto agrega o eixo do tempo.

## O que já existe no repo

[`dashboard-home`](../docs/features/dashboard-home/spec.md) entregou as peças e o padrão. Esta spec estende aquilo em vez de
começar do zero.

> **`dashboard-home` está em `main` desde 2026-09-17** (PR #19, merge `bfc4d8f`, CI verde no SHA de merge) e
> a spec dela foi arquivada em [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md).
> As âncoras abaixo foram remedidas contra `main` nessa data. A dependência está satisfeita; o que ainda
> bloqueia esta spec é [`user-activity-tracking`](user-activity-tracking.md).

- `apps/api/app/(routes)/users/summary/route.ts:6-20` — `GET /users/summary` sob `requireAdminApi`, devolve
  `userRepository.summary()` e degrada para `SUMMARY_INDEX_MISSING` com 503 quando falta índice
  (`:12-17`). É o molde de rota de agregado, incluindo a degradação traduzível.
- `apps/api/(shared)/repositories/user.repository.ts:52-63` — `summary()` roda **três contagens em
  paralelo** e não lê documento; o comentário em `:46-51` registra por que a contagem não refaz o join com
  o Firebase Auth.
- `apps/api/(shared)/repositories/base.repository.ts:122-124` — `countQuery` usa `query.count().get()`, a
  agregação do próprio Firestore. É o helper que mantém o custo fora da leitura por documento.
- `apps/app/shared/components/ui/MetricCard.tsx:11-17` — `MetricCardProps` com `label`, `value`, `hint`,
  `loading` e `icon`, com esqueleto de carregamento embutido (`:39-40`).
- `packages/design-system/components/ui/category-bar-chart.tsx:25-72` — `CategoryBarChart` sobre o
  `chart.tsx` que estava morto; pinta cada barra por `--color-<key>` para seguir o tema (`:31-37`) e já
  carrega `aria-label` e `role="img"` (`:41-44`).
- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient.tsx:33-55` — os
  três cartões atuais (total, admins, comuns), alimentados por `useUserSummary` (`:16`), com erro tratado
  via `FormattedError`/`handleClientError` (`:24-26`).
- `apps/app/shared/lib/queryKeys.ts:36-44` — o grupo `users` já tem `summary()` (`:42`), e a hierarquia
  suporta invalidação por prefixo.
- `firestore.indexes.json` — **6 índices**, dois deles na coleção `user` (`reference_id`+`deletedAt`;
  `deletedAt`+`type`). **Nenhum cobre consulta por instante.**
- `packages/analytics/` é só consentimento: `keys.ts:4-19` declara apenas `NEXT_PUBLIC_GA_MEASUREMENT_ID`;
  `provider.tsx:103-112` monta `VercelAnalytics` e `GoogleAnalytics` **somente quando o consentimento foi
  concedido**; `server.ts:15-30` resolve o estado do banner. **Nada lê agregado de volta** — o pacote
  publica evento, não consulta número.
- **Lacuna:** tudo que se agrega hoje é cabeça por tipo. Não existe noção de atividade, não existe série
  temporal, e não existe nenhuma leitura de visita à `apps/web` em lugar nenhum do repositório.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
  (coletada em 2026-08-21, revalidar após 2027-02-21 — dentro da validade).
- Prevalência: **3 em 10** starters entregam "dashboard de métricas do produto", valor **médio**, esforço
  **M**. A mesma nota registra que tela cheia de widget "aparece em templates de dashboard, não em kits de
  SaaS".

**O benchmark sustenta esta spec tão pouco quanto sustentou a `dashboard-home`, e pelo mesmo motivo.** 3/10
é prevalência baixa, e o `value: médio` reflete isso em vez de inflar. Mais: o benchmark mede "dashboard de
métricas" como bloco, e **não tem linha alguma** para KPI de usuário ativo, de churn ou de gráfico de
acesso. Não medi prevalência desses itens em separado.

O que sustenta a spec é a combinação de duas coisas internas. A primeira é que a home do admin já existe e
já tem o padrão de cartão, gráfico e rota de agregado, então o custo marginal desta entrega é baixo. A
segunda é que [`user-activity-tracking`](user-activity-tracking.md) produz um dado cujo valor é quase todo
aqui: carimbar o último acesso e nunca agregá-lo entrega uma coluna e para.

## Proposta — corte de MVP

Cobre os itens **a**, **b** e **d** do pedido. O item **c** (visitas à web) está nas perguntas em aberto,
porque não tem caminho decidido.

- [ ] **KPI de usuários ativos**, contados por uma definição explícita (acessaram nos últimos N dias),
      agregado no servidor sob `requireAdminApi`, sem ler a coleção.
- [ ] **KPI de usuários inativos**, com o X de "sem acesso há X dias" **visível na tela**, não escondido no
      código.
- [ ] **Gráfico de acesso dos usuários** ao longo de um período, reaproveitando o gráfico do design-system.
- [ ] Os dois KPIs usam `MetricCard`, entram no grupo `users` de `queryKeys.ts` e tratam carregando, vazio e
      erro no padrão que o `AdminHomeClient` já usa.
- [ ] Todo texto nos 3 idiomas, **incluindo a definição de "ativo" como `hint` do cartão**. Número cuja
      definição não está na tela é número que cada pessoa interpreta de um jeito.

### Fora do corte

- **Item c, visitas à `apps/web`** — sem caminho decidido; ver as perguntas em aberto.
- Seção de billing (contratações, planos mais vendidos, receita) — é
  [`admin-billing-insights`](admin-billing-insights.md), separada porque
  [`billing-subscription`](billing-subscription.md) está em 0/6.
- Tempo real, atualização automática e notificação de variação.
- Exportar as métricas, comparar com período anterior, filtro de intervalo escolhido pelo usuário.
- Segmentação (por tipo, por origem, por plano) e detalhamento por usuário a partir do número.
- Métricas de plataforma, como erro e latência — pertencem a
  [`observability-logging`](observability-logging.md).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Estende o agregado de usuários com os números de atividade, ou acrescenta um agregado vizinho. |
| `apps/api` | Agregação por instante sob `requireAdminApi`, no molde de `users/summary`, com a mesma degradação por índice ausente. |
| `apps/app` | Cartões e gráfico novos no `AdminHomeClient`; chaves novas em `queryKeys.ts`. Nenhuma tela nova. |
| `apps/web` | N/A neste corte. É o item c que tocaria a web, e ele está fora. |
| `packages/*` | `design-system`: segundo consumidor do gráfico, e talvez uma variante de série temporal. i18n nos 3 idiomas. |
| Infra/env | Nenhuma variável nova. **Provável índice composto novo** no Firestore para a consulta por instante. |

## Riscos e trade-offs

- **Nasce bloqueada sem [`user-activity-tracking`](user-activity-tracking.md).** Sem o carimbo não existe
  eixo para agregar, e os KPIs viram contagem de cadastro com outro nome.
- **"Usuário ativo" é uma definição, não uma medida.** Escolher mal produz um número que todo mundo cita e
  ninguém consegue reproduzir. É por isso que colocar a definição na tela está no corte e não em polimento.
- **Índice composto, de novo.** Contar por instante pede índice, e a fila de índices versionados e não
  publicados já tem **cinco entradas** (`docs/PRE-PRODUCTION.md` §1.1, §1.2 e §1.5), recontadas em
  2026-09-17 depois da PR #19. O emulador **não cobra índice composto**, então nenhum gate local pega isso:
  o sintoma aparece só em produção, como 503 de degradação. Um sexto entra na mesma fila.
- **O gráfico é a parte cara, e é onde o custo escapa.** Um balde por dia não sai de uma agregação só: ou
  são N agregações (uma por balde), ou se lê documento, que é exatamente o que `countQuery` existe para
  evitar. A granularidade escolhida decide o custo, e a decisão é do `/analyze`.
- **A precisão herda a janela de gravação** de `user-activity-tracking`. Um KPI de janela curta sobre um
  carimbo de janela de 15 minutos promete mais precisão do que tem.
- Custo herdado por fork que não usa: baixo. Nenhum serviço pago e nenhuma dependência nova, já que
  `recharts` foi resgatado pela `dashboard-home`.

## Sinais de pronto

- O admin abre a home e vê quantas pessoas estão usando o produto e quantas pararam.
- A definição de cada número está na tela, junto do número.
- Existe um gráfico de acesso que renderiza em tema claro, tema escuro e largura de celular.
- Uma base sem nenhum acesso registrado mostra estado vazio com orientação, não zeros soltos.
- Abrir a home não dispara leitura da coleção de usuários inteira.

## Perguntas em aberto

- **Como medir visitas ao projeto WEB (item c)?** Três saídas, nenhuma decidida, com o custo de cada uma:
  1. **Ler a GA Data API no servidor.** Aproveita o que já está plugado (`analytics/keys.ts:7-13`), mas
     exige credencial de conta de serviço e **variável de ambiente nova em todo fork**; e o GA só conta quem
     **concedeu consentimento** (`analytics/provider.tsx:103-111`), então o número subestima por construção.
  2. **Contador próprio no Firestore**, incrementado no servidor da `apps/web`. Sem provedor externo e sem
     env nova; em troca, **uma escrita por visita** (a mesma armadilha de custo de
     [`user-activity-tracking`](user-activity-tracking.md)) e a necessidade de tratar robô e recarga.
  3. **Provedor de analytics dedicado** com leitura de volta. `@vercel/analytics` já está montado
     (`provider.tsx:109`) e nada é lido dele hoje; adotar a leitura arrasta conta, e possivelmente plano
     pago, para todo fork.

  **Recomendação:** deixar o item c fora deste corte e decidi-lo à parte. Das três, o contador próprio é a
  única que não arrasta conta nem variável obrigatória para quem não usa o recurso, que é o critério do
  core. Enquanto não houver decisão, o honesto é a tela dizer que as métricas cobrem o painel, não a
  landing. **Não levantei preço nem prevalência de nenhuma das três — não assuma nada daqui.**
- **Qual a definição de "ativo" e de "inativo"?** — **recomendação:** ativo = acessou nos últimos 7 dias;
  inativo = sem acesso há mais de 30. Os dois números num único lugar, configuráveis, e escritos na tela.
  São pontos de partida, não padrão de mercado medido.
- **Qual a granularidade do gráfico?** — **recomendação:** a mais grossa que responde a pergunta (por
  exemplo, semanal ao longo de 12 semanas). Ela é mais barata de agregar e cabe no gráfico de barras que já
  existe, sem inventar um componente de série temporal no primeiro corte.
- **Os cartões novos entram no mesmo agregado de `GET /users/summary` ou numa rota vizinha?** —
  **recomendação:** rota vizinha. O `summary()` atual é barato e previsível (três contagens); misturar nele
  uma consulta que depende de índice faria a home inteira degradar quando só a parte de atividade falhasse.
