# Handoff do `/develop`: notification-read-race

Rodada autônoma do `/cycle`, sem perguntas ao usuário. Branch `feat/audit-log-levels`, sem commit. Os cinco
arquivos do plano foram os únicos tocados; nenhum deles pertence à feature `audit-log-levels`, que segue no mesmo
working tree.

## Blueprint para arquivos

| item do plano | arquivos |
|---------------|----------|
| 11.1 repositório | `apps/api/(shared)/repositories/notification.repository.ts`: `try/catch` em volta do `batch.commit()` de `markAllReadByUserId`; `isNotFoundError` faz a passada não somar nada e o laço relê a consulta; qualquer outro erro é relançado. O JSDoc do método explica por que o lote inteiro cai. |
| 9, repositório com Firestore falso | `apps/api/__tests__/notificationRepository.test.ts`: o `batch.update` do falso registra os ids e o `commit` rejeita com `{ code: 5 }` sem aplicar nada quando algum id sumiu do `store`. Dois ganchos novos no falso (`beforeCommit` e `commitFailures`) e dois casos novos: corrida (3 não lidas, 1 apagada antes do primeiro commit, resolve com 2, contagem 0) e erro `PERMISSION_DENIED` relançado sem gravar nada. |
| 9, emulador | `apps/api/__tests__/notificationMarkRead.emulator.test.ts`: caso novo com três documentos semeados; um `spyOn(firestore, "batch")` apaga um deles antes de delegar ao commit real do primeiro lote, guarda o erro rejeitado e confere o código. Limpeza por `userId` no `afterAll`. |
| 11.2 hook | `apps/app/shared/hooks/useNotificationActions.ts`: `withoutItem` e o desvio em `onError` do `markRead` quando `apiErrorCodeOf(error) === "NOTIFICATION_NOT_FOUND"` (tira a linha via `writeList`, sem `errorAlert`, sem restaurar o contador). |
| 9, hook | `apps/app/__tests__/useNotifications.test.tsx`: dois casos novos (linha some, `errorAlert` não chamado, contador `CACHED_COUNT - 1`; e a marca de lista velha se mantém). O caso "desfaz e avisa quando a API recusa" ficou intacto. |

## Contrato

Nenhuma mudança em `@repo/sdk`, rota, status ou `error.code`. `POST /notifications/read-all` continua devolvendo
`{ data: { updated } }`; numa corrida, `updated` passa a contar só o que foi gravado.

## Códigos de erro novos

Nenhum. `NOTIFICATION_NOT_FOUND` continua em `apiErrors` nos três idiomas, sem alteração.

## A premissa do código 5, medida

O plano tratava como hipótese que o lote do Admin SDK rejeita com gRPC 5 quando um documento some antes do commit.
O emulador confirma:

- com a correção, `JAVA_HOME=/opt/homebrew/opt/openjdk@21 ... pnpm --filter api exec node scripts/emulator-tests.mjs`
  passou com 12/12 arquivos e 284/284 testes; o caso novo afirma `firstCommitErrors[0]` com `code: 5`;
- sem a correção (catch trocado por `throw error`, restaurado depois), o mesmo comando falhou só no caso novo
  (283 passaram, 1 falhou) com `Error: 5 NOT_FOUND: no entity to update` e `Serialized Error: { code: 5, ... }`.

O predicado `isNotFoundError` do plano está certo; não precisou de ajuste.

As duas mutações também foram medidas nos testes baratos:

- repositório sem o `catch`: `npx vitest run __tests__/notificationRepository.test.ts` deu 1 falha em 16 (o caso da
  corrida); com o `catch`, 16/16;
- hook com o desvio desligado: `npx vitest run __tests__/useNotifications.test.tsx` deu 2 falhas em 24 (os dois
  casos novos); com o desvio, 24/24.

## Desvios em relação ao plano

1. **Sem a constante `NOTIFICATION_NOT_FOUND` no hook.** O blueprint 11.2 declarava
   `const NOTIFICATION_NOT_FOUND = "NOTIFICATION_NOT_FOUND"`, e o `pnpm check` recusou com
   `lint/style/noShoutyConstants` em `useNotificationActions.ts:25`. O código foi comparado em literal, como já faz
   `ConfirmEmailChangeResult.tsx:70-71`.
2. **Comentário no `onError` do hook**, em duas linhas: explica por que o contador não é restaurado (o servidor
   também não conta mais a notificação apagada). Não está no blueprint; entra na exceção de regra de negócio não
   dedutível do código.
3. **Limpeza no teste de emulador.** O plano pedia limpar "como o arquivo já faz", mas o caso existente não cria
   documento e o arquivo não tinha limpeza. Foi adicionado um `afterAll` que apaga os documentos do `userId` da
   execução.
4. **Um caso a mais no hook**, para a marca de lista velha que o plano cita na §6 ("preserva a marca de lista
   velha") sem teste próprio.

## Decisões em aberto

Nenhuma nova. A pergunta 1 do plano (sumir em silêncio ou mostrar aviso neutro) foi implementada como adotada:
some em silêncio.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| testes da api | `pnpm turbo run test typecheck --filter=api --filter=app` | 135 arquivos, 1966/1966 |
| testes da app | mesmo comando, repetido depois da correção de lint só com `--filter=app` | 155 arquivos, 1405/1405 |
| typecheck api e app | mesmo comando | sem erro; `Tasks: 10 successful, 10 total` na última rodada da app |
| `test:emulator` da api | comando do emulador acima | 12 arquivos, 284/284 |
| lint | `pnpm check` | exit 0, `Checked 1167 files`, sem erro |
| paridade de i18n | não rodado | nenhum arquivo de tradução mudou |

A primeira execução do turbo terminou com exit 1 em `api:test` mesmo com o resumo `135 passed / 1966 passed`, e o
turbo abortou as tarefas restantes (`11 successful, 14 total`). `pnpm run test` sozinho na `apps/api` deu exit 0, e
a segunda execução do mesmo comando turbo deu exit 0. A causa não foi identificada; o log dessa primeira execução
não foi guardado.

Sem smoke de browser: o diff não tem tela nova nem texto novo.

## A verificar no `/test`

- **Clique numa notificação expirada no sino**: a linha some, nenhum toast aparece e o contador desconta 1.
  Medido só no teste de hook, com `apiClient` mockado. Repro: com uma notificação não lida no sino, apagar o
  documento no emulador e clicar em "Marcar como lida" (ou no título, que também chama `markRead` antes de navegar).
- **"Marcar todas" contra a API de pé**: a rota responde 200 numa corrida real. Medido no repositório contra o
  emulador, não pela rota HTTP. Provocar a corrida pela rota exige apagar o documento entre a leitura e o commit,
  então o mais viável é aceitar a medição do repositório e conferir pela rota só o caminho sem corrida.
- **Exit 1 intermitente do `api:test` no turbo**: se reaparecer, guardar o log inteiro.

## Lacunas de teste conhecidas

- A rota `notifications/read-all/route.ts` não ganhou teste novo; o comportamento novo vive no repositório e a rota
  só repassa o número.
- Nenhum teste cobre mais de uma passada perdida seguida até o teto de `MARK_ALL_MAX_PASSES`.
