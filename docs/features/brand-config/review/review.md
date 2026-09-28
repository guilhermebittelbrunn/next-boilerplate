# Revisão: brand-config

Rodada autônoma do `/cycle`. Li o diff inteiro, o `develop/handoff.md` e as partes do `analyze/plan.md` que
o handoff cita, e apliquei o `docs/review-checklist.md`. Nada foi commitado e nenhuma branch foi criada.

## Branch

- Atual: `spec-backlog-discovery`, sem upstream, `HEAD` igual a `origin/main` (`597f641`). Não é protegida.
- Regex do `/review` sobre o nome atual: `BRANCH INVALIDA: spec-backlog-discovery` (sem `type/`).
- Nome proposto: `feat/brand-config`. O diff toca três apps e três pacotes, então o `project` sai do nome.
  Regex: `branch OK: feat/brand-config`. Não existe branch local nem remota com esse nome.
- Nesta rodada não criei nem renomeei branch: o `/cycle` proíbe. O primeiro passo depois da aprovação é
  `git switch -c feat/brand-config`, que leva o working tree junto. A branch atual fica para trás, sem
  commits, e pode ser apagada depois.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

- `packages/next-config/brand.ts:24-36`: um logo com `;` no host passava pela validação e quebrava a CSP. O
  parser de URL aceita `;`, `,` e aspas no host (`new URL("https://x;sandbox/logo.png").origin` dá
  `https://x;sandbox`), e o `nosecone` escreve a fonte sem escapar: `img-src 'self' https://a;b.com;`. Com
  `https://x;sandbox/logo.png`, o header ganharia uma diretiva `sandbox` e o app deixaria de rodar script.
  É um valor que só o operador do fork define, mas é o tipo de erro de digitação que derruba o site todo.
  **Corrigido**: `PLAIN_HOST_RE` aceita só host com letras, dígitos, ponto e hífen (ou IPv6 entre
  colchetes); fora disso o logo vale como ausente em todas as superfícies. Medi o regex com um `node -e`
  contra 14 URLs: passam `cdn.example.com`, `localhost:3001`, porta, IDN convertido em punycode, IPv6,
  `storage.googleapis.com` e `firebasestorage.googleapis.com`; caem `a;b.com`, `x;sandbox`, `a,b.com`,
  `a'b.com` e `a*b.com`.
- `docs/FORKING.md:22` e `docs/PRE-PRODUCTION.md:684`: diziam que o domínio da própria web serve para
  hospedar o logo. Não serve. `apps/web` não tem `public/`, e o proxy dela redireciona para
  `/<idioma>/<caminho>` todo caminho sem prefixo de idioma (`apps/web/proxy.ts:100-108`), inclusive o de um
  arquivo, porque, ao contrário do `apps/app/proxy.ts:124-126`, ele não tem desvio para asset estático.
  Um `apps/web/public/logo.png` responderia com redirect para `/pt-br/logo.png`. **Corrigido** nos dois
  documentos: CDN ou bucket com leitura pública, e o porquê de a web não servir. O `FORKING.md` também
  passou a dizer a restrição de host acima.

### 🟢 Sugestão / nit

- `apps/app/shared/components/ui/Sidebar.tsx:84`: `brand.name.charAt(0)` corta ao meio um nome que comece
  com emoji (par substituto). Não mexi: caso raro e o fallback só aparece sem logo.
- `apps/web/shared/lib/seo.ts:18` (`normalizeOrigin`) repete o `toOrigin` de `packages/next-config/brand.ts`,
  com as mesmas duas regex. Não mexi, para manter a mudança mínima.
- `apps/web/app/[locale]/(home)/page.tsx:35`: o `logo` do JSON-LD sem logo configurado continua apontando
  para `${baseUrl}/icon.png`. A linha já existia, mas pela leitura do proxy da web esse caminho responde com
  redirect, porque o ícone mora em `app/[locale]/`. Vai para a lista do `/test`.
- `packages/next-config/brand.ts` aceita logo `http:`. Numa página `https` o browser promove ou bloqueia a
  imagem por conteúdo misto. A doc já recomenda `https`; deixei como está.

### ✅ OK

- Corte de MVP da spec `brand-config` bate com o que foi implementado: um lugar só para nome, logo, suporte
  e URL (`getBrand()`), barra lateral, painel de entrada, header, footer e JSON-LD da web, metadata e
  e-mails leem de lá, o app ganhou ícones na raiz, o `FORKING.md` existe, e o padrão neutro aparece sem env.
  Nada do "Fora do corte" entrou.
- Sem leitor órfão, medido com `rg` fora de `node_modules`: `getAppName`, `emailBrand.(name|logoUrl|supportEmail)`,
  `signIn.layout`, `signUp.layout` e `company name` não aparecem em `apps/` nem em `packages/` (a única
  ocorrência de `company name` é a asserção negativa em `sidebarBrand.test.tsx:47`). `Acme` fora de testes
  sobra só em `seed-emulator.mjs:35`, `seedAccounts.ts:12` e no comentário de `packages/email/keys.ts:22`,
  as três exceções que o plano previa.
- O desvio 1 do handoff procede: `signUp/index.ts` copiava `signInTranslations[...].layout` e as três linhas
  saíram junto com o import.
- String vazia e só espaços valem como ausência nas quatro variáveis de `getBrand()` (`?.trim()` antes de
  cada teste), no `NEXT_PUBLIC_APP_AUTHOR` (`packages/seo/metadata.ts:40-41`) e no
  `VERCEL_PROJECT_PRODUCTION_URL` (`apps/web/shared/lib/seo.ts:34`). As variáveis são `z.string().optional()`
  com `skipValidation: true` em `packages/next-config/keys.ts`, então `""` do `.env.example` não derruba o
  boot.
- Remetente (`packages/email/sender.ts`): `RESEND_FROM` já chega aparado pelo `emptyToUndefined` de
  `keys.ts:10-16`; um valor que já traz nome casa com `displayNameSender` e sai intacto; `\r`, `\n`, aspas,
  `\`, `<` e `>` saem do nome, e o nome vai entre aspas quando tem especial da RFC 5322. `ownerInbox()` não
  mudou.
- `favicon.ico`: li os bytes. ICONDIR com 1 imagem 32×32, 32 bpp, 109 bytes no offset 22; o PNG embutido
  tem color type `06` (RGBA) no byte 47. Tamanho do arquivo 131 = 22 + 109. `file` confirma.
- Ícones fora do proxy do app: `favicon.ico` está no `matcher` (`apps/app/proxy.ts:112`) e `icon.png`/
  `apple-icon.png` caem no `isStaticAssetPath` (`:124-126`, chamado em `:156`).
- `Avatar` é `"use client"` (`packages/design-system/components/ui/avatar.tsx:1`), então usá-lo no layout
  RSC do painel de entrada é válido. `src={brand.logoUrl ?? undefined}` não emite `src=""`.
- `getBrand()` lê `process.env.NEXT_PUBLIC_*` por acesso literal, que o Next inlina no bundle do cliente e do
  servidor. O `turbo.json` está em `envMode: "loose"` e o build dos apps Next inclui `NEXT_PUBLIC_*` no hash
  por inferência de framework.
- Dependências: `@repo/seo` e `@repo/email` passam a depender de `@repo/next-config`, sem ciclo e sem pacote
  importando de `apps/*`. Os links existem em `packages/{email,seo}/node_modules/@repo/next-config`.
- `pnpm-lock.yaml`: 9 inserções, só os dois `@repo/next-config: link:../next-config` (email e seo) e o
  `vitest 4.0.3` de `packages/next-config`, versão que já estava no lock.
- i18n: `layout.supportNote` entrou em pt-br, en e es com o mesmo placeholder; o bloco `signIn.layout` saiu
  dos três. Nenhum `error.code` novo.
- Comentários: nenhum cita o fluxo; os que existem explicam restrição externa (hex nos e-mails, decoder de
  ICO do Next, host na CSP). Nenhum `console.log`.
- Varredura de segredo em `docs/features/brand-config/`, `docs/FORKING.md`, `docs/SETUP.md`,
  `docs/PRE-PRODUCTION.md` e `specs/`: nenhuma senha, token ou chave, e nenhum e-mail fora de
  `@example.com`.

### 👁 Verificar no `/test`

Nada disto dá para confirmar lendo o código. Em ordem de risco:

1. **Logo real carregando sem violação de CSP.** Com `NEXT_PUBLIC_APP_LOGO_URL` apontando para um PNG
   público de verdade, rodar `build && start` de app e web; `curl -sI` de `/pt-br/sign-in` (app) e `/pt-br`
   (web) tem de trazer a origem no `img-src`; no browser, barra lateral (comum e admin), painel de entrada e
   header da web trocam o fallback pela imagem e o console não mostra violação (na web a CSP é report-only,
   então procurar o relatório).
2. **Logo malformado não mexe na CSP.** Repetir o `curl -sI` com `https://x;sandbox/logo.png`,
   `/logo.png`, `ftp://cdn.example.com/l.png` e `"   "`: o `img-src` tem de sair igual ao de sem logo e o
   header não pode ter `sandbox`. Com `https://cdn.example.com:8443/l.png` a origem tem de levar a porta.
3. **`favicon.ico` em produção.** O 500 do handoff apareceu no `next dev`. Em `pnpm --filter app build &&
   start`: `/favicon.ico` → `200 image/x-icon`, `/icon.png` e `/apple-icon.png` → `200 image/png` sem
   redirect, e uma rota qualquer (`/pt-br/sign-in`) → `200`.
4. **Logo que falha ao carregar** (URL 404) mantém o fallback, sem ícone de imagem quebrada, nas três
   superfícies.
5. **Fallback no SSR.** O HTML do servidor traz o fallback (inicial na barra lateral, `CommandIcon` no
   painel, triângulo na web) mesmo com logo configurado; conferir se a troca depois da hidratação não pula o
   layout.
6. **`createMetadata` com e sem env.** `<title>` e `og:site_name` com `NEXT_PUBLIC_APP_NAME="QA Brand"` e
   sem ela, no app e na web; `NEXT_PUBLIC_APP_AUTHOR="   "` tem de dar autor e `publisher` igual ao nome da
   marca.
7. **Env vazia por cópia do `.env.example`.** Com as três variáveis em `""` e em `"   "`, os três apps
   buildam e mostram `next-boilerplate`. O handoff buildou sem as variáveis, não com elas vazias.
8. **`/icon.png` e `/favicon.ico` da web.** `curl -sI localhost:3001/icon.png` (é o `logo` do JSON-LD sem
   logo configurado) e `curl -sI localhost:3001/favicon.ico` (fora do `matcher`, sem arquivo na web). Anotar
   status e destino do redirect.
9. **Tema, responsivo e idiomas.** Contraste do nome e do fallback em light e dark; barra lateral recolhida só
   com a inicial; header da web com nome de 30 caracteres sem quebra; nenhum texto do depoimento no painel em
   pt-br, en e es; formulário acima do banner de cookies.
10. **Preview de e-mail (3003)** com e sem as variáveis, para saber se o preview repassa a env ao render.
11. **Remetente com nome não ASCII** (`NEXT_PUBLIC_APP_NAME="Café"`): só dá para medir com envio real pela
    Resend. Sem chave, fica 🔒.

## Lacunas de teste

- Header e footer da web renderizados com nome configurado: **continua aberta** (só o
  `headerInteractiveNesting.test.tsx` exercita o header).
- `createMetadata` com `NEXT_PUBLIC_APP_NAME` e com `NEXT_PUBLIC_APP_AUTHOR` só com espaços: **continua
  aberta**.
- `AvatarImage` trocando o fallback quando a imagem carrega: **fora do alcance do unitário** (o jsdom não
  carrega imagem); fica para o item 1 da lista acima.
- **Nova, desta revisão:** `packages/next-config/__tests__/brand.test.ts` não cobre host com `;`, `,` ou
  aspas. Falta um caso no `it.each` de "discards" com `https://x;sandbox/logo.png` e `https://a,b.com/l.png`,
  e um em `securityPolicySources.test.ts` (app e web) confirmando o `img-src` inalterado para esses valores.
  Não criei os testes: é do `/test`.

## Decisões em aberto

- Nome da branch: `feat/brand-config`, criada a partir da atual com `git switch -c` antes do primeiro commit.
  Recomendação: aceitar.
- `spec-backlog-discovery` fica sem commits depois disso. Recomendação: apagar com `git branch -d` depois do
  push da nova.

## Gates

| Gate | Comando | Resultado |
|------|---------|-----------|
| lint | `pnpm check` | `Checked 771 files in 258ms. No fixes applied.` |
| typecheck | `pnpm turbo run typecheck --filter=@repo/next-config --filter=@repo/email --filter=@repo/seo --filter=app --filter=web --filter=api --filter=@repo/internationalization` | `7 successful, 7 total` (6 do cache; só `@repo/next-config` rodou, por causa da minha edição) |
| paridade de i18n | não remedida | minhas edições não tocaram `@repo/internationalization`; vale o número do handoff: `6/59` (arquivos/testes), paridade inclusa |

Não rodei a suíte de testes. A mudança em `brand.ts` só restringe hosts; os valores aceitos pelos testes
existentes (`cdn.example.com`, `localhost`) continuam aceitos, conferido no `node -e` acima.

## Plano de commits

Antes do primeiro: `git switch -c feat/brand-config` e `git diff --cached --stat` vazio. Depois de cada um,
`git show --stat --oneline HEAD` contra a lista. Os commits de pacote antes do de i18n não compilam sozinhos
(o `layout.tsx` do e-mail lê `layoutCopy.supportNote`), consequência da ordem que a regra do repo fixa.

1. `feat(next-config): add a brand module read from public env vars`
   `packages/next-config/brand.ts`, `packages/next-config/keys.ts`, `packages/next-config/package.json`,
   `packages/next-config/vitest.config.mts`, `packages/next-config/__tests__/brand.test.ts`
2. `feat(seo): take the application name from the brand module`
   `packages/seo/metadata.ts`, `packages/seo/package.json`
3. `feat(email): render name, logo and support line from the brand module`
   `packages/email/brand.ts`, `packages/email/components/layout.tsx`, `packages/email/templates/action-link.tsx`,
   `packages/email/templates/welcome.tsx`, `packages/email/templates/contact.tsx`, `packages/email/package.json`,
   `packages/email/__tests__/layout.test.tsx`, `packages/email/__tests__/templates.test.tsx`,
   `packages/email/__tests__/previews.test.tsx`, `packages/email/__tests__/emailCopy.test.ts`
4. `feat(email): name a bare sender address after the brand`
   `packages/email/sender.ts`, `packages/email/keys.ts`, `packages/email/index.ts`,
   `packages/email/__tests__/sendEmail.test.ts`
5. `chore: link @repo/next-config into seo and email in the lockfile`
   `pnpm-lock.yaml`
6. `chore(api): declare the brand variables in the example env`
   `apps/api/.env.example`
7. `feat(app): show the configured brand in the sidebar and sign-in panel`
   `apps/app/shared/components/ui/Sidebar.tsx`, `apps/app/app/[locale]/(unauthenticated)/layout.tsx`,
   `apps/app/__tests__/sidebarBrand.test.tsx`, `apps/app/__tests__/authLayoutBrand.test.tsx`,
   `apps/app/.env.example`
8. `feat(app): allow the brand logo origin in the image policy`
   `apps/app/proxy.ts`, `apps/app/__tests__/securityPolicySources.test.ts`
9. `feat(app): add favicon and app icons at the root segment`
   `apps/app/app/favicon.ico`, `apps/app/app/icon.png`, `apps/app/app/apple-icon.png`,
   `apps/app/__tests__/appIcons.test.ts`
10. `feat(web): read the brand in the header, footer and home JSON-LD`
    `apps/web/app/[locale]/components/header/index.tsx`, `apps/web/app/[locale]/components/footer.tsx`,
    `apps/web/app/[locale]/(home)/page.tsx`, `apps/web/shared/lib/seo.ts`, `apps/web/.env.example`
11. `feat(web): allow the brand logo origin in the image policy`
    `apps/web/proxy.ts`, `apps/web/__tests__/securityPolicySources.test.ts`
12. `feat(internationalization): drop the sample testimonial and add the email support line`
    `packages/internationalization/translations/apps/app/pages/signIn/index.ts`,
    `packages/internationalization/translations/apps/app/pages/signUp/index.ts`,
    `packages/internationalization/translations/packages/email/index.ts`
13. `docs: add the fork guide and document the brand variables`
    `docs/FORKING.md`, `docs/SETUP.md`, `docs/PRE-PRODUCTION.md`, `README.md`
14. `docs(specs): add six specs from the backlog discovery with research notes`
    `specs/accessibility-conformance.md`, `specs/account-email-change.md`, `specs/brand-config.md`,
    `specs/compliance-docs-kit.md`, `specs/plan-entitlements.md`, `specs/storage-emulator-rules-tests.md`,
    `specs/research/compliance-trust-baseline.md`, `specs/research/engineering-baseline.md`,
    `specs/research/saas-starter-feature-benchmark.md`
15. `docs(specs): audit the backlog after #29`
    `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/observability-logging.md`,
    `specs/teams-organizations.md`
    O `BACKLOG.md` também indexa as specs da descoberta; separar as duas coisas nele exigiria `git add -p`.
16. `docs(features): brand-config`
    `docs/features/brand-config/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`)

Título de PR sugerido: `feat: brand config in one place and a fork guide`. Depois do último commit, o
`/review` pergunta se deve rodar `git push -u origin feat/brand-config`.

### Commits realizados

(preenchido pelo orquestrador)
