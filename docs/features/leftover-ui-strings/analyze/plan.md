# Plano: strings de UI soltas que sobram (login da landing e tela de erro global da app)

Tarefa direta, sem spec. É a recomendação #1 da auditoria de 2026-10-21 em `specs/BACKLOG.md:257-287` (regra de ouro
2). Rodada autônoma do `/cycle`: as decisões que dependeriam do usuário estão na §11, cada uma com a opção adotada.

Âncoras conferidas em 2026-10-21 contra o working tree (branch `guilhermebittelbrunn/cycle-command-v7`, HEAD
`d19e6fd`). Nenhum dos arquivos de código citados tem mudança local.

## 1. Contexto

### 1.1 Resumo

Dois textos de interface ainda não passam pelo dicionário em telas que a pessoa vê. O login da landing mostra as
mensagens de validação em português em `/en/sign-in` e `/es/sign-in`, e a tela de erro global da app aparece sempre
em inglês, com `lang="en"`. A tarefa troca os dois pelo dicionário, copiando padrões que o repositório já usa.

### 1.2 Os dois achados, relidos no código

| # | Achado | Evidência |
|---|---|---|
| 1 | Validação do login da landing fixa em pt-br | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts:5` (`"Email inválido"`) e `:10` (`"A senha deve ter pelo menos 6 caracteres"`); o schema é uma constante de módulo (`:4`) consumida em `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx:29` (`zodResolver(signInSchema)`). O dicionário `packages/internationalization/translations/apps/web/pages/signIn/index.ts:1-59` não tem bloco `validation` em nenhum dos três idiomas |
| 2 | Tela de erro global da app fixa em inglês | `apps/app/app/global-error.tsx:13` (`lang="en"`), `:15` (`"Oops, something went wrong"`), `:16` (`"Try again"`) |

### 1.3 Moldes que já existem

- **Schema montado a partir do dicionário.** O cadastro da mesma landing usa
  `buildSignUpSchema(dictionary)` (`apps/web/app/[locale]/sign-up/validations/signUp.ts:7-24`), consumido com
  `useMemo(() => buildSignUpSchema(dictionary), [dictionary])` em
  `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:42`. O login da app faz o mesmo com
  `buildSignInSchema` (`apps/app/app/[locale]/(unauthenticated)/sign-in/validations/signInSchema.ts:7-16`), lendo
  `dictionary.apps.app.pages.signIn.validation` (`packages/internationalization/translations/apps/app/pages/signIn/index.ts:14-17`,
  `:38-41`, `:62-65`). O texto da app é o que a landing precisa, palavra por palavra.
- **Tela de erro global traduzida.** `apps/web/app/[locale]/global-error.tsx:13-29` usa `getDictionary()` de
  `@repo/internationalization/client` e lê `dictionary.apps.web.pages.error` (`title`, `retry`, em
  `packages/internationalization/translations/apps/web/pages/error/index.ts:1-14`).

### 1.4 O molde da web é inerte, e o arquivo da app é o que vale

Lido na fonte do Next 16.0.0 instalado (`node_modules/.pnpm/next@16.0.0_.../node_modules/next`):

- `dist/build/webpack/loaders/next-app-loader/index.js:151` define `isRootLayer = segments.length === 0`, e
  `:231-238` só resolve `global-error` em `${appDirPrefix}/global-error`, ou seja, na raiz de `app/`. Sem arquivo ali,
  o Next usa o embutido (`:99`, `defaultGlobalErrorPath`).
- Consequência: `apps/web/app/[locale]/global-error.tsx` **não é carregado pelo Next**. A web não tem
  `app/global-error.tsx` (a raiz de `apps/web/app/` só tem `[locale]`, `api`, `page.tsx`, `robots.ts`, `sitemap.ts`).
  Isso responde, pela leitura da fonte, o "não medido" do achado em `specs/BACKLOG.md:1311`. Não é desta tarefa
  corrigir (§1.5), mas pesa na decisão D2 da §11.
- `apps/app/app/global-error.tsx` está na raiz de `app/` e é o `global-error` ativo da app.

Como o idioma chega até ali, já que o `global-error` substitui o root layout (`apps/app/app/layout.tsx:65-101`), e é
o root layout que monta o `LocaleProvider` (`:79`):

- `getDictionary()` (`packages/internationalization/client.ts:65-67`) chama `readActiveLocale()` (`:40-45`). No
  navegador, devolve `lastRenderedBrowserLocale` (o último idioma que o `LocaleProvider` renderizou, `:52-54`) ou, sem
  ele, o cookie `x-locale` (`:31-33`). No servidor, lê o `LocaleContext`, que fora do provider dá `null`, e
  `resolveLocale(null)` cai no idioma padrão (`packages/internationalization/utils.ts:27-38`).
- O proxy da app grava `x-locale` com o segmento de idioma da URL em toda requisição que passa por ele
  (`apps/app/proxy.ts:234`; `:230` no redirecionamento para o idioma padrão). Quando o root layout quebra no primeiro
  render, o `LocaleProvider` nunca rodou e o cookie da mesma requisição traz o idioma da URL.
- Em produção, o Next renderiza o `global-error` no cliente, dentro do `RootErrorBoundary`
  (`dist/client/components/app-router.js:420`), que fica abaixo do `PathParamsContext.Provider` (`:434`). Então
  `useParams()` também funcionaria ali. É a alternativa registrada em D1.
- O Next 16 também pré-renderiza `/_global-error` no build (`dist/build/index.js:771`, `:1681`). Nesse render de
  servidor, `getDictionary()` lê o contexto vazio e devolve o idioma padrão, sem erro. Esse HTML estático só vira
  `500.html` em export estático (`dist/build/index.js:2280-2295`), que a app não usa.

### 1.5 Objetivos, fora de escopo e corte

**Objetivos**

1. O login da landing (`/<locale>/sign-in`) mostra as mensagens de validação de e-mail e senha no idioma da URL.
2. A tela de erro global da app mostra título e botão no idioma da pessoa e publica `lang` com esse idioma.

**Corte de MVP**: as duas trocas acima, as chaves nos três idiomas e os testes da §7. Corte P, sem variável de
ambiente, sem dependência, sem `error.code` novo.

**Fora de escopo** (decidido pelo orquestrador e pela recomendação do BACKLOG, `specs/BACKLOG.md:284-287`):

- A mensagem padrão em pt-br de `handleClientError` (`packages/shared/utils/helpers/handleClientError.ts:19`), que
  exigiria mudar 35 chamadores ou o contrato do helper.
- A `apps/web` sem `not-found`, `error` de segmento e `global-error` efetivo (`specs/BACKLOG.md:1311`). A §1.4 deixa
  isso medido por leitura; quem fecha é uma tarefa própria, porque criar `app/global-error.tsx` ou root layout na web
  mexe no mesmo lugar que o idioma do servidor usa.
- A validação nativa do navegador no login da landing. O `<form>` não tem `noValidate`
  (`sign-in-form-client.tsx:61-68`) e o campo é `type="email"` (`:77`), então um valor sem `@` dispara o balão do
  navegador, no idioma do navegador, antes do Zod. O formulário de contato da web já usa `noValidate`
  (`apps/web/app/[locale]/contact/components/contact-form-client.tsx:103`), mas mudar isso altera comportamento além
  da tradução. Fica como observação para o `/spec --sync`.
- Estilo e tema da tela de erro global. O `global-error` não importa `styles.css` (quem importa é
  `apps/app/app/layout.tsx:2`) nem aplica a classe de tema. Não medido; fica como observação.
- Os demais achados do login da landing (`specs/BACKLOG.md:1675`: sem destino depois de entrar, sem "esqueci a
  senha").

### 1.6 Apps, área, modo de produto

- Apps: `apps/web` (login da landing), `apps/app` (global-error), `packages/internationalization` (chaves). Sem
  `apps/api`, sem `packages/sdk`.
- Área do painel: N/A. O `global-error` fica acima de qualquer grupo (`(common)`, `(admin)`, `(unauthenticated)`).
- Modo de produto: não muda nada entre `subscription` e `simple`. O `/sign-in` da landing existe nos dois modos
  (`apps/web/app/[locale]/sign-in/page.tsx:15-17`, sem condição de modo).
- Assinatura: N/A. Genérico × específico: correção de core, nada de domínio.

## 2. Dados (Firestore)

N/A. Nenhuma coleção, campo, consulta ou regra muda.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhuma rota e nenhum `error.code` novo, portanto nenhuma entrada em `apiErrors`.

## 5. Front-end

### 5.1 `apps/web`: login da landing

- `signInSchema.ts` passa de constante para factory `buildSignInSchema(dictionary)`, lendo
  `dictionary.apps.web.pages.signIn.validation`. O tipo `SignInFormValues` passa a ser
  `z.infer<ReturnType<typeof buildSignInSchema>>`, como em `signUp.ts:26`.
- O mínimo continua `EXISTING_PASSWORD_MIN_LENGTH` (6), de `packages/shared/utils/helpers/passwordPolicy.ts:10`: o
  login aceita senhas antigas de 6 ou 7 caracteres (`:5-9`). Não trocar por `PASSWORD_MIN_LENGTH`.
- `sign-in-form-client.tsx`: `getDictionary()` já é chamado no corpo (`:23`). Montar o schema com
  `useMemo(() => buildSignInSchema(dictionary), [dictionary])` e passar ao `zodResolver`, igual a
  `sign-up-form-client.tsx:42-45`. O `useMemo` recebe o dicionário já lido no render, o que respeita o aviso de
  `client.ts:59-63` (não ler contexto dentro do callback).
- `sign-in-form.tsx` e `page.tsx` não mudam.

### 5.2 `apps/app`: tela de erro global

- `global-error.tsx` chama `getDictionary()` no corpo do componente (D1), lê
  `dictionary.apps.app.pages.common.globalError` (D2) e usa `lang={locale}`. `locale` já vem resolvido para um dos
  três idiomas (`client.ts:21-28`), então o `|| "pt-br"` do molde da web não é necessário.
- Continua `"use client"`, continua sem usar a prop `error` e continua com `<html className={fonts}>`. Sem
  `console.error` (o molde da web tem um em `:16-18`; a app hoje não loga e a instrumentação de erro é outro assunto).

### 5.3 Estados

N/A além do descrito: não há lista, carregamento nem formulário novo.

### 5.4 i18n e a11y

Chaves novas, mesma estrutura nos três idiomas:

- `apps.web.pages.signIn.validation.emailInvalid` e `.passwordMin`, com o mesmo texto de
  `apps.app.pages.signIn.validation`.
- `apps.app.pages.common.globalError.title` e `.retry`, com o mesmo texto de `apps.web.pages.error`.

A11y: `lang` correto no `<html>` da tela de erro é a correção de acessibilidade desta tarefa (leitor de tela lê o
texto com a pronúncia do idioma certo).

## 6. Autorização e segurança

N/A. Nada muda em guard, sessão, impersonação ou dados. A tela de erro global aparece igual para qualquer papel; o
idioma vem do cookie `x-locale`, que não carrega dado sensível.

## 7. Testes (Vitest)

Todos no nível de unidade ou componente, sem emulador e sem app de pé.

| # | Arquivo | Nível | O que prova |
|---|---|---|---|
| T1 | `apps/web/__tests__/signInSchema.test.ts` (novo) | schema | `describe.each(["pt-br","en","es"])`, no molde de `apps/web/__tests__/signUpSchema.test.ts`: aceita e-mail válido com senha de exatamente `EXISTING_PASSWORD_MIN_LENGTH`; recusa senha com um caractere a menos e devolve `validation.passwordMin` do idioma; recusa e-mail inválido (`"nope"` e `"qa@example"`, que passa na validação nativa do navegador mas não no Zod) com `validation.emailInvalid` do idioma; e recusa e-mail vazio com a mesma mensagem |
| T2 | `apps/app/__tests__/passwordPolicyCopy.test.ts` (editado) | cópia | Acrescenta `"web signIn.passwordMin": apps.web.pages.signIn.validation.passwordMin` a `existingPasswordMessages` (`:32-41`). Garante que o texto cita 6 e não cita 8, como já se faz com `web signUp.passwordMin` (`:26`) |
| T3 | `apps/app/__tests__/globalErrorLocale.test.tsx` (novo) | componente | Para cada idioma: grava `x-locale=<idioma>` em `document.cookie` (como `billingInsightsSection.test.tsx:14-17`), faz `renderToString(<GlobalError error={...} reset={vi.fn()} />)` e confere `lang="<idioma>"`, o `title` e o `retry` do dicionário. Um caso sem cookie confere o idioma padrão (`pt-br`). `vi.mock("@repo/design-system/lib/fonts", () => ({ fonts: "" }))`, porque `fonts.ts` importa `geist/font`, que depende da transformação de fonte do Next e nenhum teste do repositório carrega. Usar `renderToString` em vez de `render` do Testing Library evita montar `<html>` dentro de uma `<div>`. Como o jsdom tem `window`, o `getDictionary()` segue o ramo do navegador e lê o cookie |
| T4 | `packages/internationalization/__tests__/parity.test.ts` (existente) | paridade | Já cobre as chaves novas; nada a escrever |

Não planejo teste do `sign-in-form-client.tsx`: a troca é de duas linhas, o `typecheck` cobre a assinatura e a
passada de navegador do `/test` cobre a ligação do schema ao formulário.

Comandos: `pnpm --filter web test`, `pnpm --filter app test`, `pnpm --filter @repo/internationalization test`,
`pnpm --filter web typecheck`, `pnpm --filter app typecheck`, `pnpm check`.

## 8. O que o `/test` vai percorrer

**F1. Login da landing, três idiomas.** `apps/web` em `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in`, **sem
sessão** (com usuário logado o formulário devolve `null`, `sign-in-form-client.tsx:44-46`).

- Enviar o formulário vazio: aparecem as duas mensagens (`emailInvalid` e `passwordMin`) no idioma da URL. Campo
  vazio com `type="email"` e sem `required` não aciona a validação nativa.
- Digitar `qa@example` e senha `12345`: as mesmas duas mensagens. `qa@example` passa na validação nativa e é
  recusado pelo Zod.
- Não usar valor sem `@`: o balão nativo do navegador aparece antes, no idioma do navegador (fora de escopo, §1.5).
- Claro, escuro e 375 px em pelo menos um idioma; nos outros dois, desktop claro basta, porque só o texto muda.
- Registrar no `report.md` o texto exato de cada mensagem por idioma.

**F2. Tela de erro global da app.** Não se dispara pelo navegador sem forçar exceção no root layout
(`apps/app/app/layout.tsx`). A prova é o T3. Se o `/test` quiser montar o repro, a forma é um `throw` temporário no
root layout com `pnpm --filter app build && start` (o `global-error` só substitui o overlay de desenvolvimento em
produção), visitando `/en` e `/es`, e o `throw` sai antes de terminar (`.claude/cycle-policy.md` §8). Sem repro, F2
fica 🔒 com o T3 como evidência, conforme o próprio BACKLOG previu (`specs/BACKLOG.md:278-280`).

Nada aqui depende de infra externa. O F1 precisa da `apps/web` de pé; o login em si não é exercitado (só a
validação no cliente), então o emulador de Auth não é necessário.

## 9. Critérios de aceite (rascunho; o `/test` gera a versão final)

# Critérios de Aceite (Checklist)

- [ ] **Validação do login da landing no idioma da URL**
  Em `/en/sign-in`, enviar o formulário vazio mostra "Invalid email" e "Password must be at least 6 characters"; em
  `/es/sign-in`, "Email no válido" e "La contraseña debe tener al menos 6 caracteres"; em `/pt-br/sign-in`, "Email
  inválido" e "A senha deve ter pelo menos 6 caracteres". Antes da mudança, os três idiomas mostravam o texto em
  português. O mesmo vale para `qa@example` com senha de 5 caracteres.

- [ ] **Mínimo de senha do login continua 6**
  Uma senha de 6 caracteres passa na validação do login da landing e uma de 5 é recusada, nos três idiomas. O login
  aceita contas antigas criadas antes da política de 8 caracteres, então a mensagem cita 6 e não 8 (T2 garante isso
  no texto de cada idioma).

- [ ] **Paridade de chaves**
  `apps.web.pages.signIn.validation` e `apps.app.pages.common.globalError` existem com as mesmas chaves em pt-br, en
  e es, e o teste de paridade de `@repo/internationalization` passa. Nenhuma chave existente é renomeada ou removida.

- [ ] **Tela de erro global da app no idioma da pessoa**
  Com o cookie `x-locale` em `en`, a tela mostra "Oops, something went wrong", o botão "Try again" e `<html
  lang="en">`; em `es`, "Ups, algo salió mal", "Intentar de nuevo" e `lang="es"`; em `pt-br`, "Ops, algo deu
  errado", "Tentar novamente" e `lang="pt-br"`. Sem cookie, cai no idioma padrão (`pt-br` quando
  `NEXT_PUBLIC_DEFAULT_LOCALE` não está definido). Antes, aparecia sempre o texto em inglês com `lang="en"`.

- [ ] **O botão da tela de erro continua tentando de novo**
  O clique no botão chama `reset()`, como antes. A tarefa só troca o texto; a ligação do `onClick` não muda.

- [ ] **Tema e tamanho de tela no login da landing**
  As mensagens de erro do login da landing ficam legíveis no tema claro, no escuro e a 375 px, sem quebrar o layout
  do cartão. Mensagens mais longas em espanhol não podem estourar a largura do formulário.

- [ ] **Gates estáticos e build**
  `pnpm check`, `typecheck` de `web` e `app` e `pnpm test` da raiz passam. O build da app continua pré-renderizando
  `/_global-error` sem erro (o `getDictionary()` no servidor cai no idioma padrão).

## 10. Blueprint técnico

### 10.1 Contrato, rota, persistência, env

N/A em todos: sem DTO, sem rota, sem documento, sem variável.

### 10.2 Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `apps/web/app/[locale]/sign-in/validations/signInSchema.ts` | constante vira `buildSignInSchema(dictionary)` |
| `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx` | `useMemo` + `buildSignInSchema` |
| `apps/web/__tests__/signInSchema.test.ts` | novo (T1) |
| `apps/app/app/global-error.tsx` | `getDictionary()`, `lang={locale}`, texto do dicionário |
| `apps/app/__tests__/globalErrorLocale.test.tsx` | novo (T3) |
| `apps/app/__tests__/passwordPolicyCopy.test.ts` | uma entrada a mais (T2) |
| `packages/internationalization/translations/apps/web/pages/signIn/index.ts` | bloco `validation` nos três idiomas |
| `packages/internationalization/translations/apps/app/pages/common/globalError.ts` | novo |
| `packages/internationalization/translations/apps/app/pages/common/index.ts` | registra `globalError` nos três idiomas |

### 10.3 Pseudo-diffs

`apps/web/app/[locale]/sign-in/validations/signInSchema.ts`

```ts
import type { globalTranslations } from "@repo/internationalization/translations/global";
import { EXISTING_PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export function buildSignInSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.web.pages.signIn.validation;

    return z.object({
        email: z.string().email(validation.emailInvalid),
        password: z
            .string()
            .min(EXISTING_PASSWORD_MIN_LENGTH, validation.passwordMin),
    });
}

export type SignInFormValues = z.infer<ReturnType<typeof buildSignInSchema>>;
```

`apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`

```diff
+import { useMemo } from "react";
 import {
+    buildSignInSchema,
     type SignInFormValues,
-    signInSchema,
 } from "../validations/signInSchema";
 ...
     const isLoading = signIn.isPending || signInWithGoogle.isPending;

+    const schema = useMemo(() => buildSignInSchema(dictionary), [dictionary]);
+
     const form = useForm<SignInFormValues>({
-        resolver: zodResolver(signInSchema),
+        resolver: zodResolver(schema),
```

`apps/app/app/global-error.tsx`

```tsx
"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDictionary } from "@repo/internationalization/client";
import type NextError from "next/error";

type GlobalErrorProperties = {
    readonly error: NextError & { digest?: string };
    readonly reset: () => void;
};

const GlobalError = ({ reset }: GlobalErrorProperties) => {
    const { dictionary, locale } = getDictionary();
    const globalErrorCopy = dictionary.apps.app.pages.common.globalError;

    return (
        <html className={fonts} lang={locale}>
            <body>
                <h1>{globalErrorCopy.title}</h1>
                <Button onClick={() => reset()}>{globalErrorCopy.retry}</Button>
            </body>
        </html>
    );
};

export default GlobalError;
```

Se o `desenvolvedor` achar que o porquê do `getDictionary()` sem provider não é evidente, cabe um comentário de uma
linha com a regra autocontida (por exemplo: "This replaces the root layout, so no LocaleProvider is mounted and the
locale comes from the cookie the proxy writes on every request."). Sem citar plano nem etapa
(`.claude/rules/code-comments.md`).

`packages/internationalization/translations/apps/web/pages/signIn/index.ts`, em cada idioma, depois de `form`:

```ts
// pt-br
validation: {
    emailInvalid: "Email inválido",
    passwordMin: "A senha deve ter pelo menos 6 caracteres",
},
// en
validation: {
    emailInvalid: "Invalid email",
    passwordMin: "Password must be at least 6 characters",
},
// es
validation: {
    emailInvalid: "Email no válido",
    passwordMin: "La contraseña debe tener al menos 6 caracteres",
},
```

`packages/internationalization/translations/apps/app/pages/common/globalError.ts` (novo, no molde de `notFound.ts`)

```ts
export const globalErrorPageTranslations = {
    "pt-br": {
        title: "Ops, algo deu errado",
        retry: "Tentar novamente",
    },
    en: {
        title: "Oops, something went wrong",
        retry: "Try again",
    },
    es: {
        title: "Ups, algo salió mal",
        retry: "Intentar de nuevo",
    },
};
```

`packages/internationalization/translations/apps/app/pages/common/index.ts`

```diff
+import { globalErrorPageTranslations } from "./globalError";
 ...
     "pt-br": {
         routes: commonRoutesTranslations["pt-br"],
         notFound: notFoundPageTranslations["pt-br"],
+        globalError: globalErrorPageTranslations["pt-br"],
 ...
     en: {
         notFound: notFoundPageTranslations.en,
+        globalError: globalErrorPageTranslations.en,
 ...
     es: {
         notFound: notFoundPageTranslations.es,
+        globalError: globalErrorPageTranslations.es,
```

`apps/app/__tests__/passwordPolicyCopy.test.ts`

```diff
     return {
         "app signIn.passwordMin": apps.app.pages.signIn.validation.passwordMin,
+        "web signIn.passwordMin": apps.web.pages.signIn.validation.passwordMin,
```

### 10.4 Ordem de implementação e plano de commits sugerido

Implementar na ordem: i18n primeiro (as chaves precisam existir para o `typecheck`), depois web, depois app. Os
commits seguem a ordem do repositório (`.claude/rules/git-commits.md`), que põe i18n por último; a branch e o
plano final são do `revisor-codigo`.

1. `feat(web): build the sign-in schema from the dictionary`: `signInSchema.ts`, `sign-in-form-client.tsx`,
   `apps/web/__tests__/signInSchema.test.ts`.
2. `feat(app): show the global error screen in the visitor's language`: `global-error.tsx`,
   `apps/app/__tests__/globalErrorLocale.test.tsx`.
3. `test(app): pin the web sign-in password copy to the existing-password minimum`: `passwordPolicyCopy.test.ts`.
4. `feat(internationalization): add web sign-in validation and app global error copy`: `signIn/index.ts`,
   `common/globalError.ts`, `common/index.ts`.
5. `docs(features): leftover-ui-strings`.

Os commits 1 a 3 não passam no `typecheck` isolados, porque as chaves só chegam no 4. É a consequência conhecida da
ordem SDK → API → app → i18n do repositório.

### 10.5 Env e configuração

Nenhuma. Um fork não precisa configurar nada; se mudar o texto, mexe só nos arquivos de tradução.

## 11. Perguntas em aberto (decididas sem perguntar)

| # | Pergunta | Opções | Adotada | Por quê |
|---|---|---|---|---|
| D1 | Como a tela de erro global da app descobre o idioma, se ela substitui o root layout e o `LocaleProvider` não está montado? | (a) `getDictionary()` do cliente, como o molde; (b) `useParams()` + `getDictionaryForLocale(params.locale)`, como `DocumentLangSync.tsx:16-23`; (c) `useDictionary()` | **(a)** | É o que o BACKLOG aponta como molde (`specs/BACKLOG.md:271-272`) e o padrão do repositório. Funciona nos dois caminhos: no navegador lê o último idioma renderizado ou o cookie que o proxy grava com o idioma da URL em toda requisição (`proxy.ts:234`); no pré-render do build cai no padrão sem erro. A opção (b) seria mais exata num caso raro (o root layout quebrar durante uma navegação no cliente para outro idioma, quando `lastRenderedBrowserLocale` ainda guarda o idioma anterior), mas troca o molde por uma API diferente e depende de o `RootErrorBoundary` ficar abaixo do `PathParamsContext` (`app-router.js:420`, `:434`), detalhe interno do Next. A (c) ignora o último idioma renderizado e só lê o cookie, sem ganho aqui |
| D2 | A app reaproveita `apps.web.pages.error` ou ganha chave própria? | (a) reaproveitar, zero chave nova; (b) `apps.app.pages.common.globalError` | **(b)** | O padrão vigente para a tela de raiz equivalente da app, o 404, é chave própria (`apps.app.pages.common.notFound`, lida em `NotFoundPage.tsx:17`). A app só lê chave da web para metadados de login e cadastro (`sign-in/page.tsx:18`, `sign-up/page.tsx:18`). E o único consumidor de `apps.web.pages.error` é um arquivo que o Next não carrega (§1.4): quem limpar a web amanhã apaga a chave e quebra a app. O custo de (b) são seis strings |
| D3 | Nome da folha nova | `globalError` × `error` | **`globalError`** | A app não tem `error.tsx` de segmento hoje; `error` ficaria ambíguo quando um aparecer |
| D4 | Texto de `apps.web.pages.signIn.validation` | igual ao login da app × redação nova | **igual ao login da app** | Mesma regra, mesma tela em outro app; a cópia literal mantém a mensagem consistente e o T2 garante o "6" |
| D5 | Adicionar `noValidate` ao formulário de login da landing? | sim × não | **não** | Muda comportamento além da tradução. Fica como observação para o `/spec --sync` (§1.5) |

## 12. Riscos a medir

- **R1. Cookie `x-locale` ilegível no cliente.** O T3 e o `getDictionary()` assumem que o cookie é legível por
  `document.cookie`. O proxy grava com `cookieStore.set("x-locale", ...)` sem opções (`proxy.ts:234`), e outros
  testes já dependem dessa leitura (`billingInsightsSection.test.tsx:13-17`). O `/test` pode conferir com
  `document.cookie` numa página da app.
- **R2. Ordem dos commits.** Commits 1 a 3 isolados não passam no `typecheck` (§10.4). Não afeta o PR, que entra
  inteiro.
- **R3. Repro do F2.** Montar o `throw` no root layout exige build de produção e remoção antes do fim. Se não for
  montado, o F2 fica 🔒 e não reprova.

## 13. Pré-requisitos manuais de infra

Nenhum. Sem variável de ambiente, provedor, índice, regra do Firestore ou webhook.
