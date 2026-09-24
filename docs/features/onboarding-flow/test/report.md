# Relatório de QA: onboarding pós-cadastro

Rodada autônoma dentro de um `/cycle`, na branch `feat/onboarding-flow` (não protegida). Nada foi
commitado e nenhuma branch foi criada. A passada de browser rodou sob o emulador de Auth e Firestore, com a
API e o app em `next dev`; os dois defeitos e os pontos sensíveis a `next dev` foram repetidos em
`next build && next start`.

Resultado final, depois da rodada 2: **20 critérios, 20 ✅, 0 ❌, 0 🔒**. Na rodada 1 foram 18 ✅ e 2 ❌,
por dois defeitos de produção (D1 e D2), nenhum de segurança. O `/review` corrigiu os dois e a rodada 2
(no fim deste arquivo) remediu com o app de pé.

## Defeitos de produção (rodada 1, corrigidos na rodada 2)

### D1. O passo 2 pré-seleciona "Português" para toda conta nova, e "Concluir" troca o idioma sem o usuário escolher

Repro (emulador, conta nova):

1. Cadastrar em `/en/sign-up`. A tela cai em `/en/onboarding`, "Step 1 of 2".
2. Preencher o nome e clicar em "Continue". O passo 2 abre em inglês com o campo "Language" mostrando
   **Português**.
3. Clicar em "Finish" sem mexer no campo.

Resultado medido: URL final `http://localhost:3000/pt-br`, `<html lang="pt-br">`, `x-locale=pt-br`, painel
em português ("Olá, QA"). O mesmo acontece em `/es/onboarding` (campo "Idioma" mostrando "Português").
Esperado pelo plano (5.4 e D10): o default é o locale da URL, e o usuário continua em `/en/...`.

Causa lida no código: `GET /account` passa as preferências por `resolvePreferences`
(`apps/api/(shared)/lib/account-avatar.ts:10-24`), que devolve `locale: "pt-br"` quando o documento não tem
`preferences`. O documento de uma conta nova não tem o campo (conferido no emulador), então
`account.preferences.locale` sempre chega preenchido e o fallback para o locale da URL em
`OnboardingClient.tsx` (`defaultLocale`) nunca é usado.

Sugestão (hipótese, não medida): no passo 2, usar o locale da URL como default e só preferir a conta quando
houver preferência gravada de fato; por exemplo, expor no DTO se a preferência foi escolhida, ou iniciar o
campo com o `locale` da tela. Mudar o default de `resolvePreferences` tem raio maior (área de conta, SSR do
tema) e não é recomendado para esta correção.

### D2. Depois de um 409, a tela avisa que mudou de passo, mas continua no mesmo passo

Repro (emulador, conta nova, reproduzido em `next dev` e em `next start`):

1. Conta pendente em `profile`. Abrir `/es/onboarding`, preencher o nome, "Continuar". A tela vai para
   "Paso 2 de 2".
2. Voltar o estado no servidor para `{ step: "profile", completedAt: null }` (no teste, `PATCH` no documento
   do emulador; na vida real, qualquer escrita fora desta aba que deixe o servidor atrás da tela).
3. Clicar em "Omitir".

Resultado medido: `POST /account/onboarding` responde `409`; o toast diz "Tu progreso cambió en otra
pestaña. Te llevamos al paso correcto." (em inglês: "Your progress changed in another tab. We moved you to
the right step."); o `router.refresh()` dispara (`GET /es/onboarding?_rsc=...` 200) e o HTML do servidor já
traz `initialStep: "profile"`. A tela, porém, continua em "Paso 2 de 2". Um segundo clique em "Omitir" gera
outro `409`. Só recarregar a página leva ao passo 1.

Causa lida no código: `page.tsx` monta `<OnboardingClient key={pendingOnboarding.step} />`. O componente foi
montado com o servidor em `profile` e avançou para `preferences` só no estado local (`setStep`). Depois do
refresh o servidor continua em `profile`, a `key` não muda, o React não remonta e o `useState(initialStep)`
mantém `preferences`.

Sugestão (hipótese): no 409, ler o estado real e aplicar com `setStep` (a API poderia devolver o estado atual
no corpo do 409, como já faz no 200 de passo anterior), ou sincronizar o estado local com `initialStep`
sempre que o servidor renderizar. O teste de componente atual cobre o toast e a chamada a `router.refresh()`
com o erro mockado, mas não o passo exibido depois.

Gravidade: baixa frequência. O 409 só aparece quando a tela está à frente do servidor, o que o fluxo normal
não produz; duas abas no mesmo passo caem no caminho de passo anterior, que responde 200. Quando acontece, a
mensagem promete algo que a tela não faz e o usuário fica preso até recarregar.

## Cobertura: testes

| comando | resultado |
|---|---|
| `pnpm --filter app exec vitest run __tests__/onboardingState.test.ts __tests__/proxy.test.ts` | 2 arquivos, 33/33 (16 + 17), depois dos testes novos |
| `pnpm test` (root, turbo, sem `--force`) | 10/10 tasks, 8 do cache, 20 s |
| ↳ `api` | 60 arquivos, 680/680 |
| ↳ `app` | 68 arquivos, 499/499 (eram 497; +2 desta etapa) |
| ↳ `@repo/internationalization` (paridade + `apiErrors`) | 5 arquivos, 44/44 |
| ↳ `web` · `@repo/auth` · `@repo/email` · `@repo/shared` · `@repo/security` · `@repo/analytics` · `@repo/payments` | 35 · 101 · 137 · 44 · 31 · 34 · 8, todos passando |
| `pnpm turbo run typecheck --filter=app` | 1/1, sem cache (os testes mudaram) |
| `pnpm check` | 666 arquivos, sem correção pendente (depois de `biome check --write` num teste novo) |

`@repo/sdk` não tem script de teste; o contrato é coberto pelo typecheck dos consumidores e pelos testes de
rota da API. Os typechecks de `api`, `sdk` e `internationalization` não foram remedidos: esta etapa não
alterou esses workspaces, e o `/review` os mediu em 4/4.

### Testes criados

| arquivo | caso novo | o que prova |
|---|---|---|
| `apps/app/__tests__/onboardingState.test.ts` | "recognises the onboarding even when the destination carries a query or a hash" | `/pt-br/onboarding?x=1`, a forma codificada, `#hash` e `/onboarding/?redirect=` caem em `/pt-br`; `/pt-br/entities?onboarding=1` continua aceito. Cobre a correção do `/review` em `isOnboardingPath`. |
| `apps/app/__tests__/proxy.test.ts` | "still stores the locale cookie when it forwards the request headers" | Na mesma requisição autenticada o proxy grava `x-locale` por `cookies().set` e devolve o override de headers com `x-app-path`. O header `set-cookie` final depende do adapter do Next e foi medido por `curl` (abaixo). |

### Decisões de custo de teste

Nenhum teste da faixa cara foi criado. O e2e com emulador e app de pé foi a passada de browser, não um
`.test.ts`.

| módulo tocado | decisão |
|---|---|
| `POST /account/onboarding` | Já coberto por `accountOnboardingRoute.test.ts` (12 casos, repositório e guard mockados). O contrato de infra não mudou; o `curl` contra o emulador confirmou os mesmos códigos. |
| `apps/api/(shared)/lib/onboarding.ts` e `user-merge.ts` | Cobertos por `onboardingState.test.ts`, `signUpProfile.test.ts` e `googleSignInProfile.test.ts`. O documento real no emulador mostrou `onboarding: { step: "profile", completedAt: null }`, igual ao que o mock assume. |
| `apps/app/shared/lib/onboarding.ts` | Lacuna barata fechada com um caso unitário. |
| `apps/app/proxy.ts` | Um caso unitário novo; o `set-cookie` real exige o runtime do Next e foi medido por `curl`, mais barato que um teste de integração do proxy. |
| `lib/server/onboarding.ts`, `(common)/layout.tsx`, `onboarding/page.tsx` | Regra coberta por `onboardingRedirect.test.ts`; o comportamento do RSC foi medido no e2e. Não criei teste de RSC. |
| `OnboardingClient.tsx` | Não criei teste para D2: ele falharia, e teste vermelho bloqueia o build. Fica como sugestão para quem corrigir. |

## Critérios de aceite: status por item

Checklist completo em `test/criterios-aceite.md`.

| # | critério | status | meio |
|---|---|---|---|
| 1 | Recém-cadastrado é desviado | ✅ | e2e + `curl` |
| 2 | Perfil nasce com o estado inicial | ✅ | emulador (documento) + unit |
| 3 | Progresso visível | ✅ | e2e, 3 idiomas |
| 4 | Nome obrigatório | ✅ | e2e + `curl` |
| 5 | Nome salvo por `PUT /account` | ✅ | e2e (rede) + `curl` |
| 6 | Idioma pulável e salvo quando escolhido | ✅ | e2e + `curl` |
| 7 | Retomável | ✅ | e2e |
| 8 | Deep link preservado | ✅ | e2e + `curl` (query string perdida, ver O2) |
| 9 | Troca de idioma leva o destino junto | ✅ | e2e em `next dev` (en) e `next start` (es) |
| 10 | Concluído nunca mais é interceptado | ✅ | e2e + `curl` (redirect por streaming, ver O1) |
| 11 | Perfil legado entra direto | ✅ | e2e + `curl` + emulador |
| 12 | Admin e impersonação não são interceptados | ✅ | e2e + `curl` |
| 13 | Sem open redirect e sem laço | ✅ | e2e + `curl` + unit |
| 14 | Fora de ordem recusado e tela ressincroniza | ✅ na rodada 2 (❌ na 1) | e2e: 409, toast e volta ao passo 1 sem recarregar |
| 15 | Clique duplo não gera erro | ✅ | e2e (contagem de requisições) |
| 16 | Validação do corpo na API | ✅ | `curl` (400/401) + unit de rota (500) |
| 17 | Interruptor | ✅ | e2e com `"false"` e `""` |
| 18 | Erros traduzidos | ✅ | paridade 44/44 + toast em en e es |
| 19 | Tema e responsivo | ✅ | e2e light/dark, 1280 e 375 px |
| 20 | Idioma pré-selecionado é o da URL | ✅ na rodada 2 (❌ na 1) | e2e em en e es |

## Verificar no `/test`: veredito

| item do `review.md` | veredito | medido |
|---|---|---|
| 1. Cadastro novo cai no onboarding num salto | confirmado | `curl -i /pt-br` com a sessão da conta nova: `307`, `location: /pt-br/onboarding`, sem `?redirect=`. No browser, o cadastro terminou em `/pt-br/onboarding` sem sidebar nem navbar (a árvore de acessibilidade só tem o título, o card e o formulário). |
| 2. Deep link | confirmado | `curl -i /pt-br/entities/create`: `location: /pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fcreate`. No browser, concluir levou a `/en/entities/create` (com troca para inglês) e, em outra conta, "Omitir" levou a `/es/entities`. `/pt-br/entities?page=2` vira `?redirect=%2Fpt-br%2Fentities`, sem a query (O2). |
| 3. Router cache depois de concluir | confirmado | O destino renderizou o painel ("New entity", sidebar) sem voltar a `/onboarding`. "Voltar" no navegador foi para `/en` (a entrada anterior era `/en/onboarding`, que redireciona), sem laço. |
| 4. Troca de idioma no fim (maior risco) | confirmado | `next dev`: de `/pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fcreate`, escolhendo English: URL `/en/entities/create`, `<html lang="en">`, `document.cookie` com `x-locale=en`, textos em inglês, `preferences.locale: "en"`. `next start`: de `/en/onboarding?redirect=%2Fen%2Fentities`, escolhendo Español: `/es/entities`, `lang="es"`, `x-locale=es`, menu "Entidades"/"Configuración". O par `replace` + `refresh` não se cancelou. |
| 5. 409 ressincroniza | **derrubado** na rodada 1, confirmado na rodada 2 | `curl` com `{"step":"preferences","outcome":"completed"}` na conta em `profile`: `409 ONBOARDING_STEP_OUT_OF_ORDER`. Na tela, o toast traduzido aparece, mas o passo exibido não muda (D2). |
| 6. Admin personificando conta pendente | confirmado | Admin do seed entrou em `/pt-br/admin`. Personificando `qa-onboarding-3@example.com` (pendente): `/pt-br` mostra o painel comum ("Olá", seletor com o e-mail), `/pt-br/entities` abre direto, `/pt-br/onboarding` vai para `/pt-br`. `POST /account/onboarding` com os headers de impersonação: `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`; como admin puro: `403 COMMON_PANEL_FORBIDDEN`. O estado da conta personificada não mudou. |
| 7. Layout e tema | confirmado | Light e dark em 1280×800 e 375×667 nas duas telas. Em 375 px, `scrollWidth` = 375 (sem rolagem horizontal) e `scrollHeight` = 667 (o card inteiro, com "Skip"/"Finish", cabe sem rolar). Dark: fundo quase preto, card com borda cinza, primário claro com texto escuro; light: fundo branco, primário escuro. O `Footer` fica logo abaixo do campo, sem sobreposição. |
| 8. Nome do Google como default | não coberto aqui | O login Google no emulador não foi percorrido; segue fechado por leitura no `/review`. O caminho análogo (nome já salvo reaparece no passo 1 depois de recarregar) foi medido: o campo voltou com "QA Onboarding Tres". |
| Novo: `set-cookie` do `x-locale` no pass-through | confirmado | `curl -i /en/entities` com `x-locale=pt-br` e sessão válida: `set-cookie: x-locale=en; Path=/`, em `next dev` (conta pendente, `307`) e em `next start` (conta concluída, `200`). |
| Novo: `?redirect` para o onboarding com query | confirmado em parte | Com o fluxo concluído, `/pt-br/onboarding?redirect=%2Fpt-br%2Fonboarding%3Fx%3D1` termina em `/pt-br`, sem laço, no browser e no payload (`NEXT_REDIRECT;replace;/pt-br;307`). O status HTTP, porém, é `200` com redirect por streaming, não um `307` (O1). |

## Evidências e2e, em texto

- Passo 1, pt-br: título "Vamos configurar sua conta", subtítulo "Leva menos de um minuto.", "Passo 1 de 2",
  barra pela metade, "Como devemos te chamar?", campo "Nome de exibição *", só o botão "Continuar".
- Validação: vazio e só espaços mostram "Informe um nome de exibição."; 121 caracteres mostra "O nome de
  exibição pode ter no máximo 120 caracteres."; nenhuma requisição para `:3002/account` nesses envios. Em
  en: "Enter a display name."; em es: "Indica un nombre visible.".
- Clique duplo em "Continuar": exatamente um `PUT /account` e um `POST /account/onboarding`, ambos `200`,
  seguidos de `GET /account`. Clique duplo em "Omitir": um `POST`.
- Passo 2, pt-br: "Passo 2 de 2", barra cheia, "Em que idioma prefere usar o produto?", campo "Idioma" com
  Português/English/Español, botões "Pular" e "Concluir". En: "Skip"/"Finish"; es: "Omitir"/"Finalizar".
- Retomada: recarregar e reabrir `/pt-br` voltaram ao passo 2. Depois de sair e entrar, a conta concluída
  foi direto para `/pt-br` ("Olá, QA").
- `curl` na API: passo à frente `409 ONBOARDING_STEP_OUT_OF_ORDER`; pular o passo 1
  `400 ONBOARDING_STEP_NOT_SKIPPABLE`; corpo com `id`, `{}`, texto não-JSON e passo `bogus`
  `400 VALIDATION_FAILED`; sem cookie `401 AUTH_INVALID_TOKEN`; passo anterior ao atual
  `200 {"data":{"step":"preferences","completedAt":null}}` sem escrita; conta do seed `200 {"data":null}`.
- Proxy: `x-app-path: https://evil.example.org` enviado pelo `curl` foi ignorado; o `location` saiu com o
  caminho real (`/pt-br/onboarding?redirect=%2Fpt-br%2Fentities`).
- Redirect com o fluxo concluído: `?redirect=https%3A%2F%2Fexample.org` e `%2F%2Fexample.org` terminam em
  `/pt-br`; `?redirect=%2Fpt-br%2Fentities` termina em `/pt-br/entities`.
- Interruptor: com `ONBOARDING_ENABLED="false"`, a conta 4 cadastrou em `/es/sign-up` e caiu em `/es`
  ("Hola"); `/es/onboarding` foi para `/es`; `curl /es/entities` deu `200`; o documento ficou com
  `{ step: "profile", completedAt: null }`. Reiniciado com `ONBOARDING_ENABLED=""`, o mesmo `curl` deu `307`
  para `/es/onboarding?redirect=%2Fes%2Fentities`.
- Legado: `user@example.com` entrou por `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities` e caiu em
  `/pt-br/entities`. Os 3 documentos do seed continuaram sem o campo `onboarding`.
- Screenshots de apoio em `test/e2e/` (descartados pelo `.gitignore`): `01` passo 1 pt-br dark desktop, `02`
  passo 1 pt-br light desktop, `03` passo 1 es light 375, `04` passo 2 pt-br light desktop, `05` destino
  `/en/entities/create`, `06` passo 1 en dark 375, `07` admin personificando, `08` passo 2 en dark 375, `09`
  toast do 409 en dark 375, `10` passo 2 es dark desktop. Nenhum mostra dado de pessoa real.

## Observações (não reprovam critério)

- **O1.** Com o fluxo concluído, `/{locale}/onboarding` responde `200` e redireciona por streaming
  (`<meta http-equiv="refresh" content="1;url=/pt-br">` + `NEXT_REDIRECT` no payload), em `next dev` e em
  `next start`. O `redirect()` da página roda depois de o `loading.tsx` abrir o Suspense. O usuário chega ao
  destino, mas vê o esqueleto por um instante e, sem JavaScript, espera 1 s. Para um `307` de verdade, o
  gate teria de subir para um layout do segmento ou a página perder o `loading.tsx`.
- **O2.** O deep link perde a query string: o proxy grava só o `pathname` em `x-app-path`. Afeta, por
  exemplo, um link de listagem filtrada aberto antes do onboarding.
- **O3.** A mensagem de validação do passo 1 aparece com o input em `aria-invalid="false"`. O `/review` da
  rodada 2 localizou a causa em `HookFormInput` (design system, afeta todos os formulários) e deixou como
  achado de backlog, fora do mínimo desta feature.
- **O4, anterior a esta feature.** O `<html lang>` do root layout segue o cookie `x-locale` da requisição,
  não a URL: a primeira carga completa de `/en/sign-in` com `x-locale=pt-br` sai com `lang="pt-br"`. A troca
  de idioma do onboarding não sofre disso, porque grava o cookie antes de navegar.
- **O5, anterior a esta feature.** `/favicon.ico` não existe no app e cai no segmento `[locale]`: anônimo vai
  para `/favicon.ico/sign-in`, e agora uma conta pendente vai para
  `/favicon.ico/onboarding?redirect=%2Ffavicon.ico`. O navegador pede isso em toda página.
- **O6.** A tela do onboarding não tem navbar nem "Sair" (P2 do plano). Com D2 corrigido, o 409 não prende
  mais ninguém; a recomendação segue sendo manter sem botão no MVP.
- Sob o emulador, `RESEND_TOKEN` vazio faz o envio do e-mail de confirmação falhar no cadastro ("Could not
  request the verification email" no console, badge "1 Issue" do Next). É ambiente, não a feature.

## Lacunas herdadas: veredito

| lacuna | veredito |
|---|---|
| `onboarding/page.tsx` sem teste de RSC (handoff) | continua aberta como teste. O comportamento foi medido no e2e (fluxos 7 e 10), incluindo O1. |
| `(common)/layout.tsx` sem teste chamando `redirect` (handoff) | continua aberta, baixa prioridade. O `307` do layout foi medido por `curl`. |
| `resolveOnboardingDestination` com `/{locale}/onboarding?x=1` (review) | fechada aqui, com o caso novo em `onboardingState.test.ts`. |
| `proxy.test.ts` sem conferir `set-cookie` do `x-locale` junto do override (review) | fechada aqui: o unitário prova a chamada e o override na mesma requisição, e o `curl` prova o header final em dev e prod. |
| Nome do Google como default (handoff 8) | continua aberta no e2e; coberta por leitura. |

## Ambiente do e2e

Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 4400, 4500, 9150).
Subi e derrubei, por PID:

- `pnpm emulators` (Auth 9099, Firestore 8080, UI 4001), com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`;
- `pnpm seed`;
- `pnpm --filter api dev` (3002);
- `pnpm --filter app dev` (3000), reiniciado duas vezes para o interruptor (`"false"` e depois `""`);
- `next build` + `next start -p 3000` em `apps/app`, para confirmar D2, O1, o `set-cookie` e a troca de
  idioma fora do `next dev`.

Os `.env` locais de `apps/app` e `apps/api` apontam para um projeto Firebase real. Não mexi neles: rodei os
processos com o bloco do emulador exportado no shell (hosts do emulador, `demo-next-boilerplate`, service
account e `NEXT_PUBLIC_FIREBASE_*` vazios), e o `@next/env` não sobrescreve variável já definida. O seed
confirmou o alvo ("Seeded the emulated project demo-next-boilerplate").

No fim, matei os PIDs e os filhos; um `next-server` do `next start` ficou órfão com sockets em `CLOSE_WAIT` e
foi encerrado pelo PID. Conferido com `lsof -ti tcp:<porta>`: todas as portas acima vazias. Apaguei
`apps/app/.next` e `apps/api/.next`, que não existiam antes. As sessões do `agent-browser` foram fechadas.
Nada do ambiente do usuário foi reutilizado nem derrubado.

## Estado de dev alterado

Nenhum dado em projeto real. Contas criadas só no emulador, que descarta o estado ao encerrar:
`qa-onboarding-1@example.com`, `qa-onboarding-2@example.com`, `qa-onboarding-3@example.com` e
`qa-onboarding-4@example.com`. A senha era descartável e não foi gravada em arquivo. No emulador, o estado da
conta 3 foi editado à mão (`PATCH` no documento `user`) para produzir o 409 e repetir o fim do fluxo. Nada
precisa de limpeza e nada entra no `docs/PRE-PRODUCTION.md`.

## Rodada 2

O `/review` corrigiu os dois defeitos no `OnboardingClient` e no hook dele, sem mexer na API nem no SDK:

- D1: o passo 2 recebe `defaultLocale={locale}`, o locale da tela (`OnboardingClient.tsx:132`).
- D2: `useOnboardingMutations` recebe `onConflict` e o chama no 409 antes do `router.refresh()`
  (`useOnboardingMutations.tsx:19-25`, `:47-50`); o `OnboardingClient` passa `() => setStep(initialStep)`.

Remedi só o que essas mudanças tocam. A tela do passo 2 não mudou visualmente (o screenshot em en dark
1280 px mostra o mesmo card, agora com "English" no campo), então não refiz a matriz de tema e idioma.

### Testes

| comando | resultado |
|---|---|
| `pnpm test` (root, turbo, sem `--force`) | 10/10 tasks, 9 do cache, 19 s |
| ↳ `app` | 68 arquivos, 501/501 (499 da rodada 1 + os 2 casos novos do `/review` em `onboardingClient.test.tsx`) |
| ↳ `api` · `@repo/internationalization` | 680/680 · 44/44, do cache (não mudaram) |
| ↳ demais workspaces | iguais à rodada 1, todos passando |

### D1: confirmado corrigido

- `qa-onboarding-5@example.com`, cadastro em `/en/sign-up`, nome, "Continue". O campo "Language" do passo 2
  mostra **English**. "Finish" sem mexer: um `PUT /account` e um `POST /account/onboarding`, os dois `200`;
  URL final `/en`, `<html lang="en">`, `document.cookie` com `x-locale=en`, título "Hello, QA";
  `GET /account` devolve `preferences.locale: "en"`.
- `qa-onboarding-6@example.com`, cadastro em `/es/sign-up` (375 px). O campo "Idioma" mostra **Español**.
  "Finalizar" sem mexer (depois do repro de D2, abaixo): URL `/es`, `lang="es"`, `x-locale=es`,
  "Hola, QA", `preferences.locale: "es"`.
- Em `/pt-br`, a conta 7 viu "Português" pré-selecionado, que é o locale da tela.

### D2: confirmado corrigido

Conta 6 em "Paso 2 de 2"; no emulador, `PATCH` no documento `user` voltando o estado para
`{ step: "profile", completedAt: null }`; clique em "Omitir". Resultado: `POST /account/onboarding` `409`,
toast "Tu progreso cambió en otra pestaña. Te llevamos al paso correcto.", `router.refresh()`
(`GET /es/onboarding?_rsc=...` `200`) e a tela passa a mostrar **"Paso 1 de 2"**, sem recarregar, com a URL
em `/es/onboarding` e o campo "Nombre visible" ainda com "QA Onboarding Seis". Em seguida, "Continuar"
(`PUT` + `POST` `200`) levou a "Paso 2 de 2" e "Finalizar" (`PUT` + `POST` `200`) concluiu o fluxo em `/es`.
Nenhum segundo 409.

### Troca de idioma no fim (item 4 do review), com escolha explícita

Na rodada 1 o default errado de D1 podia mascarar esse teste. Agora, com `qa-onboarding-7@example.com`: deep
link `/pt-br/entities/create` levou a `/pt-br/onboarding?redirect=%2Fpt-br%2Fentities%2Fcreate`; nome,
"Continuar"; no passo 2 o campo mostrava "Português" e troquei para **English** no seletor; "Concluir".
Resultado: URL `/en/entities/create`, `<html lang="en">`, `x-locale=en`, menu em inglês ("Platform",
"Entities", "Settings"), `preferences.locale: "en"`. O par `replace` + `refresh` segue funcionando.

### Screenshots de apoio (gitignored)

`r2-01-passo2-en-default.png` (passo 2 en dark 1280 px, "English" no campo), `r2-02-409-volta-passo1-es-mobile.png`
(toast do 409 com a tela em "Paso 1 de 2", 375 px), `r2-03-destino-en-entities-create.png`.

### Ambiente da rodada 2

Portas livres no início. Subi e derrubi por PID: `pnpm emulators` (JDK 21), `pnpm seed`,
`pnpm --filter api dev` (3002) e `pnpm --filter app dev` (3000, `ONBOARDING_ENABLED=""`), com o mesmo bloco
do emulador exportado no shell da rodada 1. Fechei as três sessões do `agent-browser`, apaguei
`apps/app/.next` e `apps/api/.next` e conferi com `lsof`: 3000, 3001, 3002, 3003, 9099, 8080, 4001, 4400,
4500 e 9150 vazias, sem `next-server` órfão.

### Contas de QA da rodada 2

`qa-onboarding-5@example.com`, `qa-onboarding-6@example.com` e `qa-onboarding-7@example.com`, só no
emulador, já encerrado. Senha descartável, não gravada em arquivo. Nada precisa de limpeza.
