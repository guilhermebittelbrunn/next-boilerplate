# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-23 (`/spec --sync`, pós-merge da PR #23) · anteriores: 2026-09-23 (PR #22) ·
> 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) · 2026-09-16 (PR #17) ·
> 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 · 2026-09-14 ·
> 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 ·
> **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`data-rights-lgpd` foi entregue e arquivada.** Era o #1 desta lista. PR #23 mergeada em `main` em
>    2026-09-24T02:32:17Z (`ab11a5b`), CI `success` no SHA de merge (`gh run 35947675147`). Os cinco itens
>    do corte foram reabertos no código. O item 3 fecha dividido: a limpeza de arquivos existe mas nunca
>    rodou contra bucket real, e o cancelamento de assinatura virou ponto de extensão, com a obrigação
>    transferida para [`billing-subscription`](billing-subscription.md). É a décima sexta spec a sair da
>    fila e vive em [`docs/features/data-rights-lgpd/spec.md`](../docs/features/data-rights-lgpd/spec.md).
> 2. **`onboarding-flow` é o #1, e sai daqui com o reescopo escrito na própria spec.** Três rodadas
>    seguidas a auditoria recomendou reescrever o corte antes do `/analyze` e ninguém reescreveu. Nesta, a
>    auditoria escreveu a leitura mínima que torna o corte planejável, sem apagar nenhum item. Ver
>    [Ordem recomendada](#ordem-recomendada).
> 3. **Oito recomendações repetidas saíram do limbo** pela [§5.1 da `cycle-policy`](../.claude/cycle-policy.md).
>    Não são mais reapresentadas como pergunta; estão em [Decisões estacionadas](#decisões-estacionadas-51),
>    cada uma com dono e endereço.
> 4. **A auditoria corrigiu cinco afirmações medidas em `docs/`**, aplicando a regra "nenhum gate lê prosa"
>    da `cycle-policy` §4: a contagem de rotas e guards e a lista do rate limit em `docs/SECURITY.md`, a
>    rota de renovação de sessão que o mesmo documento omitia, os números do gate em `docs/PRE-PRODUCTION.md`
>    e a declaração do teto de sessão que faltava lá. Ver [Contradições](#contradições-doc--código-medidas-nesta-rodada).
> 5. **O `contends_on` errou nas duas direções.** `data-rights-lgpd` declarou 3 arquivos, tocou 1 deles e
>    tocou sem declarar outros 11, entre eles `user.repository.ts` e `(common)/routes.tsx`, que
>    `billing-subscription` declara. Se as duas tivessem rodado no mesmo lote, teriam colidido.

## Contadores

Sobre as **7 specs que seguem em `specs/`**. Recontados do disco em 2026-09-23, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 5 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 16 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 3 · `confianca` 1 · `dx` 1 (+1 `in-progress` em `dx`, +1 `deferred` em
`produto`). **Por esforço:** P 0 · M 5 · G 2. **Por valor:** alto 4 · médio 3 · baixo 0.

**Transições aplicadas: 1** (`data-rights-lgpd`: `proposed` → `done`, arquivada). Nenhuma spec nova
entrou: esta rodada é `--sync` puro.

> **A audiência `confianca` ficou com uma spec só**, `account-security-mfa`, que tem valor médio e
> precisa de reescopo. É o menor peso desse eixo desde a semeadura. Não é defeito de priorização: é o que
> sobra depois de `api-hardening`, `cookie-consent`, `audit-log`, `session-refresh` e `data-rights-lgpd`
> entregues. Uma próxima rodada de descoberta (`/spec` sem argumento) deveria olhar para esse eixo.

### O caso `data-rights-lgpd` — o que foi conferido antes de arquivar

PR **#23** mergeada em `main` em 2026-09-24T02:32:17Z (merge commit `ab11a5b`), com CI `success` nesse SHA
(`gh run 35947675147`, conferido com `gh run view`: `headSha` = `ab11a5b2…`). Os cinco itens, reabertos no
código; a tabela completa com todas as âncoras está na spec arquivada, seção "Estado da entrega".

| item | veredito | evidência principal |
|------|----------|---------------------|
| 1. Baixar os próprios dados | **implementado** | `account/export/route.ts:9` sob `requireCommonPanelApi`, montado por `account-export.ts:95-129`; `lastAccessAt` coberto em `accountExportRoute.test.ts:203` |
| 2. Solicitar a exclusão com confirmação | **implementado** | `account/deletion/route.ts:19`, com senha redigitada em `:55-72`; diálogo em `AccountPrivacyPanel.tsx:123-171` |
| 3. Exclusão coordenada, sem órfãos | **implementado**, dividido | seis passos em `account-erasure.ts:89-121`; arquivos por prefixo (`:53-65`) sem prova contra bucket real; assinatura como ponto de extensão `skipped` (`:67-78`), transferida para `billing-subscription` |
| 4. Prazo declarado nos 3 idiomas | **implementado** | 15 dias em `translations/apps/app/pages/common/account.ts:87-88`, `:213-214`, `:340-341` |
| 5. Canal de privacidade publicado | **implementado**, com deriva | `NEXT_PUBLIC_PRIVACY_CONTACT` → `privacyContact.ts:10-19`; a política segue modelo, agora com cookies e direitos declarados |

O `/test` rodou o expurgo contra o emulador de Auth e Firestore e provou o recadastro com o mesmo e-mail.
O placar dele foi 38 aprovados, 1 reprovado (o deep link das abas, anterior à entrega) e 6 não
verificáveis por falta de bucket e de chave da Stripe.

**Arquivamento:** `docs/features/data-rights-lgpd/spec.md` não existia, o `STATE.md` já trazia
`spec: data-rights-lgpd` (`:5`), e os links de saída da spec (duas notas de pesquisa, uma spec arquivada,
uma spec viva) foram reescritos **antes** do `git mv`. Os três links de entrada que o movimento quebrou
foram corrigidos: `docs/features/user-activity-tracking/spec.md`, `docs/features/user-activity-tracking/analyze/plan.md`
(duas ocorrências) e `docs/features/data-rights-lgpd/analyze/plan.md:5`.

## Gates — medidos nesta auditoria

Executados agora, com `--force`, neste workspace, com o `HEAD` em `ab11a5b`. Não copiados do `/test` nem
da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **648 arquivos · 0 erros** (`No fixes applied`, 429 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 1 min 12,4 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-23 (PR #22) |
|-----------|---------:|-------:|---------------------------|
| `api` | 57 | 651 | **+4 arquivos · +54** |
| `app` | 65 | 462 | **+7 arquivos · +44** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 8 | 101 | — |
| `@repo/shared` | 4 | 44 | — |
| `@repo/internationalization` | 5 | 44 | **+1 arquivo · +11** |
| `web` | 6 | 35 | **+1 arquivo · +4** |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **158** | **1547** | **+13 arquivos · +113 testes** |

A PR #23 não criou workspace novo: seguem 24 tasks e **10** configs de Vitest, todas com `testTimeout`. O
`pnpm check` subiu de 624 para **648** arquivos.

CI: a execução de merge de **#23** (`ab11a5b`) está em **`success`**. `git log origin/main -1` devolve
`ab11a5b`, o mesmo commit do `HEAD` local.

Branch protection segue **não ligado**, remedido hoje: `gh api repos/:owner/:repo/branches/main/protection`
→ **404**, `rulesets` → **`[]`**. O repositório tem **23** PRs.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Uma spec segue bloqueada por dependência.**

> **O critério de execução volta a valer sem exceção:** o que uma rodada autônoma consegue provar. O
> `/cycle` não provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta
> com metade dos critérios "não verificados". A exceção da rodada passada foi `data-rights-lgpd`, por
> obrigação legal, e ela foi paga.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`onboarding-flow`](onboarding-flow.md) | **Valor alto, esforço M, zero dependência de infra externa, e a única spec da fila que uma rodada autônoma prova inteira sob o emulador.** O que a segurava há seis rodadas era o corte contestado (item 2 esvaziado pela PR #12; nove pontos de decisão de destino contra cinco declarados). A auditoria escreveu na spec o bloco **"Reescopo que o `/analyze` deve aplicar"**: o desvio mora em `(common)/layout.tsx:30-35`, ao lado do desvio de admin que já existe, e isso torna os nove pontos irrelevantes para o desvio; o item 2 reaproveita `PUT /account` sem campo novo de coleta; o único campo novo é o estado do onboarding, nascendo em `user-merge.ts:47`; o deep link exige que o proxy repasse o caminho num header. O `contends_on` ganhou o layout |
| 2 | [`billing-subscription`](billing-subscription.md) | Valor alto e ainda em **0/6**, reconferido: não existe grupo `payments/` entre os 8 de `apps/api/app/(routes)/`, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, o SDK registra **7** actions (`client/index.ts:14-20`) e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`). **Ganhou uma obrigação nesta rodada:** preencher o passo `billing` do expurgo de conta (`account-erasure.ts:67-78`) e pôr a assinatura no arquivo de exportação. **Segue atrás por verificabilidade:** checkout, portal e webhook só se provam com chaves reais da Stripe. O 🔴 de `packages/payments/ai.ts:4-5` continua sendo pré-requisito barato |
| 3 | [`account-security-mfa`](account-security-mfa.md) | Em **1,5 de 6**, inalterado. `git grep -w -i "multifactor\|totp"` em `apps/` e `packages/` devolve **zero**. Continua `value: médio` (MFA em **3/10** dos starters, sessões gerenciáveis em **1/10**). O item 4 cresceu: são **11** declarações de `MIN_PASSWORD_LENGTH`, a PR #23 criou a décima primeira. **A colisão com `data-rights-lgpd` em `packages/auth/server.ts` caiu**, porque a entrega não tocou esse pacote. Custo de MFA no GCIP segue **não confirmado**. Precisa de reescopo, como `onboarding-flow` precisava |
| 4 | [`e2e-testing`](e2e-testing.md) | **Recuperou um argumento concreto, de outro tipo.** A quinta aba da área de conta fez a página rolar na horizontal a 375 px e nenhum teste acusou; quem pegou foi a passada manual do `/test` (D1 de `data-rights-lgpd`). A correção veio com teste jsdom, que não mede largura. E o `ActionsMenu` do design-system ganhou prop nova cujo único teste o substitui por mock. O resto segue medido: zero `playwright`/`cypress`/`axe`, nenhuma das 10 configs com cobertura, nenhum teste de regra do Firestore. Esforço **G** e dependência nova (Playwright) são o que a mantém aqui |
| 5 | [`admin-billing-insights`](admin-billing-insights.md) | Bloqueada, e é a única. Espera `billing-subscription`, em 0/6. O risco que ela carrega é de correção: agregar receita a partir de webhook sem dedupe por `event.id` infla o número em silêncio |
| 6 | [`observability-logging`](observability-logging.md) | `in-progress`, 5 dos 6 itens. O resíduo é adotar um coletor de erro, que exige conta em provedor. **Fora do conjunto elegível.** A pergunta de fechar ou não foi estacionada — ver [Decisões estacionadas](#decisões-estacionadas-51) |
| 7 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22. O predicado de posse ganhou pelo menos mais duas cópias com a PR #23 (`entity.repository.ts:40`, `:64`). A decisão de status foi estacionada |

### O que **não** foi escolhido para #1, e por quê

- **`billing-subscription` é a segunda e perde só por verificabilidade.** Empata em valor, tem esforço M e
  o corte não foi contestado. Uma rodada autônoma sem chaves de teste da Stripe devolveria checkout,
  portal e webhook como "não verificados". Ela passa ao topo no dia em que existirem chaves de teste no
  ambiente de desenvolvimento, ou em que a execução deixar de ser autônoma.
- **`account-security-mfa` perde por corte contestado e valor médio.** Tem o mesmo problema que
  `onboarding-flow` tinha (o índice dizia 0/6 quando era 1,5/6, e o item 4 é mudança de contrato em 11
  lugares), e ainda depende de um custo do provedor que ninguém confirmou.
- **Ressalva sobre o #1:** o reescopo foi escrito pela auditoria, em modo `--sync`, que normalmente não
  reescreve corte. Ele não apaga nenhum item nem muda o que a spec promete; diz onde e com o quê cada item
  se cumpre. Se você discordar, reverter é apagar o bloco da spec — ver [Precisam de decisão](#precisam-de-decisão) nº 1.

### O que o merge da PR #23 mudou no ranking

`data-rights-lgpd` saiu da fila sem destravar ninguém pelo `depends_on`: nenhuma spec dependia dela. O
efeito foi em outros três eixos:

- **Transferência de obrigação.** `billing-subscription` herdou o passo `billing` do expurgo, como
  `data-rights-lgpd` tinha herdado o `lastAccessAt` de `user-activity-tracking`. A cadeia de transferências
  foi paga uma vez; esta é a segunda.
- **Contenção.** `packages/auth/server.ts` e `base.repository.ts` saíram do `contends_on` coletivo (eram
  citados por ela), e `firestore.indexes.json` caiu para **1** citação (`teams-organizations`).
- **Lotes.** Com a colisão em `packages/auth/server.ts` desfeita, `account-security-mfa` entra no lote 1.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-23** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 4 de 7.** Fora ficam `teams-organizations` (`deferred`), `observability-logging`
(`in-progress`) e `admin-billing-insights` (espera `billing-subscription`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `onboarding-flow` · `account-security-mfa` · `e2e-testing` | `apps/app/proxy.ts` + `postLoginNavigation.ts` + `user-merge.ts` + `UserDTO` + `(common)/layout.tsx` · `packages/auth/server.ts` + `session.ts` + `session-routes.ts` + `resolve-api-actor.ts` · `package.json` da raiz + `turbo.json` + `ci.yml` | **caminho de entrada do app**, **camada de credencial** e **ferramental da raiz**. A primeira vive no layout e no perfil, a segunda dentro de `packages/auth` e do resolvedor de ator, a terceira não toca em `apps/` nem em `packages/` |
| **2** | `billing-subscription` | webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `(common)/routes.tsx` + `account-erasure.ts` | sozinha |

### Por que cada spec ficou fora do lote 1, nominalmente

- **`billing-subscription` colide com `onboarding-flow`** em `packages/sdk/src/types/user/user.ts`: as duas
  acrescentam campo ao `UserDTO`. Mesmo sem a colisão, ela ficaria fora pelo teto de 3, porque é a
  segunda na ordem e as três do lote 1 já estão disjuntas entre si.
- **`account-security-mfa` entrou no lote 1 pela primeira vez.** A colisão que a separava de
  `data-rights-lgpd` em `packages/auth/server.ts` sumiu com a entrega.

### Nota de processo — a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado — ver [`README.md`](README.md#depends_on--contends_on).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte
de MVP, e a amostra desta rodada mostra quanto ela erra.

`data-rights-lgpd` declarou **3** arquivos e acertou **1** (`base.repository.ts`). Os outros dois
sobraram: `packages/auth/server.ts` não foi tocado (o expurgo só chama `revokeUserSessions` e `deleteUser`)
e `firestore.indexes.json` também não, porque o desenho evitou índice novo de propósito. Na outra
direção, a PR tocou **sem declarar** `entity.repository.ts`, `user.repository.ts`,
`audit-event.repository.ts`, `storage.ts`, `apps/api/proxy.ts`, `(common)/routes.tsx`, `(common)/paths.ts`,
`Footer.tsx`, `PageFormFooter.tsx`, `action-menu.tsx` e `apps/web/env.ts`.

Dois desses importam para o backlog vivo: `user.repository.ts` e `(common)/routes.tsx` estão no
`contends_on` de `billing-subscription`, e `entity.repository.ts` no de `teams-organizations`. **Um lote
que juntasse `data-rights-lgpd` e `billing-subscription` teria sido declarado disjunto e colidido em dois
arquivos.** O padrão das cinco últimas rodadas se repete: o arquivo que falta é vizinho dos declarados, na
mesma camada. Ao declarar `contends_on`, declare a camada, não os arquivos que você lembra dela.

## Precisam de decisão

Só o que é novo nesta rodada ou mudou de natureza. O que se repetia foi para
[Decisões estacionadas](#decisões-estacionadas-51).

| # | questão | recomendação |
|---|---------|--------------|
| 1 | **Aceitar o reescopo de `onboarding-flow` que a auditoria escreveu na spec?** O bloco diz onde e com o quê cada item do corte se cumpre, sem apagar item | **Aceitar e planejar.** Ele aplica o padrão que o repositório já usa (desvio de admin no layout) e é o que tira a spec do limbo de seis rodadas. Reverter é apagar o bloco |
| 2 | **O deep link das abas da conta (`?tab=`) está quebrado pela barra lateral.** Trocar de aba pela barra lateral muda a URL e não muda a aba, porque o estado é lido uma vez na montagem (`AccountTabs.tsx:44-46`) e a troca usa `history.replaceState` (`:48-55`). Anterior à PR #23, mas ela acrescentou o quinto item de barra lateral que o exercita | **Tarefa direta de esforço P:** derivar a aba ativa do `?tab=` a cada navegação, aceitando o custo de um `router.replace`. A decisão de não usar o router está comentada em `:48-50`, então mudar exige sua palavra. O teste de deep link do `AccountTabs` fica aberto de propósito até lá |

## Decisões estacionadas (§5.1)

Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (9 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor |
| E2 | `teams-organizations` continua `deferred`? (11 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar; não há pré-requisito técnico |
| E4 | O gate `approved` não é usado (agora **quatro** specs entregues sem sair de `proposed`, incluindo `data-rights-lgpd`) | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | ✅ **saiu do limbo nesta rodada**: `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."*
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Rode o verificador de links no
  arquivo movido e confirme zero mortos."* Foi o que esta rodada fez à mão.

Fecharam nesta rodada, sem precisar de você: a confirmação de `data-rights-lgpd` como #1 (entregue) e
"quem escreve a política de privacidade que o banner linka" (a política passou a declarar os cookies,
`git grep -c -i cookie` no arquivo de tradução devolve 6 linhas, contra 0 antes).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-23 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`billing-subscription`](billing-subscription.md) · [`observability-logging`](observability-logging.md) · [`onboarding-flow`](onboarding-flow.md) | — | ✅ sem dependência |
| [`admin-billing-insights`](admin-billing-insights.md) | `billing-subscription`, `dashboard-home` | ⛔ **bloqueada** — `billing-subscription` está em 0/6; ✅ `dashboard-home` fechou |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
| [`admin-billing-insights`](admin-billing-insights.md) | Seção de billing na home do admin | produto | médio | M | `proposed` | ⛔ `billing-subscription` · ✅ `dashboard-home` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
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
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`) |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`). ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`). ⚠️ O índice composto novo **precisa ser publicado** |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`). ⚠️ **Três desvios registrados**; o índice composto de `auditEvent` **precisa ser publicado**. 🆕 A imutabilidade da trilha ganhou uma exceção nomeada na PR #23 — ver [Deriva](#deriva) |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`). ⚠️ **Três índices compostos** precisam ser publicados |
| `session-refresh` | 2026-09-17 | [`docs/features/session-refresh/spec.md`](../docs/features/session-refresh/spec.md) — 6/6 do corte (PR #20, `cc93229`). ⚠️ A **revogação ponta a ponta segue 🔒 não verificada** |
| `user-activity-tracking` | 2026-09-19 | [`docs/features/user-activity-tracking/spec.md`](../docs/features/user-activity-tracking/spec.md) — 5/6 do corte (PR #21, `e656331`). ✅ **O item 4 parcial foi pago** pela entrega de `data-rights-lgpd`: `lastAccessAt` sai no export e some com o perfil na exclusão |
| `admin-analytics-dashboard` | 2026-09-23 | [`docs/features/admin-analytics-dashboard/spec.md`](../docs/features/admin-analytics-dashboard/spec.md) — 5/5 do corte (PR #22, `03498ae`). Gráfico entregue como histograma de recência |
| `data-rights-lgpd` | 2026-09-23 | [`docs/features/data-rights-lgpd/spec.md`](../docs/features/data-rights-lgpd/spec.md) — **5/5 do corte** (PR #23, `ab11a5b`), item 3 dividido: arquivos sem prova contra bucket real, assinatura transferida para `billing-subscription`. **Quatro derivas registradas** |

**Verificado nesta rodada:** `docs/features/` tem **19** pastas e **16** `spec.md` arquivados. As três
pastas sem `spec.md` são `observability-logging` (spec continua em `specs/`), `auth-panel-context` e
`impersonation-read-only` (as duas anteriores à semeadura). Não houve colisão de arquivamento.

### O que a PR #23 entregou **além** do corte

1. **Um `purge` protegido no repositório base** (`base.repository.ts:234-236`, e `purgeAll` em
   `:243-262`, em lotes e com teto de passadas que falha alto). `delete()` segue sendo soft delete; o
   apagamento de verdade é opt-in por repositório, com chamador que tem direito a ele.
2. **O `Footer` e o `PageFormFooter` compartilhados deixaram de aceitar o segundo clique** durante o
   request. Afeta 8 formulários da `apps/app`, sempre no sentido de bloquear mais.
3. **A ação de soft delete do admin virou "Arquivar"**, para não se confundir com o interruptor
   "Ativo/Desativado" que a mesma linha da tabela já tem. O `ActionsMenu` ganhou uma prop opcional de
   rótulos.
4. **Exportação e exclusão entraram no rate limit** (`apps/api/proxy.ts:53-54`). São as duas primeiras
   rotas de `/account` na lista.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida e corrigida ao passar por ela. Nesta rodada a auditoria **corrigiu** o que mediu, em vez de
só registrar.

| documento | afirmava | realidade medida em 2026-09-23 | veredito |
|-----------|----------|-------------------------------|----------|
| `docs/SECURITY.md:12-14` (guards) | **22** arquivos de rota, **11** com guard, **11** nus | **25** arquivos, **14** com guard, **11** nus (`account/*` ×5, `users` ×4) | ✅ **corrigido nesta rodada** |
| `docs/SECURITY.md` (rate limit) | **8 caminhos** em `proxy.ts:42-51`; "as três rotas de `/account`" fora | **10 caminhos** em `proxy.ts:44-55`; três das cinco rotas de `/account` fora | ✅ **corrigido nesta rodada**. Estava honesto há oito rodadas; a PR #23 o invalidou |
| `docs/SECURITY.md` (renovação de sessão) | não mencionava `POST /api/auth/session/refresh` | a rota existe nos dois front-ends, fora do rate limit, protegida só por `isSameOriginRequest` | ✅ **corrigido nesta rodada**, depois de três abertas |
| `docs/PRE-PRODUCTION.md` §9 (gate) | 607 arquivos, 1325 testes em 134 arquivos, 30,6 s | 648 arquivos, 1547 testes em 158 arquivos, 1 min 12,4 s | ✅ **corrigido nesta rodada**, depois de sete ciclos defasado |
| `docs/PRE-PRODUCTION.md` (env de sessão) | não citava `SESSION_ABSOLUTE_MAX_AGE_DAYS` nem o teto ultrapassável | seção nova "Declaração — por quanto tempo uma sessão pode ser renovada" | ✅ **corrigido nesta rodada**, depois de três abertas |
| `docs/PRE-PRODUCTION.md` §1.8 (índices publicados) | 1 de 7 publicados (`user`: `reference_id` + `deletedAt`) | **confere**: `firebase-tools firestore:indexes` devolve exatamente esse índice | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md` (até onde a exclusão alcança) | seis passos, dois `skipped` | **confere** com `account-erasure.ts:53-78` | ✅ **honesto na estreia** |
| `docs/PAYMENTS.md` (estado geral) | não há fluxo de assinatura; stubs em `route.ts:13,23` | **confere** | ✅ **honesto** pela décima primeira rodada |
| `docs/SECURITY.md:155` (higiene do `.env.example`) | sem Clerk, `DATABASE_URL`, BetterStack, Svix, Knock, Liveblocks nem BaseHub | não remedido nesta rodada; nenhum `.env.example` fora da `apps/web` mudou | ✅ sem motivo para mudar |

> **Nota de método.** O mecanismo das rodadas anteriores continua: documento medido corretamente e
> invalidado pela entrega seguinte. Corrigir aqui fecha o número de hoje, não o mecanismo. O conserto
> barato segue sendo o `/review` recontar a tabela de guards e a lista do rate limit quando o diff toca
> `apps/api/app/(routes)/` ou `apps/api/proxy.ts`.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

### Deriva de implementação — `data-rights-lgpd`

Registradas por inteiro na spec arquivada. Em resumo: a política de privacidade segue modelo, com o aviso
mantido, e passou a declarar o que o código faz (a spec estava errada ao pedir texto legal real do core);
conta só com Google não tem autoatendimento de exclusão e cai no canal de privacidade (restrição
deliberada); o soft delete do admin virou "Arquivar" (pedido seu); e o `contends_on` errou nas duas
direções.

### Deriva em spec arquivada — `audit-log`

| especificado | hoje | leitura |
|--------------|------|---------|
| A trilha é imutável: o repositório recusa `update`, `delete` e as versões em lote | Continua recusando (`audit-event.repository.ts:227-239`), mas ganhou **uma** escrita permitida: `anonymizeUserLabels` (`:149`) apaga os rótulos que nomeiam o titular excluído, mantendo ação, instante e `requestId` | **O mundo mudou embaixo da spec, e de propósito.** Direito de eliminação e trilha imutável se chocam no rótulo, e a entrega escolheu anonimizar. O docblock em `:140-147` diz isso. Não é regressão; a spec arquivada não foi editada |

### Âncoras deslocadas — corrigidas nas specs vivas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`admin-billing-insights`](admin-billing-insights.md) | `base.repository.ts:122-124` (`countQuery`) | **`:138-141`** | +16 linhas no topo (PR #23) |
| [`e2e-testing`](e2e-testing.md) | `base.repository.ts:151-155` e `:148-150` | **`:167-171`** e **`:164-166`** | idem |
| [`e2e-testing`](e2e-testing.md) | 1434 testes em 145 arquivos | **1547 em 158** | PR #23 |
| [`teams-organizations`](teams-organizations.md) | `entity.repository.ts:33` (`summaryByUserId`) | **`:68`** | dois métodos novos acima (PR #23) |
| [`observability-logging`](observability-logging.md) | `apps/api/proxy.ts:63`, `:118`, `:157`, `:71-72` | **`:67`**, **`:122`**, **`:161`**, **`:75-76`** | +4 linhas no proxy (PR #23) |
| [`observability-logging`](observability-logging.md) | `storage.ts:82` | **`:89`** | +7 linhas (PR #23) |
| [`account-security-mfa`](account-security-mfa.md) | `actions/account/action.ts:49` | **`:81`** | duas actions novas acima (PR #23) |
| [`billing-subscription`](billing-subscription.md) | `account.ts:78`, `:167`, `:257` | **`:79`**, **`:205`**, **`:332`** | árvore da aba de privacidade (PR #23) |
| [`billing-subscription`](billing-subscription.md) | 22 `route.ts` | **25** | PRs #22 e #23 |

Todas as onze são deslocamento por entrega; nenhuma nasceu errada. `onboarding-flow` foi conferida âncora
a âncora nos arquivos que a PR #23 tocou e não tinha nenhuma deslocada.

### Contagens e afirmações de estado corrigidas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`account-security-mfa`](account-security-mfa.md) | "10 declarações" de `MIN_PASSWORD_LENGTH` × "25 ocorrências" na auditoria anterior | **11** declarações (`git grep "MIN_PASSWORD_LENGTH ="`, eram 10 no `03498ae`) e **28** ocorrências (eram 25) | ✅ **a ambiguidade da rodada passada se resolve medindo as duas coisas.** A spec falava de declarações e estava certa; a PR #23 criou a décima primeira em `accountDeletionSchema.ts:6` |
| [`teams-organizations`](teams-organizations.md) | 14 sítios de posse | pelo menos 16: a PR #23 acrescentou `entity.repository.ts:40` e `:64` | ⚠️ **piso, não número.** A auditoria não recontou o resto pelo critério da tabela da spec |
| [`observability-logging`](observability-logging.md) | 16 pontos pelo helper de log | `git grep "logEvent("` fora de testes dá 19, contra 17 no `03498ae` | a PR #23 acrescentou 2; a distância entre 16 e 17 é de recorte |
| [`billing-subscription`](billing-subscription.md) | exclusão de conta "passa a ter de cancelar antes de excluir" | o passo existe e responde `skipped` | obrigação transferida, com endereço no corte e nos riscos |
| [`e2e-testing`](e2e-testing.md) | sem caso concreto em aberto | o D1 de `data-rights-lgpd` (rolagem a 375 px) só foi pego pelo browser; o `ActionsMenu` mudou sem teste do componente | argumento novo acrescentado à spec |

### O que a auditoria **não** encontrou

Nenhuma spec `done` regrediu no código. Nenhuma feature em `docs/features/*/STATE.md` está sem `spec:`
quando deveria ter. Nenhuma entrega parcial órfã nova; a de `account-security-mfa` segue sendo a única.

## Achados — correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-09-23 (pós-PR #23).** Cada achado da rodada anterior foi reaberto no disco, com o
> veredito na própria linha. **Placar: 1 fechado · 3 novos · o resto confirmado aberto.**

### ✅ Fechados nesta rodada

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| 🟡 **`delete()` herdado é soft delete e o único "excluir" não exclui** | `base.repository.ts:225-227` | A PR #23 acrescentou `purge`/`purgeAll` protegidos (`:234-262`) e o expurgo real do titular. O soft delete continua, mas agora tem nome certo na tela ("Arquivar") e não é mais o único caminho. Fechado como achado; a escolha de manter o soft delete do admin foi sua |

### 🆕 Achados novos

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:44-46` (estado lido uma vez) · `:48-55` (`history.replaceState`) | A barra lateral muda a URL e a aba fica onde estava. Anterior à PR #23, mas agora são cinco itens de barra lateral apontando para `?tab=`. É a [decisão nº 2](#precisam-de-decisão) |
| 🟡 **O `ActionsMenu` ganhou prop nova sem teste do próprio componente** | `packages/design-system/components/ui/action-menu.tsx` · `apps/app/__tests__/usersListArchiveLabels.test.tsx:37` | O único teste substitui o componente por mock. O caminho de volta ao dicionário compartilhado, que todo outro chamador usa, não é exercitado. Segundo caso do design-system sem task de teste; cruza com [`e2e-testing`](e2e-testing.md) |
| 🟡 **Os 20 links mortos nas 10 specs arquivadas, agora como achado com arquivo e linha** | `account-settings/spec.md:65` · `api-hardening/spec.md:59,60` · `audit-log/spec.md:98,99` · `auth-recovery-verification/spec.md:60` · `cookie-consent/spec.md:90,92` · `cursor-pagination/spec.md:73` · `file-upload-storage/spec.md:58,136,162` · `firebase-emulator-seed/spec.md:97` · `session-refresh/spec.md:63,67,70,111,117,144` · `transactional-emails/spec.md:35` (todos em `docs/features/<slug>/`) | Saiu de "Precisam de decisão" pela §5.1. Dezesseis apontam para `research/*.md`, cujo caminho certo é `../../../specs/research/`; os quatro de `session-refresh` em `:70,111,117,144` apontam para `account-security-mfa.md` e `user-activity-tracking.md`, cujos caminhos certos são `../../../specs/account-security-mfa.md` e `../user-activity-tracking/spec.md`. As duas últimas arquivadas saíram limpas porque a correção foi feita antes do `git mv`. Tarefa de ~5 min; a correção estrutural é a linha de política proposta em [Decisões estacionadas](#decisões-estacionadas-51) |

### 🔴 Segurança — seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/payments/ai.ts:4-5`** instancia `StripeAgentToolkit` com `keys().STRIPE_SECRET_KEY \|\| ""` em **escopo de módulo** | `packages/payments/ai.ts:4-5` | Reconferido, literal. Não explode só porque nada importa `@repo/payments/ai`; `billing-subscription` (#2) é o que faria alguém importar. `packages/payments/package.json` segue **sem `exports`** |
| 🔴 **`packages/security/index.ts:11`** lê `keys().ARCJET_KEY` no **import**, e `@repo/security` é o primeiro import do middleware da `apps/api` | `packages/security/index.ts:11` | Reconferido. Uma `ARCJET_KEY` presente e malformada lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:20-24` | Reconferido: `throw` em `:20-24`, zero `process.exit`. `/health/ready` detecta parte das falhas, não esta |
| ⚠️ **Três das cinco rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha | `apps/api/proxy.ts:44-55` | ◐ **Metade melhorou:** `/account/export` e `/account/deletion` entraram (`:53-54`). Ficam fora o `PUT /account`, `/account/password` e `/account/sessions/revoke` |
| ⚠️ **Superfície não-guardada da API: 11 de 25** arquivos de rota exportam handler nu, 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado: 25 arquivos, 14 com guard. O numerador não mudou; as duas rotas novas nasceram com guard |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit e aceita requisição sem `Origin`** | `packages/auth/session-routes.ts:87` · `packages/auth/session.ts:78-81` | Reconferido. ◐ **A parte documental fechou nesta rodada** (`docs/SECURITY.md` passou a registrar a rota). O comportamento segue |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada** — `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` não existe. **Décima nona auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` do resto | `packages/auth/package.json:25` | Reconferido, inalterado |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: 0 |
| 🟡 **`input-otp.tsx` é código morto** | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: só ele, o barril, o `package.json` do pacote e uma string no `playground`. `account-security-mfa` (#3) é quem o usaria |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: 0 importadores |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-11` | Reconferido: falta `"./utils/*"`, e `"."` aponta para `index.ts`, que não existe |
| 🟡 **`emailBrand.supportEmail` é configuração morta** | `packages/email/brand.ts:9` | Reconferido: 1 ocorrência em `apps/` e `packages/`, a definição |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:32` | Reconferido: 4 referências, todas em `__tests__/rateLimit.test.ts` |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts` desceu de `:102` para `:106` |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:224` | Reconferido: só `useEmailVerification.test.tsx`, que a mocka |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`; `@repo/design-system` tem `typecheck` e não tem `test`** | `packages/shared/package.json` · `packages/design-system/package.json` | Reconferido. O lado do design-system ganhou o segundo caso nesta rodada (achado novo acima) |
| 🟡 **`welcomeEmail` sem chamador de produção**; o formulário de contato da landing segue maquete | `packages/email/templates/welcome.tsx:49` | Reconferido: 4 ocorrências, 3 em teste. ⚠️ O canal de privacidade da `apps/web` cai nesse formulário quando `NEXT_PUBLIC_PRIVACY_CONTACT` está vazia (`privacyContact.ts:17-18`), então **o fallback do canal aponta para uma maquete**. Isso subiu de higiene para correção pendente |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:64` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:74`). N+1 do Admin SDK. Âncora deslocada de `:55` para `:64`; sétima rodada aberto |
| 🟡 **`userRepository` tem agora cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:48` · `:60` · `:64` · `:83` · `:101` | `touchLastAccess`, `purgeProfile` (novo), `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo, duas da PR #23. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato de erro** | `apps/api/app/(routes)/auth/sign-in/route.ts:12` · `sign-up/route.ts` | Reconferido: zero `try`, `:12` devolve string crua. Viola a regra de ouro 3 |
| 🟡 **Webhook da Stripe é casca e ecoa o evento inteiro** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | Reconferido. Escopo de `billing-subscription` (#2) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento** (`skipValidation` descarta `STRIPE_WEBHOOK_SECRET`) | `apps/api/env.ts:46` | Reconferido |
| ◐ **`skipValidation` incondicional na `apps/web`** e `NEXT_PUBLIC_APP_URL` fora do bloco `client` | `apps/web/env.ts:29` | Âncora desceu de `:27` para `:29`. A PR #23 tropeçou nisso de novo: teve de redeclarar `NEXT_PUBLIC_PRIVACY_CONTACT` porque o `createEnv` não mescla o `extends` com `skipValidation` |
| ◐ **O bounce do proxy apaga a query string**, corrigido só para as rotas de `oobCode` | `apps/app/proxy.ts:189-202` | Reconferido: `redirectUrl.search = ""` em `:200`. `onboarding-flow` (#1) mantém este arquivo no `contends_on` |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:169,173` | Reconferido: `cookieStore.set` sem `maxAge` |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Oitava rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** | `packages/design-system/components/ui/date-input.tsx:50` | Reconferido. Sobreviveu às PRs #11 a #23 |
| 🟡 **O `DateInput` formata sempre em inglês** | `date-input.tsx:83` | Reconferido: `format(selected, "PPP")` sem `locale` |
| 🟡 **Strings de UI soltas** — `"Switch language"` nos dois apps e `"Início"` no breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/app/[locale]/components/header/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` | Reconferido. O breadcrumb ainda crava `href="/painel"` em `:28` |
| 🟡 **A mensagem de erro padrão está cravada em pt-br num pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal |
| 🟡 **`signInSchema.ts:9` da `apps/web` crava a mensagem em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | Reconferido, literal |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | Reconferido. **Agravado pela PR #23:** a exclusão de conta agora apaga o perfil de verdade e anonimiza os rótulos, então os eventos dela ficam sem rótulo e sem entrada no `select` |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | Reconferido |
| 🟡 **`images.domains` deprecado com `www.google.com` sem uso** | `apps/app/next.config.ts:19` | Reconferido, literal |
| 🟡 **`setTimeout` sem cleanup no carrossel da landing** | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Reconferido: nenhum `clearTimeout` |
| 🟡 **`useHealthCheck` não exporta a função imperativa** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: um único `export` |
| 🟡 **`provider-error` não distingue as falhas do provedor de e-mail** | `packages/email/index.ts:120-130` | Reconferido. Descartar o objeto de erro é deliberado |
| 🟡 **O rodapé da `apps/web` depende de `data-cookie-banner` sem teste** | `apps/web/app/[locale]/components/footer.tsx:56` | Reconferido |
| 🟡 **`turbo run` aborta na primeira falha no CI** | `.github/workflows/ci.yml:39` | Reconferido, sem `--continue` |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md).
> Cada linha traz o veredito desta rodada.

| # | pendência | onde vive | veredito 2026-09-23 |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**, medido: não publicados |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**, medido |
| 3 | ~~🔴 Publicar o índice da busca de perfil por `reference_id`~~ | `PRE-PRODUCTION.md` §1.6 | ✅ **fechado**: `npx firebase-tools firestore:indexes --project next-boilerplate-576d0` devolve exatamente esse índice publicado |
| 4 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**, medido |
| 5 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto**, medido. São **seis** índices sem publicação; o comando é um só |
| 6 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 7 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido (404, `[]`, 23 PRs); estacionado (E3) |
| 8 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 9 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**: `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve 0; estacionado (E1) |
| 10 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma, não verificável no repositório |
| 11 | ~~`SESSION_ABSOLUTE_MAX_AGE_DAYS` fora do checklist, e o teto ultrapassável~~ | `PRE-PRODUCTION.md`, declaração nova | ✅ **fechado nesta rodada** pela auditoria |
| 12 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 13 | ~~A política de privacidade não menciona cookies~~ | `PRE-PRODUCTION.md` §7 | ✅ **fechado pela PR #23**: seção "Cookies que usamos" nos 3 idiomas |
| 14 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto**. Agora trava também o passo `storage` do expurgo de conta, que nunca rodou contra bucket real |
| 15 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **continua aberto** (exige projeto Firebase real) |
| 16 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM) |
| 17 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 18 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #23 rodou contra o emulador |
| 19 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**: `git ls-remote --heads` devolve 22, ou seja, 21 além de `main` (eram 20) |
| 20 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto** |
| 21 | `storage.rules` nunca publicado nem testado | `PRE-PRODUCTION.md` | **continua aberto**; depende da 14 e de `e2e-testing` |
| 22 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 23 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 24 | Os 20 links mortos nas specs arquivadas | este arquivo, [Achados novos](#-achados-novos) | **saiu daqui**: virou achado com arquivo e linha (§5.1) |
| 25 | 🆕 No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **novo**, com três saídas escritas lá. Você já disse que fica para depois |
| 26 | 🆕 `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **novo**. Vazia, o canal cai no formulário de contato, que é maquete (ver achado de `welcomeEmail`) |

> **A fila de índices encolheu pela primeira vez, e não por publicação nova.** O índice de `reference_id`
> já estava publicado; o que mudou foi alguém medir. A previsão da rodada passada errou: ela dizia que
> `data-rights-lgpd` ia acrescentar um índice, e o desenho evitou `orderBy` de propósito para não
> acrescentar. A regra continua de pé: a fila cresce com spec que consulta de um jeito novo.
> `onboarding-flow` (#1) não deve acrescentar índice, porque o estado vive no próprio perfil.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Estacionado (E1). |
| **Demais direitos do art. 18 com fluxo próprio · painel de pedidos de titular · exportação assíncrona** | — | 🆕 Explicitamente fora do corte de [`data-rights-lgpd`](../docs/features/data-rights-lgpd/spec.md), arquivada. O canal de privacidade cobre os demais pedidos por ora. |
| **RoPA, runbook de incidente, DPA e transferência internacional** | — | 🆕 Fora do corte de `data-rights-lgpd` por serem documento, não código. Candidato natural a uma spec de templates em `docs/` numa próxima descoberta, que é também onde o eixo `confianca` pode ganhar peso. |
| **Exclusão de conta sem senha (conta só Google)** | — | 🆕 Fora da entrega: reautenticar conta federada exige outro fluxo. Pertence à iteração de "sessão recente" de [`account-security-mfa`](account-security-mfa.md). |
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
| **Registro auditável de consentimento no servidor** | — | Fora do corte de `cookie-consent`. `data-rights-lgpd` passou a pôr a escolha no arquivo de exportação, lida do cookie do navegador (`useAccountDataRights.tsx:23-36`); prova no servidor segue inexistente. |
| **CMP certificada · TCF do IAB · geolocalização do visitante** | — | Arrastam serviço pago para todo fork. |
| Notificações in-app + preferências | 3/10 | Esforço G à mão; a referência terceiriza num serviço pago. |
| Command palette (⌘K) | 2/10 | Valor estético. |
| Metering / limites de uso / créditos | 2/10 | Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Variável de ambiente basta num MVP. |
| Firebase App Check | — | Exige configuração de projeto por fork. |
| Waitlist / captura de lead | 2/10 | Decisão do fork. |
| **Consertar o formulário de contato da landing** | — | Não é spec, é achado. ⚠️ Ganhou peso: é o fallback do canal de privacidade. |
| **Migrar a listagem de usuários para o cursor** | — | O N+1 de `userRepository.list()` vem primeiro. |
| **Detector de teste instável no CI** | — | O único caso concreto foi consertado na PR #22. Reabrir exige um segundo *flake* de causa diferente. |
| **Task de teste no `@repo/design-system`** | — | Não é spec, é achado, com dois casos agora. Provavelmente entra no corte de [`e2e-testing`](e2e-testing.md). |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`. A exclusão de conta foi entregue por [`data-rights-lgpd`](../docs/features/data-rights-lgpd/spec.md) e as sessões estão em [`account-security-mfa`](account-security-mfa.md); a troca de e-mail continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`. Os testes de rules foram para [`e2e-testing`](e2e-testing.md). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale há três execuções de merge seguidas. Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das 10 configs declara cobertura. Medir primeiro. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
