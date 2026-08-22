# Backlog de funcionalidades

Índice priorizado das specs em `specs/`. **Esta é a fonte da ordem**; o arquivo de cada spec é a fonte do
conteúdo. Contrato, statuses e frontmatter: [`README.md`](README.md).

`specs/` contém **apenas o que não foi entregue** — spec concluída é arquivada junto da feature e passa a
constar na seção **Entregues** abaixo. Ciclo de vida: [`README.md`](README.md).

> **Última auditoria:** 2026-08-21 · **rodada de origem:** semeadura inicial.
> Esta primeira rodada é maior que uma descoberta normal (o `README.md` calibra 6–12 specs): ela cataloga o
> acúmulo de um boilerplate inteiro. As próximas devem ser incrementais.
>
> Nenhuma spec foi aprovada ainda — **todas estão `proposed`**, à espera de triagem. Rode `/spec` para
> revisar e aprovar, ou `/spec --next` para uma recomendação com justificativa.

## Contadores

| status | qtd |
|--------|-----|
| `proposed` | 19 |
| `approved` | 0 |
| `in-progress` | 0 |
| `done` | 0 |
| `deferred` | 0 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 8 · `dx` 5 · `confianca` 6.
**Por esforço:** P 0 · M 16 · G 3.

## Ordem recomendada

A ordem respeita `depends_on` e prioriza o que **desbloqueia** e o que **fica mais caro depois**.

| # | id | por que agora |
|---|----|---------------|
| 1 | [`firestore-admin-access`](firestore-admin-access.md) | **Bloqueador da base.** A API acessa o Firestore por client SDK não autenticado, com as rules em `deny-all` — publicá-las hoje quebra a aplicação. Desbloqueia 3 specs e é pré-requisito de qualquer controle de autorização real. |
| 2 | [`ci-pipeline`](ci-pipeline.md) | Não existe `.github/`: nada é verificado automaticamente. Tudo que vier depois precisa de rede de segurança, e ela não custa serviço pago. |
| 3 | [`api-hardening`](api-hardening.md) | Buraco aberto **hoje**: CORS com `*` por padrão, CSP desligado e o middleware de headers existe no pacote sem ser usado por nenhum app. Esforço contido, sem dependência. |
| 4 | [`transactional-emails`](transactional-emails.md) | Um único template, em inglês literal, fora do dicionário. Desbloqueia recuperação de senha e convites. |
| 5 | [`auth-recovery-verification`](auth-recovery-verification.md) | Commodity absoluta (10/10 no painel) e ausente. Um fork não pode ir a produção sem "esqueci minha senha". |
| 6 | [`cursor-pagination`](cursor-pagination.md) | Todo fork herda "ler a coleção inteira" por construção. Depois de haver dados em produção, a correção quebra contrato do SDK. |
| 7 | [`firebase-emulator-seed`](firebase-emulator-seed.md) | Sem emulador não há teste de rules — e sem seed, todo fork começa criando o primeiro admin na mão, no console. |
| 8 | [`audit-log`](audit-log.md) | O painel **já tem impersonação** e nada registra quem entrou na conta de quem. É o recurso de maior risco do repo, hoje sem trilha. |
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
| 19 | [`teams-organizations`](teams-organizations.md) | **Decisão estratégica, não fila.** Ver a nota abaixo — o esforço é G, mas a *decisão* deveria ser tomada agora. |

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`account-security-mfa`](account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `proposed` | `account-settings` |
| [`account-settings`](account-settings.md) | Área de conta e preferências do usuário | produto | alto | M | `proposed` | `auth-recovery-verification`, `file-upload-storage` |
| [`api-hardening`](api-hardening.md) | Endurecimento da borda da API: headers/CSP, rate limit e CORS | confianca | alto | M | `proposed` | — |
| [`audit-log`](audit-log.md) | Trilha de auditoria de ações sensíveis | confianca | alto | M | `proposed` | `firestore-admin-access` |
| [`auth-recovery-verification`](auth-recovery-verification.md) | Recuperação de senha e verificação de e-mail | produto | alto | M | `proposed` | `transactional-emails` |
| [`billing-subscription`](billing-subscription.md) | Assinatura Stripe de ponta a ponta | produto | alto | M | `proposed` | — |
| [`ci-pipeline`](ci-pipeline.md) | Pipeline de CI no GitHub Actions | dx | alto | M | `proposed` | — |
| [`cookie-consent`](cookie-consent.md) | Consentimento de cookies e Consent Mode | confianca | alto | M | `proposed` | — |
| [`cursor-pagination`](cursor-pagination.md) | Paginação por cursor no BaseRepository e no SDK | dx | alto | M | `proposed` | `firestore-admin-access` |
| [`dashboard-home`](dashboard-home.md) | Home do painel com widgets | produto | médio | M | `proposed` | — |
| [`data-rights-lgpd`](data-rights-lgpd.md) | Direitos do titular: exportar dados e excluir conta | confianca | alto | G | `proposed` | `account-settings` |
| [`e2e-testing`](e2e-testing.md) | Testes E2E e acessibilidade automatizada | dx | médio | G | `proposed` | `ci-pipeline`, `firebase-emulator-seed` |
| [`file-upload-storage`](file-upload-storage.md) | Upload de arquivos e storage | produto | alto | M | `proposed` | — |
| [`firebase-emulator-seed`](firebase-emulator-seed.md) | Emulador do Firebase, seed e primeiro admin | dx | alto | M | `proposed` | `firestore-admin-access` |
| [`firestore-admin-access`](firestore-admin-access.md) | Acesso ao Firestore via Admin SDK e security rules aplicáveis | confianca | alto | M | `proposed` | — |
| [`observability-logging`](observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `proposed` | — |
| [`onboarding-flow`](onboarding-flow.md) | Onboarding pós-cadastro | produto | alto | M | `proposed` | — |
| [`teams-organizations`](teams-organizations.md) | Organizações, membros e convites | produto | alto | G | `proposed` | `transactional-emails` |
| [`transactional-emails`](transactional-emails.md) | E-mails transacionais traduzidos | produto | alto | M | `proposed` | — |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementou. Mantidas aqui para que o índice
mostre entregue e pendente lado a lado.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| — | — | _nenhuma ainda_ |

## A decisão que não pode esperar a fila

`teams-organizations` é a única spec cuja **decisão** custa mais que a implementação. A pesquisa é
categórica: retrofitar escopo por organização é **reescrita, não refactor** (6/10 de prevalência, esforço
G, "a decisão mais cara de postergar"). A evidência local confirma — o predicado de posse
`row.userId !== subjectProfile.id` já aparece **3 vezes em um único arquivo**, para **um** recurso.

Recomendação: **adiar a implementação, tomar a decisão agora**, com duas contrapartidas de esforço P que
tornam o adiamento honesto — (1) escrever se este core é B2B ou B2C por padrão; (2) parar de espalhar o
predicado de posse por handler, concentrando-o num ponto único de escopo. Sem elas, adiar é só acumular
juros. Detalhes e alternativas na própria spec.

## Achados da varredura que não viraram spec

Defeitos e inconsistências encontrados durante a descoberta. **Não são funcionalidades** — são correções
pontuais, algumas de minutos. Registrados aqui para não se perderem; viram tarefa direta no `/analyze`, sem
passar por spec.

Os três primeiros são de **segurança** e foram confirmados diretamente no código — valem revisão antes de
qualquer spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🔴 **Revogar sessão não derruba o ID token.** `verifyIdToken(token)` é chamado **sem o argumento de revogação** (`packages/auth/server.ts:123`), e `resolve-api-actor.ts:24` tenta o bearer ID token **antes** do cookie — que, esse sim, usa `verifySessionCookie(..., true)` (`:193`) | `packages/auth/server.ts` · `apps/api/(shared)/lib/resolve-api-actor.ts` | Depois de revogar as sessões, um ID token já emitido continua passando no guard da API até expirar (1 hora). A base está metade correta — e é a metade errada que vem primeiro. |
| 🔴 **`CORS_ORIGIN` fora do env tipado, com coringa por padrão** — lido direto de `process.env` e caindo em `"*"` | `apps/api/proxy.ts:15` (`apps/api/env.ts` declara `server: {}`) | Viola a regra de env tipado do repo, e é a causa de o coringa sobreviver em produção sem ninguém notar. |
| 🟡 **O código trata `isRateLimit()` sem que nenhuma regra de rate limit seja registrada** | `packages/security/index.ts:44` | Dá a impressão de já limitar. Some-se a isso: `apps/api` **não declara** `@repo/security` como dependência, e `sign-in`/`sign-up` são `POST` sem guard nem limite. |
| 🟡 Helper de cookie grava `SameSite=Lax` **sem a flag `Secure`**; `isSameOriginRequest` **retorna `true` quando não há header `Origin`** | `packages/shared/utils/helpers/cookies.ts:13` · `packages/auth/session.ts:66-68` | ASVS 5.0 L1 (3.3.1) exige `Secure`. O guard de origem é defesa em profundidade declarada, mas a porta aberta merece decisão explícita. |
| ⚠️ Documentação descreve como **implementado** um fluxo de pagamentos que **não existe** (rotas `/payments/*`, `UserDTO.subscription`, tela "Minha assinatura") | `docs/PAYMENTS.md` | É a pior classe de erro de documentação: mente com aparência de autoridade. Corrigir a doc **independe** de implementar a spec. |
| `delete()` herdado por todo repositório é **soft delete**: grava `deletedAt` e nada mais | `apps/api/(shared)/repositories/base.repository.ts:134` | O único "excluir" que existe não exclui: a conta no Firebase Auth sobrevive e o e-mail continua ocupado. |
| Webhook da Stripe roteia eventos diferentes dos que a doc afirma, e os dois handlers são stubs vazios com `// TODO` | `apps/api/app/(routes)/webhooks/payments/route.ts` | Assinatura é validada, mas nada é persistido. |
| `package.json` exporta `./client-ui` apontando para arquivo **inexistente** | `packages/auth` | Export quebrado. |
| Referencia chaves PostHog que não existem em `keys.ts`, com dependência **não instalada** | `packages/analytics/server.ts` | Código morto que não compila se for chamado. |
| `chart.tsx` é código morto — `recharts` pesa no bundle sem nenhum uso real | `packages/design-system` | Custo sem contrapartida. |
| `findAll()` ignora o `rowMapper`, enquanto `findById()` o aplica | `apps/api/(shared)/repositories/base.repository.ts` | As duas rotas de leitura produzem formatos diferentes. |
| `photo` é `z.string().trim().max(2048)` — qualquer texto passa, não é URL validada | `apps/api/(shared)/validation/entity.schema.ts` | Bug latente, não flexibilidade. |
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
