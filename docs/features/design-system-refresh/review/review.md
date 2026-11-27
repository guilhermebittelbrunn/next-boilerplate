# Revisão: design-system-refresh

Revisão do diff de 2026-11-27 sobre `origin/main` (`6943ce9`). O diff tem 250 entradas: 99 em `apps/app`, 45 em
`packages/design-system`, 34 em `apps/web`, 21 em `packages/internationalization`, 30 pastas de skills em
`.claude/skills/`, documentação, agentes, o script do kickoff, o lockfile e um comentário em `packages/security`.
Não houve `analyze/plan.md`; o contrato que guiou o trabalho é o `docs/DESIGN.md`, e a revisão parte do
`develop/handoff.md`.

A revisão leu código e rodou só gates estáticos. Nenhum app subiu e nenhuma tela foi vista renderizada aqui.

## Branch

- Antes: `guilhermebittelbrunn/claude-feat-add-ui`, fora do padrão `<project>/<type>/<title>`.
- A branch não tinha commit próprio (`HEAD` = `origin/main` = `6943ce9`) nem remoto (`git ls-remote --heads origin`
  vazio), então foi renomeada com `git branch -m`.
- Depois: **`feat/design-system-refresh`**. O diff atinge dois apps e vários pacotes, por isso o nome não leva
  `project`.
- Regex do `/review`: `branch OK: feat/design-system-refresh`.

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `packages/internationalization/translations/apps/web/pages/home/home.ts:21-42` e
  `apps/web/app/[locale]/(home)/components/product-preview.tsx` — o recorte do painel no hero mostra "Padaria Rio
  Branco", "Clínica Vale Verde", "Marina Toledo" e "Oficina Serra Azul" (o mesmo vale para en e es). São nomes
  inventados com cara de real, o que o `docs/DESIGN.md:179` e a seção 5.1 do checklist vetam. O handoff responde
  "sem nome de exemplo" no item 4 do gate, o que não confere com o markup. A legenda diz "dados ilustrativos", mas
  a regra não abre exceção para isso. Vai para as decisões em aberto.
- `apps/app/CLAUDE.md` (seção "Formulários com ações no rodapé") cita o onboarding como exemplo de `Footer` fixo,
  e `OnboardingProfileStep.tsx` e `OnboardingPreferencesStep.tsx` passaram a usar `sticky={false}`. O handoff
  registra o desvio. Ou o doc muda, ou o código volta. Decisão em aberto.
- `packages/email/brand.ts:7` continua com `primaryColor: "#18181b"` (zinco), enquanto o `--primary` passou a
  cobalto. O próprio `docs/DESIGN.md` §6 manda espelhar as cores nesse arquivo ao trocar a marca, e o boilerplate
  ficou fora dessa regra. Decisão em aberto.
- `specs/BACKLOG.md:47`, `:61` e `specs/reference/AUDIT.md` (D24, E17 e os achados do `antd-app.tsx` nas linhas
  178, 311, 340, 942, 1096-1098, 1107) descrevem pendências do antd, que saiu do repositório. O dono dessa
  reconciliação é o `/spec --sync`; esta revisão não editou o backlog.
- Índice não vazio: `git diff --cached` já traz 4 remoções preparadas antes da revisão
  (`apps/app/shared/components/ui/MetricCard.tsx`, `packages/design-system/__tests__/antdLocale.test.tsx`,
  `packages/design-system/__tests__/antdTheme.test.tsx`, `packages/design-system/providers/antd-app.tsx`). Elas
  pertencem aos commits 09 e 18 do plano. Se o índice não for zerado antes do commit 01, as quatro entram nele.
- Ordem de commits e typecheck intermediário: o `home.ts` da web remove chaves que a home antiga lê
  (`cases.*`, `testimonials.*`, e os módulos `features`, `hero`, `stats` saem de `pages/index.ts`) e acrescenta
  as que a home nova lê. Com um commit por pacote, um dos dois commits (26 ou 27) fica com o `web typecheck`
  vermelho. Decisão em aberto.

### 🟢 Sugestão / nit

- `packages/design-system/components/ui/action-menu.tsx` (`confirmDelete`) — `try/finally` sem `catch`: um
  `onDelete` que rejeite vira rejeição não tratada. Os consumidores de hoje passam `mutate`, que devolve `void`,
  então não há efeito real agora.
- `packages/design-system/components/ui/table.tsx:142` — o `pageSize` vira estado inicial e não acompanha
  mudança posterior de `pagination.pageSize`.
- `OrganizationInvitationsTable.tsx` deixa o título da coluna de ações visível; as outras quatro tabelas usam
  `sr-only`.
- `packages/design-system/components/ui/sonner.tsx` escolhe o tema pelo `resolvedTheme`, que ignora `forcedTheme`
  no `next-themes` 0.4.6. É o mesmo 🟢 que o `AUDIT.md:1097` já registrava para o `useAlert`, agora no Toaster.
- `MetricStrip.tsx:18-22` — com quatro ou mais itens o layout cai no de três colunas.
- Playground (`playground/page.tsx`) tem texto de UI literal e números como "R$ 49,00" e "1.284". A página já
  tinha 28 literais antes e é vitrine de componentes; fica registrado.
- `.claude/skills/thinkui` e `thinkui-anti-slop` não trazem arquivo `LICENSE`; a licença MIT aparece só no
  frontmatter do `SKILL.md`.
- As skills `founder-*` gravam em `founder/` na raiz do projeto, e o `.gitignore` não cobre essa pasta. O fork
  pode querer versionar ou ignorar o plano de negócio. Decisão em aberto.
- Nenhum layout define `themeColor`; com o fundo off-white e o escuro azulado, a barra do navegador móvel não
  acompanha. Lacuna anterior a este diff.

### ✅ OK

- **`Table` sem antd, API compatível.** As props que os sete consumidores passavam no `HEAD` (`columns`,
  `dataSource`, `rowKey`, `loading`, `locale.emptyText`, `pagination`, `searchFields`, `searchPlaceholder`,
  `onRefresh`, `refreshLoading`, `onLoadMore`, `hasMore`, `loadMoreLoading`) existem na `TableProps` nova, e
  nenhum consumidor usava `sorter`, `fixed`, `ellipsis`, `scroll` ou `rowSelection`. A paginação padrão continua
  ligada com 10 linhas, como no antd. Typecheck de `app`, `web`, `design-system` e `e2e` passa.
- **`ActionsMenu` em Radix.** Mantém `aria-haspopup`/`aria-expanded` (do `DropdownMenuTrigger`), nome do gatilho
  vindo do dicionário, `AlertDialog` com cancelar focado ao abrir e foco devolvido ao gatilho no fechamento
  (`onCloseAutoFocus`). O teste do design system cobre o Enter que abre a confirmação sem acionar o botão que ela
  foca. Os specs E2E usam `menuitem`, `row` e `alertdialog`, que o Radix e a tabela nova expõem.
- **Toasts.** `useAlert` chama `toast[type]` do Sonner; o `Toaster` é montado uma vez no `DesignSystemProvider`,
  que `apps/app` (via `AppDesignProvider`) e `apps/web` usam. Nenhum `ToastContainer` sobrou.
- **Dependências.** `antd` e `react-toastify` saíram de todos os `package.json`; o lockfile só remove entradas
  (913 linhas, nenhuma versão nova). Não sobrou import de `antd`, `@ant-design/*` nem `react-toastify` em
  `apps/` ou `packages/`.
- **Contrato de movimento.** Zero `transition-all` em `apps/app`, `apps/web` e `packages/design-system`, o que
  confirma a afirmação do handoff. Nenhum `scale-0`/`zoom-in-0`. Sombra arbitrária só dentro do design system.
- **Auth e dados.** Nenhuma chamada nova à API, nenhum `fetch` cru, nenhuma mudança em `useAuthorizedQuery`,
  snapshot de painel, `router.refresh` ou headers. Os quatro hooks de resumo só passaram a expor `isFetching`.
  O onboarding manteve o `aria-labelledby` do progresso; os formulários ganharam `autoComplete` e
  `spellCheck={false}` coerentes.
- **Barras fixas.** `Container`, `Footer` (quando fixo) e `PageFormFooter` mantêm `data-sticky-action-bar`, e o
  `Navbar` mantém `data-panel-navbar`. A barra encolheu de 64 px para 56 px, dentro dos 80 px do
  `scroll-padding`.
- **`MetricStrip`** formata com `Intl.NumberFormat(locale)` usando o locale da rota, então servidor e cliente
  produzem o mesmo texto. O `MetricCard` apagado imprimia o número cru justamente para evitar o mismatch do
  `toLocaleString()` sem locale.
- **i18n.** Paridade 67/67. Chaves novas nos três idiomas; reticências de um caractere nas mensagens de
  carregamento. As chaves removidas (`members.columns.email`, `cases`, `testimonials`, `features`, `hero`,
  `stats`) não têm consumidor no código novo.
- **Skills vendorizadas.** Os quatro scripts Python (`founder-cfo`, `founder-consumer`, `founder-plan`,
  `founder-pricing`) só leem e gravam arquivos locais; o `compile.py` carrega por `importlib` apenas o
  `unit_economics.py` vizinho. Nenhum `curl | sh`, nenhum segredo, e os e-mails encontrados são de contato do
  fornecedor ou exemplos `example.com`. O SHA-256 de `web-design-guidelines/references/command.md` confere com o
  declarado no `SKILL.md`, e o `CHECKSUMS.sha256` da `anti-ui-slop` confere para todos os arquivos presentes (só
  falta `agents/openai.yaml`, que o handoff deixou de fora de propósito). A skill da Vercel deixou de buscar
  regras na rede.
- **Artefatos da feature.** `STATE.md`, `handoff.md` e este arquivo não têm senha, token nem e-mail de pessoa.

### 👁 Verificar no `/test`

Por ordem de risco.

1. **Teclado no `ActionsMenu`** (`/entities` e a equipe). Repro: Tab até o gatilho de uma linha, Enter, seta
   até "Excluir", Enter. Medir: o `document.activeElement` é o botão Cancelar e a linha continua lá; Esc fecha e
   o foco volta ao gatilho; confirmar com o mouse remove a linha. Repetir a transferência de posse da equipe só
   pelo teclado.
2. **Toast sobre a barra fixa.** O Sonner passou para `bottom-right`, o mesmo canto do botão primário do `Footer`
   fixo. Repro: salvar uma entidade em 390 px e em 1440 px e medir se o toast cobre o botão de salvar enquanto
   está na tela. Conferir também os dois temas e o botão de fechar.
3. **Contraste dos tons translúcidos.** O `themeContrast.test.ts` mede tokens sólidos sobre fundo sólido. Não
   cobre o botão destrutivo no escuro (`dark:bg-destructive/15 dark:text-destructive`), os `Badge` `success` e
   `warning` nem os ícones tonais do `AuthCard` (`bg-warning/12`). Medir a razão de contraste no navegador nos
   dois temas.
4. **`Table`.** Busca volta à página 1; usuários do admin com `showSizeChanger` (10, 20, 50) e
   `hideOnSinglePage`; esqueleto em "Sessões" da conta; texto do vazio; rolagem horizontal da auditoria em 390 px
   (quatro colunas com `min-w-40`).
5. **`pnpm e2e`.** O handoff não rodou a suíte. Os specs dependem dos papéis do menu e da tabela novos, e o
   `a11yDark.spec.ts` roda o axe com os tokens novos.
6. **Landing.** LCP do h1 com a entrada partindo de opacidade 0,01 (`pnpm lighthouse`, mediana de cinco); menu
   móvel (Esc fecha e devolve o foco ao botão, idioma e tema dentro do menu); faixa de 768 a 1023 px, em que
   entrar e sair ficam na barra e o menu mostra só os links; skip link visível no primeiro Tab e levando o foco
   ao `main`.
7. **Auth.** Painel de marca no escuro; banner de cookies aberto (`pb-96`); e-mail longo no convite; ordem de Tab
   no login (senha, olho, "Esqueci a senha", entrar).
8. **`MetricStrip`** com número de sete dígitos nos três idiomas, em 390 px.
9. **Onboarding** em 390 px com o `Footer` não fixo.
10. **`prefers-reduced-motion`**: popover entra sem escala e o `pressable` não encolhe.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `apps/web/app/[locale]/pricing/components/plan-card.tsx` | Saiu a prop `recommendedLabel`, que nenhum chamador passa (a chave `pricing.recommended` já tinha sido removida). Com ela foram o `Badge`, o anel e o ternário da variante do botão. O HTML gerado não muda: botão `outline`, sem anel e sem selo. |
| `docs/SECURITY.md:180` | O motivo do `style-src 'unsafe-inline'` citava o CSS-in-JS do antd. Agora cita `next-themes`, o posicionamento dos menus do Radix e o `sonner`, como o comentário de `packages/security/middleware.ts` já dizia. |

## Raio de impacto

- **`@repo/design-system`** atinge `apps/app` e `apps/web` inteiros: tokens (`globals.css`), `--radius` de
  0,625rem para 0,75rem, `Button` `lg` de 40 px para 44 px, `Badge` com `success` e `warning`, `TooltipProvider`
  com `delayDuration={400}`.
- **`Table`**: `UsersListClient`, `EntitiesListClient`, `AuditListClient`, `AccountSessionsPanel`,
  `OrganizationMembersTable`, `OrganizationInvitationsTable`, playground e `tableLoadMore.test.tsx`.
- **`ActionsMenu`**: usuários, entidades, convites, membros e playground. `onDelete` passou de `() => void` para
  `() => unknown`, o que é compatível.
- **`useAlert`**: mesma assinatura; todo toast do app e da web passa pelo Sonner.
- **`LoadErrorState`** virou client component e ganhou `onRetry`/`retrying` opcionais. **`SettingsSection`**
  ganhou `headingLevel`, `surface` e `titleRef` opcionais. **`FormSkeleton`** ganhou `columns`. Chamadores
  antigos continuam válidos.
- **i18n**: saem `apps.app.pages.common.organization.members.columns.email`, `apps.web.pages.features`,
  `.hero`, `.stats`, `home.cases`, `home.testimonials`.
- **E2E**: `apps/e2e` compila contra o dicionário novo (`tsc --noEmit` passa).

## Lacunas de teste

O handoff não listava lacunas. As que esta revisão aponta, todas abertas, para o `/test` cobrir:

- `Table`: não há teste da paginação nova (troca de página, seletor de tamanho, volta à página 1 ao buscar,
  `hideOnSinglePage`), do esqueleto nem do texto de vazio. Só o "carregar mais" tem teste.
- `RecordAvatar.initialsOf`: helper puro sem teste (e-mail, sufixo "Jr.", nome de uma palavra, grafema composto).
- `LoadErrorState` com `onRetry`: nenhum teste chama o botão nem confere o `disabled` durante `retrying`.
- `MetricStrip`: formatação por locale e estado de carregamento sem teste.
- Menu móvel da web: `headerMobileMenu.test.tsx` cobre abrir e fechar por clique, não o Esc com retorno de foco.
- `ActionsMenu`: falta o caso de `onDelete` assíncrono (botão em `loading`, cancelar desabilitado, Esc bloqueado
  durante a exclusão).

## Decisões em aberto

1. **Nomes no recorte do hero.** Recomendação: trocar por rótulos que não passam por dado real (por exemplo
   "Entidade 1", "Entidade 2"), ou tirar a coluna de nome do recorte. Mantê-los exige mudar o `DESIGN.md:179`.
2. **`Footer` do onboarding.** Recomendação: manter `sticky={false}` (o cartão estreito do onboarding não
   precisa de barra fixa) e tirar o onboarding da lista de exemplos do `apps/app/CLAUDE.md`.
3. **Cor primária dos e-mails.** Recomendação: espelhar o cobalto em `packages/email/brand.ts` numa tarefa
   própria, com o preview do `apps/email`, em vez de incluir aqui.
4. **Pasta `founder/`.** Recomendação: deixar fora do `.gitignore` e decidir por fork; o plano de negócio
   costuma ser material que o time quer versionar.
5. **Typecheck no meio do histórico.** O `home.ts` da web e a home nova dependem um do outro. Opção A
   (recomendada): manter os commits 26 e 27 separados, em sequência, e aceitar que o commit 26 sozinho deixe o
   `web typecheck` vermelho; o CI roda no topo da PR. Opção B: juntar os dois num commit só
   (`feat: rebuild the landing home`), quebrando a regra de um pacote por commit.
6. **Commit de dependências cruzando pacotes.** O commit 30 toca os `package.json` de `design-system`, `app` e
   `web` junto com o lockfile. Separar por pacote deixaria o lockfile fora de sincronia com algum `package.json`
   em todo commit intermediário (`pnpm install --frozen-lockfile` falha). Recomendação: aceitar a exceção.

## Gates estáticos

| gate | resultado |
|------|-----------|
| `pnpm check` | `Checked 1176 files … No fixes applied` (antes e depois das correções) |
| `pnpm --filter app typecheck` | passa |
| `pnpm --filter web typecheck` | passa (antes e depois das correções) |
| `pnpm --filter @repo/design-system typecheck` | passa |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67/67 |
| `pnpm --filter e2e typecheck` | passa (rodado porque o E2E importa o dicionário) |

As suítes Vitest de `app`, `web` e `design-system` não rodaram aqui; o handoff registra
`turbo run lint typecheck test` 29/29 e a remedição é do `/test`.

## Plano de commits

Antes do primeiro commit: `git reset` (mixed) para zerar o índice, que já traz quatro remoções, e conferir que
`git diff --cached --stat` sai vazio. As remoções voltam a ser preparadas nos commits 09 e 18.

Cada commit compila sozinho, com a exceção da decisão 5. A ordem difere da padrão num ponto: as chaves de i18n
que só acrescentam vêm antes do código que as lê (01 e 02), e as remoções vêm depois do código que deixou de lê-las
(26 e 31). A remoção das dependências (30) vem depois dos commits que tiram os imports.

| # | mensagem | arquivos |
|---|----------|----------|
| 01 | `feat(internationalization): add table, retry and panel copy keys` | `packages/internationalization/translations/components/ui/{table,button}.ts`; `.../apps/app/pages/admin/home.ts`; `.../common/{entities,home}.ts`; `.../signIn/index.ts`; `.../emailVerification/index.ts`; `.../onboarding/index.ts` |
| 02 | `feat(internationalization): rewrite landing page copy and add the skip link label` | `.../apps/web/index.ts`; `.../apps/web/layout.ts` (novo); `.../apps/web/pages/{contact/contact,cta/index,faq/index,pricing/index,signUp/index}.ts` |
| 03 | `feat(design-system): retune color, elevation and motion tokens` | `styles/globals.css`; `__tests__/themeContrast.test.ts` |
| 04 | `feat(design-system): restyle buttons, fields and status primitives` | `components/ui/{button,badge,card,input,input-group,input-otp,textarea,native-select,combobox,switch,tabs,accordion,progress,skeleton,responsive-image,mode-toggle}.tsx`; `components/ui/select/components/select.tsx`; `components/form/hookform/hookformInputPassword.tsx` |
| 05 | `feat(design-system): give menus, popovers and dialogs the new elevation and easing` | `components/ui/{alert-dialog,dialog,sheet,drawer,dropdown-menu,context-menu,menubar,popover,hover-card,tooltip,command,navigation-menu}.tsx` |
| 06 | `feat(design-system): restyle sidebar and charts` | `components/ui/{sidebar,chart,category-bar-chart}.tsx` |
| 07 | `refactor(design-system): rebuild Table as semantic HTML without antd` | `components/ui/table.tsx` |
| 08 | `refactor(design-system): rebuild ActionsMenu on Radix menu and alert dialog` | `components/ui/action-menu.tsx`; `__tests__/actionMenu.test.tsx` |
| 09 | `refactor(design-system): move toasts to Sonner and drop the antd provider` | `hooks/useAlert.ts`; `components/ui/sonner.tsx`; `index.tsx`; `providers/antd-app.tsx` (D); `__tests__/antdLocale.test.tsx` (D); `__tests__/antdTheme.test.tsx` (D) |
| 10 | `chore(security): drop antd from the style-src comment` | `packages/security/middleware.ts` |
| 11 | `refactor(app): remove the react-toastify container` | `apps/app/app/layout.tsx`; `apps/app/__tests__/alertTheme.test.ts` |
| 12 | `feat(app): refresh the panel shell and shared page pieces` | `apps/app/shared/components/ui/{Container,Footer,FormContainer,FormSkeleton,FormSurface,Header,LoadErrorState,MetricStrip,Navbar,PageFormFooter,PageHeader,PageSkeleton,RecordAvatar,SettingsSection,Sidebar,TableSkeleton}.tsx`; `.../ui/pageLayout.ts`; `apps/app/__tests__/pageShell.test.tsx` |
| 13 | `feat(app): restyle the notifications popover` | `apps/app/shared/components/notifications/{NotificationItem,NotificationsBell,NotificationsList}.tsx` |
| 14 | `feat(app): split auth layout with brand panel for sign-in and sign-up` | `(unauthenticated)/layout.tsx`; `(unauthenticated)/components/{AuthCard,AuthActionLink,AuthBrandPanel,AuthDivider,AuthPending}.tsx`; `(unauthenticated)/components/authLink.ts`; `sign-in/components/SignInForm.tsx`; `sign-up/components/SignUpFormClient.tsx` |
| 15 | `feat(app): restyle email link, password reset, email verification and invite screens` | `sign-in/email-link/components/{EmailLinkCompletion,EmailLinkRequestForm}.tsx`; `forgot-password/components/ForgotPasswordForm.tsx`; `reset-password/components/ResetPasswordForm.tsx`; `verify-email/components/{ConfirmEmailChangeResult,VerifyEmailResult}.tsx`; `invite/components/InvitationAcceptance.tsx` |
| 16 | `feat(app): restyle onboarding with step progress` | `onboarding/(components)/{OnboardingClient,OnboardingPreferencesStep,OnboardingProfileStep}.tsx`; `onboarding/loading.tsx` |
| 17 | `feat(app): use MetricStrip and retry on the common home` | `(common)/(pages)/(components)/{CommonHomeClient,EntityTypeChart}.tsx`; `(common)/(pages)/(hooks)/useEntitySummary.tsx`; `(common)/(pages)/loading.tsx` |
| 18 | `feat(app): use MetricStrip and retry on the admin home` | `admin/(pages)/(components)/{AdminHomeClient,BillingInsightsSection,BillingPlansCard,BillingPlansChart,BillingRevenueCard,RecentActivationsCard,UserActivitySection,UserRecencyChart}.tsx`; `admin/(pages)/(hooks)/{useBillingSummary,useUserActivitySummary,useUserSummary}.tsx`; `admin/(pages)/loading.tsx`; `apps/app/shared/components/ui/MetricCard.tsx` (D) |
| 19 | `feat(app): restyle entity, user and audit lists` | `entities/(pages)/(home)/EntitiesListClient.tsx`; `users/(pages)/(home)/UsersListClient.tsx`; `audit/(components)/AuditFilters.tsx`; `audit/(pages)/(home)/AuditListClient.tsx`; `apps/app/__tests__/{entitiesListReadOnly,tableLoadMore}.test.tsx` |
| 20 | `feat(app): put entity and user forms on a form surface` | `entities/(components)/EntityFormFields.tsx`; `entities/(pages)/create/{page,loading}.tsx`; `entities/(pages)/edit/[id]/{EditEntityClient,loading}.tsx`; `users/(components)/UserFormFields.tsx`; `users/(pages)/create/{page,loading}.tsx`; `users/(pages)/edit/[id]/{page,loading}.tsx` |
| 21 | `feat(app): group the team page into settings sections` | `organization/{OrganizationClient,loading}.tsx`; `organization/(components)/{InviteMemberForm,LeaveOrganizationButton,OrganizationInvitationsTable,OrganizationMembersTable}.tsx`; `apps/app/__tests__/{organizationTeamPage,organizationTransferKeyboard}.test.tsx` |
| 22 | `feat(app): restyle account settings panels` | `account/(components)/{AccountBillingPanel,AccountBillingPlaceholder,AccountEmailChangeDialog,AccountPasswordSetForm,AccountPrivacyPanel,AccountProfileForm,AccountSecurityForm,AccountSessionsPanel,AccountSignInMethodsPanel,AccountTabs,BillingPlanCard}.tsx`; `apps/app/__tests__/accountSessionsPanel.test.tsx` |
| 23 | `feat(app): rebuild the component playground on the new primitives` | `playground/page.tsx` |
| 24 | `feat(web): rebuild the header with skip link and full mobile menu` | `components/header/{index,language-switcher}.tsx`; `apps/web/app/[locale]/layout.tsx`; `apps/web/shared/lib/layout.ts` (novo); `apps/web/__tests__/{docsUrlEnv,rootLayoutAuthProvider}.test.tsx` |
| 25 | `feat(web): restyle the footer` | `components/{footer,cookiePreferencesButton}.tsx` |
| 26 | `feat(internationalization): replace landing home copy` | `.../apps/web/pages/home/home.ts`; `.../apps/web/pages/index.ts`; `.../apps/web/pages/{features,hero,stats}/index.ts` (D) |
| 27 | `feat(web): rebuild the landing home without invented proof` | `(home)/page.tsx`; `(home)/components/{hero,cta,faq}.tsx`; `(home)/components/{product-preview,steps,inherits,quality}.tsx` (novos); `(home)/components/{cases,cases-client,features,stats,testimonials,testimonials-client}.tsx` (D); `apps/web/app/[locale]/styles.css` |
| 28 | `feat(web): restyle pricing without a recommended plan` | `pricing/page.tsx`; `pricing/components/{plan-card,contact-plan-card,pricing-empty-state}.tsx` |
| 29 | `feat(web): restyle contact, legal, auth forms and 404` | `contact/components/contact-form-client.tsx`; `legal/components/legal-document.tsx`; `not-found.tsx`; `sign-in/components/sign-in-form-client.tsx`; `sign-up/components/sign-up-form-client.tsx` |
| 30 | `chore: drop antd and react-toastify dependencies` | `packages/design-system/package.json`; `apps/app/package.json`; `apps/web/package.json`; `pnpm-lock.yaml` |
| 31 | `refactor(internationalization): drop the member email column label` | `.../apps/app/pages/common/organization.ts` |
| 32 | `chore(claude): vendor design skills from six sources` | as 29 pastas novas de `.claude/skills/` (todo o conteúdo) e `.claude/skills/web-design-guidelines/{SKILL.md,references/command.md}` |
| 33 | `docs: add the interface design contract` | `docs/DESIGN.md` |
| 34 | `docs: point agent guides and the review checklist at the design contract` | `CLAUDE.md`; `AGENTS.md`; `apps/app/CLAUDE.md`; `apps/web/CLAUDE.md`; `packages/CLAUDE.md`; `docs/review-checklist.md`; `docs/feature-analysis-guide.md` |
| 35 | `docs: update fork, delivery and security docs for the new UI stack` | `README.md`; `docs/{AI-WORKFLOW,FORKING,GLOSSARY,SECURITY}.md`; `docs/templates/README.template.md`; `docs/delivery/{03-product-quality,05-legal-policies}.md` |
| 36 | `chore(claude): wire the design contract into agents and the kickoff command` | `.claude/agents/{analista-qa,desenvolvedor,planejador-tarefa}.md`; `.claude/commands/kickoff.md` |
| 37 | `feat: carry the design contract into the kickoff design prompt` | `scripts/kickoff/documents.mjs` |
| 38 | `docs(features): design-system-refresh` | `docs/features/design-system-refresh/{STATE.md,develop/handoff.md,review/review.md}` |

Caminhos abreviados: `.../` é `packages/internationalization/translations`; nos commits 03 a 09 os caminhos são
relativos a `packages/design-system/`; nos commits 14 a 23 a raiz é `apps/app/app/[locale]/`, com `(authenticated)`,
`(common)/(pages)` e `(admin)/admin/(pages)` omitidos quando o nome da rota basta; nos commits 25, 27 a 29 a raiz é
`apps/web/app/[locale]/`. A lista com caminho completo de cada arquivo foi conferida por script contra o
`git status`: nenhum arquivo alterado fica de fora e nenhum aparece em dois commits.

Título sugerido para a PR: `feat: design system refresh without antd`.

### Commits realizados

(preenchido pelo orquestrador depois de commitar)

## Decisões do usuário

- Nomes do recorte do hero: trocados por "Entidade 1" a "Entidade 4" (e "Entity", "Entidad"), em
  `packages/internationalization/translations/apps/web/pages/home/home.ts`.
- Onboarding: fica com `Footer sticky={false}`; a frase de `apps/app/CLAUDE.md` passou a citar o cartão estreito
  do onboarding como caso de barra não fixa.
- E-mails: `packages/email/brand.ts` espelha a paleta nova nesta PR (`#2559bf` no primário, fundo `#f9fafb`, borda
  `#e1e3e7`, texto `#15181f`, texto de apoio `#5f636c`), sem conferir o preview do `apps/email`. A suíte do
  pacote passou (209 testes). O preview fica para o `/test`.
- Commits 26 e 27 separados, com o 26 sem typecheck verde sozinho; o commit que remove antd e react-toastify junta
  os três `package.json` e o lockfile.
