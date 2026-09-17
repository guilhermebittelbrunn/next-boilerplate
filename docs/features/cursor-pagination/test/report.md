# Relatório de QA — Paginação por cursor

Rodada de 2026-09-16, branch `feat/cursor-pagination`, nada commitado. O checklist item a item está em
[`criterios-aceite.md`](criterios-aceite.md); as evidências, em [`e2e/`](e2e/).

> Este arquivo foi gravado pelo orquestrador do `/cycle`, não pelo `analista-qa`: o ambiente da rodada
> bloqueou a escrita de arquivos de relatório por subagent. O conteúdo é o que o QA apurou.

## Placar

19 critérios: **17 aprovados, nenhum reprovado, 2 não verificáveis**.

Os dois `🔒` têm a mesma causa e já constam como pendência em
[`PRE-PRODUCTION.md`](../../../PRE-PRODUCTION.md) §1.1:

- o modo degradado `503 PAGINATION_INDEX_MISSING` quando o índice composto não existe;
- o índice composto servindo a consulta em projeto real, com o `__name__ DESC` implícito.

O emulador do Firestore serve consulta composta sem exigir a entrada declarada, então nada que rode nesta
máquina prova o comportamento do Firestore recusando a consulta. Nem aprovar nem reprovar seria honesto.
Publicar o índice é pré-requisito de quem sobe o fork, e não reprova a entrega.

**Nenhum defeito de produção.** Não houve devolução ao `/review`.

## Ambiente

Emulador do Firebase (`demo-next-boilerplate`, Auth em 9099, Firestore em 8080) com o seed padrão, API em
3002 e app em 3010.

Duas notas de ambiente que valem para quem repetir o roteiro. A porta 3000 estava ocupada por um Electron
de outro workspace e não foi tocada — daí a 3010. Rodar o app fora da 3000 exige `CORS_ORIGIN` equivalente
na API, porque o allowlist de desenvolvimento em `cors.ts:9` lista apenas 3000 e 3001; sem isso o preflight
de `GET /entities?cursor=...` é bloqueado e a tela mostra erro genérico. É configuração de QA, não defeito.
Os `.env` deste workspace apontam para o projeto Firebase real, então as variáveis de emulador foram
passadas na linha de comando em vez de gravadas em arquivo.

O emulador sobe nesta máquina com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`. A fórmula do brew é keg-only e
não entra no `PATH` sozinha, o que levou o `/develop` a concluir que não havia JDK 21 e pular a validação
do fluxo autenticado. `docs/SETUP.md` foi corrigido nesta rodada.

## Testes criados

Oito casos, todos na faixa que não exige processo externo.

`apps/app/__tests__/tableLoadMore.test.tsx` é novo e fecha a lacuna que o `/review` deixou nomeada: a
correção do `emptyText` foi vista na tela e não tinha teste. Renderiza o `Table` real com antd e dicionário
reais, e cobre busca sem resultado com e sem páginas pendentes, lista vazia sem busca, botão condicional e
`disabled` durante a carga. O teste foi conferido contra o defeito que deveria pegar: neutralizando a troca
de `emptyText` em `table.tsx:116`, um caso falha e os outros quatro passam. O único acréscimo de
infraestrutura foi um `window.matchMedia` local, que o jsdom não traz e o antd assina na montagem.

`apps/api/__tests__/baseRepository.test.ts` ganhou o caso de ownership com cursor apontando para documento
de outro dono. Era o único critério de segurança sem rede na suíte — a revisão o tinha exercitado à mão.

`apps/api/__tests__/paginationQuery.test.ts` ganhou dois casos. A condição de fallback do
`isMissingIndexError` (código 9 somado à menção de índice) não era exercitada: o caso existente casava na
primeira regex e retornava antes de chegar nela. Os novos cobrem a variante `COLLECTION_GROUP_ASC` e a
grafia `"failed-precondition"`.

Nenhum teste de emulador foi criado, seguindo a decisão registrada no plano: como o emulador não cobra
índice composto, um teste ali ficaria verde sem provar o que se propõe a provar.

## Gates

| comando | resultado |
|---------|-----------|
| `pnpm check` | 555 arquivos, nenhuma correção |
| `pnpm turbo run lint typecheck test --force` | 24 de 24 tasks, 0 em cache, 36,8 s |
| `pnpm test` (raiz) | 10 de 10 tasks |
| `pnpm --filter api test` | 38 arquivos, 410 testes |
| `pnpm --filter app test` | 43 arquivos, 307 testes |
| `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes |

A revisão havia medido 407 e 302; os oito testes desta rodada explicam a diferença.

## O que foi visto pela primeira vez

A revisão já tinha percorrido o fluxo principal. O esforço do QA foi para os eixos que ninguém tinha olhado.

O mais relevante é **admin personificando**, que estava inteiramente descoberto: a lista paginada traz os
registros do usuário personificado, a segunda página não repete, os `Switch` aparecem desabilitados e o
aviso de somente leitura continua na tela (`10-`, `11-`).

Também apareceram primeiro aqui: página desigual, com `limit=3` sobre quatro registros devolvendo 3 mais
cursor e depois 1 com `nextCursor` nulo; `limit=-1` respondendo `400 VALIDATION_FAILED` (a revisão tinha
testado 0, `abc`, 2.5 e 99999); três `PUT` seguidos com leitura do documento cru entre eles, confirmando
que `createdAt` permanece `timestampValue`, que as 11 chaves seguem intactas e que a ordem da lista não
muda — a revisão tinha medido um `PUT`, e o critério pede três; soft delete do documento que o cursor
apontava, com o cursor reenviado depois respondendo 200 com a página seguinte e sem o excluído, o que
exercita o critério 7 contra o Firestore em vez do fake; o lado da busca que **encontra**, já que a revisão
só tinha visto o lado que erra (`04-`); os três idiomas na listagem autenticada, incluindo a copy nova de
`searchPendingPages` (`03-`, `06-`, `07-`), onde o `/develop` havia conferido apenas numa página temporária
pública; e o botão "Atualizar" com duas páginas carregadas, que refaz as duas requisições e mantém as
quatro linhas em vez de colapsar para a primeira página.

A listagem de usuários do admin, fora do corte, foi conferida por precaução e não regrediu.

## O que foi reconfirmado

Primeira página com botão, segunda anexada sem repetição com `createdAt` empatado, toggle numa linha da
segunda página (agora também com reload completo, para provar persistência), cursor de outro dono, cursores
inválidos respondendo `400 PAGINATION_CURSOR_INVALID`, clamp de `limit=99999`, e light/dark em desktop e
mobile.

Um item não foi repetido de propósito: a `LoadErrorState` com a copy de `PAGINATION_INDEX_MISSING`. A
revisão injetou o erro real no handler, viu a copy traduzida chegar à tela e removeu a injeção. Repetir
significaria injetar erro em código de produção de novo, o que não prova nada além do que o teste de rota
já cobre e deixa risco de resíduo. O item fica como não verificável.

`ENTITIES_PAGE_SIZE` foi baixado para 2 durante a sessão e revertido para 20, conferido no arquivo e
reconfirmado na tela (`12-`): quatro linhas de uma vez, sem botão.

## Dados de QA

Nada a limpar. Nenhuma conta nova foi criada e nenhum provedor externo foi tocado. As três contas usadas
são as do seed (`admin@`, `user@` e `user2@example.com`), e as alterações morreram junto com o emulador:
"Joana Ribeiro" ficou com `enabled: false` no teste do toggle, "Acme Franchise" passou por três `PUT` de
ida e volta e terminou restaurada em `true`, e uma das duas entidades de `user2@example.com` recebeu soft
delete. `pnpm seed` reconstrói o conjunto.

As portas foram devolvidas: emulador (9099, 8080, 4001, 4400, 4500, 9150), API em 3002 e app em 3010
subiram e foram derrubados por PID. A 3000 permaneceu com os mesmos processos de antes.

## Follow-ups

Os dois primeiros são de quem publica o fork e já estão em `PRE-PRODUCTION.md`: publicar o índice
(`deploy --only firestore:indexes`) e conferir o 503 em projeto real; e rodar
`pnpm --filter api backfill-instants --apply` em base que já tenha dado gravado, o que nunca foi
exercitado contra dado real.

O terceiro é decisão em aberto. Em `useAuthorizedInfiniteQuery.ts:36`, `enabled` passado como função é
descartado em silêncio. O QA não mexeu de propósito: `useAuthorizedQuery` carrega a mesma linha desde antes
desta entrega e os cinco call sites passam `boolean`. Consertar só o hook novo criaria divergência entre os
dois.

O quarto é candidato a spec. A busca da tabela alcança apenas as páginas já carregadas; a copy nova avisa o
usuário, e busca no servidor está explicitamente fora do corte desta spec.
