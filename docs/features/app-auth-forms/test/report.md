# Relatório do /test: telas de autenticação da app

Branch `fix/app-auth-forms` (não protegida). Passada única de navegador com `agent-browser` contra os emuladores, mais
a suíte da raiz. Nenhum arquivo de produção foi alterado nesta etapa.

Resultado final: **aprovado** na rodada 2 (seção no fim). A rodada 1, abaixo, terminou **bloqueada** por dois critérios
reprovados. Os dois são pequenos e nenhum é regressão de comportamento,
mas falham o que o plano e a revisão escreveram como esperado.

1. O Google da app, quando a requisição da sessão não chega a ter resposta (o mesmo bloqueio `--abort` que o plano
   manda usar), mostra "Failed to fetch" em inglês, não a frase traduzida.
2. De 768 px para cima, o cartão de autenticação ficou 16 px mais estreito (400 → 384 px), 8 px de cada lado. O
   critério admitia no máximo 4 px.

## Testes

| comando | resultado |
|---|---|
| `pnpm test` (raiz, JDK 21, sem `--force`) | 15 tarefas, 15 com sucesso (4 do cache), 1m26s, `EXIT=0` |
| ↳ `app:test` | 130 arquivos, 1119 testes passando (1118 do handoff + 1 criado aqui) |
| ↳ `web:test` | 26 arquivos, 207 testes passando |
| ↳ `@repo/auth:test` | 12 arquivos, 136 testes passando |
| ↳ `@repo/internationalization:test` | 7 arquivos, 67 testes passando (paridade incluída) |
| ↳ `api:test` / `api:test:emulator` | 124 arquivos, 1679 testes / 8 arquivos, 274 testes |
| ↳ demais workspaces | `design-system` 172, `email` 208, `shared` 56, `security` 45, `analytics` 34, `next-config` 32, `payments` 22, `e2e` 17, `sdk` 15, todos passando |
| `pnpm --filter app exec vitest run __tests__/apiErrorCopy.test.ts` | 12 testes passando |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm exec biome check apps/app/__tests__/apiErrorCopy.test.ts` | sem erro |

`pnpm check` e o typecheck de `@repo/auth` e `web` não foram medidos de novo: esta etapa só acrescentou um caso de
teste na `apps/app`. Os números são os do handoff (1057 arquivos sem erro; typecheck sem erro).

### Teste criado

- `apps/app/__tests__/apiErrorCopy.test.ts`, caso "tells a disabled account it was disabled, with a full sentence in
  every locale". Passa um erro com `code: "auth/user-disabled"` por `FormattedError` + `handleClientError` nos três
  idiomas e confere a frase. Conferi que ele pega a regressão: com o en voltado temporariamente para "User disabled.",
  o caso falhou (`Expected: "This account has been disabled." / Received: "User disabled."`); restaurei o arquivo de
  tradução e o `git diff --stat` dele voltou ao do handoff.

### Decisões de custo de teste

Nenhum teste da faixa cara foi criado.

| módulo tocado | teste novo? | o que já cobria |
|---|---|---|
| `packages/auth/provider.tsx` | não | T1 (`authProviderSessionNotEstablished.test.tsx`), 5 casos de componente |
| `apps/app/shared/lib/googleSignInApi.ts` | não | T2 cobre a resposta HTTP de erro. O caminho de rede (o defeito 1) não tem teste; ele é do `/develop` junto com a correção |
| os seis formulários (`noValidate`) | não | T3 e T4, uma asserção por formulário |
| `AuthCard` e contêineres de login e cadastro (recuo) | não | só navegador, por decisão do plano (§7) |
| tradução `auth/user-disabled` en | sim, unitário | o caso acima, na cadeia `FormattedError` → `handleClientError` que a tela usa |

## Verificar no `/test` (itens do `review.md`)

| # | item | veredito |
|---|---|---|
| 1 | F1a, alerta no login por senha | **Confirmado nos três idiomas.** Bloqueio `--abort` em `http://localhost:3000/api/auth/session`. pt-br: toast de erro "Não foi possível iniciar sua sessão. Tente entrar novamente." 236 ms depois do clique. en: "Your session could not be started. Try signing in again." (258 ms). es: "No se pudo iniciar tu sesión. Intenta iniciar sesión de nuevo." (221 ms). Nenhum "Could not establish session", nenhum toast de sucesso. Depois vem o laço do 🟡: a primeira recarga chega entre 398 e 454 ms depois do clique, e houve 16 a 18 recargas em 5 s (32 em 13 s numa medição mais longa), sempre em `/<locale>/sign-in?redirect=%2F<locale>`. O toast fica visível por uns 200 ms antes de a página recarregar. Tirado o bloqueio, o laço parou e a URL foi para `/<locale>` nos três idiomas |
| 2 | F1b, landing | **Confirmado.** `:3001/pt-br/sign-in` com `:3001/api/auth/session` bloqueado: toast "Não foi possível iniciar sua sessão. Tente entrar novamente." 250 ms depois do clique, legível no tema escuro. A URL fica em `/pt-br/sign-in` e o `<main>` fica vazio (`innerText` vazio), só cabeçalho e rodapé. É o achado conhecido; não houve laço |
| 3 | F1c, Google da app | **Derrubado em parte.** O popup do emulador abriu e completou no `agent-browser`. Com o bloqueio `--abort` (o repro do plano), em `/en/sign-in`: toast "Failed to fetch", em inglês. Com a resposta HTTP 500 (simulada no navegador, trocando `window.fetch` só para `/api/auth/session`): `/es/sign-in` mostrou "No se pudo iniciar tu sesión. Intenta iniciar sesión de nuevo." e `/pt-br/sign-up` mostrou "Não foi possível iniciar sua sessão. Tente entrar novamente.". Nos dois casos o formulário voltou, e recarregar a página mostrou o formulário de novo (client deslogado). Ver defeito 1 |
| 4 | F1d, link por e-mail | **Confirmado.** Pedido em `/en/sign-in/email-link` para `user@example.com` (e-mail guardado no `localStorage`), código tirado do `oobCodes` do emulador, link aberto com o bloqueio: toast "Your session could not be started. Try signing in again.", tela com "Signing you in…" e "Back to sign in", uma carga só, sem laço. Desbloqueado, o clique em "Back to sign in" gravou `access-token` e levou a `/en` |
| 5 | Cadastro com sessão recusada | **Medido, como a revisão previu.** `/en/sign-up` com `qa-app-auth-forms@example.com` e o bloqueio: toast "Your session could not be started. Try signing in again." 378 ms depois do envio; em seguida a página foi para `/en/sign-in` e entrou no laço (20 cargas em 7 s). Desbloqueado, a conta nova foi para `/en/onboarding`. Não reprova o corte; vai para o achado do BACKLOG |
| 6 | F2, login normal | **Confirmado.** pt-br: "Login realizado com sucesso!" e `/pt-br` com `access-token`. en: "Login successful!" e `/en`. es com `?redirect=%2Fes%2Fentities`: "Inicio de sesión exitoso!" e `/es/entities` |
| 7 | F3, `noValidate` | **Confirmado.** As seis telas em pt-br (login, cadastro, "Esqueci minha senha", redefinição com `?oobCode=qa-code`, pedido de link, conclusão com `?oobCode=qa-code` sem e-mail guardado): `form.noValidate === true`. Vazio, `abc` e `qa@example` deram "Email inválido" com `aria-invalid="true"`; o envio chegou ao Zod, coisa que o balão nativo impediria. Senha: "A senha deve ter pelo menos 6 caracteres" (login), "A senha deve ter pelo menos 8 caracteres" (cadastro e redefinição), "As senhas não coincidem" (cadastro) e "As senhas não conferem" (redefinição). Amostra: es "Email no válido" (login, "Esqueci", pedido de link), en "Invalid email" (cadastro, pedido de link) e "Password must be at least 8 characters" (redefinição) |
| 8 | F4, recuo | **375 px confirmado; telas largas derrubado.** A 375 px, claro e escuro: login 39/39 px (folga mantida), cadastro 43/43, "Esqueci", pedido de link, verificação de e-mail e redefinição 16/16, `scrollWidth` 375 em todas. De 768 px para cima: cartão com 384 px; sem o recuo (padding zerado no navegador) seria 400 px. A coluna pai tem `max-w-[400px]` e, a partir de `lg`, o avô tem `lg:p-8` (a afirmação do plano sobre o `p-8` está certa). Ver defeito 2 |
| 9 | F5, conta desativada em en | **Confirmado.** `qa-app-auth-forms@example.com` desativada no emulador (`accounts:update` com `disableUser: true`; não passei pela exclusão do admin, que grava o mesmo `disabled: true`). `signInWithPassword` respondeu 400. Toasts: en "This account has been disabled.", pt-br "Esta conta foi desativada.", es "Esta cuenta ha sido desactivada.". Essa frase en só existe para `auth/user-disabled`, então o emulador devolveu esse código, e não `auth/invalid-credential`. A URL ficou em `/<locale>/sign-in` |

## Critérios de aceite

| critério | status | meio | medição |
|---|---|---|---|
| Sessão recusada no login por senha, 3 idiomas | ✅ | e2e + componente (T1) | item 1 |
| Landing com o mesmo alerta | ✅ | e2e | item 2 |
| Google da app com a mesma frase | ❌ | e2e + unit (T2) | HTTP 500: ✅ (es, pt-br, login e cadastro). Rede abortada: "Failed to fetch" |
| Link por e-mail com saída | ✅ | e2e + componente | item 4 |
| Validação só pelo Zod nas seis telas | ✅ | e2e + componente (T3, T4) | item 7 |
| Recuo a 375 px, claro e escuro | ✅ | e2e | item 8 |
| Largura do cartão em telas largas | ❌ | e2e | 384 px contra 400 px, 8 px a menos de cada lado (limite: 4 px) |
| Conta desativada em en | ✅ | e2e + unit (novo) | item 9 |
| Login normal sem regressão | ✅ | e2e | item 6 e o "Back to sign in" do item 4 |
| Cadastro com sessão recusada | ✅ | e2e | item 5 |
| Gates | ✅ | comandos | seção Testes |

## Defeitos

### Defeito 1. Google da app mostra "Failed to fetch" quando a sessão não responde

- **Onde:** `apps/app/shared/lib/googleSignInApi.ts`, `exchangeForApiSession`. O `fetch` do `POST /api/auth/session`
  rejeita com `TypeError("Failed to fetch")` quando não há resposta, e esse erro sai do `await` antes do
  `if (!sessionRes.ok)`. `FormattedError` devolve a `message` de um `Error` comum, então o toast mostra o texto do
  navegador. Só a resposta HTTP de erro passa pela frase traduzida.
- **Repro:** emulador + `app` + `api`. `agent-browser network route "http://localhost:3000/api/auth/session" --abort`,
  abrir `/en/sign-in`, "Continue with Google", escolher ou criar a conta no popup do emulador. Toast: "Failed to
  fetch". Esperado: "Your session could not be started. Try signing in again.".
- **Regressão?** Não. Antes do diff o mesmo caminho também mostrava "Failed to fetch". Mas o plano (§5.5, §8 F1c)
  usa justamente esse bloqueio como repro, e o login por senha trata as duas falhas igual (o `catch` do provider
  pega rejeição e resposta de erro).
- **Correção sugerida (hipótese, não testada):** envolver o `fetch` em `.catch(() => null)` e tratar `!sessionRes?.ok`
  com a mesma frase, como o `SignInForm` já faz no efeito de reautenticação. Um caso no T2 com o `fetch` rejeitando
  provaria.
- **Não é de `next dev`:** é a semântica do `fetch` lida no código; não montei build de produção para isso.

### Defeito 2. O cartão perdeu 16 px de largura em telas a partir de 768 px

- **Onde:** `md:px-2` nos três contêineres (`AuthCard.tsx:11`, `SignInForm.tsx:124`, `SignUpFormClient.tsx:142`). Na
  app, a coluna que recebe o cartão tem `max-w-[400px]`. Os 8 px de cada lado saem da largura do cartão, que vai de
  400 para 384 px. Na landing o contêiner ocupa a largura toda, e por isso o mesmo `md:px-2` não estreita nada lá
  (cartão de 448 px medido em `:3001/pt-br/sign-in`).
- **Repro:** `/es/forgot-password` (ou login, cadastro, pedido de link) a 768, 1024 ou 1280 px. Medir o cartão
  (`div.rounded-xl.border.bg-card`): 384 px de largura. Zerar o padding horizontal do pai no DevTools: 400 px.
- **Gravidade:** cosmética. Nenhum texto quebra e nada transborda. Reprova porque o critério escrito admitia no
  máximo 4 px de cada lado; o plano tratou `md:px-2` como 4 px, mas a classe vale 8 px.
- **Correção sugerida (hipótese):** `px-4 md:px-0`. A partir de `md` a coluna já é estreita e centrada, então o recuo
  só faz falta abaixo disso. A alternativa é aceitar os 384 px e corrigir o critério; a escolha é do revisor.
- **Não é de `next dev`:** é CSS estático do Tailwind; não montei build de produção para isso.

## Lacunas de teste herdadas

| lacuna (handoff/review) | veredito |
|---|---|
| Recuo lateral sem teste de unidade | **Continua aberta**, por decisão do plano. O navegador mediu os dois lados (375 px passa, telas largas falham) |
| `auth/user-disabled` en sem teste de copy | **Fechada aqui.** Caso novo em `apiErrorCopy.test.ts`, que passa pela cadeia que a tela usa e falha com o texto antigo |
| Alerta traduzido na `apps/web` sem teste próprio | **Continua aberta.** O e2e mediu (item 2); não criei teste porque o provider é o mesmo módulo que o T1 já monta |
| T1 só dispara o login por senha | **Continua aberta como teste**, mas o link por e-mail foi medido no navegador (item 4) e passa pelo mesmo `onAuthSuccess`. A mutação de Google do provider (landing) não foi exercida |

## Achados fora do corte (para o `/spec --sync`)

- **O toast do login por senha some antes de ser lido.** Com a sessão recusada, o alerta aparece cerca de 230 ms
  depois do clique e a primeira recarga do laço vem cerca de 200 ms depois. A tradução está certa, mas a pessoa
  praticamente não consegue ler a mensagem. É o laço de `specs/BACKLOG.md:1331`; a medição reforça a prioridade.
- **O cadastro entra no mesmo laço**, passando pelo login (item 5). Confirma o segundo 🟡 da revisão.
- **Textos diferentes para a mesma regra:** "As senhas não coincidem" (cadastro) e "As senhas não conferem"
  (redefinição). Anterior ao diff.

## Evidências e2e

O texto acima é a prova. Os prints em `docs/features/app-auth-forms/test/e2e/` são descartados pelo `.gitignore` e
serviram para conferir na hora:

- `01-f1a-ptbr-alerta.png`: login pt-br 400 ms depois do envio, já no loader do laço (o toast tinha sumido).
- `02-f1b-web-ptbr.png`: landing com o toast traduzido e o corpo vazio.
- `03-f1d-en-link.png`: "Signing you in…" + "Back to sign in".
- `04-f4-375-light-forgot-es.png`, `05-f4-375-dark-signup-en.png`: 375 px, claro e escuro.
- `06-f5-en-disabled-light.png`: "This account has been disabled." no tema claro, toast legível.

Para ler o toast sem depender do tempo do screenshot, registrei um script de página no `agent-browser`
(`--init-script`, fora do repo) que grava cada carga e o texto de cada `.Toastify__toast` no `localStorage`. Os tempos
em ms vêm dele.

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001, 4400, 4500). Nada foi
reutilizado do usuário.

Subi, com variáveis de processo e sem tocar em `.env`: os emuladores (`pnpm emulators` com `JAVA_HOME` no
`openjdk@21`), o seed (`node scripts/seed-emulator.mjs`), `api` (`next dev -p 3002`, com
`EMAIL_LINK_SIGN_IN_ENABLED="true"` e `RESEND_TOKEN`/`RESEND_FROM` de placeholder), `app` (3000) e `web` (3001). O
ambiente repete a lógica de `buildStackEnv` da `apps/e2e`: esvazia as chaves dos `.env` locais (que apontam para um
projeto real) e força `demo-next-boilerplate`. Os arquivos de ambiente e o script de página ficaram em `/tmp`.

No fim matei cada PID que subi (e os filhos) e mandei SIGINT ao `firebase-tools`. As portas acima e a 9150 ficaram
vazias (`lsof -ti tcp:<porta>` sem saída), a sessão do `agent-browser` foi fechada e apaguei os `firestore-debug.log`
da raiz e de `apps/api`. O `pnpm test` da raiz subiu e derrubou os próprios emuladores antes disso.

## Dados de QA e estado de dev

Tudo no emulador, que morreu com o processo. Nada foi criado em projeto Firebase real e nada entra no
`docs/PRE-PRODUCTION.md`.

- `qa-app-auth-forms@example.com`: cadastro pela tela `/en/sign-up`, depois desativada no emulador para o F5.
- `qa-app-auth-forms-google@example.com`: conta Google criada pelo popup do emulador.
- Contas do seed usadas: `user@example.com` (login, link por e-mail). A senha do seed está em `docs/SETUP.md`; a da
  conta de QA não foi gravada em arquivo, e a conta não existe mais.

## Rodada 2

O revisor corrigiu os dois defeitos (`review/review.md`, seção "Rodada 2"):

- `apps/app/shared/lib/googleSignInApi.ts`: `fetch(...).catch(() => null)` e `if (!sessionRes?.ok)` lança a frase de
  `session.notEstablished`, com um caso novo em `googleSignInApi.test.ts` para o `fetch` rejeitando.
- `AuthCard.tsx:11`, `SignInForm.tsx:124` e `SignUpFormClient.tsx:142`: `md:px-2` virou `px-4 sm:px-0`. O revisor
  preferiu `sm:px-0` à minha sugestão `md:px-0` porque entre 640 e 767 px a coluna de 400 px já tem folga, e o
  `px-4` ali só estreitaria o cartão. A medição abaixo confirma o raciocínio.

Remedi F1c e F4, e F2 e F3 por amostra, porque os mesmos arquivos mudaram.

### Testes

| comando | resultado |
|---|---|
| `pnpm test` (raiz, JDK 21, sem `--force`) | 15 tarefas, 15 com sucesso (13 do cache), 41,8 s, `EXIT=0` |
| ↳ `app:test` (único workspace que mudou, rodou fora do cache) | 130 arquivos, 1120 testes passando (1119 da rodada 1 + o caso novo do revisor) |
| ↳ do cache | `api` 1679, `api:test:emulator` 274, `web` 207, `@repo/auth` 136, `@repo/internationalization` 67, demais iguais à rodada 1 |

Nenhum teste novo nesta rodada: o caso do `fetch` rejeitando já cobre o defeito 1 em unidade, e o recuo continua
sendo medido só no navegador.

### Resultado por item

| item | status | medição |
|---|---|---|
| F1c Google, sessão sem resposta (`--abort`) | ✅ | `/en/sign-in`: toast de erro "Your session could not be started. Try signing in again."; o formulário voltou com o botão habilitado. Recarregando com o bloqueio ainda ativo: formulário, sem loader, e a store `firebaseLocalStorage` do IndexedDB vazia (client deslogado). Amostras: `/pt-br/sign-up` "Não foi possível iniciar sua sessão. Tente entrar novamente." e `/es/sign-in` "No se pudo iniciar tu sesión. Intenta iniciar sesión de nuevo.", formulário de volta nos dois |
| Google sem bloqueio (regressão) | ✅ | `/pt-br/sign-in`: "Login realizado com sucesso!", `access-token` gravado, destino `/pt-br/onboarding` (conta Google nova, onboarding pendente) |
| F4 375 px, claro e escuro | ✅ | igual à rodada 1: login 39/39, cadastro 43/43, "Esqueci", pedido de link, verificação de e-mail e redefinição 16/16, padding 16 px, `scrollWidth` 375 em todas |
| F4 376 a 639 px | ✅ | 500 e 639 px: telas do `AuthCard` com cartão de 368 px numa coluna de 400 px (16 px de cada lado); login 297 e cadastro 290 px, centrados; `scrollWidth` igual à janela |
| F4 640, 768 e 1280 px | ✅ | padding 0. Telas do `AuthCard`: cartão de 400 px (640: 120/120 px; 768: 184/184; 1280: 760/120, coluna da direita). Login e cadastro: 400 px a 1280; 297 e 290 px a 640 e 768, que é a largura do conteúdo e a mesma medida na rodada 1 antes de qualquer padding fazer diferença |
| F2 login normal | ✅ | `/en/sign-in` com `user@example.com`: "Login successful!", `/en`, `access-token` gravado |
| F3 `noValidate` | ✅ | `/en/sign-in`: `noValidate` true; vazio, `abc` e `qa@example` deram "Invalid email" e "Password must be at least 6 characters" |

Os dois defeitos da rodada 1 estão fechados. Os achados fora do corte continuam como estavam.

### Evidências

`07-r2-f4-1280-dark-forgot-es.png` (cartão de 400 px na coluna da direita, escuro) e `08-r2-f4-500-dark-link.png`
(500 px, escuro), em `test/e2e/`, descartados pelo `.gitignore`. O texto acima é a prova.

### Ambiente

Todas as portas estavam livres no início (3000 a 3003, 9099, 8080, 9199, 4001, 4400, 4500, 9150). O `pnpm test` da
raiz subiu e derrubou os próprios emuladores. Depois subi emuladores, seed, `api` (3002, com
`EMAIL_LINK_SIGN_IN_ENABLED="true"`) e `app` (3000), com o mesmo ambiente de processo da rodada 1 e sem tocar em
`.env`. A `web` não subiu: nada da landing mudou. No fim matei cada PID que subi e mandei SIGINT ao `firebase-tools`;
as portas ficaram vazias, a sessão do `agent-browser` foi fechada e apaguei os `firestore-debug.log` e o harness em
`/tmp`.

### Dados de QA

Só no emulador, que morreu com o processo:

- `qa-app-auth-forms-google@example.com`: criada de novo pelo popup do emulador, usada no F1c e no Google sem bloqueio.
- `user@example.com` (seed): F2.

Nada em projeto real, nada para o `docs/PRE-PRODUCTION.md`.
