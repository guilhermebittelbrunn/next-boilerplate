# Plano: métodos de login vinculados à conta

- **Spec:** [`specs/linked-sign-in-methods.md`](../../../../specs/linked-sign-in-methods.md), corte de MVP inteiro.
- **Decisão do usuário já tomada:** D5, definir a primeira senha encerra as sessões, como a troca de senha.
- **Rodada:** autônoma (`/cycle`), 2026-10-16. Ninguém foi consultado. Cada decisão não trivial está em
  "Perguntas em aberto", com a opção adotada, a descartada e o motivo.
- **Branch:** nenhuma. Quem cria é o `/review`.

## Resumo

A aba Segurança ganha a seção "Métodos de login", que lista senha e Google a partir do `providerData` que
`GET /account` já devolve. Três ações nascem dela:

1. **Definir senha** (conta só Google). O navegador abre o popup do Google com `reauthenticateWithPopup` e
   manda o ID token Firebase recém-emitido para `POST /account/password/set`, junto da senha nova. A API
   confere esse token no servidor: mesmo `uid`, `firebase.sign_in_provider === "google.com"` e `auth_time`
   de no máximo 5 minutos. Um token cunhado pelo bootstrap do cookie de sessão tem provedor `custom` e é
   recusado, então a idade da sessão do app não serve de prova. Depois disso a API grava a senha pelo Admin
   SDK, encerra todas as sessões (D5) e registra `account.password.set` na trilha.
2. **Vincular Google** (conta com senha). O vínculo acontece no navegador com `linkWithPopup`, porque é o
   Firebase quem confere a posse da conta Google e recusa a que já pertence a outra conta
   (`auth/credential-already-in-use`). Em seguida o app chama `POST /account/sign-in-methods/linked`, e a
   API só registra `account.signInMethod.link` se o Admin SDK confirmar o provedor no `providerData`.
3. **Desvincular** um método. Roda no servidor (`DELETE /account/sign-in-methods/[id]`, Admin SDK
   `providersToUnlink`) para que a regra "o último método nunca sai" valha na API e não só na tela. Registra
   `account.signInMethod.unlink`.

O formulário de troca de senha só aparece para quem tem senha; quem não tem vê o formulário de definir
senha. Os textos de "não suportado" da exclusão e da troca de e-mail passam a apontar para a aba Segurança.
Nenhuma dependência nova, nenhuma variável de ambiente nova, nenhum campo novo no Firestore.

## Fontes lidas

| Fonte | O que confirmou |
|-------|-----------------|
| `specs/linked-sign-in-methods.md` | corte, D5, riscos, pergunta da prova de posse |
| `.claude/cycle-policy.md` | escada de decisão, modo degradado obrigatório, correção na raiz com 3+ cópias |
| `docs/feature-analysis-guide.md` | roteiro das seções 1 a 10 |
| `apps/api/(shared)/lib/auth-providers.ts:10-14` | `hasPasswordProvider` |
| `apps/api/app/(routes)/account/deletion/route.ts:23-28,48-53,55-72` | checagem de personificação, recusa sem senha, conferência da senha atual |
| `apps/api/app/(routes)/account/email/route.ts:70-75,102-107` | mesmo par de checagens |
| `apps/api/app/(routes)/account/password/route.ts:29-35,37-51,53-66,68-77` | sem e-mail, conferência da senha, `updateUser`, revogação, auditoria |
| `apps/api/app/(routes)/account/sessions/[id]/route.ts:14-62` | padrão de `DELETE` com `[id]`, 204, 404, 409 |
| `apps/api/app/(guards)/common-panel.ts:65-71` + `(shared)/lib/impersonation-read-only.ts:19-31` | escrita bloqueada sob personificação |
| `apps/api/(shared)/lib/resolve-api-actor.ts:29-51` + `packages/auth/server.ts:174-188,250-263` | `ctx.user` vem de `getUser` a cada requisição; `verifyIdTokenClaims` existe |
| `apps/api/(shared)/lib/session-key.ts:8-18` + `packages/auth/session.ts:111-122` | a sessão é nomeada pelo `auth_time` ou pela claim de origem |
| `apps/api/(shared)/lib/firebase-identity-toolkit.ts:172-221` | login Google pela API via `signInWithIdp` |
| `apps/api/(shared)/validation/account.schema.ts:45-50,127-142` + `password.schema.ts:10-33` | política de senha nova e `AUTH_PASSWORD_TOO_SHORT` |
| `apps/api/(shared)/lib/audit-recorder.ts:17-28` + `packages/sdk/src/types/audit/audit.ts:2-19,34-35` | entrada da trilha, `changedFields` |
| `apps/api/proxy.ts:49-62` | lista fechada de rate limit |
| `packages/auth/client.ts:142-155,214-225` | `signInWithGoogle`, `reloadCurrentUser` |
| `apps/app/shared/lib/googleSignInApi.ts:21-59` | login Google do app: popup no cliente e `signInWithIdp` na API |
| `apps/app/.../account/(components)/AccountSecurityForm.tsx:32-103` | formulário de troca sem olhar o `providerData`; `signOut` depois da troca |
| `apps/app/.../account/(components)/AccountTabs.tsx:85-87` | `AccountSecurityForm` não recebe `account` |
| `apps/app/.../account/(components)/AccountPrivacyPanel.tsx:29,40-48,125-133` | cópia 1 da checagem de senha |
| `apps/app/.../account/(components)/AccountEmailChangeDialog.tsx:29,36-47` + `AccountProfileForm.tsx:28,44,115-130` | cópia 2, exportada e usada pelo perfil |
| `apps/app/.../account/(hooks)/useAccountMutations.tsx:47-52` | padrão das mutations da conta |
| `packages/shared/utils/helpers/formattedError.ts:41-44,153-167` | erro do Firebase cliente traduzido pelo dicionário `packages.auth.provider.firebase.error` |
| `packages/sdk/src/client/base.ts:85-87` | todo 401 dispara o callback de sessão expirada |
| `packages/internationalization/translations/packages/auth/index.ts:10-27` | dicionário dos códigos `auth/*` |
| `packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts:14-25` | rótulos das ações da trilha |
| `apps/api/vitest.emulator.config.mts` + `scripts/emulator-tests.mjs:94-103` | a suíte de emulador sobe só Firestore e Storage e zera `FIREBASE_AUTH_EMULATOR_HOST` |
| `apps/api/scripts/seed-emulator.mjs:21-25` | o seed não tem conta só Google |
| `docs/FORKING.md:175-179` | provedor Google e domínios autorizados já documentados |

Links externos da spec (doc do Firebase sobre account linking, Makerkit, emulador de Auth) não foram
relidos: a spec registra a leitura em 2026-10-16 e o plano usa só o que ela cita.

---

# Etapa 1: análise

## 1. Contexto

**Em uma frase:** a pessoa vê com quais métodos entra na conta, define uma senha se só tem Google, vincula
o Google se só tem senha e remove um método enquanto sobrar outro.

**Objetivos:**

- tirar a conta só Google do beco sem saída: depois de definir senha, exclusão, troca de e-mail e troca de
  senha funcionam pelos fluxos que já existem, sem tocar neles;
- permitir vincular o Google a uma conta com senha, com erro traduzido quando o Google já é de outra conta;
- registrar as três mudanças na trilha de auditoria.

**Fora de escopo (da spec):** outros provedores, reautenticação Google para excluir sem criar senha, mescla
de contas, link por e-mail como método. Também fica fora tratar a colisão no login ("entrar com Google
usando o e-mail de uma conta com senha"): a spec descreve o problema, mas o corte não pede.

**Corte de MVP:** os seis itens da spec, sem acréscimo.

| Item | Onde |
|------|------|
| Área do painel | comum, aba Segurança da conta. Admin não usa a área de conta. |
| Modo de produto | os dois. A aba Segurança não lê o modo (`AccountTabs.tsx:33-35` só esconde cobrança). |
| Assinatura | não depende. |
| Dependências externas | Firebase Auth (provedor Google habilitado, domínios autorizados). Nenhuma env nova. |
| Genérico × específico | genérico. `packages/auth/client.ts` ganha duas funções de cliente Firebase, que é pacote de integração. |

**Apps impactados:** `packages/sdk`, `apps/api`, `apps/app`, `packages/auth`, `packages/internationalization`,
`docs/`. `apps/web` não muda: a landing não tem área de conta.

## 2. Decisão central: onde cada operação acontece

| Operação | Onde | Por quê |
|----------|------|---------|
| Definir senha | API (`updateUser` com `password`) | a senha precisa passar pela política (`newPasswordSchema`), revogar sessões (D5) e entrar na trilha. A prova de posse do Google chega como ID token e é conferida no servidor. |
| Vincular Google | navegador (`linkWithPopup`) + API só registra | o web SDK do Firebase não entrega o token do Google sem fazer uma operação (login ou vínculo). Fazer login com o Google num app secundário criaria conta órfã quando o Google é novo. O `linkWithPopup` já confere a posse e recusa o Google de outra conta. |
| Desvincular | API (`updateUser` com `providersToUnlink`) | "o último método nunca sai" tem de valer na API (regra de ouro 4), e a trilha é escrita no servidor. |

### 2.1 Prova de posse do Google para definir senha

O cliente chama `reauthenticateWithPopup(currentUser, new GoogleAuthProvider())`. O Firebase só aceita a
conta Google vinculada àquele `uid` (`auth/user-mismatch` para outra) e devolve um usuário com ID token novo.
O app manda esse token no corpo, como `reauthIdToken`. A API confere com `verifyIdTokenClaims`
(`packages/auth/server.ts:250`):

- `claims.uid === ctx.user.uid`;
- `claims.firebase.sign_in_provider === "google.com"`;
- `nowSeconds - claims.auth_time <= 300`.

Por que isso fecha o risco que a spec aponta (`deletion/route.ts:55-57`): o bootstrap entre apps entra com
`signInWithCustomToken` (`packages/auth/client.ts:169-172`), e todo token dessa sessão tem
`sign_in_provider: "custom"`. A idade da sessão pode ser regravada; o provedor do login, não. Cinco minutos
é a janela que o próprio Firebase usa para "login recente".

Alternativa descartada: reenviar o ID token do **Google** para `signInWithIdp`, como o login faz
(`firebase-identity-toolkit.ts:204-221`). Funciona, mas um token de outro Google não vinculado cria conta
nova no Auth antes de a API recusar, e a idade do token do Google só sai decodificando o JWT na mão.

Efeito colateral a registrar: a reautenticação troca o `auth_time` do cliente, e a sessão passa a ter outro
nome na lista de sessões (`session-key.ts:8-18`). No caminho feliz isso não aparece, porque a definição de
senha encerra todas as sessões em seguida. Se a API recusar depois do popup, a lista pode mostrar uma linha
a mais até a antiga expirar. Para reduzir isso, o formulário valida a senha **antes** de abrir o popup.

### 2.2 Vínculo e trilha

Depois do `linkWithPopup`, o app chama `POST /account/sign-in-methods/linked` com `{ providerId }`. A API
lê `ctx.user.providerData`, que vem de `getUser` na mesma requisição (`packages/auth/server.ts:184`). Se o
provedor está lá, grava o evento; se não, responde 404 e não grava. Um cliente pode repetir a chamada e
duplicar o evento, mas não consegue inventar um vínculo que não existe.

Se o vínculo der certo e a chamada à API falhar (rede), o Google fica vinculado sem evento na trilha. O app
mostra o erro e a lista recarregada mostra o Google vinculado. Fica registrado como risco.

## 3. Dados (Firestore)

N/A. Os métodos de login vivem no Firebase Auth (`providerData`), não no documento `user`. Não há campo
novo, backfill nem índice. A trilha usa a coleção que já existe, por `recordAuditEvent`.

## 4. Contrato `@repo/sdk`

- `AuditAction` ganha três valores: `ACCOUNT_PASSWORD_SET = "account.password.set"`,
  `ACCOUNT_SIGN_IN_METHOD_LINK = "account.signInMethod.link"`,
  `ACCOUNT_SIGN_IN_METHOD_UNLINK = "account.signInMethod.unlink"`.
- Tipos novos em `types/account/account.ts`: `SetPasswordRequest`, `SignInMethodLinkedRequest`.
- `AccountActions` ganha `setPassword`, `confirmSignInMethodLinked` e `unlinkSignInMethod`.
- O tipo do método já existe: `UserWithAuthDTO.providerData` (`packages/sdk/src/types/user/user.ts:108-114`).

Quem quebra: ninguém. São adições. O `Record<AuditAction, string>` dos rótulos da trilha passa a exigir as
três chaves nos três idiomas, o que o typecheck cobra (seção 8).

## 5. API (`apps/api`)

### 5.1 Rotas

| Método e path | Guard | Corpo | Sucesso |
|---------------|-------|-------|---------|
| `POST /account/password/set` | `requireCommonPanelApi` | `{ reauthIdToken, password }` | 200 `{ data: { confirmed: true } }` |
| `POST /account/sign-in-methods/linked` | `requireCommonPanelApi` | `{ providerId }` | 200 `{ data: { confirmed: true } }` |
| `DELETE /account/sign-in-methods/[id]` | `requireCommonPanelApi<RouteIdParamsContext>` | nenhum | 204 sem corpo |

As três rotas repetem a checagem explícita `ctx.subjectProfile.reference_id !== ctx.user.uid → 403
AUTH_REQUEST_IMPERSONATION_FORBIDDEN` das rotas de exclusão e e-mail. O guard já recusa escrita sob
personificação (`impersonation-read-only.ts:23-30`); a checagem a mais protege a operação se essa regra
mudar, como o comentário de `deletion/route.ts:20-22` justifica.

O `providerId` do `DELETE` não tem lista fixa no servidor: vale qualquer id presente no `providerData`.
Assim a spec `social-sign-in-providers`, que depende desta, não precisa mexer na rota. O Zod só limita o
formato (1 a 64 caracteres, `[a-z0-9.]`).

### 5.2 Ordem das checagens em `POST /account/password/set`

1. personificação → 403;
2. corpo (`parseRequestJson`, `parseSetPassword`) → 400 `VALIDATION_FAILED` ou `AUTH_PASSWORD_TOO_SHORT`;
3. sem e-mail → 400 `ACCOUNT_PASSWORD_UNSUPPORTED` (reuso; conta Google sempre traz e-mail, mas o Admin
   SDK precisa de um para o provedor de senha);
4. já tem senha → 409 `ACCOUNT_PASSWORD_ALREADY_SET`;
5. prova de posse (seção 2.1) → 400 `ACCOUNT_REAUTH_INVALID`;
6. `getAuthInstance().updateUser(uid, { password })` → falha vira 500 `ACCOUNT_UPDATE_FAILED`;
7. `revokeUserSessions(uid)` (D5);
8. `recordAuditEvent` com `ACCOUNT_PASSWORD_SET`, rótulos com o e-mail, como a troca (`password/route.ts:68-77`).

`ACCOUNT_REAUTH_INVALID` sai com **400**, não 401: todo 401 aciona o callback de sessão expirada do SDK
(`packages/sdk/src/client/base.ts:85-87`) e derrubaria a sessão por uma prova recusada. A senha atual errada
já segue essa lógica (`toolkit-error-codes.ts:104-108`).

### 5.3 `DELETE /account/sign-in-methods/[id]`

1. personificação → 403;
2. id inválido → 404 `ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`;
3. provedor fora do `ctx.user.providerData` → 404 `ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`;
4. `providerData.length <= 1` → 409 `ACCOUNT_SIGN_IN_METHOD_LAST`;
5. `updateUser(uid, { providersToUnlink: [providerId] })` → falha vira 500 `ACCOUNT_UPDATE_FAILED`;
6. trilha `ACCOUNT_SIGN_IN_METHOD_UNLINK` com `changedFields: [providerId]`;
7. 204.

Não revoga sessões: desvincular não dá credencial nova a ninguém.

### 5.4 `POST /account/sign-in-methods/linked`

1. personificação → 403;
2. corpo `{ providerId }` estrito → 400 `VALIDATION_FAILED`;
3. provedor fora do `providerData` → 404 `ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`;
4. trilha `ACCOUNT_SIGN_IN_METHOD_LINK` com `changedFields: [providerId]`;
5. 200.

### 5.5 Códigos de erro novos

| `error.code` | Status | Quando |
|--------------|--------|--------|
| `ACCOUNT_PASSWORD_ALREADY_SET` | 409 | definir senha numa conta que já tem |
| `ACCOUNT_REAUTH_INVALID` | 400 | token ausente, de outro `uid`, de outro provedor ou com `auth_time` acima de 5 minutos |
| `ACCOUNT_SIGN_IN_METHOD_NOT_FOUND` | 404 | id inválido ou provedor não vinculado |
| `ACCOUNT_SIGN_IN_METHOD_LAST` | 409 | tentar remover o único método |

Reusados: `AUTH_REQUEST_IMPERSONATION_FORBIDDEN`, `VALIDATION_FAILED`, `AUTH_PASSWORD_TOO_SHORT`,
`ACCOUNT_PASSWORD_UNSUPPORTED`, `ACCOUNT_UPDATE_FAILED`.

### 5.6 Rate limit

As três rotas ficam fora de `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:49-62`). Nenhuma confere senha nem
gasta cota do Identity Toolkit: a prova é um ID token verificado localmente. A troca de senha
(`/account/password`) também está fora da lista hoje.

### 5.7 Modo degradado

O que pode faltar é configuração do projeto Firebase, não env.

| Situação | API | Tela |
|----------|-----|------|
| Provedor Google desligado no console | `set` nunca recebe token válido; `linked` nunca acha o provedor | o popup falha com `auth/operation-not-allowed`, que o dicionário já traduz ("Operação não permitida.") |
| Domínio não autorizado | idem | `auth/unauthorized-domain`, sem tradução hoje: entra no dicionário (seção 8) |
| Popup bloqueado pelo navegador | não é chamada | `auth/popup-blocked`, traduzido (seção 8) |
| Emulador de Auth | as três rotas funcionam: o Admin SDK aceita os tokens do emulador e o emulador abre um popup de IdP falso | igual à produção |

Nada responde 500 por falta de configuração. Listar métodos e desvincular nunca dependem do Google.

## 6. Front (`apps/app`)

### 6.1 Arquivos

```
apps/app/shared/lib/signInMethods.ts                     (novo: ids, hasSignInMethod, isPopupDismissed)
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/
  (components)/
    AccountSecurityForm.tsx          (alterado: recebe account; escolhe trocar × definir senha)
    AccountSignInMethodsPanel.tsx    (novo: lista, vincular, desvincular)
    AccountPasswordSetForm.tsx       (novo: definir senha)
    AccountTabs.tsx                  (alterado: passa account para a aba Segurança)
    AccountPrivacyPanel.tsx          (alterado: usa o helper compartilhado)
    AccountEmailChangeDialog.tsx     (alterado: usa o helper compartilhado)
    AccountProfileForm.tsx           (alterado: importa o helper do novo lugar)
  (hooks)/
    useSignInMethodMutations.tsx     (novo)
  (validations)/
    accountFormSchema.ts             (alterado: buildAccountPasswordSetSchema)
```

`apps/app/shared/lib/` já guarda lógica pura testável em camelCase (`panelState.ts`, `onboarding.ts`).

### 6.2 Correção na raiz: a checagem de senha

A pergunta "esta conta tem senha?" está copiada em `AccountPrivacyPanel.tsx:29,40-48` e em
`AccountEmailChangeDialog.tsx:29,36-47` (esta exportada e usada por `AccountProfileForm.tsx:28,44`). A aba
Segurança seria a terceira cópia. A política do ciclo manda corrigir na raiz a partir da terceira, então o
helper vai para `apps/app/shared/lib/signInMethods.ts` e os três lugares importam de lá. O comportamento
fica igual: conta ainda carregando conta como "tem senha", para nunca mostrar o bloco errado.

### 6.3 Seção "Métodos de login"

Fica no topo da aba Segurança, num cartão `rounded-lg border border-border p-4`, o mesmo de "Sair de todos
os dispositivos" (`AccountSecurityForm.tsx:107`). Uma linha por método conhecido, nesta ordem:

| Método | Vinculado | Não vinculado |
|--------|-----------|---------------|
| E-mail e senha | `Badge` "Vinculado" + botão "Desvincular" | texto "Não vinculado"; o formulário de definir senha aparece abaixo da seção |
| Google | `Badge` "Vinculado", e-mail da conta Google (`providerData[].email`) + botão "Desvincular" | botão "Vincular conta Google" |

- Com um método só, o botão "Desvincular" fica desabilitado e a linha mostra "É o único método de login da
  conta e não pode ser removido." A API recusa do mesmo jeito.
- "Desvincular" abre `AlertDialog`. O texto do Google avisa que entrar com ele depois pode não abrir esta
  conta, e que para voltar a usá-lo é preciso vincular de novo por esta tela (risco da spec). O texto da
  senha avisa que o e-mail e a senha deixam de abrir a conta, e que exclusão e troca de e-mail voltam a
  exigir o canal de privacidade até uma senha nova ser definida.
- Sob personificação, todos os botões ficam desabilitados (`useAuthRequestPanel().isImpersonating`), como no
  resto da aba.
- Enquanto qualquer mutation da seção roda, todos os botões da seção ficam desabilitados. Isso evita os
  dois "Desvincular" em paralelo (seção "Riscos").

Provedores fora da lista conhecida (um fork que ligou GitHub) aparecem com o `providerId` cru e o mesmo
botão de desvincular. A lista em si fica para `social-sign-in-providers`.

### 6.4 Formulário de senha

`AccountSecurityForm` recebe `account` e decide:

- tem senha → o formulário de troca atual, sem mudança;
- não tem → `AccountPasswordSetForm`: `HookFormInputPassword` "Nova senha" e "Confirmar nova senha" num
  `FormContainer`, `Footer` com "Confirmar com o Google e definir senha", e um parágrafo explicando que o
  Google vai pedir confirmação e que todas as sessões serão encerradas.

O schema `buildAccountPasswordSetSchema(dictionary)` reusa `PASSWORD_MIN_LENGTH` e as mensagens de
`security.validation`. O submit roda na ordem: validar → popup → API → alerta de sucesso → `signOut`, como
a troca (`AccountSecurityForm.tsx:56-64`).

### 6.5 Hooks

`useSignInMethodMutations` (arquivo `(hooks)/useSignInMethodMutations.tsx`):

| Mutation | `mutationFn` | Sucesso | Erro |
|----------|--------------|---------|------|
| `setPasswordMutation` | `reauthenticateWithGoogle()` → `apiClient.account.setPassword({ reauthIdToken, password })` | `successAlert(passwordSet)`; o componente chama `signOut` | popup fechado: silêncio; demais: `errorAlert(handleClientError(new FormattedError(error, locale)))` |
| `linkGoogleMutation` | `linkGoogle()` → `apiClient.account.confirmSignInMethodLinked({ providerId: "google.com" })` | `invalidateQueries(queryKeys.account.me())` + `successAlert(signInMethodLinked)` | igual; também invalida, porque o vínculo pode ter acontecido antes da falha da API |
| `unlinkMutation` | `apiClient.account.unlinkSignInMethod(providerId)` → `reloadCurrentUser()` | invalida `account.me` + `successAlert(signInMethodUnlinked)` | igual |

O `reloadCurrentUser()` depois de desvincular é obrigatório. O SDK do Firebase guarda o `providerData` no
cliente e o `linkWithPopup` recusa localmente com `auth/provider-already-linked` se o cache ainda lista o
Google. Sem o reload, desvincular e vincular de novo na mesma página falharia.

`FormattedError` já traduz `auth/*` pelo dicionário do pacote de auth
(`formattedError.ts:153-167`), então os códigos novos do Firebase só precisam entrar lá (seção 8).

### 6.6 `packages/auth/client.ts`

Duas funções, ao lado de `signInWithGoogle`:

- `linkGoogle()`: `linkWithPopup(currentUser, new GoogleAuthProvider())`;
- `reauthenticateWithGoogle()`: `reauthenticateWithPopup(currentUser, new GoogleAuthProvider())` e devolve
  `result.user.getIdToken()`.

As duas lançam se não houver `currentUser`. Os mocks de `firebase/auth` em
`packages/auth/__tests__/firebaseClient.test.ts:16-21` e `clientEmulator.test.ts:21-26` ganham as duas
exportações.

## 7. Autorização e segurança

- Toda regra mora na API: dono pelo token (`ctx.user.uid`), corpo `.strict()`, personificação recusada,
  último método recusado. A tela só espelha.
- **Personificação:** o guard recusa `POST`/`DELETE` (`AUTH_REQUEST_IMPERSONATION_READ_ONLY`) e as rotas
  recusam de novo se ator e titular diferirem. A leitura (`GET /account`) continua aberta: o admin vê os
  métodos do usuário, com os botões desabilitados.
- **Nenhum dado sensível sai:** o `reauthIdToken` não é logado; a trilha grava o `providerId` em
  `changedFields`, que é nome de provedor e não dado pessoal.
- **Limite que o produto não fecha:** o Firebase aceita vínculo feito direto pelo SDK do cliente com
  qualquer ID token válido da conta. Quem tem a sessão aberta consegue, fora da tela, ligar o próprio Google
  ou uma senha à conta de outra pessoa sem passar pela API. A API não tem como recusar isso; o Firebase não
  oferece gancho de servidor no vínculo do plano gratuito, e se as blocking functions do Identity Platform
  cobrem o vínculo não foi verificado. É o mesmo tipo de limite já declarado para a política de senha em
  `docs/PRE-PRODUCTION.md` ("Declaração — o que a política de senha não alcança"). O plano declara isso em
  `PRE-PRODUCTION.md` (seção 10.10).

## 8. i18n

| Onde | Chaves |
|------|--------|
| `apps/app/pages/common/account.ts` → `security.signInMethods` | `title`, `description`, `methods.password`, `methods.google`, `linked`, `notLinked`, `linkGoogle`, `unlink`, `unlinkAriaLabel`, `lastMethodHint`, `unlinkDialog.title`, `unlinkDialog.passwordWarning`, `unlinkDialog.googleWarning`, `unlinkDialog.confirm`, `unlinkDialog.cancel` |
| `security.setPassword` | `title`, `description`, `newPassword`, `confirmPassword`, `save` |
| `account.messages` | `passwordSet`, `signInMethodLinked`, `signInMethodUnlinked` |
| `profile.emailChange.unsupported` e `privacy.delete.unsupportedDescription` | texto alterado: apontam para "defina uma senha na aba Segurança" |
| `apps/app/pages/admin/auditTrail.ts` → `list.actionLabels` | `account.password.set`, `account.signInMethod.link`, `account.signInMethod.unlink` |
| `packages/auth/index.ts` → `provider.firebase.error` | `auth/credential-already-in-use`, `auth/provider-already-linked`, `auth/popup-blocked`, `auth/user-mismatch`, `auth/unauthorized-domain` |
| `packages/shared/utils.ts` → `apiErrors` | os quatro códigos da seção 5.5 |

Tudo nos três idiomas, com `/i18n-sync`. O teste de paridade (`packages/internationalization/__tests__/parity.test.ts`)
cobre a estrutura.

## 9. Testes

Nível mais barato que prova cada coisa. Nenhum teste novo exige emulador (justificativa em "Perguntas em
aberto", item 7).

| Teste | Nível | O que prova |
|-------|-------|-------------|
| `apps/api/__tests__/recentGoogleSignIn.test.ts` | unit do helper | aceita token Google com `auth_time` de 299 s; recusa 301 s, `custom`, `password`, outro `uid`, token nulo, `auth_time` ausente |
| `apps/api/__tests__/accountPasswordSetRoute.test.ts` | rota com `vi.mock` do guard, de `@repo/auth/server` e do recorder | caminho feliz (`updateUser` com a senha, `revokeUserSessions`, evento `account.password.set`); 409 já tem senha; 400 `ACCOUNT_REAUTH_INVALID`; 400 `AUTH_PASSWORD_TOO_SHORT`; 400 campo extra; 400 sem e-mail; 403 personificação; 500 `updateUser` falhou e nada revogado |
| `apps/api/__tests__/accountSignInMethodsRoute.test.ts` | rota | `DELETE`: 204 com `providersToUnlink`, 409 último, 404 não vinculado, 404 id inválido, 403, 500. `POST linked`: 200 com evento, 404 ausente, 400 corpo inválido |
| `apps/app/__tests__/signInMethods.test.ts` | unit | `hasSignInMethod` com conta carregando, só Google, só senha, ambos; `isPopupDismissed` |
| `apps/app/__tests__/accountSignInMethodsPanel.test.tsx` | componente com SDK e `@repo/auth/client` mockados | lista os dois métodos; único método desabilita o botão e mostra a dica; "Vincular" chama `linkGoogle` e depois a API; popup fechado não abre alerta; personificação desabilita tudo |
| `apps/app/__tests__/accountSecurityForm.test.tsx` | componente | só Google vê o formulário de definir senha e não o de troca; com senha vê só o de troca; senha curta não abre o popup |
| `apps/app/__tests__/accountPrivacyPanel.test.tsx` e `accountEmailChangeDialog.test.tsx` | já existem | continuam verdes depois da troca de helper |
| `packages/auth/__tests__` | unit | `linkGoogle` e `reauthenticateWithGoogle` chamam a função certa e lançam sem `currentUser` |

## 10. O que o `/test` percorre

**Ambiente:** emulador (`pnpm emulators` + `pnpm seed` + `pnpm dev`). O emulador de Auth abre um popup de
IdP falso para o Google, então os quatro fluxos rodam sem conta Google real.

**Como produzir a conta só Google:** em `/sign-up` da app, "Entrar com Google", e no popup do emulador
"Add new account" com `qa-linked-google@example.com`. O seed não tem essa conta (`seed-emulator.mjs:21-25`).
Se o `agent-browser` não conseguir dirigir o popup, uma alternativa é um script temporário com o Admin SDK
(`importUsers` com `providerData` Google), removido no fim da rodada. A conta com senha é
`user@example.com` do seed.

**Fluxos:**

1. Conta só Google abre a aba Segurança: lista "E-mail e senha: Não vinculado" e "Google: Vinculado", o
   botão de desvincular o Google desabilitado com a dica, nenhum campo "Senha atual", o formulário de
   definir senha visível.
2. Define senha: senha curta mostra o erro sem abrir popup; senha válida abre o popup, confirma, mostra
   sucesso e leva ao login. Entra com e-mail e senha. A aba Segurança mostra os dois métodos e o formulário
   de troca. A aba Privacidade mostra o formulário de exclusão (não mais o aviso). Excluir a conta com a
   senha nova funciona (sinal de pronto da spec).
3. `user@example.com` vincula o Google: popup, sucesso, lista com os dois métodos. Sai e entra pelo Google
   com a mesma conta do popup: abre a mesma conta.
4. Vincular um Google que já é de outra conta (a do fluxo 1, antes de excluir, ou uma segunda criada pelo
   popup): mensagem traduzida de `auth/credential-already-in-use`, lista sem mudança.
5. Desvincular o Google de `user@example.com`: o diálogo mostra o aviso; confirma; lista só com senha. Vincula
   de novo na mesma página sem recarregar (prova o `reloadCurrentUser`).
6. Desvincular a senha de uma conta com os dois: lista só com Google, o formulário de troca some e o de
   definir senha volta.
7. Admin em `/admin/audit` vê "Senha definida", "Método de login vinculado" e "Método de login removido",
   com `google.com`/`password` em "Campos alterados".
8. Admin personificando a conta só Google: aba Segurança com a lista visível e todos os botões desabilitados.

**API direta (curl com o ID token do emulador):**

- `DELETE /account/sign-in-methods/google.com` numa conta só Google → 409 `ACCOUNT_SIGN_IN_METHOD_LAST`;
- `POST /account/password/set` com o token da sessão comum (provedor `custom` ou `password`) → 400
  `ACCOUNT_REAUTH_INVALID`;
- `POST /account/password/set` numa conta com senha → 409 `ACCOUNT_PASSWORD_ALREADY_SET`.

**Combinações:** light e dark, 375 px e 1280 px, pt-br/en/es na aba Segurança (seção nova, diálogo de
desvincular, formulário de definir senha) e na trilha do admin (rótulos novos).

**Medições de infra que só o emulador responde** (o `/develop` faz smoke, o `/test` mede):

- `updateUser({ password })` numa conta só Google acrescenta `password` ao `providerData` e o login com
  e-mail e senha funciona em seguida;
- `providersToUnlink: ["password"]` faz o login com a senha antiga falhar.

## 11. Critérios que fecham só com projeto Firebase real (🔒)

- Popup do Google de verdade em domínio autorizado (produção ou preview).
- Comportamento do vínculo com a configuração "uma conta por e-mail" do projeto real, incluindo o Google
  como provedor confiável que sobrescreve senha não verificada.
- Mensagem de `auth/unauthorized-domain` num domínio fora da lista.

## 12. Pré-requisitos manuais de infra

O `/develop` não satisfaz nenhum destes. O `/test` classifica como 🔒 o que depende deles.

| # | Pré-requisito | Onde | Já documentado? |
|---|---------------|------|-----------------|
| 1 | Provedor Google habilitado | Firebase Console → Authentication → Sign-in method | sim, `docs/FORKING.md:175-176` |
| 2 | Domínios da app autorizados (o popup de vínculo e de reautenticação roda na app) | Authentication → Settings → Authorized domains | sim, `docs/FORKING.md:177-179` |
| 3 | Decidir "User account linking": uma conta por e-mail (padrão) ou várias por provedor | Authentication → Settings → User account linking | **não**: entra no `FORKING.md` (seção 10.10) |
| 4 | Provedor E-mail/senha habilitado (sem ele, definir senha grava mas o login com senha falha) | Sign-in method | sim, `docs/FORKING.md:175` |

Sem 1 ou 2, o caminho degradado da seção 5.7 vale: a lista aparece, desvincular funciona, vincular e
definir senha mostram erro traduzido.

## 13. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **A aba Segurança lista os métodos de login**
  A seção "Métodos de login" aparece no topo da aba Segurança com uma linha para "E-mail e senha" e outra
  para "Google", cada uma marcada como vinculada ou não a partir do `providerData` de `GET /account`. A
  linha do Google vinculado mostra o e-mail da conta Google. Os textos existem em pt-br, en e es, e a seção
  respeita light, dark e 375 px sem rolagem lateral.

- [ ] **Conta só Google não vê o formulário de troca de senha**
  Uma conta cujo `providerData` só tem `google.com` não vê os campos "Senha atual", "Nova senha" e
  "Confirmar nova senha" da troca. No lugar aparece o formulário de definir senha, com "Nova senha",
  "Confirmar nova senha" e o aviso de que o Google vai pedir confirmação e de que todas as sessões serão
  encerradas. Uma conta com senha vê só o formulário de troca, como antes.

- [ ] **Definir senha exige o popup do Google e segue a política**
  Senha com menos de 8 caracteres ou confirmação diferente mostra o erro do formulário e não abre o popup.
  Senha válida abre o popup; fechar o popup não mostra alerta nenhum e não chama a API. Confirmado o Google,
  a API grava a senha, a tela mostra o sucesso e a pessoa volta ao login, porque todas as sessões foram
  encerradas (D5). Clique duplo no botão não dispara dois popups.

- [ ] **A API só aceita prova recente de posse do Google**
  `POST /account/password/set` responde `400 ACCOUNT_REAUTH_INVALID` quando o `reauthIdToken` falta, é de
  outro `uid`, foi emitido por login com senha ou pelo bootstrap entre apps (`custom`), ou tem `auth_time`
  com mais de 5 minutos. Nenhum desses casos grava senha nem encerra sessão. O status é 400, então a sessão
  de quem chamou continua de pé.

- [ ] **Definir senha numa conta que já tem é recusado**
  `POST /account/password/set` numa conta com provedor `password` responde `409 ACCOUNT_PASSWORD_ALREADY_SET`
  e não altera a senha. Senha curta responde `400 AUTH_PASSWORD_TOO_SHORT`; campo extra no corpo responde
  `400 VALIDATION_FAILED`. As mensagens aparecem traduzidas nos três idiomas.

- [ ] **Depois de definir senha, os fluxos da conta funcionam**
  A conta que definiu senha entra com e-mail e senha, vê o formulário de troca de senha, vê o formulário de
  exclusão na aba Privacidade (sem o aviso do canal de privacidade) e o botão "Trocar e-mail" no perfil.
  Excluir a conta com a senha nova conclui a exclusão. Antes de definir, os avisos dessas duas abas apontam
  para a aba Segurança.

- [ ] **Conta com senha vincula o Google**
  "Vincular conta Google" abre o popup; ao confirmar, a lista mostra o Google vinculado sem recarregar a
  página e um alerta de sucesso aparece. A pessoa sai, entra pelo Google com a mesma conta Google e cai na
  mesma conta do produto. Fechar o popup não mostra alerta.

- [ ] **Google que já pertence a outra conta é recusado sem mudar nada**
  Vincular um Google que já está ligado a outra conta mostra a tradução de `auth/credential-already-in-use`
  nos três idiomas, e a lista continua com o mesmo estado. Popup bloqueado mostra a tradução de
  `auth/popup-blocked`.

- [ ] **Desvincular quando sobra outro método**
  Com senha e Google vinculados, "Desvincular" abre um diálogo de confirmação. O do Google avisa que entrar
  com ele depois pode não abrir esta conta e que é preciso vincular de novo aqui; o da senha avisa que
  e-mail e senha deixam de abrir a conta. Confirmado, `DELETE /account/sign-in-methods/<id>` responde 204, a
  lista e o formulário de senha se ajustam, e vincular o Google de novo na mesma página funciona.

- [ ] **O último método nunca sai**
  Com um método só, o botão "Desvincular" fica desabilitado e a linha explica que é o único método. A API
  recusa do mesmo jeito: `DELETE` do único provedor responde `409 ACCOUNT_SIGN_IN_METHOD_LAST`, e um id
  que não está vinculado (ou inválido) responde `404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND`. Durante qualquer
  ação da seção, os outros botões ficam desabilitados.

- [ ] **Registrar vínculo só confirma o que existe**
  `POST /account/sign-in-methods/linked` com um provedor que o Firebase não lista na conta responde
  `404 ACCOUNT_SIGN_IN_METHOD_NOT_FOUND` e não grava evento. Com o provedor presente responde 200 e grava um
  evento.

- [ ] **A trilha de auditoria registra as três mudanças**
  Definir senha grava `account.password.set` com o e-mail como autor e alvo. Vincular grava
  `account.signInMethod.link` e desvincular grava `account.signInMethod.unlink`, ambos com o `providerId`
  em `changedFields`. Em `/admin/audit` os rótulos aparecem traduzidos nos três idiomas, e a exportação de
  dados do titular inclui os eventos.

- [ ] **Personificação não altera métodos de login**
  Um admin personificando o usuário vê a lista de métodos, mas todos os botões da seção ficam desabilitados.
  Chamadas diretas às três rotas sob personificação respondem 403 (`AUTH_REQUEST_IMPERSONATION_READ_ONLY`
  no guard). Nada é gravado no Firebase nem na trilha.

- [ ] **Projeto sem Google configurado degrada sem quebrar**
  Com o provedor Google desligado ou domínio fora da lista, a lista aparece e desvincular funciona. Vincular
  e definir senha mostram a mensagem traduzida do Firebase e nenhuma rota responde 500. (🔒 em ambiente
  real; no emulador o provedor está sempre ligado.)

---

# Etapa 2: blueprint técnico

## 10.1 Contrato (`packages/sdk`)

```ts
// packages/sdk/src/types/audit/audit.ts
export enum AuditAction {
    // ...existentes
    ACCOUNT_PASSWORD_SET = "account.password.set",
    ACCOUNT_SIGN_IN_METHOD_LINK = "account.signInMethod.link",
    ACCOUNT_SIGN_IN_METHOD_UNLINK = "account.signInMethod.unlink",
}

// packages/sdk/src/types/account/account.ts
/** For an account without a password; the token proves a Google sign-in from the last minutes. */
export type SetPasswordRequest = {
    reauthIdToken: string;
    password: string;
};

export type SignInMethodLinkedRequest = {
    providerId: string;
};

// packages/sdk/src/actions/account/action.ts
async setPassword(body: SetPasswordRequest): Promise<AccountConfirmation> {
    const { data } = await this.client.request<Response<AccountConfirmation>>({
        url: "/account/password/set",
        method: "POST",
        data: body,
    });
    return data.data;
}

/** The link itself happens in the browser; this only records it once Firebase shows it. */
async confirmSignInMethodLinked(
    body: SignInMethodLinkedRequest
): Promise<AccountConfirmation> { /* POST /account/sign-in-methods/linked */ }

async unlinkSignInMethod(providerId: string): Promise<void> {
    await this.client.request({
        url: `/account/sign-in-methods/${encodeURIComponent(providerId)}`,
        method: "DELETE",
    });
}
```

## 10.2 API

### Validação (`apps/api/(shared)/validation/account.schema.ts`)

```ts
const REAUTH_ID_TOKEN_MAX = 4096;
const PROVIDER_ID_RE = /^[a-z0-9.]{1,64}$/;

export const signInMethodIdSchema = z.string().regex(PROVIDER_ID_RE);

/** Same `.strict()` guard: whose password is set comes from the token, never from the body. */
export const setPasswordSchema = z
    .object({
        reauthIdToken: z.string().min(1).max(REAUTH_ID_TOKEN_MAX),
        password: newPasswordSchema,
    })
    .strict();

export const signInMethodLinkedSchema = z
    .object({ providerId: signInMethodIdSchema })
    .strict();

export function parseSetPassword(body: unknown) { /* isPasswordTooShort → passwordTooShortResponse(), senão validationFailed() */ }
export function parseSignInMethodLinked(body: unknown) { /* validationFailed() */ }
export function parseSignInMethodId(raw: string | undefined): string | null { /* null quando inválido */ }
```

### Prova de posse (`apps/api/(shared)/lib/recent-google-sign-in.ts`)

```ts
import { verifyIdTokenClaims } from "@repo/auth/server";

const GOOGLE_PROVIDER_ID = "google.com";
/** Firebase's own window for a "recent login". */
export const RECENT_SIGN_IN_MAX_AGE_SECONDS = 300;

/**
 * The session cookie bootstrap signs in with a custom token, which resets `auth_time` but
 * never `sign_in_provider`, so only a real Google sign-in from the last minutes passes.
 */
export async function isRecentGoogleSignIn(
    token: string,
    uid: string,
    nowMs = Date.now()
): Promise<boolean> {
    const claims = await verifyIdTokenClaims(token);
    if (!claims || claims.uid !== uid) return false;
    if (claims.firebase?.sign_in_provider !== GOOGLE_PROVIDER_ID) return false;
    const ageSeconds = nowMs / 1000 - claims.auth_time;
    return ageSeconds >= 0 && ageSeconds <= RECENT_SIGN_IN_MAX_AGE_SECONDS;
}
```

`auth-providers.ts` ganha `hasProvider(user, providerId)` e mantém `hasPasswordProvider` chamando-o.

### `apps/api/app/(routes)/account/password/set/route.ts`

```ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    if (ctx.subjectProfile.reference_id !== ctx.user.uid) {
        return errorResponse("AUTH_REQUEST_IMPERSONATION_FORBIDDEN", HTTP_STATUS.FORBIDDEN);
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = parseSetPassword(parsedBody.value);
    if (!parsed.ok) return parsed.response;

    const email = ctx.user.email;
    if (!email) return errorResponse("ACCOUNT_PASSWORD_UNSUPPORTED", HTTP_STATUS.BAD_REQUEST);

    if (hasPasswordProvider(ctx.user)) {
        return errorResponse("ACCOUNT_PASSWORD_ALREADY_SET", HTTP_STATUS.CONFLICT);
    }

    if (!(await isRecentGoogleSignIn(parsed.value.reauthIdToken, ctx.user.uid))) {
        return errorResponse("ACCOUNT_REAUTH_INVALID", HTTP_STATUS.BAD_REQUEST);
    }

    try {
        await getAuthInstance().updateUser(ctx.user.uid, { password: parsed.value.password });
    } catch {
        return errorResponse("ACCOUNT_UPDATE_FAILED", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    await revokeUserSessions(ctx.user.uid);

    await recordAuditEvent({
        action: AuditAction.ACCOUNT_PASSWORD_SET,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: email,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: email,
        requestId: requestIdFrom(req),
    });

    return Response.json({ data: { confirmed: true } });
});
```

### `apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts`

```ts
export const DELETE = requireCommonPanelApi<RouteIdParamsContext>(async (req, ctx) => {
    if (ctx.subjectProfile.reference_id !== ctx.user.uid) return forbidden();

    const providerId = parseSignInMethodId(await resolveIdFromContext(ctx));
    if (!providerId || !hasProvider(ctx.user, providerId)) return notFound();

    if (ctx.user.providerData.length <= 1) {
        return errorResponse("ACCOUNT_SIGN_IN_METHOD_LAST", HTTP_STATUS.CONFLICT);
    }

    try {
        await getAuthInstance().updateUser(ctx.user.uid, { providersToUnlink: [providerId] });
    } catch {
        return errorResponse("ACCOUNT_UPDATE_FAILED", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    await recordAuditEvent({ action: AuditAction.ACCOUNT_SIGN_IN_METHOD_UNLINK, /* ... */ changedFields: [providerId] });
    return new Response(null, { status: NO_CONTENT });
});
```

A pasta se chama `[id]`, como `sessions/[id]`, porque `resolveIdFromContext` só lê `params.id`
(`apps/api/(shared)/lib/resolve-route-id.ts:4-13`). O valor é o `providerId` (`google.com`, `password`).

### `apps/api/app/(routes)/account/sign-in-methods/linked/route.ts`

Mesma forma: personificação → `parseSignInMethodLinked` → `hasProvider` → evento
`ACCOUNT_SIGN_IN_METHOD_LINK` com `changedFields: [providerId]` → `{ data: { confirmed: true } }`.

### Exemplos

```http
POST /account/password/set
{ "reauthIdToken": "eyJhbGciOi...", "password": "uma senha nova" }
→ 200 { "data": { "confirmed": true } }
→ 400 { "error": { "code": "ACCOUNT_REAUTH_INVALID" } }
→ 409 { "error": { "code": "ACCOUNT_PASSWORD_ALREADY_SET" } }

DELETE /account/sign-in-methods/google.com
→ 204
→ 409 { "error": { "code": "ACCOUNT_SIGN_IN_METHOD_LAST" } }
→ 404 { "error": { "code": "ACCOUNT_SIGN_IN_METHOD_NOT_FOUND" } }

POST /account/sign-in-methods/linked
{ "providerId": "google.com" }
→ 200 { "data": { "confirmed": true } }
```

## 10.3 Persistência

N/A. Firebase Auth guarda os provedores; a trilha usa `auditEventRepository` por `recordAuditEvent`.

## 10.4 `packages/auth/client.ts`

```ts
import { linkWithPopup, reauthenticateWithPopup /* , ... */ } from "firebase/auth";

const requireCurrentUser = () => {
    const user = getAuthClient().currentUser;
    if (!user) throw new Error("No signed-in user");
    return user;
};

export const linkGoogle = () =>
    linkWithPopup(requireCurrentUser(), new GoogleAuthProvider());

/** A fresh ID token whose sign-in provider is Google, for operations that need recent proof. */
export const reauthenticateWithGoogle = async (): Promise<string> => {
    const result = await reauthenticateWithPopup(requireCurrentUser(), new GoogleAuthProvider());
    return result.user.getIdToken();
};
```

## 10.5 `apps/app`

### `apps/app/shared/lib/signInMethods.ts`

```ts
import type { AccountDTO } from "@repo/sdk/src/types";

export const PASSWORD_PROVIDER_ID = "password";
export const GOOGLE_PROVIDER_ID = "google.com";

/** An account still loading answers `true`, so a missing answer never shows the wrong block. */
export function hasSignInMethod(account: AccountDTO | undefined, providerId: string): boolean {
    const providers = account?.providerData;
    if (!providers) return true;
    return providers.some((provider) => provider.providerId === providerId);
}

export const lacksPasswordProvider = (account: AccountDTO | undefined) =>
    !hasSignInMethod(account, PASSWORD_PROVIDER_ID);

const DISMISSED_POPUP_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

export function isPopupDismissed(error: unknown): boolean {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === "string" && DISMISSED_POPUP_CODES.has(code);
}
```

A seção de métodos não usa `hasSignInMethod` para a lista (lá, carregando = sem linhas); usa
`account.providerData` direto, e o `Container` da página já segura o carregamento
(`AccountClient.tsx:25-29`).

### Pseudo-diffs

```diff
// AccountTabs.tsx
 <TabsContent value="security">
-    <AccountSecurityForm />
+    <AccountSecurityForm account={account} />
 </TabsContent>

// AccountSecurityForm.tsx
-export function AccountSecurityForm() {
+export function AccountSecurityForm({ account }: { account: AccountDTO | undefined }) {
+    const hasPassword = !lacksPasswordProvider(account);
     ...
     return (
         <div className="flex w-full flex-1 flex-col gap-6">
+            <AccountSignInMethodsPanel account={account} />
-            <Form {...form}> ...troca de senha... </Form>
+            {hasPassword ? <Form {...form}> ...troca de senha... </Form> : <AccountPasswordSetForm />}
             <AccountSessionsPanel />

// AccountPrivacyPanel.tsx
-const PASSWORD_PROVIDER_ID = "password";
-function requiresPrivacyChannel(account) { ... }
+import { lacksPasswordProvider } from "@/shared/lib/signInMethods";
-const askPrivacyChannel = requiresPrivacyChannel(account);
+const askPrivacyChannel = lacksPasswordProvider(account);

// AccountEmailChangeDialog.tsx
-const PASSWORD_PROVIDER_ID = "password";
-export function lacksPasswordProvider(account) { ... }

// AccountProfileForm.tsx
-import { AccountEmailChangeDialog, lacksPasswordProvider } from "./AccountEmailChangeDialog";
+import { AccountEmailChangeDialog } from "./AccountEmailChangeDialog";
+import { lacksPasswordProvider } from "@/shared/lib/signInMethods";

// accountFormSchema.ts
+export type AccountPasswordSetFormValues = { password: string; confirmPassword: string };
+export function buildAccountPasswordSetSchema(dictionary: Dictionary) { /* password + confirm + refine mismatch, mensagens de security.validation */ }
```

O formulário de troca sai de dentro de `AccountSecurityForm` só se ficar mais legível; não é obrigatório.

### `AccountPasswordSetForm.tsx` (esqueleto)

```tsx
export function AccountPasswordSetForm() {
    const { dictionary } = getDictionary();
    const { isImpersonating } = useAuthRequestPanel();
    const { signOut } = useAuth();
    const setPasswordCopy = dictionary.apps.app.pages.common.account.security.setPassword;
    const { setPasswordMutation } = useSignInMethodMutations();
    const schema = useMemo(() => buildAccountPasswordSetSchema(dictionary), [dictionary]);
    const form = useForm<AccountPasswordSetFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { password: "", confirmPassword: "" },
    });

    const onSubmit = (values: AccountPasswordSetFormValues) =>
        setPasswordMutation.mutate(values.password, { onSuccess: () => signOut.mutate() });

    return (
        <Form {...form}>
            <form className="flex w-full flex-col" onSubmit={form.handleSubmit(onSubmit)}>
                <span className="font-medium text-sm">{setPasswordCopy.title}</span>
                <p className="mb-4 text-muted-foreground text-sm">{setPasswordCopy.description}</p>
                <FormContainer>
                    <div className="col-span-1"><HookFormInputPassword label={setPasswordCopy.newPassword} name="password" /></div>
                    <div className="col-span-1"><HookFormInputPassword label={setPasswordCopy.confirmPassword} name="confirmPassword" /></div>
                </FormContainer>
                <Footer confirmLabel={setPasswordCopy.save} disabled={isImpersonating}
                        isLoading={setPasswordMutation.isPending} showBack={false} />
            </form>
        </Form>
    );
}
```

### `queryKeys`

Nenhuma chave nova. As mutations invalidam `queryKeys.account.me()`.

## 10.6 i18n (forma das chaves; texto final no `/develop`, nos três idiomas)

```ts
// apps/app/pages/common/account.ts, "pt-br"
security: {
    // ...existentes
    signInMethods: {
        title: "Métodos de login",
        description: "Formas de entrar nesta conta. Mantenha pelo menos uma.",
        methods: { password: "E-mail e senha", google: "Google" },
        linked: "Vinculado",
        notLinked: "Não vinculado",
        linkGoogle: "Vincular conta Google",
        unlink: "Desvincular",
        unlinkAriaLabel: "Desvincular {method}",
        lastMethodHint: "É o único método de login da conta e não pode ser removido.",
        unlinkDialog: {
            title: "Desvincular {method}?",
            passwordWarning: "E-mail e senha deixam de abrir esta conta. Excluir a conta e trocar o e-mail voltam a exigir o canal de privacidade até você definir uma senha de novo.",
            googleWarning: "Entrar com o Google depois disso pode não abrir esta conta. Para usá-lo de novo, vincule por esta tela.",
            confirm: "Desvincular",
            cancel: "Cancelar",
        },
    },
    setPassword: {
        title: "Definir senha",
        description: "Esta conta entra só pelo Google. Defina uma senha para entrar também com e-mail e senha. O Google vai pedir confirmação, e todas as sessões serão encerradas.",
        newPassword: "Nova senha",
        confirmPassword: "Confirmar nova senha",
        save: "Confirmar com o Google e definir senha",
    },
},
messages: {
    // ...existentes
    passwordSet: "Senha definida. Entre de novo para continuar.",
    signInMethodLinked: "Conta Google vinculada.",
    signInMethodUnlinked: "Método de login removido.",
},

// profile.emailChange.unsupported (alterado)
"Esta conta entra pelo Google e não tem senha. Defina uma senha na aba Segurança para trocar o e-mail."
// privacy.delete.unsupportedDescription (alterado)
"A sua conta entra pelo Google e não tem senha para confirmar a exclusão. Defina uma senha na aba Segurança ou peça a exclusão pelo canal de privacidade da política."

// apps/app/pages/admin/auditTrail.ts → list.actionLabels
"account.password.set": "Senha definida",
"account.signInMethod.link": "Método de login vinculado",
"account.signInMethod.unlink": "Método de login removido",

// packages/auth/index.ts → provider.firebase.error
"auth/credential-already-in-use": "Esta conta Google já está vinculada a outra conta.",
"auth/provider-already-linked": "Este método de login já está vinculado.",
"auth/popup-blocked": "O navegador bloqueou a janela de login. Permita pop-ups e tente de novo.",
"auth/user-mismatch": "Escolha a mesma conta Google vinculada a esta conta.",
"auth/unauthorized-domain": "Este endereço não está autorizado para login com Google.",

// packages/shared/utils.ts → apiErrors
ACCOUNT_PASSWORD_ALREADY_SET: "Esta conta já tem senha. Use a troca de senha.",
ACCOUNT_REAUTH_INVALID: "Não conseguimos confirmar a sua conta Google. Tente de novo.",
ACCOUNT_SIGN_IN_METHOD_NOT_FOUND: "Este método de login não está vinculado à conta.",
ACCOUNT_SIGN_IN_METHOD_LAST: "Não é possível remover o único método de login da conta.",
```

## 10.7 Documentação

| Arquivo | Mudança |
|---------|---------|
| `docs/FORKING.md` §4 | item novo depois do 4: "User account linking". Explica a opção padrão (uma conta por e-mail) e a alternativa, diz que a aba Segurança funciona nas duas, e que com a padrão o Google, como provedor confiável, pode substituir a senha de uma conta com e-mail não verificado no primeiro login com Google (a conta fica só Google e a pessoa define a senha de novo pela aba). Também diz que o popup de vínculo roda no domínio da app. |
| `docs/SECURITY.md:8` | a lista de onde a política de senha vale ganha "definição da primeira senha na área de conta". |
| `docs/PRE-PRODUCTION.md` | declaração nova em "Higiene": o vínculo feito direto pelo SDK do Firebase não passa pela API (seção 7 deste plano), e o item 3 da seção 12 como passo de configuração do fork. |

## 10.8 Env

Nenhuma.

## 10.9 Ordem de implementação e commits

1. `feat(sdk): sign-in method actions and audit actions`: tipos, `AuditAction`, três métodos.
2. `feat(auth): link and reauthenticate with Google on the client`: `client.ts` + mocks dos testes.
3. `feat(api): set a first password after a recent Google sign-in`: schema, helper, rota, testes.
4. `feat(api): link confirmation and unlink of sign-in methods`: rotas `sign-in-methods`, testes.
5. `refactor(app): share the password provider check`: `shared/lib/signInMethods.ts` e os três componentes, sem mudança de comportamento.
6. `feat(app): sign-in methods section and first password form`: painel, formulário, hook, schema, `AccountTabs`, testes.
7. `feat(internationalization): sign-in methods copy, audit labels and error codes`: as três árvores + `apiErrors` + dicionário do Firebase.
8. `docs: account linking setting, password policy and linking limits`: `FORKING.md`, `SECURITY.md`, `PRE-PRODUCTION.md`.
9. `docs(features): linked-sign-in-methods`: artefatos, por último.

Os commits 6 e 7 não ficam verdes separados (o app referencia chaves que só existem no 7, e o typecheck do
`Record<AuditAction, string>` quebra entre 1 e 7). É a mesma situação aceita em `pricing-page-catalog`
(decisão D3 do review). Se o `/review` preferir commits verdes, junta 1 com os rótulos da trilha.

## 10.10 `contends_on` real

A spec lista `packages/auth/client.ts`, `packages/auth/provider.tsx` e `AccountSecurityForm.tsx`.

- `packages/auth/provider.tsx` **não muda**: as funções novas são chamadas pelo hook da app, não pelo
  contexto de auth.
- Entram: `AccountTabs.tsx`, `AccountPrivacyPanel.tsx`, `AccountEmailChangeDialog.tsx`,
  `AccountProfileForm.tsx`, `accountFormSchema.ts`, `apps/app/shared/lib/signInMethods.ts`,
  `apps/api/(shared)/validation/account.schema.ts`, `apps/api/(shared)/lib/auth-providers.ts`,
  `packages/sdk/src/types/audit/audit.ts`, `packages/sdk/src/actions/account/action.ts`, os quatro arquivos
  de tradução e os três docs.

---

# Perguntas em aberto

Nenhuma foi feita ao usuário. Todas têm a opção adotada.

1. **Como provar a posse do Google para definir senha?** (pergunta da própria spec)
   Opções: (a) popup de reautenticação e o ID token Firebase conferido no servidor por provedor e
   `auth_time`; (b) popup e o token do Google reenviado para `signInWithIdp`; (c) confiar na idade da sessão.
   **Adotada: (a).** É a recomendação da spec ("popup, conferida no servidor, sem confiar na idade da
   sessão"). (b) cria conta órfã no Auth quando o token é de outro Google não vinculado. (c) é o que a spec
   proíbe.

2. **Onde acontece o vínculo do Google?**
   Opções: (a) `linkWithPopup` no navegador e a API só registra; (b) vínculo no servidor com
   `providerToLink`, que exige o token do Google sem login, o que só a biblioteca Google Identity Services
   entrega (dependência nova e client ID em env).
   **Adotada: (a).** Zero dependência e zero env, e o Firebase confere a posse e a duplicidade.

3. **Desvincular no cliente ou no servidor?** A spec põe vincular e desvincular "no cliente".
   **Adotada: servidor** (Admin SDK `providersToUnlink`). A regra "o último método nunca sai" precisa valer
   na API (regra de ouro 4), e a trilha é escrita no servidor. Descartado o `unlink` do cliente, que deixaria
   a regra só na tela.

4. **Vincular o Google pede a senha atual antes?**
   Opções: (a) não pede, como a spec descreve; (b) pede no app antes do popup.
   **Adotada: (a).** A spec não pede, e (b) é só atrito: o mesmo vínculo pode ser feito direto pelo SDK do
   Firebase sem a tela (seção 7). O limite real fica declarado no `PRE-PRODUCTION.md`.

5. **Status de `ACCOUNT_REAUTH_INVALID`**: 400 ou 401?
   **Adotada: 400.** Todo 401 aciona o encerramento de sessão do SDK (`base.ts:85-87`); a senha atual
   errada já usa 400.

6. **Vincular ou desvincular encerra sessões?** D5 decidiu só para definir senha.
   **Adotada: não encerra.** Desvincular não cria credencial; vincular o Google exige o popup, e encerrar as
   sessões não tiraria o acesso de quem vinculou. Fica igual ao que a spec perguntou e D5 não estendeu.

7. **Teste de emulador para `updateUser({ password })` e `providersToUnlink`?**
   Opções: (a) acrescentar o emulador de Auth à suíte `test:emulator`; (b) medir no `/develop` (smoke) e no
   `/test` pelo fluxo.
   **Adotada: (b).** A suíte zera `FIREBASE_AUTH_EMULATOR_HOST` de propósito e o runner só conhece Firestore
   e Storage (`vitest.emulator.config.mts`, `emulator-tests.mjs:94-103`); incluir o Auth mexe no runner, no
   guard e na mensagem de emulador parcial. Os fluxos 2, 5 e 6 do `/test` provam o mesmo comportamento.

8. **Seed com conta só Google?**
   **Adotada: não.** O `/test` cria a conta pelo popup do emulador, que é o caminho real de cadastro.
   Mudar o seed muda o que `pnpm seed` imprime e o que outros testes esperam.

9. **Onde mora a checagem "tem senha?" na app?**
   **Adotada: `apps/app/shared/lib/signInMethods.ts`, com as duas cópias existentes removidas.** A política
   manda corrigir na raiz a partir da terceira cópia, e a aba Segurança seria a terceira.

10. **`providerId` do `DELETE` com lista fixa (`password`, `google.com`) ou qualquer id vinculado?**
    **Adotada: qualquer id presente no `providerData`.** A spec `social-sign-in-providers` depende desta e
    não precisa mexer na rota. O risco é nulo: só sai o que já está vinculado, e nunca o último.

11. **Mudar o texto de "não suportado" da exclusão e da troca de e-mail?**
    **Adotada: sim, só os dois textos da UI** (`privacy.delete.unsupportedDescription`,
    `profile.emailChange.unsupported`), apontando para a aba Segurança. Os `apiErrors`
    `ACCOUNT_*_REAUTH_UNSUPPORTED` ficam como estão: a tela nunca chega a chamar a API nesse estado.

12. **Rótulo do `providerId` na trilha**: valor cru (`google.com`) em `changedFields` ou uma ação por
    provedor?
    **Adotada: valor cru em `changedFields`.** A coluna já mostra nomes crus (`AuditListClient.tsx:68-72`), e
    uma ação por provedor multiplicaria o enum a cada provedor novo.

13. **Discordância pequena com D5**: a decisão fala em encerrar "as outras sessões", mas cita a troca de
    senha, que encerra todas, inclusive a atual (`password/route.ts:64-66`).
    **Adotada: encerra todas, como a troca.** O Firebase não revoga seletivamente, e o sinal de pronto da
    spec já prevê sair e entrar com a senha nova.

# Riscos

- **`updateUser({ password })` acrescenta o provedor `password` a uma conta só Google?** É o comportamento
  documentado do Admin SDK, mas nada no repo o mede. O `/develop` confere num smoke contra o emulador antes
  de seguir. Se não acrescentar, a alternativa é o Identity Toolkit `accounts:update` com o `reauthIdToken`,
  `email` e `password`, que é o caminho do `linkWithCredential` do cliente.
- **`providersToUnlink: ["password"]` remove a senha de fato?** Mesmo tratamento: smoke no `/develop`,
  medição no `/test` (fluxo 6).
- **Dois "Desvincular" em paralelo** podem deixar a conta sem método: o Firebase não tem transação para
  isso. A tela desabilita a seção durante qualquer ação; dois navegadores ao mesmo tempo ainda conseguem.
- **Vínculo sem evento** quando o `linkWithPopup` dá certo e a chamada de registro falha. A lista mostra o
  vínculo; a trilha não. Repetir a chamada duplica o evento.
- **Linha a mais na lista de sessões** quando a reautenticação dá certo e a API recusa a senha (seção 2.1).
- **Vínculo pelo SDK do Firebase fora da tela** (seção 7). Declarado, não resolvido.
- **Google como provedor confiável**: com "uma conta por e-mail", o primeiro login com Google de uma conta
  com e-mail não verificado pode remover a senha. Documentado no `FORKING.md`; a aba Segurança deixa a
  pessoa definir de novo.

# Deriva da spec

- `AccountProfileForm.tsx:115-130` não lê o `providerData`: renderiza o botão a partir de
  `lacksPasswordProvider`, importado de `AccountEmailChangeDialog.tsx:36-47` (`AccountProfileForm.tsx:28,44`).
  A leitura está no diálogo.
- O login Google da app não usa `signInWithGoogle` de `packages/auth/client.ts:150-154`. Usa
  `apps/app/shared/lib/googleSignInApi.ts:21-59` (popup no cliente, `signInWithIdp` na API). O
  `signInWithGoogle` do pacote serve à `apps/web` e a `packages/auth/components/sign-in.tsx`.
- A spec prevê desvincular no cliente; o plano desvincula no servidor (pergunta 3).
- `packages/auth/provider.tsx` está no `contends_on` da spec e não muda (seção 10.10).
- D5 fala em "outras sessões"; o código que ela cita encerra todas (pergunta 13).
- Os demais `arquivo:linha` da spec conferem: `auth-providers.ts:10-14`, `deletion/route.ts:48-53` e
  `:55-72`, `email/route.ts:102-107`, `password/route.ts:29-46` e `:65-66`, `AccountSecurityForm.tsx:56-103`,
  `AccountPrivacyPanel.tsx:41` e `:125-133`, `user.mapper.ts:18-24`, `client.ts:142-155`, `audit.ts:4-12`.
