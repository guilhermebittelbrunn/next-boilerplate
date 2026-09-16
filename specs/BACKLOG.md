# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-16 (`/spec --sync`, pós-merge da PR #15) · anteriores: 2026-09-16 (PRs #13
> e #14) · 2026-09-15 · 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 ·
> 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **Nenhuma spec foi arquivada, e é a informação mais importante daqui.** A PR #15 entregou
>    `observability-logging` quase inteira — **4 dos 6 itens do corte confirmados no código**, mais um
>    cumprido de forma trivial —, mas o item 1 pede que o erro chegue a quem opera, e ninguém é notificado.
>    Entrega parcial não vira `done`. Ver [Estado da entrega](#o-caso-observability-logging).
> 2. **Uma afirmação falsa em `docs/SECURITY.md`, corrigida hoje.** O documento dizia que o rate limit roda
>    "apenas em `/auth/sign-in`, `/auth/sign-up` e `/auth/sign-in/google`". São **8 caminhos** desde a PR
>    #11 — as rotas de recuperação de senha, as de verificação de e-mail e `/files` entraram e o documento
>    não acompanhou. A auditoria anterior declarou este arquivo "honesto, 17/17"; estava errada.
> 3. **`account-security-mfa` teve a mesma contagem corrigida duas vezes, e as duas estavam erradas.** O
>    `MIN_PASSWORD_LENGTH = 6` não está em 2 nem em 5 schemas: está em **10**. A contagem de 5 olhou só
>    para `apps/app` e deixou de fora os **3 schemas de `apps/api`**, que são justamente os que importam.
> 4. **Deriva em 9 das 11 specs, com 4 inversões semânticas.** Duas delas em `audit-log`, que afirmava não
>    existir logger estruturado e não haver instrumentação plugada no `onRequestError` — as duas coisas
>    passaram a existir no commit que a auditoria estava conferindo.
> 5. **O #1 mudou de dono.** `observability-logging` saiu do topo por estar entregue em quase tudo, e o
>    lugar foi para `cookie-consent`, que vinha em segundo há cinco rodadas.

## Contadores

Sobre as **11 specs que seguem em `specs/`**. Recontados do disco em 2026-09-16, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 9 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 8 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 4 · `confianca` 4 · `dx` 3. **Por esforço:** P 0 · M 8 · G 3. **Por valor:**
alto 8 · médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 0.** É a primeira rodada em seis sem nenhuma spec arquivada, e não é
porque nada foi entregue — a PR #15 entregou bastante. É porque o que ficou de fora do corte é o item que
dá nome ao problema da spec. Ver abaixo.

### O caso `observability-logging`

A PR **#15** foi mergeada em `main` em 2026-09-16T17:01:02Z (merge commit `f8322f1`), com CI `success`
nesse SHA. Os seis itens do corte foram reconferidos um a um no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Erro não tratado coletado nos três apps, chegando a quem opera | **parcial** | `apps/api/instrumentation.ts:36-37`, `apps/app/instrumentation.ts:4-5`, `apps/web/instrumentation.ts:4-5` → `packages/shared/utils/helpers/requestErrorReporter.ts:39-53`. O gancho emite trilha; **não há coletor e ninguém é notificado** |
| 2. Identificador por requisição | **implementado** | `apps/api/proxy.ts:118` gera, `:157` repassa ao handler, `:71-72` carimba na resposta; `formattedError.ts:117` lê de volta |
| 3. `console` cru substituído nos fluxos críticos | **implementado** | `webhooks/payments/route.ts:61,69` · `users/route.ts:73` · `auth/sign-up/route.ts:40` |
| 4. Endpoint de saúde deixa de mentir | **implementado** | `health/route.ts:3` (`force-dynamic`) · `health/ready/route.ts` · `(shared)/lib/readiness.ts:31-56` |
| 5. Camada no-op sem a variável do serviço | **implementado**, trivialmente | zero dependência nova, zero env nova |
| 6. Código morto de analytics removido | **implementado** | entregue por tabela em 2026-09-01 |

**Por que não virou `done`.** O item 1 pede que o erro "chegue a quem opera sem o cliente precisar avisar",
e os sinais de pronto da spec pedem alerta rastreável no webhook de pagamento. O que existe é registro
rastreável — a linha sai no stdout, a plataforma a indexa, e alguém ainda precisa ir olhar. A diferença
entre as duas coisas é o problema que a spec descreve no primeiro parágrafo.

**Por que isso não é falha da entrega.** Adotar um coletor gerenciado exige conta em provedor, e
[`.claude/cycle-policy.md`](../.claude/cycle-policy.md) proíbe provisionar infraestrutura numa rodada
autônoma. A decisão é a **pergunta em aberto nº 1 da própria spec**, escrita na semeadura e nunca
respondida.

**O que a auditoria recomenda, sem aplicar:** fechar a spec como entregue e abrir uma spec própria de
esforço P para o coletor, em vez de manter uma spec quase inteira parada por um item que depende de
decisão de produto. A alternativa — manter aberta até o coletor existir — também é defensável, e é a que
está valendo enquanto ninguém decide. Ver [Precisam de decisão](#precisam-de-decisão).

**Efeito colateral no cálculo:** `in-progress` fica fora do conjunto elegível, então esta spec não entra
nos lotes paralelos nem pode ser recomendada como próxima. Isso é o comportamento certo, por acidente: o
resíduo dela é a única coisa no backlog que uma rodada autônoma não consegue terminar.

## Gates — medidos nesta auditoria

Executados agora, com `--force`. Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **532 arquivos · 0 erros** (`No fixes applied`, 287 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **23/23 tasks · 0 em cache · 50,4 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-16 (PRs #13/#14) |
|-----------|---------:|-------:|-------------------------------|
| `api` | 35 | 371 | +2 arquivos · **+25** |
| `app` | 38 | 274 | +2 arquivos · **+9** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 6 | 62 | — |
| `@repo/shared` | 4 | 40 | +3 arquivos · **+25** |
| `web` | 5 | 31 | +1 arquivo · **+4** |
| `@repo/security` | 3 | 31 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **102** | **981** | **+8 arquivos · +63 testes** |

CI: a execução de merge de **#15** (`f8322f1`) está em **`success`**, assim como as 13 anteriores. A branch
de trabalho desta auditoria é `dublin`, cujo `HEAD` é `f8322f1` — nenhum commit do repositório está fora de
`main`.

**O gate segue estável.** As 9 configs de Vitest declaram `testTimeout: 20_000` desde a PR #13, e o gate
fechou 23/23 com 63 testes a mais que na rodada anterior, em tempo praticamente igual (50,4 s contra
50,7 s). O pré-requisito do branch protection continua satisfeito, e o branch protection continua não
ligado: `gh api …/branches/main/protection` devolve **404** e `rulesets` devolve `[]`, remedidos hoje.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
Nenhuma spec está bloqueada por dependência.

> **Um critério ganhou peso nesta rodada: o que uma rodada autônoma consegue provar.** O `/cycle` não
> provisiona infraestrutura, então uma spec cujos critérios de aceite dependem de conta em provedor volta
> com metade dos critérios "não verificados". Isso não a torna menos valiosa — torna-a má escolha para
> **esta** forma de execução, e a distinção precisa estar escrita para não virar preconceito silencioso.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`cookie-consent`](cookie-consent.md) | **Sobe ao topo depois de cinco rodadas em segundo.** É a única spec do backlog que descreve uma **violação em curso**, não uma ausência de recurso: `packages/analytics/provider.tsx:15` monta o Vercel Analytics **incondicionalmente** e `:16` monta o GA checando só a env — nenhum consentimento, em todo o app. O inventário a declarar são **5** cookies, e a busca por banner ou componente de consentimento segue devolvendo só ruído. Barata de provar numa rodada autônoma: nada aqui depende de conta em provedor, e o caminho inteiro se exercita num browser local. Ficou mais barata ainda com a PR #12, que deixou pronto o padrão de ler cookie no servidor e aplicar no `<html>` sem piscar (`apps/app/app/layout.tsx:19,27-32`). |
| 2 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` sem `limit`, `orderBy` nem `startAfter`, e nenhum método aceita parâmetro de consulta. `startAfter`, `limit(` e `orderBy` dão **zero ocorrências** em `apps/api`. É a spec com o melhor argumento de **"fica mais caro depois"**: corrigir com dados em produção muda contrato do SDK, DTO, hooks e índices ao mesmo tempo. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 3 | [`audit-log`](audit-log.md) | O painel já tem impersonação e **nada registra quem entrou na conta de quem** — o switch é inteiramente client-side (`panelStore.ts:76-90`). São **18 handlers de escrita** e **zero** gravam evento, incluindo `POST /account/sessions/revoke`: hoje não dá para distinguir se quem derrubou as sessões foi o dono ou quem tomou a conta dele. **0 de 5.** A PR #15 barateou o trabalho sem fazê-lo: a convenção de log e o helper já existem, e o que falta é a persistência — trilha de log e trilha de auditoria são coisas diferentes. |
| 4 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto do backlog e ainda em **0/6**: não existe diretório `payments/` nas rotas, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`) sem dedupe por `event.id`. **Perdeu posição por um motivo de execução, não de mérito:** provar checkout, portal e webhook exige chaves reais da Stripe, e uma rodada autônoma devolveria os critérios como "não verificados". **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 5 | [`data-rights-lgpd`](data-rights-lgpd.md) | Obrigação legal com prazo, o argumento mais duro do backlog. Segue em 0/5, e a armadilha dos objetos órfãos continua dobrada: `deleteObjectQuietly` tem **2** call sites, ambos de troca, nenhum de expurgo. O `delete()` herdado é **soft delete** (`base.repository.ts:127-129`), então nem uma varredura por "documentos sem dono" resolveria. Esforço **G** é o que a segura fora do topo numa rodada autônoma. |
| 6 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze`, e a auditoria de hoje aumentou a dívida.** O item 2 do corte continua oco desde que a PR #12 passou a coletar nome e idioma na área de conta; e descobriu-se agora que a spec atribuía o gancho pós-cadastro ao lugar errado — ele está no `onSuccess` da mutation (`SignUpFormClient.tsx:114`), não no caminho de redirect que o onboarding precisaria interceptar. O trabalho é maior do que a spec descreve. `grep -rin onboarding` segue em **1 ocorrência**, e é um endereço de sandbox num fixture. |
| 7 | [`e2e-testing`](e2e-testing.md) | Destravada desde a rodada anterior, e sem o argumento mais forte que tinha — o gate instável foi corrigido pela PR #13 e não voltou. O que resta é sólido e mais lento de cobrar: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, nenhuma das 9 configs medindo cobertura, e **duas rules files sem um único teste de regra** (`firestore.rules` publicado em deny-all, `storage.rules` nem publicado) — sem desculpa, porque o emulador existe. Esforço **G** e `value: médio`. |
| 8 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são **11 linhas** e o literal `"Home"` — com a chave de dicionário pronta ao lado, já usada em 5 breadcrumbs. É a primeira tela de todo fork, e resgataria o `chart.tsx` (a dependência `recharts` pesa no bundle e nunca renderizou nada). Spec mais "presa" do conjunto elegível, apesar de `depends_on: []` — ver lotes. |
| 9 | [`account-security-mfa`](account-security-mfa.md) | **Cresceu nesta auditoria, e por isso não sobe.** O item 4 (política de senha) era descrito como mudança em 5 schemas de formulário; são **10 declarações**, e as 3 que importam estão em `apps/api` — ou seja, é mudança de contrato, não de formulário. Restam MFA (**3/10** de prevalência entre os starters pesquisados) e visibilidade de sessões (**1/10**). `value: médio` por mérito próprio, e agora com esforço provavelmente acima de M. |
| 10 | [`observability-logging`](observability-logging.md) | `in-progress`. Entregue em 5 dos 6 itens; o resíduo é adotar um coletor de erro, que depende de decisão de produto e de conta em provedor. **Fora do conjunto elegível** — ver [o caso](#o-caso-observability-logging). |
| 11 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora há **vinte e seis dias**. Ver [a decisão que não pode esperar a fila](#a-decisão-que-não-pode-esperar-a-fila). |

### O que **não** foi escolhido para #1, e por quê

- **`cursor-pagination`** foi o segundo colocado e a decisão mais difícil. Tem o melhor argumento de "fica
  mais caro depois" do conjunto: corrigir paginação com dados em produção mexe em SDK, DTO, hooks e índices
  de uma vez. Perdeu porque o custo dela **ainda não começou a correr** — sem volume, ler a coleção inteira
  é indistinguível de paginar. O custo do #1 já corre: todo fork que configurar o GA rastreia visitante
  antes de perguntar.
- **`audit-log`** tem o argumento mais desconfortável do backlog (impersonação sem registro), mas é a fatia
  mais larga das três candidatas — coleção nova, repositório novo e tela de admin — e disputa
  `base.repository.ts` e `firestore.indexes.json` com quem vier depois.
- **`billing-subscription`** tem o maior valor bruto e não foi escolhida por uma razão de execução, que
  merece ficar explícita: verificar checkout, portal e webhook exige chaves reais da Stripe, e esta rodada
  é autônoma. Seria entregar código que ninguém consegue provar hoje.
- **`data-rights-lgpd`** tem prazo legal e mesmo assim não foi ao topo: esforço **G** é má escolha para uma
  rodada autônoma.
- **`account-security-mfa`** e **`onboarding-flow`** estão as duas com o corte desatualizado em relação ao
  código — a primeira subdimensionava a política de senha pela metade, a segunda apontava o gancho
  pós-cadastro para o lugar errado. Reescopar antes de planejar.

## Lotes paralelos

Para rodar o ciclo completo em 2–4 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-16** a
partir do `contends_on` de cada spec, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis nesta rodada: 9 de 11.** Fora ficam `teams-organizations` (`deferred`) e
`observability-logging` (`in-progress`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `cookie-consent` · `cursor-pagination` · `billing-subscription` | provedor de analytics + os dois `layout.tsx` + barril de UI · `base.repository.ts` + `entity.repository.ts` + `table.tsx` + índices + ação `entity` do SDK · webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` | **apresentação/analytics**, **camada de dados de `entity`** e **slice `user` cobrado**. Repositórios distintos (`base`/`entity` × `user`) e pontos distintos do SDK (`actions/entity` × `client/index.ts`) |
| **2** | `audit-log` · `e2e-testing` · `onboarding-flow` | `base.repository.ts` + `users/[id]` + índices + barril do SDK + `queryKeys.ts` · `package.json` da raiz + `turbo.json` + `ci.yml` · `apps/app/proxy.ts` + resolvedor pós-login + `user-merge.ts` + `UserDTO` | **escrita de trilha na API**, **ferramental da raiz** e **desvio de navegação no app**. Encostam no `user` por caminhos distintos (`users/[id]/route.ts` × `user-merge.ts`) |
| **3** | `data-rights-lgpd` | `base.repository.ts` + `packages/auth/server.ts` + índices | sozinha: colide com `cursor-pagination` e `audit-log` no repositório base e nos índices, e com `account-security-mfa` em `packages/auth/server.ts` |
| **4** | `dashboard-home` · `account-security-mfa` | as duas `page.tsx` de home + `queryKeys.ts` + índices · `packages/auth/*` + `resolve-api-actor.ts` | **tela** e **camada de sessão**, sem interseção |

### Por que cada spec ficou de fora do lote 1

Distinguir os dois motivos importa: colisão é **dado**, teto é **decisão**.

- **`audit-log` colide com `cursor-pagination` duas vezes:** as duas alteram
  `apps/api/(shared)/repositories/base.repository.ts` **e** `firestore.indexes.json`.
- **`data-rights-lgpd` colide com `cursor-pagination` nos mesmos dois arquivos.** Não é acidente — as três
  precisam mexer no repositório herdado, uma para ensiná-lo a paginar, outra para registrar, a terceira
  para excluir de verdade.
- **`dashboard-home` colide com `cursor-pagination`** em `firestore.indexes.json`. É a spec mais "presa" do
  conjunto elegível, apesar de `depends_on: []`.
- **`onboarding-flow` colide com `billing-subscription`** em `packages/sdk/src/types/user/user.ts`: as duas
  precisam acrescentar campo ao `UserDTO`, uma para estado de perfil incompleto, a outra para assinatura.
- **`e2e-testing` e `account-security-mfa` não colidem com nada do lote 1.** Ficaram de fora **só pelo teto
  de 3**, que é escolha de custo de revisão e não impedimento técnico. Se você tiver fôlego para revisar
  quatro features amanhã, a de melhor posição na ordem é `e2e-testing`.

**O arquivo mais disputado do repositório continua sendo `firestore.indexes.json`**, citado por **5** das
11 specs. Em seguida, com 3: `apps/api/(shared)/repositories/base.repository.ts` e
`packages/sdk/src/client/index.ts`.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo e o arquivo que existe
para dizer a verdade sobre o repositório vira o pior conflito da noite. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por **processo**, não
por dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma *previsão* feita lendo o corte
de MVP, e uma previsão erra: duas features ainda podem brigar num arquivo que nenhuma das duas antecipou.

A régua desta rodada, com `observability-logging` como amostra: ela declarava **3** arquivos em
`contends_on` — `apps/api/instrumentation.ts`, `apps/api/proxy.ts` e o webhook de pagamento — e **acertou
os três**. Mas a PR tocou 57 arquivos, entre eles `packages/shared/utils/helpers/formattedError.ts` e
`handleClientError.ts`, os três `instrumentation.ts` de app, e `(shared)/lib/` inteiro da API. **Um desses
é `contends_on` declarado de outra spec:** nenhum, desta vez — o raio extra caiu quase todo em arquivos
novos ou em `packages/shared`, que nenhuma spec do backlog disputa.

**A previsão acertou o que declarou e subestimou o raio, pela terceira rodada seguida.** Se dois workspaces
do mesmo lote tocarem o mesmo arquivo por acidente, **isso é achado de auditoria** — corrija o
`contends_on` das duas specs na rodada seguinte, em vez de tratar como azar.

## Precisam de decisão

Nenhuma delas é da auditoria. Todas têm recomendação, e nenhuma foi aplicada.

| # | questão | recomendação |
|---|---------|--------------|
| 1 | **`observability-logging` fecha como entregue?** 5 dos 6 itens estão no código; o que falta é adotar um coletor de erro, que exige conta em provedor e é a pergunta em aberto nº 1 da própria spec. | **Fechar como `done`** e abrir uma spec nova de esforço P só para o coletor. Manter uma spec quase inteira aberta por um item que ninguém pode executar sem decisão de produto trava a spec e polui a fila. |
| 2 | **`teams-organizations` continua `deferred`?** Vinte e seis dias sem nenhuma das duas contrapartidas de esforço P que tornavam o adiamento honesto. | Ou as contrapartidas viram tarefa com dono, ou o status vira `rejected` até aparecer o primeiro fork B2B. Manter `deferred` sem elas é tomar a decisão por omissão. |
| 3 | **Ligar o branch protection na `main`?** O único pré-requisito técnico caiu na PR #13 e continua satisfeito. Hoje uma PR vermelha pode ser mergeada. | Ligar, exigindo o check do CI. Custo de minutos, e o risco de adiar cresce com o número de PRs. |
| 4 | **`account-security-mfa` e `onboarding-flow` precisam de reescopo antes do `/analyze`.** As duas têm o corte de MVP desatualizado em relação ao código, cada uma por um motivo diferente. | Rodar `/spec <id>` nas duas antes de planejar. Planejar sobre um corte errado custa mais caro que reescrever a spec. |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-16 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`cookie-consent`](cookie-consent.md) · [`dashboard-home`](dashboard-home.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |

> **Nenhuma spec em `specs/` está bloqueada por outra.** O que limita a paralelização é contenção de
> arquivo e o teto de revisão, não ordem lógica.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | ✅ `firestore-admin-access` |
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
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`). Entregou também, fora do corte, o `testTimeout` nas 9 configs de Vitest |

**Verificado nesta rodada:** `docs/features/` tem **11** pastas e **8** `spec.md` arquivados. A pasta nova é
`observability-logging`, cuja spec **continua em `specs/`** por decisão desta auditoria — não houve `git mv`
e não há duplicata. Os frontmatters das 8 arquivadas seguem coerentes (`status: done`, `feature: <slug>`).

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
aqui, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #15 entregou **além** do corte

1. **A migração de 11 call sites de log que já existiam**, não só dos que o corte citava. `storage.ts:82`,
   `entity-photo.ts:62`, `account-avatar.ts:45`, `auth-action-links.ts:26`,
   `auth/password/reset/route.ts:53` e `reset-request/route.ts:47` passaram todos pelo helper. Os dois
   clones que a spec usava como evidência da degradação por cópia deixaram de ser clones.
2. **`handleClientError` passou a emitir log estruturado no cliente**
   (`packages/shared/utils/helpers/handleClientError.ts:18`), que não estava no corte.
3. **O identificador de requisição chegou até a copy**, com chave nova no dicionário dos três idiomas.

**Nada disso é deriva de implementação** — o corte foi entregue como especificado, até onde foi. É escopo
adicional. E vale a mesma observação da rodada anterior, pela quarta PR seguida: **uma entrega está
consertando, de passagem, achados que o backlog vinha listando** — desta vez, sete pontos de log que
figuravam como 🟡 na lista de achados.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 981 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-16 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/SECURITY.md:135` (rate limit) | roda "**apenas** em `/auth/sign-in`, `/auth/sign-up` e `/auth/sign-in/google`" | **falso desde a PR #11.** `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:42-51`) tem **8 caminhos**: os três citados mais as duas rotas de recuperação de senha, as duas de verificação de e-mail e `/files` | 🔴 **corrigido hoje**, com a lista completa e o aviso de que casamento exato deixa rota nova sem limite |
| `docs/SECURITY.md` (log de bloqueio) | "um `console.warn` de uma linha" | desatualizado desde a PR #15: passa por `logEvent` (`apps/api/proxy.ts:63`) e carrega `requestId` | 🟡 **corrigido hoje** |
| `docs/PRE-PRODUCTION.md` §11 (observabilidade) | a API carimba `x-request-id`, emite log estruturado e expõe `/health/ready`; falta plugar coletor e apontar o health check | **confere item a item.** O cron órfão que esta linha cobrava foi removido em 2026-09-16 e o documento foi atualizado junto | ✅ **honesto**, e é o único documento que já nasceu medido |
| `docs/PRE-PRODUCTION.md` (gate) | 9 de 9 configs com `testTimeout`, gate em 23/23 | **confere.** Remedido hoje: 23/23 em 50,4 s, com 63 testes a mais | 🟢 **números atualizados hoje** (50,7 s → 50,4 s; 517 → 532 arquivos) |
| `docs/PRE-PRODUCTION.md` (branch protection) | `protection` → 404, `rulesets` → `[]` | **confere**, remedido hoje com `gh api` | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md` (Cloud Storage, rules, contas de QA) | serviço não ativado; `deny-all` em vigor; 15 contas, nenhuma nova no ciclo #15 | **confere nos três** | ✅ **honesto** |
| `docs/PAYMENTS.md` | não há fluxo de assinatura; handlers são stubs | **confere.** `webhooks/payments/route.ts:13,23` seguem com `// TODO` e o diretório `payments/` não existe | ✅ **honesto** pela terceira rodada |

> **Nota de método, sexta rodada consecutiva.** Todas as contradições apareceram por **medição direta**, e
> desta vez uma delas veio de um documento que a rodada anterior declarou limpo. O `docs/SECURITY.md` foi
> conferido em 2026-09-15 com o veredito "17/17, só deslocamento de linha" — e o erro não era de linha, era
> de conteúdo, plantado duas PRs antes. **Conferir âncora não é conferir afirmação**, e a auditoria
> anterior confundiu as duas coisas.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **9 das 11 specs**. As duas intactas são `teams-organizations` — que teve
os 9 sítios do predicado de posse reconferidos um a um, todos exatos — e `cookie-consent`, cujas âncoras
resistiram todas.

### As 4 inversões semânticas (a spec afirmava o contrário do código)

São as graves, porque quem segue a referência lê **o oposto** do que a spec diz. Todas corrigidas no disco.

| id | a spec afirmava | realidade | ação |
|----|----------------|-----------|------|
| [`audit-log`](audit-log.md) | "**Sem logger estruturado:** só `console.error/warn` avulso" | `logEvent` existe desde `f8322f1` (`packages/shared/utils/helpers/log.ts:50-56`), com escopo tipado e assinatura que recusa objeto | ✅ reescrita, e o argumento **sobrevivente** ficou explícito: trilha de log ≠ trilha de auditoria |
| [`audit-log`](audit-log.md) | "O gancho passou a existir — **nenhuma instrumentação de log foi plugada nele**" | `apps/api/instrumentation.ts:36-37` exporta `onRequestError = reportRequestError` | ✅ reescrita |
| [`account-security-mfa`](account-security-mfa.md) | o `MIN_PASSWORD_LENGTH = 6` está em **cinco** schemas (já corrigido uma vez, de "dois") | está em **dez**. A contagem de cinco olhou só `apps/app` e perdeu `apps/web` (2) e `apps/api` (3) | ✅ corrigida com tabela por app, e o dimensionamento do item 4 revisto de "mudança de formulário" para "mudança de contrato" |
| [`onboarding-flow`](onboarding-flow.md) | "esse mesmo `useEffect` dispara o e-mail de verificação" — usado para afirmar que já existe gancho pós-cadastro **no caminho do redirect** | `requestVerificationEmail` é `onSuccess` do `signUp.mutate` (`SignUpFormClient.tsx:114`) e roda **depois** de o redirect ser ordenado. O gancho existe, em outro lugar | ✅ corrigida; o item ficou **mais caro**, não mais barato |

Uma quinta, de natureza mais leve, ficou na fronteira: [`cursor-pagination`](cursor-pagination.md) dizia na
tabela de impacto que `firestore.indexes.json` está "hoje vazio", enquanto o corpo da própria spec, 54
linhas acima, já registrava que ele deixou de ser vazio em 2026-08-31. Spec contradizendo a si mesma —
corrigida.

### As âncoras deslocadas

Todas corrigidas no disco. Origem única: a PR #15 inseriu dois imports no topo de cinco arquivos de rota e
reescreveu o topo do `apps/api/proxy.ts`.

| id | quantas | onde |
|----|--------:|------|
| [`billing-subscription`](billing-subscription.md) | 8 | todas em `webhooks/payments/route.ts`, todas `+2` (`:27`→`:29`, `:43`→`:45`, `:8`→`:10`, `:11`→`:13`, `:18`→`:20`, `:21`→`:23`, `:50`→`:52`, `:54`→`:56`) |
| [`audit-log`](audit-log.md) | 6 | `instrumentation.ts` (`:12-31`→`:15-34`, `:17-21`→`:20-24`, `:23-27`→`:26-30`), `proxy.ts:45`→`:50`, e os 2 call sites que viraram `logEvent` |
| [`observability-logging`](observability-logging.md) | seção inteira | o inventário descrevia o repositório **antes** da entrega; reescrito contra o código de hoje |
| [`account-security-mfa`](account-security-mfa.md) | 3 | `isMintedBeforeRevocation` `:138-151`→`:153-166` e aplicação `:167`→`:182` (num bloco de citação que contradizia o corpo da spec); `auth/password/reset/route.ts:49`→`:51` |
| [`e2e-testing`](e2e-testing.md) | 3 | inventário **918 testes em 94 arquivos** → **981 em 102**; `apps/web/__tests__/` de 4 para 5 arquivos |
| [`billing-subscription`](billing-subscription.md) · [`dashboard-home`](dashboard-home.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | 3 | a contagem de rotas **18 → 19** nas três, pela `health/ready/route.ts` |
| [`cookie-consent`](cookie-consent.md) | 1 | `grep -rniE "consent\|cookie-?banner"` deixou de ser **0** e virou **1** — e é ruído (`create-dev-admin.mjs:27`, docblock). Registrado para não virar falso alarme |

**Nenhuma âncora quebrada** em nenhuma spec: nenhum arquivo citado sumiu e nenhum símbolo desapareceu.
**Nenhuma regressão detectada** nas capacidades das 8 specs arquivadas.

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação: retrofitar escopo por
organização é **reescrita, não refactor** (6/10 de prevalência, esforço G).

**Decidido em 2026-08-22:** `deferred` — adiar a implementação, **não** a decisão. O que torna o adiamento
honesto são duas contrapartidas de esforço P que **não dependem desta spec**:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — remedido hoje:
   `grep -ciE "b2b|b2c|organiza|tenant" docs/ARCHITECTURE.md` retorna **0**;
2. concentrar o predicado de posse num ponto único de escopo — remedido hoje: seguem **9 sítios em 3
   recursos**, todos reconferidos um a um, todos nas linhas que a spec declara.

**Nenhuma das duas foi feita até 2026-09-16** — os juros correm há **vinte e seis dias**:

| rodada | sítios do predicado | recursos |
|--------|--------------------:|---------:|
| até a PR #10 | 3 | 1 |
| PR #11 | 4 | 1 |
| PR #12 | 9 | 3 |
| PRs #13 e #14 | 9 | 3 |
| **PR #15** | **9** | **3** |

**A curva segue parada, pelo mesmo motivo da rodada anterior:** as três PRs desta janela foram de
infraestrutura, ferramental e observabilidade. Nenhum recurso novo nasceu escopado por usuário porque
nenhum recurso novo nasceu. O adiamento não ficou mais caro; também não ficou mais honesto.

> **Recomendação ao usuário, não decisão da auditoria:** duas rodadas seguidas sem as contrapartidas. Ou
> elas viram tarefa com dono no `/analyze`, ou este `deferred` deveria ser lido como `rejected` até o
> primeiro fork B2B aparecer.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados na descoberta e nos pipelines. **Não são funcionalidades** — são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-16.** Os **38** achados da rodada anterior foram reconferidos **um a um** contra o
> código. **Placar: 0 fechados · 4 com a redação errada · 2 com deriva de linha · 32 intactos · 3 novos.**
> A PR #15 não fechou nenhum: ela criou infraestrutura de log nova em vez de migrar `packages/auth`, que é
> onde estão 5 dos `console` cruas. O que ela fez foi **mudar de posição** dois achados e **afiar** um
> terceiro.

### 🟠 Achados cuja redação estava errada — corrigidos aqui

Separados porque um achado mal descrito é pior que nenhum: quem for consertá-lo procura a coisa errada.

| achado | o que estava escrito | o que o código mostra |
|--------|----------------------|------------------------|
| `packages/internationalization/utils/cookies.ts` "é inalcançável" | código morto | **Falso.** `packages/internationalization/client.ts:5` o importa por caminho relativo e há teste dedicado. O defeito real é mais estreito: falta o subpath `"./utils/*"` no `package.json`, então só **consumidor externo** não o alcança. **Achado novo na mesma linha:** o `package.json` declara `"." → "./index.ts"`, e `packages/internationalization/index.ts` **não existe** |
| `.env.example` da API "promete um desligamento que o código não entrega" (rate limit, `:15-18`) | contradição sobre rate limit | **Assunto errado e linha errada.** `:15-18` é o bloco `FIREBASE_ADMIN_*`. A contradição real está em `:26-29` e é sobre o **bucket de storage**: o comentário diz que esvaziar a variável desliga o upload, mas `env.ts:40-43` faz `OR` com `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. O comentário sobre rate limit (`:52-55`) **está correto** |
| Strings soltas: `"Início"` e `"Home"` no `PageBreadcrumb.tsx` | dois literais | O arquivo tem `"Início"` (`:30`), **não** `"Home"`. E tem um terceiro problema não registrado: `href="/painel"` cravado em `:29` |
| `provider-error` colapsa "três falhas" | três | São **dois** pontos de colapso (`packages/email/index.ts:121-122` e `:128-129`), cobrindo um conjunto aberto de resultados do provedor. A substância continua; a aritmética, não |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** tem o defeito gêmeo do que já foi corrigido no `index.ts`: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` (#4) é justamente o que faria alguém importar. Agrava: `packages/payments/package.json` não tem `exports` |
| 🔴 **`packages/security/index.ts:11` tem o mesmo defeito de escopo de módulo, num lugar pior.** `const arcjetKey = keys().ARCJET_KEY;` roda no **import**, e `@repo/security` é o primeiro import do `apps/api/proxy.ts:1` — o middleware, que roda em toda requisição | `packages/security/index.ts:11` | `keys.ts` trata `""` como ausente, o que cobre o `.env.example`; mas exige `.startsWith("ajkey_")`, então uma `ARCJET_KEY` **presente e malformada** lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot — e `instrumentation.ts:26-30`, que só checa presença, **não avisaria** |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo.** `register()` lança (`:20-24`) e **não há `process.exit` em nenhum lugar do arquivo** | `apps/api/instrumentation.ts:20-24` | Uma plataforma que só verifica se a porta responde veria o container **saudável** enquanto ele responde 500 a tudo. ✅ **Agora tem mitigação parcial:** `/health/ready` consulta o Firestore, então um health check apontado para ele detecta parte dessas falhas. Não detecta esta em específico — o processo sobe e o Firestore responde |
| ⚠️ **As 3 rotas de `/account` não estão no rate limit** — incluindo troca de senha, alvo clássico de força bruta | `apps/api/proxy.ts:42-51` | Casamento exato (`includes`), decisão consciente para não limitar `/auth/sign-in/google` duas vezes. Mas rota nova nasce sem limite, e as de conta nasceram assim. **Registrado hoje em `docs/SECURITY.md`**, que antes nem listava a lista completa |

### 🟡 Dependências, exports e código morto — intactos

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 `apps/app/app/layout.tsx:3` importa `@repo/analytics` **sem** `apps/app/package.json` declarar a dependência — funciona por hoisting do pnpm. Falta também `@repo/email` | `apps/app/package.json:15-22` | Além do risco de resolução, **o turbo não invalida `app#*` quando `@repo/analytics` muda** — cache mentindo num gate que roda em toda PR. E `cookie-consent` (#1) é justamente quem vai mexer em `@repo/analytics` |
| 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` sem declarar `@repo/email` | `apps/app/env.ts:1` | O `keys.ts` do pacote **valida de fato no boot** dos 3 apps. `apps/web` e `apps/api` **declaram**; só a `app` não |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido hoje: `client-ui.tsx` **não existe**. Zero importadores, falha em silêncio. **Décima primeira auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` de todo o resto | `packages/auth/package.json:25` | É o único workspace fora da major. Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | `grep ChartContainer` fora do próprio arquivo ⇒ **0**. `dashboard-home` (#8) é a spec que o resgataria |
| 🟡 **`input-otp.tsx` é código morto**, sem consumidor fora do barril e do catálogo do `playground` | `packages/design-system/components/ui/input-otp.tsx` | `account-security-mfa` (#9) é a spec que o usaria. ⚠️ Cuidado ao medir: `InpuTOTP` casa com um `grep -i TOTP` e produz 7 falsos positivos |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` seguem instalados e nunca importados** | `apps/app/package.json:26,35` | São as dependências típicas de OTel/Sentry. **A PR #15 entregou observabilidade inteira sem tocá-las**, o que confirma que são peso morto e não semente de nada |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:9` | Falta o subpath `"./utils/*"` (consumidor externo não alcança `utils/cookies.ts`), e o `"."` aponta para `index.ts`, **que não existe** |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Deslocado pela PR #15 (era `:13,20`), e a PR **afiou** o achado: o campo vizinho `requestId`, nascido na mesma entrega, **foi ligado até a tela** (`handleClientError.ts:7,11`). Dois campos em linhas adjacentes, só um chegou ao usuário. ⚠️ Há um `retryAfterSeconds` **homônimo de outro tipo** em `apps/api/proxy.ts:102` |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — quinto ciclo | `packages/auth/client.ts:224` | A única cobertura é `apps/app/__tests__/useEmailVerification.test.tsx`, que a **mocka** |
| 🟡 **`packages/shared` é o único pacote com `test` e sem `typecheck`** | `packages/shared/package.json` | 🆕 **Novo nesta rodada.** O pacote acabou de receber o helper de log e o `requestErrorReporter` — 25 testes novos —, e a imunidade a `Error` do `logEvent` é garantida pelo **tipo**, que nenhum gate deste workspace verifica. Fica coberto de lado pelo `typecheck` dos consumidores; não pelo próprio |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`** | `apps/api/(shared)/repositories/base.repository.ts:102-117` | Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#2)**. ⚠️ Preservado de propósito em `firestore-admin-access` (migração *contract-preserving*) |
| 🟡 `delete()` herdado por todo repositório é **soft delete** — chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` — e deixa **duas** famílias de objeto órfãs no bucket |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32-43` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth, e descarta linhas em silêncio (`:42`). O N+1 do Admin SDK está em `:38-40` |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. **Reconferido: seguem órfãs** — o SDK chama `/auth/me`, `/auth/sign-in/google` e as rotas de senha, nunca estas. A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:67` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | A assinatura **é** validada; nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#4) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:46` | `pnpm --filter api dev:with-stripe` **não pode funcionar**. Duas das três chaves afetadas já foram resgatadas por redeclaração (`FIREBASE_STORAGE_BUCKET` em `:26`, `NEXT_PUBLIC_APP_URL` em `:33`), **com comentário nomeando esta armadilha** — esta ficou de fora |
| ◐ **`skipValidation` na `apps/web` é incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` | `apps/web/env.ts:27,13-19` | O CTA "Ir para o painel" da landing cai no fallback em `hero.tsx:44`, `cta.tsx:35`, `header/index.tsx:35-36` e `pricing/page.tsx:77,120`. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189-202` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada** — UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL redescobre o mesmo defeito |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | O idioma escolhido **não sobrevive ao fechamento do navegador**. O `x-theme` **não** herdou o defeito |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O helper grava `x-locale` **e `x-theme`**, não o cookie de sessão |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru | `packages/sdk/src/client/base.ts:45,53,61,95` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu às PRs #11 a #15.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` — em qualquer idioma |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`, nos **dois** apps), `"Início"`, `"Home"` | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` · as duas `page.tsx` de home `:7` | Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, e está nos dois apps. O `PageBreadcrumb` ainda crava `href="/painel"` em `:29` |
| 🟡 **A mensagem de erro padrão do repo inteiro está cravada em pt-br dentro de um pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | 🆕 **Novo nesta rodada**, e pré-existente à PR #15 (o `git diff` confirma que só a linha acima dela mudou). `"Um erro inesperado aconteceu"` é o retorno de **todo** erro que não é `FormattedError` — o fallback que qualquer fork mostra quando nada mais funciona, em espanhol e em inglês também. A função ao lado (`withRequestId`, `:4-11`) **lê o dicionário corretamente** para o rótulo do identificador, o que torna a omissão mais visível: a mesma função sabe traduzir uma metade da frase e não a outra |
| 🟡 **`apps/web/…/sign-in/validations/signInSchema.ts:9` crava a mensagem de validação em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | 🆕 `"A senha deve ter pelo menos 6 caracteres"` fora do dicionário. Encontrado ao recontar os 10 sítios de `MIN_PASSWORD_LENGTH`; os outros nove passam por `validation.passwordMin` |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `…/entities/(hooks)/useListEntities.tsx:16` · `…/(home)/EntitiesListClient.tsx:23-28` | O hook **devolve** `error`; o componente destrutura 4 dos 5 campos e nunca o lê. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:29-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem; as deps `[api, current]` reagendam a cada tick. É a home da landing |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:11` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo. ⚠️ **Ganhou urgência:** agora existe `/health/ready`, e é provável que alguém queira consumi-lo pelo mesmo hook |
| 🟡 **`provider-error` não distingue as falhas do provedor** — cota estourada, domínio não verificado e chave revogada produzem o mesmo `reason` | `packages/email/index.ts:121-122,128-129` | Descartar o objeto de erro é **correto e deliberado**. **A PR #15 não resolveu e criou a assimetria:** `@repo/email` manteve o próprio `logEmail` (`:39-48`) em vez de usar o `logEvent` compartilhado — mesmo formato, código duplicado, e o teste de privacidade vigia só esta cópia |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | O form não tem `<form>`, nem handler, nem import da action — que **existe e tem teste** (`actions/contact.tsx:7`, `apps/web/__tests__/contactAction.test.ts:26`) e zero chamadores de produção |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito. **Reconferido em 2026-09-16: o documento está honesto**, e ganhou a seção
> 10 na PR #15.

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | **`main` não tem branch protection.** Remedido hoje: `protection` → **404**, `rulesets` → `[]`. O pré-requisito caiu na PR #13 e continua satisfeito — o gate fechou 23/23 com 63 testes a mais | `PRE-PRODUCTION.md` | **minutos** |
| 2 | **Ninguém vigia a trilha de erro.** 🆕 O `onRequestError` está plugado nos três apps e escreve no stdout; nenhum coletor está ligado e nenhum alerta é disparado. É o resíduo de `observability-logging` | `PRE-PRODUCTION.md` §11 | P + conta em provedor |
| 3 | **O health check da plataforma não aponta para `/health/ready`.** 🆕 A rota existe e responde 503 quando o Firestore não atende em 2 s; enquanto ninguém a configura, a plataforma segue olhando `/health`, que responde OK com o banco fora do ar | `PRE-PRODUCTION.md` §11 | ~2 min |
| 4 | ~~**Cron órfão.**~~ ✅ **Resolvido em 2026-09-16.** O bloco `crons` de `apps/api/vercel.json` agendava `/cron/keep-alive` todo dia à 01:00, e a rota nunca existiu: `git log --all --diff-filter=A` não encontra nenhum arquivo com esse caminho, e o próprio bloco entrou no commit inicial (`665a4cc`). Removido. Apontá-lo para `/health` foi a alternativa descartada — um ping diário não mantém função serverless aquecida, então seria inventar trabalho para justificar a entrada | — | — |
| 5 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados" — com **dois** consumidores. Exige plano **Blaze** | `PRE-PRODUCTION.md` | cartão + ~15 min |
| 6 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 7 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações | `PRE-PRODUCTION.md` | P |
| 8 | **Contas de QA acumuladas: 15.** As PRs #13, #14 e #15 não acrescentaram nenhuma — o emulador e o gate de e-mail não configurado seguraram as três. Uma das antigas (`qa-account-settings-b@`) segue **inutilizável**: apagar, não reusar | `PRE-PRODUCTION.md` | P |
| 9 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 10 | **O login com Google nunca teve passe manual com conta real.** ⚠️ A única que continua existindo só aqui. O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta | *(só neste arquivo)* | ~2 min |
| 11 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** Depende da pendência 5; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#7) | `PRE-PRODUCTION.md` | ver #5 |
| 12 | **A retenção de log da plataforma nunca foi conferida.** 🆕 O plano da feature de observabilidade chegou a escrever "cerca de uma hora" para o free tier da Vercel e a própria equipe cortou a frase por não ter fonte com data. Continua sem número | `PRE-PRODUCTION.md` §11 | ~5 min |

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | 🆕 **Ganhou argumento novo nesta rodada**, e é o único caso. A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Deixou de ser "adotar observabilidade" e virou "ligar um fio de esforço P". Depende da decisão nº 1 de [Precisam de decisão](#precisam-de-decisão). |
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. |
| Firebase App Check | — | Explicitamente fora do corte de `api-hardening`: atesta o cliente, mas exige configuração de projeto Firebase por fork. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| **Consertar o formulário de contato da landing** | — | ⚠️ **Não é spec, é achado.** A action que ele deveria chamar já existe, funciona e tem teste. Correção pontual de esforço P — vai direto ao `/analyze`. |
| Provedor de e-mail plugável (SES/Postmark) · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`, arquivada. Reabrir exige spec nova. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Explicitamente fora do corte de `file-upload-storage`, arquivada. O `POST /files` ficou genérico de propósito. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`, arquivada. A exclusão de conta virou [`data-rights-lgpd`](data-rights-lgpd.md) e as sessões viraram [`account-security-mfa`](account-security-mfa.md); a **troca de e-mail** continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, arquivada. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#7). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | 🆕 Explicitamente fora do corte de `observability-logging`. A nota de pesquisa registra o conflito entre Sentry v8+ e `@vercel/otel`, que quebra a propagação de trace em silêncio — má primeira dívida para um MVP. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional que manter no core. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. O pré-requisito está satisfeito há duas rodadas. Reavaliar junto com o branch protection. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição, e como opt-in por variável ausente. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **9** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois. Cruza com `e2e-testing` (#7). |
| Changesets / versionamento · Storybook | — | Com pacotes `private: true` e forks que divergem, o valor do changelog não paga o processo. O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
