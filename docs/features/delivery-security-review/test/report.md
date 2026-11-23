# QA: core aprovado na parte 1 da entrega (fatia 1)

Rodada autônoma do `/cycle`, em `feat/delivery-security-review` (branch criada pelo `/review`, não protegida).
Nada commitado. O `STATE.md` tinha `review` em `in-progress` sem commits na branch (`git log c9b4d9c..HEAD`
vazio): o `/cycle` não commita, então o gate aberto é esperado aqui e não esconde commit já feito.

A máquina passou a rodada com load average entre 10 e 64 em 8 núcleos, por processos de outros workspaces.
Isso explica as falhas por tempo descritas abaixo; nenhuma delas foi de asserção nos arquivos do diff.

## Placar

| Resultado | Critérios |
|-----------|-----------|
| ✅ verificado e correto | 13 |
| ❌ falha | 2 (E2E com um spec quebrado; reenvio da redefinição depois do 500) |
| 🔒 não verificável sem infra externa | 1 (429 real com `ARCJET_KEY`) |

## Critérios de aceite, item a item

O texto completo de cada critério está em [`criterios-aceite.md`](criterios-aceite.md).

| # | Critério | Status | Instrumento |
|---|----------|--------|-------------|
| 1 | Dependências de produção sem crítica nem alta | ✅ | `pnpm audit --prod --audit-level=high`: saída 0, "4 low (1 ignored) \| 7 moderate \| 1 high (1 ignored)". A alta ignorada é o `@grpc/grpc-js` da exceção escrita |
| 2 | Suíte, emulador e E2E verdes depois das subidas | ❌ | `pnpm test` da raiz saiu 0 (15/15), `test:emulator` 8 arquivos/274 testes. `pnpm e2e`: 27 de 29 na primeira passada; `signUp` passou na reexecução; `organizationOwnership` falhou duas vezes seguidas do mesmo jeito (ver Defeitos) |
| 3 | Toda rota mutável fora da lista estrita cai no orçamento padrão | ✅ | unit do proxy (`corsOrigin.test.ts`, 53 casos, um novo para `DELETE /auth/session`) |
| 4 | Troca/definição de senha e pagamento no orçamento estrito | ✅ | unit do proxy (casos existentes, rodados) |
| 5 | Sem `ARCJET_KEY`: aviso uma vez, nada limitado | ✅ | boot real da API em `next dev` e em `next start`: uma linha de aviso em cada; 70 `POST /notifications/read-all` = 70 × 200 nos dois; 25 `POST /auth/sign-in` com senha errada = 25 × 400; zero `[security] blocked` |
| 6 | Com `ARCJET_KEY` real os orçamentos recusam no limite | 🔒 | não há chave de Arcjet de dev; não foi inventada |
| 7 | Troca de senha com revogação falha | ✅ | browser (en, dark, desktop) com a mutação temporária: `POST /account/password 500`, toast com a cópia nova, pessoa continua na tela; login seguinte com a senha nova entra e a antiga recebe `INVALID_PASSWORD` |
| 8 | Definição de senha com revogação falha | ✅ (API) | `curl` com o token de uma conta só-Google: `500 {"error":{"code":"AUTH_SESSIONS_NOT_REVOKED"}}` e a senha definida passa a valer. A tela de definição não foi percorrida no browser (exigiria login Google pelo popup do emulador); ela usa o mesmo `errorAlert(handleClientError(...))` medido no item 7 |
| 9 | Redefinição de senha com revogação falha | ❌ | browser (pt-br, light): o 500 e o toast estão certos. O reenvio do formulário com o código gasto mostra "Este link não é válido. Peça um novo." quando a senha nova já vale (ver Defeitos) |
| 10 | Confirmação de troca de e-mail com revogação falha | ✅ | browser contra `next start` do app: cartão "E-mail alterado" (pt-br, light, desktop), "Email changed" (en, dark, desktop), "Correo cambiado" (es, light, 390×844), cada um com a cópia de `apiErrors` e o link de entrar. Controles: código gasto → cartão "Could not change the email"; sem a mutação → cartão de sucesso de antes |
| 11 | "Sair de todos os dispositivos" com revogação falha | ✅ | browser (es, light, 390×844): `POST /account/sessions/revoke 500`, toast "No se pudieron cerrar las sesiones. Inténtalo de nuevo.", pessoa continua logada. Sem a mutação: toast "Se cerraron todas las sesiones." e o navegador vai para `/es/sign-in?redirect=%2Fes` |
| 12 | `/auth/me` e os dois logins só com as cinco chaves | ✅ | `curl` com ID token do emulador: `["email","onboarding","preferences","type","uid"]` em `/auth/me` (comum e admin, dev e prod), no `user` de `/auth/sign-in` e no de `/auth/sign-in/google`. Para comparar, `GET /account` da mesma conta devolve 23 chaves, entre elas `customClaims`, `providerData`, `tokensValidAfterTime` e `planAccess` |
| 13 | Consumidores da sessão continuam funcionando | ✅ | browser: cadastro → `/pt-br/onboarding`; idioma escolhido no onboarding (English) leva a `/en`; login de conta com `{"theme":"dark","locale":"es"}` a partir de `/pt-br/sign-in` cai em `/es` com `html.dark` e título "Hola"; admin cai em `/en/admin`; convite mostra "Você está conectado como qa-delivery-security-ptbr-new@example.com."; deep link `/en/account?tab=security` volta ao destino depois do login |
| 14 | Sem `X-Powered-By` nos três apps | ✅ | `curl -sI`: zero linhas `x-powered-by` em `:3000/pt-br/sign-in`, `:3001/pt-br`, `:3002/health` e `:3002/auth/me` (401), em `next dev` e em `next build && next start`. Controle do instrumento: o preview de e-mail (`:3003`, Next sem `@repo/next-config`) devolve a linha |
| 15 | Regressão geral depois das subidas | ✅ | CRUD de `entities`: spec `entityCrud` verde no `pnpm e2e`. Avatar contra o Storage: `storageUpload.emulator.test.ts` verde no `test:emulator` (`@google-cloud/storage` 7.22.0). Checkout sem Stripe: `503 {"error":{"code":"PAYMENTS_NOT_CONFIGURED"}}`. Preview de e-mail: `pnpm --filter email dev` abriu em 3003, `/` e `/preview/action-link` responderam 200 |
| 16 | Cópia nova traduzida, legível no tema e no celular | ✅ | toasts e cartões lidos nos três idiomas acima. Toast de erro no light: texto `rgb(117,117,117)` sobre branco (cerca de 4,6:1); no dark: branco sobre `rgb(18,18,18)` |

## Verificar no `/test` (lista do `review.md`)

1. **Suítes com saída 0.** Confirmado, com ressalva de ambiente. `pnpm --filter api test` com workers padrão
   travou: depois de 78 arquivos os 7 forks ficaram em 0% de CPU por 14 minutos e matei o processo (saída 143).
   Os 46 arquivos restantes passaram sozinhos com `--maxWorkers=2`, e a suíte inteira com
   `pnpm --filter api test --maxWorkers=2` saiu 0 (126 arquivos, 1719 testes, 128 s). A `app` com
   `--maxWorkers=2` teve 3 falhas por tempo (`organizationTransferKeyboard` ×2 com 20 s,
   `signInEmailLinkEntry` com `findByRole` estourando 1 s); os três arquivos passaram sozinhos (11 testes). O
   `pnpm test` da raiz fechou com saída 0 na terceira execução.
2. **`test:emulator` e `pnpm e2e`.** `test:emulator` confirmado (8/274). `pnpm e2e` derrubado: um spec falha
   de forma repetível.
3. **`X-Powered-By`.** Confirmado em dev e em produção nos três apps.
4. **Allowlist no fio.** Confirmado nas três rotas, com emulador.
5. **Boot sem `ARCJET_KEY`.** Confirmado: uma linha de aviso por boot e 70 × 200.
6. **Orçamentos com chave real.** 🔒 não verificável.
7. **Logout com chave real.** 🔒 não verificável. Sem chave, o logout pela `apps/app` em `next start` gerou
   `DELETE /auth/session 204` na API, sem linha `[security] blocked`.
8. **F1 a F3.** Confirmados os toasts e o cartão. A dúvida do review sobre a redefinição se confirmou: depois
   do 500 o formulário continua preenchido, o reenvio responde `400` com "Este link não é válido. Peça um
   novo." e a senha nova já vale.
9. **F4 e F5.** Confirmados.

## Testes

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api exec vitest run __tests__/corsOrigin.test.ts --maxWorkers=1` | 53 passaram (inclui o caso novo) |
| `pnpm --filter api test` | travou depois de 78 arquivos sob load ~50; processo morto, saída 143 |
| `vitest run <46 arquivos restantes> --maxWorkers=2` (api) | 46 arquivos, 402 testes, saída 0 |
| `pnpm --filter api test --maxWorkers=2` | 126 arquivos, 1719 testes, saída 0 |
| `pnpm test --concurrency=2` (raiz, JDK 21) | saída 1: `app` 1 falha "Timeout starting forks runner" (1200 passaram); `api` 126/1719, `web` 26/210, `test:emulator` 8/274 passaram; 11 tarefas em cache |
| `pnpm test --concurrency=1` | saída 1: `app` derrubada por `EPIPE` do pool e um timeout em `tableLoadMore` |
| `pnpm --filter app test --maxWorkers=2` | 133 de 135 arquivos; 3 falhas por tempo |
| `vitest run organizationTransferKeyboard signInEmailLinkEntry tableLoadMore --maxWorkers=1` (app) | 3 arquivos, 11 testes, saída 0 |
| `pnpm test --concurrency=1` (terceira, load ~16) | saída 0, 15/15 tarefas: `api` 126/1719, `web` 26/210, `app` 135/1201, `test:emulator` 8/274, `@repo/internationalization` 7/67 (paridade incluída) |
| `pnpm e2e` | 27 passaram, 2 falharam (`organizationOwnership`, `signUp`), 34,4 min |
| `pnpm e2e tests/signUp.spec.ts tests/organizationOwnership.spec.ts` | `signUp` passou; `organizationOwnership` falhou |
| `pnpm e2e tests/organizationOwnership.spec.ts` | falhou de novo, mesmo erro |
| `pnpm audit --prod --audit-level=high` | saída 0 |
| `npx biome check apps/api/__tests__/corsOrigin.test.ts` | sem correção |

Gates não remedidos: `pnpm check` (1076 arquivos) e `typecheck` (14/14) ficam com o número do `/review`; só
acrescentei um caso de teste.

### Teste criado

`apps/api/__tests__/corsOrigin.test.ts`: "counts signing out in the standard budget, keyed by the forwarded
session subject". Dois `DELETE /auth/session` com bearers de `sub` diferentes consultam o orçamento `standard`
com sujeitos em hash distintos, e o `GET /auth/session` não consulta nada. Sem `DELETE` em `MUTATING_METHODS`
o caso quebra (contagem 0 em vez de 2).

### Decisões de custo de teste

- Nenhum teste da faixa cara foi criado. O caso novo é unit do proxy com `@repo/security` mockado; isso basta
  para provar a fiação do orçamento.
- A medição contra o boot real (aviso, 70 × 200, allowlist com token de verdade, `X-Powered-By`) foi feita na
  validação executável e não virou teste: o modo degradado já tem `rateLimitDegraded.test.ts`, a allowlist já
  tem o mapper e as três rotas com mock, e o `poweredByHeader` tem `config.test.ts`.
- Revogação: as cinco rotas já tinham teste de rota com `vi.mock` (rodados no `api` acima). A mutação
  temporária só serviu para levar a UI ao estado de falha.

## Evidências e2e (em palavras)

Ambiente: emulador (Auth, Firestore, Storage) semeado com `seed-emulator.mjs`; `api`, `app` e `web` em
`next dev` com o env do `buildStackEnv` da suíte E2E (projeto `demo-next-boilerplate`, `ARCJET_KEY` vazia);
depois `next build && next start` dos três.

- **F1, troca de senha (en, dark, desktop).** Toast vermelho: "Your change was saved, but we could not end the
  other sessions of this account. Sign in again and use "Sign out everywhere" under Security. (Error code:
  <requestId>)". API: `POST /account/password 500` e `[auth] session-revoke-failed requestId=…`.
- **Observação do F1.** No emulador, a própria troca de senha já invalida os tokens antigos: a segunda
  tentativa na mesma aba voltou `401` ("Invalid or expired session.") e recarregar a página levou a
  `/en/sign-in?redirect=…`. Ou seja, mesmo com a revogação falhando, o Firebase encerrou as sessões. A cópia
  continua correta como aviso conservador.
- **F1, redefinição (pt-br, light).** Toast: "A alteração foi salva, mas não conseguimos encerrar as outras
  sessões desta conta. Entre de novo e use "Sair de todos os dispositivos" em Segurança. (Código do erro: …)".
  A tela continua em "Escolher senha nova" com os campos preenchidos.
- **F2 em `next dev`.** A tela ficou presa em "Confirmando o novo e-mail..." depois do 500, e também no
  controle com código gasto (400). O console mostrava "[Fast Refresh] rebuilding" a cada carga. Em
  `next start` as três telas renderizaram certo, então é artefato do `next dev`, não defeito da entrega.
- **F2 em produção.** pt-br: "E-mail alterado"; en (dark): "Email changed"; es (390×844): "Correo cambiado",
  cada um com a cópia de `apiErrors` e o link para `/<locale>/sign-in`. Sem a mutação: "E-mail alterado" com
  "Entre de novo usando o novo endereço. As sessões abertas desta conta foram encerradas."
- **F3 (es, light, 390×844).** Diálogo "¿Seguro que quieres cerrar todas las sesiones?" → toast "No se
  pudieron cerrar las sesiones. Inténtalo de nuevo. (Código del error: …)".
- **F4.** Ver critério 13.

Screenshots de apoio em `test/e2e/` (descartados pelo `.gitignore`): `01-pos-onboarding.png`,
`02-f1-troca-senha-en-dark.png`, `03-f3-sair-todos-es-light-mobile.png`, `04-f2-troca-email-ptbr-light.png`
(o estado preso do `next dev`), `04-f2-troca-email-ptbr-light-prod.png`, `05-f1-redefinicao-ptbr-light.png`,
`06-f1-redefinicao-reenvio-ptbr.png`, `07-f4-poslogin-es-dark.png`, `08-f4-admin-en-dark-mobile.png`,
`09-f4-convite-ptbr.png`, `10-f2-troca-email-es-mobile-prod.png`, `11-f2-troca-email-en-dark-prod.png`.

## Defeitos e achados

### ❌ `organizationOwnership.spec.ts` falha de forma repetível nesta branch

- **Repro:** `pnpm e2e tests/organizationOwnership.spec.ts` (JDK 21). Falhou duas vezes seguidas em ~3 s, na
  linha 93: `getByText('Convites pendentes')` resolve para dois `<h2>`, ambos "hidden", e o `toBeVisible`
  quebra por strict mode. Na primeira passada completa o mesmo spec tinha falhado antes, num `page.goto` de
  60 s.
- **O que o trace mostra:** num dos snapshots o `<h2>` está dentro de `BODY > DIV[hidden]#S:1`, o contêiner em
  que o React deixa o conteúdo de um Suspense que chegou por streaming e ainda não foi trocado para o lugar.
  O log do app tem `Error: The destination stream errored while writing data` nas mesmas navegações.
- **Comparação:** no CI de `main` em `c9b4d9c` (run 44583788090, `next` 16.4.3) o mesmo spec passou em 21 s.
  Nenhum arquivo do diff toca a tela de equipe (`OrganizationClient.tsx`, `OrganizationInvitationsTable.tsx`).
- **Suspeita (hipótese):** a subida de `next` 16.4.3 → 16.4.6 mudou o momento da troca do conteúdo
  transmitido, e o seletor `getByText` passou a pegar a cópia oculta. Não rodei o spec em `c9b4d9c` local para
  separar máquina de versão (exigiria outro checkout). Caminhos: rodar o job `e2e` do CI nesta branch; se
  reproduzir, trocar o seletor em `apps/e2e/tests/organizationOwnership.spec.ts:92` por
  `getByRole("heading", { name: organizationCopy.invitations.title })` ou esperar a troca do streaming, e
  investigar se o usuário vê o cabeçalho duplicado por algum instante.

### ❌ Redefinição de senha: reenvio depois do 500 diz que o link é inválido (🟡, não bloqueante)

- **Repro:** com a revogação falhando, abrir `/pt-br/reset-password?oobCode=<código>`, enviar a senha nova
  (toast com `AUTH_SESSIONS_NOT_REVOKED`), clicar "Salvar senha" de novo. Resposta `400`, toast "Este link não
  é válido. Peça um novo.". A senha nova já vale (login com ela entra; a antiga recebe `INVALID_PASSWORD`).
- **Suspeito:** `apps/app/app/[locale]/(unauthenticated)/reset-password/components/ResetPasswordForm.tsx:42-49`
  trata o 500 só com `errorAlert` e mantém o formulário.
- **Sugestão (hipótese):** repetir o que `ConfirmEmailChangeResult` faz: com `apiErrorCodeOf(error) ===
  "AUTH_SESSIONS_NOT_REVOKED"`, mostrar o cartão de sucesso com a cópia de `apiErrors` como descrição e o
  link "Ir para o login", em vez do formulário.

### Achados sem defeito

- `next dev` 16.4.6 grava `AGENTS.md` em `apps/api`, `apps/app` e `apps/web` (`agentRules`). Apaguei os três
  ao terminar. Cada fork que rodar `pnpm dev` vai ganhar esses arquivos não rastreados; vale decidir entre
  `agentRules: false` no `@repo/next-config` e entrada no `.gitignore`.
- O aviso de upgrade do `next dev` (que derrubava o boot a cada duas execuções na 16.4.3) não apareceu em
  nenhum dos boots desta rodada.
- O `next build` da API exige `FIREBASE_ADMIN_*` preenchidas mesmo com o emulador; usei valores fictícios de
  formato para o build local. Comportamento anterior a esta entrega.
- O preview de e-mail (3003) responde com `X-Powered-By`. É ferramenta de dev, fora dos três apps da spec.

## Lacunas de teste herdadas

| Lacuna | Veredito |
|--------|----------|
| Nenhum caso de proxy afirmava `DELETE /auth/session` no orçamento padrão | Fechada aqui com o caso novo em `corsOrigin.test.ts` |
| `rateLimitSubject` só no `standard` com o cookie de sessão real como bearer | Continua aberta. O unit cobre a fiação com JWT montado; o logout real (`DELETE /auth/session 204`) foi observado sem chave, mas o efeito do sujeito só aparece com `ARCJET_KEY` (item 7, 🔒) |
| `rateLimitDegraded` não pega chamada de rede por HTTP/2 | Continua aberta. Medi o comportamento (zero 429, aviso único) e não o tráfego; quem garante a ausência de rede continua sendo `rateLimit.test.ts` |

## Ambiente do e2e

- Portas 3000-3003, 9099, 8080, 9199, 4001, 4400 e 4500 estavam livres no início; nada do usuário foi
  reutilizado.
- Subi e derrubei por PID: emulador (`pnpm emulators`), `api`/`app`/`web` em `next dev`, `app`/`api`/`web` em
  `next start`, preview de e-mail. O `pnpm e2e` subiu e derrubou o próprio stack nas três execuções.
- Conferido no fim: nenhuma das portas acima em LISTEN; nenhum processo `cloud-firestore-emulator`,
  `next-server` ou `firebase emulators` deste workspace vivo. Sessões do `agent-browser` fechadas.
- A mutação temporária (`revokeUserSessionsOrThrow` lançando sempre, em `packages/auth/server.ts:332`) foi
  revertida a partir de uma cópia: `shasum -c` OK e `git diff --stat` igual ao de antes (7+/1-).
- Builds de produção ficaram em `apps/*/.next` (ignorado pelo git).

## Estado de dev alterado

Tudo no emulador, que morreu com o processo. Nenhum projeto Firebase real foi tocado e nenhuma conta entra em
`docs/PRE-PRODUCTION.md`.

- Contas criadas no emulador: `qa-delivery-security@example.com` (e-mail trocado em sequência para
  `qa-delivery-security-ptbr-new@`, `-ptbr-2@` e `-ptbr-3@example.com`), `qa-delivery-security-en@example.com`
  (→ `-en-new@`, `-en-2@`), `qa-delivery-security-es@example.com` (→ `-es-new@`),
  `qa-delivery-security-reset@example.com` e `qa-delivery-security-google@example.com` (só Google, depois com
  senha). As senhas foram de uso único no emulador e não estão em arquivo.
- Contas semeadas alteradas: `user2@example.com` com preferências `dark`/`es`; sessões de `user@example.com`
  encerradas pelo F3. Um convite semeado para a conta de QA.
- Contas `e2e-*@example.com` criadas pela suíte E2E, no emulador dela.

## Rodada 2

O `/review` tratou os dois ❌ da rodada 1: `ResetPasswordForm.tsx` mostra o cartão de sucesso com
`AUTH_SESSIONS_NOT_REVOKED`, e `organizationOwnership.spec.ts:91-99` passou a procurar o cabeçalho por role. A
causa do defeito 1 veio do review como hipótese de leitura (reload por HMR do Turbopack no meio do
streaming); esta rodada mediu o efeito. Load average entre 10 e 21 durante a rodada.

### Placar final

| Resultado | Critérios |
|-----------|-----------|
| ✅ verificado e correto | 15 |
| ❌ falha | 0 |
| 🔒 não verificável sem infra externa | 1 (429 real com `ARCJET_KEY`) |

Os critérios 2 e 9 saíram de ❌ para ✅. Os demais seguem com o status e o instrumento da rodada 1.

### Verificar no `/test` (rodada 2)

1. **Spec da equipe, 3× seguidas.** `pnpm e2e tests/organizationOwnership.spec.ts` (JDK 21): verde nas três,
   em 11,6 s, 12,3 s e 13,6 s, cada execução com 5 testes (setup incluído) e saída 0. Nenhuma falha por tempo,
   então não rodei com `next` 16.4.3: a condição que pedia essa separação não apareceu.
2. **Tela de equipe em produção.** `next build && next start` do app (API em `next dev`, emulador), login como
   `user@example.com` (dono), convite semeado para `qa-delivery-security-r2-invitee@example.com`, cinco
   reloads de `/pt-br/organization`. Nos cinco: um único `<h2>` "Convites pendentes", visível; zero
   `div[hidden][id^="S:"]`; zero esqueletos; a linha do convite presente.
3. **Redefinição com a revogação falhando.** Mutação temporária em `revokeUserSessionsOrThrow`, com a API
   reiniciada para carregá-la (o `next dev` não recarregou a mudança em `packages/auth` sozinho; uma sonda em
   `/account/sessions/revoke` devolveu 200 antes do reinício e `500 ACCOUNT_SESSIONS_REVOKE_FAILED` depois).
   Com `POST /auth/password/reset 500` nos três casos, sem formulário (`forms=0`) e sem toast:
   - pt-br, light, 1280×800: "Senha alterada", "A alteração foi salva, mas não conseguimos encerrar as outras
     sessões desta conta. Entre de novo e use "Sair de todos os dispositivos" em Segurança. (Código do erro:
     …)", link "Ir para o login" → `/pt-br/sign-in`;
   - en, dark, 1280×800: "Password changed", a cópia em inglês, link "Go to sign in" → `/en/sign-in`;
   - es, light, 390×844: "Contraseña cambiada", a cópia em espanhol, link "Ir al inicio de sesión" →
     `/es/sign-in`.

   Pelo link do cartão em pt-br, o login com a senha nova levou a `/pt-br/onboarding` (conta nova). Pela API
   do emulador, a senha nova entra nas três contas e a antiga recebe `INVALID_PASSWORD`.
4. **Redefinição normal e código inválido.** A primeira tentativa em pt-br rodou antes de a mutação carregar e
   serviu de caso normal: `POST /auth/password/reset 200`, cartão "Senha alterada" com "Sua senha foi alterada e
   as sessões abertas foram encerradas. Entre de novo com a senha nova.". Código inválido em en (dark):
   `400`, formulário na tela (`forms=1`) e toast "This link is not valid. Request a new one. (Error code: …)".
5. **Suíte da `app`.** `pnpm --filter app test` com workers padrão: 136 arquivos, 1203 testes, saída 0, 33 s
   (`resetPasswordForm.test.tsx` com 2 testes).
6. **`pnpm e2e` completo.** 29 passaram, 0 falharam, 1,4 min, saída 0.

### Defeito 1: conclusão medida

Não é regressão de produto. Com o seletor por role o spec passou 3 de 3 vezes sozinho e na suíte completa, e
em produção a tela de equipe nunca mostrou a cópia oculta do streaming nem cabeçalho duplicado em cinco
reloads. A causa exata do estado transitório no `next dev` (reload por HMR, #100619) continua sem medição
direta: não capturei o reload. O que ficou medido é que ele não chega a quem usa o build de produção e que o
teste novo espera o cabeçalho visível em vez de quebrar na cópia oculta.

### Ambiente da rodada 2

- Portas 3000-3003, 9099, 8080, 9199, 4001, 4400 e 4500 livres no início.
- Subi e derrubei por PID: emulador, API em `next dev` (duas vezes, pelo reinício), app em `next start`. As
  quatro execuções do `pnpm e2e` subiram e derrubaram o próprio stack. No fim, nenhuma dessas portas em LISTEN
  e nenhum processo de emulador vivo. Sessões do `agent-browser` fechadas.
- A mutação foi revertida a partir de uma cópia idêntica à original da rodada 1 (`cmp` sem diferença):
  `shasum -c` OK e `git diff --stat packages/auth/server.ts` igual ao de antes (7+/1-).
- Os `apps/{api,app,web}/AGENTS.md` que o `next dev` gerou foram apagados.

### Dados de QA da rodada 2

Tudo no emulador, que morreu com o processo: `qa-delivery-security-r2-ptbr@example.com`,
`qa-delivery-security-r2-en@example.com` e `qa-delivery-security-r2-es@example.com` (senha redefinida em cada
uma), um convite para `qa-delivery-security-r2-invitee@example.com` na equipe de `user@example.com`, e as
sessões de `user2@example.com` encerradas pelas sondas. Nenhum projeto real tocado, nenhuma senha em arquivo.
