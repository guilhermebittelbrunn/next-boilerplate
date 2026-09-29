# Plano: emulador de Cloud Storage e testes das security rules

- **Spec:** [`spec.md`](../spec.md) (arquivada em 2026-09-29; nasceu em `specs/storage-emulator-rules-tests.md`, `approved`, decisão do usuário de 2026-09-26 sobre `pnpm test` incluída)
- **Card:** nenhum
- **Rodada:** `/cycle` autônomo. Nada foi perguntado; as decisões estão em §13 e as perguntas em §14, cada uma com a opção adotada.
- **Branch:** a atual é `barcelona`, fora do padrão. Quem nomeia e cria é o `revisor-codigo`.

---

## 1. Contexto

### 1.1 Problema

O upload de imagem (`POST /files`), a leitura por URL assinada, a remoção do objeto substituído e o passo
`storage` do expurgo de conta foram entregues sem nunca terem rodado neste repositório. A trava em
`apps/api/(shared)/lib/storage.ts:31-32` desliga o Storage sempre que a stack está emulada
(`!isEmulated()`), porque não existe emulador de Storage e um bucket preenchido receberia objetos reais.
A entrega de `file-upload-storage` fechou com seis critérios 🔒 por isso
(`docs/features/file-upload-storage/test/report.md:138-146`), e `account-settings` com o caminho feliz do
avatar sem prova (`docs/features/account-settings/test/criterios-aceite.md:155-181`).

`firestore.rules:32-34` e `storage.rules:26-29` negam tudo e não têm teste. `git grep` por
`rules-unit-testing`, `assertFails` ou `assertSucceeds` fora de `docs/` e `specs/` devolve zero.

### 1.2 Objetivo

Um fork que usa upload passa a ter um ambiente local e um gate de CI onde escrita, leitura pela URL
devolvida, remoção e expurgo rodam contra um Storage de verdade (o emulado), e onde afrouxar qualquer uma
das duas rules quebra um teste.

### 1.3 Corte de MVP (da spec, sem mudança)

1. `pnpm emulators` sobe também o Storage, e a API usa o bucket emulado quando o host do emulador de
   Storage está presente, sem nunca apontar para um bucket real nesse modo.
2. Upload, leitura pela URL devolvida e remoção rodam sob o emulador, com teste automatizado do caminho
   feliz e da recusa de dono errado.
3. O passo `storage` do expurgo roda sob o emulador e apaga os objetos do titular.
4. Teste das duas rules: cliente anônimo e autenticado recusados em leitura e escrita, no Firestore e no
   Storage. O teste falha se a negação for afrouxada.
5. Esses testes rodam dentro do `pnpm test` e, portanto, no job `verify` do CI.

### 1.4 Fora do corte (continua fora)

- Publicar `storage.rules` e ativar o bucket num projeto real (`docs/PRE-PRODUCTION.md` §6).
- Regras permissivas por coleção ou por dono.
- Promover administrador pela UI (já existe).
- Teste Playwright de upload. A prova automatizada é Vitest contra o emulador (§7); o fluxo visual é da
  passada do `/test` (§8).
- Espelhar no painel a recusa do servidor quando o bucket está preenchido sob emulador sem o host de
  Storage (achado do `/test` de `firebase-emulator-seed`, `docs/features/firebase-emulator-seed/STATE.md`,
  nota "Achado do `/test`, não bloqueante"). Continua decisão pendente do usuário; o default novo do
  `.env.example` torna o caso raro, mas não o elimina.

### 1.5 Apps impactados

| Camada | Impacto |
|---|---|
| `packages/sdk` | Nenhum. |
| `packages/auth` | `emulator.ts` ganha `storageEmulatorHost()` e `DEMO_STORAGE_BUCKET`. |
| `apps/api` | `storage.ts` passa a aceitar o Storage emulado; suíte Vitest nova contra o emulador; script que decide entre reaproveitar ou subir o emulador. |
| `apps/app` | Pequeno, e **contra o que a spec previa** ("nenhum código"): flag de upload e CSP `img-src` precisam conhecer o host do emulador, senão o avatar local não aparece. Ver §5 e D-8. |
| `apps/web` | N/A. |
| `apps/e2e` | Nenhum código. Passa a subir o Storage junto via `pnpm emulators`. |
| Infra | `firebase.json`, `package.json` da raiz, `turbo.json`, `.github/workflows/ci.yml`, dois `.env.example`. |
| Docs | Os lugares que citam o comando do gate ou dizem que o Storage não é emulado (§10.9). |

Painel comum × admin: N/A. Modo `subscription` × `simple`: sem efeito. Assinatura: sem dependência.

### 1.6 Fontes

Tudo local: a spec, a nota `specs/research/engineering-baseline.md` citada por ela, o código e o código
instalado em `node_modules` (medido, ver §4.3). Nenhuma referência externa ficou sem ler.

---

## 2. Dados (Firestore)

Nenhuma coleção nem campo novo. Os testes gravam dois tipos de dado temporário, sempre pelo Admin SDK e
sempre removidos no `afterAll`:

- documento-sonda `__rules_probe__<uuid>` em cada coleção descoberta (§7.3);
- objetos sob `uploads/<id-aleatório>/` no bucket emulado.

⛔ Nenhum teste chama os endpoints de limpeza total do emulador (`DELETE .../documents`, reset de bucket).
Quando a suíte reaproveita o emulador de quem está desenvolvendo (D-4), isso apagaria o estado do
`pnpm seed`.

## 3. Contrato `@repo/sdk`

N/A. Nenhum DTO, action ou tipo muda. `POST /files` continua devolvendo
`{ data: { path, url, expiresAt, contentType, size } }`.

---

## 4. API (`apps/api`)

### 4.1 Nenhuma rota nova

`POST /files`, `PUT /account`, `PATCH /entities/[id]` e o expurgo continuam iguais. Muda só o módulo que
eles usam, `(shared)/lib/storage.ts`.

### 4.2 O que muda em `storage.ts`

Hoje (`storage.ts:31-35`):

```ts
export const isStorageConfigured = (): boolean =>
    Boolean(env.FIREBASE_STORAGE_BUCKET) && !isEmulated();
const bucket = () => getStorageAdmin().bucket(env.FIREBASE_STORAGE_BUCKET as string);
```

Depois:

- **Storage emulado** se e somente se `FIREBASE_STORAGE_EMULATOR_HOST` estiver preenchido. Nesse modo o
  bucket é sempre `DEMO_STORAGE_BUCKET` (`demo-next-boilerplate.appspot.com`), qualquer que seja
  `FIREBASE_STORAGE_BUCKET`. Um nome de bucket real nunca chega ao cliente do Storage nesse modo.
- Sem esse host, a regra atual fica intacta: bucket preenchido **e** `!isEmulated()`.
- `signReadUrl` no modo emulado devolve `http://<host>/<DEMO_STORAGE_BUCKET>/<path>` sem chamar
  `getSignedUrl` (motivo em §4.3). `expiresAt` continua calculado igual.

`isEmulated()` **não** passa a considerar o host de Storage. Se considerasse, um `.env` com só o host de
Storage preenchido faria o Admin SDK inicializar sem credencial (`packages/auth/server.ts:48-56`) e mandar
Auth e Firestore para o projeto real via ADC.

`storageEmulatorHost()` lê **só** `FIREBASE_STORAGE_EMULATOR_HOST`, o mesmo nome que o `firebase-admin`
lê (`node_modules/.pnpm/firebase-admin@13.6.0/.../lib/storage/storage.js:42-51`). Ele não lê a variante
`NEXT_PUBLIC_`. Se lesse, a API se declararia emulada enquanto o `firebase-admin` mandaria o cliente para
o GCS real com ADC, que é exatamente o vazamento que a trava existe para impedir. Um teste unitário fixa
isso (§7.1).

### 4.3 Por que a URL emulada não é assinada (medido no código instalado)

- Sob emulador o app admin nasce sem credencial (`server.ts:48-56`), então o `firebase-admin` constrói o
  Storage com ADC (`storage.js:76-79`).
- Escrita, listagem e remoção funcionam sem autenticar: com `STORAGE_EMULATOR_HOST` o
  `@google-cloud/storage@7.17.3` marca `customEndpoint = true` (`build/cjs/src/storage.js:461-466`), e o
  `nodejs-common/util.js:494-498` pula o `google-auth-library` nesse caso.
- `getSignedUrl` não tem esse atalho. O `signer.js:149` chama `auth.sign()`, que no
  `google-auth-library` (`googleauth.js:773-792`) resolve o cliente ADC e, sem chave privada, chama
  `signBlob` em `iamcredentials.googleapis.com`. Sob o emulador isso ou falha ("Cannot sign data without
  `client_email`"), ou, numa máquina com `gcloud auth application-default login`, faz uma chamada real ao
  Google. Nos dois casos `POST /files` gravaria o objeto e responderia `UPLOAD_FAILED` (`files/route.ts:32-44`).
- O emulador de Storage serve objetos em estilo de caminho, `GET /:bucketId/:objectId(**)`, pela API
  administrativa, que não avalia rules nem confere assinatura
  (`firebase-tools@15.30.1/.../lib/emulator/storage/apis/gcloud.js:314-331`). É o mesmo formato de uma URL
  v4 real (`https://storage.googleapis.com/<bucket>/<objeto>?X-Goog-...`), só que em outro host.

Conclusão: no modo emulado a URL devolvida é o caminho do objeto no emulador, sem assinatura. Nada de
segurança se perde localmente, porque o emulador aceita qualquer leitura por essa API de qualquer processo
na máquina. O ramo de produção (`getSignedUrl` v4) não muda e continua coberto pelos unitários com mock.
A pergunta da própria spec ("aceitar prova só de escrita e remoção?") fica respondida: não é preciso, a
leitura é provada.

O que isso **não** prova, e continua 🔒 contra bucket real: que o objeto não abre sem assinatura e que a
URL expira (`file-upload-storage`, critérios em `criterios-aceite.md:129` e `:135`).

### 4.4 Erros

Nenhum `error.code` novo. Os existentes continuam valendo: `STORAGE_NOT_CONFIGURED` (503),
`UPLOAD_FAILED` (503), `ACCOUNT_AVATAR_INVALID` (400). `apiErrors` não muda.

---

## 5. Front-end (`apps/app`)

A spec diz "nenhum código; o avatar passa a funcionar no ambiente local". O código mostra que não
funciona sem duas mudanças:

- `apps/app/shared/lib/storageEnabled.ts:3-4` liga o seletor de arquivo só com
  `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`. Sob emulador essa variável fica vazia (`apps/app/.env.example:62`,
  e o e2e a força vazia em `apps/e2e/support/stackEnv.ts:50`), então o campo de avatar nem aparece
  (`AccountProfileForm.tsx:36`).
- A CSP libera imagem só de `https://storage.googleapis.com` (`apps/app/proxy.ts:21`, `:35`, `:63`). A URL
  emulada é `http://127.0.0.1:9199/...`, bloqueada. O avatar é um `<img>` do Radix
  (`ProfileDropdown.tsx:45`) e a pré-visualização usa `ResponsiveImage` com `unoptimized`
  (`image-upload-input.tsx:163-169`), então `next/image` e `remotePatterns` não entram; só a CSP.

Mudança mínima, num commit separado: variável `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` no `env.ts` do
app; `isStorageEnabled()` = bucket **ou** host do emulador; `imgSrc` recebe `http://<host>` quando o host
está preenchido. Sem página, hook, formulário ou i18n novo.

Rotas, prefetch, `queryKeys`, hooks, tabelas: N/A.

### 5.1 i18n

N/A. Nenhum texto novo de UI; nenhum `error.code` novo.

---

## 6. Autorização e segurança

- **Invariante principal:** nenhuma configuração de `.env` faz a API gravar num bucket real enquanto
  Auth ou Firestore estão emulados. Os casos estão em §11 e cada um tem teste unitário.
- A recusa de dono errado não muda: a rota de upload deriva o caminho de `ctx.subjectProfile.id`
  (`files/route.ts:27`), e referências de avatar e foto passam por `isUsablePhotoReference`
  (`entity-photo.ts:32-35`, `account/route.ts:41-48`). A suíte emulada prova isso contra objetos reais.
- **Impersonação:** sem mudança. A leitura personificada continua `read-only` pela feature
  `impersonation-read-only`; nenhum guard é tocado.
- A suíte emulada nunca pode apontar para fora da máquina. O `setupFiles` dela aborta se
  `FIRESTORE_EMULATOR_HOST` ou `FIREBASE_STORAGE_EMULATOR_HOST` não forem `127.0.0.1:<porta>`, e o config
  zera `GOOGLE_APPLICATION_CREDENTIALS` e os `FIREBASE_ADMIN_*` para que o ADC não encontre credencial.
- O host de Storage emulado esquecido num ambiente de produção faz o upload falhar com `UPLOAD_FAILED` e as
  imagens apontarem para `127.0.0.1` (visível, sem vazamento). Não há trava de boot contra host de
  emulador em produção hoje (`apps/api/instrumentation.ts` não lê nenhum), para nenhum dos três. Fica como
  achado de backlog (R-5), fora do corte.

---

## 7. Testes

Aqui a infraestrutura é o objeto do teste (rules e Storage), então a suíte contra emulador se justifica.
O que dá para provar sem emulador continua unitário.

### 7.1 Unitários (sem emulador, dentro do `test` hermético)

| Arquivo | O que prova |
|---|---|
| `packages/auth/__tests__/storageEmulatorHost.test.ts` (novo) | `storageEmulatorHost()` lê `FIREBASE_STORAGE_EMULATOR_HOST`; string vazia é ausência; **ignora** `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` e `STORAGE_EMULATOR_HOST`; `isEmulated()` continua `false` com só o host de Storage. |
| `apps/api/__tests__/storageEmulatorIsolation.test.ts` (estendido) | `clearEmulatorEnv` passa a limpar também `FIREBASE_STORAGE_EMULATOR_HOST`, `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` e `STORAGE_EMULATOR_HOST`, para um shell com a variável exportada não mudar o resultado. Todos os casos atuais seguem com a mesma asserção. Casos novos: com o host de Storage, `isStorageConfigured()` é `true` e `bucket()` recebe `DEMO_STORAGE_BUCKET` mesmo com `REAL_BUCKET` no env; com só a variante `NEXT_PUBLIC_`, continua `false` e nada é gravado; `signReadUrl` no modo emulado devolve `http://127.0.0.1:9199/demo-next-boilerplate.appspot.com/<path>` sem chamar `getSignedUrl`; sem o host, `getSignedUrl` continua sendo chamado. |
| `apps/api/__tests__/emulatorTestRun.test.ts` (novo) | A decisão pura do script de §10.4: ambos os emuladores de pé → reaproveitar; nenhum → subir; só um → recusar com mensagem. |
| `apps/app/__tests__/storageEnabled.test.ts` (novo) | Bucket ou host de emulador ligam o upload; ambos vazios desligam; string vazia é ausência. |
| `apps/app/__tests__/securityPolicySources.test.ts` (estendido) | `img-src` inclui `http://127.0.0.1:9199` com o host preenchido e não inclui sem ele; `https://storage.googleapis.com` segue dependendo só do bucket. |

Isso não é afrouxar teste: nenhuma asserção existente muda. O comportamento novo só existe com uma
variável que os testes atuais não definem.

### 7.2 Contra o emulador (task nova `test:emulator`, só em `apps/api`)

Local: `apps/api/__tests__/*.emulator.test.ts`, pasta plana como o guia manda (§7 do guia), excluídos do
`vitest.config.mts` e incluídos só pelo `vitest.emulator.config.mts`. Todos mockam o que não é o objeto do
teste (guard, ator, repositórios do Firestore, `@/env`) e usam o Storage emulado de verdade.

| Arquivo | O que prova que o unitário não prova |
|---|---|
| `storageUpload.emulator.test.ts` | `POST /files` com um PNG real 1x1 em `FormData` (o `parseUploadedImage` real) → 201; o objeto existe no bucket emulado sob `uploads/<profileId>/` (conferido por `listObjectPaths`); `fetch(data.url)` → 200, `content-type: image/png` e os mesmos bytes; a URL começa com `http://127.0.0.1:9199/`. |
| `storageUpload.emulator.test.ts` | `PUT /account` trocando um avatar próprio por outro próprio → o objeto anterior some do bucket (`fetch` → 404, listagem sem ele) e o novo continua. `userRepository.update` e `getMergedUserByFirestoreDocId` mockados. |
| `storageUpload.emulator.test.ts` | `PUT /account` com `avatar` apontando para `uploads/<outroDono>/<uuid>.png`, objeto que existe → 400 `ACCOUNT_AVATAR_INVALID`; o objeto do outro dono continua no bucket; nada é gravado. |
| `accountErasureStorage.emulator.test.ts` | `runAccountErasure` com perfil sem assinatura, dois objetos do titular e um de outro dono → passo `storage` `done` com `count: 2`; o prefixo do titular fica vazio; o objeto do outro dono sobrevive. Os passos de Firestore e Auth mockados. |
| `firestoreRules.emulator.test.ts` | Para cada coleção descoberta nos repositórios (regex `super\(\s*db,\s*"([^"]+)"` sobre `(shared)/repositories/*.repository.ts`) mais uma coleção aleatória e um caminho aninhado: cliente anônimo e cliente com `mockUserToken` recebem `permission-denied` em `getDoc`, `getDocs` da coleção, `setDoc`, `updateDoc` e `deleteDoc`. A sonda é gravada antes pelo Admin SDK, e um teste de controle lê a sonda pelo Admin, para a recusa não poder vir de documento inexistente. A lista descoberta precisa ter pelo menos um item e incluir `user`. |
| `storageRules.emulator.test.ts` | Com um objeto gravado pelo Admin em `uploads/<id>/<uuid>.png`: cliente anônimo e autenticado recebem `storage/unauthorized` em `getBytes`, `getMetadata`, `uploadBytes` (no mesmo caminho e em `public/x.png`), `deleteObject` e `listAll("uploads")`. Controle pelo Admin prova que o objeto existe. |

A asserção de rules confere o **código** do erro, não só a rejeição. Com `allow read: if true`, ler um
objeto inexistente também rejeitaria (404, `storage/object-not-found`), e o teste passaria sem provar
nada. Por isso a sonda existe e o código é conferido.

Cliente das rules: o SDK `firebase` (cliente), com `connectFirestoreEmulator(..., { mockUserToken })` e
`connectStorageEmulator(..., { mockUserToken })`. Cada identidade usa um `initializeApp` com nome próprio
e é encerrada com `terminate` + `deleteApp` no `afterAll`, senão o worker fica pendurado. Ver D-5 sobre a
dependência.

### 7.3 Garantias contra passar sem rodar

- O Vitest falha quando nenhum arquivo casa com o `include` (`passWithNoTests` é `false` por padrão).
- `test:emulator` tem `cache: false` no turbo, então nunca é servido do cache (D-3).
- O `setupFiles` aborta se os hosts não estiverem definidos.
- Se o emulador não subir, o `firebase emulators:exec` sai com código diferente de zero e a task falha.

---

## 8. O que o `/test` vai percorrer

Pré-condição da máquina: JDK 21 no `PATH` (`export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"`; o
`java` padrão aqui é 17.0.13, medido) e internet na primeira subida, para baixar
`cloud-storage-rules-runtime-v1.1.3.jar` (`~/.cache/firebase/emulators/` hoje só tem o JAR do Firestore e a
UI, medido).

⚠️ Os `.env` locais desta máquina apontam para um projeto Firebase real
(`docs/features/e2e-testing/STATE.md`, notas). A passada de browser tem de rodar com o bloco do emulador,
como o e2e faz em `apps/e2e/support/stackEnv.ts`, sem editar os `.env` do usuário.

Fluxos (uma passada, light + dark + mobile, 3 idiomas):

1. `pnpm emulators` sobe Auth, Firestore **e** Storage (UI em `127.0.0.1:4001` mostra a aba Storage).
2. `pnpm seed`, login como `user@example.com`, `/account` aba Perfil: o seletor de avatar aparece; enviar
   um PNG; a pré-visualização mostra a imagem; salvar; o avatar do `ProfileDropdown` mostra a foto nova.
   Conferir no DevTools que a imagem veio de `127.0.0.1:9199` e que não houve violação de CSP.
3. Trocar o avatar de novo: o objeto anterior some do bucket (UI do emulador ou `listObjectPaths`).
4. `/entities`, editar uma entidade com foto enviada: a miniatura carrega na lista.
5. Excluir a conta com avatar (`POST /account/deletion`): o prefixo `uploads/<profileId>/` fica vazio no
   emulador.
6. Parar o `pnpm emulators`, remover `FIREBASE_STORAGE_EMULATOR_HOST` do env da API e subir de novo com
   Auth/Firestore: `POST /files` volta a responder 503 `STORAGE_NOT_CONFIGURED` (trava preservada).

Gates:

7. `pnpm test` com os emuladores parados → sobe via `emulators:exec` e passa. Com `pnpm emulators` de pé →
   reaproveita e passa. Com o `pnpm emulators` antigo (`--only auth,firestore`) de pé → recusa com a
   mensagem de §10.4.
8. Mutação: trocar `firestore.rules` para `allow read, write: if true` → `pnpm --filter api test:emulator`
   falha; reverter. Mesmo para `storage.rules`. Reverter antes de seguir, e conferir com `git diff`.
9. Sem JDK 21 no `PATH`: `pnpm turbo run test` passa; `pnpm test` falha em `api#test:emulator` com a
   mensagem do `firebase-tools` sobre Java; `pnpm --filter api build` não é afetado pela suíte nova (a
   falha conhecida dele por falta de `FIREBASE_ADMIN_*` é outra, `docs/SETUP.md:388`).
10. `pnpm coverage` roda sem JDK e sem os `*.emulator.test.ts`.

Não observável aqui (vira 🔒): o job `verify` rodando no GitHub com Java e cache; objeto que não abre sem
assinatura e expiração da URL (exigem bucket real).

---

## 9. Critérios de aceite

# Critérios de Aceite (Checklist)

- [ ] **`pnpm emulators` sobe o emulador de Storage junto com Auth e Firestore**
  O script da raiz passa a usar `--only auth,firestore,storage`, e o `firebase.json` declara a porta 9199.
  Na primeira execução o `firebase-tools` baixa o JAR de rules do Storage; depois disso sobe offline. Se o
  JDK for anterior ao 21, o comando falha com a mensagem do próprio `firebase-tools`, como já acontece hoje.

- [ ] **Sob o emulador de Storage a API grava no bucket emulado, nunca num bucket real**
  Com `FIREBASE_STORAGE_EMULATOR_HOST` preenchido, `isStorageConfigured()` é `true` e todo acesso usa
  `demo-next-boilerplate.appspot.com`, mesmo com `FIREBASE_STORAGE_BUCKET` apontando para um bucket real.
  Com Auth ou Firestore emulados e sem o host de Storage, a API continua respondendo 503
  `STORAGE_NOT_CONFIGURED` e não toca bucket nenhum. Com só `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` no
  env da API, o Storage continua desligado, porque o `firebase-admin` não lê essa variável.

- [ ] **Upload sob o emulador devolve uma URL que abre o objeto enviado**
  `POST /files` com um PNG válido responde 201 com `path` sob `uploads/<profileId>/` e `url` em
  `http://127.0.0.1:9199/demo-next-boilerplate.appspot.com/...`. Um `GET` nessa URL devolve 200, o mesmo
  `content-type` e os mesmos bytes. O teste falha se a URL não abrir ou se o caminho sair do prefixo do
  chamador.

- [ ] **A URL emulada não passa por assinatura, e produção continua assinando**
  No modo emulado `signReadUrl` não chama `getSignedUrl`, logo não resolve ADC nem chama
  `iamcredentials.googleapis.com`. Sem o host de Storage, `getSignedUrl` v4 continua sendo chamado com
  `action: "read"` e expiração de 15 minutos. `expiresAt` existe nos dois modos.

- [ ] **Referência a objeto de outro dono é recusada contra objetos reais**
  `PUT /account` com `avatar` apontando para um objeto existente de outro perfil responde 400
  `ACCOUNT_AVATAR_INVALID`, e o objeto continua no bucket. Nenhum documento é atualizado e nenhuma URL é
  emitida para esse objeto.

- [ ] **Trocar o avatar apaga o objeto anterior do titular**
  `PUT /account` com um avatar próprio novo, tendo um avatar próprio anterior, deixa só o novo no bucket.
  A remoção acontece depois da escrita do documento. Um avatar anterior que não pertence ao titular nunca é
  apagado.

- [ ] **O expurgo de conta apaga os objetos do titular no bucket emulado**
  `runAccountErasure` para um perfil com dois objetos devolve o passo `storage` como `done` com `count: 2`.
  O prefixo `uploads/<profileId>/` fica vazio e o objeto de outro perfil continua. Sem Storage configurado,
  o passo continua `skipped: storage-not-configured`, como hoje.

- [ ] **`firestore.rules` recusa cliente anônimo e autenticado em toda coleção do repositório**
  Para cada coleção dos repositórios, uma aleatória e um caminho aninhado, leitura por documento, leitura
  da coleção, criação, atualização e exclusão recebem `permission-denied`, com e sem `mockUserToken`. A
  sonda existe (lida pelo Admin), então a recusa não vem de documento ausente. Trocar a regra por
  `allow read, write: if true` quebra o teste.

- [ ] **`storage.rules` recusa cliente anônimo e autenticado em leitura, escrita, remoção e listagem**
  Sobre um objeto existente, `getBytes`, `getMetadata`, `uploadBytes`, `deleteObject` e `listAll` recebem
  `storage/unauthorized`, com e sem `mockUserToken`. Um `object-not-found` conta como falha do teste, não
  como recusa. Trocar a regra por `allow read, write: if true` quebra o teste.

- [ ] **`pnpm test` roda os testes contra emulador e falha se o emulador não subir**
  O script da raiz vira `turbo test test:emulator`. Com os emuladores parados, `api#test:emulator` sobe
  Firestore e Storage via `firebase emulators:exec` e os derruba no fim. Sem JDK 21 ou sem o JAR e sem
  internet, a task sai com erro, nunca como sucesso. `test:emulator` nunca vem do cache do turbo.

- [ ] **`pnpm test` reaproveita os emuladores de quem está desenvolvendo**
  Com `pnpm emulators` de pé (8080 e 9199 respondendo), a suíte roda contra eles sem subir outra instância
  e sem apagar o estado do seed. Com só 8080 respondendo (o `pnpm emulators` antigo), a suíte recusa e
  manda reiniciar os emuladores. A suíte remove tudo o que gravou.

- [ ] **O gate hermético e o build não dependem de Java**
  `pnpm turbo run test`, `pnpm --filter api test` e `pnpm coverage` continuam rodando sem JDK e sem
  emulador, porque os `*.emulator.test.ts` ficam fora do `vitest.config.mts`. `turbo build` continua
  dependendo só de `test`, então o build da Vercel não precisa de Java.

- [ ] **O job `verify` do CI roda os testes contra emulador**
  O `verify` instala o Temurin 21, restaura o cache de `~/.cache/firebase/emulators` e roda
  `pnpm turbo run lint typecheck test test:emulator`. A chave do cache inclui `firebase.json`, para o JAR
  novo do Storage entrar no cache em vez de ser baixado a cada execução. O job `e2e` usa a mesma chave.

- [ ] **Com a stack local de pé, o usuário troca o avatar e vê a foto nova**
  Com os `.env.example` copiados, `/account` mostra o seletor de avatar, o envio mostra a pré-visualização
  e, depois de salvar, o `ProfileDropdown` exibe a foto servida por `127.0.0.1:9199`, sem violação de CSP,
  em light, dark e mobile, nos três idiomas. Sem o host de emulador e sem bucket, o campo continua
  escondido, como hoje.

- [ ] **Um fork que não usa upload não precisa configurar nada novo**
  Esvaziar `FIREBASE_STORAGE_EMULATOR_HOST` e `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` devolve o
  comportamento anterior: sem bucket, `POST /files` responde `STORAGE_NOT_CONFIGURED` e o painel mostra o
  campo de URL. Nenhuma variável nova é obrigatória em produção.

---

## 10. Blueprint técnico

### 10.1 `packages/auth/emulator.ts`

```ts
/** The emulator creates any bucket on first write; this is the one the demo project owns by convention. */
export const DEMO_STORAGE_BUCKET = `${DEMO_PROJECT_ID}.appspot.com`;

/**
 * Only the name firebase-admin reads. Accepting any other would let the API believe it is emulated while
 * the Admin SDK sends the Storage client to the real Google Cloud Storage.
 */
export const storageEmulatorHost = (): string | null =>
    process.env.FIREBASE_STORAGE_EMULATOR_HOST || null;
```

`isEmulated()` não muda.

### 10.2 `apps/api/(shared)/lib/storage.ts` (pseudo-diff)

```diff
-import { isEmulated } from "@repo/auth/emulator";
+import { DEMO_STORAGE_BUCKET, isEmulated, storageEmulatorHost } from "@repo/auth/emulator";

-/** There is no Cloud Storage emulator in this setup, so ... */
-export const isStorageConfigured = (): boolean =>
-    Boolean(env.FIREBASE_STORAGE_BUCKET) && !isEmulated();
+/**
+ * Emulated Auth or Firestore without the Storage emulator keeps storage off: the Admin SDK would reach
+ * the real bucket with Application Default Credentials. With the Storage emulator every call goes to it,
+ * under the demo bucket, so no real bucket name is ever used in that mode.
+ */
+export const isStorageConfigured = (): boolean =>
+    storageEmulatorHost() !== null ||
+    (Boolean(env.FIREBASE_STORAGE_BUCKET) && !isEmulated());
+
+const bucketName = (): string =>
+    storageEmulatorHost() ? DEMO_STORAGE_BUCKET : (env.FIREBASE_STORAGE_BUCKET as string);

-const bucket = () => getStorageAdmin().bucket(env.FIREBASE_STORAGE_BUCKET as string);
+const bucket = () => getStorageAdmin().bucket(bucketName());

 export async function signReadUrl(path) {
     const expires = Date.now() + SIGNED_URL_TTL_MS;
+    const emulatorHost = storageEmulatorHost();
+    // The emulator checks no signature, and signing needs a key the demo project does not have:
+    // without one, the library asks Google's IAM API to sign.
+    if (emulatorHost) {
+        return {
+            url: `http://${emulatorHost}/${DEMO_STORAGE_BUCKET}/${path}`,
+            expiresAt: new Date(expires).toISOString(),
+        };
+    }
     const [url] = await bucket().file(path).getSignedUrl({ version: "v4", action: "read", expires });
```

O comentário atual de `storage.ts:25-30` ("There is no Cloud Storage emulator in this setup") deixa de ser
verdade e sai. `path` já é validado por `STORAGE_OBJECT_PATH_RE` (`storage.ts:22-23`) antes de chegar
aqui, então não precisa de codificação na URL.

### 10.3 Suíte contra emulador

```
apps/api/
  vitest.config.mts                       ← exclude: [...configDefaults.exclude, "**/*.emulator.test.ts"]
  vitest.emulator.config.mts              ← novo
  scripts/emulator-tests.mjs              ← novo (decide reaproveitar/subir/recusar)
  __tests__/
    emulatorTestRun.test.ts               ← unitário da decisão
    emulatorGuard.emulator-setup.ts       ← setupFiles: aborta sem hosts de loopback
    storageUpload.emulator.test.ts
    accountErasureStorage.emulator.test.ts
    firestoreRules.emulator.test.ts
    storageRules.emulator.test.ts
```

O nome do setup termina em `.emulator-setup.ts` para não casar com nenhum dos dois `include`.

`vitest.emulator.config.mts`:

```ts
const firebaseJson = JSON.parse(readFileSync(path.resolve(__dirname, "../../firebase.json"), "utf8"));
const host = (port: number) => `127.0.0.1:${port}`;

export default defineConfig({
    test: {
        environment: "node",
        include: ["__tests__/**/*.emulator.test.ts"],
        setupFiles: ["__tests__/emulatorGuard.emulator-setup.ts"],
        fileParallelism: false,
        testTimeout: 30_000,
        env: {
            FIRESTORE_EMULATOR_HOST: host(firebaseJson.emulators.firestore.port),
            FIREBASE_STORAGE_EMULATOR_HOST: host(firebaseJson.emulators.storage.port),
            GCLOUD_PROJECT: "demo-next-boilerplate",
            GOOGLE_APPLICATION_CREDENTIALS: "",
            FIREBASE_ADMIN_PROJECT_ID: "",
            FIREBASE_ADMIN_CLIENT_EMAIL: "",
            FIREBASE_ADMIN_PRIVATE_KEY: "",
        },
    },
    resolve: { alias: { /* igual ao vitest.config.mts */ } },
});
```

As portas saem do `firebase.json` para não haver duas fontes. `fileParallelism: false` porque os arquivos
compartilham o emulador.

### 10.4 `apps/api/scripts/emulator-tests.mjs`

```js
export const planEmulatorRun = ({ firestoreUp, storageUp }) =>
    firestoreUp && storageUp ? "reuse" : !firestoreUp && !storageUp ? "start" : "refuse";

// main: sonda TCP 127.0.0.1:8080 e :9199 (timeout curto, node:net)
//  reuse  → spawn `vitest run --config <abs>/vitest.emulator.config.mts`
//  start  → spawn `firebase emulators:exec --only firestore,storage --project demo-next-boilerplate
//             "vitest run --config <abs>/vitest.emulator.config.mts"`
//  refuse → stderr: "Os emuladores estão de pé sem o Storage. Pare o `pnpm emulators` e suba de novo:
//             ele passou a incluir o Storage." e exit 1
// herda stdio; sai com o código do filho.
```

Mensagem em inglês no código (nomes e strings de código seguem em inglês no repo). Auth não entra no
`--only`: nenhum teste da suíte usa o emulador de Auth (`mockUserToken` dispensa). O `firebase` resolve
do `node_modules/.bin` da raiz a partir de `apps/api` (medido: `pnpm --filter api exec which firebase`).
Caminho absoluto para o config porque o `/develop` precisa medir o `cwd` que o `emulators:exec` usa para
o comando filho.

`apps/api/package.json`:

```diff
     "test": "NODE_ENV=test vitest run",
+    "test:emulator": "NODE_ENV=test node scripts/emulator-tests.mjs",
 ...
   "devDependencies": {
+    "firebase": "^11.1.0",
```

`firebase@11.10.0` já está no lockfile (dependência de `packages/auth`); o `pnpm install` só acrescenta o
importer, sem baixar pacote novo.

### 10.5 Infra da raiz

`firebase.json`:

```diff
     "firestore": { "port": 8080 },
+    "storage": { "port": 9199 },
     "ui": { "enabled": true, "port": 4001 },
```

`package.json`:

```diff
-    "emulators": "firebase emulators:start --only auth,firestore --project demo-next-boilerplate",
+    "emulators": "firebase emulators:start --only auth,firestore,storage --project demo-next-boilerplate",
-    "test": "turbo test",
+    "test": "turbo test test:emulator",
```

`turbo.json`:

```diff
     "test": { "dependsOn": ["^test"], "env": [] },
+    "test:emulator": { "dependsOn": ["test"], "cache": false, "outputs": [] },
```

`build.dependsOn` continua `["^build", "test"]`. `envMode: "loose"` (`turbo.json:5`) já repassa `PATH` e
`JAVA_HOME`; com `cache: false` o hash de env não importa. `dependsOn: ["test"]` roda a suíte emulada
depois do unitário da própria `apps/api`, para a JVM não disputar CPU com os ambientes do Vitest (o motivo
do `testTimeout: 20_000` em `apps/api/vitest.config.mts:7-11`).

### 10.6 CI (`.github/workflows/ci.yml`)

```diff
   verify:
     steps:
       ...
+      - uses: actions/setup-java@v6
+        with:
+          distribution: temurin
+          java-version: "21"
       - run: pnpm install --frozen-lockfile
+      - uses: actions/cache@v6
+        with:
+          path: ~/.cache/firebase/emulators
+          key: firebase-emulators-${{ hashFiles('pnpm-lock.yaml', 'firebase.json') }}
-      - run: pnpm turbo run lint typecheck test
+      - run: pnpm turbo run lint typecheck test test:emulator
   e2e:
       - uses: actions/cache@v6
         with:
           path: ~/.cache/firebase/emulators
-          key: firebase-emulators-${{ hashFiles('pnpm-lock.yaml') }}
+          key: firebase-emulators-${{ hashFiles('pnpm-lock.yaml', 'firebase.json') }}
```

Sem a mudança de chave, o cache do `e2e` bateria com a chave antiga (sem o JAR do Storage), e o
`actions/cache` não regrava em acerto: o JAR seria baixado em toda execução. O `coverage` não muda.

### 10.7 Env nova

| Variável | App | `.env.example` | Produção |
|---|---|---|---|
| `FIREBASE_STORAGE_EMULATOR_HOST` | `apps/api` | `"127.0.0.1:9199"`, no bloco do emulador | vazia/ausente |
| `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` | `apps/app` | `"127.0.0.1:9199"`, no bloco do emulador | vazia/ausente |

O comentário de `apps/api/.env.example:34-35` ("Ignored while the emulator hosts above are filled in:
Cloud Storage is not emulated...") é reescrito: o bucket continua ignorado sob emulador, e o upload local
passa a usar o emulador de Storage. Os blocos do emulador nos dois `.env.example` passam a contar a
variável nova como parte do "preencha tudo ou esvazie tudo". `apps/e2e` herda os valores do
`.env.example` (`stackEnv.ts:118`), sem código novo.

### 10.8 `apps/app`

```diff
 // env.ts, client + runtimeEnv
+        NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),

 // shared/lib/storageEnabled.ts
 export const isStorageEnabled = (): boolean =>
-    Boolean(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
+    Boolean(env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST);

 // proxy.ts
+const storageEmulatorOrigin = env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST
+    ? `http://${env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST}`
+    : null;
     imgSrc: [
         GOOGLE_AVATAR_ORIGIN,
         ...(isStorageConfigured ? [STORAGE_ORIGIN] : []),
+        ...(storageEmulatorOrigin ? [storageEmulatorOrigin] : []),
```

### 10.9 Docs a corrigir (prosa que ficaria mentindo)

- `CLAUDE.md:49` e `README.md:265,280`: o comando do `verify` passa a ser
  `pnpm turbo run lint typecheck test test:emulator`; `pnpm test` exige JDK 21.
- `docs/SETUP.md`: tabela do CI (`:151`), "o comando é o mesmo dos dois lados" (`:171`), linha de portas
  (Storage 9199), seção do emulador (o Storage é emulado; variável nova no bloco) e a armadilha "Upload de
  imagem fica desligado sob o emulador", que passa a descrever o caso sem o host de Storage.
- `docs/AI-WORKFLOW.md:186,223`, `docs/TASK-PIPELINE.md:138`, `docs/review-checklist.md:15` e
  `.claude/skills/payments-flow/SKILL.md:87`: o comando do gate.
- `docs/PRE-PRODUCTION.md:57-60`: a nota "`storage.rules` segue sem teste" vira "testado no emulador; ainda
  não publicado". O §6 não muda.
- `BACKLOG.md` (pendências 11 e 18) é do `/spec --sync`; não se mexe aqui.

### 10.10 Ordem de implementação e commits

1. `feat(auth): expose the storage emulator host and demo bucket`: `packages/auth/emulator.ts` + teste.
2. `feat(api): use the storage emulator when its host is set`: `storage.ts` + `storageEmulatorIsolation.test.ts`.
3. `test(api): run upload, erasure and security rules against the emulators`: configs do Vitest, script,
   suíte, unitário do script, `package.json` e `pnpm-lock.yaml`.
4. `chore: start the storage emulator and add the test:emulator task`: `firebase.json`, `package.json` e
   `turbo.json` da raiz.
5. `ci: run the emulator suite in verify`: `ci.yml`.
6. `feat(app): allow uploads and images from the storage emulator`: `env.ts`, `storageEnabled.ts`,
   `proxy.ts`, `.env.example`, testes.
7. `docs: storage emulator and the emulator test gate`: §10.9 + `apps/api/.env.example`.
8. `docs(features): storage-emulator-rules-tests`: artefatos, por último.

O `apps/api/.env.example` pode ir no commit 2 em vez do 7, se o revisor preferir junto do código; a
ordem acima só precisa manter o commit 1 antes do 2 e o 3 antes do 5.

---

## 11. Caminho degradado

| Situação | O que acontece | O que continua funcionando |
|---|---|---|
| Sem JDK 21 no `PATH` (caso desta máquina: `java` é 17.0.13) | `pnpm emulators` falha, como hoje. `pnpm test` falha em `api#test:emulator` com a mensagem do `firebase-tools` ("no longer supports Java version before 21"). Não há pulo silencioso. | `pnpm turbo run test`, `pnpm --filter <ws> test`, `pnpm coverage`, `pnpm check`, `typecheck` e `turbo build`. |
| JDK 21 ok, sem internet e sem o JAR do Storage no cache | `emulators:exec` falha no download; `test:emulator` falha. | O mesmo da linha acima. Depois do primeiro download, tudo roda offline. |
| `pnpm emulators` antigo de pé (sem Storage) | O script recusa e manda reiniciar. | Tudo fora de `test:emulator`. |
| `pnpm emulators` novo de pé | `test:emulator` reaproveita; nada é apagado do seed. | Tudo. |
| `.env` local antigo, sem `FIREBASE_STORAGE_EMULATOR_HOST`, com Auth/Firestore emulados | Comportamento de hoje: 503 `STORAGE_NOT_CONFIGURED`, avatar escondido se o bucket do app também estiver vazio. | Login, seed, CRUD. |
| `.env` com bucket real + emuladores + host de Storage | Tudo vai para o emulador, no bucket demo. | Tudo; bucket real intocado. |
| Só `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` na API | Storage desligado na API (a variável é ignorada de propósito). | Tudo, com upload recusado por código. |
| Produção sem o host de Storage | Idêntico a hoje. | Tudo. |
| Build na Vercel | Não muda: `build` depende só de `test`, que não precisa de Java. | Deploy. |
| Job `coverage` (sem Java) | Não muda: os `*.emulator.test.ts` estão fora do `vitest.config.mts`. | Cobertura. |
| Fork sem upload | Esvazia as duas variáveis novas (ou deixa, localmente) e nada muda em produção. | Tudo. |

---

## 12. Pré-requisitos manuais de infra

O `/develop` não consegue satisfazer estes itens sozinho. O `/test` classifica o que depender deles como
🔒, nunca como reprovado.

1. **JDK 21 no `PATH` de quem roda `pnpm test`.** Nesta máquina ele existe em
   `/opt/homebrew/opt/openjdk@21/bin/java` (21.0.12.1, medido), mas o `java` padrão é 17. Cada sessão
   precisa do `export` de `docs/SETUP.md:14-16`. Não é algo que o repositório resolva.
2. **Internet na primeira subida**, para baixar `cloud-storage-rules-runtime-v1.1.3.jar`. Ainda não está em
   `~/.cache/firebase/emulators/` (medido).
3. **Copiar as variáveis novas para os `.env` já existentes** (`apps/api/.env`, `apps/app/.env`). O
   `.env.example` não se propaga para um `.env` copiado antes. Nesta máquina os `.env` apontam para um
   projeto real; não devem ser editados pelo ciclo.
4. **Primeira execução do `verify` no GitHub** com a mudança, para confirmar Java e cache no runner. Não
   depende de segredo.
5. Continua fora do corte e manual: ativar o Storage, publicar `storage.rules` e conferir o 403 sem
   assinatura num bucket real (`docs/PRE-PRODUCTION.md` §6). Nada disso muda aqui.

---

## 13. Decisões adotadas sem perguntar

| # | Decisão | Alternativa descartada | Por quê |
|---|---|---|---|
| D-1 | No modo emulado, `signReadUrl` devolve a URL de caminho do emulador sem assinar. | Chave RSA descartável como credencial do app admin sob emulador, para o `getSignedUrl` assinar localmente. | A credencial fake valeria para Auth e Firestore também e poderia disparar busca de token OAuth no Google. A URL de caminho tem o mesmo formato da v4, o emulador não confere assinatura, e produção não muda. |
| D-2 | Storage emulado se e só se `FIREBASE_STORAGE_EMULATOR_HOST` existir; bucket sempre `DEMO_STORAGE_BUCKET` nesse modo. | Usar o `FIREBASE_STORAGE_BUCKET` do env também no emulador. | Com o nome demo, "nunca aponta para bucket real" vale até no nome, e o upload local não depende de configurar bucket. |
| D-3 | Task nova `test:emulator` (`cache: false`), fora da task `test`; `pnpm test` roda as duas; `verify` roda as duas; `build` continua dependendo só de `test`. | Colocar os testes dentro de `api#test`. | Dentro de `test`, todo `turbo build`, inclusive o da Vercel, passaria a exigir Java; e a task hermética perderia o `env: []`. A spec autoriza separar o que o build exige do que o gate exige ("Riscos e trade-offs"). |
| D-3b | `cache: false` em `test:emulator`. | Cachear com `inputs` incluindo `firestore.rules`, `storage.rules` e `firebase.json`. | O resultado depende de processo externo e da versão do emulador, que o hash não captura bem. A spec lista "servido do cache sem ter rodado" como risco. Custo: a subida do emulador em toda execução de `pnpm test`. |
| D-4 | O script reaproveita emuladores de pé (8080 e 9199), sobe via `emulators:exec` quando não há nenhum e recusa estado parcial. | Sempre `emulators:exec`, falhando por porta ocupada. | O caminho local documentado deixa `pnpm emulators` rodando (`docs/SETUP.md`, seção do emulador), e as portas 4400/4500/9150 não são configuráveis: `pnpm test` quebraria sempre que o dev estivesse com o emulador de pé. O e2e já reaproveita (`playwright.config.ts`, `reuseExistingServer: true`). |
| D-5 | Testes de rules com o SDK `firebase` (cliente) e `mockUserToken`, declarado como devDependency de `apps/api`. | `@firebase/rules-unit-testing`; ou REST cru contra o emulador. | `firebase@11.10.0` já está no lockfile, então nenhum pacote novo entra. O `rules-unit-testing` é uma camada sobre essas mesmas chamadas, e o Admin SDK já cobre o "semear sem rules". REST cru testaria um protocolo que nenhum cliente real usa. |
| D-6 | Toda a suíte emulada mora em `apps/api`. | Rules em `packages/auth`, que já tem `firebase`. | Duas workspaces com emulador rodariam em paralelo no turbo e brigariam pelas mesmas portas. `apps/api` também já tem o Admin SDK para semear. |
| D-7 | Suíte sobe só `firestore,storage`. | Incluir `auth`. | Nenhum teste usa o emulador de Auth; menos uma JVM e uma porta. |
| D-8 | Mudança mínima em `apps/app` (flag + CSP). | Seguir a spec ao pé da letra ("nenhum código") e marcar o sinal "o usuário troca o avatar" como não entregue. | A premissa da spec não se sustenta no código (§5). A política manda corrigir plano errado em vez de segui-lo. Commit próprio, dá para reverter isolado. |
| D-9 | Coleções do teste de rules descobertas nos repositórios por regex, mais uma aleatória e um caminho aninhado. | Lista fixa no teste. | Uma coleção nova de um fork entra no teste sem ninguém lembrar de atualizar a lista. |
| D-10 | Asserção pelo código de erro (`permission-denied`, `storage/unauthorized`) sobre sonda existente. | Só "a promessa rejeita". | Rejeitar por objeto inexistente também passaria com a regra aberta. |
| D-11 | Sem teste Playwright de upload. | Um spec no `apps/e2e`. | O corte pede teste automatizado do comportamento de Storage, que o Vitest emulado prova mais barato. O fluxo visual é da passada do `/test`. |

---

## 14. Perguntas em aberto

1. **O `pnpm build` deve depender dos testes contra emulador?** A spec diz "antes de todo `pnpm build`"
   e, na mesma seção de riscos, admite separar. Opções: (a) `build` depende só de `test`; (b) `build`
   depende de `test:emulator`, e a Vercel passa a precisar de Java (ela não tem). **Adotada: (a).** Com
   (b) todo deploy quebraria.
2. **`pnpm test` sem JDK 21 deve falhar ou pular a parte emulada?** O orquestrador pediu que o teste com
   emulador não quebre o gate hermético de quem não tem JDK; a spec pede que `pnpm test` falhe se o
   emulador não subir. **Adotada:** o gate hermético (`turbo run test`) não precisa de JDK; `pnpm test`
   falha sem ele. É o que a decisão do usuário de 2026-09-26 registrada na spec pede, e pular em silêncio
   é o modo de falha que a spec quer eliminar.
3. **Tocar `apps/app`, que a spec marcou como "nenhum código"?** Opções: (a) flag + CSP num commit
   próprio; (b) não tocar e entregar o sinal do avatar local como não cumprido. **Adotada: (a)**, pela
   evidência de §5.
4. **Preencher `FIREBASE_STORAGE_EMULATOR_HOST` por padrão nos `.env.example`?** Opções: (a) preenchido,
   no bloco do emulador; (b) vazio, opt-in. **Adotada: (a)**, porque é o mesmo tratamento de Auth e
   Firestore (`apps/api/.env.example:3-12`) e é o que faz o avatar funcionar "com a stack local de pé".
   Um fork que esvazia só Auth/Firestore e esquece o de Storage fica com upload falhando em
   `UPLOAD_FAILED`, sem vazamento.

---

## 15. Riscos

- **R-1. O `cwd` do comando filho no `emulators:exec`.** Não medi se é o diretório do `firebase.json` ou o
  de quem chamou. O plano usa caminho absoluto para o config do Vitest para não depender disso; o
  `/develop` confirma.
- **R-2. Chamada de rede residual sob emulador.** Escrita e listagem pulam a autenticação
  (`util.js:494-498`), mas não medi se algum caminho resolve `projectId` via ADC (metadata server). O
  `/develop` repete a medição de `firebase-emulator-seed` (hook em `net`/`dns` no processo, ou `lsof`) e
  confirma zero conexão fora de `127.0.0.1` durante a suíte.
- **R-3. Importar o `@repo/auth/server` real nos testes.** Ele importa `server-only` e `next/headers`, e
  `keys()` valida env. O mock de `server-only` já é padrão no repo; o resto o `/develop` mede no primeiro
  teste.
- **R-4. Tempo do `verify`.** Soma JVM do Firestore, runtime de rules do Storage e download do JAR na
  primeira vez. O teto de 15 minutos deve sobrar (o `verify` leva cerca de um minuto, `docs/SETUP.md:175`),
  mas o número real sai do primeiro run.
- **R-5. Host de emulador esquecido em produção.** Nenhum dos três hosts tem trava de boot em produção.
  Sugestão para o backlog, fora deste corte: `instrumentation.ts` recusar subir em produção com qualquer
  `*_EMULATOR_HOST` preenchido.
- **R-6. Reaproveitar o emulador do dev** faz a suíte rodar contra as rules que aquele processo carregou.
  O `firebase-tools` recarrega as rules do Storage ao mudar o arquivo
  (`lib/emulator/storage/rules/manager.js:33-34`); para o Firestore, o `/develop` confirma o mesmo antes
  de o `/test` fazer a mutação do item 8 de §8 em modo reaproveitado. Na dúvida, a mutação roda com os
  emuladores parados.
