---
topic: saas-starter-feature-benchmark
question: Quais funcionalidades voltadas ao usuário final os boilerplates de SaaS entregam por padrão em 2025–2026, e quais um core de MVPs deve ter?
lens: produto
panel: [next-forge, makerkit, shipfast, supastarter, saas-ui-pro, vercel-platforms, supabase-stripe-starter, open-saas, nextacular, divjoy]
reference: [better-auth, clerk, workos]
collected: 2026-08-21
amended: 2026-10-16
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
| Notificações in-app + preferências | 3/10 (remedido em 2026-10-16: 4/10, ver adendo) | médio | G |
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

## Adendo de 2026-09-26: troca de e-mail, acesso por plano e configuração central

Coletado na descoberta de 2026-09-26 para três perguntas que a tabela de prevalência original não cobria.
O painel é o mesmo; onde a verificação não foi possível, está escrito.

### Troca de e-mail do titular

| referência | entrega? | como foi verificado |
|---|---|---|
| Makerkit | sim | código público do kit lite: `packages/features/accounts/src/components/email/update-email-form.tsx` e a chave `updateEmailCardTitle` ("Update your Email") no dicionário `en` |
| Better-Auth (referência) | sim, desligado por padrão | doc: "first enable the `changeEmail` feature, which is disabled by default"; o e-mail só muda depois que o novo endereço é verificado, e existe um passo opcional de confirmação pelo endereço atual |
| Open SaaS | não | `AccountPage.tsx` mostra o e-mail; busca por `updateEmail`, `changeEmail` e `verifyBeforeUpdateEmail` no repositório devolve 0 |
| Supastarter, ShipFast, Saas-UI, next-forge, demais | não verificado | código fechado ou página de docs sem menção. O next-forge delega a conta ao Clerk, cuja página do `UserProfile` não detalha o gerenciamento de e-mail |

Resultado honesto: **2 confirmados, 1 confirmado sem, o resto não verificado.** Não dá para escrever uma
fração sobre 10.

O requisito de provedor pesa mais que a prevalência. Projetos Firebase criados a partir de 15/09/2023 vêm com
a proteção contra enumeração de e-mail ligada, e com ela "users cannot change their email address without
first verifying the new address"; o `updateEmail` direto deixa de funcionar e o caminho documentado é o
`verifyBeforeUpdateEmail`. No Admin SDK o equivalente é `generateVerifyAndChangeEmailLink(email, newEmail)`,
presente no `firebase-admin` 13.6.0 instalado neste repositório. O emulador de Auth passou a aceitar esse
fluxo com a PR #7618 do `firebase-tools` (merge em 10/09/2024); o repositório fixa `firebase-tools` 15.30.1.

Avisar o endereço antigo depois da troca é o requisito **6.3.7 da ASVS 5.0.0, que é nível 3**, não 1. Vale
como higiene barata, não como exigência do nível que um MVP mira.

### Acesso por plano (entitlements)

- **Makerkit** documenta entitlements como receita, não como recurso entregue: "Instead of offering a
  one-size-fits-all entitlements system, Makerkit provides a foundation you can customize." O modelo da
  receita liga variante de plano a recurso e limite, com checagem no banco e na aplicação.
- **Open SaaS** guarda `subscriptionStatus`, `subscriptionPlan` e `credits` no usuário e deixa a decisão com o
  desenvolvedor ("you can choose how to handle this status within your app"). A doc não descreve checagem de
  servidor entregue por padrão.
- A prevalência de 2/10 da tabela original se mantém: o que os kits entregam é o estado da assinatura; o
  gate em si fica com quem constrói.
- **Stripe Entitlements** é o mecanismo do provedor: recursos (`Feature`, com `lookup_key` único) presos a
  produtos, e a Stripe mantém as permissões ativas do cliente conforme a assinatura. O evento é
  `entitlements.active_entitlement_summary.updated`, o resumo traz no máximo 10 itens (acima disso, paginar
  pela `url` do payload) e a doc recomenda "persist these entitlements internally for faster resolution".
  Mudança de recurso num produto só vale para assinaturas existentes no próximo ciclo. Preço do recurso:
  **não confirmado**.

### Configuração central de marca e criação de projeto

| referência | como o projeto novo recebe nome e marca |
|---|---|
| next-forge | `npx next-forge@latest init` pergunta nome e gerenciador de pacotes, clona, instala e copia os arquivos de env |
| Makerkit | `apps/web/config/app.config.ts`, alimentado por env (`NEXT_PUBLIC_PRODUCT_NAME`, cores de tema), validado com Zod no build |
| ShipFast | `config.js`: "It is where you configure your app. [...] it is the backbone of the app." |
| Supastarter | um `config.ts` por app (`apps/marketing/config.ts`, `apps/saas/config.ts`), cada um com o nome do app |

**4 de 4 verificados** têm um ponto único de configuração por app, e um deles tem CLI de criação. Os outros
seis do painel não foram verificados neste tema.

### Fontes do adendo

- <https://github.com/makerkit/nextjs-saas-starter-kit-lite> — formulário de troca de e-mail (busca de código, 2026-09-26)
- <https://www.better-auth.com/docs/concepts/users-accounts> — `changeEmail`
- <https://github.com/wasp-lang/open-saas> — `template/app/src/user/AccountPage.tsx`
- <https://docs.cloud.google.com/identity-platform/docs/admin/email-enumeration-protection> — proteção contra enumeração e troca de e-mail
- <https://github.com/firebase/firebase-tools/pull/7618> — fluxo `VERIFY_AND_CHANGE_EMAIL` no emulador
- <https://raw.githubusercontent.com/OWASP/ASVS/master/5.0/en/0x15-V6-Authentication.md> — 6.3.7 (nível 3)
- <https://makerkit.dev/docs/next-supabase-turbo/recipes/subscription-entitlements> · <https://docs.opensaas.sh/general/user-overview/>
- <https://docs.stripe.com/billing/entitlements.md?dashboard-or-api=api> — Entitlements
- <https://www.next-forge.com/docs/setup/installation> · <https://makerkit.dev/docs/next-supabase-turbo/configuration/application-configuration> · <https://shipfa.st/docs> · <https://supastarter.dev/docs/nextjs/configuration>

## Adendo de 2026-10-16: login, preços, compra avulsa, notificações e contato

Coletado na descoberta de 2026-10-16, com foco em produto, para sete perguntas que a tabela original não cobria
ou que precisavam de nova medição. Todas as páginas foram lidas em 2026-10-16.

**Mudança no painel.** O `supabase-stripe-starter` (`vercel/nextjs-subscription-payments`) está arquivado. O
README diz: "This repo has been sunset and replaced by a new template: https://github.com/nextjs/saas-starter".
Ele continua no painel como amostra histórica, marcado "arquivado". O sucessor, `nextjs/saas-starter`, entra como
referência fora da contagem. `vercel-platforms` e `divjoy` não foram verificados em nenhum dos temas abaixo, então
cada fração tem no mínimo dois "não verificados".

### Página de preços: de onde vêm os planos exibidos

| referência | o que a página mostra | como foi verificado |
|---|---|---|
| next-forge | estática: "$40" três vezes, planos escritos no JSX, botões sem checkout | código de `apps/web/app/[locale]/pricing/page.tsx` no repositório |
| Makerkit | "Pricing table generated from your billing config" | página de features |
| Supastarter | o hook `usePlanData` "dynamically iterates over the plans defined in your payments config" | doc de planos |
| ShipFast | "Just add a plan to your `config.js` file to show more" | doc do componente de preços |
| supabase-stripe-starter (arquivado) | sincronizada dos produtos da Stripe | README |
| Open SaaS | `PricingPage.tsx` existe; a origem do preço exibido não foi verificada | listagem de `template/app/src/payment` |
| nextjs/saas-starter (fora da contagem) | `getStripePrices()` e `getStripeProducts()`, `revalidate = 3600`, botão que dispara `checkoutAction` | código de `app/(dashboard)/pricing/page.tsx` |
| Saas UI, Nextacular | não verificado | — |

**4 de 10** geram a página de uma fonte única (config ou Stripe); 1 é estática (next-forge, de onde este
repositório herdou a página); 1 tem página com origem não verificada; 4 não verificados. O sucessor do starter da
Vercel lê a Stripe direto, com cache de uma hora.

*Nota de 2026-10-16, depois da PR #47:* a linha do next-forge descreve o projeto de origem e a página que este
repositório herdou. Desde a PR #47, a `/pricing` deste repositório lê o catálogo da Stripe pela API, com cache de
uma hora (spec arquivada em
[`docs/features/pricing-page-catalog/spec.md`](../../docs/features/pricing-page-catalog/spec.md)). A contagem de
referências não muda: este repositório não faz parte do painel.

### Pagamento avulso (compra única)

| referência | entrega? | evidência |
|---|---|---|
| Makerkit | sim, desligado por padrão | pedidos na tabela `orders`; eventos `checkout.session.completed`, `checkout.session.async_payment_failed` e `checkout.session.async_payment_succeeded`; "from version 2.12.0+, orders and subscriptions can coexist" |
| Supastarter | sim | "the type of the price, can be `subscription` or `one-time`", com exemplo de plano vitalício |
| ShipFast | sim | "use the `ButtonCheckout` to automatically create a checkout session (one-time payment or subscription)" |
| Open SaaS | sim, como pacote de créditos | `plans.ts`: `hobby` e `pro` com `kind: "subscription"`, `credits10` com `kind: "credits"` |
| supabase-stripe-starter (arquivado) | não | README: só preço recorrente |
| next-forge | não | o pacote de pagamentos não tem UI de compra |
| Saas UI | não mencionado | a página lista assinatura, preço por assento e cobrança medida |
| Nextacular, nextjs/saas-starter | não mencionado | — |

**4 de 10** confirmados. Requisito de provedor: o Checkout tem os modos `payment` e `subscription`, e o guia de
fulfillment da Stripe manda executar a entrega "only once per payment", porque a função "might be called multiple
times, possibly concurrently", e ouvir também `checkout.session.async_payment_succeeded` para meios de pagamento
com confirmação posterior. O mesmo guia diz que o webhook é obrigatório: não dá para depender só da página de
retorno.

O Stripe Entitlements, que o repositório usa para o acesso por plano, é descrito sobre assinatura. A página diz
"This guide assumes that you're already using Stripe Subscriptions" e "As long as a customer maintains an active
subscription for a feature, they retain an active entitlement". Se ele concede recurso numa compra avulsa:
**não confirmado**.

### Entrar com link por e-mail (link mágico)

| referência | entrega? | evidência |
|---|---|---|
| Makerkit | sim, desligado por padrão | `NEXT_PUBLIC_AUTH_MAGIC_LINK=false`, "Enable magic link auth" |
| Supastarter | sim | "better-auth supports magic link (email-based) authentication" |
| ShipFast | sim, é o padrão | NextAuth com login por link enviado por e-mail |
| Nextacular | sim, é o único método | `src/lib/server/auth.ts` importa `EmailProvider`; `docs/ARCHITECTURE.md` do projeto: "a single `EmailProvider` (magic link)" (busca de código com `gh`) |
| supabase-stripe-starter (arquivado) | sim | README |
| Open SaaS | não | a lista de métodos do Wasp é e-mail, usuário e senha, Google, GitHub, Keycloak, Slack e Discord |
| next-forge | delega ao Clerk; o padrão não foi verificado | — |
| Saas UI | o componente de auth suporta; o kit não foi verificado | — |

**5 de 10**, um deles arquivado; 1 confirmado sem. No Firebase, o link por e-mail é gratuito e, na web, não
depende do Firebase Dynamic Links: o encerramento de 25/08/2025 afetou "email link authentication for mobile
apps". O Admin SDK gera o link com `generateSignInWithEmailLink`, o que permite enviar pelo provedor de e-mail
próprio. O e-mail precisa ser o mesmo para o qual o link foi enviado; em outro aparelho, o usuário "must provide
the associated email again". Projetos criados depois de 28/04/2025 não trazem mais `localhost` como domínio
autorizado. O emulador de Auth cobre o fluxo.

Ressalva normativa: a NIST SP 800-63B-4, §3.1.3.1, diz que "Email SHALL NOT be used for out-of-band
authentication". A regra trata de autenticador fora de banda. Quem tem o e-mail já consegue redefinir a senha pelo
fluxo de recuperação, então o link mágico não baixa o piso de segurança de uma conta sem segundo fator; também não
serve como segundo fator.

### Vincular métodos de login à mesma conta

| referência | entrega? | evidência |
|---|---|---|
| Makerkit | sim, desligado por padrão | `NEXT_PUBLIC_AUTH_IDENTITY_LINKING`: o usuário pode "link multiple authentication methods (e.g., link Google to an existing email account)" |
| Supastarter | não mencionado na doc de autenticação | — |
| next-forge (Clerk) | não verificado: a página do `<UserProfile />` não detalha contas conectadas | — |
| demais | não mencionado | — |

**1 de 10** confirmado. O Firebase vincula nativamente (`linkWithPopup`, `linkWithCredential` com
`EmailAuthProvider.credential`, `unlink`), e a doc avisa: "If a user signs in again with the same provider after
it has been unlinked, Firebase creates a new, separate user account" (página atualizada em 2026-10-14). O emulador
cobre provedores federados com página de login falsa.

### Provedores sociais além do Google

Makerkit ("Google, GitHub, Facebook, X, Discord, and many more"), Supastarter (Google, GitHub, Apple), Open SaaS
(Google, GitHub, Discord, Keycloak, Slack), Saas UI (Google e Facebook) e o supabase-stripe-starter arquivado
(GitHub) oferecem pelo menos um provedor além do Google: **5 de 10**. ShipFast tem só o Google; Nextacular, só
e-mail; o next-forge depende do que for ligado no Clerk. O emulador do Firebase só aceita `signInWithCredential`
para provedores com ID token JWT (Google, Apple e outros); access token do Facebook ou do X não é suportado.

### Notificações in-app (remedição)

| referência | entrega? | como |
|---|---|---|
| next-forge | sim | Knock, serviço externo, com workflows criados no painel do Knock |
| Makerkit | sim, ligado por padrão | tabela própria; tempo real opcional (`NEXT_PUBLIC_REALTIME_NOTIFICATIONS=false`); sem tempo real, "fetched via React Query on component mount", que a doc chama de alternativa sem custo; sino com contador, três níveis (info, warning, error) |
| Supastarter | sim, segundo a página inicial ("In-app notification center") | a página de doc específica respondeu 404 |
| Saas UI | sim | a página do kit lista um router de `notifications` na API |
| demais | não mencionado | — |

**4 de 10** (eram 3 de 10 em 2026-08-21). Só o next-forge depende de serviço pago; o Makerkit entrega sem serviço
externo e sem tempo real.

### Formulário de contato que entrega

Supastarter ("Contact form") e Makerkit (`CONTACT_EMAIL`, "The email address for contact inquiries") entregam. O
next-forge tem o mesmo formulário de fachada que este repositório herdou: o `<Button>` não tem `onClick`, e a
página não tem `<form>` nem ação. O ShipFast tem um link de e-mail de suporte, sem formulário. **2 de 4
verificados**; seis não verificados.

### Lidos e sem sinal

Nenhuma das quatro páginas de features lidas por inteiro (Makerkit, Supastarter, ShipFast, Open SaaS) menciona PWA
nem banner de aviso global. Exemplo com LLM aparece em 2 delas (chatbot do Supastarter, integração OpenAI do Open
SaaS). Convite de usuário pelo admin: o plugin de admin do Better-Auth cria usuário com senha definida pelo admin,
como este repositório; o Clerk tem convite de aplicação por e-mail, que "expire after a month". Nos starters, o
tema não foi verificado.

### Fontes do adendo

- <https://github.com/vercel/next-forge/tree/main/apps/web/app/%5Blocale%5D> e o `pricing/page.tsx` e o `contact-form.tsx` da mesma pasta (código)
- <https://makerkit.dev/nextjs-saas-starter-kit> · <https://makerkit.dev/docs/next-supabase-turbo/configuration/authentication-configuration> · <https://makerkit.dev/docs/next-supabase-turbo/configuration/environment-variables> · <https://makerkit.dev/docs/next-supabase-turbo/billing/one-off-payments> · <https://makerkit.dev/docs/next-supabase-turbo/notifications/notifications-configuration> · <https://makerkit.dev/docs/next-supabase-turbo/notifications>
- <https://supastarter.dev/> · <https://supastarter.dev/docs/nextjs/authentication/overview> · <https://supastarter.dev/docs/nextjs/payments/plans>
- <https://shipfa.st/docs> · <https://shipfa.st/docs/features/magic-links> · <https://shipfa.st/docs/features/payments> · <https://shipfa.st/docs/components/pricing>
- <https://docs.opensaas.sh/> · <https://wasp.sh/docs/auth/overview> · <https://github.com/wasp-lang/open-saas/tree/main/template/app/src/payment> · <https://raw.githubusercontent.com/wasp-lang/open-saas/main/template/app/src/payment/plans.ts>
- <https://www.saas-js.com/docs/starter-kits/nextjs>
- <https://github.com/nextacular/nextacular> e busca de código `EmailProvider` no mesmo repositório
- <https://github.com/vercel/nextjs-subscription-payments> · <https://github.com/nextjs/saas-starter> · <https://raw.githubusercontent.com/nextjs/saas-starter/main/app/(dashboard)/pricing/page.tsx>
- <https://www.next-forge.com/docs/packages/authentication> · <https://www.next-forge.com/docs/packages/notifications>
- <https://firebase.google.com/docs/auth/web/email-link-auth> · <https://firebase.google.com/docs/auth/web/account-linking> · <https://firebase.google.com/docs/emulator-suite/connect_auth>
- <https://docs.stripe.com/payments/checkout/how-checkout-works.md?payment-ui=stripe-hosted> · <https://docs.stripe.com/checkout/fulfillment.md?payment-ui=stripe-hosted> · <https://docs.stripe.com/billing/entitlements.md?dashboard-or-api=api>
- <https://pages.nist.gov/800-63-4/sp800-63b.html> — §3.1.3.1
- <https://clerk.com/docs/users/invitations> · <https://www.better-auth.com/docs/plugins/admin>
- <https://nextjs.org/docs/app/guides/progressive-web-apps> (atualizada em 2026-07-30): manifest nativo do App Router e HTTPS bastam para instalar
