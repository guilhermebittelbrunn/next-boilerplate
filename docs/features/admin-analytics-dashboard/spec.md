---
id: admin-analytics-dashboard
title: Métricas de atividade na home do admin
status: done
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: [user-activity-tracking, dashboard-home]
contends_on: ["apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/AdminHomeClient.tsx", apps/app/shared/lib/queryKeys.ts, apps/api/app/(routes)/users/summary/route.ts, firestore.indexes.json]
feature: admin-analytics-dashboard
updated: 2026-09-23
---

> **Entregue na PR #22**, mergeada em `main` em 2026-09-20T23:28:49Z (merge commit `03498ae`), CI
> `success` nesse SHA (`gh run 35544765975`). Os cinco itens do corte foram reabertos um a um no código na
> auditoria de 2026-09-23 e todos fecharam. O que mudou de forma entre o especificado e o construído está
> em [Deriva de implementação](#deriva-de-implementação).

# Métricas de atividade na home do admin

## Problema

A home do admin conta cabeças. Ela responde quantas contas existem e de que tipo, e para por aí: uma base
de mil cadastros dos quais novecentos foram abandonados aparece exatamente igual a uma base de mil pessoas
usando o produto todo dia.

Quem opera um fork precisa da outra pergunta: quantos estão usando agora, quantos pararam, e para onde a
curva aponta. Nenhuma das três tem resposta hoje, porque nada no produto agrega o eixo do tempo.

## O que já existe no repo

[`dashboard-home`](../dashboard-home/spec.md) entregou as peças e o padrão. Esta spec estende aquilo em vez de
começar do zero.

> ✅ **As duas dependências estão satisfeitas desde 2026-09-19 — esta spec está destravada.**
> `dashboard-home` entrou em `main` em 2026-09-17 (PR #19, merge `bfc4d8f`) e
> [`user-activity-tracking`](../user-activity-tracking/spec.md) em 2026-09-19 (PR #21, merge
> `e656331`), as duas com CI verde no SHA de merge. As âncoras abaixo foram remedidas contra `main` em
> 2026-09-19.
>
> **O que a entrega de ontem mudou para esta spec:** o eixo temporal passou a existir. `lastAccessAt`
> está no `UserDTO` (`packages/sdk/src/types/user/user.ts:27`), é carimbado pelos guards da API
> (`apps/api/app/(guards)/admin.ts:73`, `common-panel.ts:87`) através de
> `apps/api/(shared)/lib/activity-recorder.ts`, e já aparece na listagem do admin
> (`UsersListClient.tsx:127`). Falta agregá-lo — que é exatamente o corte desta spec.
>
> ⚠️ **A precisão do campo é de 15 minutos**, não instantânea: `ACTIVITY_WINDOW_MINUTES`
> (`activity-windows.ts:8`). Todo KPI construído aqui herda essa folga, e o texto da tela precisa dizer
> isso — ver os riscos.

- `apps/api/app/(routes)/users/summary/route.ts:6-20` — `GET /users/summary` sob `requireAdminApi`, devolve
  `userRepository.summary()` e degrada para `SUMMARY_INDEX_MISSING` com 503 quando falta índice
  (`:12-17`). É o molde de rota de agregado, incluindo a degradação traduzível.
- `apps/api/(shared)/repositories/user.repository.ts:63-71` — `summary()` roda **três contagens em
  paralelo** e não lê documento; o comentário em `:57-62` registra por que a contagem não refaz o join com
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
- **Lacuna, reescrita em 2026-09-19:** tudo que se **agrega** hoje é cabeça por tipo. ⚠️ A versão anterior
  dizia "não existe noção de atividade", e isso ficou falso com a PR #21: o instante por usuário existe
  (`lastAccessAt`), só não há nada que o leia em conjunto. `grep -rni "activeUsers|inactiveUsers"` devolve
  **zero**, o `UserSummaryDTO` (`packages/sdk/src/types/user/user.ts:49-52`) segue com `total` + `byType`,
  e `queryKeys.users` (`:36-44`) não ganhou chave nova. Continuam sem existir: série temporal e qualquer
  leitura de visita à `apps/web`.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md)
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
segunda é que [`user-activity-tracking`](../user-activity-tracking/spec.md) produz um dado cujo valor é quase todo
aqui: carimbar o último acesso e nunca agregá-lo entrega uma coluna e para.

## Proposta — corte de MVP

Cobre os itens **a**, **b** e **d** do pedido. O item **c** (visitas à web) está nas perguntas em aberto,
porque não tem caminho decidido.

- [x] **KPI de usuários ativos**, contados por uma definição explícita (acessaram nos últimos N dias),
      agregado no servidor sob `requireAdminApi`, sem ler a coleção.
- [x] **KPI de usuários inativos**, com o X de "sem acesso há X dias" **visível na tela**, não escondido no
      código.
- [x] **Gráfico de acesso dos usuários** ao longo de um período, reaproveitando o gráfico do design-system.
- [x] Os dois KPIs usam `MetricCard`, entram no grupo `users` de `queryKeys.ts` e tratam carregando, vazio e
      erro no padrão que o `AdminHomeClient` já usa.
- [x] Todo texto nos 3 idiomas, **incluindo a definição de "ativo" como `hint` do cartão**. Número cuja
      definição não está na tela é número que cada pessoa interpreta de um jeito.

### Fora do corte

- **Item c, visitas à `apps/web`** — sem caminho decidido; ver as perguntas em aberto.
- Seção de billing (contratações, planos mais vendidos, receita) — é
  [`admin-billing-insights`](../admin-billing-insights/spec.md), separada porque
  [`billing-subscription`](../billing-subscription/spec.md) está em 0/6.
- Tempo real, atualização automática e notificação de variação.
- Exportar as métricas, comparar com período anterior, filtro de intervalo escolhido pelo usuário.
- Segmentação (por tipo, por origem, por plano) e detalhamento por usuário a partir do número.
- Métricas de plataforma, como erro e latência — pertencem a
  [`observability-logging`](../../../specs/observability-logging.md).

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

- ✅ **O bloqueio caiu em 2026-09-19.** Este risco dizia que sem o carimbo de
  [`user-activity-tracking`](../user-activity-tracking/spec.md) não existiria eixo para
  agregar, e os KPIs virariam contagem de cadastro com outro nome. O carimbo entrou na PR #21. O que
  sobra do risco é **a precisão herdada**: o campo tem folga de 15 minutos e não é backfillado, então na
  estreia a maior parte da base aparece como "nunca acessou" até que cada usuário volte.
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
     [`user-activity-tracking`](../user-activity-tracking/spec.md)) e a necessidade de tratar robô e recarga.
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

## Estado da entrega

Conferido no código em 2026-09-23, com o `HEAD` em `03498ae`. Cada item foi reaberto no arquivo, não
herdado do `STATE.md` da feature nem do `status` gravado.

| item | veredito | evidência |
|------|----------|-----------|
| 1. KPI de ativos, definição explícita, agregado no servidor sob `requireAdminApi`, sem ler a coleção | **implementado** | `GET /users/activity-summary` em `apps/api/app/(routes)/users/activity-summary/route.ts:6`, embrulhado em `requireAdminApi`. O número sai de `userRepository.activitySummary()` (`user.repository.ts:92`), que roda **cinco** `countQuery` em paralelo (`:104-111`) sobre `base.repository.ts:122`, ou seja, `query.count().get()` e nenhum documento lido. `active: last7Days` em `:116` |
| 2. KPI de inativos, com o X de "sem acesso há X dias" na tela | **implementado** | `inactive: from31To90Days + over90Days` em `user.repository.ts:117`. O X viaja do servidor: `thresholds.inactiveDays` em `:129`, lido de `INACTIVE_AFTER_DAYS = 30` (`activity-windows.ts:14`), e entra no texto do cartão por interpolação em `UserActivitySection.tsx:56-60`. O número na tela e o número que a consulta usa são o mesmo valor, não duas cópias |
| 3. Gráfico de acesso reaproveitando o componente do design-system | **implementado**, com desvio de forma | `UserRecencyChart.tsx:48-54` monta o `CategoryBarChart` de `packages/design-system/components/ui/category-bar-chart.tsx` com cinco faixas (`:40-46`). Não é série temporal: ver a deriva 1 |
| 4. `MetricCard`, grupo `users` de `queryKeys.ts`, e carregando/vazio/erro no padrão do `AdminHomeClient` | **implementado** | `MetricCard` em `UserActivitySection.tsx:90-101`; chave nova em `queryKeys.ts:43-44`, dentro do grupo `users`. Carregando em `:67-85` (esqueleto nos dois cartões e no gráfico), erro em `:63-65` via `FormattedError` + `handleClientError` + `LoadErrorState`, base sem carimbo nenhum em `:112-118`, que mostra quantos perfis ainda não têm registro e diz quando o registro começa |
| 5. Texto nos 3 idiomas, com a definição de "ativo" como `hint` | **implementado** | `translations/apps/app/pages/admin/home.ts` — pt-br `:19-46`, en `:65-92`, es `:111-138`. O `hint` de ativo traz os dois números interpolados, dias e precisão (`:25`, `:71`, `:117`); o de inativo traz os dias e diz que não conta quem nunca acessou (`:29`, `:75`, `:121`) |

Cobertura somada pela entrega: 8 casos em `userActivitySummaryRepository.test.ts`, 6 em
`usersActivitySummaryRoute.test.ts`, 6 em `activityWindows.test.ts`, 6 em `firestoreIndexes.test.ts`,
9 em `userActivitySection.test.tsx`, 6 em `userRecencyChart.test.tsx`, 8 em `adminHomePrefetch.test.tsx`
e 5 em `adminHomeActivityDegraded.test.tsx`.

**A pergunta em aberto sobre visitas à `apps/web` foi respondida na tela, não no código.** O corte a
deixou de fora, e a recomendação era que o texto dissesse que as métricas cobrem o painel. Cumprido:
`home.ts:21` diz "Quem acessou o painel e há quanto tempo", e a descrição do gráfico (`:34-35`) explica
que cada perfil aparece numa faixa só. A decisão sobre como medir a landing continua sem resposta.

## Deriva de implementação

Três, sendo que a primeira contradiz o corte e a spec é que estava errada.

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "Gráfico de acesso dos usuários **ao longo de um período**", com a recomendação de granularidade semanal ao longo de 12 semanas | Histograma de **recência** em cinco faixas: 0-7d, 8-30d, 31-90d, +90d e "nunca" (`activity-windows.ts:34-48`, `UserRecencyChart.tsx:40-46`) | **A spec estava errada, e o erro é de modelo de dados.** `lastAccessAt` guarda **um** instante por perfil, o último. Série temporal de acessos não sai desse campo: exigiria uma coleção de eventos, que `user-activity-tracking` descartou de propósito. O histograma de recência é a pergunta que o dado responde, e responde com cinco agregações em vez de doze |
| "Provável índice composto novo" | Um índice (`user`: `deletedAt` + `lastAccessAt`, `firestore.indexes.json`) **e um teste que exige a declaração** (`apps/api/__tests__/firestoreIndexes.test.ts`, 6 casos) | **A implementação foi além, e resolveu um problema que a spec só descrevia.** O risco escrito era que o emulador serve consulta indexada ou não, então nenhum gate local pega índice faltando. O teste não prova que o índice está **publicado**, mas prova que está **declarado** — é o primeiro gate do repositório sobre essa fila |
| O `contends_on` declarava `apps/api/app/(routes)/users/summary/route.ts` | Esse arquivo **não foi tocado**. A entrega criou a rota vizinha `users/activity-summary/route.ts`, seguindo a recomendação da própria spec | **Erro de previsão por excesso, o primeiro registrado.** As três rodadas anteriores erraram o `contends_on` por **falta**; esta errou por sobra. A causa é a mesma nas quatro: o campo foi preenchido listando arquivos lembrados, não a camada. Os arquivos que a entrega tocou e nenhuma spec previa continuam sendo vizinhos de camada: `user.repository.ts`, `base.repository.ts` e `category-bar-chart.tsx` |

### O que a PR #22 entregou além do corte

1. **Consertou o teste instável que derrubou o CI da PR #21.** `base.repository.ts:151` agora cria um
   `const createdAt` único e o usa nos dois campos (`:154-155`), em vez de duas chamadas a `new Date()`. O
   comentário em `:148-150` registra a regra. Era o achado 🔴 da auditoria anterior, e foi fechado de
   passagem por uma PR que não tinha isso no escopo.
2. **O `recharts` sai do caminho crítico.** `UserActivitySection.tsx:22-28` carrega o gráfico por
   `next/dynamic` com `ssr: false` e esqueleto, para que os cartões pintem sem esperar uma biblioteca que
   não faz tree-shaking. A home do admin é a primeira tela que um administrador abre.
3. **O balde "nunca" é subtração, não consulta, e a subtração está protegida.** Um perfil sem
   `lastAccessAt` não entra em índice nenhum, então ele é o resto do total (`user.repository.ts:125`). O
   `Math.max(0, …)` existe porque as cinco contagens não são transacionais, e o motivo está escrito em
   `:123-124`.
4. **Prefetch no servidor.** `page.tsx:22-25` pré-carrega o novo agregado junto do antigo, dentro do mesmo
   `Promise.all`, e só quando ninguém está personificando (`:14`).
