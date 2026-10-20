---
slug: request-body-size-limit
title: Teto de bytes no corpo JSON da API antes do parse
task: -
spec: none (achado BACKLOG)
branch: guilhermebittelbrunn/cycle-command-v5 (fora do padrão; nome proposto pelo /review para a PR das três tarefas: api/fix/google-sign-in-unlink-restore-body-cap, passa no regex; renomear só com aprovação do usuário)
epic: -
updated: 2026-10-19 23:19
---

# Pipeline: teto de bytes no corpo JSON da API antes do parse

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-19 22:29 | analyze/plan.md | `parseRequestJson` recusa corpo acima de 100 KiB com `413 VALIDATION_FAILED`: `content-length` declarado recusado sem ler, stream medido e cancelado ao passar do teto; vale para os 22 handlers que usam o helper (8 públicos), webhook e upload fora; só `apps/api` + `docs/SECURITY.md` (subseção nova e a conta da `:160`, dez de treze); sem i18n, sem env, sem infra |
| develop | done    | 2026-10-19 22:38 | develop/handoff.md | Teto de 100 KiB no `parseRequestJson` com 413 `VALIDATION_FAILED`, 13 testes do helper + 1 da rota de contato; dois desvios: sem stream delega ao `req.json()` (o plano quebrava 95 testes em 13 arquivos com dublês sem `body`) e `cancel()` não aguardado (o `await` virava 413 em 400); api 1367/1367, typecheck e check verdes |
| review  | in-progress | 2026-10-19 23:00 | review/review.md | rodada 2 (D1 do `/test`): `reader.cancel().catch()` trocado por `reader.releaseLock()`, porque o cancelamento destrói o `Readable` do Node por baixo do corpo do Next e deixa `unhandledRejection: AbortError` a cada 413; 2 testes do helper reescritos (sem `cancel`, lock solto), 13/13, e caem com a versão antiga; `docs/SECURITY.md:174` ajustado; check 937 e typecheck limpos; plano de commits igual; medição no `next start` volta para o `/test` |
| test    | blocked | 2026-10-19 23:19 | test/report.md | Rodada 2: D1 corrigido (`releaseLock()`: 0 `unhandledRejection` em 209 requisições acima do teto, CA11 ✅); D2 novo, CA13 ❌: depois do 413 do stream a conexão fica aberta até o `requestTimeout` do Node (reset aos 327 s; 152 conexões após 201 requisições), presente também com `cancel()` e ausente no `HEAD`; `connection: close` no 413 medido com 0 conexões abertas; CA12 🔒; api 1368/1368, `pnpm test` raiz 15/15 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: achado 🟢 de `specs/BACKLOG.md:1562`, candidata em `:292-293`. Terceira tarefa da
  rodada autônoma do `/cycle`, na mesma PR de `google-sign-in-error-contract` e `password-unlink-email-restore`.
  As quatro perguntas da §11 do plano já vêm com a opção adotada; a §12 lista as decisões tomadas sem perguntar.
- Nenhum arquivo das outras duas tarefas é tocado; no `docs/SECURITY.md`, só a subseção nova e a `:160`.
- O diff não tem UI: o `/test` roda as suítes e não precisa de `agent-browser` (§8 do plano).
- Pré-requisitos manuais de infra: nenhum.
- `specs/BACKLOG.md` não é editado aqui: fechar o achado é do `/spec --sync`.
- `/test` (2026-10-19 22:58): o `review` segue `in-progress` porque os commits da PR ainda não foram feitos (nenhum commit à frente de `origin/main`); o gate não foi fechado por cima. O D1 precisa de decisão: corrigir no `/develop` (`releaseLock()`, medido) ou aceitar o ruído de log.
- `/test` rodada 2 (2026-10-19 23:19): o D2 precisa de decisão: corrigir no `/develop` (`connection: close` no 413, medido) ou aceitar a conexão presa até o `requestTimeout`. O `review` segue `in-progress`, sem commit da PR.
