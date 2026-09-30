# Criar e lançar um projeto a partir do boilerplate

Roteiro para transformar este repositório num produto e publicá-lo em produção. Segue a ordem em que as
coisas precisam acontecer: repositório, identidade, Firebase, domínios, Vercel, serviços opcionais,
primeiro admin e conferência final. No fim há uma [referência de todas as variáveis de
ambiente](#8-referência-das-variáveis-de-ambiente) e um [mapa dos arquivos que o fork
altera](#12-mapa-dos-arquivos-que-o-fork-altera).

Sem mexer em nada, o repositório sobe localmente e mostra o nome `next-boilerplate` em todas as telas e
e-mails. Isso é o padrão neutro, não um erro, mas nenhum cliente deveria vê-lo.

## O que você vai montar

| Peça | Quantidade | Obrigatória |
|------|-----------|-------------|
| Repositório Git do produto | 1 | sim |
| Projeto Firebase (Auth + Firestore) | 1 | sim |
| Projetos na Vercel (`app`, `web`, `api`) | 3 | sim |
| Domínio próprio com três hosts (landing, painel, API) | 1 | sim, para a sessão compartilhada funcionar |
| Conta Resend com domínio verificado | 1 | sim, sem ela não existe recuperação de senha |
| Conta Stripe | 1 | só se o produto cobra assinatura |
| Conta Arcjet | 1 | recomendada |
| Propriedade do Google Analytics | 1 | opcional |
| Bucket do Cloud Storage | 1 | só se o produto usa upload de arquivo |

O `apps/email` não é publicado: ele só serve para visualizar os templates durante o desenvolvimento. Os
e-mails de verdade são renderizados e enviados pela `api` (e pela `web`, no formulário de contato).

## Checklist resumido

1. [Criar o repositório](#1-criar-o-repositório-do-produto) e limpar os resíduos do projeto de origem.
2. [Rodar localmente](#2-rodar-localmente) com os emuladores.
3. [Definir a identidade](#3-identidade-do-produto): marca, ícones, cores, textos e idioma padrão.
4. [Criar o projeto Firebase](#4-projeto-firebase) e publicar rules e índices.
5. [Escolher os domínios](#5-domínios-e-topologia).
6. [Criar os três projetos na Vercel](#6-vercel) e preencher as variáveis.
7. [Configurar os serviços](#7-serviços-externos): Resend, Stripe, Arcjet, Analytics, Storage.
8. [Criar o primeiro admin](#9-primeiro-admin-em-produção).
9. [Conferir tudo](#11-conferência-antes-de-abrir-para-usuários) e percorrer o
   [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md).

## 1. Criar o repositório do produto

Clone este repositório com o nome do produto e aponte o `origin` para o repositório novo. Manter o
boilerplate como `upstream` permite trazer correções do core depois:

```bash
git clone <url-do-boilerplate> meu-produto
cd meu-produto
git remote rename origin upstream
git remote add origin <url-do-repositorio-do-produto>
git push -u origin main
```

Para trazer uma melhoria do core mais tarde: `git fetch upstream && git merge upstream/main` numa branch,
resolvendo os conflitos nos arquivos que o fork personalizou.

### Resíduos do projeto de origem

O boilerplate nasceu de outro starter e alguns arquivos da raiz ainda descrevem aquele projeto. Nenhum
deles afeta build ou teste, mas todos confundem quem abre o fork:

| Arquivo | O que tem hoje | O que fazer |
|---------|----------------|-------------|
| `package.json` (raiz) | `"name": "next-forge"`, `"version"`, `"bin"` e `"files"` de um CLI que não existe aqui (não há `scripts/index.ts`), `engines.node` em `>=18` enquanto o `.nvmrc` fixa `22.12.0`, e as dependências `@clack/prompts` e `commander`, que nenhum arquivo importa | Trocar o `name` pelo do produto, remover `bin` e `files`, alinhar `engines.node` com o `.nvmrc` e remover as duas dependências (depois, `pnpm install`) |
| `tsup.config.ts` | Build do CLI a partir de `scripts/index.ts`, que não existe | Apagar |
| `.autorc` | Config de release automático apontando para o repositório de origem | Apagar ou reescrever para o seu repositório |
| `CHANGELOG.md` | Histórico de versões do projeto de origem | Apagar ou recomeçar |
| `license.md` | MIT com o copyright original | A MIT exige manter o aviso original nas cópias; acrescente a sua linha de copyright ou troque a licença do seu código, se for o caso |
| `.firebaserc` | `default` apontando para o projeto Firebase do boilerplate | Ver [seção 4](#4-projeto-firebase) |

### Backlog e histórico do core

`specs/` é o backlog de funcionalidades do boilerplate e `docs/features/` é o histórico de como cada uma foi
construída. O fork pode manter as duas pastas como referência ou esvaziar `specs/` para começar o próprio
backlog com `/spec`. O ciclo de IA (`/spec → /analyze → /develop → /review → /test`) funciona igual no fork.

### CI

O workflow `.github/workflows/ci.yml` roda no fork sem ajuste: `verify` (lint, typecheck, test), `changes`,
`e2e` e `coverage`. Ele não precisa de segredo. Ligue a proteção da `main` exigindo `verify` e `e2e`:
[`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 9, e [`SETUP.md`](SETUP.md), seção "Runbook — branch
protection".

## 2. Rodar localmente

```bash
nvm use && pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env
cp apps/web/.env.example apps/web/.env
pnpm emulators   # terminal 1
pnpm seed        # terminal 2
pnpm dev         # terminal 2
```

Os `.env.example` vêm apontados para os emuladores do Firebase, então nada disso exige conta. Precisa de
JDK 21+. Detalhes e armadilhas: [`SETUP.md`](SETUP.md), seção "Emulador do Firebase".

Os `.env` locais nunca são versionados. Em produção as variáveis vivem no painel da Vercel ([seção
6](#6-vercel)).

## 3. Identidade do produto

### 3.1 Marca

Três variáveis públicas, lidas por `getBrand()` em `packages/next-config/brand.ts`. Defina as três em
`apps/app`, `apps/web` e `apps/api` (a API renderiza os e-mails):

| Var | O que muda | Vazia |
|-----|------------|-------|
| `NEXT_PUBLIC_APP_NAME` | Nome na barra lateral do painel, no painel das telas de entrada, no header e footer da web, no `<title>` e Open Graph (`createMetadata`), no JSON-LD da home, no corpo e no assunto dos e-mails, e no nome do remetente ([seção 7.1](#71-resend-e-mail)). | `next-boilerplate` |
| `NEXT_PUBLIC_APP_LOGO_URL` | Logo na barra lateral, no painel de entrada, no header da web, no cabeçalho dos e-mails e no `logo` do JSON-LD. A origem da URL entra no `img-src` da CSP do app e da web. | Cada superfície mostra o seu ícone genérico: a inicial do nome na barra lateral, um ícone no painel de entrada, o triângulo na web e o nome em texto no e-mail. |
| `NEXT_PUBLIC_APP_SUPPORT_EMAIL` | Linha "Dúvidas? Escreva para …" no rodapé dos e-mails de boas-vindas e de ação. O e-mail de contato, que vai para o dono do produto, não recebe a linha. | Sem linha de suporte. |

O logo precisa ser uma URL absoluta `https` (ou `http`), pública e de uma marca quadrada. O mesmo arquivo
serve às três superfícies, e cliente de e-mail não resolve caminho relativo. Um valor relativo, com outro
esquema ou malformado é tratado como ausente, e o host da URL só pode ter letras, dígitos, ponto e hífen,
porque a origem vai literal para a CSP.

Hospede o logo num CDN ou num bucket com leitura pública. A web não serve: ela não tem `public/`, e o proxy
dela redireciona para `/<idioma>/…` todo caminho sem prefixo de idioma, inclusive o de um arquivo.

Endereço de suporte sem `@` e domínio também é tratado como ausente, e nome só com espaços vale como vazio.

⚠️ As três são `NEXT_PUBLIC_*`: o Next grava o valor no bundle na hora do build. Trocar a marca pede um
build e um deploy novos em cada app, não só reiniciar o processo.

Metadados de autoria, opcionais e declarados em `packages/next-config/keys.ts`: `NEXT_PUBLIC_APP_AUTHOR`
(sem ele, o autor é o nome da marca), `NEXT_PUBLIC_APP_AUTHOR_URL` e `NEXT_PUBLIC_TWITTER_HANDLE`.

### 3.2 Ícones, imagens e cores

| Arquivo | O que é |
|---------|---------|
| `apps/app/app/favicon.ico`, `icon.png` (32×32), `apple-icon.png` (192×192) | Ícones do painel. Se o `favicon.ico` levar um PNG embutido, ele tem de ser RGBA: o Next recusa outro formato ao compilar e toda rota do app responde 500. O teste `apps/app/__tests__/appIcons.test.ts` confere isso. |
| `apps/web/app/[locale]/icon.png`, `apple-icon.png`, `opengraph-image.png` | Ícones e imagem de compartilhamento da landing. |
| `packages/email/brand.ts` | Paleta dos e-mails, em hex literal, porque cliente de e-mail não entende `oklch()` nem `var()`. |
| `packages/design-system/styles/globals.css` | Tokens do tema (light e dark). A cor principal é `--primary`. |

### 3.3 Textos

Todo texto visível vem de `packages/internationalization/translations/`, nos três idiomas (pt-br, en, es).
Um fork reescreve principalmente:

| Pasta | Conteúdo |
|-------|----------|
| `apps/web/pages/hero`, `features`, `stats`, `faq`, `cta`, `home` | Seções da landing |
| `apps/web/pages/pricing` | Página de preços da landing. É texto estático: mantenha os planos coerentes com o catálogo da Stripe ([seção 7.2](#72-stripe-assinaturas)) |
| `apps/web/pages/contact` | Página de contato |
| `apps/web/pages/legal` | Política de privacidade e termos de uso. São modelos e dizem isso no próprio corpo. Reescreva com o tratamento real de dados do produto antes do lançamento ([`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 7) |
| `packages/email` | Assunto e corpo dos e-mails transacionais |

Ao mudar qualquer chave, mantenha os três idiomas em paridade. A skill `/i18n-sync` faz isso e o teste de
paridade do pacote falha se um idioma ficar para trás. Se o produto não vai atender algum idioma, ainda
assim mantenha as chaves: a lista `locales` em `packages/internationalization/utils.ts` alimenta rotas,
`sitemap.xml` e `hreflang`.

### 3.4 Idioma padrão

`NEXT_PUBLIC_DEFAULT_LOCALE` (`pt-br`, `en` ou `es`; padrão `pt-br`) decide o idioma quando a URL não traz
prefixo. Defina o mesmo valor em `app` e `web`.

## 4. Projeto Firebase

1. **Crie o projeto** no [Firebase Console](https://console.firebase.google.com). O plano gratuito
   (Spark) basta para rodar, a menos que o produto use upload de arquivo (§7.5 abaixo). Ele não tem
   backup do Firestore de nenhum tipo: [`BACKUP.md`](BACKUP.md).
2. **Registre um app Web** (Project settings → Your apps → Web). Os valores do `firebaseConfig` viram as
   variáveis `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
   `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` e
   `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`, em `app` e `web`. São públicas por desenho; a proteção está nas
   rules e na API.
3. **Ligue os métodos de login** (Authentication → Sign-in method): **E-mail/senha** e **Google**. O painel
   oferece login com Google.
4. **Autorize os domínios** (Authentication → Settings → Authorized domains): o host da landing e o do
   painel. Sem isso o login com Google falha em produção. Deploys de preview (`*.vercel.app`) precisam ser
   acrescentados um a um, se você for testar login neles.
5. **Crie o Firestore** em modo de produção. A região escolhida aqui não pode ser trocada depois.
6. **Gere a service account** (Project settings → Service accounts → Generate new private key). O JSON vira
   `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY`, nos **três**
   apps: a `api` usa para acessar o Firestore; `app` e `web` usam para criar e verificar o cookie de sessão.
   Mantenha os `\n` da chave privada escapados. O conjunto é tudo ou nada: preencher só parte dele derruba
   o boot com erro de env.
7. **Copie a Web API key** (Project settings → General) para `FIREBASE_WEB_API_KEY` na `api`. Ela confirma a
   redefinição de senha e a verificação de e-mail.
8. **Publique rules e índices** no projeto do fork, sem tocar no `.firebaserc` versionado:

   ```bash
   npx -y firebase-tools@latest login
   npx -y firebase-tools@latest deploy --project <id-do-projeto> --only firestore:rules --dry-run
   npx -y firebase-tools@latest deploy --project <id-do-projeto> --only firestore:rules,firestore:indexes
   ```

   Faça isso **depois** que a API estiver no ar: as rules são `deny-all` e só a API (pelo Admin SDK) acessa
   a base. Sem publicar, qualquer pessoa com a chave pública lê e grava o Firestore direto. Como conferir e
   como fazer rollback: [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 1, e [`SECURITY.md`](SECURITY.md).

   Se preferir, troque o `default` do `.firebaserc` pelo id do seu projeto e faça o commit. A partir daí o
   `--project` fica opcional.

⚠️ **Em produção, o bloco do emulador não existe.** Os `.env.example` trazem `FIRESTORE_EMULATOR_HOST`,
`FIREBASE_AUTH_EMULATOR_HOST`, `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` e
`NEXT_PUBLIC_FIREBASE_PROJECT_ID="demo-next-boilerplate"` preenchidos. Na Vercel, não crie as três
variáveis de host e use o id real no `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. Metade emulada e metade real deixa o
login funcionando e o perfil sem ser encontrado. Para trabalhar localmente contra o projeto real, siga
[`SETUP.md`](SETUP.md), seção "Voltar para um projeto Firebase real".

## 5. Domínios e topologia

A sessão é um cookie compartilhado entre landing e painel, então os dois precisam estar sob o mesmo domínio
registrável. A topologia recomendada:

| Host | App |
|------|-----|
| `example.com` | `web` |
| `app.example.com` | `app` |
| `api.example.com` | `api` |

Com ela, as variáveis de URL e sessão ficam assim:

| Var | Valor | Onde |
|-----|-------|------|
| `NEXT_PUBLIC_WEB_URL` | `https://example.com` | `api`, `app`, `web` |
| `NEXT_PUBLIC_APP_URL` | `https://app.example.com` | `api`, `app`, `web` |
| `NEXT_PUBLIC_API_URL` | `https://api.example.com` | `app`, `web` |
| `CORS_ORIGIN` | `https://example.com,https://app.example.com` | `api` |
| `SESSION_COOKIE_DOMAIN` | `example.com` | `app`, `web` |

- `CORS_ORIGIN` é obrigatória em produção: sem ela a API não sobe. Não aceita coringa.
- `SESSION_COOKIE_DOMAIN` nunca pode ser um sufixo público como `vercel.app`. Nos domínios
  `*.vercel.app` padrão da Vercel a sessão não é compartilhada entre `web` e `app`.
- Se a landing e o painel ficarem em domínios registráveis diferentes (`marca.com` e `marca.app`), o cookie
  compartilhado não funciona. O caminho está descrito em [`AUTH-SSO.md`](AUTH-SSO.md), seção "Fallback",
  e não está implementado.
- Deploys de preview têm URL própria: para testar neles, acrescente a origem ao `CORS_ORIGIN` do ambiente
  de preview e aos Authorized domains do Firebase.

## 6. Vercel

Crie **três projetos** a partir do mesmo repositório, um por app:

| Projeto | Root Directory |
|---------|----------------|
| `<produto>-web` | `apps/web` |
| `<produto>-app` | `apps/app` |
| `<produto>-api` | `apps/api` |

- Framework: Next.js. O repositório não fixa comando de build nem de instalação; valem os que a Vercel
  detecta para um monorepo pnpm.
- Node: escolha a versão 22 nas configurações do projeto, igual ao `.nvmrc`.
- O `vercel.json` de cada app só define `ignoreCommand`: um commit com `[skip ci]` na mensagem não gera
  deploy.
- Ligue cada projeto ao seu domínio ([seção 5](#5-domínios-e-topologia)).
- Preencha as variáveis de cada projeto com a [referência da seção 8](#8-referência-das-variáveis-de-ambiente),
  para Production e, se for usar, Preview.

Três cuidados:

1. **A `api` exige a service account no build**, não só em runtime. `apps/api/env.ts` valida as três
   `FIREBASE_ADMIN_*` e o `next build` falha sem elas.
2. **Toda `NEXT_PUBLIC_*` é gravada no bundle no build.** Mudou uma delas, faça um deploy novo daquele
   projeto.
3. **Ordem do primeiro deploy:** `api` primeiro (os outros dois apontam para ela), depois `app` e `web`, e
   só então publique as rules do Firestore ([seção 4](#4-projeto-firebase), passo 8).

`VERCEL_PROJECT_PRODUCTION_URL` é definida pela própria Vercel e vira a base do `metadataBase` e, sem
`NEXT_PUBLIC_WEB_URL`, a do `sitemap.xml` e do `robots.txt`. Fora da Vercel, defina-a com o domínio de
produção de cada app.

## 7. Serviços externos

### 7.1 Resend (e-mail)

Sem e-mail, quem esquece a senha perde a conta: o pedido de redefinição responde `EMAIL_NOT_CONFIGURED`.

1. Crie a conta, adicione o domínio de envio e publique os registros SPF e DKIM no DNS.
2. `RESEND_TOKEN` (`re_…`) e `RESEND_FROM` na `api` (e-mails de conta) e na `web` (formulário de contato). O
   formulário de contato entrega no próprio `RESEND_FROM`. O `app` também valida as duas se estiverem
   preenchidas, mas não envia nada.
3. `NEXT_PUBLIC_APP_URL` na `api`, apontando para o painel: é a base dos links de redefinição de senha e de
   verificação de e-mail.

Quando `RESEND_FROM` é só o endereço (`hi@example.com`) e `NEXT_PUBLIC_APP_NAME` está definido, o envio sai
como `Nome <hi@example.com>`. Se `RESEND_FROM` já traz um nome (`Outro <hi@example.com>`), ele é usado como
está. Sem nome configurado, sai o endereço puro.

Depois de configurar, rode o ciclo real uma vez: pedir redefinição, receber, definir a senha nova e entrar.
Detalhes: [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), itens 3 e 4.

### 7.2 Stripe (assinaturas)

Só se o produto cobra. Sem as chaves, a cobrança fica desligada e o resto funciona: a aba de cobrança mostra
"em breve" e as rotas de pagamento respondem `PAYMENTS_NOT_CONFIGURED`.

1. Crie os produtos e preços **recorrentes** no Dashboard.
2. Configure o Customer Portal (cancelamento, troca de plano, cartão).
3. Registre o webhook `https://api.example.com/webhooks/payments`, na versão de API `2025-09-30.clover`, com
   os eventos `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted` e `invoice.paid`.
4. `STRIPE_SECRET_KEY` (`sk_…`) e `STRIPE_WEBHOOK_SECRET` (`whsec_…`) **só na `api`**. Os
   `.env.example` de `app` e `web` também listam as duas, mas nenhum desses apps as lê.
5. `NEXT_PUBLIC_PRODUCT_MODE` com o mesmo valor nos três apps, e diferente de `simple`.

Passo a passo, verificação e riscos aceitos: [`PAYMENTS.md`](PAYMENTS.md) e
[`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 12. Para testar localmente:
`pnpm --filter api dev:with-stripe`.

### 7.3 Arcjet (limite de requisições)

`ARCJET_KEY` (`ajkey_…`) em `api`, `app` e `web`. Sem ela, as rotas públicas de autenticação aceitam
requisições sem limite, incluindo cadastro, redefinição de senha e reenvio de verificação, que disparam
e-mail cobrado na sua conta Resend. [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 8.

Um valor sem o prefixo `ajkey_` é tratado como ausente na `api`, que registra um erro no boot, e faz o build
de `app` e `web` falhar. Na `web` a chave hoje só serve para essa validação: o `skipValidation` de
`apps/web/env.ts` deixa `env.ARCJET_KEY` sempre vazio, e o bloqueio de bot de `apps/web/proxy.ts` não roda.

### 7.4 Google Analytics

`NEXT_PUBLIC_GA_MEASUREMENT_ID` (`G-…`) em `app` e `web`. Um valor sem o prefixo `G-` é ignorado. Com ele
definido, o banner de consentimento de cookies aparece e nenhuma tag carrega antes da escolha do visitante.
Revise a seção de cookies da política de privacidade: [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 7.

### 7.5 Cloud Storage (upload de arquivo)

Só se o produto usa upload. Exige o plano **Blaze** (forma de pagamento cadastrada), embora o gasto de um MVP
fique na faixa gratuita. Crie o bucket em `us-central1`, `us-east1` ou `us-west1`: fora dessas regiões não
há faixa gratuita.

- `FIREBASE_STORAGE_BUCKET` na `api` e `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` no `app`, com o mesmo valor.
- Conceda `roles/storage.objectAdmin` à service account e publique o `storage.rules`.

Sem o bucket, o formulário mostra um campo de URL no lugar do seletor de arquivo e o avatar do perfil não
aparece. Passo a passo: [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md), item 6.

## 8. Referência das variáveis de ambiente

As listas completas por app são os três `.env.example` (`apps/api`, `apps/app`, `apps/web`). A validação
vive em `apps/*/env.ts` e nos `keys.ts` dos pacotes. Uma string vazia sempre conta como ausente.

Legenda da coluna "Prod": **obrigatória** (sem ela o app não sobe ou uma função central não existe),
**recomendada**, **opcional**.

### Firebase

| Var | Apps | Prod | O que muda | Vazia |
|-----|------|------|------------|-------|
| `FIREBASE_ADMIN_PROJECT_ID` · `FIREBASE_ADMIN_CLIENT_EMAIL` · `FIREBASE_ADMIN_PRIVATE_KEY` | api, app, web | obrigatória | Credencial do servidor. Na `api` é o acesso ao Firestore; em `app` e `web` cria e verifica o cookie de sessão | A `api` não sobe nem faz build. `app` e `web` ficam sem sessão |
| `FIREBASE_WEB_API_KEY` | api | obrigatória | Login, cadastro, confirmação de redefinição de senha e de verificação de e-mail pela API | Cai para `NEXT_PUBLIC_FIREBASE_API_KEY` |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID`, `_MESSAGING_SENDER_ID`, `_MEASUREMENT_ID` | app, web (`_PROJECT_ID` também na api) | obrigatória | Config do Firebase no browser. `_AUTH_DOMAIN` também entra na CSP | Em desenvolvimento o client cai num app de mentira; login real não funciona |
| `FIREBASE_STORAGE_BUCKET` | api | opcional | Liga o upload de arquivo | `POST /files` responde `STORAGE_NOT_CONFIGURED`. Cai para `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | app | opcional | Mostra o seletor de arquivo e libera o host do bucket na CSP | Formulário com campo de URL |
| `FIRESTORE_EMULATOR_HOST` · `FIREBASE_AUTH_EMULATOR_HOST` · `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | api, app, web | só em dev | Aponta para os emuladores | Usa o projeto real. **Não defina em produção** |

### URLs e sessão

| Var | Apps | Prod | O que muda | Vazia |
|-----|------|------|------------|-------|
| `NEXT_PUBLIC_API_URL` | app, web | obrigatória | Base do `@repo/sdk` | O front não alcança a API |
| `NEXT_PUBLIC_APP_URL` | api, app, web | obrigatória | Host do painel: botões "entrar" da web, links dos e-mails de conta, retorno do checkout e do portal da Stripe | E-mails de conta respondem `EMAIL_NOT_CONFIGURED`; cobrança desligada |
| `NEXT_PUBLIC_WEB_URL` | api, app, web | obrigatória | Host da landing: redirecionamentos do modo `simple`, base do JSON-LD, `sitemap.xml` e `robots.txt` | Cai para `VERCEL_PROJECT_PRODUCTION_URL` e depois `localhost:3001` |
| `NEXT_PUBLIC_DOCS_URL` | web | opcional | Link "Documentação" no header e no footer da web | Link oculto |
| `CORS_ORIGIN` | api | obrigatória | Origens do browser que podem chamar a API, separadas por vírgula | Em produção a API não sobe. Fora dela vale `localhost:3000,3001` |
| `SESSION_COOKIE_DOMAIN` | app, web | obrigatória com subdomínios | Domínio do cookie de sessão compartilhado | Cookie preso a um host; a sessão não passa da web para o painel |
| `SESSION_COOKIE_MAX_AGE_DAYS` | app, web | opcional | Vida do cookie, de 0,0035 a 14 dias | 5 dias |
| `SESSION_ABSOLUTE_MAX_AGE_DAYS` | app, web | opcional | Teto da sessão desde o login original; a renovação nunca passa dele | 30 dias, limitado entre a vida do cookie e 90 |
| `VERCEL_PROJECT_PRODUCTION_URL` | api, app, web | automática na Vercel | Base do `metadataBase` | Sem URL absoluta na metadata |

### Produto

| Var | Apps | Prod | O que muda | Vazia |
|-----|------|------|------------|-------|
| `NEXT_PUBLIC_PRODUCT_MODE` | api, app, web | opcional | `subscription`: o usuário opera no painel. `simple`: opera na web e o painel é só do admin. Mesmo valor nos três. Ver [`AUTH-SSO.md`](AUTH-SSO.md) | `subscription` |
| `ONBOARDING_ENABLED` | app | opcional | `"false"` manda o usuário novo direto ao painel, sem o passo de nome e idioma | Onboarding ligado |
| `NEXT_PUBLIC_DEFAULT_LOCALE` | app, web | opcional | Idioma quando a URL não traz prefixo | `pt-br` |
| `NEXT_PUBLIC_PRIVACY_CONTACT` | web | recomendada | Endereço publicado como canal de privacidade nas páginas legais | As páginas apontam para o formulário de `/contact` |

### Marca e SEO

| Var | Apps | Prod | O que muda | Vazia |
|-----|------|------|------------|-------|
| `NEXT_PUBLIC_APP_NAME` | api, app, web | recomendada | Nome do produto em telas, metadata, JSON-LD, e-mails e remetente ([seção 3.1](#31-marca)) | `next-boilerplate` |
| `NEXT_PUBLIC_APP_LOGO_URL` | api, app, web | recomendada | Logo em telas e e-mails; a origem entra na CSP | Ícone genérico em cada superfície |
| `NEXT_PUBLIC_APP_SUPPORT_EMAIL` | api (app e web por simetria) | recomendada | Linha de suporte no rodapé dos e-mails para usuários | Sem a linha |
| `NEXT_PUBLIC_APP_AUTHOR` · `NEXT_PUBLIC_APP_AUTHOR_URL` | app, web | opcional | Autor e `publisher` da metadata | O nome da marca; sem URL |
| `NEXT_PUBLIC_TWITTER_HANDLE` | app, web | opcional | `twitter:creator` | Sem a tag |

### E-mail, pagamentos, segurança e analytics

| Var | Apps | Prod | O que muda | Vazia |
|-----|------|------|------------|-------|
| `RESEND_TOKEN` · `RESEND_FROM` | api, web (app só valida) | obrigatória | Envio de e-mail. `RESEND_FROM` é o remetente e a caixa que recebe o formulário de contato | Sem recuperação de senha, sem verificação de e-mail, sem formulário de contato |
| `STRIPE_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` | api | opcional | Liga a cobrança. Preencha as duas ou nenhuma; prefixo errado derruba o build | Cobrança desligada |
| `ARCJET_KEY` | api, app, web | recomendada | Limite de requisições nas rotas públicas; prefixo errado derruba o build de app e web e desliga o limite na api (erro no boot) | Sem limite; a API avisa no boot |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | app, web | opcional | Google Analytics com banner de consentimento | Sem analytics nem tag do Google |

### Só de desenvolvimento

`ANALYZE=true` liga o bundle analyzer em `pnpm --filter <app> analyze`. `DEV_ADMIN_EMAIL`,
`DEV_ADMIN_PASSWORD` e `DEV_ADMIN_ALLOW_REAL_PROJECT` só existem para o script de primeiro admin ([seção
9](#9-primeiro-admin-em-produção)).

## 9. Primeiro admin em produção

O cadastro público sempre cria um usuário comum, e a rota que cria admin exige um admin logado. O primeiro
sai de um script, rodado da sua máquina contra o projeto real:

1. No `apps/api/.env` local, esvazie o bloco do emulador e preencha a service account do projeto de
   produção.
2. Rode, passando a senha por variável para ela não ficar no histórico do shell:

   ```bash
   DEV_ADMIN_EMAIL=<email> DEV_ADMIN_PASSWORD=<senha> \
     pnpm --filter api create-dev-admin --allow-real-project
   ```

3. Volte o `.env` local para o emulador.

O script é idempotente: rodar de novo com o mesmo e-mail redefine a senha e confirma o papel de admin. Os
próximos admins podem ser criados pela área admin. Detalhes: [`SETUP.md`](SETUP.md), seção "Primeiro
admin".

## 10. Onde entra o código do produto

- **Domínio do produto vai em `apps/*`.** `packages/*` continua genérico, para que as melhorias do core
  continuem entrando por `git merge upstream/main` sem conflito. As exceções são os pacotes de integração
  (`auth`, `email`, `payments`).
- **Recurso novo segue o CRUD `entity`**: SDK, rota na API com guard e Zod, repositório e mapper do
  Firestore, hooks e telas no app, chaves nos três idiomas. A skill `/new-crud` gera a estrutura.
- **Coleção nova com consulta composta** precisa de entrada em `firestore.indexes.json` e de um novo
  `deploy --only firestore:indexes`.
- **Origem externa nova** (uma API de terceiro, um CDN de imagem) precisa entrar na CSP do proxy do app
  correspondente (`apps/app/proxy.ts`, `apps/web/proxy.ts`), ou o browser bloqueia.
- **O `entity` de exemplo** pode ficar como referência ou ser removido. Se remover, apague as quatro camadas
  juntas (as pastas estão no [README](../README.md#crud-de-referência)).

## 11. Conferência antes de abrir para usuários

Com os três apps no ar:

- [ ] Uma leitura direta do Firestore com a chave pública responde **403**
      ([`SECURITY.md`](SECURITY.md), seção "Verificar que o furo está fechado").
- [ ] Cadastro, login com e-mail e login com Google funcionam no domínio de produção.
- [ ] Ao entrar pela landing, o painel abre já logado (sessão compartilhada).
- [ ] O ciclo de redefinição de senha chega por e-mail e funciona até o fim.
- [ ] O formulário de contato entrega na caixa do `RESEND_FROM`.
- [ ] Nome, logo e ícones do produto aparecem no painel, na landing e nos e-mails; nenhum
      `next-boilerplate` à vista.
- [ ] Política de privacidade e termos reescritos para o produto.
- [ ] Se cobra: um checkout em modo de teste chega ao painel como assinatura ativa, e o evento aparece
      entregue no Dashboard da Stripe.
- [ ] O primeiro admin entra em `/admin`.
- [ ] Proteção da `main` ligada no GitHub.

Depois, percorra o [`PRE-PRODUCTION.md`](PRE-PRODUCTION.md) inteiro. Ele traz os passos de console, DNS e
painel que nenhum teste cobra, com o comando de verificação de cada um.

## 12. Mapa dos arquivos que o fork altera

| Arquivo | Por quê | Seção |
|---------|---------|-------|
| `package.json` (raiz) | Nome, `engines` e resíduos do CLI de origem | [1](#1-criar-o-repositório-do-produto) |
| `tsup.config.ts`, `.autorc`, `CHANGELOG.md` | Resíduos do projeto de origem | [1](#1-criar-o-repositório-do-produto) |
| `license.md` | Copyright do produto | [1](#1-criar-o-repositório-do-produto) |
| `.firebaserc` | Projeto Firebase padrão (ou use `--project`) | [4](#4-projeto-firebase) |
| `apps/app/app/favicon.ico`, `icon.png`, `apple-icon.png` | Ícones do painel | [3.2](#32-ícones-imagens-e-cores) |
| `apps/web/app/[locale]/icon.png`, `apple-icon.png`, `opengraph-image.png` | Ícones e imagem social da landing | [3.2](#32-ícones-imagens-e-cores) |
| `packages/email/brand.ts` | Cores dos e-mails | [3.2](#32-ícones-imagens-e-cores) |
| `packages/design-system/styles/globals.css` | Cores do tema | [3.2](#32-ícones-imagens-e-cores) |
| `packages/internationalization/translations/apps/web/pages/*` | Textos da landing, preços e contato | [3.3](#33-textos) |
| `packages/internationalization/translations/apps/web/pages/legal/*` | Política de privacidade e termos | [3.3](#33-textos) |
| `packages/internationalization/translations/packages/email/*` | Textos dos e-mails | [3.3](#33-textos) |
| `firestore.indexes.json` | Índices das coleções novas do produto | [10](#10-onde-entra-o-código-do-produto) |
| `apps/app/proxy.ts`, `apps/web/proxy.ts` | Origens externas novas na CSP | [10](#10-onde-entra-o-código-do-produto) |
| Painel da Vercel dos três projetos | Todas as variáveis de produção | [6](#6-vercel), [8](#8-referência-das-variáveis-de-ambiente) |

O que **não** precisa mudar: `firestore.rules` (o `deny-all` vale para qualquer produto), `firebase.json`,
`turbo.json`, `biome.jsonc`, `.github/workflows/ci.yml` e os `vercel.json`.
