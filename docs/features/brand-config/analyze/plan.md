# Análise e blueprint: marca num lugar só e roteiro de criação de fork

- **Spec de origem:** [`spec.md`](../spec.md) (arquivada em 2026-09-28; nasceu em `specs/brand-config.md`,
  auditada em 2026-09-27).
- **Rodada:** autônoma, dentro de um `/cycle`. Cada decisão que pediria pergunta foi tomada pela escada
  spec → padrão do repo → menor raio de impacto e está no fim, com a alternativa descartada.
- **Branch:** nenhuma criada. Quem nomeia e cria é o `revisor-codigo`, no `/review`.

## Medições que ajustam a spec

Li de novo as âncoras da spec no disco. Elas conferem, com três ajustes que mudam o trabalho:

1. **O sinal de pronto do `grep` reprovaria a entrega por fixture de teste.** "Acme" aparece como nome de
   entidade em fixtures (`apps/app/__tests__/entityFormSchema.test.ts:12`,
   `apps/api/__tests__/baseRepository.test.ts:338`, entre outros) e como remetente de exemplo nos testes de
   credencial da Resend (`packages/email/__tests__/credentials.test.ts:23`, `:69-83`). Nada disso é marca.
   O sinal passa a ser medido excluindo `__tests__` (comando no §8).
2. **Remover o depoimento deixa o layout de entrada sem uso do dicionário.** O único consumo de
   `getTranslations` em `apps/app/app/[locale]/(unauthenticated)/layout.tsx:16` é o texto do depoimento
   (`:33-36`). Sem ele, o layout não precisa mais de `params`, `resolveLocale` nem `getTranslations`, e a
   chave `signIn.layout.description` também fica órfã. O bloco `layout` inteiro sai do dicionário, não só
   `title` e `author`.
3. **O CSP do app bloquearia um logo hospedado fora do app.** `apps/app/proxy.ts:59-63` monta `img-src`
   com `self`, `data:`, `blob:`, avatar do Google e o Storage. Um `NEXT_PUBLIC_APP_LOGO_URL` num CDN
   quebraria na barra lateral e no painel de entrada. A origem do logo entra no `img-src` dos dois proxies
   (`apps/web/proxy.ts:29-40` é report-only, mas a política é a mesma).

## Etapa 1 — Análise

### 1. Contexto

#### Objetivo em uma frase

Um fork define nome, logo e e-mail de suporte do produto em variáveis de ambiente lidas por um módulo único
(`@repo/next-config/brand`), e app, web, e-mails e metadados passam a mostrar esses valores, com padrão
neutro quando ausentes. Um documento novo, `docs/FORKING.md`, lista em ordem o que um fork troca.

#### Corte desta rodada (o da spec, sem acréscimo)

- Fonte única: `packages/next-config/brand.ts` com `getBrand()` → `{ name, isDefaultName, logoUrl,
  supportEmail, siteUrl }`, lida de env na hora da chamada, com padrão neutro.
- Barra lateral do app, painel das telas de entrada do app, header, footer e JSON-LD da web, e-mails
  (corpo, assunto e remetente visível) e `createMetadata` leem de lá.
- `Acme Inc`, o depoimento `Sofia Davis`, `company name` e o `name: "Acme"` de `packages/email/brand.ts`
  saem do código.
- O app ganha `favicon.ico`, `icon.png` e `apple-icon.png` na raiz de `apps/app/app/`.
- `docs/FORKING.md` novo, com ponteiros para `SETUP.md`, `PRE-PRODUCTION.md` e `PAYMENTS.md`.
- Variáveis de marca declaradas em `packages/next-config/keys.ts` e listadas no `.env.example` de `app`,
  `web` e `api`. Valor ausente ou vazio não quebra build nem boot.

#### Fora do corte (a spec decide, o plano respeita)

- CLI de criação de fork. O `bin` quebrado e o nome `next-forge` do `package.json:2-5` da raiz ficam como
  estão; o `FORKING.md` só diz ao fork que renomeie o pacote.
- Cores. `packages/email/brand.ts` continua com a paleta hex do e-mail; o `--primary` do design system não
  muda.
- Textos das páginas legais. O documento aponta onde ficam.
- Multi-marca no mesmo deploy.
- `<title>` das páginas do painel. Está no corte de `accessibility-conformance` (`specs/accessibility-conformance.md:90`).
  Quando aquela spec criar os títulos, eles pegam a marca pelo `createMetadata`.

### 1.2 Apps impactados, painel e modo de produto

| Onde | O que muda |
|------|------------|
| `packages/next-config` | `brand.ts` novo; `keys.ts` declara as variáveis; ganha setup de teste Vitest. |
| `packages/seo` | `createMetadata` lê o nome de `getBrand()`. Nova dependência de workspace `@repo/next-config`. |
| `packages/email` | Nome, logo e suporte vêm de `getBrand()`; `brand.ts` fica só com a paleta; `sendEmail` compõe o remetente com o nome configurado. Nova dependência de workspace `@repo/next-config`. |
| `apps/app` | Barra lateral, layout das telas de entrada, CSP, ícones. |
| `apps/web` | Header, footer, home (JSON-LD), `shared/lib/seo.ts`, CSP. |
| `apps/api` | Só `.env.example`: a API renderiza os e-mails e precisa das mesmas variáveis. Nenhuma rota muda. |
| `packages/internationalization` | Sai `apps.app.pages.signIn.layout`; entra `packages.email.layout.supportNote`. |
| `packages/sdk` | Nenhum. |
| `docs` | `FORKING.md` novo; `SETUP.md` §SEO reescrito; item 13 em `PRE-PRODUCTION.md`; link no `README.md`. |

- **Área do painel:** comum e admin. As duas usam `GlobalSidebar` (`(common)/sidebar.tsx:13`,
  `(admin)/admin/sidebar.tsx:13`).
- **Modo de produto:** o comportamento é o mesmo em `subscription` e `simple`. No `simple` o painel é só do
  admin, mas a barra lateral e as telas de entrada são as mesmas.
- **Assinatura:** não depende.
- **Dependências externas:** nenhuma nova. Resend só no remetente, com o mesmo `RESEND_FROM`.
- **Genérico × específico:** o módulo é genérico (lê env, sem valor de produto). O valor real é do fork.

### 1.3 Fontes

Só a spec e o código. Não há card, wiki nem print.

### 2. Dados (Firestore)

N/A. Nada é persistido; a marca é configuração de build.

### 3. Contrato `@repo/sdk`

N/A.

### 4. API (`apps/api`)

N/A para rotas, guards e `error.code`. A API é afetada só porque renderiza os e-mails de ação
(`@repo/email`). Nenhum código novo em `apiErrors`.

### 5. Front-end

#### 5.1 Módulo de marca

`packages/next-config/product-mode.ts:16-25` é o precedente: função que lê `process.env.NEXT_PUBLIC_*` por
acesso literal (o Next inlina no build, então funciona no cliente e no servidor), com default tipado, e já
é importada por app, web e api. `brand.ts` segue a mesma forma.

Regras de leitura, todas com string vazia tratada como ausência:

| Campo | Env | Regra | Ausente |
|-------|-----|-------|---------|
| `name` | `NEXT_PUBLIC_APP_NAME` | `trim()`; vazio → padrão | `"next-boilerplate"` (o padrão que `packages/seo/metadata.ts:14` e `apps/web/shared/lib/seo.ts:18` já usam) |
| `isDefaultName` | idem | `true` quando caiu no padrão | `true` |
| `logoUrl` | `NEXT_PUBLIC_APP_LOGO_URL` | só URL absoluta `http:`/`https:`; relativa, `javascript:` ou lixo → `null` | `null` |
| `supportEmail` | `NEXT_PUBLIC_APP_SUPPORT_EMAIL` | `trim()` e formato `x@y.z`; inválido → `null` | `null` |
| `siteUrl` | `NEXT_PUBLIC_WEB_URL` (já existe, `packages/next-config/keys.ts:22`) | mesma normalização de `apps/web/shared/lib/seo.ts:22-25`: sem barra final, `https://` quando falta protocolo | `null` |

O logo exige URL absoluta porque o e-mail não resolve caminho relativo (risco registrado na spec). Uma
variável serve às três superfícies.

`packages/next-config/keys.ts` tem `skipValidation: true` (`:62`), então a declaração não valida nada. A
validação real está no `getBrand()`, e a declaração usa `z.string().optional()` para que um `VAR=""` nunca
recuse o schema do `apps/app/env.ts`, que estende `core()` sem `skipValidation`.

#### 5.2 Onde a marca aparece

**Barra lateral** (`apps/app/shared/components/ui/Sidebar.tsx:75-80`). Hoje: `Avatar` com
`AvatarFallback` vazio e o texto `company name`. Depois: `AvatarImage` com `src={brand.logoUrl ?? undefined}`
e `alt=""`, e `AvatarFallback` com a inicial maiúscula do nome. O nome substitui `company name`. O Radix
cai no fallback quando `src` é vazio ou a imagem falha
(`@radix-ui/react-avatar`, `useImageLoadingStatus`: `if (!src) setLoadingStatus("error")`), então não há
imagem quebrada. Não precisa de `next/image` nem de `remotePatterns`.

**Painel de entrada** (`apps/app/app/[locale]/(unauthenticated)/layout.tsx:20-42`). O `CommandIcon` vira o
fallback de um `Avatar` com o logo, `Acme Inc` vira `brand.name`, e o `<blockquote>` (`:29-41`) sai. O
layout perde `params`, `getTranslations` e `resolveLocale`, e o comentário de `:13-14`, que só existia por
causa da leitura do dicionário. As classes `min-h-dvh` e `[body:has([data-cookie-banner])_&]:pb-96`
ficam; `apps/app/__tests__/cookieBannerAuthLayoutOffset.test.tsx` lê o fonte e cobra as duas.

**Header da web** (`apps/web/app/[locale]/components/header/index.tsx:162-176`). O SVG do triângulo vira o
fallback de um `Avatar` com o logo; `getAppName()` vira `getBrand().name`. Sem logo, a web fica igual.

**Footer e home da web** (`footer.tsx:4`, `:9`; `(home)/page.tsx:7`, `:30`, `:36-38`, `:43`). Trocam
`getAppName()` por `getBrand().name`. O `logo` do `organizationSchema` passa a ser
`brand.logoUrl ?? \`${baseUrl}/icon.png\``.

**`apps/web/shared/lib/seo.ts`.** `getAppName` (`:16-19`) sai; os três chamadores passam a importar
`getBrand`. `getWebBaseUrl` (`:36-45`) passa a ser `getBrand().siteUrl ?? <host da Vercel> ?? localhost`. A
precedência e a normalização continuam as mesmas, e `apps/web/__tests__/seo.test.ts` segue valendo sem
edição.

**Metadados** (`packages/seo/metadata.ts:14-15`). `applicationName` e `authorName` saem do escopo de módulo
e passam a ser calculados dentro de `createMetadata` a partir de `getBrand().name`. `AUTHOR_URL` e
`TWITTER_HANDLE` continuam como estão.

**E-mails** (`packages/email`):

- `brand.ts` perde `name`, `logoUrl` e `supportEmail` e fica com a paleta. O nome `emailBrand` se mantém
  para não mexer nas ~40 referências de cor.
- `emailBrand.name` → `getBrand().name` em `components/layout.tsx:52`, `:62`, `:83`, `:93`;
  `templates/action-link.tsx:33`, `:64`; `templates/welcome.tsx:27`, `:52`; `templates/contact.tsx:27`.
  `emailBrand.logoUrl` → `getBrand().logoUrl` em `layout.tsx:50`, `:54`.
- Linha de suporte no rodapé do layout, só quando `supportEmail` existe **e** o template não sobrescreveu o
  `footerNote`. O e-mail de contato (`contact.tsx:26-28`) vai para o dono do produto, e para ele a linha
  não faz sentido.
- Remetente: quando `RESEND_FROM` é um endereço puro e o nome foi configurado (`!isDefaultName`),
  `sendEmail` (`index.ts:112-113`) envia `from` como `Nome <endereço>`. Se `RESEND_FROM` já traz nome
  (`Acme <hi@acme.com>`), fica intacto. Sem nome configurado, fica o endereço puro, como hoje. O nome é
  saneado: remove `"`, `\`, `<`, `>`, CR e LF, e vai entre aspas quando tem caractere especial da RFC 5322
  (`()<>[]:;@\,."`). A detecção de "já tem nome" reusa o `displayNameSender` de `keys.ts:20`, que passa a
  ser exportado. `ownerInbox()` (`index.ts:81`) não muda.

#### 5.3 Ícones do app

`apps/app/app/` não tem nenhum arquivo de ícone. `/favicon.ico` fica fora do matcher do proxy
(`apps/app/proxy.ts:109`) e, sem arquivo, cai no segmento `[locale]`. Entram três arquivos na raiz de
`apps/app/app/`, onde está o root layout (`apps/app/app/layout.tsx`):

- `icon.png` e `apple-icon.png`: cópia de `apps/web/app/[locale]/icon.png` (PNG 32×32) e `apple-icon.png`
  (PNG 192×192).
- `favicon.ico`: ICO com o PNG 32×32 embutido (cabeçalho ICONDIR de 6 bytes + ICONDIRENTRY de 16 + os bytes
  do PNG). O `/develop` gera o arquivo com um script Node de uma vez só, sem dependência e sem commitar o
  script.

`/icon.png` e `/apple-icon.png` têm extensão e passam pelo `isStaticAssetPath` (`proxy.ts:121-123`), então
o proxy default-deny não os redireciona para o login.

#### 5.4 i18n

- Sai `apps.app.pages.signIn.layout` (`title`, `description`, `author`) nos 3 idiomas
  (`translations/apps/app/pages/signIn/index.ts:25-30`, `:55-60`, `:85-90`). Nenhum outro leitor: o `grep`
  por `signIn.layout` só encontra o layout de entrada.
- Entra `packages.email.layout.supportNote` nos 3 idiomas, com o placeholder `{supportEmail}`.
- O nome da marca é dado, não copy: não passa pelo dicionário.
- Nenhum `apiErrors` novo.

### 6. Autorização e segurança

- Sem guard, sem ownership, sem impersonação envolvida. A marca é igual para qualquer sessão.
- CSP: a origem do logo entra no `img-src` do app e da web, e só quando `logoUrl` passa na validação. Um
  valor malformado vira `null` e não abre o CSP.
- `logoUrl` só aceita `http:`/`https:`. `javascript:` e `data:` vindos da env são descartados.
- O nome saneado impede injeção de cabeçalho no `from` (CR/LF) e a quebra do parse do endereço (`<`, `>`,
  vírgula fora de aspas).
- `supportEmail` é dado público por definição.

### 7. Testes

Tudo em nível unitário. Nada aqui depende de emulador ou app de pé.

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `packages/next-config/__tests__/brand.test.ts` (novo) | unit | Padrão com env ausente, vazia e só espaços; `trim` do nome; `isDefaultName`; logo `https`/`http` aceito, relativo/`javascript:`/lixo → `null`; suporte válido e inválido; normalização do `siteUrl`. Usa `vi.stubEnv`. |
| `packages/email/__tests__/layout.test.tsx` | unit (render) | Troca o `vi.mock("../brand")` por `vi.stubEnv`: logo com env, nome sem env, nunca `src=""`, linha de suporte só com env e nunca com `footerNote` sobrescrito, nenhum `{supportEmail}` sobrando. |
| `packages/email/__tests__/sendEmail.test.ts` | unit (Resend mockado) | `from` puro + nome configurado → `Nome <addr>`; `from` já com nome → intacto; nome padrão → endereço puro; nome com `,`/`"`/CRLF → saneado e entre aspas. A asserção de `:159` muda porque o comportamento muda de propósito. |
| `packages/email/__tests__/templates.test.tsx`, `previews.test.tsx` | unit (render) | Trocam `emailBrand.name` por `getBrand().name`; um caso com `NEXT_PUBLIC_APP_NAME` configurado prova que assunto e corpo seguem a env. |
| `apps/app/__tests__/securityPolicySources.test.ts` | unit (proxy) | Com `NEXT_PUBLIC_APP_LOGO_URL`, a origem entra no `img-src`; sem ela, a política fica igual. |
| `apps/web/__tests__/securityPolicySources.test.ts` | unit (proxy) | O mesmo para a web. |
| `apps/app/__tests__/authLayoutBrand.test.tsx` (novo) | unit (render) | O painel mostra o nome da env, sem `blockquote` e sem "Sofia Davis"; o fallback aparece sem logo. |
| `apps/app/__tests__/sidebarBrand.test.tsx` (novo) | unit (render) | Com `SidebarProvider`: nome da env no lugar de `company name`, inicial no fallback. |
| `apps/app/__tests__/appIcons.test.ts` (novo) | unit (fs) | `app/favicon.ico` existe e começa com `00 00 01 00` (ICO válido); `icon.png` e `apple-icon.png` existem. |
| `packages/internationalization/__tests__/parity.test.ts` | unit | Já existe; cobra a paridade das chaves que saem e entram. |
| `apps/web/__tests__/seo.test.ts`, `cookieBannerAuthLayoutOffset.test.tsx`, `headerInteractiveNesting.test.tsx` | unit | Já existem; continuam verdes sem edição. |

`packages/next-config` hoje não tem `test`. Ganha `vitest.config.mts` (ambiente `node`, no molde de
`packages/email/vitest.config.mts`), o script `"test": "vitest run"` e `vitest` em `devDependencies`, na
versão que já está no lockfile (`^4.0.3`). A raiz já descobre o projeto por `packages/*/vitest.config.mts`
(`vitest.config.mts:9`).

### 8. O que o `/test` vai ter de percorrer

Uma passada, em duas configurações de env: **sem marca** (o `.env` do exemplo, variáveis vazias) e **com
marca** (`NEXT_PUBLIC_APP_NAME="QA Brand"`, `NEXT_PUBLIC_APP_LOGO_URL` apontando para um PNG público
qualquer, `NEXT_PUBLIC_APP_SUPPORT_EMAIL="qa-brand-config@example.com"`, definidas em app, web e api). As
variáveis são `NEXT_PUBLIC_*`, inlinadas no build: trocar de configuração pede reiniciar o `next dev`.

**App (3000)**, light + dark + mobile, 3 idiomas:

1. `/pt-br/sign-in`, `/en/sign-up`, `/es/forgot-password`: painel lateral (visível só em `lg`) com logo ou
   ícone e nome; sem depoimento. No mobile o painel some, como hoje. `<title>` = `<página> | QA Brand`.
2. Painel comum (`/pt-br`, usuário do seed) e admin (`/pt-br/admin`): barra lateral com logo ou inicial e
   nome; recolhida, só a marca.
3. `curl -I http://localhost:3000/favicon.ico` → `200` e `content-type: image/x-icon` (ou
   `image/vnd.microsoft.icon`). A aba mostra o ícone.
4. Com logo externo: o console do browser não registra violação de CSP para o logo.

**Web (3001)**, light + dark + mobile, 3 idiomas:

5. `/pt-br`, `/en/pricing`: header e footer com o nome; header com o logo quando configurado e o triângulo
   quando não. JSON-LD da home (`script[type="application/ld+json"]`) com `name` e `logo` da marca.

**E-mail preview (3003)**, `pnpm --filter email dev`, com e sem as variáveis na shell:

6. `welcome`, `action-link` e `contact`: cabeçalho com logo ou nome, assinatura "Equipe QA Brand", linha de
   suporte em `welcome` e `action-link` e ausente em `contact`. Se o preview server não repassar a env para
   o render, isso vira 🔒 e fica coberto pelos testes de render do §7.

**Sinal de pronto do `grep`**, medido assim:

```bash
grep -rn "Acme\|company name\|Sofia Davis" apps packages \
  --include='*.ts' --include='*.tsx' --include='*.mjs' \
  --exclude-dir=node_modules --exclude-dir=__tests__ --exclude-dir=.next
```

Esperado, e só isto: `apps/api/scripts/seed-emulator.mjs:35`, `apps/e2e/support/seedAccounts.ts:12` e
`packages/email/keys.ts:22`.

**Fica 🔒 sem infra:** o remetente visível num inbox real (exige Resend com domínio verificado). A
composição do `from` é provada pelo teste unitário de `sendEmail`.

### 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **Sem nenhuma variável de marca, tudo sobe com o padrão neutro**
  Com `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL` e `NEXT_PUBLIC_APP_SUPPORT_EMAIL` vazias (`""`,
  como no `.env.example`) ou ausentes, `pnpm build` passa e app, web e api sobem. O nome exibido é
  `next-boilerplate` em todas as superfícies, a barra lateral mostra a inicial `N`, o painel de entrada
  mostra o ícone genérico e o header da web mostra o triângulo. Nenhum e-mail tem linha de suporte e o
  `from` é o `RESEND_FROM` sem alteração.

- [ ] **Um nome configurado aparece em todas as superfícies**
  Com `NEXT_PUBLIC_APP_NAME="QA Brand"` em app, web e api, o nome aparece na barra lateral (comum e admin),
  no painel de login, cadastro e recuperação de senha do app, no header e no footer da web, no `<title>`
  das seis páginas do app que usam `createMetadata` e das páginas da web, no JSON-LD da home e no
  cabeçalho, assinatura, rodapé e assunto dos e-mails. Nome com espaços nas pontas é exibido sem eles; nome
  só com espaços conta como ausente.

- [ ] **O logo configurado substitui o fallback, e um logo inválido é ignorado**
  Com uma URL `https` pública em `NEXT_PUBLIC_APP_LOGO_URL`, barra lateral, painel de entrada, header da
  web e cabeçalho dos e-mails mostram a imagem, com `alt` vazio onde o nome está ao lado. Um valor relativo
  (`/logo.png`), `javascript:alert(1)` ou texto qualquer é tratado como ausente: aparece o fallback de cada
  superfície e nenhum `src` vazio é emitido. Se a URL for válida mas a imagem não carregar, o Avatar cai no
  fallback em vez de mostrar imagem quebrada.

- [ ] **O CSP deixa passar o logo e só ele**
  Com logo num host externo, o `content-security-policy` do app inclui a origem do logo em `img-src`, e o
  browser não registra violação ao carregar a barra lateral ou o painel de entrada. Sem logo, ou com um
  valor inválido, o `img-src` é idêntico ao de antes da mudança. A web, que está em report-only, recebe a
  mesma origem.

- [ ] **O depoimento de exemplo saiu do painel de entrada**
  O painel lateral de `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` e `/verify-email` mostra
  só a marca (logo ou ícone e nome) e o seletor de tema. Não há `blockquote`, aspas, "Sofia Davis" nem o
  texto do depoimento em nenhum dos 3 idiomas. A folga para o banner de cookies continua funcionando: com o
  banner aberto o formulário não fica escondido atrás dele.

- [ ] **O app responde a `/favicon.ico` com um ícone**
  `GET /favicon.ico` no app retorna `200` com um ICO válido, e o pedido não passa mais pela rota
  `[locale]`. `/icon.png` e `/apple-icon.png` também respondem `200` sem sessão, sem redirecionar para o
  login. A aba do browser mostra o ícone em todas as páginas, autenticadas ou não.

- [ ] **A linha de suporte dos e-mails respeita a configuração e o destinatário**
  Com `NEXT_PUBLIC_APP_SUPPORT_EMAIL` válido, os e-mails de boas-vindas e de ação (confirmar acesso,
  redefinir senha, verificar e-mail) trazem a linha de suporte no idioma do destinatário, com o endereço
  interpolado. O e-mail de contato, que vai para o dono do produto, não traz a linha. Endereço inválido
  (`sem-arroba`) é tratado como ausente, e nenhum placeholder `{supportEmail}` sobra no HTML.

- [ ] **O remetente visível segue o nome configurado sem estragar um `RESEND_FROM` já nomeado**
  Com `RESEND_FROM="hi@example.com"` e nome configurado, a chamada à Resend recebe `from: "QA Brand
  <hi@example.com>"`. Com `RESEND_FROM="Outro <hi@example.com>"`, o `from` é enviado como está. Sem nome
  configurado, o `from` é o endereço puro. Um nome com vírgula, aspas, `<`, `>` ou quebra de linha é
  saneado e, quando preciso, posto entre aspas, sem permitir injeção de cabeçalho.

- [ ] **Nenhuma marca fixa sobra no código**
  O `grep` do §8 devolve só o dado de seed (`Acme Franchise`, em dois arquivos) e o comentário de
  `packages/email/keys.ts`. `company name` e `Sofia Davis` não aparecem em lugar nenhum de `apps/` e
  `packages/`. As chaves `signIn.layout.*` não existem mais em nenhum idioma, e o teste de paridade passa.

- [ ] **O roteiro de fork existe e é seguível**
  `docs/FORKING.md` lista, em ordem, marca (variáveis e arquivos de ícone), projeto Firebase, domínios e
  URLs, variáveis de cada app, e-mail, pagamentos opcionais, textos legais e o checklist do
  `PRE-PRODUCTION.md`. Cada passo aponta para a seção de referência em vez de repetir o conteúdo, e o
  documento avisa que trocar a marca pede novo build. `SETUP.md` deixa de dizer que as variáveis de marca
  valem só para a web.

- [ ] **Tema e responsivo**
  Em light e dark, o nome e o fallback da marca têm contraste legível na barra lateral, no painel de
  entrada e no header da web. No mobile, a barra lateral recolhida mostra só a marca, o painel de entrada
  continua escondido abaixo de `lg` e o header da web não quebra linha com um nome longo (até 30
  caracteres).

## Etapa 2 — Blueprint técnico

### 10.1 Módulo de marca (`packages/next-config/brand.ts`, novo)

```ts
export type Brand = {
    readonly name: string;
    readonly isDefaultName: boolean;
    readonly logoUrl: string | null;
    readonly supportEmail: string | null;
    readonly siteUrl: string | null;
};

export const DEFAULT_BRAND_NAME = "next-boilerplate";

const TRAILING_SLASH_RE = /\/+$/;
const PROTOCOL_RE = /^https?:\/\//;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toHttpUrl = (value: string | undefined): string | null => {
    const trimmed = value?.trim();
    if (!trimmed) {
        return null;
    }
    try {
        const url = new URL(trimmed);
        return url.protocol === "https:" || url.protocol === "http:"
            ? url.href
            : null;
    } catch {
        return null;
    }
};

const toEmail = (value: string | undefined): string | null => {
    const trimmed = value?.trim();
    return trimmed && EMAIL_RE.test(trimmed) ? trimmed : null;
};

const toOrigin = (value: string | undefined): string | null => {
    const trimmed = value?.trim().replace(TRAILING_SLASH_RE, "");
    if (!trimmed) {
        return null;
    }
    return PROTOCOL_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export function getBrand(): Brand {
    const configuredName = process.env.NEXT_PUBLIC_APP_NAME?.trim();
    return {
        name: configuredName || DEFAULT_BRAND_NAME,
        isDefaultName: !configuredName,
        logoUrl: toHttpUrl(process.env.NEXT_PUBLIC_APP_LOGO_URL),
        supportEmail: toEmail(process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL),
        siteUrl: toOrigin(process.env.NEXT_PUBLIC_WEB_URL),
    };
}

export function getBrandLogoOrigin(): string | null {
    const { logoUrl } = getBrand();
    return logoUrl ? new URL(logoUrl).origin : null;
}
```

Cada `process.env.NEXT_PUBLIC_*` fica em acesso literal, que é o que o Next inlina no bundle do cliente.
Leitura na hora da chamada, como `getProductMode()`, para `vi.stubEnv` funcionar nos testes.

### 10.2 Declaração das variáveis (`packages/next-config/keys.ts`)

```diff
         client: {
             NEXT_PUBLIC_APP_URL: z.url().optional(),
             ...
             NEXT_PUBLIC_PRIVACY_CONTACT: z.string().optional(),
+            NEXT_PUBLIC_APP_NAME: z.string().optional(),
+            NEXT_PUBLIC_APP_LOGO_URL: z.string().optional(),
+            NEXT_PUBLIC_APP_SUPPORT_EMAIL: z.string().optional(),
+            NEXT_PUBLIC_APP_AUTHOR: z.string().optional(),
+            NEXT_PUBLIC_APP_AUTHOR_URL: z.string().optional(),
+            NEXT_PUBLIC_TWITTER_HANDLE: z.string().optional(),
         },
         runtimeEnv: {
             ...
+            NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
+            NEXT_PUBLIC_APP_LOGO_URL: process.env.NEXT_PUBLIC_APP_LOGO_URL,
+            NEXT_PUBLIC_APP_SUPPORT_EMAIL: process.env.NEXT_PUBLIC_APP_SUPPORT_EMAIL,
+            NEXT_PUBLIC_APP_AUTHOR: process.env.NEXT_PUBLIC_APP_AUTHOR,
+            NEXT_PUBLIC_APP_AUTHOR_URL: process.env.NEXT_PUBLIC_APP_AUTHOR_URL,
+            NEXT_PUBLIC_TWITTER_HANDLE: process.env.NEXT_PUBLIC_TWITTER_HANDLE,
         },
```

`z.string()`, nunca `z.url()` nem `z.email()`: o `.env.example` publica `""`, e a validação de formato mora
no `getBrand()`.

### 10.3 Pseudo-diffs dos arquivos existentes

**`packages/seo/metadata.ts`** (+ `"@repo/next-config": "workspace:*"` em `packages/seo/package.json`)

```diff
+import { getBrand } from "@repo/next-config/brand";
-const applicationName = process.env.NEXT_PUBLIC_APP_NAME || "next-boilerplate";
-const authorName = process.env.NEXT_PUBLIC_APP_AUTHOR || applicationName;
 const authorUrl = process.env.NEXT_PUBLIC_APP_AUTHOR_URL;
-const author: Metadata["authors"] = { name: authorName, ...(authorUrl ? { url: authorUrl } : {}) };
-const publisher = authorName;
 ...
 export const createMetadata = ({ title, description, image, ...properties }) => {
+    const applicationName = getBrand().name;
+    const authorName = process.env.NEXT_PUBLIC_APP_AUTHOR || applicationName;
+    const author = { name: authorName, ...(authorUrl ? { url: authorUrl } : {}) };
     const parsedTitle = `${title} | ${applicationName}`;
     ...
-        publisher,
+        publisher: authorName,
```

**`packages/email/brand.ts`**

```diff
 export const emailBrand = {
-    name: "Acme",
-    logoUrl: "",
-    supportEmail: "support@example.com",
     primaryColor: "#18181b",
     ...
 } as const;
```

O JSDoc de `:1-5` ("the single place a fork edits to rebrand every email") deixa de ser verdade. Vira uma
linha dizendo que o arquivo guarda só a paleta, com o motivo do hex literal mantido.

**`packages/email/components/layout.tsx`**

```diff
+import { getBrand } from "@repo/next-config/brand";
 ...
     const layoutCopy = emailCopy(locale).layout;
+    const brand = getBrand();
 ...
-                            {emailBrand.logoUrl ? (
-                                <Img alt={emailBrand.name} ... src={emailBrand.logoUrl} />
+                            {brand.logoUrl ? (
+                                <Img alt={brand.name} ... src={brand.logoUrl} />
                             ) : (
-                                <Text ...>{emailBrand.name}</Text>
+                                <Text ...>{brand.name}</Text>
                             )}
 ...
-                                {interpolate(layoutCopy.signature, { brand: emailBrand.name })}
+                                {interpolate(layoutCopy.signature, { brand: brand.name })}
 ...
-                            {footerNote ?? interpolate(layoutCopy.footerNote, { brand: emailBrand.name })}
+                            {footerNote ?? interpolate(layoutCopy.footerNote, { brand: brand.name })}
                         </Text>
+                        {!footerNote && brand.supportEmail ? (
+                            <Text className="mt-1 text-center text-xs" style={{ color: emailBrand.mutedTextColor }}>
+                                {interpolate(layoutCopy.supportNote, { supportEmail: brand.supportEmail })}
+                            </Text>
+                        ) : null}
```

**`packages/email/templates/{action-link,welcome,contact}.tsx`**: `emailBrand.name` → `getBrand().name` nas
linhas do §5.2. As referências de cor ficam.

**`packages/email/keys.ts`**: `const displayNameSender` (`:20`) passa a `export const`.

**`packages/email/sender.ts`** (novo)

```ts
import { getBrand } from "@repo/next-config/brand";
import { displayNameSender } from "./keys";

const UNSAFE_NAME_CHARS = /["\\<>\r\n]/g;
const RFC5322_SPECIALS = /[()<>[\]:;@\\,."]/;

export const withBrandSender = (from: string): string => {
    const brand = getBrand();
    if (brand.isDefaultName || displayNameSender.test(from)) {
        return from;
    }
    const safeName = brand.name.replace(UNSAFE_NAME_CHARS, "").trim();
    if (!safeName) {
        return from;
    }
    const displayName = RFC5322_SPECIALS.test(safeName) ? `"${safeName}"` : safeName;
    return `${displayName} <${from}>`;
};
```

**`packages/email/index.ts`**

```diff
+import { withBrandSender } from "./sender";
 ...
         const { data: sent, error } = await client.emails.send({
-            from,
+            from: withBrandSender(from),
```

`packages/email/package.json`: + `"@repo/next-config": "workspace:*"`.

**`apps/app/shared/components/ui/Sidebar.tsx`**

```diff
 import {
     Avatar,
     AvatarFallback,
+    AvatarImage,
 } from "@repo/design-system/components/ui/avatar";
+import { getBrand } from "@repo/next-config/brand";
 ...
+    const brand = getBrand();
 ...
                         <Avatar className="h-8 w-8">
-                            <AvatarFallback />
+                            <AvatarImage alt="" src={brand.logoUrl ?? undefined} />
+                            <AvatarFallback>{brand.name.charAt(0).toUpperCase()}</AvatarFallback>
                         </Avatar>
                         {sidebar.open && (
-                            <span className="text-sm">company name</span>
+                            <span className="text-sm">{brand.name}</span>
                         )}
```

**`apps/app/app/[locale]/(unauthenticated)/layout.tsx`**

```diff
+import { Avatar, AvatarFallback, AvatarImage } from "@repo/design-system/components/ui/avatar";
 import { ModeToggle } from "@repo/design-system/components/ui/mode-toggle";
-import { getTranslations } from "@repo/internationalization/server";
-import { resolveLocale } from "@repo/internationalization/utils";
+import { getBrand } from "@repo/next-config/brand";
 import { CommandIcon } from "lucide-react";
 import type { ReactNode } from "react";

-type AuthLayoutProps = { readonly children: ReactNode; readonly params: Promise<{ locale: string }> };
+type AuthLayoutProps = { readonly children: ReactNode };

-const AuthLayout = async ({ children, params }: AuthLayoutProps) => {
-    // The segment, not the cookie: ...
-    const { locale } = await params;
-    const dictionary = await getTranslations(resolveLocale(locale));
+const AuthLayout = ({ children }: AuthLayoutProps) => {
+    const brand = getBrand();
     return (
         <div className="container relative grid min-h-dvh ...">
             <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
                 <div className="absolute inset-0 bg-muted" />
-                <div className="relative z-20 flex items-center font-medium text-lg text-primary">
-                    <CommandIcon className="mr-2 h-6 w-6" />
-                    Acme Inc
+                <div className="relative z-20 flex items-center gap-2 font-medium text-lg text-primary">
+                    <Avatar className="size-6 rounded-md">
+                        <AvatarImage alt="" src={brand.logoUrl ?? undefined} />
+                        <AvatarFallback className="rounded-md bg-transparent">
+                            <CommandIcon aria-hidden className="size-6" />
+                        </AvatarFallback>
+                    </Avatar>
+                    {brand.name}
                 </div>
                 <div className="absolute top-4 right-4"><ModeToggle /></div>
-                <div className="relative z-20 mt-auto text-primary">
-                    <blockquote>...</blockquote>
-                </div>
             </div>
             <div className="lg:p-8 [body:has([data-cookie-banner])_&]:pb-96"> ... </div>
```

**`apps/web/app/[locale]/components/header/index.tsx`**

```diff
+import { Avatar, AvatarFallback, AvatarImage } from "@repo/design-system/components/ui/avatar";
+import { getBrand } from "@repo/next-config/brand";
-import { getAppName } from "@/shared/lib/seo";
 ...
-    const appName = getAppName();
+    const brand = getBrand();
 ...
                 <div className="flex items-center gap-2 lg:justify-center">
-                    <svg ...><title>{appName}</title>...</svg>
-                    <p className="whitespace-nowrap font-semibold">{appName}</p>
+                    <Avatar className="size-[18px] rounded-none">
+                        <AvatarImage alt="" src={brand.logoUrl ?? undefined} />
+                        <AvatarFallback className="rounded-none bg-transparent">
+                            <svg aria-hidden ...>(mesmo path do triângulo, sem <title>)</svg>
+                        </AvatarFallback>
+                    </Avatar>
+                    <p className="whitespace-nowrap font-semibold">{brand.name}</p>
                 </div>
```

O `<title>` do SVG sai porque o nome já está visível ao lado; o SVG passa a `aria-hidden`.

**`apps/web/app/[locale]/components/footer.tsx`** e **`(home)/page.tsx`**: `getAppName()` → `getBrand().name`;
na home, `logo: brand.logoUrl ?? \`${baseUrl}/icon.png\``.

**`apps/web/shared/lib/seo.ts`**

```diff
+import { getBrand } from "@repo/next-config/brand";
-/** Brand name (env-configurable, neutral default). Used in SEO + header/footer. */
-export function getAppName(): string {
-    return process.env.NEXT_PUBLIC_APP_NAME || "next-boilerplate";
-}
 ...
 export function getWebBaseUrl(): string {
-    const fromEnv = process.env.NEXT_PUBLIC_WEB_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
-    if (fromEnv) {
-        return normalizeOrigin(fromEnv);
-    }
+    const { siteUrl } = getBrand();
+    if (siteUrl) {
+        return siteUrl;
+    }
+    const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
+    if (vercelHost) {
+        return normalizeOrigin(vercelHost);
+    }
     return "http://localhost:3001";
 }
```

**`apps/app/proxy.ts`** e **`apps/web/proxy.ts`**

```diff
+import { getBrandLogoOrigin } from "@repo/next-config/brand";
+const brandLogoOrigin = getBrandLogoOrigin();
 ...
     imgSrc: [
         GOOGLE_AVATAR_ORIGIN,
         ...(isStorageConfigured ? [STORAGE_ORIGIN] : []),
         ...(isAnalyticsEnabled ? [TAG_MANAGER_ORIGIN] : []),
+        ...(brandLogoOrigin ? [brandLogoOrigin] : []),
     ],
```

Na web, `buildBrowserAppOptions` hoje não recebe `imgSrc` (`apps/web/proxy.ts:29-40`); passa a receber
`imgSrc: brandLogoOrigin ? [brandLogoOrigin] : []`. `toSources` já descarta entradas vazias.

**`.env.example`** de `apps/app` (seção `# Client`), `apps/api` (seção `# Client`) e `apps/web` (bloco
`SEO identity`, `:55-59`):

```dotenv
# Brand (optional; neutral defaults when empty). Public values, inlined at build:
# changing them needs a new deploy. The logo must be an absolute, public http(s) URL
# of a square mark: the same file is used in the app, the landing and the emails.
NEXT_PUBLIC_APP_NAME=""
NEXT_PUBLIC_APP_LOGO_URL=""
NEXT_PUBLIC_APP_SUPPORT_EMAIL=""
```

Na web, as três linhas substituem o `NEXT_PUBLIC_APP_NAME` que já existe, e `AUTHOR`/`AUTHOR_URL`/`TWITTER`
ficam abaixo com o comentário de SEO.

### 10.4 Arquivos novos

```
packages/next-config/
  brand.ts
  vitest.config.mts
  __tests__/brand.test.ts
packages/email/
  sender.ts
apps/app/app/
  favicon.ico
  icon.png
  apple-icon.png
apps/app/__tests__/
  authLayoutBrand.test.tsx
  sidebarBrand.test.tsx
  appIcons.test.ts
docs/
  FORKING.md
```

`packages/next-config/package.json`: + `"test": "vitest run"` e `"vitest": "^4.0.3"` em
`devDependencies`. Depois de mexer nos três `package.json` de pacote, `pnpm install` atualiza os links de
workspace no `pnpm-lock.yaml`; nenhum pacote do npm entra.

### 10.5 Chaves de i18n

Sai, nos 3 idiomas, de `packages/internationalization/translations/apps/app/pages/signIn/index.ts`:

```ts
layout: { title: "Acme Inc", description: "…", author: "Sofia Davis" },
```

Entra em `packages/internationalization/translations/packages/email/index.ts`, dentro de `layout`:

| Idioma | `supportNote` |
|--------|---------------|
| `pt-br` | `Dúvidas? Escreva para {supportEmail}.` |
| `en` | `Questions? Write to {supportEmail}.` |
| `es` | `¿Dudas? Escríbenos a {supportEmail}.` |

### 10.6 `docs/FORKING.md` (esqueleto)

1. **Marca.** `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_LOGO_URL`, `NEXT_PUBLIC_APP_SUPPORT_EMAIL` em `app`,
   `web` e `api`; o que cada uma muda; trocar pede novo build. Arquivos de ícone que o fork substitui:
   `apps/app/app/{favicon.ico,icon.png,apple-icon.png}` e
   `apps/web/app/[locale]/{icon.png,apple-icon.png,opengraph-image.png}`. Paleta de e-mail em
   `packages/email/brand.ts`; cor primária do tema em `packages/design-system/styles/globals.css`. Renomear
   o `name` do `package.json` da raiz.
2. **Projeto Firebase.** `.firebaserc`, variáveis Firebase de cada app → `SETUP.md` §Firebase e §Voltar
   para um projeto Firebase real; publicar rules e índices → `PRE-PRODUCTION.md` §1.
3. **Domínios e URLs.** `NEXT_PUBLIC_APP_URL`/`WEB_URL`/`API_URL`, `CORS_ORIGIN`, `SESSION_COOKIE_DOMAIN`,
   domínios autorizados no Firebase → `SETUP.md` §URLs entre apps, `PRE-PRODUCTION.md` §5.
4. **Variáveis por app.** Os três `.env.example` são a lista; `SETUP.md` §Variáveis por serviço explica
   cada uma.
5. **Modo de produto.** `NEXT_PUBLIC_PRODUCT_MODE` → `AUTH-SSO.md`.
6. **E-mail.** `RESEND_FROM`/`RESEND_TOKEN`, domínio verificado → `PRE-PRODUCTION.md` §3. Como o nome da
   marca entra no remetente.
7. **Pagamentos, se houver.** → `PAYMENTS.md`, `PRE-PRODUCTION.md` §12.
8. **Textos legais.** `packages/internationalization/translations/apps/web/pages/legal/index.ts`,
   `NEXT_PUBLIC_PRIVACY_CONTACT` → `PRE-PRODUCTION.md` §7.
9. **Antes do deploy.** Percorrer o `PRE-PRODUCTION.md`.

Também: `docs/SETUP.md:87-88` vira "Marca e SEO · `@repo/next-config` (`brand.ts`) + `@repo/seo`", com
tabela das seis variáveis e dos apps que as leem; `README.md:5` ganha o link para `FORKING.md`;
`docs/PRE-PRODUCTION.md` ganha o item "13. Marca do produto" em "⚠️ Fortemente recomendados" (sem as
variáveis, clientes veem `next-boilerplate` na tela e nos e-mails), apontando para o `FORKING.md`.

### 10.7 Ordem de implementação e commits

Não há SDK nem rota nesta feature. A ordem segue a dependência entre pacotes:

1. `feat(next-config): brand module with env-backed defaults` — `brand.ts`, `keys.ts`, setup de teste,
   `brand.test.ts`, `package.json`.
2. `feat(seo): read the product name from the brand module` — `metadata.ts`, `package.json`.
3. `feat(email): take name, logo and support contact from the brand module` — `brand.ts`, `layout.tsx`,
   templates, testes de render.
4. `feat(email): name the sender after the configured brand` — `sender.ts`, `keys.ts`, `index.ts`,
   `sendEmail.test.ts`.
5. `feat(app): show the configured brand in the sidebar and sign-in panel` — `Sidebar.tsx`, layout de
   entrada, testes, `.env.example`.
6. `feat(app): allow the brand logo origin in the image policy` — `proxy.ts`, teste de CSP.
7. `feat(app): add favicon and app icons` — os três arquivos e `appIcons.test.ts`.
8. `feat(web): read the brand from the shared module` — header, footer, home, `seo.ts`, `proxy.ts`, teste
   de CSP, `.env.example`.
9. `chore(api): list the brand variables in the env example` — `apps/api/.env.example`.
10. `feat(internationalization): drop the sample testimonial and add the email support line`.
11. `docs: fork guide and brand variables` — `FORKING.md`, `SETUP.md`, `PRE-PRODUCTION.md`, `README.md`.
12. `docs(features): brand-config`.

O `pnpm-lock.yaml` vai no commit do primeiro pacote que ganhou a dependência de workspace (commit 2), ou
num `chore` próprio se o diff do lock cruzar mais de um pacote.

### 10.8 Env nova

| Var | Apps | Default | Obrigatória |
|-----|------|---------|-------------|
| `NEXT_PUBLIC_APP_NAME` | app, web, api | `next-boilerplate` | não |
| `NEXT_PUBLIC_APP_LOGO_URL` | app, web, api | sem logo (fallback por superfície) | não |
| `NEXT_PUBLIC_APP_SUPPORT_EMAIL` | api (e-mails); app e web por simetria | sem linha de suporte | não |

`NEXT_PUBLIC_APP_NAME` já existia na web; passa a valer em app e api também.

## 11. Pré-requisitos manuais de infra

Nenhum bloqueia a entrega, e nenhum deve reprovar o `/test`. Todos são do fork, não do boilerplate:

- Definir as três variáveis de marca em produção (Vercel) nos projetos `app`, `web` e `api`, e refazer o
  deploy.
- Hospedar o logo numa URL `https` pública e estável (o próprio domínio da web serve).
- Substituir os arquivos de ícone do app e da web pelos do produto.
- Ter o domínio de envio verificado na Resend para o remetente com nome aparecer num inbox real (já é o
  item 3 do `PRE-PRODUCTION.md`).

O item 13 do `PRE-PRODUCTION.md` registra os três primeiros.

## 12. Modo degradado

Sem nenhuma variável de marca: build e boot iguais aos de hoje; nome `next-boilerplate` em todo lugar
(antes, os e-mails diziam `Acme`); barra lateral com a inicial `N` (antes, círculo vazio); painel de entrada
com o ícone genérico e sem depoimento; web visualmente igual; e-mail sem linha de suporte e com o `from`
exatamente como está no `RESEND_FROM`; `img-src` igual ao de hoje. Valor malformado em qualquer variável
equivale a ausente. Os testes do §7 cobrem cada caso sem env.

## 13. Pós-entrega

- Rollback: reverter os commits. Nada é gravado em banco.
- Um fork precisa só do §11.
- Contenção: além do `contends_on` da spec, o diff toca `apps/app/proxy.ts`, `apps/web/proxy.ts` e o header
  da web. Não toca `packages/design-system` (usa o `Avatar` como está), então a contenção com
  `accessibility-conformance` continua baixa.

## Decisões tomadas sem perguntar

| # | Decisão adotada | Alternativa descartada | Degrau |
|---|-----------------|------------------------|--------|
| D1 | O depoimento `Sofia Davis` sai do painel de entrada; o painel fica com nome e logo; o bloco `signIn.layout` inteiro sai nos 3 idiomas (inclui `description`, que era o texto do depoimento). | Tornar o depoimento configurável por env ou dicionário. Um depoimento inventado não é marca, e o fork que quiser um escreve o seu. | Decidido na rodada + spec |
| D2 | Fonte única em `packages/next-config/brand.ts` com `getBrand()` lendo env e padrão neutro. | Env pura lida em cada app; módulo em `@repo/shared`. O `product-mode.ts` já mora em `next-config`, é lido por app, web e api, e a spec pede que `next-config` declare as variáveis. | Spec + padrão |
| D3 | Padrão do nome continua `next-boilerplate`. | Um padrão novo ("Meu App", traduzido). Mudaria o que a web mostra hoje e exigiria copy. | Padrão |
| D4 | `siteUrl` reusa `NEXT_PUBLIC_WEB_URL`, sem variável nova. | `NEXT_PUBLIC_APP_SITE_URL`. Seria a mesma informação em dois lugares. | Menor raio |
| D5 | Uma variável de logo, URL absoluta `http(s)`, para app, web e e-mail. | Duas variáveis (caminho relativo para as UIs, absoluta para o e-mail). O e-mail só aceita absoluta, e uma variável é o que "um lugar só" pede. | Spec (risco) + menor raio |
| D6 | Logo renderizado com o `Avatar` do design system (`AvatarImage` + `AvatarFallback`), cada superfície mantendo seu fallback de hoje (triângulo na web, ícone no painel de entrada, inicial na barra lateral). | Componente `BrandMark` novo no design system; `next/image` com `remotePatterns`. O `Avatar` já faz fallback em erro e não exige config de imagem. | Padrão + menor raio |
| D7 | A origem do logo entra no `img-src` do app e da web. | Deixar o CSP como está e documentar que o logo tem de ficar no próprio domínio. Com o CSP bloqueante do app, a feature falharia sem aviso para qualquer logo em CDN. | Defeito no caminho |
| D8 | O remetente ganha o nome da marca quando `RESEND_FROM` é endereço puro e o nome foi configurado. | Não mexer no remetente (a spec deixa a API "sem impacto, salvo..."). O sinal de pronto da spec pede que o remetente visível mude. | Spec (sinal de pronto) |
| D9 | `supportEmail` é lido pelo rodapé dos e-mails endereçados a usuários. | Campo sem leitor (o achado que a spec já registrou); `replyTo` padrão nos envios. O rodapé é visível, verificável no preview e custa uma chave de i18n. | Menor raio com leitor |
| D10 | Variáveis de SEO (`AUTHOR`, `AUTHOR_URL`, `TWITTER_HANDLE`) declaradas em `next-config/keys.ts`, junto das de marca. | `packages/seo/keys.ts` novo, que traria `@t3-oss/env-nextjs` e `zod` para as dependências do `seo`. | Menor raio |
| D11 | Ícones na raiz de `apps/app/app/`, cópia dos PNGs da web e `favicon.ico` gerado do PNG 32×32. | Ícone novo desenhado. O fork troca os arquivos de qualquer jeito. | Menor raio |
| D12 | `packages/next-config` ganha setup de Vitest para testar `brand.ts` onde ele mora. | Testar `brand.ts` a partir de `apps/web/__tests__`. O teste ficaria longe do código e cobraria o módulo pela metade. | Padrão (os demais pacotes com lógica têm `__tests__`) |
| D13 | Sinal de pronto do `grep` medido com `--exclude-dir=__tests__`. | Renomear as fixtures `Acme` dos testes. São dados de exemplo, não marca, e renomear seria refatorar fora da tarefa. | Menor raio |

## Perguntas em aberto

1. **O remetente deve mesmo ganhar o nome da marca por padrão?** Opções: (a) compor `Nome <endereço>`
   quando `RESEND_FROM` é endereço puro e o nome está configurado; (b) deixar o remetente só com o que o
   fork escreve em `RESEND_FROM`. **Adotada: (a)**, porque o sinal de pronto da spec pede que trocar o nome
   mude o remetente visível, e um `RESEND_FROM` já nomeado continua intacto.
2. **Onde o e-mail de suporte aparece?** Opções: (a) linha no rodapé dos e-mails para usuários; (b) `replyTo`
   padrão; (c) nenhum leitor por enquanto. **Adotada: (a)**, visível e verificável no preview, e sem
   efeito sobre a caixa de entrada do dono.
3. **O `/favicon.ico` da web também cai no `[locale]`?** `apps/web/app/` não tem `favicon.ico`, e o matcher
   do proxy da web exclui o caminho (`apps/web/proxy.ts:54`). A spec só pede o do app. **Adotada: não
   mexer na web nesta rodada** e registrar como achado para o backlog, com a âncora acima, se o `/test`
   confirmar que o pedido cai no segmento de idioma.

## Achados fora do escopo

- `apps/web/app/` sem `favicon.ico` (ver pergunta 3).
- `package.json:2-5` da raiz com nome `next-forge` e `bin` para arquivo que não existe (já registrado pela
  spec).
- `packages/next-config/product-mode.ts` não tem teste. O setup de Vitest que entra aqui permite cobrir
  depois, mas não é desta tarefa.

## Referências não lidas

Nenhuma. A spec cita só arquivos do repositório e a nota `specs/research/saas-starter-feature-benchmark.md`,
que embasa o valor e não muda o como.
