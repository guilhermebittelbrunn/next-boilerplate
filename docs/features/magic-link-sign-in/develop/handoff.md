# Handoff do `/develop` — Entrar com link enviado por e-mail

Rodada autônoma do `/cycle`. Nada foi commitado; a branch continua `guilhermebittelbrunn/feature-valor-cycle`. Os
arquivos em `specs/` que aparecem modificados no working tree são da auditoria do backlog e não foram tocados
aqui.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| 10.1 Contrato | `packages/sdk/src/actions/auth/action.ts` (tipos `EmailLinkSignInAvailability`, `EmailLinkSignInRequestBody`; métodos `emailLinkSignInAvailability`, `requestEmailLinkSignIn`) |
| 4.4 Env e helper | `apps/api/env.ts`, `apps/api/.env.example`, `apps/api/(shared)/lib/email-link-sign-in.ts` (novo) |
| 10.3 Gerador de link | `apps/api/(shared)/lib/auth-action-links.ts` (kind `sign-in`, `canSignInByLink`, `generateFirebaseLink`) |
| 4.3 Validação | `apps/api/(shared)/validation/auth.schema.ts` (`emailLinkSignInRequestSchema`, `parseEmailLinkSignInRequest`) |
| 10.2 Rotas | `apps/api/app/(routes)/auth/sign-in/email-link/route.ts` (GET), `.../email-link/request/route.ts` (POST) |
| 10.4 Rate limit | `apps/api/proxy.ts` (`/auth/sign-in/email-link/request` na lista; comentário explica o GET fora) |
| 10.5 `packages/auth` | `types.ts` (`EmailLinkSignInDTO`), `client.ts` (`signInWithEmailLinkCode`), `provider.tsx` (mutation `signInWithEmailLink` com `onAuthSuccess`, sem `onError`) |
| 5.2 Dados da app | `apps/app/shared/lib/queryKeys.ts` (`queryKeys.auth`), `shared/lib/emailLinkSignIn.ts`, `shared/hooks/useEmailLinkSignIn.ts` |
| 5.3 Página e componentes | `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/page.tsx`, `components/EmailLinkRequestForm.tsx`, `components/EmailLinkCompletion.tsx`, `validations/emailLinkSchema.ts` |
| 5.1 Entrada no login | `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx` |
| 10.7 i18n | `translations/apps/app/pages/emailLinkSignIn/index.ts` (novo), `pages/index.ts`, `pages/signIn/index.ts` (`emailLink`), `packages/shared/utils.ts` (`AUTH_EMAIL_LINK_DISABLED`) |
| 10.8 Docs | `docs/SETUP.md` (seção do Resend), `docs/PRE-PRODUCTION.md` (item 15 novo) |

Testes:

| Arquivo | O que cobre |
|---------|-------------|
| `apps/api/__tests__/authActionLinks.test.ts` (10 casos novos) | kind `sign-in`: URL de continuação e link da app por idioma; recusa `not-eligible` para conta só Google, não verificada e sem provedor, sem endereço no log; conta com senha + Google recebe; conta desativada recebe; `auth/operation-not-allowed` e `auth/unauthorized-continue-uri` viram `null`; os outros kinds ignoram a regra |
| `apps/api/__tests__/emailLinkSignInEnabled.test.ts` (novo) | leitura da flag (`undefined`, `""`, `"  "`, `"false"`, `"0"`, `"1"`, `"yes"`, `"true"`, `" TRUE "`, `"True"`) e disponibilidade = flag × e-mail |
| `apps/api/__tests__/authEmailLinkSignInRoute.test.ts` (novo) | GET: matriz flag × Resend × `NEXT_PUBLIC_APP_URL` e `dynamic = "force-dynamic"`. POST: 404 antes de ler corpo inválido, 503 sem Resend e sem link base, conta elegível × desconhecida com corpo idêntico, nada resolvido antes de responder, `confirmAccess` no idioma pedido, falha de entrega não muda a resposta, log sem endereço, 400 para e-mail vazio/espaços/sem `@`/acima de 320/idioma inválido, JSON inválido, URL extra no corpo ignorada |
| `apps/api/__tests__/corsOrigin.test.ts` (1 caso novo) | POST de pedido conta no rate limit; GET de disponibilidade não |
| `packages/auth/__tests__/emailLinkSignIn.test.ts` (novo) | URL montada com `mode=signIn`, `oobCode` intacto mesmo com `+/=&`, `apiKey` do app, query da página descartada, erro do SDK repassado |
| `apps/app/__tests__/emailLinkSignInLib.test.ts` (novo) | `localStorage` que lança em toda chamada; `emailLinkFailureOf` para cada código |
| `apps/app/__tests__/signInEmailLinkEntry.test.tsx` (novo) | link no login só com `enabled: true`; ausente com `false`, com erro e carregando |
| `apps/app/__tests__/emailLinkRequestForm.test.tsx` (novo) | cartão "indisponível" com `false` e com GET falhando; e-mail inválido não chama a API; sucesso guarda o e-mail aparado e mostra "enviado"; `AUTH_EMAIL_LINK_DISABLED` vira alerta traduzido; rajada de submits manda um pedido só |
| `apps/app/__tests__/emailLinkCompletion.test.tsx` (novo) | roteamento da página; conclusão uma vez sob `StrictMode`; e-mail esquecido após sucesso; sem e-mail guardado nada vai ao Firebase; `mismatch` mantém o formulário e permite nova tentativa (também quando o e-mail guardado é o errado); cartões `expired`/`invalid` com "Pedir outro link"; código ausente; `auth/user-disabled`, `auth/operation-not-allowed`, `auth/too-many-requests` com o texto traduzido; rajada de confirmações manda uma tentativa |
| `apps/app/__tests__/proxy.test.ts` (2 casos novos) | anônimo abre `/pt-br/sign-in/email-link?oobCode=…`; quem tem sessão vai para `/pt-br` |

## Contrato e raio de impacto

- SDK: só acréscimos em `AuthActions`. Consumidores: `useEmailLinkSignIn.ts` (app). Nada existente mudou de forma.
- `@repo/auth`: `AuthContextType` ganhou `signInWithEmailLink`; `client.ts` exporta `signInWithEmailLinkCode`. O
  provider lê esse export no render, então todo teste que mocka `@repo/auth/client` com lista fechada e monta o
  `AuthProvider` precisa dele. Dois testes da app foram ajustados por isso (ver Desvios). `apps/web` não monta o
  `AuthProvider` da app e passou no typecheck e nos testes.
- `buildAuthActionLink`: os três kinds antigos continuam com o mesmo gerador; o `getUserByEmail` agora guarda o
  `UserRecord`, usado só pelo kind `sign-in`.

## Códigos de erro

- Novo: `AUTH_EMAIL_LINK_DISABLED` (404), em `apiErrors` nos três idiomas
  (`translations/packages/shared/utils.ts`). Paridade medida com `pnpm --filter @repo/internationalization test`
  → 67 testes passando.
- Reusados: `EMAIL_NOT_CONFIGURED`, `VALIDATION_FAILED`, `AUTH_RATE_LIMITED`, `AUTH_FORBIDDEN_ORIGIN`.

## Desvios do plano

1. **GET de disponibilidade com `export const dynamic = "force-dynamic"`.** O blueprint previa `export function
   GET()` sem configuração. Um GET sem argumento é pré-renderizado no build do Next 16, e a resposta ficaria
   congelada com a env da máquina de build: um fork que liga a flag depois do deploy continuaria vendo `false`.
   A rota `health/route.ts` documenta o mesmo problema e usa a mesma linha. O teste da rota confere o export;
   a prova de que o build lista a rota como dinâmica fica para o `/test`.
2. **`?oobCode=` vazio ou repetido mostra o cartão de link inválido**, e só a ausência do parâmetro mostra o
   formulário de pedido. O §5.1 dizia "sem `oobCode` → pedido", e o critério "Link usado ou expirado" pede que
   um `oobCode` vazio caia no cartão inválido. Segui o critério.
3. **Trava de envio por `useRef`** no formulário de pedido e na confirmação do e-mail, além do botão
   desabilitado. Dois submits no mesmo tick passam pela validação antes de o `isPending` chegar ao botão. Medido
   no formulário de pedido: com a trava removida, o caso "sends a single request for a burst of submits" falhou;
   restaurada, passa. Na confirmação do e-mail o mesmo caso passa com a trava, mas não foi feita a remoção.
4. **Dois testes existentes ajustados** (`authProviderLanguageSwitch.test.tsx`, `sessionExpiredSignOut.test.tsx`):
   o mock fechado de `@repo/auth/client` ganhou `signInWithEmailLinkCode: vi.fn()`. Sem isso, 13 testes falhavam
   com `No "signInWithEmailLinkCode" export is defined on the mock`. Nenhuma asserção mudou.
5. **Formulário de pedido mostra `FullScreenLoader` enquanto a disponibilidade carrega**, e o cartão
   "indisponível" quando a consulta falha. O plano não definia o estado de carregamento.
6. **Testes de proxy da app** (`proxy.test.ts`) acrescentados, fora da tabela do plano, para fixar a D5.

Nenhuma decisão consolidada foi reaberta. Nenhuma dependência nova.

## Validação (comandos desta rodada)

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | `Checked 989 files … No fixes applied`, sem erro |
| Typecheck | `pnpm turbo run typecheck --filter=app --filter=api --filter=@repo/auth --filter=@repo/sdk --filter=@repo/internationalization --filter=web` | 6/6 tasks ok |
| Testes | `pnpm turbo run test` com os mesmos filtros | app 1042 (121 arquivos) · api 1500 (114) · web 207 · `@repo/auth` 136 · `@repo/sdk` 11 · `@repo/internationalization` 67, todos passando |
| `test:emulator` | não rodado | nada desta feature roda contra emulador (D11) |

Smoke local da API (porta 3002 estava livre; subi `next dev`, medi com `curl` e derrubei os processos que subi;
`lsof -ti tcp:3002` vazio no fim):

| Ambiente | `GET /auth/sign-in/email-link` | `POST /auth/sign-in/email-link/request` |
|----------|--------------------------------|------------------------------------------|
| `.env` da máquina, sem a flag | `200 {"data":{"enabled":false}}` | corpo `not json` → `404 {"error":{"code":"AUTH_EMAIL_LINK_DISABLED"}}` |
| `EMAIL_LINK_SIGN_IN_ENABLED=" TRUE "`, `RESEND_TOKEN=""`, `RESEND_FROM=""` | `200 {"data":{"enabled":false}}` | e-mail válido → `503 {"error":{"code":"EMAIL_NOT_CONFIGURED"}}` |
| flag `"true"`, Resend placeholder, `NEXT_PUBLIC_APP_URL` local | `200 {"data":{"enabled":true}}` | `{"email":"nope"}` → `400 {"error":{"code":"VALIDATION_FAILED"}}` |

Não mandei um POST válido com o recurso ligado: ele dispararia a geração do link contra o Firebase configurado
no `.env` local. A app não foi aberta no navegador.

## A verificar no `/test`

- **Fluxo ponta a ponta contra o emulador** (§8 do plano, passos 2 a 11): pedir com `user@example.com`, ler o
  código em `GET http://127.0.0.1:9099/emulator/v1/projects/demo-next-boilerplate/oobCodes`
  (`requestType: "EMAIL_SIGNIN"`), abrir `/<locale>/sign-in/email-link?oobCode=<código>` e entrar. Nada disso foi
  executado aqui; a montagem da URL com `mode`/`apiKey` só foi provada com o SDK mockado.
- **Cookie, último acesso e onboarding** depois do link: conferir `access-token` emitido, `lastAccessAt` carimbado
  e conta com onboarding pendente caindo no onboarding. Vem do `onAuthSuccess` do provider, sem código novo.
- **Admin pelo link cai em `/admin`**.
- **Sessão não gravada depois do link**: se `syncSessionCookie` falhar no `onAuthSuccess`, o provider mostra o
  alerta de erro e a página continua no loader "Entrando…" sem saída. Repro: bloquear `POST /api/auth/session`
  no devtools e concluir um link. É o mesmo comportamento do provider no login por senha, mas aqui não há
  formulário por baixo.
- **Build marca a rota de disponibilidade como dinâmica**: `pnpm --filter api build` e conferir
  `/auth/sign-in/email-link` como `ƒ` (dinâmica), não `○`.
- **Leitor de link**: `curl` no link do e-mail não gasta o código (a página só conclui no cliente, com e-mail
  guardado).
- **Contas só Google e não verificadas**: nenhum código novo no emulador e `providerData` inalterado depois do
  pedido.
- **Tema, responsivo e 3 idiomas** das telas novas (pedido, enviado, indisponível, confirmação, cartões de erro) e
  do link no login. Nenhuma tela foi vista.

## Lacunas de teste conhecidas

- Nenhum teste monta o `AuthProvider` real com `signInWithEmailLink` para provar que o sucesso passa pelo
  `onAuthSuccess`; a ligação é de uma linha (`onSuccess: onAuthSuccess`) e fica para o percurso do `/test`.
- O comportamento real do SDK do Firebase com a URL montada (aceitar `apiKey` de qualquer valor) vem da medição
  do `/analyze`, não de teste automatizado.
- O texto em inglês para `auth/user-disabled` no dicionário existente é "User disabled.", não "This account has
  been disabled.". Não mudei por estar fora da tarefa; o critério cita "e os equivalentes em en/es".

## Decisões em aberto

Nenhuma nova. As perguntas Q1 a Q5 do plano continuam como estavam, com a opção adotada implementada.

## Processos e dados

- Processos: nenhum deixado de pé. Portas 3000, 3002, 9099 e 8080 estavam livres antes e ficaram livres depois.
- Contas e dados de QA: nenhum criado.
