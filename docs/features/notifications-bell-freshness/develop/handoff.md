# Handoff do develop: frescor e borda do sino de notificações

Só `apps/app`. Nada de SDK, API, i18n, env ou design system. Não subi app nem browser: o diff é lógica de
cache (coberta por teste de hook) mais uma prop repassada ao Radix, que só o `/test` consegue medir.

## Blueprint → arquivos

| Item do plano | Arquivo | O que mudou |
|---|---|---|
| 1. Lista acompanha o badge | `apps/app/shared/hooks/useUnreadNotificationsCount.ts` | O `queryFn` lê a contagem do cache antes de pedir; se a resposta do servidor for diferente, marca a lista como velha (`refetchType: "none"`). Nada é lido nesse momento |
| 2a. Sem badge com a contagem em erro | idem | `count: query.isError ? 0 : (query.data?.count ?? 0)` |
| 2b. Marcar como lida não ressuscita o número | `apps/app/shared/hooks/useNotificationActions.ts` | `snapshotCache` só guarda `previousCount` se a contagem está em `success`; `markRead` e `markAllRead` só escrevem na contagem quando há `previousCount` |
| 3. Popover longe das bordas | `apps/app/shared/components/notifications/NotificationsBell.tsx` | `collisionPadding={POPOVER_EDGE_GAP_PX}` (12) no `PopoverContent`; `align="end"` e a largura ficaram como estavam |
| Desvio (ver abaixo) | `apps/app/shared/hooks/useListNotifications.ts`, `useNotificationActions.ts` | Helpers `isNotificationsListStale` e `markNotificationsListStale`; quem escreve na lista devolve a marca de velha que já existia |
| T1 a T7, mais 3 | `apps/app/__tests__/useNotifications.test.tsx` | 10 testes novos; helper `seedList` extraído de `seedCache` |

## Contrato

Nenhum DTO ou action mudou. `useListNotifications` passou a exportar `isNotificationsListStale` e
`markNotificationsListStale`, consumidos por `useUnreadNotificationsCount` e `useNotificationActions`. O
`fetchNextPage` devolvido pelo hook virou um wrapper com a mesma assinatura de chamada; o único consumidor é
`NotificationsList.tsx:115`, que ignora o retorno.

## Códigos de erro novos

Nenhum. `apiErrors` não mudou.

## Desvio do plano: a marca de "lista velha" some em toda escrita na lista

O plano marca a lista com `invalidateQueries` e conta com o `isInvalidated` para reler na próxima abertura. No
`@tanstack/query-core@5.90.20`, `successState` grava `isInvalidated: false`
(`node_modules/.pnpm/@tanstack+query-core@5.90.20/.../build/modern/query.js:402-409`), e toda escrita bem-sucedida
passa por ele: `setQueryData` e o carregamento de uma página. Com o popover aberto quando a contagem muda, duas
ações comuns apagavam a marca e a reabertura dentro de 60 s mostrava a lista antiga, que é o defeito que a
tarefa existe para fechar:

- marcar como lida ou marcar todas (`setQueryData` otimista, o `onSuccess` do `markRead` e o rollback);
- clicar em "carregar mais" (`fetchNextPage`).

Medição contra a implementação do plano, antes da correção:

- 2 testes novos falhando ("mantém a lista marcada como velha quando a pessoa marca uma como lida" e "... depois
  de marcar todas"): `vitest run __tests__/useNotifications.test.tsx` → `2 failed | 19 passed (21)`.
- Para o `fetchNextPage`, uma sonda temporária (já apagada) imprimiu `isInvalidated` `true` antes e `false`
  depois; o teste definitivo "carregar mais com a lista velha mantém a marca para a próxima abertura" falhou com
  `expected false to be true` → `1 failed | 21 passed (22)`.

Correção: os dois helpers em `useListNotifications.ts`. `useNotificationActions` escreve na lista por um
`writeList` que lê a marca antes e a recoloca depois; o `fetchNextPage` do hook faz o mesmo. O
`useUnreadNotificationsCount` usa o mesmo `markNotificationsListStale`. Com a lista em dia, nada muda: os testes
antigos que espiam `invalidateQueries` e esperam zero chamadas continuam passando.

O plano dizia que `useListNotifications` não mudaria. Mudou: `fetchNextPage` foi embrulhado e os helpers
moram ali. `fetchNotificationsList` e o par hook/função imperativa (regra de ouro 8) ficaram iguais.

## Comentários no código

Três, todos sobre comportamento da biblioteca que não aparece lendo o código: o motivo de comparar com o cache
no `queryFn`, o motivo de não escrever na contagem em erro (`setQueryData` limpa o erro) e o JSDoc dos helpers
(toda escrita apaga a marca). O JSDoc de `useNotificationActions` trocou "there is nothing to invalidate" por
"nothing is read again on its account", porque o hook agora pode chamar `invalidateQueries` para devolver uma
marca que já existia.

## Validação

| Gate | Comando | Resultado |
|---|---|---|
| Testes novos contra o código antigo | `pnpm exec vitest run __tests__/useNotifications.test.tsx` (em `apps/app`) | T1 a T7: 5 falham (T1, T3, T5, T6, T7), 14 de 19 passam. T2 e T4 passam antes, de propósito: protegem comportamento que já existe |
| Hook e sino depois | `pnpm exec vitest run __tests__/useNotifications.test.tsx __tests__/notificationsBell.test.tsx` | `32 passed (32)` |
| Suíte da app | `pnpm --filter app test` | `115 passed` arquivos, `968 passed` testes (base 958 + 10 novos) |
| Typecheck | `pnpm --filter app typecheck` | exit 0 |
| Lint/format | `pnpm check` | exit 0, `Checked 965 files` |
| Paridade i18n | não rodei | nenhuma chave nova |

Os 5 testes de `useNotificationActions` que já existiam e os testes de `notificationsBell.test.tsx` não foram
alterados e passam.

## A verificar no `/test`

Nada abaixo foi medido por mim; são os fluxos F1 a F8 do plano, §8.

- F1: depois que a contagem muda, a reabertura do popover gera 1 `GET /notifications` e mostra a nova no topo.
  Repro e contagem no log da API como no plano.
- F2 e F3: abrir e fechar sem contagem nova, ou depois de marcar como lida, não gera `GET /notifications` extra.
- Caso que o desvio cobre: popover aberto quando a contagem muda (esperar o polling de 120 s ou voltar o foco à
  aba com o popover aberto), marcar uma como lida ou carregar mais, fechar e reabrir antes de 60 s. Esperado:
  1 `GET /notifications` na reabertura.
- F4 a F6: badge some depois de duas falhas seguidas (`retry: 1`), `aria-label` sem número, sem toast; volta com
  o número novo; marcar como lida com a contagem em erro não traz o badge de volta.
- F7 e F8: `collisionPadding` a 375 px (12 px de cada lado com scrollbar sobreposta) e o R1 com scrollbar
  clássica; desktop alinhado à direita do sino como antes. Em jsdom não há layout, então o teste de hook não
  prova nada disso.

## Riscos e lacunas

- R2 do plano (contagem travada em 100) continua aceito: notificação nova não muda o número e a lista volta a
  depender dos 60 s.
- R4 (corrida entre o `queryFn` e uma mutação) continua aceito e sem medição.
- `list.refetch()` (botão de tentar de novo, `NotificationsList.tsx:68`) relê todas as páginas e limpa a marca.
  Não é lacuna: a lista fica em dia.
- O teste T5 mede releitura com `staleTime` de 60 s configurado só para a chave da lista
  (`setQueryDefaults`), espelhando o `QueryProvider`. Se o `staleTime` global mudar, o teste não acompanha.

## Pendências e decisões em aberto

Nenhuma bloqueante. Para o revisor: o desvio colocou dois helpers exportados em `useListNotifications.ts`. Se
preferir outro lugar (ex.: `shared/lib`), é uma movimentação sem mudança de comportamento.
