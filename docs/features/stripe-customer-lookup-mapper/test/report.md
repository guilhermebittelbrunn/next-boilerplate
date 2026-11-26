# Relatório do /test: mapper nas leituras do `userRepository`

Branch: `guilhermebittelbrunn/claude-cycle-full-pipeline` (não protegida). Nada commitado, nenhuma branch
criada.

## Sem browser

O diff toca só `apps/api` (mapper e repositório do usuário) e três docs. Nenhuma tela, rota, guard,
`error.code` ou chave de i18n mudou, e as rotas que respondem perfil passam por `serializeFirestoreData`.
Não subi app, API nem `agent-browser`. A comparação das respostas HTTP foi feita no nível do
serializador, contra o Firestore do emulador (abaixo), que é onde a mudança acontece.

## Teste criado

`apps/api/__tests__/userProfileInstants.emulator.test.ts`, estendido com um `describe` novo,
"userRepository serialization against the Firestore emulator", de 3 casos:

| Caso | O que confere |
|------|---------------|
| serializes findById and findAll to the same ISO strings as the raw snapshot | perfil com `Timestamp` em todos os 7 instantes (4 no topo, 3 aninhados, incluindo `currentPeriodEnd`). Cada instante de `findById` e do item de `findAll()` é `Date`; `serializeFirestoreData` dos dois é igual (`toEqual`) a `serializeFirestoreData({ ...snap.data(), id })`, a forma que o `HEAD` serializava. |
| keeps an instant stored as a full ISO string serializing to the same value | mesmos 7 instantes gravados como `"2026-01-02T03:04:05.000Z"`: serialização de `findById` e de `findAll` igual à do snapshot cru. |
| widens an instant stored as a bare date to midnight UTC | mesmos 7 instantes gravados como `"2026-01-02"`: o snapshot cru serializa `"2026-01-02"`, e `findById`/`findAll` serializam `"2026-01-02T00:00:00.000Z"`. |

### Por que emulador (faixa cara)

O objeto do teste é o que o Firestore devolve de fato: um `Date` gravado volta como `Timestamp`, e o
`findAll` depende do `where("deletedAt", "==", null)` real. Um repositório com `fakeDb` devolve o que o
teste colocou nele e não prova que o mapper recebe `Timestamp` do SDK. O arquivo já existia e já roda no
`test:emulator`, então não houve setup novo.

### Prova de reprovação

Troquei temporariamente `apps/api/(shared)/repositories/user.repository.ts` pela versão do `HEAD`
(`git show HEAD:...`), rodei só este arquivo com
`firebase emulators:exec --only firestore,storage --project demo-next-boilerplate 'vitest run --config vitest.emulator.config.mts __tests__/userProfileInstants.emulator.test.ts'`
e restaurei a cópia do working tree. `cmp` entre a cópia guardada e o arquivo restaurado não acusou
diferença, e o `git diff --stat` do arquivo voltou a 5 inserções e 6 remoções.

Resultado contra o `HEAD`: 3 falharam, 2 passaram.

- "serializes findById and findAll ...": `expected Timestamp{ _seconds: 1767323045, …(1) } to be an instance of Date`. É o `findById` devolvendo `Timestamp`. A asserção de `findAll` vem depois no mesmo laço e não chegou a rodar isolada; no `HEAD` o `findAll` do usuário também não tinha mapper.
- "widens an instant stored as a bare date ...": `expected '2026-01-02' to be '2026-01-02T00:00:00.000Z'`.
- "hands back every stored Timestamp as Date ..." (caso que o `/develop` criou): `expected Timestamp{…} to deeply equal 2026-01-02T03:04:05.000Z`.

Os dois que passam no `HEAD` são esperados: a ISO completa serializa igual antes e depois, e a regravação
de `Date` como `Timestamp` não depende do mapper.

## Comandos e resultados

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api test:emulator` (JDK 21 via `JAVA_HOME=/opt/homebrew/opt/openjdk@21`; portas 8080/9099/9199 livres antes) | 9 arquivos, 279 testes, todos passaram (276 do handoff + 3 novos) |
| `pnpm --filter api test` | 131 arquivos, 1873 testes, todos passaram |
| `pnpm test` (raiz, sem `--force`) | 15/15 tasks, 13 do cache, 42 s. `api:test` 1873 e `api:test:emulator` 279 rodaram de verdade; `app` 1378, `web` 315, `@repo/internationalization` 67 e os demais vieram do cache. Nenhum `Timeout starting forks runner`. `uptime` antes: load 10,50 / 10,29 / 9,29; depois: 9,67 / 10,14 / 9,29 |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm check` | 1155 arquivos, sem erro |
| Paridade de i18n | não se aplica; o pacote não mudou (67/67 no cache do `pnpm test`) |

## Critérios de aceite

| Critério | Status | Meio |
|----------|--------|------|
| `findByStripeCustomerId` devolve `Date` | PASS | unit (`userRepositoryBilling.test.ts`) + emulador |
| Semântica de busca do webhook preservada | PASS | unit (`userRepositoryBilling.test.ts`) |
| `findByReferenceId`, `findById` e `findAll` passam pelo mapper | PASS | unit (`baseRepository.test.ts`) + emulador (novo caso cobre `findAll`) |
| Campos ausentes continuam ausentes | PASS | unit (`userMapper.test.ts`) |
| Campos fora do tipo passam intactos | PASS | unit (`userMapper.test.ts`) |
| Respostas HTTP inalteradas (`Timestamp` e ISO completa) | PASS | emulador (novo) |
| Data sem hora vira meia-noite UTC | PASS, mudança de contrato aceita | emulador (novo) |
| `Date` regravado volta como `Timestamp` | PASS | emulador (caso do `/develop`) |
| Webhook da Stripe real | não coberto | precisa de chave de teste da Stripe |
| Gates verdes | PASS | comandos acima |

## Verificar no `/test`

1. `GET /users` e `GET /users/:id` devolvem os mesmos ISO de antes: **confirmado** para `Timestamp` e
   ISO completa, nos 7 instantes, por `findById` e `findAll`. Para `"2026-01-02"` o valor muda para
   `"2026-01-02T00:00:00.000Z"`, como a revisão previu.
2. Webhook da Stripe contra a Stripe real: **não verificável** neste ambiente (sem chave de teste). A
   query não mudou e o caso está coberto no fake e no emulador.

## Observação de contrato

Instante salvo como data sem hora (`"2026-01-02"`) passa a sair como `"2026-01-02T00:00:00.000Z"` em
`GET /users` e `GET /users/:id`. Classifiquei como observação, não defeito:

- nenhum escritor do perfil grava instante como string; só documento legado ou editado à mão chega lá;
- os leitores no `apps/app` (`UsersListClient.tsx:49` via `formatDateTime`, `AccountBillingPanel.tsx:119`
  via `formatPeriodEnd`, `shared/lib/onboarding.ts:41` via `Date.parse`) interpretam o valor como data, e
  `new Date("2026-01-02")` já é meia-noite UTC, então o instante exibido não muda;
- `git grep` por `slice(0, 10)` e `split("T")` em `apps/api` e `packages` fora de testes não achou ninguém
  dependendo do formato curto.

## Decisões de custo

- `user.mapper.ts`: o `userMapper.test.ts` (unit) já cobre conversão, ausentes, `null` e campos extras.
  Nada novo.
- `user.repository.ts`: `baseRepository.test.ts` e `userRepositoryBilling.test.ts` (unit com `fakeDb`)
  cobrem as buscas próprias. O teste de emulador novo cobre o que o fake não prova: o `Timestamp` real
  que o SDK devolve e o `findAll` com o filtro de `deletedAt` real.

## Lacunas herdadas

| Lacuna | Veredito |
|--------|----------|
| `findAll` com `Timestamp` coberto só via `list()` | fechada: o caso novo confere `Date` em cada instante do item de `findAll()` |
| `create` do usuário passando pelo mapper | continua aberta; o caso "Date de entrada continua Date" está só no teste do mapper |
| Documento com campo `id` próprio (`toEntity` da base) | continua aberta; depende da decisão sobre a precedência do `id`, fora do escopo |

## Ambiente

- Emulador: subido e derrubado pelo próprio `firebase emulators:exec` (no repro e dentro de
  `test:emulator`). Nada reutilizado do usuário.
- Portas 8080, 9099 e 9199 livres antes e depois de cada execução. Nenhum app subido.
- Estado de dev alterado: nenhum. Os documentos de teste vivem no projeto demo do emulador e são apagados
  no `afterAll`.
- Nenhuma credencial usada ou gravada.
