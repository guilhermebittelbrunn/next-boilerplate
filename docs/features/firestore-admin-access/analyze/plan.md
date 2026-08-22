# Plano — Acesso ao Firestore via Admin SDK e security rules aplicáveis

> Origem: `specs/firestore-admin-access.md` (status `approved`). O **problema**, a **evidência de mercado**
> e o **corte de MVP** são decisão de produto tomada — este plano responde só ao *como*.
> Baseline auditada no commit `e45669a`. Todas as afirmações abaixo citam `arquivo:linha`.

---

## 1. Contexto da tarefa

**Em uma frase**: trocar o caminho de persistência da `apps/api` do Firebase **client SDK não
autenticado** para o **Admin SDK** (identidade de serviço), sem mudar uma linha do contrato HTTP, para que
`firestore.rules` possa ser publicada em `deny-all`.

### 1.1 Objetivos

| # | Objetivo (corte de MVP da spec) | Como este plano entrega |
|---|--------------------------------|-------------------------|
| O1 | A API acessa o Firestore com identidade de serviço | `(shared)/infra/database.ts` passa a expor a instância de `getFirestoreAdmin()` (`packages/auth/server.ts:74-80`); `BaseRepository` e os 2 repositórios reescritos na API do `firebase-admin` (§4) |
| O2 | `entity` e a gestão de usuários seguem iguais, suíte verde | Migração contract-preserving (§4.4) + snapshot antes/depois (§7.1) + 2 arquivos de teste novos (§7.2) |
| O3 | Credenciais saem do código, via env tipado, falhando cedo | Deleta a config hardcoded (`(shared)/infra/dabatase.ts:4-12`); `FIREBASE_ADMIN_*` obrigatórias em `apps/api/env.ts` + assert de boot em `apps/api/instrumentation.ts` (§5) |
| O4 | `deny-all` publicável, com caminho documentado | Reescrita do cabeçalho de `firestore.rules:12-18` + runbook de publicação (§6.3) |
| O5 | Índices exigidos pelas consultas atuais versionados | Inventário das 4 consultas (§6.1) → `firestore.indexes.json` (§6.2) |

### 1.2 Fora de escopo

- **Teste de rules no emulador** — spec `firebase-emulator-seed` (declarado fora pela spec, `:75-76`).
- **Acesso direto do cliente ao Firestore** (regras por dono) — `firestore.rules:34-51`.
- **App Check** — spec `api-hardening`. **Paginação por cursor** — spec `cursor-pagination`.
- **Mudar semântica de consulta.** Tentação real: o Admin SDK torna `.orderBy("createdAt","desc").limit(n)`
  trivial, e `entity.repository.ts:28-32` ordena em memória. **Não fazer nesta tarefa**: mudaria a forma da
  consulta (e exigiria índice composto), poluindo o sinal de "nada mudou" que é o critério de aceite da
  spec. Fica registrado para `cursor-pagination`.
- **`BaseRepository.update()` reescrever o documento inteiro** (`base.repository.ts:111-121`) — achado
  pré-existente detalhado em §9.2; recomendação é deixar fora (pergunta em aberto Q4).
- **Limpeza completa do `apps/api/.env.example`** (herança do upstream: Clerk, `DATABASE_URL`,
  BetterStack, Svix, Knock, Liveblocks, BaseHub — apesar de `docs/SETUP.md:5` afirmar que já foram
  removidas). Só o bloco `FIREBASE_ADMIN_*` é tocado (Q5).

### 1.3 Corte de MVP — a menor fatia vertical

O corte já é mínimo: a mudança **inteira** cabe em `apps/api` + 1 arquivo de `packages/auth` + 3 arquivos
de configuração na raiz. Não há fatia menor que entregue valor observável, porque as três peças são
interdependentes por **tipo**: `BaseRepository` recebe `Firestore` no construtor (`base.repository.ts:36`)
e o `Firestore` do `firebase/firestore` é um tipo **diferente** do `Firestore` do
`firebase-admin/firestore`. Trocar a instância sem reescrever os métodos não compila; reescrever os
métodos sem trocar a instância não roda. §8 explica como isso se traduz em commits.

### 1.4 Apps impactados

| Camada | Impacto | Evidência |
|--------|---------|-----------|
| `packages/sdk` | **Nenhum** — o contrato HTTP não muda | nenhum arquivo do SDK entra no diff |
| `apps/api` | Coração da mudança: infra, `BaseRepository`, 2 repositórios, `env.ts`, `instrumentation.ts`, `package.json`, `.env.example`, 1 mock de teste | §4, §5 |
| `apps/app` | **Nenhum arquivo alterado.** É onde a verificação acontece (§7.3) | `GET /entities` renderiza `createdAt` em `EntitiesListClient.tsx:78-79` e `EntityFormFields.tsx:73` |
| `apps/web` | N/A — não fala com Firestore | grep: nenhum import de `firebase/firestore` em `apps/web` |
| `packages/auth` | 1 arquivo: `keys.ts` (rejeitar credencial parcial, §5.3) | `keys.ts:5-9,29-43` |
| Raiz | `firestore.rules`, `firestore.indexes.json`, `.firebaserc` (novo, versionado) | §6 |
| Docs | `docs/SECURITY.md:26-42,57`, `docs/SETUP.md:141` | §6.4 |

- **Área do painel**: ambas — `requireCommonPanelApi` (entities) e `requireAdminApi` (users) passam pelo
  `userRepository`, logo pela mesma instância de banco.
- **Modo de produto** (`subscription` × `simple`): sem diferença. A troca é abaixo do guard.
- **Assinatura/plano**: N/A.
- **Genérico × específico**: o acesso admin ao Firestore já é genérico e **já vive no pacote**
  (`packages/auth/server.ts:74-80`); a API só passa a consumi-lo. Nenhuma API nova em `packages/*`.

### 1.5 O que a auditoria confirmou (e que sustenta o plano)

1. `getFirestoreAdmin` é **código morto**: `packages/auth/server.ts:74` é a única ocorrência no repo
   inteiro (grep repo-wide: 3 hits, sendo 2 em documentação — `firestore.rules:14`, `docs/SECURITY.md:37`).
   A peça existe, testada por ninguém, chamada por ninguém.
2. `firebase-admin` **já é dependência de runtime de fato** da `apps/api`, declarada errado:
   `apps/api/package.json:39` a lista em `devDependencies`, mas `(shared)/mappers/user.mapper.ts:2` importa
   `Timestamp` como **valor** (usado em `:31`, `value instanceof Timestamp`), executado em toda listagem de
   usuários. Funciona hoje por hoisting do pnpm via `@repo/auth` (`packages/auth/package.json:23`).
3. **Nenhum cliente lê o Firestore direto**: o único `firebase/app` fora da api é
   `packages/auth/client.ts:4`, e ele importa só `firebase/auth` (`:5-17`). Não há uso de
   `firebase/storage`/`getStorage` em nenhum app. Publicar `deny-all` não quebra front nenhum.
4. `apps/api/env.ts` **não é carregado no boot**: o único importador de `@/env` na api é
   `app/(routes)/webhooks/payments/route.ts:6`. Colocar a exigência de credencial só em `env.ts` daria
   **zero** garantia de falhar cedo — daí o assert em `instrumentation.ts` (§5.2).
5. `apps/api/instrumentation.ts` é um stub vazio (`export const register = () => {}`) — o gancho de boot
   já existe, não precisa ser criado.
6. **Não existe CI** (`.github/` não existe): o gate é manual — `pnpm check`, `pnpm test`,
   `pnpm --filter api typecheck`. `turbo.json:8` faz `build` depender de `test`, então a suíte gateia o
   build local.

---

## 2. Dados (Firestore)

### 2.1 Coleções e documentos

**Nenhum campo novo, nenhuma coleção nova, nenhum backfill.** As duas coleções existentes continuam
idênticas: `entity` (`entity.repository.ts:9`) e `user` (`user.repository.ts:12`).

O que **muda** é o *tipo nativo* que o driver devolve para os campos temporais:

| Campo | Antes (client SDK) | Depois (Admin SDK) | Quem absorve |
|-------|--------------------|--------------------|--------------|
| `createdAt`, `updatedAt` | `Timestamp` de `firebase/firestore` | `Timestamp` de `firebase-admin/firestore` | `normalizeFirestoreInstant` (§2.3) |
| `deletedAt` | `null` \| `Timestamp` (client) | `null` \| `Timestamp` (admin) | idem |

### 2.2 Consultas existentes — inventário completo

Estas são **todas** as consultas do repo. Nenhuma é adicionada ou alterada.

| # | Origem | Consulta | Filtro/ordenação em memória | Índice exigido |
|---|--------|----------|------------------------------|----------------|
| C1 | `base.repository.ts:46-49` `findAll()` | `entity`/`user`: `where("deletedAt","==",null)` | — | Single-field automático |
| C2 | `base.repository.ts:58-59` `findById()` | `doc(table, id).get()` | filtro `deletedAt != null` em memória (`:64-66`) | Nenhum (leitura por id) |
| C3 | `entity.repository.ts:13-16` `listByUserId()` | `where("userId","==",uid)` | **sim**: descarta `deletedAt != null` (`:21-23`) e ordena `createdAt desc` (`:28-32`) | Single-field automático |
| C4 | `user.repository.ts:17-25` `findByReferenceId()` | `where("reference_id","==",x)` **+** `where("deletedAt","==",null)` | — | **Duas igualdades** → §6.2 |

Escritas: `addDoc` (`base.repository.ts:88`), `updateDoc` (`:121`). Soft delete via `update` (`:135`) — o
`delete()` **nunca** remove documento.

**Limite real do `BaseRepository`** (o guia §2.2 exige registrar): continua sem paginação, sem `orderBy` e
sem filtro composto. A migração **não** o remove — remove apenas o impedimento técnico (o Admin SDK
suporta tudo isso). C3 segue lendo **todos** os documentos de um `userId` e ordenando em memória; para
volume alto isso é o gargalo, e a decisão de arquitetura pertence a `cursor-pagination`.

### 2.3 Dados existentes — o ponto de risco real

O risco nomeado pela spec (`:100-102`, "regressão silenciosa em normalização de data") está concentrado em
**dois** normalizadores, e eles se comportam de forma **oposta**:

**a) `normalizeFirestoreInstant` — imune por construção.**
`packages/shared/utils/helpers/normalizeFirestoreInstant.ts:15-18` faz **duck typing** em `.toDate()`, não
`instanceof`. Ambos os `Timestamp` (client e admin) expõem `toDate()`. Trata também `string` (`:9-11`),
`Date` (`:12-14`) e `null` (`:6-8`). É o caminho de `entityMapper.toDTO` (`entity.mapper.ts:26-31`), ou
seja, **todo o slice `entity` — o que a UI de fato renderiza — está protegido de origem**.

**b) `serializeFirestoreData` — hoje quebrado, será *consertado* pela migração.**
`(shared)/mappers/user.mapper.ts:31` usa `value instanceof Timestamp`, com `Timestamp` importado de
**`firebase-admin/firestore`** (`:2`). Como os dados chegam hoje pelo **client SDK**, o `instanceof` é
**sempre falso**; o valor cai em `:34-36` (objeto → recursão) e sai como
`{ seconds, nanoseconds }`. Ou seja: **`GET /users` devolve hoje `createdAt` como objeto**, não como data.
Depois da migração o `instanceof` casa e o campo vira **string ISO**.

> ⚠️ Esta é a **única mudança observável de payload** que a migração produz. É preciso decidir
> explicitamente que ela é aceitável — e ela é, por três razões verificadas:
> 1. Nenhuma tela consome o campo: grep por `createdAt` em
>    `apps/app/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/` → **zero ocorrências** (a lista
>    admin não tem coluna de data).
> 2. O tipo do contrato já mentia: `UserDTO.createdAt: Date` (`packages/sdk/src/types/user/user.ts`),
>    e JSON não tem `Date` — nem antes nem depois o valor era um `Date`.
> 3. O valor novo (ISO) é o mesmo formato que `EntityDTO.createdAt: string` já usa.
>
> **Registrar como mudança conhecida no handoff**, com asserção de teste explícita (§7.2, T6) para que
> ninguém a descubra por acidente seis meses depois.

**c) Documentos com tipo misto, já em produção.** `base.repository.ts:111-121` (`update`) lê o documento
via `findById` — que, com mapper, devolve **strings ISO** — e reescreve o objeto inteiro. Consequência: um
`entity` que já sofreu um `PUT` tem `createdAt` gravado como **string** no Firestore; um que nunca sofreu
tem `Timestamp`. Os dois formatos continuam funcionando depois da migração (`normalizeFirestoreInstant`
trata ambos), então **não há regressão** — mas o teste do repositório precisa cobrir os dois
(§7.2, T3/T4), porque é exatamente o tipo de assimetria em que uma migração de driver quebra em silêncio.

---

## 3. Contrato `@repo/sdk`

**N/A — nenhuma mudança.** Nenhum DTO, `Create/UpdateRequest`, action ou registro no `Client` é tocado.
Isto é um requisito, não uma consequência: o sinal de pronto da spec (`:115`) é "nenhuma chamada do app
precisou mudar". O diff **não pode** conter arquivo de `packages/sdk` — se contiver, a migração deixou de
ser contract-preserving e o `/review` deve barrar.

Consumidores que provam a estabilidade do contrato (nenhum é editado): `EntityDTO`
(`packages/sdk/src/types/entity/entity.ts:8-21`) e `UserWithAuthDTO`
(`packages/sdk/src/types/user/user.ts`).

---

## 4. API (`apps/api`) — a tradução das duas APIs de Firestore

### 4.1 Rotas, guards, validação, erros

**N/A — nada muda.** As 10 rotas (`app/(routes)/**`), os 2 guards (`app/(guards)/admin.ts`,
`common-panel.ts`), os 2 schemas Zod (`(shared)/validation/`) e **nenhum `error.code`** entram no diff.
Corolário: **zero chave nova de i18n**, nenhuma entrada nova em `apiErrors`
(`translations/packages/shared/utils.ts`), e o teste de paridade
(`packages/internationalization/__tests__/parity.test.ts`) não é afetado. §4.6 discute por que **não** se
deve inventar um `error.code` para falha de credencial.

### 4.2 `(shared)/infra/database.ts` (substitui `dabatase.ts`)

Renomeado (decidido pela spec, `:121-122`). Raio de impacto: **3 importadores**, todos verificados por
grep — `user.repository.ts:4`, `entity.repository.ts:3` e o **mock de teste**
`__tests__/userRepositoryList.test.ts:11`. Este terceiro é o que um "renomeia e ajusta imports" esquece.

Forma nova (blueprint, não implementação):

```ts
import { getFirestoreAdmin } from "@repo/auth/server";

const db = getFirestoreAdmin();

export default db;
```

Três decisões embutidas:

- **Mantém `export default`**, para que os dois repositórios não precisem mudar a forma do import — menos
  ruído no diff, mais foco no que importa.
- **Resolução no carregamento do módulo**, como hoje (`dabatase.ts:14-15` também inicializa no import).
  Isso mantém `super(db, …)` funcionando nos singletons de repositório
  (`entity.repository.ts:36`, `user.repository.ts:70`), que são instanciados em tempo de import. Um `db`
  preguiçoso obrigaria `BaseRepository` a guardar um *getter* em vez de uma instância — complexidade sem
  ganho, já que o assert de boot (§5.2) resolve o "falhar cedo".
- **A config hardcoded (`dabatase.ts:4-12`) é deletada, não migrada** para `NEXT_PUBLIC_FIREBASE_*`. Ela
  só existia para o client SDK; o Admin SDK precisa apenas de `projectId`/`clientEmail`/`privateKey`, que
  `packages/auth/keys.ts:19-23` já lê. Isso torna obsoleta a pendência de higiene de
  `docs/SETUP.md:141` e `docs/SECURITY.md:57`.

### 4.3 Tabela de tradução client SDK → Admin SDK

O mapa completo do que muda em `base.repository.ts`, `entity.repository.ts` e `user.repository.ts`:

| Client SDK (hoje) | Admin SDK (depois) | Armadilha |
|---|---|---|
| `import { … } from "firebase/firestore"` | `import type { DocumentData, Firestore } from "firebase-admin/firestore"` | Só **tipos** sobram no import; as funções viram métodos da instância |
| `collection(db, table)` | `db.collection(table)` | — |
| `doc(db, table, id)` | `db.collection(table).doc(id)` | — |
| `query(ref, where(f,"==",v))` | `ref.where(f,"==",v)` | Encadeável: `ref.where(a).where(b)` |
| `getDocs(q)` | `q.get()` | — |
| `getDoc(docRef)` | `docRef.get()` | — |
| **`snap.exists()`** | **`snap.exists`** | 🔴 **A armadilha central.** Método no client, **getter booleano** no Admin. `if (!snap.exists())` compila com `any` e explode em runtime com `snap.exists is not a function`. Atinge `base.repository.ts:60`. Coberto pelo teste T1 (§7.2) |
| `addDoc(ref, data)` | `ref.add(data)` | Retorna `DocumentReference` nos dois; `.id` igual |
| `updateDoc(docRef, data)` | `docRef.update(data)` | Os dois exigem documento existente e rejeitam `undefined` — equivalentes |
| `WithFieldValue<DocumentData>` | `DocumentData` (ou `WithFieldValue` de `firebase-admin/firestore`) | Tipos homônimos e **incompatíveis** entre pacotes |
| `snapshot.docs`, `doc.id`, `doc.data()` | idênticos | — |
| `Timestamp` (client) | `Timestamp` (`firebase-admin/firestore`) | §2.3 |

**Referência viva no próprio repo**: `apps/api/scripts/create-dev-admin.mjs:71-96` já usa exatamente esse
dialeto — `db.collection(…)`, `.where(…).limit(1).get()`, `existing.empty`, `collection.add({…})`,
`profile.ref.update({…})`. O `/develop` deve espelhar esse arquivo, não inventar o estilo.

### 4.4 Reescrita método a método (contrato preservado)

Regra de ouro desta migração: **mesmo comportamento observável, inclusive os defeitos**. Nada de
"aproveitar para melhorar" fora do que está explicitamente autorizado em §4.5.

| Método | Onde | Mudança | Invariante a preservar |
|--------|------|---------|------------------------|
| `constructor` | `:35-39` | tipo de `db` → `Firestore` do `firebase-admin/firestore` | assinatura `(db, table, rowMapper?)` intacta — `super(db,"entity",entityMapper)` e `super(db,"user")` não mudam |
| `toEntity` | `:41-43` | nenhuma | — |
| `findAll` | `:45-55` | `db.collection(t).where("deletedAt","==",null).get()` | mesmo conjunto de documentos. **Exceção autorizada**: aplicar o `rowMapper` (§4.5) |
| `findById` | `:57-76` | `.doc(id).get()`; **`snap.exists` sem parênteses** | `null` para inexistente **e** para `deletedAt != null`; mapper quando existe; fallback `{...data, id}` quando não |
| `create` | `:78-99` | `.add(dataToCreate)` | estampa `createdAt`/`updatedAt` como `new Date()` e `deletedAt: null`; devolve o objeto **montado em memória** (não relê do banco) — mantém, pois é o que faz `POST /entities` responder ISO |
| `createBulk` | `:101-107` | nenhuma | — |
| `update` | `:109-124` | `.doc(id).update(dataToUpdate)` | **mantém o read-modify-write de `:111`** com todos os efeitos de §2.3c. Não corrigir aqui (Q4) |
| `updateBulk` / `delete` / `deleteBulk` | `:126-140` | nenhuma | soft delete continua sendo `update({deletedAt})` |
| `EntityRepository.listByUserId` | `entity.repository.ts:12-33` | `db.collection("entity").where("userId","==",uid).get()` | filtro de `deletedAt` **e** ordenação `createdAt desc` continuam **em memória** |
| `UserRepository.findByReferenceId` | `user.repository.ts:16-34` | `.where("reference_id","==",x).where("deletedAt","==",null).get()` | devolve `null` em lista vazia; **sem mapper** (`{...data, id}` cru) |
| `UserRepository.list` / `mergeWithAuthUser` | `:36-67` | nenhuma | `auth/user-not-found` some da lista; erro transitório **propaga** (`:61-66`) |

Esqueleto ilustrativo dos dois pontos mais delicados:

```ts
// findById — o `exists` é propriedade, não chamada
const snap = await this.db.collection(this.table).doc(id).get();
if (!snap.exists) { return null; }

// findByReferenceId — duas igualdades encadeadas
const snapshot = await this.db
    .collection(this.table)
    .where("reference_id", "==", referenceId)
    .where("deletedAt", "==", null)
    .get();
```

### 4.5 A única correção de comportamento autorizada — `findAll()` ignora o `rowMapper`

`base.repository.ts:45-54` devolve `{ id, ...doc.data() }` **sem** passar pelo mapper, enquanto
`findById` (`:67-71`) e `create` (`:95-97`) aplicam. **Recomendação: corrigir nesta tarefa** (Q2), por
quatro razões:

1. **É o mesmo código que está sendo reescrito** — o método some e volta linha por linha.
2. **Impacto observável hoje: zero.** Os dois únicos chamadores são `userRepository.list()` via
   `findAll()` (`user.repository.ts:37`) — e `UserRepository` **não tem mapper** (`super(db,"user")`,
   `:12`) — e nenhum caminho chama `entityRepository.findAll()` (grep: só `listByUserId` é usado, por
   `entities/route.ts:7`). Logo é refactor puro, verificável.
3. **É precisamente a classe de bug que esta migração existe para eliminar.** Um `findAll()` que ignora o
   mapper é um caminho pelo qual um `Timestamp` do Admin SDK chega a um DTO tipado como `string` — o
   próximo recurso que ganhar um mapper e chamar `findAll()` nasce com data quebrada.
4. Deixá-la abre um segundo ciclo `/analyze` sobre 10 linhas.

Fica em **commit próprio**, com teste dedicado (T5, §7.2), para poder ser revertida sozinha.

### 4.6 Por que **não** criar `error.code` para falha de credencial

Tentador: envolver a inicialização e responder `{ error: { code: "FIRESTORE_UNAVAILABLE" } }`. **Não
fazer.** Um handler que captura a falta de credencial e responde HTTP estruturado é, por definição, um
**modo degradado** — exatamente o que a spec proíbe (`:97-99`). Sem credencial a API não deve *responder*,
deve *não subir*. A ausência é erro de configuração (503/crash), não estado de negócio. Consequência
prática: nenhuma chave nova em `apiErrors`, nada para o `/i18n-sync`.

### 4.7 Dependências (`apps/api/package.json`)

| Ação | Linha | Motivo |
|------|-------|--------|
| `firebase-admin: ^13.0.2` → `dependencies` | de `:39` para o bloco `:14-28` | Já é runtime de fato (`user.mapper.ts:2,31`); passa a ser o driver do banco. Mesma versão travada por `packages/auth/package.json:23` — **não** bumpar |
| `firebase: ^11.10.0` → **removida** | `:26` | Depois de §4.4 não há nenhum import de `firebase/*` na api (grep atual: 4 hits, todos nos 3 arquivos reescritos). `packages/auth` mantém a sua para o cliente (`packages/auth/package.json:22`) |

Não é preciso mexer em `next.config.ts` nem em `serverExternalPackages`: `@repo/auth/server` (com
`firebase-admin`) já é importado em rotas da api em runtime (`users/route.ts:1`,
`resolve-api-actor.ts`), portanto o empacotamento já funciona.

---

## 5. Falha cedo, sem modo degradado

Requisito: *"Subir a API sem as credenciais de serviço falha de imediato, com mensagem clara, sem modo
degradado"* (spec `:114`), **sem** quebrar `apps/app`/`apps/web`, que compartilham `@repo/auth`.

Três camadas, cada uma cobrindo o furo da outra:

### 5.1 Camada 1 — env tipado da API (`apps/api/env.ts`)

Hoje: `server: {}`, `client: {}`, `runtimeEnv: {}` (`:14-16`). Passa a declarar as três vars como
**obrigatórias**, com `runtimeEnv` correspondente:

```
FIREBASE_ADMIN_PROJECT_ID:   z.string().min(1)
FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email()
FIREBASE_ADMIN_PRIVATE_KEY:  z.string().min(1)
```

Isso torna a exigência **explícita e local à API** — nada em `packages/*` muda de obrigatoriedade, logo
`apps/app`/`apps/web` seguem subindo (nenhum dos dois estende `auth()`: `apps/app/env.ts:6` e
`apps/web/env.ts:6` estendem só `core()`, `email()`, `security()`).

**Limitação a registrar, não a esconder**: (a) `apps/api/env.ts:17` tem
`skipValidation: NODE_ENV === "development"`, então em `pnpm dev` a validação é pulada; (b) mesmo em
produção, `env.ts` só é avaliado quando alguém o importa, e o **único importador** na api é
`webhooks/payments/route.ts:6`. Sozinha, esta camada não garante nada. É por isso que existe a 5.2.

> Alternativa considerada e descartada: virar `skipValidation: false`. Arrastaria as chaves de
> `email()`/`payments()` para dentro da validação em dev — elas se autoprotegem com `skipValidation`
> próprio (`packages/email/keys.ts:15`, `packages/payments/keys.ts:15`), mas o acoplamento é frágil e
> foge do escopo.

### 5.2 Camada 2 — assert de boot (`apps/api/instrumentation.ts`)

`instrumentation.ts` é o gancho que o Next executa **uma vez, ao iniciar o servidor** — hoje um stub
vazio (`export const register = () => {}`). `register()` passa a resolver a instância admin, guardado por
`process.env.NEXT_RUNTIME === "nodejs"`. Se a credencial faltar, `getFirebaseAdminApp()`
(`packages/auth/server.ts:36-46`) lança a mensagem que **já existe e já é clara**:

> `Firebase Admin credentials are not configured. Please set FIREBASE_ADMIN_* environment variables.`

Isto é o que entrega literalmente "falha de imediato": vale em **dev e em produção**, independente de
`skipValidation`, e não introduz mensagem nova para traduzir. Não roda em `next build` (instrumentação é
de runtime), então o build de um fork sem credencial continua possível — e não roda no Vitest, então a
suíte não passa a exigir env.

### 5.3 Camada 3 — `packages/auth/keys.ts` rejeita credencial **parcial**

O furo real do `keys.ts` não é o `.optional()` (`:5-9`), é a combinação dele com o early-return de
`:29-43`: com **nenhuma** var presente devolve tudo `undefined` (tolerância intencional, para
`FIREBASE_WEB_API_KEY` funcionar sozinho em `firebase-identity-toolkit.ts:1`); mas com **uma ou duas**
presentes, o `parse()` de `:45` passa — porque os três campos são `.optional()` — e o erro só aparece
muito depois, em `getFirebaseAdminApp()`. Um fork que esquece `FIREBASE_ADMIN_PRIVATE_KEY` descobre no
primeiro request, não no boot.

**Recomendação (Q3)**: manter a tolerância ao conjunto **vazio** e tornar o conjunto **parcial** um erro
de env — "tudo ou nada" de fato, via `.superRefine`/`.refine` no schema. Blast radius verificado:
`keys()` tem **2 importadores no repo inteiro**, ambos em `apps/api` (`env.ts:1`,
`(shared)/lib/firebase-identity-toolkit.ts:1`). `apps/app`/`apps/web` **não** chamam `keys()` — usam
`@repo/auth/server` (`apps/app/proxy.ts:2`), que chama `keys()` por dentro (`server.ts:33`) **apenas** ao
inicializar o app admin, coisa que esses apps já precisam hoje para verificar o session cookie. Ou seja:
para `apps/app`/`apps/web`, credencial parcial já é falha hoje — a mudança só antecipa a mensagem.

⚠️ Atenção ao caso de borda: `FIREBASE_ADMIN_PROJECT_ID` cai para `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
(`keys.ts:19-21`), var que `apps/app`/`apps/web` **têm** (`packages/auth/client.ts:32`). Se um fork
extender `auth()` no `env.ts` desses apps sem service account, o conjunto deixa de ser vazio e o novo
refine dispara. Não acontece neste repo (nenhum dos dois estende `auth()`), mas **precisa** ir para
`docs/SETUP.md` §"Firebase — Auth", que já afirma que os três apps precisam do service account
(`docs/SETUP.md:23`).

---

## 6. Rules, índices e publicação

### 6.1 Do inventário (§2.2) para os índices

| Consulta | Cláusulas | Precisa de índice composto? |
|----------|-----------|------------------------------|
| C1 `findAll` | 1 igualdade (`deletedAt`) | Não — índice single-field é automático |
| C2 `findById` | leitura por id | Não |
| C3 `listByUserId` | 1 igualdade (`userId`); ordenação **em memória** | Não. Seria **sim** (`userId ASC, createdAt DESC`) se a ordenação virasse `orderBy` — e é exatamente por isso que §1.2 proíbe essa "melhoria" aqui |
| C4 `findByReferenceId` | **2 igualdades** (`reference_id`, `deletedAt`) | Servível por merge de índices single-field, mas é o caminho **mais quente** do sistema |

C4 merece atenção: `findByReferenceId` roda em **todo request autenticado** — os dois guards resolvem o
perfil por ela (`docs/SECURITY.md:20`, via `resolve-api-actor` → `userRepository.findByReferenceId`).

### 6.2 `firestore.indexes.json`

Hoje `{"indexes": [], "fieldOverrides": []}` (`:1-4`). Passa a versionar **uma** entrada — a de C4:

```json
{
  "indexes": [
    {
      "collectionGroup": "user",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "reference_id", "order": "ASCENDING" },
        { "fieldPath": "deletedAt",    "order": "ASCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Justificativa das ausências (o guia exige registrar, não só listar): C1/C3 são igualdade única, cobertas
pelos índices single-field que o Firestore mantém automaticamente; C2 não usa índice. Versionar um índice
que consulta nenhuma usa é configuração morta — e este é um boilerplate, onde config morta se propaga a
todo fork.

**Gate empírico obrigatório** (a única prova que vale): com as rules publicadas, percorrer os fluxos de
§7.3 contra o projeto real e verificar que **nenhuma** resposta traz `FAILED_PRECONDITION … The query
requires an index`. O Firestore nomeia o índice exato que falta na mensagem de erro — se aparecer, a
entrada correspondente é acrescentada ao arquivo **antes** de fechar a tarefa.

### 6.3 Caminho de publicação (a spec pede o comando)

```bash
# 1. autenticar (uma vez por máquina)
npx -y firebase-tools@latest login

# 2. validar sintaxe sem publicar
npx -y firebase-tools@latest deploy --only firestore:rules --dry-run

# 3. publicar rules + índices
npx -y firebase-tools@latest deploy --only firestore:rules,firestore:indexes
```

`firebase.json` já aponta para os dois arquivos (`:2-4`) — **nenhuma mudança nele**.

**`.firebaserc` é versionado** (Q6 — decisão do usuário, contrária à recomendação original do plano). Cria-se
o arquivo com o project id de referência como `default`, o que encurta os comandos acima (sem `--project`) e
dá um lugar único para o id em vez de espalhá-lo por documentação.

```json
{ "projects": { "default": "<project-id-de-referencia>" } }
```

Consequência que **precisa** ir para o `docs/SETUP.md` e para o handoff, porque é a contrapartida da
decisão: `firebase use <id>` **reescreve um arquivo versionado**. O fork que apontar para o projeto dele
verá `.firebaserc` sujo no `git status` para sempre, ou terá de commitar o id dele por cima. Duas saídas
aceitáveis, e o setup deve dizer qual usar:

- `firebase deploy --project <id-do-fork>` — o flag **sobrepõe** o `default` sem tocar no arquivo. É o
  caminho recomendado para quem forka;
- `firebase use --add` — grava um **alias** nomeado ao lado do `default`, o que ao menos torna a mudança
  intencional e revisável no diff.

**Ordem de execução — inegociável**: publicar as rules **depois** de a API estar rodando com o Admin SDK,
nunca antes. `firestore.rules:12-18` é justamente esse aviso. Invertido, a API fica sem acesso.
Rollback: republicar um `allow read, write: if true` derruba o safeguard e reexpõe a base — **não é
rollback aceitável**. O rollback correto é reverter o código da API (git) e só então republicar. Deve
constar do handoff.

### 6.4 Documentação a atualizar (parte do entregável, não opcional)

| Arquivo | O que muda |
|---------|-----------|
| `firestore.rules:12-21` | O bloco ⚠️ "PRÉ-REQUISITO ANTES DO DEPLOY" torna-se **falso** e precisa virar a descrição da postura vigente: a API acessa via `getFirestoreAdmin()`, ignora as rules por ser serviço confiável, nenhum cliente lê Firestore direto. Mantém o comando de deploy e o bloco ALTERNATIVA (`:34-51`), que segue válido |
| `docs/SECURITY.md:26-42` | "⚠️ Firestore: achado crítico" → postura implementada + como **verificar** (§7.4). A "prioridade #1 de segurança do fork" (`:42`) deixa de existir |
| `docs/SECURITY.md:57` | Remove a higiene "mover a config hardcoded de `infra/dabatase.ts`" — o arquivo deixou de existir |
| `docs/SETUP.md:141` | Mesma pendência, mesma remoção (é a última linha da seção "Pendências de higiene") |
| `docs/SETUP.md:22-32` | A tabela já marca as `FIREBASE_ADMIN_*` como obrigatórias; acrescentar que a **API não sobe** sem elas (não é mais só auth: é o banco) e o caso de borda do §5.3 |
| `docs/SETUP.md` (seção Firestore) | Subseção nova sobre o `.firebaserc` versionado (Q6): o `default` aponta para o projeto de referência, e **o fork usa `--project <id>`** em vez de `firebase use`, que reescreveria arquivo versionado (§6.3) |
| `apps/api/.env.example` | Os três `FIREBASE_ADMIN_*` já existem, soltos no fim do arquivo — mover para o bloco `# Server` com o comentário de que a API não inicia sem eles (Q5) |
| `docs/features/.../STATE.md` | Gate do pipeline |

Não tocar em `specs/firestore-admin-access.md` (é do orquestrador), nem em `specs/BACKLOG.md:178` /
`specs/firebase-emulator-seed.md:39,114` / `specs/cursor-pagination.md:100`, que citam `dabatase.ts` — o
`/spec --sync` reconcilia.

---

## 7. Testes e validação — o que prova que "nada mudou"

### 7.1 Cobertura existente na `apps/api` (e o buraco)

8 arquivos em `apps/api/__tests__/`. O que eles cobrem sobre persistência:

| Arquivo | Toca o banco? | Consequência |
|---------|---------------|--------------|
| `userRepositoryList.test.ts` | **Só o nome do módulo**: `vi.mock("@/(shared)/infra/dabatase", () => ({default:{}}))` (`:11`) e `vi.spyOn(userRepository,"findAll")` (`:54`) | Testa `list()`/merge de auth, **não** a camada Firestore. O `:11` é o ponto que o rename quebra |
| `entitiesRouteImpersonation.test.ts` | Não — mocka `entity.repository` inteiro (`:37`) | Continua verde durante toda a migração |
| `usersRoute.test.ts`, `adminGuard.test.ts`, `commonPanelGuard.test.ts`, `authRequestContext.test.ts`, `impersonationReadOnly.test.ts` | Não — mockam `user.repository` | idem |
| `health.test.ts` | Não | idem |

**Diagnóstico**: `BaseRepository` e os métodos de consulta dos dois repositórios — exatamente o código
100% reescrito por esta tarefa — têm **cobertura zero**. A suíte ficaria verde com a migração
completamente errada. Fechar esse buraco é parte do entregável, não um extra.

### 7.2 Testes a criar

**`apps/api/__tests__/baseRepository.test.ts`** — dublê em memória que implementa a **superfície do Admin
SDK** (`collection().where().where().get()`, `.doc().get()`, `.add()`, `.doc().update()`), expondo
`exists` como **propriedade booleana** e `docs[].data()`. É o dublê que faz o teste falhar se o código
usar o dialeto do client SDK.

| # | Caso | Prova |
|---|------|-------|
| T1 | `findById` de doc inexistente → `null` | `snap.exists` lido como propriedade (§4.3); com `snap.exists()` o dublê estoura |
| T2 | `findById` de doc com `deletedAt` preenchido → `null` | soft delete respeitado na leitura |
| T3 | `findById` com `createdAt` = objeto com `.toDate()` (stand-in de `Timestamp` admin) → DTO com **ISO** | 🎯 a anti-regressão de data nomeada pela spec |
| T4 | `findById` com `createdAt` já **string ISO** (documento pós-`update`, §2.3c) → mesma ISO | tipo misto em produção não quebra |
| T5 | `findAll` filtra `deletedAt == null` **e** aplica o `rowMapper` | a correção de §4.5 |
| T6 | `create` estampa `createdAt`/`updatedAt`/`deletedAt: null` e devolve DTO mapeado | contrato do `POST` |
| T7 | `update` devolve o `id` e persiste `updatedAt`; `delete` **não** remove, grava `deletedAt` | soft delete na escrita |
| T8 | `listByUserId`: filtra por `userId`, descarta soft-deleted, ordena `createdAt desc` | ordenação em memória preservada |
| T9 | `findByReferenceId` emite **duas** igualdades (`reference_id` + `deletedAt`) e devolve `null` em resultado vazio | a consulta do caminho quente (C4), que sustenta o índice de §6.2 |

**`apps/api/__tests__/firestoreDriver.test.ts`** — teste estático: varre `apps/api/(shared)/**` e
`apps/api/app/**` e falha se algum arquivo importar de `firebase/firestore` ou `firebase/app`. Trava a
migração contra reintrodução — mesmo padrão do "teste que varre `app/(guards)/`" adotado na feature
`impersonation-read-only` (ver `STATE.md` daquela feature, decisão D5).

**Limite honesto do dublê**: ele codifica o contrato do Admin SDK conforme documentado; não *prova* o
comportamento do driver real. Quem prova é §7.3 + §7.4. As duas camadas são obrigatórias.

### 7.3 Snapshot antes/depois (o "nada mudou" observável)

O critério da spec é comportamental, então precisa de medição comportamental. **Antes** de tocar em
código, com a app rodando e um usuário de teste, capturar e guardar:

| Chamada | O que registrar |
|---------|-----------------|
| `GET /entities` | payload completo de ≥2 entidades (uma nunca editada, uma já editada — §2.3c), inclusive a **ordem** |
| `GET /entities/{id}` | payload completo |
| `POST /entities` → `PUT` → `GET` → `DELETE` | os 4 status (201/200/200/204) e o payload de cada um |
| `GET /entities` após o `DELETE` | a entidade excluída **não** aparece |
| `GET /users` (admin) | payload de ≥2 usuários — **é aqui que `createdAt` muda de forma** (§2.3b) |
| `GET /users/{id}`, `PUT /users/{id}` | payload completo |

Depois da migração, repetir e **diffar**. Divergência esperada: **exatamente uma** — `createdAt`/
`updatedAt` de `GET /users` saindo de `{seconds,nanoseconds}` para ISO. Qualquer outra é regressão.

> ⚠️ Higiene de artefato (lição registrada na feature `impersonation-read-only`): os payloads de `/users`
> carregam e-mail e nome de pessoas reais. **Não colar payload bruto de produção** em `plan.md`,
> `handoff.md` ou screenshot — usar conta `@example.com` ou redigir os campos.

### 7.4 Validação executável e visual (obrigatória — regra de ouro 11)

Com as rules **publicadas**, dirigindo a app pela skill `agent-browser` (comandos **em sequência**; em
paralelo travam o daemon):

1. **Login** (`/sign-in`) → painel comum.
2. **CRUD de `entity` completo**: lista → criar → editar → toggle `enabled` → excluir → lista.
   Screenshots em **light + dark + mobile**. A coluna `createdAt`
   (`EntitiesListClient.tsx:78-79`) e o `formatDisplayDateTime` da tela de edição
   (`EntityFormFields.tsx:73`) são o **detector visual** de regressão de data: data errada aparece como
   `1970` (o fallback de `normalizeFirestoreInstant:19`) ou como `Invalid Date`.
3. **Painel admin**: lista de usuários, criar usuário, editar (tipo/`displayName`/`disabled`), excluir.
4. **Impersonação**: admin personifica um comum, lista `entity` do personificado, confirma que ação
   mutante segue bloqueada (403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, entregue em `e45669a`) —
   verifica que a troca de driver não afeta a resolução de perfil, que passa por C4.
5. **Estados**: lista vazia, erro de carregamento, formulário inválido, submit em andamento.

**Prova do fechamento do furo de segurança** (sinal de pronto `:113`): com as rules publicadas, uma
leitura direta via REST com a chave pública do projeto deve ser **negada**:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  "https://firestore.googleapis.com/v1/projects/<projectId>/databases/(default)/documents/entity?key=<NEXT_PUBLIC_FIREBASE_API_KEY>"
```

Esperado **403** (`PERMISSION_DENIED`). Rodar **antes** da publicação também é instrutivo: hoje devolve
`200` **com os dados** — é a vulnerabilidade, medida. Não salvar o corpo da resposta em artefato
(contém dados reais).

### 7.5 Gate manual (não há CI)

```bash
pnpm --filter api test        # + os 2 arquivos novos
pnpm test                     # gateia o build (turbo.json:8)
pnpm --filter api typecheck    # a rede que pega Firestore(client) vs Firestore(admin)
pnpm --filter app typecheck    # confirma que o contrato não mexeu
pnpm check                     # comparar com a baseline conhecida (197 erros / 39 warnings)
```

`pnpm --filter api typecheck` é o verificador mais barato desta tarefa: os dois SDKs exportam tipos
homônimos e incompatíveis, então um método esquecido no dialeto antigo **não compila**.

---

## 8. Blueprint de execução — ordem segura

Regra: cada passo termina com **a suíte verde e o typecheck limpo**. O único passo que não pode ser
subdividido é o P3 (§1.3 — o acoplamento é por tipo).

| Passo | Escopo | Verificação ao final |
|-------|--------|----------------------|
| **P0** | Baseline: rodar §7.5, guardar os números; capturar o snapshot de §7.3 | números registrados, snapshot salvo |
| **P1** | `packages/auth/keys.ts` — credencial parcial vira erro de env (§5.3) | `pnpm test`; `pnpm --filter app typecheck` e `--filter web typecheck` continuam limpos (prova de que os apps compartilhados não quebraram) |
| **P2** | `apps/api/package.json` — `firebase-admin` para `dependencies` | `pnpm install`; suíte verde |
| **P3** | **A migração**: `(shared)/infra/database.ts` novo (§4.2), `dabatase.ts` deletado, `base.repository.ts` + `entity.repository.ts` + `user.repository.ts` reescritos (§4.4), `__tests__/userRepositoryList.test.ts:11` apontando para o caminho novo, `firebase` fora do `package.json`, `baseRepository.test.ts` + `firestoreDriver.test.ts` criados (§7.2) | `pnpm --filter api typecheck` **primeiro** (pega dialeto esquecido), depois `pnpm --filter api test` |
| **P4** | Correção do `findAll` + mapper (§4.5) + T5 | suíte verde; `pnpm test` |
| **P5** | `apps/api/env.ts` (§5.1) + `apps/api/instrumentation.ts` (§5.2) + `.env.example` | subir a API **sem** as vars → falha imediata com a mensagem clara; **com** as vars → sobe |
| **P6** | `firestore.indexes.json` (§6.2), cabeçalho de `firestore.rules` (§6.4), `.firebaserc` **novo e versionado** (§6.3) | `deploy --dry-run` valida a sintaxe |
| **P7** | **Publicar** rules + índices no projeto de referência (§6.3) — depende de Q1 | fluxos de §7.4 passam; nenhum `FAILED_PRECONDITION`; o `curl` de §7.4 devolve **403** |
| **P8** | `docs/SECURITY.md`, `docs/SETUP.md` (§6.4) | leitura; nenhum ponteiro para `dabatase.ts` sobrando (`grep -rn dabatase docs/`) |

### 8.1 Ordem de commits (`.claude/rules/git-commits.md`: um por app/pacote, pulverizado)

Dependência primeiro (`packages/*` → `apps/api` → raiz → docs). Mensagens em **inglês**.

| # | Passo | Mensagem |
|---|-------|----------|
| 1 | P1 | `fix(auth): reject a partial Firebase Admin credential set` |
| 2 | P2 | `chore(api): promote firebase-admin to a runtime dependency` |
| 3 | P3 | `refactor(api): read and write Firestore through the Admin SDK` (inclui `baseRepository.test.ts` e `firestoreDriver.test.ts` — teste acompanha a funcionalidade que cobre) |
| 4 | P4 | `fix(api): apply the row mapper in findAll` |
| 5 | P5 | `feat(api): require Firebase service-account credentials at startup` |
| 6 | P6 | `chore: version the Firestore index and make the deny-all rules publishable` (config de raiz: **sem escopo**, por não ser app nem pacote) |
| 7 | P8 | `docs: record the Admin SDK access model and the rules publish path` |
| 8 | — | `docs(features): firestore-admin-access` (último, separado do código) |

Branch (**quem cria é o `revisor-codigo`**, não este plano nem o `/develop`): sugestão de nome
`api/refactor/firestore-admin-access`. Branch atual `tacoma` não é protegida, mas não segue o padrão
`<project>/<type>/<title>`.

---

## 9. Riscos, achados e o que fica para depois

### 9.1 Matriz de risco

| Risco | Probabilidade | Detecção | Mitigação |
|-------|---------------|----------|-----------|
| `snap.exists()` mantido como chamada | **Alta** (é o erro natural) | Runtime, não typecheck (`snap` pode inferir largo) | T1 com dublê que expõe `exists` como propriedade |
| Regressão de data em `entity` | Baixa — `normalizeFirestoreInstant` faz duck typing (§2.3a) | T3/T4 + coluna `createdAt` na UI (§7.4.2) | mappers concentram a normalização |
| `createdAt` de `/users` muda de forma | **Certa** (§2.3b) | Diff do snapshot (§7.3) | Nenhuma tela consome; T6 + registro no handoff |
| Rules publicadas antes do código | Baixa, impacto **alto** (API fora do ar) | Imediata | P7 é o penúltimo passo; §6.3 explicita a ordem e o rollback correto |
| Índice faltando só sob dado real | Média | `FAILED_PRECONDITION` no §7.4 | Gate empírico do §6.2 |
| Fork sobe sem credencial | Média | Crash no boot com mensagem clara | §5.2 + `docs/SETUP.md` |
| Rename quebra o mock de teste | Média | `pnpm --filter api test` | P3 inclui `userRepositoryList.test.ts:11` explicitamente |

### 9.2 Achado pré-existente atravessado — `update()` reescreve o documento inteiro

`base.repository.ts:109-124`: o `update` lê o documento via `findById` (`:111`), que **com mapper**
devolve datas como **string ISO**, e reescreve tudo (`:113-121`). Efeito colateral: depois do primeiro
`PUT`, `entity.createdAt` está gravado como **string** no Firestore, não como `Timestamp`. Também
significa que um `PUT` reescreve campos que o cliente nem enviou, apesar do `omitUndefined` da rota
(`entities/[id]/route.ts:49`).

**Decidido: fora desta tarefa** (Q4, decisão do usuário em 2026-08-22). Corrigir muda a semântica de escrita
(deixaria de ser read-modify-write), o que contraria a exigência de migração contract-preserving e ampliaria
a superfície de teste. Registrar no handoff para virar achado no `specs/BACKLOG.md`. O que **este** plano garante
é que a reescrita de §4.4 preserva o comportamento atual, defeito incluído, e que T4 cobre o dado misto
que ele produziu.

### 9.3 Pós-entrega (guia §12)

- **Env em produção (Vercel)**, projeto `api`: `FIREBASE_ADMIN_PROJECT_ID`,
  `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` (com `\n` escapados — o replace está em
  `packages/auth/server.ts:53-56`). **Sem elas o deploy sobe e morre no boot** — é o comportamento
  desejado, mas precisa estar no checklist de release.
- **Publicar** rules + índices por projeto (§6.3). Cada fork publica no seu.
- **Rollback**: reverter os commits de código **e só então** republicar as rules antigas. Republicar
  rules permissivas sem reverter o código reexpõe a base — não é rollback.
- **O que um fork precisa fazer**: gerar service account, preencher as três vars, rodar
  `pnpm --filter api create-dev-admin`, publicar rules+índices com `--project` do projeto dele.
- **Desbloqueio**: com as rules publicáveis, `specs/firebase-emulator-seed` deixa de estar bloqueada
  (`specs/firestore-admin-access.md:75-76`).

---

## 10. Decisões tomadas

Todas as perguntas do plano foram decididas pelo usuário em **2026-08-22**. **O `/develop` não precisa
reabrir nenhuma.**

| # | Pergunta | Decisão |
|---|----------|---------|
| **Q1** | Publicar as rules e os índices no projeto Firebase de referência como parte da entrega? | ✅ **Publicar** (P7), depois de a API estar rodando com o Admin SDK. Fecha os sinais de pronto `:111` e `:113` da spec. Fork publica no dele. A ordem de §6.3 é inegociável, e o rollback correto é reverter o código **antes** de republicar rules. |
| **Q2** | Corrigir `findAll()` ignorando o `rowMapper` (`base.repository.ts:45-54`)? | ✅ **Sim**, em commit próprio (P4). Sai da tabela de achados do `specs/BACKLOG.md` quando o `/spec --sync` rodar. |
| **Q3** | Endurecer `packages/auth/keys.ts` para rejeitar credencial **parcial**? | ✅ **Sim** (§5.3, P1). O gate do P1 é justamente `pnpm --filter app typecheck` e `--filter web typecheck` continuarem limpos — é a prova de que os apps que compartilham o pacote não quebraram. |
| **Q4** | Corrigir o read-modify-write de `update()` (§9.2)? | ❌ **Não** — fora do escopo, registrado como achado. Muda semântica de escrita e quebraria a exigência de migração contract-preserving. O `/develop` **preserva o defeito** e T4 cobre o dado misto que ele produziu. Vai para o `specs/BACKLOG.md` no `--sync`. |
| **Q5** | Limpar o `apps/api/.env.example` inteiro? | ❌ **Não** — só o bloco `FIREBASE_ADMIN_*`. Clerk, `DATABASE_URL`, Svix e Knock ficam; a limpeza total é escopo próprio (e `docs/SETUP.md:5` já afirma, erradamente, que foi feita — achado a registrar). |
| **Q6** | Versionar `.firebaserc`? | ✅ **Versionar** — **decisão contrária à recomendação do plano**, tomada em favor do comando curto e de um lugar único para o project id. Custo aceito e documentado em §6.3: `firebase use` reescreve arquivo versionado, então o fork usa `--project <id>` (que sobrepõe sem tocar no arquivo) ou `firebase use --add`. Isso **precisa** constar do `docs/SETUP.md`. |

### Achados a registrar no `specs/BACKLOG.md` (via `/spec --sync`, não agora)

1. `update()` reescreve o documento inteiro e grava `createdAt` como string após o primeiro `PUT` (§9.2).
2. `docs/SETUP.md:5` afirma que o `.env.example` foi limpo das dependências herdadas do next-forge — não foi.
3. `GET /users` devolve hoje `createdAt` como `{seconds, nanoseconds}` por causa de um `instanceof` que
   nunca é verdadeiro (§2.3b) — **esta tarefa conserta**, então o achado nasce e morre no mesmo ciclo; vale
   registro só se o `/develop` decidir não consertar.
