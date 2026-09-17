# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-17 (`/spec --sync`, pós-merge da PR #18) · anteriores: 2026-09-16 (PR #17) ·
> 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 · 2026-09-14 ·
> 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 ·
> **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`audit-log` foi entregue e arquivada.** Era o #1 desta lista. Os cinco itens do corte foram reabertos
>    um a um no código; PR #18 mergeada em `main` (`f08a84f`), CI `success` no SHA de merge. É a décima
>    primeira spec a sair da fila, e vive agora em
>    [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md).
> 2. **Três desvios entre o que a spec pedia e o que foi entregue**, todos registrados na spec arquivada. O
>    mais relevante: impersonação é registrada **por janela de 15 minutos**, não por início e fim.
> 3. **Onze âncoras deslocadas e sete contagens erradas** em seis specs, todas consequência da PR #18 ter
>    inserido linhas no meio de `queryKeys.ts`, `log.ts`, `client/index.ts`, dos dois guards e de
>    `account/sessions/revoke/route.ts`. Corrigidas no disco.
> 4. **Duas afirmações de `docs/SECURITY.md` mentiam, nas duas direções** — uma dizia pronto o que não é,
>    outra dizia pendente o que já foi feito. As duas corrigidas. Mais os números de gate de
>    `docs/PRE-PRODUCTION.md`, pela terceira rodada seguida.
> 5. **O #1 é `dashboard-home`**, e o motivo é de execução, não de valor bruto. Detalhe em
>    [Ordem recomendada](#ordem-recomendada).

## Contadores

Sobre as **8 specs que seguem em `specs/`**. Recontados do disco em 2026-09-17, lendo o frontmatter de cada
arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 6 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 11 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 3 · `confianca` 2 · `dx` 2 (+1 `deferred` em `produto`). **Por esforço:**
P 0 · M 5 · G 3. **Por valor:** alto 5 · médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 1** (`audit-log`: `proposed` → `done`, arquivada).

### O caso `audit-log` — o que foi conferido antes de arquivar

PR **#18** mergeada em `main` em 2026-09-17T12:42:26Z (merge commit `f08a84f`), com CI `success` nesse SHA
(`gh run list`). Os cinco itens do corte, reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Ações sensíveis geram evento persistido | **implementado** | Cinco call sites: `(guards)/common-panel.ts:86` (impersonação), `users/[id]/route.ts:84-94` (perfil por admin) e `:119-128` (exclusão), `account/sessions/revoke/route.ts:12`, `account/password/route.ts:68`. Persistência em `audit-event.repository.ts:37-39` |
| 2. Ator, sujeito, ação, alvo e momento | **implementado** | `packages/sdk/src/types/audit/audit.ts:16-39` separa `actorUserId`/`actorUid` de `onBehalfOfUserId` — quem agiu × em nome de quem. `users/[id]/route.ts:115` lê o rótulo do alvo **antes** do `delete`, para o registro sobreviver à exclusão |
| 3. Consultável na admin, filtro de período e usuário, 3 idiomas | **implementado** | Tela em `admin/(pages)/audit/`, filtros em `(components)/AuditFilters.tsx`; `GET /audit-events` sob `requireAdminApi` (`audit-events/route.ts:10`); filtros em `audit-event.repository.ts:75-87`; i18n em `translations/apps/app/pages/admin/auditTrail.ts:2,36,70` |
| 4. Somente-adição | **implementado** | `audit-events/route.ts` exporta **só** `GET` (`:10`); `audit-event.repository.ts:92-106` faz `update`, `updateBulk`, `delete` e `deleteBulk` lançarem `AuditEventImmutableError` |
| 5. Retenção do log de acesso no checklist, com o prazo | **implementado** | `docs/PRE-PRODUCTION.md:395-409` — o passo existia sem prazo desde antes da spec; agora traz os 6 meses do art. 15 do Marco Civil, a definição de registro de acesso (art. 5º, VIII) e a porta lógica do Decreto 12.975/2026 |

**Três ressalvas registradas na spec arquivada, nenhuma bloqueando o `done`:** a gravação é fail-open (nunca
derruba a ação principal; em falha o evento vai para o stdout com o mesmo `requestId`); o índice composto de
`auditEvent` **precisa ser publicado** antes de o filtro por usuário funcionar em produção; e a retenção da
coleção segue sem decisão de prazo.

## Gates — medidos nesta auditoria

Executados agora, com `--force`, no workspace `la-paz`, com o `HEAD` em `f08a84f`. Não copiados do `/test`
nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **583 arquivos · 0 erros** (`No fixes applied`, 301 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 1 min 30 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-16 (PR #17) |
|-----------|---------:|-------:|---------------------------|
| `api` | 46 | 511 | **+8 arquivos · +101** |
| `app` | 47 | 342 | **+4 arquivos · +35** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 6 | 62 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/analytics` | 2 | 34 | — |
| `web` | 5 | 31 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **124** | **1227** | **+12 arquivos · +136 testes** |

A PR #18 não criou workspace novo, então o número de tasks e o de configs de Vitest ficaram onde estavam. O
`pnpm check` subiu de 555 para **583** arquivos. É o maior salto de testes numa única entrega até aqui, e
vem da trilha ter sido instrumentada em cinco handlers em vez de três.

CI: a execução de merge de **#18** (`f08a84f`) está em **`success`**. A branch de trabalho desta auditoria é
`la-paz`, cujo `HEAD` é `f08a84f` — nenhum commit do repositório está fora de `main`.

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
| 1 | [`dashboard-home`](dashboard-home.md) | **Sobe ao topo por ser a única spec de alto retorno que uma rodada autônoma prova inteira.** As duas homes do painel continuam com **11 linhas** e o literal `"Home"` (`page.tsx:7`, nos dois painéis), com a chave de dicionário pronta ao lado e já usada em 5 breadcrumbs do painel comum. É a primeira tela de todo fork. Resgataria `chart.tsx` e a dependência `recharts`, que pesa no bundle desde sempre sem renderizar nada. **Nada aqui depende de conta em provedor:** Firestore roda no emulador desde a PR #13, e a PR #18 acabou de entregar uma segunda tela de referência (`/admin/audit`) com cursor, filtros e `queryKeys` — há dois padrões prontos para copiar em vez de um. `value: médio` é o que a segurava; com `audit-log` fora da fila, nenhuma spec de valor alto é executável de ponta a ponta sem infra externa. |
| 2 | [`data-rights-lgpd`](data-rights-lgpd.md) | **Maior valor do backlog e a única com prazo imposto de fora.** Segue em 0/5. A armadilha dos objetos órfãos continua dobrada: `deleteObjectQuietly` tem **2** call sites (`entities/[id]/route.ts:90` e `account/route.ts:158`), ambos de troca, nenhum de expurgo; e o `delete()` herdado é **soft delete** (`base.repository.ts:196-198`). O que a tira do topo é esforço **G** somado a um problema novo de verificação: o item 3 do corte exige limpar arquivos **e** cancelar assinatura ativa no mesmo fluxo — o primeiro depende do Cloud Storage não ativado, o segundo de um `billing-subscription` que não existe. Dois dos cinco critérios voltariam "não verificados". |
| 3 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze`, e é isso que a tira do #1.** Valor alto, esforço M e zero dependência de infra externa — o perfil ideal para rodada autônoma, não fosse o corte estar desatualizado. O item 2 continua oco desde que a PR #12 passou a coletar nome e idioma na área de conta; e a spec atribui o gancho pós-cadastro ao lugar errado — ele está no `onSuccess` da mutation (`SignUpFormClient.tsx:114`), não no caminho de redirect que o onboarding precisaria interceptar. Reconferida nesta rodada: **zero deriva de âncora**, exatas pela terceira rodada seguida. O problema é o corte, não as referências. |
| 4 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto do backlog e ainda em **0/6**: não existe diretório `payments/` nas rotas, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`) sem dedupe por `event.id`. **Segue atrás por um motivo de execução, não de mérito:** provar checkout, portal e webhook exige chaves reais da Stripe, e uma rodada autônoma devolveria os critérios como "não verificados". **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 5 | [`e2e-testing`](e2e-testing.md) | Destravada, e sem o argumento mais forte que tinha — o gate instável foi corrigido pela PR #13 e não voltou. O que resta é sólido e mais lento de cobrar: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, nenhuma das **10** configs medindo cobertura, e **duas rules files sem um único teste de regra** (`firestore.rules` publicado em deny-all, `storage.rules` nem publicado) — sem desculpa, porque o emulador existe. O argumento que ganhou na PR #17 dobrou na #18: o emulador **não cobra índice composto**, e agora são **dois** índices versionados que nenhum gate local prova estarem publicados. |
| 6 | [`account-security-mfa`](account-security-mfa.md) | Cresceu duas auditorias atrás e não encolheu. O item 4 (política de senha) era descrito como mudança em 5 schemas de formulário; são **10 declarações**, e as 3 que importam estão em `apps/api` — mudança de contrato, não de formulário. Restam MFA (**3/10** de prevalência entre os starters pesquisados) e visibilidade de sessões (**1/10**). `value: médio` por mérito próprio, e esforço provavelmente acima de M. |
| 7 | [`observability-logging`](observability-logging.md) | `in-progress`. Entregue em 5 dos 6 itens; o resíduo é adotar um coletor de erro, que depende de decisão de produto e de conta em provedor. **Fora do conjunto elegível** — ver [Precisam de decisão](#precisam-de-decisão). Quarta rodada consecutiva sem resposta. |
| 8 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora pela sexta rodada. Ver [Precisam de decisão](#precisam-de-decisão). |

### O que **não** foi escolhido para #1, e por quê

- **`data-rights-lgpd` foi a segunda colocada, e perdeu por verificabilidade somada a esforço.** É a única
  spec do backlog com prazo imposto de fora, e o argumento dela só piora com o tempo. O que a tira do topo
  **nesta** forma de execução deixou de ser só o esforço **G**: o item 3 do corte pede que a exclusão
  cancele assinatura e limpe arquivos "no mesmo fluxo", e hoje **nenhuma das duas pontas existe de forma
  verificável** — o Cloud Storage não está ativado e não há fluxo de assinatura. Uma rodada autônoma
  entregaria o export e o delete e deixaria a coordenação, que é justamente a parte difícil, por provar. Se
  a execução deixar de ser autônoma, ela é a candidata natural ao topo.
- **`onboarding-flow` foi a terceira, e chegou perto.** Valor alto, esforço M, e é a única das três
  primeiras que não toca em infra externa nenhuma. Perdeu por um motivo mecânico: o corte de MVP está
  desatualizado, e uma rodada autônoma planejaria em cima dele sem perceber. Reescopar primeiro
  (`/spec onboarding-flow`) e ela passa à frente de `dashboard-home` na rodada seguinte.
- **`billing-subscription`** tem o maior valor bruto e não foi escolhida pela razão de sempre, que merece
  ficar explícita: verificar checkout, portal e webhook exige chaves reais da Stripe. Seria entregar código
  que ninguém consegue provar hoje.
- **`e2e-testing`** ganhou de novo um argumento real (agora são dois índices compostos que o emulador não
  cobra) e mesmo assim fica em quinto: é esforço **G** e `value: médio`, e o ponto cego específico já tem
  mitigação barata no lugar — `apps/api/__tests__/firestoreIndexes.test.ts` foi estendido pela PR #18 e lê
  as duas entradas do arquivo versionado.

## Lotes paralelos

Para rodar o ciclo completo em 2–4 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-17** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis nesta rodada: 6 de 8.** Fora ficam `teams-organizations` (`deferred`) e `observability-logging`
(`in-progress`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `dashboard-home` · `onboarding-flow` · `e2e-testing` | as duas `page.tsx` de home + `queryKeys.ts` + índices · `apps/app/proxy.ts` + resolvedor pós-login + `user-merge.ts` + `UserDTO` · `package.json` da raiz + `turbo.json` + `ci.yml` | **tela inicial**, **desvio de navegação no app** e **ferramental da raiz**. As duas primeiras vivem em `apps/app` por caminhos distintos (páginas de home × proxy e pós-login), e a terceira não toca em `apps/` nem em `packages/` |
| **2** | `data-rights-lgpd` · `billing-subscription` | `base.repository.ts` + `packages/auth/server.ts` + índices · webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` | **expurgo do titular** e **slice `user` cobrado**. Uma mexe no repositório base e na camada de sessão; a outra, no repositório de usuário e no contrato do SDK |
| **3** | `account-security-mfa` | `packages/auth/*` + `resolve-api-actor.ts` | sozinha por colisão com o lote 2, não por falta de par |

### Por que cada spec ficou de fora do lote 1

Distinguir os dois motivos importa: colisão é **dado**, teto é **decisão**.

- **`data-rights-lgpd` colide com `dashboard-home`** em `firestore.indexes.json`. É a mesma colisão que a
  tirava do lote 1 na rodada passada, só que agora contra outra spec.
- **`billing-subscription` colide com `onboarding-flow`** em `packages/sdk/src/types/user/user.ts`: uma
  precisa acrescentar `subscription`/`stripeCustomerId` ao `UserDTO`, a outra o marcador de perfil completo.
- **`account-security-mfa` não colide com nada do lote 1.** Ficou de fora **só pelo teto de 3**, que é
  escolha de custo de revisão e não impedimento técnico. Se você tiver fôlego para revisar quatro features
  amanhã, é ela que entra — e é a segunda rodada seguida em que ela é barrada por teto, não por dado.

O lote 2 parou em **duas** specs por colisão, não pelo teto: `account-security-mfa` bateria em
`packages/auth/server.ts` com `data-rights-lgpd`.

**O arquivo mais disputado do repositório continua sendo `firestore.indexes.json`**, citado por **3** das 8
specs (era 4 de 9 — a saída de `audit-log` tirou uma). Empatados com 2:
`packages/sdk/src/client/index.ts`, `packages/auth/server.ts` e `packages/sdk/src/types/user/user.ts`. O
`base.repository.ts` caiu para **1**, pela primeira vez desde que estes lotes são calculados.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou.

A régua desta rodada, com `audit-log` como amostra: ela declarava **5** arquivos em `contends_on` —
`base.repository.ts`, `users/[id]/route.ts`, `firestore.indexes.json`, `packages/sdk/src/client/index.ts` e
`queryKeys.ts` — e **acertou quatro dos cinco**. O errado foi `base.repository.ts`: a trilha estendeu a
classe em vez de alterá-la, então o arquivo previsto como disputado **não foi tocado**.

Em compensação, a PR tocou 58 arquivos e o raio extra foi o maior já medido: os **dois guards**
(`admin.ts`, `common-panel.ts`), três rotas de `account/`, `apps/app/shared/lib/pagination.ts` e o barril de
rotas do admin. **Nenhum deles é `contends_on` declarado de outra spec** — mas os dois guards por pouco:
`account-security-mfa` declara `resolve-api-actor.ts`, que é vizinho de porta.

**Terceira rodada seguida em que a previsão não subestimou o raio de forma relevante.** O padrão que se
consolida é outro, e vale registrar: o `contends_on` erra mais por **excesso** do que por falta — prevê
disputa em arquivo que a entrega acaba não tocando. Errar por excesso separa specs que poderiam rodar
juntas; é o erro barato dos dois.

## Precisam de decisão

Nenhuma delas é da auditoria. Todas têm recomendação, e nenhuma foi aplicada.

| # | questão | recomendação |
|---|---------|--------------|
| 1 | **`observability-logging` fecha como entregue?** 5 dos 6 itens estão no código; o que falta é adotar um coletor de erro, que exige conta em provedor e é a pergunta em aberto nº 1 da própria spec. **Quarta rodada consecutiva sem resposta.** | **Fechar como `done`** e abrir uma spec nova de esforço P só para o coletor. Manter uma spec quase inteira aberta por um item que ninguém pode executar sem decisão de produto trava a spec e polui a fila. Enquanto não há resposta, ela fica fora dos lotes paralelos — o custo da indecisão é um workspace a menos por noite. |
| 2 | **`teams-organizations` continua `deferred`?** Vinte e oito dias e seis PRs sem nenhuma das duas contrapartidas de esforço P que tornavam o adiamento honesto. **O gatilho escrito na própria spec disparou e já se repetiu duas vezes.** | Ou as contrapartidas viram tarefa com dono, ou o status vira `rejected` até aparecer o primeiro fork B2B. Manter `deferred` sem elas é tomar a decisão por omissão, agora pela sexta vez. |
| 3 | **Ligar o branch protection na `main`?** O único pré-requisito técnico caiu na PR #13 e continua satisfeito. Remedido hoje: `protection` → 404, `rulesets` → `[]`. Uma PR vermelha pode ser mergeada. | Ligar, exigindo o check do CI. Custo de minutos, e o risco de adiar cresce com o número de PRs — já são 18. |
| 4 | **`onboarding-flow` e `account-security-mfa` precisam de reescopo antes do `/analyze`.** As duas têm o corte de MVP desatualizado em relação ao código, cada uma por um motivo diferente. **Agora custa posição no ranking:** é a única razão pela qual `onboarding-flow` não é o #1 desta rodada. | Rodar `/spec <id>` nas duas antes de planejar. Planejar sobre um corte errado custa mais caro que reescrever a spec. |
| 5 | **Quem escreve a política de privacidade que o banner linka?** O consentimento de cookies aponta para `/legal/privacy`, que é modelo e **não menciona cookies** em nenhum dos 3 idiomas. Um fork que suba assim fica em posição pior do que sem banner: o aviso afirma que existe política, e a política não descreve o tratamento. | Texto legal é responsabilidade de cada fork, não do core — mas o **core deve entregar um modelo que ao menos declare os cookies que ele próprio grava**. A tabela está em `docs/PRE-PRODUCTION.md` §7. Cabe no corte de `data-rights-lgpd` (#2) ou vira tarefa direta de esforço P. |
| 6 | **A busca da tabela enxerga só as páginas carregadas.** A PR #17 tratou o sintoma — o texto de lista vazia avisa que a busca não alcançou o resto (`table.tsx:112-118`) —, mas o comportamento continua sendo "procurar no que já baixou". A PR #18 herdou isso na trilha de auditoria. | Abrir spec própria quando alguém sentir a dor, não antes. A decisão de fundo (prefixo no Firestore × serviço de busca) é cara e não tem caso de uso concreto no core hoje. Enquanto isso, o aviso na tela é o contrato honesto. |
| 7 | 🆕 **Por quanto tempo reter os eventos da trilha de auditoria?** A coleção `auditEvent` nasceu sem expurgo e sem `expiresAt`, e cresce a cada ação sensível de todo fork. A spec arquivada deixou a pergunta explícita e recomendou prazo configurável com finalidade declarada. | Decidir um prazo padrão e escrevê-lo em `docs/PRE-PRODUCTION.md` §1.3, **sem** invocar o art. 15 do Marco Civil (que é do log de acesso, não da trilha de negócio). Guardar além do necessário é o risco que o Decreto 8.771/2016, art. 13, § 2º manda evitar. |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-17 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`dashboard-home`](dashboard-home.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |

> **Nenhuma spec em `specs/` está bloqueada por outra.** O que limita a paralelização é contenção de
> arquivo e o teto de revisão, não ordem lógica.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
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
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`), conferidos um a um. ⚠️ **Três desvios registrados**, o principal sendo impersonação por janela de 15 min em vez de início/fim. O índice composto de `auditEvent` **precisa ser publicado** |

**Verificado nesta rodada:** `docs/features/` tem **14** pastas e **11** `spec.md` arquivados. As três pastas
sem `spec.md` são `observability-logging` (spec continua em `specs/`, por decisão desta auditoria — não
houve `git mv` e não há duplicata), `auth-panel-context` e `impersonation-read-only`. Os frontmatters das 11
arquivadas seguem coerentes (`status: done`, `feature: <slug>`).

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
na tabela, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #18 entregou **além** do corte

1. **Duas ações a mais na trilha.** `account.sessions.revoke` e `account.password.change` foram
   instrumentadas junto das três que o corte listava. Não é escopo inventado: o corpo da própria spec
   argumentava que a PR #12 tornara a ausência de log dessas duas indefensável.
2. **`AdminAuthContext` passou a expor `actorProfile`** (`apps/api/app/(guards)/admin.ts`). O perfil já era
   resolvido dentro do guard e descartado; sem ele os handlers de `users/[id]` não teriam o doc id do ator.
   Mudança aditiva, não quebra handler existente.
3. **`apps/api/__tests__/firestoreIndexes.test.ts` foi estendido** para cobrir a segunda entrada do arquivo
   versionado. O teste nasceu na PR #17 para um índice e agora vigia dois.
4. **Dois defeitos de UI do `Container` compartilhado apareceram só no navegador e foram corrigidos**: o
   `loading` desmontava o formulário de filtros a cada consulta, e o `loadError` escondia os filtros junto
   com a tabela, deixando o admin sem como desfazer o filtro que causou o erro. Os dois são do componente
   compartilhado, então a correção vale para qualquer tela futura que use o mesmo padrão.

**Nada disso é deriva de implementação** — os desvios do corte estão registrados à parte, na spec arquivada.
É escopo adicional. E vale a observação pela sétima PR seguida: **uma entrega está consertando, de
passagem, problemas que o backlog vinha listando**. Nesta rodada foram os dois defeitos do `Container`, que
ninguém tinha catalogado porque só aparecem com um formulário de filtros na tela — e nenhuma tela tinha um.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 1227 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-17 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/SECURITY.md:13` (guards) | "**Toda** rota da `apps/api` é embrulhada por um guard que roda antes da lógica" | **falso, e do jeito mais perigoso — afirma proteção que não existe.** Três rotas exportam handler nu: `health/route.ts:5`, `health/ready/route.ts:10` e `webhooks/payments/route.ts:29`. As três são exceções legítimas (sondas de plataforma e autenticação por assinatura da Stripe), mas o documento não as declarava | 🔴 **corrigido hoje** — passou a dizer "toda rota **de negócio**" e a nomear as três exceções |
| `docs/SECURITY.md:152` (higiene do `.env.example`) | pendente limpar Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks e BaseHub de `apps/api/.env.example` | **falso na direção oposta: o trabalho já foi feito.** `grep` pelas sete chaves no arquivo devolve **zero**; as 60 linhas restantes são só variáveis em uso | 🟡 **corrigido hoje** — a falsa pendência some da lista de alguém |
| `docs/PRE-PRODUCTION.md` (gate) | `pnpm check` em **555 arquivos**, suíte de **1091 testes em 112 arquivos** | **os dois envelheceram no merge da PR #18.** Medido agora: **583 arquivos**, **1227 testes em 124 arquivos**. As outras duas medições da mesma tabela (**24/24 tasks** e **10 de 10** configs com `testTimeout`) continuam corretas | 🔴 **corrigido hoje** — terceira rodada seguida com estes mesmos dois números |
| `docs/PAYMENTS.md:19` (stubs do webhook) | os handlers são stubs vazios em `route.ts:8-25` | **conteúdo confere, âncora não.** Os stubs estão em `:10-27`; `:8` é um `import` | 🟢 **corrigido hoje** |
| `docs/SECURITY.md:144` (assinatura do log) | a assinatura não aceita objeto — `log.ts:20` | **conteúdo confere, âncora deslocada uma linha** pela PR #18: o tipo `LogFieldValue` está em `:21` | 🟢 **corrigido hoje** |
| `docs/PRE-PRODUCTION.md` §1.2 e §1.3 (trilha de auditoria) | `/admin/audit` filtra por `involvedUserIds array-contains` + `createdAt` desc, o índice está declarado, nenhuma rota edita ou apaga evento, e os documentos não têm `expiresAt` | **confere item a item**, incluindo o `expiresAt` ausente — que é a pendência de retenção, documentada como tal | ✅ **honesto** já na estreia |
| `docs/PRE-PRODUCTION.md` §7 (declaração de cookies) | tabela por cookie, arquivo e categoria, com os sete gravados pelo repositório mais dois do Google | **confere.** As nove âncoras foram reabertas uma a uma | ✅ **honesto** pela segunda rodada |
| `docs/SECURITY.md:135` (rate limit) | roda sobre lista fechada de **8 caminhos**, casados por igualdade exata | **confere.** `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:42-51`) tem exatamente os 8 listados, e as 3 rotas de `/account` seguem fora | ✅ **honesto** pela quarta rodada |
| `docs/PAYMENTS.md` (estado geral) | não há fluxo de assinatura; sem `STRIPE_WEBHOOK_SECRET` responde `{ ok: false, message: "Not configured" }`; não existem `UserDTO.subscription`, `stripeCustomerId` nem rotas de `payments/` | **confere nos quatro.** `grep` por `stripeCustomerId` e `updateSubscriptionByReferenceId` devolve zero; `apiClient.payments` não existe | ✅ **honesto** pela sexta rodada — o único documento com esse histórico |
| `docs/PRE-PRODUCTION.md` (branch protection) | `protection` → 404, `rulesets` → `[]` | **confere, remedido hoje** via `gh api` | ✅ **honesto** |

> **Nota de método, nona rodada consecutiva.** Os números de gate envelheceram pela terceira vez seguida,
> pelo mesmo mecanismo de sempre. Mas esta rodada trouxe um caso novo e pior: `docs/SECURITY.md` mentia nas
> **duas direções ao mesmo tempo** — dizia protegido o que não é (linha 13) e pendente o que já foi feito
> (linha 152). O segundo tipo é mais barato de corrigir e mais caro de detectar, porque ninguém desconfia de
> uma lista de tarefas que ainda tem itens. **A regra prática que sai daqui: auditar afirmação de pendência
> com o mesmo rigor da afirmação de entrega.** Uma pendência falsa custa o tempo de quem for executá-la.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **6 das 8 specs** que seguem em `specs/`, e **uma deriva de implementação
real** na spec entregue. As duas intactas são `onboarding-flow` (âncoras e contagens exatas pela terceira
rodada seguida — a única com esse histórico) e `e2e-testing` no que toca a âncoras, embora suas contagens
estivessem erradas.

**A deriva de âncora desta rodada tem uma única causa**: a PR #18 inseriu linhas **no meio** de seis
arquivos muito citados — `queryKeys.ts`, `log.ts`, `packages/sdk/src/client/index.ts`, os dois guards e
`account/sessions/revoke/route.ts`. Inserção no meio é o padrão que mais desloca âncora; acréscimo no fim
não desloca nada.

### Deriva de implementação — `audit-log`

Três, todas registradas na spec arquivada. Nenhuma foi erro de execução: as três foram decididas no
`/analyze` e documentadas.

| especificado | implementado | leitura |
|--------------|--------------|---------|
| "início/fim de impersonação" | Um documento por par ator–sujeito **a cada janela de 15 minutos**, com id determinístico e `create()` que falha em `ALREADY_EXISTS` (`audit-recorder.ts:56-67`) | **A implementação desviou, com motivo.** Um endpoint de marco `start`/`end` esbarraria em duas regras da própria spec: nenhuma escrita exposta ao cliente, e `assertReadOnlyWhileImpersonating` recusa `POST` com o contexto ativo. **Custo aceito:** não existe instante exato de saída |
| Três ações sensíveis | Cinco — mais `account.sessions.revoke` e `account.password.change` | **A spec estava incompleta, e ela mesma dizia isso** nas linhas 53-66. Custo marginal de uma chamada por handler |
| Sinal de pronto: "um admin entra, **altera algo** e sai" | Entra, **lê** e sai | **A spec estava errada.** Alterar sob impersonação foi bloqueado em `impersonation-read-only`, entregue depois de a spec ter sido escrita |

### Âncoras deslocadas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`dashboard-home`](dashboard-home.md) | `queryKeys.ts` `:16` (`entities`), `:22` (`users`), `:30` (`health`) | **`:29`**, **`:35`**, **`:43`** | PR #18 inseriu o grupo `auditEvents` (`:16-28`) no meio do arquivo |
| [`observability-logging`](observability-logging.md) | `log.ts:50-56`, `:5-13`, `:20`, `:26-28`, `:55` | **`:51-57`**, **`:5-14`**, **`:21`**, **`:27-29`**, **`:56`** | PR #18 acrescentou o escopo `audit` à união fechada, deslocando o resto do arquivo em 1 linha |
| [`billing-subscription`](billing-subscription.md) | `client/index.ts:13-18` (6 actions) e `common-panel.ts:29` | **`:14-20`** (7 actions) e **`:31`** | a action `audit` entrou no barril; o guard ganhou a gravação da trilha |
| [`data-rights-lgpd`](data-rights-lgpd.md) | `users/[id]/route.ts:75` (`DELETE`), `account/password/route.ts:15`, `sessions/revoke/route.ts:4` | **`:101`**, **`:18`**, **`:7`** | as três rotas ganharam a chamada de trilha e o import correspondente |
| [`teams-organizations`](teams-organizations.md) | `admin.ts:27`, `common-panel.ts:29` | **`:29`**, **`:31`** | `actorProfile` no contexto do guard de admin; trilha de impersonação no de painel comum |
| [`account-security-mfa`](account-security-mfa.md) | `sessions/revoke/route.ts:4` | **`:7`** | import do `audit-recorder` empurrou o `POST` |

Corrigidas as seis specs no disco (onze âncoras ao todo). Além delas, três âncoras de documentação
(`docs/PAYMENTS.md:19`, `docs/SECURITY.md:144` e a referência a `readiness.ts` em três pontos de
`observability-logging`).

### Contagens erradas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`e2e-testing`](e2e-testing.md) | 1091 testes em 112 arquivos · `apps/api` 410 em 38 · `apps/app` 307 em 43 | **1227 em 124** · **511 em 46** · **342 em 47** | Quarta rodada seguida com os números desta seção errados. O mecanismo é sempre o mesmo, e já não é erro de método: contagem de teste não sobrevive a uma PR. A spec agora diz a data da medição |
| [`billing-subscription`](billing-subscription.md) | **19** `route.ts` · **seis** actions no SDK | **20** · **sete** | `audit-events/route.ts` e a action `audit` |
| [`dashboard-home`](dashboard-home.md) | **6** hooks · **4** grupos em `queryKeys.ts` · **19** rotas | **7** · **5** · **20** | o hook `useAuthorizedInfiniteQuery` era da PR #17 e passou despercebido na rodada anterior; os outros dois são da #18 |
| [`data-rights-lgpd`](data-rights-lgpd.md) | **7 grupos, 19 `route.ts`** | **8 grupos, 20** | grupo `audit-events` |
| [`observability-logging`](observability-logging.md) | `LogScope` com **oito** valores · **14** pontos de log | **nove** · **16** | escopo `audit`; os 2 novos pontos são o caminho fail-open da trilha (`audit-recorder.ts:112,163`) |
| [`dashboard-home`](dashboard-home.md) | **8** breadcrumbs usando `routes.root.label`, 3 no admin | **9**, **4** no admin | a tela de trilha acrescentou um. O número da chave do painel comum (**5**) não mudou |
| [`teams-organizations`](teams-organizations.md) | "quinta rodada" sem as contrapartidas | **sexta** | Contador de rodadas, não de código |

### O que a auditoria **não** encontrou

Vale registrar pelo que não obriga a fazer: nenhuma spec `done` regrediu, nenhuma entrega parcial ficou
órfã, e nenhuma feature em `docs/features/*/STATE.md` está sem `spec:` correspondente quando deveria ter.
`docs/features/audit-log/STATE.md` já trazia `spec: audit-log` no frontmatter, então o arquivamento não
precisou tocá-lo.

**Uma inconsistência de pipeline, sem efeito sobre a entrega:** `docs/features/audit-log/STATE.md` registra
a etapa `review` como `in-progress` enquanto `test` está `done` e a PR foi mergeada. O estado gravado ficou
para trás do que aconteceu. Não foi corrigido aqui — a auditoria do backlog não é dona daquele arquivo
além do campo `spec:`.

## Achados — correções pontuais, não specs

Coisas que não merecem spec própria (não são funcionalidade, não têm corte de MVP), mas que são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-17.** Os achados da rodada anterior foram reconferidos contra o código, um a um.
> **Placar: 1 fechado · 3 novos · o resto intacto e confirmado no disco.**

### Achado fechado

| achado | como fechou |
|--------|-------------|
| ✅ **`apps/api/.env.example` carregava sete chaves do upstream que ninguém usa** (Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks, BaseHub) | Já estava limpo. `grep` pelas sete devolve **zero** nas 60 linhas do arquivo. O que sobrevivia era a **pendência em `docs/SECURITY.md:152`**, afirmando um trabalho por fazer que já fora feito — corrigida hoje. Não dá para dizer qual PR limpou: o achado vinha sendo copiado de rodada em rodada sem ser remedido |

### 🆕 Achados novos, herdados da PR #18

Os três foram levantados pela revisão da própria entrega, registrados como 🟡 e deixados em aberto. Os três
foram reconferidos no disco nesta auditoria.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | O `select` é alimentado por `useListUsers()`, que só lista quem existe. O evento de exclusão **foi projetado para sobreviver ao usuário** (`users/[id]/route.ts:115` lê o rótulo antes de apagar), e é justamente ele que o filtro não consegue selecionar. O dado está lá e a UI não chega nele |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | `catch { return null; }` sem `logEvent`. Degradar para evento sem rótulo é a decisão certa e está documentada no docblock; o problema é não deixar rastro de que degradou. Numa investigação, "evento sem rótulo" e "Firebase Auth fora do ar" ficam indistinguíveis |
| 🟡 **O `DateInput` compartilhado formata data e calendário sempre em inglês** | `packages/design-system/components/ui/date-input.tsx:83` | `format(selected, "PPP")` do `date-fns` sem a opção `locale`. Era latente enquanto ninguém usava o componente; a trilha estreou o primeiro filtro de data do produto e tornou visível. Vale para qualquer fork em qualquer idioma — é da mesma família do `"Pick a date"` logo abaixo |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#4) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports` |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o primeiro import do `apps/api/proxy.ts:1` — o middleware, que roda em toda requisição | `packages/security/index.ts:11` | `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot — e `instrumentation.ts:26-30`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:20-24`) e **não há `process.exit` em nenhum lugar do arquivo** | `apps/api/instrumentation.ts:20-24` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. ✅ Mitigação parcial: `/health/ready` consulta o Firestore, então um health check apontado para ele detecta parte dessas falhas. Não detecta esta em específico — o processo sobe e o Firestore responde |
| ⚠️ **As 3 rotas de `/account` não estão no rate limit** — incluindo troca de senha, alvo clássico de força bruta | `apps/api/proxy.ts:42-51` | Casamento exato (`includes`), decisão consciente para não limitar `/auth/sign-in/google` duas vezes. Mas rota nova nasce sem limite, e as de conta nasceram assim. 🆕 **A PR #18 acrescentou a quarta rota fora da lista** (`/audit-events`), embora essa seja de leitura e sob `requireAdminApi`. Registrado em `docs/SECURITY.md` |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| ◐ **Dependência importada sem ser declarada — uma metade fechada, duas abertas.** ✅ `apps/app/package.json` passou a declarar `@repo/analytics` (PR #16). 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` e `apps/app/package.json` **não declara** `@repo/email` (reconferido: 0 ocorrências). 🟡 `apps/web` importa `@repo/auth/provider` em **5 arquivos** de produção e `apps/web/package.json` **não declara `@repo/auth`** (reconferido: 0 ocorrências) | `apps/app/package.json` · `apps/web/package.json` | Funciona por hoisting do pnpm. Além do risco de resolução, **o turbo não invalida `web#*` quando `@repo/auth` muda** — cache mentindo num gate que roda em toda PR. O caso da `web` é o pior dos três: é runtime, não só `keys.ts` |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` **não existe**. Zero importadores, falha em silêncio. **Décima quarta auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` de todo o resto | `packages/auth/package.json:25` | É o único workspace fora da major. Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | `grep ChartContainer` fora do próprio arquivo ⇒ **0**, reconferido. Reexportado no barril (`components/ui/index.ts:8`). `dashboard-home` (**agora o #1**) é a spec que o resgataria — o achado e a recomendação de prioridade apontam para o mesmo lugar pela primeira vez |
| 🟡 **`input-otp.tsx` é código morto**, sem consumidor fora do barril e do catálogo do `playground` | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: 0 consumidores. `account-security-mfa` (#6) é a spec que o usaria. ⚠️ Cuidado ao medir: `InpuTOTP` casa com um `grep -i TOTP` e produz falsos positivos |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` seguem instalados e nunca importados** | `apps/app/package.json:27,36` | São as dependências típicas de OTel/Sentry. As PRs #15 a #18 passaram sem tocá-las, o que confirma que são peso morto e não semente de nada |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-11` | Falta o subpath `"./utils/*"` (consumidor externo não alcança `utils/cookies.ts`), e o `"."` (`:6`) aponta para `index.ts`, **que não existe** — reconferido no disco |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | O campo vizinho `requestId`, nascido na mesma entrega, **foi ligado até a tela**. Dois campos em linhas adjacentes, só um chegou ao usuário. ⚠️ Há um `retryAfterSeconds` **homônimo de outro tipo** em `apps/api/proxy.ts:102` |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — oitavo ciclo | `packages/auth/client.ts:224` | A única cobertura é `apps/app/__tests__/useEmailVerification.test.tsx`, que a **mocka** |
| 🟡 **`packages/shared` é o único pacote com `test` e sem `typecheck`** | `packages/shared/package.json:11` | O pacote hospeda o helper de log e o `requestErrorReporter`, e a imunidade a `Error` do `logEvent` é garantida pelo **tipo**, que nenhum gate deste workspace verifica. Fica coberto de lado pelo `typecheck` dos consumidores; não pelo próprio |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `delete()` herdado por todo repositório é **soft delete** — chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:196-198` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` (#2) — e deixa **duas** famílias de objeto órfãs no bucket. 🆕 **`AuditEventRepository` é o primeiro repositório a recusar o herdado**, lançando `AuditEventImmutableError` (`audit-event.repository.ts:100-106`) — precedente útil para quem for mexer nisso |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32-43` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth, e descarta linhas em silêncio (`:42`). O N+1 do Admin SDK está em `:38-40`. **Não foi migrado para o cursor**, por decisão explícita da spec arquivada. 🆕 **Ganhou um segundo consumidor na PR #18**: o filtro de usuário da trilha de auditoria, que herda o N+1 e a lista não paginada |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. Seguem órfãs — o SDK chama `/auth/me`, `/auth/sign-in/google` e as rotas de senha, nunca estas. A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:67` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | A assinatura **é** validada (`:45`); nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#4) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:46` | `pnpm --filter api dev:with-stripe` **não pode funcionar**. Duas das três chaves afetadas já foram resgatadas por redeclaração (`FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_APP_URL`), **com comentário nomeando esta armadilha** — esta ficou de fora |
| ◐ **`skipValidation` na `apps/web` é incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` | `apps/web/env.ts:27,13-19` | O CTA "Ir para o painel" da landing cai no fallback em `hero.tsx:44`, `cta.tsx:35`, `header/index.tsx:35-36` e `pricing/page.tsx:77,120`. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189-202` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada** — UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL redescobre o mesmo defeito |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | O idioma escolhido **não sobrevive ao fechamento do navegador**. Nem o `x-theme` nem o `bp:cookie-consent` herdaram o defeito — os dois são gravados só pelo cliente |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** por padrão; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. ◐ **Meio fechado pela PR #16:** o helper passou a aceitar `secure` como opção, e o cookie de consentimento a usa em produção. `x-locale` e `x-theme` continuam sem |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru | `packages/sdk/src/client/base.ts:45,53,61,95` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu às PRs #11 a #18.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder`. 🆕 **Deixou de ser teórico**: a PR #18 estreou o primeiro filtro de data do produto, e o mesmo componente carrega o defeito de locale registrado acima |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`, nos **dois** apps), `"Início"`, `"Home"` | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` · as duas `page.tsx` de home `:7` | Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, e está nos dois apps. O `PageBreadcrumb` ainda crava `href="/painel"` em `:29`. As duas homes são escopo do #1 |
| 🟡 **A mensagem de erro padrão do repo inteiro está cravada em pt-br dentro de um pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | `"Um erro inesperado aconteceu"` é o retorno de **todo** erro que não é `FormattedError` — o fallback que qualquer fork mostra quando nada mais funciona, em espanhol e em inglês também. A função ao lado (`withRequestId`) **lê o dicionário corretamente** para o rótulo do identificador, o que torna a omissão mais visível |
| 🟡 **`apps/web/…/sign-in/validations/signInSchema.ts:9` crava a mensagem de validação em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | `"A senha deve ter pelo menos 6 caracteres"` fora do dicionário. Os outros nove sítios de `MIN_PASSWORD_LENGTH` passam por `validation.passwordMin` |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:29-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem; as deps `[api, current]` reagendam a cada tick. É a home da landing |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:11` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo. ⚠️ Segue com urgência: existe `/health/ready`, e é provável que alguém queira consumi-lo pelo mesmo hook |
| 🟡 **`provider-error` não distingue as falhas do provedor** — cota estourada, domínio não verificado e chave revogada produzem o mesmo `reason` | `packages/email/index.ts:120-130` | Descartar o objeto de erro é **correto e deliberado**. A assimetria criada pela PR #15 segue: `@repo/email` manteve o próprio `logEmail` (`:39-49`) em vez de usar o `logEvent` compartilhado — mesmo formato, código duplicado, e o teste de privacidade vigia só esta cópia |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | O form não tem `<form>`, nem handler, nem import da action — que **existe e tem teste** e zero chamadores de produção |
| 🟡 **O rodapé da `apps/web` consome `data-cookie-banner` sem teste que fixe o acoplamento** | `apps/web/app/[locale]/components/footer.tsx:56` | O banner publica o atributo e dois layouts o leem. O lado da `apps/app` tem teste (`apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`); o da `web` não, porque a suíte dela roda em `environment: "node"`, sem jsdom. Renomear um dos dois lados quebra o rodapé em silêncio |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito. O documento ganhou a seção 1.3 (trilha de auditoria) na PR #18, e teve os
> números de gate corrigidos nesta auditoria.

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | 🆕 🔴 **O índice composto da trilha de auditoria precisa ser publicado.** Sem ele, o **filtro por usuário** de `/admin/audit` responde 503 `PAGINATION_INDEX_MISSING` — degradação deliberada e traduzida, mas o recurso fica pela metade. A listagem e o filtro de período funcionam sem ele | `PRE-PRODUCTION.md` §1.2 | ~5 min + construção |
| 2 | 🔴 **O índice composto da listagem paginada de `entity` precisa ser publicado.** Sem ele, `GET /entities` responde `PAGINATION_INDEX_MISSING` em produção e a tela fica vazia. ⚠️ **O emulador não cobra índice composto**, então nada no gate local pega isto — e agora são **dois** índices nessa situação | `PRE-PRODUCTION.md` §1.1 | ~5 min + construção |
| 3 | 🆕 **A retenção da coleção `auditEvent` não foi decidida.** Os documentos não têm `expiresAt` e nada expurga. É a decisão nº 7, e cresce com o uso de cada fork | `PRE-PRODUCTION.md` §1.3 | decisão + ~10 min |
| 4 | **Backfill de instantes em base que já tem dado.** Antes da PR #17 o `update()` regravava `createdAt` como string ISO; o Firestore ordena por tipo antes de valor, então registros já tocados por um `PUT` ficam fora da ordenação. O script existe e tem dry-run | `PRE-PRODUCTION.md` §1.4 | ~10 min por coleção |
| 5 | **`main` não tem branch protection.** O pré-requisito caiu na PR #13 e continua satisfeito — o gate fechou 24/24 sem cache. Remedido hoje: `protection` → 404, `rulesets` → `[]` | `PRE-PRODUCTION.md` | **minutos** |
| 6 | **Ninguém vigia a trilha de erro.** O `onRequestError` está plugado nos três apps e escreve no stdout; nenhum coletor está ligado e nenhum alerta é disparado. `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve zero, remedido hoje. É o resíduo de `observability-logging` | `PRE-PRODUCTION.md` §11 | P + conta em provedor |
| 7 | **O health check da plataforma não aponta para `/health/ready`.** A rota existe e responde 503 quando o Firestore não atende em 2 s; enquanto ninguém a configura, a plataforma segue olhando `/health`, que responde OK com o banco fora do ar | `PRE-PRODUCTION.md` §11 | ~2 min |
| 8 | **`SESSION_COOKIE_DOMAIN` precisa estar definida se `web` e `app` rodarem em subdomínios distintos.** Sem ela o cookie de consentimento fica host-only e o visitante responde ao banner **duas vezes**. Degrada, não quebra — e **não aparece em desenvolvimento**, porque em `localhost` o browser ignora a porta | `PRE-PRODUCTION.md` §7 | ~2 min |
| 9 | **A política de privacidade linkada pelo banner não menciona cookies.** Ver a decisão nº 5 | `PRE-PRODUCTION.md` §7 | P (texto) |
| 10 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados" — com **dois** consumidores. Exige plano **Blaze**. 🆕 **Agora também trava metade do item 3 de `data-rights-lgpd`** (#2 da ordem) | `PRE-PRODUCTION.md` | cartão + ~15 min |
| 11 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 12 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações | `PRE-PRODUCTION.md` | P |
| 13 | **Contas de QA acumuladas: 15.** A PR #18 não acrescentou nenhuma — o `/test` dela rodou contra o emulador, como o da #17. Uma das antigas (`qa-account-settings-b@`) segue **inutilizável**: apagar, não reusar | `PRE-PRODUCTION.md` | P |
| 14 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 15 | **O login com Google nunca teve passe manual com conta real.** ⚠️ A única que continua existindo só aqui. O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta | *(só neste arquivo)* | ~2 min |
| 16 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** Depende da pendência 10; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#5) | `PRE-PRODUCTION.md` | ver #10 |
| 17 | ✅ ~~**A retenção de log da plataforma nunca foi conferida, e o passo não tinha prazo escrito.**~~ **Metade resolvida pela PR #18:** o prazo agora está escrito em `docs/PRE-PRODUCTION.md:395-409`, com fonte (Marco Civil art. 15, art. 5º VIII, Decreto 12.975/2026) e com as três distinções que evitam a generalização falsa. **O que resta é conferir o número no painel do provedor** | `PRE-PRODUCTION.md` §11 | ~5 min |
| 18 | **O item de reabertura do consentimento no `ProfileDropdown` nunca foi visto num browser.** Coberto por teste jsdom (`apps/app/__tests__/profileDropdownCookieConsent.test.tsx`), não por passe visual | *(só neste arquivo)* | ~2 min com emulador de pé |

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | Mantém o argumento das três rodadas anteriores. A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Deixou de ser "adotar observabilidade" e virou "ligar um fio de esforço P". Depende da decisão nº 1. |
| **Exportar a trilha de auditoria · expurgo automático** | — | 🆕 Explicitamente fora do corte de `audit-log`, arquivada. As duas dependem de decidir o prazo de retenção, que é a decisão nº 7. O expurgo vira tarefa direta assim que houver prazo. |
| **Alerta em tempo real sobre ação sensível** | — | 🆕 Fora do corte de `audit-log`. Depende de `observability-logging` ter um coletor do outro lado — hoje não tem. |
| **Auditar toda escrita de qualquer recurso** | — | 🆕 Fora do corte de `audit-log`, com o motivo escrito na spec: começa caro, envelhece mal e gera ruído. A trilha cobre cinco ações sensíveis, não o CRUD inteiro. |
| **Busca textual no servidor** | — | Explicitamente fora do corte de `cursor-pagination`, arquivada. Com a paginação, o `searchFields` da tabela passou a filtrar só a página carregada; a PR tratou o sintoma avisando o usuário. A trilha de auditoria herdou o mesmo comportamento. Ver a decisão nº 6. |
| **Contagem total de registros na listagem** | — | Fora do corte de `cursor-pagination`. No Firestore custa uma agregação à parte, e "carregar mais" não precisa dela. |
| **Registro auditável de consentimento** | — | Fora do corte de `cookie-consent`, arquivada. Prova de consentimento é obrigação do controlador e hoje a escolha vive só no navegador do titular. 🆕 **`audit-log` foi entregue sem absorvê-lo** — a trilha registra ação de admin e de conta, não consentimento. Resta `data-rights-lgpd` (#2) como candidato natural, e ela ainda não o declarou. |
| **CMP certificada de terceiro · TCF do IAB · geolocalização do visitante** | — | Fora do corte de `cookie-consent`, arquivada. As duas primeiras arrastam serviço pago para todo fork; a terceira parece economia e é fonte de bug e de dúvida jurídica. |
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. |
| Firebase App Check | — | Explicitamente fora do corte de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** A action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P — vai direto ao `/analyze`. |
| **Migrar a listagem de usuários para o cursor** | — | Fora do corte de `cursor-pagination`, arquivada. `userRepository.list()` carrega um N+1 do Admin SDK: paginá-la sem resolver isso entregaria uma listagem que faz uma chamada de rede por linha. 🆕 **Ganhou um segundo consumidor na PR #18** (o filtro da trilha), o que aumenta o custo de adiar. Tarefa própria, e o N+1 vem primeiro. |
| Provedor de e-mail plugável (SES/Postmark) · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`, arquivada. Reabrir exige spec nova. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, arquivada. O `POST /files` ficou genérico de propósito. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`, arquivada. A exclusão de conta virou [`data-rights-lgpd`](data-rights-lgpd.md) e as sessões viraram [`account-security-mfa`](account-security-mfa.md); a **troca de e-mail** continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, arquivada. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#5). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Explicitamente fora do corte de `observability-logging`. A nota de pesquisa registra o conflito entre Sentry v8+ e `@vercel/otel`, que quebra a propagação de trace em silêncio — má primeira dívida para um MVP. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional que manter no core. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. O pré-requisito está satisfeito há cinco rodadas. Reavaliar junto com o branch protection. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição, e como opt-in por variável ausente. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **10** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois. Cruza com `e2e-testing` (#5). |
| Changesets / versionamento · Storybook | — | Com pacotes `private: true` e forks que divergem, o valor do changelog não paga o processo. O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
