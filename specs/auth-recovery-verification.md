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
updated: 2026-08-21
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
- **Lacuna:** `packages/auth/client.ts` expõe `signIn:119`, `signInWithGoogle:127`, `signUp:137`, `logout:145`, `loginWithCustomToken:155`, `getIdToken:182` — e nada de reset/verificação. Buscar por `sendPasswordResetEmail`, `sendEmailVerification` e `updatePassword` em `apps/` + `packages/` retorna **zero ocorrências**. `apps/app/app/[locale]/(unauthenticated)/` só tem `sign-in` e `sign-up`, e o rodapé do formulário (`sign-in/components/SignInForm.tsx:186-196`) oferece apenas "criar conta".

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
| `packages/*` | `auth` pode ganhar as operações no cliente; i18n para copy e `apiErrors`; `email` fornece os dois templates |
| Infra/env | `FIREBASE_WEB_API_KEY` (já consumida em `firebase-identity-toolkit.ts:27`) passa a ser obrigatória de fato; envio depende de `RESEND_TOKEN`/`RESEND_FROM` com domínio verificado |

## Riscos e trade-offs

- **Custo herdado por todo fork:** o fluxo só funciona com remetente de e-mail e domínio verificado. Hoje `packages/email/keys.ts:14` deixa isso opcional e o repo sobe sem — depois desta spec, "sobe sem e-mail" passa a significar "quem esquecer a senha perde a conta". Precisa falhar de forma visível, não silenciosa. Cotas do free tier do provedor: **não verificadas** nesta nota.
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
