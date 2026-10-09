---
slug: account-deletion-dialog-focus
title: O diálogo de exclusão de conta leva o foco para dentro ao abrir
task: -
spec: none
branch: fix/ui-labels-and-account-dialog-focus (proposta, a criar com `git switch -c` antes do primeiro commit; o PR junta esta tarefa e `ui-strings-and-password-focus`)
epic: -
updated: 2026-10-08 00:28
---

# Pipeline — O diálogo de exclusão de conta leva o foco para dentro ao abrir

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-08 00:05 | analyze/plan.md | `onOpenAutoFocus` no `AlertDialogContent` de `AccountPrivacyPanel.tsx:137` com `form.setFocus("currentPassword")`, no molde do diálogo de troca de e-mail; `handleOpenChange` com `form.reset()` ao fechar (senha e erro hoje sobrevivem ao "Cancelar", medido); sem `onCloseAutoFocus` (o `AlertDialogTrigger` já devolve o foco, medido); correção no call site (2 call sites com `Footer`); 6 casos novos no teste existente; sem SDK, API, i18n, env ou infra; 2 commits sugeridos |
| develop | done    | 2026-10-08 00:11 | develop/handoff.md | `handleOpenChange` com `form.reset()` e `onOpenAutoFocus` com `form.setFocus("currentPassword")` em `AccountPrivacyPanel.tsx`; 6 casos novos no teste (16/16); mutação: `HEAD` derruba 6, sem `onOpenAutoFocus` derruba 6, sem `form.reset()` derruba 2; app 832/832, typecheck e `pnpm check` limpos; helper de abertura reescrito sem `expect` fora do `it` (o Biome recusava o esqueleto do plano) |
| review  | in-progress | 2026-10-08 00:16 | review/review.md | Nenhum achado bloqueante nem de atenção, nenhuma correção aplicada; 2 nits registrados; `onOpenAutoFocus`, `form.reset()` e a ausência de `onCloseAutoFocus` confirmados na leitura do Radix e do `HookFormInputPassword`; 8 itens em "Verificar no `/test`" (foco ao abrir no navegador é o primeiro); branch atual inválida no regex, proposta `app/fix/account-deletion-dialog-focus` (válida); 3 commits planejados |
| test    | done    | 2026-10-08 00:28 | test/report.md | Todos os critérios ✅ medidos em `build && start` + emulador (abrir por clique/Enter/Espaço, Tab preso, Esc/Cancelar, limpeza, 3 idiomas, claro/escuro/390 px, personificação); conta só Google 🔒 no navegador; mutação confirmada (6/10, 6/10, 2/14); app 832/832, `pnpm test` raiz 15/15; nenhum teste novo; foco após senha errada cai no contêiner do diálogo (achado de backlog) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir da recomendação da auditoria em `specs/BACKLOG.md` (`:183-213`) e do
  achado em `:793`. Plano feito em rodada autônoma do `/cycle`: as 7 decisões tomadas sem perguntar estão na
  §12 do plano, e as 2 perguntas da §11 já vêm com a opção adotada.
- O estado atual foi medido com um teste Vitest temporário, já removido: o foco fica no gatilho ao abrir, volta
  ao gatilho no Esc e no "Cancelar", e a senha digitada e a mensagem de validação reaparecem ao reabrir.
- A limpeza do formulário ao fechar vai além do pedido original (pergunta 2 da §11). Para o corte estrito,
  basta tirar o `form.reset()` e os casos T5 e T6.
- O `specs/BACKLOG.md` já estava modificado neste checkout antes desta etapa; conferir
  `git diff --cached --stat` antes do primeiro commit.
- Pré-requisitos manuais de infra: nenhum.
- `/test`: o `review` segue `in-progress` porque os commits ainda não foram feitos (`git log origin/main..HEAD` vazio); não é gate esquecido. A API rodou em `next dev` no e2e porque o build de produção dela exige credencial do Firebase Admin (já registrado no `docs/PRE-PRODUCTION.md`).
