---
slug: design-refresh-followups
title: Acabamento da branch de design (toast, menu de ações, tabela, menu mobile)
task: -
spec: none (tarefa direta)
branch: feat/design-system-refresh
epic: -
updated: 2026-11-27 21:08
---

# Pipeline: acabamento da branch de design

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-27 20:31 | analyze/plan.md | Quatro correções sem API nova: `Toaster` com `forcedTheme ?? resolvedTheme`, `catch` no `confirmDelete` do `ActionsMenu`, `pageSize` da `Table` seguindo a prop, menu mobile da landing fechando no `pointerdown` fora (ciente do portal dos seletores); testes em jsdom; sem infra |
| develop | done    | 2026-11-27 20:36 | develop/handoff.md | Quatro correções aplicadas conforme o plano, 11 casos de teste novos com prova de mutação; suítes do design-system (201) e da web (325), typecheck e `pnpm check` limpos |
| review  | done        | 2026-11-27 21:08 | review/review.md | Sem bloqueante; um 🟡 (toque fora fecha no `pointerdown`, inclusive ao começar a rolar) virou decisão em aberto e item do `/test`; nenhuma correção; `pnpm check` e typecheck de design-system/web/app limpos |
| test    | done    | 2026-11-27 21:08 | test/report.md  | Sem defeito; toque fora fecha ao começar a rolar e a página rola (396 de 400 px), decisão mantida; 4 casos novos (design-system 202, web 328, app 1415) e `pnpm test` da raiz verdes; landing e app percorridos em 390/1024/1440, claro/escuro, 3 idiomas |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, plano B da auditoria de 2026-11-27 (`specs/reference/AUDIT.md:352`, `:370`), na mesma branch do
  refactor de design, que ainda não foi mergeada.
- O working tree já tem alterações não commitadas em `specs/` de outra rodada. Elas não pertencem a esta tarefa.
