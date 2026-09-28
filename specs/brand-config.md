---
id: brand-config
title: Marca num lugar só e roteiro de criação de fork
status: in-progress
value: alto
effort: M
audience: dx
area: [apps/app, apps/web, packages/email, packages/seo, packages/next-config, docs]
mode: ambos
depends_on: []
contends_on: [packages/email/brand.ts, packages/seo/metadata.ts, apps/web/shared/lib/seo.ts, apps/app/shared/components/ui/Sidebar.tsx, "apps/app/app/[locale]/(unauthenticated)/layout.tsx"]
feature: brand-config
updated: 2026-09-27
---

# Marca num lugar só e roteiro de criação de fork

## Problema

Este repositório existe para virar muitos MVPs, e o primeiro passo de cada um é dar nome ao produto. Hoje o
nome aparece em pelo menos cinco lugares que não conversam: a landing e os títulos das páginas leem uma
variável de ambiente, os e-mails usam "Acme" escrito no código, o painel ao lado do login e do cadastro do
app mostra "Acme Inc" e um depoimento de exemplo, a barra lateral do app mostra o texto fixo "company name"
e o app não tem favicon. Quem cria um fork descobre esses pontos um a um, geralmente quando um
cliente vê "Acme" num e-mail de redefinição de senha.

Também não existe um roteiro de criação de fork. O que um fork precisa trocar (nome, projeto Firebase, domínios,
variáveis, textos legais) está espalhado entre `docs/SETUP.md`, `docs/PRE-PRODUCTION.md` e comentários.

## O que já existe no repo

- `packages/seo/metadata.ts:14` e `apps/web/shared/lib/seo.ts:17-19` leem `NEXT_PUBLIC_APP_NAME`, com padrão
  `"next-boilerplate"`. A web usa o nome no header (`header/index.tsx:176`), no footer (`footer.tsx:63`) e no
  JSON-LD (`(home)/page.tsx:30`, `:36`, `:43`). A variável não está declarada em nenhum `keys.ts`, e só o
  `apps/web/.env.example:56` a lista.
- A `apps/app` também depende dessa variável sem saber: seis páginas montam o título com `createMetadata`
  de `@repo/seo` (`sign-in`, `sign-up`, `forgot-password`, `reset-password`, `verify-email` e `onboarding`),
  mas o `apps/app/.env.example` não a declara, então o título dessas telas sai com `next-boilerplate` em todo
  fork que seguir o exemplo. As páginas do painel não têm `<title>` (achado da allowlist de acessibilidade).
- `apps/app/app/[locale]/(unauthenticated)/layout.tsx:24` escreve `Acme Inc` direto no JSX do painel lateral
  do login e do cadastro, ao lado de um `CommandIcon` genérico (`:23`). O mesmo painel mostra um depoimento
  de exemplo: o texto vem do dicionário (`signIn.layout.description`, lido em `:33-36`), mas o autor
  `Sofia Davis` está cravado em `:39`. O dicionário tem `layout.title: "Acme Inc"` e `layout.author: "Sofia
  Davis"` nos três idiomas (`translations/apps/app/pages/signIn/index.ts:26`, `:29`, `:56`, `:59`, `:86`,
  `:89`), e nenhum código lê essas duas chaves.
- `packages/email/brand.ts:6-17` — `emailBrand` com `name: "Acme"`, `supportEmail: "support@example.com"`,
  `logoUrl` vazio e cores em hex, tudo fixo. Os apps não o reutilizam, e o `supportEmail` não tem leitor
  (achado já registrado).
- `apps/app/shared/components/ui/Sidebar.tsx:79` — `<span className="text-sm">company name</span>`, texto fixo
  fora do dicionário, com um avatar vazio no lugar do logo.
- `apps/app/app/` não tem `favicon.ico` nem `icon.*`; o pedido do navegador cai no segmento `[locale]` (achado
  registrado). A web tem `icon.png`, `apple-icon.png` e `opengraph-image.png` em `apps/web/app/[locale]/`, e
  o logo do header é um SVG inline (`header/index.tsx:163-175`).
- `package.json:2-5` da raiz ainda se chama `next-forge` e declara um `bin` para `dist/index.js`, gerado de
  `scripts/index.ts`, que não existe.
- `docs/SETUP.md:88` cita as variáveis de marca; não há documento que liste, em ordem, o que um fork troca.
- `Acme` aparece em mais três lugares que **não** são marca e ficam como estão: o dado de exemplo do seed
  (`Acme Franchise`, em `apps/api/scripts/seed-emulator.mjs:35` e `apps/e2e/support/seedAccounts.ts:12`, que
  a suíte E2E procura pelo nome) e o comentário de `packages/email/keys.ts:22`, que cita o formato de
  remetente da documentação da Resend.
- **Lacuna:** nenhuma fonte única de nome, logo e contato de suporte, e nenhum roteiro de criação de fork.

> **Correção da auditoria de 2026-09-27.** A versão de 2026-09-26 contava quatro lugares e deixava de fora o
> painel das telas de entrada do app (`(unauthenticated)/layout.tsx`), que é a primeira tela que um cliente
> do fork vê. O arquivo entrou no `contends_on`. O sinal de pronto do `grep` foi reescrito porque, como
> estava, reprovaria a entrega pelo dado de seed. As outras âncoras desta seção foram lidas de novo no disco
> e conferem.

## Evidência de mercado

- Nota: [`research/saas-starter-feature-benchmark.md`](research/saas-starter-feature-benchmark.md), adendo de
  2026-09-26.
- Prevalência: **4 de 4 verificados** têm um ponto único de configuração por app. Makerkit usa
  `app.config.ts` alimentado por env e validado com Zod no build; ShipFast chama o `config.js` de "the
  backbone of the app"; Supastarter tem um `config.ts` por app; o next-forge, origem deste fork, cria o
  projeto com `npx next-forge@latest init`. Os outros seis do painel não foram verificados neste tema.
- A lente aqui é `dx`: quem sente falta é quem cria o fork, e este repositório cria forks por definição.

## Proposta — corte de MVP

- [ ] Um único lugar define nome do produto, logo, e-mail de suporte e URL do site, com padrão neutro. App,
      web, e-mails e metadados leem dali.
- [ ] A barra lateral do app, o painel das telas de login e cadastro do app, o header da web e os e-mails
      mostram o nome e o logo configurados; nenhum "Acme Inc", "Acme" de marca ou "company name" sobra no
      código.
- [ ] O app ganha favicon e ícone, e o pedido de `/favicon.ico` deixa de cair na rota de idioma.
- [ ] Um documento de criação de fork lista, em ordem, o que trocar: marca, projeto Firebase, domínios e
      variáveis de cada app, textos legais, e aponta para o `docs/PRE-PRODUCTION.md` no que já está lá.
- [ ] Valor de marca ausente não quebra o build nem o boot; o padrão neutro aparece.

### Fora do corte

- **CLI de criação de fork** no molde do `next-forge init`. O documento vem primeiro; o script só vale depois
  que o roteiro estiver estável. Remover o `bin` quebrado da raiz é achado, não depende desta spec.
- **Cores do tema.** O `--primary` já mora num lugar só (`packages/design-system/styles/globals.css:16`, `:55`).
  Unificar as cores hex dos e-mails com o tema do design system muda a paleta de e-mail e é outro trabalho.
- **Textos das páginas legais.** São conteúdo do fork; o documento só aponta onde ficam.
- Tema por cliente ou multi-marca no mesmo deploy.

## Impacto por camada

| Camada | Impacto |
|--------|---------|
| `packages/sdk` | Nenhum. |
| `apps/api` | Nenhum, salvo se o remetente dos e-mails passar a ler o nome configurado. |
| `apps/app` | Barra lateral e painel das telas de entrada com nome e logo; favicon e ícone; metadados com o nome. |
| `apps/web` | Header, footer, metadados e JSON-LD lendo a fonte única. |
| `packages/*` | `email` deixa de ter marca própria; `seo` e `next-config` declaram as variáveis de marca. |
| Infra/env | Variáveis de marca públicas e opcionais, declaradas nos `keys.ts`; `.env.example` dos três apps atualizados. |

## Riscos e trade-offs

- **Logo em e-mail precisa de URL absoluta e pública.** Arquivo do repositório não serve dentro de um e-mail;
  o padrão sem logo tem de continuar funcionando.
- **Variável pública no build.** Nome e logo em `NEXT_PUBLIC_*` entram no bundle na hora do build; trocar a
  marca pede novo deploy. Para um MVP isso é aceitável, e precisa estar no documento.
- **Contenção com `accessibility-conformance`** é baixa: aquela spec mexe no design system, esta nos
  consumidores. Se o `/analyze` decidir mexer no `globals.css`, o `contends_on` muda.
- Custo em dinheiro: zero.

## Sinais de pronto

- Trocar o nome numa configuração muda o header da web, a barra lateral do app, o título das páginas e o
  remetente visível dos e-mails.
- `grep` por "Acme" e "company name" em `apps/` e `packages/` só devolve o dado de seed (`Acme Franchise`) e
  o comentário de `packages/email/keys.ts`.
- O app responde ao `/favicon.ico` com um ícone.
- Uma pessoa que nunca viu o repositório cria um fork seguindo só o documento.

## Perguntas em aberto

- A fonte única é um módulo com valores padrão lidos de env, ou env pura? — **recomendação:** módulo em
  pacote compartilhado com leitura de env e padrão neutro, como o Makerkit; evita repetir o fallback em cada
  app.
- O documento de criação de fork substitui partes do `docs/SETUP.md`? — **recomendação:** não; ele ordena e
  aponta, e o `SETUP.md` continua sendo a referência de ambiente local.
- O que fazer com o depoimento de exemplo do painel de login (`Sofia Davis`)? — **recomendação:** tirar o
  depoimento e deixar no painel só nome e logo da marca. Um depoimento inventado não é configuração de marca,
  e o fork que quiser um põe o seu. As chaves `layout.title` e `layout.author`, que ninguém lê, saem junto.
