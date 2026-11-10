# Handoff do `/develop`: app-internal-ux-polish

F1 e F2 entraram juntas, na ordem do §10.8 do plano. Não houve SDK nem API. Nada foi commitado, e o índice está vazio (`git diff --cached --stat` sem saída).

Caminhos encurtados como no plano: `ui/` = `apps/app/shared/components/ui/`, `account/` = `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/`, `(common)/` e `(admin)/` = as raízes dos dois painéis.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 1. `AddButton` primário | `packages/design-system/components/ui/add-button.tsx` (`variant="default"`) |
| 2. Shell de página | novos: `ui/pageLayout.ts`, `ui/PageHeader.tsx`, `ui/PageSkeleton.tsx`, `ui/SettingsSection.tsx`. Alterados: `ui/Container.tsx` (`header`, `width`, carga em `min-h-[50vh]`), `ui/Header.tsx` (sem o `px-4` interno), `ui/Footer.tsx` (`sticky`, padrão `true`) |
| 3. Menu com query | novo `apps/app/shared/lib/navActive.ts`; `ui/Sidebar.tsx` (`useSearchParams`, `NavBranch` controlado, `aria-current="page"` em folha e sub-item); `(common)/routes.tsx` (rótulos de Configurações vindos de `routes.account.<tab>.label`) |
| 4. Seção derivada da URL | novo `account/(components)/accountTabRouting.ts`; `account/(components)/AccountTabs.tsx` reescrito (aba calculada a cada render, `replaceState` com `accountTabHref`, normalização por efeito, `Tabs` vertical a partir de `lg`, `NativeSelect` abaixo de `lg`, `h2` + descrição por seção, aviso de personificação no topo do conteúdo); `account/(pages)/(home)/AccountClient.tsx` (`PageHeader`, `width="narrow"`); `account/(pages)/(home)/loading.tsx` |
| 5. Blocos e zona de perigo | `AccountProfileForm.tsx` (blocos "Dados pessoais" e "E-mail"; o e-mail saiu do `<form>` do perfil), `AccountSecurityForm.tsx` (blocos "Senha" e "Sair de todos os dispositivos", confirmar destrutivo), `AccountPasswordSetForm.tsx`, `AccountSignInMethodsPanel.tsx` e `AccountSessionsPanel.tsx` (`SettingsSection`, confirmar destrutivo), `AccountPreferencesForm.tsx` (bloco "Tema e idioma"), `AccountPrivacyPanel.tsx` (exportação, prazo, exclusão por último com `tone="destructive"`, `AlertDialogFooter`), `AccountEmailChangeDialog.tsx` (`AlertDialogFooter`), `AccountBillingPanel.tsx` (sem o parágrafo de descrição, `h3` no nome do plano atual, grade em até 2 colunas). Todos em `account/(components)/` |
| 6. i18n | `packages/internationalization/translations/apps/app/pages/common/account.ts` e `.../routes/index.ts` (ver "i18n") |
| 7. Telas comuns | `(common)/(pages)/(components)/CommonHomeClient.tsx`, `(common)/(pages)/loading.tsx`, `entities/(pages)/(home)/EntitiesListClient.tsx` e `loading.tsx`, `entities/(pages)/create/page.tsx`, `entities/(pages)/edit/[id]/EditEntityClient.tsx` e `loading.tsx`, `organization/OrganizationClient.tsx` e `loading.tsx`, `organization/(components)/InviteMemberForm.tsx` (`sticky={false}` no lugar do contorno por `className`) |
| 8. Telas do admin | `(admin)/(pages)/(components)/AdminHomeClient.tsx`, `(admin)/(pages)/loading.tsx`, `users/(pages)/(home)/UsersListClient.tsx` e `loading.tsx`, `users/(pages)/create/page.tsx`, `users/(pages)/edit/[id]/page.tsx`, `audit/(pages)/(home)/AuditListClient.tsx` e `loading.tsx` |
| 9. E2E | novo `apps/e2e/tests/accountSettings.spec.ts`; `apps/e2e/tests/a11yDark.spec.ts` (três rotas da conta: `profile`, `security`, `privacy`) |
| 10. Documentação | `apps/app/CLAUDE.md`: seção nova "Páginas" (`Container header` + `PageHeader`, `width="narrow"`, `gap-6`, `PageSkeleton`, `SettingsSection`) e, em "Formulários com ações no rodapé", quando usar `sticky={false}` e o padrão de `AlertDialogFooter` com cancelar `type="button"` |

Testes Vitest em `apps/app/__tests__/`: novos `accountTabRouting.test.ts`, `accountTabs.test.tsx`, `navActive.test.ts`, `sidebarActiveQuery.test.tsx`, `pageShell.test.tsx`, `settingsSection.test.tsx`. Ajustados `sidebarBrand.test.tsx`, `commonNavRoutes.test.tsx`, `sharedFooterPendingState.test.tsx`, `accountSecurityForm.test.tsx`, `accountSessionsPanel.test.tsx`, `accountSignInMethodsPanel.test.tsx`, `accountPrivacyPanel.test.tsx`. Removido `accountTabsOverflow.test.tsx` (os casos de modo de produto migraram para `accountTabs.test.tsx`).

## Contrato

Nenhum DTO nem action do SDK mudou. A única mudança em pacote compartilhado de UI é o `AddButton`, agora primário. No repositório, os consumidores são `EntitiesListClient.tsx` e `UsersListClient.tsx`; forks que usem o `AddButton` em outro lugar herdam a variante nova.

Nas peças do app, `Container`, `Footer` e `Sidebar` receberam props aditivas, com padrão igual ao comportamento anterior. Duas mudanças valem para todas as telas que usam essas peças, inclusive `playground` e `onboarding`: o `Header` perdeu o `px-4` interno e a carga do `Container` passou de `min-h-screen` no celular para `min-h-[50vh]`.

## i18n

Chaves novas nos três idiomas, em `account.ts`: `sectionNav.label`, `sections.{profile,security,preferences,billing,privacy}`, `profile.details.{title,description}`, `profile.emailDescription`, `security.passwordTitle` e `preferences.title`. Os valores de `sections.billing` e `sections.privacy` são os de `billing.description` e `privacy.description`, que saíram. `routes.platform.settingsItems` também saiu dos três idiomas. O texto segue o §10.7 do plano.

Não há código de erro novo nem entrada nova em `apiErrors`.

## Desvios em relação ao plano

- `pageLayout.ts` exporta também o tipo `PageWidth`, usado por `Container` e `PageSkeleton`.
- Usuários e auditoria passaram de `gap-4` para `gap-6`. O plano cita só entidades e equipe, mas a regra dele é `gap-6` em toda pilha de página.
- No perfil, o bloco "E-mail" tem `h3` "E-mail" e o campo continua com o rótulo "E-mail". Mantive o rótulo porque o `Input` precisa de nome acessível; o leitor de tela anuncia o texto duas vezes (região e campo).
- A conta sem senha mostra o bloco do canal de privacidade como `SettingsSection` sem filhos, só com título e descrição.
- O gatilho "Excluir minha conta" já era `destructive` antes e continua assim.
- Ambiente: o `node_modules` do worktree tinha só o binário x64 do Rollup, e o Vitest não subia. Rodei `pnpm install --frozen-lockfile`, que instalou o `@rollup/rollup-darwin-arm64` sem alterar o `pnpm-lock.yaml`.
- Não fiz smoke local. Subir o app exige emuladores e a API, e o `pnpm --filter app build` respondeu ao risco do `useSearchParams` no `Sidebar`, que era o motivo do smoke.

## Pendências e decisões em aberto

Nenhuma decisão em aberto. As quatro perguntas do plano já tinham resposta, e segui todas.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm fix` e depois `pnpm check` | 1069 arquivos, nenhum erro |
| Typecheck app | `pnpm --filter app typecheck` | sem erro |
| Typecheck design-system | `pnpm --filter @repo/design-system typecheck` | sem erro |
| Typecheck E2E | `pnpm --filter e2e typecheck` | sem erro |
| Testes app | `pnpm --filter app test` | 135 arquivos, 1191 testes, todos verdes (antes: 1142; +54 novos, −5 do arquivo removido) |
| Testes design-system | `pnpm --filter @repo/design-system test` | 14 arquivos, 172 testes verdes |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes verdes |
| Vitest do E2E | `pnpm --filter e2e test` | 2 arquivos, 17 testes verdes |
| Build | `pnpm --filter app build` (em `apps/app`) | sai com 0; todas as rotas autenticadas como `ƒ` (dinâmicas), sem pedido de `Suspense` para o `useSearchParams` do `Sidebar` |

O que os testes medem, além do que já existia:

- A aba acompanha a URL sem remontar o componente, que é a regressão do E9. `accountTabs.test.tsx` faz `rerender` com outro `useSearchParams` e confere o `aria-selected`.
- Clicar numa aba chama `history.replaceState` com `tab` trocado e `checkout` preservado, e o select faz o mesmo. A URL sem `tab`, com `tab=xyz` ou com `tab=billing` no modo `simple` é normalizada para `profile`, com os outros parâmetros mantidos. Tab válido não regrava a URL.
- `isNavUrlActive` cobre igual, prefixo, `#`, query exigida, parâmetro a mais e parâmetro faltando (`navActive.test.ts`).
- No `Sidebar`, o sub-item certo recebe `aria-current="page"`, o ativo muda quando a query muda e o grupo abre ao navegar de entidades para a conta (`sidebarActiveQuery.test.tsx`, por `rerender`).
- `Container` mantém o `h1` do `header` com `loading` e com `loadError`; `width="narrow"` aplica `max-w-4xl` (`pageShell.test.tsx`).
- `Footer sticky={false}` não leva a classe `sticky` e continua bloqueando o envio com `isLoading`.
- Os botões de confirmar de desvincular, encerrar outras, sair de todos e excluir conta têm `data-variant="destructive"`. Encerrar uma sessão específica continua `outline` e sem diálogo. No diálogo de exclusão, cancelar é `type="button"` e confirmar é `type="submit"`.
- Na privacidade, a exclusão é a última região, vem depois da exportação e tem `data-tone="destructive"`; o canal de privacidade da conta sem senha tem `data-tone="default"`.
- Os itens de Configurações do menu usam os mesmos textos de `account.tabs`, com "Perfil" no primeiro (`commonNavRoutes.test.tsx`).

## A verificar no `/test`

Nada abaixo foi medido nesta etapa. O jsdom não aplica CSS nem integra com o router do Next.

- E2E novo e axe das três rotas da conta: `pnpm e2e` (precisa de JDK 21 e do stack). Não rodei. O `accountSettings.spec.ts` é a prova de que o `replaceState` atualiza `useSearchParams` no Next 16 real e de que o link do menu troca a seção sem recarregar.
- Layout da navegação: a 375 px o select aparece e a lista some; a 1280 px a coluna de 12 rem não sobrepõe rótulos em en e es. Repro: abrir `/en/account?tab=preferences` e `/es/account?tab=privacy` nas duas larguras e medir `document.documentElement.scrollWidth <= innerWidth`.
- Contraste do gatilho inativo (`text-foreground/60` na variante `line`) em light e dark: o axe do `a11yDark.spec.ts` cobre só o dark.
- Botão voltar do navegador depois de clicar em várias abas: não deve acumular uma entrada por aba, porque o clique usa `replaceState`.
- Salto entre `loading.tsx` e conteúdo nas oito rotas, com rede lenta: título e breadcrumb no mesmo lugar.
- Breadcrumb alinhado ao título depois da retirada do `px-4` interno do `Header`, inclusive em `playground` e `onboarding`.
- `Footer` fixo nos formulários de página inteira (entidades, usuários) a 375 px: campo focado escondido atrás da barra (WCAG 2.2 SC 2.4.11). Se acontecer, registrar como achado.
- Diálogos de trocar e-mail e excluir conta: rodapé empilhado a 375 px, foco inicial no primeiro campo e retorno ao gatilho.
- Personificação: aviso de somente leitura no topo do conteúdo da conta e ações desabilitadas.
- Modo `simple` (`NEXT_PUBLIC_PRODUCT_MODE=simple`): `?tab=billing` vira `?tab=profile` no navegador real.
- `AddButton` primário legível em light e dark.

## Lacunas de teste conhecidas

- Nenhum teste de componente para as telas da F2 confere a posição do `PageHeader` nem a ausência do `AddButton` no `Header`; os testes existentes buscam o botão por nome e seguem verdes.
- `PageSkeleton` não tem teste. A coerência com a tela real é visual e fica para o `/test`.
- A troca de seção pelo select está coberta só no jsdom; o E2E cobre a lista vertical, não o select abaixo de `lg`.
