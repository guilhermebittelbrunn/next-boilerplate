# Relatório do `/test`: header da web cabe na janela e o botão do menu tem nome

Rodada autônoma do `/cycle`, terceira tarefa da mesma PR que `date-input-navigation` e
`form-field-focus-and-names`, em `guilhermebittelbrunn/cycle-command-v4` (não protegida). Nenhum commit, nenhuma
branch e nenhum `git add`. Esta etapa não criou nem alterou teste.

Resultado: 5 critérios verificados e corretos, 1 falha num critério que o plano marca como informativo, nenhum não
verificado. Com a configuração padrão, nenhuma das 36 combinações de 1024 a 1440 px rola de lado, a marca fica no
centro exato e nenhum item some. A falha informativa é a configuração extrema: com um nome de marca de 30
caracteres, a 1024 px a página ainda rola de 4 a 34 px, porque o nome não encolhe. Achei também um defeito anterior
a esta entrega: o link de documentação nunca aparece, mesmo com `NEXT_PUBLIC_DOCS_URL` definido.

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `corepack pnpm test` (raiz, `turbo test test:emulator`, JDK 21 no `PATH`, sem `--force`) | 15 de 15 tarefas, 4 do cache. web 102 (17 arquivos), i18n 67 (7, com a paridade), design system 171, app 846, api 1205, `api:test:emulator` 186 |
| `corepack pnpm e2e` | 22 de 22 em 1,6 min, `A11Y_ALLOWLIST` vazia. Cobre o axe em `web:/pt-br` e `web:/pt-br/sign-up` no escuro, a 1280 px |
| axe-core 4.13.0 injetado pelo `agent-browser`, escopo `header`, todas as gravidades | zero violações a 390 px em es e pt-br, claro e escuro, com o menu fechado e aberto (8 rodadas), e a 1280 px em es claro |

Não remedi `pnpm check` nem o `typecheck` da web: esta etapa não mexeu em arquivo, e o `/review` mediu 885
arquivos e 2 de 2.

## Decisões de custo de teste

Nenhum teste novo. Layout e rolagem dependem do motor de layout, que nem o `node` nem o jsdom têm, e foram medidos
no navegador (decisão D6 do plano). O `headerMenuButton.test.tsx` (SSR) já cobre o nome e o estado inicial do
botão nos três idiomas, e o `brandSurfaces.test.tsx`, a classe da marca.

## Método

Web em build de produção (`next build` e `next start`, porta 3001), com o env da `apps/e2e` (emuladores em
`127.0.0.1`, projeto `demo-next-boilerplate`, `NEXT_PUBLIC_PRODUCT_MODE=subscription`) e `NEXT_PUBLIC_APP_URL`
apontando para `http://localhost:3000` só no processo, para o link "Ir para o painel" aparecer no caso logado. API
em `next dev` (3002) para a sessão; a app não subiu, porque o link do painel só precisa da URL. Login com a conta
comum do seed.

Em cada combinação: `document.documentElement.scrollWidth` contra `clientWidth`; centro do bloco da marca (ícone e
nome) contra `clientWidth / 2`; se o nome está cortado; borda direita do último item; lista dos links e botões
visíveis do header, fora o painel do menu.

**Controle positivo.** Para provar que a medição pega o estouro, troquei no DOM a grade nova pela antiga
(`grid-template-columns: repeat(3, minmax(0, 1fr))`, que é o `lg:grid-cols-3` do `HEAD`) e tirei o corte da marca.
Os números do relatório anterior voltaram: es visitante a 1280 deu 1304; es e pt-br visitante a 1024, 1073 (+49) e
1030 (+6). Logado: 1024 deu +41 (es), +18 (pt-br) e +25 (en); 1280 deu +18, +8 e +2. Com a grade antiga a lista de
itens é a mesma, então a comparação de itens vale contra o `HEAD`. O diff só muda classes `lg:` e atributos do botão
do menu (`git diff`), então abaixo de 1024 px o DOM e as classes são as do `HEAD`.

## Critérios de aceite

| # | Critério | Status | Meio | Evidência |
|---|----------|--------|------|-----------|
| 1 | Botão do menu com nome e estado | ✅ | e2e + SSR | item 5 da lista do review |
| 2 | Sem rolagem lateral de 1024 a 1440 px | ✅ | e2e | item 1 |
| 3 | Marca centralizada e nada removido | ✅ | e2e | itens 2 e 3 |
| 4 | Abaixo de 1024 px nada muda | ✅ | e2e | item 4 |
| 5 | Configuração extrema sem rolagem (informativo) | ❌ | e2e | item 6; o plano diz que este critério não reprova a entrega |
| 6 | Tema, testes e gates | ✅ | suíte + e2e | tabela de comandos e item 7 |

## Verificar no `/test`

| # | Item do `review.md` | Veredito |
|---|---------------------|----------|
| 1 | Rolagem lateral a partir de 1024 px | **confirmado**. 36 combinações (1024, 1280 e 1440 px; pt-br, en e es; visitante e logado; claro e escuro): `scrollWidth` igual a `clientWidth` em todas, 1024/1024, 1280/1280 e 1440/1440. Nos casos que estouravam: es visitante a 1280, 1280 (era 1304); es visitante a 1024, 1024 (era +49); pt-br visitante a 1024, 1024 (era +6); logado a 1024 e a 1280, 1024 e 1280 nos três idiomas |
| 2 | Marca no centro | **confirmado**. Diferença de 0 px entre o centro da marca e o centro da janela nas 36 combinações. Borda direita do último botão: 1016 px a 1024, 1272 a 1280 e 1360 a 1440, em todas (o contêiner limita a 1440) |
| 3 | Nada sumiu | **confirmado**. Sete itens visíveis em todas as combinações de 1024 a 1440 px. Visitante: Início, Produto, Contato, seletor de idioma, Alternar tema, Entrar, Cadastrar (e o equivalente em en e es). Logado: os mesmos cinco primeiros, mais "Ir para o painel"/"Go to panel"/"Ir al panel" e "Sair"/"Sign Out"/"Cerrar sesión". O seletor de idioma mostra o nome do idioma a partir de 1280 px, como antes. Com a grade do `HEAD` simulada, a lista é idêntica |
| 4 | Regressão abaixo de 1024 px | **confirmado**. Visitante e logado, três idiomas, sem rolagem lateral (768/768 e 390/390). A 768 px: idioma, tema, os dois botões de conta e "Menu"/"Menú" (5 itens). A 390 px: visitante com "Cadastrar"/"Sign Up"/"Registrarse" e o menu; logado só com o menu. O nome da marca aparece inteiro e sem reticências (`text-overflow: clip`): a 390 px o texto vai de x=42 a x=167 e o próximo item começa em x=326; a 768 px vai até x=159 e o próximo item começa em x=333. Ressalva de método: o `<p>` da marca é mais estreito que o texto (`scrollWidth` > `clientWidth`) abaixo de 1024 px, mas com `overflow: visible` o texto aparece inteiro; é o comportamento do `HEAD`, porque abaixo de `lg` as classes não mudaram |
| 5 | Botão do menu | **confirmado**. Na árvore de acessibilidade: `button "Menu" [expanded=false]` em pt-br e en, `button "Menú" [expanded=false]` em es, a 390 e a 768 px. Clique (seis rodadas, 390 e 768 px, três idiomas): `aria-expanded` vai a `true` com o painel do menu aberto e volta a `false` com o painel fechado, e o foco fica no botão. Teclado, es, 390 px: um Tab a partir do topo chega ao botão, Enter abre (`expanded=true`), Enter fecha (`expanded=false`). Ressalva: o agent-browser não gera evento de toque; com a emulação do iPhone 14 o `pointerType` saiu `mouse`. O botão usa `onClick`, que o toque também dispara |
| 6 | Configuração extrema (informativo) | **derrubado**. Build com `NEXT_PUBLIC_APP_NAME="Plataforma de Exemplo Comprida"` (30 caracteres) e `NEXT_PUBLIC_DOCS_URL=https://docs.example.com`, só no env do processo. A 1024 px: es visitante 1058 (+34), es logado 1050 (+26), en logado 1035 (+11), pt-br logado 1028 (+4); pt-br e en visitante, sem rolagem. A 1280 e a 1440 px, sem rolagem em nenhum caso. O nome sai inteiro (`scrollWidth` = `clientWidth` = 260 px no `<p>`), então o `lg:truncate` não age: a coluna do meio fica com 285 px, e o grupo da direita precisa de 387 px numa coluna de 345. Marca no centro (0 px). Com a grade do `HEAD` a mesma configuração dava 1073 a 1024 e 1304 a 1280, então a entrega melhora também aqui, só não zera. O link de documentação não apareceu: ver "Achados fora do diff" |
| 7 | axe | **confirmado**. `pnpm e2e` 22/22 com a allowlist vazia; axe no header, todas as gravidades, zero violações nas 9 rodadas da tabela de comandos |

## Menu ao navegar (informativo, fora do corte)

A 390 px, abri o menu e segui "Contato": a página `/pt-br/contact` carregou com o menu ainda aberto
(`aria-expanded="true"`). O plano já deixava isso fora do corte.

## Achados fora do diff

1. **O link de documentação do header nunca aparece.** `apps/web/app/[locale]/components/header/index.tsx:72` lê
   `env.NEXT_PUBLIC_DOCS_URL` de `@/env`, mas `apps/web/env.ts` não declara essa variável no próprio `client`, e
   com `skipValidation: true` os valores dos envs estendidos (`core()`) não entram no objeto resolvido. O próprio
   `env.ts` registra a mesma limitação para `NEXT_PUBLIC_APP_URL`. Repro: `next build` da web com
   `NEXT_PUBLIC_DOCS_URL=https://docs.example.com`; o valor está no bundle (`grep` acha em `.next/static`), mas o
   HTML do servidor e o DOM só têm três itens de navegação, sem "Documentación". Hipótese de correção, não testada:
   declarar `NEXT_PUBLIC_DOCS_URL` no `client` e no `runtimeEnv` do `apps/web/env.ts`, como foi feito com o
   `NEXT_PUBLIC_APP_URL`. Isso também muda a configuração extrema: com o quarto link, o header fica mais largo do
   que o medido no item 6.
2. **Nome de marca longo ainda estoura a 1024 px** (item 6). Hipótese, não testada: o grupo da direita usa `w-full`,
   e a largura percentual faz o tamanho mínimo dele não contar na trilha `1fr`; tirar o `w-full` em `lg` ou dar a
   ele `lg:min-w-max` deixaria a coluna do meio, com `minmax(0, auto)`, ceder espaço e o `truncate` agir.
3. O `next start` da web registra "Unexpected error occurred while checking config TypeError: Cannot assign to
   read only property 'redirects'" ao subir, com a configuração padrão e com a extrema. O diff não toca no
   `next.config`, e o servidor responde normalmente.

## Evidências e2e

Os números estão nas tabelas acima. Screenshots de apoio em `docs/features/web-header-reflow-and-menu-name/test/e2e/`
(`01-web-es-logged-light-1280.png` a `04-web-es-extreme-1024.png`). O `.gitignore` descarta a pasta; a prova é o
texto. Os prints só mostram a conta do seed, e o header logado não exibe e-mail.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199, 4400, 4500, 9150). Não
reutilizei nada do usuário.

- `pnpm e2e` subiu e derrubou os próprios emuladores e servidores.
- Depois subi: `pnpm emulators` com o seed, `next dev -p 3002` na API e `next start -p 3001` na web, duas vezes (um
  build com a configuração padrão e outro com a extrema). As variáveis da configuração extrema ficaram só no env do
  processo; nenhum arquivo versionado mudou.
- Derrubei por PID (`SIGTERM` nos filhos do `pnpm`, `SIGINT` no `firebase-tools`). No fim, nenhuma das portas acima
  em escuta e nenhum `next start`, `next dev` ou emulador Java vivo.
- Refiz o `next build` da web com a configuração padrão no fim, para o `.next` não ficar com o nome de marca de
  teste. Ele continua com a config do emulador embutida (ignorado pelo git); `pnpm dev` não é afetado.
- Fechei as sessões `qa-hdr` e `qa-hdr-guest` do agent-browser, apaguei o diretório temporário em `/tmp` e o
  `firestore-debug.log` da raiz.

## Dados de QA

Tudo no emulador, que morreu com o processo. Nada em projeto real.

- Conta usada: a comum do seed (`user@example.com`). A senha do seed é pública no repositório e não foi copiada
  para cá.
- O `signUp.spec.ts` do `pnpm e2e` criou a conta que ele mesmo cria, no emulador daquela execução.
- Nenhum dado gravado pelas medições.
- Nada a acrescentar ao `docs/PRE-PRODUCTION.md`.

## Lacunas

| Lacuna | Origem | Veredito |
|--------|--------|----------|
| Layout e rolagem sem teste automatizado | handoff (D6 do plano) | **continua aberta** como teste, por decisão do plano; **fechada** como verificação pelos itens 1 a 4 |
| `aria-expanded="true"` depois do clique só no e2e | handoff | **fechada** pelo item 5 |
| Evento de toque real | `/test` | **continua aberta**: o agent-browser gera só mouse; o `onClick` cobre o toque |
