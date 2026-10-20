---
slug: password-unlink-email-restore
title: Devolução do e-mail ao desvincular a senha
task: -
spec: none (achado BACKLOG)
branch: guilhermebittelbrunn/cycle-command-v5 (fora do padrão; nome proposto pelo /review para a PR das três tarefas: api/fix/google-sign-in-unlink-restore-body-cap, passa no regex; renomear só com aprovação do usuário)
epic: -
updated: 2026-10-19 21:52
---

# Pipeline: devolução do e-mail ao desvincular a senha

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-19 21:27 | analyze/plan.md | `DELETE /account/sign-in-methods/password` tenta a devolução do e-mail 2 vezes sem espera (o Admin SDK já repete 503 e queda de conexão), revoga as sessões sempre que a senha saiu e, na falha persistente, emite `logEvent` com `uid`/`requestId`/`reason` e mantém `500 ACCOUNT_UPDATE_FAILED`; só `apps/api` + `docs/SECURITY.md:12`; o teste de `:252` é reescrito para o contrato novo e ganha 3 casos; sem env e sem infra |
| develop | done    | 2026-10-19 21:35 | develop/handoff.md | rota tenta a devolução 2 vezes, revoga sempre que a senha saiu e emite `logEvent` sem e-mail na falha persistente; teste de `:252` reescrito + 2 casos (21/21); com a rota de `HEAD` o arquivo falha em 2 casos; `pnpm --filter api test` 1350/1350, typecheck e `pnpm check` limpos; `docs/SECURITY.md:12` atualizado |
| review  | in-progress | 2026-10-19 21:40 | review/review.md | sem bloqueante; rota, log e revogação conferem com o código; `docs/SECURITY.md:12` corrigido (o evento da trilha pode faltar, e aí sai `[audit] write-failed` com o mesmo `requestId`); `console.error` cru de `packages/auth/server.ts:334` vira item de backlog; gates citados do handoff (936 arquivos, typecheck exit 0); plano de 6 commits para a PR inteira |
| test    | done    | 2026-10-19 21:52 | test/report.md  | 12 critérios ✅ e CA2 com uma parte 🔒 (revogação que falha, só por leitura); prova contra `HEAD` remedida (2 falhas, 19 passam); 3 casos novos (`requestId` igual no log e na trilha, linha real do `logEvent`, conta sem e-mail), arquivo 24/24; premissas do Firebase medidas no emulador de Auth; api 105 / 1353, `pnpm test` da raiz exit 0; sem browser (diff sem UI); 🔒 sequência no navegador depois do 500 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: achado 🟡 de `specs/BACKLOG.md:1535`, candidata em `:285-287`. Segunda tarefa da
  rodada autônoma do `/cycle`, na mesma PR de `google-sign-in-error-contract`. As quatro perguntas da §11 do
  plano já vêm com a opção adotada; a §12 lista as decisões tomadas sem perguntar.
- Sem mudança em `packages/sdk`, `apps/app`, `apps/web` ou `packages/internationalization`; sem env nova;
  pré-requisitos manuais de infraestrutura: nenhum.
- O diff não tem UI: o `/test` roda as suítes e não precisa de `agent-browser` (§8 do plano).
- `specs/BACKLOG.md` não é editado aqui: fechar o achado é do `/spec --sync`.
- `/test`: o `review` segue `in-progress` porque os commits ainda esperam a aprovação do usuário (nenhum commit da
  feature em `HEAD`). O `/review` fecha essa linha ao commitar.
