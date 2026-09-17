# Revisão — paginação por cursor

Rodada `/cycle` autônoma. Nada foi commitado nem enviado; o que segue é o estado do working tree.

## Branch

`feat/cursor-pagination`, criada a partir de `mbabane`.

Validação do nome contra a regex de `.claude/rules/git-commits.md`: **passou**. A entrega toca
`apps/api`, `apps/app`, `packages/sdk`, `packages/design-system` e `packages/internationalization`; com
vários apps no mesmo escopo a regra manda omitir o `project`, então o nome fica sem prefixo.

`mbabane` não serve como branch de entrega: não bate o padrão `<project>/<type>/<title>`. Não renomeei
porque é a branch do workspace do Conductor. Ela não tinha commit próprio sobre `origin/main` nem
upstream, então o `git switch -c` levou o working tree inteiro, inclusive o `git mv` de
`specs/cookie-consent.md`.

## Validação com o emulador de pé

O handoff do `/develop` afirma que o emulador do Firebase "não sobe nesta máquina" e, por isso, deixou o
fluxo real sem validar. A afirmação está errada. O JDK 21 está instalado via `brew`, mas a fórmula é
keg-only e não entra no `PATH` sozinha:

```
/opt/homebrew/opt/openjdk@21/bin/java -version
→ openjdk version "21.0.12.1" 2026-08-18
```

Com `JAVA_HOME` apontado, `pnpm emulators` subiu em 5 segundos e `pnpm seed` gravou as três contas.
Tudo o que o handoff listou como "não verificado" foi verificado aqui, contra Firestore de verdade.

A causa da confusão está documentada: `docs/SETUP.md:12` mandava `brew install openjdk@21` sem dizer que
a fórmula é keg-only. Corrigido nesta revisão, com as duas linhas de `export` no pré-requisito e um
ponteiro na seção de armadilhas.

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

| `arquivo:linha` | Problema | Ação |
|---|---|---|
| `packages/design-system/components/ui/table.tsx:141` | Com paginação por cursor, a busca passou a enxergar só as linhas já carregadas, mas o `emptyText` continuava dizendo "Nenhuma entidade cadastrada.". Buscar por um registro que existe na página seguinte respondia que o usuário não tem nada cadastrado. Visto na tela, não deduzido. | Corrigido: o `Table` troca o texto quando há busca ativa e páginas pendentes. |
| `apps/api/scripts/backfill-instants.mjs:39` | O script lia `FIREBASE_PROJECT_ID`, variável que não existe em lugar nenhum do repositório, e chamava `initializeApp({ projectId })` sem credencial. Contra projeto real, que é a única razão de ele existir, parava em "No project id found" ou caía em ADC inexistente. `docs/PRE-PRODUCTION.md` manda um operador rodá-lo em dado de produção. | Corrigido: passou a usar `emulatorTarget.mjs` e o service account, como `create-dev-admin`. |
| `apps/api/package.json` | O backfill não tinha entrada de script, então o comando do runbook não existia. | Corrigido: `pnpm --filter api backfill-instants`, e o `PRE-PRODUCTION.md` agora cita esse comando. |

### 🟢 Sugestão

- `apps/app/shared/hooks/useAuthorizedInfiniteQuery.ts:36` — `(options.enabled ?? true) && sdkAuthorized`
  descarta em silêncio um `enabled` passado como função, que o React Query v5 aceita. O
  `useAuthorizedQuery` tem exatamente a mesma linha desde antes desta entrega, e nenhum dos cinco call
  sites passa função (todos passam `boolean`). Não mexi: consertar só o hook novo deixaria os dois
  divergentes, e consertar os dois é mudança no hook compartilhado, fora do escopo desta feature.
- `apps/api/(shared)/repositories/base.repository.ts:94` — cursor apontando para documento inexistente
  responde 400, e cursor de documento de outro dono responde 200. Isso é um oráculo de existência de id.
  Os ids do Firestore são aleatórios de 20 caracteres, então não dá para enumerar; registro pelo que é.

### ✅ Conforme

- Guard, ownership e envelope de resposta seguem o padrão de `entities/`.
- `PAGINATION_CURSOR_INVALID` e `PAGINATION_INDEX_MISSING` têm entrada nos três idiomas.
- `firestore.indexes.json` declara `userId` ASC, `deletedAt` ASC, `createdAt` DESC. O Firestore anexa
  `__name__` implícito na direção do último campo, ou seja DESC, que é o que a consulta pede.
- `isMissingIndexError` casa por `/requires an index/i` e, como rede, por código 9 mais menção a índice.
  A segunda condição cobre a variante `requires a COLLECTION_GROUP_ASC index`, que a primeira não pega.
- A entrega cobre os cinco itens do corte de MVP de `specs/cursor-pagination.md`.

## Correções aplicadas

| Arquivo | O que mudou |
|---|---|
| `packages/design-system/components/ui/table.tsx` | `locale` saiu do `...rest` para ser reescrito quando a busca não alcança as páginas pendentes. |
| `packages/internationalization/translations/components/ui/table.ts` | Chave `searchPendingPages` nos três idiomas. |
| `apps/api/scripts/backfill-instants.mjs` | Alvo e credencial pelo `emulatorTarget.mjs` + service account; cabeçalho declara se o projeto é real. |
| `apps/api/package.json` | Script `backfill-instants`. |
| `docs/PRE-PRODUCTION.md` | Comando do backfill atualizado, mais o parágrafo sobre como ele escolhe o alvo. |
| `docs/SETUP.md` | `openjdk@21` é keg-only: como apontar `JAVA_HOME`, no pré-requisito e nas armadilhas. |

A chave `searchPendingPages` não é escopo extra: `specs/cursor-pagination.md:101` já previa rótulos de
"carregar mais" e de vazio nos três idiomas, e só o primeiro tinha sido feito.

## Raio de impacto

`BaseRepository.update` deixou de reler o documento e agora escreve só os campos recebidos. Isso vale
para todo repositório do repo, não só `entity`. Os três call sites de produção:

- `apps/api/app/(routes)/entities/[id]/route.ts:76` — manda `omitUndefined(patch)`, comportamento igual.
- `apps/api/app/(routes)/users/[id]/route.ts:55` — manda `{ id, type }`, comportamento igual.
- `apps/api/app/(routes)/account/route.ts:76` — já remontava o objeto de preferências por conta própria
  (`mergePreferences`), então nunca dependeu da releitura.

`delete()` continua chamando `update({ id, deletedAt })` e segue funcionando: apaguei as duas entidades
de `user2@example.com` pela API e elas sumiram da listagem.

Medi o efeito no documento cru, pelo Admin SDK, depois de um `PUT { enabled: false }`: `createdAt` segue
`Timestamp`, as onze chaves continuam lá, só `enabled` e `updatedAt` mudaram. A semântica nova é o
conserto do defeito que motivou o backfill, não uma regressão.

`entity.list()` mudou de `EntityDTO[]` para `PageDTO<EntityDTO>`. Consumidores: `useListEntities.tsx` e o
prefetch em `page.tsx`, os dois ajustados. `user.list()`, `account` e `file` não foram tocados.

## 👁 Validação visual

App em `localhost:3010` (a 3000 está com um Electron de outro workspace, que ficou intacto), API em
`localhost:3002`, emulador em 8080/9099, tudo apontado para `demo-next-boilerplate`. Para o botão
aparecer com quatro registros, baixei `ENTITIES_PAGE_SIZE` para 2 durante a sessão. **Revertido para 20**,
conferido no arquivo e reconfirmado na tela: com 20, as quatro linhas vêm de uma vez e o botão não
aparece. Comandos do `agent-browser` em sequência. Tudo que subi foi derrubado por PID no fim.

Percorrido como `user@example.com`:

- Primeira página com duas linhas e "Carregar mais" (`01-dark-desktop-page1.png`).
- Clique no botão: a segunda página é **anexada**, ficam quatro linhas, nenhuma repetida, e o botão some
  (`02-dark-desktop-page2.png`). As quatro entidades do seed têm o mesmo `createdAt`, que é o caso de
  empate onde um cursor mal feito repete ou perde registro.
- **Toggle de `enabled` numa linha da segunda página**: virou na hora, a lista continuou com as quatro
  linhas e o valor persistiu no Firestore. Era o risco 4 do plano, o que falharia calado se o
  `setQueryData` errasse a forma do `InfiniteData`. Não falha.
- Busca por um registro da página não carregada, antes e depois da correção
  (`03-busca-pagina-nao-carregada.png`, `04-busca-apos-carregar.png`).
- Estado vazio, como `user2@example.com` sem entidades: texto correto, sem botão (`09-estado-vazio.png`).
- `LoadErrorState` com a copy de `PAGINATION_INDEX_MISSING` (`08-load-error-index-missing.png`).
- Light e dark, desktop 1280x800 e mobile 390x844 (`05`, `06`, `07`). A tabela antd acompanha o tema.

O 503 não aparece sozinho porque **o emulador serve qualquer consulta, com ou sem índice** — confirmei
rodando uma consulta composta que não está declarada em `firestore.indexes.json` e ela passou. Para ver a
tela de erro, injetei temporariamente no `GET /entities` um erro com a mensagem e o código que o Firestore
emite de verdade (`9 FAILED_PRECONDITION: The query requires an index...`). Serviu para duas coisas ao
mesmo tempo: `isMissingIndexError` reconheceu a mensagem real e a copy traduzida chegou à tela. A injeção
foi removida, e `git diff` do arquivo voltou às 41 linhas originais.

## Exercício direto da API

Contra o Firestore emulado, com token real:

- Caminhando de um em um, `limit=1`, saíram quatro ids distintos, sem repetir e sem pular, e o
  `nextCursor` veio `null` no fim.
- `?cursor=lixo`, cursor com id `a/b`, cursor de versão 2 e cursor apontando para documento inexistente:
  os quatro respondem `400 PAGINATION_CURSOR_INVALID`.
- `?limit=` e `?cursor=` vazios contam como ausentes e respondem 200.
- `limit=0`, `limit=abc` e `limit=2.5` respondem `400 VALIDATION_FAILED`; `limit=9999` é aceito e clampado.
- Cursor obtido na lista de `user2@example.com`, usado autenticado como `user@example.com`: só voltaram
  registros do próprio dono.

Os quatro desvios do plano que o handoff registrou estão implementados como descrito e cada um foi
exercitado acima.

## O fake de Firestore dos testes

`apps/api/__tests__/baseRepository.test.ts` estende um fake em memória, e os testes de paginação se
apoiam nele. Conferi as quatro afirmações que ele faz contra o comportamento que acabei de observar no
emulador: `startAfter` posicionando pela tupla (`createdAt`, `__name__`), `where deletedAt == null`
excluindo documento sem o campo, `doc().update()` mesclando o patch, e `limit` aplicado depois do
`startAfter`. Batem. A ordenação por tipo antes de valor é a ordem canônica documentada do Firestore e
não deu para observar com o dado do seed.

## Lacunas para o `/test`

1. `isMissingIndexError` contra um Firestore **real** recusando a consulta. O emulador não cobra índice,
   então nem ele nem a suíte provam isso; segue em `PRE-PRODUCTION.md` §1.1.
2. O índice composto servindo a consulta em projeto real, incluindo o `__name__` DESC implícito.
3. `useAuthorizedInfiniteQuery` com `enabled` como função, se alguém decidir consertar o hook.
4. A busca do `Table` com páginas pendentes não tem teste de componente; a correção desta revisão foi
   verificada na tela, não na suíte.

## Decisões em aberto

1. **`useAuthorizedQuery` e `useAuthorizedInfiniteQuery` com `enabled` como função.** Recomendação:
   corrigir os dois juntos, num commit próprio fora desta feature. Hoje nenhum call site passa função.
2. **Oráculo de existência pelo cursor.** Recomendação: deixar como está e reavaliar se algum recurso
   futuro usar id sequencial em vez do id aleatório do Firestore.

## Gates

Medidos neste workspace, nesta rodada.

| Comando | Resultado |
|---|---|
| `pnpm check` | 554 arquivos, nenhuma correção |
| `pnpm turbo run lint typecheck test --force` | 24 de 24 tasks, 0 em cache, 1m9,5s |
| `pnpm --filter api test` | 38 arquivos, 407 testes |
| `pnpm --filter app test` | 42 arquivos, 302 testes |
| `pnpm --filter @repo/internationalization test` | 3 arquivos, 27 testes, paridade inclusa |
| `pnpm --filter app build` | passou |
| `pnpm --filter api build` | passou |

## Plano de commits

Dois assuntos no working tree, separados. Ordem de dependência dentro da feature:
`packages/sdk` → `apps/api` → `apps/app` e `packages/design-system` → `packages/internationalization`.

1. `docs(specs): reconcile backlog with delivered features`
2. `docs: correct cookie inventory and CI gate figures`
3. `docs: document the keg-only JDK 21 setup for the emulators`
4. `feat(sdk): paginated envelope for entity listing`
5. `feat(api): cursor pagination in the base repository`
6. `feat(api): cursor query parsing and paginated entities route`
7. `chore(api): backfill script for string instants`
8. `feat(design-system): server-driven load more in the table`
9. `feat(app): infinite entity list with load more`
10. `feat(internationalization): pagination copy and error codes`
11. `docs(features): cursor-pagination`

Commits realizados: (a preencher pelo `/review`)
