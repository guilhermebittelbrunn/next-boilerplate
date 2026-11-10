---
slug: app-internal-ux-polish
title: Conta como página de configurações e padrão único de página nas telas internas
task: -
spec: app-internal-ux-polish
branch: feat/app-internal-ux-polish
epic: -
updated: 2026-11-10 11:54
---

# Pipeline: conta como página de configurações e padrão único de página

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-10 10:46 | analyze/plan.md | Conta com navegação vertical derivada do `?tab=`, blocos com salvar próprio e zona de perigo; `PageHeader`, `SettingsSection` e `PageSkeleton` em `apps/app` aplicados às 11 telas; ativo do menu com query; em duas fases, sem SDK nem API. |
| develop | done    | 2026-11-10 11:42 | develop/handoff.md | Shell de página, menu com ativo por query e conta com seção derivada da URL em blocos com zona de perigo, aplicados às 11 telas; gates verdes (1191 testes no app), E2E novo ainda não executado. |
| review  | done    | 2026-11-10 11:54 | review/review.md | Nada bloqueante; dois ajustes de texto, gates estáticos verdes, 13 itens para o `/test` medir; 12 commits em `feat/app-internal-ux-polish`, enviados ao remoto. |
| test    | pending | -                | -               | -                |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Roda antes da fatia 3 de `account-security-mfa` e nunca em paralelo com ela: as duas alteram `AccountSecurityForm.tsx`.
- As quatro perguntas do plano foram respondidas em 2026-11-10, todas pela recomendação: uma PR com F1 e F2, `Footer` fixo mantido nos formulários de página inteira, encerrar sessão específica sem confirmação, zona de perigo sem título.
