# Relatório do `/test`: refactor de interface e design system

- **Data:** 2026-11-27
- **Branch:** `feat/design-system-refresh` (não protegida; nenhuma branch criada, nada commitado, índice intocado)
- **Escopo:** `git diff --name-only 6943ce9..HEAD` (cerca de 310 arquivos), lido a partir de `develop/handoff.md` e
  `review/review.md`. Contrato visual: `docs/DESIGN.md`.

Resultado: **aprovado**, com o LCP da landing aberto como pendência sem linha de base.

A primeira rodada terminou bloqueada: o `pnpm e2e` tinha uma falha real (`focusNotObscured.spec.ts`) e a passada no
navegador achou mais dois defeitos de produto, o toast de erro cobrindo o botão "Salvar" e os `Badge` tonais abaixo
de 4,5:1 no tema claro. Corrigi aqui um quarto defeito (ação da tabela de sessões escondida em 1440 px). O
coordenador corrigiu D1, D2 e D3 no working tree, e a segunda rodada, descrita em "Segunda rodada" abaixo, mediu os
três de novo: passam no navegador, o `pnpm e2e` inteiro passa (45 de 45 depois de mais um seletor frouxo corrigido) e
o `pnpm test` da raiz passa. Fechei as seis lacunas de teste herdadas. As tabelas e seções da primeira rodada ficam
como registro do que foi achado; os vereditos finais estão na seção "Segunda rodada" e na tabela de critérios.

## Verificar no `/test`

| item do `review.md` | veredito | o que foi medido |
|---------------------|----------|------------------|
| 1. Teclado no `ActionsMenu` | **confirmado** em `/entities`; transferência de posse 🔒 no navegador | Em `/pt-br/entities` (1440 px, claro): Tab do switch da linha "Marcos Pereira" chega ao gatilho "Mais ações" com `:focus-visible`; Enter abre o menu com foco em "Editar" (itens "Editar,Excluir"); seta para baixo foca "Excluir"; Enter abre "Excluir registro" com `document.activeElement` = botão "Não" e 4 linhas na tabela; Esc fecha e, terminada a saída do diálogo, o foco volta ao "Mais ações" da mesma linha. Pelo mouse, "Sim" removeu a linha (3 linhas restantes) e mostrou "Entidade removida com sucesso.". A transferência de posse não deu para dirigir: o seed tem a equipe com um membro só (o dono). Ela está coberta por `organizationTransferKeyboard.test.tsx` (passa) e o fluxo completo pelo mouse pelo E2E `organizationOwnership.spec.ts` (passa). |
| 2. Toast sobre a barra fixa | **derrubado** na primeira rodada; **confirmado** depois da correção (ver "Segunda rodada") | Toast de sucesso não cobre nada porque criar e editar voltam para a lista. O de erro cobre. Repro: abrir a edição de uma entidade, excluí-la noutra aba, clicar "Salvar". Em 1440 × 900 o toast "Entidade não encontrada. (Código do erro: …)" ocupou x 1045-1401, y 821-894, e o "Salvar" estava em x 1179-1253, y 848-884; `document.elementFromPoint` no centro do "Salvar" devolveu o toast. Em 390 × 844 o toast ocupa x 16-374, y 783-837 e o "Salvar" fica em x 285-359, y 792-828, coberto por inteiro. Botão de fechar presente; texto do toast no escuro com 15,39:1. Ver defeito D1. |
| 3. Contraste dos tons translúcidos | **derrubado no claro** na primeira rodada, confirmado no escuro; claro **confirmado** depois da correção | Medido no navegador compondo o fundo real. Escuro: botão destrutivo `dark:bg-destructive/15` 5,12:1; `Badge` success 5,91, warning 6,66, destructive 4,78; ícone do `AuthCard` warning 7,55. Claro: `Badge` warning "Sensível" na auditoria 4,45:1; success "Vinculado" na conta 4,56:1; no `bg-muted/50` do playground success 4,27, warning 4,16, destructive 4,30. Texto de 12 px peso 500, então o limite é 4,5:1. Ícone do `AuthCard` warning no claro 4,31:1, acima do 3:1 de objeto gráfico. Ver defeito D3. |
| 4. `Table` | **confirmado**, com uma correção | Busca: "acme" deixou só a linha da Acme; "zzz" mostrou "Nenhuma entidade cadastrada.". Volta à página 1, seletor 10/20/50, `hideOnSinglePage` e esqueleto: cobertos por `tablePagination.test.tsx` (novo). No navegador a lista de usuários tem 3 linhas, então o `hideOnSinglePage` esconde o paginador como deve, e o esqueleto das sessões passa rápido demais para ser capturado (🔒 no navegador). Auditoria em 390 px: tabela com `scrollWidth` 1080 para 343 de largura visível, documento sem rolagem lateral. Sessões em 1440 px: a tabela transbordava (630 para 552) e o "Encerrar" ficava em x 1208-1291 com o contêiner terminando em 1229. Corrigido (D4): 552 para 552, "Encerrar" em x 1131-1213. |
| 5. `pnpm e2e` | **derrubado** na primeira rodada (40 de 45); **confirmado** na segunda (45 de 45) | Detalhe nas seções do E2E e da segunda rodada. |
| 6. Landing | **confirmado** (menu, faixa, skip link); LCP medido acima da meta | Skip link: primeiro Tab foca "Pular para o conteúdo" com opacidade 1 e topo em 8 px; Enter leva o foco a `MAIN#main-content`. Menu em 390 px: Enter no "Menu" abre (`aria-expanded=true`), Tab vai a "Início" dentro do menu, Esc fecha e devolve o foco ao "Menu" com `:focus-visible`. Itens do menu: Início, Preços, Contato, Sair, idioma e tema; trocar para "Escuro" pelo tema dentro do menu funcionou. Em 900 px a barra tem idioma, tema e "Sair", e o menu só "Início", "Preços", "Contato". LCP: ver seção do Lighthouse. |
| 7. Auth | **confirmado**, com dois itens 🔒 | Painel de marca no escuro: título 16,31:1, link "Esqueci minha senha" 7,29:1, "Entrar" 7,59:1. Ordem de Tab no login: senha, "Mostrar senha", "Esqueci minha senha", "Entrar", "Continuar com Google", "Cadastrar"; anel de foco de 3 px no "Entrar". Banner de cookies 🔒: só abre com analytics configurado. Simulei um `[data-cookie-banner]` fixo de 300 px no cadastro em 390 px: a coluna ganhou `padding-bottom` de 384 px e, rolada até o fim, o link "Entrar" terminou em y 418 com o banner começando em 544. E-mail longo no convite 🔒: precisa de um token de convite válido; coberto por `invitationAcceptance.test.tsx`. O botão de link por e-mail não aparece neste ambiente (recurso desligado), então "Google e link lado a lado" ficou 🔒. |
| 8. `MetricStrip` com sete dígitos | **confirmado** | Na home admin em 390 px, troquei o texto dos cinco valores por "1.234.567": células de 303 px (faixa de três) e 131-132 px (faixa de duas), `scrollWidth` igual a `clientWidth` em todas, documento sem rolagem lateral. A formatação por locale (pt-br "1.234.567", en "1,234,567", es "1.234.567") está em `metricStrip.test.tsx`. |
| 9. Onboarding em 390 px | **confirmado** | Conta nova no emulador: "Passo 1 de 2" e "Passo 2 de 2" cabem em 390 × 844 sem rolagem lateral e sem `data-sticky-action-bar`; "Continuar" dentro do cartão, "Pular" e "Concluir" lado a lado. "Concluir" levou a `/pt-br`. |
| 10. `prefers-reduced-motion` | **confirmado** | Menu do tema sem a preferência: animação `enter` de 150 ms, de `translate3d(0, -8px, 0) scale3d(0.95, …)` e opacidade 0 para 1. Com `reduced-motion`: a mesma animação parte de `translate3d(0, 0, 0) scale3d(1, 1, 1)`, só opacidade. O CSS compilado tem `.pressable:active { transform: none !important; }` dentro do `@media (prefers-reduced-motion: reduce)`. |

Os itens "A verificar no `/test`" do handoff estão todos acima, mais o axe da home da web: `a11yDark.spec.ts` passa em
`web:/pt-br` no escuro.

## Cobertura e comandos

Sem `--force` em nenhum comando; nada levantou suspeita de cache.

| comando | resultado |
|---------|-----------|
| `pnpm --filter app test` (antes dos testes novos) | 155 arquivos, 1398 testes passando |
| `pnpm --filter web test` (antes) | 36 arquivos, 319 testes passando |
| `pnpm --filter @repo/design-system test` | 13 arquivos, 170 testes passando (a primeira rodada pegou o meu `tablePagination.test.tsx` ainda com um caso errado; corrigido o teste, passou) |
| `pnpm --filter @repo/email test` | 8 arquivos, 209 testes passando |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes passando (paridade inclusa) |
| `pnpm --filter app typecheck` · `web` · `@repo/design-system` · `e2e` | sem erro |
| `pnpm check` (no fim) | `Checked 1180 files in 860ms. No fixes applied.` |
| `pnpm test` na raiz, com JDK 21, primeira vez (antes da correção D4) | 15 tasks, 15 com sucesso, 4 do cache, 2m22s |
| `pnpm test` na raiz, no fim | 15 tasks, 15 com sucesso, 12 do cache, 1m16s |
| `pnpm e2e` | 45 testes: 40 passando, 5 falhando (seção abaixo) |
| `playwright test` em `focusNotObscured`, `a11yDark`, `signIn`, `signUp` depois das correções de teste | 29 testes: 27 passando, 2 falhando; com o ajuste seguinte, `focusNotObscured` sozinho deu 2 de 3, sobrando a falha real |
| `pnpm lighthouse` (com build de produção da web) | cinco rodadas na home; seção abaixo |

Números por workspace do `pnpm test` final: api 1984 (137 arquivos), `api:test:emulator` 284 (12), app 1415 (158), web
321 (36), design-system 170 (13), email 209 (8), auth 219 (16), internationalization 67 (7), shared 78 (6), security 65
(3), analytics 41 (3), next-config 39 (2), payments 19 (3), sdk 15 (4).

## Testes criados ou estendidos

| arquivo | casos | o que prova |
|---------|-------|-------------|
| `packages/design-system/__tests__/tablePagination.test.tsx` (novo) | 12 | dez linhas por página; avanço e última página com o resto; seletor 10/20/50 volta à página 1; sem seletor sem `showSizeChanger`; busca volta à página 1; `hideOnSinglePage`; paginador de página única sem a opção; `pagination={false}`; esqueleto com `aria-busy` e `role="status"`; linhas mantidas durante recarga; vazio sem paginador; vazio na busca sem resultado |
| `packages/design-system/__tests__/actionMenu.test.tsx` (estendido) | +1 | durante um `onDelete` assíncrono, "Não" fica desabilitado e Esc não fecha a confirmação |
| `apps/app/__tests__/recordAvatar.test.tsx` (novo) | 9 | iniciais de primeiro e último nome, nome de uma palavra, sufixos "Jr." e "III", e-mail com ponto, hífen, sublinhado e mais, espaços sobrando, vazio, letra acentuada e caractere fora do plano básico; foto com nome no texto alternativo; iniciais com `aria-hidden` |
| `apps/app/__tests__/loadErrorState.test.tsx` (novo) | 3 | `role="alert"` sem botão quando não há `onRetry`; clique chama `onRetry`; `retrying` desabilita e não chama |
| `apps/app/__tests__/metricStrip.test.tsx` (novo) | 5 | formatação em pt-br, en e es; rótulos em `dt`; esqueleto e `aria-busy` no carregamento |
| `apps/web/__tests__/headerMobileMenu.test.tsx` (estendido) | +2 | Esc fecha o menu e devolve o foco ao botão; outra tecla não fecha |

## Lacunas herdadas

| lacuna do `review.md` | veredito |
|-----------------------|----------|
| `Table`: paginação, seletor, volta à página 1, `hideOnSinglePage`, esqueleto, vazio | **fechada** (`tablePagination.test.tsx`) |
| `RecordAvatar.initialsOf` | **fechada** (`recordAvatar.test.tsx`) |
| `LoadErrorState` com `onRetry` e `retrying` | **fechada** (`loadErrorState.test.tsx`). No navegador ficou 🔒: o resumo da home vem do prefetch do servidor, então bloquear `/entities/summary` no cliente não produz o estado de erro. |
| `MetricStrip`: locale e carregamento | **fechada** (`metricStrip.test.tsx`) |
| Menu móvel da web: Esc com retorno de foco | **fechada** (`headerMobileMenu.test.tsx`) e confirmada no navegador |
| `ActionsMenu` com `onDelete` assíncrono | **fechada**: o arquivo já cobria o botão ocupado; o caso novo cobre o cancelar desabilitado e o Esc bloqueado |

## Decisões de custo de teste

Nenhum teste da faixa cara foi criado. Todos os novos rodam em jsdom, sem processo externo: a `Table`, o
`ActionsMenu`, o `MetricStrip`, o `LoadErrorState`, o `RecordAvatar` e o header da web são componentes cujo
comportamento não depende de Firestore, regra de segurança nem sessão. O diff não toca rota de API, repositório,
`firestore.rules` nem guard, então nenhum teste de API ou de emulador foi acrescentado; o `test:emulator` existente
rodou dentro do `pnpm test` da raiz. Layout, tema, largura e contraste real ficaram com o `agent-browser` e com o E2E
existente, que é onde esses comportamentos aparecem.

## E2E (`pnpm e2e`)

Primeira rodada: 45 testes, 40 passando, 5 falhando, 6,7 min. As cinco falhas:

1. `a11yDark.spec.ts` (home comum) e `signIn.spec.ts` (usuário comum, desktop): `getByRole("link", { name: "Entidades" })`
   achou dois elementos, o item da sidebar e o link novo "Ver entidades" da home, porque o Playwright compara nome por
   substring. O produto está certo; o seletor estava frouxo. Corrigi com `exact: true` em `apps/e2e/tests/a11yDark.spec.ts`
   e `apps/e2e/support/panelNavigation.ts`. Depois disso, os dois passam.
2. `focusNotObscured.spec.ts`, "Shift+Tab brings a field out from under the navbar": o teste supunha que o campo antes
   da descrição é o "Nome". A ordem nova é Nome, Tipo, Descrição, então Shift+Tab vai ao "Tipo". Ajustei o teste para
   usar o `combobox` "Tipo" como campo anterior. Passa.
3. `focusNotObscured.spec.ts`, "arrow keys keep the focused genre option clear of the action bar": a pré-condição
   (última opção de gênero abaixo da barra com a página no topo) deixou de valer, porque o formulário em duas colunas
   ficou mais curto (última opção em y 591, barra em 743). O teste agora preenche uma descrição longa e rola até a
   opção marcada ficar 4 px acima da barra antes de focar. Passa.
4. `focusNotObscured.spec.ts`, "Tab and Shift+Tab keep every focused field clear of the sticky bars": **falha real**,
   continua falhando. Ver defeito D2.

Os demais specs (`accountSettings`, `crossAppSignOut`, `entityCrud` desktop e celular, `landing`, `organizationOwnership`,
`panelSwitch`, `signUp`) passaram na primeira rodada, o que confirma que o E2E acha os papéis `menuitem`, `row` e
`alertdialog` do menu e da tabela novos.

## Lighthouse (landing, celular)

`pnpm --filter web exec next build` com o ambiente do emulador, depois `pnpm lighthouse` cinco vezes. A ferramenta mede
uma vez por rodada; a mediana é minha.

| rodada | Performance | LCP | TBT |
|--------|-------------|-----|-----|
| 1 | 60 | 6,3 s | 559 ms |
| 2 | 79 | 3,5 s | 466 ms |
| 3 | 84 | 4,4 s | 133 ms |
| 4 | 71 | 3,4 s | 914 ms |
| 5 | 87 | 4,0 s | 81 ms |

Mediana do LCP da home: **4,0 s**, acima dos 2,5 s de "bom". Na rodada 1, `/pt-br/pricing` deu 3,3 s e `/pt-br/contact`
3,1 s. Acessibilidade 100 nas três páginas, CLS 0, SEO 83 nas três (não investiguei a causa). O elemento de LCP não é o
`h1`: é o parágrafo de apoio do hero (`div.hero-enter > p.max-w-[52ch]`), com 5,8 s de render delay na rodada 1 e TTFB de
488 ms. A variação entre rodadas e o TBT alto sugerem que o atraso vem do trabalho na thread principal, mas não isolei
se a entrada do hero contribui. Sem comparação com o `main`, porque isso pediria um segundo build. Lighthouse é medição,
não gate. O critério fica aberto como pendência sem linha de base: só dá para dizer se a entrada do hero piorou o LCP
medindo o `main` nas mesmas condições (build de produção, cinco rodadas, mediana).

## Defeitos

### D1. Toast de erro cobre o botão "Salvar" (corrigido pelo coordenador, medido na segunda rodada)

`packages/design-system/components/ui/sonner.tsx` fixa `position="bottom-right"`, o mesmo canto da ação primária do
`Footer` fixo. Medidas e repro estão no item 2 da tabela acima. O usuário fica sem o "Salvar" enquanto o toast de erro
está na tela, justamente quando quer tentar de novo. Opções, todas no mesmo arquivo: mover o `Toaster` para o topo
(`top-right` ou `top-center`); ou subir o deslocamento inferior quando houver barra fixa na página, com um override de
`--offset-bottom` condicionado a `body:has([data-sticky-action-bar])` (o Sonner escreve esse valor inline, então o
override precisa de `!important`), e o mesmo para o `mobileOffset`. A escolha é de design e fica com o `/develop`.

### D2. Descrição longa fica parcialmente sob a barra de ações ao receber foco por Tab (corrigido pelo coordenador, medido na segunda rodada)

Repro em 375 × 812: `/pt-br/entities/create`, descrição com 12 linhas, página no topo, foco no "Nome", Tab duas vezes.
O foco chega à descrição (306 px de altura) com o topo em y 458 e o fim em y 764; a barra começa em y 743. O
navegador só rola o cursor de texto para a área visível, e o cursor está na primeira linha, então os últimos 21 px do
campo ficam sob a barra. Antes, a descrição vinha logo depois do "Nome", alta o bastante na página para caber inteira;
a ordem nova (Nome e Tipo lado a lado, Descrição depois) empurrou o campo para baixo. O campo continua parcialmente
visível, o que atende ao mínimo do WCAG 2.4.11, mas o contrato do repositório (`apps/app/CLAUDE.md` e o próprio
`focusNotObscured.spec.ts`) exige o campo focado inteiro fora das barras. Opções: rolar o campo inteiro para a área
visível ao receber foco (por exemplo `scrollIntoView({ block: "nearest" })` no `onFocus` do textarea, que respeita o
`scroll-padding`), ou voltar a descrição para logo depois do "Nome". Não relaxei o teste.

### D3. `Badge` tonal abaixo de 4,5:1 no tema claro (corrigido pelo coordenador, medido na segunda rodada)

Medidas no item 3 da tabela acima. O caso real mais baixo é o selo "Sensível" (warning) na auditoria, com 4,45:1 sobre
a linha branca; sobre fundo off-white ou `muted` todos os três tons caem para a faixa de 4,1 a 4,4. O
`themeContrast.test.ts` só mede tokens sólidos sobre fundo sólido, por isso não acusa. Opções: escurecer `--success`,
`--warning` e `--destructive` do tema claro em `packages/design-system/styles/globals.css` (hoje 4,9 a 5,4:1 sobre
branco, sem margem para a tinta de 10 %), ou dar ao `Badge` um texto mais escuro que o token. Em qualquer caso, vale
acrescentar ao `themeContrast.test.ts` os pares compostos (texto sobre token a 10 % sobre `--card`, `--background` e
`--muted`).

### D4. Ação "Encerrar" das sessões escondida em 1440 px (corrigido)

`AccountSessionsPanel.tsx` passou a usar `whitespace-nowrap` nas duas datas. Na coluna estreita da conta, isso fazia a
tabela transbordar e o botão "Encerrar" de cada sessão ficava atrás da rolagem horizontal, mesmo em 1440 px. Tirei o
`whitespace-nowrap` das duas células de data (elas quebram em duas linhas, como no layout anterior). Medido depois:
`scrollWidth` 552 para 552, "Encerrar" inteiro dentro do contêiner. `pnpm --filter app test` e o `pnpm test` da raiz
passam com a mudança.

### Observações sem bloqueio

- Busca sem resultado mostra o texto de vazio do chamador, "Nenhuma entidade cadastrada.", mesmo com quatro entidades
  na lista. Já era assim com o antd.
- O avatar do menu de perfil mostra "us" e "ad" em minúsculas, enquanto o `RecordAvatar` das listas usa maiúsculas.
- Menus entram de `scale(0.95)`; o `DESIGN.md` fala em 0,96.
- As colunas de ações de membros e convites da equipe deixam o título "Ações" visível; as outras tabelas usam `sr-only`.

## Critérios de aceite

| critério | status | meio |
|----------|--------|------|
| Tabela pagina no cliente com dez linhas por padrão | ✅ | unit (`tablePagination`) |
| Seletor de tamanho de página volta para a primeira página | ✅ | unit; no navegador 🔒 (3 usuários) |
| `hideOnSinglePage` esconde o paginador | ✅ | unit e e2e manual (usuários admin) |
| Busca filtra em memória e volta para a página 1 | ✅ | unit e e2e manual |
| Tabela mostra esqueleto, vazio e recarga sem pular | ✅ | unit; vazio também no navegador em en e es |
| Tabela larga rola dentro do cartão, não a página | ✅ depois da correção D4 | e2e manual (390 e 1440 px) |
| `ActionsMenu` abre e exclui pelo mouse | ✅ | e2e manual e `entityCrud.spec.ts` |
| `ActionsMenu` funciona só pelo teclado e devolve o foco | ✅ | e2e manual e unit |
| Transferência de posse da equipe pelo teclado | ✅ por teste, 🔒 no navegador | unit (`organizationTransferKeyboard`) e `organizationOwnership.spec.ts` |
| Toasts pelo Sonner nos dois temas e sem cobrir a ação primária | ✅ depois da correção D1 | e2e manual (1440 e 390 px) |
| Formulários de página inteira em `FormSurface` com `Footer` fixo | ✅ | e2e manual |
| Campo focado pelo teclado não fica atrás das barras fixas | ✅ depois da correção D2 | `focusNotObscured.spec.ts` (3 de 3) e e2e manual em 375 × 812 |
| `MetricStrip` formata número pelo locale e aguenta sete dígitos | ✅ | unit e e2e manual |
| `LoadErrorState` oferece "Tentar de novo" | ✅ por teste, 🔒 no navegador | unit |
| `RecordAvatar` mostra foto ou iniciais | ✅ | unit e e2e manual (listas) |
| Conta com abas e sessões em `Table variant="flush"` | ✅ depois da correção D4 | e2e manual e `accountSettings.spec.ts` |
| Admin: home, usuários e auditoria | ✅ | e2e manual e `a11yDark.spec.ts` |
| Onboarding em 390 px com o `Footer` não fixo | ✅ | e2e manual e `signUp.spec.ts` |
| Telas de autenticação com painel de marca | ✅, com banner de cookies simulado | e2e manual e `a11yDark.spec.ts` |
| Landing sem prova social inventada | ✅ | e2e manual (pt-br, en, es) |
| Header da landing: skip link, menu móvel e faixa intermediária | ✅ | e2e manual e unit |
| Contraste AA nos tons sólidos e translúcidos | ✅ depois da correção D3 | unit (`themeContrast`, bloco "tonal badges") e medição no navegador |
| `prefers-reduced-motion` | ✅ | e2e manual |
| Três idiomas sem chave faltando | ✅ | paridade (67/67) e e2e manual em app e web |
| Autorização inalterada | ✅ | leitura do diff (sem guard, proxy nem header), `panelSwitch.spec.ts`, `impersonationReadOnlyNotice` e `entitiesListReadOnly` no `app test` |
| Sem antd nem react-toastify no bundle | ✅ | leitura do diff e typecheck; nenhum `ToastContainer` |
| E-mails com a paleta nova | ✅ | preview do `apps/email` (botão `rgb(37, 89, 191)` com texto branco, fundo `rgb(249, 250, 251)`) |
| Desempenho da landing | 🔒 pendência sem linha de base (mediana 4,0 s na branch, `main` não medido) | Lighthouse, cinco rodadas |

## Segunda rodada: D1, D2 e D3 depois da correção

O coordenador corrigiu os três defeitos no working tree, sem commit:

- D1: regra em `packages/design-system/styles/globals.css` que, com `body:has([data-sticky-action-bar])`, põe
  `--offset-bottom` e `--mobile-offset-bottom` do `[data-sonner-toaster][data-y-position="bottom"]` em 96 px.
- D2: `packages/design-system/components/ui/textarea.tsx` chama `scrollIntoView({ block: "nearest" })` no `onFocus`,
  antes do `onFocus` do chamador.
- D3: tema claro com `--success: oklch(0.48 0.11 155)`, `--warning: oklch(0.5 0.13 55)` e `--destructive` /
  `--destructive-foreground: oklch(0.51 0.19 25)`; `themeContrast.test.ts` ganhou o bloco "tonal badges".

O `pnpm check` acusou formatação na regra nova do `globals.css`; rodei `biome format --write` no arquivo, que só
quebrou o seletor em duas linhas (mesmo seletor descendente).

### Medições

| defeito | veredito | o que foi medido |
|---------|----------|------------------|
| D1 | **passa** | Mesmo repro (edição aberta, entidade excluída noutra aba, "Salvar"). Em 1440 × 900: toast de erro em x 1045-1401, y 736-809; barra de ações em y 831-900; "Salvar" em x 1179-1253, y 848-884. `elementFromPoint` no centro do "Salvar" devolve o "Salvar", e no centro do "Voltar" devolve o "Voltar". Botão de fechar do toast em x 1039-1059, y 730-750, e `elementFromPoint` no centro dele devolve o próprio botão. `--offset-bottom` computado: 96 px. Em 390 × 844: toast em x 16-359, y 687-760; barra em y 775-844; "Salvar" e "Voltar" livres; fechar em x 10-30, y 681-701, alcançável. Sem barra na tela (lista de entidades em 1440 px), o toast de sucesso da exclusão termina em y 876 num viewport de 900 e o `--offset-bottom` volta a 24 px. Efeito colateral visto: em 1440 px o toast agora sobrepõe parte do campo "Data de nascimento" enquanto está na tela; não é ação primária e some com o tempo ou pelo fechar. |
| D2 | **passa** | Repro em 375 × 812 (descrição de 12 linhas, 306 px de altura, página no topo, foco no "Nome"). Tab até a descrição: topo em y 426, fim em y 732, barra em y 743, página rolada 32 px. Shift+Tab de volta a partir da foto: descrição com topo em y 80 e `Navbar` terminando em 56. `focusNotObscured.spec.ts`: 3 de 3, sozinho e dentro do `pnpm e2e`. |
| D3 | **passa** | Claro, compondo o fundo real: "Sensível" (warning) na auditoria 5,39:1 e 4,99:1 com o hover da linha; "Vinculado" (success) na conta 5,34:1; no `bg-muted/50` do playground success 5,00, warning 5,05, destructive 5,03 ("Bloqueado"). Botão destrutivo sólido no claro: texto branco sobre `rgb(186, 29, 39)`, 6,38:1. O selo "Expirado" (warning) dos convites não apareceu, porque o seed não tem convite vencido; usa o mesmo tom warning medido acima. O tema escuro não mudou. |

### Comandos da segunda rodada

| comando | resultado |
|---------|-----------|
| `pnpm e2e` (JDK 21, emuladores meus reutilizados) | 45 testes: 44 passando, 1 falhando em `panelSwitch.spec.ts` |
| `playwright test` em `panelSwitch` e `focusNotObscured`, depois de corrigir o seletor | 9 de 9 (com o setup) |
| `pnpm --filter @repo/design-system test` | 13 arquivos, 194 testes passando |
| `pnpm --filter app test` | 158 arquivos, 1415 testes passando |
| `pnpm --filter @repo/design-system typecheck` · `e2e` | sem erro |
| `pnpm check` (depois do `biome format` no `globals.css`) | `Checked 1180 files … No fixes applied.` |
| `pnpm test` na raiz, com JDK 21 | 15 tasks, 15 com sucesso, 8 do cache, 2 min; app 1415, web 321, design-system 194, api 1984, `api:test:emulator` 284 |

A falha do `panelSwitch.spec.ts` é o mesmo seletor frouxo da primeira rodada: `getByRole("link", { name: "Entidades" })`
casava também com "Ver entidades" da home comum. Na primeira rodada passou porque o resumo da home ainda não tinha
carregado quando o clique aconteceu. Acrescentei `exact: true` em `apps/e2e/tests/panelSwitch.spec.ts`; os outros três
pontos que usam esse rótulo já estavam com `exact: true`.

### Ambiente da segunda rodada

Portas livres no início. Subi os emuladores (JDK 21), `api` (3002) e `app` (3000) com o ambiente do `apps/e2e` e o
seed; a landing não entrou, porque nenhuma das três correções toca a web. O `pnpm e2e` e a rodada parcial reutilizaram
os meus emuladores e derrubaram os próprios servidores. Derrubei `api` e `app` por PID, fechei o navegador e parei os
emuladores com SIGINT. No fim, 3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001, 4400 e 4500 sem processo. Dados de novo
só no emulador: duas entidades do seed excluídas e o `user2@example.com` desativado e reativado.

## Hierarquia por tela (pergunta 5 do gate)

Home comum: a primeira célula do `MetricStrip` ("Entidades"). Lista de entidades: o `h1` e o botão "Novo" no topo, depois
o nome em cada linha. Formulário: o botão "Salvar" na barra fixa. Conta: o título da seção ativa. Admin: "Usuários" na
faixa de indicadores. Login: o botão "Entrar". Landing: o `h1` e "Criar conta". Pricing: o cartão "Sob medida", já que
o catálogo de planos está vazio neste ambiente.

## Cross-check

Conferido: `apps/app` e `apps/web`; comum, admin e (pelo E2E) troca de painel; 390, 900 e 1440 px; claro e escuro; pt-br,
en e es em uma tela de cada app. Não conferido: modo `subscription` com planos (sem Stripe neste ambiente, a pricing
mostra o estado vazio) e personificação dirigida no navegador (coberta pelos testes de unidade e pelo E2E de troca de
painel).

## Ambiente do e2e

Todas as portas (3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001) estavam livres no início; nada foi reutilizado do
usuário.

- Subi os emuladores (`pnpm emulators`, JDK 21) e, com o ambiente que o próprio `apps/e2e` monta a partir dos
  `.env.example`, `api`, `app` e `web` em `next dev` nas portas 3002, 3000 e 3001, mais o preview do `apps/email` em 3003.
  Seed com `apps/api/scripts/seed-emulator.mjs`.
- O `pnpm e2e` e a segunda rodada parcial reutilizaram os meus emuladores e subiram e derrubaram os próprios servidores.
  O `pnpm lighthouse` subiu e derrubou o próprio `next start` em 3001. O `test:emulator` do `pnpm test` final subiu e
  derrubou os próprios emuladores.
- Derrubei por PID os servidores que subi e os emuladores (SIGINT) e fechei o navegador do `agent-browser`. No fim,
  `lsof -ti tcp:<porta>` saiu vazio em 3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001, 4400 e 4500.

## Estado de dev alterado

Nenhum projeto Firebase real foi tocado. Tudo aconteceu nos emuladores, que morreram com o processo: entidades criadas,
editadas e excluídas, um usuário desativado e reativado (gerando dois eventos de auditoria) e a conta
`qa-design-system-refresh@example.com`, criada pelo cadastro para percorrer o onboarding. As contas do seed
(`user@example.com`, `admin@example.com`) têm a senha documentada em `docs/SETUP.md`; nenhuma senha está neste arquivo.
Nenhuma conta foi para o `docs/PRE-PRODUCTION.md`, porque nenhuma existe fora do emulador. Os screenshots ficaram em
`test/e2e/` (descartados pelo `.gitignore`); o texto acima é a evidência.

## Arquivos alterados nesta etapa

- Produto: `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSessionsPanel.tsx` (D4).
- Testes novos: `packages/design-system/__tests__/tablePagination.test.tsx`, `apps/app/__tests__/recordAvatar.test.tsx`,
  `apps/app/__tests__/loadErrorState.test.tsx`, `apps/app/__tests__/metricStrip.test.tsx`.
- Testes estendidos: `packages/design-system/__tests__/actionMenu.test.tsx`, `apps/web/__tests__/headerMobileMenu.test.tsx`.
- E2E: `apps/e2e/tests/a11yDark.spec.ts`, `apps/e2e/support/panelNavigation.ts`, `apps/e2e/tests/focusNotObscured.spec.ts`,
  `apps/e2e/tests/panelSwitch.spec.ts`.
- Correções do coordenador, medidas aqui: `packages/design-system/styles/globals.css` (com o `biome format` desta etapa),
  `packages/design-system/components/ui/textarea.tsx`, `packages/design-system/__tests__/themeContrast.test.ts`.
- Artefatos: `test/criterios-aceite.md`, este `report.md` e o `STATE.md`.
