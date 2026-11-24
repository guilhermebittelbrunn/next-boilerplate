# Critérios de Aceite (Checklist)

Fatia 2 de `specs/delivery-security-review.md` (defesa em profundidade). O status de cada item, com o meio
de verificação, está em [`report.md`](report.md).

- [x] **Escrita na API carregada só pelo cookie, sem `Origin`, é recusada**
  Um `POST`, `PUT`, `PATCH` ou `DELETE` na API com o cookie `access-token`, sem `Authorization`, sem `Origin`
  e sem `Sec-Fetch-Site: same-origin` recebe `403` com `{ "error": { "code": "AUTH_FORBIDDEN_ORIGIN" } }`,
  `Vary: Origin`, `x-request-id` e nenhum `Access-Control-Allow-Origin`. A recusa acontece antes do guard e do
  rate limit. O log registra `[security] blocked reason=missing-origin` com caminho, método e `requestId`, sem
  o valor do cookie, IP ou corpo. `Sec-Fetch-Site` com `cross-site`, `same-site` ou `none` não conta como
  prova de origem.

- [x] **Bearer, `GET`, preflight e chamada anônima sem `Origin` continuam passando**
  A mesma escrita com `Authorization: Bearer` segue para o guard (401 `AUTH_INVALID_TOKEN` com token inválido,
  2xx com token válido). `GET` com cookie e sem `Origin` não é recusado pelo proxy. `POST` sem cookie e sem
  `Origin`, como o webhook da Stripe, também não; um cookie que não é o de sessão (`x-locale`) não ativa a
  regra. `Origin` da allowlist com o cookie segue para o guard, e `OPTIONS` com `Origin` da allowlist responde
  204 como antes. `Origin` fora da allowlist continua em 403 com `reason=origin`.

- [x] **Rotas de sessão das front-ends exigem prova de mesma origem**
  `POST /api/auth/session`, `POST /api/auth/session/refresh`, `POST /api/auth/custom-token` e
  `DELETE /api/auth/session`, no `app` e na `web`, respondem `403 AUTH_FORBIDDEN_ORIGIN` quando não há
  `Origin` nem `Sec-Fetch-Site: same-origin`. O mesmo vale para `Origin` de outro host (incluindo outra porta
  do mesmo `localhost`), `Origin` malformado e `Origin: null`. A recusa não lê o corpo, não consulta o
  Firebase e não apaga nem grava cookie: o `DELETE` recusado não devolve `Set-Cookie`.

- [x] **Login, SSO e saída continuam funcionando no navegador**
  Cadastro e login por e-mail e login por Google gravam o cookie (`POST /api/auth/session` 200). Abrir a `web`
  com a sessão do `app` adota a sessão (`POST /api/auth/custom-token` 200). Sair, no `app` ou na `web`,
  responde 200 e apaga o `access-token`. Nenhuma dessas chamadas recebe 403, nem em HTTP nem numa página
  HTTPS. Os E2E de `signIn` e `signUp`, nos projetos `chromium` e `mobile`, ficam verdes.

- [x] **Corpo das rotas de sessão validado por Zod com teto**
  `idToken` ausente, numérico, vazio, corpo que não é JSON ou `idToken` acima de 4096 caracteres responde
  `400 AUTH_MISSING_TOKEN` sem chamar o Firebase, em `session` e em `session/refresh`. Um `idToken` de
  exatamente 4096 caracteres segue para a verificação (e cai em `401 AUTH_INVALID_TOKEN` se não for um token
  real). Campos extras no corpo continuam ignorados. Nenhum código de erro novo.

- [x] **E-mail do usuário criado pelo admin tem teto**
  `POST /users` de um admin com e-mail de 321 caracteres responde `400 VALIDATION_FAILED` sem chamar o
  Identity Toolkit. Um e-mail válido de até 320 caracteres segue o fluxo de hoje. O campo não ganha `trim`, então
  o que ele aceitava antes continua aceito.

- [x] **`x-locale` gravado pelo servidor dura 180 dias**
  Toda resposta do proxy do `app` e da `web` que grava `x-locale` manda `Path=/; Max-Age=15552000;
  SameSite=lax`, no redirecionamento da raiz para `/pt-br/` e nas páginas em `pt-br`, `en` e `es`. Em HTTP o
  cookie sai sem `Secure`. Quando o Next enxerga HTTPS (`x-forwarded-proto: https` vindo do proxy de TLS), sai
  com `Secure`. Trocar de idioma pelo seletor mantém o cookie com 180 dias.

- [x] **Cookies de preferência do navegador ganham `Secure` em HTTPS**
  `setCookie` sem a opção `secure` grava `Secure` quando a página é HTTPS e não grava em HTTP; `secure: false`
  explícito é respeitado. `x-timezone` e `x-theme` seguem essa regra. Os cookies de painel
  `bp:panel-request-role` e `bp:impersonate-firebase-uid` também, com 14 dias, e o apagamento numa página HTTPS
  remove o cookie de fato.

- [x] **`@repo/auth` não imprime o objeto de erro**
  As sete falhas de `packages/auth/server.ts` saem como uma linha `[auth] <evento> code=<código Firebase>` ou
  `reason=<nome do erro>`, sem a mensagem do provedor, sem uid e sem token. O comando de 1.16 da parte 1 não
  acha nenhuma linha de `packages/auth/server.ts`; as três que restam são as excluídas por decisão (Q10).
  `createCustomToken` continua relançando o erro.

- [x] **API em produção sem `CORS_ORIGIN` encerra o processo**
  `next start` em produção com `CORS_ORIGIN` ausente, vazio ou só com vírgulas (`" , "`) sai com código 1,
  imprime `[boot] CORS_ORIGIN is required in production…` e deixa a porta livre. Com a lista configurada a API
  sobe e `/health` responde 200. O build de produção sem `CORS_ORIGIN` passa, sem linha `[boot]` e sem o aviso
  `A Node.js API is used … Edge Runtime`. Fora de produção, sem a lista, a API sobe com as origens de
  `localhost`. Numa função da Vercel o comportamento não é verificável localmente.

- [x] **Falha de credencial do Firestore em produção também encerra o processo**
  Em produção, sem a service account e sem emulador, o boot imprime `[boot] Firebase Admin credentials are
  not configured…` e sai com código 1, em vez de ficar no ar respondendo 500 a tudo. Fora de produção o erro
  continua sendo lançado, como antes, e o `pnpm dev` do turbo não cai.
