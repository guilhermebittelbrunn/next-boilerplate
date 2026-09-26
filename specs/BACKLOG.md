# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue**. Spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-26 (`/spec --sync`, pós-merge da PR #28) · anteriores: 2026-09-25
> (PRs #26 e #27) · 2026-09-25 (PR #25) · 2026-09-24 (PR #24) · 2026-09-23 (PR #23) · 2026-09-23 (PR #22) ·
> 2026-09-19 (PR #21) · 2026-09-17 (PR #20) · 2026-09-17 (PR #19) · 2026-09-17 (PR #18) · 2026-09-16 (PR #17) ·
> 2026-09-16 (PR #16) · 2026-09-16 (PR #15) · 2026-09-16 (PRs #13 e #14) · 2026-09-15 · 2026-09-14 ·
> 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) · 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 ·
> **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **A PR #28 fechou dois achados e nenhuma spec.** Ela entrou em `main` em 2026-09-26T14:37:11Z
>    (`295c8de`), com CI `success` nos quatro jobs do SHA de merge (`gh run 36249123716`; o job `e2e`
>    registrou 22 testes aprovados). Era a tarefa direta `i18n-hydration-admin-delete-billing`, sem spec, que
>    juntava o achado de hidratação do dicionário client em `/en` e `/es` e o A2 (arquivamento pelo admin
>    sem cancelar a assinatura). Os dois foram conferidos no código e saíram da lista; o detalhe está em
>    [Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec).
> 2. **Nenhuma transição de status.** As três specs seguem como estavam: a PR #28 não tocou a área de conta,
>    a camada de sessão de `packages/auth` nem `entity.repository.ts`.
> 3. **`account-security-mfa` ganhou o bloco de reescopo** que a auditoria pedia havia várias rodadas. O
>    bloco aplica a recomendação da própria spec: primeira fatia só com a política de senha, segundo fator
>    e sessões depois. A spec segue `proposed`; aprovar ou recusar o reescopo é decisão sua.
> 4. **O §9 do `docs/PRE-PRODUCTION.md` bateu com a medição pela primeira vez depois de um merge**: 26/26
>    tasks, 755 arquivos, 1990 testes em 196 arquivos, número por número.
> 5. **Âncoras corrigidas:** a contagem de `logEvent(` em [`observability-logging`](observability-logging.md)
>    (28 → 29), o `package.json` de `@repo/internationalization` (`:5-11` → `:5-12`) e a contagem de rotas
>    da API no achado de superfície não guardada, que estava defasada em relação ao `docs/SECURITY.md`.

## Contadores

Sobre as **3 specs que seguem em `specs/`**. Recontados do disco em 2026-09-26, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 1 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 20 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `confianca` 1 (`proposed`) · `dx` 1 (`in-progress`) · `produto` 1 (`deferred`).
**Por esforço:** P 0 · M 2 · G 1. **Por valor:** alto 2 · médio 1 · baixo 0.

**Transições aplicadas: 0.** Nenhuma spec nova entrou e nenhuma foi arquivada. Esta rodada é `--sync` puro,
e nenhum `git mv` foi feito.

> **A fila elegível tem uma spec.** `account-security-mfa` é a única `proposed` com dependência satisfeita.
> `observability-logging` espera a decisão estacionada E1 e `teams-organizations` está `deferred` (E2). A
> rodada de descoberta segue adiada pelo usuário (E11).

## Tarefas diretas entregues (sem spec)

Correções que vieram de achados deste arquivo, sem spec própria. Ficam registradas aqui porque a pasta
`docs/features/<slug>/` delas não tem `spec.md`.

| feature | PR | achados fechados |
|---------|----|------------------|
| [`i18n-hydration-admin-delete-billing`](../docs/features/i18n-hydration-admin-delete-billing/STATE.md) | #28, `295c8de`, 2026-09-26 | hidratação do dicionário client em `/en` e `/es`; A2 (arquivamento pelo admin sem cancelar a assinatura) |

### O que foi conferido no código

| achado | veredito | evidência |
|--------|----------|-----------|
| Componente client renderizava em pt-br no servidor em `/en` e `/es` e a hidratação falhava | **fechado** | `getDictionary()` do client lê o locale do `LocaleProvider` (`packages/internationalization/client.ts:40-45`, `:47-57`), alimentado pelo segmento `[locale]` via `useParams()`; o provider está montado nos root layouts (`apps/app/app/layout.tsx:77`, `apps/web/app/[locale]/layout.tsx:34`). Os 63 call sites não mudaram. `AuthProvider` passou a `useDictionary()` (`packages/auth/provider.tsx:12`) para acompanhar a troca de idioma. Testes novos: `localeProvider.test.ts` e `authProviderLanguageSwitch.test.tsx` |
| A2: o soft delete pelo admin não cancelava a assinatura | **fechado** | `DELETE /users/[id]` chama `cancelLiveSubscription` antes do soft delete (`apps/api/app/(routes)/users/[id]/route.ts:157`) e responde 503 `USERS_DELETE_BILLING_FAILED` quando a cobrança falha (`:158-167`), com o código traduzido nos 3 idiomas (`translations/packages/shared/utils.ts`). Teste novo: `usersAdminDeleteBilling.test.ts` |

A PR também corrigiu, além do escopo, o aninhamento de `a > button > a` e `button > a` no header da
`apps/web` (`header/index.tsx`, teste `headerInteractiveNesting.test.tsx`). O mesmo padrão `Button > Link`
segue no hero, no CTA, no FAQ e na página de preços; o achado da allowlist de acessibilidade foi atualizado.

**O que continua aberto, vindo desta entrega:**

- O `getDictionary()` **do servidor** ainda lê o cookie `x-locale`, não a URL. Na primeira visita a `/en` sem
  cookie, a `apps/web` sai com Server Components em pt-br e componentes client em inglês, e as duas apps
  saem com `<html lang="pt-br">`. Era a pergunta 3 da seção 14 do plano da feature. Os dois achados antigos
  sobre isso viraram um só, na seção de UI.
- Lacunas de teste que o `/test` deixou abertas: cancelamento que passa seguido de soft delete que falha
  (Firestore fora) e duplo clique no "Sim" do arquivamento. O cancelamento real numa conta Stripe segue 🔒.
- O `STATE.md` da feature traz `spec: none (achados BACKLOG.md:430 e :502)`. As linhas citadas eram do
  arquivo anterior a esta rodada; o `STATE.md` fica como está, porque a auditoria só escreve em
  `docs/features/` para arquivar spec.

## Gates medidos nesta auditoria

Executados agora, com `--force`, neste workspace, com o `HEAD` em `295c8de` e o working tree limpo. Não
copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **755 arquivos · 0 erros** (`No fixes applied`, 293 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **26/26 tasks · 0 em cache · 35,9 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-25 (PRs #26 e #27) |
|-----------|---------:|-------:|----------------------------------|
| `api` | 73 | 894 | **+1 arquivo · +12** |
| `app` | 78 | 608 | **+1 arquivo · +2** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 8 | 101 | — |
| `@repo/internationalization` | 6 | 59 | **+1 arquivo · +12** |
| `@repo/shared` | 4 | 44 | — |
| `web` | 9 | 44 | **+1 arquivo · +3** |
| `@repo/analytics` | 2 | 34 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/payments` | 4 | 22 | — |
| `e2e` | 2 | 16 | — (testes unitários da suíte; os de navegador rodam no `pnpm e2e`) |
| **total** | **196** | **1990** | **+4 arquivos · +29 testes** |

CI: a execução de merge da **#28** (`295c8de`, `gh run 36249123716`) terminou em **`success`** em
`verify`, `changes`, `e2e` e `coverage`, e a PR passou nos mesmos quatro antes do merge.

Branch protection segue **não ligado**, remedido hoje: `gh api repos/:owner/:repo/branches/main/protection`
→ **404** ("Branch not protected"), `rulesets` → **`[]`**. O repositório tem **28** PRs, nenhuma aberta.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
**Nenhuma spec segue bloqueada por dependência.** As duas tarefas diretas aprovadas em 2026-09-25 foram
entregues pela PR #28, então a fila não tem tarefa direta pendente na frente das specs.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | por que agora |
|---|----|---------------|
| 1 | [`account-security-mfa`](account-security-mfa.md), **primeira fatia** (política de senha) | **A única elegível.** Em **1,5 de 6**, inalterado: a PR #28 só trocou um import em `packages/auth/provider.tsx`, e não há código de segundo fator, política de senha ou lista de sessões no repositório (`git grep -i` por `multiFactor` e `passwordPolicy` em `apps/` e `packages/`: 0). O bloco "Reescopo que o `/analyze` deve aplicar", escrito nesta rodada, corta a primeira execução para o item 4: custo zero, prova sob o emulador, ancorada na ASVS 5.0 L1 (senha com 8 ou mais caracteres, sem regra de composição, checagem contra senhas comuns). `value: médio` (MFA em **3/10** dos starters, sessões gerenciáveis em **1/10**) |
| 2 | [`observability-logging`](observability-logging.md) | `in-progress`, 5 dos 6 itens. O resíduo é adotar um coletor de erro, que exige conta em provedor. **Fora do conjunto elegível.** A pergunta de fechar ou não está estacionada (E1) |
| 3 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22. O predicado de posse segue com quatro cópias em `entity.repository.ts` (`:23`, `:40`, `:64`, `:72`). A decisão de status está estacionada (E2) |

### O que **não** foi escolhido para #1, e por quê

- **`observability-logging` e `teams-organizations`** estão paradas por decisões estacionadas (E1 e E2), que
  esta rodada não reapresenta.
- **Os achados pequenos da seção de segurança** (`packages/security/index.ts:11` lendo a chave no import; o
  webhook respondendo 500 para assinatura inválida; as rotas de `payments/*` e `/account` fora do rate
  limit) são tarefas diretas P, todas provadas com teste unitário. Ficam como alternativa se você recusar
  o reescopo de `account-security-mfa`: a primeira da lista é a do `packages/security`, único 🔴 aberto
  que se prova sem infraestrutura.
- **O `getDictionary()` do servidor lendo o cookie** (`<html lang>` e Server Components da `apps/web` no
  idioma errado na primeira visita) é o resíduo natural da PR #28. Tem valor de acessibilidade, mas mexe
  nos mesmos ~20 arquivos da web que chamam `getDictionary()` sem argumento; é tarefa M, não P.

### O que o merge da PR #28 mudou no ranking

- **Nenhuma spec entrou nem saiu.** Os dois achados que a PR fechou não tinham spec.
- **Contenção.** A PR não tocou nenhum arquivo do `contends_on` das três specs.
- **O caminho de `account-security-mfa` ficou mais limpo.** O bloco de reescopo tira da primeira execução a
  camada de sessão de `packages/auth` e o custo não confirmado do GCIP.

## Lotes paralelos

Para rodar o ciclo completo em 2–3 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-26** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma
coisa, rode o #1 da ordem.

**Elegíveis agora: 1 de 3.** Fora ficam `observability-logging` (`in-progress`) e `teams-organizations`
(`deferred`).

| lote | specs | o que toca | por que não colide |
|------|-------|------------|--------------------|
| **1** | `account-security-mfa` | pelo frontmatter: `packages/auth/server.ts` + `session.ts` + `session-routes.ts` + `apps/api/(shared)/lib/resolve-api-actor.ts`. A primeira fatia do reescopo toca, na prática, os schemas de senha de `apps/api/(shared)/validation/` e dos formulários | não há outra spec elegível |

Não há lote 2, e o teto de 3 não barrou ninguém: o lote tem uma spec porque só existe uma elegível.

### Onde o lote 1 pode colidir com tarefas diretas

Se algum achado virar tarefa direta em paralelo:

- **`packages/security/index.ts`**, o webhook de pagamento e `apps/api/proxy.ts` não cruzam com os schemas
  de senha nem com a camada de sessão. Podem rodar ao lado.
- **O `getDictionary()` do servidor** mexe em `packages/internationalization/server.ts` e nos layouts. Não
  cruza com a primeira fatia.
- `account-security-mfa` tende a acrescentar códigos em `translations/packages/shared/utils.ts` (o
  `apiErrors`). O conflito é aditivo e se resolve no merge.

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](README.md#depends_on--contends_on)).

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte
de MVP. `admin-billing-insights` declarou **5** arquivos e tocou **4** (o quinto, `firestore.indexes.json`,
foi o primeiro falso positivo registrado) e tocou sem declarar arquivos vizinhos na mesma camada. O caso de
`account-security-mfa` é outro: o reescopo muda a fatia, e o `contends_on` segue descrevendo o corte inteiro.

## Precisam de decisão

Só o que é novo nesta rodada ou mudou de natureza. O que se repetia foi para
[Decisões estacionadas](#decisões-estacionadas-51).

1. **Reescopo de `account-security-mfa`.** A primeira execução fica só com a política de senha (item 4), e
   o resto da spec vira fatias seguintes? **Recomendação:** sim. É a recomendação da própria spec, custa
   zero e se prova sob o emulador. Se recusar, o #1 passa a ser o achado 🔴 de `packages/security/index.ts:11`.
2. **O `getDictionary()` do servidor passa a ler o locale da URL?** Resolve o `<html lang>` das duas apps e o
   idioma dos Server Components da `apps/web` na primeira visita. **Recomendação:** sim, como tarefa direta
   M depois da primeira fatia de `account-security-mfa`.

As duas perguntas da rodada anterior foram respondidas pelo usuário em 2026-09-25 (fechar `e2e-testing` com
o ⚠️ do E3; aceitar a deriva de `admin-billing-insights`).

## Decisões estacionadas (§5.1)


Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (12 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor |
| E2 | `teams-organizations` continua `deferred`? (14 rodadas sem as contrapartidas P) | você | este arquivo, [Achados](#-repositório-rotas-e-proxy) (predicado de posse) | status de sua escolha; as contrapartidas já são achados com arquivo e linha |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify` e `e2e`; não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../docs/features/e2e-testing/spec.md), arquivada com esse ⚠️. Remedido em 2026-09-26: 404, `[]` |
| E4 | O gate `approved` não é usado (**oito** specs entregues sem passar por `approved`, incluindo `admin-billing-insights` e `e2e-testing`; o reescopo de `account-security-mfa` é o próximo caso) | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E9 | O deep link das abas da conta (`?tab=`) não acompanha a barra lateral (3 rodadas) | você | [Achados](#-ui-i18n-e-front-end), linha de `AccountTabs.tsx` | derivar a aba do `?tab=` a cada navegação, aceitando um `router.replace`; a escolha contrária está comentada no código (`AccountTabs.tsx:55-57`), por isso precisa da sua palavra |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | este arquivo, achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer; a nota de medição do `docs/AUTH-SSO.md` fica como está |
| E11 | Rodar uma descoberta (`/spec` sem argumento) antes que a fila esvazie (2 rodadas) | você | este arquivo, [Lacunas](#lacunas-avaliadas-e-não-especificadas) | **o usuário respondeu "ainda não" (2026-09-25)**. Não reapresentar até ele pedir |

**Duas recomendações repetidas são decisões técnicas e deveriam virar linha de política.** A auditoria
não edita `.claude/`, então elas ficam aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* Caso medido: `onboarding-flow` ficou seis rodadas presa pelo corte
  contestado, ganhou o bloco numa rodada e foi entregue na seguinte, 5/5. Em 2026-09-26 a auditoria
  escreveu o bloco em `account-security-mfa`, então a linha não barra a próxima execução; continua valendo
  para a próxima spec contestada.
- Em `.claude/skills/spec-audit/SKILL.md` §4.1, antes do passo 5: *"Reescreva os links relativos de saída
  da spec para o caminho novo: `research/*.md` vira `../../../specs/research/*.md`, spec viva vira
  `../../../specs/<id>.md`, spec arquivada vira `../<slug>/spec.md`. Rode o verificador de links no
  arquivo movido e confirme zero mortos."* A rodada de 2026-09-25 fez isso à mão pela quinta vez; esta
  não arquivou nada.

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-26 |
|------|--------------|------------------------|
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`teams-organizations`](teams-organizations.md) | `transactional-emails` | ✅ satisfeita (PR #9, `400f290`) |
| [`observability-logging`](observability-logging.md) | — | ✅ sem dependência |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | ✅ `account-settings` |
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
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:446-447`) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |

**Verificado nesta rodada:** `docs/features/` tem **24** pastas e **20** `spec.md` arquivados. As quatro
pastas sem `spec.md` são `observability-logging` (spec continua em `specs/`), `auth-panel-context` e
`impersonation-read-only` (as duas anteriores à semeadura) e `i18n-hydration-admin-delete-billing` (tarefa
direta, sem spec). Não houve colisão de arquivamento.

### O que a PR #27 entregou **além** do corte (registrado em 2026-09-25)

1. **O webhook parou de ecoar o evento Stripe** na resposta de sucesso: `route.ts:242` devolve só
   `{ ok: true }`.
2. **A checagem de `ALREADY_EXISTS` do Firestore virou helper compartilhado** (`isAlreadyExistsError`,
   `apps/api/(shared)/infra/firestore-errors.ts:4`), usado pelos repositórios de fatura e de ativação.
3. **Aviso de endpoint incompleto.** Com assinatura vigente e nenhuma fatura paga registrada, a seção avisa
   que falta `invoice.paid` no endpoint (`BillingInsightsSection.tsx:76-83`), em vez de mostrar receita
   zero sem explicação.
4. **A declaração do expurgo ganhou as duas coleções novas** (`docs/PRE-PRODUCTION.md:692`, âncora remedida
   em 2026-09-26): ficam depois da exclusão, porque guardam só ids da Stripe, valor, moeda e datas.

## Contradições doc × código, medidas nesta rodada

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../.claude/cycle-policy.md), afirmação barata de medir num
doc é medida ao passar por ela. Nesta rodada foram medidos os documentos que a PR #28 alterou e os que a
rodada anterior deixou com veredito pendente. Nenhum precisou de correção.

| documento | afirma | realidade medida em 2026-09-26 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md:600-604` (§9, gate) | 26/26 tasks, 755 arquivos, 1990 testes em 196 arquivos, 11 de 11 configs | 26/26 tasks, 755 arquivos, 1990 testes em 196 arquivos, com a mesma distribuição por workspace | ✅ **honesto**. É a primeira auditoria em que o §9 não envelhece com o merge: o `/cycle` anterior já o remediu com o working tree da PR #28 |
| `docs/SECURITY.md:13-15` (guards) | **30** arquivos de rota, **19** com guard, **11** nus | **30**, **19**, **11** (`find` + `grep -L` pelos três guards). A PR #28 não criou rota | ✅ **honesto** |
| `docs/PAYMENTS.md` (arquivamento pelo admin) | cancela assinatura viva antes do soft delete; assinatura ausente na Stripe conta como cancelada; 503 `USERS_DELETE_BILLING_FAILED` com Stripe desligada ou falhando; sem assinatura viva a Stripe não é chamada | confere com `users/[id]/route.ts:45-67` e `(shared)/lib/billing.ts:162-173` | ✅ **honesto na estreia** |
| `docs/ARCHITECTURE.md`, `AGENTS.md`, `apps/app/CLAUDE.md` (locale) | client segue o segmento `[locale]` pelo `LocaleProvider`; servidor lê o cookie `x-locale` | confere com `packages/internationalization/client.ts:40-57` e `server.ts:18-20` | ✅ **honesto**, e registra a limitação do servidor que segue como achado |
| `docs/features/e2e-testing/STATE.md` (`/test`) | `blocked` pelo D3 | o D3 foi corrigido na PR #26 e o job `e2e` passou em todas as execuções seguintes, inclusive o merge da #28 | ⚠️ **defasado**, fica como está por decisão do usuário |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não remedido; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

**Nenhuma deriva de implementação nova.** A PR #28 não entregou spec. As derivas de `admin-billing-insights`
e `e2e-testing` estão registradas nas specs arquivadas e foram aceitas pelo usuário em 2026-09-25.

**Deriva de escopo, corrigida na spec:** o corte de `account-security-mfa` estava contestado. A auditoria
escreveu o bloco de reescopo com a recomendação que a própria spec dava, sem mudar o status.

### Âncoras deslocadas, corrigidas

| onde | citado | real hoje | causa |
|------|--------|-----------|-------|
| [`observability-logging`](observability-logging.md) | 28 linhas de `logEvent(` | **29** | `admin-user-delete-billing-failed` em `users/[id]/route.ts:159` (PR #28) |
| este arquivo, achado de `exports` de `@repo/internationalization` | `package.json:5-11` | **`:5-12`** | export `./client` e dependência `next` (PR #28) |
| este arquivo, achado de superfície não guardada | 29 arquivos, 18 com guard | **30**, **19** | a contagem vinha de antes de `payments/summary` (PR #27); o `docs/SECURITY.md` já estava certo |
| este arquivo, A2 e hidratação | `users/[id]/route.ts:117`, `utils/cookies.ts:2-4`, `client.ts:8` | fechados | PR #28 |
| este arquivo, entrega de `admin-billing-insights` | `PRE-PRODUCTION.md:690` | **`:692`** | PR #28 |

As âncoras de `account-security-mfa` (`packages/auth/provider.tsx:372-373`, `server.ts`, `session.ts`,
`session-routes.ts`) e de `teams-organizations` (`entity.repository.ts:23,40,64,72`,
`entities/summary/route.ts:9`) conferem: a PR #28 só trocou um import em `provider.tsx`, sem mudar a
contagem de linhas, e não tocou os outros arquivos.

### O que a auditoria **não** encontrou

Nenhum arquivo foi apagado entre `0659ede` e `295c8de` (`git diff --diff-filter=D` vazio), e o gate completo
passa, então nenhuma spec `done` perdeu código na PR #28. As specs arquivadas não foram reabertas uma a uma
nesta rodada. Nenhuma feature em `docs/features/*/STATE.md` deveria ter `spec:` e não tem: a
`i18n-hydration-admin-delete-billing` é tarefa direta. Nenhuma entrega parcial órfã nova; a de
`account-security-mfa` segue sendo a única.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Auditoria de 2026-09-26 (pós-PR #28).** Todos os achados com âncora foram reabertos no disco. Os que
> ficam em arquivos que a PR #28 não alterou (`git diff --name-only 0659ede 295c8de`) seguem com o conteúdo
> byte a byte igual ao da rodada anterior, e as âncoras citadas foram lidas de novo com `sed -n`. **Placar:
> 2 fechados (A2 e hidratação do client) · 1 fechado em parte (aninhamento no header da web) · 2 fundidos
> num só (`<html lang>` e páginas da web pelo cookie) · 2 novos (lacunas de teste do A2 e exceção da
> allowlist possivelmente sem alvo) · âncoras corrigidas em cinco linhas.**

### ✅ Fechados nesta rodada

| achado | onde estava | como fechou |
|--------|-------------|-------------|
| ⚠️ **Soft delete de usuário pelo admin não cancelava a assinatura** (A2) | `apps/api/app/(routes)/users/[id]/route.ts:117` (antes da PR #28) | A PR #28 cancela a assinatura viva antes do soft delete (`route.ts:157`) e recusa com 503 `USERS_DELETE_BILLING_FAILED` quando não consegue (`:158-167`). Teste: `usersAdminDeleteBilling.test.ts` |
| 🟡 **Componente client renderizava em pt-br no servidor em `/en` e `/es`**, e a hidratação falhava | `packages/internationalization/utils/cookies.ts:2-4` · `client.ts:8` (antes da PR #28) | A PR #28 pôs o `LocaleProvider` nos root layouts e fez o `getDictionary()` do client ler o segmento `[locale]` (`client.ts:40-57`). O cookie ficou só como fallback de árvore sem provider. Teste: `localeProvider.test.ts` |
| ◐ **`Link` dentro de `Button` na web**, parte do header | `apps/web/app/[locale]/components/header/index.tsx` | A PR #28 tirou os quatro `<a>` de dentro de `<button>` e o `a > button > a` do header (teste `headerInteractiveNesting.test.tsx`). Hero, CTA, FAQ e preços seguem com o padrão; o achado da allowlist continua aberto |

### ⚠️ Achados abertos, reconferidos ou herdados

Todos reconferidos em 2026-09-26: as âncoras foram lidas de novo e nenhum dos arquivos abaixo mudou na
PR #28, exceto os dois root layouts, citados no achado do locale do servidor.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **As rotas de `payments/` que chamam a Stripe estão fora do rate limit** | `apps/api/proxy.ts:44-55` | Cada chamada vai à Stripe: o catálogo lista preços, o checkout cria cliente (com chave de idempotência) e sessão, o portal cria sessão. As três exigem sessão, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. `docs/SECURITY.md:146-148` não as lista entre as que ficam de fora |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** | `apps/api/(shared)/repositories/user.repository.ts:67-78` | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:23-24` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **O webhook responde 500 para assinatura inválida** (A4) | `webhooks/payments/route.ts:222-224` → `failure()` em `:187-191` | A Stripe reentrega por até três dias um evento que nunca vai validar. Um 400 encerra as tentativas. `api-hardening` está arquivada, então é tarefa direta |
| 🟡 **O deep link do onboarding perde a query string** | `apps/app/proxy.ts:215` | O proxy grava só o `pathname`. Afeta link de listagem filtrada ou paginada aberto antes do onboarding. Saiu de "Precisam de decisão" pela §5.1: tarefa direta P, gravar `pathname + search` e um caso a mais em `proxy.test.ts` |
| 🟡 **Os `HookForm*` publicam `aria-invalid="false"` com a mensagem de erro visível** | `packages/design-system/components/ui/form.tsx:109-123` · `packages/design-system/components/form/hookform/` | O `HookFormInput` usa `<Controller>` direto, sem o `FormField` que põe o nome do campo no contexto; o `useFormField` não acha o erro e o `aria-describedby` sai sem o id da mensagem. Achado pelo `/review` da PR #24 (O3). Vale para os oito componentes da pasta e para todo formulário do repositório; leitor de tela não anuncia o erro. Terceiro caso do design-system sem task de teste; cruza com [`e2e-testing`](../docs/features/e2e-testing/spec.md), cujo item 3 é acessibilidade automatizada, e o axe não pega o caso porque o atributo está presente |
| 🟡 **`/favicon.ico` não existe na `apps/app` e cai no segmento `[locale]`** | `apps/app/app/` (sem `favicon.ico` nem `icon.*`) | O navegador pede o ícone em toda página. Anônimo vai para `/favicon.ico/sign-in`; conta com onboarding pendente vai para `/favicon.ico/onboarding?redirect=%2Ffavicon.ico` (O5 do `/test` da PR #24). Anterior à feature; ela só deixou o sintoma mais visível |
| 🟡 **`--destructive` do dark tem contraste 1,97:1 como texto** | `packages/design-system/styles/globals.css:63` · usos como texto em `ui/form.tsx:156`, `ui/field.tsx:227`, `ui/label.tsx:21`, `form/hookform/*` | Toda mensagem de erro de formulário e o `pastDueHint` da aba billing ficam abaixo dos 4,5:1 do AA no dark (medido pelo `/test` de `billing-subscription` e recalculado em oklch → sRGB: 1,97:1 sobre `--background`). Clarear o token não resolve sozinho: o mesmo token é fundo sólido do item `danger` do antd no hover (`antd-app.tsx:20`, texto branco) e, para ficar ≥4,5:1 como texto (L ≈ 0,60), o branco sobre ele cai para 4,41:1. Caminho provável: mapear o `--destructive-foreground` do dark (`:64`, 5,18:1) no `@theme` e usá-lo como cor de texto de erro. Achado pelo `/review` de `billing-subscription` |
| 🟡 **`Button` com `loading` perde o nome acessível** | `packages/design-system/components/ui/button.tsx:72-73` · `ui/spinner.tsx:8-9` | O `loading` troca o conteúdo pelo `Spinner`, cujo `aria-label="Loading"` é literal em inglês; no browser o botão ficou com nome `""` durante o redirect do checkout (`/test` de `billing-subscription`, item 11). Vale para todo botão com `loading` (`AccountPrivacyPanel`, painel de billing, formulários). Corrigir no componente, mantendo o texto do botão acessível enquanto o spinner aparece |
| 🟡 **O `getDictionary()` do servidor lê o cookie `x-locale`, não a URL** (fusão, em 2026-09-26, dos achados de `<html lang>` e das páginas da web) | `packages/internationalization/server.ts:18-20` · `apps/app/app/layout.tsx:48`, `:73` · `apps/web/app/[locale]/layout.tsx:23`, `:30` · `apps/web/proxy.ts:104-108` · ex.: `apps/web/app/[locale]/pricing/page.tsx`, `(home)/components/hero.tsx` | O `<html lang>` das duas apps sai do cookie: `/en/sign-in` com `x-locale=pt-br` sai com `lang="pt-br"` (O4 do `/test` da PR #24). Na `apps/web`, o proxy grava o cookie na mesma resposta, então a primeira visita a `/en` sem cookie renderiza os Server Components em pt-br e os componentes client em inglês (medido pelo `/test` da PR #28, que corrigiu só o lado client). Atinge as ~20 páginas e componentes da web que chamam `getDictionary()` sem argumento; leitor de tela pronuncia a página no idioma errado. Era a pergunta 3 da seção 14 do plano de `i18n-hydration-admin-delete-billing`. Tarefa M |
| 🟡 **Lacunas de teste do arquivamento pelo admin** (nova, PR #28) | `apps/api/app/(routes)/users/[id]/route.ts:157-169` · `apps/api/__tests__/usersAdminDeleteBilling.test.ts` | Não há teste para o cancelamento que passa seguido do soft delete que falha (Firestore fora) nem para o duplo clique no "Sim" do diálogo. O `/review` da PR descreveu por leitura o primeiro caso como recuperável: a assinatura já cancelada conta como cancelada na tentativa seguinte (`(shared)/lib/billing.ts:162-173`) |

### 🆕 Achados da entrega `e2e-testing`

Registrados pelo `/review` da suíte E2E, fora do placar da auditoria acima. Nenhum foi corrigido na entrega,
que não muda código de produto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Sete grupos de violação de acessibilidade passam pela allowlist da suíte E2E** | `apps/e2e/a11y/allowlist.ts` · `packages/design-system/components/form/hookform/hookformInputPassword.tsx:77-86` · `apps/app/shared/components/ui/PanelNavbarControls.tsx:262-272` · `apps/web/app/[locale]/(home)/components/hero.tsx:27-52` · `cta.tsx:23-43` · `faq.tsx:36-47` · `pricing/page.tsx:85-96`, `:127-134`, `:165-176` | O axe reprova `critical`/`serious`, e a allowlist tolera o que a primeira execução mediu: botão de mostrar senha só com ícone, `Link` dentro de `Button` na web, `text-muted-foreground` sobre `bg-muted` no tema claro (cards da landing e iniciais do avatar), páginas do painel sem `<title>`, `Select` sem nome no navbar e no filtro de usuários, e `Switch` de linha sem nome nas tabelas. Corrigido o componente, a exceção sai no mesmo PR; a anotação `a11y-stale-exception` avisa quando ela deixa de casar. As exceções `[data-slot="select-trigger"]` e `[data-slot="switch"]` valem para qualquer instância na rota, então um `Select` novo sem nome nas telas do admin passa sem aviso até elas saírem. **Atualizado em 2026-09-26:** a PR #28 consertou o header da web, então a exceção `WEB_BUTTON_WRAPPING_LINK` na rota `web:/pt-br/sign-up` (`allowlist.ts:88-91`) provavelmente ficou sem alvo, e o `reason` (`:32`) ainda cita o header. Não medido: a anotação `a11y-stale-exception` vai para o relatório do Playwright, não para o log do CI |
| 🟡 **O gatilho do `ActionsMenu` é um `<div>` sem papel nem nome** | `packages/design-system/components/ui/action-menu.tsx:103-110` | Não recebe foco pelo teclado, e o axe não o enxerga porque não é controle. A suíte E2E clica no `svg` da última célula da linha por falta de outro seletor |
| 🟡 **O CTA primário do hero diz "Entrar" e leva a `/contact`** | `apps/web/app/[locale]/(home)/components/hero.tsx:33-34` | Texto e destino não combinam. A suíte E2E não afirma esse comportamento, para não transformar o defeito em contrato |

### 🔴 Segurança: seguem abertos, confirmados no código

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **`packages/security/index.ts:11`** lê `keys().ARCJET_KEY` no **import**, e `@repo/security` é o primeiro import do middleware da `apps/api` | `packages/security/index.ts:11` | Reconferido. Uma `ARCJET_KEY` presente e malformada lança dentro do grafo de módulos do middleware: toda requisição falha, sem sinal no boot |
| ⚠️ **O gate de produção do `CORS_ORIGIN` não derruba o processo** | `apps/api/instrumentation.ts:40-44` | Reconferido: `throw` em `:40-44` (a âncora desceu 20 linhas com o aviso de cobrança da PR #25), zero `process.exit`. `/health/ready` detecta parte das falhas, não esta |
| ⚠️ **Quatro das seis rotas de `/account` seguem fora do rate limit**, entre elas a troca de senha | `apps/api/proxy.ts:44-55` | Recontado em 2026-09-25: ficam fora o `PUT /account`, `/account/password`, `/account/sessions/revoke` e `/account/onboarding`. A PR #25 acrescentou `POST /payments/checkout` e `POST /payments/portal`, também fora; cada checkout pode criar uma sessão na Stripe |
| ⚠️ **Superfície não-guardada da API: 11 de 30** arquivos de rota exportam handler nu, 8 deles `/auth/*` | `apps/api/app/(routes)/auth/**` | Recontado em 2026-09-26: 30 arquivos, 19 com guard (a contagem anterior, 29 e 18, era de antes de `payments/summary`). Os 11 nus: 8 em `/auth/*`, os dois `health` e o webhook de pagamento. As quatro rotas de `payments/*` nasceram com guard |
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
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-12` | Reconferido em 2026-09-26, depois da PR #28 mexer no arquivo: falta `"./utils/*"`, e `"."` (`:6`) aponta para `index.ts`, que não existe |
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
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:138` | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:148`). N+1 do Admin SDK. Décima rodada aberto; âncoras desceram de novo com os agregados de cobrança da PR #27 |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:122` · `:134` · `:138` · `:157` · `:175` | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| 🟡 **O predicado de posse foi copiado de novo** | `apps/api/(shared)/repositories/entity.repository.ts:23,40,64,72` · `entities/summary/route.ts:9` | Quatro cópias de `where("userId", "==", userId)` no mesmo arquivo. É a contrapartida P de [`teams-organizations`](teams-organizations.md) |
| 🟡 **`/auth/sign-in` da api não tem consumidor e não segue o contrato de erro** | `apps/api/app/(routes)/auth/sign-in/route.ts:12` | Reconferido: zero `try`, `:12` devolve string crua (`"User not found"`). Viola a regra de ouro 3. O `sign-up` ganhou chamador indireto de `createDefaultUserProfile` na PR #24 e tem `try` |
| ◐ **`skipValidation` incondicional na `apps/web`** | `apps/web/env.ts:33` | Reconferido. A metade do `NEXT_PUBLIC_APP_URL` fechou com a PR #25 |
| ◐ **O bounce do proxy apaga a query string**, corrigido só para as rotas de `oobCode` | `apps/app/proxy.ts:190-203` | Reconferido: `redirectUrl.search = ""` em `:201` (âncoras desceram uma linha com o import da PR #24). Mesma família do achado novo do deep link do onboarding |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta** | `apps/app/proxy.ts:170,174` | Reconferido: `cookieStore.set` sem `maxAge` |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem `Secure`** por padrão | `packages/shared/utils/helpers/cookies.ts:28,30` | Reconferido. ASVS 5.0 L1 (3.3.1). Décima rodada aberto |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O formulário de contato da `apps/web` falha a hidratação** | `apps/web/app/[locale]/contact/components/contact-form-client.tsx:79-80` | O `PopoverTrigger` renderiza um `<button>` com outro `<button>` dentro. Em `next build && next start`, `/en/contact` e `/es/contact` dão `Minified React error #418` a cada carga. Achado em 2026-09-25 pelo `/test` de `i18n-hydration-admin-delete-billing`; o arquivo não muda desde 2026-09-09. Correção provável: `PopoverTrigger asChild`, ou as classes de `buttonVariants` direto no trigger, no mesmo molde do header |
| 🟡 **O header logado da `apps/web` rola na horizontal no desktop** | `apps/web/app/[locale]/components/header/index.tsx` (grupo de ações à direita) | A 1280 px o "Sign Out" termina em x=1270 e a página rola 5 px; a 1024 px rola 29 px. Os números são os mesmos no `HEAD` anterior à correção do header, então o defeito é antigo. Medido em 2026-09-25 pelo `/test` da PR #28, já com o header corrigido. Não remedido nesta auditoria, que não sobe browser |
| 🟡 **O deep link das abas da conta não acompanha a navegação** | `AccountTabs.tsx:51-53` (estado lido uma vez) · `:55-62` (`history.replaceState`) | Reconferido. A barra lateral muda a URL e a aba fica onde estava. Estacionado (E9) |
| 🟡 **`"Pick a date"` literal no `DateInput`** | `packages/design-system/components/ui/date-input.tsx:50` | Reconferido. Sobreviveu às PRs #11 a #28 |
| 🟡 **O `DateInput` formata sempre em inglês** | `date-input.tsx:83` | Reconferido: `format(selected, "PPP")` sem `locale` |
| 🟡 **Strings de UI soltas**: `"Switch language"` nos dois apps, `"Toggle theme"` e `"Toggle Sidebar"` no design-system e `"Início"` no breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/app/[locale]/components/header/language-switcher.tsx:68` · `packages/design-system/components/ui/mode-toggle.tsx:39` · `ui/sidebar.tsx:299`, `:311`, `:314` · `PageBreadcrumb.tsx:30` | Reconferido em 2026-09-26. Os dois do design-system entraram nesta rodada, vistos pelo `/test` da PR #28 nos 3 idiomas. O breadcrumb ainda crava `href="/painel"` em `:28` |
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
> Nesta rodada foram remedidas as linhas 6, 8, 16 e 23. As outras mantêm o veredito de 2026-09-25 com
> motivo: exigem console de provedor, ou dependem de arquivos que a PR #28 não tocou (`firestore.indexes.json`,
> `storage.rules` e `firestore.rules` ficaram fora do diff). A PR #28 não criou índice, variável nem passo
> manual; acrescentou um critério 🔒 à linha 23.

| # | pendência | onde vive | veredito 2026-09-26 |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto**; não remedido nesta rodada, nada no repositório mudou |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto**. São **seis** índices sem publicação; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 | **continua aberto**, remedido em 2026-09-26 (404, `[]`, 28 PRs); estacionado (E3). É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-09-26: `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` versionados devolve 0; estacionado (E1) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto**. Trava também o passo `storage` do expurgo de conta |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **continua aberto** (exige projeto Firebase real) |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #24 criou 7 contas só no emulador, que as descarta |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto**, remedido em 2026-09-26: `git ls-remote --heads origin` devolve 27, ou seja, 26 além de `main` (eram 25) |
| 17 | Login com Google sem passe manual com conta real | *(só neste arquivo)* | **continua aberto**. O `/test` da PR #24 também não percorreu o Google no emulador; o nome do Google como valor inicial do passo 1 ficou fechado só por leitura |
| 18 | `storage.rules` nunca publicado nem testado | `PRE-PRODUCTION.md` | **continua aberto**; depende da 11. `e2e-testing` foi arquivada sem testes de rules, então esta parte ficou sem dono |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto**. Vazia, o canal cai no formulário de contato, que é maquete |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **cinco** eventos (a PR #27 acrescentou `invoice.paid`, `PRE-PRODUCTION.md:446-447`), chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` e o cancelamento real no arquivamento pelo admin (PR #28) seguem 🔒 até uma conta real existir. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |

A 21 foi fechada pelo usuário em 2026-09-25. A 23 cresceu com as PRs #27 e #28.

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
| **Task de teste no `@repo/design-system`** | — | Não é spec, é achado, com três casos agora. A PR #26 não a criou: o pacote segue sem `test` e sem config de Vitest. |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| **Troca de e-mail do titular** | — | Fora do corte de `account-settings`. A exclusão de conta foi entregue por `data-rights-lgpd` e as sessões estão em [`account-security-mfa`](account-security-mfa.md); a troca de e-mail continua sem dono. |
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, e também do de [`e2e-testing`](../docs/features/e2e-testing/spec.md), arquivada sem eles. Os testes de rules ficaram sem dono; candidatos a spec numa próxima descoberta (E11). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | O pré-requisito (CI verde e estável) vale nas 12 últimas execuções de merge na `main` (`gh run list`, 2026-09-24). Reavaliar junto com o branch protection (E3). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
