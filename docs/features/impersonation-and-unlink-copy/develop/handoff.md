# Handoff do develop: copy do desvincular e menu do perfil sob personificação

Implementação do `analyze/plan.md` em rodada autônoma do `/cycle`. Mexi só nos 8 arquivos da §10.1 do
plano (`git diff --stat` dos 8: 167 inserções, 15 remoções). Nada de API, SDK, env ou Firestore.

## Blueprint → arquivos

| # | item do plano | arquivo |
|---|---------------|---------|
| 1 | desvio no `onError` do `unlinkMutation` | `apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useSignInMethodMutations.tsx` |
| 2 | `useAuthRequestPanel` + `fallbackUser` + meia frase no comentário | `apps/app/shared/components/ui/ProfileDropdown.tsx` |
| 3 | asserção da mensagem nova nos 3 idiomas + caso de outro erro | `apps/app/__tests__/accountSignInMethodsSessionsNotRevoked.test.tsx` |
| 4 | mock do contexto + 3 casos de personificação | `apps/app/__tests__/profileDropdownAccount.test.tsx` |
| 5-7 | mock do contexto com `isImpersonating: false` | `apps/app/__tests__/profileDropdownAvatarEmpty.test.tsx`, `profileDropdownCookieConsent.test.tsx`, `profileDropdownHelpLink.test.tsx` |
| 8 | `account.messages.passwordUnlinkedSessionsNotRevoked` em pt-br, en e es | `packages/internationalization/translations/apps/app/pages/common/account.ts` |

A copy é a da §6 do plano, sem alteração. `packages/internationalization/translations/packages/shared/utils.ts`
não aparece no diff (`git diff --stat` do arquivo sai vazio), então `apiErrors.AUTH_SESSIONS_NOT_REVOKED`
segue igual para os outros quatro fluxos.

## Contrato

Nenhum DTO nem action mudou. Nenhum código de erro novo, nenhuma entrada nova em `apiErrors`.

## Desvios

**Desvio no teste do item 3: o sufixo "(Código do erro: …)" é o `requestId`, não o `error.code`.** O plano
pedia para provar que a mensagem nova "não contém o sufixo de código" e, no caso de outro erro, que a copy
de `apiErrors` aparece "com o código do erro". Lendo `packages/shared/utils/helpers/handleClientError.ts` e
`formattedError.ts`, o sufixo é `(${requestIdLabel}: ${requestId})`, e o `requestId` vem do header
`x-request-id` da resposta. O `error.code` nunca vai para o texto. Sem esse header na resposta simulada,
qualquer asserção sobre o sufixo passaria de graça. Por isso:

- o erro simulado (`apiError(code)`) agora traz `x-request-id: req-unlink-1`;
- no caso `AUTH_SESSIONS_NOT_REVOKED`, o `errorAlert` é chamado exatamente com a mensagem nova (igualdade
  estrita, então o sufixo não está lá mesmo com `requestId` presente), e a mensagem contém o rótulo de
  `account.security.signOutEverywhere` do idioma;
- no caso `ACCOUNT_UPDATE_FAILED`, o `errorAlert` é chamado com
  `"<apiErrors.ACCOUNT_UPDATE_FAILED> (<requestIdLabel>: req-unlink-1)"`.

O critério de aceite 3 do plano ("com o código do erro") deve ser lido como "com o código do pedido". O
código de produção não muda por isso.

Fora isso, nenhum desvio. As decisões D1 a D7 foram seguidas como estão.

## Decisões em aberto

Nenhuma nova. As três da §11 do plano seguem com a opção adotada lá.

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| testes da app e do i18n | `pnpm turbo run test typecheck --filter app --filter @repo/internationalization` | `app:test` 155 arquivos, 1409 testes passando; `@repo/internationalization:test` 7 arquivos, 67 testes passando (inclui a paridade); 11/11 tasks ok |
| typecheck app e i18n | mesmo comando acima | `app:typecheck` e `@repo/internationalization:typecheck` ok, sem `error TS` |
| lint | `pnpm check` | "Checked 1167 files … No fixes applied", saída 0 |
| testes alvo | `npx vitest run __tests__/accountSignInMethodsSessionsNotRevoked.test.tsx __tests__/profileDropdown*.test.tsx` (em `apps/app`) | 5 arquivos, 28 testes passando |

Sem `--force` em nenhum gate. Os quatro testes de `ProfileDropdown` que já existiam passaram sem mudar
asserção, só com o mock do contexto. `adminAccountNavigation.test.tsx` e `focusNotObscuredScrollPadding.test.tsx`
mockam o componente e passaram na suíte completa.

### Prova por mutação

Feita com cópia dos originais no scratchpad da sessão, fora do repositório, e restaurada com `cmp` confirmando
igualdade. Nenhum `.bak` ficou no repo (`find . -name "*.bak"` sem saída). Nenhum gate oficial rodou durante a
troca.

| mutação | teste | resultado |
|---------|-------|-----------|
| `isImpersonating ? null : user` → `isImpersonating ? user : user` | `profileDropdownAccount.test.tsx` | 2 de 13 falham: "não mostra o nome nem a foto do admin…" e "não mostra nome nem e-mail do admin enquanto a conta carrega" |
| condição do desvio trocada para um código que nunca bate | `accountSignInMethodsSessionsNotRevoked.test.tsx` | 3 de 4 falham, um por idioma |

O caso "mostra o nome da conta personificada quando ela tem nome" não cai com a primeira mutação, como
esperado: ele fixa que a conta continua sendo a fonte, não o corte do fallback.

### Smoke

Não subi app. A mudança é de copy e de fonte de dado num componente, e os testes de componente cobrem os dois
lados. Nenhum processo ficou de pé.

## A verificar no /test

- Menu do perfil personificando uma conta sem nome e sem avatar: gatilho com o prefixo do e-mail da conta,
  sem nome nem foto do admin em lugar nenhum. Repro: emulador, admin com foto, personificar conta criada só
  com e-mail e senha, abrir o menu. Medido apenas em jsdom com mocks; no browser, a verificar no `/test`.
- Mesma conferência com conta personificada que tem nome, e ao sair da personificação (o menu volta ao admin).
  A verificar no `/test`.
- Janela entre trocar de sujeito e `/account/me` responder: o menu fica vazio em vez de mostrar o admin.
  Provado em jsdom com `account` indefinido; o tempo real da janela no browser, a verificar no `/test`.
- Toast do desvincular com `500 AUTH_SESSIONS_NOT_REVOKED` nos 3 idiomas, pessoa continua logada na aba
  Segurança. Repro: interceptar `DELETE /account/sign-in-methods/password` com o `agent-browser` e devolver
  `500 {"error":{"code":"AUTH_SESSIONS_NOT_REVOKED"}}`. A verificar no `/test`.
- Light, dark e mobile (390 px) do menu sob personificação. A verificar no `/test`.

## Lacunas de teste conhecidas

- Nenhum teste cobre o desvincular do Google com `AUTH_SESSIONS_NOT_REVOKED`. A API não devolve esse código
  nesse caminho (§10.2 do plano), então ficou de fora.
- O caso de outro erro do desvincular roda só em pt-br; a copy vem de `apiErrors`, cuja paridade já é testada
  no pacote de i18n.
