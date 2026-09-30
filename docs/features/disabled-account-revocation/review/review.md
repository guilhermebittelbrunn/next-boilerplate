# Revisão: disabled-account-revocation

Revisão do working tree em rodada autônoma do `/cycle`, feita por leitura de código e pelos gates estáticos.
Não subi app, não usei browser e não rodei a suíte de testes: isso fica com o `/test`.

## Branch

- Atual: `run-cycle-pipeline`, workspace do Conductor. Não é protegida, não tem upstream e não tem commit à
  frente de `origin/main`.
- Regex do `/review` sobre o nome atual: **`BRANCH INVALIDA: run-cycle-pipeline`**.
- Nome proposto: **`fix/disabled-account-revocation`**. Regex: `branch OK: fix/disabled-account-revocation`.
  Sem `project` porque o diff toca `packages/auth` e `apps/api`. `fix` porque corrige um achado 🔴 de segurança.
- O que fiz: nada. A política do `/cycle` proíbe criar ou renomear branch nesta rodada, e renomear a branch de
  um workspace do Conductor quebra o vínculo dele. Fica para o usuário decidir antes do primeiro commit (ver
  "Decisões em aberto").

## Revisão: `packages/auth/server.ts`, `apps/api/app/(routes)/users/[id]/route.ts`, testes e documentos

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum no código.

### 🟢 Sugestão / nit

- `specs/BACKLOG.md:86`, `:577`, `:598`: as âncoras de `users/[id]/route.ts` que o `PUT` novo deslocou
  (`:157`, `:158-167`, `:157-169`) estavam obsoletas. **Corrigido** para `:161`, `:162-171`, `:161-173`,
  conferidos com `cat -n` no arquivo final. Registrei a correção na tabela de âncoras do próprio `BACKLOG.md`.
- A decisão D7 do plano (o admin pode desativar a própria conta) dizia que o ponto ia para o backlog, e
  nenhuma etapa o registrou. **Corrigido**: entrou como 🟢 numa seção nova do `BACKLOG.md`, com
  `users/[id]/route.ts:87-126` e `UsersListClient.tsx:102-125`, e o placar de abertos passou de 82 para 83.
  Com a correção, o admin que se desativa perde o painel na hora, porque o bearer também cai.
- `docs/INCIDENT-RESPONSE.md:51`: a célula "Limite" ficou com uns 900 caracteres. O conteúdo confere com o
  código; não mexi.

### ✅ OK

- `packages/auth/server.ts:182`: `user.disabled || isMintedBeforeRevocation(...)` usa o `UserRecord` que o
  `getUser` de `:181` já carrega. Nenhuma ida nova ao Firebase, e `verifyIdToken` segue com um argumento só
  (`:180`). O arquivo manteve o número de linhas (`git diff --stat`: 3+ 3-), então nenhuma referência
  `server.ts:<n>` em `docs/` ou `specs/` saiu do lugar. Conferi `ROPA.md:69` (`:289-302`) e as do runbook.
- A JSDoc de `getCurrentUser` (`server.ts:168-171`) explica por que a checagem é manual: o Admin SDK só
  confere `disabled` com `checkRevoked`, que faz um segundo fetch. É restrição externa, em 2 linhas, sem citar o
  fluxo. Está dentro de `.claude/rules/code-comments.md`.
- `route.ts:124-126`: a revogação roda só com `disabled === true`, depois do `updateUser` (`:120-122`) e antes
  do `recordAuditEvent` (`:128`). O `404` (`:91-96`) e o `400` do parse (`:103-106`) retornam antes, e um
  `updateUser` que lança impede a revogação. `revokeUserSessions` (`server.ts:323-329`) engole a própria falha,
  como nas outras rotas que revogam. O bloqueio não depende dela, porque `getCurrentUser` recusa pela flag.
- Guard `requireAdminApi` mantido, sem código de erro novo (a conta desativada cai no `401 AUTH_INVALID_TOKEN`
  que já existe), sem i18n novo, sem env nova, e o contrato do SDK não mudou.
- Testes: mock na borda (`@repo/auth/server` e `firebase-admin/auth`), `vi.hoisted` antes do import, nenhum
  emulador. Com `disabled: true` e o token emitido depois da marca de revogação, o caso de
  `serverSessionRevocation.test.ts` prova que a recusa vem da flag e não de `tokensValidAfterTime`. A ordem
  `updateUser → revoke → audit` é conferida por sequência registrada.
- `docs/BACKUP.md:94` (`:173`, `userRepository.delete`) e `specs/observability-logging.md:65` (`:163`,
  `logEvent("payments", "admin-user-delete-billing-failed", ...)`) conferem com o arquivo final.
- `docs/INCIDENT-RESPONSE.md:51-52` e `specs/account-security-mfa.md:292-307`: todas as âncoras conferem
  (`route.ts:87`, `:117-122`, `:124-126`, `:120-126`; `server.ts:180-183`, `:284-302`, `:323-325`). O
  runbook deixa claro que a única medição contra projeto real é anterior à checagem de `disabled`.
- `/code-review` (nível baixo) sobre o diff: nenhum achado.

### 👁 Verificar no `/test`

1. **O bearer de uma conta desativada é recusado contra o projeto Firebase real.** É a afirmação que sustenta a
   entrega, e hoje só o teste de unidade com o Firebase mockado a cobre. Repro: com a credencial de
   `.claude/dev-credentials.local.md`, conta de QA identificável; emitir o ID token; como admin,
   `PUT /users/:id` com `{ "disabled": true }`; chamar uma rota com `requireCommonPanelApi` usando o bearer
   antigo. Esperado: `401 { "error": { "code": "AUTH_INVALID_TOKEN" } }`. Sem credencial, 🔒. O emulador não
   serve: sob emulador o `firebase-admin@13.6.0` confere `disabled` sozinho (`lib/auth/base-auth.js:119`).
2. **Reativar não devolve a sessão antiga.** Mesmo repro, depois `PUT /users/:id` com `{ "disabled": false }` e
   o mesmo bearer. Esperado: `401 AUTH_INVALID_TOKEN`, agora pela marca de revogação.
3. **Os números do handoff.** `@repo/auth` 112/112 e `api` 1031/1031, mais as duas mutações (condição de
   `server.ts:182` sem `user.disabled`: 2 falhas; chamada de `route.ts:125` removida: 2 falhas). O `/test`
   remede, porque a revisão não roda suíte.
4. **O usuário desativado com o app aberto vai para o sign-in e vê a mensagem certa.** O diff não muda UI, mas
   muda o que a API responde a uma aba já aberta: a próxima chamada passa a ser 401, e o SDK dispara o
   callback de 401 (`packages/sdk/src/client/base.ts:85-87`). Repro: desativar a conta com o app aberto,
   navegar e depois tentar entrar. Esperado: sign-in sem laço de redirecionamento e "Esta conta foi
   desativada." / "User disabled." / "Esta cuenta ha sido desactivada." (`translations/packages/auth/index.ts:14`,
   `:42`, `:71`). Opcional: o plano não prevê passada de browser.

Confirmado por leitura e fora desta lista: o handoff supunha que o bearer que cai no fallback
`getUserFromSessionCookie(bearer)` (`resolve-api-actor.ts:28`) não gera `console.error`. Não gera. Um ID
token tem `iss` `https://securetoken.google.com/<projeto>`, e o verificador de cookie de sessão espera
`https://session.firebase.google.com/` (`firebase-admin/lib/auth/token-verifier.js:295`, `:315`). A diferença
lança `INVALID_ARGUMENT` (`:227-248`), código `auth/argument-error` (`lib/utils/error.js:404`), que está em
`benignSessionCookieCodes` (`server.ts:126`). Se o `/test` fizer o item 1, basta olhar o log da API de
passagem.

## Correções aplicadas

| arquivo | o que mudou |
|---------|-------------|
| `specs/BACKLOG.md:86`, `:577` | `route.ts:157` → `:161` e `:158-167` → `:162-171` |
| `specs/BACKLOG.md:598` | `route.ts:157-169` → `:161-173` |
| `specs/BACKLOG.md:521-524` | linha nova na tabela de âncoras deslocadas, com a causa |
| `specs/BACKLOG.md:38-42`, `:479`, `:625` | registra que a correção do 🔴 está em execução como `disabled-account-revocation`, no working tree e sem PR; o 🔴 segue aberto |
| `specs/BACKLOG.md:550-552` e a seção nova em `:803` | achado 🟢 do admin que desativa a própria conta (D7 do plano); placar 82 → 83 |

Nenhuma correção em código.

**Por que o 🔴 continua aberto no `BACKLOG.md`.** Segui o padrão das rodadas anteriores. Na PR #28, o
`BACKLOG.md` saiu com o A2 ainda aberto e o `/spec --sync` seguinte o fechou depois do merge. A
`compliance-docs-kit` ficou `in-progress` enquanto estava só no working tree. Quem fecha achado é a auditoria,
contra `main` (D6 do plano). Marquei "em execução" com link para a feature. Isso deixa uma assimetria: a spec
`account-security-mfa.md` já diz "corrigido" no mesmo diff. Como os dois entram na mesma PR, a frase só vale
depois do merge, e a auditoria seguinte fecha o 🔴.

## Raio de impacto

Nenhum contrato público mudou: `getCurrentUser` segue `Promise<UserRecord | null>` e `PUT /users/:id` mantém
corpo e resposta. Quem sente a mudança de comportamento (conta desativada passa a `null`):

- `apps/api/(shared)/lib/resolve-api-actor.ts:24` e, por ele, `requireAdminApi` e `requireCommonPanelApi` em
  todas as rotas guardadas;
- `apps/api/(shared)/lib/user-merge.ts:35` (`getMergedUserFromIdToken`, usado por `GET /auth/me`);
- `packages/auth/middleware.ts:71` (`authMiddleware`, que nenhum app usa).

Impersonação: o ator é o admin e o token é dele, então personificar conta comum desativada continua possível
(P2 do plano).

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| `resolveApiActor` sem teste ponta a ponta com `getCurrentUser` real e conta desativada | **continua aberta**. `resolve-api-actor.ts` não tem arquivo de teste próprio; a cadeia é coberta em partes. Barato de fechar com `getAuthInstance` mockado; não bloqueia |
| `revokeUserSessions` lançando dentro do `PUT` | **fora de escopo**. A função engole a falha (`server.ts:326-328`), então a rota nunca vê o erro. Esse `catch` também não tem teste no pacote, e isso é anterior à tarefa |

Nenhuma lacuna nova.

## Decisões em aberto

1. **Branch antes dos commits.** A atual (`run-cycle-pipeline`) falha no regex. Recomendação: criar
   `fix/disabled-account-revocation` a partir da atual (`git switch -c fix/disabled-account-revocation`),
   sem renomear a do workspace, e commitar nela. Alternativa: commitar na atual e abrir a PR assim, como na
   PR #34 (`run-full-task-cycle-v2`). O `BACKLOG.md` estaciona esse ponto em E11.
2. **Rename já no índice.** `specs/compliance-docs-kit.md → docs/features/compliance-docs-kit/spec.md` está
   preparado desde a auditoria e pertence ao commit 4. Os três primeiros commits precisam começar com o índice
   vazio: ou `git restore --staged` nas duas pontas do rename antes do commit 1 e refazer o `git mv` no commit
   4, ou fazer o commit 4 primeiro. Recomendação: tirar do índice e refazer no commit 4, para manter a ordem
   do plano.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` (antes e depois das minhas edições) | `Checked 806 files … No fixes applied.` |
| typecheck | `pnpm turbo run typecheck --filter=@repo/auth --filter=api` | 2/2 tasks, saída 0 |
| paridade de i18n | não rodado | `packages/internationalization` não foi tocado |
| testes | não rodados (dono é o `/test`) | o handoff mediu `@repo/auth` 112/112 e `api` 1031/1031 |

## Segredo nos artefatos

Varri `docs/features/disabled-account-revocation/` e `docs/features/compliance-docs-kit/spec.md` atrás de
e-mail, senha e padrão de chave. Nada encontrado. Os únicos e-mails do diff são `owner@example.com`, no teste.

## Plano de commits

Mensagens em inglês. Antes do primeiro, `git diff --cached --stat` tem de sair vazio (ver decisão 2).

1. `fix(auth): reject disabled accounts when verifying an ID token`
   - `packages/auth/server.ts`
   - `packages/auth/__tests__/serverSessionRevocation.test.ts`
2. `fix(api): revoke sessions when an admin disables an account`
   - `apps/api/app/(routes)/users/[id]/route.ts`
   - `apps/api/__tests__/usersAdminAuditTrail.test.ts`
3. `docs: disabled accounts are cut off at once in the incident runbook`
   - `docs/INCIDENT-RESPONSE.md`
   - `docs/BACKUP.md`
4. `docs(specs): audit after PR #34 and close the disabled-account finding in its spec`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
   - `specs/compliance-docs-kit.md` (remoção, já no índice)
   - `docs/features/compliance-docs-kit/spec.md` (rename com as edições do working tree)
5. `docs(features): disabled-account-revocation`
   - `docs/features/disabled-account-revocation/STATE.md`
   - `docs/features/disabled-account-revocation/analyze/plan.md`
   - `docs/features/disabled-account-revocation/develop/handoff.md`
   - `docs/features/disabled-account-revocation/review/review.md`

Juntei a auditoria e as duas specs num commit só porque o `BACKLOG.md` mistura os dois assuntos no mesmo
arquivo (âncoras da tarefa e a rodada pós-PR #34), e separá-los exigiria `git add -p`.

Título de PR sugerido: `fix: disabled accounts lose API access immediately`. Depois do último commit, o
`/review` pergunta se deve rodar `git push -u origin <branch>`.

Commits realizados: _(preenchido pelo orquestrador)_
