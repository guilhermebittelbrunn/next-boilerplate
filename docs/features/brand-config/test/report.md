# Relatório do `/test`: brand-config

Rodada autônoma do `/cycle` (rodada 1). Branch atual `spec-backlog-discovery`, não protegida, sem commits
além de `origin/main` (`git log origin/main..HEAD` vazio). Não criei branch nem commitei. Os testes novos
ficam no working tree para o `/review` incluir no plano de commits.

## Placar

| Status | Critérios |
|--------|-----------|
| ✅ | 14 |
| ❌ | 0 |
| 🔒 | 1 (remetente com nome não ASCII num inbox real) |

Nenhum defeito de produção atribuível a esta entrega. Encontrei cinco comportamentos anteriores a ela, fora
do escopo, listados em "Observações fora do escopo".

## Cobertura automatizada

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/next-config test` | 1 arquivo, 32 testes, pass (eram 23) |
| `pnpm --filter app exec vitest run __tests__/securityPolicySources.test.ts` | 24 testes, pass |
| `pnpm --filter web exec vitest run __tests__/brandSurfaces.test.tsx __tests__/securityPolicySources.test.ts` | 2 arquivos, 23 testes, pass |
| `pnpm --filter @repo/email exec vitest run __tests__/templates.test.tsx` | 57 testes, pass |
| `pnpm turbo run typecheck --filter=app --filter=web --filter=@repo/next-config` | 3/3 successful |
| `pnpm turbo run typecheck --filter=@repo/email` | 1/1 successful |
| `pnpm exec biome check` nos arquivos de teste tocados | `Checked 22 files … No fixes applied.` |
| `pnpm test` (raiz, sem `--force`) | `Tasks: 12 successful, 12 total`, 2208 testes, pass |

Por workspace no `pnpm test` final: `app` 85/679 · `api` 74/935 · `web` 13/82 · `@repo/email` 7/173 ·
`@repo/next-config` 1/32 · `@repo/internationalization` 6/59 (paridade inclusa) · `@repo/auth` 8/101 ·
`@repo/shared` 4/44 · `@repo/analytics` 2/34 · `@repo/security` 3/31 · `@repo/payments` 4/22 · `e2e` 2/16
(arquivos/testes). O `@repo/seo` não tem script `test`; o `createMetadata` ficou coberto pela suíte da web.

Não remedi o `pnpm check` do repositório inteiro: o `/review` mediu `771 files … No fixes applied`, e eu só
acrescentei arquivos de teste, que passaram no `biome check` acima.

### Testes criados ou estendidos

| Arquivo | O que prova |
|---------|-------------|
| `packages/next-config/__tests__/brand.test.ts` | 5 hosts novos descartados (`x;sandbox`, `a;b.com`, `a,b.com`, `a'b.com`, `a*b.com`) e 4 origens preservadas: porta `8443`, IPv6 `[::1]:8443`, IDN convertido em punycode e `firebasestorage.googleapis.com` com query. |
| `apps/app/__tests__/securityPolicySources.test.ts` | `img-src` inalterado para `"   "`, `ftp:`, `x;sandbox`, `a,b.com` e `a'b.com`; lista de diretivas idêntica e sem `sandbox` com `x;sandbox`; porta preservada na origem. |
| `apps/web/__tests__/securityPolicySources.test.ts` | Os mesmos casos contra o header report-only da web. |
| `apps/web/__tests__/brandSurfaces.test.tsx` (novo) | Header com nome neutro, com nome de 30 caracteres em `whitespace-nowrap` e com o triângulo no HTML do servidor mesmo com logo; footer com nome neutro e com nome aparado; `buildLocaleMetadata`/`createMetadata` com e sem `NEXT_PUBLIC_APP_NAME`, com `NEXT_PUBLIC_APP_AUTHOR="   "` (autor, `creator` e `publisher` iguais à marca) e com autor configurado. |
| `packages/email/__tests__/templates.test.tsx` | Linha de suporte em `welcome` e `action-link` nos 3 idiomas, sem `{supportEmail}` sobrando, e ausente no `contact` nos 3 idiomas. |

Conferi que os casos novos de host pegam a regressão: troquei temporariamente, em
`packages/next-config/brand.ts`, `isHttp && PLAIN_HOST_RE.test(url.hostname)` por `isHttp`. O
`brand.test.ts` falhou em 5 casos, o `securityPolicySources.test.ts` do app em 4 e o da web em 4. Restaurei o
arquivo a partir da cópia e conferi com `cmp` que ficou idêntico.

### Decisões de custo de teste

Nenhum teste da faixa cara. Tudo entrou em unitário ou render de servidor (`renderToString`/
`renderToStaticMarkup`), porque nenhuma parte do diff depende de consulta ao Firestore, regra de segurança
ou emissão de sessão.

- `packages/next-config/brand.ts`: função pura com `vi.stubEnv`, o nível mais barato.
- `apps/app/proxy.ts` e `apps/web/proxy.ts`: a suíte existente já chama o proxy real e lê o header. Estendi
  ela em vez de subir servidor. O que só o build prova (a variável inlinada no bundle do proxy) medi com
  `curl` no e2e.
- Header e footer da web: render de servidor com `@repo/auth/provider`, `@/env` e consentimento mockados,
  como no `headerInteractiveNesting.test.tsx`. Tema e quebra de linha real ficaram com o browser.
- `createMetadata`: testado por `buildLocaleMetadata`, que é quem a web chama. O `@repo/seo` não tem suíte
  própria, e criar uma só para isso seria setup novo sem ganho.
- `AvatarImage` trocando o fallback: o jsdom não carrega imagem, então isso ficou no e2e.
- Sidebar, painel de entrada, ícones do app, e-mails e remetente: `sidebarBrand.test.tsx`,
  `authLayoutBrand.test.tsx`, `appIcons.test.ts`, `layout.test.tsx` e `sendEmail.test.ts` já cobriam e
  passaram; não acrescentei cenário.

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|------|----------|
| 1 | Logo real carregando sem violação de CSP | **Confirmado.** Build com logo `https://www.gstatic.com/images/branding/product/2x/googleg_48dp.png` (PNG 96×96 RGBA público). App: `img-src 'self' data: blob: https://lh3.googleusercontent.com https://www.googletagmanager.com https://www.gstatic.com`; a imagem carregou (`naturalWidth` 96) na barra lateral admin e comum, expandida e recolhida, e no painel de entrada. Web: `img-src 'self' data: blob: https://www.gstatic.com` no report-only; header com a imagem (18 px). Com um listener de `securitypolicyviolation`, o logo recarregado não gerou violação, e uma imagem da `upload.wikimedia.org` gerou `img-src` `enforce` no app (bloqueada) e `report` na web. |
| 2 | Logo malformado não mexe na CSP | **Confirmado.** Build com `https://x;sandbox/logo.png`: app `img-src 'self' data: blob: https://lh3.googleusercontent.com` e web `img-src 'self' data: blob:`, iguais ao build sem marca, com as mesmas 15 diretivas e sem `sandbox`; `x;sandbox` não aparece no HTML e o painel mostra o fallback. Build com `"   "`: idem. `/logo.png`, `ftp://…` e a porta `:8443` medi no unitário contra o proxy real dos dois apps, não em build. |
| 3 | `favicon.ico` em produção | **Confirmado** nos builds A, A2 e B: `/favicon.ico` `200 image/x-icon`, `/icon.png` e `/apple-icon.png` `200 image/png` sem redirect, `/pt-br/sign-in`, `/en/sign-up` e `/es/forgot-password` `200`. O arquivo servido é `MS Windows icon resource - 1 icon, 32x32 … 8-bit/color RGBA`. As URLs com hash do `<head>` também respondem `200` sem sessão. |
| 4 | Logo que falha ao carregar | **Confirmado.** Build com `https://www.gstatic.com/images/branding/qa-brand-config-missing.png` (404 medido): barra lateral com a inicial `U`, painel com `lucide-command`, header com o triângulo; lista de `<img>` com `naturalWidth` 0 vazia nas três telas. |
| 5 | Fallback no SSR e salto de layout | **Confirmado.** Com logo configurado, o HTML do servidor traz `data-slot="avatar-fallback"` e `lucide-command` no painel, o path do triângulo na web e nenhum `<img>`. Avatar com tamanho fixo e igual nos dois estados: 32×32 na barra lateral, 24 px no painel (nome começa em x=72 com ícone e com logo), 18×18 no header. |
| 6 | `createMetadata` com e sem env | **Confirmado.** Sem env: `<title>Entrar \| next-boilerplate</title>`, `og:site_name` `next-boilerplate`. Com `"  QA Brand  "`: `Entrar \| QA Brand`, `Sign In \| QA Brand`, `Iniciar sesión \| QA Brand` no app; na web `Início \| QA Brand`, e com `NEXT_PUBLIC_APP_AUTHOR="   "` os metas `author` e `publisher` saem `QA Brand`. Também em `brandSurfaces.test.tsx`. |
| 7 | Env vazia por cópia do `.env.example` | **Confirmado.** `next build` com as três variáveis em `""` e em `"   "`: app, web e api com exit 0; app e web mostram `next-boilerplate` em todas as superfícies. O build da api usou o `.env` local da api, porque o `next build` dela exige o service account. |
| 8 | `/icon.png` e `/favicon.ico` da web | **Medido.** `/icon.png` → `307` para `/pt-br/icon.png`, que responde `200 image/png`. `/favicon.ico` → `200 text/html`, com o HTML da home (`<title>Início \| next-boilerplate</title>`). O `<head>` da web declara `/pt-br/icon.png?icon.0ba89231.png`. Comportamento anterior à entrega; ver a observação O2. |
| 9 | Tema, responsivo e idiomas | **Confirmado**, com as ressalvas O4 e O5 (contraste do fallback no light e quebra do nome longo na barra lateral). |
| 10 | Preview de e-mail com e sem as variáveis | **Confirmado.** O preview server repassa a env do processo ao render. Sem variáveis: `next-boilerplate`, sem `<img>`, sem linha de suporte. Com `QA Brand`, logo e `qa-brand-config@example.com`: `welcome` e `action-link` com `<img alt="QA Brand">` carregado (96 px), "Equipe QA Brand" e "Dúvidas? Escreva para qa-brand-config@example.com."; `contact` com logo e assinatura, sem a linha de suporte. |
| 11 | Remetente com nome não ASCII | **🔒 não verificável.** Precisa de envio real pela Resend e de uma caixa de entrada. O saneamento e a composição do `from` estão cobertos pelo `sendEmail.test.ts`. |

## Critérios de aceite: status por item

| Critério | Status | Meio |
|----------|--------|------|
| Sem variável de marca, padrão neutro | ✅ | build + curl + e2e + unit |
| Nome configurado em todas as superfícies | ✅ | e2e + curl + unit (assunto do e-mail no `templates.test.tsx`) |
| Logo substitui o fallback; logo inválido ignorado | ✅ | e2e + unit |
| Logo que não carrega mantém o fallback | ✅ | e2e |
| Fallback no HTML do servidor, sem salto de layout | ✅ | curl + e2e + unit |
| CSP deixa passar o logo e só ele | ✅ | curl em build + e2e (listener de violação) + unit |
| Depoimento fora do painel | ✅ | e2e (5 páginas, 3 idiomas) |
| `/favicon.ico` do app em produção | ✅ | curl em `next start` + e2e (`<head>`) |
| Linha de suporte dos e-mails | ✅ | preview + unit (3 idiomas) |
| Remetente com nome configurado | ✅ | unit (`sendEmail.test.ts`, Resend mockada) |
| Nome não ASCII no inbox | 🔒 | exige Resend real |
| Nenhuma marca fixa no código | ✅ | `rg` |
| Roteiro de fork | ✅ | leitura de `docs/FORKING.md` e `docs/SETUP.md` |
| Tema e responsivo | ✅ | e2e |
| Ícones e logo de fallback da web | ✅ | curl |

## Evidências e2e (o texto é a prova)

Todas as medidas foram feitas em `next build && next start` para app e web, com a api em `next dev` e o
Auth + Firestore no emulador. Os prints em `test/e2e/` (27 arquivos, descartados pelo `.gitignore`) só
apoiam o que está escrito aqui.

Configurações de build, uma por vez:

| Rótulo | Variáveis |
|--------|-----------|
| A | as três em `""` (valores do `.env.example`) |
| A2 | as três em `"   "` |
| B | `NEXT_PUBLIC_APP_NAME="  QA Brand  "`, logo PNG público da `www.gstatic.com`, suporte `qa-brand-config@example.com`, `NEXT_PUBLIC_APP_AUTHOR="   "`, `NEXT_PUBLIC_GA_MEASUREMENT_ID="G-QA0000000"` (só para o banner de cookies aparecer) |
| C | nome `Uma Marca Com Trinta Caractere` (30 caracteres) e logo que responde 404 |
| D | logo `https://x;sandbox/logo.png`, nome ausente |

Usei a URL pública, não um servidor local: havia rede.

**Painel de entrada.** Sem marca, desktop 1440×900: "next-boilerplate" ao lado do ícone `lucide-command`,
nome `lab(7.8)` sobre `lab(96.5)` no light (cerca de 16:1) e `lab(98.3)` sobre `lab(15.2)` no dark (cerca
de 14,5:1). Nenhum `blockquote`, "Sofia", "Acme" ou "depoimento" em `/sign-in`, `/sign-up`,
`/forgot-password` (3 idiomas), `/reset-password` e `/verify-email`. No mobile (390×844) o painel está
oculto (`hidden lg:flex`, anterior à entrega) e o formulário ocupa a tela. Com o banner de cookies aberto,
rolando até o fim, o card termina em y≈437 e o banner começa em y≈666 no desktop; no mobile o link
"Cadastrar" fica em y≈338 e o banner em y≈504.

**Barra lateral.** Comum (`user@example.com`) e admin (`admin@example.com`), light e dark, pt-br, en e es.
Sem marca: inicial `N` e "next-boilerplate"; recolhida, só `N`; no mobile, a gaveta abre com `N` e o nome.
Com B: imagem de 32 px e "QA Brand", e recolhida só a imagem. Nenhuma ocorrência de "company name".
Fallback `N` com `lab(48.5)` sobre `lab(96.5)` no light (4,3:1) e `lab(66.1)` sobre `lab(15.2)` no dark
(5,8:1). Com o nome de 30 caracteres, a barra lateral de 256 px quebra o nome em duas linhas.

**Header, footer e JSON-LD da web.** Sem marca: triângulo e "next-boilerplate" numa linha, footer
`<h2>next-boilerplate</h2>`, `Organization` com `"logo":"http://localhost:3001/icon.png"`. Com B: imagem de
18 px e "QA Brand", `Organization` e `WebSite` com `"name":"QA Brand"` e `"logo"` igual à URL do logo.
Nome em `lab(2.75)` sobre branco no light e `lab(98.3)` sobre `lab(2.75)` no dark, acima de 18:1. Com o nome
de 30 caracteres, uma linha em 1440, 1024, 390 e 360 px.

**E-mails (3003).** Ver o item 10 da tabela acima.

## Observações fora do escopo

Nada disto vem do diff desta entrega. Medi com o nome padrão para separar o que é anterior. Nenhum item
bloqueia a entrega; as sugestões são hipóteses.

- **O1. Idioma atrasado em uma navegação.** A web decide o idioma do servidor pelo cookie `x-locale`, que o
  proxy grava na mesma resposta. `curl /en` sem cookie devolve `lang="pt-br"` e `<title>Início …`; no
  browser, `/es` logo depois de `/en` renderizou "Home". O `lang` do `<html>` do app e o banner de cookies
  mostram o mesmo atraso (banner em inglês em `/pt-br/sign-in` vindo de `/en/verify-email`). Um reload
  corrige. Não afeta o nome da marca, que não depende de idioma.
- **O2. `/favicon.ico` da web responde `200 text/html`** com a home, e o `logo` do JSON-LD sem logo
  configurado depende de um `307`. Sugestão: tirar `favicon.ico` do proxy da web e servir o arquivo na raiz
  de `apps/web/app/`, como o app faz.
- **O3. Header da web estoura a largura em 1024 px** em pt-br (6 px, o botão "Cadastrar" fica cortado) e em
  es (49 px), com `next-boilerplate` e com o nome de 30 caracteres; en cabe. Medido pelo `scrollWidth` do
  documento.
- **O4. Contraste do `AvatarFallback` no light** (4,3:1, abaixo do AA 4,5:1 para texto de 14 px). É o
  estilo padrão `bg-muted text-muted-foreground` do design system, o mesmo do avatar do usuário na navbar.
- **O5. Nome longo quebra em duas linhas na barra lateral** e empurra o menu 8 px para baixo. O critério de
  30 caracteres vale para o header da web; a quebra não corta nem sobrepõe nada.

## Lacunas herdadas: veredito

| Lacuna | Origem | Veredito |
|--------|--------|----------|
| Header e footer da web com nome configurado | handoff, review | **Fechada aqui** (`brandSurfaces.test.tsx`) |
| `createMetadata` com `NEXT_PUBLIC_APP_NAME` e autor só com espaços | handoff, review | **Fechada aqui** (`brandSurfaces.test.tsx` + curl em build) |
| `AvatarImage` trocando o fallback quando a imagem carrega | handoff, review | **Fechada aqui** no e2e; continua fora do alcance do unitário |
| `brand.test.ts` e `securityPolicySources.test.ts` sem host com `;`, `,`, `'` | review | **Fechada aqui**, com a regressão provocada de propósito |
| Banner de cookies sobre o formulário | handoff | **Fechada aqui** no e2e |
| `/favicon.ico` da web | handoff (pergunta 3 do plano) | **Medida**; o comportamento anterior continua aberto como O2 |
| Forma preta do favicon numa aba em tema escuro | handoff | **Fora de escopo**: o browser headless não mostra a aba, e o ícone definitivo é do fork (item 13 do `PRE-PRODUCTION.md`) |
| Linha de suporte em en e es | levantada aqui | **Fechada aqui** (`templates.test.tsx`) |

## Ambiente do e2e

Todas as portas estavam livres antes (`3000`, `3001`, `3002`, `3003`, `9099`, `8080`, `4001`). Não reutilizei
nada do usuário.

| Serviço | Como | Encerrado |
|---------|------|-----------|
| Emuladores Auth + Firestore | `pnpm emulators` com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`, seed com `pnpm seed` | sim, por PID |
| api | `next dev -p 3002`, env do emulador | sim, por PID |
| app | `next build` + `next start -p 3000`, cinco vezes (A, A2, B, C, D) | sim, por PID |
| web | `next build` + `next start -p 3001`, cinco vezes | sim, por PID |
| preview de e-mail | `email dev --port 3003`, sem e com as variáveis | sim, por PID |
| browser do `agent-browser` | comandos em sequência | `agent-browser close` |

O env de cada app saiu do `buildStackEnv` de `apps/e2e/support/stackEnv.ts`, gravado em `/tmp`, fora do
repositório: parte do `.env.example`, esvazia o service account e as `NEXT_PUBLIC_FIREBASE_*` reais e aponta
para o emulador `demo-next-boilerplate`. No fim, `lsof -ti tcp:<porta>` saiu vazio para 3000, 3001, 3002,
3003, 9099, 8080, 4001, 4400, 4500 e 9150, e nenhum processo `next`, `email dev` ou emulador ficou vivo.
Nenhum harness temporário ficou no repositório.

## Contas e dados de QA

- Usei só as contas do seed do emulador (`user@example.com` e `admin@example.com`; a senha está em
  `docs/SETUP.md` e vale só no emulador). O estado morreu com o processo.
- Não criei conta em projeto Firebase real e não acrescentei nada ao `docs/PRE-PRODUCTION.md`.
  `qa-brand-config@example.com` entrou só como valor de variável.
- O `build` da api (A e A2) leu o `.env` local, com o service account do projeto de dev, e não gravou dados.
- **Estado de dev alterado:** o `.next` de `apps/app` e `apps/web` guarda o build D (logo malformado, nome
  padrão), e o de `apps/api` o build A. O próximo `pnpm build` sobrescreve; `next dev` usa `.next/dev`.

## Roteiro manual

1. Com as três variáveis de marca vazias, rode `pnpm --filter app build && pnpm --filter app start` e abra
   `/pt-br/sign-in`: painel com ícone e "next-boilerplate", sem depoimento.
2. Com `NEXT_PUBLIC_APP_NAME="QA Brand"` e `NEXT_PUBLIC_APP_LOGO_URL` num PNG público, refaça o build.
   `curl -sI localhost:3000/pt-br/sign-in` tem de trazer a origem do logo no `img-src`; painel e barra
   lateral mostram a imagem, e o console não mostra violação.
3. Troque o logo por uma URL que dá 404 e refaça o build: as três superfícies mostram o fallback.
4. Troque por `https://x;sandbox/logo.png`: o `img-src` volta ao do passo 1 e o header não tem `sandbox`.
5. `curl -sI localhost:3000/favicon.ico` responde `200 image/x-icon`.
6. Suba o preview de e-mail com as variáveis e abra `welcome`, `action-link` e `contact`: logo, "Equipe QA
   Brand" e linha de suporte só nos dois primeiros.

## Cross-check

- `apps/app` × `apps/web`: mesma origem de logo no `img-src` (enforce no app, report-only na web).
- Comum × admin: barra lateral medida nos dois. A personificação não foi exercitada; usa o mesmo
  `GlobalSidebar`.
- `subscription` × `simple`: sem efeito na marca.
- Light × dark e mobile × desktop: todas as superfícies com UI.
- pt-br, en e es: painel de entrada, barra lateral, header e metadata; linha de suporte do e-mail no unitário.

## Follow-ups

- O1 a O5, para o backlog, se valer a pena.
- Envio real com nome não ASCII quando houver chave da Resend (item 11).
