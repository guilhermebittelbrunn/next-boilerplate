# Critérios de Aceite (Checklist)

Contrato de erro de `POST /auth/sign-in/google`. A rota não tem guard porque roda antes da sessão, então os
eixos comum × admin × personificação e `subscription` × `simple` não se aplicam. Também não há ownership: a
rota não recebe id de recurso. O status medido de cada item está em `test/report.md`.

- [ ] **CA1. Corpo vazio ou JSON inválido responde 400 `VALIDATION_FAILED`**
  `POST /auth/sign-in/google` sem corpo, ou com um corpo que não é JSON (por exemplo `{idToken:`), responde 400
  com `{ error: { code: "VALIDATION_FAILED" } }` e não chama o Identity Toolkit. Antes da correção o mesmo
  pedido terminava em 500, porque o `req.json()` ficava fora do `try`. Reenviar o mesmo pedido inválido várias
  vezes devolve sempre a mesma resposta, sem efeito colateral.

- [ ] **CA2. Campos fora do schema respondem 400 `VALIDATION_FAILED`**
  `{}`, `idToken` vazio, `idToken` que não é string, `idToken` com mais de 4096 caracteres e `requestUri`
  presente que não é URL ou que passa de 2048 caracteres respondem 400 `VALIDATION_FAILED`, sem chamar o
  provedor. O `requestUri` aceita só `http` e `https`: `javascript:alert(1)`, `ftp://x.com` e `localhost:3000`
  (sem esquema) também respondem 400 `VALIDATION_FAILED`. Chaves a mais no objeto são ignoradas, como no
  `/auth/sign-in`.

- [ ] **CA3. `requestUri` continua opcional**
  Um corpo só com `idToken` válido chega ao provedor com `requestUri` igual a `http://localhost:3000`, o
  default da rota. Com `requestUri` válido, o provedor recebe o valor enviado. Os formatos que a app manda
  (`window.location.origin`, como `https://app.example.com` ou `http://localhost:3000`, e `http://localhost`)
  são aceitos.

- [ ] **CA4. Conta desativada responde 400 `AUTH_INVALID_CREDENTIALS`, sem a mensagem do provedor**
  Quando o Identity Toolkit recusa com `USER_DISABLED`, a rota responde 400 com
  `{ error: { code: "AUTH_INVALID_CREDENTIALS" } }`. O corpo não contém a string `USER_DISABLED`, não traz
  `session`, e o `getMergedUserByUid` não é chamado. Antes da correção a resposta era 401 com
  `{ "error": "USER_DISABLED" }`. Vale com a mensagem no formato que o emulador do Auth devolve de fato
  (`{ error: { code: 400, message: "USER_DISABLED", errors: [...] } }`).

- [ ] **CA5. Qualquer outra recusa do provedor cai no mesmo código**
  `INVALID_IDP_RESPONSE`, a resposta 200 do provedor sem os campos de sessão ("Invalid response from identity
  provider") e a falta de `FIREBASE_WEB_API_KEY` fora do emulador respondem 400 `AUTH_INVALID_CREDENTIALS`.
  Nenhuma delas ecoa a mensagem original no corpo. Em particular, os nomes `FIREBASE_WEB_API_KEY` e
  `NEXT_PUBLIC_FIREBASE_API_KEY` não aparecem na resposta, e sem a chave a rota não chega a chamar o provedor.

- [ ] **CA6. Limite do provedor responde 429 `USERS_AUTH_RATE_LIMITED`**
  Uma recusa com `TOO_MANY_ATTEMPTS_TRY_LATER` ou `TOO_MANY_REQUESTS` responde 429 com
  `{ error: { code: "USERS_AUTH_RATE_LIMITED" } }`, o mesmo do `/auth/sign-in`. O rate limit do proxy
  (`AUTH_RATE_LIMITED`) continua valendo antes da rota e não muda.

- [ ] **CA7. Erro que não vem do provedor continua propagando**
  Uma falha que não é `IdentityToolkitError` (rede, bug) não vira código de credencial: o handler relança,
  como o `/auth/sign-in` faz. Assim uma falha de servidor não aparece para o usuário como "credencial
  incorreta".

- [ ] **CA8. Sucesso e conta sem perfil ficam como estão**
  Token aceito com perfil vivo responde 200 com `{ session: { idToken, refreshToken, expiresIn }, user }`.
  Token aceito sem perfil vivo (conta arquivada) responde 404 `USERS_NOT_FOUND` sem `session`, como desde a PR
  #50. Conta nova continua ganhando um perfil, e conta que já tem perfil não ganha um segundo
  (`googleSignInProfile.test.ts` passa sem mudança).

- [ ] **CA9. A app continua entrando com Google e mostra texto traduzido na recusa**
  `apps/app` e `packages/sdk` não mudam. Uma recusa da API depois do popup passa a mostrar no toast o texto de
  `apiErrors` do código recebido nos 3 idiomas ("E-mail ou senha incorretos.", "Incorrect email or
  password." e o equivalente em espanhol), em vez de `"401 - Unauthorized"`, e o popup continua sendo
  deslogado. A conta desativada continua recusada pelo próprio popup com "Esta conta foi desativada." antes de
  chegar à API, então o toast novo quase não é alcançável pela tela.

- [ ] **CA10. Antes × depois provado pelos testes**
  Com `google/route.ts` revertido para `4b0be90`, os casos de corpo inválido, conta desativada, demais recusas
  e limite do provedor de `authSignInGoogleRoute.test.ts` falham (14 de 21 no arquivo original). Com a
  correção, passam todos. `pnpm --filter api test` e o `pnpm test` da raiz terminam com exit 0.
