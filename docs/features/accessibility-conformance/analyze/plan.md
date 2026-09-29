# Plano: acessibilidade com allowlist do axe zerada e testes no design system

- **Spec:** [`spec.md`](../spec.md) (`approved`; passa a `in-progress` com este plano)
- **Card:** nenhum
- **Rodada:** `/cycle` autônomo. Nada foi perguntado. As decisões tomadas sem perguntar estão em §13, e as perguntas em §14 já trazem a opção adotada.
- **Branch:** a atual é `cycle-spec-pipeline`, fora do padrão. Quem nomeia e cria é o `revisor-codigo`.

---

## 1. Contexto

### 1.1 Problema

A suíte E2E roda o axe em toda PR e tolera sete grupos de violação `critical`/`serious` pela allowlist
(`apps/e2e/a11y/allowlist.ts:23-65`, aplicados por rota em `:83-107`). Fora do alcance do axe, todo
formulário do repositório esconde o erro de campo do leitor de tela, o botão em carregamento perde o nome e
o texto de erro do tema escuro fica em 1,97:1. Os defeitos moram no design system ou nos layouts
compartilhados, e o `@repo/design-system` não tem task de `test` (`packages/design-system/package.json:5-8`),
então nenhum conserto fica protegido.

### 1.2 Objetivo

`pnpm e2e` passa com `A11Y_ALLOWLIST` vazia. Um campo com erro publica `aria-invalid="true"` e aponta para a
mensagem. Reverter qualquer conserto do design system quebra um teste do próprio pacote.

### 1.3 Corte de MVP (da spec, sem mudança)

1. Todo `HookForm*` publica `aria-invalid` e liga o campo à mensagem quando há erro, e só então.
2. Nenhum controle sem nome nas rotas cobertas: botão de mostrar senha, `Select` do navbar, `Switch` das
   linhas, gatilho do `ActionsMenu` (focável pelo teclado) e `Button` em carregamento. Nomes do dicionário,
   nos 3 idiomas.
3. Páginas do painel com `<title>` traduzido.
4. Contraste AA como texto nas mensagens de erro do escuro, nas iniciais do avatar e nos cards da landing no
   claro, sem quebrar o fundo do item `danger` do antd.
5. Allowlist vazia.
6. `@repo/design-system` ganha task `test` no turbo, com testes de componente que quebram se os consertos
   regredirem.

Entra também, por estar no mesmo defeito e na mesma superfície: o `alt=""` do avatar do menu de perfil
(`apps/app/shared/components/ui/ProfileDropdown.tsx:45`, registrado na spec) e duas ocorrências a mais do
padrão "interativo dentro de interativo" que a spec pede para incluir se aparecerem (§5.5).

### 1.4 Fora do corte (continua fora)

- Declaração pública de acessibilidade e o símbolo do art. 63 da LBI (conteúdo do fork).
- Auditoria manual completa com leitor de tela e teclado.
- Rodar o axe em `/en` e `/es`.
- `DateInput` com `"Pick a date"` literal e formatação em inglês.
- `<html lang>` vindo do cookie.
- Nomes acessíveis literais em inglês nos primitivos shadcn e nos seletores de idioma (achado novo, §12.2).
  É a mesma classe de defeito do `"Pick a date"`: o controle tem nome, só que não traduzido.
- `<title>` descritivo por página (§14, pergunta 2).

### 1.5 Apps impactados

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Nenhum. |
| `packages/design-system` | `form.tsx` não muda; os 6 `HookForm*` que usam `Controller` passam a `FormField`; `Select`, `DateInput` e `ImageUploadInput` repassam `aria-describedby`; `Button`, `ActionsMenu`, `HookFormInputPassword`; tokens em `globals.css`; override do `Dropdown` no `antd-app.tsx`; task `test` nova com Vitest. |
| `apps/app` | `generateMetadata` nos 2 layouts do painel; `aria-label` no `Select` de ambiente; `aria-label` no `Switch` das linhas de entidades e usuários; `alt=""` no avatar; `Link` fora de `Button` no `NotFoundPage`. |
| `apps/web` | `Link` com `buttonVariants` no hero, CTA, FAQ e preços; `PopoverTrigger asChild` no contato. |
| `apps/e2e` | Allowlist esvaziada; gatilho do menu por papel e nome; comentário falso do `passwordInput` removido. |
| `packages/internationalization` | 4 grupos de chaves novos (§10.7). |
| Infra/env | Nenhuma variável, nenhum serviço. |

Área do painel: comum e admin. Modo de produto: indiferente (`subscription` e `simple` usam os mesmos
componentes). Não depende de assinatura.

### 1.6 Fontes

A spec, o `BACKLOG.md` (achados das linhas 539-541, 552-553, 591, 650 e 662) e o código. Nenhum link externo.

---

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta muda.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API (`apps/api`)

N/A. Nenhuma rota, guard ou `error.code` novo.

---

## 5. Onde mora cada conserto (análise dos 7 grupos e dos defeitos fora do axe)

### 5.1 Erro de campo nos `HookForm*` (a correção na raiz)

O `useFormField` (`packages/design-system/components/ui/form.tsx:42-63`) acha o erro pelo nome do campo que o
`FormFieldContext` publica. Esse contexto só existe dentro do `FormField` (`form.tsx:31-40`). Seis dos oito
`HookForm*` renderizam `<Controller>` direto (`hookformInput.tsx:44`, `hookformInputPassword.tsx:46`,
`hookformSelect.tsx:59`, `hookformDateInput.tsx:44`, `hookformImageUpload.tsx:47`, `hookformRadioGroup.tsx:46`,
`hookformTextarea.tsx:48`). Sem contexto, `getFieldState(undefined)` devolve sem erro, e o `FormControl`
(`form.tsx:109-126`) publica `aria-invalid="false"` e um `aria-describedby` sem o id da mensagem. O
`hookformSwitch.tsx:49` já usa `FormField` e sai certo.

A raiz é uma só: **trocar `Controller` por `FormField`** nos sete arquivos. `FormField` repassa todas as props ao
`Controller` (`form.tsx:37-38`), então `control`, `name`, `render` e `controllerProps` continuam iguais. Com isso
o `FormControl` passa a ler o erro certo e o `FormMessage` já tem o id que o `aria-describedby` referencia
(`form.tsx:155-158`).

Isso resolve sozinho `HookFormInput`. Os outros precisam que o atributo chegue ao elemento focável:

| Componente | Estado hoje (código) | O que falta além do `FormField` |
|------------|----------------------|---------------------------------|
| `HookFormInput` | `FormControl` em volta do `Input` (`:63-74`) | nada |
| `HookFormInputPassword` | `FormControl` em volta de um `<div className="relative">` (`:65-88`): o `id`, o `aria-invalid` e o `aria-describedby` caem no `div`, e o `<label htmlFor>` aponta para ele. O input fica sem rótulo; o E2E já contorna isso buscando por `name` (`apps/e2e/support/signIn.ts:9-12`) | mover o `FormControl` para envolver só o `Input` |
| `HookFormSelect` | `FormControl` em volta do `Select` (`:80-106`), mas `Select` só lê props nomeadas (`ui/select/index.tsx:35-52`) e descarta `aria-invalid`/`aria-describedby` | `Select` aceitar e repassar os dois ao `SelectTrigger` (`:272-280`) |
| `HookFormDateInput` | sem `FormControl`; `DateInput` já põe `aria-invalid` no botão (`ui/date-input.tsx:67`), falta o vínculo com a mensagem | envolver em `FormControl`; `DateInput` aceitar `aria-describedby` e repassar ao botão |
| `HookFormTextarea` | sem `FormControl`; `TextareaInput` já põe `aria-invalid` (`ui/textarea-input.tsx:35`) e espalha o resto no `Textarea` (`:40`) | envolver em `FormControl` (a prop chega pelo spread) |
| `HookFormRadioGroup` | sem `FormControl`; `aria-invalid` só em cada item (`ui/radio-group-input.tsx:65`); o resto vai para a raiz do `RadioGroup` (`:54`) | envolver em `FormControl`: `aria-invalid` e `aria-describedby` caem no `radiogroup` |
| `HookFormImageUpload` | sem `FormControl`; o `input[type=file]` tem `aria-invalid` e `aria-describedby={hintId}` fixos (`ui/image-upload-input.tsx:151-152`); o erro local de arquivo (`:222-224`) não tem id | envolver em `FormControl`; `ImageUploadInput` aceitar `aria-describedby`, juntar com o `hintId` e com o id do `fileError` quando houver |
| `HookFormSwitch` | certo | nada |

A spec diz que os quatro sem `FormControl` saem "sem `aria-invalid`". O código mostra que eles publicam
`aria-invalid` a partir da prop `error`; o que falta nos quatro é ligar o campo à mensagem. O conserto é o
mesmo, só a descrição da spec estava imprecisa.

Por que `FormControl` em vez de passar o id na mão: o id da mensagem nasce do `useId` do `FormItem`
(`form.tsx:73-85`), dentro do `render`, onde não dá para chamar hook. O `Slot` do `FormControl` é o canal que
o próprio `form.tsx` já oferece, e o `AGENTS.md` prescreve esse desenho para o `HookFormSwitch`. Nos compostos,
o `id` explícito do filho vence o do `Slot` (o `Slot` do Radix aplica as props do filho por cima), então o
`htmlFor` interno de `DateInput`/`TextareaInput`/`ImageUploadInput` continua certo.

Efeito colateral a conferir: o `TextareaInput` espalha as props depois do `data-slot="textarea-input"`
(`textarea-input.tsx:37-40`), então o `data-slot` vira `"form-control"`. Nenhum seletor do repo usa
`textarea-input` (conferido por `grep`). O `desenvolvedor` pode mover o `data-slot` para depois do spread;
fica a critério dele.

### 5.2 Botão de mostrar senha (grupo `PASSWORD_TOGGLE`, `allowlist.ts:23-27`)

`hookformInputPassword.tsx:78-87` renderiza o `Button` do `@base-ui/react` só com o ícone. Ganha
`aria-label` que alterna entre "Mostrar senha" e "Ocultar senha", lido de `dictionary.components.inputPassword`.
O design system já lê o próprio subárvore `components.*` do dicionário via `getDictionary()` de
`@repo/internationalization/client`: `action-menu.tsx:38-39`, `add-button.tsx:23`, `select/index.tsx:88-90`,
`table.tsx:71`, `cookie-consent.tsx:108`. É o padrão a seguir; nada de dicionário de app entra no pacote.

### 5.3 `Button` em carregamento e o `Spinner`

`button.tsx:72-79` troca o conteúdo inteiro pelo `Spinner` quando `loading`, e o `Spinner` tem
`aria-label="Loading"` literal (`spinner.tsx:8-9`). O botão perde o nome traduzido que tinha.

Conserto sem texto novo: durante o carregamento o `Button` mantém os filhos na árvore de acessibilidade num
`<span className="sr-only">`, marca o `Spinner` como `aria-hidden="true"` e publica `aria-busy="true"`. O nome
continua sendo o rótulo que o app já traduziu ("Assinar", "Entrar"). O visual fica idêntico ao de hoje.

Assim o design system não precisa de chave de "carregando". O `Spinner` avulso (`Container.tsx:28`,
`FullScreenLoader.tsx:17`) continua com o literal em inglês: é defeito de i18n, mesma classe do `"Pick a
date"`, e vai para os achados (§12.2).

### 5.4 Gatilho do `ActionsMenu`

`action-menu.tsx:103-110` é um `<div>` sem papel nem nome. Vira `<button type="button">` com
`aria-label={translation.trigger}` (chave nova `components.actionMenu.trigger`), as mesmas classes e um anel de
foco (`focus-visible:ring-[3px] focus-visible:ring-ring/50`, como o `buttonVariants`, `button.tsx:8`). O
`Dropdown` do antd clona o filho e injeta o `onClick`, então um botão nativo funciona igual.

Hipótese a medir no `/test`: acrescentar `autoFocus` ao `Dropdown` para que o foco entre no menu ao abrir pelo
teclado. Se não funcionar, sai (§14, pergunta 4).

### 5.5 `Link` dentro de `Button` na web (grupo `WEB_BUTTON_WRAPPING_LINK`, `allowlist.ts:29-33`)

O `Button` do design system não tem `asChild` (`button.tsx:42-47`). O precedente é o conserto do header na
PR #28: `Link` com `className={buttonVariants(...)}` (`apps/web/app/[locale]/components/header/index.tsx:237-251`).
Ocorrências achadas por varredura de `<Button>` contendo `<Link>`/`<a>`:

| Arquivo | Linhas |
|---------|--------|
| `apps/web/app/[locale]/(home)/components/hero.tsx` | 27-36, 37-52 |
| `apps/web/app/[locale]/(home)/components/cta.tsx` | 23-31, 32-43 |
| `apps/web/app/[locale]/(home)/components/faq.tsx` | 36-47 |
| `apps/web/app/[locale]/pricing/page.tsx` | 85-96, 127-134, 165-176 |
| `apps/app/shared/components/ui/NotFoundPage.tsx` | 49-56 (a mais: fora das rotas cobertas, mesmo padrão) |

E uma ocorrência do mesmo defeito com outro formato: `apps/web/app/[locale]/contact/components/contact-form-client.tsx:79-80`
tem `<PopoverTrigger>` (que já é um botão) em volta de um `Button`. Conserto: `<PopoverTrigger asChild>`.

O ícone que hoje vai na prop `icon` passa a ser filho do `Link`, antes do texto (mesma ordem de `button.tsx:76-77`).

A rota `web:/pt-br/sign-up` também está na exceção (`allowlist.ts:88-91`), mas a página de cadastro não tem
`Link` em `Button` (`sign-up-form-client.tsx:125-157`) e o header foi consertado na PR #28. A exceção
provavelmente já não casa nada (achado do BACKLOG, linha 552). Sai junto; o `pnpm e2e` confirma.

### 5.6 `<title>` do painel (grupo `UNTITLED_PANEL_PAGE`, `allowlist.ts:35-39`)

Nenhum layout ou página do painel declara metadata; os únicos `generateMetadata` do `apps/app` estão nas
páginas não autenticadas e no onboarding (`(authenticated)/onboarding/page.tsx:22-29`, com
`getTranslations(resolveLocale(locale))` + `createMetadata`). Quatro das onze páginas do painel são
`"use client"` (`users/create`, `users/edit/[id]`, `entities/create`, `playground`) e não podem exportar
`generateMetadata`.

Conserto: `generateMetadata` nos dois layouts, `(common)/layout.tsx` e `(admin)/admin/layout.tsx`, com
`title: "<área> | <marca>"`. A área reusa `navbar.environmentCommon` ("Painel do usuário") e
`navbar.environmentAdmin` ("Administração"), que já existem nos 3 idiomas
(`translations/apps/app/pages/navbar/index.ts:3-22`). A marca vem de `getBrand().name`
(`@repo/next-config/brand`, já usado em `(unauthenticated)/layout.tsx:16`). O formato `"X | marca"` é o mesmo
do `createMetadata` (`packages/seo/metadata.ts`).

Sem `title.template`: uma página filha que usasse `createMetadata` já montaria `"X | marca"` e o template
duplicaria a marca. Página que quiser título próprio sobrescreve o do layout.

### 5.7 `Switch` das linhas (grupo `UNNAMED_ROW_SWITCH`, `allowlist.ts:41-45`)

`EntitiesListClient.tsx:99-114` e `UsersListClient.tsx:106-121` renderizam o `Switch` sem nome. O `Switch`
espalha as props na raiz Radix (`switch.tsx:33-34`), então basta `aria-label`. O rótulo nomeia a linha, com
interpolação no padrão do repo (`"{date}"` + `.replace`, ex. `AccountBillingPanel.tsx:143`):

- entidades: `list.enabledToggle` = "Entidade ativa: {name}", com `record.name`;
- usuários: `list.statusToggle` = "Usuário ativo: {name}", com `record.displayName ?? record.email`.

### 5.8 `Select` do navbar (grupo `UNNAMED_SELECT_TRIGGER`, `allowlist.ts:47-51`)

O `Select` já calcula `aria-label={ariaLabel ?? (label ? undefined : placeholder)}` (`select/index.tsx:273`).
O seletor de ambiente não passa `label`, `placeholder` nem `aria-label` (`PanelNavbarControls.tsx:217-224` no
mobile e `:262-268` no desktop), então sai sem nome. O de usuário personificado passa `placeholder` e ganha nome
pelo fallback. Conserto: `aria-label={navbarCopy.environmentLabel}` nos dois seletores de ambiente, chave que
já existe.

A allowlist cita também "o filtro de usuários do admin", mas a tela `admin/users` não tem `Select`
(`UsersListClient.tsx` não importa nenhum; o `Table` do design system não renderiza filtro). A rota entra na
exceção pelo navbar.

### 5.9 Contraste das iniciais do avatar e dos cards da landing (grupos `AVATAR_FALLBACK_CONTRAST` e `WEB_MUTED_ON_MUTED_CONTRAST`)

Os dois são o mesmo par de tokens: `text-muted-foreground` sobre `bg-muted` no claro. `--muted-foreground`
`oklch(0.556 0 0)` sobre `--muted` `oklch(0.97 0 0)` (`globals.css:20-21`) dá **4,34:1** (calculado por
oklch → sRGB → luminância WCAG). O par aparece no `AvatarFallback` (`avatar.tsx:47`), no `AvatarGroupCount`
(`avatar.tsx:92`), nos cards de `features.tsx:22,39,57,74`, em `testimonials-client.tsx:51` e em `cta.tsx:13`.

Conserto na raiz: `--muted-foreground` do claro de `0.556` para `0.54`, que dá **4,64:1** sobre `--muted` e
acima disso sobre `--background`, `--accent`, `--secondary` e `--sidebar`. Uma linha, os dois grupos saem, e todo
outro `muted` sobre `muted` do pacote melhora junto. O escuro já passa (5,83:1).

### 5.10 `--destructive` do escuro e o `danger` do antd

Medido: `--destructive` do escuro `oklch(0.396 0.141 25.723)` (`globals.css:63`) sobre `--background`
`oklch(0.145 0 0)` dá **1,97:1** como texto. O token é usado como texto em 15 arquivos (`text-destructive`) e
como fundo em três lugares: variante `destructive` do `Button` e do `Badge` (`dark:bg-destructive/60` com
texto branco, `button.tsx:15`, `badge.tsx:16`) e, pelo antd, o hover do item `danger` do `Dropdown`.

O hover do antd está no código instalado: `antd@5.29.3/es/dropdown/style/status.js:12-16` pinta o item
`danger` com `color: colorError` e, no hover, `color: colorTextLightSolid` (branco) sobre
`backgroundColor: colorError`. Os tokens `Menu.dangerItem*` de `antd-app.tsx:66-70` não alcançam o `Dropdown`,
que tem estilo próprio. Um valor só não serve aos dois papéis ali: como texto sobre o popover escuro ele
precisa ser claro, e com branco por cima precisa ser escuro.

Proposta (separar o texto do fundo onde o conflito existe):

1. `--destructive` do escuro passa a `oklch(0.704 0.191 22.216)`, o valor atual do shadcn upstream. Texto de
   erro sobre `--background`: **6,84:1**; sobre `--accent`/`--muted` (hover dos menus): **5,23:1**. Todos os
   15 usos de texto se consertam sem trocar classe.
2. No `antd-app.tsx`, `components.Dropdown.colorTextLightSolid: "var(--color-background)"`. O antd v5 aceita
   token global sobrescrito por componente, e no `Dropdown` esse token só aparece no hover do `danger`
   (`status.js:15`). No claro o texto continua branco sobre o vermelho (4,76:1). No escuro vira quase preto
   sobre o vermelho claro (**6,84:1**), quando branco daria 2,89:1.
3. Fundo sólido do `Button`/`Badge` destrutivos no escuro: branco sobre 60% do novo vermelho sobre o fundo
   escuro dá cerca de **6,5:1** pelo meu cálculo de mistura (aproximado; o `/test` mede).

Alternativa descartada em §13, decisão 5.

### 5.11 Avatar do menu de perfil sem `alt`

`ProfileDropdown.tsx:45`: `<AvatarImage src={avatarSrc} />`. O gatilho já tem nome (`:42`), então `alt=""`,
no mesmo molde de `Sidebar.tsx:79-82` e `(unauthenticated)/layout.tsx:24`.

---

## 6. Front-end: resumo por arquivo

Nenhuma rota, hook, `queryKey`, formulário ou tabela nova. Todas as mudanças são atributos, classes e
metadata em arquivos existentes; a lista completa está em §10.

## 7. Autorização e segurança

Sem impacto de autorização. Sob **impersonação**, o navbar mostra os dois seletores (`ADMIN_NAVBAR_ROUTES`,
`allowlist.ts:79-83`) e o `Switch` de entidades fica `disabled` (`EntitiesListClient.tsx:101-102`); o nome
novo continua presente com o controle desabilitado. O título do layout comum vale também para o admin
personificando.

---

## 8. Testes

### 8.1 Task `test` nova no `@repo/design-system`

Espelha o `apps/app` (`apps/app/vitest.config.mts`: `jsdom` + `@vitejs/plugin-react`) e os pacotes que já têm
`test` (`"test": "NODE_ENV=test vitest run"`, ex. `packages/auth/package.json:36`). O `vitest.config.mts` da
raiz (`projects: ["packages/*/vitest.config.mts", …]`) pega o config novo sozinho, então o `pnpm coverage`
passa a medir o pacote. O `turbo.json` não muda: a task `test` já existe e roda em todo workspace que declara
o script.

Dependências de desenvolvimento, todas **já presentes no lockfile** (nenhum pacote novo baixado, só arestas
novas no `importers` do `pnpm-lock.yaml`):

| Pacote | Versão | De onde vem hoje |
|--------|--------|------------------|
| `vitest` | `^4.0.3` | raiz, `apps/app`, vários pacotes |
| `jsdom` | `^27.0.1` | `apps/app/package.json:49` |
| `@testing-library/react` | `^16.3.0` | `apps/app/package.json:43` |
| `@testing-library/dom` | `^10.4.1` | `apps/app/package.json:42` |
| `@vitejs/plugin-react` | `^5.1.0` | `apps/app/package.json:47` |
| `react-dom` | `19.2.0` | `packages/internationalization` (devDependency) |
| `@types/react-dom` | `19.2.2` | `packages/internationalization` (devDependency) |

Sem lib de axe (recomendação da spec) e sem `@testing-library/user-event` (não está no workspace); os testes
usam `fireEvent`, como o `apps/app` já faz (`signUpFormSubmitLock.test.tsx:115`). Sem `jest-dom`: asserção
com `getAttribute`.

O alias `@repo/design-system` → a própria pasta vai no config, porque o pacote importa a si mesmo pelo nome
(`@repo/design-system/lib/utils`) e o `tsconfig.json` resolve isso por `paths`, que o Vitest não lê. O
dicionário real é usado sem mock: no `jsdom`, `getDictionary()` cai no locale padrão (`pt-br`).

### 8.2 Testes a criar (todos de componente, no `jsdom`, nível mais barato que prova o comportamento)

| Arquivo | O que prova | Regressão que pega |
|---------|-------------|--------------------|
| `packages/design-system/__tests__/hookformAria.test.tsx` | Para cada um dos 8 `HookForm*`, dentro de um `Form` com `useForm`: sem erro, o controle não tem `aria-invalid="true"` e o `aria-describedby` não aponta para mensagem; depois de `setError`, `aria-invalid="true"` e o `aria-describedby` contém o id do elemento cujo texto é a mensagem. O controle é achado por papel (`textbox`, `combobox`, `radiogroup`, `switch`, botão do `DateInput`) ou por rótulo (`getByLabelText`) | voltar qualquer um a `Controller`; tirar o `FormControl`; `Select`/`DateInput`/`ImageUploadInput` pararem de repassar o atributo |
| `packages/design-system/__tests__/hookformInputPassword.test.tsx` | `getByLabelText(label)` devolve o `input` (não o wrapper); o botão de alternar tem nome "Mostrar senha" e, depois do clique, "Ocultar senha" | `FormControl` voltar ao `div`; perder o `aria-label` |
| `packages/design-system/__tests__/imageUploadInput.test.tsx` (ou um caso dentro do `hookformAria`) | arquivo grande demais: o `input[type=file]` passa a ter no `aria-describedby` o id do parágrafo do erro local, além do `hintId` | erro local sem vínculo |
| `packages/design-system/__tests__/button.test.tsx` | com `loading`, `getByRole("button", { name: "Salvar" })` acha o botão, `aria-busy="true"`, `disabled`; o `svg` do spinner tem `aria-hidden="true"` | voltar a trocar o conteúdo pelo `Spinner` |
| `packages/design-system/__tests__/actionMenu.test.tsx` | o gatilho é `button` com o nome de `components.actionMenu.trigger`, `type="button"`, recebe foco (`focus()` → `document.activeElement`); clicar abre o menu com os itens `edit`/`delete` | voltar a `<div>` |
| `packages/design-system/__tests__/themeContrast.test.ts` | lê `styles/globals.css`, extrai os tokens `oklch` de `:root` e `.dark`, calcula a razão WCAG e exige ≥ 4,5 para: `muted-foreground`/`muted` (claro e escuro), `muted-foreground`/`background` (claro), `destructive`/`background` (claro e escuro), `destructive`/`accent` (escuro), `background`/`destructive` (claro e escuro, o hover do antd com o override) | alguém voltar o token, inclusive um `pnpm bump-ui` que reescreva o `globals.css` com valores do upstream |

O `antd` pode pedir `window.matchMedia` no `jsdom`. Se pedir, entra um `vitest.setup.ts` com o stub; decisão
do `desenvolvedor` ao rodar.

### 8.3 Ajustes em testes existentes (`apps/app`, `apps/e2e`)

- `apps/app/__tests__/entitiesListReadOnly.test.tsx`: já roda o `Switch` real via mock do `Table` (`:41-43`).
  Acrescentar `getByRole("switch", { name: /<nome da entidade>/ })`.
- `apps/app/__tests__/usersListLastAccess.test.tsx` ou `usersListArchiveLabels.test.tsx`: o mesmo para o
  `Switch` de usuário, se o mock do `Table` renderizar a coluna (conferir; senão, fica só no E2E).
- `apps/app/__tests__/panelNavbarControls.test.tsx`: o mock do `Select` (`:50`) pode expor o `aria-label`
  recebido; asserção de que o seletor de ambiente recebe "Ambiente".
- `apps/e2e/a11y/allowlist.ts`: `A11Y_ALLOWLIST` vira `[]`; somem `forRoutes`, `ExceptionTemplate`, as sete
  constantes e as listas de rota (senão o Biome acusa variável sem uso). Tipos `A11yTheme` e `A11yException`
  ficam, porque `support/a11yFilter.ts:1` e `__tests__/a11yFilter.test.ts:2` importam.
- `apps/e2e/tests/entityCrud.spec.ts:17-20`: `openRowActions` passa a
  `row.getByRole("button", { name: actionMenuCopy.trigger }).click()`, e o comentário de `:17` sai.
- `apps/e2e/support/signIn.ts:9-10`: o comentário deixa de ser verdade. Sai; o seletor por `name` continua.

Sem teste que exija processo externo além do `pnpm e2e` que já existe. É ele que prova a allowlist vazia e o
`<title>` presente (`support/a11y.ts:73-77` passa a exigir título não vazio nas rotas do painel quando a
exceção de `document-title` some).

---

## 9. O que o `/test` vai percorrer

Rotas cobertas pela suíte: `/pt-br/sign-in`, `/pt-br/sign-up`, `/pt-br`, `/pt-br/entities`,
`/pt-br/entities/create`, `/pt-br/entities/edit/[id]`, `/pt-br/admin`, `/pt-br/admin/users`, `web:/pt-br`,
`web:/pt-br/sign-up`, mais a personificação.

1. **`pnpm e2e` com a allowlist vazia**, claro e escuro (`a11yDark.spec.ts`). Nenhuma falha e nenhuma
   anotação `a11y-stale-exception`.
2. **Erro de campo pela árvore de acessibilidade** (`agent-browser`, snapshot da árvore): criar entidade com
   nome vazio e data inválida; em cada campo com erro, ler `aria-invalid` e o texto referenciado pelo
   `aria-describedby`. Idem no cadastro do `apps/app` e da `apps/web` (senha curta), e no `Select` de tipo.
   Depois de corrigir o valor, o atributo volta a `false` e a referência some.
3. **Senha**: o campo é achado pelo rótulo; o botão de alternar anuncia "Mostrar senha"/"Ocultar senha" nos 3
   idiomas.
4. **Botão em carregamento**: no login, com a rede lenta, o botão "Entrar" mantém o nome e publica
   `aria-busy="true"` durante o envio. No checkout de assinatura, o mesmo, se a Stripe de teste estiver
   configurada; sem ela, 🔒.
5. **`ActionsMenu` pelo teclado**: Tab até o gatilho da linha, anel de foco visível, Enter abre; conferir se o
   foco entra no menu (hipótese do `autoFocus`), setas, Enter em "Editar", Esc fecha e devolve o foco.
6. **Contraste medido** (valor computado no browser, não o do plano): mensagem de erro no escuro, iniciais do
   avatar no claro, textos dos cards da landing no claro, e o item "Excluir" do `ActionsMenu` em repouso e em
   **hover**, no claro e no escuro (cor do texto e do fundo lidas do estilo computado). Também o `Button`
   `destructive` do `AccountPrivacyPanel` no escuro.
7. **`<title>`** nas páginas do painel comum e admin, nos 3 idiomas.
8. **Avatar com imagem enviada**: axe sem `image-alt` no menu de perfil (subir avatar no emulador de
   Storage, que já funciona desde a PR #31).
9. **Web**: hero, CTA, FAQ, preços e contato (seletor de data) com um único elemento focável por controle; os
   links continuam navegando.
10. **Regressão visual**: light, dark e mobile nas telas acima; o cinza `muted` ficou um pouco mais escuro e o
    vermelho do escuro mais claro.

---

## 10. Blueprint técnico

### 10.1 `packages/design-system/components/form/hookform/hookformInput.tsx` (modelo dos sete)

```diff
 import {
     type Control,
-    Controller,
     type ControllerProps,
     type FieldValues,
     type Path,
     useFormContext,
 } from "react-hook-form";
-import { FormControl, FormItem, FormLabel, FormMessage } from "../../ui/form";
+import {
+    FormControl,
+    FormField,
+    FormItem,
+    FormLabel,
+    FormMessage,
+} from "../../ui/form";
 …
-        <Controller
+        <FormField
             control={control}
             name={name}
             render={…}
             {...controllerProps}
         />
```

O mesmo em `hookformInputPassword`, `hookformSelect`, `hookformDateInput`, `hookformImageUpload`,
`hookformRadioGroup` e `hookformTextarea`.

### 10.2 `hookformInputPassword.tsx`

```diff
+    const { dictionary } = getDictionary();
+    const passwordCopy = dictionary.components.inputPassword;
 …
-                        <FormControl>
-                            <div className="relative">
+                        <div className="relative">
+                            <FormControl>
                                 <Input … />
+                            </FormControl>
                                 <Button
+                                    aria-label={showPassword ? passwordCopy.hide : passwordCopy.show}
                                     className="-translate-y-1/2 absolute top-1/2 right-2"
                                     onClick={toggleShowPassword}
                                 >
                                     …
                                 </Button>
-                            </div>
-                        </FormControl>
+                        </div>
```

O seletor da allowlist (`input + button.absolute`) mostra que o botão é irmão do input; a ordem continua.

### 10.3 Compostos: `DateInput`, `TextareaInput`, `RadioGroupInput`, `ImageUploadInput`

```tsx
// hookformDateInput.tsx (idem textarea, radio, image upload)
<FormItem>
    <FormControl>
        <DateInput {...rest} … />
    </FormControl>
    <FormMessage message={errorMessage} />
</FormItem>
```

```diff
 // ui/date-input.tsx
 export type DateInputProps = {
+  "aria-describedby"?: string;
   label?: string;
 …
-    { label, error, required = false, id, className, value = "", onChange, onBlur, disabled, placeholder = "Pick a date" },
+    { label, error, required = false, id, className, value = "", onChange, onBlur, disabled, placeholder = "Pick a date", "aria-describedby": ariaDescribedBy },
 …
             <Button
+              aria-describedby={ariaDescribedBy}
               aria-invalid={Boolean(error)}
```

```diff
 // ui/image-upload-input.tsx
 export type ImageUploadInputProps = {
+    "aria-describedby"?: string;
 …
     const hintId = `${inputId}-hint`;
+    const fileErrorId = `${inputId}-file-error`;
+    const describedBy = [hintId, ariaDescribedBy, fileError ? fileErrorId : null]
+        .filter(Boolean)
+        .join(" ");
 …
-                aria-describedby={hintId}
+                aria-describedby={describedBy}
 …
-                <p className="text-destructive text-sm">{fileError}</p>
+                <p className="text-destructive text-sm" id={fileErrorId}>{fileError}</p>
```

`TextareaInput` e `RadioGroupInput` não mudam: já espalham o resto no controle.

### 10.4 `ui/select/index.tsx`

```diff
 export type SelectProps = {
 …
     "aria-label"?: string;
+    "aria-describedby"?: string;
+    "aria-invalid"?: boolean;
 …
 export function Select({
 …
     "aria-label": ariaLabel,
+    "aria-describedby": ariaDescribedBy,
+    "aria-invalid": ariaInvalid,
 …
             <SelectTrigger
+                aria-describedby={ariaDescribedBy}
+                aria-invalid={ariaInvalid}
                 aria-label={ariaLabel ?? (label ? undefined : placeholder)}
```

O `SelectTrigger` já tem estilo `aria-invalid:border-destructive` (`select/components/select.tsx:39`).

### 10.5 `ui/button.tsx`

```diff
       <button
+        aria-busy={loading || undefined}
         className={cn(buttonVariants({ variant, size, className }))}
 …
         {loading ? (
-          <Spinner />
+          <>
+            <Spinner aria-hidden="true" />
+            <span className="sr-only">{children}</span>
+          </>
         ) : (
```

### 10.6 `ui/action-menu.tsx`, `styles/globals.css`, `providers/antd-app.tsx`, `ui/avatar.tsx`

```diff
 // action-menu.tsx
-            <div
+            <button
+                aria-label={translation.trigger}
                 className={cn(
-                    "flex h-full w-full items-center justify-center rounded-full p-2 hover:cursor-pointer hover:opacity-40",
+                    "flex h-full w-full items-center justify-center rounded-full p-2 outline-none hover:cursor-pointer hover:opacity-40 focus-visible:ring-[3px] focus-visible:ring-ring/50",
                     className,
                 )}
+                type="button"
             >
                 <MoreVerticalIcon className="h-6 w-6" />
-            </div>
+            </button>
```

(`autoFocus` no `<Dropdown>` como hipótese, §5.4.)

```diff
 /* globals.css */
 :root {
-    --muted-foreground: oklch(0.556 0 0);
+    --muted-foreground: oklch(0.54 0 0);
 …
 .dark {
-    --destructive: oklch(0.396 0.141 25.723);
+    --destructive: oklch(0.704 0.191 22.216);
```

```diff
 // antd-app.tsx, dentro de components
+                    Dropdown: {
+                        colorTextLightSolid: "var(--color-background)",
+                    },
```

O `avatar.tsx` não muda: o conserto é o token.

### 10.7 i18n (3 idiomas, mesma estrutura)

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `components.inputPassword.show` | Mostrar senha | Show password | Mostrar contraseña |
| `components.inputPassword.hide` | Ocultar senha | Hide password | Ocultar contraseña |
| `components.actionMenu.trigger` | Mais ações | More actions | Más acciones |
| `apps.app.pages.common.entities.list.enabledToggle` | Entidade ativa: {name} | Entity enabled: {name} | Entidad activa: {name} |
| `apps.app.pages.admin.users.list.statusToggle` | Usuário ativo: {name} | User active: {name} | Usuario activo: {name} |

`components.inputPassword` é arquivo novo, `translations/components/ui/input-password.ts`, registrado em
`translations/components/index.ts` nos 3 idiomas, no molde de `ui/button.ts`. Reusadas sem mudança:
`navbar.environmentLabel`, `navbar.environmentCommon`, `navbar.environmentAdmin`. Nenhum `apiErrors`. Rodar
`/i18n-sync` e o teste de paridade.

### 10.8 `apps/app`

```ts
// app/[locale]/(authenticated)/(common)/layout.tsx (admin: environmentAdmin)
export const generateMetadata = async ({
    params,
}: AppLayoutProperties): Promise<Metadata> => {
    const { locale } = await params;
    const dictionary = await getTranslations(resolveLocale(locale));
    return {
        title: `${dictionary.apps.app.pages.navbar.environmentCommon} | ${getBrand().name}`,
    };
};
```

```diff
 // shared/components/ui/PanelNavbarControls.tsx (:217 e :262)
             <Select
+                aria-label={navbarCopy.environmentLabel}
                 disabled={environmentDisabled}
```

```diff
 // EntitiesListClient.tsx:99 (UsersListClient.tsx:106 com statusToggle e displayName ?? email)
                     <Switch
+                        aria-label={entitiesList.enabledToggle.replace("{name}", record.name)}
                         checked={value}
```

```diff
 // shared/components/ui/ProfileDropdown.tsx:45
-                        <AvatarImage src={avatarSrc} />
+                        <AvatarImage alt="" src={avatarSrc} />
```

```diff
 // shared/components/ui/NotFoundPage.tsx:49-56
-                    <Button className="w-full sm:w-auto" icon={<ArrowLeft />} size="lg" variant="default">
-                        <Link href={homePath}>{notFoundCopy.goHome}</Link>
-                    </Button>
+                    <Link
+                        className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto")}
+                        href={homePath}
+                    >
+                        <ArrowLeft />
+                        {notFoundCopy.goHome}
+                    </Link>
```

### 10.9 `apps/web`

```diff
 // hero.tsx:27-36 (o mesmo molde nas outras 7 ocorrências de §5.5)
-                        <Button className="gap-4" icon={<PhoneCall />} size="lg" variant="outline">
-                            <Link href={`/${locale}/contact`}>
-                                {dictionary.apps.web.pages.cta.primaryCta}{" "}
-                            </Link>
-                        </Button>
+                        <Link
+                            className={cn(buttonVariants({ size: "lg", variant: "outline" }), "gap-4")}
+                            href={`/${locale}/contact`}
+                        >
+                            <PhoneCall />
+                            {dictionary.apps.web.pages.cta.primaryCta}
+                        </Link>
```

```diff
 // contact/components/contact-form-client.tsx:79
-                                    <PopoverTrigger>
+                                    <PopoverTrigger asChild>
```

O `landing.spec.ts:27-31` já procura o CTA por `getByRole("link", …)`; continua casando.

### 10.10 Documentação que muda junto

- `packages/CLAUDE.md` (seção React Hook Form) e `AGENTS.md` (seção "Variantes `HookForm*`"): uma linha
  cada. Todo `HookForm*` usa `FormField` (nunca `Controller` direto) e envolve o controle em `FormControl`;
  componente composto repassa `aria-describedby` ao elemento focável.
- `docs/SETUP.md` (seção "Acessibilidade e a allowlist", perto da linha 268): a allowlist está vazia; exceção
  nova só para defeito de biblioteca externa, com link para o problema na origem (recomendação da spec).

### 10.11 Ordem de implementação e commits

Não há SDK nem API. A ordem segue a dependência: design system → apps → e2e → i18n → docs. Como o i18n é
consumido pelo design system e pelos apps, o `desenvolvedor` implementa as chaves primeiro para compilar, e o
commit delas vai na posição que a regra de commits pede.

| # | Commit (proposta, em inglês) | Arquivos |
|---|------------------------------|----------|
| 1 | `test(design-system): add a vitest task with jsdom and testing library` | `packages/design-system/package.json`, `vitest.config.mts`, `pnpm-lock.yaml` |
| 2 | `fix(design-system): announce field errors from every HookForm component` | 7 `hookform*.tsx`, `ui/select/index.tsx`, `ui/date-input.tsx`, `ui/image-upload-input.tsx`, `__tests__/hookformAria.test.tsx`, `__tests__/hookformInputPassword.test.tsx` |
| 3 | `fix(design-system): name the password toggle, the loading button and the actions trigger` | `hookformInputPassword.tsx` (parte do nome), `ui/button.tsx`, `ui/action-menu.tsx`, testes de `button` e `actionMenu` |
| 4 | `fix(design-system): raise muted and destructive text contrast to AA` | `styles/globals.css`, `providers/antd-app.tsx`, `__tests__/themeContrast.test.ts` |
| 5 | `fix(app): title the panel pages and name the navbar and row controls` | 2 layouts, `PanelNavbarControls.tsx`, `EntitiesListClient.tsx`, `UsersListClient.tsx`, `ProfileDropdown.tsx`, testes do `apps/app` |
| 6 | `fix(app): stop nesting the not-found link in a button` | `NotFoundPage.tsx` |
| 7 | `fix(web): render the landing and pricing CTAs as links` | `hero.tsx`, `cta.tsx`, `faq.tsx`, `pricing/page.tsx`, `contact-form-client.tsx` |
| 8 | `test(e2e): empty the axe allowlist and query the row menu by name` | `allowlist.ts`, `entityCrud.spec.ts`, `support/signIn.ts` |
| 9 | `feat(internationalization): add accessible names for form and table controls` | `translations/components/ui/input-password.ts`, `components/index.ts`, `ui/action-menu.ts`, `pages/common/entities.ts`, `pages/admin/users.ts` |
| 10 | `docs: record the HookForm field rule and the empty allowlist` | `packages/CLAUDE.md`, `AGENTS.md`, `docs/SETUP.md` |
| 11 | `docs(features): accessibility-conformance` | `docs/features/accessibility-conformance/` |

Os commits 2 e 3 mexem no mesmo `hookformInputPassword.tsx`. Se separar exigir `git add -p`, juntar os dois
e registrar o motivo na mensagem (política §6).

### 10.12 Env e config nova

Nenhuma. Um fork não precisa configurar nada. Quem customizou o tema no próprio `globals.css` precisa conferir
`--muted-foreground` do claro e `--destructive` do escuro; o `themeContrast.test.ts` acusa se ficarem abaixo
de 4,5:1.

---

## 11. Critérios de aceite (prováveis, para o `/test` fechar)

# Critérios de Aceite (Checklist)

- [ ] **Allowlist vazia e suíte verde**
  `apps/e2e/a11y/allowlist.ts` exporta `A11Y_ALLOWLIST = []` e `pnpm e2e` passa em claro e escuro em todas as
  rotas cobertas. Nenhuma violação `critical`/`serious` aparece, e o relatório não traz anotação
  `a11y-stale-exception`, o que também confirma que a exceção antiga de `web:/pt-br/sign-up` estava sem alvo.

- [ ] **Campo com erro anuncia a mensagem**
  Em todo `HookForm*`, com erro de validação, o elemento focável tem `aria-invalid="true"` e um
  `aria-describedby` que referencia o parágrafo com o texto do erro. Sem erro, o atributo não é `true` e a
  referência à mensagem some. Vale para texto, senha, select, textarea, radio, data, upload e switch, e o
  `/test` confirma pela árvore de acessibilidade em pelo menos um formulário do `apps/app` e um da `apps/web`.

- [ ] **Erro local do upload também é anunciado**
  Ao escolher um arquivo acima de 4 MB ou de tipo recusado, o `input[type=file]` passa a referenciar a mensagem
  de erro local no `aria-describedby`, junto da dica. Ao escolher um arquivo válido depois, a referência ao erro
  some.

- [ ] **Campo de senha rotulado e botão de alternar com nome**
  O `input` de senha é achado pelo rótulo visível (não mais só pelo atributo `name`). O botão ao lado anuncia
  "Mostrar senha" e, depois de acionado, "Ocultar senha", com os equivalentes em inglês e espanhol.

- [ ] **Botão em carregamento mantém o nome**
  Durante o envio do login (e do checkout, se houver Stripe de teste), o botão continua com o nome do rótulo
  traduzido, publica `aria-busy="true"` e fica desabilitado. O spinner não entra na árvore de acessibilidade.
  Duplo clique durante o carregamento não dispara um segundo envio.

- [ ] **Gatilho do menu de ações é um botão focável**
  Na lista de entidades e na de usuários, Tab alcança o gatilho de cada linha, que mostra anel de foco e tem
  nome "Mais ações" (3 idiomas). Enter abre o menu. Se a hipótese do `autoFocus` valer, o foco entra no
  primeiro item e Esc devolve o foco ao gatilho; se não valer, o critério registra o comportamento medido.

- [ ] **Switch de linha nomeia o registro**
  O `Switch` de cada linha diz a qual registro se refere ("Entidade ativa: <nome>", "Usuário ativo: <nome ou
  e-mail>"). Sob personificação, o switch de entidade continua nomeado e desabilitado.

- [ ] **Seletor de ambiente com nome**
  No navbar do admin (desktop e mobile), o seletor de ambiente tem nome "Ambiente"/"Environment"/"Entorno". O
  seletor de usuário personificado continua nomeado.

- [ ] **Título traduzido no painel**
  Toda página do painel comum tem `<title>` "Painel do usuário | <marca>" e toda página do admin
  "Administração | <marca>", com os equivalentes em `/en` e `/es`. Inclui as páginas `"use client"` (criar
  entidade, criar e editar usuário).

- [ ] **Contraste do erro no escuro**
  Mensagem de erro de formulário no tema escuro com razão ≥ 4,5:1 contra o fundo, medida no estilo computado.
  O plano calcula 6,84:1.

- [ ] **Item "Excluir" do menu de ações em repouso e em hover**
  No escuro, o texto do item em repouso fica ≥ 4,5:1 contra o popover, e em hover o par texto/fundo fica
  ≥ 4,5:1 (esperado: texto quase preto sobre vermelho claro, 6,84:1). No claro, o hover mantém texto branco
  sobre o vermelho (4,76:1). Medido com o cursor sobre o item, lendo `color` e `background-color` computados.

- [ ] **Botão destrutivo no escuro**
  O botão de excluir conta (`AccountPrivacyPanel`) no escuro mantém texto branco legível: razão ≥ 4,5:1 medida.

- [ ] **Iniciais do avatar e cards da landing no claro**
  As iniciais do avatar do navbar e os textos `muted` dos cards de features, depoimentos e CTA da landing
  ficam ≥ 4,5:1 no tema claro (esperado 4,64:1). O escuro não piora.

- [ ] **Avatar com imagem sem `image-alt`**
  Com avatar enviado, o axe numa página autenticada não acusa `image-alt` no menu de perfil, e o gatilho do
  menu continua com o nome de `profileDropdown.triggerLabel`.

- [ ] **CTAs da web são links simples**
  Hero, CTA, FAQ e preços renderizam um `<a>` com aparência de botão e sem `<button>` em volta; o seletor de
  data do contato tem um único botão. Os links levam aos mesmos destinos de antes, inclusive o
  `NEXT_PUBLIC_APP_URL` quando definido.

- [ ] **Design system tem testes que pegam regressão**
  `pnpm --filter @repo/design-system test` roda e passa. Reverter qualquer um dos consertos (voltar um
  `HookForm*` a `Controller`, tirar o `aria-label` do toggle, voltar o `Button` a trocar o conteúdo, voltar o
  gatilho a `<div>`, voltar um dos dois tokens) faz pelo menos um teste falhar. O `/test` faz a mutação e
  reverte.

- [ ] **Gates do CI**
  `pnpm turbo run lint typecheck test test:emulator` passa, com o `@repo/design-system#test` aparecendo na
  execução. Paridade de i18n verde nos 3 idiomas.

- [ ] **Sem regressão visual**
  Claro, escuro e mobile nas telas percorridas: nenhum botão muda de tamanho no carregamento, os CTAs da web
  mantêm aparência de botão e o gatilho do menu mantém o ícone e o tamanho.

---

## 12. Pré-requisitos manuais de infra e achados

### 12.1 Pré-requisitos manuais de infra

**Nenhum.** Não há variável, serviço, índice, regra ou webhook novo. O `pnpm e2e` exige JDK 21, browser e
emulador, que já são pré-requisito da suíte (`CLAUDE.md`, seção de comandos). O caso do checkout em
carregamento depende de chave de teste da Stripe; sem ela o critério fica 🔒, sem reprovar.

### 12.2 Achados fora do corte (para o backlog)

- Nomes acessíveis literais em inglês: `mode-toggle.tsx:39` ("Toggle theme") e os itens "Light/Dark/System"
  (`:14-18`), `sidebar.tsx:299,311` ("Toggle Sidebar"), `dialog.tsx:75` e `sheet.tsx:79` ("Close"),
  `pagination.tsx:74,91,114`, `breadcrumb.tsx:101`, `carousel.tsx:209,239`, `spinner.tsx:9` ("Loading", usado
  avulso em `Container.tsx:28` e `FullScreenLoader.tsx:17`), e "Switch language" em
  `apps/app/shared/components/ui/LanguageSwitcher.tsx:79` e `apps/web/.../header/language-switcher.tsx:68`.
- `<title>` descritivo por página no painel (§14, pergunta 2).
- `Button` aplica `disabled={loading}` antes do spread das props (`button.tsx:68-70`), então
  `disabled={false}` explícito desfaz a trava; já documentado em `sharedFooterPendingState.test.tsx:35-37`.
- `HookFormInputPassword` sobrescreve o `placeholder` do chamador com `"••••••••"`
  (`hookformInputPassword.tsx:75`).
- `--destructive` do claro fica em 4,37:1 sobre `--muted`: texto de erro dentro de card `muted` não passa. Não
  aparece nas rotas cobertas.
- Os tokens `Menu.dangerItem*` de `antd-app.tsx:66-70` não alcançam o `Dropdown`, que é onde o `danger` aparece
  no repo.

---

## 13. Decisões adotadas sem perguntar

1. **Allowlist vazia**, sem exceção residual. Fonte: recomendação da spec. Descartado: manter exceção
   justificada, porque nenhum dos sete grupos vem de biblioteca externa.
2. **Sem lib de axe no design system**, só Testing Library. Fonte: recomendação da spec. Descartado:
   `vitest-axe`/`jest-axe`, que seriam dependência nova.
3. **Setup de teste espelhando o `apps/app`** (`jsdom` + `@vitejs/plugin-react`) com dependências que já
   estão no lockfile. Descartado: `esbuild.jsx: "automatic"` sem o plugin, que economiza uma aresta mas foge
   do padrão existente.
4. **`Controller` → `FormField` nos sete `HookForm*`**, mais repasse de `aria-describedby` nos compostos.
   Fonte: política §3, corrigir na raiz. Descartado: calcular o id da mensagem na mão em cada wrapper, que
   repetiria a mesma lógica sete vezes e duplicaria o que o `form.tsx` já faz.
5. **Clarear `--destructive` do escuro para o valor do upstream e sobrescrever o `colorTextLightSolid` só no
   `Dropdown`.** Descartado: mapear `--destructive-foreground` (`globals.css:64`, 5,18:1) no `@theme` e trocar
   `text-destructive` por `text-destructive-foreground` nos 15 arquivos, como sugeria o BACKLOG (linha 540).
   Motivos: 15 arquivos contra 2 linhas; o nome `-foreground` no shadcn significa "texto sobre o fundo
   destrutivo", o contrário do uso proposto; e o `pnpm bump-ui` reescreve os componentes shadcn com
   `text-destructive`, desfazendo a troca. O valor escolhido é o do upstream, então um `bump-ui` tende a
   manter o token em vez de revertê-lo. A separação de texto e fundo fica onde existe conflito real, no hover
   do antd.
6. **Um token para avatar e cards** (`--muted-foreground` do claro para 0,54). Fonte: política §3 (o mesmo par
   aparece em 6+ lugares). Descartado: trocar a classe do `AvatarFallback` e dos cards da landing, que
   deixaria o `AvatarGroupCount` e todo `muted` sobre `muted` futuro com o mesmo defeito.
7. **Botão em carregamento sem chave nova**: filhos em `sr-only` + `aria-busy`. Descartado: prop
   `loadingLabel` ou `components.button.loading` no dicionário, que exigiriam o `Button` virar `"use client"`
   (ele é usado em Server Components da web, como `hero.tsx`) ou que cada chamador passasse um texto.
8. **Textos do design system pelo `dictionary.components.*`** (toggle de senha, gatilho do menu). Fonte:
   padrão existente (`action-menu.tsx:38`, `select/index.tsx:88`). Descartado: props obrigatórias de texto,
   que obrigariam todos os call sites a mudar.
9. **`<title>` no layout, reusando as chaves do navbar.** Fonte: menor raio (2 arquivos, zero chave nova) e
   4 das 11 páginas são `"use client"`. Descartado: título por página (§14, pergunta 2).
10. **`Link` com `buttonVariants` na web**, no molde da PR #28. Descartado: adicionar `asChild` ao `Button`,
    que exigiria refazer a estrutura interna dele (`div` com ícone e `loading`) e mudaria a API de um
    componente usado no repo todo.
11. **Ocorrências a mais entram** (`NotFoundPage`, `PopoverTrigger` do contato). Fonte: a spec diz que "se o
    `/analyze` achar mais ocorrências, elas entram". Os nomes literais em inglês ficaram fora porque são outro
    defeito (i18n), que a spec trata como achado no caso do `DateInput`.
12. **`alt=""` no avatar do menu de perfil**, registrado na spec como evidência e no BACKLOG como tarefa direta
    P, na mesma superfície. Descartado: deixar para outra rodada, já que a allowlist vazia e o axe com avatar
    enviado são o critério de pronto aqui.

## 14. Perguntas em aberto

1. **O valor dos tokens novos é aceitável como identidade visual padrão?**
   Opções: (a) `--muted-foreground` claro 0,54 e `--destructive` escuro 0,704/0,191/22,2, os valores deste
   plano; (b) outros valores que também passem 4,5:1. **Adotada: (a).** O vermelho é o do shadcn upstream e o
   cinza é a menor mudança que passa com folga (4,64:1). Os forks herdam a mudança visual, o que a spec já
   registra como risco.
2. **Título por página no painel?**
   Opções: (a) título único por área, no layout; (b) título por página, com as páginas `"use client"` ganhando
   um `layout.tsx` de segmento só para metadata. **Adotada: (a).** Satisfaz o corte ("`<title>` traduzido") e o
   axe com 2 arquivos. O WCAG 2.4.2 pede título que descreva o assunto da página, e "Painel do usuário" em
   toda tela é o mínimo; (b) fica como achado, com os rótulos já existentes em `common/routes` e
   `admin/routes` como fonte.
3. **O `Button` em carregamento deveria anunciar "carregando"?**
   Opções: (a) mantém o rótulo e publica `aria-busy`; (b) troca o nome para um texto de carregamento
   traduzido. **Adotada: (a).** O sinal de pronto da spec é "mantém o nome", e (b) exigiria o `Button` virar
   componente cliente. Leitores de tela tratam `aria-busy` de formas diferentes; se o usuário quiser o anúncio
   explícito, entra uma região `aria-live` em outra rodada.
4. **`autoFocus` no `Dropdown` do `ActionsMenu`.**
   Opções: (a) acrescentar e o `/test` medir; (b) só tornar o gatilho focável, como diz o corte. **Adotada:
   (a) como hipótese.** Sem foco no menu, o gatilho abre algo que o teclado não alcança. Se a medição mostrar
   efeito colateral (foco roubado ao abrir com mouse), volta a (b) e o resultado vai para o relatório.

## 15. Riscos

- **Mudança visual em todo fork**: o cinza `muted` do claro escurece um pouco e o vermelho do escuro clareia.
  Fork com tema próprio precisa conferir o dele; o teste de contraste acusa.
- **`FormField` em todos os `HookForm*`**: o `useFormField` assina `useFormState({ name })` por campo
  (`form.tsx:46`), uma assinatura a mais por campo. Formulários deste repo têm poucos campos; em formulário
  grande do fork pode aparecer re-render extra.
- **Props do `Slot` em compostos**: o `FormControl` injeta `id`, `aria-*` e `data-slot` nos compostos. O `id`
  do filho vence, mas o `data-slot` do `TextareaInput` muda (§5.1). Nenhum seletor depende dele hoje.
- **`colorTextLightSolid` por componente**: depende de o antd 5.29.3 aplicar token global sobrescrito no
  `Dropdown`. Se não aplicar, o hover do `danger` no escuro fica em 2,89:1 e o plano B é uma regra CSS para
  `.ant-dropdown-menu-item-danger:hover` no `globals.css`. O `/test` mede.
- **`antd` no `jsdom`**: o teste do `ActionsMenu` pode precisar de stub de `matchMedia`.
- **Cálculo de contraste**: os números deste plano vêm de conversão oklch → sRGB feita à mão; a mistura com
  alfa do `bg-destructive/60` é aproximada. O `/test` mede no estilo computado e o número dele vale.
