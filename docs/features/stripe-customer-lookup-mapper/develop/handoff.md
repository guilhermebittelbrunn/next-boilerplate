# Handoff do /develop: mapper nas leituras do `userRepository`

Só `apps/api`, mais três linhas de documentação. Nenhum contrato do SDK, rota, guard, `error.code` ou
chave de i18n mudou.

## Blueprint → arquivos

| Item do plano | Arquivo |
|---------------|---------|
| `userMapper` (classe `UserMapper` + instância) | `apps/api/(shared)/mappers/user.mapper.ts` (acréscimo no fim do arquivo) |
| Registro no `super` e as duas buscas via `this.toDTO` | `apps/api/(shared)/repositories/user.repository.ts` |
| Teste do mapper (novo) | `apps/api/__tests__/userMapper.test.ts` (9 casos) |
| `findByStripeCustomerId` devolve `Date` + perfil sem `deletedAt` | `apps/api/__tests__/userRepositoryBilling.test.ts` (+2 casos) |
| `findByReferenceId` e `findById` devolvem `Date`; título do teste de `update` | `apps/api/__tests__/baseRepository.test.ts` (+3 casos, título trocado para "update writes only the given fields", asserção igual) |
| Fora do plano: leitura e regravação contra o Firestore real | `apps/api/__tests__/userProfileInstants.emulator.test.ts` (novo, 2 casos) |
| Fora do plano: docs que diziam que o `user` não tem mapper | `apps/api/CLAUDE.md:25`, `AGENTS.md:46`, `docs/ARCHITECTURE.md:52` (o exemplo passou a ser `organization`) |

Contrato: nenhum. `UserDTO` já declarava `Date`. Quem consome a mudança são os chamadores de `findById`,
`findAll`/`list`, `findByReferenceId`, `findByStripeCustomerId` e `create` do `userRepository`, listados
abaixo.

Códigos de erro novos: nenhum. `apiErrors` não mudou.

## Desvios em relação ao plano

1. **Conversão de instante não usa `normalizeFirestoreInstant`.** O blueprint fazia
   `new Date(normalizeFirestoreInstant(value))`. Com uma string que não é data, isso gera `Invalid Date`, e o
   `serializeFirestoreData` chama `toISOString()` nela e lança `RangeError` em `GET /users`. Antes da
   mudança essa string passava intacta. O `toDate` local converte `Timestamp` (pelo `toDate()` duck-typed),
   mantém `Date`, converte string ISO válida e devolve qualquer outro valor como estava. Teste:
   `userMapper.test.ts`, "reads an ISO string as Date and hands an unreadable value back as stored".
2. **Lista única de chaves em vez de `required`/`nullable`.** O mapper só reescreve a chave que existe e
   não é `null`. Isso cobre os dois casos do plano: `deletedAt: null` e `currentPeriodEnd: null` continuam
   `null`, e campo ausente continua ausente. Também preserva `onboarding: null`.
3. **Teste de emulador acrescentado.** O plano descartava emulador. Como o repositório roda contra o
   Firestore real, um teste lê um perfil gravado com `Date` (o SDK guarda `Timestamp`) pelas três buscas e
   confere `Date` em todos os instantes, inclusive os aninhados. Outro lê o perfil, regrava
   `onboarding` com o `Date` lido via `userRepository.update` e confirma que o documento volta a ter
   `Timestamp`.
4. **Três docs corrigidos.** `apps/api/CLAUDE.md`, `AGENTS.md` e `docs/ARCHITECTURE.md` citavam o `user`
   como exemplo de repositório sem mapper, o que deixa de ser verdade. Troquei o exemplo por
   `organization`, que segue sem mapper. Atenção no commit: `apps/api/CLAUDE.md` já tem uma mudança de outra
   tarefa (linha 12, `requireOwnAccountApi`); a desta tarefa é só a linha 25, então o arquivo precisa de
   `git add -p`.

## Consumidores conferidos

Busca feita com `grep -rnE '\.toDate\(\)|\.toMillis\(\)|\.seconds\b|instanceof Timestamp|Timestamp\.|_seconds'`
em `apps/api` e `packages` (fora de teste) e com a contagem dos campos lidos em `subjectProfile`,
`actorProfile` e `profile` nas rotas e libs.

| Consumidor | Campo | Resultado |
|------------|-------|-----------|
| `serializeFirestoreData` (`user.mapper.ts`) via `list()` e `mergeAuthAndFirestore` (`getMergedUserByUid`, `getMergedUserFromIdToken`, `GET users/[id]`, export de conta) | todos | trata `Date` e `Timestamp` com o mesmo `toISOString()`. Os testes de `list` e de serialização passam sem mudar asserção. |
| `activity-recorder.ts:78` (`isStampedInWindow`) | `lastAccessAt` | `normalizeFirestoreInstant` aceita `Date`. |
| `account/onboarding/route.ts` → `toOnboardingStateDTO` / `advanceOnboardingState` | `onboarding.completedAt` | `toIsoInstant` aceita `Date`; o avanço compara `completedAt !== null`, que segue igual. |
| `webhooks/payments/route.ts:110` → `subscriptionNotificationFor` | `subscription` | lê só `subscriptionId`, `status`, `cancelAtPeriodEnd`. |
| `payments/checkout/route.ts:41`, `users/[id]/route.ts:78`, `account-erasure.ts:179` | `subscription` | leem `status`/`subscriptionId`. |
| `account/route.ts:134,150` | `avatar`, `preferences` | sem instante. |
| `billing-state.ts:183,259` | `subscription.lastEventAt`, `entitlements.lastEventAt` | leem o snapshot cru dentro da transação, não o DTO. Sem efeito. |
| guards (`admin.ts`, `common-panel.ts`), `auth-request-context.ts`, `organization-*`, `user-merge.ts` | `id`, `type`, `reference_id`, `stripeCustomerId` | sem instante. |
| `onboarding.ts:33`, `organization-invitation.repository.ts:67`, `organization.repository.ts:32` | `toDate()`/`toMillis()` | o primeiro já trata `Date` antes; os outros dois não leem perfil. |

Regravação: as três chamadas a `userRepository.update` (`users/[id]` com `type`, `account` com patch
montado do zero, `account/onboarding` com o estado novo) não espalham o perfil lido. O caso em que um
`Date` lido volta ao Firestore está coberto pelo teste de emulador: volta como `Timestamp`.

Testes que comparam perfil lido com `toEqual` contendo `Timestamp`: a suíte inteira da API passou sem
alteração de asserção, então não há.

## Validação

| Comando | Resultado |
|---------|-----------|
| `NODE_ENV=test pnpm vitest run __tests__/userRepositoryBilling.test.ts __tests__/baseRepository.test.ts`, **antes** da correção | 3 falhas / 85 passaram: "devolve os instantes gravados como Date", "hands back the stored instants as Date" (×2), todas com `expected Timestamp{ _seconds: … } to be an instance of Date` |
| mesmo comando + `userMapper.test.ts`, depois | 97/97 |
| `pnpm --filter api test` | 131 arquivos, 1873 testes, todos passaram |
| `pnpm --filter api test:emulator` com `user.repository.ts` do `HEAD` (antes da correção) | 1 falha / 275: "hands back every stored Timestamp as Date, on all three lookups" (`expected Timestamp{…} to deeply equal 2026-01-02T03:04:05.000Z`) |
| `pnpm --filter api test:emulator` depois (JDK 21, portas 8080/9099/9199 livres antes e depois) | 9 arquivos, 276 testes, todos passaram |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm check` | 1155 arquivos, sem erro |

i18n: não se aplica.

## A verificar no /test

- `GET /users` e `GET /users/:id` respondem os mesmos ISO de antes. Medido só nos testes de unidade de
  `list` e de serialização. Repro: com o emulador semeado, comparar o corpo das duas rotas no `HEAD` e no
  working tree.
- Webhook da Stripe acha o perfil por `stripeCustomerId` com `deletedAt` ausente e com perfil apagado ao
  lado. Medido no fake e no emulador; contra a Stripe real não foi medido.

## Lacunas de teste conhecidas

- Não há teste de `create` do usuário passando pelo mapper; o caso "Date de entrada continua Date" está no
  teste do mapper, não no do repositório.
- `findAll` com `Timestamp` está coberto só indiretamente, pelo `list()` que serializa para ISO.

## Decisões em aberto

Nenhuma.
