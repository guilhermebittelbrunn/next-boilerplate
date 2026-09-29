---
slug: accessibility-conformance
title: Acessibilidade com allowlist do axe zerada e testes no design system
task: -
spec: accessibility-conformance
branch: feat/accessibility-conformance
epic: -
updated: 2026-09-29 01:55
---

# Pipeline — Acessibilidade com allowlist do axe zerada e testes no design system

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-29 00:40 | analyze/plan.md | Os 7 `HookForm*` passam de `Controller` a `FormField` e os compostos repassam `aria-describedby`; toggle de senha, gatilho do `ActionsMenu` e `Switch`/`Select` do painel ganham nome do dicionário; `Button` em carregamento mantém o rótulo em `sr-only`; `--muted-foreground` claro 0,54 e `--destructive` escuro do upstream, com override do hover `danger` no `Dropdown` do antd; `<title>` nos 2 layouts do painel; `Link` com `buttonVariants` na web; allowlist vazia; task `test` nova no design system com dependências que já estão no lockfile; 11 commits. |
| develop | done    | 2026-09-29 00:59 | develop/handoff.md | Implementado o plano inteiro; desvio: o `Dropdown` do antd também recebe `colorError` por componente, porque o antd resolve seed token passado como variável CSS para `#000000` (medido no CSS injetado); 44 testes novos no design system, allowlist vazia, `pnpm e2e` a rodar no `/test`. |
| review  | in-progress | 2026-09-29 01:50 | review/review.md | Rodada 2: o hover do "Excluir" escondia texto e ícone (1:1), erro deste diff; filhos do item `danger` passam a `color: inherit` no `globals.css`, travado por teste que lê o CSS (2 mutações derrubam); 45/45 no design system; resta o `/test` remedir repouso e hover nos 2 temas; plano de commits atualizado com os testes do QA. |
| test    | done    | 2026-09-29 01:55 | test/report.md  | Rodada 2: o hover do "Excluir" do `ActionsMenu` foi corrigido no `globals.css` e remedido (texto e ícone 4,77:1 claro e 6,85:1 escuro, em entidades e usuários; "Editar" sem regressão; design system 45/45). Rodada 1 já tinha medido o resto: `pnpm e2e` 22/22 sem `a11y-stale-exception`, `pnpm test` 14 tasks, 24 títulos, contrastes computados; 3 testes novos no `apps/app`. |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As 12 decisões tomadas sem perguntar estão em §13 do plano, cada
  uma com a alternativa descartada, e as 4 perguntas em §14 já vêm com a opção adotada.
- A branch atual era `cycle-spec-pipeline`, fora do padrão. O `/review` criou `feat/accessibility-conformance` a partir dela (regex ok); a antiga não foi renomeada.
- Pré-requisitos manuais de infra: nenhum (§12.1). O checkout em carregamento fica 🔒 sem chave de teste da
  Stripe.
- O plano corrige a spec num ponto: os quatro `HookForm*` sem `FormControl` já publicam `aria-invalid`; o que
  falta neles é ligar o campo à mensagem (§5.1).
- Os contrastes do plano foram calculados à mão (oklch → sRGB). O `/test` mede no estilo computado, e o número
  dele vale.
- ⚠️ O working tree já tinha mudanças da auditoria do backlog (`specs/*`, `docs/features/storage-emulator-rules-tests/*`)
  que não pertencem a esta feature e têm commit próprio.
- `/develop`: o override do hover `danger` que o plano propunha escurecia o hover no escuro, porque o antd
  resolve `colorError` global para `#000000`. O conserto e a medição estão no topo do `develop/handoff.md`.
- `/test`: o `review` ainda estava `in-progress` sem commit da feature (o plano de commits espera aprovação do usuário). O harness do subagent bloqueou a gravação do `test/report.md`; o conteúdo foi devolvido ao orquestrador para ele gravar. `test/criterios-aceite.md` está gravado.
- `/test` rodada 2: o `/review` corrigiu o defeito do hover do "Excluir" (filhos do item `danger` com `color: inherit`) e o `/test` remediu só o menu de ações; `test` passa de `blocked` a `done`.
