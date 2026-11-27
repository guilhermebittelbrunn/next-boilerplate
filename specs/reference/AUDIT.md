# Registro de auditoria do backlog

Material de trabalho do `/spec --sync` (skill [`spec-audit`](../../.claude/skills/spec-audit/SKILL.md)). Aqui fica
tudo o que a auditoria mede e que não é a fila em si: conferência de entregas, gates, lotes paralelos, decisões
estacionadas, deriva, contradições entre documento e código, achados e pendências. Quem quer saber **o que vem a
seguir** lê o [`BACKLOG.md`](../BACKLOG.md); este arquivo é a evidência por trás dele.

Até 2026-11-24 este conteúdo morava dentro do próprio `specs/BACKLOG.md`. O histórico das rodadas anteriores está em
`git log -- specs/BACKLOG.md`.

> **Última rodada:** 2026-11-26, **auditoria completa** (`/spec --sync` dentro do `/cycle`, com o `HEAD` em `a13768c`,
> igual a `origin/main`). A anterior foi a de 2026-11-25, sobre `b7f9124` (PR #75). Depois dela entrou em `main` uma
> PR, a #76, e a execução de merge terminou com os seis jobs verdes.
>
> **O que mudou nesta rodada:**
> 1. **A PR #76 entregou duas specs:** `app-form-layout-centered` (7 de 7 itens do corte) e `admin-own-account` (5 de
>    5). As duas foram conferidas item a item no código de `main`, passaram a `done` e foram arquivadas em
>    `docs/features/<slug>/spec.md` com `git mv`. Ver [Entregas desta rodada](#entregas-desta-rodada-pr-76).
> 2. **A mesma PR entregou onze tarefas diretas** que a auditoria anterior registrou "no working tree". Todas foram
>    reconferidas no código de `main`; dez fecharam e uma (a suíte da `app` sob carga) fechou como mitigada, sem
>    prova de causa. Ver [Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec).
> 3. **O CI da `main` voltou ao verde.** A execução de merge da PR #76 (`gh run 45862770863`) passou em `verify`,
>    `audit`, `secrets`, `changes`, `coverage` e `e2e`. É o primeiro merge verde depois de três vermelhos seguidos
>    (#73, #74 e #75). O E2E `focusNotObscured` passou.
> 4. **A fila ficou com uma `approved`:** `audit-log-levels`, que passa a #1. Ver [A próxima](#a-próxima-audit-log-levels).
> 5. **Deriva de referência corrigida:** cinco âncoras em duas specs vivas deslocadas pela PR #76, dois links de
>    entrada em `app-internal-ux-polish/spec.md` e os links de saída das duas specs movidas.
> 6. **Gates remedidos com `--force` e JDK 21.** Ver [Gates](#gates-medidos-nesta-auditoria).
>
> **Rodadas anteriores:** 2026-11-25, auditoria completa pós-PR #75, cujo texto está na versão deste arquivo em
> `a13768c`; 2026-11-24, pós-PR #74 (versão em `b7f9124`); 2026-11-23 (noite), pós-PR #73 (versão em `c58f2ef`);
> 2026-11-23 (fim da tarde), pós-PR #72 (versão em `5829ea3`); 2026-11-23 (tarde), pós-PR #71 (versão em `18288c9`);
> 2026-11-23 (manhã), pós-PR #65 (versão em `a391d1c`); 2026-11-23 (madrugada), pós-PR #64 (versão em `afb5b35`);
> 2026-11-19, pós-PR #63 (versão em `388a453`); e mais de cinquenta rodadas desde a semeadura de 2026-08-21. Até
> 2026-11-24 o texto de cada rodada morava em `specs/BACKLOG.md` (`git log -- specs/BACKLOG.md`).

## Contadores

Sobre as **7 specs que seguem em `specs/features/`**, recontadas do disco em 2026-11-26 lendo o frontmatter de cada
arquivo. Os 39 `spec.md` arquivados em `docs/features/` têm todos `status: done`.

| status | qtd |
|--------|-----|
| `proposed` | 2 |
| `approved` | 1 |
| `in-progress` | 2 |
| `done` (arquivadas) | 39 |
| `deferred` | 2 |
| `rejected` | 0 |
| `superseded` | 0 |

**Por audiência:** `produto` 4 (`audit-log-levels`, `international-billing` e as duas `deferred`) · `confianca` 2
(`account-security-mfa`, `signup-email-verification`) · `dx` 1 (`observability-logging`). **Por esforço:** M 6 · G 1.
**Por valor:** alto 1 · médio 6 · baixo 0.

**Transições aplicadas nesta auditoria: 2.** `app-form-layout-centered` e `admin-own-account`, de `approved` para
`done`, arquivadas. Para as sete que ficam, a auditoria procurou no código de `main` (`a13768c`), fora de testes, a
capacidade que falta: `GithubAuthProvider`, `OAuthProvider`, `microsoft.com`, `"payment"`, `multiFactor`,
`TotpMultiFactor`, `passkey`, os SDKs de coletor `@sentry`, `@logtail`, `@axiomhq` e `betterstack`, `automatic_tax`,
`currency_options`, `emailVerificationCode` e `AuditLevel` dão 0 ocorrências (`git grep -l`, excluindo `__tests__` e
`*.test.*`); o `InputOTP` só aparece em `packages/design-system/components/ui/input-otp.tsx`; o enum `AuditAction`
segue com 18 ações e sem nível (`packages/sdk/src/types/audit/audit.ts:2-21`, sem mudança na PR #76).
**Entrega parcial órfã: nenhuma.** **Spec nova nesta rodada: 0.**

> **Elegíveis: 3 de 7.** A `approved` (`audit-log-levels`) e as duas `proposed` (`signup-email-verification`,
> `international-billing`), todas com `depends_on` satisfeito. `one-time-purchase` e `social-sign-in-providers` seguem
> `deferred`, por decisão sua; `account-security-mfa` e `observability-logging` seguem `in-progress` sem feature ativa
> (E12 e E1). O `/cycle` só leva `approved`.

## Entregas desta rodada (PR #76)

Uma PR entrou em `main` depois da auditoria de 2026-11-25. Conferida com `gh pr view 76`, `gh pr checks 76` e
`gh run view`:

| PR | merge | branch | o que levou | execução de merge |
|----|-------|--------|-------------|-------------------|
| #76 | `a13768c`, 2026-11-26 16:52 UTC | `feat/admin-account-forms-and-session-revocation`, **ainda no remoto** | 204 arquivos, 104 em `apps/` e `packages/`: as duas specs, as onze tarefas diretas da madrugada, nove documentos (`docs/AUTH-PANEL.md`, `docs/SETUP.md`, `docs/SECURITY.md`, `docs/review-checklist.md` e outros cinco), as treze pastas de `docs/features/` e a auditoria anterior | `gh run 45862770863`, ✅ nos seis jobs (`verify`, `audit`, `secrets`, `changes`, `coverage`, `e2e`). A execução da PR (`gh run 45861591178`) também ficou verde |

**Specs entregues: 2.**

| spec | corte | evidência resumida | `/test` |
|------|-------|--------------------|---------|
| [`app-form-layout-centered`](../../docs/features/app-form-layout-centered/spec.md) | 7/7 | `PAGE_NARROW_CLASS = "mx-auto w-full max-w-4xl"` (`apps/app/shared/components/ui/pageLayout.ts:3`); o `<form>` das quatro telas de criar e editar sem `flex-1` nem `min-h-[50vh]`; blocos da conta sem `flex-1`; três `loading.tsx` estreitos novos; `Container.tsx` e `PageSkeleton.tsx` sem mudança | 10 ✅ em build de produção |
| [`admin-own-account`](../../docs/features/admin-own-account/spec.md) | 5/5 | guard `requireOwnAccountApi` (`apps/api/app/(guards)/common-panel.ts:41-49`, `:156-160`) em `GET`/`PUT /account`, `POST /account/password`, `POST /account/password/set` e no upload pessoal de `POST /files`; tela `/admin/account` com perfil, segurança e preferências; `Navbar accountPath="/admin/account"` | 14 ✅, 1 🔒 (admin só com Google definindo senha) |

A tabela item a item está em cada spec arquivada, na seção "Conferência da entrega". Os dois `STATE.md` já citavam a
spec e registram `review: done`; a etapa `observe` segue `pending` (opcional).

A auditoria procurou senha, token, chave e e-mail fora de `@example.com` nas treze pastas novas de `docs/features/` e
não achou nada.

**O que a PR levou além do corte:** as onze tarefas diretas (seção seguinte), a regra nova do `docs/AUTH-PANEL.md:60`
sobre `requireOwnAccountApi`, a linha correspondente no `docs/review-checklist.md:64` e o `agentRules: false` em
`packages/next-config/index.ts:5`.

## Entregas da rodada de 2026-11-25 (PR #75)

Uma PR entrou em `main` depois da auditoria de 2026-11-24. Conferida com `gh pr view 75` e `gh run view`:

| PR | merge | branch | o que levou | execução de merge |
|----|-------|--------|-------------|-------------------|
| #75 | `b7f9124`, 2026-11-25 14:21 UTC | `guilhermebittelbrunn/spec-sync`, **ainda no remoto** | 107 arquivos: o formulário e o servidor do `pnpm kickoff` (`scripts/kickoff/`, com dois arquivos de teste `node --test`), a reorganização de `specs/` em `features/` e `reference/`, a parte 5 da entrega (políticas legais), ajustes em comandos e skills de `.claude/`, links consertados em 43 artefatos de `docs/features/` e quatro specs novas. Fora de documentação, mudou só `package.json` (três scripts `kickoff*`) e `biome.jsonc` (ignora `docs/product/kickoff.json`) | `gh run 45633106961`, ❌ `e2e`; `changes`, `verify`, `audit`, `secrets` e `coverage` em `success` |

**Nenhuma spec entregue.** O `git diff --stat c58f2ef b7f9124 -- apps packages firestore.rules firestore.indexes.json
turbo.json .github` sai vazio. Isso também quer dizer que toda âncora de código citada neste arquivo e nas specs vivas
que valia em `c58f2ef` vale em `b7f9124`; a releitura desta rodada se concentrou nos documentos que a PR mudou.

**O CI.** O `e2e` reprovou nas duas execuções, a da PR (`gh run 45625331528`, `e1d1852`) e a de merge, com 44 testes
passando e 1 falhando nas duas tentativas de cada execução: `focusNotObscured.spec.ts:188` ("arrow keys keep the
focused genre option clear of the action bar") espera 120 s pelo item "Editar" do menu de ações da lista de entidades e
o item não aparece. O retrato da página (o `error-context.md` do artefato `e2e-evidence`) mostra o botão "Mais ações"
da linha com o foco e nenhum menu aberto. O mesmo teste passou na execução de merge da PR #74. Como a PR #75 não mudou
código de app, a causa não está no diff dela; a hipótese (não medida) é o clique chegar antes da hidratação da lista.
O `secrets` voltou ao verde, mas só porque o Gitleaks examina os commits novos de cada push: o `LEAKY_TOKEN` segue no
teste e não há `.gitleaksignore` (ver [Achados da PR #74](#-achados-da-pr-74-2026-11-24)).

A auditoria procurou senha, token, chave e e-mail fora de `@example.com` nos arquivos novos de `scripts/kickoff/` e
nas quatro specs novas e não achou nada.

## Entregas da rodada de 2026-11-24 (PR #74)

Uma PR entrou em `main` depois da auditoria da noite de 2026-11-23. A execução de merge terminou em `failure`,
conferida com `gh run view`: `changes`, `verify`, `audit`, `e2e` e `coverage` em `success`, e `secrets` em `failure`.

| PR | merge | branch | arquivos fora de `docs/` e `specs/` | execução de merge |
|----|-------|--------|-------------------------------------|-------------------|
| #74 | `c58f2ef`, 2026-11-24 13:57 UTC | `feat/delivery-security-hardening`, **ainda no remoto** | 79, 16 novos e 36 de teste (124 no total, com nove documentos, `apps/app/CLAUDE.md`, os 30 artefatos de cinco features e os cinco arquivos da auditoria anterior) | `gh run 45408797430`, ❌ `secrets` |

A PR juntou cinco pipelines no mesmo working tree, numa rodada do `/cycle`: as fatias 2 e 3 de
`delivery-security-review` e três tarefas diretas. Cada uma tem pasta própria em `docs/features/`, com `analyze`,
`develop`, `review` e `test` em `done` e `observe` pendente (opcional). A tabela de conferência item a item das duas
fatias e as derivas estão na [spec](../../docs/features/delivery-security-review/spec.md). Resumo: **9 de 9 implementados**. Fatia 2: a API
recusa com `403 AUTH_FORBIDDEN_ORIGIN` a escrita que só o cookie autentica e que chega sem `Origin` (o bearer segue
aceito), e as quatro rotas de sessão das front-ends exigem `Origin` do mesmo host ou `Sec-Fetch-Site: same-origin`;
`setCookie` põe `Secure` sozinho em HTTPS, e o `x-locale` ganhou 180 dias; os sete `console.error` de
`packages/auth/server.ts` viraram `logEvent` com código; a API encerra o processo no boot em produção sem
`CORS_ORIGIN`; e as strings que faltavam ganharam `max`. Fatia 3: foto e avatar aceitam só objeto do bucket ou
`https://lh3.googleusercontent.com`; o upload conta os bytes ao ler e remove os metadados de JPEG, PNG e WebP, com
código próprio; o cadastro da landing trava o Google durante o envio; o formulário legado de `@repo/auth` saiu, e
`@repo/email` importa `server-only`. Nenhuma dependência, variável ou código de erro novo. O `/test` fechou a fatia 2
com 11 ✅ e 1 🔒 (o encerramento numa função da Vercel) e a fatia 3 com 10 ✅ e 2 parciais 🔒 (o envio real pela Resend
e a caixa de URL sem Storage).

A auditoria procurou senha, token, chave e e-mail fora de `@example.com` nos artefatos das cinco pastas e não achou
nada.

**O CI da execução de merge.** O `e2e` passou com 45 testes e nenhum instável, o primeiro verde da suíte na `main`
depois do teste instável da PR #73. O `secrets` (13:57 UTC) reprovou com `leaks found: 1`. O passo roda o Gitleaks
com `--redact` e sem relatório, então o log não diz arquivo nem regra; a identificação como a constante `LEAKY_TOKEN`
(`packages/auth/__tests__/serverErrorLogging.test.ts:62`), um JWT fictício que o teste usa para provar que o log não
vaza o token, veio de uma execução local do Gitleaks 8.30.1 na primeira parte desta auditoria e não foi repetida na
retomada (sem rede para baixar o binário). O mesmo job tinha reprovado na execução da PR (`gh run 45389706834`), e a
PR foi mergeada assim mesmo: sem branch protection (E3), nada impede. Como o passo só examina os commits novos de cada
push, o próximo merge não volta a reprovar por esse arquivo, a não ser que mexa na linha. Virou achado e a D22; a
sua resposta, em 2026-11-24, foi arquivar a spec e tratar o falso positivo como tarefa direta.

**O que a PR levou além do corte:** as três tarefas diretas (ver a seção seguinte); a remoção do `AuthProvider`
duplicado da landing, como desvio de uma delas; o pós-login da `apps/app` por carga completa
(`postLoginNavigation="full-page"`), que o `/review` da tarefa do laço aplicou na rodada 2; parágrafos novos ou
corrigidos em nove documentos (`docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/delivery/01-security-review.md`,
`docs/AUTH-SSO.md`, `docs/SETUP.md`, `docs/ROPA.md`, `docs/SUBPROCESSORS.md`, `docs/BACKUP.md` e
`docs/INCIDENT-RESPONSE.md`); e duas regras novas no `apps/app/CLAUDE.md` (pós-login por carga completa e o atributo
das barras fixas). O squash também levou a auditoria anterior (este arquivo e quatro specs).

## Tarefas diretas entregues (sem spec)

Correções que vieram de achados deste arquivo, sem spec própria. Ficam registradas aqui porque a pasta
`docs/features/<slug>/` delas não tem `spec.md`.

| feature | PR | achados fechados |
|---------|----|------------------|
| [`i18n-hydration-admin-delete-billing`](../../docs/features/i18n-hydration-admin-delete-billing/STATE.md) | #28, `295c8de`, 2026-09-26 | hidratação do dicionário client em `/en` e `/es`; A2 (arquivamento pelo admin sem cancelar a assinatura) |
| [`disabled-account-revocation`](../../docs/features/disabled-account-revocation/STATE.md) | #35, `1936369`, 2026-09-30 | 🔴 conta desativada pelo admin com o ID token aceito pela API por até 1 hora |
| [`arcjet-key-lazy-validation`](../../docs/features/arcjet-key-lazy-validation/STATE.md) | #36, `e791d3a`, 2026-09-30 | 🔴 `ARCJET_KEY` malformada lida no import de `packages/security`, que fazia a API responder 500 a toda requisição |
| [`admin-self-lockout-guard`](../../docs/features/admin-self-lockout-guard/STATE.md) | #37, `02c31b5`, 2026-10-04 | 🟢 o admin podia desativar, arquivar ou rebaixar a própria conta e perder o painel; D9 |
| [`action-menu-keyboard-delete`](../../docs/features/action-menu-keyboard-delete/STATE.md) | #40, `5f4a8e9`, 2026-10-07 | 🟡 "Excluir" do menu de ações não funcionava pelo teclado (WCAG 2.1.1); 🟡 o gatilho do menu não publicava `aria-haspopup` nem `aria-expanded` |
| [`server-locale-from-url`](../../docs/features/server-locale-from-url/STATE.md) | #41, `0a49a3b`, 2026-10-07 | 🟡 o `getDictionary()` do servidor lia o cookie `x-locale`, não a URL: primeira visita a `/en` e `/es` da web com Server Components em pt-br, e `<html lang>` das duas apps uma navegação atrasado (WCAG 3.1.1) |
| [`antd-theme-seed-colors`](../../docs/features/antd-theme-seed-colors/STATE.md) | #42, `dbcac2a`, 2026-10-07 | 🟡 as cores-semente do antd, passadas como variável CSS, viravam `#000000`: ícone e "Sim" da confirmação de exclusão do `ActionsMenu` a 1,06:1 e anel de foco dos componentes antd a 1,31:1 no tema escuro (WCAG 1.4.11) |
| [`account-deletion-dialog-focus`](../../docs/features/account-deletion-dialog-focus/STATE.md) | #43, `7fb2fe9`, 2026-10-09 | 🟡 o diálogo de exclusão de conta não levava o foco para dentro ao abrir (WCAG 2.4.3); de quebra, a senha digitada e a mensagem de validação voltavam ao reabrir depois de "Cancelar" |
| [`ui-strings-and-password-focus`](../../docs/features/ui-strings-and-password-focus/STATE.md) | #43, `7fb2fe9`, 2026-10-09 | 🟡 strings de UI soltas no design system, nos dois seletores de idioma e no breadcrumb (regra de ouro 2); 🟡 a paginação do antd em inglês nos três idiomas; e, sem linha prévia neste arquivo, o foco perdido depois de uma recusa da API nos dois diálogos de conta e o campo de senha da exclusão sem `autoComplete` nem `required` |
| [`date-input-locale`](../../docs/features/date-input-locale/STATE.md) | #44, `fa7041b`, 2026-10-14 | 🟡 "Pick a date" cravado no `DateInput`; 🟡 a data escolhida, o calendário e o seletor de mês em inglês em qualquer idioma; e, sem linha prévia neste arquivo, a data do formulário de contato da web também em inglês |
| [`date-input-navigation`](../../docs/features/date-input-navigation/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o calendário abria no mês atual, e o nascimento de `entity` só navegava mês a mês; 🟡 a hidratação da `/contact` com fuso diferente; 🟢 o `initialFocus` obsoleto; 🟢 o caso de teste preso a outubro de 2026; 🟢 o `<Label htmlFor="date">` sem alvo na `/contact` |
| [`form-field-focus-and-names`](../../docs/features/form-field-focus-and-names/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o campo de senha (e o de texto) desabilitado no envio, com perda de foco; 🟡 o `placeholder` do chamador ignorado; 🟡 o grupo de rádio sem nome; 🟡 o `Button` que encolhia no carregamento; 🟡 o `disabled` antes do spread |
| [`web-header-reflow-and-menu-name`](../../docs/features/web-header-reflow-and-menu-name/STATE.md) | #45, `eb47e80`, 2026-10-14 | 🟡 o botão do menu mobile da web sem nome; 🟡 o header logado rolando de lado a 1024 e 1280 px; 🟡 o header deslogado passando da largura a 1024 px e, em es, a 1280 px |
| [`web-docs-link-and-mobile-menu`](../../docs/features/web-docs-link-and-mobile-menu/STATE.md) | #46, `c8577b7`, 2026-10-16 | 🟡 o link de documentação da web que nunca aparecia, no header nem no footer; 🟢 o menu mobile da web que continuava aberto depois de seguir um link. Tabela de conferência na versão deste arquivo em `dd31a95` |
| [`api-auth-webhook-error-codes`](../../docs/features/api-auth-webhook-error-codes/STATE.md) | #46, `c8577b7`, 2026-10-16 | 🟡 A4 (o webhook respondia 500 para assinatura recusada); 🟡 `/auth/sign-in` sem validação, com 500 e string crua; 🟡 `GET /auth/me` com `{ message }` sem `error.code`. Tabela de conferência na versão deste arquivo em `dd31a95` |
| [`admin-archive-access-revocation`](../../docs/features/admin-archive-access-revocation/STATE.md) | #50, `4b0be90`, 2026-10-19 | 🟡 o usuário arquivado pelo admin entrava de novo com um perfil novo, e a sessão aberta seguia valendo; de quebra, `POST /auth/sign-in/google` deixou de responder 200 com `user: null` e uma sessão válida. Tabela de conferência na versão deste arquivo em `9b37e02` |
| [`google-sign-in-error-contract`](../../docs/features/google-sign-in-error-contract/STATE.md) | #51, `9b37e02`, 2026-10-19 | 🟡 `POST /auth/sign-in/google` lia o corpo sem validação (500 com corpo vazio) e devolvia a mensagem crua do provedor em 401 |
| [`password-unlink-email-restore`](../../docs/features/password-unlink-email-restore/STATE.md) | #51, `9b37e02`, 2026-10-19 | 🟡 se a devolução do e-mail falhasse depois de desvincular a senha, a conta ficava sem e-mail, sem revogação e sem registro do `uid` |
| [`request-body-size-limit`](../../docs/features/request-body-size-limit/STATE.md) | #51, `9b37e02`, 2026-10-19 | 🟢 as rotas públicas liam o corpo inteiro antes de o Zod recusar tamanho; de quebra, a conta das rotas de `/account` fora do rate limit no `docs/SECURITY.md:160` |
| [`api-edge-413-close-and-route-id`](../../docs/features/api-edge-413-close-and-route-id/STATE.md) | #53, `d19e6fd`, 2026-10-21 | 🟡 a conexão que ficava aberta depois do `413` do teto de corpo (PR #51); 🟡 o id com `%2F` que chegava ao `findById` de `entities/[id]` e `users/[id]` (PR #52); de quebra, a omissão do `docs/SECURITY.md` sobre o `413` e três âncoras de documento deslocadas pela PR #52 |
| [`notifications-bell-freshness`](../../docs/features/notifications-bell-freshness/STATE.md) | #53, `d19e6fd`, 2026-10-21 | 🟢 a lista do sino atrás do badge por até 60 s; 🟢 o badge que conservava o número depois de uma falha da contagem; 🟢 o popover encostado na borda a 375 px |
| [`leftover-ui-strings`](../../docs/features/leftover-ui-strings/STATE.md) | #54, `af763bb`, 2026-10-21 | 🟡 o login da landing validava em pt-br nos três idiomas; 🟡 a tela de erro global da app fixa em inglês, com `lang="en"` |
| [`web-global-error`](../../docs/features/web-global-error/STATE.md) | #54, `af763bb`, 2026-10-21 | a parte do `global-error` do 🟡 da `apps/web` sem `not-found`, `error` e `global-error`: a landing mostrava a tela embutida do Next, em inglês e sem botão de tentar de novo |
| [`web-auth-forms`](../../docs/features/web-auth-forms/STATE.md) | #55, `df381f4`, 2026-10-21 | duas das três partes do 🟡 do login e do cadastro da landing (o login que não levava a lugar nenhum e o cadastro sem e-mail de verificação); 🟢 o cartão encostado na borda a 375 px; 🟢 a falta de `noValidate` nos dois formulários |
| [`global-error-theme`](../../docs/features/global-error-theme/STATE.md) | #55, `df381f4`, 2026-10-21 | 🟢 as telas de erro global das duas apps sem estilo e sem tema |
| [`app-sign-up-copy`](../../docs/features/app-sign-up-copy/STATE.md) | #55, `df381f4`, 2026-10-21 | a metade da app do 🟡 da copy do cadastro, com o "¿" do login em es nas duas apps; de quebra, o `<head>` do login e do cadastro da app, que lia a folha da landing |
| [`organization-guardrails`](../../docs/features/organization-guardrails/STATE.md) | #58, `c0c06f2`, 2026-10-27 | 🟡 D10 (o admin arquivava o dono de uma organização com membros); 🟡 D11 (o rate limit dos convites contava a leitura da tabela); 🟢 a falha do Auth na conferência do convidado virava `500` sem código. Tabela de conferência na versão deste arquivo em `277da43` |
| [`organization-archived-member`](../../docs/features/organization-archived-member/STATE.md) | #58, `c0c06f2`, 2026-10-27 | 🟡 um perfil arquivado pelo admin contava como membro e travava a saída do dono |
| [`app-auth-forms`](../../docs/features/app-auth-forms/STATE.md) | #60, `a879fb5`, 2026-10-29 | 🟢 metade do alerta da sessão recusada (a frase traduzida); 🟢 `auth/user-disabled` em en; 🟢 os seis formulários da app sem `noValidate`; 🟢 o `AuthCard` da app a 375 px; de quebra, o "Could not persist session" e o "Failed to fetch" do Google da app |
| [`web-sign-up-copy`](../../docs/features/web-sign-up-copy/STATE.md) | #60, `a879fb5`, 2026-10-29 | 🟡 a copy do cadastro da landing ("Não tem uma conta?" e o subtítulo do login); 🟢 as duas formas de "as senhas não coincidem" em pt-br |
| [`delivery-stage`](../../docs/features/delivery-stage/STATE.md) | #63, `c9b4d9c`, 2026-11-19 | nenhum achado deste arquivo era o alvo; de quebra, o 🟢 do link morto do `FORKING.md` para o CRUD de referência. Entrou com `test: pending` |
| [`e2e-org-ownership-flake-and-web-api-url`](../../docs/features/e2e-org-ownership-flake-and-web-api-url/STATE.md) | #74, `c58f2ef`, 2026-11-24 | 🟡 o E2E instável de `organizationOwnership` no CI (o teste passa a esperar a `GET /organization/invitations` e o botão habilitado antes do axe, `apps/e2e/tests/organizationOwnership.spec.ts:20`, `:187`); 🟢 a pilha do E2E sem `NEXT_PUBLIC_API_URL` na landing (`apps/e2e/support/stackEnv.ts:87`) e, com ele, o 🟢 do logout feito na app que não chegava à landing no E2E (spec novo `crossAppSignOut.spec.ts`); de quebra, metade do 🟢 dos dois `AuthProvider` da landing (o interno saiu, `apps/web/app/[locale]/layout.tsx:39`) |
| [`app-auth-refused-session-reload-loop`](../../docs/features/app-auth-refused-session-reload-loop/STATE.md) | #74, `c58f2ef`, 2026-11-24 | 🟡 o laço de recarga do login e do cadastro da app com a sessão recusada (o provider desloga quando a gravação falha, `packages/auth/provider.tsx:370-372`, e o hook único `useSignedInRedirect` só navega com o cookie gravado, `apps/app/shared/hooks/useSignedInRedirect.ts:35-70`); 🟢 o `signInStartedHereRef` da landing que não voltava a `false` (`sign-in-form-client.tsx:54-58`); de quebra, o pós-login da app por carga completa (`provider.tsx:388-390`) |
| [`app-footer-focus-not-obscured`](../../docs/features/app-footer-focus-not-obscured/STATE.md) | #74, `c58f2ef`, 2026-11-24 | 🟡 o foco escondido pelo rodapé fixo no celular (WCAG 2.2 SC 2.4.11): `scroll-padding` de 80 px no `<html>` enquanto houver barra fixa ou `Navbar` (`apps/app/app/layout.tsx:71`), com o atributo nas três barras e no `Navbar`, teste de componente e E2E `focusNotObscured.spec.ts` |
| [`app-test-suite-stability`](../../docs/features/app-test-suite-stability/STATE.md) | #76, `a13768c`, 2026-11-26 | 🟡 a suíte da `app` que falhava sob carga, **mitigada sem prova de causa**: `afterEach(cleanup)` no `tableLoadMore`, prazo de 10 s nas esperas do `signInEmailLinkEntry` e consultas por rótulo no `auditFiltersDateInput`; a linha de base da tarefa não reproduziu os sintomas originais |
| [`account-avatar-polish`](../../docs/features/account-avatar-polish/STATE.md) | #76, `a13768c`, 2026-11-26 | 🟢 "Escolher imagem" habilitado sob personificação (`AccountProfileForm.tsx:117`, `disabled={isImpersonating}`); 🟢 o `src=""` no console (`ProfileDropdown.tsx:44`, `\|\| null`) |
| [`auth-revocation-failure`](../../docs/features/auth-revocation-failure/STATE.md) | #76, `a13768c`, 2026-11-26 | 🟡 três dos quatro chamadores que engoliam a falha da revogação; a desativação pelo admin responde `USERS_SESSIONS_NOT_REVOKED` (`apps/api/app/(routes)/users/[id]/route.ts:177`), traduzido nos três idiomas. O expurgo segue sem falhar, de propósito |
| [`repo-hygiene-ci`](../../docs/features/repo-hygiene-ci/STATE.md) | #76, `a13768c`, 2026-11-26 | 🟡 D22, o `LEAKY_TOKEN` (`// gitleaks:allow` em `packages/auth/__tests__/serverErrorLogging.test.ts:62`); 🟢 o `AGENTS.md` do `next dev` (`agentRules: false`, `packages/next-config/index.ts:5`); D16, o `ignore` de versão maior do `stripe` (`.github/dependabot.yml:11-13`), com o qual a #69 fechou |
| [`stripe-customer-lookup-mapper`](../../docs/features/stripe-customer-lookup-mapper/STATE.md) | #76, `a13768c`, 2026-11-26 | sem linha prévia: o `userMapper` vai no `super` do repositório (`user.repository.ts:47`) |
| [`focus-e2e-precondition`](../../docs/features/focus-e2e-precondition/STATE.md) | #76, `a13768c`, 2026-11-26 | 🟢 a pré-condição frágil do primeiro caso do E2E de foco, agora sobre todos os controles (`apps/e2e/tests/focusNotObscured.spec.ts:83-86`) |
| [`setup-docs-cleanup`](../../docs/features/setup-docs-cleanup/STATE.md) | #76, `a13768c`, 2026-11-26 | A3, `STRIPE_*` nos `.env.example` da `app` e da `web` (0 ocorrências agora); `docs/SETUP.md:209-210` com `gitleaks git --pre-commit [--staged]` |
| [`base-repository-id-precedence`](../../docs/features/base-repository-id-precedence/STATE.md) | #76, `a13768c`, 2026-11-26 | sem linha prévia: `{ ...raw, id }` no repositório base (`base.repository.ts:72`, `:79`) |
| [`avatar-preview-mobile-shrink`](../../docs/features/avatar-preview-mobile-shrink/STATE.md) | #76, `a13768c`, 2026-11-26 | sem linha prévia: `shrink-0` na prévia do avatar (`packages/design-system/components/ui/image-upload-input.tsx:171`) |
| [`google-signin-copy-i18n`](../../docs/features/google-signin-copy-i18n/STATE.md) | #76, `a13768c`, 2026-11-26 | 🟢 os dois textos fixos em inglês de `googleSignInApi.ts`, que passam pelo dicionário (`apps/app/shared/lib/googleSignInApi.ts:55-59`) |
| [`notification-markread-missing`](../../docs/features/notification-markread-missing/STATE.md) | #76, `a13768c`, 2026-11-26 | 🟢 `markRead` contra documento apagado: o repositório devolve `null` (`notification.repository.ts:69-80`) e a rota responde `404 NOTIFICATION_NOT_FOUND` (`notifications/[id]/read/route.ts:12-13`) |
| o E2E vermelho de `focusNotObscured` (conserto dentro de [`app-form-layout-centered`](../../docs/features/app-form-layout-centered/STATE.md), etapa D0) | #76, `a13768c`, 2026-11-26 | 🟡 o menu de ações que não abria: o clique passa por `toPass` até o menu abrir (`focusNotObscured.spec.ts:218`); o `e2e` passou nas execuções da PR e de merge |

As tabelas de conferência item a item de cada tarefa direta estão nas versões deste arquivo que o squash da PR
seguinte levou junto (de `02c31b5`, pós-PR #36, a `277da43`, pós-PR #58), e as pastas das features guardam o resto. As
da PR #60 estão na versão deste arquivo em `388a453`, na seção "Entregas desta rodada (PRs #60 a #63)". A PR #61 (o `next` em 16.4.3) não tem
pasta de feature; fechou o 🟡 do `@repo/auth` em `next 15.1.3`.

## Gates medidos nesta auditoria

Executados em 2026-11-26, entre 16:59 e 17:15 (horário local da máquina), com `--force`, neste workspace, com o `HEAD`
em `a13768c` (igual a `origin/main`) e o JDK 21 de `/opt/homebrew/opt/openjdk@21` no `PATH`. Não copiados do CI nem da
rodada anterior. O workspace não tinha `node_modules`; a auditoria rodou `pnpm install --frozen-lockfile` antes, sem
mudar arquivo versionado. A máquina estava carregada: load average de 62 no início, 72 no pico e 15 no fim.

| execução | comando | resultado |
|----------|---------|-----------|
| 1 | `pnpm turbo run lint typecheck --force --continue --concurrency=3` | ✅ **15/15** tarefas: `lint` com **1159 arquivos**, `No fixes applied`; os 14 `typecheck` sem nenhum `error TS` |
| 2 | `pnpm turbo run test test:emulator --force --continue --concurrency=1` | ✅ **15/15** tarefas, numa execução só, sem nenhum teste caído por tempo; `api#test:emulator` com **281 testes em 11 arquivos** |
| 3 | `pnpm --filter email build` | ❌ `'activeAnimations' is not exported from 'motion-dom'`, o achado da PR #74, que segue aberto |

**Resultado:** lint, os 14 `typecheck`, os 14 `test` e o `test:emulator` passaram de primeira. É a primeira rodada
desde 2026-11-24 em que a suíte inteira passa sem uma segunda execução serial, mesmo com a máquina carregada; o
`--concurrency=1` desde o começo explica parte disso, e não dá para atribuir a melhora só à tarefa
`app-test-suite-stability`.

| workspace | arquivos | testes | Δ vs. 2026-11-25, pós-PR #75 |
|-----------|---------:|-------:|-----------------------------|
| `api` | 132 | 1890 | +3 / +65 |
| `app` | 155 | 1389 | +12 / +73 |
| `web` | 35 | 315 | — |
| `@repo/email` | 8 | 209 | — |
| `@repo/auth` | 15 | 201 | — |
| `@repo/design-system` | 14 | 173 | — / +1 |
| `@repo/internationalization` | 7 | 67 | — |
| `@repo/security` | 3 | 65 | — |
| `@repo/shared` | 5 | 63 | — |
| `@repo/analytics` | 3 | 41 | — |
| `@repo/next-config` | 2 | 39 | — / +1 |
| `e2e` | 3 | 38 | — |
| `@repo/payments` | 3 | 19 | — |
| `@repo/sdk` | 4 | 15 | — |
| **total** | **389** | **4524** | **+15 / +140** |
| `api#test:emulator` (fora da linha acima) | 11 | 281 | +3 / +7 |

O `pnpm e2e` não rodou: as execuções de PR e de merge da PR #76 mediram a suíte e passaram. O Gitleaks local não
rodou; o job `secrets` passou nas duas execuções.

CI: a execução de merge da PR #76 (`gh run 45862770863`) está verde nos seis jobs, depois de três execuções de merge
vermelhas seguidas (#73, #74 e #75). Branch protection segue **não ligado**: `gh api
repos/:owner/:repo/branches/main/protection` → **404**, `rulesets` → **`[]`**. Seguem **quatro PRs abertas**, todas do
Dependabot (#67, #68, #70 e #77; a #66 e a #69 fecharam em 2026-11-26), e **73** cabeças no remoto
(`git ls-remote --heads origin`).

## Ordem recomendada

Respeita `depends_on` (lido do frontmatter em 2026-11-26) e a regra do `/spec-audit` §7: só `approved`, valor alto e
esforço baixo primeiro. Sobrou uma `approved`.

> **Critério de execução, sem exceção:** o que uma rodada autônoma consegue provar. O `/cycle` não
> provisiona infraestrutura, então spec cujos critérios dependem de conta em provedor volta com metade dos
> critérios "não verificados".

| # | id | valor · esforço | situação |
|---|----|-----------------|----------|
| 1 | [`audit-log-levels`](../features/audit-log-levels.md) | médio · M | `approved` em 2026-11-24; sem dependência. O Resumo da spec pede resposta às perguntas 2, 3 e 4 antes do `/analyze`; os índices novos só provam num projeto real |
| — | [`signup-email-verification`](../features/signup-email-verification.md) | médio · M | `proposed`; espera a escolha da variante (pergunta 1 da spec) |
| — | [`international-billing`](../features/international-billing.md) | médio · G | `proposed`; espera a ordem das fatias e a decisão sobre a de impostos |
| — | [`account-security-mfa`](../features/account-security-mfa.md), **fatia 3** (segundo fator) | médio · M | `in-progress`, 4 de 6 itens (PRs #29 e #39). Fora do conjunto elegível enquanto o status não mudar (E12) |
| — | [`observability-logging`](../features/observability-logging.md) | alto · M | `in-progress`, 5 de 6 itens. Falta o coletor, que exige conta num provedor (E1) |
| — | [`social-sign-in-providers`](../features/social-sign-in-providers.md), [`one-time-purchase`](../features/one-time-purchase.md) | médio · M | `deferred` em 2026-10-16, por decisão sua |

### A próxima: `audit-log-levels`

**Recomendação: [`audit-log-levels`](../features/audit-log-levels.md)**, com `/analyze audit-log-levels`.

1. **Valor × esforço.** É a única `approved`. Valor médio, esforço M: um campo de nível no evento, seis eventos
   `info` novos, coluna e filtro na listagem do admin.
2. **Dependências.** `depends_on: []`. O corte cabe no emulador, com uma ressalva: os dois índices compostos novos
   (`firestore.indexes.json`) só se provam num projeto real, e a publicação deles vira pendência no
   `PRE-PRODUCTION.md`, como as dos índices anteriores.
3. **Fica mais cara se esperar.** Cada ação nova da trilha que entrar antes do nível precisa ser classificada depois, e
   os eventos gravados sem nível crescem a base que o backfill da pergunta 2 tem de cobrir.
4. **O que desbloqueia.** O admin passa a ter a história da conta (cadastro, assinatura, cancelamento) por usuário e
   período, sem depender do GA.
5. **O que levar para o `/analyze`.** As perguntas 2, 3 e 4 têm recomendação na spec. A 3 (vencimento de 12 meses para
   eventos `info`) encosta na E5, o prazo de retenção da coleção `auditEvent`, que é decisão sua; se você não
   responder, o `/cycle` adota as recomendações e registra a escolha no plano.

**Alternativas consideradas:**

| candidata | por que não é a #1 |
|-----------|--------------------|
| `signup-email-verification` | `proposed`: o `/cycle` não leva spec não aprovada, e a variante (só no cadastro ou em todo login) é decisão sua |
| `international-billing` | `proposed` e G; a fatia de impostos depende de conta Stripe Tax, que não atende empresa no Brasil |
| o CSS do antd sem SSR (tarefa direta) | espera a D24, porque a correção provável traz dependência nova |

**Registro das recomendações anteriores:** a auditoria de 2026-11-25 recomendou `app-form-layout-centered`, entregue
pela PR #76 junto de `admin-own-account`, a recomendada em 2026-11-24. As anteriores estão nas versões deste arquivo em
`c9b4d9c`, `388a453`, `afb5b35`, `a391d1c`, `18288c9`, `5829ea3`, `c58f2ef`, `b7f9124` e `a13768c`.

### A fila para uma rodada autônoma

Dentro da [`cycle-policy`](../../.claude/cycle-policy.md) (o ciclo não aprova spec, não leva `deferred` nem `in-progress`
sem feature ativa, não provisiona infra e não commita):

| ordem | item | por que nesta posição |
|-------|------|-----------------------|
| 1 | `audit-log-levels` | `approved`, M, a #1 da ordem; o `/cycle` adota as recomendações das perguntas 2, 3 e 4 se ninguém responder antes |
| 2 | a corrida do `markAllReadByUserId` e o aviso de erro da notificação expirada | 🟢, P, só `apps/api` e um hook da `app` |
| 3 | a copy de `AUTH_SESSIONS_NOT_REVOKED` no desvincular e o nome do admin no menu durante a personificação | 🟢, P cada, i18n e `ProfileDropdown.tsx` |
| 4 | a suíte do design system sob carga e a limpeza global do Testing Library na `app` | 🟡, P a M; só teste |
| 5 a 8 | `pnpm --filter email build`; as PRs #67, #70 e #77 do Dependabot | P cada; arquivos distintos |

### Tarefas diretas candidatas

Na ordem em que a auditoria as pegaria quando não houver spec para rodar.

> **Saíram da lista em 2026-11-26, com a PR #76:** o E2E vermelho de `focusNotObscured`, a suíte da `app` sob carga
> (mitigada), "Escolher imagem" sob personificação, o `src=""`, a pré-condição do E2E de foco, o `AGENTS.md` do
> `next dev`, o `LEAKY_TOKEN`, o `ignore` do `stripe`, três dos quatro chamadores da revogação, os dois textos de
> `googleSignInApi.ts` e o `markRead` contra documento apagado. Cada um foi reconferido no código de `main`; ver
> [Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec).

- **O CSS do antd sem SSR** (`packages/design-system/providers/antd-app.tsx`): P a M, 🟡. Espera a D24, porque a
  correção provável traz dependência nova. Reconferido em `a13768c`: nenhum `AntdRegistry`, `StyleProvider` nem
  `extractStyle` em `apps/` e `packages/`. Ver
  [Achados do `/test` de `app-form-layout-centered`](#-achados-do-test-de-app-form-layout-centered-2026-11-25-ainda-no-working-tree).
- **A suíte do design system sob carga e a limpeza global do Testing Library na `app`**: P a M, 🟡 e 🟢. Ver
  [Achados das tarefas diretas da madrugada](#-achados-das-tarefas-diretas-da-madrugada-2026-11-26-ainda-no-working-tree).
- **A corrida do `markAllReadByUserId`** (`notification.repository.ts`, o `batch.update`) e **o toast de erro para
  notificação expirada** (`apps/app/shared/hooks/useNotificationActions.ts`): P cada, 🟢. Mesma seção.
- **A copy de `AUTH_SESSIONS_NOT_REVOKED` no desvincular** (`translations/packages/shared/utils.ts:60`, `:246`, `:434`)
  e **o nome do admin no menu do perfil durante a personificação** (`ProfileDropdown.tsx:42`): P cada, 🟢. Mesma seção.
- **Três helpers de `toDate()` por duck-typing**: P, 🟢. Mesma seção.
- **`pnpm --filter email build` quebrado** (`'activeAnimations' is not exported from 'motion-dom'` no
  `@react-email/preview-server`): P a M, 🟡. A #68 do Dependabot segue aberta. Ver [Achados da PR #74](#-achados-da-pr-74-2026-11-24).
- **As PRs vermelhas do Dependabot, uma tarefa direta por PR** (D16): a #67 (o Biome novo não conhece
  `noDuplicateDependencies` e `noEmptySource`), a #70 (regras novas do Ultracite 7) e a #77, aberta em 2026-11-26 com o
  grupo de produção (21 atualizações) e vermelha no `verify` (`gh run 45865909348`; o log do passo não estava
  disponível na hora da auditoria). A #66 foi fechada pelo próprio Dependabot ("updatable in another way"), e a #69
  (`stripe`) fechou com o `ignore` novo. A #68 (`react-email`) segue aberta. P cada.
- **O resto do `docs/SECURITY.md` atrás da PR #56** (`docs/SECURITY.md:7`): P, só documento.
- **Link de "esqueci a senha" no login da landing** (`sign-in-form-client.tsx`): P.
- **Três `POST /api/auth/session` por login na app, dois na landing** (o `onAuthSuccess` e o observador do token,
  `packages/auth/provider.tsx`): P a M. Ver [Achados da tarefa `web-auth-forms`](#-achados-da-tarefa-web-auth-forms-pr-55).
- **`radix-ui: latest` no design system** (`packages/design-system/package.json:25`): P. Mexe no lockfile.
- **`start` com porta fixa na `web` e na `api`** (`apps/web/package.json:7`, `apps/api/package.json:9`): P.
- **Laço de redirecionamento da conta arquivada antes da correção** (`user-merge.ts:62-68`, `apps/app/proxy.ts:271-286`,
  `authSession.ts:32-37`): P a M, e pede uma medição que o `/test` não conseguiu montar.
- **A `apps/web` com `RESEND_*` e `@repo/email` sem envio** (`apps/web/env.ts:1`, `.env.example:2-3`,
  `package.json:19`): P, só config da web.
- **`getMergedUserFromIdToken` sem chamador** (`user-merge.ts:33-49`): P, `apps/api`.
- **`typecheck` do `packages/shared` e o hash do `typecheck` no turbo** (`packages/shared/package.json:11`,
  `turbo.json:11-14`): P e medido, mas mexe no lockfile e no `turbo.json`, que toda tarefa usa.
- **CI em `ubuntu-latest`** (`.github/workflows/ci.yml:21`, `:57`, `:99`, `:120`, `:146`, `:204`): P.
- **Guard de redirect: decodificação dupla e teste fora do pacote** (`packages/auth/redirect.ts:27`,
  `apps/app/__tests__/postAuthRedirectTarget.test.ts`): P.
- **Aparelho encerrado com a tela aberta não sai sozinho** e **sessão expirada que perde a query**
  (`packages/auth/provider.tsx`): M.
- **Tela de erro global da `apps/api` com texto fixo** (`apps/api/app/global-error.tsx:19-22`): P, valor quase nulo.
- **Nome de marca longo no header a 1024 px**: decisão de produto (a marca sai do centro).
- **Da rodada pós-PR #71, todas 🟢 e P:** `PUT /health` com `405` sem `error.code`; o segundo `<title>` no 404 de
  `/favicon.ico`. Ver [Achados da PR #71](#-achados-da-pr-71-2026-11-23).
- **Da rodada pós-PR #72, todas 🟢 e P:** o `[request] failed` registrado para o cliente que fecha a conexão no meio
  da renderização; o primeiro toque perdido no botão da barra lateral no celular. Ver
  [Achados da PR #72](#-achados-da-pr-72-2026-11-23).
- **Da rodada pós-PR #73, 🟢 e P:** o `RegExp` sem escape do `screenTitled` no E2E. Ver
  [Achados da PR #73](#-achados-da-pr-73-2026-11-23).
- **Da rodada pós-PR #74, 🟢:** o `Authorization` escrito depois da recusa da sessão, o duplo clique no login da app, a
  tabela que mostra "vazio" antes de buscar, o `Maximum call stack` do `next dev` e as constantes duplicadas. Ver
  [Achados da PR #74](#-achados-da-pr-74-2026-11-24).

As âncoras de código desta lista foram reconferidas em `a13768c` nos arquivos que a PR #76 mudou; as demais valem
desde `b7f9124`.

**Os demais candidatos não mudaram de motivo desde 2026-10-07 e não são mais reapresentados** (§5.1): o contraste
do seletor de tamanho da paginação, o `CommandDialog` em inglês, o 404 de arquivo inexistente (O1 da PR #41), as
âncoras de documento deslocadas, o código do erro em recusa esperada, o idioma das preferências, o asterisco do
`Label`, o foco que sai do botão de enviar e o `data-day`. O motivo de cada um está na linha do achado, em
[Achados](#achados-correções-pontuais-não-specs).

## Lotes paralelos

Recalculado em **2026-11-26**, nesta auditoria, a partir do `contends_on` de cada spec, lido do disco, pelo algoritmo
de [`/spec-audit` §6](../../.claude/skills/spec-audit/SKILL.md): elegíveis → ordem do backlog → guloso por disjunção →
teto de 3. Nenhum `contends_on` mudou nesta auditoria. As 26 entradas declaradas pelas sete specs somam 21 caminhos
distintos, e todos existem no disco.

**Elegíveis agora: 3 de 7.** A `approved` e as duas `proposed`. O algoritmo conta `proposed`; o `/cycle` não leva spec
que não foi aprovada, então, até a sua triagem, o lote 1 na prática é só `audit-log-levels`.

| lote | specs | o que cada uma toca (`contends_on`) | por que não colidem |
|------|-------|-------------------------------------|---------------------|
| 1 | `audit-log-levels`, `signup-email-verification` | `firestore.indexes.json`, webhook de pagamentos, `user-merge.ts` · `common-panel.ts`, `apps/api/proxy.ts`, `SignUpFormClient.tsx`, layout comum | nenhum caminho declarado em comum |
| 2 | `international-billing` | `billing.ts`, `billing-state.ts`, webhook de pagamentos, `apps/api/env.ts` | sozinha |

**Quem ficou de fora do lote 1, nominalmente:**

- `international-billing` não entra com `audit-log-levels`: as duas declaram
  `apps/api/app/(routes)/webhooks/payments/route.ts`.
- Nenhuma ficou de fora só pelo teto de 3.
- Fora dos elegíveis: `social-sign-in-providers` e `one-time-purchase` (`deferred`), `account-security-mfa` e
  `observability-logging` (`in-progress` sem feature ativa).

**Ressalva específica do lote 1, que o `contends_on` não captura:** `audit-log-levels` e `signup-email-verification`
gravam no mesmo ponto, a confirmação de e-mail (`apps/api/app/(routes)/auth/email-verification/confirm/route.ts`), que
nenhuma das duas declara. Se as duas forem aprovadas juntas, rode em série ou acrescente o arquivo aos dois
`contends_on`.

**A ordem recomendada e os lotes respondem perguntas diferentes.** A ordem diz *o que vale mais a pena fazer*; o lote
diz *o que pode ser feito junto sem uma spec pisar na outra*. Se você só vai rodar uma coisa, rode a #1 da ordem.

**Lição da PR #76 para o campo:** as duas specs entregues declararam nove caminhos e tocaram seis. `app-form-layout-centered`
declarou `Container.tsx` e `PageSkeleton.tsx` e não mexeu em nenhum dos dois; `admin-own-account` tocou os três que
declarou e também os três formulários da conta que a outra declarava, como a ressalva de 2026-11-25 previa. A PR inteira
mexeu em 104 arquivos de `apps/` e `packages/`, quase todos fora das listas, porque levou onze tarefas diretas junto.
**Lições anteriores:** a PR #74 acertou os oito declarados; a #73 tocou 32 fora da lista; a #72, 13; a #71, 31; a #65
acertou os sete declarados e tocou 19 fora da lista; a #64 tocou 67, a #62, 59, e a #57, 131, o teto até hoje.

### Nota de processo: a auditoria é de um workspace só

**Só um workspace roda a auditoria do backlog** (`/spec --sync --audit-only`); os outros rodam com
`--no-audit`. Sem essa disciplina, 3 agents regravam o `BACKLOG.md` ao mesmo tempo. É também por isso que
`specs/BACKLOG.md` **não** aparece em nenhum `contends_on`: esse conflito se resolve por processo, não por
dado (ver [`README.md`](../README.md#depends_on--contends_on)). As PRs #40 a #74 tocaram este arquivo só para levar a
auditoria anterior ou a spec dirigida, feitas num workspace só.

### A ressalva honesta

**Lote disjunto em `contends_on` reduz conflito; não elimina.** O campo é uma previsão feita lendo o corte de MVP, e o
histórico mostra que ela erra para menos quase sempre: entregas de spec tocaram de 2 a 131 arquivos fora da lista, e
as PRs #38 e #39, que rodaram em paralelo, dividiram seis arquivos sem declarar nenhum. Nenhuma rodada registrou
conflito de merge causado por esses erros.

## Precisam de decisão

Três abertas: a D24 e a D25, que seguem da rodada anterior sem resposta, e a D9, que espera a compra avulsa voltar da
fila. A D23 fechou: as duas specs que ela ordenava foram entregues juntas pela PR #76. As duas `proposed` esperam a
triagem pelas perguntas da própria spec, listadas no [`BACKLOG.md`](../BACKLOG.md#aguardando-triagem).

| # | pergunta | recomendação | por quê |
|---|----------|--------------|---------|
| D24 | Adotar o `@ant-design/nextjs-registry` (dependência nova) para o CSS do antd sair no HTML do servidor? | sim, como tarefa direta, depois de medir o salto de layout antes e depois em `next build && next start` | sem ele, toda tela com antd pula de layout na primeira carga (cerca de 4,7 s com 300 ms de latência, medido pelo `/test` de `app-form-layout-centered`). A `cycle-policy` §2 manda dependência nova passar por você. Na próxima aparição sem resposta, ela vai para as decisões estacionadas (§5.1) |
| D25 | O admin precisa de uma ação para repetir só a revogação de sessões de uma conta desativada? | sim, como tarefa direta pequena no painel de usuários | hoje, se a revogação falha ao desativar, a API responde `USERS_SESSIONS_NOT_REVOKED` e a saída é reativar e desativar de novo, o que deixa as sessões antigas valendo nesse intervalo. Na próxima aparição sem resposta, ela vai para as decisões estacionadas (§5.1) |
| D9 | Na compra avulsa, o estorno feito no painel da Stripe retira o acesso? | sim, quando a spec voltar da fila | sem isso, o acesso vitalício sobrevive ao dinheiro devolvido. A spec está `deferred` desde 2026-10-16 |

Resolvidos sem pergunta nesta auditoria, por medição:

- **O CI no SHA de merge da PR #76** (`a13768c`): verde nos seis jobs (`gh run 45862770863`); a execução da PR
  (`gh run 45861591178`) também.
- **Se a PR #76 entregou spec**: sim, duas, conferidas no código (ver [Entregas desta rodada](#entregas-desta-rodada-pr-76)).
- **Se o `LEAKY_TOKEN` foi tratado**: sim, `// gitleaks:allow` em `serverErrorLogging.test.ts:62`, e o `secrets` passou.
- **Se a `main` ganhou proteção**: não. `gh api repos/:owner/:repo/branches/main/protection` → 404 ("Branch not
  protected"), `rulesets` → `[]`, medidos em 2026-11-26.
- **Se a branch da PR #76 saiu do remoto**: não. `feat/admin-account-forms-and-session-revocation` segue lá, ao lado
  de `guilhermebittelbrunn/spec-sync` (PR #75) e `feat/delivery-security-hardening` (PR #74). O remoto tem 73 cabeças.
- **Se o `ignore` do `stripe` bloqueia também as atualizações de segurança**: **não confirmado**. A referência de
  opções do Dependabot diz, na seção `allow`, que "`update-types` only affects version updates, not security updates";
  a seção `ignore` e a página de configuração das atualizações de segurança não dizem nada sobre o `ignore` (lidas em
  2026-11-26: <https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference>,
  <https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/configuring-dependabot-security-updates>).
  A segunda página diz que o `dependabot.yml` pode mudar o comportamento padrão das atualizações de segurança, então o
  risco existe. Como as atualizações de segurança do Dependabot estão desligadas neste repositório (pendência 32), o
  efeito hoje é nulo.
- **Se os artefatos novos vazaram credencial**: não (ver [Entregas desta rodada](#entregas-desta-rodada-pr-76)).

## Decisões estacionadas (§5.1)

Recomendações que apareceram em duas rodadas ou mais com a mesma resposta. Pela
[§5.1 da `cycle-policy`](../../.claude/cycle-policy.md), elas **param de ser reapresentadas** até você mexer.
Cada uma tem dono e endereço. O histórico de cada célula está na versão deste arquivo em `9c793c6`, e o das linhas
que saíram nesta auditoria, na de `c9b4d9c`. **Saíram quatro em 2026-11-19:** a E9 (o deep link das abas da conta),
fechada pela entrega de `app-internal-ux-polish` na PR #62; a E13 (ligar o bloqueio de bot da landing), resolvida pela
sua aprovação de `delivery-infra-hardening`, que traz o item no corte; a E14 (qual spec levar ao `/cycle` sem nenhuma
`approved`), porque três estão `approved`; e a E15 (abrir a PR da pilha `fix/app-auth-forms`), porque a pilha virou a
PR #60. **Nenhuma saiu nas cinco auditorias de 2026-11-23 nem na de 2026-11-25.** Na de 2026-11-25, pós-PR #75, E3 e E11 ganharam a medição da rodada, e as demais foram relidas sem mudança. Na de 2026-11-24, pós-PR #74, entrou a E19 (a antiga D21, na segunda aparição sem resposta), e E3, E11 e E17 ganharam a medição da rodada. Na da noite de 2026-11-23, pós-PR #73, entraram três (E16 a E18, as antigas
D17, D18 e D19, na segunda aparição sem resposta), e E3, E4 e E11 ganharam a medição da rodada.

| # | questão | dono | onde mora a decisão | recomendação registrada |
|---|---------|------|---------------------|-------------------------|
| E1 | `observability-logging` fecha como entregue, com o coletor virando spec P própria? (16 rodadas) | você | `docs/PRE-PRODUCTION.md` §11 (o coletor) | fechar e abrir spec P do coletor. A E12 pede a mesma coisa para `account-security-mfa` |
| E3 | Ligar branch protection na `main` | você, no painel do GitHub | `docs/PRE-PRODUCTION.md` §9 | ligar, exigindo `verify`, `e2e`, `secrets` e `audit` (a lista que o §9 pede desde a PR #65); não há pré-requisito técnico. É o que falta para o item 2 de [`e2e-testing`](../../docs/features/e2e-testing/spec.md). **Remedido em 2026-11-26, pós-PR #76: 404, `[]`.** A PR #76 entrou com todos os checks verdes, na PR e no merge. Remedido em 2026-11-25, pós-PR #75: 404, `[]`. A PR #75 entrou com o `e2e` vermelho na execução dela (`gh run 45625331528`), e a `main` está com as três últimas execuções de merge vermelhas. Remedido em 2026-11-24, pós-PR #74: 404, `[]`. **A PR #74 mostra o custo:** o job `secrets` reprovou na execução da PR (`gh run 45389706834`) e a PR foi mergeada assim mesmo; com a proteção exigindo `secrets`, o merge teria parado ali, e o falso positivo teria sido tratado antes de chegar à `main`. Remedido em 2026-11-23, pós-PR #73: 404, `[]`. A proteção não teria evitado o vermelho do merge da PR #73: o check exigido é o da PR, que passou, e o teste instável falhou só na execução de merge. Com a proteção, o job `secrets` também deixa de correr o risco do "bad revision" depois de um force-push (ver [Achados da PR #65](#-achados-da-pr-65-2026-11-23)) |
| E4 | O gate `approved` não é usado de forma consistente: das 39 specs entregues, catorze passaram por ele (as duas da PR #76, `app-form-layout-centered` e `admin-own-account`, inclusive); antes delas, as quatro últimas `app-internal-ux-polish` (PR #62), `delivery-infra-hardening` (PR #65), `delivery-product-quality` (PRs #71 a #73) e `delivery-security-review` (PRs #64 e #74), as duas arquivadas em 2026-11-24. `plan-entitlements`, `in-app-notifications`, `magic-link-sign-in` e `organization-ownership-transfer` entraram no ciclo ainda `proposed`, e `teams-organizations` entrou `deferred` e saiu `done` sem passar por `approved`. Desde 2026-11-10 todas as entregas passaram pelo gate | você | `specs/README.md` (ciclo de vida) | remover `approved` do ciclo de vida ou fazer o `/cycle` recusar spec não aprovada; a auditoria recomenda a primeira |
| E5 | Prazo de retenção da coleção `auditEvent` | você | `docs/PRE-PRODUCTION.md` §1.3 | decidir um prazo padrão sem invocar o art. 15 do Marco Civil |
| E6 | Teto absoluto da sessão ultrapassável por até meia vida de cookie | — | `docs/PRE-PRODUCTION.md`, seção "Declaração — por quanto tempo uma sessão pode ser renovada" | manter o comportamento; o número está escrito onde o fork lê |
| E7 | Busca da tabela enxerga só as páginas carregadas | quem sentir a dor | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | abrir spec quando houver caso de uso |
| E8 | Como medir visitas à `apps/web` | quem pedir | [Lacunas](#lacunas-avaliadas-e-não-especificadas) | o contador próprio é a única saída sem conta nem variável obrigatória |
| E10 | O que o modo `simple` deve fazer (a documentação descreve um redirecionamento que não existe) | você | achado A1 em [Achados](#-achados-abertos-reconferidos-ou-herdados) | **o usuário decidiu ignorar o modo por ora (2026-09-25)**. Não reapresentar até ele mexer |
| E11 | O registro da feature não acompanha o merge, e a branch sai fora do padrão `<project>/<type>/<title>` | você | `.claude/rules/git-commits.md` e `.claude/skills/spec-audit/SKILL.md` §4.1 | **Auditoria de 2026-11-26, pós-PR #76:** a PR #76 saiu de `feat/admin-account-forms-and-session-revocation`, criada pelo `/review` (sem o segmento de projeto do padrão, como a da PR #74), e a branch **continua no remoto** depois do merge. Os treze `STATE.md` da PR registram essa branch e `review: done`. Seguem **25** `STATE.md` com `review: in-progress`, agora entre 93 pastas. **Auditoria de 2026-11-25, pós-PR #75:** a PR #75 saiu de `guilhermebittelbrunn/spec-sync`, fora do padrão (sem tipo nem projeto), e a branch **continua no remoto** depois do merge. A PR não tem pasta em `docs/features/`, então não há `STATE.md` a acompanhar. Seguem **25** `STATE.md` com `review: in-progress`, entre 80 pastas. **Auditoria de 2026-11-24, pós-PR #74:** a PR #74 saiu de `feat/delivery-security-hardening`, criada pelo `/review` (a primeira desde a PR #64 que não saiu da branch do Conductor) e validada pelo regex dele, embora não tenha o segmento de projeto do padrão `<project>/<type>/<title>`, que a regra só dispensa para épico. Os cinco `STATE.md` da PR registram a branch real e `review: done`, o que resolve, para esta PR, a metade do registro. A branch **continua no remoto** depois do merge. Seguem **25** `STATE.md` com `review: in-progress`, agora entre 80 pastas. **Auditoria de 2026-11-23, pós-PR #73:** a PR #73 saiu de `guilhermebittelbrunn/cycle-command-v13`, a branch criada pelo Conductor, fora do regex e sem tipo nem projeto. O `/review` propôs `feat/delivery-product-quality-slice-3`, validou o nome e não o criou, porque o Conductor pede autorização para trocar de branch (`review/review.md` da feature); o `STATE.md` ficou com `branch: -` e `review: done`. A branch **continua no remoto** depois do merge, como as das PRs #65, #71 e #72. Seguem **25** `STATE.md` com `review: in-progress` depois do merge, entre 75 pastas. O registro das PRs #57 a #72 está nas versões deste arquivo em `afb5b35`, `a391d1c`, `18288c9` e `5829ea3`. Recomendação: a regra aceitar `fix/<slug>` e `feat/<slug>` para tarefa que cruza vários apps (como já aceita para épico); o `/review`, sob o Conductor, registrar no `STATE.md` a branch real de onde a PR vai sair; e a auditoria, ao confirmar o merge, gravar no `STATE.md` a linha `review` como `done` com o SHA e a branch |
| E12 | O destino da fatia 3 de `account-security-mfa` (segundo fator com códigos de recuperação, itens 5 e 6). Opções: **(a)** arquivar a spec como entregue em 4/6 e abrir uma spec `proposed` só do segundo fator; **(b)** voltar a spec para `proposed`, com as fatias entregues registradas nela; **(c)** manter `in-progress`; **(d)** marcar a fatia 3 como `deferred` dentro da spec | você | a spec [`account-security-mfa`](../features/account-security-mfa.md) | **(a)**. Com `in-progress` e nenhuma feature ativa, a spec fica fora dos lotes para sempre. A pasta de destino ainda não tem `spec.md` (reconferido em 2026-10-22), então não há colisão |
| E16 | Aceitar que o 404 da landing dependa de JavaScript (era a D17, apresentada pós-PR #71 e pós-PR #72) | você | a spec [`delivery-product-quality`](../../docs/features/delivery-product-quality/spec.md), deriva da fatia 1 e "Perguntas em aberto" | aceitar. Com idioma válido, o servidor responde 404 com `<html id="__next_error__">` e o corpo vazio, e o cartão traduzido só aparece com JavaScript. O status e o `noindex` estão certos; a opção com `Suspense` transforma o 404 em 200, e a única saída conhecida é o `global-not-found`, experimental no Next 16. Recusando, o trabalho volta como tarefa direta, com um `request.get` no E2E contando o `<h1>` |
| E17 | Abrir a spec da dieta do bundle da landing, tirando o antd e o `AuthProvider` duplicado do layout público (era a D18, apresentada pós-PR #72 e agora) | você | `/spec` dirigida; o gatilho está no "Fora do corte" de [`delivery-product-quality`](../../docs/features/delivery-product-quality/spec.md) | sim, como spec `proposed`. O gatilho que a spec pedia (o número do Lighthouse) chegou com a fatia 2: na mediana de cinco execuções, a home fica em Performance 87 e LCP 3,9 s, abaixo da meta da parte 3, com a Performance variando de 57 a 97 em dez execuções. A condição "depois da fatia 3" foi cumprida pela PR #73. Mexe em autenticação e no design system, então é decisão de produto. **Reduzida pela PR #74:** o `AuthProvider` duplicado saiu do layout da landing (`apps/web/app/[locale]/layout.tsx:39`); sobram o antd e o `AuthProvider` do `DesignSystemProvider` |
| E18 | As três escolhas da fatia 2 de `delivery-product-quality`: Node 22.19 para o Lighthouse 13, data por rota no sitemap, mediana no `pnpm lighthouse` (era a D19, apresentada pós-PR #72 e agora) | você | a spec [`delivery-product-quality`](../../docs/features/delivery-product-quality/spec.md), "Perguntas em aberto" | (a) Node, só junto de outro motivo; (b) data por rota, não; (c) mediana, sim, no procedimento do `/deliver` (rodar três vezes e citar a mediana), sem mudar o comando |
| E19 | As duas escolhas da fatia 3 de `delivery-product-quality` que o `/analyze` decidiu por padrão: (a) mandar os eventos também ao Vercel Analytics; (b) pôr a área no meio do título do admin (era a D21, apresentada pós-PR #73 e agora) | você | a spec [`delivery-product-quality`](../../docs/features/delivery-product-quality/spec.md), "Perguntas em aberto" | (a) não agora, porque eventos customizados do Vercel Analytics dependem de plano pago, segundo o plano da fatia, e o hook aceita um segundo destino sem mudar os chamadores; (b) não. As duas seguem como entregues se você não mexer |

**Uma recomendação repetida é decisão técnica e deveria virar linha de política.** A auditoria não edita `.claude/`,
então ela fica aqui como texto pronto para você colar:

- Em `.claude/cycle-policy.md` §2: *"Spec cujo corte a auditoria contestou em duas rodadas não entra em
  `/analyze` sem um bloco 'Reescopo que o `/analyze` deve aplicar' na própria spec. Se o bloco não existir,
  o `/cycle` escolhe a próxima."* Caso medido: `onboarding-flow` ficou seis rodadas presa pelo corte contestado,
  ganhou o bloco numa rodada e foi entregue na seguinte, 5/5. Reconferido em 2026-11-25: a linha não existe na
  política, que a PR #75 mexeu em quatro linhas.

**Fechada pela PR #75:** a recomendação para o §4.1 do `spec-audit` (reescrever os links de saída e de entrada da spec
movida). A skill ganhou o passo 8, "Conserte os links que o movimento quebrou", com os caminhos novos de
`reference/research/`. O passo ainda não cobre o link de entrada do `analyze/plan.md` da feature: são 27 mortos em
2026-11-26 (eram 18 em 2026-11-25) (ver [Contradições](#contradições-doc--código)).

## Dependências e bloqueios

| spec | `depends_on` | situação em 2026-11-26, pós-PR #76 |
|------|--------------|------------------------------------|
| [`audit-log-levels`](../features/audit-log-levels.md) | — | ✅ sem dependência. `approved` |
| [`signup-email-verification`](../features/signup-email-verification.md) | — | ✅ sem dependência. `proposed` |
| [`international-billing`](../features/international-billing.md) | — | ✅ sem dependência. `proposed` |
| [`social-sign-in-providers`](../features/social-sign-in-providers.md) | `linked-sign-in-methods` | ✅ satisfeita (PR #48, `44b2b04`). A spec segue `deferred` |
| [`one-time-purchase`](../features/one-time-purchase.md) | — | ✅ sem dependência. `deferred` |
| [`account-security-mfa`](../features/account-security-mfa.md) | `account-settings` | ✅ satisfeita (PR #12, `a4df5ed`). A spec está `in-progress`, com as fatias 1 e 2 em `main` |
| [`observability-logging`](../features/observability-logging.md) | — | ✅ sem dependência |

Nenhuma spec viva depende de `app-form-layout-centered` nem de `admin-own-account`.

## Todas as specs

| id | título | audiência | valor | esforço | status | depende de |
|----|--------|-----------|-------|---------|--------|------------|
| [`audit-log-levels`](../features/audit-log-levels.md) | Níveis na trilha de auditoria (sensível e informativo) | produto | médio | M | `approved` | — |
| [`signup-email-verification`](../features/signup-email-verification.md) | Confirmação do e-mail por código no cadastro | confianca | médio | M | `proposed` | — |
| [`international-billing`](../features/international-billing.md) | Cobrança internacional opcional (imposto, moeda por região e formas de pagamento) | produto | médio | G | `proposed` | — |
| [`social-sign-in-providers`](../features/social-sign-in-providers.md) | Login com GitHub e Microsoft, ligados por configuração | produto | médio | M | `deferred` | ✅ `linked-sign-in-methods` |
| [`one-time-purchase`](../features/one-time-purchase.md) | Compra avulsa com acesso vitalício | produto | médio | M | `deferred` | — |
| [`account-security-mfa`](../features/account-security-mfa.md) | MFA, sessões ativas e política de senha | confianca | médio | M | `in-progress` (fatias 1 e 2 entregues, PRs #29 e #39) | ✅ `account-settings` |
| [`observability-logging`](../features/observability-logging.md) | Observabilidade: erros, tracing e logs estruturados | dx | alto | M | `in-progress` | — |

## Entregues

Specs concluídas e **arquivadas** junto da feature que as implementou.

| id | entregue em | spec arquivada |
|----|-------------|----------------|
| `firestore-admin-access` | 2026-08-31 | [`docs/features/firestore-admin-access/spec.md`](../../docs/features/firestore-admin-access/spec.md) — 5/5; **item 4 contestado e reconfirmado** por medição em 2026-09-11 (403) |
| `ci-pipeline` | 2026-09-01 | [`docs/features/ci-pipeline/spec.md`](../../docs/features/ci-pipeline/spec.md) — ⚠️ fechada com 1 item do corte em aberto |
| `api-hardening` | 2026-09-09 | [`docs/features/api-hardening/spec.md`](../../docs/features/api-hardening/spec.md) — 5/5 do corte entregues |
| `transactional-emails` | 2026-09-10 | [`docs/features/transactional-emails/spec.md`](../../docs/features/transactional-emails/spec.md) — 6/6 do corte |
| `auth-recovery-verification` | 2026-09-11 | [`docs/features/auth-recovery-verification/spec.md`](../../docs/features/auth-recovery-verification/spec.md) — 5/5 do corte, conferidos um a um |
| `file-upload-storage` | 2026-09-14 | [`docs/features/file-upload-storage/spec.md`](../../docs/features/file-upload-storage/spec.md) — 5/5 do corte (PR #11, `9154776`). ⚠️ 6 critérios "não verificados" por o Cloud Storage não estar ativado |
| `account-settings` | 2026-09-15 | [`docs/features/account-settings/spec.md`](../../docs/features/account-settings/spec.md) — 6/6 do corte (PR #12, `a4df5ed`). ⚠️ O caminho feliz do **avatar** segue não verificado contra infra real |
| `firebase-emulator-seed` | 2026-09-15 | [`docs/features/firebase-emulator-seed/spec.md`](../../docs/features/firebase-emulator-seed/spec.md) — 5/5 do corte (PR #13, `8107f3f`) |
| `cookie-consent` | 2026-09-16 | [`docs/features/cookie-consent/spec.md`](../../docs/features/cookie-consent/spec.md) — 6/6 do corte (PR #16, `7c8ff7c`). ⚠️ Reabertura da escolha na `apps/app` só existe depois do login |
| `cursor-pagination` | 2026-09-16 | [`docs/features/cursor-pagination/spec.md`](../../docs/features/cursor-pagination/spec.md) — 5/5 do corte (PR #17, `c36e084`). ⚠️ O índice composto novo **precisa ser publicado** |
| `audit-log` | 2026-09-17 | [`docs/features/audit-log/spec.md`](../../docs/features/audit-log/spec.md) — 5/5 do corte (PR #18, `f08a84f`). ⚠️ **Três desvios registrados**; o índice composto de `auditEvent` **precisa ser publicado**. A imutabilidade da trilha ganhou uma exceção nomeada na PR #23 (`anonymizeUserLabels`) |
| `dashboard-home` | 2026-09-17 | [`docs/features/dashboard-home/spec.md`](../../docs/features/dashboard-home/spec.md) — 5/5 do corte (PR #19, `bfc4d8f`). ⚠️ **Três índices compostos** precisam ser publicados |
| `session-refresh` | 2026-09-17 | [`docs/features/session-refresh/spec.md`](../../docs/features/session-refresh/spec.md) — 6/6 do corte (PR #20, `cc93229`). ⚠️ A **revogação ponta a ponta segue 🔒 não verificada** |
| `user-activity-tracking` | 2026-09-19 | [`docs/features/user-activity-tracking/spec.md`](../../docs/features/user-activity-tracking/spec.md) — 5/6 do corte (PR #21, `e656331`). ✅ O item 4 parcial foi pago pela entrega de `data-rights-lgpd` |
| `admin-analytics-dashboard` | 2026-09-23 | [`docs/features/admin-analytics-dashboard/spec.md`](../../docs/features/admin-analytics-dashboard/spec.md) — 5/5 do corte (PR #22, `03498ae`). Gráfico entregue como histograma de recência |
| `data-rights-lgpd` | 2026-09-23 | [`docs/features/data-rights-lgpd/spec.md`](../../docs/features/data-rights-lgpd/spec.md) — **5/5 do corte** (PR #23, `ab11a5b`), item 3 dividido: arquivos sem prova contra bucket real, assinatura transferida para `billing-subscription` e paga pela PR #25. **Quatro derivas registradas** |
| `onboarding-flow` | 2026-09-24 | [`docs/features/onboarding-flow/spec.md`](../../docs/features/onboarding-flow/spec.md) — **5/5 do corte** (PR #24, `d52c4f0`), 20/20 critérios sob o emulador. Deriva no item 3, o deep link que voltava sem a query string: **fechada pela PR #47** (`apps/app/proxy.ts:285`, `:247`). O texto da spec arquivada (`spec.md:246`) descreve a deriva como aberta e não foi editado |
| `billing-subscription` | 2026-09-25 | [`docs/features/billing-subscription/spec.md`](../../docs/features/billing-subscription/spec.md) — **6/6 do corte** (PR #25, `a1f87d0`), mais o passo `billing` do expurgo herdado de `data-rights-lgpd`. 19 ✅ e 5 🔒 no `/test` (só conta Stripe real prova). ⚠️ Catálogo, portal, endpoint de webhook e chaves são passo manual por fork (`PRE-PRODUCTION.md` §12) |
| `admin-billing-insights` | 2026-09-25 | [`docs/features/admin-billing-insights/spec.md`](../../docs/features/admin-billing-insights/spec.md) — **5/5 do corte** (PR #27, `0659ede`). 18 ✅, 4 🔒 e 1 ❌ anterior à entrega (hidratação em `/en` e `/es`). ⚠️ **Duas derivas** contra o bloco de reescopo, sem efeito na tela, aceitas pelo usuário; o endpoint da Stripe de cada fork precisa ganhar `invoice.paid` (`PRE-PRODUCTION.md:542`, âncora remedida em 2026-10-20, pós-PR #52; era `:456`) |
| `e2e-testing` | 2026-09-25 | [`docs/features/e2e-testing/spec.md`](../../docs/features/e2e-testing/spec.md) — **4/5 do corte e 1 parcial** (PR #26, `c71755e`). ⚠️ O item 2 roda em toda PR mas **não bloqueia o merge** até o branch protection ser ligado (E3). O `STATE.md` segue com `test: blocked` pelo D3, corrigido na própria PR; o job `e2e` passou nas quatro execuções seguintes |
| `brand-config` | 2026-09-28 | [`docs/features/brand-config/spec.md`](../../docs/features/brand-config/spec.md) — **5/5 do corte** (PR #30, `e07252a`), 14 ✅, 0 ❌ e 1 🔒 no `/test` (nome não ASCII na Resend). Primeira spec entregue depois de passar por `approved`. ⚠️ Marca, logo e ícones por fork são passo manual (`PRE-PRODUCTION.md` §13) |
| `storage-emulator-rules-tests` | 2026-09-28 | [`docs/features/storage-emulator-rules-tests/spec.md`](../../docs/features/storage-emulator-rules-tests/spec.md) — **5/5 do corte** (PR #31, `2c285de`), 18 ✅, 0 ❌ e 1 🔒 no `/test`; o 🔒 (`verify` no GitHub) passou no merge, com 170 testes contra emulador. Segunda spec entregue depois de passar por `approved`. ⚠️ Deriva no item 5: o `build` não roda os testes contra emulador. Publicar `storage.rules` e ativar o bucket seguem passo manual (`PRE-PRODUCTION.md` §6) |
| `accessibility-conformance` | 2026-09-29 | [`docs/features/accessibility-conformance/spec.md`](../../docs/features/accessibility-conformance/spec.md) — **6/6 do corte** (PR #32, `3e5ec4c`), allowlist do axe vazia e `e2e` 22/22 no merge. Terceira spec entregue depois de passar por `approved`. ⚠️ Duas derivas de letra (título por área, `aria-invalid="false"` sem erro); checkout em carregamento e leitor de tela real seguem 🔒. O diff introduziu e corrigiu antes do merge o "Excluir" ilegível no hover |
| `account-email-change` | 2026-09-29 | [`docs/features/account-email-change/spec.md`](../../docs/features/account-email-change/spec.md) — **5/5 do corte** (PR #33, `f377c84`), 16 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real do aviso pela Resend). Quarta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no comportamento; o diff introduziu e corrigiu antes do merge dois defeitos de foco no diálogo novo. Resend, `FIREBASE_WEB_API_KEY` e o e-mail de suporte são passo manual por fork (`PRE-PRODUCTION.md` §3, §4 e §13) |
| `compliance-docs-kit` | 2026-09-30 | [`docs/features/compliance-docs-kit/spec.md`](../../docs/features/compliance-docs-kit/spec.md) — **6/6 do corte** (PR #34, `c7aa4d9`), 18 ✅, 0 ❌ e 2 🔒 no `/test` (backup no Blaze e conformidade jurídica). Quinta spec entregue depois de passar por `approved`. ⚠️ Cinco derivas sem efeito no conteúdo. Preencher os `[FORK]`, aceitar os DPAs e decidir o backup são passo manual por fork (`PRE-PRODUCTION.md` §14) |
| `plan-entitlements` | 2026-10-04 | [`docs/features/plan-entitlements/spec.md`](../../docs/features/plan-entitlements/spec.md) — **5/5 do corte** (PR #38, `2ed0df2`), 15 ✅, 0 ❌ e 1 🔒 no `/test` (entrega real da Stripe). Entregue sem passar por `approved` (E4). Sem deriva. ⚠️ Recursos cadastrados no Dashboard da Stripe, o sexto evento no endpoint e o custo do Entitlements são passo manual por fork (`PRE-PRODUCTION.md` §12, a partir da `:506`, que era `:456` até a PR #52); a demo em `entity` fica desligada sem `NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE` |
| `pricing-page-catalog` | 2026-10-16 | [`docs/features/pricing-page-catalog/spec.md`](../../docs/features/pricing-page-catalog/spec.md) — **5/5 do corte** (PR #47, `dd31a95`), 21 ✅, 0 ❌ e 3 🔒 no `/test` (catálogo, chamadas e checkout contra conta Stripe real). Sexta spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: rota nova `GET /payments/catalog`, cache de uma hora por instância, rota fora do rate limit de propósito, e quem tem sessão volta pelo bounce do proxy. Fechou a deriva do deep link de `onboarding-flow` e um open redirect em `packages/auth/redirect.ts`. Nenhum passo manual novo: o catálogo é o mesmo do `PRE-PRODUCTION.md` §12 |
| `linked-sign-in-methods` | 2026-10-19 | [`docs/features/linked-sign-in-methods/spec.md`](../../docs/features/linked-sign-in-methods/spec.md) — **6/6 do corte** (PR #48, `44b2b04`), 13 ✅, 0 ❌ e 3 🔒 no `/test` (popup real do Google, "User account linking" e `auth/unauthorized-domain` num projeto Firebase real). Sétima spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: desvincular no servidor, desvincular a senha encerra todas as sessões, definir senha também encerra todas, e `provider.tsx` intacto. Escolher o "User account linking" do projeto e autorizar os domínios do popup são passo manual por fork (`FORKING.md` §4, passos 3 e 4; declaração em `PRE-PRODUCTION.md:1225`, a seção da declaração, remedida em 2026-11-23 pós-PR #73; era `:1178` até a PR #73, `:1153` até a PR #71, `:1112` até a PR #65 e `:1103` até a PR #64) |
| `contact-support-channel` | 2026-10-19 | [`docs/features/contact-support-channel/spec.md`](../../docs/features/contact-support-channel/spec.md) — **5/5 do corte** (PR #49, `4eeb07b`), 16 ✅, 0 ❌ e 4 🔒 no `/test` (entrega real pela Resend, confirmação vista no navegador, `429` com `ARCJET_KEY` e e-mail preenchido num domínio real). Oitava spec entregue depois de passar por `approved`. ⚠️ Quatro derivas sem efeito no que o corte pedia: sem Resend o aviso só aparece no envio, o ROPA já tinha a atividade, o item do menu depende de `NEXT_PUBLIC_WEB_URL` e só aparece no painel comum, e cerca de vinte arquivos fora do `contends_on`. Definir `NEXT_PUBLIC_APP_SUPPORT_EMAIL` na `api` e na `web` é passo manual por fork; sem ela o canal fica indisponível (`PRE-PRODUCTION.md` §13, `:927-930`, remedida em 2026-11-23 pós-PR #65; era `:911-914` até a PR #65 e `:902-905` até a PR #64) |
| `in-app-notifications` | 2026-10-20 | [`docs/features/in-app-notifications/spec.md`](../../docs/features/in-app-notifications/spec.md) — **6/6 do corte** (PR #52, `3a118c6`), 17 ✅, 0 ❌ e 3 🔒 no `/test` (evento real da Stripe, índice ausente num projeto real e a TTL apagando o documento). Entregue sem passar por `approved` (E4). ⚠️ Três derivas sem efeito no que o corte pedia: dois índices compostos em vez de um, boas-vindas só para perfil comum, e contagem com teto de 100 lida a cada 120 s. Publicar os dois índices de `notification` e ligar a TTL em `expiresAt` são passo manual por fork (`PRE-PRODUCTION.md` §1.9, `:253`); medido em 2026-10-20, os índices não estão publicados no projeto de referência |
| `magic-link-sign-in` | 2026-10-22 | [`docs/features/magic-link-sign-in/spec.md`](../../docs/features/magic-link-sign-in/spec.md) — **6/6 do corte** (PR #56, `9c793c6`), 16 ✅, 0 ❌ e 2 🔒 no `/test` (`429` com `ARCJET_KEY` e o provedor de link desligado num projeto real). Entregue sem passar por `approved` (E4). ⚠️ Uma deriva de escopo: o link vai só para conta com senha e e-mail confirmado, e o item 6 ficou atendido por construção. Ligar a variável, ativar "Link de e-mail" no console e autorizar o domínio são passo manual por fork (`PRE-PRODUCTION.md` §15, `:675-707`); desligado por padrão |
| `teams-organizations` | 2026-10-23 | [`docs/features/teams-organizations/spec.md`](../../docs/features/teams-organizations/spec.md) — **5/5 do corte** (PR #57, `61a781e`), 23 ✅, 0 ❌ e 4 🔒 no `/test` (rate limit com `ARCJET_KEY`, entrega real do convite, índices publicados e TTL dos convites). Entrou no ciclo `deferred`, por instrução de foco, e saiu sem passar por `approved` (E4). ⚠️ Item 5 com ressalva: o admin ainda arquiva um dono com membros (D10). Deriva: membros e convites atrás de `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`, desligada por padrão. Publicar os três índices de `entity` por `organizationId` antes do deploy, a TTL de convites e a variável nas duas apps são passo manual por fork (`PRE-PRODUCTION.md` §1.10 e §16) |
| `organization-ownership-transfer` | 2026-10-28 | [`docs/features/organization-ownership-transfer/spec.md`](../../docs/features/organization-ownership-transfer/spec.md) — **5/5 do corte** (PR #59, `277da43`), 16 ✅, 0 ❌ e 2 🔒 no `/test` (envio do convite e rótulo de convite enviado, sem provedor de e-mail). Entregue sem passar por `approved` (E4). ⚠️ Três derivas escritas na spec: o E2E grava o convite no emulador em vez de ler link, o dono novo fica com duas organizações (a saída e o expurgo leem a lista), e o convite enviado não grava o e-mail do convidado. A rodada 1 do `/test` reprovou "Tornar dono" pelo teclado; o `/review` corrigiu no `ActionsMenu`. Nenhum passo manual novo: valem o `PRE-PRODUCTION.md` §16 e as pendências 13, 24 e 30 |
| `app-internal-ux-polish` | 2026-11-19 | [`docs/features/app-internal-ux-polish/spec.md`](../../docs/features/app-internal-ux-polish/spec.md) — **5/5 do corte** (PR #62, `583194b`), 11 dos 13 itens de "Verificar no `/test`" confirmados, 1 parcial (o aviso de checkout, 🔒 sem Stripe) e 1 derrubado (o foco escondido pelo rodapé fixo, anterior à entrega, que virou achado). Nona spec entregue depois de passar por `approved`. Sem deriva de comportamento; o `contends_on` errou para menos (4 declarados, 59 fora da lista). Nenhum passo manual novo |
| `delivery-infra-hardening` | 2026-11-23 | [`docs/features/delivery-infra-hardening/spec.md`](../../docs/features/delivery-infra-hardening/spec.md) — **7/7 do corte** (PR #65, `afb5b35`), 12 ✅, 0 ❌ e 3 🔒 no `/test`; dois dos três 🔒 (os jobs no runner e o Dependabot cobrindo os workspaces) foram medidos depois do merge, e segue 🔒 a reprovação real de uma PR com segredo ou com dependência vulnerável. Décima spec entregue depois de passar por `approved`. ⚠️ Cinco derivas escritas na spec, entre elas o `audit` em `high` e o Gitleaks só nos commits novos; o `contends_on` acertou os sete arquivos. Restringir as chaves do Firebase, ligar os alertas do Dependabot e passar o Shield da API para `LIVE` são passo manual por fork (`PRE-PRODUCTION.md` §17, §9 e §8) |
| `delivery-product-quality` | 2026-11-24 | [`docs/features/delivery-product-quality/spec.md`](../../docs/features/delivery-product-quality/spec.md) — **9/9 do corte, em três fatias** (PR #71, `a391d1c`; PR #72, `18288c9`; PR #73, `5829ea3`). O `/test` da fatia 1 fechou com 11 ✅, 0 ❌ e 1 🔒 (o validador de Open Graph, que exige a landing publicada); o da fatia 2, com 0 ❌ e 1 🔒 (o `--url` contra uma preview da Vercel); o da fatia 3, com 14 ✅, 0 ❌ e 1 🔒 (os eventos numa propriedade GA4 real). Arquivada por decisão sua (D20) com a execução de merge da PR #73 vermelha por um E2E instável fora do corte, que a PR #74 consertou. ⚠️ Derivas escritas na spec, entre elas o 404 da landing que depende de JavaScript (E16). Fica fora do corte a home da landing abaixo da meta de desempenho da parte 3 (Performance 87 e LCP 3,9 s na mediana), estacionada em E17 |
| `delivery-security-review` | 2026-11-24 | [`docs/features/delivery-security-review/spec.md`](../../docs/features/delivery-security-review/spec.md) — **14/14 do corte, em três fatias** (PR #64, `388a453`, fatia 1; PR #74, `c58f2ef`, fatias 2 e 3). O `/test` da fatia 1 fechou com 15 ✅, 0 ❌ e 1 🔒; o da fatia 2, com 11 ✅ e 1 🔒 (o encerramento numa função da Vercel); o da fatia 3, com 10 ✅ e 2 parciais 🔒 (o envio real pela Resend e a caixa de URL sem Storage). Arquivada por decisão sua (D22) com o job `secrets` vermelho na execução de merge da PR #74, por um JWT fictício de teste; a marcação do falso positivo é tarefa direta. ⚠️ Sete derivas das fatias 2 e 3 escritas na spec; os quatro chamadores que engolem a falha da revogação seguem como achado |
| `app-form-layout-centered` | 2026-11-26 | [`docs/features/app-form-layout-centered/spec.md`](../../docs/features/app-form-layout-centered/spec.md) — **7/7 do corte** (PR #76, `a13768c`). `/test` com 10 ✅ em build de produção. Deriva: `Container.tsx` e `PageSkeleton.tsx`, declarados, não mudaram. Passo manual por fork: nenhum |
| `admin-own-account` | 2026-11-26 | [`docs/features/admin-own-account/spec.md`](../../docs/features/admin-own-account/spec.md) — **5/5 do corte** (PR #76, `a13768c`). `/test` com 14 ✅ e 1 🔒 (admin só com Google definindo senha). Deriva: o guard também cobre `POST /files` (upload pessoal) e `POST /account/password/set`. Passo manual por fork: nenhum |

**Verificado na auditoria de 2026-11-26 (pós-PR #76):** `docs/features/` tem **93** pastas e **39** `spec.md`
arquivados, todos com `status: done`. Dois arquivamentos nesta rodada, `app-form-layout-centered` e `admin-own-account`,
cada um na pasta da própria feature, sem colisão: nenhuma das duas tinha `spec.md`. As doze pastas novas de tarefa
direta não têm spec e estão em [Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec). O registro da rodada
anterior segue abaixo.

**Verificado na auditoria de 2026-11-24 (pós-PR #74):** `docs/features/` tem **80** pastas e **37** `spec.md`
arquivados, todos com `status: done`. Dois arquivamentos nesta rodada, depois da D20 e da D22: cada spec foi para a
pasta da fatia 1 dela, e nenhuma das duas pastas tinha `spec.md`. As 43 pastas sem `spec.md` são `account-security-mfa`
e `account-active-sessions` (fatias 1 e 2 da spec `in-progress`), `delivery-security-review-slice-2`,
`delivery-security-review-slice-3`, `delivery-product-quality-slice-2` e `delivery-product-quality-slice-3` (fatias
das duas specs arquivadas; os quatro `STATE.md` trazem o `spec:`, e a spec está na pasta da fatia 1),
`observability-logging` (spec `in-progress`), `auth-panel-context` e `impersonation-read-only` (as duas anteriores à
semeadura) e as trinta e quatro tarefas diretas listadas em
[Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec). No movimento, os links de saída das duas specs
foram reescritos para o caminho novo (`research/*.md`, `../docs/delivery/`, `account-security-mfa.md` e a spec
arquivada de `delivery-infra-hardening`), e os links de entrada foram corrigidos neste arquivo, em
`docs/features/delivery-infra-hardening/spec.md` e em `docs/delivery/README.md`. Os planos das fatias
(`analyze/plan.md:3` de `delivery-security-review`, `delivery-security-review-slice-2`,
`delivery-security-review-slice-3`, `delivery-product-quality`, `delivery-product-quality-slice-2` e
`delivery-product-quality-slice-3`) ficaram com link morto para `specs/`, porque a auditoria não edita os artefatos
(ver [Contradições doc × código](#contradições-doc--código)).
O verificador de links desta auditoria, um script descartável fora do repositório, sobre `specs/*.md`,
`specs/research/*.md` e os 35 `spec.md` arquivados, acha os mesmos dois alvos mortos das rodadas anteriores: o
placeholder `research/<topico>.md` do `TEMPLATE.md` e a âncora interna da spec de `session-refresh`.

## Contradições doc × código

Nenhum gate lê prosa. Pela [`cycle-policy` §4](../../.claude/cycle-policy.md), afirmação barata de medir num doc é
medida ao passar por ela. Esta tabela guarda só o que segue defasado ou errado; as linhas ✅ das rodadas anteriores
estão na versão deste arquivo em `9c793c6`. Até a rodada pós-PR #56 a auditoria não editava `docs/` (só os `spec.md`
arquivados, para mover a spec entregue e consertar os links que o movimento quebra). Desde a pós-PR #57, a pedido do
`/cycle`, ela corrige nos documentos as afirmações baratas de medir que estão falsas.

A PR #74 alterou nove documentos fora de `docs/features` e `specs`, mais o `apps/app/CLAUDE.md`: `docs/SECURITY.md`,
`docs/PRE-PRODUCTION.md`, `docs/delivery/01-security-review.md`, `docs/AUTH-SSO.md`, `docs/SETUP.md`, `docs/ROPA.md`,
`docs/SUBPROCESSORS.md`, `docs/BACKUP.md` e `docs/INCIDENT-RESPONSE.md`. A auditoria **não releu os nove linha a
linha**; conferiu por leitura, contra o código de `c58f2ef`, as afirmações que tocam o corte das fatias 2 e 3, e elas
batem: a tabela de origem do `docs/SECURITY.md` (`:190-195`) bate com `isUnprovenCookieWrite`
(`apps/api/(shared)/lib/cookie-write-origin.ts:12-20`); o aviso de que o rate limit não alcança a renovação de sessão
(`:220`) bate com `session-routes.ts:125`; o encerramento no boot do `docs/PRE-PRODUCTION.md` (`:383-386`) bate com
`apps/api/instrumentation-node.ts:8-19`; as âncoras novas da tabela de cookies (`bp:*` em `panelState.ts:19-20`, e o
`x-locale` em `apps/app/proxy.ts:250,254` e `apps/web/proxy.ts:122,126`) e as da política de sessão
(`packages/auth/session.ts:28-30`, `:97`, `:138-140`, `:155`) batem com o código. As três linhas que a PR acrescentou ao
`docs/PRE-PRODUCTION.md` em `:383-386` deslocam em +3 toda âncora do documento citada depois dessa linha; as deste
arquivo não foram remedidas uma a uma (ver [Pendências](#pendências-vivas-sem-dono)). A conferência da PR #73 está na
versão deste arquivo em `c58f2ef`, a da PR #72, na de `5829ea3`, e a da PR #71, na de `18288c9`.

A PR #75 alterou 16 documentos fora de `docs/features` e `specs` (mais `CLAUDE.md` e `README.md` na raiz). Nos que já tinham conteúdo (`docs/AUTH-SSO.md`,
`docs/BACKUP.md`, `docs/INCIDENT-RESPONSE.md`, `docs/PRE-PRODUCTION.md`, `docs/ROPA.md`, `docs/SUBPROCESSORS.md`,
`docs/review-checklist.md`, `docs/ARCHITECTURE.md`), a mudança é troca de caminho de `specs/` por linha, sem deslocar
âncora. O `docs/FORKING.md` ganhou o §0 (31 linhas), o que desloca em +31 toda âncora depois da linha 43; as deste
arquivo foram remedidas; o `docs/delivery/03-product-quality.md` cresceu só no fim, sem deslocar a âncora `:116-123` citada nos achados. Conferido por leitura, contra `b7f9124`: o `pnpm kickoff` sobe em `http://localhost:3010`
(`scripts/kickoff/server.mjs:13`) e grava em `docs/product/` por padrão (`:28-30`), como dizem o `CLAUDE.md` e o
`FORKING.md`. A parte 5 da entrega (`docs/delivery/05-legal-policies.md`) não foi relida linha a linha.

| documento | afirma | realidade medida | veredito |
|-----------|--------|------------------|----------|
| `docs/PRE-PRODUCTION.md:678-710` (item 15, novo pela PR #56) | só `"true"` liga, sem diferenciar maiúsculas; sem Resend ou sem `NEXT_PUBLIC_APP_URL` a opção some e o pedido responde `503 EMAIL_NOT_CONFIGURED`; a recusa do provedor sai como `[auth-action-link] refused kind=sign-in code=…`; desligar a variável recusa pedidos novos com `404 AUTH_EMAIL_LINK_DISABLED` e deixa os links já enviados concluírem | `email-link-sign-in.ts:4-8`; `request/route.ts:48-60`; `auth-action-links.ts:38-40`, `:102-117`; a conclusão é só no cliente (`client.ts:156-166`, era `:154-164` até a PR #73) | ✅ **honesto**, por leitura |
| `docs/SETUP.md:118-122` (novo pela PR #56) | o código do link aparece em `GET http://127.0.0.1:9099/emulator/v1/projects/demo-next-boilerplate/oobCodes` | o projeto do emulador é `DEMO_PROJECT_ID` (`packages/auth/emulator.ts:16`); o `/test` da PR leu o código por essa rota | ✅ **honesto** |
| `docs/SECURITY.md:7` | os métodos de login são "e-mail/senha ou Google" | o login por link existe desde a PR #56; a regra de quem recebe o link (conta com senha e e-mail confirmado) não aparece | ⚠️ **reduzido de novo pela PR #64**, que reescreveu a seção do rate limit (hoje `:183-218`, depois do parágrafo que a PR #71 acrescentou acima): a rota de disponibilidade do link fica fora porque todo `GET` fora da lista estrita fica (`:191`). Segue o resto da PR #56, na linha `:7`. Reconferido em 2026-11-24, pós-PR #74: a linha `:7` segue igual; as âncoras da seção do rate limit mudaram com a PR #74 e não foram remedidas aqui |
| `docs/features/delivery-infra-hardening/analyze/plan.md:3`, `app-internal-ux-polish/analyze/plan.md:3`, `organization-ownership-transfer/analyze/plan.md:3`, `teams-organizations/analyze/plan.md:3`, `magic-link-sign-in/analyze/plan.md:3` e os planos de `plan-entitlements`, `pricing-page-catalog`, `linked-sign-in-methods`, `contact-support-channel` e `in-app-notifications` (este também em `review/review.md:6`) | link para `../../../../specs/<id>.md` | as dez specs foram movidas para `../spec.md` | ❌ **onze links mortos**, criados pelos arquivamentos; o de `delivery-infra-hardening`, por este. A auditoria não edita os artefatos; ver o achado |
| `docs/features/delivery-security-review/analyze/plan.md:3`, `delivery-security-review-slice-2/analyze/plan.md:3`, `delivery-security-review-slice-3/analyze/plan.md:3`, `delivery-product-quality/analyze/plan.md:3`, `delivery-product-quality-slice-2/analyze/plan.md:3` e `delivery-product-quality-slice-3/analyze/plan.md:3` | link para `../../../../specs/delivery-security-review.md` ou `../../../../specs/delivery-product-quality.md` | as duas specs foram arquivadas em 2026-11-24, em `docs/features/delivery-security-review/spec.md` e `docs/features/delivery-product-quality/spec.md` | ❌ **seis links mortos**, criados pelo arquivamento desta rodada. A auditoria não edita os artefatos; os textos em código (sem link) que citam `specs/<id>.md` em `STATE.md`, `review.md` e `criterios-aceite.md` dessas pastas descrevem o caminho da época e ficaram como estavam |
| `docs/features/compliance-docs-kit/analyze/plan.md:397` | link para `../specs/reference/research/compliance-trust-baseline.md` | a PR #75 trocou `specs/research/` por `specs/reference/research/` no texto, mas o prefixo `../` já estava errado: de `analyze/`, a nota fica em `../../../../specs/reference/research/` | ❌ **link morto**, achado em 2026-11-25. Com as duas linhas acima, são **18** links mortos em artefatos de `docs/features/`, contados por script nesta rodada. A auditoria não edita os artefatos |
| `docs/features/session-refresh/spec.md:20` (arquivada) | aponta para `#entrega-—-o-que-foi-conferido` | o título `## Entrega — o que foi conferido` (`:170`) publica `#entrega--o-que-foi-conferido` | ❌ **âncora morta**, desde 2026-09-17. Achado novo |
| os `STATE.md` das PRs #37 a #56 | `review: in-progress` depois do merge, branch "proposta" que não subiu, notas citando linhas antigas deste arquivo | 25 dos 66 `STATE.md` com `review: in-progress` (recontados em 2026-10-28); as linhas citadas são de versões que as rodadas seguintes reescreveram | ⚠️ **defasados**, estacionados em E11 |
| `docs/SUBPROCESSORS.md:33` | a coleção `user` é declarada em `user.repository.ts:42` | o `super(db, "user")` está em `:46` | ⚠️ **deslocada** |
| `docs/PRE-PRODUCTION.md:581` (§12) | o gate por status é o `requirePlanApi` com `{}` | nenhuma rota usa o `requirePlanApi`; a criação de `entity` passa por `requireOrganizationApi({ plan })`, com a mesma checagem (`refusePlanRequirement`) | ⚠️ **nome defasado** pela PR #57; o comportamento descrito vale. Achado novo |
| `docs/PRE-PRODUCTION.md:220`, `:241` | "Quais das sete entradas", "Uma de sete" | 9 entradas declaradas; o texto já registra a medição de 2026-09-23 e o número de hoje | ⚠️ **histórico**, deixado para não mudar a âncora do título |
| `docs/ROPA.md:69` e `:83` | `lastAccessAt` em `user.ts:54-59`; `stripeCustomerId` e assinatura em `user.ts:62-65` | hoje `:55-60` e `:63-66` | ⚠️ **deslocadas** |
| `docs/ROPA.md` e `docs/SUBPROCESSORS.md` (inventário do perfil) | o perfil guarda telefone, avatar, preferências, onboarding, `lastAccessAt`, `stripeCustomerId` e assinatura | o perfil guarda também `entitlements` desde a PR #38 (`packages/sdk/src/types/user/user.ts:67-68`) | ❌ **omissão**. Ver o achado em [compliance-docs-kit](#-achados-da-entrega-compliance-docs-kit-2026-09-30) |
| `docs/AUTH-SSO.md:105` | o link "Ir para o painel" depende do modo, em `header/index.tsx:38` | a checagem está em `:66`, e o link em `:250-264` | ⚠️ **deslocada**; o parágrafo pertence à nota do modo `simple` (E10) |
| `docs/AUTH-SSO.md:66-71` e a pendência do modo `simple` no `PRE-PRODUCTION.md` | redirecionamento do comum para a web no `simple` | não existe; estacionado (E10) | ⚠️ nota de medição anterior segue no lugar |
| `docs/RESEARCH-tanstack-vs-next.md:40` e `:85` | `LanguageSwitcher.tsx:3`; o webhook usa `headers()` em `route.ts:4,43-44` | `LanguageSwitcher.tsx:1`; import em `webhooks/payments/route.ts:7` e chamada em `:287` | ⚠️ **deslocadas**; o documento é nota de pesquisa e não muda desde a PR #39 |
| `.claude/skills/write-tests/SKILL.md:8` | todo `vitest.config.mts` usa `environment: "jsdom"` | 2 dos 14 configs usam `jsdom`; os outros 12, `node` | ❌ **não descreve o repositório** |
| `docs/features/i18n-hydration-admin-delete-billing/test/report.md:67` | na troca suave de `/en/entities` para `/es/entities`, `lang` "passou a `es`" | o `/test` da PR #41 mediu o contrário no código anterior à correção | ❌ **afirmação não reproduzida**; sem efeito hoje |
| `docs/features/pricing-page-catalog/analyze/plan.md:349` e `develop/handoff.md:113` | o preço em BRL sai "R$ 29,00 / mes" em `es` | o `Intl` formata "29,00 BRL / mes"; o código está certo | ⚠️ **expectativa errada no plano**, já registrada nos artefatos da feature |
| `docs/features/date-input-navigation/analyze/plan.md` §9 e §10 | clicar no rótulo "Data" foca o botão; sob personificação o nascimento fica desabilitado | o clique abre o calendário; a personificação bloqueia só o envio | ⚠️ **texto do plano não descreve o código**; o `/test` corrigiu os critérios |
| `docs/features/onboarding-flow/spec.md:246` e `accessibility-conformance/spec.md:53-54`, `:166` (arquivadas) | a deriva do deep link segue aberta; o `danger` do antd recebe `colorError` em `var(...)` | o deep link fechou na PR #47 (`apps/app/proxy.ts:285`); o `colorError` é hex desde a PR #42 (`antd-app.tsx:136`) | ⚠️ **histórico**: as specs descrevem a data da entrega. Sem regressão |

## Deriva

**Deriva** = o corte foi implementado diferente do especificado, ou o mundo mudou embaixo da spec. Esta tabela guarda
as linhas das specs vivas; as derivas das specs arquivadas estão escritas nelas (as de `app-form-layout-centered` e
`admin-own-account`, na seção "Conferência da entrega" de cada uma) e nas versões anteriores deste arquivo
(a de `app-internal-ux-polish`, em `388a453`; a de `organization-ownership-transfer`, em `c9b4d9c`). As linhas de
`delivery-security-review` e `delivery-product-quality` saíram desta tabela com o arquivamento de 2026-11-24; cada
deriva está escrita na spec arquivada (a [de segurança](../../docs/features/delivery-security-review/spec.md) e a
[de qualidade do produto](../../docs/features/delivery-product-quality/spec.md)).

| id | especificado | implementado | leitura |
|----|--------------|--------------|---------|
| `account-security-mfa` (item 2) | sessões ativas "com dispositivo/origem e último uso" | navegador, sistema e tipo de aparelho tirados do user-agent, instante do login e do último uso; sem IP; app e web no mesmo navegador contam como uma sessão | **a spec estava imprecisa**. Gravar IP mudaria a natureza jurídica do dado. Nota escrita no item |
| `account-security-mfa` (item 3) | encerrar uma sessão específica | a API e os front-ends recusam a sessão encerrada; o refresh token do aparelho segue válido no Firebase | **a spec estava errada sobre o provedor**: o Firebase só revoga a conta inteira. Declarado em `docs/AUTH-SSO.md:74-76` e no `PRE-PRODUCTION.md`. Nota escrita no item |

**Deriva de pipeline da PR #74:** uma rodada do `/cycle` levou cinco pipelines no mesmo working tree e na mesma
branch, e o `/review` montou um plano de commits combinado (35 commits na última versão, gravado em
`docs/features/e2e-org-ownership-flake-and-web-api-url/review/review.md` e revisto pelas tarefas seguintes). Duas
tarefas tiveram rodada 2: a fatia 3 (o `/test` mediu o custo de memória do removedor e o `/review` o reescreveu) e o
laço de recarga (o `/test` terminou `blocked` num critério parcial e o `/review` aplicou o pós-login por carga
completa). Na fatia 2, o `/test` fechou antes do `/review` (00:37 e 00:40), e o `report.md` foi gravado pelo
orquestrador porque o harness recusou a escrita no subagent. O CI da PR reprovou no `secrets` e a PR foi mergeada
assim mesmo (D22 e E3). A da PR #73 está na versão deste arquivo em `c58f2ef`.

### Âncoras relidas em 2026-11-26, pós-PR #76

Um script descartável, fora do repositório, comparou cada âncora `caminho:linha` das specs vivas e das notas de
pesquisa contra `b7f9124` e `a13768c`, nos arquivos que a PR #76 mudou. As âncoras com caminho completo bateram todas;
as que citam só o nome do arquivo foram conferidas à mão.

| arquivo | o que mudou |
|---------|-------------|
| `account-security-mfa` | `AccountSecurityForm.tsx:154` → `:165` e `:123` → `:131` (a seção Segurança foi reescrita para servir também ao admin); `translations/packages/shared/utils.ts:60` → `:62` (dois códigos novos acima) e `:105`, `:289`, `:475` → `:107`, `:294`, `:483` (as duas últimas já estavam erradas antes da PR, eram `:290` e `:477` em `b7f9124`) |
| `audit-log-levels` | `base.repository.ts:97-103` → `:99-105` |
| `docs/features/app-internal-ux-polish/spec.md` | dois links de entrada para `admin-own-account`, de `../../../specs/features/admin-own-account.md` para `../admin-own-account/spec.md` |
| as duas specs arquivadas | links de saída para `settings-page-patterns.md` e para a spec de `app-internal-ux-polish` reescritos para o caminho novo |

Depois das correções, o verificador de links dá **zero** links mortos em `specs/` e nos 39 `spec.md` arquivados, fora o
marcador `<topico>` do `TEMPLATE.md`. Os 27 mortos dos `analyze/plan.md` estão em
[Achados da PR #76](#-achados-da-pr-76-2026-11-26).

### Âncoras relidas em 2026-11-25, pós-PR #75

A PR #75 não mexeu em código, então as âncoras de código das cinco specs auditadas em 2026-11-24 seguem valendo. A
releitura desta rodada cobriu as quatro specs novas, linha a linha contra `b7f9124`, e os documentos que a PR mudou. O
script de links (fora do repositório, descartado) passou por `specs/**` e pelos `spec.md` arquivados.

| arquivo | o que mudou |
|---------|-------------|
| `app-form-layout-centered` | `OrganizationClient.tsx:36-47` → `:36-46` e o `mx-auto` `:47` → `:46` (a spec estava errada desde a escrita; o arquivo não muda desde a PR #62). As demais âncoras do arquivo conferem |
| `signup-email-verification` | `SignUpFormClient.tsx:98-106` → `:98-107` e o comentário `:80-87` → `:81-87` (erro de escrita). As demais âncoras do arquivo conferem |
| `audit-log-levels`, `international-billing` | nenhuma: as âncoras de código e de documento das duas batem |
| `social-sign-in-providers` | `docs/FORKING.md:196` → `:227`, deslocada pelo §0 novo do `FORKING.md` |
| `account-security-mfa` | três citações ao `BACKLOG.md` (a lacuna de geolocalização, a E12 e a defasagem do `STATE.md`) passam a apontar para `reference/AUDIT.md`, para onde a reorganização levou esse conteúdo |
| notas de pesquisa | seis links mortos desde a reorganização, de `../../docs/` para `../../../docs/`: quatro em `compliance-trust-baseline.md:341-343`, um em `object-storage-costs.md:170` e um em `saas-starter-feature-benchmark.md:230` |
| este arquivo | `package.json:49` → `:52` e `:61-66` → `:64-69` (três scripts novos na raiz); `docs/FORKING.md:364` → `:395`, `:218-225` → `:249-256` e `:372-387` → `:403-418`; e as âncoras do `PRE-PRODUCTION.md` deslocadas em +3 pela PR #74 nas pendências e nas contradições |

Depois das correções, o script dá **zero** links mortos em `specs/` e nos `spec.md` arquivados, fora o marcador
`<topico>` do `TEMPLATE.md`. Os 18 mortos dos artefatos de `docs/features/` estão em
[Contradições](#contradições-doc--código).

### Âncoras relidas em 2026-11-24, pós-PR #74

As specs vivas que citavam arquivo alterado pela PR #74 com número de linha foram corrigidas, com o número antigo
entre parênteses. A conferência mapeou cada âncora pelo diff `5829ea3..c58f2ef` do arquivo e releu a linha nova.

| spec | o que mudou |
|------|-------------|
| `account-security-mfa` | `packages/auth/server.ts` (`revokeUserSessionsOrThrow` `:331-342` → `:354-365`; `verifyIdToken` `:183` → `:198`; o aplicador do `checkRevoked` `:153-166` → `:168-181` e `:185` → `:200`; o session cookie `:305-308` → `:324-327`); `session-routes.ts` (o "Sair" `:174-183` → `:177-191`; as duas rotas de sessão `:95` → `:92` e `:127` → `:125`; a renovação `:141`/`:151` → `:144`/`:154`); `session.ts:78` → `:79`, com nota de que a origem passou a ser exigida; `provider.tsx:353-365` → `:377-393`; `user-admin.schema.ts:9` → `:10`; `SignUpFormClient.tsx:129` → `:100` |
| `admin-own-account` | `account/route.ts:105`, `:115` → `:111`, `:121` |
| `delivery-product-quality` | o `AuthProvider` duplicado da landing marcado como removido (`apps/web/app/[locale]/layout.tsx:39`); `layout.tsx:24` → `:23`; `apps/api/proxy.ts:137-139` → `:141-143`; os seis pontos do `sign_up` remedidos (`SignUpFormClient.tsx:104`, `SignInForm.tsx:52`, `:53`, `googleSignInApi.ts:41`, `sign-in-form-client.tsx:146-147`, `sign-up-form-client.tsx:97-98`); a D20 com a recomendação nova |
| `delivery-security-review` | a conferência das fatias 2 e 3 com âncoras de `c58f2ef`; `apps/api/proxy.ts:70-116` → `:74-118`; `revokeUserSessions` `:336-342` → `:359-365`; as âncoras das lacunas 1.x ficaram como estavam, descrevendo o código anterior, com nota |
| `observability-logging` | `apps/api/proxy.ts` (`:124` → `:128`; o UUID `:179` → `:187`; `:225` → `:245`; `:132-133` → `:136-137`); `entity-photo.ts:93` → `:118`; `apps/api/instrumentation.ts` (`:20` → `:21`; `:76-77` → `:83-84`; `:58-74` → `:59-81`; e as duas internas, `:40-44` → `:60-67` e `:46-50` → `:31-46`, que já não batiam antes); `packages/email/index.ts:41-51` → `:42-52` e `:122-132` → `:123-133`; o item dos `console.error` de `@repo/auth` marcado como migrado |
| `one-time-purchase` | `docs/PRE-PRODUCTION.md:604-607` → `:607-610`, deslocada pelas três linhas que a PR acrescentou em `:383-386` |
| `social-sign-in-providers` | `provider.tsx:371`, `:378`, `:381-384` → `:399`, `:406`, `:409-412`; `googleSignInApi.ts:27-97` → `:27-96`; `apps/api/proxy.ts:70-92` → `:74-96` e `:73` → `:77`; o botão do Google em `SignInForm.tsx:197-207` → `:157-167`; o link por e-mail em `:210-219` → `:178-187` (a âncora anterior já apontava para o link de senha esquecida) |

Nenhuma nota de `research/` cita arquivo alterado pela PR #74. Os 27 caminhos distintos de `contends_on` existem.

Neste arquivo foram remedidas as âncoras das linhas que a auditoria editou: os textos em inglês de
`googleSignInApi.ts` (`:61`, `:75`), o laço da conta arquivada (`apps/app/proxy.ts:271-286`), os quatro chamadores
da revogação (`server.ts:359-365`) e seis âncoras de `apps/api/proxy.ts` (o orçamento de `GET /payments/plans`, o
estrito de checkout e portal, o comentário do catálogo, o `/auth/sign-up` na lista estrita, o `retryAfterSeconds`
homônimo e a lista estrita da pendência 24). As demais âncoras deste arquivo em arquivos que a PR mexeu ficaram como
estavam; as do `docs/PRE-PRODUCTION.md` posteriores a `:383` estão deslocadas em +3. As âncoras dentro de texto
histórico ("era `:N` até a PR #X") ficaram como estavam.

### O que a auditoria **não** encontrou

**Em 2026-11-25:** nenhuma regressão possível pela PR #75, que não mexeu em código. O `e2e` vermelho dela é um teste
que não abre o menu de ações, e os outros 44 testes, que cobrem login, cadastro, SSO, CRUD de `entity` e organização,
passaram nas duas execuções. A suíte do repositório foi remedida nesta auditoria (ver
[Gates](#gates-medidos-nesta-auditoria)).

**Em 2026-11-24:** Nenhuma spec `done` perdeu código. A PR #74 mexeu em peças de `session-refresh` (as rotas de sessão, que passaram a
exigir `Origin`), de `account-active-sessions` (o "Sair" local, `sessionDELETE`, que mudou de assinatura), de
`file-upload-storage` (o upload, que ganhou o teto por leitura e a remoção de metadados), de `account-settings` (o
avatar, que ganhou a allowlist) e de `linked-sign-in-methods` (o Google da app e da landing, que ganhou o pós-login por
carga completa e a trava no cadastro). As cinco seguem inteiras: o `e2e` da execução de merge passou com 45 testes
(login, cadastro, SSO, saída nos dois sentidos, CRUD de `entity` e organização), e a suíte do repositório passou nesta
auditoria (ver [Gates](#gates-medidos-nesta-auditoria)). Nenhuma entrega parcial órfã além da fatia 3 de
`account-security-mfa`, que é a E12.

## Achados: correções pontuais, não specs

Coisas que não merecem spec própria, mas que são correções pontuais. Viram tarefa direta no `/analyze`.

> **Adendo de 2026-11-26 (madrugada, working tree):** onze tarefas diretas resolvidas no working tree, nenhuma
> fechada aqui (ver [Tarefas diretas resolvidas no working tree](#tarefas-diretas-resolvidas-no-working-tree-2026-11-26-aguardando-commitmerge)),
> e 12 achados novos (🟡 2, 🟢 9, 🔒 1) em
> [Achados das tarefas diretas da madrugada](#-achados-das-tarefas-diretas-da-madrugada-2026-11-26-ainda-no-working-tree).
> Abertos: **192** (🟡 57, 🟢 131, ⚠️ 2, ⚪ 1, 🔒 1), somando ao placar abaixo; caem quando o merge for conferido.
>
> **Auditoria de 2026-11-25 (pós-PR #75).** A PR #75 não alterou nenhum arquivo de `apps/` nem de `packages/`, então
> nenhum achado de código fechou nem mudou; as âncoras de código desta seção valem em `b7f9124`. As poucas que apontam
> para arquivos que a PR mexeu (`package.json` da raiz e `docs/FORKING.md`) foram remedidas.
> **Placar: 0 fechados · 7 novos, um em [Achados da PR #75](#-achados-da-pr-75-2026-11-25), três em [Achados do `/test` de `app-form-layout-centered`](#-achados-do-test-de-app-form-layout-centered-2026-11-25-ainda-no-working-tree) e três em [Achados do `/test` de `admin-own-account`](#-achados-do-test-de-admin-own-account-2026-11-25-ainda-no-working-tree) · 180 abertos** (🟡 55, 🟢 122,
> ⚠️ 2, ⚪ 1): o placar de 2026-11-24 mais os novos. A contagem não foi refeita linha a linha nesta rodada.
>
> **Auditoria de 2026-11-24 (pós-PR #74).** A PR #74 alterou 79 arquivos de código, teste e configuração e nove
> documentos fora de `docs/features` e `specs`. As linhas desta seção que a PR fechou ou mudou foram relidas em `main`
> (`c58f2ef`); as âncoras foram remedidas nessas linhas (ver [Âncoras relidas](#âncoras-relidas-em-2026-11-24-pós-pr-74)).
> **Placar: 9 fechados · 4 reduzidos (1 rebaixado de 🟡 a 🟢) · 8 novos, em
> [Achados da PR #74](#-achados-da-pr-74-2026-11-24) · 173 abertos** (🟡 52, 🟢 118, ⚠️ 2, ⚪ 1), pela contagem direta
> das linhas com marcador de severidade nas tabelas `| achado |` desta seção. Os placares das auditorias anteriores, de
> 2026-10-23 à noite de 2026-11-23, estão nas versões deste arquivo em `afb5b35`, `a391d1c`, `18288c9`, `5829ea3` e
> `c58f2ef`.
>
> **Absorvidos por spec `approved`:** nenhum. Os que a fatia 2 e a fatia 3 de `delivery-security-review` absorviam
> foram entregues pela PR #74, menos os quatro chamadores que engolem a falha da revogação, que a fatia 2 deixou de
> fora (Q9) e voltaram a ser tarefa direta.

### ⚠️ Achados abertos, reconferidos ou herdados

Reconferidos a cada auditoria desde 2026-10-04, a última em 2026-10-28, pós-PR #59, que não tocou nenhum dos arquivos citados. A PR #57 tocou `apps/api/proxy.ts` e o `docs/SECURITY.md`, citados na linha das rotas de `payments/`; as âncoras foram remedidas.

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **O modo `simple` não restringe o painel comum** (A1) | `apps/app/app/[locale]/(authenticated)/(common)/layout.tsx` (não lê o modo) · `packages/next-config/product-mode.ts:12-23` (sem `commonUserUsesPanel`) · `docs/AUTH-SSO.md:66-71` | O documento descreve um redirecionamento que não existe, e uma pendência do `PRE-PRODUCTION.md` partia dele. Hoje o `simple` só esconde a cobrança. Estacionado (E10): o usuário decidiu ignorar o modo por ora |
| 🟡 **`GET /payments/plans` chama a Stripe a cada requisição e está fora do rate limit** (reduzido em 2026-11-23, pós-PR #64; era "as rotas de `payments/` que chamam a Stripe") | `apps/api/app/(routes)/payments/plans/route.ts:12-28` (`listPlans` sem cache) · `apps/api/proxy.ts:106-119` (`GET` só conta quando está na lista estrita; era `:104-116` até a PR #74) | Cada chamada lista os preços na Stripe. Exige sessão comum, então o abuso depende de conta válida, mas um cliente em loop consome a cota de API da Stripe do fork. **Reduzido:** a PR #64 pôs `POST /payments/checkout` e `POST /payments/portal` no orçamento estrito (`apps/api/proxy.ts:94-95`, era `:90-91` até a PR #74), e a seção do rate limit do `docs/SECURITY.md` foi reescrita. `GET /payments/catalog` segue fora de propósito e responde do cache de uma hora (`apps/api/proxy.ts:59-61`, era `:55-57` até a PR #74). O histórico das âncoras está na versão deste arquivo em `388a453` |
| 🟡 **`findByStripeCustomerId` devolve o documento cru, sem mapper** (ampliado em 2026-10-04) | `apps/api/(shared)/repositories/user.repository.ts:87-98` (era `:71-82` até a PR #50) | `{ ...(live.data() as UserDTO), id }` entrega `Timestamp` onde o tipo promete `Date`. Hoje o webhook só lê `id` e `stripeCustomerId`, então não quebra nada. A PR #38 deu ao método um segundo chamador, `reconcileEntitlements` (`webhooks/payments/route.ts:156`), que também só lê o `id`. Com o A2 fechado, o perfil arquivado já não tem assinatura viva quando o webhook deixa de achá-lo; quebra no primeiro chamador que ler uma data. Contraria a regra de ouro 5 (normalizar no mapper) |
| 🟡 **`.env.example` da `apps/app` e da `apps/web` publicam `STRIPE_*`, que nenhum dos dois lê** (A3) | `apps/app/.env.example:26-27` · `apps/web/.env.example:5-6` | Quem configura o fork põe a chave secreta em dois apps que não precisam dela. Só a `apps/api` lê (`PRE-PRODUCTION.md` §12 já diz isso) |
| 🟡 **Lacunas de teste do arquivamento pelo admin** (nova, PR #28; ampliada em 2026-10-19, pós-PR #50) | `apps/api/app/(routes)/users/[id]/route.ts:202-228` (era `:194-220` até a PR #58 e `:192-204` antes) · `apps/api/__tests__/usersAdminDeleteBilling.test.ts` · `usersAdminArchiveAccess.test.ts` | Não há teste para o cancelamento que passa seguido do soft delete que falha (Firestore fora) nem para o duplo clique no "Sim" do diálogo. **Ampliada:** desde a PR #50 a desativação no Auth fica entre os dois passos; se o soft delete falhar depois dela, a conta fica desativada com o perfil vivo, e os sete casos de `usersAdminArchiveAccess.test.ts` não cobrem isso. Pela leitura é recuperável: a nova tentativa repete a desativação, que não tem efeito numa conta já desativada. O `/review` da PR descreveu por leitura o primeiro caso como recuperável: a assinatura já cancelada conta como cancelada na tentativa seguinte (`(shared)/lib/billing.ts:164`, âncora remedida em 2026-10-04) |

### 🆕 Achados da entrega `e2e-testing`

Registrados pelo `/review` da suíte E2E. Eram três: a allowlist e o gatilho do `ActionsMenu` fecharam com a PR
#32 e estão na lista de fechados. O CTA do hero segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O CTA primário do hero diz "Entrar" e leva a `/contact`** | `apps/web/app/[locale]/(home)/components/hero.tsx:28-42` (destino em `:36`) · o mesmo par no bloco final (`cta.tsx:29`, `:33`) | Texto e destino não combinam. A suíte E2E não afirma esse comportamento, para não transformar o defeito em contrato. Reconferido em 2026-09-29: a PR #32 trocou o `Button` por `Link` com `buttonVariants` e manteve rótulo e destino. **Medido de novo pelo `/test` da PR #49 (2026-10-19):** o link chega ao formulário de contato, que agora entrega, e o rótulo segue `cta.primaryCta` ("Entrar", "Sign In", "Iniciar sesión"); destinos em `hero.tsx:36` e `cta.tsx:29` |

### 🆕 Achados da fatia 1 de `account-security-mfa` (PR #29)

Vindos do plano, do `/review` e do `/test` da fatia, conferidos no código em 2026-09-27. Nenhum bloqueia a
entrega; os três ficaram fora dela por decisão registrada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Reenviar o cadastro depois de conta criada e login falho responde `USERS_AUTH_EMAIL_ALREADY_IN_USE`** | `apps/app/.../sign-up/components/SignUpFormClient.tsx:127-136` (era `:119-126` até a PR #73, `:112-119` até a PR #47) · `apps/web/.../sign-up/components/sign-up-form-client.tsx:54-63` (era `:50-57` até a PR #73, `:34-40` até a PR #55, que acrescentou o pedido de verificação no `onSuccess`) | A criação e o login são duas chamadas. Se a primeira passa e a segunda falha (rede, 429, cookie de sessão), a pessoa reenvia, recebe "e-mail já cadastrado" e precisa ir ao login por conta própria. O `/review` deixou como está porque a correção muda o fluxo; a alternativa registrada é tentar o `signIn` quando o reenvio receber esse código logo depois de um 201 na mesma tela |
| 🟡 **`create-dev-admin.mjs` não aplica a política de senha** | `apps/api/scripts/create-dev-admin.mjs:36-46` | O script cria administrador com qualquer senha que o Firebase aceite (6 ou mais). Fora da fatia por decisão do plano (P4): o script roda em Node puro e repetir a constante criaria a 12ª cópia. Afeta só quem opera o fork |
| 🟡 **Sem `ARCJET_KEY`, nada limita a criação de contas em massa** | `apps/api/proxy.ts:76` (`/auth/sign-up` na lista estrita; era `:72` até a PR #74) · `docs/PRE-PRODUCTION.md:772-774` · `docs/SECURITY.md:216` (âncora remedida em 2026-11-23, pós-PR #71, era `:207` até a PR #71 e `:187` até a PR #65; as três foram remedidas também depois da PR #64, quando eram `:62`, `:770-772` e `:173`) | A rota cria a conta pelo Admin SDK, que não passa pelo limite do Firebase de 100 contas por hora por IP. A rota está na lista de rate limit, mas o limite é no-op sem a chave. Está escrito nos dois documentos; o critério 19 do `/test` ficou 🔒 |

### Segurança: seguem abertos, confirmados no código

**Pós-PR #74 (2026-11-24):** O ⚠️ do gate de `CORS_ORIGIN` que não derrubava o processo fechou com a PR #74 (fatia 2 de `delivery-security-review`); a renovação de sessão foi reduzida. Ver [Achados da PR #74](#-achados-da-pr-74-2026-11-24).

| achado | onde | por que importa |
|--------|------|-----------------|
| ⚠️ **Superfície não-guardada da API: 18 de 56** arquivos de rota exportam handler nu, 12 deles `/auth/*` (recontado em 2026-10-28, pós-PR #59) | `apps/api/app/(routes)/auth/**` · `apps/api/app/(routes)/payments/catalog/route.ts` · `apps/api/app/(routes)/contact/route.ts` · `apps/api/app/(routes)/invitations/preview/route.ts` | **Recontado em 2026-10-28, pós-PR #59:** 56 arquivos, 38 com guard; a rota nova de transferência tem guard, então os nus seguem 18. O `docs/SECURITY.md:17-19` dizia 55 e 37 e foi corrigido nesta auditoria. **Ampliado em 2026-10-23, pós-PR #57:** 55 arquivos, 37 com guard (`find "apps/api/app/(routes)" -name route.ts` e `grep -LE "require(CommonPanel\|Admin\|Plan\|Organization)Api"`; sem `Organization` no padrão o `grep` dá 28, porque dez rotas passaram para o guard novo). A PR #57 acrescentou `POST /invitations/preview`, nua por desenho: quem abre o convite ainda não tem sessão, o token é a prova, e a rota está na lista de rate limit. Os 18 nus: 12 em `/auth/*`, os dois `health`, o webhook de pagamento, o catálogo, o contato e a prévia do convite. Cada um tem motivo, e o `docs/SECURITY.md:17-24` traz a conta certa desde esta auditoria. A série anterior (37, 40, 41, 45 e 47 arquivos) está nas versões deste arquivo até `61a781e` |
| 🟡 **O endpoint de renovação de sessão está fora do rate limit** (reduzido em 2026-11-24, pós-PR #74; era "…e aceita requisição sem `Origin`") | `packages/auth/session-routes.ts:125` (a rota) · `docs/SECURITY.md:220` (o aviso) | **Reduzido:** a fatia 2 de [`delivery-security-review`](../../docs/features/delivery-security-review/spec.md) passou a exigir `Origin` do mesmo host ou `Sec-Fetch-Site: same-origin` nas quatro rotas de sessão (`packages/auth/session.ts:79-90`, chamada em `session-routes.ts:129`). Segue o rate limit: o orçamento da `apps/api` não alcança a rota, que vive nas front-ends, e o documento diz isso. Desde a PR #39 a rota também pergunta à API se a sessão foi encerrada noutro aparelho antes de renovar |

### 🟡 Dependências, exports e código morto

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Dependência importada sem ser declarada**: `apps/app/env.ts:1` importa `@repo/email/keys` sem `@repo/email` no `package.json`; `apps/web` importa `@repo/auth` em **8 arquivos** sem declará-lo | `apps/app/package.json` · `apps/web/package.json` | Reconferido, os dois `grep` no `package.json` devolvem 0. Funciona por hoisting; o turbo não invalida `web#*` quando `@repo/auth` muda |
| 🟡 `packages/auth/package.json:13` exporta `./client-ui` para arquivo **inexistente** | `packages/auth/package.json:13` | Reconferido em 2026-10-22, pós-PR #56: `client-ui.tsx` não existe, e o export segue em `:13` |
| 🟡 **`packages/email/package.json` não tem `main` nem `exports`** | `packages/email/package.json` | Reconferido: 0 |
| 🟡 **`input-otp.tsx` é código morto** | `packages/design-system/components/ui/input-otp.tsx` | Reconferido: só ele, o barril, o `package.json` do pacote e o `playground`. `account-security-mfa` (fatia 3, segundo fator) é quem o usaria |
| 🟡 **`import-in-the-middle` e `require-in-the-middle` instalados e nunca importados** | `apps/app/package.json:27,36` | Reconferido: 0 importadores |
| 🟡 **`packages/internationalization` tem dois defeitos de `exports`** | `packages/internationalization/package.json:5-12` | Reconferido em 2026-09-26, depois da PR #28 mexer no arquivo: falta `"./utils/*"`, e `"."` (`:6`) aponta para `index.ts`, que não existe |
| 🟡 **`isRateLimitEnforced()` é export morto** | `packages/security/index.ts:53` (era `:48` até a PR #65 e `:30` até a PR #64) | Reconferido em `main` em 2026-10-03: a PR #36 passou a função a ler a chave por chamada (`readArcjetKey()`), e ela segue sem chamador fora dos testes. As 9 referências estão em `__tests__/rateLimit.test.ts`. Reconferido em 2026-11-23, depois das PRs #64 e #65: a função segue sem chamador |
| 🟡 **`FormattedError.retryAfterSeconds` sem consumidor** fora dos testes | `packages/shared/utils/helpers/formattedError.ts:14,23` | Reconferido. O homônimo de outro tipo em `apps/api/proxy.ts:171` (âncora remedida em 2026-11-24, depois da PR #74, que a levou de `:163`; antes, em 2026-11-23, depois da PR #64; era `:139` desde a PR #58 e `:129` antes) segue sem relação |
| 🟡 **`reloadCurrentUser` sem teste próprio** | `packages/auth/client.ts:266` (era `:261` até a PR #73, `:244` até a PR #56 e `:214` até a PR #48) | Reconferido em 2026-10-22: só testes que a mockam (`useEmailVerification.test.tsx` e, desde a PR #48, `accountSignInMethodsPanel.test.tsx` e `useSignInMethodMutations.test.tsx`, que conferem que ela **não** é chamada). O único chamador de produção segue sendo `useEmailVerification.ts:34` |
| 🟡 **`packages/shared` tem `test` e não tem `typecheck`** | `packages/shared/package.json:11` (só `test`) | Metade fechada pela PR #32: o `@repo/design-system` ganhou a task de `test` (`packages/design-system/package.json:7`, 45 testes). Falta o `typecheck` do `packages/shared`, adiado desde a primeira auditoria. **Medido em 2026-10-14:** `tsc --noEmit` sobre os 21 arquivos do pacote, com um `tsconfig` temporário fora do repositório, dá 0 erros neles e 2 `TS2580` em `packages/internationalization/utils.ts:22-23` (`process` sem `@types/node`, que o pacote não declara). A correção é o script, um `tsconfig.json` e o `@types/node` que os outros workspaces já usam. P. **Ampliado em 2026-10-16, pós-PR #47:** o pacote passou a guardar o formatador de preço (`formatPlanPrice.ts`), que a landing e a aba de cobrança usam; ele continua checado só pelo `typecheck` da `app` e da `web`, que o importam |
| 🟡 **`welcomeEmail` sem chamador de produção** (reduzido em 2026-10-19, pós-PR #49) | `packages/email/templates/welcome.tsx:50` | Reconferido em 2026-10-20, pós-PR #52: `git grep welcomeEmail` fora de testes acha só a definição. A PR #52 criou as boas-vindas como notificação no sino (`user-merge.ts:94-99`), sem o e-mail; mandar ou não o e-mail de boas-vindas segue decisão de produto. **Reduzido:** a outra metade da linha, o formulário de contato de fachada para onde o canal de privacidade caía, fechou com a PR #49; o formulário entrega na caixa de suporte ou diz que o canal está indisponível. A spec `in-app-notifications`, entregue pela PR #52, usou as boas-vindas como produtor de notificação, não de e-mail |
| 🟡 **`useListAuditEvents.test.tsx` deixa trabalho do React pendente depois do teardown** (novo, 2026-09-28) | `apps/app/__tests__/useListAuditEvents.test.tsx:55-70` (um `QueryClient` por teste, sem `clear()` nem `unmount` ao fim) | A suíte da `apps/app` falhou em 2 de 6 execuções locais em 2026-09-28 com `ReferenceError: window is not defined`, que o Vitest atribui a este arquivo: os testes passam e o erro não tratado reprova a task. Na auditoria pós-PR #31 passou nas 6 execuções (688 testes cada) na pós-PR #32 também (6 de 6, 702 testes cada) e na pós-PR #33 também (6 de 6, 756 testes cada), então o acumulado era 2 falhas em 24; com as execuções das rodadas pós-PR #34, #35, #36, #39, #40, #41, #42, #43, #44 (três, 841 testes cada), #45 e #46 (uma cada, 846 testes), #47 (uma, 861 testes), #48 (uma, 914 testes), #49 (uma, 919 testes), #50 (uma, 924 testes), #51 (uma, 924 testes), #52 (uma, 958 testes), #53 (uma, 968 testes), #54 (uma, 975 testes), #55 (uma, 1001 testes), #56 (uma, 1045 testes), #57 (uma, 1099 testes), #58 (uma, 1099 testes) e #59 (uma, 1108 testes) e as duas da auditoria pós-PR #63 (1198 testes; uma delas reprovou por outro arquivo), nenhuma com falha neste, é 2 em 61. O arquivo não muda desde a PR #18. O CI passou nas execuções de merge das PRs #29 a #63. Correção provável, não testada: limpar o `QueryClient` e desmontar o hook no `afterEach`. Tarefa direta P |

### 🟡 Repositório, rotas e proxy

**Pós-PR #74 (2026-11-24):** O TTL do `x-locale` e o helper de cookie sem `Secure` fecharam com a PR #74 (fatia 2 de `delivery-security-review`). Ver [Achados da PR #74](#-achados-da-pr-74-2026-11-24).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`userRepository.list()` mente no tipo de retorno** | `apps/api/(shared)/repositories/user.repository.ts:187` (era `:171` até a PR #50) | Declara `Promise<UserDTO[]>`, devolve o merge com o Auth e descarta linhas em silêncio (`:197`). N+1 do Admin SDK. Décima primeira rodada aberto; âncoras desceram com os métodos de recursos da PR #38 (remedidas em 2026-10-04) |
| 🟡 **`userRepository` tem cinco métodos com semântica própria de "quantos usuários existem"** | `user.repository.ts:171` · `:183` · `:187` · `:206` · `:224` (eram `:155`, `:167`, `:171`, `:190` e `:208` até a PR #50) | `touchLastAccess`, `purgeProfile`, `list`, `summary` e `activitySummary`. O cartão de total pode mostrar mais do que a tabela lista, e nada na tela explica |
| ⚪ **`cors.ts` allow-lista `x-locale`, que só existe como cookie** | `apps/api/(shared)/lib/cors.ts:17` | Reconferido. `x-role` (`:16`) **não** é resíduo |
| 🟡 **O papel do painel viaja em dois headers** | `packages/sdk/src/client/base.ts:45,53,61,95` | Reconferido nas quatro âncoras |

### 🟡 UI, i18n e front-end

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A mensagem de erro padrão está cravada em pt-br num pacote** | `packages/shared/utils/helpers/handleClientError.ts:19` | Reconferido, literal |
| 🟡 **O filtro por usuário da trilha não alcança evento de usuário excluído** | `admin/(pages)/audit/(components)/AuditFilters.tsx:40` | Reconferido. A exclusão de conta apaga o perfil e anonimiza os rótulos, então esses eventos ficam sem entrada no `select` |
| 🟡 **`resolveUserAuditLabel` engole a falha sem log** | `apps/api/(shared)/lib/audit-label.ts:14-16` | Reconferido |
| 🟡 **`setTimeout` sem cleanup no carrossel da landing** | `apps/web/app/[locale]/(home)/components/cases-client.tsx:29` | Reconferido: nenhum `clearTimeout` |
| 🟡 **`useHealthCheck` não exporta a função imperativa** | `apps/app/shared/hooks/useHealthCheck.ts:19` | Reconferido: um único `export` |
| 🟡 **`provider-error` não distingue as falhas do provedor de e-mail** | `packages/email/index.ts:122-132` (era `:121-131` até a PR #49) | Reconferido em 2026-09-28. Descartar o objeto de erro é deliberado |
| 🟡 **O rodapé da `apps/web` depende de `data-cookie-banner` sem teste** | `apps/web/app/[locale]/components/footer.tsx:56` | Reconferido |
| 🟡 **`turbo run` aborta na primeira falha no CI** | `.github/workflows/ci.yml:53` | Reconferido em 2026-09-29, sem `--continue`; a linha agora roda também `test:emulator` |

### 🆕 Achados do inventário da descoberta (2026-09-26)

Vistos pelos quatro inventários paralelos desta rodada. Nenhum vira spec.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A `apps/web` não tem `not-found` nem `error`** (reescrito em 2026-10-21; **reduzido** em 2026-10-21, pós-PR #54) | `apps/web/app/` (sem `layout.tsx`, `not-found.tsx` nem `error.tsx`; o `global-error.tsx` está lá desde a PR #54) · `apps/web/app/[locale]/` (sem `error.tsx`) | Rota inexistente na landing cai no 404 padrão do Next, sem tradução nem marca, e um erro dentro de um segmento sobe direto para a tela de erro global. **Reduzido:** a parte do `global-error` fechou com a PR #54 (`web-global-error`, na lista de fechados): o arquivo foi para `apps/web/app/global-error.tsx:1-29`, o build passou a usá-lo sem exigir `app/layout.tsx`, e o `/test` mediu a tela da web em build de produção nos três idiomas. `not-found` e `error` seguem M, porque pedem decisão sobre o root layout da web (PR #41). A `apps/app` tem `not-found.tsx` e `global-error.tsx` na raiz, mas nenhum `error.tsx` de segmento |
| 🟡 **O `package.json` da raiz ainda é o do next-forge** | `package.json:8-12` · `:52` (era `:49` até a PR #75 e `:48` até a PR #72; eram `:2-5` e `:42` até a PR #64, que pôs o campo `"//"` no topo) | Reconferido em 2026-11-23: a PR #64 mexeu no arquivo e manteve os três resíduos; o `FORKING.md` ("Resíduos do projeto de origem") descreve a limpeza que cada fork faz à mão. `"name": "next-forge"` e um `bin` para `dist/index.js`, gerado de `scripts/index.ts`, que não existe. `engines.node` diz `>=18` e o `.nvmrc`, `22.12.0`. Todo fork herda os três |

### 🆕 Achados do `/test` de `brand-config` (2026-09-27)

Medidos pelo `analista-qa` com o nome padrão da marca, em `build && start`, e reconferidos no código em 2026-09-28. A inicial do avatar abaixo do AA fechou com a PR #32, e o `/favicon.ico` que devolvia a home, com a PR #71. Nenhum bloqueia a entrega; o detalhe e o repro estão em [`docs/features/brand-config/test/report.md`](../../docs/features/brand-config/test/report.md).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Nome de marca com 30 caracteres quebra em duas linhas na barra lateral** | `apps/app/shared/components/ui/Sidebar.tsx` | O critério de 30 caracteres da spec só valia para o header da web. Decidir truncar ou aceitar a quebra |


### 🆕 Achados da rodada de `storage-emulator-rules-tests` (2026-09-28)

Vindos do plano e do `/test` da spec, entregue pela PR #31. Eram dois; o `alt` do avatar do menu de perfil
fechou com a PR #32 e está na lista de fechados. O outro segue aberto.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Nada impede um `*_EMULATOR_HOST` em produção** | `packages/auth/emulator.ts:27-32`, `:44` · `apps/app/env.ts:27` · `apps/app/shared/lib/storageEnabled.ts:6` | Nenhuma checagem de boot recusa um host de emulador configurado por engano, e isso vale também para o `FIREBASE_STORAGE_EMULATOR_HOST` e o `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` novos. Se só a variante `NEXT_PUBLIC_` for copiada para a Vercel, o app mostra o seletor de arquivo e põe `http://<host>` no `img-src` da CSP; o upload falha com `error.code` e nada vaza. É o risco R-5 do plano da spec, deixado fora do corte |

**Lacunas de teste herdadas do `/review` e do `/test` da entrega, com o veredito da auditoria pós-PR #31 (a PR #32
não tocou nesses arquivos):**

| lacuna | veredito 2026-09-29 | motivo |
|--------|---------------------|--------|
| Nenhum teste da `apps/app` renderiza o seletor com só o host de emulador | **continua aberta**, fora do corte | cobertura atual: `storageEnabled.test.ts` e `securityPolicySources.test.ts` |
| O `signReadUrl` emulado não codifica o `path` | **continua aberta, condicional** | só vira defeito se o `STORAGE_OBJECT_PATH_RE` (`apps/api/(shared)/lib/storage.ts:26-27`) afrouxar |
| O `listAll` das rules do Storage só é testado na raiz `uploads` | **continua aberta**, risco baixo | uma mutação `allow list` em `/uploads/{uid}/{file}` passou pela suíte; não foi medido se ela abre de fato a listagem de `uploads/<uid>/` |
| Objeto que não abre sem assinatura e expiração da URL V4 | **fora de escopo** | exige bucket real (`docs/PRE-PRODUCTION.md` §6, pendência 11) |

### 🆕 Achados da entrega `accessibility-conformance` (2026-09-29)

Vindos do §12.2 do plano, do handoff, do `/review` e do `/test` da spec, entregue pela PR #32 e arquivada em
2026-09-29. Todos são anteriores ao diff ou ficaram fora do corte por decisão registrada; nenhum bloqueou a entrega.
Reconferidos no código em 2026-09-29. Os dois do `ActionsMenu` (Enter em "Excluir" e o gatilho sem
`aria-haspopup`) fecharam com a PR #40; a lista de fechados daquela rodada está na versão deste arquivo em `0a49a3b`.
O dos seed tokens do antd fechou com a PR #42, e o do `<title>` igual em todas as páginas de cada área do painel, com a
PR #73 (fatia 3 de `delivery-product-quality`). O grupo de rádio sem nome, o menu mobile da web sem nome, o `Button` que
encolhia, o `disabled` antes do spread, o `placeholder` ignorado e o rótulo da data da `/contact` fecharam com a PR #45
e estão na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **`--destructive` do claro abaixo de 4,5:1 sobre `--accent` e `--muted`** | `packages/design-system/styles/globals.css:24` | 4,38:1 no "Excluir" com foco de teclado (fundo `--accent`, medido pelo `/test`) e 4,37:1 como texto de erro dentro de card `muted` (calculado no plano). Não aparece nas rotas que a suíte cobre. **Remedido pelo `/test` da PR #42** (O1): no foco por seta, o item "Excluir" fica `#e7000b` sobre `#f5f5f5`, 4,38:1, igual no código anterior; a PR #42 não mudou o `--destructive` |
| 🟡 **Os tokens `Menu.dangerItem*` não alcançam o `Dropdown`** | `packages/design-system/providers/antd-app.tsx:97-101` (âncora remedida em 2026-10-13, pós-PR #43; era `:91-95` e, antes da PR #42, `:66-70`) | Configuração que não tem efeito onde o `danger` aparece no repo. Reconferido depois da PR #43: o item `danger` é pintado pelo `colorError` global, em hex (`:136`), e os testes esperam esse hex (`actionMenu.test.tsx:101-104`), não os tokens do `Menu`. A PR #42 não os resolveu, como a recomendação previa |
| 🟡 **A página 404 da `apps/app` sai com `document.title` vazio** | `apps/app/app/not-found.tsx:3-5` | Fica fora dos layouts do painel, que são os que ganharam `generateMetadata` |
| 🟡 **A dica do `TextareaInput` não entra no `aria-describedby`** | `packages/design-system/components/ui/textarea-input.tsx:42-43` | O `<p>` do `hint` não tem id |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-29 | motivo |
|--------|---------------------|--------|
| Links da web (hero, CTA, FAQ, preços) sem teste de componente | **continua aberta**, risco baixo | a regra `nested-interactive` do axe na suíte E2E barra a regressão nas rotas cobertas |
| Botão de checkout em carregamento | **fora de escopo** | exige chave de teste da Stripe (pendência 23) |
| Campo com erro lido por leitor de tela de verdade | **continua aberto** | o `/test` conferiu atributos na árvore de acessibilidade; nenhum NVDA ou VoiceOver rodou. Não cabe em rodada autônoma |

### 🆕 Achados da entrega `account-email-change` (2026-09-30)

Vindos do `/review`, do handoff e do `/test` da spec, entregue pela PR #33 e arquivada em 2026-09-30. Nenhum
bloqueou a entrega. Reconferidos no código em 2026-09-30. O do foco do diálogo de exclusão de conta fechou com a PR
#43 e está na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Os dois diálogos da aba de conta repetem o mesmo tratamento de foco** (ampliado em 2026-10-13; **reduzido em 2026-10-19**, pós-PR #48) | `AccountPrivacyPanel.tsx:62-63`, `:70-72` · `AccountEmailChangeDialog.tsx:70-71`, `:92-93` (âncoras remedidas em 2026-11-19; a PR #62 deslocou três delas em uma linha) | Era "`lacksPasswordProvider` duplica `requiresPrivacyChannel`". **Reduzido pela PR #48:** a checagem de provedor `password` virou uma função só (`apps/app/shared/lib/signInMethods.ts:22-23`), usada pela privacidade, pelo perfil e pela segurança. Segue duplicado o que a PR #43 acrescentou: o comentário do `onOpenAutoFocus`, palavra por palavra (`AccountPrivacyPanel.tsx:62-63`, `AccountEmailChangeDialog.tsx:70-71`), e o `onError` que devolve o foco à senha, com nome num arquivo (`focusPasswordAfterRefusal`, `AccountPrivacyPanel.tsx:70-72`) e inline no outro (`AccountEmailChangeDialog.tsx:92-93`). Se um terceiro diálogo puser o `Footer` dentro de um `AlertDialogContent`, a `cycle-policy` §3 manda corrigir no componente compartilhado |
| 🟢 **A confirmação da troca mostra o mesmo cartão de erro para qualquer código** | `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx:88-95` (era `:53-62` até a PR #64, que separou o caso de `AUTH_SESSIONS_NOT_REVOKED` em `:68-86`) | Um `429 AUTH_RATE_LIMITED` diz que o link pode ter expirado, embora o código não tenha sido gasto e recarregar resolva. Espelha o `VerifyEmailResult` por decisão do plano (§5.2) |
| 🟢 **O aviso ao endereço antigo sugere que trocar a senha resolve** | `packages/internationalization/translations/packages/email/index.ts:66`, `:142`, `:217` (eram `:58`, `:126`, `:193` até a PR #57) | "Troque sua senha agora e fale com o suporte": trocar a senha não invalida um link já emitido; quem reverte é o suporte. A frase não mente, mas a ordem engana. Decisão de copy |
| 🟢 **Endereço que o Zod aceita e o Admin SDK recusa vira 500** | `apps/api/(shared)/lib/auth-action-links.ts:162-169` (era `:122-129` até a PR #56) · `account/email/route.ts:127-137` | Se `getUserByEmail` responder `auth/invalid-email`, o erro sobe e a rota devolve `500 ACCOUNT_UPDATE_FAILED`, com `error.code` e sem stack. Raro, não vaza nada |
| 🟢 **Código de troca aplicado direto no Identity Toolkit pula a revogação e a trilha** | `auth/email-change/confirm/route.ts:82`, `:98-108` (eram `:79` e `:91-101` até a PR #64) · `docs/SECURITY.md:13` (era `:12` até a PR #48) | Quem tem o link e a chave web pública aplica o código sem passar pela rota. O e-mail muda, as sessões antigas não caem pela revogação explícita e o evento não é gravado. Declarado no documento; fora do corte |


**Lacunas de teste herdadas da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
| Confirmação contra o emulador de Auth sem teste automatizado | **continua aberta**, fora do corte; **ampliada em 2026-10-19** | o `test:emulator` sobe Firestore e Storage, não o Auth (decisão D13 do plano); o `/test` mediu à mão. A PR #48 repetiu o caso, e virou achado em [Achados da PR #48](#-achados-da-pr-48-2026-10-19) |
| Comportamento do Firebase de produção (conferir sem gastar, link pendente que perde a validade, gerador que recusa endereço em uso) | **fora de escopo** | exige projeto real; declarado no `PRE-PRODUCTION.md` §3 |
| Entrega real dos dois e-mails | **fora de escopo**, 🔒 | pendência 13 |

### 🆕 Achados da entrega `compliance-docs-kit` (2026-09-30)

Vindos do plano, do `/review` e do `/test` da spec, entregue pela PR #34 e arquivada em 2026-09-30. O 🔴 da conta
desativada fechou com a PR #35 e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A `review-checklist.md` não cobra atualizar `SUBPROCESSORS.md` e `ROPA.md` quando entra integração nova** | `docs/review-checklist.md:37-58` (§0, transversal, sem item sobre provedor novo) · `docs/SUBPROCESSORS.md` · `docs/ROPA.md` (em `main` desde a PR #34) | A lista de subprocessadores e o registro de operações descrevem as integrações que o código tem hoje. Sem um item no checklist, o primeiro provedor novo entra no código e fica fora dos dois documentos. Apareceu no plano (`analyze/plan.md:751`) e no `/review` (`review/review.md:129`) da entrega; pela §5.1 da `cycle-policy` vira achado em vez de voltar ao relatório. Correção de documento, P. O pré-requisito (os dois arquivos em `main`) caiu com a PR #34; reconferido em 2026-09-30, `grep` por `SUBPROCESSORS` e `ROPA` na `review-checklist.md`: 0 |
| 🟡 **`ROPA.md` e `SUBPROCESSORS.md` não citam o campo `entitlements` do perfil** (novo, 2026-10-04) | `docs/ROPA.md:83` (operação de cobrança) · `docs/SUBPROCESSORS.md:33` (linha do Firestore) · `packages/sdk/src/types/user/user.ts:67-68` | A PR #38 passou a gravar no perfil a lista de recursos que a pessoa paga, vinda da Stripe pelo webhook. A exportação de dados já inclui o campo (`AccountDataExportDTO` herda o `AccountDTO`), mas os dois inventários listam o perfil sem ele. É o primeiro caso concreto do achado acima: dado novo entrou e os documentos não acompanharam. Correção de texto, P |

### 🆕 Lacunas da tarefa `disabled-account-revocation` (2026-09-30)

O achado desta tarefa (o admin que se desativava, ampliado para arquivar e rebaixar) fechou com a PR #37 e está
na lista de fechados.

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-09-30 | motivo |
|--------|---------------------|--------|
| `revokeUserSessions` lançando dentro do `PUT` | **fora de escopo** | a função engole a falha (`server.ts:326-328`) e a rota nunca vê o erro; o `catch` sem teste é anterior à tarefa |
| Pessoa desativada com o app aberto cai no sign-in com a mensagem certa, nos 3 idiomas | **continua aberta**, 🔒 | sem passada de navegador, por custo: o diff não toca UI e o 401 é o mesmo que a revogação de sessão já produzia |
| Admin desativado como alvo (critério 1 medido só com conta comum) | **continua aberta**, risco baixo | mesmo caminho de código; o `/test` não desativou a conta de QA de admin, que é compartilhada entre rodadas. Desde a PR #37 o admin não desativa a si mesmo, mas desativa outro admin |

### 🆕 Achados da tarefa `arcjet-key-lazy-validation` (2026-10-03)

Vindos do `/review` da tarefa, entregue pela PR #36, e reconferidos no `e791d3a`. Nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A regra "aparar e tratar vazio como ausente" existe em duas cópias** | `packages/security/keys.ts:35-41` (o `preprocess` do schema estrito) · `:8-17` (`trimmedString` e `arcjetKeyState`) | O schema do build e o leitor de runtime decidem cada um, por conta própria, o que é chave válida. Se uma cópia mudar, o build de `app`/`web` e a API passam a discordar. O `/review` não aplicou porque o schema estrito ficou fora do escopo por decisão do plano. P |
| 🟢 **Os `.env.example` de `app` e `web` não avisam que uma chave sem `ajkey_` derruba o build** | `apps/app/.env.example:29-30` · `apps/web/.env.example:8-9` | O comentário diz só que, sem a chave, o pacote vira no-op. O `.env.example` da `apps/api` foi atualizado pela PR #36; os outros dois ficaram fora do diff. Quem cola a chave errada descobre no deploy, que falha em "Collecting page data". Correção de texto, P |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-03 | motivo |
|--------|---------------------|--------|
| O build de `app`/`web` falhando com a chave errada, sem teste automatizado | **fora de escopo** | o build não roda no CI; `keys.test.ts` protege a causa (o schema estrito), e o `/test` mediu o build à mão |
| Chave válida contra a Arcjet real | **continua aberta**, 🔒 | exige credencial e IP de cliente; somada à pendência 24 |

### 🆕 Achados das PRs #37 a #39 (2026-10-04)

Vindos dos `/review` e `/test` das três entregas e da medição desta rodada, conferidos no código em `d92d21b`.
Nenhum bloqueou uma entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois admins que desativam um ao outro ao mesmo tempo ficam os dois desativados** | `apps/api/app/(routes)/users/[id]/route.ts:134-136` (era `:133-135` até a PR #58 e `:131-133` até a PR #50; a recusa só compara alvo e ator) | Os dois pedidos passam pelo `requireAdminApi` antes de qualquer gravação. Num fork com dois admins, o painel pode ficar sem admin ativo. Fechar exige transação ou contagem de admins ativos. Registrado pelo `/review` da PR #37, que reescreveu `docs/SECURITY.md:39` (era `:36` até a PR #57 e `:35` até a PR #49) para não prometer o contrário |
| 🟢 **O `aria-describedby` dos `HookForm*` sem descrição aponta para um id que não existe** | `packages/design-system/components/ui/form.tsx:115-119` (o `FormControl` sempre põe o id da descrição) · `hookformSwitch.tsx` e `hookformSelect.tsx`, os dois únicos com prop `description` | Todo campo de formulário do repo sem `FormDescription` publica uma referência órfã, e quem acrescentar uma descrição precisa saber que ela só liga se renderizar o `FormDescription`. Medido pelo `/test` da PR #37 no select de tipo e corrigido só ali. Parente do achado da dica do `TextareaInput`, não o mesmo. P no design system |
| 🟢 **Aparelho encerrado com a tela aberta não sai sozinho** | o `401` da API vira só toast na `apps/app`; o aviso de sessão encerrada do `AuthProvider` (`packages/auth/provider.tsx`) só dispara na troca de token ou ao recarregar | As chamadas respondem `401 AUTH_INVALID_TOKEN` e a tela mostra "Sessão inválida ou expirada." com o id da requisição, mas a pessoa segue no painel até recarregar. Medido pelo `/test` da PR #39. Sugestão registrada lá: tratar o `401` da API como sinal para conferir a sessão |
| 🟢 **O expurgo apaga as sessões antes da conta no Firebase** | `apps/api/(shared)/lib/account-erasure.ts:229-239` (era `:218-228` até a PR #59, `:126-137` até a PR #57, que pôs o passo `organization` em `:212-214`, e `:123-129` até a PR #52, que pôs o passo `notifications` entre as sessões e o perfil) | Uma requisição com credencial ainda válida que chegue entre os dois passos recria o documento da sessão pelo `trackSession`, e ele sobra depois da exclusão. O documento não tem nome nem e-mail, mas é dado pessoal residual. Inverter a ordem fecha a janela e muda o relatório de exclusão e o `accountErasure.test.ts`. Do `/review` da PR #39 |
| 🟢 **`listByUid` lê todos os documentos de sessão da conta, sem limite** | `apps/api/(shared)/repositories/session.repository.ts:66-79` · `session-tracker.ts:43-54` | A coleção guarda um documento por login e não apaga os encerrados, de propósito (o `PRE-PRODUCTION.md` proíbe TTL nela). A lista e a checagem de "encerrar as outras" leem tudo a cada sessão nova. Para conta com muitos logins, cresce sem teto; hoje não pesa. Do `/review` da PR #39 |
| 🟢 **O link do plano para a spec morre a cada arquivamento** (ampliado em 2026-10-28, pós-PR #59) | `docs/features/organization-ownership-transfer/analyze/plan.md:3` · `docs/features/teams-organizations/analyze/plan.md:3` · `docs/features/plan-entitlements/analyze/plan.md:3` · `docs/features/pricing-page-catalog/analyze/plan.md:3` · `docs/features/linked-sign-in-methods/analyze/plan.md:3` · `docs/features/contact-support-channel/analyze/plan.md:3` · `docs/features/in-app-notifications/analyze/plan.md:3` e `review/review.md:6` · `docs/features/magic-link-sign-in/analyze/plan.md:3` | Os nove apontam para `../../../../specs/<id>.md`, e as oito specs foram movidas para `../spec.md` (a de `organization-ownership-transfer`, na auditoria pós-PR #59). A auditoria só escreve em `docs/features/` para arquivar spec e não corrige o plano. Os planos de `account-active-sessions` e `account-security-mfa` têm o mesmo link e vão quebrar quando a spec deles for arquivada. Correção de uma linha por plano, ou um passo novo na `spec-audit` §4.1 |
| 🟢 **Âncoras de documento deslocadas pelas PRs #37 a #39** (reduzido em 2026-10-07: a PR #41 corrigiu a do `PRE-PRODUCTION.md:414`; ampliado em 2026-10-14 com a do `RESEARCH-tanstack-vs-next.md:40`; em 2026-10-16, a PR #46 corrigiu as contagens do `SECURITY.md` e deslocou as do `skipValidation`, e esta auditoria mediu mais duas antigas; ampliado em 2026-10-19: a PR #48 acrescentou três ações ao enum de auditoria, e as âncoras do `INCIDENT-RESPONSE.md` e do `BACKUP.md` passaram a `audit.ts:2-16` e `:34-36`; reduzido em 2026-10-19, pós-PR #49: a frase do `ROPA.md` com as âncoras da web saiu, e a PR corrigiu as seis âncoras que ela mesma deslocou; reduzido em 2026-10-21, pós-PR #53: a PR corrigiu a âncora interna do `PRE-PRODUCTION.md:552` para `account-erasure.ts:99` e as duas do `SUBPROCESSORS.md:35`; reduzido em 2026-10-28, pós-PR #59: esta auditoria corrigiu as do `INCIDENT-RESPONSE.md:64` e do `BACKUP.md:89`, que a PR #59 tinha deslocado de novo, e a do `SUBPROCESSORS.md:35`; reduzido em 2026-11-23, pós-PR #65: a PR reescreveu a linha do Arcjet do `SUBPROCESSORS.md:40`, e as cinco âncoras novas batem com o código) | `docs/SUBPROCESSORS.md:33` (`user.repository.ts:42`; o `super` está em `:46`) · `docs/ROPA.md:69`, `:83` · `docs/AUTH-SSO.md:105` · `docs/RESEARCH-tanstack-vs-next.md:85` · `docs/RESEARCH-tanstack-vs-next.md:40` (`LanguageSwitcher.tsx:3`, hoje `:1`) | Valores corretos em [Contradições](#contradições-doc--código). Metade veio do paralelo: as PRs #38 e #39 partiram do mesmo `e791d3a`, e cada uma editou documentos sem ver o deslocamento que a outra causava no código. Correção de texto, P |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-04 | motivo |
|--------|---------------------|--------|
| `PlanGate`: skeleton em light, dark e 375 px | **continua aberta** | não remedido na segunda rodada do `/test` de `plan-entitlements`; o componente é o `FormSkeleton` já usado em outras telas |
| Evento real de recursos da Stripe e paginação de `listActiveEntitlementKeys` | **fora de escopo**, 🔒 | exige conta Stripe (pendência 23) |
| `useAccountSessionMutations` com o axios real no caminho de erro (404 e 409 pela UI) | **continua aberta** | o sucesso passou pelo navegador; o erro só no teste com `apiClient` mockado |
| Latência da leitura de sessão em produção | **continua aberta**, 🔒 | medida só no emulador; somada à pendência 27 |
| Leitor de tela na recusa do próprio admin | **continua aberta**, 🔒 | o `/test` da PR #37 mediu atributos e Tab, sem leitor de tela |

### 🆕 Achados da PR #40 (2026-10-07)

Vindos do plano (§13.3) e do `/test` (§6, O1 a O4) da tarefa `action-menu-keyboard-delete`, conferidos no código e
nas bibliotecas instaladas em 2026-10-07. Todos são anteriores ao diff ou ficaram fora do corte por decisão do plano;
nenhum bloqueou a entrega. O O1 ampliou o achado dos seed tokens do antd e o O4, o do `getDictionary()` do
servidor, nas linhas deles.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Espaço não ativa item do menu de ações**, só Enter | `rc-menu` 9.16.1, `es/MenuItem.js:139` (só `KeyCode.ENTER`) · `packages/design-system/components/ui/action-menu.tsx:98-153` (era `:98-145` até a PR #59) | Vale para "Editar", "Excluir" e os itens customizados, e desde a PR #59 também para "Tornar dono". **Reconfirmado em 2026-10-28** pelo `/review` da PR #59, que o achou de novo lendo o `rc-menu`; a PR corrigiu o Enter que reabria o diálogo, não o Espaço. Quem usa Espaço para ativar o item fica sem resposta. É da biblioteca. O plano deixou como achado (§11, pergunta 4): corrigir só no "Excluir" deixaria o menu inconsistente, e corrigir em todos os itens é outra tarefa, P no design system |
| 🟢 **A confirmação de exclusão sai com `role="tooltip"` e não prende o foco** | `rc-tooltip` 6.4.0, `es/Popup.js:17` · `action-menu.tsx:71-96` | O leitor de tela anuncia uma dica, não um diálogo de confirmação destrutiva, e Tab sai do painel. O padrão para esse caso seria `alertdialog` com foco preso, o que exige trocar o `Popconfirm` por outro componente (decisão D3 do plano) |
| 🟢 **Depois de excluir, a linha some e o foco cai no `body`** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` (lista de entidades) · `Table` do `@repo/design-system` | O "Sim" devolve o foco ao gatilho, mas a mutação tira a linha da tabela, e o gatilho some com ela. Quem navega por teclado recomeça do topo da página. O plano atribuiu à `Table`, não ao menu |
| 🟢 **Ao reabrir o menu, o foco cai no último item ativo** | `rc-menu` (guarda o `activeKey`) · `action-menu.tsx:98-99` (`autoFocus`) | Medido pelo `/test` da PR #40 nos ciclos 2 e 3 de cada combinação (O2). Como "Excluir" agora responde ao teclado, ele vira o primeiro item focado na reabertura; a confirmação ainda protege |
| 🟢 **Item de menu que não navega deixa o foco no `body`** | `rc-dropdown`, no fechamento do menu · `action-menu.tsx:117-124` (itens customizados) | Medido pelo `/test` da PR #40 no "Approve" do `playground`, pelo teclado e pelo mouse (O3), num caminho que o diff não tocou. Não medido em `main` antes da PR. Afeta todo fork que acrescentar item que só dispara ação |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| `aria-expanded` voltando a `false` por clique fora com o menu aberto | **continua aberta** | sem teste; o caminho é do `rc-dropdown` e não mudou |
| Anúncio do menu e da confirmação por leitor de tela | **fora de escopo** | não há instrumento no repo; o `/test` leu os atributos |

### 🆕 Achados da PR #41 (2026-10-07)

Vindos do `/review` ("Achados para o backlog") e do `/test` (O1 e O3) da tarefa `server-locale-from-url`,
conferidos no código em `0a49a3b`. Todos existiam antes do diff; nenhum bloqueou a entrega. O O2 do `/test` (o
`<html lang>` parado na troca suave de idioma) foi corrigido dentro da própria PR e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Arquivo inexistente de um segmento na app manda o anônimo para o login em vez do 404** (O1) | `apps/app/proxy.ts:229-231` (o caminho com extensão passa pelo proxy sem checar o idioma; era `:225-227` até a PR #71 e `:215-217` até a PR #65 e `:210-212` até a PR #57) · `apps/app/lib/server/authSession.ts:35` (era `:37` até a PR #64; `requireSession` redireciona para `/<segmento>/sign-in` com o segmento que veio na URL) · `apps/app/app/[locale]/` (sem `layout.tsx` que valide o segmento) | `/favicon-novo.png` responde 307 para `/favicon-novo.png/sign-in` e, depois de três redirecionamentos, cai em `/pt-br/sign-in?redirect=...` (medido pelo `/test` da PR #41 em build). O comentário de `isStaticAssetPath` (`apps/app/proxy.ts:136-142`, era `:132-138` até a PR #65) diz que esse ramo existe para não mandar visitante ao login. Com dois segmentos (`/x/y/nao-existe.txt`) o 404 sai certo. Correção provável, não testada: `notFound()` quando o segmento `[locale]` não está em `locales`. P |
| 🟢 **Redirecionamento sem fim com `NEXT_PUBLIC_DEFAULT_LOCALE` fora da lista** | `apps/app/proxy.ts:235`, `:245-248` (eram `:231` e `:241-244` até a PR #71, `:221` e `:231-234` até a PR #65, e `:216` e `:226-229` até a PR #57) · `apps/web/proxy.ts:109`, `:120` (eram `:113` e `:124` até a PR #71 e `:99` e `:110` até a PR #65) · `packages/internationalization/utils.ts:21-24` (`getDefaultLocale()` não valida) · `packages/next-config/keys.ts:27` (`z.string().optional()`) | Com `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR`, `/` vai para `/pt-BR/`, que não é idioma válido, e o proxy redireciona de novo sem fim. Erro de configuração do fork, não de quem usa o produto. O `getDictionary()` já cai em `pt-br` nesse caso (`resolveLocale`, `utils.ts:27-38`), então só o proxy fica preso. Correção provável: os proxies usarem `resolveLocale(getDefaultLocale())`, ou o schema da env aceitar só os três valores. P |
| 🟢 **`getDictionary` e `getTranslations` ficam expostas como Server Actions** (O3) | `packages/internationalization/server.ts:1` (`"use server"`) | O build registra as duas no manifesto de Server Actions, e qualquer `POST` com o id certo recebe o dicionário inteiro (o `/test` usou isso para medir o critério 3). O conteúdo é o texto público da UI, então o risco é baixo. Trocar a diretiva por `import "server-only"` muda o contrato do módulo e pede conferir os chamadores client. P |
| 🟢 **O `next start` da web registra `Cannot assign to read only property 'redirects'`** | `apps/web/next.config.ts:15` (provável: `nextConfig.redirects = redirects` grava no objeto `config` importado de `@repo/next-config`) | Visto pelo `/test` da PR #41 no log do build de produção, fora do diff. Causa e efeito **não investigados**: se a atribuição falha, o redirecionamento `/legal` → `/legal/privacy` de produção (`next.config.ts:7-13`) pode não existir. O primeiro passo é medir, em `next build && next start`, se `/legal` ainda redireciona para `/legal/privacy`. A auditoria não sobe app (`cycle-policy` §3.1). **Ampliado em 2026-10-14:** o `/test` da PR #45 viu a mesma mensagem ("Unexpected error occurred while checking config") ao subir a web em build, com a configuração padrão e com a extrema, e o servidor respondeu normalmente; o redirecionamento de `/legal` segue não medido. Nota de leitura: o `source` é `/legal` sem idioma, e `apps/web/app/[locale]/legal/` não tem `page.tsx` (só `privacy`, `terms` e `components`), então `/pt-br/legal` não é coberto por esse redirecionamento. **Visto de novo em 2026-10-15** pelo `/test` da PR #46, nos dois builds da web (com e sem `NEXT_PUBLIC_DOCS_URL`), com a página respondendo 200; o `/legal` segue não medido. Terceira aparição: pela §5.1 a próxima passa a ser medição, não registro |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| A ligação entre o header gravado pelo proxy e o `headers()` do Server Component, sem teste automatizado | **continua aberta**, comportamento medido | o `/test` mediu os itens 1 a 9 por `curl` e navegador em build de produção; um teste automatizado exigiria servidor de pé, que o plano recusou |
| Testes de proxy presos ao formato interno `x-middleware-request-*` do Next 16.0.0 | **continua aberta**, aceita | mesmo padrão dos testes de `x-app-path` que já estavam em `main`; um upgrade do Next quebra os dois juntos |
| Caso de `lang` no Playwright | **fora de escopo** | decisão do plano (pergunta 6) |

### 🆕 Achados da PR #42 (2026-10-07)

Vindos do plano (§13.4), do `/review` e do `/test` (O1 a O5) da tarefa `antd-theme-seed-colors`, conferidos no
código em `dbcac2a`. Todos existiam antes do diff ou ficaram fora dele por decisão do plano; nenhum bloqueou a
entrega. O O1 (`--destructive` a 4,38:1 no foco do "Excluir") e o O4 (seletor de tema em inglês) ampliaram achados
que já estavam abertos, nas linhas deles; o O4 fechou com eles na PR #43. O O3 (paginação do antd em inglês) também
fechou com a PR #43 e saiu desta tabela. O O5 não é defeito: o spinner que o plano queria medir é do `Button` do
design system, não do antd.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O hash do `typecheck` no turbo ignora os pacotes internos** | `turbo.json:11-14` (`"dependsOn": []`) | O `/review` da PR #42 mediu com `pnpm turbo run typecheck --filter=app --dry=json`, com o diff do design-system no working tree: `dependencies: []`, 289 inputs, nenhum de `packages/design-system`, cache `HIT`. Uma mudança de tipo em `packages/*` pode sair verde em `pnpm turbo run lint typecheck test` no terminal e vermelha no CI, que não guarda cache do turbo. Quem roda `pnpm --filter <app> typecheck` não é afetado, e a auditoria roda com `--force`. Correção provável, não testada: `"dependsOn": ["^typecheck"]` ou o padrão de tarefa `transit` da documentação do turbo. P |
| 🟡 **O item selecionado do seletor de tamanho da paginação fica a 2,74:1 no claro** | `antd-app.tsx:133` (âncora remedida em 2026-10-13, pós-PR #43; era `:127`; o primário neutro deriva `colorPrimaryBg` e `controlItemBgActive` cinza médio) · `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx:205` (era `:195` até a PR #62; `showSizeChanger: true`, a única tabela do repo com ele) | Medido pelo `/test` da PR #42 em build: texto `#0a0a0a` sobre `#575757` no claro (2,74:1) e `#fafafa` sobre `#595959` no escuro (6,71:1). Antes da PR, com o primário em `#404040`, o claro media cerca de 1,9:1, então melhorou sem chegar a 4,5:1. Afeta só o admin, na `/admin/users`. P no design system |
| 🟢 **`useAlert` escolhe o tema do toast pelo `resolvedTheme` sem `forcedTheme`** | `packages/design-system/hooks/useAlert.ts:12`, `:22` | Mesmo padrão que o `/review` da PR #42 corrigiu no provider do antd: no `next-themes` 0.4.6, o `resolvedTheme` ignora o tema forçado. Uma página com `forcedTheme` mostraria o toast no tema salvo pelo usuário. Nenhum app passa `forcedTheme` hoje. P |
| 🟢 **Os aliases `controlOutline`, `colorErrorOutline` e `colorWarningOutline` do antd saem sem sentido** | `antd-app.tsx:57` (`colorBgContainer` em `var(...)`; âncora remedida em 2026-10-13, era `:51`) · `antd/theme/util/alias.js` (`getAlphaColor` sobre o fundo) | O antd calcula esses aliases misturando cor com o `colorBgContainer`, que é variável CSS. Pintam o foco de `Input` e `Select` do antd; no repo, só o seletor de tamanho da paginação os usa. Registrado pelo plano (§13.4), não medido no navegador |
| 🟢 **`--success` do escuro fica a 3,69:1 sobre o fundo** | `packages/design-system/styles/globals.css:66` | Calculado no plano da PR #42 (`colorSuccess` `#007a55`, 5,36:1 no claro). Abaixo de 4,5:1 para texto, acima de 3:1 para componente. Nenhum app usa o token como cor de texto hoje (`git grep` por `text-success`: 0), então o defeito é latente |
| 🟢 **O comentário das regras `.ant-table` no `globals.css` ficou impreciso** | `packages/design-system/styles/globals.css:291-294` | Diz que o hover da linha fica escuro "sem um ConfigProvider sincronizado com o next-themes". Desde a PR #42 o provider segue o tema; as regras continuam necessárias porque o fundo vem de `colorFillSecondary` em `var(...)`, mas o motivo escrito mudou. Correção de texto, P |
| 🟢 **A confirmação de exclusão do `ActionsMenu` começa em x = −15 a 390 px** (O2) | `packages/design-system/components/ui/action-menu.tsx:94` (`placement="bottom"`) | Medido pelo `/test` da PR #42: a margem interna esquerda do painel fica fora da tela; o texto começa em x = 18 e os botões cabem, então nada fica ilegível. O `HEAD` anterior não foi medido em mobile. A PR #40 trocou o `placement` para `bottom` justamente para o painel não sair da tela; resta o recuo |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-07 | motivo |
|--------|---------------------|--------|
| Indicador de carregamento da `Table` do antd | **fora de escopo** | nenhum fluxo passa `loading` à `Table`; o token `colorPrimary` cobre o caso se um fork passar |

### 🆕 Achados da PR #43 (2026-10-09)

Vindos dos planos, do handoff, dos `/review` e dos `/test` das tarefas `account-deletion-dialog-focus` e
`ui-strings-and-password-focus`, conferidos no código em `7fb2fe9`. Todos existiam antes do diff ou ficaram fora do
corte por decisão do plano; nenhum bloqueou a entrega. O menu mobile da web sem nome, que o plano da segunda listou
na §13.3, já tinha linha neste arquivo e não conta como novo. O `HookFormInputPassword` que perdia o foco no envio fechou
com a PR #45 e está na lista de fechados daquela rodada.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **`CommandDialog` com título e descrição padrão em inglês** | `packages/design-system/components/ui/command.tsx:31-32` (`"Command Palette"`, `"Search for a command to run..."`) | Lidos pelo leitor de tela quando o diálogo abre. Sem consumidor no repo hoje; o fork que adotar o componente herda o inglês. Fora do corte da PR #43 por isso. P, no molde dos oito componentes da PR |
| 🟢 **`DialogFooter` com `showCloseButton` põe um `<button>` dentro de outro** | `packages/design-system/components/ui/dialog.tsx:117-121` (`DialogPrimitive.Close` sem `asChild` em volta do `Button`) | HTML inválido e erro de hidratação no primeiro consumidor. Sem consumidor hoje (`git grep showCloseButton -- apps`: 0). Medido nesta auditoria: o caso `componentCopy.test.tsx` "nomeia os dois botões de fechar do Dialog" imprime `In HTML, <button> cannot be a descendant of <button>` no stderr do `@repo/design-system`. Defeito do shadcn, anterior à PR #43. P |
| 🟢 **Clique no overlay de um `AlertDialog` manda o foco para o `body`** | `@radix-ui/react-focus-scope` 1.1.16, `dist/index.mjs:49-50` (ignora `focusout` com `relatedTarget` nulo) · todo `AlertDialog` do repo | O diálogo não fecha, mas o foco sai dele; o Tab seguinte volta. Medido pelo `/test` de `account-deletion-dialog-focus` e anterior à mudança. É da biblioteca; fica registrado para quem auditar acessibilidade |
| 🟢 **O diálogo de troca de e-mail devolve o foco à senha também quando o erro é do e-mail** | `<account>/AccountEmailChangeDialog.tsx:92-93` (era `:91-92` até a PR #62 e `:111-112` até a PR #48) | Em `USERS_AUTH_EMAIL_ALREADY_IN_USE`, o campo errado é o novo e-mail, e o foco vai para a senha. O `onError` não lê o código porque o `FormattedError` não o expõe (pergunta P2 do plano, opção (a) adotada). Mudar exige expor `code` no `FormattedError` |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-13 | motivo |
|--------|---------------------|--------|
| Limpeza do diálogo de exclusão depois de uma exclusão bem-sucedida | **fora de escopo** | no sucesso a sessão termina e o app vai para o login; o diálogo não reabre |
| Anúncio do diálogo por leitor de tela | **continua aberta**, 🔒 | não há instrumento no repo |
| T1 sem o `SidebarRail` no celular | **continua aberta**, risco baixo | no celular a barra vira `Sheet`; o rótulo é o mesmo do caso de desktop |
| T6 com um código de recusa só | **continua aberta**, aceitável | o `onError` não lê o código, então outro código percorre a mesma linha |
| Recusa `ACCOUNT_CURRENT_PASSWORD_INVALID` e sucesso no diálogo de e-mail | **continua aberta**, 🔒 | exige a Resend (pendência 13) |
| Diálogo de preferências de cookies | **continua aberta**, 🔒 | o consentimento só aparece com um ID do Google Analytics; o rótulo "Fechar" do `Dialog` está no Vitest |
| `Pagination` do design system no navegador | **fora de escopo** | o componente não tem consumidor; o texto está no `componentCopy.test.tsx` |
| Seletores de idioma e de tema da web a 390 px | **fora de escopo** | o cabeçalho esconde os dois nessa largura; o botão do menu mobile ganhou nome na PR #45 |

### 🆕 Achados da PR #44 (2026-10-14)

Vindos do plano (§13.3), do `/review` e do `/test` (§"Achados para o backlog") da tarefa `date-input-locale`,
conferidos no código em `fa7041b`. Todos existiam antes do diff; nenhum bloqueou a entrega. O estouro do header da
web em es a 1280 px ampliou o achado do header deslogado. Fecharam com a PR #45, e estão na lista de fechados desta
rodada: o calendário que abria no mês atual, a hidratação da `/contact`, o `initialFocus` e o caso preso a outubro.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O `Calendar` grava `data-day` com `toLocaleDateString()` do navegador** | `packages/design-system/components/ui/calendar.tsx:229` | O atributo segue o idioma e o formato do navegador, não o da página. Invisível hoje: nenhum teste nem CSS do repo o lê (`git grep data-day` fora do componente: 0). Vira defeito se alguém passar a depender dele. Do plano da PR #44 (§13.3). P |
| 🟢 **Clicar no botão de enviar tira o foco do botão, e no login ele fica no `body` depois da recusa** (novo, 2026-10-14, 3ª passada, do plano de `form-field-focus-and-names`) | `packages/design-system/components/ui/button.tsx:72` (`loading` liga `disabled`) | O botão focado fica `disabled` durante o pedido, e o navegador tira o foco dele. Nos dois diálogos de conta, o `onError` devolve o foco à senha; no login, não. Lido no código; **não medido** no navegador para o clique (o `/test` mediu o Enter no campo, que passou a manter o foco). Resolver pede `aria-disabled` no lugar de `disabled` no `Button`, que muda a semântica de todo botão do repositório. Os outros seis `HookForm*` que ainda ligam `disabled` no envio (`hookformTextarea.tsx:58`, `hookformSelect.tsx:90`, `hookformSwitch.tsx:65`, `hookformDateInput.tsx:54`, `hookformImageUpload.tsx:57`, `hookformRadioGroup.tsx:57`) não enviam o formulário com Enter, então só perderiam o foco por este caminho |
| 🟢 **O asterisco de obrigatório do `Label` do design system entra no nome acessível, e a cor dele não existe** (novo, 2026-10-14, 3ª passada) | `packages/design-system/components/ui/label.tsx:27` (`<span className="text-error-500">*</span>`, sem `aria-hidden`) | Um campo `required` que usa este `Label` (`DateInput`, `TextareaInput`, `RadioGroupInput`, `ImageUploadInput`) teria o nome "Gênero *". O `FormLabel` dos `HookFormInput*` já esconde o asterisco com `aria-hidden` (`hookformInputPassword.tsx:66-72`). `git grep error-500` em `apps` e `packages`, fora do `label.tsx`: 0, então a classe não gera cor e o asterisco sai na cor do rótulo. Latente: nenhum consumidor passa `required` a esses quatro componentes hoje. Do plano de `form-field-focus-and-names` (§1.3). P |
| 🟢 **O `RadioGroupInput` recebe `required` e não repassa ao Radix** (novo, 2026-10-14, 3ª passada) | `packages/design-system/components/ui/radio-group-input.tsx` (`required` só vai ao `Label`) | O grupo não publica `aria-required`. Repassar ao Radix marca também os `input` ocultos com `required`, o que liga a validação nativa do navegador dentro do `<form>`, por isso o plano deixou de fora. Latente: nenhum grupo de rádio do repositório é obrigatório. P |
| 🟢 **O `useSubmitEnterGuard` depende de o React Query entregar o estado por `setTimeout(0)`** (novo, 2026-10-14, 3ª passada; risco, não defeito) | `packages/design-system/components/form/hookform/useSubmitEnterGuard.ts` | O hook barra o Enter enquanto o `isSubmitting` está ligado e por um `setTimeout(0)` depois, até o botão do formulário receber o `isPending` da mutação. A janela fecha porque o React Query notifica o estado nesse mesmo tempo. Um fork que troque o scheduler do React Query (`notifyManager.setScheduler`) ou dispare a mutação de outro jeito reabre a janela, e dois Enter a 2 a 5 ms voltam a mandar dois pedidos, como o `/test` mediu antes da correção. Os testes `hookformEnterResubmit.test.tsx` e `signInEnterResubmit.test.tsx` cobrem o comportamento atual. Registrado para quem mexer no React Query |
| 🟢 **Os alertas de erro mostram "(Código do erro: <uuid>)" também em recusa esperada** (novo, 2026-10-14, 3ª passada) | `packages/shared/utils/helpers/handleClientError.ts:4-11` (anexa o `requestId` a toda resposta da API) · `formattedError.ts:112-121` | Visto pelo `/test` de `form-field-focus-and-names` nos diálogos de conta: "A senha atual está incorreta. (Código do erro: …)". O código existe para a pessoa citá-lo ao suporte (PR #15, `observability-logging`), e o `panelErrorRequestId.test.tsx:115` o exige num 404. Escolher quais recusas escondem o código (só 4xx de validação? todo 4xx?) é decisão de copy e de suporte, não técnica. Fica como achado até essa decisão |
| 🟢 **Salvar as preferências em `/es` leva para `/pt-br`, porque o formulário começa com o idioma da conta** (novo, 2026-10-14, 3ª passada) | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx:66` (era `:65` até a PR #62; o campo começa com `account.preferences.locale`) · `:89-99` (grava o cookie e navega para o idioma salvo) | Medido pelo `/test` com a conta do seed, que guarda português: quem lê a tela em espanhol e salva o tema volta para o português. É o comportamento previsto da preferência de idioma, mas surpreende quem chegou pela URL. Se o campo deve começar com o idioma da URL é decisão de produto; fica como achado |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-14 | motivo |
|--------|---------------------|--------|
| Troca de idioma pela navegação do App Router sem teste automatizado | **continua aberta**, comportamento medido | o jsdom não reproduz a troca de rota; o `/test` mediu pt-br → en → es → pt-br com um marcador em `window`. Mesma lacuna da PR #43 |
| Precedência do `placeholder` do chamador no navegador | **continua aberta**, aceitável | os textos da trilha são iguais ao padrão, então a tela não distingue; o caso `:124` cobre |
| `DateInput` sob personificação | **fora de escopo** | o diff não mexeu no `disabled`; `entityFormsReadOnly.test.tsx` cobre |
| `locale={undefined}` explícito do chamador volta o `Calendar` ao `enUS` | **fora de escopo** | registrado pelo `/review` para quem ler a API (`calendar.tsx:200-202`); nenhum consumidor faz isso |

### 🆕 Achados da PR #45 (2026-10-14)

Vindos do `/test` ("Achados fora do diff" e "Menu ao navegar") e da rodada 2 do `/review` da tarefa
`web-header-reflow-and-menu-name`, conferidos no código em `eb47e80`. Eram três; o link de documentação que não
aparecia e o menu que ficava aberto fecharam com a PR #46 e estão na lista de fechados daquela rodada (versão em `dd31a95`). Sobra o que restou
do estouro do header depois da correção. O erro de `redirects` no `next start` da web, que o mesmo `/test` viu de
novo, ampliou a linha que já existia, em [Achados da PR #41](#-achados-da-pr-41-2026-10-07).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Com marca de 30 caracteres, o header da web ainda rola de lado a 1024 px** | `apps/web/app/[locale]/components/header/index.tsx:236` (grupo da direita com `w-full`) · `:39` (grade da barra a partir de `lg`; `:45`, a partir de `xl`) · `:231-233` (nome da marca), âncoras remedidas em 2026-10-16 depois da PR #46 | Medido pelo `/test` da PR #45 com `NEXT_PUBLIC_APP_NAME` de 30 caracteres: +34 px em es visitante, +26 em es logado, +11 em en logado e +4 em pt-br logado; a 1280 e 1440 px, sem rolagem. A grade antiga dava +49 e 1304 no mesmo caso, então a PR melhorou sem zerar. Causa provável, por leitura do `/review`: o `w-full` zera a contribuição mínima do grupo da direita na trilha `1fr`, e a coluna do meio nunca encolhe. Correção candidata, não medida: `lg:w-auto` ou `lg:min-w-max` no grupo e `lg:truncate` no nome, com a marca podendo sair do centro, que é decisão de produto. Desde a PR #46, com o link de documentação ligado a barra cheia só aparece a partir de 1280 px, então a 1024 px o caso só vale sem o link; a marca longa não foi medida de novo |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-14 | motivo |
|--------|---------------------|--------|
| Layout e rolagem do header sem teste automatizado | **continua aberta**, comportamento medido | o jsdom não calcula layout (decisão D6 do plano); o `/test` da PR #45 mediu 36 combinações em build, e o da PR #46, 48 com o link de documentação e as mesmas 36 sem ele |
| Evento de toque real no botão do menu | **continua aberta** | o `agent-browser` gera só mouse; o botão usa `onClick`, que o toque também dispara |
| Lista nativa do `<select>` do seletor de ano no tema escuro | **continua aberta**, 🔒 | o navegador headless não desenha a lista nativa (`/test` de `date-input-navigation`) |
| Sonda de novembro do `dateInputLocale.test.tsx` contra o código antigo | **fora de escopo** | o código antigo saiu de `main`; o caso passa hoje porque o calendário abre no mês do valor |

### 🆕 Achados da PR #46 (2026-10-16)

Vindos dos planos, dos `/review` e dos `/test` das tarefas `web-docs-link-and-mobile-menu` e
`api-auth-webhook-error-codes`, conferidos no código em `c8577b7`. Todos ficaram fora do corte por decisão
registrada ou existiam antes do diff; nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O design system declara `radix-ui: latest`** | `packages/design-system/package.json:25` | Medido pelo `/review` da tarefa da web: qualquer `pnpm install` que precise resolver de novo (bastou acrescentar três devDependencies na web) sobe o `radix-ui` de 1.6.7 para 1.8.1 no lockfile, com cerca de 1.380 linhas de diff sem relação com a tarefa. A PR #46 evitou isso editando o lockfile à mão, conferido com `--frozen-lockfile`. A próxima tarefa que instalar algo traz a atualização junto, sem ninguém ter pedido. P: fixar a versão que o lockfile tem hoje |
| 🟢 **Sem `FIREBASE_WEB_API_KEY` fora do emulador, as rotas que conferem senha respondem como se a senha estivesse errada** (ampliado em 2026-10-19, pós-PR #51) | `apps/api/(shared)/lib/firebase-identity-toolkit.ts:40-51` (lança `IdentityToolkitError` quando a chave falta) · `auth/sign-in/route.ts:32-44` · `account/password/route.ts:44` · `auth/sign-in/google/route.ts:34-46` (as três desceram com a PR #64) | O erro de configuração cai no mesmo mapeamento da credencial recusada e vira `400 AUTH_INVALID_CREDENTIALS` no login pela API (antes da PR #46 era 500), e o código equivalente nas rotas de conta. Quem configura o fork vê "senha incorreta" e não a chave faltando. Registrado pelo plano e pelo `/review` da tarefa da API. **Ampliado:** desde a PR #51 a rota do Google também responde assim (antes era 401 com a mensagem do provedor), e `authSignInGoogleToolkit.test.ts:62` fixa esse comportamento como contrato, sem citar a variável na resposta. Separar a falta de chave pede um código novo e decisão sobre o que a resposta pública pode dizer |
| 🟢 **O menu mobile da web não fecha com Escape nem com clique fora, não tem `aria-controls`, e o foco cai no `body` ao seguir um link** | `apps/web/app/[locale]/components/header/index.tsx:305-372` (o menu) · `:332`, `:359` (os links do painel) | D6 do plano, fora do corte. O `/test` mediu o foco: seguir "Início" estando na home deixa quem usa teclado sem foco visível, porque o link sai do DOM com o painel e a rota não muda. Nas outras rotas, é o comportamento comum do App Router. P, no mesmo arquivo |
| 🟢 **A 390 px, o painel do menu mobile deixa duas faixas da página à mostra** | `header/index.tsx:324` (`container absolute top-20 right-0 w-full`) | Medido pelo `/test` da PR #46: o painel vai de x = 16 a x = 359 numa janela de 375 px úteis, e o texto da página aparece nas faixas laterais de 16 px com o menu aberto. A classe não mudou no diff. P |
| 🟢 **`NEXT_PUBLIC_DOCS_URL` preenchida em dois `.env.example` que não a leem** | `apps/app/.env.example:74` · `apps/api/.env.example:87` (era `:86` até a PR #47) | D5 do plano da tarefa da web. Só a web lê a variável (`apps/web/env.ts:23`, era `:24` até a PR #65), e o `docs/SETUP.md:72` já diz isso. Quem copia o exemplo da app ou da API acha que a variável faz algo ali. Correção de texto, P |
| 🟢 **Header e footer da web decidem "link externo" de jeitos diferentes** | `apps/web/app/[locale]/components/footer.tsx:84-92`, `:109-121` (`includes("http")`) · `header/index.tsx:52` (`startsWith("http")`) | Para os valores reais (`/<locale>/...` e a URL da documentação) o resultado é o mesmo. Um caminho interno com "http" no meio abriria em aba nova só no footer. Registrado pelo `/review`; o footer não estava no diff |

O `/test` da tarefa da web também mediu, com a barra de rolagem clássica, `scrollWidth` 376 contra `clientWidth` 375
em `/<locale>/pricing` a 390 px, sem elemento passando da borda por mais de 0,5 px: arredondamento de subpixel, sem
linha própria. O da API viu o `console.error` com stack ao verificar o token de uma conta apagada
(`packages/auth/server.ts:194`), já contado entre os `console` crus de `observability-logging`.

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-16 | motivo |
|--------|---------------------|--------|
| Largura e layout do header sem teste automatizado | **continua aberta**, por desenho | medido no navegador (48, 36 e 24 combinações); o `apps/web/CLAUDE.md` reserva layout ao `agent-browser` |
| `headerMobileMenu.test.tsx` só em pt-br | **fora de escopo** | no navegador, o fechamento foi medido nos três idiomas |
| `IdentityToolkitError` de chave ausente sem teste | **reduzida** em 2026-10-19, pós-PR #51 | a rota do Google ganhou o caso (`authSignInGoogleToolkit.test.ts:62`); o `/auth/sign-in` e as rotas de conta seguem sem. Ver o achado acima |
| `429` do Arcjet no `/auth/sign-in` | **continua aberta**, 🔒 | exige `ARCJET_KEY` válida; somado à pendência 24 |

### 🆕 Achados do inventário da descoberta (2026-10-16)

Vindos do inventário da descoberta de 2026-10-16, lidos no código de `c8577b7` (pós-PR #46) e **não medidos**: a
rodada não subiu app nem rodou teste. Três tinham spec que os resolve (o da aba Segurança fechou com a PR #48, o do formulário
de contato com a PR #49, e os dois saíram da tabela); dos outros cinco, tarefa direta, o do arquivamento pelo admin
fechou com a PR #50, o da rota do Google, com a PR #51, e o da tela de erro global da app em inglês, com a PR #54, e os
três saíram também. Na
auditoria do mesmo dia, as âncoras dos oito foram conferidas (todas batem), o mecanismo do 500 do
`/auth/sign-in/google` foi medido, e o arquivamento pelo admin ganhou o fato da confirmação da tela. Os três que
restam na tabela seguem só lidos: medir exigiria subir app.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O login da landing não tem link de "esqueci a senha"** (**reduzido** em 2026-10-21, pós-PR #55) | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx` (nenhum link para a recuperação) · a app tem o fluxo em `apps/app/app/[locale]/(unauthenticated)/forgot-password/` e `reset-password/`; a landing não tem rota de recuperação | Quem esqueceu a senha e chegou pela landing precisa saber que a recuperação mora na app. A linha nasceu maior: o login não levava a lugar nenhum depois de entrar e o cadastro não pedia o e-mail de verificação. As duas partes fecharam com a PR #55 (`web-auth-forms`, na lista de fechados). Não bloqueou [`pricing-page-catalog`](../../docs/features/pricing-page-catalog/spec.md): pela D4, o CTA de preços leva ao cadastro da app. Foi também o motivo de [`magic-link-sign-in`](../../docs/features/magic-link-sign-in/spec.md), entregue pela PR #56, deixar a landing fora do corte. P |
| 🟢 **O `playground` de componentes aparece no menu lateral do usuário final** | `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx:24-30` (era `:27-33` até a PR #62, que reescreveu o menu e manteve o item) | É vitrine de quem desenvolve; num fork em produção, o usuário vê uma página de componentes de exemplo. Esconder fora do desenvolvimento, ou tirar do menu, é decisão rápida |
| 🟢 **Os menus laterais não levam às homes** | `(common)/routes.tsx:23-81` (sem item "Início"; era `:26-82` até a PR #62) · `admin/routes.tsx:18-33` (só usuários e auditoria, sem `/admin`) | A home do usuário e o painel do admin, entregues por `dashboard-home` e `admin-analytics-dashboard`, só se alcançam pelo breadcrumb ou pelo logo |

### 🆕 Achados da PR #47 (2026-10-16)

Vindos do plano (Riscos e "Achados para o backlog"), do `/review` (rodada 1) e do `/test` da spec
`pricing-page-catalog`, conferidos no código em `dd31a95`. Todos existiam antes do diff ou ficaram fora do corte por
decisão registrada; nenhum bloqueou a entrega.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **`postAuthRedirectTarget` decodifica o destino duas vezes** | `packages/auth/redirect.ts:27` (`decodeURIComponent` sobre um valor que o `searchParams.get` já decodificou) | Valores de query com `%26`, `%3D` ou `%25` perdem a codificação ao passar pelo guard, e um `%` malformado faz o destino cair no fallback. Os `priceId` da Stripe (`price_` e alfanuméricos) não são afetados. Do plano da PR #47; o `/test` o deixou fora de escopo. P |
| 🟢 **A sessão expirada leva ao login só com o caminho, sem a query** | `packages/auth/provider.tsx:87-97` (era `:80-90` até a PR #56; `expiredSessionOrigin` usa `window.location.pathname` quando não há `redirect`) | Quem estava numa listagem filtrada ou na aba de cobrança com `?plan=` volta para a página sem os filtros depois de entrar de novo. Fora do caminho do CTA de preços. Do plano da PR #47. P. Encostava em `provider.tsx`, que `linked-sign-in-methods` declarava no `contends_on`; a PR #48 não tocou o arquivo, e nenhuma spec da fila o declara mais |
| 🟢 **O guard de redirect é testado fora do próprio pacote** | `apps/app/__tests__/postAuthRedirectTarget.test.ts` testa `packages/auth/redirect.ts` | `pnpm --filter @repo/auth test` não exercita o guard que acabou de ganhar a checagem contra open redirect; só a suíte da `apps/app` pega uma regressão nele. Mover o arquivo para `packages/auth/__tests__/` resolve. Do `/review` da PR #47 (D8). P |
| 🟢 **As seções da home da web colam na borda lateral no celular** (ampliado em 2026-10-19, pós-PR #49) | `apps/web/app/[locale]/(home)/components/` (`hero.tsx`, `features.tsx`, `stats.tsx`, `cases-client.tsx`, `testimonials-client.tsx`, `faq.tsx` e `cta.tsx`, com `container mx-auto` sem padding) · `apps/web/app/[locale]/contact/components/contact-form-client.tsx:144` | Medido pelo `/test` da PR #47: sete containers começam em x = 0 a 375 px. A correção na raiz seria um padding no `container`, mas o header e o footer já compensam por fora e teriam de mudar junto; a `/pricing` resolveu com o recuo no wrapper (`px-4 md:px-2`). Do `/review` da PR #47. P a M. **Ampliado em 2026-10-19:** o `/test` da PR #49 mediu o cartão do formulário de contato encostado nas bordas a 375 px, sem rolagem horizontal; a página usa o mesmo `container mx-auto` sem padding |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-16 | motivo |
|--------|---------------------|--------|
| Proxy da app testado com `URL`, não com o `NextURL` do Next | **continua aberta** | a relativização do `Location` ganhou asserção (`proxy.test.ts`), e a resposta real foi medida em `next dev` e `next start`; o tipo `NextURL` segue fora do teste |
| Cache do catálogo por instância em serverless | **continua aberta**, 🔒 | critério 23 do `/test`; exige deploy com mais de uma instância |
| Catálogo, chamadas e checkout contra uma conta Stripe real | **fora de escopo**, 🔒 | pendência 23 |
| Layout da `/pricing` sem teste automatizado | **continua aberta**, por desenho | o `apps/web/CLAUDE.md` reserva layout ao `agent-browser`; o `/test` mediu o recuo em 375, 768 e 1280 px, claro e escuro |

### 🆕 Achados da PR #48 (2026-10-19)

Vindos do plano (Riscos), do handoff, do `/review` e do `/test` da spec `linked-sign-in-methods`, e da execução de
merge do CI, conferidos no código em `44b2b04`. Os quatro primeiros ficaram fora do corte por decisão registrada;
nenhum bloqueou a entrega. O do desvínculo da senha que deixava a conta sem e-mail fechou com a PR #51 e está na lista
de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois desvínculos simultâneos podem tirar o último método** | `account/sign-in-methods/[id]/route.ts:72` (era `:44` até a PR #51; a regra lê o `UserRecord` do início da requisição) | Numa conta com dois métodos, dois `DELETE` concorrentes, um por provedor, passam os dois pela checagem. Na mesma aba o painel impede (`AccountSignInMethodsPanel.tsx:52-53`, era `:53-54` até a PR #62); exige duas abas ou chamada direta, e só prejudica o próprio titular. O Admin SDK não oferece pré-condição no `updateUser`. Do plano e do `/review` |
| 🟢 **A prova de login recente não tolera diferença de relógio** | `apps/api/(shared)/lib/recent-google-sign-in.ts:28-29` (`ageSeconds >= 0`) | O `auth_time` vem do Firebase; um servidor com o relógio alguns segundos atrás recusaria uma prova válida com `ACCOUNT_REAUTH_INVALID`. O teste `recentGoogleSignIn.test.ts:105` fixa a recusa de `auth_time` no futuro de propósito. A janela de 300 s também não se mede no emulador, que renova o `auth_time` ao renovar o token (medido pelo `/test`) |
| 🟢 **O evento de vínculo pode faltar ou se repetir** | `account/sign-in-methods/linked/route.ts:37-56` · `useSignInMethodMutations.tsx:42-57` | O vínculo acontece no navegador e a API só grava o evento depois. Se a chamada de registro falhar, o vínculo existe e a trilha não o mostra; repetir a chamada, ou chamá-la direto com o provedor já vinculado, grava o evento outra vez. O ruído fica na trilha da própria conta. Do plano e do `/review` |
| 🟢 **`test:emulator` não sobe o emulador de Auth, e dois fluxos dependem de comportamento do Auth medido à mão** (ampliado em 2026-10-19, pós-PR #51) | `apps/api/scripts/emulator-tests.mjs` e o guard da suíte (só Firestore e Storage) · `accountSignInMethodsRoute.test.ts` (Admin SDK mockado) | **Ampliado:** a PR #51 deixou de fora de novo (§1.5 do plano de `password-unlink-email-restore`), e o `/test` dela mediu à mão no emulador de Auth as premissas da nova tentativa; o `/test` do contrato do Google mediu o `USER_DISABLED` também à mão. A rota de desvínculo supõe que o Firebase apaga o e-mail ao tirar a senha e que devolver o e-mail revoga os tokens; a confirmação da troca de e-mail (PR #33) supõe o comportamento do código de ação. As duas medições foram feitas à mão no emulador e não ficaram no repositório; uma mudança de comportamento do Firebase passa pela suíte sem ninguém ver. Incluir o Auth muda o runner, o guard e o job do CI. M. Amplia a lacuna de `account-email-change`. **Ampliado em 2026-10-22:** a PR #56 deixou o Auth de fora de novo (D11 do plano), e o `/analyze` e o `/test` mediram à mão a conclusão do link, o código não gasto pelo e-mail errado e as contas inelegíveis; o emulador diverge da produção num ponto (mantém a senha da conta não confirmada), e só a documentação sustenta o comportamento real |
| 🟢 **O CI usa `ubuntu-latest` durante a migração do rótulo para o Ubuntu 26** | `.github/workflows/ci.yml:21`, `:57`, `:99`, `:120`, `:146`, `:204` (eram quatro jobs até a PR #65, que acrescentou `secrets` e `audit`) | A execução de merge da PR #48 trouxe a anotação do GitHub: o rótulo passa a migrar para o Ubuntu 26 a partir de 2026-10-19 (<https://github.com/actions/runner-images/issues/14748>). Aquela execução ainda rodou em `ubuntu-24.04` (versão 20261012). Os jobs `verify` e `e2e` instalam JDK 21 e navegador do Playwright, que dependem da imagem; uma falha que apareça só depois da troca de imagem vai parecer culpa da PR da vez. P: fixar `ubuntu-24.04` ou acompanhar a próxima execução. Reconferido em 2026-11-23, pós-PR #65: a PR pinou as Actions por SHA e manteve o rótulo nos seis jobs |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-19 | motivo |
|--------|---------------------|--------|
| Popup real do Google, "User account linking" do projeto e `auth/unauthorized-domain` | **fora de escopo**, 🔒 | exigem projeto Firebase real; somados à pendência 17 |
| Falha da devolução do e-mail pelo produto | **continua aberta**, 🔒 | não se reproduz sem injetar falha no Admin SDK. O achado fechou com a PR #51 (nova tentativa, revogação e log); a sequência no navegador depois do `500` ficou 🔒 também no `/test` dela |
| `auth_time` acima de 300 s | **continua aberta** | o emulador renova o `auth_time`; a recusa de 301 s está só em `recentGoogleSignIn.test.ts` |
| As três ações novas do SDK sem teste no `@repo/sdk` | **continua aberta**, risco baixo | `@repo/sdk` segue com 10 testes; as ações são exercitadas pelos testes da `apps/app` com o `apiClient` mockado |

### 🆕 Achados da PR #49 (2026-10-19)

Vindos do plano ("Achados adjacentes"), do `/review` (rodadas 1 e 2) e do `/test` da spec `contact-support-channel`,
conferidos no código em `4eeb07b`. Todos existiam antes do diff ou ficaram fora do corte por decisão registrada;
nenhum bloqueou a entrega. O das rotas públicas que liam o corpo inteiro fechou com a PR #51 e está na lista de
fechados. O cartão encostado na borda a 375 px ampliou a linha das seções da home, em
[Achados da PR #47](#-achados-da-pr-47-2026-10-16); o CTA do hero, que o `/test` mediu de novo, já tinha linha em
[Achados da entrega `e2e-testing`](#-achados-da-entrega-e2e-testing).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A `apps/web` ainda declara `RESEND_*` e depende de `@repo/email`, sem enviar nada** | `apps/web/env.ts:1` (importa `@repo/email/keys`) · `apps/web/.env.example:2-3` · `apps/web/package.json:19` | Desde a PR #49 o envio do contato passa pela API, e o único uso do pacote na web é o `env.ts`. Quem configura o fork põe a chave da Resend num projeto que não a usa, como o achado A3 registra para a Stripe. **Reduzido em 2026-11-23, pós-PR #65:** o `docs/FORKING.md` §7.1 (`:316-317`) passou a mandar `RESEND_TOKEN` e `RESEND_FROM` só para a `api`; o código e o `.env.example` da web seguem iguais. P, só configuração da web |
| 🟢 **A página de contato mostra "Next Boilerplate" fixo no título e promete resposta em 24 horas** | `translations/apps/web/pages/contact/contact.ts:4`, `:49`, `:94` (`meta.title`, que também é o `<h1>`, `contact-form-client.tsx:153-155`, era `:149-151` até a PR #73) · `:11`, `:56`, `:101` (o benefício) | O título não lê a marca de `getBrand()`, e a resposta em 24 horas é um compromisso que o core não cumpre sozinho. Copy, P. Do plano da PR #49 |
| 🟢 **O `Textarea` do design system cresce sem limite de altura** | `packages/design-system/components/ui/textarea.tsx:11` (`field-sizing-content` sem `max-h`) | Medido pelo `/test` da PR #49: com 5000 caracteres, a caixa de mensagem chega a 2798 px e empurra o botão de enviar para fora da tela. Vale para todo `HookFormTextarea` e `TextareaInput`. P no design system |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-19 | motivo |
|--------|---------------------|--------|
| Entrega real pela Resend | **fora de escopo**, 🔒 | exige domínio verificado; somada à pendência 13 |
| `429` real em `/contact` com `ARCJET_KEY` | **continua aberta**, 🔒 | somada à pendência 24; a lista e o `429` estão em `corsOrigin.test.ts` |
| Confirmação de envio vista no navegador | **continua aberta**, 🔒 | depende de envio aceito, que exige Resend; o bloco usa as mesmas classes do aviso de indisponível, cujo contraste foi medido |
| E-mail preenchido com `SESSION_COOKIE_DOMAIN` num domínio real | **continua aberta**, 🔒 | somada à pendência 10; medido só em `localhost` |
| Trava do envio duplo sem passada de navegador | **continua aberta**, risco baixo | entrou na rodada 2 do `/review`, depois do `/test`; `contactFormPrefill.test.tsx` falha com a guarda antiga, e a suíte E2E não passa pela `/contact` |
| Texto de `EMAIL_SEND_FAILED` ("o e-mail") no formulário de mensagem | **fora de escopo** | decisão do plano (pergunta 3); um código próprio custa três linhas de tradução se a copy incomodar |

### 🆕 Achados da tarefa `admin-archive-access-revocation` (2026-10-19)

Vindos do `/review` e do `/test` da tarefa direta que fecha o arquivamento pelo admin sem tirar o acesso, conferidos
no working tree sobre `4eeb07b` e de novo em `main` (`4b0be90`) na auditoria pós-PR #50, que acrescentou a última
linha. Nenhum bloqueou a entrega. O do `USER_DISABLED` no `/auth/sign-in` saiu para a lista de fechados como "não
procede". O contrato de erro do `/auth/sign-in/google` com conta
desativada ampliou a linha da rota, que fechou com a PR #51 e está na lista de fechados.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Conta arquivada antes da correção entra em laço de redirecionamento se a desativação no primeiro contato falhar sempre** | `apps/api/(shared)/lib/user-merge.ts:62-68` (a falha do `revokeAccountAccess` só vai para o log; era `:60-66` até a PR #52) · `apps/app/proxy.ts:270-285` (sessão válida numa rota pública volta para a home; era `:266-281` até a PR #71 e `:256-271` até a PR #65) · `apps/app/lib/server/authSession.ts:32-37` (o 401 do `/auth/me` manda para o login; era `:34-39` até a PR #64) | Com a conta ainda habilitada no Auth, o proxy aceita o cookie, o layout recebe 401 e manda para `/sign-in`, e o proxy devolve para a home. Falha transitória se resolve na volta seguinte, que tenta desativar de novo; a persistente (o Admin SDK recusando o `updateUser`) prende a pessoa até o navegador cortar os redirecionamentos. Antes da tarefa esse caminho criava um perfil novo e não tinha laço. Saída provável: a app limpar o cookie quando o `/auth/me` responder 401 com sessão válida, o que fecha também o laço equivalente para qualquer outra falha do `/auth/me`. Não medido; o `/test` não tem como forçar a recusa persistente. P a M, `apps/app` |
| 🟢 **A primeira entrada por e-mail e senha de uma conta arquivada antes da correção volta ao formulário sem mensagem** | `packages/auth/provider.tsx:353-359` (era `:346-352` até a PR #56; `onAuthSuccess` grava o cookie e navega antes de o perfil ser consultado) · `apps/api/(shared)/lib/user-merge.ts:62-68` (a conta é desativada no `/auth/me` do layout) · `apps/app/lib/server/authSession.ts:32-37` | Medido pelo `/test`: a pessoa volta ao login sem aviso, porque o redirecionamento do servidor descarta o toast. A segunda tentativa mostra "Esta conta foi desativada.". Acontece uma vez por conta arquivada antes da correção, e é o comportamento que o plano da tarefa previu. P se alguém quiser a mensagem já na primeira vez |
| 🟢 **`actionMenu.test.tsx` "closes the open menu on Escape and returns focus to the trigger" falhou uma vez sob carga** | `packages/design-system/__tests__/actionMenu.test.tsx:447` (era `:419` até a PR #59) | No `pnpm test` da raiz, durante o `/test` desta tarefa, o caso levou 3711 ms e falhou com dois `next dev`, o Chrome do `agent-browser` e o build da app disputando a máquina. Passou nas três execuções seguintes do `/test`, na da auditoria pós-PR #50 (346 ms, com o arquivo inteiro em 14,3 s sob load 15,8), na da auditoria pós-PR #51, na da auditoria pós-PR #52 (arquivo inteiro em 21,8 s, sob load 24), nas das pós-PR #53, #54, #55 e #56 (o arquivo inteiro em 39,8 s, sob load perto de 33) na pós-PR #57 (load perto de 11), na pós-PR #58 e na pós-PR #59: 1 falha em 14. **Ampliado em 2026-11-19, pós-PR #63:** com a máquina sob load de 48 a 66, o arquivo reprovou nas duas primeiras execuções da auditoria, com dois casos de teclado por vez estourando os 20 s ("moves focus to the cancel button once the confirmation opens" nas duas; "closes on Escape and returns focus to the trigger" e "opens the confirmation when Enter is pressed on the delete item", uma vez cada), e passou na execução sequencial com load 25. Acumulado: 3 execuções com falha em 17. **Ampliado em 2026-11-23, pós-PR #64:** com load de 30 a 55, o arquivo reprovou nas três execuções da suíte (3, 1 e 1 caso; entre eles dois que ainda não tinham caído, "uses the custom delete labels from the keyboard path" e "keeps the confirm button loading until an async onDelete resolves", e este mesmo "closes the open menu on Escape", por um `waitFor` vencido aos 2,7 s) e passou isolado, 20/20. Acumulado: 6 execuções com falha em 21. O `/test` da PR #62 também viu 4 falhas no pacote sob load de 31 a 39, sem guardar os nomes. É o terceiro caso de teste instável registrado, de causa provavelmente diferente do `useListAuditEvents` (tempo, não teardown); não apareceu no CI. Ver [Detector de teste instável no CI](#lacunas-avaliadas-e-não-especificadas). P |
| 🟢 **`getMergedUserFromIdToken` não tem chamador** (novo, auditoria pós-PR #50) | `apps/api/(shared)/lib/user-merge.ts:33-49` (era `:31-47` até a PR #52; `git grep getMergedUserFromIdToken` fora de testes acha só a definição; o teste é `userMergeArchivedProfile.test.ts:180-190`) | O plano da PR #50 já registrava que a função não tinha chamador (§1.1) e mesmo assim a corrigiu e cobriu com teste, para os dois caminhos seguirem a mesma regra. É código morto mantido em par com `getMergedUserByUid`, com teste próprio que custa manutenção sem proteger caminho de produção. Apagar a função e o caso de teste, P, `apps/api` |

### 🆕 Achados da PR #51 (2026-10-19)

Vindos dos `/review` e dos `/test` das tarefas `google-sign-in-error-contract`, `password-unlink-email-restore` e
`request-body-size-limit`, conferidos no código em `9b37e02`. Eram três: o primeiro, a conexão aberta depois do `413`,
foi aberto pela própria PR e fechou com a PR #53 (lista de fechados); os outros dois existiam antes do diff. O quarto registro pedido, o `console.error` de
`revokeUserSessions` (`packages/auth/server.ts:340`, era `:334` até a PR #64), já é um dos sete de `packages/auth/server.ts` que
[`observability-logging`](../features/observability-logging.md) lista, e não ganhou linha própria. O `AUTH_INVALID_CREDENTIALS` com
a copy "E-mail ou senha incorretos." num fluxo do Google também não: é a pergunta P1 do plano, adotada com o custo
declarado, e pela tela o caminho quase não é alcançável.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **13 arquivos de teste da `api` usam dublê de `Request` sem `body`, e esses testes nunca passam pelo teto** | ex.: `apps/api/__tests__/accountRoute.test.ts:85-97` · `parse-request-json.ts:60-63` (sem stream, o helper delega ao `req.json()`; era `:55-58` até a PR #53) | Em produção não muda nada: um `Request` real com corpo sempre tem `body`. Mas um teste de rota desses arquivos não consegue provar o `413`, e o ramo `req.json()` do helper existe só por causa deles (desvio 1 do handoff, para não quebrar 95 testes). Migrar os dublês para `new Request(...)` quando alguém tocar o arquivo. Do `/review` de `request-body-size-limit`; a contagem é dele, não refeita nesta auditoria |
| 🟢 **A criação de usuário pelo admin aceita `email` sem limite de tamanho** | `apps/api/(shared)/validation/user-admin.schema.ts:8` (`z.string().email()`, sem `.max()`) | Os outros schemas usam `EMAIL_MAX = 320` (`auth.schema.ts:11`). O teto de 100 KiB do corpo limita o estrago, e a rota exige admin. Correção de uma linha. Do `/review` de `request-body-size-limit` |

**Lacunas de teste e 🔒 herdados das entregas, com veredito desta auditoria:**

| lacuna | veredito 2026-10-19 | motivo |
|--------|---------------------|--------|
| Tetos da plataforma (Vercel acima de 4,5 MB, truncamento do Next em 10 MiB) | **fora de escopo**, 🔒 | CA12 do `/test`; comportamento da plataforma, que o diff não muda |
| Revogação que falha dentro do desvínculo da senha | **continua aberta**, 🔒 | `revokeUserSessions` engole o erro (`packages/auth/server.ts:336-342`, era `:334`), então a rota nunca o vê; o `/test` leu o código. Reconferido em 2026-11-23: a PR #64 trocou a variante só nas rotas do corte e deixou esta (`account/sign-in-methods/[id]/route.ts:122`); ver o achado novo da PR #64 |
| Sequência no navegador depois do `500` do desvínculo | **continua aberta**, 🔒 | exige injetar falha no Admin SDK; o efeito esperado (sair da conta pelo `401` seguinte) está no §1.3 do plano |
| Comportamento do Auth medido à mão (apagar o e-mail ao tirar a senha, `USER_DISABLED` no `signInWithIdp`) | **continua aberta** | é o achado do `test:emulator` sem o Auth, em [Achados da PR #48](#-achados-da-pr-48-2026-10-19), ampliado nesta rodada |

### 🆕 Achados da PR #52 (2026-10-20)

Vindos do `/review` e do `/test` da spec `in-app-notifications`, conferidos no código em `3a118c6`. Eram sete; o id com
`%2F` nas rotas `[id]` (que existia antes do diff) e os três do sino (a lista com 60 s de `staleTime`, o popover na borda
e o badge depois de uma falha) fecharam com a PR #53 e estão na lista de fechados. Os três que sobram nasceram com o diff
e ficaram fora por decisão registrada. Nenhum bloqueou a entrega. O `/test` viu
uma vez dois avisos de hidratação por id do Radix no `/pt-br/playground` e não reproduziu em seis carregamentos seguintes;
sem repro, não virou linha.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **`markRead` pode achar o documento apagado e responder 500** | `apps/api/(shared)/repositories/notification.repository.ts:63-67` (`update`, que lança `NOT_FOUND`) · `notifications/[id]/read/route.ts:24-30` | Entre o `findById` da rota e a escrita, a TTL ou o expurgo podem apagar o documento. A janela é de milissegundos. Do `/review` |
| 🟢 **Dois eventos diferentes e concorrentes da Stripe podem gerar dois avisos de tipos diferentes** | `apps/api/app/(routes)/webhooks/payments/route.ts:94`, `:108-110` (o estado anterior vem de fora da transação de `applySubscriptionState`) | A reentrega do mesmo evento não duplica (o `event.id` está no id do documento); dois eventos distintos para o mesmo perfil, ao mesmo tempo, podem. Aceito no plano (§4.8). Do `/review` |
| 🟢 **Com `99+`, o badge cobre quase todo o ícone do sino** | `NotificationsBell.tsx:52-60` (era `:50-57` até a PR #53) | 31 px de badge sobre um botão de 36 px. Medido pelo `/test` com 105 não lidas. P |

**Lacunas de teste e 🔒 herdados da entrega, com veredito desta auditoria:**

| lacuna | veredito 2026-10-20 | motivo |
|--------|---------------------|--------|
| Índices publicados e TTL só existem no projeto real | **continua aberta**, 🔒 | os índices foram medidos nesta rodada (não publicados no projeto de referência); a TTL não tem leitura pelas ferramentas da auditoria. Pendências 1 e 28 |
| Corrida entre dois eventos diferentes da Stripe | **continua aberta**, aceita | virou o achado acima |
| Evento real da Stripe | **fora de escopo**, 🔒 | pendência 23 |
| As quatro ações novas do SDK sem teste no `@repo/sdk` | **continua aberta**, risco baixo | `@repo/sdk` tem 14 testes desde a PR #57, nenhum para estas; as ações são exercitadas pelos testes da `apps/app` com o `apiClient` mockado. A PR #56 somou mais duas (ver a lacuna em [Achados da PR #56](#-achados-da-pr-56-2026-10-22)) |

### 🆕 Achados da PR #53 (2026-10-20): `api-edge-413-close-and-route-id`

Vindos do `/review` e do `/test` da tarefa `api-edge-413-close-and-route-id`, conferidos na branch (`6048311`) e de novo
em `main` (`d19e6fd`) nesta auditoria: `packages/auth/keys.ts` e `file.schema.ts` não mudaram. Nenhum foi aberto pelo
diff: os dois existiam antes dele. O terceiro
registro, o gate do `CORS_ORIGIN`, ampliou a linha que já existia em
[Segurança](#segurança-seguem-abertos-confirmados-no-código).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Com o conjunto parcial da conta de serviço em `""`, o `keys()` de `@repo/auth` lança uma mensagem que não ajuda** | `packages/auth/keys.ts:49-50` (e-mail e chave lidos sem `\|\| undefined`, ao contrário de `:54-61`) · checagem em `:65-70` | O `/review` da PR #53 abriu como 🟡, supondo que o `.env.example` derrubasse o build; o `/test` mediu com um teste descartável e derrubou: com os três `FIREBASE_ADMIN_*` vazios, `keys()` não lança. Só lança com o projeto preenchido e o e-mail ou a chave vazios, e aí a mensagem é "Invalid email address", enquanto o mesmo conjunto com as variáveis ausentes recebe "is required when any other FIREBASE_ADMIN_* variable is set". Trocar por `\|\| undefined` só melhora a mensagem. P |
| 🟢 **O `413` do `/files` sai sem `connection: close`** | `apps/api/(shared)/validation/file.schema.ts:60`, `:108-109` (recusa pelo `content-length` declarado) · `:125` (âncoras deslocadas uma linha pela PR #57) | Consistência com o `parseRequestJson` da PR #53. O `/test` não mediu defeito: 20 envios de 5 MiB com `content-length` deixaram 0 conexões abertas aos 2 s, porque o `curl` fecha sozinho, e em `chunked` a rota lê o corpo inteiro pelo `formData()` antes de recusar, então não sobra corpo preso no socket. Fica como nota para quem mexer no arquivo |

**Lacunas de teste e 🔒 herdados da PR #53, com veredito desta auditoria:**

| lacuna | veredito 2026-10-20 | motivo |
|--------|---------------------|--------|
| Sem teste de rota para id inválido em `entities/[id]` e `users/[id]` (D6 do plano) | **continua aberta**, por decisão do plano | as suítes de rota mockam o repositório; a guarda tem 8 casos em `baseRepository.test.ts` e o comportamento por HTTP foi medido pelo `/test` |
| Sem teste de emulador para a guarda (D7 do plano) | **continua aberta**, por decisão do plano | a guarda age antes de qualquer chamada ao Firestore, e o espião em `fakeDb.collection` já prova isso |
| `413` com `connection: close` na Vercel | **fora de escopo**, 🔒 | exige deploy; o comportamento foi medido em `next start` |

### 🆕 Achados da tarefa `notifications-bell-freshness` (PR #53)

Vindos do `/review` (cinco 🟢 aceitos sem correção) e do `/test` da tarefa, conferidos no código de `main` (`d19e6fd`).
Nenhum é defeito de produção nem bloqueou a entrega. Dois dos cinco 🟢 do `/review` viraram lacuna de teste, abaixo
(o `LIST_STALE_MS` copiado e a releitura extra depois de uma falha, que o `/test` mediu e fechou como custo aceito).
Os três registros de ambiente do `/test` (o glob do `network route` que não casa, a página headless que se declara
oculta e a porta 3000 ocupada) mudam como o próximo `/test` repete os fluxos e ficam no relatório da feature.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A marca de "lista velha" depende de todo escritor devolvê-la, e o `fetchNextPage` tem uma corrida** | `apps/app/shared/hooks/useListNotifications.ts:15-19` (a regra, só no JSDoc) · `:60-67` (o wrapper lê a marca antes do `await`) · `useNotificationActions.ts:57-69` (`writeList`) | No React Query 5.90.20 toda escrita bem-sucedida na lista apaga a marca de invalidada. Hoje todos os escritores passam por `writeList` ou pelo wrapper; uma mutação nova que use `setQueryData` direto (apagar notificação, por exemplo) perde a marca sem aviso. E se a contagem mudar enquanto uma página está em voo, a marca posta durante o pedido some e o wrapper não a recoloca: a reabertura dentro de 60 s mostra a lista sem a novidade, o comportamento de antes da tarefa. A janela é a de um `GET /notifications` com o popover aberto. Aceito no `/review`, não medido. P se alguém quiser fechar (o `/review` descreve o caminho) |
| 🟢 **Com a contagem em erro, "marcar todas" fica desabilitado se as páginas carregadas estiverem todas lidas** | `apps/app/shared/components/notifications/NotificationsList.tsx:46` (`canMarkAll = unreadCount > 0 \|\| hasUnreadLoaded`) · `:134` | Desde a PR #53 a contagem em erro vale 0, então o botão depende só do que está carregado, mesmo com não lidas além da página. Antes, o número velho habilitava o botão. Volta quando a contagem responde. Lido pelo `/review`; o `/test` não montou o arranjo (as páginas carregadas tinham não lidas). Observação, sem correção proposta |
| 🟢 **A 375 px com scrollbar clássica, o popover do sino avança 3 px sobre a barra** | `apps/app/shared/components/notifications/NotificationsBell.tsx:65` (largura `min(24rem, calc(100vw - 1.5rem))`) · `:66` (`collisionPadding` de 12) | Medido pelo `/test`: com a barra de rolagem clássica de 15 px, o popover fica a 12 px da janela e a −3 px do `clientWidth`; com a barra sobreposta (celular real, iPhone 15 emulado), 12 px dos dois lados. Sem rolagem horizontal. O `100vw` conta a largura da barra. Era o R1 do plano. Cosmético, só em desktop estreito |

**Lacunas de teste e 🔒 herdados da tarefa, com veredito desta auditoria:**

| lacuna | veredito 2026-10-21 | motivo |
|--------|---------------------|--------|
| `LIST_STALE_MS` do teste copia o `staleTime` de 60 s do `QueryProvider.tsx:6`, que não é exportado | **continua aberta** | se o `staleTime` global mudar, o caso "reabrir sem contagem nova não relê" segue passando com o valor antigo (`useNotifications.test.tsx:62-63`). Fechar exige exportar a constante de produção |
| Corrida entre o `queryFn` da contagem e uma mutação (R4 do plano) | **continua aberta**, não medida | janela de milissegundos |
| Contagem travada em 100 não marca a lista (R2 do plano) | **fora de escopo** | aceita no plano: acima do teto, o servidor e o cache concordam em 100 |

### 🆕 Achados da PR #54 (2026-10-21)

Vindos do plano (§1.4 e §1.5), do `/review` e do `/test` de `leftover-ui-strings`, registrados pela passada incremental
da tarde, e do `/test` de `web-global-error`, conferidos no código de `main` (`af763bb`) nesta auditoria. Nenhum foi aberto
pelo diff: os quatro existiam antes dele. O registro do `global-error` inerte da web fechou com a PR e está na lista de
fechados; a linha da `apps/web` sem `not-found` e `error` foi reduzida. **Pós-PR #55:** três dos quatro fecharam (as telas de
erro sem estilo nem tema, o cartão colado na borda e a falta de `noValidate`) e saíram desta tabela para a lista de
fechados. Sobra o `start` sem porta.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O `start` da `web` e da `api` não fixa a porta, e as duas sobem na 3000 da `app`** (novo, 2026-10-21, pós-PR #54) | `apps/web/package.json:7` e `apps/api/package.json:9` (`"start": "next start"`) · o `dev` fixa as portas (`apps/web/package.json:5`, `-p 3001`; `apps/api/package.json:5`, `-p 3002`) | **Medido** pelo `/test` de `web-global-error`: `pnpm --filter web start` subiu na porta 3000, e o repro do `review/review.md` e do plano dizia 3001. Quem segue a receita de build de produção ao pé da letra põe a web no lugar da `app`, e o `/test` contornou com `pnpm exec next start -p 3001`. A `api` tem o mesmo script, lido no código. Não afeta a Vercel, que define a porta. **Reescrito em 2026-10-21 (terceira passada da noite):** a correção que esta linha propunha, `-p` no `start` como no `dev`, quebraria quem hospeda fora da Vercel. No CLI do Next 16, a opção é `-p, --port` com `.default(3000).env('PORT')` (`node_modules/next/dist/bin/next:108`, lido nesta passada), e pelo commander o valor passado na linha de comando vence a variável. Com `-p 3001` fixo, uma plataforma que injeta `PORT` (o Cloud Run, por exemplo) ficaria com o processo na porta errada. A correção precisa respeitar `PORT` quando ela existe e só cair em 3001 e 3002 sem ela. P, com essa decisão de forma |

**Lacunas de teste herdadas da PR #54, com veredito desta auditoria:**

| lacuna | veredito 2026-10-21 | motivo |
|--------|---------------------|--------|
| O T3 da app não clica no botão para conferir o `reset()` | **continua aberta**, P | o `/test` de `web-global-error` clicou no botão da web (o mesmo componente com outra chave) e viu o `reset()` refazer a árvore; o da app viu o handler ligado. Teste só para isso não se paga |
| O `reset()` não pede de novo ao servidor | **fora de escopo** | é o comportamento do Next: se a causa sumir no servidor, a pessoa precisa recarregar. Registrado no relatório de `web-global-error` |

### 🆕 Achados da tarefa `web-auth-forms` (PR #55)

Vindos do `/review` (os três 🟢) e da seção "Achados adjacentes" do `/test` de `web-auth-forms`, registrados pela passada
incremental da noite e conferidos no código do working tree. Nenhum foi aberto pelo diff: os quatro existiam antes dele,
e o do `signInStartedHereRef` tem o mesmo resultado visível que o código de `main`. A copy do cadastro foi medida pelo
`/test` só na landing; a passada conferiu por leitura que a `apps/app` tem as mesmas chaves e o mesmo texto. Antes de
registrar, a passada procurou cada um neste arquivo (`AuthProvider`, `noAccount`, `Regístrate`, `mockRestore`,
`signInStartedHere`): nenhum estava registrado.

**Pós-PR #74 (2026-11-24):** O `signInStartedHereRef` que não voltava a `false` fechou com a PR #74, e a linha dos dois `AuthProvider` foi reduzida à duplicação de `POST` que sobra. Ver [Achados da PR #74](#-achados-da-pr-74-2026-11-24).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O login faz mais de um `POST /api/auth/session`: três na app, dois na landing e no link por e-mail** (reduzido em 2026-11-24, pós-PR #74; era "A web monta dois `AuthProvider` aninhados…") | `packages/auth/provider.tsx:377-393` (`onAuthSuccess`, que grava a sessão) · o observador do token no mesmo provider · na app, também o `useSignedInRedirect` (`apps/app/shared/hooks/useSignedInRedirect.ts:35-70`) | **Reduzido:** a PR #74 tirou o `AuthProvider` interno do layout da landing (`apps/web/app/[locale]/layout.tsx:39`, só o `DesignSystemProvider`), e o `/test` da tarefa mediu 1 `custom-token` e 1 `refresh` por carga, onde antes eram 2 e 4, e um toast só. Segue a duplicação de outra causa, que a linha já previa em 2026-10-22: o `onAuthSuccess` e o observador gravam a sessão cada um, e na app o hook de redirecionamento soma um terceiro (medido pelo `/test` de `app-auth-refused-session-reload-loop`). Sem efeito visível; custa chamadas. P a M |
| 🟢 **`consoleErrorSpy.mockRestore()` só roda quando as asserções passam** | `apps/web/__tests__/signUpFormApi.test.tsx:189` (o `spyOn`) e `:204` (o `mockRestore`, depois do `expect` de `:203`) | Se o `expect` falhar, o espião fica ligado para os testes seguintes do arquivo. Só afeta a suíte depois de um teste já vermelho. O arquivo entrou em `main` pela PR #55 sem a correção; o `/review` registrou e não corrigiu. P (um `afterEach` ou `try/finally`) |

**Lacunas de teste herdadas de `web-auth-forms`:** os vereditos estão na versão deste arquivo em `df381f4`, seção
"Executada no working tree, sem commit (`web-auth-forms`)"; o resumo, na seção "Entregas desta rodada (PR #55)" da versão em
`9c793c6`.

### 🆕 Achados da tarefa `global-error-theme` (PR #55)

Vindos do `/review` e do `/test` de `global-error-theme`, registrados pela terceira passada incremental da noite e
conferidos no código do working tree. Nenhum foi aberto pelo diff. O quadro claro é efeito da correção, mas o estado
anterior era pior (a tela inteira sem tema). Antes de registrar, a passada procurou cada um neste arquivo (`quadro claro`,
`apps/api/app/global-error`, `Oops`, `algo deu errado`): nenhum estava registrado. O `console.error` da mesma tela da API
já aparece em [`observability-logging`](../features/observability-logging.md) (`:151`) e não ganhou linha aqui. O R4 do plano (cookie
`x-theme` sem `localStorage.theme`) ficou sem linha, com o motivo na versão deste arquivo em `df381f4`, seção "Executada no working tree, sem commit
(`global-error-theme`)". As duas tarefas entraram em `main` pela PR #55; as âncoras das linhas abaixo foram relidas em
`df381f4` e não mudaram.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Na tela de erro global, com tema escuro, aparecem 1 ou 2 quadros claros antes do escuro** | `apps/app/app/global-error.tsx:30` e `apps/web/app/global-error.tsx:30` (o `ThemeProvider` aplica a classe `dark` num efeito, depois do primeiro commit) · `docs/features/global-error-theme/test/report.md`, seção 6 | **Medido** pelo `/test`, com um script que grava, a cada `requestAnimationFrame`, a classe do `<html>` e o fundo do `<body>`, em 5 recargas por estado. No escuro pelo sistema, o quadro claro apareceu em 5 de 5 recargas nas duas apps; com a escolha salva escura, em 4 de 5 na app e 5 de 5 na web. A classe `dark` chegou entre 10 e 32 ms. O CSS já estava carregado, e o estado final estava certo em todas. Observação, não defeito: a tela só aparece quando o root layout quebra. A hipótese do relatório para eliminar o quadro, aplicar a classe no `<html>` durante o render com a mesma regra do `next-themes`, não foi testada. P |
| 🟢 **A tela de erro global da `apps/api` tem o texto fixo em pt-br** | `apps/api/app/global-error.tsx:19` (`lang="pt-BR"`), `:21` ("Oops, algo deu errado") e `:22` ("Tentar novamente"), sem passar pelo dicionário · `apps/api/app/layout.tsx:7-11`, o root layout de quatro linhas que ela substitui · nenhuma `page.tsx` em `apps/api/app` | Contraria a regra de ouro 2 na letra. Na prática, a API não tem página, e a tela só aparece se aquele layout quebrar, então ninguém a vê. Registrado pelo `/review` de `global-error-theme`, fora do diff. P: ou passar pelo dicionário, ou apagar a tela, se o build da API provar que ela é dispensável. Valor quase nulo |

### 🆕 Achados da PR #55 (2026-10-21)

Vindos do `/review` de `app-sign-up-copy` (o componente) e das lacunas do plano da mesma tarefa (a chave do header),
conferidos no código de `main` (`df381f4`) nesta auditoria. Nenhum foi aberto pelo diff. Antes de registrar, a auditoria
procurou cada um neste arquivo (`components/sign-in`, `header.noAccount`, `header/index.ts`): nenhum estava registrado.

**Pós-PR #74 (2026-11-24):** O componente `@repo/auth/components/sign-in` morto fechou com a PR #74 (fatia 3 de `delivery-security-review`).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **A chave `components.header.noAccount` não tem consumidor, e em es falta o "¿"** | `packages/internationalization/translations/components/header/index.ts:15`, `:33`, `:51` ("No tienes una cuenta? ") · `git grep "header.noAccount"` em `apps/` e `packages/`: 0 | Chave órfã com a mesma copy que a PR #55 corrigiu no login. Quem a reaproveitar herda o erro em es. Ficou fora de `app-sign-up-copy` por decisão do plano (D6). P: apagar a chave nos três idiomas, junto da linha acima |

### 🆕 Achados da PR #56 (2026-10-22)

Vindos do `/review` (os 🟢 e a decisão em aberto 1), das "Observações" e das lacunas do `/test` de
`magic-link-sign-in`, e da medição desta auditoria, conferidos no código de `main` (`9c793c6`). Nenhum bloqueou a
entrega. Antes de registrar, a auditoria procurou cada um neste arquivo (`Could not establish`, `User disabled`,
`noValidate`, `AuthCard`, `FullScreenLoader`, `redirect=`, `SECURITY.md:17`, `session-refresh/spec.md`,
`localStorage`): só o `noValidate` aparecia, na linha da landing já fechada. O balão nativo e o cartão sem margem
existem também no "Esqueci minha senha" da app, então são anteriores à feature; o loader e o `?redirect=` nasceram com
ela.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O `docs/SECURITY.md` não acompanhou a PR #56** (reduzido em 2026-10-23, pós-PR #57, e em 2026-11-23, pós-PR #64) | `docs/SECURITY.md:7` (métodos de login sem o link) | **Reduzido de novo:** a PR #64 reescreveu a seção do rate limit (`:161-188`), e a rota de disponibilidade do link fica fora pela regra geral, todo `GET` fora da lista estrita (`:169`; o comentário em `apps/api/proxy.ts:44-45`, era `:34-36`). Seguem de fora o login por link entre os métodos de entrada e a regra de quem recebe o link. A PR #57 já tinha corrigido as contagens. P, só documento |
| 🟢 **Na conclusão do link, o texto "Entrando…" fica cerca de 280 px abaixo do spinner** | `apps/app/shared/components/ui/FullScreenLoader.tsx:13` (`min-h-[60vh]`) · `EmailLinkCompletion.tsx:168-193` | Medido pelo `/test`: a 375×812 o texto e o link de volta cabem na dobra, mas ficam longe do indicador. Cosmético. P |
| 🟢 **O link não leva o `?redirect=` da tela de login** | decisão D8 do plano · `EmailLinkRequestForm.tsx` e `emailLinkSignIn.ts` (o e-mail guarda só o código) | Quem chegou ao login por um deep link e escolheu o link por e-mail cai no destino padrão, não na página que pedia. O plano chamou de "melhoria pequena e isolada para depois": levar o destino sanitizado por `postAuthRedirectTarget`. P |
| 🟢 **O e-mail do pedido fica no `localStorage`, e o inventário de armazenamento do navegador só lista cookies** | `apps/app/shared/lib/emailLinkSignIn.ts:1`, `:7-13` (grava), `:24-30` (apaga só depois do sucesso) · `docs/PRE-PRODUCTION.md:495-504` e a seção "Cookies que usamos" | O endereço fica no navegador até o link ser usado, e a chave não aparece em nenhum inventário (o `bp:panel-state` do painel também não, `docs/AUTH-PANEL.md:78`). A gravação serve ao pedido que a pessoa fez; se o inventário deve cobrir armazenamento local é decisão de quem escreve a política de cada fork. Registro, P de texto |
| 🟢 **Âncora interna morta na spec arquivada de `session-refresh`** | `docs/features/session-refresh/spec.md:20` (`#entrega-—-o-que-foi-conferido`) · `:170` (o título) | O GitHub publica `#entrega--o-que-foi-conferido`, sem o travessão. Achado pelo verificador de links desta auditoria. Correção de um caractere |

**Ampliados na auditoria pós-PR #56, nas linhas deles:**

- **Os links mortos dos planos** ([Achados das PRs #37 a #39](#-achados-das-prs-37-a-39-2026-10-04)): o
  `analyze/plan.md:3` de `magic-link-sign-in` morreu com aquele arquivamento, o sétimo.
- **O `test:emulator` sem o Auth** ([Achados da PR #48](#-achados-da-pr-48-2026-10-19)): a PR #56 decidiu de novo não
  levar o Auth à suíte (D11 do plano), e o `/analyze` e o `/test` mediram à mão no emulador que o link de conta não
  confirmada mantém a senha, ao contrário da documentação de produção.
- **Os dois `POST /api/auth/session`** ([Achados da tarefa `web-auth-forms`](#-achados-da-tarefa-web-auth-forms-pr-55)):
  o `/test` da PR #56 viu dois por conclusão do link também na `apps/app`, que monta um provider só.

**Lacunas de teste e 🔒 herdados da PR #56, com veredito desta auditoria:**

| lacuna | veredito 2026-10-22 | motivo |
|--------|---------------------|--------|
| Nenhum teste monta o `AuthProvider` real com `signInWithEmailLink` | **continua aberta**, comportamento medido | o `/test` mediu cookie, `lastAccessAt`, destino do admin e onboarding no emulador; montar o provider com o Firebase mockado provaria só a linha `onSuccess: onAuthSuccess` |
| `429` real no pedido do link | **continua aberta**, 🔒 | exige `ARCJET_KEY`; somado à pendência 24. A lista está em `corsOrigin.test.ts` |
| Provedor de link desligado no console ou domínio não autorizado | **continua aberta**, 🔒 | exige projeto Firebase real; pendência 29 |
| Expiração real do link e leitor de link de e-mail corporativo | **continua aberta**, 🔒 | o emulador não expira o código; o `GET` do link antes de abrir não o gastou (medido), mas um leitor real não foi testado |
| A conta não confirmada perde a senha em produção ao concluir o link | **fora de escopo** | o filtro D1 impede que aconteça; a premissa vem da documentação do Firebase e diverge do emulador |
| As duas ações novas do SDK (`emailLinkSignInAvailability`, `requestEmailLinkSignIn`) sem teste no `@repo/sdk` | **continua aberta**, risco baixo | `@repo/sdk` tem 14 testes desde a PR #57, nenhum para estas; as ações são exercitadas pelos testes da `apps/app` com o `apiClient` mockado. Soma às quatro de notificação |

### 🆕 Achados da PR #57 (2026-10-23)

Vindos do `/review` (D2, D3 e o achado 13), das perguntas em aberto do plano e das observações e lacunas do `/test` de
`teams-organizations`, conferidos no código de `main` (`61a781e`) nesta auditoria. Nenhum bloqueou a entrega. Antes de
registrar, a auditoria procurou cada um neste arquivo e no `docs/PRE-PRODUCTION.md`: nenhum estava registrado. Os
pré-requisitos de infra da entrega (índices de `entity` por organização, TTL de convites, Resend, `ARCJET_KEY`, a
variável nas duas apps) já estão no `PRE-PRODUCTION.md` §1.10 e §16 e não se repetem aqui. **Na auditoria pós-PR #58
(2026-10-27)** saíram desta tabela as linhas de D10, D11 e do `500` do convite, fechadas pela PR #58 (conferência na
versão deste arquivo em `277da43`). **Na auditoria pós-PR #59 (2026-10-28)** saiu a linha da trilha de auditoria da
organização, fechada pela PR #59 (conferência na versão deste arquivo em `c9b4d9c`).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O cadastro aberto a partir do convite não traz o e-mail preenchido** | `apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx:9`, `:26` (só lê `redirect`) | Quem é convidado digita o endereço de novo e pode errar, e o aceite exige o mesmo e-mail do convite. `SignUpFormClient.tsx` é do `contends_on` de `social-sign-in-providers`. P a M |
| 🟢 **Trocar a foto de um registro apaga o objeto mesmo que outro registro o use** | `apps/api/app/(routes)/entities/[id]/route.ts:89-103` | Com fotos na pasta da organização, um membro pode copiar a URL de outro registro; trocar a foto de um apaga a do outro. Corrigir pede contagem de referência. M |
| 🟢 **O aceite não exige e-mail verificado, e quem convida também não precisa ter** | `apps/api/app/(routes)/invitations/accept/route.ts:44-49` (o comentário declara; era `:41-46` até a PR #59) · `organization/invitations/route.ts:50-182` (nenhum `emailVerified`; era `:48-167` até a PR #59 e `:47-149` até a PR #58) | Um link encaminhado funciona para uma conta não verificada criada com o endereço convidado. Escolha do plano (Q12, Q13), escrita só no comentário; o `docs/SECURITY.md` não a cita. P de texto, ou decisão de produto |
| 🟢 **`requirePlanApi` ficou sem chamador** | `apps/api/app/(guards)/plan.ts:30` · o gate da criação de `entity` passa por `requireOrganizationApi({ plan })` | Guard exportado sem uso, e o `docs/PRE-PRODUCTION.md` §12 ainda o cita como o gate por status. O `docs/SECURITY.md:37` registra. P: apagar ou manter como exemplo, com o texto acompanhando |
| 🟢 **A nota do `STATE.md` da feature contradiz a tabela** | `docs/features/teams-organizations/STATE.md:43` ("a linha `review` continua `in-progress`") · a tabela, `:16`, diz `done` | Quem lê o histórico da feature encontra os dois. A auditoria não edita o `STATE.md` além do campo `spec:`. Soma à E11 |

**Ampliados nesta rodada, nas linhas deles:**

- **Os links mortos dos planos** ([Achados das PRs #37 a #39](#-achados-das-prs-37-a-39-2026-10-04)): o
  `analyze/plan.md:3` de `teams-organizations` morreu com este arquivamento, o oitavo.
- **O predicado de posse copiado**: fechado pela PR #57; a linha saiu da tabela de
  [Repositório, rotas e proxy](#-repositório-rotas-e-proxy) e o registro está no topo de [Achados](#achados-correções-pontuais-não-specs).
- **A superfície sem guard e as rotas fora do rate limit** ([Segurança](#segurança-seguem-abertos-confirmados-no-código)):
  18 de 55 arquivos nus, e cinco das oito rotas de organização fora da lista.

**Lacunas de teste e 🔒 herdados da PR #57, com veredito desta auditoria:**

| lacuna | veredito 2026-10-23 | motivo |
|--------|---------------------|--------|
| Membros e convites sem fluxo na suíte E2E | **fechada em 2026-10-28** pela PR #59, com ressalva | `apps/e2e/tests/organizationOwnership.spec.ts:68` percorre convite, aceite e transferência com a variável ligada na pilha inteira (`stackEnv.ts:37`) e passou no job `e2e` do merge. A emissão do convite pela tela e a entrega do e-mail seguem sem rede (🔒, em [Achados da PR #59](#-achados-da-pr-59-2026-10-28)) |
| O prefetch no servidor da página da equipe | **continua aberta**, risco baixo | `organization/page.tsx:18-35`; `organizationPagesSwitch.test.tsx` cobre só o 404 e as props |
| O teto de 20 convites pendentes contra o Firestore real | **continua aberta**, risco baixo | coberto com mock (`organizationInvitationsRoute.test.ts`); o teste de emulador define o teto e não o exercita |
| As ações do SDK de organização | **continua aberta**, risco baixo | `organizationAction.test.ts` tem 3 casos para 9 métodos; soma às ações de notificação e do link de acesso |
| Entrega real do convite, `429` com `ARCJET_KEY`, índices publicados e TTL | **continua aberta**, 🔒 | exigem Resend, chave, projeto real; pendências 13, 24, 1 a 4 e §16 do `PRE-PRODUCTION.md` |

### 🆕 Achados da tarefa `organization-guardrails` (PR #58, 2026-10-23)

Vindos do `/review` (o 🟡 e os dois 🟢) e das lacunas do `/test` da tarefa direta `organization-guardrails`, registrados
na rodada delta e reconferidos no código de `main` (`c0c06f2`) na auditoria pós-PR #58, que levou a tarefa. A linha do
🟡 do membro arquivado saiu: a tarefa `organization-archived-member`, na mesma PR, fechou o caso. Antes de registrar, a rodada procurou cada caso neste arquivo
(`ownsOrganizationWithMembers`, `listByOrganization`, `MEMBERS_ENABLED`, promoção, `500` sem código): só o `500` do
convite aparecia, e ele é outro caso, em andamento na própria tarefa.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Com `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` desligada depois de haver membros, ninguém remove membro e o dono não sai** | `apps/api/(shared)/lib/organization-members.ts:21-28` (as rotas de membros respondem `404 ORGANIZATION_MEMBERS_DISABLED`) · `organization-membership.ts:108-132` (o helper não lê a variável; era `:105-117` até a PR #59) | O dono não remove ninguém, a exclusão da própria conta é recusada (já em `main`) e, com `organization-guardrails`, o admin também não o arquiva. Resta o bloqueio (`PUT` com `disabled: true`). O `docs/PRE-PRODUCTION.md` §16 já diz que desligar a variável não desfaz a equipe. Desde a PR #59 a transferência também responde `404` com a variável desligada, então ela não serve de saída nesse caso. Decisão de produto: abrir a remoção com a variável desligada ou só documentar o efeito. P |
| 🟢 **O admin promove a admin o dono de uma organização com membros sem recusa** | `apps/api/app/(routes)/users/[id]/route.ts:138-140` (grava `type` sem consultar vínculo; mesmas linhas em `main`) | O guard do painel comum recusa perfil que não é `COMMON` (`(guards)/common-panel.ts:77-80`), e o guard da organização compõe sobre ele; promovido, o dono perde as rotas da equipe, e a organização fica sem quem a gerencie, como no D10. Fora do escopo de `organization-guardrails`; o `/review` e o `/test` deixaram como lacuna aberta. Pede decisão (recusar a promoção ou aceitar que um admin siga dono). Desde a PR #58 o arquivo está em `main`, sem colisão. Desde a PR #59 ([`organization-ownership-transfer`](../../docs/features/organization-ownership-transfer/spec.md)), o dono tem como entregar a equipe antes da promoção, mas o admin ainda promove sem recusa; a decisão continua sua e está no "Fora do corte" daquela spec. Reconferido em 2026-10-28: `users/[id]/route.ts` não foi tocado pela PR. P |
| 🟢 **Falha do Firestore numa leitura de recusa vira `500` sem `error.code`** | `apps/api/app/(routes)/users/[id]/route.ts:178` (`findById`) e `:191` (`ownsOrganizationWithMembers`), em `main` desde a PR #58 · `account/deletion/route.ts:44` (o helper; era `:43` até a PR #59) | Contraria a regra de ouro 3: o front mostra o erro genérico. O `/review` de `organization-guardrails` deixou como está porque é o mesmo comportamento das leituras vizinhas. Recebe também o resto do 🟢 do convite ("outras rotas fazem o mesmo"), que a PR #58 fechou. **Ampliado na rodada delta 2:** com `organization-archived-member`, o helper lê também um perfil por membro (`organization-membership.ts:128-130`, `Promise.all`; era `:123-125` até a PR #59), e a falha de qualquer leitura vira o mesmo `500`, antes de qualquer escrita nos dois consumidores (medido pelo teste de rota novo). **Ampliado em 2026-10-28, pós-PR #59:** antes das leituras por membro, o helper lê a lista de organizações de que a pessoa é dona (`listOwnedBy`, `organization-membership.ts:111`), e uma leitura por organização. A correção que vale é um padrão comum de leitura que falha, não um `try` por chamada. P a M |

### 🆕 Achados da tarefa `organization-archived-member` (PR #58, 2026-10-23)

Vindos da §12 do plano, do `/review` (os dois 🟢 e a decisão em aberto dos documentos) e das lacunas do `/test` da
tarefa direta `organization-archived-member`, registrados na rodada delta 2. A tarefa entrou em `main` pela PR #58;
as âncoras foram relidas em `c0c06f2`. Antes de registrar, a rodada procurou cada caso neste arquivo (`refuseCurrentMembership`,
`OWNER_HAS_MEMBERS`, `isOrganizationActive`, `ROPA.md:193`): o D10 cita convites aceitáveis de um dono arquivado com
membros, que é o caso que `organization-guardrails` passa a recusar; o dono arquivado sem membros vivos é outro, e
entrou como linha própria. **Na auditoria pós-PR #59 (2026-10-28)** saíram as duas linhas do convite (o aceite que
contava o membro arquivado e os convites de um dono arquivado), fechadas pela PR #59, e a dos documentos foi reduzida.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois documentos da recusa não dizem que perfil arquivado não conta** (reduzido em 2026-10-28, pós-PR #59) | `docs/ROPA.md:193` · `docs/INCIDENT-RESPONSE.md:52` | Falam do "dono que ainda tem membros" sem a exceção que o helper faz. Não ficam falsos. **Reduzido:** a PR #59 reescreveu os três trechos para citar a transferência como saída, e o `docs/PRE-PRODUCTION.md:1021-1025` (era `:996-1000` até a PR #71, `:955-959` até a PR #65 e `:946-950` até a PR #64) passou a dizer "membro vivo"; os outros dois seguem sem a exceção. O `docs/SECURITY.md:40` já tinha sido ajustado. P, só texto |

### 🆕 Achados da PR #59 (2026-10-28)

Vindos do `/review` (os 🟢) e das lacunas do `/review` e do `/test` de `organization-ownership-transfer`, conferidos no
código de `main` (`277da43`) nesta auditoria. Nenhum bloqueou a entrega. Antes de registrar, a auditoria procurou cada
caso neste arquivo (`ORGANIZATION_FORBIDDEN`, `findOwnedBy`, `listOwnedBy`, `claimLegacyRecords`, `rc-menu`): só o
Espaço do menu de ações aparecia, e a linha dele, em [Achados da PR #40](#-achados-da-pr-40-2026-10-07), ganhou a
reconfirmação. Os pré-requisitos de infra de membros e convites seguem no `PRE-PRODUCTION.md` §16, sem passo novo.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Depois de uma recusa da transferência, a tabela da equipe segue com as ações de dono** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/organization/(hooks)/useOrganizationActions.tsx:73-96` (o `onError` só mostra o alerta) | Se outra aba já transferiu, aparece o toast de `ORGANIZATION_FORBIDDEN` e a tabela continua oferecendo "Tornar dono" e "Remover da equipe" até recarregar. A API recusa certo; é tela defasada. A remoção de membro faz o mesmo, então não é regressão. Nenhum teste cobre a tela depois dessa recusa. P |
| 🟢 **A organização recebida por transferência fica dormente quando o dono entra noutra equipe e sai** | `apps/api/(shared)/repositories/organization.repository.ts:24-42` (`listOwnedBy` em ordem de criação; `findOwnedBy` devolve a mais antiga) · `organization-membership.ts:47-64` (`joinHomeOrganization`) | Quem é dono de duas organizações, aceita convite de uma terceira e depois sai volta para a mais antiga. A outra fica sem ninguém, com os registros fora do alcance da tela até a exclusão da conta, que a apaga. Foi a decisão 6 do plano, tomada de propósito; fica como risco, não defeito. Pede decisão só se um fork esbarrar nele |

**Lacunas de teste e 🔒 herdados da PR #59, com veredito desta auditoria:**

| lacuna | veredito 2026-10-28 | motivo |
|--------|---------------------|--------|
| A retrocarga pendente do antigo dono não tem teste (`claimLegacyRecordsQuietly` sai cedo quando a pessoa deixou de ser dona) | **continua aberta**, risco aceito no plano | só alcança o dono que transfere antes de a migração dos registros antigos terminar |
| A corrida entre o arquivamento pelo admin e a transferência, fora de transação | **fora de escopo**, risco aceito no plano | o arquivamento não roda numa transação com os vínculos; a transferência recusa alvo arquivado dentro da dela |
| A suíte E2E não emite o convite pela tela nem entrega e-mail | **continua aberta**, 🔒 | depende de Resend (pendência 13); a emissão fica com `organizationInvitationsRoute.test.ts` |
| A suíte E2E roda só em pt-br, desktop e tema claro | **continua aberta**, risco baixo | o `/test` percorreu en, es, escuro e 375 px à mão nesta entrega; ampliar a suíte é outra tarefa |
| O envio do convite e o rótulo "convite enviado" na trilha | **continua aberta**, 🔒 | sem provedor de e-mail a rota responde `503 EMAIL_NOT_CONFIGURED` antes de gravar; coberta por teste de rota. Soma à pendência 13 |

**Ampliados nesta rodada, nas linhas deles:**

- **Os links mortos dos planos** ([Achados das PRs #37 a #39](#-achados-das-prs-37-a-39-2026-10-04)): o
  `analyze/plan.md:3` de `organization-ownership-transfer` morreu com este arquivamento, o nono.
- **As rotas fora do rate limit e a superfície sem guard** ([Segurança](#segurança-seguem-abertos-confirmados-no-código)):
  seis das nove rotas de organização fora da lista; 18 de 56 arquivos nus.
- **O `500` sem `error.code` nas leituras de recusa** ([Achados da tarefa `organization-guardrails`](#-achados-da-tarefa-organization-guardrails-pr-58-2026-10-23)):
  o helper passou a ler também a lista de organizações do dono antes das leituras por membro.

### 🆕 Achados da tarefa `app-auth-forms` (PR #60)

Vindos do `/review` (os dois 🟡 e o 🟢 do `catch`), da §1.6 do plano e da seção "Achados fora do corte" do `/test` de
`app-auth-forms`, conferidos no `HEAD` da branch (`7348247`) na rodada delta de 2026-10-29 e de novo em `main`
(`c9b4d9c`) nesta auditoria: o laço e os dois textos do Google seguem iguais. O 🟢 das duas formas de "não coincidem"
fechou com a PR #60 e saiu da tabela. Nenhum foi aberto pelo diff: o laço do
login e o do cadastro existem em `main` igual, e os dois textos do Google e as duas formas de "não coincidem" também.
Antes de registrar, a auditoria procurou cada um neste arquivo (`recarga`, `laço`, `não conferem`, `não coincidem`,
`did not return an ID token`, `Invalid response from auth API`, `resolvePostLoginPath`): só a linha do alerta da sessão
recusada, em [Achados da PR #56](#-achados-da-pr-56-2026-10-22), falava do provider que engole a falha, sem citar o laço.

**Pós-PR #74 (2026-11-24):** O laço de recarga com a sessão recusada fechou com a PR #74 (tarefa `app-auth-refused-session-reload-loop`).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Dois textos fixos em inglês sobram no Google da app** | `apps/app/shared/lib/googleSignInApi.ts:62` ("Google sign-in did not return an ID token") · `:76` ("Invalid response from auth API"); eram `:49` e `:63` até a PR #73, que acrescentou o aviso de conta nova acima, e `:48` e `:62` até a PR #64 | Saem pelo `FormattedError` como `message` crua, em inglês nos três idiomas (regra de ouro 2). Só aparecem com resposta malformada do Google ou da API, então ninguém deve vê-los em uso normal. Registrado pela §1.6 do plano. P, uma chave e duas linhas, no arquivo que a branch mudou |

**Lacunas de teste herdadas de `app-auth-forms`, com veredito desta rodada:**

| lacuna | veredito 2026-10-29 | motivo |
|--------|---------------------|--------|
| Recuo lateral sem teste de unidade | **continua aberta**, por decisão do plano (§7) | o `/test` mediu no navegador a 375, 500, 639, 640, 768 e 1280 px, em claro e escuro |
| `auth/user-disabled` en sem teste de copy | **fechada** pela PR #60 | caso novo em `apps/app/__tests__/apiErrorCopy.test.ts`, que falha com "User disabled." |
| Alerta traduzido na `apps/web` sem teste próprio | **continua aberta**, risco baixo | medido no navegador (F1b); o provider é o mesmo módulo que o teste `authProviderSessionNotEstablished` monta |
| O teste do provider só dispara o login por senha | **continua aberta**, risco baixo | as três mutações apontam para o mesmo `onAuthSuccess` (`provider.tsx:371`, `:378`, `:383`); o link foi medido no navegador; a mutação de Google do provider, que só a landing usa, não foi exercida |

### 🆕 Achados da PR #62 (2026-11-19)

Vindos do `/test` (seção "Achados" e "O que falta testar") e do `/review` de `app-internal-ux-polish`, conferidos no
código de `main` (`c9b4d9c`) nesta auditoria. Nenhum bloqueou a entrega. Antes de registrar, a auditoria procurou cada
caso neste arquivo (`rodapé fixo`, `2.4.11`, `@layer`, `forceMount`, `AGENTS.md`): só o rodapé fixo aparecia, no 🟢
de [Achados da PR #44](#-achados-da-pr-44-2026-10-14), que esta linha absorve.

**Pós-PR #74 (2026-11-24):** O foco escondido pelo rodapé fixo fechou com a PR #74 (tarefa `app-footer-focus-not-obscured`).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O estilo global `a { background-color: transparent }` do antd fica fora de `@layer` e vence as utilitárias de fundo em links** | o reset global do antd · contornado só no menu lateral (`apps/app/shared/components/ui/Sidebar.tsx:38-39`, `ACTIVE_ITEM_CLASS`) | Medido pelo `/test` da PR #62: o sub-item ativo de Configurações tinha `aria-current` e `data-active` sem nenhum destaque, e os itens de primeiro nível também ficam sem o fundo `bg-sidebar-accent`, só com negrito e barra. A PR contornou no menu; qualquer outro link com `bg-*` no app herda o problema. P a M, no provider do antd |
| 🟢 **Texto não salvo se perde ao trocar de seção da conta** | `account/(components)/AccountTabs.tsx:132` (`TabsContent` do Radix desmonta o painel inativo) | Medido pelo `/test` da PR #62: o nome digitado sem salvar sumiu ao voltar ao perfil. Antes da PR as abas tinham o mesmo comportamento. Decidir entre um aviso de alterações pendentes e `forceMount` nos painéis é escolha de produto. P |
| 🟢 **O `next dev` do Next 16 grava `apps/api/AGENTS.md`, `apps/app/AGENTS.md` e `apps/web/AGENTS.md` ao subir** | `.gitignore` (sem regra para eles) · nenhum `next.config` com `agentRules` (`git grep agentRules`: 0) | O `/test` da PR #62 apagou os três à mão. Quem rodar `pnpm dev` num fork e der `git add .` versiona arquivos gerados que competem com os `CLAUDE.md` aninhados. P: `agentRules: false` no `next.config` compartilhado ou uma regra no `.gitignore` |

**Lacunas de teste e 🔒 herdados da PR #62, com veredito desta auditoria:**

| lacuna | veredito 2026-11-19 | motivo |
|--------|---------------------|--------|
| Aviso de checkout com Stripe real e conta só com Google | **fora de escopo**, 🔒 | pendências 23 e 17 |
| O seletor de seção abaixo de `lg` sem teste no Playwright | **continua aberta**, risco baixo | medido no navegador a 375 px e coberto no jsdom |
| Alinhamento do breadcrumb no `onboarding` | **continua aberta**, 🔒 | o seed já sai com o onboarding concluído e `ONBOARDING_ENABLED` vazio |
| As 4 falhas intermitentes da primeira execução do `@repo/design-system` no `/test` | **continua aberta**, provavelmente as do `actionMenu.test.tsx` | a auditoria de 2026-11-19 viu dois casos de teclado desse arquivo estourarem 20 s sob carga, e a de 2026-11-23 viu cinco casos diferentes caírem em três execuções; o `/test` não guardou os nomes, então a identificação não é confirmada |

### 🆕 Achados da PR #63 (2026-11-19)

Vindos do `review/review.md` de `delivery-stage` (as listas "Verificar no `/test`" e "Lacunas de teste"), conferidos
nesta auditoria. O `/review` corrigiu os dez achados de documento que encontrou e levou as duas decisões a você.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A etapa de entrega entrou em `main` sem o `/test`** | `docs/features/delivery-stage/STATE.md` (`test: pending`) · `review/review.md`, "Verificar no `/test`" | Dos seis itens que o `/review` não conseguiu provar lendo código, esta auditoria mediu três: a contagem do `pnpm audit --prod` (8 críticas e 120 altas, bate com as specs), os 210 testes da `web` (passaram) e o GIF no README do GitHub (`gh api repos/:owner/:repo/readme` com HTML publica o `<img>` de `showcase.gif` dentro do link para `showcase.mp4`). Seguem sem medição: a landing servir `/showcase/showcase.mp4`, `.gif` e `.jpg` com o tipo certo no build de produção, sem o `307` para `/pt-br/…` (o teste do matcher aproxima com `RegExp`); a captura `pnpm --filter e2e showcase` (27 testes e 23 PNGs); e a revisão humana dos 21 segundos do vídeo (só dados do seed, nenhuma URL interna). O vídeo vai para todo fork como exemplo. P: rodar o `/test` de `delivery-stage` |

**Lacunas de teste herdadas da PR #63, com veredito desta auditoria:**

| lacuna | veredito 2026-11-19 | motivo |
|--------|---------------------|--------|
| O teste do matcher não cobre `/showcase` sem barra | **continua aberta**, opcional | não há página nesse caminho; continua indo ao proxy e redirecionando |
| `apps/e2e/showcase/*` sem teste unitário | **fora de escopo** | é ferramenta de captura; a prova é o próprio `pnpm --filter e2e showcase`, no achado acima |

### 🆕 Achados da PR #64 (2026-11-23)

Vindos do `review/review.md` e do `test/report.md` de `delivery-security-review` e das medições desta auditoria,
conferidos no código de `main` (`388a453`). Nenhum bloqueou a entrega. Antes de registrar, a auditoria procurou cada
caso neste arquivo (`revokeUserSessions`, `ignoreGhsas`, `pnpm audit`): só o desvínculo da senha aparecia, como lacuna
🔒 da PR #51, que esta linha amplia.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **Quatro chamadores ainda engolem a falha da revogação** | `packages/auth/server.ts:359-365` (`revokeUserSessions`; era `:336-342` até a PR #74) · `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts:122` · `users/[id]/route.ts:155` · `(shared)/lib/account-erasure.ts:237` · `(shared)/lib/account-access.ts:20` | A fatia 1 trocou a variante só nas rotas do corte. Nos quatro, a revogação que falha vira um `logEvent` (`[auth] session-revoke-failed`, desde a PR #74; era `console.error`) e a operação responde sucesso. Três desativam ou apagam a conta antes de revogar, e a conta desativada já é recusada na verificação do token, então o efeito é pequeno. O quarto é diferente: desvincular a senha "encerra todas as sessões" por escolha da PR #48, e quem desvincula para cortar um acesso não fica sabendo se a revogação falhou. O `/analyze` da fatia 2 de [`delivery-security-review`](../../docs/features/delivery-security-review/spec.md) os manteve (Q9), e a deriva está escrita na spec. Tarefa direta. P |
| 🟢 **A exceção do `@grpc/grpc-js` vale por GHSA, e a data de revisão não tem gate** | `package.json:5` (o texto da exceção, com "by 2027-05-19") · `:64-69` (`pnpm.auditConfig.ignoreGhsas`; era `:61-66` até a PR #75 e `:60-65` até a PR #72) | O ignore do pnpm vale para o aviso em qualquer caminho: se outra cadeia trouxer um `@grpc/grpc-js` vulnerável para o runtime do servidor, o `pnpm audit` continua em silêncio. E a data só existe no texto. Registrado pelo `/review` da PR #64 sem ação, porque é o recorte mais estreito que o pnpm oferece. P: um passo no job `audit` que falhe depois da data. Reconferido em 2026-11-23, pós-PR #65: o job `audit` (`ci.yml:97-113`) roda o `pnpm audit --prod` com a exceção valendo, e nenhum passo lê a data |
| 🟢 **Sem `--prod`, o `pnpm audit` acusa 12 críticas e 98 altas** | as dependências de desenvolvimento da raiz (entre elas `vitest`, `handlebars` e `basic-ftp`) e do preview de e-mail (`next` 15: 4 críticas e 14 altas) | Medido em 2026-11-23 sobre `388a453`. Não roda em produção, mas roda na máquina de quem desenvolve e no CI. O job `audit` da PR #65 usa `--prod` e não as vê. **Reduzido em 2026-11-23, pós-PR #65:** as atualizações de versão do Dependabot alcançam as dependências de desenvolvimento (a #67 agrupa 14), mas reprovam no CI (D16), e os alertas de segurança seguem desligados. Remedido no mesmo dia: 12 críticas e 98 altas. P a M |

**Lacunas de teste e 🔒 herdados da PR #64, com veredito desta auditoria:**

| lacuna | veredito 2026-11-23 | motivo |
|--------|---------------------|--------|
| `429` dos dois orçamentos contra a API de decisão do Arcjet | **fora de escopo**, 🔒 | depende de `ARCJET_KEY` (pendência 24); a fiação tem teste de unidade (`packages/security/__tests__/rateLimit.test.ts`, `apps/api/__tests__/corsOrigin.test.ts`) |
| O sujeito do orçamento padrão com o cookie de sessão real como bearer | **continua aberta**, 🔒 | o teste de unidade cobre um JWT montado; o efeito só aparece com a chave |
| `rateLimitDegraded.test.ts` não pega chamada de rede por HTTP/2 | **continua aberta**, risco baixo | quem garante que o no-op não chama a rede é `rateLimit.test.ts` |
| O preview de e-mail (`:3003`) responde com `X-Powered-By` | **fora de escopo** | ferramenta de desenvolvimento, fora dos três apps da spec |

### 🆕 Achados da PR #65 (2026-11-23)

Vindos do `review/review.md`, do `develop/handoff.md` e do `test/report.md` de `delivery-infra-hardening` e das
medições desta auditoria depois do merge, conferidos no código de `main` (`afb5b35`). Nenhum bloqueou a entrega. Antes
de registrar, a auditoria procurou cada caso neste arquivo (`dependabot`, `bad revision`, `NEXT_PUBLIC_API_URL`,
`locale=api`, `status: 403`) e não achou linha anterior.

**Pós-PR #74 (2026-11-24):** O logout feito na app que não chegava à landing no E2E fechou com a PR #74 (tarefa `e2e-org-ownership-flake-and-web-api-url`, spec `crossAppSignOut.spec.ts`).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A fila do Dependabot para `npm` encheu no primeiro dia, com quatro de cinco PRs vermelhas** | `.github/dependabot.yml` (`open-pull-requests-limit: 5`) · PRs #66 (`verify`: `error TS2345` em `admin/(pages)/audit/(pages)/(home)/page.tsx:20` e `entities/(pages)/(home)/page.tsx:20`, tipos do TanStack Query), #67 (`verify` e `e2e`: o Biome novo não conhece `noDuplicateDependencies` e `noEmptySource`), #69 (`verify` e `e2e`: `packages/payments/index.ts:21`, versão da API da Stripe) e #70 (`verify`: regras novas do Ultracite 7). Só a #68 passou | Enquanto as cinco ficarem abertas, nenhuma atualização nova de `npm` é proposta, e as atualizações de segurança, quando forem ligadas, disputam a mesma fila. Todo fork herda o mesmo arquivo e o mesmo primeiro dia. A D16 foi respondida em 2026-11-24 pela recomendação: mergear a #68, fechar a #69 com `ignore` de versão maior do `stripe`, e tratar a #66, a #67 e a #70 como tarefas diretas, uma por PR. As PRs seguem abertas até você agir no GitHub. P cada |
| 🟢 **O 403 do bloqueio de bot responde `{"error":"Um erro inesperado aconteceu"}`, em pt-br e sem `error.code`** | `apps/web/proxy.ts:87` · `apps/app/proxy.ts:159` (`handleClientError` de um `Error` sem código) | Quem recebe é um robô, sem tela, então o `/review` manteve. Destoa do contrato `{ error: { code } }` da API e sai em pt-br para qualquer idioma. Medido pelo `/test` com `ARCJET_ENV=development`. O mesmo 403 barra o `HeadlessChrome`: um fork que rodar automação de navegador contra uma landing com chave vai ver o bloqueio (o e2e e o showcase zeram `ARCJET_KEY`). P |
| 🟢 **O job `secrets` reprova com "bad revision" num push à `main` depois de um force-push** | `.github/workflows/ci.yml:80-95` (o intervalo `BEFORE..SHA`) | Depois de um force-push, o `before` pode não existir no clone, e o `git log` falha. A `main` protegida não aceita force-push, então o caso existe só enquanto a E3 não for resolvida. Registrado pelo `/review` sem ação |

**Lacunas de teste e 🔒 herdados da PR #65, com veredito desta auditoria:**

| lacuna | veredito 2026-11-23 | motivo |
|--------|---------------------|--------|
| Job `secrets` provado pelo script local, não pelo runner | **reduzida**, segue 🔒 a reprovação | o job rodou verde no merge e nas cinco PRs do Dependabot; nenhuma PR com segredo rodou no GitHub |
| Job `audit` reprovando dependência vulnerável | **continua aberta**, 🔒 | o job rodou verde seis vezes; a reprovação só foi provada localmente (`--audit-level=moderate` sai 1) |
| Q7: o Dependabot com `directory: /` cobre os workspaces | **fechada aqui** por medição | a #66 mexe em quinze `package.json` de `apps/` e `packages/` |
| O Googlebot verdadeiro passando pelo bloqueio de bot | **continua aberta**, 🔒 | só a produção, com a chave, prova; a lista de permissões do `secure()` tem `CATEGORY:SEARCH_ENGINE` |
| Corpo do 403 do bloqueio de bot sem teste | **virou achado** (acima) | não vale teste enquanto ninguém decidir o corpo |
| Shield em `DRY_RUN` provado só pela configuração passada ao Arcjet | **fora de escopo** | que o provedor não recuse em `DRY_RUN` é comportamento dele |

### 🆕 Achados da PR #71 (2026-11-23)

Vindos do `develop/handoff.md`, do `review/review.md` e do `test/report.md` de `delivery-product-quality` (fatia 1)
e das medições desta auditoria, conferidos no código de `main` (`a391d1c`). Nenhum bloqueou a entrega. Antes de
registrar, a auditoria procurou cada caso neste arquivo (`405`, `https://http`, `<title>`, `organizationOwnership`) e
não achou linha anterior. A regressão do HTML do 404 da landing não está aqui: é a E16 (era a D17) e a deriva da spec.

**Pós-PR #74 (2026-11-24):** O E2E instável de `organizationOwnership` fechou no CI com a PR #74 e foi rebaixado a 🟢; sobra o tempo sob `next dev` local.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **Método não suportado numa rota que existe responde `405` do Next, sem `error.code`** | `apps/api/app/(routes)/health/route.ts:5` (só `GET`) · a rota coringa `apps/api/app/[[...path]]/route.ts:6-16` cobre só caminho inexistente | Medido pelo `/develop` da PR #71: `PUT /health` → `405`, sem corpo no contrato `{ error: { code } }`. Vale para toda rota que não exporta o método pedido. Quem chama pelo SDK não manda método errado, então o efeito é em cliente externo. P |
| 🟢 **A `og:image` da metadata do 404 da landing sai como `https://http/localhost:3001/...` com o `.env` local** | `apps/app/.env.example:37` e `apps/api/.env.example:84` publicam `VERCEL_PROJECT_PRODUCTION_URL` com protocolo; o `apps/web/.env.example:11` deixa vazia · `packages/seo/metadata.ts:13-30` já tolera o protocolo, mas o Next monta a URL da imagem do arquivo do layout sozinho, prefixando `https://` | Medido pelo `/test` por `curl`. Só aparece na metadata do 404, porque nas páginas o `openGraph.images` de `buildLocaleMetadata` substitui a do layout; na Vercel a variável vem sem protocolo. Afeta só quem copia o valor com protocolo para a `web`. P: documentar que a variável é só o host, ou deixá-la fora dos `.env.example` |
| 🟢 **O 404 de `/favicon.ico` na landing tem dois `<title>`** | `apps/web/app/[locale]/(home)/page.tsx:15` (`generateMetadata` da home roda com `favicon.ico` no lugar do idioma) · `apps/web/shared/lib/localeSegment.ts:9-13` (a recusa acontece no layout, depois) | Medido pelo `/test` da PR #71: `document.title` mostra o do Next, e o segundo `<title>` vem da home. Ninguém lê esse título, porque o endereço não é página. P, valor quase nulo |
| 🟢 **`organizationOwnership.spec.ts` estoura o tempo sob `next dev` local** (rebaixado de 🟡 em 2026-11-24, pós-PR #74; a parte do CI fechou) | `apps/e2e/tests/organizationOwnership.spec.ts:68` | Medido pelo `/test` da PR #71 em três execuções locais, cada uma quebrando num ponto diferente, sempre por tempo, com `next dev` frio. **Fechado no CI:** a reprovação por contraste da execução de merge da PR #73 vinha da busca dos convites, que começava depois de as esperas de opacidade passarem; a PR #74 passou a esperar a `GET /organization/invitations` e o botão habilitado antes do axe (`:20`, `:187`), o `/test` mediu 10 de 10 com `--retries=0`, e o `e2e` da execução de merge passou sem instável. Sobra o tempo sob `next dev` frio na máquina local, que não apareceu no CI. P |

**Lacunas de teste e 🔒 herdados da PR #71, com veredito desta auditoria:**

| lacuna | veredito 2026-11-23 | motivo |
|--------|---------------------|--------|
| O PNG renderizado pelo `ImageResponse` sem regressão automática | **continua aberta**, risco baixo | medido em runtime pelo `/develop` e pelo `/test`; `openGraph.test.ts` cobre a montagem do cartão, não o render |
| O validador de Open Graph com a landing publicada | **fora de escopo**, 🔒 | exige domínio público; virou a caixa do `PRE-PRODUCTION.md` §18 (pendência 34) |
| O `x-robots-tag` ausente em resposta da `web` que não passa pelo proxy | **continua aberta**, risco baixo | nenhuma rota da `web` grava o cabeçalho fora do proxy; o `/test` mediu `robots.txt`, `sitemap.xml` e a imagem sem ele |
| O HTML vazio do 404 da landing sem teste em nenhuma direção | **continua aberta**, depende da E16 (era a D17) | aceitando, não há o que travar; recusando, o teste é um `request.get` no E2E contando o `<h1>` |
| O 404 da landing mostrando o cartão no navegador | **fechada** pela PR #71 | E2E novo em `apps/e2e/tests/landing.spec.ts`, com `toHaveTitle` e `expectAccessible` |

**Reconferência dos achados da PR #71 em 2026-11-23, pós-PR #73:** os quatro **continuam abertos**; o do E2E instável
foi promovido a 🟡, porque reprovou o CI do merge da PR #73. A PR #73 não tocou `apps/api`, os `.env.example`, a home
da landing nem o arquivo do teste (tocou só a página da organização, para o título). **Pós-PR #72:** os quatro **continuavam abertos**. A PR #72 não tocou
`apps/api`, os `.env.example`, a home da landing nem `organizationOwnership.spec.ts`. O `405` segue: a rota de saúde
exporta só `GET` (`apps/api/app/(routes)/health/route.ts:5`). O E2E instável passou de novo no CI da execução de
merge (`[chromium] › tests/organizationOwnership.spec.ts:68:1`, 21,3 s) e não entrou no projeto `mobile`.

### 🆕 Achados da PR #72 (2026-11-23)

Vindos do `develop/handoff.md`, do `review/review.md` e do `test/report.md` de `delivery-product-quality-slice-2` e
das medições desta auditoria, conferidos no código de `main` (`18288c9`). Nenhum bloqueou a entrega. Antes de
registrar, a auditoria procurou cada caso neste arquivo (`destination stream`, `toggleSidebar`, `SIGTERM`,
`lighthouse`) e não achou linha anterior.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O cliente que fecha a conexão no meio da renderização vira `[request] failed` no log** | `packages/shared/utils/helpers/requestErrorReporter.ts:39-53` (registra todo erro que o Next passa ao `onRequestError`) · `apps/app/instrumentation.ts:4` | O job `e2e` da execução de merge da PR #72 registrou 7 linhas `[app] [request] failed … routeType=render` em `/pt-br`, `/pt-br/admin` e `/pt-br/onboarding`, todas com `Error: The destination stream errored while writing data`, o que acontece quando a navegação segue antes de a resposta terminar; os testes passaram. O `/review` da PR #72 achou o mesmo no CI de `a391d1c`, então é anterior. Hoje é ruído de log; com um coletor (E1, pendência 8), cada linha vira alerta falso. P: decidir no `/analyze` de `observability-logging` se o erro de stream fechado sai do relatório |
| 🟢 **No celular, o primeiro toque no botão da barra lateral se perde antes da hidratação** | `packages/design-system/components/ui/sidebar.tsx:115-117` (`toggleSidebar` alterna o estado de desktop enquanto `isMobile` ainda é `false`) · `apps/e2e/support/panelNavigation.ts` (o helper repete o toque) | Medido pelo `/test` da PR #72: em 10 execuções que usam o helper, 1 precisou de dois toques. Para uma pessoa a janela é de milissegundos, e o E2E cobre com o retry, que não esconde menu que nunca abre. P, no componente compartilhado |
| 🟢 **Um `SIGTERM` mandado só ao `node` do `pnpm lighthouse` não chega ao `npx lighthouse`** | `apps/e2e/lighthouse/run.mjs:215` (o filho não é `detached`) · `:288-302` (o handler derruba o `next start`, não o filho) | Registrado pelo `/review` sem correção: com Ctrl+C o terminal sinaliza o grupo inteiro e o filho cai junto, que é o uso documentado. Um orquestrador que mande `SIGTERM` só ao processo pode deixar um Chromium aberto até a página terminar. P |
| 🟢 **Uma execução do `pnpm lighthouse` não sustenta o número que o relatório de entrega cita** | `apps/e2e/lighthouse/run.mjs` (uma execução por página, Q9 do plano) · `docs/delivery/03-product-quality.md:116-123` ("copie essa tabela para o relatório") | Em dez execuções na mesma máquina e no mesmo dia (cinco das etapas da PR #72, cinco desta auditoria), a Performance da home foi de 57 a 97 e o LCP dela de 2,3 s a 7,6 s, cruzando as faixas ✅ e 🟡 da parte 3. O relatório de um fork pode ganhar ou perder um 🟡 pela sorte da execução. P: a E18 (era a D19) |

**Lacunas de teste e 🔒 herdados da PR #72, com veredito desta auditoria:**

| lacuna | veredito 2026-11-23 | motivo |
|--------|---------------------|--------|
| `run.mjs` sem teste unitário do ciclo de processo e sinais | **continua aberta**, risco baixo | o `/test` mediu o Ctrl+C por execução nas duas rodadas (6 de 6 na rodada 2); o `/review` decidiu não escrever o teste que sobe processo de verdade |
| O ramo "Lighthouse sai com código ≠ 0" sem execução | **fechada** pelo `/test` da PR #72 | `CHROME_PATH=/usr/bin/false` produziu as três linhas `not measured`, a seção com o motivo e exit 1 |
| `pnpm lighthouse --url` contra uma preview da Vercel | **fora de escopo**, 🔒 | exige deploy; o `--url` contra um `next start` local foi medido (V5) |
| Tema escuro e os outros idiomas a 390 px | **fora de escopo** | o projeto `mobile` roda em `pt-br` e no tema claro por decisão do plano (Q2); o resto segue com o `agent-browser` no `/deliver` |

**Reconferência dos achados da PR #72 em 2026-11-23, pós-PR #73:** os quatro **continuam abertos**. O
`[request] failed … The destination stream errored while writing data` apareceu de novo no job `e2e` da execução de
merge da PR #73 (12 linhas, em `/pt-br`, `/pt-br/admin` e `/pt-br/onboarding`). A PR #73 não tocou
`requestErrorReporter.ts`, `sidebar.tsx`, `run.mjs` nem `summary.mjs`.

### 🆕 Achados da PR #73 (2026-11-23)

Vindos do `develop/handoff.md`, do `review/review.md` e do `test/report.md` de `delivery-product-quality-slice-3` e
das medições desta auditoria, conferidos no código de `main` (`5829ea3`). Nenhum bloqueou a entrega. Antes de
registrar, a auditoria procurou cada caso neste arquivo (`stackEnv`, `screenTitled`, `measuring`, `sendBeacon`) e não
achou linha anterior. O teste instável que reprovou o CI da execução de merge não está aqui: é a linha promovida em
[Achados da PR #71](#-achados-da-pr-71-2026-11-23). O `generate_lead` com `params` indefinido, que o `/test` registrou,
não entra: o `gtag` trata o terceiro argumento ausente como evento sem parâmetro.

**Pós-PR #74 (2026-11-24):** A pilha do E2E sem `NEXT_PUBLIC_API_URL` na landing fechou com a PR #74 (`apps/e2e/support/stackEnv.ts:87`).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟢 **O `screenTitled` do E2E monta a `RegExp` com o rótulo do dicionário sem escapar** | `apps/e2e/tests/entityCrud.spec.ts:15` | Registrado pelo `/review` sem correção. Os rótulos de hoje não têm metacaractere; um fork que copie o padrão para um recurso com `(`, `+` ou `?` no nome recebe um teste que reprova ou passa por engano. P |
| 🟢 **Aceitar o banner com o popup do Google aberto deixa aquele cadastro sem `sign_up`** | `packages/analytics/provider.tsx:102-113` (o `trackEvent` guarda o `measuring` do render em que a mutação começou) | Registrado pelo `/review` sem correção. O erro é para menos, nunca um envio sem consentimento. P, valor baixo |

**Lacunas de teste e 🔒 herdados da PR #73, com veredito desta auditoria:**

| lacuna | veredito 2026-11-23 | motivo |
|--------|---------------------|--------|
| Ver os eventos chegarem numa propriedade GA4 real | **fora de escopo**, 🔒 | exige conta no Google; virou o item 19 do `PRE-PRODUCTION.md` (pendência 35) |
| Nenhum teste automatizado chega ao `window.dataLayer` real nem à corrida com o `window.location.replace` das telas da app | **continua aberta**, risco baixo | o `/test` mediu no navegador que o evento sobrevive ao carregamento completo nas duas telas; um teste automatizado exigiria o `gtag` real no E2E, que roda sem id do GA |
| O `sign_up` do Google no login da landing com `?redirect=` para outra origem | **continua aberta**, risco baixo | o `router.push` vira navegação completa antes do callback; o `gtag` usa `sendBeacon`, o que não foi medido. Exige primeiro acesso com Google vindo de um link com redirect |
| Aceitar o banner e enviar o contato no mesmo instante | **continua aberta**, 🔒 por reprodução | o evento pode entrar na fila antes do `gtag('config')`; o pior caso é não medir |
| O `panelTitles.test.ts` quebrando com a chamada em várias linhas | **fechada** pelo `/review` da PR #73 | a comparação ignora espaço e quebra de linha, medida com duas sondas |

### 🆕 Achados da PR #74 (2026-11-24)

Vindos do `develop/handoff.md`, do `review/review.md` e do `test/report.md` das cinco pastas da PR e das medições
desta auditoria, conferidos no código de `main` (`c58f2ef`). Nenhum bloqueou a entrega. Antes de registrar, a
auditoria procurou cada caso neste arquivo (`LEAKY_TOKEN`, `gitleaks`, `motion-dom`, `call stack`, `dblclick`,
`estado vazio`, `PREFERENCE_COOKIE`) e não achou linha anterior.

**Fechados pela PR #74:** o ⚠️ do gate de `CORS_ORIGIN` que não derrubava o processo; o 🟡 do TTL do `x-locale`; o 🟡
do helper de cookie sem `Secure`; o 🟡 do laço de recarga com a sessão recusada; o 🟡 do foco escondido pelo rodapé
fixo; o 🟢 do `signInStartedHereRef`; o 🟢 do componente `@repo/auth/components/sign-in` morto; o 🟢 do logout que não
chegava à landing no E2E; e o 🟢 da pilha do E2E sem `NEXT_PUBLIC_API_URL` na landing. **Reduzidos:** a renovação de
sessão (sobra o rate limit), os dois `AuthProvider` da landing (sobra a duplicação de `POST`), os quatro chamadores
que engolem a falha da revogação (o log virou `logEvent`) e o E2E de `organizationOwnership`, rebaixado de 🟡 a 🟢
(sobra o tempo sob `next dev` local). Cada fechamento foi conferido no código; as âncoras estão em
[Tarefas diretas entregues](#tarefas-diretas-entregues-sem-spec) e na conferência das fatias da
[spec](../../docs/features/delivery-security-review/spec.md).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O job `secrets` reprovou na PR #74 e na execução de merge dela, por um JWT fictício de teste** | `packages/auth/__tests__/serverErrorLogging.test.ts:62` (`LEAKY_TOKEN`) · `.github/workflows/ci.yml:78-95` (Gitleaks com `--redact`, só nos commits novos) | O log diz só `leaks found: 1`; a identificação veio de uma execução local do Gitleaks na primeira parte desta auditoria, não repetida na retomada. A `main` ficou com a execução de merge vermelha (`gh run 45408797430`), e a PR entrou mesmo com o job vermelho na execução dela (`gh run 45389706834`), porque nada exige o check (E3). O passo só examina commits novos, então o vermelho não se repete sozinho, mas volta em qualquer commit que toque a linha. O repositório não tem `.gitleaksignore` nem `.gitleaks.toml`. P: um comentário `gitleaks:allow` na linha, ou a impressão digital do achado num `.gitleaksignore`. A D22 foi respondida em 2026-11-24: a spec foi arquivada, e a marcação é a primeira tarefa direta da fila |
| 🟡 **`pnpm --filter email build` quebra** | o `@react-email/preview-server` (`'activeAnimations' is not exported from 'motion-dom'`, no `toolbar.tsx` dele) | Medido pelo `/develop` da fatia 3 com e sem a linha do `server-only`: o build do preview de e-mail falha igual, então é anterior à PR. Os templates (`packages/email/templates`) não importam o `index.ts` e o envio não depende do preview; quem sente é quem roda `pnpm build` inteiro ou o preview em produção. A #68 do Dependabot (`react-email` 4 → 6, D16) pode resolver por tabela; não foi medido. P a M |
| 🟢 **O `onSuccess` do login escreve o `Authorization` do `apiClient` mesmo quando o provider recusou a sessão e deslogou** | `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx` e `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx` (o `onSuccess` do `mutate`) | Registrado pelo `/review` de `app-auth-refused-session-reload-loop`. O header fica com o token de quem acabou de sair. Não causa laço; na app, contraria a regra de que só o `AuthRequestPanelProvider` escreve esses headers (`apps/app/CLAUDE.md`). Anterior à PR. P |
| 🟢 **No login da app, um duplo clique envia duas vezes antes de o botão travar** | o botão e o `signIn.isPending` do login da app | Medido pelo `/test` de `app-auth-refused-session-reload-loop`: um `dblclick` nativo dispara duas tentativas e dois alertas de erro, sem sucesso nem navegação. Com um clique só, o botão trava em 9 ms. P |
| 🟢 **A tabela que espera o token mostra o estado vazio antes de buscar** | os convites do dono na página da organização e qualquer tabela sob personificação | Registrado pelo `/analyze` de `e2e-org-ownership-flake-and-web-api-url` por leitura, não medido. A pessoa vê "nenhum item" por um instante e depois a lista. É a mesma janela que deixava o E2E instável. P a M |
| 🟢 **SSR com `RangeError: Maximum call stack size exceeded` no `next dev`** | criar e editar usuário (admin) e criar entidade, em carga completa; o stack aponta para o carregamento de módulos do Turbopack em `.next/dev` | Medido pelo `/test` de `app-footer-focus-not-obscured`: a página cai para render no cliente e funciona; em `next build && next start` o mesmo pedido responde 200 sem erro, e o erro não apareceu no `pnpm e2e`. Só desenvolvimento. Hipótese do `/test`, não investigada: uma cadeia de `require` profunda. P a M |
| 🟢 **Constantes duplicadas: quatro cópias de `"access-token"` e três de 180 dias** | `apps/api/(shared)/lib/cookie-write-origin.ts:5` (a quarta cópia do nome do cookie) · as constantes de 180 dias da `app` e da `web` ao lado de `PREFERENCE_COOKIE_MAX_AGE_SECONDS` (`packages/shared/utils/helpers/cookies.ts`) | Registrado pelo `/review` da fatia 2 (Q14 e Q17 do plano): importar `@repo/auth/session` no proxy da API levaria `firebase-admin` e `next/headers` junto. Mesmo valor em todas as cópias hoje; um fork que renomeie o cookie precisa achar as quatro. P |
| 🟢 **`@repo/email` importa `server-only` sem declarar a dependência** | `packages/email/index.ts:1` · `packages/email/package.json` | Resolve pelo `public-hoist-pattern[]=*` do `.npmrc`, como o `@repo/auth`, que também não declara. O `/review` manteve para não mexer no lockfile. Some na mesma passada da linha de dependências não declaradas, em [Dependências, exports e código morto](#-dependências-exports-e-código-morto). P |

**Lacunas de teste e 🔒 herdados da PR #74, com veredito desta auditoria:**

| lacuna | veredito 2026-11-24 | motivo |
|--------|---------------------|--------|
| O encerramento do processo sem `CORS_ORIGIN` numa função da Vercel | **fora de escopo**, 🔒 | exige deploy; virou a caixa do `docs/PRE-PRODUCTION.md` (`:388-390`), que pede conferir no primeiro deploy de preview sem a variável |
| O envio real do e-mail pelo Resend depois do `server-only` | **fora de escopo**, 🔒 | pendência 13 |
| O toast da caixa de URL do avatar e da foto sem Storage | **continua aberta**, 🔒 parcial | o `/test` mediu a recusa por `curl` e no navegador; o toast com o Storage desligado ficou parcial |
| O login pelo Google na landing com um `AuthProvider` só | **fora de escopo**, 🔒 | exige o popup real; o E2E cobre o login por senha e o SSO |
| Safari, Firefox e teclado virtual no `scroll-padding` das barras fixas | **continua aberta** | o `/test` mediu no Chromium a 375, 390 e 1280 px; os outros motores ficaram como não verificados no plano |

### 🆕 Achados da PR #75 (2026-11-25)

Vindos das medições desta auditoria: o CI das duas execuções da PR, o artefato `e2e-evidence` e a varredura de links
de `specs/`. A PR #75 não tem pasta em `docs/features/` (não passou pelo pipeline de feature). Antes de registrar, a
auditoria procurou `focusNotObscured`, `menuitem` e `kickoff` neste arquivo e não achou linha anterior.

**Veredito dos achados da PR #74, um a um:** o 🟡 do `LEAKY_TOKEN` **continua aberto** (o `secrets` voltou ao verde só
porque o Gitleaks olha os commits novos; a linha e a falta de `.gitleaksignore` seguem); o 🟡 do
`pnpm --filter email build` **continua aberto**, medido de novo nesta auditoria: o build falha com o mesmo `'activeAnimations' is not exported from 'motion-dom'`; os cinco 🟢 (o `Authorization` depois da recusa, o duplo clique, a
tabela vazia antes de buscar, o `Maximum call stack` do `next dev` e as constantes duplicadas) e o 🟢 do `server-only`
sem dependência declarada **continuam abertos**, porque a PR #75 não mexeu em nenhum arquivo de `apps/` ou
`packages/`. As cinco lacunas de teste da PR #74 mantêm o veredito de 2026-11-24 pelo mesmo motivo.

**Fechado nesta rodada, sem PR:** os seis links mortos das notas de pesquisa (abaixo, corrigidos pela auditoria em
`specs/`), e a recomendação de política sobre o §4.1 do `spec-audit`, que a PR #75 atendeu com o passo 8 ("Conserte
os links que o movimento quebrou"; ver [Decisões estacionadas](#decisões-estacionadas-51)).

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O E2E `focusNotObscured` reprova na `main` desde a PR #75: o menu de ações não abre** | `apps/e2e/tests/focusNotObscured.spec.ts:188-197` ("arrow keys keep the focused genre option clear of the action bar") | Medido nesta auditoria nos logs de `gh run 45625331528` (execução da PR) e `gh run 45633106961` (execução de merge): nas quatro tentativas, o `locator.click` do item "Editar" esgota os 120 s, com 44 testes passando. O retrato da página no artefato mostra o botão "Mais ações" da linha "Acme Franchise" com o foco e nenhum menu. Passou na execução de merge da PR #74 e a PR #75 não mexeu em código de app, então a causa não está no diff; a hipótese (não medida) é o clique chegar antes de a lista hidratar. Deixa vermelho o job `e2e` de toda PR até ser corrigido, e é o mesmo teste que `app-form-layout-centered` vai mexer. P a M. **Conserto no working tree da branch `feat/app-form-layout-centered`, aguardando merge:** o `/test` da rodada confirmou a causa (o clique em "Mais ações" chega antes da hidratação) e reclica com `expect().toPass()`, medido 15/15 com `--repeat-each=5` e 10/10 no caso 3. Fecha no `--sync` depois do merge |

**Lacunas avaliadas nesta rodada:**

| lacuna | veredito 2026-11-25 | motivo |
|--------|---------------------|--------|
| Reproduzir o E2E vermelho localmente | **continua aberta** | a auditoria não sobe a pilha do E2E (emulador, três servidores e navegador); fica para a tarefa direta |
| O `pnpm kickoff` tem teste próprio (`pnpm kickoff:test`, `node --test`) fora do `turbo` | **fora de escopo** | é ferramenta de começo de fork, sem código de produto; os dois arquivos de teste não entram em nenhum gate do CI. Registro, não defeito |

### 🆕 Achados do `/test` de `app-form-layout-centered` (2026-11-25, ainda no working tree)

Vindos do `/test` da rodada do `/cycle` que implementou `app-form-layout-centered`, ainda não commitada (pasta
`docs/features/app-form-layout-centered/`). As medições são do `/test`; a auditoria conferiu as âncoras no código de
`b7f9124` e não repetiu as medições.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **O CSS do antd não sai no HTML do servidor** | `packages/design-system/providers/antd-app.tsx` (o `ConfigProvider`, montado por `DesignSystemProvider` em `packages/design-system/index.tsx:48`); nenhum `AntdRegistry`, `StyleProvider` ou `extractStyle` em `apps/` e `packages/` (`git grep`, 0) | Medido pelo `/test` em `next build && next start`: o HTML do servidor traz a tabela sem nenhuma tag `<style>`. Com 300 ms de latência, a tabela fica cerca de 4,7 s sem estilo (linhas de 40 px) até a hidratação injetar 21 tags de estilo (linhas de 73 px); sem limitar a rede, o salto aparece em 1 de 2 cargas, por cerca de 81 ms. Toda tela com componente antd pula de layout na primeira carga. A correção provável, não medida, é o `@ant-design/nextjs-registry` no layout da app; como é dependência nova, passa pela sua decisão (D24). P a M |
| 🟢 **O primeiro caso do E2E de foco passa por margem estreita** | `apps/e2e/tests/focusNotObscured.spec.ts:106-109` (a pré-condição "some field must start under the action bar") | Medido pelo `/test` a 375×812: a pré-condição depende de um campo só, o de nascimento, começar abaixo da barra (barra em 743 px, campo em 749 px). Uma mudança de espaçamento de 6 px faz o teste falhar sem defeito real. P |
| 🟢 **O `next dev` grava `AGENTS.md` nas três apps** | `apps/app`, `apps/web`, `apps/api`; o `.gitignore` não cita `AGENTS.md` | Registrado pelo `/test`: os arquivos aparecem como não rastreados depois de subir as apps em desenvolvimento e sujam o working tree. Na hora desta auditoria os três arquivos não estavam no disco, então a auditoria não reproduziu. Saídas sugeridas: uma linha no `.gitignore` ou desligar a geração no `next.config.ts` de cada app (o nome da opção, `agentRules`, não foi conferido na documentação do Next 16). P |

### 🆕 Achados do `/test` de `admin-own-account` (2026-11-25, ainda no working tree)

Vindos da segunda rodada do `/cycle`, na mesma branch de `app-form-layout-centered`, ainda não commitada. As medições
são do `/test` e do `/develop` da rodada; a auditoria conferiu as âncoras no código de `b7f9124` e não repetiu as
medições. `admin-own-account` segue `approved`: só vira `done` no `--sync` depois do merge.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A suíte da `app` falha sob carga, cada vez num arquivo** | `apps/app/__tests__/auditFiltersDateInput.test.tsx`, `apps/app/__tests__/signInEmailLinkEntry.test.tsx` (os `findByRole` em `:81` e `:93`), `apps/app/__tests__/tableLoadMore.test.tsx` (o `cleanup()` em `:51` e `:86`); o teto por teste é `testTimeout: 20_000` (`apps/app/vitest.config.mts:13`) | Medido pelo `/test` com load average de 35 a 58: `pnpm --filter app test` deu 1359 de 1360 em duas rodadas, falhando `auditFiltersDateInput` numa e `signInEmailLinkEntry` na outra; no `/develop` caiu também `tableLoadMore`, com um erro não tratado do jsdom depois do teardown, que faz o Vitest sair com código 1. Os três passam isolados, três vezes cada, e nenhum importa código das duas features da branch (conferido pelo grafo de import, não por execução contra `main`). Esta auditoria viu o mesmo padrão com load até 16: 6 testes da `app`, 3 da `web` e 5 do `@repo/design-system` caíram por tempo e passaram em série (ver [Gates](#gates-medidos-nesta-auditoria)). Como o `build` depende de `test`, `pnpm test` e `pnpm build` ficam vermelhos em máquina carregada. Hipótese de correção, não medida: prazo maior nos `findBy*` desses arquivos e limpar o que o `tableLoadMore` deixa pendente antes do teardown. P a M |
| 🟢 **Personificando, "Escolher imagem" do avatar fica habilitado na conta comum** | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx:111-120` em `b7f9124` (o `HookFormImageUpload` sem `disabled`), enquanto o Salvar recebe `disabled={isImpersonating \|\| isUploading}` (`:140`); o botão vem de `packages/design-system/components/ui/image-upload-input.tsx:186` | Medido pelo `/test`: o admin personificando escolhe um arquivo, mas a API recusa o upload com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`, então nada vaza nem é gravado. É incoerência de UI anterior à branch. P |
| 🟢 **Aviso de `src=""` no console do `next dev`, três vezes na conta** | candidato provável, não confirmado: `apps/app/shared/components/ui/ProfileDropdown.tsx:44` (`account?.avatarUrl ?? user?.photoURL ?? ""`) passa string vazia ao `AvatarImage` (`:53`) quando a conta não tem avatar. O `ImageUploadInput` não é a origem: ele só renderiza a imagem com `previewUrl` preenchido (`image-upload-input.tsx:82`, `:168`) | Registrado pelo `/test`; anterior à branch. Só ruído de desenvolvimento, mas o navegador pode tentar buscar a página atual como imagem quando `src` é vazio. P |

### Tarefas diretas resolvidas no working tree (2026-11-26, aguardando commit/merge)

Na madrugada de 2026-11-26, a mesma rodada do `/cycle` resolveu onze tarefas diretas no working tree da branch
`guilhermebittelbrunn/claude-cycle-full-pipeline`, sem commit nem merge. Cada uma tem pasta em `docs/features/<slug>/`.
**Nenhum achado abaixo está fechado:** o fechamento é do `--sync` seguinte ao merge, que confere o código em `main`.
Os números são dos artefatos de cada tarefa; esta auditoria não os repetiu.

| feature | achado deste arquivo que ela trata | situação |
|---------|------------------------------------|----------|
| `app-test-suite-stability` | 🟡 a suíte da `app` que falha sob carga (três arquivos) | **mitigado, não provado**: os sintomas originais não se reproduziram durante a tarefa, então não há antes e depois medidos |
| `account-avatar-polish` | 🟢 "Escolher imagem" habilitado sob personificação; 🟢 o `src=""` no console | resolvido no working tree. A causa do `src=""` era a URL do avatar passar de carregada para `""`, não a conta sem avatar |
| `auth-revocation-failure` | 🟡 os quatro chamadores que engolem a falha da revogação (`packages/auth/server.ts:359-365`) | resolvido no working tree em três dos quatro; o expurgo continua sem falhar quando a revogação falha, de propósito. Código de erro novo: `USERS_SESSIONS_NOT_REVOKED` |
| `repo-hygiene-ci` | 🟡 o `LEAKY_TOKEN` (D22); 🟢 o `AGENTS.md` do `next dev`; o `ignore` de versão maior do `stripe` (D16) | resolvido no working tree: `gitleaks:allow` na linha, medido com o Gitleaks 8.30.1; `agentRules: false`; `ignore` com `update-types: ["version-update:semver-major"]` em `.github/dependabot.yml:12-13` |
| `stripe-customer-lookup-mapper` | sem linha prévia | resolvido no working tree: o `userMapper` passa a ir no `super` do repositório, e quatro leituras devolvem `Date` |
| `focus-e2e-precondition` | 🟢 a pré-condição frágil do primeiro caso do E2E de foco (`focusNotObscured.spec.ts:106-109`) | resolvido no working tree: de um campo com 6 px de folga para 11 controles, com folga mínima de 19 px |
| `setup-docs-cleanup` | o A3 (`STRIPE_*` na `app` e na `web`) | resolvido no working tree; o `docs/SETUP.md` passa a citar `gitleaks git --pre-commit [--staged]` |
| `base-repository-id-precedence` | sem linha prévia | resolvido no working tree: `{ ...raw, id }` no repositório base, para o `id` do documento vencer um campo `id` gravado. Fecha um caminho latente de troca de identidade nos guards, que a tarefa do mapper tinha alargado |
| `avatar-preview-mobile-shrink` | sem linha prévia | resolvido no working tree: `shrink-0` na prévia do avatar, medida em 64×64 no celular |
| `google-signin-copy-i18n` | 🟢 os dois textos fixos em inglês de `googleSignInApi.ts` (`:61`, `:75`) | resolvido no working tree |
| `notification-markread-missing` | 🟢 `markRead` contra documento apagado (`notification.repository.ts:63-68`) | resolvido no working tree: a corrida responde `404` |

### 🆕 Achados das tarefas diretas da madrugada (2026-11-26, ainda no working tree)

Vindos dos artefatos das onze tarefas acima. As âncoras foram conferidas no working tree, que já contém as mudanças da
branch; as medições são das tarefas.

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A suíte do design system também cai sob carga** | `@repo/design-system` | Medido nas tarefas: 4 de 173 testes caíram com load de 19 a 32 na primeira execução e passaram nas duas seguintes; os nomes não ficaram no log. Esta auditoria viu o mesmo em 2026-11-25 (5 de 172 com load até 16, todos por tempo). Junto com o da `app`, deixa `pnpm test` e `pnpm build` vermelhos em máquina carregada. P a M |
| 🟡 **`[vitest-pool]: Timeout starting forks runner` derruba o `pnpm test` da raiz sem teste reprovado** | o pool de forks do Vitest; visto duas vezes na `api` | Com load acima de 20 a 80, o Vitest não sobe os processos e a tarefa sai vermelha sem nenhuma asserção falhar. A auditoria de 2026-11-24 viu o mesmo no `e2e#test`. Só vale ação se aparecer no CI, onde a máquina não divide CPU com outras sessões. P |
| 🟢 **Mais três testes da `app` instáveis sob carga, fora do escopo das tarefas** | `apps/app/__tests__/signUpFormSubmitLock.test.tsx`, `accountSignInMethodsPanel.test.tsx:247`, `accountTabs.test.tsx:333` | Vistos com 16 a 32 processos `yes` gerando carga. Mesmo padrão da linha da suíte da `app`. P |
| 🟢 **Limpeza automática do Testing Library não é global na `app`** | `apps/app/vitest.config.mts` (`setupFiles`) | Cada arquivo chama `cleanup()` por conta própria, e o que esquece deixa estado para o seguinte. Ligar a limpeza global é decisão técnica que mexe em todos os testes da `app`; a recomendação das tarefas é uma tarefa própria. P |
| 🟢 **Shift+Tab num textarea longo deixa o topo do campo sob a navbar** | `apps/app/app/layout.tsx:71` (`scroll-pt-20` com `Navbar`) · `packages/design-system/components/ui/textarea.tsx:11` | Medido: o topo do campo fica 59 px acima da borda da navbar, com o cursor visível. Passa o WCAG 2.4.11 (AA, o foco não fica inteiramente escondido) e falha o 2.4.12 (AAA). P |
| 🟢 **Personificando alguém sem nome, o menu do perfil mostra o nome do admin** | `apps/app/shared/components/ui/ProfileDropdown.tsx:42` (`account?.displayName ?? user?.displayName`) | O fallback cai no `user` do Firebase, que é o admin, quando o alvo não tem nome. Engana quem está personificando sobre de quem é a conta. Anterior às tarefas. P |
| 🟢 **`markAllReadByUserId` tem a mesma corrida do `markRead`** | `apps/api/(shared)/repositories/notification.repository.ts:85-100` (o `batch.update`) | Se uma notificação some entre a leitura e o `batch.update`, o lote falha inteiro. A tarefa `notification-markread-missing` tratou só o `markRead`. P |
| 🟢 **O toast "Notificação não encontrada" é ruído para notificação expirada** | `apps/app/shared/hooks/useNotificationActions.ts:93-108` (`restoreCache` chama `errorAlert` para qualquer erro) | Com o `404` novo do `markRead`, quem clica numa notificação que expirou vê um erro em vez de a lista simplesmente se atualizar. P |
| 🟢 **A copy de `AUTH_SESSIONS_NOT_REVOKED` manda entrar de novo também no desvincular** | `packages/internationalization/translations/packages/shared/utils.ts:60` (pt-br), `:246` (en) e `:434` (es) | No desvincular método de login a pessoa segue logada, então "Entre de novo" está errado ali. P |
| 🟢 **Três helpers de `toDate()` por duck-typing, cada um com contrato diferente** | `apps/api/(shared)/mappers/user.mapper.ts:95`, `apps/api/(shared)/repositories/organization-invitation.repository.ts:59` (`instantOf`, devolve `Date \| null`), `apps/api/(shared)/lib/onboarding.ts:24` (`toIsoInstant`, devolve `string \| null`) | Cada um trata `Timestamp`, `Date` e string de um jeito. Um campo novo pode sair `Date` num recurso e ISO em outro. P |
| 🟢 **`GET /users` mudou a forma de instante gravado como string** | o mapper de `user` alterado por `stripe-customer-lookup-mapper` | Um instante gravado como `"2026-01-02"` agora sai como `2026-01-02T00:00:00.000Z`. Nenhum escritor do repositório grava string e nenhum consumidor depende da forma antiga; registrado como mudança de contrato observada. P |
| 🔒 **Não confirmado se o `ignore` do `stripe` bloqueia também as atualizações de segurança** | `.github/dependabot.yml:12-13` | A seção `allow` da referência do Dependabot diz que "`update-types` only affects version updates, not security updates"; a seção `ignore` não foi lida. Se o `ignore` valer para segurança, uma correção de CVE do `stripe` em versão maior deixa de chegar como PR. Conferir na documentação antes do merge |

**Pergunta de produto registrada como D25** (ver [Precisam de decisão](#precisam-de-decisão)): o admin não tem como
repetir só a revogação de sessões de uma conta desativada; reativar a conta para desativar de novo expõe as sessões
antigas no intervalo.

### 🆕 Achados da PR #76 (2026-11-26)

Vindos das medições desta auditoria (CI, gates, código de `main` em `a13768c`) e da releitura dos achados das duas
seções anteriores, que a PR levou para `main`. Antes de registrar, a auditoria procurou `#77`, `verify` e `contends_on`
neste arquivo.

**Veredito dos achados herdados, um a um:**

| achado | veredito 2026-11-26 | evidência |
|--------|---------------------|-----------|
| 🟡 E2E `focusNotObscured` vermelho na `main` (PR #75) | **fechado** | `toPass` no clique (`focusNotObscured.spec.ts:218`); `e2e` verde nas execuções da PR e de merge da #76 |
| 🟡 CSS do antd sem SSR | **continua aberto** | nenhum `AntdRegistry`, `StyleProvider` nem `extractStyle` em `apps/` e `packages/`; espera a D24 |
| 🟢 pré-condição frágil do primeiro caso do E2E de foco | **fechado** | `focusNotObscured.spec.ts:83-86` conta todos os controles |
| 🟢 `AGENTS.md` gravado pelo `next dev` | **fechado** | `agentRules: false` em `packages/next-config/index.ts:5`, que as três apps usam |
| 🟡 suíte da `app` sob carga | **fechado como mitigado** | as três edições estão em `main`; a execução 2 desta auditoria passou de primeira com load de 15 a 70, mas com `--concurrency=1`, então não prova a causa |
| 🟢 "Escolher imagem" sob personificação | **fechado** | `AccountProfileForm.tsx:117` |
| 🟢 `src=""` no console | **fechado** | `ProfileDropdown.tsx:44` cai em `null` |
| 🟡 `LEAKY_TOKEN` (PR #74, D22) | **fechado** | `serverErrorLogging.test.ts:62` com `// gitleaks:allow`; `secrets` verde |
| 🟡 `pnpm --filter email build` | **continua aberto** | medido nesta auditoria: mesmo erro do `motion-dom`; a #68 segue aberta |
| 🟡 suíte do design system sob carga | **continua aberto, sem reprodução** | 173 de 173 na execução 2 desta auditoria; nenhuma mudança no código de teste do pacote |
| 🟡 `Timeout starting forks runner` | **continua aberto, sem reprodução** | não apareceu nesta auditoria nem no CI |
| 🟢 mais três testes da `app` instáveis sob carga | **continua aberto, sem reprodução** | passaram nesta auditoria |
| 🟢 limpeza global do Testing Library na `app` | **continua aberto** | `apps/app/vitest.config.mts` segue sem `setupFiles` |
| 🟢 Shift+Tab num textarea longo sob a navbar | **continua aberto** | sem mudança em `apps/app/app/layout.tsx` nem em `textarea.tsx` |
| 🟢 nome do admin no menu durante a personificação | **continua aberto** | `ProfileDropdown.tsx:42` segue com `account?.displayName ?? user?.displayName` |
| 🟢 corrida do `markAllReadByUserId` | **continua aberto** | o `batch.update` segue sem tratar documento apagado (`notification.repository.ts`) |
| 🟢 toast "Notificação não encontrada" para notificação expirada | **continua aberto** | `useNotificationActions.ts` sem mudança na PR |
| 🟢 copy de `AUTH_SESSIONS_NOT_REVOKED` no desvincular | **continua aberto** | `utils.ts:60`, `:246`, `:434` |
| 🟢 três helpers de `toDate()` | **continua aberto** | os três seguem em `main`, cada um com o seu contrato |
| 🟢 `GET /users` com a forma nova de instante gravado como string | **fora de escopo** | registro de mudança de contrato, sem consumidor afetado |
| 🔒 o `ignore` do `stripe` e as atualizações de segurança | **continua não confirmado** | ver [Precisam de decisão](#precisam-de-decisão), "resolvidos sem pergunta" |
| 🟢 os cinco da PR #74 (o `Authorization` depois da recusa, o duplo clique, a tabela vazia antes de buscar, o `Maximum call stack` do `next dev`, as constantes duplicadas) e o `server-only` sem dependência declarada | **continuam abertos** | a PR #76 não mexeu nos arquivos de nenhum deles |

**Novos:**

| achado | onde | por que importa |
|--------|------|-----------------|
| 🟡 **A #77 do Dependabot está vermelha no `verify`** | PR #77 (grupo de produção, 21 atualizações), `gh run 45865909348`, passo `pnpm turbo run lint typecheck test test:emulator` | Aberta em 2026-11-26, logo depois do merge da #76. O log do passo não estava disponível na hora da auditoria, então a causa não foi lida. Junta-se à #67 e à #70 como tarefa direta, uma por PR. P a M |
| 🟢 **27 links mortos nos `analyze/plan.md` de `docs/features/`** | o link de entrada para a spec na linha 3 de cada plano, e links relativos a documentos de `docs/` | Eram 18 em 2026-11-25. Dois são novos desta rodada, os de `app-form-layout-centered` e `admin-own-account`, que apontam para `specs/features/<id>.md`; os demais vêm de planos escritos com caminho relativo errado. O passo 8 do §4.1 do `spec-audit` não cobre o `plan.md`, e os limites da skill não deixam a auditoria editá-lo. Ver [Contradições](#contradições-doc--código). P |

## Pendências vivas sem dono

> A maior parte destas tem **casa versionada** em [`docs/PRE-PRODUCTION.md`](../../docs/PRE-PRODUCTION.md).
> Na auditoria de 2026-11-26 (pós-PR #76) as 35 linhas foram relidas, com veredito: **0 fechadas, 0 novas.** A PR #76
> não pediu variável, serviço nem índice e não mexeu no `PRE-PRODUCTION.md`. Foram remedidas a 6 (branch protection:
> 404 e `[]`), a 16 (branches vivas: 73 cabeças, com `feat/admin-account-forms-and-session-revocation` viva depois do
> merge) e a 32 (secret scanning: `gh api .../secret-scanning/alerts` devolve **1** alerta aberto); a 33 ficou **não
> medida** (`git for-each-ref 'refs/conductor-checkpoints/*'` dá 0 neste workspace, e a regra do ciclo proíbe abrir outro
> checkout). As publicações de índices e rules (1 a 4 e as demais de console) não foram medidas: o servidor MCP do
> Firebase não conectou nesta sessão, e a auditoria não tem credencial de projeto real. As demais linhas mantêm o
> veredito escrito nelas: **continuam abertas** a 1 a 5, 7, 10, 11, 13 a 15, 17, 20, 22 a 35 (a 12 e a 18 pela metade,
> a 25 como opcional declarada); **fora de escopo** da auditoria a 9 e a 19 (painel de plataforma); **fechada** a 21
> (pelo usuário em 2026-09-25). Os registros das auditorias anteriores, de 2026-10-23 a 2026-11-25, estão nas versões
> deste arquivo em `afb5b35`, `a391d1c`, `18288c9`, `c58f2ef`, `b7f9124` e `a13768c`.

| # | pendência | onde vive | veredito (2026-10-23, pós-PR #57, nas linhas remedidas; datas anteriores nas demais) |
|---|-----------|-----------|---------------------|
| 1 | 🔴 Publicar os três índices dos resumos da home (`GET /entities/summary` e `/users/summary` respondem 503 sem eles) | `PRE-PRODUCTION.md` §1.5 | **continua aberto, medido de novo em 2026-10-23, pós-PR #57**: o `ListIndexes` do Firestore Admin em `next-boilerplate-576d0` (pelo MCP do Firebase, grupo `-`) devolve um único índice composto, o de `user` `reference_id` + `deletedAt`, `READY`. **Ampliado:** os dois índices de `entity` do resumo passaram a `organizationId` + `deletedAt` + (`enabled` ou `type`), e o §1.10 (`PRE-PRODUCTION.md:299-331`) pede publicá-los **antes** do deploy da API, senão a home responde 503 |
| 2 | 🔴 Publicar o índice das faixas de recência (`user`: `deletedAt` + `lastAccessAt`) | `PRE-PRODUCTION.md` §1.7 | **continua aberto, medido em 2026-10-23**; idem |
| 3 | 🔴 Publicar o índice da trilha de auditoria (filtro por usuário responde 503) | `PRE-PRODUCTION.md` §1.2 | **continua aberto, medido em 2026-10-23**; idem |
| 4 | 🔴 Publicar o índice da listagem paginada de `entity` | `PRE-PRODUCTION.md` §1.1 | **continua aberto, medido**: o `/test` da PR #35 recebeu `503 PAGINATION_INDEX_MISSING` em `GET /entities` contra o projeto de desenvolvimento (`test/report.md:85`), então o índice não está publicado nem lá; a medição de 2026-10-23 confirma. **Ampliado pela PR #57:** o índice passou a `organizationId` + `deletedAt` + `createdAt`, e o antigo por `userId` saiu do arquivo. Com os dois de `notification` (§1.9, PR #52), seguem **oito** índices sem publicação, de nove declarados; o comando é um só |
| 5 | Retenção da coleção `auditEvent` | `PRE-PRODUCTION.md` §1.3 | **continua aberto**, estacionado (E5) |
| 6 | ⚠️ `main` sem branch protection | `PRE-PRODUCTION.md` §9 (`:801-877`) | **continua aberto**, remedido em 2026-11-25 pós-PR #75 (404, `[]`; as mesmas cinco PRs do Dependabot abertas). A PR #75 entrou com o `e2e` vermelho na execução dela (`gh run 45625331528`), o segundo merge seguido com um check vermelho. Remedido antes em 2026-11-24 pós-PR #74 (404, `[]`; cinco PRs abertas, todas do Dependabot); estacionado (E3). A PR #74 entrou com o job `secrets` vermelho na execução dela; com a proteção exigindo `secrets`, o merge teria parado. Remedido antes em 2026-11-23 pós-PR #73 (404, `[]`, 73 PRs). Sem proteção, o merge da PR #73 entrou com o `e2e` da PR verde e deixou a `main` com a execução de merge vermelha; com a proteção, o check exigido é o da PR, então o caso se repetiria. **Ampliado pela PR #65:** o §9 passou a pedir os checks `verify`, `e2e`, `secrets` e `audit`. É o que falta para o item 2 de `e2e-testing`, arquivada com esse ⚠️ |
| 7 | Backfill de instantes em base que já tem dado | `PRE-PRODUCTION.md` §1.4 | **continua aberto**; não é mensurável daqui |
| 8 | Ninguém vigia a trilha de erro (nenhum coletor) | `PRE-PRODUCTION.md` §11 | **continua aberto**, remedido em 2026-11-25 pós-PR #75: os quatro SDKs de coletor dão 0 e as linhas com `logEvent(` fora de testes seguem em **58** (a PR #75 não mexeu em código). Remedido antes em 2026-11-24 pós-PR #74: `git grep` por `@sentry`, `@logtail`, `@axiomhq` e `betterstack` em `apps/` e `packages/` devolve 0, e as linhas com `logEvent(` fora de testes passaram a **58**: a PR #74 trocou os sete `console.error` de `packages/auth/server.ts` por `logEvent("auth", …)`, sete casos que só um coletor alcança. Em 2026-11-23, pós-PR #73, eram 51 (50 chamadas e a definição). A PR #73 não somou caso, e o CI do merge dela repetiu as 12 linhas `[request] failed` de cliente que fechou a conexão. A PR #72 não somou caso, mas o CI dela mostrou o inverso: sete `[request] failed` de cliente que fechou a conexão, que um coletor transformaria em alerta falso (ver [Achados da PR #72](#-achados-da-pr-72-2026-11-23)). A PR #64 somou um caso que só um coletor alcança: a revogação que falha sai como `[auth] session-revoke-failed` (`(shared)/lib/session-revocation.ts:15`, `account/sessions/revoke/route.ts:13`), e a tela mostra o aviso; estacionado (E1). A PR #58 somou um caso que só um coletor alcança: a falha na conferência do convidado sai como `[organization] invitation-member-check-failed` (`organization/invitations/route.ts:82`), e a tela mostra `503 ORGANIZATION_INVITATION_FAILED`. A PR #57 somou quatro casos que só um coletor alcança: o convite gravado cujo e-mail falhou (`[organization] invitation-delivery-failed`, `organization/invitations/route.ts:162`), a organização que não se cria no cadastro (`membership-create-failed`, `organization-membership.ts:96`) e a migração dos registros antigos que falha ou para no teto (`legacy-claim-failed` e `legacy-claim-unfinished`, `:41` e `:37`). A PR #56 somou dois casos: a entrega do link que falha depois da resposta sai só como `[auth] email-link-delivery-failed` (`auth/sign-in/email-link/request/route.ts:40`), e o provedor de link desligado num projeto real só aparece como `[auth-action-link] refused` no log, com a tela dizendo "Confira seu e-mail" (`PRE-PRODUCTION.md` §15). A PR #52 somou mais um caso: a notificação que não se grava sai só como `[notifications] emit-failed` no log (`(shared)/lib/notifications.ts:46`), e o produtor segue sem ela. A PR #51 trocou um caso por outro: o desvínculo da senha que falha no meio agora registra o `uid` no log (`password-unlink-email-restore-failed`, `account/sign-in-methods/[id]/route.ts:125`), mas a conta pode seguir sem e-mail, e só um coletor faz alguém ver a linha. A PR #50 acrescentou mais um caso que só um coletor alcança: a falha persistente da desativação no primeiro contato vai só para o log (`archived-account-lockout-failed`, `user-merge.ts:64`). A PR #48 tinha deixado o desvínculo da senha sem registro nenhum do `uid` (achado fechado pela PR #51) |
| 9 | Health check da plataforma não aponta para `/health/ready` | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: configuração de plataforma |
| 10 | `SESSION_COOKIE_DOMAIN` em subdomínios distintos | `PRE-PRODUCTION.md` §7 | **continua aberto** (configuração de deploy). Desde a PR #49 o e-mail preenchido em "Ajuda e contato" depende dele: a landing lê a sessão compartilhada, e o `/test` só mediu em `localhost` (🔒) |
| 11 | Cloud Storage não ativado (plano Blaze) | `PRE-PRODUCTION.md` §6 | **continua aberto** em produção. Desde a PR #31, upload, avatar e o passo `storage` do expurgo rodam e têm teste sob o emulador; contra bucket real seguem sem prova o objeto que não abre sem assinatura e a expiração da URL V4 |
| 12 | Revogação de sessão nunca provada ponta a ponta | *(só neste arquivo)* | **metade fechada**, reconhecido na auditoria pós-PR #34: o `/test` de `compliance-docs-kit` mediu em 2026-09-30, contra o projeto Firebase de desenvolvimento, que depois de `revokeRefreshTokens` o cookie emitido antes volta `null`, o bearer volta `null` em `resolveApiActor` e `createSessionCookie` com o token anterior lança `auth/id-token-expired` (`docs/features/compliance-docs-kit/test/report.md`, tabela "Resultado bruto"). É a prova que a ressalva de `session-refresh` pedia para a camada de verificação. **Continua aberto** só o percurso de navegador: sair numa app e ver a outra perder a sessão. O `/test` da PR #35 somou a medição da conta desativada (bearer recusado com e sem revogação, e depois da reativação) e também não subiu navegador |
| 13 | Envio real de e-mail nunca provado | `PRE-PRODUCTION.md` §3 | **continua aberto** (exige domínio com SPF/DKIM). O `/test` da PR #24 viu o envio do e-mail de verificação falhar sob o emulador, com `RESEND_TOKEN` vazio, como esperado. O `/test` da PR #29 deixou 🔒 o e-mail de verificação depois do cadastro pela API (critério 20). O `/test` de `brand-config` deixou 🔒 o nome da marca com acento na caixa de entrada. O `/test` da PR #33 deixou 🔒 a entrega do aviso ao endereço antigo e do link ao novo; sem Resend o pedido responde `503 EMAIL_NOT_CONFIGURED`, medido nos 3 idiomas. O `/test` da PR #49 deixou 🔒 a entrega do formulário de contato na caixa de suporte; sem Resend a rota responde `503 CONTACT_UNAVAILABLE`, e com token falso, `503 EMAIL_SEND_FAILED`, medidos nos 3 idiomas. O `/test` de `web-auth-forms` (PR #55) deixou 🔒 o e-mail de verificação pedido pelo cadastro da landing; sem Resend, `503 EMAIL_NOT_CONFIGURED` nos 3 idiomas. O `/test` da PR #56 deixou 🔒 a entrega do link de acesso; sem Resend, `503 EMAIL_NOT_CONFIGURED`, e com token falso o Resend recusou e a resposta seguiu `200`, sem endereço no log. O `/test` da PR #57 deixou 🔒 a entrega do convite; sem Resend, o `POST /organization/invitations` responde `503 EMAIL_NOT_CONFIGURED` antes de gravar (`organization/invitations/route.ts:55-60`, era `:53-58` até a PR #59), e o `PRE-PRODUCTION.md:752-753` registra que o ciclo com e-mail real nunca rodou. O `/test` da PR #59 deixou 🔒 o envio do convite pelo dono novo e o rótulo "convite enviado" na trilha, pelo mesmo motivo |
| 14 | CSP Report-Only na `apps/web` | `PRE-PRODUCTION.md` §10 | **continua aberto**, deliberado |
| 15 | Contas de QA acumuladas no projeto de desenvolvimento | `PRE-PRODUCTION.md` | **continua aberto, não recontado**: exige o console do Firebase. O `/test` da PR #35 criou e apagou a própria conta (`PRE-PRODUCTION.md:1278`, era `:1275` até a PR #74, `:1228` até a PR #73, `:1203` até a PR #71, `:1162` até a PR #65 e `:1153` até a PR #64). Pelos relatórios, todos os `/test` desde a PR #37 rodaram sob o emulador, com contas `@example.com` que morreram com o processo; o da PR #56 criou cinco `qa-magic-link-*@example.com` lá, e o da PR #57 rodou sob o emulador, que parou sem exportar (`STATE.md` da feature). Os dois `/test` da PR #58 não criaram dado de QA (os `STATE.md` registram "sem dado de QA"). O da PR #59 rodou sob o emulador, com três contas `qa-ownership-*@example.com` e a do seed, apagadas pelo próximo seed (`test/report.md` da feature). O da PR #73 rodou sob o emulador, com onze contas `qa-dpq-slice-3-*@example.com` que morreram com o processo, e não criou conta em projeto real (`test/report.md` da feature). A lista de cada rodada está no relatório da feature e na versão deste arquivo em `9c793c6`. O console não foi aberto |
| 16 | Branches mergeadas vivas no remoto | `PRE-PRODUCTION.md` | **continua aberto, ampliado** em 2026-11-25 pós-PR #75: `git ls-remote --heads origin` devolve 73, as 72 da rodada anterior e `guilhermebittelbrunn/spec-sync`, a da PR #75, viva depois do merge. Em 2026-11-24 pós-PR #74, `git ls-remote --heads origin` devolvia 72, as 71 da rodada anterior e `feat/delivery-security-hardening`, a da PR #74, viva depois do merge. Em 2026-11-23 pós-PR #73 eram 71: as 70 da rodada anterior e `guilhermebittelbrunn/cycle-command-v13`, a da PR #73, que ficou viva depois do merge, como a `feat/delivery-product-quality-slice-2`, a `feat/delivery-product-quality` e a `feat/delivery-infra-hardening`; as cinco do Dependabot são de PRs abertas e não contam como mergeadas. As branches das PRs #56 a #63 seguem vivas. O registro das rodadas anteriores está nas versões deste arquivo em `afb5b35` e `18288c9` |
| 17 | Login com Google sem passe manual com conta real; desde a PR #48, também vincular e confirmar o Google num projeto real | *(só neste arquivo)*; o "User account linking" e os domínios autorizados estão no `FORKING.md` §4, passos 3 e 4 | **continua aberto, ampliado em 2026-10-19.** O `/test` da PR #24 não percorreu o Google no emulador; o da PR #48 percorreu, mas com o IdP falso do emulador. Ficaram 🔒 o popup real do Google, a escolha de "User account linking" do projeto (que muda o primeiro login com Google de uma conta com senha) e a mensagem de `auth/unauthorized-domain` num domínio fora da lista |
| 18 | `storage.rules` nunca publicado (o teste veio com a PR #31) | `PRE-PRODUCTION.md` §6 e `:54-58` | **metade fechada** pela PR #31: `storage.rules` e `firestore.rules` têm teste contra emulador no `verify` (20 e 145 testes; entrega em [`storage-emulator-rules-tests`](../../docs/features/storage-emulator-rules-tests/spec.md)). **Continua aberto** publicar no projeto real, que depende da 11 |
| 19 | Conferir a retenção de log da plataforma | `PRE-PRODUCTION.md` §11 | **fora de escopo** da auditoria: painel do provedor |
| 20 | Reabertura do consentimento no `ProfileDropdown` nunca vista num browser | *(só neste arquivo)* | **continua aberto** |
| 21 | No modo `simple` o titular não alcança a aba de privacidade | `PRE-PRODUCTION.md`, seção "Pendência — no modo `simple`…" | **premissa falsa, medida**: o `simple` não restringe o painel comum, então o titular alcança a aba. **Fechada pelo usuário em 2026-09-25.** A nota de correção fica no documento. Volta se o `simple` passar a restringir o painel comum (E10) |
| 22 | `NEXT_PUBLIC_PRIVACY_CONTACT` precisa ser definida por fork | `PRE-PRODUCTION.md` §7 (checklist) | **continua aberto, reduzido em 2026-10-19.** Vazia, o canal cai no formulário de contato, que desde a PR #49 entrega na caixa de `NEXT_PUBLIC_APP_SUPPORT_EMAIL` e mostra o canal como indisponível sem ela ou sem a Resend. Deixou de ser maquete, mas o fork ainda precisa definir uma das duas variáveis para o titular ter canal |
| 23 | Stripe por fork: catálogo recorrente, Customer Portal, endpoint de webhook na versão `2025-09-30.clover` com **seis** eventos (a PR #27 acrescentou `invoice.paid` e a PR #38, `entitlements.active_entitlement_summary.updated`, `PRE-PRODUCTION.md:545`, era `:542` até a PR #74 e `:456` até a PR #52), recursos cadastrados no Dashboard para o gate por recurso, conferir o custo do Entitlements, chaves na `apps/api`, TTL opcional de `paymentEvent`; e a decisão sobre checar assinatura duplicada na Stripe antes do release | `PRE-PRODUCTION.md` §12 | **continua aberto**. A PR #33 acrescentou ao §12 habilitar a edição do e-mail no Customer Portal, porque a troca de e-mail não atualiza o `customer`. Cinco critérios de `billing-subscription`, quatro de `admin-billing-insights` o cancelamento real no arquivamento pelo admin (PR #28) , o botão de checkout em carregamento (PR #32) a entrega real do evento de recursos (PR #38) e o catálogo, as chamadas e o checkout reais da `/pricing` (PR #47) e a segunda tentativa de arquivamento com assinatura viva (PR #50) e os três avisos de mudança da assinatura no sino (PR #52) e o aviso de checkout na conta reorganizada (PR #62) seguem 🔒 até uma conta real existir. A PR #47 acrescentou ao §12 o parágrafo da página de preços (`PRE-PRODUCTION.md:562-567`, era `:526-531` até a PR #57), sem passo novo: o catálogo é o mesmo da aba de cobrança. `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` seguem vazias nos `.env` locais |
| 24 | 🆕 `ARCJET_KEY` por fork: sem ela o rate limit é no-op, e o cadastro pela API passa a depender dela (a rota usa o Admin SDK, fora do limite do Firebase por IP) | `PRE-PRODUCTION.md` §8 (`:764-800`, era `:761-788` até a PR #65 e `:761-779` até a PR #64) | **aberto**, entrou com a PR #29. **Ampliado pela PR #65:** com a chave, a landing também consulta o Arcjet em toda página que serve (o bloqueio de bot passou a rodar), e a cota precisa caber esse tráfego; os dois orçamentos da API levam o `shield` em `DRY_RUN`, e passar para `LIVE` depois de uma semana em produção é a caixa nova do §8 (`:794-800`). Localmente, o bloqueio só decide com `ARCJET_ENV=development` (`docs/FORKING.md:395`, era `:364` até a PR #75 e `:363` até a PR #71). **Ampliado pela PR #64:** sem a chave, o orçamento padrão também é no-op, então todo `POST`, `PUT`, `PATCH` e `DELETE` da API fica sem limite; com a chave, o orçamento padrão consulta o Arcjet em toda escrita, e a cota do plano gratuito não foi medida (a caixa "Conferir o plano do Arcjet", `:786-792`). O `429` dos dois orçamentos ficou 🔒 no `/test`. A lista estrita tem 21 caminhos (`apps/api/proxy.ts:74-96`, era `:70-92` até a PR #74). Critério 19 do `/test` da fatia 1 🔒. Desde a PR #36, a chave precisa ter o prefixo `ajkey_`: sem ele, a API trata a chave como ausente e registra um erro no boot, e o build de `app` e `web` falha (`PRE-PRODUCTION.md:779-781`). A chave válida contra a Arcjet real segue 🔒 (`/test` da tarefa `arcjet-key-lazy-validation`). O `/test` da PR #46 deixou 🔒 o `429` do `/auth/sign-in`, pelo mesmo motivo (remedido em 2026-10-16). Desde a PR #49 a lista inclui `POST /contact`, e o §8 diz que, sem a chave, qualquer script enche a caixa de suporte e gasta a cota da Resend (`:772-773`); o `429` real da rota ficou 🔒. Desde a PR #51, sem a chave, nada limita quantos corpos acima do teto alguém manda às rotas públicas; até a PR #53 cada um prendia uma conexão por até cerca de 300 s, e desde ela o `413` fecha a conexão, então sobra o custo de cada invocação. Desde a PR #56 a lista inclui `POST /auth/sign-in/email-link/request`; sem a chave, o pedido de link manda e-mail sem teto, como a recuperação de senha, e o `429` real ficou 🔒. Desde a PR #57 a lista inclui `/organization/invitations`, `/invitations/preview` e `/invitations/accept` (17 caminhos, `apps/api/proxy.ts:60-78` até a PR #64); sem a chave sobram o teto de 20 convites pendentes e o intervalo de 60 s entre reenvios (`PRE-PRODUCTION.md:727-729`) |
| 25 | 🆕 Fechar o cadastro pelo REST do Identity Toolkit com a chave pública, que ainda aceita senha de 6 ou 7 (Identity Platform: password policy em `ENFORCE` ou cadastro pelo cliente desligado) | `PRE-PRODUCTION.md`, "Declaração — o que a política de senha não alcança" | **opcional, declarado**: o upgrade tem custo ou teto (3.000 DAU no Spark). Critério 18 do `/test` da fatia 1 🔒 |
| 26 | 🆕 Marca por fork: `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` nos projetos `app`, `web` e `api`, logo numa URL `https` pública, ícones do produto no lugar dos padrões | `PRE-PRODUCTION.md` §13 (`:921-934`, era `:902-915` até a PR #65 e `:893-906` até a PR #64) | **aberto**, entrou com a PR #30. Sem ela, o produto sobe com o nome `next-boilerplate`; não bloqueia nada. Desde a PR #33, sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL` o aviso de troca de e-mail sai sem a linha de suporte, que é o canal para contestar (`PRE-PRODUCTION.md` §3). Desde a PR #49, sem ela o formulário de contato fica indisponível, e a variável precisa estar na `api` (o destino) e na `web` (decide se o formulário aparece) (`:927-930`, era `:911-914` até a PR #65) |
| 27 | 🆕 Custo e latência da leitura de sessão em cada requisição autenticada | *(só neste arquivo)*; a declaração de sessões do `PRE-PRODUCTION.md` (`:1140`, era `:1137` até a PR #74, `:1090` até a PR #73, `:1065` até a PR #71, `:1024` até a PR #65 e `:1015` até a PR #64) fala da recusa, não do custo | **aberto**, entrou com a PR #39. Toda requisição autenticada lê o documento da sessão antes do guard (`session-tracker.ts:106-134`), além da leitura do perfil. No emulador, `GET /auth/session` p50 9,3 ms; em produção, latência e consumo da cota de leituras do Firestore não foram medidos (🔒 no `/test`) |
| 28 | 🆕 Política de TTL em `notification.expiresAt` (90 dias), e os dois índices compostos de `notification` | `PRE-PRODUCTION.md` §1.9 (`:253-298`) | **aberto**, entrou com a PR #52. Os índices foram medidos em 2026-10-20 e duas vezes em 2026-10-21 e não estão publicados no projeto de referência (somam às linhas 1 a 4). A TTL exige faturamento ativo no projeto; sem ela nada quebra, as notificações ficam até a exclusão da conta e o prazo de 90 dias do `ROPA.md` §10 deixa de valer. A auditoria não tem leitura da TTL pelas ferramentas que usa; conferir com `gcloud firestore fields ttls list`. Os critérios 18 e 19 do `/test` ficaram 🔒 |
| 29 | 🆕 Login por link num projeto real: provedor "E-mail/senha" com "Link de e-mail" ativo no console, domínio da app autorizado e `EMAIL_LINK_SIGN_IN_ENABLED="true"` na `apps/api`, só para o fork que liga o recurso | `PRE-PRODUCTION.md` §15 (`:678-710`) | **aberto**, entrou com a PR #56. Desligado por padrão, então não bloqueia quem não liga. O documento marca ⛔ "nunca foi provado de ponta a ponta fora do emulador": com o provedor desligado ou o domínio fora da lista, o pedido responde `200` e nenhum e-mail sai. Os critérios de falha do provedor e de `429` do `/test` ficaram 🔒. Depende das pendências 13 e 24 |
| 30 | 🆕 Membros e convites num projeto real: `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED="true"` na `api` e na `app`, a TTL opcional em `organizationInvitation.expiresAt`, e os três índices de `entity` por organização publicados antes do deploy da API | `PRE-PRODUCTION.md` §16 (`:712-756`, era `:709-751` até a PR #59) e §1.10 (`:299-331`) | **aberto**, entrou com a PR #57; remedido em 2026-10-28, pós-PR #59, que acrescentou ao §16 o passo da transferência ("Tornar dono") no roteiro de validação, sem passo novo de infra. Desligado por padrão, então membros e convites não bloqueiam quem não liga; os índices de `entity` valem para todo fork (pendências 1 e 4). O documento marca que o ciclo com e-mail real nunca rodou. Desligar a variável com membros não desfaz a equipe (`:744-746`). Os critérios de rate limit, entrega, índices e TTL do `/test` ficaram 🔒. Depende das pendências 13 e 24 |
| 31 | 🆕 Restringir as chaves do Firebase: a do navegador por referenciador HTTP e por API, e uma chave separada, só com restrição de API, para `FIREBASE_WEB_API_KEY` | `PRE-PRODUCTION.md` §17 (`:950-974`) · `docs/FORKING.md` §4, passo 8 (`:249-256`, era `:218-225` até a PR #75 e `:217-224` até a PR #71) | **aberto**, entrou com a PR #65. Vale para todo fork e para o projeto de referência. O documento traz o `curl` que confere: a chave restrita responde 403 sem `Referer`, e 400 quer dizer que ela aceita chamada de qualquer origem. A auditoria não mediu a chave do projeto de referência, para não usar credencial |
| 32 | 🆕 Repositório de referência: o alerta #1 de secret scanning (`google_api_key`, aberto desde 2026-04-04, apontando para um commit em `origin/main`) e os alertas e as atualizações de segurança do Dependabot desligados | *(só neste arquivo)* para o alerta; `PRE-PRODUCTION.md` §9 (`:804`) para o Code security | **aberto**, era pergunta em aberto de `delivery-infra-hardening`, que foi arquivada. Remedido em 2026-11-25, pós-PR #75: o #1 segue `open` (`google_api_key`); `dependabot_security_updates` e `secret_scanning_non_provider_patterns` seguem `disabled`. Remedido em 2026-11-24, pós-PR #74: o #1 segue `open` (`google_api_key`), e o `security_and_analysis` segue igual. Remedido em 2026-11-23, pós-PR #73: idem. Medido antes, no mesmo dia: `gh api …/secret-scanning/alerts` → o #1 `open`; `security_and_analysis` com `dependabot_security_updates: disabled`, `secret_scanning_validity_checks: disabled` e `secret_scanning_non_provider_patterns: disabled`. A recomendação da spec continua: restringir a chave no Google Cloud (ou rotacioná-la), conferir o login e fechar o alerta como "revoked". É ação de console, sua |
| 33 | 🆕 Um ref local de checkpoint do Conductor guarda três `.env` com chave privada | a máquina do dono · `docs/features/delivery-infra-hardening/analyze/plan.md:704` (P5) | **aberto, não medido em 2026-11-25**: esta auditoria rodou num workspace que não tem os refs do Conductor (`git for-each-ref 'refs/conductor-checkpoints/*'` → 0 aqui), e a regra do ciclo proíbe olhar outro checkout; o `origin` segue sem nenhum (`git ls-remote origin 'refs/conductor-checkpoints/*'` → 0). Remedido em 2026-11-24, pós-PR #74: 663 refs de checkpoint no repositório local e nenhum no `origin` (`git ls-remote origin 'refs/conductor-checkpoints/*'` → 0), e o ref `conductor-archive-bb3ed7d1-…` segue lá. Em 2026-11-23, pós-PR #73, o ref existia no repositório local (entre 657 refs de checkpoint; eram 652) e nenhum ref de checkpoint está no `origin` (`git ls-remote origin 'refs/conductor-checkpoints/*'` → 0). O risco é um `git push --all` ou `--mirror`. Apagar o ref é decisão sua e irreversível; a auditoria não mexeu |
| 34 | 🆕 Imagem de compartilhamento e indexação por fork: `NEXT_PUBLIC_WEB_URL` no projeto `web` da Vercel com o domínio público, a landing conferida num validador de Open Graph, o `x-robots-tag` conferido numa preview da landing e, para fork que já esteve no ar, a remoção das URLs do painel e da API pedida no Search Console | `PRE-PRODUCTION.md` §18 (`:975-999`) | **aberto**, entrou com a PR #71. Sem `NEXT_PUBLIC_WEB_URL`, a `og:image` aponta para `localhost` e o cartão sai sem imagem em toda rede social. A preview da landing não leva `noindex` do código, de propósito; fica fora do índice só pela proteção de previews da Vercel. O validador ficou 🔒 no `/test` |
| 35 | 🆕 Eventos de conversão no GA4 por fork: propriedade GA4, `NEXT_PUBLIC_GA_MEASUREMENT_ID` nos projetos `web` e `app` da Vercel, e `sign_up` e `generate_lead` marcados como eventos principais (mais os eventos do produto, se o fork criar) | `PRE-PRODUCTION.md` §19 (`:1000-1045`) · `docs/FORKING.md` §7.4 (`:403-418`, era `:372-387` até a PR #75) | **aberto**, entrou com a PR #73. Só vale para o fork que usa Google Analytics. Sem o id, nada quebra: o hook não faz nada e cadastro e contato seguem iguais (`packages/analytics/keys.ts:7-13`, `events.ts:20-31`). Com o id e sem marcar os eventos, eles chegam ao GA4 mas não contam como conversão. Ver os eventos numa propriedade real ficou 🔒 no `/test` |

A PR #74 não criou pendência; a PR #73 criou a 35, e a PR #72 não criou pendência. A 21 foi fechada pelo usuário em 2026-09-25. A 18 fechou pela metade em 2026-09-29, e a 12 em 2026-09-30. Com a PR #56
entrou a 29, com a PR #57, a 30, com a PR #65, as 31 a 33, e com a PR #71, a 34; a PR #57 também somou casos às 1 a 4, 8, 13 e 24. O histórico de quem criou ou mudou cada linha está na versão
deste arquivo em `9c793c6`.

## Lacunas avaliadas e **não** especificadas

Descartadas de propósito, com o motivo. Reabrir exige argumento novo.

> **Em 2026-10-16, duas linhas saíram daqui** porque a descoberta as reabriu com argumento novo, escrito no topo de
> cada spec: "Notificações in-app + preferências" (3/10, "Esforço G à mão; a referência terceiriza num serviço
> pago") virou [`in-app-notifications`](../../docs/features/in-app-notifications/spec.md), entregue pela PR #52, com 4/10 remedido e corte sem preferências nem
> tempo real; "Consertar o formulário de contato da landing" ("Não é spec, é achado") virou
> [`contact-support-channel`](../../docs/features/contact-support-channel/spec.md), entregue pela PR #49, com 2 de 4 starters verificados e dois consumidores
> novos no core. Entraram nove linhas novas, marcadas com a data.
>
> **Em 2026-10-04, a linha "Tela de sessões e dispositivos ativos" saiu daqui**: virou a fatia 2 de
> [`account-security-mfa`](../features/account-security-mfa.md), entregue pela PR #39.
>
> **Em 2026-09-26, cinco linhas saíram daqui** porque viraram spec ou foram absorvidas:
> gate por plano → [`plan-entitlements`](../../docs/features/plan-entitlements/spec.md), entregue em 2026-10-04 (o bloqueio em `past_due`, trial, cupom,
> reembolso e faturas em UI própria voltaram como linha própria abaixo); RoPA, incidente, DPA e transferência
> internacional → [`compliance-docs-kit`](../../docs/features/compliance-docs-kit/spec.md), entregue em 2026-09-30; troca de e-mail →
> [`account-email-change`](../../docs/features/account-email-change/spec.md), entregue em 2026-09-29; emulador de Storage e testes de rules →
> [`storage-emulator-rules-tests`](../../docs/features/storage-emulator-rules-tests/spec.md), entregue em 2026-09-28 ("promover admin pela UI" saiu porque já
> existe: campo de tipo no formulário de edição de usuário, `users/[id]/route.ts:138-139`, que desde a PR #37 trava o tipo do próprio perfil); task de teste do
> design system → [`accessibility-conformance`](../../docs/features/accessibility-conformance/spec.md), entregue em 2026-09-29.

| lacuna | prevalência | por que ficou de fora |
|--------|-------------|------------------------|
| **Bloqueio em `past_due` · trial, cupom, reembolso e faturas em UI própria · nome do plano traduzido** | — | Fora do corte de [`billing-subscription`](../../docs/features/billing-subscription/spec.md) e de [`plan-entitlements`](../../docs/features/plan-entitlements/spec.md). O Customer Portal cobre trial, cupom, reembolso e faturas; o bloqueio por situação é decisão de produto de cada fork. |
| 🆕 2026-10-16 **App instalável (manifest de PWA) · push no navegador** | 0 de 4 páginas de features lidas mencionam | O Next.js gera o manifest nativamente e HTTPS basta para instalar (doc do Next, atualizada em 2026-07-30); os ícones já vêm de `brand-config`. Sem sinal de mercado, é decisão de fork e cabe numa tarefa P quando alguém pedir. Push exige chaves VAPID e coleção de inscrições, custo que todo fork herdaria. |
| 🆕 2026-10-16 **Aviso global do admin para todos os usuários · modo manutenção** | 0 de 4 páginas lidas mencionam | Sem prevalência. Com [`in-app-notifications`](../../docs/features/in-app-notifications/spec.md) entregue pela PR #52, o aviso para todos vira extensão dela (está no "Fora do corte" de lá): um tipo novo e um produtor que grava para cada perfil, ou uma coleção de avisos sem dono, que a central de hoje não lê. |
| 🆕 2026-10-16 **Convite de usuário pelo admin, no lugar da senha definida pelo admin** | não medido nos starters | O plugin de admin do Better-Auth cria usuário com senha, como este repositório (`users/route.ts:63`); o Clerk tem convite de aplicação por e-mail. Convite com link e expiração é o mesmo mecanismo dos convites de [`teams-organizations`](../../docs/features/teams-organizations/spec.md), entregue pela PR #57: o convite pelo admin, se vier, deve reaproveitar aquele (hash do token, validade, uso único) em vez de criar um segundo modelo. **Reavaliada em 2026-10-27, pós-PR #58,** como candidata à entrega maior pedida pelo usuário, e preterida por [`organization-ownership-transfer`](../../docs/features/organization-ownership-transfer/spec.md), entregue pela PR #59: segue sem prevalência medida, e o admin já cria usuário com senha. |
| 🆕 2026-10-16 **Lixeira e restauração de registros** | não medido (starters não trazem CRUD de domínio) | O soft delete existe (`base.repository.ts:229-231`) e `findById` ignora registro apagado. Restaurar é decisão de produto de cada fork sobre o próprio recurso. |
| 🆕 2026-10-16 **Seleção múltipla e ações em massa nas listagens · exportar a listagem do usuário** | não medido | O `Table` repassa as props do Antd, então `rowSelection` já passa (`table.tsx:11-12`, `:157`), e o repositório base tem `deleteBulk` sem rota (`base.repository.ts:267`). Vira tarefa do fork quando a listagem dele pedir; a exportação do admin já está descartada acima. |
| 🆕 2026-10-16 **Aviso de pagamento pendente fora da aba de cobrança** | — | A aba já mostra o aviso (`AccountBillingPanel.tsx:146-150`). **Entregue pela PR #52** como produtor de [`in-app-notifications`](../../docs/features/in-app-notifications/spec.md): o tipo `subscriptionPaymentPending` aparece no sino e leva à aba (`apps/app/shared/lib/notifications.ts:22-25`). A linha fica como registro; não há banner próprio. |
| 🆕 2026-10-16 **Exemplo de IA (chat, integração com LLM)** | 2 de 4 páginas lidas (Supastarter, Open SaaS) | Arrasta chave e custo por uso de um provedor pago para todo fork, e o caso de uso é do produto. Moda com vida útil incerta; fica com o fork. |
| 🆕 2026-10-22 **Link por e-mail para conta só Google ou com e-mail não confirmado** | — | Fora da entrega de [`magic-link-sign-in`](../../docs/features/magic-link-sign-in/spec.md) (D1 e Q1 do plano): concluir o link tira a senha da conta não confirmada e acrescenta um provedor sem senha à conta só Google, e a área de conta passaria a pedir uma senha que não existe. Servir esse público pede um marcador no perfil e mudança em seis arquivos da área de conta, esforço M. Reabrir quando um fork medir que o público não confirmado pesa. |
| 🆕 2026-10-16 **Passkeys · código de acesso por e-mail (OTP)** | 2/10 (Makerkit com os dois desligados por padrão; Supastarter com passkeys) | Passkeys já estão fora do corte de [`account-security-mfa`](../features/account-security-mfa.md). Suporte nativo no Firebase a nenhum dos dois foi confirmado nesta rodada; o login sem senha ficou com [`magic-link-sign-in`](../../docs/features/magic-link-sign-in/spec.md), entregue pela PR #56. |
| 🆕 2026-10-16 **Preferências de fuso horário e de e-mail · descadastro (unsubscribe)** | não medido | O fuso já é detectado no navegador e vai em cookie (`DisplayTimeZoneProvider.tsx:37-51`). O core só manda e-mail transacional, que não pede descadastro; o fork que mandar e-mail de marketing traz o mecanismo junto. |
| 🆕 **Jobs agendados (Vercel Cron) para expurgo e retenção** | — | Avaliado em 2026-09-26. Não há job concreto que o core precise rodar: o expurgo da trilha depende do prazo de retenção (E5) e o TTL de `paymentEvent` já é nativo do Firestore. Infra sem consumidor vira código morto. Reabrir quando E5 for decidida. |
| 🆕 **Exportar tabelas do admin em CSV** | não medido | Avaliado em 2026-09-26. Nenhuma tabela exporta hoje e nenhuma referência do painel foi verificada. Sem prevalência, é decisão de fork. |
| 🆕 **Aceite de termos e privacidade registrado no cadastro** | não medido | Avaliado em 2026-09-26. O aviso de privacidade é dever de informação (LGPD art. 9º), não consentimento; aceite de termos é decisão contratual de cada fork. Um link para os dois documentos junto ao botão de cadastro é achado P, não spec. |
| 🆕 **Avisos de segurança por e-mail (senha trocada, sessões encerradas, login novo)** | — | Avaliado em 2026-09-26. É o requisito 6.3.7 da ASVS 5.0.0, **nível 3** (6.3.5, login suspeito, também é nível 3). O aviso ao endereço antigo entrou em [`account-email-change`](../../docs/features/account-email-change/spec.md), entregue pela PR #33, por ser barato; o resto espera pedido. |
| 🆕 **OpenAPI / documentação da API gerada** | — | Avaliado em 2026-09-26. O SDK é o contrato e a única porta para a API (regra de ouro 1); um segundo contrato gerado envelhece junto. Vale só se o produto for uma API, como as API keys. |
| 🆕 **Banir usuário pelo admin** | 4/10 (admin) | Já existe como desativar: `disabled` no `PUT /users/[id]` (`user-admin.schema.ts:21`, `users/[id]/route.ts:147-156`) e o switch da listagem (`UsersListClient.tsx:111-139`). Desde a PR #35, desativar também corta o bearer e revoga as sessões na hora; desde a PR #37, o admin não desativa a si mesmo. |
| 🆕 **CLI de criação de fork** | 1 de 4 verificados (next-forge) | Fora do corte de [`brand-config`](../../docs/features/brand-config/spec.md), entregue em 2026-09-28 com o roteiro escrito (`docs/FORKING.md`). O script só vale depois que o roteiro se mostrar estável em forks reais. |
| 🆕 **`/.well-known/security.txt` e política de divulgação de vulnerabilidade** | não medido | Fora do corte de [`compliance-docs-kit`](../../docs/features/compliance-docs-kit/spec.md), entregue em 2026-09-30 sem ele. É código na web, e o campo `Expires` do RFC 9116 exige manutenção. |
| **Coletor de erro gerenciado (Sentry, Better Stack, Axiom)** | prática 6 | A costura existe e está vazia: `onRequestError` nos três apps, sem ninguém do outro lado. Estacionado (E1). |
| **Passos de onboarding condicionais por papel ou plano · checklist de ativação · tour interativo** | — | Fora do corte de [`onboarding-flow`](../../docs/features/onboarding-flow/spec.md), arquivada. Dependem de haver produto, e cada fork tem o seu. O fork acrescenta um passo editando `ONBOARDING_STEPS`. |
| **Coleta de dados de domínio no onboarding (empresa, cargo, segmento)** | — | Fora do mesmo corte. Não é genérico; é código do fork. |
| **Onboarding para a conta criada pelo admin** | — | Decisão D3 da entrega: o admin já informa o nome, e a mesma rota cria admins. O perfil sem o campo conta como concluído. |
| **Demais direitos do art. 18 com fluxo próprio · painel de pedidos de titular · exportação assíncrona** | — | Fora do corte de [`data-rights-lgpd`](../../docs/features/data-rights-lgpd/spec.md), arquivada. O canal de privacidade cobre os demais pedidos por ora. |
| **Exclusão de conta sem senha (conta só Google)** | — | Fora da entrega: reautenticar conta federada exige outro fluxo. Pertence à iteração de "sessão recente" de [`account-security-mfa`](../features/account-security-mfa.md). Desde a PR #48 a conta só Google tem um caminho, definir uma senha na aba Segurança, e o repositório tem uma prova de login Google recente (`recent-google-sign-in.ts:13-30`) que essa iteração pode reaproveitar. |
| **Histórico de acessos · IP, user-agent, dispositivo e geolocalização · presença em tempo real** | — | Fora do corte de [`user-activity-tracking`](../../docs/features/user-activity-tracking/spec.md). IP mudaria a natureza jurídica do dado (Marco Civil art. 5º, VIII). |
| **Série temporal de acessos na home do admin** | — | `lastAccessAt` guarda um instante por perfil; série temporal exigiria a coleção de eventos que `user-activity-tracking` descartou. |
| **Backfill retroativo do último acesso** | — | Fora do corte, e a tela diz quando o registro de cada pessoa começa. |
| **Ordenação da coluna de último acesso pelo servidor** | — | O índice por `lastAccessAt` existe declarado (não publicado). Reavaliar quando a fila drenar. |
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
| **Contagem total de registros na listagem** | — | O `countQuery` (`base.repository.ts:139`) é a peça que faltava. Reavaliar quando alguém pedir. |
| **Registro auditável de consentimento no servidor** | — | Fora do corte de `cookie-consent`. A escolha vai no arquivo de exportação, lida do cookie do navegador (`useAccountDataRights.tsx:23-36`); prova no servidor segue inexistente. |
| **CMP certificada · TCF do IAB · geolocalização do visitante** | — | Arrastam serviço pago para todo fork. |
| Command palette (⌘K) | 2/10 | Valor estético. |
| Metering / limites de uso / créditos | 2/10 | Fora do corte de `plan-entitlements`, entregue em 2026-10-04 com o gate por status e por recurso, sem contagem de uso. |
| Feature flags | 2/10 | Variável de ambiente basta num MVP; `ONBOARDING_ENABLED` é o exemplo mais recente. |
| Firebase App Check | — | Exige configuração de projeto por fork. |
| Waitlist / captura de lead | 2/10 | Decisão do fork. |
| **Migrar a listagem de usuários para o cursor** | — | O N+1 de `userRepository.list()` vem primeiro. |
| **Detector de teste instável no CI** | — | O primeiro caso foi consertado na PR #22. Em 2026-09-28 apareceu um segundo, de causa diferente, só local (`useListAuditEvents.test.tsx`, 2 falhas em 61 execuções locais até 2026-11-19, pós-PR #63; ver achados), e o CI passou. Em 2026-10-19 apareceu um terceiro, também só local e sob carga (`actionMenu.test.tsx`, 3 execuções com falha em 17 até a auditoria pós-PR #63, as duas novas com load acima de 48; ver achados da tarefa `admin-archive-access-revocation`). Na mesma auditoria, `securityPolicySources.test.ts` da `apps/app` e o arranque do pool do Vitest em `@repo/auth` e `api` também estouraram o tempo sob carga, e passaram em sequência. Na auditoria de 2026-11-23, pós-PR #64 (load de 22 a 55), o `actionMenu.test.tsx` caiu em mais três execuções, quatro arquivos da `apps/app` caíram por tempo (`securityPolicySources`, `accountSecurityForm`, `auditFiltersDateInput` e `signInEmailLinkEntry`, este o primeiro a cair perto dos 2 s, pela espera do `findBy`, duas vezes em quatro), o pool da `apps/app` morreu com `EPIPE`, e o arranque do pool falhou em `@repo/internationalization`, `web` e `api`; todos passaram em outra execução. Na auditoria de 2026-11-23, pós-PR #71 (load de 12 a 15), nenhum arquivo caiu. Na pós-PR #72 (load de 11 a 25), também nenhum, nem na pós-PR #73. O `/test` da PR #71 registrou o primeiro E2E instável, `organizationOwnership.spec.ts`, que estourou o tempo sob `next dev` local em três execuções, inclusive em `main`, e passou no CI (ver achados); passou de novo no CI da PR #72. O critério de reabertura era um segundo *flake* **no CI**, e ele foi atingido em 2026-11-24, na execução de merge da PR #73 (`gh run 45311956449`): o mesmo `organizationOwnership.spec.ts` reprovou na primeira tentativa, por contraste num estado transitório, passou na segunda, e o `failOnFlakyTests: isCi` (`apps/e2e/playwright.config.ts:36`, desde a PR #26) reprovou o job. **Reavaliada em 2026-11-23, pós-PR #73: segue sem spec**, porque o detector já existe para o E2E: o Playwright retenta uma vez no CI e reprova o job quando a segunda tentativa passa, que foi o que tornou este caso visível. Falta só para o Vitest, onde nenhum *flake* chegou ao CI. **Pós-PR #74 (2026-11-24):** o teste foi consertado pela PR #74, e o `e2e` da execução de merge passou com 45 testes e nenhum instável. Nesta auditoria, a primeira execução da linha de gates, com outros processos na máquina, caiu no `e2e#test` do Vitest com `Timeout starting forks runner` (os 38 testes passaram), o mesmo padrão de arranque do pool sob carga; a segunda execução, com `--concurrency=4`, é a que vale (ver Gates). |
| Provedor de e-mail plugável · rastreio de abertura/clique | — | Fora do corte de `transactional-emails`. |
| Múltiplos arquivos, galeria, thumbnails, antivírus, PDF | — | Fora do corte de `file-upload-storage`. |
| Tracing distribuído (OpenTelemetry) · session replay · monitoramento sintético | prática 6 | Fora do corte de `observability-logging`. |
| API keys do usuário · webhooks de saída | 1/10 cada | Só valem se o produto é uma API. |
| Widget de feedback · referral/afiliados | 1/10 e 0/10 | Terceirizar é mais racional. |
| SSO enterprise · SCIM | 0/10 | Só entra com o primeiro contrato enterprise. |
| Preview deploy por PR · orçamento de performance | práticas 14 e 18 | O pré-requisito (CI verde e estável) vale nas 30 últimas execuções do CI na `main`, até `c9b4d9c` (`gh run list --branch main --limit 30`, todas `success`, remedido em 2026-11-19 pós-PR #63). A execução de merge da PR #73 (`5829ea3`) quebrou a série, por um E2E instável (ver [Achados da PR #71](#-achados-da-pr-71-2026-11-23)). Reavaliar junto com o branch protection (E3). **Saiu desta linha em 2026-11-19:** o Dependabot entrou no corte de [`delivery-infra-hardening`](../../docs/features/delivery-infra-hardening/spec.md), entregue pela PR #65, e o Lighthouse por comando, no de [`delivery-product-quality`](../../docs/features/delivery-product-quality/spec.md), entregue pela PR #72 sem bloquear o CI. O orçamento de performance só faz sentido com mediana: a home variou de 57 a 97 em dez execuções (E18). |
| Remote Cache do Turbo | prática 1 | Arrasta conta e env; entra quando doer, como opt-in. |
| Limiar de cobertura que bloqueia merge | prática 5 | A cobertura já é medida e consolidada (`pnpm coverage`, job `coverage` do CI), pela PR #26. O limiar ficou fora do corte de [`e2e-testing`](../../docs/features/e2e-testing/spec.md); reavaliar depois de algumas medições. |
| Changesets / versionamento · Storybook | — | Pacotes `private: true`; o `playground` serve de catálogo. |
| Blog/CMS · status page · changelog público | nível de marketing | Decisão de cada fork. |
