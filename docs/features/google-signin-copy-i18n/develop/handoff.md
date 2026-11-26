# Handoff do develop: textos fixos em inglês no login com Google

## Blueprint e arquivos

| Item do blueprint | Arquivo |
|-------------------|---------|
| Helper `sessionNotEstablishedError()` e os três `throw` de `exchangeForApiSession` usando ele | `apps/app/shared/lib/googleSignInApi.ts` |
| Testes dos dois ramos nos 3 idiomas | `apps/app/__tests__/googleSignInApi.test.ts` |

Os três ramos de falha da troca (popup sem `idToken`, API sem `session.idToken`, `POST /api/auth/session` sem
sucesso) lançam agora `new Error(getDictionary().dictionary.packages.auth.provider.session.notEstablished)`
pelo mesmo helper. `grep -n "throw" googleSignInApi.ts` mostra só o `throw error` do `catch` e as três
chamadas ao helper; os textos `"Google sign-in did not return an ID token"` e `"Invalid response from auth API"`
saíram do arquivo.

## Contrato

Nenhum. Sem DTO, action do SDK, rota, chave de i18n ou `error.code` novos. A chave reaproveitada
(`session.notEstablished`) já existe nos três idiomas.

## Testes adicionados

- `it.each(["pt-br", "en", "es"])` para o popup sem ID token: rejeita com a copy do idioma do cookie
  `x-locale`, não chama `signInWithGoogleMock` e chama `signOutMock` uma vez com o `authClient`.
- `it.each(["pt-br", "en", "es"])` para a API sem `session.idToken`: rejeita com a copy traduzida, não chama
  `fetchMock` nem `setAuthorizationHeaderMock` e chama `signOutMock` uma vez.
- Um caso para o critério "falha no `signOut` não troca o erro que sobe": API sem `session.idToken` com
  `signOutMock` rejeitando; a rejeição continua sendo a copy em es.

Prova de que os testes reprovam sem a correção: rodei `npx vitest run __tests__/googleSignInApi.test.ts`
(em `apps/app`) antes de mexer no código de produção. Resultado: 7 falhas e 11 aprovações. Os 6 casos do
`it.each` receberam `"Google sign-in did not return an ID token"` ou `"Invalid response from auth API"` no
lugar da copy esperada, e o caso do `signOut` recebeu `"Invalid response from auth API"`. Depois da correção,
18 de 18 passam.

## Desvios

Nenhum em relação ao plano. O caso extra do `signOut` com falha não estava na tabela de testes do plano, mas
cobre uma frase do segundo critério de aceite.

## Decisões em aberto

A pergunta do plano (reusar `session.notEstablished` ou criar chave própria) foi resolvida pela recomendação
do plano: reusar. Nada bloqueado.

## Validação

| Gate | Comando | Resultado |
|------|---------|-----------|
| Teste do arquivo | `npx vitest run __tests__/googleSignInApi.test.ts` (em `apps/app`) | 18 passed |
| Suíte da app | `pnpm --filter app test` | 154 arquivos, 1385 testes, todos passando |
| Typecheck | `pnpm --filter app typecheck` | exit 0 |
| Lint | `pnpm check` | exit 0, 1156 arquivos, nenhuma correção |
| Paridade de i18n | não rodado | nenhuma chave mudou |

Nenhum gate rodou com `--force`. Não subi app nem browser: os dois ramos só disparam com resposta malformada
do Google ou da API, e o plano (§8) descarta o percurso no browser por isso.

## A verificar no `/test`

- Nada de comportamento ficou sem instrumento. O que o `/test` deve rodar é a suíte Vitest da `apps/app` e o
  `pnpm test` da raiz.
- A afirmação de que a mensagem chega ao alerta de `SignInForm`/`SignUpFormClient` vem da leitura de
  `FormattedError.formatMessage` feita no plano; não há teste de componente que meça isso para estes dois
  ramos.

## Lacunas de teste conhecidas

Nenhum teste de componente prova que `SignInForm` e `SignUpFormClient` mostram `error.message` de um `Error`
simples no `errorAlert`. É um comportamento que já existia antes desta tarefa e está fora do escopo.
