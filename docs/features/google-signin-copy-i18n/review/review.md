# Revisão: textos fixos em inglês no login com Google da app

Escopo: `apps/app/shared/lib/googleSignInApi.ts` (helper `sessionNotEstablishedError()` e os três `throw` de
`exchangeForApiSession`) e os 7 casos novos em `apps/app/__tests__/googleSignInApi.test.ts` (+44 linhas). As
outras tarefas do working tree não foram relidas.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Não é protegida. Regex: `BRANCH INVALIDA`.
- Proposta, herdada do plano combinado: `feat/admin-account-forms-and-session-revocation`. Regex:
  `branch OK`.
- Nada foi criado nem renomeado, porque a rodada é do `/cycle`. O `/review` cria a branch a partir da atual
  antes do primeiro commit.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/app/__tests__/googleSignInApi.test.ts:150-192`: os casos novos fixam o idioma pelo cookie `x-locale`.
  No browser, `getDictionary()` lê primeiro o locale que o `LocaleProvider` renderizou por último (o segmento
  `[locale]` da URL) e só cai no cookie quando nenhum provider renderizou
  (`packages/internationalization/client.ts:40-45`). O teste cobre o fallback, não o caminho principal. O
  caminho principal é o mesmo que o terceiro ramo (`POST /api/auth/session` sem sucesso) já usava antes
  desta tarefa, então não é regressão. Sem ação.

### ✅ OK

- **Locale no momento do erro.** `sessionNotEstablishedError()` chama `getDictionary()` de
  `@repo/internationalization/client` na hora do `throw`, fora de render. No cliente, `readActiveLocale()`
  devolve `lastRenderedBrowserLocale ?? getCookie("x-locale")` (`client.ts:40-45`), e o `LocaleProvider`
  grava esse valor a partir do segmento `[locale]` da URL (`client.ts:47-56`). É o mesmo mecanismo que o
  terceiro ramo usava antes; os três ramos agora passam pelo mesmo helper (`googleSignInApi.ts:55-59`).
- **Strings soltas no arquivo.** `grep 'Error("' googleSignInApi.ts` não encontra nada. Os únicos literais
  restantes são `"http://localhost"`, `"/api/auth/session"`, cabeçalho HTTP e o JSDoc, nenhum deles visível
  ao usuário.
- **Strings soltas nos chamadores.** `SignInForm.tsx:55` e `SignUpFormClient.tsx:56` e `:102` mandam o erro
  para `errorAlert(handleClientError(new FormattedError(error, locale)))`. Para um `Error` simples,
  `FormattedError.formatMessage` devolve `error.message` (`packages/shared/utils/helpers/formattedError.ts:52`),
  que agora já vem traduzido. Não há `aria-label`, `placeholder`, `title` nem texto JSX literal nos dois
  arquivos. O `console.error("Could not request the verification email", error)` em
  `SignUpFormClient.tsx:94` é log, não copy.
- **Chave.** `packages.auth.provider.session.notEstablished` existe nos três idiomas; nenhuma chave nova,
  então a paridade não muda.
- **`signOut` continua no `catch`** (`googleSignInApi.ts:47-52`), e o caso com `signOutMock` rejeitando
  confirma que a falha do `signOut` não troca o erro que sobe.
- **Comentários.** O helper não ganhou comentário e o diff não cita artefato do fluxo.
- **Contrato.** Sem mudança de DTO, action do SDK, rota ou `error.code`.

### 👁 Verificar no `/test`

Sem browser. Os dois ramos novos só disparam com resposta malformada do Google (credencial sem `idToken`) ou
da API (`session` sem `idToken`), o que não se reproduz pela UI sem mock de rede, e o teste unitário já mede
a copy nos três idiomas.

1. Rodar `pnpm --filter app test` e `pnpm test` da raiz; esperado 18 de 18 em `googleSignInApi.test.ts` e a
   suíte da app inteira passando.

## Correções aplicadas

Nenhuma. A revisão não editou código.

## Raio de impacto

`signInWithGoogleViaApi` é usado por `SignInForm.tsx` e `SignUpFormClient.tsx`, e por seis testes da app que
o mocam (`signUpFormSubmitLock`, `signUpAnalytics`, `authFormsPersistedSessionRedirect`, `signUpFormApi`,
`signInEmailLinkEntry`, `signInEnterResubmit`). Só a mensagem do `Error` mudou; assinatura e retorno são os
mesmos.

## Lacunas de teste

- A lacuna do handoff (nenhum teste de componente prova que `SignInForm` e `SignUpFormClient` mostram
  `error.message` de um `Error` simples no `errorAlert`) continua aberta e fora de escopo: o comportamento já
  existia antes da tarefa, e a leitura de `FormattedError.formatMessage` sustenta a afirmação.

## Decisões em aberto

Nenhuma.

## Gates

A revisão não mexeu em código, então os números são do handoff, sem nova medição:

| Comando | Resultado |
|---------|-----------|
| `npx vitest run __tests__/googleSignInApi.test.ts` (em `apps/app`) | 18 passed |
| `pnpm --filter app test` | 154 arquivos, 1385 testes passando |
| `pnpm --filter app typecheck` | exit 0 |
| `pnpm check` | 1156 arquivos, nenhum ajuste |
| Paridade de i18n | não se aplica, nenhuma chave mudou |

## Plano de commits

Plano combinado de `docs/features/avatar-preview-mobile-shrink/review/review.md` (50 commits), agora com
52. Esta tarefa entra como 28 e 52. Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio
(conferido nesta revisão: vazio).

Posição: depois do último commit `fix(app)` (27, `keep the user disabled in the list when only the session
revocation failed`) e antes de `chore(app): stop listing Stripe keys in the app env example`. Não depende de
nenhum commit do plano e nenhum depende dele. Os dois arquivos só têm mudança desta tarefa e nenhum outro
commit do plano os lista, então basta `git add` simples.

### Trecho alterado

1 a 27: sem mudança.

28. `fix(app): translate google sign-in failure copy` (esta tarefa)
    - `apps/app/shared/lib/googleSignInApi.ts`, `apps/app/__tests__/googleSignInApi.test.ts`
    - Corpo: "A Google sign-in that came back without an ID token, or an API answer without a session
      token, surfaced a fixed English message in the sign-in and sign-up alerts. All three failure branches
      of the session exchange now raise the translated session-not-established copy."
29 a 51: os antigos 28 a 50, com o mesmo conteúdo e a mesma ordem relativa.
52. `docs(features): google-signin-copy-i18n` (esta tarefa)
    - `docs/features/google-signin-copy-i18n/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Varredura de segredo na pasta da feature: nenhuma ocorrência de senha, token de credencial, chave ou
e-mail. Repetir no que o `/test` gravar antes do commit 52.

Título de PR sugerido: o do plano combinado, sem mudança. Depois do último commit aprovado, o `/review`
pergunta se deve rodar `git push -u origin feat/admin-account-forms-and-session-revocation`.

### Commits realizados

(preenchido pelo orquestrador)
