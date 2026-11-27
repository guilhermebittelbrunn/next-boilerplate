---
slug: notification-read-race
title: Corrida no "marcar todas como lidas" e aviso de notificação expirada
task: -
spec: -
branch: feat/audit-log-levels
epic: -
updated: 2026-11-27 10:37
---

# Pipeline — Corrida no "marcar todas como lidas" e aviso de notificação expirada

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-27 10:06 | analyze/plan.md | Os dois achados procedem: `markAllReadByUserId` passa a absorver o `NOT_FOUND` do `batch.commit` e relê na passada seguinte; `markRead` com `404 NOTIFICATION_NOT_FOUND` tira a linha do cache sem toast; 5 arquivos (3 na `api`, 2 na `app`), sem SDK, i18n, env ou infra; 3 commits sugeridos |
| develop | done    | 2026-11-27 10:17 | develop/handoff.md | 5 arquivos do plano; código 5 do lote medido no emulador (284/284, e 1 falha com a correção removida); hook tira a linha no `NOTIFICATION_NOT_FOUND` sem toast; desvio: literal em vez de constante por `noShoutyConstants` |
| review  | done    | 2026-11-27 10:20 | review/review.md | Sem bloqueante; 1 nit corrigido (comentário do `onError` falava em "expired", mas só documento apagado dá 404); comentários aprovados pela regra; gates `pnpm check` e typecheck api/app limpos; 4 itens no "Verificar no /test", incluindo o exit 1 intermitente do `api:test`; 3 commits propostos na `feat/audit-log-levels` |
| test    | done    | 2026-11-27 10:37 | test/report.md | 11 critérios ✅, 2 🔒 (fora do diff); 404 no sino medido no browser (linha some, sem toast, contador −1) em desktop e mobile; código 5 confirmado no emulador (284/284); exit 1 do `api:test` não reproduzido em 5 execuções; `pnpm test` raiz verde |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir de `specs/reference/AUDIT.md` (`:346-347`, achados em `:1938-1939`). Plano
  feito em rodada autônoma do `/cycle`: as 8 decisões tomadas sem perguntar estão na §12 do plano, cada uma com a
  alternativa descartada.
- O working tree já contém a feature `audit-log-levels`, não commitada. Nenhum dos 5 arquivos desta tarefa está
  entre os modificados por ela.
- Pré-requisitos manuais de infra: nenhum.
