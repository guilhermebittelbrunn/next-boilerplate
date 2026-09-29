# Relatório do `/test`: acessibilidade com allowlist do axe zerada

Rodada autônoma do `/cycle`, branch `feat/accessibility-conformance` (não protegida). Nenhum commit, nenhuma
branch criada. Critérios em [`criterios-aceite.md`](criterios-aceite.md).

**Veredito: `done` (rodada 2).** A rodada 1 terminou `blocked` por um defeito introduzido por este diff:
no menu de ações, o item "Excluir" ficava ilegível com o cursor em cima, nos dois temas (texto e ícone em
1:1 sobre o vermelho). O `/review` corrigiu o `globals.css` e a rodada 2 remediu: repouso e hover passam
nos dois temas e nas duas listas. O resto do corte já tinha passado medido na rodada 1. Ver
[Rodada 2](#rodada-2-remedição-do-excluir).

## Gate da etapa anterior

O `STATE.md` estava com `review = in-progress`. Não há commit da feature sobre `2c285de` (o diff está todo
no working tree), então o gate aberto corresponde ao plano de commits que espera aprovação do usuário, não a
um `/review` esquecido depois de commitar.

## Defeito de produção

### "Excluir" some no hover do `ActionsMenu` (claro e escuro), corrigido na rodada 2

- **Repro:** `/pt-br/entities`, abrir "Mais ações" de qualquer linha, pôr o cursor sobre "Excluir". Vale em
  claro e escuro, e em `/pt-br/admin/users`, que usa o mesmo componente.
- **Medido (estilo computado, cor pintada lida em canvas):**
  - `li` do item: texto `--background` sobre `--destructive`, 4,77:1 no claro e 6,85:1 no escuro. Esta
    parte o override do `Dropdown` em `antd-app.tsx` resolveu.
  - `span.ant-dropdown-menu-title-content` (o texto visível) e `span.anticon` (a lixeira): cor
    `--destructive` sobre fundo `--destructive`. Claro `rgb(231,0,11)` sobre `rgb(231,0,11)`, escuro
    `rgb(255,100,103)` sobre `rgb(255,100,103)`: **1:1**. No screenshot o item vira um retângulo vermelho
    sem rótulo.
- **Causa:** `packages/design-system/styles/globals.css:237-248` pinta o `title-content` e o `.anticon` do
  item `danger` com `var(--color-destructive)` direto no filho, sem exceção para hover. Antes deste diff o
  hover tinha fundo `#000000` (seed token resolvido para preto, como o handoff mediu) e o texto vermelho
  aparecia. Com o fundo do hover em `--destructive`, o texto ficou da mesma cor do fundo.
- **Por que os testes não pegaram:** `actionMenu.test.tsx` lê o CSS que o antd injeta, e o `jsdom` não
  carrega o `globals.css`. A suíte E2E não abre o menu.
- **Dev × produção:** não precisei de `build && start`. A regra do `globals.css` mira o elemento filho
  diretamente, então a cor não depende de ordem de carregamento nem de herança; o resultado é o mesmo em
  qualquer build.
- **Hipótese de correção (não instrução):** remover as duas regras de cor dos filhos do item `danger` no
  `globals.css`, ou trocá-las por `color: inherit`, e deixar o `li` (que o antd já pinta certo em repouso e
  em hover) mandar na cor. Para travar, um teste que leia o `globals.css` como texto e falhe se o filho do
  item `danger` tiver cor própria, ou uma asserção de hover na E2E. Depois de corrigir, remedir o repouso
  no escuro.

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito | O que medi |
|---|------|----------|------------|
| 1 | Allowlist vazia passa | confirmado | `pnpm e2e`: 22 testes, 22 passaram, 0 anotações `a11y-stale-exception`, claro (specs de fluxo) e escuro (`a11yDark.spec.ts`, 9 rotas). Com o axe 4.13 injetado à mão, o `aria-describedby` para `-form-item-description` inexistente sai só como `incomplete` (`aria-valid-attr-value`) em `/pt-br/account`, `/pt-br/entities/create` com erro e `web:/pt-br/sign-up`. Nenhuma violação. |
| 2 | `<title>` renderizado | confirmado | 24 rotas lidas com `document.title`: `/`, `/entities`, `/entities/create`, `/account` do painel comum e `/admin`, `/admin/users`, `/admin/users/create`, `/admin/users/edit/<id>` do admin, cada uma em pt-br, en e es. Valores "Painel do usuário", "User dashboard", "Panel de usuario", "Administração", "Administration", "Administración", seguidos de " \| next-boilerplate". A edição de entidade também sai "Painel do usuário \| next-boilerplate". |
| 3 | "Excluir" do `ActionsMenu` | derrubado na rodada 1, confirmado na rodada 2 | Rodada 1: repouso certo, nunca `#000000` (claro `rgb(231,0,11)` sobre branco, 4,77:1; escuro `rgb(255,100,103)` sobre `rgb(10,10,10)`, 6,85:1), mas no hover texto e ícone ficavam na cor do fundo, 1:1. Rodada 2: hover com `li`, texto e ícone em 4,77:1 (claro) e 6,85:1 (escuro). |
| 4 | `autoFocus` do `Dropdown` | confirmado | Teclado: Tab a partir do switch da linha chega em "Mais ações"; Enter abre com foco em "Editar"; seta para baixo vai a "Excluir" e volta a "Editar"; Esc fecha e devolve o foco ao gatilho; Enter em "Editar" navega para `/pt-br/entities/edit/<id>`. Mouse: o foco vai para "Editar" sem `:focus-visible` (sem anel) e `scrollY` fica em 0. O `autoFocus` fica. |
| 5 | Contraste computado | confirmado | Erro no escuro: 6,15:1 no formulário do painel (fundo `rgb(24,24,24)`) e 6,85:1 na web. Iniciais do avatar no claro: 4,62:1 (`rgb(110,111,111)` sobre `rgb(245,245,245)`). Pior texto `muted` da landing: 4,62:1 no claro e 5,86:1 no escuro. "Excluir minha conta" no escuro: branco sobre `rgb(158,64,66)`, 6,43:1 (o handoff estimava 6,48); no claro, 4,77:1. |
| 6 | Erro de campo pela árvore | confirmado; `Select` e `DateInput` 🔒 pela UI | Login (`apps/app`), criar entidade, criar usuário (admin) e cadastro da web com senha "abc": cada campo inválido com `aria-invalid="true"` e o id da mensagem visível no `aria-describedby` ("Email inválido", "Informe o nome.", "A senha deve ter pelo menos 8 caracteres", "As senhas não coincidem."). O foco vai para o primeiro inválido. Corrigir o valor devolve `false` e tira o id. `Select` de tipo e `DateInput` não entram em erro pela UI (os formulários dão valor padrão ao `Select`; a data só entra pelo calendário). No browser os dois publicam `aria-invalid="false"` e o `aria-describedby`; o caso com erro fica provado pelo `hookformAria.test.tsx`. |
| 7 | Botão em carregamento | derrubado em parte | Confirmado: no login e no "Salvar" da entidade o botão passa a `aria-busy="true"`, `disabled`, spinner `aria-hidden="true"` e `<span class="sr-only">` com o rótulo; o Chrome dá a esse markup o nome "Salvar" (sonda injetada e removida). Derrubado: a largura salta, "Salvar" vai de 74,3 px a 48 px e volta a 68,7 px. O login, de largura total, fica em 334 px. O salto já existia antes do diff. |
| 8 | Regressão visual | confirmado | Hero e CTA em `lg`: `padding-left` 24 px e 40 px de altura; FAQ, CTA e preços no tamanho padrão: 16 px e 36 px. Filho único `<span>` com `gap` de 8 px. 404: link com 24 px de padding, 40 px, sem `<button>`. Gatilho do menu: `<button>`, borda 0, fundo transparente, 96 × 40 px (o mesmo `w-full` do `div` antigo), anel de 3 px no foco de teclado. Conferido em claro, escuro e 390 px. |
| 9 | Seletor de data do contato | confirmado | Um `<button>` ("September 29th, 2026"), sem focável aninhado e sem `<button>` pai. |
| 10 | Avatar enviado | confirmado | Upload pelo emulador de Storage e `PUT /account 200`. O `<img data-slot="avatar-image">` do navbar tem `alt=""`, dentro do gatilho "Abrir menu do perfil"; o axe injetado em `/pt-br/account` não acusa violação. |

## Critérios de aceite, item a item

| Critério | Status | Meio |
|----------|--------|------|
| Allowlist vazia e suíte verde | ✅ | E2E (`pnpm e2e`) + axe injetado |
| Campo com erro anuncia a mensagem | ✅ | e2e manual (texto, senha, upload) + teste de componente (`Select`, `DateInput`, `Textarea`, `RadioGroup`, `Switch`) |
| Erro local do upload anunciado | ✅ | e2e manual |
| Senha rotulada e toggle com nome | ✅ | e2e manual, 3 idiomas |
| Botão em carregamento mantém o nome | ✅ (checkout 🔒 sem Stripe de teste) | e2e manual + teste de componente |
| Gatilho do menu é botão focável | ✅ | e2e manual (teclado e mouse) |
| Switch de linha nomeia o registro | ✅ | e2e manual (3 idiomas, personificação) + teste de componente |
| Seletor de ambiente com nome | ✅ | e2e manual (desktop e mobile, 3 idiomas) + teste de componente |
| Título traduzido no painel | ✅ | e2e manual (24 rotas) + unitário novo |
| Contraste do erro no escuro | ✅ | e2e manual, estilo computado |
| "Excluir" em repouso e hover | ✅ (rodada 2; ❌ na rodada 1) | e2e manual, estilo computado + teste de componente novo do `/review` |
| Botão destrutivo no escuro | ✅ | e2e manual, estilo computado |
| Iniciais do avatar e cards no claro | ✅ | e2e manual, estilo computado |
| Avatar com imagem sem `image-alt` | ✅ | e2e manual + axe injetado |
| CTAs da web são links simples | ✅ | e2e manual + axe da suíte + unitário novo (404) |
| Design system pega regressão | ✅ | mutação feita e revertida (4 testes caem) |
| Gates do CI | ✅ | comandos abaixo |
| Sem regressão visual | ✅ (rodada 2; ❌ na rodada 1) | e2e manual. O hover do "Excluir" foi corrigido. O salto de largura do `Button` em carregamento já existia antes do diff e segue como achado de backlog. |

## Cobertura e comandos

| Comando | Resultado |
|---------|-----------|
| `pnpm turbo run typecheck test --filter=app --filter=web --filter=@repo/design-system --filter=@repo/internationalization --filter=e2e` | 16 tasks ok (15 do cache). `app:test` 690, `web:test` 82, `e2e:test` 16, `@repo/design-system:test` 44, `@repo/internationalization:test` 59 (paridade inclusa). Rodado antes dos testes novos. |
| `JAVA_HOME=/opt/homebrew/opt/openjdk@21 pnpm e2e` | 22 passaram em 1,4 min, 0 falhas, 0 `a11y-stale-exception`. |
| `pnpm --filter app exec vitest run __tests__/panelLayoutTitle.test.ts` | 8 passaram (novo). |
| `pnpm --filter app exec vitest run __tests__/notFoundPageHomeLink.test.tsx` | 3 passaram (novo). |
| `pnpm --filter app exec vitest run __tests__/panelNavbarControls.test.tsx` | 9 passaram (1 cenário novo). |
| `pnpm exec biome check` nos 3 arquivos de teste | sem erro. |
| `JAVA_HOME=… pnpm test` (raiz) | 14 tasks ok (10 do cache). `app:test` 702, `api:test` 949, `api:test:emulator` 170, `web:test` 82, `@repo/design-system:test` 44, `e2e:test` 16, `@repo/internationalization:test` 59, demais pacotes verdes. |
| `pnpm --filter app typecheck` | ok, depois dos testes novos. |
| Mutação no design system: tirar o `aria-label` do gatilho e o `sr-only` do `Button`, rodar `vitest run`, restaurar | 4 falhas de 44 ("keeps its accessible name while loading", "renders the trigger as a named, focusable button", "opens the menu from the trigger", "paints the danger item…"). Arquivos restaurados e conferidos com `cmp`. |

Sem `--force`: o cache não deu motivo de suspeita. Não rodei o `pnpm check` do repo inteiro; o `/review`
mediu 790 arquivos sem erro e eu só acrescentei testes, que passei no Biome um a um.

## Testes criados

- `apps/app/__tests__/panelLayoutTitle.test.ts`: `generateMetadata` dos dois layouts nos 3 idiomas, fallback
  de idioma inválido para pt-br e marca vinda de `NEXT_PUBLIC_APP_NAME`.
- `apps/app/__tests__/notFoundPageHomeLink.test.tsx`: o 404 tem um único link para a home resolvida, sem
  `<button>`, com ícone e texto dentro de um `span`, e cai no idioma padrão sem cookie.
- `apps/app/__tests__/panelNavbarControls.test.tsx`: cenário novo com `useIsMobile` em `true`, conferindo o
  nome do seletor de ambiente dentro do menu mobile.

## Decisões de custo de teste

Tudo na faixa barata (jsdom com mocks nas bordas). Nenhum teste de faixa cara: o diff não toca Firestore,
regras nem sessão. Os layouts e o 404 são Server Components chamados como função, com os helpers de servidor
mockados; o menu mobile usa um mock de passagem do `dropdown-menu`. `apps/web` (hero, CTA, FAQ, preços,
contato) ficou sem teste de componente novo: a regra `nested-interactive` do axe na E2E de `web:/pt-br` já
barra `<a>` dentro de `<button>`, e medi os destinos no browser. O defeito do hover pede um teste que leia o
`globals.css`; como o conserto é de produção, a sugestão fica junto do defeito.

## Lacunas de teste herdadas

| Lacuna | Veredito |
|--------|----------|
| `Select` mobile do navbar sem asserção de `aria-label` | Fechada: cenário novo em `panelNavbarControls.test.tsx`, e medido no browser em 390 px. |
| `generateMetadata` dos layouts sem teste | Fechada: `panelLayoutTitle.test.ts` (8 testes). |
| `NotFoundPage` e links da web sem teste de componente | `NotFoundPage` fechada (`notFoundPageHomeLink.test.tsx`). Links da web: fora de escopo de teste novo; o axe da E2E e a medição no browser cobrem. |

## Evidências e2e (o que vi)

Screenshots em `test/e2e/`, descartados pelo `.gitignore`; o texto acima é a prova:
`01-common-home-dark.png`, `02-actions-trigger-focus-light.png`, `03-actions-menu-keyboard-light.png`,
`04-danger-hover-dark.png` e `05-danger-hover-light.png` (o retângulo vermelho sem rótulo),
`06-entity-form-error-dark.png`, `07-mobile-navbar-menu-light.png`, `08-mobile-entities-dark.png`,
`09-not-found-light.png`, `10-web-landing-light.png`, `11-web-signup-short-password-dark.png`,
`12-web-hero-mobile-light.png`.

Nomes acessíveis lidos na árvore do Chrome em en e es: "More actions"/"Más acciones", "User active:
user2@example.com"/"Usuario activo: …", "Environment"/"Entorno", "Show password" → "Hide password",
"Mostrar contraseña" → "Ocultar contraseña". Sob personificação de `user2@example.com`, o switch "Entidade
ativa: Other Owner Shop" aparece `disabled` e o aviso "Modo somente leitura" fica legível no escuro e no
mobile.

## Achados fora do corte (para o backlog)

- **Excluir pelo teclado não funciona.** Com o foco em "Excluir", Enter fecha o menu sem abrir o
  `Popconfirm` e o foco cai no `body`. O `Popconfirm` só abre com clique no `span` do rótulo. O defeito já
  existia e agora fica exposto, porque o gatilho passou a ser alcançável por Tab (WCAG 2.1.1).
- O gatilho do menu não publica `aria-haspopup` nem `aria-expanded`; o antd não os coloca no filho.
- "Excluir" com foco de teclado no claro: `rgb(231,0,11)` sobre `rgb(245,245,245)`, 4,38:1. É o par
  `--destructive` sobre `--accent`, que o plano já lista no §12.2.
- O `RadioGroup` de gênero recebe como nome o texto das opções ("Não informarMasculinoFemininoOutro"),
  porque o `FormLabel htmlFor` aponta para o `div` raiz, que não é rotulável. Falta `aria-labelledby`.
- A página 404 do `apps/app` tem `document.title` vazio.
- O botão do menu mobile do header da web não tem nome (`button` sem rótulo na árvore em 390 px), como o
  review anotou.
- O `Button` em carregamento encolhe para a largura do spinner (74 → 48 px no "Salvar").
- Na landing, o CTA "Entrar" do hero e do bloco final leva a `/pt-br/contact`. O destino é o mesmo de antes do
  diff, mas o rótulo não combina com ele.

## Ambiente do e2e

- `pnpm e2e`: todas as portas estavam livres; o Playwright subiu emulador, `api`, `app` e `web` e derrubou
  tudo ao terminar. Depois conferi 3000, 3001, 3002, 3003, 9099, 8080, 9199, 4000, 4001, 4400 e 4500 vazias.
- Passada manual: subi `pnpm emulators` (JDK 21) e `api`, `app` e `web` com `next dev` e o mesmo ambiente de
  emulador que a E2E monta (`buildStackEnv`), mais o seed. Guardei os PIDs e matei cada um no fim; as portas
  acima voltaram vazias e nenhum `next dev` ou emulador ficou vivo. Nada do usuário foi reutilizado.
- O `agent-browser` deixava a aba com `visibilityState = "hidden"` depois de alguns comandos (fechar sessão,
  screenshot). Isso congela o `requestAnimationFrame` e faz o menu do antd parecer não mover o foco nem
  fechar. Resolvi trocando para a aba (`tab t1`) antes de cada medição de teclado; todas as medições acima
  foram feitas com a aba visível.

## Estado de dev alterado

Só no emulador, que não persiste (`pnpm emulators` sem export): entidade "QA a11y entidade" criada, "Joana
Ribeiro" desativada por um Enter no switch, nome de exibição "QA Acessibilidade" e avatar no
`user@example.com`, e um pedido de exportação de dados. Tudo sumiu com o processo. Nenhuma conta em projeto
Firebase real; `qa-accessibility-conformance@example.com` não chegou a ser criada, porque o cadastro parou
na validação da senha curta. Nada a acrescentar ao `docs/PRE-PRODUCTION.md`.

## Cross-check

- `apps/app` × `apps/web`: os dois percorridos.
- Comum × admin × personificação: os três percorridos.
- `subscription` × `simple`: indiferente, os componentes são os mesmos; o checkout em carregamento fica 🔒
  sem chave de teste da Stripe.
- Mobile × desktop, claro × escuro, pt-br × en × es: percorridos nas telas acima.

## Rodada 2: remedição do "Excluir"

O `/review` trocou as cores próprias dos filhos do item `danger` por `color: inherit`
(`packages/design-system/styles/globals.css:237-250`). O `li` segue com `var(--color-destructive)`, e o
`actionMenu.test.tsx` ganhou "lets the danger item's text and icon inherit the item colour". Nesta rodada
medi só o menu de ações; o resto já estava medido na rodada 1.

**Como medi:** abri o menu com o mouse e li a cor computada e a cor pintada (canvas, com os fundos dos
ancestrais compostos) do `li`, do `span.ant-dropdown-menu-title-content` e do `span.anticon`. Fiz isso em
três estados: menu aberto com o cursor fora, cursor sobre "Excluir" e cursor sobre "Editar". Troquei para
a aba antes de cada medição e confirmei `visibilityState = "visible"`.

| Tela | Tema | "Excluir" em repouso | "Excluir" em hover | "Editar" em repouso | "Editar" em hover |
|------|------|----------------------|--------------------|---------------------|-------------------|
| `/pt-br/entities` | claro | `rgb(231,0,11)` sobre `rgb(255,255,255)`, 4,77:1 | `rgb(255,255,255)` sobre `rgb(231,0,11)`, 4,77:1 | `rgb(10,10,10)` sobre `rgb(255,255,255)`, 19,8:1 | `rgb(10,10,10)` sobre `rgb(245,245,245)`, 18,16:1 |
| `/pt-br/entities` | escuro | `rgb(255,100,103)` sobre `rgb(10,10,10)`, 6,85:1 | `rgb(10,10,10)` sobre `rgb(255,100,103)`, 6,85:1 | `rgb(250,250,250)` sobre `rgb(10,10,10)`, 18,97:1 | `rgb(250,250,250)` sobre `rgb(38,38,38)`, 14,5:1 |
| `/pt-br/admin/users` | claro | 4,77:1 (mesmos valores) | 4,77:1 | 19,8:1 | 18,16:1 |
| `/pt-br/admin/users` | escuro | 6,85:1 | 6,85:1 | 18,97:1 | 14,5:1 |

Em cada célula, `li`, texto e ícone deram a mesma cor e a mesma razão. Nenhum estado ficou em 1:1. O
"Editar" continua em `--foreground` nos dois temas, sem regressão. No screenshot
`13-r2-danger-hover-dark.png`, o rótulo e a lixeira aparecem em preto sobre o vermelho claro.

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/design-system test` | 6 arquivos, 45 testes passaram (sem `--force`). |

**Vereditos que mudaram:** "Item 'Excluir' do menu de ações em repouso e em hover" passa de ❌ para ✅.
"Sem regressão visual" também passa de ❌ para ✅: a única regressão era esse hover. O salto de largura do
`Button` em carregamento (74 → 48 px no "Salvar") já existia antes do diff e continua listado nos achados
fora do corte. O item 3 da lista "Verificar no `/test`" fica confirmado.

**Ambiente:** portas livres no início. Subi `pnpm emulators` (JDK 21), o seed, e `api` e `app` com
`next dev` e o ambiente de emulador da E2E; a `web` não foi necessária. Matei cada PID no fim. As portas
3000, 3001, 3002, 3003, 9099, 8080, 9199, 4000, 4001, 4400, 4500 e 9150 voltaram vazias e nenhum
`next dev` ou emulador ficou vivo. Não houve dado novo além do seed, que morreu com o emulador.
