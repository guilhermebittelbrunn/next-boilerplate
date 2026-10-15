# Relatório do `/test`: link de documentação e menu mobile da web

Rodada autônoma do `/cycle`, feita na mesma passada da tarefa `api-auth-webhook-error-codes` (um conjunto de
servidores e uma passada de browser para as duas). Branch `guilhermebittelbrunn/cycle-2-features-implement`, que não
é protegida. Nenhum commit, nenhum `git add`, nenhuma branch criada.

Resultado: 10 critérios aprovados, 0 reprovados, 0 não verificados, mais 1 item informativo fora do corte. Nenhum
defeito no diff.

## Cobertura de testes

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter web test` | 19 arquivos, 116 testes, todos passando |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, todos passando (esta tarefa não mexe no pacote) |
| `pnpm test` (raiz, com JDK 21 no `PATH`) | 15 tarefas do turbo, 15 com sucesso (4 do cache), 279 arquivos e 3.139 testes. Por workspace: app 846, api 1222, api `test:emulator` 186, web 116, email 202, design-system 171, auth 127, i18n 67, security 45, shared 44, analytics 34, next-config 32, payments 22, e2e 16, sdk 9 |
| `npx vitest run __tests__/docsUrlEnv.test.tsx __tests__/headerMobileMenu.test.tsx` (em `apps/web`) com `env.ts` e `header/index.tsx` trocados pela versão de `HEAD` | 10 falham e 4 passam, como o handoff disse: os 6 casos com a variável do `docsUrlEnv`, os 3 de fechamento do menu e o "com o link de documentação, espera xl" do `headerMobileMenu`. Arquivos restaurados e conferidos com `cmp` |

Não rodei de novo `pnpm --filter web typecheck` nem `pnpm check`: o `/review` mediu os dois e esta etapa não mexeu
em código. Nenhum teste novo: os dois arquivos do `/develop` cobrem o que um teste unitário consegue provar, e o
resto (largura, CSS gerado, navegação real) é do browser.

## Decisões de custo de teste

| Módulo | Decisão |
|--------|---------|
| `apps/web/env.ts` | `docsUrlEnv.test.tsx` (ambiente `node`, `env.ts` real) já cobre preenchida, vazia e ausente nos 3 idiomas |
| `header/index.tsx`, fechamento do menu | `headerMobileMenu.test.tsx` (jsdom por arquivo) cobre item, subitem e link externo; a navegação real foi medida no browser |
| `header/index.tsx`, barra em `xl` | Nenhum teste automatizado mede layout; ficou com o `agent-browser`, como manda o `apps/web/CLAUDE.md` |

Nenhum teste da faixa cara.

## Verificar no `/test` (lista do `review/review.md`)

| # | Veredito | O que foi medido |
|---|----------|------------------|
| V1 | confirmado | Build B1 (`NEXT_PUBLIC_DOCS_URL=https://docs.example.com`). O CSS servido contém `xl:grid-cols-[1fr_minmax(0,auto)_1fr]`, `xl:grid`, `xl:flex`, `xl:hidden` e `xl:justify-center`. Em 1024, 1279, 1280 e 1440 px × 3 idiomas × visitante/logado × claro/escuro (48 combinações), `scrollWidth` = `clientWidth` em todas. A 1280 e 1440 a barra cheia aparece com quatro itens à esquerda e a marca a 0 px do centro; a 1024 e 1279 aparece o botão do menu. Medi duas vezes: com a barra de rolagem sobreposta e com a barra clássica de 15 px (`clientWidth` 1265 a 1280). Lista da esquerda a 1280: pt-br 433 px, en 437, es 452 (o plano estimava ~429). Com a barra clássica, es a 1280: coluna da esquerda de 533 px para 452 de lista (81 px de folga); coluna da direita de 533 px para cerca de 463 de conteúdo no visitante e 453 no logado |
| V2 | confirmado | Build B1, visitante, 390, 768 e 1024 px, 3 idiomas, claro e escuro (18 rodadas): depois de seguir "Contato" o caminho vira `/<locale>/contact` com `aria-expanded="false"` e o painel fora do DOM; o mesmo com o subitem "Preços" e com "Início" estando na home (o caminho continua `/<locale>`). Repetido no build B2 a 390 e 768 px (12 rodadas), mesmo resultado. Teclado, 390 px, es e pt-br: três Tabs a partir do botão do menu levam o foco ao link "Contato"/"Contacto", Enter navega e a página nova abre com o menu fechado. Foco depois de "Início" na home: vai para o `body`, o que confirma o nit do review |
| V3 | confirmado | Build B2 (`NEXT_PUBLIC_DOCS_URL=""`). O HTML em pt-br, en e es não contém `docs.example.com`. Nas 36 combinações (1024, 1280 e 1440 px; 3 idiomas; visitante e logado; claro e escuro): barra cheia desde 1024, três itens à esquerda (pt-br 285 px, en 288, es 301), marca a 0 px do centro, `scrollWidth` = `clientWidth`, nenhum link de documentação no header nem no footer |
| V4 | confirmado | Build B1, 3 idiomas: barra, painel e footer com `href="https://docs.example.com"`, `target="_blank"` e `rel="noopener noreferrer"`. O clique na barra a 1280 px abre a aba `https://docs.example.com/`; o clique no footer abre outra aba; o clique no painel a 390 px abre a aba nova e deixa a original com `aria-expanded="false"` e o painel fora do DOM |
| V5 | confirmado | axe-core 4.13.0 injetado na página, `axe.run` no `header` com `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` e `best-practice`. Build B1, es e pt-br, claro e escuro: 1280 px (17 regras passando), 390 px fechado (14) e aberto (14). Zero violações e zero incompletos nas 12 rodadas. Na última rodada conferi que o painel estava aberto e o tema escuro ativo |
| V6 | confirmado | `pnpm --filter web test` 116/116 e a troca por `HEAD` com 10 falhas em 14 |
| V7 | confirmado | Build B2, 390 e 768 px, visitante e logado, 3 idiomas, claro e escuro (24 combinações). A 390 px: visitante com "Cadastrar"/"Sign Up"/"Registrarse" e o menu; logado só com o menu. A 768 px: idioma, tema, os dois botões de conta e o menu. Sem rolagem lateral. É a lista que a PR #45 registrou |

## Critérios de aceite

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | Link aparece com a variável preenchida | PASS | e2e (B1, 3 idiomas, visitante e logado) + unit |
| 2 | Vazia ou ausente equivale a sem link | PASS | e2e (B2) + unit |
| 3 | T1 lê o `env.ts` real e reprova no código anterior | PASS | unit contra `HEAD` |
| 4 | Seguir link do painel fecha o menu | PASS | e2e (B1 e B2, mouse e teclado) + jsdom |
| 5 | Com o link, header cabe e marca no centro | PASS | e2e (48 combinações, duas vezes) |
| 6 | Sem o link, nada muda | PASS | e2e (36 combinações) |
| 7 | Abaixo de 1024 px muda só o fechamento | PASS | e2e (24 combinações) |
| 8 | Documentação em aba nova nas três superfícies | PASS | e2e |
| 9 | Header sem violação de axe | PASS | e2e |
| 10 | Gates verdes | PASS | `pnpm --filter web test`, `pnpm test` da raiz; typecheck e `pnpm check` do `/review` |
| inf. | Foco depois de "Início" na home | informativo | e2e: foco no `body`; entra no achado D6 |

## Lacunas herdadas

| Lacuna | Veredito |
|--------|----------|
| Nenhum teste automatizado mede largura ou layout | Fechada para o diff (V1, V3 e V7 medidos no browser); continua sem teste automatizado, por desenho |
| T2 roda só em pt-br | Fora de escopo; no browser o fechamento foi medido nos 3 idiomas |
| Estado logado fora do T2 | Fechada para o layout (V1 e V7 logado); o fechamento do menu não depende da sessão |
| D5, D6 e o nit de foco | Continuam abertos como achado de backlog; o nit de foco foi medido e se confirma |

## Achados fora do diff (informativos)

- A 390 px o painel do menu vai de x=16 a x=359 numa janela de 375 px úteis, e o texto da página aparece nas duas
  faixas laterais de 16 px com o painel aberto. A classe do painel (`container absolute top-20 right-0 w-full`) não
  mudou neste diff. Candidato a achado de backlog junto do D6.
- `next start` da web loga `Unexpected error occurred while checking config TypeError: Cannot assign to read only
  property 'redirects'` nos builds B1 e B2. O `next.config` não está no diff e a página responde 200.
- Com a barra de rolagem clássica, `/<locale>/pricing` a 390 px mede `scrollWidth` 376 contra `clientWidth` 375.
  Nenhum elemento passa da borda por mais de 0,5 px: é arredondamento de subpixel na página de preços, fora do
  header.

## Evidências e2e

Os prints em `test/e2e/` (`01-b1-menu-aberto-390-light.png`, `02-b1-menu-aberto-390-dark.png`,
`03-b2-menu-aberto-390-dark.png`, `04-b1-barra-1280-es-light.png`) são descartados pelo `.gitignore`; a prova é o
texto acima. O print 04 mostra, em es a 1280 px com a barra de rolagem clássica, "Inicio", "Producto", "Contacto" e
"Documentación" à esquerda, a marca no centro e "Español", tema, "Iniciar sesión" e "Registrarse" à direita, sem
corte.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199, 4400, 4500, 9150). Nada
do usuário foi reutilizado.

- `pnpm emulators` (auth, firestore, storage, projeto `demo-next-boilerplate`) com JDK 21 exportado e o seed de
  `apps/api/scripts/seed-emulator.mjs` com o env da `apps/e2e`.
- API em `next build` + `next start` na 3002 e app em `next dev` na 3000.
- Web em `next build` + `next start` na 3001, três vezes: B1, B2 e B1 de novo, para medir com a barra de rolagem
  clássica, que apareceu depois que o browser reiniciou. O env veio do `buildStackEnv("web")` da `apps/e2e`, com
  `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WEB_URL` em localhost e `NEXT_PUBLIC_DOCS_URL` só no
  ambiente do processo. Nenhum arquivo versionado mudou.
- A sessão caiu no meio da passada (o browser travou num `wait --url`). A passada foi retomada com os mesmos
  servidores, refazendo o que tinha ficado sem registro: links em aba nova e axe.
- No fim, os `next-server` da web, da API e da app foram derrubados por PID com os processos pai, o `firebase-tools`
  recebeu `SIGINT` e as sessões do agent-browser foram fechadas. Nenhuma das portas acima ficou em escuta.
- O harness temporário em `/tmp` e os dois `firestore-debug.log` da rodada (raiz e `apps/api`) foram apagados.
- O `.next` da web ficou com o último build (B1, config do emulador embutida). É ignorado pelo git.

O relatório foi gravado pelo orquestrador do `/cycle` com o conteúdo devolvido pelo `analista-qa`, porque a escrita
do subagent foi bloqueada pela harness.

## Dados de QA e estado de dev

Tudo no emulador, que morreu com o processo; nada em projeto real. Conta usada: a comum do seed,
`user@example.com` (a senha do seed é pública no repositório e não foi copiada para cá). Nenhuma conta criada para
esta tarefa e nada a acrescentar ao `docs/PRE-PRODUCTION.md`.
