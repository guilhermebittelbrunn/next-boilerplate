# Plano — foco escondido pela barra fixa nos formulários de página inteira

- **Slug:** `app-footer-focus-not-obscured`
- **Origem:** tarefa direta (sem spec). Achado 🟡 de `specs/BACKLOG.md`, seção "Achados da PR #62"
  (`specs/BACKLOG.md:1559`), repetido em "Tarefas diretas candidatas" (`specs/BACKLOG.md:317-318`) e como item 5
  da ordem da rodada (`specs/BACKLOG.md:288`).
- **Branch:** `feat/delivery-security-hardening` (a mesma da rodada; não trocar).
- **Modo:** autônomo, dentro do `/cycle`. Nenhuma pergunta feita; as decisões estão em "Perguntas em aberto".

## 1. Contexto

### 1.1 Problema

O `/test` da PR #62 mediu o defeito em editar entidade a 375×812: com o foco no rádio marcado do grupo
"Gênero", duas setas para baixo levam o foco e a seleção ao rádio "Outro", que fica 100% atrás da barra de ações
fixa (rádio de 764 a 780 px, barra de 743 a 812 px), sem nenhuma rolagem
(`docs/features/app-internal-ux-polish/test/report.md:93` e `:110-112`). Isso falha o WCAG 2.2 SC 2.4.11 Focus
Not Obscured (Minimum). O mesmo achado absorveu o 🟢 de 2026-10-14 sobre o campo de data de nascimento atrás do
rodapé de `/entities/edit`.

Quem navega por teclado (ou por leitor de tela com foco visível) seleciona uma opção que não vê. Num formulário
com rádio, a seta também **muda o valor**, então o usuário pode salvar um gênero que não confirmou visualmente.

### 1.2 Causa raiz (com evidência)

1. **O contêiner de rolagem do painel é o documento (`html`), não um `div`.** O `SidebarProvider` envolve o painel
   num `div` com `flex min-h-svh w-full`, sem `overflow` (`packages/design-system/components/ui/sidebar.tsx:165`),
   e o `SidebarInset` é um `<main>` com `relative flex w-full flex-1 flex-col`, também sem `overflow`
   (`sidebar.tsx:333-345`, usado em `apps/app/shared/components/ui/Sidebar.tsx:211`). O `ScrollToTopButton` lê
   `window.scrollY` (`apps/app/shared/components/ui/ScrollToTopButton.tsx:18`), o que confirma a leitura. O
   onboarding também rola no documento (`onboarding/(components)/OnboardingClient.tsx:150`, `min-h-dvh` sem
   `overflow`).
2. **A barra de ações é `sticky bottom-0` e por isso fica sobre o fim da viewport enquanto o formulário rola por
   baixo dela.** `Footer` é fixo por padrão (`apps/app/shared/components/ui/Footer.tsx:37`, `sticky = true`) com
   `sticky bottom-0 z-10 ... border-t ... py-4` (`Footer.tsx:51-52`). A altura medida, 69 px, bate com a conta:
   `border-t` 1 px + `py-4` 32 px + `Button` `h-9` 36 px (`packages/design-system/components/ui/button.tsx:24`).
3. **O navegador só rola o elemento focado quando ele está fora da viewport, e a viewport inclui a área coberta
   pela barra.** O rádio "Outro" estava dentro da viewport (780 < 812), então `focus()` não rolou nada. O Radix
   `RadioGroup` move o foco por roving focus, chamando `focus()` sem `preventScroll`; o navegador aplica a regra
   "rolar só se necessário" e não sabe que os últimos 69 px estão tampados.
4. **O mesmo vale para o topo.** O `Navbar` é `sticky top-0 z-40 h-16` (`apps/app/shared/components/ui/Navbar.tsx:20`)
   em todas as telas do painel comum e do admin (`(common)/layout.tsx:64`, `(admin)/admin/layout.tsx:52`). Um
   Shift+Tab subindo pelo formulário pode deixar o campo focado entre 0 e 64 px da viewport, atrás da barra de
   navegação, pelo mesmo motivo. O `/test` da PR #62 não mediu esse sentido.

Por que o Tab não reproduziu e a seta sim: com roving focus, só o rádio marcado é parada de Tab, e o Tab pulou o
"Outro". Os outros campos não estavam na faixa coberta naquela posição de rolagem. É coincidência de layout, não
garantia: qualquer campo pode cair na faixa de 69 px dependendo da rolagem.

### 1.3 O que não é a causa (descartado com evidência)

- **Falta de espaço no fim do formulário.** A barra é `sticky`, não `fixed`: ela ocupa o próprio espaço no fluxo,
  depois do formulário. O último campo sempre consegue rolar para cima dela. Por isso `padding-bottom` no
  `FormContainer` não corrige nada: o defeito está na decisão de rolar, não no espaço disponível. (A técnica C43
  do W3C põe `padding-bottom` no `html` porque o caso dela é um banner `fixed`, fora do fluxo.)

### 1.4 Objetivo e corte de MVP

Nenhum controle focado por teclado fica atrás da barra de ações fixa nem do `Navbar` nas telas do painel. A
correção mora na raiz (o documento e as barras compartilhadas), não em cada página, como manda a `cycle-policy`
§3 ("corrigir na raiz, não replicar workaround").

Corte:

1. `scroll-padding-bottom` no `html` enquanto houver uma barra de ações fixa no documento, e
   `scroll-padding-top` enquanto houver o `Navbar`, cada um do tamanho da barra mais uma folga para o anel de
   foco. Seletor `:has()` condicional, mesmo padrão que o repo já usa para o banner de cookies
   (`apps/app/app/[locale]/(unauthenticated)/layout.tsx:35`).
2. As três barras fixas do app publicam o mesmo atributo (`Footer` fixo, a barra do `Container` e o
   `PageFormFooter`), e o `Navbar` publica o dele.
3. Teste de componente ligando o seletor do `html` ao atributo que as barras publicam (padrão
   `apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx`).
4. Um E2E permanente que percorre o formulário de criar entidade a 375×812 por Tab, Shift+Tab e setas e mede
   `getBoundingClientRect` do foco contra as duas barras.
5. Uma linha no `apps/app/CLAUDE.md` ("Formulários com ações no rodapé") dizendo que barra fixa nova publica o
   atributo.

### 1.5 Fora de escopo

- **Banner de cookies** (`packages/design-system/components/ui/cookie-consent.tsx:116`, `data-cookie-banner`). É
  `fixed` e aparece também no painel enquanto o visitante não responde. Pode cobrir foco, mas é conteúdo
  dispensável pelo usuário, mora em `packages/` e a política de banner é outra discussão. Vira achado para o
  backlog (ver §11).
- **Toasts** (`ToastContainer` no root layout): transitórios, fora do SC no caso comum.
- **`ScrollToTopButton`** (`fixed right-4 bottom-4`, 44 px): só a playground usa
  (`(pages)/playground/page.tsx:1289`).
- **Unificar as três barras fixas num componente** (`Footer.tsx:51-52`, `Container.tsx:98`, `PageFormFooter.tsx:30`
  repetem a mesma string de classes). É dívida anterior; esta tarefa só acrescenta o atributo a cada uma. Vira
  achado 🟢.
- **Teclado virtual no celular.** Não há como emular no Chromium headless (ver §8.4).
- **Formulários com `sticky={false}`** (os quatro da conta e o convite da equipe): não têm barra fixa, não mudam.

### 1.6 Apps impactados

| área | impacto |
|------|---------|
| `apps/app` | sim: root layout, `Footer`, `Container`, `PageFormFooter`, `Navbar`, teste novo, `CLAUDE.md` |
| `apps/e2e` | sim: um spec novo |
| `apps/api`, `apps/web`, `packages/*` | não |

Área do painel: comum e admin. Modo de produto (`subscription` × `simple`): indiferente. Sem dependência de plano.

### 1.7 Telas afetadas (consumidores da barra fixa)

| tela | arquivo | barra |
|------|---------|-------|
| criar entidade | `(common)/(pages)/entities/(pages)/create/page.tsx:82` | `Footer` fixo |
| editar entidade | `(common)/(pages)/entities/(pages)/edit/[id]/EditEntityClient.tsx:129` | `Footer` fixo |
| criar usuário (admin) | `(admin)/admin/(pages)/users/(pages)/create/page.tsx:79` | `Footer` fixo |
| editar usuário (admin) | `(admin)/admin/(pages)/users/(pages)/edit/[id]/page.tsx:107` | `Footer` fixo |
| onboarding, passo de perfil | `onboarding/(components)/OnboardingProfileStep.tsx:66` | `Footer` fixo |
| onboarding, passo de preferências | `onboarding/(components)/OnboardingPreferencesStep.tsx:67` | `Footer` fixo |
| playground (só dev) | `(common)/(pages)/playground/page.tsx:560-580`, `:605-621`, `:642` | `Footer`, `PageFormFooter`, `Container showGoBack` |

Sem barra fixa e sem mudança: `account/(components)/Account{Profile,Preferences,Security,PasswordSet}Form.tsx` e
`organization/(components)/InviteMemberForm.tsx:66`, todos com `sticky={false}`. O `Navbar` existe em todas as
telas do painel comum e admin, então o `scroll-padding-top` vale para elas, inclusive listas.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo.

## 5. Front-end

### 5.1 Mecanismo escolhido

`scroll-padding` define a área útil da viewport que o navegador usa ao rolar um elemento para a vista, inclusive
quando ele recebe foco. Com `scroll-padding-bottom: 80px` no `html`, o navegador passa a tratar os últimos 80 px
como fora da vista e rola o campo focado para cima da barra. É a técnica C43 do W3C ("Using CSS scroll-padding to
un-obscure content"), listada como suficiente para os SC 2.4.11 e 2.4.12.

Aplicação condicional com `:has()`, para não mexer em telas sem barra:

```tsx
// apps/app/app/layout.tsx, no <html>
className={cn(
    fonts,
    "scroll-smooth has-[[data-panel-navbar]]:scroll-pt-20 has-[[data-sticky-action-bar]]:scroll-pb-20",
    ...
)}
```

- `scroll-pb-20` = 5rem = 80 px: barra de 69 px + 11 px de folga, que cobre o anel de foco de 3 px dos campos
  do design system. O alvo é o campo inteiro visível (o que o SC 2.4.12, nível AAA, pede), não só "não 100%
  coberto".
- `scroll-pt-20` = 80 px: `Navbar` de 64 px (`h-16`) + 16 px de folga.
- Classe no `html` do root layout, ao lado do `scroll-smooth` que já mora lá (`apps/app/app/layout.tsx:69`), e
  no estilo do repo (utilitária Tailwind, sem CSS solto em `styles.css`). A composição `has-*` já aparece no
  design system (`sidebar.tsx:165`, `has-data-[variant=inset]:bg-sidebar`). A forma explícita
  `has-[[data-…]]` segue o seletor do banner de cookies (`(unauthenticated)/layout.tsx:35`).
- Suporte: `:has()` existe em Chrome 105, Safari 15.4 e Firefox 121. O Tailwind 4 (`apps/app/package.json:50`,
  `^4.1.16`) já exige Safari 16.4, Chrome 111 e Firefox 128, então nenhum navegador que o app suporta fica de
  fora. Num navegador sem `:has()` a regra é ignorada e o comportamento volta ao de hoje.

**É hipótese até o `/test` medir** (`cycle-policy` §4, "correção sugerida por outro agent é hipótese"). A C43
confirma o mecanismo, mas o exemplo dela é um banner `fixed` a partir de 800 px de largura; o caso aqui é barra
`sticky` a 375 px. Plano B, se o Chromium não respeitar o `scroll-padding` no foco por seta: um listener de
`focusin` no `Footer` que mede a sobreposição e chama `window.scrollBy`. Só entra se a medição derrubar o plano A,
e com o desvio registrado no handoff.

### 5.2 Atributos publicados

| componente | onde | atributo | condição |
|------------|------|----------|----------|
| `Footer` | `Footer.tsx:48` (o `div` raiz) | `data-sticky-action-bar=""` | só quando `sticky` é `true` |
| `Container` | `Container.tsx:98` (`stickyBar`) | `data-sticky-action-bar=""` | sempre que a barra renderiza |
| `PageFormFooter` | `PageFormFooter.tsx:28` | `data-sticky-action-bar=""` | sempre (é sempre fixo) |
| `Navbar` | `Navbar.tsx:20` (`<nav>`) | `data-panel-navbar=""` | sempre |

Atributo próprio em vez de `data-slot`: o precedente do repo para esse padrão de `:has()` é o
`data-cookie-banner` (`cookie-consent.tsx:116`), e `data-slot` é convenção dos primitivos shadcn do design
system, que nenhum componente de `apps/app/shared/components/ui/` usa hoje.

### 5.3 Rotas, dados, formulários, tabelas

Nenhuma rota, hook, `queryKey`, campo ou tabela muda. Visualmente nada muda: a barra mantém altura, cor e
posição. A única diferença perceptível é a rolagem ao focar um campo perto das bordas.

### 5.4 i18n e a11y

i18n: N/A, nenhuma string nova. A11y: é o objeto da tarefa (SC 2.4.11; o alvo de 80 px atende também o 2.4.12).

## 6. Autorização e segurança

N/A. Impersonação: o `ImpersonationReadOnlyNotice` não é fixo e o formulário continua igual; a barra fixa aparece
com o botão desabilitado e recebe o mesmo atributo.

## 7. Testes

| # | nível | arquivo | o que prova |
|---|-------|---------|-------------|
| T1 | componente (jsdom) | `apps/app/__tests__/focusNotObscuredScrollPadding.test.tsx` (novo) | Lê o código de `app/layout.tsx` e extrai por regex os dois seletores `has-[[data-…]]:scroll-p{b,t}-…`. Renderiza `Footer` (padrão), `PageFormFooter` e `Container contentOnly showGoBack` e confere que `container.querySelector(<seletor do html>)` acha a barra. `Footer sticky={false}` não publica o atributo. `Navbar` (com os filhos pesados mockados: `PanelNavbarControls`, `ProfileDropdown`, `LanguageSwitcher`, `ModeToggle`, `SidebarTrigger`) publica o seletor do `scroll-pt`. Falha se alguém renomear o atributo de um lado só, que é o modo de quebra que nada no build acusa. |
| T2 | E2E (Playwright, `chromium`) | `apps/e2e/tests/focusNotObscured.spec.ts` (novo) | O comportamento: a 375×812, em `/pt-br/entities/create`, nenhum controle focado por Tab, Shift+Tab ou seta no grupo "Gênero" fica atrás da barra de ações nem do `Navbar`. |

Por que T2 existe, apesar do custo: o objeto do teste é a decisão de rolagem do motor de layout, e o jsdom não
tem layout nem rolagem. T1 prova que o seletor e o atributo combinam, mas não prova que o navegador respeita o
`scroll-padding`. E o defeito sobreviveu de 2026-10-14 (🟢 da PR #44) a 2026-11-19 (🟡 da PR #62) justamente porque
a passada de navegador do `/test` acontece uma vez por entrega: quem mudar o `py-4` da barra para algo acima de
80 px, ou tirar a classe do `html`, não teria nenhum sinal.

Desenho de T2:

- `test.use({ storageState: AUTH_STATE.common, viewport: { width: 375, height: 812 } })`. Roda no projeto
  `chromium`, que não tem `testMatch` e pega todos os specs (`apps/e2e/playwright.config.ts:56-60`). Não entra no
  `CRITICAL_FLOWS` do projeto `mobile` (`playwright.config.ts:19`) e não exige editar a config.
- Página de criar, não de editar: não depende do seed de entidade e tem o mesmo grupo "Gênero"
  (`entities/(components)/EntityFormFields.tsx:146`).
- Função `expectFocusUnobscured(page)`: lê `document.activeElement`, ignora o foco dentro de
  `[data-sticky-action-bar]` ou `[data-panel-navbar]`, e exige `rect.top >= navbar.bottom` e
  `rect.bottom <= bar.top`. Usa `expect.poll`, porque o `html` tem `scroll-smooth`
  (`apps/app/app/layout.tsx:69`) e a rolagem pode estar no meio da animação.
- Passadas: (a) foco no nome, Tab até o foco entrar na barra de ações, medindo a cada parada; (b) foco no rádio
  marcado de "Gênero", `ArrowDown` por todas as opções, medindo a cada uma (o repro original); (c) a partir da
  barra, Shift+Tab até o nome, medindo contra o `Navbar`.
- Teto de iterações (40) para não entrar em laço se o foco escapar.
- Texto via `ptBr` de `support/dictionary.ts`, nenhum literal de UI.

Prova de que os testes pegam o defeito: o `/develop` (ou o `/test`) roda T1 e T2 uma vez com a classe do `html`
removida e registra o vermelho, depois devolve a classe.

O `sharedFooterPendingState.test.tsx:51-62` continua válido sem mudança (confere `sticky` na `className`).

## 8. O que o `/test` vai percorrer

### 8.1 Telas e passadas

Em cada tela de §1.7 (menos a playground): Tab do primeiro campo até a barra, Shift+Tab de volta, setas em todo
grupo de rádio, e foco no `Select` e no `DateInput` sem abrir. Em cada parada, `getBoundingClientRect` do
`document.activeElement` contra o da barra (`[data-sticky-action-bar]`) e o do `Navbar` (`[data-panel-navbar]`).

### 8.2 Matriz

- Viewports: 375×812 (o repro), 390×844 (o `mobile` do E2E) e 1280×720 (desktop baixo, onde editar entidade
  também passa da dobra).
- Temas: claro e escuro. Nada visual muda; medir só que a barra continua com 69 px e sem salto de layout.
- Idiomas: pt-br, en, es. Os rótulos da barra mudam de tamanho ("Salvar", "Save", "Guardar",
  `packages/internationalization/translations/apps/app/pages/common/entities.ts:38`, `:115`, `:192`); medir que a
  barra não quebra em duas linhas a 375 px em nenhum deles, porque aí ela passaria dos 80 px.

### 8.3 Como produzir cada estado

- Entidade: conta comum do seed; editar a entidade semeada.
- Usuário admin: conta admin do seed.
- Onboarding: um cadastro novo no emulador cai no onboarding (`resolveOnboardingRedirect`,
  `(common)/layout.tsx:56-59`).
- Telas sem barra (lista de entidades): `getComputedStyle(document.documentElement).scrollPaddingBottom` deve
  sair `auto` (ou `0px`), e com barra, `80px`. Mesmo teste para `scrollPaddingTop` na tela de login (sem `Navbar`).
- Plano A derrubado (§5.1): registrar a medição e aplicar o plano B, com o desvio no relatório.

### 8.4 Não verificável aqui

- Teclado virtual de iOS Safari e Chrome Android: o Chromium headless não abre teclado. Pela leitura, os dois
  navegadores encolhem só a viewport visual, a barra `sticky` fica presa ao fim da viewport de layout (atrás do
  teclado) e o navegador rola o campo para a viewport visual. O `scroll-padding` só acrescenta folga. Fica como
  **não verificado**, não aprovado.
- Safari e Firefox de verdade: o `agent-browser` é Chromium. **Não verificado.**

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **O rádio focado por seta não fica atrás da barra de ações**
  Em editar entidade a 375×812, focar o rádio marcado de "Gênero" e apertar seta para baixo até a última opção.
  A cada opção, o rádio focado fica inteiro acima da borda superior da barra de ações, com a página rolando
  sozinha quando preciso. É o repro original da PR #62, que hoje deixa "Outro" 100% coberto.

- [ ] **Nenhum campo focado por Tab fica atrás da barra de ações**
  Em criar e editar entidade, criar e editar usuário (admin) e nos dois passos do onboarding, Tab do primeiro
  campo até o botão primário deixa cada controle focado inteiro acima da barra. O botão de voltar e o primário,
  que moram na própria barra, ficam fora da conta. Vale a 375×812, 390×844 e 1280×720.

- [ ] **Nenhum campo focado por Shift+Tab fica atrás do Navbar**
  Nas mesmas telas, Shift+Tab a partir da barra até o primeiro campo deixa cada controle focado inteiro abaixo
  da borda inferior do `Navbar`. No onboarding, que não tem `Navbar`, o critério não se aplica e o
  `scroll-padding-top` do documento fica no valor padrão.

- [ ] **Telas sem barra fixa não ganham folga de rolagem**
  Na lista de entidades e nos quatro blocos da conta (todos `sticky={false}`), o `scroll-padding-bottom`
  calculado do `html` fica no valor padrão. Na tela de login, sem `Navbar`, o `scroll-padding-top` também. A
  folga só existe enquanto a barra estiver no documento e some ao navegar para fora (troca de rota do App Router
  sem recarregar).

- [ ] **A barra de ações não muda de aparência**
  Em claro e escuro, nos três idiomas, a barra mantém 69 px de altura, uma linha só a 375 px, a mesma borda,
  fundo translúcido e posição. Salvar e voltar continuam funcionando, inclusive com o botão desabilitado sob
  impersonação e durante o envio.

- [ ] **Renomear o atributo de um lado só quebra um teste**
  O teste de componente reprova se o seletor `has-[[data-…]]` do `html` e o atributo publicado pelas barras
  (`Footer` fixo, barra do `Container`, `PageFormFooter`, `Navbar`) deixarem de combinar, e se o `Footer` com
  `sticky={false}` passar a publicar o atributo.

- [ ] **O E2E falha sem a correção**
  O spec `focusNotObscured` passa com a correção e reprova com a classe do `html` removida, medido uma vez e
  registrado no handoff ou no relatório do `/test`. Ele roda no projeto `chromium` sem mudar a config do
  Playwright.

## 10. Blueprint técnico (Etapa 2)

### 10.1 Contrato, rota, persistência, i18n, env

N/A em todos. Nenhuma env nova, nenhuma chave nova.

### 10.2 Pseudo-diffs

`apps/app/app/layout.tsx` (`:66-76`):

```diff
         <html
             className={cn(
                 fonts,
-                "scroll-smooth",
+                "scroll-smooth has-[[data-panel-navbar]]:scroll-pt-20 has-[[data-sticky-action-bar]]:scroll-pb-20",
                 preferredTheme && themeClassNames.includes(preferredTheme)
```

`apps/app/shared/components/ui/Footer.tsx` (`:47-55`):

```diff
         <div
             className={cn(
                 "mt-4 flex w-full flex-wrap items-center justify-end gap-3",
                 sticky &&
                     "sticky bottom-0 z-10 border-border border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80",
                 className
             )}
+            data-sticky-action-bar={sticky ? "" : undefined}
         >
```

`apps/app/shared/components/ui/Container.tsx` (`:97-101`):

```diff
     const stickyBar = (inner: React.ReactNode) => (
-        <div className="sticky bottom-0 z-10 mt-4 ...">
+        <div className="sticky bottom-0 z-10 mt-4 ..." data-sticky-action-bar="">
             {inner}
         </div>
     );
```

`apps/app/shared/components/ui/PageFormFooter.tsx` (`:27-33`): mesmo `data-sticky-action-bar=""` no `div` raiz.

`apps/app/shared/components/ui/Navbar.tsx` (`:20`):

```diff
-        <nav className="sticky top-0 z-40 flex h-16 ...">
+        <nav className="sticky top-0 z-40 flex h-16 ..." data-panel-navbar="">
```

`apps/app/CLAUDE.md`, seção "Formulários com ações no rodapé", depois do parágrafo do `sticky={false}`:

> Barra fixa publica `data-sticky-action-bar` (o `Footer` fixo, a barra do `Container` e o `PageFormFooter` já
> publicam). O root layout reserva a altura dela no `scroll-padding-bottom` do documento, para o campo focado não
> ficar atrás da barra (WCAG 2.4.11). Barra fixa nova sem o atributo, ou mais alta que 80 px, volta a esconder o
> foco.

Sem comentário no código (`code-comments.md`): o nome do atributo e o teste carregam o porquê. Se o `/develop`
achar que a classe do `html` precisa de explicação, uma linha com a regra em si ("reserva a altura das barras
fixas na rolagem do foco"), sem citar WCAG, plano ou PR.

### 10.3 Esqueleto do T1

```tsx
const layoutSource = readFileSync(join(__dirname, "../app/layout.tsx"), "utf8");
const SCROLL_PADDING = /has-\[(?<selector>\[data-[\w-]+\])\]:scroll-p(?<side>[bt])-(?<size>[\w-]+)/g;
// side "b" -> seletor das barras de ação; side "t" -> seletor do Navbar
// render(<Footer />)                      -> querySelector(bottomSelector) não nulo
// render(<Footer sticky={false} />)       -> nulo
// render(<PageFormFooter ... />)          -> não nulo
// render(<Container contentOnly showGoBack />) -> não nulo
// render(<Navbar />) com filhos mockados  -> querySelector(topSelector) não nulo
```

Mocks: `next/navigation` (`useRouter`) e `@repo/internationalization/client` (`getDictionary` com
`components.footer` e `components.spinner`), como em `sharedFooterPendingState.test.tsx:4-18`.

### 10.4 Esqueleto do T2

```ts
test.use({ storageState: AUTH_STATE.common, viewport: { width: 375, height: 812 } });

const unobscured = (page: Page) =>
    page.evaluate(() => {
        const active = document.activeElement;
        if (!active || active.closest("[data-sticky-action-bar],[data-panel-navbar]")) return true;
        const rect = active.getBoundingClientRect();
        const bar = document.querySelector("[data-sticky-action-bar]")?.getBoundingClientRect();
        const nav = document.querySelector("[data-panel-navbar]")?.getBoundingClientRect();
        return (!bar || rect.bottom <= bar.top) && (!nav || rect.top >= nav.bottom);
    });

// await expect.poll(() => unobscured(page)).toBe(true) a cada Tab / ArrowDown / Shift+Tab
```

### 10.5 Árvore de arquivos

```
apps/app/app/layout.tsx                                   (editado)
apps/app/shared/components/ui/Footer.tsx                  (editado)
apps/app/shared/components/ui/Container.tsx               (editado)
apps/app/shared/components/ui/PageFormFooter.tsx          (editado)
apps/app/shared/components/ui/Navbar.tsx                  (editado)
apps/app/__tests__/focusNotObscuredScrollPadding.test.tsx (novo)
apps/app/CLAUDE.md                                        (editado)
apps/e2e/tests/focusNotObscured.spec.ts                   (novo)
```

Conferido no `git status` de 2026-11-24 03:30: só o `apps/app/CLAUDE.md` já tem mudança não commitada de outra
feature (a tarefa de autenticação acrescentou o item "Pós-login é carga completa" na seção "Autenticação / admin /
contexto de painel"). A linha desta tarefa entra em outra seção ("Formulários com ações no rodapé"), sem conflito
de trecho, mas o `/review` precisa separar os dois blocos no plano de commits: preparar só o bloco desta tarefa
com um patch aplicado no índice (`git apply --cached`), já que `git add -p` é interativo e não roda aqui, ou
levar o arquivo inteiro no commit da tarefa que commitar primeiro, registrando isso. Os demais arquivos
previstos estão limpos. O que está modificado por outras features e fica intocado aqui: `apps/app/proxy.ts`,
`apps/app/shared/lib/panelState.ts`, os formulários de login e cadastro, `apps/app/app/api/auth/session/route.ts`,
`apps/e2e/support/stackEnv.ts`, `apps/e2e/tests/global.setup.ts`, `apps/e2e/tests/organizationOwnership.spec.ts`,
`packages/auth/*`. O spec novo só importa `support/dictionary.ts`, `support/paths.ts` e `support/urls.ts`, que não
estão modificados.

### 10.6 Ordem de implementação e commit

Não há SDK, API nem i18n. Dois commits de código e o de artefato:

1. `fix(app): keep focused fields clear of the sticky action bar and navbar` (layout, quatro componentes, T1,
   `apps/app/CLAUDE.md`).
2. `test(e2e): measure focus against the sticky bars on the entity form` (T2).
3. `docs(features): app-footer-focus-not-obscured` (último, junto com os artefatos da rodada).

## 11. Achados para o backlog (não corrigidos aqui)

- 🟢 As três barras fixas repetem a mesma string de classes (`Footer.tsx:51-52`, `Container.tsx:98`,
  `PageFormFooter.tsx:30`). `PageFormFooter` e a barra do `Container` só têm consumidor na playground.
- 🟢 O banner de cookies (`cookie-consent.tsx:116`) é `fixed` e aparece no painel antes da resposta do
  visitante; pode cobrir o campo focado no fim da tela. A técnica C43 trata exatamente esse caso (`padding` e
  `scroll-padding` no `html` enquanto o banner existir).

## Perguntas em aberto (decididas por padrão)

Escada usada: `cycle-policy` → padrão do repo → menor raio de impacto.

| # | decisão | adotada | alternativa descartada e por quê |
|---|---------|---------|-----------------------------------|
| Q1 | Onde corrigir | No documento (`html`) e nas barras compartilhadas | Por página: a `cycle-policy` §3 manda corrigir na raiz, e seriam seis telas. `padding-bottom` no `FormContainer`: não corrige, a barra é `sticky` e já reserva o próprio espaço (§1.3) |
| Q2 | Mecanismo | `scroll-padding` no `html` (técnica C43) | `scroll-margin-bottom` nos campos: exigiria seletor sobre todo focável, e campo fora do `FormContainer` escaparia. Tirar o `sticky` no celular (técnica C34): resolve, mas desfaz a decisão de produto da PR #62 de manter a ação visível nos formulários de página inteira |
| Q3 | Altura da folga | Constante Tailwind (`scroll-pb-20`, 80 px), condicional por `:has()` | `ResizeObserver` no `Footer` escrevendo a altura exata no `html` (como no exemplo da C43): mais código cliente e efeito colateral global, para um caso (barra em duas linhas) que não acontece com os rótulos atuais a 375 px. O E2E pega se a barra passar de 80 px. Fica como plano B junto com o `focusin` |
| Q4 | Incluir o `Navbar` (`scroll-padding-top`) | Sim | Deixar para outra tarefa: é o mesmo SC, o mesmo mecanismo, as mesmas telas e uma linha a mais. A `cycle-policy` §3 manda corrigir defeito achado no caminho. O `/test` mede os dois sentidos |
| Q5 | Barras sem consumidor real (`PageFormFooter`, barra do `Container`) | Recebem o atributo | Deixar de fora: uma tela futura que as use voltaria a esconder o foco sem nenhum sinal |
| Q6 | Nome do gancho | `data-sticky-action-bar` e `data-panel-navbar` | `data-slot`: convenção dos primitivos shadcn, sem uso em `apps/app/shared/components/ui/`. O precedente do padrão `:has()` no repo é `data-cookie-banner` |
| Q7 | Onde mora a regra | Classe no `<html>` do root layout | Regra solta em `apps/app/app/styles.css`: o repo não tem CSS próprio no app (o arquivo só importa o Tailwind e o tema), e o `scroll-smooth` já está no `html`. `packages/design-system/styles/globals.css`: afetaria a `web`, e o gancho é do app |
| Q8 | Teste de regressão do comportamento | E2E novo e permanente, além do teste de componente | Só a passada do `/test`: foi o que deixou o defeito viver de 2026-10-14 a 2026-11-19. Só o teste de componente: não prova que o navegador respeita o `scroll-padding` |
| Q9 | Projeto do E2E | `chromium` com viewport 375×812 no próprio spec | Entrar no `CRITICAL_FLOWS` do projeto `mobile`: exigiria editar `playwright.config.ts` e rodaria o spec duas vezes para provar a mesma coisa |
| Q10 | Banner de cookies cobrindo o foco | Fora de escopo, vira achado | Corrigir junto: mora em `packages/design-system`, é conteúdo dispensável pelo usuário e pede decisão de política de banner |
