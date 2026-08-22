---
id: dashboard-home
title: Home do painel com widgets
status: proposed
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/sdk, packages/design-system, packages/internationalization]
mode: ambos
depends_on: []
feature: -
updated: 2026-08-21
---

# Home do painel com widgets

## Problema

A primeira tela que qualquer fork mostra depois do login está **vazia**. Não é "simples" nem "minimalista":
é um cabeçalho seguido de um fragmento sem conteúdo, nos dois painéis — o comum e o admin.

Para o usuário do fork, a primeira impressão do produto é uma página em branco. Para quem constrói o
fork, não existe modelo de tela de visão geral: cada MVP inventa o próprio layout de cartões, o próprio
jeito de agregar número e o próprio gráfico, geralmente na pressa da demo.

## O que já existe no repo

- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/page.tsx:5` — o componente inteiro é
  `<Header page="Home" /> + <Container><></></Container>`. Doze linhas, incluindo um
  `biome-ignore` para o fragmento inútil (`:1`). O título `"Home"` (`:8`) é ainda uma **string literal
  fora do dictionary**, contra a regra de ouro 2.
- `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/page.tsx:5` — **idêntica**, mesma string
  literal, mesmo fragmento vazio.
- `packages/design-system/components/ui/chart.tsx` — wrapper de gráfico completo (`ChartContainer`,
  `ChartStyle`, tooltip/legend), reexportado no barrel em `components/ui/index.ts:8`, com `recharts`
  `^2.15.4` já instalado (`packages/design-system/package.json:31`). **Não é renderizado em lugar
  nenhum**: a única outra ocorrência de "chart" no app é a string `"chart"` dentro do catálogo de nomes
  de componentes em `.../(common)/(pages)/playground/page.tsx:130` — uma lista de texto, não um gráfico.
  Hoje é dependência paga e não usada.
- `apps/app/shared/hooks/` tem exatamente **3** hooks: `useAuthorizedQuery.ts`, `useHealthCheck.ts:19`
  (que ainda usa `useQuery` direto) e `useListUsers.ts:25`.
- `apps/app/shared/lib/queryKeys.ts:11` — factory tipada com `entities`, `users` e `health`; a hierarquia
  já suporta invalidação por prefixo. É onde as chaves de um widget entrariam.
- `apps/api/app/(routes)/` — **10** rotas (`auth/*`, `entities`, `entities/[id]`, `users`, `users/[id]`,
  `health`, `webhooks/payments`). Nenhuma devolve agregado; contagem só existe implicitamente no tamanho
  da lista.
- **Lacuna:** não há tela de visão geral, não há dado agregado, e o único primitivo de visualização do
  design system nunca foi exercitado.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- Prevalência: **3 de 10** starters entregam "dashboard de métricas do produto" — valor **médio**,
  esforço **M**. A nota registra ainda que command palette e afins "aparecem em templates de dashboard,
  não em kits de SaaS", ou seja, tela cheia de widget é decoração em boa parte do mercado.

> **Sejamos honestos: o benchmark não sustenta esta spec.** 3/10 é prevalência baixa e o valor de
> mercado é só médio — o `value: médio` reflete isso e não deve ser inflado. O que sustenta a spec é o
> código acima: a home **não está simples, está vazia** (`page.tsx:5`, nos dois painéis), e o repo
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
