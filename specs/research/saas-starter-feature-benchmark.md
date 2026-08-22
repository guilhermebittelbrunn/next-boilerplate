---
topic: saas-starter-feature-benchmark
question: Quais funcionalidades voltadas ao usuário final os boilerplates de SaaS entregam por padrão em 2025–2026, e quais um core de MVPs deve ter?
lens: produto
panel: [next-forge, makerkit, shipfast, supastarter, saas-ui-pro, vercel-platforms, supabase-stripe-starter, open-saas, nextacular, divjoy]
reference: [better-auth, clerk, workos]
collected: 2026-08-21
revalidate_after: 2027-02-21
confidence: média
---

# Benchmark de funcionalidades de usuário final em starters de SaaS

## Resposta curta

Auth completo e assinatura Stripe são **commodity** — não entregar é lacuna, não diferencial. O que separa
um boilerplate premium de um indie é outro quarteto: **organizações + convites/RBAC + onboarding +
super-admin com impersonação**. Esses quatro são **caros de retrofitar e baratos de já ter**, e é aí que um
core de MVPs ganha ou perde valor. O resto da lista popular (⌘K, referral, API keys, exportação de dados) é
opcional e, na maioria dos MVPs, ruído.

## Prevalência

Prevalência = "entrega por padrão, com UI pronta", medida sobre os **10 starters** do painel. As três
plataformas de referência (Better-Auth, Clerk, WorkOS) entram só como baseline de custo de implementação.

| Funcionalidade | Prevalência | Valor p/ usuário | Esforço |
|---|---|---|---|
| Auth base (e-mail+senha, social, verificação, reset) | 10/10 | bloqueador | P |
| Assinatura Stripe (checkout + portal) | 9/10 | alto | M |
| Dark mode | 9/10 | médio | P |
| Blog/docs/landing (marketing) | 7/10 | médio | M |
| Perfil + avatar/upload | 6/10 | alto | P |
| Analytics plugado (PostHog/GA/Plausible) | 6/10 | indireto | P |
| Times/organizações (multi-tenant) | 6/10 | alto (B2B) | **G** |
| Convites por e-mail + RBAC | 5/10 | alto (B2B) | G |
| i18n | 4/10 | alto (BR/LatAm) | M |
| Exclusão de conta (LGPD/GDPR) | 4/10 | confiança/legal | M |
| Admin/super-admin (listar, banir) | 4/10 | operacional | M |
| Onboarding pós-signup multi-step | 3/10 | **muito alto** | M |
| Notificações in-app + preferências | 3/10 | médio | G |
| MFA/2FA (TOTP/passkey) com UI | 3/10 | médio | M |
| Dashboard de métricas do produto | 3/10 | médio | M |
| Feature flags | 2/10 | indireto | P |
| Metering/limites de uso, créditos | 2/10 | alto (AI SaaS) | G |
| Impersonação de usuário | 2/10 | suporte | M |
| Command palette / busca global | 2/10 | baixo-médio | P |
| Waitlist / captura de lead | 2/10 | alto (pré-launch) | P |
| Widget de feedback | 1/10 | médio | P |
| API keys do usuário | 1/10 | nicho (API product) | M |
| Webhooks de saída | 1/10 | nicho | G |
| Sessões/dispositivos gerenciáveis | 1/10 | baixo | M |
| Exportação de dados | 0/10 | legal (raro) | M |
| Referral/afiliados | 0/10 | hype | G |
| SSO enterprise / SCIM / audit logs | 0/10 | só enterprise | G |

## O que o mercado trata como o mínimo

- **Auth completo — 10/10.** E-mail+senha, OAuth social, verificação de e-mail e recuperação de senha
  aparecem em todos, sem exceção. Kits antigos (ShipFast, Nextacular) tratam verificação como opcional — e
  isso vira vetor de spam em signup aberto.
- **Assinatura — 9/10.** Stripe Checkout + Customer Portal + webhook de status. Trial e downgrade quase
  nunca vêm testados; a reconciliação de estado é o ponto frágil de todos.
- **Perfil com avatar — 6/10.** Traz consigo storage de arquivo (validar MIME e tamanho **no servidor**,
  bucket não público).
- **Dark mode — 9/10** é commodity. **i18n real — 4/10**: a armadilha recorrente é traduzir a UI e esquecer
  **e-mails transacionais e mensagens de erro da API**.

## O que é opcional / avançado

- **Times/organizações — 6/10.** É o eixo que separa B2B de B2C e a decisão **mais cara de postergar**:
  retrofitar `organizationId` em todas as queries e regras é reescrita, não refactor. Armadilha: isolamento
  só no cliente, sem regra/guard espelhado no servidor.
- **Convites + RBAC — 5/10.** Armadilhas: convite para e-mail já cadastrado, expiração de token, e deixar o
  último owner sair da organização.
- **Onboarding pós-signup — 3/10.** **Maior desequilíbrio valor/prevalência do painel**: é onde o usuário
  decide se fica, e quase nenhum kit entrega. Armadilha: fluxo não retomável.
- **Impersonação — 2/10.** Maior ROI para suporte e maior risco: exige log de auditoria (quem, quem, quando),
  sessão marcada e proibição de ações destrutivas/billing.
- **MFA — 3/10.** Custo caiu para configuração com Better-Auth/Clerk. Sem códigos de recuperação, gera
  suporte manual eterno.
- **Notificações in-app — 3/10.** Esforço **G** se feito à mão (feed, badge, fan-out, preferências, digest).
  next-forge terceiriza no Knock — o que traz chave/serviço externo obrigatório.
- **Exclusão de conta — 4/10.** Armadilha central: deletar o usuário e deixar órfãos (assinatura Stripe
  ativa, arquivos no bucket, membros de organização). O correto é anonimizar + cancelar + limpar.

## Obrigações e requisitos externos

Nada aqui é obrigação legal por si — as obrigações estão em
[`compliance-trust-baseline.md`](compliance-trust-baseline.md). Requisito de provedor relevante:
webhook da Stripe é entregue *at-least-once* e fora de ordem, o que torna idempotência um requisito, não uma
otimização (ver [`engineering-baseline.md`](engineering-baseline.md), prática 10).

## Armadilhas conhecidas

- **Metering/créditos (2/10)** está em alta por causa de AI SaaS, mas na prática é DIY sobre a Stripe
  Meters API em quase todo kit. Contar uso no cliente, ou não ter *enforcement* no servidor quando a cota
  estoura, é o erro comum.
- **Command palette (⌘K)** aparece em templates de dashboard, não em kits de SaaS. Barato, valor estético.
- **Referral/afiliados — 0/10.** É discurso de blog: o mercado resolve com produto de terceiro, não com
  código do boilerplate.
- **SSO enterprise / SCIM — 0/10.** Território WorkOS/Clerk; só entra com o primeiro contrato enterprise.

## Custo herdado por todo fork

- Organizações/RBAC: alto e permanente — muda o modelo de dados de **todo** recurso, inclusive nos forks
  B2C que não usam times.
- Notificações via serviço externo (Knock/Svix): chave obrigatória e custo por evento.
- Auth, assinatura, upload, onboarding: custo baixo e opt-in por env — cabem no free tier.

## Ressalvas metodológicas

1. ShipFast, Saas-UI Pro e Divjoy têm **código fechado**: a avaliação vem de páginas públicas de
   marketing/docs, que **superestimam** o que é entregue.
2. Divjoy está estagnado e Nextacular ainda usa Pages Router — contam como amostra histórica.
3. Better-Auth, Clerk e WorkOS **não são starters**; entram como baseline de "quanto custa hoje" cada
   capacidade.

## Fontes

- <https://github.com/vercel/next-forge> — escopo do fork de origem deste repo
- <https://www.next-forge.com/packages/authentication> · <https://www.next-forge.com/docs/packages/notifications>
- <https://makerkit.dev/nextjs-saas-starter-kit> · <https://makerkit.dev/docs/next-supabase-turbo/installation/functional-walkthrough> · <https://makerkit.dev/docs/next-fire/admin>
- <https://supastarter.dev/> · <https://supastarter.dev/nextjs-organizations-template>
- <https://saas-ui.dev/docs/nextjs-starter-kit/billing>
- <https://docs.opensaas.sh/> · <https://github.com/nextacular/nextacular> · <https://shipfa.st/docs>
- <https://vercel.com/templates/next.js/platforms-starter-kit>
- <https://www.better-auth.com/docs/plugins/organization> · <https://clerk.com/organizations>
