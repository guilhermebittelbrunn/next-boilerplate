# Plano: `markRead` contra notificação apagada

Origem: achado de `specs/reference/AUDIT.md:352` (lista de pendências pequenas) e `:1319` (tabela da
auditoria de `in-app-notifications`, vindo do `/review` daquela tarefa). Tarefa direta, sem spec e sem
card. Toca só `apps/api`.

## 1. Contexto e problema

`POST /notifications/[id]/read` (`apps/api/app/(routes)/notifications/[id]/read/route.ts:16-34`) faz duas
leituras/escritas separadas:

1. `notificationRepository.findById(id)` (`:24`). Se o documento não existe, está com `deletedAt`
   preenchido (`base.repository.ts:151-157`) ou pertence a outro perfil (`:25`), a rota já responde
   `404 NOTIFICATION_NOT_FOUND` sem gravar nada. Esses três casos estão cobertos em
   `apps/api/__tests__/notificationsRoute.test.ts:254-280`.
2. Se a notificação ainda não foi lida, chama `notificationRepository.markRead(id)` (`:29-30`), que faz
   `doc(id).update({ readAt, updatedAt })` (`notification.repository.ts:63-68`).

O defeito está entre os passos 1 e 2. O `update` do Firestore Admin rejeita com gRPC `NOT_FOUND`
(código numérico `5`) quando o documento não existe. Nada captura esse erro: nem o repositório nem a
rota. Se a TTL (`expiresAt`, 90 dias, `apps/api/(shared)/lib/notifications.ts:8`) ou o expurgo da conta
(`purgeAllByUserId`, `notification.repository.ts:152-154`) apagar o documento nessa janela, a requisição
termina em 500.

Respostas às hipóteses levantadas na tarefa:

| hipótese | o que o código faz |
|----------|--------------------|
| `update` lança NOT_FOUND e vira 500 | Sim, só na corrida entre `findById` e `update`. Lido, não medido: a janela é de milissegundos e não há como reproduzir sem injetar o erro. |
| cria documento fantasma (`set merge`) | Não. `markRead` usa `update`, que nunca cria. |
| responde 200 mentindo | Não. O 200 só sai depois do `update` resolver. |
| notificação de outro dono | Já responde 404 `NOTIFICATION_NOT_FOUND`, sem revelar a existência. É o padrão vigente; não muda. |
| id já apagado antes do clique | Já responde 404 pelo `findById`. Não muda. |

Conclusão: o achado procede, mas a superfície é estreita. Corrigir custa pouco e alinha a corrida com o
404 que a rota já devolve para o documento ausente.

## 2. Objetivo, corte de MVP e fora de escopo

**Objetivo:** a corrida responde `404 NOTIFICATION_NOT_FOUND`, igual ao caso em que o documento já não
existia no `findById`.

**Corte de MVP:** capturar o NOT_FOUND do `update` dentro de `markRead`, devolver `null` e fazer a rota
traduzir `null` em 404.

**Fora de escopo:**

- Transação (`runTransaction`) para fundir leitura e escrita. Resolve a mesma corrida com mais código e
  mais custo por chamada; o 404 depois do fato já basta.
- `markAllReadByUserId` (`notification.repository.ts:72-95`). Ele lê os documentos e grava em lote; o
  `batch.update` de um documento apagado no meio também falharia, mas o lote é de outro fluxo e a janela
  é a mesma. Fica como achado de backlog, não entra aqui.
- Mudar o tratamento no app. Ver §6.
- O `BaseRepository.update` genérico (`base.repository.ts:209-221`) tem o mesmo comportamento para todo
  recurso. Mexer nele muda o contrato de todos os repositórios; está fora da tarefa.

## 3. Apps impactados

| app | impacto |
|-----|---------|
| `apps/api` | repositório de notificação, helper de erro do Firestore, rota `read` e testes |
| `apps/app` | nenhum |
| `apps/web` | nenhum |
| `packages/*` | nenhum. `NOTIFICATION_NOT_FOUND` já existe em `apiErrors` nos 3 idiomas (`packages/internationalization/translations/packages/shared/utils.ts:158`, `:343`, `:537`) |

Área do painel: comum. Modo de produto: indiferente. Sem dependência de plano.

## 4. Dados (Firestore)

Coleção `notification`, sem campo novo e sem índice novo. Nenhuma escrita passa a criar documento.

## 5. Contrato `@repo/sdk`

Sem mudança. A action `notification.markRead` (`packages/sdk/src/actions/notification/action.ts`) já
recebe 404 nos casos atuais.

## 6. Front

Sem mudança. `useNotificationActions` (`apps/app/shared/hooks/useNotificationActions.ts:110-144`) já
trata qualquer erro do `markRead`: restaura o cache otimista e mostra `errorAlert` com o texto de
`NOTIFICATION_NOT_FOUND` (`:93-108`). A corrida passa a cair exatamente nesse caminho, que é o mesmo do
documento ausente de hoje. Antes da correção, o 500 mostrava o texto genérico de erro.

Silenciar o toast para `NOTIFICATION_NOT_FOUND` seria uma mudança de comportamento também para o caso que
já existe (notificação expirada com a lista aberta). Não entra; vai para Perguntas em aberto.

## 7. Autorização e segurança

Sem mudança. Guard `requireCommonPanelApi`, ownership por `row.userId !== ctx.subjectProfile.id`
(`route.ts:25`) e o bloqueio de escrita sob impersonação continuam como estão
(`notificationsRouteImpersonation.test.ts`). A resposta da corrida usa o mesmo `error.code` do id
inexistente, então não vaza nada a mais.

## 8. Testes

| nível | arquivo | o que prova |
|-------|---------|-------------|
| unitário (rota, `vi.mock` do repositório) | `apps/api/__tests__/notificationsRoute.test.ts` | `findById` devolve a notificação não lida, `markRead` resolve `null` → `404 NOTIFICATION_NOT_FOUND` |
| unitário (repositório, `fakeDb`) | `apps/api/__tests__/notificationRepository.test.ts` | `markRead` em id ausente resolve `null`; uma falha com outro código (ex.: `7`) continua propagando |
| unitário (helper) | junto do teste do repositório | `isNotFoundError` aceita `{ code: 5 }` e recusa `null`, `{}`, `{ code: 6 }` |
| emulador (1 caso) | `apps/api/__tests__/notificationMarkRead.emulator.test.ts` (novo) | o `update` real do Firestore contra documento inexistente rejeita com `code === 5`, e `markRead` devolve `null` sem criar documento |

O fake de `notificationRepository.test.ts:107-114` rejeita com `new Error("no document")`, sem `code`. Ele
precisa passar a rejeitar com `{ code: 5 }`, senão o teste unitário só prova que o helper casa com um
valor que o próprio teste inventou. O caso de emulador é o único que prova que o driver real usa o código
numérico `5`, e não a string `"not-found"` (o helper de índice em `apps/api/(shared)/lib/pagination.ts:74`
aceita as duas formas para `FAILED_PRECONDITION`). Ele roda no `test:emulator` (exige JDK 21) e segue o
molde de `userProfileInstants.emulator.test.ts` (`getFirestoreAdmin`, ids com `randomUUID`, limpeza no
`afterAll`).

O `/test` **não abre browser**: o diff não tem superfície de UI e a corrida não é reproduzível clicando.
Ele roda `pnpm --filter api test` e `pnpm --filter api test:emulator`.

## 9. Critérios de aceite (§9.1)

# Critérios de Aceite (Checklist)

- [ ] **Corrida entre leitura e escrita responde 404**
  Quando `findById` encontra a notificação não lida do dono e o documento some antes do `update`, a rota
  `POST /notifications/[id]/read` responde `404` com `{ error: { code: "NOTIFICATION_NOT_FOUND" } }`, nunca
  500. Provado pelo teste de rota com `markRead` resolvendo `null`.

- [ ] **`markRead` não cria documento**
  Chamado com um id que não existe no Firestore, `markRead` resolve `null` e a coleção continua sem aquele
  id. Provado no emulador, lendo o documento depois da chamada (`exists === false`).

- [ ] **Só o NOT_FOUND é absorvido**
  Qualquer outra rejeição do `update` (permissão, indisponibilidade, código diferente de `5`) continua
  propagando e resulta em 500, como hoje. Provado no teste do repositório com uma rejeição de código `7`.

- [ ] **Comportamentos atuais preservados**
  Id inexistente no `findById`, notificação de outro dono, id inutilizável e notificação já lida mantêm as
  respostas cobertas em `notificationsRoute.test.ts:254-321`, sem alterar as asserções existentes. O caso
  feliz continua devolvendo `{ data: { id, readAt } }` com o mesmo instante gravado em `readAt` e
  `updatedAt`.

- [ ] **Sem mudança de contrato nem de i18n**
  O diff não toca `packages/sdk`, `packages/internationalization` nem `apps/app`. O `error.code` usado já
  existe em `apiErrors` nos 3 idiomas.

## 10. Blueprint

### Contrato e rota

Sem contrato novo. Tabela de respostas de `POST /notifications/[id]/read` depois da mudança:

| situação | status | corpo |
|----------|--------|-------|
| dono, não lida | 200 | `{ "data": { "id": "n1", "readAt": "2026-11-26T08:00:00.000Z" } }` |
| dono, já lida | 200 | `readAt` original, sem gravar |
| id inutilizável, ausente, soft-deleted ou de outro dono | 404 | `{ "error": { "code": "NOTIFICATION_NOT_FOUND" } }` |
| apagada entre `findById` e `update` | 404 (era 500) | `{ "error": { "code": "NOTIFICATION_NOT_FOUND" } }` |

### Pseudo-diffs

`apps/api/(shared)/infra/firestore-errors.ts`

```ts
 /** gRPC ALREADY_EXISTS, the status Firestore uses when `create()` hits a taken id. */
 const ALREADY_EXISTS = 6;
+const NOT_FOUND = 5;

 export function isAlreadyExistsError(error: unknown): boolean {
     return (error as { code?: unknown } | null)?.code === ALREADY_EXISTS;
 }
+
+export function isNotFoundError(error: unknown): boolean {
+    return (error as { code?: unknown } | null)?.code === NOT_FOUND;
+}
```

(O comentário JSDoc de uma linha sobre o `update` segue a forma do `ALREADY_EXISTS`; é opcional, a regra
de comentários vale.)

`apps/api/(shared)/repositories/notification.repository.ts`

```ts
-import { isAlreadyExistsError } from "../infra/firestore-errors";
+import { isAlreadyExistsError, isNotFoundError } from "../infra/firestore-errors";

-    /** Both fields get the same instant, which is also what the caller hands back. */
-    async markRead(id: string, at: Date = new Date()): Promise<string> {
-        await this.db
-            .collection(this.table)
-            .doc(id)
-            .update({ readAt: at, updatedAt: at });
-        return at.toISOString();
-    }
+    /**
+     * Both fields get the same instant, which is also what the caller hands back. `null` means
+     * the document was gone by the time of the write (TTL or account purge).
+     */
+    async markRead(id: string, at: Date = new Date()): Promise<string | null> {
+        try {
+            await this.db
+                .collection(this.table)
+                .doc(id)
+                .update({ readAt: at, updatedAt: at });
+        } catch (error) {
+            if (isNotFoundError(error)) {
+                return null;
+            }
+            throw error;
+        }
+        return at.toISOString();
+    }
```

`apps/api/app/(routes)/notifications/[id]/read/route.ts`

```ts
         const readAt =
             row.readAt ?? (await notificationRepository.markRead(id));
+        if (readAt === null) {
+            return notFound();
+        }

         return Response.json({ data: { id, readAt } });
```

`apps/api/__tests__/notificationRepository.test.ts`: o `update` do fake passa a rejeitar com
`Object.assign(new Error("no document"), { code: 5 })`, seguindo o `create` do mesmo fake (`:116-124`).

### Ordem de implementação e commit

Um commit só, na `api`: `fix(api): answer 404 when a notification disappears before markRead`, com helper,
repositório, rota e os testes. O artefato `docs/features/notification-markread-missing/` entra depois como
`docs(features): notification-markread-missing`.

### Env/config

Nenhuma.

## 11. Estado do working tree

O working tree tem várias tarefas em andamento. Nenhum dos arquivos alvo aparece no `git status`:
`notification.repository.ts`, `firestore-errors.ts`, `notifications/[id]/read/route.ts`,
`notificationsRoute.test.ts` e `notificationRepository.test.ts` estão limpos. `base.repository.ts` está
modificado pela tarefa `base-repository-id-precedence`, que só inverte a ordem do spread de `id` em
`toEntity`/`toDTO`/`create` (`base.repository.ts:66-80`, `:183-185`). O `findById` usado pela rota não
muda de comportamento para notificações, porque o documento não guarda campo `id`. Sem conflito.
`apps/api/__tests__/welcomeNotification.test.ts` também está modificado, por outra tarefa, e não é tocado
aqui.

## Perguntas em aberto

1. **Silenciar o toast de `NOTIFICATION_NOT_FOUND` no `markRead`?** Hoje o app mostra "Notificação não
   encontrada." e desfaz a marcação otimista. Para quem clicou numa notificação que expirou, isso é ruído.
   Recomendação default: não mexer nesta tarefa (o achado é só `apps/api`); registrar como item de backlog
   do app, junto de remover o item da lista quando o código for esse.
2. **Aplicar o mesmo tratamento ao `markAllReadByUserId`?** O `batch.update` também falha se um documento
   do lote sumir entre a consulta e o commit. Recomendação default: fora desta tarefa, vira achado no
   `AUDIT.md` no `/spec --sync`.
3. **Manter o caso de emulador?** Ele exige JDK 21 e só prova a forma do código de erro do driver.
   Recomendação default: manter, um caso só, porque é a única prova de que o helper casa com o erro real.
