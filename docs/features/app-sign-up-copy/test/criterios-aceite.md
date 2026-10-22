# Critérios de aceite: copy do cadastro da app

Medidos no `/test` de 2026-10-21, com `next dev` da `apps/app` (3000) e da `apps/web` (3001), sem conta, sem API e sem
emulador. O resultado e o meio de cada item estão em `test/report.md`.

Legenda: ✅ passou na medição · ❌ falhou · 🔒 não verificável sem infra externa.

# Critérios de Aceite (Checklist)

- [x] ✅ **O cadastro da app pergunta se a pessoa já tem conta antes do link para entrar**
  Em `/pt-br/sign-up`, `/en/sign-up` e `/es/sign-up` da app, o bloco abaixo do botão do Google mostra "Já tem uma
  conta? Entrar", "Already have an account? Sign In" e "¿Ya tienes una cuenta? Iniciar sesión", com um espaço entre a
  pergunta e o link. A pergunta termina em espaço porque ela e o link ficam em nós JSX separados; sem o espaço, a tela
  mostraria "conta?Entrar". Nenhum dos três idiomas mostra "Não tem uma conta?", "Don't have an account?" ou "¿No
  tienes una cuenta?" nessa tela.

- [x] ✅ **O link do cadastro preserva o `?redirect=` e leva ao login**
  Com `?redirect=/pt-br/account` na URL do cadastro, o `href` do link é `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount`, e
  o clique real chega a essa URL com a tela de login montada. Sem o parâmetro, o link aponta para `/<locale>/sign-in`
  sem query. O valor do parâmetro não é validado nesta tela; a validação do destino continua com o login.

- [x] ✅ **O subtítulo do cadastro convida a criar conta**
  Abaixo do título, o cadastro mostra "Crie sua conta para começar", "Create your account to get started" e "Crea tu
  cuenta para empezar". O subtítulo do login ("Entre com sua conta para continuar" e equivalentes) não aparece no
  cadastro, e "Regístrate en tu cuenta para continuar" saiu do es. O login da app mantém o subtítulo dele nos três
  idiomas.

- [x] ✅ **A descrição da página de cadastro da app está certa nos três idiomas**
  O HTML servido pelo `/sign-up` da app traz `<meta name="description">` e `<meta property="og:description">` iguais a
  "Crie sua conta", "Create your account" e "Crea tu cuenta". A descrição vem da folha da app (`apps.app.pages.signUp`),
  não da landing; o cadastro da landing continua com "Sign up to your account" em en até a metade da landing ser feita,
  e isso não reprova este critério. O título da aba não muda ("Cadastrar | next-boilerplate" e equivalentes).

- [x] ✅ **O login em es tem o "¿" de abertura nas duas apps**
  Em `/es/sign-in` da app (3000) e da landing (3001), a frase antes do link de cadastro é "¿No tienes una cuenta? ",
  seguida de "Registrarse". O espaço final continua lá, então a tela mostra "¿No tienes una cuenta? Registrarse" com o
  link separado da pergunta.

- [x] ✅ **O login em pt-br e en não muda, e a descrição do login continua a mesma**
  Na app e na landing, o login mostra "Não tem uma conta? Cadastrar" e "Don't have an account? Sign Up", como antes. A
  troca de namespace no `generateMetadata` do login da app não muda o `<head>`: "Faça login na sua conta", "Sign in to
  your account" e "Inicia sesión en tu cuenta" em `description` e `og:description`, os mesmos valores que a folha da
  landing tinha antes da mudança.

- [x] ✅ **Tema e largura**
  Em claro e escuro, a pergunta usa `text-muted-foreground` e o link `text-primary`, com contraste legível nos dois
  temas contra o fundo da página. A 375 px, a frase e o link cabem no card sem estourar a borda e sem rolagem
  horizontal. Se a frase quebrasse em duas linhas, a quebra teria de ficar entre palavras com o link inteiro; nas
  medições ela coube numa linha só, com o link num único retângulo.

- [x] ✅ **Testes e gates**
  `pnpm --filter app test` passa com o `authPagesCopy.test.ts` novo e os casos novos em `authPagesRedirect.test.tsx` e
  `signUpFormApi.test.tsx`. `pnpm --filter @repo/internationalization test` passa a paridade sem chave faltando ou
  sobrando, e `pnpm --filter app typecheck` e `pnpm --filter web typecheck` saem com exit 0. `git grep` não acha
  `signUp.noAccount` nem `signUp.enterWithYourAccount` em `apps/app`, e o `pnpm test` da raiz, que bloqueia o build,
  sai com exit 0.
