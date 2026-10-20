---
slug: in-app-notifications
title: Central de notificações no app
task: -
spec: in-app-notifications
branch: feat/in-app-notifications
epic: -
updated: 2026-10-20 01:20
---

# Pipeline: Central de notificações no app

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-20 00:14 | analyze/plan.md | Coleção `notification` por dono (tipo + parâmetros, `readAt`, `expiresAt` de 90 dias), quatro rotas sob `requireCommonPanelApi` (listar por cursor, contar não lidas com teto 100, marcar uma, marcar todas), emissão única com id determinístico e dois produtores (boas-vindas em `createDefaultUserProfile`, mudança de status no webhook); sino no layout comum com contagem a cada 120 s só com a aba visível; exportação e passo próprio no expurgo; dois índices compostos e a TTL como pré-requisitos manuais |
| develop | done    | 2026-10-20 00:36 | develop/handoff.md | Slice inteiro (SDK, quatro rotas, dois produtores, exportação e expurgo, sino no layout comum, i18n nos três idiomas, docs); 404 para id inválido em `[id]/read` além do plano; smoke da API contra emulador ok; gates verdes (api 1436, app 957, i18n 67) |
| review  | done    | 2026-10-20 00:45 | review/review.md | Commits aprovados e pushados em `feat/in-app-notifications`. Nada bloqueante; posse, impersonação, `readAt: null`, 503, exportação, expurgo e webhook conferidos por leitura; `aria-label` do sino corrigido nos três idiomas; id com `%2F` em `entities/[id]` e `users/[id]` fica como achado; 13 itens para o `/test`; plano de 16 commits |
| test    | done    | 2026-10-20 01:20 | test/criterios-aceite.md, test/report.md | 20 critérios: 17 aprovados, 0 reprovados, 3 não verificados (Stripe real, índice e TTL no projeto real); 13 itens do review medidos (11 confirmados, 2 dependem de infra); suíte da raiz verde (api 1438, app 958, emulador 207); dois testes endurecidos; nenhum defeito bloqueante |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- A spec entrou no ciclo ainda `proposed`, por instrução direta do usuário nesta rodada (D6 já decidiu que o core
  terá o recurso). Aprovar continua sendo decisão do usuário; o frontmatter da spec só ganhou
  `feature: in-app-notifications`.
- Plano feito em rodada autônoma do `/cycle`. As 9 perguntas em aberto trazem a opção adotada, a descartada e o
  motivo, no fim do `analyze/plan.md`.
- Medições no emulador de Firestore (isolado na porta 8095, derrubado no fim): `count()` com dono + `readAt == null`
  funciona e respeita `limit`; o cursor não repete nem pula com `createdAt` empatado; documento sem `readAt` não
  casa com `== null`; o emulador serve consulta sem índice composto.
- Develop (2026-10-20): dois desvios merecem a leitura do revisor. O plano supunha que um id com `/` não
  chega ao handler, mas `%2F` chega, e a rota `[id]/read` passou a responder 404 a id inválido. E
  `LogScope` ganhou `"notifications"` em `packages/shared`. Detalhes no `develop/handoff.md`.
- Review (2026-10-20): nome de branch decidido, `feat/in-app-notifications`, criado na hora dos commits. Gates: `pnpm check` limpo, typecheck 4 de 4, paridade i18n 67. Detalhes e plano de commits no `review/review.md`.
- Test (2026-10-20): a ferramenta do subagent recusou gravar o `test/report.md`; o orquestrador gravou o conteúdo que ele devolveu, sem alteração.
