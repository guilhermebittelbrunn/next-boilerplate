# Handoff do desenvolvimento — Último acesso do usuário

Implementação do plano em [`analyze/plan.md`](../analyze/plan.md). Rodada autônoma do `/cycle`: ninguém
foi consultado durante o trabalho.

## O que foi feito, por camada

### `packages/sdk`

- `src/types/user/user.ts` — `lastAccessAt?: Date | null` no `UserDTO`, com um comentário curto dizendo
  que o valor atrasa até uma janela. Campo opcional e aditivo; `UserWithAuthDTO` herda sem mudança
  própria. Nenhuma action nova, nenhum registro no `Client`.

### `apps/api`

- `(shared)/lib/activity-recorder.ts` (novo) — `recordUserActivity`, a janela
  `ACTIVITY_WINDOW_MINUTES = 15` e os helpers `activityWindowStartMs`, `activityWindowKey`,
  `isStampedInWindow`, mais o `resetActivityDedupeCache` que os testes usam. Nunca lança; falha vai para
  `logEvent` no escopo `account`, com nome do erro e status gRPC, sem a mensagem.
- `(shared)/repositories/user.repository.ts` — `touchLastAccess(id, at)` escrevendo direto no documento,
  fora do `update` do `BaseRepository`.
- `app/(guards)/common-panel.ts` — carimba `actorProfile` depois do `assertReadOnlyWhileImpersonating` e
  de todas as recusas, antes do bloco de impersonação.
- `app/(guards)/admin.ts` — carimba `profile` depois do mesmo ponto.

### `apps/app`

- `.../admin/(pages)/users/(pages)/(home)/UsersListClient.tsx` — coluna "Último acesso" em 7ª posição,
  entre status e ações, com os três estados de exibição. Sem `sorter` e sem entrada em `searchFields`.

### `packages/internationalization`

- `translations/apps/app/pages/admin/users.ts` — `list.columns.lastAccess`, `list.lastAccess.never` e
  `list.lastAccess.approximate` nos três idiomas.

### Documentação

- `docs/PRE-PRODUCTION.md` — seção nova em Higiene declarando finalidade, ausência de IP e a consequência
  jurídica disso, retenção, o valor da janela e o fato de a exclusão hoje ser soft delete.

### Testes

- `apps/api/__tests__/activityRecorder.test.ts` (novo, 20 casos).
- `apps/api/__tests__/guardsStampActivity.test.ts` (novo, 10 casos).
- `apps/app/__tests__/usersListLastAccess.test.tsx` (novo, 6 casos).

## Contrato

`UserDTO.lastAccessAt` é o único ponto de contrato alterado. Quem consome: `GET /users` (via
`UserWithAuthDTO`) e a listagem do admin. Nada quebra, porque o campo é opcional e nenhum consumidor faz
destructuring exaustivo do type.

**Nenhum código de erro novo.** Nenhuma entrada em `apiErrors`, nenhuma mudança em
`translations/packages/shared/utils.ts`. O carimbo é efeito colateral de requisições que já existiam e
não altera a resposta de nenhuma rota.

## Desvio do plano: 17 arquivos de teste existentes foram tocados

O plano dizia que nenhum teste existente precisaria ser editado. Precisou.

Os testes de rota mockam o módulo `user.repository` inteiro com uma factory do `vi.mock`. Quando o guard
passou a chamar `touchLastAccess`, o método não existia no mock e a chamada caía no `catch` do recorder —
a suíte continuava verde, porque o recorder engole a falha, mas cada teste emitia uma linha
`activity-stamp-failed`. Foram **125 linhas de ruído** em 17 arquivos, e nenhum deles exercitava mais o
caminho de sucesso.

Acrescentei `touchLastAccess: vi.fn()` à factory de cada um. A edição é de uma linha por arquivo e não
muda nenhuma asserção.

Efeito colateral bom: antes de eu corrigir isso, a suíte verde com 125 falhas de escrita **provou** que a
promessa de "nunca lança" segura o caminho real, não só o teste dedicado.

## Decisão do plano que eu seguiria diferente

**Log em toda escrita bem-sucedida** (decisão 8 do plano, seção 10.2). Implementei como estava escrito,
mas registro a divergência porque o `/review` vai esbarrar nela.

Medido: os 16 pontos de chamada de `logEvent` que já existiam no repositório logam falha ou recusa, nenhum
loga sucesso. E `logEvent` escreve via `console.warn` (`packages/shared/utils/helpers/log.ts:56`). A linha
nova emite um `warn` por usuário a cada 15 minutos em tráfego normal. Num boilerplate, todo fork herda
isso: quem ligar alerta em nível `warn` recebe alerta de tráfego saudável.

O plano tem razão no motivo — sem essa linha, a taxa de escrita só é verificável em teste. E foi ela que
me deixou provar a janela na validação visual (18 requisições, 1 escrita). Então não é decisão errada, é
decisão com um custo que o plano registrou como "o item mais fácil de remover". Fica para o `/review`
decidir.

## Validação visual

Emulador do Firebase (`auth` + `firestore`) com `pnpm seed`, `apps/api` em 3002 e `apps/app` em 3000. As
quatro portas estavam livres; subi tudo e derrubei tudo no fim.

O ambiente produziu os três estados da coluna com dado real, sem fixture:

| conta | estado | como apareceu |
|-------|--------|---------------|
| `admin@example.com` | carimbo próprio | `17 de set. de 2026, 23:16`, contraste normal |
| `user@example.com` | valor do provedor | `17 de set. de 2026, 23:19`, atenuado e em itálico, com o `title` traduzido |
| `user2@example.com` | nunca acessou | `Nunca acessou`, atenuado |

O segundo estado saiu de um caminho honesto: autentiquei `user@` direto no emulador de Auth, o que dá a
ele um `metadata.lastRefreshTime` sem passar por nenhum guard, então o perfil nunca foi carimbado.

### O que os screenshots provam

Em `develop/screenshots/`:

- `01-pt-br-dark.png`, `02-pt-br-light.png` — os três estados em dark e light. O `Table` antd respeita o
  tema nos dois.
- `03-en-light.png` — `Last access` / `Never accessed`, data em `Sep 17, 2026, 11:16 PM`.
- `04-es-light.png` — `Último acceso` / `Nunca accedió`, data em `17 sept 2026, 23:16`.
- `05-pt-br-mobile-light.png`, `06-pt-br-mobile-scrolled.png` — 390x844. A tabela já rolava na horizontal
  antes desta mudança; com a sétima coluna continua rolando, e a coluna de ações segue alcançável.
- `07-pt-br-after-impersonation.png` — a listagem depois do percurso de impersonação descrito abaixo.

### A janela de 15 minutos, medida no ambiente

O log da API registrou **1** escrita de carimbo para **18** requisições `GET /users` autenticadas, mais
todo o tráfego de resumo, auditoria e sessão do mesmo período. O valor exibido para o admin ficou parado
em 23:16 durante os cinco minutos de navegação.

### O carimbo registra quem age

Entrei no painel do usuário como admin personificando `user2@example.com` e naveguei dez requisições de
painel comum. Depois voltei ao admin: `user2@example.com` continuava em `Nunca acessou`, tanto na tela
quanto no documento do Firestore, onde o campo seguia ausente. Esta é a regra que o plano aponta como o
risco número 2, e ela vale em ponta a ponta, não só no teste de guard.

### Duas coisas que o unitário não provava e o emulador provou

Lendo os documentos direto do Firestore depois do percurso:

- `lastAccessAt` voltou como `Timestamp` (`_seconds`/`_nanoseconds`) e chegou à tela como data formatada,
  o que fecha o caminho `new Date()` até `serializeFirestoreValue`. O plano tinha deixado essa verificação
  como item opcional para o `/test`.
- O `updatedAt` do perfil carimbado ficou em `02:10:22.548` enquanto o `lastAccessAt` marcava
  `02:16:29.477`. O carimbo não moveu `updatedAt`.

### Regressão

Busca por nome e e-mail continua filtrando (`user2` reduziu a lista a uma linha, com a coluna nova
renderizando certo). Toggle de status, menu de ações, botão de atualizar e o prefetch da página seguem
como antes. Nenhum erro de hidratação no console nem no log do servidor.

## O que não foi validado

- **Assinatura visual do estado degradado em dark.** O `01-pt-br-dark.png` tem os três estados, mas o
  contraste do `text-muted-foreground italic` contra o fundo escuro eu avaliei a olho num screenshot, sem
  medir razão de contraste. Se o `/review` tiver critério de acessibilidade, vale medir.
- **Comportamento em base grande.** Três perfis no emulador. A coluna não ordena nem filtra, então não
  há consulta a degradar, mas não exercitei paginação com volume.
- **Virada de janela em uso real.** O teste unitário cobre a borda com timers falsos. No navegador eu
  observei só a janela segurando, não a escrita seguinte quinze minutos depois.

## Lacunas para o `/test`

- Rota `PUT`/`DELETE` de admin carimbando: cobri `GET` nos dois guards e a recusa de escrita sob
  impersonação, mas não uma mutação autorizada de ponta a ponta.
- Concorrência: duas requisições do mesmo usuário chegando juntas em processos diferentes, ambas com o
  documento sem carimbo, produzem duas escritas. É o pior caso aceito pelo desenho (sem transação), e
  nenhum teste fixa esse limite.
- Formato de data nos três idiomas está coberto por screenshot, não por asserção. O teste de componente
  só verifica `pt-br`.

## Riscos para o `/review`

- **17 arquivos de teste alterados** por uma linha cada. Volume alto no diff, mudança mecânica.
- **Latência**: `recordUserActivity` é aguardado dentro dos dois guards, então uma escrita no Firestore
  entra no caminho de toda requisição autenticada que abre janela. Segue o mesmo padrão do
  `recordImpersonationSession`, que já era aguardado ali.
- **Decisão de log acima** — o único ponto em que eu discordaria do plano.
- O diff atual carrega mudanças em `specs/` e o movimento de `specs/session-refresh.md` para
  `docs/features/session-refresh/spec.md`. Não são minhas: vieram do `/spec --sync` e do `/analyze`, mais
  cedo neste mesmo ciclo.

## Verificação

| comando | resultado |
|---------|-----------|
| `pnpm check` | 611 arquivos, sem correções pendentes |
| `pnpm turbo run lint typecheck test` | 24 tarefas, todas passando |
| `pnpm --filter api test` | 552 testes, 49 arquivos |
| `pnpm --filter app test` | 386 testes, 54 arquivos |
| `pnpm --filter @repo/internationalization test` | 27 testes, paridade dos 3 idiomas |

Nenhuma branch criada, nenhum commit. As mudanças estão na árvore de trabalho.
