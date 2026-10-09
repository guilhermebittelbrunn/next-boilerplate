# Plano: rótulos de UI traduzidos, antd no idioma ativo e foco na senha depois de uma recusa

Tarefa direta, sem spec. Junta quatro achados do `specs/BACKLOG.md` e do `/test` de
`account-deletion-dialog-focus`, e vai no mesmo PR que aquela tarefa (que está no working tree, sem commit).
Plano feito em rodada autônoma do `/cycle`: as decisões tomadas sem perguntar estão na §12, e a §11 traz as
perguntas já com a opção adotada.

As âncoras `arquivo:linha` foram reconferidas neste checkout em 2026-10-09, com o diff de
`account-deletion-dialog-focus` aplicado. Abreviações: `<ds>` = `packages/design-system/components/ui`,
`<account>` = `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account`, `<i18n>` =
`packages/internationalization/translations`.

## 0. Sumário do desenho

- Os componentes do design system com texto em inglês passam a ler a copy de `dictionary.components.*` com
  `getDictionary()`, como já fazem `action-menu.tsx:39-40`, `table.tsx:70-71`, `select/index.tsx:84` e
  `hookformInputPassword.tsx:43-44`. Os três arquivos que ainda não têm `"use client"` (`spinner.tsx`,
  `breadcrumb.tsx`, `pagination.tsx`) ganham a diretiva, porque `getDictionary` mora num módulo client.
- O `"Loading"` do `Spinner` é corrigido no próprio `Spinner`, não nos três call sites (`Container.tsx:28`,
  `FullScreenLoader.tsx:17`, playground), pela regra de 3+ call sites da `cycle-policy` §3.
- O `AntdAppProvider` passa o pacote de idioma do antd ao `ConfigProvider`, lendo o idioma com
  `useDictionary()`. Na `apps/app` o provider fica no root layout, acima do segmento `[locale]`, e a regra
  de `apps/app/CLAUDE.md:47` manda usar o hook ali. Os pacotes `pt_BR`, `en_US` e `es_ES` vêm com o antd
  5.29.3 instalado; não entra dependência.
- Os dois `LanguageSwitcher` e o `PageBreadcrumb` leem a copy do dicionário. O breadcrumb troca o
  `href="/painel"` (rota que não existe) por `withLocalePath(locale, "/")` e reaproveita a chave
  `apps.app.pages.common.routes.home`.
- Nos dois diálogos de conta, o `mutate` ganha um `onError` por chamada que devolve o foco ao campo de senha e
  seleciona o que foi digitado: `form.setFocus("currentPassword", { shouldSelect: true })`. O campo de senha
  da exclusão ganha `autoComplete="current-password"` e `required`, como o da troca de e-mail.
- i18n: 8 folhas novas em `<i18n>/components/ui/`, ligadas no `components/index.ts`. Nenhum `apiErrors` novo.
- Sem SDK, API, Firestore, env ou infra.

## 1. Contexto

### 1.1 Problema

**Strings soltas (regra de ouro 2).** O achado em `specs/BACKLOG.md:695` lista texto de UI cravado em inglês
(e um em português) que aparece igual nos três idiomas. A maior parte é nome acessível: o leitor de tela de
quem usa o produto em pt-br ou es ouve "Toggle theme", "Close", "Loading". Reconferido hoje:

| Âncora no achado | Situação hoje | Texto |
|------------------|---------------|-------|
| `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` | igual | `sr-only` "Switch language" |
| `apps/web/app/[locale]/components/header/language-switcher.tsx:68` | igual | `sr-only` "Switch language" |
| `<ds>/mode-toggle.tsx:14-18` | igual | itens "Light", "Dark", "System" |
| `<ds>/mode-toggle.tsx:39` | igual | `sr-only` "Toggle theme" |
| `<ds>/sidebar.tsx:299`, `:311`, `:314` | igual | "Toggle Sidebar" (`sr-only`, `aria-label`, `title`) |
| `apps/app/shared/components/ui/PageBreadcrumb.tsx:28-30` | igual | `href="/painel"` e "Início" |
| `<ds>/dialog.tsx:75` | igual | `sr-only` "Close" |
| `<ds>/sheet.tsx:79` | igual | `sr-only` "Close" |
| `<ds>/pagination.tsx:74`, `:91`, `:114` | igual | "Go to previous page", "Go to next page", "More pages" |
| `<ds>/breadcrumb.tsx:101` | igual | `sr-only` "More" |
| `<ds>/carousel.tsx:209`, `:239` | igual | "Previous slide", "Next slide" |
| `<ds>/spinner.tsx:9` | igual | `aria-label="Loading"` |
| `apps/app/shared/components/ui/Container.tsx:28` | igual | `<Spinner className="size-10" />` sem rótulo próprio |
| `apps/app/shared/components/ui/FullScreenLoader.tsx:17` | igual | `<Spinner className="size-8" />` sem rótulo próprio |

O `git grep` próprio sobre `packages/design-system/components` e `providers` achou, além disso:

| Âncora | Texto | Decisão |
|--------|-------|---------|
| `<ds>/sidebar.tsx:221-222` | `SheetTitle` "Sidebar" e `SheetDescription` "Displays the mobile sidebar." (lidos pelo leitor de tela quando a barra abre a 390 px) | entra: mesmo arquivo do achado, e está em uso |
| `<ds>/dialog.tsx:116` | botão "Close" do `DialogFooter` com `showCloseButton` | entra: mesmo arquivo, mesma chave |
| `<ds>/pagination.tsx:15`, `:80`, `:96` | `aria-label="pagination"`, textos visíveis "Previous" e "Next" | entra: mesmo arquivo |
| `<ds>/breadcrumb.tsx:8` | `aria-label="breadcrumb"` no `nav` (em uso pelo `Header.tsx` da `apps/app`) | entra: mesmo arquivo, e está em uso |
| `<ds>/command.tsx:31-32` | título e descrição padrão do `CommandDialog` | fora: sem consumidor, fora do achado (§13.3) |
| `<ds>/date-input.tsx:51` | "Pick a date" | fora: achado próprio em `BACKLOG.md:693`, irmão do `:694` (formato de data), que pede outro trabalho |
| `hookformInputPassword.tsx:83` | placeholder "••••••••" | não é texto |

Fora do design system, o botão do menu mobile da `apps/web` (`header/index.tsx:261-266`) não tem nome
acessível nenhum. Não é string solta, é rótulo ausente; vai para o backlog (§13.3).

**antd em inglês (O3, `BACKLOG.md:942`).** O `ConfigProvider` de `packages/design-system/providers/antd-app.tsx:149-152`
não recebe `locale`, então o seletor de tamanho da `/admin/users` (`UsersListClient.tsx:193-195`, a única
tabela com `showSizeChanger`) mostra "10 / page" em pt-br e es. O mesmo pacote de idioma traduz os títulos de
"página anterior/próxima" da paginação e os textos de filtro e ordenação da `Table`.

**Foco depois da senha errada.** Medido pelo `/test` de `account-deletion-dialog-focus`
(`test/report.md`, passos 14 e 25): com `ACCOUNT_CURRENT_PASSWORD_INVALID`, o foco vai para o contêiner
`[role=alertdialog]` (`tabindex="-1"`) e a senha errada fica no campo. Quem usa teclado precisa de um Tab
para voltar. A explicação do QA: o `HookFormInputPassword` desabilita o campo durante o `handleSubmit`
(`hookformInputPassword.tsx:80`, `disabled={formState.isSubmitting}`), o navegador tira o foco do campo
desabilitado e o `FocusScope` do Radix o devolve ao contêiner. O `AccountEmailChangeDialog.tsx` usa o mesmo
componente com o mesmo `disabled` (`:143-148`) e o mesmo `Footer`, e o `onSubmit` (`:103-111`) não trata
erro, então lendo o código o defeito é o mesmo. Não foi medido no navegador.

**Campo da exclusão sem `autoComplete` nem `required`.** `<account>/(components)/AccountPrivacyPanel.tsx:168-173`
contra `AccountEmailChangeDialog.tsx:143-148`. Sem `autoComplete="current-password"`, o gerenciador de senhas
não preenche o campo; sem `required`, o rótulo não mostra o asterisco nem publica `aria-required="true"`
(`hookformInputPassword.tsx:64-71`, `:76`).

### 1.2 Objetivo e corte

Corte de MVP, a menor fatia que fecha os quatro itens:

1. Todo texto listado como "entra" na §1.1 sai do dicionário nos três idiomas.
2. A paginação e a tabela do antd falam o idioma da URL e mudam junto quando o idioma muda sem recarregar.
3. Depois de qualquer recusa da API nos dois diálogos de conta, o foco volta ao campo de senha com o texto
   selecionado.
4. O campo de senha da exclusão tem `autoComplete="current-password"` e `required`.

Fora do corte, só citados:

- E9, o `?tab=` das abas da conta (`BACKLOG.md:347`, `:692`): espera decisão sua.
- A duplicação `lacksPasswordProvider`/`requiresPrivacyChannel` (`BACKLOG.md:794`).
- O contraste de 2,74:1 do item selecionado do seletor de tamanho (`BACKLOG.md:941`). Mesma tela do O3, mas
  é decisão de cor.
- O `--destructive` do tema claro (O1 da PR #42).
- `command.tsx:31-32`, `date-input.tsx:51` e `:86`, o menu mobile da web sem nome (§13.3).
- Mostrar a recusa da senha como erro do campo (`form.setError`) em vez de só no alerta.
- Trocar o `disabled` do `HookFormInputPassword` durante o envio por `readOnly`, que evitaria a perda de foco
  em todos os formulários do repo (§12, D7).

### 1.3 Apps impactados

| App/pacote | Impacto |
|------------|---------|
| `packages/design-system` | `mode-toggle.tsx`, `sidebar.tsx`, `dialog.tsx`, `sheet.tsx`, `pagination.tsx`, `breadcrumb.tsx`, `carousel.tsx`, `spinner.tsx`, `providers/antd-app.tsx`; 2 testes novos |
| `apps/app` | `LanguageSwitcher.tsx`, `PageBreadcrumb.tsx`, `AccountPrivacyPanel.tsx`, `AccountEmailChangeDialog.tsx`; testes novos e ajustados |
| `apps/web` | `header/language-switcher.tsx`; 1 teste novo |
| `packages/internationalization` | 8 folhas novas em `<i18n>/components/ui/` + `components/index.ts` |
| `apps/api`, `packages/sdk`, demais | nenhum |

Área: comum (diálogos de conta, navbar) e admin (navbar, `/admin/users`). Modo de produto: indiferente. Plano:
indiferente.

### 1.4 Fontes

`specs/BACKLOG.md:231-233` (recomendação), `:695`, `:942`;
`docs/features/account-deletion-dialog-focus/test/report.md` §3 passos 14 e 25, §5 item 7 e §8;
`docs/features/account-deletion-dialog-focus/analyze/plan.md` §13.3. Nenhuma referência inacessível.

### 1.5 Como o design system recebe texto hoje

Não por prop. Os componentes de `packages/design-system` que têm copy importam `getDictionary` de
`@repo/internationalization/client` e leem `dictionary.components.<componente>` (`action-menu.tsx:4`, `:39-40`;
`table.tsx:5`, `:70-71`; `select/index.tsx:7`, `:84-94`; `add-button.tsx:3`, `:15`;
`hookformInputPassword.tsx:2`, `:43-44`). A dependência está declarada em `packages/design-system/package.json`
(`"@repo/internationalization": "workspace:*"`). As folhas ficam em `<i18n>/components/ui/<componente>.ts`,
uma por componente, e sobem por `<i18n>/components/index.ts` até `global.ts`. Copy de app compartilhada pelas
duas apps também mora em `components.*` (`components.footer.back`, lido pelo `Container.tsx:85` da
`apps/app`; `components.header.*`, lido pela web).

Este plano segue esse padrão. A exceção é o `AntdAppProvider`, que usa `useDictionary()` pela regra de
`apps/app/CLAUDE.md:47` (componente client acima do `[locale]`), com o precedente de
`packages/auth/provider.tsx:134`.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Os códigos que os diálogos recebem já existem e já estão em `apiErrors`.

## 5. Front-end

### 5.1 Design system

| Arquivo | Mudança |
|---------|---------|
| `<ds>/mode-toggle.tsx` | a lista `themes` vira valores (`light`/`dark`/`system`); os rótulos saem de `components.modeToggle.<valor>`; o `sr-only` de `:39` sai de `components.modeToggle.trigger` |
| `<ds>/sidebar.tsx` | `SidebarTrigger` (`:299`) e `SidebarRail` (`:311`, `:314`) leem `components.sidebar.toggle`; o cabeçalho do `Sheet` mobile (`:221-222`) lê `mobileTitle` e `mobileDescription` |
| `<ds>/dialog.tsx` | `:75` e `:116` leem `components.dialog.close` |
| `<ds>/sheet.tsx` | `:79` lê `components.dialog.close` (mesma palavra, uma chave só) |
| `<ds>/pagination.tsx` | ganha `"use client"`; `:15`, `:74`, `:80`, `:91`, `:96`, `:114` leem `components.pagination.*` |
| `<ds>/breadcrumb.tsx` | ganha `"use client"`; `:8` e `:101` leem `components.breadcrumb.*` |
| `<ds>/carousel.tsx` | `:209` e `:239` leem `components.carousel.*` (o arquivo já é client) |
| `<ds>/spinner.tsx` | ganha `"use client"`; `aria-label` padrão de `components.spinner.loading`, ainda antes do `{...props}`, para quem passar `aria-label` ou `aria-hidden` continuar mandando |
| `packages/design-system/providers/antd-app.tsx` | exporta `antdLocales` (`Record<Locale, …>`) e passa `locale={antdLocales[locale]}` ao `ConfigProvider` |

O `Button` usa `<Spinner aria-hidden="true" />` (`<ds>/button.tsx:75`). O rótulo não chega ao leitor de tela
nesse caso, mas o `Spinner` passa a consultar o dicionário toda vez que um botão entra em `loading` (ver risco
R2, §12).

### 5.2 `apps/app`

| Arquivo | Mudança |
|---------|---------|
| `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` | `sr-only` de `components.languageSwitcher.trigger` |
| `apps/app/shared/components/ui/PageBreadcrumb.tsx:28-30` | ganha `"use client"`; `href={withLocalePath(locale, "/")}` e rótulo `dictionary.apps.app.pages.common.routes.home` (já existe: "Início"/"Home"/"Inicio") |
| `<account>/(components)/AccountPrivacyPanel.tsx:85-89` | `mutate(values, { onError: focusPasswordAfterRefusal })` |
| `<account>/(components)/AccountPrivacyPanel.tsx:168-173` | `autoComplete="current-password"` e `required` |
| `<account>/(components)/AccountEmailChangeDialog.tsx:103-111` | o `mutate` já recebe `{ onSuccess }`; ganha `onError` com o mesmo foco |

Os nomes dos idiomas no menu ("Português", "English", "Español", `LanguageSwitcher.tsx:16-20` nas duas apps)
continuam literais: cada idioma aparece no próprio idioma, que é a convenção dos seletores de idioma.

O `onError` por chamada roda depois do `onError` do hook (`useAccountDataRights.tsx:70`,
`useAccountMutations.tsx:59`), que continua mostrando o alerta. O `isSubmitting` do RHF já voltou a `false`
quando a resposta da API chega, então o campo está habilitado e aceita o foco.

### 5.3 `apps/web`

`apps/web/app/[locale]/components/header/language-switcher.tsx:68` lê
`components.languageSwitcher.trigger`. O arquivo já é `"use client"` e o `Header` já usa `getDictionary()`
(`header/index.tsx:36`).

### 5.4 Estados

| Estado | Como produzir |
|--------|---------------|
| Spinner com rótulo | `Container` com `loading` (abrir `/entities/edit/<id>` com rede lenta) ou `/playground`, seção "Spinner" |
| Diálogo de exclusão recusado | emulador + senha errada (`400 ACCOUNT_CURRENT_PASSWORD_INVALID`) |
| Diálogo de e-mail recusado | sem Resend no ambiente local, `503 EMAIL_NOT_CONFIGURED` vem antes da checagem da senha (`apps/api/app/(routes)/account/email/route.ts:77-82`); o foco volta ao campo da mesma forma, porque o `onError` não olha o código |
| Paginação do antd | `/admin/users` logado como admin; o seed tem 3 usuários e o seletor aparece com `showSizeChanger: true` |

## 6. i18n

Oito folhas novas em `<i18n>/components/ui/`, uma por componente, como `action-menu.ts` e
`input-password.ts`. A estrutura das chaves está na §13.6. Rodar `/i18n-sync` e
`pnpm --filter @repo/internationalization test` (paridade em `__tests__/parity.test.ts`). Sem `apiErrors`.

## 7. Autorização e segurança

N/A na API. Na personificação, os dois diálogos já ficam bloqueados (`AccountPrivacyPanel.tsx:144`, `:178`;
`AccountEmailChangeDialog.tsx:153`), e nada aqui muda isso. O `autoComplete="current-password"` só deixa o
gerenciador de senhas do navegador preencher o campo; o valor continua indo só no corpo do `POST`.

## 8. Testes

Todos em jsdom, sem emulador: nada aqui depende de Firestore, regra ou processo externo.

| # | Arquivo | Nível | O que prova |
|---|---------|-------|-------------|
| T1 | `packages/design-system/__tests__/componentCopy.test.tsx` (novo) | componente | para cada idioma (`it.each(locales)`), dentro de `LocaleProvider` com `next/navigation` mockado: nome do gatilho do `ModeToggle` e itens do menu; nome do `SidebarTrigger`; nome do botão de fechar do `DialogContent`; nome do `role="status"` do `Spinner`; `aria-label` de `Pagination`, `PaginationPrevious`, `PaginationNext`; `aria-label` do `Breadcrumb`; nomes de `CarouselPrevious`/`CarouselNext`. Esperado vem de `globalTranslations[locale].components.*`, então o literal antigo reprova em pt-br e es |
| T2 | mesmo arquivo | componente | `Spinner` com `aria-label` próprio mantém o do chamador |
| T3 | `packages/design-system/__tests__/antdLocale.test.tsx` (novo) | unidade + componente | `antdLocales` cobre os 3 idiomas de `locales`; `Table` com `pagination={{ showSizeChanger: true }}` dentro do `AntdAppProvider` mostra "10 / página" em pt-br e es e "10 / page" em en; trocar o idioma do `LocaleProvider` com `rerender` troca o texto |
| T4 | `apps/app/__tests__/accountPrivacyPanel.test.tsx` (ajuste) | componente | depois de chamar o `onError` capturado do `deleteMutateMock` (`mock.calls[0][1].onError`) dentro de `act`, `document.activeElement` é o campo e `selectionStart`/`selectionEnd` cobrem o valor |
| T5 | mesmo arquivo | componente | o campo tem `autocomplete="current-password"` e `aria-required="true"` |
| T6 | `apps/app/__tests__/accountEmailChangeDialog.test.tsx` (ajuste) | componente | com `requestEmailChangeMock` rejeitando (como o caso de `:183`), o foco termina no campo de senha com o texto selecionado |
| T7 | `apps/app/__tests__/sharedComponentCopy.test.tsx` (novo) | componente | `LanguageSwitcher` com nome traduzido por idioma; `PageBreadcrumb` com link "Início" para `/pt-br` (e "Home" para `/en`) |
| T8 | `apps/web/__tests__/languageSwitcher.test.tsx` (novo) | componente | nome traduzido do gatilho nos 3 idiomas |

Mutação a registrar no handoff: T1 sobre o `HEAD` reprova em pt-br e es; T4 e T6 reprovam sem o `onError`;
T5 reprova sem as duas props; T3 reprova sem o `locale` no `ConfigProvider`.

Mocks parciais. Oito testes da `apps/app` mockam `@repo/internationalization/client` com um dicionário
parcial (`accountTabsOverflow`, `panelErrorRequestId`, `panelNavbarControls`, `sharedFooterPendingState`,
`useEmailVerification`, `useEntityCrud`, `useFileUpload`, `usePaymentsMutations`). O
`sharedFooterPendingState.test.tsx:41` renderiza `<Footer isLoading />`, que monta um `Spinner` dentro do
`Button`; com o `Spinner` lendo `components.spinner.loading` de um mock que só tem `components.footer`, o
teste quebra com `TypeError`. A correção é completar o mock com a chave, não afrouxar o componente. O
`/develop` roda a suíte inteira da `apps/app` e completa os mocks que quebrarem.

## 9. O que o `/test` vai percorrer

App em `build && start` + emuladores com `pnpm seed`, como na rodada anterior. Três idiomas, claro e
escuro, 1280 px e 390 px. A leitura de nome acessível é pela árvore de acessibilidade do `agent-browser`
(snapshot) ou por `aria-label`/`textContent` do `sr-only`; leitor de tela real fica 🔒.

1. Navbar da `apps/app` (comum e admin): nome do gatilho de tema, itens do menu de tema, nome do botão da
   barra lateral, nome do seletor de idioma. Trocar o idioma pelo seletor, sem recarregar, e conferir que os
   nomes acompanham (pt-br → en → es).
2. A 390 px, abrir a barra lateral: o diálogo do `Sheet` tem nome "Barra lateral"/"Sidebar"/"Barra lateral"
   e a descrição traduzida.
3. Tela de login (`(unauthenticated)/layout.tsx`): gatilho de tema traduzido.
4. Preferências de cookies (banner → personalizar), nas duas apps: o botão de fechar do diálogo se chama
   "Fechar"/"Close"/"Cerrar".
5. `/playground`: `role="status"` dos spinners com "Carregando"/"Loading"/"Cargando"; `PageBreadcrumb` com
   link "Início"/"Home"/"Inicio" apontando para `/<locale>` e navegando sem 404.
6. Qualquer página com `Header` (ex.: `/entities`): `nav` do breadcrumb com o rótulo traduzido.
7. `/admin/users`: seletor de tamanho com "10 / página" (pt-br, es) e "10 / page" (en); títulos dos botões
   de página anterior/próxima traduzidos; trocar o idioma sem recarregar e conferir que o texto muda; claro,
   escuro e 390 px.
8. Landing (`apps/web`): nome do seletor de idioma e do gatilho de tema nos 3 idiomas, desktop e 390 px.
9. Diálogo de exclusão: senha errada + Enter. Esperado: foco em `input[name="currentPassword"]` e o texto
   selecionado (`selectionStart` 0, `selectionEnd` igual ao tamanho); digitar substitui a senha. O campo
   mostra o asterisco e tem `autocomplete="current-password"`. Claro, escuro, 390 px, 3 idiomas.
10. Diálogo de troca de e-mail: provocar uma recusa (o `503 EMAIL_NOT_CONFIGURED` do ambiente local serve) e
    conferir o mesmo foco e seleção no campo de senha. O caminho específico `ACCOUNT_CURRENT_PASSWORD_INVALID`
    nesse diálogo exige Resend configurado; sem ele fica 🔒 no navegador e coberto pelo T6.
11. Personificação: os dois diálogos continuam bloqueados como antes.
12. Regressão do `account-deletion-dialog-focus`: foco ao abrir, Tab preso, Esc e Cancelar devolvendo o foco,
    limpeza ao fechar. Uma passada curta basta, os 6 casos de Vitest continuam.

Pré-requisitos manuais de infra: nenhum.

## 10. Critérios de aceite

- [ ] **Controles do cabeçalho falam o idioma da página**
  Na `apps/app` e na `apps/web`, o gatilho do tema, os itens Claro/Escuro/Sistema, o seletor de idioma e o
  botão da barra lateral têm nome acessível no idioma da URL. Trocar o idioma pelo seletor, sem recarregar,
  atualiza todos eles. Os nomes dos idiomas no menu continuam no próprio idioma.

- [ ] **Diálogos, carregamento e navegação sem inglês solto**
  O botão de fechar dos diálogos (preferências de cookies, `Sheet` mobile), o `role="status"` dos spinners,
  o rótulo do `nav` do breadcrumb e os rótulos da paginação e do carrossel do design system saem do
  dicionário nos 3 idiomas. Um `aria-label` passado pelo chamador ao `Spinner` continua valendo.

- [ ] **Breadcrumb de página leva para a home do idioma atual**
  O `PageBreadcrumb` mostra "Início"/"Home"/"Inicio" e aponta para `/<locale>`. O link deixa de apontar para
  `/painel`, que não existe.

- [ ] **Paginação do antd no idioma da página**
  Na `/admin/users`, o seletor de tamanho mostra "10 / página" em pt-br e es e "10 / page" em en, e os
  títulos de página anterior/próxima seguem o idioma. A troca de idioma sem recarregar troca o texto.
  Claro, escuro e 390 px sem mudança de layout em relação ao `HEAD`.

- [ ] **Foco volta à senha depois de uma recusa na exclusão de conta**
  Com senha errada (`400 ACCOUNT_CURRENT_PASSWORD_INVALID`), o alerta aparece como antes, o diálogo fica
  aberto, o foco vai para o campo de senha e o texto digitado fica selecionado. Qualquer outra recusa da API
  (rate limit, 500) tem o mesmo efeito. O sucesso continua encerrando a sessão e indo para o login.

- [ ] **Foco volta à senha depois de uma recusa na troca de e-mail**
  Qualquer recusa da API deixa o diálogo aberto com o foco no campo de senha e o texto selecionado, inclusive
  `USERS_AUTH_EMAIL_ALREADY_IN_USE` (ver §11, P2). O sucesso continua fechando o diálogo e devolvendo o foco
  ao botão "Trocar e-mail".

- [ ] **Campo de senha da exclusão completo**
  O campo tem `autocomplete="current-password"`, mostra o asterisco de obrigatório e publica
  `aria-required="true"`. A validação de campo vazio continua a mesma ("Informe a senha.").

- [ ] **Paridade e regressão**
  A paridade de i18n passa. Os 16 casos de `accountPrivacyPanel.test.tsx` continuam verdes junto com os
  novos, e a suíte da `apps/app` passa sem afrouxar nenhum teste.

## 11. Perguntas em aberto

Todas já vêm com a opção adotada; mudar qualquer uma é barato e localizado.

| # | Pergunta | Opções | Adotada e por quê |
|---|----------|--------|-------------------|
| P1 | Depois de uma recusa, o que fazer com a senha errada no campo? | (a) focar e selecionar; (b) limpar e focar; (c) só focar | (a). `setFocus` com `shouldSelect` é nativo do RHF 7.65, a primeira tecla substitui o texto e quem usa "Mostrar senha" ainda consegue ver o erro de digitação. (b) é o que formulários renderizados no servidor costumam fazer, e custa uma linha (`form.setValue("currentPassword", "")`) |
| P2 | No diálogo de e-mail, o foco vai para a senha em qualquer erro, inclusive "e-mail já em uso"? | (a) senha em qualquer erro; (b) expor `code` no `FormattedError` (`packages/shared`) e mandar "e-mail em uso" para o campo de e-mail | (a). O app não lê `error.code` hoje: o `FormattedError` só expõe mensagem, status, `retryAfterSeconds` e `requestId` (`formattedError.ts:11-24`). (b) mexe em mais um pacote. O "e-mail em uso" só chega depois da senha conferida (`email/route.ts:117-140`), então nesse caso a senha selecionada estava certa; Shift+Tab leva ao e-mail |
| P3 | O que fazer com `command.tsx:31-32` e `date-input.tsx:51`, que têm o mesmo defeito? | (a) deixar para a próxima tarefa; (b) incluir agora | (a). O `CommandDialog` não tem consumidor, e o "Pick a date" tem achado próprio (`BACKLOG.md:693`) que anda junto do formato de data em inglês (`:694`), que pede o locale do `date-fns` |

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Motivo |
|---|---------|------------------------|--------|
| D1 | Design system lê `getDictionary()` dentro do componente | receber copy por prop dos apps | é o padrão vigente (§1.5) e não muda nenhum call site |
| D2 | `"use client"` em `spinner.tsx`, `breadcrumb.tsx`, `pagination.tsx` e `PageBreadcrumb.tsx` | deixar sem diretiva | `getDictionary` vem de um módulo `"use client"` (`client.ts:1`); chamado de um Server Component, quebra. Hoje todos os consumidores são client, então a diretiva não muda nada em runtime |
| D3 | Corrigir o `Spinner` na raiz | passar `aria-label` em `Container`, `FullScreenLoader` e playground | 3 call sites, regra da `cycle-policy` §3 |
| D4 | `useDictionary()` só no `AntdAppProvider` | `getDictionary()` também ali | o provider fica acima do `[locale]` na `apps/app` (`app/layout.tsx:79-88`) e precisa re-renderizar na troca de idioma (`apps/app/CLAUDE.md:47`) |
| D5 | `components.dialog.close` serve `dialog.tsx` e `sheet.tsx` | uma chave por arquivo | mesma palavra, mesmo papel |
| D6 | Novas folhas em `<i18n>/components/ui/`, incluindo `language-switcher.ts` para as duas apps | chave em `apps.app` e outra em `apps.web` | as duas apps usam a mesma frase; `components.footer` já é copy de app compartilhada |
| D7 | Corrigir o foco no `onError` dos dois diálogos | trocar `disabled` por `readOnly` no `HookFormInputPassword` | a troca no design system mexe em todo formulário com senha do repo e muda a semântica de "enviando"; fica registrada como alternativa de raiz |
| D8 | O `onError` não olha o código do erro | focar só em `ACCOUNT_CURRENT_PASSWORD_INVALID` | ver P2; o app não tem acesso ao código hoje |
| D9 | Incluir os textos irmãos dos arquivos do achado (`sidebar.tsx:221-222`, `dialog.tsx:116`, `pagination.tsx:15,80,96`, `breadcrumb.tsx:8`) | só as linhas citadas | mesmo arquivo, mesma correção; deixar metade de um arquivo em inglês reabriria o achado |

Riscos:

- R1. Não está medido se a troca de idioma sem recarregar re-renderiza componentes abaixo do `[locale]` que
  usam `getDictionary()`. O `action-menu.tsx` e a `table.tsx` já dependem disso; o `/test` mede (§9,
  itens 1 e 7).
- R2. Mocks parciais do dicionário quebram onde um `Spinner` é montado (§8).
- R3. `pnpm bump-ui` (`package.json:24`, `shadcn add --all --overwrite`) sobrescreve os componentes shadcn
  editados aqui e devolveria o inglês. O risco já existia para os componentes customizados antes; os testes T1
  reprovam se isso acontecer.
- R4. O import padrão de `antd/locale/pt_BR` é CommonJS com `__esModule`. Funciona no Next; no Vitest o
  `interopDefault` padrão deve resolver. O T3 confirma; se vier `{ default: … }`, usar `.default`.
- R5. Os commits intermediários não passam no typecheck sozinhos: o código do design system e dos apps
  referencia chaves que só existem no commit de i18n, que é o último pela ordem do repo. É o mesmo arranjo
  das features anteriores.

## 13. Blueprint técnico

### 13.1 Design system

```tsx
// <ds>/mode-toggle.tsx
const themeValues = ["light", "dark", "system"] as const;

export const ModeToggle = ({ triggerProps }: ModeToggleProps) => {
  const { setTheme } = useTheme();
  const { dictionary } = getDictionary();
  const modeToggleCopy = dictionary.components.modeToggle;
  // ...
  <span className="sr-only">{modeToggleCopy.trigger}</span>
  // ...
  {themeValues.map((value) => (
    <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
      {modeToggleCopy[value]}
    </DropdownMenuItem>
  ))}
};
```

```tsx
// <ds>/spinner.tsx
"use client"

import { getDictionary } from "@repo/internationalization/client"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  const { dictionary } = getDictionary()
  return (
    <Loader2Icon
      role="status"
      aria-label={dictionary.components.spinner.loading}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}
```

```diff
 // <ds>/sidebar.tsx
+import { getDictionary } from "@repo/internationalization/client"
 // dentro de Sidebar, no ramo isMobile
-            <SheetTitle>Sidebar</SheetTitle>
-            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
+            <SheetTitle>{sidebarCopy.mobileTitle}</SheetTitle>
+            <SheetDescription>{sidebarCopy.mobileDescription}</SheetDescription>
 // SidebarTrigger
-      <span className="sr-only">Toggle Sidebar</span>
+      <span className="sr-only">{sidebarCopy.toggle}</span>
 // SidebarRail
-      aria-label="Toggle Sidebar"
+      aria-label={sidebarCopy.toggle}
-      title="Toggle Sidebar"
+      title={sidebarCopy.toggle}
```

`sidebarCopy` = `getDictionary().dictionary.components.sidebar`, lido no corpo de cada função. O mesmo molde
vale para `dialog.tsx` (`components.dialog.close` em `:75` e `:116`), `sheet.tsx` (`:79`), `carousel.tsx`
(`previousSlide`, `nextSlide`), `pagination.tsx` (`label`, `previous`, `previousLabel`, `next`, `nextLabel`,
`morePages`) e `breadcrumb.tsx` (`label` em `:8`, `more` em `:101`). Em `pagination.tsx` e
`breadcrumb.tsx`, o `aria-label` fixo continua antes do `{...props}`.

```tsx
// packages/design-system/providers/antd-app.tsx
import { useDictionary } from "@repo/internationalization/client";
import type { Locale } from "@repo/internationalization/utils";
import { type ConfigProviderProps, /* ... */ } from "antd";
import enUS from "antd/locale/en_US";
import esES from "antd/locale/es_ES";
import ptBR from "antd/locale/pt_BR";

export const antdLocales = {
    "pt-br": ptBR,
    en: enUS,
    es: esES,
} satisfies Record<Locale, ConfigProviderProps["locale"]>;

export function AntdAppProvider({ children }: { children: ReactNode }) {
    const { forcedTheme, resolvedTheme } = useTheme();
    const { locale } = useDictionary();
    const activeTheme = forcedTheme ?? resolvedTheme;
    return (
        <ConfigProvider
            locale={antdLocales[locale]}
            theme={antdThemes[activeTheme === "dark" ? "dark" : "light"]}
            wave={{ disabled: false }}
        >
            {children}
        </ConfigProvider>
    );
}
```

Valores medidos no antd instalado: `pt_BR.Pagination.items_per_page` = `"/ página"`, `es_ES` = `"/ página"`,
`en_US` = `"/ page"`; `pt_BR.Popconfirm.cancelText` = `"Cancelar"` (o `ActionsMenu` passa os próprios textos
e não muda).

### 13.2 `apps/app`

```diff
 // <account>/(components)/AccountPrivacyPanel.tsx
+    const focusPasswordAfterRefusal = () => {
+        form.setFocus("currentPassword", { shouldSelect: true });
+    };
+
     const onSubmit = (values: AccountDeletionFormValues) => {
-        deleteAccountMutation.mutate({
-            currentPassword: values.currentPassword,
-        });
+        deleteAccountMutation.mutate(
+            { currentPassword: values.currentPassword },
+            { onError: focusPasswordAfterRefusal }
+        );
     };
 ...
                                             <HookFormInputPassword
+                                                autoComplete="current-password"
                                                 label={
                                                     deleteCopy.currentPassword
                                                 }
                                                 name="currentPassword"
+                                                required
                                             />
```

```diff
 // <account>/(components)/AccountEmailChangeDialog.tsx
         requestEmailChangeMutation.mutate(
             {
                 newEmail: values.newEmail.trim(),
                 currentPassword: values.currentPassword,
             },
-            { onSuccess: () => handleOpenChange(false) }
+            {
+                onSuccess: () => handleOpenChange(false),
+                onError: () =>
+                    form.setFocus("currentPassword", { shouldSelect: true }),
+            }
         );
```

Nenhum comentário novo: o nome `focusPasswordAfterRefusal` e o `onError` dizem o porquê. Se o `/develop`
achar que o foco ainda se perde (o `/test` anterior mediu, este código não), o comentário permitido seria
sobre a regra do navegador, sem citar o fluxo.

```diff
 // apps/app/shared/components/ui/PageBreadcrumb.tsx
+"use client";
+
+import { getDictionary } from "@repo/internationalization/client";
 import Link from "next/link";
 import type React from "react";
+import { withLocalePath } from "@/shared/lib/localePath";
 ...
-const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ ... }) => (
+const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ ... }) => {
+    const { dictionary, locale } = getDictionary();
+    const homeLabel = dictionary.apps.app.pages.common.routes.home;
+    return (
 ...
-                            href="/painel"
+                            href={withLocalePath(locale, "/")}
                         >
-                            Início
+                            {homeLabel}
```

```diff
 // apps/app/shared/components/ui/LanguageSwitcher.tsx  (e apps/web/.../language-switcher.tsx:68)
+import { getDictionary } from "@repo/internationalization/client";
 ...
+    const { dictionary } = getDictionary();
+    const languageSwitcherCopy = dictionary.components.languageSwitcher;
 ...
-                    <span className="sr-only">Switch language</span>
+                    <span className="sr-only">{languageSwitcherCopy.trigger}</span>
```

### 13.3 Achados para o backlog (o `/spec --sync` registra)

- `<ds>/command.tsx:31-32`: título e descrição padrão do `CommandDialog` em inglês, sem consumidor.
- O botão do menu mobile da `apps/web` (`header/index.tsx:261-266`) não tem nome acessível; o leitor de tela
  anuncia só "botão".
- O `HookFormInputPassword` desabilita o campo durante o `handleSubmit` (`hookformInputPassword.tsx:80`), o
  que tira o foco do campo em todo formulário com senha. Esta tarefa corrige o efeito nos dois diálogos de
  conta; a raiz fica registrada (D7).
- Se P2 mudar para (b), o `FormattedError` ganha `code`.

### 13.4 Árvore de arquivos

```
packages/design-system/
  components/ui/mode-toggle.tsx         (edit)
  components/ui/sidebar.tsx             (edit)
  components/ui/dialog.tsx              (edit)
  components/ui/sheet.tsx               (edit)
  components/ui/pagination.tsx          (edit, "use client")
  components/ui/breadcrumb.tsx          (edit, "use client")
  components/ui/carousel.tsx            (edit)
  components/ui/spinner.tsx             (edit, "use client")
  providers/antd-app.tsx                (edit)
  __tests__/componentCopy.test.tsx      (novo)
  __tests__/antdLocale.test.tsx         (novo)
apps/app/
  shared/components/ui/LanguageSwitcher.tsx   (edit)
  shared/components/ui/PageBreadcrumb.tsx     (edit, "use client")
  <account>/(components)/AccountPrivacyPanel.tsx       (edit; já tem o diff da tarefa anterior)
  <account>/(components)/AccountEmailChangeDialog.tsx   (edit)
  __tests__/accountPrivacyPanel.test.tsx      (edit; já tem o diff da tarefa anterior)
  __tests__/accountEmailChangeDialog.test.tsx (edit)
  __tests__/sharedComponentCopy.test.tsx      (novo)
  __tests__/<mocks parciais que quebrarem>    (edit, ver §8)
apps/web/
  app/[locale]/components/header/language-switcher.tsx  (edit)
  __tests__/languageSwitcher.test.tsx         (novo)
packages/internationalization/translations/components/
  index.ts                                    (edit)
  ui/mode-toggle.ts, ui/sidebar.ts, ui/dialog.ts, ui/pagination.ts,
  ui/breadcrumb.ts, ui/carousel.ts, ui/spinner.ts, ui/language-switcher.ts   (novos)
```

### 13.5 Ordem de implementação

design system → `apps/app` → `apps/web` → `@repo/internationalization`. Na prática o `/develop` escreve as
folhas de i18n primeiro para o typecheck acompanhar, mas os commits seguem a ordem do repo (R5).

### 13.6 Chaves de i18n

Mesma estrutura nos três idiomas. Valores propostos:

| Caminho | pt-br | en | es |
|---------|-------|----|----|
| `components.modeToggle.trigger` | Alternar tema | Toggle theme | Cambiar tema |
| `components.modeToggle.light` | Claro | Light | Claro |
| `components.modeToggle.dark` | Escuro | Dark | Oscuro |
| `components.modeToggle.system` | Sistema | System | Sistema |
| `components.sidebar.toggle` | Alternar barra lateral | Toggle sidebar | Alternar barra lateral |
| `components.sidebar.mobileTitle` | Barra lateral | Sidebar | Barra lateral |
| `components.sidebar.mobileDescription` | Mostra a navegação lateral. | Shows the side navigation. | Muestra la navegación lateral. |
| `components.dialog.close` | Fechar | Close | Cerrar |
| `components.pagination.label` | Paginação | Pagination | Paginación |
| `components.pagination.previous` | Anterior | Previous | Anterior |
| `components.pagination.previousLabel` | Ir para a página anterior | Go to previous page | Ir a la página anterior |
| `components.pagination.next` | Próxima | Next | Siguiente |
| `components.pagination.nextLabel` | Ir para a próxima página | Go to next page | Ir a la página siguiente |
| `components.pagination.morePages` | Mais páginas | More pages | Más páginas |
| `components.breadcrumb.label` | Trilha de navegação | Breadcrumb | Ruta de navegación |
| `components.breadcrumb.more` | Mais | More | Más |
| `components.carousel.previousSlide` | Slide anterior | Previous slide | Diapositiva anterior |
| `components.carousel.nextSlide` | Próximo slide | Next slide | Diapositiva siguiente |
| `components.spinner.loading` | Carregando | Loading | Cargando |
| `components.languageSwitcher.trigger` | Trocar idioma | Switch language | Cambiar idioma |

O "Claro/Escuro/Sistema" repete `apps.app.pages.common.account.preferences.themeOptions`
(`account.ts:119-122`) de propósito: o design system não deve ler chave de uma app.

### 13.7 Env e infra

Nenhuma variável nova. Nenhum pré-requisito manual de infra. Nenhuma dependência nova.

### 13.8 Plano de commits (para o `/review`)

Vai no mesmo PR que `account-deletion-dialog-focus`. A branch é decisão do `revisor-codigo`; a proposta
anterior (`app/fix/account-deletion-dialog-focus`) não descreve mais o escopo. Antes do primeiro commit,
`git diff --cached --stat` tem de sair vazio.

| # | Commit | Arquivos |
|---|--------|----------|
| 1 | `fix(design-system): translate the accessible labels of shared components` | os 8 componentes de `<ds>` + `componentCopy.test.tsx` |
| 2 | `fix(design-system): give antd the active locale` | `providers/antd-app.tsx` + `antdLocale.test.tsx` |
| 3 | `fix(app): keep focus on the password in the account deletion dialog` | `AccountPrivacyPanel.tsx` + `accountPrivacyPanel.test.tsx`. Commit misto: leva também o foco ao abrir e a limpeza ao fechar de `account-deletion-dialog-focus`. Separar exigiria `git add -p`, que é interativo e não roda neste ambiente; a mensagem cita as duas mudanças |
| 4 | `fix(app): return focus to the password after the email change is refused` | `AccountEmailChangeDialog.tsx` + `accountEmailChangeDialog.test.tsx` |
| 5 | `fix(app): translate the language switcher and page breadcrumb` | `LanguageSwitcher.tsx`, `PageBreadcrumb.tsx`, `sharedComponentCopy.test.tsx` |
| 6 | `test(app): complete the partial dictionary mocks` | só se algum mock quebrar (§8) |
| 7 | `fix(web): translate the language switcher label` | `language-switcher.tsx` + `languageSwitcher.test.tsx` |
| 8 | `feat(internationalization): add copy for shared component labels` | `<i18n>/components/index.ts` + 8 folhas |
| 9 | `docs(specs): audit backlog after PR #42` | `specs/BACKLOG.md` (já estava no working tree) |
| 10 | `docs(features): account-deletion-dialog-focus` | `docs/features/account-deletion-dialog-focus/` |
| 11 | `docs(features): ui-strings-and-password-focus` | `docs/features/ui-strings-and-password-focus/` |

Os prints em `docs/features/*/test/e2e/` são ignorados pelo `.gitignore`. Antes dos commits 10 e 11, varrer
os artefatos por senha, token e e-mail real.
