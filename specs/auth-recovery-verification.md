---
id: auth-recovery-verification
title: Recuperação de senha e verificação de e-mail
status: proposed
value: alto
effort: M
audience: produto
area: [apps/api, apps/app, packages/auth, packages/sdk, packages/internationalization]
mode: ambos
depends_on: [transactional-emails]
feature: -
updated: 2026-09-09
---

# Recuperação de senha e verificação de e-mail

## Problema

Quem esquece a senha neste boilerplate **perde a conta**. Não há "esqueci minha senha" em lugar nenhum: nem link na tela de login, nem página, nem rota na API. O único caminho é alguém com acesso ao console do Firebase resetar à mão — o que não escala nem para o primeiro fork.

O outro lado do mesmo buraco: o cadastro é aberto e o e-mail **nunca é verificado**. Qualquer pessoa se registra com um endereço que não controla, o que vira vetor de spam, envenena a base com contas inválidas e impede comunicação transacional confiável. São as duas metades que faltam num auth que, no resto, já está completo (senha, Google, SSO entre apps, sessão compartilhada, impersonação).

## O que já existe no repo

- `apps/api/app/(routes)/auth/` tem exatamente **4 rotas**: `sign-in`, `sign-in/google`, `sign-up`, `me`. Nada de reset, verificação ou troca de senha.
- `apps/api/(shared)/lib/firebase-identity-toolkit.ts` — encapsula o Identity Toolkit por REST: `getWebApiKey():26`, `parseToolkitResponse():36`, `identitySignUp():45`, `identitySignInWithPassword():62`, `identitySignInWithGoogleIdToken():111`, erro tipado `IdentityToolkitError:16`. **É o ponto de extensão natural** — reset e verificação são do mesmo endpoint da mesma API.
- `apps/api/(shared)/lib/toolkit-error-codes.ts:5` — traduz mensagem do toolkit para `error.code` estável; hoje cobre 5 casos (`:8`, `:11`, `:14`, `:17`, `:19`), todos de cadastro.
- `packages/internationalization/translations/packages/shared/utils.ts:28-33` (pt-br) e `:68-72` (en) — os `USERS_AUTH_*` já existem nos 3 idiomas; o padrão de tradução por código está estabelecido.
- `packages/auth/server.ts:212` — `revokeUserSessions`, já usado no logout global (`packages/auth/session-routes.ts:79`), mas **não** após troca de senha, que é onde o mercado espera.
- `packages/sdk/src/types/user/user.ts:33` — `emailVerified` já viaja no `UserWithAuthDTO`; nenhum ponto do código lê esse campo para decidir coisa alguma.
- **Lacuna:** `packages/auth/client.ts` expõe `signIn:109`, `signInWithGoogle:117`, `signUp:127`, `logout:135`, `loginWithCustomToken:145`, `getIdToken:172` — e nada de reset/verificação. Buscar por `sendPasswordResetEmail`, `sendEmailVerification`, `updatePassword`, `generatePasswordResetLink`, `confirmPasswordReset` e `oobCode` em `apps/` + `packages/` retorna **zero ocorrências**. `apps/app/app/[locale]/(unauthenticated)/` só tem `sign-in` e `sign-up`, e o rodapé do formulário (`sign-in/components/SignInForm.tsx:186-196`) oferece apenas "criar conta". `apps/api/app/(routes)/auth/sign-up/route.ts:10-53` cria a identidade e o perfil e **retorna sem disparar e-mail nenhum**.

### A dependência mudou — o que esta spec ainda precisa construir (auditado em 2026-09-09)

`transactional-emails` está **implementada** (13 commits em `email/feat/transactional-emails`, **ainda não
mergeados em `main`** — ver o estado lá). Isso reduz o escopo desta spec, e de um jeito que a redação
acima não capturava:

- **Não são "dois templates novos".** O `action-link` já é genérico por descritor:
  `packages/email/templates/action-link.tsx:11-12` define `ActionSlug = keyof EmailCopy["actionLink"]["actions"]`,
  com o comentário explícito de que **um fork acrescenta uma ação adicionando um slug ao dicionário, sem
  tocar em arquivo de template**. Hoje existe **um** slug (`confirmAccess`,
  `translations/packages/email/index.ts:21`). O trabalho de template desta spec são **2 slugs × 3 idiomas**
  (redefinir senha, verificar e-mail) — não dois componentes.
- **A camada de envio já existe e não lança:** `packages/email/index.ts:88` (`sendEmail`), `:75`
  (`isEmailEnabled`). O que falta é o **gatilho**: `welcomeEmail` e `actionLinkEmail` não têm chamador de
  produção nenhum, e esta spec é a primeira que os chamaria de verdade.
- **Herança de risco:** a base de e-mail nunca foi exercitada por um caminho alcançável pela UI (o único
  consumidor, a action de contato da landing, não tem chamador). **Esta spec é quem vai descobrir
  qualquer defeito de integração dela** — orce isso.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md)
- Prevalência: **10/10** — "e-mail+senha, OAuth social, verificação de e-mail e recuperação de senha aparecem em todos, sem exceção". É o único item do painel com prevalência total, classificado como **bloqueador** e esforço **P**. Não entregar não é diferencial, é lacuna.
- A mesma nota observa que kits antigos (ShipFast, Nextacular) tratam verificação como opcional — "e isso vira vetor de spam em signup aberto".
- Fontes: <https://firebase.google.com/docs/reference/rest/auth> · <https://www.better-auth.com/docs/authentication/email-password>

## Proposta — corte de MVP

- [ ] A tela de login oferece "esqueci minha senha" e o usuário pede a redefinição informando o e-mail.
- [ ] O usuário recebe um e-mail traduzido no seu idioma com link de validade limitada e define a senha nova por uma tela do próprio app — não pela página padrão do Firebase.
- [ ] Redefinir a senha encerra as sessões ativas daquele usuário em todos os apps.
- [ ] O cadastro dispara e-mail de verificação, e o app mostra ao usuário não verificado um aviso com opção de reenviar (protegida contra rajada).
- [ ] Os erros novos do fluxo (link expirado, e-mail desconhecido, excesso de tentativas) chegam ao front como `error.code` traduzido nos 3 idiomas — sem mensagem crua do provedor.

### Fora do corte

- **Bloquear o acesso de quem não verificou o e-mail** — decisão de produto de cada fork; aqui só expomos o estado. Bloquear por padrão quebraria forks de cadastro aberto.
- **Troca de senha autenticada** e "sair de todos os dispositivos" na UI — são de `account-settings`, que reaproveita este mesmo ponto de extensão.
- **MFA/2FA** — prevalência 3/10 na nota; spec própria, se algum dia.
- **Troca de e-mail** (com verificação do endereço novo) — iteração seguinte.
- **Rate limiting robusto** das tentativas de reset — `api-hardening`.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | ações novas no recurso de auth (pedir reset, confirmar reset, reenviar verificação) |
| `apps/api` | rotas públicas novas sob `auth/`, apoiadas no encapsulamento REST existente; novos códigos no mapeador de erro |
| `apps/app` | link no login + telas de "pedir redefinição", "definir nova senha" e aviso de e-mail não verificado |
| `apps/web` | N/A — o login do usuário vive na `apps/app` |
| `packages/*` | `auth` pode ganhar as operações no cliente; i18n para copy e `apiErrors`; **`email` já fornece a base** — o que falta são 2 slugs de ação no dicionário (`action-link.tsx:11-12`), não templates novos |
| Infra/env | `FIREBASE_WEB_API_KEY` (já consumida em `firebase-identity-toolkit.ts:27`) passa a ser obrigatória de fato; envio depende de `RESEND_TOKEN`/`RESEND_FROM` com domínio verificado |

## Riscos e trade-offs

- **Custo herdado por todo fork:** o fluxo só funciona com remetente de e-mail e domínio verificado. As credenciais seguem **opcionais** (`packages/email/keys.ts:29-42,47-48`) e o repo sobe sem elas — depois desta spec, "sobe sem e-mail" passa a significar "quem esquecer a senha perde a conta". Cotas do free tier do provedor: **não verificadas** nesta nota.
  > **⚠️ Conflito de desenho a resolver no `/analyze` (levantado em 2026-09-09).** A redação original pedia que a ausência de credencial "falhe de forma visível, não silenciosa". A base entregue decidiu o **oposto, de propósito**: `packages/email/index.ts:99-102` devolve `{ sent: false, reason: "not-configured" }` e apenas registra uma linha de `console.warn` — nunca lança, para que a falha de envio não derrube a operação que a originou (item 6 do corte de `transactional-emails`). Os dois comportamentos são defensáveis e **incompatíveis**: para um e-mail de contato, engolir a falha é correto; para "redefinir senha", engolir a falha é perder a conta do usuário em silêncio. Esta spec precisa decidir se propaga o `reason` até a tela (o `SendResult` é união discriminada, então dá) ou se muda a base. **Recomendação:** propagar, sem tocar na base — quem chama decide o que fazer com o `not-configured`.
- **Enumeração de conta:** responder "e-mail não cadastrado" entrega a lista de usuários. A resposta genérica é mais segura e pior de usar — escolha consciente, não acidente.
- **Superfície pública nova sem autenticação**, e `packages/security/index.ts:12` hoje só aplica shield e detecção de bot (vira no-op sem `ARCJET_KEY`, `:16`). Sem limite de taxa, o endpoint de reset vira gerador gratuito de e-mail em nome do fork — e a fatura é do fork.
- **Página de ação própria × página hospedada do Firebase:** a hospedada é grátis e não traduz nem respeita a marca. Assumir a tela custa uma rota a mais e paga em consistência de i18n.

## Sinais de pronto

- Um usuário esquece a senha, pede a redefinição, recebe o e-mail no idioma em que navegava, define a senha nova e entra — sem ninguém tocar no console do Firebase.
- Uma sessão aberta em outro app do monorepo deixa de valer depois da redefinição.
- Um link já usado ou expirado mostra mensagem traduzida, não erro cru.
- Uma conta nova aparece como não verificada até clicar no link, e o reenvio é limitado.

## Perguntas em aberto

- Responder de forma genérica quando o e-mail não existe (anti-enumeração)? — **recomendação:** sim, sempre a mesma resposta.
- O e-mail de verificação sai no cadastro por senha e também no primeiro login Google? — **recomendação:** só no cadastro por senha; o Google já entrega o endereço verificado.
- Verificação ligada por padrão em todo fork ou atrás de uma chave? — **recomendação:** ligada por padrão, com o *bloqueio* de acesso desligado (fora do corte).
