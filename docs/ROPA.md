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
| Medidas de segurança | `firestore.rules` nega todo acesso direto de cliente, e só a API lê a base, com service account. Senha nova com no mínimo 8 caracteres. Limite de requisições no login, no cadastro e na redefinição de senha, se `ARCJET_KEY` estiver definida (`apps/api/proxy.ts:60-78`). `[FORK]` acrescentar as medidas próprias. |
| Período de armazenamento | Até a exclusão da conta, que é imediata e sem janela de arrependimento ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), "Declaração: até onde a exclusão de conta alcança"). O Google remove a conta do Authentication dos backups dele em até 180 dias e guarda o IP de login por algumas semanas ([privacidade do Firebase](https://firebase.google.com/support/privacy)). Com o backup do Firestore ligado, o perfil apagado continua nos backups até o fim da retenção deles, de até 14 semanas ([`BACKUP.md`](BACKUP.md)). `[FORK]` prazo para conta inativa, se houver. |
| Processo, finalidade e hipótese legal | Processo: cadastro de usuários. Finalidade: dar acesso ao produto. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar. |
| Observações | Onde está no código: `apps/api/app/(routes)/auth/sign-up/route.ts`, `packages/sdk/src/types/user/user.ts`, `apps/api/(shared)/validation/account.schema.ts`. Atendimento ao titular: exportação em `/account/export` e exclusão em `/account/deletion`. Canal do titular: `NEXT_PUBLIC_PRIVACY_CONTACT` (vazio, o canal é o formulário de `/contact`). Transferência: Firebase Authentication processa só nos Estados Unidos. `[FORK]` encarregado. |

### 2. Sessão e registro de acesso

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral. |
| Dados pessoais | Outros: cookie de sessão, data do último acesso (`lastAccessAt`), IP, data e hora da requisição nos logs da plataforma de deploy. Para cada sessão (coleção `session`): navegador, sistema, tipo de aparelho, instante do login e do último uso (com precisão de 15 minutos) e, se encerrada, quando e por quê. O user agent bruto e o IP não são gravados. |
| Compartilhamento | Google (Firebase Authentication emite e confere o cookie). Vercel, se o deploy é nela (logs de requisição). |
| Medidas de segurança | Cookie de sessão `httpOnly` conferido com revogação; o titular vê as sessões ativas na área de conta e encerra uma, todas as outras ou todas. A API recusa a credencial de uma sessão encerrada. |
| Período de armazenamento | Cookie de sessão: 5 dias por padrão (`SESSION_COOKIE_MAX_AGE_DAYS`, até 14), com teto absoluto de 30 dias desde o login (`SESSION_ABSOLUTE_MAX_AGE_DAYS`, até 90), em `packages/auth/session.ts:23-29`. Registros da coleção `session`: até a exclusão da conta, encerrados inclusive, que entram na exportação e são apagados num passo próprio da exclusão (`sessions`). Registro de acesso: 6 meses para provedor de aplicação constituído como pessoa jurídica com fins econômicos (Marco Civil, art. 15); o prazo real é o da retenção de log da plataforma ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §11). `[FORK]` confirmar a retenção configurada. |
| Processo, finalidade e hipótese legal | Processo: manter a sessão e guardar o registro de acesso. Finalidade: autenticar as requisições e cumprir a guarda do registro de acesso. Hipóteses sugeridas: execução de contrato (art. 7º, V) para a sessão; cumprimento de obrigação legal (art. 7º, II) para o registro de acesso do Marco Civil. `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/auth/session.ts`, `packages/auth/server.ts:296-309`, `packages/sdk/src/types/user/user.ts:54-59`, `apps/api/(shared)/repositories/session.repository.ts`, `apps/api/(shared)/lib/user-agent.ts`. O log estruturado da API não grava IP (`apps/api/proxy.ts:94-106`); o IP que existe está no log de requisição da plataforma. |

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
| Medidas de segurança | Os links de ação são códigos do Firebase conferidos pela API antes de aplicar; o aviso de troca de e-mail vai ao endereço antigo antes de o link ir ao novo. Com `ARCJET_KEY`, o pedido de redefinição e o reenvio de verificação têm limite de requisições (`apps/api/proxy.ts:60-78`). |
| Período de armazenamento | O core não guarda o e-mail enviado. Na Resend, não informado nas páginas lidas. `[FORK]` conferir no painel da Resend. |
| Processo, finalidade e hipótese legal | Processo: e-mails de conta. Finalidade: verificar endereço, recuperar acesso, confirmar troca de e-mail. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/email/index.ts`, `apps/api/app/(routes)/auth/password/reset-request/route.ts`, `apps/api/app/(routes)/auth/email-verification/send/route.ts`, `apps/api/app/(routes)/account/email/route.ts`. Transferência: dados da conta Resend nos Estados Unidos. |

### 5. Formulário de contato da landing

Envia só com `NEXT_PUBLIC_APP_SUPPORT_EMAIL`, `RESEND_TOKEN` e `RESEND_FROM` definidas na API. Sem
`NEXT_PUBLIC_APP_SUPPORT_EMAIL` no build da `web`, a landing mostra o canal como indisponível; sem a caixa ou sem a
Resend na API, a API responde `503 CONTACT_UNAVAILABLE`.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral (visitantes da landing e usuários do painel que abrem "Ajuda e contato"). |
| Dados pessoais | Nome, e-mail. Outros: mensagem em texto livre, que pode conter qualquer coisa que o visitante escreva. |
| Compartilhamento | Resend, que entrega a mensagem na caixa de `NEXT_PUBLIC_APP_SUPPORT_EMAIL`, com o e-mail do visitante no "responder para". |
| Medidas de segurança | Nenhuma cópia no Firestore. Validação de tamanho e formato na API, e o destino é fixo no servidor: quem chama não escolhe para quem o e-mail vai. `POST /contact` está na lista de rate limit do proxy da API (20 requisições por minuto por IP), que só vale com `ARCJET_KEY`. A rota não registra nome, e-mail nem mensagem em log. Para quem chega logado pelo painel, o e-mail é preenchido pela sessão compartilhada entre os apps, nunca pela URL. |
| Período de armazenamento | O core não guarda. A mensagem fica na caixa de entrada do fork. `[FORK]` prazo de guarda da caixa. |
| Processo, finalidade e hipótese legal | Processo: atendimento a contato. Finalidade: responder a quem escreveu. Hipótese sugerida: procedimento preliminar a contrato a pedido do titular (art. 7º, V) ou legítimo interesse (art. 7º, IX). `[FORK]` confirmar. |
| Observações | Onde está no código: `apps/api/app/(routes)/contact/route.ts` (envio), `apps/api/(shared)/validation/contact.schema.ts` (validação) e `apps/web/app/[locale]/contact/components/contact-form-client.tsx` (formulário). Sem `NEXT_PUBLIC_PRIVACY_CONTACT`, este formulário é também o canal do titular. |

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
| Processo, finalidade e hipótese legal | Processo: registro de ações sensíveis (personificação, edição e exclusão de usuário, revogação de sessão, troca de senha e e-mail, exportação e exclusão de conta) e, com membros ligados, das ações de equipe (transferência de propriedade, convite enviado, convite aceito, membro removido e saída da equipe). O evento de convite enviado não guarda o e-mail do convidado. Finalidade: responsabilização e investigação de incidente. Hipótese sugerida: legítimo interesse (art. 7º, IX), que é justamente o caso em que o art. 37 mais exige o registro. `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/sdk/src/types/audit/audit.ts:2-62`, `apps/api/(shared)/repositories/audit-event.repository.ts:48-62` (rótulos apagados por papel). |

### 8. Proteção contra abuso (opcional)

Existe só com `ARCJET_KEY` definida e com o prefixo `ajkey_`. Um valor sem o prefixo desliga o limite na API.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral (qualquer pessoa que faz requisição). |
| Dados pessoais | Outros: IP e cabeçalhos da requisição. |
| Compartilhamento | Arcjet. |
| Medidas de segurança | O log de bloqueio da API não grava endereço, cabeçalho nem corpo (`apps/api/proxy.ts:94-106`). |
| Período de armazenamento | 30 dias na Arcjet, e dado agregado por mais tempo ([privacidade da Arcjet](https://docs.arcjet.com/privacy)). |
| Processo, finalidade e hipótese legal | Processo: limite de requisições e bloqueio de bot. Finalidade: segurança do serviço. Hipótese sugerida: legítimo interesse (art. 7º, IX). `[FORK]` confirmar. |
| Observações | Onde está no código: `packages/security/index.ts:37-47`, `packages/security/index.ts:80`. Transferência: várias regiões sem garantia; DPA da Arcjet não encontrado ([`SUBPROCESSORS.md`](SUBPROCESSORS.md)). |

### 9. Arquivos enviados (opcional)

Existe só com o bucket configurado (`FIREBASE_STORAGE_BUCKET`).

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral. |
| Dados pessoais | Outros: imagens enviadas (avatar e foto de `entity`), que podem mostrar o rosto do titular ou de terceiros. |
| Compartilhamento | Google (Cloud Storage for Firebase). |
| Medidas de segurança | `storage.rules` nega acesso direto de cliente; leitura só por URL assinada e expirável, depois de conferir a posse. |
| Período de armazenamento | O avatar fica sob `uploads/<profileId>/` até a exclusão da conta, que varre esse prefixo. A foto de `entity` pertence à organização e fica sob `uploads/org-<organizationId>/`: sai quando o dono exclui a conta (cada organização de que ele é dono é apagada com tudo dela). Fotos de `entity` enviadas antes de existirem organizações continuam no prefixo pessoal de quem enviou e saem na exclusão dessa pessoa. `[FORK]` confirmar. |
| Processo, finalidade e hipótese legal | Processo: guarda de arquivos do usuário. Finalidade: exibir as imagens no produto. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar. |
| Observações | Onde está no código: `apps/api/(shared)/lib/storage.ts` (`buildObjectPath`, `ownerPrefix`, `organizationOwnerSegment`), `apps/api/app/(routes)/files/route.ts` (`?scope=organization`), [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §6. |

### 10. Notificações no painel

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral (usuários do painel comum). |
| Dados pessoais | Outros: id do perfil dono, tipo do aviso, parâmetros do aviso, quando foi criado, quando foi lido e quando expira (coleção `notification`). O texto não é gravado: a app o monta no idioma de quem lê. Os quatro tipos do core (boas-vindas e mudanças de assinatura) não têm parâmetros. |
| Compartilhamento | Google (Cloud Firestore, coleção `notification`). |
| Medidas de segurança | `firestore.rules` nega acesso direto de cliente. A API só lista, conta e marca as notificações do próprio perfil, e devolve 404 para o id de outro dono. Sob personificação o admin vê os avisos do usuário, mas não consegue marcá-los como lidos. Nenhuma rota cria notificação: só o servidor emite. |
| Período de armazenamento | 90 dias a partir da criação, lida ou não, quando a política de TTL do Firestore em `notification.expiresAt` está ligada ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §1.9). Sem a política, até a exclusão da conta, que apaga as notificações num passo próprio (`notifications`). Com o backup do Firestore ligado, também nos backups até o fim da retenção deles ([`BACKUP.md`](BACKUP.md)). `[FORK]` confirmar o prazo. |
| Processo, finalidade e hipótese legal | Processo: avisos sobre a conta dentro do produto. Finalidade: informar o titular de mudanças na conta e na assinatura. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar, e revisar se o fork criar tipos com parâmetros pessoais. |
| Observações | Onde está no código: `packages/sdk/src/types/notification/notification.ts`, `apps/api/(shared)/lib/notifications.ts`, `apps/api/(shared)/repositories/notification.repository.ts`, `apps/api/app/(routes)/notifications/`. Atendimento ao titular: as notificações entram na exportação de `/account/export`. |

### 11. Organizações e membros

Toda conta comum pertence a uma organização. Num fork B2C ela tem um membro só, o próprio titular, e não aparece na
interface.

| Bloco | Conteúdo |
|---|---|
| Categorias de titulares | Titulares em geral (usuários do painel comum). |
| Dados pessoais | Outros: id do perfil do dono atual da organização (`organization.ownerUserId`, que muda quando o dono transfere a propriedade a um membro); para cada membro, o id do perfil, a organização, o papel (`owner`/`member`) e a data de entrada (`organizationMember`). Com membros ligados (`NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED`), cada convite guarda o e-mail convidado, o e-mail de quem convidou, o id do perfil dele, o hash do token, a validade, o último envio e, depois do aceite, o id do perfil de quem aceitou (`organizationInvitation`). O convidado pode ainda não ter conta: é um titular cujo único dado no produto é o endereço. |
| Compartilhamento | Google (Cloud Firestore, coleções `organization`, `organizationMember` e `organizationInvitation`). Resend, para o e-mail do convite, que leva o endereço convidado e o de quem convidou. |
| Medidas de segurança | `firestore.rules` nega acesso direto de cliente. A API resolve a organização do sujeito no guard (`requireOrganizationApi`) e responde 404 para registro de outra organização. Sob personificação, o admin vê a organização do usuário e não grava nada nela, salvo o que o primeiro acesso do próprio usuário gravaria: a organização de quem ainda não tinha uma e o carimbo `organizationId` nos registros de `entity` criados antes das organizações. |
| Período de armazenamento | Até a exclusão da conta. Na exclusão, sai o vínculo do titular; cada organização de que ele é dono (a de casa e as recebidas por transferência) sai inteira (registros de `entity` de qualquer autor, fotos, vínculos, convites e o documento), e saem também os convites enviados ao e-mail dele por qualquer organização. Um convite revogado é apagado na hora. Um convite vencido ou aceito fica até ser regravado, revogado ou apagado com a organização; com a política de TTL em `organizationInvitation.expiresAt` ligada, sai sozinho depois de vencer ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §16). O dono que ainda tem membros não exclui a conta (`409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`) até transferir a propriedade a um deles ou removê-los. Quem transferiu a propriedade não é mais dono da equipe, e a exclusão da conta dele tira só o vínculo. Os registros que o titular criou na organização de outra pessoa ficam com essa organização, e o `userId` deles passa a apontar para um perfil que não existe mais. `[FORK]` confirmar. |
| Processo, finalidade e hipótese legal | Processo: agrupar os dados de negócio por organização. Finalidade: permitir que mais de uma pessoa trabalhe nos mesmos registros. Hipótese sugerida: execução de contrato (art. 7º, V). `[FORK]` confirmar. |
| Observações | Onde está no código: `apps/api/(shared)/lib/organization-membership.ts`, `apps/api/(shared)/repositories/organization.repository.ts`, `apps/api/(shared)/repositories/organization-member.repository.ts`, `apps/api/app/(guards)/organization.ts`. Atendimento ao titular: a exportação de `/account/export` traz o vínculo atual (`membership`) e os registros de `entity` que o titular criou, em qualquer organização; registros de outros autores não entram, porque são dados da organização. |

### 12. `[FORK]` Dados do domínio do produto

O recurso `entity` do boilerplate é exemplo e sai quando o fork o substitui pelo domínio real. Ele pertence à
organização (`organizationId`) e guarda quem o criou (`userId`); o registro 11 descreve o que a exclusão faz com ele.
Cada processo novo ganha um registro no mesmo formato.

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
