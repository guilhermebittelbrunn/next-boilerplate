# Revisão: app-sign-up-copy

Escopo: as três folhas de tradução, o `SignUpFormClient.tsx`, os dois `page.tsx` de autenticação da app e os três
testes da app listados no handoff. O working tree leva também `web-auth-forms`, `global-error-theme` (já revisadas e
testadas) e a auditoria em `specs/`. Não revisei de novo essas partes; elas entram só no plano de commits unificado,
que passa a morar aqui e substitui o de `docs/features/global-error-theme/review/review.md`.

## Branch

- Reutilizada: `fix/auth-forms-and-global-error-theme`, sem commit próprio (`git log origin/main..HEAD` vazio), sem
  upstream, HEAD em `af763bb` (igual a `origin/main`).
- Por que serve: o diff novo é copy dos formulários de login e cadastro da app e o "¿" do login nas duas apps. Cabe em
  "auth forms". Com mais de um app, a regra de `.claude/rules/git-commits.md` omite o `project`, como já estava. Criar
  outra branch só trocaria o nome sem ganho.
- Validação do nome: regex do passo 3 de `.claude/commands/review.md` devolveu
  `branch OK: fix/auth-forms-and-global-error-theme`.

## Revisão: app-sign-up-copy

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/app/__tests__/authPagesCopy.test.ts:8-11` (antes da correção): o JSDoc do `questionsBeforeLink` explicava o
  espaço final, mas o helper também alimenta o bloco do "¿", que não depende do espaço. O conteúdo é legítimo pela
  exceção 2 de `.claude/rules/code-comments.md`: sem ele, o `endsWith(" ")` parece pedante e alguém apaga, e o JSX
  descartar o espaço entre irmãos em linhas separadas não é óbvio. Confirmei a restrição nos três consumidores
  (`SignUpFormClient.tsx:227-235`, `SignInForm.tsx:208-219`, `sign-in-form-client.tsx:146-154`). Corrigido: virou um
  comentário de duas linhas, dentro de 80 colunas, em cima do `it.each` do espaço (`:31-32`). A linha do JSDoc tinha 90
  colunas.
- Fora do diff: `packages/auth/components/sign-in.tsx:125` tem "Don't have an account?" fixo no JSX, e ninguém importa
  `@repo/auth/components/sign-in` (`git grep` vazio em `apps` e `packages`). Componente morto com string solta. Não
  mexi; candidato a achado 🟢 na próxima auditoria do `/spec --sync`.

### ✅ OK

- Paridade: `createYourAccount` e `alreadyHaveAccount` nos três blocos, nas posições das chaves antigas. O teste de
  paridade passou (67 casos).
- Nomes de chave: os dois repetem o que o texto diz e fazem par com `enterWithYourAccount`/`noAccount` do login.
  Variáveis dos testes com nome descritivo (`signUpCopy`, `signInCopy`, `questionsBeforeLink`). Arquivo novo em
  camelCase, conforme a regra 9.
- Tom da copy. pt-br: "Crie sua conta para começar", "Já tem uma conta? ", "Crie sua conta". en: "Create your account to
  get started", "Already have an account? ", "Create your account". es: "Crea tu cuenta para empezar", "¿Ya tienes una
  cuenta? ", "Crea tu cuenta", e "¿No tienes una cuenta? " no login das duas apps. Tudo natural, no tuteio que o resto
  da folha es já usa ("¿Olvidaste tu contraseña?").
- Consumidores das chaves renomeadas: só o `SignUpFormClient.tsx:149` e `:228`. Nenhum teste, nenhum `apps/e2e` e
  nenhum tipo à mão leem as chaves antigas ou os textos antigos ("Entre com sua conta", "Sign up to your account",
  "No tienes una cuenta").
- Troca de namespace nos `page.tsx:18`: os `meta` de login da app e da web são iguais nos três idiomas (conferido nas
  duas folhas), então o `<head>` do login não muda. As outras telas não autenticadas da app já liam `apps.app`.
- `createMetadata` (`packages/seo/metadata.ts`) grava o `description` recebido em `description` e em
  `openGraph.description`, então o valor da folha da app chega aos dois campos do objeto de metadata.
- Contagem de casos do handoff conferida por leitura: `authPagesCopy` tem 3 × (1 + 3) + 3 = 15, `authPagesRedirect`
  ganhou 2 × 3 = 6, `signUpFormApi` ganhou 1.
- O teste por referência (`toBe`) do `authPagesRedirect` distingue o namespace mesmo no login, onde os valores são
  iguais.
- Comentários: nenhum cita o fluxo de agents.

### 👁 Verificar no `/test`

Em ordem de risco.

1. F2, `<head>` do cadastro da app. A leitura confirma o objeto que o `generateMetadata` devolve; o que o Next escreve
   no HTML não foi medido. Repro: em `/pt-br/sign-up`, `/en/sign-up` e `/es/sign-up` da app,
   `document.querySelector('meta[name="description"]').content` e o `content` de `meta[property="og:description"]`
   devem dar "Crie sua conta", "Create your account" e "Crea tu cuenta".
2. F1, texto e espaço entre pergunta e link. Repro: `textContent` do `div.text-center.text-sm` do cadastro igual a "Já
   tem uma conta? Entrar", "Already have an account? Sign In" e "¿Ya tienes una cuenta? Iniciar sesión"; subtítulo
   abaixo do título com a copy nova. Com `?redirect=/pt-br/account`, o link aponta para
   `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount` e o clique chega lá.
3. F3 e F4: "¿No tienes una cuenta? Registrarse" em `/es/sign-in` da app (3000) e da landing (3001).
4. F5: login da app em pt-br e en sem mudança visível ("Não tem uma conta? Cadastrar", "Don't have an account? Sign
   Up"), e o `meta description` do login igual nos três idiomas.
5. Claro, escuro e 375 px no F1 e no F3: pergunta em `text-muted-foreground`, link em `text-primary`, e, se a frase
   quebrar, o link continua inteiro e clicável. "¿Ya tienes una cuenta? Iniciar sesión" tem 37 caracteres num card de
   uns 300 px úteis.

## Correções aplicadas

| arquivo | mudança |
|---------|---------|
| `apps/app/__tests__/authPagesCopy.test.ts:31-32` | o JSDoc do `questionsBeforeLink` saiu do helper e virou comentário de duas linhas em cima do `it.each` do espaço final, que é o caso que ele explica |

Fora do código: o plano de commits unificado passou para este arquivo. Uma linha no plano de
`docs/features/global-error-theme/review/review.md` e uma nota nos `STATE.md` das outras duas tarefas apontam para cá.

## Raio de impacto

- Chaves renomeadas: `apps.app.pages.signUp.noAccount` e `.enterWithYourAccount`. O tipo do dicionário sai do objeto,
  então um fork que leia as chaves antigas quebra no typecheck, não em runtime. No repo, o único consumidor foi
  atualizado.
- `apps.web.pages.signIn.noAccount` mudou só o valor es; o consumidor da web (`sign-in-form-client.tsx:147`) não muda.
- Os `page.tsx` de login e cadastro da app passam a ler `apps.app.pages.*.meta`. Fork que tenha customizado
  `apps.web.pages.signUp.meta` contando que a app usasse esse valor passa a ver o `meta` da folha da app.

## Lacunas de teste

| lacuna (do handoff) | veredito |
|---------------------|----------|
| Nenhum teste cobre o `<head>` real (`createMetadata` mockado como identidade) | continua aberta; fecha no item 1 do "Verificar no `/test`". A leitura do `createMetadata` reduz o risco ao que o Next faz com o objeto |
| O caso de componente roda só em pt-br | continua aberta, aceita: o `authPagesCopy` cobre o dicionário nos três idiomas e o typecheck prova a chave; o F1 do `/test` vê a tela nos três |
| A metade da landing (`web/pages/signUp` e `sign-up-form-client.tsx`) com a copy do login | fora de escopo (§1.4 do plano); repete a troca depois do merge |
| `components.header.noAccount` es sem "¿" | fora de escopo (D6 do plano); chave sem consumidor |

## Decisões tomadas

### D5: commits do i18n e da app

Adotado: três commits da app e do i18n, todos compilando e com os testes do próprio commit passando, e um deles misto.

1. `fix(app)` da metadata: os dois `page.tsx` e o `authPagesRedirect.test.tsx`. Não depende de nada do i18n, porque
   `apps.app.pages.*.meta` já existe.
2. `fix(app)` da copy do cadastro, misto: a folha `translations/apps/app/pages/signUp/index.ts`, o `SignUpFormClient.tsx`
   e o `signUpFormApi.test.tsx`. A renomeação na folha e no único consumidor tem de ir junto. Separadas, uma das duas
   ordens deixa um commit que não passa no typecheck da app. A `cycle-policy` §6 aceita commit misto quando isolar
   exigiria `git add -p` ou deixaria o estado quebrado; o porquê vai no corpo da mensagem.
3. `fix(internationalization)` do "¿": as folhas de login da app e da web, que mudam só valor, e o
   `authPagesCopy.test.ts`. Vai por último, como manda a ordem de `.claude/rules/git-commits.md`. O teste novo entra
   aqui porque os casos do "¿" só passam depois desta mudança, e ele também cobre a copy do commit anterior, que já
   estará no histórico.

Alternativa descartada: um commit só de i18n com as três folhas seguido do da app. O primeiro removeria as chaves que o
componente ainda lê e não passaria no typecheck da app. As PRs entram em `main` por squash (`af763bb ... (#54)`), então
o commit quebrado não chegaria à `main`, mas ficaria no histórico da PR e quebraria um `git bisect` local.

## Decisões em aberto

Nenhuma bloqueante.

- Apagar a `web/fix/auth-forms` local depois dos commits (`git branch -d`), como já recomendado na revisão da
  `global-error-theme`.

## Gates

| gate | comando | resultado |
|------|---------|-----------|
| lint | `pnpm check` | 972 arquivos, nenhum ajuste, exit 0 |
| typecheck app | `pnpm --filter app typecheck` | exit 0 |
| typecheck web | `pnpm --filter web typecheck` | exit 0 |
| paridade de i18n | `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, exit 0 |

Sem `--force`. A suíte da app não foi rodada aqui. A correção mexe só em comentário; a última medição é a do handoff
(app 1001, web 207), e o `/test` remede.

Varredura por segredo em `docs/features/app-sign-up-copy/`: nenhuma senha, token, chave ou e-mail. Nenhum print.

## Plano de commits

Branch `fix/auth-forms-and-global-error-theme`. Antes do primeiro, `git diff --cached --stat` tem de sair vazio (saiu
vazio nesta revisão). Depois de cada um, `git show --stat --oneline HEAD` conferido contra a lista. Os commits 1 a 4,
8, 9 e 10 são os do plano da `global-error-theme`, sem mudança de conteúdo.

1. `fix(web): send signed-in visitors home from the sign-in form`
   - `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx`
   - `apps/web/__tests__/signInFormRedirect.test.tsx`
   - Corpo: the file also carries the sign-in `noValidate` and `px-4 md:px-2`; splitting them would need `git add -p`.
2. `fix(web): request the verification e-mail after a landing sign-up`
   - `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`
   - `apps/web/__tests__/signUpFormApi.test.tsx`
   - `apps/web/__tests__/signUpFormSubmitLock.test.tsx`
   - `apps/web/__tests__/signUpFormValidation.test.tsx`
   - Corpo: the file also carries the sign-up `noValidate` and padding; `signUpFormSubmitLock` and
     `signUpFormValidation` cover the `noValidate`.
3. `fix(app): style and theme the global error screen`
   - `apps/app/app/global-error.tsx`
   - `apps/app/__tests__/globalErrorLocale.test.tsx`
4. `fix(web): style and theme the landing global error screen`
   - `apps/web/app/global-error.tsx`
   - `apps/web/__tests__/globalErrorLocale.test.tsx`
5. `fix(app): read sign-in and sign-up metadata from the app dictionary`
   - `apps/app/app/[locale]/(unauthenticated)/sign-in/page.tsx`
   - `apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx`
   - `apps/app/__tests__/authPagesRedirect.test.tsx`
6. `fix(app): ask sign-up visitors whether they already have an account`
   - `packages/internationalization/translations/apps/app/pages/signUp/index.ts`
   - `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx`
   - `apps/app/__tests__/signUpFormApi.test.tsx`
   - Corpo: renames `noAccount` to `alreadyHaveAccount` and `enterWithYourAccount` to `createYourAccount` in the app
     sign-up dictionary and fixes the en/es meta description. The dictionary and its only consumer change in the same
     commit because either one alone fails the app typecheck.
7. `fix(internationalization): open the Spanish sign-in question with an inverted question mark`
   - `packages/internationalization/translations/apps/app/pages/signIn/index.ts`
   - `packages/internationalization/translations/apps/web/pages/signIn/index.ts`
   - `apps/app/__tests__/authPagesCopy.test.ts`
   - Corpo: the copy test lives in apps/app and also covers the sign-up copy from the previous commit; it lands here
     because its Spanish cases only pass with this change.
8. `docs(specs): reconcile the backlog after PR #54`
   - `specs/BACKLOG.md`
   - `specs/account-security-mfa.md`
   - `specs/observability-logging.md`
9. `docs(features): web-auth-forms`
   - `docs/features/web-auth-forms/` (os PNG de `test/e2e/` ficam de fora pelo `.gitignore`)
10. `docs(features): global-error-theme`
    - `docs/features/global-error-theme/`
11. `docs(features): app-sign-up-copy`
    - `docs/features/app-sign-up-copy/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md` e o
      que o `/test` gravar)

Título de PR sugerido: `fix: auth form copy, landing auth forms and themed global error screens`.

### Commits realizados

(preenchido pelo orquestrador depois de commitar)
