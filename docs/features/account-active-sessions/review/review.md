# Revisão: sessões ativas da conta

Rodada autônoma do `/cycle --no-audit`. Diff lido contra `e791d3a` (`origin/main`), com os arquivos não
rastreados. A revisão leu código e rodou só gates estáticos: não subiu app, emulador nem browser, e não rodou
a suíte de testes.

## Branch

`feat/account-active-sessions`, criada nesta etapa com `git switch -c` a partir do HEAD destacado em
`e791d3a`. O prefixo de projeto foi omitido porque a feature cruza `apps/api`, `apps/app` e `apps/web`.
Antes de criar, `git branch --list` e `git ls-remote --heads origin` não acharam branch com
`active-sessions` nem `account-sessions` no nome. Regex de `.claude/agents/revisor-codigo.md`:
`branch OK: feat/account-active-sessions`. Nada foi levado ao índice (`git diff --cached --stat` vazio).

## Achados

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `docs/SUBPROCESSORS.md:33` (linha 2, Cloud Firestore): a coluna "Dado de usuário que sai" listava as
  coleções com dado pessoal e não citava a coleção nova `session`, que guarda navegador, sistema, tipo de
  aparelho e os instantes de login e de último uso. O `ROPA.md` já registrava; o inventário de
  subprocessadores ficava mentindo por omissão. Corrigido: `session` entrou na lista, e
  `session.repository.ts:49` entrou em "Onde no código".
- `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountSecurityForm.tsx:54-55`:
  o comentário dizia que "o Firebase não revoga sessões seletivamente, então as duas ações abaixo encerram a
  atual também". Com o painel de sessões inserido entre o formulário e o bloco "Sair de todos", "as duas ações
  abaixo" passou a incluir, na leitura, um painel que encerra sessão seletivamente e mantém a atual.
  Reescrito para nomear as duas ações (troca de senha e "sair de todos") e a restrição do Firebase que as
  obriga a derrubar a sessão atual.

### 🟢 Sugestão / nit

- `apps/api/(shared)/lib/account-erasure.ts:123-129`: o passo `sessions` roda antes de `authAccount`. Uma
  requisição com credencial ainda válida que chegue entre os dois passos passa por `trackSession` e recria o
  documento da sessão (`createSeen`), que sobra depois que a conta some no Firebase. A janela é curta e o
  documento não tem e-mail nem nome, mas é dado pessoal residual. Mover `sessions` para depois de
  `authAccount` fecharia a janela, porque sem a conta a credencial não verifica. Muda a ordem do relatório de
  exclusão e o `accountErasure.test.ts`, então ficou como sugestão.
- `apps/api/(shared)/repositories/session.repository.ts:66-79` e `session-tracker.ts:34-45`: a coleção
  guarda um documento por login e não apaga os encerrados (de propósito, ver `PRE-PRODUCTION.md`).
  `listByUid` lê todos a cada sessão nova e a cada abertura da lista. Para um fork com muitos logins por
  conta isso cresce sem limite. Hoje não pesa.
- `AccountSessionsPanel.tsx:140-146`: "Encerrar as outras sessões" fica desabilitado quando a lista não tem
  outra sessão. Uma sessão que a API nunca viu (aberta antes do deploy) não aparece na lista, e o titular não
  consegue cobri-la pela marca d'água. Na prática toda sessão nova passa por `GET /auth/session` antes de
  gravar o cookie, então o caso fica restrito à transição do deploy.
- `apps/app/lib/server/sessionAuthority.ts` e `apps/web/shared/lib/sessionAuthority.ts` sem
  `import "server-only"` (desvio 2 do handoff). Aceito: o módulo não carrega segredo, lê
  `process.env.NEXT_PUBLIC_API_URL` como o `apiServerClient.ts:24` já faz, e só é importado por rota e pelo
  proxy (`rg` confirmou).

### ✅ OK

- Recusa nos dois transportes. `resolveApiCredential` (`resolve-api-actor.ts:57-79`) passa ID token, cookie
  como bearer e cookie como cookie pela mesma consulta ao rastreio, e `resolveApiActor` devolve `null` para
  sessão encerrada. Os dois guards (`common-panel.ts:36`, `admin.ts:34`), `/auth/me` e
  `/auth/email-verification/send` usam `resolveApiActor`. Fora dele, só `getMergedUserFromIdToken`
  (`user-merge.ts:29`) chama `getCurrentUser`, e não tem chamador.
- Fail-open só onde o plano declara: leitura do Firestore que falha deixa passar (`session-tracker.ts:97-111`),
  escrita que falha mantém a recusa da marca d'água (`:64-82`), API sem resposta vira `unknown` e o cookie é
  gravado (`sessionAuthority.ts:46-59`, `session-routes.ts:61-78`). Credencial sem `auth_time` nem
  `sessionAuthTime` passa sem chave (`resolve-api-actor.ts:65-68`), caso que o Firebase não produz.
- Ownership. `DELETE /account/sessions/[id]` monta o id do documento com `ctx.user.uid`
  (`session-key.ts:21-23`), então id de outra pessoa só pode errar e responde 404. Id malformado cai no
  `parseSessionId` (Zod, `session.schema.ts:4-10`) e também responde 404. A sessão atual responde
  `409 ACCOUNT_SESSION_IS_CURRENT`.
- Personificação. `DELETE` e `POST` caem no `assertReadOnlyWhileImpersonating` do guard antes do handler
  (`impersonation-read-only.ts:19-31`). O `GET` lista as sessões do titular sem marcar nenhuma como atual e
  usa o `tokensValidAfterTime` dele (`account/sessions/route.ts:11-27`). O painel desabilita os botões
  (`AccountSessionsPanel.tsx:98`, `:142-146`).
- "Sair de todos" continua revogando no Firebase: `POST /account/sessions/revoke` chama `revokeUserSessions`
  (`account/sessions/revoke/route.ts:8`), acionado por `useAccountMutations.tsx:63`. O `sessionDELETE`
  (`session-routes.ts:174-183`) deixou de revogar e só pede à API para marcar a sessão como `signed-out`. A
  troca de senha também segue revogando (`account/password/route.ts:66`).
- `proxy.ts` sem loop: numa rota pública com cookie aceito pelo Firebase, sessão encerrada limpa o cookie e
  serve a página em vez de mandar para a home (`proxy.ts:215-233`). Rota protegida chega ao layout, o
  `/auth/me` recusa, o layout manda ao sign-in e o proxy cai no ramo acima: dois saltos. Com a API sem
  resposta o desvio para a home segue igual ao de antes.
- Repositório estende `BaseRepository` com o mapper no `super` (`session.repository.ts:49`). O mapper
  normaliza `Timestamp` para ISO com `normalizeFirestoreInstant` e faz whitelist no `toPersistence`
  (`session.mapper.ts:66-115`). `set(..., { merge: true })` no `revoke` (desvio 5) está certo: um `update`
  falharia com `NOT_FOUND` para sessão que a API nunca viu, e o documento parcial leva `uid`, então aparece
  no `listByUid` e sai no expurgo.
- Exclusão apaga a coleção pelo uid (`account-erasure.ts:123-125`); exportação inclui `sessions` com
  `truncated` (`account-export.ts:136-139`, `:159-162`).
- i18n: colunas, `aria-label`, toasts, confirmação, `emptyText` e os 4 códigos novos vêm do dicionário, nos 3
  idiomas. Nenhuma string solta no painel.
- `packages/sdk/vitest.config.mts` (desvio 1): espelha o dos outros pacotes, sem dependência nova. O alias
  `@repo` resolve porque o nome de cada pasta em `packages/` bate com o do pacote.
- Nenhum comentário cita o fluxo de agents; nenhum `console.log`.

### Corte de MVP da spec

`specs/account-security-mfa.md` pede sessões ativas "com dispositivo/origem e último uso" e encerramento de
uma ou de todas as outras, mantendo a atual, com o logout comum deixando de ser "sair de todos". O código
entrega isso com duas diferenças, ambas registradas no plano: "origem" virou navegador e sistema (IP não é
gravado), e encerrar uma sessão corta a API e o cookie mas não o refresh token no Firebase.

## Correções aplicadas

| Arquivo | O que mudou |
|---|---|
| `docs/SUBPROCESSORS.md` | `session` na lista de coleções do Firestore e `session.repository.ts:49` em "Onde no código" |
| `apps/app/.../account/(components)/AccountSecurityForm.tsx` | Comentário reescrito para nomear as duas ações que derrubam a sessão atual |

## Raio de impacto

- `AccountDataExportDTO.sessions`: único consumidor é o download em `useAccountDataRights.tsx`, que grava o
  JSON como veio.
- `AuditAction` ganhou `ACCOUNT_SESSION_REVOKE` e `ACCOUNT_SESSIONS_REVOKE_OTHERS`. `AuditListClient.tsx:50-53`
  indexa `actionLabels` por `AuditAction`, e os rótulos existem nos 3 idiomas.
- `resolveApiActor` manteve a assinatura; os testes que mockam o módulo não mudaram.
- `sessionPOST`, `sessionRefreshPOST`, `customTokenPOST` e `sessionDELETE` ganharam parâmetros opcionais.
  Os seis chamadores (3 rotas em `apps/app`, 3 em `apps/web`) passam a autoridade.
- Mudança de comportamento para todo fork: "Sair" deixou de encerrar as outras sessões. Está em
  `AUTH-SSO.md` e `PRE-PRODUCTION.md`.

## Verificar no `/test`

Começar por estas. São afirmações do handoff que a leitura não fecha.

1. O proxy limpa o cookie de verdade. `clearSessionCookie` usa o `next/headers` do `packages/auth` (Next
   15.1.3) dentro do proxy do Next 16. Repro: sessão B encerrada por A; em B, abrir `/pt-br/sign-in` e
   conferir `Set-Cookie: access-token=; Max-Age=0` na resposta e a página de login servida, sem 307 para
   `/pt-br`. Se o cookie não sair, B entra em loop.
2. Sem loop de redirect em rota protegida. Repro: em B, abrir `/pt-br/entities` com a sessão encerrada,
   contar os redirects até o login (esperado: 2) e conferir o aviso "Esta sessão foi encerrada." nos 3
   idiomas.
3. O login grava o aparelho do navegador, não o do servidor do front-end. Repro: logar e conferir em
   `GET /account/sessions` que `browser`, `os` e `deviceType` não são `null`. Depende do `User-Agent`
   repassado pelo `createSessionAuthority` chegar à API.
4. SSO entre app e web (§10.5 do plano): logar no app, abrir a web, sair no app, recarregar a web. Esperado
   `POST /api/auth/session` da web com `401 AUTH_SESSION_REVOKED`, logout local com aviso, e o app sem voltar
   logado.
5. "Encerrar as outras" alcança sessão não vista. Três contextos de navegador, logins espaçados em pelo menos
   1 s.
6. Personificação: lista sem "Esta sessão", botões desabilitados, `DELETE /account/sessions/<id>` direto
   responde 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`.
7. Aparelho encerrado com o app aberto, sem recarregar: as chamadas à API passam a responder
   `401 AUTH_INVALID_TOKEN` (o guard não distingue sessão encerrada). Medir o que a tela faz até a próxima
   renovação do ID token.
8. Tema e responsivo do painel e do diálogo: light, dark e 375 px.
9. `pnpm --filter api test:emulator` com a coleção `session` descoberta pelo `super(db, "session"`. Exige JDK
   21 e as portas livres.
10. Latência: uma leitura de Firestore a mais por requisição autenticada e uma ida à API a mais no login.

## Lacunas de teste

| Lacuna (handoff) | Veredito |
|---|---|
| `AccountSessionsPanel` sem teste de tema e largura | Continua aberta; é o item 8 acima |
| `useAccountSessionMutations` testado com `apiClient` mockado | Continua aberta; o caminho axios para `FormattedError` só aparece no teste do painel e no `accountApiErrorCopy.test.ts` |
| Repositório testado contra Firestore falso | Continua aberta; item 9 acima |

Lacuna nova: nenhum teste cobre o item 7 (aparelho encerrado com a tela aberta). As correções desta etapa
não fecharam nenhuma lacuna.

## Decisões em aberto (para o usuário)

1. Dois logins explícitos no mesmo navegador. Quem entra com senha no app e, separado, de novo na web fica
   com duas sessões. Sair no app encerra a do cookie, mas o cliente Firebase da web tem a outra ativa,
   regrava o cookie na próxima carga, e o app volta logado pelo bootstrap. No fluxo comum (logar num e abrir
   o outro) não acontece. Recomendação do handoff: não tratar agora.
2. O refresh token do aparelho encerrado segue válido no Firebase. O aparelho perde a API e o cookie, mas
   ainda emite ID token e fala com o Identity Toolkit. O corte no Firebase continua sendo "Sair de todos" ou
   troca de senha. Registrado em `PRE-PRODUCTION.md` e `AUTH-SSO.md`.

## Gates estáticos

| Gate | Resultado |
|---|---|
| `pnpm check` (depois das correções) | 837 arquivos, sem erro |
| `pnpm turbo run typecheck` em `api`, `app`, `web`, `@repo/auth`, `@repo/sdk`, `@repo/internationalization` | 6 de 6, do cache (as correções não tocaram tipo) |
| `pnpm --filter @repo/internationalization test` (paridade) | 6 arquivos, 59 testes |

## Plano de commits

Ordem ajustada para cada commit ficar verde no typecheck: o i18n vai primeiro, porque `provider.tsx`, o
painel e a trilha de auditoria usam as chaves novas; o `SessionAuthority` do `@repo/auth` precede o cliente
de autoridade do SDK, que importa o tipo. Uma exceção conhecida: o commit 2 acrescenta `sessions` ao
`AccountDataExportDTO`, e o typecheck da `api` fica vermelho até o commit 10. Isolar exigiria `git add -p`
em `account.ts`.

1. `feat(internationalization): add active sessions copy and error codes`: os 4 arquivos de
   `packages/internationalization/translations/`.
2. `feat(sdk): add account sessions contract and actions`: `types/account/account.ts`,
   `types/audit/audit.ts`, `actions/account/action.ts`, `actions/auth/action.ts`.
3. `feat(auth): expose verified ID token claims with getIdTokenSession`: `server.ts`,
   `__tests__/serverSessionRevocation.test.ts`.
4. `feat(auth): ask a session authority before writing the session cookie`: `types.ts`,
   `session-routes.ts`, `__tests__/sessionRoutesAuthority.test.ts`.
5. `feat(auth): sign out locally when the session was ended elsewhere`: `provider.tsx`.
6. `feat(sdk): add server-side session authority client`: `src/client/sessionAuthority.ts`,
   `__tests__/sessionAuthority.test.ts`, `vitest.config.mts`, `package.json`.
7. `feat(api): add session repository and mapper`: `lib/session-key.ts`, `lib/user-agent.ts`,
   `mappers/session.mapper.ts`, `repositories/session.repository.ts` e os testes `sessionKey`,
   `sessionUserAgent`, `sessionMapper`, `sessionRepository`.
8. `feat(api): track sessions on every authenticated request`: `lib/session-tracker.ts`,
   `lib/resolve-api-actor.ts`, `.env.example` e os testes `sessionTracker`, `selectActiveSessions`,
   `resolveApiActorSession`.
9. `feat(api): add session standing and sign-out endpoints`: `app/(routes)/auth/session/route.ts`,
   `__tests__/authSessionRoute.test.ts`.
10. `feat(api): list and end account sessions`: `account/sessions/route.ts`, `account/sessions/[id]/route.ts`,
    `account/sessions/revoke-others/route.ts`, `validation/session.schema.ts`,
    `__tests__/accountSessionsRoute.test.ts`, mais `lib/account-export.ts`, `lib/account-erasure.ts`,
    `__tests__/accountExportRoute.test.ts`, `__tests__/accountErasure.test.ts`.
11. `feat(app): check session standing in auth routes and proxy`: `lib/server/sessionAuthority.ts`, as 3
    rotas `app/api/auth/*`, `proxy.ts` e os testes `proxy`, `securityHeaders`, `securityPolicySources`.
12. `test(app): cover sign-out on AUTH_SESSION_REVOKED in the auth provider`:
    `__tests__/sessionExpiredSignOut.test.tsx`.
13. `feat(app): add active sessions hooks`: `shared/lib/queryKeys.ts`, `useListAccountSessions.tsx`,
    `useAccountSessionMutations.tsx`, `__tests__/useAccountSessions.test.tsx`.
14. `feat(app): add active sessions panel to the security tab`: `AccountSessionsPanel.tsx`,
    `AccountSecurityForm.tsx` e os testes `accountSessionsPanel`, `accountSecurityForm`,
    `accountApiErrorCopy`.
15. `feat(web): check session standing in auth routes`: `shared/lib/sessionAuthority.ts` e as 3 rotas
    `app/api/auth/*`.
16. `docs: document per-session sign-out and the session collection`: `AUTH-SSO.md`, `PRE-PRODUCTION.md`,
    `ROPA.md`, `SECURITY.md`, `SUBPROCESSORS.md`.
17. `docs: update code pointers after the session changes`: `INCIDENT-RESPONSE.md`,
    `RESEARCH-tanstack-vs-next.md`.
18. `docs(specs): point account-security-mfa to account-active-sessions`: `specs/account-security-mfa.md`.
19. `docs(features): account-active-sessions`: a pasta inteira. Varrida por segredo: nenhuma senha, chave,
    token ou e-mail real.

Título de PR sugerido: `feat: active sessions with per-session sign-out`.

## Rodada 2

Trata o achado 🟢 1 do `test/report.md`: um login no mesmo segundo depois de "encerrar as outras" sai
recusado.

A chave da sessão é o `auth_time` do Firebase, inteiro em segundos (`session-key.ts:13-18`). A marca
d'água `othersRevokedBefore` é um `Date` com milissegundos (`session.repository.ts:187`). Com chave `T` e
marca em `T.700`, a API não tem como saber se o login aconteceu em `T.300`, antes do clique, ou em `T.900`,
depois dele: o dado é o mesmo nos dois casos. Sobram duas regras possíveis.

- Recusar o segundo inteiro, que é o que o código já fazia (`marca > T*1000`). Quem loga em outro aparelho
  menos de 1 s depois do clique é recusado no primeiro contato e precisa entrar de novo.
- Truncar a marca para o segundo, como o QA sugeriu. Aí uma sessão aberta até 999 ms antes do clique
  sobrevive ao "encerrar as outras", e esse é o caso que o botão existe para cortar, como uma credencial
  roubada usada naquele instante.

Decisão: manter a recusa. Ela custa um login repetido quando dois aparelhos do mesmo titular coincidem em
menos de 1 s. A truncagem custaria uma sessão indesejada viva, sem aviso para ninguém. A regra não mudou.
A comparação foi extraída para `mayHaveStartedBefore` (`session-tracker.ts:34-41`), com um comentário de
três linhas sobre o arredondamento a favor da recusa, e o comportamento foi descrito em `docs/AUTH-SSO.md`
para quem mantém um fork.

Testes novos em `sessionTracker.test.ts`, no bloco "marca d'água no mesmo segundo do login": quatro casos
de recusa no segundo `T` (login antes e depois de um clique em `T.700`, clique em `T.001` e clique em
`T.999`), aceite com o clique exatamente em `T.000` e aceite da sessão do segundo seguinte ao do clique. Os
dois primeiros casos têm a mesma entrada de propósito, porque a API não distingue um do outro.

Mutações, cada uma revertida depois de rodar:

| Mutação em `mayHaveStartedBefore` | Resultado |
|---|---|
| Truncar a marca para o segundo (a sugestão do QA) | 4 falhas, 14 passam |
| Trocar `>` por `>=` | 1 falha (clique em `T.000`), 17 passam |
| Código restaurado | 18 de 18 |

O achado 🟢 2 do report (aparelho encerrado com a tela aberta só sai no próximo reload) é de UX e ficou
como estava. Ele já consta no item 7 de "Verificar no `/test`" e na lacuna nova de "Lacunas de teste".

| Gate | Resultado |
|---|---|
| `pnpm check` | 837 arquivos, sem erro |
| `pnpm --filter api typecheck` | sem erro |
| `vitest run __tests__/sessionTracker.test.ts` | 18 de 18 |

A lista de arquivos do plano de commits não mudou. O commit 8 passa a levar a extração em
`session-tracker.ts` e os testes novos em `sessionTracker.test.ts`, e o commit 16 leva o parágrafo novo de
`AUTH-SSO.md`. `git diff --cached --stat` continua vazio.

## Commits realizados

(preenchido pelo `/review` depois dos commits)
