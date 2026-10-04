# Handoff do `/develop`: sessões ativas da conta

Plano: [`analyze/plan.md`](../analyze/plan.md). Rodada autônoma do `/cycle --no-audit`, sem perguntas ao
usuário. As decisões da §12 do plano foram seguidas como estão, inclusive "encerrar as outras" valer na API
e nos front-ends sem revogar no Firebase. Nada foi commitado nem adicionado ao índice, e nenhuma branch foi
criada.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---|---|
| Tipos e ações do SDK (§3) | `packages/sdk/src/types/account/account.ts` (`AccountSessionDTO`, `AccountSessionDeviceType`, `AccountOtherSessionsRevoked`, `AccountDataExportSession`, `sessions` no export), `packages/sdk/src/types/audit/audit.ts` (2 ações), `packages/sdk/src/actions/account/action.ts` (`listSessions`, `revokeSession`, `revokeOtherSessions`), `packages/sdk/src/actions/auth/action.ts` (`sessionStanding`, `endSession`, timeout de 3 s) |
| Autoridade de sessão (§3.2) | `packages/sdk/src/client/sessionAuthority.ts` (`createSessionAuthority`, `isSessionRevokedError`), `packages/auth/types.ts` (`SessionStanding`, `SessionAuthority`) |
| `getIdTokenSession` (§4.2) | `packages/auth/server.ts`; `getCurrentUser` delega a ela |
| Rotas de cookie com autoridade e logout local (§5.1) | `packages/auth/session-routes.ts` |
| Provider trata `AUTH_SESSION_REVOKED` (§5.2) | `packages/auth/provider.tsx` (`handleSessionEnded(reason)`, `sessionEndReasonFor`) |
| Chave, user agent, mapper, repositório, rastreio (§4.3 a §4.6) | `apps/api/(shared)/lib/session-key.ts`, `.../lib/user-agent.ts`, `.../lib/session-tracker.ts`, `.../mappers/session.mapper.ts`, `.../repositories/session.repository.ts` |
| Resolução da credencial (§4.2) | `apps/api/(shared)/lib/resolve-api-actor.ts` (`resolveApiCredential`; `resolveApiActor` mantém a assinatura) |
| Rotas da API (§4.1, §4.7, §4.8) | `apps/api/app/(routes)/auth/session/route.ts`, `.../account/sessions/route.ts`, `.../account/sessions/[id]/route.ts`, `.../account/sessions/revoke-others/route.ts`, `apps/api/(shared)/validation/session.schema.ts` |
| Exclusão e exportação (§4.9) | `apps/api/(shared)/lib/account-erasure.ts` (passo `sessions` antes de `profile`), `.../lib/account-export.ts` (seção `sessions`) |
| Env da API (§13.4) | `apps/api/.env.example` (`SESSION_ABSOLUTE_MAX_AGE_DAYS=""`) |
| Autoridade nos front-ends (§6.1) | `apps/app/lib/server/sessionAuthority.ts`, `apps/web/shared/lib/sessionAuthority.ts`, as 3 rotas `app/api/auth/*` de cada app |
| Proxy da `apps/app` (§6.2) | `apps/app/proxy.ts` (`isEndedElsewhere`) |
| Painel na aba Segurança (§6.3) | `apps/app/shared/lib/queryKeys.ts` (`account.sessions`), `account/(hooks)/useListAccountSessions.tsx`, `account/(hooks)/useAccountSessionMutations.tsx`, `account/(components)/AccountSessionsPanel.tsx`, `account/(components)/AccountSecurityForm.tsx` |
| i18n (§7) | `translations/apps/app/pages/common/account.ts` (`security.sessions.*`, `messages.sessionRevoked`, `messages.otherSessionsRevoked`), `translations/packages/auth/index.ts` (`provider.session.revoked`), `translations/packages/shared/utils.ts` (4 códigos), `translations/apps/app/pages/admin/auditTrail.ts` (2 rótulos) |
| Docs (§13.2) | `docs/AUTH-SSO.md` (§Logout e passo 3 da validação), `docs/ROPA.md` (registro 2), `docs/SECURITY.md` (rotas fora do limite), `docs/PRE-PRODUCTION.md` (declaração nova) |

## Contrato e raio de impacto

- `AccountDataExportDTO` ganhou `sessions`. O único consumidor é o download em `useAccountDataRights.tsx`,
  que grava o JSON como veio (o plano já dizia isso; não remedi).
- `AuditAction` ganhou `ACCOUNT_SESSION_REVOKE` e `ACCOUNT_SESSIONS_REVOKE_OTHERS`. O dicionário da trilha
  é indexado por `AuditAction`, então os rótulos entraram nos 3 idiomas (`app` typecheck passou).
- `resolveApiActor(req): Promise<UserRecord | null>` não mudou de assinatura. Os testes que mockam o módulo
  continuam passando sem alteração.
- `sessionPOST`, `sessionRefreshPOST`, `customTokenPOST` e `sessionDELETE` ganharam parâmetros opcionais. Sem
  autoridade, gravam como antes; `sessionDELETE` não chama mais `revokeUserSessions` em caso nenhum.

## Códigos de erro novos

`AUTH_SESSION_REVOKED` (401), `ACCOUNT_SESSION_NOT_FOUND` (404), `ACCOUNT_SESSION_IS_CURRENT` (409),
`ACCOUNT_SESSION_UNIDENTIFIED` (409). Os quatro estão em `apiErrors` nos 3 idiomas e na lista de
`apps/app/__tests__/accountApiErrorCopy.test.ts`, que confere que nenhum cai na cópia genérica nem contém
o código (o teste passa nos 3 idiomas).

## Desvios em relação ao plano

1. **`packages/sdk` ganhou `vitest.config.mts` e o script `test`.** O plano pedia
   `packages/sdk/__tests__/sessionAuthority.test.ts`, mas o pacote não tinha Vitest configurado. O config
   copia o dos outros pacotes e acrescenta o alias `@repo` (o `base.ts` importa caminhos de
   `@repo/shared` que o `exports` dele não lista; os apps resolvem do mesmo jeito). Nenhuma dependência
   nova: o `vitest` já é da raiz. O turbo passa a rodar `@repo/sdk:test`.
2. **Sem `import "server-only"` nos `sessionAuthority.ts` da `apps/app` e da `apps/web`.** O pacote
   `server-only` não é dependência de nenhum dos dois apps (só da `packages/auth`), e acrescentá-lo seria
   dependência nova. O módulo não carrega segredo: usa `NEXT_PUBLIC_API_URL` e só é importado por rota e
   pelo proxy.
3. **Erro de carga da lista aparece dentro da tabela, não num `errorAlert`.** O texto traduzido do
   `error.code` vai para o `emptyText` da `Table`, com o botão de atualizar ativo. Um toast disparado na
   renderização repetiria a cada refetch. É o mesmo resultado visível que o plano pede (tabela vazia,
   mensagem traduzida, atualizar ativo).
4. **`sessions` no export tem `truncated`**, como as outras seções limitadas por `EXPORT_MAX_RECORDS`.
5. **`revoke` grava com `set(..., { merge: true })`.** Logout de uma sessão que a API nunca viu (aberta antes
   do deploy) precisa deixar registro, ou o outro front-end regravaria o cookie. Um `update` falharia com
   `NOT_FOUND` e o `DELETE /auth/session` responderia 500. O documento parcial leva `uid`, `sessionKey` e
   `signedInAt`, então aparece em `listByUid` e é apagado pela exclusão da conta.
6. **Teste do provider no `apps/app/__tests__/sessionExpiredSignOut.test.tsx`**, que já monta o
   `AuthProvider` real com Firebase e `fetch` mockados. Não extraí função pura.
7. **Teste a mais:** `apps/api/__tests__/sessionRepository.test.ts`, com Firestore falso em memória, cobre a
   semântica de merge (`createSeen` não apaga revogação paralela), `revokeOthers` e `purgeAllByUid`.
8. **Cópia em inglês usa "End" e não "Sign out"** no botão da linha e no "encerrar as outras", para não
   colidir com o "Sign out" do menu e seguir o "End sessions" que já existia.
9. **Ponteiros de linha corrigidos** em `docs/INCIDENT-RESPONSE.md`, `docs/SUBPROCESSORS.md`,
   `docs/RESEARCH-tanstack-vs-next.md`, `docs/ROPA.md` e `docs/SECURITY.md`: o `server.ts`, o
   `session-routes.ts` e o `resolve-api-actor.ts` mudaram de tamanho. Conferi cada linha nova com `sed -n`.
   A contagem de rotas de `/account` em `SECURITY.md` passou de "quatro das sete" para "sete das dez",
   contada com `find apps/api/app/(routes)/account -name route.ts | wc -l` → `10`.
10. **Dois testes existentes ganharam mocks**: `securityHeaders.test.ts` e `securityPolicySources.test.ts`
    importam o proxy, que agora importa `@repo/auth/session` (com `server-only`) e a autoridade.

Nenhuma decisão do plano foi considerada errada.

## Caminho degradado

| Situação | Comportamento | Instrumento |
|---|---|---|
| Firestore falha na leitura do rastreio | Requisição passa; log `[auth] session-check-failed reason=<nome>` sem uid | `sessionTracker.test.ts` ("deixa passar e registra quando a leitura falha"), `resolveApiActorSession.test.ts` ("deixa passar quando o Firestore não responde") |
| Firestore falha na escrita | Resposta não muda; log `session-touch-failed`; recusa da marca d'água mantida | `sessionTracker.test.ts` (2 casos) |
| API fora ou lenta ao gravar o cookie | `check` devolve `unknown` e o cookie é gravado | `sessionAuthority.test.ts` (401 de outro código, 500, 403, erro de rede, sem URL), `sessionRoutesAuthority.test.ts` (`unknown` grava em POST, refresh e custom-token) |
| API fora no logout | Cookie limpo mesmo assim | `sessionRoutesAuthority.test.ts` ("limpa o cookie mesmo quando a API falha"), `sessionAuthority.test.ts` ("swallows a failure") |
| Proxy com API sem resposta | Desvio para a home, como antes | `proxy.test.ts` ("still bounces home when the API confirms the session or does not answer") |

## Prova da recusa de sessão encerrada (sem emulador)

`apps/api/__tests__/resolveApiActorSession.test.ts` mocka o Firebase no Admin SDK (`firebase-admin/auth`),
não em `@repo/auth/server`: a credencial passa pela verificação real de `getIdTokenSession` e
`getSessionFromCookie`, e só o repositório de sessões é falso. Cobre ID token, cookie como bearer do SSR e
cookie como cookie.

Mutação, rodada com `npx vitest run` e revertida com cópia em `/tmp`:

- `resolveApiCredential` ignorando o resultado do rastreio → 4 de 10 testes falham em
  `resolveApiActorSession.test.ts`.
- Remoção de `if (record?.revokedAt) return "revoked"` em `trackSession` → 5 de 22 falham em
  `resolveApiActorSession.test.ts` + `sessionTracker.test.ts`.
- Restaurado → 22 de 22 passam.

## Validação

| Gate | Comando | Resultado |
|---|---|---|
| lint + typecheck + test | `pnpm turbo run lint typecheck test` (sem `--force`) | 29 de 29 tarefas, 0 em cache, 1m5,6s |
| Biome | `pnpm check` (depois das últimas edições de docs) | 837 arquivos, sem erro |
| Testes por workspace | `pnpm turbo run test --filter=...` (replay do cache) | `api` 88 arquivos / 1108 testes; `app` 93 / 779; `web` 13 / 82; `@repo/auth` 10 / 127; `@repo/sdk` 1 / 9; `@repo/internationalization` 6 / 59 (inclui paridade) |
| `test:emulator` | não rodado | A outra feature em paralelo usa as mesmas portas |

Não subi app, servidor de dev nem emulador. Não houve smoke.

## A verificar no `/test`

Nenhuma destas afirmações foi medida aqui.

1. **O proxy limpa o cookie de verdade.** `clearSessionCookie` vem de `packages/auth`, que fixa o Next
   15.1.3, e o proxy roda no Next 16 da `apps/app`. O teste unitário mocka `@repo/auth/session`. Repro:
   sessão B encerrada por A; em B, abrir `/pt-br/sign-in` e conferir `Set-Cookie: access-token=; Max-Age=0`
   na resposta do proxy e a página de login servida (não um 307 para `/pt-br`).
2. **Sem loop de redirect.** Repro: em B, abrir `/pt-br/entities` com a sessão encerrada e contar os
   redirects até a tela de login, com o aviso "Esta sessão foi encerrada." nos 3 idiomas.
3. **O login cria a sessão com o aparelho do navegador.** Repro: logar, `GET /account/sessions` e conferir
   `browser`/`os`/`deviceType` do navegador, não `null`.
4. **SSO entre app e web.** Repro do §10.5 do plano: logar no app, abrir a web, sair no app, recarregar a
   web; esperado `POST /api/auth/session` da web → `401 AUTH_SESSION_REVOKED`, logout local com aviso, e o
   app não volta logado.
5. **"Encerrar as outras" alcança sessão não vista.** Três contextos de navegador, logins espaçados em pelo
   menos 1 s.
6. **Personificação**: lista sem "Esta sessão", botões desabilitados, `DELETE` direto → 403.
7. **Tema e responsivo**: painel e diálogo em light, dark e 375 px; a `Table` antd segue o tema.
8. **`firestoreRules.emulator.test.ts`** passa a cobrir a coleção `session` pela descoberta automática do
   `super(db, "session"`. Rodar `pnpm --filter api test:emulator` (exige JDK 21).
9. **Latência**: +1 leitura por requisição autenticada. Não medida.

## Decisões em aberto e limitações

- **Dois logins explícitos no mesmo navegador.** Quem entra com senha no app e, separado, de novo na web,
  fica com duas sessões (duas chaves). Sair no app encerra a do cookie; o cliente Firebase da web ainda tem a
  própria sessão ativa e regrava o cookie na próxima carga, e o app volta logado pelo bootstrap. No fluxo
  normal (logar num e abrir o outro) a segunda origem herda a chave e o problema não aparece. Não tratei;
  fica para o usuário decidir se vale fechar.
- **O refresh token do aparelho encerrado segue válido no Firebase** (§8.1 do plano), registrado em
  `docs/PRE-PRODUCTION.md` e `docs/AUTH-SSO.md`. É a discordância que o plano já levou ao usuário.
- **Lista de sessões depende de `SESSION_ABSOLUTE_MAX_AGE_DAYS` igual na API e nos front-ends.**
  Documentado em `.env.example` da API e em `PRE-PRODUCTION.md`.

## Lacunas de teste conhecidas

- O `AccountSessionsPanel` não tem teste de tema nem de largura; fica com o `/test` (item 7).
- O `useAccountSessionMutations` é testado com `apiClient` mockado; o caminho axios → `FormattedError` real
  só aparece no teste do painel (erro de carga) e no `accountApiErrorCopy.test.ts`.
- O repositório é testado contra um Firestore falso. Consulta real só no `test:emulator` (item 8).
