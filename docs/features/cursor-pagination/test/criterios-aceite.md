# Critérios de Aceite (Checklist)

Marcadores: ✅ aprovado · ❌ reprovado · 🔒 não verificável sem infra externa. Um 🔒 não é aprovação nem
reprovação: é um item que ninguém consegue conferir nesta máquina.

Ambiente: emulador do Firebase (`demo-next-boilerplate`, Auth 9099, Firestore 8080) com o seed padrão,
API em 3002 e app em 3010. O meio de verificação de cada item vem entre parênteses.

- [x] ✅ **A listagem lê só uma página do Firestore** *(unit · rota · emulador)*
  `GET /entities?limit=2` devolve dois itens e um `nextCursor` não nulo. Com `limit=3` sobre as quatro
  entidades do seed saem três itens mais cursor, e a página seguinte traz o quarto com `nextCursor` nulo.
  A consulta emitida pede `limit(3)` quando o cliente pediu 2: o documento extra existe para descobrir se
  há próxima página e nunca aparece na resposta (`baseRepository.test.ts`, "pushes the soft-delete filter,
  the ordering and the size into the query").

- [x] ✅ **O teto de tamanho é do servidor** *(unit · rota · emulador)*
  `limit=99999` responde 200 com no máximo 100 itens, então o cliente não consegue fazer a resposta
  crescer junto com a coleção. Já `limit=0`, `limit=-1`, `limit=1.5` e `limit=abc` respondem
  `400 { error: { code: "VALIDATION_FAILED" } }`. A diferença é intencional: valor grande demais é
  clampado, valor inválido é recusado. Exercitei os quatro contra a API rodando.

- [x] ✅ **Percorrer todas as páginas não repete nem perde registro, mesmo com `createdAt` idêntico** *(unit · emulador)*
  O seed grava as quatro entidades de `user@example.com` no mesmo instante. Caminhando com `limit=1`,
  `limit=2` e `limit=3` saem sempre quatro ids distintos, na mesma ordem, e o `nextCursor` da última
  página vem nulo. Sem o desempate por `documentId` este é o caso que duplica ou pula linha, e ele só
  aparece com volume.

- [x] ✅ **O cursor é opaco e o cliente só o repassa** *(unit · rota · emulador)*
  `nextCursor` é base64url e nenhum código do `apps/app` o interpreta: o hook entrega ao
  `getNextPageParam` e ao `queryFn` sem parsear. Cursor forjado (`lixo`), de outra versão (`v: 2`), com
  id ilegal (`a/b`), acima de 512 caracteres ou apontando para documento inexistente respondem
  `400 { error: { code: "PAGINATION_CURSOR_INVALID" } }`, nunca 500 e nunca uma página de outro dono.

- [x] ✅ **Cursor não fura ownership** *(unit · emulador)*
  Autenticado como `user@example.com`, um cursor que carrega o id de um documento de
  `user2@example.com` devolve 200 com registros só do chamador. O `where("userId", "==", ...)` continua na
  consulta e o `startAfter` apenas desloca a ordenação. Sem credencial nenhuma, a rota responde
  `401 { error: { code: "AUTH_INVALID_TOKEN" } }`. O caso virou teste (`baseRepository.test.ts`, "never
  returns another owner's rows when the cursor points at their document").

- [x] ✅ **`update()` preserva o tipo de `createdAt`** *(unit · emulador, documento cru)*
  Três `PUT` seguidos na mesma entidade deixam `createdAt` como `timestampValue` no documento, com as
  onze chaves intactas e só `enabled` e `updatedAt` alterados. A ordem da listagem é a mesma antes e
  depois. Até esta entrega o primeiro `PUT` reescrevia o campo como string ISO, e o Firestore compara tipo
  antes de valor: o `orderBy` saía errado sem emitir erro nenhum.

- [x] ✅ **O soft delete continua funcionando e some da lista** *(unit · emulador)*
  `DELETE /entities/:id` responde 204 e o registro sai da listagem paginada, porque o filtro
  `deletedAt == null` agora roda no Firestore. O documento excluído continua servindo de âncora: reenviar
  o cursor que apontava para ele responde 200 com a página seguinte, em vez de
  `PAGINATION_CURSOR_INVALID`. Ele existe, só não é devolvido.

- [x] ✅ **A tela carrega mais sob demanda** *(componente · hook · e2e)*
  Com `ENTITIES_PAGE_SIZE = 20` e quatro registros, a tabela mostra as quatro linhas e nenhum botão. Com
  o tamanho em 2, "Carregar mais" aparece sob a tabela, a segunda página é anexada ao fim (quatro linhas,
  nenhuma repetida) e o botão some quando `nextCursor` volta nulo. O botão fica `disabled` enquanto
  `isFetchingNextPage`, então clicar duas vezes em seguida não duplica linha (`tableLoadMore.test.tsx`).

- [x] ✅ **O toggle de `enabled` funciona em qualquer página carregada** *(hook · e2e)*
  Alternar o `Switch` de uma linha vinda da segunda página vira na hora, mantém as quatro linhas e
  sobrevive a um recarregamento completo da página. A escrita otimista percorre `pages[].items[]` porque o
  cache virou `InfiniteData`; errar a forma desse objeto faria o toggle falhar em silêncio, e só na
  segunda página. Clicar em "Atualizar" com duas páginas carregadas refaz as duas requisições e mantém as
  quatro linhas.

- [x] ✅ **A busca não afirma que o registro não existe** *(componente · e2e nos 3 idiomas)*
  O `searchFields` filtra só as páginas já carregadas. Buscar por um registro que está na página seguinte
  devolve zero linhas, e o texto de vazio passa a ser "Nada encontrado no que já foi carregado. Carregue
  mais para continuar a busca." no lugar do "Nenhuma entidade cadastrada." do chamador. Clicar em
  "Carregar mais" com a busca ativa traz o registro. Sem páginas pendentes, ou sem busca ativa, o texto do
  chamador é preservado.

- [x] 🔒 **Índice ausente degrada, não explode** *(só em projeto Firebase real)*
  Com o índice composto não publicado, `GET /entities` deve responder
  `503 { error: { code: "PAGINATION_INDEX_MISSING" } }` e a tela deve renderizar `LoadErrorState` com a
  mensagem traduzida. Um teste de rota cobre o caminho do handler contra o erro que o Firestore emite
  (`9 FAILED_PRECONDITION: The query requires an index...`), e a revisão viu a copy na tela. Mas o
  emulador serve qualquer consulta, com ou sem índice, então nenhum teste local prova que o Firestore de
  verdade recusa. Pendência de infra em `docs/PRE-PRODUCTION.md` §1.1.

- [x] ✅ **`isMissingIndexError` reconhece as duas mensagens do Firestore** *(unit)*
  A recusa chega como `FAILED_PRECONDITION` com o texto em linguagem natural, sem classe de erro própria
  para casar. O reconhecimento cobre a forma comum ("requires an index"), a variante de collection group
  ("requires a COLLECTION_GROUP_ASC index"), que a primeira regex não pega, e a grafia de código do SDK
  cliente (`"failed-precondition"`). Erro sem relação, como `deadline exceeded`, `permission denied`,
  `null` ou string solta, continua subindo em vez de virar 503.

- [x] 🔒 **O índice composto serve a consulta em projeto real** *(só em projeto Firebase real)*
  Com o índice publicado, a consulta com dois `where` mais `orderBy("createdAt", "desc")` e
  `orderBy(documentId(), "desc")` deve ser servida, aproveitando o `__name__ DESC` que o Firestore anexa
  implicitamente na direção do último campo. Nada local exercita isso: o emulador aceita a consulta com ou
  sem índice declarado.

- [x] ✅ **A entrada de índice está declarada no repositório** *(unit)*
  `firestore.indexes.json` traz a entrada de `entity` com `userId ASC`, `deletedAt ASC` e
  `createdAt DESC`, e `firestoreIndexes.test.ts` falha se ela sumir. Esse teste existe porque o emulador
  não cobra índice composto. Sem ele, o esquecimento só apareceria em produção.

- [x] ✅ **Os dois códigos de erro têm copy nos três idiomas** *(unit de paridade)*
  `PAGINATION_CURSOR_INVALID` e `PAGINATION_INDEX_MISSING` estão em `apiErrors` para `pt-br`, `en` e `es`,
  e a paridade passa. Nenhuma das duas mensagens cita termo de infraestrutura para o usuário final.

- [x] ✅ **Nada de string de UI solta** *(e2e nos 3 idiomas)*
  O rótulo do botão vem de `components.table.loadMore`: "Carregar mais", "Load more", "Cargar más". O
  texto de busca sem resultado com páginas pendentes vem de `components.table.searchPendingPages` e também
  troca com o locale. Li os três na tela da listagem autenticada.

- [x] ✅ **Tema e responsivo** *(e2e)*
  A lista, o botão de carregar mais e a barra de busca renderizam em light e dark, no desktop (1280x800) e
  no mobile (390x844). A tabela antd acompanha o tema do design system, e o botão usa a mesma variante
  `outline` do "Atualizar" ao lado.

- [x] ✅ **Autorização e personificação** *(e2e)*
  Não autenticado, `/entities` redireciona para o login com `?redirect=`. Como admin no painel comum
  personificando `user@example.com`, a lista paginada mostra os registros do personificado, não os do
  admin: carrega a segunda página sem repetir linha e mantém todos os `Switch` desabilitados, com o aviso
  de modo somente leitura no topo.

- [x] ✅ **A listagem de usuários não regride** *(e2e)*
  `user.repository.list()` continua sobre `findAll()` e `apiClient.user.list()` continua devolvendo array
  cru. A área admin de usuários lista as três contas do seed normalmente, como esperado de algo declarado
  fora do corte.

- [x] ✅ **Os três gates passam**
  `pnpm turbo run lint typecheck test --force`: 24 de 24 tasks, nenhuma em cache.

## Item sem teste, por decisão

- **`useAuthorizedInfiniteQuery` com `enabled` como função.** `(options.enabled ?? true) && sdkAuthorized`
  (`useAuthorizedInfiniteQuery.ts:36`) descarta calado um `enabled` passado como função, que o React Query
  v5 aceita. Não escrevi teste para isso de propósito: `useAuthorizedQuery` carrega a mesma linha desde
  antes desta entrega e os cinco call sites passam `boolean`. Fixar o comportamento em teste agora
  congelaria uma decisão que é do usuário, e consertar só o hook novo deixaria os dois divergentes.
