# Plano: copy do cadastro da `apps/app`

Tarefa direta, sem spec. Origem: a recomendação "A próxima" de `specs/BACKLOG.md:421-467` e a metade da app do achado 🟡
da copy do cadastro (`specs/BACKLOG.md:2181`). Rodada autônoma do `/cycle`: as decisões da §13 já vêm com a opção
adotada.

## 0. Fontes lidas e medições feitas nesta análise

| Fonte | O que mostrou |
|-------|---------------|
| `packages/internationalization/translations/apps/app/pages/signUp/index.ts:21`, `:25`, `:46`, `:50`, `:71`, `:75` | `enterWithYourAccount` e `noAccount` com o texto do login nos três idiomas; em es, "Regístrate en tu cuenta para continuar" |
| `.../apps/app/pages/signUp/index.ts:30`, `:55` | `meta.description` en "Sign up to your account" e es "Regístrate en tu cuenta"; pt-br já diz "Crie sua conta" (`:5`) |
| `.../apps/app/pages/signIn/index.ts:71` e `.../apps/web/pages/signIn/index.ts:69` | "No tienes una cuenta? " sem o "¿" de abertura; o "¿Olvidaste tu contraseña?" da mesma folha (`app/.../signIn/index.ts:72`) tem |
| `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:149`, `:228`, `:234` | subtítulo, frase antes do link e o link "Entrar" |
| `apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx:18` e `sign-in/page.tsx:18` | **achado desta análise**: o `generateMetadata` das duas telas lê `dictionary.apps.web.pages.<signUp\|signIn>.meta`, o namespace da landing. As outras telas da app leem o próprio (`forgot-password/page.tsx:17`, `reset-password/page.tsx:21`, `verify-email/page.tsx:27`, `onboarding/page.tsx:29`). Por isso o `meta.description` da folha da app não chega ao `<head>` hoje |
| `git grep -n "enterWithYourAccount\|noAccount" -- . ':!specs' ':!docs'` | consumidores das duas chaves do cadastro da app: só `SignUpFormClient.tsx:149` e `:228`. Nenhum teste, nenhum `apps/e2e`, nenhum tipo à mão (o tipo do dicionário sai do objeto, via `translations/apps/app/pages/index.ts:15`, `:27`, `:39`) |
| `git grep` dos textos atuais em `apps/e2e`, `apps/*/__tests__`, `packages/*/__tests__` | nenhum teste usa "tem uma conta", "have an account", "tienes", "with your account" nem "sua conta para" |
| `packages/internationalization/translations/components/header/index.ts:15`, `:33`, `:51` | a folha do header também tem `noAccount` (es sem "¿"), mas nenhum código lê `components.header.noAccount`. Chave morta, fora do corte (§1.4) |
| Vocabulário existente | não há chave equivalente a "já tem uma conta" em nenhum namespace (`git grep -i "haveAccount\|alreadyHave\|Já tem\|Already have\|Ya tienes"` só acha `apiErrors` sem relação). O par do login (`noAccount` + `enterWithYourAccount`) é o molde do nome |
| `git status --short` | nenhum arquivo deste plano aparece. Os do diff sem commit são de `web-auth-forms` e `global-error-theme` |
| `specs/*.md` `contends_on` | `SignUpFormClient.tsx` está no de `social-sign-in-providers` (`deferred`); os dois `page.tsx` não estão em nenhum. A troca de nome não muda a contagem de linhas do componente, então as âncoras `SignUpFormClient.tsx:114`/`:121` citadas no BACKLOG não andam |
| `packages/internationalization/server.ts:20-22` | `getTranslations` é síncrono por dentro e não lê `headers()`, então o `generateMetadata` roda em Vitest sem mock de `next/headers` |
| `apps/app/__tests__/authPagesRedirect.test.tsx:3-5` | já importa os dois `page.tsx` com `createMetadata` mockado como identidade, o lugar mais barato para provar de qual namespace o metadata vem |

## 1. Contexto

### 1.1 Problema

Quem abre o cadastro da app lê, ao lado do link "Entrar", a pergunta "Não tem uma conta?" ("Don't have an account?",
"¿No tienes una cuenta?"). A pergunta certa nessa tela é "Já tem uma conta?". O subtítulo repete o do login ("Entre com
sua conta para continuar", "Enter with your account to continue") e, em es, sai "Regístrate en tu cuenta para continuar",
que não faz sentido para quem ainda não tem conta. As duas chaves foram copiadas da folha do login, onde nome e texto
combinam. No login em es, a pergunta "No tienes una cuenta?" não tem o "¿" de abertura, nas duas apps.

Está no dicionário, então a regra de ouro 2 está cumprida. O defeito é a copy e o nome das chaves.

### 1.2 Objetivo

A tela de cadastro da app diz, nos três idiomas, o que a página é: um convite para criar conta, e uma pergunta "já tem
conta?" antes do link para entrar. As chaves passam a ter nome que diz o que o texto diz. O login em es ganha o "¿".

### 1.3 Corte de MVP

1. Renomear `signUp.noAccount` para `signUp.alreadyHaveAccount` e `signUp.enterWithYourAccount` para
   `signUp.createYourAccount` na folha da app, com texto novo nos três idiomas.
2. Atualizar os dois consumidores em `SignUpFormClient.tsx`.
3. Corrigir o `meta.description` en e es da mesma folha e fazer os dois `page.tsx` de autenticação da app lerem o
   namespace da própria app, para que a correção chegue ao `<head>` (decisão D3).
4. Pôr o "¿" em `signIn.noAccount` es, nas folhas da app e da web (só o valor).
5. Testes no nível mais barato (§7).

Corrigir só os valores, mantendo `noAccount` e `enterWithYourAccount`, deixaria `noAccount` guardando "Já tem uma conta?"
e `enterWithYourAccount` guardando um convite para criar conta. O BACKLOG já descartou isso como remendo
(`specs/BACKLOG.md:436-438`, `:474`).

### 1.4 Fora de escopo

| Item | Motivo |
|------|--------|
| Metade da landing: `translations/apps/web/pages/signUp/index.ts` (`:16`, `:20`, `:41`, `:45`, `:66`, `:70`) e `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:98`, `:179` | o componente está no diff sem commit de `web-auth-forms` (`git status --short`). Trocar o nome da chave obriga a editar o arquivo, e separar as duas tarefas no commit pediria `git add -p`. Cada app tem namespace e componente próprios, então a metade da app fecha o defeito na app. A landing repete a troca, com os mesmos nomes de chave, depois do merge |
| `meta.description` en/es da folha de cadastro da web (`web/pages/signUp/index.ts:30`, `:55`) | mesma folha da metade da landing; vai junto com ela |
| `components.header.noAccount` (e `googleSignIn`, `orContinueWith` da mesma folha) | sem consumidor; apagar chave morta é outra tarefa. Vira achado 🟢 no BACKLOG pela auditoria |
| Os dois `AuthProvider` aninhados na web | candidata separada no BACKLOG (`:516`) |
| Qualquer mudança de comportamento do formulário | a tarefa é só copy |

### 1.5 Apps e modo de produto

- `packages/internationalization` (três folhas) e `apps/app` (um componente, dois `page.tsx`, testes). A folha
  `web/pages/signIn` muda só um valor; o arquivo da web que a lê (`sign-in-form-client.tsx:147`) não é tocado.
- Área: telas não autenticadas, `(unauthenticated)`. Sem diferença entre comum e admin.
- Modo de produto: no `simple`, o usuário comum se cadastra na landing (`docs/AUTH-SSO.md`), mas a rota `/sign-up` da app
  continua existindo e renderiza a mesma tela. A copy vale para os dois modos.
- Sem plano, sem dependência externa, sem env nova.

### 1.6 Colisão com o working tree

Nenhum dos sete arquivos do plano está em `git status --short` (conferido às 22:29 de 2026-10-21). A branch atual é
`fix/auth-forms-and-global-error-theme`, que leva o diff das outras duas tarefas. Decidir branch e commits é do
`/review`.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo.

## 5. Front-end

### 5.1 Rotas e renderização

Rotas `/[locale]/sign-up` e `/[locale]/sign-in` da app, sem mudança de estrutura. O `SignUpFormClient` segue client
component. O `generateMetadata` dos dois `page.tsx` muda de namespace (`apps.web` para `apps.app`). Os valores de
`meta` da folha de login da app e da web são idênticos hoje (`app/.../signIn/index.ts:3-6`, `:27-30`, `:51-54` contra
`web/.../signIn/index.ts:3-6`, `:27-30`, `:49-52`), então no login a troca não muda o `<head>`. No cadastro, muda en e
es.

### 5.2 Layout

O texto da frase é renderizado num `<span>` seguido de `<Link>` em linhas separadas do JSX (`SignUpFormClient.tsx:227-235`).
O JSX descarta o espaço entre elementos em linhas diferentes, então o espaço final do valor ("Já tem uma conta? ") é o
que separa a pergunta do link. O texto novo mantém o espaço final, como o atual.

"Already have an account? Sign In" é a frase mais longa (33 caracteres contra 30 de "Don't have an account? Sign In").
O bloco é `text-center text-sm` num card `max-w-md p-8`; a 375 px a largura útil é de uns 300 px. Pode quebrar em duas
linhas em es ("¿Ya tienes una cuenta? Iniciar sesión", 37 caracteres, igual ao tamanho do texto atual em es). O `/test`
mede.

### 5.3 Dados, hooks, formulário, tabela

N/A.

### 5.4 i18n e a11y

Chaves na §10.2. O link continua com o nome acessível "Entrar"/"Sign In"/"Iniciar sesión" (`signUp.signIn`, sem
mudança). A pergunta fica fora do link, como hoje.

## 6. Autorização e segurança

N/A. Telas públicas, sem dado e sem chamada nova. Impersonação não se aplica.

## 7. Testes

| Teste | Nível | O que prova |
|-------|-------|-------------|
| `apps/app/__tests__/authPagesCopy.test.ts` (novo) | unitário sobre o dicionário real, molde `passwordPolicyCopy.test.ts` | nos três idiomas: `signUp.alreadyHaveAccount` difere de `signIn.noAccount`; `signUp.createYourAccount` difere de `signIn.enterWithYourAccount`; `signUp.meta.description` da app difere de `signIn.meta.description`; as perguntas antes de link (`app signIn.noAccount`, `web signIn.noAccount`, `app signUp.alreadyHaveAccount`) terminam com espaço; em es, as três começam com "¿". Trava a classe do defeito (copy do login colada no cadastro e o "¿" esquecido) |
| `apps/app/__tests__/authPagesRedirect.test.tsx` (um caso a mais no `describe.each`) | unitário da página, com `createMetadata` já mockado como identidade (`:3-5`) | o `generateMetadata` de cada página devolve a **mesma referência** de `globalTranslations[locale].apps.app.pages.<signIn\|signUp>.meta`, nos três idiomas. A comparação por referência (`toBe`) distingue o namespace mesmo no login, onde os valores da app e da web são iguais |
| `apps/app/__tests__/signUpFormApi.test.tsx` (um caso a mais) | componente, reaproveitando o harness que já renderiza o `SignUpFormClient` (`:73-91`) | a tela mostra `signUp.createYourAccount` e `signUp.alreadyHaveAccount` (o `href` do link já tem caso em `:188-197`). O typecheck prova que a chave existe; este caso prova que o componente lê a chave certa em cada lugar |
| `packages/internationalization/__tests__/parity.test.ts` | já existe | paridade das chaves renomeadas nos três idiomas. Nada a mudar |

Nenhum teste precisa de emulador nem de app de pé.

Comandos: `pnpm --filter app test`, `pnpm --filter @repo/internationalization test`, `pnpm --filter app typecheck`,
`pnpm --filter web typecheck` (a folha da web muda um valor; o tipo não muda, mas a web consome o dicionário).

## 8. O que o `/test` vai percorrer

Sem conta, sem API e sem emulador: as duas telas renderizam deslogado. Basta a `apps/app` (e a `apps/web` para o login
em es) servindo.

| Fluxo | Onde | O que ler |
|-------|------|-----------|
| F1 cadastro da app | `/pt-br/sign-up`, `/en/sign-up`, `/es/sign-up` | título, subtítulo, a frase antes do link e o link; clicar no link leva ao `/<locale>/sign-in` e preserva `?redirect=` quando a URL tiver |
| F2 `<head>` do cadastro da app | mesmas URLs | `document.querySelector('meta[name="description"]').content` e o `og:description` nos três idiomas |
| F3 login da app em es | `/es/sign-in` da app | "¿No tienes una cuenta? " antes de "Registrarse"; `meta description` continua "Inicia sesión en tu cuenta" |
| F4 login da landing em es | `/es/sign-in` da web (3001) | "¿No tienes una cuenta? " antes do link de cadastro |
| F5 regressão do login da app | `/pt-br/sign-in`, `/en/sign-in` | texto igual ao de antes ("Não tem uma conta? Cadastrar", "Don't have an account? Sign Up") |

Combinações: claro e escuro (o texto usa `text-muted-foreground` e `text-primary`, tokens do tema) e 375 px no F1 e no
F3. O que não dá para observar sem infra externa: nada.

Estados: só o normal. O formulário não muda; estados de erro e envio ficam fora.

## 9. Critérios de aceite (rascunho para o `/test`)

```markdown
# Critérios de Aceite (Checklist)

- [ ] **O cadastro da app pergunta se a pessoa já tem conta antes do link para entrar**
  Em `/pt-br/sign-up`, `/en/sign-up` e `/es/sign-up` da app, a frase antes do link é "Já tem uma conta?", "Already have
  an account?" e "¿Ya tienes una cuenta?", seguida do link "Entrar", "Sign In" e "Iniciar sesión", com um espaço entre
  os dois. Nenhum dos três idiomas mostra mais "Não tem uma conta?", "Don't have an account?" ou "¿No tienes una cuenta?"
  nessa tela. Com `?redirect=/pt-br/account` na URL, o link leva a `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount`.

- [ ] **O subtítulo do cadastro convida a criar conta**
  Abaixo do título, a tela mostra "Crie sua conta para começar", "Create your account to get started" e "Crea tu cuenta
  para empezar". O texto do login ("Entre com sua conta para continuar" e equivalentes) não aparece mais no cadastro, e
  "Regístrate en tu cuenta para continuar" sumiu do es. O login da app continua com o subtítulo dele, sem mudança.

- [ ] **A descrição da página de cadastro da app está certa nos três idiomas**
  O `<meta name="description">` do `/sign-up` da app é "Crie sua conta", "Create your account" e "Crea tu cuenta". A
  descrição vem da folha da app, não da landing: o cadastro da landing continua com "Sign up to your account" em en até
  a metade da landing ser feita, e isso não reprova este critério. O título da aba não muda.

- [ ] **O login em es tem o "¿" de abertura nas duas apps**
  Em `/es/sign-in` da app e da landing, a frase antes do link de cadastro é "¿No tienes una cuenta? ", seguida de
  "Registrarse". Em pt-br e en o login não muda: "Não tem uma conta? Cadastrar" e "Don't have an account? Sign Up".
  A descrição da página de login da app continua igual nos três idiomas.

- [ ] **Tema e largura**
  Em claro e escuro, a pergunta usa a cor de texto secundário e o link a cor primária, como antes, com contraste legível
  nos dois. A 375 px, a frase e o link cabem no card sem estourar a borda; se quebrarem em duas linhas, a quebra fica
  entre palavras e o link continua inteiro e clicável.

- [ ] **Testes e gates**
  `pnpm --filter app test` passa com o `authPagesCopy.test.ts` novo e os casos novos em `authPagesRedirect.test.tsx` e
  `signUpFormApi.test.tsx`; `pnpm --filter @repo/internationalization test` passa a paridade sem chave faltando ou
  sobrando; `pnpm --filter app typecheck` e `pnpm --filter web typecheck` saem com exit 0. `git grep` não acha
  `signUp.noAccount` nem `signUp.enterWithYourAccount` em `apps/app`.
```

## 10. Blueprint técnico

### 10.1 Arquivos

| Arquivo | Mudança |
|---------|---------|
| `packages/internationalization/translations/apps/app/pages/signUp/index.ts` | renomeia duas chaves, texto novo nos três idiomas; `meta.description` en/es |
| `packages/internationalization/translations/apps/app/pages/signIn/index.ts:71` | só o valor es de `noAccount` |
| `packages/internationalization/translations/apps/web/pages/signIn/index.ts:69` | só o valor es de `noAccount` |
| `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:149`, `:228` | lê as chaves novas |
| `apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx:18` | `apps.web` para `apps.app` |
| `apps/app/app/[locale]/(unauthenticated)/sign-in/page.tsx:18` | `apps.web` para `apps.app` |
| `apps/app/__tests__/authPagesCopy.test.ts` | novo |
| `apps/app/__tests__/authPagesRedirect.test.tsx` | um caso a mais |
| `apps/app/__tests__/signUpFormApi.test.tsx` | um caso a mais |

### 10.2 i18n

Folha `translations/apps/app/pages/signUp/index.ts`. A ordem das chaves fica onde as antigas estavam.

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `meta.description` | "Crie sua conta" (sem mudança) | "Create your account" | "Crea tu cuenta" |
| `createYourAccount` (era `enterWithYourAccount`) | "Crie sua conta para começar" | "Create your account to get started" | "Crea tu cuenta para empezar" |
| `alreadyHaveAccount` (era `noAccount`) | "Já tem uma conta? " | "Already have an account? " | "¿Ya tienes una cuenta? " |

Folhas `signIn` da app (`:71`) e da web (`:69`): `noAccount` es passa de "No tienes una cuenta? " para
"¿No tienes una cuenta? ".

Pseudo-diff da folha de cadastro (os três blocos seguem o mesmo molde):

```diff
     en: {
         meta: {
             title: "Sign Up",
-            description: "Sign up to your account",
+            description: "Create your account",
         },
 ...
         signUp: "Sign Up",
-        enterWithYourAccount: "Enter with your account to continue",
+        createYourAccount: "Create your account to get started",
         orContinueWith: "Or continue with",
         googleSignIn: "Continue with Google",
         signIn: "Sign In",
-        noAccount: "Don't have an account? ",
+        alreadyHaveAccount: "Already have an account? ",
     },
```

### 10.3 Componente e páginas

```diff
 // SignUpFormClient.tsx
                     <p className="text-muted-foreground text-sm">
-                        {dictionary.apps.app.pages.signUp.enterWithYourAccount}
+                        {dictionary.apps.app.pages.signUp.createYourAccount}
                     </p>
 ...
                     <span className="text-muted-foreground">
-                        {dictionary.apps.app.pages.signUp.noAccount}
+                        {dictionary.apps.app.pages.signUp.alreadyHaveAccount}
                     </span>
```

```diff
 // sign-up/page.tsx
-    return createMetadata(dictionary.apps.web.pages.signUp.meta);
+    return createMetadata(dictionary.apps.app.pages.signUp.meta);

 // sign-in/page.tsx
-    return createMetadata(dictionary.apps.web.pages.signIn.meta);
+    return createMetadata(dictionary.apps.app.pages.signIn.meta);
```

O Biome pode reformatar a linha do `createYourAccount` se passar de 80 colunas; `pnpm fix` resolve. A contagem de linhas
do componente não muda se a linha couber.

### 10.4 Testes (esqueleto)

```ts
// apps/app/__tests__/authPagesCopy.test.ts
import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";

const LOCALES = ["pt-br", "en", "es"] as const;

describe.each(LOCALES)("sign-in and sign-up copy in %s", (locale) => {
    const { app, web } = globalTranslations[locale].apps;
    const signUpCopy = app.pages.signUp;
    const signInCopy = app.pages.signIn;

    it("does not reuse the sign-in copy on the sign-up page", () => {
        expect(signUpCopy.alreadyHaveAccount).not.toBe(signInCopy.noAccount);
        expect(signUpCopy.createYourAccount).not.toBe(signInCopy.enterWithYourAccount);
        expect(signUpCopy.meta.description).not.toBe(signInCopy.meta.description);
    });

    it.each([
        ["app signIn.noAccount", signInCopy.noAccount],
        ["web signIn.noAccount", web.pages.signIn.noAccount],
        ["app signUp.alreadyHaveAccount", signUpCopy.alreadyHaveAccount],
    ])("%s ends with the space before its link", (_key, question) => {
        expect(question.endsWith(" ")).toBe(true);
    });
});

describe("Spanish questions", () => {
    // it.each das três perguntas em es: expect(question.startsWith("¿")).toBe(true)
});
```

```ts
// authPagesRedirect.test.tsx: caso novo dentro do describe.each(pages), com `metaKey` ("signIn" | "signUp") no array
it.each(["pt-br", "en", "es"] as const)("reads the metadata from the app namespace in %s", async (locale) => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale }) });
    expect(metadata).toBe(globalTranslations[locale].apps.app.pages[metaKey].meta);
});
```

O array `pages` (`:35-38`) ganha `generateMetadata` e `metaKey` de cada página; os imports dinâmicos (`:19-24`) passam a
desestruturar `generateMetadata` também.

```ts
// signUpFormApi.test.tsx: caso novo
it("invites to create an account and asks whether the visitor already has one", () => {
    renderForm();
    expect(screen.getByText(signUpCopy.createYourAccount)).toBeTruthy();
    expect(screen.getByText(signUpCopy.alreadyHaveAccount.trim())).toBeTruthy();
});
```

O `getByText` normaliza espaço nas pontas, por isso o `trim()` na busca. O `href` do link já é coberto pelo caso
"hands the destination it was given to the sign-in link" (`signUpFormApi.test.tsx:188-197`), em `pt-br`.

### 10.5 Contrato, rota, persistência, env

N/A. Sem env nova, nada para o fork configurar.

### 10.6 Ordem de implementação e commits

1. `packages/internationalization`: as três folhas.
2. `apps/app`: `SignUpFormClient.tsx` e os dois `page.tsx`, com os três testes.

O typecheck da app quebra entre os passos 1 e 2 se forem commits separados (a chave antiga some no passo 1). A regra
de ordem do repo põe o i18n por último; seguir à risca deixaria o commit da app apontando para chave que ainda não
existe. Sugestão para o `/review`: um commit `fix(internationalization)` com as folhas e logo depois o `fix(app)`, e
aceitar que o primeiro sozinho não compila a app, ou juntar os dois num commit misto, com o motivo na mensagem
(`cycle-policy` §6). Decisão do `/review` (D5).

3. `docs(features): app-sign-up-copy`, por último.

## 11. Riscos

| Risco | Efeito | Mitigação |
|-------|--------|-----------|
| Trocar o namespace do metadata muda o `<head>` do login | nenhum, valores idênticos hoje (§5.1) | o teste por referência prova a origem; o F3 lê o `meta` |
| Fork que já customizou `apps.web.pages.signUp.meta` esperando que a app usasse | a app passa a mostrar o `meta` da própria folha | é o comportamento das outras telas da app; registrar no handoff |
| Biome reformata a linha do componente e desloca âncoras do BACKLOG | âncoras de `SignUpFormClient.tsx` andam uma linha | a auditoria do `/spec --sync` remede |

## 12. Pré-requisitos manuais de infra

Nenhum.

## 13. Decisões tomadas sem perguntar

| # | Pergunta | Opções | Adotada | Por quê |
|---|----------|--------|---------|---------|
| D1 | Nome da chave da pergunta | `haveAccount` · `alreadyHaveAccount` | `alreadyHaveAccount` | não há chave equivalente no repo para reaproveitar; o nome repete o texto ("Already have an account?") e faz par com `noAccount` do login. A landing usa o mesmo nome depois |
| D2 | Nome e texto do subtítulo | `createYourAccount` · `signUpToContinue` · manter `enterWithYourAccount` com texto novo | `createYourAccount`, "Crie sua conta para começar" / "Create your account to get started" / "Crea tu cuenta para empezar" | o nome descreve o texto, no molde do `enterWithYourAccount` do login; manter o nome antigo é o remendo que o BACKLOG descartou |
| D3 | O `meta.description` en/es do cadastro da app entra? | só os valores · valores e trocar o namespace dos `page.tsx` · fora | valores e os dois `page.tsx` passam a ler `apps.app` | o `page.tsx:18` lê a folha da web, então corrigir só o valor não muda nada que alguém veja. As outras quatro telas da app já leem o próprio namespace. O login entra pela mesma raiz (`cycle-policy` §3), sem efeito visível, e nenhum dos dois arquivos está no diff nem em `contends_on` |
| D4 | Teste de componente além do teste do dicionário | sim, no harness do `signUpFormApi.test.tsx` · só dicionário | sim, um caso | custo baixo, o harness já existe, e é o único teste que pega o componente lendo a chave trocada |
| D5 | Commits do i18n e da app separados ou juntos | separados (o primeiro não compila a app) · um misto | fica para o `/review` | a ordem do repo e a granularidade por pacote puxam para lados opostos; quem monta o plano de commits é o `/review` |
| D6 | Apagar `components.header.noAccount` (morta, es sem "¿") | apagar agora · corrigir só o "¿" · fora | fora | sem consumidor, ninguém vê; apagar chave morta é mudança fora da tarefa. Vira achado 🟢 no BACKLOG |
