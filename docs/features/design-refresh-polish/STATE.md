---
slug: design-refresh-polish
title: Acabamento final da branch de design (foco após excluir, theme-color, MetricStrip, seletor da tabela)
task: -
spec: none (tarefa direta)
branch: feat/design-system-refresh
epic: -
updated: 2026-11-27 22:11
---

# Pipeline: acabamento final da branch de design

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-27 21:13 | analyze/plan.md | Quatro correções sem API nem i18n: foco vai ao gatilho da linha vizinha (ou à busca) quando a linha excluída sai do DOM; `viewport.themeColor` `#f9fafb`/`#0c0e12` nos dois apps, com teste contra o token; `MetricStrip` de 4+ itens em grade 2/4 colunas; seletor de tamanho só some quando o total cabe no menor tamanho; sem infra |
| develop | done    | 2026-11-27 21:28 | develop/handoff.md | Os quatro itens implementados; foco sai da limpeza passiva por microtask (não `setTimeout`), divisórias do `MetricStrip` só somam, e2e confere a vizinha por índice; 215/1421/329 testes verdes, typecheck 4/4, `pnpm check` limpo; e2e não rodado |
| review  | done        | 2026-11-27 22:11 | review/review.md | Volta 2: o valor do `MetricStrip` de 4+ itens fica numa linha só (`whitespace-nowrap`, `text-xl xl:text-2xl`, célula `px-4`), homes de 1 a 3 itens sem mudança; 6 testes novos, app 1427 verdes, typecheck do app e `pnpm check` limpos; volta 1 sem bloqueante; plano de 9 commits, a correção no 5 |
| test    | done    | 2026-11-27 22:11 | test/report.md  | Volta 2: o ❌ do `MetricStrip` fechou; `123.456.789` numa linha em 390/1024/1280/1440 px (folga de 11 e 13 px nas estreitas), homes sem mudança; volta 1: foco depois de excluir confirmado no browser e e2e 10/10 repetido, `theme-color` e paginador ok; app 1427, `pnpm test` 15/15, `pnpm e2e` 45/45 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec. Fecha os achados que sobraram de `design-refresh-followups` (`test/report.md:109-111`)
  e as linhas correspondentes de `specs/reference/AUDIT.md`, na mesma branch, que ainda não foi mergeada.
- Pré-requisito de infra: nenhum.
