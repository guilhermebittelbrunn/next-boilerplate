# Relatório do `/test`: telas de formulário centralizadas e com altura do conteúdo

Branch: `guilhermebittelbrunn/claude-cycle-full-pipeline` (não protegida, sem commit próprio; a renomeação para
`feat/app-form-layout-centered` fica com o `/review`). Rodada autônoma do `/cycle`, 2026-11-25.

Resultado: todos os critérios de aceite passam. Nenhum defeito de produção na feature. A suíte E2E passou nos
45 casos, mas quatro precisaram de nova execução por timeout de compilação do `next dev` numa máquina com load
average entre 37 e 152 (detalhe em "Rede de regressão"). O achado da tabela antd sem CSS na primeira pintura se
confirma também no build de produção e vai como follow-up fora de escopo.

## Cobertura automatizada

| comando | escopo | resultado |
|---|---|---|
| `pnpm --filter app test` | 144 arquivos | 1321 testes, todos verdes (83 s) |
| `pnpm test` (raiz, com JDK 21 para `test:emulator`) | 15 tasks do turbo, 12 do cache | 4663 testes verdes: app 1321, api 1825, api:test:emulator 274, web 315, auth 201, email 209, design-system 172, internationalization 67, security 65, shared 63, analytics 41, next-config 38, e2e 38, payments 19, sdk 15 |
| paridade de i18n | não se aplica | nenhuma chave tocada; o pacote passou dentro do `pnpm test` (67 testes, do cache) |
| `npx playwright test focusNotObscured --project=chromium --repeat-each=5` | os três casos do arquivo, 5 vezes | 15/15 verdes |
| `npx playwright test focusNotObscured -g "arrow keys" --project=chromium --repeat-each=10` com reporter próprio de passos | caso 3 (D0), 10 vezes | 10/10 verdes, 1 clique por repetição |
| `pnpm e2e` | 45 casos (chromium + mobile) | 41 verdes na primeira passada; os 4 restantes verdes em nova execução (ver abaixo) |

Sem `--force`: o cache do turbo valeu para os 12 workspaces que não mudaram. Typecheck e `pnpm check` foram
medidos pelo `/review` (1138 arquivos sem erro) e não remedi, porque não acrescentei arquivo.

Teste novo: nenhum. T1 (`pageShell.test.tsx`) e T2 (`formLoadingSkeletons.test.tsx`) já cobrem as classes do
`Container` e dos cinco `loading.tsx`. O que sobra é geometria (altura do painel, distância da barra, posição
do esqueleto), que o jsdom não calcula. Isso só se prova no browser, e a passada abaixo mediu cada item.

## Decisões de custo de teste

| módulo tocado | decisão |
|---|---|
| `pageLayout.ts` (`PAGE_NARROW_CLASS`) | T1, unitário, já cobre `mx-auto` só com `width="narrow"` |
| cinco `loading.tsx` estreitos | T2, unitário, já cobre a coluna estreita no esqueleto |
| quatro `<form>` e cinco blocos da conta | sem teste novo. A mudança remove `flex-1`/`min-h-[50vh]`; a consequência é de layout e foi medida no browser. Um teste de string de classe repetiria o diff sem provar a altura |
| `focusNotObscured.spec.ts` (D0) | é o próprio teste caro, já existente; rodado em repetição |

Nenhum teste da faixa cara foi criado.

## Verificar no `/test` (os nove itens do `review.md`)

1. **D0 depois da correção: confirmado.** Primeiro rodei com `--repeat-each=10`, e o setup caiu antes do spec:
   `sign in as the admin` estourou 300 s compilando `/pt-br/admin/users` (o log do `next dev` mostra
   `GET /pt-br/admin/users 200 in 7.3min`, com load average 152 em 8 núcleos). Não tem relação com o diff.
   Na segunda tentativa, `--repeat-each=5`, os 15 casos passaram. Para contar as tentativas do `toPass`, rodei
   o caso 3 mais 10 vezes com um reporter que conta os passos dentro do `toPass`: nas 10 repetições houve
   exatamente 1 clique e 1 checagem de visibilidade, com o `toPass` levando entre 420 ms e 1758 ms. O risco
   levantado na revisão (menu aberto por um clique reproduzido depois da hidratação e fechado pelo clique
   seguinte) não apareceu em nenhuma repetição. A primeira repetição de cada rodada vem logo depois de o
   servidor subir, mas o setup já compilou a rota da lista, então isso não equivale ao `next dev` frio do CI.
2. **Caso 1 a 375×812: confirmado.** Em `/pt-br/entities/create`, com a página no topo, um controle começa
   abaixo da barra (`birthdate`), a barra começa em 743 px, o `<form>` tem 749 px e o painel 664 px. O caso
   passou nas 5 repetições. A margem é pequena: só o campo de data fica abaixo da barra, então um formulário
   de criar entidade com menos campos faria essa asserção falhar.
3. **Barra fixa em formulário longo: confirmado.** Editar entidade a 1280×720 com descrição de 30 linhas
   (painel de 1290 px, documento de 1575 px): no topo e no meio da rolagem (`scrollY` 428 de 855),
   `bar.bottom - innerHeight = 0`; no fim da rolagem a barra fica 16 px abaixo do painel. A 390×844, criar e
   editar entidade também dão `bar.bottom - innerHeight = 0` com a página no topo.
4. **Formulário curto no desktop: confirmado.** A 1920×1080, nas quatro telas, o painel termina 16 px depois
   do último filho (o padding) e a barra começa 16 px abaixo dele. Alturas do painel: criar usuário 328 px,
   editar usuário 258 px, criar entidade 664 px, editar entidade 736 px. Abaixo da barra sobram 483, 553, 147
   e 75 px com a cor de fundo da página.
5. **Centralização: confirmado.** Margem esquerda igual à direita nas cinco telas: 383,5 px a 1920×1080 e 56 px
   a 1280×800 (63,5 px nas telas do admin, cuja sidebar é mais estreita). Na aba Segurança a barra de rolagem
   reduz a área e as margens ficam em 376/376. O `h1` começa 16 px depois da borda da coluna em todas. Com a
   sidebar recolhida, a coluna continua no centro (479,5/479,5).
6. **Listas e dashboards sem mudança: confirmado.** Entidades, organização, home comum, usuários, auditoria e
   admin home: a coluna tem 1663 px a 1920 (a área inteira), margens 0/0, sem `mx-auto` nem `max-w-4xl` na
   classe.
7. **Esqueletos sem salto horizontal: confirmado.** Com a rede limitada a 2 s de latência e 50 KB/s por CDP,
   amostrei cada quadro da navegação para as cinco telas. O esqueleto aparece em cerca de 25 ms e a tela
   carregada em cerca de 2,1 s; nos dois estados a coluna fica em `left` 640,5 px com largura 896 px, e o
   título em `left` 656,5 px, `top` 128 px. Diferença 0. Sem `router.prefetch` antes, o Next não mostra o
   `loading.tsx` nessa navegação e vai direto para a tela pronta, então o prefetch faz parte do roteiro.
8. **Mobile: confirmado.** A 390×844, o painel tem `min-height` de 422 px (50vh) nas telas de formulário; no
   criar usuário, que tem pouco conteúdo, o painel fica nos 422 px. Editar entidade com id inexistente, e com
   o id de uma entidade de outro usuário, mostra "Não foi possível carregar a entidade." numa caixa de 68 px
   dentro do wrapper de 50vh do `contentOnly`, sem botão Voltar. Esse caminho não mudou no diff. Editar usuário
   com id inexistente mostra "Não foi possível carregar o usuário." do mesmo jeito.
9. **Conta: confirmado.** Nas cinco abas, nenhum filho do painel ativo tem `flex-grow` diferente de 0, exceto
   o `AccountBillingPlaceholder`, e o painel termina na altura do conteúdo (Perfil 744 px, Preferências 438,
   Segurança 1208, Privacidade 500, Cobrança 270). O `flex-1` do placeholder não tem espaço para crescer: a
   folga de 41 px é o padding dele. Nenhuma barra fixa na conta. Cobrança com Stripe ligada: troquei a
   resposta de `/payments/plans` no browser por `enabled: true` com dois planos de QA, e os dois cards
   aparecem dentro da coluna centralizada, com o painel terminando em 394 px. A diferença de 24 px entre os
   cards vem do `flex-1` do `BillingPlanCard`, que iguala a altura dos dois e está fora do corte. O estado de
   catálogo com erro ("Não foi possível...") também apareceu na mesma coluna.

## Critérios de aceite

| critério | status | meio |
|---|---|---|
| Coluna estreita centralizada em monitor largo | ✅ PASS | e2e (agent-browser, medição no DOM), 1920 e 1280, sidebar aberta e recolhida |
| Painel do formulário na altura dos campos | ✅ PASS | e2e; personificando, o aviso de somente leitura (98 px) entra no painel e a folga continua 16 px |
| Barra fixa em formulário longo | ✅ PASS | e2e (1280×720, 390×844) e `focusNotObscured` casos 1 e 2 |
| Conta sem blocos esticados | ✅ PASS | e2e, cinco abas; Cobrança com placeholder, com planos (resposta trocada no cliente) e com erro de catálogo |
| Esqueleto sem salto horizontal | ✅ PASS | e2e com rede limitada, cinco telas; T2 |
| Listas e dashboards inalterados | ✅ PASS | e2e, seis telas; lista vazia no celular com painel de 422 px (50vh) |
| Mobile preserva o painel mínimo e o erro de carga | ✅ PASS | e2e a 375×812 e 390×844, id inexistente e id de outro usuário |
| Temas e idiomas | ✅ PASS | e2e claro/escuro; pt-br, en, es; botões da barra com 36 px de altura (uma linha) a 390 px: "Voltar/Salvar", "Back/Save", "Volver/Guardar" |
| Autorização inalterada | ✅ PASS | e2e: usuário comum em `/pt-br/admin/users/create` volta para `/pt-br`; admin personificando vê o aviso |
| Rede de regressão do E2E | ✅ PASS | `focusNotObscured` 15/15 e caso 3 10/10; `pnpm e2e` 45/45 somando a nova execução |

Não verificados (🔒): Safari e Firefox, e teclado virtual de celular real. A Cobrança com Stripe real também
fica 🔒: provei o layout com a resposta trocada no browser, sem chave da Stripe.

### Rede de regressão: as quatro falhas do `pnpm e2e`

Primeira passada: 41 verdes e 4 vermelhos, todos por tempo. `a11yDark` em `/pt-br/account?tab=profile`
(`page.goto` estourou 60 s; o log mostra a primeira compilação de `/[locale]/account` em 81 s), `panelSwitch`
(`goto /pt-br/admin` estourou 60 s; `application-code` de 2,1 min), `signIn` mobile do admin (o heading não
apareceu em 30 s) e `organizationOwnership` (limite de 120 s). Com `--last-failed`, três passaram;
`organizationOwnership` estourou de novo (páginas de organização levando de 24 a 36 s) e passou sozinho na
terceira execução, em 48 s. Nenhum desses specs passa pelas telas do diff, a não ser a conta no `a11yDark`,
que passou na nova execução. Load average medido durante as rodadas: entre 37 e 152 em 8 núcleos, com outros
workspaces ativos na máquina.

## Achado da tabela antd sem CSS (fora de escopo, confirmado em produção)

Rodei a passada de browser contra `next build` + `next start` da `apps/app` (API em `next dev`, emuladores).
O HTML que o servidor de produção devolve para `/pt-br/entities` tem a marcação da tabela antd (30 células
`ant-table-cell`) e nenhuma tag `<style>`. Amostrando cada quadro numa carga com 300 ms de latência e 200 KB/s,
nas três execuções a tabela fica visível sem estilo por cerca de 4,7 s (linhas de 40 px, tabela de 208 px) e
depois troca para 21 tags de estilo do antd, linhas de 73 px e tabela de 347 px. Sem limitar a rede, uma de
duas cargas mostrou a tabela sem estilo por 81 ms; a outra já pintou estilizada. O repositório não usa
`@ant-design/nextjs-registry` nem `StyleProvider`. Hipótese de correção, a validar: extrair o CSS-in-JS do
antd no SSR com o `AntdRegistry` no layout da app. Não vi o cabeçalho duplicado que o handoff descreveu: em
todos os quadros havia um só `thead` visível.

## Ambiente do e2e

- O `pnpm e2e` e as rodadas do `focusNotObscured` sobem e derrubam o próprio ambiente (webServer do
  Playwright). Portas livres ao fim de cada rodada.
- Para a passada de browser subi, com as variáveis do `buildStackEnv` da suíte E2E (projeto
  `demo-next-boilerplate`, nenhuma chave real): `pnpm emulators` (PID 52742, filhos 52766 e 52825), o seed
  `apps/api/scripts/seed-emulator.mjs`, a API em `next dev -p 3002` (PID 54903) e a app em
  `next start -p 3000` (PID 54905), depois de `next build` com `NODE_ENV=production`.
- Derrubei por PID (SIGINT nos emuladores). Ao fim, 3000, 3001, 3002, 3003, 8080, 9099, 9199, 4001, 4400 e 4500
  estavam livres. Nada do usuário estava de pé para reutilizar.
- O `next dev` desta versão gera `AGENTS.md` em `apps/api`, `apps/app` e `apps/web` ao subir. Os três apareceram
  como não rastreados depois do primeiro E2E; apaguei porque fui eu que os criei. Quem rodar `pnpm dev` ou
  `pnpm e2e` vai ver o mesmo.
- `apps/app/.next` ficou com o build de produção (ignorado pelo git) e `apps/e2e/test-results` com os
  artefatos da última falha (também ignorado).

## Dados de QA

Só as contas do seed do emulador: `user@example.com` (comum), `admin@example.com` (admin) e
`user2@example.com`. A senha é a do seed, documentada em `docs/SETUP.md`. Nenhuma conta criada em projeto real
e nada a acrescentar ao `docs/PRE-PRODUCTION.md`. Os dados morreram com o emulador. Na edição com descrição de
30 linhas eu não salvei o formulário.

## Evidências e2e

Os prints estão em `test/e2e/` (descartados pelo `.gitignore`); os números acima são a evidência. Um print do
admin (`20-admin-user-create-390-dark-es.png`) saiu primeiro da sessão errada do agent-browser e foi refeito;
as medições daquela tela vieram do `eval` na sessão certa (URL, idioma e `h1` conferidos).

## Lacunas herdadas

| lacuna (`review.md`/`handoff.md`) | veredito |
|---|---|
| Classes do `<form>` e dos blocos da conta sem teste unitário | continua aberta, por decisão do plano; a altura foi medida no browser nos itens 3, 4 e 9 |
| Correção do D0 não executada | fechada: 15/15 e 10/10, 1 clique por repetição |
| CSS do antd ausente na primeira pintura | confirmada em produção; sai de escopo como follow-up de backlog |
| Afirmações do handoff sobre centralização, painel, barra, esqueleto, listas e conta | fechadas, todas confirmadas com medição |

## Follow-ups

- Backlog: SSR do CSS-in-JS do antd (achado acima).
- Backlog: o caso 1 do `focusNotObscured` depende de o campo de data ficar abaixo da barra a 375×812. Um
  formulário de criar entidade mais curto derruba a asserção sem regressão real de foco.
- Tooling: o `next dev` gera `AGENTS.md` nos três apps. Cabe `agentRules: false` no `next.config` ou uma linha
  no `.gitignore`.

## Roteiro manual

1. Entrar como `user@example.com` (emulador). A 1920×1080, abrir `/pt-br/entities/create`: coluna no centro,
   painel terminando logo após "Data de nascimento", barra 16 px abaixo.
2. Abrir editar "Acme Franchise" a 1280×720, colar 30 linhas na descrição e rolar: a barra fica no rodapé até o
   fim do formulário.
3. Abrir `/pt-br/entities/edit/nao-existe`: mensagem "Não foi possível carregar a entidade." na coluna.
4. Percorrer as abas de `/pt-br/account` em claro e escuro, em pt-br, en e es: nenhum bloco esticado.
5. Entrar como `admin@example.com`: criar e editar usuário centralizados. Trocar para "Painel do usuário",
   personificar `user@example.com` e abrir editar entidade: o aviso de somente leitura aparece dentro do
   painel.
6. Na lista de entidades, buscar um termo sem resultado a 390×844: painel com metade da altura da tela.
