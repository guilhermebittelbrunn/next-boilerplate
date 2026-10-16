---
id: magic-link-sign-in
title: Entrar com link enviado por e-mail
status: proposed
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/auth, packages/sdk, packages/email, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/auth/client.ts, "apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx", apps/api/(shared)/lib/auth-action-links.ts, apps/api/proxy.ts]
feature: -
updated: 2026-10-16
---

# Entrar com link enviado por e-mail

## Problema

Quem esquece a senha hoje faz três passos: pede a recuperação, abre o e-mail, escolhe uma senha nova e só então
entra. Num MVP que a pessoa usa uma vez por semana, esse é o caminho mais comum de volta ao produto, e cada passo
perde gente. O link de acesso por e-mail encurta o retorno para dois passos (pedir e clicar) e não pede uma senha
que a pessoa vai esquecer de novo.

O repositório já envia links de ação pelo e-mail do fork (recuperação de senha, verificação, troca de e-mail) e já
tem até o texto de um e-mail de acesso pronto, sem uso. Falta o fluxo de entrada.

## O que já existe no repo

- `packages/auth/client.ts:142-155` — a app entra com e-mail e senha ou com Google por popup. Não há
  `sendSignInLinkToEmail`, `isSignInWithEmailLink` nem `signInWithEmailLink` no repositório (grep vazio).
- `apps/api/(shared)/lib/auth-action-links.ts:20-23`, `:55-80` — a API gera links de ação pelo Admin SDK, só envia
  com e-mail configurado e devolve "sem link" para conta inexistente, sem erro que revele a conta.
- `apps/api/app/(routes)/auth/password/reset-request/route.ts:20-52` — a recuperação de senha entrega o e-mail em
  segundo plano e responde igual exista ou não a conta. É o padrão que o pedido de link deve seguir.
- `packages/internationalization/translations/packages/email/index.ts:22-28` — o slug `confirmAccess` ("Seu acesso
  a {brand} está pronto", botão "Entrar no painel") existe nos três idiomas e nenhum fluxo o usa.
- `packages/email/templates/action-link.tsx:12` — o template de link de ação aceita ação nova só com um slug novo
  no dicionário.
- `apps/app/app/[locale]/(unauthenticated)/verify-email/page.tsx:30-38` — a página de retorno de links de ação, que
  separa as ações pelo `mode`.
- `packages/auth/session-routes.ts:91` — `sessionPOST` troca o ID token pelo cookie de sessão compartilhado; o login
  por link precisa terminar no mesmo lugar que o login por senha.
- `apps/api/proxy.ts:45-58` — rotas com rate limit, onde o pedido de link precisa entrar.
- **Lacuna:** não existe forma de entrar sem senha além do Google.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
  2026-10-16, seção "Entrar com link por e-mail".
- Prevalência: **5 de 10** starters oferecem (Makerkit, desligado por padrão; Supastarter; ShipFast, como padrão;
  Nextacular, como único método; o starter de assinatura da Vercel, arquivado). Open SaaS e `nextjs/saas-starter`
  não oferecem.
- Provedor: no Firebase o login por link é gratuito e, na web, não depende do Dynamic Links, cujo encerramento em
  25/08/2025 afetou só apps móveis. O Admin SDK gera o link (`generateSignInWithEmailLink`), o que permite enviar
  pelo Resend com o template e o idioma do fork. O emulador de Auth cobre o fluxo.
- Fontes: <https://makerkit.dev/docs/next-supabase-turbo/configuration/authentication-configuration> ·
  <https://shipfa.st/docs/features/magic-links> · <https://firebase.google.com/docs/auth/web/email-link-auth> ·
  <https://firebase.google.com/docs/emulator-suite/connect_auth> (lidas em 2026-10-16).

## Proposta — corte de MVP

- [ ] O fork liga o recurso por variável de ambiente, desligado por padrão. Ligado, a tela de login da app oferece
      "Receber link de acesso por e-mail".
- [ ] Pedir o link responde igual exista ou não a conta. Só a conta existente recebe o e-mail, no idioma escolhido,
      com o texto `confirmAccess`. O pedido tem rate limit.
- [ ] Clicar no link no mesmo navegador entra na app com a mesma sessão do login por senha: cookie compartilhado,
      último acesso, desvio para o onboarding pendente. Em outro navegador, a tela pede o e-mail antes de concluir.
- [ ] Link expirado ou já usado mostra erro traduzido com a opção de pedir outro.
- [ ] Conta desativada pelo admin não entra pelo link, como já não entra pela senha.

### Fora do corte

- **Cadastro pelo link**: o Firebase cria a conta se o e-mail não existir. No corte, só contas existentes recebem o
  link, para que todo cadastro continue passando pela rota com rate limit e pelo perfil criado no cadastro.
- **Link na landing**: o login da `apps/web` tem outros problemas abertos (não redireciona depois de entrar, não tem
  "esqueci a senha"); fica para depois de resolvidos.
- **Código numérico por e-mail (OTP)**: o Firebase não oferece de forma nativa.
- **Link como segundo fator**: a NIST SP 800-63B-4, §3.1.3.1, proíbe e-mail como autenticador fora de banda.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Ação pública de pedido de link em `authApi`. |
| `apps/api` | Rota de pedido de link no padrão da recuperação de senha, com rate limit e `error.code`. |
| `apps/app` | Opção na tela de login, tela de conclusão do link e de confirmação do e-mail em outro navegador. |
| `apps/web` | N/A no corte. |
| `packages/*` | `auth`: concluir o login pelo link no cliente. `email`: usa o template de link de ação com o slug `confirmAccess`. i18n: textos e `apiErrors` nos três idiomas. |
| Infra/env | Uma variável opcional que liga o recurso. O domínio da app precisa estar entre os domínios autorizados do Firebase; projetos criados depois de 28/04/2025 não trazem `localhost` por padrão. |

## Riscos e trade-offs

- **Segurança equivalente à recuperação de senha.** Quem controla a caixa de e-mail já consegue redefinir a senha
  hoje, então o link não baixa o piso de uma conta sem segundo fator. Com o segundo fator de
  [`account-security-mfa`](account-security-mfa.md) ligado, o link não pode dispensá-lo.
- **Depende do e-mail do fork.** Sem Resend, o pedido responde `EMAIL_NOT_CONFIGURED`, como a recuperação. Com o
  recurso ligado e o e-mail desligado, a opção não deve aparecer.
- **Leitores de link em e-mail corporativo** abrem o link antes da pessoa. Como a conclusão exige o e-mail guardado
  no navegador de quem pediu, um leitor automático não deveria consumir o acesso. O `/test` precisa confirmar isso.
- **Vínculo com a senha.** No Firebase, o link por e-mail é uma forma de entrar do provedor de senha. A interação com
  a lista de métodos de [`linked-sign-in-methods`](linked-sign-in-methods.md) precisa ser conferida no `/analyze`
  da spec que vier por segundo.

## Sinais de pronto

- Com a variável ligada e o emulador, um usuário do seed pede o link, abre a URL que o emulador registra e entra no
  painel, com o cookie de sessão emitido.
- Um e-mail sem conta recebe a mesma resposta e nenhum e-mail sai.
- Abrir o link num navegador sem o e-mail guardado pede o e-mail; com um e-mail diferente, o acesso é recusado.
- Uma conta desativada recebe a recusa traduzida.
- Com a variável desligada, a tela de login fica como hoje.

## Decisões

- **D8, 2026-10-16:** no MVP o link só serve para entrar. Quem não tem conta se cadastra pelo formulário de
  cadastro; o fork que quiser cadastro sem senha liga depois, com o onboarding já preparado para isso.

## Perguntas em aberto

- O recurso nasce ligado ou desligado? — **recomendação:** desligado, como no Makerkit, porque depende de e-mail
  configurado e de domínio autorizado.
