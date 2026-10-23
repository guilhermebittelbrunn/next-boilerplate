---
id: social-sign-in-providers
title: Login com GitHub e Microsoft, ligados por configuração
status: deferred
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/auth, packages/sdk, packages/internationalization]
mode: ambos
depends_on: [linked-sign-in-methods]
contends_on: [packages/auth/client.ts, apps/api/(shared)/lib/firebase-identity-toolkit.ts, "apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx", "apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx"]
feature: -
updated: 2026-10-23
---

# Login com GitHub e Microsoft, ligados por configuração

> **`deferred` em 2026-10-16 — motivo.** Depende de [`linked-sign-in-methods`](../docs/features/linked-sign-in-methods/spec.md), aprovada
> no mesmo dia e ainda não entregue, e nenhum fork pediu GitHub ou Microsoft. Volta para a fila quando a dependência
> for entregue e um fork pedir o provedor.
>
> **Atualização de 2026-10-19 (`/spec --sync`, pós-PR #48):** a dependência foi entregue e arquivada em
> [`docs/features/linked-sign-in-methods/spec.md`](../docs/features/linked-sign-in-methods/spec.md). Metade do
> motivo do adiamento caiu; a outra metade (nenhum fork pediu GitHub ou Microsoft) continua. O status segue
> `deferred` até você decidir. Duas coisas da entrega encurtam o corte desta spec: o `DELETE
> /account/sign-in-methods/[id]` aceita qualquer provedor que a conta liste (`[id]/route.ts:64-70`; era `:36-42` até
> a PR #51, que acrescentou a nova tentativa de devolução do e-mail), e a lista da
> aba Segurança já mostra um provedor desconhecido com o id cru (`AccountSignInMethodsPanel.tsx:85-91`). Falta o
> botão de vincular, que hoje só existe para o Google (`:210-223`).

## Problema

O único login social do core é o Google. Um MVP para desenvolvedores perde gente que espera "Entrar com GitHub"; um
MVP vendido a empresas perde quem usa conta Microsoft no trabalho. Hoje, acrescentar um provedor significa abrir o
fluxo do Google e duplicá-lo do cliente até a API, e o fork bate no problema que o Google sozinho não mostra: a
mesma pessoa chegando por dois provedores com o mesmo e-mail.

## O que já existe no repo

- `packages/auth/client.ts:169-174` (era `:152-157` até a PR #56, que acrescentou `signInWithEmailLinkCode` acima, e
  `:150-155` até a PR #48) — `signInWithGoogle` abre o popup com `GoogleAuthProvider`; não há outro provedor no
  repositório (grep por `GithubAuthProvider`, `OAuthProvider` e `microsoft` vazio fora de testes, reconferido em
  2026-10-22). Desde a PR #48, `linkGoogle` e `reauthenticateWithGoogle` (`:187`, `:195`; eram `:170`, `:178` até a
  PR #56) também usam só o Google.
- `packages/auth/provider.tsx:376`, `:383`, `:386-389` — desde a PR #56 o `AuthProvider` tem três mutations de login
  (senha, Google e link por e-mail), todas terminando no mesmo `onAuthSuccess` (`:353-370`). Um provedor novo entra
  como a quarta, no mesmo molde.
- `apps/app/shared/lib/googleSignInApi.ts:21-79` (era `:17-36` até a PR #50, que separou a troca pela sessão da API e desloga o popup quando a API recusa) — o fluxo da app: popup do Google, ID token do Google, ação
  `authApi.signInWithGoogle` do SDK, sessão devolvida pela API.
- `apps/api/(shared)/lib/firebase-identity-toolkit.ts:200-215` — a API conclui o login no Identity Toolkit com
  `providerId=google.com` fixo.
- `apps/api/app/(routes)/auth/sign-in/google/route.ts:16-64` (era `:10-40` até a PR #51 e `:9-30` até a PR #50) —
  desde a PR #51 a rota valida o corpo com `parseRequestJson` e `parseGoogleSignIn` (`:17-25`; o schema é
  `googleSignInSchema`, `(shared)/validation/auth.schema.ts:45-51`, era `:40-46` até a PR #56, com `requestUri`
  restrito a `http` e `https`) e
  responde a recusa do provedor com `{ error: { code } }`, `400 AUTH_INVALID_CREDENTIALS` ou
  `429 USERS_AUTH_RATE_LIMITED` (`:33-45`). Antes ela lia o corpo sem validação e devolvia a mensagem crua do
  provedor em 401. A parte "a rota do Google entra no mesmo contrato" do impacto na `apps/api` já está paga; falta
  generalizar a rota para outros provedores.
- `apps/app/.../sign-in/components/SignInForm.tsx:188-198` (remedida em 2026-10-22: a PR #56 acrescentou duas linhas
  acima, e a âncora anterior, `:187-197`, já estava uma linha adiantada) e `sign-up/components/SignUpFormClient.tsx` —
  um botão do Google em cada tela. Desde a PR #56 o login também tem o link "Receber link de acesso por e-mail"
  (`:209-218`), condicionado à disponibilidade que a API informa.
- `apps/api/proxy.ts:60-78` — `/auth/sign-in/google` está no rate limit (`:63`; a lista era `:55-70`, com a rota em
  `:58`, até a PR #57, que acrescentou um parágrafo de comentário acima e três rotas de convite ao fim, `:53-67` até a PR #56,
  que acrescentou `/auth/sign-in/email-link/request`, `:49-62` até a PR #49 e `:45-58` até a PR #47).
- `docs/FORKING.md:175` — o roteiro do fork descreve "e-mail/senha e Google".
- **Lacuna:** não há forma de ligar outro provedor sem escrever um fluxo novo inteiro.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
  2026-10-16, seção "Provedores sociais além do Google".
- Prevalência: **5 de 10** starters oferecem pelo menos um provedor além do Google (Makerkit, Supastarter, Open
  SaaS, Saas UI e o starter arquivado da Vercel, este só com GitHub). ShipFast tem só o Google; Nextacular, só
  e-mail.
- Provedor: o Firebase oferece GitHub e Microsoft no plano gratuito. O emulador só aceita `signInWithCredential`
  para provedores com ID token JWT (Google, Apple e outros); o GitHub devolve access token, que o emulador não
  aceita por esse caminho.
- Fontes: <https://makerkit.dev/nextjs-saas-starter-kit> · <https://supastarter.dev/docs/nextjs/authentication/overview> ·
  <https://wasp.sh/docs/auth/overview> · <https://firebase.google.com/docs/emulator-suite/connect_auth> (lidas em
  2026-10-16).

## Proposta — corte de MVP

- [ ] O fork liga GitHub e Microsoft, cada um por configuração própria. Provedor ligado ganha botão no login e no
      cadastro da app, com texto nos três idiomas; provedor desligado não tem botão e a API recusa o login por ele.
- [ ] Entrar por um provedor cria a conta, com perfil e onboarding, ou entra na existente, com a mesma sessão dos
      outros métodos.
- [ ] Se o e-mail já pertence a uma conta de outro método, a tela explica com código traduzido e orienta a entrar
      pelo método existente e vincular o provedor na aba Segurança. Nenhuma conta duplicada nasce desse caso.
- [ ] A lista de métodos de login de [`linked-sign-in-methods`](../docs/features/linked-sign-in-methods/spec.md) mostra os provedores
      novos e permite vinculá-los e desvinculá-los.
- [ ] O fluxo do Google passa a ser um caso do mesmo mecanismo, sem mudar o que o usuário vê.

### Fora do corte

- **Apple**: exige inscrição no programa de desenvolvedor da Apple, com custo não confirmado nesta rodada; entra
  quando um fork pedir.
- **Facebook e X**: devolvem access token, que o emulador não aceita por credencial; sem prova automatizada.
- **SAML e OIDC empresarial**: a lacuna "SSO enterprise · SCIM" segue descartada.
- **Botões na landing**: o login da `apps/web` tem achados abertos (não redireciona depois de entrar); fica para
  depois deles. *(Nota de 2026-10-22: o redirecionamento foi corrigido pela PR #55, `web-auth-forms`. Seguem abertos
  na landing o link de "esqueci a senha" e os dois `AuthProvider` aninhados, que dobram o `POST /api/auth/session`
  de cada login social; o segundo pesa para quem acrescentar botões ali.)*

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | A ação de login social passa a nomear o provedor. |
| `apps/api` | A conclusão no Identity Toolkit aceita os provedores ligados, com validação na borda e `error.code`; a rota do Google entra no mesmo contrato. |
| `apps/app` | Botões por provedor ligado no login e no cadastro. |
| `apps/web` | N/A no corte. |
| `packages/*` | `auth`: provedores no cliente. i18n: nomes de botão e `apiErrors` nos três idiomas. |
| Infra/env | Uma configuração por provedor; o app OAuth de cada provedor é registrado pelo fork no GitHub e no Azure e cadastrado no console do Firebase, passo novo do `docs/FORKING.md`. |

## Riscos e trade-offs

- **Prova automatizada.** Pelo que a doc do emulador diz, o caminho atual (token do provedor enviado à API) não
  funciona com o access token do GitHub sob o emulador. O `/analyze` precisa escolher um caminho que o `/test`
  consiga provar, ou declarar o 🔒.
- **Mesmo e-mail, provedores diferentes.** Com "uma conta por e-mail" no Firebase, o segundo provedor falha com
  `account-exists-with-different-credential`; sem essa opção, nascem duas contas. A spec depende de
  `linked-sign-in-methods` por isso.
- **E-mail não verificado.** Se o provedor devolver o e-mail como não verificado, o perfil precisa respeitar o
  `emailVerified` que vier, e o banner de e-mail não verificado continua valendo. Como cada provedor trata isso não
  foi conferido nesta rodada.
- **Passo manual por fork.** Cada provedor ligado é um app OAuth a registrar e manter (segredo, URL de retorno).
  Desligado por padrão, o fork que não usa não paga nada.

## Sinais de pronto

- Com o GitHub ligado e o emulador, um usuário novo entra pelo GitHub, passa pelo onboarding e chega ao painel
  (ou o critério fica 🔒 com o motivo, se o emulador não cobrir o caminho escolhido).
- Um usuário do seed com senha tenta o GitHub com o mesmo e-mail e recebe a orientação traduzida, sem conta nova.
- Com os provedores desligados, as telas de login e cadastro ficam como hoje.
- O login pelo Google continua funcionando sem mudança visível.

## Perguntas em aberto

- Quais provedores entram no corte? — **recomendação:** GitHub e Microsoft, que cobrem o público de desenvolvedor e
  o corporativo sem custo de conta.
