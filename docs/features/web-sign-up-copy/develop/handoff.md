# Handoff do `/develop`: copy do cadastro da landing e "as senhas não coincidem"

Implementação do `analyze/plan.md` sem desvio de escopo. Seis arquivos, os mesmos da §10.1 do plano. Nenhum deles está
em `git diff --name-only origin/main..HEAD` (conferido cruzando as duas listas com `grep -F -f`: a única interseção é
`specs/BACKLOG.md`, que é da auditoria e não foi tocado aqui).

## Blueprint → arquivos

| Item do plano | Arquivo | O que mudou |
|---------------|---------|-------------|
| §10.2 folha da web | `packages/internationalization/translations/apps/web/pages/signUp/index.ts` | `enterWithYourAccount` virou `createYourAccount` e `noAccount` virou `alreadyHaveAccount`, nos três idiomas, com a copy da folha de cadastro da app. `meta.description` en passou a "Create your account" e es a "Crea tu cuenta"; pt-br já estava certo |
| §10.3 componente | `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx` | as duas leituras (`:98`, `:179`) apontam para as chaves novas. A contagem de linhas não mudou |
| §10.2 senha, redefinição | `packages/internationalization/translations/apps/app/pages/resetPassword/index.ts:17` | "As senhas não conferem" → "As senhas não coincidem" |
| §10.2 senha, conta | `packages/internationalization/translations/apps/app/pages/common/account.ts:144` | "As senhas não conferem." → "As senhas não coincidem." (o ponto final da folha ficou) |
| §10.4 teste de dicionário | `apps/app/__tests__/authPagesCopy.test.ts` | o caso "does not reuse the sign-in copy" roda para `app` e `web`; `web signUp.alreadyHaveAccount` entrou na lista de perguntas antes de link (espaço final e "¿" em es); caso novo com as cinco mensagens de senhas diferentes contendo "não coincidem" / "do not match" / "no coinciden" |
| §10.4 teste de componente | `apps/web/__tests__/signUpFormApi.test.tsx` | caso novo no harness `renderToString` existente, em `en`: o HTML contém `createYourAccount` e `alreadyHaveAccount.trim()` e não contém `signIn.enterWithYourAccount` |

## Contrato e códigos de erro

Nenhum DTO, action do SDK, rota ou `error.code` novo. Nenhuma entrada em `apiErrors`.

Chaves renomeadas e quem as lê: `apps.web.pages.signUp.createYourAccount` e `.alreadyHaveAccount` têm um consumidor
cada, `sign-up-form-client.tsx`. `git grep -n "signUp\.noAccount\|signUp\.enterWithYourAccount" -- apps packages`
não devolve nada (exit 1).

## Desvios

- **Forma do caso "does not reuse"**: o esqueleto do plano usava `it.each(APPS)` com
  `globalTranslations[locale].apps[appName].pages`. Usei `it.each([["app", app.pages], ["web", web.pages]] as const)`,
  que passa os dois objetos já tipados e evita indexar a união. O plano previa essa troca como alternativa; o que o
  caso prova não muda. `apps/app/tsconfig.json` inclui `**/*.ts`, então o `typecheck` da app cobre o arquivo de teste.
- Nenhuma decisão do plano estava errada.

## Validação

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter app exec vitest run __tests__/authPagesCopy.test.ts` | 37 passed (37) |
| `pnpm --filter web exec vitest run __tests__/signUpFormApi.test.tsx` | 7 passed (7) |
| `pnpm --filter app test` | 130 arquivos, 1142 passed |
| `pnpm --filter web test` | 26 arquivos, 208 passed |
| `pnpm --filter @repo/internationalization test` (paridade) | 7 arquivos, 67 passed, exit 0 |
| `pnpm --filter web typecheck`, `pnpm --filter app typecheck`, `pnpm --filter @repo/internationalization typecheck` | exit 0 nos três |
| `pnpm check` | exit 0, "Checked 1057 files ... No fixes applied" |
| `git grep -n "conferem" -- packages/internationalization/translations apps` | nada (exit 1) |

### Os testes novos falham sem a correção

Gerei o patch das quatro mudanças de código e folha (`git diff -- <4 arquivos> > patch`), apliquei ao contrário
(`git apply -R`), rodei os dois arquivos de teste e reapliquei o patch. Depois de restaurar, `git diff --stat` voltou a
mostrar os seis arquivos e os dois testes voltaram a 37/37 e 7/7.

Com a correção revertida:

- `authPagesCopy.test.ts`: 6 failed, 31 passed (37). Falharam `web signUp.alreadyHaveAccount ends with the space before
  its link` em pt-br, en e es; `app resetPassword` e `app account security ... shared phrase` em pt-br; e
  `web signUp.alreadyHaveAccount opens with the inverted question mark`.
- `signUpFormApi.test.tsx`: 1 failed, 6 passed (7). Falhou o caso novo,
  `invites to create an account and asks whether the visitor already has one`.

## A verificar no `/test`

Não abri nenhuma tela nem subi processo. Nada abaixo tem instrumento de runtime:

- F1: o cadastro da landing (`:3001/<locale>/sign-up`) mostra "Crie sua conta para começar" / "Create your account to
  get started" / "Crea tu cuenta para empezar" e "Já tem uma conta? Entrar" / "Already have an account? Sign In" /
  "¿Ya tienes una cuenta? Iniciar sesión", com espaço entre a pergunta e o link. O teste de componente só cobre `en` e
  só confere que os textos estão no HTML, não a posição nem o espaço renderizado.
- F2: `meta[name="description"]` e `og:description` do `/sign-up` da landing dizem "Crie sua conta" / "Create your
  account" / "Crea tu cuenta". Nenhum teste lê o `<head>`; a conclusão de que chega lá vem da leitura de `page.tsx:9`.
- F3: o login da landing continua com "Não tem uma conta? Cadastrar" e o subtítulo do login. A folha `signIn` não foi
  tocada.
- F4 e F5: "As senhas não coincidem" na redefinição de senha da app (`:3000/pt-br/reset-password?oobCode=x`) e "As
  senhas não coincidem." na troca de senha em "Minha conta".
- Claro, escuro e 375 px, conforme a §8 do plano.

## Lacunas de teste conhecidas

- Com a correção revertida, o caso "does not reuse the sign-in copy on the web sign-up page" **passa**: as chaves novas
  não existem, `undefined` é diferente de qualquer texto do login, e as descrições antigas de en e es já eram diferentes
  das do login ("Sign up to your account" contra "Sign in to your account"). Quem segura a renomeação é o `typecheck` da
  web e os casos de espaço final e "¿"; o "does not reuse" só pega a cópia literal do login para o cadastro.
- O `meta.description` es antigo ("Regístrate en tu cuenta") não é igual ao do login, então nenhum teste o reprovaria se
  voltasse. Só a passada F2 confere a descrição nos três idiomas.
- O teste de componente roda só em `en` (o harness fixa `useParams` em `en`).

## Decisões em aberto

Nenhuma.
