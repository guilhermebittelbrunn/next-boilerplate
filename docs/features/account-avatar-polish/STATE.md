---
slug: account-avatar-polish
title: Avatar da conta sob personificação e aviso de src vazio
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline — Avatar da conta sob personificação e aviso de src vazio

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 01:11 | analyze/plan.md | `disabled={isImpersonating}` no upload de avatar da conta; `ProfileDropdown` descartado como origem do `src=""`, que o `/test` localiza pelo component stack |
| develop | done    | 2026-11-26 01:18 | develop/handoff.md | `disabled={isImpersonating}` no `HookFormImageUpload` (linha 117) + 2 testes jsdom; origem do `src=""` segue a localizar no `/test` |
| review  | done    | 2026-11-26 12:03 | review/review.md | rodada 2: `ProfileDropdown` só monta o `AvatarImage` com URL (o `?? ""` deixava `<img src="">` num commit com o status `loaded` herdado do Radix); teste novo reprova sem a correção; app 1367/1367; plano combinado com 23 commits |
| test    | done    | 2026-11-26 01:55 | test/report.md | upload travado sob personificação confirmado (3 idiomas, light/dark, desktop/mobile); `src=""` do `ProfileDropdown.tsx` corrigido e reconferido no dev e em produção; app 1367/1367 |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- `AccountProfileForm.tsx` também tem mudanças não commitadas de `admin-own-account` e `app-form-layout-centered`; o commit desta tarefa precisa separar o hunk.
- `/test` (2026-11-26 01:40): `review` segue `in-progress` sem commit da feature, o que é o estado esperado no `/cycle` (commit depende de aprovação). Bloqueio do `test`: corrigir `ProfileDropdown.tsx` (não passar `""` ao `AvatarImage`) e cobrir o caso com mock de `window.Image`.
- `/review` rodada 2 (2026-11-26 01:50): correção em `ProfileDropdown.tsx` (hunks 2 e 3 de 4; os outros são de `admin-own-account`), commit próprio `fix(app)` antes do commit que adiciona o arquivo inteiro. O `test` volta para reconferir as repro A e B.
- `/test` reconferência (2026-11-26 01:55): correção do `ProfileDropdown.tsx` medida nos repros A e B (dev), em `build && start` e no caminho inverso; `test` passa a `done`.
