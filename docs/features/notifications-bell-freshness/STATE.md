---
slug: notifications-bell-freshness
title: Frescor e borda do sino de notificações
task: -
spec: none (achados BACKLOG)
branch: guilhermebittelbrunn/cycle-command-v6
epic: -
updated: 2026-10-20 16:29
---

# Pipeline: frescor e borda do sino de notificações

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-20 15:35 | analyze/plan.md | só `apps/app`: o `queryFn` da contagem invalida a lista (sem refetch) quando o servidor discorda do cache, o que dá zero leitura extra sem notificação nova; badge oculto com a contagem em erro (`isError`), e o "marcar como lida" deixa de gravar na contagem em erro, porque `setQueryData` limpa o erro; `collisionPadding={12}` no `NotificationsBell`; 7 testes de hook; sem SDK, API, i18n, env ou infra |
| develop | done    | 2026-10-20 15:45 | develop/handoff.md | três itens do plano em `apps/app` e 10 testes de hook (968 na suíte); desvio: toda escrita na lista (`setQueryData`, `fetchNextPage`) zerava o `isInvalidated`, então quem escreve devolve a marca de velha (helpers em `useListNotifications.ts`) |
| review  | done    | 2026-10-20 15:50 | review/review.md | nada bloqueante e nenhuma correção: a leitura do desvio confere com a fonte do `query-core` 5.90.20 (`successState` zera `isInvalidated`); 5 🟢 aceitos (corrida do `fetchNextPage`, disciplina de escrita, releitura extra depois de erro, `canMarkAll` com contagem em erro, `LIST_STALE_MS` copiado); helpers ficam em `useListNotifications.ts`; `pnpm check` e typecheck verdes; 4 commits propostos |
| test    | done    | 2026-10-20 16:29 | test/report.md  | 6 critérios aprovados, nenhum defeito: F1 e o desvio medidos no log da API (1 `GET /notifications` na reabertura depois de marcar como lida, 2 depois de carregar mais), F2/F3 sem leitura extra, badge some na falha e volta com o número do servidor, popover a 12 px das bordas a 375 px nos 3 idiomas, light/dark, vazio e impersonação (R1: 3 px sobre a scrollbar clássica); `app` 968 e `pnpm test` da raiz verdes; nenhum teste novo |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação de `specs/BACKLOG.md:284-316`, três achados 🟢 da PR #52
  (`useListNotifications.ts:15-27`, `useUnreadNotificationsCount.ts:51`, `NotificationsBell.tsx:61-64`). Rodada
  autônoma do `/cycle`: as quatro perguntas da §11 do plano já vêm com a opção adotada.
- O item 2 segue o plano original da feature ("com erro, sem badge",
  `docs/features/in-app-notifications/analyze/plan.md:391`). A leitura do React Query foi conferida na fonte da
  5.90.20 (§1.4 do plano).
- O `/test` faz uma passada de `agent-browser` com emulador e seed (§8 do plano). Os índices de `notification`
  não estão publicados no projeto de referência (`docs/PRE-PRODUCTION.md` §1.9).
- Pré-requisitos manuais de infra: nenhum.
- `specs/BACKLOG.md` não é editado aqui: fechar os achados é do `/spec --sync`.
- O working tree tem `specs/BACKLOG.md` modificado pela auditoria, que não pertence a esta tarefa; este passo não
  mexeu nele.
- Branch: `guilhermebittelbrunn/cycle-command-v6`, reutilizada por pedido do usuário, com os seis commits da PR #53. O
  nome reprova no regex do padrão (caso E11 do backlog); não foi criada nem renomeada branch.
- `review: done` marcado a pedido do orquestrador do `/cycle`; os commits ainda não foram feitos.
