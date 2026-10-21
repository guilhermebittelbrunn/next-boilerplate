---
slug: web-global-error
title: Tela de erro global efetiva na landing
task: -
spec: none (achado BACKLOG)
branch: guilhermebittelbrunn/cycle-command-v7 (fora do padrão; proposta `fix/leftover-ui-strings`, decisão do usuário)
epic: -
updated: 2026-10-21 15:57
---

# Pipeline: tela de erro global efetiva na landing

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-21 14:47 | analyze/plan.md | `git mv` de `apps/web/app/[locale]/global-error.tsx` para `apps/web/app/global-error.tsx`, alinhado à versão da app (`lang={locale}`, sem fallback, sem `console.error`) e teste novo `apps/web/__tests__/globalErrorLocale.test.tsx`; defeito e correção medidos nos artefatos do build Turbopack; sem SDK, API, i18n, env ou infra |
| develop | done    | 2026-10-21 14:51 | develop/handoff.md | Arquivo movido para `apps/web/app/global-error.tsx` e alinhado à versão da app, T1 com 5 casos; typecheck, `pnpm --filter web test` (189), `pnpm check` e build passam, com `/_global-error` gerado e 9 manifests apontando para o arquivo novo; índice git vazio depois do `git mv` (rename a 52% de similaridade) |
| review  | done    | 2026-10-21 15:00 | review/review.md | Sem bloqueante e sem correção; rename remedido em 52%, plano prepara os dois caminhos no mesmo `git add -A`; `pnpm check` e typecheck da web ok; 6 itens em "Verificar no `/test`" (build de produção com `throw` no layout); plano de commits único para o working tree inteiro (8 commits), nenhum feito |
| test    | done    | 2026-10-21 15:57 | test/report.md  | 8/8 critérios ✅ em build de produção com `throw` no layout e linha de base medida (tela embutida com "Application error" e "Digest" visível); os 6 itens do "Verificar no `/test`" confirmados; `web` 189 testes e `pnpm test` da raiz 15/15; nenhum teste novo, nenhum defeito; portas livres, layout sem diff e `.next` reconstruído limpo |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação #1 da passada incremental de 2026-10-21 (`specs/BACKLOG.md:321-358`). Rodada
  autônoma do `/cycle`: as seis decisões da §11 do plano já vêm com a opção adotada.
- O build da web usa Turbopack (`next/dist/lib/bundler.js:73-76`), não o `next-app-loader` do webpack que a auditoria
  citou. A conclusão dela se confirma pelos artefatos de `pnpm --filter web build` (§1.2 do plano): hoje o `GlobalError`
  da entrada é o embutido; com o arquivo na raiz de `app/`, passa a ser o da web, e o build não exige `app/layout.tsx`.
  A sonda foi temporária e o working tree voltou ao estado inicial.
- Nenhum arquivo em comum com o diff sem commit de `leftover-ui-strings`. O `specs/BACKLOG.md` não foi editado.
- Pré-requisitos manuais de infra: nenhum.
- `review: done` marcado antes dos commits, a pedido do orquestrador do `/cycle`. O plano de commits único das duas
  tarefas está em `review/review.md`; nenhum commit foi feito e o renome da branch depende do usuário.
