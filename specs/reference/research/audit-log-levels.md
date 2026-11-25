---
topic: audit-log-levels
question: Faz sentido separar a trilha de auditoria de um boilerplate em níveis (sensível × informativo), com retenção diferente por nível, e quanto isso custa no Firestore?
lens: confianca
panel: [owasp-logging-cheat-sheet, google-cloud-audit-logs, aws-cloudtrail, workos-audit-logs, supabase-auth-audit-logs]
collected: 2026-11-24
revalidate_after: 2027-05-24
confidence: média
---

# Níveis em trilha de auditoria e retenção por nível

## Resposta curta

Nenhum dos dois produtos de trilha de auditoria consultados (WorkOS e Supabase Auth) tem campo de nível ou
severidade no evento. Quem separa eventos por categoria são os provedores de nuvem: o Google Cloud grava
sempre a atividade administrativa e retém 400 dias, enquanto o acesso a dados é opcional e fica 30 dias; a
AWS não registra eventos de dados por padrão e cobra à parte por eles, por serem de alto volume. O OWASP
recomenda um atributo de severidade e uma classificação documentada. A separação sensível × informativo tem
precedente, mas como categoria com retenção própria, não como os níveis de log de aplicação (debug, warn,
error).

## Prevalência

Painel de 5 referências, todas lidas na fonte primária em 2026-11-24.

| Referência | Tem nível/categoria no evento? | Retenção diferente por categoria? | Fonte |
|------------|-------------------------------|-----------------------------------|-------|
| OWASP Logging Cheat Sheet | recomenda "Type of event" e "Severity of event" (`{fatal, error, warning, info, debug, trace}`) | não fixa prazo; manda respeitar o prazo de retenção exigido | cheatsheetseries.owasp.org |
| Google Cloud Audit Logs | sim: Admin Activity, System Event, Data Access, Policy Denied | sim: `_Required` 400 dias, não configurável; `_Default` 30 dias, configurável no projeto | docs.cloud.google.com |
| AWS CloudTrail | sim: management × data events | data events desligados por padrão e cobrados à parte | docs.aws.amazon.com |
| WorkOS Audit Logs | não; o evento tem `action`, `actor`, `targets`, `context`, `occurred_at` | não; retenção por organização, 30 dias por padrão, de 1 a 11 meses | workos.com/docs |
| Supabase Auth audit logs | não; campos `timestamp`, `user_id`, `action`, `ip_address`, `user_agent`, `metadata` | não informado | supabase.com/docs |

Resumo: 2 de 5 separam por categoria com retenção ou ativação diferente (os dois provedores de nuvem); 1 de 5
recomenda o atributo sem prescrever valores de negócio (OWASP); 0 de 2 produtos de trilha para SaaS têm
nível no evento.

## O que o mercado trata como o mínimo

- Cada evento identifica ação, ator, alvo e momento. WorkOS e Supabase convergem nisso, e a trilha deste
  repo já tem esses campos.
- A trilha de autenticação do Supabase grava cadastro (`user_signedup`), login, logout, convite e troca de
  senha no mesmo lugar, sem distinguir o que é sensível. Ou seja, eventos de ciclo de vida da conta entrarem
  na trilha é comum.
- O OWASP lista como "sempre registrar" sucessos e falhas de autenticação, administração de usuários
  ("addition or deletion of users") e importação/exportação de dados.

## O que é opcional / avançado

- Retenção configurável por cliente (WorkOS, de 1 a 11 meses).
- Envio contínuo para SIEM ou data warehouse (WorkOS Log Streams).
- Categoria de alto volume desligada por padrão (Google Data Access, AWS data events).

## Obrigações e requisitos externos

- Não há prazo legal brasileiro para trilha de auditoria de negócio. A análise está em
  [`compliance-trust-baseline.md`](compliance-trust-baseline.md) e na spec arquivada
  [`docs/features/audit-log/spec.md`](../../../docs/features/audit-log/spec.md): o Decreto 8.771/2016, art. 13,
  § 2º, manda reter a menor quantidade possível de dado pessoal.
- OWASP: o log não deve guardar dado pessoal sensível; nome, telefone e e-mail exigem tratamento especial, e a
  folha sugere pseudonimização.

## Armadilhas conhecidas

- A política de TTL do Firestore exige faturamento: a página de cotas lista TTL entre os recursos em que
  "You must enable billing to use these features". Um fork no plano Spark não tem expurgo automático.
- O TTL apaga em até cerca de 24 horas depois do vencimento ("typically deleted within 24 hours"), cobra cada
  exclusão como delete comum e ignora documentos sem o campo ou com `null`. Dá para marcar só os eventos
  informativos com vencimento e deixar os sensíveis sem.
- Um campo de TTL por grupo de coleção. Indexar o campo de vencimento pode criar hotspot; a doc sugere isenção
  de índice para ele.
- Filtro de igualdade no Firestore não encontra documento sem o campo. Registro antigo sem nível some do
  filtro, mesmo que o mapper preencha um padrão na leitura.

## Custo herdado por todo fork

- Cota gratuita do Firestore: 1 GiB armazenado, 50.000 leituras, 20.000 escritas e 20.000 exclusões por dia.
  Evento de ciclo de vida (cadastro, assinatura, onboarding) ocorre poucas vezes por usuário, então não ameaça
  essa cota. O que ameaçaria é registrar por requisição (login a cada acesso, visualização de tela).
- Índices compostos: até 200 sem faturamento, 1000 com.
- Nenhuma variável de ambiente nem serviço novo.

## Fontes

- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html (acesso em 2026-11-24): eventos a
  registrar, atributo de severidade, dados a excluir.
- https://docs.cloud.google.com/logging/docs/audit (acesso em 2026-11-24): tipos de audit log, quais são
  sempre gravados e quais vêm desligados.
- https://docs.cloud.google.com/logging/quotas (acesso em 2026-11-24): `_Required` 400 dias não configurável;
  `_Default` 30 dias.
- https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html (acesso em
  2026-11-24): data events desligados por padrão, alto volume, cobrança adicional.
- https://workos.com/docs/audit-logs (acesso em 2026-11-24): esquema do evento sem nível; retenção de 30 dias a
  11 meses por organização.
- https://supabase.com/docs/guides/auth/audit-logs (acesso em 2026-11-24): ações registradas, incluindo
  `user_signedup` e `login`; sem campo de nível.
- https://firebase.google.com/docs/firestore/ttl (acesso em 2026-11-24): funcionamento, prazo e cobrança do TTL.
- https://firebase.google.com/docs/firestore/quotas (acesso em 2026-11-24): cota gratuita, TTL exige
  faturamento, limite de índices compostos.
