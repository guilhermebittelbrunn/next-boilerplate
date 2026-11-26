# Relatório de QA: falha da revogação de sessões nos chamadores restantes

Rodada autônoma do `/cycle`, 2026-11-26, branch `guilhermebittelbrunn/claude-cycle-full-pipeline` (não
protegida; o nome reprova no regex, e a troca é decisão do `/review`). Nenhum commit, nenhuma branch criada.

## Resumo

Os nove critérios funcionais passam. O décimo, se o Firebase revoga os refresh tokens quando o e-mail volta no
desvincular, segue 🔒 sem medição. Criei dois testes de componente para as duas afirmações de tela que a
revisão deixou para cá, e os dois reprovam quando o comportamento some. Nenhum defeito de produção.

O `pnpm test` da raiz saiu com código 1, mas nenhum teste falhou: o vitest da `api` não conseguiu iniciar três
workers (`[vitest-pool]: Timeout starting forks runner`) com a máquina em load average 22 em 8 núcleos, carga
de outros processos (navegadores de outras sessões), não desta rodada. A mesma `api` passou 130 arquivos e
1859 testes nessa execução e isolada. O turbo abortou o `app:test` junto; rodei a suíte do app e o
`test:emulator` da API separados, e os dois passaram. Recomendo repetir o `pnpm test` da raiz com a máquina
ociosa antes do PR.

## Cobertura executada

| comando | resultado |
|---------|-----------|
| `pnpm --filter api test` (primeira coisa, depois do reuso de `adminErrorCodeOf` pelo revisor) | 130 arquivos, 1859 testes, todos passam, 17 s |
| `npx vitest run` nos 9 arquivos afetados da API (`accountSignInMethodsRoute`, `usersAdminAuditTrail`, `usersAdminArchiveAccess`, `userMergeArchivedProfile`, `authEmailChangeConfirm`, `accountErasure`, `usersAdminDeleteBilling`, `googleSignInProfile`, `welcomeNotification`) | 9 arquivos, 142 testes, todos passam |
| `pnpm --filter app test` antes dos testes novos | 152 arquivos, 1371 testes, todos passam |
| `pnpm --filter app test` depois dos testes novos | 154 arquivos, 1378 testes, todos passam |
| `pnpm --filter @repo/internationalization test` (paridade, inclui `apiErrors`) | 7 arquivos, 67 testes, todos passam |
| `pnpm --filter app typecheck` | sem erro |
| `npx biome check` nos dois arquivos de teste novos | sem erro |
| `pnpm test` (raiz, sem `--force`, JDK 21 via `JAVA_HOME`) | saída 1. 12 de 14 tasks ok, 4 do cache. `api#test`: 1859/1859 passam, 3 erros de pool por timeout de inicialização de worker. `app:test` abortado pelo turbo. Pacotes: shared 63, security 65, payments 19, next-config 38, internationalization 67, e2e 38, auth 201, sdk 15, email 209, design-system 172, analytics 41, web 315 |
| `pnpm --filter api test:emulator` (JDK 21), isolado porque a raiz abortou antes | 8 arquivos, 274 testes, todos passam |

O reuso de `adminErrorCodeOf`/`adminAuthErrorReason` em `session-revocation.ts` foi conferido lendo as duas
funções: para erro com `code` string, o log recebe `{ code }`; sem código, `{ reason: error.name }`, ou
`"unknown"` quando o valor não é `Error`. É o mesmo contrato de `authErrorFields` do pacote. Os três testes que
travam o payload (`accountSignInMethodsRoute`, `authEmailChangeConfirm`, `usersAdminAuditTrail`) passam.

## Testes criados

| arquivo | o que prova | prova de reprovação |
|---------|-------------|---------------------|
| `apps/app/__tests__/usersListSessionsNotRevoked.test.tsx` | Renderiza `UsersListClient` com `useUserCrud` e `useListUsers` reais e o `apiClient` mockado. Com `USERS_SESSIONS_NOT_REVOKED`, o switch da linha passa de `aria-checked="true"` para `"false"` e fica assim, o alerta traz a copy do idioma (pt-br, en, es) e o `PUT` sai uma vez. Com `ACCOUNT_UPDATE_FAILED`, o switch volta a `"true"`. | Com `useUserCrud.tsx` trocado temporariamente pela versão do `HEAD`: 3 falhas (os três idiomas, `expected 'true' to be 'false'`), o caso de outro código passa. Arquivo restaurado da cópia e conferido com `cmp`. |
| `apps/app/__tests__/accountSignInMethodsSessionsNotRevoked.test.tsx` | Renderiza `AccountSignInMethodsPanel` com o hook real. Desvincular a senha e receber `500 AUTH_SESSIONS_NOT_REVOKED` não chama `signOut`, não mostra sucesso, invalida `queryKeys.account.me()` e mostra a copy de `AUTH_SESSIONS_NOT_REVOKED` no idioma (pt-br, en, es). | O código do painel não mudou nesta tarefa, então a prova é por mutação em `useSignInMethodMutations.tsx`. Sem o `refreshAccount()` no `onError` do desvincular: 3 falhas. Com o `mutationFn` engolindo o erro, que reproduz o 204 que a rota devolvia antes: 3 falhas (o alerta de erro não sai). Arquivo restaurado e conferido com `cmp`. |

Os dois arquivos são de app. O da lista acompanha o commit 20 do plano do `/review`; o do painel pode ir no
mesmo commit ou num `test(app)` logo depois, já que o painel de métodos não mudou nesta tarefa.

## Critérios de aceite

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | Desvincular a senha com revogação recusada responde 500 `AUTH_SESSIONS_NOT_REVOKED` | PASS | rota (`accountSignInMethodsRoute.test.ts`, inclui payload do log sem e-mail) + componente novo (tela não desloga, recarrega, copy nos 3 idiomas) |
| 2 | Falha da devolução do e-mail continua prevalecendo | PASS | rota (`mantém 500 ACCOUNT_UPDATE_FAILED quando a devolução do e-mail e a revogação falham`) |
| 3 | Desvincular sem falha segue respondendo 204 | PASS | rota (Google 204 sem revogar; impersonação 403 `AUTH_REQUEST_IMPERSONATION_FORBIDDEN`) + componente existente (`desvincular a senha encerra a sessão`) |
| 4 | Admin desativa e a revogação falha | PASS | rota (`usersAdminAuditTrail.test.ts`, ordem `updateUser → revoke → audit`) |
| 5 | Toggle mantém "desativado" quando só a revogação falhou | PASS | hook (`useUserCrudSessionsNotRevoked.test.tsx`) + componente novo (switch renderizado) + rota (`does not revoke when re-enabling`) |
| 6 | Arquivar com revogação recusada não arquiva | PASS | rota (`usersAdminArchiveAccess.test.ts`: 503 sem soft delete nem auditoria; retry arquiva; conta sumida arquiva) |
| 7 | Conta arquivada no primeiro contato continua sem perfil | PASS | unit (`userMergeArchivedProfile.test.ts`) |
| 8 | Expurgo não muda | PASS | composição de `accountErasure.test.ts` (ordem `revokeSessions` antes de `authAccount`) e `serverSessionRevocation.test.ts` (`revokeUserSessions continua engolindo a recusa e registrando o código`) |
| 9 | Mensagem nova nos três idiomas | PASS | paridade de i18n; os testes de hook e de componente leem a copy de cada idioma |
| 10 | Firebase revoga os refresh tokens ao devolver o e-mail | 🔒 não verificado | exige emulador de Auth com a devolução real; fora deste `/test` |

## Decisões de custo de teste

- Nenhum teste da faixa cara. O objeto desta tarefa é a decisão da rota e da UI diante da recusa, e o emulador
  de Auth não recusa `revokeRefreshTokens` sob demanda.
- Rotas tocadas (`account/sign-in-methods/[id]`, `users/[id]` `PUT` e `DELETE`) e `account-access.ts`,
  `user-merge.ts`: os testes de rota e unit do `/develop` já cobriam status, ordem, auditoria e log. Não criei
  teste de API.
- UI: a revisão pediu prova de renderização, não só de cache. Os dois testes de componente ficam na faixa
  barata (jsdom, `apiClient` mockado, `Table` substituído por um render simples das colunas).

## Verificar no `/test`

| item do `review.md` | veredito |
|---------------------|----------|
| Painel de métodos com `500 AUTH_SESSIONS_NOT_REVOKED` não sai da conta, recarrega e mostra a mensagem | **Confirmado** pelo teste de componente novo, nos três idiomas |
| Switch da lista continua desligado depois do 500 | **Confirmado** pelo teste de componente novo: `aria-checked` passa a `"false"` e fica |
| Firebase revoga os refresh tokens ao receber o e-mail de volta | 🔒 não verificável aqui; exige emulador ou projeto de dev com sessão real |
| Rodar os testes novos e afetados e as suítes dos dois apps | **Confirmado**: API 1859/1859, afetados 142/142, app 1378/1378 |

## Por que não abri browser

A recusa de `revokeRefreshTokens` não acontece em dev sem alterar código: o emulador de Auth não falha a
chamada, e apagar a conta gera `auth/user-not-found`, que o `PUT` já recusa no `updateUser`. Sem a recusa, a
tela mostra o fluxo de sempre, que esta tarefa não mudou. Os dois comportamentos de tela ficam provados pelos
testes de componente. Tema e responsivo não mudaram: o diff não toca layout nem estilo, só o ramo de erro do
toggle.

## Ambiente

- Não subi app, API nem emulador manualmente. O `test:emulator` sobe e derruba os emuladores dele.
- Portas 8080, 9099, 9199, 4001, 4400 e 4500 livres antes e depois das execuções com emulador.
- Nenhuma conta criada, nenhum dado de dev alterado.

## Lacunas

| lacuna herdada | veredito |
|----------------|----------|
| Teste de componente do painel de métodos com `AUTH_SESSIONS_NOT_REVOKED` (handoff e review) | **Fechada** por `accountSignInMethodsSessionsNotRevoked.test.tsx` |
| Switch renderizado depois do 500 (review) | **Fechada** por `usersListSessionsNotRevoked.test.tsx` |
| `PUT` com `disabled: true` e `updateUser` recusado | **Fora de escopo**; comportamento anterior, coberto por `does not revoke when Firebase Auth fails` |
| Repetição do `PUT` no 500 | **Fechada** pelo `/review` lendo o SDK; o teste novo também conta um único `update` |
| Firebase revoga tokens ao devolver o e-mail | **Aberta** (🔒), pergunta 3 do plano |
| `pnpm test` da raiz verde numa execução só | **Aberta**: repetir com a máquina ociosa; as partes rodadas separadas passaram |
