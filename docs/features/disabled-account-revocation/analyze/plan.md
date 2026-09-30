# Plano: conta desativada deixa de valer na API na hora

Tarefa direta, sem spec. Origem: o achado 🔴 "Conta desativada pelo admin segue com o ID token aceito pela
API até ele expirar" do `specs/BACKLOG.md` (tabela de segurança, `:617`, e a recomendação #1 em `:235-259`).
Plano feito em rodada autônoma do `/cycle`: as decisões tomadas sem perguntar estão na §12, cada uma com a
alternativa descartada, e a §11 traz as perguntas já com a opção adotada.

Todas as referências `arquivo:linha` foram conferidas neste checkout em 2026-09-30.

## 0. Sumário do desenho

Duas mudanças pequenas de código, testes de unidade e dois documentos corrigidos.

1. `getCurrentUser` (`packages/auth/server.ts:173-194`) passa a devolver `null` quando o `UserRecord` que ele
   já carrega vem com `disabled: true`. Os guards da API já tratam `null` como `401 AUTH_INVALID_TOKEN`, então
   o bearer de uma conta desativada é recusado na requisição seguinte à desativação. Não há chamada nova ao
   Firebase: o `getUser` já roda em `server.ts:181`.
2. `PUT /users/[id]` (`apps/api/app/(routes)/users/[id]/route.ts:87-137`) chama `revokeUserSessions`
   (`packages/auth/server.ts:323-329`) depois do `updateUser` sempre que o corpo traz `disabled: true`. Com
   isso, reativar a conta não devolve a vida às sessões anteriores: quem foi bloqueado precisa entrar de novo.

Sem Firestore, sem SDK, sem UI, sem i18n novo, sem variável de ambiente, sem infra.

## 1. Contexto

### 1.1 Problema medido

Desativar a conta é o mecanismo de banimento do core: o switch da listagem do admin
(`apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(pages)/(home)/UsersListClient.tsx:100-119`)
manda `PUT /users/:id` com `disabled`, e a rota só repassa o campo ao Firebase Auth
(`route.ts:111-122`). O runbook de incidente manda o operador desativar a conta como contenção
(`docs/INCIDENT-RESPONSE.md:51`).

O cookie de sessão já é recusado para conta desativada, porque `getSessionFromCookie` chama
`verifySessionCookie(cookie, true)` (`packages/auth/server.ts:298-301`), e o `firebase-admin` recusa conta
desativada quando confere revogação. O ID token enviado como bearer não é: `resolveApiActor`
(`apps/api/(shared)/lib/resolve-api-actor.ts:24`) chama `getCurrentUser`, que usa `verifyIdToken(token)` sem
`checkRevoked` (`server.ts:180`), compara o token com a marca de revogação (`server.ts:182`,
`isMintedBeforeRevocation` em `:153-166`) e não olha `user.disabled`. O token segue aceito até expirar, em até
1 hora.

O `/test` de `compliance-docs-kit` mediu isso em 2026-09-30 contra o projeto Firebase de desenvolvimento
(`docs/features/compliance-docs-kit/test/report.md:20-21`, `:48-53`): com a conta desativada,
`resolveApiActor` devolve o usuário com `disabled=true` para o bearer emitido antes; depois de
`revokeRefreshTokens(uid)`, devolve `null`, e continua `null` depois de a conta ser reativada.

### 1.2 Por que o emulador não pega o defeito

No `firebase-admin@13.6.0`, `lib/auth/base-auth.js:119` executa
`verifyDecodedJWTNotRevokedOrDisabled` quando `checkRevoked || isEmulator`. Sob o emulador a SDK confere
`disabled` sozinha, então o defeito não aparece e um teste de emulador passaria sem a correção (a mesma tabela
do relatório mostra `null` na coluna do emulador e o usuário na do projeto de dev). O teste que prova o nosso
código tem de mockar o Firebase.

### 1.3 Objetivo e corte

- A API recusa o ID token de conta desativada na primeira requisição depois da desativação.
- Desativar pelo admin revoga as sessões da conta, de modo que reativar não ressuscita sessão antiga.
- Os dois documentos que descrevem o comportamento antigo passam a descrever o novo, no mesmo diff.

Fora do corte:

- Código de erro próprio para conta desativada (§11, P1).
- Rota de admin só para revogar sessões de outra pessoa. O runbook passa a apontar "desativar e reativar"
  como saída, que é o que a mudança torna possível sem rota nova.
- Impedir que o admin desative a própria conta (achado adjacente, §12, D7).
- Padronizar o `401` de `GET /auth/me`, que responde `{ message }` sem `error.code`
  (`apps/api/app/(routes)/auth/me/route.ts:8-13`). Anterior à tarefa e fora dela.
- Atualizar o `specs/BACKLOG.md`. Fechar o 🔴 é do `/spec --sync`, que audita contra o código.

### 1.4 Apps impactados

| Área | Impacto |
|------|---------|
| `packages/auth` | `getCurrentUser` recusa `disabled` |
| `apps/api` | `PUT /users/[id]` revoga sessões ao desativar |
| `apps/app`, `apps/web` | nenhum arquivo. Comportamento observável muda (ver §5) |
| `packages/sdk`, `packages/internationalization` | nenhum |
| docs | `docs/INCIDENT-RESPONSE.md:50-52`, `specs/account-security-mfa.md:292-311` |

Modo de produto (`subscription` × `simple`): indiferente. Área do painel: admin (quem desativa) e comum
(quem é desativado; um admin também pode ser desativado por outro).

## 2. Dados (Firestore)

N/A. `disabled` vive no Firebase Auth, não no documento `user`. Nenhum campo, índice ou regra muda.

## 3. Contrato `@repo/sdk`

N/A. O `PUT /users/:id` mantém corpo e resposta. O SDK não muda.

## 4. API

### 4.1 Raio de impacto de `getCurrentUser`

Quem chama (grep em `apps` e `packages`, sem testes):

| Chamador | Efeito da mudança |
|----------|-------------------|
| `apps/api/(shared)/lib/resolve-api-actor.ts:24` | O bearer de conta desativada cai para o fallback `getUserFromSessionCookie(bearer)` (`:28`), que falha com código benigno porque um ID token não é cookie de sessão, e depois para o cookie (`:34-37`), que também recusa conta desativada. Resultado `null`. |
| `requireAdminApi` (`apps/api/app/(guards)/admin.ts:34-43`) e `requireCommonPanelApi` (`apps/api/app/(guards)/common-panel.ts:36-43`) | `401 AUTH_INVALID_TOKEN`, como para token inválido. |
| `POST /auth/email-verification/send` (`apps/api/app/(routes)/auth/email-verification/send/route.ts:17-23`) | `401 AUTH_INVALID_TOKEN`. |
| `GET /auth/me` (`apps/api/app/(routes)/auth/me/route.ts:6-13`) | `401` com `{ message }`, como hoje para token inválido. |
| `getMergedUserFromIdToken` (`apps/api/(shared)/lib/user-merge.ts:29-47`) | Devolve `null`. Não tem chamador fora do próprio arquivo hoje. |
| `authMiddleware` (`packages/auth/middleware.ts:71`) | Redireciona para o sign-in. Nenhum app usa esse middleware hoje (grep por `authMiddleware` e `@repo/auth/middleware` só acha o próprio pacote e o teste dele); a `apps/app` usa `getUserFromSessionCookie` no `proxy.ts:188`. |

Pontos que já recusavam conta desativada e não mudam:

- cookie de sessão: `getSessionFromCookie` (`server.ts:289-311`), usado pelo `proxy.ts:188` da `apps/app`, por
  `currentUser()` (`server.ts:335-354`) e pelas rotas de sessão (`packages/auth/session-routes.ts:112`, `:129`,
  `:146`);
- emissão de cookie novo: `mintSessionCookie` verifica o token localmente (`packages/auth/session.ts:150`), mas
  `createSessionCookie` (`session.ts:161`) lança `auth/user-disabled` para conta desativada (medido no relatório
  citado, `:21`) e a rota responde `401 AUTH_INVALID_TOKEN` (`session-routes.ts:59`);
- refresh do ID token no cliente: o Firebase responde `400 USER_DISABLED` (mesmo relatório, `:21`).

`verifyIdTokenClaims` (`server.ts:243-256`) continua sem olhar `disabled`, e está certo assim: ele é a porta
barata de `mintSessionCookie`, e o `createSessionCookie` logo depois recusa a conta.

**Custo:** zero chamada a mais no caminho quente. O `UserRecord` de `server.ts:181` já traz `disabled`. A
alternativa `verifyIdToken(token, true)` faria a SDK buscar o usuário de novo e dobraria a ida ao Firebase
Auth por requisição (§12, D1).

### 4.2 Rota `PUT /users/[id]`

- Guard: `requireAdminApi` (inalterado). Sob impersonação o guard já recusa escrita
  (`assertReadOnlyWhileImpersonating`, `admin.ts:65-71`).
- Validação: `parseAdminUpdateUserInput` (`apps/api/(shared)/validation/user-admin.schema.ts:17-57`),
  inalterada. `disabled` é `z.boolean().optional()` (`:21`).
- Ordem nova: `userRepository.update` (tipo) → `updateUser` (Auth) → **`revokeUserSessions` se
  `disabled === true`** → `recordAuditEvent` → resposta.
- Desativar primeiro e revogar depois: com a conta já desativada, nenhum token novo sai entre as duas
  chamadas. Se o `updateUser` falhar, a rota lança como hoje e não revoga nada.
- `revokeUserSessions` engole a própria falha (`server.ts:324-328`). Se a revogação falhar, o bloqueio segue
  valendo pela checagem de `disabled`; o que se perde é só a garantia de que reativar não devolve as sessões
  antigas. É o mesmo contrato das outras rotas que revogam, entre elas (`account/password/route.ts:66`,
  `account/sessions/revoke/route.ts:8`, `auth/email-change/confirm/route.ts:79`). Ver §12, D4.
- Chamada extra: uma `revokeRefreshTokens` só no `PUT` que desativa.

### 4.3 Erros

Nenhum código novo. Conta desativada recebe o mesmo `401 AUTH_INVALID_TOKEN` de token inválido, que já tem
texto nos 3 idiomas (`packages/internationalization/translations/packages/shared/utils.ts:9`, `:129`, `:246`).
Quando a pessoa tenta entrar de novo, o Firebase Auth do cliente devolve `auth/user-disabled`, que já é
traduzido ("Esta conta foi desativada.",
`packages/internationalization/translations/packages/auth/index.ts:14`, `:42`, `:71`).

| Situação | Status | `error.code` |
|----------|--------|--------------|
| Bearer de conta desativada em rota com guard | 401 | `AUTH_INVALID_TOKEN` |
| Bearer de conta desativada em `POST /auth/email-verification/send` | 401 | `AUTH_INVALID_TOKEN` |
| Bearer de conta desativada em `GET /auth/me` | 401 | sem código (`{ message }`, inalterado) |
| Cookie de conta desativada | 401 | `AUTH_INVALID_TOKEN` (inalterado) |
| `PUT /users/:id` com `disabled: true` | 200 | corpo inalterado |

## 5. Front-end

Nenhum arquivo muda. O comportamento observável muda para quem é desativado com o app aberto: a próxima
chamada à API volta `401 AUTH_INVALID_TOKEN` (hoje volta 200 por até 1 hora), e a próxima navegação cai no
sign-in pelo `proxy.ts:188` (isso já acontecia). No sign-in a pessoa vê "Esta conta foi desativada.".

O admin que desativa não vê diferença: o switch e o toast continuam iguais.

## 6. i18n

N/A. Nenhuma chave nova.

## 7. Autorização e segurança

- A regra entra na camada mais baixa comum a todos os guards (`getCurrentUser`), então não depende de cada
  rota lembrar de checar.
- Impersonação: o ator é o admin, e o token é o dele. Personificar uma conta comum desativada continua
  possível e somente leitura (`admin.ts:65-71`, `common-panel.ts:65-71`). Um admin desativado perde a
  impersonação junto com a própria sessão. Ver §11, P2.
- Admin desativando a si mesmo: nada impede hoje, e a mudança só antecipa o corte do bearer, que o cookie já
  fazia. Achado adjacente, não corrigido aqui (§12, D7).
- Nenhum dado sensível novo em log. O `console.error` de `getCurrentUser` (`server.ts:191`) não dispara para
  conta desativada, porque o retorno `null` acontece fora do `catch`.
- Trilha de auditoria: o `USER_UPDATE` com `changedFields: ["disabled"]` já registra a desativação
  (`route.ts:124-134`). A revogação é consequência dela e não ganha evento próprio.

## 8. Testes

Todos de unidade, com o Firebase mockado. **Nenhum teste de emulador**: sob o emulador a SDK confere `disabled`
sozinha (§1.2), e o teste passaria sem a correção.

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `packages/auth/__tests__/serverSessionRevocation.test.ts` (novo `describe`) | unidade, `firebase-admin/auth` mockado como já está (`:28-35`) | `getCurrentUser` devolve `null` para `disabled: true` com token válido e sem revogação; devolve `null` para `disabled: true` mesmo com token emitido depois da revogação; não chama `console.error` nesse caso; continua devolvendo o usuário quando `disabled` é `false` ou ausente |
| `apps/api/__tests__/usersAdminAuditTrail.test.ts` (novo `describe` + mock) | rota, com `resolveApiActor`, repositório e `@repo/auth/server` mockados como já estão (`:39-64`) | `PUT` com `disabled: true` chama `revokeUserSessions(TARGET_UID)` uma vez, depois do `updateUser`; `disabled: false`, só `displayName` e só `type` não revogam; falha do `updateUser` não revoga; perfil inexistente (404) e patch vazio (400) não revogam; resposta segue 200 |

Ajuste obrigatório no mock existente: `usersAdminAuditTrail.test.ts:61-64` não exporta `revokeUserSessions`.
O Vitest lança ao ler um export ausente de um `vi.mock`, e o teste atual `records the names of the fields that
changed` (`:195-205`) manda `disabled: true`, então passaria a quebrar. Acrescente
`revokeUserSessions: (...args) => revokeUserSessionsMock(...args)` no padrão de
`apps/api/__tests__/accountPasswordRoute.test.ts:62`. Os outros dois testes que importam a rota
(`usersAdminDeleteBilling.test.ts`, `mergedUserPayload.test.ts`) só exercitam `DELETE` e `GET` e não precisam de
ajuste.

Prova de mutação para o `/test`: remover a checagem de `disabled` em `server.ts` tem de derrubar os casos novos
de `serverSessionRevocation.test.ts`; remover a chamada de `revokeUserSessions` tem de derrubar os casos de
revogação do `PUT`.

`packages/auth/__tests__/middleware.test.ts` mocka `getCurrentUser` inteiro e não é afetado.

## 9. O que o `/test` vai percorrer

Diff sem superfície de UI: **não há passada de `agent-browser`** (política do `/cycle`, §3.1). O `/test` roda:

1. `pnpm --filter @repo/auth test` e `pnpm --filter api test`, mais o `pnpm test` da raiz.
2. As duas mutações da §8.
3. Opcional, se houver credencial do projeto Firebase de desenvolvimento em `.claude/dev-credentials.local.md`:
   repetir a medição de `compliance-docs-kit/test/report.md:48-53` contra o projeto real (conta de QA
   identificável, desativar pelo `PUT`, chamar uma rota com guard com o bearer emitido antes, esperar
   `401 AUTH_INVALID_TOKEN`; reativar e confirmar que o mesmo bearer segue recusado). Sem credencial, esse
   item vira 🔒, sem reprovar a entrega. O emulador não serve para esta medição (§1.2).

## 10. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Bearer de conta desativada é recusado pelas rotas com guard**
  Com a conta desativada no Firebase Auth e um ID token emitido antes da desativação, ainda dentro da validade
  de 1 hora, qualquer rota protegida por `requireAdminApi` ou `requireCommonPanelApi` responde
  `401 { error: { code: "AUTH_INVALID_TOKEN" } }`. Antes da mudança a mesma requisição resolvia o usuário e
  respondia 200. O caso vale tanto para conta comum quanto para conta admin desativada por outro admin.

- [ ] **A recusa não depende de revogação**
  Mesmo que a revogação de sessões falhe ou não aconteça (conta desativada direto no console do Firebase, por
  exemplo), `getCurrentUser` devolve `null` para `disabled: true`. O teste de unidade cobre o token emitido
  depois da marca de revogação para provar que a recusa vem de `disabled`, e não de `tokensValidAfterTime`.

- [ ] **Conta ativa segue funcionando**
  Com `disabled: false` ou ausente no `UserRecord`, `getCurrentUser` devolve o usuário como antes, e os casos
  existentes de revogação (`serverSessionRevocation.test.ts:61-126`) continuam passando sem alteração.

- [ ] **Nenhuma chamada nova ao Firebase por requisição**
  `getCurrentUser` continua fazendo exatamente um `verifyIdToken` sem `checkRevoked` e um `getUser`. O teste
  confere que `verifyIdToken` é chamado com um único argumento, o token.

- [ ] **Desativar pelo admin revoga as sessões da conta**
  `PUT /users/:id` com `disabled: true` chama `revokeUserSessions` com o `reference_id` do perfil alvo (o uid do
  Firebase), uma única vez, e depois do `updateUser`. A resposta segue 200 com o usuário mesclado, e o evento
  `USER_UPDATE` continua sendo gravado com `changedFields` contendo `disabled` e nenhum valor.

- [ ] **Outras edições não revogam**
  `PUT` com `disabled: false`, só com `displayName`, só com `type`, ou com `type` e `displayName` juntos não
  chamam `revokeUserSessions`. Reativar uma conta não encerra sessão nenhuma, porque ela não tem sessão viva.

- [ ] **Falha e recusa não revogam**
  Se o `updateUser` lançar, a rota lança como hoje, o Firestore fica com a mudança de tipo e nada é revogado nem
  auditado. Perfil inexistente responde `404 USERS_NOT_FOUND` e patch vazio responde
  `400 USERS_NOTHING_TO_UPDATE`, os dois sem revogar.

- [ ] **Reativar não ressuscita a sessão antiga**
  Depois de desativar pelo `PUT` e reativar pelo `PUT`, o ID token emitido antes da desativação continua
  recusado com `401 AUTH_INVALID_TOKEN`, pela marca de revogação. A pessoa precisa entrar de novo. Só se prova
  contra o projeto Firebase real (§9, item 3); sem credencial fica 🔒.

- [ ] **Quem é desativado é levado ao sign-in e vê a mensagem certa**
  Com o app aberto, a próxima chamada à API volta 401 e a próxima navegação cai no sign-in pelo `proxy.ts`. Ao
  tentar entrar, o formulário mostra "Esta conta foi desativada." (pt-br), "User disabled." (en) e "Esta
  cuenta ha sido desactivada." (es), textos que já existem. Nenhuma tela ou chave nova.

- [ ] **Os documentos descrevem o comportamento novo**
  `docs/INCIDENT-RESPONSE.md` deixa de dizer que desativar não corta o bearer e passa a dizer que desativar
  revoga as sessões e que a API recusa o bearer na hora; a linha "Revogar a sessão de outro usuário" aponta
  desativar e reativar como saída. O achado em `specs/account-security-mfa.md` sai de "aberto" para fechado,
  sem afirmar nada que o código não faça. Os `arquivo:linha` citados nesses trechos batem com o código final.

- [ ] **Nenhum teste depende do emulador**
  Os testes novos rodam em `pnpm turbo run test`, sem JDK nem emulador, e caem quando a correção é removida.

## 11. Perguntas em aberto

Cada uma já vem com a opção adotada. Nada aqui bloqueia o `/develop`.

**P1. Código de erro próprio para conta desativada?**
Opções: (a) manter `401 AUTH_INVALID_TOKEN`; (b) criar `AUTH_USER_DISABLED` (403) com texto nos 3 idiomas e
entrada em `apiErrors`, e fazer `getCurrentUser` distinguir o motivo.
**Adotada: (a).** O próprio achado registra "sem i18n novo (a API já responde 401 sem usuário)"
(`specs/BACKLOG.md:251-252`). Distinguir o motivo mudaria a assinatura de `getCurrentUser` e de
`resolveApiActor`, que hoje devolvem `UserRecord | null`, e tocaria os dois guards. A mensagem específica já
aparece no sign-in, pelo `auth/user-disabled` do Firebase. Vale reabrir se um fork quiser mostrar "sua conta
foi suspensa" sem esperar a navegação.

**P2. Admin pode personificar uma conta comum desativada?**
Opções: (a) manter como está (pode, somente leitura); (b) recusar em `validateAdminProfile`
(`apps/api/(shared)/lib/auth-request-context.ts:56-78`).
**Adotada: (a).** Em incidente, o operador precisa olhar a conta bloqueada, e a impersonação já é somente
leitura. Recusar mudaria o painel admin, fora do corte desta tarefa.

**P3. Revogar também quando a conta é reativada?**
Opções: (a) revogar só em `disabled: true`; (b) revogar em qualquer mudança de `disabled`.
**Adotada: (a).** Conta desativada não tem sessão viva para revogar (refresh responde `USER_DISABLED`), e a
revogação da desativação já invalida os tokens antigos.

## 12. Decisões tomadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---------|------------------------|---------|
| D1 | Checar `user.disabled` no `UserRecord` que `getCurrentUser` já carrega | `verifyIdToken(token, true)` | A SDK faria um `getUser` próprio, e seriam duas idas ao Firebase Auth por requisição. O achado recomenda o `getUser` existente (`specs/BACKLOG.md:246-247`) |
| D2 | Juntar as duas recusas numa condição (`user.disabled \|\| isMintedBeforeRevocation(...)`) | Um `if` separado | Não desloca as linhas que `docs/INCIDENT-RESPONSE.md:50` cita (`server.ts:180-183`) e deixa num lugar só o que faz um token ser recusado |
| D3 | Revogar só quando o corpo traz `disabled: true`, sem ler o estado anterior | Revogar só na transição de ativo para desativado | Ler o estado anterior custa um `getUser` a mais. Revogar de novo uma conta já desativada é inofensivo |
| D4 | Usar `revokeUserSessions`, que engole a falha | Chamar `getAuthInstance().revokeRefreshTokens` direto e deixar a falha virar 500 | Padrão das outras rotas que revogam. O bloqueio não depende da revogação (D1); a falha só afeta a reativação |
| D5 | Testes de rota no `usersAdminAuditTrail.test.ts` | Arquivo novo `usersAdminDisableRevocation.test.ts` | O mock desse arquivo precisa do `revokeUserSessions` de qualquer jeito (§8), e um arquivo novo duplicaria cerca de 100 linhas de mock. É o arquivo que o achado aponta (`specs/BACKLOG.md:250-251`) |
| D6 | Não editar `specs/BACKLOG.md` | Fechar o 🔴 no mesmo diff | Quem fecha achado é o `/spec --sync`, depois de auditar o código; o `BACKLOG.md` já está modificado neste working tree pela auditoria desta rodada |
| D7 | Não impedir o admin de desativar a si mesmo | Recusar `PUT` com `id` do próprio ator | Comportamento anterior à tarefa (o cookie já trancava o admin); fica como achado adjacente para o backlog |
| D8 | Não acrescentar parágrafo sobre desativação no `docs/SECURITY.md` | Documentar lá também | Nenhum trecho do `SECURITY.md`, `AUTH-SSO.md` ou `PRE-PRODUCTION.md` afirma o comportamento antigo (grep por "desativ", "disabl", "revog"); o lugar onde o operador procura é o runbook |

## 13. Blueprint técnico

### 13.1 `packages/auth/server.ts`

```diff
@@ export const getCurrentUser = async (token: string | null) => {
     try {
         const authInstance = getAuthInstance();
         const decodedToken = await authInstance.verifyIdToken(token);
         const user = await authInstance.getUser(decodedToken.uid);
-        if (isMintedBeforeRevocation(decodedToken, user)) {
+        if (user.disabled || isMintedBeforeRevocation(decodedToken, user)) {
             return null;
         }
         return user;
```

O comentário de `isMintedBeforeRevocation` (`server.ts:147-152`) explica a revogação. Se o `desenvolvedor`
achar que a razão de checar `disabled` à mão não fica óbvia, cabe uma linha autocontida acima do `if`: a SDK só
confere `disabled` quando pedimos a checagem de revogação, que custaria um segundo `getUser`. Sem citar tarefa
nem plano (`.claude/rules/code-comments.md`).

### 13.2 `apps/api/app/(routes)/users/[id]/route.ts`

```diff
-import { getAuthInstance } from "@repo/auth/server";
+import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
@@ export const PUT = requireAdminApi<RouteIdParamsContext>(async (req, ctx) => {
     if (Object.keys(authUpdate).length > 0) {
         await getAuthInstance().updateUser(profile.reference_id, authUpdate);
     }
+
+    if (parsed.value.disabled === true) {
+        await revokeUserSessions(profile.reference_id);
+    }
 
     await recordAuditEvent({
```

Payload e resposta não mudam:

```json
// PUT /users/p2
{ "disabled": true }
// 200
{ "data": { "id": "p2", "disabled": true, "...": "..." } }
```

### 13.3 Testes (esqueleto)

```ts
// packages/auth/__tests__/serverSessionRevocation.test.ts
describe("getCurrentUser — conta desativada", () => {
    it("recusa o id token de uma conta desativada", ...);           // disabled: true, sem tokensValidAfterTime
    it("recusa mesmo com token emitido depois da revogação", ...);   // disabled: true + auth_time > validAfter
    it("não registra erro ao recusar conta desativada", ...);        // console.error não chamado
    it("aceita conta com disabled: false", ...);
    it("verifica o token sem pedir a checagem de revogação", ...);   // verifyIdTokenMock chamado com ("token")
});

// apps/api/__tests__/usersAdminAuditTrail.test.ts
// mock: revokeUserSessions: (...args) => revokeUserSessionsMock(...args)
describe("PUT /users/[id] revokes sessions when disabling", () => {
    it("revokes the target's sessions after disabling it in Firebase Auth", ...); // ordem updateUser → revoke
    it("does not revoke when re-enabling", ...);                                   // disabled: false
    it("does not revoke for edits that leave the status alone", ...);              // displayName / type
    it("does not revoke when Firebase Auth fails", ...);
    it("does not revoke for a missing profile or an empty patch", ...);
});
```

`userRecord()` do teste de `server.ts` (`:55-57`) ganha um parâmetro opcional `disabled`.

### 13.4 Documentos

- `docs/INCIDENT-RESPONSE.md:51` (linha "O admin bloqueia uma conta"): a coluna "Limite" passa a dizer que
  desativar também revoga as sessões (`revokeUserSessions`, com a referência de linha do `PUT` final), que a
  API recusa o bearer de conta desativada na requisição seguinte (`getCurrentUser`, `server.ts:180-185`) e o
  cookie como antes, e que reativar não devolve as sessões antigas. Sai a instrução manual de revogar pelo Admin
  SDK. Manter a data da medição original e dizer que ela descreve o comportamento que a correção passou a
  garantir.
- `docs/INCIDENT-RESPONSE.md:52` (linha "Revogar a sessão de outro usuário"): continua sem rota própria; a
  saída passa a ser desativar e reativar a conta, que encerra as sessões e devolve o acesso com login novo.
- `docs/INCIDENT-RESPONSE.md:50`: conferir que `server.ts:180-183` ainda aponta para o lugar certo depois do
  diff (com D2, a condição continua em `:182`).
- `specs/account-security-mfa.md:292-311` ("Achado ligado à fatia 2"): trocar o parágrafo por um registro curto
  de que o achado foi corrigido em 2026-09-30 por tarefa direta (`docs/features/disabled-account-revocation/`),
  com os dois pontos de código. O parágrafo sobre o emulador pode ficar resumido numa frase, porque vale para
  qualquer teste futuro de sessão da fatia 2.

### 13.5 Ordem de implementação e de commit

Sem SDK e sem i18n. Plano de commits sugerido ao `revisor-codigo`:

1. `fix(auth): reject the ID token of a disabled account`: `packages/auth/server.ts` + testes em
   `packages/auth/__tests__/serverSessionRevocation.test.ts`.
2. `fix(api): revoke sessions when an admin disables an account`: `apps/api/app/(routes)/users/[id]/route.ts` +
   `apps/api/__tests__/usersAdminAuditTrail.test.ts`.
3. `docs: disabling an account now cuts its bearer immediately`: `docs/INCIDENT-RESPONSE.md`.
4. `docs(specs): close the disabled-account finding in account-security-mfa`: `specs/account-security-mfa.md`.
   Separado do `BACKLOG.md` da auditoria, que é outro assunto.
5. `docs(features): disabled-account-revocation`: por último.

### 13.6 Env e infra

Nenhuma variável nova. **Pré-requisitos manuais de infra: nenhum.** Nada a registrar em
`docs/PRE-PRODUCTION.md`. A medição opcional contra o projeto real (§9, item 3) depende de credencial de dev
que já existe fora do repositório, e não é pré-requisito da entrega.
