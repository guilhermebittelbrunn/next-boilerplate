# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-16 (`/spec --sync`, pós-merge da PR #17) · anteriores: 2026-09-16 (PR #16) ·
> 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 · 2026-09-14 · 2026-09-11 · 2026-09-10 ·
> 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:** semeadura inicial
> (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`cursor-pagination` foi entregue e arquivada.** Os cinco itens do corte foram reabertos um a um no
>    código; PR #17 mergeada em `main` (`c36e084`), CI `success` no SHA de merge. É a décima spec a sair da
>    fila. A spec vive agora em
>    [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md).
> 2. **Dois achados desta lista foram fechados pela entrega**, não por alguém tê-los pego separadamente: o
>    `update()` que corrompia o tipo de `createdAt` e o `useList*` que renderizava lista vazia quando a
>    requisição falhava. Ver [Achados fechados](#achados-fechados-pela-pr-17).
> 3. **Sete âncoras deslocadas e três contagens erradas**, todas consequência de a PR #17 ter reescrito
>    `base.repository.ts`, `entity.repository.ts` e `entities/route.ts`. Corrigidas no disco.
> 4. **Dois números de `docs/PRE-PRODUCTION.md` envelheceram de novo** — os mesmos que a rodada anterior
>    tinha acabado de corrigir. Remedidos e corrigidos hoje.
> 5. **O #1 é `audit-log`**, que vinha em segundo. A razão pela qual ele perdeu na rodada anterior deixou de
>    existir. Motivo em [Ordem recomendada](#ordem-recomendada).

## Contadores

Sobre as **9 specs que seguem em `specs/`**. Recontados do disco em 2026-09-16, lendo o frontmatter de cada
arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 7 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 10 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 3 · `confianca` 3 · `dx` 2 (+1 `deferred` em `produto`). **Por esforço:**
P 0 · M 6 · G 3. **Por valor:** alto 6 · médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 1** (`cursor-pagination`: `proposed` → `done`, arquivada).

### O caso `cursor-pagination` — o que foi conferido antes de arquivar

PR **#17** mergeada em `main` em 2026-09-17T02:35:23Z (merge commit `c36e084`), com CI `success` nesse SHA
(`gh run list`). Os cinco itens do corte, reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Página lida no Firestore, com ordenação estável e retomada opaca | **implementado** | `base.repository.ts:80-116` — `orderBy("createdAt","desc")` + `orderBy(FieldPath.documentId(),"desc")` (`:84-86`), retomada por snapshot do documento âncora (`:89-98`), uma linha extra para detectar próxima página (`:101-105`) |
| 2. Envelope na API, com teto de tamanho no servidor | **implementado** | `entities/route.ts:30-37` devolve `{ items, nextCursor }`; `pagination.schema.ts:49-52` **grampeia** em `PAGE_SIZE_MAX = 100` em vez de recusar |
| 3. Envelope tipado no SDK e slice `entity` migrado inteiro | **implementado** | `packages/sdk/src/types/pagination/pagination.ts:1-10` · `actions/entity/action.ts:17-30` · `entity.repository.ts:15-26` · `useListEntities.tsx:14-40` · `EntitiesListClient.tsx:152-161` |
| 4. Tabela em modo servidor, sem perder busca e refresh | **implementado** | `table.tsx:22-26` e `:159-171`; `:112-118` troca o texto de lista vazia quando a busca não alcançou as páginas pendentes |
| 5. Índices compostos versionados | **implementado** | `firestore.indexes.json:3-11` (`entity`: `userId` + `deletedAt` + `createdAt desc`), com `isMissingIndexError` degradando a falta de índice para `PAGINATION_INDEX_MISSING` em vez de 500 (`(shared)/lib/pagination.ts:59-77`) |

Os dois códigos de erro novos estão nos três idiomas
(`translations/packages/shared/utils.ts:77-80`, `:154-157`, `:238-241`), e os rótulos da tabela em
`translations/components/ui/table.ts`.

**Duas ressalvas registradas na spec arquivada, nenhuma delas bloqueando o `done`:** a busca por
`searchFields` continua client-side e passa a enxergar só as páginas já carregadas — o corte previa isso e
a tabela avisa o usuário em vez de mentir; e a listagem de usuários **não** foi migrada, por decisão
explícita da spec, então `user.repository.ts:32-43` continua lendo a coleção inteira.

## Gates — medidos nesta auditoria

Executados agora, com `--force`, no workspace `provo`, com o `HEAD` em `c36e084`. Não copiados do `/test`
nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **555 arquivos · 0 erros** (`No fixes applied`, 226 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 31,9 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-16 (PR #16) |
|-----------|---------:|-------:|---------------------------|
| `api` | 38 | 410 | **+3 arquivos · +39** |
| `app` | 43 | 307 | **+2 arquivos · +14** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 6 | 62 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `web` | 5 | 31 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **112** | **1091** | **+5 arquivos · +53 testes** |

A PR #17 não criou workspace novo, então o número de tasks e o de configs de Vitest ficaram onde estavam.
Os cinco arquivos de teste novos são os da paginação: repositório, parser de query, rota de listagem, hook
e botão de carregar mais. O `pnpm check` subiu de 543 para **555** arquivos.

CI: a execução de merge de **#17** (`c36e084`) está em **`success`**. A branch de trabalho desta auditoria é
`provo`, cujo `HEAD` é `c36e084` — nenhum commit do repositório está fora de `main`.

**O gate segue estável.** As **10** configs de Vitest declaram `testTimeout: 20_000`. O pré-requisito do
branch protection continua satisfeito, e o branch protection continua não ligado — remedido hoje:
`gh api repos/:owner/:repo/branches/main/protection` → **404**, `rulesets` → **`[]`**.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
Nenhuma spec está bloqueada por dependência.

> **Um critério ganhou peso e continua valendo: o que uma rodada autônoma consegue provar.** O `/cycle` não
> provisiona infraestrutura, então uma spec cujos critérios de aceite dependem de conta em provedor volta
> com metade dos critérios "não verificados". Isso não a torna menos valiosa — torna-a má escolha para
> **esta** forma de execução, e a distinção precisa estar escrita para não virar preconceito silencioso.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`audit-log`](audit-log.md) | **Sobe ao topo porque o motivo que a segurava caiu.** A rodada anterior a rebaixou por ordem, não por mérito: uma trilha é o arquétipo da coleção que cresce sem teto, e construir a tela dela antes da paginação significaria construir a listagem duas vezes. A PR #17 entregou a paginação, então a segunda construção deixou de existir — `paginate()` e a tabela em modo servidor estão prontos para serem copiados. O argumento moral segue sendo o mais desconfortável do backlog: o painel tem impersonação e **nada registra quem entrou na conta de quem** (o switch é inteiramente client-side, `panelStore.ts:76-90`). São **18 handlers de escrita** e **zero** gravam evento, incluindo `POST /account/sessions/revoke` — hoje não dá para distinguir se quem derrubou as sessões foi o dono ou quem tomou a conta dele. **0 de 5**, com o item 5 (retenção) parcial. Prova-se inteira numa rodada autônoma: Firestore roda no emulador desde a PR #13 e nada aqui depende de conta em provedor. |
| 2 | [`data-rights-lgpd`](data-rights-lgpd.md) | Obrigação legal com prazo, o argumento mais duro do backlog. Segue em 0/5, e a armadilha dos objetos órfãos continua dobrada: `deleteObjectQuietly` tem **2** call sites (`entities/[id]/route.ts:90` e `account/route.ts:158`), ambos de troca, nenhum de expurgo. O `delete()` herdado é **soft delete** (`base.repository.ts:196-198`). Ganhou escopo na rodada anterior, com a chegada do consentimento: a prova de consentimento vive só no navegador do titular e o exportador precisa incluí-la. Esforço **G** é o que a segura fora do topo numa rodada autônoma. |
| 3 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto do backlog e ainda em **0/6**: não existe diretório `payments/` nas rotas, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`) sem dedupe por `event.id`. **Segue atrás por um motivo de execução, não de mérito:** provar checkout, portal e webhook exige chaves reais da Stripe, e uma rodada autônoma devolveria os critérios como "não verificados". **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 4 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze`.** O item 2 do corte continua oco desde que a PR #12 passou a coletar nome e idioma na área de conta; e a spec atribuía o gancho pós-cadastro ao lugar errado — ele está no `onSuccess` da mutation (`SignUpFormClient.tsx:114`), não no caminho de redirect que o onboarding precisaria interceptar. Reconferida nesta rodada: **zero deriva**, âncoras e contagens todas exatas pela segunda rodada seguida. O trabalho é maior do que a spec descreve, e a spec diz isso. |
| 5 | [`e2e-testing`](e2e-testing.md) | Destravada, e sem o argumento mais forte que tinha — o gate instável foi corrigido pela PR #13 e não voltou. O que resta é sólido e mais lento de cobrar: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, nenhuma das **10** configs medindo cobertura, e **duas rules files sem um único teste de regra** (`firestore.rules` publicado em deny-all, `storage.rules` nem publicado) — sem desculpa, porque o emulador existe. 🆕 **Ganhou um argumento com a PR #17**: o emulador do Firestore **não cobra índice composto**, então o gate atual prova ordenação e cursor sem provar que a entrada de índice existe. Esforço **G** e `value: médio`. |
| 6 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são **11 linhas** e o literal `"Home"` (`page.tsx:7`, nos dois painéis) — com a chave de dicionário pronta ao lado, já usada em 5 breadcrumbs. É a primeira tela de todo fork, e resgataria o `chart.tsx` (a dependência `recharts` pesa no bundle e nunca renderizou nada). Reconferida nesta rodada: âncoras exatas, incluindo o inventário de 19 rotas. |
| 7 | [`account-security-mfa`](account-security-mfa.md) | Cresceu duas auditorias atrás e não encolheu. O item 4 (política de senha) era descrito como mudança em 5 schemas de formulário; são **10 declarações**, e as 3 que importam estão em `apps/api` — mudança de contrato, não de formulário. Restam MFA (**3/10** de prevalência entre os starters pesquisados) e visibilidade de sessões (**1/10**). `value: médio` por mérito próprio, e esforço provavelmente acima de M. |
| 8 | [`observability-logging`](observability-logging.md) | `in-progress`. Entregue em 5 dos 6 itens; o resíduo é adotar um coletor de erro, que depende de decisão de produto e de conta em provedor. **Fora do conjunto elegível** — ver [Precisam de decisão](#precisam-de-decisão). Terceira rodada consecutiva sem resposta. |
| 9 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora pela quinta rodada. A PR #17 mexeu em três dos 11 sítios de posse e **os moveu sem consolidá-los**. Ver [Precisam de decisão](#precisam-de-decisão). |

### O que **não** foi escolhido para #1, e por quê

- **`data-rights-lgpd` foi a segunda colocada, e perdeu por esforço, não por valor.** É a única spec do
  backlog com prazo imposto de fora, e o argumento dela só piora com o tempo: cada recurso novo que aceita
  upload acrescenta uma família de objeto a expurgar. O que a tira do topo **nesta** forma de execução é o
  esforço **G** somado ao escopo que ela ganhou na rodada anterior (o registro de consentimento). Uma
  rodada autônoma que ataque uma spec G tende a entregar metade e deixar a outra metade mal costurada —
  que é pior do que não começar. Se a execução deixar de ser autônoma, ela é a candidata natural ao topo.
- **`billing-subscription`** tem o maior valor bruto e não foi escolhida pela mesma razão de sempre, que
  merece ficar explícita: verificar checkout, portal e webhook exige chaves reais da Stripe. Seria entregar
  código que ninguém consegue provar hoje.
- **`onboarding-flow` e `account-security-mfa`** estão as duas com o corte desatualizado em relação ao
  código. Reescopar antes de planejar: planejar sobre um corte errado custa mais caro que reescrever a spec.
- **`e2e-testing`** ganhou um argumento real nesta rodada (o emulador não cobra índice composto, então o
  gate tem um ponto cego que a PR #17 acabou de estrear) e mesmo assim fica em quinto: é esforço **G** e
  `value: médio`, e o ponto cego específico já tem uma mitigação barata no lugar
  (`apps/api/__tests__/firestoreIndexes.test.ts` lê o arquivo versionado).

## Lotes paralelos

Para rodar o ciclo completo em 2–4 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-16** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis nesta rodada: 7 de 9.** Fora ficam `teams-organizations` (`deferred`) e
`observability-logging` (`in-progress`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `audit-log` · `onboarding-flow` · `e2e-testing` | `base.repository.ts` + `users/[id]` + índices + barril do SDK + `queryKeys.ts` · `apps/app/proxy.ts` + resolvedor pós-login + `user-merge.ts` + `UserDTO` · `package.json` da raiz + `turbo.json` + `ci.yml` | **escrita de trilha na API**, **desvio de navegação no app** e **ferramental da raiz**. As duas primeiras encostam no `user` por caminhos distintos (`users/[id]/route.ts` × `user-merge.ts`), e a terceira não toca em `apps/` nem em `packages/` |
| **2** | `billing-subscription` · `data-rights-lgpd` | webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` · `base.repository.ts` + `packages/auth/server.ts` + índices | **slice `user` cobrado** e **expurgo do titular**. Uma mexe no repositório de usuário e no contrato do SDK; a outra, no repositório base e na camada de sessão |
| **3** | `dashboard-home` · `account-security-mfa` | as duas `page.tsx` de home + `queryKeys.ts` + índices · `packages/auth/*` + `resolve-api-actor.ts` | **tela inicial** e **camada de sessão**, sem nenhum arquivo em comum |

### Por que cada spec ficou de fora do lote 1

Distinguir os dois motivos importa: colisão é **dado**, teto é **decisão**.

- **`billing-subscription` colide com `audit-log`** em `packages/sdk/src/client/index.ts`: as duas precisam
  registrar uma action nova no barril do cliente.
- **`data-rights-lgpd` colide com `audit-log` duas vezes:** as duas alteram
  `apps/api/(shared)/repositories/base.repository.ts` **e** `firestore.indexes.json`.
- **`dashboard-home` colide com `audit-log`** em `apps/app/shared/lib/queryKeys.ts` **e** em
  `firestore.indexes.json`. Continua sendo a spec mais "presa" do conjunto elegível, apesar de
  `depends_on: []`.
- **`account-security-mfa` não colide com nada do lote 1.** Ficou de fora **só pelo teto de 3**, que é
  escolha de custo de revisão e não impedimento técnico. Se você tiver fôlego para revisar quatro features
  amanhã, é ela que entra.

O lote 2 parou em **duas** specs por colisão, não pelo teto: acrescentar `dashboard-home` bateria em
`firestore.indexes.json` com `data-rights-lgpd`, e `account-security-mfa` bateria em
`packages/auth/server.ts` com a mesma.

**O arquivo mais disputado do repositório continua sendo `firestore.indexes.json`**, citado por **4** das 9
specs (era 5 de 10 — a saída de `cursor-pagination` tirou uma). Em seguida, com 3:
`packages/sdk/src/client/index.ts`. O `base.repository.ts` caiu de 3 para **2**.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou.

A régua desta rodada, com `cursor-pagination` como amostra: ela declarava **5** arquivos em `contends_on` —
`base.repository.ts`, `entity.repository.ts`, `table.tsx`, `firestore.indexes.json` e a action `entity` do
SDK — e **acertou os cinco**. A PR tocou 50 arquivos, e o raio extra em código existente foi maior que o da
rodada anterior: `entities/route.ts`, `useListEntities.tsx`, `useEntityCrud.tsx`, `EntitiesListClient.tsx`,
`packages/sdk/src/types/index.ts` e dois arquivos de tradução. **Nenhum deles é `contends_on` declarado de
outra spec**, então a previsão continuou útil na prática.

**Segunda rodada seguida em que a previsão não subestimou o raio de forma relevante**, e desta vez o caso
não foi fácil: `cursor-pagination` nasceu quase toda em código herdado, que é onde a previsão vinha errando.
A amostra mostra o `contends_on` acertando os arquivos centrais e deixando de fora os periféricos. Conflito
de merge nasce nos centrais, então a previsão serve para o que precisa servir.

## Precisam de decisão

Nenhuma delas é da auditoria. Todas têm recomendação, e nenhuma foi aplicada.

| # | questão | recomendação |
|---|---------|--------------|
| 1 | **`observability-logging` fecha como entregue?** 5 dos 6 itens estão no código; o que falta é adotar um coletor de erro, que exige conta em provedor e é a pergunta em aberto nº 1 da própria spec. **Terceira rodada consecutiva sem resposta.** | **Fechar como `done`** e abrir uma spec nova de esforço P só para o coletor. Manter uma spec quase inteira aberta por um item que ninguém pode executar sem decisão de produto trava a spec e polui a fila. |
| 2 | **`teams-organizations` continua `deferred`?** Vinte e sete dias e cinco PRs sem nenhuma das duas contrapartidas de esforço P que tornavam o adiamento honesto. **O gatilho escrito na própria spec disparou, e agora se repetiu.** | Ou as contrapartidas viram tarefa com dono, ou o status vira `rejected` até aparecer o primeiro fork B2B. Manter `deferred` sem elas é tomar a decisão por omissão, agora pela quinta vez. |
| 3 | **Ligar o branch protection na `main`?** O único pré-requisito técnico caiu na PR #13 e continua satisfeito. Remedido hoje: `protection` → 404, `rulesets` → `[]`. Uma PR vermelha pode ser mergeada. | Ligar, exigindo o check do CI. Custo de minutos, e o risco de adiar cresce com o número de PRs. |
| 4 | **`account-security-mfa` e `onboarding-flow` precisam de reescopo antes do `/analyze`.** As duas têm o corte de MVP desatualizado em relação ao código, cada uma por um motivo diferente. | Rodar `/spec <id>` nas duas antes de planejar. Planejar sobre um corte errado custa mais caro que reescrever a spec. |
| 5 | **Quem escreve a política de privacidade que o banner linka?** O consentimento de cookies aponta para `/legal/privacy`, que é modelo e **não menciona cookies** em nenhum dos 3 idiomas. Um fork que suba assim fica em posição pior do que sem banner: o aviso afirma que existe política, e a política não descreve o tratamento. | Texto legal é responsabilidade de cada fork, não do core — mas o **core deve entregar um modelo que ao menos declare os cookies que ele próprio grava**. A tabela está em `docs/PRE-PRODUCTION.md` §7. Cabe no corte de `data-rights-lgpd` (#2) ou vira tarefa direta de esforço P. |
| 6 | 🆕 **A busca da tabela agora enxerga só as páginas carregadas.** A PR #17 tratou o sintoma — o texto de lista vazia avisa que a busca não alcançou o resto (`table.tsx:112-118`) —, mas o comportamento continua sendo "procurar no que já baixou". A spec arquivada deixou isso explicitamente fora do corte. | Abrir spec própria quando alguém sentir a dor, não antes. A decisão de fundo (prefixo no Firestore × serviço de busca) é cara e não tem caso de uso concreto no core hoje. Enquanto isso, o aviso na tela é o contrato honesto. |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-16 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`audit-log`](audit-log.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`dashboard-home`](dashboard-home.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |

> **Nenhuma spec em `specs/` está bloqueada por outra.** O que limita a paralelização é contenção de
> arquivo e o teto de revisão, não ordem lógica.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
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
| `account-settings` | 2026-09-15 | [`docs/features/account-settings/spec.md`](../docs/features/account-settings/spec.md) — 6/6 do corte (PR #12, `a4df5ed`). ⚠️ O caminho feliz do **avatar** segue não verificado contra infra real |
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`). Entregou também, fora do corte, o `testTimeout` nas 9 configs de Vitest de então |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`), conferidos um a um. ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`), conferidos um a um. ⚠️ O índice composto novo **precisa ser publicado** antes de a listagem funcionar em produção |

**Verificado nesta rodada:** `docs/features/` tem **13** pastas e **10** `spec.md` arquivados. As três pastas
sem `spec.md` são `observability-logging` (spec continua em `specs/`, por decisão desta auditoria — não
houve `git mv` e não há duplicata), `auth-panel-context` e `impersonation-read-only`. Os frontmatters das 10
arquivadas seguem coerentes (`status: done`, `feature: <slug>`).

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
na tabela, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #17 entregou **além** do corte

1. **`update()` deixou de reler e reescrever o documento inteiro** (`base.repository.ts:169-186`). O
   round-trip pelo mapper gravava `createdAt` como string ISO, e o Firestore ordena por tipo antes de
   valor — um único `PUT` bastava para quebrar qualquer ordenação sobre esse campo. Era achado aberto neste
   backlog e virou pré-requisito do cursor.
2. **Script de backfill** (`apps/api/scripts/backfill-instants.mjs`), com dry-run, para as bases que já
   gravaram instantes como string por causa do defeito acima.
3. **O `useList*` que engolia erro foi consertado** — `EntitiesListClient.tsx:43-45,152` passou a ler o
   `error` que o hook sempre devolveu e a renderizá-lo em vez do estado vazio. Outro achado desta lista.
4. **Documentação de pré-produção para índice e backfill** (`docs/PRE-PRODUCTION.md` §1.1 e §1.2), com a
   armadilha registrada: **o emulador não cobra índice composto**, então `pnpm emulators` prova cursor e
   ordenação sem provar que a entrada existe no projeto real.
5. **Correções na própria auditoria anterior**, dentro da mesma PR: inventário de cookies e números de gate
   em `docs/PRE-PRODUCTION.md`, e o setup do JDK 21 keg-only em `docs/SETUP.md`.

**Nada disso é deriva de implementação** — o corte foi entregue como especificado. É escopo adicional. E
vale a observação pela sexta PR seguida: **uma entrega está consertando, de passagem, achados que o backlog
vinha listando**. Nesta rodada foram dois, e os dois estavam na mesma lista há mais de um mês.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 1091 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-16 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md` (gate) | `pnpm check` em **543 arquivos**, suíte de **1038 testes em 107 arquivos** | **os dois envelheceram no merge da PR #17**. Medido agora: **555 arquivos**, **1091 testes em 112 arquivos**. As outras duas medições da mesma tabela (**24/24 tasks** e **10 de 10** configs com `testTimeout`) continuam corretas | 🔴 **corrigido hoje** — e são os mesmos dois números que a rodada anterior tinha acabado de corrigir |
| `docs/PRE-PRODUCTION.md` §1 (rules publicadas) | as rules estão em vigor no projeto de referência | **confere, remedido hoje.** Leitura REST direta de `/documents/user` com a chave pública do `.env` responde **403** | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md` §7 (declaração de cookies) | tabela por cookie, arquivo e categoria, com os sete gravados pelo repositório mais dois do Google | **confere.** A tabela foi reescrita na PR #17 e bate com o código | ✅ **honesto**, depois de duas rodadas errado |
| `docs/SECURITY.md:135` (rate limit) | roda sobre lista fechada de **8 caminhos**, casados por igualdade exata | **confere.** `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:42-51`) tem exatamente os 8 listados | ✅ **honesto** pela terceira rodada |
| `docs/PAYMENTS.md` | não há fluxo de assinatura; handlers são stubs; sem `STRIPE_WEBHOOK_SECRET` responde `{ ok: false, message: "Not configured" }` | **confere nos três.** `webhooks/payments/route.ts:13,23` seguem com `// TODO`, o diretório `payments/` não existe | ✅ **honesto** pela quinta rodada — o único documento com esse histórico |
| `docs/PRE-PRODUCTION.md` §11 (observabilidade) | a API carimba `x-request-id`, emite log estruturado e expõe `/health/ready`; falta plugar coletor e apontar o health check | **confere item a item.** Nenhum coletor no repo: `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve **zero** | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md` (branch protection) | `protection` → 404, `rulesets` → `[]` | **confere, remedido hoje** via `gh api` | ✅ **honesto** |

> **Nota de método, oitava rodada consecutiva.** A contradição desta rodada é exatamente a mesma da
> anterior, no mesmo documento: números de gate medidos corretamente e invalidados pelo merge seguinte. A
> regra que a rodada passada escreveu ("medir dentro da PR que muda o número não vale") **foi seguida** — a
> PR #17 remediu depois do merge da #16 — e mesmo assim o número envelheceu, porque a própria #17 mudou a
> suíte. A conclusão é mais simples: **contagem de arquivo e de teste não sobrevive a uma PR.** Ou a tabela
> passa a ser gerada por comando, ou ela precisa ser lida como "medido em tal data", nunca como fato
> corrente.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **4 das 9 specs**, e **nenhuma inversão semântica**. As cinco intactas são
`onboarding-flow` (âncoras e contagens exatas pela segunda rodada seguida), `audit-log` (todas as âncoras
conferidas, incluindo as 6 ocorrências de "audit" e os 18 handlers de escrita), `billing-subscription`
(âncoras exatas no caractere, incluindo `:201` e `:229` do teste de webhook), `dashboard-home` (inventário
de 19 rotas e os 4 grupos de `queryKeys.ts`) e `account-security-mfa` (`ProfileDropdown.tsx:81` e
`reset/route.ts:51`, as duas correções da rodada anterior, confirmadas).

**A deriva desta rodada tem uma única causa**: a PR #17 reescreveu `base.repository.ts`,
`entity.repository.ts` e `entities/route.ts`, e cinco âncoras de outras specs apontavam para dentro deles.

### Âncoras deslocadas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`teams-organizations`](teams-organizations.md) | `entities/route.ts` `:16`, `:36`, `:44` (escopo da listagem, posse do objeto, gravação do dono) | **`:26`**, **`:71`**, **`:79`** | PR #17 acrescentou o parsing de query e o `try/catch` de cursor ao `GET`, empurrando os três para baixo |
| [`teams-organizations`](teams-organizations.md) | `entity.repository.ts:11`, com o `where` em `:14` | **`:15`**, com o `where` em **`:22`** | PR #17 trocou o corpo de `listByUserId` por uma chamada a `paginate` |
| [`data-rights-lgpd`](data-rights-lgpd.md) | `base.repository.ts:127-129` (`delete()` soft) e `:128` | **`:196-198`** e **`:197`** | PR #17 acrescentou `paginate` e reescreveu `update` acima dele |
| [`observability-logging`](observability-logging.md) | `apps/app/package.json:26,35` (`import-in-the-middle`, `require-in-the-middle`) | **`:27`**, **`:36`** | deriva de 1 linha herdada da PR #16, que inseriu `@repo/analytics` na lista de dependências |

Corrigidas as quatro no disco (sete âncoras ao todo).

### Contagens erradas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`e2e-testing`](e2e-testing.md) | 1038 testes em 107 arquivos · `apps/api` 371 em 35 · `apps/app` 293 em 41 | **1091 em 112** · **410 em 38** · **307 em 43** | Terceira rodada seguida com os números desta seção errados, sempre pelo mesmo mecanismo. Desta vez não houve erro de método — foram medidos depois do merge da #16, e a #17 os moveu. A spec agora diz a data da medição |
| [`observability-logging`](observability-logging.md) | "sobram **12 em 9 arquivos**" de `console.*` | **12 em 8** | Erro de aritmética, não de medição: a rodada anterior subtraiu as 2 chamadas do total (14 → 12) e esqueceu de subtrair os 2 arquivos que as hospedam (`log.ts` e `requestErrorReporter.ts`) |
| [`teams-organizations`](teams-organizations.md) | "quarta rodada" sem as contrapartidas | **quinta** | Contador de rodadas, não de código. O gatilho de escalonamento que a spec definiu disparou de novo |

### O que a auditoria **não** encontrou

Vale registrar pelo que não obriga a fazer: nenhuma spec `done` regrediu, nenhuma entrega parcial ficou
órfã, e nenhuma feature em `docs/features/*/STATE.md` está sem `spec:` correspondente quando deveria ter.
`docs/features/cursor-pagination/STATE.md` já trazia `spec: cursor-pagination` no frontmatter, então o
arquivamento não precisou tocá-lo.

## Achados — correções pontuais, não specs

Coisas que não merecem spec própria (não são funcionalidade, não têm corte de MVP), mas que são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-16.** Os achados da rodada anterior foram reconferidos contra o código, um a um.
> **Placar: 2 fechados · 0 novos · o resto intacto e confirmado no disco.**

### Achados fechados pela PR #17

| achado | como fechou |
|--------|-------------|
| ✅ **`update()` do `BaseRepository` reescrevia o documento inteiro e corrompia o tipo de `createdAt`** | `base.repository.ts:174-186` passou a escrever **só os campos recebidos**, sem reler o documento. O docblock em `:169-173` registra o porquê de forma autocontida. Estava aberto desde `firestore-admin-access`, onde foi preservado de propósito por ser migração *contract-preserving* |
| ✅ **Um `useList*` que falhava renderizava o estado vazio, não erro** | `EntitiesListClient.tsx:33` passou a destruturar o `error` que o hook sempre devolveu, `:43-45` o formata com `FormattedError`/`handleClientError` e `:152` o entrega ao `Container` como `loadError`. Um 429 na lista deixa de parecer "nenhuma entidade cadastrada" |

Os dois estavam nesta lista havia mais de um mês. Nenhum foi pego por uma tarefa de limpeza: as duas
correções entraram porque a feature que a spec pediu **esbarrou** neles.

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#3) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports` |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o primeiro import do `apps/api/proxy.ts:1` — o middleware, que roda em toda requisição | `packages/security/index.ts:11` | `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot — e `instrumentation.ts:26-30`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:20-24`) e **não há `process.exit` em nenhum lugar do arquivo** | `apps/api/instrumentation.ts:20-24` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. ✅ Mitigação parcial: `/health/ready` consulta o Firestore, então um health check apontado para ele detecta parte dessas falhas. Não detecta esta em específico — o processo sobe e o Firestore responde |
| ⚠️ **As 3 rotas de `/account` não estão no rate limit** — incluindo troca de senha, alvo clássico de força bruta | `apps/api/proxy.ts:42-51` | Casamento exato (`includes`), decisão consciente para não limitar `/auth/sign-in/google` duas vezes. Mas rota nova nasce sem limite, e as de conta nasceram assim. Registrado em `docs/SECURITY.md` |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| ◐ **Dependência importada sem ser declarada — uma metade fechada, duas abertas.** ✅ `apps/app/package.json` passou a declarar `@repo/analytics` (PR #16). 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` e `apps/app/package.json` **não declara** `@repo/email`. 🟡 `apps/web` importa `@repo/auth/provider` em **5 arquivos** de produção (`layout.tsx:4`, `clientLayout.tsx:3`, `sign-up-form-client.tsx:4`, `header/index.tsx:3`, `sign-in-form-client.tsx:4`) e `apps/web/package.json` **não declara `@repo/auth`** | `apps/app/package.json` · `apps/web/package.json` | Funciona por hoisting do pnpm. Além do risco de resolução, **o turbo não invalida `web#*` quando `@repo/auth` muda** — cache mentindo num gate que roda em toda PR. O caso da `web` é o pior dos três: é runtime, não só `keys.ts` |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` **não existe**. Zero importadores, falha em silêncio. **Décima terceira auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` de todo o resto | `packages/auth/package.json:25` | É o único workspace fora da major. Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | `grep ChartContainer` fora do próprio arquivo ⇒ **0**, reconferido. Reexportado no barril (`components/ui/index.ts:8`). `dashboard-home` (#6) é a spec que o resgataria |
| 🟡 **`input-otp.tsx` é código morto**, sem consumidor fora do barril e do catálogo do `playground` | `packages/design-system/components/ui/input-otp.tsx` | `account-security-mfa` (#7) é a spec que o usaria. ⚠️ Cuidado ao medir: `InpuTOTP` casa com um `grep -i TOTP` e produz falsos positivos |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` seguem instalados e nunca importados** | `apps/app/package.json:27,36` | São as dependências típicas de OTel/Sentry. As PRs #15 a #17 passaram sem tocá-las, o que confirma que são peso morto e não semente de nada. ⚠️ As duas linhas desceram uma posição na PR #16 |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-11` | Falta o subpath `"./utils/*"` (consumidor externo não alcança `utils/cookies.ts`), e o `"."` (`:6`) aponta para `index.ts`, **que não existe** — reconferido no disco |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | O campo vizinho `requestId`, nascido na mesma entrega, **foi ligado até a tela**. Dois campos em linhas adjacentes, só um chegou ao usuário. ⚠️ Há um `retryAfterSeconds` **homônimo de outro tipo** em `apps/api/proxy.ts:102` |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — sétimo ciclo | `packages/auth/client.ts:224` | A única cobertura é `apps/app/__tests__/useEmailVerification.test.tsx`, que a **mocka** |
| 🟡 **`packages/shared` é o único pacote com `test` e sem `typecheck`** | `packages/shared/package.json:11` | O pacote hospeda o helper de log e o `requestErrorReporter`, e a imunidade a `Error` do `logEvent` é garantida pelo **tipo**, que nenhum gate deste workspace verifica. Fica coberto de lado pelo `typecheck` dos consumidores; não pelo próprio |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `delete()` herdado por todo repositório é **soft delete** — chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:196-198` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` (#2) — e deixa **duas** famílias de objeto órfãs no bucket. ⚠️ Âncora atualizada nesta rodada (era `:127-129`) |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32-43` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth, e descarta linhas em silêncio (`:42`). O N+1 do Admin SDK está em `:38-40`. **Não foi migrado para o cursor**, por decisão explícita da spec arquivada: seria a única listagem paginada que ainda faz uma chamada de rede por linha |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. Seguem órfãs — o SDK chama `/auth/me`, `/auth/sign-in/google` e as rotas de senha, nunca estas. A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:67` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | A assinatura **é** validada (`:45`); nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#3) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:46` | `pnpm --filter api dev:with-stripe` **não pode funcionar**. Duas das três chaves afetadas já foram resgatadas por redeclaração (`FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_APP_URL`), **com comentário nomeando esta armadilha** — esta ficou de fora |
| ◐ **`skipValidation` na `apps/web` é incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` | `apps/web/env.ts:27,13-19` | O CTA "Ir para o painel" da landing cai no fallback em `hero.tsx:44`, `cta.tsx:35`, `header/index.tsx:35-36` e `pricing/page.tsx:77,120`. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189-202` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada** — UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL redescobre o mesmo defeito |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | O idioma escolhido **não sobrevive ao fechamento do navegador**. Nem o `x-theme` nem o `bp:cookie-consent` herdaram o defeito — os dois são gravados só pelo cliente |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** por padrão; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. ◐ **Meio fechado pela PR #16:** o helper passou a aceitar `secure` como opção, e o cookie de consentimento a usa em produção. `x-locale` e `x-theme` continuam sem |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru | `packages/sdk/src/client/base.ts:45,53,61,95` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa. Reconferido: as quatro linhas batem |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu às PRs #11 a #17.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` — em qualquer idioma |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`, nos **dois** apps), `"Início"`, `"Home"` | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` · as duas `page.tsx` de home `:7` | Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, e está nos dois apps. O `PageBreadcrumb` ainda crava `href="/painel"` em `:29` |
| 🟡 **A mensagem de erro padrão do repo inteiro está cravada em pt-br dentro de um pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | `"Um erro inesperado aconteceu"` é o retorno de **todo** erro que não é `FormattedError` — o fallback que qualquer fork mostra quando nada mais funciona, em espanhol e em inglês também. A função ao lado (`withRequestId`) **lê o dicionário corretamente** para o rótulo do identificador, o que torna a omissão mais visível. 🆕 **Ganhou alcance com a PR #17**: o erro de listagem agora chega à tela por este caminho |
| 🟡 **`apps/web/…/sign-in/validations/signInSchema.ts:9` crava a mensagem de validação em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | `"A senha deve ter pelo menos 6 caracteres"` fora do dicionário. Os outros nove sítios de `MIN_PASSWORD_LENGTH` passam por `validation.passwordMin` |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:29-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem; as deps `[api, current]` reagendam a cada tick. É a home da landing |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:11` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo. ⚠️ Segue com urgência: existe `/health/ready`, e é provável que alguém queira consumi-lo pelo mesmo hook |
| 🟡 **`provider-error` não distingue as falhas do provedor** — cota estourada, domínio não verificado e chave revogada produzem o mesmo `reason` | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado**. A assimetria criada pela PR #15 segue: `@repo/email` manteve o próprio `logEmail` (`:39-48`) em vez de usar o `logEvent` compartilhado — mesmo formato, código duplicado, e o teste de privacidade vigia só esta cópia |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | O form não tem `<form>`, nem handler, nem import da action — que **existe e tem teste** e zero chamadores de produção |
| 🟡 **O rodapé da `apps/web` consome `data-cookie-banner` sem teste que fixe o acoplamento** | `apps/web/app/[locale]/components/footer.tsx:56` | O banner publica o atributo e dois layouts o leem. O lado da `apps/app` tem teste (`apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`); o da `web` não, porque a suíte dela roda em `environment: "node"`, sem jsdom. Renomear um dos dois lados quebra o rodapé em silêncio |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito. O documento ganhou as seções 1.1 e 1.2 (índice composto e backfill) na
> PR #17, e teve dois números de gate corrigidos nesta auditoria.

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | 🆕 🔴 **O índice composto da listagem paginada de `entity` precisa ser publicado.** Sem ele, `GET /entities` responde `PAGINATION_INDEX_MISSING` em produção — degradação deliberada, mas a tela fica vazia. ⚠️ **O emulador não cobra índice composto**, então nada no gate local pega isto | `PRE-PRODUCTION.md` §1.1 | ~5 min + construção do índice |
| 2 | 🆕 **Backfill de instantes em base que já tem dado.** Antes da PR #17 o `update()` regravava `createdAt` como string ISO; o Firestore ordena por tipo antes de valor, então registros já tocados por um `PUT` ficam fora da ordenação. O script existe e tem dry-run | `PRE-PRODUCTION.md` §1.2 | ~10 min por coleção |
| 3 | **`main` não tem branch protection.** O pré-requisito caiu na PR #13 e continua satisfeito — o gate fechou 24/24 sem cache. Remedido hoje: `protection` → 404, `rulesets` → `[]` | `PRE-PRODUCTION.md` | **minutos** |
| 4 | **Ninguém vigia a trilha de erro.** O `onRequestError` está plugado nos três apps e escreve no stdout; nenhum coletor está ligado e nenhum alerta é disparado. `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve zero, remedido hoje. É o resíduo de `observability-logging` | `PRE-PRODUCTION.md` §11 | P + conta em provedor |
| 5 | **O health check da plataforma não aponta para `/health/ready`.** A rota existe e responde 503 quando o Firestore não atende em 2 s; enquanto ninguém a configura, a plataforma segue olhando `/health`, que responde OK com o banco fora do ar | `PRE-PRODUCTION.md` §11 | ~2 min |
| 6 | **`SESSION_COOKIE_DOMAIN` precisa estar definida se `web` e `app` rodarem em subdomínios distintos.** Sem ela o cookie de consentimento fica host-only e o visitante responde ao banner **duas vezes**. Degrada, não quebra — e **não aparece em desenvolvimento**, porque em `localhost` o browser ignora a porta | `PRE-PRODUCTION.md` §7 | ~2 min |
| 7 | **A política de privacidade linkada pelo banner não menciona cookies.** Ver a decisão nº 5 | `PRE-PRODUCTION.md` §7 | P (texto) |
| 8 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados" — com **dois** consumidores. Exige plano **Blaze** | `PRE-PRODUCTION.md` | cartão + ~15 min |
| 9 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 10 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações | `PRE-PRODUCTION.md` | P |
| 11 | **Contas de QA acumuladas: 15.** A PR #17 não acrescentou nenhuma — o `/test` dela rodou contra o emulador. Uma das antigas (`qa-account-settings-b@`) segue **inutilizável**: apagar, não reusar | `PRE-PRODUCTION.md` | P |
| 12 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 13 | **O login com Google nunca teve passe manual com conta real.** ⚠️ A única que continua existindo só aqui. O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta | *(só neste arquivo)* | ~2 min |
| 14 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** Depende da pendência 8; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#5) | `PRE-PRODUCTION.md` | ver #8 |
| 15 | **A retenção de log da plataforma nunca foi conferida.** O passo existe em `docs/PRE-PRODUCTION.md`, **sem prazo escrito** — o próprio documento registra que nenhuma fonte com data foi consultada. É também o item 5, parcial, do corte de `audit-log` | `PRE-PRODUCTION.md` §11 | ~5 min |
| 16 | **O item de reabertura do consentimento no `ProfileDropdown` nunca foi visto num browser.** Coberto por teste jsdom (`apps/app/__tests__/profileDropdownCookieConsent.test.tsx`), não por passe visual | *(só neste arquivo)* | ~2 min com emulador de pé |

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | Mantém o argumento das duas rodadas anteriores. A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Deixou de ser "adotar observabilidade" e virou "ligar um fio de esforço P". Depende da decisão nº 1 de [Precisam de decisão](#precisam-de-decisão). |
| **Busca textual no servidor** | — | 🆕 Explicitamente fora do corte de `cursor-pagination`, arquivada. Com a paginação, o `searchFields` da tabela passou a filtrar só a página carregada; a PR tratou o sintoma avisando o usuário. A decisão de fundo (prefixo no Firestore × serviço de busca) é cara e não tem caso de uso concreto no core. Ver a decisão nº 6. |
| **Contagem total de registros na listagem** | — | Fora do corte de `cursor-pagination`. No Firestore custa uma agregação à parte, e "carregar mais" não precisa dela. |
| **Registro auditável de consentimento** | — | Explicitamente fora do corte de `cookie-consent`, arquivada. Prova de consentimento é obrigação do controlador e hoje a escolha vive só no navegador do titular. Herdado por `audit-log` (#1) ou por `data-rights-lgpd` (#2) — as duas têm onde acomodar, e nenhuma o declarou ainda. |
| **CMP certificada de terceiro · TCF do IAB · geolocalização do visitante** | — | Fora do corte de `cookie-consent`, arquivada. As duas primeiras arrastam serviço pago para todo fork; a terceira parece economia e é fonte de bug e de dúvida jurídica. |
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. |
| Firebase App Check | — | Explicitamente fora do corte de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** A action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P — vai direto ao `/analyze`. |
| **Migrar a listagem de usuários para o cursor** | — | 🆕 Fora do corte de `cursor-pagination`, arquivada. `userRepository.list()` carrega um N+1 do Admin SDK: paginá-la sem resolver isso entregaria uma listagem que faz uma chamada de rede por linha. Tarefa própria, e o N+1 vem primeiro. |
| Provedor de e-mail plugável (SES/Postmark) · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`, arquivada. Reabrir exige spec nova. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, arquivada. O `POST /files` ficou genérico de propósito. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`, arquivada. A exclusão de conta virou [`data-rights-lgpd`](data-rights-lgpd.md) e as sessões viraram [`account-security-mfa`](account-security-mfa.md); a **troca de e-mail** continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, arquivada. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#5). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Explicitamente fora do corte de `observability-logging`. A nota de pesquisa registra o conflito entre Sentry v8+ e `@vercel/otel`, que quebra a propagação de trace em silêncio — má primeira dívida para um MVP. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional que manter no core. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. O pré-requisito está satisfeito há quatro rodadas. Reavaliar junto com o branch protection. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição, e como opt-in por variável ausente. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **10** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois. Cruza com `e2e-testing` (#5). |
| Changesets / versionamento · Storybook | — | Com pacotes `private: true` e forks que divergem, o valor do changelog não paga o processo. O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
</content>
</invoke>
