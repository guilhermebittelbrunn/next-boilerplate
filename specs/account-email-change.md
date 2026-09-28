---
id: account-email-change
title: Troca de e-mail do titular
status: approved
value: médio
effort: M
audience: produto
area: [apps/api, apps/app, packages/sdk, packages/email, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [apps/api/(shared)/lib/auth-action-links.ts, packages/email/templates/action-link.tsx, packages/sdk/src/actions/account/action.ts, "apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountProfileForm.tsx"]
feature: -
updated: 2026-09-27
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

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
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

- [ ] Na aba de perfil, o titular pede a troca informando o novo e-mail e a senha atual. A promessa "em
      breve" some.
- [ ] O novo endereço recebe um link; o e-mail só muda depois que a pessoa abre o link. Até lá, o login
      continua com o endereço antigo.
- [ ] O endereço antigo recebe um aviso de que a troca foi pedida, com o canal para contestar.
- [ ] Depois da troca, as sessões abertas são encerradas e o perfil reflete o endereço novo; a troca fica na
      trilha de auditoria.
- [ ] Erros com código traduzido nos 3 idiomas: senha errada, endereço já em uso, endereço igual ao atual,
      conta sem provedor de senha. A resposta a "endereço já em uso" não revela mais do que o provedor já
      revela no cadastro.

### Fora do corte

- **Troca pelo administrador.** O formulário de edição do admin mostra o e-mail sem permitir edição
  (`UserFormFields.tsx:34`). Trocar o e-mail de outra pessoa pede outro contrato de verificação.
- **Conta só Google.** A reautenticação por senha não serve; é o mesmo bloqueio da exclusão de conta e
  pertence à iteração de "sessão recente" de [`account-security-mfa`](account-security-mfa.md).
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
  conta (7.4.2), e é o mesmo comportamento da troca de senha hoje.
