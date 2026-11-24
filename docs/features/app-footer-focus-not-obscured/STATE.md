---
slug: app-footer-focus-not-obscured
title: "Foco escondido pela barra fixa nos formulários de página inteira"
task: -
spec: -
branch: feat/delivery-security-hardening
epic: -
updated: 2026-11-24 04:48
---

# Pipeline — Foco escondido pela barra fixa nos formulários de página inteira

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-24 03:31 | analyze/plan.md | Causa: o painel rola no `html`, a barra de ações é `sticky bottom-0` (69 px) e o navegador só rola o campo focado se ele sair da viewport, sem descontar a barra; o `Navbar` `sticky top-0` (64 px) repete o defeito no Shift+Tab. Correção na raiz: `has-[[data-sticky-action-bar]]:scroll-pb-20` e `has-[[data-panel-navbar]]:scroll-pt-20` no `<html>` do root layout, atributo nas três barras fixas (`Footer` fixo, `Container`, `PageFormFooter`) e no `Navbar`. Teste de componente ligando seletor e atributo, E2E novo a 375×812 medindo o foco contra as barras. Zero dependência, zero env, zero i18n. 10 decisões por padrão (Q1 a Q10) |
| develop | done    | 2026-11-24 04:14 | develop/handoff.md | Plano A medido no Chromium e mantido (sem `focusin`). Atributos nas três barras e no `Navbar`, classes no `<html>`, T1 (7 casos) e E2E com 3 testes a 375×812, vermelhos sem a classe e 9/9 verdes em `--repeat-each=3`. Desvios: setas em editar entidade (em criar o último rádio sobrepõe a barra só 1 px) e teste próprio do `Navbar` com a página posicionada |
| review  | done    | 2026-11-24 04:40 | review/review.md | Sem bloqueante; pré-condição no 1º teste do E2E e JSDoc do T1 em inglês; plano combinado de 35 commits (`CLAUDE.md` das duas tarefas num `docs(claude)`) |
| test    | done    | 2026-11-24 04:48 | test/report.md  | 7/7 critérios. Vitest `app` 1316 e `e2e` 38, `pnpm test` 15/15; `focusNotObscured` 9/9 em 3 repetições e 3/3 vermelhos sem a correção; `pnpm e2e` 45/45 (6 tarefas da rodada). Browser: 0 foco coberto nas 6 telas a 375/390/1280, barra com 69 px e uma linha nos 3 idiomas, claro e escuro; `scroll-padding` em `auto` sem barra, inclusive após navegar pelo App Router. Fora de escopo: SSR `Maximum call stack` só no `next dev` (limpo em `next start`) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

### Origem

- Tarefa direta, sem spec: o achado 🟡 "foco escondido pelo rodapé fixo" de `specs/BACKLOG.md` (seção "Achados da
  PR #62"), item 5 da ordem da rodada. Repro original em `docs/features/app-internal-ux-polish/test/report.md`
  ("Não corrigido: foco escondido pelo rodapé fixo").
- Rodou em modo autônomo dentro do `/cycle`. Nenhuma pergunta feita; decisões em `analyze/plan.md`, "Perguntas
  em aberto (decididas por padrão)".

### Para o `/develop`

- O `scroll-padding` é hipótese até ser medido (`plan.md` §5.1). Se o Chromium não rolar o rádio focado por
  seta, aplicar o plano B (listener de `focusin` no `Footer`) e registrar o desvio.
- Rodar T1 e T2 uma vez sem a classe do `html` e registrar o vermelho (`plan.md` §7).
- Não tocar nos arquivos de autenticação que outra tarefa da rodada está editando.

### Para o `/review`

- O `apps/app/CLAUDE.md` já tem um bloco não commitado da tarefa de autenticação. Separar os blocos no plano de
  commits (`plan.md` §10.5).

### Para o `/test`

- Roteiro em `plan.md` §8: seis telas, três viewports, claro e escuro, três idiomas, Tab, Shift+Tab e setas.
- Teclado virtual e Safari/Firefox ficam como não verificados (`plan.md` §8.4).

### Branch

- `feat/delivery-security-hardening`, a mesma da rodada. Não trocar.
