# Revisão: devolução do e-mail ao desvincular a senha

Segunda tarefa da rodada autônoma do `/cycle`, na mesma PR de `google-sign-in-error-contract`. A revisão leu o
diff, o `develop/handoff.md` e o plano, e não subiu app nem rodou a suíte.

## Branch

- Atual: `guilhermebittelbrunn/cycle-command-v5`. Não passa no regex do `/review` e não foi alterada: a
  rodada autônoma não cria nem renomeia branch sem aprovação do usuário.
- Nome proposto para a PR das duas tarefas: `api/fix/google-sign-in-and-password-unlink`. O regex de
  `.claude/commands/review.md:115` respondeu `branch OK: api/fix/google-sign-in-and-password-unlink`. Ele
  substitui o `api/fix/google-sign-in-error-contract` proposto na primeira tarefa, que só descrevia metade da
  PR.
- `api/` porque o código das duas tarefas está todo em `apps/api`; `docs/SECURITY.md` e os commits de `specs/`
  e `docs/features/` não mudam o projeto da branch.
- A branch atual não tem upstream nem commit à frente de `origin/main`, então, aprovado o nome, o caminho é
  `git branch -m api/fix/google-sign-in-and-password-unlink`.

## Revisão: `DELETE /account/sign-in-methods/[id]` + `docs/SECURITY.md`

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/SECURITY.md:12` dizia que "o endereço a devolver está no evento `account.signInMethod.unlink` da
  trilha". `recordAuditEvent` engole a falha de escrita e só emite `[audit] write-failed`
  (`apps/api/(shared)/lib/audit-recorder.ts`, `recordAuditEvent`, bloco `catch`), então o evento pode não
  existir. Corrigido: a frase agora diz que o endereço fica no `targetLabel` do evento, gravado antes da
  devolução com o mesmo `requestId`, e que a linha `[audit] write-failed` com esse `requestId` avisa quando a
  gravação falhou. O resto da frase confere com o código: uma nova tentativa (`ADDRESS_RESTORE_ATTEMPTS = 2`,
  `route.ts:20`), revogação mesmo na falha (`:122`), `500 ACCOUNT_UPDATE_FAILED` (`:131-134`) e log com `uid` e
  `requestId`, sem o endereço (`:125-130`).

### 🟢 Sugestão / nit

- `packages/auth/server.ts:334`: `revokeUserSessions` faz `console.error("Error revoking user sessions:",
  error)` com o erro cru do Admin SDK, fora do padrão de `logEvent`, que recusa objeto justamente porque o erro
  pode carregar dado pessoal (`packages/shared/utils/helpers/log.ts:16-20`). Fora do escopo desta tarefa e sem
  edição aqui. Item de backlog para o `/spec --sync` registrar: trocar por
  `logEvent("auth", "revoke-sessions-failed", { uid, reason: adminAuthErrorReason(error) })`, ou equivalente
  em `packages/auth` (o `adminAuthErrorReason` mora em `apps/api`, então o pacote precisaria de um helper
  próprio). Severidade sugerida 🟢.
- `route.ts:42`: `restoreUnlinkedAddress` chama `getAuthInstance()` a cada tentativa, e a rota já tem `auth`
  em `:79`. O retorno é o mesmo singleton; sem efeito. Sem ação.

### ✅ OK

- Antes: a devolução do e-mail falhava uma vez e a rota respondia 500 sem revogar nada, com a senha já
  removida e a sessão aberta. Depois: duas tentativas sem espera (o Admin SDK já repete 503 e queda de conexão,
  como o JSDoc de `:30-34` diz), revogação sempre que a senha saiu, log na falha persistente e o mesmo 500.
- Revogação na falha persistente está certa. A conta segue com outro método (o 409 de `:72-77` garante pelo
  menos dois antes do desvínculo), então quem perde a sessão entra de novo pelo Google. A revogação acontece
  depois da última tentativa, e a ordem está fixada no teste (`invocationCallOrder`). Na próxima requisição,
  `getIdTokenSession` recusa o token emitido antes de `tokensValidAfterTime`
  (`packages/auth/server.ts`, `isMintedBeforeRevocation`).
- Log sem e-mail e sem mensagem crua. Os campos são `uid`, `requestId`, `reason` e `attempts`, e `reason` vem
  de `adminAuthErrorReason` (código do provedor ou `error.name`, nunca a mensagem). O caso de `:309` injeta uma
  mensagem que contém o e-mail e confere que nem o e-mail nem a mensagem aparecem em
  `logEventMock.mock.calls`.
- Teste reescrito (era `:252`, agora `:309`) fixa o contrato novo sem afrouxar. O antigo conferia 500,
  `ACCOUNT_UPDATE_FAILED`, a trilha com `changedFields: ["password"]` e a ausência de revogação. O novo mantém
  as três primeiras asserções, troca a quarta pelo inverso (revogação chamada, depois da última
  `updateUser`), fixa a lista exata de chamadas a `updateUser` e o objeto exato do log. O caso novo de `:293`
  prova que o desvínculo não é repetido; o de `:217`, que a segunda tentativa salva a requisição; o caminho
  feliz de `:192` ganhou a contagem de chamadas e a ausência de log.
- Trilha de auditoria inalterada: gravada antes da devolução com `targetLabel = ctx.user.email`
  (`route.ts:91-102`). A devolução só roda quando há e-mail, então o rótulo é sempre o endereço.
- Guard `requireCommonPanelApi`, recusa de personificação (`:57-62`), `error.code` existente, nenhum código
  novo em `apiErrors`. Comentários de `:30-34`, `:108-110` e `:119-121` explicam comportamento do Firebase, sem
  citar o fluxo.
- Testes do QA da tarefa anterior, lidos: `authSignInGoogleToolkit.test.ts` roda o Identity Toolkit real com
  `fetch` mockado e cobre a chave ausente fora do emulador, o `USER_DISABLED` no formato do provedor e a
  resposta sem sessão; `authSignInGoogleRoute.test.ts` ganhou as linhas `javascript:`, `ftp:` e
  `localhost:3000` no `it.each` de corpo, que fecham a lacuna aberta pela revisão da primeira tarefa. Nenhum
  achado.

### 👁 Verificar no `/test`

- Números do `/develop` (21/21 no arquivo, 105 arquivos e 1350 testes na api, 2 falhas com a rota de `HEAD`).
  Repro: `pnpm --filter api test`, `pnpm test` da raiz, e a troca da rota por
  `git show HEAD:"apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts"` rodando
  `pnpm --filter api exec vitest run __tests__/accountSignInMethodsRoute.test.ts` (esperado 2 falhas).
- A correlação que o `docs/SECURITY.md:12` promete (log e trilha com o mesmo `requestId`) não tem teste: todos
  os casos mandam a requisição sem cabeçalho e o log sai com `requestId: null`. Repro: no caso de `:309`, mandar
  `x-request-id` (o `REQUEST_ID_HEADER` de `@repo/shared/utils/helpers/request-id`) e conferir que
  `logEventMock` e `recordAuditEventMock` recebem o mesmo valor.
- Linha de log real (`[account] password-unlink-email-restore-failed uid=… reason=… attempts=2`): o teste
  mocka `logEvent`. Confirmado por leitura de `log.ts:51-57`; medir só se houver API de pé.
- 🔒 Sequência no navegador depois do 500 com a sessão revogada: o `onError` de `unlinkMutation`
  (`useSignInMethodMutations.tsx`) chama `refreshAccount`, que agora recebe 401, e o alerta de
  `ACCOUNT_UPDATE_FAILED` aparece antes da saída para o login. Exige injetar falha no Admin SDK entre o
  desvínculo e a devolução; sem isso, fica 🔒.

## Raio de impacto

- Contrato HTTP sem mudança: 204 no sucesso, `500 ACCOUNT_UPDATE_FAILED` na falha. Muda o efeito colateral:
  na falha persistente as sessões da conta acabam.
- `apps/app`: `useSignInMethodMutations.tsx`, `unlinkMutation.onError` faz `refreshAccount()` (invalida
  `queryKeys.account.me()`) e mostra o alerta. Antes o refetch trazia a conta sem a senha; agora o refetch
  responde 401 e a app sai para o login. Sem mudança de código.
- `packages/sdk`: `unlinkSignInMethod` igual. `packages/auth`: só consumido (`revokeUserSessions`).
- Logs: evento novo `password-unlink-email-restore-failed` no escopo `account`, já na lista fechada de
  `LogScope`.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `docs/SECURITY.md:12` | o endereço fica no `targetLabel` do evento gravado antes da devolução; a falha de gravação sai como `[audit] write-failed` com o mesmo `requestId` |

Antes: "O endereço a devolver está no evento `account.signInMethod.unlink` da trilha, gravado com o mesmo
`requestId`."
Depois: "O endereço a devolver fica no `targetLabel` do evento `account.signInMethod.unlink` da trilha, gravado
antes da devolução com o mesmo `requestId`; se essa gravação falhou, a linha `[audit] write-failed` com o mesmo
`requestId` avisa."

Nenhuma mudança de código.

## Lacunas de teste

| lacuna | veredito |
|--------|----------|
| Conta sem `email` no desvínculo da senha (handoff) | continua aberta; comportamento anterior mantido |
| Comportamento do Firebase que a rota supõe, medido só à mão (handoff) | continua aberta, fora da suíte |
| `requestId` igual no log e na trilha | nova, aberta por esta revisão; repro acima |

## Decisões em aberto

1. Nome da branch: `api/fix/google-sign-in-and-password-unlink`, a aplicar com `git branch -m` só com a
   aprovação do usuário.
2. `docs/SECURITY.md` em commit próprio, `docs: …`, e não junto do `fix(api)`. A regra de um commit por
   app/pacote separa `apps/api` de `docs/`, e a mudança do documento descreve as duas metades (código e
   trilha), não um arquivo da api.
3. `docs(features)` em dois commits, um por feature, para o histórico de cada slug sair num commit só dele.
4. O `console.error` de `packages/auth/server.ts:334` fica para o `/spec --sync` registrar no backlog.
   `specs/` não foi editado.

## Gates estáticos

| gate | resultado |
|------|-----------|
| `pnpm check` | não remedido: esta revisão só mudou `docs/SECURITY.md`, fora do escopo do Biome. Número do handoff: 936 arquivos, 0 erros |
| `pnpm --filter api typecheck` | não remedido, sem mudança de código aqui. Handoff: exit 0 |
| paridade i18n | não se aplica, nenhuma chave mexida |
| testes | não rodados (é do `/test`); handoff: 105 arquivos, 1350 testes |

## Working tree classificado (PR inteira)

| assunto | arquivos |
|---------|----------|
| auditoria do backlog | `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`, `specs/social-sign-in-providers.md` |
| Google sign-in | `apps/api/(shared)/validation/auth.schema.ts`, `apps/api/app/(routes)/auth/sign-in/google/route.ts`, `apps/api/__tests__/authSignInGoogleRoute.test.ts`, `apps/api/__tests__/authSignInGoogleToolkit.test.ts` |
| desvínculo da senha | `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`, `apps/api/__tests__/accountSignInMethodsRoute.test.ts` |
| documento de segurança | `docs/SECURITY.md` |
| artefatos | `docs/features/google-sign-in-error-contract/`, `docs/features/password-unlink-email-restore/` |

Nada mais no working tree. `git diff --cached --stat` saiu vazio. Varredura de segredo nos dois diretórios de
`docs/features/`: nenhuma senha, token ou chave; os e-mails são `@example.com`; o `test/report.md` da primeira
tarefa cita só os literais fictícios dos testes (`google-id-token`, `real-key`).

## Plano de commits (PR inteira)

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
   - `apps/api/__tests__/authSignInGoogleToolkit.test.ts`
3. `fix(api): retry the address restore after a password unlink and end sessions when it fails`
   - `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`
   - `apps/api/__tests__/accountSignInMethodsRoute.test.ts`

   Corpo sugerido:

   ```
   Unlinking the password makes Firebase clear the account's address, and the
   route puts it back. A single failure used to answer 500 and leave the
   session open with the password already gone.

   The restore now gets one more immediate try. Sessions are revoked whenever
   the password was removed, and a persistent failure logs
   password-unlink-email-restore-failed with uid, requestId, reason and
   attempts (never the address or the provider message) before answering
   500 ACCOUNT_UPDATE_FAILED.
   ```
4. `docs: describe the password unlink restore failure in SECURITY.md`
   - `docs/SECURITY.md`
5. `docs(features): google-sign-in-error-contract`
   - `docs/features/google-sign-in-error-contract/STATE.md`
   - `docs/features/google-sign-in-error-contract/analyze/plan.md`
   - `docs/features/google-sign-in-error-contract/develop/handoff.md`
   - `docs/features/google-sign-in-error-contract/review/review.md`
   - `docs/features/google-sign-in-error-contract/test/criterios-aceite.md`
   - `docs/features/google-sign-in-error-contract/test/report.md`
6. `docs(features): password-unlink-email-restore`
   - `docs/features/password-unlink-email-restore/STATE.md`
   - `docs/features/password-unlink-email-restore/analyze/plan.md`
   - `docs/features/password-unlink-email-restore/develop/handoff.md`
   - `docs/features/password-unlink-email-restore/review/review.md`
   - mais o que o `/test` desta feature gravar em `docs/features/password-unlink-email-restore/test/`

Título de PR sugerido: `fix(api): Google sign-in error codes and email restore on password unlink`. Push só
depois do último commit aprovado e com o "sim" do usuário.

### Commits realizados

(preenchido pelo `/review` depois de commitar)
