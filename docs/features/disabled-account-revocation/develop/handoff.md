# Handoff do develop: disabled-account-revocation

Implementação do `analyze/plan.md` em rodada autônoma do `/cycle`. Sem branch e sem commit: tudo está no
working tree. As mudanças da auditoria que já estavam lá (`specs/BACKLOG.md` e o rename
`specs/compliance-docs-kit.md` → `docs/features/compliance-docs-kit/spec.md` no índice) não foram tocadas, e
nada foi para o índice (`git diff --cached --stat` mostra só esse rename).

## Blueprint → arquivos

| Item do plano | Arquivos |
|---------------|----------|
| §13.1 `getCurrentUser` recusa `disabled` | `packages/auth/server.ts`: condição da linha 182 vira `user.disabled \|\| isMintedBeforeRevocation(...)`; a JSDoc de `getCurrentUser` (168-172) ganhou o porquê da checagem manual e perdeu o `@returns`, que repetia o tipo |
| §13.2 `PUT /users/[id]` revoga ao desativar | `apps/api/app/(routes)/users/[id]/route.ts`: import de `revokeUserSessions` e chamada em `:124-126`, depois do `updateUser` (`:120-122`) e antes do `recordAuditEvent` |
| §13.3 testes do `server.ts` | `packages/auth/__tests__/serverSessionRevocation.test.ts`: `userRecord()` ganhou o parâmetro opcional `disabled` e há um `describe` novo com 5 casos |
| §13.3 testes da rota | `apps/api/__tests__/usersAdminAuditTrail.test.ts`: mock de `@repo/auth/server` passou a exportar `revokeUserSessions` e há um `describe` novo com 9 casos (3 deles num `it.each`) |
| §13.4 runbook | `docs/INCIDENT-RESPONSE.md`: linhas 51 e 52 reescritas; a linha 50 não precisou mudar (`server.ts:180-183`, `:298-301` e `:323-325` continuam certos) |
| §13.4 spec | `specs/account-security-mfa.md`: a seção "Achado ligado à fatia 2" virou registro de correção, com os dois pontos de código e a nota do emulador resumida |
| fora do plano | `docs/BACKUP.md:94` e `specs/observability-logging.md:65` (ver Desvios) |

## Contrato

Nada muda no `@repo/sdk`: `PUT /users/:id` mantém corpo e resposta. A assinatura de `getCurrentUser`
continua `Promise<UserRecord | null>`. Quem sente a mudança são os chamadores listados na §4.1 do plano:
`resolveApiActor` (e, por ele, `requireAdminApi` e `requireCommonPanelApi`), `POST /auth/email-verification/send`,
`GET /auth/me`, `getMergedUserFromIdToken` e o `authMiddleware` do pacote, que nenhum app usa.

## Códigos de erro novos

Nenhum. A conta desativada recebe o `401 AUTH_INVALID_TOKEN` de sempre, que já tem texto nos 3 idiomas.
Nenhuma chave de i18n foi criada.

## Desvios

1. **Comentário na JSDoc, não acima do `if`.** O plano deixava a critério um comentário de uma linha acima do
   `if`. Na primeira versão pus duas linhas ali, e isso deslocava em +2 tudo o que vem depois da linha 182 de
   `server.ts`, deixando obsoletas referências em `docs/ROPA.md:69`, `docs/SUBPROCESSORS.md:32`,
   `specs/account-security-mfa.md:31,195` e em várias linhas de `specs/BACKLOG.md`. A D2 do plano existia
   justamente para não mover essas linhas. Troquei a linha do resumo da JSDoc de `getCurrentUser` pelo porquê e
   tirei o `@returns`: o arquivo manteve o número de linhas (`git diff --stat packages/auth/server.ts` → 3+ 3-),
   e a condição continua em `:182`.
2. **Duas referências corrigidas fora da lista do plano.** A chamada nova acrescenta 4 linhas a
   `users/[id]/route.ts` a partir da 123. Conferi com `grep` todas as citações `route.ts:<n>` em `docs/` e
   `specs/`: fora do `BACKLOG.md`, só duas apontavam para depois da 123. `docs/BACKUP.md:94` passou de `:169`
   para `:173` (`userRepository.delete`) e `specs/observability-logging.md:65` de `:159` para `:163`
   (`logEvent("payments", "admin-user-delete-billing-failed", ...)`). Conferi as duas com `sed -n` no arquivo
   final.
3. **`specs/BACKLOG.md` ficou com referências obsoletas e não foi editado**, pela D6 do plano e porque a
   auditoria desta rodada já está com ele aberto. As citações de `users/[id]/route.ts` posteriores à linha 123 nas
   linhas `84`, `569` e `590` do `BACKLOG.md` saíram do lugar (todas citam `:157` ou `:157-169`, que agora é
   `:161`/`:161-173`). Fica para o `/spec --sync`, que também fecha o 🔴 da linha 617.

Nenhuma decisão do plano estava errada. A §8 dizia que o teste existente `records the names of the fields that
changed` quebraria sem o export novo no mock; não medi isso, porque acrescentei o export antes de rodar.

## Decisões em aberto

Nenhuma nova. As três perguntas da §11 do plano (código de erro próprio, impersonação de conta desativada,
revogar na reativação) seguem com a opção adotada lá.

## Validação (medida neste checkout)

| Gate | Comando | Resultado |
|------|---------|-----------|
| testes do pacote | `pnpm --filter @repo/auth test` | 9 arquivos, 112 testes, todos passando (`serverSessionRevocation.test.ts`: 14, eram 9) |
| testes da API | `pnpm --filter api test` | 78 arquivos, 1031 testes, todos passando (`usersAdminAuditTrail.test.ts`: 18, eram 9) |
| typecheck | `pnpm --filter @repo/auth typecheck` e `pnpm --filter api typecheck` | saída 0 nos dois |
| lint | `pnpm check` | "Checked 806 files … No fixes applied.", saída 0 |
| paridade de i18n | não rodado | `packages/internationalization` não foi tocado |
| mutação em `server.ts` | condição trocada de volta para `if (isMintedBeforeRevocation(decodedToken, user))` + `pnpm --filter @repo/auth exec vitest run __tests__/serverSessionRevocation.test.ts` | 2 falhas, 12 passam: "recusa o id token de uma conta desativada" e "recusa mesmo com o token emitido depois da revogação". Rodado duas vezes, a segunda já com o código final. Arquivo restaurado depois |
| mutação na rota | `await revokeUserSessions(...)` trocado por `(void 0);` + `pnpm --filter api exec vitest run __tests__/usersAdminAuditTrail.test.ts` | 2 falhas, 16 passam: "revokes the target's sessions after disabling it in Firebase Auth" e "revokes when disabling together with other edits". Arquivo restaurado depois |

Nenhum teste de emulador foi escrito nem rodado. Não subi app nem browser.

Dos casos novos de `server.ts`, só os dois de recusa caem na mutação. "não registra erro", "aceita a conta com
`disabled: false`" e "verifica o token sem pedir a checagem de revogação" passam com e sem a correção, porque
protegem o que a correção não pode quebrar (log, conta ativa, nenhuma ida extra ao Firebase), e não a
correção em si. Do lado da rota, os casos "does not revoke" passam sem a chamada por construção.

## A verificar no `/test`

- **Bearer de conta desativada recusado contra o projeto Firebase real.** A cobertura atual é de unidade com
  o Firebase mockado. Repro: conta de QA, bearer emitido, `PUT /users/:id` com `{ "disabled": true }` como
  admin, depois uma rota com guard usando o bearer antigo → esperado `401 { error: { code: "AUTH_INVALID_TOKEN" } }`.
  Reativar com `{ "disabled": false }` e repetir com o mesmo bearer → esperado `401`. Precisa de credencial em
  `.claude/dev-credentials.local.md`; sem ela, 🔒. O emulador não serve (§1.2 do plano).
- **Fallback do `resolveApiActor` sem log de erro.** Com a conta desativada, o bearer cai em
  `getUserFromSessionCookie(bearer)`. Suponho que o `verifySessionCookie` de um ID token lance
  `auth/argument-error`, que está em `benignSessionCookieCodes`, sem `console.error`. Não medi. Repro: o mesmo
  cenário acima, olhando o log da API.
- **Sign-in mostra "Esta conta foi desativada."** nos 3 idiomas ao tentar entrar com a conta desativada. As
  chaves já existem; o comportamento na tela não foi medido por mim.

## Lacunas de teste conhecidas

- Não há teste de `resolveApiActor` ponta a ponta com `getCurrentUser` real e conta desativada: os testes de
  rota mockam `resolveApiActor`. A cadeia `getCurrentUser → null → 401` é coberta por partes (`server.ts` de
  um lado, guards com `resolveApiActor` mockado do outro).
- A ordem `updateUser → revokeUserSessions → recordAuditEvent` é provada com os três mocks registrando a
  sequência. Nenhum teste cobre `revokeUserSessions` lançando, porque a função real engole a própria falha
  (`server.ts:323-329`).
