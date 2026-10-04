# Subprocessadores e transferência internacional

> **Modelo, não parecer jurídico.** Este documento vem preenchido com o que o boilerplate faz e marca com
> `[FORK]` o que só o produto pode preencher. Revise com quem responde juridicamente pelo produto antes de
> usar como registro oficial.
>
> Fontes coletadas em 2026-09-30. Base na nota
> [`compliance-trust-baseline`](../specs/research/compliance-trust-baseline.md), a revalidar depois de
> 2027-08-21. Provedor muda a própria lista e os próprios termos: confira a página dele antes de copiar uma
> célula daqui para a política de privacidade.

Lista dos provedores que recebem dado de usuário final quando o boilerplate roda, e do mecanismo que cada
um declara para transferir esse dado para fora do Brasil. Entra na lista só o provedor que o código chama e
para quem sai dado de usuário. Pacote instalado e não usado fica de fora (seção "O que não entra").

## Como ler

- **Obrigatório**: todo deploy do boilerplate usa.
- **Condicional**: só se o fork publica na Vercel.
- **Opcional**: só entra se a variável estiver preenchida. Sem ela, nenhum dado sai para o provedor.

Um fork que não liga uma integração opcional tira a linha da política de privacidade dele e do
[`ROPA.md`](ROPA.md).

## Lista

São 9 serviços em 5 empresas. A primeira tabela diz o que sai e onde o código faz a chamada; a segunda, o
que o provedor declara sobre região e contrato.

| # | Provedor | Serviço | Finalidade | Dado de usuário que sai | Obrigatoriedade (variável) | Onde no código |
|---|---|---|---|---|---|---|
| 1 | Google | Firebase Authentication, com o login com Google e o avatar da conta Google | criar conta, autenticar, emitir o cookie de sessão, redefinir senha, trocar e-mail | e-mail, senha (o Firebase guarda o hash), nome, uid, foto e token da conta Google no login social, IP e user agent do navegador | obrigatório (`NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_ADMIN_*`, `FIREBASE_WEB_API_KEY`) | `packages/auth/client.ts:81`, `packages/auth/client.ts:152-153`, `packages/auth/server.ts:92`, `packages/auth/server.ts:236`, `packages/auth/server.ts:330-332`, `apps/api/(shared)/lib/firebase-identity-toolkit.ts:4`; avatar: `apps/app/proxy.ts:19`, `apps/app/next.config.ts:19-23` |
| 2 | Google | Cloud Firestore | guardar perfil, trilha de auditoria, cobrança e os dados do produto | perfil (`user`: telefone, avatar, preferências, onboarding, `lastAccessAt`, `stripeCustomerId`, assinatura), `entity`, `auditEvent`, `session` (navegador, sistema e tipo de aparelho de cada login, instante do login e do último uso), `paymentEvent`, `paidInvoice`, `subscriptionActivation`, `planLabel` | obrigatório (`FIREBASE_ADMIN_*`) | `packages/auth/server.ts:100`; coleções em `apps/api/(shared)/repositories/user.repository.ts:42`, `apps/api/(shared)/repositories/audit-event.repository.ts:76`, `apps/api/(shared)/repositories/entity.repository.ts:13`, `apps/api/(shared)/repositories/session.repository.ts:49`, `apps/api/(shared)/repositories/payment-event.repository.ts:22`, `apps/api/(shared)/repositories/paid-invoice.repository.ts:33`, `apps/api/(shared)/repositories/subscription-activation.repository.ts:24`, `apps/api/(shared)/repositories/plan-label.repository.ts:27` |
| 3 | Google | Cloud Storage for Firebase | guardar arquivo enviado | avatar e foto de `entity`, sob `uploads/<profileId>/` | opcional (`FIREBASE_STORAGE_BUCKET` na api, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` no app) | `apps/api/(shared)/lib/storage.ts:35-37`, `apps/api/(shared)/lib/storage.ts:44`, `packages/auth/server.ts:112`, `apps/app/proxy.ts:66` |
| 4 | Stripe | Checkout, Billing, portal e webhooks | cobrar assinatura | e-mail e id do cliente, dados de cobrança digitados no Checkout hospedado, assinatura, faturas | opcional (`STRIPE_SECRET_KEY` **e** `STRIPE_WEBHOOK_SECRET`) | `packages/payments/index.ts:14-24`, `packages/payments/index.ts:33-36`; chamadas em `apps/api/app/(routes)/payments/checkout/route.ts:21`, `apps/api/app/(routes)/payments/portal/route.ts:15`, `apps/api/app/(routes)/payments/plans/route.ts:13`, `apps/api/app/(routes)/webhooks/payments/route.ts:199`, `apps/api/app/(routes)/users/[id]/route.ts:53`, `apps/api/(shared)/lib/account-erasure.ts:85` |
| 5 | Resend | e-mail transacional | enviar os e-mails de conta e entregar o formulário de contato | e-mail do destinatário e corpo dos e-mails de verificação, redefinição de senha e troca de e-mail; nome, e-mail e mensagem do formulário de contato | opcional (`RESEND_TOKEN` **e** `RESEND_FROM`) | `packages/email/index.ts:76-79`, `packages/email/index.ts:89-100`; chamadas em `apps/api/app/(routes)/auth/password/reset-request/route.ts:38`, `apps/api/app/(routes)/auth/email-verification/send/route.ts:62`, `apps/api/app/(routes)/account/email/route.ts:147`, `apps/api/app/(routes)/account/email/route.ts:157`, `apps/web/app/[locale]/contact/actions/contact.tsx:16-22` |
| 6 | Vercel | hospedagem e logs de função | servir os três apps | toda requisição (IP, cabeçalhos, caminho) e o log estruturado da API, que não carrega IP nem corpo | condicional (deploy na Vercel; `VERCEL_*` lidas em `packages/next-config/keys.ts:13-19`) | `apps/app/vercel.json`, `apps/web/vercel.json`, `apps/api/vercel.json`; log em `packages/shared/utils/helpers/log.ts:51-57`; bloqueio sem endereço em `apps/api/proxy.ts:64-76` |
| 7 | Vercel | Web Analytics | medir audiência | eventos de navegação (URL, referrer, país e cidade, sistema, navegador); o visitante é identificado por um hash da requisição, descartado em 24 horas | condicional (deploy na Vercel **e** consentimento de analytics) | `packages/analytics/consent.ts:103-108`, `packages/analytics/server.ts:22-25`, `packages/analytics/provider.tsx:103`, `packages/analytics/provider.tsx:109` |
| 8 | Google | Google Analytics 4 | medir audiência | eventos de navegação, identificadores de cookie, IP e identificadores de dispositivo | opcional (`NEXT_PUBLIC_GA_MEASUREMENT_ID` com prefixo `G-` **e** consentimento) | `packages/analytics/keys.ts:7-13`, `packages/analytics/provider.tsx:110-111`; Consent Mode com os sinais de anúncio negados em `packages/analytics/provider.tsx:28-32` |
| 9 | Arcjet | limite de requisições e bloqueio de bot | proteger as rotas sensíveis contra abuso | IP e cabeçalhos da requisição | opcional (`ARCJET_KEY` com prefixo `ajkey_`) | `packages/security/keys.ts:35-41`, `packages/security/index.ts:37`, `packages/security/index.ts:47`, `packages/security/index.ts:80`; chamadas em `apps/api/proxy.ts:147`, `apps/app/proxy.ts:138` e `apps/web/proxy.ts:68` (esta não roda: o `skipValidation` de `apps/web/env.ts:33` deixa `env.ARCJET_KEY` sempre vazio) |

| # | Serviço | Região declarada | DPA | Lista de subprocessadores do provedor |
|---|---|---|---|---|
| 1 | Firebase Authentication | só Estados Unidos: "Firebase Authentication processes data exclusively in the United States" ([privacidade do Firebase](https://firebase.google.com/support/privacy)) | [Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum) (ver nota abaixo) | <https://cloud.google.com/terms/subprocessors> |
| 2 | Cloud Firestore | a que o fork escolheu ao criar o banco, que não muda depois ([`FORKING.md`](FORKING.md) §4, passo 5) · `[FORK]` região do banco | [Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum) | <https://cloud.google.com/terms/subprocessors> |
| 3 | Cloud Storage for Firebase | a do bucket (`us-central1`, `us-east1` ou `us-west1` para ficar na franquia, [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §6) · `[FORK]` região do bucket | [Cloud Data Processing Addendum](https://cloud.google.com/terms/data-processing-addendum) | <https://cloud.google.com/terms/subprocessors> |
| 4 | Stripe | Estados Unidos: o DPA diz que o usuário "transfere Dados Pessoais para a Stripe, LLC nos Estados Unidos" (§6.1) | <https://stripe.com/legal/dpa> e o adendo de transferência <https://stripe.com/legal/dta> | <https://stripe.com/legal/service-providers> |
| 5 | Resend | envio em `us-east-1`, `eu-west-1`, `sa-east-1` ou `ap-northeast-1`, à escolha por domínio; os dados da conta, inclusive metadados e logs de e-mail, ficam nos Estados Unidos em qualquer caso ([regiões da Resend](https://resend.com/docs/dashboard/domains/regions)) · `[FORK]` região do domínio | <https://resend.com/legal/dpa> | <https://resend.com/legal/subprocessors> |
| 6 | Vercel, hospedagem | funções em Washington, D.C. (`iad1`) por padrão em projeto novo ([regiões de função](https://vercel.com/docs/functions/configuring-functions/region)); os `vercel.json` do repo não definem `regions`, então vale o padrão. São Paulo existe como `gru1` ([regiões](https://vercel.com/docs/regions)). Em que região roda o `proxy.ts` de cada app não foi confirmado. · `[FORK]` região escolhida | <https://vercel.com/legal/dpa> (só planos Pro e Enterprise, ver nota) | <https://vercel.com/legal/sub-processors> |
| 7 | Vercel, Web Analytics | não informado na [página de privacidade do produto](https://vercel.com/docs/analytics/privacy-policy) | não confirmado que o DPA da Vercel cobre o produto: o DPA não lista produtos | <https://vercel.com/legal/sub-processors> |
| 8 | Google Analytics 4 | não informado: "Google may process Customer Personal Data in any country in which Google or its Subprocessors maintain facilities" (§10.1 dos termos) | [Google Ads Data Processing Terms](https://business.safety.google/adsprocessorterms/), que listam o Google Analytics entre os serviços cobertos ([lista](https://business.safety.google/adsservices/)) | <https://business.safety.google/adssubprocessors/> |
| 9 | Arcjet | várias regiões, sem garantia de processar na mesma região do app; região fixa é um adicional pago ([privacidade da Arcjet](https://docs.arcjet.com/privacy)) | não encontrado: `arcjet.com/dpa` e `arcjet.com/legal` responderam 404 em 2026-09-30 | <https://trust.arcjet.com/subprocessors> (a página monta por JavaScript e o conteúdo não foi lido) |

Notas que mudam o que o fork precisa fazer:

- **Authentication, Firestore e Storage estão sob os termos do Google Cloud, não sob os do Firebase.** A
  [tabela de termos do Firebase](https://firebase.google.com/terms) põe os três em "Google Cloud Platform
  Terms of Service", e a [página de privacidade](https://firebase.google.com/support/privacy) diz que esses
  serviços "are already covered by associated data processing terms, the Cloud Data Processing Addendum". Os
  [Firebase Data Processing and Security Terms](https://firebase.google.com/terms/data-processing-terms)
  valem para outros produtos do Firebase que o boilerplate não usa.
- **O DPA da Vercel não vale no plano Hobby.** O texto diz que "applies to Vercel's Processing of Personal
  Data as a Processor under the Agreement for Customers who are on Enterprise and Pro plans". O Hobby também é
  restrito a "non-commercial personal use only"
  ([fair use](https://vercel.com/docs/limits/fair-use-guidelines)). Produto com cliente pagante na Vercel
  precisa do Pro para ter operador com contrato.
- **O Google Analytics exige aceite ativo fora da Europa.** A
  [ajuda do GA](https://support.google.com/analytics/answer/3379636?hl=en) diz que cliente com empresa fora
  do EEE, do Reino Unido e da Suíça precisa "proactively accept such terms in their Account Settings". Para
  um fork brasileiro isso é passo manual em Administração → Configurações da conta.
- **A Stripe se declara operadora numa parte e controladora noutra.** A seção 2 do DPA separa as duas
  funções. O que ela trata como controladora não fica sob as instruções do fork.
- **O Firebase Authentication apaga a conta excluída dos backups do Google em até 180 dias** e guarda IP de
  login "for a few weeks" ([privacidade do Firebase](https://firebase.google.com/support/privacy)). É o prazo
  a declarar ao titular para a parte que o Google guarda depois da exclusão.

`[FORK]` Anote aqui a data em que cada DPA foi aceito e por quem, para os provedores que o fork liga:

| Provedor | DPA aceito em | Por quem | Onde está a cópia |
|---|---|---|---|
| Google Cloud (Firebase) | `[FORK]` | `[FORK]` | `[FORK]` |
| Google Analytics | `[FORK]` | `[FORK]` | `[FORK]` |
| Stripe | `[FORK]` | `[FORK]` | `[FORK]` |
| Resend | `[FORK]` | `[FORK]` | `[FORK]` |
| Vercel | `[FORK]` | `[FORK]` | `[FORK]` |
| Arcjet | `[FORK]` (DPA não encontrado em página pública) | `[FORK]` | `[FORK]` |

## O que não entra, e por quê

| Candidato | Por que fica fora | Evidência |
|---|---|---|
| Firebase Analytics | O `measurementId` vai para o `firebaseConfig`, mas nenhum código chama `getAnalytics`, então o SDK de analytics do Firebase não carrega. | `packages/auth/client.ts:72`; `grep -rn "getAnalytics\|firebase/analytics" apps packages` sem resultado fora de `node_modules` |
| `@stripe/agent-toolkit` | Tem fábrica em `packages/payments/ai.ts`, mas nenhum consumidor fora dos testes. Se ganhar um, o provedor continua sendo a Stripe. | `grep -rn "payments/ai" apps packages` sem resultado fora de `__tests__` |
| Sentry, Better Stack, Axiom, PostHog, Upstash | Nenhuma integração. Sentry, Better Stack e Axiom aparecem só como sugestão em [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §11. | nenhum `import` desses pacotes em `apps/` e `packages/` |
| GitHub (Actions) | Recebe código, não dado de usuário final. | `.github/workflows/ci.yml` |
| Fontes | `geist` vem como pacote npm e é servida pelo próprio app. Não há `next/font/google`. | `grep -rn "next/font/google" apps packages` sem resultado |

## Ao adicionar uma integração

1. Uma linha nova nas duas tabelas acima, com a variável que liga a integração.
2. Um registro novo ou atualizado no [`ROPA.md`](ROPA.md), no bloco Compartilhamento.
3. A política de privacidade do fork ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) §7).

Para conferir a lista contra o código, a partir da raiz do repositório:

```bash
grep -rlE 'from "(stripe|resend|@arcjet/next|@vercel/analytics/react|@next/third-parties/google|firebase-admin/[a-z]+|firebase/(app|auth))"' \
  --include='*.ts' --include='*.tsx' --exclude-dir=node_modules --exclude-dir=__tests__ packages apps
```

Um pacote de provedor que aparecer nessa busca sem linha correspondente aqui é defeito da lista.

## Transferência internacional

Base legal: LGPD arts. 33 e 35
([texto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)). O art. 33 permite a
transferência para país com grau de proteção adequado reconhecido pela ANPD (inciso I) ou com garantias
oferecidas pelo controlador, entre elas cláusulas-padrão contratuais (inciso II, b). O art. 35 dá à ANPD a
definição do conteúdo dessas cláusulas, publicado na Res. CD/ANPD 19/2024
([página da ANPD](https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/transferencia-internacional-de-dados)).
Para quem atende a União Europeia, o GDPR trata do tema no capítulo V.

Todo provedor da lista processa pelo menos parte do dado fora do Brasil. O que cada um declara, lido em
2026-09-30:

| Provedor | País declarado | Mecanismo para dado sujeito à LGPD | Mecanismo para dado europeu | Fonte |
|---|---|---|---|---|
| Google Cloud (Authentication, Firestore, Storage) | Authentication só nos EUA; Firestore e Storage na região escolhida, e "any country where Google or its Subprocessors maintain facilities" para o resto (§10.1) | "BR SCCs", que o próprio texto chama de "cláusulas-padrão contratuais aprovadas pela ANPD", aplicadas quando o Google não adota outra solução para a LGPD (Apêndice 3, seção Brazil, §3.1). A [página de soluções alternativas](https://cloud.google.com/terms/alternative-transfer-solution) não lista nenhuma para o Brasil. | EU-U.S. Data Privacy Framework, e SCCs se ele deixar de valer | [Cloud DPA](https://cloud.google.com/terms/data-processing-addendum) (última modificação em 8 de junho de 2026) · [BR SCCs](https://cloud.google.com/sccs/br-c2p?hl=pt-br) |
| Google Analytics | não informado | não encontrado: os termos incluem a LGPD na definição de lei aplicável, mas a seção de transferência trata só de "Restricted European Transfers" | SCCs dos próprios termos, ou solução alternativa que o Google adotar | [Google Ads Data Processing Terms](https://business.safety.google/adsprocessorterms/) |
| Stripe | Estados Unidos (Stripe, LLC) e afiliadas e suboperadores em outras jurisdições | "Brazilian Standard Contractual Clauses", para transferência do Brasil a país sem decisão de adequação da ANPD (§11 do adendo de transferência) | Data Privacy Framework (Stripe, LLC é autocertificada) e SCCs da UE | [DPA](https://stripe.com/legal/dpa) (atualizado em 28 de setembro de 2026) · [adendo de transferência](https://stripe.com/legal/dta) (atualizado em 18 de novembro de 2025) |
| Resend | Estados Unidos ("primary processing operations take place in the United States", §6.1) | não encontrado: a definição de "Data Protection Laws" do DPA não cita a LGPD | SCCs da UE (§6.2) e EU-U.S. Data Privacy Framework (§11) | [DPA](https://resend.com/legal/dpa) (sem data de atualização na página) |
| Vercel | Estados Unidos ("primary processing facilities are in the United States") | não encontrado: o Anexo 4 (termos por jurisdição) cobre Califórnia, EEE, Suíça, Reino Unido, Austrália e Canadá | SCCs de 2021 da UE e o IDTA do Reino Unido | [DPA](https://vercel.com/legal/dpa) (atualizado em 17 de março de 2026) |
| Arcjet | "may be transferred to, and/or processed in, the United States" ([termos](https://arcjet.com/terms)) | não encontrado | a política de privacidade cita SCCs da UE ou do Reino Unido para o dado que a própria Arcjet coleta como controladora (§9.2); sem DPA, não há mecanismo declarado para o dado que ela processa por conta do fork | [privacidade](https://arcjet.com/privacy) (modificada em 21 de janeiro de 2026) |

O que esta tabela não afirma:

- **SCC de DPA é mecanismo do GDPR.** As cláusulas da Comissão Europeia (Decisão 2021/914) não são as
  cláusulas-padrão da ANPD. Onde a tabela diz "não encontrado", o provedor oferece o mecanismo europeu e
  nenhum brasileiro, e isso não cobre a transferência sob a LGPD.
- **Onde há cláusula brasileira, a conformidade do texto não foi conferida.** O Google Cloud e a Stripe
  declaram adotar as cláusulas aprovadas pela ANPD. Ninguém comparou, cláusula a cláusula, o texto deles com
  o anexo da Res. 19/2024. O conteúdo da retificação de 18/08/2025 dessa resolução também segue não
  confirmado (nota de pesquisa, seção "Não confirmado").
- **A Res. CD/ANPD 32/2026 reconhece a União Europeia como adequada.** A existência, a data e o objeto estão
  confirmados na página da ANPD; o texto integral não foi lido. Ela trata da União Europeia: nada nela, até
  onde a nota confirmou, alcança provedor nos Estados Unidos, que é onde estão todos os desta lista.

`[FORK]` Para cada transferência que o fork liga, registre no bloco Observações do registro correspondente
em [`ROPA.md`](ROPA.md): provedor, país e mecanismo (o desta tabela, ou o que o jurídico do fork decidir
para as linhas "não encontrado").
