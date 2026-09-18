# Revisão — Último acesso do usuário

Revisão do diff da feature contra `origin/main` (`cc93229`), rodada autônoma do `/cycle`. As três
afirmações de maior risco do handoff foram reverificadas do zero, com emulador de pé e leitura direta do
documento no Firestore, não pelo screenshot de terceiro.

## Branch

| item | valor |
|------|-------|
| nome | `feat/user-last-access` |
| origem | criada a partir de `singapore`, que estava em `cc93229` (mesmo commit de `origin/main`) |
| criada ou reutilizada | criada |
| validação do nome | passou no regex de `.claude/rules/git-commits.md`: `branch OK: feat/user-last-access` |

A branch anterior, `singapore`, não bate com `<project>/<type>/<title>`. Ela não tinha commit próprio
(`git log origin/main..HEAD` vazio) nem remoto, o que pelo procedimento padrão autorizaria renomear com
`git branch -m`. Não renomeei: `singapore` é o nome do workspace do Conductor, e as branches irmãs
(`casablanca`, `dubai`, `dublin`, `bangkok-v1`) seguem a mesma convenção, então o nome está amarrado a
ferramenta fora do escopo desta revisão. Criei a branch correta a partir dela e deixei o ponteiro antigo
onde estava.

Sem `project` no nome porque o diff atravessa `packages/sdk`, `apps/api`, `apps/app` e
`packages/internationalization`. É a mesma forma das entregas anteriores de fatia vertical
(`feat/audit-log`, `feat/dashboard-home`, `feat/cursor-pagination`).

## Achados

| sev | arquivo:linha | problema | ação |
|-----|---------------|----------|------|
| 🟡 | `packages/sdk/src/types/user/user.ts:22-26` | O comentário do contrato prometia "at most once per activity window". Medido, não é teto: duas requisições simultâneas do mesmo usuário na abertura da janela leem o perfil sem carimbo e gravam as duas. | Corrigido: o comentário agora descreve o caso normal e a corrida. |
| 🟡 | `docs/PRE-PRODUCTION.md:507` | "Esse número é o limite de escrita" repetia a mesma promessa, num documento que existe para o fork confiar. | Corrigido: a precisão ficou separada do custo, com a corrida e a medição escritas. |
| 🟡 | `apps/api/(shared)/lib/activity-recorder.ts:91-94` | `logEvent` no sucesso de cada escrita, em `console.warn`, herdado por todo fork. Decisão 8 do plano, com a qual o `/develop` registrou discordância. | Removido. Justificativa e medição abaixo. |
| 🟢 | `apps/api/app/(guards)/common-panel.ts:87` e `admin.ts:73` | `recordUserActivity` é aguardado dentro do guard, então a escrita de abertura de janela entra no caminho da requisição. | Sem ação: é o mesmo desenho de `recordImpersonationSession` (`common-panel.ts:92`), que já era aguardado ali, e acontece uma vez a cada 15 minutos por usuário. |
| 🟢 | `UsersListClient.tsx:44` | O estado aproximado se distingue por `title`, que leitor de tela não anuncia de forma confiável e touch não alcança. | Sem ação: mudar isso é decisão de design fora do raio da tarefa. Fica anotado. |
| 🟢 | `apps/app/next.config.ts:19` | O dev overlay do Next acusa 1 issue na listagem: `images.domains` está deprecado. | Pré-existente, fora do diff. |
| ✅ | `apps/api/(shared)/repositories/user.repository.ts:37-42` | `touchLastAccess` escreve direto no documento, fora do `update` do `BaseRepository`. | Conforme, e verificado contra o documento real (abaixo). |
| ✅ | `apps/api/app/(guards)/common-panel.ts:87` | Carimba `actorProfile`, depois de `assertReadOnlyWhileImpersonating` e de todas as recusas, inclusive a do `subjectProfile`. | Conforme. |
| ✅ | `apps/api/(shared)/lib/activity-recorder.ts:89` | `new Date(now)`, não `FieldValue.serverTimestamp()`. | Conforme ao §4.3 do plano. |
| ✅ | `apps/api/(shared)/lib/activity-recorder.ts:96-100` | Falha loga só nome do erro e status gRPC, nunca a mensagem. | Conforme, com teste dedicado. |
| ✅ | 17 arquivos de `apps/api/__tests__/` | `git diff --numstat` devolve `1 0` em cada um: uma linha acrescentada, zero removidas. Nenhuma asserção foi tocada, nenhum teste afrouxado. | Conforme. |
| ✅ | `firestore.indexes.json`, `firestore.rules`, `apiErrors` | Intactos. Nenhum código de erro novo, nenhum índice novo. | Conforme ao corte. |

Nada bloqueante.

## Correções aplicadas

1. `apps/api/(shared)/lib/activity-recorder.ts` — removida a linha `logEvent("account",
   "activity-stamped", …)` do caminho de sucesso. O log de falha continua.
2. `apps/api/__tests__/activityRecorder.test.ts` — o caso que cobrava uma linha de log por escrita passou
   a cobrar silêncio no sucesso (`expect(warned).toEqual([])`), mantendo a asserção de que a escrita
   aconteceu. Nenhum caso foi removido e a contagem de casos não mudou.
3. `apps/api/__tests__/guardsStampActivity.test.ts` — comentário do spy de `console.warn` atualizado: ele
   existe agora só para conter a linha de falha do caso de escrita recusada.
4. `packages/sdk/src/types/user/user.ts` — comentário do campo corrigido para não prometer teto que o
   desenho não entrega.
5. `docs/PRE-PRODUCTION.md` — a declaração ganhou um parágrafo de custo de escrita separado do de
   precisão, com o número medido nesta revisão.

## A decisão do `logEvent` no sucesso

Removido. O que pesou, medido nesta revisão:

- **Precedente**: 16 pontos de chamada de `logEvent` em código de produção, e nenhum loga sucesso de
  caminho feliz. O mais próximo é `webhook-unhandled-event`
  (`app/(routes)/webhooks/payments/route.ts:61`), que registra um evento que ninguém tratou. A lista
  saiu de `rg 'logEvent\('` com testes e `docs/` fora.
- **Volume**: `logEvent` escreve em `console.warn` (`packages/shared/utils/helpers/log.ts:56`), sem
  nível. Uma janela de 15 minutos dá até 4 linhas por hora por usuário ativo. Numa base de 1.000 ativos
  com 8 horas de uso, são ~32 mil linhas de `warn` por dia de tráfego saudável, herdadas por todo fork
  que ligar alerta nesse nível.
- **O que se perde**: a taxa de escrita deixa de aparecer no log da aplicação. Não deixa de ser
  observável: quem precisa do número lê a métrica de escrita da coleção `user` no Firestore, que é o
  sinal de cobrança de verdade, e a garantia continua provada pelo teste de cache frio.

A remoção foi verificada em execução, não só no teste: com a API de pé, retrocedi o `lastAccessAt` do
admin para `01:00:00Z` pela REST do emulador, disparei uma requisição autenticada e o documento voltou
com `lastAccessAt = 02:48:11.536Z` sem nenhuma linha nova no log.

## O que reverifiquei do handoff

### A janela de 15 minutos

O handoff afirmava 18 requisições autenticadas para 1 escrita. Medi mais alto e o resultado é melhor em
volume e pior em pureza: **110 requisições autenticadas produziram 3 escritas em duas janelas**.

- Janela `1789698600000` (02:30 UTC): 2 escritas, as duas do mesmo usuário e da mesma janela. Vieram de
  um par de `GET /users/summary` concorrentes na abertura, ambos com 3,4 s de compilação, que leram o
  perfil antes de qualquer escrita ter chegado. É a corrida que o handoff já listava como limite aceito
  do desenho, agora com evidência.
- Janela `1789699500000` (02:45 UTC): 1 escrita. A virada de janela em uso real é o item que o `/develop`
  declarou não ter validado; validei.

O mecanismo está onde o plano prometeu. `findByReferenceId` devolve o documento cru
(`user.repository.ts:27-30`), então o `lastAccessAt` chega como `Timestamp` e `isStampedInWindow`
(`activity-recorder.ts:38-46`) o lê por `normalizeFirestoreInstant`. A decisão de gravar sai do documento,
não do cache. O teste de cache frio existe e é real: `activityRecorder.test.ts:152-165` chama
`resetActivityDedupeCache()` antes de cada uma das 50 chamadas, com um `Timestamp` dentro da janela, e
cobra zero escritas.

### Carimba o ator, nunca o sujeito

Verificado ponta a ponta. Personifiquei `user2@example.com` a partir do admin e naveguei o painel comum
(home, entidades, home, entidades). Lendo a coleção `user` direto pela REST do emulador depois do
percurso:

```
common | lastAccessAt= ABSENT             | updatedAt= 2026-09-18T02:31:03.885Z
common | lastAccessAt= ABSENT             | updatedAt= 2026-09-18T02:31:03.911Z
admin  | lastAccessAt= 2026-09-18T02:45:19.234Z | updatedAt= 2026-09-18T02:31:03.764Z
```

Os dois perfis comuns seguem sem carimbo depois de terem sido personificados. Só o admin tem valor, e na
tela `user2@example.com` continua em "Nunca acessou".

O mesmo dump prova a outra afirmação: `updatedAt` do admin está no instante do seed (`02:31:03.764Z`)
enquanto o `lastAccessAt` marca `02:45:19.234Z`. O carimbo não passa pelo `BaseRepository.update`.

### Os três estados da coluna

Os três aparecem na mesma tela, com dado real do emulador, e nenhum mostra 1970 nem célula vazia:

| conta | estado | como apareceu |
|-------|--------|---------------|
| `admin@example.com` | carimbo próprio | `17 de set. de 2026, 23:33`, contraste normal |
| `user@example.com` | valor do provedor | `17 de set. de 2026, 23:36`, atenuado e em itálico |
| `user2@example.com` | nunca acessou | `Nunca acessou`, atenuado |

O segundo estado saiu de um caminho honesto: autentiquei `user@example.com` direto contra a REST do
emulador de Auth e troquei o refresh token, o que dá `metadata.lastRefreshTime` sem passar por guard
nenhum. O `title` conferido no DOM é `Valor aproximado, vindo do provedor de autenticação`, com classe
`text-muted-foreground italic`.

## Validação visual

App em 3000, API em 3002, emuladores Auth em 9099 e Firestore em 8080. As quatro portas estavam livres:
subi tudo, guardei os PIDs e derrubei no fim, com `lsof` confirmando que voltaram a sair vazias. Os
`.env.local` que apontaram os apps para o emulador foram apagados depois; o `.env` do usuário não foi
tocado. Comandos do `agent-browser` rodados em sequência.

Percorrido: login como `admin@example.com`, listagem do admin, auditoria, home do admin, troca de painel,
impersonação de `user2@example.com` com quatro navegações no painel comum, volta ao admin, busca por
`user2` na tabela.

| tema/viewport | resultado |
|---------------|-----------|
| dark, 1280×800 | os três estados legíveis; `Table` antd respeita o tema |
| light, 1280×800 | idem |
| mobile 390×844 | a tabela já rolava na horizontal antes desta mudança; com a sétima coluna continua rolando e a coluna de ações segue alcançável |
| `pt-br` / `en` / `es` | `Último acesso` / `Last access` / `Último acceso`; `Nunca acessou` / `Never accessed` / `Nunca accedió`; data no formato de cada idioma |

Contraste do texto atenuado, que o `/develop` declarou ter avaliado a olho, medido por amostragem de
pixel via canvas: **6,87:1 no dark** e **4,54:1 no light**, contra fundo `24,24,24` e `250,250,250`. Os
dois passam no AA da WCAG para texto normal, o light por pouco. O valor vem do token
`text-muted-foreground` do design system, que a tela já usava antes desta mudança, então o número é da
paleta e não da coluna.

Busca por nome e e-mail continua filtrando, com a coluna nova renderizando na linha filtrada. Sem erro de
hidratação no console. O dev overlay acusa 1 issue, que é o `images.domains` deprecado do
`apps/app/next.config.ts`, presente antes do diff.

Screenshots em `review/screenshots/`.

## Raio de impacto

`UserDTO.lastAccessAt` é opcional e aditivo, e `UserWithAuthDTO` herda dele (`user.ts:80`). Os consumidores
são `GET /users` e a listagem do admin. `mergeAuthAndFirestore` (`user.mapper.ts:59-68`) espalha as chaves
do Auth por cima das do Firestore, e `lastAccessAt` não é uma delas, então o campo sobrevive à mesclagem.
Nenhum consumidor faz destructuring exaustivo do type.

Os dois guards passam a escrever no Firestore em requisição autenticada. Isso alcança `apps/app` e
`apps/web`, qualquer `NEXT_PUBLIC_PRODUCT_MODE`, e todo usuário autenticado dos dois painéis. É o efeito
pretendido, e o custo é o da seção acima.

## Lacunas de teste para o `/test`

- Mutação autorizada de admin (`PUT`/`DELETE`) carimbando: os testes cobrem `GET` nos dois guards e a
  recusa de escrita sob impersonação, não uma mutação que passa.
- A corrida: duas requisições do mesmo usuário em processos diferentes, ambas com o documento sem
  carimbo, produzem duas escritas. Agora está medida, mas nenhum teste fixa esse limite.
- Formato de data em `en` e `es`: coberto por screenshot, não por asserção. O teste de componente só
  verifica `pt-br`.
- `activityRecorder.test.ts` não exercita o descarte do cache em `DEDUPE_CACHE_MAX` (500 chaves).

## Decisões em aberto

1. **Branch `singapore` continua existindo, apontando para `cc93229`.** Recomendação: apagar depois do
   merge, ou deixar como está se o Conductor precisar dela. Não mexi.
2. **`title` como único veículo do aviso de valor aproximado.** Recomendação: manter neste corte e
   revisitar quando a coluna tiver uma origem só, que é quando o aviso deixa de ser necessário.

## Gates

Medidos nesta revisão, depois das correções.

| comando | resultado |
|---------|-----------|
| `pnpm turbo run lint typecheck test --force` | 24/24 tasks, 0 em cache, 46,1 s |
| `pnpm check` | 611 arquivos, nenhuma correção pendente |
| `pnpm --filter api test` | 562 testes em 50 arquivos |
| `pnpm --filter app test` | 386 testes em 54 arquivos |
| `pnpm --filter @repo/internationalization test` | 27 testes em 3 arquivos, paridade dos 3 idiomas |

## Plano de commits proposto

Branch: `feat/user-last-access`. Nenhum commit foi feito por esta revisão.

| # | mensagem | arquivos |
|---|----------|----------|
| 1 | `feat(sdk): add last access instant to the user profile contract` | `packages/sdk/src/types/user/user.ts` |
| 2 | `feat(api): stamp profile activity within a fixed window` | `apps/api/(shared)/lib/activity-recorder.ts`, `apps/api/(shared)/repositories/user.repository.ts`, `apps/api/__tests__/activityRecorder.test.ts` |
| 3 | `feat(api): record the acting user's activity in the auth guards` | `apps/api/app/(guards)/common-panel.ts`, `apps/api/app/(guards)/admin.ts`, `apps/api/__tests__/guardsStampActivity.test.ts` |
| 4 | `test(api): add the user repository stamp to the mocked repository factories` | os 17 arquivos de `apps/api/__tests__/` com uma linha cada |
| 5 | `feat(app): show last access in the admin user listing` | `apps/app/.../UsersListClient.tsx`, `apps/app/__tests__/usersListLastAccess.test.tsx` |
| 6 | `feat(internationalization): add last access column copy` | `packages/internationalization/translations/apps/app/pages/admin/users.ts` |
| 7 | `docs(specs): reconcile the backlog with the delivered specs` | `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/admin-analytics-dashboard.md`, `specs/e2e-testing.md`, `specs/onboarding-flow.md`, `specs/user-activity-tracking.md`, `specs/session-refresh.md` → `docs/features/session-refresh/spec.md` |
| 8 | `docs: refresh the gate measurements and declare the last access stamp` | `docs/PRE-PRODUCTION.md` |
| 9 | `docs(features): user-activity-tracking` | `docs/features/user-activity-tracking/` |

Notas sobre a ordem e o escopo:

- 1 a 6 seguem a dependência `packages/sdk` → `apps/api` → `apps/app` →
  `packages/internationalization`.
- O commit 4 separa as 17 factories de `vi.mock` do commit que criou a necessidade delas. São arquivos de
  assunto alheio e uma linha cada; misturá-los ao commit 3 esconderia a rota e o guard debaixo de 17
  arquivos de ruído.
- O commit 7 é do `/spec --sync`, não do desenvolvimento desta feature. O `git mv` de
  `specs/session-refresh.md` vai junto porque é a mesma auditoria.
- O commit 8 é misto de propósito: a auditoria corrigiu os números de gate e a feature acrescentou a
  declaração do dado pessoal, e as duas coisas caíram no mesmo arquivo. Separar exigiria `git add -p`;
  a mensagem registra os dois assuntos.
- O commit 9 é o último e leva os artefatos do fluxo, incluindo este arquivo. Nenhuma credencial neles:
  as contas são `example.com` e a senha do seed já está publicada em `docs/SETUP.md`.

Título de PR sugerido: `feat: last access column for the admin user listing`.

Depois do último commit aprovado, perguntar ao usuário se deve sincronizar com
`git push -u origin feat/user-last-access`.

## Commits realizados

(preenchido pelo orquestrador do `/review` depois de commitar)
