---
slug: i18n-hydration-admin-delete-billing
title: Hidratação do dicionário client em en/es e cancelamento da assinatura no arquivamento pelo admin
task: -
spec: none (achados BACKLOG.md:430 e :502)
branch: fix/i18n-hydration-admin-delete-billing (a renomear a partir de sync-spec-backlog-audit)
epic: -
updated: 2026-09-25 15:44
---

# Pipeline: hidratação do dicionário client em en/es e cancelamento da assinatura no arquivamento pelo admin

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-25 14:22 | analyze/plan.md | H1: `getDictionary()` do client lê o locale de um `LocaleProvider` (contexto React no servidor via `use()`, locale da última URL renderizada no navegador, `useParams()` como fonte), montado nos root layouts de `apps/app` e `apps/web`; nenhum dos 63 call sites muda. A2: `DELETE /users/[id]` cancela a assinatura viva com `cancelSubscriptionForErasure` antes do soft delete, 503 `USERS_DELETE_BILLING_FAILED` com a Stripe desligada ou falhando, como o titular; aviso no diálogo de arquivamento |
| develop | done    | 2026-09-25 14:51 | develop/handoff.md | H1: `LocaleProvider` + `useDictionary()` em `client.ts`, montado nos root layouts; `AuthProvider` passa a `useDictionary()` (desvio D-dev1, troca de idioma). A2: `DELETE /users/[id]` cancela antes do soft delete, 503 `USERS_DELETE_BILLING_FAILED`. `pnpm turbo run lint typecheck test` 26/26, builds de app e web ok |
| review  | done    | 2026-09-25 15:40 | review/review.md | Rodada 1 (volta do `/test`, D1): header da web deixa de aninhar `a > button > a` e `button > a` (`buttonVariants` no próprio link, `NavigationMenuLink asChild`), teste novo `headerInteractiveNesting.test.tsx` 3/3 (falha contra o `HEAD`). Rodada 0: nenhum bloqueante, D-dev1 mantido, JSDoc em `client.ts`. Gates: `pnpm check` 755 arquivos, typecheck web ok. Branch a renomear; 11 commits propostos, nenhum executado |
| test    | done    | 2026-09-25 15:44 | test/report.md  | Rodada 1: D1 corrigido pelo `/review` e confirmado (landing `/pt-br`, `/en`, `/es` sem erro de hidratação em dev e prod, teclado, menu Produto → Contato, header light/dark/mobile aceitável). Critérios ✅, Stripe real 🔒. `pnpm test` 11/11. Fora do diff, para o backlog: D2 (`<button>` aninhado no form de contato, #418) e rolagem horizontal do header logado entre 1024 e 1280 px |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: junta os achados `specs/BACKLOG.md:502` (hidratação) e `:430` (A2), aprovados
  pelo usuário em 2026-09-25. Fechá-los no backlog é do `/spec --sync`.
- Plano feito em rodada autônoma do `/cycle`. As 11 decisões tomadas sem perguntar estão na seção 13 do
  `analyze/plan.md`, cada uma com a alternativa descartada; as 3 perguntas em aberto (seção 14) já vêm com a
  opção adotada.
- Inventário do H1: 80 arquivos importam `@repo/internationalization/client` (68 de produção, 12 testes);
  63 chamam `getDictionary()`, 61 durante o render e 2 fora dele, que só rodam no navegador.
- Fora do escopo e continua aberto: O4 (`<html lang>` e Server Components pelo cookie). O `/test` registra o
  que observar com cookie divergente da URL, sem reprovar.
- Nenhum pré-requisito manual de infraestrutura e nenhuma variável nova. Fica 🔒 sem conta Stripe: o
  cancelamento real no dashboard da Stripe.
- O working tree já tinha mudanças da auditoria do backlog antes desta etapa; o `/review` as separa.
