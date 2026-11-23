# Critérios de Aceite (Checklist): fatia 1 de `delivery-security-review`

Escopo: os cinco itens da fatia 1 (dependências, orçamento padrão de rate limit, revogação que falha de forma
visível, allowlist da sessão, sem `X-Powered-By`). O status medido de cada critério está em
[`report.md`](report.md).

- [ ] **Dependências de produção sem crítica nem alta**
  `pnpm audit --prod --audit-level=high` sai com código 0. A única alta restante, `@grpc/grpc-js` 1.9.16
  (cadeia `firebase` → `@firebase/firestore`), aparece como "ignored" e corresponde a uma exceção escrita no
  campo `"//"` do `package.json` da raiz, com motivo e data de revisão (2027-05-19). Qualquer crítica ou alta
  sem exceção escrita reprova o critério.

- [ ] **Suíte, emulador e E2E verdes depois das subidas de `next`, `firebase-admin` e `@arcjet/next`**
  `pnpm test` da raiz (que roda `test` e `test:emulator`) e `pnpm e2e` terminam com código 0. Falha por
  tempo de pool do Vitest ou por compilação lenta do `next dev` sob carga não conta como asserção quebrada,
  mas também não fecha o critério: o arquivo tem de passar quando reexecutado, e o relatório registra as duas
  execuções. O spec da equipe (`organizationOwnership.spec.ts`) passa três vezes seguidas sozinho e na suíte
  completa. Em `next build && next start`, recarregar `/pt-br/organization` como dono mostra "Convites
  pendentes" uma única vez, visível, sem contêiner oculto do streaming nem esqueleto preso.

- [ ] **Toda rota mutável fora da lista estrita cai no orçamento padrão**
  `POST`, `PUT`, `PATCH` e `DELETE` em qualquer caminho fora dos 21 da lista estrita consultam
  `checkRateLimit` com `budget: "standard"` e um sujeito que é o hash SHA-256 (32 hex) do `sub` do bearer, ou
  `"anonymous"` sem bearer válido. Isso vale para rota que ainda não existe (rota nova nasce limitada) e para o
  `DELETE /auth/session` do logout, em que duas contas diferentes geram sujeitos diferentes. `GET`, `HEAD` e
  `POST /webhooks/payments` não consultam orçamento nenhum, e um caminho estrito gasta um orçamento só.

- [ ] **Troca e definição de senha e as sessões de pagamento ficam no orçamento estrito**
  `/account/password`, `/account/password/set`, `/payments/checkout` e `/payments/portal` usam o orçamento
  `strict` (20/min por IP, sem sujeito). Recusa responde `429` com `error.code` `AUTH_RATE_LIMITED` e
  `Retry-After` quando o Arcjet informa a espera.

- [ ] **Sem `ARCJET_KEY` a API sobe, avisa uma vez e não limita nada**
  No boot sem chave (ausente, vazia ou malformada) a API registra uma única linha
  "[security] rate limiting is DISABLED (no ARCJET_KEY). Mutating routes accept unlimited requests." e não
  faz chamada de rede ao Arcjet. 70 `POST` autenticados seguidos em `/notifications/read-all` respondem 200,
  sem nenhum 429 e sem linha `[security] blocked`.

- [ ] **Com `ARCJET_KEY` real os dois orçamentos recusam no limite**
  Com a chave, `POST /account/password` recusa a partir da 21ª requisição no minuto e
  `POST /notifications/read-all` com o mesmo bearer a partir da 61ª. Uma segunda conta no mesmo IP continua
  passando no orçamento padrão, o logout de várias contas em sequência pelo servidor do front não leva 429, e
  `/webhooks/payments` nunca recusa. Depende de credencial de produção; sem ela o critério fica não verificado
  e não reprova a entrega.

- [ ] **Troca de senha com revogação falha responde erro e mantém a senha nova**
  Se o Firebase recusar a revogação depois de `POST /account/password` salvar a senha, a resposta é
  `500 AUTH_SESSIONS_NOT_REVOKED`, a trilha de auditoria registra a troca e o log tem
  `[auth] session-revoke-failed requestId=…` sem uid nem e-mail. A tela mostra o toast com a cópia de
  `AUTH_SESSIONS_NOT_REVOKED` no idioma da URL, não faz `signOut`, e a senha nova vale no próximo login
  enquanto a antiga deixa de valer.

- [ ] **Definição de senha com revogação falha responde erro**
  `POST /account/password/set` numa conta sem provedor de senha salva a senha, grava a auditoria e responde
  `500 AUTH_SESSIONS_NOT_REVOKED` quando a revogação falha. A senha definida passa a valer mesmo assim.

- [ ] **Redefinição de senha com revogação falha responde erro e não confunde quem tenta de novo**
  `POST /auth/password/reset` responde `500 AUTH_SESSIONS_NOT_REVOKED` quando `getUserByEmail` ou a revogação
  falham, depois de o código ter sido consumido e a senha trocada. Nesse caso a tela troca o formulário pelo
  cartão de sucesso ("Senha alterada" / "Password changed" / "Contraseña cambiada"), com a cópia de
  `AUTH_SESSIONS_NOT_REVOKED` como descrição e o link para `/<locale>/sign-in`, sem toast e sem formulário
  para reenviar. A senha nova entra pelo link do cartão e a antiga recebe `INVALID_PASSWORD`. A redefinição
  sem falha termina no cartão de sempre ("Sua senha foi alterada e as sessões abertas foram encerradas."), e
  um código inválido (`400`) mantém o formulário com o toast "Este link não é válido. Peça um novo.".

- [ ] **Confirmação de troca de e-mail com revogação falha mostra que o endereço mudou**
  `POST /auth/email-change/confirm` responde `500 AUTH_SESSIONS_NOT_REVOKED` nos dois caminhos (com e sem
  perfil) quando a revogação falha. A tela `/<locale>/verify-email?mode=verifyAndChangeEmail` mostra o título
  de sucesso ("E-mail alterado" / "Email changed" / "Correo cambiado"), a cópia de `apiErrors` como descrição e
  o link "Entrar". Com outro erro (código gasto, `400`) continua o cartão de erro de antes; sem falha, o
  cartão de sucesso de antes.

- [ ] **"Sair de todos os dispositivos" com revogação falha não finge sucesso**
  `POST /account/sessions/revoke` responde `500 ACCOUNT_SESSIONS_REVOKE_FAILED` e não grava auditoria quando a
  revogação falha. A tela mostra o toast "Não foi possível encerrar as sessões. Tente de novo." no idioma da
  URL e a pessoa continua logada. Com a revogação funcionando, aparece o toast de sucesso e o navegador sai.

- [ ] **`/auth/me` e os dois logins respondem só as cinco chaves**
  `GET /auth/me`, o `user` de `POST /auth/sign-in` e o `user` de `POST /auth/sign-in/google` têm exatamente
  as chaves `email`, `onboarding`, `preferences`, `type`, `uid`, para conta comum e admin. Campo ausente vem
  `null` (por exemplo `preferences` e `onboarding` de uma conta sem preferências). Nada de `customClaims`,
  `providerData`, `tokensValidAfterTime`, `metadata` ou `planAccess` nessas três respostas.

- [ ] **Os consumidores da sessão continuam funcionando com a allowlist**
  Depois do cadastro a pessoa cai no onboarding; no login, o idioma e o tema salvos nas preferências são
  aplicados; admin cai em `/<locale>/admin`; a página de convite mostra "Você está conectado como <e-mail>";
  deep link sem sessão volta ao destino depois do login.

- [ ] **Sem `X-Powered-By` nos três apps**
  `curl -sI` em `apps/app` (3000), `apps/web` (3001) e `apps/api` (3002, inclusive numa resposta 401) não
  traz a linha `x-powered-by`, em `next dev` e em `next build && next start`.

- [ ] **Regressão geral depois das subidas**
  CRUD de `entities`, upload de avatar contra o Storage, checkout sem Stripe (`503 PAYMENTS_NOT_CONFIGURED`,
  sem quebrar) e o preview de e-mail (`pnpm --filter email dev`) abrindo com `@react-email/preview-server` em
  `devDependencies` continuam funcionando.

- [ ] **Cópia nova traduzida, legível no tema e no celular**
  `AUTH_SESSIONS_NOT_REVOKED` tem texto próprio em pt-br, en e es, cita o botão pelo rótulo real de cada
  idioma e aparece legível em light e dark, desktop e 390×844.
