---
slug: leftover-ui-strings
title: Strings de UI soltas no login da landing e na tela de erro global da app
task: -
spec: none (achado BACKLOG)
branch: guilhermebittelbrunn/cycle-command-v7 (fora do padrão; proposta `fix/leftover-ui-strings`)
epic: -
updated: 2026-10-21 10:38
---

# Pipeline: strings de UI soltas no login da landing e na tela de erro global da app

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-21 10:19 | analyze/plan.md | `apps/web`: `signInSchema` vira `buildSignInSchema(dictionary)` com bloco `validation` novo em `apps.web.pages.signIn`; `apps/app`: `global-error.tsx` usa `getDictionary()` (cookie `x-locale` do proxy, sem provider) e chave própria `apps.app.pages.common.globalError`; 2 testes novos e 1 editado; sem SDK, API, env ou infra |
| develop | done    | 2026-10-21 10:25 | develop/handoff.md | `buildSignInSchema(dictionary)` na landing e `global-error.tsx` da app com `getDictionary()` + `lang={locale}`; chaves nos 3 idiomas; T1/T2/T3 escritos; typecheck e testes de `web`/`app`/i18n e `pnpm check` passando, sem desvio de decisão |
| review  | done    | 2026-10-21 10:35 | review/review.md | Sem bloqueante; um ajuste de comentário em `global-error.tsx:15`; `pnpm check`, typecheck de `web`/`app`/i18n e paridade ok; 4 itens em "Verificar no `/test`"; branch reprovada no regex, renome para `fix/leftover-ui-strings` pendente; 6 commits propostos, nenhum feito |
| test    | done    | 2026-10-21 10:38 | test/criterios-aceite.md, test/report.md | 9/9 critérios ✅; `pnpm test` da raiz 15/15 tarefas (com `test:emulator` em JDK 21); login da landing medido nos 3 idiomas em claro, escuro e 375 px; `global-error` medido em `next build && start` com `throw` temporário (já removido); sem defeito, sem teste novo, sem conta criada. O harness bloqueou a gravação do `report.md` pelo subagent, e o orquestrador gravou o conteúdo entregue sem alterá-lo |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação #1 da auditoria de 2026-10-21 (`specs/BACKLOG.md:257-287`), regra de ouro 2.
  Rodada autônoma do `/cycle`: as cinco decisões da §11 do plano já vêm com a opção adotada.
- Lido na fonte do Next 16.0.0: só `app/global-error` na raiz é carregado, então `apps/web/app/[locale]/global-error.tsx`
  é inerte (§1.4 do plano). Isso alimenta o achado de `specs/BACKLOG.md:1311` e fica fora desta tarefa.
- O `/test` percorre o login da landing nos três idiomas; a tela de erro global da app só se dispara com exceção
  forçada no root layout em build de produção, e sem esse repro fica 🔒 com o teste de componente como prova (§8 do plano).
- Pré-requisitos manuais de infra: nenhum.
- `specs/BACKLOG.md` está modificado no working tree pela auditoria, que não pertence a esta tarefa; este passo não
  mexeu nele.
- `review: done` marcado antes dos commits, a pedido do orquestrador do `/cycle`. O plano de commits está em
  `review/review.md` e nenhum commit foi feito; o renome da branch depende do usuário.
