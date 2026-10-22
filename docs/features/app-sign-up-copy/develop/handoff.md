# Handoff do develop: app-sign-up-copy

Segui o blueprint da §10 do plano sem desvio de escopo. Sem SDK, sem API, sem env, nenhum `error.code` novo.

## Blueprint → arquivos

| Item do blueprint | Arquivo | O que mudou |
|-------------------|---------|-------------|
| Folha de cadastro da app | `packages/internationalization/translations/apps/app/pages/signUp/index.ts` | `enterWithYourAccount` virou `createYourAccount` e `noAccount` virou `alreadyHaveAccount`, nas mesmas posições e com os textos da §10.2 nos três idiomas. `meta.description` en passou a "Create your account" e es a "Crea tu cuenta"; pt-br já estava certo |
| "¿" no login da app | `packages/internationalization/translations/apps/app/pages/signIn/index.ts:71` | só o valor es de `noAccount` |
| "¿" no login da landing | `packages/internationalization/translations/apps/web/pages/signIn/index.ts:69` | só o valor es de `noAccount` |
| Componente do cadastro | `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx:149`, `:228` | lê `createYourAccount` e `alreadyHaveAccount`. As linhas couberam em 80 colunas, então a contagem de linhas não mudou e as âncoras do BACKLOG continuam valendo |
| Metadata do cadastro | `apps/app/app/[locale]/(unauthenticated)/sign-up/page.tsx:18` | `apps.web.pages.signUp.meta` passou a `apps.app.pages.signUp.meta` |
| Metadata do login | `apps/app/app/[locale]/(unauthenticated)/sign-in/page.tsx:18` | `apps.web.pages.signIn.meta` passou a `apps.app.pages.signIn.meta` |
| Teste de copy (novo) | `apps/app/__tests__/authPagesCopy.test.ts` | 15 casos: nos três idiomas, o cadastro não repete a copy do login (pergunta, subtítulo, `meta.description`) e as três perguntas antes de link terminam com espaço; em es, as três começam com "¿" |
| Caso de metadata | `apps/app/__tests__/authPagesRedirect.test.tsx` | o array `pages` ganhou `generateMetadata` e `metaKey`; caso novo compara por referência (`toBe`) o retorno do `generateMetadata` com `globalTranslations[locale].apps.app.pages[metaKey].meta`, nos três idiomas e nas duas páginas (6 casos) |
| Caso de componente | `apps/app/__tests__/signUpFormApi.test.tsx` | caso novo que renderiza o formulário e acha `createYourAccount` e `alreadyHaveAccount.trim()` na tela |

O `authPagesCopy.test.ts` tem um JSDoc de duas linhas no helper das perguntas, explicando que o espaço final é o que separa a pergunta do link (os dois ficam em nós JSX separados). Isso entra na exceção de restrição não dedutível do código.

## Contrato

Nenhum DTO nem action mexido. O tipo do dicionário sai do objeto, então a troca de nome das chaves é o único "contrato" alterado. Consumidores das chaves renomeadas: só `SignUpFormClient.tsx` (`git grep -n "signUp\.noAccount\|signUp\.enterWithYourAccount" -- apps/app` não devolve nada, exit 1). A folha `web/pages/signIn` mudou só um valor; a web compila (`pnpm --filter web typecheck`, exit 0) e o `sign-in-form-client.tsx` dela não foi tocado.

Raio de impacto da troca de namespace nos dois `page.tsx`: fork que tenha customizado `apps.web.pages.signUp.meta` esperando que a app usasse esse valor passa a ver o `meta` da folha da app. É o mesmo comportamento das outras telas de autenticação da app.

## Códigos de erro novos

Nenhum.

## Desvios em relação ao plano

Nenhum de escopo. Diferenças de forma no teste novo: as perguntas ficaram num helper `questionsBeforeLink(locale)`, reaproveitado pelo bloco de es, no lugar do `it.each` inline do esqueleto.

## Decisões em aberto

- D5 continua com o `/review`: o commit do i18n sozinho não compila a app, porque as chaves antigas somem da folha. As opções do plano (dois commits em sequência ou um misto com o motivo na mensagem) seguem as mesmas.

## Validação

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, exit 0 (paridade inclusa) |
| `pnpm --filter app test` | 117 arquivos, 1001 testes, exit 0 |
| `pnpm --filter web test` | 26 arquivos, 207 testes, exit 0 |
| `pnpm --filter app typecheck` | exit 0 |
| `pnpm --filter web typecheck` | exit 0 |
| `pnpm check` | exit 0, 972 arquivos, nenhum fix aplicado |

Checagem de mutação dos testes novos: troquei temporariamente o `sign-in/page.tsx` de volta para `apps.web` e o subtítulo do componente para `signUp.meta.description`. Rodei `pnpm --filter app exec vitest run __tests__/authPagesRedirect.test.tsx __tests__/signUpFormApi.test.tsx` e 4 casos falharam (os 3 de metadata do login e o de componente). Restaurei os dois arquivos a partir de cópia; `git diff --stat` voltou a mostrar só as linhas do blueprint.

Não subi servidor nem abri browser.

## A verificar no `/test`

Nada abaixo foi medido no browser. Tudo vem de teste unitário ou de leitura.

- F1: o texto renderizado em `/pt-br/sign-up`, `/en/sign-up` e `/es/sign-up` da app (subtítulo, pergunta, link) e o espaço visível entre a pergunta e o link. Repro: ler o `textContent` do bloco `div.text-center.text-sm` e conferir "Já tem uma conta? Entrar", "Already have an account? Sign In", "¿Ya tienes una cuenta? Iniciar sesión".
- F1: o link com `?redirect=/pt-br/account` leva a `/pt-br/sign-in?redirect=%2Fpt-br%2Faccount`. O teste de componente cobre o `href` em pt-br; o clique real não foi feito.
- F2: `document.querySelector('meta[name="description"]').content` e `og:description` do cadastro da app nos três idiomas. O teste prova que o `generateMetadata` devolve o objeto da folha da app com `createMetadata` mockado; o que o `createMetadata` real escreve no `<head>` não foi medido.
- F3 e F4: "¿No tienes una cuenta? " antes de "Registrarse" em `/es/sign-in` da app (3000) e da landing (3001).
- F5: login da app em pt-br e en sem mudança visível, `meta description` do login igual nos três idiomas.
- Tema claro e escuro e largura de 375 px no F1 e no F3: se a frase quebra, onde quebra, e se o link fica inteiro.

## Lacunas de teste conhecidas

- Nenhum teste cobre o `<head>` real (o `createMetadata` está mockado como identidade no `authPagesRedirect.test.tsx`). Fica com o F2 do `/test`.
- O caso de componente roda só em pt-br. Os outros idiomas dependem do teste de dicionário mais o typecheck.
- A metade da landing (`translations/apps/web/pages/signUp/index.ts` e `sign-up-form-client.tsx`) continua com a copy do login, fora do corte.
- `components.header.noAccount` es continua sem "¿" (chave sem consumidor, fora do corte, D6).
