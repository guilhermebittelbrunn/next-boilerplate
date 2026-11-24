# Relatório do `/test`: parte 3 da entrega, fatia 3 (títulos e conversão)

QA do working tree sobre `18288c9`, na branch `guilhermebittelbrunn/cycle-command-v13` (não protegida; o nome
proposto pelo `/review` ainda não foi criado). Rodou dentro do `/cycle`, sem perguntas ao usuário.

Placar: 15 critérios, 14 ✅, 0 ❌, 1 🔒 (propriedade GA4 real). Nenhum defeito de produção encontrado.

## Cobertura

| Comando | Resultado |
|---------|-----------|
| `pnpm test` (raiz, `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | 15/15 tarefas, 10 do cache, 3m57s |
| └ `app:test` | 140 arquivos, 1273 testes, todos passando (cache miss) |
| └ `web:test` | 34 arquivos, 306 testes (cache miss) |
| └ `@repo/analytics:test` | 3 arquivos, 41 testes (cache hit) |
| └ `@repo/auth:test` | 13 arquivos, 142 testes (cache hit) |
| └ `@repo/internationalization:test` (paridade) | 7 arquivos, 67 testes (cache hit) |
| └ `e2e:test` (unitários do e2e) | 3 arquivos, 38 testes |
| └ `api:test` / `api:test:emulator` | 127 arquivos, 1729 testes / 8 arquivos, 274 testes |
| └ demais pacotes | `shared` 56, `payments` 19, `security` 65, `next-config` 38, `sdk` 15, `email` 208, `design-system` 172 |
| `pnpm --filter e2e e2e tests/entityCrud.spec.ts` | 6 passed (5.8m): 4 do `setup`, `[chromium]` 23.3s, `[mobile]` 20.9s |
| `pnpm exec vitest run __tests__/panelTitles.test.ts` em `apps/app`, com a sonda `qaprobe` | 2 failed, 26 passed; sem a sonda, 27/27 |
| `next build` da `apps/app` com `NEXT_PUBLIC_GA_MEASUREMENT_ID=""` | exit 0 |

Não rodei `pnpm check` nem `typecheck` de novo: não mexi em código, e o `/review` mediu `Checked 1112 files` e o
typecheck de `app` e `web`. Nenhum gate rodou com `--force`.

### Testes criados

Nenhum. O diff já trazia teste no nível mais barato para cada comportamento, e o que faltava era o que só o
navegador prova (o `dataLayer` real, a corrida com `window.location.replace`, a composição do `template` pelo
Next). Isso foi medido no navegador e no E2E, como mostra a seção seguinte.

### Decisões de custo de teste

| Módulo tocado | Teste da faixa cara? | O que já cobria |
|---------------|----------------------|-----------------|
| `packages/analytics/events.ts`, `events-context.tsx`, `provider.tsx` | não | `events.test.ts` (unitário) e `analyticsEvents.test.tsx` (provider real em jsdom: decisão, recusa, aceite na visita, preferências, Vercel sem id, fora do provider) |
| `packages/auth/client.ts` (`isNewAccount`) | não | `newAccount.test.ts`, com `firebase/auth` mockado |
| `apps/app/shared/lib/googleSignInApi.ts` | não | `googleSignInApi.test.ts`: evento antes da troca de sessão, conta existente, falha da troca, falha do popup |
| Formulários da app e da landing | não | `signUpAnalytics.test.tsx` das duas apps e `contactForm.test.tsx` |
| Títulos do painel | já existia: `entityCrud.spec.ts` | `panelTitles.test.ts` prova as duas metades; o E2E prova que o Next compõe o `template` do layout com o título da página, o que nenhum unitário alcança |

Nenhum teste novo exige emulador.

## Critérios de aceite

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | Cada tela do painel tem título próprio | ✅ | navegador (12 telas × 3 idiomas), E2E, unitário |
| 2 | O título acompanha o idioma da rota | ✅ | navegador (en, es); unitário para idioma inválido |
| 3 | O formato segue o das telas sem autenticação | ✅ | navegador; unitário para troca de marca |
| 4 | Tela nova sem título quebra o teste | ✅ | sonda medida aqui |
| 5 | Título não expõe dado de usuário | ✅ | navegador (id real e id inexistente) |
| 6 | Título igual durante a personificação | ✅ | navegador |
| 7 | Cadastro por e-mail dispara `sign_up` uma vez | ✅ | navegador (app e landing); componente para recusa da API |
| 8 | Primeiro acesso com Google dispara `sign_up`, os seguintes não | ✅ | navegador (4 telas, retorno, popup fechado); unitário para conta recusada pela API |
| 9 | Contato aceito dispara `generate_lead` | ✅ | navegador (sucesso simulado, 503 real); componente para os outros erros |
| 10 | Sem consentimento, nenhum evento | ✅ | navegador (recusa e sem decisão); componente para preferências |
| 11 | Sem GA configurado, nada quebra | ✅ | navegador (landing em dev, app em build de produção); componente para Vercel sem id |
| 12 | Nenhum dado pessoal no evento | ✅ | navegador (todas as entradas lidas) e componente |
| 13 | O fork registra os próprios eventos com a mesma regra | ✅ | componente e leitura da doc |
| 14 | Documentação aponta para o que o core faz | ✅ | leitura |
| 15 | Eventos chegam numa propriedade GA4 real | 🔒 | precisa da propriedade do fork (item 19 do `PRE-PRODUCTION.md`) |

Texto completo de cada critério em `test/criterios-aceite.md`.

## Verificar no `/test`: veredito item a item

1. **`sign_up` do Google na app sobrevive ao `window.location.replace`.** Confirmado. Tela de login da app, banner
   aceito, conta nova no popup do emulador: o registro do `dataLayer` guardou
   `["/pt-br/sign-in",["event","sign_up",{"method":"google"}]]`, e a aba terminou em `/pt-br/onboarding` por
   carregamento completo. Na tela de cadastro da app, o mesmo com `"/pt-br/sign-up"`. Login seguinte com a mesma
   conta (escolhida na lista do popup): nenhuma entrada `event`, e a API registrou a segunda chamada a
   `POST /auth/sign-in/google`.
2. **`sign_up` por e-mail na app.** Confirmado. Sequência lida no `/pt-br/sign-up`: `consent default`,
   `consent update` com `analytics_storage: "granted"`, `js`, `config G-TEST000000`, depois
   `["event","sign_up",{"method":"email"}]`. Em `/pt-br/onboarding` o documento novo só trouxe `consent default`,
   `js` e `config`, sem segundo `sign_up`.
3. **Desvio 2, Google no cadastro da landing.** Confirmado. Com conta nova, a entrada
   `["event","sign_up",{"method":"google"}]` apareceu já com o caminho `/pt-br`, depois da navegação do cliente.
   Com o popup fechado pelo visitante: alerta "Login cancelado." e nenhuma entrada `event`.
4. **Google no login da landing com `?redirect=` para outra origem.** Derrubado como cenário. Com conta nova e sem
   redirect, o evento sai (`["/pt-br/sign-in",["event","sign_up",{"method":"google"}]]`, navegação para `/pt-br`).
   Com `?redirect=http%3A%2F%2Flocalhost%3A3000%2Fpt-br` o evento também sai, mas a navegação foi para
   `http://localhost:3001/pt-br`: `postAuthRedirectTarget` (`packages/auth/redirect.ts:31-33`) só aceita caminho
   da mesma origem com prefixo de idioma e cai no padrão para URL absoluta. A navegação completa para outra origem
   que o `/review` temia não acontece por esse caminho.
5. **Recusar o banner e repetir um cadastro.** Confirmado na app: depois de "Recusar tudo", o cadastro foi até
   `/pt-br/onboarding` e o `dataLayer` só teve `consent default`/`update` com tudo `denied`. Nenhuma requisição a
   `googletagmanager.com` nem a `google-analytics.com`. Sem decidir o banner, o mesmo: só `consent default`.
6. **Títulos V1 a V3.** Confirmado. Valores exatos na seção de evidências.
7. **E2E de títulos.** Confirmado: `chromium` e `mobile` passaram.
8. **App com `NEXT_PUBLIC_GA_MEASUREMENT_ID=""`.** Confirmado na app em build de produção e na landing em dev.
9. **`generate_lead` com `?redirect=` cruzado e com aceite simultâneo ao envio.** Parte confirmada, parte 🔒. O
   contato não lê `?redirect=`, e o envio aceito gravou `["/pt-br/contact",["event","generate_lead",null]]`. O
   aceite do banner no meio do envio não foi reproduzido: exigiria clicar no banner entre o clique e a resposta
   da API. Pela leitura de `provider.tsx:102-113`, o erro possível é deixar de medir aquele envio, nunca mandar
   sem consentimento.

## Evidências do navegador

O que prova o comportamento é o texto abaixo. Os prints em `test/e2e/` (descartados pelo `.gitignore`) foram
instrumento: `01-app-signup-email-onboarding.png`, `05-web-google-popup-closed.png`, `10-entities-desktop.png`,
`11-entities-mobile.png`, `12-entities-light.png`.

**Instrumento.** Um script de inicialização (`agent-browser open --init-script`) intercepta a atribuição de
`window.dataLayer` e copia cada `push` para `sessionStorage["qa-datalayer"]` com o caminho da página, o que
sobrevive ao carregamento completo na mesma origem. Measurement id falso `G-TEST000000`.

**Títulos, conta comum** (`user@example.com` do seed):

| Rota | pt-br | en | es |
|------|-------|----|----|
| `/` | Painel do usuário | User dashboard | Panel de usuario |
| `/entities` | Entidades | Entities | Entidades |
| `/entities/create` | Nova entidade | New entity | Nueva entidad |
| `/entities/edit/<id>` | Editar entidade | Edit entity | Editar entidad |
| `/organization` | Equipe | Team | Equipo |
| `/account` | Minha conta | My account | Mi cuenta |
| `/playground` | Playground | Playground | Playground |

**Títulos, admin** (`admin@example.com`):

| Rota | pt-br | en | es |
|------|-------|----|----|
| `/admin` | Administração | Administration | Administración |
| `/admin/users` | Usuários | Users | Usuarios |
| `/admin/users/create` | Criar Usuário | Create User | Crear Usuario |
| `/admin/users/edit/<id>` | Editar Usuário | Edit User | Editar Usuario |
| `/admin/audit` | Auditoria | Audit trail | Auditoría |

Todos com o sufixo " | next-boilerplate". O admin foi medido duas vezes no build de produção da app, com os
mesmos 15 valores. Navegação pela barra lateral (`/pt-br` → Entidades → Playground → Equipe) trocou o título a
cada clique. `/pt-br/entities/edit/does-not-exist-qa` mostrou "Editar entidade | next-boilerplate".
Personificando `user@example.com`: `/pt-br` "Painel do usuário" e `/pt-br/entities` "Entidades".

**Eventos.** Além dos itens 1 a 5 acima:

- Landing, cadastro por e-mail com aceite: `["event","sign_up",{"method":"email"}]` gravado em `/pt-br/sign-up` e
  ainda presente no `window.dataLayer` vivo depois da navegação para `/pt-br`.
- Contato com aceite: a API real respondeu `503 {"error":{"code":"CONTACT_UNAVAILABLE"}}` e nenhum evento saiu.
  Com a resposta `{"data":{"sent":true}}` simulada dentro da página, a tela mostrou "Mensagem enviada" e saiu um
  `generate_lead`.
- Sem GA (`NEXT_PUBLIC_GA_MEASUREMENT_ID=""`): sem banner "Aviso de cookies", `typeof window.dataLayer` e
  `typeof window.gtag` iguais a `"undefined"`, cadastro na landing até `/pt-br`, cadastro na app (build de
  produção) até `/pt-br/onboarding`, contato até "Mensagem enviada", e `agent-browser errors` vazio.

**Tema e responsivo.** A fatia não muda layout. Conferi a lista de entidades em escuro (desktop e 390×844) e em
claro, com o título "Entidades | next-boilerplate" nos três casos.

## Achados

- 🟢 `generate_lead` chega ao `gtag` como `("event","generate_lead",undefined)`: o `sendAnalyticsEvent` repassa
  `params` mesmo indefinido. O plano esperava duas posições. Não é defeito: o `gtag` trata o terceiro argumento
  ausente como evento sem parâmetro, e nenhum dado vai junto.
- 🟢 Fora de escopo: o `buildStackEnv("web")` de `apps/e2e/support/stackEnv.ts:66-85` não define
  `NEXT_PUBLIC_API_URL` para a landing. Com a pilha do E2E, o cadastro da landing faz `POST /pt-br/auth/sign-up`
  na própria origem e recebe 404. Nenhum spec envia esse formulário hoje, então a suíte não percebe. Um spec
  futuro de cadastro pela landing vai falhar por isso. Sugestão (hipótese): devolver `NEXT_PUBLIC_API_URL`,
  `NEXT_PUBLIC_APP_URL` e `NEXT_PUBLIC_WEB_URL` também para `web` em `crossAppUrls`. Fica como achado no backlog.
- Um `next dev` da app caiu uma vez com `RangeError: Maximum call stack size exceeded`
  (`.next/dev/server/chunks/ssr/...next_dist_esm_server...js:2034`) ao abrir `/pt-br/admin/users/edit/<id>`,
  depois de cerca de 40 minutos de uso. Não se repetiu ao subir o dev de novo, nem em 30 telas de admin no build
  de produção. Tratei como artefato do servidor de desenvolvimento, não como defeito.
- Instrumento: no `agent-browser` 0.27.0, `network route "*googletagmanager.com*" --abort` e
  `network route <url> --body` não interceptaram nada nesta sessão. Até eu trocar o bloqueio por um script de
  inicialização (que impede o `<script>` do `gtag.js` e o `fetch` para os dois domínios), o `gtag.js` carregou e
  mandou hits para `google-analytics.com/g/collect` com `tid=G-TEST000000`. O id não existe, então nada foi
  registrado em propriedade alguma, e os hits só levavam URL de `localhost`, título da aba e o evento
  (`en=sign_up&ep.method=email`, `gcs=G101`). Nenhum e-mail. De quebra, esse hit mostra o evento saindo do
  navegador com `analytics_storage` concedido. A resposta simulada do contato foi feita por um patch de
  `XMLHttpRequest` dentro da página, pelo mesmo motivo.

## Ambiente do e2e

- Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 9099, 8080, 4001, 9199). Nada foi
  reutilizado do usuário.
- O `pnpm --filter e2e e2e` subiu e derrubou a própria pilha.
- Para o navegador subi emuladores (`pnpm emulators`, JDK 21), seed (`apps/api/scripts/seed-emulator.mjs`),
  `api` (3002), `app` (3000) e `web` (3001) com o ambiente do `buildStackEnv` mais `G-TEST000000`. O limite de
  tempo de processo em segundo plano derrubou emuladores, `api` e `app` no meio; subi de novo e refiz o seed.
- A `web` foi reiniciada duas vezes: uma para receber `NEXT_PUBLIC_API_URL`, outra sem id do GA. A `app` terminou
  em `next build` + `next start`.
- No fim matei os PIDs que subi e, onde sobrou filho preso, o processo da porta que eu abri. Conferido com
  `lsof -ti tcp:<porta> -sTCP:LISTEN`: 3000, 3001, 3002, 9099, 8080, 4001, 9199, 4400, 4500 e 9150 vazias. Sessão
  `agent-browser` fechada.
- Removi `apps/api/AGENTS.md`, `apps/app/AGENTS.md` e `apps/web/AGENTS.md`, que o `next dev` 16.4.6 escreve
  sozinho. A sonda `qaprobe` foi apagada. Ficam o `apps/app/.next` do build e `firestore-debug.log`, ambos
  ignorados pelo Git. O aviso de upgrade do `next dev` que a memória do repo descreve não apareceu: o Next agora é
  16.4.6.

## Lacunas herdadas, com veredito

| Lacuna | Veredito |
|--------|----------|
| Nenhum teste chega ao `window.dataLayer` real nem ao `GoogleAnalytics` real | Fechada aqui por medição no navegador, não por teste automatizado. Um teste automatizado exigiria o `gtag` real no E2E, e a suíte roda sem id do GA. |
| O `useEffect` que navega nas telas da app não está nos testes de evento | Fechada aqui por medição: o evento sobrevive ao carregamento completo nas duas telas da app. Continua sem teste automatizado. |
| `panelTitles.test.ts` quebra com a chamada em várias linhas | Fechada no `/review`. A sonda deste QA confirma que o teste ainda pega tela sem registro. |
| V1 a V9 e E2E do plano §8 | Fechadas, com o detalhe de cada uma acima. |
| Aceite do banner simultâneo ao envio do contato | Continua aberta (🔒 por reprodução); o pior caso é não medir. |
| Ver os eventos numa propriedade GA4 real | Fora de escopo do core: item 19 do `PRE-PRODUCTION.md`. |

## Estado de dev alterado

Tudo no emulador, que não persiste dados: o processo foi encerrado e as contas morreram com ele. Nenhuma conta foi
criada em projeto Firebase real, então o `docs/PRE-PRODUCTION.md` não ganha entrada. Contas criadas na passada,
para registro: `qa-dpq-slice-3-app@example.com`, `qa-dpq-slice-3-app-denied@example.com`,
`qa-dpq-slice-3-app-undecided@example.com`, `qa-dpq-slice-3-app-nogaid@example.com`,
`qa-dpq-slice-3-web@example.com`, `qa-dpq-slice-3-nogaid@example.com`, `qa-dpq-slice-3-g-app-in@example.com`,
`qa-dpq-slice-3-g-app-up@example.com`, `qa-dpq-slice-3-g-web-up@example.com`,
`qa-dpq-slice-3-g-web-in@example.com` e `qa-dpq-slice-3-g-web-redirect@example.com`. As contas do seed
(`admin@example.com`, `user@example.com`) são do emulador, com a senha documentada em `docs/SETUP.md`. A senha
das contas de QA não foi gravada em arquivo.
