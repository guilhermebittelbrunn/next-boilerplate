# Relatório do `/test`: delivery-product-quality, fatia 1

Rodou dentro do `/cycle`, sem perguntas ao usuário, na branch `feat/delivery-product-quality` (não protegida,
criada pelo `/review`). Nada foi commitado e o índice continua só com o rename da spec arquivada
(`git diff --cached --stat` → 1 arquivo). O único arquivo de código que esta etapa alterou é
`apps/e2e/tests/landing.spec.ts` (dois testes novos).

Tudo o que envolve o 404 e os cabeçalhos foi medido em build de produção (`next build` + `next start`), não em
`next dev`.

## Resumo

| Placar | Quantidade |
|--------|-----------|
| ✅ verificado e correto | 11 critérios |
| ❌ falha | 0 |
| 🔒 não verificável sem infra externa | 1 critério (validador de Open Graph) |

O placar vale depois da rodada 2 (seção "Rodada 2", no fim).

1. **O HTML do servidor do 404 da landing regrediu em relação a `main`.** Os números estão em "Prioridade 1".
   O experimento com `Suspense` (opção b do `/review`) transforma o 404 em 200, então a opção b está descartada
   por medição. Continua como decisão do usuário e não reprova a fatia.
2. **O 404 da landing não tinha `<title>`** (`document.title` vazio nos três idiomas na rodada 1), o que fere o
   WCAG 2.4.2. Subi o achado para 🟡. O `/review` corrigiu e a rodada 2 mediu: **fechado**.

## Prioridade 1: o 404 da landing com idioma válido

### HTML do servidor, feature × `main`

A comparação usou um worktree temporário de `origin/main` (`afb5b35`) em `/tmp/dpq-main-wt`, com `pnpm install`,
`next build` e `next start -p 3011`, e a branch da feature em `next start -p 3001`. O worktree foi removido no
fim.

| URL | Feature: status · `grep -c '<h1'` · tag `<html>` | `main`: status · `grep -c '<h1'` · tag `<html>` |
|-----|-----------------------------------------------|---------------------------------------------|
| `/pt-br/xxx` | 404 · 0 · `<html id="__next_error__">` | 404 · 1 · `<html>` |
| `/en/a/b/c` | 404 · 0 · `<html id="__next_error__">` | 404 · 1 · `<html>` |
| `/es/legal/nao-existe` | 404 · 0 · `<html id="__next_error__">` | 404 · 1 · `<html>` |
| `/pt-br/esta-pagina-nao-existe` | 404 · 0 · `<html id="__next_error__">` | 404 · 1 · `<html>` |
| `/favicon.ico` | 404 · 0 · `<html id="__next_error__">` | **200** · 1 (`<h1>Início</h1>`, a home) |
| `/api` | 404 · 0 · `<html id="__next_error__">` | **200** · 1 (`<h1>Início</h1>`, a home) |
| `/pt-br` | 200 · 1 · `<html class=… lang="pt-br">` | 200 · 1 · igual |

Detalhes medidos:

- Em `main`, o `<h1>` do 404 é `<h1 class="next-error-h1" …>404</h1>` e a frase "This page could not be found."
  aparece no HTML (3 ocorrências). A página é em inglês, sem header nem footer, com 7 969 bytes.
- Na feature, o `<body>` do 404 é só `<div hidden=""><!--$--><!--/$--></div>`. O título traduzido existe apenas
  dentro do payload RSC (`self.__next_f.push`): "Página não encontrada" em `/pt-br/xxx`, "Page not found" em
  `/en/a/b/c`, "Página no encontrada" em `/es/legal/nao-existe`. Cada resposta tem cerca de 16 KB.
- Os dois lados mandam `<meta name="robots" content="noindex"/>` no HTML do 404 e nenhum `x-robots-tag`.
- Sem JavaScript, a página da feature fica em branco. Para medir, carreguei o HTML do servidor num iframe com
  `sandbox` sem `allow-scripts`: 0 caracteres de texto visível, 0 `<h1>`.

### No navegador com JavaScript

No build de produção, o cartão aparece dentro do layout nos três idiomas: header com a marca, seletor de idioma
e botões de login e cadastro, footer, `<h1>` com o título, descrição e um único botão de volta. Clicar no botão
leva a `/<idioma>` (medido em `/en/a/b/c`, que foi para `http://localhost:3001/en` com `<h1>Home</h1>`).

O tempo em branco é o tempo de baixar e executar o JavaScript. O primeiro conteúdo pintado
(`first-contentful-paint`) veio entre 72 e 96 ms nas navegações com cache e em 192 ms na primeira, contra 68 ms
da home, que já chega pintável no HTML. Isso foi em localhost, sem latência de rede. Antes do cartão aparecer, o
navegador baixa 12 scripts, 399 KB comprimidos; numa rede móvel lenta a página fica em branco durante esse
download inteiro. Não medi com throttling, porque o `agent-browser` instalado não emula CPU nem rede.

### Experimento da opção (b): `Suspense` em volta do `children`

No mesmo worktree temporário, com os arquivos da feature copiados e o `{children}` do layout envolvido em
`<Suspense>`, o build passou e o resultado foi:

| URL | status | `<h1` | tag `<html>` | `<header` |
|-----|--------|-------|--------------|-----------|
| `/pt-br/xxx`, `/en/a/b/c`, `/es/legal/nao-existe` | **200** | 0 | a do layout, com classes | 1 |
| `/favicon.ico` | 404 | 0 | `__next_error__` | 0 |

Header e footer passam a sair no HTML, mas o status vira 200 (soft 404) e o cartão continua só no cliente. A
opção (b) está descartada. Nada disso foi aplicado no working tree da feature.

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|------|----------|
| 1 | 404 com idioma válido, HTML do servidor | **Confirmado.** 404, `grep -c '<h1'` = 0 e `<html id="__next_error__">` em `/pt-br/xxx`, `/en/a/b/c` e `/es/legal/nao-existe`. |
| 2 | Comparação com `main` | **Confirmado.** Em `main` o mesmo endereço dá 404 com `<h1 class="next-error-h1">404</h1>` e "This page could not be found." no HTML. A regressão do HTML do servidor é real. |
| 3 | 404 no navegador com JS | **Confirmado**, com os números de tempo acima. Light, dark e 390 px nos três idiomas, sem rolagem horizontal. |
| 4 | 404 de idioma inválido | **Derrubado em parte.** O `curl` confirma 404 e `__next_error__` em `/favicon.ico` e `/api`. A previsão de página em branco não se confirmou: o navegador mostra a página padrão do Next, "404 \| This page could not be found.", montada pelo cliente e sem o layout da landing. O texto original do critério ("a página padrão do Next") estava certo sobre o que o usuário vê, mas não diz que ela depende de JS. |
| 5 | V5 no `app` | **Confirmado.** `x-robots-tag: noindex` em `GET /pt-br/sign-in` (200), `/en/sign-up` (200), `/pt-br/entities` (307 para `/pt-br/sign-in?redirect=%2Fpt-br%2Fentities`), `/pt-br/admin` (307), `/pt-br` (307), `/pt-br/nao-existe` (307), `GET /api/auth/session` (405), `POST` (400), `DELETE` (200) e `HEAD /pt-br/sign-in`. |
| 6 | V6 completo na `web` | **Confirmado.** Nenhum `x-robots-tag` em 15 respostas: `/pt-br`, `/pt-br/sign-in`, `/en/sign-up`, a imagem nos três idiomas, o 404 em `/pt-br/xxx`, `/en/a/b/c` e `/es/legal/nao-existe`, `/favicon.ico`, `/api`, `/robots.txt`, `/sitemap.xml`, `/xyz` (307), `POST /api/auth/session` (400) e `GET /api/auth/session` (405). |
| 7 | Imagem no navegador | **Confirmado.** Ver "Evidências". |
| 8 | `pnpm e2e` | **Rodou.** 30 de 31 passaram; a falha está em `organizationOwnership.spec.ts`, também falha em `main` e foi analisada em "E2E". |

## Cobertura

### Comandos

| Comando | Resultado |
|---------|-----------|
| `pnpm turbo run test typecheck --filter=web --filter=app --filter=api --filter=@repo/security --filter=@repo/internationalization` | Tudo do cache. `api` 1729, `app` 1225, `web` 285, `@repo/security` 65, `@repo/internationalization` 67 (paridade), mais as dependências. Typecheck 5/5. |
| `pnpm test` (raiz, `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | Exit 0. 15/15 tasks, 13 do cache. `api:test:emulator` passou com 274 testes (essa task não usa cache). `e2e:test` (Vitest do pacote E2E) passou com 17. |
| `pnpm exec biome check apps/e2e/tests/landing.spec.ts` | Limpo, depois de trocar o `404` literal por uma constante. |
| `pnpm --filter e2e typecheck` | Limpo. |
| `pnpm --filter web build`, `pnpm --filter api build`, `pnpm --filter app build` | Exit 0 nos três. A `web` lista `/[locale]/[...rest]` como dinâmica e `/pt-br`, `/en` e `/es` `/opengraph-image` como ● SSG; a `api` lista `ƒ /[[...path]]`. |
| `pnpm e2e` | 30 passaram, 1 falhou (ver "E2E"). |

Não rodei `pnpm check` na raiz: o `/review` já mediu ("Checked 1093 files … No fixes applied") e o único
arquivo novo desta etapa passou pelo Biome isolado.

### Testes criados

Em `apps/e2e/tests/landing.spec.ts`:

- `an unknown landing path answers 404 with the translated page and a link home` abre
  `/pt-br/esta-pagina-nao-existe` e afirma status 404, o `<h1>` com o título traduzido, a descrição, e que o
  botão leva à home, com o `<h1>` dela.
- `a first segment that is not a locale answers 404 instead of the home page` faz `request.get` em
  `/favicon.ico` e `/api`, sem seguir redirect, e afirma status 404. Não abre navegador.

Os dois passaram na suíte completa (11,8 s e 0,8 s).

### Decisões de custo de teste

- **Dois testes na faixa cara (E2E), com motivo.** O objeto do teste é o roteamento do Next e o boundary de
  `not-found` em execução. O Vitest só prova que `[...rest]` e `ensureSupportedLocale` chamam `notFound()` e que
  o componente renderiza o cartão isolado (T9, T10); nenhum dos dois vê o que o Next faz com isso. Esta etapa
  mostrou o limite: o HTML do servidor sai vazio e o cartão só existe depois que o cliente monta a árvore, coisa
  que nenhum teste com mock enxerga. O segundo teste usa o fixture `request`, sem navegador, e leva menos de 1 s.
  Na rodada 1 o teste do 404 não chamava `expectAccessible`, que falharia pela falta de `<title>`. Na rodada 2
  o `/review` acrescentou `toHaveTitle` e `expectAccessible`, e o teste passou.
- **`packages/security/middleware.ts`:** o T1 (`csp.test.ts`) cobre a opção `noIndex` ligada, desligada e junto
  com `reportOnly`. Nenhum teste novo.
- **`apps/api/proxy.ts`:** o T4 (`requestId.test.ts`) cobre o cabeçalho em resposta liberada, origem recusada,
  preflight e `429`. O `curl` confirmou os três primeiros em runtime. O `429` ficou só no unitário, o que basta,
  porque toda saída do proxy passa por `withSecurityHeaders`.
- **`apps/api/app/[[...path]]/route.ts`:** o T5 cobre os cinco métodos e o `dynamic = "force-dynamic"`, e o
  `curl` confirmou em runtime. Nenhum teste novo.
- **`apps/app/proxy.ts`:** o T2 cobre página, redirect ao login e rotas de sessão. Confirmado por `curl`.
- **`apps/web/proxy.ts`:** o T3 afirma a ausência do cabeçalho. Confirmado por `curl`.
- **`apps/web/shared/lib/openGraph.ts` e `opengraph-image.tsx`:** o T7 cobre corte da frase, marca padrão,
  idioma não suportado, logo inacessível, timeout, sinal de abort, status diferente de 200, `content-type`
  recusado (`image/webp`, `text/html`, vazio) e aceito (PNG, JPEG, SVG). Não refiz o build com logo quebrado:
  o unitário cobre o fallback e o `/develop` já mediu o build nos dois casos.
- **`apps/web/shared/lib/seo.ts`, `robots.ts`, login e cadastro:** T6 e T8. Confirmado por `curl` nas 21
  combinações de página e idioma.

## Critérios de aceite com status

| # | Critério | Status | Meio |
|---|----------|--------|------|
| 1 | A landing publica uma `og:image` da marca em todas as páginas | ✅ | `curl` nas 21 combinações (7 páginas × 3 idiomas): `og:image` = `http://localhost:3001/<idioma>/opengraph-image`, 1200 × 630, `twitter:image` igual em todas; unit T6 |
| 2 | A imagem é gerada por código, com a marca e a frase do idioma | ✅ | `curl` + `file`: PNG 1200 × 630, 43 879 / 42 071 / 43 734 bytes, `content-type: image/png`, as três diferentes entre si (`cmp`); o build lista as três como ●; navegador; nenhum `opengraph-image.png` sobrou em `apps/web/app` nem em `apps/api/app` |
| 3 | A imagem degrada sem logo e com logo inacessível | ✅ | Em runtime, só o caso sem logo (o `.env` local não define `NEXT_PUBLIC_APP_LOGO_URL`): monograma "N" nas três imagens. Logo inacessível, status e formato: unit T7 |
| 4 | O `og:image:alt` está no idioma da página | ✅ | `curl` em `/pt-br`, `/en` e `/es`; unit T6 para idioma não suportado |
| 5 | O 404 da landing é traduzido, tem caminho de volta e depende de JavaScript | ✅ com decisão em aberto | `curl`, navegador (3 idiomas × light/dark × 1280/390 px) e E2E novo. O `<title>` traduzido e o axe foram medidos na rodada 2. A dependência de JS é a regressão confirmada acima |
| 6 | Idioma inválido no primeiro segmento responde 404 | ✅ | `curl` (404 em `/favicon.ico` e `/api`, contra 200 em `main`), navegador, E2E novo e unit T10 |
| 7 | A API responde 404 em JSON para rota inexistente | ✅ | `curl` com os cinco métodos, `HEAD`, `/`, `/opengraph-image.png`, `/entities/x/y/z`, `/api/x`, origem permitida e recusada; unit T5; paridade i18n |
| 8 | Painel e API saem do índice por cabeçalho | ✅ | `curl` no app e na api; o `429` só pelo unit T4 |
| 9 | A landing nunca recebe `X-Robots-Tag` | ✅ | `curl` em 15 respostas; unit T3 |
| 10 | Login e cadastro saem do índice sem bloquear o rastreador | ✅ | `curl` nos 3 idiomas (`noindex, follow` só em sign-in e sign-up) e `robots.txt` sem `Disallow`; o navegador confirmou a meta em `/pt-br/sign-in`, `/en/sign-in`, `/es/sign-in` e `/pt-br/sign-up`; unit T8 |
| 11 | Nada muda no SDK nem nos dados, e as suítes continuam verdes | ✅ | `pnpm test` exit 0; no `pnpm e2e`, a única falha também acontece em `main` (ver "E2E") |
| 12 | Validação externa da imagem social | 🔒 | Exige a landing publicada num domínio público |

## Evidências e2e (o que vi)

Os prints ficam em `docs/features/delivery-product-quality/test/e2e/`, pasta que o `.gitignore` descarta. A
prova é o texto abaixo.

- **404 em `main`** (`00-main-404-pt-br.png`): fundo branco, "404 | This page could not be found." centralizado,
  sem header, `lang` vazio no `<html>`.
- **404 na feature**, dez combinações medidas por script (`01`, `03`, `04`, `05`):
  - pt-br: `<h1>` "Página não encontrada", descrição "O endereço que você abriu não existe ou mudou de lugar.",
    botão "Voltar para o início" → `/pt-br`;
  - en: "Page not found", "The address you opened does not exist or has moved.", "Back to home" → `/en`;
  - es: "Página no encontrada", "La dirección que abriste no existe o cambió de lugar.", "Volver al inicio" →
    `/es`.
  - O `lang` do `<html>` é igual ao idioma da URL em todas, e header e footer estão presentes em todas.
  - Light: cartão `lab(100 0 0)` (branco) e título `lab(2.75 0 0)` (quase preto). Dark: cartão `lab(2.75 0 0)`
    e título `lab(98.26 0 0)`. Os dois contrastes ficam perto do máximo.
  - 390 px: o cartão ocupa a largura com margem, o botão ocupa a largura do cartão e não há rolagem horizontal
    (`scrollWidth` ≤ `innerWidth` nas cinco medições mobile).
- **404 sem JS** (`02-404-es-sem-js.png`): o HTML do servidor num iframe sem scripts não mostra nada.
- **`/favicon.ico` no navegador** (`06-favicon-ico-404.png`): página padrão do Next, "404 | This page could not be
  found.", fundo branco, sem layout, `<html id="__next_error__">`.
- **Imagem social** (`07`, `08`, `09` e os PNGs baixados por `curl`): fundo branco, quadrado escuro arredondado
  com a letra "N" em branco, "next-boilerplate" em fonte grande ao lado, e a frase de `home.meta.description` em
  cinza, em três linhas, no idioma certo ("… e theming baseado em variáveis para white label.", "… and
  variable-based theming for white label.", "… y theming basado en variables para white label."). Nada da arte do
  next-forge.
- **Home** (`10`, `11`, `12`): `<h1>` "Início" / "Home" / "Inicio", título da aba "<h1> | next-boilerplate",
  `og:image` do idioma, sem meta `robots`, sem rolagem horizontal em 390 px, dark aplicado (`html.dark`).
- **Login e cadastro** (`13`, `14`, `15`): `<h1>` "Entrar", "Sign In", "Iniciar sesión" e "Cadastrar"; meta
  `robots` = `noindex, follow`; formulário com 2 campos no login e 3 no cadastro; dark legível em 390 px.

## E2E

`pnpm e2e` (com `JAVA_HOME` do JDK 21): **30 passaram, 1 falhou**, em 17,7 min, dos quais 6,9 min foram só do
`global.setup`.

A falha é em `organizationOwnership.spec.ts:68` (convite, transferência de posse e saída do dono anterior), e o
ponto de quebra mudou a cada execução:

- na suíte completa, o cadastro da conta nova ficou 30 s em `http://localhost:3000/pt-br/sign-up` em vez de ir
  para `/pt-br/onboarding`;
- rodando só esse spec nesta branch, o convidado entrou na equipe (a tela mostra "E2E Team Member" como Membro)
  e o teste estourou o limite de 120 s;
- rodando só esse spec num worktree de `main` (`afb5b35`), falhou com `page.goto: Timeout 60000ms exceeded`.

O spec falha em `main` também, e cada vez num ponto diferente, sempre por tempo. O diff desta fatia não toca o
cadastro, o onboarding nem a equipe; no `app`, a única mudança é o `x-robots-tag` nas respostas do proxy. O
`signUp.spec.ts`, que faz o mesmo cadastro, passou. Não é regressão desta fatia. É instabilidade do spec sob
`next dev` nesta máquina e vale um achado próprio no backlog.

## Ambiente do e2e

Antes de subir qualquer coisa, todas as portas estavam livres (3000, 3001, 3002, 3003, 3011, 9099, 8080, 9199,
4000, 4001, 4400, 4500). Não reutilizei nada do usuário.

| Serviço | Como | Derrubado |
|---------|------|-----------|
| `web` (feature) | `next start -p 3001` | sim, por PID |
| `web` (`main`, worktree) | `next start -p 3011` | sim, por PID |
| `web` (experimento com `Suspense`, worktree) | `next start -p 3011` | sim, por PID |
| `api` | `CORS_ORIGIN="http://localhost:3000,http://localhost:3001" next start -p 3002` | sim, por PID |
| `app` | `next start -p 3000` | sim, por PID |
| Stack do `pnpm e2e` (emuladores, `api`, `app` e `web` em `next dev`), três vezes: suíte completa, spec isolado nesta branch e spec isolado em `main` | `webServer` do Playwright | sim, pelo próprio Playwright |

Depois de cada derrubada, `lsof -nP -iTCP:<porta> -sTCP:LISTEN` saiu vazio, e na conferência final as 12 portas
estavam livres. O worktree `/tmp/dpq-main-wt` foi removido (`git worktree list` não o mostra mais) e o
`agent-browser` foi fechado.

O `next dev` do E2E criou `apps/api/AGENTS.md`, `apps/app/AGENTS.md` e `apps/web/AGENTS.md`, com as regras que o
próprio Next grava para agentes. Eles não fazem parte do repositório e foram apagados.

## Lacunas

Herdadas do `handoff.md` e do `review.md`:

- **Render do PNG pelo `ImageResponse` e 404 real do Next fora do Vitest.** O 404 foi **fechado aqui**: os dois
  testes E2E novos cobrem o status, o cartão traduzido e o idioma inválido. O render do PNG **continua aberto**
  como regressão automática; foi medido em runtime nesta etapa e no `/develop`.
- **O T3 não cobre resposta que não passa pelo proxy da `web`.** **Continua aberta**, com risco baixo. O `curl`
  mediu `robots.txt`, `sitemap.xml` e a imagem sem o cabeçalho, e nenhuma rota grava `x-robots-tag` fora do
  proxy.
- **Nada automatizado prova que o 404 da landing mostra o cartão no navegador.** **Fechada aqui** pelo primeiro
  teste E2E novo.

Novas:

- O 404 da landing sem `<title>` (WCAG 2.4.2): **fechado na rodada 2**. O título é coberto por
  `notFoundPage.test.tsx` e pelo `toHaveTitle` do E2E.
- Nenhum teste trava o HTML vazio do 404 em nenhuma direção. Se a decisão for aceitar, não há o que travar; se for
  corrigir, o teste natural é um `request.get` no E2E contando o `<h1>`.

## Achados para o `/spec --sync`

- O 404 de idioma inválido fecha o 🟡 de `/favicon.ico` (`specs/BACKLOG.md:726`) e o 🟢 de `GET /api`
  (`specs/BACKLOG.md:1531`): em `main` os dois davam 200 com a home; aqui dão 404.
- Na metadata do 404, com o `.env` local, a `og:image` sai `https://http/localhost:3001/<idioma>/opengraph-image?…`
  (confirmado por `curl`). É o fallback do Next com `VERCEL_PROJECT_PRODUCTION_URL` gravada com protocolo, como o
  `/review` explicou. Nas páginas normais a URL sai certa.
- `/favicon.ico/opengraph-image` responde 200 com um PNG, como o `/review` previu pela leitura, e
  `/xx/opengraph-image` dá 307. Os dois são inofensivos.
- `organizationOwnership.spec.ts` é instável por tempo sob `next dev`, inclusive em `main`.

## Estado de dev alterado

Nenhuma conta de QA foi criada. O `pnpm e2e` cria e apaga as próprias contas no emulador, que morre com o
processo, e nada foi gravado no projeto Firebase de dev. Os builds de produção atualizaram `.next/` em
`apps/web`, `apps/api` e `apps/app`, pasta que o git ignora.

## Rodada 2: `<title>` do 404 da landing

O `/review` passou a renderizar `<title>{título} | {marca}</title>` dentro de `apps/web/app/[locale]/not-found.tsx`
(o React 19 move a tag para o `<head>`) e acrescentou um caso em `notFoundPage.test.tsx` e `toHaveTitle` +
`expectAccessible` no E2E do 404. A dúvida era qual título vence, porque o payload RSC também traz o
"404: This page could not be found." que o Next embute.

Medi em build de produção (`pnpm --filter web build`, exit 0; `PORT=3001 pnpm --filter web start`, com a porta
3001 livre antes).

### HTML do servidor

`curl` nos quatro endereços: status 404, nenhum `<title>` no `<head>` e uma ocorrência de
"404: This page could not be found." no payload. Em `/pt-br/esta-pagina-nao-existe`, "Página não encontrada |
next-boilerplate" aparece uma vez, também só no payload. Faz sentido: o shell de erro continua vazio, e o título
existe apenas depois que o cliente monta a árvore.

### No navegador (`agent-browser`, uma chamada por vez)

| URL | `document.title` | `<title>` no documento depois de montar |
|-----|------------------|-----------------------------------------|
| `/pt-br/esta-pagina-nao-existe` | `Página não encontrada \| next-boilerplate` | 1, no `<head>` |
| `/en/a/b/c` | `Page not found \| next-boilerplate` | 1, no `<head>` |
| `/es/legal/nao-existe` | `Página no encontrada \| next-boilerplate` | 1, no `<head>` |
| `/favicon.ico` | `404: This page could not be found.` | 2, no `<head>`: `404: This page could not be found.` e `Inicio \| next-boilerplate` |

O título traduzido vence nos três idiomas, e o "404: This page could not be found." não aparece no documento.
Clicar em "Voltar para o início" leva a `/pt-br` com `document.title` = `Início | next-boilerplate` e um único
`<title>`, sem sobra do 404.

Em `/favicon.ico` o título continua o do Next, como esperado. O segundo `<title>` vem da metadata da home: com o
segmento `favicon.ico`, a rota `[locale]` roda o `generateMetadata` da home antes de o layout recusar o idioma, e
o payload carrega "Início | next-boilerplate" (4 ocorrências no `curl`). No navegador, o idioma vem do cookie da
visita anterior, por isso saiu "Inicio". `document.title` lê o primeiro `<title>`, então a aba mostra o do Next. A
correção desta rodada não mexe nisso, e ninguém lê esse título, porque o endereço não é página da landing.
Fica como 🟢 para o backlog.

### Testes

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter web test` | 32 arquivos, 288 testes passando; `notFoundPage.test.tsx` com 6/6 |
| `pnpm exec playwright test --grep "unknown landing path"` em `apps/e2e` (JDK 21) | 5 passaram em 8,1 min: os 4 passos do `global.setup` e `an unknown landing path answers 404 with the translated page and a link home` (34,7 s), já com `toHaveTitle` e `expectAccessible`. O axe não apontou nenhuma violação no 404, no tema light que o Playwright usa. A stack subiu na primeira tentativa |

### Veredito

- Achado 🟡 do `<title>` (WCAG 2.4.2): **fechado**.
- Critério 5 (404 traduzido): segue ✅, agora com o título medido, e a decisão sobre o HTML do servidor continua com
  o usuário.
- Placar final: 11 ✅, 0 ❌, 1 🔒.

### Ambiente

Subi a `web` em `next start -p 3001` e a matei pelo PID. A stack do Playwright subiu e caiu sozinha. Na
conferência final, 3000, 3001, 3002, 3003, 8080, 9099, 9199, 4000, 4001, 4400 e 4500 estão livres. O `next dev`
do E2E gerou de novo `apps/api/AGENTS.md`, `apps/app/AGENTS.md` e `apps/web/AGENTS.md`, e eu os apaguei.
Nenhuma conta de QA foi criada.
