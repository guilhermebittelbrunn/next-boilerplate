---
slug: web-header-reflow-and-menu-name
title: Header da web cabe na janela e o botão do menu tem nome
task: -
spec: none
branch: fix/date-pickers-form-fields-and-header (recomendada para a PR das três tarefas, a renomear a partir de guilhermebittelbrunn/cycle-command-v4)
epic: -
updated: 2026-10-14 19:05
---

# Pipeline — Header da web cabe na janela e o botão do menu tem nome

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-14 18:10 | analyze/plan.md | botão do menu com `aria-label` do dicionário (chave `components.header.menu`: Menu/Menu/Menú) e `aria-expanded={isOpen}`; grade da barra cheia de `lg:grid-cols-3` para `lg:grid-cols-[1fr_minmax(0,auto)_1fr]` e `lg:truncate` na marca, sem tirar nem esconder item; abaixo de 1024 px nada muda; 1 teste SSR novo na web; sem SDK, API, env ou infra; 3 commits somados aos 13 do consolidado |
| develop | done    | 2026-10-14 18:15 | develop/handoff.md | Plano implementado; desvio: `brandSurfaces.test.tsx` fixava a classe exata da marca e ganhou o `lg:truncate` nas 2 strings esperadas; web 95→102 testes, i18n 67 com paridade, `pnpm check` e typecheck de web e i18n limpos; layout fica para o `/test` |
| review  | done    | 2026-10-14 19:05 | review/review.md | rodada 2: o `/test` mediu que o `lg:truncate` não agia (nome inteiro, `scrollWidth` = `clientWidth` no `<p>`); a classe saiu e o `brandSurfaces.test.tsx` voltou ao `HEAD`; a rede que faria a marca encolher (`lg:w-auto` ou `lg:min-w-max` no grupo da direita) ficou descartada e virou achado para o backlog com os números do `/test`; `pnpm check` 885, typecheck web 1/1, suíte da web 102/102; nada a remedir; plano de commits consolidado (16) sem o `brandSurfaces.test.tsx`, aguardando aprovação do usuário |
| test    | done    | 2026-10-14 18:34 | test/report.md | 5 critérios ✅, 1 ❌ informativo (não reprova, pelo plano), 0 🔒; config padrão: 36 combinações de 1024 a 1440 px sem rolagem lateral, marca a 0 px do centro, 7 itens em todas (controle positivo com a grade do `HEAD` repete 1304/+49/+6); menu "Menu"/"Menú" com `aria-expanded` alternando por clique e Enter; ❌ informativo: marca de 30 caracteres ainda rola 4 a 34 px a 1024; achado fora do diff: link de docs nunca aparece (`apps/web/env.ts`); `pnpm test` 15/15, `pnpm e2e` 22/22; portas liberadas |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Divide o working tree e a PR com `date-input-navigation` e `form-field-focus-and-names`, ainda não commitadas.
  Os commits desta tarefa entram no plano consolidado de `docs/features/form-field-focus-and-names/review/review.md`
  (posições na §15 do plano). Nenhum arquivo de código é tocado pelas três ao mesmo tempo.
- Tarefa direta, sem spec: vem da recomendação de `specs/BACKLOG.md:323-358`.
- Revisão feita em rodada autônoma do `/cycle`: nenhum commit, nenhuma branch criada ou renomeada. O plano de
  commits consolidado das três tarefas está em `review/review.md` e aguarda a aprovação do usuário.
- `/test` em rodada autônoma do `/cycle`: dados só no emulador, nenhuma conta nova; `test/criterios-aceite.md` e `test/report.md` entram no commit `docs(features): web-header-reflow-and-menu-name`. Dois achados para o backlog, com hipótese de correção no `test/report.md`: o link de documentação que nunca aparece e a marca longa que ainda estoura a 1024 px.
- Rodada 2 do `/review`: `lg:truncate` removido por não agir; o achado da configuração extrema a 1024 px e os três
  achados fora do diff do `/test` ficam para o próximo `/spec --sync` (ver `review/review.md`, "Rodada 2").
