# Handoff do `/develop`: global-error-theme

Rodada autônoma do `/cycle`. Nada foi commitado e nenhuma branch foi criada.

## Blueprint → arquivos

| item do plano | arquivo | mudança |
|---------------|---------|---------|
| 10.1 | `apps/app/app/global-error.tsx` | importa `./styles.css`, envolve o conteúdo no `ThemeProvider` de `@repo/design-system/providers/theme`, põe `suppressHydrationWarning` no `<html>` e troca `<h1>` + `<Button>` soltos pelo card no molde do `NotFoundPage`. Igual ao blueprint. |
| 10.2 | `apps/web/app/global-error.tsx` | o mesmo, com `./[locale]/styles.css` e `dictionary.apps.web.pages.error`. O Biome manteve o import do CSS logo depois de `"use client"`. |
| 10.3 | `apps/app/__tests__/globalErrorLocale.test.tsx` | stub de `matchMedia` controlável por `systemPrefersDark` + 4 casos de tema (E1 a E4). |
| 10.3 | `apps/web/__tests__/globalErrorLocale.test.tsx` | o mesmo. |

Nenhum outro arquivo mudou. Sem SDK, API, i18n, env ou dependência.

## Contrato

Nenhum DTO nem action mexido. Nenhum `error.code` novo, então não há entrada nova em `apiErrors`.

## Desvios em relação ao plano

### 1. Teste do tema: execução do script em vez da comparação de string (D7)

O plano deixou a troca a critério do `/develop`. Em vez de procurar `"class","theme","system"` no HTML, o teste extrai o
`<script>` que o `next-themes` gera, executa com `new Function` no `jsdom` e confere a classe e o `color-scheme` do
`<html>` em quatro estados:

| estado | `localStorage.theme` | sistema escuro | esperado |
|--------|----------------------|----------------|----------|
| E1 | ausente | não | `light` |
| E2 | ausente | sim | `dark` |
| E3 | `dark` | não | `dark` |
| E4 | `light` | sim | `light` |

Na app, a escolha é gravada com `storeActiveTheme` de `@/shared/lib/themePreference`, então o teste também amarra a chave
que a app grava à chave que a tela lê. O Biome aceita `new Function` sem supressão (`pnpm exec biome check` nos 4
arquivos: sem aviso depois de tirar um `biome-ignore` que ele marcou como sem efeito).

Os totais mudam: app 4 → 8 casos no arquivo (o plano previa 5), web 5 → 9 (previa 6). O critério "Testes e gates" do
rascunho precisa usar esses números.

Prova de que o teste pega regressão (mutação temporária no `apps/app/app/global-error.tsx`, desfeita depois com cópia
do arquivo e conferida com `grep -c 'storageKey\|data-theme'` → `0`):

- `<ThemeProvider storageKey="other">` → `2 failed | 6 passed` (E3 e E4 caem);
- `<ThemeProvider attribute="data-theme">` → `4 failed | 4 passed` (os quatro casos de tema caem).

### 2. A §5.1 e o fluxo F1 do plano erram sobre o HTML da resposta 500 (medido na web)

O plano diz que, com o root layout quebrando no servidor, o HTML da resposta 500 já sai com o `<script>` do
`next-themes` e com um `<link rel="stylesheet">`, e o F1 do `/test` reprova a tarefa sem esse link. No build de produção
da web isso não acontece. O código não muda por causa disso, mas o roteiro do `/test` precisa mudar.

Medição (web, `throw new Error("global-error probe")` depois do `Promise.all` de `apps/web/app/[locale]/layout.tsx`,
`pnpm --filter web build` → exit 0, `pnpm exec next start -p 3001` em `apps/web`, `curl -s` em `/pt-br`, `/en`, `/es`):

- status `500` nos três;
- o `<html>` da resposta é `<html id="__next_error__">`, o shell do Next, não o da tela: `grep -c '"class","theme","system"'`
  → `0`, `grep -c "algo deu errado"` → `0`, nenhum `<h1>` da tela. A tela de erro global é renderizada **no cliente**, a
  partir do payload RSC;
- `grep -o '<link rel="stylesheet"[^>]*>'` → nada. O que existe no `<head>` são dois `<link rel="preload" as="style">`
  (`4de43917a446f596.css` e `cf5a0a8ba70c4387.css`);
- no payload RSC, a entrada `"G"` (a do `global-error`) lista os dois CSS como `{"rel":"stylesheet",...,"precedence":"next"}`;
- `4de43917a446f596.css` (135518 bytes) contém `shiki`, `min-h-screen`, `bg-muted\/30` e `.dark{--background:#0a0a0a;...`,
  ou seja, é o `[locale]/styles.css` da web com as classes da tela (R3 fica respondido na geração do CSS);
  `cf5a0a8ba70c4387.css` (972 bytes) tem as `@font-face` da Geist.

O que isso significa para o R1: o CSS chega à tela, pela entrada `"G"` do payload, e o React insere o
`<link rel="stylesheet">` quando monta a tela no cliente. Não é o plano B. Duas consequências que o `/test` precisa medir:

- o `<script>` do `next-themes` inserido pelo React no cliente não executa; a classe do tema vem do efeito do
  `ThemeProvider` depois da montagem. Pode haver um quadro claro antes do escuro em E2/E3;
- o F1 deve procurar o `preload` no `<head>` e a entrada `"G"` com o CSS, e confirmar o `<link rel="stylesheet">` no DOM
  do navegador depois da montagem, não no HTML do `curl`.

Não medi a linha de base (o `"G"` com HEAD), então "o `4de4…css` entrou no `"G"` por causa do import novo" é inferência:
o layout importa o mesmo `styles.css`, e antes da mudança o `global-error` só importava as fontes.

A app não foi medida com o `throw`. `pnpm --filter app build` sem sonda → exit 0. O comportamento deve ser o mesmo
(mesmo Next 16.0.0, mesmo tipo de tela), mas isso fica para o `/test`.

Os `_global-error.html` gerados em `.next/server/app/` das duas apps são a página 500 padrão do Next
(`<h1 class="next-error-h1">500</h1>`), não esta tela. Não servem de evidência.

## Decisões em aberto

Nenhuma bloqueia a entrega. O ajuste do F1 e do critério "Testes e gates" é correção do roteiro, não decisão de produto.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| typecheck app | `pnpm --filter app typecheck` | exit 0 |
| typecheck web | `pnpm --filter web typecheck` | exit 0 |
| testes do arquivo, app | `pnpm exec vitest run __tests__/globalErrorLocale.test.tsx` em `apps/app` | 8/8 |
| testes do arquivo, web | o mesmo em `apps/web` | 9/9 |
| suíte app | `pnpm --filter app test` | 116 arquivos, 979 testes, exit 0 |
| suíte web | `pnpm --filter web test` | 26 arquivos, 207 testes, exit 0 (inclui os testes sem commit da `web-auth-forms`) |
| lint | `pnpm check` | 971 arquivos, nenhum ajuste, exit 0 |
| build web sem sonda | `pnpm --filter web build` | exit 0 |
| build app sem sonda | `pnpm --filter app build` | exit 0 |

i18n: nenhuma chave nova, paridade não remedida.

Limpeza da sonda: `git checkout -- "apps/web/app/[locale]/layout.tsx"` (o arquivo não estava no diff), depois
`git status --short` e `git diff --stat HEAD` desse arquivo vazios e `grep -c "global-error probe"` → `0`. O `.next` da web
foi refeito sem a sonda (build acima). O servidor que subi na 3001 foi derrubado; `lsof -ti tcp:3000` e
`lsof -ti tcp:3001` vazios no fim (as duas portas estavam livres antes).

## A verificar no `/test`

- **F1 reescrito**: no navegador, depois da montagem, `document.querySelectorAll('link[rel=stylesheet]')` com o CSS do
  app, nas duas apps. Na app, repetir o `curl` e conferir `preload` + entrada `"G"` como na web.
- **F2, tema no estado final**: E1 a E4 nas duas apps, `document.documentElement.className` e o `background-color` do
  `<body>`.
- **Quadro claro antes do escuro** em E2/E3: o script do tema não roda no cliente. Repro: sistema escuro, recarregar a
  tela, observar o primeiro paint. Se aparecer, registrar; o estado final é o que o critério cobra.
- **F6, console em build de produção**: aviso de hidratação no `<html>` e o aviso do React sobre `<script>` renderizado
  no cliente (o React 19 avisa em dev quando um componente renderiza `<script>`; em produção não foi medido).
- **F3 mobile, F4 botão, F5 idiomas**, como no plano.
- Geist no `<h1>`, fundo do token e botão do design system: nada disso foi medido aqui, só a presença das classes no CSS
  gerado da web.

## Lacunas de teste conhecidas

- O Vitest não prova que o CSS chega à tela (troca CSS por string vazia). Coberto pela medição de build acima, só na web.
- O clique em "Tentar novamente" (`reset()`) continua sem teste de unidade; fica com o F4.
- O teste do tema executa o script como o navegador faria num SSR da tela. No build de produção a tela é renderizada no
  cliente e o tema vem do efeito do provider, caminho que o teste não exercita.
