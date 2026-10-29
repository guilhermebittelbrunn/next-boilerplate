# Relatório do `/test`: copy do cadastro da landing e "as senhas não coincidem"

QA de 2026-10-29 na branch `fix/web-sign-up-copy` (não protegida), sobre o diff não commitado dos seis arquivos do
plano. Resultado: os nove critérios passam, nenhum defeito encontrado, nenhum teste criado ou alterado nesta etapa.

## Testes executados

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter web test` | 26 arquivos, 208 passed. `signUpFormApi.test.tsx` 7/7, com o caso novo |
| `pnpm --filter app test` | 130 arquivos, 1142 passed. `authPagesCopy.test.ts` 37/37 |
| `pnpm --filter @repo/internationalization test` (paridade) | 7 arquivos, 67 passed |
| `pnpm test` (raiz, `turbo test test:emulator`, com `JAVA_HOME` no openjdk@21) | exit 0, "15 successful, 15 total", 4 do cache, 2m03s. `api:test` 1679, `api:test:emulator` 274, `app:test` 1142, `web:test` 208 |
| `git grep -n "signUp\.noAccount\|signUp\.enterWithYourAccount" -- apps packages` | nada (exit 1) |
| `git grep -n -i "conferem" -- packages/internationalization/translations apps` | nada (exit 1) |

Sem `--force`: nada indicava cache sujo. Não remedi `typecheck` nem `pnpm check`. Esta etapa só acrescentou arquivos
em `docs/`, e o `/review` mediu os dois (typecheck 3/3, `pnpm check` em 1057 arquivos sem correção).

## Decisões de custo de teste

Nenhum teste da faixa cara. O diff é copy de dicionário e a troca de duas chaves num componente, sem rota, consulta
ou regra de segurança.

| Escopo tocado | Teste novo? | O que já cobria |
|---------------|-------------|-----------------|
| Folha `apps/web/pages/signUp` | não | `authPagesCopy.test.ts` (espaço final, "¿" em es, não reaproveitar o login) e a paridade |
| `sign-up-form-client.tsx` | não | o caso novo do `signUpFormApi.test.tsx` prova que o componente lê as chaves novas; o `typecheck` da web segura a renomeação |
| Folhas `resetPassword` e `common/account` | não | o caso de frase compartilhada do `authPagesCopy.test.ts`, nos três idiomas |

Considerei acrescentar ao teste de componente uma asserção de que o espaço final chega ao markup antes do `<a>`. Não
acrescentei: ela amarraria o teste à estrutura `<span>` + `<Link>`, e a medição abaixo (F1) mostrou o espaço no
`textContent` renderizado nos três idiomas.

## Verificar no `/test`

| Item do `review.md` | Veredito | Medição |
|---------------------|----------|---------|
| F1, cadastro da landing nos 3 idiomas | confirmado | `textContent` do `div.text-center`: `"Já tem uma conta? Entrar"`, `"Already have an account? Sign In"`, `"¿Ya tienes una cuenta? Iniciar sesión"`. O `<span>` termina com espaço nos três (`"Já tem uma conta? "` etc.). Subtítulo: "Crie sua conta para começar", "Create your account to get started", "Crea tu cuenta para empezar". `href` do link: `/pt-br/sign-in`, `/en/sign-in`, `/es/sign-in`. Clicar em "Iniciar sesión" no card de `/es/sign-up` levou a `http://localhost:3001/es/sign-in` com h1 "Iniciar sesión". A busca no `innerText` pelos textos antigos do cadastro deu falso nos três |
| F2, `meta description` e `og:description` | confirmado | pt-br "Crie sua conta" / "Crie sua conta"; en "Create your account" / "Create your account"; es "Crea tu cuenta" / "Crea tu cuenta". `document.title`: "Cadastrar \| next-boilerplate", "Sign Up \| next-boilerplate", "Registrarse \| next-boilerplate" |
| F3, login da landing sem regressão | confirmado | pt-br: "Não tem uma conta? Cadastrar", subtítulo "Entre com sua conta para continuar", meta "Faça login na sua conta". en: "Don't have an account? Sign Up", "Enter with your account to continue", meta "Sign in to your account". es: "¿No tienes una cuenta? Registrarse", "Inicia sesión en tu cuenta para continuar", meta "Inicia sesión en tu cuenta". Links para `/<locale>/sign-up` |
| F4, redefinição de senha com senhas diferentes | confirmado | `qaSenhaUm1` contra `qaSenhaDois2` em `:3000/<locale>/reset-password?oobCode=x`: pt-br "As senhas não coincidem", en "Passwords do not match", es "Las contraseñas no coinciden". Só `confirmPassword` com `aria-invalid="true"`; a URL não mudou; "conferem" ausente da página |
| F5, Minha conta → Segurança com senhas diferentes | confirmado | conta de QA no emulador, senha atual qualquer e as mesmas senhas diferentes: pt-br "As senhas não coincidem.", en "The passwords do not match.", es "Las contraseñas no coinciden.". Só `confirmPassword` inválido |

As strings `qaSenhaUm1` e `qaSenhaDois2` são valores de formulário digitados para provocar o erro de validação; não são
senha de conta nenhuma.

## Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| O cadastro da landing pergunta se a pessoa já tem conta antes do link | PASS | e2e (F1) + unit (`authPagesCopy`, `signUpFormApi`) |
| O subtítulo do cadastro da landing convida a criar conta | PASS | e2e (F1) + componente (`signUpFormApi`, en) |
| A descrição da página de cadastro da landing está certa | PASS | e2e (F2). Nenhum teste lê o `<head>` |
| O login da landing não mudou | PASS | e2e (F3) |
| "Não coincidem" na redefinição de senha | PASS | e2e (F4) + unit (`authPagesCopy`) |
| "Não coincidem" na troca de senha da conta | PASS | e2e (F5, formulário de troca) + unit (`authPagesCopy`, cobre também o de definir senha) |
| Uma só frase para senhas diferentes em cada idioma | PASS | unit (`authPagesCopy`, 5 mensagens × 3 idiomas) |
| Tema e largura | PASS | e2e, medido (abaixo) |
| Testes e gates | PASS | comandos acima |

## Evidências e2e

Os prints estão em `test/e2e/` (`01` a `11`), que o `.gitignore` descarta. O texto desta seção é a prova.

**Tema.** Com `prefers-color-scheme` emulado, o `<html>` recebeu a classe `light` ou `dark` conforme o caso. Cores
computadas, com contraste calculado a partir do L\* de cada cor:

| Elemento | Claro | Escuro |
|----------|-------|--------|
| Fundo | `lab(100 0 0)` | `lab(2.75 0 0)` |
| Pergunta do cadastro da landing (`text-muted-foreground`) | `lab(46.64 0 0)`, cerca de 5,1:1 | `lab(66.13 0 0)`, cerca de 7,6:1 |
| Link do cadastro da landing (`text-primary`) | `lab(7.78 0 0)`, cerca de 17,9:1 | `lab(98.26 0 0)`, cerca de 19:1 |
| Mensagem de senhas diferentes (app) | `lab(48.45 77.43 61.55)`, cerca de 4,7:1 | `lab(63.71 60.75 31.31)`, cerca de 7,1:1 |

**Largura.** A 375 px (viewport 375 × 812), o contêiner da pergunta no cadastro da landing ocupa x 49 a 311 com 20 px
de altura nos três idiomas: uma linha só, inclusive em es, que o `review.md` achava que poderia quebrar. O link fica
dentro do contêiner (es: x 215 a 299). `scrollWidth` 360 contra `innerWidth` 375, sem rolagem horizontal (os 15 px são
a barra de rolagem). Na redefinição de senha a 375 px, a mensagem ocupa x 49 a 326 em uma linha; na aba Segurança,
x 16 a 344 em uma linha, sem corte. No print `11-app-account-security-en-dark-375.png` o rótulo "Confirm new password"
e a borda do campo ficam vermelhos e a mensagem aparece logo abaixo.

**Combinações percorridas.** Cadastro da landing: claro a 1280 px nos três idiomas, escuro a 375 px nos três, claro a
375 px em es. Login da landing: claro a 1280 px nos três. Redefinição de senha: claro a 1280 px em pt-br, escuro a
1280 px em en, escuro a 375 px em es e pt-br. Segurança da conta: claro a 1280 px em pt-br, escuro a 375 px em en e es.

Tudo rodou em `next dev`. Não houve comportamento suspeito que pedisse confirmação em `build` + `start`.

## Ambiente do e2e

Todas as portas (3000, 3001, 3002, 8080, 9099, 9199, 4001, 4400, 4500, 9150) estavam livres. Subi tudo e derrubei
tudo:

- `pnpm emulators` (Auth, Firestore e Storage, projeto `demo-next-boilerplate`, JDK 21 por `JAVA_HOME`);
- `apps/api` (3002), `apps/app` (3000) e `apps/web` (3001) com `next dev`, com o ambiente montado do `.env.example` e
  o bloco do emulador forçado, como faz o `apps/e2e/support/stackEnv.ts`. Os `.env` locais apontam para um projeto
  Firebase real e não foram usados nem editados.

Teardown: `kill` nos PIDs guardados, `SIGINT` no `firebase-tools` e `kill` nos `next-server` filhos que seguravam as
portas. Depois, `lsof` vazio nas dez portas. Apaguei o harness temporário em `/tmp` e os dois `firestore-debug.log`
gerados na rodada (raiz e `apps/api`).

## Dados de QA e estado de dev

- `qa-web-sign-up-copy@example.com`, nome de exibição "QA Web Sign Up Copy", criada pelo cadastro da app no emulador.
  Morreu com o processo; nenhum projeto Firebase real foi tocado. A senha foi gerada na hora e descartada, não está em
  arquivo nenhum. `.claude/dev-credentials.local.md` não existe e não foi preciso.
- Nenhuma conta nova em projeto real, então nada a acrescentar ao `docs/PRE-PRODUCTION.md`.

## Lacunas

| Lacuna herdada | Veredito |
|----------------|----------|
| O caso "does not reuse the sign-in copy on the web sign-up page" passa com a correção revertida | continua aberta, aceita. O `typecheck` da web e os casos de espaço final e "¿" seguram a renomeação |
| O `meta.description` es antigo voltaria sem nenhum teste reprovar | continua aberta. Travar o texto exato contraria a D8 do plano; a F2 desta rodada mediu os três idiomas |
| O teste de componente roda só em `en` | fechada no runtime: a F1 leu o componente renderizado em pt-br, en e es. Continua sem teste automatizado fora de `en`, o que é aceito |
| (`review.md`, 🟢) o teste de componente não prova o espaço antes do link no markup | fechada aqui: o `textContent` medido nos três idiomas tem o espaço |
| (`review.md`, 🟢) `header.noAccount` em es sem "¿" | fora de escopo, já no BACKLOG |

Nada ficou para teste manual.
