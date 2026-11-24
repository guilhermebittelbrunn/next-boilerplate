# Parte 3: validação de qualidade do produto

Mede o produto do lado de quem usa: no celular, preenchendo cada formulário, caindo numa página que não
existe, abrindo pelo Google ou por um link compartilhado. É a parte que mais pesa no valor percebido da
entrega, e quase nada dela aparece num teste unitário.

Visão geral da etapa e regras de status em [`README.md`](README.md).

## Onde medir

- **Desempenho e SEO** se medem numa URL pública: a preview da Vercel do commit que vai ser entregue, ou a
  produção. O PageSpeed Insights não alcança `localhost`.
- Sem URL pública, use o build de produção local (`pnpm --filter web build`) e o `pnpm lighthouse`, que sobe
  o `next start` sozinho. **Nunca meça desempenho em `next dev`**: ele compila sob demanda e não minifica,
  então o número não diz nada sobre produção.
- Celular, formulários e 404 podem ser medidos local, contra os emuladores e o seed
  ([`docs/SETUP.md`](../SETUP.md)). É o mesmo ambiente do `/test`.

Nos comandos abaixo, `$WEB`, `$APP` e `$API` são as URLs base (sem barra no fim) e `$LOCALE` é um dos três
idiomas (`pt-br`, `en`, `es`).

## 3.1 Simular o uso num celular

**Por quê.** Muita gente abre o produto pela primeira vez no celular, a partir de um link. Layout que vaza
para o lado, menu que não fecha e botão pequeno demais aparecem ali e não no desktop.

**Como medir.** Comece pelo projeto `mobile` da suíte E2E. Ele percorre landing, login, cadastro com
onboarding e CRUD de `entity` a 390 × 844, roda o axe em cada tela e reprova rota com rolagem horizontal:

```bash
pnpm --filter e2e e2e --project=mobile
```

Ele cobre os fluxos principais em `pt-br` e no tema claro. O resto fica com o `agent-browser` (skill do
repo): percorra as rotas públicas da `web` e as telas principais do `app` com viewport de **390 × 844**
(iPhone 12 a 15) e depois de **360 × 800** (Android comum), em tema claro e escuro, nos três idiomas:

```bash
agent-browser set viewport 390 844
agent-browser open "$WEB/$LOCALE"
agent-browser eval "document.documentElement.scrollWidth <= window.innerWidth"   # esperado: true
```

Abra e feche o menu do celular, a barra lateral do painel, um diálogo e uma tabela com rolagem
horizontal. Os comandos rodam um de cada vez: chamadas concorrentes ao `agent-browser` trocam a aba e
estragam o print.

**Aprovado quando** nenhuma rota tem rolagem horizontal da página, todo alvo de toque tem pelo menos
24 × 24 px (WCAG 2.2, critério 2.5.8), menus e diálogos abrem e fecham, nenhum texto fica cortado e
tabelas rolam dentro do próprio contêiner. Gravidade: 🔴 se um fluxo principal (cadastro, login, ação
central do produto) não completa no celular; 🟡 nos demais casos.

## 3.2 Testar os formulários

**Por quê.** Formulário é onde o usuário escreve no produto, e é onde aparecem os erros que ele vê:
mensagem em inglês, código cru da API, botão que envia duas vezes.

**Como medir.** Primeiro, os testes automatizados:

```bash
pnpm turbo run test test:emulator
pnpm e2e
```

Depois, monte o inventário de formulários do produto (os do core e os que o fork criou) e passe cada um
por cinco casos, nos três idiomas:

| Caso | O que fazer | Esperado |
|------|-------------|----------|
| Vazio | Enviar sem preencher | Mensagem por campo, traduzida, foco no primeiro erro |
| Inválido | E-mail sem `@`, senha curta, data impossível | Mensagem específica, traduzida |
| Válido | Dados corretos | Retorno de sucesso visível (toast, redirecionamento ou estado novo) |
| Duplo clique | Clicar duas vezes rápido em enviar | Uma requisição só; o botão fica bloqueado e mostra carregamento |
| Erro da API | Provocar uma recusa (e-mail já cadastrado, sem rede) | Texto traduzido vindo do `error.code`; nunca o código cru nem stack trace |

**Aprovado quando** os testes passam e os cinco casos se comportam como na tabela em todo formulário do
inventário. Gravidade: 🔴 para duplo envio que cria registro duplicado ou cobra duas vezes, e para erro que
mostra stack trace; 🟡 para mensagem não traduzida ou sem feedback de sucesso.

## 3.3 Página 404

**Por quê.** Link quebrado acontece (campanha antiga, URL digitada errada). A página de "não encontrado"
precisa estar no idioma do visitante, com a marca do produto e um caminho de volta. A API precisa responder
no mesmo contrato das outras rotas.

**Como medir.**

```bash
curl -s -o /dev/null -w '%{http_code}\n' "$WEB/$LOCALE/esta-pagina-nao-existe"     # esperado: 404
curl -s -o /dev/null -w '%{http_code}\n' "$APP/$LOCALE/esta-pagina-nao-existe"     # esperado: 404
curl -si "$API/esta-rota-nao-existe" | sed -n '1p;/content-type/Ip'               # esperado: 404 + application/json
```

Abra as duas páginas no navegador nos três idiomas e no celular.

**Aprovado quando** web e app respondem 404 (não 200 nem 500), a página está traduzida, tem a marca e um
link para a home, e a API responde `404` em JSON com `error.code`. Gravidade: 🟡.

## 3.4 Desempenho (PageSpeed)

**Por quê.** Página lenta perde visitante antes de ele ler a proposta, e o Google usa os Core Web Vitals
como sinal de experiência da página. Os limiares abaixo são os "bons" dos Core Web Vitals e da pontuação do
Lighthouse.

**Como medir.** Na URL pública, pelo [PageSpeed Insights](https://pagespeed.web.dev/) ou pela API dele, em
`mobile` e `desktop`, para a home, a página de preços, a de contato e a página de entrada do produto:

```bash
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$WEB/$LOCALE&strategy=mobile&category=performance&category=accessibility&category=best-practices&category=seo" \
  | jq '.lighthouseResult.categories | map_values(.score * 100)'
```

Sem URL pública, contra o build de produção local:

```bash
pnpm --filter web build
pnpm lighthouse                    # ou: pnpm lighthouse --url "$WEB" --locale "$LOCALE"
```

O comando mede home, preços e contato com o Lighthouse 12.8.2 em perfil mobile e escreve a tabela desta seção,
com o veredito de cada métrica, em `apps/e2e/lighthouse-results/summary.md`. Copie essa tabela para o
relatório: o cabeçalho dela já traz versão, data, commit e URL medida. Página que o Lighthouse não mediu
aparece como `not measured`, nunca como aprovada. Detalhes em [`docs/SETUP.md`](../SETUP.md#lighthouse-da-landing).

Para varrer o site inteiro a partir do sitemap: `npx -y unlighthouse --site "$WEB"`.

**Aprovado quando**, em celular:

| Métrica | Meta | Gravidade se falhar |
|---------|------|---------------------|
| Performance | ≥ 90 | 🟡 entre 50 e 89; 🔴 abaixo de 50 |
| Acessibilidade, Boas práticas, SEO | ≥ 95 | 🟡 |
| LCP (laboratório) | < 2,5 s | 🟡 |
| CLS | < 0,1 | 🟡 |
| TBT (laboratório) | < 200 ms | 🟢 |

Depois do lançamento, os dados de campo (Search Console, relatório de Core Web Vitals) substituem o
laboratório: LCP < 2,5 s, INP < 200 ms e CLS < 0,1 no percentil 75.

## 3.5 Imagens comprimidas

**Por quê.** Imagem costuma ser o arquivo mais pesado de uma landing, e um PNG grande no hero atrasa o LCP
sozinho.

**Como medir.**

```bash
find apps packages -path '*/node_modules' -prune -o -path '*/.next' -prune -o -path 'apps/e2e' -prune -o \
  -path 'apps/web/public/showcase' -prune -o -type f \
  \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.gif' -o -iname '*.webp' \) \
  -size +100k -print
git grep -nE '<img[ >]' -- 'apps/**/*.tsx' 'packages/**/*.tsx'
```

O primeiro comando lista imagem acima de 100 KB. Ficam de fora a pasta `showcase/`, com o vídeo e o GIF da
parte 4, que não entram em página, e a `apps/e2e`, onde ficam as telas capturadas para o vídeo. O segundo acha `<img>` cru, que não passa pelo otimizador do Next.

**Aprovado quando** nenhuma imagem de página passa de 100 KB (ou tem justificativa no relatório), toda
imagem de conteúdo usa `next/image`, e o Lighthouse não aponta "Properly size images" nem "Serve images in
modern formats". Gravidade: 🟡.

## 3.6 Imagem de compartilhamento (`og:image`)

**Por quê.** É a imagem que aparece quando alguém cola o link no WhatsApp, LinkedIn ou X. Imagem errada ou
quebrada faz o link parecer golpe.

**Como medir.**

```bash
curl -s "$WEB/$LOCALE" | grep -oE '<meta (property|name)="(og|twitter):(image|title|description)[^>]*>'
curl -s -o /tmp/og.png "<URL do og:image>" && file /tmp/og.png && ls -l /tmp/og.png
```

Cole a URL em [opengraph.xyz](https://www.opengraph.xyz/), no
[Sharing Debugger da Meta](https://developers.facebook.com/tools/debug/) e no
[Post Inspector do LinkedIn](https://www.linkedin.com/post-inspector/).

**Aprovado quando** a URL da imagem é absoluta e `https`, a imagem tem 1200 × 630, pesa menos de 300 KB,
mostra a marca e a proposta do **produto** (não a arte do boilerplate), e título e descrição do card estão
no idioma da página. Gravidade: 🔴 se a imagem for a do boilerplate ou estiver quebrada; 🟡 nos demais
casos.

## 3.7 `sitemap.xml`

**Por quê.** O sitemap diz ao Google quais páginas existem e em que idiomas. URL de localhost ou de preview
ali dentro desperdiça o rastreamento e pode indexar o ambiente errado.

**Como medir.**

```bash
curl -s "$WEB/sitemap.xml" | grep -o '<loc>[^<]*' | sed 's/<loc>//' | while read -r url; do
  printf '%s %s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$url")" "$url"
done
```

A lista de páginas tem teste no repositório (`apps/web/__tests__/sitemap.test.ts`): ele quebra quando uma
página pública de `apps/web/app/[locale]` fica fora do sitemap ou quando o sitemap cita uma rota que não
existe. Páginas criadas pelo fork entram na mesma conferência. O sitemap não emite `<lastmod>`, porque a hora
do build declararia todas as páginas alteradas a cada implantação.

**Aprovado quando** toda URL usa o domínio de produção, responde 200 sem redirecionar, cada página pública
aparece nos três idiomas com `hreflang`, nenhuma URL é do painel, de autenticação ou da API, e o sitemap foi
enviado no Google Search Console. Gravidade: 🔴 se aparecer `localhost` ou domínio de preview; 🟡 nos demais
casos.

## 3.8 Google Analytics

**Por quê.** Sem medição, ninguém sabe se o produto está sendo usado. Com medição sem consentimento, o
produto descumpre a LGPD.

**Como medir.**

1. `NEXT_PUBLIC_GA_MEASUREMENT_ID` (formato `G-XXXXXXX`) preenchida nos projetos `web` e `app` da Vercel,
   em produção.
2. Em aba anônima, abra a landing **sem aceitar** o banner de cookies e confira na aba Network do navegador
   (ou pelo `agent-browser`) que nenhuma requisição vai para `googletagmanager.com` nem
   `google-analytics.com`.
3. Aceite o banner, navegue por duas páginas e confira no GA4 em Relatórios › Tempo real (ou no
   DebugView, com o Tag Assistant) que as visitas chegaram.
4. Confira que os eventos de conversão do produto (por exemplo, `sign_up` e `generate_lead`) estão
   marcados como eventos principais no GA4.

**O que o core já dispara.** O `@repo/analytics` manda dois eventos de conversão, e só quando o visitante
consentiu com a medição e há um id do GA configurado:

- `sign_up`, com o parâmetro `method` (`email` ou `google`): no cadastro por e-mail aceito pela API, na app e
  na landing, e no primeiro acesso com Google, nas telas de cadastro e de login das duas apps. Um login com
  uma conta Google que já existia não dispara.
- `generate_lead`, sem parâmetros: quando a API aceita a mensagem do formulário de contato da landing.

Nenhum dos dois leva e-mail, nome, id ou texto digitado. Eventos do produto do fork passam pelo mesmo
`useAnalyticsEvent()` ([`FORKING.md`](../FORKING.md) §7.4). O passo 4 continua manual e está descrito em
[`PRE-PRODUCTION.md`](../PRE-PRODUCTION.md), item 19.

Para conferir o disparo antes de olhar o GA4, aceite o banner, faça a ação e leia a fila no console do
navegador:

```js
JSON.stringify(window.dataLayer.map((entry) => Array.from(entry)))
```

Uma entrada `["event","sign_up",{"method":"email"}]` confirma o disparo. Recusando o banner, a entrada não
aparece. O cadastro na app termina num carregamento completo de página, que zera a fila: para ler a entrada
ali, use o DebugView do GA4 ou interrompa a navegação.

**Aprovado quando** os quatro passos conferem. Gravidade: 🔴 se houver requisição ao Google antes do aceite;
🟡 se o GA não recebe dados ou não há evento de conversão.

## 3.9 `robots.txt` liberando a produção

**Por quê.** Um `Disallow: /` esquecido tira o site inteiro do Google, e o erro só aparece semanas depois.
O caminho oposto também dói: painel e telas de login indexados, ou uma preview aparecendo na busca.

**Como medir.**

```bash
curl -s "$WEB/robots.txt"
curl -sI "$APP/$LOCALE/sign-in" | grep -i x-robots-tag     # esperado: noindex
curl -sI "$API/health" | grep -i x-robots-tag              # esperado: noindex
curl -sI "<URL de uma preview da Vercel>" | grep -i x-robots-tag   # esperado: noindex
```

**Aprovado quando** o `robots.txt` da landing de produção não tem `Disallow: /` sozinho, aponta o
`Sitemap:` com o domínio de produção, e o painel, a API e as previews respondem `noindex`. Lembre que
`Disallow` impede o Google de ler a página, mas não de indexar a URL: para tirar uma página da busca, o
caminho é `noindex`. Gravidade: 🔴 se a produção estiver bloqueada; 🟡 se o painel ou a preview estiverem
indexáveis.

## 3.10 Meta descriptions

**Por quê.** É o texto que aparece embaixo do título no resultado de busca. Sem ela, o Google escolhe um
trecho qualquer da página.

**Como medir.** Para cada URL do sitemap, extraia o título e a descrição:

```bash
curl -s "$WEB/sitemap.xml" | grep -o '<loc>[^<]*' | sed 's/<loc>//' | while read -r url; do
  html=$(curl -s "$url")
  title=$(printf '%s' "$html" | grep -o '<title>[^<]*' | head -1 | sed 's/<title>//')
  desc=$(printf '%s' "$html" | grep -o '<meta name="description" content="[^"]*"' | head -1 | sed 's/.*content="//; s/"$//')
  printf '%s\t%s\t%s\t%s\n' "${#title}" "${#desc}" "$url" "$title"
done
```

**Aprovado quando** toda página pública tem descrição própria, no idioma da página, que descreve aquela
página e não se repete em outra. Convenção da casa para não ser cortada no resultado: entre 70 e 160
caracteres. Nenhuma descrição pode conter "boilerplate", "next-forge" ou texto de exemplo. Gravidade: 🟡.

## 3.11 Título e descrição em cada página

**Por quê.** O título é o que aparece na aba, no histórico, no favorito e no resultado de busca. Duas
telas com o mesmo título confundem quem usa e quem usa leitor de tela.

**Como medir.** Na landing, a tabela do item 3.10. No painel, percorra cada tela com o `agent-browser` e
leia `document.title`:

```bash
agent-browser open "$APP/$LOCALE/<tela>" && agent-browser eval "document.title"
```

No painel, o título sai como `<tela> | <marca>`: os layouts das áreas comum e admin declaram
`title.template` e cada tela registra o próprio rótulo em `PANEL_PAGE_TITLES`
(`apps/app/shared/lib/panelTitles.ts`), lido do dicionário no idioma da rota. As duas telas iniciais ficam
com o nome da área ("Painel do usuário" e "Administração"). Uma tela nova sem registro reprova
`apps/app/__tests__/panelTitles.test.ts`.

**Aprovado quando** todo título da landing é único, descreve a página e termina com a marca do produto
(convenção da casa: 30 a 60 caracteres), e cada tela do painel tem título próprio. Gravidade: 🟡 na landing;
🟢 no painel.

## Registro no relatório

Na seção 3 do [`report-template.md`](report-template.md), cada item ganha o status, o número medido
(pontuação, tempo, contagem de URLs) e a URL ou o comando usado. Prints ficam fora do Git; o que eles
provam vai escrito.
