# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-19 (`/spec --sync`, pós-merge da PR #21) · anteriores: 2026-09-17 (PR #20) ·
> 2026-09-17 (PR #19) · 2026-09-17 (PR #18) · 2026-09-16 (PR #17) · 2026-09-16 (PR #16) ·
> 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 · 2026-09-14 · 2026-09-11 · 2026-09-10 ·
> 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 ·
> **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`user-activity-tracking` foi entregue e arquivada.** Era o #1 desta lista. PR #21 mergeada em `main`
>    (`e656331`), CI `success` no SHA de merge. Cinco dos seis itens do corte foram reabertos um a um no
>    código; o sexto fechou parcial, e o porquê está em [Entregues](#entregues). É a décima quarta spec a
>    sair da fila, e vive agora em
>    [`docs/features/user-activity-tracking/spec.md`](../docs/features/user-activity-tracking/spec.md).
> 2. **A entrega não seguiu o caminho que a spec recomendava, e o desvio mede melhor.** A spec mandava
>    carimbar no ramo `{ refreshed: true }` da renovação de sessão, reusando o throttle dela como janela. A
>    implementação pôs o gancho nos **guards da API** e construiu uma janela própria de 15 minutos. O
>    gatilho passou de "uma renovação de cookie" para "toda requisição autenticada" — que é o que a
>    pergunta "quem ainda usa isto" de fato pede. Três derivas registradas na spec arquivada.
> 3. **`account-security-mfa` está em 1,5 de 6, não em zero — e este backlog disse "nada implementado" por
>    quatro rodadas.** É uma **entrega parcial órfã**: a PR #12 fechou o item 1 (janela de revogação) e
>    metade do item 3 (revogar sessões, tudo-ou-nada). A própria spec já registrava isso com evidência; o
>    índice é que não leu. Ver [Achados](#-achados-novos).
> 4. **O CI da PR #21 fechou vermelho por um teste instável**, não por regressão — e a asserção culpada
>    está em `main` desde a PR #4. Primeira falha de CI mensurável causada por *flake* neste repositório.
>    Ver [Achados](#-achados-novos).
> 5. **Arquivar uma spec quebra os links que saem dela, e isso nunca foi corrigido**: **17 links mortos em
>    11 das 13 specs arquivadas**. A `/spec-audit` §4.1 manda varrer quem apontava *para* a spec e não manda
>    varrer o que a spec aponta. A spec arquivada hoje saiu com os 8 links resolvendo — é a primeira.
> 6. **Sete âncoras deslocadas e cinco contagens erradas em seis specs**, corrigidas no disco. Duas das
>    contagens estavam erradas por **omissão**, não por envelhecimento — e uma delas há duas rodadas.

## Contadores

Sobre as **9 specs que seguem em `specs/`**. Recontados do disco em 2026-09-19, lendo o frontmatter de cada
arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 7 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 14 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 4 · `confianca` 2 · `dx` 2 (+1 `deferred` em `produto`). **Por esforço:**
P 0 · M 6 · G 3. **Por valor:** alto 5 · médio 4 · baixo 0.

**Transições aplicadas: 1** (`user-activity-tracking`: `proposed` → `done`, arquivada). Nenhuma spec nova
entrou: esta rodada é `--sync` puro.

> **A fila encolheu de novo por subtração, pela terceira rodada seguida** — 11, 10, agora 9. O que não
> muda é o eixo de ferramental: `e2e-testing` e `observability-logging` seguem paradas, a primeira por
> esforço G e a segunda por uma decisão que não chega há **sete** rodadas. A diferença desta vez é que a
> `e2e-testing` ganhou o argumento concreto que lhe faltava, e ele veio de graça: o CI ficou vermelho por
> um teste instável.

### O caso `user-activity-tracking` — o que foi conferido antes de arquivar

PR **#21** mergeada em `main` em 2026-09-19T16:53:15Z (merge commit `e656331`), com CI `success` nesse SHA
(`gh run 35456359790`). Os seis itens do corte, reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Coluna de último acesso, por idioma, com estado para quem nunca acessou | **implementado** | A tabela passou de 6 para **7 colunas**; o objeto começa em `UsersListClient.tsx:125`, `dataIndex: "lastAccessAt"` em `:127`. Formatação em `apps/app/shared/lib/formatDisplayDateTime.ts:24`, mapa de locales em `:6-14`. Rótulo de "nunca acessou" em `UsersListClient.tsx:58-62` |
| 2. Instante no perfil, carimbado pelo servidor, exposto no SDK | **implementado** | `lastAccessAt` em `packages/sdk/src/types/user/user.ts:27`. Escrita em `apps/api/(shared)/repositories/user.repository.ts:37-42`, fora de `BaseRepository.update` para não mexer no `updatedAt`. Instante do servidor em `apps/api/(shared)/lib/activity-recorder.ts:89` |
| 3. Janela de gravação, valor único, documentado | **implementado** | `ACTIVITY_WINDOW_MINUTES = 15` em `activity-windows.ts:8`, definição única confirmada por `grep`. Descarte (não fila) em `activity-recorder.ts:71-73` e `:78-81`. O número está em `docs/PRE-PRODUCTION.md:536-539` |
| 4. O campo entra no export e na exclusão de conta | **parcial** | A declaração foi entregue (`docs/PRE-PRODUCTION.md:497-504`), inclusive dizendo o que ainda não é verdade. O comportamento não existe **e não podia existir**: não há rota de export, `account/route.ts` não tem `DELETE` (só `GET:97` e `PUT:107`), e o `delete()` herdado é soft delete (`base.repository.ts:205-207`) |
| 5. Finalidade e retenção em `docs/PRE-PRODUCTION.md` | **implementado** | Seção em `:481`; finalidade em `:485-486`, retenção em `:494-495`, e o argumento de por que o prazo do Marco Civil não se aplica em `:488-492` |
| 6. Texto da coluna e do estado vazio nos 3 idiomas | **implementado** | `translations/apps/app/pages/admin/users.ts` — pt-br `:13,17,18-19`, en `:63,67,68-69`, es `:113,117,118` |

Cobertura somada: 25 casos em `activityRecorder.test.ts`, 14 em `guardsStampActivity.test.ts`, 9 em
`usersListLastAccess.test.tsx`, 3 em `baseRepository.test.ts:806`.

**Por que fecha com o item 4 parcial.** A metade construível — declarar a costura por escrito — foi
entregue. A outra metade depende de duas superfícies que não existem no repositório, e manter a spec aberta
por ela criaria um estado absorvente: o item só fecharia quando `data-rights-lgpd` entregasse, e enquanto
isso `admin-analytics-dashboard` continuaria se declarando bloqueada por algo que já está em `main`. Há
precedente — `ci-pipeline` foi arquivada com um item em aberto. **Em troca, a obrigação foi transferida**:
[`data-rights-lgpd`](data-rights-lgpd.md) passou a listar `lastAccessAt` entre o que o export e a exclusão
precisam cobrir. Se você discordar do fechamento, é reversível: ver [Precisam de decisão](#precisam-de-decisão) nº 2.

## Gates — medidos nesta auditoria

Executados agora, com `--force`, neste workspace, com o `HEAD` em `e656331`. Não copiados do `/test` nem da
rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **611 arquivos · 0 erros** (`No fixes applied`, 410 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 54,2 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-17 (PR #20) |
|-----------|---------:|-------:|---------------------------|
| `api` | 50 | 576 | **+2 arquivos · +44** |
| `app` | 54 | 389 | **+1 arquivo · +9** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 8 | 101 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `web` | 5 | 31 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **137** | **1378** | **+3 arquivos · +53 testes** |

A PR #21 não criou workspace novo, então as 24 tasks e as **10** configs de Vitest ficaram onde estavam. O
`pnpm check` subiu de 607 para **611** arquivos. As 10 configs seguem declarando `testTimeout: 20_000`.

> ⚠️ **O gate verde de hoje não prova estabilidade, e isso deixou de ser teórico nesta rodada.** A execução
> de CI da **PR #21 antes do merge** (`gh run 35456187047`, branch `feat/user-last-access`) fechou
> **`failure`** com 1 teste de 576 quebrado em `apps/api`. Não era regressão: era
> `apps/api/__tests__/baseRepository.test.ts:477` afirmando `created.updatedAt === created.createdAt`
> enquanto `apps/api/(shared)/repositories/base.repository.ts:150-151` produz os dois instantes com **duas
> chamadas separadas a `new Date()`**. Na virada do milissegundo eles diferem — e diferiram
> (`'…:32.532Z'` contra `'…:32.531Z'`). A asserção está em `main` desde a PR #4 e ficou latente 17 PRs.
> **Rodar a suíte uma vez não distingue teste que passa de teste que passa quase sempre**, e nenhum gate
> deste repositório mede isso. Virou [achado](#-achados-novos) com `arquivo:linha`.

CI: a execução de merge de **#21** (`e656331`) está em **`success`**. `git log origin/main -1` devolve
`e656331` e o `HEAD` local é o mesmo commit — nenhum commit do repositório está fora de `main`.

O branch protection continua **não ligado**, remedido hoje:
`gh api repos/:owner/:repo/branches/main/protection` → **404**, `rulesets` → **`[]`**. O repositório já tem
**21** PRs.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Uma spec segue bloqueada por dependência** — eram duas até o merge da PR #21.

> **O critério de execução continua valendo: o que uma rodada autônoma consegue provar.** O `/cycle` não
> provisiona infraestrutura, então uma spec cujos critérios de aceite dependem de conta em provedor volta
> com metade dos critérios "não verificados". Isso não a torna menos valiosa — torna-a má escolha para
> **esta** forma de execução, e a distinção precisa estar escrita para não virar preconceito silencioso.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | **Destravada ontem, e a entrega que a destravou já deixou o dado na tela.** Era o pedido original do usuário — KPIs de ativos e inativos, mais o gráfico de acesso — e a última dependência fechou com a PR #21. O eixo temporal existe agora: `lastAccessAt` no `UserDTO` (`packages/sdk/src/types/user/user.ts:27`), carimbado pelos guards (`admin.ts:73`, `common-panel.ts:87`) e já renderizado em `UsersListClient.tsx:127`. **O que falta é agregar**, sobre um molde que está inteiro em `main`: `users/summary/route.ts:6-20` (rota de agregado com degradação traduzível), `base.repository.ts:122-124` (`countQuery`, que conta sem ler documento), `MetricCard.tsx:11-17`, `category-bar-chart.tsx:25-72` e `queryKeys.ts:42`. Verificável inteira sob o emulador, sem conta em provedor e sem variável nova. ⚠️ **Herda a folga de 15 min** do carimbo (`activity-windows.ts:8`), e o corte manda escrever isso na tela. **O item de visitas à `apps/web` segue fora do corte**, como pergunta em aberto com o custo das três saídas — nenhuma decidida, nenhuma com preço levantado. |
| 2 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze`, e é isso que a segura pela quinta rodada.** Valor alto, esforço M e zero dependência de infra externa — o melhor perfil bruto da fila. O item 2 continua oco desde que a PR #12 passou a coletar nome e idioma na área de conta. E o custo que ela não orçava **cresceu de novo, agora por medição e não por entrega nova**: a spec dizia quatro caminhos de decisão de destino, depois cinco; a recontagem de 2026-09-19 achou **seis no cliente e nove contando o servidor**. O erro era de método — a contagem colapsava `redirectPath` e `resolvePostLoginPath` numa função só e ignorava as três decisões server-side, incluindo `(common)/layout.tsx:31-34`, que é **o único desvio de destino já implementado no servidor** e justamente o padrão que o onboarding deveria seguir. O problema é o corte, não as referências. |
| 3 | [`data-rights-lgpd`](data-rights-lgpd.md) | **Maior valor do backlog e a única com prazo imposto de fora.** Segue em 0/5, reconferido. A armadilha dos objetos órfãos continua dobrada: `deleteObjectQuietly` tem **2** call sites de produção (`entities/[id]/route.ts:90` e `account/route.ts:158`), ambos de troca, nenhum de expurgo; e o `delete()` herdado é soft delete (`base.repository.ts:205-207`). 🆕 **Ganhou escopo nesta rodada, e de graça:** herdou a obrigação de cobrir `lastAccessAt` no export e na exclusão — o item 4 que `user-activity-tracking` não pôde fechar. O custo é próximo de zero, porque o campo vive no mesmo documento de perfil que o export já vai tratar. O que a tira do topo continua sendo esforço **G** somado a verificabilidade: o item 3 exige limpar arquivos **e** cancelar assinatura no mesmo fluxo, e as duas pontas dependem de infra que não existe. ⚠️ **Terceira rodada empurrada.** |
| 4 | [`account-security-mfa`](account-security-mfa.md) | 🆕 **Está mais adiantada do que este índice vinha dizendo: 1,5 de 6, não zero.** A medição de 2026-09-19 confirmou o que a própria spec já registrava — o item 1 (fechar a janela de revogação) foi entregue pela PR #12 em `packages/auth/server.ts:153-166`, aplicado em `getCurrentUser:182`, com 9 casos em `serverSessionRevocation.test.ts`; e metade do item 3 existe em `POST /account/sessions/revoke` (`route.ts:7` → SDK `action.ts:49` → UI `AccountSecurityForm.tsx:137`), tudo-ou-nada por limite do Firebase, confessado em `AccountSecurityForm.tsx:53`. Continua `value: médio` por mérito próprio (MFA em **3/10** dos starters pesquisados, sessões gerenciáveis em **1/10**) e o item 4 segue sendo mudança de contrato em **10 declarações** de `MIN_PASSWORD_LENGTH`, reconferidas hoje, sendo as 3 que importam em `apps/api`. O custo de MFA no GCIP segue **não confirmado**. |
| 5 | [`e2e-testing`](e2e-testing.md) | 🆕 **Recuperou o argumento que tinha perdido, e desta vez com número.** O gate instável corrigido pela PR #13 tinha esvaziado o caso; agora o CI da PR #21 fechou vermelho por um teste de milissegundo latente desde a PR #4. O resto do argumento é o de sempre e segue medido: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, **nenhuma** das 10 configs medindo cobertura, e **duas rules files sem um único teste de regra** (`firestore.rules` publicado em deny-all, `storage.rules` nem publicado). E a revogação de sessão entregue na PR #20 segue **🔒 não verificada** porque o emulador de Auth aceita o cookie depois de `revokeRefreshTokens` — limite do emulador, não de disciplina. Esforço **G** é o que a mantém aqui. |
| 6 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto do backlog e ainda em **0/6**, reconferido hoje: não existe diretório `payments/` entre as 22 rotas, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, o SDK registra 7 actions e nenhuma é `payments`, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`) sem dedupe por `event.id`. **Segue atrás por execução, não por mérito:** provar checkout, portal e webhook exige chaves reais da Stripe, e uma rodada autônoma devolveria os critérios como "não verificados". **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 7 | [`admin-billing-insights`](admin-billing-insights.md) | Bloqueada, e **é a única que ainda está**. Logo atrás da spec que a destrava, e essa é a razão de existir separada: `billing-subscription` está em 0/6. Juntá-la ao #1 faria os KPIs de atividade — construíveis hoje — nascerem bloqueados por Stripe. Herda também o motivo de execução do #6. **O risco que ela carrega é de correção, não de esforço**: agregar receita a partir de webhook sem dedupe por `event.id` infla o número em silêncio, porque a Stripe não garante ordem nem entrega única. |
| 8 | [`observability-logging`](observability-logging.md) | `in-progress`. Entregue em 5 dos 6 itens, **reconferidos um a um nesta rodada** e não herdados do índice; o resíduo é adotar um coletor de erro, que depende de decisão de produto e de conta em provedor. **Fora do conjunto elegível** — ver [Precisam de decisão](#precisam-de-decisão). **Sétima rodada consecutiva sem resposta.** 🆕 E o problema que ela descreve piorou sozinho: as chamadas de `console` cru em `packages/auth/server.ts` subiram de 5 para **7**, porque a PR #20 acrescentou duas ao arquivo que esta spec vinha apontando. |
| 9 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora pela **nona** rodada. 🆕 E o número que sustenta o argumento estava errado: são **14 sítios** de posse por usuário, não 13 — a contagem pulava o `where("userId")` de `listByUserId` (`entity.repository.ts:23`), que a spec descreve em prosa e nunca numerou. Ver [Precisam de decisão](#precisam-de-decisão). |

### O que **não** foi escolhido para #1, e por quê

- **`onboarding-flow` foi a segunda, e perde pelo mesmo motivo mecânico da rodada passada — com o custo
  maior.** Valor alto, esforço M, e é a única das três primeiras que não toca em infra externa nenhuma. O
  corte de MVP está desatualizado, e uma rodada autônoma planejaria em cima dele sem perceber. **Quinta
  rodada em que essa reescrita é recomendada e não acontece**, e desta vez a medição mostrou que o buraco
  é maior do que se pensava: nove pontos de decisão de destino, não cinco, e o mais importante deles
  (`(common)/layout.tsx:31-34`) a spec nem sabia que existia. Rodar `/spec onboarding-flow` antes e ela
  passa à frente.
- **`data-rights-lgpd` foi a terceira, e perde por verificabilidade somada a esforço — pela terceira vez.**
  É a única spec do backlog com prazo imposto de fora, e o argumento dela só piora com o tempo. O que a
  tira do topo **nesta** forma de execução não é só o esforço **G**: o item 3 pede que a exclusão cancele
  assinatura e limpe arquivos "no mesmo fluxo", e **nenhuma das duas pontas existe de forma verificável** —
  o Cloud Storage não está ativado e não há fluxo de assinatura. Uma rodada autônoma entregaria o export e
  o delete e deixaria a coordenação, que é a parte difícil, por provar. Se a execução deixar de ser
  autônoma, ela é a candidata natural ao topo. ⚠️ **Três rodadas empurrando uma spec com prazo legal é
  decisão por omissão** — virou a [decisão nº 1](#precisam-de-decisão), com prazo.
- **Escolher uma spec `value: médio` para o #1 é uma decisão, não um descuido — e é a segunda vez
  seguida.** `admin-analytics-dashboard` vale menos no papel que `onboarding-flow` e `data-rights-lgpd`, e
  ganha por três motivos que só valem **hoje**: a última dependência dela fechou ontem, a entrega que a
  destravou deixou o dado carimbado e já na tela, e ela é a única das três que uma rodada autônoma
  consegue provar inteira. O padrão de repetir essa escolha é o que precisa de atenção, não a escolha em si.

### O que o merge da PR #21 mudou no ranking

`user-activity-tracking` era o último nó de que `admin-analytics-dashboard` dependia. Ao sair, ela
**destravou uma spec** — que subiu direto de #5 para #1 — e **liberou dois arquivos** do `contends_on`
coletivo: `packages/sdk/src/types/user/user.ts` caiu de 3 para 2 citações e
`apps/api/(shared)/repositories/user.repository.ts` de 2 para 1.

É a terceira entrega seguida que destrava alguém, e o padrão das três é o mesmo: **uma entrega destrava de
fato quando fecha a última dependência de alguém**, não quando fecha uma qualquer. A PR #19 fechou uma das
duas dependências das specs de painel e não bastou; a #20 fechou a única de `user-activity-tracking` e
bastou; a #21 fechou a última de `admin-analytics-dashboard` e bastou.

**Sobra uma só spec bloqueada no backlog inteiro** — `admin-billing-insights`, esperando
`billing-subscription`. É o menor número desde a semeadura.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-19** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis agora: 6 de 9.** Fora ficam `teams-organizations` (`deferred`), `observability-logging`
(`in-progress`) e `admin-billing-insights` (espera `billing-subscription`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `admin-analytics-dashboard` · `onboarding-flow` · `account-security-mfa` | `AdminHomeClient.tsx` + `queryKeys.ts` + `users/summary/route.ts` + `firestore.indexes.json` · `apps/app/proxy.ts` + `postLoginNavigation.ts` + `user-merge.ts` + `UserDTO` · `packages/auth/*` + `resolve-api-actor.ts` | **home do admin**, **desvio de navegação** e **camada de credencial**. A primeira vive na tela de resumo e na rota de agregado, a segunda no caminho de entrada do app, a terceira dentro do pacote de autenticação |
| **2** | `data-rights-lgpd` · `e2e-testing` · `billing-subscription` | `base.repository.ts` + `packages/auth/server.ts` + `firestore.indexes.json` · `package.json` da raiz + `turbo.json` + `ci.yml` · webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` | **expurgo do titular**, **ferramental da raiz** e **assinatura**. A do meio não toca em `apps/` nem em `packages/`; as outras duas vivem em camadas diferentes e não compartilham arquivo |

**Dois lotes de 3, pela primeira vez.** Nas rodadas anteriores sempre sobrava uma spec isolada por colisão
de dado; desta vez a saída de `user-activity-tracking` liberou os dois arquivos que produziam esse
isolamento.

### Por que cada spec ficou fora do lote 1, nominalmente

- **`data-rights-lgpd` colide com `admin-analytics-dashboard`** em `firestore.indexes.json`. As duas
  precisam de índice composto novo — uma para contar por instante, outra para varrer o que expurgar.
- **`billing-subscription` colide com `onboarding-flow`** em `packages/sdk/src/types/user/user.ts`. As duas
  acrescentam campo ao `UserDTO`.
- **`e2e-testing` ficou de fora sem colisão nenhuma** — foi barrada só pelo **teto de 3**. É informação
  diferente das duas acima: se o teto subisse para 4, ela entraria no lote 1 sem qualquer conflito. É a
  quinta rodada seguida em que ela é disjunta de tudo, e continua sendo a única spec do backlog que não
  toca em `apps/` nem em `packages/`.

### O que mudou no cálculo, e por quê

- **`admin-analytics-dashboard` entrou no conjunto elegível** pela primeira vez desde que nasceu. Estava
  barrada por `depends_on`, não por contenção.
- **`billing-subscription` deixou de ser a spec isolada.** Ela perdeu uma colisão: `user.repository.ts`
  era disputado com `user-activity-tracking`, que saiu da fila. Sobra a colisão com `onboarding-flow` no
  `UserDTO`, que a tira do lote 1 mas a deixa emparelhar no lote 2.
- **`account-security-mfa` seguiu no lote com companhia**, segunda rodada. A colisão com
  `data-rights-lgpd` em `packages/auth/server.ts` continua, e é o que separa as duas em lotes diferentes.

**Os arquivos mais disputados entre as 9 specs, recontados:** `firestore.indexes.json` com **3** citações
(`data-rights-lgpd`, `teams-organizations`, `admin-analytics-dashboard`) é o único acima de 2.
`packages/sdk/src/types/user/user.ts` **caiu de 3 para 2** (`billing-subscription`, `onboarding-flow`) e
`apps/api/(shared)/repositories/user.repository.ts` **de 2 para 1** — as duas quedas pela mesma entrega.
`packages/auth/server.ts` segue em 2 (`data-rights-lgpd`, `account-security-mfa`).

> **O aviso das rodadas anteriores caiu pela metade.** As duas specs de painel disputavam entre si o
> `AdminHomeClient.tsx` e o `queryKeys.ts`, e por isso não poderiam rodar no mesmo lote. Elas continuam sem
> poder — mas agora só uma delas é elegível, então a restrição não morde nesta rodada. Ela volta a morder
> no dia em que `billing-subscription` entregar.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou.

A régua desta rodada, com `user-activity-tracking` como amostra: ela declarava **3** arquivos em
`contends_on` — `packages/sdk/src/types/user/user.ts`, `apps/api/(shared)/repositories/user.repository.ts`
e `UsersListClient.tsx` — e **acertou os três**. Terceira previsão cheia seguida.

Mas a PR tocou 65 arquivos, e o raio extra inclui dois casos que importam e que **nenhuma spec declarava**:
`apps/api/app/(guards)/admin.ts` e `common-panel.ts`. Os guards são o lugar onde o carimbo acabou nascendo —
ou seja, o arquivo mais central da entrega estava fora da previsão.

**O erro por falta se repetiu pela terceira vez, e o padrão agora é claro.** Na rodada de 2026-09-16 o
`contends_on` errou por falta em dois repositórios; na de 2026-09-17, num provider; nesta, em dois guards.
Nos três casos o arquivo esquecido é **vizinho** dos declarados, na mesma camada. A regra prática continua
a mesma e continua não sendo seguida: ao declarar `contends_on`, **declare a camada, não os arquivos que
você lembra dela**.

## Precisam de decisão

Nenhuma delas é da auditoria. Todas têm recomendação, e nenhuma foi aplicada.

> ⚠️ **Seis destes itens se repetem há duas rodadas ou mais e, pela
> [§5.1 da `cycle-policy`](../.claude/cycle-policy.md), deveriam ter saído do limbo.** Estão marcados com
> 🔁 e a coluna de recomendação diz **por qual dos três caminhos** cada um sai: virar linha de política,
> virar entrada em `docs/PRE-PRODUCTION.md`, ou virar achado com `arquivo:linha`. Item que continua
> circulando como "recomendação" é a terceira categoria fingindo ser as outras duas — e esta seção já é
> quase toda ela.

| # | questão | recomendação |
|---|---------|--------------|
| 1 | 🔁 **`data-rights-lgpd` continua atrás da cadeia pedida?** ⚠️ **Terceira rodada seguida empurrando a única spec com prazo imposto de fora.** A auditoria recomenda `admin-analytics-dashboard` como #1 e `data-rights-lgpd` como #3 — a primeira é `value: médio`, a segunda é `alto` | **Manter a ordem, mas com data marcada, e a data é esta rodada.** O argumento técnico não mudou: `data-rights-lgpd` perde 2 de 5 critérios para infra que não existe (Cloud Storage e fluxo de assinatura), e uma rodada autônoma devolveria a coordenação — a parte difícil — por provar. O que mudou é a contagem: **três adiamentos consecutivos pelo mesmo motivo já não são priorização, são omissão.** Saída pela §5.1: escolha **uma** das duas — ou ela vira o #1 da próxima rodada independentemente do resultado, ou fica escrito em `docs/PRE-PRODUCTION.md` que o repositório assume o risco de não ter direitos do titular até `billing-subscription` e o Cloud Storage existirem. Continuar decidindo "mês que vem" é a terceira opção, e é a única errada |
| 2 | 🆕 **`user-activity-tracking` fecha como `done` com o item 4 parcial?** Foi o que a auditoria aplicou: 5 itens confirmados, o 6º entregue só na metade declarativa porque não há export nem exclusão real onde ligar o campo. **É a única transição desta rodada e é reversível** | **Manter fechada.** A metade construível foi entregue e a outra metade foi **transferida por escrito** para [`data-rights-lgpd`](data-rights-lgpd.md), que agora lista `lastAccessAt` no corte. O precedente existe (`ci-pipeline` fechou com um item aberto). Manter aberta custaria caro de um jeito específico: o item só fecharia quando outra spec entregasse, e enquanto isso `admin-analytics-dashboard` — hoje o #1 — continuaria marcada como bloqueada por algo que está em `main` desde ontem. Se você preferir o rigor literal, o desfazimento é `git mv` de volta e `status: in-progress` |
| 3 | 🔁 **`observability-logging` fecha como entregue?** 5 dos 6 itens estão no código, **reconferidos um a um nesta rodada**; o que falta é adotar um coletor de erro, que exige conta em provedor e é a pergunta em aberto nº 1 da própria spec. **Sétima rodada consecutiva sem resposta** | **Fechar como `done`** e abrir uma spec nova de esforço P só para o coletor. Saída pela §5.1: esta é decisão de produto, então ela vira **entrada em `docs/PRE-PRODUCTION.md` §11 com dono e data** e **para de ser reapresentada** até você mexer. O custo da indecisão é medível e vem se acumulando: a spec fica fora dos lotes paralelos, ou seja, **um workspace a menos por noite, há sete rodadas**. 🆕 E o problema que ela descreve piorou sozinho — `packages/auth/server.ts` foi de 5 para 7 `console` crus, porque a PR #20 acrescentou dois ao arquivo que a spec vinha apontando |
| 4 | 🔁 **`teams-organizations` continua `deferred`?** Trinta e oito dias e nove PRs sem nenhuma das duas contrapartidas de esforço P que tornavam o adiamento honesto. **O gatilho escrito na própria spec disparou e já se repetiu cinco vezes** | Ou as contrapartidas viram tarefa com dono, ou o status vira `rejected` até aparecer o primeiro fork B2B. Saída pela §5.1: as duas contrapartidas **são pequenas e concretas**, então viram achado com `arquivo:linha` no backlog (já estão: `docs/ARCHITECTURE.md` sem declaração B2B/B2C, e os 14 sítios de posse). O que precisa de você é só o status. 🆕 **O número que sustentava o argumento estava errado**: são **14** sítios, não 13 — a contagem pulava `entity.repository.ts:23`. Corrigido na spec |
| 5 | 🔁 **Ligar o branch protection na `main`?** O pré-requisito caiu na PR #13. Remedido hoje: `protection` → 404, `rulesets` → `[]`. Uma PR vermelha pode ser mergeada, e **uma foi**: a #21 mergeou com a execução de CI da branch em `failure` | ⚠️ **Ligar, mas conserte o teste instável primeiro — nesta ordem.** A decisão ganhou uma dependência que não tinha: com `apps/api/__tests__/baseRepository.test.ts:477` como está, exigir o check do CI transformaria um *flake* de milissegundo em merge bloqueado ao acaso, e a reação previsível seria desligar a proteção de novo. O conserto é de uma linha (`const now = new Date()` em `base.repository.ts:150-151`). Feito isso, ligar custa minutos, e o risco de adiar cresce com o número de PRs — já são **21** |
| 6 | 🔁 **`onboarding-flow` e `account-security-mfa` precisam de reescopo antes do `/analyze`.** **Quinta rodada em que isso custa posição no ranking** | Rodar `/spec <id>` nas duas antes de planejar. Saída pela §5.1: isto é **decisão técnica dentro do mandato do ciclo** e deveria virar linha de política — *spec cujo corte foi contestado pela auditoria não entra em `/analyze` sem reescopo*. 🆕 A rodada de hoje deu a prova de por quê: a recontagem achou **nove** pontos de decisão de destino em `onboarding-flow` contra os cinco que a spec declarava, e a `account-security-mfa` está em **1,5/6** enquanto este índice dizia zero. Planejar sobre qualquer um dos dois números produziria o plano errado |
| 7 | 🔁 **O gate de aprovação de spec não está sendo usado — assumir isso ou passar a usá-lo.** Todas as specs nascem `proposed` e continuam, porque o `/spec` não aprova. **Duas specs seguidas foram planejadas, implementadas e mergeadas sem nunca sair de `proposed`** (`session-refresh` e `user-activity-tracking`), e o `/cycle` fez isso sem reclamar | **Assumir.** Saída pela §5.1: o gate existe no contrato (`README.md`) e não existe na prática há duas entregas — isso não é backlog desatualizado, é uma regra morta. Duas saídas honestas: (a) remover `approved` do ciclo de vida e tratar `proposed` como "pronta para planejar", ou (b) fazer o `/cycle` recusar spec não aprovada. **Recomendo (a)**, porque é o que já acontece e porque o gate real de qualidade tem sido a auditoria, não o status. Enquanto isso não for decidido, aprovar [`admin-analytics-dashboard`](admin-analytics-dashboard.md), que é o #1 e está destravada |
| 8 | 🔁 **O teto absoluto da sessão pode ser ultrapassado por até meia vida de cookie.** A entrega da PR #20 verifica o teto **depois** do limiar de renovação, então uma sessão sobrevive ao teto por até 32,5 dias com os padrões de 5 e 30. **Segunda rodada** | **Manter como está, e escrever o número onde um fork o leia.** Inverter a ordem custaria uma chamada ao provedor em toda navegação. Saída pela §5.1: vira **entrada em `docs/PRE-PRODUCTION.md`**, junto de `SESSION_ABSOLUTE_MAX_AGE_DAYS`, que também não está lá. Hoje o comportamento só existe na spec arquivada de `session-refresh` — ou seja, num arquivo que ninguém abre para configurar produção |
| 9 | 🔁 **Por quanto tempo reter os eventos da trilha de auditoria?** A coleção `auditEvent` nasceu sem expurgo e sem `expiresAt`, e cresce a cada ação sensível de todo fork. **Quarta rodada sem resposta** | Decidir um prazo padrão e escrevê-lo em `docs/PRE-PRODUCTION.md` §1.3, **sem** invocar o art. 15 do Marco Civil (que é do log de acesso, não da trilha de negócio). Guardar além do necessário é o risco que o Decreto 8.771/2016, art. 13, § 2º manda evitar |
| 10 | **Quem escreve a política de privacidade que o banner linka?** O consentimento de cookies aponta para `/legal/privacy`, que é modelo e **não menciona cookies** em nenhum dos 3 idiomas (`grep -ci cookie` no dicionário legal devolve **0**, remedido hoje). Um fork que suba assim fica em posição pior do que sem banner | Texto legal é responsabilidade de cada fork, não do core — mas o **core deve entregar um modelo que ao menos declare os cookies que ele próprio grava**. A tabela está em `docs/PRE-PRODUCTION.md` §7. Cabe no corte de `data-rights-lgpd` (#3) ou vira tarefa direta de esforço P |
| 11 | **A busca da tabela enxerga só as páginas carregadas.** A PR #17 tratou o sintoma — o texto de lista vazia avisa que a busca não alcançou o resto (`table.tsx:112-118`) —, mas o comportamento continua sendo "procurar no que já baixou" | Abrir spec própria quando alguém sentir a dor, não antes. A decisão de fundo (prefixo no Firestore × serviço de busca) é cara e não tem caso de uso concreto no core hoje. Enquanto isso, o aviso na tela é o contrato honesto |
| 12 | **Como medir visitas à `apps/web`?** Foi deixado **fora** do corte de [`admin-analytics-dashboard`](admin-analytics-dashboard.md) — que é o **#1 desta rodada**, então a pergunta deixa de ser hipotética. ⚠️ **Nenhuma das três saídas (GA Data API, contador próprio, provedor dedicado) teve preço ou prevalência levantados** | Decidir à parte, depois que os KPIs de atividade estiverem de pé. Das três, o contador próprio é a única que não arrasta conta nem variável obrigatória para quem não usa — que é o critério do core. **Enquanto não houver decisão, a tela deve dizer que as métricas cobrem o painel, não a landing**, e isso precisa estar no plano do `/analyze` do #1 |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-19 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | `user-activity-tracking`, `dashboard-home` | ✅ **as duas satisfeitas nesta rodada** — a primeira pela PR #21 (`e656331`), a segunda pela PR #19 |
| [`admin-billing-insights`](admin-billing-insights.md) | `billing-subscription`, `dashboard-home` | ⛔ **bloqueada** — `billing-subscription` está em 0/6; ✅ `dashboard-home` fechou |

> **Uma spec bloqueada em nove — o menor número desde a semeadura.** A distinção `◐` continua valendo e
> continua sem ser necessária: `user-activity-tracking` mergeou **antes** da auditoria, então a transição
> foi direta, como na rodada passada. Ela existe para o caso contrário, que já aconteceu com
> `dashboard-home`: uma dependência cujo código está no disco mas não em `main` deixa quem depender dela
> ramificando de uma base que não a contém.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | Métricas de atividade na home do admin | produto | médio | M | `proposed` | ✅ `user-activity-tracking` · ✅ `dashboard-home` |
| [`admin-billing-insights`](admin-billing-insights.md) | Seção de billing na home do admin | produto | médio | M | `proposed` | ⛔ `billing-subscription` · ✅ `dashboard-home` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | ✅ `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | ✅ `ci-pipeline` · ✅ `firebase-emulator-seed` |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `in-progress` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | ✅ `transactional-emails` |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementou.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../docs/features/firestore-admin-access/spec.md) — 5/5; **item 4 contestado e reconfirmado** por medição em 2026-09-11 (403) |
| `ci-pipeline` | 2026-09-01 | [`docs/features/ci-pipeline/spec.md`](../docs/features/ci-pipeline/spec.md) — ⚠️ fechada com 1 item do corte em aberto |
| `api-hardening` | 2026-09-09 | [`docs/features/api-hardening/spec.md`](../docs/features/api-hardening/spec.md) — 5/5 do corte entregues |
| `transactional-emails` | 2026-09-10 | [`docs/features/transactional-emails/spec.md`](../docs/features/transactional-emails/spec.md) — 6/6 do corte |
| `auth-recovery-verification` | 2026-09-11 | [`docs/features/auth-recovery-verification/spec.md`](../docs/features/auth-recovery-verification/spec.md) — 5/5 do corte, conferidos um a um |
| `file-upload-storage` | 2026-09-14 | [`docs/features/file-upload-storage/spec.md`](../docs/features/file-upload-storage/spec.md) — 5/5 do corte (PR #11, `9154776`). ⚠️ 6 critérios "não verificados" por o Cloud Storage não estar ativado |
| `account-settings` | 2026-09-15 | [`docs/features/account-settings/spec.md`](../docs/features/account-settings/spec.md) — 6/6 do corte (PR #12, `a4df5ed`). ⚠️ O caminho feliz do **avatar** segue não verificado contra infra real. 🆕 **Entregou também, fora do corte, o item 1 e metade do item 3 de `account-security-mfa`** — ver [Achados](#-achados-novos) |
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`). Entregou também, fora do corte, o `testTimeout` nas 9 configs de Vitest de então |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`). ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`). ⚠️ O índice composto novo **precisa ser publicado** |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`). ⚠️ **Três desvios registrados**; o índice composto de `auditEvent` **precisa ser publicado** |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`). ⚠️ **Três desvios registrados**; **três índices compostos** precisam ser publicados |
| `session-refresh` | 2026-09-17 | [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md) — 6/6 do corte (PR #20, `cc93229`). ⚠️ **Três derivas registradas**; a **revogação ponta a ponta segue 🔒 não verificada** |
| `user-activity-tracking` | 2026-09-19 | [`docs/features/user-activity-tracking/spec.md`](../docs/features/user-activity-tracking/spec.md) — **5/6 do corte** (PR #21, `e656331`), conferidos um a um. ⚠️ **Item 4 parcial** — a declaração foi entregue, o comportamento depende de `data-rights-lgpd`, que herdou a obrigação. **Três derivas registradas**, a principal sendo que o gancho foi para os guards da API em vez do caminho de sessão. É a **primeira spec arquivada com todos os links de saída resolvendo** |

**Verificado nesta rodada:** `docs/features/` tem **17** pastas e **14** `spec.md` arquivados. As três
pastas sem `spec.md` são `observability-logging` (spec continua em `specs/`, por decisão desta auditoria —
não houve `git mv` e não há duplicata), `auth-panel-context` e `impersonation-read-only`. Não houve colisão
de arquivamento: `docs/features/user-activity-tracking/spec.md` não existia, e o `STATE.md` daquela pasta já
trazia `spec: user-activity-tracking`, então o arquivamento não precisou tocá-lo.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
na tabela, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #21 entregou **além** do corte

1. **Fallback de exibição para perfis ainda não carimbados** (`UsersListClient.tsx:46-56`). Quem nunca foi
   carimbado mostra `metadata.lastRefreshTime` em itálico esmaecido, rotulado como aproximado. É exatamente
   a recomendação da pergunta em aberto da spec sobre a fonte da verdade, e evita que a coluna nasça inteira
   vazia — porque não há backfill, e não deveria haver.
2. **O carimbo cobre o painel comum, não só o admin** (`common-panel.ts:87`), e carimba o **ator**, não o
   sujeito personificado — a razão está escrita em `:84-86`. Impersonação não falsifica o último acesso de
   quem está sendo personificado.
3. **Cache de processo com teto de 500 entradas** (`activity-recorder.ts:15-28`), para que o caminho quente
   não leia o documento só para descobrir que não precisa escrever.
4. **`touchLastAccess` fora de `BaseRepository.update`** (`user.repository.ts:37-42`), deliberadamente, para
   que um acesso não conte como edição de perfil e não mova o `updatedAt`. A justificativa está em `:33-36`
   e o contrato está fixado por 3 casos em `baseRepository.test.ts:806`.

Nada disso é deriva de implementação — os desvios do corte estão registrados à parte, na spec arquivada.
E a observação das duas rodadas anteriores volta a valer: a PR #21 **não** consertou nenhum achado
catalogado neste backlog de passagem, apesar de ter tocado `user.repository.ts`, onde o achado do tipo de
retorno mentiroso mora há cinco rodadas.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 1378 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-19 | veredito |
|-----------|--------|-------------------------------|----------|
| **este `BACKLOG.md`** (rodada anterior) | `account-security-mfa` com "nada implementado", em quatro rodadas seguidas | **1,5 de 6 itens entregues** desde a PR #12. A própria spec registrava isso com evidência (`server.ts:153-166`, `sessions/revoke/route.ts:7`); o índice é que não leu o arquivo que indexa | 🔴 **corrigido hoje.** É a contradição mais grave da rodada, porque a fonte da verdade e a fonte do erro são o mesmo sistema — e o erro sobreviveu a quatro auditorias |
| `docs/PRE-PRODUCTION.md` (gate) | `pnpm check` em **607 arquivos**, suíte de **1325 testes em 134 arquivos**, gate em **30,6 s** | **611 arquivos**, **1378 testes em 137 arquivos**, **54,2 s**. Por workspace: `apps/api` 532→576 em 48→50, `apps/app` 380→389 em 53→54 | 🟡 **não corrigido aqui** (a auditoria só escreve em `specs/`). É o sexto ciclo com estes números defasados, e o mecanismo é sempre o mesmo: medidos corretamente, invalidados pela entrega seguinte |
| `docs/SECURITY.md` | descreve a superfície de autenticação, incluindo a tabela de rotas sem guard e o rate limit sobre 8 caminhos | **segue sem mencionar `POST /api/auth/session/refresh`**, criado pela PR #20 nos dois front-ends. `grep "session/refresh"` no arquivo devolve **0**. É um segundo endpoint que grava cookie de sessão, protegido só por `isSameOriginRequest` | 🟡 **segunda rodada aberto** — ver [Achados](#-achados-novos) |
| `docs/PRE-PRODUCTION.md` (env) | lista as variáveis que um fork precisa definir | **`SESSION_ABSOLUTE_MAX_AGE_DAYS` continua não aparecendo** (`grep` devolve 0). Ela está nos dois `.env.example` e governa por quanto tempo uma sessão pode ser renovada | 🟡 **segunda rodada aberto** — ver [Pendências vivas sem dono](#pendências-vivas-sem-dono) #10 |
| `docs/PRE-PRODUCTION.md:481-515` (o campo `lastAccessAt`) | finalidade, retenção, precisão de 15 min e o custo de escrita medido | **confere frase a frase**, e a seção faz algo que este repositório raramente faz: **declara o que ainda não é verdade** (`:501-504`, sobre a exclusão ser soft delete) | ✅ **honesto na estreia, e com uma qualidade nova** — é o primeiro documento do repo a marcar explicitamente a própria lacuna em vez de omiti-la |
| `docs/SECURITY.md:13-16` (guards) | **22** arquivos de rota, **11** com guard e **11** com handler nu | **confere**, recontado hoje: `find … -name route.ts` devolve 22 e o grep pelos dois guards devolve 11 | ✅ **honesto** pela segunda rodada |
| `docs/SECURITY.md:138-140` (rate limit) | roda sobre lista fechada de **8 caminhos**, casados por igualdade exata, e as **3** rotas de `/account` estão fora | **confere.** `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:42-51`) tem exatamente os 8 listados | ✅ **honesto** pela sétima rodada |
| `docs/SECURITY.md:155` (higiene do `.env.example`) | sem Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks nem BaseHub | **confere.** `grep` pelas sete devolve zero | ✅ **honesto** |
| `docs/PAYMENTS.md` (estado geral) | não há fluxo de assinatura; os stubs estão com `TODO` em `route.ts:13,23`; não existem `UserDTO.subscription`, `stripeCustomerId` nem rotas de `payments/` | **confere nas âncoras e nos `grep`** | ✅ **honesto** pela nona rodada — o único documento com esse histórico |
| `docs/PRE-PRODUCTION.md` §1.1–§1.6 (índices) | seis índices compostos pendentes de publicação | **confere:** `firestore.indexes.json` declara exatamente **6** (`entity` ×3, `user` ×2, `auditEvent` ×1) | ✅ **honesto**, e a previsão da rodada passada se confirmou: `user-activity-tracking` não acrescentou índice nenhum |
| `docs/PRE-PRODUCTION.md` (branch protection) | `protection` → 404, `rulesets` → `[]` | **confere, remedido hoje** via `gh api` | ✅ **honesto** |

> **Nota de método, décima segunda rodada consecutiva — e a lição desta vez é sobre quem audita.** As
> rodadas anteriores catalogaram documentos que mentiam sobre o código. Nesta, **o documento que mentiu foi
> o próprio `BACKLOG.md`**: ele dizia "nada implementado" sobre uma spec cujo arquivo, no mesmo diretório,
> trazia o item 1 marcado `[x]` com evidência e teste. O índice não estava desatualizado em relação ao
> código — estava desatualizado em relação à spec que ele indexa, e nenhuma quantidade de `grep` no código
> pega isso. A regra que sai daqui: **a auditoria tem de reler o corte de MVP de cada spec no disco, não
> só recontar o código**. O corte é onde a entrega parcial fica registrada.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **6 das 9** specs que seguem em `specs/`, e **três derivas de
implementação** na spec entregue. As intactas são [`billing-subscription`](billing-subscription.md) (só
âncoras), [`data-rights-lgpd`](data-rights-lgpd.md) e [`admin-billing-insights`](admin-billing-insights.md).

**A deriva desta rodada tem duas causas distintas, e a segunda é mais interessante que a primeira.** A
primeira é a de sempre: a PR #21 acrescentou 11 linhas a `user.repository.ts`, 6 ao `UserDTO` e 38 ao
`UsersListClient.tsx`, e quem citava esses arquivos errou. A segunda é **erro de contagem por omissão** —
números que nunca estiveram certos, e que só apareceram porque alguém refez a conta em vez de reaproveitar
a anterior. Foram **dois**, em duas specs diferentes, e um deles estava errado há duas rodadas.

### Deriva de implementação — `user-activity-tracking`

Três, registradas na spec arquivada. A primeira é a que mais importa, porque muda o que o campo significa.

| especificado | implementado | leitura |
|--------------|--------------|---------|
| Carimbar no ramo `{ refreshed: true }` de `sessionRefreshPOST`, reusando `shouldRefreshSession` como janela — "sem inventar mecanismo" | `packages/auth/session-routes.ts` **não foi tocado**. O gancho ficou nos guards da API: `apps/api/app/(guards)/admin.ts:73` e `common-panel.ts:87`, através de `activity-recorder.ts` (arquivo novo, 103 linhas) | **A implementação desviou, e o desvio mede a coisa certa.** O gatilho passou de "uma renovação de cookie" para "toda requisição autenticada à API" — que é o que a pergunta "quem ainda usa isto" de fato pede, e cobre o painel comum além do admin |
| A janela "não é um número novo a escolher — é o limiar que a renovação usa" | Janela própria de **15 minutos** (`activity-windows.ts:8`), independente do throttle da sessão, com bucket determinístico em `activity-recorder.ts:25-27` | **A spec errou a previsão de custo.** Com o gancho nos guards, o throttle da sessão não serve de janela: ele governa a renovação do cookie, não a requisição. O 15 veio do precedente interno de `audit-log` — precedente, não evidência de mercado |
| "No máximo uma escrita por usuário a cada N minutos" | Não há transação. Requisições concorrentes do mesmo usuário na virada da janela podem gravar mais de uma vez | **A garantia é mais fraca do que a spec prometia, e o desvio está assumido no código** (`packages/sdk/src/types/user/user.ts:24-25`) e medido em `docs/PRE-PRODUCTION.md:511-515`: 110 requisições produziram 3 escritas, duas delas de um par concorrente |

### Âncoras deslocadas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | `user.repository.ts:52-63` (`summary()`) | **`:63-71`** | +11 linhas de `touchLastAccess` (PR #21) |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | `user.repository.ts:46-51` (comentário do não-join) | **`:57-62`** | idem |
| [`billing-subscription`](billing-subscription.md) | `user.ts:12-22` (fim do `UserDTO`) | **`:12-28`** | +6 linhas de `lastAccessAt` e do docblock dele |
| [`billing-subscription`](billing-subscription.md) | `user.ts:48-70` (`UserWithAuthDTO`) | **`:54-76`** | idem |
| [`admin-billing-insights`](admin-billing-insights.md) | `user.ts:12-22` | **`:12-28`** | idem |
| [`onboarding-flow`](onboarding-flow.md) | `user.ts:12-22` | **`:12-28`** | idem |
| [`observability-logging`](observability-logging.md) | `server.ts:263` e `:276` (`console.error`) | **`:253`** e **`:279`** | PR #20 |
| [`teams-organizations`](teams-organizations.md) · [`billing-subscription`](billing-subscription.md) | `common-panel.ts:31` (`requireCommonPanelApi`) | **`:32`** | erro antigo, não deslocamento |
| [`teams-organizations`](teams-organizations.md) | `admin.ts:29` (`requireAdminApi`) | **`:30`** | erro antigo, não deslocamento |
| [`account-security-mfa`](account-security-mfa.md) | `reset/route.ts` — "a `:49` é comentário" | o comentário é **`:46-48`**; `:49` é o `try` | erro antigo |
| [`account-security-mfa`](account-security-mfa.md) | `session.ts:22`/`:23` "já clampam a duração" | só **declaram**; o clamp está em **`:47`** | erro antigo |
| [`e2e-testing`](e2e-testing.md) | `CLAUDE.md:155` reforça a regra da `agent-browser` | `:155` é o bullet do `code-reviewer`; as menções são **`:70` e `:146`** | erro antigo |

Corrigidas as sete specs no disco (**doze âncoras** ao todo). ⚠️ **Só quatro das doze são deslocamento por
entrega — as outras oito já nasciam erradas.** Isso inverte a leitura da rodada passada, que registrou "as
dezoito foram causadas pela PR #20, é a primeira vez que isso acontece". Não virou padrão: foi exceção.
O modo dominante continua sendo âncora que nunca esteve certa.

### Contagens e afirmações de estado erradas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`teams-organizations`](teams-organizations.md) | **13** sítios de posse por usuário | **14** | ⚠️ **Errado por omissão desde 2026-09-17.** A conta pulava o `where("userId", "==", userId)` de `listByUserId` (`entity.repository.ts:23`), que a spec descreve em prosa e nunca numerou. É a **segunda correção** deste mesmo número (já tinha ido de 9 para 11), e as duas por omissão — sinal de que a lista está sendo somada, não reaberta |
| [`onboarding-flow`](onboarding-flow.md) | a decisão de destino está fatiada em **cinco** caminhos | **seis** no cliente, **nove** contando o servidor | ⚠️ **Erro de método, não de idade.** A contagem colapsava `redirectPath` (`provider.tsx:128`) e `resolvePostLoginPath` (`:130`) numa função só, e ignorava as três decisões server-side — incluindo `(common)/layout.tsx:31-34`, **o único desvio de destino já implementado no servidor**, que é exatamente o padrão que o onboarding deveria seguir e que a spec não sabia que existia |
| [`observability-logging`](observability-logging.md) | **5** das 12 chamadas de `console` cru em `packages/auth/server.ts`; **14 em 10** arquivos no total, sobrando **12 em 8** | **7**; **16 em 10**, sobrando **14 em 8** | **O problema piorou sozinho.** A PR #20 acrescentou duas chamadas cruas (`:308`, `:327`) ao arquivo que esta spec vinha apontando há cinco rodadas |
| [`observability-logging`](observability-logging.md) | o aviso de rate limit é "o único `console` cru que sobrou na `apps/api`" | **falso** — `apps/api/app/global-error.tsx:15` também tem um | Afirmação de exclusividade que nunca foi verificada |
| [`e2e-testing`](e2e-testing.md) | 1325 testes em 134 arquivos, com o `HEAD` em `cc93229` | **1378 em 137** | Sétima rodada com estes números defasados, e como na anterior a defasagem é *só* de idade: foram medidos corretamente e invalidados pela entrega seguinte |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | "o que ainda bloqueia esta spec é `user-activity-tracking`" e "não existe noção de atividade" | **as duas falsas desde ontem** | A spec estava bloqueada por algo que mergeou na PR #21. Reescrita: o campo existe, falta **agregá-lo** |

### O que a auditoria **não** encontrou

Nenhuma spec `done` regrediu e nenhuma feature em `docs/features/*/STATE.md` está sem `spec:` quando
deveria ter. **Entrega parcial órfã, encontrou uma** — `account-security-mfa` —, e ela estava escondida no
lugar mais difícil de olhar: dentro da própria spec, que registrava tudo certo enquanto o índice dizia o
contrário.

## Achados — correções pontuais, não specs

Coisas que não merecem spec própria (não são funcionalidade, não têm corte de MVP), mas que são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-19 (pós-PR #21).** Os achados da rodada anterior foram reconferidos contra o
> código, um a um, com as âncoras abertas no disco. **Placar: 0 fechados · 4 novos · o resto intacto e
> confirmado.**

### 🆕 Achados novos

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Um teste instável derrubou o CI, e a asserção está em `main` desde a PR #4** | `apps/api/__tests__/baseRepository.test.ts:477` · `apps/api/(shared)/repositories/base.repository.ts:150-151` | O teste afirma `created.updatedAt === created.createdAt`; o repositório produz os dois instantes com **duas chamadas separadas a `new Date()`**. Na virada do milissegundo eles diferem, e diferiram: `gh run 35456187047` fechou `failure` com `'…:32.532Z'` contra `'…:32.531Z'`, 1 teste de 576. **A PR mergeou mesmo assim**, porque não há branch protection. Conserto de uma linha: `const now = new Date()` reusado nos dois campos. ⚠️ **Isto é pré-requisito da decisão nº 5** — ligar o branch protection antes de consertar transformaria um *flake* em merge bloqueado ao acaso |
| 🟡 **Arquivar uma spec quebra os links que saem dela — 17 links mortos em 11 das 13 specs arquivadas** | `docs/features/*/spec.md` | O procedimento de [`/spec-audit` §4.1](../.claude/skills/spec-audit/SKILL.md) manda varrer quem apontava **para** a spec movida e **não** manda corrigir o que a spec movida aponta. Resultado: toda spec arquivada que citava `](research/*.md)` aponta para nada, porque de `docs/features/<slug>/` o caminho certo é `../../../specs/research/*.md`. Afeta `account-settings`, `api-hardening` (2), `audit-log` (2), `auth-recovery-verification`, `cookie-consent` (2), `cursor-pagination`, `file-upload-storage` (2), `firebase-emulator-seed`, `session-refresh` (4) e `transactional-emails`. **`docs/features/session-refresh/spec.md` é o pior caso**: além das notas, aponta para `](user-activity-tracking.md)` e `](account-security-mfa.md)`, que resolveriam dentro da própria pasta da feature. ⚠️ **A auditoria não corrigiu** — só escreve em `specs/`. A spec arquivada hoje saiu com os 8 links reapontados antes do `git mv`, e é a primeira sem link morto |
| 🟡 **O gate de aprovação de spec está morto na prática** | `specs/README.md` (ciclo de vida) · `.claude/commands/cycle.md` | `session-refresh` e `user-activity-tracking` foram planejadas, implementadas, revisadas e mergeadas **sem nunca sair de `proposed`**. Duas entregas seguidas. Ou o `approved` deixa de existir, ou alguém passa a usá-lo — manter uma regra que ninguém aplica corrói a confiança nas outras. É a [decisão nº 7](#precisam-de-decisão) |
| 🟡 **`userRepository` ganhou um terceiro método com semântica de contagem própria** | `apps/api/(shared)/repositories/user.repository.ts:37-42` · `:44` · `:63` | `touchLastAccess` (`:37`), `list` (`:44`) e `summary` (`:63`) agora tocam o mesmo documento com três contratos diferentes: o primeiro escreve sem mover `updatedAt`, o segundo faz merge com o Firebase Auth e descarta linhas em silêncio, o terceiro conta sem ler. Cada um está certo isoladamente e documentado; juntos, são três respostas diferentes para "quantos usuários existem". **`admin-analytics-dashboard` é o #1 da ordem e vai agregar em cima dos três** |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Reconferido hoje, literal. Não explode **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#6) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` **não tem `exports`** |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o primeiro import do `apps/api/proxy.ts:1` — o middleware, que roda em toda requisição | `packages/security/index.ts:11` | Reconferido. `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot — e `instrumentation.ts:26-30`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:20-24`) e **não há `process.exit` em nenhum lugar do arquivo** (`grep` devolve 0, reconferido) | `apps/api/instrumentation.ts:20-24` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. ✅ Mitigação parcial: `/health/ready` consulta o Firestore, então um health check apontado para ele detecta parte dessas falhas. Não detecta esta em específico |
| ⚠️ **As 3 rotas de `/account` não estão no rate limit** — incluindo troca de senha, alvo clássico de força bruta | `apps/api/proxy.ts:42-51` | Casamento exato (`includes`), decisão consciente para não limitar `/auth/sign-in/google` duas vezes. Reconferido: a lista tem exatamente 8 entradas. **A PR #21 não acrescentou rota à `apps/api`**, então a contagem não mudou |
| ⚠️ **A superfície não-guardada da API: 11 de 22** arquivos de rota exportam handler nu, sendo 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado hoje: 22 arquivos, 11 com guard. As 8 de `/auth/*` são legítimas (superfície anterior à sessão), mas duas delas não seguem o contrato de erro do repo — ver o achado de `/auth/sign-in` abaixo |
| 🟡 **Nasceu um segundo endpoint que grava cookie de sessão, e nenhum documento o registra** — **segunda rodada** | `packages/auth/session-routes.ts:87` · `apps/app/app/api/auth/session/refresh/route.ts` · `apps/web/app/api/auth/session/refresh/route.ts` | `POST /api/auth/session/refresh` é protegido só por `isSameOriginRequest` (`session.ts:78`), que devolve `true` quando não há header `Origin`. O rate limit do repo roda no proxy da `apps/api` sobre lista fechada, e estas rotas vivem nos front-ends: estão fora dele. `grep "session/refresh" docs/SECURITY.md` devolve **0**, remedido hoje |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| ◐ **Dependência importada sem ser declarada — uma metade fechada, duas abertas.** ✅ `apps/app/package.json` passou a declarar `@repo/analytics` (PR #16). 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` e `apps/app/package.json` **não declara** `@repo/email`. 🟡 `apps/web` importa `@repo/auth/provider` em **5 arquivos** de produção e `apps/web/package.json` **não declara `@repo/auth`** | `apps/app/package.json` · `apps/web/package.json` | Funciona por hoisting do pnpm. Além do risco de resolução, **o turbo não invalida `web#*` quando `@repo/auth` muda** — cache mentindo num gate que roda em toda PR |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` **não existe** no disco. Zero importadores, falha em silêncio. **Décima sétima auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` de todo o resto | `packages/auth/package.json:25` | Reconferido, inalterado. É o único workspace fora da major. O risco foi avaliado e sobreviveu a duas entregas neste pacote — deixa de ser urgente e volta a ser dívida, mas continua sendo um pacote de autenticação resolvendo uma major diferente do runtime |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: `grep` por `"main"`/`"exports"` devolve **0**. `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 **`input-otp.tsx` é código morto**, com 3 arquivos citando e nenhum de produto | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: os únicos arquivos são ele mesmo, o barril (`index.ts:29`) e uma **string literal** numa lista do `playground` (`page.tsx:145`) — não é import nem render. `account-security-mfa` (#4) é a spec que o usaria. **É o último componente morto do design-system.** ⚠️ Ao medir, use `grep -w`: `TOTP` casa dentro de `InpuTOTP` e produz 7 falsos positivos |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` seguem instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: **0** arquivos os importam. As PRs #15 a #21 passaram sem tocá-las |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-11` | Falta o subpath `"./utils/*"` (consumidor externo não alcança `utils/cookies.ts`), e o `"."` (`:6`) aponta para `index.ts`, **que não existe** — reconferido no disco |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Reconferido: 1 ocorrência em todo o repo. Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | O campo vizinho `requestId`, nascido na mesma entrega, **foi ligado até a tela**. ⚠️ Há um `retryAfterSeconds` **homônimo de outro tipo** em `apps/api/proxy.ts:102` |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — décimo primeiro ciclo | `packages/auth/client.ts:224` | A única cobertura é `apps/app/__tests__/useEmailVerification.test.tsx`, que a **mocka** |
| 🟡 **`packages/shared` é o único pacote com `test` e sem `typecheck`** | `packages/shared/package.json` | Reconferido: `grep typecheck` devolve vazio. O pacote hospeda o helper de log e o `requestErrorReporter`, e a imunidade a `Error` do `logEvent` é garantida pelo **tipo**, que nenhum gate deste workspace verifica |
| 🟡 **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | Reconferido: 4 ocorrências, **3 em teste** e 1 que é a própria definição. O form não tem `<form>`, nem handler, nem import da action — que **existe e tem teste** |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `delete()` herdado por todo repositório é **soft delete** — chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:205-207` | Reconferido, âncora exata. O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` (#3) — e agora também o `lastAccessAt` que ela herdou. **`AuditEventRepository` é o único repositório a recusar o herdado**, lançando `AuditEventImmutableError` (`audit-event.repository.ts:100-106`) — precedente útil |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:44` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth, e descarta linhas em silêncio. O N+1 do Admin SDK continua lá. ⚠️ **A PR #21 tocou este arquivo e não consertou** — âncora deslocada de `:32-43` para `:44`, quinta rodada aberto |
| 🟡 **`userRepository.summary()` e `list()` contam populações diferentes, de propósito** | `apps/api/(shared)/repositories/user.repository.ts:57-62` · `:44` | A escolha está documentada e é defensável. O efeito visível é que **o cartão de total pode mostrar mais do que a tabela lista**, e nada na tela explica isso. Não é bug; é um número que vai gerar pergunta — e `admin-analytics-dashboard` (#1) vai multiplicar essas perguntas |
| 🟡 **O predicado de posse foi copiado, não reusado, na agregação de entidades** | `apps/api/(shared)/repositories/entity.repository.ts:33` · `apps/api/app/(routes)/entities/summary/route.ts:9` | `summaryByUserId` repete o `where("userId", "==", userId)` que `listByUserId` (`:23`) já fazia. Levou os sítios de escopo por usuário a **14** (recontado hoje, ver deriva), e é a evidência mais limpa do argumento de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. Seguem órfãs — o SDK chama `/auth/me`, `/auth/sign-in/google` e as rotas de senha, nunca estas. A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:67` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | Reconferido: os dois `TODO` seguem em `:13` e `:23`. A assinatura **é** validada (`:45`); nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#6) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:46` | Reconferido. `pnpm --filter api dev:with-stripe` **não pode funcionar**. Duas das três chaves afetadas já foram resgatadas por redeclaração (`:22`, `:29`), **com comentário nomeando esta armadilha** — esta ficou de fora |
| ◐ **`skipValidation` na `apps/web` é incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` | `apps/web/env.ts:27,13-19` | Reconferido. O CTA "Ir para o painel" da landing cai no fallback em `hero.tsx:44`, `cta.tsx:35`, `header/index.tsx:35-36` e `pricing/page.tsx:77,120`. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189-202` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada**. Segunda feature já contornou o defeito em vez de corrigi-lo (`expiredSessionOrigin`, `provider.tsx:72`). ⚠️ `onboarding-flow` (#2) declara este arquivo em `contends_on` e será a terceira |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | Reconferido nas quatro âncoras, literais. O idioma escolhido **não sobrevive ao fechamento do navegador** |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** por padrão; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts` · `packages/auth/session.ts:78` | ASVS 5.0 L1 (3.3.1) exige `Secure`. ◐ **Meio fechado pela PR #16.** ⚠️ **Sexta rodada aberto**, e a chance barata já passou: a PR #20 reescreveu 90 linhas de `session.ts` e não fechou |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru | `packages/sdk/src/client/base.ts:53,61,95` | Reconferido nas três âncoras. Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | Reconferido, literal. **Sobreviveu às PRs #11 a #21.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` |
| 🟡 **O `DateInput` compartilhado formata data e calendário sempre em inglês** | `packages/design-system/components/ui/date-input.tsx:83` | `format(selected, "PPP")` do `date-fns` sem a opção `locale`. Reconferido. ⚠️ **A PR #21 resolveu o mesmo problema em outro lugar** — `apps/app/shared/lib/formatDisplayDateTime.ts:24` formata por idioma com `Intl.DateTimeFormat` — e não trouxe a solução para o componente compartilhado. Agora há duas respostas no repo, e a do design-system é a errada |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`, nos **dois** apps) e `"Início"` no breadcrumb | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` | Reconferido: `"Switch language"` em **2** arquivos. Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe. O `PageBreadcrumb` ainda crava `href="/painel"` em `:28` |
| 🟡 **A mensagem de erro padrão do repo inteiro está cravada em pt-br dentro de um pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal: `"Um erro inesperado aconteceu"` é o retorno de **todo** erro que não é `FormattedError` — em espanhol e em inglês também |
| 🟡 **`apps/web/…/sign-in/validations/signInSchema.ts:9` crava a mensagem de validação em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | Reconferido, literal (`"A senha deve ter pelo menos 6 caracteres"`). Os outros nove sítios de `MIN_PASSWORD_LENGTH` passam por `validation.passwordMin` |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | O `select` é alimentado por `useListUsers()`, que só lista quem existe. O evento de exclusão **foi projetado para sobreviver ao usuário**, e é justamente ele que o filtro não consegue selecionar |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | `catch { return null; }` sem `logEvent`, reconferido. Numa investigação, "evento sem rótulo" e "Firebase Auth fora do ar" ficam indistinguíveis |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Reconferido, literal. Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:29-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem. É a home da landing |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: o arquivo exporta só o hook. O `apps/app/CLAUDE.md` exige que exporte também a função imperativa. Segue o único fora da regra |
| 🟡 **`provider-error` não distingue as falhas do provedor** — cota estourada, domínio não verificado e chave revogada produzem o mesmo `reason` | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado**. A assimetria segue: `@repo/email` manteve o próprio `logEmail` em vez do `logEvent` compartilhado |
| 🟡 **O rodapé da `apps/web` consome `data-cookie-banner` sem teste que fixe o acoplamento** | `apps/web/app/[locale]/components/footer.tsx:56` | O lado da `apps/app` tem teste; o da `web` não, porque a suíte dela roda em `environment: "node"`, sem jsdom |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir. ⚠️ **Foi exatamente o que aconteceu na PR #21**: o log mostra `Failed: api#test` e tasks não executadas, o que esconde que o problema era 1 asserção instável |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito.

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | 🔴 **Os três índices compostos dos resumos da home precisam ser publicados.** Sem eles, `GET /entities/summary` e `GET /users/summary` respondem 503 `SUMMARY_INDEX_MISSING`. ⚠️ **`admin-analytics-dashboard` é o #1 e agrega em cima dessas rotas** | `PRE-PRODUCTION.md` §1.5 | ~5 min + construção |
| 2 | 🔴 **O índice da busca de perfil por `reference_id` precisa ser publicado.** É a consulta que todo guard roda para transformar o UID do Firebase Auth no documento de perfil, e é a única dos seis **sem degradação traduzida**. 🆕 **O alcance cresceu:** com a PR #21, os guards agora também escrevem, não só leem | `PRE-PRODUCTION.md` §1.6 | ~5 min + construção |
| 3 | 🔴 **O índice composto da trilha de auditoria precisa ser publicado.** Sem ele, o **filtro por usuário** de `/admin/audit` responde 503 `PAGINATION_INDEX_MISSING` | `PRE-PRODUCTION.md` §1.2 | ~5 min + construção |
| 4 | 🔴 **O índice composto da listagem paginada de `entity` precisa ser publicado.** Sem ele, `GET /entities` responde `PAGINATION_INDEX_MISSING` em produção e a tela fica vazia. ⚠️ **O emulador não cobra índice composto**, então nada no gate local pega isto — e são **seis** índices nessa situação, recontados hoje em `firestore.indexes.json` | `PRE-PRODUCTION.md` §1.1 | ~5 min + construção |
| 5 | 🆕 🔴 **O teste instável de `baseRepository` precisa ser consertado antes do branch protection.** `apps/api/__tests__/baseRepository.test.ts:477` contra `base.repository.ts:150-151`. Conserto de uma linha; é pré-requisito da pendência 7 | *(só neste arquivo)* | **~2 min** |
| 6 | **A retenção da coleção `auditEvent` não foi decidida.** Os documentos não têm `expiresAt` e nada expurga. É a decisão nº 9 | `PRE-PRODUCTION.md` §1.3 | decisão + ~10 min |
| 7 | **`main` não tem branch protection.** Remedido hoje: `protection` → 404, `rulesets` → `[]`. ⚠️ **Uma PR vermelha já foi mergeada** (#21). Depende da pendência 5 | `PRE-PRODUCTION.md` | **minutos** |
| 8 | **Backfill de instantes em base que já tem dado.** Antes da PR #17 o `update()` regravava `createdAt` como string ISO; o Firestore ordena por tipo antes de valor. O script existe e tem dry-run | `PRE-PRODUCTION.md` §1.4 | ~10 min por coleção |
| 9 | **Ninguém vigia a trilha de erro.** O `onRequestError` está plugado nos três apps e escreve no stdout; nenhum coletor está ligado. `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve zero, reconferido. É o resíduo de `observability-logging` | `PRE-PRODUCTION.md` §11 | P + conta em provedor |
| 10 | **O health check da plataforma não aponta para `/health/ready`.** A rota existe e responde 503 quando o Firestore não atende em 2 s; enquanto ninguém a configura, a plataforma segue olhando `/health` | `PRE-PRODUCTION.md` §11 | ~2 min |
| 11 | **`SESSION_ABSOLUTE_MAX_AGE_DAYS` não está no checklist** — **segunda rodada**. Governa por quanto tempo uma sessão pode ser renovada; tem padrão de 30 dias e grampo de 90, então nada quebra — mas o fork herda uma política de sessão que nunca leu. **E o teto pode ser ultrapassado por até meia vida de cookie** (decisão nº 8), o que também não está escrito em lugar nenhum que um fork abra | *(só neste arquivo)* | ~5 min (texto) |
| 12 | **`SESSION_COOKIE_DOMAIN` precisa estar definida se `web` e `app` rodarem em subdomínios distintos.** Sem ela o cookie de consentimento fica host-only e o visitante responde ao banner **duas vezes**; e a renovação de sessão depende do mesmo cookie compartilhado | `PRE-PRODUCTION.md` §7 | ~2 min |
| 13 | **A política de privacidade linkada pelo banner não menciona cookies.** `grep -ci cookie` no dicionário legal devolve **0** nos 3 idiomas, remedido hoje. Ver a decisão nº 10 | `PRE-PRODUCTION.md` §7 | P (texto) |
| 14 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados". Exige plano **Blaze**. Também trava metade do item 3 de `data-rights-lgpd` (#3 da ordem) | `PRE-PRODUCTION.md` | cartão + ~15 min |
| 15 | **A revogação de sessão nunca foi provada ponta a ponta.** O emulador de Auth aceita o cookie depois de `revokeRefreshTokens`, o que atinge o caminho que o proxy usa em toda navegação autenticada. Coberto por teste unitário; a prova exige projeto Firebase real | *(só neste arquivo)* | projeto real + ~15 min |
| 16 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 17 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações | `PRE-PRODUCTION.md` | P |
| 18 | **Contas de QA acumuladas: 15.** A PR #21 não acrescentou nenhuma — o `/test` dela rodou contra o emulador, como os das #17 a #20. Uma das antigas (`qa-account-settings-b@`) segue **inutilizável**: apagar, não reusar | `PRE-PRODUCTION.md` | P |
| 19 | **Branches mergeadas ainda vivas no remoto: 20.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 20 | **O login com Google nunca teve passe manual com conta real.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta | *(só neste arquivo)* | ~2 min |
| 21 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** 🆕 **E ele não faz o que `teams-organizations` dizia que fazia**: é negação total (`:28`), sem nenhum `userId`/`uid`. Depende da pendência 14; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#5) | `PRE-PRODUCTION.md` | ver #14 |
| 22 | **Conferir a retenção de log da plataforma no painel do provedor.** O prazo e a fundamentação já estão escritos; o que falta é ler o número que o provedor pratica | `PRE-PRODUCTION.md` §11 | ~5 min |
| 23 | **O item de reabertura do consentimento no `ProfileDropdown` nunca foi visto num browser.** Coberto por teste jsdom, não por passe visual | *(só neste arquivo)* | ~2 min com emulador de pé |

> **A fila de índices não cresceu, e a previsão da rodada passada se confirmou.** Eram seis e continuam
> **seis** — `user-activity-tracking` declarava "nenhum índice novo" no corte, e cumpriu: a coluna não
> ordena no servidor. A regra que sai daqui segue valendo: **a fila cresce com spec que *consulta* de um
> jeito novo, não com spec que muda comportamento.** ⚠️ E ela vai crescer na próxima: o #1
> (`admin-analytics-dashboard`) agrega por instante, declara `firestore.indexes.json` em `contends_on`, e a
> própria spec já avisa que vai precisar de índice composto.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | Mantém o argumento das seis rodadas anteriores. A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Depende da decisão nº 3. |
| **Histórico de acessos · IP, user-agent, dispositivo e geolocalização · presença em tempo real** | — | Explicitamente fora do corte de [`user-activity-tracking`](../docs/features/user-activity-tracking/spec.md), arquivada. Acrescentar IP mudaria a natureza jurídica do dado — vira "registro de acesso" no sentido do Marco Civil art. 5º, VIII — e isso precisa de justificativa própria. |
| **Backfill retroativo do último acesso** | — | 🆕 Fora do corte da spec arquivada, e por desenho: quem nunca acessou depois da entrega aparece como "nunca acessou", e está correto. ⚠️ **Consequência que `admin-analytics-dashboard` (#1) herda**: na estreia dos KPIs, a maior parte da base aparece como inativa até cada usuário voltar. Isso precisa estar na tela, não numa nota. |
| **Ordenação da coluna de último acesso pelo servidor** | — | 🆕 Fora do corte da spec arquivada, com o motivo escrito: ordenar por esse campo pede índice composto, e a fila de índices não publicados já tem seis entradas. Reavaliar quando a fila drenar. |
| **Tela de sessões e dispositivos ativos, com encerramento individual** | 1/10 | Fora do corte de `session-refresh`, arquivada. Pertence a [`account-security-mfa`](account-security-mfa.md) (#4) — que já tem **metade** disso entregue por tabela, em tudo-ou-nada. |
| **Rotação de refresh token com detecção de reuso** | — | Fora do corte de `session-refresh`. O refresh token é do Firebase, não do repositório: não há onde implementar sem sair do provedor. |
| **"Continuar conectado" no login · autenticação reforçada para operação sensível · aviso de inatividade** | — | Fora do corte de `session-refresh`. A reautenticação para ação sensível já estava listada como iteração própria em `account-security-mfa`. |
| **Rate limit próprio para as rotas de sessão** | — | A spec de `session-refresh` levantou isto nos riscos e não pôs no corte. Virou [achado](#-segurança--seguem-abertos-confirmados-no-código), não spec: o mecanismo existe (`@repo/security`), só não alcança rotas fora da `apps/api`. |
| **Widgets configuráveis, arrastáveis ou por papel na home** | — | Explicitamente fora do corte de `dashboard-home`, arquivada: complexidade sem retorno num core que cada fork vai reescrever. |
| **Série temporal real, comparação com período anterior, filtro de intervalo na home** | — | Fora do corte de `dashboard-home`. A parte de atividade é [`admin-analytics-dashboard`](admin-analytics-dashboard.md) (#1) e a de receita, [`admin-billing-insights`](admin-billing-insights.md). |
| **Contador materializado / agregação incremental** | — | Fora do corte de `dashboard-home`, que resolveu contar com a agregação nativa do Firestore. Vira necessário só quando alguma coleção crescer a ponto de a agregação doer, e aí com medição. |
| **Exportar a trilha de auditoria · expurgo automático** | — | Explicitamente fora do corte de `audit-log`, arquivada. As duas dependem de decidir o prazo de retenção, que é a decisão nº 9. |
| **Alerta em tempo real sobre ação sensível** | — | Fora do corte de `audit-log`. Depende de `observability-logging` ter um coletor do outro lado — hoje não tem. |
| **Auditar toda escrita de qualquer recurso** | — | Fora do corte de `audit-log`: começa caro, envelhece mal e gera ruído. A trilha cobre cinco ações sensíveis, não o CRUD inteiro. |
| **Busca textual no servidor** | — | Explicitamente fora do corte de `cursor-pagination`, arquivada. Ver a decisão nº 11. |
| **Contagem total de registros na listagem** | — | Fora do corte de `cursor-pagination`. **Reavaliar quando alguém pedir:** o `countQuery` (`base.repository.ts:122-124`) é a peça que faltava, e o custo caiu para "uma chamada". |
| **Registro auditável de consentimento** | — | Fora do corte de `cookie-consent`, arquivada. Prova de consentimento é obrigação do controlador e hoje a escolha vive só no navegador do titular. Resta `data-rights-lgpd` (#3) como candidato natural, e ela ainda não o declarou. |
| **CMP certificada de terceiro · TCF do IAB · geolocalização do visitante** | — | Fora do corte de `cookie-consent`. As duas primeiras arrastam serviço pago para todo fork; a terceira parece economia e é fonte de bug e de dúvida jurídica. |
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão; a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. |
| Firebase App Check | — | Explicitamente fora do corte de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** A action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P — vai direto ao `/analyze`. |
| **Migrar a listagem de usuários para o cursor** | — | Fora do corte de `cursor-pagination`. `userRepository.list()` carrega um N+1 do Admin SDK: paginá-la sem resolver isso entregaria uma listagem que faz uma chamada de rede por linha. Tarefa própria, e o N+1 vem primeiro. |
| **Detector de teste instável no CI (repetir a suíte, `--retry`, quarentena)** | — | 🆕 **Avaliado nesta rodada e descartado como spec.** O caso concreto existe (a PR #21 fechou vermelha por um `flake`), mas a causa é **uma asserção específica** com conserto de uma linha, não uma lacuna de ferramental. Repetir a suíte inteira para caçar instabilidade custa minutos de CI em toda PR para um problema que teve uma ocorrência. Vira [achado](#-achados-novos) e [pendência 5](#pendências-vivas-sem-dono). Reabrir se aparecer um segundo `flake` de causa diferente. |
| Provedor de e-mail plugável (SES/Postmark) · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`, arquivada. Reabrir exige spec nova. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, arquivada. O `POST /files` ficou genérico de propósito. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`, arquivada. A exclusão de conta virou [`data-rights-lgpd`](data-rights-lgpd.md) e as sessões viraram [`account-security-mfa`](account-security-mfa.md); a **troca de e-mail** continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, arquivada. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#5). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Explicitamente fora do corte de `observability-logging`. A nota de pesquisa registra o conflito entre Sentry v8+ e `@vercel/otel`, que quebra a propagação de trace em silêncio. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional que manter no core. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. ⚠️ **O pré-requisito acabou de ficar menos verdadeiro**: o CI esteve vermelho por `flake` nesta rodada. Reavaliar junto com o branch protection, depois da pendência 5. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição, e como opt-in por variável ausente. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **10** configs de Vitest declara cobertura, reconferido: não há número para discutir. Medir primeiro, gatear depois. Cruza com `e2e-testing` (#5). |
| Changesets / versionamento · Storybook | — | Com pacotes `private: true` e forks que divergem, o valor do changelog não paga o processo. O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
