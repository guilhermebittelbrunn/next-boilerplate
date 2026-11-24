# Plano: core aprovado na parte 3 da entrega, fatia 3 (títulos e conversão)

- **Spec**: [`specs/delivery-product-quality.md`](../../../../specs/delivery-product-quality.md) (`status: approved`).
  Problema, evidência e corte são decisão de produto já tomada. Este plano responde ao *como*.
- **Escopo**: só a **fatia 3** da spec (linhas 190-194): título próprio por tela do painel, a partir do dicionário,
  com `title.template` nos layouts; eventos `sign_up` e `generate_lead` pelo `@repo/analytics`, só com
  consentimento, e um helper para o fork registrar os eventos do produto. As fatias 1 e 2 foram entregues pelas PRs
  #71 e #72 e têm o histórico em [`../delivery-product-quality/`](../../delivery-product-quality/STATE.md) e
  [`../delivery-product-quality-slice-2/`](../../delivery-product-quality-slice-2/STATE.md). O "Fora do corte"
  (dieta do bundle, copy de SEO, Lighthouse no CI, `error.tsx` de segmento) continua fora.
- **Pasta própria**: como na fatia 2, os `STATE.md` das fatias anteriores estão fechados. O `spec:` do
  frontmatter liga as três pastas.
- **Modo**: rodada autônoma do `/cycle`. Nenhuma pergunta foi feita; as decisões estão em
  [Perguntas em aberto](#perguntas-em-aberto-decididas-por-padrão), cada uma com a alternativa descartada.
- **Medido em**: 2026-11-23, sobre `18288c9`, só leitura. Next `16.4.6`, `@tanstack/react-query` `^5.90.20`,
  `@next/third-parties` `16.4.6`, `firebase` `^11.1.0`.

---

## Etapa 1: análise

### 1. Contexto

A parte 3 da etapa de entrega cobra dois itens que o core hoje não cumpre:

1. **Títulos do painel (3.11).** `docs/delivery/03-product-quality.md:278-279` aprova quando "cada tela do painel
   tem título próprio". O painel tem dois títulos fixos, um por área: `(common)/layout.tsx:24-33` devolve
   "Painel do usuário | Marca" e `admin/layout.tsx:22-31` devolve "Administração | Marca". As doze telas abaixo
   desses layouts herdam esse valor, e nenhuma delas exporta `generateMetadata`. Não existe `title.template` no
   repositório.
2. **Eventos de conversão (3.8).** O passo 4 do item (`03-product-quality.md:220-221`) pede `sign_up` e
   `generate_lead` marcados como eventos principais no GA4, e a gravidade é 🟡 "se não há evento de conversão".
   `sendGAEvent` e `gtag('event')` têm zero ocorrências; o único uso do `gtag` é o `consent update` em
   `packages/analytics/provider.tsx:49-54`.

**Objetivo.** Ao fim da fatia, cada tela do painel mostra o próprio nome na aba nos três idiomas, e o core dispara
`sign_up` e `generate_lead` no GA4 quando, e só quando, o visitante consentiu com a medição. O fork ganha um hook
para registrar os eventos do próprio produto com a mesma regra de consentimento.

**Fora de escopo** (além do "Fora do corte" da spec):

- Título com o nome do registro nas telas de edição ("Editar entidade: Fulano"). Ver Q8.
- `description` nas telas do painel. O painel é `noindex` desde a fatia 1, então descrição não aparece em busca.
- Eventos customizados do Vercel Analytics (Q3), envio pelo servidor (Measurement Protocol, Q1) e qualquer evento
  além dos dois da spec.
- O `packages/auth/components/sign-in.tsx`, que tem botão de Google mas nenhum import no repositório (o `grep` por
  `@repo/auth/components/sign-in` não acha consumidor). Não é caminho de cadastro vivo.

**Corte de MVP desta fatia** (adotado da spec):

- [ ] As 12 telas do painel com título próprio vindo do dicionário, compostas por `title.template` nos dois layouts.
- [ ] `sign_up` disparado uma vez por conta criada, nos três caminhos de cadastro, só com consentimento.
- [ ] `generate_lead` disparado quando a mensagem de contato da landing é aceita pela API, só com consentimento.
- [ ] Hook `useAnalyticsEvent()` no `@repo/analytics`, documentado para o fork.

**Apps impactados**: `packages/analytics` (eventos e provider), `packages/auth` (um helper de leitura do popup),
`apps/app` (títulos, cadastro e Google), `apps/web` (cadastro, Google e contato), `apps/e2e` (asserção de título),
docs. Nenhuma mudança em `packages/sdk`, `apps/api`, `packages/seo` ou `packages/internationalization`.

**Área do painel**: as duas. Títulos nas áreas comum e admin; eventos nas telas sem autenticação.

**Modo de produto**: os dois. No `simple` o usuário comum se cadastra pela landing; no `subscription`, pela app ou
pela landing. Os dois formulários são cobertos.

**Dependências externas e env**: nenhuma variável nova. Os eventos usam o `NEXT_PUBLIC_GA_MEASUREMENT_ID` que já
existe (`packages/analytics/keys.ts:7-13`).

### 1.1 Fontes

| Fonte | Lida | O que tirou |
|-------|------|-------------|
| `specs/delivery-product-quality.md` | sim | corte da fatia 3 (190-194), lacunas de GA (63-65) e de títulos (70-74), `contends_on` revisto (11, 185-188) |
| `specs/BACKLOG.md` | sim | "A próxima" (215-234): os três caminhos de cadastro, o `generate_lead` só no contato, o `G-` obrigatório; D17 a D19 não tocam esta fatia |
| `docs/delivery/03-product-quality.md` | sim | 3.8 (206-224) e 3.11 (266-280) |
| `.claude/cycle-policy.md` | sim | escopo em `apps/*`, modo degradado testado, sem serviço pago, "não confiar no validado" |
| GA4, eventos recomendados (citado pela spec, linha 94-95) | não reaberto | `sign_up` com o parâmetro `method`; `generate_lead` com `currency` e `value` opcionais |
| `@next/third-parties` 16.4.6, `dist/google/ga.js` | sim | `GoogleAnalytics` define `gtag` e chama `config` num `next/script`; `sendGAEvent` só empurra no `dataLayer` |

### 2. Dados (Firestore)

N/A. Nenhuma coleção, campo ou consulta.

### 3. Contrato `@repo/sdk`

N/A. O `GoogleSignInResponse` (`packages/sdk/src/actions/auth/action.ts:37-40`) não muda: a informação de conta
nova vem do popup, no cliente (Q1).

### 4. API (`apps/api`)

N/A. Nenhuma rota muda. Duas leituras sustentam decisões deste plano:

- `apps/api/(shared)/lib/firebase-identity-toolkit.ts:172-174` declara `isNewUser` na resposta do `signInWithIdp`,
  mas a rota `auth/sign-in/google/route.ts:30-33` só chama o Identity Toolkit **depois** de o popup do cliente ter
  criado a conta no Firebase (`apps/app/shared/lib/googleSignInApi.ts:31`). Nesse momento a conta já existe, então
  o `isNewUser` do servidor não serve.
- O link por e-mail não cria conta: `auth-action-links.ts:91-100` devolve `null` para endereço desconhecido.
  O convite manda para `/sign-up` (`InvitationAcceptance.tsx:57`). A criação de usuário pelo admin não é cadastro.

### 5. Front-end

#### 5.1 Títulos do painel

**Como o Next compõe.** `title.template` num layout vale para os segmentos filhos que exportam `title` como
string; quem não exporta herda `title.default`. Os dois layouts passam a devolver:

```ts
title: { default: "<nome da área> | <marca>", template: "%s | <marca>" }
```

O `default` é o título de hoje, então as duas telas iniciais ficam como estão e as outras dez ganham nome próprio.
O formato `%s | <marca>` é o mesmo de `createMetadata` (`packages/seo/metadata.ts:46`), que as telas sem
autenticação já usam.

**De onde vem cada título.** Dos rótulos de rota que a barra lateral e o breadcrumb já mostram
(`(common)/paths.ts:10-67`, `admin/paths.ts:10-39`). Nenhuma chave nova de tradução (Q9).

| # | Tela | Arquivo | Componente | Título (pt-br) | Chave |
|---|------|---------|------------|----------------|-------|
| 1 | `/` | `(common)/(pages)/page.tsx` | server | Painel do usuário \| Marca (default) | `apps.app.pages.navbar.environmentCommon` |
| 2 | `/entities` | `entities/(pages)/(home)/page.tsx` | server | Entidades \| Marca | `common.routes.platform.entities.list` |
| 3 | `/entities/create` | `entities/(pages)/create/page.tsx` | **client** | Nova entidade \| Marca | `common.routes.platform.entities.create` |
| 4 | `/entities/edit/[id]` | `entities/(pages)/edit/[id]/page.tsx` | server | Editar entidade \| Marca | `common.routes.platform.entities.update` |
| 5 | `/organization` | `organization/page.tsx` | server | Equipe \| Marca | `common.routes.platform.organization` |
| 6 | `/account` | `account/(pages)/(home)/page.tsx` | server | Minha conta \| Marca | `common.account.title` |
| 7 | `/playground` | `playground/page.tsx` | **client** | Playground \| Marca | `common.routes.platform.playground` |
| 8 | `/admin` | `admin/(pages)/page.tsx` | server | Administração \| Marca (default) | `apps.app.pages.navbar.environmentAdmin` |
| 9 | `/admin/users` | `users/(pages)/(home)/page.tsx` | server | Usuários \| Marca | `admin.routes.platform.users.list` |
| 10 | `/admin/users/create` | `users/(pages)/create/page.tsx` | **client** | Criar Usuário \| Marca | `admin.routes.platform.users.create` |
| 11 | `/admin/users/edit/[id]` | `users/(pages)/edit/[id]/page.tsx` | **client** | Editar Usuário \| Marca | `admin.routes.platform.users.update` |
| 12 | `/admin/audit` | `audit/(pages)/(home)/page.tsx` | server | Auditoria \| Marca | `admin.routes.platform.audit.list` |

As chaves abreviadas começam em `apps.app.pages.`. As quatro telas marcadas como client têm `"use client"` na
primeira linha e não podem exportar `generateMetadata`; o título delas vai num `layout.tsx` irmão que só repassa
`children` (Q7). O onboarding (`(authenticated)/onboarding/page.tsx:23-30`) fica fora dos dois layouts e já tem
título próprio por `createMetadata`.

**Uma fonte para os títulos.** As escolhas acima ficam num registro, `PANEL_PAGE_TITLES`, em
`apps/app/shared/lib/panelTitles.ts`, chaveado pela rota. Cada página chama `panelPageMetadata("<rota>")`. O
registro é o que o teste confere nos três idiomas e contra as pastas do disco (§7).

#### 5.2 Eventos de conversão: onde cada um dispara

Três caminhos criam conta. O `sign_up` dispara no ponto em que o cliente sabe que **esta** ação criou a conta, e
em nenhum outro:

| Caminho | Arquivo | Ponto do disparo | `method` | Por que não conta em dobro |
|---------|---------|------------------|----------|-----------------------------|
| Formulário da app | `SignUpFormClient.tsx:119-126` | `onSuccess` de `createAccount`, antes do `signIn.mutate` | `email` | a API responde 201 uma vez por conta (`auth/sign-up/route.ts:73-76`); o login que vem depois não dispara |
| Formulário da landing | `sign-up-form-client.tsx:50-57` | `onSuccess` de `createAccount`, antes do `signIn.mutate` | `email` | idem |
| Google na app, tela de cadastro | `SignUpFormClient.tsx:46-59` | `onSuccess` de `googleSignIn`, antes do `router.push`, se `result.isNewUser` | `google` | `isNewUser` só é verdadeiro no popup que criou a conta |
| Google na app, tela de login | `SignInForm.tsx:45-58` | idem | `google` | idem; o primeiro login com Google pode começar pela tela de login |
| Google na landing, cadastro | `sign-up-form-client.tsx:80-82` | `onSuccess` por chamada do `signInWithGoogle.mutate`, se a credencial é de conta nova | `google` | idem |
| Google na landing, login | `sign-in-form-client.tsx:131-137` | idem, junto do `handleSuccessSignIn` que já está ali | `google` | idem |

**Como o cliente sabe que a conta é nova.** O Firebase devolve `getAdditionalUserInfo(credential)?.isNewUser` no
`UserCredential` do popup. Na app, `signInWithGoogleViaApi` passa a devolver `isNewUser` junto da sessão
(`googleSignInApi.ts:14-21`). Na landing, o `signInWithGoogle` do `AuthProvider` já devolve o `UserCredential`
(`packages/auth/provider.tsx:40`, `:374-379`). Os três pontos leem a credencial pelo mesmo helper,
`isNewAccount(credential)`, em `packages/auth/client.ts`, ao lado do `signInWithGoogle` (`:169-173`).

**Por que o evento não pode nascer no `AuthProvider`.** Na landing, o `AuthProvider` envolve o
`AnalyticsProvider` (`apps/web/app/[locale]/layout.tsx:41-42`), então o contexto de analytics não existe lá dentro.
E o pacote de auth passaria a depender do de analytics. O disparo fica nos formulários, que estão abaixo dos dois
provedores nas duas apps (`apps/app/app/layout.tsx:81-96`).

**Ordem em relação à navegação.** Na app e no cadastro por e-mail da landing, o disparo vem antes de qualquer
navegação. No Google da landing, o `onSuccess` do `useMutation` do provedor (`onAuthSuccess`, `provider.tsx:353-366`)
já chamou o `router.push` quando o `onSuccess` por chamada roda. É o mesmo ponto em que o `handleSuccessSignIn` de
hoje grava o token, e a navegação padrão (`/${locale}`) é do lado do cliente, então o documento e o `dataLayer`
continuam. Ver o risco do `?redirect=` para outra origem em §13.

**`generate_lead`.** O formulário de contato da landing é o único formulário de captação
(`useMutation` só aparece em `sign-up-form-client.tsx` e `contact-form-client.tsx` na `apps/web`). Dispara no
`onSuccess` de `sendMessage` (`contact-form-client.tsx:54-62`, que hoje não tem `onSuccess`), sem parâmetros. O
duplo envio já é barrado por `sendingRef` (`:51-70`), então o evento sai uma vez por mensagem aceita. Erro
(`CONTACT_UNAVAILABLE`, `EMAIL_SEND_FAILED`, validação) não dispara.

**Nenhum dado pessoal vai no evento.** `sign_up` leva só `method`; `generate_lead`, nada. E-mail, nome e mensagem
nunca entram nos parâmetros (os termos do GA proíbem PII).

#### 5.3 O helper de eventos e o consentimento

O `AnalyticsProvider` já sabe tudo o que a regra precisa: se há decisão, se ela concedeu a medição
(`provider.tsx:103`) e se há tag do GA (`gaMeasurementId`, `:62`). O helper passa a ser um contexto alimentado por
ele, como o `CookieConsentContext` (`consent-context.tsx:20-25`):

- `useAnalyticsEvent()` devolve `trackEvent(name, params?)`.
- Dentro do provider, `trackEvent` chama `window.gtag("event", name, params)` só quando
  `snapshot.decided && snapshot.analytics && gaMeasurementId`. Qualquer outra combinação não faz nada e não lança.
- Fora do provider (teste, componente montado em outra árvore), o valor padrão do contexto é uma função vazia.
- O estado é o vivo, não o do cookie servido: quem aceita o banner e se cadastra na mesma visita é medido; quem
  recusa depois pelas preferências deixa de ser.

O `window.gtag` existe sempre que o provider monta o script de padrões do Consent Mode
(`consent.ts:87-88`), que roda antes do `GoogleAnalytics`. É o mesmo `gtag` que o `pushConsentUpdate` usa hoje.

#### 5.4 i18n e a11y

- **Nenhuma chave nova.** Os títulos reaproveitam chaves que existem nos três idiomas e que o teste de paridade
  (`packages/internationalization/__tests__/parity.test.ts`) já cobre: `navbar` (`translations/apps/app/pages/navbar/index.ts:4-19`),
  rotas comuns (`pages/common/routes/index.ts`), rotas do admin (`pages/admin/routes/index.ts`) e
  `common.account.title` (`pages/common/account.ts:3`, `:269`, `:538`). O teste da §7 confere, nos três idiomas,
  que nenhum título sai vazio.
- O título da aba é lido pelo leitor de tela ao trocar de página. Telas com títulos diferentes atendem ao critério
  2.4.2 (Page Titled) da WCAG, o que a parte 3 cita em 3.11.
- Os eventos não têm texto de interface.

### 6. Autorização e segurança

- Nenhum guard, rota ou ownership muda. Os títulos vêm só do dicionário e da marca; nenhum dado de usuário vai para
  o `<title>`, nem nas telas de edição (Q8).
- **Consentimento (LGPD).** O evento sai só com `analytics_storage` concedido pelo visitante. Antes da decisão o
  `dataLayer` existe (script de padrões) mas não recebe evento. Mandar o evento com o padrão negado o colocaria na
  fila do `dataLayer`, e o gtag o processaria em modo restrito, o que contraria a spec ("só com consentimento").
- **PII.** Nenhum parâmetro com e-mail, nome, uid ou mensagem.
- **Impersonação.** Não se aplica aos eventos (telas sem autenticação). Os títulos das telas comuns são os mesmos
  quando o admin personifica um usuário; o layout admin redireciona para fora durante a personificação
  (`admin/layout.tsx:43-45`).

### 7. Testes

| Teste | Nível | Prova |
|-------|-------|-------|
| `packages/analytics/__tests__/events.test.ts` (novo) | unitário puro (node) | `sendAnalyticsEvent` chama `gtag("event", name, params)` só com decisão, medição concedida e id do GA; sem decisão, com recusa, sem id ou sem `gtag` não chama nada e não lança; `ANALYTICS_EVENT` tem `sign_up` e `generate_lead` |
| `apps/app/__tests__/analyticsEvents.test.tsx` (novo) | componente (jsdom), como `analyticsConsentProvider.test.tsx` | o hook dentro do `AnalyticsProvider` real: nada antes da decisão; nada com recusa gravada; evento com aceite vindo do cookie; evento depois de "Aceitar tudo" na mesma visita; nada depois de "Recusar tudo"; nada com `consentable: false` (modo degradado); nada e sem erro fora do provider |
| `packages/auth/__tests__/newAccount.test.ts` (novo) | unitário (node, `firebase/auth` mockado) | `isNewAccount` é verdadeiro só quando `getAdditionalUserInfo` devolve `isNewUser: true`; `null` vira falso |
| `apps/app/__tests__/googleSignInApi.test.ts` (ampliado) | unitário | o resultado de `signInWithGoogleViaApi` traz `isNewUser` lido da credencial do popup |
| `apps/app/__tests__/signUpAnalytics.test.tsx` (novo) | componente (jsdom), com `useAnalyticsEvent` mockado | cadastro por e-mail aceito → `sign_up` `{ method: "email" }` uma vez, antes do login; recusado pela API → nada; Google com conta nova → `sign_up` `{ method: "google" }`; Google com conta existente → nada; o mesmo para o Google da `SignInForm`; login por e-mail → nada |
| `apps/web/__tests__/signUpAnalytics.test.tsx` (novo) | mutation capturada, como `signUpFormApi.test.tsx` | cadastro por e-mail → `sign_up` e-mail; erro → nada; Google nas telas de cadastro e de login → `sign_up` google só com conta nova |
| `apps/web/__tests__/contactForm.test.tsx` (ampliado) | mutation capturada | sucesso → `generate_lead` uma vez e sem parâmetros; erro → nada |
| `apps/app/__tests__/panelTitles.test.ts` (novo) | unitário (jsdom do workspace, sem render) | (a) `panelTitleTemplate` monta `default` e `template` com a marca; (b) nos três idiomas, cada entrada de `PANEL_PAGE_TITLES` dá texto não vazio, único dentro da área e diferente do nome da área; (c) as rotas do registro são exatamente as pastas com `page.tsx` sob `(common)/(pages)` e `admin/(pages)`, menos as duas telas iniciais (descoberta no disco, como o `sitemap.test.ts` da fatia 2); (d) o `page.tsx` ou o `layout.tsx` de cada pasta chama `panelPageMetadata` com a própria rota; (e) `panelPageMetadata` devolve o título no idioma do segmento e cai no padrão com idioma inválido |
| `apps/e2e/tests/entityCrud.spec.ts` (ampliado) | E2E (desktop e `mobile`) | `toHaveTitle` em lista, criação e edição de entidade. É o único nível que prova que o Next compôs o `template` do layout com o título da página; o unitário prova só as duas metades |

O item (d) lê o texto do arquivo. É frágil a reformatação, mas a alternativa (importar as 12 páginas no Vitest)
puxa antd, o SDK e os componentes cliente de cada tela. Se o `/review` achar que não compensa, o (c) sozinho já
pega tela nova sem registro.

Nenhum teste novo exige emulador. Os eventos não ganham E2E: a suíte não roda com id do GA, e o que o navegador
acrescentaria (o `dataLayer` de verdade) fica com o `/test`.

### 8. O que o `/test` vai percorrer

A fatia não muda layout, cor nem componente visível. A passada de tema claro/escuro e celular não se aplica; os
títulos precisam dos três idiomas.

**Antes de começar:** os `.env` da `web` e da `app` já têm `NEXT_PUBLIC_GA_MEASUREMENT_ID` preenchido (conferido
pela contagem, sem ler o valor). Para não mandar dado de QA a uma propriedade que pode ser real, bloqueie as
requisições ao Google em cada aba com `agent-browser network route "*googletagmanager.com*" --abort` e o mesmo
para `*google-analytics.com*`. A evidência é o `window.dataLayer`, lido com
`agent-browser eval "JSON.stringify(window.dataLayer.map((entry) => Array.from(entry)))"`.

| # | Verificação | Como | Esperado |
|---|-------------|------|----------|
| V1 | Títulos do painel comum | conta comum, `document.title` nas telas 1 a 7 da §5.1 em `pt-br`, `en` e `es` (a 5 só com membros da organização ligados) | o título da tabela no idioma da rota; 1 com o nome da área; nenhum repetido |
| V2 | Títulos do admin | conta admin, telas 8 a 12 nos três idiomas | idem |
| V3 | Título com personificação | admin personificando um usuário comum, telas 1 e 2 | os mesmos de V1 |
| V4 | `sign_up` por e-mail na app | aceitar o banner, cadastrar `qa-dpq3-app@example.com` em `/pt-br/sign-up` da app. O login automático termina em `window.location.replace` (`SignUpFormClient.tsx:94`), que apaga o `dataLayer`; para ler antes, abortar o login no emulador com `network route "*accounts:signInWithPassword*" --abort` (o cadastro já respondeu 201 e o evento já saiu) | uma entrada `["event","sign_up",{"method":"email"}]`; repetir sem o bloqueio para confirmar que o fluxo completo segue até o painel |
| V5 | `sign_up` por e-mail na landing | idem com `qa-dpq3-web@example.com` em `/pt-br/sign-up` da `web` | idem; a navegação para `/pt-br` é do cliente, então o `dataLayer` segue legível depois |
| V6 | Sem consentimento | aba nova, "Recusar tudo", cadastrar `qa-dpq3-denied@example.com`; aba nova sem decidir, cadastrar `qa-dpq3-undecided@example.com` | nenhum `sign_up` no `dataLayer` nos dois casos; nenhum erro no console |
| V7 | Google no emulador | botão do Google na tela de login da app e na de cadastro da landing, conta nova criada no popup do emulador; depois, login de novo com a mesma conta | `sign_up` `{"method":"google"}` só no primeiro acesso |
| V8 | `generate_lead` | `NEXT_PUBLIC_APP_SUPPORT_EMAIL` com um endereço de teste na `web`, aceitar o banner, simular a resposta da API com `agent-browser network route "*/contact" --body '{"data":{"sent":true}}'`, enviar o formulário; depois o mesmo com a resposta de erro | uma entrada `["event","generate_lead"]` no sucesso; nenhuma no erro |
| V9 | Modo degradado | `pnpm --filter web dev` com `NEXT_PUBLIC_GA_MEASUREMENT_ID=""`, fora da Vercel, cadastrar `qa-dpq3-nogaid@example.com` | sem banner, `window.dataLayer` indefinido, cadastro conclui, nenhum erro no console |
| V10 | Suítes | `pnpm --filter @repo/analytics test`, `--filter @repo/auth test`, `--filter app test`, `--filter web test`, `pnpm --filter e2e e2e tests/entityCrud.spec.ts` (os dois projetos), depois `pnpm test` da raiz | verdes |

**Não verificável sem infra externa (🔒):** ver `sign_up` e `generate_lead` chegarem numa propriedade GA4 real
(Tempo real ou DebugView) e marcá-los como eventos principais. Se o popup do emulador não for dirigível pelo
`agent-browser` em V7, ela também vira 🔒, com os testes unitários de §7 como prova do ramo.

Contas criadas nesta passada: as cinco `qa-dpq3-*@example.com` acima e as contas Google do emulador. Todas no
emulador; o `report.md` lista para limpeza.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Cada tela do painel tem título próprio**
  As dez telas internas do painel (seis comuns e quatro de admin, sem contar as duas telas iniciais) mostram na
  aba o rótulo da tela seguido de " | " e da marca, por exemplo "Entidades | Marca". As duas telas iniciais
  continuam com o nome da área, "Painel do usuário | Marca" e "Administração | Marca". Nenhum par de telas da mesma
  área tem o mesmo título. Nível mais barato: unitário (`panelTitles.test.ts`, itens b e c) para o texto; E2E
  (`toHaveTitle`) para a composição pelo Next; `agent-browser` para as doze telas.

- [ ] **O título acompanha o idioma da rota**
  Em `/en/...` e `/es/...` o título sai do dicionário do idioma do segmento, não do cookie. Idioma inválido cai no
  padrão de `resolveLocale`. Nenhum título fica vazio em nenhum dos três idiomas, e nenhuma chave nova de tradução é
  criada. Nível: unitário (`panelTitles.test.ts`, itens b e e).

- [ ] **O formato segue o das telas sem autenticação**
  O sufixo é " | <marca>", com a marca de `getBrand()`, o mesmo de `createMetadata`. Trocar a marca do fork muda o
  sufixo das doze telas sem mexer em página. Nível: unitário (item a).

- [ ] **Tela nova sem título quebra o teste**
  Criar uma pasta com `page.tsx` sob `(common)/(pages)` ou `admin/(pages)` sem entrada em `PANEL_PAGE_TITLES`, ou
  sem chamar `panelPageMetadata` na página ou num `layout.tsx` irmão, reprova `panelTitles.test.ts`. Entrada no
  registro para uma rota que não existe também reprova. Nível: unitário (itens c e d).

- [ ] **Título não expõe dado de usuário**
  As telas de edição usam o rótulo fixo ("Editar entidade", "Editar Usuário"), sem nome, e-mail ou id do
  registro. Nenhum `generateMetadata` do painel chama a API. Nível: leitura no `/review` e `agent-browser` em
  `/entities/edit/<id>`.

- [ ] **Cadastro por e-mail dispara `sign_up` uma vez**
  Na app e na landing, quando a API responde 201 ao cadastro, o `dataLayer` recebe `sign_up` com
  `method: "email"`, antes do login automático. O login que vem em seguida não dispara outro. Recusa da API
  (`AUTH_EMAIL_EXISTS`, validação, `USERS_PROFILE_CREATE_FAILED`) não dispara nada. O duplo clique já é barrado pelo
  `isPending`, então a conta e o evento saem uma vez. Nível: componente (`signUpAnalytics.test.tsx` das duas apps);
  `agent-browser` em V4 e V5.

- [ ] **Primeiro acesso com Google dispara `sign_up`, os seguintes não**
  Nas quatro telas com botão do Google (cadastro e login, app e landing), o evento sai com `method: "google"`
  quando o popup criou a conta e não sai quando a conta já existia. Começar pelo login não perde o evento. Se a API
  recusar a conta depois do popup (conta arquivada), nada dispara, porque o `onSuccess` não roda. Nível: unitário
  (`newAccount.test.ts`, `googleSignInApi.test.ts`) e componente; `agent-browser` em V7 ou 🔒.

- [ ] **Contato aceito dispara `generate_lead`**
  Quando a API aceita a mensagem do formulário de contato da landing, o `dataLayer` recebe `generate_lead` sem
  parâmetros. `CONTACT_UNAVAILABLE`, `EMAIL_SEND_FAILED` e erro de validação não disparam. Duplo envio continua
  barrado, então sai um evento por mensagem. Sem caixa de suporte configurada o formulário nem aparece. Nível:
  mutation capturada (`contactForm.test.tsx`); `agent-browser` em V8.

- [ ] **Sem consentimento, nenhum evento**
  Com o banner sem resposta, com "Recusar tudo" ou com a medição desligada nas preferências, nenhum `sign_up` ou
  `generate_lead` entra no `dataLayer`. Aceitar e se cadastrar na mesma visita mede; aceitar e depois recusar nas
  preferências deixa de medir a partir dali. Nível: componente (`analyticsEvents.test.tsx`); `agent-browser` em V6.

- [ ] **Sem GA configurado, nada quebra**
  Sem `NEXT_PUBLIC_GA_MEASUREMENT_ID` (ou com valor sem `G-`) e fora da Vercel, o provider não monta banner nem
  script, o hook não faz nada, cadastro e contato funcionam e nenhum erro aparece no console. Na Vercel sem id do
  GA, o banner aparece por causa do Vercel Analytics, mas nenhum evento sai, porque não há tag do GA. Nível:
  componente (`analyticsEvents.test.tsx`, caso `consentable: false`) e unitário (`events.test.ts`, sem id);
  `agent-browser` em V9.

- [ ] **Nenhum dado pessoal no evento**
  `sign_up` leva só `method`; `generate_lead` não leva parâmetro. E-mail, nome, uid e texto da mensagem nunca
  aparecem no `dataLayer`. Nível: as asserções dos testes de componente conferem o objeto inteiro de parâmetros, não
  só o nome.

- [ ] **O fork registra os próprios eventos com a mesma regra**
  `useAnalyticsEvent()` de `@repo/analytics/events-context` devolve `trackEvent(name, params?)`, que obedece ao
  consentimento e ao id do GA como os dois eventos do core. `docs/FORKING.md` §7.4 mostra o uso e manda marcar os
  eventos de conversão como eventos principais no GA4. Nível: componente (`analyticsEvents.test.tsx`); leitura da
  doc no `/review`.

- [ ] **Documentação aponta para o que o core faz**
  `docs/delivery/03-product-quality.md` (3.8 e 3.11) diz que o core já dispara os dois eventos e já titula o painel,
  e como conferir o `dataLayer` localmente. `docs/PRE-PRODUCTION.md` ganha a pendência de marcar os eventos
  principais no GA4. `apps/app/CLAUDE.md` e a skill `new-crud` dizem que tela nova do painel registra o título.
  Nível: leitura no `/review`.

---

## Etapa 2: blueprint técnico

### 10.1 `packages/analytics/events.ts` (novo)

```ts
export const ANALYTICS_EVENT = {
    signUp: "sign_up",
    generateLead: "generate_lead",
} as const;

export type SignUpMethod = "email" | "google";

/** Never personal data: no e-mail, name or id in an event parameter. */
export type AnalyticsEventParams = Record<string, string | number | boolean>;

export type GtagEventCommand = (
    command: "event",
    name: string,
    params?: AnalyticsEventParams
) => void;

export type AnalyticsEventGate = {
    measuring: boolean;
    gaMeasurementId: string | null;
};

export function sendAnalyticsEvent(
    target: { gtag?: GtagEventCommand },
    gate: AnalyticsEventGate,
    name: string,
    params?: AnalyticsEventParams
): void {
    if (!(gate.measuring && gate.gaMeasurementId)) {
        return;
    }
    target.gtag?.("event", name, params);
}
```

O comentário do tipo é regra externa (termos do GA), e a regra de comentários permite. O `/develop` decide se
`sendAnalyticsEvent` devolve `boolean` para o teste; o contrato é o da tabela da §7.

### 10.2 `packages/analytics/events-context.tsx` (novo)

```tsx
"use client";

import { createContext, useContext } from "react";
import type { AnalyticsEventParams } from "./events";

export type TrackAnalyticsEvent = (
    name: string,
    params?: AnalyticsEventParams
) => void;

function ignoreEvent(): void {
    // Outside the provider there is no consent to honour, so nothing is measured.
}

export const AnalyticsEventsContext =
    createContext<TrackAnalyticsEvent>(ignoreEvent);

export function useAnalyticsEvent(): TrackAnalyticsEvent {
    return useContext(AnalyticsEventsContext);
}
```

Segue `consent-context.tsx:11-25`. O pacote não tem `exports` no `package.json`, então
`@repo/analytics/events` e `@repo/analytics/events-context` resolvem direto pelo caminho, como os imports de hoje.

### 10.3 `packages/analytics/provider.tsx`

```diff
+import { AnalyticsEventsContext, type TrackAnalyticsEvent } from "./events-context";
+import { sendAnalyticsEvent, type GtagEventCommand } from "./events";
@@
-type WindowWithGtag = Window & {
-    gtag?: (
-        command: "consent",
-        action: "default" | "update",
-        signals: ConsentSignals
-    ) => void;
-};
+type GtagConsentCommand = (
+    command: "consent",
+    action: "default" | "update",
+    signals: ConsentSignals
+) => void;
+
+type WindowWithGtag = Window & {
+    gtag?: GtagConsentCommand & GtagEventCommand;
+};
@@
     const controls = useMemo<CookieConsentControls>(...);
+
+    const measuring = snapshot.decided && snapshot.analytics;
+    const trackEvent = useCallback<TrackAnalyticsEvent>(
+        (name, params) =>
+            sendAnalyticsEvent(
+                window as WindowWithGtag,
+                { measuring, gaMeasurementId },
+                name,
+                params
+            ),
+        [measuring, gaMeasurementId]
+    );

     if (!consentable) {
         return (
             <CookieConsentContext.Provider value={controls}>
                 {children}
             </CookieConsentContext.Provider>
         );
     }

-    const measuring = snapshot.decided && snapshot.analytics;
-
     return (
         <CookieConsentContext.Provider value={controls}>
-            {children}
+            <AnalyticsEventsContext.Provider value={trackEvent}>
+                {children}
+            </AnalyticsEventsContext.Provider>
             <ConsentModeDefaults script={consentModeDefaults} />
```

`measuring` e o `useCallback` sobem para antes do retorno antecipado por causa da regra dos hooks. No ramo sem
medição o contexto de eventos não é montado e vale o padrão vazio. A interseção de tipos do `gtag` é um detalhe que
o `/develop` pode trocar por sobrecarga, desde que `pushConsentUpdate` continue compilando sem cast novo.

### 10.4 `packages/auth/client.ts`

```diff
 import {
     type Auth,
     connectAuthEmulator,
+    getAdditionalUserInfo,
     GoogleAuthProvider,
@@
+    type UserCredential,
 } from "firebase/auth";
@@
 export const signInWithGoogle = () => { ... };
+
+export const isNewAccount = (credential: UserCredential): boolean =>
+    getAdditionalUserInfo(credential)?.isNewUser === true;
```

### 10.5 `apps/app/shared/lib/googleSignInApi.ts`

```diff
+import { isNewAccount } from "@repo/auth/client";
@@
 export type GoogleApiSignInResult = {
     session: { ... };
     user: AuthMePayload | null;
+    isNewUser: boolean;
 };
@@
-    return { session, user };
+    return { session, user, isNewUser: isNewAccount(result) };
```

`exchangeForApiSession(result)` já recebe o `UserCredential` do popup (`:43-45`). O `getAuthClient` importado de
`@repo/auth/client` hoje passa a dividir o import com `isNewAccount`.

### 10.6 Formulários da app

```diff
// SignUpFormClient.tsx
+import { ANALYTICS_EVENT } from "@repo/analytics/events";
+import { useAnalyticsEvent } from "@repo/analytics/events-context";
@@
+    const trackEvent = useAnalyticsEvent();
+
     const googleSignIn = useMutation({
         mutationFn: signInWithGoogleViaApi,
         onError: ...,
         onSuccess: async (result) => {
+            if (result.isNewUser) {
+                trackEvent(ANALYTICS_EVENT.signUp, { method: "google" });
+            }
             successAlert(...);
@@
     const createAccount = useMutation({
         mutationFn: ...,
         onError: ...,
-        onSuccess: (_created, credentials) =>
-            signIn.mutate(credentials, { onSuccess: requestVerificationEmail }),
+        onSuccess: (_created, credentials) => {
+            trackEvent(ANALYTICS_EVENT.signUp, { method: "email" });
+            signIn.mutate(credentials, { onSuccess: requestVerificationEmail });
+        },
     });
```

`SignInForm.tsx:45-58` recebe o mesmo bloco do Google. O `method` usa o tipo `SignUpMethod` (o `/develop` decide
se o tipa no parâmetro ou num helper `trackSignUp(method)` local; não criar arquivo para isso).

### 10.7 Formulários da landing

```diff
// sign-up-form-client.tsx
+import { ANALYTICS_EVENT } from "@repo/analytics/events";
+import { useAnalyticsEvent } from "@repo/analytics/events-context";
+import { isNewAccount } from "@repo/auth/client";
@@
+    const trackEvent = useAnalyticsEvent();
@@
-        onSuccess: (_created, credentials) =>
-            signIn.mutate(credentials, { onSuccess: requestVerificationEmail }),
+        onSuccess: (_created, credentials) => {
+            trackEvent(ANALYTICS_EVENT.signUp, { method: "email" });
+            signIn.mutate(credentials, { onSuccess: requestVerificationEmail });
+        },
@@
     const handleGoogleSignIn = () => {
-        signInWithGoogle.mutate();
+        signInWithGoogle.mutate(undefined, {
+            onSuccess: (credential) => {
+                if (isNewAccount(credential)) {
+                    trackEvent(ANALYTICS_EVENT.signUp, { method: "google" });
+                }
+            },
+        });
     };

// sign-in-form-client.tsx (botão do Google, :131-137)
                         signInWithGoogle.mutate(undefined, {
-                            onSuccess: handleSuccessSignIn,
+                            onSuccess: (credential) => {
+                                if (isNewAccount(credential)) {
+                                    trackEvent(ANALYTICS_EVENT.signUp, { method: "google" });
+                                }
+                                return handleSuccessSignIn(credential);
+                            },
                         });

// contact-form-client.tsx
     const sendMessage = useMutation({
         mutationFn: ...,
         onError: ...,
+        onSuccess: () => trackEvent(ANALYTICS_EVENT.generateLead),
         onSettled: ...,
     });
```

A `web` importa `@repo/auth/*` pelo alias `@repo` (`apps/web/vitest.config.mts`, e o `tsconfig`), como já faz com
`@repo/auth/provider`. O `client.ts` do auth inicializa o Firebase só quando `getAuthClient` é chamado, então o
import não muda os testes que renderizam os formulários.

### 10.8 Títulos: `apps/app/shared/lib/panelTitles.ts` (novo)

```ts
import type { globalTranslations } from "@repo/internationalization/translations/global";
import { getBrand } from "@repo/next-config/brand";
import type { Metadata } from "next";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export function panelTitleTemplate(
    areaName: string,
    brandName = getBrand().name
): Metadata["title"] {
    return { default: `${areaName} | ${brandName}`, template: `%s | ${brandName}` };
}

export const PANEL_PAGE_TITLES = {
    "/entities": (d: Dictionary) => d.apps.app.pages.common.routes.platform.entities.list,
    "/entities/create": (d: Dictionary) => d.apps.app.pages.common.routes.platform.entities.create,
    "/entities/edit/[id]": (d: Dictionary) => d.apps.app.pages.common.routes.platform.entities.update,
    "/organization": (d: Dictionary) => d.apps.app.pages.common.routes.platform.organization,
    "/account": (d: Dictionary) => d.apps.app.pages.common.account.title,
    "/playground": (d: Dictionary) => d.apps.app.pages.common.routes.platform.playground,
    "/admin/users": (d: Dictionary) => d.apps.app.pages.admin.routes.platform.users.list,
    "/admin/users/create": (d: Dictionary) => d.apps.app.pages.admin.routes.platform.users.create,
    "/admin/users/edit/[id]": (d: Dictionary) => d.apps.app.pages.admin.routes.platform.users.update,
    "/admin/audit": (d: Dictionary) => d.apps.app.pages.admin.routes.platform.audit.list,
} as const;

export type PanelPageRoute = keyof typeof PANEL_PAGE_TITLES;
```

O tipo do dicionário segue `(common)/paths.ts:5`. Nome de variável: o `/develop` troca o `d` do esboço por
`dictionary` (regra 9 do `CLAUDE.md`).

### 10.9 `apps/app/lib/server/panelMetadata.ts` (novo)

```ts
import { getTranslations } from "@repo/internationalization/server";
import { resolveLocale } from "@repo/internationalization/utils";
import type { Metadata } from "next";
import { PANEL_PAGE_TITLES, type PanelPageRoute } from "@/shared/lib/panelTitles";

export function panelPageMetadata(route: PanelPageRoute) {
    return async ({
        params,
    }: {
        params: Promise<{ locale: string }>;
    }): Promise<Metadata> => {
        const { locale } = await params;
        const dictionary = await getTranslations(resolveLocale(locale));
        return { title: PANEL_PAGE_TITLES[route](dictionary) };
    };
}
```

Mesmo caminho de idioma dos layouts de hoje (`(common)/layout.tsx:27-28`).

### 10.10 Layouts e páginas

```diff
// (common)/layout.tsx  (admin/layout.tsx é igual, com environmentAdmin)
-import { getBrand } from "@repo/next-config/brand";
+import { panelTitleTemplate } from "@/shared/lib/panelTitles";
@@
     return {
-        title: `${dictionary.apps.app.pages.navbar.environmentCommon} | ${getBrand().name}`,
+        title: panelTitleTemplate(dictionary.apps.app.pages.navbar.environmentCommon),
     };

// páginas server (6): entities (home), entities/edit/[id], organization, account (home), users (home), audit (home)
+import { panelPageMetadata } from "@/lib/server/panelMetadata";
+
+export const generateMetadata = panelPageMetadata("/entities");
```

Layout irmão para as quatro páginas cliente (`entities/(pages)/create/`, `playground/`, `users/(pages)/create/`,
`users/(pages)/edit/[id]/`):

```tsx
import type { ReactNode } from "react";
import { panelPageMetadata } from "@/lib/server/panelMetadata";

export const generateMetadata = panelPageMetadata("/entities/create");

export default function CreateEntityLayout({
    children,
}: {
    readonly children: ReactNode;
}) {
    return children;
}
```

O `getBrand` sai dos layouts se não sobrar outro uso. A tipagem do `params` de `generateMetadata` aceita a rota
com `[id]`, porque `{ locale, id }` é atribuível a `{ locale }`; o `pnpm --filter app typecheck` e o build
confirmam.

### 10.11 E2E: `apps/e2e/tests/entityCrud.spec.ts`

```diff
+const routesCopy = ptBr.apps.app.pages.common.routes.platform.entities;
+const titled = (label: string) => new RegExp(`^${label} \\| .+`);
@@
     await page.goto(listPath);
     await expect(rowNamed(page, SEEDED_ENTITY_NAME)).toBeVisible();
+    await expect(page).toHaveTitle(titled(routesCopy.list));
@@  depois do toHaveURL de /create
+    await expect(page).toHaveTitle(titled(routesCopy.create));
@@  depois do toHaveURL de /edit
+    await expect(page).toHaveTitle(titled(routesCopy.update));
```

Os três rótulos não têm caractere especial de regex em pt-br. O `toHaveTitle` espera a navegação do cliente
atualizar o título.

### 10.12 Documentação

| Arquivo | Mudança |
|---------|---------|
| `docs/delivery/03-product-quality.md` §3.8 | o core dispara `sign_up` (cadastro por e-mail e primeiro acesso com Google, app e landing) e `generate_lead` (contato aceito), só com consentimento; como conferir o `dataLayer` no navegador antes de ir ao GA4; o passo 4 continua manual |
| `docs/delivery/03-product-quality.md` §3.11 | o painel compõe `"<tela> \| <marca>"` com `title.template`; tela nova registra o título em `PANEL_PAGE_TITLES` |
| `docs/FORKING.md` §7.4 | `useAnalyticsEvent()` com um exemplo de evento do produto; nunca dado pessoal em parâmetro; marcar os eventos de conversão como principais no GA4 |
| `docs/PRE-PRODUCTION.md` | item novo 19 em "Fortemente recomendados": eventos de conversão no GA4, só se o fork usa Google Analytics (ver §11) |
| `apps/app/CLAUDE.md`, seção "Páginas" | tela nova do painel entra em `PANEL_PAGE_TITLES` e exporta `generateMetadata = panelPageMetadata(...)` (num `layout.tsx` irmão quando a página é cliente) |
| `.claude/skills/new-crud/SKILL.md` | o mesmo passo para as telas de lista, criação e edição que a skill gera; sem ele o `panelTitles.test.ts` reprova o CRUD novo |

Tudo passa pelo `humanizer` antes de salvar.

### 10.13 i18n

Nenhuma chave nova (Q9). `pnpm --filter @repo/internationalization test` não muda de resultado.

### 10.14 Ordem de implementação e de commit

Sem SDK, API nem i18n. Ordem por dependência:

1. `feat(auth): tell whether a Google credential created the account` (`client.ts`, `newAccount.test.ts`).
2. `feat(analytics): add consent-aware conversion events` (`events.ts`, `events-context.tsx`, `provider.tsx`,
   `events.test.ts`). O `apps/app/__tests__/analyticsEvents.test.tsx` mora na `app` porque é lá que o provider tem
   jsdom; vai no commit 4, junto do primeiro consumidor, ou neste com o escopo `packages` se o `/review` preferir.
3. `feat(app): give every panel screen its own title` (`panelTitles.ts`, `panelMetadata.ts`, os dois layouts, as
   seis páginas server, os quatro layouts irmãos, `panelTitles.test.ts`).
4. `feat(app): send sign_up on account creation` (`googleSignInApi.ts`, `SignUpFormClient.tsx`, `SignInForm.tsx`,
   `googleSignInApi.test.ts`, `signUpAnalytics.test.tsx`, `analyticsEvents.test.tsx`).
5. `feat(web): send sign_up and generate_lead` (os três formulários, `signUpAnalytics.test.tsx`,
   `contactForm.test.tsx`).
6. `test(e2e): check the entity screens' titles`.
7. `docs: document panel titles and conversion events` (`03-product-quality.md`, `FORKING.md`,
   `PRE-PRODUCTION.md`).
8. `docs(claude): register panel titles in the app rules and new-crud` (`apps/app/CLAUDE.md`, `SKILL.md`).
9. `docs(features): delivery-product-quality-slice-3` (último).

### 10.15 Env nova

Nenhuma. `NEXT_PUBLIC_GA_MEASUREMENT_ID` continua opcional nos projetos `web` e `app`.

---

## 11. Pré-requisitos manuais de infra

O `/develop` não satisfaz nenhum destes, e o `/test` marca 🔒 o que depender deles, sem reprovar:

| Pendência | Quem | O que destrava |
|-----------|------|----------------|
| Propriedade GA4 real com `NEXT_PUBLIC_GA_MEASUREMENT_ID` nos projetos `web` e `app` da Vercel | fork | ver `sign_up` e `generate_lead` chegarem em Tempo real ou no DebugView |
| Marcar `sign_up` e `generate_lead` como eventos principais (key events) na propriedade | fork, no console do GA4 | o passo 4 do item 3.8 da entrega; o GA4 só passa a listar o evento depois de recebê-lo |
| `NEXT_PUBLIC_APP_SUPPORT_EMAIL` e Resend configurados | fork | o formulário de contato aparece e a API aceita a mensagem; sem isso não há `generate_lead` em produção, e o `/test` simula a resposta da API (V8) |

O `/develop` escreve o item 19 do `docs/PRE-PRODUCTION.md` com as duas primeiras linhas e um "como verificar" que
use o `dataLayer` no navegador e o Tempo real do GA4.

**Caminho degradado.** Sem `NEXT_PUBLIC_GA_MEASUREMENT_ID` (ou com valor fora do formato `G-`), o provider não
monta script nem banner fora da Vercel, o hook vira função vazia, cadastro e contato seguem iguais, e nenhum erro
aparece. Na Vercel sem id do GA, o banner aparece por causa do Vercel Analytics e nenhum evento sai. Coberto por
`analyticsEvents.test.tsx` e `events.test.ts`, e medido em V9.

**Máquina do `/test`.** JDK 21 à frente no `PATH` para o emulador (`/opt/homebrew/opt/openjdk@21`, como na fatia 2),
portas 3000 a 3002 livres e `next dev` acionado uma vez por app antes de subir a pilha (o aviso de upgrade do
`next dev` encerra uma execução sim, outra não). Tempo estimado: 25 a 35 min, a maior parte em V1, V2 e V7.

## 12. Sinais de pronto da spec cobertos por esta fatia

- "Rodar a parte 3 da etapa de entrega contra o core termina sem nenhum 🔴": o 3.8 deixa de ser 🟡 por "não há
  evento de conversão" no código. O 🟡 que sobra depende de o fork marcar os eventos principais.
- 3.11 no painel: "cada tela do painel tem título próprio".
- Com a fatia 3, os três itens do corte estão entregues, e a auditoria seguinte (`/spec --sync`) pode arquivar a spec.

## Perguntas em aberto (decididas por padrão)

Nenhuma foi perguntada. Cada uma traz a decisão adotada, a alternativa descartada e o porquê. As marcadas com
**pergunta para o usuário** merecem a sua revisão; as outras seguem o padrão do repo.

**Q1. Onde o `sign_up` dispara.**
Adotado: no cliente, em seis pontos (§5.2): `onSuccess` do cadastro por e-mail nas duas apps e `onSuccess` do Google
nas quatro telas com o botão, filtrado por `isNewUser` do popup. Descartado: (a) na API, pelo Measurement Protocol
(exige `api_secret` novo, e o servidor não conhece a decisão de consentimento do navegador); (b) na primeira visita
ao onboarding (o onboarding pode estar desligado no fork ou ser reaberto, e o evento contaria visita, não conta);
(c) no `AuthProvider` de `packages/auth` (na landing ele fica acima do `AnalyticsProvider`,
`apps/web/app/[locale]/layout.tsx:41-42`, e acoplaria auth a analytics); (d) o `isNewUser` do `signInWithIdp` na
API (chega falso, porque o popup já criou a conta).

**Q2. Como o helper respeita o consentimento.**
Adotado: contexto alimentado pelo `AnalyticsProvider`, com o estado vivo do banner. Descartado: uma função de
módulo que lê o cookie `bp:cookie-consent` a cada chamada. Funcionaria fora do React, mas duplicaria a regra que o
provider já calcula (`provider.tsx:103`) e precisaria descobrir o id do GA por conta própria.

**Q3. Vercel Analytics recebe os eventos?**
Adotado: não, só GA4. Até onde este plano sabe, eventos customizados do Vercel Web Analytics ficam nos planos pagos
da Vercel (a página de preços não foi reaberta nesta rodada), e a política do `/cycle` não adota serviço pago sem
passar pelo relatório. Descartado: chamar o `track` do `@vercel/analytics` junto, o que mexeria em dois destinos
sem um fork que peça o segundo. **Pergunta para o usuário:** algum fork em plano Pro pede isso?
Recomendação: não agora; o hook aceita um segundo destino sem mudar os chamadores.

**Q4. Parâmetros dos eventos.**
Adotado: `sign_up` com `method` (`"email"` ou `"google"`), que o GA4 recomenda; `generate_lead` sem parâmetros.
Descartado: `value` e `currency` no `generate_lead` (o core não tem valor de lead a declarar; o fork pode passar
pelo hook). Dado pessoal está fora em qualquer caso.

**Q5. Onde mora a lógica do título.**
Adotado: em `apps/app` (`shared/lib/panelTitles.ts` e `lib/server/panelMetadata.ts`). A política do `/cycle` põe o
escopo em `apps/*` salvo pacote de integração, e o único consumidor é o painel. Descartado: um
`createTitleTemplate` em `packages/seo/metadata.ts`, que a tabela de impacto da spec cita. A landing não precisa
de template hoje (cada página já usa `buildLocaleMetadata`), e mexer no pacote só criaria contenção com o
`contends_on`. Se a landing precisar, o helper sobe para o pacote com dois consumidores.

**Q6. Formato do título.**
Adotado: `"<tela> | <marca>"`, com `"<área> | <marca>"` nas duas telas iniciais. É o formato de `createMetadata`.
Descartado: `"<tela> | <área> | <marca>"`. Fica longo na aba, e as telas de cada área já têm nomes distintos.
**Pergunta para o usuário:** prefere a área no meio para o admin? Recomendação: não.

**Q7. Título das quatro telas cliente.**
Adotado: `layout.tsx` irmão que só exporta `generateMetadata` e devolve `children`. Descartado: converter cada
página em `page.tsx` server mais um `XClient.tsx` (o padrão das listas). Seria mais idiomático, mas move quatro
arquivos inteiros numa tarefa que só pede título; fica para quando a tela mudar por outro motivo.

**Q8. Título das telas de edição.**
Adotado: rótulo fixo ("Editar entidade"). Descartado: incluir o nome do registro, o que exigiria chamar a API no
`generateMetadata`, tratar personificação e expor dado no histórico do navegador.

**Q9. Chaves de tradução.**
Adotado: reaproveitar os rótulos de rota e o `account.title`, que a barra lateral, o breadcrumb e o `PageHeader`
já mostram. Zero chave nova, e o título da aba sempre bate com o nome que a pessoa vê na tela. Descartado: uma
árvore `meta.title` por tela, como nas telas sem autenticação (doze chaves vezes três idiomas, duplicando texto que
já existe).

**Q10. Dados de QA numa propriedade real.**
Adotado: o `/test` bloqueia `googletagmanager.com` e `google-analytics.com` com `network route --abort` e prova pelo
`dataLayer`. Os `.env` locais têm um id do GA preenchido, que pode ser de uma propriedade real. Descartado: deixar
o evento sair e conferir no Tempo real (polui a propriedade com contas `qa-*`, e quem não tem acesso a ela não mede).

**Q11. Teste que lê o código das páginas.**
Adotado: o item (d) de `panelTitles.test.ts` confere por texto que cada página chama `panelPageMetadata` com a
própria rota. Descartado: importar as doze páginas no Vitest para chamar `generateMetadata` (puxa antd, o SDK e os
componentes cliente de cada tela). O E2E e a passada do `/test` cobrem a ligação de verdade.

**Q12. Helper `isNewAccount` em `@repo/auth/client`.**
Adotado: um helper de uma linha no pacote de integração, usado nos três pontos que leem a credencial (a app e as
duas telas da landing). Descartado: `getAdditionalUserInfo` repetido em cada formulário, que espalharia o detalhe do
Firebase por `apps/web`.

## 13. Riscos

- **Redirect para outra origem depois do Google na landing.** Com `?redirect=` apontando para a app, o
  `router.push` do provedor vira navegação completa antes de o `onSuccess` por chamada disparar o evento. O gtag
  manda com `sendBeacon`, que sobrevive à troca de página na maioria dos navegadores, mas isso não foi medido. A tela
  de cadastro da landing não lê `?redirect=`; só o login lê, e o caso exige primeiro acesso com Google vindo de um
  link com redirect. Fica registrado; não justifica mover o evento para dentro do `AuthProvider` (Q1, c).
- **Aceitar o banner e enviar no mesmo instante.** O `GoogleAnalytics` injeta o `gtag('config')` num `next/script`
  `afterInteractive`. Um evento empurrado antes desse script rodar fica na fila à frente do `config`. Na prática o
  visitante aceita o banner e só depois preenche o formulário; o `/test` não mede esse caso.
- **Conta criada pelo popup e recusada pela troca de sessão.** Se o popup cria a conta e a API ou o cookie de sessão
  falham (`googleSignInApi.ts:35-40`), a próxima tentativa já não é conta nova, e o `sign_up` daquela conta se perde.
  É raro e conta a menos, nunca a mais.
- **Teste por texto (Q11).** Reformatar a chamada `panelPageMetadata("<rota>")` em várias linhas pode quebrar o
  item (d) sem defeito real. A mensagem do teste deve dizer o que procurou.
- **Biome e o hook de format.** O hook de format remove import que fica sem uso entre duas edições; o `/develop`
  adiciona o uso antes do import ou recoloca o import depois.
