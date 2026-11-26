---
slug: app-form-layout-centered
title: "Telas de formulário do painel centralizadas e com altura do conteúdo"
task: -
spec: app-form-layout-centered
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline — Telas de formulário do painel centralizadas e com altura do conteúdo

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-25 16:29 | analyze/plan.md | `mx-auto` em `PAGE_NARROW_CLASS` (só telas `narrow`; listas não recebem a classe), `<form>` das quatro telas de criar/editar sem `flex-1`/`min-h-[50vh]` (o painel do `Container` aninhado passa a ter a altura dos campos e a barra fixa fica logo abaixo), cinco blocos da conta sem `flex-1`, três `loading.tsx` estreitos novos. `Container`, `PageSkeleton` e `Footer` não mudam. Etapa D0 antes: diagnóstico do E2E vermelho `focusNotObscured.spec.ts:188`. Zero i18n, zero env, zero infra. 7 decisões por padrão |
| develop | done    | 2026-11-25 16:37 | develop/handoff.md | Plano aplicado sem desvio: `mx-auto` em `PAGE_NARROW_CLASS`, quatro `<form>` sem `flex-1`/`min-h-[50vh]`, cinco blocos da conta sem `flex-1`, três `loading.tsx` estreitos, T1/T2 (14/14; 6 falham com a mudança revertida). D0: clique antes da hidratação (trace do run 45633106961), teste corrigido com `toPass`, ainda não rodado. App 1321 testes verdes, typecheck e `pnpm check` limpos |
| review  | done    | 2026-11-26 12:03 | review/review.md | Nada bloqueante e nenhuma correção. Gates: `pnpm check` 1138 arquivos sem erro, typecheck de app e e2e limpos. D0 lido contra o `Dropdown` de clique (só clica com o menu fechado). Nove itens para o `/test`, a começar pelo `--repeat-each` do D0 e o caso 1 a 375 px. Branch proposta `feat/app-form-layout-centered`, plano de 7 commits |
| test    | done    | 2026-11-25 18:27 | test/report.md  | 10/10 critérios ✅ medidos em build de produção (1920/1280/390/375, claro/escuro, pt-br/en/es). D0: `focusNotObscured` 15/15 e caso 3 10/10 com 1 clique por repetição. `pnpm test` 4663 verdes; `pnpm e2e` 45/45 somando reexecução de 4 timeouts de carga da máquina. Tabela antd sem CSS confirmada em produção (fora de escopo, backlog) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

### Origem

- Spec `specs/features/app-form-layout-centered.md` (`approved`), primeira da fila desde 2026-11-25. Rodou em modo
  autônomo dentro do `/cycle`; decisões em `analyze/plan.md`, "Perguntas em aberto (decididas por padrão)".
- As duas perguntas da spec foram resolvidas pela recomendação dela: a aba Cobrança segue a coluna estreita, e as
  três telas sem `loading.tsx` ganham um.

### Para o `/develop`

- Comece pela etapa D0 (`plan.md` §7.1): reproduzir o E2E vermelho na base, medir a hipótese do clique antes da
  hidratação e só corrigir o teste se a causa for dele. Causa na app vira achado no handoff, sem correção aqui e
  sem trocar a navegação do teste pela URL direta.
- Não mexer em `Container.tsx`, `PageSkeleton.tsx` nem `Footer.tsx`.

### Para o `/test`

- Roteiro e medições em `plan.md` §8: cinco telas de formulário, seis telas de controle (listas e dashboards),
  1920/1280/390, claro e escuro, três idiomas, `pnpm e2e` inteiro.

### Pré-requisitos de infra

- Nenhum.

### Do `/test`

- O `review` segue `in-progress` porque os commits aguardam aprovação: `git log main..HEAD` está vazio, então o
  gate não ficou aberto por esquecimento.
- Follow-ups para o backlog: CSS-in-JS do antd sem SSR (tabela sem estilo até hidratar, confirmado em
  `next build` + `next start`); asserção do caso 1 do `focusNotObscured` dependente de um só campo abaixo da
  barra a 375×812; `next dev` gerando `AGENTS.md` não rastreado nos três apps.
