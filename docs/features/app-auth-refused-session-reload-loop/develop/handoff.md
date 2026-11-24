# Handoff do develop: laço de recarga com a sessão recusada

## Blueprint para arquivos

| item do plano | arquivos |
|---------------|----------|
| 5.1 provider desloga na recusa; navegação fora do `try` | `packages/auth/provider.tsx` (`establishSession` + `onAuthSuccess`) |
| 5.2 hook único da app | `apps/app/shared/hooks/useSignedInRedirect.ts` (novo) |
| 5.3 formulários da app | `apps/app/app/[locale]/(unauthenticated)/sign-in/components/SignInForm.tsx`, `apps/app/app/[locale]/(unauthenticated)/sign-up/components/SignUpFormClient.tsx` (o efeito saiu, entrou `useSignedInRedirect()`; saíram os imports de `useEffect` e `HTTP_STATUS`) |
| 5.3 comentário do link por e-mail | `apps/app/app/[locale]/(unauthenticated)/sign-in/email-link/components/EmailLinkCompletion.tsx` (só o comentário, com o texto do plano) |
| 5.4 ref da landing | `apps/web/app/[locale]/sign-in/components/sign-in-form-client.tsx` |
| T1 | `apps/app/__tests__/useSignedInRedirect.test.tsx` (novo, 10 testes) |
| T2 | `apps/app/__tests__/signInPersistedSessionRedirect.test.tsx` renomeado para `authFormsPersistedSessionRedirect.test.tsx` (10 testes, `describe.each` sobre os dois formulários) |
| T3 | `apps/app/__tests__/authProviderSessionNotEstablished.test.tsx` (de 5 para 10 testes) |
| T4 | `apps/web/__tests__/signInFormRedirect.test.tsx` (+1 teste) |

O rename de T2 foi feito com `git mv` seguido de `git reset -q` nos dois caminhos. O índice ficou vazio
(`git diff --cached --stat` sem saída): o working tree mostra ` D` no nome antigo e `??` no novo, e o
`/review` prepara os dois no mesmo commit.

Nenhum arquivo tocado aqui tinha mudança não commitada de outra feature da rodada (conferido com
`git status --short` antes de editar).

## Contrato

- Nenhum DTO, action do SDK ou rota da API mudou. `AuthContextType` ficou igual.
- `onAuthSuccess` continua sem relançar. As três mutações (`signIn`, `signInWithGoogle`,
  `signInWithEmailLink`) seguem terminando em sucesso, e o `isSuccess` que `EmailLinkCompletion` lê não muda.
- Interface nova: `useSignedInRedirect(): void`, consumida por `SignInForm` e `SignUpFormClient`.

## Códigos de erro e i18n

Nenhum código novo, nenhuma chave nova. O alerta usa `packages.auth.provider.session.notEstablished`, que já
existe nos três idiomas.

## Desvios do plano

1. **Login da landing: dois efeitos em vez de um.** O pseudo-diff 10.5 zerava o ref dentro do efeito que
   navega, cujas dependências incluem `router`. Quando o efeito roda de novo sem `user` mudar (o mock do teste
   devolve um `router` novo a cada render, e o `react-hook-form` re-renderiza no envio), o ref voltava a
   `false` logo depois do clique. Com isso o teste já existente "leaves the navigation of an e-mail sign-in
   started on this screen to the auth provider" passou a falhar (`pushMock` chamado 1 vez). A correção foi um
   efeito separado, com dependência só em `user`, que zera o ref quando `user` vira `null`. O efeito de
   navegação ficou como estava. A ressalva do plano ("o efeito não roda e não zera o ref antes da hora") só
   valia se `router` tivesse identidade estável.
2. **Comentários.** No provider, duas linhas no `catch` de `establishSession` explicam por que deslogar. No
   hook, um JSDoc de três linhas diz que o proxy devolve à tela de login qualquer destino sem cookie. O
   comentário antigo do efeito do login saiu junto com o efeito.

## Validação (comandos rodados)

| gate | comando | resultado |
|------|---------|-----------|
| testes app | `pnpm turbo run test --filter=app` | 141 arquivos, 1300 testes, todos passando |
| testes web | `pnpm turbo run test --filter=web` | 35 arquivos, 315 testes, todos passando |
| testes auth | `pnpm turbo run test --filter=@repo/auth` | 15 arquivos, 201 testes, todos passando |
| typecheck | `pnpm turbo run typecheck --filter=app --filter=web --filter=@repo/auth` + `pnpm --filter app typecheck` depois do último ajuste | 3/3 sem erro |
| lint | `pnpm check` | 1124 arquivos, sem erro |
| i18n | não rodado: nenhuma chave mudou (o `@repo/internationalization:test` entrou como dependência do turbo acima: 67 testes passando) | - |

Prova de que os testes pegam o defeito, rodando cada teste contra o código antigo e restaurando o novo em
seguida:

- T2 com `SignInForm` e `SignUpFormClient` do `HEAD` (`git show HEAD:<arquivo>`): 8 de 10 falham. Passam só
  os dois casos de 200.
- T3 com `provider.tsx` do `HEAD`: 4 de 10 falham (os três de logout na recusa e o do destino que não
  resolve).
- T4 sem a linha que zera o ref: o teste novo falha e os outros 6 passam.

## Smoke

Não subi app nem navegador. Os testes de hook e de componente cobrem a reação do cliente a cada resposta, e o
laço real no navegador fica para o `/test` (fluxos F1 a F7 do plano). Não há `apps/*/AGENTS.md` não rastreado.

## A verificar no `/test`

Tudo abaixo vem de leitura e de teste com mock. Nada foi medido em navegador.

- **F1 a F7 do plano**, com o `--init-script` que embrulha `window.fetch` e o contador de cargas em
  `sessionStorage`. O fim do laço (carga parada em 1 por 5 s) só foi provado com mock (T2).
- **Corrida R1, com uma correção ao plano.** O plano diz que, se o `POST` do hook falhar e o do provider
  passar, o provider faz o bootstrap pelo cookie na rota protegida. Pela leitura, isso não acontece:
  `applySignedInUser` já marcou `bootstrapAttemptedRef` como `true`, e o `router.push` do provider é uma
  navegação client-side, que não remonta o provider. O resultado provável é o painel aberto com cookie, mas
  sem usuário no cliente Firebase (sem ID token para a API) até uma recarga. Repro sugerido: `--init-script`
  que rejeita só o segundo `POST /api/auth/session` da página (contador no próprio script), login por senha
  em `/pt-br/sign-in`, e então observar se o painel carrega dados ou fica em skeleton. Se reproduzir, a saída
  provável é o hook não agir enquanto uma mutação de login do provider está pendente. Não mexi nisso porque
  amplia o contrato que os mocks parciais de `useAuth` usam (vários testes devolvem só `signIn`).
- **Duplo envio com recusa**: critério do plano. O botão depende de `signIn.isPending`, que não mudou.
- **Link por e-mail com recusa (F7)**: depende de provedor de e-mail configurado.

## Lacunas de teste conhecidas

- O provider só tem teste pelo `signIn` por senha; Google e link por e-mail compartilham `onAuthSuccess`,
  mas não têm caso próprio. Continua aberta (herdada do plano).
- Nenhum teste cobre a interação entre o hook e o provider montados juntos (a corrida R1 acima).
