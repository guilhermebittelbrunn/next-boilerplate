# Plano: copy do cadastro da landing e "as senhas não coincidem"

Tarefa direta, sem spec. Origem: a recomendação "A próxima" de `specs/BACKLOG.md:287-320`, o achado 🟡 da copy do
cadastro da landing (`specs/BACKLOG.md:1396`) e o 🟢 das duas formas de "as senhas não coincidem" em pt-br
(`specs/BACKLOG.md:1585`). Rodada autônoma do `/cycle`, empilhada sobre a branch `fix/app-auth-forms`: as decisões da
§13 já vêm com a opção adotada.

## 0. Fontes lidas e medições feitas nesta análise

Todas as âncoras abaixo foram reconferidas no `HEAD` `7348247` em 2026-10-29.

| Fonte | O que mostrou |
|-------|---------------|
| `packages/internationalization/translations/apps/web/pages/signUp/index.ts:16`, `:41`, `:66` | `enterWithYourAccount` com o subtítulo do login: "Entre com sua conta para continuar", "Enter with your account to continue" e, em es, "Regístrate en tu cuenta para continuar" |
| `.../apps/web/pages/signUp/index.ts:20`, `:45`, `:70` | `noAccount`: "Não tem uma conta? ", "Don't have an account? ", "¿No tienes una cuenta? ". O "¿" do es já está lá (a PR #55 corrigiu só o login) |
| `.../apps/web/pages/signUp/index.ts:30`, `:55` | `meta.description` en "Sign up to your account" e es "Regístrate en tu cuenta"; pt-br já diz "Crie sua conta" (`:5`) |
| `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:98`, `:179`, `:185` | subtítulo, pergunta antes do link e o link `signUp.signIn` ("Entrar") |
| `apps/web/app/[locale]/sign-up/page.tsx:9` | o `generateMetadata` da landing já lê `dictionary.apps.web.pages.signUp.meta`, então corrigir o valor chega ao `<head>` sem mexer na página (na app, a PR #55 teve de trocar o namespace) |
| `.../apps/app/pages/signUp/index.ts:21`, `:25`, `:30`, `:46`, `:50`, `:55`, `:71`, `:75` | a receita da PR #55: `createYourAccount` ("Crie sua conta para começar" / "Create your account to get started" / "Crea tu cuenta para empezar"), `alreadyHaveAccount` ("Já tem uma conta? " / "Already have an account? " / "¿Ya tienes una cuenta? ") e `meta.description` "Create your account" / "Crea tu cuenta" |
| `docs/features/app-sign-up-copy/analyze/plan.md` §1.4 | a PR #55 deixou a metade da landing para depois, "com os mesmos nomes de chave", e o `meta.description` en/es da folha da web "vai junto com ela" |
| `git grep -n "enterWithYourAccount\|noAccount"` em `apps` e `packages` fora das folhas | o cadastro da web tem um só consumidor de cada chave (`sign-up-form-client.tsx:98`, `:179`). Nenhum teste, nenhum `apps/e2e` lê `apps.web.pages.signUp.noAccount` ou `.enterWithYourAccount`. O tipo do dicionário sai do objeto, sem tipo à mão |
| `.../apps/app/pages/resetPassword/index.ts:17`, `:46`, `:75` | `validation.passwordsDoNotMatch`: "As senhas não conferem" / "Passwords do not match" / "Las contraseñas no coinciden" |
| `.../apps/app/pages/common/account.ts:144`, `:397`, `:653` | `security.validation.mismatch`: "As senhas não conferem." / "The passwords do not match." / "Las contraseñas no coinciden." |
| `.../apps/app/pages/signUp/index.ts:18`, `.../apps/web/pages/signUp/index.ts:24`, `.../apps/app/pages/admin/users.ts:52` | as três ocorrências de "As senhas não coincidem" (a do admin com ponto final, como o resto daquela folha) |
| `git grep -n -i "conferem"` em `apps` e `packages` | só as duas ocorrências acima. Nenhum template de e-mail nem teste com o texto literal |
| Consumidores das chaves de senha diferente | `resetPasswordSchema.ts:20`, `accountFormSchema.ts:103` (troca de senha) e `:121` (definir senha), `userFormSchema.ts:17`, `:26`, `signUpSchema.ts:21` das duas apps. Os testes (`accountSecurityForm.test.tsx:218`, `:329`, `authSchemas.test.ts:115`, `apps/web/__tests__/signUpSchema.test.ts:56`) leem a chave do dicionário, não o texto, e não quebram |
| `apps/app/__tests__/authPagesCopy.test.ts:8-29` | compara a copy de cadastro e login só da app; das folhas da web lê apenas `web signIn.noAccount` (`:12`) |
| `apps/web/__tests__/signUpFormApi.test.tsx:104-116` | harness que já renderiza o `SignUpFormClient` da web com `renderToString` em `en` (`useParams` mockado em `:73`); o workspace roda em `environment: "node"` (`apps/web/vitest.config.mts`), sem DOM |
| `apps/e2e/tests/a11yDark.spec.ts:39-41` | o E2E abre o cadastro da landing e espera pelo rótulo `signUp.form.email`, que não muda |
| `specs/*.md` `contends_on` | nenhum dos arquivos deste plano aparece. O único `contends_on` com cadastro é o de `social-sign-in-providers` (`SignUpFormClient.tsx` da app), fora daqui |

### 0.1 Disjunção com a branch empilhada

A branch atual é `fix/app-auth-forms`, com 11 commits à frente de `origin/main`, pushada e sem PR. Conferido com
`git diff --name-only origin/main..HEAD` (33 arquivos): **nenhum arquivo deste plano está na lista.** A branch toca
`apps/app/app/[locale]/(unauthenticated)/**` (os formulários, inclusive `ResetPasswordForm.tsx` e
`SignUpFormClient.tsx`), oito testes em `apps/app/__tests__/` que não incluem `authPagesCopy.test.ts`, a folha
`translations/packages/auth/index.ts`, `packages/auth/provider.tsx`, `googleSignInApi.ts`, documentos e specs. Não toca
nada em `apps/web` nem as folhas `translations/apps/*/pages/*`.

O `ResetPasswordForm.tsx` da branch exibe a mensagem desta tarefa, mas o plano só muda o valor na folha; o componente
não é editado.

`git status --short` mostra só `specs/BACKLOG.md` e `specs/social-sign-in-providers.md`, da auditoria desta rodada.
Nenhum arquivo deste plano está sujo.

## 1. Contexto

### 1.1 Problema

Quem abre o cadastro da landing (`/<locale>/sign-up` na `apps/web`) lê, ao lado do link "Entrar", a pergunta "Não tem
uma conta?" ("Don't have an account?", "¿No tienes una cuenta?"). Nessa tela a pergunta certa é "Já tem uma conta?". O
subtítulo é o do login ("Entre com sua conta para continuar") e, em es, sai "Regístrate en tu cuenta para continuar",
que não serve para quem ainda não tem conta. A descrição da página em en e es tem o mesmo vício ("Sign up to your
account", "Regístrate en tu cuenta"). O `/test` de `web-auth-forms` mediu os três idiomas. A PR #55 corrigiu a mesma
coisa no cadastro da app e deixou a landing para depois.

Em pt-br, a regra "a confirmação tem de ser igual à senha" aparece com duas frases: "As senhas não coincidem" no
cadastro das duas apps e no formulário de usuário do admin, e "As senhas não conferem" na redefinição de senha e na
troca de senha da conta. en e es usam uma forma só.

### 1.2 Objetivo

O cadastro da landing diz, nos três idiomas, o que a página é: convite para criar conta e a pergunta "já tem conta?"
antes do link para entrar, com a mesma copy e os mesmos nomes de chave do cadastro da app. Em pt-br, as cinco mensagens
de senhas diferentes dizem "não coincidem".

### 1.3 Corte de MVP

1. Na folha `translations/apps/web/pages/signUp/index.ts`, renomear `noAccount` para `alreadyHaveAccount` e
   `enterWithYourAccount` para `createYourAccount`, com o texto da folha da app; corrigir `meta.description` en e es.
2. Atualizar os dois consumidores em `sign-up-form-client.tsx`.
3. Trocar "não conferem" por "não coincidem" em `resetPassword/index.ts:17` e `common/account.ts:144`, mantendo a
   pontuação de cada folha.
4. Testes no nível mais barato (§7).

### 1.4 Fora de escopo

| Item | Motivo |
|------|--------|
| en "The passwords do not match." em `account.ts:397` contra "Passwords do not match" nas outras folhas | mesmo verbo, frase correta; o BACKLOG registra en como "uma forma só". Mudança mínima (D4) |
| Ponto final divergente entre folhas ("As senhas não coincidem." no admin e na conta, sem ponto no cadastro e na redefinição) | cada folha segue a própria convenção em todas as mensagens de validação; uniformizar pontuação é outra tarefa (D5) |
| Teste de igualdade entre a copy do cadastro da app e a da landing | um fork pode querer copy diferente em cada app; o teste trava a classe do defeito (login colado no cadastro), não a identidade (D8) |
| `components.header.noAccount` (chave sem consumidor) | já é achado do BACKLOG desde a PR #55 |
| O laço de recarga com a sessão recusada, os textos fixos em `googleSignInApi.ts` | mexem em arquivos da branch `fix/app-auth-forms`; o BACKLOG os deixa para depois do merge |
| Qualquer mudança de comportamento do formulário | a tarefa é só copy |

### 1.5 Apps e modo de produto

- `packages/internationalization` (três folhas), `apps/web` (um componente e um teste) e `apps/app` (um teste de
  dicionário).
- Telas não autenticadas: o cadastro da landing e a redefinição de senha da app. A troca de senha fica em "Minha conta",
  área comum autenticada. Sem diferença entre comum e admin; sem dependência de plano.
- Modo de produto: no `simple`, o cadastro do usuário comum acontece na landing (`docs/AUTH-SSO.md`), então essa é a
  tela que o usuário final vê primeiro. No `subscription`, a landing também tem o cadastro. A copy vale para os dois.
- Sem env nova, sem dependência nova, sem infra.

## 2. Dados (Firestore)

N/A.

## 3. Contrato `@repo/sdk`

N/A.

## 4. API

N/A. Nenhum `error.code` novo, nenhuma entrada em `apiErrors`.

## 5. Front-end

### 5.1 Rotas e renderização

`/[locale]/sign-up` da landing, sem mudança de estrutura. `SignUpFormClient` segue client component; `page.tsx` não
muda, porque já lê o namespace da web (`page.tsx:9`). As telas da app que mostram a mensagem de senha não mudam de
código.

### 5.2 Layout

A pergunta e o link são nós irmãos em linhas separadas do JSX (`sign-up-form-client.tsx:178-186`). O JSX descarta o
espaço entre eles, então o espaço final do valor ("Já tem uma conta? ") é o que separa a pergunta do link. O texto novo
mantém esse espaço, e o teste de dicionário passa a cobri-lo.

"¿Ya tienes una cuenta? Iniciar sesión" tem 37 caracteres, um a menos que o es atual ("¿No tienes una cuenta? Iniciar
sesión"). O card é `max-w-md p-8` com `px-4` no contêiner (`:91-92`); a 375 px a frase pode quebrar em duas linhas como
hoje. O `/test` mede.

As linhas novas do componente (`{dictionary.apps.web.pages.signUp.createYourAccount}`, 76 colunas, e
`...alreadyHaveAccount}`, 77) cabem nas 80 colunas do Biome, então a contagem de linhas não muda.

### 5.3 Dados, hooks, formulário, tabela

N/A.

### 5.4 i18n e a11y

Chaves na §10.2. O link continua com o nome acessível "Entrar" / "Sign In" / "Iniciar sesión" (`signUp.signIn`, sem
mudança), e a pergunta fica fora do link.

## 6. Autorização e segurança

N/A. Telas públicas e uma mensagem de validação local. Impersonação não se aplica.

## 7. Testes

| Teste | Nível | O que prova |
|-------|-------|-------------|
| `apps/app/__tests__/authPagesCopy.test.ts` (estendido) | unitário sobre o dicionário real | nos três idiomas e agora **nas duas apps**: `signUp.alreadyHaveAccount` difere de `signIn.noAccount`, `signUp.createYourAccount` difere de `signIn.enterWithYourAccount` e `signUp.meta.description` difere de `signIn.meta.description`; `web signUp.alreadyHaveAccount` entra na lista de perguntas antes de link (termina com espaço; em es, começa com "¿") |
| `apps/app/__tests__/authPagesCopy.test.ts` (caso novo) | unitário sobre o dicionário real | as cinco mensagens de senhas diferentes de cada idioma contêm a mesma expressão: "não coincidem", "do not match", "no coinciden". Falha hoje em pt-br pelas duas folhas com "conferem". Aceita o ponto final e o "The" do en, que ficam (D4, D5) |
| `apps/web/__tests__/signUpFormApi.test.tsx` (um caso a mais) | componente, no harness que já faz `renderToString` do `SignUpFormClient` | o HTML em `en` contém `signUp.createYourAccount` e `signUp.alreadyHaveAccount.trim()` e não contém `signIn.enterWithYourAccount`. O typecheck prova que a chave existe; este caso prova que o componente lê a chave certa no lugar certo |
| `packages/internationalization/__tests__/parity.test.ts` | já existe | as chaves renomeadas existem nos três idiomas. Nada a mudar |

O `authPagesCopy.test.ts` fica na `apps/app` porque já lê as folhas das duas apps pelo `globalTranslations` (`:9`) e é
puro dicionário; criar um gêmeo na `apps/web` duplicaria o molde (D7).

Nenhum teste precisa de emulador nem de app de pé.

Comandos: `pnpm --filter app test`, `pnpm --filter web test`, `pnpm --filter @repo/internationalization test`,
`pnpm --filter app typecheck`, `pnpm --filter web typecheck`, `pnpm check`.

## 8. O que o `/test` vai percorrer

| Fluxo | Onde | O que ler | Infra |
|-------|------|-----------|-------|
| F1 cadastro da landing | `http://localhost:3001/pt-br/sign-up`, `/en/sign-up`, `/es/sign-up` | título, subtítulo, a pergunta antes do link e o link; clicar no link leva a `/<locale>/sign-in` | só `apps/web` de pé, deslogado |
| F2 `<head>` do cadastro da landing | mesmas URLs | `meta[name="description"]` e `og:description` nos três idiomas | idem |
| F3 regressão do login da landing | `:3001/pt-br/sign-in`, `/en/sign-in`, `/es/sign-in` | "Não tem uma conta? Cadastrar", "Don't have an account? Sign Up", "¿No tienes una cuenta? Registrarse" e o subtítulo do login, sem mudança | idem |
| F4 redefinição de senha da app | `http://localhost:3000/pt-br/reset-password?oobCode=qualquer` (qualquer código não vazio mostra o formulário, `page.tsx:28`), senha e confirmação diferentes com 8+ caracteres, enviar | "As senhas não coincidem" sob a confirmação; repetir em en e es ("Passwords do not match", "Las contraseñas no coinciden") | só `apps/app` de pé. A validação é local (Zod), nenhuma chamada sai |
| F5 troca de senha da conta | `:3000/pt-br/account`, aba Segurança, senha atual qualquer com 6+ caracteres, nova e confirmação diferentes | "As senhas não coincidem." sob a confirmação | conta de dev com senha: emulador, `apps/api` e `apps/app` (credencial em `.claude/dev-credentials.local.md`) |

Combinações: claro e escuro (texto em `text-muted-foreground`, link em `text-primary`) e 375 px no F1, F4 e F5. Na
F5, o formulário de definir senha (`AccountPasswordSetForm`) usa a mesma chave; percorrer um dos dois basta, e o caso
novo do `authPagesCopy.test.ts` cobre a chave para ambos.

Estados: só o normal e o erro de validação. Envio real e erro da API ficam fora.

## 9. Critérios de aceite (rascunho para o `/test`)

```markdown
# Critérios de Aceite (Checklist)

- [ ] **O cadastro da landing pergunta se a pessoa já tem conta antes do link para entrar**
  Em `/pt-br/sign-up`, `/en/sign-up` e `/es/sign-up` da landing (porta 3001), a frase antes do link é "Já tem uma
  conta?", "Already have an account?" e "¿Ya tienes una cuenta?", seguida de "Entrar", "Sign In" e "Iniciar sesión",
  com um espaço entre os dois. Nenhum idioma mostra mais "Não tem uma conta?", "Don't have an account?" ou "¿No tienes
  una cuenta?" nessa tela. O link leva a `/<locale>/sign-in`.

- [ ] **O subtítulo do cadastro da landing convida a criar conta**
  Abaixo do título, a tela mostra "Crie sua conta para começar", "Create your account to get started" e "Crea tu cuenta
  para empezar", os mesmos textos do cadastro da app. "Entre com sua conta para continuar", "Enter with your account to
  continue" e "Regístrate en tu cuenta para continuar" não aparecem mais no cadastro.

- [ ] **A descrição da página de cadastro da landing está certa**
  O `<meta name="description">` e o `og:description` do `/sign-up` da landing são "Crie sua conta", "Create your
  account" e "Crea tu cuenta". O título da aba não muda.

- [ ] **O login da landing não mudou**
  Em `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in` da landing, a frase antes do link continua "Não tem uma conta?",
  "Don't have an account?" e "¿No tienes una cuenta?", com o subtítulo do login.

- [ ] **Senhas diferentes dizem "não coincidem" em pt-br**
  Na redefinição de senha da app (`/pt-br/reset-password?oobCode=<qualquer>`) e na troca de senha em "Minha conta",
  confirmar com uma senha diferente mostra "As senhas não coincidem" (com ponto final na conta, como as outras
  mensagens daquela tela). "As senhas não conferem" não aparece em nenhuma tela. Em en e es, as mensagens continuam
  "Passwords do not match" / "The passwords do not match." e "Las contraseñas no coinciden".

- [ ] **Tema e largura**
  Em claro e escuro, a pergunta do cadastro usa a cor de texto secundário e o link a primária, com contraste legível nos
  dois. A 375 px, a frase e o link cabem no card sem estourar a borda; se quebrarem, a quebra fica entre palavras e o
  link continua inteiro e clicável. A mensagem de senhas diferentes cabe sob o campo sem cortar.

- [ ] **Testes e gates**
  `pnpm --filter app test` passa com o `authPagesCopy.test.ts` estendido; `pnpm --filter web test` passa com o caso novo
  do `signUpFormApi.test.tsx`; `pnpm --filter @repo/internationalization test` passa a paridade; `pnpm --filter app
  typecheck`, `pnpm --filter web typecheck` e `pnpm check` saem com exit 0. `git grep` não acha
  `signUp.noAccount` nem `signUp.enterWithYourAccount` em `apps/web` nem "conferem" nas folhas de tradução.
```

## 10. Blueprint técnico

### 10.1 Arquivos

| Arquivo | Mudança |
|---------|---------|
| `packages/internationalization/translations/apps/web/pages/signUp/index.ts` | renomeia `enterWithYourAccount` e `noAccount` nos três idiomas, com texto novo; `meta.description` en/es |
| `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:98`, `:179` | lê as chaves novas |
| `apps/web/__tests__/signUpFormApi.test.tsx` | um caso a mais |
| `packages/internationalization/translations/apps/app/pages/resetPassword/index.ts:17` | "não conferem" para "não coincidem" |
| `packages/internationalization/translations/apps/app/pages/common/account.ts:144` | "não conferem." para "não coincidem." |
| `apps/app/__tests__/authPagesCopy.test.ts` | casos da landing e o caso das mensagens de senhas diferentes |

Seis arquivos, nenhum no diff `origin/main..HEAD` (§0.1).

### 10.2 i18n

Folha `translations/apps/web/pages/signUp/index.ts`. As chaves novas ficam onde as antigas estavam.

| Chave | pt-br | en | es |
|-------|-------|----|----|
| `meta.description` | "Crie sua conta" (sem mudança) | "Create your account" | "Crea tu cuenta" |
| `createYourAccount` (era `enterWithYourAccount`) | "Crie sua conta para começar" | "Create your account to get started" | "Crea tu cuenta para empezar" |
| `alreadyHaveAccount` (era `noAccount`) | "Já tem uma conta? " | "Already have an account? " | "¿Ya tienes una cuenta? " |

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
         validation: {
```

Mensagens de senhas diferentes, só pt-br:

```diff
 // translations/apps/app/pages/resetPassword/index.ts
         validation: {
             passwordMin: "A senha deve ter pelo menos 8 caracteres",
-            passwordsDoNotMatch: "As senhas não conferem",
+            passwordsDoNotMatch: "As senhas não coincidem",
         },

 // translations/apps/app/pages/common/account.ts (security.validation)
-                mismatch: "As senhas não conferem.",
+                mismatch: "As senhas não coincidem.",
```

### 10.3 Componente

```diff
 // apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx
                     <p className="text-muted-foreground text-sm">
-                        {dictionary.apps.web.pages.signUp.enterWithYourAccount}
+                        {dictionary.apps.web.pages.signUp.createYourAccount}
                     </p>
 ...
                     <span className="text-muted-foreground">
-                        {dictionary.apps.web.pages.signUp.noAccount}
+                        {dictionary.apps.web.pages.signUp.alreadyHaveAccount}
                     </span>
```

### 10.4 Testes (esqueleto)

```ts
// apps/app/__tests__/authPagesCopy.test.ts
import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";

const LOCALES = ["pt-br", "en", "es"] as const;
const APPS = ["app", "web"] as const;

type Locale = (typeof LOCALES)[number];

const PASSWORD_MISMATCH_PHRASE: Record<Locale, string> = {
    "pt-br": "não coincidem",
    en: "do not match",
    es: "no coinciden",
};

function questionsBeforeLink(locale: Locale): Record<string, string> {
    const { app, web } = globalTranslations[locale].apps;
    return {
        "app signIn.noAccount": app.pages.signIn.noAccount,
        "web signIn.noAccount": web.pages.signIn.noAccount,
        "app signUp.alreadyHaveAccount": app.pages.signUp.alreadyHaveAccount,
        "web signUp.alreadyHaveAccount": web.pages.signUp.alreadyHaveAccount,
    };
}

function passwordMismatchMessages(locale: Locale): Record<string, string> {
    const { app, web } = globalTranslations[locale].apps;
    return {
        "app signUp": app.pages.signUp.validation.passwordsDoNotMatch,
        "web signUp": web.pages.signUp.validation.passwordsDoNotMatch,
        "app resetPassword": app.pages.resetPassword.validation.passwordsDoNotMatch,
        "app account security": app.pages.common.account.security.validation.mismatch,
        "app admin users": app.pages.admin.users.form.validation.passwordMismatch,
    };
}

describe.each(LOCALES)("sign-in and sign-up copy in %s", (locale) => {
    it.each(APPS)("does not reuse the sign-in copy on the %s sign-up page", (appName) => {
        const { signIn, signUp } = globalTranslations[locale].apps[appName].pages;
        expect(signUp.alreadyHaveAccount).not.toBe(signIn.noAccount);
        expect(signUp.createYourAccount).not.toBe(signIn.enterWithYourAccount);
        expect(signUp.meta.description).not.toBe(signIn.meta.description);
    });

    // o it.each de "ends with the space before its link" segue igual, agora com 4 entradas

    it.each(Object.entries(passwordMismatchMessages(locale)))(
        "%s says the passwords do not match with the shared phrase",
        (_key, message) => {
            expect(message).toContain(PASSWORD_MISMATCH_PHRASE[locale]);
        }
    );
});

// o describe "Spanish questions before a link" segue igual, agora com 4 entradas
```

O `globalTranslations[locale].apps[appName].pages` com `appName` em `"app" | "web"` dá uma união de tipos; as cinco
chaves usadas existem nos dois lados depois da renomeação, então o acesso tipa. Se o TypeScript não estreitar a união
no `it.each`, o desenvolvedor troca por dois casos explícitos (app e web) sem perder o que o teste prova.

```ts
// apps/web/__tests__/signUpFormApi.test.tsx: caso novo dentro do describe "web SignUpFormClient"
it("invites to create an account and asks whether the visitor already has one", () => {
    const signUpCopy = globalTranslations.en.apps.web.pages.signUp;
    const signInCopy = globalTranslations.en.apps.web.pages.signIn;

    const html = renderToString(
        <LocaleProvider>
            <SignUpFormClient />
        </LocaleProvider>
    );

    expect(html).toContain(signUpCopy.createYourAccount);
    expect(html).toContain(signUpCopy.alreadyHaveAccount.trim());
    expect(html).not.toContain(signInCopy.enterWithYourAccount);
});
```

Nenhum dos três textos en tem apóstrofo, então o escape do `renderToString` não interfere na comparação. O
`useParams` do harness devolve `en` (`:73`).

### 10.5 Contrato, rota, persistência, env

N/A. Sem env nova, nada para o fork configurar.

### 10.6 Ordem de implementação e commits (sugestão para o `/review`)

1. `fix(web): ask landing sign-up visitors whether they already have an account`: a folha
   `translations/apps/web/pages/signUp/index.ts`, `sign-up-form-client.tsx` e `apps/web/__tests__/signUpFormApi.test.tsx`.
   Commit misto, pelo mesmo motivo do commit 6 da PR #55: a renomeação na folha e no único consumidor tem de ir junta,
   ou um dos dois commits não passa no typecheck da web (`cycle-policy` §6). O porquê vai no corpo.
2. `fix(internationalization): use a single pt-br phrase for mismatched passwords`: `resetPassword/index.ts`,
   `common/account.ts` e `apps/app/__tests__/authPagesCopy.test.ts`. O teste entra aqui porque o caso das mensagens de
   senha só passa depois desta mudança, e ele também cobre a copy da landing do commit anterior, como o commit 7 da
   PR #55.
3. `docs(features): web-sign-up-copy`, por último.

A ordem SDK → API → app/web → i18n do repo é respeitada: sem SDK e API, o commit da web vem antes do de i18n puro.

## 11. Riscos

| Risco | Efeito | Mitigação |
|-------|--------|-----------|
| Fork que já customizou `noAccount`/`enterWithYourAccount` da folha de cadastro da web | o merge da atualização do boilerplate dá conflito na folha | é a mesma renomeação que a PR #55 fez na app; o nome novo diz o que o texto diz |
| A redefinição de senha da app vive num arquivo da branch empilhada | nenhum: só a folha muda, e ela está fora do diff da branch | §0.1 |
| A branch empilhada ainda não tem PR (E15 do BACKLOG) | esta tarefa entra na mesma pilha | decisão de branch e PR é do `/review` e sua |

## 12. Pré-requisitos manuais de infra

Nenhum. O F5 do `/test` usa o emulador e a credencial de dev já existentes; não é pendência de produção.

## 13. Decisões tomadas sem perguntar

| # | Pergunta | Opções | Adotada | Por quê |
|---|----------|--------|---------|---------|
| D1 | Renomear as chaves da folha da web ou só trocar os valores | renomear para `createYourAccount`/`alreadyHaveAccount` · manter `enterWithYourAccount`/`noAccount` com texto novo | renomear | é a receita da PR #55, que anunciou os mesmos nomes para a landing; manter `noAccount` guardando "Já tem uma conta?" é o remendo que o BACKLOG descartou |
| D2 | Texto da landing | igual ao da app · copy própria | igual ao da app | a PR #55 já decidiu a copy; duas copies para a mesma tela em apps diferentes seriam um terceiro achado |
| D3 | `meta.description` en/es da folha da web entra | sim · fora | sim | a PR #55 o deixou explicitamente "junto da metade da landing"; aqui chega ao `<head>` sem mexer em `page.tsx`, que já lê o namespace da web |
| D4 | O en "The passwords do not match." da conta | igualar a "Passwords do not match." · manter | manter | mesmo verbo, frase correta; o achado é só do pt-br e o BACKLOG conta en como uma forma só. Mudança mínima |
| D5 | Ponto final nas mensagens de senha | manter a convenção de cada folha · uniformizar | manter | a conta e o admin usam ponto em todas as mensagens de validação da folha; o cadastro e a redefinição, em nenhuma. Tirar o ponto só desta deixaria a folha da conta inconsistente consigo mesma |
| D6 | Forma do teste das mensagens de senha | igualdade exata por idioma · contém a expressão do idioma · só pt-br | contém a expressão do idioma, nos três | a igualdade exata reprovaria D4 e D5; testar só pt-br deixaria en e es livres para divergir de novo |
| D7 | Onde estender o teste de dicionário | `apps/app/__tests__/authPagesCopy.test.ts` · arquivo novo na `apps/web` | o da `apps/app` | já lê as folhas das duas apps e é a rede que a tarefa pediu; um gêmeo na web duplicaria o molde |
| D8 | Travar que a copy do cadastro da app e a da landing são idênticas | sim · não | não | um fork pode querer copy diferente em cada app; o teste trava a classe do defeito (login colado no cadastro), não a igualdade |
| D9 | Teste de componente na web | um caso no harness `renderToString` existente · só dicionário | um caso | custo baixo, o harness existe, e só ele pega o componente lendo a chave trocada (molde da D4 da PR #55) |
| D10 | Commits da folha e do componente da web | separados · um misto | um misto, sugerido ao `/review` | separados, um dos dois não passa no typecheck da web; a PR #55 resolveu igual |

## 14. Perguntas em aberto

Nenhuma bloqueante. As decisões acima seguem o BACKLOG e a receita da PR #55; quem quiser outra copy para a landing
muda a D2.
