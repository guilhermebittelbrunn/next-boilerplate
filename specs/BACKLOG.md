# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção **Entregues** abaixo. Ciclo de vida: [`README.md`](README.md).

> **Última auditoria:** 2026-09-01 (`/spec --sync`) · anterior: 2026-08-31 · **rodada de origem:**
> semeadura inicial (2026-08-21).
>
> **Resultado da auditoria de 2026-09-01: nenhuma spec foi arquivada, e isso é a conclusão, não a falha.**
> [`ci-pipeline`](ci-pipeline.md) passou por `/analyze → /develop → /review → /test` e **3 dos 5 itens do
> corte de MVP estão cumpridos no código**, com os números reconferidos nesta auditoria (não copiados do
> relatório): `pnpm check` **392 arquivos, 0 erros / 0 warnings** · `turbo run lint typecheck test --force`
> **21/21** · `pnpm test` **7 tasks / 331 testes** · `turbo run typecheck --force` **13/13**.
>
> **A spec permanece `in-progress`.** Duas razões, detalhadas em
> [Por que `ci-pipeline` não fechou](#por-que-ci-pipeline-não-fechou): o código **não está commitado** (~141
> entradas no working tree, zero commits, por decisão do usuário de aprovar os commits no final) e, mais
> importante, **o mecanismo de bloqueio não está ligado** — o item 2 do corte exige falha "bloqueando o
> merge", e o que existe é um workflow que **sinaliza** mais um runbook instruindo um humano a ligar a
> branch protection.
>
> A tabela de achados teve **4 entradas removidas** por resolução confirmada no código e **8 acrescentadas**
> vindas do pipeline, todas reconferidas antes de serem escritas aqui. **Uma remoção é uma autocorreção
> desta auditoria**: o achado do `docs/SETUP.md` estava marcado como "reconferido em 2026-08-31, segue
> mentindo" e **não estava** — ver [Correção da auditoria anterior](#correção-da-auditoria-anterior).
> Cinco specs tiveram o texto corrigido por deriva.
>
> **Fila `approved`:** [`api-hardening`](api-hardening.md), sem `depends_on` e pronta para o `/analyze`.

## Contadores

Sobre as **18 specs que seguem em `specs/`** (a 19ª foi entregue e arquivada em 2026-08-31).

| status | qtd |
|--------|-----|
| `proposed` | 15 |
| `approved` | 1 |
| `in-progress` | 1 |
| `done` (arquivadas) | 1 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência (em `specs/`):** `produto` 8 · `dx` 5 · `confianca` 5.
**Por esforço (em `specs/`):** P 0 · M 15 · G 3.

**Fila de execução:** `ci-pipeline` está **fora da fila do `/analyze`** — não porque acabou, mas porque o
que falta nela é ação humana (commitar, abrir PR, ligar branch protection). A próxima a virar tarefa é
`api-hardening`.

## Por que `ci-pipeline` não fechou

O corte de MVP, conferido item a item **no working tree** (o `HEAD` não tem nada disso):

| item do corte | evidência | veredito |
|---------------|-----------|----------|
| PR e push na principal disparam verificação | `.github/workflows/ci.yml:3-6` (`on: pull_request` + `push: branches: [main]`); job `verify` em `:13-14` | ✅ no código |
| Cobre lint + tipos de todos os workspaces + testes, **falhando o merge** | `ci.yml:33` → `pnpm turbo run lint typecheck test`. Cobre e falha (os 4 defeitos deliberados derrubam o gate, provado local e dentro do `act`). **Não bloqueia** | ⚠️ **parcial** |
| `lint` e `typecheck` viram tasks do turbo | `turbo.json:7-10` (`//#lint`, task da raiz, precedente `//#clean`) e `:11-15` (`typecheck`, `dependsOn: []`), ambas `outputs: []` | ✅ |
| Envs das tasks declaradas | `env: []` em `//#lint` (`:9`), `typecheck` (`:14`) e `test` (`:28`); `globalDependencies` inclui `**/.env` (`:3`) | ⚠️ **parcial** — `envMode: loose` (`:5`) segue global e `build` (`:16-25`) não declara env (decisão Q7, rota A) |
| `apps/web` entra na suíte | `apps/web/package.json:10`, `apps/web/vitest.config.mts` (`environment: "node"`), `__tests__/seo.test.ts` — **15 testes verdes** | ✅ |

Sinais de pronto (`ci-pipeline.md:100-104`): o do **comando único** (local = CI) e o do **clone limpo sem
segredo** estão fechados — o workflow tem **zero** ocorrências de `secrets` e `build` ficou fora do corte.
O da **PR vermelha sem ninguém rodar nada** está fechado *localmente* e nunca foi observado numa PR real.

**A decisão de status, explicitada.** Marcar `done` afirmaria que merges são bloqueados quando nada
bloqueia. Um runbook (`docs/SETUP.md:122-133`) é uma instrução para um humano, não um mecanismo — e
"documentação não é evidência" é regra da própria `/spec-audit`. Seria exatamente a classe de mentira que
a linha do `docs/PAYMENTS.md` nesta tabela de achados registra: um documento afirmando uma capacidade que
o código não tem. Cometê-la no backlog, na auditoria cujo trabalho é pegá-la, tornaria o loop inútil.
Some-se a isso que um `ci.yml` que nunca chegou ao remoto nunca rodou no GitHub — para a plataforma, o
arquivo não existe.

Isso **não** é um juízo sobre a qualidade do trabalho: a engenharia está feita e medida. É que a régua da
própria spec tem dois passos restantes, os dois humanos.

**O que fecha:** (1) aprovar os 29 commits e commitar · (2) `git push -u origin ci/feat/github-actions-pipeline`
e abrir a PR · (3) ver o check `verify` vermelho/verde na PR · (4) executar o runbook de
`docs/SETUP.md:122-133`, exigindo `verify` como status check obrigatório em `main` · (5) rodar `/spec --sync`
de novo → `done` + arquivar em `docs/features/ci-pipeline/spec.md`. **Só o passo 4 troca "sinaliza" por
"bloqueia".**

## Ordem recomendada

A ordem respeita `depends_on` e prioriza o que **desbloqueia** e o que **fica mais caro depois**.

| # | id | por que agora |
|---|----|---------------|
| — | [`ci-pipeline`](ci-pipeline.md) | 🚧 **`in-progress`, fora da fila do `/analyze`.** O que falta é humano, não técnico: commitar, abrir a PR e ligar a branch protection. Ver a seção acima. |
| 1 | [`api-hardening`](api-hardening.md) | Buraco aberto **hoje**, reconferido nesta auditoria: `apps/api/proxy.ts:15` responde `Access-Control-Allow-Origin` com `process.env.CORS_ORIGIN ?? "*"`, o CSP segue desligado (`packages/security/middleware.ts:14`), o middleware de headers **não é usado por nenhum app**, e a `apps/api` **sequer declara** `@repo/security`. Dois argumentos ficaram mais fortes: (a) `firestore-admin-access` fechou, então trancar a porta deixou de ser paliativo — a parede está de pé; (b) agora existe gate automático, e CSP/CORS são exatamente o tipo de coisa que regride em silêncio num arquivo que ninguém reabre. |
| 2 | [`transactional-emails`](transactional-emails.md) | Um único template, em inglês literal, fora do dicionário. Desbloqueia recuperação de senha e convites. |
| 3 | [`auth-recovery-verification`](auth-recovery-verification.md) | Commodity absoluta (10/10 no painel) e ausente. Um fork não pode ir a produção sem "esqueci minha senha". |
| 4 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | Desbloqueada desde 2026-08-31, e o argumento **inverteu de sinal**: antes as rules nem podiam ser publicadas; agora estão publicadas em `deny-all` e **ninguém as testa** — a única prova é um `curl` manual de uma auditoria. **Subiu de importância com o CI**: é a peça que falta para qualquer verificação automática tocar o banco, e é a segunda dependência de `e2e-testing`. |
| 5 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira" por construção. O `BaseRepository` já está no Admin SDK, que é a API sobre a qual o cursor será escrito. Depois de haver dados em produção, a correção quebra contrato do SDK. |
| 6 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem. A mutação sob impersonação já foi bloqueada; o **registro** continua inexistente. |
| 7 | [`cookie-consent`](cookie-consent.md) | O Google Analytics carrega hoje **sem qualquer consentimento prévio**. |
| 8 | [`file-upload-storage`](file-upload-storage.md) | Nenhuma integração de storage existe; desbloqueia avatar e anexos. |
| 9 | [`account-settings`](account-settings.md) | A sidebar tem 4 links de Settings apontando para `#`, e **todas** as rotas de usuário são admin-only: ninguém consegue editar a si mesmo. |
| 10 | [`billing-subscription`](billing-subscription.md) | ⚠️ A documentação descreve como pronto o que não existe (ver Achados). Monetização é 9/10 no painel. **Pré-requisito barato:** o 🔴 de `packages/payments/ai.ts` (abaixo) explode no primeiro fork que importar o pacote — e é esta spec que faria alguém importar. |
| 11 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel: 3/10 entregam, e é onde o usuário decide se fica. |
| 12 | [`observability-logging`](observability-logging.md) | Sem logger estruturado e sem coleta de erro. **Um item do corte já caiu por tabela** (o código morto de analytics de servidor foi apagado), e o gancho de instrumentação da api funciona — o custo de plugar caiu de novo. |
| 13 | [`data-rights-lgpd`](data-rights-lgpd.md) | Obrigação legal com prazo. Depende da área de conta existir; fica mais cara a cada coleção nova. |
| 14 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel estão literalmente vazias — é a primeira tela de todo fork. |
| 15 | [`e2e-testing`](e2e-testing.md) | 🔒 **Segue bloqueada.** Ver [Dependências](#dependências-e-bloqueios) — o gargalo agora é `firebase-emulator-seed` (#4), não mais o CI. |
| 16 | [`account-security-mfa`](account-security-mfa.md) | Prevalência baixa (MFA 3/10, sessões 1/10). Valor médio, mas fecha a superfície de autenticação. |

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-09-01 |
|------|--------------|------------------------|
| [`e2e-testing`](e2e-testing.md) | `ci-pipeline`, `firebase-emulator-seed` | 🔒 **bloqueada por ambas.** `ci-pipeline` está `in-progress`, não `done`; `firebase-emulator-seed` segue `proposed` e intocada. **Mesmo quando o CI fechar, o gargalo continua sendo o emulador** — sem ele os testes escreveriam num Firebase real, disputando dados entre execuções. Há um segundo laço a notar: o item 2 do corte de `e2e-testing` também diz "bloqueiam o merge quando quebram", e herda **a mesma** pendência de branch protection. Ligar a proteção uma vez resolve para as duas specs. |
| [`audit-log`](audit-log.md) · [`cursor-pagination`](cursor-pagination.md) · [`firebase-emulator-seed`](firebase-emulator-seed.md) | `firestore-admin-access` | ✅ satisfeita (entregue em 2026-08-31) |
| [`account-settings`](account-settings.md) | `auth-recovery-verification`, `file-upload-storage` | 🔒 bloqueada — nenhuma das duas entregue |
| [`account-security-mfa`](account-security-mfa.md) | `account-settings` | 🔒 bloqueada em cadeia |
| [`data-rights-lgpd`](data-rights-lgpd.md) | `account-settings` | 🔒 bloqueada em cadeia |
| [`auth-recovery-verification`](auth-recovery-verification.md) · [`teams-organizations`](teams-organizations.md) | `transactional-emails` | 🔒 bloqueada — é o que põe `transactional-emails` em #2 |

## Fora da fila ativa

Specs que não entram na ordem acima. Ficam em `specs/` como memória institucional — é o que impede o
`/spec` de repropor a mesma coisa na rodada seguinte.

| id | status | motivo |
|----|--------|--------|
| [`teams-organizations`](teams-organizations.md) | `deferred` (2026-08-22) | Esforço G e nenhum fork pediu escopo por organização. **A implementação foi adiada; a decisão, não** — ver a seção abaixo e o motivo registrado na spec. Reabrir exige argumento novo, tipicamente o primeiro fork B2B real. |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | 🔒 `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | 🔒 `auth-recovery-verification`, `file-upload-storage` |
| [`api-hardening`](api-hardening.md) | Endurecimento da borda da API: headers/CSP, rate limit e CORS | confianca | alto | M | `approved` | — |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`auth-recovery-verification`](auth-recovery-verification.md) | Recuperação de senha e verificação de e-mail | produto | alto | M | `proposed` | 🔒 `transactional-emails` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`ci-pipeline`](ci-pipeline.md) | Pipeline de CI no GitHub Actions | dx | alto | M | **`in-progress`** | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | 🔒 `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | 🔒 `ci-pipeline`, `firebase-emulator-seed` |
| [`file-upload-storage`](file-upload-storage.md) | Upload de arquivos e storage | produto | alto | M | `proposed` | — |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | Emulador do Firebase, seed e primeiro admin | dx | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `proposed` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | 🔒 `transactional-emails` |
| [`transactional-emails`](transactional-emails.md) | E-mails transacionais traduzidos | produto | alto | M | `proposed` | — |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementaram. Mantidas aqui para que o índice
mostre entregue e pendente lado a lado.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../docs/features/firestore-admin-access/spec.md) |

**Evidência dos 5 itens do corte de MVP**, conferida no código em 2026-08-31 (não no `status` gravado):

| item do corte | evidência |
|---------------|-----------|
| Identidade de serviço no acesso ao Firestore | `apps/api/(shared)/infra/database.ts:1-5` (`getFirestoreAdmin()`); `base.repository.ts:3` tipa contra `firebase-admin/firestore`; **zero** import `firebase/*` restante na `apps/api`; `firebase` saiu do `package.json` |
| CRUD de referência e usuários intactos, suíte verde | 105 testes verdes em `apps/api` (14 arquivos) na época; **hoje 118 em 16 arquivos**, reconferidos em 2026-09-01 |
| Credenciais fora do código, env tipado, falha cedo | `apps/api/env.ts:12-16` (3 vars obrigatórias) · `packages/auth/keys.ts:18-32` (rejeita conjunto parcial) · `apps/api/instrumentation.ts:8-15` (falha de boot); nenhum `apiKey` hardcoded na `apps/api` |
| `deny-all` publicável sem quebrar a aplicação | `firestore.rules:32-34` publicado; leitura REST direta com a chave pública → **403** (era 200 com 1223 bytes em 2026-08-30); runbook em `docs/SETUP.md` |
| Índices versionados | `firestore.indexes.json:2-11` (índice de `findByReferenceId`) + `.firebaserc` versionado |

As duas features já concluídas em `docs/features/` — `auth-panel-context` e `impersonation-read-only` —
**não nasceram de spec** e por isso não constam aqui. O `spec: -` no `STATE.md` das duas está correto —
não é vínculo faltando. A terceira, `ci-pipeline`, tem `spec: ci-pipeline` no `STATE.md` e a spec ainda
viva em `specs/` — que é exatamente o estado correto de uma spec `in-progress`.

## Correção da auditoria anterior

A auditoria de 2026-08-31 registrou o achado do `docs/SETUP.md` com a nota **"Reconferido: segue
mentindo"**. Não seguia. Medido em 2026-09-01: `apps/api/.env.example`, `apps/app/.env.example` e
`apps/web/.env.example` têm **zero** ocorrências de `CLERK`, `DATABASE_URL`, `BETTERSTACK`, `SVIX`,
`LIVEBLOCKS`, `BASEHUB`, `KNOCK`, `FLAGS_SECRET` e `POSTHOG`. Os três arquivos foram limpos no commit
`3089d71` — ou seja, **já estavam corretos no `HEAD` quando o achado foi reafirmado**.

Fica registrado porque é o tipo de erro que a auditoria existe para não cometer: uma reconferência que não
reconferiu. O achado foi removido da tabela.

## Deriva corrigida nesta auditoria

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec. Nos
cinco casos abaixo **a spec estava errada ou desatualizada** — nenhuma implementação desviou de plano.

| id | o que a spec afirmava | o que o código mostra | ação |
|----|----------------------|------------------------|------|
| [`ci-pipeline`](ci-pipeline.md) | `:28` — "não há `vercel.json`" | **Existe nos três apps**: `apps/api/vercel.json`, `apps/app/vercel.json`, `apps/web/vercel.json`, os três com `ignoreCommand: node scripts/skip-ci.js` (`apps/web/scripts/skip-ci.js:5-8` pula o build em commit com `[skip ci]`); o da api tem ainda um `crons` para `/cron/keep-alive`. `.husky/` de fato não existe | texto corrigido. **Não muda o corte** — `vercel.json` governa deploy, não verificação. Vale como aviso para a prática 14 (preview deploy por PR), hoje fora do corte: o `ignoreCommand` já existe e terá de ser considerado |
| [`ci-pipeline`](ci-pipeline.md) | `:37` — suíte de **23 arquivos** Vitest | 44 arquivos / **331 testes** em 7 tasks | anotado como número histórico da descoberta, preservando a baseline que motivou a spec |
| [`e2e-testing`](e2e-testing.md) | 23 arquivos, três configs, `apps/web` **sem script de teste** | 7 tasks / 331 testes; `apps/web` na suíte com 15 testes de `seo.ts` | texto corrigido. **O argumento da spec não muda** — a lacuna nunca foi o número de testes unitários, e sim que nada exercita um fluxo de ponta a ponta. Acrescentado que nenhum componente da landing é renderizado por teste |
| [`billing-subscription`](billing-subscription.md) | `packages/payments/index.ts:5` — cliente `stripe` em escopo de módulo; refs do webhook em `:36`/`:50`/`:57`/`:61` | `getStripe()` em `:14-24`, devolvendo `null` sem chave; webhook em `:27`/`:43`/`:50`/`:54` | refs corrigidas + **consequência nova para a spec**: toda rota de pagamento precisa tratar o `null` |
| [`observability-logging`](observability-logging.md) | `packages/analytics/server.ts` está quebrado; `instrumentation-client.ts:1` é só um comentário | os **dois arquivos foram apagados** | achado marcado como resolvido e **um item do corte de MVP marcado como entregue por tabela** ("o código morto de analytics de servidor é removido") |
| [`api-hardening`](api-hardening.md) | "enquanto `firestore-admin-access` não fechar, endurecer a borda é trancar a porta de uma casa com a parede aberta" | `firestore-admin-access` fechou em 2026-08-31 | risco de ordem marcado como resolvido; acrescentado que o gate automático agora protege contra regressão silenciosa de CSP/CORS. Ref de `packages/payments/index.ts` atualizada |

Verificado e **mantido**: o predicado de posse `row.userId !== ctx.subjectProfile.id` continua repetido
**3 vezes no mesmo arquivo** (`apps/api/app/(routes)/entities/[id]/route.ts:16,32,65`).

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação. A pesquisa é
categórica: retrofitar escopo por organização é **reescrita, não refactor** (6/10 de prevalência, esforço
G, "a decisão mais cara de postergar"). A evidência local confirma — o predicado de posse
`row.userId !== subjectProfile.id` já aparece **3 vezes em um único arquivo**, para **um** recurso.

**Decidido em 2026-08-22:** a spec foi para `deferred` — adiar a implementação, **não** a decisão. O que
torna o adiamento honesto são duas contrapartidas de esforço P, que **não** dependem desta spec e valem
como tarefa direta no `/analyze`:

1. escrever em `docs/ARCHITECTURE.md` se este core é **B2B ou B2C por padrão** — hoje a resposta está
   implícita no código e ninguém a declarou;
2. concentrar o predicado de posse num ponto único de escopo, tirando-o dos handlers.

Sem as duas, adiar é só acumular juros. **Nenhuma das duas foi feita até 2026-09-01** — os juros seguem
correndo, agora há dez dias.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados durante a descoberta e durante o pipeline. **Não são
funcionalidades** — são correções pontuais, algumas de minutos. Registrados aqui para não se perderem;
viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-09-01:** **4 achados removidos** por resolução confirmada no código — o órfão
> `apps/app/midd_teste.ts` (apagado), `packages/analytics/server.ts` (apagado), a variável morta
> `customerId` do webhook (removida) e a afirmação sobre os `.env.example` do `docs/SETUP.md` (ver
> [Correção da auditoria anterior](#correção-da-auditoria-anterior)). A linha do webhook foi **reescrita**,
> não removida: os stubs e o roteamento continuam. **8 achados novos** entraram, vindos do `/develop`,
> `/review` e `/test`, **todos reconferidos no código antes de serem escritos aqui** — dois da lista
> original do pipeline foram reformulados por medição própria. Os demais seguem válidos e reconferidos.
>
> **Refutado por medição:** a linha anterior afirmava que o webhook da Stripe "não é coberto pelo lint",
> inferindo isso da variável morta que sobrevivia ao `noUnusedVariables: error`. O `/analyze` mediu: o
> Biome **reporta** os 2 `noUnusedVariables` naquele arquivo. Nunca houve buraco de cobertura — o que não
> existia era um **gate** que falhasse por causa disso. É precisamente a lacuna que `ci-pipeline` fecha.

Os quatro primeiros são de **segurança** e foram confirmados diretamente no código — valem revisão antes de
qualquer spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token.** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts:24` tenta o bearer ID token **antes** do cookie — que, esse sim, usa `verifySessionCookie(..., true)` (`:193`) | `packages/auth/server.ts` · `apps/api/(shared)/lib/resolve-api-actor.ts` | Depois de revogar as sessões, um ID token já emitido continua passando no guard da API até expirar (1 hora). A base está metade correta — e é a metade errada que vem primeiro. |
| 🔴 **`CORS_ORIGIN` fora do env tipado, com coringa por padrão** — `process.env.CORS_ORIGIN ?? "*"`, lido direto de `process.env` | `apps/api/proxy.ts:15` | Viola a regra de env tipado do repo, e é a causa de o coringa sobreviver em produção sem ninguém notar. O `apps/api/env.ts` deixou de ser vazio, então o lugar certo para a variável existe. Escopo de `api-hardening`. |
| 🔴 **Perfil duplicado a cada login com Google.** `ensureDefaultUserProfile` é chamado **incondicionalmente** (`apps/api/app/(routes)/auth/sign-in/google/route.ts:19`) e o helper (`(shared)/lib/user-merge.ts:47-55`) faz `userRepository.create()` direto, **sem procurar perfil existente** — ao contrário de `getMergedUserByUid:19-23` e `getMergedUserFromIdToken:38-42`, que só criam quando `findByReferenceId` volta nulo | `apps/api/app/(routes)/auth/sign-in/google/route.ts` · `apps/api/(shared)/lib/user-merge.ts` | Cada login Google grava um documento novo na coleção `user` para o mesmo UID. Correção provável de uma linha: chamar `getMergedUserByUid`, que já é chamado logo em seguida (`:20`) e já trata o caso. |
| 🔴 **`packages/payments/ai.ts:4-5` tem o defeito gêmeo do que o `ci-pipeline` corrigiu no `index.ts`**: `new StripeAgentToolkit({ secretKey: keys().STRIPE_SECRET_KEY \|\| "" })` em **escopo de módulo** | `packages/payments/ai.ts` | O mesmo padrão no `index.ts` deixava `api#build` **vermelho** (`Neither apiKey nor config.authenticator provided`, no *collect page data* de `/webhooks/payments`) e foi corrigido com `getStripe()` (`index.ts:14-24`). O `ai.ts` não explode hoje **só porque nada importa `@repo/payments/ai`** — explodiria no primeiro fork que importasse, e `billing-subscription` é justamente o que faria alguém importar. **Deixado de propósito**: o corte de `ci-pipeline` autorizava **uma única** mudança de código de produção. Correção de minutos, com o padrão já pronto ao lado. |
| 🟡 **Webhook da Stripe é casca.** Roteia só `checkout.session.completed` (`:50`) e `subscription_schedule.canceled` (`:54`) — a doc afirma `customer.subscription.updated\|deleted` — e os dois handlers (`:8`, `:18`) são stubs `// TODO` que checam `data.customer` e retornam sem persistir nada | `apps/api/app/(routes)/webhooks/payments/route.ts` | A assinatura **é** validada (`:43`); nada é persistido. Escopo de `billing-subscription`. *(A variável morta `customerId` que existia aqui foi removida em 2026-09-01, e a rota ganhou 11 testes.)* |
| 🟡 **O webhook da Stripe é inalcançável em desenvolvimento.** `apps/api/env.ts:23` usa `skipValidation: process.env.NODE_ENV === "development"`; com `skipValidation`, o `@t3-oss/env-nextjs` devolve **só o `runtimeEnv` local** e descarta as chaves vindas de `extends: [auth(), core(), email(), payments()]` (`:9`). Resultado: `env.STRIPE_WEBHOOK_SECRET` é `undefined` em `next dev` mesmo com a variável exportada | `apps/api/env.ts:9,23` · `apps/api/app/(routes)/webhooks/payments/route.ts:30` | O guard `if (!(stripe && env.STRIPE_WEBHOOK_SECRET))` cai sempre no ramo `"Not configured"` em dev. O `pnpm --filter api dev:with-stripe` existe para testar o webhook localmente e **não pode funcionar** — o fluxo que o script promete é inacessível. Cruza direto com `billing-subscription`. |
| 🟡 **O código trata `isRateLimit()` sem que nenhuma regra de rate limit seja registrada** | `packages/security/index.ts:44` | Dá a impressão de já limitar. Some-se a isso: `apps/api` **não declara** `@repo/security` como dependência, e `sign-in`/`sign-up` são `POST` sem guard nem limite. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. Escopo do primeiro: o helper hoje só grava `x-locale`, **não** o cookie de sessão — severidade menor que a citação sugere. O guard de origem é defesa em profundidade declarada, mas a porta aberta merece decisão explícita. |
| 🟡 **O TTL de 180 dias do cookie `x-locale` é letra morta.** O cliente grava com `expires`, mas na requisição seguinte `apps/web/proxy.ts:56,60` e `apps/app/proxy.ts:83,87` fazem `cookieStore.set("x-locale", …)` **sem `maxAge`**, rebaixando-o a cookie de sessão | `apps/web/proxy.ts` · `apps/app/proxy.ts` · `packages/shared/utils/helpers/cookies.ts` | Confirmado no browser durante o `/develop` (`expires = -1`). O idioma escolhido **não sobrevive ao fechamento do navegador**, ao contrário do que o código do cliente promete. Bug de produto silencioso: ninguém reclama, todo mundo reescolhe o idioma. |
| 🟡 **`permissions: contents: read` ausente no workflow** | `.github/workflows/ci.yml` | O `GITHUB_TOKEN` do job herda as permissões padrão do repositório em vez do mínimo necessário — o job só faz checkout e roda o gate. Recomendado pelo `/review` e reforçado pelo `/test`; **não aplicado** porque o YAML foi aprovado literalmente pelo usuário. 2 linhas de hardening num arquivo que **todo fork herda**. |
| **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`.** `:102-117` faz read-modify-write: lê via `findById()` (que passa pelo mapper e devolve `createdAt` **serializado como string ISO**), faz spread sobre o payload e grava tudo de volta com `docRef.update()`. Depois do primeiro `PUT`, o campo deixa de ser `Timestamp` no Firestore e vira `String` | `apps/api/(shared)/repositories/base.repository.ts:102-117` | ⚠️ **Preservado de propósito** na entrega de `firestore-admin-access` (decisão do usuário: migração *contract-preserving*). **Dívida herdada, documentada e coberta por teste.** Consequências: consulta por range/`orderBy` em `createdAt` mistura tipos e o índice não ordena como se espera; e o `update()` custa uma leitura extra por escrita. Cruza diretamente com `cursor-pagination` (que precisa de `orderBy` estável). |
| **`userRepository.list()` mente no tipo de retorno**: declara `Promise<UserDTO[]>` (`user.repository.ts:32`) mas devolve o merge com o Firebase Auth, que é `UserWithAuthDTO` — o cast acontece dentro de `mergeWithAuthUser` (`:56`, `as UserDTO`) | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | O SDK **já declara o tipo certo** (`packages/sdk/src/actions/user/user/action.ts:21` → `UserWithAuthDTO[]`), então a mentira está só no repositório — e obrigou o teste a fazer cast para ler o campo. Cast em teste para contornar tipo errado de produção é sintoma, não solução. |
| `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais | `apps/api/(shared)/repositories/base.repository.ts:128` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. |
| ⚠️ Documentação descreve como **implementado** um fluxo de pagamentos que **não existe**: rotas `/payments/*`, `UserDTO.subscription`, `userRepository.updateSubscriptionByReferenceId`, `apiClient.payments.*`, tela "Minha assinatura" e eventos de webhook que o código não roteia | `docs/PAYMENTS.md:5-12` (`docs/SECURITY.md` diz o **oposto**, e está certo) | É a pior classe de erro de documentação: mente com aparência de autoridade. Dos **6 itens** da seção "Estado atual (implementado)", só o **primeiro** é verdadeiro — e ele só ficou verdadeiro em 2026-09-01, quando o `/review` o reescreveu para descrever o `getStripe()`. Reconferido em 2026-09-01: `apps/api/app/(routes)/` tem **10 rotas** e nenhuma sob `payments/`; o SDK registra `application`, `auth`, `entity`, `user` e nada mais; `UserDTO` não tem `subscription`. Corrigir a doc **independe** de implementar a spec. |
| `package.json` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Export quebrado. Reconferido em 2026-09-01: o arquivo continua não existindo. |
| 🟡 **`@repo/auth` declara `next: 15.1.3`** contra `16.0.0` dos três apps | `packages/auth/package.json:24` | Origem do aviso `deprecated next@15.5.2` no `pnpm install`. Um pacote de **autenticação** resolvendo uma major diferente do runtime que o consome é risco desproporcional ao esforço de alinhar. |
| `chart.tsx` é código morto — `recharts` (`packages/design-system/package.json:31`) pesa no bundle sem nenhum uso real | `packages/design-system/components/ui/chart.tsx` | Custo sem contrapartida. |
| `photo` é `z.string().trim().max(PHOTO_URL_MAX)` — qualquer texto passa, não é URL validada, nos **dois** schemas (create `:23` e update `:34`). O front **valida** como URL (`entityFormSchema.ts:48-59`), a API não | `apps/api/(shared)/validation/entity.schema.ts:23,34` | Bug latente, não flexibilidade — e validação que só existe no navegador é exatamente o anti-padrão que a regra de ouro 4 proíbe. |
| 🟡 **Strings de UI soltas, fora do dicionário** — `"Switch language"` (`sr-only`) nos **dois** language switchers e `"Início"` + `href="/painel"` (rota em português, hardcoded) no breadcrumb | `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` · `apps/web/app/[locale]/components/header/language-switcher.tsx:68` · `apps/app/shared/components/ui/PageBreadcrumb.tsx:28,30` | Viola a regra de ouro 2. Agrava o caso do `sr-only`: é **exatamente** o texto que só o leitor de tela recebe, então fica sem tradução para quem mais depende dele. |
| String `"Home"` literal fora do dicionário nas duas home pages | `apps/app/…/(common)/(pages)/page.tsx:7` · `apps/app/…/(admin)/admin/(pages)/page.tsx:7` | Viola a regra de ouro 2. |
| `useHealthCheck` usa `useQuery` direto (`:29`), contra a convenção do escopo | `apps/app/shared/hooks/useHealthCheck.ts` | Viola `apps/app/CLAUDE.md`. |
| 🟡 **`setTimeout` sem cleanup** no `useEffect` do carrossel: `:24-38` agenda o avanço automático e **não devolve função de limpeza**, com `[api, current]` nas dependências — um timer é agendado a cada avanço e nenhum é cancelado na desmontagem | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Timer disparando depois da desmontagem chama `setCurrent` em componente morto. É a home da landing: o caminho mais percorrido do repo. |
| 🟡 **`hydration mismatch` num `id` gerado pelo Radix + aviso "Select is changing from uncontrolled to controlled"** | `apps/app/shared/components/ui/PanelNavbarControls.tsx` · `apps/app/shared/components/ui/Sidebar.tsx:96-154` | **Escopo ampliado em 2026-09-01** (o registro anterior citava só o `DropdownMenuTrigger`): o `Collapsible` do `GlobalSidebar` produz o mesmo mismatch, e o `GlobalSidebar` é montado pelos **dois** painéis (`(common)/sidebar.tsx:13` e `(admin)/admin/sidebar.tsx:13`). Ou seja, o aviso aparece em **toda carga do painel**, sem interação — não num canto do menu. Contradiz a regra do escopo de resolver no servidor todo estado de UI persistido no browser. |
| 🟡 **`turbo run` aborta na primeira falha** (`--continue=false` é o default), então uma PR com dois tipos de defeito mostra só o primeiro | `.github/workflows/ci.yml:33` | Medido no `/test`: com `@repo/internationalization#test` vermelho, as tasks de teste de `app`, `web` e `api` nem chegam a rodar (15 de 17 no cenário). É o comportamento correto, mas quem ler o log da PR verá "3 suítes não rodaram" e pode se confundir. `--continue` resolveria, ao custo de fazer o comando do CI divergir do local — daí ser achado, e não correção óbvia. |

### Higiene pendente dos pipelines

Não é achado de código, mas some do radar se não ficar escrito: o projeto Firebase de desenvolvimento
(`next-boilerplate-576d0`) acumulou **contas de QA** criadas pelas etapas de três pipelines —
`qa-admin@example.com`, `qa-common@example.com`, `qa-review-common@example.com` (de
`firestore-admin-access`) e `qa-ci-admin@example.com`, `qa-review-ci@example.com`,
`qa-common-ci@example.com` (de `ci-pipeline`). Sem PII real e sem senha gravada em arquivo. O dado de
teste do último pipeline **foi limpo pela própria UI** (a entidade `QA Entidade CI` foi criada, editada e
excluída); restam as contas. Limpar ao fechar os pipelines.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo — é isso que impede o backlog de
inchar a cada rodada.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| Notificações in-app + preferências | 3/10 | Esforço G se feito à mão (feed, badge, fan-out, digest); a referência do ecossistema terceiriza num serviço pago com chave obrigatória. Reavaliar quando houver um caso de fan-out real. |
| Command palette (⌘K) | 2/10 | Aparece em templates de dashboard, não em kits de SaaS. Barato, mas valor estético — não é diferencial de MVP. |
| Metering / limites de uso / créditos | 2/10 | Muito hype por causa de AI SaaS, mas é DIY sobre a Meters API em quase todo kit. Só faz sentido depois de `billing-subscription`. |
| Feature flags | 2/10 | Dá para viver com variável de ambiente num MVP; flag sem data de remoção vira dívida permanente. Reavaliar após `observability-logging`. |
| Waitlist / captura de lead | 2/10 | Alto valor **só** na fase pré-lançamento — é decisão do fork, não do core. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto **é** uma API. Webhook de saída bem-feito (HMAC, retry com backoff, DLQ) é esforço G. |
| Sessões e dispositivos gerenciáveis | 1/10 | Absorvido pelo corte de `account-security-mfa`. |
| Widget de feedback | 1/10 | Terceirizar é mais racional que manter no core. |
| Referral / afiliados | 0/10 | Nenhuma referência do painel entrega. A pesquisa classifica como discurso de blog; o mercado resolve com produto de terceiro. |
| SSO enterprise · SCIM | 0/10 | Território de provedor especializado. Só entra com o primeiro contrato enterprise — e aí não é mais boilerplate. |
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estão no **"fora do corte" de `ci-pipeline`** de propósito: dependem de um CI verde e estável para não virarem ruído. **Reavaliar assim que a branch protection estiver ligada** — é a condição que faltava. Nota para a prática 14: os três `vercel.json` já trazem `ignoreCommand`, o que muda o desenho do preview por PR. |
| Remote Cache do Turbo | prática 1 | Fora do corte de `ci-pipeline` (decisão Q3): é a única peça que arrasta conta e env, e o ganho só aparece com o CI estável. Entra quando doer, com medição — e como opt-in por variável ausente, no padrão do `ARCJET_KEY`. |
| Limiar de cobertura que bloqueia merge | prática 5 | Nenhuma das **7** configs de Vitest declara cobertura: não há número para discutir. Medir primeiro, gatear depois, e só em pastas críticas. Relatório por workspace **não soma** — exige consolidação na raiz. Cruza com `e2e-testing`, que traz a medição no corte. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
