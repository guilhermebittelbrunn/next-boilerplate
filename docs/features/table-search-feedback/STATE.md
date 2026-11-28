---
slug: table-search-feedback
title: Retorno da busca da Table e foco depois do menu mobile da landing
task: -
spec: none (tarefa direta)
branch: feat/design-system-refresh
epic: -
updated: 2026-11-28 00:33
---

# Pipeline: retorno da busca da Table e foco depois do menu mobile da landing

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-27 22:15 | analyze/plan.md | Busca sem resultado com registros fora do filtro diz "Nenhum resultado para “termo”." com "Limpar busca" (foco volta ao campo); botão de limpar no campo; contagem em `role="status"` com debounce de 500 ms; 4 chaves × 3 idiomas; no menu mobile da web, link interno leva o foco ao `main#main-content` e externo, Ctrl+clique e "Sair" ao botão do menu; 6 consumidores sem mudança; sem infra |
| develop | done    | 2026-11-27 22:28 | develop/handoff.md | `Table` com estado "Nenhum resultado para “termo”.", "Limpar busca" no vazio e no campo (foco volta ao campo) e contagem em `role="status"` após 500 ms; menu mobile da web leva o foco ao `main` ou ao botão do menu; 4 chaves × 3 idiomas; 4 desvios (entre eles `wrap-anywhere` e o debounce que zera ao digitar); gates verdes e 8 mutações mortas |
| review  | done        | 2026-11-28 00:35 | review/review.md | Nenhum bloqueante; 1 correção em `table.tsx:233` (região de busca fica em silêncio durante o esqueleto); branch `feat/design-system-refresh` validada pela regex; gates estáticos verdes; 2 decisões em aberto e 7 itens para o `/test`; plano de 5 commits com i18n antes do design-system |
| test    | done    | 2026-11-28 00:33 | test/report.md  | 11 critérios ✅ e 7 itens do review medidos no navegador (F1–F9 claro/escuro, 390/1440, 3 idiomas; W1–W6 com o `Link` real, W4 com `NEXT_PUBLIC_DOCS_URL` de exemplo); região vazia no esqueleto 🔒 no navegador, provada em jsdom com mutação; caso herdado de `actionMenu.test.tsx` estabilizado; `pnpm test` root 15/15; sem defeito de produção |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec. Fecha o achado do texto de vazio falso registrado em
  `docs/features/design-refresh-polish/test/report.md:155-156` e o foco no `body` do menu mobile da landing
  (`specs/reference/AUDIT.md:390`, `:1294`), na mesma branch, que ainda não foi mergeada.
- Dois testes congelavam o texto falso e terão a expectativa trocada: `tablePagination.test.tsx:312` e
  `tableLoadMore.test.tsx:62` (decisão D8 do plano).
- Pré-requisito de infra: nenhum.
