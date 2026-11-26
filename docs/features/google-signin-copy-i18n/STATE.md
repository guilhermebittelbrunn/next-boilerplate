---
slug: google-signin-copy-i18n
title: Textos fixos em inglês no login com Google da app
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline: textos fixos em inglês no login com Google

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 04:52 | analyze/plan.md | Os dois `throw new Error` em inglês de `googleSignInApi.ts` passam a usar `session.notEstablished`, sem chave nova; unit nos 3 idiomas, sem browser |
| develop | done    | 2026-11-26 04:54 | develop/handoff.md | Os três ramos de falha da troca usam `sessionNotEstablishedError()`; 7 testes novos reprovavam antes e passam depois; gates da app verdes |
| review  | done    | 2026-11-26 12:03 | review/review.md | Sem achado bloqueante nem correção; `getDictionary()` usa o mesmo locale do ramo vizinho; entra como commits 28 e 52 do plano combinado |
| test    | done    | 2026-11-26 05:01 | test/report.md  | 18/18 (7 reprovam com o HEAD); teste novo prova que a copy segue o locale da URL (4/4, reprova sem provider); app 1389 e raiz verdes; sem browser |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Origem: achado do `specs/reference/AUDIT.md` (linha 348 e a linha da tabela em 1595), sem spec própria.
