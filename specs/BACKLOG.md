# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção **Entregues** abaixo. Ciclo de vida: [`README.md`](README.md).

> **Última auditoria:** 2026-08-22 (`/spec --sync`) · **rodada de origem:** semeadura inicial (2026-08-21).
> A semeadura foi maior que uma descoberta normal (o `README.md` calibra 6–12 specs): ela catalogou o
> acúmulo de um boilerplate inteiro. As próximas devem ser incrementais.
>
> **Resultado da auditoria de 2026-08-22:** as 19 specs foram conferidas item a item contra o código.
> **Nenhuma transição de status** — nada foi entregue, nenhuma spec foi arquivada. Uma **entrega parcial
> órfã** foi encontrada (`firebase-emulator-seed`, 1 de 5 itens) e três specs tiveram o texto corrigido por
> deriva. Detalhe em [Deriva corrigida nesta auditoria](#deriva-corrigida-nesta-auditoria).
>
> **Triagem de 2026-08-22:** as três specs sem dependência que desbloqueiam o resto foram aprovadas —
> [`firestore-admin-access`](firestore-admin-access.md), [`ci-pipeline`](ci-pipeline.md) e
> [`api-hardening`](api-hardening.md). [`teams-organizations`](teams-organizations.md) virou `deferred`
> (motivo na própria spec: adiar a implementação, **não** a decisão). As 15 restantes seguem `proposed`.
>
> **Em execução:** [`firestore-admin-access`](firestore-admin-access.md) entrou no pipeline em 2026-08-22
> (`in-progress` · [`docs/features/firestore-admin-access/`](../docs/features/firestore-admin-access/STATE.md)).

## Contadores

| status | qtd |
|--------|-----|
| `proposed` | 15 |
| `approved` | 2 |
| `in-progress` | 1 |
| `done` | 0 |
| `deferred` | 1 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 8 · `dx` 5 · `confianca` 6.
**Por esforço:** P 0 · M 16 · G 3.

**Fila de execução:** `firestore-admin-access` (**`in-progress`**) → `ci-pipeline` → `api-hardening`.
Nenhuma das três tem `depends_on`, então as duas restantes podem começar em paralelo — mas **não**
paralelize nada que toque `apps/api/(shared)/repositories/` enquanto a primeira estiver aberta.

## Ordem recomendada

A ordem respeita `depends_on` e prioriza o que **desbloqueia** e o que **fica mais caro depois**. A #1 está
**em execução**; a #2 e a #3 estão **`approved`** e podem ir para o `/analyze` já; as demais seguem
`proposed`. `teams-organizations` saiu da fila — está `deferred` (ver [Fora da fila ativa](#fora-da-fila-ativa)).

| # | id | por que agora |
|---|----|---------------|
| 1 | [`firestore-admin-access`](firestore-admin-access.md) | **Bloqueador da base.** A API acessa o Firestore por client SDK não autenticado, com as rules em `deny-all` — publicá-las hoje quebra a aplicação. Desbloqueia 3 specs e é pré-requisito de qualquer controle de autorização real. |
| 2 | [`ci-pipeline`](ci-pipeline.md) | Não existe `.github/`: nada é verificado automaticamente. Tudo que vier depois precisa de rede de segurança, e ela não custa serviço pago. |
| 3 | [`api-hardening`](api-hardening.md) | Buraco aberto **hoje**: CORS com `*` por padrão, CSP desligado e o middleware de headers existe no pacote sem ser usado por nenhum app. Esforço contido, sem dependência. |
| 4 | [`transactional-emails`](transactional-emails.md) | Um único template, em inglês literal, fora do dicionário. Desbloqueia recuperação de senha e convites. |
| 5 | [`auth-recovery-verification`](auth-recovery-verification.md) | Commodity absoluta (10/10 no painel) e ausente. Um fork não pode ir a produção sem "esqueci minha senha". |
| 6 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira" por construção. Depois de haver dados em produção, a correção quebra contrato do SDK. |
| 7 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | Sem emulador não há teste de rules — e sem seed, todo fork começa criando o primeiro admin na mão, no console. **1 de 5 itens já entregue por fora** (script de bootstrap do admin), só contra projeto real. |
| 8 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem. A mutação sob impersonação já foi bloqueada (autorização); o **registro** continua inexistente. |
| 9 | [`cookie-consent`](cookie-consent.md) | O Google Analytics carrega hoje **sem qualquer consentimento prévio**. |
| 10 | [`file-upload-storage`](file-upload-storage.md) | Nenhuma integração de storage existe; desbloqueia avatar e anexos. |
| 11 | [`account-settings`](account-settings.md) | A sidebar tem 4 links de Settings apontando para `#`, e **todas** as rotas de usuário são admin-only: ninguém consegue editar a si mesmo. |
| 12 | [`billing-subscription`](billing-subscription.md) | ⚠️ A documentação descreve como pronto o que não existe (ver Achados). Monetização é 9/10 no painel. |
| 13 | [`onboarding-flow`](onboarding-flow.md) | Maior desequilíbrio valor/prevalência do painel: 3/10 entregam, e é onde o usuário decide se fica. |
| 14 | [`observability-logging`](observability-logging.md) | `instrumentation.ts` vazio, sem logger estruturado. Quanto mais features, mais caro é depurar sem isso. |
| 15 | [`data-rights-lgpd`](data-rights-lgpd.md) | Obrigação legal com prazo. Depende da área de conta existir; fica mais cara a cada coleção nova. |
| 16 | [`dashboard-home`](dashboard-home.md) | As duas homes do painel estão literalmente vazias — é a primeira tela de todo fork. |
| 17 | [`e2e-testing`](e2e-testing.md) | Rede de segurança automatizada. Só faz sentido com CI e emulador prontos. |
| 18 | [`account-security-mfa`](account-security-mfa.md) | Prevalência baixa (MFA 3/10, sessões 1/10). Valor médio, mas fecha a superfície de autenticação. |

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
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | `firestore-admin-access` |
| [`auth-recovery-verification`](auth-recovery-verification.md) | Recuperação de senha e verificação de e-mail | produto | alto | M | `proposed` | `transactional-emails` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`ci-pipeline`](ci-pipeline.md) | Pipeline de CI no GitHub Actions | dx | alto | M | `approved` | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | `firestore-admin-access` |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | `ci-pipeline`, `firebase-emulator-seed` |
| [`file-upload-storage`](file-upload-storage.md) | Upload de arquivos e storage | produto | alto | M | `proposed` | — |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | Emulador do Firebase, seed e primeiro admin | dx | alto | M | `proposed` | `firestore-admin-access` |
| [`firestore-admin-access`](firestore-admin-access.md) | Acesso ao Firestore via Admin SDK e security rules aplicáveis | confianca | alto | M | `in-progress` | — |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `proposed` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `deferred` | `transactional-emails` |
| [`transactional-emails`](transactional-emails.md) | E-mails transacionais traduzidos | produto | alto | M | `proposed` | — |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementou. Mantidas aqui para que o índice
mostre entregue e pendente lado a lado.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| — | — | _nenhuma ainda_ |

As duas features já concluídas em `docs/features/` — `auth-panel-context` e `impersonation-read-only` —
**não nasceram de spec** e por isso não constam aqui: a primeira é correção de bug anterior à existência
desta pasta; a segunda saiu de um achado 🔴 desta mesma tabela de achados (já removido dela). O `spec: -`
no `STATE.md` das duas está correto — não é vínculo faltando.

## Deriva corrigida nesta auditoria

**Deriva** = o mundo mudou embaixo da spec. Nos três casos abaixo a **spec estava desatualizada** (a
implementação não desviou de plano nenhum), então o texto da spec foi corrigido para refletir o código.

| id | o que a spec afirmava | o que o código mostra | ação |
|----|----------------------|------------------------|------|
| [`audit-log`](audit-log.md) | `common-panel.ts` não bloqueia mutação sob impersonação; item em "Fora do corte" e pergunta em aberto sobre fechar isso | `apps/api/(shared)/lib/impersonation-read-only.ts:19-31` chamado pelos **dois** guards (`admin.ts:62`, `common-panel.ts:62`) | spec atualizada: o buraco de **autorização** está fechado; o corte de MVP (o **registro**) segue 100% pendente |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | não existe caminho de código para o primeiro admin | `apps/api/scripts/create-dev-admin.mjs` existe e é idempotente, mas **exige service account real** (`:31-46`) e não conhece emulador | item marcado como parcial; **entrega parcial órfã** sinalizada |
| [`teams-organizations`](teams-organizations.md) | `app/(guards)/` tem três arquivos, incluindo `auth.ts` | `auth.ts` foi removido em `e45669a`; sobraram `admin.ts:27` e `common-panel.ts:29` | referências corrigidas |

Verificado e **mantido**: o predicado de posse `row.userId !== ctx.subjectProfile.id` continua repetido
**3 vezes no mesmo arquivo** (`apps/api/app/(routes)/entities/[id]/route.ts:16,32,65`) — o refactor dos
guards passou ao lado da contrapartida (2) recomendada abaixo.

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

Sem as duas, adiar é só acumular juros. Detalhes e alternativas na própria spec.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados durante a descoberta. **Não são funcionalidades** — são correções
pontuais, algumas de minutos. Registrados aqui para não se perderem; viram tarefa direta no `/analyze`, sem
passar por spec.

Os três primeiros são de **segurança** e foram confirmados diretamente no código — valem revisão antes de
qualquer spec.

> **Reconferidos um a um em 2026-08-22:** os 16 achados **seguem válidos**; nenhum foi corrigido de
> tabela. As referências `arquivo:linha` foram reconferidas contra o `e45669a` e as imprecisas, ajustadas.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token.** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts:24` tenta o bearer ID token **antes** do cookie — que, esse sim, usa `verifySessionCookie(..., true)` (`:193`) | `packages/auth/server.ts` · `apps/api/(shared)/lib/resolve-api-actor.ts` | Depois de revogar as sessões, um ID token já emitido continua passando no guard da API até expirar (1 hora). A base está metade correta — e é a metade errada que vem primeiro. |
| 🔴 **`CORS_ORIGIN` fora do env tipado, com coringa por padrão** — lido direto de `process.env` e caindo em `"*"` | `apps/api/proxy.ts:15` (`apps/api/env.ts` declara `server: {}`) | Viola a regra de env tipado do repo, e é a causa de o coringa sobreviver em produção sem ninguém notar. |
| 🟡 **O código trata `isRateLimit()` sem que nenhuma regra de rate limit seja registrada** | `packages/security/index.ts:44` | Dá a impressão de já limitar. Some-se a isso: `apps/api` **não declara** `@repo/security` como dependência, e `sign-in`/`sign-up` são `POST` sem guard nem limite. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-70` | ASVS 5.0 L1 (3.3.1) exige `Secure`. Escopo do primeiro: o helper hoje só grava `x-locale` (`LanguageSwitcher.tsx:64`), **não** o cookie de sessão — severidade menor que a citação sugere. O guard de origem é defesa em profundidade declarada, mas a porta aberta merece decisão explícita. |
| ⚠️ Documentação descreve como **implementado** um fluxo de pagamentos que **não existe**: rotas `/payments/*`, `UserDTO.subscription`, `userRepository.updateSubscriptionByReferenceId`, `apiClient.payments.*`, tela "Minha assinatura" e eventos de webhook que o código não roteia | `docs/PAYMENTS.md:8-12` (`docs/SECURITY.md:51` diz o **oposto**, e está certo) | É a pior classe de erro de documentação: mente com aparência de autoridade. Dos **6 itens** da seção "Estado atual (implementado)", só o **primeiro** (`:7`, o client `stripe` + `paymentsAgentToolkit`) é verdadeiro. Corrigir a doc **independe** de implementar a spec. |
| `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais | `apps/api/(shared)/repositories/base.repository.ts:134-136` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. |
| Webhook da Stripe roteia `subscription_schedule.canceled` (a doc afirma `customer.subscription.updated\|deleted`), os dois handlers são stubs `// TODO` e o `customerId` extraído é variável morta | `apps/api/app/(routes)/webhooks/payments/route.ts:8-22,24-34,57,61` | Assinatura é validada (`:50`), nada é persistido. A variável morta escapando do `noUnusedVariables: error` (`biome.jsonc:20`) sugere que o arquivo não é coberto pelo lint. |
| `package.json` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth` | Export quebrado. |
| Referencia chaves PostHog que não existem em `keys.ts`, com dependência **não instalada** | `packages/analytics/server.ts` | Código morto que não compila se for chamado. |
| `chart.tsx` é código morto — `recharts` pesa no bundle sem nenhum uso real | `packages/design-system` | Custo sem contrapartida. |
| `findAll()` ignora o `rowMapper`, enquanto `findById()` e `create()` o aplicam | `apps/api/(shared)/repositories/base.repository.ts:45-54` (vs `:67-71`, `:95`) | As duas rotas de leitura produzem formatos diferentes. |
| `photo` é `z.string().trim().max(2048)` — qualquer texto passa, não é URL validada, nos **dois** schemas (create e update). O front **valida** como URL (`entityFormSchema.ts:48-59`), a API não | `apps/api/(shared)/validation/entity.schema.ts:23,34` | Bug latente, não flexibilidade — e validação que só existe no navegador é exatamente o anti-padrão que a regra de ouro 4 proíbe. |
| String `"Home"` literal fora do dicionário nas duas home pages | `apps/app/.../(pages)/page.tsx` | Viola a regra de ouro 2. |
| `useHealthCheck` usa `useQuery` direto, contra a convenção do escopo | `apps/app/shared/hooks/useHealthCheck.ts` | Viola `apps/app/CLAUDE.md`. |
| Arquivo órfão sem exports | `apps/app/midd_teste.ts` | Resíduo. Agora é a **única** violação de `useFilenamingConvention` no repo. |
| 🟡 `hydration mismatch` num `id` gerado pelo Radix (`DropdownMenuTrigger`) + aviso "Select is changing from uncontrolled to controlled" | `apps/app/.../PanelNavbarControls.tsx` | Aparecem no console já em `/pt-br/admin`, sem interação. Contradizem a regra do escopo de resolver no servidor todo estado de UI persistido no browser. |
| Typo no nome do arquivo de infraestrutura (`dabatase.ts`) | `apps/api/(shared)/infra/` | Será renomeado junto com `firestore-admin-access`. |

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
