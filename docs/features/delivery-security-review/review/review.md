# Revisão: core aprovado na parte 1 da entrega (fatia 1)

Rodada autônoma do `/cycle`, sem perguntas ao usuário. Revisão por leitura de código e gates estáticos; nada
foi executado além de `pnpm check`, `typecheck`, a paridade de i18n e um `pnpm audit` para conferir a exceção
do `@grpc/grpc-js`. Nada commitado.

## Branch

- **Nome:** `feat/delivery-security-review`, criada com `git switch -c` a partir de
  `guilhermebittelbrunn/cycle-command-v10`, que aponta para `c9b4d9c` (igual a `origin/main`, sem commit
  próprio e sem upstream). O working tree e o índice vieram junto.
- **Por que sem `project`:** o diff toca `apps/api`, `apps/app`, `apps/web`, `apps/email` e oito pacotes.
  Vários apps, então o padrão manda omitir o prefixo.
- **Validação do nome:** o regex do `/review` respondeu `branch OK: feat/delivery-security-review`.
- A branch de origem tinha nome fora do padrão. Não renomeei porque é a branch do workspace do Conductor;
  ela continua em `c9b4d9c` e pode ser apagada depois.

## Revisão: fatia 1 de `delivery-security-review`

Nada bloqueante.

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/SECURITY.md:180`: dizia que `/auth/session` (`GET` e `DELETE`) fica fora do limite. Depois deste diff
  o `DELETE` é método mutável e cai no orçamento padrão (`rateLimitBudgetFor`, `apps/api/proxy.ts:104-116`).
  Conferi que isso não derruba o logout de todo mundo pelo IP do servidor: `createSessionAuthority`
  (`packages/sdk/src/client/sessionAuthority.ts:31-41,59-66`) manda o cookie de sessão como
  `Authorization: Bearer`, e o cookie é um JWT com o `uid` no `sub`, então cada pessoa gasta o próprio balde.
  **Corrigido** no texto. O comportamento com `ARCJET_KEY` real vai para a lista do `/test`.

### 🟢 Sugestão / nit

- `apps/api/(shared)/lib/rate-limit-subject.ts:60-74`: o `sub` é lido sem verificar a assinatura. Quem gira
  um `sub` forjado a cada requisição ganha um balde novo no orçamento padrão, então o padrão não segura uma
  enxurrada de requisições **sem credencial válida** vindas de um IP. Por que não é bypass do que importa: o
  IP continua na chave (`packages/security/index.ts:61`, `characteristics: ["ip.src", "subject"]`); o
  orçamento estrito não usa o sujeito (`index.ts:73-84`, `protect(req)` sem `subject`, e o proxy só calcula o
  sujeito quando o orçamento é `standard`, `proxy.ts:200-207`); um `sub` real vem assinado, então escrita
  autenticada sempre conta no balde da conta verdadeira; e a requisição forjada morre no guard
  (`resolveApiCredential`), ou vira no-op no `DELETE /auth/session`. Antes deste diff essas rotas não tinham
  limite nenhum, então não há regressão. Cada requisição forjada ainda custa uma decisão do Arcjet, como
  qualquer requisição a uma rota estrita. `docs/SECURITY.md` já descreve o limite. Sem ação.
- `apps/api/proxy.ts:200-207`: o hash SHA-256 do sujeito é calculado mesmo sem `ARCJET_KEY`, quando o
  `checkRateLimit` vai responder no-op. Custo de microssegundos. Sem ação.
- `package.json` (`pnpm.auditConfig.ignoreGhsas`): o ignore do pnpm vale por GHSA, não por caminho. Se outra
  cadeia trouxer um `@grpc/grpc-js` vulnerável para o runtime do servidor, o `pnpm audit` continua em
  silêncio. É o recorte mais estreito que o pnpm oferece, e a data de revisão (2027-05-19) vive só no texto
  do `"//"`, sem gate que a cobre. Sem ação; registrado.
- Copy de `AUTH_SESSIONS_NOT_REVOKED`
  (`packages/internationalization/translations/packages/shared/utils.ts:58,241,426`): manda "Entre de novo"
  também na troca de senha pela aba Segurança, onde a pessoa continua logada porque a revogação falhou. Não
  atrapalha, e os rótulos citados ("Sair de todos os dispositivos", "Segurança") batem com
  `apps/app/pages/common/account.ts:7,92` nos três idiomas. Sem ação.
- Ordem dos commits: o commit do SDK fecha `AuthMePayload` antes do commit da `app` que se adapta a ele, e
  os testes da `app` leem a chave nova de i18n antes do commit de i18n. Entre esses commits o `typecheck` da
  `app` e dois testes falham; na ponta da branch tudo passa. É a ordem que a regra de commits pede. O commit
  de dependências não depende do código novo de `@repo/security`: rodei `tsc` em `packages/security` com o
  `index.ts` de `c9b4d9c` contra o Arcjet 1.16 e saiu 0.

### ✅ OK

- **Exceção do `@grpc/grpc-js`.** `pnpm why -r @grpc/grpc-js`: a 1.9.16 vem só de `firebase` →
  `@firebase/firestore` 4.8.0 (SDK cliente, dependência de produção de `@repo/auth`); o `firebase-admin`
  13.10.0 traz a 1.14.7, já corrigida. `gh api /advisories/<id>` confirma que os dois avisos são de servidor
  gRPC: GHSA-m9gg-hp2v-232j (alta, `getAuthContext` aceitando certificado não autorizado) e
  GHSA-f596-whhp-79r4 (baixa, servidor ecoando mensagem de erro do handler), ambos corrigidos em 1.13.6 e
  1.14.5. Nenhum código de produção importa `firebase/firestore` nem `firebase/storage`; só
  `firestoreRules.emulator.test.ts` e `storageRules.emulator.test.ts`. A exceção cobre exatamente os dois
  GHSA, tem justificativa e data no `"//"`. `pnpm audit --prod --audit-level=high` saiu 0, com
  "4 low (1 ignored) | 7 moderate | 1 high (1 ignored)", o mesmo número do handoff.
- **Orçamentos no proxy.** Estrito com 21 caminhos e o filtro de método só em `/organization/invitations`;
  padrão para `POST`/`PUT`/`PATCH`/`DELETE` fora dele; `/webhooks/payments` isento; `GET` fora da lista sem
  orçamento. Uma requisição gasta no máximo um orçamento (`proxy.ts:104-116`). Das 39 rotas com método
  mutável, as que não têm guard são as da lista estrita, o webhook e o `DELETE /auth/session`.
- **Revogação.** `revokeUserSessionsOrThrow` (`packages/auth/server.ts:331`) e `revokeUserSessions` mantendo o
  comportamento antigo para os outros chamadores (`users/[id]`, `sign-in-methods/[id]`, `account-erasure.ts`,
  `account-access.ts`). Nas quatro rotas de credencial a mudança é salva, a auditoria é gravada onde existe e
  a resposta é `500 AUTH_SESSIONS_NOT_REVOKED`; nenhuma responde sucesso com a revogação falha. Na confirmação
  de troca de e-mail os dois retornos passam por `confirmed()` (`email-change/confirm/route.ts:83-110`).
  `/account/sessions/revoke` responde `500 ACCOUNT_SESSIONS_REVOKE_FAILED` antes de auditar, então não grava
  evento de algo que não aconteceu. As cinco registram `[auth] session-revoke-failed` só com o `requestId`.
- **Allowlist.** `toSessionUser` (`apps/api/(shared)/mappers/user.mapper.ts:81-89`) devolve as cinco chaves
  nas três rotas; `getMergedUserByUid` não mudou. Consumidores lidos: `layout.tsx` (`uid`),
  `invite/page.tsx` (`email`), `requireAdmin.ts` e `notFoundHome.ts` (`type`), `onboarding.ts` (`onboarding`),
  `postLoginNavigation.ts` (`preferences`, `type`), `panelSnapshot.ts` (`type`). `googleSignInApi.ts` só
  repassa o `user`. `apps/web`, `apps/e2e` e `packages/auth` não leem `/auth/me` nem o `user` do login.
- **Remoção do toolkit.** Nenhuma referência a `@stripe/agent-toolkit`, `payments/ai` ou
  `StripeAgentToolkit` fora de `docs/features/` (histórico) e das specs; `grep -c agent-toolkit
  pnpm-lock.yaml` = 0.
- **`poweredByHeader: false`** no `config` de `@repo/next-config`, que `apps/app`, `apps/web` e `apps/api`
  espalham no `next.config.ts`. `apps/email` não tem `next.config`.
- **i18n e `error.code`.** `AUTH_SESSIONS_NOT_REVOKED` nos três idiomas; `ACCOUNT_SESSIONS_REVOKE_FAILED` já
  existia. Nenhuma string de UI solta: `ConfirmEmailChangeResult` usa `handleClientError(new
  FormattedError(...))` e o dicionário.
- **Comentários.** Nenhuma referência ao fluxo (`plan.md`, `handoff.md`, critério, etapa) no código. Os
  comentários novos explicam regra externa (Stripe com retry, 500 em vez de 401 porque o SDK desloga em todo
  401, `sub` não verificado).
- **Corte da spec.** Os cinco itens da fatia 1 estão no diff. A única divergência é o `@grpc/grpc-js` como
  exceção escrita em vez de correção, caminho que a própria parte 1 aceita (justificativa e prazo).

### 👁 Verificar no `/test`

1. **Suítes com saída 0.** O handoff fechou a `api` com 1718 testes verdes, mas a tarefa saiu 1 por
   "Timeout starting forks runner", e a `app`/`web` só passaram rodando de novo com `--maxWorkers=1`. Repro:
   `pnpm --filter api test; echo $?`, depois `app` e `web`, numa máquina sem carga. Precisa sair 0.
2. **`test:emulator` e `pnpm e2e` verdes** depois das subidas de `firebase-admin` 13.10, `next` 16.4.6 e
   `@arcjet/next` 1.16. A spec exige os dois. Repro: `pnpm turbo run test:emulator` e `pnpm e2e` (JDK 21).
3. **`X-Powered-By` ausente.** Só o valor da config está medido. Repro: `curl -sI` em `:3000`, `:3001` e
   `:3002/health`, em `next dev` e em `build && start`, sem a linha `x-powered-by`.
4. **Allowlist no fio.** Medido só com mock do merge. Repro:
   `curl -s -H "Authorization: Bearer $ID_TOKEN" $API/auth/me | jq '.data | keys'` →
   `["email","onboarding","preferences","type","uid"]`; o mesmo no `user` de `POST /auth/sign-in` e de
   `POST /auth/sign-in/google`.
5. **Boot sem `ARCJET_KEY`.** O aviso "Mutating routes accept unlimited requests." aparece uma vez, e 70
   `POST` autenticados em `/notifications/read-all` não dão 429.
6. **Orçamentos com `ARCJET_KEY` real** (🔒 sem a chave). 429 a partir da 21ª em `POST /account/password`; a
   partir da 61ª em `POST /notifications/read-all` com o mesmo bearer; outra conta no mesmo IP continua
   passando; nunca em `/webhooks/payments`. O Arcjet 1.16 com `protect(req, { subject })` não foi exercitado
   contra a API de decisão real.
7. **Logout com `ARCJET_KEY` real** (🔒 sem a chave). Logar e deslogar várias contas pela `apps/app` em
   sequência: `DELETE /auth/session` sai do servidor do front com o cookie como bearer e não pode dar 429
   para contas diferentes. Conferir no log da API que não há `[security] blocked ... path=/auth/session`.
8. **Revogação que falha, F1 a F3 do plano.** Mutação temporária em `revokeUserSessionsOrThrow` para lançar.
   Conferir o toast com a cópia nova na troca, na definição e na redefinição de senha; o cartão "E-mail
   alterado" com a cópia nova na confirmação de troca de e-mail; o toast "Não foi possível encerrar as
   sessões" em "Sair de todos os dispositivos". Na redefinição, conferir também o que a tela faz depois do
   500: se ela deixa a pessoa reenviar o formulário com o código já consumido, o erro seguinte é de código
   inválido, e a pessoa não entende que a senha nova já vale.
9. **F4 e F5 do plano.** Pós-login aplica tema e idioma; admin cai em `/admin`; convite mostra o e-mail;
   CRUD de `entities`; upload de avatar (`@google-cloud/storage` subiu junto com o `firebase-admin`);
   checkout sem Stripe; `pnpm --filter email dev` abre com o preview em `devDependencies`.

## Correções aplicadas

| Arquivo | O que mudou |
|---------|-------------|
| `docs/SECURITY.md:180` | O parágrafo de `/auth/session` passa a dizer que o `GET` fica sem orçamento e o `DELETE` cai no padrão, com o sujeito tirado do cookie de sessão encaminhado como bearer |

Nenhuma correção de código. Os gates não foram afetados pela edição.

## Raio de impacto

- `AuthMePayload` (`packages/sdk/src/actions/auth/action.ts`) fechado em cinco campos, `type` agora
  `UserType | null`. Consumidores: `apps/app/lib/server/authSession.ts` e, por ele, `layout.tsx`,
  `invite/page.tsx`, `requireAdmin.ts`, `notFoundHome.ts`, `onboarding.ts`, `panelSnapshot.ts`; mais
  `postLoginNavigation.ts` e `googleSignInApi.ts`. Todos leem só campos da lista. Fork que lia outro campo de
  `/auth/me` quebra no `typecheck`, que é o efeito desejado.
- `GoogleSignInResponse.user` passou a `AuthMePayload | null`.
- `checkRateLimit(req, { budget, subject })`: segundo parâmetro opcional; sem ele, o comportamento é o
  anterior. Único chamador no repo: `apps/api/proxy.ts`.
- `revokeUserSessionsOrThrow` é aditivo; `revokeUserSessions` não mudou para quem já chamava.
- `apiErrorCodeOf` mudou de `invite/hooks/useInvitation.ts` para `apps/app/shared/lib/apiErrorCode.ts`; os
  dois consumidores importam do lugar novo.
- Dependências: `next` 16.4.6 em todos os workspaces que o declaram, `firebase-admin` ^13.10.0, `axios`
  ^1.21.1, `@arcjet/next` 1.16.0, override do `zod` em 4.6.7, preview de e-mail em `devDependencies`.

## Lacunas de teste

| Lacuna | Veredito |
|--------|----------|
| Nenhum teste prova que `rateLimitSubject` só roda no orçamento `standard` com o cookie de sessão real como bearer; os testes usam JWT montado à mão | Continua aberta. Por leitura, o sujeito só é calculado no `standard` (`proxy.ts:200-207`); o formato do cookie real fica para o item 7 da lista acima |
| `rateLimitDegraded` não pega chamada de rede por HTTP/2 (o `connect-node` 2 não usa `fetch`) | Continua aberta. Quem garante a ausência de rede sem chave é `rateLimit.test.ts`, que afirma `arcjet` e `protect` nunca chamados |
| Nenhum caso de proxy afirma que `DELETE /auth/session` cai no orçamento padrão com o sujeito do bearer | Nova, aberta. Barata: um caso em `corsOrigin.test.ts` igual a "keys the standard budget by a hash of the bearer subject", com `DELETE` em `/auth/session` |

## Decisões tomadas sem perguntar

- **Branch nova em vez de renomear.** `git switch -c feat/delivery-security-review`, como o orquestrador pediu.
  A branch antiga é a do workspace do Conductor e fica parada em `c9b4d9c`.
- **`docs/PRE-PRODUCTION.md` separado por hunk.** O hunk da linha ~964 (correção de `routes.tsx:67` e
  `accountTabRouting.ts:15`) é da auditoria do backlog e vai no commit `docs(specs)`; o hunk da linha ~777 (item 8,
  orçamento padrão sem chave e cota do Arcjet) é desta feature e vai no commit de documentação. Patch do hunk
  da auditoria em `/tmp/sydney-review/pre-production-audit-hunk.patch`, conferido com
  `git apply --cached --check`.
- **Remoção do `@stripe/agent-toolkit` no commit de dependências.** O lockfile tira o pacote junto com as
  outras subidas; separar `packages/payments/ai.ts` num commit próprio deixaria um commit com lockfile fora
  de sincronia ou com `ai.ts` importando pacote ausente.

## Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | "Checked 1076 files in 1888ms. No fixes applied", saída 0 |
| `pnpm turbo run typecheck` | 14/14, 13 em cache |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, paridade incluída |
| `pnpm audit --prod --audit-level=high` | saída 0; "4 low (1 ignored) \| 7 moderate \| 1 high (1 ignored)" |

Suítes Vitest não rodadas aqui (são do `/test`); ver item 1 da lista acima.

## Varredura de segredo

`docs/features/delivery-security-review/` não tem senha, token, chave nem e-mail real. O único endereço é
`qa-delivery-security-review@example.com` em `analyze/plan.md:593`, domínio reservado.

## Rodada 2: defeitos do `/test`

O `test/report.md` trouxe dois defeitos. As correções que ele sugeria entraram como hipótese e foram medidas
no que dava para medir sem subir app.

### 🟡 Redefinição de senha depois do `500 AUTH_SESSIONS_NOT_REVOKED`

- **Defeito:** com a revogação falhando, a senha nova já vale, mas
  `reset-password/components/ResetPasswordForm.tsx` tratava o 500 só com `errorAlert` e deixava o formulário
  preenchido. O reenvio usava o código já consumido e recebia `400` "Este link não é válido. Peça um novo.".
  Na rodada 1 isso estava no item 8 da lista do `/test`; o QA confirmou.
- **Correção:** quando `apiErrorCodeOf(error)` é `AUTH_SESSIONS_NOT_REVOKED`, o formulário sai de cena e a tela
  mostra o cartão com `resetPassword.success.title`, a cópia de `apiErrors.AUTH_SESSIONS_NOT_REVOKED` como
  descrição e o link "Ir para o login", como `ConfirmEmailChangeResult` já faz. O `onError` deixa de abrir o
  toast nesse caso, porque o cartão já diz a mesma coisa. Qualquer outro código segue com toast e formulário.
  Nenhuma chave nova de i18n: título e link já existiam nos três idiomas, e a cópia de `apiErrors` também.
- **Teste:** `apps/app/__tests__/resetPasswordForm.test.tsx` (jsdom), dois casos: o 500 com esse código
  mostra o título de sucesso, a cópia e o link para `/pt-br/sign-in`, sem `<form>` e sem toast; um `400` com
  outro código mantém o formulário e chama o `errorAlert` uma vez.
- **Medido:** `npx vitest run __tests__/resetPasswordForm.test.tsx __tests__/authFormsNoValidate.test.tsx`
  em `apps/app`: 2 arquivos, 4 testes verdes. Com o `ResetPasswordForm.tsx` de `c9b4d9c` no lugar (cópia e
  restauração conferida com `cmp`), o primeiro caso falha e o segundo passa; o teste prova a correção.

### ❌ `organizationOwnership.spec.ts`, linha 93

- **Sintoma (do QA):** depois do `ownerPage.reload()`, `getByText('Convites pendentes')` resolve para dois
  `<h2>`, um deles dentro de `BODY > DIV[hidden]#S:1`, e o `toBeVisible` quebra por strict mode em cerca de
  3 s. O log do app traz `Error: The destination stream errored while writing data`. Em `c9b4d9c` com
  `next` 16.4.3 o spec passou no CI.
- **O que a leitura mostra:**
  - Nada do diff toca a tela. `organization/page.tsx`, `OrganizationClient.tsx` e
    `OrganizationInvitationsTable.tsx` estão iguais a `c9b4d9c`. O CSP da `apps/app`
    (`packages/security/middleware.ts:82-88`) libera `'unsafe-inline'` sem nonce, então os scripts inline
    de troca do streaming rodam, e nem o CSP nem o `proxy.ts` da `app` mudaram.
  - O texto "Convites pendentes" só existe numa chave (`organization.invitations.title`), e só o `<h2>` de
    `OrganizationInvitationsTable.tsx:97` o renderiza. A segunda ocorrência só pode ser a cópia transmitida
    que o React deixa em `div[hidden]#S:N` até o script de troca rodar.
  - Release notes de `vercel/next.js`: a 16.4.4 traz #100619 (backport de #99963, "Reload on missed Turbopack
    startup CSS updates"). Em `next dev` com Turbopack, quando a versão de HMR gravada no HTML não bate com a
    do WebSocket, o cliente faz um reload completo da página. O E2E roda os três apps em `next dev`
    (`apps/e2e/playwright.config.ts:74-96`) e compila rotas a frio em dois contextos de browser ao mesmo
    tempo. Um reload desses no meio de um streaming explica o log do stream interrompido e um DOM de
    transição com cópia oculta. A 16.4.5 só tem correções de segurança; a 16.4.6 traz compressão automática
    de resposta de route handler (#101280) e correções de GC do Turbopack em dev.
- **Conclusão:** seletor frágil diante de um estado transitório de `next dev`, não regressão de produto. O
  `expect` do Playwright estoura strict mode na hora, sem esperar o DOM assentar, quando o locator acha dois
  elementos. Os outros `expect` do mesmo trecho usam `getByRole("row")`, que ignora nó oculto, e passaram. A
  causa do reload é hipótese de leitura: não subi app nem rodei o spec.
- **Por que não fixar outra versão:** a mudança suspeita entrou na 16.4.4, então fixar a 16.4.5 não a tira, e
  voltar para a 16.4.3 traz de volta as moderadas que a 16.4.5 corrige.
- **Correção:** `apps/e2e/tests/organizationOwnership.spec.ts:91-99` passa a usar
  `getByRole("heading", { name: organizationCopy.invitations.title, exact: true })` com `toBeVisible()`. A
  consulta por role descarta nó oculto, então a cópia em `#S:1` não conta, e o `expect` espera até 30 s pelo
  cabeçalho visível. O teste não afrouxou: se a troca do streaming nunca acontecer, nenhum cabeçalho visível
  aparece e o spec falha por tempo, o sinal certo de regressão de produto. A asserção ficou mais
  estrita, porque exige um heading com o nome exato.

### Gates da rodada 2

| Comando | Resultado |
|---------|-----------|
| `pnpm check` | "Checked 1077 files in 461ms. No fixes applied", saída 0 |
| `pnpm turbo run typecheck --filter=app --filter=e2e` | 2/2, nenhum em cache |
| `npx vitest run __tests__/resetPasswordForm.test.tsx __tests__/authFormsNoValidate.test.tsx` (`apps/app`) | 2 arquivos, 4 testes |

Paridade de i18n não rodada de novo: nenhuma chave mudou nesta rodada (o número continua 7 arquivos, 67
testes, da rodada 1).

### 👁 Verificar no `/test` (rodada 2)

1. **Spec da equipe.** `pnpm e2e tests/organizationOwnership.spec.ts` três vezes seguidas (JDK 21), verde
   nas três. Se falhar na linha 93 por tempo, e não por strict mode, a troca do streaming não está
   acontecendo: aí é regressão de produto, e o próximo passo é rodar o mesmo spec com `next` 16.4.3 para
   separar versão de máquina. Depois, o job `e2e` do CI nesta branch.
2. **Tela de equipe em produção.** `pnpm --filter app build && start`, entrar como dono, abrir
   `/pt-br/organization` e dar reload algumas vezes: "Convites pendentes" aparece uma vez, sem esqueleto
   preso. É o que separa o efeito de `next dev` de um defeito que chega ao usuário.
3. **Redefinição com a revogação falhando.** Mesma mutação temporária de `revokeUserSessionsOrThrow`.
   Enviar a senha nova em `/pt-br/reset-password?oobCode=<código>`: a tela vira o cartão "Senha alterada"
   com a cópia de `AUTH_SESSIONS_NOT_REVOKED` e o link "Ir para o login", sem formulário e sem toast. Repetir
   em `en` e `es`, e em light, dark e mobile. Login com a senha nova entra.
4. **Redefinição normal.** Sem a mutação, o fluxo continua terminando no cartão de sucesso com a descrição
   de sempre, e um código inválido continua mostrando o toast com o formulário.
5. **Suíte da `app` com saída 0** numa máquina sem carga, agora com `resetPasswordForm.test.tsx`.

### Lacunas de teste (rodada 2)

| Lacuna | Veredito |
|--------|----------|
| Redefinição de senha sem teste para o 500 de sessões não encerradas | Fechada aqui (`resetPasswordForm.test.tsx`) |
| `DELETE /auth/session` no orçamento padrão | Fechada pelo `/test` com o caso novo em `corsOrigin.test.ts`; o arquivo já estava no commit 8 |
| `rateLimitSubject` com o cookie de sessão real como bearer | Continua aberta, depende de `ARCJET_KEY` (🔒) |
| `rateLimitDegraded` e HTTP/2 | Continua aberta, coberta por `rateLimit.test.ts` |

### Observação sem ação

- A troca de senha pela aba Segurança tem o mesmo desenho: com o 500, o formulário continua preenchido, e
  reenviar falha porque a senha atual já mudou. O QA percorreu esse caminho no F1 e não o apontou; o toast
  diz que a alteração foi salva. Fica como observação.
- O `next dev` 16.4.6 grava `AGENTS.md` em `apps/api`, `apps/app` e `apps/web` (achado do QA). Decidir entre
  `agentRules: false` no `@repo/next-config` e uma entrada no `.gitignore` fica fora do corte desta feature.

### Plano de commits: o que mudou

- Dois commits novos depois do 11: o 12 (`fix(app)`, a redefinição de senha) e o 13 (`test(e2e)`, o seletor).
  O 12 depende do `apiErrorCode.ts` que entra no 11.
- Os antigos 12 a 15 viraram 14 a 17.
- O caso que o `/test` acrescentou em `apps/api/__tests__/corsOrigin.test.ts` vai no commit 8, que já lista o
  arquivo.
- O commit 17 (`docs(features)`) leva agora também `test/criterios-aceite.md` e `test/report.md`. A pasta
  `test/e2e/` é ignorada pelo git. Varri `test/`: só endereços `@example.com`, nenhuma senha, token ou chave.

## Plano de commits

O índice não está vazio: o rename `specs/app-internal-ux-polish.md` →
`docs/features/app-internal-ux-polish/spec.md` já está preparado e pertence ao commit 1.

| # | Mensagem | Arquivos |
|---|----------|----------|
| 1 | `docs(specs): audit the backlog and archive app-internal-ux-polish as done` | rename já preparado + `docs/features/app-internal-ux-polish/spec.md` (edições), `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/admin-own-account.md`, `specs/delivery-infra-hardening.md`, `specs/delivery-security-review.md`, `specs/social-sign-in-providers.md`, `docs/AUTH-SSO.md`, `docs/PRE-PRODUCTION.md` só o hunk da auditoria (`git apply --cached /tmp/sydney-review/pre-production-audit-hunk.patch`) |
| 2 | `chore: patch the production dependencies flagged by pnpm audit` | `package.json`, `pnpm-lock.yaml`, `apps/api/package.json`, `apps/app/package.json`, `apps/email/package.json`, `apps/web/package.json`, `packages/analytics/package.json`, `packages/auth/package.json`, `packages/internationalization/package.json`, `packages/next-config/package.json`, `packages/payments/package.json`, `packages/sdk/package.json`, `packages/security/package.json`, `packages/seo/package.json`, `packages/payments/ai.ts` (removido), `packages/payments/__tests__/aiToolkit.test.ts` (removido) |
| 3 | `feat(sdk): close the session payload to the fields the front-ends read` | `packages/sdk/src/actions/auth/action.ts` |
| 4 | `feat(security): add a standard rate limit budget keyed by address and actor` | `packages/security/index.ts`, `packages/security/__tests__/rateLimit.test.ts` |
| 5 | `feat(auth): add a session revocation that reports failure to the caller` | `packages/auth/server.ts`, `packages/auth/__tests__/serverSessionRevocation.test.ts` |
| 6 | `feat(next-config): stop sending the X-Powered-By header` | `packages/next-config/index.ts`, `packages/next-config/__tests__/config.test.ts` |
| 7 | `feat(api): answer the session user through a five-field allow-list` | `apps/api/(shared)/mappers/user.mapper.ts`, `apps/api/app/(routes)/auth/me/route.ts`, `apps/api/app/(routes)/auth/sign-in/route.ts`, `apps/api/app/(routes)/auth/sign-in/google/route.ts`, `apps/api/__tests__/authMeRoute.test.ts`, `apps/api/__tests__/authSignInRoute.test.ts`, `apps/api/__tests__/authSignInGoogleRoute.test.ts`, `apps/api/__tests__/mergedUserPayload.test.ts`, `apps/api/__tests__/userProfileSerialization.test.ts` |
| 8 | `feat(api): rate limit every mutating route with the standard budget` | `apps/api/proxy.ts`, `apps/api/(shared)/lib/rate-limit-subject.ts`, `apps/api/instrumentation.ts`, `apps/api/__tests__/corsOrigin.test.ts`, `apps/api/__tests__/rateLimitSubject.test.ts`, `apps/api/__tests__/rateLimitDegraded.test.ts` |
| 9 | `feat(api): answer an error when ending the sessions fails after a credential change` | `apps/api/(shared)/lib/session-revocation.ts`, `apps/api/app/(routes)/account/password/route.ts`, `apps/api/app/(routes)/account/password/set/route.ts`, `apps/api/app/(routes)/auth/password/reset/route.ts`, `apps/api/app/(routes)/auth/email-change/confirm/route.ts`, `apps/api/app/(routes)/account/sessions/revoke/route.ts`, `apps/api/__tests__/accountPasswordRoute.test.ts`, `apps/api/__tests__/accountPasswordSetRoute.test.ts`, `apps/api/__tests__/authPasswordReset.test.ts`, `apps/api/__tests__/authEmailChangeConfirm.test.ts`, `apps/api/__tests__/accountAuditTrail.test.ts` |
| 10 | `refactor(app): type the session user with the SDK payload` | `apps/app/lib/server/authSession.ts`, `apps/app/lib/server/panelSnapshot.ts`, `apps/app/shared/lib/googleSignInApi.ts`, `apps/app/shared/lib/postLoginNavigation.ts` |
| 11 | `feat(app): show a saved email change when only ending the sessions failed` | `apps/app/shared/lib/apiErrorCode.ts`, `apps/app/app/[locale]/(unauthenticated)/invite/hooks/useInvitation.ts`, `apps/app/app/[locale]/(unauthenticated)/invite/components/InvitationAcceptance.tsx`, `apps/app/app/[locale]/(unauthenticated)/verify-email/components/ConfirmEmailChangeResult.tsx`, `apps/app/__tests__/verifyEmailPage.test.tsx`, `apps/app/__tests__/accountApiErrorCopy.test.ts` |
| 12 | `fix(app): show the saved password when the reset could not end the other sessions` | `apps/app/app/[locale]/(unauthenticated)/reset-password/components/ResetPasswordForm.tsx`, `apps/app/__tests__/resetPasswordForm.test.tsx` |
| 13 | `test(e2e): find the pending invitations heading by role` | `apps/e2e/tests/organizationOwnership.spec.ts` |
| 14 | `feat(internationalization): add the AUTH_SESSIONS_NOT_REVOKED copy` | `packages/internationalization/translations/packages/shared/utils.ts` |
| 15 | `docs: describe the rate limit budgets, visible revocation and session allow-list` | `docs/SECURITY.md`, `docs/delivery/01-security-review.md`, `docs/PAYMENTS.md`, `docs/SUBPROCESSORS.md`, `docs/PRE-PRODUCTION.md` (o hunk restante, item 8) |
| 16 | `docs(claude): drop the Stripe agent toolkit from the payments-flow skill` | `.claude/skills/payments-flow/SKILL.md` |
| 17 | `docs(features): delivery-security-review` | `docs/features/delivery-security-review/` |

Corpo sugerido do commit 2: "Removes @stripe/agent-toolkit and packages/payments/ai.ts, which nothing imported,
in the same commit because the lockfile drops it together with the other bumps. @grpc/grpc-js 1.9 stays as a
documented audit exception (client-only, server advisories), with the reason and a review date in the root
package.json."

Título de PR sugerido: `feat: close the part 1 security review gaps in the core`.

**Commits realizados** (aprovados pelo usuário em 2026-11-23, junto com o pedido de PR):

- `dba25ad` docs(specs): audit the backlog and archive app-internal-ux-polish as done
- `47d07b7` chore: patch the production dependencies flagged by pnpm audit
- `c467aa2` feat(sdk): close the session payload to the fields the front-ends read
- `8d6864d` feat(security): add a standard rate limit budget keyed by address and actor
- `d9fc0f4` feat(auth): add a session revocation that reports failure to the caller
- `7ee1fcf` feat(next-config): stop sending the X-Powered-By header
- `45d16ac` feat(api): answer the session user through a five-field allow-list
- `306054d` feat(api): rate limit every mutating route with the standard budget
- `6d1996a` feat(api): answer an error when ending the sessions fails after a credential change
- `e0df000` refactor(app): type the session user with the SDK payload
- `8420170` feat(app): show a saved email change when only ending the sessions failed
- `1f45a58` fix(app): show the saved password when the reset could not end the other sessions
- `e9105dc` test(e2e): find the pending invitations heading by role
- `02b7972` feat(internationalization): add the AUTH_SESSIONS_NOT_REVOKED copy
- `51e1172` docs: describe the rate limit budgets, visible revocation and session allow-list
- `082c914` docs(claude): drop the Stripe agent toolkit from the payments-flow skill
- este registro entra no último commit, `docs(features): delivery-security-review`
