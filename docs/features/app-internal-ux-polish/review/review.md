# Revisão: app-internal-ux-polish

Caminhos encurtados como no plano: `ui/` = `apps/app/shared/components/ui/`, `account/` = `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/`.

## Branch

| item | valor |
|------|-------|
| atual | `guilhermebittelbrunn/telas-internas-ui-melhorar` (placeholder do Conductor, sem upstream e sem commit além de `origin/main`) |
| regex de `.claude/rules/git-commits.md` na atual | `BRANCH INVALIDA` |
| nome proposto | `feat/app-internal-ux-polish` |
| regex no proposto | `branch OK: feat/app-internal-ux-polish` |
| ação | nenhuma. O usuário pediu para não renomear sem autorização dele; a decisão fica com o `/review` |

O diff toca dois apps (`apps/app` e `apps/e2e`) e dois pacotes, então o padrão manda omitir o `project`. Como a branch não tem remoto nem commit de terceiro, renomear com `git branch -m feat/app-internal-ux-polish` é seguro.

## Achados

| severidade | arquivo:linha | problema | ação |
|------------|---------------|----------|------|
| 🟡 | branch atual | Nome fora do padrão `<project>/<type>/<title>`. Commitar nela gera PR fora do padrão | Decisão em aberto 1 |
| 🟢 | `ui/Footer.tsx:24` | O JSDoc de `sticky` dizia "inside the block or dialog that owns them", mas o `apps/app/CLAUDE.md` novo proíbe `Footer` em diálogo e manda usar `AlertDialogFooter` | Corrigido: o texto fala só em bloco |
| 🟢 | `specs/BACKLOG.md:89` | A contagem por audiência chamava `app-internal-ux-polish` de "a `approved`", mas o frontmatter da spec está em `in-progress` (e a tabela de contadores logo acima também conta `approved` 0) | Corrigido: cita as duas specs pelo id e status real |
| 🟢 | `account/(components)/AccountProfileForm.tsx:148-158` | O bloco "E-mail" tem `h3` "E-mail" e o campo tem rótulo "E-mail"; o leitor de tela anuncia duas vezes. Já registrado no handoff | Mantido. O `Input` precisa de nome acessível |
| 🟢 | `account/(components)/accountTabRouting.ts:24-32` | `?checkout=success` sobrevive à troca de seção. Voltar para cobrança mostra o aviso de novo e religa o `useCheckoutConfirmation`. É o que o plano pede (preservar `checkout` e `plan`) | Mantido, vai para "Verificar no `/test`" |
| 🟢 | `ui/Sidebar.tsx:109-115` | O link do menu para outra seção é navegação do router com outro `searchParams`, e o App Router trata isso como outro segmento de página. Pode haver remontagem da conta e flash do `loading.tsx` ao clicar no menu. O clique nas abas usa `replaceState` e não passa por isso | Vai para "Verificar no `/test`" |
| 🟢 | ordem dos commits | Os commits da `app` usam chaves (`sections`, `sectionNav`, `profile.details`…) que só entram no commit de i18n, que vem depois. Cada commit intermediário isolado não passa no typecheck | Decisão em aberto 2 |

Nada bloqueante. A skill `/code-review` (nível `low`, só as linhas que mudam condição, guarda, carga ou efeito) não achou bug de execução; ela conferiu o `loading` do `Button` no diálogo de e-mail, o efeito de normalização das abas (não entra em loop) e o estado aberto do `NavBranch`.

### O que está conforme

- Nenhuma chave de i18n ficou órfã. `settingsItems` não tem mais uso em `apps/` nem `packages/`. `billing.description` e `privacy.description` da conta saíram sem consumidor; o `billingCopy.description` de `BillingInsightsSection.tsx:114` lê `admin.home.billing`, que é outra chave.
- `routes.tsx` usa `routes.account.<seção>.label`, que vem de `account.tabs.*` em `paths.ts:46-66`. Menu e seção mostram o mesmo texto, e "Geral" virou "Perfil".
- Os links gerados fora do app continuam caindo na seção certa: `apps/api/(shared)/lib/billing.ts:44` monta `?tab=billing[&checkout=…]` e `apps/web/shared/lib/pricingCta.ts:30` monta `?tab=billing&plan=…` dentro do `redirect`. `resolveAccountTab` aceita `billing` no modo `subscription`, e `accountTabHref` troca só o `tab`, preservando os demais parâmetros.
- O efeito de normalização em `AccountTabs.tsx:70-78` só regrava a URL quando `requestedTab !== activeTab`, então URL válida não é reescrita.
- `Container`, `Footer` e `Sidebar` ganharam props com padrão igual ao comportamento anterior (`header` ausente, `width="full"`, `sticky=true`).
- `AlertDialogAction` aceita `variant` (`packages/design-system/components/ui/alert-dialog.tsx:152-165`), e o `Button` do design system aceita `loading`.
- Os cancelar dos dois diálogos com formulário são `type="button"`.
- Nenhum comentário novo cita artefato do fluxo, e não entrou `console.log`.
- O corte de MVP da spec `app-internal-ux-polish` bate com o que foi implementado: navegação vertical e select abaixo de `lg`, seção derivada do `?tab=` a cada render, blocos com salvar próprio, zona de perigo no fim da privacidade, confirmar destrutivo nas ações que encerram acesso e padrão de página nas 11 telas.
- Sem mudança em SDK, API ou `apiErrors`.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `apps/app/shared/components/ui/Footer.tsx:24` | JSDoc de `sticky`: "inside the block or dialog that owns them" passou a "inside the block that owns them" |
| `specs/BACKLOG.md:89` | "a `approved` e a `proposed`" passou a "`app-internal-ux-polish` em `in-progress` e `admin-own-account` em `proposed`" |

As duas ficam no working tree para o usuário conferir no `git diff` antes de commitar.

## Raio de impacto

- **`AddButton` (`packages/design-system/components/ui/add-button.tsx`)**: `outline` passou a `default`. No repositório, os consumidores são `EntitiesListClient.tsx` e `UsersListClient.tsx`. `apps/web` e `apps/email` não usam. Três testes mockam o componente (`usersListArchiveLabels`, `entitiesListReadOnly`, `usersListLastAccess`) e não dependem da variante. Fork que usa o `AddButton` em outro lugar herda o botão primário.
- **`Header`**: perdeu o `px-4` interno. Vale para as 12 telas que o importam, inclusive `playground` e `onboarding`, que não entraram no corte. O `PageBreadcrumb` do playground não muda.
- **`Container`**: a carga passou a `min-h-[50vh]` também no desktop (antes era `md:min-h-min`). Vale para as 13 telas que usam o `Container`, inclusive `playground` e `onboarding`.
- **`Footer`**: `sticky` padrão `true`; só os cinco formulários com `sticky={false}` mudam.
- **`Sidebar`**: passou a ler `useSearchParams`. O handoff mediu com `pnpm --filter app build`, que saiu com 0 e todas as rotas autenticadas dinâmicas, sem pedido de `Suspense`.
- **i18n**: chaves removidas (`routes.platform.settingsItems`, `account.billing.description`, `account.privacy.description`) sem uso restante no código. Só os `plan.md` de features antigas citam esses nomes, e eles são histórico.

## Verificar no `/test`

Nada abaixo dá para confirmar lendo o código. A primeira linha é a que sustenta o corte.

1. **`replaceState` atualiza `useSearchParams` no Next 16 real, e o link do menu troca a seção sem recarregar.** Repro: `pnpm e2e` com `apps/e2e/tests/accountSettings.spec.ts` (precisa de JDK 21 e do stack). O handoff não rodou.
2. **Link do menu com a conta aberta.** Repro: em `/pt-br/account?tab=profile`, digitar no nome sem salvar e clicar em "Segurança" no menu lateral. Anotar se o `PageSkeleton` da conta pisca, se a página remonta e se o texto digitado some. Repetir trocando pela aba da lista vertical, que não deve piscar.
3. **Botão voltar depois de várias abas.** Repro: abrir `/pt-br/account?tab=profile`, clicar em três abas e usar o voltar do navegador. Deve sair da conta, sem uma entrada por aba.
4. **Navegação da conta em 375 px e 1280 px, em en e es.** Repro: `/en/account?tab=preferences` e `/es/account?tab=privacy` nas duas larguras; medir `document.documentElement.scrollWidth <= innerWidth`, conferir que o select aparece só abaixo de `lg` e que os rótulos da coluna de 12 rem não se sobrepõem.
5. **Contraste do gatilho inativo** (`text-foreground/60` na variante `line`) em light. O axe do `a11yDark.spec.ts` cobre só o dark.
6. **Salto entre `loading.tsx` e conteúdo nas oito rotas, com rede lenta.** Título e breadcrumb devem ficar no mesmo lugar. Conferir também que a carga do `Container` em `min-h-[50vh]` no desktop não empurra o rodapé de forma estranha.
7. **Breadcrumb alinhado ao título** depois da retirada do `px-4` interno do `Header`, inclusive em `playground` e `onboarding`.
8. **`Footer` fixo a 375 px** nos formulários de página inteira (criar/editar entidade e usuário): campo focado escondido atrás da barra (WCAG 2.2 SC 2.4.11). Se acontecer, registrar como achado.
9. **Diálogos de trocar e-mail e excluir conta a 375 px**: rodapé empilhado, foco inicial no primeiro campo, retorno do foco ao gatilho e cancelar que não envia o formulário.
10. **`checkout` preservado.** Repro: abrir `/pt-br/account?tab=billing&checkout=success`, ir para "Perfil" e voltar para "Cobrança". A URL mantém `checkout=success`, e o aviso e a espera pela confirmação voltam. Decidir se isso incomoda. Sem Stripe configurada, o aviso fica 🔒.
11. **Personificação**: aviso de somente leitura no topo do conteúdo da conta e todas as ações desabilitadas, inclusive os botões dos diálogos.
12. **Modo `simple`** (`NEXT_PUBLIC_PRODUCT_MODE=simple`): `?tab=billing` vira `?tab=profile` no navegador real e o menu não mostra "Cobrança".
13. **`AddButton` primário** legível em light e dark, nas listas de entidades e usuários.

## Lacunas de teste

| lacuna | origem | veredito |
|--------|--------|----------|
| Nenhum teste de componente das telas da F2 confere a posição do `PageHeader` nem que o `AddButton` saiu do `Header` | handoff | continua aberta |
| `PageSkeleton` sem teste | handoff | continua aberta; a coerência com a tela é visual e cabe ao `/test` |
| Troca de seção pelo select coberta só no jsdom; o E2E cobre a lista vertical | handoff | continua aberta |
| `Header` sem o `px-4` interno não tem teste | revisão | aberta, verificação visual (item 7) |
| Remontagem ao navegar pelo menu com a conta aberta | revisão | aberta; o E2E confere a seção e o `aria-current`, não o flash nem a perda de texto digitado (item 2) |

As correções desta revisão não fecharam nenhuma lacuna.

## Decisões em aberto

1. **Renomear a branch.** Proposta: `git branch -m feat/app-internal-ux-polish` antes do primeiro commit. A branch atual não tem upstream nem commit além de `origin/main`, então o rename não reescreve nada publicado. Recomendação: renomear. Sem o rename, os commits e o push vão para uma branch com nome inválido.
2. **Commits intermediários sem typecheck.** A ordem do repositório põe o i18n por último, e os commits da `app` usam chaves que só existem nele. Recomendação: manter a ordem convencionada, como nas features anteriores; a PR é avaliada inteira e o CI roda no `HEAD`. A alternativa é mover o commit de i18n para antes dos commits da `app`.

## Gates estáticos

Sem `--force`, com o cache do turbo.

| gate | comando | resultado |
|------|---------|-----------|
| Typecheck app | `pnpm --filter app typecheck` | sem erro |
| Typecheck design-system | `pnpm --filter @repo/design-system typecheck` | sem erro |
| Typecheck E2E | `pnpm --filter e2e typecheck` | sem erro |
| Lint/format | `pnpm check` | 1069 arquivos, nenhum erro |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes verdes |

Não rodei a suíte Vitest do app nem o build. O handoff registra 1191 testes verdes e o build com saída 0, e as duas correções desta revisão não mexem em comportamento.

## Segredos no artefato

Varri `docs/features/app-internal-ux-polish/`, `specs/app-internal-ux-polish.md`, `specs/admin-own-account.md` e `specs/research/settings-page-patterns.md` atrás de senha, token, chave e e-mail. As ocorrências de "senha" são nomes de campo e de bloco. Não há screenshot na pasta.

## Plano de commits

Ordem: design-system, app, e2e, internationalization, claude, specs, features. Antes do primeiro, `git diff --cached --stat` tem de sair vazio.

| # | mensagem | arquivos |
|---|----------|----------|
| 1 | `feat(design-system): make the add button primary` | `packages/design-system/components/ui/add-button.tsx` |
| 2 | `feat(app): add the page header, skeleton and settings section to the page shell` | `apps/app/shared/components/ui/pageLayout.ts`, `ui/PageHeader.tsx`, `ui/PageSkeleton.tsx`, `ui/SettingsSection.tsx`, `ui/Container.tsx`, `ui/Header.tsx`, `ui/Footer.tsx`, `apps/app/__tests__/pageShell.test.tsx`, `apps/app/__tests__/settingsSection.test.tsx`, `apps/app/__tests__/sharedFooterPendingState.test.tsx` |
| 3 | `feat(app): mark the active sidebar item by path and query` | `apps/app/shared/lib/navActive.ts`, `ui/Sidebar.tsx`, `apps/app/app/[locale]/(authenticated)/(common)/routes.tsx`, `apps/app/__tests__/navActive.test.ts`, `apps/app/__tests__/sidebarActiveQuery.test.tsx`, `apps/app/__tests__/sidebarBrand.test.tsx`, `apps/app/__tests__/commonNavRoutes.test.tsx` |
| 4 | `feat(app): derive the account section from the URL` | `account/(components)/accountTabRouting.ts`, `account/(components)/AccountTabs.tsx`, `account/(pages)/(home)/AccountClient.tsx`, `account/(pages)/(home)/loading.tsx`, `apps/app/__tests__/accountTabRouting.test.ts`, `apps/app/__tests__/accountTabs.test.tsx`, `apps/app/__tests__/accountTabsOverflow.test.tsx` (removido) |
| 5 | `feat(app): split the account sections into settings blocks with a danger zone` | `account/(components)/AccountProfileForm.tsx`, `AccountEmailChangeDialog.tsx`, `AccountSecurityForm.tsx`, `AccountPasswordSetForm.tsx`, `AccountSignInMethodsPanel.tsx`, `AccountSessionsPanel.tsx`, `AccountPreferencesForm.tsx`, `AccountPrivacyPanel.tsx`, `AccountBillingPanel.tsx`, `apps/app/__tests__/accountSecurityForm.test.tsx`, `accountSessionsPanel.test.tsx`, `accountSignInMethodsPanel.test.tsx`, `accountPrivacyPanel.test.tsx` |
| 6 | `feat(app): apply the page shell to the common panel screens` | `(common)/(pages)/(components)/CommonHomeClient.tsx`, `(common)/(pages)/loading.tsx`, `entities/(pages)/(home)/EntitiesListClient.tsx`, `entities/(pages)/(home)/loading.tsx`, `entities/(pages)/create/page.tsx`, `entities/(pages)/edit/[id]/EditEntityClient.tsx`, `entities/(pages)/edit/[id]/loading.tsx`, `organization/OrganizationClient.tsx`, `organization/loading.tsx`, `organization/(components)/InviteMemberForm.tsx` |
| 7 | `feat(app): apply the page shell to the admin screens` | `(admin)/admin/(pages)/(components)/AdminHomeClient.tsx`, `(admin)/admin/(pages)/loading.tsx`, `users/(pages)/(home)/UsersListClient.tsx`, `users/(pages)/(home)/loading.tsx`, `users/(pages)/create/page.tsx`, `users/(pages)/edit/[id]/page.tsx`, `audit/(pages)/(home)/AuditListClient.tsx`, `audit/(pages)/(home)/loading.tsx` |
| 8 | `test(e2e): cover the account sections and their dark mode accessibility` | `apps/e2e/tests/accountSettings.spec.ts`, `apps/e2e/tests/a11yDark.spec.ts` |
| 9 | `feat(internationalization): add the account settings copy and drop the old settings menu labels` | `packages/internationalization/translations/apps/app/pages/common/account.ts`, `packages/internationalization/translations/apps/app/pages/common/routes/index.ts` |
| 10 | `docs(claude): document the page shell and footer variants in the app guide` | `apps/app/CLAUDE.md` |
| 11 | `docs(specs): add the internal screens polish and admin account specs` | `specs/BACKLOG.md`, `specs/app-internal-ux-polish.md`, `specs/admin-own-account.md`, `specs/research/settings-page-patterns.md` |
| 12 | `docs(features): app-internal-ux-polish` | `docs/features/app-internal-ux-polish/STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md` |

Os caminhos das linhas 6 e 7 são relativos a `apps/app/app/[locale]/(authenticated)/`. Título de PR sugerido: `feat: account settings page and a single page shell for internal screens`.

### Commits realizados

O usuário aprovou o plano em 2026-11-10 e, na mesma resposta, autorizou o push. Também aprovou as duas recomendações em aberto: a branch foi renomeada de `guilhermebittelbrunn/telas-internas-ui-melhorar` para `feat/app-internal-ux-polish`, que passa na regex do repo, e a ordem do repo foi mantida, com o i18n no commit 9.

Depois de cada commit, o `git show --stat` foi conferido contra a lista do plano, e nenhum divergiu.

| # | hash | mensagem |
|---|------|----------|
| 1 | `e20dd05` | `feat(design-system): make the add button primary` |
| 2 | `33dfba3` | `feat(app): add the page header, skeleton and settings section to the page shell` |
| 3 | `7fe8913` | `feat(app): mark the active sidebar item by path and query` |
| 4 | `a745791` | `feat(app): derive the account section from the URL` |
| 5 | `303872a` | `feat(app): split the account sections into settings blocks with a danger zone` |
| 6 | `91ea64e` | `feat(app): apply the page shell to the common panel screens` |
| 7 | `31fa6a7` | `feat(app): apply the page shell to the admin screens` |
| 8 | `e9fbfd0` | `test(e2e): cover the account sections and their dark mode accessibility` |
| 9 | `dec3073` | `feat(internationalization): add the account settings copy and drop the old settings menu labels` |
| 10 | `7bd9cf8` | `docs(claude): document the page shell and footer variants in the app guide` |
| 11 | `79860d6` | `docs(specs): add the internal screens polish and admin account specs` |
| 12 | — | `docs(features): app-internal-ux-polish` (este artefato; o hash fica no `git log`) |

Os commits foram enviados com `git push -u origin feat/app-internal-ux-polish`. Nenhuma PR foi aberta.
