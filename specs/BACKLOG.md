# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção **Entregues** abaixo. Ciclo de vida: [`README.md`](README.md).

> **Última auditoria:** 2026-08-31 (`/spec --sync`) · **rodada de origem:** semeadura inicial (2026-08-21).
>
> **Resultado da auditoria de 2026-08-31:** **a primeira spec foi entregue e arquivada.**
> [`firestore-admin-access`](../docs/features/firestore-admin-access/spec.md) teve os **5 itens do corte de
> MVP** conferidos um a um no código e saiu de `specs/`. O que fechou os dois sinais de pronto que estavam
> bloqueados foi a publicação das security rules: a leitura REST direta da coleção `entity` com a chave
> pública passou de **HTTP 200 com dado real** (medido em 2026-08-30) para **HTTP 403**, e a aplicação segue
> funcionando ponta a ponta com o `deny-all` no ar.
>
> Efeito em cascata: **três specs saíram de bloqueadas** — `cursor-pagination`, `firebase-emulator-seed` e
> `audit-log` tinham `depends_on: [firestore-admin-access]`. Cinco specs tiveram o texto corrigido por
> deriva (ver [Deriva corrigida nesta auditoria](#deriva-corrigida-nesta-auditoria)) e a tabela de achados
> ganhou **4 entradas novas** vindas do pipeline, enquanto **2 foram resolvidas** pela própria entrega.
>
> **Fila `approved`:** [`ci-pipeline`](ci-pipeline.md) e [`api-hardening`](api-hardening.md), ambas sem
> `depends_on` e prontas para o `/analyze`. Nenhuma spec está `in-progress`.

## Contadores

Sobre as **18 specs que seguem em `specs/`** (a 19ª foi entregue e arquivada).

| status | qtd |
|--------|-----|
| `proposed` | 15 |
| `approved` | 2 |
| `in-progress` | 0 |
| `done` (arquivadas) | 1 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência (pendentes):** `produto` 8 · `dx` 5 · `confianca` 5.
**Por esforço (pendentes):** P 0 · M 15 · G 3.

**Fila de execução:** `ci-pipeline` → `api-hardening`. As duas são `approved`, não têm `depends_on` e podem
ir para o `/analyze` em paralelo — `ci-pipeline` não toca código de aplicação e `api-hardening` mexe na
borda (`proxy.ts`, `packages/security`), então não colidem.

⚠️ **Insumo novo para `ci-pipeline`:** desde a entrega do Admin SDK, `pnpm --filter api build` **exige** as
três `FIREBASE_ADMIN_*` (o `createEnv` de `apps/api/env.ts:12-16` valida eagerly e a rota de webhook o
importa). Qualquer job de build precisa das credenciais em secret, ou falha. Está registrado na spec.

## Ordem recomendada

A ordem respeita `depends_on` e prioriza o que **desbloqueia** e o que **fica mais caro depois**. A #1 e a
#2 estão **`approved`**; as demais seguem `proposed`. `teams-organizations` saiu da fila — está `deferred`
(ver [Fora da fila ativa](#fora-da-fila-ativa)).

| # | id | por que agora |
|---|----|---------------|
| 1 | [`ci-pipeline`](ci-pipeline.md) | Não existe `.github/`: nada é verificado automaticamente. Tudo que vier depois precisa de rede de segurança, e ela não custa serviço pago. **Ficou mais urgente:** a entrega anterior mostrou o gate manual em ação (baseline de `pnpm check` conferida à mão a cada etapa) e introduziu um build que depende de secret — exatamente o tipo de regressão que só o CI pega. |
| 2 | [`api-hardening`](api-hardening.md) | Buraco aberto **hoje**: CORS com `*` por padrão, CSP desligado e o middleware de headers existe no pacote sem ser usado por nenhum app. Esforço contido, sem dependência. O `apps/api/env.ts` deixou de ser vazio, então o lugar para tipar `CORS_ORIGIN` já existe. |
| 3 | [`transactional-emails`](transactional-emails.md) | Um único template, em inglês literal, fora do dicionário. Desbloqueia recuperação de senha e convites. |
| 4 | [`auth-recovery-verification`](auth-recovery-verification.md) | Commodity absoluta (10/10 no painel) e ausente. Um fork não pode ir a produção sem "esqueci minha senha". |
| 5 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | ✅ **Desbloqueada.** E o argumento **inverteu de sinal**: antes as rules nem podiam ser publicadas; agora estão publicadas em `deny-all` e **ninguém as testa** — a única prova que temos é um `curl` manual de uma auditoria. O ponto de conexão do emulador também ficou barato (`database.ts` tem 5 linhas e o Admin SDK lê `FIRESTORE_EMULATOR_HOST` do ambiente). **1 de 5 itens já entregue por fora** (bootstrap do admin), só contra projeto real. |
| 6 | [`cursor-pagination`](cursor-pagination.md) | ✅ **Desbloqueada.** Todo fork herda "ler a coleção inteira" por construção. O risco de escrever o mesmo código duas vezes acabou: o `BaseRepository` já está no Admin SDK, que é a API sobre a qual o cursor será escrito. Depois de haver dados em produção, a correção quebra contrato do SDK. |
| 7 | [`audit-log`](audit-log.md) | ✅ **Desbloqueada.** O painel **já tem impersonação** e nada registra quem entrou na conta de quem. A mutação sob impersonação já foi bloqueada (autorização); o **registro** continua inexistente. |
| 8 | [`cookie-consent`](cookie-consent.md) | O Google Analytics carrega hoje **sem qualquer consentimento prévio**. |
| 9 | [`file-upload-storage`](file-upload-storage.md) | Nenhuma integração de storage existe; desbloqueia avatar e anexos. |
| 10 | [`account-settings`](account-settings.md) | A sidebar tem 4 links de Settings apontando para `#`, e **todas** as rotas de usuário são admin-only: ninguém consegue editar a si mesmo. |
| 11 | [`billing-subscription`](billing-subscription.md) | ⚠️ A documentação descreve como pronto o que não existe (ver Achados). Monetização é 9/10 no painel. |
| 12 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel: 3/10 entregam, e é onde o usuário decide se fica. |
| 13 | [`observability-logging`](observability-logging.md) | Sem logger estruturado e sem coleta de erro. O gancho de instrumentação da API **passou a existir e a funcionar** (roda no boot), só não carrega observabilidade nenhuma — o custo de plugar caiu. |
| 14 | [`data-rights-lgpd`](data-rights-lgpd.md) | Obrigação legal com prazo. Depende da área de conta existir; fica mais cara a cada coleção nova. |
| 15 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel estão literalmente vazias — é a primeira tela de todo fork. |
| 16 | [`e2e-testing`](e2e-testing.md) | Rede de segurança automatizada. Só faz sentido com CI e emulador prontos (#1 e #5). |
| 17 | [`account-security-mfa`](account-security-mfa.md) | Prevalência baixa (MFA 3/10, sessões 1/10). Valor médio, mas fecha a superfície de autenticação. |

## Fora da fila ativa

Specs que não entram na ordem acima. Ficam em `specs/` como memória institucional — é o que impede o
`/spec` de repropor a mesma coisa na rodada seguinte.

| id | status | motivo |
|----|--------|--------|
| [`teams-organizations`](teams-organizations.md) | `deferred` (2026-08-22) | Esforço G e nenhum fork pediu escopo por organização. **A implementação foi adiada; a decisão, não** — ver a seção abaixo e o motivo registrado na spec. Reabrir exige argumento novo, tipicamente o primeiro fork B2B real. |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | `auth-recovery-verification`, `file-upload-storage` |
| [`api-hardening`](api-hardening.md) | Endurecimento da borda da API: headers/CSP, rate limit e CORS | confianca | alto | M | `approved` | — |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`auth-recovery-verification`](auth-recovery-verification.md) | Recuperação de senha e verificação de e-mail | produto | alto | M | `proposed` | `transactional-emails` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`ci-pipeline`](ci-pipeline.md) | Pipeline de CI no GitHub Actions | dx | alto | M | `approved` | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | `ci-pipeline`, `firebase-emulator-seed` |
| [`file-upload-storage`](file-upload-storage.md) | Upload de arquivos e storage | produto | alto | M | `proposed` | — |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | Emulador do Firebase, seed e primeiro admin | dx | alto | M | `proposed` | ✅ `firestore-admin-access` (entregue) |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `proposed` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | `transactional-emails` |
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
| CRUD de referência e usuários intactos, suíte verde | 105 testes verdes em `apps/api` (14 arquivos), rodados nesta auditoria; fluxos redirigidos no browser no `/develop`, `/review` e `/test` |
| Credenciais fora do código, env tipado, falha cedo | `apps/api/env.ts:12-16` (3 vars obrigatórias) · `packages/auth/keys.ts:18-32` (rejeita conjunto parcial) · `apps/api/instrumentation.ts:8-15` (falha de boot); nenhum `apiKey` hardcoded na `apps/api` |
| `deny-all` publicável sem quebrar a aplicação | `firestore.rules:32-34` publicado; leitura REST direta com a chave pública → **403** (era 200 com 1223 bytes em 2026-08-30); `/auth/me`, `GET /users?type=admin` e o CRUD `entity` seguem 200, sem `PERMISSION_DENIED` no log; runbook em `docs/SETUP.md:127-139` |
| Índices versionados | `firestore.indexes.json:2-11` (índice de `findByReferenceId`) + `.firebaserc` versionado |

As duas features já concluídas em `docs/features/` — `auth-panel-context` e `impersonation-read-only` —
**não nasceram de spec** e por isso não constam aqui: a primeira é correção de bug anterior à existência
desta pasta; a segunda saiu de um achado 🔴 desta mesma tabela de achados (já removido dela). O `spec: -`
no `STATE.md` das duas está correto — não é vínculo faltando.

## Deriva corrigida nesta auditoria

**Deriva** = o mundo mudou embaixo da spec. Nos cinco casos abaixo a **spec estava desatualizada** — a
entrega de `firestore-admin-access` reescreveu o código que elas citavam. A implementação não desviou de
plano nenhum: o texto das specs foi corrigido para refletir o código.

| id | o que a spec afirmava | o que o código mostra | ação |
|----|----------------------|------------------------|------|
| [`api-hardening`](api-hardening.md) | `apps/api/env.ts:14-16` declara `server: {}` | `env.ts:12-16` declara as três `FIREBASE_ADMIN_*` como obrigatórias | referência corrigida; **o achado de fundo continua válido** (`CORS_ORIGIN` segue lido de `process.env` em `proxy.ts:15`). Acrescentado o efeito no build |
| [`audit-log`](audit-log.md) | `apps/api/instrumentation.ts:1-2` está vazio | `:8-15` roda no boot e resolve o Firestore | texto corrigido: o gancho existe, mas nenhuma instrumentação de log passa por ele |
| [`observability-logging`](observability-logging.md) | `instrumentation.ts` é um **stub vazio** | idem acima | idem — e o custo de plugar observabilidade caiu, o que **fortalece** a spec |
| [`cursor-pagination`](cursor-pagination.md) | `findAll()` **ignora o `rowMapper`**; `firestore.indexes.json` vazio; acesso pelo client SDK em `dabatase.ts` | `findAll()` aplica o mapper (`base.repository.ts:44-46`); índices versionados; `database.ts` no Admin SDK | achado marcado como **resolvido**, refs de linha atualizadas, dependência marcada como satisfeita |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | conexão por client SDK com config hardcoded em `dabatase.ts`; rules que não podem ser publicadas | `database.ts:1-5`, 5 linhas, Admin SDK; rules **publicadas** em `deny-all` | texto corrigido; o argumento da spec **ficou mais forte** (rules no ar e não testadas) |

Verificado e **mantido**: o predicado de posse `row.userId !== ctx.subjectProfile.id` continua repetido
**3 vezes no mesmo arquivo** (`apps/api/app/(routes)/entities/[id]/route.ts:16,32,65`). A migração para o
Admin SDK passou ao lado da contrapartida (2) recomendada abaixo — como esperado, já que estava fora do
corte.

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

Sem as duas, adiar é só acumular juros. Detalhes e alternativas na própria spec. **Nenhuma das duas foi
feita até 2026-08-31** — os juros seguem correndo.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados durante a descoberta e durante o pipeline. **Não são
funcionalidades** — são correções pontuais, algumas de minutos. Registrados aqui para não se perderem;
viram tarefa direta no `/analyze`, sem passar por spec.

> **Auditoria de 2026-08-31:** **2 achados foram resolvidos** pela entrega de `firestore-admin-access` e
> saíram da tabela — o `findAll()` que ignorava o `rowMapper` (hoje aplica, `base.repository.ts:44-46`) e o
> typo `dabatase.ts` (hoje `database.ts`, sem referência remanescente no código). **4 achados novos**
> entraram, vindos do `/develop`, `/review` e `/test`; todos foram reconferidos no código antes de serem
> escritos aqui. Os demais seguem válidos.

Os três primeiros são de **segurança** e foram confirmados diretamente no código — valem revisão antes de
qualquer spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token.** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts:24` tenta o bearer ID token **antes** do cookie — que, esse sim, usa `verifySessionCookie(..., true)` (`:193`) | `packages/auth/server.ts` · `apps/api/(shared)/lib/resolve-api-actor.ts` | Depois de revogar as sessões, um ID token já emitido continua passando no guard da API até expirar (1 hora). A base está metade correta — e é a metade errada que vem primeiro. |
| 🔴 **`CORS_ORIGIN` fora do env tipado, com coringa por padrão** — lido direto de `process.env` e caindo em `"*"` | `apps/api/proxy.ts:15` | Viola a regra de env tipado do repo, e é a causa de o coringa sobreviver em produção sem ninguém notar. **O `apps/api/env.ts` deixou de ser vazio em 2026-08-31**: o lugar certo para a variável agora existe. Escopo de `api-hardening`. |
| 🔴 **Perfil duplicado a cada login com Google.** `ensureDefaultUserProfile` é chamado **incondicionalmente** (`apps/api/app/(routes)/auth/sign-in/google/route.ts:19`) e o helper (`(shared)/lib/user-merge.ts:47-55`) faz `userRepository.create()` direto, **sem procurar perfil existente** — ao contrário de `getMergedUserByUid:19-23` e `getMergedUserFromIdToken:38-42`, que só criam quando `findByReferenceId` volta nulo | `apps/api/app/(routes)/auth/sign-in/google/route.ts` · `apps/api/(shared)/lib/user-merge.ts` | Cada login Google grava um documento novo na coleção `user` para o mesmo UID. **Pré-existente e fora do diff entregue** (a rota não foi tocada pela migração), encontrado durante o pipeline. Correção provável de uma linha: chamar `getMergedUserByUid`, que já é chamado logo em seguida (`:20`) e já trata o caso. |
| 🟡 **O código trata `isRateLimit()` sem que nenhuma regra de rate limit seja registrada** | `packages/security/index.ts:44` | Dá a impressão de já limitar. Some-se a isso: `apps/api` **não declara** `@repo/security` como dependência, e `sign-in`/`sign-up` são `POST` sem guard nem limite. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. Escopo do primeiro: o helper hoje só grava `x-locale` (`LanguageSwitcher.tsx:64`), **não** o cookie de sessão — severidade menor que a citação sugere. O guard de origem é defesa em profundidade declarada, mas a porta aberta merece decisão explícita. |
| ⚠️ Documentação descreve como **implementado** um fluxo de pagamentos que **não existe**: rotas `/payments/*`, `UserDTO.subscription`, `userRepository.updateSubscriptionByReferenceId`, `apiClient.payments.*`, tela "Minha assinatura" e eventos de webhook que o código não roteia | `docs/PAYMENTS.md:8-12` (`docs/SECURITY.md` diz o **oposto**, e está certo) | É a pior classe de erro de documentação: mente com aparência de autoridade. Dos **6 itens** da seção "Estado atual (implementado)", só o **primeiro** (`:7`, o client `stripe` + `paymentsAgentToolkit`) é verdadeiro. Corrigir a doc **independe** de implementar a spec. Reconferido em 2026-08-31: segue mentindo. |
| ⚠️ **`docs/SETUP.md:5` afirma que os `.env.example` refletem "apenas as vars usadas por este fork" e que as chaves do upstream next-forge "foram removidas". Não foram.** | `apps/api/.env.example:10-33` (Clerk ×7, `DATABASE_URL`, BetterStack, Svix, Liveblocks, BaseHub, Knock ×2) · `apps/app/.env.example:2-38` (idem + Knock público) · `apps/web/.env.example:4` (`DATABASE_URL`) | **Mesma classe do achado do `docs/PAYMENTS.md`**: a doc afirma uma limpeza que não aconteceu. Quem clona copia o `.env.example` e preenche variáveis de serviços que este fork não usa — ou, pior, presume que a lista é a lista real. Correção é minutos: ou limpar os arquivos, ou corrigir a frase. |
| **`update()` do `BaseRepository` reescreve o documento inteiro e corrompe o tipo de `createdAt`.** `:102-117` faz read-modify-write: lê via `findById()` (que passa pelo mapper e devolve `createdAt` **serializado como string ISO**), faz spread sobre o payload e grava tudo de volta com `docRef.update()`. Depois do primeiro `PUT`, o campo deixa de ser `Timestamp` no Firestore e vira `String` | `apps/api/(shared)/repositories/base.repository.ts:102-117` | ⚠️ **Preservado de propósito** na entrega de `firestore-admin-access` (decisão do usuário: manter a migração *contract-preserving*, sem mudança de comportamento). **Não é defeito da feature — é dívida herdada, agora documentada e coberta por teste.** Consequências: consulta por range/`orderBy` em `createdAt` mistura tipos e o índice não ordena como se espera; e o `update()` custa uma leitura extra por escrita. Cruza diretamente com `cursor-pagination` (que precisa de `orderBy` estável). |
| **`userRepository.list()` mente no tipo de retorno**: declara `Promise<UserDTO[]>` (`user.repository.ts:32`) mas devolve o merge com o Firebase Auth, que é `UserWithAuthDTO` — o cast acontece dentro de `mergeWithAuthUser` (`:56`, `as UserDTO`) | `apps/api/(shared)/repositories/user.repository.ts:32,52-63` | O SDK **já declara o tipo certo** (`packages/sdk/src/actions/user/user/action.ts:21` → `UserWithAuthDTO[]`), então a mentira está só no repositório — e obrigou o teste a fazer cast para ler o campo (`apps/api/__tests__/baseRepository.test.ts:406`). Cast em teste para contornar tipo errado de produção é sintoma, não solução. |
| `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais | `apps/api/(shared)/repositories/base.repository.ts:128` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. |
| Webhook da Stripe roteia `subscription_schedule.canceled` (a doc afirma `customer.subscription.updated\|deleted`), os dois handlers são stubs `// TODO` e o `customerId` extraído é variável morta | `apps/api/app/(routes)/webhooks/payments/route.ts:8-22,24-34,57,61` | Assinatura é validada (`:50`), nada é persistido. A variável morta escapando do `noUnusedVariables: error` (`biome.jsonc:20`) sugere que o arquivo não é coberto pelo lint. |
| `package.json` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth/package.json:12` | Export quebrado. Reconferido em 2026-08-31: o arquivo continua não existindo. |
| Referencia chaves PostHog que não existem em `keys.ts`, com dependência **não instalada** | `packages/analytics/server.ts` | Código morto que não compila se for chamado. |
| `chart.tsx` é código morto — `recharts` pesa no bundle sem nenhum uso real | `packages/design-system` | Custo sem contrapartida. |
| `photo` é `z.string().trim().max(PHOTO_URL_MAX)` — qualquer texto passa, não é URL validada, nos **dois** schemas (create e update). O front **valida** como URL (`entityFormSchema.ts:48-59`), a API não | `apps/api/(shared)/validation/entity.schema.ts:23,34` | Bug latente, não flexibilidade — e validação que só existe no navegador é exatamente o anti-padrão que a regra de ouro 4 proíbe. |
| String `"Home"` literal fora do dicionário nas duas home pages | `apps/app/.../(pages)/page.tsx` | Viola a regra de ouro 2. |
| `useHealthCheck` usa `useQuery` direto, contra a convenção do escopo | `apps/app/shared/hooks/useHealthCheck.ts` | Viola `apps/app/CLAUDE.md`. |
| Arquivo órfão sem exports | `apps/app/midd_teste.ts` | Resíduo. Agora é a **única** violação de `useFilenamingConvention` no repo. Reconferido em 2026-08-31: continua lá. |
| 🟡 `hydration mismatch` num `id` gerado pelo Radix (`DropdownMenuTrigger`) + aviso "Select is changing from uncontrolled to controlled" | `apps/app/.../PanelNavbarControls.tsx` | Aparecem no console já em `/pt-br/admin`, sem interação. Contradizem a regra do escopo de resolver no servidor todo estado de UI persistido no browser. |

### Higiene pendente do pipeline de `firestore-admin-access`

Não é achado de código, mas some do radar se não ficar escrito: o projeto Firebase de desenvolvimento
ficou com **dados de teste** criados pelas etapas `/develop`, `/review` e `/test` — contas
`qa-admin@example.com`, `qa-common@example.com` e `qa-review-common@example.com`, mais algumas entidades de
snapshot (uma soft-deleted). Sem PII real e sem senha gravada em arquivo. Limpar ao fechar o pipeline.

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
| Renovate/Dependabot · preview deploy por PR · orçamento de performance | práticas 13, 14 e 18 | Estão no **"fora do corte" de `ci-pipeline`** de propósito: dependem de um CI verde e estável para não virarem ruído. Entram na rodada seguinte. |
| Changesets / versionamento | opcional-forte | Com pacotes `private: true` e forks que divergem, o valor seria só o changelog. Não paga o processo agora. |
| Storybook | não apareceu no painel | O `playground` já serve de catálogo vivo dos componentes. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork, não do core. |
