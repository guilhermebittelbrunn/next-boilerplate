---
id: <slug-em-ingles>
title: <título curto em português>
status: proposed
value: <alto | médio | baixo>
effort: <P | M | G>
audience: <produto | dx | confianca>
area: [<apps/api>, <apps/app>, <apps/web>, <packages/...>]
mode: <subscription | simple | ambos>
depends_on: []
feature: -
updated: <YYYY-MM-DD>
---

# <Título>

## Problema

Qual dor existe hoje, para quem, e o que acontece se nada for feito. 3–6 linhas, em linguagem de produto —
sem jargão de implementação.

## O que já existe no repo

Evidência concreta, com caminho e linha. Serve para provar que a spec **não duplica** nada e para mostrar
de onde a implementação vai partir.

- `apps/api/...:NN` — <o que já resolve / até onde vai>
- `packages/...:NN` — <peça reaproveitável>
- **Lacuna:** <o que falta, objetivamente>

## Evidência de mercado

Por que isto é padrão (ou por que é aposta). Cite a nota de pesquisa e as fontes.

- Nota: [`research/<topico>.md`](research/<topico>.md)
- Prevalência: <ex.: "8 de 12 starters pesquisados entregam por padrão">
- Fontes: <URL> · <URL>

> Se for um recurso de nicho, diga isso aqui explicitamente e justifique mesmo assim (ou rebaixe o
> `value`).

## Proposta — corte de MVP

A menor fatia vertical que entrega valor observável, no padrão do slice `entity`.

- [ ] <capacidade 1 — observável pelo usuário>
- [ ] <capacidade 2>
- [ ] <capacidade 3>

### Fora do corte

- <o que fica para uma spec/iteração seguinte, e por quê>

## Impacto por camada

Alto nível — o detalhe é do `/analyze`.

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | <novo recurso/DTO? ou nenhum> |
| `apps/api` | <rotas, guard, coleção nova?> |
| `apps/app` | <telas, painel comum × admin> |
| `apps/web` | <landing/marketing? ou N/A> |
| `packages/*` | <design-system, i18n, auth, payments, email> |
| Infra/env | <variável nova, índice do Firestore, regra, serviço externo> |

## Riscos e trade-offs

- <risco técnico, custo em serviço pago, limite de free tier, complexidade que contamina forks>
- <o que pode dar errado num fork que não usa este recurso>

## Sinais de pronto

Critérios em nível de produto (o formato executável §9.1 é gerado pelo `/test`).

- <observável 1>
- <observável 2>

## Perguntas em aberto

- <decisão que depende do usuário> — **recomendação:** <default>
