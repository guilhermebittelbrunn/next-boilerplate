# Handoff do develop: redirect-double-slash-guard

Rodada autônoma do `/cycle`. Parte do working tree da `small-api-web-fixes`, que já mexia nos dois arquivos
desta tarefa e ainda não foi commitada.

## Blueprint para arquivos

| item do plano | arquivo | linhas (estado atual) |
|---------------|---------|------------------------|
| condição nova no `pathname` resolvido | `packages/auth/redirect.ts` | 43-45 |
| comentário ampliado (tab, LF/CR, `\`) | `packages/auth/redirect.ts` | 39-41 |
| 6 recusas novas | `packages/auth/__tests__/postAuthRedirectTarget.test.ts` | 94-105, `it("rejects a path the URL parser resolves to a double slash")` |
| aceitos sem `//` resolvido (`/pt-br/`, `/pt-br/x\t/y`) | mesmo teste | 107-112 |
| limite conhecido: `//` em query ou hash cai no fallback | mesmo teste | 114-119 |

Contrato (SDK, API, DTO, i18n, UI): nada mudou. Códigos de erro novos: nenhum.

## Desvios

- As 6 recusas foram para um `it` novo em vez de entrar no `it("rejects a path smuggling a double slash")`
  existente, como o pseudo-diff do plano sugeria. O `it` antigo ficou intacto. Assim o diff desta tarefa
  no teste é um bloco só de linhas adicionadas, separável do que a `small-api-web-fixes` trouxe.
- Nenhuma decisão do plano estava errada. Conferi as 10 entradas da §7 com `new URL(p,
  "http://placeholder.invalid").pathname` em Node 22 e os resultados batem com a tabela do plano.

## Separação dos hunks para o commit

- `packages/auth/redirect.ts`: o `git diff` mostra três hunks. O da docstring (linhas 17-20) e o da remoção
  do `decodeURIComponent` (29) são da `small-api-web-fixes`. O hunk das linhas 39-45 é desta tarefa.
  `git add -p` separa os três.
- `packages/auth/__tests__/postAuthRedirectTarget.test.ts` está **untracked** (a outra tarefa moveu o
  arquivo de `apps/app/__tests__/`). `git add -p` não opera em arquivo untracked: rode `git add -N` antes,
  ou commite a `small-api-web-fixes` primeiro com o arquivo sem as linhas 94-119 e acrescente essas linhas
  no commit desta tarefa. A versão do teste anterior a esta tarefa está em
  `/private/tmp/claude-501/-Users-guilhermebittelbrunn-orca-workspaces-next-boilerplate-mako/b4a530f4-52d0-4537-a958-51e713cbc227/scratchpad/test.pre-task.ts`
  (o scratchpad é temporário; a fonte que dura é o próprio diff: as linhas 94-119 são as únicas desta tarefa).

## Validação

| gate | comando | resultado |
|------|---------|-----------|
| testes do pacote | `pnpm --filter @repo/auth test` | 16 arquivos, 219 testes, todos passando; `postAuthRedirectTarget.test.ts` com 18 |
| testes da app que usam o guard | `npx vitest run` em `apps/app` com `onboardingState`, `authRedirectLink`, `proxy`, `postLoginPreferences` | 4 arquivos, 67 testes passando |
| idem, demais chamadores | `onboardingRedirect`, `postLoginFullPageNavigation`, `useSignedInRedirect` | 3 arquivos, 26 testes passando |
| typecheck | `pnpm --filter @repo/auth typecheck`, `pnpm --filter app typecheck` | sem erro |
| lint | `pnpm check` | 1175 arquivos, nenhuma correção |
| i18n | não se aplica | nenhuma chave nova |

Carga da máquina durante os gates (`uptime`): load average entre 7 e 12. Nenhum gate falhou nem precisou
repetir.

### Mutação

Tirei `&& !resolvedPath.includes("//")` de `redirect.ts` com `sed` (cópia do arquivo pós-tarefa no
scratchpad) e rodei duas medições:

- `npx vitest run __tests__/postAuthRedirectTarget.test.ts`: falha só o `it("rejects a path the URL parser
  resolves to a double slash")`; os outros 17 passam.
- Como o `for` para na primeira asserção, chamei o guard mutado com cada uma das 6 entradas via
  `npx vite-node`: as 6 devolvem a própria entrada em vez do fallback. Com o guard real, as 6 devolvem
  `/pt-br`.

Restaurei o arquivo pela cópia e `cmp` saiu sem diferença. Nenhum `.bak` ficou no repo (`ls *.bak` em
`packages/auth` não encontrou nada).

## A verificar no `/test`

- `pnpm test` da raiz (inclui `test:emulator` da API), que não rodei. Esta tarefa não toca a API, então não
  espero efeito.
- Opcional, só se o app já estiver de pé: abrir `/pt-br/sign-in?redirect=%2Fpt-br%2F%5Cevil.com`, entrar e
  conferir que a navegação vai para `/pt-br`. Não medi isso.

## Lacunas de teste conhecidas

Nenhum teste de chamador (`proxy`, `postLoginNavigation`, `provider.tsx`, `withRedirectQuery`,
`resolveOnboardingDestination`) usa as entradas novas. Eles herdam o fallback por chamar a mesma função, e
a cobertura da regra fica no teste de unidade do guard.

## Decisões em aberto

Nenhuma nova. A pergunta 1 do plano (`//` em query ou hash continua recusado pela checagem do valor bruto)
segue como observação, e o teste das linhas 114-119 documenta esse comportamento.
