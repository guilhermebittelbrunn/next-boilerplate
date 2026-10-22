# Plano — Entrar com link enviado por e-mail

- **Spec:** [`specs/magic-link-sign-in.md`](../../../../specs/magic-link-sign-in.md) (status `proposed`, lida por inteiro)
- **Slug:** `magic-link-sign-in`
- **Rodada:** autônoma (`/cycle`). Nenhuma pergunta foi feita; cada decisão aparece em "Decisões adotadas" e,
  quando havia ambiguidade real, também em "Perguntas em aberto", com a opção adotada e o motivo.
- **Base:** `HEAD == origin/main == df381f4`.

---

## Etapa 1 — Análise

### 1. Contexto

**Resumo.** Com uma variável de ambiente ligada na API, a tela de login da `apps/app` oferece "Receber link de
acesso por e-mail". A pessoa digita o e-mail, recebe pelo Resend do fork um link no texto `confirmAccess` e, ao
abrir o link, entra com a mesma sessão do login por senha.

**Objetivos (corte da spec, sem re-litigar):**

1. Recurso desligado por padrão, ligado por uma variável.
2. Pedir o link responde igual exista ou não a conta, com rate limit. Só conta existente recebe o e-mail, no
   idioma escolhido.
3. Abrir o link no mesmo navegador entra direto: cookie compartilhado, último acesso, desvio para o onboarding
   pendente. Em outro navegador, a tela pede o e-mail antes de concluir.
4. Link expirado ou já usado mostra erro traduzido com a opção de pedir outro.
5. Conta desativada não entra pelo link.
6. Conta sem senha não pode acabar vendo o formulário de troca de senha nem recebendo pedido de senha na exclusão
   e na troca de e-mail.

**Fora de escopo (da spec):** cadastro pelo link, link na landing (`apps/web`), código numérico (OTP), link como
segundo fator. Este plano acrescenta dois itens, ambos registrados em "Perguntas em aberto":

- link para conta que só entra pelo Google ou que nunca confirmou o e-mail (ver D1);
- levar o `?redirect=` da tela de login até o destino depois do link (ver D8).

**Corte de MVP deste plano.** Uma rota pública que informa se o recurso está disponível, uma rota de pedido no
molde da recuperação de senha, um `kind` novo no gerador de links de ação, uma página na app que pede e conclui o
link, uma mutation de login no `AuthProvider` e as chaves de i18n. Zero dependência nova, zero campo no
Firestore, nenhuma mudança na aba Segurança, na exclusão ou na troca de e-mail.

| Item | Valor |
|------|-------|
| Apps impactados | `packages/sdk`, `apps/api`, `packages/auth`, `apps/app`, `packages/internationalization`. `packages/email`: nenhum arquivo muda (o slug `confirmAccess` já existe). `apps/web`: N/A |
| Área do painel | Nenhuma. O fluxo é todo em `(unauthenticated)` |
| Modo de produto | Igual nos dois. No `simple`, quem usa o login da `apps/app` é o admin, e o link funciona para ele do mesmo jeito que a senha |
| Assinatura/plano | N/A |
| Dependências externas | Firebase Auth (provedor "E-mail/senha" com "Link de e-mail" ativo, domínio autorizado), Resend, Arcjet |
| Env nova | `EMAIL_LINK_SIGN_IN_ENABLED`, só na `apps/api` |
| Genérico × específico | Genérico. O que é UI fica na `apps/app`; o que é integração fica em `packages/auth` |

### 1.1 Fontes

- A spec, inteira.
- Documentação do Firebase, <https://firebase.google.com/docs/auth/web/email-link-auth>, lida em 2026-10-22. Dois
  trechos decidem o desenho: "After sign-in completion, any previous unverified mechanism of sign-in will be
  removed from the user and any existing sessions will be invalidated. For example, if someone previously created
  an unverified account with the same email and password, the user's password will be removed"; e
  `handleCodeInApp` "must be true", com a URL de continuação obrigatoriamente num domínio autorizado. A página não
  informa o prazo de validade do link.
- `firebase-admin` 13.6.0, `lib/auth/user-record.d.ts:250-257`: `passwordHash` e `passwordSalt` "only available
  when the user is obtained from listUsers()". Em `user-record.js:356-357`, o valor `REDACTED` vira `undefined`,
  o mesmo valor de uma conta sem senha.
- **Referências não lidas:** nenhuma relevante. A nota `specs/research/saas-starter-feature-benchmark.md` sustenta a
  evidência de mercado, que já é decisão tomada na spec.

### 1.2 Medição no emulador (nesta análise)

A auditoria já tinha medido a conta sem senha. Para escolher como distinguir "tem senha", medi os outros casos
num emulador de Auth isolado (`firebase-tools` 15.30.1, porta 9399, projeto `demo-mlprobe`, desligado e apagado
no fim), com o Admin SDK gerando o link e o SDK cliente 11.10.0 concluindo:

| Conta antes do link | `providerData` depois | `passwordHash` depois | `fetchSignInMethodsForEmail` depois | Observação |
|---------------------|-----------------------|-----------------------|-------------------------------------|------------|
| senha, e-mail **não** verificado | `["password"]` | presente | `["password","emailLink"]` | `emailVerified` vira `true`; a senha segue funcionando **no emulador** |
| senha, e-mail verificado | `["password"]` | presente | `["password","emailLink"]` | nada muda |
| só Google | `["google.com","password"]` | ausente | `["google.com","emailLink"]` | ganha um provedor `password` sem senha |
| só e-mail, sem provedor | `["password"]` | ausente | `["emailLink"]` | o caso que a auditoria mediu |

Outros fatos medidos:

- Reusar o link: `auth/invalid-action-code`. Código inventado: `auth/invalid-action-code`.
- E-mail diferente do que pediu: `auth/invalid-email`, e o código **não** é gasto (o e-mail certo entra em
  seguida).
- Conta desativada: o Admin SDK gera o link; a conclusão responde `auth/user-disabled`.
- E-mail sem conta: o Admin SDK gera o link sem erro (confirma a auditoria).
- `isSignInWithEmailLink` só aceita a URL com `mode=signIn` e `apiKey`; `signInWithEmailLink` aceitou uma URL
  montada na página da app com `mode=signIn&oobCode=<código>&apiKey=<qualquer valor>`, ou seja, o SDK usa só o
  código e o modo.
- O emulador lista o link gerado pelo Admin SDK em `GET /emulator/v1/projects/<id>/oobCodes` com
  `requestType: "EMAIL_SIGNIN"`. É assim que o `/test` obtém o código sem e-mail real.

**Divergência emulador × produção.** Na conta com senha e e-mail não verificado, o emulador mantém a senha; a
documentação do Firebase diz que a produção a remove. Em produção, portanto, a conta não verificada que usa o
link vira uma conta "só de link", e a conta só Google vira "Google + provedor `password` sem senha". Nos dois
casos `lacksPasswordProvider` (`apps/app/shared/lib/signInMethods.ts:22-23`) e `hasPasswordProvider`
(`apps/api/(shared)/lib/auth-providers.ts:17-19`) passariam a mentir.

### 1.3 Como o plano trata o item 6 do corte

A spec pede que o `/analyze` escolha como distinguir a conta sem senha. As opções medidas:

| Discriminador | Confiável em produção? |
|---------------|------------------------|
| `passwordHash` do `getUser` | Não confirmado. A doc do `firebase-admin` diz que só vem no `listUsers`, e `REDACTED` vira `undefined`, igual a "sem senha". Uma service account sem a permissão faria toda conta com senha parecer sem senha |
| `fetchSignInMethodsForEmail` / `createAuthUri` (`emailLink` × `password`) | Não confirmado. Com a proteção contra enumeração de e-mail ligada (padrão em projetos novos), a lista volta vazia |
| Marcador próprio no perfil do Firestore | Funciona, mas exige prever no pedido o que o Firebase fará na conclusão, limpar o marcador na redefinição de senha, no "definir senha" e no desvínculo, e mexer em seis arquivos da área de conta (ver Q1) |
| **Não criar o estado** | Sim. É o que este plano adota |

**Adotado (D1):** a API só gera o link para conta que já tem o provedor `password` **e** `emailVerified === true`.
Pela tabela medida e pela documentação, essa é exatamente a conta em que o link não muda a lista de provedores
nem remove a senha. Toda conta com provedor `password` neste repositório nasce com senha
(`apps/api/app/(routes)/auth/sign-up/route.ts:32-35`, `apps/api/scripts/seed-emulator.mjs:135-140`,
`apps/api/app/(routes)/account/password/set/route.ts:62-65`), então a invariante "provedor `password` ⇒ senha de
verdade" continua valendo, e quem lê "tem senha?" segue correto sem mudança: na app `AccountSecurityForm.tsx:78`,
`AccountPrivacyPanel.tsx:43` e `AccountProfileForm.tsx:42`; na API `account/deletion/route.ts:48`,
`account/email/route.ts:102` e `account/password/set/route.ts:46`. O item 6 fica atendido por construção.

Conta só Google e conta com e-mail não confirmado recebem a mesma resposta e nenhum e-mail, e a API registra a
recusa sem endereço (`auth-action-link refused { kind: "sign-in", code: "not-eligible" }`). O texto da tela
"enviado" orienta quem não recebeu a usar "Esqueci minha senha" ou o Google. É um estreitamento real do público
(quem não confirmou o e-mail é comum aqui: a confirmação é só um aviso, `EmailNotVerifiedNotice.tsx:20-30`), por
isso é a Q1.

O mesmo filtro fecha o risco de sequestro prévio de conta: quem cadastrou o e-mail de outra pessoa com uma senha
sua não consegue fazer a vítima entrar nessa conta pelo link, porque a conta não verificada não recebe link.

---

### 2. Dados (Firestore)

N/A. Nenhuma coleção, campo, índice ou regra muda. O único estado novo fica no navegador:

| Onde | Chave | Valor | Vida |
|------|-------|-------|------|
| `localStorage` da `apps/app` | `email-link-sign-in:email` | o e-mail digitado no pedido | gravado no sucesso do pedido; apagado no sucesso da conclusão |

É o padrão que o Firebase recomenda para saber, ao abrir o link, se é o mesmo navegador.

### 3. Contrato `@repo/sdk`

Em `packages/sdk/src/actions/auth/action.ts`, onde os tipos de auth já vivem (`:4-64`):

- `EmailLinkSignInAvailability = { enabled: boolean }`
- `EmailLinkSignInRequestBody = { email: string; locale?: string }`
- `emailLinkSignInAvailability(): Promise<EmailLinkSignInAvailability>` → `GET /auth/sign-in/email-link`
- `requestEmailLinkSignIn(body): Promise<AuthActionRequested>` → `POST /auth/sign-in/email-link/request`
  (reusa `AuthActionRequested`, `:60`)

Contexto: nenhum (rota pública, como `requestPasswordReset`, `:116-128`). Ninguém quebra: só acréscimos.

### 4. API (`apps/api`)

#### 4.1 Rotas

| Método | Path | Guard | Rate limit | O que faz |
|--------|------|-------|------------|-----------|
| GET | `/auth/sign-in/email-link` | nenhum | não | `{ data: { enabled } }`, com `enabled = flag ligada && canSendAuthActionLink()`. Só lê configuração |
| POST | `/auth/sign-in/email-link/request` | nenhum | sim (`apps/api/proxy.ts:53-67`) | molde de `auth/password/reset-request/route.ts:52-77` |

O GET fica fora da lista de rate limit pelo mesmo motivo que `/auth/me` (`proxy.ts:31-35`): é lido a cada visita
à tela de login e não gasta cota de ninguém. O precedente de "desligado é descrição do ambiente, não falha" é
`payments/plans/route.ts:9-17`. O POST entra na lista porque o casamento é exato (`proxy.ts:50-51`): rota nova
fica sem limite até ser listada.

Ordem do POST, igual à recuperação de senha:

1. flag desligada → `404 AUTH_EMAIL_LINK_DISABLED` (antes de ler o corpo);
2. `!canSendAuthActionLink()` (`auth-action-links.ts:21-23`) → `503 EMAIL_NOT_CONFIGURED`;
3. `parseRequestJson` + `parseEmailLinkSignInRequest` → `400` com os códigos que já existem;
4. `after()` gera e entrega o link; resposta imediata `200 { data: { requested: true } }`.

Os passos 1 e 2 dependem só da configuração, nunca do e-mail; o passo 4 roda depois da resposta, então nem o
corpo nem o tempo de resposta dizem se a conta existe (mesmo argumento de `reset-request/route.ts:15-21`).

#### 4.2 Gerador de link (`apps/api/(shared)/lib/auth-action-links.ts`)

- `AuthActionKind` ganha `"sign-in"` (`:7`); `APP_PATH_BY_KIND["sign-in"] = "sign-in/email-link"` (`:9-13`).
- O `getUserByEmail` (`:54-62`) passa a guardar o `UserRecord`. Para `"sign-in"`, conta inelegível (D1) →
  `logRefusedLink("sign-in", "not-eligible")` e `null`, sem chamar o gerador.
- O gerador (`:64-79`) vira uma escolha por `kind`. Para `"sign-in"`:
  `auth.generateSignInWithEmailLink(email, { url: \`${NEXT_PUBLIC_APP_URL}/${locale}/sign-in/email-link\`, handleCodeInApp: true })`.
  A URL de continuação existe só porque o Firebase exige uma num domínio autorizado; ninguém a segue.
- Recusas do gerador com `code` (provedor desligado → `auth/operation-not-allowed`, domínio não autorizado →
  `auth/unauthorized-continue-uri`) já caem no `logRefusedLink` + `null` de `:70-78`. Nunca 500.
- `toAppLink` (`:84-103`) já reconstrói `${base}/${locale}/sign-in/email-link?oobCode=…`. O link do e-mail aponta
  para a página da app, não para o handler do Firebase, como os outros três links.
- Conta desativada **recebe** o link (D2): a conclusão é recusada pelo Firebase com `auth/user-disabled`, e a
  pessoa vê a recusa traduzida que a spec pede.

#### 4.3 Validação

`apps/api/(shared)/validation/auth.schema.ts`: `emailLinkSignInRequestSchema` com a mesma forma de
`passwordResetRequestSchema` (`:20-23`: `email` trim, máx. 320, e-mail válido; `locale` opcional do enum) e
`parseEmailLinkSignInRequest = (body) => parseWith(emailLinkSignInRequestSchema, body)`. Chave desconhecida é
descartada pelo Zod; nenhum campo de URL entra pelo corpo.

#### 4.4 Env

`apps/api/env.ts`: `EMAIL_LINK_SIGN_IN_ENABLED: z.string().optional()` em `server`, com
`process.env.EMAIL_LINK_SIGN_IN_ENABLED || undefined` no `runtimeEnv` (política: string vazia é ausência). Helper
`isEmailLinkSignInEnabled()` em `apps/api/(shared)/lib/email-link-sign-in.ts`: liga só com `"true"`, sem
diferenciar maiúsculas e ignorando espaços. Declarar no próprio `env.ts` da API é obrigatório por causa do
`skipValidation` em desenvolvimento (`env.ts:24-28`).

#### 4.5 Erros

| `error.code` | Status | Quando | Novo? |
|--------------|--------|--------|-------|
| `AUTH_EMAIL_LINK_DISABLED` | 404 | POST com a flag desligada | **sim** (3 idiomas em `apiErrors`) |
| `EMAIL_NOT_CONFIGURED` | 503 | POST sem Resend ou sem `NEXT_PUBLIC_APP_URL` | não |
| `VALIDATION_FAILED` e afins de `parseRequestJson` | 400/413 | corpo inválido | não |
| `AUTH_RATE_LIMITED` | 429 | Arcjet | não |
| `AUTH_FORBIDDEN_ORIGIN` | 403 | CORS | não |

O GET não tem erro próprio.

### 5. Front-end (`apps/app`)

#### 5.1 Rotas

Uma página: `app/[locale]/(unauthenticated)/sign-in/email-link/page.tsx`.

- Sem `oobCode` na query → formulário de pedido (molde de `ForgotPasswordForm.tsx`).
- Com `oobCode` → conclusão.

O caminho `/sign-in/email-link` já é público pelo prefixo `/sign-in` (`apps/app/proxy.ts:90-96`, `:105-113`), então
o proxy não muda. Ele **não** entra em `OOB_ACTION_PATHS` (`:103`) (D5): quem já tem sessão cai na home, e o link
continua válido até expirar, sem trocar a sessão aberta por outra conta.

`SignInForm.tsx`: no bloco de links do rodapé (`:198-221`), um `Link` para `/${locale}/sign-in/email-link` com o
texto `signIn.emailLink`, renderizado só quando `useEmailLinkAvailability().data?.enabled === true`. Carregando,
com erro ou com `false`, a tela fica como hoje. O link entra no fim do cartão para que o aparecimento depois da
consulta não desloque o formulário.

#### 5.2 Dados

- `queryKeys.auth = { all: ["auth"], emailLinkAvailability: () => [...all, "emailLinkAvailability"] }` em
  `apps/app/shared/lib/queryKeys.ts`.
- `apps/app/shared/hooks/useEmailLinkSignIn.ts`: `fetchEmailLinkAvailability` + `useEmailLinkAvailability`
  (`useQuery`, `staleTime` de 5 min, `retry: false`) no mesmo arquivo; `useEmailLinkRequest` (mutation que chama
  `apiClient.authApi.requestEmailLinkSignIn({ email, locale })`, grava o e-mail no `localStorage` no sucesso e
  mostra o erro com `handleClientError(new FormattedError(error, locale))`).
- `apps/app/shared/lib/emailLinkSignIn.ts`: `rememberEmailForLink`, `readRememberedEmail`,
  `forgetRememberedEmail` (todas toleram `localStorage` indisponível) e `emailLinkFailureOf(error)`, que separa
  `auth/invalid-email` → `"mismatch"`, `auth/expired-action-code` → `"expired"`,
  `auth/invalid-action-code`/`auth/argument-error` → `"invalid"`, o resto → `"other"`.

#### 5.3 Componentes

| Arquivo | Papel |
|---------|-------|
| `sign-in/email-link/page.tsx` | RSC. Metadata do dicionário; lê `oobCode` (string não vazia ou `null`, como `verify-email/page.tsx:31-32`) e escolhe o componente |
| `sign-in/email-link/components/EmailLinkRequestForm.tsx` | `AuthCard` + `HookFormInput` (e-mail) + `Button` com `isPending`. Se a disponibilidade vier `false`, mostra o cartão "indisponível" com volta ao login. No sucesso, o mesmo painel "enviado" para qualquer endereço |
| `sign-in/email-link/components/EmailLinkCompletion.tsx` | Ver estados abaixo |
| `sign-in/email-link/validations/emailLinkSchema.ts` | `buildEmailLinkSchema(dictionary)` → `{ email }` |

Estados da conclusão:

| Situação | Tela |
|----------|------|
| e-mail guardado | dispara `signInWithEmailLink` uma vez por montagem (guarda em `useRef`, como `VerifyEmailResult.tsx:21-29`) e mostra `FullScreenLoader` + "Entrando…" |
| nada guardado (outro navegador, leitor de link) | `AuthCard` pedindo o e-mail; **nada é enviado ao Firebase até a pessoa confirmar** |
| `mismatch` | o mesmo formulário, com o erro no campo; o código não foi gasto e a pessoa tenta de novo |
| `expired` / `invalid` | `AuthCard` com o texto do caso e "Pedir outro link" → `/${locale}/sign-in/email-link` |
| `other` (desativada, provedor desligado, rede, muitas tentativas) | `AuthCard` com a mensagem de `FormattedError` (dicionário `packages.auth.provider.firebase.error`, que já tem `auth/user-disabled`, `auth/operation-not-allowed`, `auth/too-many-requests`, `auth/network-request-failed`) e volta ao login |
| sucesso | `onAuthSuccess` do provider grava o cookie, mostra o aviso de sucesso e navega; o e-mail guardado é apagado |

#### 5.4 `packages/auth`

- `client.ts`: `signInWithEmailLinkCode({ email, oobCode })` monta a URL que o SDK aceita
  (`<origin><pathname>?mode=signIn&oobCode=…&apiKey=<auth.app.options.apiKey>`) e chama `signInWithEmailLink`.
  Medido: o SDK exige `mode` e `apiKey` na URL e usa só o código. Cabe um comentário curto com esse porquê.
- `types.ts`: `EmailLinkSignInDTO = { email: string; oobCode: string }`.
- `provider.tsx`: `signInWithEmailLink: UseMutationResult<UserCredential, Error, EmailLinkSignInDTO>` no contexto,
  com `onSuccess: onAuthSuccess` (`:346-363`) e **sem** `onError` no hook: a página mostra o erro em cartão, e um
  alerta junto duplicaria o aviso (D7). Assim o login pelo link passa pelo mesmo `syncSessionCookie` → cookie
  compartilhado → `resolvePostLoginPath` → `applyAccountPreferences` (`postLoginNavigation.ts:63-78`, que também
  põe o `Authorization` no `apiClient`) que o login por senha usa.
- Último acesso e onboarding vêm de graça: o `authApi.me()` do pós-login passa pelo guard que carimba o acesso
  (`apps/api/(shared)/lib/activity-recorder.ts`), e a home leva ao onboarding pendente no servidor
  (`(common)/layout.tsx:53-56`).

### 5.5 i18n

| Chave | Onde |
|-------|------|
| `apps.app.pages.signIn.emailLink` | `translations/apps/app/pages/signIn/index.ts` |
| `apps.app.pages.emailLinkSignIn.*` (árvore abaixo) | arquivo novo `translations/apps/app/pages/emailLinkSignIn/index.ts`, registrado em `pages/index.ts` |
| `packages.utils.apiErrors.AUTH_EMAIL_LINK_DISABLED` | `translations/packages/shared/utils.ts` |

E-mail: nenhuma chave nova. O slug `confirmAccess` existe nos três idiomas
(`translations/packages/email/index.ts:22-28`, `:90-96`, `:158-164`). O `name` do e-mail é o próprio endereço, como
na recuperação (`reset-request/route.ts:42`).

### 6. Autorização e segurança

| Risco | Mitigação adotada |
|-------|-------------------|
| Enumeração de conta | Respostas do POST dependem só da configuração; entrega em `after()`; conta inexistente, inelegível ou desativada recebe o mesmo `200`; tela "enviado" idêntica; log sem endereço |
| Abuso de envio | POST na lista de rate limit da API (20 por 60 s por IP, `packages/security/index.ts:11-17`). Sem `ARCJET_KEY` não há limite, como já acontece com a recuperação (`apps/api/.env.example:69-74`) |
| Open redirect | O cliente não envia URL nenhuma. A URL de continuação e a base do link vêm de `NEXT_PUBLIC_APP_URL` no servidor. O link não carrega `redirect`; o destino sai de `resolveDefaultPostLoginForApp` (home, admin ou idioma preferido) |
| Link reutilizado | Uso único no Firebase (medido: `auth/invalid-action-code`) |
| Link expirado | `auth/expired-action-code` → cartão com "Pedir outro". Prazo definido pelo Firebase, não documentado (🔒) |
| Troca de dispositivo / fixação de sessão | Sem o e-mail guardado, a página pede o e-mail; e-mail diferente → `auth/invalid-email` (medido) |
| Leitor de link corporativo | A página não conclui nada sem o e-mail guardado naquele navegador, e a conclusão é JavaScript no cliente, nunca num GET do servidor |
| Sequestro prévio de conta | Conta não verificada não recebe link (D1) |
| Conta desativada | Firebase recusa a conclusão (`auth/user-disabled`, medido) e `sessionPOST` não emitiria cookie (`disabled-account-revocation`) |
| Segundo fator | Ainda não existe (`account-security-mfa` está no backlog). Quando existir, o Firebase responde `auth/multi-factor-auth-required` na conclusão e a página terá de tratar |
| Impersonação | N/A: fluxo sem sessão; a área de conta não muda |

Autorização espelhada: a flag, a elegibilidade e a configuração de e-mail são decididas na API. O link que some
da tela de login é só apresentação.

### 6.1 Modo degradado

| Situação | API | App |
|----------|-----|-----|
| `EMAIL_LINK_SIGN_IN_ENABLED` ausente, `""` ou diferente de `"true"` | GET `{ enabled: false }`; POST `404 AUTH_EMAIL_LINK_DISABLED` | login como hoje; página de pedido mostra "indisponível" |
| Flag ligada, sem Resend ou sem `NEXT_PUBLIC_APP_URL` | GET `{ enabled: false }`; POST `503 EMAIL_NOT_CONFIGURED` | igual à linha de cima |
| API fora do ar | GET falha | o link não aparece |
| E-mail sem conta | `200 { requested: true }`, nenhum envio | painel "enviado" |
| Conta só Google ou não verificada | `200`, nenhum envio, log `not-eligible` | painel "enviado" |
| Conta desativada | `200`, link enviado | conclusão mostra "Esta conta foi desativada." traduzido |
| Provedor de link desligado ou domínio não autorizado no projeto real | `200`; a geração em `after()` loga `auth/operation-not-allowed` ou `auth/unauthorized-continue-uri`; nenhum e-mail sai | painel "enviado". Link antigo concluído com o provedor desligado → `auth/operation-not-allowed` traduzido |
| Resend falha na entrega | `200`; `sendEmail` não lança e registra a falha; exceção inesperada vira log `auth email-link-delivery-failed` com `requestId` | painel "enviado" |
| Flag desligada com links já enviados | nada a fazer | o link ainda conclui até expirar; para cortar na hora, desligar "Link de e-mail" no console (documentar) |

Nenhum caminho responde 500.

### 6.2 Pré-requisitos manuais de infra

O `/develop` não consegue cumprir nenhum destes e o `/test` não reprova por eles. Vão para
`docs/PRE-PRODUCTION.md` como item novo, com remissão aos itens 3, 4 e 8 que já existem.

1. **Firebase console › Authentication › Sign-in method:** provedor "E-mail/senha" ativo **e** a opção "Link de
   e-mail (login sem senha)" ativa. O emulador não confere isso.
2. **Firebase console › Authentication › Settings › Domínios autorizados:** o host de `NEXT_PUBLIC_APP_URL` da
   `apps/api`. Projeto criado depois de 28/04/2025 não traz `localhost`.
3. **Resend:** `RESEND_TOKEN` e `RESEND_FROM` com domínio SPF/DKIM verificado na `apps/api` (PRE-PRODUCTION §3).
4. **`NEXT_PUBLIC_APP_URL` na `apps/api`** apontando para a `apps/app` real (PRE-PRODUCTION §4).
5. **`ARCJET_KEY` na `apps/api`** para o rate limit valer (PRE-PRODUCTION §8).
6. **`EMAIL_LINK_SIGN_IN_ENABLED="true"` na `apps/api`** do ambiente que quer o recurso.

### 7. Testes

Todos no nível mais barato. Nenhum teste de emulador: os fatos de infraestrutura foram medidos nesta análise
(§1.2) e o caminho real com o SDK do navegador é percorrido no `/test` contra o emulador de Auth.

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `apps/api/__tests__/authActionLinks.test.ts` (novos casos) | unidade, `@repo/auth/server` mockado como em `:17-27` | `"sign-in"` chama `generateSignInWithEmailLink` com `{ url: "https://app.example.com/pt-br/sign-in/email-link", handleCodeInApp: true }` e devolve `https://app.example.com/pt-br/sign-in/email-link?oobCode=CODE-123`; conta só Google e conta não verificada → `null`, gerador não chamado, log `not-eligible` sem endereço; conta desativada → link gerado; `auth/operation-not-allowed` e `auth/unauthorized-continue-uri` → `null`, sem lançar; os três `kind` antigos inalterados |
| `apps/api/__tests__/emailLinkSignInEnabled.test.ts` | unidade | `isEmailLinkSignInEnabled` para `undefined`, `""`, `"  "`, `"false"`, `"1"`, `"true"`, `" TRUE "` |
| `apps/api/__tests__/authEmailLinkSignInRoute.test.ts` | rota, com `@/env`, `@repo/email`, `next/server#after` e o gerador mockados (molde de `authPasswordReset.test.ts`) | GET: matriz flag × e-mail × `NEXT_PUBLIC_APP_URL`. POST: flag desligada → 404 sem ler o corpo; sem e-mail → 503; corpo inválido → 400; endereço com e sem conta → corpo e status idênticos; `after` agenda a entrega só no caminho válido; falha de envio não muda a resposta |
| teste de proxy existente (`corsOrigin.test.ts`/`proxyArcjetKey.test.ts`) | unidade | `/auth/sign-in/email-link/request` limitado; `/auth/sign-in/email-link` não |
| `packages/auth/__tests__/emailLinkSignIn.test.ts` | unidade, `firebase/auth` mockado | URL montada com `mode=signIn`, `oobCode` codificado e `apiKey`; e-mail repassado |
| `apps/app/__tests__/emailLinkSignInLib.test.ts` | unidade | storage tolera `localStorage` que lança; `emailLinkFailureOf` para cada código |
| `apps/app/__tests__/signInEmailLinkEntry.test.tsx` | componente, SDK mockado | link aparece só com `enabled: true`; ausente com `false`, erro e carregando |
| `apps/app/__tests__/emailLinkRequestForm.test.tsx` | componente | e-mail inválido não chama a API; sucesso grava o e-mail e mostra o painel "enviado"; erro com `error.code` vira alerta traduzido; duplo clique não envia duas vezes; `enabled: false` mostra "indisponível" |
| `apps/app/__tests__/emailLinkCompletion.test.tsx` | componente, `useAuth` mockado | com e-mail guardado conclui uma vez (StrictMode); sem e-mail não chama o Firebase no mount; `mismatch` mantém o formulário com erro e permite nova tentativa; `expired`/`invalid` mostram "Pedir outro link" com o href certo; `auth/user-disabled` mostra o texto traduzido; sucesso apaga o e-mail guardado |
| `packages/internationalization` (paridade existente) | unidade | chaves novas nos 3 idiomas |

### 8. O que o `/test` vai percorrer

Ambiente: emuladores + seed, `EMAIL_LINK_SIGN_IN_ENABLED="true"` e placeholder de Resend na `apps/api` (como fez
`auth-recovery-verification`, report `:357`), restaurando o `.env` byte a byte no fim. O código sai de
`GET http://127.0.0.1:9099/emulator/v1/projects/demo-next-boilerplate/oobCodes` (`requestType: "EMAIL_SIGNIN"`).

1. **Flag desligada:** tela de login idêntica à de `main`; `/pt-br/sign-in/email-link` mostra "indisponível".
2. **Pedido:** `user@example.com` (seed, verificado) pede o link; painel "enviado"; o emulador registra o código.
3. **Mesmo navegador:** abrir `/<locale>/sign-in/email-link?oobCode=<código>` → entra no painel; cookie
   `access-token` emitido; `lastAccessAt` do perfil carimbado.
4. **Reuso:** abrir o mesmo link de novo (em sessão limpa) → cartão "já usado" com "Pedir outro link".
5. **Outro navegador:** contexto limpo, abrir um link novo → pede o e-mail; e-mail errado → erro no campo; e-mail
   certo → entra.
6. **E-mail sem conta:** mesmo painel; nenhum código novo no emulador.
7. **Conta só Google e conta não verificada** (criadas para o QA com `qa-magic-link-*@example.com`): mesmo painel;
   nenhum código; `providerData` inalterado.
8. **Conta desativada** (admin desativa uma conta de QA verificada): pede, abre o link → "Esta conta foi
   desativada." no idioma da tela.
9. **Onboarding pendente:** conta de QA verificada com onboarding pendente → o link leva ao onboarding.
10. **Admin:** `admin@example.com` pelo link → cai em `/admin`.
11. **Leitor de link:** `curl` no link → HTML sem efeito; o código continua utilizável depois.
12. Light + dark + mobile, nos 3 idiomas, para a tela de login com o link, o pedido, o painel "enviado", o pedido
    de e-mail e os cartões de erro.

🔒 sem infra externa: entrega real pelo Resend; comportamento do console com o provedor de link desligado e com o
domínio não autorizado; remoção da senha de conta não verificada em projeto real (o filtro D1 evita que ela
ocorra, mas a premissa vem da doc); prazo de expiração do link; leitor de link de um provedor de e-mail
corporativo real; rate limit com `ARCJET_KEY` real.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Recurso desligado por padrão**
  Com `EMAIL_LINK_SIGN_IN_ENABLED` ausente, vazia, `"false"` ou qualquer valor diferente de `"true"`, a API sobe,
  o build passa e a tela de login da `apps/app` é idêntica à de antes, sem o link "Receber link de acesso por
  e-mail". `GET /auth/sign-in/email-link` responde `200 { data: { enabled: false } }` e
  `POST /auth/sign-in/email-link/request` responde `404` com `AUTH_EMAIL_LINK_DISABLED`, sem ler o corpo.

- [ ] **Ligado sem e-mail configurado, a opção não aparece**
  Com a flag em `"true"` e `RESEND_TOKEN`/`RESEND_FROM` ou `NEXT_PUBLIC_APP_URL` ausentes na API, o GET responde
  `enabled: false` e a tela de login fica como antes. O POST, chamado direto, responde `503 EMAIL_NOT_CONFIGURED`,
  com a mensagem traduzida nos 3 idiomas. Nenhum caminho responde 500.

- [ ] **Ligado e configurado, a tela de login oferece o link**
  Com a flag em `"true"` e o e-mail configurado, o link aparece no rodapé do cartão de login, nos 3 idiomas, e leva
  a `/<locale>/sign-in/email-link`. Enquanto a disponibilidade carrega ou se a consulta falhar, o link não aparece
  e o formulário de senha não se desloca.

- [ ] **Pedido responde igual exista ou não a conta**
  Para um e-mail com conta elegível, sem conta, de conta só Google, de conta com e-mail não confirmado e de conta
  desativada, o POST responde `200 { data: { requested: true } }` com o mesmo corpo, e a tela mostra o mesmo
  painel "enviado". Só a conta elegível e a desativada recebem e-mail. O log de recusa não contém o endereço.

- [ ] **E-mail no idioma escolhido com o texto `confirmAccess`**
  O e-mail usa o template de link de ação com o slug `confirmAccess` no idioma da tela em que o pedido foi feito.
  O botão aponta para `<NEXT_PUBLIC_APP_URL>/<locale>/sign-in/email-link?oobCode=<código>` e nunca para o handler
  do Firebase. Locale ausente ou inválido no corpo cai no padrão do fork ou é recusado pela validação, como na
  recuperação.

- [ ] **Validação na borda**
  E-mail vazio, só com espaços, sem `@` ou acima de 320 caracteres é recusado no formulário (mensagem do
  dicionário) e, se enviado direto à API, com `400`. Corpo que não é JSON segue o tratamento de
  `parseRequestJson`. Campo extra no corpo, como uma URL, é ignorado.

- [ ] **Rate limit no pedido**
  Com `ARCJET_KEY` configurada, o POST conta no limite por IP das rotas de entrada e responde `429
  AUTH_RATE_LIMITED` com `Retry-After` ao estourar. O GET de disponibilidade não conta no limite. Sem a chave, o
  comportamento é o mesmo da recuperação de senha (sem limite, aviso no boot).

- [ ] **Mesmo navegador entra direto**
  Ao abrir o link no navegador em que o pedido foi feito, a página conclui o login sem pedir nada, mostra o aviso
  de sucesso e navega para a home (ou `/admin` para admin, ou o idioma preferido da conta). O cookie
  compartilhado é emitido como no login por senha, o último acesso é registrado e uma conta com onboarding
  pendente cai no onboarding. O e-mail guardado no navegador é apagado depois do sucesso.

- [ ] **Outro navegador pede o e-mail**
  Sem o e-mail guardado, a página não chama o Firebase ao carregar e pede o e-mail. Com o e-mail certo, entra.
  Com um e-mail diferente, mostra erro no campo e deixa tentar de novo, porque o código não é gasto. Um leitor de
  link que só baixa a página não consome o acesso.

- [ ] **Link usado ou expirado**
  Reabrir um link já usado mostra o cartão de link inválido; um link expirado mostra o cartão de link expirado.
  Os dois têm "Pedir outro link", que leva ao formulário de pedido. Um `oobCode` vazio ou inventado também cai no
  cartão de link inválido. Nada disso gera alerta duplicado.

- [ ] **Conta desativada não entra**
  Uma conta desativada pelo admin recebe o link, mas ao concluir a página mostra "Esta conta foi desativada." (e
  os equivalentes em en/es), sem cookie e sem navegar para o painel.

- [ ] **Conta sem senha nunca é criada pelo link**
  Conta que só entra pelo Google e conta com e-mail não confirmado não recebem link. Depois do pedido, o
  `providerData` delas continua igual, e a aba Segurança, a exclusão de conta e a troca de e-mail se comportam
  como antes. A conta com senha e e-mail confirmado que entra pelo link continua com a senha, vê o formulário de
  troca de senha e consegue trocá-la com a senha atual.

- [ ] **Sessão já aberta**
  Quem já tem sessão e abre o link é levado à home pelo proxy, sem trocar de conta. O link continua utilizável
  depois do logout, até expirar.

- [ ] **Submit repetido**
  Clicar várias vezes em "Enviar link" ou em "Entrar" na confirmação do e-mail dispara uma requisição só enquanto
  a primeira está em andamento; o botão fica em estado de carregamento.

- [ ] **Falha de provedor nunca vira 500**
  Se a geração do link falhar no projeto real (provedor de link desligado, domínio não autorizado) ou o Resend
  recusar o envio, a resposta continua `200 { requested: true }` e a API registra um log sem endereço. Concluir
  um link com o provedor desligado mostra "Operação não permitida." traduzido.

- [ ] **Paridade de i18n e copy**
  Toda string nova (link da tela de login, título e textos do pedido, painel "enviado", "indisponível", pedido de
  e-mail, cartões de erro, "Pedir outro link", `AUTH_EMAIL_LINK_DISABLED`) existe em pt-br, en e es, e o teste
  de paridade passa. Nenhuma string fica solta em JSX.

- [ ] **Tema e responsivo**
  A tela de login com o link, o formulário de pedido, o painel "enviado", o pedido de e-mail e os cartões de erro
  ficam legíveis em light e dark, em desktop e mobile, nos 3 idiomas, usando os tokens do design system.

---

## Etapa 2 — Blueprint técnico

### 10.1 Contrato (`packages/sdk/src/actions/auth/action.ts`)

```ts
export type EmailLinkSignInAvailability = { enabled: boolean };

export type EmailLinkSignInRequestBody = {
    email: string;
    /** Language of the email. Absent falls back to the fork's default locale. */
    locale?: string;
};

async emailLinkSignInAvailability(): Promise<EmailLinkSignInAvailability> {
    const { data } = await this.client.request<Response<EmailLinkSignInAvailability>>({
        url: "/auth/sign-in/email-link",
        method: "GET",
    });
    return data.data;
}

async requestEmailLinkSignIn(body: EmailLinkSignInRequestBody): Promise<AuthActionRequested> {
    const { data } = await this.client.request<Response<AuthActionRequested>>({
        url: "/auth/sign-in/email-link/request",
        method: "POST",
        data: body,
    });
    return data.data;
}
```

### 10.2 Rotas

`apps/api/app/(routes)/auth/sign-in/email-link/route.ts`

```ts
export function GET() {
    return Response.json({ data: { enabled: isEmailLinkSignInAvailable() } });
}
```

`apps/api/app/(routes)/auth/sign-in/email-link/request/route.ts`

```ts
function deliverSignInLink(email: string, locale: Locale, requestId: string | null): void {
    after(async () => {
        try {
            const url = await buildAuthActionLink("sign-in", email, locale);
            if (!url) return;
            await sendEmail({
                template: actionLinkEmail,
                to: email,
                locale,
                data: { name: email, url, action: "confirmAccess" },
            });
        } catch {
            logEvent("auth", "email-link-delivery-failed", { requestId });
        }
    });
}

export async function POST(req: Request) {
    if (!isEmailLinkSignInEnabled()) {
        return Response.json({ error: { code: "AUTH_EMAIL_LINK_DISABLED" } }, { status: HTTP_STATUS.NOT_FOUND });
    }
    if (!canSendAuthActionLink()) {
        return Response.json({ error: { code: "EMAIL_NOT_CONFIGURED" } }, { status: HTTP_STATUS.SERVICE_UNAVAILABLE });
    }
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) return parsedBody.response;
    const parsed = parseEmailLinkSignInRequest(parsedBody.value);
    if (!parsed.ok) return parsed.response;

    const { email, locale } = parsed.value;
    deliverSignInLink(email, resolveLocale(locale), requestIdFrom(req));
    return Response.json({ data: { requested: true } });
}
```

`deliverSignInLink` repete a forma de `deliverResetLink` (`reset-request/route.ts:22-50`). São dois chamadores;
extrair um helper fica para quando houver o terceiro.

`apps/api/(shared)/lib/email-link-sign-in.ts`

```ts
export const isEmailLinkSignInEnabled = (): boolean =>
    env.EMAIL_LINK_SIGN_IN_ENABLED?.trim().toLowerCase() === "true";

export const isEmailLinkSignInAvailable = (): boolean =>
    isEmailLinkSignInEnabled() && canSendAuthActionLink();
```

Payload e respostas:

```http
POST /auth/sign-in/email-link/request
{ "email": "user@example.com", "locale": "pt-br" }

200 { "data": { "requested": true } }
404 { "error": { "code": "AUTH_EMAIL_LINK_DISABLED" } }
503 { "error": { "code": "EMAIL_NOT_CONFIGURED" } }

GET /auth/sign-in/email-link
200 { "data": { "enabled": true } }
```

### 10.3 Pseudo-diff — `apps/api/(shared)/lib/auth-action-links.ts`

```diff
-export type AuthActionKind = "reset-password" | "verify-email" | "change-email";
+export type AuthActionKind =
+    | "reset-password"
+    | "verify-email"
+    | "change-email"
+    | "sign-in";

 const APP_PATH_BY_KIND: Record<AuthActionKind, string> = {
     "reset-password": "reset-password",
     "verify-email": "verify-email",
     "change-email": "verify-email",
+    "sign-in": "sign-in/email-link",
 };

+/**
+ * Signing in by link strips the password of an unverified account and adds a passwordless
+ * password provider to an account that had none, so either would then claim a password it
+ * does not have. Only the account the link leaves untouched gets one.
+ */
+function canSignInByLink(user: UserRecord): boolean {
+    return hasPasswordProvider(user) && user.emailVerified;
+}

+function generateFirebaseLink(auth: Auth, kind: AuthActionKind, email: string, locale: Locale) {
+    if (kind === "reset-password") return auth.generatePasswordResetLink(email);
+    if (kind === "sign-in") {
+        return auth.generateSignInWithEmailLink(email, {
+            url: `${env.NEXT_PUBLIC_APP_URL}/${locale}/${APP_PATH_BY_KIND["sign-in"]}`,
+            handleCodeInApp: true,
+        });
+    }
+    return auth.generateEmailVerificationLink(email);
+}

-    try {
-        await auth.getUserByEmail(email);
+    let user: UserRecord;
+    try {
+        user = await auth.getUserByEmail(email);
     } catch (error) { … }

+    if (kind === "sign-in" && !canSignInByLink(user)) {
+        logRefusedLink(kind, "not-eligible");
+        return null;
+    }

-        firebaseLink =
-            kind === "reset-password"
-                ? await auth.generatePasswordResetLink(email)
-                : await auth.generateEmailVerificationLink(email);
+        firebaseLink = await generateFirebaseLink(auth, kind, email, locale);
```

### 10.4 Pseudo-diffs — outros arquivos da API

```diff
 // apps/api/env.ts
     server: {
         …
+        // "true" turns on sign-in by email link. Anything else, empty included, keeps it off.
+        EMAIL_LINK_SIGN_IN_ENABLED: z.string().optional(),
     },
     runtimeEnv: {
         …
+        EMAIL_LINK_SIGN_IN_ENABLED: process.env.EMAIL_LINK_SIGN_IN_ENABLED || undefined,
     },

 // apps/api/proxy.ts
 const RATE_LIMITED_PATHS = [
     "/auth/sign-in",
     "/auth/sign-up",
     "/auth/sign-in/google",
+    "/auth/sign-in/email-link/request",
     "/auth/password/reset-request",

 // apps/api/(shared)/validation/auth.schema.ts
+export const emailLinkSignInRequestSchema = z.object({
+    email: z.string().trim().max(EMAIL_MAX).email(),
+    locale: localeSchema.optional(),
+});
+export const parseEmailLinkSignInRequest = (body: unknown) =>
+    parseWith(emailLinkSignInRequestSchema, body);
```

O comentário de `RATE_LIMITED_PATHS` (`proxy.ts:30-51`) ganha uma frase dizendo que o GET de disponibilidade fica
fora pelo mesmo motivo do `/auth/me`.

`apps/api/.env.example`, depois de `RESEND_TOKEN`:

```bash
# Sign-in by email link. "true" turns it on; empty or anything else keeps it off. Needs the
# email settings above and NEXT_PUBLIC_APP_URL below, plus "Email link (passwordless sign-in)"
# enabled under Firebase Authentication > Sign-in method and the app host among the authorized
# domains. Only accounts with a password and a confirmed address receive a link.
EMAIL_LINK_SIGN_IN_ENABLED=""
```

### 10.5 `packages/auth`

```diff
 // packages/auth/types.ts
+export type EmailLinkSignInDTO = { email: string; oobCode: string };

 // packages/auth/client.ts
+import { signInWithEmailLink } from "firebase/auth";
+
+/**
+ * The SDK reads the code out of a full action URL and refuses one without the sign-in
+ * mode and an API key, while the email only carries the code.
+ */
+export const signInWithEmailLinkCode = ({ email, oobCode }: EmailLinkSignInDTO) => {
+    const auth = getAuthClient();
+    const actionUrl = new URL(window.location.pathname, window.location.origin);
+    actionUrl.searchParams.set("mode", "signIn");
+    actionUrl.searchParams.set("oobCode", oobCode);
+    actionUrl.searchParams.set("apiKey", auth.app.options.apiKey ?? "");
+    return signInWithEmailLink(auth, email, actionUrl.toString());
+};

 // packages/auth/provider.tsx
 type AuthContextType = {
     …
+    signInWithEmailLink: UseMutationResult<UserCredential, Error, EmailLinkSignInDTO>;
 };
+    const signInWithEmailLinkMutation = useMutation({
+        mutationFn: signInWithEmailLinkCode,
+        onSuccess: onAuthSuccess,
+    });
     …
+                signInWithEmailLink: signInWithEmailLinkMutation,
```

Atenção do `/develop`: `apiKey` vazio faria o SDK recusar a URL. Em todos os modos de configuração de
`client.ts:47-117` o `apiKey` existe (`mock`, `DEMO_WEB_API_KEY` ou o real).

### 10.6 Árvore de arquivos da app

```
apps/app/
  app/[locale]/(unauthenticated)/sign-in/
    components/SignInForm.tsx                      (editado: link condicional)
    email-link/
      page.tsx
      components/EmailLinkRequestForm.tsx
      components/EmailLinkCompletion.tsx
      validations/emailLinkSchema.ts
  shared/hooks/useEmailLinkSignIn.ts
  shared/lib/emailLinkSignIn.ts
  shared/lib/queryKeys.ts                          (editado: queryKeys.auth)
```

Campos:

| Formulário | Campo | Componente |
|------------|-------|------------|
| pedido | `email` | `HookFormInput type="email"` |
| confirmação do e-mail (outro navegador) | `email` | `HookFormInput type="email"` |

Pseudo-diff do `SignInForm.tsx`:

```diff
+    const emailLinkAvailability = useEmailLinkAvailability();
 …
                 <div className="space-y-2 text-center text-sm">
                     <p>
                         <Link … href={`/${locale}/forgot-password`}>
                             {dictionary.apps.app.pages.signIn.forgotPassword}
                         </Link>
                     </p>
+                    {emailLinkAvailability.data?.enabled ? (
+                        <p>
+                            <Link className="text-primary hover:underline" href={`/${locale}/sign-in/email-link`}>
+                                {dictionary.apps.app.pages.signIn.emailLink}
+                            </Link>
+                        </p>
+                    ) : null}
```

O hook vai no topo do componente, junto dos outros, e não depois do retorno condicional de
`SignInForm.tsx:117-119` (hook não pode ficar atrás de um `return`). A consulta roda mesmo enquanto o loader
aparece; é uma requisição barata.

### 10.7 i18n

```ts
// translations/apps/app/pages/signIn/index.ts (pt-br)
emailLink: "Receber link de acesso por e-mail",

// translations/apps/app/pages/emailLinkSignIn/index.ts (pt-br; en e es com a mesma árvore)
export const emailLinkSignInTranslations = {
    "pt-br": {
        meta: { title: "Entrar com link por e-mail", description: "Receba um link de acesso no seu e-mail" },
        request: {
            title: "Entrar com link por e-mail",
            description: "Digite o e-mail da sua conta. Enviamos um link que entra direto, sem senha.",
            form: { email: "E-mail", emailPlaceholder: "seu@email.com", submit: "Enviar link" },
            sent: {
                title: "Confira seu e-mail",
                description:
                    "Se houver uma conta com senha e e-mail confirmado para esse endereço, o link chega em instantes. Não chegou? Use \"Esqueci minha senha\" ou entre com o Google.",
            },
            unavailable: {
                title: "Entrar por link não está disponível",
                description: "Use seu e-mail e senha ou o Google para entrar.",
            },
        },
        complete: {
            signingIn: "Entrando…",
            confirm: {
                title: "Confirme seu e-mail",
                description: "Por segurança, digite o e-mail que recebeu este link.",
                submit: "Entrar",
            },
            mismatch: "Este link foi pedido para outro e-mail.",
            expired: { title: "Este link expirou", description: "Peça um link novo para entrar." },
            invalid: { title: "Este link não vale mais", description: "Ele já foi usado ou está incompleto. Peça um link novo." },
            failed: { title: "Não foi possível entrar" },
        },
        validation: { emailInvalid: "E-mail inválido" },
        requestAnother: "Pedir outro link",
        backToSignIn: "Voltar para o login",
    },
};

// translations/packages/shared/utils.ts → apiErrors (pt-br / en / es)
AUTH_EMAIL_LINK_DISABLED: "Entrar por link não está disponível.",
// en: "Sign-in by email link is not available."
// es: "El acceso por enlace no está disponible."
```

O texto acima é ponto de partida para o `/develop`; ajustes de tom são livres, a estrutura não.

### 10.8 Documentação

- `docs/SETUP.md`, seção do Resend (`:115-116`): uma linha sobre `EMAIL_LINK_SIGN_IN_ENABLED` e o que ela exige.
- `docs/PRE-PRODUCTION.md`: item novo "Entrar com link por e-mail (só se o fork liga)", com os pré-requisitos de
  §6.2 e a instrução de desligar "Link de e-mail" no console para cortar links já enviados.

### 10.9 Ordem de implementação e commits

| # | Commit | Arquivos |
|---|--------|----------|
| 1 | `feat(sdk): email link sign-in actions` | `packages/sdk/src/actions/auth/action.ts` |
| 2 | `feat(api): email link kind in the auth action link builder` | `auth-action-links.ts`, `email-link-sign-in.ts`, `env.ts`, `.env.example`, `authActionLinks.test.ts`, `emailLinkSignInEnabled.test.ts` |
| 3 | `feat(api): email link sign-in routes with rate limit` | as duas rotas, `auth.schema.ts`, `proxy.ts`, `authEmailLinkSignInRoute.test.ts`, teste do proxy |
| 4 | `feat(auth): complete sign-in from an email link code` | `client.ts`, `provider.tsx`, `types.ts`, `emailLinkSignIn.test.ts` |
| 5 | `feat(app): email link sign-in hooks and helpers` | `useEmailLinkSignIn.ts`, `emailLinkSignIn.ts`, `queryKeys.ts`, `emailLinkSignInLib.test.ts` |
| 6 | `feat(app): email link sign-in page and entry on sign-in` | página, componentes, schema, `SignInForm.tsx`, testes de componente |
| 7 | `feat(internationalization): email link sign-in copy` | `signIn`, `emailLinkSignIn`, `pages/index.ts`, `apiErrors` |
| 8 | `docs: email link sign-in setup and pre-production` | `SETUP.md`, `PRE-PRODUCTION.md` |
| 9 | `docs(features): magic-link-sign-in` | `docs/features/magic-link-sign-in/` |

Os commits 4 a 6 compilam só com o 7 junto no typecheck da app (chaves de dicionário). O `/review` decide se
reordena i18n antes da app ou junta; a regra do repo põe i18n por último.

---

## Decisões adotadas

| # | Adotado | Descartado | Por quê |
|---|---------|------------|---------|
| D1 | Link só para conta com provedor `password` e `emailVerified === true` | Gerar para toda conta existente e distinguir depois (marcador no Firestore, `passwordHash` ou `fetchSignInMethodsForEmail`) | Medição + doc do Firebase: só essa conta sai do link sem mudar provedores nem perder a senha. Os discriminadores sem estado próprio não são confiáveis em produção; o marcador custa seis arquivos da área de conta e uma previsão frágil. Também fecha o sequestro prévio de conta |
| D2 | Conta desativada recebe o link e é recusada na conclusão | Não enviar para conta desativada | A spec pede "uma conta desativada recebe a recusa traduzida"; o link não serve para nada sem a conta ativa |
| D3 | Flag só na API + `GET /auth/sign-in/email-link` que diz se está disponível | `NEXT_PUBLIC_*` espelhada na API e na app; app lendo o Resend pelo próprio env | A spec quer a opção escondida quando falta e-mail, e só a API sabe disso. Evita espalhar o token do Resend para a app. Precedente: `payments/plans` responde `enabled: false` |
| D4 | GET em `/auth/sign-in/email-link` sem rate limit; POST em `/auth/sign-in/email-link/request` com rate limit | Os dois no mesmo path | O rate limit casa o path exato, sem olhar método (`proxy.ts:53-71`); o GET entraria no orçamento de 20 por minuto a cada visita ao login |
| D5 | Página `/sign-in/email-link`, pública pelo prefixo `/sign-in`, fora de `OOB_ACTION_PATHS` | Página nova na raiz, listada em `PUBLIC_PATHS` e `OOB_ACTION_PATHS` | Zero mudança no proxy. Quem já tem sessão não troca de conta por acidente |
| D6 | E-mail leva só o `oobCode`; o cliente monta a URL com `mode` e `apiKey` | Enviar o link do Firebase ou incluir `mode`/`apiKey` no e-mail | Mesmo padrão dos outros links (`auth-action-links.ts:35-43`). Medido: o SDK aceita a URL montada |
| D7 | Mutation `signInWithEmailLink` no `AuthProvider`, com `onAuthSuccess` e sem `onError` no hook | Repetir na página o fluxo de cookie e navegação do `SignInForm` | Uma sessão igual à do login por senha sem duplicar código; o erro aparece uma vez, no cartão |
| D8 | O link não carrega `?redirect=` | Carregar o destino sanitizado até a conclusão | Menos superfície de open redirect e de código; o destino padrão já trata admin, idioma e onboarding |
| D9 | Flag desligada → `404 AUTH_EMAIL_LINK_DISABLED` | `503` como os `*_NOT_CONFIGURED` | Desligado é escolha do fork, não indisponibilidade passageira |
| D10 | Liga só com `"true"` (sem diferenciar maiúsculas, com trim) | Qualquer valor não vazio | `"false"` ou `"0"` não podem ligar o recurso por engano |
| D11 | Nenhum teste de emulador | Pôr o Auth na suíte `test:emulator` | A suíte hoje só sobe Firestore e Storage; os fatos de infra foram medidos aqui e o `/test` percorre o caminho real no navegador |
| D12 | Recurso nasce desligado | Nascer ligado | Recomendação da própria spec |

## Perguntas em aberto

**Q1. O link deve servir também a quem não confirmou o e-mail ou só entra pelo Google?**
Opções: (a) só conta com senha e e-mail confirmado; (b) qualquer conta existente, com um marcador no perfil do
Firestore que registra "sem senha" e muda a aba Segurança, a exclusão, a troca de e-mail e o "definir senha".
**Adotada: (a).** É o único caminho em que nenhuma conta passa a fingir que tem senha, sem depender de um campo
do Firebase que a documentação diz não vir no `getUser`. O custo é que quem nunca confirmou o e-mail (a
confirmação aqui é só um aviso) não recebe o link e precisa usar "Esqueci minha senha". A spec previa (b); se o
público não verificado pesar, (b) vira uma spec de continuação com esforço M.

**Q2. Como a tela de login sabe que o recurso está disponível?**
Opções: (a) a API informa por `GET /auth/sign-in/email-link`; (b) a mesma variável `NEXT_PUBLIC_*` nas duas apps.
**Adotada: (a).** Só a API sabe se o e-mail está configurado, e a spec quer a opção escondida sem e-mail. O custo
é uma requisição barata a cada visita ao login, mesmo com o recurso desligado.

**Q3. Conta desativada recebe o e-mail?**
Opções: (a) sim, e a conclusão mostra a recusa; (b) não, como conta inexistente.
**Adotada: (a)**, porque a spec pede que a conta desativada veja a recusa traduzida. (b) economiza um e-mail por
pedido de conta desativada.

**Q4. O destino pedido antes do login (`?redirect=`) deve sobreviver ao link?**
Opções: (a) não, cai no destino padrão; (b) sim, levado no link e sanitizado por `postAuthRedirectTarget`.
**Adotada: (a)**, menor superfície. (b) é uma melhoria pequena e isolada para depois.

**Q5. Conta só Google que pede o link deveria receber um e-mail dizendo "entre com o Google"?**
**Adotada: não.** Fica igual a conta inexistente, sem e-mail. O texto do painel "enviado" já orienta.

## Notas para as próximas etapas

- O emulador **não** remove a senha de conta não verificada no login por link, e a produção remove. Teste algum
  deve tratar o comportamento do emulador como prova de produção nesse ponto.
- Contas de QA: prefixo `qa-magic-link-`, listar no relatório para limpeza.
- `account-security-mfa`: quando existir, a página de conclusão precisa tratar `auth/multi-factor-auth-required`.
