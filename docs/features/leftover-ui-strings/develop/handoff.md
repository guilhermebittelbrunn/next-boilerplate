# Handoff do develop: leftover-ui-strings

Implementação do plano em `analyze/plan.md`, sem desvio de decisão. Sem SDK, sem API, sem `error.code` novo.

## Blueprint e arquivos

| Item do blueprint | Arquivos |
|---|---|
| Schema do login da landing a partir do dicionário | `apps/web/app/[locale]/sign-in/validations/signInSchema.ts` (constante `signInSchema` virou `buildSignInSchema(dictionary)`; mínimo continua `EXISTING_PASSWORD_MIN_LENGTH`) |
| Formulário do login da landing usa a factory | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx` (`useMemo(() => buildSignInSchema(dictionary), [dictionary])` + `zodResolver(schema)`) |
| Tela de erro global da app traduzida | `apps/app/app/global-error.tsx` (`getDictionary()` no corpo, `lang={locale}`, texto de `apps.app.pages.common.globalError`) |
| Chaves da landing | `packages/internationalization/translations/apps/web/pages/signIn/index.ts` (bloco `validation` com `emailInvalid` e `passwordMin` nos 3 idiomas, texto igual ao do login da app) |
| Chaves da app | `packages/internationalization/translations/apps/app/pages/common/globalError.ts` (novo) e `.../common/index.ts` (registra `globalError` nos 3 idiomas) |
| T1 | `apps/web/__tests__/signInSchema.test.ts` (novo) |
| T2 | `apps/app/__tests__/passwordPolicyCopy.test.ts` (entrada `web signIn.passwordMin` em `existingPasswordMessages`) |
| T3 | `apps/app/__tests__/globalErrorLocale.test.tsx` (novo) |

`signInSchema` não tinha outro consumidor na `apps/web` (`grep -rn 'signInSchema' apps/web` só achou o formulário).

## Contrato

Nenhum DTO nem action mudou. O único contrato tocado é o tipo do dicionário: `apps.web.pages.signIn.validation` e
`apps.app.pages.common.globalError` são chaves novas. Nenhuma chave existente foi renomeada ou removida.

## Códigos de erro

Nenhum. `apiErrors` não mudou.

## Desvios

Nenhum desvio de decisão. Dois detalhes de implementação:

- O `global-error.tsx` ganhou um comentário de duas linhas explicando por que o idioma vem do cookie (a tela substitui o root layout, então não há `LocaleProvider`). O plano deixava isso a critério do develop. O texto é a regra em si, sem citar plano nem etapa.
- No T1, o caso de e-mail inválido virou um `it.each` com `"nope"`, `"qa@example"` e `""`, e cada caso confere também que o erro aponta para o campo `email`.

Antes de implementar, conferi a premissa da D1 na fonte do Next 16.0.0: quando o root layout falha no SSR,
`dist/server/app-render/app-render.js` (por volta da linha 811) devolve só a casca `<html id="__next_error__">` e o
`GlobalError` vai no payload `G`, para o cliente renderizar. Ou seja, o `global-error` não é renderizado no servidor
nesse caminho e não há risco de o HTML do servidor sair no idioma padrão e divergir do cliente.

## Decisões em aberto

Nenhuma nova. As observações fora de escopo do plano (§1.5: `noValidate` no login da landing, `global-error` inerte da
`apps/web`, tela de erro sem `styles.css`) continuam abertas e são do `/spec --sync`.

## Validação

| Gate | Comando | Resultado |
|---|---|---|
| Testes novos e editados | `npx vitest run __tests__/signInSchema.test.ts` (em `apps/web`) | 15 passaram |
| | `npx vitest run __tests__/globalErrorLocale.test.tsx __tests__/passwordPolicyCopy.test.ts` (em `apps/app`) | 34 passaram (4 + 30) |
| T3 prova a mudança | mesmo comando do T3 com o `global-error.tsx` do `HEAD` restaurado temporariamente | 3 falharam (pt-br, es, sem cookie), 1 passou (en); arquivo novo devolvido em seguida |
| Typecheck + testes dos workspaces | `pnpm turbo run typecheck test --filter=web --filter=app --filter=@repo/internationalization` | 14/14 tarefas ok; `web` 184 testes, `app` 975, `@repo/internationalization` 67 (inclui a paridade dos 3 idiomas) |
| Lint | `pnpm check` | 968 arquivos, nenhuma correção |

Não rodei `pnpm test` da raiz (`test:emulator` precisa de JDK e nada aqui toca a API) nem o build da app.

## A verificar no `/test`

- Login da landing em `/pt-br/sign-in`, `/en/sign-in` e `/es/sign-in`, sem sessão: formulário vazio e depois
  `qa@example` com senha de 5 caracteres devem mostrar `emailInvalid` e `passwordMin` no idioma da URL. Só o schema
  foi medido (T1); a ligação schema → formulário → mensagem na tela não foi.
- Mensagens em espanhol no cartão do login a 375 px, claro e escuro. Não medido.
- Tela de erro global da app: o T3 mede o render com o cookie `x-locale`. O caminho real (root layout quebrando em
  `pnpm --filter app build && start`) não foi montado. Repro no §8 do plano (F2).
- Build da app pré-renderizando `/_global-error` sem erro com o `getDictionary()` no servidor. Não rodei o build.
- R1 do plano: cookie `x-locale` legível por `document.cookie` numa página real da app. Não medido.

## Lacunas de teste conhecidas

- Sem teste de componente do `sign-in-form-client.tsx` (decisão do plano, §7). A ligação fica para a passada de
  navegador.
- O T3 não clica no botão para conferir `reset()`. O `onClick` não mudou, mas nenhum teste o cobre.
