# Handoff do develop: markRead contra notificação apagada

Só `apps/api`. Sem mudança em `packages/sdk`, `packages/internationalization` nem `apps/app`.

## Blueprint → arquivos

| item do blueprint | arquivo | mudança |
|-------------------|---------|---------|
| helper de NOT_FOUND | `apps/api/(shared)/infra/firestore-errors.ts` | `NOT_FOUND = 5` e `isNotFoundError`, no molde de `isAlreadyExistsError` |
| `markRead` absorve o NOT_FOUND | `apps/api/(shared)/repositories/notification.repository.ts` | `try/catch` em volta do `update`; NOT_FOUND → `null`, qualquer outro erro é relançado; retorno passa a `Promise<string \| null>` |
| rota traduz `null` em 404 | `apps/api/app/(routes)/notifications/[id]/read/route.ts` | `if (readAt === null) return notFound();` |
| teste de rota | `apps/api/__tests__/notificationsRoute.test.ts` | caso novo: `findById` devolve não lida, `markRead` resolve `null` → `404 NOTIFICATION_NOT_FOUND` |
| teste de repositório | `apps/api/__tests__/notificationRepository.test.ts` | `update` do fake rejeita com `{ code: 5 }`; casos novos: id ausente → `null` sem criar documento; rejeição com `code: 7` propaga |
| teste do helper | `apps/api/__tests__/firestoreErrors.test.ts` (novo) | aceita `{ code: 5 }`; recusa `null`, `undefined`, `{}`, `{ code: 6 }`, `{ code: 7 }`, `{ code: "5" }` |
| emulador | `apps/api/__tests__/notificationMarkRead.emulator.test.ts` (novo) | `update` real em documento inexistente rejeita com `code === 5`; `markRead` devolve `null`; `get()` depois confirma `exists === false` |

## Helper: reusado ou criado

Procurei um equivalente antes de criar. Não existe nenhum teste de `code === 5` nem de `"not-found"` em
`apps/api` ou `packages`. O `isMissingIndexError` de `apps/api/(shared)/lib/pagination.ts` trata outro
status (FAILED_PRECONDITION, `9` ou `"failed-precondition"`) e casa também pela mensagem, então não serve
para este caso. O lugar natural é `infra/firestore-errors.ts`, ao lado de `isAlreadyExistsError`, que já é
importado por cinco repositórios. Criei `isNotFoundError` lá, sem duplicar nada.

O helper aceita só o código numérico. O teste de emulador mede que o Admin SDK rejeita o `update` com
`code: 5` (erro serializado: `5 NOT_FOUND: no entity to update`). A forma em texto `"not-found"` é do SDK
cliente, que a API não usa.

## Contrato

Nenhum DTO nem action mudou. `notificationRepository.markRead` agora devolve `string | null`; o único
chamador é a rota `POST /notifications/[id]/read` (conferido com `grep -rn "\.markRead(" apps/api packages/sdk/src`).

## Códigos de erro

Nenhum novo. `NOTIFICATION_NOT_FOUND` já existe em `apiErrors` nos 3 idiomas.

## Desvios em relação ao plano

- O teste do helper foi para um arquivo próprio (`firestoreErrors.test.ts`) em vez de ficar dentro de
  `notificationRepository.test.ts`. Assim, enquanto o helper não existia, a falha de import não derrubava
  os demais casos do repositório, e a medição de reprovação ficou legível caso a caso.
- No teste de repositório, a rejeição "que não é NOT_FOUND" usa `code: 7` (PERMISSION_DENIED), como o plano
  sugeria; está em uma constante `PERMISSION_DENIED`.

## Reprovação contra o código anterior

Testes escritos antes da correção e rodados contra o código sem mudança:

- `NODE_ENV=test npx vitest run __tests__/notificationRepository.test.ts __tests__/notificationsRoute.test.ts __tests__/firestoreErrors.test.ts`
  → `9 failed | 32 passed`. Falharam os 7 do helper (função inexistente), o caso de rota
  (`expected 200 to be 404`: sem a correção a rota devolvia `200 { readAt: null }` quando o mock resolvia
  `null`) e o de repositório (`promise rejected "Error: no document { code: 5 }" instead of resolving`).
  O caso `code: 7` passou já no código antigo, como esperado: ele protege contra absorver erro demais.
- Emulador, só o arquivo novo, via `firebase emulators:exec --only firestore,storage --project demo-next-boilerplate 'npx vitest run --config vitest.emulator.config.mts __tests__/notificationMarkRead.emulator.test.ts'`
  → `1 failed`, com `promise rejected "Error: 5 NOT_FOUND: no entity to update"`. A primeira asserção
  (o `update` cru rejeita com `code: 5`) passou; a do `markRead` falhou.

## Efeito do fake alterado

O `fakeDb` é local a `notificationRepository.test.ts` (`vi.hoisted`), não é compartilhado. Mesmo assim rodei
a suíte inteira da api depois da mudança: `132 files, 1890 tests passed`.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| testes api | `pnpm --filter api test` | 132 arquivos, 1890 testes, todos passando |
| emulador | `JAVA_HOME=/opt/homebrew/opt/openjdk@21 pnpm --filter api test:emulator` | 11 arquivos, 281 testes, todos passando (portas 8080/9099/9199 livres antes e depois; o script subiu e derrubou os próprios emuladores) |
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| lint | `pnpm check` | `Checked 1159 files`, sem correções |

Nenhum gate rodou com `--force`.

## A verificar no `/test`

- Nada de UI. O diff não tem superfície de navegador e a corrida não se reproduz clicando. O `/test` roda
  `pnpm --filter api test` e `pnpm --filter api test:emulator`.
- A corrida em si (documento apagado pela TTL entre `findById` e `update`) não foi reproduzida ponta a
  ponta numa requisição HTTP. O que está medido são as duas metades: a rota com `markRead` resolvendo
  `null` e o `markRead` contra o emulador.

## Decisões em aberto

As três perguntas do plano seguem com a recomendação default adotada:

1. Toast de `NOTIFICATION_NOT_FOUND` no app: não mexido.
2. `markAllReadByUserId` com documento sumindo no meio do lote: fora desta tarefa, candidato a achado no
   `AUDIT.md`.
3. Caso de emulador: mantido, um só. Ele confirmou que o driver usa o código numérico `5`.

## Lacunas de teste conhecidas

- Sem teste de integração HTTP que dispare a corrida real; ver acima.
