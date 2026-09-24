# Análise + Blueprint — Upload de arquivos e storage

- **Slug**: `file-upload-storage`
- **Spec de origem**: [`specs/file-upload-storage.md`](../spec.md) (#1 da fila do `specs/BACKLOG.md` após o `/spec --sync` de 2026-09-11)
- **Desbloqueia**: `account-settings` → `account-security-mfa` · `data-rights-lgpd` (cadeia de 3 níveis)
- **Card / wiki / Figma / print**: nenhum. **Referências não lidas: nenhuma.**
- **Data**: 2026-09-11

> A spec responde *o quê/por quê* e é decisão de produto tomada. Este documento responde **como**.
> Toda afirmação abaixo cita `arquivo:linha` conferido em 2026-09-11 **neste worktree**
> (`conductor/workspaces/next-boilerplate/surabaya`). Há um segundo checkout na máquina
> (`~/next-boilerplate`) que está **atrás** deste; nada aqui foi lido de lá.

---

## 0. Sumário executivo do desenho

Uma rota nova genérica na `apps/api` (`POST /files`, multipart, guard de painel comum), um módulo novo no
SDK (`FileActions`), um campo `photoUrl` **derivado** no `EntityDTO`, o 8.º componente `HookForm*` (o
primeiro de arquivo) no design system, e o `photo` de `entity` deixando de ser texto livre. **Zero coleção
nova no Firestore. Zero dependência nova no `package.json`.**

Três decisões estruturais, todas vindas da própria spec (`:124-130`) e adotadas:

1. **Firebase Storage**, não S3 — o repo já roda Auth e Firestore em Firebase, e
   `@google-cloud/storage@7.17.3` **já está instalado** como dependência opcional de
   `firebase-admin@13.6.0` (verificado em `node_modules/.pnpm/`). `firebase-admin/storage` está no mapa de
   `exports` do pacote. Custo de dependência: **zero**.
2. **O upload atravessa a API.** Uma única autoridade de autorização (a regra de ouro 4), validação de
   tipo real impossível de contornar, e — o ponto que a spec não antecipa — **nenhuma configuração de CORS
   no bucket**, porque o browser nunca fala com o bucket a não ser por `GET` de imagem, que não é
   requisição CORS.
3. **Leitura por URL assinada V4, expirável, emitida pela API.** A assinatura é **local**: a service
   account tem chave privada (`packages/auth/server.ts:50-57`, `cert(...)`), então `getSignedUrl` não faz
   round-trip nem exige o papel IAM `Service Account Token Creator` que setups baseados em ADC exigiriam.

O eixo do desenho é: **`entity.photo` passa a guardar uma *referência* (caminho no bucket **ou** URL
externa legada), e a API deriva `photoUrl` — assinada e efêmera — no handler que já validou posse.**
O documento no Firestore nunca guarda uma URL assinada.

---

## 1. Contexto da tarefa

### 1.1 Resumo em uma frase

O usuário passa a escolher uma imagem no formulário de `entities`, ver o progresso e o preview, e salvar o
registro com o arquivo guardado num bucket privado — validado no servidor por tipo real e tamanho, servido
só por URL expirável, e com o arquivo anterior removido na troca.

### 1.2 Objetivos (o corte de MVP, verbatim da spec `:67-75`)

| # | Item do corte | Onde é entregue |
|---|---------------|-----------------|
| 1 | Campo de upload no formulário: escolhe, vê progresso, vê preview, salva | `ImageUploadInput` + `HookFormImageUpload` (design system) + `EntityFormFields.tsx` + `useFileUpload` |
| 2 | Validação **no servidor** de tipo real e tamanho, com `error.code` traduzível | `apps/api/(shared)/validation/file.schema.ts` (magic bytes) + 4 códigos novos |
| 3 | Bucket não público; URL restrita e expirável emitida pela API a quem pode ver o registro | `storage.rules` deny-all + `getSignedUrl` V4 (15 min) em `(shared)/lib/storage.ts`, chamado só depois do check de posse |
| 4 | Substituir o arquivo remove o anterior | `PUT /entities/[id]` apaga o objeto antigo quando `photo` muda |
| 5 | Opt-in por env: sem a variável, o fork sobe, o build passa, o campo não aparece | `FIREBASE_STORAGE_BUCKET` opcional; API responde `STORAGE_NOT_CONFIGURED` 503; app cai no campo de URL de hoje |

### 1.3 Fora de escopo

Herdado da spec (`:79-83`), **sem reabertura**:

- Múltiplos arquivos por registro, galeria, reordenação, drag-and-drop de vários itens.
- Redimensionamento/otimização no servidor, thumbnails geradas, conversão de formato.
- Documentos não-imagem (PDF, planilha) e antivírus.
- Upload de avatar na tela de conta (depende de `account-settings`) e varredura de órfãos / limpeza no
  encerramento de conta (pertence a `data-rights-lgpd`).

Fora de escopo decidido **nesta análise** (justificado em §11):

- **Rota de exclusão de arquivo** (`DELETE /files/...`). A remoção acontece implicitamente na troca
  (item 4 do corte). Uma rota de delete é superfície nova sem caso de uso no corte.
- **Apagar o arquivo no soft delete da entidade.** `BaseRepository.delete` é soft
  (`base.repository.ts:127-129`); apagar o objeto tornaria a restauração impossível. É `data-rights-lgpd`.
- **Levar o upload para o avatar do painel admin** (`UsersListClient` também usa `ResponsiveImage`, mas
  com a foto do Google vinda do Firebase Auth).
- **Corrigir `docs/SECURITY.md:29-33` e `docs/PRE-PRODUCTION.md:23-25`**, que afirmam que as
  `firestore.rules` não estão publicadas — medição de hoje diz o contrário (curl → **403**). É um achado
  aberto, independente desta tarefa. → Q8.
- **`apps/web`**: N/A por completo. O `proxy.ts` da web é Report-Only e sequer passa `imgSrc`
  (`apps/web/proxy.ts:22-29`); a landing não exibe imagem de usuário.

### 1.4 Apps impactados

| Camada | Impacto |
|--------|---------|
| `apps/api` | 1 rota nova (`POST /files`), 2 libs novas, 1 schema novo, `entity.schema` endurecido, 2 rotas de `entities` enriquecidas, `proxy.ts` (rate limit), `env.ts`, `.env.example` |
| `apps/app` | 1 hook novo, 1 helper novo, `EntityFormFields`, `EntitiesListClient`, `EditEntityClient`, `entityFormSchema`, `env.ts`, `proxy.ts` (CSP), `next.config.ts` (remotePatterns) |
| `apps/web` | **N/A** |
| `packages/sdk` | 1 módulo de tipos novo, 1 action nova registrada no `Client`, `EntityDTO.photoUrl` |
| `packages/design-system` | `ImageUploadInput` (`components/ui/`) + `HookFormImageUpload` (o **8.º** `HookForm*`), 2 barrels |
| `packages/auth` | `FIREBASE_STORAGE_BUCKET` em `keys.ts` + `getStorageAdmin()` em `server.ts` |
| `packages/shared` | 1 linha: `UNSUPPORTED_MEDIA_TYPE: 415` em `HTTP_STATUS` |
| `packages/internationalization` | 6 códigos em `apiErrors` + 1 nó de copy em `entities.form` |
| `packages/security` | **N/A** — `imgSrc` já é um `input` genérico (`middleware.ts:93-98`); host de produto entra pelo app |
| Firestore | **N/A** — nenhuma coleção, campo obrigatório novo, índice, regra ou backfill |
| Firebase Storage | `firebase.json` ganha bloco `storage`; `storage.rules` novo (deny-all) |

### 1.5 Área do painel, modo de produto, assinatura

- **Área**: painel **comum**. O slice `entity` vive em
  `apps/app/app/[locale]/(authenticated)/(common)/(pages)/entities/` e a rota nova usa
  `requireCommonPanelApi` (`apps/api/app/(guards)/common-panel.ts:30`). Nada no painel admin.
- **Modo de produto**: **indiferente**. A feature não lê `NEXT_PUBLIC_PRODUCT_MODE`; ela herda o
  posicionamento de `entities`, que já é o que é em cada modo. **N/A.**
- **Assinatura/plano**: **N/A**. Nenhum gate de plano. Registrado como risco de custo em §12, não como
  regra de negócio.

### 1.6 Genérico × específico

A divisão respeita a regra mestra (`packages/CLAUDE.md:3`):

- **Genérico → pacote**: a rota `POST /files` é de arquivo, não de entidade; `UploadedFileDTO` e
  `FileActions` não mencionam `entity`; `ImageUploadInput` não conhece o SDK nem a sessão
  (`packages/CLAUDE.md:18`: *"presentational only; no fetch, no session"*) — recebe a função de upload e a
  copy por prop, como o `Table` já recebe `locale.emptyText`.
- **Específico → app**: a ligação `photo` ↔ upload, o `photoUrl` do `EntityDTO`, a copy.

Consequência deliberada: quando `account-settings` chegar, ele reusa `POST /files`, `FileActions`,
`useFileUpload` e `HookFormImageUpload` **sem tocar em nada**. É o que faz desta a dependência que ela é.

### 1.7 Dependências externas e env

| Item | Situação |
|------|----------|
| `firebase-admin` | já em `apps/api/package.json:27` e `packages/auth/package.json:23` (`^13.0.2`, resolvido `13.6.0`) |
| `@google-cloud/storage` | **já instalado** (`node_modules/.pnpm/@google-cloud+storage@7.17.3`), optional dep de `firebase-admin`. Não declarar — é detalhe de implementação do `firebase-admin` |
| `sharp` / `file-type` / `busboy` / `multer` / `formidable` | **nenhum é dep direta e nenhum será adicionado**. `sharp` e `busboy` só existem como transitivas no lock |
| `FIREBASE_STORAGE_BUCKET` (server, **nova**) | opcional, com fallback para `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (client) | **já existe** em `apps/app/.env.example:34`, `apps/web/.env.example:29`, `docs/SETUP.md:48` e `packages/auth/client.ts:51` — hoje só alimenta o `initializeApp` do client SDK e **não é validada por nenhum `keys.ts`** |

---

## 2. Dados (Firestore)

### 2.1 Coleção e documento

**Nenhuma coleção nova.** A única mudança de forma é de **semântica**, não de schema:

| Campo | Antes | Depois | `null`? | Justificativa |
|-------|-------|--------|---------|---------------|
| `entity.photo` | `string \| null`, qualquer texto até 2048 (`entity.schema.ts:7,23,34`) | `string \| null`, **ou** caminho de objeto (`uploads/<userId>/<uuid>.<ext>`) **ou** URL absoluta `http(s)` | sim | Endurecer é a recomendação da spec (`:129-130`). O par "caminho **ou** URL" é o plano de convivência que o risco da spec (`:110-111`) exige: forks com URL externa gravada continuam válidos |

**Nenhum campo novo é persistido.** `photoUrl` é derivado em tempo de leitura (§3.1) e **jamais** vai ao
Firestore — ver a armadilha em 2.3.

- **Ownership**: `entity.userId` já existe e guarda o **id do documento de perfil** (coleção `user`), não
  o UID do Firebase Auth — está escrito em `firestore.rules:38-41`. O prefixo do caminho do objeto usa
  esse mesmo id, o que mantém um único conceito de dono no repo inteiro.
- **Campos do `BaseRepository`** (`createdAt`/`updatedAt`/`deletedAt`): intocados.
- **Soft delete**: intocado (e é por isso que o arquivo **não** é apagado no `DELETE`).

### 2.2 Consultas

**Nenhuma consulta nova.** `entityRepository.listByUserId` (`entity.repository.ts:11-32`) continua como
está: `where("userId","==",...)`, filtro de `deletedAt` e ordenação por `createdAt` **em memória**.
Nenhum índice composto novo — `firestore.indexes.json` fica intocado (hoje tem um só índice, na coleção
`user`).

O limite conhecido do `BaseRepository` (sem paginação, sem `orderBy`) **não piora** aqui: a assinatura de
URL é local e O(n) sobre a lista já carregada. O custo por item é uma operação de assinatura RSA, não uma
ida à rede — ver §10.3.

⚠️ **Regras do Firestore**: **nenhuma mudança**. As `firestore.rules` continuam deny-all. O que entra é um
**arquivo separado**, `storage.rules`, que governa outro serviço.

### 2.3 Dados existentes e a armadilha do `update`

- **Documentos já gravados ficam válidos.** `photo` ausente → `stringIfExists(record.photo)` devolve
  `null` (`entity.mapper.ts:19`, helper em `packages/shared/utils/helpers/stringIfExists.ts:5-11`).
  `photo` com URL externa → continua aceito na escrita e devolvido **sem assinar** na leitura.
- **Nenhum backfill.** Não há nada a converter.
- 🔴 **Armadilha que decide o desenho do DTO** — `BaseRepository.update` (`base.repository.ts:102-117`)
  **não usa o mapper**: faz `{ ...currentData, ...data, updatedAt }` e escreve o objeto inteiro, onde
  `currentData` é o **DTO** devolvido por `findById`. Ou seja: **todo campo que o `toDTO` produzir é
  gravado no Firestore no próximo `update`.** Se `photoUrl` virasse campo obrigatório do DTO e o mapper o
  emitisse, uma URL assinada e expirada seria persistida no documento a cada edição.
  → Por isso `photoUrl` é **opcional no tipo** (`photoUrl?: string | null`), **o mapper não o emite**, e
  só o handler o acrescenta à resposta. Zero linha nova em `entity.mapper.ts`.
  → Guarda-corpo para o `/develop`: **nunca** passar um DTO enriquecido para `entityRepository.update`.

---

## 3. Contrato — `@repo/sdk`

### 3.1 Tipos

**Novo** — `packages/sdk/src/types/file/file.ts`:

```ts
/** Referência devolvida pelo upload. `path` é o que se persiste; `url` é efêmero. */
export type UploadedFileDTO = {
    /** Caminho do objeto no bucket. É este valor que vai para o campo do recurso. */
    path: string;
    /** URL assinada de leitura, já pronta para exibir. Expira. */
    url: string;
    /** Instante ISO em que `url` deixa de funcionar. */
    expiresAt: string;
    contentType: string;
    size: number;
};
```

`packages/sdk/src/types/file/index.ts` → `export * from "./file";`
`packages/sdk/src/types/index.ts` ganha `export * from "./file";` (hoje só `./entity` e `./user`).

**Alterado** — `packages/sdk/src/types/entity/entity.ts:8-21`:

```ts
export type EntityDTO = {
    // …inalterado…
    /** Referência persistida: caminho no bucket OU URL externa (legado). */
    photo: string | null;
    /**
     * Derivado pela API na leitura: URL exibível e expirável quando `photo` é um
     * objeto do bucket, ou a própria `photo` quando ela já é uma URL. Nunca é
     * persistido e nunca deve ser enviado numa escrita.
     */
    photoUrl?: string | null;
    // …inalterado…
};
```

`CreateEntityRequest` e `UpdateEntityRequest` **não mudam** — `photoUrl` é somente leitura por construção
(não está nos tipos de escrita, e o whitelist de `toPersistence` em `entity.mapper.ts:38-47` também não o
lista).

### 3.2 Action

**Nova** — `packages/sdk/src/actions/file/action.ts`:

```ts
export default class FileActions {
    constructor(private readonly client: Client) {}

    async upload(
        file: File,
        options?: { onProgress?: (percent: number) => void }
    ): Promise<UploadedFileDTO> {
        const form = new FormData();
        form.append("file", file);

        const { data } = await this.client.request<Response<UploadedFileDTO>>({
            url: "/files",
            method: "POST",
            data: form,
            onUploadProgress: (event) => {
                if (!(options?.onProgress && event.total)) return;
                options.onProgress(Math.round((event.loaded * 100) / event.total));
            },
        });

        return data.data;
    }
}
```

- `BaseClient.request` repassa o `AxiosRequestConfig` inteiro (`base.ts:75-77`), então `onUploadProgress`
  chega ao axios sem precisar tocar no `BaseClient`.
- `Content-Type` **não** é setado: com `FormData`, o axios deixa o browser escrever o `boundary`. Os
  headers de auth vivem em `defaults.headers.common` (`base.ts:103-105`) e não são perturbados.
- Registro no `Client` (`packages/sdk/src/client/index.ts`): campo `file!: FileActions;` +
  `this.file = new FileActions(this);`. **Contexto `common`** — a rota está sob
  `requireCommonPanelApi`.

### 3.3 Quem quebra

`rg` por `EntityDTO` e `apiClient.entity`: os consumidores são `EntitiesListClient.tsx:11`,
`EditEntityClient.tsx`, `useEntityCrud.tsx`, `useListEntities.tsx:2`, `useFindEntityById.tsx`,
`entity.mapper.ts:1`, `entity.repository.ts:1`, `entities/route.ts`, `entities/[id]/route.ts`.

**Nenhum quebra**: `photoUrl` é opcional, então todo consumidor atual segue tipando. A ordem de commit
SDK → API → app continua valendo porque o app *passa a ler* `photoUrl` e a API precisa já estar
produzindo.

---

## 4. API (`apps/api`)

### 4.1 Rotas e guard

| Método | Path | Guard | Corpo | Sucesso |
|--------|------|-------|-------|---------|
| `POST` | `/files` | `requireCommonPanelApi` | `multipart/form-data`, campo `file` | `201 { data: UploadedFileDTO }` |

E três handlers existentes passam a enriquecer a resposta com `photoUrl`:
`GET /entities`, `GET /entities/[id]`, `POST /entities` (`entities/route.ts:6,11`,
`entities/[id]/route.ts:11`).

- **Guard**: `requireCommonPanelApi` sem genérico (não é rota `[id]`). Dá `ctx.subjectProfile.id`, que é
  o namespace do caminho do objeto.
- **Ownership**: dupla.
  1. **Na escrita do objeto**: o caminho é *construído* pela API a partir de `ctx.subjectProfile.id` —
     nada vindo do cliente entra no path (nem o nome do arquivo: a extensão é derivada do **tipo
     sniffado**, não do `file.name`, o que fecha travessia de diretório e dupla extensão de uma vez).
  2. **Na referência**: `POST`/`PUT /entities` recusam um `photo` que seja caminho de bucket **de outro
     dono** → `ENTITY_PHOTO_INVALID` 400. Sem isso existe um IDOR real: o usuário A poria
     `uploads/<B>/<uuid>.jpg` na *própria* entidade e a API assinaria o arquivo de B, porque o check de
     posse do handler é sobre a **entidade**, não sobre o arquivo.
- **Impersonação**: sai de graça e correta. `assertReadOnlyWhileImpersonating`
  (`impersonation-read-only.ts:22-31`) recusa todo método não-seguro, então um admin personificando
  **não consegue subir arquivo** (`AUTH_REQUEST_IMPERSONATION_READ_ONLY` 403) mas **continua vendo** as
  imagens do usuário — que é o ponto do modo. Nenhuma linha nova.
- **Header customizado novo**: **nenhum**. `Content-Type` já está em `ALLOWED_HEADERS`
  (`apps/api/(shared)/lib/cors.ts:12-18`), e `multipart/form-data` é valor safelisted de CORS. **Zero
  mudança em `cors.ts`.**
- **Runtime**: nenhuma rota do repo declara `export const runtime` — tudo roda no Node.js runtime default
  do Next 16, que é o que `firebase-admin` exige. **Não declarar nada.**

### 4.2 Rate limit — passo obrigatório e não automático

`RATE_LIMITED_PATHS` (`apps/api/proxy.ts:33-41`) casa **exato** (`.includes`, `:43-45`), e o comentário em
`:31` avisa: *"a new endpoint is unlimited until it is listed here"*.

`/files` **entra na lista**. Motivo: é o primeiro endpoint **autenticado** a entrar — o comentário do
bloco (`:25-32`) fala de rotas de entrada de conta — e o comentário precisa ser estendido para dizer o
porquê: um usuário legítimo, num laço, escreve no bucket do fork sem teto, e egress/armazenamento é a
conta que a spec (`:101-103`) levanta como risco. 20 req/60 s por IP é folgado para um humano que sobe
uma foto.

### 4.3 Validação na borda

Duas frentes.

**(a) `apps/api/(shared)/validation/file.schema.ts` (novo)** — não é Zod, e essa é a diferença: Zod valida
JSON, e aqui o que se valida são **bytes**. Mantém a assinatura de união discriminada do repo
(`{ ok: true; value } | { ok: false; response }`), para o handler ter o mesmo formato de early-return de
`parseCreateEntity` (`entity.schema.ts:48-63`).

Constantes (magic numbers extraídos, como pede o guia):

```ts
const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;   // 4 MiB
const SNIFF_BYTES = 12;
const ALLOWED = {
    "image/jpeg": { ext: "jpg", magic: [0xff, 0xd8, 0xff] },
    "image/png":  { ext: "png", magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
    "image/webp": { ext: "webp", riff: true },   // "RIFF"…"WEBP" no offset 8
} as const;
```

**Por que 4 MiB e não 5 ou 10**: a Vercel recusa corpo acima de **4,5 MB** em Serverless Function —
**antes** do handler, com uma resposta que não tem `error.code`. 4 MiB deixa folga para o envelope
multipart e mantém a recusa dentro do nosso vocabulário de erro. É exatamente o "limite de tamanho de
corpo do runtime, que precisa entrar no limite anunciado ao usuário" que a spec (`:108-109`) cobra.

**Por que magic bytes e não `file.type`**: `file.type` vem do cliente e é livre. Sem sniffing, "validação
no servidor de tipo real" (item 2 do corte) não existe. Três formatos custam ~15 linhas e **nenhuma
dependência** — `file-type` não está nem no lockfile.

**Por que JPEG/PNG/WebP e nada mais**: SVG é vetor de XSS quando servido; GIF anima e infla. Conservador
por decisão (D-6).

**(b) `entity.schema.ts` endurecido** — `photo` deixa de ser `z.string().trim().max(2048)` (`:23` e `:34`,
idêntico nos dois) e passa por um `photoReferenceSchema` compartilhado que aceita **só** três coisas:
`""` (normalizado a `null` no handler), URL absoluta `http`/`https`, ou caminho de objeto casando
`^uploads/[A-Za-z0-9_-]{1,128}/[0-9a-f-]{36}\.(jpg|png|webp)$`.

Efeito colateral positivo, fora do que a spec pediu: hoje `javascript:alert(1)` passa nos **dois** lados
(o front só faz `URL.canParse`, `entityFormSchema.ts:58` — e `URL.canParse("javascript:…")` é `true`). A
restrição a `http(s)` fecha isso. Registrado como D-9.

### 4.4 Persistência

**Nenhum repositório novo, nenhum mapper novo, nenhuma mudança em `entity.mapper.ts`.** O storage não é
Firestore: o acesso vive em `apps/api/(shared)/lib/storage.ts`, que é lib, não repositório — o
`BaseRepository` é uma abstração sobre `Firestore` (`base.repository.ts:24`) e não cabe aqui.

`packages/auth/server.ts` ganha um getter memoizado no mesmo formato dos dois existentes
(`getAuthInstance:66`, `getFirestoreAdmin:74`):

```ts
export const getStorageAdmin = (): Storage => {
    firebaseStorage ??= getStorage(getFirebaseAdminApp());
    return firebaseStorage;
};
```

É necessário porque `getFirebaseAdminApp` é **privado** ao módulo (`server.ts:28`, `const`, não
exportado) — a `apps/api` não tem como alcançar o app inicializado por outro caminho.

⚠️ **`initializeApp` não recebe `storageBucket`** (`server.ts:49-58`) e **não vai receber**: mexer ali
afeta `apps/app` e `apps/web`, que também importam `@repo/auth/server`. O bucket é passado explicitamente
em `getStorageAdmin().bucket(name)`, dentro da `apps/api`.

### 4.5 Erros — códigos e status

| `error.code` | Status | Quando |
|---|---|---|
| `STORAGE_NOT_CONFIGURED` | **503** `SERVICE_UNAVAILABLE` | bucket não configurado no fork. Primeira instrução do handler |
| `UPLOAD_FILE_MISSING` | **400** `BAD_REQUEST` | corpo não é multipart, ou campo `file` ausente / não é `File` / vazio |
| `UPLOAD_FILE_TOO_LARGE` | **413** `PAYLOAD_TOO_LARGE` | acima de 4 MiB |
| `UPLOAD_FILE_TYPE_NOT_ALLOWED` | **415** `UNSUPPORTED_MEDIA_TYPE` | tipo declarado fora da allowlist **ou** magic bytes discordando do declarado |
| `UPLOAD_FAILED` | **503** `SERVICE_UNAVAILABLE` | o provedor recusou a escrita |
| `ENTITY_PHOTO_INVALID` | **400** `BAD_REQUEST` | `photo` é caminho de bucket de outro dono |

`HTTP_STATUS` (`packages/shared/utils/helpers/httpStatus.ts`) já tem `PAYLOAD_TOO_LARGE: 413` e
`SERVICE_UNAVAILABLE: 503`; **falta só `UNSUPPORTED_MEDIA_TYPE: 415`** — uma linha, com o precedente
direto do `503` acrescentado pela feature anterior.

Os 6 códigos **exigem** entrada em `apiErrors` nos 3 idiomas
(`translations/packages/shared/utils.ts`, hoje 31 códigos), senão `parity.test.ts` falha.

Detalhe que fecha o ciclo de erro de graça: `FormattedError` **já** trata upload —
`isUploadRequest` (`formattedError.ts:104-128`) detecta `multipart/form-data`, `FormData` e URL contendo
`file`/`upload`/`image`, e `formatStatus` (`:163-165`) devolve `PAYLOAD_TOO_LARGE` quando a requisição
morreu **sem resposta** (o caso do corte de conexão por corpo grande). Nenhuma linha nova no `packages/shared`
além do 415.

### 4.6 Contrato de resposta

```jsonc
// POST /files  → 201
{ "data": {
    "path": "uploads/7Kq2mA/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.webp",
    "url": "https://storage.googleapis.com/meu-bucket/uploads/7Kq2mA/9f1c…webp?X-Goog-Algorithm=…",
    "expiresAt": "2026-09-11T01:03:00.000Z",
    "contentType": "image/webp",
    "size": 184320
} }

// GET /entities → 200  (photoUrl derivado; photo é a referência persistida)
{ "data": [ { "id": "abc", "photo": "uploads/7Kq2mA/9f1c….webp",
              "photoUrl": "https://storage.googleapis.com/…?X-Goog-…", "…": "…" } ] }

// erro (qualquer um)
{ "error": { "code": "UPLOAD_FILE_TYPE_NOT_ALLOWED" } }
```

`PUT` e `DELETE` de `entities` mantêm o contrato de hoje (`{ data: { id } }` 200 e 204 sem corpo).

---

## 5. Front-end (`apps/app`)

### 5.1 Rotas e renderização

**Nenhuma rota nova.** Nada muda em `paths.ts`, `routes.tsx`, `sidebar.tsx` ou `loading.tsx`. As três
páginas de `entities` seguem como estão, incluindo o **prefetch RSC** (`(home)/page.tsx:16-24` e
`edit/[id]/page.tsx:20-28`, ambos dentro de `if (!(await isImpersonating()))`).

⚠️ Consequência do prefetch que o `/develop` precisa saber: a URL assinada é **serializada no payload
RSC**. Com TTL de 15 min e a página hidratando em segundos, é inofensivo — mas é o motivo de o TTL não ser
de 30 segundos. Registrado em D-4.

### 5.2 Dados

- **`queryKeys`**: **nada novo**. O upload é uma mutation imperativa sem cache — não é uma query.
- **Hook novo** — `apps/app/shared/hooks/useFileUpload.ts` (pasta que já existe, com
  `useAuthorizedQuery.ts`, `useEmailVerification.ts`, `useHealthCheck.ts`, `useListUsers.ts`). Genérico de
  propósito: `account-settings` vai reusá-lo.

  ```ts
  export function useFileUpload() {
      const { locale } = getDictionary();
      const [progress, setProgress] = useState<number | null>(null);

      const uploadFile = useCallback(async (file: File) => {
          setProgress(0);
          try {
              return await apiClient.file.upload(file, { onProgress: setProgress });
          } finally {
              setProgress(null);
          }
      }, []);

      return { uploadFile, progress, formatUploadError: (e: unknown) =>
          handleClientError(new FormattedError(e, locale)) };
  }
  ```

  Erro sempre por `handleClientError(new FormattedError(error, locale))`, como `useEntityCrud.tsx:34-35`.
  Zero `fetch`/axios cru: só `apiClient.file.upload`.
- **Helper novo** — `apps/app/shared/lib/storageEnabled.ts`:
  `export const isStorageEnabled = () => Boolean(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);`
  Espelha o padrão `isAnalyticsEnabled` de `apps/app/proxy.ts:28-30`.
- **`useEntityCrud` não muda.** `photo` já é normalizado `"" → null` nas duas mutations
  (`useEntityCrud.tsx:42` e `:67`), e o valor do campo passa a ser o `path` em vez da URL — mesma string,
  mesmo caminho de código.

### 5.3 Formulários e listas

**`(validations)/entityFormSchema.ts`** — o `refine` de `photo` (`:52-61`) passa a aceitar
`"" | URL http(s) | caminho de objeto`. A constante do regex é **duplicada** de propósito entre app e API
(o app não importa de `apps/api`, e `@repo/shared` não é lugar de regra de um recurso) — é uma linha, e o
teste de schema cobre as duas pontas. Mensagem nova: `validation.photoReference`.

**`(components)/EntityFormFields.tsx`** — o bloco `:109-117` (hoje `HookFormInput type="url"` + hint) vira
condicional:

| Storage | Campo renderizado | Comportamento |
|---------|-------------------|---------------|
| configurado | `HookFormImageUpload name="photo"` com `previewSrc={photoUrl}` | escolhe → sobe → grava o `path` no campo → salva |
| **não** configurado | `HookFormInput name="photo" type="url"` (**exatamente o de hoje**) | inalterado |

O item 5 do corte diz *"o campo de upload simplesmente não aparece"*. Ler isso como "some e não sobra
nada" removeria uma capacidade que o fork tem hoje; a leitura de menor impacto é **manter o campo de URL**
como estava. → D-7.

`EntityFormFields` ganha uma prop `photoPreviewUrl?: string | null`, preenchida por `EditEntityClient`
(`:109-113` já passa `createdAtLabel`/`createdAtValue`, mesmo formato). No `create` ela é `undefined`, e o
preview passa a existir só depois do upload, a partir da `url` que a própria resposta devolve.

**`EditEntityClient.tsx`** — `form.reset` (`:55-67`) continua com `photo: entity.photo ?? ""` (a
referência é o que se salva); o `photoUrl` vai só para o preview.

**`(pages)/(home)/EntitiesListClient.tsx`** — a coluna de foto (`:49-64`) troca
`dataIndex: "photo"` por `dataIndex: "photoUrl"`. O `render` fica idêntico: `ResponsiveImage` já trata
`src` vazio (`responsive-image.tsx:27-29`) e o `value ? … : "—"` do call site já cobre o `null`.

**Estados**: loading inicial (skeleton existente), `isPending` no submit (`Footer` já bloqueia duplo
clique), vazio, erro. O campo de upload acrescenta três estados próprios — **ocioso**, **enviando**
(barra de progresso + botão desabilitado) e **erro de arquivo** (mensagem no `error` do campo, sem
submeter o formulário).

### 5.4 Design system — o 8.º `HookForm*`

Segue o par consagrado **base UI + wrapper RHF** (`packages/CLAUDE.md:22-31`), igual a
`date-input.tsx` ↔ `hookformDateInput.tsx`:

- `packages/design-system/components/ui/image-upload-input.tsx` → `ImageUploadInput` +
  `ImageUploadInputProps` exportados do mesmo módulo, `data-slot="image-upload-input"`,
  `aria-invalid={Boolean(error)}`, prop de validação chamada **`error`** (nunca `errorMessage`),
  `label` opcional. Re-exportado em `components/ui/index.ts`.
- `packages/design-system/components/form/hookform/hookformImageUpload.tsx` →
  `HookFormImageUpload`, `"use client"`, props
  `Omit<ImageUploadInputProps, "error" | "onChange" | "value">` + `{ control?, name, controllerProps?, hidden? }`,
  `if (hidden) return <></>` antes do `Controller`, `disabled={formState.isSubmitting || rest.disabled}`.
  Registrado em `hookform/index.ts` (o barrel tem 7 linhas hoje).

Duas restrições que moldam a API do componente:

1. **`@repo/design-system` não depende de `@repo/sdk`** (conferido no `package.json`) e a regra diz
   *"presentational only; no fetch, no session"*. → o componente recebe
   `upload: (file: File, onProgress: (pct: number) => void) => Promise<{ path: string; url: string }>`.
2. **Nada de copy dentro do pacote.** → recebe um objeto `texts` (como o `Table` recebe
   `locale.emptyText`), preenchido pelo app a partir do dicionário.

O preview reusa `ResponsiveImage` — que já vive no design system e é o padrão de miniatura segundo
`apps/app/CLAUDE.md`. ⚠️ Duas pegadinhas conhecidas do componente, a contornar sem refatorá-lo (mudanças
mínimas): ele é `export default` e o `export * from './responsive-image'` do barrel (`ui/index.ts:61`)
**não reexporta default** — importar pelo caminho concreto, como os dois call sites atuais fazem; e o
wrapper tem `rounded-full` **hardcoded** (`:33`), então o preview sai circular.

### 5.5 CSP e `next/image` — o passo que quebra em runtime se for esquecido

A URL assinada V4 do `@google-cloud/storage` sai sempre em **`https://storage.googleapis.com/<bucket>/<objeto>?X-Goog-…`**
(path-style; `virtualHostedStyle` não é usado). Host **único e estático** — não precisa de CSP dinâmica.

| # | Arquivo | Mudança | Por quê |
|---|---------|---------|---------|
| 1 | `apps/app/proxy.ts:14-25` | constante `STORAGE_ORIGIN = "https://storage.googleapis.com"` | junto das outras |
| 2 | `apps/app/proxy.ts:46-49` (`imgSrc`) | `...(isStorageConfigured ? [STORAGE_ORIGIN] : [])` | **sem isto a imagem é recusada em runtime.** Condicionado ao bucket, igual ao `isAnalyticsEnabled` — um fork sem storage não alarga a própria CSP |
| 3 | `apps/app/next.config.ts:20-25` | `remotePatterns` ganha `{ protocol: "https", hostname: "storage.googleapis.com" }` | `next/image` recusa host não declarado |
| 4 | `apps/app/env.ts` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional()` em `client` + `runtimeEnv` | o `proxy.ts` importa `env` de `@/env`; a var não existe em nenhum `keys.ts` hoje |
| 5 | `apps/app/proxy.ts` (`connectSrc`) | **não mexer** | o browser não fala com o bucket: o upload vai pela API, e `<img>` não é `connect-src` |
| 6 | `packages/security/middleware.ts:93-98` | **não mexer** | a base é genérica; host de produto entra pelo `input` do app |
| 7 | `apps/web/proxy.ts:22-29` | **não mexer** | Report-Only e sem imagem de usuário |

O item 3 é cinto e suspensório em relação ao 2: dependendo de o `ResponsiveImage` acabar otimizando ou
não, o browser busca em `/_next/image` (same-origin, coberto por `'self'`) ou direto no bucket. Com os
dois configurados, os dois caminhos funcionam.

### 5.6 i18n e a11y

Zero string em JSX. Nó novo em `apps.app.pages.common.entities.form`, e o `photoHint` de hoje
(`entities.ts:30-31`) — que literalmente diz *"Em produção, substitua por upload para storage"* — passa a
ser mostrado só no modo sem storage. Variáveis com nome descritivo (`entitiesForm`), nunca `t`/`d`.

A11y do campo: `<input type="file">` real, escondido visualmente mas focável e rotulado; botão com
`aria-describedby` apontando para o hint de formatos/limite; `role="status"` +
`aria-live="polite"` no progresso; `alt` do preview vindo do dicionário.

---

## 6. Autorização e segurança

| Camada | O que entra |
|--------|-------------|
| `apps/app/proxy.ts` | só CSP; **nada** em `PUBLIC_PATHS` (a feature é 100 % autenticada) |
| Guard da API | `requireCommonPanelApi` em `POST /files`; `entities` já tem |
| Ownership do arquivo | caminho **construído** pela API a partir de `ctx.subjectProfile.id`; nada do cliente entra no path |
| Ownership da referência | `ENTITY_PHOTO_INVALID` quando `photo` aponta para `uploads/<outro>/…` |
| Impersonação | escrita já recusada por `assertReadOnlyWhileImpersonating`; leitura (URL assinada) permitida, que é o comportamento correto do modo |
| Rate limit | `/files` em `RATE_LIMITED_PATHS` |
| `storage.rules` | deny-all publicado; o Admin SDK ignora rules, como no Firestore |

**O bucket não pode ser público — três proibições explícitas** (a spec pede "bucket não público" em
`:71-72`, e cada uma destas o violaria em silêncio):

1. **Nunca** conceder `allUsers` / `allAuthenticatedUsers` no bucket (IAM). É isto, e não as rules, que
   governa `storage.googleapis.com`.
2. **Nunca** `file.makePublic()` nem `predefinedAcl: "publicRead"`.
3. **Nunca** `getDownloadURL()` / token de download do Firebase — ele produz uma URL **permanente e
   pública**, o oposto do item 3 do corte. A única forma de servir é `getSignedUrl` V4.

⚠️ Nuance que o `/develop` e o `/test` precisam ter clara: **`storage.rules` governa a API do Firebase
Storage (`firebasestorage.googleapis.com`), não a API do GCS (`storage.googleapis.com`)**. Publicar rules
deny-all fecha o acesso direto do client SDK; o que fecha `storage.googleapis.com` é a **ausência** de IAM
público. Precisam das duas coisas.

**Sem CORS no bucket.** Consequência direta de o upload atravessar a API: o browser só faz `GET` de
imagem na URL assinada, e carregamento de `<img>` não é requisição CORS. Se um dia o upload virar direto
ao bucket, aí sim aparece um `gsutil cors set` na lista de pré-requisitos.

**Nenhum dado sensível vaza**: o `path` é opaco (UUID v4), a URL assinada não revela credencial, e o log
de bloqueio do proxy (`apps/api/proxy.ts:47-55`) já é sem PII.

---

## 7. i18n — árvore de chaves novas

### 7.1 `apiErrors` — 6 códigos × 3 idiomas

`packages/internationalization/translations/packages/shared/utils.ts` (pt-br `:6-55`, en `:61-106`,
es `:112-163`; hoje 31 códigos → 37):

| Código | pt-br | en | es |
|---|---|---|---|
| `STORAGE_NOT_CONFIGURED` | O envio de arquivos não está configurado. Fale com o suporte. | File uploads are not configured. Contact support. | La subida de archivos no está configurada. Contacta al soporte. |
| `UPLOAD_FILE_MISSING` | Nenhum arquivo foi enviado. | No file was sent. | No se envió ningún archivo. |
| `UPLOAD_FILE_TOO_LARGE` | O arquivo excede o tamanho máximo de 4 MB. | The file exceeds the 4 MB limit. | El archivo supera el límite de 4 MB. |
| `UPLOAD_FILE_TYPE_NOT_ALLOWED` | Formato não aceito. Envie JPG, PNG ou WebP. | Format not accepted. Send JPG, PNG or WebP. | Formato no aceptado. Envía JPG, PNG o WebP. |
| `UPLOAD_FAILED` | Não foi possível enviar o arquivo agora. Tente de novo em instantes. | Could not upload the file right now. Try again shortly. | No se pudo subir el archivo ahora. Inténtalo en unos instantes. |
| `ENTITY_PHOTO_INVALID` | Imagem inválida para esta entidade. | Invalid image for this record. | Imagen no válida para este registro. |

### 7.2 Copy da UI

`translations/apps/app/pages/common/entities.ts` — nó novo dentro de `form`, nos 3 blocos
(pt-br `:24-53`, en `:84-113`, es `:144-173`):

```ts
photoUpload: {
    label: "Foto",
    choose: "Escolher imagem",
    replace: "Trocar imagem",
    remove: "Remover imagem",
    uploading: "Enviando…",
    hint: "JPG, PNG ou WebP, até 4 MB.",
    alt: "Pré-visualização da foto",
    errors: {
        tooLarge: "A imagem excede 4 MB.",
        typeNotAllowed: "Formato não aceito. Escolha JPG, PNG ou WebP.",
    },
},
```

E uma chave em `form.validation`: `photoReference: "Envie uma imagem ou informe uma URL válida."`

As chaves atuais `photo`, `photoPlaceholder`, `photoHint`, `validation.photoUrl` e `validation.photoMax`
**ficam** — são o modo sem storage.

`parity.test.ts` (`:15-22`) varre recursivamente, sem lista fixa: a paridade sai de graça se as três
árvores forem idênticas. Rodar `/i18n-sync`.

---

## 8. Validação visual (obrigatória — regra de ouro 11)

`pnpm --filter app dev` + `pnpm --filter api dev`. `agent-browser` **em sequência** (chamadas concorrentes
travam o daemon). Light + dark + mobile (390×844), nos 3 idiomas onde houver copy nova.

| # | Cenário | O que provar |
|---|---------|--------------|
| V1 | Criar entidade com imagem | escolher → barra de progresso visível → preview aparece → salvar → a imagem aparece **na lista** |
| V2 | Editar entidade e trocar a imagem | preview antigo carrega do `photoUrl`; depois de salvar, o objeto antigo **não existe mais** no bucket (conferir no console) |
| V3 | Arquivo acima de 4 MB | recusado **no cliente** com a copy de `errors.tooLarge`, sem requisição |
| V4 | `.txt` renomeado para `.jpg` (magic bytes erradas) | passa pelo filtro do browser e é recusado pela **API** com `UPLOAD_FILE_TYPE_NOT_ALLOWED` 415, copy traduzida |
| V5 | `curl` direto no `POST /files` com `Content-Type: image/png` e corpo de texto | mesma recusa 415 — prova que a proteção não é do navegador |
| V6 | URL assinada colada em aba anônima | abre; depois de expirada (ou com `X-Goog-Signature` adulterado) → **403 do Google**, não a imagem |
| V7 | Tentar ler o objeto sem assinatura (`storage.googleapis.com/<bucket>/<obj>`) | **403** — bucket não público |
| V8 | Sem `FIREBASE_STORAGE_BUCKET` | app sobe, `pnpm build` passa, o campo de **URL** aparece no lugar do upload, `POST /files` responde `STORAGE_NOT_CONFIGURED` 503 |
| V9 | Admin personificando um usuário comum | **vê** as imagens; ao tentar subir → `AUTH_REQUEST_IMPERSONATION_READ_ONLY` 403 |
| V10 | Entidade de outro usuário com `photo` apontando para `uploads/<outro>/…` | `ENTITY_PHOTO_INVALID` 400 no `POST`/`PUT` |
| V11 | Entidade legada com URL externa em `photo` | continua salvando e exibindo (nada quebrou) |
| V12 | Duplo clique em "Escolher imagem" / submit durante upload | uma requisição só; o `Footer` fica desabilitado enquanto sobe |
| V13 | Tema e responsivo | o preview e a barra respeitam light/dark; em 390 px o campo não estoura |

---

## 9. Critérios de aceite

O quadro completo, no formato §9.1, é responsabilidade do `/test`
(`docs/features/file-upload-storage/test/criterios-aceite.md`). Os eixos obrigatórios levantados aqui:

- **Autorização**: comum × admin × admin personificando × não autenticado, em `POST /files`.
- **Ownership**: caminho de outro dono na referência; entidade de outro usuário (404, não 403).
- **Valores-limite**: 0 byte · 4 MiB − 1 · 4 MiB · 4 MiB + 1 · campo `file` ausente · campo `file` que é
  string · dois campos `file` · nome com `../` · extensão divergente do conteúdo.
- **`photo`**: ausente × `null` × `""` × URL http(s) × URL `javascript:` × caminho válido × caminho de
  outro × string aleatória de 2048 chars.
- **Anterior × posterior**: uma entidade com URL externa gravada antes da mudança continua funcionando.
- **Erros** com o `error.code` exato e a mensagem nos 3 idiomas.
- **Tema e responsivo**.

---

## 10. Blueprint técnico

### 10.1 `packages/shared` — uma linha

```diff
  TOO_MANY_REQUESTS: 429,
  PAYLOAD_TOO_LARGE: 413,
+ UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
```

### 10.2 `packages/auth` — bucket na env e o getter de storage

`keys.ts` — o arquivo **não usa `createEnv`** (é a exceção do repo: Zod puro + `superRefine`), então a
adição segue o formato dele, com o **mesmo padrão de fallback** já usado em `FIREBASE_WEB_API_KEY`
(`:49-51`):

```diff
  FIREBASE_WEB_API_KEY: z.string().min(1).optional(),
+ /** Bucket do Cloud Storage. Ausente = a capacidade de upload fica desligada. */
+ FIREBASE_STORAGE_BUCKET: z.string().min(1).optional(),
```
```diff
  FIREBASE_WEB_API_KEY:
      process.env.FIREBASE_WEB_API_KEY ??
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
+ FIREBASE_STORAGE_BUCKET:
+     process.env.FIREBASE_STORAGE_BUCKET ??
+     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
```

⚠️ O early-return de `keys()` (`:54-68`) devolve um objeto **literal** quando a service account está
inteiramente ausente — `FIREBASE_STORAGE_BUCKET` precisa ser adicionado **ali também**, senão some no
caminho em que o front-end chama `keys()` sem credencial.

`server.ts`:

```diff
+ import { getStorage, type Storage } from "firebase-admin/storage";
  let firebaseFirestore: Firestore | undefined;
+ let firebaseStorage: Storage | undefined;

+ export const getStorageAdmin = (): Storage => {
+     firebaseStorage ??= getStorage(getFirebaseAdminApp());
+     return firebaseStorage;
+ };
```

**Sem tocar no `initializeApp`** (`:49-58`): o bucket é nomeado no call site.

### 10.3 `apps/api/(shared)/lib/storage.ts` — o coração

```ts
import { getStorageAdmin } from "@repo/auth/server";
import { env } from "@/env";

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;
const UPLOAD_PREFIX = "uploads";

export const isStorageConfigured = (): boolean =>
    Boolean(env.FIREBASE_STORAGE_BUCKET);

const bucket = () => getStorageAdmin().bucket(env.FIREBASE_STORAGE_BUCKET as string);

export const buildObjectPath = (ownerId: string, extension: string): string =>
    `${UPLOAD_PREFIX}/${ownerId}/${crypto.randomUUID()}.${extension}`;

export const isStorageObjectPath = (value: string): boolean =>
    STORAGE_OBJECT_PATH_RE.test(value);

export const isOwnedBy = (path: string, ownerId: string): boolean =>
    path.startsWith(`${UPLOAD_PREFIX}/${ownerId}/`);

export async function putObject(
    path: string, body: Buffer, contentType: string
): Promise<void> {
    await bucket().file(path).save(body, {
        contentType,
        resumable: false,
        // Sem ACL pública e sem token de download: o objeto só sai por URL assinada.
        metadata: { cacheControl: "private, max-age=0, no-store" },
    });
}

/** Assinatura V4 é local (a service account tem chave privada) — não há ida à rede. */
export async function signReadUrl(path: string): Promise<{ url: string; expiresAt: string }> {
    const expires = Date.now() + SIGNED_URL_TTL_MS;
    const [url] = await bucket().file(path).getSignedUrl({
        version: "v4", action: "read", expires,
    });
    return { url, expiresAt: new Date(expires).toISOString() };
}

/** Apagar o antigo nunca pode derrubar a edição que o usuário acabou de salvar. */
export async function deleteObjectQuietly(path: string): Promise<void> {
    try {
        await bucket().file(path).delete({ ignoreNotFound: true });
    } catch (error) {
        console.warn(`[storage] delete failed path=${path}`);
    }
}
```

E o resolvedor de `photoUrl`, em `apps/api/(shared)/lib/entity-photo.ts` — usado pelos **três** handlers
de leitura/criação:

```ts
export async function withPhotoUrl(entity: EntityDTO): Promise<EntityDTO> {
    if (!entity.photo) return { ...entity, photoUrl: null };
    // URL externa gravada antes desta feature: devolvida como está.
    if (/^https?:\/\//i.test(entity.photo)) return { ...entity, photoUrl: entity.photo };
    if (!isStorageConfigured()) return { ...entity, photoUrl: null };
    const { url } = await signReadUrl(entity.photo);
    return { ...entity, photoUrl: url };
}

export const withPhotoUrls = (list: EntityDTO[]) => Promise.all(list.map(withPhotoUrl));
```

### 10.4 `apps/api/(shared)/validation/file.schema.ts`

```ts
const UPLOAD_MAX_BYTES = 4 * 1024 * 1024;
const SNIFF_BYTES = 12;

type Refusal = { ok: false; response: Response };
type Accepted = { ok: true; value: { body: Buffer; contentType: string; extension: string; size: number } };

const refuse = (code: string, status: number): Refusal => ({
    ok: false,
    response: Response.json({ error: { code } }, { status }),
});

/** O tipo real vem dos bytes; o `type` do cliente é só uma dica que precisa concordar. */
function sniffImageType(head: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null { … }

export async function parseUploadedImage(req: Request): Promise<Accepted | Refusal> {
    let form: FormData;
    try { form = await req.formData(); }
    catch { return refuse("UPLOAD_FILE_MISSING", HTTP_STATUS.BAD_REQUEST); }

    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
        return refuse("UPLOAD_FILE_MISSING", HTTP_STATUS.BAD_REQUEST);
    }
    if (file.size > UPLOAD_MAX_BYTES) {
        return refuse("UPLOAD_FILE_TOO_LARGE", HTTP_STATUS.PAYLOAD_TOO_LARGE);
    }

    const body = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageType(body.subarray(0, SNIFF_BYTES));

    // Recusa também quando o cliente declara um tipo que os bytes desmentem.
    if (!sniffed || (file.type && file.type !== sniffed)) {
        return refuse("UPLOAD_FILE_TYPE_NOT_ALLOWED", HTTP_STATUS.UNSUPPORTED_MEDIA_TYPE);
    }

    return { ok: true, value: {
        body, contentType: sniffed, extension: EXTENSION_BY_TYPE[sniffed], size: file.size,
    } };
}
```

A **extensão vem do tipo sniffado**, nunca de `file.name`. Fecha `../`, dupla extensão e nome unicode de
uma vez, sem sanitização a manter.

### 10.5 Handler — `apps/api/app/(routes)/files/route.ts`

```ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    if (!isStorageConfigured()) {
        return Response.json(
            { error: { code: "STORAGE_NOT_CONFIGURED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    const parsed = await parseUploadedImage(req);
    if (!parsed.ok) return parsed.response;

    const { body, contentType, extension, size } = parsed.value;
    const path = buildObjectPath(ctx.subjectProfile.id, extension);

    try {
        await putObject(path, body, contentType);
    } catch {
        return Response.json(
            { error: { code: "UPLOAD_FAILED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    const { url, expiresAt } = await signReadUrl(path);
    return Response.json({ data: { path, url, expiresAt, contentType, size } }, { status: 201 });
});
```

Ordem deliberada: **configuração → validação → escrita → assinatura**. `STORAGE_NOT_CONFIGURED` é a
primeira instrução e é função **só** da configuração do fork — nunca do input —, exatamente como
`canSendAuthActionLink()` na feature de recuperação de senha.

### 10.6 `entity.schema.ts` — pseudo-diff

```diff
+ const STORAGE_OBJECT_PATH_RE =
+     /^uploads\/[A-Za-z0-9_-]{1,128}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;
+
+ /** Referência de imagem: vazio, URL http(s) absoluta, ou caminho de objeto do bucket. */
+ const photoReferenceSchema = z
+     .string()
+     .trim()
+     .max(PHOTO_URL_MAX)
+     .refine((value) => {
+         if (value === "") return true;
+         if (STORAGE_OBJECT_PATH_RE.test(value)) return true;
+         try {
+             const url = new URL(value);
+             return url.protocol === "http:" || url.protocol === "https:";
+         } catch { return false; }
+     })
+     .optional()
+     .nullable();

  export const createEntitySchema = z.object({
-     photo: z.string().trim().max(PHOTO_URL_MAX).optional().nullable(),
+     photo: photoReferenceSchema,
  });

  export const updateEntitySchema = z.object({
-     photo: z.string().trim().max(PHOTO_URL_MAX).optional().nullable(),
+     photo: photoReferenceSchema,
  })
```

`""` continua aceito e o handler o normaliza para `null` — a alternativa (recusar) mudaria o contrato para
um fork que hoje envie string vazia, e "mudanças mínimas" pesa mais que a elegância. → D-8.

### 10.7 `entities/route.ts` — pseudo-diff

```diff
  export const GET = requireCommonPanelApi(async (_req, ctx) => {
      const list = await entityRepository.listByUserId(ctx.subjectProfile.id);
-     return Response.json({ data: list });
+     return Response.json({ data: await withPhotoUrls(list) });
  });

  export const POST = requireCommonPanelApi(async (req, ctx) => {
      …
      const input = parsed.value;
+     const photo = normalizePhotoReference(input.photo);   // "" → null
+
+     if (photo && isStorageObjectPath(photo) && !isOwnedBy(photo, ctx.subjectProfile.id)) {
+         return Response.json(
+             { error: { code: "ENTITY_PHOTO_INVALID" } },
+             { status: HTTP_STATUS.BAD_REQUEST }
+         );
+     }

      const created = await entityRepository.create({
-         photo: input.photo ?? null,
+         photo,
          …
      });
-     return Response.json({ data: created }, { status: 201 });
+     return Response.json({ data: await withPhotoUrl(created) }, { status: 201 });
  });
```

### 10.8 `entities/[id]/route.ts` — pseudo-diff

```diff
  export const GET = requireCommonPanelApi<RouteIdParamsContext>(async (_req, ctx) => {
      …  // check de posse inalterado
-     return Response.json({ data: row });
+     return Response.json({ data: await withPhotoUrl(row) });
  });

  export const PUT = requireCommonPanelApi<RouteIdParamsContext>(async (req, ctx) => {
      …  // 404 de posse ANTES do parse (ordem preservada — não vaza existência)
      const patch = omitUndefined(parsed.value);
+
+     if (patch.photo !== undefined) {
+         patch.photo = normalizePhotoReference(patch.photo);
+         if (patch.photo && isStorageObjectPath(patch.photo)
+             && !isOwnedBy(patch.photo, ctx.subjectProfile.id)) {
+             return Response.json(
+                 { error: { code: "ENTITY_PHOTO_INVALID" } },
+                 { status: HTTP_STATUS.BAD_REQUEST }
+             );
+         }
+     }

      await entityRepository.update({ id, ...patch });
+
+     // Item 4 do corte: trocar a imagem não deixa o objeto anterior no bucket.
+     const previous = existing.photo;
+     if (patch.photo !== undefined && previous && previous !== patch.photo
+         && isStorageObjectPath(previous) && isOwnedBy(previous, ctx.subjectProfile.id)) {
+         await deleteObjectQuietly(previous);
+     }

      return Response.json({ data: { id } });
  });
```

Três precauções na remoção: acontece **depois** do `update` (se a escrita falhar, o arquivo antigo
continua sendo o válido); só apaga caminho **de objeto** e **do próprio dono**; e `deleteObjectQuietly`
engole a falha — o usuário salvou, e um órfão no bucket não é motivo para responder erro.

`DELETE` fica **intocado** (soft delete, §1.3).

### 10.9 `apps/api/env.ts` — a redeclaração obrigatória

🔴 **Não é opcional, e o motivo está documentado no próprio arquivo** (`apps/api/env.ts:23-26`):
`skipValidation` (ligado em todo `NODE_ENV=development`, `:37`) faz o `createEnv` responder **só** com o
`runtimeEnv` deste módulo e **descartar tudo que veio por `extends`**. Se `FIREBASE_STORAGE_BUCKET` viver
apenas em `@repo/auth/keys`, `env.FIREBASE_STORAGE_BUCKET` é `undefined` em **todo** `pnpm dev` — e o
upload nasce morto localmente, exatamente como aconteceu com `NEXT_PUBLIC_APP_URL` na feature anterior.

```diff
  server: {
      CORS_ORIGIN: z.string().optional(),
+     // Redeclarada apesar de vir de `auth()`: com skipValidation o createEnv descarta
+     // o que veio por `extends`. Ver o comentário do bloco `client` abaixo.
+     FIREBASE_STORAGE_BUCKET: z.string().optional(),
  },
  runtimeEnv: {
      CORS_ORIGIN: process.env.CORS_ORIGIN,
+     FIREBASE_STORAGE_BUCKET:
+         process.env.FIREBASE_STORAGE_BUCKET ??
+         process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  },
```

`instrumentation.ts` **não muda**: bucket ausente é estado de negócio válido (opt-in), não erro de
configuração. Crashar no boot violaria o item 5 do corte.

### 10.10 `apps/app/env.ts` + `proxy.ts` + `next.config.ts`

```diff
  // env.ts — não tem skipValidation, o extends funciona; mas a var não está em keys.ts nenhum
  client: {
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
+     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
      NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional(),
  },
```
```diff
  // proxy.ts
+ /** Host das URLs assinadas V4 do Cloud Storage (path-style). */
+ const STORAGE_ORIGIN = "https://storage.googleapis.com";
+ const isStorageConfigured = Boolean(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);

  imgSrc: [
      GOOGLE_AVATAR_ORIGIN,
+     ...(isStorageConfigured ? [STORAGE_ORIGIN] : []),
      ...(isAnalyticsEnabled ? [TAG_MANAGER_ORIGIN] : []),
  ],
```
```diff
  // next.config.ts
  remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
+     { protocol: "https", hostname: "storage.googleapis.com" },
  ],
```

`connectSrc` **não** é tocado (o browser não fala com o bucket). `apps/web` **não** é tocado.

### 10.11 Design system — forma dos dois componentes

```ts
// components/ui/image-upload-input.tsx
export type ImageUploadInputTexts = {
    choose: string; replace: string; remove: string; uploading: string;
    hint: string; alt: string;
    errors: { tooLarge: string; typeNotAllowed: string };
};

export type ImageUploadInputProps = {
    id?: string;
    label?: string;
    required?: boolean;
    error?: string;
    disabled?: boolean;
    /** Lista de MIME aceitos, repassada ao input e conferida antes de enviar. */
    accept?: string[];
    maxSizeBytes?: number;
    /** Referência já salva (caminho do objeto ou URL). É o valor do formulário. */
    value?: string;
    /** URL exibível do valor atual. Separada de `value` porque um caminho não renderiza. */
    previewSrc?: string | null;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    /** Injetada pelo app: o design system não conhece o SDK. */
    upload: (file: File, onProgress: (percent: number) => void) => Promise<{ path: string; url: string }>;
    texts: ImageUploadInputTexts;
};
```

Máquina de estados interna: `idle → validating → uploading(%) → done | error`. O `onChange` dispara **só**
no `done`, com o `path` — o formulário nunca fica com um valor de arquivo que não existe no bucket.
A validação de tamanho/tipo no cliente é **conveniência** e usa as mesmas constantes: a autoridade é a API
(regra de ouro 4).

O wrapper `HookFormImageUpload` copia literalmente o contrato de `hookformDateInput.tsx`: `"use client"`,
`Omit<…, "error" | "onChange" | "value">`, `if (hidden) return <></>`, `<Controller … />` com
`disabled={formState.isSubmitting || rest.disabled}` e `<FormMessage message={errorMessage} />`.

### 10.12 `EntityFormFields.tsx` — pseudo-diff

```diff
+ const storageEnabled = isStorageEnabled();
+ const uploadTexts = useMemo(() => ({ …entitiesForm.photoUpload }), [entitiesForm]);

  <div className="col-span-1 md:col-span-2">
-     <HookFormInput label={entitiesForm.photo} name="photo" placeholder={…} type="url" />
-     <p className="mt-1 text-muted-foreground text-xs">{entitiesForm.photoHint}</p>
+     {storageEnabled ? (
+         <HookFormImageUpload
+             label={entitiesForm.photoUpload.label}
+             name="photo"
+             previewSrc={photoPreviewUrl}
+             texts={uploadTexts}
+             upload={uploadFile}
+         />
+     ) : (
+         <>
+             <HookFormInput label={entitiesForm.photo} name="photo" placeholder={…} type="url" />
+             <p className="mt-1 text-muted-foreground text-xs">{entitiesForm.photoHint}</p>
+         </>
+     )}
  </div>
```

### 10.13 `firebase.json` + `storage.rules`

```diff
  {
    "firestore": {
      "rules": "firestore.rules",
      "indexes": "firestore.indexes.json"
-   }
+   },
+   "storage": {
+     "rules": "storage.rules"
+   }
  }
```

`storage.rules` (novo) espelha a postura e o tom de `firestore.rules`:

```
rules_version = '2';

// Todo acesso ao bucket passa pela apps/api (guard → service account via
// firebase-admin). Como serviço confiável, ela IGNORA estas regras. Nenhum
// cliente fala com o bucket: o upload vai pela API e a leitura sai por URL
// assinada e expirável, emitida depois do check de posse.
//
// ⚠️ Estas regras governam firebasestorage.googleapis.com. O que fecha
//    storage.googleapis.com é a AUSÊNCIA de IAM público no bucket — nunca
//    conceda allUsers/allAuthenticatedUsers, nunca makePublic().
//
// Deploy: npx -y firebase-tools@latest deploy --only storage

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 10.14 `.env.example`

`apps/api/.env.example` — bloco novo, no mesmo tom explicativo dos vizinhos:

```
# Cloud Storage bucket (ex.: "meu-projeto.firebasestorage.app"). OPCIONAL: sem ele a
# capacidade de upload fica desligada — POST /files responde STORAGE_NOT_CONFIGURED e o
# painel mostra o campo de URL no lugar do de arquivo. Cai para
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET quando ausente.
FIREBASE_STORAGE_BUCKET=""
```

`apps/app/.env.example:34` — a var **já existe**; só ganha o comentário dizendo que agora ela é a chave
que liga o campo de upload e o host do bucket na CSP.

### 10.15 Ordem de implementação e de commit

Um commit por app/pacote, quebrado por unidade de mudança; testes junto da funcionalidade que cobrem.
**Implementar o i18n primeiro** (é a fonte dos tipos de copy) e **commitá-lo por último**, com `git add`
por caminho.

| # | Escopo | Conteúdo |
|---|--------|----------|
| 1 | `shared` | `UNSUPPORTED_MEDIA_TYPE: 415` |
| 2 | `auth` | `FIREBASE_STORAGE_BUCKET` em `keys.ts` (incl. o early-return) + `getStorageAdmin()` |
| 3 | `sdk` | `UploadedFileDTO`, `FileActions`, registro no `Client`, `EntityDTO.photoUrl` |
| 4 | `api` | `lib/storage.ts` + `validation/file.schema.ts` + `POST /files` + testes |
| 5 | `api` | `entity.schema` endurecido + `withPhotoUrl` + posse da referência + remoção do antigo + testes |
| 6 | `api` | rate limit `/files` + `env.ts` + `.env.example` |
| 7 | `design-system` | `ImageUploadInput` + `HookFormImageUpload` + os 2 barrels |
| 8 | `app` | `env.ts` + CSP no `proxy.ts` + `remotePatterns` + teste de CSP |
| 9 | `app` | `useFileUpload` + `storageEnabled` + `entityFormSchema` + testes |
| 10 | `app` | `EntityFormFields` + `EntitiesListClient` + `EditEntityClient` |
| 11 | `internationalization` | 6 `apiErrors` + nó `photoUpload` + `photoReference` |
| 12 | *(sem escopo)* | `firebase.json` + `storage.rules` + a seção de storage em `SETUP.md`/`PRE-PRODUCTION.md` |
| 13 | `docs(features)` | `docs/features/file-upload-storage/` |

A dependência real é 1→2→3→(4,5)→6 e 7→(8,9,10); 11 pode ser escrito primeiro e commitado por último.

### 10.16 Testes a criar

| Arquivo | Cobre |
|---|---|
| `apps/api/__tests__/uploadedImageValidation.test.ts` (novo) | sniffing dos 3 formatos · byte errado · `type` declarado divergente · 0 byte · 4 MiB ±1 · campo ausente · campo string · corpo não-multipart · extensão derivada do conteúdo, não do nome |
| `apps/api/__tests__/fileUploadRoute.test.ts` (novo) | `STORAGE_NOT_CONFIGURED` como **primeira** resposta (sem tocar no corpo) · 201 feliz com `path` sob `uploads/<subjectId>/` · `UPLOAD_FAILED` quando o `save` rejeita · guard mockado (401/403) · impersonação → 403. Padrão do repo: `vi.mock` do repositório **e do guard** (passthrough injetando `ctx.subjectProfile`) + `await import(...)` da rota — ver `entitiesRouteImpersonation.test.ts` |
| `apps/api/__tests__/entityPhotoReference.test.ts` (novo) | schema aceita `""`/URL/caminho e recusa `javascript:` e lixo · `ENTITY_PHOTO_INVALID` para caminho de outro dono no `POST` e no `PUT` · `photoUrl` presente no `GET` e assinado só para caminho · URL legada devolvida sem assinar · objeto antigo apagado na troca e **não** apagado quando `photo` não muda |
| `apps/app/__tests__/entityFormSchema.test.ts` (estender) | os mesmos casos do lado do formulário, com o dicionário real |
| `apps/app/__tests__/securityPolicySources.test.ts` (estender) | `img-src` contém o host do bucket **com** a env e **não** contém sem ela |
| `packages/internationalization` | paridade sai de graça (`parity.test.ts:15-22` varre recursivamente) |

Comandos: `pnpm --filter api test`, `pnpm --filter app test`,
`pnpm --filter @repo/internationalization test`, e o gate completo
`pnpm turbo run lint typecheck test`.

### 10.17 Env e config — o que cada fork precisa

| Variável | Onde | Obrigatória? |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `apps/app` (e `apps/web`, já declarada) | não — **é o liga/desliga** |
| `FIREBASE_STORAGE_BUCKET` | `apps/api` | não — cai para a pública |

Nenhuma variável **passa a ser obrigatória**. Um fork que não configure nada sobe, builda, e vê o campo de
URL de sempre.

---

## 11. Decisões (com o porquê)

| # | Decisão | Por quê |
|---|---------|---------|
| **D-1** | Firebase Storage | Recomendação da spec (`:127-128`). `@google-cloud/storage` já instalado; um segundo provedor traria credencial, SDK e conceito de identidade novos |
| **D-2** | Upload atravessa a API | Recomendação da spec (`:124-126`) + regra de ouro 4. Ganho não previsto: **dispensa CORS no bucket**. Custo aceito: teto de 4 MiB pelo corpo da função |
| **D-3** | `photoUrl` **opcional** e derivado no handler, não no mapper | `BaseRepository.update` (`:104-114`) escreve `{...currentData, ...data}` **sem** o mapper: campo emitido pelo `toDTO` seria persistido. Manter opcional torna impossível gravar URL assinada no documento |
| **D-4** | TTL de 15 min | Cobre a leitura de uma página e o prefetch RSC sem virar quase-permanente. Mais curto quebraria aba deixada aberta; mais longo enfraquece o item 3 do corte |
| **D-5** | Rota genérica `POST /files`, não `POST /entities/:id/photo` | No `create` a entidade ainda não tem id. E é o que `account-settings` vai reusar sem tocar em nada |
| **D-6** | Só JPEG/PNG/WebP, 4 MiB | SVG é XSS quando servido; GIF anima e infla. 4 MiB fica **sob** o teto de 4,5 MB da Vercel, onde a recusa ainda tem `error.code` |
| **D-7** | Sem storage, o campo de **URL** continua aparecendo | "o campo de upload não aparece" (spec `:74-75`) ≠ "o fork perde a capacidade que tinha". Menor raio de impacto |
| **D-8** | `photo: ""` continua aceito e vira `null` no handler | Recusar mudaria o contrato para um fork que envie string vazia. O endurecimento que importa (texto arbitrário) acontece de todo jeito |
| **D-9** | `photo` restrito a `http(s)` além do caminho | Hoje `javascript:alert(1)` passa nos dois lados (`URL.canParse` é `true`). Fechar sai de graça no mesmo refine |
| **D-10** | `/files` entra em `RATE_LIMITED_PATHS` | Primeiro endpoint **autenticado** na lista; o comentário do bloco (`proxy.ts:25-32`) é estendido para dizer o porquê. Sem isso, um laço autenticado escreve no bucket do fork sem teto |
| **D-11** | Prefixo `uploads/<userId>/` + checagem de posse na referência | Sem ela existe IDOR real: A referencia `uploads/<B>/…` na própria entidade e a API assina o arquivo de B |
| **D-12** | Sniffing artesanal, sem `file-type` | 3 formatos = ~15 linhas. `file-type` não está nem no lockfile; toda dependência nova é custo herdado por todo fork |
| **D-13** | `storage.rules` deny-all, espelhando `firestore.rules` | O Admin SDK ignora rules; o precedente existe e funcionou (as `firestore.rules` estão publicadas — curl → 403) |

---

## 12. Pós-entrega

### 12.1 Pré-requisitos **manuais** de infra (o `/develop` não consegue fazer; o `/test` não deve reprovar por eles)

1. **Ativar o Cloud Storage for Firebase** no console do projeto (`.firebaserc` → `next-boilerplate-576d0`).
   Cria o bucket default (`<projeto>.firebasestorage.app` em projetos novos, `.appspot.com` nos antigos).
2. **Preencher a env**: `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` em `apps/app/.env` e
   `FIREBASE_STORAGE_BUCKET` em `apps/api/.env` (e nos dois projetos na Vercel).
3. **Conferir o IAM da service account**: precisa de `roles/storage.objectAdmin` (ou `storage.admin`) no
   bucket. A conta `firebase-adminsdk-*` normalmente já tem; uma service account custom pode não ter.
4. **Publicar as regras**: `npx -y firebase-tools@latest deploy --only storage`
   (`--dry-run` antes, como o roteiro do Firestore em `docs/SECURITY.md:43-47`).
5. **Não** conceder `allUsers`/`allAuthenticatedUsers` no bucket. Conferir com
   `curl -o /dev/null -w '%{http_code}' https://storage.googleapis.com/<bucket>/<objeto>` → esperado **403**.
6. **Não é preciso** configurar CORS no bucket (consequência de D-2).

Sem 1 e 2, o comportamento esperado é: app sobe, build passa, campo de upload **ausente**,
`POST /files` → `STORAGE_NOT_CONFIGURED` 503. **Isso é o item 5 do corte funcionando, não uma falha.**

### 12.2 Rollback

Reverter os commits basta para o código. Fica no bucket o que já foi enviado (arquivos órfãos, sem
custo de correção) e ficam documentos com `photo` apontando para caminhos que a versão antiga renderiza
como `<Image src="uploads/…">` — que falha no `onError` do `ResponsiveImage` e mostra o ícone de fallback,
sem quebrar a tela. Nenhum dado é perdido.

### 12.3 O que muda para um fork

Nada, se ele não quiser a feature. Se quiser: os 6 passos de 12.1, mais estar ciente de que egress é
cobrado por download — uma lista com imagem pesada em muitos registros queima cota rápido (risco da spec
`:101-103`, não resolvido por este corte).

---

## 13. Perguntas em aberto

Todas **já decididas** (modo de execução contínua). Cada uma traz a opção adotada.

| # | Pergunta | Opções | **Adotado** | Por quê |
|---|---|---|---|---|
| **Q1** | Firebase Storage ou S3-compatível? | Firebase · S3/R2 · serviço de terceiro | **Firebase Storage** | Recomendação da spec (`:127`); zero dependência nova; zero credencial nova de provedor |
| **Q2** | Upload pela API ou direto ao bucket com credencial curta? | via API · signed upload URL | **via API** | Recomendação da spec (`:124`); uma autoridade só; validação de bytes possível; sem CORS no bucket. Migrar só se o teto de 4 MiB virar problema **medido** |
| **Q3** | Onde ficam as Storage rules e entram no corte? | não entram · arquivo + publicação manual · publicação automatizada | **`storage.rules` no repo, publicação manual** | Espelha `firestore.rules`, que já está publicada (403 medido). Automatizar deploy de rules é outra tarefa |
| **Q4** | Tamanho máximo? | 2 · **4 MiB** · 10 MB | **4 MiB** | Único valor que fica sob o teto de 4,5 MB da Vercel **e** deixa folga de envelope multipart. Acima disso a recusa vem da plataforma, sem `error.code` |
| **Q5** | Quais tipos? | só JPEG/PNG · **+WebP** · +GIF/SVG/AVIF | **JPEG + PNG + WebP** | SVG é XSS quando servido; GIF anima. Conservador; ampliar é uma linha no mapa |
| **Q6** | `photoUrl` obrigatório ou opcional no DTO? | obrigatório (mapper emite `null`) · **opcional** | **opcional** | `BaseRepository.update:104-114` persistiria o que o `toDTO` emitisse (D-3). Opcional torna o erro impossível |
| **Q7** | Endurecer `photo` agora? | endurecer · manter texto livre | **endurecer, aceitando URL legada** | Recomendação da spec (`:129-130`); a aceitação de URL absoluta é o plano de convivência que o risco `:110-111` pede |
| **Q8** | Corrigir `SECURITY.md`/`PRE-PRODUCTION.md`, que dizem que as rules do Firestore não estão publicadas? | corrigir aqui · deixar para o achado aberto | **deixar fora** | Mudanças mínimas; é achado independente. O `storage.rules` novo entra sem repetir a afirmação errada |
| **Q9** | `/files` entra no rate limit? | entra · fica de fora | **entra** | É a única defesa contra um laço autenticado escrevendo no bucket do fork. Uma linha + estender o comentário do bloco |
| **Q10** | Sem storage, o campo some ou vira campo de URL? | some · **vira URL** | **vira URL** | Sumir removeria uma capacidade existente do fork (D-7) |
| **Q11** | O design system faz o upload ou recebe a função? | DS chama o SDK · **DS recebe `upload` por prop** | **por prop** | `packages/CLAUDE.md:18` (*no fetch, no session*); o DS sequer depende de `@repo/sdk` |
| **Q12** | Apagar o arquivo quando a entidade é excluída? | apagar · **não apagar** | **não apagar** | `delete` é soft; apagar o objeto tornaria a restauração impossível. Pertence a `data-rights-lgpd` (spec `:83`) |
