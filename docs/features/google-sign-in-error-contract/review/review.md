# Revisão: contrato de erro de `POST /auth/sign-in/google`

Rodada autônoma do `/cycle`, passo 4. A revisão leu o diff, o `develop/handoff.md` e as seções 4, 10 a 13 do
`analyze/plan.md`, e rodou só os gates estáticos. Não subiu app, emulador nem browser, e não rodou a suíte.

## Branch

- Nome: `api/fix/google-sign-in-error-contract`.
- Origem: proposto, não aplicado. A revisão chegou a renomear a branch `guilhermebittelbrunn/cycle-command-v5`
  com `git branch -m`, e o orquestrador do `/cycle` desfez a renomeação, porque a rodada autônoma não cria nem
  renomeia branch sem aprovação do usuário. A branch atual não tem upstream nem commit à frente de
  `origin/main` (HEAD e `origin/main` em `4b0be90`), então a renomeação é o caminho quando o usuário aprovar.
- Regex do `/review` (o mesmo de `.claude/commands/review.md:115`): `branch OK:
  api/fix/google-sign-in-error-contract`.
- Por que `api/` e não `fix/<slug>`: o código da PR toca só `apps/api`. Os commits `docs(specs)` e
  `docs(features)` vão junto em toda PR deste fluxo e não mudam o projeto da branch. O E11 do
  `specs/BACKLOG.md` (linha 475) registra que só as PRs de um pacote só (#36, #40, #42) seguiram o padrão com
  `<project>`, e a forma sem prefixo fica para diff que cruza apps.

## Revisão: `apps/api` (schema, rota e teste novo)

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `apps/api/(shared)/validation/auth.schema.ts:43`: `z.url()` aceitava qualquer esquema que o parser WHATWG
  entende. Medido com `node` em `apps/api` (Zod 4.1.12): `javascript:alert(1)`, `ftp://x.com` e
  `localhost:3000` passavam. O último é o erro provável de quem chama a API direto (esqueceu o `http://`): o
  valor passava pela borda, o Identity Toolkit recusava e a rota respondia `AUTH_INVALID_CREDENTIALS`, um erro
  de entrada disfarçado de credencial, que é o tipo de resposta que esta tarefa existe para eliminar.
  Corrigido: `z.url({ protocol: HTTP_PROTOCOL })` com `HTTP_PROTOCOL = /^https?$/` (`:15`). Remedido depois da
  troca: `https://app.example.com`, `http://localhost`, `http://localhost:3000` e `http://127.0.0.1:3000`
  passam e voltam iguais; `javascript:alert(1)`, `ftp://x.com`, `localhost:3000`, `data:text/html,x` e
  `not a url` falham. O teste novo não cobre os três esquemas recusados; a lacuna vai para o `/test` (abaixo).
  Não há `z.httpUrl()` aqui porque o regex de domínio dele recusa `localhost`, que a app manda
  (`apps/app/shared/lib/googleSignInApi.ts:50-53`).

### 🟢 Sugestão / nit

- `specs/BACKLOG.md:1464` (chave de API ausente respondida como credencial) passa a valer também para esta
  rota, e o achado `:1496` fecha com o merge. O plano (§13) sugeria ampliar o `:1464` nesta etapa. Não editei:
  o `docs(specs)` desta branch é a auditoria pós-PR #50, e a mudança só é verdade depois do merge. Fica para o
  `/spec --sync`, que reconcilia as duas linhas e as âncoras de `specs/social-sign-in-providers.md:47` juntas.
- `AUTH_INVALID_CREDENTIALS` mostra "E-mail ou senha incorretos." num fluxo do Google. É a P1 do plano, adotada
  com o custo declarado; pela tela o caminho quase não é alcançável (o popup recusa conta desativada antes).
  Sem ação.

### ✅ OK

- A rota (`google/route.ts:16-63`) é cópia estrutural de `auth/sign-in/route.ts`: `parseRequestJson` (`:17`),
  `parseGoogleSignIn` (`:22`), `try` só em volta do provedor, `instanceof IdentityToolkitError` antes de mapear
  (`:34`), `mapPasswordCheckMessageToCode` com fallback `AUTH_INVALID_CREDENTIALS` (`:37`) e status por
  `statusForAuthErrorCode`. Erro que não é do provedor propaga, como no `/auth/sign-in`.
- A resposta não ecoa `error.message`; a mensagem de `getWebApiKey` com o nome da env deixa de vazar.
- `export async function POST` sem guard: a rota é anterior à sessão, como `/auth/sign-in`. O rate limit
  segue em `apps/api/proxy.ts:56`.
- Magic numbers em constantes (`GOOGLE_ID_TOKEN_MAX`, `REQUEST_URI_MAX`, `HTTP_PROTOCOL`), como pede o Biome.
- Códigos usados (`VALIDATION_FAILED`, `AUTH_INVALID_CREDENTIALS`, `USERS_AUTH_RATE_LIMITED`,
  `USERS_NOT_FOUND`) já existem em `apiErrors` nos 3 idiomas
  (`translations/packages/shared/utils.ts:10`, `:95`, `:101` e equivalentes en/es). Sem código novo.
- Sem comentário no código novo; nenhuma referência ao fluxo.
- Teste novo no nível certo: handler de rota com `vi.hoisted` + `vi.mock` do Identity Toolkit e do
  `user-merge`, imports explícitos de `vitest`, e-mail `qa-google-sign-in-error-contract@example.com`.
  `googleSignInProfile.test.ts` continua compatível: manda `{ idToken }` sem `requestUri`, que o schema aceita.
- A skill `/code-review` (nível baixo, escopo `apps/api`) não devolveu achado.

### 👁 Verificar no `/test`

- "21 testes, 14 caem com a rota de `4b0be90`" e "api 104 arquivos / 1341 testes". Números do `/develop`, que
  esta etapa não remediu. Repro: `pnpm --filter api test` e `pnpm test` da raiz (CA10); para a prova de que o
  teste pega o defeito, trocar a rota por `git show 4b0be90:"apps/api/app/(routes)/auth/sign-in/google/route.ts"`
  e rodar `pnpm --filter api exec vitest run __tests__/authSignInGoogleRoute.test.ts` (esperado 14 falhas).
- A troca de `z.url()` por `z.url({ protocol: HTTP_PROTOCOL })` é desta etapa e nenhum teste a cobre. Repro:
  acrescentar ao `it.each` de corpo (`authSignInGoogleRoute.test.ts:74-107`) as linhas `javascript:alert(1)`,
  `ftp://x.com` e `localhost:3000`, esperando 400 `VALIDATION_FAILED` sem chamar o provedor, e confirmar que o
  `it.each` de `:119` (`https://app.example.com`, `http://localhost`) segue verde.
- "Conta desativada no emulador responde 400 `AUTH_INVALID_CREDENTIALS` sem `USER_DISABLED` no corpo". O teste
  injeta a mensagem pelo `IdentityToolkitError` falso; o formato real só foi medido na PR #50. Repro opcional:
  API e emulador de pé, `curl -i -X POST http://localhost:3002/auth/sign-in/google -H 'content-type:
  application/json'` sem corpo (esperado 400 `VALIDATION_FAILED`) e com o ID token de uma conta desativada no
  emulador (esperado 400 `AUTH_INVALID_CREDENTIALS`).
- "Sem `FIREBASE_WEB_API_KEY` fora do emulador a rota responde 400, não 500". Coberto só pela mensagem
  injetada no mock; `getWebApiKey` real lança `IdentityToolkitError`
  (`firebase-identity-toolkit.ts:47-49`), o que confirma o caminho por leitura, mas o efeito na resposta não
  foi medido com a env ausente. Sem repro obrigatório; registrar como 🔒 se não medir.

## Raio de impacto

- Contrato HTTP de `POST /auth/sign-in/google`: recusa do provedor passa de `401 { error: "<mensagem>" }` para
  `400 { error: { code: "AUTH_INVALID_CREDENTIALS" } }` ou `429 { error: { code: "USERS_AUTH_RATE_LIMITED" } }`;
  corpo vazio, JSON inválido ou campo fora do schema passam de 500 para 400 `VALIDATION_FAILED`; `requestUri`
  que não seja `http`/`https` passa a 400.
- Consumidor no repo: `apps/app/shared/lib/googleSignInApi.ts:55` via `apiClient.authApi.signInWithGoogle`
  (`packages/sdk/src/actions/auth/action.ts:104-108`). Erro vira exceção do axios; `SignInForm.tsx:44-47` e
  `SignUpFormClient.tsx:47` passam por `FormattedError`, que lê `error.code` em `apiErrors`
  (`packages/shared/utils/helpers/formattedError.ts`, `apiResponseMessage`). O toast passa de
  `"401 - Unauthorized"` para o texto traduzido. `requestUri` da app é `window.location.origin` ou
  `http://localhost`, os dois aceitos pelo schema novo.
- `GoogleSignInRequest` do SDK exige `requestUri: string`; o schema o mantém opcional (P3). Nenhuma mudança de
  tipo.
- `apps/web` e `packages/auth` usam o popup do Firebase direto (`packages/auth/client.ts:152`) e não chamam
  esta rota. Sem efeito.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `apps/api/(shared)/validation/auth.schema.ts:15`, `:42-45` | `requestUri` aceita só `http`/`https`: constante `HTTP_PROTOCOL` e `z.url({ protocol: HTTP_PROTOCOL })` |

Antes: `requestUri: z.url().max(REQUEST_URI_MAX).optional()`.
Depois: `requestUri: z.url({ protocol: HTTP_PROTOCOL }).max(REQUEST_URI_MAX).optional()` (quebrado em linhas
pelo Biome).

## Lacunas de teste

| lacuna | veredito |
|--------|----------|
| Nenhum teste contra o Identity Toolkit real (handoff) | continua aberta; o repro com o emulador está em "Verificar no `/test`", opcional |
| `getWebApiKey` real com a env ausente (handoff) | continua aberta; caminho confirmado por leitura, efeito não medido |
| `requestUri` com esquema fora de `http`/`https` | nova, aberta por esta revisão; repro acima |

## Decisões em aberto

Nenhuma que bloqueie. Registradas para o relatório do `/cycle`:

1. Restringir `requestUri` a `http`/`https`. Adotada. Alternativa descartada: manter `z.url()` livre, como o
   plano pedia ("URL válida"). A restrição não quebra consumidor do repo e mantém erro de entrada como
   `VALIDATION_FAILED`.
2. Nome de branch proposto: `api/fix/google-sign-in-error-contract` (a renomeação espera aprovação). Alternativa descartada: `fix/<slug>` sem
   projeto, que o padrão reserva a diff com vários apps.
3. Ampliação do achado `specs/BACKLOG.md:1464` deixada para o `/spec --sync` pós-merge.

## Gates estáticos

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | `Checked 935 files`, `No fixes applied`, exit 0 (depois da correção) |
| typecheck | `pnpm --filter api typecheck` | exit 0 (depois da correção) |
| paridade i18n | não rodou | nenhum arquivo de `packages/internationalization` no diff |
| testes | não rodou | é do `/test`; o handoff mediu 104 arquivos / 1341 testes antes da correção |

## Working tree classificado

| assunto | arquivos |
|---------|----------|
| auditoria do backlog (passo 1 do `/cycle`) | `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`, `specs/social-sign-in-providers.md` |
| código da feature | `apps/api/(shared)/validation/auth.schema.ts`, `apps/api/app/(routes)/auth/sign-in/google/route.ts`, `apps/api/__tests__/authSignInGoogleRoute.test.ts` |
| artefatos da feature | `docs/features/google-sign-in-error-contract/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`) |

Nada mais no working tree. `git diff --cached --stat` saiu vazio. Varredura de segredo em
`docs/features/google-sign-in-error-contract/` e nas linhas acrescentadas em `specs/`: nenhuma senha, token
ou chave; os e-mails citados são todos `@example.com`.

## Plano de commits

O plano abaixo foi substituído pelo plano unificado da PR das três tarefas, em `docs/features/request-body-size-limit/review/review.md`, com a branch proposta `api/fix/google-sign-in-unlink-restore-body-cap`.


1. `docs(specs): audit the backlog after PR #50`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
   - `specs/social-sign-in-providers.md`
2. `fix(api): validate the Google sign-in body and answer provider refusals by code`
   - `apps/api/(shared)/validation/auth.schema.ts`
   - `apps/api/app/(routes)/auth/sign-in/google/route.ts`
   - `apps/api/__tests__/authSignInGoogleRoute.test.ts`

   Corpo sugerido:

   ```
   POST /auth/sign-in/google now parses the body with parseRequestJson and a
   Zod schema (idToken up to 4096 chars, optional http/https requestUri up to
   2048), answering 400 VALIDATION_FAILED instead of a 500 or a provider call
   with undefined.

   Identity Toolkit refusals no longer echo the provider message in a 401.
   They map through mapPasswordCheckMessageToCode like /auth/sign-in:
   400 AUTH_INVALID_CREDENTIALS, or 429 USERS_AUTH_RATE_LIMITED for
   TOO_MANY_ATTEMPTS / TOO_MANY_REQUESTS. Direct callers that relied on the
   401 or on the raw string need to read error.code.
   ```
3. `docs(features): google-sign-in-error-contract`
   - `docs/features/google-sign-in-error-contract/STATE.md`
   - `docs/features/google-sign-in-error-contract/analyze/plan.md`
   - `docs/features/google-sign-in-error-contract/develop/handoff.md`
   - `docs/features/google-sign-in-error-contract/review/review.md`

Título de PR sugerido: `fix(api): answer Google sign-in errors by code`. Push só depois do último commit
aprovado, com `git push -u origin api/fix/google-sign-in-error-contract`, se o usuário disser sim.

### Commits realizados

(preenchido pelo `/review` depois de commitar)
