# Plano: canal de contato e suporte que entrega a mensagem

- **Spec:** [`specs/contact-support-channel.md`](../../../../specs/contact-support-channel.md), corte de MVP inteiro.
- **Decisão do usuário já tomada:** D7, a mensagem vai para `NEXT_PUBLIC_APP_SUPPORT_EMAIL`, sem variável nova.
- **Rodada:** autônoma (`/cycle`), 2026-10-19, HEAD `44b2b04`. Ninguém foi consultado. Cada decisão não
  trivial está em "Perguntas em aberto", com a opção adotada, a descartada e o motivo.
- **Branch:** nenhuma. Quem cria é o `/review`.

## Resumo

O formulário de `/contact` da landing passa a pedir nome, e-mail e mensagem e a enviar pelo SDK para uma rota
pública nova, `POST /contact`, na API. A rota valida com Zod, entra na lista de rate limit do proxy e manda o
template `contact`, que já existe, para a caixa de suporte (`getBrand().supportEmail`), com o e-mail do
visitante no `replyTo`. A server action antiga, que mandaria a mensagem para o próprio remetente
(`RESEND_FROM`), sai junto com o teste dela, e `ownerInbox()` vira `supportInbox()`.

Sem caixa de suporte definida, a página mostra "canal indisponível" no lugar do formulário. Sem Resend na API,
a rota responde `503 CONTACT_UNAVAILABLE` e o formulário mostra esse aviso traduzido sem limpar o que a pessoa
escreveu. Em nenhum caso a tela diz que enviou sem ter enviado.

Na app, o menu do perfil ganha "Ajuda e contato", que abre a `/contact` da landing numa aba nova. O e-mail vem
preenchido pela sessão compartilhada entre os apps: a landing já adota a sessão do painel pelo cookie, então
`useAuth().user.email` está disponível lá. Nada de e-mail na URL.

Nenhuma dependência nova, nenhuma variável de ambiente nova, nenhuma coleção no Firestore.

## Fontes lidas

| Fonte | O que dela entra no plano |
|---|---|
| `specs/contact-support-channel.md` | Corte de MVP, D7, recomendação "página da landing com e-mail preenchido" |
| `.claude/cycle-policy.md` | String vazia é ausência; modo degradado testado; zero dependência; mudanças mínimas |
| `docs/feature-analysis-guide.md` | Roteiro das seções e formato §9.1 dos critérios |
| `docs/AUTH-SSO.md` | Cookie de sessão compartilhado + bootstrap por custom token (decide o preenchimento) |
| `docs/SECURITY.md:157-168` | Lista de caminhos com rate limit e o no-op sem `ARCJET_KEY` |
| `docs/PRE-PRODUCTION.md` §3, §8, §13 | Resend, `ARCJET_KEY`, marca do produto |
| `docs/ROPA.md` §5 | Registro de tratamento "Formulário de contato da landing", que aponta para a action morta |

Nenhuma referência externa ficou sem leitura.

---

# Etapa 1: análise

## 1. Contexto

**Em uma frase:** quem escreve pela landing ou pede ajuda na app tem a mensagem entregue na caixa de suporte do
fork, com o e-mail de quem escreveu pronto para resposta.

**Estado medido:**

- `apps/web/app/[locale]/contact/components/contact-form-client.tsx:64-111`: campos data, nome, sobrenome e
  arquivo, sem `<form>`; o `Button` (`:105`) não tem `onClick` nem `type="submit"`.
- `apps/web/app/[locale]/contact/actions/contact.tsx:7-25`: server action sem importador que envia
  `contactEmail` para `ownerInbox()`. Viola a regra de ouro 1 (o front fala com a API pelo SDK) e manda para o
  endereço errado.
- `packages/email/index.ts:81-82`: `ownerInbox()` devolve `RESEND_FROM`. Único chamador de produção é a action
  acima; o teste é `packages/email/__tests__/credentials.test.ts:136-152`.
- `packages/next-config/brand.ts:38-41,57`: `supportEmail` já valida formato e devolve `null` para vazio ou
  inválido. Declarada nos três `.env.example` (`apps/api/.env.example:99`, `apps/web/.env.example:60`,
  `apps/app/.env.example:87`).
- `packages/email/templates/contact.tsx:22-69`: template pronto, com rodapé próprio ("você recebeu porque este é
  o endereço de contato de {brand}").
- Consumidores de `/contact`: `apps/web/shared/lib/privacyContact.ts:14-18`, `pricing/page.tsx:73-76`,
  `(home)/components/hero.tsx:36`, `cta.tsx:29`, `faq.tsx:44`, `sitemap.ts:13`. Nenhum muda de destino.
- `apps/app/shared/components/ui/ProfileDropdown.tsx:61-85`: "Minha conta", "Cookies" (condicional) e "Sair".
  O componente só é montado pela `Navbar` do layout `(common)` (`(common)/layout.tsx:61`); o admin não o vê.

**Objetivos:** os cinco itens do corte da spec.

**Fora de escopo** (da spec, sem rediscussão): guardar mensagens no Firestore, e-mail de confirmação ao
visitante, anexo de arquivo, CAPTCHA de terceiro, widget de chat.

**Também fora, por mudança mínima** (registrado em "Achados adjacentes"): tirar `@repo/email` e `RESEND_*` da
`apps/web`; reescrever os textos de marketing da página ("responde em até 24 horas"); o título fixo
"Contato - Next Boilerplate" em `meta.title`.

**Corte de MVP:** é o da spec. Nada a cortar: cada item é pequeno e um depende do outro para o canal funcionar.

**Apps impactados:** `packages/shared` (limites), `packages/email`, `packages/sdk`, `apps/api`, `apps/web`,
`apps/app`, `packages/internationalization`, `packages/next-config` (só comentário), docs.

**Área do painel:** comum. O item novo fica no `ProfileDropdown`, que só aparece no layout comum, inclusive
quando um admin está personificando alguém.

**Modo de produto:** igual em `subscription` e `simple`. A rota e a página são públicas; o item de menu segue o
layout comum.

**Assinatura/plano:** não depende.

**Dependências externas:** Resend (já existente) e Arcjet (já existente). Nenhuma env nova.

**Genérico × específico:** genérico. Todo produto precisa de um canal de contato que funcione.

## 2. Decisão central: como o usuário logado chega com o e-mail preenchido

A spec recomenda a página da landing e pede para medir se o SSO atrapalha. Medido:

- A app monta URL para a landing com `env.NEXT_PUBLIC_WEB_URL` + `/${locale}/...` e devolve `null` sem a
  variável (`apps/app/shared/lib/privacyPolicyUrl.ts:7-10`); o link abre em aba nova
  (`AccountPrivacyPanel.tsx:187-198`).
- A landing tem `AuthProvider` no layout (`apps/web/app/[locale]/layout.tsx:37`). Ao abrir com o cookie
  compartilhado e sem sessão de client, o provider chama `POST /api/auth/custom-token` e faz
  `signInWithCustomToken` (`packages/auth/provider.tsx:184-205`). Depois disso `useAuth().user` é o `User` do
  Firebase, com `email`. O formulário de cadastro da web já lê `useAuth()` (`sign-up-form-client.tsx:32`).

**Adotado:** a landing preenche o campo com `useAuth().user?.email` quando ele chega e o campo ainda está vazio.
A app só abre o link, sem parâmetro.

**Descartado:** `?email=` na URL. O GA da landing (`packages/analytics/provider.tsx:111`, `GoogleAnalytics` do
`@next/third-parties`) manda `page_location` com a query string no `page_view`, ou seja, o e-mail da pessoa iria
para o Google sempre que houver consentimento. Ficaria também no log de acesso da Vercel e no histórico do
navegador. A política de privacidade de log do repo (`packages/email/index.ts:40`,
`packages/shared/utils/helpers/log.ts:17-20`) não admite isso.

**Quando o preenchimento não acontece:** forks em domínios registráveis diferentes (sem cookie compartilhado,
`AUTH-SSO.md`, "Fallback") e previews `*.vercel.app`. O campo fica vazio e a pessoa digita. É degradação
aceitável: o canal continua funcionando.

**Personificação:** o cookie compartilhado é do admin, então a landing preenche o e-mail do próprio admin, que é
quem está escrevendo. Comportamento correto; vira critério de aceite.

## 3. Dados (Firestore)

N/A. A mensagem não é gravada (fora do corte). Sem coleção, campo, índice ou regra.

## 4. Contrato `@repo/sdk`

Recurso novo `contact`, sem contexto (`common`/`admin` não se aplica: a rota é pública).

- Tipos em `packages/sdk/src/types/contact/contact.ts` + `index.ts`, exportados por
  `packages/sdk/src/types/index.ts`.
- Action `packages/sdk/src/actions/contact/action.ts` com `send(body)`, registrada como `contact` em
  `packages/sdk/src/client/index.ts`.
- Nada existente quebra: é acréscimo. `rg ownerInbox` mostra que o único uso fora do pacote de e-mail é a action
  que sai.

## 5. API (`apps/api`)

### 5.1 Rota

`POST /contact`, arquivo `apps/api/app/(routes)/contact/route.ts`. Sem guard, como
`auth/password/reset-request/route.ts:52`. `export async function POST` segue o padrão das rotas públicas (o
`guard(...)` do guia vale para rotas autenticadas).

Ordem do handler:

1. **Disponibilidade, antes de ler o corpo:** `isEmailEnabled() && supportInbox()`; senão
   `503 CONTACT_UNAVAILABLE`. Mesma ordem de `reset-request/route.ts:56-61`: a resposta depende só da
   configuração do fork.
2. `parseRequestJson(req)` → `400 VALIDATION_FAILED` para JSON inválido.
3. `parseContactMessage(body)` → `400 VALIDATION_FAILED`.
4. `sendEmail({ template: contactEmail, to: inbox, replyTo: email, locale, data: { name, email, message } })`,
   **síncrono** (não `after()`): aqui não há enumeração de conta a esconder, e a pessoa precisa saber se a
   mensagem saiu.
5. Resultado: `sent: true` → `200 { data: { sent: true } }`; `not-configured` ou `invalid-recipient` →
   `503 CONTACT_UNAVAILABLE`; `provider-error` → `503 EMAIL_SEND_FAILED`.

A rota não loga nada próprio. `sendEmail` já registra `[email] failed template=contact reason=…` sem
destinatário (`packages/email/index.ts:40-50`).

### 5.2 Validação

`apps/api/(shared)/validation/contact.schema.ts`, no formato de `auth.schema.ts:60-76`:

- `name`: `trim`, `min(1)`, `max(CONTACT_NAME_MAX_LENGTH)` (120).
- `email`: `trim`, `max(320)`, `email()`. O `email()` do Zod recusa CR/LF, então o `replyTo` não abre injeção de
  cabeçalho.
- `message`: `trim`, `min(1)`, `max(CONTACT_MESSAGE_MAX_LENGTH)` (5000).
- `locale`: `z.enum(locales).optional()`, como `auth.schema.ts:14,19`.

Os dois limites ficam em `packages/shared/utils/helpers/contactMessage.ts`, no molde de `passwordPolicy.ts`,
para a landing validar com os mesmos números.

O assunto do e-mail é fixo (`copy.contact.subject`) e nome e mensagem entram como texto React, que escapa HTML.

### 5.3 Destino

`packages/email/index.ts`: `ownerInbox()` sai e entra `supportInbox()`, que devolve `getBrand().supportEmail`
(`@repo/next-config` já é dependência do pacote, `packages/email/package.json:13`). O nome muda de propósito:
quem chamava `ownerInbox` num fork quebra no typecheck em vez de passar a mandar para outro endereço sem aviso.

### 5.4 Rate limit

`"/contact"` entra em `RATE_LIMITED_PATHS` (`apps/api/proxy.ts:49-62`) e o comentário acima da lista ganha uma
frase sobre ela. Usa o orçamento existente, 20 requisições por 60 s por IP (`packages/security/index.ts:11-17`),
com `429 AUTH_RATE_LIMITED` + `Retry-After` vindos do proxy (`proxy.ts:113-124`). O IP contado é o do visitante
porque a chamada sai do navegador, não do servidor da landing (o problema que tirou `/payments/catalog` da lista,
`proxy.ts:43-45`, não se aplica).

### 5.5 Códigos de erro

| `error.code` | Status | Quando | Novo? |
|---|---|---|---|
| `CONTACT_UNAVAILABLE` | 503 | Sem Resend ou sem caixa de suporte na API | **novo** |
| `VALIDATION_FAILED` | 400 | JSON inválido, campo vazio, longo demais, e-mail ou locale inválidos | existente |
| `EMAIL_SEND_FAILED` | 503 | Resend recusou ou falhou | existente (`account/email/route.ts:30`) |
| `AUTH_RATE_LIMITED` | 429 | Orçamento do IP estourado (só com `ARCJET_KEY`) | existente |
| `AUTH_FORBIDDEN_ORIGIN` | 403 | Origem fora de `CORS_ORIGIN` | existente |

`CONTACT_UNAVAILABLE` entra em `apiErrors` nos três idiomas. O `EMAIL_NOT_CONFIGURED` existente não serve: o
texto dele termina em "Fale com o suporte" (`translations/packages/shared/utils.ts:111-112`), que é justamente o
canal quebrado.

### 5.6 Modo degradado

| Configuração | API | Landing |
|---|---|---|
| Sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL` (vazia, ausente ou inválida) | `503 CONTACT_UNAVAILABLE` | Aviso de canal indisponível no lugar do formulário |
| Caixa definida, sem `RESEND_TOKEN`/`RESEND_FROM` na API | `503 CONTACT_UNAVAILABLE` | Formulário visível; ao enviar, toast com o texto de `CONTACT_UNAVAILABLE`, campos preservados |
| Sem `ARCJET_KEY` | Sem limite (no-op, aviso no boot) | Igual |
| App sem `NEXT_PUBLIC_WEB_URL` | n/a | Item "Ajuda e contato" não aparece |

Nenhum caso devolve 500 nem impede a app de subir.

## 6. Front

### 6.1 Landing (`apps/web`)

Arquivos:

```
apps/web/app/[locale]/contact/
  page.tsx                          (editado: calcula available e repassa)
  components/contact-form.tsx       (editado: repassa available)
  components/contact-form-client.tsx (reescrito)
  validations/contact.ts            (novo: buildContactFormSchema)
  actions/contact.tsx               (removido)
```

- `page.tsx` (Server Component) calcula `available = getBrand().supportEmail !== null` e passa para
  `ContactForm`. A landing lê a mesma variável que a API (declarada em `apps/web/.env.example:60`); se as duas
  divergirem, a API decide no envio.
- `contact-form-client.tsx` mantém o layout de duas colunas e os benefícios (`:16-54`). A coluna do formulário
  passa a ter três estados:
  - `available === false` → bloco de aviso (`hero.unavailable.title` + `description`), sem `<form>`;
  - enviado → bloco de confirmação com `role="status"` (`hero.sent.title` + `description`);
  - padrão → `<Form>` + `<form onSubmit>` com `HookFormInput` (nome), `HookFormInput type="email"` (e-mail),
    `HookFormTextarea` (mensagem) e `Button type="submit"` com `loading`/`disabled` em `isPending`.
- Mutation: `useMutation` com `apiClient.contact.send({ ...values, locale })`, `onError` →
  `errorAlert(handleClientError(new FormattedError(error, locale)))`, como `sign-up-form-client.tsx:34-40`. Os
  campos não são limpos no erro.
- Preenchimento: `useEffect` sobre `user?.email`; se `form.getValues("email")` estiver vazio, faz `setValue`.
  Não sobrescreve o que a pessoa digitou e funciona com o bootstrap assíncrono do provider.
- O título da coluna esquerda vira `h1` (hoje `h4`, `:22`; a página não tem nenhum `h1`, conferido no header).
  Mesmas classes. O arquivo é reescrito de qualquer forma.
- Sem `queryKeys`: é uma mutation isolada, sem cache para invalidar.

`validations/contact.ts`: `buildContactFormSchema(dictionary)` no molde de `sign-up/validations/signUp.ts:7-24`,
com mensagens de `dictionary.apps.web.pages.contact.validation` e os limites de `contactMessage.ts`.

`privacyContact.ts:5-9`: o JSDoc passa a dizer que o fallback é o formulário de contato, que entrega na caixa de
suporte quando ela e o Resend estão configurados e avisa que está indisponível quando não estão.

### 6.2 App (`apps/app`)

- `apps/app/shared/lib/contactPageUrl.ts` (novo), irmão de `privacyPolicyUrl.ts`:
  `env.NEXT_PUBLIC_WEB_URL ? \`${env.NEXT_PUBLIC_WEB_URL}/${locale}/contact\` : null`.
- `ProfileDropdown.tsx`: entre "Minha conta" e "Cookies", quando a URL existe,
  `<DropdownMenuItem asChild><a href target="_blank" rel="noreferrer">` com `LifeBuoyIcon` e
  `profileDropdown.helpAndContact`.

### 6.3 i18n

| Caminho | Mudança |
|---|---|
| `translations/apps/web/pages/contact/contact.ts` | `hero.form`: remove `date`, `firstName`, `lastName`, `resume`; acrescenta `name`, `namePlaceholder`, `email`, `emailPlaceholder`, `message`, `messagePlaceholder`; `title` e `cta` ganham texto novo. Novos `hero.sent.{title,description}`, `hero.unavailable.{title,description}`, `validation.{nameRequired,nameTooLong,emailInvalid,messageRequired,messageTooLong}` |
| `translations/apps/app/shared/index.ts` | `profileDropdown.helpAndContact` |
| `translations/packages/shared/utils.ts` | `apiErrors.CONTACT_UNAVAILABLE` |

`rg "form\.(date|firstName|lastName|resume)"` só encontra o arquivo que é reescrito.

## 7. Autorização e segurança

- Rota pública por natureza. A proteção é validação na borda, rate limit no proxy e destino fixo do lado do
  servidor: o cliente não escolhe para quem o e-mail vai, então a rota não serve para mandar e-mail a terceiros.
  Por isso o e-mail de confirmação ao visitante continua fora (spec).
- Sem `ARCJET_KEY`, qualquer um pode encher a caixa de suporte. O destino é só a caixa do fork, mas cada envio
  conta na cota do Resend. Isso entra no `PRE-PRODUCTION.md` §8.
- PII: a rota não loga corpo nem endereço; `sendEmail` já loga sem destinatário; o e-mail do usuário logado não
  passa pela URL (seção 2).
- `Authorization` presente (usuário logado na landing) é ignorado pela rota. O e-mail do campo é editável e não é
  conferido contra a sessão: a pessoa pode querer resposta em outro endereço.
- Personificação: a rota não resolve ator, então o modo somente leitura da personificação não a afeta.
- CORS: a landing já chama a API do navegador (cadastro); nada muda em `CORS_ORIGIN`.

## 8. Testes

Nível mais barato que prova cada comportamento. Nenhum precisa de emulador nem de app de pé.

| Arquivo | Nível | Prova |
|---|---|---|
| `apps/api/__tests__/contactRoute.test.ts` (novo) | Rota com `vi.mock` de `@repo/email` (`sendEmail`, `isEmailEnabled`, `supportInbox`) e do template | 503 sem Resend e sem caixa, sem chamar `sendEmail` e sem ler o corpo; 400 para JSON inválido, nome/mensagem vazios ou só espaços, e-mail inválido, locale fora da lista, nome com 121 e mensagem com 5001; 200 nos limites exatos (120/5000); `to` = caixa, `replyTo` = e-mail do visitante, dados aparados, `locale` repassado; `provider-error` → 503 `EMAIL_SEND_FAILED`; `not-configured` e `invalid-recipient` → 503 `CONTACT_UNAVAILABLE`; nenhum `console.warn` com o e-mail ou a mensagem |
| `apps/api/__tests__/corsOrigin.test.ts` (editado) | Proxy com `checkRateLimit` mockado | `/contact` é contado; `/contact/` e `/contact/x` não (igualdade exata); estouro → 429 `AUTH_RATE_LIMITED` |
| `packages/email/__tests__/credentials.test.ts` (editado) | Unit | O bloco `ownerInbox` vira `supportInbox`: devolve a env válida, `null` para `""`, ausente ou inválida |
| `packages/sdk/__tests__/contactAction.test.ts` (novo) | Unit com `request` mockado | `POST /contact` com o corpo e devolve `data.data` |
| `apps/web/__tests__/contactFormSchema.test.ts` (novo) | Schema com o dicionário real | Mensagens nos 3 idiomas; limites iguais aos da API |
| `apps/web/__tests__/contactForm.test.tsx` (novo) | `renderToString` + mutation capturada, como `signUpFormApi.test.tsx` | `available=false` renderiza o aviso e nenhum `<form>`; `available=true` tem nome/e-mail/mensagem e nenhum campo de data ou arquivo; payload com `locale`; `onError` chama `errorAlert` com o texto do código |
| `apps/web/__tests__/contactFormPrefill.test.tsx` (novo) | jsdom no arquivo, como `headerMobileMenu.test.tsx` | E-mail preenchido quando `useAuth().user` chega; não sobrescreve o que foi digitado; sucesso troca o formulário pela confirmação |
| `apps/app/__tests__/profileDropdownHelpLink.test.tsx` (novo) | Componente, como `profileDropdownCookieConsent.test.tsx` | Item com `href` da landing no idioma, `target="_blank"`; some quando `contactPageUrl` devolve `null` |

**Testes removidos, com motivo:**

- `apps/web/__tests__/contactAction.test.ts`: testa a server action que sai. O que ele cobria (destino,
  `replyTo`, locale) passa a ser coberto pelo teste da rota, agora com o destino certo.
- `apps/web/__tests__/contactFormDateLocale.test.tsx`: testa o `DateInput` deste formulário, que deixa de existir.
  O locale do `DateInput` segue coberto em `apps/app/__tests__/entityBirthdateField.test.tsx` e
  `auditFiltersDateInput.test.tsx`.

Nenhum dos dois é afrouxado para passar: o assunto deles some do código.

## 9. O que o `/test` percorre

Uma passada, light + dark + mobile (375 px), em pt-br, en e es.

| # | Fluxo | Como produzir o estado | Esperado |
|---|---|---|---|
| T1 | `/<locale>/contact` sem caixa | `NEXT_PUBLIC_APP_SUPPORT_EMAIL=""` na web | Aviso de indisponível traduzido; nenhum campo; `h1` presente |
| T2 | Formulário com caixa definida | Caixa definida na web e na API, `RESEND_*` vazias na API | Três campos; nenhum campo de data/arquivo |
| T3 | Envio vazio | Clicar "Enviar" sem preencher | Três mensagens de validação no idioma; nenhuma requisição |
| T4 | Limites | 121 caracteres no nome, 5001 na mensagem, e-mail sem `@` | Mensagens traduzidas; nenhuma requisição |
| T5 | Envio sem Resend | Formulário válido (estado T2) | Uma requisição `POST {API}/contact` (não server action), 503 `CONTACT_UNAVAILABLE`, toast traduzido, campos preservados |
| T6 | Duplo clique | Dois cliques rápidos no estado T5 | Uma requisição; botão ocupado durante o envio |
| T7 | Falha do provedor | `RESEND_TOKEN=re_qa_fake` e `RESEND_FROM` válido na API | 503 `EMAIL_SEND_FAILED`, toast traduzido, campos preservados |
| T8 | Ajuda e contato | Login no app (emulador), menu do perfil | Item traduzido; abre `{WEB}/<locale>/contact` em aba nova; e-mail da conta preenchido; URL sem e-mail |
| T9 | Item ausente | App sem `NEXT_PUBLIC_WEB_URL` | Menu sem o item |
| T10 | Personificando | Admin personificando um usuário comum | Item presente; e-mail preenchido é o do admin |
| T11 | Caminhos existentes | Card "Enterprise" de `/pricing`, link de privacidade em `/legal/privacy` sem `NEXT_PUBLIC_PRIVACY_CONTACT`, CTAs da home | Todos chegam em `/<locale>/contact` |

**Não observável sem infra externa (vira 🔒):** entrega real na caixa (Resend com domínio verificado), estado de
confirmação no browser (só aparece com envio aceito; provado em teste de componente), e 429 por IP (precisa de
`ARCJET_KEY` válida; provado no teste do proxy).

**Dados de QA:** conta `qa-contact-support@example.com` no emulador, para listar na limpeza.

## 10. Critérios que fecham só com infra real (🔒)

- Mensagem enviada em `/es/contact` chega à caixa de suporte com o e-mail do visitante no "responder para".
- Com `ARCJET_KEY` válida, envios acima de 20 por minuto do mesmo IP recebem `429 AUTH_RATE_LIMITED` traduzido.
- Preenchimento do e-mail em produção, com `SESSION_COOKIE_DOMAIN` apontando para o domínio registrável comum.

## 11. Pré-requisitos manuais de infra

O `/develop` não satisfaz nenhum destes, e o `/test` não reprova por eles (vira 🔒). Todos já são passo do fork;
esta entrega só acrescenta o canal de contato à justificativa de cada um no `PRE-PRODUCTION.md`.

- [ ] `RESEND_TOKEN` e `RESEND_FROM` com domínio verificado no projeto `api` (`PRE-PRODUCTION.md` §3).
- [ ] `NEXT_PUBLIC_APP_SUPPORT_EMAIL` no projeto `api` (destino) e `web` (decide se o formulário aparece), e no
      `app` por simetria, seguida de deploy novo de cada um, porque é `NEXT_PUBLIC_*` (§13).
- [ ] Caixa de suporte monitorada por alguém. O core não guarda cópia: mensagem ignorada na caixa é mensagem
      perdida.
- [ ] `ARCJET_KEY` com prefixo `ajkey_` no projeto `api` (§8). Sem ela, `/contact` não tem limite.
- [ ] `NEXT_PUBLIC_WEB_URL` no projeto `app`, para o item "Ajuda e contato" aparecer.
- [ ] `SESSION_COOKIE_DOMAIN` com o domínio registrável comum à landing e ao app, para o e-mail vir preenchido
      (`AUTH-SSO.md`). Sem ela o canal funciona e o campo vem vazio.
- [ ] `CORS_ORIGIN` da API incluindo a origem da landing (§5; já exigido pelo cadastro).

## 12. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Formulário de contato com nome, e-mail e mensagem**
  Com a caixa de suporte definida, `/pt-br/contact`, `/en/contact` e `/es/contact` mostram um formulário com
  nome, e-mail e mensagem, rótulos e placeholders no idioma da URL. Os campos de data, sobrenome e currículo não
  existem mais. O botão é `type="submit"` dentro de um `<form>`, então Enter no campo de nome também envia.

- [ ] **Validação no navegador nos três idiomas**
  Enviar com os três campos vazios, ou só com espaços, mostra uma mensagem por campo no idioma da página e não
  dispara requisição. Nome com 121 caracteres, mensagem com 5001 e e-mail sem `@` também são recusados com
  mensagem traduzida; nome com 120 e mensagem com 5000 passam. Os limites vêm de `contactMessage.ts`, os mesmos
  da API.

- [ ] **Validação na borda da API**
  `POST /contact` com JSON inválido, campo ausente, campo só com espaços, e-mail inválido, `locale` fora de
  `pt-br`/`en`/`es`, nome acima de 120 ou mensagem acima de 5000 responde `400 { error: { code:
  "VALIDATION_FAILED" } }` sem chamar o provedor. A validação vale para quem chama a API sem passar pela landing.

- [ ] **Entrega na caixa de suporte com resposta ao visitante**
  Com Resend e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` configurados na API, o envio chama o template `contact` com `to`
  igual à caixa de suporte, `replyTo` igual ao e-mail digitado, nome, e-mail e mensagem aparados e o `locale` da
  página, e responde `200 { data: { sent: true } }`. O remetente `RESEND_FROM` nunca é o destino. Provado no
  teste da rota; a entrega real é 🔒.

- [ ] **Confirmação depois do envio**
  Quando a API aceita a mensagem, o formulário é substituído por um bloco de confirmação traduzido, anunciado
  como `role="status"`. Não há como reenviar a mesma mensagem com um segundo clique. Provado em teste de
  componente; no browser é 🔒 porque depende de envio aceito pelo Resend.

- [ ] **Canal indisponível sem caixa de suporte**
  Com `NEXT_PUBLIC_APP_SUPPORT_EMAIL` vazia, ausente ou com valor inválido, a página mostra o aviso de canal
  indisponível nos três idiomas no lugar do formulário, e a API responde `503 CONTACT_UNAVAILABLE` sem ler o
  corpo. A página não quebra, o build passa e nada sugere que algo foi enviado.

- [ ] **Canal indisponível sem Resend**
  Com a caixa definida e `RESEND_TOKEN` ou `RESEND_FROM` vazias na API, o envio responde `503
  CONTACT_UNAVAILABLE` e a landing mostra o texto traduzido desse código. O que a pessoa escreveu continua nos
  campos, para ela copiar ou tentar depois. Nenhum caminho responde 500.

- [ ] **Falha do provedor**
  Se o Resend recusar ou falhar, a API responde `503 EMAIL_SEND_FAILED`, a landing mostra o texto traduzido e
  preserva os campos. O log tem uma linha `[email] failed template=contact reason=provider-error` sem o endereço
  nem a mensagem do visitante.

- [ ] **Envio duplo**
  Dois cliques rápidos em "Enviar" geram uma requisição só: o botão fica ocupado e desabilitado enquanto a
  mutation está pendente.

- [ ] **Rate limit na rota pública**
  `/contact` está na lista do proxy, casada por igualdade (`/contact/` e `/contact/x` não contam). Com
  `ARCJET_KEY` válida, o 21º envio do mesmo IP no minuto recebe `429 AUTH_RATE_LIMITED` com `Retry-After` e o
  texto traduzido. Sem a chave, o limite é no-op e o envio segue. Provado no teste do proxy; o 429 real é 🔒.

- [ ] **Envio pelo SDK, não por server action**
  O navegador faz `POST {NEXT_PUBLIC_API_URL}/contact` por `apiClient.contact.send`. O arquivo
  `contact/actions/contact.tsx` não existe mais e `ownerInbox` não é exportado por `@repo/email`.

- [ ] **"Ajuda e contato" no menu do perfil**
  Na app, o menu do perfil mostra "Ajuda e contato" / "Help and contact" / "Ayuda y contacto" entre "Minha
  conta" e "Cookies". O item abre `{NEXT_PUBLIC_WEB_URL}/<locale>/contact` em aba nova. Sem
  `NEXT_PUBLIC_WEB_URL` na app (ou com ela vazia), o item não aparece e o resto do menu segue igual.

- [ ] **E-mail da conta preenchido, sem PII na URL**
  Logado no app, ao abrir "Ajuda e contato" a landing adota a sessão compartilhada e preenche o campo de e-mail
  com o da conta. O campo continua editável e, se a pessoa já digitou algo, não é sobrescrito. A URL aberta não
  carrega o e-mail nem nenhum outro dado da conta. Sem cookie compartilhado (domínios distintos), o campo fica
  vazio e o envio funciona.

- [ ] **Personificação**
  Com um admin personificando um usuário comum, o item aparece no menu e a landing preenche o e-mail do próprio
  admin, dono do cookie de sessão, que é quem está escrevendo.

- [ ] **Caminhos que já levavam a `/contact`**
  O card "Enterprise" da `/pricing`, o link de privacidade de `/legal/privacy` sem `NEXT_PUBLIC_PRIVACY_CONTACT`
  e os CTAs da home chegam ao formulário funcional no idioma corrente. O JSDoc de `privacyContact.ts` e o
  comentário de `NEXT_PUBLIC_PRIVACY_CONTACT` em `packages/next-config/keys.ts` descrevem o comportamento real.

- [ ] **Tema e responsivo**
  O formulário, o aviso de indisponível e o toast de erro ficam legíveis em light e dark, e em 375 px a coluna do
  formulário cabe sem rolagem horizontal. O item do menu respeita o tema da app.

- [ ] **Documentação alinhada**
  `ROPA.md` §5 aponta para a rota da API e para a caixa de suporte; `SECURITY.md` lista 13 caminhos com rate
  limit; `PRE-PRODUCTION.md` §8 cita `/contact` e §13 diz que sem a caixa o formulário fica indisponível;
  `SETUP.md` e `FORKING.md` dizem que `NEXT_PUBLIC_APP_SUPPORT_EMAIL` é o destino do contato.

---

# Etapa 2: blueprint técnico

## 10.1 Contrato (`packages/sdk`)

```ts
// packages/sdk/src/types/contact/contact.ts
export type ContactMessageRequest = {
    name: string;
    email: string;
    message: string;
    /** Language of the email the support inbox receives. Absent falls back to the fork's default. */
    locale?: string;
};

export type ContactMessageSent = { sent: true };
```

```ts
// packages/sdk/src/actions/contact/action.ts
import type { Client } from "../../client/index";
import type { Response } from "../../client/type";
import type { ContactMessageRequest, ContactMessageSent } from "../../types";

export default class ContactActions {
    // biome-ignore lint/style/noParameterProperties: SDK client pattern
    constructor(private readonly client: Client) {
        this.client = client;
    }

    /** Public: answers without a session. */
    async send(body: ContactMessageRequest): Promise<ContactMessageSent> {
        const { data } = await this.client.request<Response<ContactMessageSent>>({
            url: "/contact",
            method: "POST",
            data: body,
        });
        return data.data;
    }
}
```

```diff
 // packages/sdk/src/client/index.ts
+import ContactActions from "../actions/contact/action";
 ...
+    contact!: ContactActions;
 ...
+        this.contact = new ContactActions(this);
```

```diff
 // packages/sdk/src/types/index.ts
 export * from "./audit";
+export * from "./contact";
 export * from "./entity";
```

## 10.2 `packages/shared`

```ts
// packages/shared/utils/helpers/contactMessage.ts
export const CONTACT_NAME_MAX_LENGTH = 120;
export const CONTACT_MESSAGE_MAX_LENGTH = 5000;
```

## 10.3 `packages/email`

```diff
-/** The address a fork sends from, and the inbox contact messages land in. */
-export const ownerInbox = (): string | null => keys().RESEND_FROM ?? null;
+/** The fork's support address, where contact messages land. Null until the fork sets one. */
+export const supportInbox = (): string | null => getBrand().supportEmail;
```

## 10.4 API

```ts
// apps/api/(shared)/validation/contact.schema.ts
import { locales } from "@repo/internationalization/utils";
import {
    CONTACT_MESSAGE_MAX_LENGTH,
    CONTACT_NAME_MAX_LENGTH,
} from "@repo/shared/utils/helpers/contactMessage";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

const EMAIL_MAX = 320;

export const contactMessageSchema = z.object({
    name: z.string().trim().min(1).max(CONTACT_NAME_MAX_LENGTH),
    email: z.string().trim().max(EMAIL_MAX).email(),
    message: z.string().trim().min(1).max(CONTACT_MESSAGE_MAX_LENGTH),
    locale: z.enum(locales).optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export function parseContactMessage(
    body: unknown
): { ok: true; value: ContactMessageInput } | { ok: false; response: Response } {
    const parsed = contactMessageSchema.safeParse(body);
    return parsed.success
        ? { ok: true, value: parsed.data }
        : {
              ok: false,
              response: Response.json(
                  { error: { code: "VALIDATION_FAILED" } },
                  { status: HTTP_STATUS.BAD_REQUEST }
              ),
          };
}
```

```ts
// apps/api/app/(routes)/contact/route.ts
import { isEmailEnabled, sendEmail, supportInbox } from "@repo/email";
import { contactEmail } from "@repo/email/templates/contact";
import { resolveLocale } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { parseContactMessage } from "@/(shared)/validation/contact.schema";

const unavailable = () =>
    Response.json(
        { error: { code: "CONTACT_UNAVAILABLE" } },
        { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );

export async function POST(req: Request) {
    const inbox = supportInbox();
    if (!(inbox && isEmailEnabled())) {
        return unavailable();
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseContactMessage(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { name, email, message, locale } = parsed.value;
    const result = await sendEmail({
        template: contactEmail,
        to: inbox,
        replyTo: email,
        locale: resolveLocale(locale),
        data: { name, email, message },
    });

    if (result.sent) {
        return Response.json({ data: { sent: true } });
    }

    return result.reason === "provider-error"
        ? Response.json(
              { error: { code: "EMAIL_SEND_FAILED" } },
              { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
          )
        : unavailable();
}
```

```diff
 // apps/api/proxy.ts
  * page itself. Its cache already keeps the provider out of the request path.
  *
+ * `/contact` is public and every accepted request sends an email to the fork's support
+ * inbox, billed by the provider. The visitor's browser calls it, so the address counted
+ * is the visitor's.
+ *
  * Matched exactly, so a new endpoint is unlimited until it is listed here.
  */
 const RATE_LIMITED_PATHS = [
     ...
     "/account/email",
+    "/contact",
 ];
```

**Exemplos:**

```http
POST /contact
Content-Type: application/json
Origin: https://example.com

{ "name": "Ana Souza", "email": "qa-contact-support@example.com", "message": "Quero falar sobre o plano Enterprise.", "locale": "pt-br" }
```

| Situação | Status | Corpo |
|---|---|---|
| Entregue | 200 | `{ "data": { "sent": true } }` |
| Sem caixa ou sem Resend | 503 | `{ "error": { "code": "CONTACT_UNAVAILABLE" } }` |
| Corpo inválido | 400 | `{ "error": { "code": "VALIDATION_FAILED" } }` |
| Provedor falhou | 503 | `{ "error": { "code": "EMAIL_SEND_FAILED" } }` |
| Orçamento estourado | 429 | `{ "error": { "code": "AUTH_RATE_LIMITED" } }` + `Retry-After` |

## 10.5 Persistência

N/A.

## 10.6 Landing

```ts
// apps/web/app/[locale]/contact/validations/contact.ts
type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export function buildContactFormSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.web.pages.contact.validation;
    return z.object({
        name: z
            .string()
            .trim()
            .min(1, validation.nameRequired)
            .max(CONTACT_NAME_MAX_LENGTH, validation.nameTooLong),
        email: z.string().trim().email(validation.emailInvalid),
        message: z
            .string()
            .trim()
            .min(1, validation.messageRequired)
            .max(CONTACT_MESSAGE_MAX_LENGTH, validation.messageTooLong),
    });
}

export type ContactFormValues = z.infer<ReturnType<typeof buildContactFormSchema>>;
```

```diff
 // apps/web/app/[locale]/contact/page.tsx
+import { getBrand } from "@repo/next-config/brand";
 ...
 export default function Contact() {
-    return <ContactForm />;
+    return <ContactForm available={getBrand().supportEmail !== null} />;
 }
```

```diff
 // apps/web/app/[locale]/contact/components/contact-form.tsx
-export const ContactForm = () => <ContactFormClient />;
+export const ContactForm = ({ available }: { readonly available: boolean }) => (
+    <ContactFormClient available={available} />
+);
```

Esqueleto de `contact-form-client.tsx` (coluna do formulário):

```tsx
export const ContactFormClient = ({ available }: { readonly available: boolean }) => {
    const { dictionary, locale } = getDictionary();
    const contactCopy = dictionary.apps.web.pages.contact;
    const { errorAlert } = useAlert();
    const { user } = useAuth();

    const schema = useMemo(() => buildContactFormSchema(dictionary), [dictionary]);
    const form = useForm<ContactFormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", email: "", message: "" },
    });

    useEffect(() => {
        if (user?.email && !form.getValues("email")) {
            form.setValue("email", user.email);
        }
    }, [user?.email, form]);

    const sendMessage = useMutation({
        mutationFn: (values: ContactFormValues) =>
            apiClient.contact.send({ ...values, locale }),
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
    });

    // available === false  -> bloco hero.unavailable
    // sendMessage.isSuccess -> bloco hero.sent com role="status"
    // senão: <Form {...form}><form onSubmit={form.handleSubmit((v) => sendMessage.mutate(v))}>
    //   HookFormInput name="name" · HookFormInput name="email" type="email"
    //   HookFormTextarea name="message" · Button type="submit" loading={isPending} disabled={isPending}
};
```

| Campo | Componente | Label / placeholder |
|---|---|---|
| `name` | `HookFormInput` | `hero.form.name` / `hero.form.namePlaceholder` |
| `email` | `HookFormInput type="email"` | `hero.form.email` / `hero.form.emailPlaceholder` |
| `message` | `HookFormTextarea` | `hero.form.message` / `hero.form.messagePlaceholder` |

## 10.7 App

```ts
// apps/app/shared/lib/contactPageUrl.ts
import { env } from "@/env";

/** The contact form lives in the marketing app. Without its URL, callers drop the link. */
export const contactPageUrl = (locale: string): string | null =>
    env.NEXT_PUBLIC_WEB_URL ? `${env.NEXT_PUBLIC_WEB_URL}/${locale}/contact` : null;
```

```diff
 // apps/app/shared/components/ui/ProfileDropdown.tsx
-import { CookieIcon, LogOutIcon, UserIcon } from "lucide-react";
+import { CookieIcon, LifeBuoyIcon, LogOutIcon, UserIcon } from "lucide-react";
+import { contactPageUrl } from "@/shared/lib/contactPageUrl";
 ...
+    const helpHref = contactPageUrl(locale);
 ...
                     </DropdownMenuItem>
+                    {helpHref && (
+                        <DropdownMenuItem asChild>
+                            <a href={helpHref} rel="noreferrer" target="_blank">
+                                <LifeBuoyIcon className="text-muted-foreground" />
+                                <span>{profileDropdown.helpAndContact}</span>
+                            </a>
+                        </DropdownMenuItem>
+                    )}
                     {cookieConsent.available && (
```

## 10.8 i18n (forma das chaves; texto final no `/develop`, nos três idiomas)

```ts
// translations/apps/web/pages/contact/contact.ts, por idioma
hero: {
    benefits: [/* sem mudança */],
    form: {
        title,               // "Fale com a gente" / "Get in touch" / "Escríbenos"
        name, namePlaceholder,
        email, emailPlaceholder,
        message, messagePlaceholder,
        cta,                 // "Enviar mensagem" / "Send message" / "Enviar mensaje"
    },
    sent: { title, description },
    unavailable: { title, description },
},
validation: {
    nameRequired, nameTooLong, emailInvalid, messageRequired, messageTooLong,
},
```

```ts
// translations/apps/app/shared/index.ts
profileDropdown: { ..., helpAndContact }   // "Ajuda e contato" / "Help and contact" / "Ayuda y contacto"

// translations/packages/shared/utils.ts, apiErrors
CONTACT_UNAVAILABLE:
    // pt-br "O canal de contato não está disponível no momento."
    // en    "The contact channel is not available right now."
    // es    "El canal de contacto no está disponible en este momento."
```

As mensagens de `nameTooLong`/`messageTooLong` citam o número (120 e 5000). O `/develop` usa `/i18n-sync` e roda
o teste de paridade.

## 10.9 Documentação

| Arquivo | Mudança |
|---|---|
| `docs/ROPA.md` §5 | "Onde está no código" passa a `apps/api/app/(routes)/contact/route.ts`; compartilhamento: Resend entrega na caixa de `NEXT_PUBLIC_APP_SUPPORT_EMAIL`; medidas: rate limit da API com `ARCJET_KEY`, sem cópia no Firestore; e-mail do usuário logado preenchido pela sessão, nunca pela URL |
| `docs/SECURITY.md:157` | 13 caminhos, com `/contact`; nova data de medição |
| `docs/PRE-PRODUCTION.md` §8 | Sem `ARCJET_KEY`, `/contact` também fica sem limite e cada envio gasta cota do Resend |
| `docs/PRE-PRODUCTION.md` §13 | Sem `NEXT_PUBLIC_APP_SUPPORT_EMAIL`, o formulário de contato mostra "indisponível" |
| `docs/SETUP.md:96` | Papel da variável: destino do contato na `api`, aviso de indisponível na `web` |
| `docs/FORKING.md:114`, `:396` | Idem, e a variável passa de "recomendada" para necessária ao canal de contato |
| `packages/next-config/keys.ts:37-38` | Comentário de `NEXT_PUBLIC_PRIVACY_CONTACT` deixa de dizer "which every fork already has working" |

## 10.10 Env

Nenhuma variável nova. `NEXT_PUBLIC_APP_SUPPORT_EMAIL` ganha um papel (destino do contato) e já está nos três
`.env.example`.

## 10.11 Ordem de implementação e commits

| # | Commit | Arquivos |
|---|---|---|
| 1 | `feat(shared): share contact message length limits` | `packages/shared/utils/helpers/contactMessage.ts` |
| 2 | `feat(email): deliver contact messages to the support inbox` | `packages/email/index.ts`, `__tests__/credentials.test.ts` |
| 3 | `feat(sdk): add public contact message action` | `types/contact/*`, `types/index.ts`, `actions/contact/action.ts`, `client/index.ts`, `__tests__/contactAction.test.ts` |
| 4 | `feat(api): add public POST /contact route` | `validation/contact.schema.ts`, `(routes)/contact/route.ts`, `__tests__/contactRoute.test.ts` |
| 5 | `feat(api): rate limit the contact endpoint` | `proxy.ts`, `__tests__/corsOrigin.test.ts` |
| 6 | `feat(web): send the contact form through the API` | `contact/*`, `validations/contact.ts`, `shared/lib/privacyContact.ts`, testes novos, remoção de `actions/contact.tsx`, `contactAction.test.ts`, `contactFormDateLocale.test.tsx` |
| 7 | `feat(app): add help and contact to the profile menu` | `shared/lib/contactPageUrl.ts`, `ProfileDropdown.tsx`, `__tests__/profileDropdownHelpLink.test.tsx` |
| 8 | `feat(internationalization): contact form, help menu and CONTACT_UNAVAILABLE copy` | os três arquivos de tradução |
| 9 | `docs(next-config): describe the privacy channel fallback` | `packages/next-config/keys.ts` |
| 10 | `docs: contact channel in ROPA, SECURITY, PRE-PRODUCTION, SETUP and FORKING` | `docs/*.md` |
| 11 | `docs(features): contact-support-channel` | `docs/features/contact-support-channel/` |

Os commits 6 e 7 só passam no typecheck com o 8 aplicado. É a ordem que a regra de commits pede (i18n por
último); o `/review` decide se junta.

## 10.12 `contends_on` real

Os quatro arquivos da spec são tocados (`contact-form-client.tsx`, `apps/api/proxy.ts`, `ProfileDropdown.tsx`,
`packages/sdk/src/client/index.ts`). Além deles: `packages/email/index.ts`, `packages/sdk/src/types/index.ts`,
`translations/packages/shared/utils.ts`, `translations/apps/app/shared/index.ts`, `apps/api/__tests__/corsOrigin.test.ts`,
`docs/SECURITY.md`, `docs/PRE-PRODUCTION.md`, `docs/ROPA.md`. Qualquer spec rodando em paralelo que toque
`proxy.ts` ou `apiErrors` conflita.

---

# Perguntas em aberto

Todas já têm a opção adotada. Nenhuma bloqueia o `/develop`.

1. **Como o e-mail da conta chega preenchido?**
   Opções: (a) a landing lê `useAuth().user.email` da sessão compartilhada; (b) `?email=` na URL; (c) diálogo
   dentro da app.
   **Adotada: (a).** A landing já adota a sessão do app, medido na seção 2. (b) mandaria o e-mail ao GA no
   `page_location`. (c) duplicaria o formulário, contra a recomendação da spec.

2. **Como a landing sabe que o canal está indisponível antes de enviar?**
   Opções: (a) a página lê `getBrand().supportEmail` e mostra o aviso; falta de Resend aparece só no envio, como
   toast de `CONTACT_UNAVAILABLE`; (b) rota pública `GET /contact/availability` consultada pela página;
   (c) a landing lê o próprio `RESEND_*`.
   **Adotada: (a).** O caso comum de fork novo é a variável vazia, e esse caso fica coberto antes de digitar. (b)
   acrescenta rota, chamada de servidor por visita e um caminho que não pode entrar no rate limit por IP, pelo
   mesmo motivo do `/payments/catalog`. (c) consulta a fonte errada: quem envia é a API.

3. **Código para falha do provedor.**
   Opções: (a) reusar `EMAIL_SEND_FAILED` (503); (b) criar `CONTACT_SEND_FAILED`.
   **Adotada: (a).** Já é o código de duas rotas (`account/email`, `auth/email-verification/send`) e o texto
   ("Não foi possível enviar o e-mail agora. Tente de novo em instantes.") serve. Se a copy "o e-mail" soar
   estranha num formulário de mensagem, (b) custa três linhas de tradução.

4. **Orçamento de rate limit.**
   Opções: (a) o orçamento comum, 20 por minuto por IP; (b) um orçamento próprio, mais apertado, para `/contact`.
   **Adotada: (a).** (b) exige mudar a assinatura de `checkRateLimit` em `@repo/security`. A spec fala em "limite
   configurado". Se 20 mensagens por minuto de um IP for demais para a caixa, (b) vira item próprio.

5. **Armadilha de bot (honeypot) no formulário.**
   Opções: (a) não; (b) um campo oculto que a API recusa quando vem preenchido.
   **Adotada: (a).** A spec define a proteção como validação + rate limit e deixa CAPTCHA fora; o honeypot não está
   no corte. É barato e sem dependência, então fica como candidato se a caixa receber spam.

6. **Tamanho mínimo da mensagem.**
   Opções: (a) não vazia depois do `trim`; (b) mínimo de 10 caracteres.
   **Adotada: (a).** A spec não pede mínimo, e (b) recusaria "Oi, me liga?".

7. **Idioma do e-mail que chega na caixa.**
   Opções: (a) o idioma da página do visitante; (b) o idioma padrão do fork.
   **Adotada: (a),** como a action fazia (`contactAction.test.ts:55-59`). Diz ao dono em que língua responder.

8. **`ownerInbox` renomeado ou só reapontado.**
   Opções: (a) remover `ownerInbox` e criar `supportInbox`; (b) manter o nome e mudar o retorno.
   **Adotada: (a).** Um fork que chame `ownerInbox` quebra no typecheck em vez de mudar de destino sem aviso.

9. **Abrir a landing na mesma aba ou em aba nova.**
   **Adotada: aba nova,** como o link da política de privacidade (`AccountPrivacyPanel.tsx:190-194`). A pessoa
   não perde o que estava fazendo no painel.

10. **Item visível para admin.**
    O `ProfileDropdown` só é montado no layout comum (`(common)/layout.tsx:61`). O admin fora da personificação
    não vê o item. **Adotado: manter assim**; o admin é o operador do fork, não quem pede suporte a ele.

# Riscos

- **Spam sem `ARCJET_KEY`.** A rota é pública e cada envio gasta cota do Resend. Mitigação desta entrega:
  pendência explícita no `PRE-PRODUCTION.md` §8. Em produção sem a chave, a caixa fica exposta.
- **Fork com a variável só na API ou só na web.** Só na API: a página mostra "indisponível" e ninguém envia.
  Só na web: o formulário aparece e a API responde `CONTACT_UNAVAILABLE`. O `PRE-PRODUCTION.md` §13 já pede a
  variável nos três projetos; a mudança de texto deixa claro o efeito.
- **Mudança visível para forks existentes.** Quem não definiu `NEXT_PUBLIC_APP_SUPPORT_EMAIL` passa a ver
  "indisponível" em vez da fachada. A spec registra isso como trade-off aceito.
- **Typecheck dos commits intermediários** (6 e 7 antes do 8). Já discutido em 10.11.
- **Preenchimento depende do bootstrap da sessão.** Se o custom token falhar, o campo fica vazio. Não bloqueia o
  envio.

# Achados adjacentes (fora desta entrega)

- `apps/web/env.ts:1,8` e `apps/web/.env.example:2-3`: a landing continua declarando `RESEND_*` e dependendo de
  `@repo/email` (`apps/web/package.json:19`) sem nenhum envio depois da remoção da action. Limpeza de config,
  candidata ao backlog.
- `translations/apps/web/pages/contact/contact.ts:4,30,56`: `meta.title` fixo com "Next Boilerplate" em vez da
  marca do fork.
- `contact.ts:11,37,63`: o benefício "responde em até 24 horas" é uma promessa que o core não cumpre por conta
  própria.

# Deriva da spec

- O corte diz "sem e-mail configurado [...] o formulário diz que o canal está indisponível". Sem caixa, o aviso
  aparece antes de digitar; sem Resend, aparece ao enviar, como toast, com os campos preservados (pergunta 2).
- A spec cita `docs/ROPA.md` "ganha a atividade de tratamento contato". A atividade já existe (§5); a entrega
  corrige o conteúdo dela.
