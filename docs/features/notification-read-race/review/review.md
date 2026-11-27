# Revisão: notification-read-race

Rodada autônoma do `/cycle`, sem perguntas ao usuário. Escopo: os 5 arquivos do plano (§11.3). O restante do
working tree é a feature `audit-log-levels` e artefatos de outras tarefas, fora desta revisão.

## Branch

- `feat/audit-log-levels`, reutilizada. O usuário pediu que toda a rodada da madrugada ficasse nessa branch, então
  nenhuma branch foi criada nem trocada.
- Regex de validação do nome: passou (`branch OK: feat/audit-log-levels`).
- A branch é de outra feature. Os commits desta tarefa entram depois dos commits da `audit-log-levels` e vão na
  mesma PR. Ver "Decisões em aberto".
- O índice já tinha 2 renomes (`git mv`) da auditoria de specs, que não são desta tarefa. A revisão não mexeu
  neles.

## Revisão: notification-read-race

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/app/shared/hooks/useNotificationActions.ts:160-161`: o comentário dizia "expired or was purged". Uma
  notificação só expirada (com `expiresAt` no passado, ainda não apagada pela TTL) continua sendo achada pelo
  `findById` da rota `notifications/[id]/read/route.ts:24` e é marcada como lida normalmente; o `404` só vem
  quando o documento foi apagado. **Corrigido**: o comentário agora diz "Deleted on the server (TTL or account
  purge)", o mesmo vocabulário do JSDoc de `markRead` no repositório (`notification.repository.ts:66-67`).

### ✅ OK

- **O comentário de 2 linhas no `onError` se justifica** pela regra de comentários (exceção 2, caso
  contraintuitivo): o ramo não restaura o contador, ao contrário do `restoreCache` logo abaixo, e quem lê sem o
  comentário vai achar que esqueceram. O repo já tem o mesmo padrão em `useUserCrud.tsx:118`. Não cita artefato
  do fluxo.
- `notification.repository.ts:84-88`: as duas linhas novas no JSDoc descrevem uma restrição externa (o lote do
  Firestore é atômico e cai inteiro com `NOT_FOUND`). Também é exceção legítima.
- `notification.repository.ts:107-114`: o `catch` só engole `isNotFoundError` (gRPC 5) e relança o resto; a
  passada perdida não soma em `updated`; o laço continua limitado por `MARK_ALL_MAX_PASSES`. Contrato da rota
  `read-all` inalterado (`{ data: { updated } }`).
- `useNotificationActions.ts:162-165`: o desvio compara o código com `apiErrorCodeOf`, como em
  `useUserCrud.tsx:119`. O SDK rejeita o erro do axios sem embrulhar (`packages/sdk/src/client/base.ts:82-90`),
  então `error.response.data.error.code` chega ao hook. A rota responde exatamente
  `{ error: { code: "NOTIFICATION_NOT_FOUND" } }` com 404 (`read/route.ts:10-14`).
- Literal em vez de constante: `const NOTIFICATION_NOT_FOUND = "NOTIFICATION_NOT_FOUND"` cai em
  `lint/style/noShoutyConstants`. O literal tem precedente em `ConfirmEmailChangeResult.tsx:70-71`.
- `withoutItem` usa `writeList`, que preserva a marca de lista velha (`:73-86`). Lista ausente no cache devolve
  `undefined`, e o `setQueryData` não grava nada.
- Contador: o `onMutate` só desconta quando a linha estava não lida e a contagem estava em `success`
  (`:142-147`). No `404` o desconto fica, e o servidor também já não conta o documento apagado.
- Autorização: nada mudou. Sob personificação o botão já vem desabilitado (`NotificationItem.tsx:69,120`).
- Testes no nível certo (§6 do checklist): Firestore falso para a lógica do repositório, um caso de emulador
  só para a premissa de infra (o lote real rejeita com código 5), hook com `apiClient` mockado. O falso ficou
  mais fiel: o `commit` agora rejeita com `NOT_FOUND` sem aplicar nada quando um id atualizado sumiu
  (`notificationRepository.test.ts:155-168`); os ganchos `beforeCommit` e `commitFailures` são zerados no
  `reset()`.
- Emulador: o espião troca só o primeiro `batch()` (`mockImplementationOnce`, `:68`), é restaurado no
  `finally`, e o `afterAll` (`:19-24`) apaga os documentos do `userId` da execução.
- Sem i18n, SDK, env ou infra novos.
- Artefatos em `docs/features/notification-read-race/` varridos por segredo (senha, token, chave, e-mail): nada
  encontrado.

### 👁 Verificar no `/test`

1. **Exit 1 intermitente do `api:test` no turbo.** O handoff relata uma execução de
   `pnpm turbo run test typecheck --filter=api --filter=app` que terminou com exit 1 em `api:test` mesmo com o
   resumo `135 passed / 1966 passed`, e uma segunda execução com exit 0. O log se perdeu e a causa não foi
   achada. Lendo o código não dá para atribuir isso ao diff: os casos novos aguardam toda promessa rejeitada, e
   o arquivo de emulador fica fora do `test` (`apps/api/vitest.config.*`, `exclude: **/*.emulator.test.ts`).
   A hipótese mais provável é um erro não tratado que o Vitest conta à parte ("Errors: N") e que derruba o
   exit code com todos os testes verdes, ou um worker que morreu sob carga paralela. Repro: rodar o mesmo
   comando 3 vezes seguidas guardando o log inteiro
   (`pnpm turbo run test --filter=api --filter=app --force 2>&1 | tee <scratch>/turbo-N.log`) e procurar
   `Unhandled`, `Errors`, `Worker exited` e `ELIFECYCLE`. Se reaparecer, anotar qual arquivo de teste aparece
   no erro.
2. **Premissa do código 5 no emulador.** O handoff mediu 284/284 com a correção e 1 falha sem ela. Repro:
   `pnpm --filter api test:emulator` (exige JDK 21) e conferir que o caso
   "rejects a batch whose document vanished..." passa.
3. **Notificação apagada no sino.** Medido só no teste de hook com `apiClient` mockado. Repro: com uma
   notificação não lida no sino, apagar o documento no emulador e clicar em "Marcar como lida" (e, numa segunda
   rodada, no título, que chama `markRead` antes de navegar). Esperado: a linha some, nenhum toast, contador
   com 1 a menos. Um tema e um idioma bastam, porque não há texto novo.
4. **"Marcar todas" pela rota HTTP.** A corrida só foi medida no repositório. Repro viável: conferir pela rota
   o caminho sem corrida (`POST /notifications/read-all` responde 200 com `updated` igual ao número de não
   lidas) e aceitar a medição do repositório para a corrida.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `apps/app/shared/hooks/useNotificationActions.ts:160-161` | Comentário do `onError` reescrito: "Deleted on the server (TTL or account purge): it no longer counts as unread there either, so the optimistic count discount stays." Antes falava em "expired", o que não produz `404`. Sem mudança de comportamento. |

## Raio de impacto

- `notificationRepository.markAllReadByUserId`: único chamador é `apps/api/app/(routes)/notifications/read-all/route.ts`,
  que só repassa o número. Nenhuma assinatura pública mudou.
- `useNotificationActions`: assinatura e retorno iguais. O comportamento só muda no `onError` do `markRead`
  quando o código é `NOTIFICATION_NOT_FOUND`.
- Nenhuma mudança em `packages/sdk`, `packages/design-system` ou `@repo/internationalization`.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| A rota `notifications/read-all/route.ts` não ganhou teste novo | Fora de escopo. A rota não mudou e só repassa o número; um caso novo seria redundante (§6 do checklist). |
| Nenhum teste cobre várias passadas perdidas seguidas até o teto de `MARK_ALL_MAX_PASSES` | Continua aberta, de baixo valor. O laço é o mesmo de antes e a passada perdida segue o mesmo caminho da vazia. Não pede teste nesta tarefa. |

## Decisões em aberto

1. **Branch compartilhada com a `audit-log-levels`.** Seguindo o pedido do usuário, os 3 commits desta tarefa vão
   para `feat/audit-log-levels`, depois dos commits daquela feature, e sobem na mesma PR. Recomendação: aceitar
   como está. Se o usuário preferir PRs separadas, a alternativa é criar `api/fix/notification-read-race` a
   partir de `main` e levar só estes 5 arquivos (mais o artefato), já que nenhum deles é tocado pela
   `audit-log-levels`.

## Gates estáticos

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | `Checked 1167 files`, sem erro. Depois da correção, `biome check` no arquivo editado: sem erro. |
| typecheck | `pnpm turbo run typecheck --filter=api --filter=app` | 2/2, do cache. A correção só mexeu em comentário. |
| paridade de i18n | não rodado | nenhum arquivo de tradução no diff |
| testes | não rodados aqui | são do `/test`; os números do handoff estão na seção de validação dele |

## Plano de commits

Entram depois dos commits da `audit-log-levels`, na branch `feat/audit-log-levels`. Antes do primeiro, o índice
tem de sair vazio (`git diff --cached --stat`); hoje ele carrega 2 renomes da auditoria de specs, que pertencem a
outro commit.

1. `fix(api): finish mark-all-read when a notification disappears mid-batch`
   - `apps/api/(shared)/repositories/notification.repository.ts`
   - `apps/api/__tests__/notificationRepository.test.ts`
   - `apps/api/__tests__/notificationMarkRead.emulator.test.ts`
2. `fix(app): drop a deleted notification from the bell without an error toast`
   - `apps/app/shared/hooks/useNotificationActions.ts`
   - `apps/app/__tests__/useNotifications.test.tsx`
3. `docs(features): notification-read-race`
   - `docs/features/notification-read-race/STATE.md`
   - `docs/features/notification-read-race/analyze/plan.md`
   - `docs/features/notification-read-race/develop/handoff.md`
   - `docs/features/notification-read-race/review/review.md`
   - `docs/features/notification-read-race/test/` (o que o `/test` gravar, depois da varredura de segredo)

Commits realizados: _(preenchido pelo orquestrador)_
