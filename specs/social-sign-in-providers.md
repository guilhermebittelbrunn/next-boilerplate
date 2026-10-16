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
updated: 2026-10-16
---

# Login com GitHub e Microsoft, ligados por configuração

> **`deferred` em 2026-10-16 — motivo.** Depende de [`linked-sign-in-methods`](linked-sign-in-methods.md), aprovada
> no mesmo dia e ainda não entregue, e nenhum fork pediu GitHub ou Microsoft. Volta para a fila quando a dependência
> for entregue e um fork pedir o provedor.

## Problema

O único login social do core é o Google. Um MVP para desenvolvedores perde gente que espera "Entrar com GitHub"; um
MVP vendido a empresas perde quem usa conta Microsoft no trabalho. Hoje, acrescentar um provedor significa abrir o
fluxo do Google e duplicá-lo do cliente até a API, e o fork bate no problema que o Google sozinho não mostra: a
mesma pessoa chegando por dois provedores com o mesmo e-mail.

## O que já existe no repo

- `packages/auth/client.ts:150-155` — `signInWithGoogle` abre o popup com `GoogleAuthProvider`; não há outro
  provedor no repositório (grep por `GithubAuthProvider`, `OAuthProvider` e `microsoft` vazio fora de testes).
- `apps/app/shared/lib/googleSignInApi.ts:17-36` — o fluxo da app: popup do Google, ID token do Google, ação
  `authApi.signInWithGoogle` do SDK, sessão devolvida pela API.
- `apps/api/(shared)/lib/firebase-identity-toolkit.ts:200-215` — a API conclui o login no Identity Toolkit com
  `providerId=google.com` fixo.
- `apps/api/app/(routes)/auth/sign-in/google/route.ts:9-30` — a rota lê o corpo sem validação e devolve a mensagem
  crua do provedor em 401 (achado novo desta rodada).
- `apps/app/.../sign-in/components/SignInForm.tsx:181-191` e `sign-up/components/SignUpFormClient.tsx` — um botão
  do Google em cada tela.
- `apps/api/proxy.ts:45-58` — `/auth/sign-in/google` está no rate limit.
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
- [ ] A lista de métodos de login de [`linked-sign-in-methods`](linked-sign-in-methods.md) mostra os provedores
      novos e permite vinculá-los e desvinculá-los.
- [ ] O fluxo do Google passa a ser um caso do mesmo mecanismo, sem mudar o que o usuário vê.

### Fora do corte

- **Apple**: exige inscrição no programa de desenvolvedor da Apple, com custo não confirmado nesta rodada; entra
  quando um fork pedir.
- **Facebook e X**: devolvem access token, que o emulador não aceita por credencial; sem prova automatizada.
- **SAML e OIDC empresarial**: a lacuna "SSO enterprise · SCIM" segue descartada.
- **Botões na landing**: o login da `apps/web` tem achados abertos (não redireciona depois de entrar); fica para
  depois deles.

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
