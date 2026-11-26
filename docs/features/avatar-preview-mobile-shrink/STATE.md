---
slug: avatar-preview-mobile-shrink
title: Prévia do upload de imagem achatada no mobile
task: -
spec: -
branch: feat/admin-account-forms-and-session-revocation
epic: -
updated: 2026-11-26 12:03
---

# Pipeline — Prévia do upload de imagem achatada no mobile

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 04:19 | analyze/plan.md | `className="shrink-0"` no `ResponsiveImage` dentro do `ImageUploadInput` + teste de classe; prova real é medir 64 x 64 a 390 px nos 3 idiomas |
| develop | done    | 2026-11-26 04:22 | develop/handoff.md | `shrink-0` na prévia do `ImageUploadInput` + teste de classe (reprova sem a classe); gates verdes, layout a medir no `/test` |
| review  | done    | 2026-11-26 12:03 | review/review.md | causa (flex-shrink + overflow-hidden) confirmada por leitura; sem achado, sem correção; layout 64 x 64 a medir no `/test`; commits 7 e 50 do plano combinado |
| test    | done    | 2026-11-26 04:52 | test/report.md  | 64 x 64 em 18 de 18 células com prévia (390/320/1280, light/dark, 3 idiomas, admin), sem rolagem; controle sem `shrink-0` mede 56-60 x 64; storage desligado 🔒; `pnpm test` raiz verde na 2ª execução (1ª caiu por timeout do pool sob carga) |
| observe | pending | -                | -               | - (opcional)     |

## Notas
- Origem: achado do `/test` de `account-avatar-polish` (`test/report.md:119-121`).
- `/test`: `review` segue `in-progress` (rodada do `/cycle`, sem commits); o `/review` fecha o gate ao executar os commits 7 e 50.
