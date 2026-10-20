---
slug: google-sign-in-error-contract
title: Contrato de erro de POST /auth/sign-in/google
task: -
spec: none (achado BACKLOG)
branch: guilhermebittelbrunn/cycle-command-v5 (fora do padrão; nome proposto pelo /review para a PR das três tarefas: api/fix/google-sign-in-unlink-restore-body-cap, passa no regex; renomear só com aprovação do usuário)
epic: -
updated: 2026-10-19 20:57
---

# Pipeline: contrato de erro de `POST /auth/sign-in/google`

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-19 20:40 | analyze/plan.md | a rota do Google segue o molde do `/auth/sign-in`: `parseRequestJson` + `googleSignInSchema` novo (400 `VALIDATION_FAILED`), recusa do provedor em `{ error: { code } }` via `mapPasswordCheckMessageToCode` (400 `AUTH_INVALID_CREDENTIALS`, 429 `USERS_AUTH_RATE_LIMITED`); só `apps/api`, sem código novo em `apiErrors`; 1 arquivo de teste de rota novo; sem env e sem infra |
| develop | done    | 2026-10-19 20:47 | develop/handoff.md | `googleSignInSchema` (`z.url()` no `requestUri`, desvio registrado) + rota no molde do `/auth/sign-in`; teste novo com 21 casos, 14 caem com a rota de `4b0be90`; api 104 arquivos/1341 testes, typecheck e `pnpm check` limpos |
| review  | in-progress | 2026-10-19 20:50 | review/review.md | sem bloqueante; `requestUri` restrito a `http`/`https` (`auth.schema.ts:15`, `:43`), que o `z.url()` livre deixava passar como `javascript:`/`localhost:3000`; `pnpm check` 935 arquivos e typecheck da api limpos; 3 commits propostos (`docs(specs)`, `fix(api)`, `docs(features)`) |
| test    | done    | 2026-10-19 20:57 | test/report.md  | CA1 a CA10 ✅; 14/21 caem com a rota de `4b0be90` (remedido); `USER_DISABLED` medido no emulador do Auth e a rota real respondeu 400 `AUTH_INVALID_CREDENTIALS`; +4 casos no teste de rota (protocolo do `requestUri`) e `authSignInGoogleToolkit.test.ts` novo (3, toolkit real); api 105/1348, `pnpm test` raiz exit 0; sem browser (diff sem UI) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: achado 🟡 de `specs/BACKLOG.md:1496`, indicado pela auditoria pós-PR #50 como a
  próxima tarefa direta (`specs/BACKLOG.md:246-266`). Plano feito em rodada autônoma do `/cycle`; as três
  perguntas da §11 já vêm com a opção adotada e as decisões da §12 com a alternativa descartada.
- Sem mudança em `packages/sdk`, `apps/app`, `apps/web` ou `packages/internationalization`; sem env nova;
  pré-requisitos manuais de infraestrutura: nenhum.
- O diff não tem UI: o `/test` roda as suítes e não precisa de `agent-browser` (§8 do plano).
