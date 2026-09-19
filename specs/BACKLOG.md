# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-17 (`/spec --sync`, pós-merge da PR #20) · anteriores: 2026-09-17 (PR #19) ·
> 2026-09-17 (PR #18) · 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) ·
> 2026-09-16 (PRs #13 e #14) · 2026-09-15 · 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) ·
> 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`session-refresh` foi entregue e arquivada.** Era o #1 desta lista. Os seis itens do corte foram
>    reabertos um a um no código; PR #20 mergeada em `main` (`cc93229`), CI `success` no SHA de merge. É a
>    décima terceira spec a sair da fila, e vive agora em
>    [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md).
> 2. **A spec estava errada sobre o próprio problema, e o erro mudou o desenho da entrega.** Ela afirmava
>    que "nada renova". Renovava: o `provider.tsx` regravava o cookie de hora em hora, sem teto e sem
>    ninguém ter decidido isso. O item de maior valor do corte passou a ser o teto absoluto, não o caminho
>    de renovação. As três derivas estão na spec arquivada.
> 3. **`user-activity-tracking` foi destravada** — a única dependência dela era `session-refresh`. E ficou
>    mais barata do que a própria spec orçava: o throttle da renovação entregou a janela de gravação que ela
>    exigia no corte. Detalhe em [Ordem recomendada](#ordem-recomendada).
> 4. **`account-security-mfa` saiu do isolamento.** Ela declarava exatamente os três arquivos de
>    `packages/auth` que `session-refresh` alterava. Com a spec entregue, a colisão caiu, e ela volta a caber
>    num lote com companhia pela primeira vez em três rodadas.
> 5. **Dezoito âncoras deslocadas em quatro specs**, quase todas porque a PR #20 acrescentou ~90 linhas a
>    `packages/auth/server.ts` e ~130 a `session-routes.ts`. Corrigidas no disco.
> 6. **Três specs estavam com link quebrado para `dashboard-home.md`** desde o arquivamento da rodada
>    anterior. O arquivamento move a spec e não conserta quem apontava para ela — ver
>    [Achados](#-achados-novos).

## Contadores

Sobre as **10 specs que seguem em `specs/`**. Recontados do disco em 2026-09-17, lendo o frontmatter de cada
arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 8 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 13 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 5 · `confianca` 2 · `dx` 2 (+1 `deferred` em `produto`). **Por esforço:**
P 0 · M 7 · G 3. **Por valor:** alto 5 · médio 5 · baixo 0.

**Transições aplicadas: 1** (`session-refresh`: `proposed` → `done`, arquivada). Nenhuma spec nova entrou:
esta rodada é `--sync` puro.

> **A distribuição melhorou por subtração de novo, e pela segunda rodada seguida.** `confianca` caiu de 3
> para 2 porque a spec entregue era de `confianca`. O eixo de ferramental continua com duas specs, as duas
> paradas: `e2e-testing` por esforço G e `observability-logging` por uma decisão que não chega há seis
> rodadas.

### O caso `session-refresh` — o que foi conferido antes de arquivar

PR **#20** mergeada em `main` em 2026-09-17T23:37:55Z (merge commit `cc93229`), com CI `success` nesse SHA
(`gh run list`). Os seis itens do corte, reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Caminho de renovação servido pelo mesmo pacote das rotas de sessão | **implementado** | `sessionRefreshPOST` em `packages/auth/session-routes.ts:87-123`, montado pelos dois front-ends em `apps/app/app/api/auth/session/refresh/route.ts` e `apps/web/app/api/auth/session/refresh/route.ts` |
| 2. Renovação só depois de uma fração da vida do cookie | **implementado** | `shouldRefreshSession` (`session.ts:137-140`) compara a idade do `iat` contra `REFRESH_AFTER_FRACTION = 0.5` (`:30`); antes do limiar a rota devolve `{ refreshed: false }` sem chamar o provedor (`session-routes.ts:108-110`) |
| 3. Teto absoluto contado do `auth_time`, por env com padrão e grampeado | **implementado** | `getSessionAbsoluteMaxAgeMs` (`session.ts:96-108`): padrão de 30 dias, piso na vida do cookie, teto de 90. `resolveSessionOriginSeconds` (`:111-122`) lê a claim `sessionAuthTime` e recua para `auth_time`. Variável em `apps/app/.env.example:40` e `apps/web/.env.example:36` |
| 4. Renovação respeita a revogação e limpa o cookie na recusa | **implementado** | `session-routes.ts:112-115` chama `getSessionFromCookie`, que verifica com `checkRevoked: true` (`server.ts:298-301`), e limpa o cookie. `mintFailureResponse` (`:52-60`) limpa e responde `AUTH_SESSION_EXPIRED` quando o teto estoura |
| 5. Renovação em segundo plano, sem bloquear a navegação | **implementado** | `refreshSessionCookie` em `packages/auth/provider.tsx:204-230`, chamada dentro de `applySignedInUser` (`:270`); falha genérica vira `"error"` e não desloga — só `AUTH_SESSION_EXPIRED` aciona `handleSessionExpired` |
| 6. Texto novo nos 3 idiomas | **implementado** | `packages.auth.provider.session.expired` em `translations/packages/auth/index.ts:6,33,61`; `AUTH_SESSION_EXPIRED` e `AUTH_NO_SESSION` em `translations/packages/shared/utils.ts:27-28,111-112,193-194` |

**Duas ressalvas registradas na spec arquivada, nenhuma bloqueando o `done`:** a revogação ponta a ponta
segue **🔒 não verificada** — o emulador aceita o cookie depois de `revokeRefreshTokens`, e a prova exige
projeto Firebase real; e a rota de renovação **nasceu fora de qualquer rate limit**, como a própria spec
antecipou nos riscos.

## Gates — medidos nesta auditoria

Executados agora, com `--force`, neste workspace, com o `HEAD` em `cc93229`. Não copiados do `/test` nem da
rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **607 arquivos · 0 erros** (`No fixes applied`, 235 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 30,6 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-17 (PR #19) |
|-----------|---------:|-------:|---------------------------|
| `api` | 48 | 532 | — |
| `app` | 53 | 380 | **+2 arquivos · +10** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 8 | 101 | **+2 arquivos · +39** |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `web` | 5 | 31 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **134** | **1325** | **+4 arquivos · +49 testes** |

A PR #20 não criou workspace novo, então o número de tasks e o de configs de Vitest ficaram onde estavam. O
`pnpm check` subiu de 601 para **607** arquivos.

> **O crescimento de cobertura se concentrou num pacote só.** `@repo/auth` foi de 62 para **101** testes:
> 39 dos 49 que a entrega somou. E é o pacote cujo caminho crítico — a revogação de sessão — continua sem
> verificação ponta a ponta, por falta de projeto Firebase real. Os 39 testes cobrem o que o emulador
> alcança; o que ele não alcança segue descoberto, e nenhum número de teste de unidade muda isso.

O gate rodou em 30,6 s contra 52,5 s na rodada anterior, com a suíte 49 testes maior — mesma máquina, mesmo
`--force`, então a diferença é contenção do momento, não ganho de suíte.

CI: a execução de merge de **#20** (`cc93229`) está em **`success`**. `git log origin/main -1` devolve
`cc93229`, ou seja, nenhum commit do repositório está fora de `main`.

As **10** configs de Vitest declaram `testTimeout: 20_000`, e as dez âncoras de linha conferem. O
pré-requisito do branch protection continua satisfeito, e o branch protection continua não ligado —
remedido hoje: `gh api repos/:owner/:repo/branches/main/protection` → **404**, `rulesets` → **`[]`**.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Duas specs seguem bloqueadas por dependência** — eram três até o merge da PR #20.

> **Um critério ganhou peso e continua valendo: o que uma rodada autônoma consegue provar.** O `/cycle` não
> provisiona infraestrutura, então uma spec cujos critérios de aceite dependem de conta em provedor volta
> com metade dos critérios "não verificados". Isso não a torna menos valiosa — torna-a má escolha para
> **esta** forma de execução, e a distinção precisa estar escrita para não virar preconceito silencioso.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`user-activity-tracking`](user-activity-tracking.md) | **Destravada pela entrega de ontem, e mais barata hoje do que a própria spec orçava.** Ela exigia no corte uma janela de gravação para não virar uma escrita no Firestore por requisição — e a renovação entregue já traz essa janela pronta: `shouldRefreshSession` (`packages/auth/session.ts:137-140`) só deixa passar uma renovação a cada metade da vida do cookie, e `mintSessionCookie` agora tem dois chamadores (`session-routes.ts:73` e `:117`), sendo o segundo exatamente o batimento periódico que faltava. Carimbar no ramo `{ refreshed: true }` resolve o item mais difícil sem inventar mecanismo. **A outra metade é ainda mais barata:** `UserWithAuthDTO.metadata` já carrega `lastSignInTime` e `lastRefreshTime` até a listagem do admin (`user.mapper.ts:13-17`), que simplesmente não os renderiza — são **6 colunas** em `UsersListClient.tsx:33-106` e nenhuma é de acesso. Verificável inteira sob o emulador, sem conta em provedor. E destrava o #5. ⚠️ **É dado pessoal:** finalidade e retenção estão no corte, e não devem cair fora dele. |
| 2 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze`, e é isso que a segura pela quarta rodada.** Valor alto, esforço M e zero dependência de infra externa — o melhor perfil da fila para rodada autônoma. O item 2 continua oco desde que a PR #12 passou a coletar nome e idioma na área de conta. E o custo que ela não orçava cresceu de novo: a decisão de destino pós-login estava fatiada em quatro caminhos e **agora são cinco** — a PR #20 acrescentou `handleSessionExpired` (`provider.tsx:235`), o primeiro que decide destino **saindo** do produto. O problema é o corte, não as referências. |
| 3 | [`data-rights-lgpd`](data-rights-lgpd.md) | **Maior valor do backlog e a única com prazo imposto de fora.** Segue em 0/5. A armadilha dos objetos órfãos continua dobrada: `deleteObjectQuietly` tem **2** call sites (`entities/[id]/route.ts:90` e `account/route.ts:158`), ambos de troca, nenhum de expurgo; e o `delete()` herdado é **soft delete** (`base.repository.ts:205-207`, reconferido). O que a tira do topo é esforço **G** somado a um problema de verificação: o item 3 do corte exige limpar arquivos **e** cancelar assinatura ativa no mesmo fluxo — o primeiro depende do Cloud Storage não ativado, o segundo de um `billing-subscription` que não existe. Dois dos cinco critérios voltariam "não verificados". |
| 4 | [`account-security-mfa`](account-security-mfa.md) | **Saiu do isolamento nesta rodada** — os três arquivos de `packages/auth` que a prendiam sozinha eram os de `session-refresh`, agora entregue. Mas ela não sobe no ranking por isso: continua `value: médio` por mérito próprio (MFA aparece em **3/10** dos starters pesquisados, sessões gerenciáveis em **1/10**) e esforço provavelmente acima de M, porque o item 4 é mudança de contrato em **10 declarações** de `MIN_PASSWORD_LENGTH`, sendo as 3 que importam em `apps/api`. 🆕 **A entrega de ontem acrescentou trabalho a ela:** `isSameOriginRequest` (`session.ts:78`), que continua devolvendo `true` sem header `Origin`, agora protege **duas** superfícies que gravam cookie em vez de uma. E o custo de MFA no GCIP segue **não confirmado**. |
| 5 | [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | Bloqueada pelo #1, e é a única dependência que resta — `dashboard-home` fechou na rodada passada. É o pedido original do usuário (KPIs de ativos e inativos, mais o gráfico de acesso) sobre peças que já estão em `main`: `MetricCard.tsx:11-17`, `category-bar-chart.tsx:25-72`, `AdminHomeClient.tsx:33-55`, `queryKeys.ts:42` e o molde de rota de agregado em `users/summary/route.ts:6-20`. **O item de visitas à WEB ficou de fora do corte**, como pergunta em aberto com o custo das três saídas (GA Data API × contador próprio × provedor dedicado), porque nenhuma delas foi decidida e nenhuma teve preço levantado. |
| 6 | [`e2e-testing`](e2e-testing.md) | Destravada, e sem o argumento mais forte que tinha — o gate instável foi corrigido pela PR #13 e não voltou. O que resta é sólido e mais lento de cobrar: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, nenhuma das **10** configs medindo cobertura, e **duas rules files sem um único teste de regra** (`firestore.rules` publicado em deny-all, `storage.rules` nem publicado). 🆕 **O argumento ganhou um caso concreto e caro:** a revogação de sessão entregue ontem ficou **🔒 não verificada** porque o emulador de Auth aceita o cookie depois de `revokeRefreshTokens`. Não é lacuna de disciplina — é limite do emulador, e é o tipo de coisa que só um ambiente real ou um teste de regra pega. |
| 7 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto do backlog e ainda em **0/6**: não existe diretório `payments/` entre as 22 rotas, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`) sem dedupe por `event.id` — os quatro reconferidos hoje. **Segue atrás por um motivo de execução, não de mérito:** provar checkout, portal e webhook exige chaves reais da Stripe, e uma rodada autônoma devolveria os critérios como "não verificados". **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 8 | [`admin-billing-insights`](admin-billing-insights.md) | Logo atrás da spec que a destrava, e **é a razão de existir separada**: `billing-subscription` está em 0/6, remedido hoje. Juntá-la ao #5 faria os KPIs de atividade, que são construíveis assim que o #1 entrar, nascerem bloqueados por Stripe. Herda também o motivo de execução do #7. **O risco que a spec carrega é de correção, não de esforço** — agregar receita a partir de webhook sem dedupe por `event.id` infla o número em silêncio, porque a Stripe não garante ordem nem entrega única. |
| 9 | [`observability-logging`](observability-logging.md) | `in-progress`. Entregue em 5 dos 6 itens; o resíduo é adotar um coletor de erro, que depende de decisão de produto e de conta em provedor. **Fora do conjunto elegível** — ver [Precisam de decisão](#precisam-de-decisão). Sexta rodada consecutiva sem resposta. |
| 10 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora pela oitava rodada. São **13 sítios** de posse por usuário, número inalterado nesta rodada porque a PR #20 não tocou em repositório nenhum. Ver [Precisam de decisão](#precisam-de-decisão). |

### O que **não** foi escolhido para #1, e por quê

- **`onboarding-flow` foi a segunda, e perde pelo mesmo motivo mecânico da rodada passada.** Valor alto,
  esforço M, e é a única das três primeiras que não toca em infra externa nenhuma. O corte de MVP está
  desatualizado, e uma rodada autônoma planejaria em cima dele sem perceber. Reescopar primeiro
  (`/spec onboarding-flow`) e ela passa à frente. **Quarta rodada em que essa reescrita é recomendada e não
  acontece** — e o custo de adiar subiu: os caminhos de decisão de destino pós-login que ela teria de
  reconciliar passaram de quatro para cinco em uma única entrega.
- **`data-rights-lgpd` foi a terceira, e perde por verificabilidade somada a esforço.** É a única spec do
  backlog com prazo imposto de fora, e o argumento dela só piora com o tempo. O que a tira do topo **nesta**
  forma de execução não é só o esforço **G**: o item 3 do corte pede que a exclusão cancele assinatura e
  limpe arquivos "no mesmo fluxo", e **nenhuma das duas pontas existe de forma verificável** — o Cloud
  Storage não está ativado e não há fluxo de assinatura. Uma rodada autônoma entregaria o export e o delete
  e deixaria a coordenação, que é a parte difícil, por provar. Se a execução deixar de ser autônoma, ela é a
  candidata natural ao topo.
- **Escolher uma spec `value: médio` para o #1 é uma decisão, não um descuido.** `user-activity-tracking`
  vale menos no papel que `onboarding-flow` e `data-rights-lgpd`, e ganha por três motivos que só valem
  **hoje**: a dependência dela fechou ontem, o mecanismo mais caro do corte dela chegou de graça junto, e
  ela é a única das três que uma rodada autônoma consegue provar inteira. É exatamente a reavaliação que a
  [decisão nº 8](#precisam-de-decisão) mandava fazer depois que `session-refresh` entrasse — e ela continua
  precisando de um humano, porque empurrar uma spec com prazo legal por inércia do pedido é o tipo de coisa
  que se decide de propósito ou não se decide.

### O que o merge da PR #20 mudou no ranking

`session-refresh` era o único nó de que outra spec dependia e era, ao mesmo tempo, o dono de três arquivos
disputados. Ao sair, ela **destravou uma spec** (`user-activity-tracking`, que subiu de #2 para #1) e
**liberou três arquivos** do `contends_on` coletivo, o que tirou `account-security-mfa` do isolamento nos
lotes.

A PR #19 já tinha feito as duas coisas — fechou a dependência das specs de painel e baixou a disputa por
`firestore.indexes.json` de 4 para 3. A diferença aqui é de grau: lá a dependência liberada não bastava
(cada spec de painel tinha uma segunda em aberto), e aqui ela era a única. Uma entrega **destrava de fato**
quando fecha a última dependência de alguém, não quando fecha uma qualquer.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-17** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis agora: 6 de 10.** Fora ficam `teams-organizations` (`deferred`), `observability-logging`
(`in-progress`) e duas barradas por dependência não satisfeita: `admin-analytics-dashboard` (espera
`user-activity-tracking`) e `admin-billing-insights` (espera `billing-subscription`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `user-activity-tracking` · `data-rights-lgpd` · `e2e-testing` | `UserDTO` + `user.repository.ts` + `UsersListClient.tsx` · `base.repository.ts` + `packages/auth/server.ts` + `firestore.indexes.json` · `package.json` da raiz + `turbo.json` + `ci.yml` | **slice `user` do admin**, **expurgo do titular** e **ferramental da raiz**. A primeira vive no perfil e na listagem, a segunda na base dos repositórios e na camada de auth, e a terceira não toca em `apps/` nem em `packages/` |
| **2** | `onboarding-flow` · `account-security-mfa` | `apps/app/proxy.ts` + `postLoginNavigation.ts` + `user-merge.ts` + `UserDTO` · `packages/auth/*` + `resolve-api-actor.ts` | **desvio de navegação no app** e **camada de credencial**. Par novo: era impossível enquanto `account-security-mfa` colidia com `session-refresh` |
| **3** | `billing-subscription` | webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` | sozinha por colisão de dado: disputa o `UserDTO` com as duas do lote 2 e o `user.repository.ts` com o lote 1 |

### O que mudou no cálculo, e por quê

- **`account-security-mfa` deixou de ser a spec isolada, depois de três rodadas.** Ela declarava
  `packages/auth/server.ts`, `session.ts` e `session-routes.ts` — os três arquivos de `session-refresh`. Com
  a spec entregue, sobra a colisão com `data-rights-lgpd` em `packages/auth/server.ts` apenas, o que a
  mantém fora do lote 1 mas a deixa emparelhar com `onboarding-flow` no lote 2.
- **`billing-subscription` herdou o posto de spec isolada, e por um arquivo de tipo.** Ela declara
  `packages/sdk/src/types/user/user.ts`, que `onboarding-flow` e `user-activity-tracking` também declaram, e
  `apps/api/(shared)/repositories/user.repository.ts`, que `user-activity-tracking` declara. Colisão de
  dado, não teto.
- **`e2e-testing` continua no lote 1** e continua disjunta de tudo — quarta rodada seguida. É a única spec
  do backlog que não toca em `apps/` nem em `packages/`.
- **`data-rights-lgpd` entrou no lote 1 pela primeira vez.** A vaga abriu porque `session-refresh`, que lhe
  disputava `packages/auth/server.ts`, saiu da fila.

**Os arquivos mais disputados entre as 10 specs, recontados:** empatados com **3** citações,
`packages/sdk/src/types/user/user.ts` (`billing-subscription`, `onboarding-flow`, `user-activity-tracking`)
e `firestore.indexes.json` (`data-rights-lgpd`, `teams-organizations`, `admin-analytics-dashboard`).
`packages/auth/server.ts` **caiu de 3 para 2** (`data-rights-lgpd`, `account-security-mfa`) — é a segunda
rodada seguida em que a contenção diminui, e nas duas por entrega.

> **O aviso da rodada passada continua de pé:** as duas specs de painel bloqueadas disputam entre si o
> `AdminHomeClient.tsx` e o `queryKeys.ts`. Quando forem destravadas, elas **não** poderão rodar no mesmo
> lote.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou.

A régua desta rodada, com `session-refresh` como amostra: ela declarava **3** arquivos em `contends_on` —
`session.ts`, `session-routes.ts` e `server.ts` — e **acertou os três**. Segunda previsão cheia seguida.

Mas a PR tocou 26 arquivos, e o raio extra inclui um caso que importa: **`packages/auth/provider.tsx`**, que
ganhou 142 linhas e não estava declarado por spec nenhuma. Ele é âncora de `onboarding-flow`, que o cita
como um dos caminhos de decisão de destino pós-login — e a entrega acrescentou ali um quinto caminho.

**O erro por falta se repetiu, e agora tem padrão.** Na rodada passada o `contends_on` errou por falta em
dois repositórios; nesta, num provider. Nos dois casos o arquivo esquecido é **vizinho** dos declarados,
dentro do mesmo pacote ou da mesma camada. A regra prática que sai daqui: ao declarar `contends_on`,
declare a camada, não os arquivos que você lembra dela.

## Precisam de decisão

Nenhuma delas é da auditoria. Todas têm recomendação, e nenhuma foi aplicada.

| # | questão | recomendação |
|---|---------|--------------|
| 1 | **A cadeia pedida continua à frente de `data-rights-lgpd`?** ⚠️ **Esta é a decisão da rodada, e ela venceu.** A nº 8 da auditoria anterior dizia: "depois de `session-refresh` mergeada, reavaliar se `user-activity-tracking` vem antes ou depois de `data-rights-lgpd`". Mergeou. A auditoria recomenda `user-activity-tracking` como #1 e `data-rights-lgpd` como #3 — mas a primeira é `value: médio` e a segunda é `alto` com prazo legal | **Manter a ordem recomendada, com data.** `user-activity-tracking` ganha por ser executável inteira numa rodada autônoma e por ter ficado barata de repente; `data-rights-lgpd` perde metade dos critérios para infra que não existe. Se a próxima execução **não** for autônoma, inverta as duas. E marque um prazo para a inversão acontecer de qualquer jeito — empurrar spec com prazo legal por inércia do pedido é decisão por omissão, agora pela segunda rodada |
| 2 | **`observability-logging` fecha como entregue?** 5 dos 6 itens estão no código; o que falta é adotar um coletor de erro, que exige conta em provedor e é a pergunta em aberto nº 1 da própria spec. **Sexta rodada consecutiva sem resposta.** | **Fechar como `done`** e abrir uma spec nova de esforço P só para o coletor. Manter uma spec quase inteira aberta por um item que ninguém pode executar sem decisão de produto trava a spec e polui a fila. Enquanto não há resposta, ela fica fora dos lotes paralelos — o custo da indecisão é um workspace a menos por noite |
| 3 | **`teams-organizations` continua `deferred`?** Trinta dias e oito PRs sem nenhuma das duas contrapartidas de esforço P que tornavam o adiamento honesto. **O gatilho escrito na própria spec disparou e já se repetiu quatro vezes** | Ou as contrapartidas viram tarefa com dono, ou o status vira `rejected` até aparecer o primeiro fork B2B. Manter `deferred` sem elas é tomar a decisão por omissão, agora pela oitava vez |
| 4 | **Ligar o branch protection na `main`?** O único pré-requisito técnico caiu na PR #13 e continua satisfeito. Remedido hoje: `protection` → 404, `rulesets` → `[]`. Uma PR vermelha pode ser mergeada | Ligar, exigindo o check do CI. Custo de minutos, e o risco de adiar cresce com o número de PRs — já são 20 |
| 5 | **`onboarding-flow` e `account-security-mfa` precisam de reescopo antes do `/analyze`.** As duas têm o corte de MVP desatualizado em relação ao código, cada uma por um motivo diferente. **Quarta rodada em que isso custa posição no ranking** | Rodar `/spec <id>` nas duas antes de planejar. Planejar sobre um corte errado custa mais caro que reescrever a spec |
| 6 | **Aprovar ou rejeitar as specs da cadeia.** Todas nasceram `proposed` e continuam, porque o `/spec` não aprova spec. **`user-activity-tracking` é o #1 da ordem e ainda não foi aprovada** — o `/cycle` planejaria sobre uma spec não aprovada, exatamente como fez com `session-refresh` | Aprovar [`user-activity-tracking`](user-activity-tracking.md), que agora está destravada e é a base do painel de métricas. [`admin-analytics-dashboard`](admin-analytics-dashboard.md) pode ser aprovada junto: a única dependência que resta é a anterior. Deixar [`admin-billing-insights`](admin-billing-insights.md) em `proposed` enquanto `billing-subscription` estiver em 0/6 |
| 7 | **O teto absoluto da sessão pode ser ultrapassado por até meia vida de cookie.** A entrega de ontem verifica o teto **depois** do limiar de renovação, então uma sessão sobrevive ao teto por até 32,5 dias com os padrões de 5 e 30. Medido e registrado na spec arquivada; a revisão marcou como 🟡 e a decisão foi de produto | **Manter como está, e escrever o número onde um fork o leia.** Inverter a ordem custaria uma chamada ao provedor em toda navegação — o preço da precisão é alto e o desvio é conhecido. O que falta é a documentação: hoje o comportamento só existe na spec arquivada |
| 8 | **Por quanto tempo reter os eventos da trilha de auditoria?** A coleção `auditEvent` nasceu sem expurgo e sem `expiresAt`, e cresce a cada ação sensível de todo fork. **Terceira rodada sem resposta** | Decidir um prazo padrão e escrevê-lo em `docs/PRE-PRODUCTION.md` §1.3, **sem** invocar o art. 15 do Marco Civil (que é do log de acesso, não da trilha de negócio). Guardar além do necessário é o risco que o Decreto 8.771/2016, art. 13, § 2º manda evitar |
| 9 | **Quem escreve a política de privacidade que o banner linka?** O consentimento de cookies aponta para `/legal/privacy`, que é modelo e **não menciona cookies** em nenhum dos 3 idiomas. Um fork que suba assim fica em posição pior do que sem banner | Texto legal é responsabilidade de cada fork, não do core — mas o **core deve entregar um modelo que ao menos declare os cookies que ele próprio grava**. A tabela está em `docs/PRE-PRODUCTION.md` §7. Cabe no corte de `data-rights-lgpd` (#3) ou vira tarefa direta de esforço P |
| 10 | **A busca da tabela enxerga só as páginas carregadas.** A PR #17 tratou o sintoma — o texto de lista vazia avisa que a busca não alcançou o resto (`table.tsx:112-118`) —, mas o comportamento continua sendo "procurar no que já baixou" | Abrir spec própria quando alguém sentir a dor, não antes. A decisão de fundo (prefixo no Firestore × serviço de busca) é cara e não tem caso de uso concreto no core hoje. Enquanto isso, o aviso na tela é o contrato honesto |
| 11 | **Como medir visitas à `apps/web`?** Foi deixado **fora** do corte de [`admin-analytics-dashboard`](admin-analytics-dashboard.md), como pergunta em aberto com o custo das três saídas: GA Data API, contador próprio no Firestore ou provedor dedicado. ⚠️ **Nenhuma das três teve preço ou prevalência levantados** | Decidir à parte, depois que os KPIs de atividade estiverem de pé. Das três, o contador próprio é a única que não arrasta conta nem variável obrigatória para quem não usa — que é o critério do core. Enquanto não houver decisão, a tela deve dizer que as métricas cobrem o painel, não a landing |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-17 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |
| [`user-activity-tracking`](user-activity-tracking.md) | `session-refresh` | ✅ **satisfeita nesta rodada** (PR #20, `cc93229`) |
| [`admin-analytics-dashboard`](admin-analytics-dashboard.md) | `user-activity-tracking`, `dashboard-home` | ⛔ **bloqueada** pela primeira; ✅ a segunda fechou (PR #19) |
| [`admin-billing-insights`](admin-billing-insights.md) | `billing-subscription`, `dashboard-home` | ⛔ **bloqueada** — `billing-subscription` está em 0/6; ✅ `dashboard-home` fechou |

> **O método de marcar dependência com `◐` provou-se de novo.** Na rodada passada, `dashboard-home` estava
> entregue mas fora de `main`, e foi marcada `◐` em vez de `✅`. Desta vez `session-refresh` mergeou antes da
> auditoria, então a transição foi direta. A distinção continua valendo: uma dependência cujo código está no
> disco mas não em `main` deixa quem depender dela ramificando de uma base que não a contém.

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
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | ✅ `transactional-emails` |
| [`user-activity-tracking`](user-activity-tracking.md) | Último acesso do usuário | produto | médio | M | `proposed` | ✅ `session-refresh` |

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
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`). ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`). ⚠️ O índice composto novo **precisa ser publicado** |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`). ⚠️ **Três desvios registrados**; o índice composto de `auditEvent` **precisa ser publicado** |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`). ⚠️ **Três desvios registrados**; **três índices compostos** precisam ser publicados |
| `session-refresh` | 2026-09-17 | [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md) — 6/6 do corte (PR #20, `cc93229`), conferidos um a um. ⚠️ **Três derivas registradas**, a principal sendo que a spec afirmava que "nada renova" e o repo já renovava sem teto. A **revogação ponta a ponta segue 🔒 não verificada** |

**Verificado nesta rodada:** `docs/features/` tem **16** pastas e **13** `spec.md` arquivados. As três pastas
sem `spec.md` são `observability-logging` (spec continua em `specs/`, por decisão desta auditoria — não
houve `git mv` e não há duplicata), `auth-panel-context` e `impersonation-read-only`. Os frontmatters das 13
arquivadas seguem coerentes (`status: done`, `feature: <slug>`). `docs/features/session-refresh/STATE.md` já
trazia `spec: session-refresh`, então o arquivamento não precisou tocá-lo.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
na tabela, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #20 entregou **além** do corte

1. **A claim `sessionAuthTime` atravessa o bootstrap de SSO** (`session.ts:38`, `session-routes.ts:157-162`).
   Sem ela, abrir o segundo front-end reiniciaria a vida absoluta da sessão, porque
   `signInWithCustomToken` é uma autenticação nova e reescreve o `auth_time`. O pressuposto foi medido
   contra o emulador antes de construir em cima, e o recuo previsto não foi necessário.
2. **`decodeSessionCookie`** (`server.ts:262`), que verifica o cookie **sem** consultar o provedor sobre
   revogação. Existe para baratear o throttle: o caminho quente custa criptografia local e nada mais.
3. **Um laço de redirecionamento corrigido durante a revisão** (`provider.tsx`, `SignInForm.tsx`). Com o
   teto estourado e o cookie já ausente, os dois chamadores ignoravam a recusa e a tela ficava presa entre
   `/pt-br` e `/pt-br/sign-in` com spinner permanente. Oito casos novos em `apps/app/__tests__` fixam o
   contrato, e falham contra o código anterior à correção.
4. **`?redirect=` preservado quando a expiração aparece já na tela de login** (`expiredSessionOrigin`,
   `provider.tsx:72`). Corrigido numa segunda rodada de revisão, a pedido do `/test`, e medido no browser.

**Nada disso é deriva de implementação** — os desvios do corte estão registrados à parte, na spec arquivada.
É escopo adicional. E a observação vale de novo, como valia para a #19: a PR #20 **não** consertou nenhum
achado catalogado neste backlog de passagem, apesar de ter tocado `packages/auth/session.ts`, onde o achado
do `SameSite` sem `Secure` mora há cinco rodadas.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 1325 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-17 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md` (gate) | `pnpm check` em **601 arquivos**, suíte de **1276 testes em 130 arquivos**, gate em **1 min 30 s** | **607 arquivos**, **1325 testes em 134 arquivos**, **30,6 s**. A distribuição por workspace também envelheceu: `apps/app` 370→380 em 51→53, `@repo/auth` 62→101 em 6→8 | 🟢 **corrigido hoje.** É o quinto ciclo com estes números defasados, e o mecanismo é sempre o mesmo: medidos corretamente, invalidados pela entrega seguinte. A PR #19 os atualizou dentro dela; a #20 não |
| `docs/SECURITY.md` | descreve a superfície de autenticação do repositório, incluindo a tabela de rotas sem guard e o rate limit sobre 8 caminhos | **a superfície mudou e o documento não.** A PR #20 criou `POST /api/auth/session/refresh` nos **dois** front-ends — um segundo endpoint que grava cookie de sessão, protegido apenas por `isSameOriginRequest`, que devolve `true` quando não há header `Origin`. O documento não o menciona em lugar nenhum | 🟡 **achado novo, não corrigido aqui** — ver [Achados](#-achados-novos). Corrigir exige decidir o que dizer sobre o rate limit da rota, e isso é escolha de produto |
| `docs/PRE-PRODUCTION.md` (env) | lista as variáveis que um fork precisa definir | **`SESSION_ABSOLUTE_MAX_AGE_DAYS` não aparece.** Ela está nos dois `.env.example` e governa por quanto tempo uma sessão pode ser renovada; sem ela, o fork herda 30 dias sem saber | 🟡 **achado novo** — ver [Pendências vivas sem dono](#pendências-vivas-sem-dono) #10 |
| `docs/SECURITY.md:13-16` (guards) | **22** arquivos de rota, **11** com guard e **11** com handler nu, em três famílias | **confere**, recontado hoje: `find … -name route.ts` devolve 22 e o grep pelos dois guards devolve 11 | ✅ **honesto** — e a correção da rodada passada pegou, depois de duas tentativas erradas |
| `docs/PRE-PRODUCTION.md` §1.6 (índice de perfil) | índice `user` por `reference_id` + `deletedAt` pendente de publicação | **confere.** A seção nasceu na auditoria anterior e entrou na PR #20 | ✅ **honesto na estreia** |
| `docs/PRE-PRODUCTION.md` §1.5 (índices da home) | três entradas novas, com a tabela de coleção/campos e o 503 `SUMMARY_INDEX_MISSING` | **confere campo a campo** contra `firestore.indexes.json` | ✅ **honesto** |
| `docs/SECURITY.md:138-140` (rate limit) | roda sobre lista fechada de **8 caminhos**, casados por igualdade exata, e as **3** rotas de `/account` estão fora | **confere.** `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:42-51`) tem exatamente os 8 listados | ✅ **honesto** pela sexta rodada |
| `docs/SECURITY.md:155` (higiene do `.env.example`) | sem Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks nem BaseHub | **confere.** `grep` pelas sete devolve zero | ✅ **honesto** |
| `docs/PAYMENTS.md` (estado geral) | não há fluxo de assinatura; os stubs estão com `TODO` em `route.ts:13,23`; não existem `UserDTO.subscription`, `stripeCustomerId` nem rotas de `payments/` | **confere nas âncoras e nos `grep`** | ✅ **honesto** pela oitava rodada — o único documento com esse histórico |
| `docs/PRE-PRODUCTION.md` (branch protection) | `protection` → 404, `rulesets` → `[]` | **confere, remedido hoje** via `gh api` | ✅ **honesto** |

> **Nota de método, décima primeira rodada consecutiva.** A regra que saiu da rodada passada — "correção de
> afirmação de inventário exige recontar o inventário inteiro" — foi aplicada aqui e o número de guards
> passou intacto. O que apareceu de novo é outro tipo de falha: não uma afirmação errada, mas uma
> **omissão** criada pela entrega. `docs/SECURITY.md` não ficou falso; ficou incompleto, porque a superfície
> cresceu embaixo dele. Omissão é mais difícil de pegar que erro, porque não há frase para conferir.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **4 das 10** specs que seguem em `specs/`, e **três derivas de
implementação** na spec entregue. As intactas são [`billing-subscription`](billing-subscription.md),
[`data-rights-lgpd`](data-rights-lgpd.md), [`teams-organizations`](teams-organizations.md),
[`admin-analytics-dashboard`](admin-analytics-dashboard.md), [`admin-billing-insights`](admin-billing-insights.md)
e [`observability-logging`](observability-logging.md) — seis specs com âncoras e contagens exatas, contra
quatro na rodada passada.

**A deriva desta rodada tem uma causa só, e é mais concentrada que a anterior**: a PR #20 acrescentou ~90
linhas a `packages/auth/server.ts`, ~130 a `session-routes.ts`, 90 a `session.ts` e 142 a `provider.tsx`.
Quem citava esses quatro arquivos errou; quem não citava, não errou.

### Deriva de implementação — `session-refresh`

Três, registradas na spec arquivada. A primeira é a que mais importa, porque não é erro de execução — é erro
de diagnóstico da própria spec.

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "**Lacuna:** nada renova. O cookie é gravado no login e nunca mais tocado" | Já renovava: `onIdTokenChanged` → `applySignedInUser` → `POST /api/auth/session` regravava o cookie de hora em hora, sem teto e sem ninguém ter decidido isso | **A spec estava errada, e o erro mudou o desenho.** O problema real não era ausência de renovação, era renovação silenciosa e ilimitada. O item de maior valor do corte virou o teto absoluto. ⚠️ **A spec afirmava isso com `grep` como prova** — "as três ocorrências do símbolo são a definição, o import e a chamada" — e o `grep` estava certo sobre `mintSessionCookie`. Errado era concluir dali que nada renovava: quem renovava chamava a rota, não a função |
| O teto vive no caminho de renovação | O teto é imposto em `mintSessionCookie` (`session.ts:154-156`) | **A implementação desviou, e o desvio é mais forte que a spec.** Só na rota o teto seria decorativo: o `provider.tsx` chama `sessionPOST` direto e passaria por cima |
| "A renovação nunca estende a sessão além de um prazo contado a partir da autenticação original" | A checagem do teto roda **depois** do limiar de renovação, então a sessão sobrevive ao teto por até metade da vida do cookie — 32,5 dias com os padrões | **A implementação desviou, medido.** A sessão não é *estendida* além do teto, mas persiste além dele. Inverter a ordem custaria uma chamada ao provedor em toda navegação. É a [decisão nº 7](#precisam-de-decisão) |

### Âncoras deslocadas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`account-security-mfa`](account-security-mfa.md) | `server.ts:272` (`revokeUserSessions`) | **`:323`** | ~90 linhas novas em `server.ts` |
| [`account-security-mfa`](account-security-mfa.md) | `server.ts:241` (comentário com `checkRevoked`), citado **duas vezes** | **`:286`** | idem |
| [`account-security-mfa`](account-security-mfa.md) | `server.ts:253-256` (`verifySessionCookie(cookie, true)`), citado **duas vezes** | **`:298-301`** | idem |
| [`account-security-mfa`](account-security-mfa.md) | `session-routes.ts:79` (`sessionDELETE` chama a revogação), citado **duas vezes** | **`:132`**, dentro de `sessionDELETE:126` | ~130 linhas novas em `session-routes.ts` |
| [`account-security-mfa`](account-security-mfa.md) | `session-routes.ts:34` (guarda de CSRF do `sessionPOST`) | **`:64`** | idem |
| [`account-security-mfa`](account-security-mfa.md) | `session.ts:66` (`isSameOriginRequest`) | **`:78`** | 90 linhas novas em `session.ts` |
| [`account-security-mfa`](account-security-mfa.md) | `session.ts:39`/`:41` (tipo) e `:51-53`/`:52` (valores do cookie) | **`:51`/`:53`** e **`:62-70`/`:64`** | idem |
| [`account-security-mfa`](account-security-mfa.md) | `provider.tsx:238-239` (`signOutMutation`) | **`:372-373`** | 142 linhas novas em `provider.tsx` |
| [`onboarding-flow`](onboarding-flow.md) | `provider.tsx:80-94` (`redirectPath` + `resolvePostLoginPath`) | **`:128-144`** | idem |
| [`user-activity-tracking`](user-activity-tracking.md) | `session.ts:80-89` (`mintSessionCookie`, "um chamador") | **`:147`, dois chamadores** | a entrega criou o segundo |

Corrigidas as quatro specs no disco (**dezoito âncoras** ao todo, contando as repetidas), mais três
afirmações de estado e uma contagem de suíte. **Nenhuma das dezoito é erro de método** — todas foram
causadas pela PR #20. É a primeira rodada em que isso acontece: nas anteriores, metade das âncoras erradas
já nascia fechada uma linha antes ou depois do fim real.

### Contagens e afirmações de estado erradas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`e2e-testing`](e2e-testing.md) | 1276 testes em 130 arquivos · `apps/app` 370 em 51 · `@repo/auth` 62 em 6 | **1325 em 134** · **380 em 53** · **101 em 8** | Sexta rodada seguida com estes números defasados — mas a primeira em que a defasagem é *só* de idade: foram medidos corretamente depois do merge da #19 e invalidados pela #20. O parágrafo ao lado deles foi reescrito para dizer isso |
| [`account-security-mfa`](account-security-mfa.md) | suíte de `packages/auth` com **6 arquivos / 62 testes** | **8 / 101** | O maior salto de cobertura já registrado num pacote só. A nota foi reescrita e passou a nomear os dois arquivos novos |
| [`user-activity-tracking`](user-activity-tracking.md) | "Sem `session-refresh` não existe batimento periódico onde carimbar: o único caminho que grava o cookie hoje é o login" | **Existe**, e a spec que faltava foi entregue. `mintSessionCookie` tem dois chamadores | **O mundo mudou embaixo da spec, e a favor dela.** O risco reescrito: o candidato natural para a janela de gravação é o limiar da renovação, e o ramo `{ refreshed: false }` é o caminho quente que **não** deve carimbar |
| [`onboarding-flow`](onboarding-flow.md) | a decisão de destino pós-login está fatiada em **quatro** caminhos | **cinco** | `handleSessionExpired` (`provider.tsx:235`) é o primeiro que decide destino **saindo** do produto. Custo novo para a reescrita que a spec já precisava |
| 3 specs | link `[dashboard-home](dashboard-home.md)` | arquivo não existe em `specs/` desde 2026-09-17 | **Achado sobre o procedimento de arquivamento**, não sobre as specs. Ver abaixo |

### O que a auditoria **não** encontrou

Nenhuma spec `done` regrediu, nenhuma entrega parcial ficou órfã, e nenhuma feature em
`docs/features/*/STATE.md` está sem `spec:` correspondente quando deveria ter.

## Achados — correções pontuais, não specs

Coisas que não merecem spec própria (não são funcionalidade, não têm corte de MVP), mas que são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-17 (pós-PR #20).** Os achados da rodada anterior foram reconferidos contra o
> código, um a um. **Placar: 0 fechados · 3 novos · o resto intacto e confirmado no disco.**

### 🆕 Achados novos

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Nasceu um segundo endpoint que grava cookie de sessão, e nenhum documento o registra** | `packages/auth/session-routes.ts:87` · `apps/app/app/api/auth/session/refresh/route.ts` · `apps/web/app/api/auth/session/refresh/route.ts` | `POST /api/auth/session/refresh` é protegido só por `isSameOriginRequest` (`session.ts:78`), que devolve `true` quando não há header `Origin` — o mesmo desenho do `sessionPOST`. O rate limit do repo roda no proxy da `apps/api` sobre lista fechada (`proxy.ts:42-51`), e estas rotas vivem nos front-ends: estão fora dele, e não há outro limitador. `docs/SECURITY.md` não menciona a rota. **O custo de não ter csrfToken dobrou sem que ninguém decidisse isso** |
| 🟡 **Arquivar uma spec quebra os links de quem apontava para ela** | `specs/admin-analytics-dashboard.md:29` · `specs/onboarding-flow.md:106` · `specs/user-activity-tracking.md:128` | As três apontavam para `dashboard-home.md`, arquivada na rodada passada. O procedimento de `/spec-audit` §4.1 move o arquivo e atualiza o `BACKLOG.md`, e **não** manda varrer as specs restantes. Corrigido hoje nas três; o passo faltante é do procedimento, não das specs. ⚠️ Vale para `session-refresh` também — as referências foram reapontadas nesta rodada |
| 🟡 **`SESSION_ABSOLUTE_MAX_AGE_DAYS` não está no checklist de pré-produção** | `apps/app/.env.example:40` · `apps/web/.env.example:36` · `docs/PRE-PRODUCTION.md` | A variável governa por quanto tempo uma sessão pode ser renovada. Tem padrão (30 dias) e grampo (90), então nada quebra sem ela — mas um fork herda uma política de sessão que nunca leu. É o inverso do modo de falha habitual deste repo: aqui o código está certo e o documento está mudo |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Reconferido hoje, literal. Não explode **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#7) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` **não tem `exports`** (reconferido) |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o primeiro import do `apps/api/proxy.ts:1` — o middleware, que roda em toda requisição | `packages/security/index.ts:11` | `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot — e `instrumentation.ts:26-30`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:20-24`) e **não há `process.exit` em nenhum lugar do arquivo** | `apps/api/instrumentation.ts:20-24` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. ✅ Mitigação parcial: `/health/ready` consulta o Firestore, então um health check apontado para ele detecta parte dessas falhas. Não detecta esta em específico |
| ⚠️ **As 3 rotas de `/account` não estão no rate limit** — incluindo troca de senha, alvo clássico de força bruta | `apps/api/proxy.ts:42-51` | Casamento exato (`includes`), decisão consciente para não limitar `/auth/sign-in/google` duas vezes. Mas rota nova nasce sem limite. 🆕 **A PR #20 não acrescentou rota à `apps/api`**, então a contagem de rotas fora da lista não mudou — mas ela criou duas rotas fora dela *em outro app*, onde o mecanismo nem alcança |
| ⚠️ **A superfície não-guardada da API: 11 de 22** arquivos de rota exportam handler nu, sendo 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado hoje: 22 arquivos, 11 com guard. As 8 de `/auth/*` são legítimas (superfície anterior à sessão), mas duas delas não seguem o contrato de erro do repo — ver o achado de `/auth/sign-in` abaixo. `docs/SECURITY.md` foi corrigido na rodada passada e **passou intacto** nesta |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| ◐ **Dependência importada sem ser declarada — uma metade fechada, duas abertas.** ✅ `apps/app/package.json` passou a declarar `@repo/analytics` (PR #16). 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` e `apps/app/package.json` **não declara** `@repo/email`. 🟡 `apps/web` importa `@repo/auth/provider` em **5 arquivos** de produção e `apps/web/package.json` **não declara `@repo/auth`** | `apps/app/package.json` · `apps/web/package.json` | Funciona por hoisting do pnpm. Além do risco de resolução, **o turbo não invalida `web#*` quando `@repo/auth` muda** — cache mentindo num gate que roda em toda PR. 🆕 **E a PR #20 alterou `@repo/auth` inteiro**, incluindo o `provider.tsx` que a `apps/web` importa sem declarar. É a primeira entrega em que esse cache silencioso teve chance real de mentir |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` **não existe**. Zero importadores, falha em silêncio. **Décima sexta auditoria consecutiva**, e a PR #20 editou quatro arquivos deste pacote sem tocá-lo |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` de todo o resto | `packages/auth/package.json:25` | Reconferido, inalterado. É o único workspace fora da major. ✅ **O risco foi avaliado e sobreviveu à entrega:** `session-refresh` mexeu fundo neste pacote e a única API do Next tocada foi `cookies()`, igual nas duas majors. O item deixa de ser urgente e volta a ser dívida — mas continua sendo um pacote de autenticação resolvendo uma major diferente do runtime |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 **`input-otp.tsx` é código morto**, com 3 referências e nenhuma de produto (barril, catálogo do `playground` e ele mesmo) | `packages/design-system/components/ui/input-otp.tsx` | Reconferido. `account-security-mfa` (#4) é a spec que o usaria. **É o último componente morto do design-system.** ⚠️ Cuidado ao medir: `InpuTOTP` casa com um `grep -i TOTP` e produz falsos positivos |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` seguem instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: **0** arquivos os importam. As PRs #15 a #20 passaram sem tocá-las, o que confirma que são peso morto e não semente de nada |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-11` | Falta o subpath `"./utils/*"` (consumidor externo não alcança `utils/cookies.ts`), e o `"."` (`:6`) aponta para `index.ts`, **que não existe** — reconferido no disco |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Reconferido: 1 ocorrência em todo o repo. Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | O campo vizinho `requestId`, nascido na mesma entrega, **foi ligado até a tela**. ⚠️ Há um `retryAfterSeconds` **homônimo de outro tipo** em `apps/api/proxy.ts:102` |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — décimo ciclo | `packages/auth/client.ts:224` | A única cobertura é `apps/app/__tests__/useEmailVerification.test.tsx`, que a **mocka**. 🆕 A PR #20 somou 39 testes a `packages/auth` e passou ao lado deste |
| 🟡 **`packages/shared` é o único pacote com `test` e sem `typecheck`** | `packages/shared/package.json` | Reconferido: `grep typecheck` devolve vazio. O pacote hospeda o helper de log e o `requestErrorReporter`, e a imunidade a `Error` do `logEvent` é garantida pelo **tipo**, que nenhum gate deste workspace verifica |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `delete()` herdado por todo repositório é **soft delete** — chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:205-207` | Reconferido, âncora exata pela primeira vez em três rodadas. O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` (#3). **`AuditEventRepository` é o único repositório a recusar o herdado**, lançando `AuditEventImmutableError` (`audit-event.repository.ts:100-106`) — precedente útil |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32-43` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth, e descarta linhas em silêncio (`:42`). O N+1 do Admin SDK está em `:38-40`. ⚠️ **`user-activity-tracking` é o #1 da ordem e declara este arquivo em `contends_on`** — quem for carimbar o último acesso vai encostar neste método |
| 🟡 **`userRepository.summary()` e `userRepository.list()` contam populações diferentes, de propósito** | `apps/api/(shared)/repositories/user.repository.ts:46-51` · `:32-43` | A escolha está documentada e é defensável. O efeito visível é que **o cartão de total pode mostrar mais do que a tabela lista**, e nada na tela explica isso. Não é bug; é um número que vai gerar pergunta |
| 🟡 **O predicado de posse foi copiado, não reusado, na agregação de entidades** | `apps/api/(shared)/repositories/entity.repository.ts:33` · `apps/api/app/(routes)/entities/summary/route.ts:9` | `summaryByUserId` repete o `where("userId", "==", userId)` que `listByUserId` já fazia. Levou os sítios de escopo por usuário a **13**, e é a evidência mais limpa do argumento de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. Seguem órfãs — o SDK chama `/auth/me`, `/auth/sign-in/google` e as rotas de senha, nunca estas. A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:67` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | Reconferido: os dois `TODO` seguem em `:13` e `:23`. A assinatura **é** validada (`:45`); nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#7) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:46` | Reconferido. `pnpm --filter api dev:with-stripe` **não pode funcionar**. Duas das três chaves afetadas já foram resgatadas por redeclaração (`:22`, `:29`), **com comentário nomeando esta armadilha** — esta ficou de fora |
| ◐ **`skipValidation` na `apps/web` é incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` | `apps/web/env.ts:27,13-19` | Reconferido. O CTA "Ir para o painel" da landing cai no fallback em `hero.tsx:44`, `cta.tsx:35`, `header/index.tsx:35-36` e `pricing/page.tsx:77,120`. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189-202` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada**. 🆕 **A PR #20 esbarrou nisto e desviou**: o `?redirect=` da sessão expirada precisou de tratamento próprio (`expiredSessionOrigin`, `provider.tsx:72`) em vez de confiar no proxy. Segunda feature a contornar o mesmo defeito em vez de corrigi-lo |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | Reconferido nas quatro âncoras. O idioma escolhido **não sobrevive ao fechamento do navegador** |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** por padrão; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts` · `packages/auth/session.ts:78-89` | ASVS 5.0 L1 (3.3.1) exige `Secure`. ◐ **Meio fechado pela PR #16.** ⚠️ **A chance barata passou:** este backlog registrou na rodada anterior que `session-refresh` tocaria `session.ts` e seria a ocasião de fechar isto de passagem. A PR #20 reescreveu 90 linhas do arquivo e não fechou. O cookie de sessão em si segue `secure` só em produção (`:64`) |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru | `packages/sdk/src/client/base.ts:53,61,95` | Reconferido nas três âncoras. Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu às PRs #11 a #20.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` |
| 🟡 **O `DateInput` compartilhado formata data e calendário sempre em inglês** | `packages/design-system/components/ui/date-input.tsx:83` | `format(selected, "PPP")` do `date-fns` sem a opção `locale`. Reconferido. Mesma família do `"Pick a date"` |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`, nos **dois** apps) e `"Início"` no breadcrumb | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` | Reconferido: `"Switch language"` em **2** arquivos, `Início` em `PageBreadcrumb.tsx:30`. Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe. O `PageBreadcrumb` ainda crava `href="/painel"` em **`:28`** *(a âncora era `:29`; corrigida hoje)* |
| 🟡 **A mensagem de erro padrão do repo inteiro está cravada em pt-br dentro de um pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido. `"Um erro inesperado aconteceu"` é o retorno de **todo** erro que não é `FormattedError` — em espanhol e em inglês também |
| 🟡 **`apps/web/…/sign-in/validations/signInSchema.ts:9` crava a mensagem de validação em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | Reconferido, literal. Os outros nove sítios de `MIN_PASSWORD_LENGTH` passam por `validation.passwordMin` |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | O `select` é alimentado por `useListUsers()`, que só lista quem existe. O evento de exclusão **foi projetado para sobreviver ao usuário**, e é justamente ele que o filtro não consegue selecionar |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | `catch { return null; }` sem `logEvent`. Numa investigação, "evento sem rótulo" e "Firebase Auth fora do ar" ficam indistinguíveis |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Reconferido. Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:29-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem. É a home da landing |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: o arquivo exporta só o hook. O `apps/app/CLAUDE.md` exige que exporte também a função imperativa. Segue o único fora da regra |
| 🟡 **`provider-error` não distingue as falhas do provedor** — cota estourada, domínio não verificado e chave revogada produzem o mesmo `reason` | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado**. A assimetria segue: `@repo/email` manteve o próprio `logEmail` em vez do `logEvent` compartilhado |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | Reconferido: 1 ocorrência fora de teste, a própria definição. O form não tem `<form>`, nem handler, nem import da action — que **existe e tem teste** |
| 🟡 **O rodapé da `apps/web` consome `data-cookie-banner` sem teste que fixe o acoplamento** | `apps/web/app/[locale]/components/footer.tsx:56` | O lado da `apps/app` tem teste; o da `web` não, porque a suíte dela roda em `environment: "node"`, sem jsdom |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito.

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | 🔴 **Os três índices compostos dos resumos da home precisam ser publicados.** Sem eles, `GET /entities/summary` e `GET /users/summary` respondem 503 `SUMMARY_INDEX_MISSING` e os cartões de cada painel mostram o erro traduzido | `PRE-PRODUCTION.md` §1.5 | ~5 min + construção |
| 2 | 🔴 **O índice da busca de perfil por `reference_id` precisa ser publicado.** É a consulta que todo guard roda para transformar o UID do Firebase Auth no documento de perfil, e é a única dos seis **sem degradação traduzida** | `PRE-PRODUCTION.md` §1.6 | ~5 min + construção |
| 3 | 🔴 **O índice composto da trilha de auditoria precisa ser publicado.** Sem ele, o **filtro por usuário** de `/admin/audit` responde 503 `PAGINATION_INDEX_MISSING` | `PRE-PRODUCTION.md` §1.2 | ~5 min + construção |
| 4 | 🔴 **O índice composto da listagem paginada de `entity` precisa ser publicado.** Sem ele, `GET /entities` responde `PAGINATION_INDEX_MISSING` em produção e a tela fica vazia. ⚠️ **O emulador não cobra índice composto**, então nada no gate local pega isto — e são **seis** índices nessa situação | `PRE-PRODUCTION.md` §1.1 | ~5 min + construção |
| 5 | **A retenção da coleção `auditEvent` não foi decidida.** Os documentos não têm `expiresAt` e nada expurga. É a decisão nº 8 | `PRE-PRODUCTION.md` §1.3 | decisão + ~10 min |
| 6 | **Backfill de instantes em base que já tem dado.** Antes da PR #17 o `update()` regravava `createdAt` como string ISO; o Firestore ordena por tipo antes de valor. O script existe e tem dry-run | `PRE-PRODUCTION.md` §1.4 | ~10 min por coleção |
| 7 | **`main` não tem branch protection.** O pré-requisito caiu na PR #13 e continua satisfeito — o gate fechou 24/24 sem cache. Remedido hoje: `protection` → 404, `rulesets` → `[]` | `PRE-PRODUCTION.md` | **minutos** |
| 8 | **Ninguém vigia a trilha de erro.** O `onRequestError` está plugado nos três apps e escreve no stdout; nenhum coletor está ligado. `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve zero. É o resíduo de `observability-logging` | `PRE-PRODUCTION.md` §11 | P + conta em provedor |
| 9 | **O health check da plataforma não aponta para `/health/ready`.** A rota existe e responde 503 quando o Firestore não atende em 2 s; enquanto ninguém a configura, a plataforma segue olhando `/health` | `PRE-PRODUCTION.md` §11 | ~2 min |
| 10 | 🆕 **`SESSION_ABSOLUTE_MAX_AGE_DAYS` não está no checklist.** Governa por quanto tempo uma sessão pode ser renovada; tem padrão de 30 dias e grampo de 90, então nada quebra — mas o fork herda uma política de sessão que nunca leu. **E o teto pode ser ultrapassado por até meia vida de cookie** (decisão nº 7), o que também não está escrito em lugar nenhum que um fork abra | *(só neste arquivo)* | ~5 min (texto) |
| 11 | **`SESSION_COOKIE_DOMAIN` precisa estar definida se `web` e `app` rodarem em subdomínios distintos.** Sem ela o cookie de consentimento fica host-only e o visitante responde ao banner **duas vezes**. 🆕 **O alcance dobrou:** agora a renovação de sessão depende do mesmo cookie compartilhado entre os dois apps | `PRE-PRODUCTION.md` §7 | ~2 min |
| 12 | **A política de privacidade linkada pelo banner não menciona cookies.** Ver a decisão nº 9 | `PRE-PRODUCTION.md` §7 | P (texto) |
| 13 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados". Exige plano **Blaze**. Também trava metade do item 3 de `data-rights-lgpd` (#3 da ordem) | `PRE-PRODUCTION.md` | cartão + ~15 min |
| 14 | 🆕 **A revogação de sessão nunca foi provada ponta a ponta.** O emulador de Auth aceita o cookie depois de `revokeRefreshTokens`, o que atinge o caminho que o proxy usa em toda navegação autenticada. Coberto por teste unitário; a prova exige projeto Firebase real. Classificado 🔒 no `/test` da PR #20 | *(só neste arquivo)* | projeto real + ~15 min |
| 15 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 16 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações | `PRE-PRODUCTION.md` | P |
| 17 | **Contas de QA acumuladas: 15.** A PR #20 não acrescentou nenhuma — o `/test` dela rodou contra o emulador, como os das #17, #18 e #19. Uma das antigas (`qa-account-settings-b@`) segue **inutilizável**: apagar, não reusar | `PRE-PRODUCTION.md` | P |
| 18 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 19 | **O login com Google nunca teve passe manual com conta real.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta | *(só neste arquivo)* | ~2 min |
| 20 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** Depende da pendência 13; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#6) | `PRE-PRODUCTION.md` | ver #13 |
| 21 | **Conferir a retenção de log da plataforma no painel do provedor.** O prazo e a fundamentação já estão escritos; o que falta é ler o número que o provedor pratica | `PRE-PRODUCTION.md` §11 | ~5 min |
| 22 | **O item de reabertura do consentimento no `ProfileDropdown` nunca foi visto num browser.** Coberto por teste jsdom, não por passe visual | *(só neste arquivo)* | ~2 min com emulador de pé |

> **A fila de índices não cresceu nesta rodada.** Eram dois há duas rodadas, viraram seis na anterior, e
> continuam **seis**: a PR #20 não agregou nem ordenou por campo novo. Isso corrige o enunciado da rodada
> passada, que dizia "cada spec nova acrescenta uma linha nesta fila". A fila cresce com spec que
> **consulta** de um jeito novo, não com spec que muda comportamento. `user-activity-tracking`, o #1 da
> ordem, declara **nenhum índice novo** no corte — a coluna não ordena no servidor. Se isso se confirmar, a
> próxima entrega também não mexe na fila.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | Mantém o argumento das cinco rodadas anteriores. A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Depende da decisão nº 2. |
| **Tela de sessões e dispositivos ativos, com encerramento individual** | 1/10 | 🆕 Explicitamente fora do corte de `session-refresh`, arquivada. Pertence a [`account-security-mfa`](account-security-mfa.md) (#4), que já declara os mesmos arquivos de `packages/auth`. |
| **Rotação de refresh token com detecção de reuso** | — | 🆕 Fora do corte de `session-refresh`. O refresh token é do Firebase, não do repositório: não há onde implementar sem sair do provedor. |
| **"Continuar conectado" no login · autenticação reforçada para operação sensível · aviso de inatividade com contagem regressiva** | — | 🆕 Fora do corte de `session-refresh`. A reautenticação para ação sensível já estava listada como iteração própria em `account-security-mfa`. |
| **Rate limit próprio para as rotas de sessão** | — | 🆕 A spec de `session-refresh` levantou isto nos riscos e não pôs no corte. Virou [achado](#-achados-novos), não spec: o mecanismo existe (`@repo/security`), só não alcança rotas fora da `apps/api`. |
| **Widgets configuráveis, arrastáveis ou por papel na home** | — | Explicitamente fora do corte de `dashboard-home`, arquivada: complexidade sem retorno num core que cada fork vai reescrever. |
| **Série temporal real, comparação com período anterior, filtro de intervalo na home** | — | Fora do corte de `dashboard-home`. A parte de atividade virou [`admin-analytics-dashboard`](admin-analytics-dashboard.md) e a de receita, [`admin-billing-insights`](admin-billing-insights.md). |
| **Contador materializado / agregação incremental** | — | Fora do corte de `dashboard-home`, que resolveu contar com a agregação nativa do Firestore. Vira necessário só quando alguma coleção crescer a ponto de a agregação doer, e aí com medição. |
| **Histórico de acessos · IP, user-agent, dispositivo e geolocalização · presença em tempo real** | — | Fora do corte de [`user-activity-tracking`](user-activity-tracking.md) (#1). Acrescentar IP mudaria a natureza jurídica do dado — vira "registro de acesso" no sentido do Marco Civil art. 5º, VIII — e isso precisa de justificativa própria. |
| **Exportar a trilha de auditoria · expurgo automático** | — | Explicitamente fora do corte de `audit-log`, arquivada. As duas dependem de decidir o prazo de retenção, que é a decisão nº 8. |
| **Alerta em tempo real sobre ação sensível** | — | Fora do corte de `audit-log`. Depende de `observability-logging` ter um coletor do outro lado — hoje não tem. |
| **Auditar toda escrita de qualquer recurso** | — | Fora do corte de `audit-log`: começa caro, envelhece mal e gera ruído. A trilha cobre cinco ações sensíveis, não o CRUD inteiro. |
| **Busca textual no servidor** | — | Explicitamente fora do corte de `cursor-pagination`, arquivada. Ver a decisão nº 10. |
| **Contagem total de registros na listagem** | — | Fora do corte de `cursor-pagination`. **Reavaliar quando alguém pedir:** o `countQuery` da PR #19 (`base.repository.ts:122-124`) é a peça que faltava, e o custo caiu para "uma chamada". |
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
| Provedor de e-mail plugável (SES/Postmark) · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`, arquivada. Reabrir exige spec nova. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, arquivada. O `POST /files` ficou genérico de propósito. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`, arquivada. A exclusão de conta virou [`data-rights-lgpd`](data-rights-lgpd.md) e as sessões viraram [`account-security-mfa`](account-security-mfa.md); a **troca de e-mail** continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, arquivada. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#6). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Explicitamente fora do corte de `observability-logging`. A nota de pesquisa registra o conflito entre Sentry v8+ e `@vercel/otel`, que quebra a propagação de trace em silêncio. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional que manter no core. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. O pré-requisito está satisfeito há sete rodadas. Reavaliar junto com o branch protection. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição, e como opt-in por variável ausente. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **10** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois. Cruza com `e2e-testing` (#6). |
| Changesets / versionamento · Storybook | — | Com pacotes `private: true` e forks que divergem, o valor do changelog não paga o processo. O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
