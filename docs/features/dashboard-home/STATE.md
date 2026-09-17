---
slug: dashboard-home
title: Home do painel com widgets
task: -
spec: dashboard-home
branch: feat/dashboard-home
epic: -
updated: 2026-09-17 13:33
---

# Pipeline: home do painel com widgets

| etapa   | status  | quando           | artefato          | resumo (1 linha) |
|---------|---------|------------------|-------------------|------------------|
| analyze | done    | 2026-09-17 10:36 | analyze/plan.md   | Duas rotas de contagem agregada (`/entities/summary`, `/users/summary`), cartões e gráfico nas duas homes, três índices novos |
| develop | done    | 2026-09-17 11:11 | develop/handoff.md | Slice completo do SDK à i18n; gráfico foi para o design-system porque `recharts` não é dependência da `apps/app` |
| review  | done    | 2026-09-17 11:34 | review/review.md | Dois comentários redundantes removidos das rotas; gráfico e ausência de harness reverificados no browser; gates verdes; plano de 16 commits aguardando aprovação |
| test    | done    | 2026-09-17 13:33 | test/criterios-aceite.md | 22 critérios aprovados, 0 reprovados, 2 não verificados (índices compostos não publicados); 22 testes de componente novos; gates verdes |
| observe | pending | -                | -                 | - (opcional) |

## Notas

- O plano foi feito em rodada autônoma: as oito perguntas em aberto já vêm decididas, cada uma com a
  alternativa descartada registrada no fim do `analyze/plan.md`.
- A seção 12 do plano lista os pré-requisitos de infra. Sem os três índices compostos publicados, as duas
  rotas respondem 503 `SUMMARY_INDEX_MISSING`. Critério que dependa disso é **não verificado**, nem
  aprovado nem reprovado.
- O emulador do Firestore serve consulta sem índice, então a feature funciona localmente mesmo sem o
  deploy. A cobertura do índice fica em `apps/api/__tests__/firestoreIndexes.test.ts`.
- O `/develop` desviou do plano em seis pontos, todos registrados no `develop/handoff.md`. O primeiro é o
  que muda o raio de impacto: `packages/design-system` foi tocada, ao contrário do que o plano previa.
- Validação visual feita contra os emuladores, nas portas 3010 (app) e 3012 (api), porque 3000 e 3002
  estavam ocupadas por outro processo da máquina. Screenshots em `develop/screenshots/`.
- O `/review` refez a validação visual por conta própria, nas mesmas portas, e guardou os screenshots em
  `review/screenshots/`. Para subir o emulador foi preciso um JDK 21 temporário: o `firebase-tools` 15.30.1
  recusa o Java 17 instalado na máquina.
- O `/test` percorreu o app de novo nas mesmas portas, com screenshots em `test/e2e/`. Cobriu o que as
  etapas anteriores deixaram sem prova executável: estado vazio, `chart.empty` (com um documento de
  `entity` sem `type` gravado direto no emulador), personificação e os três idiomas na home admin.
- O relatório do `/test` não virou arquivo: o harness da sessão bloqueou a escrita de `test/report.md`.
  O conteúdo foi entregue na conversa, para quem for retomar o fluxo gravar.
- Armadilha de harness registrada pelo `/test`: com a aba do navegador oculta
  (`document.visibilityState === "hidden"`), o recharts não anima e o gráfico aparece sem barras. Não é
  defeito do produto; some ao reativar a aba.
