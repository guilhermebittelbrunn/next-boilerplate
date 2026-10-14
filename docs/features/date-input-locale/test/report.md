# Relatório de QA: date-input-locale

Etapa `/test` em rodada autônoma do `/cycle`, em 2026-10-13, sobre o working tree da branch
`guilhermebittelbrunn/cycle-command-v3` (não protegida). Nenhum commit, nenhuma branch criada, índice vazio
ao terminar. O `review` segue `in-progress` no `STATE.md` e não há commit da feature (`git log main..HEAD`
vazio): é o estado esperado do `/cycle`, que para antes de commitar, e não um gate esquecido aberto.

Resultado: todos os critérios passaram. Nenhum defeito de produção introduzido por esta tarefa. Um defeito
anterior foi reproduzido (hidratação da `/contact` com fuso diferente) e vai para o backlog.

## Cobertura

### Comandos e resultados

| Comando | Resultado |
|---------|-----------|
| `pnpm turbo run test typecheck --filter=@repo/design-system --filter=web --filter=app --filter=@repo/internationalization` | 15/15 tasks ok (11 do cache). design-system 10 arquivos/132 testes, app 103/841, web 15/90, internationalization 7/67 (paridade incluída) |
| `pnpm --filter web exec vitest run __tests__/contactFormDateLocale.test.tsx` (teste novo) | 3/3 |
| `pnpm test` (raiz, `turbo test test:emulator`, JDK 21 no `PATH`) | exit 0, 15/15 tasks (11 do cache). api 93/1205, api `test:emulator` 4/186, app 103/841, web 16/93 (com o teste novo), design-system 10/132, internationalization 7/67, email 7/202, auth 10/127, payments 4/22, shared 4/44, security 3/45, next-config 1/32, analytics 2/34, sdk 1/9, e2e 2/16 |
| `pnpm exec biome check apps/web/__tests__/contactFormDateLocale.test.tsx` | sem erro, depois de trocar `new Date(2026, 9, 13, 12)` por `new Date("2026-10-13T12:00:00")` (a regra `noMagicNumbers` reprovou a primeira versão) |

Sem `--force`: nada indicava cache sujo. Não remedi o `pnpm check` inteiro; o `/review` mediu 875 arquivos
limpos e o único arquivo que acrescentei passou no `biome check` acima.

A suíte do design system imprime "In HTML, `<button>` cannot be a descendant of `<button>`. This will cause
a hydration error." Vem do `componentCopy.test.tsx` (caso do `Dialog`), não desta tarefa.

### Teste criado

`apps/web/__tests__/contactFormDateLocale.test.tsx`: renderiza o `ContactFormClient` dentro do
`LocaleProvider` com `renderToString`, data do sistema fixada em 13/10/2026 com `vi.useFakeTimers`, e confere
o texto do botão nos três idiomas. Segue o padrão do `languageSwitcher.test.tsx` (ambiente `node`, sem
jsdom). Mutação: com o `contact-form-client.tsx` do `HEAD`, 2 de 3 casos reprovam (pt-br e es; en passa
porque o texto antigo já era o inglês). Arquivo restaurado e conferido com `cmp`.

### Decisões de custo de teste

| Módulo tocado | Decisão |
|---------------|---------|
| `packages/design-system/components/ui/calendar.tsx`, `date-input.tsx`, `lib/calendar-locales.ts` | sem teste novo. O `dateInputLocale.test.tsx` do `/develop` (16 casos em jsdom) já cobre placeholder, data formatada, legenda, dias da semana, rótulos de navegação, `locale` do chamador, dropdown de mês e valor gravado |
| `apps/web/.../contact-form-client.tsx` | teste novo na faixa barata (SSR em `node`, milissegundos). Fecha a lacuna "nenhum teste renderiza o `ContactFormClient`" |
| `packages/internationalization` (folha `dateInput`) | sem teste novo; o `parity.test.ts` cobre |

Nenhum teste da faixa cara: nada aqui depende de Firestore, regra ou processo externo.

## Critérios de aceite

| # | Critério | Status | Meio | Medição |
|---|----------|--------|------|---------|
| 1 | Placeholder no idioma da página | ✅ PASS | e2e + componente | `/entities/create`: "Escolha uma data" / "Pick a date" / "Elige una fecha". `/en/entities/edit/<Acme Franchise>` (`birthdate: null`): "Pick a date". Auditoria: os dois filtros com o mesmo texto nos 3 idiomas. Precedência do `placeholder` do chamador só pelo T3 (textos iguais na UI) |
| 2 | Data por extenso no idioma da URL | ✅ PASS | e2e + componente | `/edit` da Joana Ribeiro (`1990-04-17`): "17 de abril de 1990" / "April 17th, 1990" / "17 de abril de 1990". Marcos Pereira (`1985-11-02`) em pt-br: "2 de novembro de 1985". Auditoria es: "1 de octubre de 2026" e "13 de octubre de 2026" |
| 3 | Calendário no idioma ativo | ✅ PASS | e2e + componente | legenda "outubro 2026" / "October 2026" / "octubre 2026"; navegação "Ir para o mês anterior"/"Ir para o próximo mês", "Go to the Previous Month"/"Go to the Next Month", "Ir al mes anterior"/"Ir al mes siguiente"; cabeçalho visível pt-br "dom,seg,ter,qua,qui,sex,sab", en "Su Mo Tu We Th Fr Sa", es "lu ma mi ju vi sá do"; primeiro dia da grade em es "lunes, 28 de septiembre de 2026". Dropdown de mês só pelo T8 (nenhum consumidor usa) |
| 4 | Troca de idioma sem recarregar | ✅ PASS | e2e + componente | marcador em `window` sobreviveu às trocas pt-br→en (popover fechado), en→es e es→pt-br (popover aberto). `<html lang>` acompanhou. `locale` explícito vencendo só pelo T7 |
| 5 | Valor gravado inalterado | ✅ PASS | e2e (rede + API + Firestore) | em es, dia 20: `PUT /entities/<id>` 200 com `"birthdate":"2026-10-20"`; `GET /entities/<id>` com token do emulador devolveu `"birthdate":"2026-10-20"`. Criação em es com 7/11: documento gravado com `2026-11-07`. Auditoria: `GET /audit-events?limit=20&from=2026-10-01&to=2026-10-13` 200 |
| 6 | Página de contato | ✅ PASS | e2e + teste novo | botão "13 de outubro de 2026" / "October 13th, 2026" / "13 de octubre de 2026", igual no HTML do servidor (`curl`) e no DOM hidratado; calendário es "octubre 2026", semana na segunda; troca es→en pelo seletor da web com popover aberto: sem reload, botão "October 13th, 2026", calendário "October 2026" |
| 7 | Tema, responsivo e hidratação | ✅ PASS | e2e | ver "Evidências". 390 px sem estouro horizontal no app; nenhum erro de hidratação nos carregamentos diretos |
| 8 | Regressão e paridade | ✅ PASS | suíte | números na tabela de comandos. Personificação: só `entityFormsReadOnly.test.tsx`, sem e2e |

## Verificar no `/test`

| # | Item do `review.md` | Veredito |
|---|---------------------|----------|
| 1 | Troca de idioma pelo seletor com o `DateInput` na tela | **confirmado**. Em `/pt-br/entities/edit/<Joana>`, gravei um marcador em `window` e troquei pelo seletor: pt-br→en com popover fechado, en→es e es→pt-br com o calendário aberto no momento do clique. O marcador sobreviveu às três trocas, então não houve reload. Botão: "April 17th, 1990" (en), "17 de abril de 1990" (es); depois de escolher o dia 20, "20 de outubro de 2026" (pt-br). Com o popover aberto, ele fica aberto enquanto o menu de idioma abre e fecha na navegação (o subtree remonta, como o review leu); reaberto, vem no idioma novo: es "octubre 2026", primeiro cabeçalho "lunes"; pt-br "outubro 2026", primeiro "domingo" |
| 2 | Hidratação em `/entities/edit/<id>` nos 3 idiomas | **confirmado**, com uma ressalva de método. O `console` do agent-browser não captura o erro #418 do React em produção (ele sai como evento `error` da janela). Refiz a medição com um init script que registra `window.onerror` e `console.error` antes da primeira navegação: zero erros em `/edit` e `/create` nos 3 idiomas, e também em `/admin/audit`. A data do `/edit` vem do React Query no cliente, então o caminho de SSR medido ali é o placeholder; o caso com data formatada no SSR é a `/contact` |
| 3 | `/contact` nos 3 idiomas | **confirmado** (critério 6). O nit do `new Date()` também foi medido: subi a web com `TZ=Pacific/Kiritimati` (UTC+14, 14/10 no servidor) e o navegador em `-03` (13/10). O HTML do servidor trouxe "14 de outubro de 2026", o DOM final "13 de outubro de 2026", e a página lançou "Minified React error #418 ... args[]=text". O defeito existe no `HEAD` (o `format` já rodava com `new Date()` dos dois lados) e não foi introduzido aqui. Com o fuso normal, zero erros nos 3 idiomas |
| 4 | `/admin/audit` | **confirmado**. Os dois filtros mostram o `datePlaceholder` da tela nos 3 idiomas; em es, "Desde" = "1 de octubre de 2026", "Hasta" = "13 de octubre de 2026", calendário "octubre 2026" começando em "lunes"; "Aplicar" disparou `GET /audit-events?limit=20&from=2026-10-01&to=2026-10-13` (200) e a tabela mostrou "No hay eventos registrados." |
| 5 | `birthdate` gravado como `yyyy-MM-dd` | **confirmado** (critério 5) |
| 6 | Popover em 390 px com "septiembre 2026" | **confirmado**. Em `/es/entities/create`, escuro, 390 px: legenda "septiembre 2026", popover de x=32 a x=282, semana de "lunes" a "domingo", `scrollWidth` do documento não passa da viewport. Claro, pt-br, "setembro 2026": mesmo retângulo, sem estouro. Na web, `/pt-br/contact`, escuro, 390 px: "setembro 2026", `scrollWidth` 375 para viewport 390 |

## Evidências e2e

Medido em build de produção para `app` (`next build && next start`, 3000) e `web` (idem, 3001). A `api`
rodou em `next dev` (3002): o `next build` dela falha na coleta de dados de `/auth/password/reset-request`
com "Invalid environment variables" (`FIREBASE_ADMIN_PROJECT_ID` vazio, `FIREBASE_ADMIN_CLIENT_EMAIL`
inválido), porque o env do emulador zera as credenciais do Admin SDK de propósito. A suíte `pnpm e2e` usa
`next dev` na API pelo mesmo motivo. A `api` não está no diff.

Viewports: 1280×900 e 390×844. Tema: o navegador começa em `prefers-color-scheme: dark` (app em `dark`);
light por `set media light` (`<html>` sem a classe `dark`, popover com fundo `lab(100 0 0)` e texto
`lab(2.75 0 0)`).

| Tela | Idioma | Tema/viewport | Observado |
|------|--------|---------------|-----------|
| `/entities/edit/<Joana>` | en | escuro, 1280 | calendário aberto em "October 2026", "Su Mo Tu We Th Fr Sa", botão "April 17th, 1990" |
| `/entities/edit/<Marcos>` | pt-br | claro, 1280 | "outubro 2026", "dom seg ter qua qui sex sab", botão "2 de novembro de 1985" |
| `/entities/create` | es | escuro, 390 | "septiembre 2026", "lu ma mi ju vi sá do", botão "Elige una fecha" |
| `/entities/edit/<Joana>` | pt-br | claro, 390 | "setembro 2026", botão "20 de outubro de 2026" |
| `/admin/audit` | es | claro, 1280 | filtros e calendário como no item 4 |
| `/contact` | es | claro, 1280 | botão "13 de octubre de 2026", calendário "octubre 2026", dia 13 selecionado |
| `/contact` | pt-br | escuro, 390 | "setembro 2026", popover dentro da tela |

Screenshots de apoio em `docs/features/date-input-locale/test/e2e/` (`01-edit-en-calendar-open.png` a
`07-contact-ptbr-dark-390.png`). O `.gitignore` descarta a pasta; a prova é o texto acima. Nenhum print tem
pessoa real: só contas e entidades do seed.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001). Não reutilizei nada.

- O `.env` local de `apps/api`, `apps/app` e `apps/web` aponta para o projeto Firebase real. Para não falar
  com ele, montei o env de cada app com o `buildStackEnv` da `apps/e2e` (o mesmo da suíte Playwright:
  credenciais do Admin vazias, `demo-next-boilerplate`, emuladores em `127.0.0.1`) e fiz o `next build` do
  app e da web com esse env.
- Subi: `pnpm emulators` (auth, firestore, storage; JDK 21 via `PATH`), `next dev -p 3002` na api,
  `next start -p 3000` no app, `next start -p 3001` na web. A web foi reiniciada duas vezes: uma com
  `TZ=Pacific/Kiritimati` para o item 3 e outra com o fuso normal.
- Derrubei por PID os processos que subi. O emulador saiu com `SIGINT` no `firebase-tools`. Conferência
  final: nenhum processo em 3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199, 4400, 4500 e 9150.
- Fechei as seis sessões do agent-browser. Script de env e init script ficaram em `/tmp/qa-dil/`, removido no
  fim. Nenhum harness no repo.
- Efeito colateral: `apps/app/.next` e `apps/web/.next` agora têm um build de produção com a config do
  emulador embutida, e `apps/api/.next` tem um build incompleto. Os três são ignorados pelo git. Um
  `next start` sem rebuild nesses apps falaria com o emulador; `pnpm dev` não é afetado.

## Dados de QA

Tudo no emulador, que morreu com o processo. Nada em projeto real, nenhuma conta nova.

- Contas do seed: a comum e a de admin do `apps/api/scripts/seed-emulator.mjs`. A senha não foi copiada para
  cá. Não existe `.claude/dev-credentials.local.md` e não precisei de um.
- Entidade criada: `qa-date-input-locale-01` (`birthdate` `2026-11-07`).
- Entidade alterada: Joana Ribeiro, do seed, `birthdate` de `1990-04-17` para `2026-10-20`.
- Nada a acrescentar ao `docs/PRE-PRODUCTION.md`.

## Lacunas

| Lacuna | Origem | Veredito |
|--------|--------|----------|
| Nenhum teste renderiza o `ContactFormClient` | handoff e review | **fechada** pelo `contactFormDateLocale.test.tsx` |
| Troca de idioma por navegação do App Router não reproduzível no jsdom | handoff e review | **continua aberta** como teste automatizado. O comportamento foi medido no e2e (item 1). Cobrir isso exigiria um teste Playwright novo em `apps/e2e`, desproporcional para o risco |
| `captionLayout="dropdown"` sem consumidor | handoff | **continua aberta** no e2e (não há tela que use); coberta pelo T8 |
| Precedência do `placeholder` do chamador | `/test` | **continua aberta** no e2e (os textos da auditoria são iguais ao default); coberta pelo T3 |
| `DateInput` sob personificação | plano §7 | **fora de escopo** do e2e desta rodada; coberto por `entityFormsReadOnly.test.tsx` |

## Achados para o backlog

1. **Mismatch de hidratação na `/contact`** quando o dia do servidor difere do dia do navegador.
   `apps/web/app/[locale]/contact/components/contact-form-client.tsx:21`, `useState(new Date())`. Repro:
   `next start` da web com `TZ=Pacific/Kiritimati`, navegador em `America/Sao_Paulo`, abrir `/pt-br/contact`:
   HTML do servidor com "14 de outubro de 2026", DOM com "13 de outubro de 2026", erro React #418 (`text`).
   Em produção na Vercel (UTC) acontece entre 21h e 23h59 no horário de Brasília. Anterior a esta tarefa.
   Hipótese de correção: começar com `undefined` e preencher a data num `useEffect`, ou não pré-selecionar.
2. **O calendário do `DateInput` abre no mês atual, não no mês da data selecionada.** Com `1990-04-17`, o
   popover abre em "outubro 2026" e chegar a 1990 exige centenas de cliques em "mês anterior".
   `packages/design-system/components/ui/date-input.tsx:95-102` não passa `defaultMonth`. Para data de
   nascimento, `captionLayout="dropdown"` (que agora sai no idioma certo) resolveria o resto. Anterior a esta
   tarefa.
3. **Estouro horizontal no header da web em 1280 px, em es**: `scrollWidth` 1293 para viewport 1280 em
   `/es/contact`, com o botão "Registrarse" cortado na borda direita. Não medi os outros idiomas. Fora do
   diff.
4. Os dois achados da §13.3 do plano (`initialFocus` deprecated na `/contact` e o `data-day` com
   `toLocaleDateString()`) seguem como estavam; não os medi.
