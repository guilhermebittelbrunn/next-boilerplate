---
slug: admin-self-lockout-guard
title: O admin não consegue se trancar fora do painel
task: -
spec: none
branch: fix/admin-self-lockout-guard
epic: -
updated: 2026-10-04 15:45
---

# Pipeline — O admin não consegue se trancar fora do painel

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-04 10:14 | analyze/plan.md | `PUT`/`DELETE /users/[id]` recusam com `403 USERS_SELF_LOCKOUT_FORBIDDEN` desativar, rebaixar (`type` ≠ `ADMIN`) e arquivar a própria conta, comparando `reference_id` com `ctx.user.uid`; `PUT` idempotente passa; listagem desabilita o switch e tira "Arquivar" na linha própria, formulário trava o select de tipo; 1 código + 2 chaves nos 3 idiomas; testes de rota e de componente; sem SDK, sem env, sem infra; 6 commits sugeridos |
| develop | done    | 2026-10-04 10:24 | develop/handoff.md | Recusa `403 USERS_SELF_LOCKOUT_FORBIDDEN` no `PUT`/`DELETE /users/[id]` (uid do alvo = uid do ator), switch e "Arquivar" fora da linha própria, select de tipo travado na edição de si; 1 código + 2 chaves nos 3 idiomas; 20 testes novos, api 1048 e app 764 verdes; 3 âncoras a mais corrigidas em docs além das 4 do plano |
| review  | done    | 2026-10-04 15:45 | review/review.md | Sem bloqueante; 1ª passada: `isOwnRow` com `signedInUser?.uid` e `docs/SECURITY.md:30` sem a promessa de nunca zerar admins; rodada 1 (volta do `/test`): a explicação do select de tipo virou `FormDescription` via prop nova `description` do `HookFormSelect`, ligada ao `aria-describedby` e medida com teste + mutação; o id órfão é geral do `FormControl` (`form.tsx:115-119`) e ficou como achado; `pnpm check` 810, typecheck app e design-system ok; branch `fix/admin-self-lockout-guard`; 9 commits propostos, pendentes de aprovação |
| test    | done    | 2026-10-04 15:34 | test/report.md, test/criterios-aceite.md | 11 critérios ✅ e 1 🔒 (leitor de tela), nenhum defeito de produção; API real contra emulador confirma 403 `USERS_SELF_LOCKOUT_FORBIDDEN` sem escrita; 2 testes novos no app (8 casos) fecham as 2 lacunas herdadas; `pnpm test` raiz 14 tasks ok (app 772, api 1048, emulador 170); o harness recusou gravar `report.md` pelo subagent e o conteúdo foi entregue ao orquestrador para gravar |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir da recomendação #1 da auditoria em `specs/BACKLOG.md` (`:248-284`), do
  achado em `:860` e da D9 (`:365`). Plano feito em rodada autônoma do `/cycle`: as 10 decisões tomadas sem
  perguntar estão na §12 do plano, cada uma com a alternativa descartada, e as 5 perguntas da §11 já vêm com a
  opção adotada.
- A leitura mostrou que arquivar a si mesmo é o pior dos três casos: o login seguinte recria o perfil como
  comum (`apps/api/(shared)/lib/user-merge.ts:20-24`). Lido, não medido.
- `UsersListClient` passa a importar `@repo/auth/provider`; os dois testes que renderizam a listagem precisam
  do mock de `useAuth` (plano, §8).
- O diff desloca linhas de `users/[id]/route.ts` citadas em 4 documentos (plano, §13.6). O `BACKLOG.md` fica
  com o `/spec --sync`.
- Pré-requisitos manuais de infra: nenhum.
