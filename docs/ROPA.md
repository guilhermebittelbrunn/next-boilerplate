# Registro das operações de tratamento de dados pessoais

> **Modelo, não parecer jurídico.** Este documento vem preenchido com o que o boilerplate faz e marca com
> `[FORK]` o que só o produto pode preencher. Revise com quem responde juridicamente pelo produto antes de
> usar como registro oficial.
>
> Fontes coletadas em 2026-09-30. Base na nota
> [`compliance-trust-baseline`](../specs/research/compliance-trust-baseline.md), a revalidar depois de
> 2027-08-21. Prazo legal e lista de provedor mudam; confira antes de confiar num número daqui.

## Por que existe e como preencher

- A LGPD, art. 37, obriga controlador e operador a manter registro das operações que realizam,
  "especialmente quando baseado no legítimo interesse". A Res. CD/ANPD 2/2022, art. 9º, deixa o agente de
  pequeno porte cumprir isso de forma simplificada, sem isentá-lo. Quem faz tratamento de alto risco (art.
  4º) deixa de ser pequeno porte para esse fim (art. 3º).
- Na União Europeia, o GDPR art. 30(5) dispensa quem tem menos de 250 pessoas só quando o tratamento é
  ocasional, e o de um SaaS não é.
- Os blocos abaixo seguem o
  [modelo oficial da ANPD para agentes de pequeno porte](https://www.gov.br/anpd/pt-br/documentos-e-publicacoes/modelo_de_ropa_para_atpp.pdf),
  lido no próprio PDF em 2026-09-30. As instruções do modelo pedem um registro por processo, a marcação só
  dos **tipos** de dado (nunca números de CPF, RG ou a descrição do nome), a hipótese legal pelos arts. 7º
  e 11 da LGPD, e reservam Observações para encarregado, operadores e transferência internacional.

Cada registro abaixo descreve o que o boilerplate faz como ele vem. As hipóteses legais são sugestão e estão
marcadas `[FORK] confirmar`: escolher a base legal é decisão de quem responde pelo tratamento. Os provedores
citados em Compartilhamento estão, com região e contrato, em [`SUBPROCESSORS.md`](SUBPROCESSORS.md).

O registro é também uma resposta pronta: a ANPD pode pedi-lo durante a apuração de um incidente (Res.
15/2024, art. 8º; ver [`INCIDENT-RESPONSE.md`](INCIDENT-RESPONSE.md)).

## Informações de contato

| Campo | Valor |
|---|---|
| Organização | `[FORK]` |
| CNPJ | `[FORK]` |
| Endereço | `[FORK]` |
| Principal atividade | `[FORK]` |
| Gestor responsável | `[FORK]` |
| E-mail | `[FORK]` |
| Telefone | `[FORK]` |
| Data do registro | `[FORK]` |

## Registros

### 1. Cadastro e autenticação

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral. `[FORK]` marcar crianças e adolescentes ou idosos se o produto os atende. |
| Dados pessoais | Nome, e-mail, telefone. Outros: senha (o Firebase guarda só o hash), foto de perfil, preferência de tema e idioma, estado do onboarding, uid do Firebase, IP e user agent vistos pelo Firebase no login. |
| Compartilhamento | Google (Firebase Authentication e Cloud Firestore). Com Storage ligado, Google (Cloud Storage) para a foto. |
| Medidas de segurança | `firestore.rules` nega todo acesso direto de cliente, e só a API lê a base, com service account. Senha nova com no mínimo 8 caracteres. Limite de requisições no login, no cadastro e na redefinição de senha, se `ARCJET_KEY` estiver definida (`apps/api/proxy.ts:45-58`). `[FORK]` acrescentar as medidas próprias. |
| Período de armazenamento | Até a exclusão da conta, que é imediata e sem janela de arrependimento ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), "Declaração: até onde a exclusão de conta alcança"). O Google remove a conta do Authentication dos backups dele em até 180 dias e guarda o IP de login por algumas semanas ([privacidade do Firebase](https://firebase.google.com/support/privacy)). Com o backup do Firestore ligado, o perfil apagado continua nos backups até o fim da retenção deles, de até 14 semanas ([`BACKUP.md`](BACKUP.md)). `[FORK]` prazo para conta inativa, se houver. |
| Processo, finalidade e hipótese legal | Processo: cadastro de usuários. Finalidade: dar acesso ao produto. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar. |
| Observações | Onde está no código: `apps/api/app/(routes)/auth/sign-up/route.ts`, `packages/sdk/src/types/user/user.ts`, `apps/api/(shared)/validation/account.schema.ts`. Atendimento ao titular: exportação em `/account/export` e exclusão em `/account/deletion`. Canal do titular: `NEXT_PUBLIC_PRIVACY_CONTACT` (vazio, o canal é o formulário de `/contact`). Transferência: Firebase Authentication processa só nos Estados Unidos. `[FORK]` encarregado. |

### 2. Sessão e registro de acesso

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral. |
| Dados pessoais | Outros: cookie de sessão, data do último acesso (`lastAccessAt`), IP, data e hora da requisição nos logs da plataforma de deploy. |
| Compartilhamento | Google (Firebase Authentication emite e confere o cookie). Vercel, se o deploy é nela (logs de requisição). |
| Medidas de segurança | Cookie de sessão `httpOnly` conferido com revogação; o titular encerra as próprias sessões na área de conta. |
| Período de armazenamento | Cookie de sessão: 5 dias por padrão (`SESSION_COOKIE_MAX_AGE_DAYS`, até 14), com teto absoluto de 30 dias desde o login (`SESSION_ABSOLUTE_MAX_AGE_DAYS`, até 90), em `packages/auth/session.ts:23-29`. Registro de acesso: 6 meses para provedor de aplicação constituído como pessoa jurídica com fins econômicos (Marco Civil, art. 15); o prazo real é o da retenção de log da plataforma ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §11). `[FORK]` confirmar a retenção configurada. |
| Processo, finalidade e hipótese legal | Processo: manter a sessão e guardar o registro de acesso. Finalidade: autenticar as requisições e cumprir a guarda do registro de acesso. Hipóteses sugeridas: execução de contrato (art. 7º, V) para a sessão; cumprimento de obrigação legal (art. 7º, II) para o registro de acesso do Marco Civil. `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/auth/session.ts`, `packages/auth/server.ts:289-302`, `packages/sdk/src/types/user/user.ts:54-59`. O log estruturado da API não grava IP (`apps/api/proxy.ts:64-76`); o IP que existe está no log de requisição da plataforma. |

### 3. Cobrança de assinatura (opcional)

Existe só com `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` definidas.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral (clientes pagantes). |
| Dados pessoais | E-mail. Outros: id de cliente na Stripe, estado da assinatura, faturas pagas (ids da Stripe, valor, moeda e datas), eventos de pagamento. O cartão é digitado no Checkout hospedado pela Stripe e não passa pelo servidor do fork. |
| Compartilhamento | Stripe. Google (Cloud Firestore) para `stripeCustomerId`, assinatura, `paidInvoice`, `paymentEvent` e `subscriptionActivation`. |
| Medidas de segurança | Webhook com verificação de assinatura; cartão só no Checkout da Stripe. |
| Período de armazenamento | `paymentEvent`: TTL opcional em `expiresAt` ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 12, passo 5). `paidInvoice` e `subscriptionActivation` sobrevivem à exclusão da conta, sem perfil, nome ou e-mail. O cliente na Stripe continua lá depois da exclusão. `[FORK]` prazo de guarda fiscal e decisão sobre apagar o cliente na Stripe. |
| Processo, finalidade e hipótese legal | Processo: cobrança recorrente. Finalidade: cobrar o plano contratado. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar, e avaliar obrigação legal (art. 7º, II) para a guarda fiscal. |
| Observações | Onde está no código: `packages/payments/index.ts`, `apps/api/app/(routes)/webhooks/payments/route.ts`, `packages/sdk/src/types/user/user.ts:62-65`. Transferência: Stripe, LLC nos Estados Unidos; mecanismo em [`SUBPROCESSORS.md`](SUBPROCESSORS.md). |

### 4. E-mail transacional (opcional)

Existe só com `RESEND_TOKEN` e `RESEND_FROM` definidas.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral. |
| Dados pessoais | E-mail. Outros: idioma do e-mail e link de ação (verificação, redefinição de senha, troca de e-mail). |
| Compartilhamento | Resend. |
| Medidas de segurança | Os links de ação são códigos do Firebase conferidos pela API antes de aplicar; o aviso de troca de e-mail vai ao endereço antigo antes de o link ir ao novo. Com `ARCJET_KEY`, o pedido de redefinição e o reenvio de verificação têm limite de requisições (`apps/api/proxy.ts:45-58`). |
| Período de armazenamento | O core não guarda o e-mail enviado. Na Resend, não informado nas páginas lidas. `[FORK]` conferir no painel da Resend. |
| Processo, finalidade e hipótese legal | Processo: e-mails de conta. Finalidade: verificar endereço, recuperar acesso, confirmar troca de e-mail. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/email/index.ts`, `apps/api/app/(routes)/auth/password/reset-request/route.ts`, `apps/api/app/(routes)/auth/email-verification/send/route.ts`, `apps/api/app/(routes)/account/email/route.ts`. Transferência: dados da conta Resend nos Estados Unidos. |

### 5. Formulário de contato da landing

Envia só com `RESEND_TOKEN` e `RESEND_FROM` definidas.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral (visitantes da landing). |
| Dados pessoais | Nome, e-mail. Outros: mensagem em texto livre, que pode conter qualquer coisa que o visitante escreva. |
| Compartilhamento | Resend, que entrega a mensagem na caixa do `RESEND_FROM`. |
| Medidas de segurança | Nenhuma cópia no Firestore. Bloqueio de bot na landing, se `ARCJET_KEY` estiver definida. |
| Período de armazenamento | O core não guarda. A mensagem fica na caixa de entrada do fork. `[FORK]` prazo de guarda da caixa. |
| Processo, finalidade e hipótese legal | Processo: atendimento a contato. Finalidade: responder a quem escreveu. Hipótese sugerida: procedimento preliminar a contrato a pedido do titular (art. 7º, V) ou legítimo interesse (art. 7º, IX). `[FORK]` confirmar. |
| Observações | Onde está no código: `apps/web/app/[locale]/contact/actions/contact.tsx:7-22`. Sem `NEXT_PUBLIC_PRIVACY_CONTACT`, este formulário é também o canal do titular. |

### 6. Medição de audiência com consentimento (opcional)

Existe só com deploy na Vercel (Web Analytics) ou `NEXT_PUBLIC_GA_MEASUREMENT_ID` (Google Analytics), e em
qualquer caso só depois de o visitante aceitar analytics no banner.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral (visitantes e usuários). |
| Dados pessoais | Outros: eventos de navegação, URL, referrer, país e cidade, navegador e sistema, identificadores de cookie e IP (Google Analytics), cookie de consentimento `bp:cookie-consent`. |
| Compartilhamento | Vercel (Web Analytics), Google (Google Analytics 4). |
| Medidas de segurança | Nenhuma tag de medição carrega antes da escolha; o Consent Mode sai com os sinais de anúncio negados. |
| Período de armazenamento | Cookie de consentimento: 180 dias (`packages/analytics/consent.ts:10`). Sessão do Web Analytics descartada em 24 horas ([privacidade do Web Analytics](https://vercel.com/docs/analytics/privacy-policy)). Google Analytics: `[FORK]` retenção configurada na propriedade. |
| Processo, finalidade e hipótese legal | Processo: medição de audiência. Finalidade: entender o uso do produto. Hipótese sugerida: consentimento (art. 7º, I). `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/analytics/consent.ts:103-108`, `packages/analytics/provider.tsx:103-111`. A retirada do consentimento fica no botão de preferências de cookie. |

### 7. Trilha de auditoria

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral e operadores do painel admin. |
| Dados pessoais | Outros: id de perfil e uid de quem agiu e de quem foi alvo, rótulo (e-mail ou nome) no momento do evento, nomes dos campos alterados (nunca os valores), `requestId`, data e hora. |
| Compartilhamento | Google (Cloud Firestore, coleção `auditEvent`). |
| Medidas de segurança | Só admin lê (`GET /audit-events`); nenhuma rota edita nem apaga evento. Na exclusão da conta, os rótulos pessoais do titular são apagados e os ids ficam. |
| Período de armazenamento | Não decidido. Não há prazo legal para trilha de auditoria de negócio no Brasil ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §1.3). `[FORK]` prazo e expurgo. |
| Processo, finalidade e hipótese legal | Processo: registro de ações sensíveis (personificação, edição e exclusão de usuário, revogação de sessão, troca de senha e e-mail, exportação e exclusão de conta). Finalidade: responsabilização e investigação de incidente. Hipótese sugerida: legítimo interesse (art. 7º, IX), que é justamente o caso em que o art. 37 mais exige o registro. `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/sdk/src/types/audit/audit.ts:2-42`, `apps/api/(shared)/repositories/audit-event.repository.ts:48-62` (rótulos apagados por papel). |

### 8. Proteção contra abuso (opcional)

Existe só com `ARCJET_KEY` definida.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral (qualquer pessoa que faz requisição). |
| Dados pessoais | Outros: IP e cabeçalhos da requisição. |
| Compartilhamento | Arcjet. |
| Medidas de segurança | O log de bloqueio da API não grava endereço, cabeçalho nem corpo (`apps/api/proxy.ts:64-76`). |
| Período de armazenamento | 30 dias na Arcjet, e dado agregado por mais tempo ([privacidade da Arcjet](https://docs.arcjet.com/privacy)). |
| Processo, finalidade e hipótese legal | Processo: limite de requisições e bloqueio de bot. Finalidade: segurança do serviço. Hipótese sugerida: legítimo interesse (art. 7º, IX). `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/security/index.ts:39-48`, `packages/security/index.ts:81`. Transferência: várias regiões sem garantia; DPA da Arcjet não encontrado ([`SUBPROCESSORS.md`](SUBPROCESSORS.md)). |

### 9. Arquivos enviados (opcional)

Existe só com o bucket configurado (`FIREBASE_STORAGE_BUCKET`).

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral. |
| Dados pessoais | Outros: imagens enviadas (avatar e foto de `entity`), que podem mostrar o rosto do titular ou de terceiros. |
| Compartilhamento | Google (Cloud Storage for Firebase). |
| Medidas de segurança | `storage.rules` nega acesso direto de cliente; leitura só por URL assinada e expirável, depois de conferir a posse. |
| Período de armazenamento | Até a exclusão da conta: tudo o que o titular enviou fica sob `uploads/<profileId>/`, e a exclusão varre esse prefixo. `[FORK]` confirmar. |
| Processo, finalidade e hipótese legal | Processo: guarda de arquivos do usuário. Finalidade: exibir as imagens no produto. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar. |
| Observações | Onde está no código: `apps/api/(shared)/lib/storage.ts:46-57`, `apps/api/app/(routes)/files/route.ts`, [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §6. |

### 10. `[FORK]` Dados do domínio do produto

O recurso `entity` do boilerplate é exemplo e sai quando o fork o substitui pelo domínio real. Cada
processo novo ganha um registro no mesmo formato.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | `[FORK]` |
| Dados pessoais | `[FORK]` |
| Compartilhamento | `[FORK]` |
| Medidas de segurança | `[FORK]` |
| Período de armazenamento | `[FORK]` |
| Processo, finalidade e hipótese legal | `[FORK]` |
| Observações | `[FORK]` |

## Medidas que valem para todos os registros

Preencha uma vez e cite nos registros:

- Backup do Firestore: `[FORK]` ligado no Blaze com agendamento, ou operação sem backup registrada aqui com a
  data da decisão. As duas saídas e o que cada uma implica estão em [`BACKUP.md`](BACKUP.md).
- Frequência do teste de restauração: `[FORK]` (ver [`BACKUP.md`](BACKUP.md)).
- Retenção do log de acesso na plataforma: `[FORK]`.
- Quem tem acesso ao console do Firebase, da Vercel, da Stripe, da Resend e da Arcjet: `[FORK]`.
