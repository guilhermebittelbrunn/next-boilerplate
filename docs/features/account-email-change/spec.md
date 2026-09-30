---
id: account-email-change
title: Troca de e-mail do titular
status: done
value: médio
effort: M
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/email, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [apps/api/(shared)/lib/auth-action-links.ts, packages/email/templates/action-link.tsx, packages/sdk/src/actions/account/action.ts, "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx"]
feature: account-email-change
updated: 2026-09-30
---

# Troca de e-mail do titular

## Problema

Quem usa um fork não consegue trocar o próprio e-mail. A aba de perfil mostra o campo bloqueado com a frase
"A troca de e-mail estará disponível em breve", então cada fork publica uma promessa que o core não cumpre.
Na prática o pedido vira suporte: alguém do fork abre o console do Firebase e altera o endereço à mão, sem
verificar que a pessoa controla o novo e-mail e sem registro na trilha de auditoria.

O e-mail aqui é também a credencial de login. Trocar sem verificar o novo endereço permite que um erro de
digitação tranque a pessoa fora da conta, e trocar sem confirmar quem pede permite que uma sessão roubada
sequestre a conta de vez.

## O que já existe no repo

- `packages/internationalization/translations/apps/app/pages/common/account.ts:18` — `emailHint: "A troca de
  e-mail estará disponível em breve."`, exibido sob o campo desabilitado em `AccountProfileForm.tsx:102-104` (o campo desabilitado ocupa `:96-101`).
- `apps/api/(shared)/validation/account.schema.ts:31-42` — o `PUT /account` é `.strict()` e aceita nome,
  telefone, avatar e preferências; `email` no corpo dá `VALIDATION_FAILED`.
- `apps/api/(shared)/lib/auth-action-links.ts:7`, `:38-87` — gera links de ação pelo Admin SDK
  (`generatePasswordResetLink`, `generateEmailVerificationLink`) e reescreve para o app, com os tipos
  `reset-password` e `verify-email`. O `firebase-admin` 13.6.0 instalado já traz
  `generateVerifyAndChangeEmailLink(email, newEmail)` (`base-auth.d.ts:506`).
- `packages/email/templates/action-link.tsx` — o template de link de ação que os dois fluxos existentes
  enviam pela Resend (`auth/email-verification/send/route.ts:62-71`, `auth/password/reset-request/route.ts:38-43`).
- `apps/api/app/(routes)/account/deletion/route.ts:48-72` — precedente de reautenticação: a exclusão de
  conta pede a senha atual em vez de confiar na idade da sessão, e recusa conta sem provedor de senha com
  `ACCOUNT_DELETION_REAUTH_UNSUPPORTED`. O comentário em `:55-57` explica por quê.
- `packages/sdk/src/types/audit/audit.ts:2-10` — os tipos de evento de auditoria; não há evento de troca de
  e-mail.
- **Lacuna:** nenhuma rota, ação de SDK, tela ou e-mail para trocar o endereço. `grep` por
  `verifyBeforeUpdateEmail`, `updateEmail` e `generateVerifyAndChangeEmailLink` em `apps/` e `packages/`
  (fora de `node_modules`): 0.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](../../../specs/research/saas-starter-feature-benchmark.md), adendo de
  2026-09-26.
- Prevalência: **2 confirmados** (Makerkit no código público do kit lite; Better-Auth como biblioteca,
  desligado por padrão), **1 confirmado sem** (Open SaaS), os demais do painel **não verificados**. Não há
  fração honesta sobre 10, e por isso o `value` fica em médio.
- Requisito de provedor: projetos Firebase criados a partir de 15/09/2023 têm proteção contra enumeração de
  e-mail ligada por padrão, e com ela "users cannot change their email address without first verifying the
  new address"
  (<https://docs.cloud.google.com/identity-platform/docs/admin/email-enumeration-protection>, 2026-09-26).
  O caminho que o provedor aceita é o de verificar antes de trocar.
- O emulador de Auth aceita o fluxo `VERIFY_AND_CHANGE_EMAIL` desde a PR #7618 do `firebase-tools`
  (<https://github.com/firebase/firebase-tools/pull/7618>, merge em 10/09/2024); o repo fixa 15.30.1. A spec é
  provável sem conta real, exceto a entrega do e-mail pela Resend.
- Avisar o endereço antigo é o requisito 6.3.7 da ASVS 5.0.0, de **nível 3**
  (<https://raw.githubusercontent.com/OWASP/ASVS/master/5.0/en/0x15-V6-Authentication.md>). Entra no corte por
  ser barato com o template existente, não por exigência do nível 1.

## Proposta — corte de MVP

> **Entregue pela PR #33** (`f377c84`, mergeada em `main` em 2026-09-29 às 16:23 UTC, da branch
> `feat/account-email-change`). CI verde no SHA de merge: `gh run 36597344374`, `success` em `changes`,
> `verify`, `coverage` e `e2e`. Os cinco itens foram conferidos no código na auditoria de 2026-09-30; a
> evidência de cada um está logo abaixo dele. O `/test` fechou com 16 ✅, 0 ❌ e 1 🔒 (a entrega real do
> aviso pela Resend, pendência de `docs/PRE-PRODUCTION.md` §3).

- [x] Na aba de perfil, o titular pede a troca informando o novo e-mail e a senha atual. A promessa "em
      breve" some.
      `AccountProfileForm.tsx:115-128` mostra o botão "Trocar e-mail" (ou a frase `unsupported` para conta
      sem senha) e `:167-171` monta o `AccountEmailChangeDialog`, que pede `newEmail` e `currentPassword`
      (`AccountEmailChangeDialog.tsx:135-146`). A ação do SDK é `apiClient.account.requestEmailChange`
      (`packages/sdk/src/actions/account/action.ts:55-67`) e a rota é `POST /account/email`
      (`apps/api/app/(routes)/account/email/route.ts:67`), sob `requireCommonPanelApi`, com a senha
      conferida pelo Identity Toolkit (`:37-54`, `:117-123`). A chave `emailHint` saiu do dicionário:
      `git grep "em breve"` na `apps/app` e nas traduções só acha a cobrança e o teste que afirma a ausência.
- [x] O novo endereço recebe um link; o e-mail só muda depois que a pessoa abre o link. Até lá, o login
      continua com o endereço antigo.
      `buildEmailChangeLink` (`apps/api/(shared)/lib/auth-action-links.ts:114-140`) gera o link
      `VERIFY_AND_CHANGE_EMAIL` pelo Admin SDK e o reescreve para `/verify-email?mode=verifyAndChangeEmail`
      (`:17`). A página trata o modo novo (`verify-email/page.tsx:8`, `:35`) e chama
      `POST /auth/email-change/confirm`, que confere o tipo do código antes de aplicá-lo
      (`auth/email-change/confirm/route.ts:47-57`). O `/test` mediu contra o emulador: dois links pendentes,
      o primeiro aplicado com 200 e o segundo recusado com 400 `AUTH_OOB_CODE_INVALID`.
- [x] O endereço antigo recebe um aviso de que a troca foi pedida, com o canal para contestar.
      Template novo `packages/email/templates/email-change-notice.tsx`, enviado ao endereço atual antes do
      link (`account/email/route.ts:147-155`); se o aviso falha, o link não sai. O canal é a linha de
      suporte do rodapé (`packages/email/components/layout.tsx:98-104`), que só aparece com
      `NEXT_PUBLIC_APP_SUPPORT_EMAIL` definida, e o `docs/PRE-PRODUCTION.md` §3 diz isso.
- [x] Depois da troca, as sessões abertas são encerradas e o perfil reflete o endereço novo; a troca fica na
      trilha de auditoria.
      `auth/email-change/confirm/route.ts:79` chama `revokeUserSessions`, porque o emulador não revoga ao
      aplicar o código, e `:91-101` grava `account.email.change` (tipo em
      `packages/sdk/src/types/audit/audit.ts:8`, rótulo nos 3 idiomas em
      `translations/apps/app/pages/admin/auditTrail.ts:20`, `:57`, `:94`). O perfil lê o e-mail do Auth na
      mescla (`user.repository.ts:328`), então não há cópia para sincronizar.
- [x] Erros com código traduzido nos 3 idiomas: senha errada, endereço já em uso, endereço igual ao atual,
      conta sem provedor de senha. A resposta a "endereço já em uso" não revela mais do que o provedor já
      revela no cadastro.
      `ACCOUNT_CURRENT_PASSWORD_INVALID`, `USERS_AUTH_EMAIL_ALREADY_IN_USE` (o mesmo código do cadastro),
      `ACCOUNT_EMAIL_UNCHANGED` e `ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED`, mais `EMAIL_NOT_CONFIGURED`,
      `AUTH_EMAIL_CHANGE_FAILED` e `AUTH_OOB_CODE_INVALID`, todos em
      `translations/packages/shared/utils.ts` nos três blocos. O "já em uso" só responde depois da senha
      conferida (`account/email/route.ts:117-141`).

### Deriva registrada na entrega

Leitura da auditoria de 2026-09-30. Nenhuma muda o comportamento prometido.

| ponto | especificado | implementado | leitura |
|-------|--------------|--------------|---------|
| Sinal de pronto "com a Resend desligada, a UI explica" | a UI diz que a troca está indisponível | a rota responde `503 EMAIL_NOT_CONFIGURED` antes de ler o corpo (`account/email/route.ts:77-82`) e o diálogo mostra o toast traduzido ao enviar; o botão continua visível | a spec não dizia quando a UI avisa; o `/test` mediu o toast nos 3 idiomas (critério 10) |
| Risco "o pedido novo invalida o anterior" | o `/analyze` decide | não há estado nosso; o primeiro link aplicado invalida os outros no Identity Toolkit (P5 do plano) | a spec deixou em aberto; a decisão está no plano |
| Escopo | a rota nova | também `/auth/email-verification/confirm` passou a recusar código que não seja `VERIFY_EMAIL` (`:43-48`), e as duas rotas novas entraram na lista de rate limit (`apps/api/proxy.ts:53`, `:57`) | defeito achado no caminho pelo `/review`; sem isso um link de troca aberto sem `mode` mudaria o e-mail sem revogar sessões |
| `contends_on` | 4 arquivos, entre eles `packages/email/templates/action-link.tsx` | a PR alterou 3 deles e mais 26 arquivos de código e tradução fora da lista, sem contar testes; o `action-link.tsx` ficou intacto, porque a ação nova é só uma chave do dicionário | previsão errou para menos, como nas entregas anteriores |

O caminho direto pelo Identity Toolkit, com a chave web pública, aplica o código sem a revogação explícita e
sem o evento de auditoria. Está declarado em `docs/SECURITY.md:11` e fica fora do corte.

### Fora do corte

- **Troca pelo administrador.** O formulário de edição do admin mostra o e-mail sem permitir edição
  (`UserFormFields.tsx:34`). Trocar o e-mail de outra pessoa pede outro contrato de verificação.
- **Conta só Google.** A reautenticação por senha não serve; é o mesmo bloqueio da exclusão de conta e
  pertence à iteração de "sessão recente" de [`account-security-mfa`](../../../specs/account-security-mfa.md).
- **Desfazer a troca pelo link do e-mail antigo.** O Firebase tem uma ação de recuperação de e-mail, mas não
  foi confirmado se ela vale para links gerados pelo Admin SDK.
- **Avisos de segurança por e-mail para outras mudanças** (senha trocada, sessões encerradas). Mesmo
  requisito 6.3.7, nível 3; vira spec própria se algum fork pedir.
- **Vários e-mails por conta** e e-mail principal selecionável, como no Clerk.

### Decisões tomadas

Decididas pelo usuário em 2026-09-26:

- **O titular confirma a troca com a senha atual**, como na exclusão de conta. Sessão recente não conta
  como prova.
- **O e-mail do `customer` da Stripe não é sincronizado no MVP.** A divergência fica registrada em
  `docs/PAYMENTS.md`, e o Customer Portal é o caminho para o titular atualizar o endereço de cobrança.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Ação de pedir a troca de e-mail na conta. |
| `apps/api` | Rota sob o guard do painel comum, com reautenticação por senha, geração do link de verificação e troca pelo Admin SDK, aviso ao endereço antigo, evento de auditoria novo. |
| `apps/app` | Campo e diálogo na aba de perfil; a página que recebe o link de ação passa a tratar o novo tipo. |
| `apps/web` | N/A. |
| `packages/*` | `email`: um tipo novo de link de ação e o aviso ao endereço antigo; i18n nos 3 idiomas, incluindo `apiErrors`. |
| Infra/env | Nenhuma variável nova. O modelo de e-mail "Email address change" do console do Firebase não é usado, porque o envio é pela Resend. |

## Riscos e trade-offs

- **Sessão roubada.** Pedir a senha atual é o que impede quem tem só a sessão de trocar a credencial. É o
  mesmo raciocínio que já está na rota de exclusão de conta; a spec não deve aceitar "sessão recente" como
  prova.
- **Janela entre pedir e confirmar.** Enquanto o link não é aberto, a pessoa pode pedir outro. O `/analyze`
  decide se o pedido novo invalida o anterior; o Firebase controla a validade do link.
- **Stripe e dados copiados.** O `customer` da Stripe guarda o e-mail do momento do checkout. Se o fork cobra
  assinatura, o recibo segue indo para o endereço antigo até o titular atualizá-lo no portal. A sincronização
  ficou fora do MVP por decisão; a divergência precisa estar escrita no documento de pagamentos.
- **Envio real de e-mail nunca foi provado** (pendência 13 do backlog). A troca depende do link chegar; sem
  Resend configurada, o fork não consegue oferecer a troca, e a UI precisa dizer isso em vez de falhar calada.
- Custo para fork que não usa: nenhum. É uma rota a mais sob o mesmo guard.

## Sinais de pronto

- O titular pede a troca, abre o link no novo endereço e passa a entrar com ele; o endereço antigo deixa de
  funcionar para login.
- Sem abrir o link, nada muda.
- Senha atual errada é recusada com mensagem traduzida, e a troca não acontece.
- A trilha de auditoria mostra a troca com data e sujeito.
- Com a Resend desligada, a UI explica que a troca está indisponível.

## Perguntas em aberto

- Encerrar todas as sessões depois da troca? — **recomendação:** sim; a ASVS 5.0 já pede isso ao desabilitar
  conta (7.4.2), e é o mesmo comportamento da troca de senha hoje. **Resolvida na entrega:** sim, pela
  rota de confirmação.
