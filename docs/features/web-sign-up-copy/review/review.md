# Revisão: copy do cadastro da landing e "as senhas não coincidem"

Revisão do diff não commitado contra `docs/review-checklist.md`, em 2026-10-29. Escopo: os seis arquivos da §10.1 do
plano mais a auditoria delta (`specs/BACKLOG.md`, `specs/social-sign-in-providers.md`), que entra no plano de commits
mas não foi revisada linha a linha aqui.

## Branch

| Item | Valor |
|------|-------|
| Nome | `fix/web-sign-up-copy` |
| Como | criada nesta revisão com `git switch -c`, a partir do `HEAD` `7348247` de `fix/app-auth-forms` |
| Validação do nome | passou no regex do `/review` (`branch OK: fix/web-sign-up-copy`). Sem `project` porque o diff toca `apps/web`, `apps/app` e `packages/internationalization` |
| Working tree | `git status --short` igual antes e depois da troca (comparado com `diff`); índice vazio |
| Base da PR | `fix/app-auth-forms`, enquanto aquela branch não for mergeada em `main`. Depois do merge, a base passa a ser `main` (rebase ou retarget da PR) |

`fix/app-auth-forms` tem 11 commits à frente de `main`, está pushada e não tem PR (E15 do BACKLOG). A branch nova
herda esses commits; a PR dela, aberta contra `main` antes daquele merge, mostraria os 11 commits da tarefa anterior.

## Achados

| Severidade | Onde | Achado | Ação |
|------------|------|--------|------|
| ✅ | `packages/internationalization/translations/apps/web/pages/signUp/index.ts:16`, `:20`, `:41`, `:45`, `:66`, `:70` | `createYourAccount` e `alreadyHaveAccount` com os mesmos textos da folha de cadastro da app (`apps/app/pages/signUp/index.ts:21`, `:25`, `:46`, `:50`, `:71`, `:75`), com espaço final e "¿" em es | nenhuma |
| ✅ | mesma folha, `:30`, `:55` | `meta.description` en "Create your account" e es "Crea tu cuenta", iguais aos da app | nenhuma |
| ✅ | `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx:98`, `:179` | lê as chaves novas; a pergunta continua num `<span>` irmão do `<Link>`, fora do nome acessível do link | nenhuma |
| ✅ | `resetPassword/index.ts:17`, `common/account.ts:144` | "não conferem" virou "não coincidem"; `git grep -i conferem -- apps packages` não devolve nada | nenhuma |
| ✅ | chaves renomeadas | `git grep "signUp\.\(noAccount\|enterWithYourAccount\)" -- apps packages` vazio. A `apps/app` não lê `web.pages.signUp` fora do `authPagesCopy.test.ts`; `apps/e2e` não lê nenhuma das duas chaves (o `a11yDark.spec.ts` usa `signUp.form.email`) | nenhuma |
| ✅ | `apps/web/app/[locale]/sign-up/page.tsx:9` → `apps/web/shared/lib/seo.ts:60-61` → `packages/seo/metadata.ts:49`, `:64` | o `meta.description` da folha vira `description` e `openGraph.description` do `<head>`. Confirmado por leitura | nenhuma |
| ✅ | `apps/app/__tests__/authPagesCopy.test.ts:41-71` | lê o dicionário real, imports explícitos de `vitest`, sem `toBeInTheDocument`. O teste da frase de senha usa "contém", o que acomoda o ponto final e o "The" do en (D4, D5) | nenhuma |
| ✅ | `apps/web/__tests__/signUpFormApi.test.tsx:151-164` | caso no harness `renderToString` existente, sem processo externo | nenhuma |
| 🟢 | `apps/web/__tests__/signUpFormApi.test.tsx:162` | o caso confere `alreadyHaveAccount.trim()` no HTML e não prova que o espaço chega ao markup antes do link. O espaço é coberto pelo teste de dicionário (`authPagesCopy.test.ts:58-63`) e o `{expr}` do JSX não o descarta, então a lacuna é só de render visual | sem edição; fica para o F1 do `/test` |
| 🟢 | `packages/internationalization/translations/components/header/index.ts:51` | `header.noAccount` em es sem "¿" ("No tienes una cuenta? "). A chave não tem consumidor e já está no BACKLOG (`specs/BACKLOG.md:366`) | fora de escopo |

Nada bloqueante. A skill `/code-review` (nível baixo) não apontou nada no diff. Nenhuma correção foi aplicada.

## Correções aplicadas

Nenhuma. A única mudança desta etapa no repositório é a branch `fix/web-sign-up-copy` e este arquivo, mais o
`STATE.md`.

## Raio de impacto

- `apps.web.pages.signUp.createYourAccount` e `.alreadyHaveAccount`: um consumidor de produção cada,
  `sign-up-form-client.tsx`. O tipo do dicionário é inferido do objeto, então qualquer leitor esquecido das chaves
  antigas quebraria o `typecheck` da web, que passou.
- `apps.web.pages.signUp.meta.description`: chega ao `<head>` do `/sign-up` da landing pelo `generateMetadata`.
- `resetPassword.validation.passwordsDoNotMatch` e `common.account.security.validation.mismatch`: só o valor mudou.
  Os schemas (`resetPasswordSchema.ts`, `accountFormSchema.ts`) e os testes que os cobrem leem a chave, não o texto.
- Fork que customizou `noAccount`/`enterWithYourAccount` da folha de cadastro da web terá conflito na folha ao puxar
  esta mudança, como já aconteceu com a renomeação da app na PR #55.

## Verificar no `/test`

Nenhuma destas afirmações tem instrumento de runtime até aqui. O handoff não abriu tela.

1. **F1, maior risco.** O cadastro da landing mostra o subtítulo e a pergunta novos, com espaço visível entre a
   pergunta e o link. Repro: `pnpm --filter web dev`, abrir `http://localhost:3001/pt-br/sign-up`, `/en/sign-up` e
   `/es/sign-up` deslogado; ler "Crie sua conta para começar" / "Create your account to get started" / "Crea tu cuenta
   para empezar" e "Já tem uma conta? Entrar" / "Already have an account? Sign In" / "¿Ya tienes una cuenta? Iniciar
   sesión". Medir o espaço no texto do contêiner (`textContent` do `div.text-center`), não no print. Clicar no link e
   confirmar `/<locale>/sign-in`. Claro, escuro e 375 px (a linha em es pode quebrar em duas).
2. **F2.** `meta[name="description"]` e `meta[property="og:description"]` do `/sign-up` da landing dizem "Crie sua
   conta" / "Create your account" / "Crea tu cuenta". Repro: nas mesmas URLs, ler os dois `content` pelo DOM. Nenhum
   teste lê o `<head>`; a cadeia foi confirmada só por leitura.
3. **F3.** O login da landing (`:3001/<locale>/sign-in`) continua com "Não tem uma conta? Cadastrar" e o subtítulo do
   login nos três idiomas. A folha `signIn` não mudou.
4. **F4.** Redefinição de senha da app: `http://localhost:3000/pt-br/reset-password?oobCode=x`, senha e confirmação
   diferentes com 8 ou mais caracteres, enviar; ler "As senhas não coincidem". Repetir em en e es.
5. **F5.** Troca de senha em "Minha conta" (aba Segurança): nova senha e confirmação diferentes; ler "As senhas não
   coincidem.". Exige emulador, `apps/api` e conta de dev (credencial em `.claude/dev-credentials.local.md`).

## Lacunas de teste

| Lacuna (do handoff) | Veredito |
|---------------------|----------|
| O caso "does not reuse the sign-in copy on the web sign-up page" passa com a correção revertida, porque as chaves novas ficam `undefined` | continua aberta, aceita. Quem segura a renomeação é o `typecheck` da web e os casos de espaço final e "¿", que falham sem a correção. Endurecer o caso não acrescenta prova |
| O `meta.description` es antigo ("Regístrate en tu cuenta") voltaria sem nenhum teste reprovar | continua aberta. Travar o texto exato contraria a D8 (o fork pode ter copy própria); a conferência fica com o F2 do `/test` |
| O teste de componente roda só em `en` | continua aberta, aceita. Os três idiomas da folha são cobertos pelo teste de dicionário; o componente lê a mesma chave em qualquer locale. O F1 percorre os três |

Nenhuma lacuna nova.

## Decisões em aberto

Nenhuma de código. A base da PR (`fix/app-auth-forms` ou `main` depois do merge dela) depende de quando aquela PR
for aberta; é a E15 do BACKLOG, já estacionada.

## Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm turbo run typecheck --filter=web --filter=app --filter=@repo/internationalization` | 3/3 successful, sem cache (o handoff rodou fora do turbo, então esta medição é nova) |
| `pnpm check` | "Checked 1057 files in 540ms. No fixes applied." |
| `pnpm --filter @repo/internationalization test` (paridade) | 7 arquivos, 67 testes, todos passando |

Não rodei as suítes da `apps/app` e da `apps/web`: é tarefa do `/test`. O handoff registra 1142 e 208 testes
passando, sem medição minha.

## Varredura de segredo

`docs/features/web-sign-up-copy/` e `specs/social-sign-in-providers.md` não têm senha, token, chave nem e-mail real.
O diff do `specs/BACKLOG.md` também não. O único e-mail no diff de código é o fixture `qa-password-policy-web@example.com`,
que já estava no teste.

## Plano de commits

Ordem: auditoria primeiro, depois o código (web, i18n, teste da app), artefatos por último. Antes do primeiro commit,
`git diff --cached --stat` tem de sair vazio; depois de cada um, `git show --stat --oneline HEAD` contra a lista.

1. `docs(specs): record the stacked auth-forms branch and pick the landing sign-up copy as next`
   - `specs/BACKLOG.md`
   - `specs/social-sign-in-providers.md`
2. `fix(web): ask landing sign-up visitors whether they already have an account`
   - `packages/internationalization/translations/apps/web/pages/signUp/index.ts`
   - `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx`
   - `apps/web/__tests__/signUpFormApi.test.tsx`

   Commit misto (folha + componente), como o `5fab762` da PR #55: separados, um dos dois não passa no `typecheck` da
   web. O corpo explica isso.
3. `fix(internationalization): use a single pt-br phrase for mismatched passwords`
   - `packages/internationalization/translations/apps/app/pages/resetPassword/index.ts`
   - `packages/internationalization/translations/apps/app/pages/common/account.ts`
4. `test(app): check the landing sign-up copy and the shared password mismatch phrase`
   - `apps/app/__tests__/authPagesCopy.test.ts`
5. `docs(features): web-sign-up-copy`
   - `docs/features/web-sign-up-copy/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md`)

Desvio da §10.6 do plano: o plano juntava o `authPagesCopy.test.ts` às duas folhas de senha num commit
`fix(internationalization)`, o que mistura `apps/app` com `packages/*`. Separei o teste num `test(app)` depois das
folhas, como o par `d3c9ebe`/`55151a6` desta mesma pilha. Cada commit fica verde sozinho: o teste antigo não lê as
chaves renomeadas da web nem a frase de senha, então os commits 2 e 3 não o quebram, e o novo só entra quando as duas
mudanças que ele cobre já estão no histórico.

Título de PR sugerido: `fix: landing sign-up copy and a single pt-br password mismatch phrase`. Base:
`fix/app-auth-forms` enquanto ela não estiver em `main`.

Commits realizados: _(preenchido pelo orquestrador)_
