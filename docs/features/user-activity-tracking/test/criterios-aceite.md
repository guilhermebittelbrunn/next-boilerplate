# Critérios de aceite — Último acesso do usuário

Base: os 18 critérios do `analyze/plan.md` (§9). O texto do critério 4 mudou: o plano prometia teto rígido
de uma escrita por janela, e a medição da revisão mostrou que requisições simultâneas furam esse teto. O
critério agora descreve o que o código faz.

Classificação: ✅ verificado e correto · ❌ falha · 🔒 ninguém consegue verificar sem infra externa.

Cada critério termina com a evidência: arquivo de teste, comando ou artefato desta feature.

# Critérios de Aceite (Checklist)

- [x] ✅ **A listagem do admin mostra o último acesso de cada usuário**
  Em `/{locale}/admin/users`, a tabela tem uma coluna de último acesso entre a de status e a de ações, com
  data e hora no formato do idioma ativo. O valor sai de `lastAccessAt` do perfil quando o campo existe. A
  coluna não entra em `searchFields` nem tem `sorter`, então busca e paginação continuam como estavam.
  Evidência: `apps/app/__tests__/usersListLastAccess.test.tsx` (cabeçalho traduzido e instante formatado) e
  os screenshots de `review/screenshots/`.

- [x] ✅ **Quem nunca acessou aparece com rótulo, não com célula vazia**
  Perfil sem `lastAccessAt` e sem `metadata.lastRefreshTime` renderiza o texto traduzido de "nunca
  acessou". A célula não fica em branco, não mostra `Invalid Date` e não mostra 1970, que é o que
  `normalizeFirestoreInstant` devolve para valor ausente: o componente checa a ausência antes de formatar.
  Evidência: caso "names the absence instead of falling back to the epoch" em
  `apps/app/__tests__/usersListLastAccess.test.tsx`.

- [x] ✅ **Perfil ainda não carimbado cai no valor do provedor, visualmente distinto**
  Sem `lastAccessAt` e com `metadata.lastRefreshTime`, a coluna mostra o instante do provedor atenuado, em
  itálico, com `title` traduzido avisando que é aproximação. Um perfil com carimbo próprio nunca usa o
  valor do provedor, mesmo quando o do provedor é mais recente. O `title` é o único veículo do aviso, e a
  revisão registrou isso como limite conhecido de acessibilidade.
  Evidência: casos "falls back to the provider instant, marked as approximate" e "prefers the profile stamp
  over a newer provider instant" em `apps/app/__tests__/usersListLastAccess.test.tsx`.

- [x] ✅ **Uma escrita de perfil por janela no caminho sequencial, mais o custo da corrida**
  Com a janela em 15 minutos, requisições sucessivas do mesmo usuário dentro da mesma janela produzem uma
  chamada a `touchLastAccess`; a janela seguinte produz mais uma. A garantia vale com o cache de dedupe
  vazio a cada chamada, porque a decisão de gravar sai do `lastAccessAt` do documento que o guard já leu.
  O desenho não usa transação: requisições que chegam antes de a primeira escrita da janela aterrissar leem
  o documento sem carimbo e gravam cada uma. O piso é uma escrita por janela e o teto é o paralelismo do
  momento.
  Evidência: `apps/api/__tests__/activityRecorder.test.ts` (50 chamadas com cache quente resultam em 1
  escrita; 50 com cache frio e documento carimbado, em nenhuma; virada de janela, em 2; duas chamadas
  concorrentes, em 2). Em ambiente, a revisão mediu 110 requisições autenticadas produzindo 3 escritas em
  duas janelas, sendo 2 do par concorrente.

- [x] ✅ **A janela está num único lugar e é o valor documentado**
  `ACTIVITY_WINDOW_MINUTES` é exportada de `apps/api/(shared)/lib/activity-recorder.ts` e vale 15. Nenhum
  outro arquivo de código redeclara o número, e `docs/PRE-PRODUCTION.md` cita o mesmo valor junto da
  declaração de finalidade.
  Evidência: caso "is the documented 15 minutes" em `apps/api/__tests__/activityRecorder.test.ts` e
  `rg ACTIVITY_WINDOW_MINUTES`, que só acha o módulo, o teste e o documento.

- [x] ✅ **O carimbo registra quem age, não quem é representado**
  Com admin personificando um usuário comum, uma requisição `GET` autorizada carimba o perfil do admin e
  deixa o do usuário comum intacto. Na listagem depois desse percurso, o usuário personificado continua
  como estava.
  Evidência: caso "stamps the admin and leaves the impersonated profile untouched" em
  `apps/api/__tests__/guardsStampActivity.test.ts`, mais o dump do Firestore na revisão, em que os dois
  perfis comuns personificados seguiram sem `lastAccessAt`.

- [x] ✅ **Requisição recusada pelo guard não carimba**
  `POST` durante impersonação é recusado com 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` e não grava nada. O
  mesmo vale para token inválido (401 `AUTH_INVALID_TOKEN`), perfil inexistente (403
  `COMMON_PANEL_FORBIDDEN`) e não-admin batendo em rota de admin (403 `ADMIN_FORBIDDEN`). A chamada ao
  recorder fica depois de todas as recusas nos dois guards.
  Evidência: quatro casos de recusa em `apps/api/__tests__/guardsStampActivity.test.ts`, cada um cobrando
  status, `error.code` e `touchLastAccess` não chamado.

- [x] ✅ **Usuário comum e admin são carimbados, em leitura e em mutação**
  Requisição de usuário comum por `requireCommonPanelApi` e requisição de admin por `requireAdminApi`
  carimbam cada uma o próprio perfil. Vale para `GET` e para mutação autorizada: `PUT` do usuário comum
  sobre os próprios dados, `PUT` e `DELETE` do admin. Numa mutação de admin sobre outro perfil, quem recebe
  o carimbo é o admin, não o alvo.
  Evidência: casos "stamps a common user editing their own data", "stamps an admin on an authorized
  update", "stamps an admin on an authorized delete" e "stamps the admin, not the target, when a mutation
  acts on another profile" em `apps/api/__tests__/guardsStampActivity.test.ts`.

- [x] ✅ **Falha ao gravar o carimbo não derruba a requisição**
  Se `touchLastAccess` rejeitar por permissão, indisponibilidade ou quota, a requisição original responde o
  seu 200 com o corpo esperado. A falha vai para `logEvent` no escopo `account` com nome do erro e status
  gRPC, sem mensagem: a mensagem de uma falha do Firestore carrega caminho de documento. A janela não fica
  marcada como gravada depois de uma falha, então a requisição seguinte tenta de novo.
  Evidência: casos de falha em `apps/api/__tests__/activityRecorder.test.ts` (não lança, não vaza a
  mensagem, loga o status, repete a tentativa) e "serves the request when the stamp write is refused" em
  `apps/api/__tests__/guardsStampActivity.test.ts`.

- [x] ✅ **O carimbo não move `updatedAt` do perfil**
  `touchLastAccess` escreve direto no documento, fora do `update` do `BaseRepository`, que carimbaria
  `updatedAt` junto. Depois de uma sequência de acessos, `updatedAt` continua no instante da última edição
  real do perfil, e nenhum outro campo do documento muda.
  Evidência: `describe("UserRepository.touchLastAccess")` em `apps/api/__tests__/baseRepository.test.ts`,
  contra o driver falso do Firestore. Trocar a implementação por `BaseRepository.update` derruba esse teste,
  o que foi verificado. Em ambiente, a revisão leu o documento do admin com `updatedAt` no instante do seed
  e `lastAccessAt` 14 minutos depois.

- [x] ✅ **O valor chega ao cliente como instante serializado, não como objeto vazio**
  `GET /users` devolve `lastAccessAt` como string ISO. Um `Timestamp` que não passasse por
  `serializeFirestoreValue` chegaria ao JSON como `{"_seconds":…}` e a coluna mostraria `Invalid Date`. O
  campo sobrevive ao merge com a conta do Auth, porque `mergeAuthAndFirestore` espalha as chaves do Auth por
  cima das do Firestore e `lastAccessAt` não é uma delas. Perfil anterior ao campo chega sem a chave.
  Evidência: casos "carries the last access stamp to the client as an ISO string" e "leaves the last access
  stamp absent for a profile that predates the field" em `apps/api/__tests__/userProfileSerialization.test.ts`.
  Contra o documento real, a revisão observou o `Timestamp` do emulador chegando formatado na tela.

- [x] ✅ **Nenhum índice novo é exigido e nenhuma consulta degrada**
  `firestore.indexes.json` e `firestore.rules` continuam sem alteração, e
  `apps/api/__tests__/firestoreIndexes.test.ts` passa sem edição. A coluna não ordena nem filtra no
  servidor, então não existe `where` com `orderBy` em campos diferentes, e `GET /users` não passou a
  responder 503.
  Evidência: `git status` limpo nos dois arquivos e a suíte `pnpm --filter api test` verde.

- [x] ✅ **A coluna existe nos 3 idiomas**
  O rótulo da coluna, o texto de "nunca acessou" e o `title` de aproximação existem em `pt-br`, `en` e `es`
  com a mesma estrutura de chave. Nenhuma string de interface aparece literal no JSX.
  Evidência: `pnpm --filter @repo/internationalization test` (27 testes, paridade dos 3 idiomas) e
  `describe("last access column in each language")` em `apps/app/__tests__/usersListLastAccess.test.tsx`,
  que cobra os três textos em `en` e `es`.

- [x] ✅ **Data e hora seguem o formato do idioma**
  O mesmo instante renderiza no formato de cada idioma via `formatDisplayDateTime`, que mapeia `pt-br` para
  `pt-BR`, `es` para `es` e o resto para `en`. ISO cru na célula não é aceitável em idioma nenhum.
  Evidência: os casos de `en` e `es` comparam a célula com `Intl.DateTimeFormat` do idioma e exigem que ela
  seja diferente do formato do outro idioma. Trocar o idioma do teste para `pt-br` faz o caso de `en`
  falhar, o que foi verificado.

- [x] ✅ **O campo é um campo raiz do perfil, sem cópia em outro lugar**
  `lastAccessAt` existe só como chave de primeiro nível no documento da coleção `user`. Não há coleção nova,
  subcoleção, espelho em `auditEvent` nem derivado gravado, o que é o que faz a exportação e a exclusão de
  conta cobrirem o campo sem trabalho extra quando `data-rights-lgpd` chegar.
  Evidência: `rg lastAccessAt` fora de `docs/` devolve seis arquivos: o recorder, o repositório, o tipo do
  SDK, a listagem e dois de teste.

- [x] ✅ **A finalidade e a retenção estão escritas antes da entrega**
  `docs/PRE-PRODUCTION.md` declara para que o campo serve, que ele não guarda IP e por que isso o tira do
  art. 5º VIII do Marco Civil, que a retenção é a vida da conta, que a exclusão hoje é soft delete e qual é
  a precisão da janela. O custo de escrita ficou num parágrafo próprio, com a corrida e o número medido.
  Evidência: seção "Declaração — o campo `lastAccessAt` do perfil" em `docs/PRE-PRODUCTION.md`.

- [x] ✅ **Temas e viewports**
  A coluna é legível em light e dark, e no mobile (390x844) a tabela continua utilizável: a sétima coluna
  não quebra o layout do `Table` antd e a coluna de ações segue alcançável por rolagem horizontal, como já
  acontecia antes da mudança.
  Evidência: os screenshots de `review/screenshots/` nos dois temas e no mobile, com o contraste do texto
  atenuado medido pela revisão em 6,87:1 no dark e 4,54:1 no light. Nenhum arquivo de produção mudou depois
  dessa medição.

- [x] ✅ **Nada regride na listagem**
  Busca por nome e e-mail, toggle de status, editar, excluir, botão de atualizar e paginação continuam
  funcionando, e o prefetch RSC segue hidratando com a mesma `queryKey`.
  Evidência: `pnpm --filter app test` (389 testes, 54 arquivos) e o percurso da revisão, que filtrou a
  tabela por `user2` e usou os controles da linha.

## Roteiro de teste manual

Só para quem quiser conferir sem subir teste. Emuladores (`pnpm emulators`), `pnpm seed`, API em 3002 e app
em 3000, com os `.env.local` apontando para o emulador.

1. Entrar como `admin@example.com` e abrir `/pt-br/admin/users`. A coluna "Último acesso" aparece entre
   status e ações. O admin tem valor; quem nunca passou por um guard mostra "Nunca acessou".
2. Anotar o valor do admin, navegar pelo painel por alguns minutos e voltar à listagem. O valor não muda
   dentro da janela de 15 minutos.
3. Personificar `user2@example.com`, navegar quatro telas do painel comum e voltar ao admin. `user2`
   continua em "Nunca acessou" e o valor do admin é que avançou.
4. Trocar o idioma para `en` e para `es`: rótulo, texto de ausência e formato da data mudam juntos.
5. Alternar light e dark e reduzir para 390x844. A tabela rola na horizontal e a coluna de ações continua
   alcançável.
6. Buscar por `user2` na tabela. A linha filtrada renderiza a coluna nova com o mesmo valor.
