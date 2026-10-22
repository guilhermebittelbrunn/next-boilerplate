# Plano: estilo e tema nas telas de erro global (app e web)

- **Slug:** `global-error-theme`
- **Origem:** tarefa direta, sem spec. Recomendação da passada incremental da noite de 2026-10-21 em
  `specs/BACKLOG.md:350-415` ("A próxima") e o achado 🟢 "As telas de erro global das duas apps saem sem estilo e sem
  tema" (`specs/BACKLOG.md:2054`).
- **Rodada:** `/cycle` autônomo. Nenhuma pergunta foi feita; as decisões estão na §13 com a opção adotada.
- **Corte:** P. Duas apps (`apps/app`, `apps/web`), quatro arquivos, sem SDK, API, i18n, env, dependência, rota ou
  `error.code`.

## 0. Fontes lidas e medições feitas nesta análise

Lido: os dois `global-error.tsx`, os dois `globalErrorLocale.test.tsx`, os root layouts
(`apps/app/app/layout.tsx`, `apps/web/app/[locale]/layout.tsx`), os dois `styles.css`,
`packages/design-system/index.tsx`, `packages/design-system/providers/theme.tsx`,
`packages/design-system/styles/globals.css`, `apps/app/shared/providers/AppDesignProvider.tsx`,
`apps/app/shared/lib/themePreference.ts`, `apps/app/shared/components/ui/NotFoundPage.tsx`, os dois
`vitest.config`, o `report.md` do `/test` de `web-global-error` e de `leftover-ui-strings` (o roteiro de forçar o erro),
e a documentação do Next sobre `global-error`
(<https://nextjs.org/docs/app/api-reference/file-conventions/error>, `lastUpdated: 2026-10-15`, lida em 2026-10-21).

O slice `entity` não se aplica: não há dado, contrato nem rota. O precedente visual é o `NotFoundPage` da app.

Medido nesta análise, com um teste temporário em cada app, apagado logo depois (`git status --short` sem o arquivo):

| medição | resultado |
|---------|-----------|
| `import` do `styles.css` dentro de um teste Vitest (web, ambiente `node`) | passa; o Vitest troca o CSS por string vazia, então o import não quebra os testes |
| `renderToString` do `ThemeProvider` do design system no ambiente `node` (web) | gera, antes do conteúdo, o `<script>` do `next-themes` chamado com `("class","theme","system",null,["light","dark"],null,true,true)` |
| o mesmo `renderToString` no ambiente `jsdom` (app) | **falha** com `TypeError: window.matchMedia is not a function`. Os dois `globalErrorLocale.test.tsx` rodam em `jsdom` (a app pelo `vitest.config.ts`, a web pelo `// @vitest-environment jsdom` da linha 1), então **os dois testes atuais quebram** com a mudança se não ganharem um stub de `matchMedia` |

Essa última medição corrige a recomendação do BACKLOG, que dava os testes atuais como prontos para receber a mudança.
O stub tem precedente no repo: `apps/app/__tests__/tableLoadMore.test.tsx:5-15` e
`apps/app/__tests__/accountSessionsPanel.test.tsx:5-15`.

## 1. Contexto

### 1.1 Problema

A tela de erro global aparece quando o root layout quebra. Ela substitui o layout inteiro, e é o layout que importa o
CSS (`apps/app/app/layout.tsx:2`, `apps/web/app/[locale]/layout.tsx:1`) e monta o tema
(`AppDesignProvider` em `apps/app/app/layout.tsx:86`, `DesignSystemProvider` em `apps/web/app/[locale]/layout.tsx:36`).
Hoje `apps/app/app/global-error.tsx:1-6` e `apps/web/app/global-error.tsx:1-6` não importam CSS nem montam provider,
e o `<html>` (`:20` nos dois) leva só a classe das fontes. O `/test` das duas tarefas da PR #54 mediu fonte serifada
(`Times`), botão nativo (`rgb(239, 239, 239)`) e fundo transparente, também com `prefers-color-scheme: dark`.

A documentação do Next diz o mesmo: o `global-error` "must define its own `<html>` and `<body>` tags, global styles,
fonts, or other dependencies that your error page requires", e um tema aplicado por classe no app "won't reach them"
se a tela não o aplicar.

### 1.2 Objetivo

Quem cai na tela de erro global vê a mesma identidade visual do resto da app: fonte Geist, fundo e texto dos tokens,
botão do design system, no tema que escolheu (ou no do sistema, sem escolha), legível a 375 px, nos três idiomas.

### 1.3 Corte de MVP

- As duas telas importam o `styles.css` do próprio app.
- O conteúdo entra no `ThemeProvider` de `@repo/design-system/providers/theme`.
- `<html>` ganha `suppressHydrationWarning`.
- Layout mínimo com os componentes do design system, no molde do `NotFoundPage` (card centralizado, título, botão).
- Os dois testes existentes ganham o stub de `matchMedia` e um caso que prova o tema.

### 1.4 Fora de escopo

- O `not-found` e o `error` da `apps/web` (o 🟡 reduzido pela PR #54; criar root layout na web mexe no idioma do
  servidor).
- O `reset()` que refaz a árvore sem pedir de novo ao servidor. É o comportamento do Next; a prop `retry` só existe a
  partir do Next 16.2 (tabela de versões da documentação) e o repo está no 16.0.0 (`apps/app/node_modules/next/package.json`).
- Ler o cookie `x-theme` na tela de erro (§13, D3).
- Outros providers (auth, query, analytics, locale, toasts).
- Copy nova. As chaves `title` e `retry` já existem nos três idiomas
  (`translations/apps/app/pages/common/globalError.ts:1-14`, `translations/apps/web/pages/error/`) e o corte não pede
  descrição.
- A porta fixa no `start` da `web` e da `api` (achado 🟢 separado; §13, D6).

### 1.5 Apps e modo de produto

| app | impacto |
|-----|---------|
| `apps/app` | `app/global-error.tsx` + `__tests__/globalErrorLocale.test.tsx` |
| `apps/web` | `app/global-error.tsx` + `__tests__/globalErrorLocale.test.tsx` |
| `apps/api`, `packages/*` | nenhum |

Área do painel: nenhuma (a tela fica acima das rotas e vale para comum, admin e não autenticado). Modo de produto
(`subscription` × `simple`) e plano: indiferentes.

### 1.6 Colisão com o working tree

`git status --short` no início da análise: os dois `*-form-client.tsx` da landing, quatro testes de formulário da web,
`specs/` e `docs/features/web-auth-forms/` (tarefa `web-auth-forms`, sem commit). Nenhum arquivo deste plano aparece
na lista, e os root layouts que o `/test` edita temporariamente também não.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo.

## 5. Front-end

### 5.1 Renderização

As duas telas continuam `"use client"`, como o Next exige. O `ThemeProvider` do design system (`theme.tsx:4-17`) é o
`next-themes` com `attribute="class"`, `defaultTheme="system"`, `enableSystem` e `disableTransitionOnChange`. Quando a
tela é renderizada no servidor (root layout que quebra no request, o caso que o `/test` mediu com status 500), o
HTML já sai com o `<script>` do `next-themes`, que põe `dark` ou `light` no `<html>` antes do primeiro paint. Quando a
quebra é no cliente, o efeito do provider aplica a classe depois de montar.

Por que essa forma funciona com o resto do repo:

- `globals.css:7` declara `@custom-variant dark (&:is(.dark *));`, então a classe no `<html>` liga os tokens de `.dark`
  (`globals.css:49`).
- `body` já recebe `bg-background text-foreground` na camada base (`globals.css:153-155`). Não é preciso classe no
  `<body>`.
- O `next-themes` lê a chave `theme` do `localStorage`, a mesma que a app grava (`themePreference.ts:17`, `:32`).
- O script troca a classe do `<html>` antes da hidratação, o que gera diferença de atributo. Os dois root layouts
  resolvem com `suppressHydrationWarning` (`apps/app/app/layout.tsx:75`, `apps/web/app/[locale]/layout.tsx:31`), e a
  tela de erro faz o mesmo.

Caminho do CSS: na app, `./styles.css` (`apps/app/app/styles.css`, ao lado do `global-error.tsx`); na web,
`./[locale]/styles.css`, porque `apps/web/app/` não tem CSS na raiz (`ls apps/web/app`). Os dois arquivos importam o
`globals.css` do design system; o da web traz também as regras `.shiki`, que não afetam esta tela.

### 5.2 Layout

Com o CSS do app, o preflight do Tailwind zera o tamanho do `<h1>` e a margem do `<body>`. Manter só `<h1>` e
`<Button>` daria um título do tamanho do corpo colado no canto da tela. O layout copia a estrutura do `NotFoundPage`
(`apps/app/shared/components/ui/NotFoundPage.tsx:21-47`), que não dá para reutilizar porque é Server Component e usa
`getDictionary` do servidor e `resolveNotFoundHomePath` (`:10`, `:13`):

- contêiner `flex min-h-screen w-full items-center justify-center bg-muted/30 p-6 md:p-10` (`:21`);
- `Card` com `w-full max-w-md border-border/80 shadow-sm` (`:22`);
- título com as classes do `CardTitle` de lá (`font-semibold text-xl tracking-tight`, `:25`), mas como `<h1>`, porque é
  o único título da página e o `CardTitle` é uma `div` (`card.tsx`);
- `Button` `size="lg"` com `w-full sm:w-auto` (`:36-37`).

As classes da web são achadas pelo Tailwind pela detecção automática de fontes do `@tailwindcss/postcss` (o
`postcss.config` das duas apps reexporta o do design system). `min-h-screen` e `bg-muted/30` ainda não aparecem em
`apps/web/app`; o `/test` confere a altura e o fundo calculados na web.

### 5.3 Dados, hooks, formulário, tabela

N/A.

### 5.4 i18n e a11y

Nenhuma chave nova. O `lang` continua vindo de `getDictionary()` do cliente, e o `<h1>` continua sendo o título. O
botão é um `<button>` do design system com o rótulo traduzido.

## 6. Autorização e segurança

N/A para autorização: a tela não lê sessão nem dado. Impersonação: indiferente, a tela não mostra quem está logado.
Segurança: a tela continua sem imprimir `error.message` nem `digest` (o teste "never prints the error details" da web
fica). O `<script>` inline é o mesmo que o `next-themes` já põe em todas as páginas pelo root layout; esta tarefa não
muda a política de CSP.

## 7. Testes

| # | nível | arquivo | o que prova |
|---|-------|---------|-------------|
| T1 | componente, `renderToString` em `jsdom` | `apps/app/__tests__/globalErrorLocale.test.tsx` | os 4 casos atuais seguem passando com o provider (stub de `matchMedia` no topo do arquivo, como em `tableLoadMore.test.tsx:5-15`) + 1 caso novo: o HTML traz o script do tema com `"class","theme","system"`, ou seja, classe no `<html>`, a chave do `localStorage` que a app grava e o padrão do sistema |
| T2 | componente, `renderToString` em `jsdom` | `apps/web/__tests__/globalErrorLocale.test.tsx` | os 5 casos atuais + o mesmo caso novo do tema |

Totais esperados: app 4 → 5 casos no arquivo, web 5 → 6.

O que os testes **não** provam, e fica para o `/test`: que o CSS chega ao HTML no build de produção (o Vitest troca CSS
por string vazia), a classe `dark` aplicada de fato e a aparência. Nenhum teste com processo externo é necessário.

Asserção do tema: comparar com a string `"class","theme","system"` amarra o teste ao formato do script do
`next-themes` 0.4.6. É de propósito: se a lib mudar o formato ou alguém trocar o `attribute`, o teste quebra e pede uma
olhada. Alternativa mais forte, deixada a critério do `/develop`: executar o conteúdo do script no `jsdom` com
`localStorage.theme = "dark"` e conferir `document.documentElement.classList.contains("dark")`. Custa um `new Function`,
que o Biome pode recusar.

Lacuna herdada (`specs/BACKLOG.md:199-201`): o teste da app não clica no botão para conferir o `reset()`. Veredito
aqui: **continua aberta** no Vitest (clicar exige montar `<html>` no cliente, fora do corte), e o `/test` a fecha no
navegador pelo fluxo F4.

## 8. O que o `/test` vai percorrer

### 8.1 Como forçar o erro global (sem harness no repo)

Mesmo roteiro das duas tarefas da PR #54 (`docs/features/web-global-error/test/report.md:62-63`,
`docs/features/leftover-ui-strings/test/report.md:84-85`):

1. Inserir `throw new Error("global-error probe");` logo depois do `Promise.all` do root layout:
   `apps/app/app/layout.tsx` (depois da linha 55) e `apps/web/app/[locale]/layout.tsx` (depois da linha 25). Nesse
   ponto as rotas continuam dinâmicas e o build não quebra no pré-render.
2. `pnpm --filter app build` e, dentro de `apps/app`, `pnpm exec next start -p 3000`. Na web, `pnpm --filter web build`
   e, dentro de `apps/web`, `pnpm exec next start -p 3001`. O `pnpm --filter web start` sobe na 3000 (o script não tem
   `-p`).
3. No fim: `git checkout -- apps/app/app/layout.tsx "apps/web/app/[locale]/layout.tsx"` (nenhum dos dois está no diff,
   então o checkout só desfaz o `throw`), conferir com `git status --short`, derrubar os servidores por PID e apagar ou
   refazer o `.next` das duas apps, que ficaram com o build quebrado.

Nada novo entra no repo para isso.

### 8.2 Estados de tema e como produzir cada um

Com o `throw` no layout, toda página cai na tela de erro, então a escolha de tema vai direto no navegador:
`agent-browser eval "localStorage.setItem('theme','dark')"` (ou `'light'`, ou `removeItem('theme')`) e recarregar.
A mídia do sistema muda com `agent-browser set media dark|light`; viewport com `set viewport 375 812`.

| estado | `localStorage.theme` | mídia do sistema | esperado |
|--------|----------------------|------------------|----------|
| E1 | ausente | light | claro |
| E2 | ausente | dark | escuro (vem do sistema) |
| E3 | `dark` | light | escuro (a escolha vence o sistema) |
| E4 | `light` | dark | claro (a escolha vence o sistema) |

### 8.3 Fluxos

- **F1, CSS no build de produção.** `curl -s http://localhost:<porta>/<locale>` com o `throw`: status 500 e um
  `<link rel="stylesheet" href="/_next/static/...css">` no HTML. Sem ele, a tarefa vai para o plano B (§11).
- **F2, aparência e tema.** Em cada app, E1 a E4 em 1280 px: `getComputedStyle` do `<h1>` (`font-family` com Geist,
  `font-size` 20 px), do `<body>` (`background-color` do token: branco no claro, `oklch(0.145 0 0)` no escuro), do
  botão (fundo `--primary`, não `rgb(239, 239, 239)`), e `document.documentElement.className` com `dark` ou `light`.
- **F3, mobile.** E1 e E2 a 375 px: `innerWidth` 375, `scrollWidth` 375, card inteiro na tela, botão em largura total.
- **F4, botão.** Clicar em "Tentar novamente" com o `throw` ainda no layout: a tela de erro volta, sem página em
  branco nem erro novo no console. Fecha a lacuna herdada na app.
- **F5, idiomas.** `/pt-br`, `/en`, `/es` nas duas apps: `lang`, título e botão iguais ao dicionário.
- **F6, console.** Nenhum aviso de hidratação sobre `class` ou `style` do `<html>` no carregamento da tela.
- **F7, linha de base.** O antes × depois cita a medição da PR #54 (`Times`, botão `rgb(239, 239, 239)`, fundo
  `rgba(0, 0, 0, 0)` no escuro, `specs/BACKLOG.md:2054`). Não use `git stash` para remedir: o working tree tem outra
  tarefa sem commit e o stash é compartilhado entre worktrees.

### 8.4 O que não dá para observar sem infra externa

Nada. Tudo roda local, sem emulador para a web. A app precisa do `.env.local` que já sobe o build de produção (o
`/test` de `leftover-ui-strings` subiu a app assim).

## 9. Critérios de aceite (rascunho para o `/test`)

# Critérios de Aceite (Checklist)

- [ ] **A tela de erro global da app sai com o CSS do app no build de produção**
  Com o root layout quebrando em `next build && next start`, a resposta 500 traz o `<link rel="stylesheet">` do app e a
  tela usa Geist no título, o fundo do token `--background` e o botão do design system. Fonte serifada, botão nativo ou
  fundo transparente reprovam o critério. O teste é feito com o `throw` temporário, removido no fim.

- [ ] **A tela de erro global da landing sai com o CSS da landing no build de produção**
  Mesmo critério na `apps/web`, com o CSS de `app/[locale]/styles.css`. O `<link rel="stylesheet">` precisa estar no
  HTML de `/pt-br`, `/en` e `/es`, e a altura mínima e o fundo `bg-muted/30` do contêiner precisam aparecer nos estilos
  calculados, o que prova que o Tailwind achou as classes do arquivo.

- [ ] **Sem escolha salva, a tela segue o tema do sistema**
  Com `localStorage.theme` ausente, a tela fica clara com o sistema claro e escura com o sistema escuro, nas duas apps.
  O `<html>` recebe a classe `light` ou `dark` e o fundo do `<body>` muda junto. Um sistema escuro com a tela clara
  reprova.

- [ ] **Com escolha salva, a escolha vence o sistema**
  Com `localStorage.theme = "dark"` e o sistema claro, a tela fica escura; com `"light"` e o sistema escuro, fica
  clara. Vale nas duas apps. É o que garante que a tela mostra o mesmo tema das outras páginas para quem trocou o tema
  no seletor.

- [ ] **A tela cabe em 375 px nos dois temas**
  A 375 px, sem rolagem horizontal (`scrollWidth` igual a `innerWidth`), com o card inteiro visível e o botão em
  largura total. Vale no claro e no escuro, nas duas apps.

- [ ] **O idioma continua certo nos três idiomas**
  Em `/pt-br`, `/en` e `/es`, o `lang` do `<html>`, o título e o rótulo do botão saem do dicionário de cada app
  (`apps.app.pages.common.globalError` e `apps.web.pages.error`). Sem cookie de idioma, o padrão é `pt-br`. Nenhum texto
  em inglês fixo aparece em outro idioma.

- [ ] **O botão de tentar de novo funciona**
  Clicar em "Tentar novamente" com o layout ainda quebrado mostra a tela de erro de novo, sem página em branco e sem
  erro novo no console. Um segundo clique seguido tem o mesmo resultado. Que o botão não busque de novo no servidor é
  comportamento do Next e não reprova.

- [ ] **Sem aviso de hidratação no `<html>`**
  O carregamento da tela não registra aviso de hidratação sobre `class` ou `style` do `<html>`, que o script do tema
  altera antes da hidratação. Um aviso desse tipo indica que o `suppressHydrationWarning` não foi aplicado.

- [ ] **A tela não mostra detalhes do erro**
  A mensagem `global-error probe` e o `digest` não aparecem no texto da página em nenhum idioma, nas duas apps.

- [ ] **Testes e gates**
  `globalErrorLocale.test.tsx` da app com 5 casos e o da web com 6 passam, junto com a suíte das duas apps e o
  `pnpm test` da raiz. `pnpm check` e o `typecheck` das duas apps limpos. O build das duas apps termina com exit 0 depois
  de remover o `throw`.

## 10. Blueprint técnico

### 10.1 `apps/app/app/global-error.tsx`

```tsx
"use client";

import "./styles.css";
import { Button } from "@repo/design-system/components/ui/button";
import {
    Card,
    CardFooter,
    CardHeader,
} from "@repo/design-system/components/ui/card";
import { fonts } from "@repo/design-system/lib/fonts";
import { ThemeProvider } from "@repo/design-system/providers/theme";
import { getDictionary } from "@repo/internationalization/client";
import type NextError from "next/error";

type GlobalErrorProperties = {
    readonly error: NextError & { digest?: string };
    readonly reset: () => void;
};

const GlobalError = ({ reset }: GlobalErrorProperties) => {
    // This screen replaces the root layout, so it brings its own stylesheet and theme, and no
    // LocaleProvider is mounted: the locale comes from the last one rendered or from the cookie
    // the proxy writes on each page request.
    const { dictionary, locale } = getDictionary();
    const globalErrorCopy = dictionary.apps.app.pages.common.globalError;

    return (
        <html className={fonts} lang={locale} suppressHydrationWarning>
            <body>
                <ThemeProvider>
                    <main className="flex min-h-screen w-full items-center justify-center bg-muted/30 p-6 md:p-10">
                        <Card className="w-full max-w-md border-border/80 shadow-sm">
                            <CardHeader className="items-center py-10 text-center">
                                <h1 className="font-semibold text-xl tracking-tight">
                                    {globalErrorCopy.title}
                                </h1>
                            </CardHeader>
                            <CardFooter className="flex flex-col gap-3 pb-8">
                                <Button
                                    className="w-full sm:w-auto"
                                    onClick={() => reset()}
                                    size="lg"
                                >
                                    {globalErrorCopy.retry}
                                </Button>
                            </CardFooter>
                        </Card>
                    </main>
                </ThemeProvider>
            </body>
        </html>
    );
};

export default GlobalError;
```

### 10.2 `apps/web/app/global-error.tsx`

Igual ao 10.1, com duas diferenças:

```diff
-import "./styles.css";
+import "./[locale]/styles.css";
 ...
-    const globalErrorCopy = dictionary.apps.app.pages.common.globalError;
+    const globalErrorCopy = dictionary.apps.web.pages.error;
```

O `import` do CSS fica na primeira linha depois de `"use client"`, como em `apps/web/app/[locale]/layout.tsx:1`. Se o
Biome reordenar, vale a ordem que ele deixar; import de efeito colateral não muda de comportamento pela posição aqui.

Os dois arquivos ficam iguais exceto pelo CSS e pela chave. Extrair um componente compartilhado no design system
exigiria o pacote importar o `styles.css` de cada app, o que não faz sentido; duplicar 40 linhas em duas apps é o
menor raio.

### 10.3 Testes (pseudo-diff, igual nos dois arquivos)

```diff
 import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

 /** `geist/font` relies on the Next font transform, which this runner does not apply. */
 vi.mock("@repo/design-system/lib/fonts", () => ({ fonts: "" }));

+// jsdom ships without matchMedia, and next-themes reads it while rendering the system theme.
+window.matchMedia = ((query: string) => ({
+    matches: false,
+    media: query,
+    onchange: null,
+    addListener: vi.fn(),
+    removeListener: vi.fn(),
+    addEventListener: vi.fn(),
+    removeEventListener: vi.fn(),
+    dispatchEvent: vi.fn(),
+})) as unknown as typeof window.matchMedia;
+
 const { default: GlobalError } = await import("@/app/global-error");
 ...
+    it("starts the theme from the browser choice, falling back to the system", () => {
+        const html = renderGlobalError();
+
+        expect(html).toContain('"class","theme","system"');
+    });
```

### 10.4 Contrato, rota, persistência, i18n, env

N/A em todos. Nenhuma variável de ambiente, nenhum fork precisa configurar nada.

### 10.5 Ordem de implementação e commits

Não há SDK, API nem i18n. Proposta para o `/review` (um commit por app, testes junto da mudança):

1. `fix(app): style and theme the global error screen` (`apps/app/app/global-error.tsx`,
   `apps/app/__tests__/globalErrorLocale.test.tsx`)
2. `fix(web): style and theme the landing global error screen` (`apps/web/app/global-error.tsx`,
   `apps/web/__tests__/globalErrorLocale.test.tsx`)
3. `docs(features): global-error-theme` (por último)

Os arquivos de `web-auth-forms` e de `specs/` continuam fora desses commits; o `git diff --cached --stat` precisa sair
vazio antes do primeiro.

## 11. Riscos e plano B

| risco | como o `/test` mede | plano B |
|-------|---------------------|---------|
| R1. O Turbopack do Next 16 não põe o CSS importado no `global-error` no HTML da resposta 500 | F1: `<link rel="stylesheet">` no HTML e estilos calculados em F2 | (a) Se o CSS só chega depois da hidratação (flash sem estilo, depois correto), registrar e aceitar: a tela é rara e o estado final está certo. (b) Se não chega de jeito nenhum, tirar o `import` do CSS e o layout com classes, manter o `ThemeProvider` e o `suppressHydrationWarning`: o `enableColorScheme` do `next-themes` põe `color-scheme: dark` no `<html>` e o navegador pinta fundo, texto e botão nativos no escuro. O achado do BACKLOG é reescrito como "tema nativo entregue, estilo pendente", com a medição |
| R2. Aviso de hidratação no `<html>` | F6 | conferir se o `suppressHydrationWarning` está no `<html>` e não no `<body>` |
| R3. Classes da web sem CSS gerado (`min-h-screen`, `bg-muted/30` não aparecem em outro arquivo de `apps/web/app`) | critério 2: altura e fundo calculados | trocar pelas classes que a web já usa; não adicionar `@source` |
| R4. Usuário que limpou o `localStorage` mas manteve o cookie `x-theme` na app vê o tema do sistema na tela de erro e o da conta nas outras páginas | não medido; caso raro, fora do fluxo normal (o cookie só é gravado junto do `localStorage` ou quando ele já tem escolha, `themePreference.ts:28-34`, `:53-62`) | aceito; vira linha no BACKLOG se o `/test` achar outra causa para a divergência |

## 12. Pré-requisitos manuais de infra

Nenhum. Sem env, sem serviço externo, sem console de provedor. O `/test` só precisa do `.env.local` que já sobe as
duas apps em build de produção.

## 13. Decisões tomadas sem perguntar

Precedência: recomendação do BACKLOG, depois padrão do repo, depois menor raio de impacto.

| # | pergunta | opções | adotada | por quê |
|---|----------|--------|---------|---------|
| D1 | De onde vem o estilo? | importar o `styles.css` de cada app · `<style>` inline com o mínimo · nada | `styles.css` de cada app | recomendação do BACKLOG; a documentação do Next manda a tela trazer os próprios estilos globais. `<style>` inline duplicaria tokens |
| D2 | Como aplicar o tema? | `ThemeProvider` do design system · `DesignSystemProvider` inteiro · `AppDesignProvider` na app | `ThemeProvider` | recomendação do BACKLOG. O `DesignSystemProvider` traz `AuthProvider`, antd e toasts (`index.tsx:42-51`), que a tela não usa e que podem quebrar justo quando o layout quebrou |
| D3 | Ler o cookie `x-theme` na app? | sim, como `defaultTheme` · não | não | recomendação do BACKLOG. O cookie só existe junto de uma escolha no `localStorage` (`themePreference.ts:28-34`, `:53-62`), que o `next-themes` já lê; ler de novo seria reimplementar `resolvePreferredTheme` para o caso R4 |
| D4 | Layout da tela | só `<h1>` e `<Button>` · card no molde do `NotFoundPage` · componente compartilhado no design system | card no molde do `NotFoundPage` | padrão do repo. Sem layout, o preflight deixaria o título do tamanho do corpo, colado no canto. O componente compartilhado não resolve o CSS, que é de cada app |
| D5 | Os testes atuais quebram com o provider (medido) | stub de `matchMedia` no arquivo · `setupFiles` no `vitest.config` · `vi.mock` do provider | stub no arquivo | padrão do repo (`tableLoadMore.test.tsx:5-15`); `setupFiles` mexe em todos os testes da app, e o mock esconderia o que se quer provar |
| D6 | Incluir `-p 3001` no `start` da web (e da api)? | incluir · deixar fora | fora | menor raio: outro achado, outros arquivos. O `/test` usa `pnpm exec next start -p <porta>` |
| D7 | Prova do tema no Vitest | string do script `"class","theme","system"` · executar o script no `jsdom` | string do script | o mais barato que amarra `attribute`, chave e padrão; o `/develop` pode trocar pela execução se o Biome aceitar |

Nenhuma pergunta fica para o usuário: as sete decisões seguem a recomendação ou o padrão vigente. Se o plano B do R1 for
acionado, o relatório final precisa dizer isso, porque aí a entrega fica menor que o corte.
