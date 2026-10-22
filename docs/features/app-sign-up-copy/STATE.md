---
slug: app-sign-up-copy
title: Copy do cadastro da app
task: -
spec: none (achado BACKLOG)
branch: fix/auth-forms-and-global-error-theme
epic: -
updated: 2026-10-21 22:45
---

# Pipeline: copy do cadastro da app

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-21 22:29 | analyze/plan.md | `packages/internationalization` e `apps/app`: `signUp.noAccount` vira `alreadyHaveAccount` ("Já tem uma conta?") e `signUp.enterWithYourAccount` vira `createYourAccount` ("Crie sua conta para começar"), nos três idiomas; `meta.description` en/es do cadastro corrigido e os dois `page.tsx` de autenticação da app passam a ler o namespace da app em vez do da landing; "¿" no `signIn.noAccount` es da app e da web; um teste novo de copy e dois casos em testes existentes; sem SDK, API ou env |
| develop | done    | 2026-10-21 22:35 | develop/handoff.md | as três folhas de i18n, o `SignUpFormClient` e os dois `page.tsx` da app como no blueprint, sem desvio de escopo; `authPagesCopy.test.ts` novo e casos novos em `authPagesRedirect` e `signUpFormApi`; app 1001 testes, web 207, i18n 67, typecheck de app e web e `pnpm check` com exit 0 |
| review  | in-progress | 2026-10-21 22:45 | review/review.md | Sem bloqueante; 1 🟢 corrigido (o comentário do espaço final saiu do JSDoc do `questionsBeforeLink` e foi para o `it.each` que ele explica); copy dos 3 idiomas, nomes de chave e consumidores conferidos; `pnpm check` 972 arquivos limpo, typecheck de app e web exit 0, paridade 67/67; branch `fix/auth-forms-and-global-error-theme` reutilizada e validada no regex; D5 resolvida em 3 commits que compilam, um deles misto; plano unificado de 11 commits |
| test    | done    | 2026-10-21 22:45 | test/report.md  | 8 de 8 critérios ✅, sem defeito; `<head>` do cadastro medido no HTML servido ("Crie sua conta", "Create your account", "Crea tu cuenta"), pergunta e link nos 3 idiomas, clique com `?redirect=` e "¿" no login es das duas apps conferidos no navegador, em claro, escuro e 375 px; app 1001, web 207, i18n 67, `pnpm test` da raiz 15/15 tasks; nenhum teste novo, nenhuma conta criada, portas 3000 e 3001 liberadas |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação "A próxima" de `specs/BACKLOG.md:421-467` e a metade da app do achado 🟡 de
  `specs/BACKLOG.md:2181`. Rodada autônoma do `/cycle`: as seis decisões da §13 do plano já vêm com a opção adotada.
- Desvio da recomendação do BACKLOG: o `meta.description` da folha da app não chegava ao `<head>`, porque
  `sign-up/page.tsx:18` e `sign-in/page.tsx:18` leem `apps.web.pages.*.meta`. O plano troca o namespace nos dois arquivos
  (D3), o que acrescenta dois arquivos de uma linha à lista do BACKLOG. Nenhum está no diff sem commit nem em
  `contends_on`.
- Fora do corte: a metade da landing (`translations/apps/web/pages/signUp/index.ts` e `sign-up-form-client.tsx`), porque
  o componente está no diff sem commit de `web-auth-forms`. Repete a mesma troca, com os mesmos nomes de chave, depois do
  merge.
- Pré-requisitos manuais de infra: nenhum.
- Working tree compartilhado com `web-auth-forms` e `global-error-theme` (sem commit). Nenhum arquivo deste plano está
  em `git status --short`.
- `/review`: a branch `fix/auth-forms-and-global-error-theme` continua servindo (copy dos formulários de autenticação) e foi
  reutilizada. O plano de commits unificado do working tree inteiro está em `review/review.md`; o da `global-error-theme`
  aponta para cá.
