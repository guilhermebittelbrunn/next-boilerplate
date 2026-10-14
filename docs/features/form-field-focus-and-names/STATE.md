---
slug: form-field-focus-and-names
title: Campos de formulário mantêm o foco, têm nome e travam no carregamento
task: -
spec: none
branch: fix/date-pickers-form-fields-and-header (recomendada para a PR das três tarefas, a renomear a partir de guilhermebittelbrunn/cycle-command-v4)
epic: -
updated: 2026-10-14 18:00
---

# Pipeline — Campos de formulário mantêm o foco, têm nome e travam no carregamento

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-14 17:05 | analyze/plan.md | `readOnly` no lugar de `disabled` durante o envio no `HookFormInputPassword` e no `HookFormInput` (este como desvio); placeholder do chamador vence; `aria-labelledby` no `RadioGroupInput`; `Button` com conteúdo em `opacity-0` sob o spinner e `disabled={loading \|\| disabled}` depois do spread; footers perdem a fusão; 1 linha no `AGENTS.md`; sem i18n, SDK, API, env ou infra; 2 testes novos e 2 editados no design system; 4 commits somados aos 6 da `date-input-navigation` |
| develop | done    | 2026-10-14 17:15 | develop/handoff.md | Plano implementado sem desvio: `readOnly` nos dois campos de texto, `aria-labelledby` no grupo de rádio, `Button` com largura e trava em carregamento, footers sem a fusão; design system 146→167 testes, app 845 e web 95 inalterados, `pnpm check` e os três `typecheck` limpos |
| review  | done    | 2026-10-14 18:05 | review/review.md | rodada 2 (R1): `useSubmitEnterGuard` no `HookFormInput`/`HookFormInputPassword` bloqueia o Enter enquanto o envio corre e por um timer depois, até o botão travar; foco e `readOnly` mantidos; 2 testes novos reprovam antes (2/4 e 3 chamadas em vez de 1) e passam depois; `pnpm check` 884, typecheck 3/3, suítes ds 171, app 846, web 95; R1 volta ao `/test` para medição no navegador; plano de commits único da PR com 13 commits, branch recomendada `fix/date-pickers-and-form-fields`, aguardando aprovação do usuário |
| test    | done    | 2026-10-14 18:00 | test/report.md | remedição do R1: 10 critérios ✅, 0 ❌, 0 🔒; com o `useSubmitEnterGuard`, 1 `signInWithPassword` por rodada em 30 rodadas de Enter repetido (app 19, web 11; 23 com o 2º Enter antes de o botão travar), foco preservado, login correto e reenvio nos diálogos funcionam; `pnpm test` 15/15 (ds 171, app 846, web 95); portas liberadas |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Divide o working tree e a PR com `date-input-navigation`, que ainda não foi commitada. Os commits desta
  tarefa entram intercalados no plano daquela (posições na §15 do plano). O `AGENTS.md` é o único arquivo
  tocado pelas duas, e o commit de documentação fica misto.
- Tarefa direta, sem spec: vem da recomendação de `specs/BACKLOG.md:281-330`.
- Revisão feita em rodada autônoma do `/cycle`: nenhum commit, nenhuma branch criada ou renomeada. O plano de
  commits consolidado das duas tarefas está em `review/review.md` e aguarda a aprovação do usuário.
- `/test` em rodada autônoma do `/cycle`: dados só no emulador, nenhuma conta nova; `test/criterios-aceite.md` e `test/report.md` entram no commit `docs(features): form-field-focus-and-names`. O R1 (critério 4) reprovou na primeira medição, o `/review` corrigiu com o `useSubmitEnterGuard` e a remedição do `/test` aprovou.
- Rodada 2 do `/review` (R1): correção no design system, sem mexer nos call sites; a linha `test` segue com o
  bloqueio da rodada anterior até o `/test` remedir o R1 no navegador (lista na seção "Rodada 2: R1" do `review/review.md`).
