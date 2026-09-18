---
slug: user-activity-tracking
title: Último acesso do usuário
task: -
spec: user-activity-tracking
branch: feat/user-last-access
epic: -
updated: 2026-09-18 00:05
---

# Pipeline — Último acesso do usuário

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-17 22:55 | analyze/plan.md | `lastAccessAt` no perfil, carimbado nos guards da API com janela de 15 min, + coluna na listagem do admin |
| develop | done    | 2026-09-17 23:25 | develop/handoff.md | carimbo nos dois guards com janela de 15 min, coluna com os três estados e declaração de retenção |
| review  | in-progress | 2026-09-17 23:58 | review/review.md | log de sucesso removido, promessa de "uma escrita por janela" corrigida no contrato, e as 3 afirmações do handoff reverificadas contra o documento |
| test    | done    | 2026-09-18 00:05 | test/report.md  | 18 critérios aprovados, 17 casos novos fecham as 4 lacunas da revisão, e os gates do CI passam em 24/24 |
| observe | pending | -                | -               | - (opcional) |

## Notas

- Rodada autônoma (`/cycle`). Ninguém foi consultado; as 8 decisões tomadas estão em "Perguntas em aberto"
  no plano, cada uma com a alternativa descartada.
- **Desvio da spec que vale conferir antes do `/develop`**: a spec sugeria carimbar no ramo
  `{ refreshed: true }` de `sessionRefreshPOST`. Medido, esse ramo dispara uma vez a cada 2,5 dias
  (`packages/auth/session.ts:24` + `:30` + `:137-140`), o que contradiz a janela de 15 minutos que a própria
  spec recomenda. O gancho foi para os guards da `apps/api`, onde o perfil já é lido em toda requisição
  autenticada (`common-panel.ts:44-46`, `admin.ts:44`). `packages/auth` não é tocado.
- Sem pré-requisito de infra: nenhum índice novo, nenhuma variável de ambiente, nenhuma mudança em
  `firestore.rules`. A afirmação da spec sobre o índice foi confirmada no código.
- Finalidade e retenção do dado pessoal entram em `docs/PRE-PRODUCTION.md` como declaração, não como
  bloqueador.
- **Do `/develop`**: o plano previa que nenhum teste existente mudaria, e 17 arquivos de teste da `api`
  precisaram de `touchLastAccess` na factory do `vi.mock` do repositório de usuário. Uma linha em cada,
  sem mexer em asserção.
- **Decidido no `/review`**: o log de toda escrita bem-sucedida (decisão 8 do plano) foi removido. Os 16
  pontos de `logEvent` do repositório logam só falha ou recusa, e `logEvent` sai em `console.warn`, o que
  daria até 4 linhas por hora por usuário ativo em todo fork. A garantia de custo continua provada pelo
  teste de cache frio e observável pela métrica de escrita da coleção `user`.
- **Reverificado no `/review`, contra o documento no Firestore**: a janela (110 requisições autenticadas
  → 3 escritas em duas janelas, 2 delas de um par concorrente na abertura), o carimbo do ator e nunca do
  sujeito, e o `updatedAt` parado. A virada de janela em uso real, que o `/develop` não tinha validado,
  foi observada.
- Validação visual rodou contra o emulador e cobriu os três estados da coluna com dado real, incluindo o
  percurso de impersonação. O emulador também confirmou duas coisas que o plano tinha deixado como
  opcionais para o `/test`: o `Timestamp` atravessa a serialização e o carimbo não move `updatedAt`.
- **Do `/test`**: as quatro lacunas da revisão viraram teste, mais dois arquivos que ela não tinha previsto
  (`baseRepository.test.ts` e `userProfileSerialization.test.ts`, que fixam `updatedAt` parado e a
  serialização do campo). Nenhum teste precisou de emulador. O `/test` não subiu app nem emulador: a
  evidência de tela é a da revisão, e só arquivos de teste mudaram desde então.
- **Para o plano de commits**: os dois arquivos de teste não previstos entram no commit 2, junto de
  `touchLastAccess`.
