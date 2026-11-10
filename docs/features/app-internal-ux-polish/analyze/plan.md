# Plano: conta como página de configurações e padrão único de página nas telas internas

- **Spec de origem:** [`specs/app-internal-ux-polish.md`](../../../../specs/app-internal-ux-polish.md) (`approved`). Problema, evidência, corte de MVP e a seção `## Decisões` vêm de lá e não são rediscutidos aqui. Este plano trata do **como**.
- **Pesquisa de apoio:** [`specs/research/settings-page-patterns.md`](../../../../specs/research/settings-page-patterns.md).
- **Contenção:** a fatia 3 de `account-security-mfa` mexe em `AccountSecurityForm.tsx`. Esta tarefa roda antes dela e nunca em paralelo.
- **Fatia:** `packages/design-system` → `apps/app` → `apps/e2e` → `packages/internationalization`. Sem SDK e sem API.

Caminhos encurtados: `account/` é `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/`; `ui/` é `apps/app/shared/components/ui/`; `(common)/` e `(admin)/` são `apps/app/app/[locale]/(authenticated)/(common)/` e `.../(admin)/admin/`.

---

## Etapa 1: análise

### 1. Contexto

**Resumo.** A conta passa a ser uma página de configurações com navegação vertical por seção, derivada do `?tab=` da URL, com blocos que têm título, descrição e o próprio botão de salvar, e a exclusão da conta separada num bloco destrutivo. As telas internas (conta, home, entidades, equipe e as quatro do admin) ganham um cabeçalho de página com `h1`, descrição opcional e ação primária, uma largura máxima para formulário e configurações, um espaçamento vertical e `loading.tsx` que não pula.

**Objetivos (corte da spec):**

1. Navegação da conta em `Tabs` vertical no desktop e controle compacto a 375 px, sem rolagem lateral em pt-br, en e es.
2. Seção ativa derivada do `?tab=` a cada navegação; item do menu lateral marcado como ativo e grupo aberto; `?checkout=` e `?plan=` preservados; rótulo do menu igual ao da seção. Fecha o E9 do backlog.
3. Blocos com heading real, descrição e salvar junto do bloco, fora da barra fixa. Diálogos usam o rodapé do próprio diálogo.
4. Zona de perigo separada e confirmações destrutivas com variante `destructive`.
5. Padrão único de página nas 12 telas do corte.

**Fora de escopo** (da spec, sem alteração): unificar `Popconfirm`/`AlertDialog`; confirmação no `Switch` de ativar; detalhe de usuário no admin; skeleton fiel de cada tela; formulários em duas colunas; `playground` no menu; conta do admin (spec `admin-own-account`).

**Fora de escopo por decisão deste plano:**

- O `Footer` continua fixo nos formulários de página inteira (entidades, usuários, onboarding). Só a conta, os diálogos e o convite da equipe passam a usar o rodapé em linha. Ver §5.3 e a pergunta 2.
- Nenhuma descrição nova nas listas (entidades, usuários, auditoria) nem nos formulários de criar e editar. A prop existe e fica vazia ali.
- Superfície das telas (painel `bg-muted/50`, `contentOnly`) fica como está. O corte cobra título, largura, espaçamento, ação e carga; não cobra superfície.
- Encerrar uma sessão específica (`AccountSessionsPanel.tsx:103`) continua sem confirmação. Ver pergunta 3.

**Apps impactados:** `apps/app` (quase tudo), `packages/design-system` (uma linha), `packages/internationalization` (copy nova e remoção de `settingsItems`), `apps/e2e` (spec nova e axe). `apps/api` e `apps/web`: nenhum; o formato `?tab=` não muda, então `apps/api/(shared)/lib/billing.ts:44` e `apps/web/shared/lib/pricingCta.ts:30` seguem válidos.

**Área do painel:** comum e admin. No admin entra só o padrão de página.

**Modo de produto:** no `simple` a seção cobrança some da navegação (`AccountTabs.tsx:33-35`) e do menu (`(common)/routes.tsx:69-76`); `?tab=billing` cai no perfil. O comportamento se mantém, e a URL passa a ser normalizada para `?tab=profile` (ver §5.1).

**Assinatura/plano, dependências externas, env:** nenhum.

**Genérico ou específico.** Decisão sobre onde mora cada peça nova:

| Peça | Onde | Por quê |
|------|------|---------|
| `PageHeader` (h1, descrição, ações) | `ui/PageHeader.tsx` | Compõe com `Header`, `Container` e `Footer`, que já moram em `ui/`. O único consumidor é `apps/app`; a `apps/web` não tem tela interna. |
| `SettingsSection` (bloco com heading, descrição, tom destrutivo) | `ui/SettingsSection.tsx` | Mesmo motivo. Hoje só a conta usa; a fatia 3 do MFA será o segundo uso, também no app. |
| `PageSkeleton` (cabeçalho + título de carga) | `ui/PageSkeleton.tsx` | Precisa reproduzir as medidas de `Header`/`Container`/`PageHeader`, que são do app. |
| Constantes de layout | `ui/pageLayout.ts` | Uma fonte para largura e respiro, lida pelo `Container` e pelo `PageSkeleton`. |
| `isNavUrlActive` | `apps/app/shared/lib/navActive.ts` | Lógica pura do `Sidebar` do app. |
| Variante do `AddButton` | `packages/design-system/components/ui/add-button.tsx` | O componente já está no pacote; muda uma linha. |

Nenhum primitivo novo vai para o `design-system`. Ele é presentacional e sincronizado com o shadcn (`pnpm bump-ui`); as três peças novas só têm consumidor no `apps/app`. Se outro app passar a ter tela interna, elas sobem para o pacote nessa hora.

### 1.1 Fontes

Spec e nota de pesquisa lidas por completo. Sem ClickUp, Figma ou print. **Referências não lidas:** nenhuma.

---

### 2. Dados (Firestore)

N/A. Nenhum campo, coleção, consulta ou índice.

### 3. Contrato `@repo/sdk`

N/A. Nenhum DTO ou action muda.

### 4. API

N/A. Nenhuma rota, guard ou `error.code` novo; nenhuma entrada em `apiErrors`.

---

### 5. Front-end (`apps/app`)

#### 5.1 Conta: navegação derivada da URL

**Hoje.** A aba é lida do `?tab=` uma vez, no `useState` inicial (`AccountTabs.tsx:51-53`). O clique regrava a URL com `history.replaceState(null, "", \`${pathname}?tab=${tab}\`)` (`:61`), o que descarta `?checkout=` e `?plan=`, lidos em `AccountBillingPanel.tsx:242-243`. Um link do menu lateral muda a URL e a aba não acompanha.

**Depois.**

- A aba ativa é calculada a cada render: `resolveAccountTab(searchParams.get("tab"))`. Não existe mais estado local.
- O clique continua usando a History API, porque a aba é estado de UI e uma navegação do router refaria o RSC da página (`account/(pages)/(home)/page.tsx:16-24` busca `account.me` no servidor). Desde o Next 14.1, `window.history.replaceState` integra com o router e atualiza `useSearchParams`/`usePathname`; o app está no Next `16.4.3` (`apps/app/package.json:29`) e não usa `cacheComponents` (`apps/app/next.config.ts`).
- O href novo preserva todos os parâmetros e troca só `tab`: `accountTabHref(pathname, searchParams, tab)`.
- **Normalização.** Quando o `tab` da URL é ausente ou inválido (incluindo `billing` no modo `simple`), um efeito faz `replaceState` para o valor resolvido, preservando o resto. `/account` vira `/account?tab=profile`, e o item "Perfil" do menu fica ativo sem regra especial no `Sidebar`.
- O link do menu lateral (`<Link href="/pt-br/account?tab=privacy">`) é navegação do router: muda `useSearchParams` e a aba acompanha. É o caso que fecha o E9.
- Salvar preferências continua navegando para `withLocalePath(locale, "/account?tab=preferences")` (`AccountPreferencesForm.tsx:93-99`), o que já é compatível.

As funções puras ficam em `account/(components)/accountTabRouting.ts` (`accountTabValues`, `resolveAccountTab`, `accountTabHref`). O nome evita colidir com `AccountTabs.tsx` em sistema de arquivos sem distinção de caixa.

#### 5.2 Conta: layout responsivo das seções

- `Tabs` com `orientation="vertical"` (`packages/design-system/components/ui/tabs.tsx:8-25`). A raiz só empilha em coluna no horizontal (`:19`); a conta passa `className="flex-col gap-6 lg:flex-row lg:items-start lg:gap-10"`.
- **≥ `lg` (1024 px):** `TabsList variant="line"` como coluna `w-48` à esquerda, `items-stretch`, com gatilhos `justify-start whitespace-normal`. O `whitespace-nowrap` do gatilho (`tabs.tsx:66`) é o que estourava em en; com `whitespace-normal` dentro de 12 rem um rótulo longo quebra linha em vez de vazar.
- **< `lg`:** a lista some (`hidden lg:flex`) e aparece um `NativeSelect` do design system (`packages/design-system/components/ui/native-select.tsx`) com as mesmas seções, rótulo `sr-only`. Uma linha a 375 px, sem rolagem lateral, sem sobreposição em nenhum idioma.
- O breakpoint é `lg`, e não `md`, porque entre 768 e 1024 px o menu lateral aberto ocupa 16 rem e sobraria pouco para coluna mais conteúdo.
- O painel ativo (`TabsContent`) continua rotulado pelo gatilho (`aria-labelledby` do Radix). Um `id` referenciado por `aria-labelledby` entra no nome acessível mesmo com o elemento oculto.
- Cada `TabsContent` abre com um cabeçalho de seção: `h2` com o rótulo da aba e uma descrição (`account.sections.<tab>`). Os blocos dentro usam `h3`. Hierarquia: `h1` "Minha conta" → `h2` seção → `h3` bloco.
- `ImpersonationReadOnlyNotice` sai de entre a lista e o conteúdo (`AccountTabs.tsx:80`) e vai para o topo da coluna de conteúdo.

#### 5.3 Conta: blocos, salvar por bloco e zona de perigo

`SettingsSection` (§10.3) renderiza `<section aria-labelledby>` com borda, `h3`, descrição e filhos. `tone="destructive"` troca a borda e a cor do título para os tokens `destructive`.

**O `Footer` (decisão pedida na spec).** Hoje todo `Footer` é barra `sticky bottom-0` com borda e fundo (`ui/Footer.tsx:47`), inclusive dentro de diálogo, e o convite da equipe já contorna isso com uma `className` que desfaz cada classe (`organization/(components)/InviteMemberForm.tsx:62`). O plano:

- `Footer` ganha `sticky?: boolean` (padrão `true`). Com `false`, sai o `sticky`, a borda e o fundo; ficam o alinhamento à direita, o estado de carga e o `disabled`, que o teste `sharedFooterPendingState.test.tsx` cobre.
- Usam `sticky={false}`: os formulários da conta (perfil, senha, definir senha, preferências) e o convite da equipe, no lugar do contorno por `className`.
- Os dois diálogos com formulário (`AccountEmailChangeDialog.tsx:134`, exclusão em `AccountPrivacyPanel.tsx:166`) deixam de usar `Footer` e passam a `AlertDialogFooter` com dois `Button`: cancelar `type="button" variant="outline"` e confirmar `type="submit"`. O `type="button"` é obrigatório: o `Button` não define tipo padrão e, dentro do `<form>`, cancelar enviaria o formulário. Os `onOpenAutoFocus` atuais continuam válidos, porque os diálogos seguem sem `AlertDialogCancel`.
- Entidades e usuários (criar/editar) e o onboarding mantêm o `Footer` fixo: são formulários de página inteira com uma ação só. O risco de foco escondido (WCAG 2.2 SC 2.4.11) nessas telas fica na lista "Verificar no `/test`" e na pergunta 2.

**Mapa de blocos por seção:**

| Seção | Bloco (`h3`) | Descrição | Ação | Origem hoje |
|-------|--------------|-----------|------|-------------|
| Perfil | Dados pessoais *(novo)* | *(nova)* | Salvar, em linha | `AccountProfileForm.tsx:76-164` (nome, telefone, foto) |
| Perfil | E-mail (`profile.email`) | *(nova)* | Trocar e-mail → diálogo | `AccountProfileForm.tsx:103-129`, sai do `<form>` do perfil |
| Segurança | Métodos de login | existente | desvincular / vincular | `AccountSignInMethodsPanel.tsx:107-118` (`section` + `h3` viram `SettingsSection`) |
| Segurança | Senha *(título novo)* | `security.description` | Alterar senha, em linha | `AccountSecurityForm.tsx:81-116` |
| Segurança | Definir senha (alternativa à anterior) | existente | em linha | `AccountPasswordSetForm.tsx:62-85` |
| Segurança | Sessões ativas | existente | encerrar outras → confirmação destrutiva | `AccountSessionsPanel.tsx:115-178` |
| Segurança | Sair de todos os dispositivos | existente | → confirmação destrutiva | `AccountSecurityForm.tsx:121-164` |
| Preferências | Tema e idioma *(novo)* | `preferences.description` | Salvar preferências, em linha | `AccountPreferencesForm.tsx:105-139` |
| Cobrança | sem `SettingsSection`; mantém `Card` e `h3` próprios | — | — | `AccountBillingPanel.tsx` |
| Privacidade | Baixar meus dados | existente + `filenameHint` | Baixar | `AccountPrivacyPanel.tsx:86-106` |
| Privacidade | Excluir minha conta, `tone="destructive"`, por último | existente | → diálogo com confirmar destrutivo | `AccountPrivacyPanel.tsx:108-183` |

Notas:

- **Cobrança** fica fora do formato de bloco: já usa `Card` com ação (`AccountBillingPanel.tsx:127-163`) e `h3` na lista de planos (`:196`). Mudam três coisas: o parágrafo de descrição (`:280-282`) sobe para o cabeçalho da seção; o nome do plano no `CardTitle` vira `h3` (`:130`); a grade perde `xl:grid-cols-3` (`:200` e `:221`), porque a coluna de conteúdo passa a ter cerca de 660 px e três cartões ficariam estreitos.
- **Privacidade:** o parágrafo de prazo e política (`AccountPrivacyPanel.tsx:185-200`) fica entre o bloco de exportação e a zona de perigo, para a exclusão ser a última coisa da seção. A conta sem senha (`askPrivacyChannel`) mostra o bloco de canal de privacidade com tom padrão, porque ele não tem ação destrutiva.
- **Confirmações destrutivas:** `AlertDialogAction variant="destructive"` em desvincular (`AccountSignInMethodsPanel.tsx:196`), encerrar outras sessões (`AccountSessionsPanel.tsx:167`) e sair de todos (`AccountSecurityForm.tsx:152`); botão de confirmar `variant="destructive"` na exclusão. O `AlertDialogAction` já aceita `variant` (`packages/design-system/components/ui/alert-dialog.tsx:152-166`). Os gatilhos dessas ações continuam `outline`; o corte pede estilo destrutivo no botão de confirmação.
- **Contrato com a fatia 3 do MFA:** o segundo fator entra como mais uma `SettingsSection` em `AccountSecurityForm.tsx`, entre "Senha" e "Sessões ativas".

#### 5.4 Menu lateral: ativo com query e grupo aberto

- Hoje `isActive` compara só o `pathname` (`ui/Sidebar.tsx:70-71`), e os itens de Configurações apontam para `/account?tab=…` (`(common)/paths.ts:46-66`). O grupo abre só no estado inicial (`defaultOpen={branchActive}`, `Sidebar.tsx:108-111`), e o `GlobalSidebar` vive no layout e não remonta ao navegar.
- Depois: `isNavUrlActive(url, pathname, searchParams)`. Sem query no `url`, a regra é a de hoje (igual ou prefixo). Com query, o `pathname` tem de ser igual e cada parâmetro do `url` tem de bater com o atual. Itens do admin não têm query e não mudam.
- O grupo vira um `NavBranch` controlado, que abre quando passa a estar ativo (ajuste durante o render, sem `useEffect`) e segue fechável pelo usuário.
- O `Link` ativo ganha `aria-current="page"`. O `SidebarMenuSubButton` só põe `data-active` (`packages/design-system/components/ui/sidebar.tsx:713`).
- **Rótulos:** os itens passam a usar `routes.account.<tab>.label`, que já vem de `account.tabs.*` (`(common)/paths.ts:46-66`). `settingsItems` sai do dicionário. "Geral" vira "Perfil" (en "General" → "Profile", es "General" → "Perfil").
- `GlobalSidebar` passa a chamar `useSearchParams()`. As rotas autenticadas são dinâmicas (o layout lê cookie em `(common)/layout.tsx:46`), então não há pré-renderização estática que exija `Suspense`. O `pnpm --filter app build` confirma; se reclamar, a parte que lê a query vira um filho dentro de `Suspense` com o menu sem estado ativo de fallback.

#### 5.5 Padrão único de página

**Hoje:** só as duas home têm `h1`, escrito à mão (`(common)/(pages)/(components)/CommonHomeClient.tsx:171`, `(admin)/(pages)/(components)/AdminHomeClient.tsx:67`). O `Header` tem só breadcrumb e padding dobrado (`ui/Header.tsx:24` e `:25`). O `Container` não tem largura máxima (`ui/Container.tsx:141`) e a carga ocupa a tela inteira no celular (`:27`). O espaçamento é `gap-6` na home, `gap-4` em entidades (`EntitiesListClient.tsx:158`) e `gap-8` na equipe (`OrganizationClient.tsx:36`). O `AddButton` é `outline` (`add-button.tsx:21`).

**Depois:**

- `Header` continua sendo a barra de 64 px com breadcrumb; sai o `px-4` interno (`Header.tsx:25`), e o breadcrumb alinha com o conteúdo.
- `Container` ganha `header?: ReactNode`, renderizado acima do corpo **inclusive** durante `loading` e `loadError`, e `width?: "full" | "narrow"`. `narrow` = `max-w-4xl` (56 rem), alinhado à esquerda. A carga passa a `min-h-[50vh]`, a mesma altura mínima do corpo.
- `PageHeader`: `h1` (`font-semibold text-2xl tracking-tight`, a classe das home), descrição `text-muted-foreground text-sm`, ações à direita no desktop e abaixo do título no celular.
- Espaçamento: `pb-6` entre cabeçalho e corpo; `gap-6` em toda pilha de página (entidades e equipe ajustam).
- `AddButton` passa a `variant="default"` (primário). Afeta entidades e usuários, os dois únicos usos (`EntitiesListClient.tsx:151`, `UsersListClient.tsx:181`), e sai do `sideElement` do `Header` para as ações do `PageHeader`.
- Breadcrumb continua no `Header`, com o mesmo corte de níveis abaixo de `md`; deixa de ser o único lugar do nome da página.

| Tela | Arquivo | `title` | `description` | `actions` | `width` |
|------|---------|---------|---------------|-----------|---------|
| Home comum | `CommonHomeClient.tsx` | `homePage.greeting…` (o `greeting` atual) | `homePage.subtitle` | — | full |
| Entidades | `entities/(pages)/(home)/EntitiesListClient.tsx` | `routes.entities.list.label` | — | `AddButton` | full |
| Nova entidade | `entities/(pages)/create/page.tsx` | `routes.entities.create.label` | — | — | narrow |
| Editar entidade | `entities/(pages)/edit/[id]/EditEntityClient.tsx` | `routes.entities.update(id).label` | — | — | narrow |
| Equipe | `organization/OrganizationClient.tsx` | `routes.organization.label` | `organizationCopy.description` (sai do `<p>` em `:38-40`) | — | full |
| Conta | `account/(pages)/(home)/AccountClient.tsx` | `accountCopy.title` | `accountCopy.subtitle` (sai do `<p>` em `:30-32`) | — | narrow |
| Home admin | `AdminHomeClient.tsx` | `greeting` atual | `homePage.subtitle` | — | full |
| Usuários | `users/(pages)/(home)/UsersListClient.tsx` | `routes.users.list.label` | — | `AddButton` | full |
| Criar usuário | `users/(pages)/create/page.tsx` | `routes.users.create.label` | — | — | narrow |
| Editar usuário | `users/(pages)/edit/[id]/page.tsx` | `routes.users.update(id).label` | — | — | narrow |
| Auditoria | `audit/(pages)/(home)/AuditListClient.tsx` | `routes.audit.list.label` | — | — | full |

Cada tela continua com um único `h1`: os testes `commonHomeClient.test.tsx:141` e `adminHomeClient.test.tsx:106` e o E2E (`a11yDark.spec.ts:89`, `panelSwitch.spec.ts:18`, `signIn.spec.ts:46`) buscam `heading level 1` em modo estrito.

**`loading.tsx` coerente.** Hoje os oito `loading.tsx` usam `pt-6` sem a faixa do cabeçalho, enquanto a tela real tem `pt-0` sob 64 px de `Header` (`(admin)/(pages)/loading.tsx:5`, `entities/(pages)/edit/[id]/loading.tsx:8`). O `PageSkeleton` desenha a faixa de 64 px com o breadcrumb, o título (`h-8`, a altura da linha de `text-2xl`), a descrição opcional (`h-5`) e o botão opcional (`h-9`), com o mesmo padding e a mesma largura do `Container`. Os corpos continuam sendo `TableSkeleton`/`FormSkeleton`/o que já existe; o desenho fiel de cada tela está fora do corte.

| `loading.tsx` | `description` | `actions` | `width` | corpo |
|---------------|---------------|-----------|---------|-------|
| `(common)/(pages)/loading.tsx` | sim | — | full | cards e gráfico atuais |
| `entities/(pages)/(home)/loading.tsx` | — | sim | full | `TableSkeleton` |
| `entities/(pages)/edit/[id]/loading.tsx` | — | — | narrow | painel + `FormSkeleton` |
| `organization/loading.tsx` | sim | — | full | `TableSkeleton` |
| `account/(pages)/(home)/loading.tsx` | sim | — | narrow | select (< `lg`), coluna de 5 itens (≥ `lg`), título de seção e um bloco |
| `(admin)/(pages)/loading.tsx` | sim | — | full | três cards atuais |
| `users/(pages)/(home)/loading.tsx` | — | sim | full | `TableSkeleton` |
| `audit/(pages)/(home)/loading.tsx` | — | — | full | filtros + `TableSkeleton` |

#### 5.6 Rotas, dados, formulários

- Nenhuma rota nova, nenhum `queryKeys`, nenhum hook novo. O prefetch RSC da conta (`account/(pages)/(home)/page.tsx`) não muda.
- Formulários: mesmos campos e componentes `HookForm*`; só muda o invólucro (bloco + `Footer sticky={false}`).
- Estados: `PageHeader` aparece no carregamento e no erro; o `Container` continua mostrando `LoadErrorState` no corpo.

#### 5.7 i18n e a11y

- Toda copy nova em `@repo/internationalization`, nos três idiomas (§10.5). O `aria-label` da lista de seções e o rótulo `sr-only` do select usam a mesma chave.
- `SettingsSection` vira região com nome (`section` + `aria-labelledby` no `h3`), o mesmo padrão de `AccountSignInMethodsPanel.tsx:108-113`.
- Alvo de toque: gatilhos de aba na vertical passam a `py-2` (cerca de 36 px), acima dos 24 px do SC 2.5.8.

---

### 6. Autorização e segurança

- Nenhuma regra de autorização muda; tudo é apresentação. Guards e o redirecionamento do admin para `/admin` (`(common)/layout.tsx:47-52`) seguem iguais.
- **Impersonação:** a leitura somente da conta continua pelos `disabled={isImpersonating}` de cada ação, que vão junto para os blocos. O aviso de somente leitura continua visível na conta, agora no topo do conteúdo. O admin personificando vê o menu comum, e o item ativo funciona igual.
- `accountTabHref` só copia os parâmetros que já estão na URL da própria página e troca `tab` por um valor da lista fechada (`resolveAccountTab`). Não há redirecionamento para fora nem valor livre na URL.

---

### 7. Testes (Vitest, `apps/app/__tests__/`)

Todos no nível de unidade ou componente com `vi.mock` de `next/navigation`. A integração com o router do Next (o `replaceState` atualizando `useSearchParams` e o `Link` do menu trocando a aba) o jsdom não prova; isso vai para o E2E de §7.2.

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `accountTabRouting.test.ts` *(novo)* | puro | `resolveAccountTab` aceita as cinco, cai em `profile` para ausente/inválido e para `billing` no `simple`; `accountTabHref` troca só `tab` e preserva `checkout` e `plan`. |
| `accountTabs.test.tsx` *(substitui `accountTabsOverflow.test.tsx`)* | componente | `tablist` com `aria-orientation="vertical"` e cinco abas (quatro no `simple`); select com as mesmas opções; **re-render com outro `useSearchParams` troca a aba selecionada** (regressão do E9); clicar numa aba chama `history.replaceState` com `?tab=security&checkout=success` preservado; URL sem `tab` dispara a normalização para `?tab=profile`; cada painel tem `h2` com o rótulo da seção. Os quatro casos de modo de produto de hoje (`accountTabsOverflow.test.tsx:107-145`) migram para cá. |
| `navActive.test.ts` *(novo)* | puro | Sem query: igual e prefixo; com query: exige `pathname` igual e todos os parâmetros; `#` nunca ativa; parâmetro extra na URL atual não impede. |
| `sidebarActiveQuery.test.tsx` *(novo)* | componente | Com `pathname=/pt-br/account` e `tab=security`, o link "Segurança" tem `aria-current="page"` e o grupo está aberto; ao trocar para `tab=privacy` o ativo muda; vindo de `/pt-br/entities` com o grupo fechado, navegar para a conta abre o grupo. |
| `sidebarBrand.test.tsx` | ajuste | Mock de `next/navigation` (`:7-10`) ganha `useSearchParams`. |
| `commonNavRoutes.test.tsx` | ajuste | Novo caso: títulos dos itens de Configurações iguais a `account.tabs.*` ("Perfil", não "Geral"). |
| `pageShell.test.tsx` *(novo)* | componente | `PageHeader` renderiza um `h1`, descrição e ações só quando passadas; `Container` mostra o `header` com `loading` e com `loadError`; `width="narrow"` aplica a classe de largura. |
| `settingsSection.test.tsx` *(novo)* | componente | Região nomeada pelo `h3`, descrição, `tone="destructive"` com `data-tone`. |
| `sharedFooterPendingState.test.tsx` | ajuste | `sticky={false}` sem a classe `sticky` e ainda bloqueando o envio com `isLoading`. |
| `accountSecurityForm.test.tsx`, `accountSessionsPanel.test.tsx`, `accountSignInMethodsPanel.test.tsx` | ajuste | Botão de confirmação com `data-variant="destructive"`; o resto busca por nome e deve passar sem mudança. |
| `accountPrivacyPanel.test.tsx` | ajuste | Confirmar exclusão com `data-variant="destructive"`; o bloco de exclusão vem depois do de exportação no DOM. Os casos de cancelar/confirmar por nome (`:139-171`) seguem válidos com `AlertDialogFooter`. |
| `accountEmailChangeDialog.test.tsx` | sem mudança esperada | Os botões mantêm nome e tipo; rodar. |
| `accountBillingPanel.test.tsx` | sem mudança esperada | Não lê `billing.description`; rodar. |

Nenhum teste com emulador. Nenhuma infra é objeto de teste aqui.

#### 7.2 E2E (`apps/e2e`)

- **Seletores atuais:** `entityCrud.spec.ts:30` e `panelSwitch.spec.ts` procuram o botão "Adicionar" por nome; ele muda de lugar e de variante, não de nome. As buscas por `heading level 1` continuam com um `h1` por tela. `organizationOwnership.spec.ts` busca títulos de bloco da equipe que não mudam. Nenhum E2E percorre a conta hoje.
- **`a11yDark.spec.ts`** (`:56-80`): três rotas novas no grupo do usuário comum, `/${LOCALE}/account`, `?tab=security` e `?tab=privacy`, com `ready` = `heading level 1` com `ptBr.apps.app.pages.common.account.title`. Cobrança fica de fora: no stack do E2E a Stripe não está configurada, e a seção mostra só o placeholder.
- **`accountSettings.spec.ts`** *(novo, usuário comum)*: abre `?tab=security`; clica no link "Privacidade" do menu lateral; espera a URL com `tab=privacy`, o `h2` da seção visível e o link com `aria-current="page"`; clica na aba "Preferências" e espera `tab=preferences`; abre `?tab=billing&checkout=canceled` e espera a aba cobrança selecionada e a URL ainda com `checkout=canceled`. **O que prova que o unitário não prova:** que o `replaceState` atualiza `useSearchParams` no router real do Next 16 e que o `Link` do menu troca a aba sem recarregar. Se isso quebrar, o clique nas abas para de funcionar, e o mock do Vitest não perceberia.

---

### 8. O que o `/test` vai percorrer

Usuário comum do seed, light e dark, 375 px e 1280 px, pt-br, en e es, salvo indicação.

1. **Navegação da conta.** `/account` vira `?tab=profile` e "Perfil" aparece ativo no menu. Em cada seção, conferir a 375 px que o select cabe sem rolagem lateral e, a 1280 px, que a coluna não sobrepõe rótulos em en e es.
2. **Menu lateral com a conta aberta.** Clicar em cada item de Configurações troca a seção e move o ativo; o grupo abre ao chegar vindo de Entidades.
3. **Deep links.** `/<locale>/account?tab=billing&checkout=success` cai em cobrança com a URL intacta. O aviso do checkout só aparece com Stripe configurada; sem ela, fica 🔒. `?tab=billing&plan=<priceId>` mantém o `plan`.
4. **Blocos.** Cada bloco com título lido como heading (árvore de acessibilidade), descrição e salvar ao lado do conteúdo. Salvar perfil, senha e preferências mostra carga no botão do próprio bloco.
5. **Zona de perigo.** Privacidade: "Excluir minha conta" por último, borda destrutiva; confirmar destrutivo no diálogo. Conta só com Google: bloco de canal de privacidade sem tom destrutivo (produzir desvinculando "E-mail e senha" numa conta de QA que tenha Google, ou pular como 🔒 sem Google no ambiente).
6. **Confirmações destrutivas.** Desvincular, encerrar outras sessões (precisa de duas sessões: entrar num segundo navegador/perfil) e sair de todos. Cancelar nas três sem executar a ação.
7. **Diálogos.** Trocar e-mail e excluir conta: rodapé do diálogo empilhado a 375 px, cancelar não envia o formulário, foco abre no primeiro campo e volta ao gatilho.
8. **Padrão de página.** As 11 telas da tabela de §5.5: `h1` no mesmo lugar, breadcrumb alinhado ao conteúdo, "Adicionar" com destaque primário, largura limitada nos formulários a 1280 px.
9. **Carga sem salto.** Com rede lenta (throttle do agent-browser), cada rota com `loading.tsx` não desloca título e breadcrumb ao trocar o skeleton pelo conteúdo.
10. **Admin e impersonação.** Admin nas quatro telas do admin; admin personificando um usuário comum na conta: aviso de somente leitura no topo do conteúdo, ações desabilitadas, menu marcando o ativo.
11. **Modo `simple`** (subir com `NEXT_PUBLIC_PRODUCT_MODE=simple`): sem cobrança na navegação da conta e no menu; `?tab=billing` vira `?tab=profile`.

Fica 🔒 sem infra externa: o aviso de checkout com plano real (Stripe) e o vínculo com Google sem as credenciais OAuth.

### 9. Critérios de aceite

O `/test` gera em `test/criterios-aceite.md` no formato §9.1, a partir de §8 e dos "Sinais de pronto" da spec. Casos obrigatórios: anterior × posterior do E9 (aba que não trocava), modo `simple` com `?tab=billing`, parâmetro inválido (`?tab=xyz`), duplo clique em salvar de cada bloco, impersonação, e a ausência de rolagem lateral a 375 px nos três idiomas.

---

## Etapa 2: blueprint técnico

### 10.1 Árvore de arquivos

```
packages/design-system/components/ui/
  add-button.tsx                          ~ variant "outline" → "default"

apps/app/shared/components/ui/
  pageLayout.ts                           + constantes de largura e respiro
  PageHeader.tsx                          + h1, descrição, ações
  PageSkeleton.tsx                        + faixa do Header + título de carga
  SettingsSection.tsx                     + bloco com heading, descrição, tom
  Container.tsx                           ~ header, width, altura da carga
  Header.tsx                              ~ sem o px-4 interno
  Footer.tsx                              ~ prop sticky
  Sidebar.tsx                             ~ ativo com query, NavBranch, aria-current
apps/app/shared/lib/
  navActive.ts                            + isNavUrlActive

apps/app/app/[locale]/(authenticated)/(common)/
  routes.tsx                              ~ rótulos de Configurações = account.tabs
  (pages)/loading.tsx                     ~ PageSkeleton
  (pages)/(components)/CommonHomeClient.tsx          ~ PageHeader
  (pages)/entities/(pages)/(home)/EntitiesListClient.tsx  ~ PageHeader + AddButton nas ações, gap-6
  (pages)/entities/(pages)/(home)/loading.tsx        ~ PageSkeleton
  (pages)/entities/(pages)/create/page.tsx           ~ PageHeader, narrow
  (pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx ~ PageHeader, narrow
  (pages)/entities/(pages)/edit/[id]/loading.tsx     ~ PageSkeleton
  (pages)/organization/OrganizationClient.tsx        ~ PageHeader, gap-6
  (pages)/organization/loading.tsx                   ~ PageSkeleton
  (pages)/organization/(components)/InviteMemberForm.tsx  ~ Footer sticky={false}
  (pages)/account/(pages)/(home)/AccountClient.tsx   ~ PageHeader, narrow
  (pages)/account/(pages)/(home)/loading.tsx         ~ PageSkeleton da conta
  (pages)/account/(components)/accountTabRouting.ts  + valores, resolve, href
  (pages)/account/(components)/AccountTabs.tsx       ~ aba derivada da URL, vertical + select, cabeçalho de seção
  (pages)/account/(components)/AccountProfileForm.tsx     ~ dois blocos
  (pages)/account/(components)/AccountSecurityForm.tsx    ~ blocos Senha e Sair de todos
  (pages)/account/(components)/AccountPasswordSetForm.tsx ~ bloco
  (pages)/account/(components)/AccountSignInMethodsPanel.tsx ~ SettingsSection, confirmar destrutivo
  (pages)/account/(components)/AccountSessionsPanel.tsx   ~ SettingsSection, confirmar destrutivo
  (pages)/account/(components)/AccountPreferencesForm.tsx ~ bloco
  (pages)/account/(components)/AccountPrivacyPanel.tsx    ~ blocos, zona de perigo, AlertDialogFooter
  (pages)/account/(components)/AccountEmailChangeDialog.tsx ~ AlertDialogFooter
  (pages)/account/(components)/AccountBillingPanel.tsx    ~ sem descrição própria, h3 no plano, grade em 2

apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/
  loading.tsx                             ~ PageSkeleton
  (components)/AdminHomeClient.tsx        ~ PageHeader
  users/(pages)/(home)/UsersListClient.tsx  ~ PageHeader + AddButton nas ações
  users/(pages)/(home)/loading.tsx        ~ PageSkeleton
  users/(pages)/create/page.tsx           ~ PageHeader, narrow
  users/(pages)/edit/[id]/page.tsx        ~ PageHeader, narrow
  audit/(pages)/(home)/AuditListClient.tsx  ~ PageHeader
  audit/(pages)/(home)/loading.tsx        ~ PageSkeleton

apps/app/__tests__/   (ver §7)
apps/e2e/tests/
  accountSettings.spec.ts                 + navegação da conta pela URL
  a11yDark.spec.ts                        ~ três rotas da conta

packages/internationalization/translations/apps/app/pages/common/
  account.ts                              ~ sections, sectionNav, blocos novos; move billing/privacy.description
  routes/index.ts                         ~ remove settingsItems

apps/app/CLAUDE.md                        ~ PageHeader, SettingsSection, Footer sticky
```

### 10.2 Pseudo-diff: derivação da aba pela URL

```ts
// account/(components)/accountTabRouting.ts
import { isSubscriptionMode } from "@repo/next-config/product-mode";

const allAccountTabValues = ["profile", "security", "preferences", "billing", "privacy"] as const;
export type AccountTabValue = (typeof allAccountTabValues)[number];

// A product without subscriptions has nothing to bill, so the section is not offered
// and a link to `?tab=billing` lands on the profile.
export const accountTabValues: readonly AccountTabValue[] = isSubscriptionMode()
    ? allAccountTabValues
    : allAccountTabValues.filter((value) => value !== "billing");

export const resolveAccountTab = (raw: string | null): AccountTabValue =>
    accountTabValues.includes(raw as AccountTabValue) ? (raw as AccountTabValue) : "profile";

export const accountTabHref = (
    pathname: string,
    searchParams: Pick<URLSearchParams, "toString">,
    tab: AccountTabValue
) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    return `${pathname}?${params.toString()}`;
};
```

```diff
 // account/(components)/AccountTabs.tsx
-    const [activeTab, setActiveTab] = useState(() =>
-        resolveTab(searchParams.get("tab"))
-    );
-    const selectTab = (value: string) => {
-        const tab = resolveTab(value);
-        setActiveTab(tab);
-        window.history.replaceState(null, "", `${pathname}?tab=${tab}`);
-    };
+    const requestedTab = searchParams.get("tab");
+    const activeTab = resolveAccountTab(requestedTab);
+
+    // Next keeps useSearchParams in sync with the History API, so the section follows
+    // the URL without a router navigation re-rendering the page on the server.
+    const selectTab = (value: string) => {
+        window.history.replaceState(null, "", accountTabHref(pathname, searchParams, resolveAccountTab(value)));
+    };
+
+    useEffect(() => {
+        if (requestedTab !== activeTab) {
+            window.history.replaceState(null, "", accountTabHref(pathname, searchParams, activeTab));
+        }
+    }, [requestedTab, activeTab, pathname, searchParams]);
```

O comentário de `AccountTabs.tsx:55-57` é substituído pelo acima. O de `:31-32` vai junto com a lista para `accountTabRouting.ts`.

### 10.3 Pseudo-diff: layout responsivo das Tabs

```tsx
// account/(components)/AccountTabs.tsx (render)
<Tabs
    className="flex-col gap-6 lg:flex-row lg:items-start lg:gap-10"
    onValueChange={selectTab}
    orientation="vertical"
    value={activeTab}
>
    <div className="lg:hidden">
        <Label className="sr-only" htmlFor={sectionSelectId}>{accountCopy.sectionNav.label}</Label>
        <NativeSelect
            className="min-w-56"
            id={sectionSelectId}
            onChange={(event) => selectTab(event.target.value)}
            value={activeTab}
        >
            {accountTabValues.map((value) => (
                <NativeSelectOption key={value} value={value}>{accountCopy.tabs[value]}</NativeSelectOption>
            ))}
        </NativeSelect>
    </div>

    <TabsList
        aria-label={accountCopy.sectionNav.label}
        className="hidden w-48 shrink-0 items-stretch lg:flex"
        variant="line"
    >
        {accountTabValues.map((value) => (
            <TabsTrigger className="justify-start whitespace-normal px-3 py-2 text-left" key={value} value={value}>
                {accountCopy.tabs[value]}
            </TabsTrigger>
        ))}
    </TabsList>

    <div className="flex min-w-0 flex-1 flex-col gap-6">
        <ImpersonationReadOnlyNotice />
        {accountTabValues.map((value) => (
            <TabsContent className="flex flex-col gap-6" key={value} value={value}>
                <AccountSectionHeading description={accountCopy.sections[value]} title={accountCopy.tabs[value]} />
                {sectionContent[value]}
            </TabsContent>
        ))}
    </div>
</Tabs>
```

`sectionContent` é um `Record<AccountTabValue, ReactNode>` montado no próprio componente; `AccountSectionHeading` é um `h2` + `p` local ao arquivo (não precisa de módulo próprio). `cn` resolve `w-fit`/`w-48`, `inline-flex`/`hidden` e `items-center`/`items-stretch` a favor da classe passada.

### 10.4 Pseudo-diff: ativo do Sidebar com query

```ts
// apps/app/shared/lib/navActive.ts
type SearchParamsLike = Pick<URLSearchParams, "get">;

export function isNavUrlActive(url: string, pathname: string, searchParams: SearchParamsLike) {
    if (url === "#") {
        return false;
    }
    const [path, query] = url.split("?");
    if (!query) {
        return pathname === path || pathname.startsWith(`${path}/`);
    }
    if (pathname !== path) {
        return false;
    }
    return [...new URLSearchParams(query)].every(([key, value]) => searchParams.get(key) === value);
}
```

```diff
 // ui/Sidebar.tsx
-import { usePathname } from "next/navigation";
+import { usePathname, useSearchParams } from "next/navigation";
+import { isNavUrlActive } from "@/shared/lib/navActive";
 ...
     const pathname = usePathname();
+    const searchParams = useSearchParams();
-    const isActive = (url: string) =>
-        url !== "#" && (pathname === url || pathname.startsWith(`${url}/`));
+    const isActive = (url: string) => isNavUrlActive(url, pathname, searchParams);
 ...
-        <Collapsible asChild defaultOpen={branchActive} key={item.title}>
+        <NavBranch isActive={isActive} item={item} key={item.title} />
```

```tsx
function NavBranch({ item, isActive }: { item: NavMainBranch; isActive: (url: string) => boolean }) {
    const branchActive = item.items.some((subItem) => isActive(subItem.url));
    const [open, setOpen] = useState(branchActive);
    const [wasActive, setWasActive] = useState(branchActive);
    // The sidebar lives in the layout and survives navigation, so arriving at one of the
    // branch's pages has to open it; closing it by hand stays possible afterwards.
    if (branchActive !== wasActive) {
        setWasActive(branchActive);
        if (branchActive) {
            setOpen(true);
        }
    }
    return (
        <Collapsible asChild onOpenChange={setOpen} open={open}>
            {/* gatilho igual ao atual; em cada sub-item: */}
            <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                <Link aria-current={isActive(subItem.url) ? "page" : undefined} href={subItem.url}>…</Link>
            </SidebarMenuSubButton>
        </Collapsible>
    );
}
```

O item folha (`Sidebar.tsx:170-183`) também ganha `aria-current` quando ativo.

### 10.5 Pseudo-diff: shell de página

```ts
// ui/pageLayout.ts
export const PAGE_BODY_CLASS = "flex max-w-full flex-1 flex-col gap-0 p-4 pt-0";
export const PAGE_NARROW_CLASS = "w-full max-w-4xl";
export const PAGE_HEADER_SPACING_CLASS = "pb-6";
```

```tsx
// ui/PageHeader.tsx (Server Component, sem "use client")
type PageHeaderProps = { title: string; description?: ReactNode; actions?: ReactNode };

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
                <h1 className="font-semibold text-2xl tracking-tight">{title}</h1>
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}
```

```diff
 // ui/Container.tsx
 type ContainerProps = {
     ...
+    header?: React.ReactNode;
+    width?: "full" | "narrow";
 };
 function LoadingPanel() {
-        <div className="flex min-h-screen w-full flex-1 items-center justify-center rounded-xl bg-muted/50 p-4 md:min-h-min">
+        <div className="flex min-h-[50vh] w-full flex-1 items-center justify-center rounded-xl bg-muted/50 p-4">
 ...
-        <div className={cn("flex max-w-full flex-1 flex-col gap-0 p-4 pt-0", className)}>
-            {renderBody()}
+        <div className={cn(PAGE_BODY_CLASS, width === "narrow" && PAGE_NARROW_CLASS, className)}>
+            {header ? <div className={PAGE_HEADER_SPACING_CLASS}>{header}</div> : null}
+            {renderBody()}
         </div>
```

Os `Container` aninhados com `className="p-0"` (criar/editar entidade e usuário) não recebem `header` nem `width`; só o externo recebe.

```diff
 // ui/Header.tsx
     <header className="flex h-16 shrink-0 items-center justify-between gap-2 px-4">
-        <div className="flex items-center gap-2 px-4">
+        <div className="flex items-center gap-2">
```

```diff
 // ui/Footer.tsx
 export type FooterProps = {
     ...
+    /** False renders the actions inline, inside the block or dialog that owns them. */
+    sticky?: boolean;
 };
-            className={cn(
-                "sticky bottom-0 z-10 mt-4 flex w-full flex-wrap items-center justify-end gap-3 border-border border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80",
-                className
-            )}
+            className={cn(
+                "mt-4 flex w-full flex-wrap items-center justify-end gap-3",
+                sticky &&
+                    "sticky bottom-0 z-10 border-border border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80",
+                className
+            )}
```

```tsx
// ui/SettingsSection.tsx
type SettingsSectionProps = {
    title: string;
    description?: ReactNode;
    tone?: "default" | "destructive";
    children: ReactNode;
};

export function SettingsSection({ title, description, tone = "default", children }: SettingsSectionProps) {
    const titleId = useId();
    return (
        <section
            aria-labelledby={titleId}
            className={cn(
                "flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground sm:p-6",
                tone === "destructive" && "border-destructive/50"
            )}
            data-tone={tone}
        >
            <div className="flex flex-col gap-1">
                <h3 className={cn("font-semibold leading-none", tone === "destructive" && "text-destructive")} id={titleId}>
                    {title}
                </h3>
                {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
            </div>
            {children}
        </section>
    );
}
```

`useId` exige `"use client"` no arquivo; os consumidores já são client.

```tsx
// ui/PageSkeleton.tsx
type PageSkeletonProps = { description?: boolean; actions?: boolean; width?: "full" | "narrow"; children?: ReactNode };

export function PageSkeleton({ description = false, actions = false, width = "full", children }: PageSkeletonProps) {
    return (
        <>
            <div className="flex h-16 shrink-0 items-center px-4">
                <Skeleton className="h-4 w-40" />
            </div>
            <div className={cn(PAGE_BODY_CLASS, width === "narrow" && PAGE_NARROW_CLASS)}>
                <div className={cn("flex items-start justify-between gap-4", PAGE_HEADER_SPACING_CLASS)}>
                    <div className="flex flex-col gap-1">
                        <Skeleton className="h-8 w-56" />
                        {description ? <Skeleton className="h-5 w-72" /> : null}
                    </div>
                    {actions ? <Skeleton className="h-9 w-28" /> : null}
                </div>
                {children}
            </div>
        </>
    );
}
```

### 10.6 Exemplos de adaptação

```diff
 // entities/(pages)/(home)/EntitiesListClient.tsx
             <Header
                 breadcrumbs={[{ label: routes.root.label, href: routes.root.url }]}
                 page={routes.entities.list.label}
-                sideElement={
-                    <AddButton ... />
-                }
             />
-            <Container loadError={listLoadError} loading={isLoading}>
-                <div className="mx-auto flex w-full flex-col gap-4">
+            <Container
+                header={
+                    <PageHeader
+                        actions={<AddButton disabled={isImpersonating} onClick={() => router.push(routes.entities.create.url)} />}
+                        title={routes.entities.list.label}
+                    />
+                }
+                loadError={listLoadError}
+                loading={isLoading}
+            >
+                <div className="mx-auto flex w-full flex-col gap-6">
```

```diff
 // account/(components)/AccountSecurityForm.tsx (bloco Senha)
-                <Form {...form}>
-                    <form className="flex w-full flex-col" onSubmit={form.handleSubmit(onSubmit)}>
-                        <p className="mb-4 text-muted-foreground text-sm">{accountSecurity.description}</p>
+                <SettingsSection description={accountSecurity.description} title={accountSecurity.passwordTitle}>
+                    <Form {...form}>
+                        <form className="flex w-full flex-col" onSubmit={form.handleSubmit(onSubmit)}>
                             <FormContainer>…</FormContainer>
-                        <Footer confirmLabel={accountSecurity.save} … showBack={false} />
+                            <Footer confirmLabel={accountSecurity.save} … showBack={false} sticky={false} />
+                        </form>
+                    </Form>
+                </SettingsSection>
 ...
-                            <AlertDialogAction onClick={…}>
+                            <AlertDialogAction onClick={…} variant="destructive">
```

```diff
 // account/(components)/AccountPrivacyPanel.tsx (diálogo de exclusão)
-                                        <Footer
-                                            backLabel={deleteCopy.cancel}
-                                            confirmLabel={deleteCopy.confirm}
-                                            disabled={isImpersonating}
-                                            isLoading={deleteAccountMutation.isPending}
-                                            onBack={() => handleOpenChange(false)}
-                                        />
+                                        <AlertDialogFooter className="mt-4">
+                                            <Button onClick={() => handleOpenChange(false)} type="button" variant="outline">
+                                                {deleteCopy.cancel}
+                                            </Button>
+                                            <Button
+                                                disabled={isImpersonating}
+                                                loading={deleteAccountMutation.isPending}
+                                                type="submit"
+                                                variant="destructive"
+                                            >
+                                                {deleteCopy.confirm}
+                                            </Button>
+                                        </AlertDialogFooter>
```

```diff
 // (common)/routes.tsx
-        const settingsItems =
-            dictionary.apps.app.pages.common.routes.platform.settingsItems;
 ...
-                    { title: settingsItems.general, url: routes.account.profile.url },
+                    { title: routes.account.profile.label, url: routes.account.profile.url },
```

```diff
 // packages/design-system/components/ui/add-button.tsx
       icon={<PlusIcon className="size-4" />}
-      variant="outline"
+      variant="default"
```

### 10.7 i18n

Arquivo `packages/internationalization/translations/apps/app/pages/common/account.ts`, mesma estrutura nos três idiomas:

```ts
sectionNav: {
    label: "Seções da conta",              // en "Account sections" · es "Secciones de la cuenta"
},
sections: {
    profile: "Seus dados de exibição e o e-mail da conta.",
        // en "Your display details and the account email."
        // es "Tus datos de perfil y el correo de la cuenta."
    security: "Como você entra na conta e onde ela está aberta agora.",
        // en "How you sign in and where your account is signed in right now."
        // es "Cómo inicias sesión y dónde está abierta tu cuenta ahora."
    preferences: "Como o painel aparece para você.",
        // en "How the panel looks for you." · es "Cómo se ve el panel para ti."
    billing: <valor atual de billing.description, por idioma>,     // movido
    privacy: <valor atual de privacy.description, por idioma>,     // movido
},
profile: {
    details: {
        title: "Dados pessoais",            // en "Personal details" · es "Datos personales"
        description: "Nome, telefone e foto que a equipe vê.",
            // en "The name, phone and photo your team sees."
            // es "El nombre, el teléfono y la foto que ve tu equipo."
    },
    emailDescription: "Endereço usado para entrar e para receber os avisos da conta.",
        // en "The address you sign in with and where account notices go."
        // es "La dirección con la que inicias sesión y donde llegan los avisos de la cuenta."
},
security: {
    passwordTitle: "Senha",                 // en "Password" · es "Contraseña"
},
preferences: {
    title: "Tema e idioma",                 // en "Theme and language" · es "Tema e idioma"
},
```

- **Removidas:** `billing.description` e `privacy.description` (o valor vai para `sections.*`); `routes.platform.settingsItems` em `translations/apps/app/pages/common/routes/index.ts:15-21`, `:37-43` e `:59-65`.
- **Reaproveitadas:** `tabs.*` (títulos de seção e menu), `profile.email` (título do bloco de e-mail), `security.description`, `preferences.description`, `signInMethods.*`, `sessions.*`, `setPassword.*`, `signOutEverywhere*`, `privacy.export.*`, `privacy.delete.*`.
- **Nenhum `apiErrors` novo.** Paridade pelo `packages/internationalization/__tests__/parity.test.ts`; usar `/i18n-sync`.
- Em es, "Tema e idioma" usa "e" e não "y" porque a palavra seguinte começa com "i".

### 10.8 Ordem de implementação

Duas fases na mesma branch e no mesmo `/develop`. A F1 entrega o que a spec chama de dor medida (E9, abas sobrepostas, blocos); a F2 aplica o shell nas demais telas.

**F1: shell, menu e conta**

1. `add-button.tsx`.
2. `pageLayout.ts`, `PageHeader`, `PageSkeleton`, `SettingsSection`, `Container`, `Header`, `Footer` + `pageShell`, `settingsSection` e ajuste do teste do `Footer`.
3. `navActive.ts`, `Sidebar.tsx`, `routes.tsx` + `navActive`, `sidebarActiveQuery`, ajustes de `sidebarBrand` e `commonNavRoutes`.
4. `accountTabRouting.ts`, `AccountTabs.tsx`, `AccountClient.tsx`, `loading.tsx` da conta + `accountTabRouting`, `accountTabs`.
5. Painéis da conta e diálogos + ajustes dos testes da conta.
6. Chaves de i18n (sem elas o `typecheck` falha a partir do passo 3).

**F2: padrão nas demais telas**

7. Home comum, entidades (lista, criar, editar), equipe (+ `InviteMemberForm`) e os `loading.tsx` delas.
8. Home admin, usuários (lista, criar, editar), auditoria e os `loading.tsx` delas.
9. E2E: `accountSettings.spec.ts` e as três rotas no `a11yDark.spec.ts`.
10. `apps/app/CLAUDE.md`: seção "Páginas" (cabeçalho via `Container header` + `PageHeader`, `width="narrow"` em formulário e configurações, `PageSkeleton` nos `loading.tsx`) e, em "Formulários com ações no rodapé", quando usar `sticky={false}`; `SettingsSection` para blocos de configuração.

Gates ao fim: `pnpm check`, `pnpm --filter app typecheck`, `pnpm --filter app test`, `pnpm --filter @repo/internationalization test`, `pnpm --filter app build` (confirma o `useSearchParams` no `Sidebar`).

**Plano de commits** (proposta para o `/review`, um por pacote e por unidade, na ordem da regra):

1. `feat(design-system): give the add button the primary variant`
2. `feat(app): add page header, settings section and page skeleton to the shell`
3. `feat(app): mark settings items active from the query string`
4. `feat(app): derive the account section from the url with vertical navigation`
5. `feat(app): split account sections into titled blocks with a danger zone`
6. `feat(app): apply the page header to the common screens`
7. `feat(app): apply the page header to the admin screens`
8. `test(e2e): cover account navigation and its accessibility`
9. `feat(internationalization): add account section and block copy`
10. `docs(claude): document the page shell and settings blocks`
11. `docs(features): app-internal-ux-polish`

Os commits 3 a 7 usam chaves que só existem no 9; a regra de ordem do repositório aceita esse intervalo sem `typecheck` verde.

### 10.9 Env e config

Nenhuma variável nova. Nenhum ajuste por fork além de, se quiser, trocar a largura em `pageLayout.ts`.

---

## Riscos

- **Integração do `replaceState` com o router.** Se a sincronização do Next não acontecer em algum caso, o clique na aba para de trocar o painel, porque não há mais estado local. O E2E `accountSettings.spec.ts` cobre; o `/test` confere no navegador.
- **`useSearchParams` no `Sidebar`.** Pode exigir `Suspense` se alguma rota sob os layouts for pré-renderizada como estática. O `build` acusa; a saída está em §5.4.
- **Contraste do gatilho inativo.** A variante `line` usa `text-foreground/60` (`tabs.tsx:66`). A faixa horizontal atual já usa essa cor e passa no axe de outras telas, mas a conta nunca passou pelo axe. As três rotas novas no `a11yDark.spec.ts` medem isso.
- **Raio de impacto.** Cerca de 45 arquivos. As peças compartilhadas (`Container`, `Header`, `Footer`, `Sidebar`) mudam de forma aditiva: props novas com padrão igual ao comportamento atual, exceto o padding do `Header` e a altura da carga, que mudam para todas as telas que os usam, inclusive o `playground`.
- **Testes que fixam a estrutura atual:** `accountTabsOverflow.test.tsx` é substituído; os demais buscam por papel e nome e devem passar.

## Verificar no `/test`

Light e dark, 375 px e 1280 px, pt-br, en e es:

- [ ] Navegação da conta sem rolagem lateral nem sobreposição em cada idioma e largura.
- [ ] Clique no menu lateral e na aba troca a seção; ativo e grupo aberto acompanham; o botão voltar do navegador não acumula uma entrada por aba clicada.
- [ ] `?tab=billing&checkout=…&plan=…` preservados ao abrir e ao normalizar.
- [ ] Headings `h1` → `h2` → `h3` na árvore de acessibilidade da conta.
- [ ] Salvar de cada bloco junto do conteúdo, sem barra fixa na conta.
- [ ] Zona de perigo por último, com tom destrutivo legível no dark.
- [ ] Confirmações de desvincular, encerrar outras e sair de todos com botão destrutivo, legível no dark (`dark:bg-destructive/60`).
- [ ] Diálogos de trocar e-mail e excluir conta: cancelar não envia; rodapé empilhado a 375 px.
- [ ] Um `h1` por tela nas 11 telas; breadcrumb alinhado ao título; "Adicionar" primário.
- [ ] Nenhum salto entre `loading.tsx` e conteúdo nas oito rotas.
- [ ] Formulários de página inteira com `Footer` fixo (entidades, usuários): a 375 px, navegando com Tab, o campo focado não fica inteiro sob a barra (WCAG 2.2 SC 2.4.11). Se ficar, registrar como achado; não corrigir nesta tarefa (pergunta 2).
- [ ] Axe sem violação nova nas três rotas da conta (`a11yDark.spec.ts`).
- [ ] Admin personificando: aviso no topo da conta, ações desabilitadas.

## Decisões do usuário (2026-11-10)

As quatro perguntas em aberto foram respondidas no `/analyze`. Em todas o usuário ficou com a recomendação.

1. **Entrega:** F1 e F2 vão na mesma PR, num só `/develop`.
2. **`Footer` fixo:** a barra fixa sai só da conta, dos diálogos e do convite da equipe. Entidades, usuários e onboarding ficam como estão. Se o `/test` encontrar campo focado escondido atrás da barra (WCAG 2.4.11), isso vira tarefa direta.
3. **Encerrar uma sessão específica:** continua sem confirmação, com `outline` (`AccountSessionsPanel.tsx:93-109`).
4. **Zona de perigo:** sem título visível. A exclusão de conta se distingue por ficar por último na seção e pelo tom destrutivo.

## Perguntas em aberto

Nenhuma.
