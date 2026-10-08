---
slug: antd-theme-seed-colors
title: Cores-semente do antd deixam de virar #000000
task: -
spec: none
branch: design-system/fix/antd-theme-seed-colors
epic: -
updated: 2026-10-07 22:05
---

# Pipeline — Cores-semente do antd deixam de virar #000000

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-07 20:46 | analyze/plan.md | `AntdAppProvider` escolhe entre `antdThemes.light`/`dark` pelo `resolvedTheme` do `next-themes`; sementes viram hex por tema (`antdSeedColors`) amarrados ao `globals.css` por teste de paridade; escuro com `darkAlgorithm` + `keepSeedColors` para não misturar a semente com `#141414`; anel de foco = primário; `Button.primaryColor` = `--primary-foreground`; token novo `--warning`; sai o override `Dropdown.colorError`; 2 arquivos de produção + 1 teste novo + 2 ajustados; sem SDK, API, i18n, env ou infra; 2 commits sugeridos |
| develop | done    | 2026-10-07 21:06 | develop/handoff.md | Provider com `antdThemes` por `resolvedTheme`, sementes hex, `keepSeedColors`, anel de foco primário, `Button.primaryColor`, `--warning`, sem `Dropdown.colorError`; T2 vermelho registrado (3/3 `#000000`); 8 mutações pegas; design-system 80/80, app 826, web 87, typecheck dos 3 e `pnpm check` limpos; sem desvio de decisão |
| review  | in-progress | 2026-10-07 21:15 | review/review.md | Branch `design-system/fix/antd-theme-seed-colors` criada e validada no regex; sem bloqueante; corrigido o provider para respeitar `forcedTheme` do `next-themes`; cache do `typecheck` do turbo confirmado e mandado ao backlog; `pnpm check` 861 sem erro, typecheck do pacote exit 0; 8 itens para o `/test` medir; 3 commits propostos |
| test    | done    | 2026-10-07 22:05 | test/report.md  | 12/12 critérios ✅ em `next build && start`, comparado com build do `HEAD`; 8/8 itens do review confirmados (spinner do antd não existe nos fluxos; texto do foco de teclado do item "Excluir" corrigido, valores iguais ao `HEAD`); 3 Vitest novos (`forcedTheme`, troca de tema, `danger` no escuro), design-system 83/83, `pnpm test` 15/15; portas devolvidas |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir da recomendação #1 da auditoria em `specs/BACKLOG.md` (`:185-219`) e do
  achado em `:737`. Plano feito em rodada autônoma do `/cycle`: as 10 decisões tomadas sem perguntar estão na
  §12 do plano, e as 3 perguntas da §11 já vêm com a opção adotada.
- Os valores de token e de contraste do plano foram medidos com `theme.getDesignToken()` do antd 5.29.3
  instalado. Com o código de hoje, `colorPrimary`, `colorError` e `colorLink` saem `#000000` e o
  `colorPrimaryBorder` sai `#262626`, como a auditoria registrou.
- O critério 1 do BACKLOG foi reescrito como "cada semente sai igual ao hex do tema": no claro, o
  `colorPrimaryActive` `#000000` é derivação legítima de um primário `#171717` (plano, §5.3).
- O `specs/BACKLOG.md` já estava modificado neste checkout antes desta etapa; conferir
  `git diff --cached --stat` antes do primeiro commit.
- Pré-requisitos manuais de infra: nenhum.
