# Critérios de Aceite (Checklist)

- [x] **O cadastro da landing pergunta se a pessoa já tem conta antes do link para entrar**
  Em `/pt-br/sign-up`, `/en/sign-up` e `/es/sign-up` da landing (porta 3001), deslogado, a frase antes do link é "Já
  tem uma conta?", "Already have an account?" e "¿Ya tienes una cuenta?", seguida de "Entrar", "Sign In" e "Iniciar
  sesión", com um espaço entre a pergunta e o link no texto do contêiner. Nenhum idioma mostra "Não tem uma conta?",
  "Don't have an account?" ou "¿No tienes una cuenta?" nessa tela. O link leva a `/<locale>/sign-in` e o nome acessível
  dele é só o rótulo do link, sem a pergunta.

- [x] **O subtítulo do cadastro da landing convida a criar conta**
  Abaixo do título, a tela mostra "Crie sua conta para começar", "Create your account to get started" e "Crea tu cuenta
  para empezar", os mesmos textos do cadastro da app. "Entre com sua conta para continuar", "Enter with your account to
  continue" e "Regístrate en tu cuenta para continuar" não aparecem mais no cadastro. O título da página ("Cadastrar",
  "Sign Up", "Registrarse") não muda.

- [x] **A descrição da página de cadastro da landing está certa**
  O `<meta name="description">` e o `<meta property="og:description">` do `/sign-up` da landing são "Crie sua conta",
  "Create your account" e "Crea tu cuenta". O título da aba continua "Cadastrar | …", "Sign Up | …" e
  "Registrarse | …". A descrição do login não é reaproveitada no cadastro em nenhum idioma.

- [x] **O login da landing não mudou**
  Em `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in` da landing, a frase antes do link continua "Não tem uma conta?",
  "Don't have an account?" e "¿No tienes una cuenta?", seguida de "Cadastrar", "Sign Up" e "Registrarse", e o
  subtítulo continua o do login. O link leva a `/<locale>/sign-up`.

- [x] **Senhas diferentes dizem "não coincidem" em pt-br na redefinição de senha**
  Em `/pt-br/reset-password?oobCode=<qualquer>` da app, senha e confirmação diferentes com 8 ou mais caracteres mostram
  "As senhas não coincidem" sob a confirmação, e só a confirmação fica com `aria-invalid`. A validação é local: nenhum
  envio sai com senhas diferentes. Em en e es a mensagem continua "Passwords do not match" e "Las contraseñas no
  coinciden". "As senhas não conferem" não aparece.

- [x] **Senhas diferentes dizem "não coincidem" em pt-br na troca de senha da conta**
  Em "Minha conta", aba Segurança, com a sessão de um usuário que tem senha, nova senha e confirmação diferentes mostram
  "As senhas não coincidem." sob a confirmação, com o ponto final das outras mensagens da tela. Em en e es continuam
  "The passwords do not match." e "Las contraseñas no coinciden.". O formulário de definir senha
  (`AccountPasswordSetForm`, para conta só com Google) lê a mesma chave e fica coberto pelo teste de dicionário.

- [x] **Uma só frase para senhas diferentes em cada idioma**
  As cinco mensagens de senhas diferentes da app e da landing (cadastro da app, cadastro da web, redefinição de senha,
  segurança da conta e formulário de usuário do admin) contêm "não coincidem" em pt-br, "do not match" em en e "no
  coinciden" em es. O ponto final e o "The" do en podem variar entre telas; a expressão não.

- [x] **Tema e largura**
  Em claro e escuro, a pergunta do cadastro usa a cor de texto secundário e o link a primária, com contraste de pelo
  menos 4,5:1 nos dois temas. A 375 px a frase e o link cabem no card sem estourar a borda nem criar rolagem horizontal;
  se quebrarem, a quebra fica entre palavras e o link continua inteiro e clicável. A mensagem de senhas diferentes cabe
  sob o campo sem cortar, em claro e escuro.

- [x] **Testes e gates**
  `pnpm --filter app test` passa com o `authPagesCopy.test.ts` estendido, `pnpm --filter web test` passa com o caso
  novo do `signUpFormApi.test.tsx`, `pnpm --filter @repo/internationalization test` passa a paridade e o `pnpm test` da
  raiz (que gateia o `build`) sai com exit 0. `git grep` não acha `signUp.noAccount` nem `signUp.enterWithYourAccount`
  em `apps` e `packages`, nem "conferem" nas folhas de tradução.
