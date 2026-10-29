---
slug: app-auth-forms
title: Telas de autenticação da app
task: -
spec: none (achado BACKLOG)
branch: fix/app-auth-forms
epic: -
updated: 2026-10-28 19:42
---

# Pipeline: telas de autenticação da app

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-28 19:00 | analyze/plan.md | Chave nova `packages.auth.provider.session.notEstablished` nos 3 idiomas, lida pelo `onAuthSuccess` do provider e pelo erro de sessão do `googleSignInApi` da app; `noValidate` nos 6 formulários de `(unauthenticated)`; `px-4 md:px-2` no `AuthCard` e nos contêineres iguais do login e do cadastro; `auth/user-disabled` en vira "This account has been disabled."; 2 testes novos e 5 editados na `apps/app`; sem SDK, API, Firestore ou env |
| develop | done    | 2026-10-28 19:07 | develop/handoff.md | Chave `session.notEstablished` nos 3 idiomas lida pelo provider e pelo `googleSignInApi`; `noValidate` nos 6 formulários; `px-4 md:px-2` nos 3 contêineres; `auth/user-disabled` en corrigido; T1/T3 novos e 5 testes editados; typecheck auth/app/web, `pnpm check` e testes app (1118), web (207), auth (136), i18n (67) passando |
| review  | done    | 2026-10-28 19:40 | review/review.md | Rodada 2: os dois ❌ do `/test` corrigidos. `googleSignInApi` trata o `fetch` sem resposta com a frase traduzida (caso novo no T2: falha sem a correção, 7/7 com ela) e o recuo virou `px-4 sm:px-0` (cartão volta a 400 px a partir de 640 px). `pnpm check` e typecheck da app limpos, 7 arquivos e 52 testes passando; plano de 11 commits com `apiErrorCopy` num `test(app)` próprio. Branch `fix/app-auth-forms` |
| test    | done    | 2026-10-28 19:42 | test/report.md  | Rodada 2 aprovada: Google da app com sessão sem resposta mostra a frase traduzida (en, pt-br, es; client deslogado) e o cartão volta a 400 px a partir de 640 px, com 16 px de recuo a 375 px em claro e escuro. Rodada 1 tinha 2 ❌ (corrigidos pelo revisor). `pnpm test` raiz 15/15 (app 1120); 1 teste do `/test` em `apiErrorCopy.test.ts` |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação "A próxima" de `specs/BACKLOG.md:211-238` (auditoria pós-PR #59). Rodada
  autônoma do `/cycle`: as sete decisões da §11 do plano já vêm com a opção adotada.
- Desvios do BACKLOG: o es do `auth/user-disabled` já está em espanhol e não muda (D7); o Google da app não passa pelo
  provider, então o "Could not persist session" de `googleSignInApi.ts` entra no corte (D2); a metade "função que
  lança" da recomendação do `/review` da PR #56 fica fora e volta como achado (D1).
- Pré-requisitos manuais de infra: nenhum.
- Working tree compartilhado com a auditoria (`docs/*.md`, `specs/*` e o `git mv` de
  `specs/organization-ownership-transfer.md`, já no índice). Nenhum arquivo deste plano está em `git status --short`.
