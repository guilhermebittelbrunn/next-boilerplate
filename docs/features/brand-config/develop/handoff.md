# Handoff do desenvolvimento: brand-config

Implementação do corte do `analyze/plan.md` sem acréscimo de escopo. Nenhuma branch criada, nada
commitado. Rodada autônoma do `/cycle`.

## Desvios do plano

Cinco deles mudam o que o revisor vai ler. Os dois primeiros corrigem erro do plano.

1. **`signUp.layout` também lia o depoimento.** O plano dizia que nenhum outro leitor usava
   `signIn.layout`. O `tsc` de `@repo/internationalization` acusou três erros em
   `translations/apps/app/pages/signUp/index.ts:28,54,80`, onde `layout: signInTranslations[...].layout`
   copiava o bloco para o cadastro. Removi as três linhas e o import de `signInTranslations`. Não há leitor
   de `signUp.layout` no código (`grep -rn "signUp.layout" apps packages` → vazio).
2. **O `favicon.ico` do plano derrubava o app inteiro.** Embutir o `icon.png` da web como está (PNG
   gray+alpha) gera um ICO que o decoder do Next recusa: no `next dev`, `GET /pt-br/sign-in` respondeu `500`
   com `Format error decoding Ico: The PNG is not in RGBA format!` no log. Reencodei o PNG para RGBA antes
   de embutir, e a mesma rota passou a responder `200`. `appIcons.test.ts` ganhou um caso que cobra o byte
   de color type `6` no PNG embutido, e o `FORKING.md` avisa o fork.
3. **Lockfile.** O `pnpm install` também deduplicou três pacotes transitivos (`fdir@6.4.3`,
   `magic-string@0.30.17`, `picomatch@4.0.2`). Reverti esses trechos à mão e deixei só os links de
   workspace: `git diff --stat pnpm-lock.yaml` → `9 insertions(+)` (os dois `@repo/next-config: link` e o
   `vitest` de `packages/next-config`, na versão `4.0.3` que já estava no lock).
   `pnpm install --frozen-lockfile --offline` aceita o lock assim.
4. **`emailCopy.test.ts`** (fora da tabela §7 do plano) lista os placeholders que o `interpolate` resolve.
   Acrescentei `supportEmail`. Sem isso, a chave nova reprovaria o teste.
5. **Cor do fallback.** O `AvatarFallback` do design system traz `bg-muted text-muted-foreground`. No painel
   de entrada passei `text-primary` e, no header da web, `text-current`, para o ícone manter a cor que tinha
   antes. O SVG do header usa `aria-hidden="true"` (string), porque o Biome (`noSvgWithoutTitle`) recusa o
   atributo booleano.

Menores:

- `createMetadata` lê `NEXT_PUBLIC_APP_AUTHOR?.trim() || nome`, e `getWebBaseUrl` lê
  `VERCEL_PROJECT_PRODUCTION_URL?.trim()`, para que só espaços também conte como ausência.
- A asserção `payload.from === FROM` de `sendEmail.test.ts` continua a mesma. O bloco "with credentials"
  passou a fixar `NEXT_PUBLIC_APP_NAME=""`, e os casos com nome estão num `describe("sender name")` novo.

## Blueprint → arquivos

| Item | Arquivos |
|------|----------|
| 10.1 módulo de marca | `packages/next-config/brand.ts` (novo) |
| 10.2 declaração das env | `packages/next-config/keys.ts` |
| setup de teste do `next-config` | `packages/next-config/vitest.config.mts` (novo), `package.json` (`test`, `vitest ^4.0.3`), `__tests__/brand.test.ts` (novo) |
| metadata | `packages/seo/metadata.ts`, `packages/seo/package.json` |
| e-mail: paleta, layout, templates | `packages/email/brand.ts`, `components/layout.tsx`, `templates/{action-link,welcome,contact}.tsx`, `package.json` |
| e-mail: remetente | `packages/email/sender.ts` (novo), `keys.ts` (`displayNameSender` exportado), `index.ts` |
| testes do e-mail | `packages/email/__tests__/{layout,templates,previews,sendEmail,emailCopy}.test.*` |
| barra lateral | `apps/app/shared/components/ui/Sidebar.tsx`, `apps/app/__tests__/sidebarBrand.test.tsx` (novo) |
| painel de entrada | `apps/app/app/[locale]/(unauthenticated)/layout.tsx`, `apps/app/__tests__/authLayoutBrand.test.tsx` (novo) |
| CSP do app | `apps/app/proxy.ts`, `apps/app/__tests__/securityPolicySources.test.ts` |
| ícones do app | `apps/app/app/{favicon.ico,icon.png,apple-icon.png}` (novos), `apps/app/__tests__/appIcons.test.ts` (novo) |
| web | `apps/web/app/[locale]/components/header/index.tsx`, `footer.tsx`, `(home)/page.tsx`, `apps/web/shared/lib/seo.ts` (`getAppName` removido), `apps/web/proxy.ts`, `apps/web/__tests__/securityPolicySources.test.ts` |
| `.env.example` | `apps/app`, `apps/web`, `apps/api` |
| i18n | `translations/apps/app/pages/signIn/index.ts` (sai `layout`), `signUp/index.ts` (desvio 1), `translations/packages/email/index.ts` (entra `layout.supportNote`) |
| docs | `docs/FORKING.md` (novo), `docs/SETUP.md` (seção "Marca e SEO"), `docs/PRE-PRODUCTION.md` (item 13), `README.md` (link) |

## Como os ícones foram gerados

`icon.png` (32×32) e `apple-icon.png` (192×192) são cópias dos arquivos de `apps/web/app/[locale]/`: a forma
abstrata preta do next-forge, sem nome nem marca. O `favicon.ico` saiu de um `node -e` de uma vez (só
`fs` e `zlib` do Node, nada instalado, script não versionado): decodifica o `icon.png`, converte gray+alpha
em RGBA, reencoda o PNG e escreve ICONDIR + ICONDIRENTRY + PNG. `file apps/app/app/favicon.ico` →
`MS Windows icon resource - 1 icon, 32x32 with PNG image data, 32 x 32, 8-bit/color RGBA`.

## Contrato

Sem mudança em `@repo/sdk` nem em rota da API. Superfícies públicas novas ou alteradas:

- `@repo/next-config/brand`: `getBrand()`, `getBrandLogoOrigin()`, `DEFAULT_BRAND_NAME`, tipo `Brand`.
  Leitores: `packages/seo/metadata.ts`, `packages/email/{components/layout,sender,templates/*}`,
  `apps/app/{proxy.ts,Sidebar.tsx,(unauthenticated)/layout.tsx}`,
  `apps/web/{proxy.ts,shared/lib/seo.ts,header,footer,(home)/page.tsx}`.
- `packages/email/brand.ts`: `emailBrand` perdeu `name`, `logoUrl` e `supportEmail`
  (`grep -rn "emailBrand\.\(name\|logoUrl\|supportEmail\)" apps packages` → vazio).
- `apps/web/shared/lib/seo.ts`: `getAppName` removido (`grep -rn getAppName apps packages` → vazio).
- `sendEmail` passa a enviar `from: withBrandSender(RESEND_FROM)`. `ownerInbox()` não mudou.

## Códigos de erro

Nenhum `error.code` novo, nenhuma entrada em `apiErrors`.

## Validação (medida)

| Gate | Comando | Resultado |
|------|---------|-----------|
| typecheck + test | `pnpm turbo run typecheck test --filter=app --filter=web --filter=api --filter=@repo/email --filter=@repo/seo --filter=@repo/next-config --filter=@repo/internationalization` | `18 successful, 18 total` |
| testes por workspace | mesma linha, só `test` | `@repo/next-config` 1/23 · `@repo/email` 7/164 · `@repo/internationalization` 6/59 (paridade inclusa) · `app` 85/672 · `web` 12/66 · `api` 74/935 (arquivos/testes) |
| lint | `pnpm check` | `Checked 771 files … No fixes applied.` |
| build sem marca | `pnpm exec next build` em `apps/app`, `apps/web`, `apps/api`, sem nenhuma var de marca (`grep -c` das três nos `.env` locais → `0`, e nenhuma na shell) | `exit 0` nos três; `.next/server/app/` do app contém `favicon.ico`, `icon.png` e `apple-icon.png` |
| sinal de pronto | `grep` do §8 do plano | exatamente as 3 linhas esperadas: `seed-emulator.mjs:35`, `seedAccounts.ts:12`, `packages/email/keys.ts:22` |

Smoke local, só para me desbloquear (não é validação):

- App sem marca, `next dev`: `curl /favicon.ico` → `200 image/x-icon`; `/icon.png` e `/apple-icon.png` →
  `200 image/png` sem redirect; `/pt-br/sign-in` → `200`, `<title>Entrar | next-boilerplate</title>`,
  0 ocorrências de `Sofia|Acme|blockquote`, painel com o ícone `lucide-command` no fallback seguido de
  `next-boilerplate`; `img-src 'self' data: blob: https://lh3.googleusercontent.com https://storage.googleapis.com`.
- App com `NEXT_PUBLIC_APP_NAME="QA Brand"` e `NEXT_PUBLIC_APP_LOGO_URL=https://cdn.example.com/brand/logo.png`:
  `/en/sign-in` → `<title>Sign In | QA Brand</title>`; `img-src` termina em `https://cdn.example.com`. No
  HTML do servidor o avatar vem com o fallback: o Radix só troca pela imagem no cliente, depois do load.
- Web sem marca: `/pt-br` → `<title>Início | next-boilerplate</title>`, JSON-LD `Organization` com
  `"name":"next-boilerplate"` e `"logo":"http://localhost:3001/icon.png"`, header com `next-boilerplate`,
  `img-src 'self' data: blob:`.

## A verificar no `/test`

Nenhum destes foi medido aqui:

- **Logo carregando no browser**, com uma URL pública de PNG de verdade: barra lateral (comum e admin),
  painel de entrada e header da web trocam o fallback pela imagem, sem violação de CSP no console. O
  `cdn.example.com` do smoke não existe, então só provou o cabeçalho.
- **Logo que falha ao carregar** mantém o fallback, sem imagem quebrada.
- **Tema e responsivo**: contraste do nome e do fallback em light e dark (barra lateral, painel, header);
  barra lateral recolhida só com a inicial; header da web com nome de 30 caracteres sem quebrar linha; a
  forma preta do favicon numa aba de browser em tema escuro.
- **Três idiomas** no painel de entrada: nenhum texto do depoimento em `pt-br`, `en` e `es`.
- **Preview de e-mail (3003)** com e sem as variáveis: se o preview server repassa a env para o render. Os
  testes de render cobrem o conteúdo.
- **Banner de cookies** no painel de entrada: o formulário continua acima do banner (o
  `cookieBannerAuthLayoutOffset.test.tsx` só confere o seletor no fonte).
- **`/favicon.ico` da web** (pergunta 3 do plano): se cai no segmento `[locale]`.

## Lacunas de teste conhecidas

- Não há teste de render do header da web nem do footer com nome configurado; o header só é exercitado por
  `headerInteractiveNesting.test.tsx`.
- Nenhum teste de `createMetadata` com `NEXT_PUBLIC_APP_NAME`; o título com a marca aparece só no smoke acima.
- Sem teste de que o `AvatarImage` troca o fallback quando a imagem carrega: o jsdom não carrega imagem.

## Decisões em aberto

Nenhuma nova. As três perguntas do plano seguem com a opção adotada lá.

## Processos

Subi e derrubei três `next dev` (app duas vezes na 3000, web uma vez na 3001), todos com a porta livre
antes. Depois de cada `kill`, `lsof -ti tcp:3000` e `tcp:3001` voltaram vazios. Screenshot nenhum.
