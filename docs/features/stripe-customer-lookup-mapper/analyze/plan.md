# Plano: mapper nas leituras do `userRepository`

Origem: achado 🟡 de `specs/reference/AUDIT.md:784` ("`findByStripeCustomerId` devolve o documento cru, sem
mapper"). Não há spec nem card. Tarefa só de API, sem superfície de UI.

## 1. Contexto e causa

O achado aponta `findByStripeCustomerId`, mas o defeito é do repositório inteiro.
`UserRepository` é o único repositório com DTO público que chama o `super` sem mapper:
`super(db, "user")` em `apps/api/(shared)/repositories/user.repository.ts:46`. Os outros passam o deles
(`entity.repository.ts:36`, `session.repository.ts:49`, `notification.repository.ts:34` etc.).

Sem `rowMapper`, o `BaseRepository` cai no ramo cru: `toDTO` devolve `{ id, ...(raw as DTO) }`
(`base.repository.ts:73-78`) e `findById` devolve `{ ...(snap.data() as DTO), id }`
(`base.repository.ts:161-164`). Resultado: quatro leituras do perfil entregam `Timestamp` onde
`UserDTO` promete `Date` (`packages/sdk/src/types/user/user.ts:49-51,60`, e os aninhados
`OnboardingState.completedAt` `user.ts:30`, `SubscriptionState.currentPeriodEnd/lastEventAt`
`payments/payments.ts:40,43`, `EntitlementsState.lastEventAt` `payments/plan-access.ts:5`).

| Método | Onde | Como lê hoje |
|--------|------|--------------|
| `findByReferenceId` | `user.repository.ts:49-64` | `{ ...(docs[0].data() as UserDTO), id }` (linha 61) |
| `findByStripeCustomerId` | `user.repository.ts:87-98` | `{ ...(live.data() as UserDTO), id }` (linha 97) |
| `findById` (herdado) | `base.repository.ts:144-165` | ramo sem mapper, `snap.data() as DTO` |
| `findAll` (herdado, usado por `list()`) | `base.repository.ts:81-90` | `toDTO` sem mapper |

As linhas citadas no AUDIT continuam valendo para o método (`:87-98`). O segundo chamador do webhook mudou
de linha: `reconcileEntitlements` chama em `webhooks/payments/route.ts:179` (o AUDIT diz `:156`). O primeiro
é `findSubscriptionOwner` (`route.ts:66`).

São quatro caminhos de leitura com o mesmo defeito. Pela política do ciclo (§3, "corrigir na raiz" a
partir de 3 call sites), a correção é dar ao repositório um mapper e registrá-lo no `super`, como manda a
regra de ouro 5, e não remendar só `findByStripeCustomerId`.

Outros repositórios: `grep 'data() as'` em `apps/api` só acha o padrão `data() as <DTO>` no
`user.repository.ts` (linhas 61 e 97). Os demais repositórios sem mapper (`organization`, `paid-invoice`,
`plan-label`, `payment-event`) já convertem por helper local (`toPaidAmount`, `toStoredPlanLabel`,
`listOwnedBy`) ou não devolvem documento. A linha 288 (`countLiveSubscriptionsByPrice`) lê um projeto
tipado como `unknown` e não sai como DTO. Fica fora.

## 2. Objetivo, corte e fora de escopo

Objetivo: toda leitura de perfil pelo `userRepository` devolve instantes como `Date`, conforme o tipo
`UserDTO`.

Corte de MVP:
- `userMapper` novo em `apps/api/(shared)/mappers/user.mapper.ts`, registrado em
  `super(db, "user", userMapper)`.
- `findByReferenceId` e `findByStripeCustomerId` passam a usar `this.toDTO(doc.id, doc.data())`.
- Testes unitários do mapper e das duas buscas.

Fora de escopo:
- Mudar o tipo `UserDTO` (continua com `Date`) ou qualquer contrato do SDK.
- Mexer em `hasArchivedProfile`, `countLiveSubscriptionsByPrice`, `identifyByStripeCustomerIds` e nas
  transações `apply*State`: leem campos projetados como `unknown` e não devolvem DTO.
- Atualizar `specs/reference/AUDIT.md` (é do `/spec --sync`).
- Limpar os normalizadores defensivos dos consumidores (`normalizeFirestoreInstant` em
  `activity-recorder.ts:40`, `toIsoInstant` em `onboarding.ts:24-36`, `billing-state.ts:183`). Eles
  aceitam `Date`, `string` e `Timestamp`, então continuam corretos. Removê-los seria refatoração fora da
  tarefa.

Apps impactados: só `apps/api`. Modo de produto, área do painel e plano: N/A.

## 3. Semântica que precisa sobreviver

- `findByStripeCustomerId`: consulta só por `stripeCustomerId` (índice automático) e filtra
  `deletedAt == null` em memória, pegando o primeiro vivo (`user.repository.ts:93-95`). Inclui perfis sem
  o campo `deletedAt` (comparação frouxa). O filtro continua sobre o dado cru, antes do mapper.
- `findByReferenceId`: filtra `deletedAt == null` na consulta e pega `docs[0]`. Sem mudança.
- `findById`: o `BaseRepository` já checa `raw.deletedAt != null` antes de chamar o mapper
  (`base.repository.ts:152-159`). Sem mudança.
- `create` passa a devolver o resultado do mapper (`base.repository.ts:186-189`). Os instantes ali já são
  `Date`, então o mapper os mantém.
- `update` não relê o documento (`base.repository.ts:202-219`). O teste
  `baseRepository.test.ts:886` ("keeps createdAt a Timestamp, since the repository has no mapper") segue
  passando, porque trata da escrita. Só o título fica impreciso; o desenvolvedor ajusta o texto para
  "update writes only the given fields" sem mudar a asserção.

O mapper converte para `Date` e não para ISO. Isso respeita o tipo e evita o risco descrito no docstring de
`BaseRepository.update` (`base.repository.ts:202-206`): se algum chamador regravar um perfil lido, um `Date`
volta ao Firestore como `Timestamp`, e uma string ISO quebraria o `orderBy`.

## 4. Impacto nos chamadores

Respostas HTTP não mudam. Quem envia perfil ao cliente passa antes por `serializeFirestoreData`
(`user.mapper.ts:32-59`), que já converte `Timestamp` e `Date` para o mesmo ISO: `list()` via
`mergeWithAuthUser` (`user.repository.ts:392-403`) e `GET users/[id]` via `getMergedUserByUid`
(`user-merge.ts:105-112`).

Leitores internos de campos de data, todos tolerantes a `Date`:

| Leitor | Campo | Por que aceita `Date` |
|--------|-------|------------------------|
| `activity-recorder.ts:40` | `lastAccessAt` | `normalizeFirestoreInstant` trata `Date` (`packages/shared/utils/helpers/normalizeFirestoreInstant.ts:12`) |
| `onboarding.ts:24-36` | `onboarding.completedAt` | `toIsoInstant` trata `Date` primeiro |
| `plan-access.ts:10-28` | `subscription.status`, `entitlements.features` | não lê data |
| `users/[id]/route.ts:78`, `account-erasure.ts:179` | `subscription` | usam `status`/`subscriptionId` |
| `webhooks/payments/route.ts:110` | `profile.subscription` em `subscriptionNotificationFor` | mesma tipagem `SubscriptionState`, que já declara `Date` |
| guards (`admin.ts:45`, `common-panel.ts:65,93`), `auth-request-context.ts:71`, `organization-*` | `id`, `type`, `reference_id` | não leem data |

Nenhum código de produção faz `instanceof Timestamp` sobre perfil (o único é o próprio serializador).
Nenhum compara `deletedAt`, `onboarding`, `subscription` ou `entitlements` com `===`.

Regra do mapper para não mudar comportamento: copia o documento inteiro (`...raw`) e só reescreve os
instantes que existem. Campo ausente continua ausente. Isso importa para `onboarding` (ausente quer dizer
"fluxo concluído", `user.ts:61`) e `lastAccessAt` (ausente quer dizer "nunca acessou"). Lista de campos
fechada (allow-list) descartaria campos que algum chamador lê sem estar no tipo, por isso não usamos.

## 5. Dados, contrato, API, front, i18n

- Firestore: nenhum campo novo, nenhum índice novo, nenhuma escrita alterada.
- `@repo/sdk`: sem mudança. `UserDTO` já declara `Date`.
- API: nenhuma rota, guard ou `error.code` novo.
- Front e i18n: N/A.
- Segurança e impersonação: sem efeito. Guards leem `type` e `reference_id`, que o mapper não toca.

## 6. Testes

Todos unitários, com `Timestamp.fromDate` real do `firebase-admin/firestore` (roda sem emulador, como em
`userProfileSerialization.test.ts:2`). Emulador não entra: a infra não é o objeto.

1. `apps/api/__tests__/userMapper.test.ts` (novo, nível mapper):
   - `Timestamp` em `createdAt`, `updatedAt`, `lastAccessAt` vira `Date` com o mesmo instante;
   - `deletedAt: null` continua `null`;
   - `onboarding.completedAt`, `subscription.currentPeriodEnd`, `subscription.lastEventAt`,
     `entitlements.lastEventAt` como `Timestamp` viram `Date`; `currentPeriodEnd: null` fica `null`;
   - campo ausente (`lastAccessAt`, `onboarding`, `subscription`) continua ausente (`"onboarding" in dto`
     é `false`);
   - campos desconhecidos e `stripeCustomerId`, `reference_id`, `type` passam intactos;
   - `Date` de entrada (perfil recém-criado) continua `Date`.
2. `apps/api/__tests__/userRepositoryBilling.test.ts` (estender o `describe` de `findByStripeCustomerId`,
   nível repositório com o `fakeDb` que já existe em `:13-91`): semear `createdAt` e
   `subscription.lastEventAt` como `Timestamp` e esperar `toBeInstanceOf(Date)`. **Reprova contra o código
   atual**, que devolve o `Timestamp`. Os três casos existentes (vivo, apagado, inexistente) continuam.
3. Mesmo padrão para `findByReferenceId` e `findById` no `describe` de `UserRepository` de
   `baseRepository.test.ts:~870`, que já semeia `Timestamp` (`:880-882`). Também reprova hoje.

Prova de reprovação: o `/develop` escreve os testes 2 e 3 antes da correção, roda
`pnpm --filter api test -- userRepositoryBilling baseRepository` e registra a falha no handoff.

O `/test` não sobe app nem browser: o diff não tem superfície de runtime (política §3.1). Roda a suíte da
`apps/api` e o `pnpm test` da raiz.

## 7. Blueprint

### `apps/api/(shared)/mappers/user.mapper.ts` (acréscimo)

```ts
import type { UserDTO } from "@repo/sdk/src/types";
import type { AllOptional } from "@repo/shared/utils";
import { normalizeFirestoreInstant } from "@repo/shared/utils";
import type { FirestoreDocumentRow } from "../repositories/base.repository";
import Mapper from "./Mapper";

const toDate = (value: unknown): Date => new Date(normalizeFirestoreInstant(value));
const toDateOrNull = (value: unknown): Date | null => (value == null ? null : toDate(value));

function withInstants(
    value: unknown,
    required: string[],
    nullable: string[]
): unknown {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }
    const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const key of required) if (key in out) out[key] = toDate(out[key]);
    for (const key of nullable) if (key in out) out[key] = toDateOrNull(out[key]);
    return out;
}

class UserMapper extends Mapper<FirestoreDocumentRow, UserDTO> {
    toDTO(row: FirestoreDocumentRow): UserDTO {
        const dto = withInstants(row, ["createdAt", "updatedAt"], ["deletedAt", "lastAccessAt"]) as Record<string, unknown>;
        if ("onboarding" in dto) dto.onboarding = withInstants(dto.onboarding, [], ["completedAt"]);
        if ("subscription" in dto) dto.subscription = withInstants(dto.subscription, ["lastEventAt"], ["currentPeriodEnd"]);
        if ("entitlements" in dto) dto.entitlements = withInstants(dto.entitlements, ["lastEventAt"], []);
        return dto as UserDTO;
    }

    toPersistence(input: AllOptional<UserDTO>): AllOptional<Record<string, unknown>> {
        const { id: _id, createdAt: _c, updatedAt: _u, deletedAt: _d, ...rest } = input;
        return rest as AllOptional<Record<string, unknown>>;
    }
}

export const userMapper = new UserMapper();
```

Notas para o desenvolvedor:
- `createdAt`/`updatedAt` são obrigatórios no tipo. Ausentes, ficam ausentes (o `in` protege), em vez de
  virar a época 1970 que o `normalizeFirestoreInstant` daria para `null`.
- Se o import de `FirestoreDocumentRow` criar ciclo (`base.repository` não importa mapper de user, então
  não deve), use `Record<string, unknown> & { id: string }` como o `entity.mapper.ts:7`.
- Biome: `for ... of` com corpo em chaves; sem `forEach`. Nomes do desestruturado conforme a regra de
  variável não usada do repo.

### `apps/api/(shared)/repositories/user.repository.ts` (pseudo-diff)

```diff
 import {
     mergeAuthAndFirestore,
     serializeFirestoreData,
+    userMapper,
 } from "../mappers/user.mapper";
@@
     constructor() {
-        super(db, "user");
+        super(db, "user", userMapper);
     }
@@ findByReferenceId
-        return {
-            ...(querySnapshot.docs[0].data() as UserDTO),
-            id: querySnapshot.docs[0].id,
-        };
+        const [first] = querySnapshot.docs;
+        return this.toDTO(first.id, first.data());
@@ findByStripeCustomerId
-        return live ? { ...(live.data() as UserDTO), id: live.id } : null;
+        return live ? this.toDTO(live.id, live.data()) : null;
```

O docstring de `findByStripeCustomerId` (`:82-86`) continua certo e fica. `mergeWithAuthUser` não muda:
`serializeFirestoreData` já trata `Date`.

### Ordem de implementação e commits

Um app só, dois commits:
1. `fix(api): map user profile reads through a row mapper` (mapper + registro + as duas buscas + testes).
2. `docs(features): stripe-customer-lookup-mapper`.

Sem env nova, sem pendência em `docs/PRE-PRODUCTION.md`.

## 8. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **`findByStripeCustomerId` devolve datas como `Date`**
  Um perfil vivo com `createdAt`, `updatedAt` e `subscription.lastEventAt` gravados como `Timestamp` volta
  com esses campos como instâncias de `Date`, no mesmo instante. O teste correspondente reprova contra o
  código anterior à correção e passa depois dela.

- [ ] **Semântica de busca do webhook preservada**
  `findByStripeCustomerId` continua consultando só por `stripeCustomerId`, ignorando perfil com
  `deletedAt` preenchido e aceitando perfil sem o campo `deletedAt`. Com dois perfis para o mesmo cliente,
  um apagado e um vivo, devolve o vivo; sem correspondência, devolve `null`.

- [ ] **`findByReferenceId` e `findById` também passam pelo mapper**
  Os dois devolvem `createdAt` e `updatedAt` como `Date` quando o documento traz `Timestamp`. Perfil
  apagado continua resultando em `null` nos dois, como hoje.

- [ ] **Campos ausentes continuam ausentes**
  Perfil sem `onboarding`, `lastAccessAt` ou `subscription` não ganha esses campos depois do mapper, nem
  com `null`. Isso mantém "sem onboarding = fluxo concluído" e "sem `lastAccessAt` = nunca acessou".
  `deletedAt: null` e `subscription.currentPeriodEnd: null` continuam `null`.

- [ ] **Campos fora do tipo passam intactos**
  Qualquer campo do documento que não é instante (incluindo campos que não estão em `UserDTO`) chega ao
  chamador com o mesmo valor. O mapper não descarta nada.

- [ ] **Respostas HTTP inalteradas**
  `GET /users` e `GET /users/:id` respondem com os mesmos campos e os mesmos ISO de antes, porque
  `serializeFirestoreData` já converte `Date` e `Timestamp` da mesma forma. As suítes existentes de
  `usersRoute`, `userRepositoryList`, `userProfileSerialization` e `paymentsWebhookRoute` passam sem
  alteração de asserção.

- [ ] **Gates verdes**
  `pnpm --filter api typecheck`, `pnpm check` e `pnpm test` passam. O título do teste em
  `baseRepository.test.ts:886` deixa de dizer que o repositório não tem mapper, sem mudar a asserção.

## 9. Riscos

- Raio maior que o do achado: `findById` e `findAll` passam a converter datas para todos os chamadores
  (guards, organização, merge, listagem). Mitigação: a tabela da §4 cobre os leitores de data, e as
  respostas HTTP passam pelo serializador. Os testes de rota que mockam `userRepository` não sentem a
  mudança. Os que usam o repositório real (`baseRepository`, `userRepositoryList`, `userRepositoryBilling`)
  rodam no `/test`.
- Teste existente que compare um perfil lido com `toEqual` contendo `Timestamp`: não encontrei nenhum, mas o
  `/develop` confirma rodando a suíte da `apps/api` inteira antes de entregar.

## 10. Estado do working tree

Nenhum arquivo alvo está modificado no working tree (`git status` limpo para
`apps/api/(shared)/repositories`, `apps/api/(shared)/mappers`, `apps/api/app/(routes)/webhooks`,
`baseRepository.test.ts`, `userRepositoryBilling.test.ts`, `userRepositoryList.test.ts`,
`userProfileSerialization.test.ts` e `packages/sdk`). As outras tarefas pendentes tocam guards, rotas de
conta e testes de rota, sem sobreposição. Os commits desta tarefa precisam de `git add` por arquivo.

## Decisões tomadas sem perguntar

1. Corrigir na raiz (mapper no `super`) em vez de só em `findByStripeCustomerId`: o mesmo defeito está em
   quatro leituras (§1), acima do limite de 3 da política §3.
2. Converter para `Date`, não ISO: é o que `UserDTO` declara e é o seguro para regravação (§3).
3. Mapper copia o documento e só reescreve instantes presentes, sem allow-list (§4).
4. Não tocar nos normalizadores defensivos dos consumidores nem no AUDIT (§2).
