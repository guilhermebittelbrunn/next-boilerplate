---
slug: e2e-testing
title: Testes E2E e acessibilidade automatizada
task: -
spec: e2e-testing
branch: test/e2e-testing
epic: -
updated: 2026-09-25 09:38
---

# Pipeline — Testes E2E e acessibilidade automatizada

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-24 16:04 | analyze/plan.md | Workspace `apps/e2e` com Playwright: 9 testes de fluxo (landing, cadastro com onboarding, login comum/admin/senha errada/deep link, CRUD de `entity`, troca de painel e comum barrado no `/admin`) contra emulador + seed, axe em `critical`/`serious` com allowlist (light nos fluxos, dark nas telas estáticas), cobertura consolidada por `vitest.config.mts` na raiz; jobs `changes`, `e2e` e `coverage` no CI, fora da linha do gate; nenhum código de produto muda |
| develop | done    | 2026-09-24 23:55 | develop/handoff.md | Workspace `apps/e2e` com 22 testes Playwright (22/22 verdes em 10,2 min localmente, nas portas 3100-3102), allowlist de a11y com 7 grupos de violação medidos, jobs `changes`/`e2e`/`coverage` no CI e docs; 11 desvios registrados no handoff |
| review  | done    | 2026-09-25 09:30 | review/review.md | Rodada 2 (volta do `/test`): D1 corrigido na raiz com `aria-label` do dicionário no gatilho do `ProfileDropdown` (chave nos 3 idiomas + unitário), `NEXT_TELEMETRY_DISABLED=1` na suíte, critério 7 reescrito para o `description`; D2 conferido igual ao `HEAD`; plano com 14 commits aguardando aprovação (nada commitado) |
| test    | blocked | 2026-09-25 09:38 | test/report.md, test/criterios-aceite.md | Rodada 2: D1 fechado (0/18 na repetição do comum, telemetria do Next zerada, nome do gatilho nos 3 idiomas por unitário), mas `CI=1 pnpm e2e` voltou `1 flaky, 21 passed`: o `LanguageSwitcher` da web aninha `button` em `button`, a hidratação refaz a árvore e o axe pega o gatilho vazio em `web:/pt-br/sign-up` (D3, 1/24 na repetição) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As cinco perguntas em aberto já vêm com a opção adotada, e as
  20 decisões tomadas sem perguntar estão no fim do `analyze/plan.md`, cada uma com a alternativa descartada.
- Pré-requisitos manuais de infra estão na seção 9.1 do plano: ruleset na `main` exigindo `verify` e `e2e`
  (hoje `protection` → 404, `rulesets` → `[]`) e o check `e2e` só aparecendo depois de rodar numa PR. O
  `/test` não reprova por eles; o merge bloqueado e o job rodando no GitHub ficam como 🔒.
- Os `.env` locais desta máquina apontam para um projeto Firebase real. A suíte monta o ambiente dos
  servidores a partir do `.env.example`, zera as chaves locais e recusa subir sem alvo de emulador. O
  critério 2 do plano mede isso.
- Nenhum secret no CI.
