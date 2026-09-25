# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-25 (`/spec --sync`, pós-merge da PR #25) · anteriores: 2026-09-24 (PR #24) ·
> 2026-09-23 (PR #23) · 2026-09-23 (PR #22) · 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) ·
> 2026-09-17 (PR #18) · 2026-09-16 (PR #17) · 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e
> #14) · 2026-09-15 · 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01
> (3 rodadas) · 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`billing-subscription` foi entregue e arquivada.** PR #25 mergeada em `main` em 2026-09-24T14:46:15Z
>    (`a1f87d0`), CI `success` no SHA de merge (`gh run 36015211021`). Os seis itens do corte e o passo
>    `billing` do expurgo herdado de `data-rights-lgpd` foram reabertos no código e fecharam. Cinco critérios
>    seguem 🔒 porque só uma conta Stripe real os prova. É a décima oitava spec a sair da fila e vive em
>    [`docs/features/billing-subscription/spec.md`](../docs/features/billing-subscription/spec.md).
> 2. **`admin-billing-insights` foi desbloqueada.** As duas dependências estão entregues. As três seções que
>    descreviam a cobrança como inexistente foram reescritas com o que a PR #25 criou e com o que ainda falta
>    para o corte dela: instante de ativação, nome do plano sem chamar a Stripe e o evento de fatura.
> 3. **`admin-billing-insights` é o novo #1.** O usuário já a escolheu para esta rodada, e a auditoria
>    concorda: é esforço M contra o G de `e2e-testing`, e o harness de webhook assinado que o `/test` de
>    `billing-subscription` usou prova quase todo o corte sem conta Stripe.
> 4. **O modo `simple` não faz o que a documentação diz.** `docs/AUTH-SSO.md` descreve um redirecionamento
>    do usuário comum para a web que não existe no código, e a pendência nº 21 partia dessa premissa. Os dois
>    documentos ganharam nota de medição; a decisão é a [pergunta nº 1](#precisam-de-decisão).
> 5. **Três achados fecharam** com a PR #25 (o 🔴 do `packages/payments/ai.ts`, o webhook inalcançável em
>    desenvolvimento e a casca do webhook) e **quatro entraram**, vindos do plano de `billing-subscription`.
> 6. **Dois documentos estavam defasados e foram corrigidos:** o §9 do `docs/PRE-PRODUCTION.md` (1615 testes
>    contra 1817 medidos) e a contagem de rotas do `docs/SECURITY.md` (26 contra 29).

## Contadores

Sobre as **5 specs que seguem em `specs/`**. Recontados do disco em 2026-09-25, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 3 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 18 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 1 · `confianca` 1 · `dx` 1 (+1 `in-progress` em `dx`, +1 `deferred` em
`produto`). **Por esforço:** P 0 · M 3 · G 2. **Por valor:** alto 2 · médio 3 · baixo 0.

**Transições aplicadas: 1** (`billing-subscription`: `in-progress` → `done`, arquivada). Nenhuma spec nova
entrou: esta rodada é `--sync` puro.

> **A fila tem três specs elegíveis, todas de valor médio.** As duas de valor alto que restam estão fora do
> conjunto: `observability-logging` (`in-progress`, o resíduo exige conta em provedor) e
> `teams-organizations` (`deferred`). A audiência `confianca` segue com uma spec só. A rodada de descoberta
> foi adiada pelo usuário em 2026-09-25 (E11).

### O caso `billing-subscription`: o que foi conferido antes de arquivar

PR **#25** mergeada em `main` em 2026-09-24T14:46:15Z (merge commit `a1f87d0`), com CI `success` nesse SHA
(`gh run 36015211021`, conferido com `gh run list`: `headSha` = `a1f87d04…`). `git log origin/main -1`
devolve o mesmo commit do `HEAD` local. A tabela completa, com todas as âncoras, está na spec arquivada,
seção "Estado da entrega".

| item | veredito | evidência principal |
|------|----------|---------------------|
| 1. Planos do catálogo, com preço e moeda | **implementado** | `payments/plans/route.ts:12-29`; `listPlans` em `billing.ts:50-67`; sem cobrança ligada, `{ enabled: false }` sem chamar a Stripe |
| 2. Checkout e volta com resultado visível | **implementado**, caminho real 🔒 | `payments/checkout/route.ts:20-78`, 409 com assinatura viva (`:41-46`); volta em `billing.ts:34-44`; releitura da conta em `useCheckoutConfirmation.tsx:12-31` |
| 3. Estado gravado no perfil e lido pela UI | **implementado** | `UserDTO.stripeCustomerId`/`subscription` em `user.ts:62-65`; snapshot em `payments.ts:30-44` |
| 4. Webhook reconcilia, sem efeito duplicado | **implementado** | eventos em `webhooks/payments/route.ts:107-111`; dedupe em `:161-167` e `payment-event.repository.ts:27-55`; regra de ordem em transação (`user.repository.ts:71-104`, `billing-state.ts:130-165`) |
| 5. Portal da Stripe | **implementado**, página real 🔒 | `payments/portal/route.ts:14-56` |
| 6. CTAs do `pricing` no modo `subscription` | **implementado** | `apps/web/shared/lib/pricingCta.ts:13-27`; `pricing/page.tsx:39`, `:90`, `:128` |
| Obrigação herdada: passo `billing` do expurgo | **implementado**, cancelamento real 🔒 | `account-erasure.ts:71-96`, roda primeiro e trava o resto se falhar (`:142-156`); exportação em `account-export.ts:56-67` |

O `/test` fechou 19 critérios, reprovou 0 e deixou 5 como 🔒 (catálogo real, checkout real, entrega real de
webhook, página do portal, cancelamento real no expurgo). A prova usou chaves falsas no ambiente do
processo, webhook assinado localmente e o emulador.

**Arquivamento:** `docs/features/billing-subscription/spec.md` não existia e o `STATE.md` já trazia
`spec: billing-subscription` (`:5`). Os três links de saída da spec (duas notas de pesquisa e uma spec
arquivada) foram reescritos antes do `git mv`. Os links de entrada que o movimento quebrou foram corrigidos
em `docs/features/admin-analytics-dashboard/spec.md:122`, `docs/features/user-activity-tracking/spec.md:155`,
`docs/features/user-activity-tracking/analyze/plan.md:211`, `docs/features/data-rights-lgpd/spec.md:212`,
`docs/features/billing-subscription/analyze/plan.md:3` e em duas linhas de
[`admin-billing-insights`](admin-billing-insights.md).

**Nota de processo:** o `git mv` deixou o rename **no índice**. Quem montar o plano de commits precisa
contar com ele: é o commit de fechamento `docs(specs)`, separado do resto.

## Gates medidos nesta auditoria

Executados agora, com `--force`, neste workspace, com o `HEAD` em `a1f87d0`. Não copiados do `/test` nem
da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **699 arquivos · 0 erros** (`No fixes applied`, 559 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 56,7 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-24 (PR #24) |
|-----------|---------:|-------:|---------------------------|
| `api` | 66 | 804 | **+6 arquivos · +124** |
| `app` | 73 | 559 | **+5 arquivos · +58** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 8 | 101 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/internationalization` | 5 | 44 | — |
| `web` | 8 | 41 | **+2 arquivos · +6** |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/payments` | 4 | 22 | **+3 arquivos · +14** |
| **total** | **180** | **1817** | **+16 arquivos · +202 testes** |

A PR #25 não criou workspace novo: seguem 24 tasks e **10** configs de Vitest, todas com `testTimeout`. O
`pnpm check` subiu de 666 para **699** arquivos. O teste de paridade de i18n continua em 44/44 com os
cinco códigos `PAYMENTS_*` novos, porque ele varre o dicionário inteiro.

CI: a execução de merge de **#25** (`a1f87d0`) está em **`success`**.

Branch protection segue **não ligado**, remedido hoje: `gh api repos/:owner/:repo/branches/main/protection`
→ **404**, `rulesets` → **`[]`**. O repositório tem **25** PRs, todas mergeadas.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Nenhuma spec segue bloqueada por dependência.**

> **Antes da próxima spec**, a fila tem duas tarefas diretas aprovadas pelo usuário em 2026-09-25: o
> achado de hidratação em `/en` e `/es` (a primeira, depois do merge de `admin-billing-insights`) e o
> cancelamento da assinatura no soft delete pelo admin (achado A2).

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | por que agora |
|---|----|---------------|
| 1 | [`admin-billing-insights`](admin-billing-insights.md) | **Desbloqueada nesta rodada, e escolhida pelo usuário.** `billing-subscription` e `dashboard-home` estão entregues. O dedupe por `event.id`, que era o risco de correção central da spec, já existe (`payment-event.repository.ts:22-56`). Quase todo o corte se prova sem conta Stripe: a leitura é da base local, e o harness de payload assinado com o emulador fechou 19 critérios de `billing-subscription`; fica 🔒 só a entrega real de `invoice.paid`. Esforço M. **O que o `/analyze` precisa resolver**, e que a spec agora lista com âncora: o snapshot não guarda instante de ativação nem nome do plano, e nenhum evento de fatura é persistido. Há ainda um passo novo de infra por fork (um quinto evento no endpoint da Stripe), que vai para o `PRE-PRODUCTION.md` §12 |
| 2 | [`e2e-testing`](e2e-testing.md) | Prova-se localmente nos itens 1, 3, 4 e 5; o item 2 só prova quando a branch subir, e "bloquear o merge" depende do branch protection (E3). As dependências de desenvolvimento foram **aprovadas pelo usuário em 2026-09-24**. A PR #25 reforçou o caso de novo: o `/test` achou o CTA do `/pricing` no idioma errado e o botão sem nome acessível dirigindo o browser à mão. **Perde o topo por esforço G** contra M, com valor igual |
| 3 | [`account-security-mfa`](account-security-mfa.md) | Em **1,5 de 6**, inalterado. `value: médio` (MFA em **3/10** dos starters, sessões gerenciáveis em **1/10**). O segundo fator depende de um custo no Identity Platform que segue **não confirmado**, e o corte precisa de reescopo, como `onboarding-flow` precisava |
| 4 | [`observability-logging`](observability-logging.md) | `in-progress`, 5 dos 6 itens. O resíduo é adotar um coletor de erro, que exige conta em provedor. **Fora do conjunto elegível.** A pergunta de fechar ou não foi estacionada (E1) |
| 5 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22. O predicado de posse segue com quatro cópias em `entity.repository.ts` (`:23`, `:40`, `:64`, `:72`). A decisão de status foi estacionada (E2) |

### O que **não** foi escolhido para #1, e por quê

- **`e2e-testing` tem o mesmo valor e mais alcance**, porque protege toda PR seguinte. Perde por esforço (G
  contra M) e porque metade do argumento dela, bloquear o merge, espera o branch protection. Se o usuário
  preferir alcance a velocidade, ela é a escolha, e as dependências já estão aprovadas.
- **`account-security-mfa` perde por corte contestado, valor médio e custo não confirmado.** O item do
  segundo fator depende de habilitar um recurso do provedor, que o `/cycle` não pode fazer.
- **Ressalva sobre o #1:** o benchmark não sustenta `admin-billing-insights` (não há linha de painel
  financeiro entre os starters medidos; a spec diz isso). O argumento dela é o cruzamento entre usuário do
  fork e cliente da Stripe, e ele só pesa para fork que vende. Há um argumento de prazo a favor: receita
  começa a contar só a partir da entrega, porque webhook não traz histórico.

### O que o merge da PR #25 mudou no ranking

`billing-subscription` saiu da fila e destravou `admin-billing-insights` pelo `depends_on`, a única spec
que dependia dela. O efeito foi em três eixos:

- **Dependência.** Nenhuma spec da fila está bloqueada por `depends_on`.
- **Verificabilidade.** O harness de webhook assinado mostrou que spec de cobrança se prova quase inteira
  sem conta Stripe. Era o motivo pelo qual `billing-subscription` ficou em #2 por várias rodadas, e o
  mesmo motivo deixou de pesar contra `admin-billing-insights`.
- **Contenção.** O webhook de pagamento, o `UserDTO`, o barril do SDK, `(common)/routes.tsx` e
  `account-erasure.ts` saíram do `contends_on` coletivo. Só `admin-billing-insights` declara o webhook agora.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-25** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 3 de 5.** Fora ficam `teams-organizations` (`deferred`) e `observability-logging`
(`in-progress`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `admin-billing-insights` · `e2e-testing` · `account-security-mfa` | `AdminHomeClient.tsx` + `queryKeys.ts` + webhook de pagamento + `user.repository.ts` · `package.json` da raiz + `turbo.json` + `ci.yml` · `packages/auth/server.ts` + `session.ts` + `session-routes.ts` + `resolve-api-actor.ts` | **home do admin e caminho de cobrança**, **ferramental da raiz** e **camada de credencial**. A primeira vive na `apps/api` e na home do admin; a segunda não toca em `apps/` nem em `packages/`; a terceira fica em `packages/auth` e no resolvedor de ator |

Não há lote 2: as três elegíveis cabem no lote 1, e o teto de 3 não barrou ninguém.

O `contends_on` de `admin-billing-insights` ganhou `apps/api/(shared)/repositories/user.repository.ts`
nesta rodada. A contagem de assinaturas por plano lê o snapshot `subscription` do perfil, e os agregados de
perfil moram nesse repositório (`summary` e `activitySummary`).

### Onde o lote 1 ainda pode colidir sem ter declarado

- **`admin-billing-insights` e `account-security-mfa`** tendem a acrescentar códigos de erro em
  `translations/packages/shared/utils.ts` (o `apiErrors`), que nenhuma das duas declara. As PRs #24 e #25
  tocaram esse arquivo sem declarar. O conflito é aditivo e se resolve no merge.
- **`admin-billing-insights`** provavelmente toca `firestore.indexes.json`, `packages/sdk/src/types/index.ts`
  e `docs/PRE-PRODUCTION.md` §12. Nenhuma outra do lote declara esses arquivos.
- **`e2e-testing`** vai tocar as configs de Vitest e o `pnpm-lock.yaml`. Se a suíte E2E cobrir a aba de
  billing, lê o que `admin-billing-insights` estiver mudando, mas não escreve nos mesmos arquivos.

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte
de MVP.

`billing-subscription` declarou **6** arquivos e acertou **6**, a primeira previsão sem erro nessa direção.
Na outra, a PR tocou sem declarar `account-export.ts`, `account/deletion/route.ts`,
`apps/api/instrumentation.ts`, `AccountTabs.tsx`, `queryKeys.ts`, `apps/web/env.ts`, `pricing/page.tsx`, os
dois arquivos de tradução e `packages/sdk/src/types/account/account.ts`. `queryKeys.ts` é declarado por
`admin-billing-insights`; como as duas nunca rodaram juntas, não houve conflito. O padrão das rodadas
anteriores se repete: o arquivo que falta é vizinho dos declarados, na mesma camada.

## Precisam de decisão

Só o que é novo nesta rodada ou mudou de natureza. O que se repetia foi para
[Decisões estacionadas](#decisões-estacionadas-51).

Nenhuma pergunta aberta. As quatro desta rodada foram respondidas pelo usuário em 2026-09-25:

1. **O que o modo `simple` deve fazer:** ignorar por ora. Foi para [Decisões estacionadas](#decisões-estacionadas-51) (E10).
2. **Fechar a pendência nº 21:** fechada. Ver [Pendências vivas sem dono](#pendências-vivas-sem-dono).
3. **O soft delete pelo admin deve cancelar a assinatura:** sim, pelo caminho recomendado. Chamar
   `cancelSubscriptionForErasure` antes do soft delete, com teste. É uma tarefa direta de esforço P, na fila
   (achado A2).
4. **Rodar a descoberta:** ainda não. Foi para [Decisões estacionadas](#decisões-estacionadas-51) (E11).

O usuário também aprovou o achado de hidratação em `/en` e `/es` como a próxima tarefa depois do merge de
`admin-billing-insights` (ver [UI, i18n e front-end](#-ui-i18n-e-front-end)).

Saíram desta tabela nesta rodada: a adoção de Playwright, `@axe-core/playwright` e provedor de cobertura
(**aprovada pelo usuário em 2026-09-24**; vale quando `e2e-testing` rodar) e a query string do deep link do
onboarding, que apareceu pela segunda vez e, pela §5.1, fica só como achado com `arquivo:linha`.

## Decisões estacionadas (§5.1)

Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (11 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor |
| E2 | `teams-organizations` continua `deferred`? (13 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar; não há pré-requisito técnico. Passa a importar mais com `e2e-testing`, cujo item 2 pede que a suíte E2E bloqueie o merge |
| E4 | O gate `approved` não é usado (agora **seis** specs entregues sem passar por `approved`, incluindo `billing-subscription`) | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (3 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`), por isso precisa da sua palavra |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | este arquivo, achado A1 em [Achados](#-achados-novos-e-os-da-rodada-passada) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer; a nota de medição do `docs/AUTH-SSO.md` fica como está |
| E11 | Rodar uma descoberta (`/spec` sem argumento) antes que a fila esvazie (2 rodadas) | você | este arquivo, [Lacunas](#lacunas-avaliadas-e-não-especificadas) | **o usuário respondeu "ainda não" (2026-09-25)**. Não reapresentar até ele pedir |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* Caso medido: `onboarding-flow` ficou seis rodadas presa pelo corte
  contestado, ganhou o bloco numa rodada e foi entregue na seguinte, 5/5.
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Rode o verificador de links no
  arquivo movido e confirme zero mortos."* Esta rodada fez isso à mão pela quarta vez.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-25 |
|------|--------------|------------------------|
| [`admin-billing-insights`](admin-billing-insights.md) | `billing-subscription`, `dashboard-home` | ✅ satisfeitas (PR #25, `a1f87d0`; PR #19, `bfc4d8f`) |
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
| [`admin-billing-insights`](admin-billing-insights.md) | Seção de billing na home do admin | produto | médio | M | `proposed` | ✅ `billing-subscription` · ✅ `dashboard-home` |
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
| `data-rights-lgpd` | 2026-09-23 | [`docs/features/data-rights-lgpd/spec.md`](../docs/features/data-rights-lgpd/spec.md) — **5/5 do corte** (PR #23, `ab11a5b`), item 3 dividido: arquivos sem prova contra bucket real, assinatura transferida para `billing-subscription` e paga pela PR #25. **Quatro derivas registradas** |
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3: o deep link volta sem a query string |
| `billing-subscription` | 2026-09-25 | [`docs/features/billing-subscription/spec.md`](../docs/features/billing-subscription/spec.md) — **6/6 do corte** (PR #25, `a1f87d0`), mais o passo `billing` do expurgo herdado de `data-rights-lgpd`. 19 ✅ e 5 🔒 no `/test` (só conta Stripe real prova). ⚠️ Catálogo, portal, endpoint de webhook e chaves são passo manual por fork (`PRE-PRODUCTION.md` §12) |

**Verificado nesta rodada:** `docs/features/` tem **21** pastas e **18** `spec.md` arquivados. As três
pastas sem `spec.md` são `observability-logging` (spec continua em `specs/`), `auth-panel-context` e
`impersonation-read-only` (as duas anteriores à semeadura). Não houve colisão de arquivamento.

### O que a PR #25 entregou **além** do corte

1. **`packages/payments/ai.ts` passou a construir o toolkit sob demanda** (`getPaymentsAgentToolkit`,
   `ai.ts:9-32`), com teste em `packages/payments/__tests__/aiToolkit.test.ts`. Fecha o 🔴 que o backlog
   carregava desde 2026-09-01.
2. **As chaves da Stripe tratam string vazia como ausência e validam o prefixo** (`packages/payments/keys.ts:10-21`),
   e o webhook lê o segredo pelo pacote (`getWebhookSecret`, `packages/payments/index.ts:26-27`), não pelo
   `env.ts` da API. É isso que tornou o webhook alcançável em `next dev`.
3. **A `apps/web` passou a enxergar `NEXT_PUBLIC_APP_URL`**, declarada no bloco `client` do `env.ts`
   (`apps/web/env.ts:22`, `:31`). O `skipValidation: true` incondicional continua (`:33`).
4. **A API avisa no boot quando só uma das chaves da Stripe está presente** (`apps/api/instrumentation.ts:8-22`).
5. **O webhook responde 503 `PAYMENTS_NOT_CONFIGURED` sem as chaves** (`webhooks/payments/route.ts:136-141`),
   para a Stripe reentregar em vez de perder o evento enquanto o fork termina a configuração.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida e corrigida ao passar por ela.

| documento | afirmava | realidade medida em 2026-09-25 | veredito |
|-----------|----------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md` §9 (gate) | 666 arquivos, 1615 testes em 164 arquivos, 1 min 2,7 s | 699 arquivos, 1817 testes em 180 arquivos, 56,7 s | ✅ **corrigido nesta rodada**, junto com a distribuição por workspace |
| `docs/SECURITY.md:13-15` e `:23-24` (guards) | **26** arquivos de rota, **15** com guard, **11** nus | **29**, **18** com guard (as três de `payments/*` sob `requireCommonPanelApi`), os mesmos **11** nus | ✅ **corrigido nesta rodada**. A PR #25 atualizou a seção de pagamentos do documento e não a contagem |
| `docs/SECURITY.md:146` (rate limit) | 10 caminhos em `apps/api/proxy.ts:44-55` | **confere**, lista literal. `/payments/checkout` e `/payments/portal` ficam fora, e o documento não diz o contrário | ✅ **honesto**; ver o achado do rate limit |
| `docs/SECURITY.md`, seção "Pagamentos (Stripe)" | dedupe por `event.id`, perfil tirado do evento verificado, checkout e portal pelo perfil do guard | **confere** com `webhooks/payments/route.ts:28-72`, `:161-167` e `ctx.subjectProfile` nas duas rotas | ✅ **honesto na estreia** |
| `docs/PAYMENTS.md` (estado geral) | fluxo de ponta a ponta; 409 em `checkout/route.ts:41`; troca de assinatura em `billing-state.ts:141-147`; cancelamento em `account-erasure.ts:95` | **confere**, âncoras literais | ✅ **honesto**; o documento foi reescrito pela PR #25 |
| `docs/AUTH-SSO.md:66-71` (modo de produto) | o layout `(common)` manda o comum para a web no `simple`; existe `commonUserUsesPanel()`; existe `apps/web/app/[locale]/(authenticated)/layout.tsx` | **nenhum dos três existe** (achado A1 do plano de `billing-subscription`, reconferido) | ⚠️ **nota de medição acrescentada** abaixo do parágrafo; a reescrita da tabela ficou estacionada (E10) |
| `docs/PRE-PRODUCTION.md`, "Pendência — no modo `simple`…" | no `simple` o painel comum fica restrito a administradores | **falso**, mesma causa da linha acima | ⚠️ **nota de correção acrescentada** no topo da seção; a pendência foi fechada em 2026-09-25 |
| `docs/AUTH-PANEL.md` e `docs/SETUP.md:85` (onboarding) | conferidos na rodada passada | não tocados pela PR #25 | sem remedição |

> **Nota de método.** O §9 do `PRE-PRODUCTION.md` foi defasado pela sétima auditoria seguida, pelo mesmo
> mecanismo: medido certo e invalidado pela entrega seguinte. O `SECURITY.md` também: a PR atualizou o
> parágrafo sobre o assunto dela e deixou a contagem de rotas, três parágrafos acima, para trás.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

### Deriva de implementação: `billing-subscription`

Registrada por inteiro na spec arquivada. Em resumo: o fork com uma chave só sobe com a cobrança desligada
e um aviso de boot, em vez de falhar (a spec pedia "falhar cedo e visível"; estava imprecisa); o snapshot
ganhou `lastEventAt` para a regra de ordem; a assinatura duplicada por duas abas é risco aceito pelo
usuário; o soft delete pelo admin não cancela a assinatura e virou achado; o `contends_on` acertou 6 de 6 e
deixou de fora dez arquivos vizinhos.

### Mudou embaixo da spec: `admin-billing-insights`

A spec dizia que `billing-subscription` estava em 0/6, que não existia `payments/` na API, que o `UserDTO`
não tinha `subscription` e que o webhook era stub. As quatro afirmações ficaram falsas com a PR #25. As
seções "Por que está separada", "O que já existe no repo" e "Riscos" foram reescritas com o estado real e
com uma tabela do que ainda falta para cada item do corte. **Corte de MVP e status não foram tocados.** O
`contends_on` ganhou `user.repository.ts`.

### Âncoras deslocadas, corrigidas nas specs vivas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`observability-logging`](observability-logging.md) | `webhooks/payments/route.ts:61,69` (×4) | **`:157,169`** | webhook reescrito (PR #25) |
| [`observability-logging`](observability-logging.md) | `apps/api/instrumentation.ts:15-34`, `:20-24`, `:26-30`, `:36-37` | **`:35-56`**, **`:40-44`**, **`:46-50`**, **`:58-59`** | aviso de cobrança meio configurada no topo (PR #25) |
| [`observability-logging`](observability-logging.md) | `account-export.ts:90`, `account-erasure.ts:111`, `:32-36` | **`:100`**, **`:159`**, **`:36-38`** | passo `billing` e campos de assinatura (PR #25) |
| [`teams-organizations`](teams-organizations.md) | `user.ts:2` (`UserType`) | **`:4`** | import de `SubscriptionState` no topo (PR #25) |
| [`e2e-testing`](e2e-testing.md) | 1615 testes em 164 arquivos | **1817 em 180** | PR #25 |

As âncoras de `account-security-mfa` conferem: a rota de exclusão (`account/deletion/route.ts:55-72`) não
se deslocou, porque a PR #25 acrescentou o tratamento de falha de billing depois do trecho citado.

### Contagens e afirmações de estado corrigidas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`observability-logging`](observability-logging.md) | 20 linhas de `logEvent(` | **26**, a definição incluída; as seis novas são do escopo `payments` | nota de remedição na spec. A PR também somou um `console.warn` de boot (`instrumentation.ts:19`) |

### O que a auditoria **não** encontrou

Nenhuma spec `done` regrediu no código. Nenhuma feature em `docs/features/*/STATE.md` está sem `spec:`
quando deveria ter. Nenhuma entrega parcial órfã nova; a de `account-security-mfa` segue sendo a única.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-09-25 (pós-PR #25).** Cada achado da rodada anterior foi reaberto no disco, com o
> veredito na própria linha. **Placar: 3 fechados · 1 fechado em parte · 4 novos · o resto confirmado
> aberto.** Os quatro novos vêm da seção "Achados fora do escopo" do plano de `billing-subscription` (A1 a
> A4), que não tinham chegado ao backlog. Âncoras de `user.repository.ts`, `AccountTabs.tsx` e
> `apps/api/instrumentation.ts` se deslocaram com a PR #25.

### ✅ Fechados nesta rodada

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🔴 **`packages/payments/ai.ts` instanciava o `StripeAgentToolkit` com `\|\| ""` em escopo de módulo** | `packages/payments/ai.ts:4-5` | A PR #25 trocou por `getPaymentsAgentToolkit()`, construído sob demanda e `null` sem chave (`ai.ts:9-32`), com teste em `packages/payments/__tests__/aiToolkit.test.ts` |
| 🟡 **O webhook da Stripe era inalcançável em desenvolvimento** (`skipValidation` descartava `STRIPE_WEBHOOK_SECRET`) | `apps/api/env.ts:46` | O webhook passou a ler o segredo por `getWebhookSecret()` de `@repo/payments` (`packages/payments/index.ts:26-27`), cujo `keys.ts` nunca pula validação. O `/test` rodou o harness assinado em `next dev`. O `skipValidation` da API continua em `:46`, sem efeito sobre o webhook |
| 🟡 **Webhook da Stripe era casca** (dois handlers `// TODO`) | `webhooks/payments/route.ts:13,23` | Handlers reais e dedupe (`route.ts:28-119`, `:161-167`). O eco do evento no corpo da resposta **continua** e segue na tabela de repositório, rotas e proxy |
| ◐ **`NEXT_PUBLIC_APP_URL` fora do bloco `client` da `apps/web`** (metade do achado do `skipValidation`) | `apps/web/env.ts` | Declarada no `client` (`:22`, `:31`). A outra metade, `skipValidation: true` incondicional, segue aberta em `:33` |

### 🆕 Achados novos e os da rodada passada

As quatro primeiras linhas são novas nesta rodada. As seis seguintes entraram na rodada passada e foram
reconferidas no disco: seguem abertas.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| ⚠️ **Soft delete de usuário pelo admin não cancela a assinatura** (A2) | `apps/api/app/(routes)/users/[id]/route.ts:117` · `user.repository.ts:50-61` | A pessoa apagada pelo admin continua sendo cobrada, e o webhook deixa de achar o perfil, porque `findByStripeCustomerId` ignora `deletedAt`. A exclusão pelo titular cancela; esta não. **Decidido em 2026-09-25:** chamar `cancelSubscriptionForErasure` antes do soft delete, com teste. Tarefa P aprovada, na fila |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:23-24` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **O webhook responde 500 para assinatura inválida** (A4) | `webhooks/payments/route.ts:156-158` → `failure()` em `:121-125` | A Stripe reentrega por até três dias um evento que nunca vai validar. Um 400 encerra as tentativas. `api-hardening` está arquivada, então é tarefa direta |
| 🟡 **O deep link do onboarding perde a query string** | `apps/app/proxy.ts:215` | O proxy grava só o `pathname`. Afeta link de listagem filtrada ou paginada aberto antes do onboarding. Saiu de "Precisam de decisão" pela §5.1: tarefa direta P, gravar `pathname + search` e um caso a mais em `proxy.test.ts` |
| 🟡 **Os `HookForm*` publicam `aria-invalid="false"` com a mensagem de erro visível** | `packages/design-system/components/ui/form.tsx:109-123` · `packages/design-system/components/form/hookform/` | O `HookFormInput` usa `<Controller>` direto, sem o `FormField` que põe o nome do campo no contexto; o `useFormField` não acha o erro e o `aria-describedby` sai sem o id da mensagem. Achado pelo `/review` da PR #24 (O3). Vale para os oito componentes da pasta e para todo formulário do repositório; leitor de tela não anuncia o erro. Terceiro caso do design-system sem task de teste; cruza com [`e2e-testing`](e2e-testing.md), cujo item 3 é acessibilidade automatizada |
| 🟡 **`/favicon.ico` não existe na `apps/app` e cai no segmento `[locale]`** | `apps/app/app/` (sem `favicon.ico` nem `icon.*`) | O navegador pede o ícone em toda página. Anônimo vai para `/favicon.ico/sign-in`; conta com onboarding pendente vai para `/favicon.ico/onboarding?redirect=%2Ffavicon.ico` (O5 do `/test` da PR #24). Anterior à feature; ela só deixou o sintoma mais visível |
| 🟡 **`<html lang>` segue o cookie `x-locale`, não a URL, na primeira carga** | root layout da `apps/app` | `/en/sign-in` com `x-locale=pt-br` sai com `lang="pt-br"` (O4 do `/test` da PR #24). Leitor de tela pronuncia a página no idioma errado até a navegação seguinte |
| 🟡 **`--destructive` do dark tem contraste 1,97:1 como texto** | `packages/design-system/styles/globals.css:63` · usos como texto em `ui/form.tsx:156`, `ui/field.tsx:227`, `ui/label.tsx:21`, `form/hookform/*` | Toda mensagem de erro de formulário e o `pastDueHint` da aba billing ficam abaixo dos 4,5:1 do AA no dark (medido pelo `/test` de `billing-subscription` e recalculado em oklch → sRGB: 1,97:1 sobre `--background`). Clarear o token não resolve sozinho: o mesmo token é fundo sólido do item `danger` do antd no hover (`antd-app.tsx:20`, texto branco) e, para ficar ≥4,5:1 como texto (L ≈ 0,60), o branco sobre ele cai para 4,41:1. Caminho provável: mapear o `--destructive-foreground` do dark (`:64`, 5,18:1) no `@theme` e usá-lo como cor de texto de erro. Achado pelo `/review` de `billing-subscription` |
| 🟡 **`Button` com `loading` perde o nome acessível** | `packages/design-system/components/ui/button.tsx:72-73` · `ui/spinner.tsx:8-9` | O `loading` troca o conteúdo pelo `Spinner`, cujo `aria-label="Loading"` é literal em inglês; no browser o botão ficou com nome `""` durante o redirect do checkout (`/test` de `billing-subscription`, item 11). Vale para todo botão com `loading` (`AccountPrivacyPanel`, painel de billing, formulários). Corrigir no componente, mantendo o texto do botão acessível enquanto o spinner aparece |
| 🟡 **As páginas da `apps/web` leem o idioma do cookie `x-locale`, que o proxy grava na mesma resposta** | `apps/web/proxy.ts:104-108` · `getDictionary()` de `packages/internationalization/server.ts` · ex.: `apps/web/app/[locale]/pricing/page.tsx` (copy, metadata e o link `/contact` do plano Enterprise), `(home)/components/hero.tsx` (link `/contact`) | Ao trocar de idioma pela URL, a página renderiza no idioma da visita anterior até a navegação seguinte. O `/review` de `billing-subscription` corrigiu só o `href` dos CTAs de plano (usa o segmento `[locale]`); o resto é anterior à feature e atinge as ~20 páginas e componentes que chamam `getDictionary()` sem argumento. Mesma causa do achado de `<html lang>` acima |

### 🔴 Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/security/index.ts:11`** lê `keys().ARCJET_KEY` no **import**, e `@repo/security` é o primeiro import do middleware da `apps/api` | `packages/security/index.ts:11` | Reconferido. Uma `ARCJET_KEY` presente e malformada lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:40-44` | Reconferido: `throw` em `:40-44` (a âncora desceu 20 linhas com o aviso de cobrança da PR #25), zero `process.exit`. `/health/ready` detecta parte das falhas, não esta |
| ⚠️ **Quatro das seis rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha | `apps/api/proxy.ts:44-55` | Recontado em 2026-09-25: ficam fora o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 11 de 29** arquivos de rota exportam handler nu, 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado: 29 arquivos, 18 com guard. As três rotas de `payments/*` nasceram com guard |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:87` · `packages/auth/session.ts:78-81` | Reconferido. A parte documental está fechada (`docs/SECURITY.md:150`); o comportamento segue |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada**: `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` no `package.json` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` não existe. **Vigésima primeira auditoria consecutiva** |
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
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:122` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:132`). N+1 do Admin SDK. Nona rodada aberto; âncoras desceram com os métodos de billing da PR #25 |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:106` · `:118` · `:122` · `:141` · `:159` | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` da api não tem consumidor e não segue o contrato de erro** | `apps/api/app/(routes)/auth/sign-in/route.ts:12` | Reconferido: zero `try`, `:12` devolve string crua (`"User not found"`). Viola a regra de ouro 3. O `sign-up` ganhou chamador indireto de `createDefaultUserProfile` na PR #24 e tem `try` |
| 🟡 **Webhook da Stripe ecoa o evento inteiro** na resposta de sucesso | `apps/api/app/(routes)/webhooks/payments/route.ts:176` | A casca fechou com a PR #25; o eco ficou (`{ result: event, ok: true }`). O corpo volta para a Stripe, não para o browser, mas carrega dado do cliente sem necessidade. Fica no arquivo que [`admin-billing-insights`](admin-billing-insights.md) vai alterar |
| ◐ **`skipValidation` incondicional na `apps/web`** | `apps/web/env.ts:33` | Reconferido. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25 |
| ◐ **O bounce do proxy apaga a query string**, corrigido só para as rotas de `oobCode` | `apps/app/proxy.ts:190-203` | Reconferido: `redirectUrl.search = ""` em `:201` (âncoras desceram uma linha com o import da PR #24). Mesma família do achado novo do deep link do onboarding |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:170,174` | Reconferido: `cookieStore.set` sem `maxAge` |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Componente client renderiza em pt-br no servidor em `/en` e `/es`**, e a hidratação falha. **Próxima tarefa, aprovada pelo usuário em 2026-09-25** | `packages/internationalization/utils/cookies.ts:2-4` · `packages/internationalization/client.ts:8` | `getCookie` devolve `null` sem `window`, então `getDictionary()` cai no locale padrão durante o SSR e o navegador reescreve no idioma do cookie. Repro: `curl -H 'Cookie: <sessão do admin>; x-locale=en' http://localhost:3000/en/admin` devolve "Olá", "Atividade" e "Cobrança"; no navegador, "Hydration failed" em toda carga de `/en` e `/es` (sidebar, breadcrumb e seções da home). Achado em 2026-09-25 na seção de billing da home do admin, que herda o defeito. A correção na raiz é um provider de locale alimentado pelo segmento `[locale]` e um hook `useDictionary()`, mas `getDictionary()` do client aparece em 63 arquivos de `apps/app`, `apps/web`, `packages/design-system` e `packages/auth`, e parte delas roda fora de render (`packages/design-system/index.tsx:25`, `apps/app/shared/lib/formatDisplayDateTime.ts:21`), onde um contexto não pode ser lido |
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:51-53` (estado lido uma vez) · `:55-62` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
| 🟡 **`"Pick a date"` literal no `DateInput`** | `packages/design-system/components/ui/date-input.tsx:50` | Reconferido. Sobreviveu às PRs #11 a #25 |
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
> Cada linha traz o veredito desta rodada. A PR #25 acrescentou uma pendência, a configuração da Stripe por
> fork (linha 23), e não criou índice novo (`firestore.indexes.json` não está no diff).

| # | pendência | onde vive | veredito 2026-09-25 |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**; não remedido nesta rodada, nada no repositório mudou |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto**. São **seis** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido (404, `[]`, 25 PRs); estacionado (E3) |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**: `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve 0; estacionado (E1) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto**. Trava também o passo `storage` do expurgo de conta |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **continua aberto** (exige projeto Firebase real) |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #24 criou 7 contas só no emulador, que as descarta |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**: `git ls-remote --heads` devolve 24, ou seja, 23 além de `main` (eram 22) |
| 17 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto**. O `/test` da PR #24 também não percorreu o Google no emulador; o nome do Google como valor inicial do passo 1 ficou fechado só por leitura |
| 18 | `storage.rules` nunca publicado nem testado | `PRE-PRODUCTION.md` | **continua aberto**; depende da 11 e de `e2e-testing` |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto**. Vazia, o canal cai no formulário de contato, que é maquete |
| 23 | 🆕 Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com quatro eventos, chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **aberto, recém-registrado**. Cinco critérios de `billing-subscription` seguem 🔒 até uma conta real existir. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |

A 21 foi fechada pelo usuário em 2026-09-25. A 23 é nova.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| 🆕 **Gate de acesso por plano · bloqueio em `past_due` · trial, cupom, reembolso e faturas em UI própria · nome do plano traduzido** | gate por plano **2/10** na nota do benchmark | Fora do corte de [`billing-subscription`](../docs/features/billing-subscription/spec.md), arquivada. O Customer Portal cobre trial, cupom, reembolso e faturas; o bloqueio por situação é decisão de produto de cada fork. O gate por plano é o candidato mais forte a spec própria numa descoberta, com prevalência baixa escrita ao lado. |
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Estacionado (E1). |
| **Passos de onboarding condicionais por papel ou plano · checklist de ativação · tour interativo** | — | Fora do corte de [`onboarding-flow`](../docs/features/onboarding-flow/spec.md), arquivada. Dependem de haver produto, e cada fork tem o seu. O fork acrescenta um passo editando `ONBOARDING_STEPS`. |
| **Coleta de dados de domínio no onboarding (empresa, cargo, segmento)** | — | Fora do mesmo corte. Não é genérico; é código do fork. |
| **Onboarding para a conta criada pelo admin** | — | Decisão D3 da entrega: o admin já informa o nome, e a mesma rota cria admins. O perfil sem o campo conta como concluído. |
| **Demais direitos do art. 18 com fluxo próprio · painel de pedidos de titular · exportação assíncrona** | — | Fora do corte de [`data-rights-lgpd`](../docs/features/data-rights-lgpd/spec.md), arquivada. O canal de privacidade cobre os demais pedidos por ora. |
| **RoPA, runbook de incidente, DPA e transferência internacional** | — | Fora do corte de `data-rights-lgpd` por serem documento, não código. Candidato natural a uma spec de templates em `docs/` numa próxima descoberta, que é também onde o eixo `confianca` pode ganhar peso. A descoberta está adiada (E11). |
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
