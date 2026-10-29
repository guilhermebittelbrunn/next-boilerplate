---
slug: web-sign-up-copy
title: Copy do cadastro da landing e "as senhas não coincidem"
task: -
spec: none (achado BACKLOG)
branch: fix/web-sign-up-copy
epic: -
updated: 2026-10-29 10:27
---

# Pipeline: copy do cadastro da landing e "as senhas não coincidem"

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-29 10:07 | analyze/plan.md | Folha de cadastro da web renomeia `enterWithYourAccount`/`noAccount` para `createYourAccount`/`alreadyHaveAccount` com a copy da app (receita da PR #55) e corrige `meta.description` en/es; `sign-up-form-client.tsx` lê as chaves novas; "não conferem" vira "não coincidem" em `resetPassword` e `common/account`; `authPagesCopy.test.ts` estendido e um caso no `signUpFormApi.test.tsx` da web; 6 arquivos, sem SDK, API, Firestore ou env |
| develop | done    | 2026-10-29 10:13 | develop/handoff.md | Folha de cadastro da web com `createYourAccount`/`alreadyHaveAccount` e `meta.description` en/es corrigida; `sign-up-form-client.tsx` lê as chaves novas; "não conferem" virou "não coincidem" em `resetPassword` e `common/account`; `authPagesCopy.test.ts` e `signUpFormApi.test.tsx` estendidos (7 casos falham sem a correção); typecheck web/app/i18n, `pnpm check` e paridade verdes |
| review  | done    | 2026-10-29 10:17 | review/review.md | Nada bloqueante e nenhuma correção; branch `fix/web-sign-up-copy` criada do `HEAD` `7348247` de `fix/app-auth-forms` (regex OK); typecheck web/app/i18n 3/3, `pnpm check` e paridade 67/67 verdes; cinco fluxos para o `/test` medir; plano de 5 commits, sem commit feito |
| test    | done    | 2026-10-29 10:27 | test/report.md  | 9/9 critérios PASS; F1–F5 medidos nos 3 idiomas, claro/escuro/375 px, sem defeito; web 208, app 1142, paridade 67, `pnpm test` raiz 15/15; nenhum teste criado; emulador + api/app/web subidos e derrubados, portas livres |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação "A próxima" de `specs/BACKLOG.md:287-320` (rodada delta de 2026-10-29). Rodada
  autônoma do `/cycle`: as dez decisões da §13 do plano já vêm com a opção adotada.
- Base empilhada: a branch `fix/app-auth-forms` (11 commits à frente de `origin/main`, pushada, sem PR, `HEAD`
  `7348247`). Os seis arquivos do plano estão fora de `git diff --name-only origin/main..HEAD` (§0.1 do plano). A branch filha `fix/web-sign-up-copy` foi
  criada no `/review`; a PR dela tem base `fix/app-auth-forms` enquanto aquela não estiver em `main`.
- Pré-requisitos manuais de infra: nenhum.
- Working tree compartilhado com a auditoria (`specs/BACKLOG.md`, `specs/social-sign-in-providers.md`). Nenhum arquivo
  deste plano está em `git status --short`.
