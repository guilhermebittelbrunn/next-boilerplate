# Handoff do develop: formulários de login e cadastro da landing

Só `apps/web`. Segui o blueprint da §10 do plano sem desvio de comportamento. SDK, API, i18n, env e
`packages/*` ficaram intactos.

## Blueprint → arquivos

| Item do plano | Arquivo | O que mudou |
|---|---|---|
| §5.1 login: navegar quem chega autenticado | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx` | `useRouter`, `signInStartedHereRef = useRef(false)` marcado no `onSubmit` e no clique do Google, `useEffect` que faz `router.push(\`/${locale}\`)` com `!authLoading && user && !signInStartedHereRef.current`. O `return null` com usuário continua. |
| §5.1 e §5.2 recuo e `noValidate` | os dois `*-form-client.tsx` | `px-4 md:px-2` no contêiner externo e `noValidate` no `<form>`. |
| §5.2 cadastro: pedir o e-mail de verificação | `apps/web/app/[locale]/sign-up/components/sign-up-form-client.tsx` | `requestVerificationEmail(credential)`: lê o token com `.catch(() => null)`, sai se não houver, grava com `apiClient.setAuthorizationHeader` e chama `apiClient.authApi.sendEmailVerification({ locale }).catch(() => null)`. `createAccount.onSuccess` passa a `signIn.mutate(credentials, { onSuccess: requestVerificationEmail })`. |
| §7 T1 | `apps/web/__tests__/signInFormRedirect.test.tsx` (novo, jsdom no arquivo) | 6 casos: chega autenticado → `push("/en")`; sem usuário não navega; `loading: true` não navega; envio por e-mail seguido de `user` não navega; clique no Google seguido de `user` não navega; `form.noValidate === true` e `abc` no e-mail mostra `signIn.validation.emailInvalid` sem chamar `signIn.mutate`. |
| §7 T2 | `apps/web/__tests__/signUpFormApi.test.tsx` (editado) | Mock do client ganhou `setAuthorizationHeader` e `authApi.sendEmailVerification`. A asserção de `signInMutateMock` virou `toHaveBeenCalledWith(CREDENTIALS, objectContaining({ onSuccess: any(Function) }))`. Três casos novos: token gravado antes do pedido e `sendEmailVerification({ locale: "en" })`; 503 `EMAIL_NOT_CONFIGURED` resolve sem `errorAlert` e sem `console.error`; `getIdToken` rejeitado não faz o pedido. O caso de erro de API também confere que o pedido não sai. `apiError` aceita o status como segundo argumento. |
| §7 T3 | `apps/web/__tests__/signUpFormSubmitLock.test.tsx` (editado) | Caso novo: a tag `<form>` do `renderToString` tem `novalidate`. O render virou o helper `renderForm()`. |

## Contrato

Nenhum DTO nem action mudou. A landing passa a consumir `apiClient.authApi.sendEmailVerification`, que já
existia (`packages/sdk/src/actions/auth/action.ts:144`). Raio de impacto: só os dois formulários da web.

## Códigos de erro

Nenhum código novo. `EMAIL_NOT_CONFIGURED` e `EMAIL_SEND_FAILED` já estão em `apiErrors`, e esta tarefa não
os mostra na tela.

## Desvios

Nenhum de comportamento. Dois ajustes de forma:

- O ref se chama `signInStartedHereRef`, e não `submittedRef`, para dizer o que ele guarda. Mantive o
  comentário de duas linhas acima do efeito: o nome não explica que o provider respeita `?redirect=`, que é
  a razão do guard.
- No T2, o spy de `console.error` não leva `mockImplementation(() => {})`, porque o Biome recusa bloco vazio
  (`noEmptyBlockStatements`). Um spy sem implementação basta para a asserção `not.toHaveBeenCalled()`.

Não encontrei decisão errada no plano. Conferi as âncoras que sustentam o D1 em `packages/auth/provider.tsx`:
`resolvePostLoginPath` lê `window.location.search` depois do `await syncSessionCookie` em `onAuthSuccess`, e
`handleSessionEnded` empurra para `/${locale}/sign-in?redirect=…`.

## Decisões em aberto

Nenhuma bloqueia. Os achados adjacentes do §1.6 do plano (dois `AuthProvider` aninhados na web e a corrida
teórica no cadastro) continuam abertos e fora de escopo.

## Validação

| Gate | Comando | Resultado |
|---|---|---|
| Testes da web | `pnpm --filter web test` | 25 arquivos, 199 testes, todos passando (10 testes novos: 6 no T1, 3 no T2, 1 no T3) |
| Typecheck | `pnpm --filter web typecheck` (com `pipefail`) | exit 0 |
| Lint | `pnpm check` | `Checked 970 files … No fixes applied.`, sem erro |
| Paridade i18n | não rodado | nenhuma chave tocada |
| `console` cru novo | `grep -rn "console\." apps/web/app/[locale]/sign-in apps/web/app/[locale]/sign-up \| wc -l` | 0 |
| Rota da API no modo degradado (não alterada, só consultada) | `pnpm exec vitest run __tests__/authEmailVerification.test.ts` em `apps/api` | 22 testes passando, incluindo "reports a fork with no mailer configured" (`EMAIL_NOT_CONFIGURED`) |

Os testes novos derrubam a ausência da mudança. Medi por mutação, restaurando os arquivos depois:

- Com os dois componentes no HEAD (`git show HEAD:<arquivo>`), os três arquivos de teste dão 7 falhas e 9
  aprovações em 16 testes. Falham o redirect de quem chega autenticado, os dois `noValidate`, a nova
  assinatura do `signIn.mutate` e os três casos de verificação.
- Com o efeito do login sem o guard (`&& !signInStartedHereRef.current` removido, que é a cópia literal do
  cadastro), o T1 dá 2 falhas em 6, exatamente os casos de login iniciado na tela (e-mail e Google).

Modo degradado: coberto por teste de componente (503 `EMAIL_NOT_CONFIGURED` rejeitado pelo mock resolve sem
toast e sem `console.error`) e pelo teste da rota acima. Não subi API, emulador nem web. O pedido real
respondendo 503 fica para o `/test`.

Smoke local: não rodei. Os testes em jsdom montam o formulário de login de verdade e bastaram para seguir.

## A verificar no `/test`

Nenhum destes foi medido aqui:

- F2: com sessão ativa, abrir `/<locale>/sign-in` leva a `/<locale>`, inclusive depois de entrar só pela
  app (bootstrap de SSO).
- F3: `/pt-br/sign-in?redirect=%2Fpt-br%2Fcontact` sem sessão, entrar, termina em `/pt-br/contact`. Repetir
  umas três vezes. O teste de componente prova que o efeito não navega depois de um envio; a ordem real
  entre `setUser`, o efeito e o provider só se mede no navegador.
- Fim de sessão: o provider faz `logout()` e depois `router.push` para o login com `?redirect=`. Se o
  formulário montar com `user` ainda presente nesse intervalo, o efeito navega para `/<locale>` e o
  `?redirect=` se perde. Pela leitura, `user` já é `null` quando a página monta, mas não medi. Repro: forçar
  sessão expirada numa página interna e conferir o destino depois de entrar de novo.
- F4: cadastro sem `RESEND_TOKEN` gera `POST /auth/email-verification/send` com `Authorization` e corpo
  `{"locale":"<locale>"}`, responde `503` `EMAIL_NOT_CONFIGURED`, e a pessoa termina em `/<locale>` logada,
  sem toast de erro e sem erro novo no console.
- F5: balão nativo ausente e mensagem do Zod no idioma da URL nos dois formulários (`abc`, `qa@example`,
  vazio). O T1 cobre `abc` no login em `en`; o cadastro só tem a prova do atributo no HTML.
- F6: 16 px de recuo a 375 px nos dois cartões, claro e escuro, e cartão centralizado com `max-w-md` a 768 px
  ou mais.

## Lacunas de teste conhecidas

- Nenhum teste prova a ordem entre o efeito do login e o `onAuthSuccess` do provider real; o T1 mocka o
  `useAuth`.
- O cadastro não tem teste de interação em jsdom para a mensagem do Zod com `noValidate`; só o atributo no
  HTML (T3).
- `px-4 md:px-2` não tem teste, como o plano previa: largura é da passada de navegador.
