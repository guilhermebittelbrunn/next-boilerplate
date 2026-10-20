# Relatório de QA: contrato de erro de `POST /auth/sign-in/google`

Rodada autônoma do `/cycle`, passo 5, em 2026-10-19. Branch `guilhermebittelbrunn/cycle-command-v5` (não é
protegida; o nome proposto pelo `/review` é `api/fix/google-sign-in-error-contract` e a renomeação espera o
usuário). O diff de produção é só `apps/api`: `auth.schema.ts` e `auth/sign-in/google/route.ts`.

Legenda: ✅ verificado e correto · ❌ falha · 🔒 não verificável sem infra externa.

## Resultado

Nenhum defeito de produção. Os 10 critérios terminam ✅. Dois arquivos de teste no working tree: o do
`/develop` ganhou 4 casos e há um arquivo novo com 3 casos que exercitam o Identity Toolkit real. A suíte da
api foi de 104 arquivos / 1341 testes para 105 / 1348, e o `pnpm test` da raiz saiu com exit 0.

## Verificar no `/test` (lista do `review/review.md`)

| item | veredito | o que foi medido |
|------|----------|------------------|
| 1. "21 testes, 14 caem com a rota de `4b0be90`" e "api 104 / 1341" | confirmado | Com a rota trocada por `git show 4b0be90:"apps/api/app/(routes)/auth/sign-in/google/route.ts"`, o arquivo do `/develop` deu `Tests 14 failed \| 7 passed (21)`. Caíram as 8 linhas de corpo, a conta desativada, as 3 recusas e os 2 limites; passaram o default de `requestUri`, os 2 `requestUri` repassados, a chave a mais, o erro que propaga, o 404 e o 200. A rota voltou com o mesmo `shasum` de antes (`5f37a86b…`). Os 104 / 1341 batem com a suíte antes dos meus testes (104 + 1 arquivo e 1341 + 7 casos dão os 105 / 1348 medidos). |
| 2. restrição de protocolo do `requestUri` sem teste | fechado aqui | `javascript:alert(1)`, `ftp://x.com` e `localhost:3000` entraram no `it.each` de corpo: 400 `VALIDATION_FAILED` e provedor não chamado. `http://localhost:3000` entrou no `it.each` dos aceitos, ao lado de `https://app.example.com` e `http://localhost`, e chega ao provedor igual. Prova de mutação: com o schema voltado para `z.url()` sem `protocol`, os 3 casos novos falham (`3 failed \| 22 passed (25)`); com o schema restaurado (mesmo `shasum`, `d873edb7…`), passam. |
| 3. conta desativada → 400 `AUTH_INVALID_CREDENTIALS` sem `USER_DISABLED` | confirmado | Medido contra o emulador do Auth: conta Google criada por `accounts:signInWithIdp`, desativada por `accounts:update` com `disableUser: true`, e o mesmo `signInWithIdp` passou a responder `HTTP 400` com `{"error":{"code":400,"message":"USER_DISABLED","errors":[{"message":"USER_DISABLED","reason":"invalid","domain":"global"}]}}`. A rota real, com o toolkit real apontado para o emulador, respondeu `400 {"error":{"code":"AUTH_INVALID_CREDENTIALS"}}`. Esse corpo do emulador virou fixture de um teste de handler permanente (abaixo). |
| 4. `FIREBASE_WEB_API_KEY` ausente → 400, não 500, sem vazar o nome | confirmado | Teste de handler com o `firebase-identity-toolkit` real, env sem chave e sem host de emulador: 400 `{ error: { code: "AUTH_INVALID_CREDENTIALS" } }`, corpo sem `FIREBASE_WEB_API_KEY` e sem `NEXT_PUBLIC_FIREBASE_API_KEY`, e `fetch` não chamado. Com a rota de `4b0be90` o mesmo teste falha. |

## Critérios de aceite com status

| critério | status | meio |
|----------|--------|------|
| CA1. Corpo vazio ou JSON inválido → 400 `VALIDATION_FAILED` | ✅ | rota (mock): "sem corpo" e "com JSON inválido". Também medido uma vez com a rota e o toolkit reais: pedido sem corpo deu `400 {"error":{"code":"VALIDATION_FAILED"}}`. |
| CA2. Campos fora do schema → 400 `VALIDATION_FAILED` | ✅ | rota (mock): 11 linhas no `it.each` de corpo (8 do `/develop` mais `javascript:`, `ftp:` e sem esquema) e "ignora chaves fora do schema". |
| CA3. `requestUri` opcional | ✅ | rota (mock): default `http://localhost:3000` sem `requestUri`; `https://app.example.com`, `http://localhost` e `http://localhost:3000` repassados ao provedor. |
| CA4. Conta desativada → 400 sem a mensagem | ✅ | rota (mock, mensagem injetada), rota com toolkit real e `fetch` devolvendo o corpo medido no emulador, e a medição única contra o emulador. Nos três, `getMergedUserByUid` não é chamado e o corpo não traz `USER_DISABLED`. |
| CA5. Demais recusas → mesmo código, sem eco | ✅ | rota (mock): `INVALID_IDP_RESPONSE`, "Invalid response from identity provider" e a mensagem de chave ausente. Toolkit real: chave ausente (sem chamar `fetch`) e resposta 200 sem os campos de sessão. |
| CA6. Limite → 429 `USERS_AUTH_RATE_LIMITED` | ✅ | rota (mock): `TOO_MANY_ATTEMPTS_TRY_LATER` e `TOO_MANY_REQUESTS`. O rate limit do proxy não mudou (`apps/api/proxy.ts` fora do diff). |
| CA7. Erro que não é do provedor propaga | ✅ | rota (mock): `Error("network down")` rejeita a promessa com a mesma mensagem. |
| CA8. Sucesso e conta sem perfil inalterados | ✅ | rota (mock): 200 `{ session, user }` e 404 `USERS_NOT_FOUND`; `googleSignInProfile.test.ts` (4 casos) passa sem mudança. |
| CA9. App entra com Google e mostra texto traduzido | ✅ | leitura e suíte da app: `git diff --name-only -- apps/app apps/web packages` saiu vazio; `apps/app/__tests__/googleSignInApi.test.ts` passa, inclusive o caso em que a API recusa com `{ error: { code } }` e o popup é deslogado; `AUTH_INVALID_CREDENTIALS`, `USERS_AUTH_RATE_LIMITED` e `VALIDATION_FAILED` existem em `apiErrors` nos 3 idiomas (`translations/packages/shared/utils.ts:10`, `:157`, `:302` e vizinhas). O toast na tela não foi percorrido; ver "Browser". |
| CA10. Antes × depois provado | ✅ | 14 de 21 falham com a rota de `4b0be90`; 25 de 25 e 3 de 3 passam com a correção; `pnpm --filter api test` e `pnpm test` com exit 0. |

## Cobertura e comandos

| comando | resultado |
|---------|-----------|
| `pnpm --filter api exec vitest run __tests__/authSignInGoogleRoute.test.ts` com a rota de `4b0be90` | 21 testes, 14 falhas, 7 passando (esperado) |
| idem, com o schema sem `protocol` (mutação) | 25 testes, 3 falhas (os casos novos de protocolo) |
| `pnpm --filter api exec vitest run __tests__/authSignInGoogleToolkit.test.ts` com a rota de `4b0be90` | 3 testes, 3 falhas (esperado) |
| `pnpm --filter api exec vitest run` nos 4 arquivos do escopo (`authSignInGoogleRoute`, `authSignInGoogleToolkit`, `googleSignInProfile`, `authSignInRoute`) | 4 arquivos, 45 testes passando (25 + 3 + 4 + 13) |
| `pnpm --filter api test` | 105 arquivos, 1348 testes passando |
| `pnpm --filter api typecheck` | exit 0 |
| `pnpm check` | `Checked 936 files`, `No fixes applied`, exit 0. Antes, o Biome recusou a formatação de uma linha nova do teste; `biome format --write` nos dois arquivos de teste resolveu |
| `pnpm test` (raiz, sem `--force`, `JAVA_HOME` no openjdk@21) | exit 0, `Tasks: 15 successful, 15 total`, 13 do cache. `api:test` 105 / 1348; `api:test:emulator` 5 arquivos / 191; `app:test` 112 / 924; `web:test` 22 / 169; todos os pacotes verdes |
| paridade i18n | não rodou à parte porque nenhum arquivo de `packages/internationalization` está no diff. `@repo/internationalization:test` (7 / 67) passou dentro do `pnpm test` da raiz |

Antes de cada mutação guardei a cópia do arquivo de produção em `/tmp` e, depois de restaurar, conferi o
`shasum`. No fim, o `git status` lista só o que já estava no working tree, mais
`apps/api/__tests__/authSignInGoogleToolkit.test.ts`.

## Testes criados

- `apps/api/__tests__/authSignInGoogleRoute.test.ts` (do `/develop`, ampliado): 3 linhas no `it.each` de
  corpo (`javascript:alert(1)`, `ftp://x.com`, `localhost:3000`) e `http://localhost:3000` no `it.each` dos
  `requestUri` aceitos. Passou de 21 para 25 casos.
- `apps/api/__tests__/authSignInGoogleToolkit.test.ts` (novo, 3 casos): a rota com o
  `firebase-identity-toolkit` real, `fetch` e env stubados e `user-merge` mockado. Cobre a chave web ausente
  fora do emulador, a recusa de conta desativada com o corpo exato do emulador e a resposta 200 sem sessão.

## Decisões de custo de teste

- Rota `auth/sign-in/google` e schema: faixa barata. Os mocks do arquivo do `/develop` já provam o contrato
  de status e corpo; acrescentei só os casos que nenhum teste cobria.
- Itens 3 e 4: também faixa barata. O arquivo novo usa o módulo real do toolkit e stuba só o `fetch`, o que
  prova o caminho `getWebApiKey` → `IdentityToolkitError` → rota e o `parseIdpResponse` sem processo externo.
- Medição contra o emulador do Auth, feita uma vez e não persistida como teste: o objeto era um fato da infra
  (o formato da mensagem de conta desativada), e mock nenhum confirma isso. Subi só o emulador do Auth, sem
  api nem Firestore, chamei o `signInWithIdp` por `curl` e rodei a rota real contra ele num arquivo de teste
  temporário, que apaguei logo depois. O corpo medido virou fixture do teste barato. Não criei teste
  `.emulator` permanente porque, com o formato fixado na fixture, ele não provaria nada além do teste de
  handler.
- `googleSignInProfile.test.ts` e `authSignInRoute.test.ts`: nada novo, porque o contrato deles não mudou.
  Rodaram e passaram.

## Browser

Não abri. O diff não tem superfície de UI: só `apps/api` mudou, e o consumidor
(`apps/app/shared/lib/googleSignInApi.ts`) e o `FormattedError` estão fora do diff. O toast novo também é
quase inalcançável pela tela, porque o popup recusa a conta desativada antes de chamar a API. A política do
`/cycle` (§3.1 de `.claude/cycle-policy.md`) manda não subir app nesse caso. Não há screenshots e a pasta
`test/e2e/` não foi criada.

## Ambiente do e2e

- Subi `pnpm exec firebase emulators:start --only auth --project demo-next-boilerplate` com JDK 21
  (`JAVA_HOME=/opt/homebrew/opt/openjdk@21`). As portas 9099, 4400, 4500 e 4001 estavam livres antes.
- Derrubei pelo PID os dois processos que iniciei (o wrapper `pnpm` e o `firebase.js` filho) e conferi
  `lsof -ti tcp:<porta>` vazio em 9099, 4400, 4500 e 4001.
- O `pnpm test` da raiz sobe e derruba os próprios emuladores para o `test:emulator`. Depois dele, 8080,
  9099, 9199, 4400, 4500 e 4001 estavam livres.
- Não subi api, app nem web, e não reutilizei nada do usuário: nenhuma porta estava ocupada.

## Lacunas

| lacuna | origem | veredito |
|--------|--------|----------|
| Nenhum teste contra o Identity Toolkit real | handoff | fechada aqui: o formato de `USER_DISABLED` foi medido no emulador, a rota real respondeu 400 `AUTH_INVALID_CREDENTIALS` e o corpo ficou fixado no teste novo. O Identity Toolkit de produção (Google) continua sem medição; o emulador é a referência que o repo usa |
| `getWebApiKey` real com a env ausente | handoff | fechada aqui: teste com o módulo real |
| `requestUri` com esquema fora de `http`/`https` | review | fechada aqui: 3 casos e prova de mutação |
| Toast traduzido na tela (CA9) | handoff | fora de escopo: o diff não tem UI e o caminho é quase inalcançável pela tela. O contrato que a app lê está coberto por `googleSignInApi.test.ts` e pelas chaves de `apiErrors` |

## Estado de dev alterado

Nenhum dado em projeto Firebase real. No emulador do Auth (processo encerrado, dados em memória, sem export)
criei a conta Google `qa-google-sign-in@example.com` e a desativei. Ela sumiu com o processo e não há o que
limpar. Nenhuma conta nova para o `docs/PRE-PRODUCTION.md`.

Este arquivo não contém senha, token nem chave. Os valores de token e chave nos testes são literais fictícios
(`google-id-token`, `real-key`).
