---
id: magic-link-sign-in
title: Entrar com link enviado por e-mail
status: done
value: médio
effort: M
audience: produto
area: [apps/app, apps/api, packages/auth, packages/sdk, packages/email, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [packages/auth/client.ts, "apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx", apps/api/(shared)/lib/auth-action-links.ts, apps/api/proxy.ts, apps/app/shared/lib/signInMethods.ts, apps/api/(shared)/lib/auth-providers.ts]
feature: magic-link-sign-in
updated: 2026-10-22
---

# Entrar com link enviado por e-mail

> **Entregue em 2026-10-22** pela PR #56 (`9c793c6`, mergeada às 12:21 UTC), com CI `success` nos quatro jobs da
> execução de merge (`gh run 39777640405`: `changes`, `verify`, `coverage`, `e2e`). Os seis itens do corte foram
> conferidos no código de `main`, um a um, na auditoria de fechamento; a evidência está ao lado de cada item, em
> "Proposta — corte de MVP". O `/test` da feature fechou 16 de 18 critérios, sem falha; os 2 restantes dependem de
> infra externa (rate limit com `ARCJET_KEY` real e o provedor de link desligado num projeto Firebase real).
>
> **Deriva registrada, a spec estava imprecisa:** o corte pedia o link para toda conta existente. A medição do
> `/analyze` no emulador e a documentação do Firebase mostraram que concluir o login por link tira a senha de uma
> conta com e-mail não confirmado e acrescenta um provedor `password` sem senha a uma conta só Google. A entrega
> manda o link só para conta com provedor `password` **e** e-mail confirmado (D1 do plano,
> `apps/api/(shared)/lib/auth-action-links.ts:48-50`, aplicada em `:102-105`). Conta só Google e conta não
> confirmada recebem a mesma resposta e nenhum e-mail. Com isso, o item 6 ficou atendido por construção: nenhuma
> conta passa a ser "só de link". Se o público não verificado pesar num fork, a alternativa (marcador no perfil e
> mudança na área de conta) é uma spec de continuação, esforço M (Q1 do plano).
>
> O texto abaixo é o da spec na data da entrega. Os links relativos foram reescritos para o caminho novo.

## Problema

Quem esquece a senha hoje faz três passos: pede a recuperação, abre o e-mail, escolhe uma senha nova e só então
entra. Num MVP que a pessoa usa uma vez por semana, esse é o caminho mais comum de volta ao produto, e cada passo
perde gente. O link de acesso por e-mail encurta o retorno para dois passos (pedir e clicar) e não pede uma senha
que a pessoa vai esquecer de novo.

O repositório já envia links de ação pelo e-mail do fork (recuperação de senha, verificação, troca de e-mail) e já
tem até o texto de um e-mail de acesso pronto, sem uso. Falta o fluxo de entrada.

## O que já existia no repo (antes da PR #56)

- `packages/auth/client.ts:144-157` (era `:142-155` até a PR #48) — a app entra com e-mail e senha ou com Google por popup. Não há
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
- `apps/api/proxy.ts:53-67` — rotas com rate limit, onde o pedido de link precisa entrar. *(Era `:49-62` até a PR
  #49, que acrescentou `/contact` e quatro linhas de comentário; antes da PR #47, `:45-58`.)*
- **Lacuna:** não existe forma de entrar sem senha além do Google.

*(As âncoras desta seção são as de `df381f4`, a base da entrega. A PR #56 deslocou várias delas; a evidência atual
está no corte abaixo.)*

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md), adendo de
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

Conferido em `main` (`9c793c6`) em 2026-10-22. Âncoras de `main`.

- [x] O fork liga o recurso por variável de ambiente, desligado por padrão. Ligado, a tela de login da app oferece
      "Receber link de acesso por e-mail".
      ✅ `EMAIL_LINK_SIGN_IN_ENABLED`, opcional e só na `apps/api` (`apps/api/env.ts:30`, `:54-55`;
      `.env.example:53-58`). Só `"true"` liga (`apps/api/(shared)/lib/email-link-sign-in.ts:4-5`). A tela pergunta à API
      por `GET /auth/sign-in/email-link` (`auth/sign-in/email-link/route.ts:5`, `:11-13`, dinâmica) e mostra o link em
      `SignInForm.tsx:209-218`, com o texto de `translations/apps/app/pages/signIn/index.ts:25`, `:50`, `:75`.
- [x] Pedir o link responde igual exista ou não a conta. Só a conta existente recebe o e-mail, no idioma escolhido,
      com o texto `confirmAccess`. O pedido tem rate limit.
      ✅ `POST /auth/sign-in/email-link/request` responde `200 { requested: true }` para qualquer endereço válido
      (`request/route.ts:72-79`); só a configuração muda a resposta, antes de ler o corpo (`:48-60`: `404
      AUTH_EMAIL_LINK_DISABLED` e `503 EMAIL_NOT_CONFIGURED`). Busca, geração e envio rodam em `after()`, com
      `action: "confirmAccess"` e o idioma do pedido (`:21-43`). Rate limit em `apps/api/proxy.ts:59`. **Deriva:** só
      a conta com senha e e-mail confirmado recebe (ver o bloco do topo).
- [x] Clicar no link no mesmo navegador entra na app com a mesma sessão do login por senha: cookie compartilhado,
      último acesso, desvio para o onboarding pendente. Em outro navegador, a tela pede o e-mail antes de concluir.
      ✅ A página `/sign-in/email-link` (`page.tsx:25-36`) conclui com o e-mail guardado no `localStorage` pelo
      pedido (`apps/app/shared/lib/emailLinkSignIn.ts:7-30`, `EmailLinkCompletion.tsx:84-101`); sem ele, pede o e-mail
      (`EmailLinkCompletion.tsx:180-229`). A conclusão é a mutation `signInWithEmailLink` do `AuthProvider`, com o
      mesmo `onAuthSuccess` da senha e do Google (`packages/auth/provider.tsx:386-389`; `client.ts:154-164`). O
      `/test` mediu cookie, `lastAccessAt`, destino do admin e onboarding pendente no emulador.
- [x] Link expirado ou já usado mostra erro traduzido com a opção de pedir outro.
      ✅ `emailLinkSignIn.ts:32-44` traduz os códigos do Firebase; `EmailLinkCompletion.tsx:114-139` mostra o cartão
      com "Pedir outro link".
- [x] Conta desativada pelo admin não entra pelo link, como já não entra pela senha.
      ✅ O Firebase recusa com `auth/user-disabled`, e a página mostra o cartão de falha com o texto do dicionário
      (`EmailLinkCompletion.tsx:152-163`). Em en o texto é "User disabled." (achado 🟢 no `BACKLOG.md`).
- [x] Conta que só entra por link não vê o formulário de troca de senha nem recebe pedido de senha na exclusão de
      conta e na troca de e-mail; recebe o mesmo caminho que a conta só Google já tem. *(Item acrescentado em
      2026-10-21, pós-PR #55, depois da medição no emulador descrita em "Riscos". Com ele, a spec fica no alto do M.)*
      ✅ **Por construção:** com o filtro de elegibilidade (`auth-action-links.ts:42-50`), nenhuma conta muda de
      provedor nem perde a senha pelo link, então `lacksPasswordProvider` e `hasPasswordProvider` seguem corretos
      sem mudança. O `/test` mediu `providerData` igual antes e depois para as contas inelegíveis.

### Fora do corte

- **Cadastro pelo link**: o Firebase cria a conta se o e-mail não existir. No corte, só contas existentes recebem o
  link, para que todo cadastro continue passando pela rota com rate limit e pelo perfil criado no cadastro.
- **Link na landing**: o login da `apps/web` ainda não tem "esqueci a senha"; fica para depois de resolvido. *(Até a
  PR #55 o motivo incluía o login da landing não levar a lugar nenhum depois de entrar. A tarefa `web-auth-forms`
  corrigiu isso: `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:52-56`.)*
- **Código numérico por e-mail (OTP)**: o Firebase não oferece de forma nativa.
- **Link como segundo fator**: a NIST SP 800-63B-4, §3.1.3.1, proíbe e-mail como autenticador fora de banda.
- **Acrescentado na entrega:** o link não carrega o `?redirect=` da tela de login (D8 do plano) e conta só Google ou
  não confirmada não recebe link (D1).

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Ação pública de pedido de link em `authApi`. |
| `apps/api` | Rota de pedido de link no padrão da recuperação de senha, com rate limit e `error.code`. |
| `apps/app` | Opção na tela de login, tela de conclusão do link e de confirmação do e-mail em outro navegador. |
| `apps/web` | N/A no corte. |
| `packages/*` | `auth`: concluir o login pelo link no cliente. `email`: usa o template de link de ação com o slug `confirmAccess`. i18n: textos e `apiErrors` nos três idiomas. |
| Infra/env | Uma variável opcional que liga o recurso. No console do Firebase (Authentication › Sign-in method), o provedor "E-mail/senha" e a opção "Link de e-mail (login sem senha)" precisam estar ativados; o emulador não confere isso. O domínio da app precisa estar entre os domínios autorizados do Firebase; projetos criados depois de 28/04/2025 não trazem `localhost` por padrão. O link sai pelo Resend do fork, com `NEXT_PUBLIC_APP_URL` definida (`auth-action-links.ts:20-23`). Fonte: <https://firebase.google.com/docs/auth/web/email-link-auth>, lida em 2026-10-21. |

*(Na entrega: `packages/email` não mudou, porque o slug já existia; a API ganhou também a rota de disponibilidade, e
o `AuthProvider` ganhou a mutation. Os passos manuais estão no item 15 do `docs/PRE-PRODUCTION.md`.)*

## Riscos e trade-offs

- **Segurança equivalente à recuperação de senha.** Quem controla a caixa de e-mail já consegue redefinir a senha
  hoje, então o link não baixa o piso de uma conta sem segundo fator. Com o segundo fator de
  [`account-security-mfa`](../../../specs/account-security-mfa.md) ligado, o link não pode dispensá-lo.
- **Depende do e-mail do fork.** Sem Resend, o pedido responde `EMAIL_NOT_CONFIGURED`, como a recuperação. Com o
  recurso ligado e o e-mail desligado, a opção não deve aparecer.
- **Leitores de link em e-mail corporativo** abrem o link antes da pessoa. Como a conclusão exige o e-mail guardado
  no navegador de quem pediu, um leitor automático não deveria consumir o acesso. O `/test` precisa confirmar isso.
- **Vínculo com a senha.** No Firebase, o link por e-mail é uma forma de entrar do provedor de senha. A interação com
  a lista de métodos de [`linked-sign-in-methods`](../linked-sign-in-methods/spec.md) precisa ser conferida no `/analyze`
  da spec que vier por segundo. *(Nota de 2026-10-19, pós-PR #48: a lista foi entregue primeiro, então a conferência
  cabe a esta spec. A aba Segurança decide "tem senha?" pelo provedor `password` (`apps/app/shared/lib/signInMethods.ts:22-23`,
  e na API `apps/api/(shared)/lib/auth-providers.ts:17-19`). Pela documentação do `EmailAuthProvider`, o link por
  e-mail também entra pelo provedor `password`; se isso valer, uma conta que só entra por link apareceria como
  "E-mail e senha" e veria o formulário de troca de senha, e a exclusão e a troca de e-mail pediriam uma senha que
  não existe. Não medido nesta rodada; o `/analyze` mede no emulador antes de desenhar.)*
  *(Medido em 2026-10-21, pós-PR #55, no emulador de Auth do `firebase-tools` 15.30.1, com o Admin SDK gerando o link e
  o SDK cliente concluindo com `signInWithEmailLink`. Uma conta criada só com e-mail, sem senha, sai do login por link
  com `providerData` igual a `["password"]`, `sign_in_provider` do token igual a `password` e nenhum `passwordHash` no
  registro do Admin SDK. A conta com senha fica igual, com `passwordHash` presente. **O risco se confirma no emulador:**
  pelo provedor, as duas contas são indistinguíveis, e `lacksPasswordProvider` (`apps/app/shared/lib/signInMethods.ts:22`)
  e `hasPasswordProvider` (`apps/api/(shared)/lib/auth-providers.ts:17`) diriam que a conta só de link tem senha. Por
  isso a aba Segurança e os dois diálogos que pedem senha (exclusão e troca de e-mail) entram no corte; o `/analyze`
  escolhe como distinguir. O `passwordHash` é um caminho possível, mas se o Admin SDK o devolve em projeto real não foi
  confirmado. Dois fatos medidos no mesmo teste: o link deixa `emailVerified` em `true`, e o Admin SDK gera link para
  e-mail sem conta, sem erro. A rota de pedido tem de consultar a conta antes, como `auth-action-links.ts:55-80` já faz.)*
  *(Resolvido na entrega pelo filtro D1, descrito no topo. O leitor de link foi medido pelo `/test`: um `GET` do link
  antes de abri-lo não gasta o código.)*

## Sinais de pronto

- Com a variável ligada e o emulador, um usuário do seed pede o link, abre a URL que o emulador registra e entra no
  painel, com o cookie de sessão emitido. ✅
- Um e-mail sem conta recebe a mesma resposta e nenhum e-mail sai. ✅
- Abrir o link num navegador sem o e-mail guardado pede o e-mail; com um e-mail diferente, o acesso é recusado. ✅ (o
  código não é gasto pelo e-mail errado; o certo entra em seguida)
- Uma conta desativada recebe a recusa traduzida. ✅ (pt-br e es; en com o 🟢 do texto)
- Com a variável desligada, a tela de login fica como hoje. ✅
- Uma conta sem senha que entrou pelo link abre a aba Segurança sem formulário de troca de senha, e a exclusão de conta
  e a troca de e-mail não pedem senha. ✅ por construção: essa conta não é criada pelo link.

## Decisões

- **D8, 2026-10-16:** no MVP o link só serve para entrar. Quem não tem conta se cadastra pelo formulário de
  cadastro; o fork que quiser cadastro sem senha liga depois, com o onboarding já preparado para isso.
- **Na entrega (2026-10-22):** as decisões D1 a D12 e as perguntas Q1 a Q5 estão no `analyze/plan.md` da feature,
  todas adotadas pela recomendação numa rodada autônoma do `/cycle`.

## Perguntas em aberto

- O recurso nasce ligado ou desligado? — **recomendação:** desligado, como no Makerkit, porque depende de e-mail
  configurado e de domínio autorizado. *(Respondida na entrega: nasce desligado, D12.)*
