---
slug: cursor-pagination
title: Paginação por cursor no BaseRepository e no SDK
task: -
spec: cursor-pagination
branch: feat/cursor-pagination
epic: -
updated: 2026-09-16 22:47
---

# Pipeline — Paginação por cursor no BaseRepository e no SDK

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-16 21:30 | analyze/plan.md | Slice `entity` paginado do Firestore à tela: `paginate` no `BaseRepository`, envelope `PageDTO` no SDK, `limit`/`cursor` na rota, "carregar mais" na tabela — mais a correção do `update()` que corrompia `createdAt` |
| develop | done    | 2026-09-16 21:54 | develop/handoff.md | Slice paginado de ponta a ponta, com `update()` corrigido e modo degradado `503 PAGINATION_INDEX_MISSING`; gates verdes, mas o fluxo autenticado não foi visto no navegador |
| review  | in-progress | 2026-09-16 22:20 | review/review.md | Fluxo autenticado percorrido com o emulador de pé: cursor real, empate de `createdAt` e toggle na segunda página funcionam; corrigidos o `emptyText` que mentia na busca sobre página não carregada e o script de backfill, que não rodava contra projeto real |
| test    | done    | 2026-09-16 22:47 | test/criterios-aceite.md | 17 critérios aprovados, 0 reprovados, 2 não verificáveis sem projeto Firebase real (o emulador não cobra índice composto); 8 testes novos, gates em 24 de 24 tasks |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- O corte inclui um defeito fora da spec: `BaseRepository.update()` (`base.repository.ts:102-117`)
  reescreve `createdAt` como string ISO, porque relê o documento pelo `findById()` já normalizado pelo
  mapper. Como o Firestore ordena por tipo antes de por valor, cursor estável sobre `createdAt` não
  existe sem essa correção. Detalhe em `analyze/plan.md`, §2.3.
- Dois pré-requisitos manuais de infra, que o `/develop` não satisfaz e que não reprovam a entrega:
  publicar o índice composto de `entity` (`deploy --only firestore:indexes`) e rodar o backfill de
  instantes em base que já tem dado gravado.
- O emulador do Firestore **não** cobra índice composto. Ele prova ordenação e cursor; não prova que a
  entrada em `firestore.indexes.json` existe. Por isso o plano prevê um teste estático sobre o arquivo.
- Mudança de contrato no SDK: `entity.list()` deixa de devolver array cru. Os 11 call sites afetados
  estão enumerados em `analyze/plan.md`, §3.3. Todos ajustados no `/develop`.
- **A validação visual do fluxo autenticado aconteceu no `/review`.** O `/develop` a pulou por concluir
  que a máquina não tinha JDK 21; tem, mas a fórmula do `brew` é keg-only e não entra no `PATH` sozinha.
  Com `JAVA_HOME` apontado, o emulador sobe. O que o handoff deixou em aberto foi percorrido no navegador
  contra Firestore de verdade, com screenshots em `review/screenshots/`. `docs/SETUP.md` foi corrigido
  para que o próximo a passar por aqui não repita o diagnóstico.
- O `analista-qa` não conseguiu gravar `test/report.md`: o ambiente desta rodada bloqueia a escrita de
  arquivos de relatório por subagent. O orquestrador do `/cycle` gravou o arquivo com o conteúdo apurado
  pelo QA, e o cabeçalho do relatório registra essa autoria. O checklist item a item segue em
  `test/criterios-aceite.md` e as evidências em `test/e2e/`.
- Dois pontos de ambiente que o QA levantou e não estão em outro lugar: rodar o app fora da porta 3000
  exige `CORS_ORIGIN` correspondente na API, porque o allowlist de desenvolvimento em `cors.ts` só traz
  3000 e 3001; e os `.env` deste workspace apontam para o projeto Firebase real, então as variáveis de
  emulador precisam vir pela linha de comando.
