# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-23 (`/spec --sync`, pós-merge da PR #22) · anteriores: 2026-09-19 (PR #21) ·
> 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) · 2026-09-16 (PR #17) ·
> 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 · 2026-09-14 ·
> 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 ·
> **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`admin-analytics-dashboard` foi entregue e arquivada.** Era o #1 desta lista. PR #22 mergeada em
>    `main` em 2026-09-20T23:28:49Z (`03498ae`), CI `success` no SHA de merge (`gh run 35544765975`). Os
>    **cinco** itens do corte foram reabertos um a um no código e todos fecharam — a primeira spec em três
>    rodadas a fechar sem item parcial. É a décima quinta a sair da fila, e vive agora em
>    [`docs/features/admin-analytics-dashboard/spec.md`](../docs/features/admin-analytics-dashboard/spec.md).
> 2. **O teste instável que derrubou o CI da PR #21 foi consertado, e por uma PR que não tinha isso no
>    escopo.** O primeiro commit da #22 trocou as duas chamadas a `new Date()` por um `const createdAt`
>    único (`base.repository.ts:151-155`). Era o 🔴 desta lista; sai fechado. **Duas consequências:** a
>    decisão de ligar o branch protection perdeu a dependência que ganhou na rodada passada, e
>    [`e2e-testing`](e2e-testing.md) perdeu o argumento concreto que tinha acabado de recuperar.
> 3. **O `contends_on` errou por excesso pela primeira vez.** A spec entregue declarava
>    `apps/api/app/(routes)/users/summary/route.ts`, e a entrega não tocou esse arquivo: criou a rota
>    vizinha `users/activity-summary/route.ts`, seguindo a recomendação da própria spec. As três rodadas
>    anteriores erraram por **falta**. A causa é a mesma nas quatro.
> 4. **Os 20 links mortos nas specs arquivadas continuam lá, e agora dá para dizer por quê.** Não é
>    esquecimento: a auditoria **não tem mandato** para editar `docs/features/**` fora do arquivamento, e a
>    `/spec-audit` §4.1 só manda varrer quem aponta *para* a spec movida. As duas últimas specs arquivadas
>    saíram limpas porque a correção foi feita **antes** do `git mv`. Ver [Precisam de decisão](#precisam-de-decisão) nº 12.
> 5. **`data-rights-lgpd` é o #1 desta rodada.** Depois de três adiamentos consecutivos pelo mesmo
>    argumento, a auditoria aplicou a saída que ela mesma escreveu na rodada passada. O porquê está em
>    [Ordem recomendada](#ordem-recomendada).

## Contadores

Sobre as **8 specs que seguem em `specs/`**. Recontados do disco em 2026-09-23, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 6 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 15 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 2 · `confianca` 2 · `dx` 2 (+1 `in-progress` em `dx`, +1 `deferred` em
`produto`). **Por esforço:** P 0 · M 5 · G 3. **Por valor:** alto 5 · médio 3 · baixo 0.

**Transições aplicadas: 1** (`admin-analytics-dashboard`: `proposed` → `done`, arquivada). Nenhuma spec
nova entrou: esta rodada é `--sync` puro.

> **A fila encolheu por subtração pela quarta rodada seguida** — 11, 10, 9, agora 8. O eixo de ferramental
> segue parado, mas mudou de sinal: `observability-logging` continua esperando uma decisão que não chega há
> **oito** rodadas, e `e2e-testing` **perdeu** o argumento que tinha ganhado, porque o teste instável que o
> sustentava foi consertado. Uma ocorrência consertada não paga esforço **G**.

### O caso `admin-analytics-dashboard` — o que foi conferido antes de arquivar

PR **#22** mergeada em `main` em 2026-09-20T23:28:49Z (merge commit `03498ae`), com CI `success` nesse SHA
(`gh run 35544765975`). A execução da branch antes do merge também fechou `success`
(`gh run 35544220556`). Os cinco itens do corte, reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. KPI de ativos, definição explícita, no servidor sob `requireAdminApi`, sem ler a coleção | **implementado** | Rota nova `apps/api/app/(routes)/users/activity-summary/route.ts:6`, sob `requireAdminApi`. `userRepository.activitySummary()` (`user.repository.ts:92`) roda **cinco** `countQuery` em paralelo (`:104-111`) sobre `base.repository.ts:122`, que é `query.count().get()`. Nenhum documento lido. `active` em `:116` |
| 2. KPI de inativos, com o X de "sem acesso há X dias" na tela | **implementado** | `inactive` em `user.repository.ts:117`. O X viaja do servidor em `thresholds.inactiveDays` (`:129`), lido de `INACTIVE_AFTER_DAYS = 30` (`activity-windows.ts:14`), e é interpolado no texto do cartão em `UserActivitySection.tsx:56-60`. O número da tela e o da consulta são o mesmo valor |
| 3. Gráfico de acesso reaproveitando o componente do design-system | **implementado**, com desvio de forma | `UserRecencyChart.tsx:48-54` sobre o `CategoryBarChart`, cinco faixas em `:40-46`. É histograma de recência, não série temporal — ver [Deriva](#deriva-de-implementação--admin-analytics-dashboard) |
| 4. `MetricCard`, grupo `users` de `queryKeys.ts`, carregando/vazio/erro no padrão do `AdminHomeClient` | **implementado** | `MetricCard` em `UserActivitySection.tsx:90-101`; chave em `queryKeys.ts:43-44`, dentro do grupo `users`. Carregando em `:67-85`, erro em `:63-65` via `FormattedError`/`handleClientError`/`LoadErrorState`, base sem carimbo em `:112-118` |
| 5. Texto nos 3 idiomas, com a definição de "ativo" como `hint` | **implementado** | `translations/apps/app/pages/admin/home.ts` — pt-br `:19-46`, en `:65-92`, es `:111-138`. O `hint` de ativo traz dias e precisão interpolados (`:25`, `:71`, `:117`) |

Cobertura somada: 8 casos em `userActivitySummaryRepository.test.ts`, 6 em `usersActivitySummaryRoute.test.ts`,
6 em `activityWindows.test.ts`, 6 em `firestoreIndexes.test.ts`, 9 em `userActivitySection.test.tsx`,
6 em `userRecencyChart.test.tsx`, 8 em `adminHomePrefetch.test.tsx` e 5 em `adminHomeActivityDegraded.test.tsx`.

**A pergunta em aberto sobre a landing foi respondida na tela.** O corte deixou o item c de fora e a
recomendação era que o texto dissesse o que as métricas cobrem. `home.ts:21` diz "Quem acessou o painel e
há quanto tempo". Como medir visita à `apps/web` continua sem decisão, mas deixou de ser dívida silenciosa.

## Gates — medidos nesta auditoria

Executados agora, com `--force`, neste workspace, com o `HEAD` em `03498ae`. Não copiados do `/test` nem
da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **624 arquivos · 0 erros** (`No fixes applied`, 418 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 1 min 16,6 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-19 (PR #21) |
|-----------|---------:|-------:|---------------------------|
| `api` | 53 | 597 | **+3 arquivos · +21** |
| `app` | 58 | 418 | **+4 arquivos · +29** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 8 | 101 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/internationalization` | 4 | 33 | **+1 arquivo · +6** |
| `web` | 5 | 31 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **145** | **1434** | **+8 arquivos · +56 testes** |

A PR #22 não criou workspace novo, então as 24 tasks e as **10** configs de Vitest ficaram onde estavam. O
`pnpm check` subiu de 611 para **624** arquivos. O gate passou de 54,2 s para **1 min 16,6 s** — o tempo
subiu 41 %, e a suíte cresceu 4 %; a medição foi numa máquina com outra carga, então o número serve de
registro e não de tendência.

> ✅ **O aviso da rodada passada sobre teste instável foi atendido, e não por esta auditoria.** A execução
> de CI da PR #21 (`gh run 35456187047`) tinha fechado `failure` com 1 teste de 576 quebrado, porque
> `apps/api/__tests__/baseRepository.test.ts:477` afirma `created.updatedAt === created.createdAt` e o
> repositório produzia os dois instantes com duas chamadas separadas a `new Date()`. O **primeiro commit**
> da PR #22 (`fix(api): keep createdAt and updatedAt identical on create`) trocou isso por um `const
> createdAt` único, usado nos dois campos (`base.repository.ts:151-155`), com a regra escrita em `:148-150`.
> O que **não** mudou: nenhum gate deste repositório distingue teste que passa de teste que passa quase
> sempre. Sobrou a ausência do mecanismo, sem caso concreto em aberto.

CI: a execução de merge de **#22** (`03498ae`) está em **`success`**. `git log origin/main -1` devolve
`03498ae` e o `HEAD` local é o mesmo commit — nenhum commit do repositório está fora de `main`.

O branch protection continua **não ligado**, remedido hoje:
`gh api repos/:owner/:repo/branches/main/protection` → **404**, `rulesets` → **`[]`**. O repositório já tem
**22** PRs. ⚠️ **A dependência que essa decisão tinha ganhado caiu**: com o teste instável consertado,
ligar a proteção não transforma mais um *flake* em merge bloqueado ao acaso.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Uma spec segue bloqueada por dependência.**

> **O critério de execução continua valendo: o que uma rodada autônoma consegue provar.** O `/cycle` não
> provisiona infraestrutura, então uma spec cujos critérios de aceite dependem de conta em provedor volta
> com metade dos critérios "não verificados". Isso não a torna menos valiosa — torna-a má escolha para
> **esta** forma de execução, e a distinção precisa estar escrita para não virar preconceito silencioso.
> ⚠️ **Nesta rodada o critério perdeu para outro, de propósito.** Ver o #1.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`data-rights-lgpd`](data-rights-lgpd.md) | **Maior valor do backlog, única com prazo imposto de fora, e a auditoria parou de adiá-la.** Segue em 0/5, reconferido hoje: `account/route.ts` expõe só `GET:97` e `PUT:107`, não há rota de exportação em nenhum dos 8 grupos (23 `route.ts` no total), e o `delete()` herdado é soft delete (`base.repository.ts:209-211`). Herdou de `user-activity-tracking` a obrigação de cobrir `lastAccessAt` no export e na exclusão — custo próximo de zero, porque o campo vive no mesmo documento de perfil. ⚠️ **Os dois limites conhecidos ficam nomeados antes de planejar, e é isso que muda a aposta:** o item 3 pede que a exclusão limpe arquivos e cancele assinatura no mesmo fluxo, e nenhuma das duas pontas existe (Cloud Storage não ativado; `billing-subscription` em 0/6). O `/analyze` recorta essas duas do corte em vez de descobri-las no `/test`. Os outros 3 critérios são verificáveis sob o emulador. **Quarta rodada seria a quarta omissão** — ver [decisão nº 1](#precisam-de-decisão) |
| 2 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze`, e é isso que a segura pela sexta rodada.** Valor alto, esforço M e zero dependência de infra externa — o melhor perfil bruto da fila, e a única das três primeiras que uma rodada autônoma prova inteira. O item 2 continua oco desde que a PR #12 passou a coletar nome e idioma na área de conta, e a contagem de pontos de decisão de destino medida em 2026-09-19 deu **seis no cliente e nove contando o servidor**, contra os cinco que a spec declara. Inclui `(common)/layout.tsx:31-34`, o único desvio de destino já implementado no servidor e justamente o padrão que o onboarding deveria seguir. **Rodar `/spec onboarding-flow` antes e ela passa à frente do #1** |
| 3 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto empatado e ainda em **0/6**, reconferido hoje: não existe grupo `payments/` entre os 8 de `apps/api/app/(routes)/`, o `UserDTO` não tem `subscription` nem `stripeCustomerId` (`grep` devolve 0), o SDK registra **7** actions (`client/index.ts:14-20`) e nenhuma é de pagamento, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`) sem dedupe por `event.id`. **Segue atrás por execução, não por mérito:** provar checkout, portal e webhook exige chaves reais da Stripe. **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar |
| 4 | [`account-security-mfa`](account-security-mfa.md) | Em **1,5 de 6**, inalterado nesta rodada. O item 1 (fechar a janela de revogação) está em `packages/auth/server.ts:153-166`; metade do item 3 existe em `POST /account/sessions/revoke`, tudo-ou-nada por limite do Firebase. `grep -iw "multifactor|totp"` em `apps/` e `packages/` devolve **zero**, reconferido. Continua `value: médio` por mérito próprio (MFA em **3/10** dos starters pesquisados, sessões gerenciáveis em **1/10**) e o item 4 segue sendo mudança de contrato em **25** ocorrências de `MIN_PASSWORD_LENGTH`. O custo de MFA no GCIP segue **não confirmado**. ⚠️ Também precisa de reescopo — ver [decisão nº 6](#precisam-de-decisão) |
| 5 | [`e2e-testing`](e2e-testing.md) | 🆕 **Perdeu o argumento que tinha recuperado, e perdeu porque o problema foi resolvido.** O teste instável que derrubou o CI da PR #21 foi consertado pela PR #22 (`base.repository.ts:151-155`); sobra a ausência do mecanismo, sem caso concreto em aberto. O resto do argumento é o de sempre e segue medido: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, **nenhuma** das 10 configs medindo cobertura, e **duas rules files sem um único teste de regra**. 🆕 Ganhou um argumento menor no lugar: `@repo/design-system` **não tem task de teste**, e a PR #22 teve de estacionar um teste sobre o `CategoryBarChart` em `packages/internationalization/__tests__/chartAxisLabels.test.ts`. Esforço **G** é o que a mantém aqui |
| 6 | [`admin-billing-insights`](admin-billing-insights.md) | Bloqueada, e **é a única que ainda está**. Espera `billing-subscription`, que está em 0/6. Continua separada de propósito: juntá-la à spec de atividade teria feito KPIs construíveis nascerem bloqueados por Stripe, e a entrega da PR #22 provou que a separação valeu. **O risco que ela carrega é de correção, não de esforço**: agregar receita a partir de webhook sem dedupe por `event.id` infla o número em silêncio |
| 7 | [`observability-logging`](observability-logging.md) | `in-progress`. Entregue em 5 dos 6 itens; o resíduo é adotar um coletor de erro, que depende de decisão de produto e de conta em provedor. **Fora do conjunto elegível** — ver [decisão nº 3](#precisam-de-decisão). **Oitava rodada consecutiva sem resposta.** As chamadas de `console` cru em `packages/auth/server.ts` seguem em **7**, recontadas hoje; no repositório inteiro são **18 em 12 arquivos**, das quais 2 são os sinks legítimos (`log.ts`, `requestErrorReporter.ts`) |
| 8 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora pela **décima** rodada. Ver [decisão nº 4](#precisam-de-decisão) |

### O que **não** foi escolhido para #1, e por quê

- **`onboarding-flow` foi a segunda, e é a que mais dói deixar de fora.** Valor alto, esforço M, zero infra
  externa, e a única do topo que uma rodada autônoma prova inteira. Perde por um motivo mecânico e
  conhecido: **o corte de MVP está medido como errado** — nove pontos de decisão de destino contra os cinco
  declarados, e o item 2 vazio desde a PR #12. Planejar sobre ele produz o plano errado, e a auditoria não
  reescopa (isso é `/spec <id>`, modo descoberta). **Sexta rodada em que essa reescrita é recomendada e não
  acontece.** Se você rodar `/spec onboarding-flow` antes, ela toma o #1 sem discussão.
- **`billing-subscription` foi a terceira, e perde por verificabilidade.** Empata em valor com o #1, tem
  esforço menor (M contra G) e o corte não foi contestado. O que a tira é que checkout, portal e webhook só
  se provam com chaves reais da Stripe: uma rodada autônoma devolveria a maior parte dos critérios como
  "não verificados". Ela é a candidata natural ao topo no dia em que a execução deixar de ser autônoma
  **ou** em que as chaves de teste existirem.
- **Trocar o critério de escolha é a decisão desta rodada, e ela é discutível.** As duas rodadas anteriores
  escolheram o #1 pelo que uma rodada autônoma consegue provar, e nas duas `data-rights-lgpd` ficou em
  terceiro. Aplicar o mesmo critério uma quarta vez seria coerente e seria omissão: a própria auditoria
  escreveu na rodada passada que três adiamentos pelo mesmo motivo deixam de ser priorização. O critério
  antigo não foi abandonado — ele continua explicando por que o #3 não é o #1. Foi **sobreposto**, uma vez,
  pela spec que tem obrigação legal. Se você discordar, a saída está na [decisão nº 1](#precisam-de-decisão)
  e não exige refazer nada.

### O que o merge da PR #22 mudou no ranking

`admin-analytics-dashboard` saiu da fila sem destravar ninguém: **nenhuma spec tinha `depends_on` apontando
para ela**. É a primeira entrega em quatro que não destrava nada, e isso não é defeito da entrega — é o que
acontece quando a spec é folha do grafo.

O efeito real foi na contenção. `apps/api/app/(routes)/users/summary/route.ts` saiu do `contends_on`
coletivo (era citado só por ela) e `firestore.indexes.json` caiu de **3** para **2** citações. Com isso,
**nenhum arquivo é disputado por 3 ou mais specs** — o primeiro estado assim desde a semeadura.

A consequência prática aparece nos lotes: [`e2e-testing`](e2e-testing.md) **entra no lote 1 pela primeira
vez**, depois de cinco rodadas barrada só pelo teto de 3.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-23** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis agora: 5 de 8.** Fora ficam `teams-organizations` (`deferred`), `observability-logging`
(`in-progress`) e `admin-billing-insights` (espera `billing-subscription`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `data-rights-lgpd` · `onboarding-flow` · `e2e-testing` | `base.repository.ts` + `packages/auth/server.ts` + `firestore.indexes.json` · `apps/app/proxy.ts` + `postLoginNavigation.ts` + `user-merge.ts` + `UserDTO` · `package.json` da raiz + `turbo.json` + `ci.yml` | **expurgo do titular**, **caminho de entrada do app** e **ferramental da raiz**. A primeira vive na camada de persistência e credencial, a segunda no desvio de navegação, a terceira não toca em `apps/` nem em `packages/` |
| **2** | `billing-subscription` · `account-security-mfa` | webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` · `packages/auth/*` + `resolve-api-actor.ts` | **assinatura** e **camada de credencial**. A primeira atravessa API, SDK e app pelo eixo de pagamento; a segunda vive dentro do pacote de autenticação |

### Por que cada spec ficou fora do lote 1, nominalmente

- **`billing-subscription` colide com `onboarding-flow`** em `packages/sdk/src/types/user/user.ts`. As duas
  acrescentam campo ao `UserDTO`. É a mesma colisão da rodada passada, e ela sobrevive porque nenhuma das
  duas andou.
- **`account-security-mfa` colide com `data-rights-lgpd`** em `packages/auth/server.ts`. Terceira rodada
  com essa colisão, e ela é o que separa as duas em lotes diferentes.
- **Ninguém foi barrado pelo teto de 3 nesta rodada.** É informação nova: nas cinco anteriores, sempre
  sobrava uma spec disjunta de tudo esperando vaga, e essa spec era sempre a `e2e-testing`. Ela entrou.

### O que mudou no cálculo, e por quê

- **`e2e-testing` entrou no lote 1 pela primeira vez.** Não mudou nada nela: mudou o número de elegíveis.
  Com a saída de `admin-analytics-dashboard`, sobraram cinco elegíveis e o lote 1 coube inteiro.
- **`data-rights-lgpd` subiu para a cabeça do lote 1** por consequência da ordem, não por contenção. O
  `contends_on` dela não mudou desde 2026-09-17.
- **O lote 2 encolheu de 3 para 2 specs**, porque `data-rights-lgpd` migrou para o lote 1 e não entrou
  ninguém no lugar. Com cinco elegíveis e teto de 3, não há como fazer dois lotes cheios.

**Os arquivos mais disputados entre as 8 specs, recontados:** nenhum passa de **2** citações. Ficam
empatados em 2: `firestore.indexes.json` (`data-rights-lgpd`, `teams-organizations`),
`packages/sdk/src/types/user/user.ts` (`billing-subscription`, `onboarding-flow`), `packages/auth/server.ts`
(`data-rights-lgpd`, `account-security-mfa`), `packages/sdk/src/client/index.ts` (`billing-subscription`,
`teams-organizations`) e `apps/api/app/(routes)/webhooks/payments/route.ts` (`billing-subscription`,
`admin-billing-insights`).

> **O aviso das specs de painel saiu de cena.** Elas disputavam entre si o `AdminHomeClient.tsx` e o
> `queryKeys.ts`, e por isso não podiam rodar no mesmo lote. Com uma delas entregue, sobra só
> `admin-billing-insights` citando os dois arquivos, e ela nem é elegível. A restrição volta a existir no
> dia em que alguém abrir uma terceira spec de painel.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra.

A régua desta rodada, com `admin-analytics-dashboard` como amostra: ela declarava **4** arquivos e acertou
**3** (`AdminHomeClient.tsx`, `queryKeys.ts`, `firestore.indexes.json`). O quarto,
`apps/api/app/(routes)/users/summary/route.ts`, **nunca foi tocado** — a entrega criou a rota vizinha
`users/activity-summary/route.ts`, exatamente como a própria spec recomendava nas perguntas em aberto.

**É o primeiro erro por excesso registrado, depois de três seguidos por falta.** E o erro por falta também
apareceu: a PR tocou 45 arquivos, e os que importam e nenhuma spec previa são `user.repository.ts`,
`base.repository.ts` e `category-bar-chart.tsx`. Nos quatro casos, o arquivo errado é **vizinho** dos
declarados, na mesma camada. A regra prática continua a mesma e continua não sendo seguida: ao declarar
`contends_on`, **declare a camada, não os arquivos que você lembra dela**.

## Precisam de decisão

Nenhuma delas é da auditoria. Todas têm recomendação.

> ⚠️ **Sete destes itens se repetem há duas rodadas ou mais e, pela
> [§5.1 da `cycle-policy`](../.claude/cycle-policy.md), deveriam ter saído do limbo.** Estão marcados com
> 🔁 e a coluna de recomendação diz **por qual dos três caminhos** cada um sai: virar linha de política,
> virar entrada em `docs/PRE-PRODUCTION.md`, ou virar achado com `arquivo:linha`.

| # | questão | recomendação |
|---|---------|--------------|
| 1 | 🔁 **A auditoria pôs `data-rights-lgpd` como #1 por conta própria. Confirmar ou reverter?** As três rodadas anteriores a deixaram em terceiro pelo critério de verificabilidade autônoma, e a rodada passada escreveu que um quarto adiamento pelo mesmo motivo seria omissão | **Confirmar.** A escolha foi aplicada, não proposta, e a razão é que a recomendação anterior tinha data marcada e a data era esta rodada. Ela perde 2 de 5 critérios para infra que não existe, e isso continua verdade; a diferença é que os dois são **nomeáveis antes de planejar** (limpeza de arquivo no Cloud Storage; cancelamento de assinatura), então o `/analyze` recorta em vez de descobrir. **Reverter custa uma linha**: se você preferir o critério antigo, o #1 vira `onboarding-flow` depois de `/spec onboarding-flow`, e aí a §5.1 exige o outro caminho — escrever em `docs/PRE-PRODUCTION.md`, com dono e data, que o repositório assume o risco de não ter direitos do titular até Cloud Storage e billing existirem |
| 2 | 🔁 **`observability-logging` fecha como entregue?** 5 dos 6 itens estão no código; o que falta é adotar um coletor de erro, que exige conta em provedor e é a pergunta em aberto nº 1 da própria spec. **Oitava rodada consecutiva sem resposta** | **Fechar como `done`** e abrir uma spec nova de esforço P só para o coletor. Saída pela §5.1: é decisão de produto, então vira **entrada em `docs/PRE-PRODUCTION.md` §11 com dono e data** e **para de ser reapresentada** até você mexer. O custo da indecisão é medível e vem se acumulando: a spec fica fora dos lotes paralelos, ou seja, **um workspace a menos por noite, há oito rodadas** |
| 3 | 🔁 **`teams-organizations` continua `deferred`?** Quarenta e dois dias e dez PRs sem nenhuma das duas contrapartidas de esforço P que tornavam o adiamento honesto. **O gatilho escrito na própria spec disparou e já se repetiu seis vezes** | Ou as contrapartidas viram tarefa com dono, ou o status vira `rejected` até aparecer o primeiro fork B2B. Saída pela §5.1: as duas contrapartidas **são pequenas e concretas**, então viram achado com `arquivo:linha` no backlog (já estão: `docs/ARCHITECTURE.md` sem declaração B2B/B2C, e os 14 sítios de posse). O que precisa de você é só o status |
| 4 | 🔁 **Ligar o branch protection na `main`?** Remedido hoje: `protection` → 404, `rulesets` → `[]`. Uma PR vermelha pode ser mergeada, e **uma foi** (#21) | ✅ **Ligar agora — a dependência caiu.** A rodada passada condicionou isto a consertar o teste instável primeiro, para não transformar um *flake* de milissegundo em merge bloqueado ao acaso. **A PR #22 consertou** (`base.repository.ts:151-155`). Não sobra pré-requisito técnico: exigir o check do CI passou a custar minutos, e o risco de adiar cresce com o número de PRs, já em **22**. Saída pela §5.1: a entrada em `docs/PRE-PRODUCTION.md` §9 já existe; o que falta é sua mão no painel do GitHub |
| 5 | 🔁 **`onboarding-flow` e `account-security-mfa` precisam de reescopo antes do `/analyze`.** **Sexta rodada em que isso custa posição no ranking** | Rodar `/spec <id>` nas duas antes de planejar. Saída pela §5.1: isto é **decisão técnica dentro do mandato do ciclo** e deveria virar linha de política — *spec cujo corte foi contestado pela auditoria não entra em `/analyze` sem reescopo*. A prova de por quê é de 2026-09-19 e segue de pé: nove pontos de decisão de destino contra cinco declarados, e 1,5/6 onde o índice dizia zero. Nesta rodada a regra **mordeu**: foi ela que tirou `onboarding-flow` do #1 |
| 6 | 🔁 **O gate de aprovação de spec não está sendo usado — assumir isso ou passar a usá-lo.** 🆕 **Agora são três specs seguidas** planejadas, implementadas, revisadas e mergeadas sem nunca sair de `proposed`: `session-refresh`, `user-activity-tracking` e `admin-analytics-dashboard` | **Assumir.** Saída pela §5.1: o gate existe no contrato (`README.md`) e não existe na prática há três entregas — não é backlog desatualizado, é regra morta. Duas saídas honestas: (a) remover `approved` do ciclo de vida e tratar `proposed` como "pronta para planejar", ou (b) fazer o `/cycle` recusar spec não aprovada. **Recomendo (a)**, porque é o que já acontece e porque o gate real de qualidade tem sido a auditoria. ⚠️ A auditoria **não pode** exercer o gate por você: mover para `approved` é decisão de produto |
| 7 | 🔁 **O teto absoluto da sessão pode ser ultrapassado por até meia vida de cookie.** A entrega da PR #20 verifica o teto **depois** do limiar de renovação, então uma sessão sobrevive ao teto por até 32,5 dias com os padrões de 5 e 30. **Terceira rodada** | **Manter como está, e escrever o número onde um fork o leia.** Inverter a ordem custaria uma chamada ao provedor em toda navegação. Saída pela §5.1: vira **entrada em `docs/PRE-PRODUCTION.md`**, junto de `SESSION_ABSOLUTE_MAX_AGE_DAYS`, que também não está lá. Hoje o comportamento só existe na spec arquivada de `session-refresh` |
| 8 | 🔁 **Por quanto tempo reter os eventos da trilha de auditoria?** A coleção `auditEvent` nasceu sem expurgo e sem `expiresAt`, e cresce a cada ação sensível de todo fork. **Quinta rodada sem resposta** | Decidir um prazo padrão e escrevê-lo em `docs/PRE-PRODUCTION.md` §1.3, **sem** invocar o art. 15 do Marco Civil (que é do log de acesso, não da trilha de negócio). Guardar além do necessário é o risco que o Decreto 8.771/2016, art. 13, § 2º manda evitar |
| 9 | **Quem escreve a política de privacidade que o banner linka?** O consentimento de cookies aponta para `/legal/privacy`, que é modelo e **não menciona cookies** em nenhum dos 3 idiomas (`grep -ci cookie` em `translations/apps/web/pages/legal/index.ts` devolve **0**, remedido hoje) | Texto legal é responsabilidade de cada fork, não do core — mas o **core deve entregar um modelo que ao menos declare os cookies que ele próprio grava**. A tabela está em `docs/PRE-PRODUCTION.md` §7. Cabe no corte de `data-rights-lgpd`, que é o **#1 desta rodada**, ou vira tarefa direta de esforço P |
| 10 | **A busca da tabela enxerga só as páginas carregadas.** A PR #17 tratou o sintoma — o texto de lista vazia avisa que a busca não alcançou o resto (`table.tsx:112-118`) —, mas o comportamento continua sendo "procurar no que já baixou" | Abrir spec própria quando alguém sentir a dor, não antes. A decisão de fundo (prefixo no Firestore × serviço de busca) é cara e não tem caso de uso concreto no core hoje |
| 11 | **Como medir visitas à `apps/web`?** ⚠️ **Nenhuma das três saídas (GA Data API, contador próprio, provedor dedicado) teve preço ou prevalência levantados** | **Rebaixada nesta rodada.** Ela era urgente porque a spec que a levantava era o #1; a spec entregou sem o item e **a tela diz o que cobre** (`home.ts:21`, "Quem acessou o painel e há quanto tempo"), então deixou de ser dívida silenciosa. Decidir quando alguém pedir. Das três, o contador próprio é a única que não arrasta conta nem variável obrigatória para quem não usa |
| 12 | 🆕 **Quem conserta os 20 links mortos nas 10 specs arquivadas, e sob qual mandato?** A auditoria varreu as duas direções e mediu: 20 ocorrências em 10 das 15 specs de `docs/features/*/spec.md`, quase todas apontando para `research/*.md` a partir de uma pasta de onde o caminho certo é `../../../specs/research/`. **A auditoria não corrigiu, e não por esquecimento:** a `/spec-audit` limita a escrita a `specs/` mais o arquivamento, e a §4.1 só manda varrer quem aponta *para* a spec movida | **Emendar a `/spec-audit` §4.1 com um passo de varredura de saída, antes do `git mv`.** É a correção estrutural: as duas últimas specs arquivadas saíram limpas justamente porque alguém fez isso à mão. Os 20 antigos viram **tarefa direta de esforço P** (`sed` em 10 arquivos), não spec. Saída pela §5.1: vira linha de política na skill + achado com arquivo e linha, que está listado em [Achados](#-achados-novos) |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-23 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |
| [`admin-billing-insights`](admin-billing-insights.md) | `billing-subscription`, `dashboard-home` | ⛔ **bloqueada** — `billing-subscription` está em 0/6; ✅ `dashboard-home` fechou |

> **Uma spec bloqueada em oito, e a mesma de sempre.** A distinção `◐` continua valendo e continua sem ser
> necessária: `admin-analytics-dashboard` mergeou **antes** da auditoria, então a transição foi direta pela
> terceira rodada seguida. Ela existe para o caso contrário, que já aconteceu com `dashboard-home`: uma
> dependência cujo código está no disco mas não em `main` deixa quem depender dela ramificando de uma base
> que não a contém.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
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
| `account-settings` | 2026-09-15 | [`docs/features/account-settings/spec.md`](../docs/features/account-settings/spec.md) — 6/6 do corte (PR #12, `a4df5ed`). ⚠️ O caminho feliz do **avatar** segue não verificado contra infra real. Entregou também, fora do corte, o item 1 e metade do item 3 de `account-security-mfa` |
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`). Entregou também, fora do corte, o `testTimeout` nas 9 configs de Vitest de então |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`). ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`). ⚠️ O índice composto novo **precisa ser publicado** |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`). ⚠️ **Três desvios registrados**; o índice composto de `auditEvent` **precisa ser publicado** |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`). ⚠️ **Três desvios registrados**; **três índices compostos** precisam ser publicados |
| `session-refresh` | 2026-09-17 | [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md) — 6/6 do corte (PR #20, `cc93229`). ⚠️ **Três derivas registradas**; a **revogação ponta a ponta segue 🔒 não verificada** |
| `user-activity-tracking` | 2026-09-19 | [`docs/features/user-activity-tracking/spec.md`](../docs/features/user-activity-tracking/spec.md) — **5/6 do corte** (PR #21, `e656331`). ⚠️ **Item 4 parcial** — a obrigação foi transferida para `data-rights-lgpd`, que é o **#1 desta rodada**, então o item tem prazo pela primeira vez. **Três derivas registradas** |
| `admin-analytics-dashboard` | 2026-09-23 | [`docs/features/admin-analytics-dashboard/spec.md`](../docs/features/admin-analytics-dashboard/spec.md) — **5/5 do corte** (PR #22, `03498ae`), conferidos um a um. **Três derivas registradas**, a principal sendo o gráfico entregue como histograma de recência em vez de série temporal. Sétimo índice composto entra na fila de publicação (§1.7) |

**Verificado nesta rodada:** `docs/features/` tem **18** pastas e **15** `spec.md` arquivados. As três
pastas sem `spec.md` são `observability-logging` (spec continua em `specs/`, por decisão desta auditoria —
não houve `git mv` e não há duplicata), `auth-panel-context` e `impersonation-read-only`. Não houve colisão
de arquivamento: `docs/features/admin-analytics-dashboard/spec.md` não existia, e o `STATE.md` daquela
pasta já trazia `spec: admin-analytics-dashboard` (`:5`), então o arquivamento não precisou tocá-lo.

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
na tabela, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #22 entregou **além** do corte

1. **Consertou o teste instável que derrubou o CI da PR #21** — e esse foi o **primeiro commit** da PR, com
   a causa escrita na mensagem. `base.repository.ts:151-155` passa a criar um `const createdAt` único e a
   usá-lo nos dois campos; a regra está em `:148-150`. É a **primeira vez que uma entrega fecha um achado
   catalogado neste backlog**, depois de três rodadas registrando o contrário.
2. **Um teste que exige a declaração do índice** (`apps/api/__tests__/firestoreIndexes.test.ts`, 6 casos).
   Ele não prova publicação, mas prova declaração — é o primeiro gate do repositório sobre a fila de
   índices, cujo sintoma até aqui só aparecia em produção.
3. **O `recharts` sai do caminho crítico.** `UserActivitySection.tsx:22-28` carrega o gráfico por
   `next/dynamic` com `ssr: false` e esqueleto, para que os cartões pintem sem esperar uma biblioteca que
   não faz tree-shaking. A home do admin é a primeira tela que um administrador abre.
4. **O balde "nunca" é subtração protegida, não consulta.** Um perfil sem `lastAccessAt` não entra em
   índice nenhum, então ele é o resto do total (`user.repository.ts:125`), com `Math.max(0, …)` porque as
   cinco contagens não são transacionais. O motivo está em `:123-124`.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 1434 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-23 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/SECURITY.md:13-16` (guards) | **22** arquivos de rota, **11** com guard e **11** com handler nu | **23** arquivos, **12** com guard, **11** nu. A PR #22 acrescentou `users/activity-summary/route.ts`, que tem guard | 🟡 **novo nesta rodada.** O documento estava honesto em duas rodadas seguidas e a entrega o invalidou. O número de rotas **sem** guard não mudou, que é o número que importa para risco |
| `docs/PRE-PRODUCTION.md:436-439` (gate) | `pnpm check` em **607 arquivos**, suíte de **1325 testes em 134 arquivos**, gate em **30,6 s** | **624 arquivos**, **1434 testes em 145 arquivos**, **1 min 16,6 s** | 🟡 **sétimo ciclo com estes números defasados**, e agora por duas entregas de distância. A auditoria só escreve em `specs/`. O mecanismo é sempre o mesmo: medidos corretamente, invalidados pela entrega seguinte |
| `docs/SECURITY.md` | descreve a superfície de autenticação, incluindo a tabela de rotas sem guard e o rate limit sobre 8 caminhos | **segue sem mencionar `POST /api/auth/session/refresh`**, criado pela PR #20 nos dois front-ends. `grep "session/refresh"` devolve **0**, remedido hoje | 🟡 **terceira rodada aberto** |
| `docs/PRE-PRODUCTION.md` (env) | lista as variáveis que um fork precisa definir | **`SESSION_ABSOLUTE_MAX_AGE_DAYS` continua não aparecendo** (`grep` devolve 0). Ela está nos dois `.env.example` e governa por quanto tempo uma sessão pode ser renovada | 🟡 **terceira rodada aberto** |
| `docs/PRE-PRODUCTION.md` §1.7 (índice novo) | um índice de `user` (`deletedAt` + `lastAccessAt`) pendente, com o efeito da ausência descrito e o comando de publicação | **confere frase a frase.** O índice está em `firestore.indexes.json` e o teste que o exige existe. A seção diz também que o emulador serve a consulta com ou sem índice | ✅ **honesto na estreia**, e explica a degradação parcial: só o bloco de atividade cai, porque é rota separada |
| `docs/PRE-PRODUCTION.md:481-515` (o campo `lastAccessAt`) | finalidade, retenção, precisão de 15 min e o custo de escrita medido | **confere**, e a seção segue declarando o que ainda não é verdade sobre a exclusão | ✅ **honesto pela segunda rodada** |
| `docs/SECURITY.md:138-140` (rate limit) | roda sobre lista fechada de **8 caminhos**, casados por igualdade exata, e as **3** rotas de `/account` estão fora | **confere.** `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:42-51`) tem exatamente os 8 listados | ✅ **honesto** pela oitava rodada |
| `docs/SECURITY.md:155` (higiene do `.env.example`) | sem Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks nem BaseHub | **confere.** `grep` pelas sete devolve zero | ✅ **honesto** |
| `docs/PAYMENTS.md` (estado geral) | não há fluxo de assinatura; os stubs estão com `TODO` em `route.ts:13,23`; não existem `UserDTO.subscription`, `stripeCustomerId` nem rotas de `payments/` | **confere nas âncoras e nos `grep`** | ✅ **honesto** pela décima rodada — o único documento com esse histórico |
| `docs/PRE-PRODUCTION.md` §1.1–§1.7 (índices) | sete índices compostos pendentes de publicação | **confere:** `firestore.indexes.json` declara exatamente **7** (`entity` ×3, `user` ×3, `auditEvent` ×1) | ✅ **honesto**, e a previsão da rodada passada se confirmou: `admin-analytics-dashboard` acrescentou o sétimo |
| `docs/PRE-PRODUCTION.md` (branch protection) | `protection` → 404, `rulesets` → `[]` | **confere, remedido hoje** via `gh api` | ✅ **honesto** |

> **Nota de método, décima terceira rodada consecutiva.** A lição da rodada passada era sobre o índice que
> mentia sobre a spec que indexa; nesta, o índice conferiu. O que apareceu foi mais banal e mais crônico:
> **duas das três contradições abertas são o mesmo documento envelhecendo pela entrega seguinte**, e as
> duas moram em arquivos que a auditoria não pode editar. Enquanto a atualização de `docs/SECURITY.md` e
> `docs/PRE-PRODUCTION.md` depender de alguém lembrar, ela vai continuar acumulando. O conserto barato
> seria o `/review` recontar essas duas tabelas quando o diff toca `apps/api/app/(routes)/` ou acrescenta
> arquivo de teste.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **3 das 8** specs que seguem em `specs/`, e **três derivas de
implementação** na spec entregue. É o menor número desde a semeadura, e a razão é simples: a PR #22 tocou
45 arquivos, mas quase todos no eixo da própria entrega. Intactas: `account-security-mfa`,
`billing-subscription`, `onboarding-flow`, `observability-logging` e `teams-organizations`.

### Deriva de implementação — `admin-analytics-dashboard`

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "Gráfico de acesso dos usuários **ao longo de um período**", com recomendação de granularidade semanal ao longo de 12 semanas | Histograma de **recência** em cinco faixas: 0-7d, 8-30d, 31-90d, +90d e "nunca" (`activity-windows.ts:34-48`, `UserRecencyChart.tsx:40-46`) | **A spec estava errada, e o erro é de modelo de dados.** `lastAccessAt` guarda **um** instante por perfil, o último. Série temporal de acessos não sai desse campo: exigiria uma coleção de eventos, que `user-activity-tracking` descartou de propósito. O histograma é a pergunta que o dado responde, e com cinco agregações em vez de doze |
| "Provável índice composto novo" | Um índice (`user`: `deletedAt` + `lastAccessAt`) **e um teste que exige a declaração** (`firestoreIndexes.test.ts`, 6 casos) | **A implementação foi além, e resolveu um problema que a spec só descrevia.** O risco escrito era que o emulador serve consulta indexada ou não, então nenhum gate local pega índice faltando. O teste não prova publicação, mas prova declaração |
| `contends_on` declarava `apps/api/app/(routes)/users/summary/route.ts` | O arquivo **não foi tocado**; a entrega criou `users/activity-summary/route.ts`, seguindo a recomendação da própria spec | **Erro de previsão por excesso, o primeiro registrado.** As três rodadas anteriores erraram por falta. Nos quatro casos a causa é a mesma: o campo foi preenchido listando arquivos lembrados, não a camada |

### Âncoras deslocadas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`data-rights-lgpd`](data-rights-lgpd.md) | `base.repository.ts:205-207` (`delete()`) | **`:209-211`** | +4 linhas no `create()` (PR #22) |
| [`data-rights-lgpd`](data-rights-lgpd.md) | **22** `route.ts` em 8 grupos | **23** em 8 grupos | `users/activity-summary` (PR #22) |
| [`admin-billing-insights`](admin-billing-insights.md) | `AdminHomeClient.tsx:33-55` (arranjo de cartões) | **`:34-56`** | +2 linhas de import e montagem da seção nova |
| [`admin-billing-insights`](admin-billing-insights.md) | `queryKeys.ts:11-46` | **`:11-48`** | +2 linhas da chave `activitySummary` |
| [`admin-billing-insights`](admin-billing-insights.md) | `category-bar-chart.tsx:25-72` | **`:25-77`** | +5 linhas do `interval={0}` no eixo |
| [`e2e-testing`](e2e-testing.md) | 1378 testes em 137 arquivos, `HEAD` em `e656331` | **1434 em 145** | PR #22 |

Corrigidas as três specs no disco (**seis âncoras** ao todo). **Todas as seis são deslocamento por
entrega** — nenhuma nasceu errada. Isso inverte de novo a leitura: a rodada passada registrou que o modo
dominante era âncora que nunca esteve certa (8 de 12), e desta vez foi 0 de 6. Com amostras desse tamanho,
as duas leituras dizem mais sobre quem recontou do que sobre o repositório.

### Contagens e afirmações de estado erradas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`e2e-testing`](e2e-testing.md) | o CI fechou vermelho por teste instável, e isso é argumento vivo para a spec | **consertado pela PR #22** (`base.repository.ts:151-155`) | ⚠️ **A spec perdeu o argumento mais concreto que tinha, três dias depois de ganhá-lo.** Reescrita no disco: sobra a ausência do mecanismo de detecção, sem caso em aberto. Ganhou em troca um argumento menor e novo, o `@repo/design-system` sem task de teste |
| [`account-security-mfa`](account-security-mfa.md) | **10 declarações** de `MIN_PASSWORD_LENGTH` | **25 ocorrências** no repositório | ⚠️ **Números diferentes medindo coisas diferentes, e a spec não diz qual.** "Declaração" e "ocorrência" não são a mesma conta; a spec fala em declarações e a auditoria só conseguiu recontar ocorrências. **Não corrigi o número** — corrigir exigiria decidir o que se está contando, e isso é trabalho de reescopo, que é a [decisão nº 5](#precisam-de-decisão) |
| [`observability-logging`](observability-logging.md) | **16 chamadas `console.*` em 10 arquivos**, das quais 2 são sinks; **7** em `packages/auth/server.ts` | **confere**, recontado hoje: 18 em 12 arquivos no total, 2 deles sinks (`log.ts`, `requestErrorReporter.ts`), e 7 em `server.ts` | ✅ **a spec está certa.** A diferença entre 16/10 e 18/12 é de recorte, não de fato: a contagem dela exclui os dois sinks do numerador e do denominador |

### O que a auditoria **não** encontrou

Nenhuma spec `done` regrediu. Nenhuma feature em `docs/features/*/STATE.md` está sem `spec:` quando
deveria ter. Nenhuma entrega parcial órfã nova — a de `account-security-mfa`, registrada na rodada
passada, continua sendo a única, e continua sem feature ativa.

## Achados — correções pontuais, não specs

Coisas que não merecem spec própria (não são funcionalidade, não têm corte de MVP), mas que são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-23 (pós-PR #22).** Os achados da rodada anterior foram reconferidos contra o
> código, um a um, com as âncoras abertas no disco. **Placar: 1 fechado · 2 novos · o resto intacto e
> confirmado.** É o primeiro fechamento em quatro rodadas.

### ✅ Fechados nesta rodada

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🔴 **O teste instável que derrubou o CI da PR #21** | `apps/api/__tests__/baseRepository.test.ts:477` · `base.repository.ts:150-151` | Primeiro commit da PR #22. O `create()` passou a usar um `const createdAt` único nos dois campos (`:151-155`), com o motivo escrito em `:148-150`. A asserção do teste não mudou e agora vale sempre. CI da branch `success` (`gh run 35544220556`), CI de merge `success` (`gh run 35544765975`). **Consequência: a [decisão nº 4](#precisam-de-decisão) perdeu o pré-requisito** que tinha ganhado |

### 🆕 Achados novos

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`@repo/design-system` não tem task de teste, e um teste já nasceu no workspace errado por causa disso** | `packages/design-system/package.json` (só `clean` e `typecheck`) · `packages/internationalization/__tests__/chartAxisLabels.test.ts` | A PR #22 precisou fixar um limite de largura de rótulo do `CategoryBarChart` e não tinha onde pôr o teste. Ele acabou no pacote de tradução, lendo o dicionário da home do admin e recusando rótulo com mais de 7 caracteres, com a aritmética de 375 px e fonte de 12 px escrita no comentário. O teste roda e protege a tela, mas afirma algo sobre um componente que **não importa**, num pacote que não é o dele. O pacote de UI compartilhada é o que mais se beneficiaria de teste de componente e é o único sem infraestrutura para tê-lo. Cruza com [`e2e-testing`](e2e-testing.md) |
| 🟡 **A correção dos links mortos das specs arquivadas não tem dono, e a skill é a causa** | `.claude/skills/spec-audit/SKILL.md` §4.1 passo 8 · 20 ocorrências em `docs/features/*/spec.md` | O passo manda varrer quem aponta **para** a spec movida (`grep "](<id>.md)" specs/ docs/`) e não manda varrer o que a spec movida aponta. A auditoria também não pode consertar os antigos: os `Limites` da skill restringem a escrita a `specs/` mais o arquivamento. Resultado: as duas últimas specs arquivadas saíram limpas porque alguém corrigiu à mão antes do `git mv`, e as 10 anteriores seguem quebradas. É a [decisão nº 12](#precisam-de-decisão) |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Reconferido hoje, literal. Não explode **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#3) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` **não tem `exports`** (`grep` devolve 0) |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o primeiro import do `apps/api/proxy.ts:1` — o middleware, que roda em toda requisição | `packages/security/index.ts:11` | Reconferido, âncora exata. `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:20-24`) e **não há `process.exit` em nenhum lugar do arquivo** (`grep` devolve 0, reconferido) | `apps/api/instrumentation.ts:20-24` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. ✅ Mitigação parcial: `/health/ready` consulta o Firestore, então um health check apontado para ele detecta parte dessas falhas. Não detecta esta em específico |
| ⚠️ **As 3 rotas de `/account` não estão no rate limit** — incluindo troca de senha, alvo clássico de força bruta | `apps/api/proxy.ts:42-51` | Casamento exato (`includes`), decisão consciente para não limitar `/auth/sign-in/google` duas vezes. Reconferido: a lista tem exatamente 8 entradas. A PR #22 acrescentou uma rota à `apps/api` e **não** a pôs na lista, o que está correto — é rota de leitura sob guard |
| ⚠️ **A superfície não-guardada da API: 11 de 23** arquivos de rota exportam handler nu, sendo 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado hoje: 23 arquivos, 12 com guard. **O numerador não mudou** — a rota nova nasceu com guard. As 8 de `/auth/*` são legítimas (superfície anterior à sessão), mas duas delas não seguem o contrato de erro do repo |
| 🟡 **Nasceu um segundo endpoint que grava cookie de sessão, e nenhum documento o registra** — **terceira rodada** | `packages/auth/session-routes.ts:87` · `apps/app/app/api/auth/session/refresh/route.ts` · `apps/web/app/api/auth/session/refresh/route.ts` | `POST /api/auth/session/refresh` é protegido só por `isSameOriginRequest` (`session.ts:78`), que devolve `true` quando não há header `Origin` (reconferido no código). O rate limit roda no proxy da `apps/api` sobre lista fechada, e estas rotas vivem nos front-ends: estão fora dele. `grep "session/refresh" docs/SECURITY.md` devolve **0** |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| ◐ **Dependência importada sem ser declarada — uma metade fechada, duas abertas.** ✅ `apps/app/package.json` passou a declarar `@repo/analytics` (PR #16). 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` e `apps/app/package.json` **não declara** `@repo/email`. 🟡 `apps/web` importa `@repo/auth` em **8 arquivos** e `apps/web/package.json` **não declara `@repo/auth`** | `apps/app/package.json` · `apps/web/package.json` | Reconferido hoje, os dois `grep` devolvem 0. Funciona por hoisting do pnpm. Além do risco de resolução, **o turbo não invalida `web#*` quando `@repo/auth` muda** — cache mentindo num gate que roda em toda PR |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` **não existe** no disco. Zero importadores, falha em silêncio. **Décima oitava auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` de todo o resto | `packages/auth/package.json:25` | Reconferido, inalterado. É o único workspace fora da major. Dívida, não urgência — mas continua sendo um pacote de autenticação resolvendo uma major diferente do runtime |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: `grep` por `"main"`/`"exports"` devolve **0**. `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 **`input-otp.tsx` é código morto**, com 3 arquivos citando e nenhum de produto | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: os únicos arquivos são ele mesmo, o barril (`index.ts`) e uma **string literal** numa lista do `playground`. `account-security-mfa` (#4) é a spec que o usaria. **É o último componente morto do design-system.** ⚠️ Ao medir, use `grep -w`: `TOTP` casa dentro de `InpuTOTP` |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` seguem instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: **0** arquivos os importam. As PRs #15 a #22 passaram sem tocá-las |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-11` | Reconferido: falta o subpath `"./utils/*"` (consumidor externo não alcança `utils/cookies.ts`), e o `"."` (`:6`) aponta para `index.ts`, **que não existe** no disco |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Reconferido: 1 ocorrência em todo o repo. Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | Reconferido: 4 referências, todas em `__tests__/rateLimit.test.ts`. O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O campo vizinho `requestId`, nascido na mesma entrega, **foi ligado até a tela**. ⚠️ Há um `retryAfterSeconds` **homônimo de outro tipo** em `apps/api/proxy.ts:102`, esse sim usado |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — décimo segundo ciclo | `packages/auth/client.ts:224` | A única cobertura é `apps/app/__tests__/useEmailVerification.test.tsx`, que a **mocka** |
| 🟡 **`packages/shared` é o único pacote com `test` e sem `typecheck`** | `packages/shared/package.json` | Reconferido: `grep typecheck` devolve vazio. 🆕 O espelho disso apareceu nesta rodada: `@repo/design-system` tem `typecheck` e **não tem `test`** |
| 🟡 **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | Reconferido: 4 ocorrências, **3 em teste** e 1 que é a própria definição |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `delete()` herdado por todo repositório é **soft delete** — chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:209-211` | Reconferido, âncora **atualizada** (era `:205-207`). O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd`, que é o **#1 desta rodada** — então este achado tem prazo pela primeira vez. **`AuditEventRepository` é o único repositório a recusar o herdado** (`audit-event.repository.ts:100-106`) |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:55` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth, e descarta linhas em silêncio (`:65`). O N+1 do Admin SDK continua lá. ⚠️ **A PR #22 tocou este arquivo e não consertou** — âncora deslocada de `:44` para `:55`, sexta rodada aberto |
| 🟡 **`userRepository` tem agora três métodos com semântica de contagem própria** | `user.repository.ts:48` · `:55` · `:74` · `:92` | 🆕 **Virou quatro nesta rodada.** `touchLastAccess` escreve sem mover `updatedAt`, `list` faz merge com o Auth e descarta linhas, `summary` conta sem ler, e `activitySummary` conta por faixa e **deriva o balde "nunca" por subtração**. Cada um está certo isoladamente e documentado; juntos, são quatro respostas para "quantos usuários existem". O efeito visível permanece: **o cartão de total pode mostrar mais do que a tabela lista**, e nada na tela explica isso |
| 🟡 **O predicado de posse foi copiado, não reusado, na agregação de entidades** | `apps/api/(shared)/repositories/entity.repository.ts:33` · `entities/summary/route.ts:9` | Reconferido: `where("userId", "==", userId)` aparece em `:23` (`listByUserId`) e `:33` (`summaryByUserId`). É a evidência mais limpa do argumento de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Reconferido: `grep -c try` em `sign-in/route.ts` devolve **0**, e `:12` responde `{ error: "User not found" }`, string crua. Viola a regra de ouro 3. A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:67` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | Reconferido nas três âncoras. A assinatura **é** validada (`:45`); nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#3) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:46` | Reconferido. `pnpm --filter api dev:with-stripe` **não pode funcionar**. Duas das três chaves afetadas já foram resgatadas por redeclaração (`:22`, `:29`), **com comentário nomeando esta armadilha** — esta ficou de fora |
| ◐ **`skipValidation` na `apps/web` é incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` | `apps/web/env.ts:27,13-19` | Reconferido, literal. O CTA "Ir para o painel" da landing cai no fallback. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189-202` | Reconferido: a isenção é `!isOobActionPath(appPath)` e o `redirectUrl.search = ""` segue lá. **Qualquer outra query em rota pública continua sendo apagada.** ⚠️ `onboarding-flow` (#2) declara este arquivo em `contends_on` e será a terceira feature a contorná-lo |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts` | Reconferido nas âncoras da `apps/app`, literais. O idioma escolhido **não sobrevive ao fechamento do navegador** |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** por padrão; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:28,30` · `packages/auth/session.ts:78-81` | Reconferido: `"SameSite=Lax"` é fixo e `Secure` só entra se `options?.secure`. ASVS 5.0 L1 (3.3.1) exige `Secure`. **Sétima rodada aberto** |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras. Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | Reconferido, literal. **Sobreviveu às PRs #11 a #22.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` |
| 🟡 **O `DateInput` compartilhado formata data e calendário sempre em inglês** | `packages/design-system/components/ui/date-input.tsx:83` | `format(selected, "PPP")` do `date-fns` sem a opção `locale`. Reconferido. ⚠️ A PR #21 resolveu o mesmo problema em outro lugar (`formatDisplayDateTime.ts:24`, com `Intl.DateTimeFormat`) e não trouxe a solução para o componente compartilhado. **A PR #22 mexeu no design-system** (`category-bar-chart.tsx`) e passou ao lado de novo |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`, nos **dois** apps) e `"Início"` no breadcrumb | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` | Reconferido: `"Switch language"` em **2** arquivos, literal. Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe. O `PageBreadcrumb` ainda crava `href="/painel"` em `:28` |
| 🟡 **A mensagem de erro padrão do repo inteiro está cravada em pt-br dentro de um pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal: `"Um erro inesperado aconteceu"` é o retorno de **todo** erro que não é `FormattedError` — em espanhol e em inglês também |
| 🟡 **`apps/web/…/sign-in/validations/signInSchema.ts:9` crava a mensagem de validação em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | Reconferido, literal (`"A senha deve ter pelo menos 6 caracteres"`) |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | Reconferido: o `select` é alimentado por `useListUsers()`, que só lista quem existe. O evento de exclusão **foi projetado para sobreviver ao usuário**, e é justamente ele que o filtro não consegue selecionar |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | `catch { return null; }` sem `logEvent`, reconferido. Numa investigação, "evento sem rótulo" e "Firebase Auth fora do ar" ficam indistinguíveis |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Reconferido, literal. Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:29` | Reconferido: `setTimeout` em `:29` e nenhum `clearTimeout` no arquivo. Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem. É a home da landing |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: o arquivo tem um único `export`, o do hook. O `apps/app/CLAUDE.md` exige que exporte também a função imperativa. Segue o único fora da regra |
| 🟡 **`provider-error` não distingue as falhas do provedor** — cota estourada, domínio não verificado e chave revogada produzem o mesmo `reason` | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado**. A assimetria segue: `@repo/email` manteve o próprio `logEmail` em vez do `logEvent` compartilhado |
| 🟡 **O rodapé da `apps/web` consome `data-cookie-banner` sem teste que fixe o acoplamento** | `apps/web/app/[locale]/components/footer.tsx:56` | Reconferido, seletor literal. O lado da `apps/app` tem teste; o da `web` não, porque a suíte dela roda em `environment: "node"`, sem jsdom |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Reconferido: a linha é `pnpm turbo run lint typecheck test`, sem `--continue`. Comportamento correto, mas quem ler o log de uma PR vermelha verá tasks "não rodadas" e pode se confundir sobre a causa |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito.

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | 🔴 **Os três índices compostos dos resumos da home precisam ser publicados.** Sem eles, `GET /entities/summary` e `GET /users/summary` respondem 503 `SUMMARY_INDEX_MISSING` | `PRE-PRODUCTION.md` §1.5 | ~5 min + construção |
| 2 | 🆕 🔴 **O índice das faixas de recência precisa ser publicado.** `user`: `deletedAt` + `lastAccessAt`. Sem ele, `GET /users/activity-summary` responde 503 e o bloco de atividade da home do admin mostra o alerta traduzido; os três cartões de contagem continuam funcionando, porque é rota separada | `PRE-PRODUCTION.md` §1.7 | ~5 min + construção |
| 3 | 🔴 **O índice da busca de perfil por `reference_id` precisa ser publicado.** É a consulta que todo guard roda para transformar o UID do Firebase Auth no documento de perfil, e é a única dos sete **sem degradação traduzida** | `PRE-PRODUCTION.md` §1.6 | ~5 min + construção |
| 4 | 🔴 **O índice composto da trilha de auditoria precisa ser publicado.** Sem ele, o **filtro por usuário** de `/admin/audit` responde 503 `PAGINATION_INDEX_MISSING` | `PRE-PRODUCTION.md` §1.2 | ~5 min + construção |
| 5 | 🔴 **O índice composto da listagem paginada de `entity` precisa ser publicado.** Sem ele, `GET /entities` responde `PAGINATION_INDEX_MISSING` em produção e a tela fica vazia. ⚠️ **O emulador não cobra índice composto** — mas agora há um gate parcial: `apps/api/__tests__/firestoreIndexes.test.ts` recusa o build se a **declaração** sumir. Publicação continua sem gate. São **sete** índices nessa situação | `PRE-PRODUCTION.md` §1.1 | ~5 min + construção |
| 6 | **A retenção da coleção `auditEvent` não foi decidida.** Os documentos não têm `expiresAt` e nada expurga. É a decisão nº 8 | `PRE-PRODUCTION.md` §1.3 | decisão + ~10 min |
| 7 | ⚠️ **`main` não tem branch protection, e o pré-requisito caiu.** Remedido hoje: `protection` → 404, `rulesets` → `[]`, **22** PRs. A dependência era o teste instável, **consertado pela PR #22**. Não sobra nada técnico entre hoje e ligar | `PRE-PRODUCTION.md` §9 | **minutos** |
| 8 | **Backfill de instantes em base que já tem dado.** Antes da PR #17 o `update()` regravava `createdAt` como string ISO; o Firestore ordena por tipo antes de valor. O script existe e tem dry-run | `PRE-PRODUCTION.md` §1.4 | ~10 min por coleção |
| 9 | **Ninguém vigia a trilha de erro.** O `onRequestError` está plugado nos três apps (`apps/api`, `apps/app`, `apps/web`) e escreve no stdout; nenhum coletor está ligado. `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve **0**, reconferido. É o resíduo de `observability-logging` | `PRE-PRODUCTION.md` §11 | P + conta em provedor |
| 10 | **O health check da plataforma não aponta para `/health/ready`.** A rota existe e responde 503 quando o Firestore não atende em 2 s; enquanto ninguém a configura, a plataforma segue olhando `/health` | `PRE-PRODUCTION.md` §11 | ~2 min |
| 11 | **`SESSION_ABSOLUTE_MAX_AGE_DAYS` não está no checklist** — **terceira rodada**. Governa por quanto tempo uma sessão pode ser renovada; tem padrão de 30 dias e grampo de 90, então nada quebra — mas o fork herda uma política de sessão que nunca leu. **E o teto pode ser ultrapassado por até meia vida de cookie** (decisão nº 7), o que também não está escrito em lugar nenhum que um fork abra | *(só neste arquivo)* | ~5 min (texto) |
| 12 | **`SESSION_COOKIE_DOMAIN` precisa estar definida se `web` e `app` rodarem em subdomínios distintos.** Sem ela o cookie de consentimento fica host-only e o visitante responde ao banner **duas vezes** | `PRE-PRODUCTION.md` §7 | ~2 min |
| 13 | **A política de privacidade linkada pelo banner não menciona cookies.** `grep -ci cookie` em `translations/apps/web/pages/legal/index.ts` devolve **0**, remedido hoje. Ver a decisão nº 9 | `PRE-PRODUCTION.md` §7 | P (texto) |
| 14 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados". Exige plano **Blaze**. ⚠️ **Também trava metade do item 3 de `data-rights-lgpd`, que é o #1 desta rodada** — resolver isto antes do `/analyze` muda o corte que o plano vai propor | `PRE-PRODUCTION.md` | cartão + ~15 min |
| 15 | **A revogação de sessão nunca foi provada ponta a ponta.** O emulador de Auth aceita o cookie depois de `revokeRefreshTokens`, o que atinge o caminho que o proxy usa em toda navegação autenticada. Coberto por teste unitário; a prova exige projeto Firebase real | *(só neste arquivo)* | projeto real + ~15 min |
| 16 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 17 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações | `PRE-PRODUCTION.md` | P |
| 18 | **Contas de QA acumuladas no projeto Firebase de desenvolvimento.** O item existe em `PRE-PRODUCTION.md:547`. ⚠️ **Não recontei nesta rodada** — a contagem exige abrir o console do Firebase, e a auditoria não o fez. O `/test` da PR #22 rodou contra o emulador, como os das #17 a #21, então provavelmente não cresceu | `PRE-PRODUCTION.md` | P |
| 19 | **Branches mergeadas ainda vivas no remoto: 20 além de `main`** (`git ls-remote --heads` devolve 21). As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 20 | **O login com Google nunca teve passe manual com conta real.** O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta | *(só neste arquivo)* | ~2 min |
| 21 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** É negação total, sem nenhum `userId`/`uid`. Depende da pendência 14; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#5) | `PRE-PRODUCTION.md` | ver #14 |
| 22 | **Conferir a retenção de log da plataforma no painel do provedor.** O prazo e a fundamentação já estão escritos; o que falta é ler o número que o provedor pratica | `PRE-PRODUCTION.md` §11 | ~5 min |
| 23 | **O item de reabertura do consentimento no `ProfileDropdown` nunca foi visto num browser.** Coberto por teste jsdom, não por passe visual | *(só neste arquivo)* | ~2 min com emulador de pé |
| 24 | 🆕 **Os 20 links mortos nas 10 specs arquivadas.** Quase todos apontam para `research/*.md` a partir de `docs/features/<slug>/`, de onde o caminho certo é `../../../specs/research/`. `docs/features/session-refresh/spec.md` é o pior caso, com 6. A auditoria mediu e **não pode corrigir** — ver a decisão nº 12 | *(só neste arquivo)* | **~5 min** de `sed` |

> **A fila de índices cresceu de seis para sete, exatamente como previsto.** A regra que sai daqui se
> confirmou pela segunda vez: **a fila cresce com spec que *consulta* de um jeito novo, não com spec que
> muda comportamento.** `user-activity-tracking` mudou comportamento e não acrescentou índice;
> `admin-analytics-dashboard` consultou por intervalo e acrescentou um. ⚠️ **A próxima é previsível pelo
> mesmo critério:** `data-rights-lgpd` (#1) declara `firestore.indexes.json` em `contends_on` porque
> precisa varrer o que expurgar.
>
> 🆕 **E a fila ganhou meia rede de proteção.** `apps/api/__tests__/firestoreIndexes.test.ts` recusa o build
> se a **declaração** de um índice sumir. Não cobre publicação, que continua sendo o passo manual que
> ninguém vê falhar até produção.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | Mantém o argumento das sete rodadas anteriores. A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Depende da decisão nº 2. |
| **Histórico de acessos · IP, user-agent, dispositivo e geolocalização · presença em tempo real** | — | Explicitamente fora do corte de [`user-activity-tracking`](../docs/features/user-activity-tracking/spec.md), arquivada. Acrescentar IP mudaria a natureza jurídica do dado — vira "registro de acesso" no sentido do Marco Civil art. 5º, VIII. |
| **Série temporal de acessos na home do admin** | — | 🆕 **Reavaliado nesta rodada, com motivo novo e mais forte.** A spec de `admin-analytics-dashboard` pedia "gráfico ao longo de um período" e a entrega deu histograma de recência, porque `lastAccessAt` guarda **um** instante por perfil: série temporal exigiria uma coleção de eventos, descartada de propósito em `user-activity-tracking`. Reabrir isto é reabrir a coleção de eventos, não o gráfico. |
| **Backfill retroativo do último acesso** | — | Fora do corte da spec arquivada, e por desenho. ✅ **A consequência foi tratada na entrega**: `UserActivitySection.tsx:112-118` mostra quantos perfis ainda não têm registro e diz quando o registro de cada pessoa começa. Deixou de ser risco escondido. |
| **Ordenação da coluna de último acesso pelo servidor** | — | Fora do corte de `user-activity-tracking`: ordenar por esse campo pede índice composto. ⚠️ **O argumento enfraqueceu:** o índice de `user` por `lastAccessAt` agora existe declarado (§1.7), então o custo de reabrir isto caiu. Reavaliar quando a fila drenar. |
| **Tela de sessões e dispositivos ativos, com encerramento individual** | 1/10 | Fora do corte de `session-refresh`, arquivada. Pertence a [`account-security-mfa`](account-security-mfa.md) (#4) — que já tem **metade** disso entregue por tabela, em tudo-ou-nada. |
| **Rotação de refresh token com detecção de reuso** | — | Fora do corte de `session-refresh`. O refresh token é do Firebase: não há onde implementar sem sair do provedor. |
| **"Continuar conectado" no login · autenticação reforçada para operação sensível · aviso de inatividade** | — | Fora do corte de `session-refresh`. A reautenticação para ação sensível já está listada como iteração própria em `account-security-mfa`. |
| **Rate limit próprio para as rotas de sessão** | — | A spec de `session-refresh` levantou isto nos riscos e não pôs no corte. Virou achado: o mecanismo existe (`@repo/security`), só não alcança rotas fora da `apps/api`. |
| **Widgets configuráveis, arrastáveis ou por papel na home** | — | Explicitamente fora do corte de `dashboard-home`, arquivada: complexidade sem retorno num core que cada fork vai reescrever. |
| **Comparação com período anterior, filtro de intervalo na home** | — | Fora do corte de `dashboard-home` **e** do de `admin-analytics-dashboard`, as duas arquivadas. A parte de receita é [`admin-billing-insights`](admin-billing-insights.md). |
| **Exportar as métricas de atividade · segmentação por tipo ou plano · tempo real** | — | 🆕 Explicitamente fora do corte de `admin-analytics-dashboard`, arquivada. Reabrir exige spec nova. |
| **Contador materializado / agregação incremental** | — | Fora do corte de `dashboard-home`, que resolveu contar com a agregação nativa do Firestore. ⚠️ **O custo dessa escolha subiu**: a home do admin faz agora **oito** agregações por carregamento (três do resumo, cinco das faixas). Continua barato; vale medir quando alguma coleção crescer. |
| **Exportar a trilha de auditoria · expurgo automático** | — | Explicitamente fora do corte de `audit-log`, arquivada. As duas dependem de decidir o prazo de retenção, que é a decisão nº 8. |
| **Alerta em tempo real sobre ação sensível** | — | Fora do corte de `audit-log`. Depende de `observability-logging` ter um coletor do outro lado — hoje não tem. |
| **Auditar toda escrita de qualquer recurso** | — | Fora do corte de `audit-log`: começa caro, envelhece mal e gera ruído. |
| **Busca textual no servidor** | — | Explicitamente fora do corte de `cursor-pagination`, arquivada. Ver a decisão nº 10. |
| **Contagem total de registros na listagem** | — | Fora do corte de `cursor-pagination`. **Reavaliar quando alguém pedir:** o `countQuery` (`base.repository.ts:122`) é a peça que faltava, e já tem cinco consumidores novos. |
| **Registro auditável de consentimento** | — | Fora do corte de `cookie-consent`, arquivada. Prova de consentimento é obrigação do controlador e hoje a escolha vive só no navegador do titular. Resta `data-rights-lgpd` (#1) como candidato natural, e ela ainda não o declarou. |
| **CMP certificada de terceiro · TCF do IAB · geolocalização do visitante** | — | Fora do corte de `cookie-consent`. As duas primeiras arrastam serviço pago para todo fork. |
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão; a referência do ecossistema terceiriza num serviço pago com chave obrigatória. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. |
| Firebase App Check | — | Explicitamente fora do corte de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** A action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P. |
| **Migrar a listagem de usuários para o cursor** | — | Fora do corte de `cursor-pagination`. `userRepository.list()` carrega um N+1 do Admin SDK: paginá-la sem resolver isso entregaria uma listagem que faz uma chamada de rede por linha. O N+1 vem primeiro. |
| **Detector de teste instável no CI (repetir a suíte, `--retry`, quarentena)** | — | ⚠️ **Reavaliado nesta rodada e descartado com mais força.** A rodada passada já tinha descartado porque a causa era uma asserção específica com conserto de uma linha. **A PR #22 fez esse conserto**, então o único caso concreto fechou. Reabrir exige um segundo *flake* de causa diferente. |
| **Task de teste no `@repo/design-system`** | — | 🆕 **Não é spec, é achado** — mas é um achado que cruza com [`e2e-testing`](e2e-testing.md) (#5) e provavelmente deveria entrar no corte dela em vez de virar tarefa solta. Ver os [achados novos](#-achados-novos). |
| Provedor de e-mail plugável (SES/Postmark) · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`, arquivada. Reabrir exige spec nova. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, arquivada. O `POST /files` ficou genérico de propósito. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`, arquivada. A exclusão de conta virou [`data-rights-lgpd`](data-rights-lgpd.md) e as sessões viraram [`account-security-mfa`](account-security-mfa.md); a **troca de e-mail** continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, arquivada. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#5). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Explicitamente fora do corte de `observability-logging`. A nota de pesquisa registra o conflito entre Sentry v8+ e `@vercel/otel`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional que manter no core. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. ✅ **O pré-requisito voltou a valer nesta rodada**: o *flake* foi consertado e as duas últimas execuções de CI fecharam verdes. Reavaliar junto com o branch protection. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição, e como opt-in por variável ausente. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **10** configs de Vitest declara cobertura, reconferido: não há número para discutir. Medir primeiro, gatear depois. Cruza com `e2e-testing` (#5). |
| Changesets / versionamento · Storybook | — | Com pacotes `private: true` e forks que divergem, o valor do changelog não paga o processo. O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
