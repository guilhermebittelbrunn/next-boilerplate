# Relatório do `/test`: global-error-theme

Rodada autônoma do `/cycle`, em 2026-10-21, na branch `fix/auth-forms-and-global-error-theme`. Nada foi commitado e
nenhuma branch foi criada. O working tree também carrega a `web-auth-forms`, já testada; ela não foi retestada aqui, só
entrou nas suítes.

Resultado: 11 de 11 critérios ✅, nenhum ❌, nenhum 🔒. Não achei defeito de produção. Uma observação sem impacto no
critério: um quadro claro de até ~30 ms antes do escuro (seção 6).

## 1. Cobertura

| comando | escopo | resultado |
|---------|--------|-----------|
| `pnpm --filter app test` | `apps/app` | 116 arquivos, 979 testes, todos passam |
| `pnpm --filter web test` | `apps/web` | 26 arquivos, 207 testes, todos passam |
| `pnpm exec vitest run __tests__/globalErrorLocale.test.tsx` em `apps/app` | o arquivo da tela | 8/8 |
| o mesmo em `apps/web` | o arquivo da tela | 9/9 |
| `pnpm test` (raiz, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | turbo, `test` + `test:emulator` | 15/15 tasks, 12 do cache, exit 0. `api` 1455, `api:test:emulator` 207, `app` 979, `web` 207, `design-system` 171, `email` 205, `auth` 132, `internationalization` 67, `shared` 56, `security` 45, `analytics` 34, `next-config` 32, `payments` 22, `e2e` 16, `sdk` 11 |
| `pnpm --filter app typecheck` / `pnpm --filter web typecheck` | | exit 0 / exit 0 |
| `pnpm check` | repo | 971 arquivos, nenhum ajuste |
| `pnpm --filter app build` / `pnpm --filter web build`, depois de tirar a sonda | | exit 0 / exit 0 |

Sem `--force`: nada me fez suspeitar do cache. Paridade de i18n não remedida à parte, porque o diff não toca
`packages/internationalization`; mesmo assim ela roda dentro do `pnpm test` da raiz (67 testes, do cache).

Testes novos: nenhum. Ver a seção 3.

## 2. Critérios de aceite, item a item

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | CSS do app na tela de erro da app, em build de produção | ✅ | `curl` + e2e |
| 2 | CSS da landing na tela de erro da web, em build de produção | ✅ | `curl` + e2e |
| 3 | Sem escolha salva, segue o tema do sistema (E1, E2) | ✅ | e2e, nas duas apps |
| 4 | Com escolha salva, a escolha vence o sistema (E3, E4) | ✅ | e2e, nas duas apps; unit no `jsdom` para o caminho do script |
| 5 | Cabe em 375 px nos dois temas | ✅ | e2e |
| 6 | Idioma certo em pt-br, en, es; padrão pt-br sem cookie | ✅ | e2e |
| 7 | Botão "Tentar novamente" funciona, duas vezes seguidas | ✅ | e2e |
| 8 | Sem aviso de hidratação no `<html>` (build de produção) | ✅ | e2e, console |
| 9 | Sem detalhe do erro na tela | ✅ | e2e + `curl` + unit da web |
| 10 | Páginas normais não baixam CSS a mais | ✅ | `curl` no build limpo |
| 11 | Testes e gates | ✅ | comandos da seção 1 |

O texto completo dos critérios, no formato §9.1, está em `test/criterios-aceite.md`.

## 3. Decisões de custo de teste

- `apps/app/app/global-error.tsx` e `apps/web/app/global-error.tsx`: não criei teste. Os 8 e 9 casos do
  `globalErrorLocale.test.tsx` já cobrem o idioma, o texto sem detalhe do erro e as quatro combinações de tema no caminho
  do script do `next-themes`. O que faltava (o CSS chegar à tela, a classe aplicada pelo efeito do provider no cliente,
  o clique no `reset()`) depende do build de produção e do navegador. Um teste Vitest troca o CSS por string vazia e,
  no caminho do cliente, provaria o `next-themes`, não a tela. Esses pontos ficaram com o e2e.
- Nenhum teste da faixa cara (emulador ou app de pé dentro de `.test.ts`). O app de pé desta rodada foi o e2e com
  `agent-browser`, e nada dele ficou no repo.

## 4. Verificar no `/test` (lista do `review.md`)

| item | veredito | o que medi |
|------|----------|-----------|
| 1. F1, CSS na tela nas duas apps; na app, `curl` com `preload` e entrada `"G"` | **confirmado** | App, `/pt-br/sign-in`, `/en/sign-in`, `/es/sign-in` com a sonda: status 500, `<html id="__next_error__">`, nenhum `<link rel="stylesheet">` no HTML, dois `<link rel="preload" as="style">` (`ef1896303949e320.css`, `02ab9a83bffc2fff.css`) e a entrada `"G"` com os dois como `rel: stylesheet, precedence: next`. `ef18…css` (141456 bytes) tem `min-h-screen`, `bg-muted\/30`, `:root{--background:#fff;…--primary:#171717` e `.dark{--background:#0a0a0a;…--primary:#fafafa`; `02ab…css` (972 bytes) tem as duas `@font-face` da Geist. No navegador, depois da montagem, `link[rel=stylesheet]` = `["ef1896303949e320.css","02ab9a83bffc2fff.css"]`. Web, `/pt-br`: mesma forma, com `4de43917a446f596.css` e `cf5a0a8ba70c4387.css` no `preload`, no `"G"` e no DOM montado |
| 2. F2, E1 a E4 nas duas apps | **confirmado** | Tabela da seção 5.1. Classe, `color-scheme` e fundo do `<body>` batem com o esperado nos 8 casos |
| 3. Quadro claro antes do escuro em E2/E3 | **confirmado, curto** | Aparece. Detalhe na seção 6. O estado final está certo em todas as recargas |
| 4. F6, console em build de produção | **confirmado sem aviso** | Nas duas apps, o console só traz `[error] {digest: …, message: "An error occurred in the Server Components render…"}`, um por carregamento (4 nas 4 recargas de E1 a E4; `digest` `1655122068` na app e `2600558818` na web). Nenhum erro de hidratação, nenhum aviso sobre `<script>`. `agent-browser errors` vazio. No DOM montado existe 1 `<script>` inline com `"class","theme"`, o do `next-themes` |
| 5. CSS extra nas páginas normais | **confirmado sem extra** | Build limpo, sem `throw`. App `/pt-br/sign-in`: o documento cita só `ef1896303949e320.css` e `02ab9a83bffc2fff.css`, os dois em `<link rel="stylesheet">`, e o `"G"` lista exatamente esses dois. Web `/pt-br`: só `4de43917a446f596.css` e `cf5a0a8ba70c4387.css`, os mesmos do `"G"`. O chunk da tela é o mesmo do layout |
| 6. F3 mobile, F4 botão, F5 idiomas, Geist no `<h1>`, fundo do token, botão do DS | **confirmado** | Seções 5.2 a 5.4 |

## 5. Evidências e2e

Os screenshots ficaram em `docs/features/global-error-theme/test/e2e/` (`01` a `07` da app, `11` a `17` da web). O
`.gitignore` descarta essa pasta; a prova é o texto abaixo. Tudo medido com `getComputedStyle` e `getBoundingClientRect`
no build de produção com a sonda.

### 5.1 Tema, 1280 × 800

Igual nas duas apps (app em `/pt-br/sign-in`, web em `/pt-br`):

| estado | `localStorage.theme` | sistema | classe no `<html>` | `color-scheme` | fundo do `<body>` | botão (fundo / texto) |
|--------|----------------------|---------|--------------------|----------------|-------------------|-----------------------|
| E1 | ausente | claro | `light` | `light` | `lab(100 0 0)` (`#fff`) | `lab(7.78 …)` (`#171717`) / `lab(98.26 0 0)` |
| E2 | ausente | escuro | `dark` | `dark` | `lab(2.75 0 0)` (`#0a0a0a`) | `lab(98.26 0 0)` (`#fafafa`) / `lab(7.78 …)` |
| E3 | `dark` | claro | `dark` | `dark` | `lab(2.75 0 0)` | `lab(98.26 0 0)` / `lab(7.78 …)` |
| E4 | `light` | escuro | `light` | `light` | `lab(100 0 0)` | `lab(7.78 …)` / `lab(98.26 0 0)` |

Nos 8 casos: `<h1>` com `font-family: GeistSans, "GeistSans Fallback"`, 20 px, peso 600; `body` com margem 0;
`<main>` com `min-height: 800px` (a altura da janela) e fundo `--muted` a 30% (`oklab(0.97 … / 0.3)` no claro,
`oklab(0.269 … / 0.3)` no escuro); card de 448 × 262 px centralizado em (416, 269), fundo igual ao `--card`; botão de
168 × 40 px, raio 8 px. Na web isso também responde o R3 do plano: `min-h-screen` e `bg-muted/30` foram gerados.
Linha de base da PR #54, citada do BACKLOG e não remedida: `Times`, botão `rgb(239, 239, 239)` e fundo
`rgba(0, 0, 0, 0)` no escuro.

### 5.2 Mobile, 375 × 812

Nas duas apps, E1 e E2: `innerWidth` 375, `scrollWidth` 375. Card de 24 a 351 px (327 px de largura), de 275 a 537 px
na vertical, inteiro na tela. Botão de 49 a 326 px (277 px), a largura útil do card. Tema certo nos dois (`light` com
`#fff`, `dark` com `#0a0a0a`).

### 5.3 Botão "Tentar novamente"

Nas duas apps, em E3 (escuro), dois cliques seguidos. Depois de cada um, o `<h1>` segue "Ops, algo deu errado", o botão
segue "Tentar novamente", a classe segue `dark`, o texto da página tem 37 caracteres (não está em branco) e a URL não
muda. Cada clique soma um `[error]` com o mesmo `digest` do carregamento, o próprio erro do layout sendo lançado de novo
quando o `reset()` refaz a árvore. Nenhum erro de outro tipo.

### 5.4 Idiomas

| app | rota | `lang` | `<h1>` | botão |
|-----|------|--------|--------|-------|
| app | `/pt-br/sign-in` | `pt-br` | Ops, algo deu errado | Tentar novamente |
| app | `/en/sign-in` | `en` | Oops, something went wrong | Try again |
| app | `/es/sign-in` | `es` | Ups, algo salió mal | Intentar de nuevo |
| web | `/pt-br` | `pt-br` | Ops, algo deu errado | Tentar novamente |
| web | `/en` | `en` | Oops, something went wrong | Try again |
| web | `/es` | `es` | Ups, algo salió mal | Intentar de nuevo |

Os textos são os de `translations/apps/app/pages/common/globalError.ts` e `translations/apps/web/pages/error/index.ts`.
Sem cookie (`cookies clear`, depois `/sign-in` na app e `/` na web): `lang` `pt-br` e textos em pt-br nas duas. Em
nenhuma rota o texto da página contém `probe` ou `digest`, e o HTML da resposta 500 não contém `global-error probe`.

## 6. Observação: quadro claro antes do escuro

A tela é renderizada no cliente. A classe `dark` chega pelo efeito do `ThemeProvider`, depois do primeiro commit. Medi
com um init script que grava, a cada `requestAnimationFrame` desde o começo do documento, se o `<h1>` existe, a classe do
`<html>` e o fundo do `<body>`. Foram 5 recargas por estado:

| app | estado | recargas com quadro claro antes do `dark` | recargas em que o card já aparecia nesse quadro | `dark` chegou em |
|-----|--------|-------------------------------------------|---------------------------------------------------|------------------|
| app | E2 | 5 de 5 | 2 de 5 | 14 a 26 ms |
| app | E3 | 4 de 5 | 3 de 5 | 10 a 19 ms |
| web | E2 | 5 de 5 | 4 de 5 | 16 a 32 ms |
| web | E3 | 5 de 5 | 4 de 5 | 15 a 27 ms |

São 1 ou 2 quadros brancos, com o CSS já carregado. O critério cobra o estado final, que estava certo em todas as
recargas, e a tela só aparece quando o root layout quebra. Por isso não classifiquei como defeito. Se alguém quiser
eliminar o quadro, a hipótese mais simples é aplicar a classe no `<html>` antes do primeiro paint, com a mesma regra do
`next-themes` (ler `localStorage.theme` e `prefers-color-scheme` durante o render, que aqui só acontece no cliente). Não
testei essa hipótese.

## 7. Ambiente do e2e

| porta | antes | o que fiz | depois |
|-------|-------|-----------|--------|
| 3000 (app) | livre | `pnpm exec next start -p 3000` em `apps/app`, duas vezes (com sonda e build limpo) | `lsof -ti tcp:3000` vazio |
| 3001 (web) | livre | `pnpm exec next start -p 3001` em `apps/web`, duas vezes | `lsof -ti tcp:3001` vazio |
| 3002, 3003, 9099, 8080, 4001 | livres | nada subido à mão; o `pnpm test` da raiz sobe e derruba os emuladores sozinho | vazias |

Derrubei por PID. O `kill` do `pnpm` não levou junto o `next-server` filho, que matei pelo PID dele. Não reutilizei
nenhum serviço do usuário. A API não foi necessária: sem cookie de sessão, o layout da app chega ao `throw` sem
depender dela. Fechei o `agent-browser` com `close`.

Sonda: `if (Date.now() > 0) throw new Error("global-error probe");` depois do `Promise.all` de
`apps/app/app/layout.tsx`. A forma incondicional do plano quebra o build da app no `typecheck` (o TypeScript perde o
estreitamento de `preferredTheme` em código inalcançável). Na web, a forma incondicional passou. Remoção:
`git checkout -- apps/app/app/layout.tsx` e `git checkout -- "apps/web/app/[locale]/layout.tsx"`, os dois fora do
diff. `git diff HEAD --` em cada um saiu vazio e `grep -c "global-error probe"` deu 0 nos dois. Refiz o `.next` das duas
apps sem a sonda (builds da seção 1) e `grep -rl "global-error probe"` nos dois `.next` não achou nada.

Arquivos temporários fora do repo: `/tmp/fred-frames.js`, `/tmp/fred-measure.js`, logs `/tmp/fred-*.log` e CSS/HTML
baixados em `/tmp`. Nada temporário ficou no repo além dos PNG em `test/e2e/`, que o `.gitignore` descarta.

## 8. Lacunas

| lacuna (handoff/review) | veredito |
|-------------------------|----------|
| O Vitest não prova que o CSS chega à tela | **fechada** pelo F1, nas duas apps |
| O clique em "Tentar novamente" (`reset()`) sem teste de unidade | **fechada** pelo F4 no navegador; segue sem teste de unidade, fora do corte |
| O teste executa o script do SSR e não o efeito do provider no cliente | **fechada** pelo F2: o estado final no cliente bate em E1 a E4 nas duas apps |
| O F1 do plano procurava `<link rel="stylesheet">` no HTML do 500 | **fechada**: o roteiro corrigido do handoff vale também para a app |
| A app não foi medida com o `throw` | **fechada**: medida aqui |
| Script ausente passava em silêncio | fechada no `/review` |
| R4 do plano: cookie `x-theme` sem `localStorage.theme` | **fora de escopo** (D3 do plano); não medi |
| Quadro claro antes do escuro | **aberta**, aceita como observação (seção 6) |

## 9. Cross-check

- `apps/app` × `apps/web`: as duas medidas, com os mesmos números.
- Comum × admin × impersonação, `subscription` × `simple`: indiferentes. A tela fica acima das rotas e não lê sessão.
  Medi só sem sessão.
- Mobile × desktop, light × dark, pt-br × en × es: medidos.

## 10. Estado de dev alterado

Nenhum. Não criei conta nem dado no Firebase. O que mudou foi o `localStorage.theme` e os cookies do perfil do
`agent-browser`, em `localhost:3000` e `localhost:3001`. Os `.next` das duas apps ficaram com o build de produção limpo
desta rodada.

## 11. Gate do `/review`

O `STATE.md` mostra `review = in-progress` e `git log origin/main..HEAD` sai vazio: os commits do plano ainda não
existem, o que é esperado no `/cycle`, porque commit é decisão do usuário. O `/review` fica aberto até alguém executar o
plano de commits.
