---
slug: web-docs-link-and-mobile-menu
title: Link de documentação e menu mobile da web
task: -
spec: none (tarefa direta)
branch: guilhermebittelbrunn/cycle-2-features-implement
epic: -
updated: 2026-10-15 15:30
---

# Pipeline — Link de documentação e menu mobile da web

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-14 20:42 | analyze/plan.md | `NEXT_PUBLIC_DOCS_URL` declarada em `apps/web/env.ts` com `\|\| undefined`; com o link, a barra cheia do header aparece a partir de `xl` (sem o link segue `lg`); link de docs da barra em aba nova; links do painel mobile fecham o menu; `docs/SETUP.md:72` corrigido; T1 em `node` com o `env.ts` real e T2 em jsdom (devDependencies `jsdom` e `@testing-library/*` na web, versões da `apps/app`); sem SDK, API, i18n novo ou infra |
| develop | done    | 2026-10-14 22:01 | develop/handoff.md | `NEXT_PUBLIC_DOCS_URL` no `env.ts` da web; header com barra cheia em `xl` só com o link, docs em aba nova e painel mobile fechando ao seguir link; `docs/SETUP.md:72` corrigido; T1 (8) e T2 (6) novos, 10 deles reprovam no código anterior; devDeps de teste na web com lockfile editado à mão (pnpm sem rede) e conferido por `--frozen-lockfile --offline`; web 116/116, typecheck e `pnpm check` verdes |
| review  | in-progress | 2026-10-14 23:18 | review/review.md | Nenhum bloqueante e nenhuma correção de código; lockfile medido com rede (importer `apps/web` idêntico ao gerado pelo pnpm, `--frozen-lockfile` aceita); `typecheck` e `pnpm check` verdes; 7 itens em "Verificar no `/test`"; branch atual inválida, recomendado `fix/web-docs-link-and-api-error-codes` (decisão do usuário) |
| test    | done    | 2026-10-15 15:30 | test/criterios-aceite.md, test/report.md | 10 critérios aprovados, 0 reprovados, 0 não verificados; web 116/116, `pnpm test` da raiz 3.139/3.139; e2e em build com a variável preenchida e vazia (48 + 36 combinações de largura, menu fechando a 390/768/1024 px, aba nova nas três superfícies, axe zero); nenhum defeito no diff. `test/report.md` gravado pelo orquestrador com o conteúdo do `analista-qa`, porque a harness bloqueou a escrita do subagent |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: vem da recomendação #1 de `specs/BACKLOG.md` (linhas 240-280) e do achado em
  `specs/BACKLOG.md:1263`.
- Primeira de duas tarefas na mesma branch. A segunda, `api-auth-webhook-error-codes`, mexe só em `apps/api`; os
  arquivos de código das duas são disjuntos.
- Plano feito em rodada autônoma do `/cycle`: nenhuma pergunta ao usuário, decisões D1 a D6 na §11 do plano, com a
  opção adotada e a descartada. Nenhuma branch criada, nenhum commit.
- Nenhum pré-requisito manual de infra.
- Branch: `guilhermebittelbrunn/cycle-2-features-implement` reprova no regex do `/review`. Nome recomendado
  `fix/web-docs-link-and-api-error-codes` (passa no regex). Não renomeada nesta rodada: a decisão é do usuário,
  depois da revisão da segunda tarefa.
