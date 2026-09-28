<div align="center">

# 🧱 next-boilerplate

**Monorepo full-stack para criar MVPs em série.**<br/>
Cada produto nasce como um fork, troca marca, domínio e credenciais, e já sai com login, painel, área
admin, assinaturas, e-mails, i18n e LGPD funcionando.

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&amp;logoColor=white" alt="Next.js 16" height="20"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&amp;logoColor=black" alt="React 19" height="20"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript strict" height="20"></a>
  <a href="https://tailwindcss.com"><img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&amp;logoColor=white" alt="Tailwind CSS 4" height="20"></a>
  <a href="https://firebase.google.com"><img src="https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&amp;logoColor=black" alt="Firebase Auth + Firestore" height="20"></a>
  <a href="https://stripe.com"><img src="https://img.shields.io/badge/Stripe-Billing-635BFF?logo=stripe&amp;logoColor=white" alt="Stripe Billing" height="20"></a>
  <a href="https://turborepo.com"><img src="https://img.shields.io/badge/Turborepo-pnpm-EF4444?logo=turborepo&amp;logoColor=white" alt="Turborepo + pnpm" height="20"></a>
  <a href="license.md"><img src="https://img.shields.io/badge/license-MIT-green" alt="Licença MIT" height="20"></a>
</p>

[🚀 Criar um projeto](docs/FORKING.md) ·
[✨ Funcionalidades](#-o-que-um-fork-herda) ·
[⚡ Começando](#-começando) ·
[📐 Padrões](#-padrões-do-repositório) ·
[📚 Documentação](#-documentação)

</div>

---

> [!TIP]
> **Vai criar um produto novo?** Siga o **[guia de criação e lançamento de projeto](docs/FORKING.md)**. Ele
> lista, em ordem, os arquivos que o fork altera, cada variável de ambiente e o que ela muda, os serviços que
> precisam ser configurados e como publicar em produção.

## 📑 Sumário

- [✨ O que um fork herda](#-o-que-um-fork-herda)
- [🗂️ Estrutura](#️-estrutura)
- [🧰 Tecnologias](#-tecnologias)
- [⚡ Começando](#-começando)
- [⌨️ Comandos](#️-comandos)
- [📐 Padrões do repositório](#-padrões-do-repositório)
- [🌿 Branches e commits](#-branches-e-commits)
- [🤖 Desenvolvimento com IA](#-desenvolvimento-com-ia)
- [📚 Documentação](#-documentação)

---

## ✨ O que um fork herda

Tudo abaixo já está implementado, testado e funcionando no core. Os itens marcados com 🔌 são opcionais:
ficam desligados até a variável de ambiente correspondente ser preenchida, e o app sobe normalmente sem
eles.

### 🖥️ `apps/app` · painel do usuário e área admin

<table>
<tr><td valign="top" width="50%">

**🔐 Entrada e conta**

- Cadastro e login com e-mail e senha
- Login com Google
- Política de senha na API (mínimo de 8 caracteres)
- Verificação de e-mail e recuperação de senha por link
- Onboarding pós-cadastro (nome e idioma), desligável
- Sessão compartilhada com a landing, com renovação deslizante e teto absoluto

**👤 Área de conta** (`/account`, em abas)

- **Perfil:** nome, telefone e foto 🔌
- **Segurança:** troca de senha e encerramento das outras sessões
- **Preferências:** idioma e tema
- **Privacidade (LGPD):** exportar os próprios dados e excluir a conta
- **Cobrança:** planos, checkout e portal da Stripe 🔌

</td><td valign="top" width="50%">

**🏠 Painel comum**

- Home com widgets de resumo
- CRUD de exemplo `entity` (lista paginada, busca, criar, editar, ativar/desativar, upload de foto 🔌)
- `playground` com o catálogo do design system

**🛡️ Área admin** (`/admin`)

- Home com métricas de usuários e faixas de último acesso
- Seção de cobrança: receita do mês, assinaturas por plano e contratações recentes 🔌
- Gestão de usuários: listar, criar, editar, promover a admin e arquivar (cancelando a assinatura)
- Impersonação em modo leitura: o admin vê o painel como o usuário
- Trilha de auditoria das ações sensíveis, com filtros

</td></tr>
</table>

### 🌐 `apps/web` · landing e captação

- Home com hero, números, funcionalidades, cases, depoimentos, FAQ e chamada para ação
- Página de preços, formulário de contato (entrega por e-mail) e login/cadastro na própria landing
- Política de privacidade e termos de uso como modelo, nos 3 idiomas
- SEO: metadata por idioma com `hreflang`, Open Graph, JSON-LD, `sitemap.xml` e `robots.txt`
- Banner de consentimento de cookies com Google Consent Mode v2 🔌
- Seletor de idioma e de tema, header que reconhece a sessão e leva ao painel

### ⚙️ `apps/api` · API HTTP

| Grupo | Rotas |
|-------|-------|
| 🔑 Autenticação | `auth/sign-up`, `auth/sign-in`, `auth/sign-in/google`, `auth/me`, `auth/password/*`, `auth/email-verification/*` |
| 👤 Conta | `account` (perfil), `account/password`, `account/sessions/revoke`, `account/onboarding`, `account/export`, `account/deletion` |
| 📦 Recurso de exemplo | `entities` (CRUD com paginação por cursor), `entities/summary` |
| 🛡️ Admin | `users` (CRUD), `users/summary`, `users/activity-summary`, `audit-events` |
| 💳 Pagamentos 🔌 | `payments/plans`, `payments/checkout`, `payments/portal`, `payments/summary`, `webhooks/payments` |
| 📁 Arquivos 🔌 | `files` (upload com URL assinada) |
| ❤️ Saúde | `health`, `health/ready` |

Todas passam por guard de autorização (`requireCommonPanelApi` / `requireAdminApi`), validação Zod na
borda e erro por código (`{ error: { code } }`). Na borda HTTP: CSP e cabeçalhos de segurança, CORS por
allowlist e limite de requisições com Arcjet 🔌.

### ✉️ `apps/email` · e-mails transacionais

Preview local (porta 3003) dos templates React Email: boas-vindas, links de ação (verificação e redefinição
de senha) e contato. Os e-mails saem traduzidos no idioma do destinatário, com nome, logo e linha de
suporte da marca.

### 🧪 `apps/e2e` · testes de ponta a ponta

Suíte Playwright dos fluxos críticos com verificação de acessibilidade (axe). Sobe emulador e apps sozinha
e roda no CI em toda PR que mexe em produto.

### 🧩 Transversal

| | Recurso |
|---|---------|
| 🌍 | i18n próprio em pt-br, en e es, sem serviço de terceiros, com teste de paridade entre idiomas |
| 🎨 | Tema light, dark e system; layout responsivo mobile-first |
| 🏷️ | Marca configurável por variável de ambiente: nome, logo e e-mail de suporte |
| 🔀 | Dois modos de produto: `subscription` (o usuário opera no painel) e `simple` (opera na web) |
| 🔒 | Firestore acessado só pela API, com rules em `deny-all` |
| 🧯 | Emuladores do Firebase e seed: o stack inteiro roda offline, sem conta |
| ✅ | CI no GitHub Actions: lint, typecheck, testes, E2E e cobertura |

---

## 🗂️ Estrutura

```
apps/
├── app/      🖥️  painel do usuário e área admin          :3000
├── web/      🌐  landing, preços, contato, SEO           :3001
├── api/      ⚙️  API HTTP (Next.js no servidor)          :3002
├── email/    ✉️  preview dos templates de e-mail         :3003  (só local)
└── e2e/      🧪  suíte Playwright dos fluxos críticos
packages/
├── sdk/                   cliente tipado da API; o front só fala com a API por ele
├── design-system/         componentes shadcn, tema, HookForm* para react-hook-form
├── internationalization/  dicionários pt-br, en e es
├── auth/                  Firebase Auth (Admin e client), sessão compartilhada
├── payments/              Stripe: planos, checkout, portal, webhooks
├── email/                 templates React Email e envio via Resend
├── shared/                utilitários comuns (HTTP_STATUS, FormattedError, datas)
├── next-config/           config Next, variáveis comuns e marca (getBrand)
└── analytics/ · security/ · seo/ · typescript-config/
```

São **três deploys independentes**: `app`, `web` e `api`. O `email` só existe para visualizar os templates
durante o desenvolvimento.

> [!IMPORTANT]
> **Genérico no pacote, específico no app.** `packages/*` guarda infraestrutura que serve a qualquer
> produto; o domínio de um produto vive em `apps/*`. A exceção são os pacotes de integração (`auth`,
> `email`, `payments`).

---

## 🧰 Tecnologias

| Camada | Escolha |
|--------|---------|
| 📦 Monorepo | Turborepo + pnpm `10.19.0`, Node `22.12.0` (`.nvmrc`) |
| ⚛️ Front e API | Next.js 16 (App Router), React 19, Server Components por padrão |
| 🎨 UI | Tailwind CSS 4, shadcn/ui, tema por tokens CSS |
| 📝 Formulários e dados | react-hook-form + Zod, TanStack Query, axios (dentro do `@repo/sdk`) |
| 🔐 Autenticação | Firebase Auth, session cookie compartilhado entre `web` e `app` |
| 🗄️ Banco | Firestore, acessado só pela API via Admin SDK |
| 📁 Arquivos | Cloud Storage com URL assinada 🔌 |
| 💳 Pagamentos | Stripe Checkout, Customer Portal e webhooks 🔌 |
| ✉️ E-mail | Resend + React Email |
| 🛡️ Segurança | CSP e cabeçalhos via nosecone, rate limit com Arcjet, CORS por allowlist |
| 🧹 Qualidade | Biome/Ultracite, TypeScript estrito, Vitest, Playwright + axe |
| 🔁 CI | GitHub Actions (`verify`, `e2e`, `coverage`) |
| ▲ Deploy | Vercel, um projeto por app |

A stack foi escolhida para **começar sem custo fixo**: Vercel, Firebase (plano Spark), Stripe, Resend e
Arcjet têm faixa gratuita que cobre um MVP.

---

## ⚡ Começando

**Pré-requisitos:** Node `22.12.0`, pnpm `10.19.0` e JDK 21+ (só para os emuladores do Firebase).

```bash
nvm use
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env
cp apps/web/.env.example apps/web/.env

pnpm emulators   # terminal 1: Auth + Firestore emulados, deixe rodando
pnpm seed        # terminal 2: cria as contas e os dados de exemplo
pnpm dev         # terminal 2: sobe app, web, api e email
```

| App | URL |
|-----|-----|
| 🖥️ Painel | http://localhost:3000 |
| 🌐 Landing | http://localhost:3001 |
| ⚙️ API | http://localhost:3002 |
| ✉️ Preview de e-mail | http://localhost:3003 |
| 🧯 UI dos emuladores | http://localhost:4001 |

Os `.env.example` já apontam para os emuladores: o stack roda offline, sem conta no Google e sem tocar em
dado real. O seed cria estas contas, que só existem no emulador:

| E-mail | Papel | Senha |
|--------|-------|-------|
| `admin@example.com` | admin | `demo1234` |
| `user@example.com` | comum | `demo1234` |
| `user2@example.com` | comum | `demo1234` |

> [!NOTE]
> Instalação do JDK, variáveis por serviço e como apontar para um projeto Firebase real estão em
> [`docs/SETUP.md`](docs/SETUP.md).

---

## ⌨️ Comandos

<table>
<tr><td valign="top">

**▶️ Rodar**

```bash
pnpm dev                    # todos os apps
pnpm --filter app dev       # um app: app | web | api | email
pnpm --filter api dev:with-stripe
pnpm emulators              # Auth + Firestore
pnpm seed                   # apaga e repovoa o emulador
pnpm --filter api create-dev-admin <email> <senha>
```

</td><td valign="top">

**✅ Verificar**

```bash
pnpm check                  # lint e formatação (Biome)
pnpm fix                    # corrige o que der
pnpm --filter <app> typecheck
pnpm test                   # Vitest em todos os workspaces + suíte contra emulador (JDK 21)
pnpm turbo run lint typecheck test test:emulator
pnpm e2e                    # Playwright + axe
pnpm coverage               # cobertura em coverage/
```

</td></tr>
</table>

```bash
pnpm build                  # build de produção (depende de test)
pnpm bump-ui                # ressincroniza os componentes shadcn do design system
```

> [!TIP]
> `lint`, `typecheck` e `test` são tasks cacheadas do Turbo e não leem variável de ambiente. `test:emulator`
> roda contra os emuladores do Firebase, não usa cache e precisa de JDK 21. O job `verify` do CI roda
> exatamente `pnpm turbo run lint typecheck test test:emulator`: se passa no seu terminal, passa no GitHub.

---

## 📐 Padrões do repositório

As regras completas estão em [`AGENTS.md`](AGENTS.md), nos `CLAUDE.md` de cada pasta e no
[checklist de revisão](docs/review-checklist.md). O resumo:

| # | Regra | Na prática |
|---|-------|------------|
| 1 | 🔌 **O SDK é a única porta para a API** | No front, `apiClient.<recurso>.<ação>()`. Nada de `fetch`/axios direto nem URL fixa |
| 2 | 🌍 **Nenhum texto de UI fora do dicionário** | Label, placeholder, `aria-label`, toast e coluna vêm de `@repo/internationalization`, nos 3 idiomas |
| 3 | 🏷️ **Erro de API é um código** | A API responde `{ error: { code: "FOO_BAR" } }` e o front traduz por `apiErrors` |
| 4 | 🛡️ **Autorização sempre na API** | Guards `requireCommonPanelApi` / `requireAdminApi`. Esconder botão não é proteção |
| 5 | 🗄️ **Firestore por repositório e mapper** | Repositório estende `BaseRepository`; o mapper converte `Timestamp` em ISO |
| 6 | ✔️ **Validação na borda da API** | Zod em `parseCreateX` / `parseUpdateX` |
| 7 | 🧩 **Componentes compartilhados** | `HookFormInput`, `HookFormSelect`, `Table` e demais do design system. A prop de erro é `error` |
| 8 | 🔄 **Hooks de dados** | `useListX` e `useFindXById`, com a função de busca no mesmo arquivo |
| 9 | ⚛️ **Server Components por padrão** | `"use client"` só com estado, evento ou API do browser |
| 10 | 🔌 **Feature opcional tem modo degradado** | Sem a env, o app sobe e a API responde com `error.code`, nunca 500. String vazia conta como ausente |
| 11 | ✂️ **Mudanças mínimas, sem comentário óbvio** | Comentário só para regra externa ou trecho difícil |

Código em inglês; documentação e conversa em português.

### 🧬 CRUD de referência

O recurso `entity` implementa o fluxo inteiro e serve de modelo para recursos novos. A skill `/new-crud`
gera um recurso novo nesse formato.

| Camada | Onde |
|--------|------|
| SDK | `packages/sdk/src/actions/entity/action.ts` |
| API | `apps/api/app/(routes)/entities/`, `apps/api/(shared)/repositories/entity.repository.ts`, `.../mappers/entity.mapper.ts`, `.../validation/entity.schema.ts` |
| App | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` |
| i18n | `packages/internationalization/translations/apps/app/pages/common/entities.ts` |

---

## 🌿 Branches e commits

> [!CAUTION]
> Nunca commite em `main`, `master`, `production` ou `production-backup`. Todo trabalho entra por branch e
> Pull Request.

| | Formato | Exemplo |
|---|---------|---------|
| 🌿 Branch | `<project>/<type>/<title>` | `api/feat/entity-soft-delete` |
| 💬 Commit | `type(project): descrição curta` | `feat(api): add entity soft delete` |
| 🔀 PR | `type(project): título` | `feat(api): entity soft delete` |

- `type`: `feat`, `fix`, `style`, `chore`, `ci`, `refactor`, `perf`, `test` ou `docs`.
- `project`: a pasta em `apps/` ou o nome do pacote sem `@repo/`. Vários pacotes no mesmo commit viram
  `packages`.
- Um commit por app ou pacote, na ordem `sdk` → `api` → `app`/`web` → `internationalization`.
- Branch, commit e PR em inglês.

Não há linter de commit: o formato é convenção do time, descrita em
[`.claude/rules/git-commits.md`](.claude/rules/git-commits.md).

---

## 🤖 Desenvolvimento com IA

O repositório vem configurado para o Claude Code, com um ciclo de tarefas que começa no backlog e fecha
auditando o próprio backlog contra o código:

```
/spec  →  /analyze  →  /develop  →  /review  →  /test        (/spec --sync fecha o ciclo)
 🗺️         🧠           🛠️           🔍          🧪
```

Cada etapa tem um subagent e deixa um artefato em `docs/features/<slug>/`. O `/cycle` roda a linha inteira
sem parar para perguntar, mas nunca commita. Comece por [`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md) e
[`docs/TASK-PIPELINE.md`](docs/TASK-PIPELINE.md). O que ainda falta no core está em
[`specs/BACKLOG.md`](specs/BACKLOG.md).

---

## 📚 Documentação

| | Documento | Assunto |
|---|-----------|---------|
| 🚀 | [`docs/FORKING.md`](docs/FORKING.md) | Criar um produto a partir do boilerplate e publicar em produção |
| ✅ | [`docs/PRE-PRODUCTION.md`](docs/PRE-PRODUCTION.md) | Checklist dos passos de console, DNS e painel que nenhum teste cobra |
| ⚙️ | [`docs/SETUP.md`](docs/SETUP.md) | Ambiente local, variáveis por serviço, emuladores, CI |
| 📐 | [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Visão da arquitetura |
| 🔒 | [`docs/SECURITY.md`](docs/SECURITY.md) | Guards, rules do Firestore, CSP, CORS, rate limit |
| 🔑 | [`docs/AUTH-SSO.md`](docs/AUTH-SSO.md) | Sessão compartilhada entre `web` e `app`, modo de produto |
| 👤 | [`docs/AUTH-PANEL.md`](docs/AUTH-PANEL.md) | Painéis comum e admin, impersonação |
| 💳 | [`docs/PAYMENTS.md`](docs/PAYMENTS.md) | Assinaturas Stripe |
| 📖 | [`docs/GLOSSARY.md`](docs/GLOSSARY.md) | Vocabulário do projeto |
| 🧭 | [`AGENTS.md`](AGENTS.md) | Convenções detalhadas, incluindo design system e formulários |

---

<div align="center">

📄 Licença MIT · ver [`license.md`](license.md)

</div>
