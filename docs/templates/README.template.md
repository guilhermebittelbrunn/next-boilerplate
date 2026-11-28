<!--
MODELO DE README PARA FORKS DO next-boilerplate

Copie este arquivo para a raiz do fork como README.md e preencha. Regras:

1. Mantenha a ordem das seções, os títulos e os emojis. Todo produto da casa tem o mesmo esqueleto, então
   quem abre um repositório novo sabe onde procurar cada coisa.
2. Troque todo marcador {{ASSIM}}. Antes de entregar, `grep -n "{{" README.md` tem de sair vazio.
3. Uma seção que não se aplica ao produto (por exemplo, cobrança num produto gratuito) não é apagada:
   escreva uma linha dizendo que o produto não tem aquilo e por quê.
4. A seção "🎬 Demonstração" usa o vídeo e o GIF gerados pela etapa 4 da entrega
   (docs/delivery/04-documentation.md), com a skill brag-slim. Não use print estático no lugar.
5. Nada de segredo, URL interna, e-mail de pessoa real ou credencial de produção. As contas do seed
   (`@example.com`) existem só no emulador e podem aparecer.
6. Português, frases curtas, sem superlativo. Rode a skill `humanizer` antes de salvar.
7. Apague este comentário quando terminar.

A regra que manda usar este modelo está em docs/FORKING.md (seção 1) e na etapa 4 da entrega.
-->

<div align="center">

# {{EMOJI}} {{NOME_DO_PRODUTO}}

**{{Uma frase: o que o produto faz e para quem.}}**<br/>
{{Uma ou duas linhas: o problema que ele resolve e o que a pessoa ganha ao usar.}}

<p align="center">
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&amp;logoColor=white" alt="Next.js 16" height="20"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&amp;logoColor=black" alt="React 19" height="20"></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&amp;logoColor=white" alt="TypeScript strict" height="20"></a>
  <a href="https://firebase.google.com"><img src="https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?logo=firebase&amp;logoColor=black" alt="Firebase Auth + Firestore" height="20"></a>
  <!-- Acrescente um badge por serviço que o produto usa de fato (Stripe, Resend, ...). Remova os que não usa. -->
  <a href="{{URL_DO_CI}}"><img src="{{URL_DO_BADGE_DO_CI}}" alt="CI" height="20"></a>
</p>

[🌐 Site]({{URL_DA_LANDING}}) ·
[🖥️ Painel]({{URL_DO_PAINEL}}) ·
[🎬 Demonstração](#-demonstração) ·
[⚡ Começando](#-começando) ·
[📚 Documentação](#-documentação)

</div>

---

## 🎬 Demonstração

<p align="center">
  <a href="apps/web/public/showcase/showcase.mp4">
    <img src="apps/web/public/showcase/showcase.gif" alt="{{Descrição do que o GIF mostra, para leitor de tela}}" width="720">
  </a>
</p>

{{Uma linha sobre o que o vídeo mostra.}} O vídeo completo, com som, está em
[`apps/web/public/showcase/showcase.mp4`](apps/web/public/showcase/showcase.mp4) e fica publicado em
`{{URL_DA_LANDING}}/showcase/showcase.mp4` para uso em divulgação.

## 📑 Sumário

- [🎬 Demonstração](#-demonstração)
- [✨ Funcionalidades](#-funcionalidades)
- [🗂️ Estrutura](#️-estrutura)
- [🧰 Tecnologias](#-tecnologias)
- [⚡ Começando](#-começando)
- [⌨️ Comandos](#️-comandos)
- [🌍 Ambientes](#-ambientes)
- [✅ Entrega](#-entrega)
- [📐 Padrões do repositório](#-padrões-do-repositório)
- [🌿 Branches e commits](#-branches-e-commits)
- [🤖 Desenvolvimento com IA](#-desenvolvimento-com-ia)
- [📚 Documentação](#-documentação)

---

## ✨ Funcionalidades

<!-- Descreva o que o PRODUTO faz, do ponto de vista de quem usa. O que veio pronto do boilerplate fica
     resumido na última subseção, e não repetido aqui. Itens opcionais, ligados por variável de ambiente,
     levam o 🔌. -->

### 🖥️ `apps/app` · {{nome do painel para o usuário}}

<table>
<tr><td valign="top" width="50%">

**{{Emoji}} {{Grupo de funcionalidades 1}}**

- {{Funcionalidade, em uma linha}}
- {{Funcionalidade}}

</td><td valign="top" width="50%">

**{{Emoji}} {{Grupo de funcionalidades 2}}**

- {{Funcionalidade}}
- {{Funcionalidade}}

</td></tr>
</table>

### 🌐 `apps/web` · {{nome da landing}}

- {{Páginas e o que cada uma faz}}

### ⚙️ `apps/api` · API HTTP

| Grupo | Rotas |
|-------|-------|
| {{Emoji}} {{Recurso do produto}} | `{{rota}}`, `{{rota}}` |
| 🧱 Herdadas do core | autenticação, conta, admin, notificações, organização, pagamentos, arquivos, saúde |

### 🧱 Herdado do next-boilerplate

Login com e-mail, Google e link por e-mail, área de conta com sessões e LGPD, área admin com impersonação e
trilha de auditoria, notificações, organizações com convite, assinaturas Stripe 🔌, e-mails transacionais,
i18n em pt-br, en e es, tema claro e escuro. A lista completa está no
[README do boilerplate]({{URL_DO_README_DO_BOILERPLATE_NA_VERSAO_DO_FORK}}).

---

## 🗂️ Estrutura

```
apps/
├── app/      🖥️  {{papel no produto}}                    :3000
├── web/      🌐  {{papel no produto}}                    :3001
├── api/      ⚙️  API HTTP                                :3002
├── email/    ✉️  preview dos templates de e-mail         :3003  (só local)
└── e2e/      🧪  suíte Playwright dos fluxos críticos
packages/
├── sdk/                   cliente tipado da API
├── design-system/         componentes, tema, HookForm*
├── internationalization/  dicionários pt-br, en e es
└── ...                    {{pacotes acrescentados pelo produto, se houver}}
```

---

## 🧰 Tecnologias

| Camada | Escolha |
|--------|---------|
| 📦 Monorepo | Turborepo + pnpm `10.19.0`, Node `22.12.0` |
| ⚛️ Front e API | Next.js 16 (App Router), React 19 |
| 🎨 Interface | Tailwind v4, shadcn/ui sobre Radix, Sonner, recharts; contrato visual em [`docs/DESIGN.md`](docs/DESIGN.md) |
| 🔐 Autenticação | Firebase Auth, sessão compartilhada entre `web` e `app` |
| 🗄️ Banco | Firestore, acessado só pela API |
| {{Emoji}} {{Camada que o produto acrescentou}} | {{Escolha e por quê, em poucas palavras}} |
| ▲ Deploy | Vercel, um projeto por app |

---

## ⚡ Começando

**Pré-requisitos:** Node `22.12.0`, pnpm `10.19.0` e JDK 21+ (só para os emuladores do Firebase).

```bash
nvm use
pnpm install

cp apps/api/.env.example apps/api/.env
cp apps/app/.env.example apps/app/.env
cp apps/web/.env.example apps/web/.env

pnpm emulators   # terminal 1
pnpm seed        # terminal 2
pnpm dev         # terminal 2
```

| App | URL |
|-----|-----|
| 🖥️ Painel | http://localhost:3000 |
| 🌐 Landing | http://localhost:3001 |
| ⚙️ API | http://localhost:3002 |

Contas criadas pelo seed, que só existem no emulador:

| E-mail | Papel | Senha |
|--------|-------|-------|
| `admin@example.com` | admin | `demo1234` |
| `user@example.com` | comum | `demo1234` |

<!-- Se o produto tem seed próprio, com outros papéis ou dados, descreva aqui. -->

---

## ⌨️ Comandos

```bash
pnpm dev                    # todos os apps
pnpm check                  # lint e formatação (Biome)
pnpm --filter <app> typecheck
pnpm test                   # Vitest + suíte contra emulador (JDK 21)
pnpm e2e                    # Playwright + axe
pnpm build                  # build de produção
```

<!-- Acrescente os comandos próprios do produto (scripts de importação, jobs, etc.). -->

---

## 🌍 Ambientes

| Ambiente | Landing | Painel | API | Firebase | Branch |
|----------|---------|--------|-----|----------|--------|
| Produção | {{URL}} | {{URL}} | {{URL}} | `{{project-id}}` | `main` |
| Preview | deploy por PR na Vercel | | | `{{project-id}}` | PRs |

Variáveis de ambiente de cada app: [`docs/FORKING.md`](docs/FORKING.md), seção 8. Os valores ficam no
painel da Vercel e nunca no repositório.

---

## ✅ Entrega

O produto passou pela [etapa de entrega](docs/delivery/README.md) antes de ir para produção.

| Etapa | Situação | Relatório |
|-------|----------|-----------|
| 1. 🔒 Validação de segurança | {{aprovada / pendente}} | [{{data}}](docs/delivery/reports/{{AAAA-MM-DD}}/report.md#1-segurança) |
| 2. 🛡️ Infra e hardening | {{aprovada / pendente}} | [{{data}}](docs/delivery/reports/{{AAAA-MM-DD}}/report.md#2-infra-e-hardening) |
| 3. 📈 Qualidade do produto | {{aprovada / pendente}} | [{{data}}](docs/delivery/reports/{{AAAA-MM-DD}}/report.md#3-qualidade-do-produto) |
| 4. 📚 Documentação | {{aprovada / pendente}} | [{{data}}](docs/delivery/reports/{{AAAA-MM-DD}}/report.md#4-documentação) |

---

## 📐 Padrões do repositório

As regras do core valem para o produto: [`AGENTS.md`](AGENTS.md), os `CLAUDE.md` de cada pasta e o
[checklist de revisão](docs/review-checklist.md). Em resumo: o front só fala com a API pelo `@repo/sdk`,
nenhum texto de UI fica fora do dicionário, erro de API é um código, autorização sempre na API e
validação com Zod na borda. A interface segue o contrato de [`docs/DESIGN.md`](docs/DESIGN.md): um acento
só, tokens em vez de valor solto, estados vazio/carregando/erro em toda tela com dados e o gate de 6
perguntas antes de dar uma tela como pronta.

<!-- Acrescente as regras específicas do produto, se houver (por exemplo, um domínio com regra fiscal). -->

---

## 🌿 Branches e commits

| | Formato | Exemplo |
|---|---------|---------|
| 🌿 Branch | `<project>/<type>/<title>` | `api/feat/{{exemplo}}` |
| 💬 Commit | `type(project): descrição curta` | `feat(api): {{exemplo}}` |
| 🔀 PR | `type(project): título` | `feat(api): {{exemplo}}` |

Nunca commite em `main` ou `production`. Detalhes em [`.claude/rules/git-commits.md`](.claude/rules/git-commits.md).

---

## 🤖 Desenvolvimento com IA

```
/spec  →  /analyze  →  /develop  →  /review  →  /test        (/deliver antes de cada entrega)
```

Comece por [`docs/AI-WORKFLOW.md`](docs/AI-WORKFLOW.md) e [`docs/TASK-PIPELINE.md`](docs/TASK-PIPELINE.md).

---

## 📚 Documentação

| | Documento | Assunto |
|---|-----------|---------|
| ✅ | [`docs/delivery/README.md`](docs/delivery/README.md) | Etapa de entrega e relatórios |
| 🚀 | [`docs/FORKING.md`](docs/FORKING.md) | Como o produto foi criado a partir do boilerplate |
| 🎨 | [`docs/DESIGN.md`](docs/DESIGN.md) | Contrato de interface: tokens, movimento, estados e o gate de cada tela |
| 🧯 | [`docs/PRE-PRODUCTION.md`](docs/PRE-PRODUCTION.md) | Passos de console, DNS e painel |
| 🔒 | [`docs/SECURITY.md`](docs/SECURITY.md) | Modelo de segurança |
| {{Emoji}} | {{Documento próprio do produto}} | {{Assunto}} |

---

<div align="center">

📄 {{Licença}} · ver [`license.md`](license.md)

</div>
