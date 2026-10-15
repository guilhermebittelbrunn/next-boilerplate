# Revisão: contrato de erro de `/auth/me`, `/auth/sign-in` e do webhook de pagamentos

Escopo: `apps/api/**`, `packages/internationalization/translations/packages/shared/utils.ts`, `docs/PAYMENTS.md` e
`docs/SECURITY.md`. O working tree também traz a tarefa `web-docs-link-and-mobile-menu` (já revisada, ver o
`review/review.md` dela) e a auditoria do backlog em `specs/BACKLOG.md`. Esta revisão não editou nenhum dos dois; o
plano de commits abaixo junta os três assuntos.

Revisão feita em rodada autônoma do `/cycle`, por leitura de código e gates estáticos. Nada subiu, nenhum browser
abriu, a suíte não rodou.

## Branch

| item | valor |
|------|-------|
| Atual | `guilhermebittelbrunn/cycle-2-features-implement` |
| Regex sobre a atual | `BRANCH INVALIDA` (o prefixo não é projeto e falta o `type`) |
| Remoto / commits próprios | sem upstream; `git log origin/main..HEAD` vazio |
| Nome recomendado | `fix/web-docs-link-and-api-error-codes` (confirma a recomendação da primeira tarefa) |
| Regex sobre o recomendado | `branch OK` |
| Ação tomada | nenhuma. Por instrução do orquestrador a branch não foi renomeada; quem decide é o usuário |

O nome omite o `<project>` porque a branch leva duas tarefas em apps diferentes (`apps/web` e `apps/api`), a única
forma sem prefixo que a regra aceita. O `type` é `fix`: as duas tarefas corrigem defeito registrado na auditoria.
Como não há remoto nem commit, `git branch -m fix/web-docs-link-and-api-error-codes` resolve antes do primeiro
commit.

## Achados

| sev. | onde | problema | ação |
|------|------|----------|------|
| 🟡 | `docs/PRE-PRODUCTION.md:568` | O roteiro "Como verificar" do webhook mandava esperar `500` para `POST /webhooks/payments` sem assinatura. Com este diff a resposta é `400` (`webhooks/payments/route.ts:273-281`). Quem seguisse o roteiro depois do deploy acharia que a API está quebrada. | corrigido para `# 400` |
| 🟡 | `docs/SECURITY.md:19` | O comando citado como fonte da contagem, `grep -L "require(CommonPanel\|Admin\|Plan)Api"`, sem `-E` trata `(`, `\|` e `)` como literais e lista os 36 arquivos, não os 13 sem guard. Medido: 36. | corrigido para `grep -LE` |
| 🟢 | `develop/handoff.md`, "Achados novos" | O handoff diz que `docs/SECURITY.md:155` não cita `/auth/session` fora do rate limit. O documento cita, em `docs/SECURITY.md:159`, com o motivo (o servidor dos front-ends chama com o próprio IP). O achado não procede. | nenhuma |
| 🟢 | `specs/BACKLOG.md:300-301`, `:862` | A auditoria ainda afirma que um `400` encerra as reentregas da Stripe. A Stripe reentrega qualquer resposta fora de `2xx`; o código e o `docs/PAYMENTS.md` já dizem isso. | fora do escopo desta revisão; fica para o próximo `/spec --sync`, como o `STATE.md` registra |
| 🟢 | `apps/api/(shared)/lib/firebase-identity-toolkit.ts:47-49` | Sem `FIREBASE_WEB_API_KEY` fora do emulador, o `IdentityToolkitError` de configuração cai no fallback e o login responde `400 AUTH_INVALID_CREDENTIALS`. Antes o mesmo caso dava 500. É o comportamento das rotas de conta (`account/password/route.ts:40`), e o plano já o registrou como achado. | nenhuma; segue como achado para a auditoria |

Nenhum bloqueante.

### Conferido e conforme

- `/auth/me` responde `401 { error: { code: "AUTH_INVALID_TOKEN" } }` nos dois ramos (`auth/me/route.ts:7-11`,
  `:16`, `:22`). Status igual ao anterior.
- `/auth/sign-in` passa por `parseRequestJson` e `parseSignIn` antes do provedor
  (`auth/sign-in/route.ts:15-24`). `parseSignIn` usa `parseWith`, então senha curta no login é
  `VALIDATION_FAILED`, não `AUTH_PASSWORD_TOO_SHORT`. O schema reusa `existingPasswordSchema` (mínimo 6) e o
  mesmo e-mail do cadastro (`auth.schema.ts:32-35`).
- A recusa do provedor reusa `mapPasswordCheckMessageToCode` e `statusForAuthErrorCode`, o par de
  `account/password`. Erro que não é `IdentityToolkitError` é relançado. O 404 virou
  `{ error: { code: "USERS_NOT_FOUND" } }` com `HTTP_STATUS.NOT_FOUND`.
- Webhook: o `catch` da assinatura devolve `signatureRejected()` (400 `VALIDATION_FAILED`) e o do handler/dedupe
  devolve `handlerFailed()` (500 `PAYMENTS_WEBHOOK_HANDLER_FAILED`). O log `webhook-failed` e o
  `webhook-handler-failed` não mudaram. A docstring não promete o fim das reentregas.
- As quatro asserções de webhook que foram de 500 para 400 descrevem o defeito corrigido, e nenhuma ficou mais
  frouxa: todas passaram a conferir o corpo inteiro com `toEqual`, e três ganharam `markProcessed`/`wasProcessed`
  não chamado. Os dois testes de 500 do handler e do dedupe mantêm o status e ganharam a asserção do corpo. O caso
  novo do carimbo velho usa o SDK real da Stripe.
- Os dois códigos novos estão nos três blocos de `apiErrors`. Nenhum teste da `apps/api` lê o dicionário
  (`grep -rln apiErrors apps/api` só acha o `CLAUDE.md`), então a ordem `apps/api` antes de
  `packages/internationalization` não quebra nenhum commit intermediário.
- `export async function` nas duas rotas de auth segue o padrão das outras dez rotas de `/auth/*`. A regra do
  `export const X = guard(...)` vale para rota com guard. Não mexi.
- O diff da API não tem comentário citando o fluxo nem `console.log` (`git diff | grep`).
- O `/code-review` (esforço baixo, `apps/api`) não devolveu achado.

### Contagens do `docs/SECURITY.md` e do `docs/PAYMENTS.md`, remedidas

| afirmação | medida |
|-----------|--------|
| 36 arquivos de rota, 23 com guard, 13 sem | `find ... -name route.ts` = 36; `grep -lE` = 23; `grep -LE` = 13 |
| `account/*` ×10, `entities` ×3, `files`, `users` ×4, `audit-events`, `payments/*` ×4 | lista do `grep -lE` bate (10+3+1+4+1+4 = 23) |
| `/auth/*` com 10 rotas, incluindo `session` | lista do `grep -LE` bate |
| `requirePlanApi` em `plan.ts:21`, só no `POST /entities` | `plan.ts:21`; único uso em `entities/route.ts:57` |
| `resolveApiActor` em `auth/me/route.ts:13`; `resolveApiCredential` em `auth/session/route.ts:13` | bate |
| `/auth/sign-in` sem consumidor nas front-ends | `packages/auth/client.ts:142` usa o SDK do Firebase direto; nenhum `auth/sign-in` sem `/google` em `packages/sdk`, `apps/app`, `apps/web` ou `apps/e2e` |
| tolerância de 300 s do SDK da Stripe | `DEFAULT_TOLERANCE: 300` nas duas versões instaladas (17.7.0 e 19.1.0) |

## Raio de impacto

Nenhum DTO, action do SDK nem chave de UI mudou. Remedido por leitura, sem confiar no §3 do plano:

- `AuthActions.me()` (`packages/sdk/src/actions/auth/action.ts:79-86`) lê só `data.data`.
- `getAppSessionUser` (`apps/app/lib/server/authSession.ts:22-30`) e `applyAccountPreferences`
  (`apps/app/shared/lib/postLoginNavigation.ts:69-75`) capturam qualquer erro sem olhar o corpo.
- `BaseClient.setInterceptorError` (`packages/sdk/src/client/base.ts:81-91`) dispara em 401 sem ler o corpo e não
  tem chamador no repo.
- `isSessionRevokedError` (`packages/sdk/src/client/sessionAuthority.ts:10-20`) só olha `/auth/session`, que não
  mudou.
- `FormattedError` lê `error.code` primeiro; o `/auth/me` passa a ser traduzido por `apiErrors`.
- Nenhum consumidor do repo lê `message` nas três rotas (`grep` pelas strings antigas: só copy de UI sem relação).
- Fora do repo: cliente externo do `/auth/sign-in` que lia `{ error: "User not found" }` ou recebia 500 em senha
  errada, e alarme da Stripe que só olha `5xx`. Os dois estão nos riscos do plano e cabem na descrição da PR.

## Verificar no `/test`

Reavaliei os três itens do handoff. Dois fecham por leitura; um continua, e é o de maior risco.

1. **Continua aberto (prioridade).** Respostas reais contra a API em build. A leitura confirma status e corpo, mas
   não o que o Next acrescenta (o `x-request-id` do proxy, o corpo vazio do 500 relançado). Repro:
   `pnpm --filter api build && pnpm --filter api start` na 3002 e `curl -i` em
   - `GET /auth/me` sem credencial e com `Authorization: Bearer lixo` → 401 `AUTH_INVALID_TOKEN`;
   - `POST /auth/sign-in` sem corpo, com `{}` e com `qa-api-error-codes@example.com` e senha errada contra o
     emulador do Auth → 400 `VALIDATION_FAILED`, 400 `VALIDATION_FAILED`, 400 `AUTH_INVALID_CREDENTIALS`;
   - `POST /webhooks/payments` sem as chaves → 503 `PAYMENTS_NOT_CONFIGURED`; com
     `STRIPE_SECRET_KEY=sk_test_<qualquer>` e `STRIPE_WEBHOOK_SECRET=whsec_<qualquer>`, sem header e com
     `stripe-signature: t=1,v1=00` → 400 `VALIDATION_FAILED`.

   Em todas: `x-request-id` presente, sem `message`, sem stack. O mesmo `curl` sem assinatura confere o
   `docs/PRE-PRODUCTION.md:568` corrigido aqui.
2. **Fechado por leitura.** O 429 do proxy vem antes da rota: `apps/api/proxy.ts:177-178` casa todo caminho e
   `:146-147` chama `checkRateLimit` para `/auth/sign-in`, que está em `RATE_LIMITED_PATHS` (`:45-58`). O diff não
   toca o proxy. Medir exigiria uma `ARCJET_KEY` válida.
3. **Fechado por leitura, opcional.** O login da `apps/app` não depende do corpo do 401:
   `authSession.ts:22-30` devolve `null` em qualquer erro e o status segue 401. Se o `/test` já for abrir o
   browser para a tarefa da web, um login e um logout em `/pt-br` custam pouco e cobrem o critério 2 do plano.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Nenhum teste prova que `FormattedError` traduz `AUTH_INVALID_TOKEN` vindo do `/auth/me` | continua aberta, sem prioridade: o caminho é o de qualquer código e tem cobertura no pacote `shared` |
| `IdentityToolkitError` de chave ausente cai em `AUTH_INVALID_CREDENTIALS` sem teste | fora de escopo; achado para a auditoria (ver tabela de achados) |

Nenhuma lacuna nova. As correções desta revisão são de documentação e não pedem teste.

## Decisões em aberto

1. Nome da branch: renomear a atual para `fix/web-docs-link-and-api-error-codes` (`git branch -m`) antes do
   primeiro commit. Recomendado, porque não há remoto nem commit. Decisão do usuário.

As oito decisões do plano ficam como estão; nada aqui as reabre.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| typecheck | `pnpm --filter api typecheck` | exit 0 |
| lint/format | `pnpm check` | 889 arquivos, sem erro |
| paridade i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, todos passando |

A suíte da API não rodou aqui. O número dela é o do handoff (1222/1222) e as correções desta revisão não tocaram
código.

Varredura de segredo em `docs/features/api-auth-webhook-error-codes/`: nenhuma senha, token ou chave; o único
e-mail é `qa-api-error-codes@example.com`.

## Plano de commits (combinado: as duas tarefas e a auditoria)

O índice estava vazio no início da revisão (`git diff --cached --stat`). Ordem: `apps/api` → `apps/web` →
`packages/internationalization` → `docs` → `docs(specs)` → `docs(features)`. Os commits da `apps/api` emitem
códigos que só ganham texto no commit 7; nenhum teste da API lê o dicionário, então cada commit passa sozinho.

1. `fix(api): answer /auth/me failures with AUTH_INVALID_TOKEN`
   - `apps/api/app/(routes)/auth/me/route.ts`
   - `apps/api/__tests__/authMeRoute.test.ts`
2. `fix(api): validate /auth/sign-in and map its failures to error codes`
   - `apps/api/(shared)/validation/auth.schema.ts`
   - `apps/api/app/(routes)/auth/sign-in/route.ts`
   - `apps/api/__tests__/authSignInRoute.test.ts`
3. `fix(api): reject unsigned payment webhooks with 400`
   - `apps/api/app/(routes)/webhooks/payments/route.ts`
   - `apps/api/__tests__/paymentsWebhookRoute.test.ts`
4. `fix(web): read NEXT_PUBLIC_DOCS_URL into the typed env`
   - `apps/web/env.ts`
   - `apps/web/__tests__/docsUrlEnv.test.tsx`
5. `test(web): add jsdom and testing-library for interaction tests`
   - `apps/web/package.json`
   - `pnpm-lock.yaml`
   - `apps/web/CLAUDE.md`
6. `fix(web): fit the docs link in the header and close the mobile menu on navigation`
   - `apps/web/app/[locale]/components/header/index.tsx`
   - `apps/web/__tests__/headerMobileMenu.test.tsx`
7. `feat(internationalization): add sign-in and webhook error codes`
   - `packages/internationalization/translations/packages/shared/utils.ts`
8. `docs: describe auth and webhook error responses`
   - `docs/PAYMENTS.md`
   - `docs/SECURITY.md`
   - `docs/PRE-PRODUCTION.md`
9. `docs: NEXT_PUBLIC_DOCS_URL is read by the web only`
   - `docs/SETUP.md`
10. `docs(specs): audit the backlog after PR #45`
    - `specs/BACKLOG.md`
11. `docs(features): web-docs-link-and-mobile-menu`
    - `docs/features/web-docs-link-and-mobile-menu/`
12. `docs(features): api-auth-webhook-error-codes`
    - `docs/features/api-auth-webhook-error-codes/`

Os commits 4 a 6, 9 e 11 seguem o plano do `review/review.md` da outra tarefa, sem mudança. O 5 vem antes do 6
porque o teste do header importa `@testing-library/react`; o `pnpm-lock.yaml` só muda no importer da `apps/web`. O
`docs/PRE-PRODUCTION.md` entrou no commit 8 por causa da correção desta revisão.

Título de PR sugerido: `fix: web docs link, mobile menu and api error codes`.

Commits realizados: _(preenchido pelo orquestrador)_
