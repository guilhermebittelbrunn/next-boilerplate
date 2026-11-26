# Revisão: estabilidade da suíte Vitest da `apps/app` sob carga

Rodada autônoma do `/cycle`. Nada commitado, nenhuma branch criada ou renomeada.

O escopo são três arquivos de teste: `apps/app/__tests__/tableLoadMore.test.tsx`,
`signInEmailLinkEntry.test.tsx` e `auditFiltersDateInput.test.tsx`. O working tree também carrega
`app-form-layout-centered`, `admin-own-account` e mudanças em `specs/`, já revisadas nas respectivas
`review/review.md`. Esta revisão não voltou a elas.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Reprova no regex do nome (o prefixo não é
  projeto e falta o `type`). Não tem commit à frente de `origin/main` nem upstream.
- Proposta: `feat/admin-account-and-centered-forms`, a mesma do plano combinado de `admin-own-account`.
  Passa no regex. Esta tarefa só acrescenta um commit `test(app)` e um `docs(features)`, e o nome continua
  descrevendo o que a PR entrega; não vi motivo para trocar.
- Caminho da regra: `git branch -m feat/admin-account-and-centered-forms`, executado pelo `/review` antes do
  primeiro commit. Não renomeei, por instrução do `/cycle`.

## Revisão: 3 arquivos de teste da `apps/app`

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `auditFiltersDateInput.test.tsx:94-96`: com `getByRole("button", { name })`, um dia que deixasse de ser
  interativo fazia o teste cair na própria consulta, com mensagem "não achei o botão". Com `getByLabelText`,
  nesse caso a consulta acha a célula do grid (o `react-day-picker` 9.13.0 põe o `aria-label` na célula quando
  o dia não é interativo, `DayPicker.js:315-317`), o clique não seleciona nada e o teste cai mais adiante, no
  `waitFor` do diálogo fechado (`:98`), por timeout. A cobertura é a mesma; só a mensagem de falha piora. Não
  corrigi: acrescentar uma asserção de `tagName` só por diagnóstico não compensa.

### ✅ OK

- Nenhuma asserção afrouxada. Conferi cada troca lendo o código:
  - `auditFiltersDateInput.test.tsx:89`, botão de próximo mês: o `Nav` do `react-day-picker`
    (`components/Nav.js:26`) mantém o `aria-label` mesmo quando o botão está desabilitado e só acrescenta
    `aria-disabled`. Então o `expect(next.hasAttribute("aria-disabled")).toBe(false)` da linha `:90` continua
    pegando o caso em que a navegação trava. `getByLabelText` lança erro se mais de um elemento casar com o
    rótulo, como o `getByRole` faria.
  - `:94-96`, dia 10 de janeiro de 2027: o `aria-label` vai no `DayButton` quando o dia é interativo
    (`DayPicker.js:318-322`), e o `CalendarDayButton` do design-system repassa para o `Button`. Se o clique
    não selecionar, `:98` (diálogo fecha), `:101` ("janeiro 2027" ao reabrir) e `:107-109`
    (`onApply` com `{ from: "2027-01-10" }`) falham. O handoff mediu `tagName` `BUTTON` nos dois elementos.
  - `getByRole("dialog")`, `getByRole("grid")` e o botão "Aplicar" ficaram por papel.
- `signInEmailLinkEntry.test.tsx:55`: `SLOW_MACHINE_WAIT = { timeout: 10_000 }` sem comentário; o nome diz o
  porquê. Nenhuma referência ao fluxo. As quatro esperas (`:83-87`, `:96-99`, `:100-104`, `:113-116`) usam a
  constante, e 10 s fica abaixo do `testTimeout` de 20 s do `vitest.config.mts`, então uma regressão real
  ainda falha com a mensagem do Testing Library. As asserções (`href` `/pt-br/sign-in/email-link`,
  `emailLinkEntry()` nulo) não mudaram. O teste de carregamento (`:121`) é síncrono e não foi tocado.
- `tableLoadMore.test.tsx:50`: `afterEach(cleanup)` no lugar do `beforeEach`. Agora o último teste
  (`:93-105`) desmonta a tabela antd antes do teardown do jsdom. O `cleanup()` no meio do teste `:84` continua
  e é legítimo (dois renders no mesmo teste). O import trocou `beforeEach` por `afterEach`; não sobrou import
  sem uso.
- Checklist §6: imports explícitos de `vitest`, sem `toBeInTheDocument`, sem `skip`/`only`/`retry`/`todo`.
  Nenhum arquivo de produção nem `apps/app/vitest.config.mts` mudou (`git status --short` vazio para o config).
- `/code-review` não foi acionado: o diff tem 3 arquivos e cerca de 30 linhas, todas lidas aqui, e a skill
  varreria o working tree inteiro, que inclui duas features já revisadas.

### 👁 Verificar no `/test`

A linha de base do `/develop` não reproduziu nenhum dos três sintomas (cinco execuções da suíte inteira, com
16 e 32 `yes`, nenhuma falha nos três arquivos e nenhum "Unhandled Errors"). O verde depois da correção mostra
que nada piorou e que o teste do calendário ficou mais rápido. Não prova que as falhas originais do
`tableLoadMore` e do `signInEmailLinkEntry` acabaram.

O que o `/test` consegue medir barato:

- Asserções intactas: `git diff HEAD` dos três arquivos sem linha `expect` removida e sem `skip`/`only`/
  `retry`/`todo`. Leitura de diff, segundos.
- Os três arquivos verdes isolados e juntos: `npx vitest run` dos três a partir de `apps/app`, sem carga e com
  16 `yes`, conferindo código de saída 0 e ausência de "Unhandled Errors".
- Duração do teste "navegam além do fim do ano corrente…" com `--reporter=verbose`, para ter uma segunda medida
  independente da queda de 48% (com carga) e 63% (sem carga) que o handoff registrou.
- Uma ou duas execuções de `pnpm --filter app test` sob 16 ou 32 `yes`, procurando "Unhandled Errors" e
  `_location` no log. Se aparecer, capturar a pilha.

🔒 O que fica sem prova nesta máquina:

- Se o erro `_location` do `tableLoadMore` some de fato. Ele foi visto com load de 18 a 22 durante a suíte
  inteira e não voltou em nenhuma execução da linha de base. Sem reprodução antes, uma execução verde depois
  não diferencia "corrigido" de "não aconteceu".
- Se o `signInEmailLinkEntry` deixa de cair pela espera do `findBy`. Mesmo caso.

Essas duas só se confirmam com reprodução: muitas execuções da suíte sob carga até o sintoma aparecer na
versão antiga, ou observação ao longo do tempo no CI. O `/test` deve registrar o resultado como "não
reproduzido", não como "corrigido".

## Correções aplicadas

Nenhuma. A revisão não editou arquivo de código.

## Raio de impacto

Nenhum consumidor. Só arquivos de teste da `apps/app`; nenhum contrato, rota, chave de i18n nem componente
compartilhado mudou.

## Lacunas de teste

O handoff não listou lacunas, e a tarefa não cria comportamento novo. Os instáveis vistos na linha de base em
arquivos fora do escopo (`signUpFormSubmitLock.test.tsx`, com falha de asserção sob 16 `yes`;
`accountSignInMethodsPanel.test.tsx:247` e `accountTabs.test.tsx:333`, com timeout de 20 s sob 32 `yes`)
continuam abertos e ficam fora de escopo desta tarefa. São candidatos ao backlog.

## Decisões em aberto

- Limpeza automática global do Testing Library na `apps/app` (`afterEach(cleanup)` num `setupFiles` do
  `vitest.config.mts`). Continua aberta, como no plano. Recomendação: tarefa própria, porque muda o
  comportamento dos 149 arquivos e cada um que hoje chama `cleanup` à mão precisaria de conferência.

## Gates

Não editei nenhum arquivo do escopo, então cito os números do handoff em vez de remedir:

| comando | resultado (handoff) |
|---------|---------------------|
| `pnpm --filter app typecheck` | saída 0 |
| `pnpm check` | saída 0, 1148 arquivos, nenhuma correção |
| `pnpm --filter @repo/internationalization test` | não se aplica, o diff não toca i18n |

Varredura de segredo em `docs/features/app-test-suite-stability/`: nenhuma senha, token, chave ou e-mail real.
As ocorrências de "senha" são o nome do link "Esqueci a senha" e da chave `forgotPassword`.

## Plano de commits

Plano combinado das três tarefas. Os 18 commits de `admin-own-account/review/review.md` ficam como estão; esta
tarefa entra como o commit 14 (logo depois do último commit da `apps/app`, antes do i18n) e como o commit 20.
Antes do primeiro: `git diff --cached --stat` vazio.

1. `docs(specs): audit backlog against b7f9124`
   - `specs/BACKLOG.md`, `specs/reference/AUDIT.md`
   - `specs/features/account-security-mfa.md`, `specs/features/admin-own-account.md`,
     `specs/features/app-form-layout-centered.md`, `specs/features/signup-email-verification.md`,
     `specs/features/social-sign-in-providers.md`
   - `specs/reference/research/compliance-trust-baseline.md`, `specs/reference/research/object-storage-costs.md`,
     `specs/reference/research/saas-starter-feature-benchmark.md`
2. `test(e2e): retry action menu trigger until the row dropdown hydrates`
   - `apps/e2e/tests/focusNotObscured.spec.ts`
3. `feat(app): center the narrow page column`
   - `apps/app/shared/components/ui/pageLayout.ts`, `apps/app/__tests__/pageShell.test.tsx`
4. `feat(app): size full-page forms and account panels to their content`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/page.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPrivacyPanel.tsx`
5. `feat(app): add narrow loading skeletons to the create and edit form pages`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/create/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/edit/[id]/loading.tsx`
   - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/(pages)/create/loading.tsx`
   - `apps/app/__tests__/formLoadingSkeletons.test.tsx`
6. `docs(app): document centered narrow pages and content-height forms`
   - `apps/app/CLAUDE.md`
7. `feat(api): add requireOwnAccountApi guard for the caller's own account`
   - `apps/api/app/(guards)/common-panel.ts`
   - `apps/api/__tests__/ownAccountGuard.test.ts`, `apps/api/__tests__/impersonationReadOnly.test.ts`
8. `feat(api): open the own-account routes to the admin`
   - `apps/api/app/(routes)/account/route.ts`, `apps/api/app/(routes)/account/password/route.ts`,
     `apps/api/app/(routes)/account/password/set/route.ts`
   - `apps/api/__tests__/accountRoute.test.ts`, `apps/api/__tests__/accountPasswordRoute.test.ts`,
     `apps/api/__tests__/accountPasswordSetRoute.test.ts`, `apps/api/__tests__/accountSessionsRoute.test.ts`,
     `apps/api/__tests__/accountExportRoute.test.ts`, `apps/api/__tests__/accountDeletionRoute.test.ts`
9. `feat(api): route personal uploads through the own-account guard`
   - `apps/api/app/(routes)/files/route.ts`, `apps/api/__tests__/fileUploadRoute.test.ts`
10. `feat(app): let the account forms hide what the admin area does not offer` (corpo da mensagem:
    "Also drops flex-1 from the three account forms so they size to their content.")
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountPreferencesForm.tsx`
    - `apps/app/__tests__/accountProfileFormEmail.test.tsx`, `apps/app/__tests__/accountSecurityForm.test.tsx`,
      `apps/app/__tests__/accountPreferencesForm.test.tsx`
11. `feat(app): add the admin section set to the account tabs`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/accountTabRouting.ts`
    - `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountTabs.tsx`
    - `apps/app/__tests__/accountTabRouting.test.ts`, `apps/app/__tests__/accountTabs.test.tsx`
12. `feat(app): add the admin account page`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/page.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/AdminAccountClient.tsx`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/account/(pages)/(home)/loading.tsx`
    - `apps/app/shared/lib/panelTitles.ts`, `apps/app/__tests__/adminAccountPage.test.tsx`
13. `feat(app): point the admin navigation to the admin account`
    - `apps/app/app/[locale]/(authenticated)/(admin)/admin/layout.tsx`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/paths.ts`,
      `apps/app/app/[locale]/(authenticated)/(admin)/admin/routes.tsx`
    - `apps/app/shared/components/ui/Navbar.tsx`, `apps/app/shared/components/ui/ProfileDropdown.tsx`
    - `apps/app/__tests__/profileDropdownAccount.test.tsx`
14. `test(app): harden three tests against a loaded machine`
    - `apps/app/__tests__/tableLoadMore.test.tsx`
    - `apps/app/__tests__/signInEmailLinkEntry.test.tsx`
    - `apps/app/__tests__/auditFiltersDateInput.test.tsx`
15. `feat(internationalization): add the admin account copy`
    - `packages/internationalization/translations/apps/app/pages/admin/account.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/index.ts`
    - `packages/internationalization/translations/apps/app/pages/admin/routes/index.ts`
16. `docs(api): list requireOwnAccountApi among the guards`
    - `apps/api/CLAUDE.md`
17. `docs: document the own-account guard in the auth panel and review checklist`
    - `docs/AUTH-PANEL.md`, `docs/review-checklist.md`
18. `docs(features): app-form-layout-centered`
    - `docs/features/app-form-layout-centered/` (os `.md`; os screenshots são ignorados)
19. `docs(features): admin-own-account`
    - `docs/features/admin-own-account/`
20. `docs(features): app-test-suite-stability`
    - `docs/features/app-test-suite-stability/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Corpo sugerido para o commit 14: "Clean up after each table test so the last one unmounts before jsdom
teardown, give the sign-in link waits a 10 s deadline, and query the calendar buttons by label instead of
role."

Título de PR sugerido: `feat: admin own account area and centered form pages`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin feat/admin-account-and-centered-forms`.

### Commits realizados

(preenchido pelo orquestrador)
