# Relatório de QA: copy do desvincular e menu do perfil sob personificação

Rodada autônoma do `/cycle`, sem perguntas ao usuário. Escopo: os 8 arquivos da tarefa listados no
`review/review.md`. O resto do working tree pertence a `audit-log-levels` e `notification-read-race`.

Branch `feat/audit-log-levels`, a mesma das outras tarefas da madrugada, por pedido do usuário. Não é
protegida. Não criei nem troquei branch, não commitei e não mexi no índice (os dois `git mv` de specs que já
estavam preparados continuam lá).

Resultado: todos os critérios passaram. Na rodada 1 achei um defeito vizinho: a saudação do início mostrava o
nome do admin durante a personificação. A revisão corrigiu, e a rodada 2 (no fim deste arquivo) mediu a
correção: 13/13 critérios.

## Cobertura

| comando | resultado |
|---------|-----------|
| `pnpm --filter app exec vitest run __tests__/accountSignInMethodsSessionsNotRevoked.test.tsx` | 7/7 (4 que já existiam + 3 novos) |
| `pnpm --filter app test` | 155 arquivos, 1412 testes passando, mas saída 1 por `[vitest-pool]: Timeout starting forks runner`. A máquina estava com load average perto de 30 (emulador Android, navegador e outras sessões). Nenhum teste falhou; a rodada do root abaixo passou limpa com o mesmo código. |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes (inclui a paridade pt-br/en/es) |
| `pnpm --filter app typecheck` | ok |
| `pnpm test` (root, JDK 21) | 15/15 tasks, 9 do cache, 5m48s. `app:test` 1412, `api:test` 1966, `api:test:emulator` 284, `web:test` 315. Saída 0. |

Nenhum gate com `--force`. Não rodei `pnpm check`: o `/review` mediu e eu só acrescentei um bloco de teste.

### Teste criado

`apps/app/__tests__/accountSignInMethodsSessionsNotRevoked.test.tsx`, bloco "when the Google unlink reports
sessions not revoked", um caso por idioma: desvincular o Google rejeitado com `AUTH_SESSIONS_NOT_REVOKED`
mostra `apiErrors.AUTH_SESSIONS_NOT_REVOKED` + `(<requestIdLabel>: req-unlink-1)`, nunca
`passwordUnlinkedSessionsNotRevoked`, chama `unlinkSignInMethod("google.com")` e não desloga.

Prova por mutação: troquei `providerId === PASSWORD_PROVIDER_ID &&` por `true &&` numa cópia e os 3 casos novos
falharam (3/7). Restaurei pelo scratchpad, `cmp` confirmou igualdade e o `git diff --stat` do arquivo ficou
como antes.

## Decisões de custo de teste

- `useSignInMethodMutations.tsx`: teste de componente em jsdom, faixa barata. O ramo novo é decisão de front
  sobre um código de erro, e o componente com o SDK mockado prova isso. Nada de emulador.
- `ProfileDropdown.tsx`: os 13 casos de `profileDropdownAccount.test.tsx` (incluindo os 3 de personificação
  do `/develop`) já cobrem a regra. Não criei teste novo. O que jsdom não cobre é a ordem real entre o store
  virar `isImpersonating` e o `resetQueries`, e isso medi no browser.
- `account.ts` (i18n): a paridade existente cobre. Nenhum teste novo.
- Nenhum teste da faixa cara.

## Critérios de aceite

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | Desvincular a senha com sessões não encerradas mostra a mensagem própria | ✅ PASS | componente (3 idiomas) + e2e (3 idiomas) |
| 2 | A mensagem não manda entrar de novo e aponta o botão da tela | ✅ PASS | componente + e2e (rótulo do botão lido na página em es) |
| 3 | Desvincular o Google com o mesmo código mostra a copy genérica | ✅ PASS | componente novo (3 idiomas) + e2e (pt-br) |
| 4 | Outros erros do desvincular não mudam | ✅ PASS | componente (`ACCOUNT_UPDATE_FAILED`, pt-br) |
| 5 | A copy de `apiErrors.AUTH_SESSIONS_NOT_REVOKED` fica como está | ✅ PASS | `git diff --stat` de `utils.ts` vazio; o toast do Google no e2e mostrou a copy antiga intacta |
| 6 | Personificando conta sem nome, o menu não mostra o nome do admin | ✅ PASS | e2e + componente |
| 7 | Personificando conta sem avatar, o menu não mostra a foto do admin | ✅ PASS | e2e (0 `<img>` no gatilho e no menu) + componente |
| 8 | Na troca de sujeito, nada do admin aparece enquanto a conta carrega | ✅ PASS | e2e com `GET /account` atrasado 6 s |
| 9 | Sair da personificação devolve o admin ao menu | ✅ PASS | e2e |
| 10 | Fora da personificação o fallback continua | ✅ PASS | componente; no e2e, ao sair da personificação o gatilho mostrou o admin antes de `/account` responder |
| 11 | Autorização do desvincular sob personificação | ✅ PASS | rota: `apps/api/__tests__/accountSignInMethodsRoute.test.ts` cobre `AUTH_REQUEST_IMPERSONATION_FORBIDDEN` e passou no `pnpm test` |
| 12 | Tema, responsivo e idioma | ✅ PASS | e2e: menu em dark e light (desktop), 390 px em es light e en dark; toast em pt-br dark, en light, es 390 px light |

## Verificar no `/test`

1. **Janela da troca de sujeito: confirmado.** Instrumentei a página com um `MutationObserver` que registrava
   cada mudança de texto e de `<img>` do gatilho do menu, e atrasei em 6 s toda resposta de `GET /account`
   (patch do `XMLHttpRequest` no próprio browser; o `GET` vai para `/account`, não `/account/me`). A API já
   respondia em 2,5 a 3,5 s por causa da carga da máquina. Sequência medida, de `user@example.com` para
   `qa-impersonation-copy@example.com`: gatilho "us" + "user", depois vazio (sem texto, sem imagem), e 7,8 s
   depois "qa" + "qa-impersonation-copy". Nenhum estado intermediário mostrou "Adminqa" nem a foto. O menu
   aberto na janela listou só "Minha conta / Ajuda e contato / Sair". Na primeira troca (admin para o painel
   do usuário) a sequência foi "Adminqa" + foto, vazio, "us" + "user", também sem render com o admin depois
   da troca. Num carregamento frio em `/en` sob personificação, o menu também abriu vazio antes da conta
   chegar.
2. **Sair da personificação: confirmado.** De "Qaconta" para "Administração": 72 ms depois do pedido o gatilho
   já mostrava "Ad" + "Adminqa", e 360 ms depois a foto. Não houve estado vazio. O `/account` atrasado só
   respondeu 12,8 s depois.
3. **Toast do desvincular nos 3 idiomas: confirmado.** O `network route` do `agent-browser` só troca o corpo e
   não define status, então forcei o `500 {"error":{"code":"AUTH_SESSIONS_NOT_REVOKED"}}` com header
   `x-request-id: qa-forced-1` no `XMLHttpRequest` da página (a requisição real não saiu e a senha continuou
   vinculada). Toast de erro do `react-toastify`, um por tentativa:
   - pt-br, dark: "Senha removida, mas não conseguimos encerrar as outras sessões desta conta. Use "Sair de
     todos os dispositivos" nesta página para encerrá-las." Fundo rgb(18,18,18), texto branco.
   - en, light: "Password removed, but we could not end the other sessions of this account. Use "Sign out
     everywhere" on this page to end them." Fundo branco, texto rgb(117,117,117) (cerca de 4,6:1).
   - es, 390 px light: "Contraseña quitada, pero no pudimos cerrar las otras sesiones de esta cuenta. Usa
     "Cerrar sesión en todos los dispositivos" en esta página para cerrarlas." O toast ocupa x 20 a 371 e não
     corta. A página tem o botão "Cerrar sesión en todos los dispositivos".

   Em todos, sem "(Código do erro: …)", a pessoa ficou em `/<locale>/account?tab=security` com o menu do
   perfil presente, e houve exatamente um `GET /account` novo depois do erro.
4. **Desvincular o Google com o mesmo código: confirmado.** pt-br: "A alteração foi salva, mas não conseguimos
   encerrar as outras sessões desta conta. Entre de novo e use "Sair de todos os dispositivos" em Segurança.
   (Código do erro: qa-forced-1)". O sufixo traz o `requestId` do header, o que também confirma a errata do
   critério 3 do plano.
5. **Light, dark e mobile do menu sob personificação: confirmado.** Desktop dark e light (pt-br): gatilho "qa"
   + "qa-impersonation-copy", menu com "qa-impersonation-copy@example.com / Minha conta / Ajuda e contato /
   Sair", 0 `<img>`. 390 px es light: gatilho só com o avatar "qa", menu "qa-impersonation-copy@example.com /
   Mi cuenta / Ayuda y contacto / Salir". 390 px en dark: "qa-impersonation-copy@example.com / My account /
   Help and contact / Sign out". Com a conta personificada recebendo o nome "Qaconta Copia", o gatilho virou
   "Qa" + "Qaconta" e o menu "Qaconta Copia / qa-impersonation-copy@example.com / …".

## Lacunas herdadas

- Desvincular o Google com `AUTH_SESSIONS_NOT_REVOKED` (handoff e review): **fechada**, com o teste de
  componente nos 3 idiomas e a medição no browser em pt-br.
- Outro erro do desvincular só em pt-br (handoff): **fora de escopo**, como o review registrou. A copy vem de
  `apiErrors`, coberta pela paridade.

## Defeito fora do escopo (corrigido na rodada 2)

**A saudação do início mostra o nome do admin durante a personificação.** Não vem deste diff; é a mesma
classe de defeito que a tarefa corrigiu no menu.

- Repro: emulador, admin com `displayName` "Adminqa Fulano", personificar `qa-impersonation-copy@example.com`
  (sem nome). O `h1` de `/pt-br` mostra "Olá, Adminqa"; em `/en`, "Hello, Adminqa"; em `/es`, "Hola, Adminqa".
  Continua assim depois de `/account` responder, porque a conta personificada não tem nome e o fallback é o
  usuário do Firebase.
- Onde: `apps/app/app/[locale]/(authenticated)/(common)/(pages)/(components)/CommonHomeClient.tsx:61`,
  `account?.displayName ?? user?.displayName ?? null`. O componente já lê `isImpersonating` na linha 51.
- Correção sugerida (hipótese): o mesmo corte do `ProfileDropdown`, `const fallbackUser = isImpersonating ?
  null : user` e `account?.displayName ?? fallbackUser?.displayName ?? null`, com um caso de teste de
  personificação para o `CommonHomeClient`.

Nit visual, sem ação nesta tarefa: com a conta ainda carregando, o menu aberto deixa uma faixa vazia acima de
"Minha conta" (os dois `DropdownMenuLabel` sem conteúdo).

## Ambiente do e2e

- Portas 3000, 3002, 4000, 4001, 4400, 4500, 8080, 9099, 9150 e 9199 livres no início. Nada do usuário foi
  reutilizado.
- Subi e derrubei por PID: `pnpm emulators` (JDK 21), `pnpm --filter api dev`, `pnpm --filter app dev`.
  `pnpm seed` rodou uma vez. Depois do `kill`, todas as portas acima voltaram vazias no `lsof`.
- Copiei `apps/api/.env` e `apps/app/.env` dos `.env.example` para a passada e apaguei os dois no fim.
- Screenshots em `test/e2e/` (`01-menu-janela-troca.png` a `09-toast-senha-es-mobile-light.png`), descartados
  pelo `.gitignore`. A prova é o texto acima.

## Dados de QA

Tudo no emulador, descartado ao parar. Nenhuma conta em projeto Firebase real, então o `PRE-PRODUCTION.md` não
muda.

- `admin@example.com` (do seed): ganhou `displayName` "Adminqa Fulano" e `photoURL`
  `http://localhost:3000/icon.png` pelo Auth emulator.
- `qa-impersonation-copy@example.com`: criada por `POST /auth/sign-up`, com e-mail marcado como verificado no
  emulador, depois `displayName` "Qaconta Copia" e um provedor `google.com` falso vinculado pelo emulador.
  Onboarding concluído pela UI. A senha foi gerada para a sessão, guardada só no scratchpad e apagada; não
  está em arquivo do repo.

## Remedição (rodada 2): saudação do início sob personificação

A revisão aplicou em `CommonHomeClient.tsx:61-64` o mesmo corte do menu
(`fallbackUser = isImpersonating ? null : user`) e acrescentou 3 casos em
`apps/app/__tests__/commonHomeClient.test.tsx`. Medi só esse delta.

### Gates

| comando | resultado |
|---------|-----------|
| `pnpm test` (root, JDK 21), 1ª tentativa | saída 1. `app:test` 1413 passando e 2 falhas por `Test timed out in 20000ms`, em `auditFiltersDateInput.test.tsx` ("navegam além do fim do ano corrente…", 32,4 s) e `signUpFormSubmitLock.test.tsx` ("keeps both buttons disabled…", 25,7 s). Nenhum dos dois é desta tarefa. Load average 25 a 31 durante a execução. |
| os 2 arquivos + `commonHomeClient.test.tsx`, isolados | 3 arquivos, 18/18. Os dois testes que tinham estourado levaram 1,9 s e 2,0 s; `commonHomeClient` 13/13. |
| `pnpm test` (root), 2ª tentativa | 15/15 tasks, 13 do cache, 4m16s, saída 0. `app:test` 1415, `api:test` 1966, `api:test:emulator` 284. Load average 21 a 25. |

Não aumentei timeout nem troquei pool. Nenhum gate com `--force`. Os dois timeouts batem com a carga da
máquina e não com código: isolados, cada teste fica 10 vezes abaixo do limite.

### Critério novo

| # | critério | status | meio |
|---|----------|--------|------|
| 13 | Personificando, a saudação do início não usa o nome do admin | ✅ PASS | componente (3 casos da revisão) + e2e nos 3 idiomas |

### O que o browser mostrou

Mesmo arranjo da rodada 1: emulador, `admin@example.com` com nome "Adminqa Fulano" e foto, e
`qa-impersonation-copy@example.com` criada só com e-mail e senha. Um `MutationObserver` registrou cada mudança
do `h1`, e o `GET /account` foi atrasado em 6 s por patch do `XMLHttpRequest`. Tema dark.

- **Entrar na personificação**: `/pt-br/admin` com "Olá, Adminqa" (início do admin, correto), depois `/pt-br`
  direto com "Olá". Nenhum estado do `/pt-br` mostrou "Adminqa", mesmo com a conta atrasada.
- **Conta sem nome**: pt-br desktop "Olá", en desktop (1440 px) "Hello", es mobile (390 px) "Hola". Seletor em
  `qa-impersonation-copy@example.com`, gatilho do menu "qa" + "qa-impersonation-copy".
- **Conta com nome** (`displayName` "Qaconta Copia" no emulador): es 390 px "Hola, Qaconta", en "Hello,
  Qaconta", pt-br "Olá, Qaconta".
- **Troca entre contas com a resposta atrasada**: de `user2@example.com` (sem nome) para a conta de QA com
  nome, o título ficou em "Olá" durante os 6,5 s de espera e virou "Olá, Qaconta" 9 ms depois da resposta. Não
  houve render com "Adminqa".
- **Sair da personificação**: 53 ms depois do pedido, o início comum, ainda montado, mostrou "Olá, Adminqa".
  Nesse instante o sujeito já é o admin de novo, então o nome é o certo. Depois o `/pt-br/admin` carregou com
  "Olá, Adminqa".

Screenshots `r2-01` a `r2-04` em `test/e2e/`, descartados pelo `.gitignore`.

### Ambiente e dados da rodada 2

- Portas 3000, 3002, 4000, 4001, 4400, 4500, 8080, 9099, 9150 e 9199 livres no início. Subi e derrubei por PID
  `pnpm emulators`, `pnpm --filter api dev` e `pnpm --filter app dev`; `pnpm seed` rodou uma vez. Depois do
  `kill`, todas as portas voltaram vazias no `lsof` (a 4400 demorou alguns segundos a mais para liberar).
- Copiei `apps/api/.env` e `apps/app/.env` dos `.env.example` e apaguei os dois no fim.
- Dados só no emulador, descartados com ele: `admin@example.com` do seed com nome e foto, e
  `qa-impersonation-copy@example.com` recriada por `POST /auth/sign-up`, com e-mail verificado e depois o
  nome "Qaconta Copia". A senha dela foi gerada no shell e descartada sem uso, porque nesta rodada só o admin
  entrou. Nada em projeto Firebase real; o `PRE-PRODUCTION.md` não muda.
