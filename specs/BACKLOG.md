# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-17 (`/spec --sync`, pós-merge da PR #19) · anteriores: 2026-09-17 (PR #18) ·
> 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) ·
> 2026-09-15 · 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 ·
> 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`dashboard-home` foi entregue e arquivada.** Era o #1 desta lista. Os cinco itens do corte foram
>    reabertos um a um no código; PR #19 mergeada em `main` (`bfc4d8f`), CI `success` no SHA de merge. É a
>    décima segunda spec a sair da fila, e vive agora em
>    [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md).
> 2. **Três desvios entre o que a spec pedia e o que foi entregue**, registrados na spec arquivada. O
>    principal: o gráfico não consome `chart.tsx` direto do app — a PR criou um wrapper novo no
>    design-system, porque `recharts` não é dependência declarada da `apps/app`.
> 3. **Quatorze âncoras deslocadas e sete contagens erradas** em sete specs, quase todas por a PR #19 ter
>    inserido linhas no meio de `base.repository.ts`, `user.repository.ts`, `entity.repository.ts` e
>    `packages/sdk/src/types/user/user.ts`. Corrigidas no disco.
> 4. **`docs/SECURITY.md` mentia sobre a superfície guardada da API, e a correção da rodada anterior estava
>    errada junto.** O documento afirmava três rotas sem guard; são **onze**. Corrigido hoje, com a tabela
>    dos três motivos. E `docs/PRE-PRODUCTION.md` documentava **cinco** índices compostos pendentes contra
>    **seis** declarados no arquivo versionado — o que faltava é o da busca de perfil, que todo request
>    autenticado usa.
> 5. **O #1 é [`session-refresh`](session-refresh.md)**, e ele destrava um terço da fila. Detalhe em
>    [Ordem recomendada](#ordem-recomendada).
> 6. **A dependência `dashboard-home` das duas specs de painel fechou sozinha**, como esta seção previu na
>    rodada passada. [`admin-analytics-dashboard`](admin-analytics-dashboard.md) segue bloqueada por
>    `user-activity-tracking`; [`admin-billing-insights`](admin-billing-insights.md), por
>    `billing-subscription`.

## Contadores

Sobre as **11 specs que seguem em `specs/`**. Recontados do disco em 2026-09-17, lendo o frontmatter de cada
arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 9 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 12 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 5 · `confianca` 3 · `dx` 2 (+1 `deferred` em `produto`). **Por esforço:**
P 0 · M 8 · G 3. **Por valor:** alto 6 · médio 5 · baixo 0.

**Transições aplicadas: 1** (`dashboard-home`: `proposed` → `done`, arquivada). Nenhuma spec nova entrou:
esta rodada é `--sync` puro.

> **A distribuição melhorou por subtração, o que não é melhora.** `produto` caiu de 6 para 5 porque a spec
> entregue era de `produto`. O eixo de ferramental continua com duas specs, as duas paradas: `e2e-testing`
> por esforço G e `observability-logging` por uma decisão que não chega há cinco rodadas.

### O caso `dashboard-home` — o que foi conferido antes de arquivar

PR **#19** mergeada em `main` em 2026-09-17T18:46:32Z (merge commit `bfc4d8f`), com CI `success` nesse SHA
(`gh run list`). Os cinco itens do corte, reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Home comum com saudação e 2–3 cartões | **implementado** | `CommonHomeClient.tsx:62-64` (saudação com o primeiro nome de `useMyAccount`, recuo para `useAuth`) e `:131-142` (cartões de total e ativas) |
| 2. Um bloco é gráfico, exercitando o `chart.tsx` | **implementado** | `packages/design-system/components/ui/category-bar-chart.tsx:6,40` consome `ChartContainer`; `EntityTypeChart.tsx:40` é o primeiro consumidor de produto |
| 3. Números vêm de agregação no servidor | **implementado** | `base.repository.ts:122-124` (`query.count().get()`); `entity.repository.ts:29-52` roda cinco agregações em paralelo sem ler documento; rota em `entities/summary/route.ts:6-8` |
| 4. Home do admin sob `requireAdminApi` | **implementado** | `users/summary/route.ts:6-8`; `user.repository.ts:52-63`; `AdminHomeClient.tsx:33-55` |
| 5. Vazio/carregando/erro + 3 idiomas, sem o literal `"Home"` | **implementado** | `CommonHomeClient.tsx:75-126`; dicionários em `translations/apps/app/pages/common/home.ts` e `admin/home.ts`; as duas homes leem `routes.root.label` e `grep '"Home"'` na `apps/app` devolve zero |

**Três ressalvas registradas na spec arquivada, nenhuma bloqueando o `done`:** os três índices compostos
novos **precisam ser publicados** antes de a home funcionar em produção; `userRepository.summary()` conta
sem juntar com o Firebase Auth, então o total pode passar do número de linhas da listagem (escolha
documentada em `user.repository.ts:46-51`); e o predicado de posse foi **copiado** para `summaryByUserId`
em vez de reusado.

## Gates — medidos nesta auditoria

Executados agora, com `--force`, neste workspace, com o `HEAD` em `bfc4d8f`. Não copiados do `/test` nem da
rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **601 arquivos · 0 erros** (`No fixes applied`, 284 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 52,5 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-17 (PR #18) |
|-----------|---------:|-------:|---------------------------|
| `api` | 48 | 532 | **+2 arquivos · +21** |
| `app` | 51 | 370 | **+4 arquivos · +28** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 6 | 62 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `web` | 5 | 31 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **130** | **1276** | **+6 arquivos · +49 testes** |

A PR #19 não criou workspace novo, então o número de tasks e o de configs de Vitest ficaram onde estavam. O
`pnpm check` subiu de 583 para **601** arquivos. O gate rodou em 52,5 s contra 1 min 30 s na rodada
anterior — mesma máquina, mesmo `--force`, então a diferença é contenção do momento, não ganho de suíte.

CI: a execução de merge de **#19** (`bfc4d8f`) está em **`success`**. `git log origin/main -1` devolve
`bfc4d8f`, ou seja, nenhum commit do repositório está fora de `main`.

As **10** configs de Vitest declaram `testTimeout: 20_000`. O pré-requisito do branch protection continua
satisfeito, e o branch protection continua não ligado — remedido hoje:
`gh api repos/:owner/:repo/branches/main/protection` → **404**, `rulesets` → **`[]`**.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Duas specs estão bloqueadas por dependência** — eram três até o merge da PR #19.

> **Um critério ganhou peso e continua valendo: o que uma rodada autônoma consegue provar.** O `/cycle` não
> provisiona infraestrutura, então uma spec cujos critérios de aceite dependem de conta em provedor volta
> com metade dos critérios "não verificados". Isso não a torna menos valiosa — torna-a má escolha para
> **esta** forma de execução, e a distinção precisa estar escrita para não virar preconceito silencioso.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`session-refresh`](session-refresh.md) | **Sobe ao topo porque é a única spec de valor alto que está destravada, é executável sem conta em provedor e desbloqueia outras duas.** Corrige um defeito real: a sessão expira em tempo absoluto e derruba quem está usando o produto (`packages/auth/session.ts:29-36`; `mintSessionCookie` tem **um** chamador, `session-routes.ts:60`, no login). O emulador do Firebase cobre Auth, então o corte inteiro é verificável numa rodada autônoma. ⚠️ **Tem risco de segurança embutido:** renovação deslizante sem teto absoluto é sessão eterna, e o sintoma não aparece em teste. O corte já exige o teto contado a partir do `auth_time` — que hoje é decodificado e descartado em `packages/auth/server.ts:257` —, mais revogação e limpeza de cookie. |
| 2 | [`user-activity-tracking`](user-activity-tracking.md) | Bloqueada pelo #1, e logo atrás dele porque é o elo fino da cadeia: sem o carimbo de último acesso, o painel de métricas não tem eixo para agregar. **Metade dela é mais barata do que parece** — `UserWithAuthDTO.metadata` já carrega `lastSignInTime` e `lastRefreshTime` até a listagem do admin (`user.mapper.ts:13-17`), que simplesmente não os renderiza: são **6 colunas** em `UsersListClient.tsx:33-106` e nenhuma é de acesso. A outra metade é onde mora o cuidado: é **dado pessoal**, e carimbar a cada requisição seria uma escrita no Firestore por requisição. O corte fixa janela de gravação, finalidade e retenção. |
| 3 | [`data-rights-lgpd`](data-rights-lgpd.md) | **Maior valor do backlog e a única com prazo imposto de fora.** Segue em 0/5. A armadilha dos objetos órfãos continua dobrada: `deleteObjectQuietly` tem **2** call sites (`entities/[id]/route.ts:90` e `account/route.ts:158`), ambos de troca, nenhum de expurgo; e o `delete()` herdado é **soft delete** (`base.repository.ts:205-207`). O que a tira do topo é esforço **G** somado a um problema de verificação: o item 3 do corte exige limpar arquivos **e** cancelar assinatura ativa no mesmo fluxo — o primeiro depende do Cloud Storage não ativado, o segundo de um `billing-subscription` que não existe. Dois dos cinco critérios voltariam "não verificados". |
| 4 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze`, e é isso que a segura.** Valor alto, esforço M e zero dependência de infra externa. O item 2 continua oco desde que a PR #12 passou a coletar nome e idioma na área de conta; e a spec atribui o gancho pós-cadastro ao lugar errado — ele está no `onSuccess` da mutation (`SignUpFormClient.tsx:114`), não no caminho de redirect que o onboarding precisaria interceptar. Reconferida nesta rodada: **zero deriva de âncora**, exatas pela quarta rodada seguida — a única spec com esse histórico. O problema é o corte, não as referências. |
| 5 | [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | Bloqueada pelo #2; a outra dependência (`dashboard-home`) fechou nesta rodada. É o pedido original do usuário (KPIs de ativos e inativos, mais o gráfico de acesso) sobre peças que agora estão em `main`: `MetricCard.tsx:11-17`, `category-bar-chart.tsx:25-72`, `AdminHomeClient.tsx:33-55`, `queryKeys.ts:42` e o molde de rota de agregado em `users/summary/route.ts:6-20`. **O item de visitas à WEB ficou de fora do corte**, como pergunta em aberto com o custo das três saídas (GA Data API × contador próprio × provedor dedicado), porque nenhuma delas foi decidida e nenhuma teve preço levantado. |
| 6 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto do backlog e ainda em **0/6**: não existe diretório `payments/` entre as 22 rotas, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`) sem dedupe por `event.id`. **Segue atrás por um motivo de execução, não de mérito:** provar checkout, portal e webhook exige chaves reais da Stripe, e uma rodada autônoma devolveria os critérios como "não verificados". **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 7 | [`admin-billing-insights`](admin-billing-insights.md) | Logo atrás da spec que a destrava, e **é a razão de existir separada**: `billing-subscription` está em 0/6, remedido hoje. Juntá-la ao #5 faria os KPIs de atividade, que são construíveis assim que o #2 entrar, nascerem bloqueados por Stripe. Herda também o motivo de execução do #6. **O risco que a spec carrega é de correção, não de esforço** — agregar receita a partir de webhook sem dedupe por `event.id` infla o número em silêncio, porque a Stripe não garante ordem nem entrega única. |
| 8 | [`e2e-testing`](e2e-testing.md) | Destravada, e sem o argumento mais forte que tinha — o gate instável foi corrigido pela PR #13 e não voltou. O que resta é sólido e mais lento de cobrar: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, nenhuma das **10** configs medindo cobertura, e **duas rules files sem um único teste de regra** (`firestore.rules` publicado em deny-all, `storage.rules` nem publicado) — sem desculpa, porque o emulador existe. O argumento que ganhou na PR #17 triplicou: o emulador **não cobra índice composto**, e agora são **seis** índices versionados que nenhum gate local prova estarem publicados. |
| 9 | [`account-security-mfa`](account-security-mfa.md) | Cresceu três auditorias atrás e não encolheu. O item 4 (política de senha) era descrito como mudança em 5 schemas de formulário; são **10 declarações** de `MIN_PASSWORD_LENGTH`, e as 3 que importam estão em `apps/api` — mudança de contrato, não de formulário. Restam MFA (**3/10** de prevalência entre os starters pesquisados) e visibilidade de sessões (**1/10**). Reconferida nesta rodada: **zero deriva**, incluindo a armadilha do `grep checkRevoked`, que só casa um comentário. `value: médio` por mérito próprio, e esforço provavelmente acima de M. |
| 10 | [`observability-logging`](observability-logging.md) | `in-progress`. Entregue em 5 dos 6 itens, reconferidos um a um nesta rodada; o resíduo é adotar um coletor de erro, que depende de decisão de produto e de conta em provedor. **Fora do conjunto elegível** — ver [Precisam de decisão](#precisam-de-decisão). Quinta rodada consecutiva sem resposta. |
| 11 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora pela sétima rodada, e o custo subiu de novo: são **13 sítios** de posse por usuário, dois deles criados pela própria PR #19. Ver [Precisam de decisão](#precisam-de-decisão). |

### O que **não** foi escolhido para #1, e por quê

- **`data-rights-lgpd` foi a segunda colocada, e perdeu por verificabilidade somada a esforço.** É a única
  spec do backlog com prazo imposto de fora, e o argumento dela só piora com o tempo. O que a tira do topo
  **nesta** forma de execução não é só o esforço **G**: o item 3 do corte pede que a exclusão cancele
  assinatura e limpe arquivos "no mesmo fluxo", e **nenhuma das duas pontas existe de forma verificável** —
  o Cloud Storage não está ativado e não há fluxo de assinatura. Uma rodada autônoma entregaria o export e o
  delete e deixaria a coordenação, que é justamente a parte difícil, por provar. Se a execução deixar de ser
  autônoma, ela é a candidata natural ao topo.
- **`onboarding-flow` foi a terceira, e perde pelo mesmo motivo mecânico da rodada passada.** Valor alto,
  esforço M, e é a única das três primeiras que não toca em infra externa nenhuma. O corte de MVP está
  desatualizado, e uma rodada autônoma planejaria em cima dele sem perceber. Reescopar primeiro
  (`/spec onboarding-flow`) e ela passa à frente de `data-rights-lgpd` na rodada seguinte. **Terceira
  rodada em que essa reescrita é recomendada e não acontece.**
- **`billing-subscription`** tem o maior valor bruto e não foi escolhida pela razão de sempre, que merece
  ficar explícita: verificar checkout, portal e webhook exige chaves reais da Stripe. Seria entregar código
  que ninguém consegue provar hoje.

### O que o merge da PR #19 mudou no ranking

`dashboard-home` saiu do #1 por entrega, e o efeito é menor do que parece: as duas specs que dependiam dela
**não** subiram, porque a outra dependência de cada uma continua aberta. Quem subiu foi `session-refresh`,
que já era o #2 e já vinha com a recomendação da decisão nº 8 ("rodar `session-refresh` primeiro, porque ela
é destravada, corrige um defeito real e é verificável sem conta em provedor").

Ou seja: **o ranking desta rodada é o da anterior menos a linha entregue.** Não houve reavaliação de valor,
e é honesto dizer isso em vez de fabricar movimento. A decisão que segue pendente é a nº 8 — se a cadeia
pedida continua na frente de `data-rights-lgpd`, que caiu de #2 para #3 e é a única spec com prazo legal.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-17** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis agora: 6 de 11.** Fora ficam `teams-organizations` (`deferred`), `observability-logging`
(`in-progress`) e três barradas por dependência não satisfeita: `user-activity-tracking` (espera
`session-refresh`), `admin-analytics-dashboard` (espera `user-activity-tracking`) e `admin-billing-insights`
(espera `billing-subscription`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `session-refresh` · `onboarding-flow` · `e2e-testing` | `packages/auth/session.ts` + `session-routes.ts` + `server.ts` · `apps/app/proxy.ts` + `postLoginNavigation.ts` + `user-merge.ts` + `UserDTO` · `package.json` da raiz + `turbo.json` + `ci.yml` | **camada de sessão**, **desvio de navegação no app** e **ferramental da raiz**. A primeira vive inteira em `packages/auth`, a segunda no proxy e no pós-login da `apps/app`, e a terceira não toca em `apps/` nem em `packages/` |
| **2** | `data-rights-lgpd` · `billing-subscription` | `base.repository.ts` + `packages/auth/server.ts` + índices · webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` | **expurgo do titular** e **slice `user` cobrado**. Já eram disjuntas na rodada anterior e continuam |
| **3** | `account-security-mfa` | `packages/auth/*` + `resolve-api-actor.ts` | sozinha por colisão de dado, não por teto — segunda rodada seguida |

### O que mudou no cálculo, e por quê

- **`e2e-testing` voltou ao lote 1.** Não por mudança nela: ela continua disjunta de tudo. A vaga abriu
  porque `dashboard-home` saiu da fila, e o algoritmo é guloso na ordem.
- **`account-security-mfa` segue barrada por dado, não por teto.** Ela declara `packages/auth/server.ts`,
  `session.ts` e `session-routes.ts` — **exatamente os três arquivos** que `session-refresh` altera. A
  colisão é total. E ela também colide com `data-rights-lgpd` em `packages/auth/server.ts`, o que a mantém
  fora do lote 2. É a única spec elegível que não cabe em lote nenhum com companhia.
- **`data-rights-lgpd` continua fora do lote 1** por `packages/auth/server.ts`, compartilhado com
  `session-refresh`. A colisão com `dashboard-home` em `firestore.indexes.json`, que valia na rodada
  anterior, desapareceu junto com a spec entregue.
- **`billing-subscription` deixou de colidir com `onboarding-flow`?** Não. As duas declaram
  `packages/sdk/src/types/user/user.ts`, e é por isso que `billing-subscription` não entrou no lote 1 —
  colisão de dado, e não teto, apesar de o lote ter fechado em 3 de qualquer forma.

**Os arquivos mais disputados entre as 11 specs, recontados:** empatados com **3** citações,
`packages/auth/server.ts` (`session-refresh`, `data-rights-lgpd`, `account-security-mfa`),
`packages/sdk/src/types/user/user.ts` (`billing-subscription`, `onboarding-flow`,
`user-activity-tracking`) e `firestore.indexes.json` (`data-rights-lgpd`, `teams-organizations`,
`admin-analytics-dashboard`). O último **caiu de 4 para 3** porque a spec que o disputava foi entregue —
é a primeira vez que a contenção diminui numa auditoria.

> **Um aviso que sai do dado acima:** as duas specs de painel bloqueadas disputam entre si o
> `AdminHomeClient.tsx` e o `queryKeys.ts`. Quando forem destravadas, elas **não** poderão rodar no mesmo
> lote. Vale saber disso antes de planejar a noite em que as duas ficarem prontas ao mesmo tempo.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou.

A régua desta rodada, com `dashboard-home` como amostra: ela declarava **4** arquivos em `contends_on` — as
duas `page.tsx` de home, `queryKeys.ts` e `firestore.indexes.json` — e **acertou os quatro**. Primeira
previsão cheia desde que o campo existe.

Em compensação, a PR tocou 60 arquivos e o raio extra foi grande: `base.repository.ts`,
`user.repository.ts`, `entity.repository.ts`, quatro arquivos do SDK, o barril do design-system e três
arquivos de tradução. **Dois deles são `contends_on` declarado de outra spec** — `base.repository.ts`
(`data-rights-lgpd`) e `user.repository.ts` (`billing-subscription`, `user-activity-tracking`) —, e é
exatamente o tipo de colisão que o campo existe para prever e não previu.

**O padrão de quatro rodadas se inverteu.** Vinha se consolidando que o `contends_on` erra por **excesso**
(prevê disputa em arquivo que a entrega não toca), que é o erro barato. Desta vez errou por **falta**, em
dois arquivos de repositório, e o erro por falta é o caro: ele junta no mesmo lote specs que vão brigar.

## Precisam de decisão

Nenhuma delas é da auditoria. Todas têm recomendação, e nenhuma foi aplicada.

| # | questão | recomendação |
|---|---------|--------------|
| 1 | **`observability-logging` fecha como entregue?** 5 dos 6 itens estão no código, reconferidos um a um nesta rodada; o que falta é adotar um coletor de erro, que exige conta em provedor e é a pergunta em aberto nº 1 da própria spec. **Quinta rodada consecutiva sem resposta.** | **Fechar como `done`** e abrir uma spec nova de esforço P só para o coletor. Manter uma spec quase inteira aberta por um item que ninguém pode executar sem decisão de produto trava a spec e polui a fila. Enquanto não há resposta, ela fica fora dos lotes paralelos — o custo da indecisão é um workspace a menos por noite. |
| 2 | **`teams-organizations` continua `deferred`?** Vinte e nove dias e sete PRs sem nenhuma das duas contrapartidas de esforço P que tornavam o adiamento honesto. **O gatilho escrito na própria spec disparou e já se repetiu três vezes**, e o custo subiu: são 13 sítios de posse, dois criados pela PR #19 ao copiar o predicado em vez de reusá-lo. | Ou as contrapartidas viram tarefa com dono, ou o status vira `rejected` até aparecer o primeiro fork B2B. Manter `deferred` sem elas é tomar a decisão por omissão, agora pela sétima vez. |
| 3 | **Ligar o branch protection na `main`?** O único pré-requisito técnico caiu na PR #13 e continua satisfeito. Remedido hoje: `protection` → 404, `rulesets` → `[]`. Uma PR vermelha pode ser mergeada. | Ligar, exigindo o check do CI. Custo de minutos, e o risco de adiar cresce com o número de PRs — já são 19. |
| 4 | **`onboarding-flow` e `account-security-mfa` precisam de reescopo antes do `/analyze`.** As duas têm o corte de MVP desatualizado em relação ao código, cada uma por um motivo diferente. **Terceira rodada em que isso custa posição no ranking:** `onboarding-flow` tem o perfil ideal para rodada autônoma e cai para #4 só por causa do corte. | Rodar `/spec <id>` nas duas antes de planejar. Planejar sobre um corte errado custa mais caro que reescrever a spec. |
| 5 | **Quem escreve a política de privacidade que o banner linka?** O consentimento de cookies aponta para `/legal/privacy`, que é modelo e **não menciona cookies** em nenhum dos 3 idiomas. Um fork que suba assim fica em posição pior do que sem banner: o aviso afirma que existe política, e a política não descreve o tratamento. | Texto legal é responsabilidade de cada fork, não do core — mas o **core deve entregar um modelo que ao menos declare os cookies que ele próprio grava**. A tabela está em `docs/PRE-PRODUCTION.md` §7. Cabe no corte de `data-rights-lgpd` (#3) ou vira tarefa direta de esforço P. |
| 6 | **A busca da tabela enxerga só as páginas carregadas.** A PR #17 tratou o sintoma — o texto de lista vazia avisa que a busca não alcançou o resto (`table.tsx:112-118`) —, mas o comportamento continua sendo "procurar no que já baixou". A PR #18 herdou isso na trilha de auditoria. | Abrir spec própria quando alguém sentir a dor, não antes. A decisão de fundo (prefixo no Firestore × serviço de busca) é cara e não tem caso de uso concreto no core hoje. Enquanto isso, o aviso na tela é o contrato honesto. |
| 7 | **Por quanto tempo reter os eventos da trilha de auditoria?** A coleção `auditEvent` nasceu sem expurgo e sem `expiresAt`, e cresce a cada ação sensível de todo fork. A spec arquivada deixou a pergunta explícita e recomendou prazo configurável com finalidade declarada. **Segunda rodada sem resposta.** | Decidir um prazo padrão e escrevê-lo em `docs/PRE-PRODUCTION.md` §1.3, **sem** invocar o art. 15 do Marco Civil (que é do log de acesso, não da trilha de negócio). Guardar além do necessário é o risco que o Decreto 8.771/2016, art. 13, § 2º manda evitar. |
| 8 | **A cadeia pedida continua à frente de `data-rights-lgpd`?** Com `dashboard-home` entregue, a cadeia ocupa #1, #2 e #5, e [`data-rights-lgpd`](data-rights-lgpd.md) está em **#3** — subiu de #5, mas segue atrás de duas specs da cadeia. Ela continua sendo a única com prazo imposto de fora, e o argumento dela só piora com o tempo. | **Manter a cadeia à frente até o #1 entrar.** Depois de `session-refresh` mergeada, reavaliar se `user-activity-tracking` vem antes ou depois de `data-rights-lgpd`: a primeira é `value: médio`, a segunda é `alto` com prazo legal, e o único motivo de a ordem estar como está é o pedido do usuário. Empurrar uma spec com prazo legal por inércia do pedido é a decisão que merece ser tomada de propósito. |
| 9 | **Aprovar ou rejeitar as 4 specs da cadeia.** Todas nasceram `proposed` e continuam, porque o `/spec` não aprova spec. As perguntas em aberto de cada uma (teto absoluto da sessão, janela de gravação do carimbo, definição de "usuário ativo", critério de receita) estão nos arquivos, com recomendação. **`session-refresh` é o #1 da ordem e ainda não foi aprovada** — o `/cycle` planejaria sobre uma spec não aprovada. | Aprovar [`session-refresh`](session-refresh.md) e [`user-activity-tracking`](user-activity-tracking.md), que formam a base e não dependem de nada externo. [`admin-analytics-dashboard`](admin-analytics-dashboard.md) pode ser aprovada agora também: a dependência de `dashboard-home` fechou nesta rodada, e só falta o carimbo de acesso. Deixar [`admin-billing-insights`](admin-billing-insights.md) em `proposed` enquanto `billing-subscription` estiver em 0/6. |
| 10 | **Como medir visitas à `apps/web`?** Foi deixado **fora** do corte de [`admin-analytics-dashboard`](admin-analytics-dashboard.md), como pergunta em aberto com o custo das três saídas: GA Data API (env nova por fork, e só conta quem consentiu), contador próprio no Firestore (uma escrita por visita) ou provedor dedicado (conta, possivelmente paga, para todo fork). ⚠️ **Nenhuma das três teve preço ou prevalência levantados.** | Decidir à parte, depois que os KPIs de atividade estiverem de pé. Das três, o contador próprio é a única que não arrasta conta nem variável obrigatória para quem não usa — que é o critério do core. Enquanto não houver decisão, a tela deve dizer que as métricas cobrem o painel, não a landing. |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-17 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) · [`session-refresh`](session-refresh.md) | — | ✅ sem dependência |
| [`user-activity-tracking`](user-activity-tracking.md) | `session-refresh` | ⛔ **bloqueada** — a spec de sessão não foi nem aprovada |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | `user-activity-tracking`, `dashboard-home` | ⛔ **bloqueada** pela primeira; ✅ a segunda fechou (PR #19, `bfc4d8f`) |
| [`admin-billing-insights`](admin-billing-insights.md) | `billing-subscription`, `dashboard-home` | ⛔ **bloqueada** — `billing-subscription` está em 0/6; ✅ `dashboard-home` fechou |

> **A ressalva sobre `dashboard-home` caiu, exatamente como a rodada anterior previu.** Ela dizia que "a
> dependência se fecha sozinha na primeira auditoria depois do merge", e foi o que aconteceu. Fica o
> registro do método: uma dependência marcada `◐` (código no disco, fora de `main`) é diferente de uma
> marcada `⛔`, e tratá-las igual teria travado uma spec sem motivo.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | Métricas de atividade na home do admin | produto | médio | M | `proposed` | ⛔ `user-activity-tracking` · ✅ `dashboard-home` |
| [`admin-billing-insights`](admin-billing-insights.md) | Seção de billing na home do admin | produto | médio | M | `proposed` | ⛔ `billing-subscription` · ✅ `dashboard-home` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | ✅ `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | ✅ `ci-pipeline` · ✅ `firebase-emulator-seed` |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `in-progress` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`session-refresh`](session-refresh.md) | Renovação deslizante da sessão | confianca | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | ✅ `transactional-emails` |
| [`user-activity-tracking`](user-activity-tracking.md) | Último acesso do usuário | produto | médio | M | `proposed` | ⛔ `session-refresh` |

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
| `account-settings` | 2026-09-15 | [`docs/features/account-settings/spec.md`](../docs/features/account-settings/spec.md) — 6/6 do corte (PR #12, `a4df5ed`). ⚠️ O caminho feliz do **avatar** segue não verificado contra infra real |
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`). Entregou também, fora do corte, o `testTimeout` nas 9 configs de Vitest de então |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`), conferidos um a um. ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`), conferidos um a um. ⚠️ O índice composto novo **precisa ser publicado** antes de a listagem funcionar em produção |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`), conferidos um a um. ⚠️ **Três desvios registrados**, o principal sendo impersonação por janela de 15 min em vez de início/fim. O índice composto de `auditEvent` **precisa ser publicado** |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`), conferidos um a um. ⚠️ **Três desvios registrados**, o principal sendo o gráfico ter nascido como wrapper novo no design-system em vez de consumir o `chart.tsx` direto do app. **Três índices compostos** precisam ser publicados |

**Verificado nesta rodada:** `docs/features/` tem **15** pastas e **12** `spec.md` arquivados. As três pastas
sem `spec.md` são `observability-logging` (spec continua em `specs/`, por decisão desta auditoria — não
houve `git mv` e não há duplicata), `auth-panel-context` e `impersonation-read-only`. Os frontmatters das 12
arquivadas seguem coerentes (`status: done`, `feature: <slug>`).

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
na tabela, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #19 entregou **além** do corte

1. **Prefetch no servidor com `HydrationBoundary`, pulado durante impersonação**
   (`(common)/(pages)/page.tsx:14-25`). A chamada do servidor carrega só o Bearer do admin, então contaria
   os registros dele e mostraria o número errado por um instante. É o tipo de armadilha que só aparece com
   impersonação de pé — e ela está de pé desde `impersonation-read-only`.
2. **O gráfico entra por `dynamic` com `ssr: false`** (`CommonHomeClient.tsx:38-44`), respondendo ao risco
   que a própria spec levantou: `recharts` não faz tree-shaking e chegaria inteiro no chunk da tela mais
   visitada do painel.
3. **`CategoryBarChart` nasceu no design-system**, não na `apps/app`, porque `recharts` não é dependência
   declarada da `apps/app` — importá-lo de lá funcionaria só por hoisting do pnpm. As duas specs de painel
   novas já citam o componente como peça a reusar.
4. **`SUMMARY_INDEX_MISSING` traduzido nos 3 idiomas** (`translations/packages/shared/utils.ts:81,160,246`),
   no mesmo padrão de degradação que `cursor-pagination` inaugurou, mais dois `loading.tsx`, um por painel.

**Nada disso é deriva de implementação** — os desvios do corte estão registrados à parte, na spec arquivada.
É escopo adicional. E a observação que valia pelas sete PRs anteriores **não vale para esta**: a PR #19 não
consertou nenhum achado catalogado neste backlog de passagem. O que ela fechou, fechou por consequência
direta do corte (`chart.tsx` deixou de ser código morto; o literal `"Home"` sumiu das duas homes).

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 1276 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-17 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/SECURITY.md:13-16` (guards) | "Toda rota **de negócio** é embrulhada por um guard. As **três** exceções são `/health`, `/health/ready` e `/webhooks/payments`. As **17** demais passam por um dos dois guards" | **falso duas vezes, e a correção da auditoria anterior errou junto.** São **22** arquivos de rota: **11** embrulhados em guard e **11** com handler nu. Além das três nomeadas, as **8 rotas de `/auth/*`** exportam handler nu — `auth/me/route.ts:5`, `sign-in/route.ts:4`, `sign-in/google/route.ts:9`, `sign-up/route.ts:12`, `password/reset/route.ts:15`, `password/reset-request/route.ts:52`, `email-verification/send/route.ts:14`, `email-verification/confirm/route.ts:12`. E 22 − 3 = 19, não 17 | 🔴 **corrigido hoje** — a frase virou tabela com as três famílias e o motivo de cada uma. A de `/auth/*` é legítima (é a superfície anterior à sessão), mas **estava invisível**: quem usasse o parágrafo como inventário de superfície não-guardada erraria por 8 rotas |
| `docs/PRE-PRODUCTION.md` §1 (índices) | cinco índices compostos pendentes: §1.1 `entity`, §1.2 `auditEvent`, §1.5 três dos resumos | **`firestore.indexes.json` declara seis.** O que faltava é `user`: `reference_id` + `deletedAt` — a consulta de `userRepository.findByReferenceId(uid)`, que **todo guard roda** para transformar UID em documento de perfil. Ela é coberta por `apps/api/__tests__/firestoreIndexes.test.ts` e não aparecia em nenhum passo do checklist | 🔴 **corrigido hoje** — virou §1.6. É o pior dos seis para faltar e o único sem degradação traduzida, porque ninguém o previu como podendo faltar |
| `docs/PRE-PRODUCTION.md:423` (observabilidade) | "Os **quatro** passos abaixo são de console de provedor e **nenhum deles é código**" | São 4 bullets, mas o quarto já está resolvido — e foi resolvido **removendo o bloco `crons` de `apps/api/vercel.json`**, que é código | 🟢 **corrigido hoje** — "os **três** passos abertos", com a ressalva sobre o quarto |
| `docs/PRE-PRODUCTION.md` (gate) | `pnpm check` em **601 arquivos**, suíte de **1276 testes em 130 arquivos**, **24/24 tasks**, **10 de 10** configs com `testTimeout` | **os quatro conferem.** Medidos agora: 601 arquivos (`No fixes applied`), 1276 em 130, 24/24 sem cache, 10/10 — inclusive as dez âncoras de linha das configs | ✅ **honesto na estreia** — primeira rodada em quatro em que estes números não precisaram de correção, porque a PR #19 os atualizou dentro dela |
| `docs/PRE-PRODUCTION.md` §1.5 (índices da home) | três entradas novas, com a tabela de coleção/campos e o 503 `SUMMARY_INDEX_MISSING` | **confere campo a campo** contra `firestore.indexes.json`, e a degradação está em `entities/summary/route.ts:16` e `users/summary/route.ts:14`, traduzida nos 3 idiomas | ✅ **honesto** já na estreia |
| `docs/SECURITY.md:138-140` (rate limit) | roda sobre lista fechada de **8 caminhos**, casados por igualdade exata, e as **3** rotas de `/account` estão fora | **confere.** `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:42-51`) tem exatamente os 8 listados | ✅ **honesto** pela quinta rodada |
| `docs/SECURITY.md:155` (higiene do `.env.example`) | marcado como **feito**: sem Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks nem BaseHub | **confere.** `grep` pelas sete devolve zero nas 60 linhas | ✅ **honesto** — a correção da rodada anterior pegou |
| `docs/PAYMENTS.md` (estado geral) | não há fluxo de assinatura; os stubs estão em `route.ts:10-27` com `TODO` em `:13,23`; não existem `UserDTO.subscription`, `stripeCustomerId`, `updateSubscriptionByReferenceId` nem rotas de `payments/`; `apiClient.payments` não existe | **confere nas onze âncoras e nos quatro `grep`** | ✅ **honesto** pela sétima rodada — o único documento com esse histórico |
| `docs/PRE-PRODUCTION.md` (branch protection) | `protection` → 404, `rulesets` → `[]` | **confere, remedido hoje** via `gh api` | ✅ **honesto** |

> **Nota de método, décima rodada consecutiva.** Pela primeira vez os números de gate **não** envelheceram,
> porque a própria PR #19 os atualizou. Em compensação apareceu o caso mais caro até aqui: uma afirmação de
> segurança que **a auditoria anterior tinha "corrigido" e deixado errada**. A correção da rodada passada
> nomeou três exceções, parou de contar e não conferiu as 19 restantes uma a uma. **A regra prática que sai
> daqui: correção de afirmação de inventário exige recontar o inventário inteiro, não emendar a frase.**

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **7 das 11** specs que seguem em `specs/`, e **três derivas de implementação**
na spec entregue. As intactas são [`onboarding-flow`](onboarding-flow.md) (âncoras e contagens exatas pela
quarta rodada seguida — a única com esse histórico), [`account-security-mfa`](account-security-mfa.md)
(cerca de 30 âncoras e 4 contagens, todas exatas), [`observability-logging`](observability-logging.md) no que
toca a âncoras e contagens, e [`session-refresh`](session-refresh.md), que teve um único intervalo errado.

**A deriva de âncora desta rodada tem uma única causa**: a PR #19 inseriu linhas **no meio** de
`base.repository.ts` (`countQuery`, `:122`), `user.repository.ts` (`summary()`, `:52`),
`entity.repository.ts` (dois imports no topo) e `packages/sdk/src/types/user/user.ts` (`UserSummaryDTO`,
`:38-46`). Inserção no meio é o padrão que mais desloca âncora; acréscimo no fim não desloca nada.

### Deriva de implementação — `dashboard-home`

Três, todas registradas na spec arquivada. Nenhuma foi erro de execução.

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "exercitando o `chart.tsx` que já está no design-system" | O app não consome `chart.tsx` direto: a PR criou `category-bar-chart.tsx` **no próprio pacote**, e o app consome esse wrapper | **A implementação desviou, com motivo.** `recharts` não é dependência declarada da `apps/app`, então importá-lo de lá funcionaria só por hoisting do pnpm — o mesmo defeito que este backlog cataloga em `@repo/email` e `@repo/auth`. O efeito colateral é bom: o wrapper é reutilizável e as duas specs de painel já o citam |
| "possivelmente um cartão de métrica reutilizável" no design-system, com a recomendação de manter local | `MetricCard.tsx` ficou em `apps/app/shared/components/ui/` | **A recomendação foi seguida.** Registrado para contraste com a linha acima: dos dois componentes novos, um foi para o pacote e o outro não, e o critério foi a dependência, não a estética |
| "estados vazio, carregando e erro tratados nos widgets" | A home comum tem os três; a do admin tem carregando e erro, sem estado vazio | **A spec estava errada.** Não existe painel admin com zero usuários — quem está olhando a tela é um deles |

### Âncoras deslocadas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`data-rights-lgpd`](data-rights-lgpd.md) | `base.repository.ts:196-198` (`delete()`), `:197` (`deletedAt`) | **`:205-207`**, **`:206`** | `countQuery` entrou em `:122` e empurrou o resto do arquivo |
| [`billing-subscription`](billing-subscription.md) | `UserWithAuthDTO` em `user.ts:38-60` | **`:48-70`** | `UserSummaryDTO` entrou em `:38-46` |
| [`billing-subscription`](billing-subscription.md) | copy de billing "traduzida nos 3 idiomas" em `account.ts:170` | **`:78` (pt-br), `:167` (en), `:257` (es)** | a âncora apontava para o meio do bloco em inglês — erro antigo, não da PR #19 |
| [`teams-organizations`](teams-organizations.md) | `entity.repository.ts:15` (`listByUserId`), `:22` (`where`) | **`:16`**, **`:23`** | dois imports novos no topo do arquivo |
| [`teams-organizations`](teams-organizations.md) | "o `if` abre em `:66`" em `entities/[id]/route.ts` | **`:65`** | off-by-one herdado de duas rodadas atrás; `:66` é a condição, não o `if` |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) · [`admin-billing-insights`](admin-billing-insights.md) | `users/summary/route.ts:6-19` | **`:6-20`** | fim do intervalo cortado uma linha antes do `});` |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | `analytics/keys.ts:4-18`, `analytics/server.ts:15-29` | **`:4-19`**, **`:15-30`** | dois intervalos fechados uma linha antes do fim da função |
| [`user-activity-tracking`](user-activity-tracking.md) | `user.mapper.ts:30-45` (`serializeFirestoreValue`) | **`:30-47`** | o intervalo truncava o ramo de array e o `return` final |
| [`session-refresh`](session-refresh.md) | `packages/auth/server.ts:272-279`, `console.error` em `:276-278` | **`:272-278`**, **`:276`** | fim do intervalo uma linha além da função |

Corrigidas as sete specs no disco (quatorze âncoras ao todo), mais duas afirmações de estado que apareciam em
três specs (ver abaixo). **Sete das quatorze não foram causadas pela PR #19** — são intervalos que já nasciam
fechados uma linha antes ou depois do fim real. Isso é um achado sobre o método, não sobre a entrega: quem
cita `arquivo.ts:NN-MM` está medindo o fim do bloco de cabeça.

### Contagens e afirmações de estado erradas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`e2e-testing`](e2e-testing.md) | 1227 testes em 124 arquivos · `apps/api` 511 em 46 · `apps/app` 342 em 47 | **1276 em 130** · **532 em 48** · **370 em 51** | **Quinta rodada seguida com estes números errados, e desta vez com agravante:** eles foram gravados *dentro* da PR #19, antes de os commits de código dela entrarem — exatamente o erro que o parágrafo ao lado deles denuncia. A nota foi reescrita para dizer isso |
| [`billing-subscription`](billing-subscription.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | **20** `route.ts` em `apps/api/app/(routes)/` | **22** | `entities/summary` e `users/summary`. O número de **grupos** (8) não mudou, e a spec de LGPD acertava esse |
| [`user-activity-tracking`](user-activity-tracking.md) · [`admin-analytics-dashboard`](admin-analytics-dashboard.md) · [`admin-billing-insights`](admin-billing-insights.md) | "o repositório já tem **dois** índices versionados e não publicados" | **cinco** no checklist (`docs/PRE-PRODUCTION.md` §1.1, §1.2, §1.5), **seis** no arquivo versionado | As três specs herdaram a mesma frase e envelheceram juntas. As três usam esse número como argumento contra acrescentar mais um índice, e o argumento **ficou mais forte**, não mais fraco |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) · [`admin-billing-insights`](admin-billing-insights.md) | `dashboard-home` "entregue na branch `feat/dashboard-home` e ainda não em `main`" | **em `main` desde `bfc4d8f`** | Aviso vencido pelo merge. Substituído pelo ponteiro para a spec arquivada |
| [`teams-organizations`](teams-organizations.md) | **11 sítios** de posse por usuário, em 3 recursos | **13** | A PR #19 criou dois: `entity.repository.ts:33` (`summaryByUserId` repete o `where("userId", "==", userId)` num closure) e `entities/summary/route.ts:9`. **A spec previu literalmente este comportamento** — "cada recurso novo acrescenta sítios, e o retrofit não é find & replace" |
| [`teams-organizations`](teams-organizations.md) | "quinta rodada" sem as contrapartidas | **sétima** | Contador de rodadas, não de código |
| [`observability-logging`](observability-logging.md) | o resíduo está em `docs/PRE-PRODUCTION.md`, **seção 10** | **seção 11** | A seção 10 é a CSP bloqueante da `apps/web`. Ponteiro errado desde que a spec foi escrita |

### O que a auditoria **não** encontrou

Vale registrar pelo que não obriga a fazer: nenhuma spec `done` regrediu, nenhuma entrega parcial ficou
órfã, e nenhuma feature em `docs/features/*/STATE.md` está sem `spec:` correspondente quando deveria ter.
`docs/features/dashboard-home/STATE.md` já trazia `spec: dashboard-home`, então o arquivamento não precisou
tocá-lo.

**Uma inconsistência de pipeline, sem efeito sobre a entrega:** o `STATE.md` da `dashboard-home` registra
que "o relatório do `/test` não virou arquivo: o harness da sessão bloqueou a escrita de `test/report.md`".
O arquivo **existe** e tem 13 KB — entrou na PR #19. A nota descreve um problema que foi resolvido depois
dela ser escrita. Não foi corrigida aqui: a auditoria do backlog não é dona daquele arquivo além do campo
`spec:`.

## Achados — correções pontuais, não specs

Coisas que não merecem spec própria (não são funcionalidade, não têm corte de MVP), mas que são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-17 (pós-PR #19).** Os achados da rodada anterior foram reconferidos contra o
> código, um a um. **Placar: 2 fechados · 2 novos · o resto intacto e confirmado no disco.**

### Achados fechados

| achado | como fechou |
|--------|-------------|
| ✅ **`chart.tsx` era código morto — `recharts` pesava no bundle sem uso** | Fechado pela PR #19, e era o resultado previsto: `category-bar-chart.tsx:6,40` consome `ChartContainer`, e `EntityTypeChart.tsx:40` é o primeiro consumidor de produto. O achado e a recomendação de prioridade apontavam para o mesmo lugar, e a entrega resolveu os dois |
| ✅ **O literal `"Home"` nas duas `page.tsx` de home** | Fechado pela PR #19: as duas homes passaram a ler `routes.root.label` (`CommonHomeClient.tsx:167`, `AdminHomeClient.tsx:61`). `grep '"Home"'` na `apps/app` devolve zero. **O resto do achado continua aberto** — `"Switch language"` e `"Início"` seguem cravados, ver abaixo |

### 🆕 Achados novos

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O predicado de posse foi copiado, não reusado, na agregação nova** | `apps/api/(shared)/repositories/entity.repository.ts:33` · `apps/api/app/(routes)/entities/summary/route.ts:9` | `summaryByUserId` repete o `where("userId", "==", userId)` que `listByUserId` já fazia dez linhas acima. Levou os sítios de escopo por usuário de 11 para **13**, e é a evidência mais limpa até agora do argumento de [`teams-organizations`](teams-organizations.md): o predicado não tem nome nem casa, então cada recurso novo o copia |
| 🟡 **`userRepository.summary()` e `userRepository.list()` contam populações diferentes, de propósito** | `apps/api/(shared)/repositories/user.repository.ts:46-51` (o porquê) · `:32-43` (a lista) | A escolha está documentada e é defensável: refazer o join com o Firebase Auth para contar significaria ler todo perfil, que é o custo que a agregação existe para evitar. O efeito visível é que **o cartão de total pode mostrar mais do que a tabela lista**, e nada na tela explica isso. Não é bug; é um número que vai gerar pergunta |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#6) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports` |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o primeiro import do `apps/api/proxy.ts:1` — o middleware, que roda em toda requisição | `packages/security/index.ts:11` | `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot — e `instrumentation.ts:26-30`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:20-24`) e **não há `process.exit` em nenhum lugar do arquivo** | `apps/api/instrumentation.ts:20-24` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. ✅ Mitigação parcial: `/health/ready` consulta o Firestore, então um health check apontado para ele detecta parte dessas falhas. Não detecta esta em específico |
| ⚠️ **As 3 rotas de `/account` não estão no rate limit** — incluindo troca de senha, alvo clássico de força bruta | `apps/api/proxy.ts:42-51` | Casamento exato (`includes`), decisão consciente para não limitar `/auth/sign-in/google` duas vezes. Mas rota nova nasce sem limite. 🆕 **A PR #19 acrescentou a quinta e a sexta rota fora da lista** (`/entities/summary`, `/users/summary`), ambas de leitura e sob guard. O padrão se repetiu em três PRs seguidas: **rota nova nunca entra na lista** |
| 🆕 ⚠️ **A superfície não-guardada da API é maior do que qualquer documento dizia** — **11 de 22** arquivos de rota exportam handler nu, sendo 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | As 8 são legítimas (é a superfície anterior à sessão, e um guard de sessão recusaria quem vem criar uma), mas duas delas não seguem o contrato de erro do repo — ver o achado de `/auth/sign-in` abaixo. O que era achado de documentação virou achado de inventário: **ninguém tinha contado**. `docs/SECURITY.md` foi corrigido hoje |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| ◐ **Dependência importada sem ser declarada — uma metade fechada, duas abertas.** ✅ `apps/app/package.json` passou a declarar `@repo/analytics` (PR #16). 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` e `apps/app/package.json` **não declara** `@repo/email` (reconferido: 0 ocorrências). 🟡 `apps/web` importa `@repo/auth/provider` em **5 arquivos** de produção e `apps/web/package.json` **não declara `@repo/auth`** (reconferido: 0 ocorrências) | `apps/app/package.json` · `apps/web/package.json` | Funciona por hoisting do pnpm. Além do risco de resolução, **o turbo não invalida `web#*` quando `@repo/auth` muda** — cache mentindo num gate que roda em toda PR. 🆕 **A PR #19 tratou este risco corretamente num caso novo**: pôs o gráfico no design-system em vez de importar `recharts` da `apps/app`. O padrão certo existe; estes dois são a dívida anterior |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` **não existe**. Zero importadores, falha em silêncio. **Décima quinta auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` de todo o resto | `packages/auth/package.json:25` | É o único workspace fora da major. Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome. ⚠️ **`session-refresh` é o #1 da ordem e mexe exatamente neste pacote**: vale decidir a major antes, não durante |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 **`input-otp.tsx` é código morto**, sem consumidor fora do barril e do catálogo do `playground` | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: 0 consumidores. `account-security-mfa` (#9) é a spec que o usaria. **É agora o último componente morto do design-system** — `chart.tsx` saiu da lista nesta rodada. ⚠️ Cuidado ao medir: `InpuTOTP` casa com um `grep -i TOTP` e produz falsos positivos |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` seguem instalados e nunca importados** | `apps/app/package.json:27,36` | São as dependências típicas de OTel/Sentry. As PRs #15 a #19 passaram sem tocá-las, o que confirma que são peso morto e não semente de nada |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-11` | Falta o subpath `"./utils/*"` (consumidor externo não alcança `utils/cookies.ts`), e o `"."` (`:6`) aponta para `index.ts`, **que não existe** — reconferido no disco |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | O campo vizinho `requestId`, nascido na mesma entrega, **foi ligado até a tela**. Dois campos em linhas adjacentes, só um chegou ao usuário. ⚠️ Há um `retryAfterSeconds` **homônimo de outro tipo** em `apps/api/proxy.ts:102` |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — nono ciclo | `packages/auth/client.ts:224` | A única cobertura é `apps/app/__tests__/useEmailVerification.test.tsx`, que a **mocka** |
| 🟡 **`packages/shared` é o único pacote com `test` e sem `typecheck`** | `packages/shared/package.json:11` | O pacote hospeda o helper de log e o `requestErrorReporter`, e a imunidade a `Error` do `logEvent` é garantida pelo **tipo**, que nenhum gate deste workspace verifica. Fica coberto de lado pelo `typecheck` dos consumidores; não pelo próprio |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `delete()` herdado por todo repositório é **soft delete** — chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:205-207` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` (#3) — e deixa **duas** famílias de objeto órfãs no bucket. **`AuditEventRepository` é o único repositório a recusar o herdado**, lançando `AuditEventImmutableError` (`audit-event.repository.ts:100-106`) — precedente útil para quem for mexer nisso. ⚠️ **Âncora deslocada duas vezes em duas PRs** (`:127-129` → `:196-198` → `:205-207`) |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32-43` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth, e descarta linhas em silêncio (`:42`). O N+1 do Admin SDK está em `:38-40`. **Não foi migrado para o cursor**, por decisão explícita da spec de paginação. 🆕 **A PR #19 não acrescentou consumidor** — `summary()` foi escrito de propósito para não passar por ele (`:46-51`), o que é a escolha certa e deixa o N+1 exatamente onde estava, com os dois consumidores da PR #18 |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. Seguem órfãs — o SDK chama `/auth/me`, `/auth/sign-in/google` e as rotas de senha, nunca estas. A decisão certa provavelmente é removê-las. 🆕 **Ganhou contexto nesta rodada**: elas são 2 das 8 rotas `/auth/*` sem guard que `docs/SECURITY.md` não declarava |
| 🟡 **Webhook da Stripe é casca**, e `:67` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | A assinatura **é** validada (`:45`); nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#6) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:46` | `pnpm --filter api dev:with-stripe` **não pode funcionar**. Duas das três chaves afetadas já foram resgatadas por redeclaração (`FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_APP_URL`), **com comentário nomeando esta armadilha** — esta ficou de fora |
| ◐ **`skipValidation` na `apps/web` é incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` | `apps/web/env.ts:27,13-19` | O CTA "Ir para o painel" da landing cai no fallback em `hero.tsx:44`, `cta.tsx:35`, `header/index.tsx:35-36` e `pricing/page.tsx:77,120`. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189-202` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada** — UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL redescobre o mesmo defeito. ⚠️ `onboarding-flow` (#4) declara este arquivo em `contends_on` |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | O idioma escolhido **não sobrevive ao fechamento do navegador**. Nem o `x-theme` nem o `bp:cookie-consent` herdaram o defeito — os dois são gravados só pelo cliente |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** por padrão; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. ◐ **Meio fechado pela PR #16:** o helper passou a aceitar `secure` como opção, e o cookie de consentimento a usa em produção. `x-locale` e `x-theme` continuam sem. ⚠️ **`session-refresh` (#1) toca `session.ts`** — é a chance barata de fechar isto de passagem |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru | `packages/sdk/src/client/base.ts:45,53,61,95` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu às PRs #11 a #19.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder`. A PR #18 estreou o primeiro filtro de data do produto e tornou o defeito visível; a #19 passou ao lado sem tocá-lo |
| 🟡 **O `DateInput` compartilhado formata data e calendário sempre em inglês** | `packages/design-system/components/ui/date-input.tsx:83` | `format(selected, "PPP")` do `date-fns` sem a opção `locale`. Vale para qualquer fork em qualquer idioma — é da mesma família do `"Pick a date"` logo acima |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`, nos **dois** apps) e `"Início"` no breadcrumb | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` | ✅ **O `"Home"` das duas páginas saiu na PR #19.** O que resta agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, e está nos dois apps. O `PageBreadcrumb` ainda crava `href="/painel"` em `:29` |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | O `select` é alimentado por `useListUsers()`, que só lista quem existe. O evento de exclusão **foi projetado para sobreviver ao usuário** (`users/[id]/route.ts:115` lê o rótulo antes de apagar), e é justamente ele que o filtro não consegue selecionar |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | `catch { return null; }` sem `logEvent`. Degradar para evento sem rótulo é a decisão certa e está documentada no docblock; o problema é não deixar rastro. Numa investigação, "evento sem rótulo" e "Firebase Auth fora do ar" ficam indistinguíveis |
| 🟡 **A mensagem de erro padrão do repo inteiro está cravada em pt-br dentro de um pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | `"Um erro inesperado aconteceu"` é o retorno de **todo** erro que não é `FormattedError` — o fallback que qualquer fork mostra quando nada mais funciona, em espanhol e em inglês também. 🆕 **A PR #19 ligou `handleClientError` nas duas homes** (`CommonHomeClient.tsx:57`, `AdminHomeClient.tsx:25`), então o defeito agora alcança a primeira tela depois do login |
| 🟡 **`apps/web/…/sign-in/validations/signInSchema.ts:9` crava a mensagem de validação em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | `"A senha deve ter pelo menos 6 caracteres"` fora do dicionário. Os outros nove sítios de `MIN_PASSWORD_LENGTH` passam por `validation.passwordMin` |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:29-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem; as deps `[api, current]` reagendam a cada tick. É a home da landing |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:11` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo. 🆕 **A PR #19 criou dois hooks novos no padrão certo** (`useEntitySummary`, `useUserSummary`), o que deixa o `useHealthCheck` como o único fora da regra |
| 🟡 **`provider-error` não distingue as falhas do provedor** — cota estourada, domínio não verificado e chave revogada produzem o mesmo `reason` | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado**. A assimetria criada pela PR #15 segue: `@repo/email` manteve o próprio `logEmail` (`:39-49`) em vez de usar o `logEvent` compartilhado — mesmo formato, código duplicado, e o teste de privacidade vigia só esta cópia |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | O form não tem `<form>`, nem handler, nem import da action — que **existe e tem teste** e zero chamadores de produção |
| 🟡 **O rodapé da `apps/web` consome `data-cookie-banner` sem teste que fixe o acoplamento** | `apps/web/app/[locale]/components/footer.tsx:56` | O banner publica o atributo e dois layouts o leem. O lado da `apps/app` tem teste (`apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`); o da `web` não, porque a suíte dela roda em `environment: "node"`, sem jsdom |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito. O documento ganhou a seção 1.5 (índices da home) na PR #19 e a **1.6**
> nesta auditoria.

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | 🆕 🔴 **Os três índices compostos dos resumos da home precisam ser publicados.** Sem eles, `GET /entities/summary` e `GET /users/summary` respondem 503 `SUMMARY_INDEX_MISSING` e os dois cartões de cada painel mostram o erro traduzido. A saudação fica, o painel navega, nada responde 500 | `PRE-PRODUCTION.md` §1.5 | ~5 min + construção |
| 2 | 🆕 🔴 **O índice da busca de perfil por `reference_id` precisa ser publicado, e ninguém sabia.** Ele está declarado desde antes deste backlog e **não constava em passo nenhum do checklist** até hoje. É a consulta que todo guard roda para transformar o UID do Firebase Auth no documento de perfil, e é a única dos seis **sem degradação traduzida**, porque ninguém a previu como podendo faltar | `PRE-PRODUCTION.md` §1.6 | ~5 min + construção |
| 3 | 🔴 **O índice composto da trilha de auditoria precisa ser publicado.** Sem ele, o **filtro por usuário** de `/admin/audit` responde 503 `PAGINATION_INDEX_MISSING`. A listagem e o filtro de período funcionam sem ele | `PRE-PRODUCTION.md` §1.2 | ~5 min + construção |
| 4 | 🔴 **O índice composto da listagem paginada de `entity` precisa ser publicado.** Sem ele, `GET /entities` responde `PAGINATION_INDEX_MISSING` em produção e a tela fica vazia. ⚠️ **O emulador não cobra índice composto**, então nada no gate local pega isto — e agora são **seis** índices nessa situação, contra dois na rodada passada | `PRE-PRODUCTION.md` §1.1 | ~5 min + construção |
| 5 | **A retenção da coleção `auditEvent` não foi decidida.** Os documentos não têm `expiresAt` e nada expurga. É a decisão nº 7, e cresce com o uso de cada fork | `PRE-PRODUCTION.md` §1.3 | decisão + ~10 min |
| 6 | **Backfill de instantes em base que já tem dado.** Antes da PR #17 o `update()` regravava `createdAt` como string ISO; o Firestore ordena por tipo antes de valor, então registros já tocados por um `PUT` ficam fora da ordenação. O script existe e tem dry-run | `PRE-PRODUCTION.md` §1.4 | ~10 min por coleção |
| 7 | **`main` não tem branch protection.** O pré-requisito caiu na PR #13 e continua satisfeito — o gate fechou 24/24 sem cache. Remedido hoje: `protection` → 404, `rulesets` → `[]` | `PRE-PRODUCTION.md` | **minutos** |
| 8 | **Ninguém vigia a trilha de erro.** O `onRequestError` está plugado nos três apps e escreve no stdout; nenhum coletor está ligado e nenhum alerta é disparado. `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve zero, remedido hoje. É o resíduo de `observability-logging` | `PRE-PRODUCTION.md` §11 | P + conta em provedor |
| 9 | **O health check da plataforma não aponta para `/health/ready`.** A rota existe e responde 503 quando o Firestore não atende em 2 s; enquanto ninguém a configura, a plataforma segue olhando `/health`, que responde OK com o banco fora do ar | `PRE-PRODUCTION.md` §11 | ~2 min |
| 10 | **`SESSION_COOKIE_DOMAIN` precisa estar definida se `web` e `app` rodarem em subdomínios distintos.** Sem ela o cookie de consentimento fica host-only e o visitante responde ao banner **duas vezes**. Degrada, não quebra — e **não aparece em desenvolvimento**, porque em `localhost` o browser ignora a porta | `PRE-PRODUCTION.md` §7 | ~2 min |
| 11 | **A política de privacidade linkada pelo banner não menciona cookies.** Ver a decisão nº 5 | `PRE-PRODUCTION.md` §7 | P (texto) |
| 12 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados" — com **dois** consumidores. Exige plano **Blaze**. Também trava metade do item 3 de `data-rights-lgpd` (#3 da ordem) | `PRE-PRODUCTION.md` | cartão + ~15 min |
| 13 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 14 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações | `PRE-PRODUCTION.md` | P |
| 15 | **Contas de QA acumuladas: 15.** A PR #19 não acrescentou nenhuma — o `/test` dela rodou contra o emulador, como os das #17 e #18. Uma das antigas (`qa-account-settings-b@`) segue **inutilizável**: apagar, não reusar | `PRE-PRODUCTION.md` | P |
| 16 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 17 | **O login com Google nunca teve passe manual com conta real.** ⚠️ A única que continua existindo só aqui. O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta | *(só neste arquivo)* | ~2 min |
| 18 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** Depende da pendência 12; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#8) | `PRE-PRODUCTION.md` | ver #12 |
| 19 | **Conferir a retenção de log da plataforma no painel do provedor.** O prazo e a fundamentação já estão escritos (Marco Civil art. 15, art. 5º VIII, Decreto 12.975/2026); o que falta é ler o número que o provedor pratica | `PRE-PRODUCTION.md` §11 | ~5 min |
| 20 | **O item de reabertura do consentimento no `ProfileDropdown` nunca foi visto num browser.** Coberto por teste jsdom (`apps/app/__tests__/profileDropdownCookieConsent.test.tsx`), não por passe visual | *(só neste arquivo)* | ~2 min com emulador de pé |

> **A fila de índices triplicou numa entrega, e isso merece leitura.** Eram dois na rodada passada; são
> **seis**. Quatro vieram da PR #19 — três novos mais um que existia e nunca fora catalogado. O emulador
> serve qualquer consulta com ou sem índice, então **nenhum gate local vê isso**: a única barreira é
> `apps/api/__tests__/firestoreIndexes.test.ts`, que prova que a entrada está no arquivo versionado, não
> que está publicada. Cada spec nova que agrega ou ordena por campo novo acrescenta uma linha nesta fila.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | Mantém o argumento das quatro rodadas anteriores. A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Deixou de ser "adotar observabilidade" e virou "ligar um fio de esforço P". Depende da decisão nº 1. |
| **Widgets configuráveis, arrastáveis ou por papel na home** | — | 🆕 Explicitamente fora do corte de `dashboard-home`, arquivada: complexidade sem retorno num core que cada fork vai reescrever. |
| **Série temporal real, comparação com período anterior, filtro de intervalo na home** | — | 🆕 Fora do corte de `dashboard-home`. A parte de atividade virou [`admin-analytics-dashboard`](admin-analytics-dashboard.md) e a de receita, [`admin-billing-insights`](admin-billing-insights.md) — as duas com o custo do gráfico por balde escrito na spec. |
| **Contador materializado / agregação incremental** | — | 🆕 Fora do corte de `dashboard-home`, que resolveu contar com a agregação nativa do Firestore (`base.repository.ts:122-124`). Vira necessário só quando alguma coleção crescer a ponto de a agregação doer, e aí com medição. |
| **Exportar a trilha de auditoria · expurgo automático** | — | Explicitamente fora do corte de `audit-log`, arquivada. As duas dependem de decidir o prazo de retenção, que é a decisão nº 7. O expurgo vira tarefa direta assim que houver prazo. |
| **Alerta em tempo real sobre ação sensível** | — | Fora do corte de `audit-log`. Depende de `observability-logging` ter um coletor do outro lado — hoje não tem. |
| **Auditar toda escrita de qualquer recurso** | — | Fora do corte de `audit-log`, com o motivo escrito na spec: começa caro, envelhece mal e gera ruído. A trilha cobre cinco ações sensíveis, não o CRUD inteiro. |
| **Busca textual no servidor** | — | Explicitamente fora do corte de `cursor-pagination`, arquivada. Com a paginação, o `searchFields` da tabela passou a filtrar só a página carregada; a PR tratou o sintoma avisando o usuário. A trilha de auditoria herdou o mesmo comportamento. Ver a decisão nº 6. |
| **Contagem total de registros na listagem** | — | Fora do corte de `cursor-pagination`. 🆕 **Reavaliar quando alguém pedir:** o `countQuery` que a PR #19 acrescentou (`base.repository.ts:122-124`) é exatamente a peça que faltava, e o custo caiu de "agregação nova" para "uma chamada". |
| **Registro auditável de consentimento** | — | Fora do corte de `cookie-consent`, arquivada. Prova de consentimento é obrigação do controlador e hoje a escolha vive só no navegador do titular. `audit-log` foi entregue sem absorvê-lo. Resta `data-rights-lgpd` (#3) como candidato natural, e ela ainda não o declarou. |
| **CMP certificada de terceiro · TCF do IAB · geolocalização do visitante** | — | Fora do corte de `cookie-consent`, arquivada. As duas primeiras arrastam serviço pago para todo fork; a terceira parece economia e é fonte de bug e de dúvida jurídica. |
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. |
| Firebase App Check | — | Explicitamente fora do corte de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** A action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P — vai direto ao `/analyze`. |
| **Migrar a listagem de usuários para o cursor** | — | Fora do corte de `cursor-pagination`, arquivada. `userRepository.list()` carrega um N+1 do Admin SDK: paginá-la sem resolver isso entregaria uma listagem que faz uma chamada de rede por linha. Tarefa própria, e o N+1 vem primeiro. |
| Provedor de e-mail plugável (SES/Postmark) · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`, arquivada. Reabrir exige spec nova. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, arquivada. O `POST /files` ficou genérico de propósito. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`, arquivada. A exclusão de conta virou [`data-rights-lgpd`](data-rights-lgpd.md) e as sessões viraram [`account-security-mfa`](account-security-mfa.md); a **troca de e-mail** continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, arquivada. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#8). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Explicitamente fora do corte de `observability-logging`. A nota de pesquisa registra o conflito entre Sentry v8+ e `@vercel/otel`, que quebra a propagação de trace em silêncio — má primeira dívida para um MVP. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional que manter no core. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. O pré-requisito está satisfeito há seis rodadas. Reavaliar junto com o branch protection. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição, e como opt-in por variável ausente. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **10** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois. Cruza com `e2e-testing` (#8). |
| Changesets / versionamento · Storybook | — | Com pacotes `private: true` e forks que divergem, o valor do changelog não paga o processo. O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
