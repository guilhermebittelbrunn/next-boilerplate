# Handoff do `/develop`: métodos de login vinculados

- **Plano:** [`analyze/plan.md`](../analyze/plan.md)
- **Rodada:** autônoma (`/cycle`). Esta etapa foi **retomada** em 2026-10-19 depois de uma execução
  interrompida em 2026-10-16. A execução anterior deixou SDK, `packages/auth`, as três rotas da API com
  testes, os componentes da app e as traduções. Esta retomada conferiu cada item contra o plano, completou
  o que faltava (dois testes da app, códigos novos no teste de copy, os três docs), corrigiu um defeito
  medido no emulador (seção "Desvios", item 1) e rodou os gates.
- **Branch:** nenhuma criada. Nada commitado.

## Blueprint → arquivos

| Item do plano | Arquivos | Estado |
|---------------|----------|--------|
| 10.1 Contrato | `packages/sdk/src/types/audit/audit.ts`, `packages/sdk/src/types/account/account.ts`, `packages/sdk/src/actions/account/action.ts` | herdado, conferido |
| 10.4 Cliente Firebase | `packages/auth/client.ts` (`linkGoogle`, `reauthenticateWithGoogle`); mocks em `packages/auth/__tests__/firebaseClient.test.ts` e `clientEmulator.test.ts`; teste novo `packages/auth/__tests__/googleAccountLinking.test.ts` | herdado, conferido |
| 10.2 Validação | `apps/api/(shared)/validation/account.schema.ts` (`setPasswordSchema`, `signInMethodLinkedSchema`, `parseSignInMethodId`) | herdado |
| 10.2 Prova de posse | `apps/api/(shared)/lib/recent-google-sign-in.ts`, `apps/api/(shared)/lib/auth-providers.ts` (`hasProvider`) | herdado |
| 10.2 Rotas | `apps/api/app/(routes)/account/password/set/route.ts`, `.../sign-in-methods/linked/route.ts`, `.../sign-in-methods/[id]/route.ts` | herdado; `[id]` corrigido nesta retomada |
| 10.2 Testes da API | `apps/api/__tests__/recentGoogleSignIn.test.ts`, `accountPasswordSetRoute.test.ts`, `accountSignInMethodsRoute.test.ts` | herdado; revogação acrescentada e lint corrigido |
| 10.5 Helper | `apps/app/shared/lib/signInMethods.ts`; cópias removidas de `AccountPrivacyPanel.tsx` e `AccountEmailChangeDialog.tsx`; import novo em `AccountProfileForm.tsx` | herdado |
| 10.5 Tela | `AccountSignInMethodsPanel.tsx`, `AccountPasswordSetForm.tsx`, `AccountSecurityForm.tsx`, `AccountTabs.tsx`, `(validations)/accountFormSchema.ts`, `(hooks)/useSignInMethodMutations.tsx` | herdado; panel e hook ajustados nesta retomada |
| 9 Testes da app | `apps/app/__tests__/signInMethods.test.ts` (novo), `accountSignInMethodsPanel.test.tsx` (novo), `accountSecurityForm.test.tsx` (herdado), `accountApiErrorCopy.test.ts` (4 códigos acrescentados) | completado nesta retomada |
| 10.6 i18n | `translations/apps/app/pages/common/account.ts`, `.../admin/auditTrail.ts`, `translations/packages/auth/index.ts`, `translations/packages/shared/utils.ts` | herdado; `messages.passwordUnlinked` e aviso da senha alterados nesta retomada |
| 10.7 Docs | `docs/FORKING.md` (§4, passo 3), `docs/SECURITY.md`, `docs/PRE-PRODUCTION.md` (declaração nova em Higiene) | feito nesta retomada |

## Contrato

- `AuditAction` ganhou `ACCOUNT_PASSWORD_SET`, `ACCOUNT_SIGN_IN_METHOD_LINK` e `ACCOUNT_SIGN_IN_METHOD_UNLINK`.
  Quem consome: `recordAuditEvent` nas três rotas e o `Record<AuditAction, string>` dos rótulos da trilha
  (`auditTrail.ts`, 3 idiomas).
- `AccountActions` ganhou `setPassword`, `confirmSignInMethodLinked` e `unlinkSignInMethod`. Só
  `useSignInMethodMutations` chama esses métodos.
- Tipos novos: `SetPasswordRequest`, `SignInMethodLinkedRequest`. Nada existente mudou de forma.

## Códigos de erro

Novos, com entrada em `apiErrors` nos três idiomas e cobertos pelo `accountApiErrorCopy.test.ts` (copy
traduzida e diferente da genérica em pt-br/en/es): `ACCOUNT_PASSWORD_ALREADY_SET` (409),
`ACCOUNT_REAUTH_INVALID` (400), `ACCOUNT_SIGN_IN_METHOD_NOT_FOUND` (404), `ACCOUNT_SIGN_IN_METHOD_LAST` (409).

Códigos do Firebase acrescentados ao dicionário de `packages.auth`: `auth/credential-already-in-use`,
`auth/provider-already-linked`, `auth/popup-blocked`, `auth/user-mismatch`, `auth/unauthorized-domain`.

## Medição no emulador de Auth

Feita com Admin SDK e REST do emulador (`127.0.0.1:9099`, projeto `demo-next-boilerplate`), por scripts
descartáveis em `/tmp`, já apagados. As contas criadas foram apagadas pelo próprio script, e o emulador
guarda tudo em memória.

| Pergunta | Resultado medido |
|----------|------------------|
| `updateUser({ password })` numa conta só Google acrescenta o provedor? | sim: `providers [google.com] → [google.com, password]`; `signInWithPassword` em seguida → `200`, mesmo `uid`, token com `sign_in_provider: password` |
| `providersToUnlink: ["password"]` remove a senha? | sim: `providers [google.com]`, `passwordHash` ausente; login com a senha antiga → `400 EMAIL_NOT_FOUND` |
| Efeito colateral do desvínculo da senha | o Firebase apaga `email` e zera `emailVerified` da conta. Sem devolver o e-mail, um `updateUser({ password })` posterior grava o hash mas **não** acrescenta `password` aos provedores, e o login falha (`400 EMAIL_NOT_FOUND`) |
| Desvincular a senha e devolver o e-mail na mesma chamada | não devolve: `email` ausente, `emailVerified: false` |
| Desvincular e devolver o e-mail em duas chamadas | e-mail e `emailVerified: true` voltam; senha antiga → `400 INVALID_PASSWORD`; `updateUser({ password })` depois → provedores `[google.com, password]`, login `200` |
| A devolução do e-mail derruba sessões? | sim: `tokensValidAfterTime` avança e um ID token anterior falha `verifyIdToken(token, true)` com `auth/id-token-revoked`. Isoladamente, nem o desvínculo da senha, nem o do Google, nem regravar o mesmo e-mail revogam (`valid` nos três) |
| Desvincular o Google mantém e-mail e senha? | sim: `providers [password]`, e-mail e `emailVerified` intactos |
| Token da sessão do bootstrap | `signInWithCustomToken` → `sign_in_provider: custom` (a prova de posse recusa) |

O caminho alternativo do plano (Identity Toolkit `accounts:update`) não foi necessário: o Admin SDK
acrescenta o provedor quando recebe `email` junto da senha.

## Desvios

1. **Desvincular a senha encerra todas as sessões. O plano dizia que desvincular não revoga (seção 5.3,
   pergunta 6), e para a senha isso estava errado.** A rota precisa devolver o e-mail que o Firebase
   apaga (medição acima), e o Firebase trata essa devolução como troca de e-mail e revoga os refresh
   tokens. No código herdado, a API respondia 204, o `reloadCurrentUser()` do cliente falhava com o token
   revogado, a tela mostrava alerta de erro sobre uma operação que tinha dado certo, e a sessão caía na
   próxima chamada. Correção:
   - `sign-in-methods/[id]/route.ts` chama `revokeUserSessions` depois de devolver o e-mail, para o efeito
     ser explícito e não depender do comportamento do Firebase;
   - `useSignInMethodMutations` não recarrega o usuário quando o método é `password` e mostra
     `messages.passwordUnlinked`; `AccountSignInMethodsPanel` chama `signOut` nesse caso, como a definição de
     senha já faz;
   - o aviso do diálogo (`unlinkDialog.passwordWarning`) passou a dizer que todas as sessões são encerradas,
     nos três idiomas.
   Desvincular o Google continua sem revogar. Ficar sem devolver o e-mail não serviria: `emailVerified`
   alimenta `EmailNotVerifiedNotice` e a API lê `ctx.user.email` em 16 pontos.
2. **Definir senha manda `email` junto da senha** (`updateUser(uid, { email, password })`), e o e-mail cai
   para o do provedor quando a conta já não tem endereço. Isso veio da execução interrompida e a medição
   confirma: sem e-mail, a senha não vira método de login.
3. **`FORKING.md`: o "User account linking" entrou dentro do passo 3 do §4, e não como passo novo depois
   do 4.** `docs/SUBPROCESSORS.md:45` cita "§4, passo 5" (Firestore), e renumerar quebraria a referência.
4. **`SECURITY.md`: contagem de rotas corrigida de 36/23/13 para 40/26/14**, com a linha de
   `/payments/catalog` acrescentada à tabela das rotas sem guard. No HEAD já eram 37 arquivos (o catálogo
   entrou em #47 sem atualizar o doc); esta entrega soma 3. Medido com
   `find "apps/api/app/(routes)" -name route.ts | wc -l` → `40` e
   `xargs grep -LE "require(CommonPanel|Admin|Plan)Api"` → `14`. Grupos guardados: `account` 13,
   `entities` 3, `files` 1, `users` 4, `audit-events` 1, `payments` 4.
5. **Chave extra `unlinkDialog.otherWarning`** (herdada): aviso genérico para um provedor fora de senha e
   Google, que o painel mostra com o id cru.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Lint/format | `pnpm check` | `Checked 916 files`, sem erro (antes da correção: 16 achados nos testes novos, `noMagicNumbers`, `noMisplacedAssertion`, `noEmptyBlockStatements`) |
| Typecheck | `pnpm turbo run typecheck --filter=api --filter=app --filter=@repo/auth --filter=@repo/sdk --filter=@repo/internationalization` | `5 successful, 5 total` |
| Testes | `pnpm turbo run typecheck test` com os mesmos filtros | api `1280 passed (100 arquivos)`, app `906 passed (109)`, `@repo/auth` `132 passed (11)`, `@repo/sdk` `10 passed (2)`, `@repo/internationalization` `67 passed (7)`; `17 successful, 17 total` |
| Paridade i18n | `pnpm --filter @repo/internationalization test` | `67 passed` |
| Teste que pega regressão | `isPopupDismissed` desligado e `reloadCurrentUser` removido no hook, temporariamente | `accountSignInMethodsPanel.test.tsx`: 3 falhas (os dois de popup fechado e o de recarregar o usuário); hook restaurado em seguida |

`test:emulator` não rodou: a suíte sobe só Firestore e Storage, e esta entrega não toca nenhum dos dois.
Nenhum app foi servido e nenhum browser foi aberto nesta etapa.

## A verificar no `/test`

Nada abaixo foi medido nesta etapa.

- Os 8 fluxos da seção 10 do plano, no emulador, com o popup de IdP falso do emulador de Auth.
- **Desvincular a senha leva ao login.** Repro: `user@example.com` vincula o Google, desvincula a senha,
  confirma o diálogo. Esperado: alerta "Senha removida. Entre de novo para continuar." e ida ao login, sem
  alerta de erro. Entrar pelo Google abre a mesma conta, e a aba Perfil ainda mostra o e-mail (prova da
  devolução do endereço).
- **Definir senha depois de ter desvinculado a senha** (fluxo 6 seguido do 2): a senha nova passa a abrir a
  conta. Medido no Admin SDK; falta pelo produto.
- Desvincular e vincular o Google de novo na mesma página, sem recarregar (prova do `reloadCurrentUser`).
- `auth/credential-already-in-use` traduzido nos três idiomas ao vincular um Google de outra conta.
- Clique duplo em "Confirmar com o Google e definir senha" abre um popup só. O teste de componente cobre o
  segundo submit; o popup real, não.
- curl contra a API: `POST /account/password/set` com o token da sessão comum → `400 ACCOUNT_REAUTH_INVALID`;
  numa conta com senha → `409 ACCOUNT_PASSWORD_ALREADY_SET`; `DELETE /account/sign-in-methods/google.com` numa
  conta só Google → `409 ACCOUNT_SIGN_IN_METHOD_LAST`.
- Personificação: lista visível, botões desabilitados; chamadas diretas → 403.
- Light, dark e 375 px na seção nova, no diálogo e no formulário de definir senha; rótulos da trilha em
  `/admin/audit` nos três idiomas.

## Lacunas de teste conhecidas

- Nenhum teste automatizado roda contra o emulador de Auth (decisão 7 do plano). A medição desta etapa é
  manual e não fica no repo.
- Se `reloadCurrentUser()` falhar depois de desvincular o Google com sucesso, a tela mostra erro sobre uma
  operação concluída. Sem teste e sem correção: o caso só aparece com a rede caindo entre as duas
  chamadas.
- `AccountPasswordSetForm` com o popup real de reautenticação (`auth/user-mismatch` ao escolher outro
  Google) só o `/test` cobre.

## Pendências e decisões em aberto

- **Desvincular a senha encerra a sessão atual** (desvio 1). Segue o mesmo caminho da troca e da definição
  de senha, mas é um efeito que o plano não previa e que o usuário vê. Se o produto preferir manter a
  sessão, a alternativa seria não devolver o e-mail no desvínculo e devolvê-lo só quando uma senha nova for
  definida; o custo é a conta ficar sem `email` e sem `emailVerified` nesse intervalo.
- Os três critérios 🔒 da seção 11 do plano (popup real, "uma conta por e-mail" no projeto real,
  `auth/unauthorized-domain`) dependem de projeto Firebase real. O limite do vínculo pelo SDK fora do
  produto está declarado em `docs/PRE-PRODUCTION.md`.
- Nenhuma conta de QA foi criada fora do emulador.
