---
slug: ui-strings-and-password-focus
title: Rótulos de UI traduzidos, antd no idioma ativo e foco na senha depois de uma recusa
task: -
spec: none
branch: fix/ui-labels-and-account-dialog-focus (proposta, a criar com `git switch -c` antes do primeiro commit)
epic: -
updated: 2026-10-09 00:47
---

# Pipeline — Rótulos de UI traduzidos, antd no idioma ativo e foco na senha depois de uma recusa

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-09 00:03 | analyze/plan.md | 8 componentes do design system lendo `components.*` com `getDictionary()` (+ `"use client"` em `spinner`, `breadcrumb`, `pagination`); `Spinner` corrigido na raiz; `AntdAppProvider` com `locale` do antd via `useDictionary()`; `LanguageSwitcher` das duas apps e `PageBreadcrumb` (home do idioma, sem `/painel`); `onError` por chamada com `setFocus("currentPassword", { shouldSelect: true })` nos dois diálogos de conta; `autoComplete` e `required` na senha da exclusão; 8 folhas de i18n; 8 testes jsdom; sem SDK, API, env ou infra; 11 commits sugeridos junto com `account-deletion-dialog-focus` |
| develop | done    | 2026-10-09 00:16 | develop/handoff.md | 8 componentes do design system e os 2 seletores de idioma lendo o dicionário, `PageBreadcrumb` na home do idioma, antd com `locale`, `onError` com foco e seleção na senha dos 2 diálogos, `autoComplete`/`required` na exclusão; 8 folhas de i18n; 45 testes novos (mutação: 35 reprovam sem a correção; os 10 que passam são casos em en, o rótulo do chamador no Spinner e o mapa `antdLocales`); app 841, design-system 116, web 90, i18n 67, typecheck 4/4, `pnpm check` limpo; 1 mock parcial completado |
| review  | in-progress | 2026-10-09 00:22 | review/review.md | Nenhum achado bloqueante nem de atenção, nenhuma correção; 5 nits (foco perdido se a recusa chegar antes do re-render, P2, nome do `onError`, bundle do antd, `DialogFooter` aninhado); `"use client"` e `getDictionary()` confirmados por leitura dos consumidores; tarefa 1 sem regressão; 8 itens em "Verificar no `/test`" (foco depois da recusa é o primeiro); gates citados do handoff; branch atual inválida no regex, proposta `fix/ui-labels-and-account-dialog-focus` (válida); 11 commits com a i18n primeiro para cada um ficar verde |
| test    | done    | 2026-10-09 00:47 | test/report.md  | 10 critérios ✅, 0 ❌, medidos em `build && start` (app e web) + emulador; R1 sem defeito (rótulos acompanham pt-br → en → es sem recarregar no comum, admin e landing); antd "10 / página"/"10 / page" no build; foco e seleção na senha depois de 400/503 em 9 medições; console sem hidratação; 🔒 diálogo de cookies, `Pagination`, carrossel e recusas de e-mail além do 503; nenhum teste novo; `pnpm test` raiz 15/15 (app 841, design-system 116, web 90, i18n 67); regressão da tarefa 1 ok |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir dos achados em `specs/BACKLOG.md:695` e `:942`, do achado do `/test` de
  `account-deletion-dialog-focus` (foco depois de senha errada) e da §13.3 do plano daquela tarefa. Plano
  feito em rodada autônoma do `/cycle`: as 9 decisões tomadas sem perguntar estão na §12 do plano, e as 3
  perguntas da §11 já vêm com a opção adotada.
- Vai no mesmo PR que `account-deletion-dialog-focus`, que está no working tree sem commit. Os dois mexem em
  `AccountPrivacyPanel.tsx` e no teste dele, então o commit da `apps/app` sobre esse arquivo sai misto (§13.8).
- O `specs/BACKLOG.md` já estava modificado neste checkout antes desta etapa; conferir
  `git diff --cached --stat` antes do primeiro commit.
- Pré-requisitos manuais de infra: nenhum.
- `/test`: o `review` segue `in-progress` porque os commits ainda não foram feitos (`git log origin/main..HEAD` vazio); não é gate esquecido. A API rodou em `next dev` no e2e porque o build de produção dela exige credencial do Firebase Admin (já registrado no `docs/PRE-PRODUCTION.md`). As 9 contas `qa-ui-strings-NN@example.com` existiram só no emulador.
