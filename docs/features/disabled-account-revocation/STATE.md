---
slug: disabled-account-revocation
title: Conta desativada deixa de valer na API na hora
task: -
spec: none
branch: fix/disabled-account-revocation (proposta; o workspace segue em run-cycle-pipeline)
epic: -
updated: 2026-09-30 15:31
---

# Pipeline — Conta desativada deixa de valer na API na hora

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-30 15:04 | analyze/plan.md | `getCurrentUser` recusa `user.disabled` no `UserRecord` que já carrega (zero chamada nova) e `PUT /users/[id]` chama `revokeUserSessions` quando o corpo traz `disabled: true`; resposta `401 AUTH_INVALID_TOKEN`, sem código novo, sem i18n, sem env, sem infra; testes só de unidade com o Firebase mockado; corrige `docs/INCIDENT-RESPONSE.md:50-52` e o achado em `specs/account-security-mfa.md`; 5 commits sugeridos |
| develop | done    | 2026-09-30 15:12 | develop/handoff.md | `getCurrentUser` recusa `user.disabled` e `PUT /users/[id]` chama `revokeUserSessions` ao desativar; 14 testes novos de unidade, 4 deles caem na mutação (2+2); auth 112/112, api 1031/1031, typecheck e `pnpm check` limpos; runbook e spec atualizados, e 2 referências de linha que a rota deslocou corrigidas (`BACKUP.md`, `observability-logging.md`) |
| review  | done    | 2026-09-30 15:40 | review/review.md | Nenhum bloqueante no código; âncoras de `users/[id]/route.ts` corrigidas no `BACKLOG.md` (`:86`, `:577`, `:598`), o 🔴 marcado como em execução e a D7 (admin que desativa a si mesmo) registrada como 🟢; `pnpm check` 806 arquivos limpo, typecheck de `@repo/auth` e `api` ok; 4 itens para o `/test`; branch `fix/disabled-account-revocation` proposta, sem criar; 5 commits propostos, nenhum feito |
| test    | done    | 2026-09-30 15:31 | test/report.md | Sem defeito; contra o Firebase de dev, o bearer de conta desativada recebe `401 AUTH_INVALID_TOKEN` (e 200 sem a checagem), e segue recusado depois de desativar e reativar pelo `PUT`; auth 112/112, api 1031/1031, 2+2 falhas nas mutações, `pnpm test` raiz 14/14 tasks (2636 testes); sign-in no browser ficou 🔒 por custo; conta de QA criada e apagada; runbook corrigido |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir do achado 🔴 do `specs/BACKLOG.md` (`:617`, recomendação #1 em
  `:235-259`). Plano feito em rodada autônoma do `/cycle`: as 8 decisões tomadas sem perguntar estão na §12 do
  plano, cada uma com a alternativa descartada, e as 3 perguntas da §11 já vêm com a opção adotada.
- O teste da correção não pode rodar no emulador: o `firebase-admin@13.6.0` confere `disabled` sozinho sob
  emulador (`lib/auth/base-auth.js:119`), e o teste passaria sem a correção.
- O mock de `@repo/auth/server` em `apps/api/__tests__/usersAdminAuditTrail.test.ts:61-64` precisa ganhar
  `revokeUserSessions`, senão o teste existente que manda `disabled: true` quebra.
- Pré-requisitos manuais de infra: nenhum.
- `review = done` segue a convenção do `/cycle`: a revisão terminou, mas nada foi commitado. O nome da branch
  e o rename que já está no índice ficam para o usuário decidir antes do primeiro commit (`review/review.md`,
  "Decisões em aberto").
