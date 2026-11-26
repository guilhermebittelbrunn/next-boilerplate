# Revisão: markRead contra notificação apagada

Escopo: `apps/api/(shared)/infra/firestore-errors.ts`, `apps/api/(shared)/repositories/notification.repository.ts`,
`apps/api/app/(routes)/notifications/[id]/read/route.ts` e os testes `notificationsRoute.test.ts`,
`notificationRepository.test.ts`, `firestoreErrors.test.ts` (novo) e `notificationMarkRead.emulator.test.ts`
(novo). As outras tarefas do working tree não foram relidas.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Não é protegida. Regex: `BRANCH INVALIDA`.
- Proposta, herdada do plano combinado: `feat/admin-account-forms-and-session-revocation`. Regex:
  `branch OK`.
- Nada foi criado nem renomeado, porque a rodada é do `/cycle`. O `/review` cria a branch a partir da atual
  antes do primeiro commit.

## Revisão

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/api/__tests__/notificationRepository.test.ts:330-352`: o caso "propaga uma falha de escrita que não
  é documento ausente" troca `fakeDb.collection` e só restaurava o original depois do `expect`. Se a
  asserção falhasse, o `collection` trocado vazava para os casos seguintes, porque o `beforeEach` chama só
  `fakeDb.reset()`, que não mexe em `collection`. Corrigido: a restauração foi para um `finally`.

### ✅ OK

- **O catch só absorve NOT_FOUND.** `notification.repository.ts:70-81`: `isNotFoundError(error)` devolve
  `null`; qualquer outro erro é relançado com `throw error`. O teste com `code: 7` (PERMISSION_DENIED)
  confirma que a rejeição sobe com o código original.
- **O 404 não revela existência.** `route.ts:31-33` usa o mesmo `notFound()` (`route.ts:10-14`) dos casos de
  id inutilizável e de notificação de outro dono: mesmo status 404, mesmo corpo
  `{ error: { code: "NOTIFICATION_NOT_FOUND" } }`. Nada no corpo ou no cabeçalho distingue os três casos.
- **`Promise<string | null>` não quebra chamador.** `grep -rn "markRead(" apps packages`: o único chamador
  de `notificationRepository.markRead` é a rota. `apiClient.notification.markRead`
  (`packages/sdk/src/actions/notification/action.ts:44`) e `useNotificationActions.ts:111` são a action HTTP,
  outro símbolo; o contrato da resposta não mudou, porque o `null` vira 404 antes do `Response.json`.
  `notificationsRouteImpersonation.test.ts:148` chama a rota, e o guard barra a escrita antes do repositório.
- **Helper só numérico.** A API usa o Admin SDK via gRPC (nenhum `preferRest` em `apps` nem `packages`), e o
  gRPC entrega o status como número. O teste de emulador mediu `code: 5` no `update` cru
  (`5 NOT_FOUND: no entity to update`, no handoff). A forma em texto `"not-found"` é do SDK cliente, que a
  API não importa. O helper segue o molde de `isAlreadyExistsError`, no mesmo arquivo.
- **Escrita a mais.** O `update` do Firestore não cria documento; o teste de repositório confere que `gone`
  continua ausente do store e o de emulador confere `exists === false` depois do `markRead`.
- **Comentários.** O JSDoc de `markRead` explica o que `null` significa (documento apagado por TTL ou expurgo
  da conta), e a constante `NOT_FOUND` tem a mesma linha de doc que `ALREADY_EXISTS`. Nenhum cita artefato do
  fluxo.
- **Contrato e i18n.** Nenhum DTO, action do SDK ou `error.code` novo. `NOTIFICATION_NOT_FOUND` já existe em
  `apiErrors` nos três idiomas.
- **Independência no plano.** Os cinco arquivos alterados só têm hunks desta tarefa (conferido com
  `git diff`), e nenhum outro commit do plano combinado os lista. `markRead` usa `this.db` direto, então a
  mudança de `base.repository.ts` (commit 19) não interfere.

### 👁 Verificar no `/test`

Sem browser. O diff não tem superfície de UI e a corrida não se reproduz clicando.

1. `pnpm --filter api test`: esperado 132 arquivos e 1890 testes passando, com os casos novos de
   `notificationsRoute.test.ts`, `notificationRepository.test.ts` e `firestoreErrors.test.ts`.
2. `pnpm --filter api test:emulator` (JDK 21): esperado `notificationMarkRead.emulator.test.ts` verde. É a
   única medição de que o driver real rejeita com `code: 5`, a afirmação que sustenta o helper.

## Correções aplicadas

- `apps/api/__tests__/notificationRepository.test.ts`: no caso `code: 7`, a restauração de
  `fakeDb.collection` passou para um bloco `try/finally`.

## Raio de impacto

Só `apps/api`. Nenhum consumidor externo: `markRead` do repositório tem um chamador, a rota
`POST /notifications/[id]/read`. O app recebe 404 `NOTIFICATION_NOT_FOUND` onde antes recebia 500; o toast
que ele mostra nesse caso não foi mexido (decisão 1 do handoff).

## Lacunas de teste

- Corrida ponta a ponta numa requisição HTTP (documento apagado entre `findById` e `update`): continua aberta.
  As duas metades estão medidas (rota com `markRead` resolvendo `null`; `markRead` contra o emulador).
  Reproduzir a corrida exigiria injetar a deleção entre as duas chamadas, e o custo não compensa.

## Decisões em aberto

As três do handoff continuam com a recomendação adotada; nenhuma nova.

1. Toast de `NOTIFICATION_NOT_FOUND` no app: sem mudança.
2. `markAllReadByUserId` com documento sumindo no meio do lote: fora desta tarefa, candidato a achado no
   `specs/reference/AUDIT.md`.
3. Um caso de emulador: mantido.

## Gates

| gate | resultado |
|------|-----------|
| `pnpm --filter api typecheck` | exit 0 (depois da correção) |
| `pnpm check` | 1159 arquivos, nenhum ajuste |
| Paridade de i18n | não se aplica, nenhuma chave mudou |
| `pnpm --filter api test` / `test:emulator` | não rodados aqui; números do handoff: 1890 testes e 281 testes, todos passando |

Nenhum gate rodou com `--force`.

## Plano de commits

Plano combinado de `docs/features/google-signin-copy-i18n/review/review.md` (52 commits), agora com 54.
Esta tarefa entra como 20 e 54. Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio
(conferido nesta revisão: vazio).

Posição: depois do último commit de api (19, `fix(api): let the document id win over a stored id field`) e
antes do primeiro de app (`fix(app): disable the avatar upload while impersonating`). Não depende de nenhum
commit do plano e nenhum depende dele. Os seis arquivos só têm mudança desta tarefa, então basta `git add`
simples.

### Trecho alterado

1 a 19: sem mudança.

20. `fix(api): answer 404 when a notification disappears before it is marked read` (esta tarefa)
    - `apps/api/(shared)/infra/firestore-errors.ts`,
      `apps/api/(shared)/repositories/notification.repository.ts`,
      `apps/api/app/(routes)/notifications/[id]/read/route.ts`,
      `apps/api/__tests__/notificationsRoute.test.ts`, `apps/api/__tests__/notificationRepository.test.ts`,
      `apps/api/__tests__/firestoreErrors.test.ts`, `apps/api/__tests__/notificationMarkRead.emulator.test.ts`
    - Corpo: "A notification removed by its TTL or by an account purge between the ownership read and the
      write made update() reject with NOT_FOUND, and the route answered 500. markRead now returns null for
      that status and rethrows anything else, and the route answers the same 404 NOTIFICATION_NOT_FOUND it
      uses for someone else's notification."
21 a 52: os antigos 20 a 51, com o mesmo conteúdo e a mesma ordem relativa (o `fix(app): translate google
sign-in failure copy` passa de 28 para 29; o `docs(features): google-signin-copy-i18n` passa de 52 para 53).
54. `docs(features): notification-markread-missing` (esta tarefa)
    - `docs/features/notification-markread-missing/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Varredura de segredo na pasta da feature: nenhuma ocorrência de senha, token, chave ou e-mail. Repetir no
que o `/test` gravar antes do commit 54.

Título de PR sugerido: o do plano combinado, sem mudança. Depois do último commit aprovado, o `/review`
pergunta se deve rodar `git push -u origin feat/admin-account-forms-and-session-revocation`.

### Commits realizados

(preenchido pelo orquestrador)
