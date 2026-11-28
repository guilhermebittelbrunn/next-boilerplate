---
id: signup-email-verification
title: Confirmação do e-mail por código no cadastro
status: proposed
value: médio
effort: M
audience: confianca
area: [apps/api, apps/app, apps/web, packages/sdk, packages/email, packages/internationalization]
mode: ambos
depends_on: []
contends_on: [apps/api/app/(guards)/common-panel.ts, apps/api/proxy.ts, "apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx", "apps/app/app/[locale]/(authenticated)/(common)/layout.tsx"]
feature: -
updated: 2026-11-27
---

# Confirmação do e-mail por código no cadastro

> **Resumo**
> - **O quê:** quando o fork tem e-mail configurado, o cadastro com senha só libera o painel depois que a pessoa digita um código de 6 dígitos enviado ao e-mail. Sem e-mail configurado, nada muda.
> - **Por quê:** hoje qualquer um cria conta com o e-mail de outra pessoa e entra no painel na hora; a confirmação é um aviso que dá para ignorar para sempre. Isso abre espaço para conta falsa, envio de convite e cobrança em nome de terceiros, e trava recursos que exigem e-mail confirmado.
> - **Status:** `proposed` · valor médio · esforço M · confianca
> - **Próximo passo:** aguardando a escolha da variante (pergunta 1)

## Problema

O usuário pediu "cadastro precisa ter 2FA, caso e-mail esteja configurado". O que o cadastro precisa, pelo
que o código mostra, é provar que a pessoa controla o endereço antes de usar o produto. Hoje a conta é criada,
o link de verificação sai em segundo plano e o painel abre em seguida; o aviso de e-mail não confirmado fica no
topo, mas nada depende dele. Quem errou o próprio e-mail descobre só quando precisar recuperar a senha, e quem
usou o e-mail de outra pessoa opera normalmente. A confirmação por código resolve isso sem trocar de aba nem
de aparelho, que é onde o link costuma se perder.

Vale separar os termos: código por e-mail no cadastro **confirma a posse do endereço**, não é segundo fator
de autenticação. O NIST proíbe e-mail como fator de autenticação e exclui dessa proibição justamente o código
de confirmação de endereço. O segundo fator no login é TOTP, coberto pela spec
[`account-security-mfa`](account-security-mfa.md).

## O que já existe no repo

- Cadastro no app: `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:102-111`
  cria a conta, faz login e só então pede o e-mail de verificação (`:92-100`), engolindo a falha. O comentário
  em `:85-91` registra que conta Google chega com o endereço já confirmado pelo provedor.
- Cadastro na landing: `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:41-62`, o mesmo
  fluxo, também sem bloquear.
- API: `POST /auth/sign-up` cria a conta pelo Admin SDK (`apps/api/app/(routes)/auth/sign-up/route.ts:30-35`).
  `POST /auth/email-verification/send` monta e envia o link (`.../email-verification/send/route.ts:14-83`) e
  responde `503 EMAIL_NOT_CONFIGURED` sem e-mail (`:25-30`). `POST /auth/email-verification/confirm` aplica o
  `oobCode` do link (`.../email-verification/confirm/route.ts:27-58`).
- A página `/verify-email` também confirma troca de e-mail: `apps/api/(shared)/lib/auth-action-links.ts:17-18`
  manda `verify-email` e `change-email` para ela. O link não pode simplesmente sumir.
- Detecção de e-mail: `isEmailEnabled` (`packages/email/index.ts:78-81`, exige `RESEND_FROM` e
  `RESEND_TOKEN`) e `canSendAuthActionLink` (`auth-action-links.ts:28-30`, que também exige
  `NEXT_PUBLIC_APP_URL`).
- Aviso no painel: `EmailNotVerifiedNotice` montado no layout comum
  (`apps/app/app/[locale]/(authenticated)/(common)/layout.tsx:65`). Ele aparece mesmo sem e-mail configurado
  (`apps/app/shared/components/ui/EmailNotVerifiedNotice.tsx:28` só olha verificação e impersonação), e aí o
  botão de reenviar responde `EMAIL_NOT_CONFIGURED`.
- Nenhuma rota da API exige `emailVerified`: o campo só é lido no envio do link (`send/route.ts:32`), nos
  métodos de login (`apps/api/app/(routes)/account/sign-in-methods/[id]/route.ts:115`) e no login por link
  (`auth-action-links.ts:49`).
- Padrão de redirecionamento no servidor que já existe: o layout comum manda para o onboarding antes de
  renderizar (`layout.tsx:56-59`).
- Rate limit: `/auth/sign-up` e as duas rotas de verificação estão na lista estrita
  (`apps/api/proxy.ts:74-94`), mas o limite só vale com `ARCJET_KEY` (`apps/api/instrumentation.ts:32-43`,
  `packages/security/index.ts:53`). Sem a chave, nenhum limite de borda.
- UI de código: `InputOTP` já existe no design system e não é usado em lugar nenhum
  (`packages/design-system/components/ui/input-otp.tsx:11`).
- Usuário criado pelo admin: `apps/api/app/(routes)/users/route.ts:69` (era `:63` até a PR #78) cria a conta com senha, sem
  confirmação de e-mail.
- Decisão anterior: a spec entregue `auth-recovery-verification` deixou o bloqueio fora do corte porque
  "Bloquear por padrão quebraria forks de cadastro aberto"
  (`docs/features/auth-recovery-verification/spec.md:93`). Esta spec revê a decisão só para o caso em que o
  e-mail está configurado, que é quando o bloqueio não tranca ninguém.
- **Lacuna:** não há código de confirmação, não há bloqueio no servidor, e o limite de tentativas depende de
  um serviço opcional.

## Evidência de mercado

- Nota: [`reference/research/signup-email-verification-code.md`](../reference/research/signup-email-verification-code.md)
- Prevalência: bloqueio até confirmar é padrão em 2 de 5 provedores de autenticação (Clerk; Supabase em projeto
  hospedado). Código como padrão em 1 de 5 (Clerk) e disponível como opção em mais 2 confirmados (Supabase,
  Better-Auth). O Firebase, base deste repo, só tem link, então o código é implementação própria.
- Parâmetros de referência: 6 dígitos (Supabase, Better-Auth, NIST); validade de 5 min (Better-Auth), 10 min
  (Clerk, NIST para fora de banda) ou 1 h (Supabase); 3 tentativas por código (Better-Auth); reenvio a cada
  30 s (Clerk) ou 60 s (Supabase).
- NIST SP 800-63B rev. 4, § 3.1.3.1: e-mail não serve como fator de autenticação, mas código de confirmação de
  endereço não é autenticação. § 3.2.2: no máximo 100 falhas consecutivas.
- Fontes: <https://pages.nist.gov/800-63-4/sp800-63b.html> ·
  <https://clerk.com/docs/guides/development/custom-flows/authentication/email-password> ·
  <https://supabase.com/docs/guides/auth/passwords> · <https://better-auth.com/docs/plugins/email-otp>
  (acessadas em 2026-11-24)

## Proposta — corte de MVP

Corte para a variante recomendada na pergunta 1 (só no cadastro).

- [ ] Com e-mail configurado, quem se cadastra com senha (no app ou na landing) cai numa tela "confirme seu
      e-mail", com campo de 6 dígitos, o endereço mascarado e as opções de reenviar e sair. O e-mail traz o
      código nos 3 idiomas.
- [ ] Até confirmar, o painel comum não abre: o servidor redireciona para a tela do código, e as rotas da API
      do painel comum recusam com um `error.code` próprio. A UI escondida não é a única barreira.
- [ ] O código vale 10 minutos e aceita até 5 tentativas erradas; depois disso, só um código novo resolve. O
      código não fica legível no banco. Esses limites valem mesmo sem `ARCJET_KEY`.
- [ ] Reenviar gera um código novo e invalida o anterior, com intervalo mínimo de 60 segundos e teto por hora.
- [ ] Quem fecha a aba no meio volta, no próximo login, direto para a tela do código, e pode pedir um novo.
- [ ] Ao acertar, a conta fica marcada como verificada no Firebase Auth (o que o login por link e o MFA já
      exigem), e o painel abre sem novo login.
- [ ] Conta Google e login por link não passam pela tela: chegam com o endereço confirmado.
- [ ] Sem e-mail configurado, o fluxo é o de hoje, e o aviso de e-mail não confirmado deixa de oferecer um
      reenvio que não pode funcionar.
- [ ] Textos e `error.code` novos nos 3 idiomas.

### Fora do corte

- Código também no login (variantes b e c da pergunta 1).
- Trocar o e-mail digitado errado na própria tela do código. No corte, a pessoa sai e se cadastra de novo; a
  conta não confirmada fica para expurgo (pergunta 5).
- Remover o link de verificação: a página `/verify-email` continua servindo a troca de e-mail.
- Limpeza automática de contas que nunca confirmaram.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | ações de confirmar e reenviar código |
| `apps/api` | emissão e checagem do código com estado próprio; recusa no guard do painel comum quando o e-mail está configurado e a conta não está confirmada; rotas novas na lista de rate limit |
| `apps/app` | tela do código; redirecionamento no layout comum; cadastro leva à tela em vez do painel |
| `apps/web` | cadastro da landing leva à tela do código no app |
| `packages/*` | template de e-mail com código; i18n; `InputOTP` do design system, já pronto |
| Infra/env | nenhuma variável nova; um armazenamento de estado do código no Firestore com regra que bloqueia acesso pelo cliente |

## Riscos e trade-offs

- **Contas não confirmadas que já existem.** Com o bloqueio ligado, toda conta comum antiga sem confirmação
  cai na tela do código no próximo acesso. Inclui contas criadas pelo admin (`users/route.ts:63`). É a
  pergunta 3.
- **Token desatualizado.** Depois de marcar a conta como verificada no servidor, o token que o cliente já tem
  continua dizendo "não verificado" até ser renovado. Se o guard confiar no token, a pessoa acerta o código e
  continua bloqueada. O `/analyze` precisa escolher a fonte da verdade.
- **Provedor fora do ar.** Se o Resend falhar com o e-mail configurado, ninguém consegue terminar o cadastro.
  A tela precisa dizer que o envio falhou e permitir tentar de novo, sem prender a pessoa num beco.
- **Ataque de adivinhação.** 6 dígitos são 1 milhão de combinações; 5 tentativas por código e o teto de
  reenvio por hora mantêm a chance de acerto às cegas baixa. Sem esse limite próprio, um fork sem Arcjet
  ficaria exposto.
- **Interação com a trilha de auditoria.** A spec [`audit-log-levels`](../../docs/features/audit-log-levels/spec.md), entregue pela PR #78,
  grava o evento `info` `account.email.verify` na rota do link
  (`apps/api/app/(routes)/auth/email-verification/confirm/route.ts:56-62`). A confirmação por código precisa gravar o
  mesmo evento, uma vez por conta, senão a trilha deixa de registrar quem confirmou pelo código.
- **Custo herdado.** Zero para fork sem e-mail. Com e-mail, um envio por cadastro e por reenvio no plano do
  Resend.

## Sinais de pronto

- Com Resend configurado: cadastrar com senha leva à tela do código; o painel e a API comum recusam até
  confirmar; o código certo abre o painel.
- Código vencido, código errado cinco vezes e reenvio antes de 60 s respondem com mensagem própria, traduzida.
- Fechar a aba depois do cadastro e entrar de novo leva à tela do código.
- Cadastro com Google vai direto ao painel.
- Sem Resend: cadastro e painel se comportam como hoje, e o aviso não oferece reenvio.
- A troca de e-mail pelo link continua funcionando.

## Perguntas em aberto

1. Onde exigir o código? (a) só no cadastro; (b) em todo login; (c) os dois. — **recomendação:** (a). O NIST
   não aceita e-mail como fator de autenticação; código em todo login adiciona atrito e um envio por acesso
   sem virar 2FA de verdade. O segundo fator no login fica com `account-security-mfa` (TOTP).
2. O código substitui o link no cadastro? — **recomendação:** sim, com e-mail configurado o cadastro manda só
   o código. O link continua existindo para troca de e-mail e para reenvio a partir do aviso em contas
   antigas, se a pergunta 3 isentá-las.
3. Contas comuns antigas não confirmadas (inclusive as criadas pelo admin) também passam pelo bloqueio? —
   **recomendação:** sim. O bloqueio olha o estado da conta, não a data de criação. Contas criadas pelo admin
   confirmam no primeiro acesso, o que também prova que o admin digitou o e-mail certo.
4. O bloqueio vale para o painel admin? — **recomendação:** não. Admin é criado por script ou por outro admin,
   e trancar o único admin de um fork sem e-mail funcionando é pior que o risco.
5. O que fazer com contas que nunca confirmam? — **recomendação:** fora do corte; registrar no
   `docs/PRE-PRODUCTION.md` como decisão do fork, com a contagem pelo console.
6. Deixar o fork desligar o bloqueio mesmo com e-mail configurado? — **recomendação:** não no MVP. Uma chave a
   mais é uma configuração a mais em todo fork, e o pedido foi "exigir quando houver e-mail".
