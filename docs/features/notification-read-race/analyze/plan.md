# Plano: corrida no "marcar todas como lidas" e aviso de notificação expirada

Tarefa direta, sem spec. Origem: `specs/reference/AUDIT.md`, "Tarefas diretas candidatas" (`:346-347`), com os
achados em "Achados das tarefas diretas da madrugada" (`:1938-1939`) e o veredito "continua aberto" da PR #76
(`:1974-1975`). Plano feito em rodada autônoma do `/cycle`; as decisões tomadas sem perguntar estão na §12.

## 0. Os dois achados procedem?

Sim, os dois, conferidos no working tree em 2026-11-27. Nenhum dos arquivos envolvidos aparece no `git status`
da feature `audit-log-levels`, que está no mesmo working tree.

**Achado 1: `markAllReadByUserId` falha inteiro se uma notificação some.**
`apps/api/(shared)/repositories/notification.repository.ts:85-108`. Cada passada lê até 500 não lidas
(`:92-94`), monta um lote com um `batch.update` por documento (`:99-102`) e chama `batch.commit()` (`:103`) sem
`try`. O `update` do Firestore exige o documento existente; num lote, um documento ausente faz o commit inteiro
falhar com gRPC `NOT_FOUND` (código 5) e nada é gravado. Entre a leitura e o commit, a TTL em `expiresAt` ou o
expurgo da conta podem apagar um documento. O erro sobe até a rota `notifications/read-all/route.ts:6-22`, que só
trata `isMissingIndexError` (`:14`) e relança o resto: a pessoa recebe 500 e nenhuma notificação fica lida.

O `markRead` individual já trata o mesmo caso (`notification.repository.ts:69-82`, com `isNotFoundError` de
`(shared)/infra/firestore-errors.ts:10-12`), entregue pela tarefa `notification-markread-missing`.

**Achado 2: aviso de erro para notificação expirada.**
`apps/app/shared/hooks/useNotificationActions.ts:93-108`. O `restoreCache` desfaz o otimismo e chama
`errorAlert` para qualquer erro (`:107`), e o `onError` do `markRead` (`:143`) passa por ele sem olhar o código.
Desde a tarefa `notification-markread-missing`, a rota responde `404 NOTIFICATION_NOT_FOUND` quando a notificação
não existe mais (`notifications/[id]/read/route.ts:24-33`). A pessoa que clica numa notificação expirada vê
"Notificação não encontrada." (`translations/packages/shared/utils.ts:158`) e a linha volta a aparecer como não
lida, apontando para algo que não existe. O clique no título também chama `markRead` antes de navegar
(`NotificationItem.tsx:68-73`), então o aviso aparece já na página de destino.

## 1. Contexto, objetivo e fora de escopo

Objetivo: as duas ações de leitura do sino toleram notificação apagada pelo servidor. "Marcar todas" termina e
marca o que ainda existe. "Marcar como lida" numa notificação que sumiu tira a linha da lista, sem aviso.

Corte de MVP: as duas correções, cada uma com teste no nível mais barato. É o corte inteiro.

Fora de escopo:
- reler a lista ou a contagem depois do `404` (a contagem se corrige no próximo intervalo de 120 s);
- tratar `NOTIFICATION_NOT_FOUND` no `markAllRead` (a rota não responde esse código);
- os outros achados da mesma seção do `AUDIT.md`;
- atualizar as âncoras de linha no `AUDIT.md`, que é do `/spec --sync`.

## 2. Apps impactados

| área | impacto |
|------|---------|
| `apps/api` | repositório de notificação; sem rota nova, sem mudança de contrato |
| `apps/app` | um hook compartilhado do sino (área comum) |
| `packages/sdk` | N/A |
| `packages/internationalization` | N/A, nenhuma chave nova nem removida (`NOTIFICATION_NOT_FOUND` continua servindo ao caso genérico do `FormattedError`) |
| `apps/web` | N/A |

Modo de produto: independe de `subscription`/`simple`. Sem dependência de plano.

## 3. Dados (Firestore)

Sem campo novo nem índice novo. A consulta de `markAllReadByUserId` continua a mesma (`userId ==` e
`readAt == null`, sem `orderBy`), então nada muda no `firestore.indexes.json`.

## 4. Contrato `@repo/sdk`

N/A. `POST /notifications/read-all` continua respondendo `{ data: { updated } }`; `updated` passa a contar só o
que de fato foi gravado.

## 5. API

Mudança só no repositório. Em `markAllReadByUserId`, o `batch.commit()` ganha `try/catch`: se o erro for
`isNotFoundError`, a passada não soma nada e o laço segue para a próxima, que relê a consulta. Como o lote é
atômico, nada foi gravado, e a releitura já não traz o documento apagado. Qualquer outro erro é relançado. O teto
de `MARK_ALL_MAX_PASSES` (`:25`) continua limitando o laço; uma passada perdida conta para ele.

Sem código de erro novo, sem mudança de status, sem mudança no guard.

## 6. Front

Só `useNotificationActions.ts`. No `onError` do `markRead`:
- se `apiErrorCodeOf(error) === "NOTIFICATION_NOT_FOUND"` (helper já existente em
  `apps/app/shared/lib/apiErrorCode.ts:2-9`, usado em `useUserCrud.tsx:119` e `ResetPasswordForm.tsx:51`):
  remove a linha de todas as páginas do cache da lista via `writeList` (preserva a marca de lista velha) e não
  chama `errorAlert`. O contador fica como o `onMutate` deixou: se a notificação estava não lida, o desconto de 1
  está certo, porque o servidor também não a conta mais;
- qualquer outro erro continua indo para `restoreCache`, sem mudança.

`markAllRead` não muda.

## 7. i18n

N/A.

## 8. Autorização e segurança

Nada muda. A rota de `read` responde `404` também quando a notificação é de outra pessoa
(`read/route.ts:25-26`); sob personificação o efeito na tela é o mesmo (a linha some), o que é correto, porque a
linha não pertence ao alvo. O `readOnly` da personificação já desabilita o botão (`NotificationItem.tsx:117`).

## 9. Testes

| nível | arquivo | o que prova |
|-------|---------|-------------|
| repositório, Firestore falso | `apps/api/__tests__/notificationRepository.test.ts` | com três não lidas e uma apagada entre a leitura e o commit da primeira passada, `markAllReadByUserId` resolve com 2, as duas restantes ficam lidas e a contagem dá 0 |
| repositório, Firestore falso | mesmo arquivo | um erro de commit que não é `NOT_FOUND` (ex.: `PERMISSION_DENIED`, código 7) continua sendo relançado |
| emulador | `apps/api/__tests__/notificationMarkRead.emulator.test.ts` | um caso: no emulador real, `markAllReadByUserId` termina quando um documento do lote some antes do commit. Prova o que o falso não prova: que o lote do Admin SDK rejeita com código 5 nesse caso, que é a premissa da correção |
| hook | `apps/app/__tests__/useNotifications.test.tsx` | `markRead` com erro `{ response: { data: { error: { code: "NOTIFICATION_NOT_FOUND" } } } }`: a linha some do cache, `errorAlert` não é chamado, o contador fica com o desconto |
| hook | mesmo arquivo | o caso existente "desfaz e avisa quando a API recusa" (`:425-438`) continua passando sem mudança, e cobre o erro genérico |

O Firestore falso precisa ficar fiel nesse ponto: hoje o `update` do lote (`notificationRepository.test.ts:142-146`)
recria o documento ausente. Ele passa a registrar o id, e o `commit` rejeita com `{ code: NOT_FOUND }` sem aplicar
nenhuma operação se algum id não estiver mais no `store`. Os testes atuais não dependem do comportamento antigo.

Para o caso do emulador, como provocar a remoção no meio: semear três documentos com o prefixo da execução,
espiar `getFirestoreAdmin().batch` (ou envolver o `commit` do primeiro lote) para apagar um documento antes de
delegar ao commit original, e conferir o resultado e o estado final. Limpar pelo prefixo no fim, como o arquivo
já faz.

## 10. O que o `/test` vai percorrer

Diff sem superfície visual nova. O comportamento é de rede e cache, então a prova principal são os testes acima.
Se o `/test` quiser uma passada no browser: com uma notificação não lida no sino, apagar o documento no emulador
e clicar em "Marcar como lida"; esperado: a linha some, nenhum toast, o contador desconta 1. Um tema e um idioma
bastam, porque não há texto novo.

## 11. Blueprint

### 11.1 Repositório (`apps/api/(shared)/repositories/notification.repository.ts`)

```diff
     /** Re-runs the query after each batch, so no `orderBy` (and no extra index) is needed. */
     async markAllReadByUserId(userId: string, at: Date = new Date()): Promise<number> {
         let updated = 0;
         for (let pass = 0; pass < MARK_ALL_MAX_PASSES; pass++) {
             const snapshot = await this.unreadQuery(userId).limit(UNREAD_BATCH_SIZE).get();
             if (snapshot.empty) {
                 return updated;
             }
             const batch = this.db.batch();
             for (const docSnap of snapshot.docs) {
                 batch.update(docSnap.ref, { readAt: at, updatedAt: at });
             }
-            await batch.commit();
-            updated += snapshot.docs.length;
+            try {
+                await batch.commit();
+                updated += snapshot.docs.length;
+            } catch (error) {
+                if (!isNotFoundError(error)) {
+                    throw error;
+                }
+            }
         }
         return updated;
     }
```

Um comentário curto é legítimo aqui (restrição externa): o lote é atômico e um documento apagado pela TTL entre
a leitura e a escrita derruba o lote inteiro; a próxima passada relê sem ele. Pode ir no JSDoc já existente do
método.

### 11.2 Hook (`apps/app/shared/hooks/useNotificationActions.ts`)

```diff
+import { apiErrorCodeOf } from "@/shared/lib/apiErrorCode";
+
+const NOTIFICATION_NOT_FOUND = "NOTIFICATION_NOT_FOUND";
+
+function withoutItem(list: NotificationListPages | undefined, id: string) {
+    return list && {
+        ...list,
+        pages: list.pages.map((page) => ({
+            ...page,
+            items: page.items.filter((item) => item.id !== id),
+        })),
+    };
+}
 ...
-        onError: (error, _id, context) => restoreCache(error, context),
+        onError: (error, id, context) => {
+            if (apiErrorCodeOf(error) === NOTIFICATION_NOT_FOUND) {
+                writeList((old) => withoutItem(old, id));
+                return;
+            }
+            restoreCache(error, context);
+        },
```

### 11.3 Arquivos tocados (lista exata)

1. `apps/api/(shared)/repositories/notification.repository.ts`
2. `apps/api/__tests__/notificationRepository.test.ts`
3. `apps/api/__tests__/notificationMarkRead.emulator.test.ts`
4. `apps/app/shared/hooks/useNotificationActions.ts`
5. `apps/app/__tests__/useNotifications.test.tsx`

Nenhum deles está modificado pela feature `audit-log-levels` no working tree.

### 11.4 Ordem de implementação e commits sugeridos

1. `fix(api): finish mark-all-read when a notification disappears mid-batch` (arquivos 1 a 3)
2. `fix(app): drop an expired notification from the bell without an error toast` (arquivos 4 e 5)
3. `docs(features): notification-read-race` (artefatos, por último)

Env nova: nenhuma. Pré-requisito manual de infra: nenhum.

## 12. Decisões tomadas sem perguntar

| # | decisão adotada | alternativa descartada | por quê |
|---|-----------------|------------------------|---------|
| 1 | `catch` do `NOT_FOUND` no `commit` e nova passada | gravar um a um com `update` individual e `catch` por documento | até 500 escritas por passada em vez de uma; muda custo e latência para cobrir uma janela de milissegundos |
| 2 | mesma abordagem | `set(..., { merge: true })` no lote | recriaria o documento apagado só com `readAt`/`updatedAt`, desfazendo a TTL e o expurgo |
| 3 | mesma abordagem | transação | lê e escreve 500 documentos com contenção; não traz nada que a releitura não traga |
| 4 | no `404`, tirar a linha da lista | restaurar o cache e invalidar lista e contagem | relê a rede por uma notificação; a linha já se sabe inexistente |
| 5 | no `404`, manter o desconto do contador | restaurar o contador anterior | o servidor também não conta mais a notificação apagada; restaurar mostraria um número maior que o real até a próxima contagem |
| 6 | comparar o código com `apiErrorCodeOf` | olhar `FormattedError.status === 404` | o padrão do repo para desviar por erro é o código (`useUserCrud.tsx:119`); status é ambíguo |
| 7 | manter `NOTIFICATION_NOT_FOUND` em `apiErrors` | remover a chave | o `FormattedError` ainda pode encontrá-la em outro chamador; remover mexe em i18n sem ganho |
| 8 | um caso no teste de emulador | só o Firestore falso | a correção depende de o lote real rejeitar com código 5; o falso só repete a suposição. O arquivo e o job `test:emulator` já existem |

## 13. Perguntas em aberto

Nenhuma bloqueia o `/develop`. Uma para registro:

1. A notificação expirada deve sumir em silêncio ou mostrar um aviso neutro ("Esta notificação não está mais
   disponível")? **Adotado:** sumir em silêncio, como o achado sugere ("a lista simplesmente se atualizar").
   Aviso neutro exigiria chave nova nos três idiomas.

## 14. Riscos

- Se o lote do Admin SDK não rejeitar com código 5 (por exemplo, outro código para `update` em lote), a correção
  não pega o caso. O teste de emulador existe para medir isso; se falhar, o `/develop` ajusta o predicado com o
  código medido em vez de seguir o plano.
- Uma passada perdida consome uma das 20 do teto. Só importa com mais de 9.500 não lidas e corridas repetidas;
  o que sobrar fica para a próxima chamada, como já acontece hoje.
- O diff desloca as linhas citadas pelo `AUDIT.md` (`:1938-1939`, `:1974-1975`); a atualização é do
  `/spec --sync`.
