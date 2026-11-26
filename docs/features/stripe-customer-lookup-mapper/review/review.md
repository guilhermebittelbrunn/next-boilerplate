# Revisão: mapper nas leituras do `userRepository`

Escopo: só esta tarefa. As outras seis do working tree já têm revisão própria e não foram relidas.

## Branch

- Atual: `guilhermebittelbrunn/claude-cycle-full-pipeline`. Não é protegida, mas não passa no regex do
  padrão (`BRANCH INVALIDA`).
- Proposta, herdada do plano combinado (`docs/features/repo-hygiene-ci/review/review.md`):
  `feat/admin-account-forms-and-session-revocation`. Regex: `branch OK`. Como esta tarefa toca só a
  `apps/api` e docs, o nome continua servindo.
- Nada foi criado nem renomeado: a rodada é do `/cycle`, que não cria branch. Quem cria é o `/review`,
  antes do primeiro commit, a partir da branch atual.

## Revisão: `apps/api` (mapper do usuário) + 3 docs

Nada bloqueante.

### 🔴 Bloqueante

Nenhum.

### 🟡 Atenção

Nenhum.

### 🟢 Sugestão / nit

- `apps/api/(shared)/repositories/base.repository.ts:70`: `toEntity` monta `{ id, ...raw }`, então um
  campo `id` gravado dentro do documento sobrescreve o id do documento. Antes desta tarefa,
  `findById`, `findByReferenceId` e `findByStripeCustomerId` do usuário montavam `{ ...raw, id }` e o id
  do documento vencia. Agora as três passam pelo `toEntity`. Nenhum código grava `id` no perfil (o
  `create` recebe `CreateRequest`, que omite `id`, e `firestore.rules:33` nega escrita do cliente), então
  só um documento editado à mão no console chega a esse caso. O `findAll` do usuário já se comportava
  assim antes. Não corrigi: a correção certa é inverter a ordem no `toEntity` da base, o que muda os onze
  repositórios. Ver "Decisões em aberto".
- `apps/api/(shared)/mappers/user.mapper.ts:95`: o ramo de string usa `new Date(value)`, e o parser do
  V8 é permissivo (`"1"` vira 2001, `"2026-01-02"` vira meia-noite UTC). Só valor legado ou digitado à
  mão chega a esse ramo, porque nenhum escritor do perfil grava instante como string. Efeito visível: um
  instante guardado como `"2026-01-02"` sai em `GET /users` como `"2026-01-02T00:00:00.000Z"`, onde antes
  saía como estava. Aceitável.
- `toDate` (`user.mapper.ts:95`), `instantOf` (`organization-invitation.repository.ts:59`) e
  `toIsoInstant` (`lib/onboarding.ts:24`) fazem o mesmo duck-typing de `toDate()` com contratos
  diferentes: devolve o valor cru, devolve `null`, devolve ISO. Um helper em `@repo/shared` que devolva
  `Date | null` cobriria os três. Fica como dívida no backlog; extrair agora mexe em `packages/shared` e
  em dois arquivos fora da tarefa.

### ✅ OK

- Regra de ouro 5: `userMapper` vai no `super` (`user.repository.ts:47`) e as duas buscas próprias usam
  `this.toDTO` (`:62`, `:96`). A conversão `Timestamp` → `Date` acontece no mapper, não no handler.
  `UserDTO` já declarava `Date`, então nenhum contrato do SDK mudou.
- Desvio 1 do handoff (`toDate` local em vez de `normalizeFirestoreInstant`) está correto. O helper de
  `@repo/shared` devolve string ISO, não `Date`, e cai em epoch (`1970-01-01`) para valor desconhecido.
  `new Date(normalizeFirestoreInstant(x))` com string inválida gera `Invalid Date`, e o
  `serializeFirestoreValue` (`user.mapper.ts:44`) chama `toISOString()` nele e lança `RangeError` em
  `GET /users`. Nenhum helper existente no repo devolve `Date` preservando o valor que não lê. A
  duplicação está registrada acima como nit, não como bloqueio: os três helpers têm contratos
  diferentes, e "corrigir na raiz" (`.claude/cycle-policy.md` §3) fala da mesma gambiarra repetida.
- Sem allow-list, o mapper não acrescenta campo. `withInstants` copia o documento e só reescreve chave
  que já existe e não é `null` (`user.mapper.ts:111-124`). O teste "passes every non-instant field
  through" compara com `toEqual` e confirma que nada entra a mais. O que sai do perfil continua passando
  por `serializeFirestoreData` + `mergeAuthAndFirestore` (nada mudou ali) e pela allow-list do
  `toSessionUser`.
- `toPersistence` não é chamado pelo `BaseRepository` (o `update` grava os campos que recebe), igual aos
  outros mappers. Não afeta escrita.
- Rotas que respondem perfil: `users/route.ts:37,99` e `users/[id]/route.ts:114,182` passam todas por
  `serializeFirestoreData`, que trata `Date` e `Timestamp` com o mesmo `toISOString()`. Nenhuma rota
  devolve `UserDTO` cru em `Response.json`.
- Docs: `AGENTS.md:46`, `docs/ARCHITECTURE.md:52` e `apps/api/CLAUDE.md:25` agora citam `organization`,
  que de fato chama `super(db, "organization")` (`organization.repository.ts:16`). Outros sem mapper:
  `paymentEvent`, `paidInvoice`, `planLabel`.
- Testes novos sem segredo, e o de emulador segue o padrão `*.emulator.test.ts`
  (`vitest.config.mts:8` o exclui da suíte comum, `vitest.emulator.config.mts:13` o inclui).

### 👁 Verificar no `/test`

- `GET /users` e `GET /users/:id` devolvem os mesmos ISO de antes. Repro barato, sem subir dois servidores
  nem alternar `HEAD`: um teste de emulador (ou script `vitest` descartável sob
  `vitest.emulator.config.mts`) que grava um perfil com `Timestamp` em todos os instantes, inclusive os
  aninhados, e compara `serializeFirestoreData({ ...snap.data(), id })` (o que o `HEAD` serializava) com
  `serializeFirestoreData(await userRepository.findById(id))` e com o item correspondente de
  `userRepository.findAll()` via `toEqual`. Somar um perfil com instante salvo como string ISO completa
  (esperado: igual) e outro com `"2026-01-02"` (esperado: muda para `"2026-01-02T00:00:00.000Z"`, como
  registrado acima).
- Webhook da Stripe achando o perfil por `stripeCustomerId`, com `deletedAt` ausente e com um perfil
  apagado ao lado: o handoff mediu no fake e no emulador. Contra a Stripe real (`stripe trigger`) fica
  para quando houver chave de teste. Prioridade baixa, a query não mudou.

## Correções aplicadas

- `.claude/skills/new-api-route/SKILL.md:31`: "ver `user.repository`" passou a "ver
  `organization.repository`". A caça a docs do handoff não pegou esta, que também citava o usuário como
  exemplo de repositório sem mapper.

Nenhuma mudança de código. Typecheck não foi rodado de novo.

## Raio de impacto

Grep independente, fora de `__tests__`, em `apps/api` e `packages`:
`\.toDate\(|\.toMillis\(|\.seconds\b|instanceof Timestamp|_seconds|Timestamp\.`

| Acerto | Lê perfil de usuário? |
|--------|-----------------------|
| `organization-invitation.repository.ts:67` | não, lê `expiresAt` do convite |
| `organization.repository.ts:32` | não, `createTime` de snapshot de organização |
| `lib/onboarding.ts:33` | sim (`onboarding.completedAt`), mas trata `Date` antes (`:25`) |
| `mappers/user.mapper.ts:36-37` | `serializeFirestoreValue`, trata `Date` em `:44` |
| `packages/shared/.../normalizeFirestoreInstant.ts:17` | aceita `Date` em `:13` |

Leitores dos campos de instante (`currentPeriodEnd`, `lastEventAt`, `completedAt`, `lastAccessAt`):
`activity-recorder.ts:40` usa `normalizeFirestoreInstant` (aceita `Date`); `billing-state.ts:183,259`
lê o snapshot cru dentro da transação, não o DTO; `onboarding.ts:59` usa `toIsoInstant`. Nenhum pacote
importa o `userRepository`: `packages/*` e os apps recebem o perfil por HTTP, já serializado.

Resultado: o grep bate com a tabela do handoff. Nada escapou.

## Lacunas de teste

- `create` do usuário passando pelo mapper (lacuna do handoff): continua aberta. O caso "Date de entrada
  continua Date" está só no teste do mapper.
- `findAll` com `Timestamp` coberto só via `list()` (lacuna do handoff): continua aberta. O repro do
  "Verificar no `/test`" acima a fecha se o QA gravar como teste.
- Documento com campo `id` próprio (nit da base): aberta, depende da decisão abaixo.

## Decisões em aberto

- Precedência do `id` no `toEntity` (`base.repository.ts:70`). Recomendação: tarefa própria, trocar para
  `{ ...raw, id }`, com um teste na base, porque toca todos os repositórios com mapper. Não bloqueia
  esta entrega.

## Gates

| Comando | Resultado |
|---------|-----------|
| `pnpm check` (rodado nesta revisão, depois da edição do `SKILL.md`) | 1155 arquivos, sem erro |
| `pnpm --filter api typecheck` | número do handoff: sem erro. Nenhum `.ts` foi tocado aqui |
| `pnpm --filter api test` / `test:emulator` | números do handoff: 1873/1873 e 276/276. Não rodados aqui |
| Paridade de i18n | não se aplica |

## Plano de commits

Plano combinado das sete tarefas, renumerado para 40 commits. Os 35 de
`docs/features/repo-hygiene-ci/review/review.md` mantêm conteúdo e ordem relativa. Esta tarefa entra como
16, 28, 32, 33 e 40. Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio (conferido
nesta revisão: vazio).

Sobre `apps/api/CLAUDE.md`, que tem dois hunks de tarefas diferentes: o commit 27 (antigo 26) passa a usar
`git add -p apps/api/CLAUDE.md`, aceita o 1.º hunk (linha 12, `requireOwnAccountApi`) e recusa o 2.º
(linha 25). Conferir com `git show --stat HEAD`: 1 linha adicionada, 1 removida, e o diff menciona
`requireOwnAccountApi`. O commit 28 vem logo depois e leva o arquivo inteiro, porque só sobra o hunk da
linha 25. Fazer na ordem inversa também funciona, desde que o primeiro dos dois use `-p`; a ordem acima
mantém o commit do guard antes, como no plano combinado.

1. `docs(specs): audit backlog against b7f9124`
2. `test(auth): mark the fictitious JWT fixture as a gitleaks false positive`
3. `chore(next-config): stop next dev from writing AGENTS.md into the apps`
4. `ci: ignore major Stripe SDK updates in Dependabot`
5. `test(e2e): retry action menu trigger until the row dropdown hydrates`
6. `feat(app): center the narrow page column`
7. `feat(app): size full-page forms and account panels to their content`
8. `feat(app): add narrow loading skeletons to the create and edit form pages`
9. `docs(app): document centered narrow pages and content-height forms`
10. `feat(api): add requireOwnAccountApi guard for the caller's own account`
11. `feat(api): open the own-account routes to the admin`
12. `feat(api): route personal uploads through the own-account guard`
13. `fix(api): log the provider code when a session revocation is refused`
14. `fix(api): report a refused session revocation when unlinking the password`
15. `fix(api): stop the admin disable and archive from swallowing a refused session revocation`
16. `fix(api): read user profile instants as Date through a mapper` (esta tarefa)
    - `apps/api/(shared)/mappers/user.mapper.ts`, `apps/api/(shared)/repositories/user.repository.ts`
    - `apps/api/__tests__/userMapper.test.ts`, `apps/api/__tests__/userRepositoryBilling.test.ts`,
      `apps/api/__tests__/baseRepository.test.ts`, `apps/api/__tests__/userProfileInstants.emulator.test.ts`
    - Os quatro arquivos de código e teste têm só hunks desta tarefa (conferido no `git diff`).
    - Corpo: "The user repository handed Firestore Timestamps where UserDTO promises Date. The mapper
      converts top-level and nested instants, copies every other field, and leaves a value it cannot read
      as stored."
17. `fix(app): disable the avatar upload while impersonating` (antigo 16, `git add -p`)
18. `fix(app): unmount the profile menu avatar image when the picture goes away` (antigo 17, `git add -p`)
19. `feat(app): let the account forms hide what the admin area does not offer` (antigo 18)
20. `feat(app): add the admin section set to the account tabs` (antigo 19)
21. `feat(app): add the admin account page` (antigo 20)
22. `feat(app): point the admin navigation to the admin account` (antigo 21)
23. `test(app): harden three tests against a loaded machine` (antigo 22)
24. `fix(app): keep the user disabled in the list when only the session revocation failed` (antigo 23)
25. `feat(internationalization): add the admin account copy` (antigo 24)
26. `fix(internationalization): add the USERS_SESSIONS_NOT_REVOKED message` (antigo 25)
27. `docs(api): list requireOwnAccountApi among the guards` (antigo 26, agora com `git add -p`, só o 1.º
    hunk)
28. `docs(api): name organization as the repository without a mapper` (esta tarefa)
    - `apps/api/CLAUDE.md` (o que sobrou: hunk da linha 25)
29. `docs: document the own-account guard in the auth panel and review checklist` (antigo 27)
30. `docs: describe how a refused session revocation is reported` (antigo 28)
31. `docs: describe the inline gitleaks allow for test fixtures` (antigo 29)
32. `docs: stop citing the user repository as one without a mapper` (esta tarefa)
    - `AGENTS.md`, `docs/ARCHITECTURE.md`
33. `docs(claude): point the new-api-route skill at a repository without a mapper` (esta tarefa)
    - `.claude/skills/new-api-route/SKILL.md`
34. `docs(features): app-form-layout-centered` (antigo 30)
35. `docs(features): admin-own-account` (antigo 31)
36. `docs(features): app-test-suite-stability` (antigo 32)
37. `docs(features): account-avatar-polish` (antigo 33)
38. `docs(features): auth-revocation-failure` (antigo 34)
39. `docs(features): repo-hygiene-ci` (antigo 35)
40. `docs(features): stripe-customer-lookup-mapper` (esta tarefa)
    - `docs/features/stripe-customer-lookup-mapper/` (`STATE.md`, `analyze/plan.md`, `develop/handoff.md`,
      `review/review.md`, mais o que o `/test` gravar)

Os arquivos e corpos dos commits antigos continuam os do plano de `repo-hygiene-ci`.

Varredura de segredo em `docs/features/stripe-customer-lookup-mapper/` e nos dois testes novos (grep por
`eyJ`, `senha`, `password`, `sk_`, `whsec_`, `AIza` e endereço de e-mail): sem acerto. Repetir no que o
`/test` gravar antes do commit 40.

Título de PR sugerido: `feat: admin own account area, centered form pages, session revocation errors, CI hygiene and user profile mapper`.

Depois do último commit aprovado, o `/review` pergunta se deve rodar
`git push -u origin feat/admin-account-forms-and-session-revocation`.

### Commits realizados

(preenchido pelo orquestrador)
