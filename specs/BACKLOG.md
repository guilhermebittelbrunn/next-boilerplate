# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-24 (`/spec --sync`, pós-merge da PR #24) · anteriores: 2026-09-23 (PR #23) ·
> 2026-09-23 (PR #22) · 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) ·
> 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 ·
> 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) ·
> 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`onboarding-flow` foi entregue e arquivada.** Era o #1 desta lista. PR #24 mergeada em `main` em
>    2026-09-24T11:26:50Z (`d52c4f0`), CI `success` no SHA de merge (`gh run 35993064246`). Os cinco itens
>    do corte foram reabertos no código e fecharam, com uma deriva pequena no item 3: o deep link volta sem
>    a query string. É a décima sétima spec a sair da fila e vive em
>    [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md).
> 2. **O bloco de reescopo escrito pela auditoria passada funcionou.** O `/analyze` aplicou os sete pontos,
>    a entrega bateu com eles e o `postLoginNavigation.ts` ficou intacto, como o bloco previa. A linha de
>    política que o formaliza continua em [Decisões estacionadas](#decisões-estacionadas-51), agora com um
>    caso a favor.
> 3. **`e2e-testing` é o novo #1**, pelo critério vigente: é a única spec elegível que uma rodada autônoma
>    prova sem provisionar nada. Ela traz uma pergunta que as outras não trazem, a adoção de dependências de
>    desenvolvimento, e essa pergunta abre [Precisam de decisão](#precisam-de-decisão).
> 4. **Os 20 links mortos das specs arquivadas foram consertados**, junto com outros 11 da mesma causa em
>    `analyze/plan.md` e `review/review.md`. O achado sai da lista. Não resta link relativo morto em
>    `docs/features/`.
> 5. **O `docs/PRE-PRODUCTION.md` §9 estava defasado de novo** (1547 testes contra 1615 medidos) e foi
>    corrigido. O `docs/SECURITY.md` já tinha sido atualizado dentro da PR #24 e confere.

## Contadores

Sobre as **6 specs que seguem em `specs/`**. Recontados do disco em 2026-09-24, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 4 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 17 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 2 · `confianca` 1 · `dx` 1 (+1 `in-progress` em `dx`, +1 `deferred` em
`produto`). **Por esforço:** P 0 · M 4 · G 2. **Por valor:** alto 3 · médio 3 · baixo 0.

**Transições aplicadas: 1** (`onboarding-flow`: `proposed` → `done`, arquivada). Nenhuma spec nova
entrou: esta rodada é `--sync` puro.

> **A fila ficou curta e sem nenhuma spec de valor alto que uma rodada autônoma consiga provar.** As três
> de valor alto são `billing-subscription` (precisa de chaves da Stripe), `observability-logging`
> (`in-progress`, o resíduo exige conta em provedor) e `teams-organizations` (`deferred`). A audiência
> `confianca` segue com uma spec só. As duas coisas pedem uma rodada de descoberta (`/spec` sem argumento)
> antes que a fila esvazie; ver [Precisam de decisão](#precisam-de-decisão) nº 3.

### O caso `onboarding-flow`: o que foi conferido antes de arquivar

PR **#24** mergeada em `main` em 2026-09-24T11:26:50Z (merge commit `d52c4f0`), com CI `success` nesse SHA
(`gh run 35993064246`, conferido com `gh run list`: `headSha` = `d52c4f0e…`). `git log origin/main -1`
devolve o mesmo commit do `HEAD` local. A tabela completa, com todas as âncoras, está na spec arquivada,
seção "Estado da entrega".

| item | veredito | evidência principal |
|------|----------|---------------------|
| 1. Desvio decidido no servidor | **implementado** | `(common)/layout.tsx:38-41`, logo depois do desvio de admin; regra em `apps/app/lib/server/onboarding.ts:18-30` |
| 2. Dois passos, progresso visível, nome e idioma | **implementado** | `ONBOARDING_STEPS` em `packages/sdk/src/types/user/user.ts:17-20`; progresso em `OnboardingClient.tsx:102-104`, `:169-175`; escrita pelo `PUT /account` existente |
| 3. Retomável, deep link honrado | **implementado**, com deriva | estado nasce em `user-merge.ts:52`, avança por `account/onboarding/route.ts:14`; header `x-app-path` em `apps/app/proxy.ts:214-216`; a query string do destino se perde |
| 4. Concluído nunca mais é interceptado | **implementado** | `completedAt` gravado em `apps/api/(shared)/lib/onboarding.ts:105-108`; `onboarding/page.tsx:45-48` redireciona |
| 5. Passo pulável e interruptor | **implementado** | `skippable` por passo, `400 ONBOARDING_STEP_NOT_SKIPPABLE` em `route.ts:41-46`; `ONBOARDING_ENABLED` em `apps/app/env.ts:11`, vazio conta como ligado |

O `/test` fechou 20 de 20 critérios sob o emulador de Auth e Firestore na rodada 2, depois de a rodada 1
ter reprovado dois (idioma pré-selecionado errado e o 409 que não voltava de passo), ambos corrigidos no
`/review` com teste que falha sem a correção.

**Arquivamento:** `docs/features/onboarding-flow/spec.md` não existia e o `STATE.md` já trazia
`spec: onboarding-flow` (`:5`). Os quatro links de saída da spec (uma nota de pesquisa, duas specs
arquivadas, uma spec viva) foram reescritos **antes** do `git mv`. Os três links de entrada que o movimento
quebrou foram corrigidos: `docs/features/user-activity-tracking/spec.md:155`,
`docs/features/user-activity-tracking/analyze/plan.md:212` e `docs/features/onboarding-flow/analyze/plan.md:3`.

**Nota de processo:** o `STATE.md` da feature mostra `review` em `in-progress`, porque o `/cycle` não
commita e ninguém voltou para fechar a etapa depois do merge. É o mesmo estado de `audit-log`. Não bloqueia
nada; a auditoria não edita a tabela de etapas.

## Gates medidos nesta auditoria

Executados agora, com `--force`, neste workspace, com o `HEAD` em `d52c4f0`. Não copiados do `/test` nem
da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **666 arquivos · 0 erros** (`No fixes applied`, 471 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 1 min 2,7 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-23 (PR #23) |
|-----------|---------:|-------:|---------------------------|
| `api` | 60 | 680 | **+3 arquivos · +29** |
| `app` | 68 | 501 | **+3 arquivos · +39** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 8 | 101 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/internationalization` | 5 | 44 | — |
| `web` | 6 | 35 | — |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **164** | **1615** | **+6 arquivos · +68 testes** |

A PR #24 não criou workspace novo: seguem 24 tasks e **10** configs de Vitest. O `pnpm check` subiu de 648
para **666** arquivos. O pacote de tradução ganhou um arquivo de página (`pages/onboarding/index.ts`) e
três códigos em `apiErrors`, e o teste de paridade continua em 44/44 porque ele varre o dicionário inteiro.

CI: a execução de merge de **#24** (`d52c4f0`) está em **`success`**.

Branch protection segue **não ligado**, remedido hoje: `gh api repos/:owner/:repo/branches/main/protection`
→ **404**, `rulesets` → **`[]`**. O repositório tem **24** PRs, todas mergeadas.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Uma spec segue bloqueada por dependência.**

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados". Medido hoje: `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` estão vazias nos
> `.env` locais da `apps/api` e da `apps/app`.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`e2e-testing`](e2e-testing.md) | **A única spec elegível que uma rodada autônoma prova sem provisionar nada.** Emulador e seed existem desde a PR #13; os itens 1, 3, 4 e 5 do corte se provam localmente. O item 2 (rodar no CI) só se prova quando a branch subir, e "bloquear o merge" depende do branch protection (E3), que é decisão sua. O argumento concreto cresceu de novo: o `/test` da PR #24 derrubou dois critérios dirigindo o browser à mão e achou a perda da query string do deep link; nenhum teste da suíte cobre essas três coisas. A PR #24 também mudou o primeiro fluxo do corte, porque cadastro agora atravessa o onboarding. **O custo é esforço G e dependências novas de desenvolvimento** (Playwright, `@axe-core/playwright` e um provedor de cobertura do Vitest; `node_modules/.pnpm` não tem nenhum deles). A `cycle-policy` §2 exige que dependência nova passe pelo relatório, e é a [pergunta nº 1](#precisam-de-decisão) |
| 2 | [`billing-subscription`](billing-subscription.md) | Valor alto e ainda em **0/6**, reconferido: não existe grupo `payments/` entre os 8 de `apps/api/app/(routes)/`, o `UserDTO` (`user.ts:42-60`) não tem `subscription` nem `stripeCustomerId`, o SDK registra **7** actions (`client/index.ts:14-20`) e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`). Carrega a obrigação herdada de `data-rights-lgpd`: o passo `billing` do expurgo segue `skipped` (`account-erasure.ts:67-78`). **Perde só por verificabilidade:** checkout, portal e webhook exigem chaves de teste da Stripe, e elas estão vazias. Passa ao topo no dia em que existirem. O 🔴 de `packages/payments/ai.ts:4-5` continua sendo pré-requisito barato |
| 3 | [`account-security-mfa`](account-security-mfa.md) | Em **1,5 de 6**, inalterado. `git grep -w -i "multifactor\|totp"` em `apps/` e `packages/` devolve **zero**. `value: médio` (MFA em **3/10** dos starters, sessões gerenciáveis em **1/10**). Seguem **11** declarações de `MIN_PASSWORD_LENGTH` e **28** ocorrências. O segundo fator depende de um custo no Identity Platform que segue **não confirmado**, e o corte precisa de reescopo, como `onboarding-flow` precisava. O bloco de reescopo funcionou lá; é o caminho mais barato aqui |
| 4 | [`admin-billing-insights`](admin-billing-insights.md) | Bloqueada, e é a única. Espera `billing-subscription`, em 0/6. O risco que ela carrega é de correção: agregar receita a partir de webhook sem dedupe por `event.id` infla o número em silêncio |
| 5 | [`observability-logging`](observability-logging.md) | `in-progress`, 5 dos 6 itens. O resíduo é adotar um coletor de erro, que exige conta em provedor. **Fora do conjunto elegível.** A pergunta de fechar ou não foi estacionada (E1) |
| 6 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22. O predicado de posse segue com quatro cópias em `entity.repository.ts` (`:23`, `:40`, `:64`, `:72`). A decisão de status foi estacionada (E2) |

### O que **não** foi escolhido para #1, e por quê

- **`billing-subscription` tem mais valor e perde por verificabilidade.** Uma rodada autônoma sem chaves
  de teste devolveria checkout, portal e webhook como "não verificados", que é metade do corte. Se você
  puser chaves de teste da Stripe no ambiente de desenvolvimento, ela passa à frente sem discussão.
- **`account-security-mfa` perde por corte contestado, valor médio e custo não confirmado.** O item do
  segundo fator depende de habilitar um recurso do provedor, que o `/cycle` não pode fazer, e a parte das
  sessões ativas esbarra num modelo que o Firebase não oferece pronto.
- **Ressalva sobre o #1:** se você recusar as dependências, `e2e-testing` não tem como ser feita com o que
  existe no repositório, e não há #1 executável sem infra. Nesse caso, a recomendação passa a ser uma
  rodada de descoberta, ou uma tarefa direta tirada dos [Achados](#achados-correções-pontuais-não-specs).

### O que o merge da PR #24 mudou no ranking

`onboarding-flow` saiu da fila sem destravar ninguém pelo `depends_on`: nenhuma spec dependia dela. O
efeito foi em dois eixos:

- **Contenção.** `packages/sdk/src/types/user/user.ts` deixou de ser disputado: agora só
  `billing-subscription` o declara. `apps/app/proxy.ts`, `postLoginNavigation.ts`, `user-merge.ts` e
  `(common)/layout.tsx` saíram do `contends_on` coletivo.
- **Argumento.** `e2e-testing` ganhou um caso concreto e uma mudança no primeiro fluxo do corte. Com
  `onboarding-flow` fora e as outras duas elegíveis presas a provedor, ela sobe de #4 para #1.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-24** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 3 de 6.** Fora ficam `teams-organizations` (`deferred`), `observability-logging`
(`in-progress`) e `admin-billing-insights` (espera `billing-subscription`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `e2e-testing` · `billing-subscription` · `account-security-mfa` | `package.json` da raiz + `turbo.json` + `ci.yml` · webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `(common)/routes.tsx` + `account-erasure.ts` · `packages/auth/server.ts` + `session.ts` + `session-routes.ts` + `resolve-api-actor.ts` | **ferramental da raiz**, **caminho de cobrança** e **camada de credencial**. A primeira não toca em `apps/` nem em `packages/`; a segunda vive no webhook, no perfil e no SDK; a terceira, dentro de `packages/auth` e do resolvedor de ator |

Não há lote 2: as três elegíveis cabem no lote 1, e o teto de 3 não barrou ninguém.

### Onde o lote 1 ainda pode colidir sem ter declarado

- **`billing-subscription` e `account-security-mfa`** tendem a acrescentar códigos de erro em
  `translations/packages/shared/utils.ts` (o `apiErrors`), que nenhuma das duas declara. A PR #24 também
  tocou esse arquivo sem declarar. O conflito é aditivo e se resolve no merge, mas vai acontecer.
- **`account-security-mfa`** mexe na política de senha, e uma das 11 declarações de `MIN_PASSWORD_LENGTH`
  está em `apps/api/(shared)/validation/account.schema.ts:8`, arquivo que a PR #24 alterou sem declarar.
  Ninguém mais no lote o toca.
- **`e2e-testing`** vai tocar as configs de Vitest (para medir cobertura) e o `pnpm-lock.yaml`. Nenhuma das
  outras declara esses arquivos, então o lote não muda. O `contends_on` dela segue como está no disco.

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte
de MVP.

`onboarding-flow` declarou **5** arquivos e acertou **4**. Sobrou `postLoginNavigation.ts`, que o próprio
reescopo tinha declarado irrelevante e que o `contends_on` não acompanhou. Na outra direção, a PR tocou
sem declarar `packages/sdk/src/actions/account/action.ts`, `apps/api/(shared)/validation/account.schema.ts`,
`auth/sign-up/route.ts`, `apps/app/env.ts`, `apps/app/.env.example`,
`translations/apps/app/pages/index.ts` e `translations/packages/shared/utils.ts`. Foi a previsão mais
precisa até aqui (a de `data-rights-lgpd` acertou 1 de 3), e ainda assim o padrão das rodadas anteriores
se repete: o arquivo que falta é vizinho dos declarados, na mesma camada.

## Precisam de decisão

Só o que é novo nesta rodada ou mudou de natureza. O que se repetia foi para
[Decisões estacionadas](#decisões-estacionadas-51).

| # | questão | recomendação |
|---|---------|--------------|
| 1 | **Adotar Playwright, `@axe-core/playwright` e um provedor de cobertura do Vitest como dependências de desenvolvimento?** É o que `e2e-testing` (#1) exige, e a `cycle-policy` §2 não deixa o ciclo adotar dependência nova por conta própria | **Aprovado pelo usuário em 2026-09-24: adotar.** As três são gratuitas, ficam em `devDependencies`, não exigem variável de ambiente e não entram no bundle de nenhum app. Sem elas a spec não tem como ser feita. O navegador do Playwright precisa ser instalado no CI (`playwright install`), o que aumenta o tempo do job |
| 2 | **Honrar a query string do deep link do onboarding?** O proxy grava só o `pathname` em `x-app-path` (`apps/app/proxy.ts:215`), então um link de listagem filtrada aberto antes do onboarding volta sem o filtro | **Tarefa direta de esforço P:** gravar `pathname + search`. O destino já passa por `postAuthRedirectTarget`, que recusa open redirect, e `resolveOnboardingDestination` já corta query antes de comparar com `/onboarding`. Precisa de um caso a mais em `proxy.test.ts` |
| 3 | **Rodar uma descoberta (`/spec` sem argumento) antes que a fila esvazie?** Restam três elegíveis, nenhuma de valor alto provável sem infra, e `confianca` tem uma spec só | **Em avaliação pelo usuário (2026-09-24); não rodar até ele decidir.** Recomendação da auditoria: rodar depois do #1. A nota `specs/research/compliance-trust-baseline.md` é o ponto de partida para o eixo `confianca`; a candidata já registrada em [Lacunas](#lacunas-avaliadas-e-não-especificadas) é a de templates de RoPA, runbook de incidente e DPA em `docs/` |

## Decisões estacionadas (§5.1)

Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (10 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor |
| E2 | `teams-organizations` continua `deferred`? (12 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar; não há pré-requisito técnico. Passa a importar mais com o #1, cujo item 2 pede que a suíte E2E bloqueie o merge |
| E4 | O gate `approved` não é usado (agora **cinco** specs entregues sem sair de `proposed`, incluindo `onboarding-flow`) | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | 🆕 O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (2 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:48-50`), por isso precisa da sua palavra |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* **Agora com um caso medido:** `onboarding-flow` ficou seis rodadas presa
  pelo corte contestado, ganhou o bloco numa rodada e foi entregue na seguinte, 5/5.
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Rode o verificador de links no
  arquivo movido e confirme zero mortos."* Esta rodada fez isso à mão pela terceira vez.

Saíram do limbo nesta rodada, sem precisar de você: a confirmação de `onboarding-flow` como #1 (entregue),
a aceitação do reescopo dela (aplicado pelo `/analyze`, entregue) e os 20 links mortos nas specs
arquivadas (consertados).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-24 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |
| [`admin-billing-insights`](admin-billing-insights.md) | `billing-subscription`, `dashboard-home` | ⛔ **bloqueada**: `billing-subscription` está em 0/6; ✅ `dashboard-home` fechou |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
| [`admin-billing-insights`](admin-billing-insights.md) | Seção de billing na home do admin | produto | médio | M | `proposed` | ⛔ `billing-subscription` · ✅ `dashboard-home` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | ✅ `ci-pipeline` · ✅ `firebase-emulator-seed` |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `in-progress` | — |
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
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`) |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`). ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`). ⚠️ O índice composto novo **precisa ser publicado** |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`). ⚠️ **Três desvios registrados**; o índice composto de `auditEvent` **precisa ser publicado**. A imutabilidade da trilha ganhou uma exceção nomeada na PR #23 (`anonymizeUserLabels`) |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`). ⚠️ **Três índices compostos** precisam ser publicados |
| `session-refresh` | 2026-09-17 | [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md) — 6/6 do corte (PR #20, `cc93229`). ⚠️ A **revogação ponta a ponta segue 🔒 não verificada** |
| `user-activity-tracking` | 2026-09-19 | [`docs/features/user-activity-tracking/spec.md`](../docs/features/user-activity-tracking/spec.md) — 5/6 do corte (PR #21, `e656331`). ✅ O item 4 parcial foi pago pela entrega de `data-rights-lgpd` |
| `admin-analytics-dashboard` | 2026-09-23 | [`docs/features/admin-analytics-dashboard/spec.md`](../docs/features/admin-analytics-dashboard/spec.md) — 5/5 do corte (PR #22, `03498ae`). Gráfico entregue como histograma de recência |
| `data-rights-lgpd` | 2026-09-23 | [`docs/features/data-rights-lgpd/spec.md`](../docs/features/data-rights-lgpd/spec.md) — **5/5 do corte** (PR #23, `ab11a5b`), item 3 dividido: arquivos sem prova contra bucket real, assinatura transferida para `billing-subscription`. **Quatro derivas registradas** |
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3: o deep link volta sem a query string |

**Verificado nesta rodada:** `docs/features/` tem **20** pastas e **17** `spec.md` arquivados. As três
pastas sem `spec.md` são `observability-logging` (spec continua em `specs/`), `auth-panel-context` e
`impersonation-read-only` (as duas anteriores à semeadura). Não houve colisão de arquivamento.

### O que a PR #24 entregou **além** do corte

1. **`POST /auth/sign-up` passou a criar o perfil pelo helper** `createDefaultUserProfile`
   (`auth/sign-up/route.ts:35`), mantendo o rollback da conta do Auth. Antes, o cadastro por senha gravava
   o perfil direto e escaparia de qualquer campo inicial que o helper ganhasse.
2. **O proxy da `apps/app` passou a repassar o caminho da requisição** no header `x-app-path`
   (`proxy.ts:214-216`), sempre sobrescrevendo o que o navegador mandou. É infraestrutura reaproveitável:
   qualquer layout que precise saber a URL pode ler esse header.
3. **O avanço de passo é só para frente** (`apps/api/(shared)/lib/onboarding.ts:67-109`): passo atrás
   devolve o estado atual sem escrever, passo à frente responde `409 ONBOARDING_STEP_OUT_OF_ORDER`, e a tela
   volta ao passo do servidor.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida e corrigida ao passar por ela.

| documento | afirmava | realidade medida em 2026-09-24 | veredito |
|-----------|----------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md` §9 (gate) | 648 arquivos, 1547 testes em 158 arquivos, 1 min 12,4 s | 666 arquivos, 1615 testes em 164 arquivos, 1 min 2,7 s | ✅ **corrigido nesta rodada**, junto com a distribuição por workspace |
| `docs/SECURITY.md:13-15` (guards) | **26** arquivos de rota, **15** com guard, **11** nus | **confere**: 26, 15 e os mesmos 11 (8 `/auth/*`, `health` ×2, `webhooks/payments`) | ✅ **honesto**: a PR #24 atualizou o documento junto com a rota |
| `docs/SECURITY.md:146-148` (rate limit) | 10 caminhos em `apps/api/proxy.ts:44-55`; quatro das seis rotas de `/account` fora | **confere**, lista literal | ✅ **honesto** |
| `docs/SECURITY.md:150` (renovação de sessão) | fora do rate limit, protegida só por `isSameOriginRequest` | **confere**: `session-routes.ts:87`, `session.ts:78-81` | ✅ **honesto** |
| `docs/AUTH-PANEL.md` (onboarding) | o proxy repassa o `pathname` em `x-app-path`; perfil sem o campo conta como concluído; admin personificando nunca é desviado | **confere** com `proxy.ts:215`, `apps/app/shared/lib/onboarding.ts:25-47` e `lib/server/onboarding.ts:23-26` | ✅ **honesto na estreia**. Não diz que a query se perde, mas também não promete o contrário |
| `docs/SETUP.md:85` (`ONBOARDING_ENABLED`) | vazio liga, `"false"` desliga, a API segue gravando o estado inicial | **confere** com `apps/app/shared/lib/onboarding.ts:54-56` e `user-merge.ts:52` | ✅ **honesto** |
| `docs/PAYMENTS.md` (estado geral) | não há fluxo de assinatura; stubs em `route.ts:13,23` | **confere** | ✅ **honesto** pela décima segunda rodada |

> **Nota de método.** O §9 do `PRE-PRODUCTION.md` foi defasado pela sexta auditoria seguida, pelo mesmo
> mecanismo: medido certo e invalidado pela entrega seguinte. O `SECURITY.md` escapou desta vez porque a
> própria PR o atualizou, que é o conserto que a nota da rodada passada pedia.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

### Deriva de implementação: `onboarding-flow`

Registradas por inteiro na spec arquivada. Em resumo: o deep link é honrado sem a query string (a
implementação desviou, por pouco; virou a [pergunta nº 2](#precisam-de-decisão)); o cadastro por senha
passou a usar o helper que cria o perfil, e a criação pelo admin continua sem o estado (a spec não sabia
do contorno); o `contends_on` acertou 4 de 5 e deixou de fora sete arquivos vizinhos.

### Âncoras deslocadas, corrigidas nas specs vivas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`billing-subscription`](billing-subscription.md) · [`admin-billing-insights`](admin-billing-insights.md) | `user.ts:12-28` (`UserDTO`) | **`:42-60`** | tipos do onboarding acima do `UserDTO` (PR #24) |
| [`billing-subscription`](billing-subscription.md) | `user.ts:54-76` (`UserWithAuthDTO`) | **`:86-108`** | idem |
| [`billing-subscription`](billing-subscription.md) | 25 `route.ts` | **26** | `account/onboarding` (PR #24) |
| [`admin-billing-insights`](admin-billing-insights.md) | 22 `route.ts`, medidos em 2026-09-17 | **26**, nota de remedição acrescentada | PRs #22, #23 e #24 |
| [`account-security-mfa`](account-security-mfa.md) | `account.schema.ts:7` (`MIN_PASSWORD_LENGTH`) | **`:8`** | import novo no topo (PR #24) |
| [`account-security-mfa`](account-security-mfa.md) | `actions/account/action.ts:81` (`revokeSessions`) | **`:98`** | `advanceOnboarding` acima (PR #24) |
| [`observability-logging`](observability-logging.md) | `auth/sign-up/route.ts:40` (×3) | **`:38`** | imports trocados e a criação do perfil encurtada (PR #24) |
| [`e2e-testing`](e2e-testing.md) | 1547 testes em 158 arquivos | **1615 em 164** | PR #24 |

Todas são deslocamento por entrega; nenhuma nasceu errada. As âncoras de `apps/api/proxy.ts` em
`observability-logging` não mudaram: a PR #24 alterou o proxy da `apps/app`, não o da `apps/api`.

### Contagens e afirmações de estado corrigidas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`e2e-testing`](e2e-testing.md) | o fluxo "cadastro" termina no painel | termina no onboarding, salvo com `ONBOARDING_ENABLED="false"` | parágrafo novo na spec; muda o roteiro do item 1 |
| [`observability-logging`](observability-logging.md) | 16 pontos pelo helper de log | `git grep "logEvent("` fora de testes dá **20** linhas, uma delas a definição em `log.ts:51`; o mesmo número de `ab11a5b` | a PR #24 não acrescentou ponto; a contagem de 19 da rodada passada excluía a definição |

### O que a auditoria **não** encontrou

Nenhuma spec `done` regrediu no código. Nenhuma feature em `docs/features/*/STATE.md` está sem `spec:`
quando deveria ter. Nenhuma entrega parcial órfã nova; a de `account-security-mfa` segue sendo a única.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-09-24 (pós-PR #24).** Cada achado da rodada anterior foi reaberto no disco, com o
> veredito na própria linha. **Placar: 1 fechado · 4 novos · o resto confirmado aberto.** Depois da auditoria, o `/review` de `billing-subscription` acrescentou mais três novos. Três âncoras
> de `apps/app/proxy.ts` desceram uma linha pelo import novo da PR #24.

### ✅ Fechados nesta rodada

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🟡 **Os 20 links mortos nas 10 specs arquivadas** | `docs/features/<slug>/spec.md` | Consertados pela auditoria: 16 apontavam para `research/*.md` e agora apontam para `../../../specs/research/`; os quatro de `session-refresh` apontam para `../../../specs/account-security-mfa.md` e `../user-activity-tracking/spec.md`. A mesma varredura achou e consertou mais 11 da mesma causa: a linha "Spec de origem" de 8 `analyze/plan.md`, dois links em `user-activity-tracking/analyze/plan.md` e um em `session-refresh/review/review.md`. Verificador de links rodado em todo `docs/features/*.md`: zero mortos |

### 🆕 Achados novos

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O deep link do onboarding perde a query string** | `apps/app/proxy.ts:215` | O proxy grava só o `pathname`. Afeta link de listagem filtrada ou paginada aberto antes do onboarding. É a [pergunta nº 2](#precisam-de-decisão) |
| 🟡 **Os `HookForm*` publicam `aria-invalid="false"` com a mensagem de erro visível** | `packages/design-system/components/ui/form.tsx:109-123` · `packages/design-system/components/form/hookform/` | O `HookFormInput` usa `<Controller>` direto, sem o `FormField` que põe o nome do campo no contexto; o `useFormField` não acha o erro e o `aria-describedby` sai sem o id da mensagem. Achado pelo `/review` da PR #24 (O3). Vale para os oito componentes da pasta e para todo formulário do repositório; leitor de tela não anuncia o erro. Terceiro caso do design-system sem task de teste; cruza com [`e2e-testing`](e2e-testing.md), cujo item 3 é acessibilidade automatizada |
| 🟡 **`/favicon.ico` não existe na `apps/app` e cai no segmento `[locale]`** | `apps/app/app/` (sem `favicon.ico` nem `icon.*`) | O navegador pede o ícone em toda página. Anônimo vai para `/favicon.ico/sign-in`; conta com onboarding pendente vai para `/favicon.ico/onboarding?redirect=%2Ffavicon.ico` (O5 do `/test` da PR #24). Anterior à feature; ela só deixou o sintoma mais visível |
| 🟡 **`<html lang>` segue o cookie `x-locale`, não a URL, na primeira carga** | root layout da `apps/app` | `/en/sign-in` com `x-locale=pt-br` sai com `lang="pt-br"` (O4 do `/test` da PR #24). Leitor de tela pronuncia a página no idioma errado até a navegação seguinte |
| 🟡 **`--destructive` do dark tem contraste 1,97:1 como texto** | `packages/design-system/styles/globals.css:63` · usos como texto em `ui/form.tsx:156`, `ui/field.tsx:227`, `ui/label.tsx:21`, `form/hookform/*` | Toda mensagem de erro de formulário e o `pastDueHint` da aba billing ficam abaixo dos 4,5:1 do AA no dark (medido pelo `/test` de `billing-subscription` e recalculado em oklch → sRGB: 1,97:1 sobre `--background`). Clarear o token não resolve sozinho: o mesmo token é fundo sólido do item `danger` do antd no hover (`antd-app.tsx:20`, texto branco) e, para ficar ≥4,5:1 como texto (L ≈ 0,60), o branco sobre ele cai para 4,41:1. Caminho provável: mapear o `--destructive-foreground` do dark (`:64`, 5,18:1) no `@theme` e usá-lo como cor de texto de erro. Achado pelo `/review` de `billing-subscription` |
| 🟡 **`Button` com `loading` perde o nome acessível** | `packages/design-system/components/ui/button.tsx:72-73` · `ui/spinner.tsx:8-9` | O `loading` troca o conteúdo pelo `Spinner`, cujo `aria-label="Loading"` é literal em inglês; no browser o botão ficou com nome `""` durante o redirect do checkout (`/test` de `billing-subscription`, item 11). Vale para todo botão com `loading` (`AccountPrivacyPanel`, painel de billing, formulários). Corrigir no componente, mantendo o texto do botão acessível enquanto o spinner aparece |
| 🟡 **As páginas da `apps/web` leem o idioma do cookie `x-locale`, que o proxy grava na mesma resposta** | `apps/web/proxy.ts:104-108` · `getDictionary()` de `packages/internationalization/server.ts` · ex.: `apps/web/app/[locale]/pricing/page.tsx` (copy, metadata e o link `/contact` do plano Enterprise), `(home)/components/hero.tsx` (link `/contact`) | Ao trocar de idioma pela URL, a página renderiza no idioma da visita anterior até a navegação seguinte. O `/review` de `billing-subscription` corrigiu só o `href` dos CTAs de plano (usa o segmento `[locale]`); o resto é anterior à feature e atinge as ~20 páginas e componentes que chamam `getDictionary()` sem argumento. Mesma causa do achado de `<html lang>` acima |

### 🔴 Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** instancia `StripeAgentToolkit` com `keys().STRIPE_SECRET_KEY \|\| ""` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Reconferido, literal. Não explode só porque nada importa `@repo/payments/ai`; `billing-subscription` (#2) é o que faria alguém importar. `packages/payments/package.json` segue **sem `exports`** |
| 🔴 **`packages/security/index.ts:11`** lê `keys().ARCJET_KEY` no **import**, e `@repo/security` é o primeiro import do middleware da `apps/api` | `packages/security/index.ts:11` | Reconferido. Uma `ARCJET_KEY` presente e malformada lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:20-24` | Reconferido: `throw` em `:20-24`, zero `process.exit`. `/health/ready` detecta parte das falhas, não esta |
| ⚠️ **Quatro das seis rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha | `apps/api/proxy.ts:44-55` | Recontado: a PR #24 acrescentou `POST /account/onboarding`, também fora. Ficam fora o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding` |
| ⚠️ **Superfície não-guardada da API: 11 de 26** arquivos de rota exportam handler nu, 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado: 26 arquivos, 15 com guard. A rota nova nasceu com guard |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:87` · `packages/auth/session.ts:78-81` | Reconferido. A parte documental está fechada (`docs/SECURITY.md:150`); o comportamento segue |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada**: `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` no `package.json` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` não existe. **Vigésima auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` do resto | `packages/auth/package.json:25` | Reconferido, inalterado |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: 0 |
| 🟡 **`input-otp.tsx` é código morto** | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: só ele, o barril, o `package.json` do pacote e o `playground`. `account-security-mfa` (#3) é quem o usaria |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: 0 importadores |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-11` | Reconferido: falta `"./utils/*"`, e `"."` aponta para `index.ts`, que não existe |
| 🟡 **`emailBrand.supportEmail` é configuração morta** | `packages/email/brand.ts:9` | Reconferido: 1 ocorrência em `apps/` e `packages/`, a definição |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:32` | Reconferido: 4 referências, todas em `__tests__/rateLimit.test.ts` |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:106` segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:224` | Reconferido: só `useEmailVerification.test.tsx`, que a mocka |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`; `@repo/design-system` tem `typecheck` e não tem `test`** | `packages/shared/package.json` · `packages/design-system/package.json` | Reconferido. O lado do design-system ganhou o terceiro caso nesta rodada (achado novo do `aria-invalid`) |
| 🟡 **`welcomeEmail` sem chamador de produção**; o formulário de contato da landing segue maquete | `packages/email/templates/welcome.tsx:49` | Reconferido: 4 ocorrências, 3 em teste. O canal de privacidade da `apps/web` cai nesse formulário quando `NEXT_PUBLIC_PRIVACY_CONTACT` está vazia (`privacyContact.ts:17-18`), então o fallback do canal aponta para uma maquete |
| 🟡 **O `ActionsMenu` ganhou prop nova sem teste do próprio componente** | `packages/design-system/components/ui/action-menu.tsx` · `apps/app/__tests__/usersListArchiveLabels.test.tsx:37` | Reconferido. O único teste substitui o componente por mock |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:64` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:74`). N+1 do Admin SDK. Oitava rodada aberto |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:48` · `:60` · `:64` · `:83` · `:101` | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` da api não tem consumidor e não segue o contrato de erro** | `apps/api/app/(routes)/auth/sign-in/route.ts:12` | Reconferido: zero `try`, `:12` devolve string crua (`"User not found"`). Viola a regra de ouro 3. O `sign-up` ganhou chamador indireto de `createDefaultUserProfile` na PR #24 e tem `try` |
| 🟡 **Webhook da Stripe é casca e ecoa o evento inteiro** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | Reconferido. Escopo de `billing-subscription` (#2) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento** (`skipValidation` descarta `STRIPE_WEBHOOK_SECRET`) | `apps/api/env.ts:46` | Reconferido |
| ◐ **`skipValidation` incondicional na `apps/web`** e `NEXT_PUBLIC_APP_URL` fora do bloco `client` | `apps/web/env.ts:29` | Reconferido, inalterado |
| ◐ **O bounce do proxy apaga a query string**, corrigido só para as rotas de `oobCode` | `apps/app/proxy.ts:190-203` | Reconferido: `redirectUrl.search = ""` em `:201` (âncoras desceram uma linha com o import da PR #24). Mesma família do achado novo do deep link do onboarding |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:170,174` | Reconferido: `cookieStore.set` sem `maxAge` |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Nona rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:44-46` (estado lido uma vez) · `:48-55` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
| 🟡 **`"Pick a date"` literal no `DateInput`** | `packages/design-system/components/ui/date-input.tsx:50` | Reconferido. Sobreviveu às PRs #11 a #24 |
| 🟡 **O `DateInput` formata sempre em inglês** | `date-input.tsx:83` | Reconferido: `format(selected, "PPP")` sem `locale` |
| 🟡 **Strings de UI soltas**: `"Switch language"` nos dois apps e `"Início"` no breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/app/[locale]/components/header/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` | Reconferido. O breadcrumb ainda crava `href="/painel"` em `:28` |
| 🟡 **A mensagem de erro padrão está cravada em pt-br num pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal |
| 🟡 **`signInSchema.ts:9` da `apps/web` crava a mensagem em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | Reconferido, literal |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | Reconferido. A exclusão de conta apaga o perfil e anonimiza os rótulos, então esses eventos ficam sem entrada no `select` |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | Reconferido |
| 🟡 **`images.domains` deprecado com `www.google.com` sem uso** | `apps/app/next.config.ts:19` | Reconferido, literal |
| 🟡 **`setTimeout` sem cleanup no carrossel da landing** | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Reconferido: nenhum `clearTimeout` |
| 🟡 **`useHealthCheck` não exporta a função imperativa** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: um único `export` |
| 🟡 **`provider-error` não distingue as falhas do provedor de e-mail** | `packages/email/index.ts:120-130` | Reconferido. Descartar o objeto de erro é deliberado |
| 🟡 **O rodapé da `apps/web` depende de `data-cookie-banner` sem teste** | `apps/web/app/[locale]/components/footer.tsx:56` | Reconferido |
| 🟡 **`turbo run` aborta na primeira falha no CI** | `.github/workflows/ci.yml:39` | Reconferido, sem `--continue` |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Cada linha traz o veredito desta rodada. A PR #24 não acrescentou pendência: o `/test` rodou tudo sob o
> emulador e não criou índice novo (`firestore.indexes.json` não está no diff).

| # | pendência | onde vive | veredito 2026-09-24 |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**; não remedido nesta rodada, nada no repositório mudou |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto**. São **seis** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido (404, `[]`, 24 PRs); estacionado (E3) |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**: `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve 0; estacionado (E1) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto**. Trava também o passo `storage` do expurgo de conta |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **continua aberto** (exige projeto Firebase real) |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #24 criou 7 contas só no emulador, que as descarta |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**: `git ls-remote --heads` devolve 23, ou seja, 22 além de `main` (eram 21) |
| 17 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto**. O `/test` da PR #24 também não percorreu o Google no emulador; o nome do Google como valor inicial do passo 1 ficou fechado só por leitura |
| 18 | `storage.rules` nunca publicado nem testado | `PRE-PRODUCTION.md` | **continua aberto**; depende da 11 e de `e2e-testing` |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **continua aberto**. Você disse que fica para depois |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto**. Vazia, o canal cai no formulário de contato, que é maquete |

As linhas fechadas na rodada passada (índice de `reference_id`, `SESSION_ABSOLUTE_MAX_AGE_DAYS`, cookies na
política de privacidade, links mortos) saíram da tabela; o histórico está no git.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Estacionado (E1). |
| 🆕 **Passos de onboarding condicionais por papel ou plano · checklist de ativação · tour interativo** | — | Fora do corte de [`onboarding-flow`](../docs/features/onboarding-flow/spec.md), arquivada. Dependem de haver produto, e cada fork tem o seu. O fork acrescenta um passo editando `ONBOARDING_STEPS`. |
| 🆕 **Coleta de dados de domínio no onboarding (empresa, cargo, segmento)** | — | Fora do mesmo corte. Não é genérico; é código do fork. |
| 🆕 **Onboarding para a conta criada pelo admin** | — | Decisão D3 da entrega: o admin já informa o nome, e a mesma rota cria admins. O perfil sem o campo conta como concluído. |
| **Demais direitos do art. 18 com fluxo próprio · painel de pedidos de titular · exportação assíncrona** | — | Fora do corte de [`data-rights-lgpd`](../docs/features/data-rights-lgpd/spec.md), arquivada. O canal de privacidade cobre os demais pedidos por ora. |
| **RoPA, runbook de incidente, DPA e transferência internacional** | — | Fora do corte de `data-rights-lgpd` por serem documento, não código. Candidato natural a uma spec de templates em `docs/` numa próxima descoberta, que é também onde o eixo `confianca` pode ganhar peso ([pergunta nº 3](#precisam-de-decisão)). |
| **Exclusão de conta sem senha (conta só Google)** | — | Fora da entrega: reautenticar conta federada exige outro fluxo. Pertence à iteração de "sessão recente" de [`account-security-mfa`](account-security-mfa.md). |
| **Histórico de acessos · IP, user-agent, dispositivo e geolocalização · presença em tempo real** | — | Fora do corte de [`user-activity-tracking`](../docs/features/user-activity-tracking/spec.md). IP mudaria a natureza jurídica do dado (Marco Civil art. 5º, VIII). |
| **Série temporal de acessos na home do admin** | — | `lastAccessAt` guarda um instante por perfil; série temporal exigiria a coleção de eventos que `user-activity-tracking` descartou. |
| **Backfill retroativo do último acesso** | — | Fora do corte, e a tela diz quando o registro de cada pessoa começa. |
| **Ordenação da coluna de último acesso pelo servidor** | — | O índice por `lastAccessAt` existe declarado (não publicado). Reavaliar quando a fila drenar. |
| **Tela de sessões e dispositivos ativos** | 1/10 | Pertence a [`account-security-mfa`](account-security-mfa.md) (#3). |
| **Rotação de refresh token com detecção de reuso** | — | O refresh token é do Firebase. |
| **"Continuar conectado" · reautenticação para operação sensível · aviso de inatividade** | — | Fora do corte de `session-refresh`. A exclusão de conta já nasceu com reautenticação própria; o contrato geral fica com `account-security-mfa`. |
| **Rate limit próprio para as rotas de sessão** | — | Virou achado de segurança; o mecanismo existe e não alcança os front-ends. |
| **Widgets configuráveis na home · comparação com período anterior · exportar métricas · tempo real** | — | Fora dos cortes de `dashboard-home` e `admin-analytics-dashboard`. |
| **Contador materializado / agregação incremental** | — | A home do admin faz oito agregações por carregamento. Medir quando alguma coleção crescer. |
| **Exportar a trilha de auditoria · expurgo automático** | — | Dependem do prazo de retenção (E5). |
| **Alerta em tempo real sobre ação sensível** | — | Depende de haver coletor (E1). |
| **Auditar toda escrita de qualquer recurso** | — | Começa caro e gera ruído. |
| **Busca textual no servidor** | — | Fora do corte de `cursor-pagination`. Estacionado (E7). |
| **Medir visitas à `apps/web`** | — | Nenhuma das três saídas teve preço ou prevalência levantados. Estacionado (E8). |
| **Contagem total de registros na listagem** | — | O `countQuery` (`base.repository.ts:138`) é a peça que faltava. Reavaliar quando alguém pedir. |
| **Registro auditável de consentimento no servidor** | — | Fora do corte de `cookie-consent`. A escolha vai no arquivo de exportação, lida do cookie do navegador (`useAccountDataRights.tsx:23-36`); prova no servidor segue inexistente. |
| **CMP certificada · TCF do IAB · geolocalização do visitante** | — | Arrastam serviço pago para todo fork. |
| Notificações in-app + preferências | 3/10 | Esforço G à mão; a referência terceiriza num serviço pago. |
| Command palette (⌘K) | 2/10 | Valor estético. |
| Metering / limites de uso / créditos | 2/10 | Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Variável de ambiente basta num MVP; `ONBOARDING_ENABLED` é o exemplo mais recente. |
| Firebase App Check | — | Exige configuração de projeto por fork. |
| Waitlist / captura de lead | 2/10 | Decisão do fork. |
| **Consertar o formulário de contato da landing** | — | Não é spec, é achado. É o fallback do canal de privacidade. |
| **Migrar a listagem de usuários para o cursor** | — | O N+1 de `userRepository.list()` vem primeiro. |
| **Detector de teste instável no CI** | — | O único caso concreto foi consertado na PR #22. Reabrir exige um segundo *flake* de causa diferente. |
| **Task de teste no `@repo/design-system`** | — | Não é spec, é achado, com três casos agora. Provavelmente entra no corte de [`e2e-testing`](e2e-testing.md). |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`. A exclusão de conta foi entregue por `data-rights-lgpd` e as sessões estão em [`account-security-mfa`](account-security-mfa.md); a troca de e-mail continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`. Os testes de rules foram para [`e2e-testing`](e2e-testing.md). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 12 últimas execuções de merge na `main` (`gh run list`, 2026-09-24). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das 10 configs declara cobertura. Medir primeiro, que é o item 4 de [`e2e-testing`](e2e-testing.md). |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
