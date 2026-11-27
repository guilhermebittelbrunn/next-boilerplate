---
slug: audit-log-levels
title: Níveis na trilha de auditoria (sensível e informativo)
task: -
spec: audit-log-levels
branch: feat/audit-log-levels
epic: -
updated: 2026-11-27 10:07
---

# Pipeline — Níveis na trilha de auditoria (sensível e informativo)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-26 17:18 | analyze/plan.md | Campo `level` derivado da ação no servidor, 8 ações novas (`user.create` sensível e 7 de ciclo de vida informativas), filtro e coluna de nível em `/admin/audit`, 2 índices compostos novos, backfill e `expiresAt` de 12 meses só nos informativos |
| develop | done    | 2026-11-26 17:59 | develop/handoff.md | Retomada após interrupção: código das 4 camadas conferido e verde, faltavam só `PRE-PRODUCTION.md` (§1.3, §1.11, §1.12) e `ROPA.md` §7; 7 desvios menores registrados |
| review  | done    | 2026-11-27 10:10 | review/review.md | Rodada 2: corrida de duas abas no onboarding corrigida com transação em `userRepository.advanceOnboarding`, teste de emulador novo; api 1964 testes, emulador 283; plano passou a 14 commits, nenhum executado |
| test    | done    | 2026-11-27 10:07 | test/report.md | Remedição da rodada 2: corrida do onboarding corrigida (5 rodadas concorrentes, um evento e o mesmo `completedAt` em cada); 14 critérios ✅ e 2 🔒 (assinatura sem Stripe, 503 sem projeto real); `pnpm test` 15/15 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Rodada autônoma do `/cycle`. As perguntas 2, 3 e 4 da spec não tinham resposta e o plano adotou a
  recomendação da própria spec em cada uma (decisões D2, D3 e D4 do plano).
- A retenção de 12 meses vale só para os eventos `info`. O prazo dos sensíveis continua sendo a E5,
  decisão do usuário, e esta entrega não a fecha.
- Cinco pré-requisitos manuais de infra, listados no plano, que o `/develop` não satisfaz e que não reprovam
  a entrega: publicar os dois índices novos de `auditEvent`, rodar o backfill de nível em base com dado,
  ligar a TTL em `auditEvent.expiresAt` (Blaze), decidir a E5 e ter Stripe em modo teste para ver os eventos
  de assinatura no navegador.
- Nenhum `error.code` novo, nenhuma env nova, nenhuma dependência nova.
- O `review` foi marcado `done` pelo `/cycle`, que não commita. Os 13 commits do plano em
  `review/review.md` continuam pendentes de aprovação do usuário.
- Rodada 2 do `review` (2026-11-27): o `/test` confirmou a corrida de duas abas no onboarding (dois
  `account.onboarding.complete` e `completedAt` sobrescrito). A revisão moveu a decisão e a escrita para uma
  transação e voltou a etapa para `in-progress`. O `/test` precisa remedir a corrida pela API antes de a
  linha `test` valer para esta versão do código.
