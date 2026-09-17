# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção [Entregues](#entregues).

> **Última auditoria:** 2026-09-16 (`/spec --sync`, pós-merge da PR #16) · anteriores: 2026-09-16 (PR #15) ·
> 2026-09-16 (PRs #13 e #14) · 2026-09-15 · 2026-09-14 · 2026-09-11 · 2026-09-10 · 2026-09-09 (2 rodadas) ·
> 2026-09-02 · 2026-09-01 (3 rodadas) · 2026-08-31 · **origem:** semeadura inicial (2026-08-21).
>
> **O que mudou nesta rodada:**
> 1. **`cookie-consent` foi entregue e arquivada.** Os seis itens do corte foram reconferidos um a um no
>    código, não no `STATE.md`; PR #16 mergeada em `main` (`7c8ff7c`), CI `success` no SHA de merge. É a
>    nona spec a sair da fila. A spec vive agora em
>    [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md).
> 2. **Zero inversões semânticas, contra 4 na rodada anterior.** As quatro foram corrigidas dentro da
>    própria PR #16 e as correções conferem com o código. O que sobrou é deriva de manutenção: uma âncora
>    deslocada, quatro contagens erradas e um inventário incompleto.
> 3. **Uma contagem que a spec contradizia sozinha.** `teams-organizations` escreveu "9 sítios" em três
>    lugares enquanto a tabela dela somava **11**. O erro enfraquecia justamente o argumento que a spec usa
>    para pedir atenção.
> 4. **Quatro números falsos em `docs/PRE-PRODUCTION.md`, corrigidos hoje**, mais um inventário de cookies
>    que omitia três nomes — num documento cujo propósito é declarar cookies para o texto legal.
> 5. **O #1 é `cursor-pagination`**, que vinha em segundo. Motivo em [Ordem recomendada](#ordem-recomendada).

## Contadores

Sobre as **10 specs que seguem em `specs/`**. Recontados do disco em 2026-09-16, lendo o frontmatter de
cada arquivo.

| status | qtd |
|--------|-----|
| `proposed` | 8 |
| `approved` | 0 |
| `in-progress` | 1 |
| `done` (arquivadas) | 9 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 3 · `confianca` 3 · `dx` 3 (+1 `deferred` em `produto`). **Por esforço:**
P 0 · M 7 · G 3. **Por valor:** alto 7 · médio 3 · baixo 0.

**Transições aplicadas nesta rodada: 1** (`cookie-consent`: `proposed` → `done`, arquivada).

### O caso `cookie-consent` — o que foi conferido antes de arquivar

PR **#16** mergeada em `main` em 2026-09-16T23:54:09Z (merge commit `7c8ff7c`), com CI `success` nesse SHA
(`gh run list`). Os seis itens do corte, reabertos no código:

| item | veredito | evidência |
|------|----------|-----------|
| 1. Três saídas igualmente acessíveis no primeiro nível | **implementado** | `packages/design-system/components/ui/cookie-consent.tsx:134-156` — rejeitar (`:137`) e aceitar (`:144`) são o mesmo `Button`, mesma variante, mesma largura (`sm:flex-1`); rejeitar vem primeiro na ordem de leitura e de tabulação |
| 2. Categoria por finalidade, não-necessário desligado por padrão | **implementado** | mesmo arquivo, `:64` (necessária travada em ligado) e `:75-80` (medição semeada com `analyticsGranted`, `false` enquanto não há decisão — `packages/analytics/consent.ts:22`) |
| 3. Nenhuma tag carrega antes da escolha | **implementado** | `packages/analytics/provider.tsx:101` deriva `measuring`; Vercel (`:107`) e Google (`:108-110`) só montam sob ela |
| 4. Escolha persiste entre visitas e entre os dois apps, revisável | **implementado** | cookie de 180 dias (`consent.ts:1,9-12`), domínio de `SESSION_COOKIE_DOMAIN` (`server.ts:29`); reabertura em `apps/web/…/cookiePreferencesButton.tsx:13,23` e `apps/app/…/ProfileDropdown.tsx:29,70` |
| 5. Aviso e preferências nos 3 idiomas, política no mesmo idioma | **implementado** | `translations/components/ui/cookie-consent.ts:2,36,70` · `translations/components/index.ts:19,29,39`; locale repassado em `apps/web/app/[locale]/layout.tsx:39` e `apps/app/app/layout.tsx:48` |
| 6. Os quatro sinais do Consent Mode v2 | **implementado** | `packages/analytics/consent.ts:90-93` (defaults) e `provider.tsx:29-31,52` (update) |

**Uma ressalva registrada na spec arquivada, que não bloqueia o `done`:** o ponto permanente de revisão na
`apps/app` mora no `ProfileDropdown`, que só existe depois do login. Quem decidiu na tela de cadastro e
nunca autenticou precisa do rodapé da landing para mudar de ideia — caminho que existe, mas depende de o
fork publicar a `apps/web` e de `SESSION_COOKIE_DOMAIN` estar configurada em produção.

## Gates — medidos nesta auditoria

Executados agora, com `--force`, no workspace `mbabane`. Não copiados do `/test` nem da rodada anterior.

| comando | resultado |
|---------|-----------|
| `pnpm check` | ✅ **543 arquivos · 0 erros** (`No fixes applied`, 226 ms) |
| `pnpm turbo run lint typecheck test --force` | ✅ **24/24 tasks · 0 em cache · 37,9 s** |

| workspace | arquivos | testes | Δ vs. 2026-09-16 (PR #15) |
|-----------|---------:|-------:|---------------------------|
| `api` | 35 | 371 | — |
| `app` | 41 | 293 | +3 arquivos · **+19** |
| `@repo/email` | 7 | 137 | — |
| `@repo/auth` | 6 | 62 | — |
| `@repo/shared` | 4 | 44 | **+4** |
| `@repo/analytics` | 2 | 34 | 🆕 workspace novo na suíte |
| `web` | 5 | 31 | — |
| `@repo/security` | 3 | 31 | — |
| `@repo/internationalization` | 3 | 27 | — |
| `@repo/payments` | 1 | 8 | — |
| **total** | **107** | **1038** | **+5 arquivos · +57 testes** |

A PR #16 acrescentou o décimo workspace à suíte (`@repo/analytics`), o que move de uma vez os quatro
números que os documentos vinham citando: tasks (23 → 24), arquivos do `pnpm check` (532 → 543), arquivos
de teste (102 → 107) e testes (981 → 1038).

CI: a execução de merge de **#16** (`7c8ff7c`) está em **`success`**. A branch de trabalho desta auditoria é
`mbabane`, cujo `HEAD` é `7c8ff7c` — nenhum commit do repositório está fora de `main`.

**O gate segue estável.** As **10** configs de Vitest declaram `testTimeout: 20_000` — a décima
(`packages/analytics/vitest.config.mts:6`) nasceu na PR #16 já com o teto, sem ninguém precisar lembrar. O
pré-requisito do branch protection continua satisfeito, e o branch protection continua não ligado.

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter nesta rodada) e prioriza valor × esforço × custo de adiar.
Nenhuma spec está bloqueada por dependência.

> **Um critério ganhou peso e continua valendo: o que uma rodada autônoma consegue provar.** O `/cycle` não
> provisiona infraestrutura, então uma spec cujos critérios de aceite dependem de conta em provedor volta
> com metade dos critérios "não verificados". Isso não a torna menos valiosa — torna-a má escolha para
> **esta** forma de execução, e a distinção precisa estar escrita para não virar preconceito silencioso.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`cursor-pagination`](cursor-pagination.md) | **Sobe ao topo depois de uma rodada em segundo.** Todo fork herda "ler a coleção inteira": `base.repository.ts:36-49` faz `.get()` sem `limit`, `orderBy` nem `startAfter`, e nenhum método aceita parâmetro de consulta. `startAfter`, `limit(` e `orderBy` dão **zero ocorrências** em `apps/api`. Tem o melhor argumento de **"fica mais caro depois"** do backlog: corrigir com dados em produção muda contrato do SDK, DTO, hooks e índices ao mesmo tempo. Prova-se inteira numa rodada autônoma — Firestore roda no emulador desde a PR #13, e nada aqui depende de conta em provedor. Cruza com a dívida do `update()` (achados), que precisa de `orderBy` estável em `createdAt`. |
| 2 | [`audit-log`](audit-log.md) | O painel já tem impersonação e **nada registra quem entrou na conta de quem** — o switch é inteiramente client-side (`panelStore.ts:76-90`). São **18 handlers de escrita** e **zero** gravam evento, incluindo `POST /account/sessions/revoke`: hoje não dá para distinguir se quem derrubou as sessões foi o dono ou quem tomou a conta dele. **0 de 5**, com o item 5 (retenção) parcial — o passo já está em `docs/PRE-PRODUCTION.md:296-298`, sem o prazo escrito. A PR #15 barateou o trabalho sem fazê-lo: a convenção de log e o helper já existem, e o que falta é a persistência. |
| 3 | [`billing-subscription`](billing-subscription.md) | Maior valor bruto do backlog e ainda em **0/6**: não existe diretório `payments/` nas rotas, o `UserDTO` não tem `subscription` nem `stripeCustomerId`, e o webhook tem dois handlers `// TODO` (`webhooks/payments/route.ts:13,23`) sem dedupe por `event.id`. **Segue atrás por um motivo de execução, não de mérito:** provar checkout, portal e webhook exige chaves reais da Stripe, e uma rodada autônoma devolveria os critérios como "não verificados". **Pré-requisito barato que segue de pé:** o 🔴 de `packages/payments/ai.ts:4-5` explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 4 | [`data-rights-lgpd`](data-rights-lgpd.md) | Obrigação legal com prazo, o argumento mais duro do backlog. Segue em 0/5, e a armadilha dos objetos órfãos continua dobrada: `deleteObjectQuietly` tem **2** call sites, ambos de troca, nenhum de expurgo. O `delete()` herdado é **soft delete** (`base.repository.ts:127-129`). **Ganhou escopo nesta rodada:** a PR #16 criou dado pessoal gerido por consentimento, e a prova do consentimento vive só no navegador do titular — o exportador precisa incluí-la. E a política placeholder virou destino de link do banner sem mencionar cookies em nenhum dos 3 idiomas. Esforço **G** é o que a segura fora do topo numa rodada autônoma. |
| 5 | [`onboarding-flow`](onboarding-flow.md) | ⚠️ **Precisa ser reescopada antes do `/analyze`.** O item 2 do corte continua oco desde que a PR #12 passou a coletar nome e idioma na área de conta; e a spec atribuía o gancho pós-cadastro ao lugar errado — ele está no `onSuccess` da mutation (`SignUpFormClient.tsx:114`), não no caminho de redirect que o onboarding precisaria interceptar. Reconferida nesta rodada: **zero deriva**, âncoras e contagens todas exatas, inclusive a autocorreção anterior. O trabalho é maior do que a spec descreve, e agora a spec diz isso. |
| 6 | [`e2e-testing`](e2e-testing.md) | Destravada, e sem o argumento mais forte que tinha — o gate instável foi corrigido pela PR #13 e não voltou. O que resta é sólido e mais lento de cobrar: zero `playwright`/`cypress`/`axe` em qualquer `package.json`, nenhuma das **10** configs medindo cobertura, e **duas rules files sem um único teste de regra** (`firestore.rules` publicado em deny-all, `storage.rules` nem publicado) — sem desculpa, porque o emulador existe. Esforço **G** e `value: médio`. |
| 7 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel são **11 linhas** e o literal `"Home"` — com a chave de dicionário pronta ao lado, já usada em 5 breadcrumbs. É a primeira tela de todo fork, e resgataria o `chart.tsx` (a dependência `recharts` pesa no bundle e nunca renderizou nada). Spec mais "presa" do conjunto elegível, apesar de `depends_on: []` — ver lotes. |
| 8 | [`account-security-mfa`](account-security-mfa.md) | Cresceu na auditoria anterior e não encolheu nesta. O item 4 (política de senha) era descrito como mudança em 5 schemas de formulário; são **10 declarações**, e as 3 que importam estão em `apps/api` — mudança de contrato, não de formulário. Restam MFA (**3/10** de prevalência entre os starters pesquisados) e visibilidade de sessões (**1/10**). `value: médio` por mérito próprio, e esforço provavelmente acima de M. |
| 9 | [`observability-logging`](observability-logging.md) | `in-progress`. Entregue em 5 dos 6 itens; o resíduo é adotar um coletor de erro, que depende de decisão de produto e de conta em provedor. **Fora do conjunto elegível** — ver [Precisam de decisão](#precisam-de-decisão). |
| 10 | [`teams-organizations`](teams-organizations.md) | `deferred` desde 2026-08-22 — a decisão, não só a implementação. As **duas contrapartidas de esforço P seguem não feitas**, agora há vinte e sete dias e pela quarta PR consecutiva. O gatilho de escalonamento que a própria spec definiu disparou. Ver [Precisam de decisão](#precisam-de-decisão). |

### O que **não** foi escolhido para #1, e por quê

- **`audit-log` foi o segundo colocado, e perdeu por duas razões que se somam.** A primeira é largura: é a
  fatia mais grossa das candidatas — coleção nova, repositório novo e tela de admin. A segunda é ordem, e
  é a que decide: uma trilha de auditoria é o arquétipo da coleção que cresce sem teto, então a tela dela
  vai querer paginação. Construí-la antes do #1 significa construir a listagem duas vezes, e a segunda vez
  já com dado gravado. O argumento moral dela continua sendo o mais desconfortável do backlog
  (impersonação sem registro) — o que mudou é só a ordem.
- **`billing-subscription`** tem o maior valor bruto e não foi escolhida por uma razão de execução, que
  merece ficar explícita: verificar checkout, portal e webhook exige chaves reais da Stripe, e esta rodada
  é autônoma. Seria entregar código que ninguém consegue provar hoje. Metade dos critérios voltaria como
  "não verificado", e isso é critério de execução, não de mérito.
- **`data-rights-lgpd`** tem prazo legal e mesmo assim não foi ao topo: esforço **G** é má escolha para uma
  rodada autônoma, e ela acabou de ganhar escopo com a chegada do consentimento.
- **`onboarding-flow` e `account-security-mfa`** estão as duas com o corte desatualizado em relação ao
  código. Reescopar antes de planejar: planejar sobre um corte errado custa mais caro que reescrever a spec.

## Lotes paralelos

Para rodar o ciclo completo em 2–4 workspaces do Conductor ao mesmo tempo. Calculado em **2026-09-16** a
partir do `contends_on` de cada spec, lido do disco, pelo algoritmo de
[`/spec-audit` §6](../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por
disjunção → teto de 3.

**A ordem recomendada acima e estes lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a
pena fazer*; o lote diz *o que pode ser feito junto sem uma spec pisar na outra*. Um lote **não** é
recomendação de prioridade — se você só vai rodar uma coisa, rode o #1 da ordem.

**Elegíveis nesta rodada: 8 de 10.** Fora ficam `teams-organizations` (`deferred`) e
`observability-logging` (`in-progress`).

| lote | specs | o que cada uma toca | por que não colidem |
|------|-------|---------------------|---------------------|
| **1** | `cursor-pagination` · `billing-subscription` · `e2e-testing` | `base.repository.ts` + `entity.repository.ts` + `table.tsx` + índices + ação `entity` do SDK · webhook de pagamento + barril do SDK + `UserDTO` + `user.repository.ts` + `routes.tsx` · `package.json` da raiz + `turbo.json` + `ci.yml` | **camada de dados de `entity`**, **slice `user` cobrado** e **ferramental da raiz**. Repositórios distintos (`base`/`entity` × `user`), pontos distintos do SDK (`actions/entity` × `client/index.ts`), e a terceira não toca em `apps/` nem em `packages/` |
| **2** | `audit-log` · `onboarding-flow` · `account-security-mfa` | `base.repository.ts` + `users/[id]` + índices + barril do SDK + `queryKeys.ts` · `apps/app/proxy.ts` + resolvedor pós-login + `user-merge.ts` + `UserDTO` · `packages/auth/*` + `resolve-api-actor.ts` | **escrita de trilha na API**, **desvio de navegação no app** e **camada de sessão**. Encostam no `user` por caminhos distintos (`users/[id]/route.ts` × `user-merge.ts` × `packages/auth`) |
| **3** | `data-rights-lgpd` | `base.repository.ts` + `packages/auth/server.ts` + índices | sozinha: colide com `cursor-pagination` e `audit-log` no repositório base e nos índices, e com `account-security-mfa` em `packages/auth/server.ts` |
| **4** | `dashboard-home` | as duas `page.tsx` de home + `queryKeys.ts` + índices | sozinha depois da realocação: colide com `cursor-pagination` e `data-rights-lgpd` nos índices e com `audit-log` em `queryKeys.ts` **e** nos índices |

### Por que cada spec ficou de fora do lote 1

Distinguir os dois motivos importa: colisão é **dado**, teto é **decisão**.

- **`audit-log` colide com `cursor-pagination` duas vezes:** as duas alteram
  `apps/api/(shared)/repositories/base.repository.ts` **e** `firestore.indexes.json`.
- **`data-rights-lgpd` colide com `cursor-pagination` nos mesmos dois arquivos.** Não é acidente — as três
  precisam mexer no repositório herdado, uma para ensiná-lo a paginar, outra para registrar, a terceira
  para excluir de verdade.
- **`onboarding-flow` colide com `billing-subscription`** em `packages/sdk/src/types/user/user.ts`: as duas
  precisam acrescentar campo ao `UserDTO`, uma para estado de perfil incompleto, a outra para assinatura.
- **`dashboard-home` colide com `cursor-pagination`** em `firestore.indexes.json`. É a spec mais "presa" do
  conjunto elegível, apesar de `depends_on: []`.
- **`account-security-mfa` não colide com nada do lote 1.** Ficou de fora **só pelo teto de 3**, que é
  escolha de custo de revisão e não impedimento técnico. Se você tiver fôlego para revisar quatro features
  amanhã, é ela que entra.

**O arquivo mais disputado do repositório continua sendo `firestore.indexes.json`**, citado por **5** das
10 specs. Em seguida, com 3: `apps/api/(shared)/repositories/base.repository.ts` e
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

A régua desta rodada, com `cookie-consent` como amostra: ela declarava **4** arquivos em `contends_on` —
`packages/analytics/provider.tsx`, os dois `layout.tsx` e o barril de UI do design system — e **acertou os
quatro**. A PR tocou 47 arquivos, mas o raio extra caiu quase todo em arquivos **novos**
(`packages/analytics/consent.ts`, `server.ts`, `consent-context.tsx`, `cookie-consent.tsx` e os testes).
Os dois arquivos existentes não previstos foram `packages/shared/utils/helpers/cookies.ts` e
`apps/web/app/[locale]/components/footer.tsx`, e **nenhum dos dois é `contends_on` declarado de outra
spec**.

**Primeira rodada em quatro em que a previsão não subestimou o raio de forma relevante.** O motivo limita o
que isso prova: uma feature que nasce quase inteira em arquivos novos é o caso fácil do `contends_on`. As
próximas três da fila mexem em código herdado, onde a previsão vem errando.

## Precisam de decisão

Nenhuma delas é da auditoria. Todas têm recomendação, e nenhuma foi aplicada.

| # | questão | recomendação |
|---|---------|--------------|
| 1 | **`observability-logging` fecha como entregue?** 5 dos 6 itens estão no código; o que falta é adotar um coletor de erro, que exige conta em provedor e é a pergunta em aberto nº 1 da própria spec. Segunda rodada consecutiva sem resposta. | **Fechar como `done`** e abrir uma spec nova de esforço P só para o coletor. Manter uma spec quase inteira aberta por um item que ninguém pode executar sem decisão de produto trava a spec e polui a fila. |
| 2 | **`teams-organizations` continua `deferred`?** Vinte e sete dias e quatro PRs sem nenhuma das duas contrapartidas de esforço P que tornavam o adiamento honesto. **O gatilho escrito na própria spec disparou.** | Ou as contrapartidas viram tarefa com dono, ou o status vira `rejected` até aparecer o primeiro fork B2B. Manter `deferred` sem elas é tomar a decisão por omissão, agora pela quarta vez. |
| 3 | **Ligar o branch protection na `main`?** O único pré-requisito técnico caiu na PR #13 e continua satisfeito. Hoje uma PR vermelha pode ser mergeada. | Ligar, exigindo o check do CI. Custo de minutos, e o risco de adiar cresce com o número de PRs. |
| 4 | **`account-security-mfa` e `onboarding-flow` precisam de reescopo antes do `/analyze`.** As duas têm o corte de MVP desatualizado em relação ao código, cada uma por um motivo diferente. | Rodar `/spec <id>` nas duas antes de planejar. Planejar sobre um corte errado custa mais caro que reescrever a spec. |
| 5 | **Quem escreve a política de privacidade que o banner agora linka?** 🆕 O consentimento de cookies entrou e aponta para `/legal/privacy`, que é modelo e **não menciona cookies** em nenhum dos 3 idiomas. Um fork que suba assim fica em posição pior do que sem banner: o aviso afirma que existe política, e a política não descreve o tratamento. | Texto legal é responsabilidade de cada fork, não do core — mas o **core deve entregar um modelo que ao menos declare os cookies que ele próprio grava**. A tabela dos sete está em `docs/PRE-PRODUCTION.md`. Cabe no corte de `data-rights-lgpd` (#4) ou vira tarefa direta de esforço P. |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-16 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | ✅ satisfeitas (PR #5 e PR #13) |
| [`account-security-mfa`](account-security-mfa.md) · [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`) |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
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
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`). Entregou também, fora do corte, o `testTimeout` nas 9 configs de Vitest de então |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`), conferidos um a um. ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |

**Verificado nesta rodada:** `docs/features/` tem **12** pastas e **9** `spec.md` arquivados. As três pastas
sem `spec.md` são `observability-logging` (spec continua em `specs/`, por decisão desta auditoria — não
houve `git mv` e não há duplicata), `auth-panel-context` e `impersonation-read-only`. Os frontmatters das 9
arquivadas seguem coerentes (`status: done`, `feature: <slug>`).

As **duas** features concluídas sem spec — `auth-panel-context` e `impersonation-read-only` — não constam
na tabela, e é o correto: as duas são anteriores à semeadura do backlog (2026-08-21).

### O que a PR #16 entregou **além** do corte

1. **`setCookie` ganhou `domain` e `Secure`** (`packages/shared/utils/helpers/cookies.ts`), com o quarto
   argumento opcional. Sem isso a escolha não atravessa subdomínios; com isso, o helper compartilhado passa
   a servir a qualquer cookie que precise de escopo de domínio.
2. **Dois defeitos de sobreposição corrigidos fora do escopo do consentimento.** A tela de login da
   `apps/app` nunca rolava, e o banner cobria "Continuar com Google", "Esqueci minha senha" e "Cadastrar" —
   um visitante que ignorasse o aviso ficava sem caminho para o cadastro. O rodapé da `apps/web` tinha o
   mesmo problema no fim da rolagem. Os dois foram medidos com `elementFromPoint`, não inferidos.
3. **O cron órfão de `apps/api/vercel.json` foi removido** — agendava `/cron/keep-alive` diariamente para
   uma rota que nunca existiu em nenhum commit.
4. **`apps/app/package.json` passou a declarar `@repo/analytics`**, fechando metade de um achado 🟡 que
   figurava aqui há rodadas.

**Nada disso é deriva de implementação** — o corte foi entregue como especificado. É escopo adicional. E
vale a observação pela quinta PR seguida: **uma entrega está consertando, de passagem, achados que o
backlog vinha listando**.

## Contradições doc × código, medidas nesta rodada

O modo de falha mais consistente deste repositório é **documentação que mente sobre estado implementado**,
e é o único que nenhum gate pega: `pnpm check`, `typecheck`, 1038 testes e o CI não leem prosa.

| documento | afirma | realidade medida em 2026-09-16 | veredito |
|-----------|--------|-------------------------------|----------|
| `docs/PRE-PRODUCTION.md` (gate) | "9 de 9 configs com `testTimeout`", gate em **23/23**, `pnpm check` em **532 arquivos**, suíte de **981 testes em 102 arquivos** | **os quatro números estão errados desde o merge da PR #16**, que acrescentou o workspace `@repo/analytics` à suíte. Medido agora: **10 de 10**, **24/24**, **543 arquivos**, **1038 testes em 107 arquivos** | 🔴 **corrigido hoje**, com a nota de que foi a PR #16 que moveu os quatro de uma vez |
| `docs/PRE-PRODUCTION.md` §7 (declaração de cookies) | "o repositório grava **sete**", listando `bp:cookie-consent`, `x-locale`, `sidebar_state`, os de sessão do Firebase, `_ga` e `_ga_<id>` | **a lista omitia três nomes**: `x-theme` (`apps/app/shared/lib/themePreference.ts:10`), `bp:panel-request-role` e `bp:impersonate-firebase-uid` (`apps/app/shared/lib/panelState.ts:18-19`). São **sete gravados pelo repositório** mais dois do Google | 🔴 **corrigido hoje**, com tabela por cookie, arquivo e categoria. Erra num documento cujo propósito é alimentar o texto legal |
| `docs/SECURITY.md:135` (rate limit) | roda sobre lista fechada de **8 caminhos**, casados por igualdade exata | **confere.** `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:42-51`) tem exatamente os 8 listados | ✅ **honesto**, e continua correto depois da correção da rodada anterior |
| `docs/PAYMENTS.md` | não há fluxo de assinatura; handlers são stubs; sem `STRIPE_WEBHOOK_SECRET` responde `{ ok: false, message: "Not configured" }` | **confere nos três.** `webhooks/payments/route.ts:13,23` seguem com `// TODO`, o diretório `payments/` não existe, e `:32-33` devolve exatamente esse corpo | ✅ **honesto** pela quarta rodada — o único documento com esse histórico |
| `docs/PRE-PRODUCTION.md` §11 (observabilidade) | a API carimba `x-request-id`, emite log estruturado e expõe `/health/ready`; falta plugar coletor e apontar o health check | **confere item a item.** Nenhum coletor no repo: `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve **zero** | ✅ **honesto** |
| `docs/PRE-PRODUCTION.md` (branch protection) | `protection` → 404, `rulesets` → `[]` | **não remedido nesta rodada** — a auditoria anterior mediu em 2026-09-16 e nada mudou desde então | ⚪ **não conferido hoje** |

> **Nota de método, sétima rodada consecutiva.** As duas contradições desta rodada estão no **mesmo
> documento**, e as duas são números que alguém escreveu depois de medir — só que mediu antes do merge que
> os invalidou. É um modo de falha diferente do da rodada anterior (lá o erro era de conteúdo, plantado
> duas PRs antes): aqui a medição estava certa e envelheceu em horas. **Medir dentro da PR que muda o
> número não vale**; a medição precisa ser depois do merge, que é quando esta auditoria roda.

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec.

Esta rodada encontrou deriva em **7 das 10 specs**, e **nenhuma inversão semântica** — contra 4 na rodada
anterior. As três intactas são `onboarding-flow` (âncoras, contagens e a autocorreção anterior todas
exatas), `audit-log` (todas as âncoras conferidas, incluindo a coincidência real de `admin.ts:62` e
`common-panel.ts:62`) e `billing-subscription` (âncoras exatas no caractere; a deriva dela é de contagem).

**Por que zero inversões.** As quatro da rodada anterior foram corrigidas dentro do próprio commit
`7c8ff7c`, e as correções conferem com o código. O que resta é manutenção.

### Âncoras deslocadas

| id | citado | real hoje | causa |
|----|--------|-----------|-------|
| [`account-security-mfa`](account-security-mfa.md) | `ProfileDropdown.tsx:66` (botão de sair) | **`:81`** | 🔴 PR #16 inseriu o item de preferências de cookie em `:68-80`. A linha `:66` hoje cai **dentro** do bloco de consentimento — a âncora não só deslocou, passou a apontar para outro assunto |
| [`account-security-mfa`](account-security-mfa.md) | `auth/password/reset/route.ts:49` | **`:51`** (a `:49` é comentário) | deriva de 2 linhas, pré-existente |
| [`teams-organizations`](teams-organizations.md) | `firestore.rules:39-40` (comentário sobre `entity.userId`) | o comentário vai até **`:43`** | intervalo estreito demais; a frase inteira não cabia nas duas linhas |

Corrigidas as três no disco.

### Contagens erradas

| id | afirmava | real | leitura |
|----|----------|------|---------|
| [`teams-organizations`](teams-organizations.md) | "**9 sítios** em 3 recursos", em **3 lugares** (`:25`, `:88`, `:157`) | **11** | ❗ A spec contradizia a **própria tabela**: somar as linhas dá 3+2+3+2+1 = 11, e os 11 foram reabertos no código. O número errado enfraquecia o argumento de "juros compostos" que a spec usa para pedir atenção — com 11 o argumento fica mais forte, não mais fraco |
| [`e2e-testing`](e2e-testing.md) | 981 testes em 102 arquivos · 9 tasks · 9 configs · gate 23/23 · `apps/app` 274/38 · `@repo/shared` 40 · 5 capturas em `review/` | 1038 em 107 · 10 · 10 · 24/24 · 293/41 · 44 · **4** capturas | **8 números**, todos por defasagem: a spec foi editada dentro da PR #16, antes de os commits de código daquela PR entrarem. A 5ª "captura" era o `review.md` contado junto dos PNGs |
| [`billing-subscription`](billing-subscription.md) | "a rota ganhou **11** testes" | **13** | os 2 extras vieram da PR #15, correlacionando a falha com o `requestId` (`:201`, `:229`). Sem `it.each` no arquivo, então a contagem é inequívoca |
| [`account-security-mfa`](account-security-mfa.md) | suíte de `packages/auth` em "6 / **61**" | **6 arquivos / 62 testes** | ambíguo, não errado: são 61 declarações de `it`, mas `serverEmulatorInit.test.ts:69` é um `it.each` de 2 tuplas. A spec agora diz qual das duas medidas está citando |

### Inventário incompleto

| id | o que estava incompleto | correção |
|----|------------------------|----------|
| [`dashboard-home`](dashboard-home.md) | "**19** rotas" com a lista `account/*` ×3, `auth/*`, `entities`, `entities/[id]`, `files`, `users`, `users/[id]`, `health`, `webhooks/payments` | o **total está certo**; a lista omitia `health/ready`, criada pela PR #15, e batia em 19 por compensação na leitura. Um número certo apoiado num inventário errado é pior que um número errado: não dispara revisão |
| [`data-rights-lgpd`](data-rights-lgpd.md) | a seção "O que já existe" não conhecia o consentimento de cookies | 🆕 acrescentado, com as duas consequências para o corte: o exportador precisa incluir o registro de consentimento (hoje ele vive só no navegador do titular), e a política placeholder virou destino de link do banner sem falar de cookies |

### Homônimo que parece regressão e não é

[`observability-logging`](observability-logging.md) afirma que `packages/analytics/server.ts` "foi apagado
em 2026-09-01". O arquivo **existe de novo** desde a PR #16 — mas é outro: hoje é o resolvedor de bootstrap
de consentimento, com `import "server-only"` e sem dependência não declarada. Quem ler a spec e encontrar o
arquivo no disco vai concluir que houve regressão do item 6 do corte. Não houve; o nome foi reaproveitado.
Registrado na spec.

### Precisão menor

[`cursor-pagination`](cursor-pagination.md) dizia que `TableProps` "estende" `AntdTableProps`; o mecanismo é
`Omit<…, "columns" | "dataSource">` (`table.tsx:12`). A conclusão não muda — `pagination` não aparece uma
única vez no arquivo, então a paginação exibida é a client-side do antd sobre o array inteiro.

## Achados — correções pontuais, não specs

Coisas que não merecem spec própria (não são funcionalidade, não têm corte de MVP), mas que são
correções pontuais, algumas de minutos. Viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-16.** Os achados da rodada anterior foram reconferidos contra o código.
> **Placar: 1 fechado pela metade · 1 novo · o resto intacto.** A PR #16 fechou metade do achado de
> dependência não declarada — `apps/app/package.json:15` agora declara `@repo/analytics` — e o resto da
> lista não foi tocado.

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
| ◐ **Dependência importada sem ser declarada — metade fechada, metade aberta e uma nova.** ✅ `apps/app/package.json:15` passou a declarar `@repo/analytics` (PR #16). 🟡 `apps/app/env.ts:1` importa `@repo/email/keys` e `apps/app/package.json` **não declara** `@repo/email`. 🆕 🟡 `apps/web` importa `@repo/auth/provider` em **5 arquivos** de produção (`layout.tsx:4`, `clientLayout.tsx:3`, `sign-up-form-client.tsx:4`, `header/index.tsx:3`, `sign-in-form-client.tsx:4`) e `apps/web/package.json` **não declara `@repo/auth`** | `apps/app/package.json` · `apps/web/package.json` | Funciona por hoisting do pnpm. Além do risco de resolução, **o turbo não invalida `web#*` quando `@repo/auth` muda** — cache mentindo num gate que roda em toda PR. O caso da `web` é o pior dos três: é runtime, não só `keys.ts` |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido: `client-ui.tsx` **não existe**. Zero importadores, falha em silêncio. **Décima segunda auditoria consecutiva** |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` de todo o resto | `packages/auth/package.json:25` | É o único workspace fora da major. Um pacote de **autenticação** — dono de middleware, cookie de sessão e código adjacente ao proxy — resolvendo uma major diferente do runtime que o consome |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | `@repo/email` e subpaths resolvem **só** pelo alias TS. Funciona hoje; quebra em qualquer consumidor que resolva por Node |
| 🟡 `chart.tsx` é código morto — `recharts` pesa no bundle sem uso | `packages/design-system/components/ui/chart.tsx` | `grep ChartContainer` fora do próprio arquivo ⇒ **0**. `dashboard-home` (#7) é a spec que o resgataria |
| 🟡 **`input-otp.tsx` é código morto**, sem consumidor fora do barril e do catálogo do `playground` | `packages/design-system/components/ui/input-otp.tsx` | `account-security-mfa` (#8) é a spec que o usaria. ⚠️ Cuidado ao medir: `InpuTOTP` casa com um `grep -i TOTP` e produz 7 falsos positivos |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` seguem instalados e nunca importados** | `apps/app/package.json:26,35` | São as dependências típicas de OTel/Sentry. A PR #15 entregou observabilidade inteira sem tocá-las, o que confirma que são peso morto e não semente de nada |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:9` | Falta o subpath `"./utils/*"` (consumidor externo não alcança `utils/cookies.ts`), e o `"."` aponta para `index.ts`, **que não existe** |
| 🟡 **`emailBrand.supportEmail` é configuração morta** — uma ocorrência, a própria definição | `packages/email/brand.ts:9` | Um fork vai editá-lo achando que muda alguma coisa |
| 🟡 **`isRateLimitEnforced()` é export morto** — os únicos consumidores são os próprios testes | `packages/security/index.ts:32` | O papel que cumpriria acabou coberto pelo aviso de boot, que lê `process.env.ARCJET_KEY` direto. Duas fontes de verdade, e a que tem nome não é a usada |
| 🟡 **`FormattedError.retryAfterSeconds` não tem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | O campo vizinho `requestId`, nascido na mesma entrega, **foi ligado até a tela** (`handleClientError.ts:7,11`). Dois campos em linhas adjacentes, só um chegou ao usuário. ⚠️ Há um `retryAfterSeconds` **homônimo de outro tipo** em `apps/api/proxy.ts:102` |
| ✅ **`reloadCurrentUser` segue sem teste próprio** — sexto ciclo | `packages/auth/client.ts:224` | A única cobertura é `apps/app/__tests__/useEmailVerification.test.tsx`, que a **mocka** |
| 🟡 **`packages/shared` é o único pacote com `test` e sem `typecheck`** | `packages/shared/package.json` | O pacote hospeda o helper de log e o `requestErrorReporter`, e a imunidade a `Error` do `logEvent` é garantida pelo **tipo**, que nenhum gate deste workspace verifica. Fica coberto de lado pelo `typecheck` dos consumidores; não pelo próprio |

### 🟡 Repositório, rotas e proxy

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`** | `apps/api/(shared)/repositories/base.repository.ts:102-117` | Depois do primeiro `PUT` o campo deixa de ser `Timestamp` e vira `String`: consulta por range/`orderBy` mistura tipos. **Cruza diretamente com `cursor-pagination` (#1)** — e agora o #1 é o próximo da fila, então o conserto cabe ali. ⚠️ Preservado de propósito em `firestore-admin-access` (migração *contract-preserving*) |
| 🟡 `delete()` herdado por todo repositório é **soft delete** — chama `update({ deletedAt })` | `apps/api/(shared)/repositories/base.repository.ts:127-129` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. Bloqueia o item 3 de `data-rights-lgpd` — e deixa **duas** famílias de objeto órfãs no bucket |
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:32-43` | Declara `Promise<UserDTO[]>` mas devolve o merge com o Firebase Auth, e descarta linhas em silêncio (`:42`). O N+1 do Admin SDK está em `:38-40` |
| 🟡 **`/auth/sign-in` e `/auth/sign-up` da api não têm consumidor e não seguem o contrato `{ error: { code } }`** — devolvem string crua; a primeira responde **500** para credencial inválida porque **não há `try/catch`** | `apps/api/app/(routes)/auth/sign-in/route.ts` · `sign-up/route.ts` | Viola a regra de ouro 3. Seguem órfãs — o SDK chama `/auth/me`, `/auth/sign-in/google` e as rotas de senha, nunca estas. A decisão certa provavelmente é removê-las |
| 🟡 **Webhook da Stripe é casca**, e `:67` devolve `{ result: event }` — **ecoando o objeto Stripe inteiro na resposta HTTP** | `apps/api/app/(routes)/webhooks/payments/route.ts:13,23,67` | A assinatura **é** validada; nada é persistido, e não há dedupe por `event.id`. Escopo de `billing-subscription` (#3) |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `skipValidation` descarta as chaves vindas de `extends`, e `STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` | `apps/api/env.ts:46` | `pnpm --filter api dev:with-stripe` **não pode funcionar**. Duas das três chaves afetadas já foram resgatadas por redeclaração (`FIREBASE_STORAGE_BUCKET` em `:26`, `NEXT_PUBLIC_APP_URL` em `:33`), **com comentário nomeando esta armadilha** — esta ficou de fora |
| ◐ **`skipValidation` na `apps/web` é incondicional** e `NEXT_PUBLIC_APP_URL` **não** está no bloco `client` | `apps/web/env.ts:27,13-19` | O CTA "Ir para o painel" da landing cai no fallback em `hero.tsx:44`, `cta.tsx:35`, `header/index.tsx:35-36` e `pricing/page.tsx:77,120`. Pior que o bug: o bloco `client` tem **forma** de validação e não valida nada |
| ◐ **O bounce do proxy apaga a query string — corrigido só para as duas rotas de `oobCode`** | `apps/app/proxy.ts:189-202` | A isenção é **por path**, não por parâmetro: **qualquer outra query em rota pública continua sendo apagada** — UTM de campanha, `?plan=`. O próximo fluxo que carregar estado na URL redescobre o mesmo defeito |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com TTL, mas na requisição seguinte os proxies fazem `cookieStore.set` **sem `maxAge`/`expires`** | `apps/app/proxy.ts:169,173` · `apps/web/proxy.ts:104,108` | O idioma escolhido **não sobrevive ao fechamento do navegador**. Nem o `x-theme` nem o `bp:cookie-consent` herdaram o defeito — os dois são gravados só pelo cliente |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`** por padrão; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. ◐ **Meio fechado pela PR #16:** o helper passou a aceitar `secure` como opção, e o cookie de consentimento a usa em produção (`packages/analytics/server.ts:30`). `x-locale` e `x-theme` continuam sem |
| ⚪ **`cors.ts` allow-lista um header que nenhum código do repo envia:** `x-locale` existe **só como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Resíduo. **`x-role` NÃO é resíduo** e não deve ser removido junto |
| 🟡 **O papel do painel viaja em dois headers ao mesmo tempo** — o SDK escreve `REQUEST_ROLE` **e** um `x-role` cru, e lê de volta o cru | `packages/sdk/src/client/base.ts:45,53,61,95` | Dois nomes vivos para o mesmo fato, com o "legacy" sendo **escrito e lido de volta** em toda requisição autenticada — não é resíduo histórico, é duplicação ativa |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`"Pick a date"` literal no `DateInput`** — string de UI fora do dicionário, como valor **padrão** de prop | `packages/design-system/components/ui/date-input.tsx:50` | **Sobreviveu às PRs #11 a #16.** Viola a regra de ouro 2 e aparece para todo fork que não passar `placeholder` — em qualquer idioma |
| 🟡 **Strings de UI soltas remanescentes** — `"Switch language"` (`sr-only`, nos **dois** apps), `"Início"`, `"Home"` | `LanguageSwitcher.tsx:79` · `apps/web/…/language-switcher.tsx:68` · `PageBreadcrumb.tsx:30` · as duas `page.tsx` de home `:7` | Agrava no `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, e está nos dois apps. O `PageBreadcrumb` ainda crava `href="/painel"` em `:29` |
| 🟡 **A mensagem de erro padrão do repo inteiro está cravada em pt-br dentro de um pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | `"Um erro inesperado aconteceu"` é o retorno de **todo** erro que não é `FormattedError` — o fallback que qualquer fork mostra quando nada mais funciona, em espanhol e em inglês também. A função ao lado (`withRequestId`, `:4-11`) **lê o dicionário corretamente** para o rótulo do identificador, o que torna a omissão mais visível |
| 🟡 **`apps/web/…/sign-in/validations/signInSchema.ts:9` crava a mensagem de validação em pt-br** | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:9` | `"A senha deve ter pelo menos 6 caracteres"` fora do dicionário. Os outros nove sítios de `MIN_PASSWORD_LENGTH` passam por `validation.passwordMin` |
| 🟡 **`apps/app/next.config.ts:19` lista `www.google.com` em `images.domains`** sem uso e sem `remotePattern` correspondente; `domains` está **deprecado** no Next 16 | `apps/app/next.config.ts:19` | Duas allowlists de imagem que discordam, e a sobrando é a que some quando a chave deprecada for removida |
| ⚪ **Um `useList*` que falha renderiza o estado vazio, não erro.** Um 429 na lista de entidades mostra "Nenhuma entidade cadastrada" | `…/entities/(hooks)/useListEntities.tsx:16` · `…/(home)/EntitiesListClient.tsx:23-28` | O hook **devolve** `error`; o componente destrutura 4 dos 5 campos e nunca o lê. Lista que falhou fica indistinguível de lista vazia, e o usuário conclui que apagaram os dados dele |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel | `apps/web/…/(home)/components/cases-client.tsx:29-38` | Um timer é agendado a cada avanço e nenhum é cancelado na desmontagem; as deps `[api, current]` reagendam a cada tick. É a home da landing |
| 🟡 **`useHealthCheck` foge do padrão de hooks de dados do escopo** — `getApplicationHealthCheck` **não é exportado** | `apps/app/shared/hooks/useHealthCheck.ts:11` | O `apps/app/CLAUDE.md` exige que o hook exporte também a função imperativa no mesmo arquivo. ⚠️ Ganhou urgência: agora existe `/health/ready`, e é provável que alguém queira consumi-lo pelo mesmo hook |
| 🟡 **`provider-error` não distingue as falhas do provedor** — cota estourada, domínio não verificado e chave revogada produzem o mesmo `reason` | `packages/email/index.ts:121-122,128-129` | Descartar o objeto de erro é **correto e deliberado**. A assimetria criada pela PR #15 segue: `@repo/email` manteve o próprio `logEmail` (`:39-48`) em vez de usar o `logEvent` compartilhado — mesmo formato, código duplicado, e o teste de privacidade vigia só esta cópia |
| ◐ **`welcomeEmail` segue sem nenhum chamador de produção**, e o formulário de contato da landing continua maquete | `packages/email/templates/welcome.tsx:49` · `apps/web/…/contact/components/contact-form-client.tsx` | O form não tem `<form>`, nem handler, nem import da action — que **existe e tem teste** (`actions/contact.tsx:7`, `apps/web/__tests__/contactAction.test.ts:26`) e zero chamadores de produção |
| 🆕 🟡 **O rodapé da `apps/web` consome `data-cookie-banner` sem teste que fixe o acoplamento** | `apps/web/app/[locale]/components/footer.tsx:56` | O banner publica o atributo e dois layouts o leem. O lado da `apps/app` tem teste (`apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`); o da `web` não, porque a suíte dela roda em `environment: "node"`, sem jsdom. Renomear um dos dois lados quebra o rodapé em silêncio |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default) | `.github/workflows/ci.yml:39` | Comportamento correto, mas quem ler o log da PR verá tasks "não rodadas" e pode se confundir |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../docs/PRE-PRODUCTION.md),
> que um fork herda por escrito. O documento ganhou a seção 7 (consentimento) na PR #16, e teve quatro
> números e um inventário de cookies corrigidos nesta auditoria.

| # | pendência | onde vive | custo |
|---|-----------|-----------|-------|
| 1 | **`main` não tem branch protection.** O pré-requisito caiu na PR #13 e continua satisfeito — o gate fechou 24/24 sem cache | `PRE-PRODUCTION.md` | **minutos** |
| 2 | **Ninguém vigia a trilha de erro.** O `onRequestError` está plugado nos três apps e escreve no stdout; nenhum coletor está ligado e nenhum alerta é disparado. `grep` por `sentry`/`betterstack`/`logtail`/`axiom` nos `package.json` devolve zero. É o resíduo de `observability-logging` | `PRE-PRODUCTION.md` §11 | P + conta em provedor |
| 3 | **O health check da plataforma não aponta para `/health/ready`.** A rota existe e responde 503 quando o Firestore não atende em 2 s; enquanto ninguém a configura, a plataforma segue olhando `/health`, que responde OK com o banco fora do ar | `PRE-PRODUCTION.md` §11 | ~2 min |
| 4 | 🆕 **`SESSION_COOKIE_DOMAIN` precisa estar definida se `web` e `app` rodarem em subdomínios distintos.** Sem ela o cookie de consentimento fica host-only e o visitante responde ao banner **duas vezes**. Degrada, não quebra — e **não aparece em desenvolvimento**, porque em `localhost` o browser ignora a porta | `PRE-PRODUCTION.md` §7 | ~2 min |
| 5 | 🆕 **A política de privacidade linkada pelo banner não menciona cookies.** Ver a decisão nº 5 | `PRE-PRODUCTION.md` §7 | P (texto) |
| 6 | **Cloud Storage não está ativado** no projeto de referência. É o que deixa os critérios do avatar e da foto de entidade como "não verificados" — com **dois** consumidores. Exige plano **Blaze** | `PRE-PRODUCTION.md` | cartão + ~15 min |
| 7 | **O envio real de e-mail nunca foi provado.** Toda a validação foi feita com preview local e placeholder. Exige domínio com SPF/DKIM | `PRE-PRODUCTION.md` | DNS + ~10 min |
| 8 | **Na `apps/web` a CSP é Report-Only**, não bloqueante. Decisão deliberada, política rodou com zero violações | `PRE-PRODUCTION.md` | P |
| 9 | **Contas de QA acumuladas: 15.** As PRs #13 a #16 não acrescentaram nenhuma — o emulador e o gate de e-mail não configurado seguraram as quatro. Uma das antigas (`qa-account-settings-b@`) segue **inutilizável**: apagar, não reusar | `PRE-PRODUCTION.md` | P |
| 10 | **Branches mergeadas ainda vivas no remoto.** As PRs são mergeadas por squash e as branches ficam | `PRE-PRODUCTION.md` | P |
| 11 | **O login com Google nunca teve passe manual com conta real.** ⚠️ A única que continua existindo só aqui. O `/test` provou o mecanismo do COOP via `postMessage`, não o fluxo ponta a ponta | *(só neste arquivo)* | ~2 min |
| 12 | **`storage.rules` nunca foi publicado nem exercitado por teste de regra.** Depende da pendência 6; o teste de regra depende de `@firebase/rules-unit-testing`, que pertence a `e2e-testing` (#6) | `PRE-PRODUCTION.md` | ver #6 |
| 13 | **A retenção de log da plataforma nunca foi conferida.** O passo existe em `docs/PRE-PRODUCTION.md:296-298`, **sem prazo escrito** — o próprio documento registra que nenhuma fonte com data foi consultada. É também o item 5, parcial, do corte de `audit-log` | `PRE-PRODUCTION.md` §11 | ~5 min |
| 14 | 🆕 **O item de reabertura do consentimento no `ProfileDropdown` nunca foi visto num browser.** Sem JDK 21 os emuladores do Firebase não sobem na máquina do ciclo, e não houve como autenticar. Coberto por teste jsdom (`apps/app/__tests__/profileDropdownCookieConsent.test.tsx`), não por passe visual | *(só neste arquivo)* | ~2 min com emulador de pé |

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | Mantém o argumento da rodada anterior. A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Deixou de ser "adotar observabilidade" e virou "ligar um fio de esforço P". Depende da decisão nº 1 de [Precisam de decisão](#precisam-de-decisão). |
| **Registro auditável de consentimento** | — | 🆕 Explicitamente fora do corte de `cookie-consent`, arquivada. Prova de consentimento é obrigação do controlador e hoje a escolha vive só no navegador do titular. Herdado por `audit-log` (#2) ou por `data-rights-lgpd` (#4) — as duas têm onde acomodar, e nenhuma o declarou ainda. |
| **CMP certificada de terceiro · TCF do IAB · geolocalização do visitante** | — | Fora do corte de `cookie-consent`, arquivada. As duas primeiras arrastam serviço pago para todo fork; a terceira parece economia e é fonte de bug e de dúvida jurídica. |
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
| Emular Cloud Storage · testes de security rules · promover admin pela UI | — | Fora do corte de `firebase-emulator-seed`, arquivada. Os testes de rules foram herdados por [`e2e-testing`](e2e-testing.md) (#6). |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Explicitamente fora do corte de `observability-logging`. A nota de pesquisa registra o conflito entre Sentry v8+ e `@vercel/otel`, que quebra a propagação de trace em silêncio — má primeira dívida para um MVP. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional que manter no core. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estavam no "fora do corte" de `ci-pipeline` porque dependiam de um CI verde e estável. O pré-requisito está satisfeito há três rodadas. Reavaliar junto com o branch protection. |
| Remote Cache do Turbo | prática 1 | É a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição, e como opt-in por variável ausente. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **10** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois. Cruza com `e2e-testing` (#6). |
| Changesets / versionamento · Storybook | — | Com pacotes `private: true` e forks que divergem, o valor do changelog não paga o processo. O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
</content>
