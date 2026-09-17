---
id: dashboard-home
title: Home do painel com widgets
status: done
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: []
contends_on: ["apps/app/app/[locale]/(authenticated)/(common)/(pages)/page.tsx", "apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/page.tsx", apps/app/shared/lib/queryKeys.ts, firestore.indexes.json]
feature: dashboard-home
updated: 2026-09-17
---

# Home do painel com widgets

> **Entregue em 2026-09-17.** PR **#19** mergeada em `main` (merge commit `bfc4d8f`, 2026-09-17T18:46:32Z),
> CI `success` nesse SHA. Os cinco itens do corte foram reabertos um a um no código pela auditoria
> `/spec --sync` — o relatório está em [Entrega](#entrega--o-que-foi-conferido), no fim deste arquivo, junto
> dos três desvios e do escopo extra.

## Problema

A primeira tela que qualquer fork mostra depois do login está **vazia**. Não é "simples" nem "minimalista":
é um cabeçalho seguido de um fragmento sem conteúdo, nos dois painéis — o comum e o admin.

Para o usuário do fork, a primeira impressão do produto é uma página em branco. Para quem constrói o
fork, não existe modelo de tela de visão geral: cada MVP inventa o próprio layout de cartões, o próprio
jeito de agregar número e o próprio gráfico, geralmente na pressa da demo.

## O que já existe no repo

- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/page.tsx:4-11` — o componente inteiro é
  `<Header page="Home" /> + <Container />`. Onze linhas, sem nenhum conteúdo. O título `"Home"` (`:7`) é
  ainda uma **string literal fora do dictionary**, contra a regra de ouro 2 — e a chave traduzida já
  existe (`translations/apps/app/pages/common/routes/index.ts:3` pt-br, `:23` en, `:43` es — âncoras
  remedidas em 2026-09-15; a PR #12 inseriu as chaves de `settingsItems` no meio do arquivo). A chave
  **não é morta** — é consumida via `(common)/paths.ts:12` e renderizada no breadcrumb de **5** telas
  (playground, conta, lista/edição/criação de entidades). *(Recontado em 2026-09-17: são **9** breadcrumbs
  usando `routes.root.label` no repositório, dos quais **4 são do painel admin** — a PR #18 acrescentou o
  da trilha de auditoria —, e o rótulo do admin vem de `admin.routes.administration`, outra chave. O número
  desta chave continua **5**.)* A home é a
  **única** tela que a ignora e escreve o literal.
- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/page.tsx:7` — **idêntica**, mesma string
  literal.
  > **Deriva corrigida (`/spec --sync`, 2026-09-09):** a redação anterior falava em "doze linhas", um
  > `<Container><></></Container>` e um `biome-ignore` para o fragmento inútil. Nada disso existe hoje —
  > o fragmento vazio e o `biome-ignore` foram removidos e o arquivo tem onze linhas. **O argumento não
  > muda:** a página segue vazia. A spec estava desatualizada; a implementação não desviou.
- `packages/design-system/components/ui/chart.tsx` — wrapper de gráfico completo (`ChartContainer`,
  `ChartStyle`, tooltip/legend), reexportado no barrel em `components/ui/index.ts:8`, com `recharts`
  `^2.15.4` já instalado (`packages/design-system/package.json:31`). **Não é renderizado em lugar
  nenhum**: a única outra ocorrência de "chart" no app é a string `"chart"` dentro do catálogo de nomes
  de componentes em `.../(common)/(pages)/playground/page.tsx:130` — uma lista de texto, não um gráfico.
  Hoje é dependência paga e não usada.
- `apps/app/shared/hooks/` tem **7** hooks (remedido em 2026-09-17; eram 3, depois 5, depois 6):
  `useAuthorizedQuery.ts`, `useAuthorizedInfiniteQuery.ts` (PR #17), `useEmailVerification.ts` (PR #10),
  `useFileUpload.ts` (PR #11), `useMyAccount.ts` (PR #12), `useHealthCheck.ts:19` (que ainda usa `useQuery`
  direto) e `useListUsers.ts:25`. As duas linhas citadas seguem corretas — o que morre a cada rodada é o
  **número**.
  *(Registro honesto: ele foi corrigido em duas auditorias seguidas e voltou a envelhecer em um dia. A
  premissa "a pasta é rasa" **enfraquece** a cada ciclo; vale reconferir antes de usá-la como argumento.)*
- `apps/app/shared/lib/queryKeys.ts:11` — factory tipada com **5** grupos: `account` (`:12-15`, novo na
  PR #12), `auditEvents` (`:16-28`, novo na PR #18), `entities` (`:29`), `users` (`:35`) e `health`
  (`:43`); a hierarquia já suporta invalidação por prefixo. É onde as chaves de um widget entrariam.
  *(Âncoras remedidas em 2026-09-17: a PR #18 inseriu `auditEvents` no meio do arquivo e empurrou os três
  grupos seguintes para baixo.)*
- `apps/api/app/(routes)/` — **20** rotas: `account/*` ×3, `audit-events`, `auth/*` ×8, `entities`,
  `entities/[id]`, `files`, `users`, `users/[id]`, `health`, `health/ready`, `webhooks/payments`. Nenhuma
  devolve agregado; contagem só existe implicitamente no tamanho da lista.
  > **Correção de 2026-09-16 — o total estava certo e o inventário, errado.** A lista anterior omitia
  > `health/ready`, criada pela PR #15, e o total continuou batendo em 19 por compensação na leitura. Um
  > número certo apoiado num inventário errado é pior que um número errado: não dispara revisão.
- **Lacuna:** não há tela de visão geral, não há dado agregado, e o único primitivo de visualização do
  design system nunca foi exercitado.

## Evidência de mercado

- Nota: [`specs/research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md)
- Prevalência: **3 de 10** starters entregam "dashboard de métricas do produto" — valor **médio**,
  esforço **M**. A nota registra ainda que command palette e afins "aparecem em templates de dashboard,
  não em kits de SaaS", ou seja, tela cheia de widget é decoração em boa parte do mercado.

> **Sejamos honestos: o benchmark não sustenta esta spec.** 3/10 é prevalência baixa e o valor de
> mercado é só médio — o `value: médio` reflete isso e não deve ser inflado. O que sustenta a spec é o
> código acima: a home **não está simples, está vazia** (`page.tsx:7`, nos dois painéis), e o repo
> carrega um wrapper de gráfico com `recharts` que nunca é renderizado. Não se propõe um "dashboard de
> métricas" para copiar o mercado, e sim **preencher a tela que todo fork mostra primeiro** com um
> exemplo copiável, como o slice `entity`. O entregável é um **padrão**, não um produto de analytics.

## Proposta — corte de MVP

- [ ] A home do painel comum deixa de ser vazia: mostra a saudação ao usuário e 2–3 cartões de resumo
      sobre dados que já existem (ex.: total de registros do usuário no slice `entity`).
- [ ] Um dos blocos é um **gráfico**, exercitando pela primeira vez o `chart.tsx` que já está no
      design-system — prova de que o primitivo funciona e serve de molde para o fork.
- [ ] Os números vêm de **agregação no servidor**, sob o guard de painel comum, e não de contar o
      tamanho de uma lista trazida inteira para o cliente.
- [ ] A home do admin recebe o equivalente do lado operacional (ex.: total de usuários), sob
      `requireAdminApi`.
- [ ] Estados vazio, carregando e erro tratados nos widgets, e todo texto no dictionary nos 3 idiomas —
      o que também elimina a string literal `"Home"` de hoje.

### Fora do corte

- Widgets configuráveis, arrastáveis, ocultáveis ou por papel — complexidade sem retorno num core.
- Séries temporais reais, comparação com período anterior, filtro de intervalo de datas.
- Métricas de receita/assinatura — dependem de `billing-subscription`.
- Métricas operacionais de plataforma (erros, latência) — pertencem a `observability-logging`.
- Contagem eficiente em escala (contador materializado, agregação incremental) — o MVP pode contar
  direto; ver riscos.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Ação de resumo/agregado, com escopo diferente para painel comum e admin. |
| `apps/api` | Rota(s) de agregação sob os guards existentes. Sem coleção nova; possivelmente índice de contagem. |
| `apps/app` | Conteúdo real nas duas `page.tsx` de home; hooks de dados no padrão `useListX`/`useFindX`; chaves novas em `queryKeys.ts`. |
| `apps/web` | N/A. |
| `packages/*` | `design-system`: primeiro uso do `chart.tsx`; possivelmente um cartão de métrica reutilizável. i18n nos 3 idiomas. |
| Infra/env | Nenhuma env nova, nenhum serviço externo. Pode exigir índice no Firestore para as agregações. |

## Riscos e trade-offs

- **Contagem no Firestore é armadilha de custo.** Ler uma coleção para contar cobra por documento lido.
  Num fork com volume, uma home que conta em toda visita vira a rota mais cara do produto. O corte tem de
  usar agregação do próprio Firestore ou cache com validade, nunca `listar tudo e medir o tamanho`.
- **Custo herdado por todo fork:** baixo, e é o argumento a favor — nenhuma env, nenhum serviço pago,
  nenhuma dependência nova (`recharts` já está instalado e hoje só pesa no bundle sem entregar nada). O
  risco real é o oposto: widget genérico demais, que todo fork apaga. Tratar a home como **exemplo
  removível** é a mitigação — e isso inclui deixar óbvio o acoplamento ao slice `entity`, para que apagar
  `entity` no fork não quebre a home de forma obscura.
- Um gráfico na primeira tela puxa `recharts` para o caminho crítico do painel; sem carregamento sob
  demanda, piora o tempo até a primeira interação exatamente na tela mais visitada.

## Sinais de pronto

- Entrar no painel comum mostra conteúdo com significado, não uma área em branco.
- O mesmo vale para o painel admin, com dado de escopo administrativo.
- Nenhuma string da home fora do dictionary, nos 3 idiomas — inclusive o título, hoje literal.
- Um usuário sem nenhum registro vê estado vazio com orientação, não zeros soltos nem esqueleto eterno.
- Abrir a home não dispara leitura da coleção inteira.
- O gráfico renderiza corretamente em tema claro, tema escuro e largura de celular.

## Perguntas em aberto

- Os widgets devem ser exemplos sobre `entity` ou métricas neutras da conta (data de cadastro, plano,
  atividade)? — **recomendação:** exemplos sobre `entity`, coerentes com o slice de referência e óbvios
  de trocar; métricas neutras entregam menos e ensinam menos.
- Vale um cartão de métrica reutilizável no design-system, ou fica local no app? — **recomendação:**
  local no app no primeiro corte; promover ao pacote só quando um segundo consumidor aparecer.

## Entrega — o que foi conferido

Auditoria de 2026-09-17, com o `HEAD` em `bfc4d8f`. Cada item do corte foi reaberto no código-fonte.

| item | veredito | evidência |
|------|----------|-----------|
| 1. Home comum com saudação e 2–3 cartões | **implementado** | `CommonHomeClient.tsx:62-64` monta a saudação com o primeiro nome vindo de `useMyAccount`, com recuo para `useAuth`; `:131-142` renderiza os cartões de total e ativas sobre `EntitySummaryDTO` |
| 2. Um bloco é gráfico, exercitando o `chart.tsx` | **implementado** | `packages/design-system/components/ui/category-bar-chart.tsx:6,40` consome `ChartContainer` do `chart.tsx`; `EntityTypeChart.tsx:40` é o primeiro consumidor de produto. O `recharts` deixou de ser peso morto depois de estar instalado sem uso desde o fork |
| 3. Números vêm de agregação no servidor | **implementado** | `base.repository.ts:122-124` expõe `countQuery` sobre `query.count().get()`; `entity.repository.ts:29-52` roda cinco agregações em paralelo sem ler documento; rota em `entities/summary/route.ts:6-8`, sob `requireCommonPanelApi` |
| 4. Home do admin com equivalente operacional | **implementado** | `users/summary/route.ts:6-8` sob `requireAdminApi`; `user.repository.ts:52-63` conta total, admins e comuns; `AdminHomeClient.tsx:33-55` monta os três cartões |
| 5. Vazio, carregando e erro + 3 idiomas, sem o literal `"Home"` | **implementado** | `CommonHomeClient.tsx:75-126` cobre erro, carregando e vazio; dicionários em `translations/apps/app/pages/common/home.ts` e `admin/home.ts`; as duas homes passaram a ler `routes.root.label` (`CommonHomeClient.tsx:167`, `AdminHomeClient.tsx:61`) e `grep '"Home"'` na `apps/app` devolve zero |

### Desvios entre o especificado e o entregue

| especificado | entregue | leitura |
|--------------|----------|---------|
| "exercitando o `chart.tsx` que já está no design-system" | O app não consome `chart.tsx` direto: a PR criou `category-bar-chart.tsx` **no próprio pacote**, e o app consome esse wrapper | **A implementação desviou, com motivo registrado no handoff:** `recharts` não é dependência declarada da `apps/app`, então importá-lo de lá funcionaria só por hoisting do pnpm. O efeito colateral é bom — o wrapper temático é reutilizável e as duas specs de painel novas já o citam como peça |
| "possivelmente um cartão de métrica reutilizável" no design-system, com a recomendação de manter local | `MetricCard.tsx` ficou em `apps/app/shared/components/ui/` | **A recomendação foi seguida.** Registrado só para contraste com a linha acima: dos dois componentes novos, um foi para o pacote e o outro não, e o critério foi a dependência, não a estética |
| "estados vazio, carregando e erro tratados nos widgets" | A home comum tem os três; a do admin tem carregando e erro, sem estado vazio | **A spec estava errada.** Não existe painel admin com zero usuários — quem está olhando a tela é um deles. Um estado vazio ali seria código inalcançável |

### Além do corte

1. **Prefetch no servidor com `HydrationBoundary`**, e o prefetch é **pulado durante impersonação**
   (`(common)/(pages)/page.tsx:14-25`): a chamada do servidor carrega só o Bearer do admin, então contaria
   os registros dele e mostraria o número errado por um instante antes da correção no cliente.
2. **O gráfico entra por `dynamic` com `ssr: false`** (`CommonHomeClient.tsx:38-44`), respondendo ao risco
   que a própria spec levantou: `recharts` não faz tree-shaking e chegaria inteiro no chunk da tela mais
   visitada do painel.
3. **`SUMMARY_INDEX_MISSING` com degradação traduzida nos 3 idiomas**
   (`translations/packages/shared/utils.ts:81,160,246`), no mesmo padrão que `cursor-pagination` inaugurou.
4. **Dois `loading.tsx`**, um por painel, e três índices compostos novos em `firestore.indexes.json`,
   cobertos por `apps/api/__tests__/firestoreIndexes.test.ts`.

### Ressalvas que sobrevivem ao `done`

- **Os três índices compostos precisam ser publicados** antes de a home funcionar em produção; até lá as
  duas rotas respondem 503 e os cartões mostram o erro traduzido. Está em `docs/PRE-PRODUCTION.md` §1.5.
- **`userRepository.summary()` conta sem juntar com o Firebase Auth** (`user.repository.ts:46-51`
  documenta a escolha): um perfil cujo usuário do Auth foi apagado por fora entra na contagem e não aparece
  na listagem. O total do cartão pode passar do número de linhas da tabela, de propósito.
- **O predicado de posse foi copiado, não reusado** — `summaryByUserId` repete o
  `where("userId", "==", userId)` que `listByUserId` já fazia. Isso engorda o argumento de
  [`teams-organizations`](../../../specs/teams-organizations.md), que conta os sítios de escopo por usuário.
