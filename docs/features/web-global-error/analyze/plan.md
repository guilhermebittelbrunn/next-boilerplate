# Plano: tela de erro global efetiva na landing

Tarefa direta, sem spec. É a recomendação #1 da passada incremental de 2026-10-21 em `specs/BACKLOG.md:321-358`
("A próxima: tarefa direta na tela de erro global da landing"). Rodada autônoma do `/cycle`: as decisões que dependeriam
do usuário estão na §11, cada uma com a opção adotada.

Âncoras conferidas em 2026-10-21 contra o working tree (branch `guilhermebittelbrunn/cycle-command-v7`, HEAD
`d19e6fd`). Nenhum arquivo citado como alvo desta tarefa tem mudança local.

## 1. Contexto

### 1.1 Resumo

A landing (`apps/web`) tem uma tela de erro global traduzida em `apps/web/app/[locale]/global-error.tsx:1-32`, mas o
Next nunca a renderiza. Quando o root layout da landing quebra, quem visita vê a tela embutida do Next, em inglês, sem
`lang` e sem botão de tentar de novo. A tarefa leva o arquivo para `apps/web/app/global-error.tsx`, onde o Next o
procura, alinha o código à versão que a app ganhou em `leftover-ui-strings` e cria um teste de componente.

### 1.2 O defeito, medido no build

A auditoria provou o defeito lendo `next/dist/build/webpack/loaders/next-app-loader/index.js` (`:151`, `:231-238`,
`:99`). A conclusão está certa, mas esse loader não é o caminho do build: o Next 16.0.0 usa Turbopack quando nenhum
bundler é indicado (`next/dist/lib/bundler.js:73-76`, `process.env.TURBOPACK = 'auto'`), o script da web é só
`next build` (`apps/web/package.json:6`) e o log do build abre com `Next.js 16.0.0 (Turbopack)`. A lógica do Turbopack
vive no binário nativo e não dá para ler. Por isso este plano mediu nos artefatos de `pnpm --filter web build`:

| build | chave `"global-error"` no loader tree | `GlobalError` que o app-render usa |
|---|---|---|
| hoje (arquivo em `[locale]`) | segmento `[locale]` → `apps/web/app/[locale]/global-error.tsx`; raiz → `next/dist/client/components/builtin/global-error.js` | `E=a.i(41224)`, o módulo embutido (`.next/server/chunks/ssr/conductor_workspaces_next-boilerplate_palikir_a413d7a0._.js`) |
| sonda (arquivo movido para `app/`) | raiz → `apps/web/app/global-error.tsx` nas 9 árvores | `E=a.i(66039)`, que é `apps/web/app/global-error.tsx` |

O que isso mostra:

- Hoje o arquivo de `[locale]` **entra no bundle**, mas só como chave do segmento. O app-render pega o `GlobalError` do
  módulo da entrada (`ctx.componentMod.GlobalError`, `next/dist/server/app-render/app-render.js:3313`, devolvido em
  `:3340`), que é o da raiz. A chave de segmento só alimenta o explorador de segmentos do modo dev
  (`create-component-tree.js:261`, `isSegmentViewEnabled = !!ctx.renderOpts.dev`). Em produção, o arquivo nunca é
  renderizado. O BACKLOG diz "nunca é carregado"; o termo exato é "nunca é renderizado".
- A tela que aparece é `DefaultGlobalError` (`next/dist/client/components/builtin/global-error.js:34-70`):
  `<html id="__next_error__">` sem `lang` e o texto "Application error: a server-side exception has occurred while
  loading <host>" (`:52`), sem botão.
- Com o arquivo na raiz, o build termina com sucesso (`Compiled successfully`, `Generating static pages (8/8)`), gera
  `.next/server/app/_global-error.html` e não reclama da falta de `app/layout.tsx`. A web já hoje compila `app/page.tsx`
  na raiz sem root layout (`apps/web/app/page.tsx:1-7`, rota `ƒ /`), então o Turbopack não exige root layout no nível de
  `app/` para esses arquivos.

A sonda foi temporária: `mv` do arquivo, build, restauração por `trap` e um build de linha de base em seguida. O
`git status --short` saiu idêntico ao do início, e o arquivo restaurado é byte a byte o original (`diff` vazio).

### 1.3 Como o idioma chega até a tela

O `global-error` substitui o root layout (`apps/web/app/[locale]/layout.tsx:21-60`), e é ele quem monta o
`LocaleProvider` (`:34`). Sem provider:

- `getDictionary()` (`packages/internationalization/client.ts:65-67`) chama `readActiveLocale()` (`:40-45`). No
  navegador, devolve o último idioma que um `LocaleProvider` renderizou (`:53`) ou, sem ele, o cookie `x-locale`
  (`:31-33`). No servidor, lê o `LocaleContext`, que fora do provider dá `null`, e `resolveLocale(null)` cai no idioma
  padrão (`packages/internationalization/utils.ts:27-38`).
- O proxy da web grava `x-locale` com o idioma da URL em toda página que passa pelo `matcher` (`apps/web/proxy.ts:115`;
  `:111` no redirecionamento para o idioma padrão; `matcher` em `:60-62`). É o mesmo mecanismo da app
  (`apps/app/proxy.ts:230`, `:234`), e o `/test` de `leftover-ui-strings` mediu nele `set-cookie: x-locale=en; Path=/`,
  sem `HttpOnly`, lido pelo `document.cookie` na tela de erro (`docs/features/leftover-ui-strings/test/report.md:55`).
- `resolveLocale` sempre devolve um dos três idiomas, então o `|| "pt-br"` de `global-error.tsx:23` nunca é usado.

### 1.4 Objetivos, fora de escopo e corte

**Objetivo.** Quando o root layout da landing quebra em produção, a pessoa vê "Ops, algo deu errado" / "Oops,
something went wrong" / "Ups, algo salió mal", o botão de tentar de novo no mesmo idioma e `<html lang>` com o idioma
da URL.

**Corte de MVP.** Mover o arquivo com `git mv`, alinhar o código à versão da app e um teste de componente. Corte P, só
`apps/web`, sem variável de ambiente, sem dependência, sem `error.code` e sem chave de tradução nova.

**Fora de escopo:**

- Estilo e tema da tela de erro. Ela não importa `styles.css` (quem importa é `apps/web/app/[locale]/layout.tsx:1`) nem
  monta o `DesignSystemProvider` (`:36`), então deve sair com fonte e botão sem estilo, como o `/test` de
  `leftover-ui-strings` mediu na app (`docs/features/leftover-ui-strings/test/report.md:107-110`). Corrigir nas duas
  telas de uma vez toca `apps/app/app/global-error.tsx`, que está no diff sem commit. Fica para depois do merge
  (`specs/BACKLOG.md:407-410`).
- `not-found` e `error` de segmento na web (`specs/BACKLOG.md:424-426`). Pedem decisão sobre o root layout, corte M.
- O caso raro de o root layout quebrar numa navegação no cliente que troca o idioma (risco R1, §6).

### 1.5 Apps, área, modo de produto

- Apps: só `apps/web`. Sem `apps/api`, `apps/app`, `packages/sdk` nem `packages/internationalization`.
- Área do painel: N/A. Modo de produto (`subscription`/`simple`): não muda nada. Assinatura: N/A.
- Genérico × específico: correção de core.

### 1.6 Restrição de arquivos

Nenhum arquivo em comum com o diff sem commit de `leftover-ui-strings` (`git status --short`: os 11 caminhos são
`apps/app/__tests__/passwordPolicyCopy.test.ts`, `apps/app/app/global-error.tsx`, os dois arquivos de `sign-in` da web,
dois de tradução, `specs/BACKLOG.md`, `apps/app/__tests__/globalErrorLocale.test.tsx`,
`apps/web/__tests__/signInSchema.test.ts`, `docs/features/leftover-ui-strings/` e `common/globalError.ts`). O `throw`
temporário do `/test` vai em `apps/web/app/[locale]/layout.tsx`, que também não está no diff. Esta tarefa não edita o
`specs/BACKLOG.md`; quem atualiza a linha do achado é o `/spec --sync`.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhuma rota, nenhum `error.code`, nenhuma entrada em `apiErrors`.

## 5. Front-end

- `apps/web/app/[locale]/global-error.tsx` vira `apps/web/app/global-error.tsx` (`git mv`).
- O componente passa a ser igual ao da app, trocando só a folha do dicionário: `getDictionary()` no corpo,
  `lang={locale}` sem fallback, `dictionary.apps.web.pages.error` com nome descritivo (`globalErrorCopy`, regra 9) e
  sem o `console.error` de desenvolvimento (D2).
- Continua `"use client"`, como o Next exige para `global-error`.
- Dicionário: `apps.web.pages.error` já tem `title` e `retry` nos três idiomas
  (`packages/internationalization/translations/apps/web/pages/error/index.ts:1-14`, registrado em
  `translations/apps/web/pages/index.ts:27`, `:41`, `:55`). O único consumidor é este arquivo.
- Nenhuma rota, hook, `queryKey` ou formulário muda.

### 5.1 i18n e a11y

Nenhuma chave nova. A mudança de a11y é o `lang` do `<html>` passar a existir e a refletir o idioma.

## 6. Autorização, segurança e riscos

- Nada muda em guard, sessão ou impersonação. A tela não mostra `error.message` nem `digest`, então não vaza detalhe
  do servidor (a embutida mostra o `digest`).
- **R1. Idioma anterior numa troca de idioma no cliente.** Se o root layout quebra durante uma navegação no cliente de
  `/en` para `/es`, o `LocaleProvider` não chega a renderizar o novo idioma e `getDictionary()` prefere o último
  renderizado (`client.ts:44`): a tela sai em inglês com a URL em espanhol. É o mesmo comportamento aceito na app (D1 de
  `leftover-ui-strings`). A alternativa (`useParams()` + `getDictionaryForLocale`) está em D1.
- **R2. Pré-render de `/_global-error`.** O build renderiza o componente no servidor, onde `getDictionary()` lê o
  contexto vazio e cai em `pt-br`. A sonda da §1.2 confirmou que o build passa. O HTML gerado é a casca
  `<html id="__next_error__">`; no caminho real a tela é renderizada no cliente.

## 7. Testes

| # | Arquivo | Nível | O que prova |
|---|---|---|---|
| T1 | `apps/web/__tests__/globalErrorLocale.test.tsx` (novo) | componente | Para cada idioma, grava `x-locale=<idioma>` em `document.cookie`, faz `renderToString(<GlobalError error={...} reset={vi.fn()} />)` e confere `lang="<idioma>"`, `title` e `retry` de `apps.web.pages.error`. Um caso sem cookie confere `pt-br` (com `NEXT_PUBLIC_DEFAULT_LOCALE` zerado por `vi.stubEnv`). Molde: `apps/app/__tests__/globalErrorLocale.test.tsx` |

Detalhes do T1:

- A suíte da web roda em `environment: "node"` (`apps/web/vitest.config.mts:10`). O teste precisa de `window` e
  `document.cookie`, então abre com `// @vitest-environment jsdom`, como `apps/web/__tests__/headerMobileMenu.test.tsx:1`.
- `vi.mock("@repo/design-system/lib/fonts", () => ({ fonts: "" }))`, como no molde: `fonts.ts` importa `geist/font`,
  que depende da transformação de fonte do Next.
- O import é `await import("@/app/global-error")`. Isso também fixa o lugar do arquivo: com ele de volta em `[locale]`,
  o import falha e o teste fica vermelho. Prova a mudança sem precisar de build.
- A web compila JSX pelo `esbuild` (`vitest.config.mts:7`), sem o plugin React da app. `renderToString` não depende
  disso.

Nenhum teste com emulador ou app de pé: a infra não é o objeto. O que só o build prova (o arquivo virar o `GlobalError`
da entrada) já foi medido aqui (§1.2) e o `/test` repete no navegador (§8).

Não há teste de clique no botão (`reset()`). O `onClick` não muda; o `/test` confere no navegador.

## 8. O que o `/test` vai percorrer

`global-error` só substitui o overlay em produção, e só aparece se o root layout quebrar. Roteiro:

1. **Linha de base.** Quando o `/test` roda, a mudança já está aplicada, e voltar o arquivo para medir a tela embutida
   no navegador seria mexer no diff. A linha de base é a medição por artefato da §1.2; o `/test` a cita e não a refaz.
2. Inserir `throw new Error("global-error probe")` em `apps/web/app/[locale]/layout.tsx`, logo depois do `Promise.all`
   (`:22-25`). As páginas de `[locale]` já são dinâmicas (`ƒ` no build), então o build não quebra no pré-render.
3. `pnpm --filter web build && pnpm --filter web start` (porta 3001). Conferir no log que o build gera
   `/_global-error` sem erro.
4. Visitar `/pt-br`, `/en` e `/es` com `agent-browser`. Para cada um, registrar: status HTTP (esperado 500 com a casca
   `__next_error__`), cookie `x-locale`, `document.documentElement.lang`, texto do `<h1>` e do botão.
5. Visitar `/` sem cookie: o proxy redireciona para `/pt-br` e grava `x-locale=pt-br`; a tela sai em português.
6. Clicar no botão com o layout ainda quebrado: a tela continua, sem erro novo no console.
7. Remover o `throw` antes de terminar e conferir `git status --short` contra o início.

Tema e viewport: como estilo está fora de escopo, uma captura em escuro e uma a 375 px servem só para registrar a
aparência como observação, não como critério. Idiomas: os três, no passo 4.

Nada aqui depende de infra externa nem de credencial.

## 9. Critérios de aceite (rascunho; o `/test` gera a versão final)

# Critérios de Aceite (Checklist)

- [ ] **A landing usa a própria tela de erro global**
  Com o root layout da landing quebrado em `next build && start`, a tela mostrada é a de `apps/web/app/global-error.tsx`,
  e não a embutida do Next. O texto "Application error: a server-side exception has occurred" não aparece mais. O
  arquivo `apps/web/app/[locale]/global-error.tsx` não existe mais no repositório.

- [ ] **Título e botão no idioma da URL**
  Em `/en`, a tela mostra "Oops, something went wrong" e o botão "Try again"; em `/es`, "Ups, algo salió mal" e
  "Intentar de nuevo"; em `/pt-br`, "Ops, algo deu errado" e "Tentar novamente". O idioma vem do cookie `x-locale` que o
  proxy grava na mesma requisição. Visitar `/` sem cookie leva a `/pt-br` e mostra o texto em português.

- [ ] **`lang` do documento**
  O `<html>` da tela de erro tem `lang` igual ao idioma da URL (`pt-br`, `en` ou `es`). Antes não havia `lang`. Sem
  cookie, o valor é o idioma padrão (`pt-br` quando `NEXT_PUBLIC_DEFAULT_LOCALE` não está definido), nunca vazio.

- [ ] **O botão tenta de novo**
  Clicar no botão chama `reset()`. Com o layout ainda quebrado, a tela continua de pé e o clique não gera erro novo no
  console. Cliques repetidos têm o mesmo efeito.

- [ ] **Nenhum detalhe do erro na tela**
  A tela não mostra `error.message`, stack nem `digest`. A embutida mostrava o `digest` no caso de erro no servidor.

- [ ] **Build e gates**
  `pnpm --filter web build` termina sem erro e gera `/_global-error`, sem exigir `app/layout.tsx` na raiz. `pnpm check`,
  `pnpm --filter web typecheck` e `pnpm --filter web test` passam, com o T1 novo. Nenhum arquivo do diff sem commit de
  `leftover-ui-strings` é alterado.

## 10. Blueprint técnico

### 10.1 Contrato, rota, persistência, env

N/A em todos: sem DTO, sem rota, sem documento, sem variável.

### 10.2 Arquivos afetados

| arquivo | mudança |
|---|---|
| `apps/web/app/[locale]/global-error.tsx` → `apps/web/app/global-error.tsx` | `git mv` e edição abaixo |
| `apps/web/__tests__/globalErrorLocale.test.tsx` | novo (T1) |

### 10.3 Pseudo-diff

`apps/web/app/global-error.tsx` (depois do `git mv`)

```diff
 "use client";

 import { Button } from "@repo/design-system/components/ui/button";
 import { fonts } from "@repo/design-system/lib/fonts";
 import { getDictionary } from "@repo/internationalization/client";
 import type NextError from "next/error";

 type GlobalErrorProperties = {
     readonly error: NextError & { digest?: string };
     readonly reset: () => void;
 };

-const GlobalError = ({ error, reset }: GlobalErrorProperties) => {
-    const { dictionary, locale } = getDictionary();
-    // Log error to console in development
-    if (process.env.NODE_ENV === "development") {
-        console.error("Global error:", error);
-    }
-
-    const copy = dictionary.apps.web.pages.error;
+const GlobalError = ({ reset }: GlobalErrorProperties) => {
+    // This screen replaces the root layout, so no LocaleProvider is mounted: the locale
+    // comes from the last one rendered or from the cookie the proxy writes on each page request.
+    const { dictionary, locale } = getDictionary();
+    const globalErrorCopy = dictionary.apps.web.pages.error;

     return (
-        <html className={fonts} lang={locale || "pt-br"}>
+        <html className={fonts} lang={locale}>
             <body>
-                <h1>{copy.title}</h1>
-                <Button onClick={() => reset()}>{copy.retry}</Button>
+                <h1>{globalErrorCopy.title}</h1>
+                <Button onClick={() => reset()}>{globalErrorCopy.retry}</Button>
             </body>
         </html>
     );
 };

 export default GlobalError;
```

O comentário de duas linhas é o mesmo que o `/review` de `leftover-ui-strings` aprovou na app
(`docs/features/leftover-ui-strings/review/review.md:33-39`). Vale aqui pela mesma razão: a ausência do provider não
é evidente lendo o componente.

`apps/web/__tests__/globalErrorLocale.test.tsx` (novo, esqueleto)

```tsx
// @vitest-environment jsdom
import { globalTranslations } from "@repo/internationalization/translations/global";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@repo/design-system/lib/fonts", () => ({ fonts: "" }));

const { default: GlobalError } = await import("@/app/global-error");

const LOCALES = ["pt-br", "en", "es"] as const;

// setLocaleCookie / clearLocaleCookie e renderGlobalError iguais ao molde da app,
// com os mesmos biome-ignore de noDocumentCookie.

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", ""));
afterEach(() => {
    clearLocaleCookie();
    vi.unstubAllEnvs();
});

describe("landing global error screen", () => {
    it.each(LOCALES)("speaks %s when the locale cookie says so", (locale) => {
        setLocaleCookie(locale);
        const copy = globalTranslations[locale].apps.web.pages.error;
        const html = renderGlobalError();
        expect(html).toContain(`lang="${locale}"`);
        expect(html).toContain(copy.title);
        expect(html).toContain(copy.retry);
    });

    it("falls back to the default locale without a cookie", () => {
        // pt-br, mesmo formato
    });
});
```

### 10.4 Ordem de implementação e de commit

1. `git mv "apps/web/app/[locale]/global-error.tsx" apps/web/app/global-error.tsx`, depois a edição da §10.3. Conferir
   que o Git detecta o rename (`git status` mostra `renamed:`). A edição troca cerca de 10 das 32 linhas, longe do
   limite de 50% de similaridade.
2. T1.
3. `pnpm --filter web typecheck`, `pnpm --filter web test`, `pnpm check`.

Plano de commits (quem decide é o `/review`):

1. `fix(web): render the landing global error screen from the app root` com o rename, a edição e o T1.
2. `docs(features): web-global-error` com `docs/features/web-global-error/`, por último.

Se o usuário juntar esta tarefa com `leftover-ui-strings` numa branch só, os commits continuam separáveis porque não há
arquivo em comum.

### 10.5 Env nova

Nenhuma.

## 11. Perguntas em aberto (decididas pela rodada autônoma)

| # | Pergunta | Opções | Adotada | Por quê |
|---|---|---|---|---|
| D1 | Como a tela descobre o idioma sem `LocaleProvider`? | (a) `getDictionary()` do cliente, como a app; (b) `useParams()` + `getDictionaryForLocale`; (c) `useDictionary()` | **(a)** | É o que o arquivo já usa e o que a app adotou em `leftover-ui-strings` (D1 de lá). A (b) acertaria o caso raro R1, mas troca o padrão e depende de o boundary raiz ficar abaixo do `PathParamsContext`, detalhe interno do Next. A (c) ignora o último idioma renderizado sem ganho aqui |
| D2 | O `console.error` em desenvolvimento fica? | (a) remover; (b) manter | **(a)** | O Next já registra o erro capturado: em dev com componente e boundary, em produção com `console.error(thrownValue)` (`next/dist/client/react-client-callbacks/error-boundary-callbacks.js:58-76`). A app não tem esse log. Manter seria log duplicado e uma diferença entre as duas telas |
| D3 | Mover com `git mv` ou criar arquivo novo e apagar o antigo? | (a) `git mv`; (b) criar e apagar | **(a)** | É a recomendação do BACKLOG (`specs/BACKLOG.md:339`) e preserva o histórico do arquivo. O resultado no diff é o mesmo |
| D4 | Chave de tradução própria para a web? | (a) manter `apps.web.pages.error`; (b) renomear para `globalError` como na app | **(a)** | A chave existe nos três idiomas e só este arquivo a usa. Renomear toca `packages/internationalization/translations/apps/web/pages/index.ts`, sem ganho para quem usa o produto. O BACKLOG diz "o dicionário não muda" (`specs/BACKLOG.md:345`) |
| D5 | Corrigir estilo e tema junto? | (a) não; (b) sim, só na web; (c) sim, nas duas | **(a)** | (c) toca `apps/app/app/global-error.tsx`, que está no diff sem commit. (b) deixaria as duas telas diferentes. O BACKLOG já tem a tarefa das duas para depois do merge (`specs/BACKLOG.md:407-410`) |
| D6 | O plano repete a leitura do loader webpack como prova? | (a) citar o loader; (b) medir nos artefatos do build Turbopack | **(b)** | O build da web é Turbopack (`next/dist/lib/bundler.js:73-76`), então o loader webpack não é o código que roda. A medição da §1.2 confirma a conclusão da auditoria por outro caminho. A linha do achado no BACKLOG (`specs/BACKLOG.md:1403`) cita o loader e diz "nunca é carregado"; o `/spec --sync` pode corrigir para "nunca é renderizado" e citar a medição |

### Pré-requisitos manuais de infra

Nenhum.
