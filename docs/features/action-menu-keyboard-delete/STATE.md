---
slug: action-menu-keyboard-delete
title: "Excluir" do menu de ações funciona pelo teclado
task: -
spec: none
branch: design-system/fix/action-menu-keyboard-delete
epic: -
updated: 2026-10-06 14:09
---

# Pipeline — "Excluir" do menu de ações funciona pelo teclado

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-06 00:46 | analyze/plan.md | `Popconfirm` controlado por estado e aberto pelo `onClick` do item (o `rc-menu` chama no Enter e no clique), ancorado no "⋮" por um `<span>` que embrulha o `Dropdown`; foco vai para "Não" no `afterOpenChange` e volta ao gatilho em Esc/"Não"/"Sim"; gatilho ganha `aria-haspopup="menu"` + `aria-expanded`; 1 arquivo de produção + 9 casos no teste de componente jsdom; sem SDK, API, i18n, env ou infra; 2 commits sugeridos |
| develop | done    | 2026-10-06 00:54 | develop/handoff.md | `ActionsMenu` com `Popconfirm` controlado na estrutura H, foco em "Não" e volta ao gatilho, `aria-haspopup`/`aria-expanded`; 9 casos novos (13/13 no arquivo, 54/54 no pacote), 4 mutações conferidas; typecheck e `pnpm check` limpos; 2 desvios só no teste (espera do foco no menu, fechamento por `role="tooltip"`) |
| review  | done    | 2026-10-06 14:09 | review/review.md | Rodada 2: D1 corrigido trocando `placement="bottomRight"` por `placement="bottom"` no `Popconfirm` (só `top`/`bottom` têm `shiftX` no antd, então o painel volta a ser deslocado para dentro da viewport); 60/60 no pacote, typecheck e `pnpm check` limpos; posição a 390 px e no desktop a medir no `/test` (item 9). Rodada 1: `onConfirm` devolve o retorno de `onDelete`; branch `design-system/fix/action-menu-keyboard-delete` (regex OK); 3 commits planejados |
| test    | done    | 2026-10-06 01:47 | test/report.md, test/criterios-aceite.md | 11/11 critérios aprovados; rodada 2 confirmou o D1 corrigido (`placement="bottom"`): a 390 px a confirmação fica em x 0 a 390 (pt-br) e 9 a 389 (es), entidades e admin, claro e escuro, abaixo do "⋮" e com a seta nele; vira para cima sem espaço embaixo; E2E `entityCrud` e teclado mínimo verdes; 6 casos jsdom novos (60/60); contorno de foco no escuro 1,31:1 registrado como herdado do antd |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir da recomendação #1 da auditoria em `specs/BACKLOG.md` (`:185-195`) e dos
  achados em `:625-626`. Plano feito em rodada autônoma do `/cycle`: as 9 decisões tomadas sem perguntar
  estão na §12 do plano, cada uma com a alternativa descartada, e as 4 perguntas da §11 já vêm com a opção
  adotada.
- A abordagem saiu da leitura do código do antd 5.29.3, `rc-menu`, `rc-dropdown` e `@rc-component/trigger`
  (plano, §1.6). Duas estruturas mais óbvias foram descartadas por leitura: pôr o `Popconfirm` entre o
  `Dropdown` e o botão faz o Esc do menu parar de devolver o foco ao gatilho.
- O `afterOpenChange` dispara no jsdom sem desligar a animação; o plano B do §8 não foi usado (mutação M2 no
  handoff).
- O índice deste checkout já tem um `git mv` de `specs/plan-entitlements.md` de outra rodada; conferir
  `git diff --cached --stat` antes do primeiro commit.
- A decisão D7 do plano (`bottomRight` na confirmação) caiu no `/test` (D1) e foi revista no `/review`, rodada 2: ver `review/review.md`.
- Pré-requisitos manuais de infra: nenhum.
