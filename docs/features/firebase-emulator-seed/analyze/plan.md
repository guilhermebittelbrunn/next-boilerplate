# Plano — Emulador do Firebase, seed e primeiro admin

> Spec de origem: [`specs/firebase-emulator-seed.md`](../../../../specs/firebase-emulator-seed.md)
> (auditada em 2026-09-15). Guia: [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md).
> Roda no `/cycle` autônomo — as ambiguidades foram **decididas**, não perguntadas. §21 registra cada uma.

---

## 1. Contexto da tarefa

### 1.1 Resumo em uma frase

Fazer o boilerplate subir inteiro contra os emuladores do Firebase (Auth + Firestore) com um estado
inicial reprodutível — sem conta no Google, sem projeto provisionado, sem internet e sem tocar em dado
real — mantendo o caminho do Firebase real intacto para quem vai publicar.

### 1.2 Problema, em evidência

| Fato | Evidência |
|------|-----------|
| Não há bloco `emulators` | `firebase.json:1-9` — só `firestore` (`:2-5`) e `storage` (`:6-8`) |
| `firebase-tools` não é dependência de ninguém | `pnpm-lock.yaml` ⇒ **0 ocorrências** (medido); `node_modules/.bin` sem binário `firebase` |
| Zero menção a emulador em código | `grep -rn "emulator\|EMULATOR"` em `*.ts/*.mts/*.mjs/*.json` ⇒ **0 hits** de código (só spec/pesquisa/docs de features) |
| Não existe seed nem fixture | nenhum script além de `apps/api/scripts/create-dev-admin.mjs` e dois `skip-ci.js` |
| `firestore.rules` é deny-all **publicada** e nunca exercitada por teste | `firestore.rules:32-34`; verificação manual por `curl` em `docs/SECURITY.md:62-70` |
| `storage.rules` é deny-all **nunca publicada** | `storage.rules:27-29`; `docs/PRE-PRODUCTION.md:106` em aberto |
| O QA suja um projeto Firebase real | `docs/PRE-PRODUCTION.md:242-254` — 15 contas de QA acumuladas em 12 PRs, uma inutilizável |
| Pelo produto, para criar admin é preciso já ser admin | `apps/api/app/(routes)/auth/sign-up/route.ts:34` (`type: UserType.COMMON` fixo) × `apps/api/app/(routes)/users/route.ts` atrás de `requireAdminApi` |
| Metade do item 3 já existe | `apps/api/scripts/create-dev-admin.mjs` (idempotente, `:48-67` e `:69-97`), exposto em `apps/api/package.json:13` — mas **só contra projeto real** (`:31-46` exige service account) |

### 1.3 Objetivos (o corte de MVP da spec, item a item)

| # | Item do corte | Entrega planejada |
|---|---------------|-------------------|
| 1 | `pnpm install` + um comando sobem o stack contra Firebase emulado | `pnpm emulators` (raiz) + `pnpm dev`, com `.env.example` já apontando para o emulador |
| 2 | Um comando popula o estado inicial conhecido | `pnpm seed` → 1 admin + 2 comuns + 6 `entity`, credenciais documentadas |
| 3 | Caminho **de código** para o primeiro admin, no emulador **e** em projeto real | `create-dev-admin.mjs` **estendido** (não reescrito): dispensa service account quando emulando |
| 4 | Ambiente redefinível por um comando | `pnpm seed` **apaga e repovoa** — reset e seed são o mesmo comando, por construção |
| 5 | `docs/SETUP.md` com o caminho local (emulador) como padrão | Seção nova entre `SETUP.md:197` e `:199`, + Java nos pré-requisitos (`:9-18`) + portas (`:107`) |

### 1.4 Fora de escopo (explícito)

Da spec (§"Fora do corte"), mantido intacto conforme `.claude/cycle-policy.md` §2:

- **Suíte de testes das security rules** (`@firebase/rules-unit-testing`). Este corte entrega o
  **pré-requisito**; a suíte anda com `ci-pipeline`/`e2e-testing`.
- **Emular serviços além de Auth e Firestore** — em particular **Storage**. Consequência a registrar
  com honestidade: `storage.rules` continua sem teste depois desta entrega. Ver §21-D.
- **Seed de volume** para teste de carga/paginação (entra com `cursor-pagination`).
- **Promover/rebaixar admin pela UI do painel** — é produto, não bootstrap.

Decidido por mim, fora da spec, para manter o raio mínimo:

- **`.github/workflows/ci.yml` não muda.** Nada nesta entrega roda o emulador no CI (os testes novos são
  puros). Java + cache do JAR entram quando a suíte de rules existir. Ver §14.
- **`turbo.json` não muda.** Nenhuma task nova; `pnpm emulators` é script de raiz, não task do turbo.
  `test.env: []` (`turbo.json:28`) só afeta o hash, e com `envMode: "loose"` (`:5`) as vars passam — os
  testes novos estubam env no próprio arquivo.
- **`apps/api` continua exigindo service account para `pnpm build`.** `apps/api/env.ts:13-15` declara os
  três `FIREBASE_ADMIN_*` como obrigatórios; `skipValidation` (`:46`) só vale em `development`. O corte
  pede `pnpm dev`, que é `development` — o caminho funciona. Afrouxar o `env.ts` para o build é mudança
  de outra natureza (e `docs/SETUP.md:58-60` já documenta o build fora do CI por causa disso). Ver §21-F.

### 1.5 Apps impactados

| Alvo | Impacto |
|------|---------|
| raiz | `firebase.json` (bloco `emulators`), `package.json` (2 scripts + 1 devDep), `.gitignore` |
| `packages/auth` | módulo novo `emulator.ts`; 1 ramo em `server.ts`; 1 ramo em `client.ts`; 2 chaves em `keys.ts` |
| `apps/api` | base do Identity Toolkit REST; 2 scripts (`seed-emulator.mjs` novo, `create-dev-admin.mjs` estendido); `.env.example` |
| `apps/app` | `env.ts` (1 var) + `proxy.ts` (1 origem no CSP) + `.env.example` |
| `apps/web` | `env.ts` (1 var) + `proxy.ts` (1 origem no CSP) + `.env.example` |
| `packages/sdk` | **N/A** — nenhum contrato muda |
| `packages/internationalization` | **N/A** — zero string de UI, zero `error.code` novo |
| `docs` | `SETUP.md` (seção nova + pré-requisitos + portas), `PRE-PRODUCTION.md` (nota) |

### 1.6 Área do painel · modo de produto · assinatura

- **Área do painel**: N/A — não há rota nem tela. O efeito no painel é indireto (a área admin passa a ser
  alcançável no primeiro dia, via seed).
- **Modo de produto** (`NEXT_PUBLIC_PRODUCT_MODE`): sem diferença de comportamento. O seed cria um admin e
  usuários comuns; os dois modos consomem o mesmo estado.
- **Assinatura/plano**: N/A. Stripe não é emulado e não entra no corte.

### 1.7 Genérico × específico

Genérico por definição — é infraestrutura de desenvolvimento que **todo fork herda**. O código de decisão
mora em `packages/auth` (pacote de integração, permitido por `.claude/cycle-policy.md` §2); os scripts
moram em `apps/api`, que já é a casa do `create-dev-admin.mjs`.

### 1.8 Fontes, links e anexos

Sem card de ClickUp, sem Figma, sem print. A spec é a fonte, e foi lida por inteiro.
Referências consultadas: `specs/research/engineering-baseline.md:66-67,145` (práticas 3 e 4),
`specs/e2e-testing.md:10` (`depends_on: [ci-pipeline, firebase-emulator-seed]`),
`specs/BACKLOG.md:140,189,257`. **Nenhuma referência não lida.**

---

## 2. Dados (Firestore)

### 2.1 Coleções e forma do documento

Só existem **duas** coleções no repo — verificado por `grep -rn "super(db," --include="*.ts" apps/api`:

| Coleção | Repositório | Mapper |
|---------|-------------|--------|
| `user` | `apps/api/(shared)/repositories/user.repository.ts:12` → `super(db, "user")` | **sem mapper** |
| `entity` | `apps/api/(shared)/repositories/entity.repository.ts:8` → `super(db, "entity", entityMapper)` | `entity.mapper.ts` |

`grep -rn "\.collection(" --include="*.ts" apps | grep -v "this.table"` ⇒ **zero** — todo acesso passa
pelo `BaseRepository`.

**`user`** (doc id auto-gerado):

| campo | tipo | obrigatório | nota |
|-------|------|-------------|------|
| `reference_id` | string | sim | **snake_case**; é o `uid` do Firebase Auth (`packages/sdk/src/types/user/user.ts:12-22`) |
| `type` | `"admin" \| "common"` | sim | `UserType` em `user.ts:2-5` |
| `createdAt` / `updatedAt` | Timestamp | sim | carimbados por `base.repository.ts:73-76` |
| `deletedAt` | `null` \| Timestamp | **sim, gravado como `null`** | ver armadilha abaixo |
| `phone`, `avatar`, `preferences` | opcionais | não | não usados pelo seed |

`email`, `password`, `displayName` e `disabled` **não** vivem no Firestore — são do Firebase Auth.

**`entity`** (doc id auto-gerado) — whitelist de `toPersistence` em `entity.mapper.ts:36-45`:
`userId`, `name`, `description`, `type`, `photo`, `genre`, `birthdate`, `enabled`
(+ `createdAt`/`updatedAt`/`deletedAt` do `BaseRepository`).

| campo | valor aceito |
|-------|--------------|
| `userId` | **doc id do `user`**, não o `reference_id`/uid — `apps/api/app/(routes)/entities/route.ts` usa `ctx.subjectProfile.id` |
| `type` | `"franchise" \| "customer" \| "collaborator"` (`packages/sdk/src/types/entity/entity.ts:2-6`) |
| `genre` | `"male" \| "female" \| "other" \| null` (`apps/api/(shared)/validation/entity.schema.ts:37`) |
| `birthdate` | `"YYYY-MM-DD"` \| null (`entity.schema.ts:39-43`) |
| `enabled` | boolean, default `true` |
| `photo` | path `uploads/<id>/<uuid>.(jpg\|png\|webp)` ou URL http(s) — o seed grava **`null`** (Storage fora do corte) |

⚠️ **`photoUrl` nunca vai ao Firestore** — é derivado na leitura (`entity.ts:16-20`; ausente da whitelist
`:36-45`).

### 2.2 Duas armadilhas que o seed tem de respeitar

1. **`deletedAt` tem de existir e ser `null`.** `base.repository.ts:36-49` (`findAll`) filtra
   `.where("deletedAt", "==", null)`, e `user.repository.ts:15-30` (`findByReferenceId`) idem. Documento
   **sem** o campo é invisível — a igualdade não casa com ausência no Firestore.
2. **`entity.userId` é o doc id do perfil, não o uid.** Semear com o uid faz a listagem do painel vir
   vazia sem erro nenhum.

Terceira, específica da listagem admin: `user.repository.ts:32-43` faz merge com o Firebase Auth por
`reference_id` e **descarta** o perfil cujo uid não existe no Auth (`:57-61`). Logo o seed tem de criar a
conta no **Auth do emulador primeiro** e só então gravar o perfil com o uid devolvido — a mesma ordem do
sign-up real (`auth/sign-up/route.ts:19` → `:32-35`).

### 2.3 Consultas, índices e dados existentes

- Nenhuma consulta nova. O seed escreve; não lê em produção.
- `firestore.indexes.json` **não muda** — o emulador não exige índice composto declarado (ele cria
  índices implícitos), e nenhuma query nova é introduzida.
- **Backfill**: N/A. Nada é alterado em documento existente.
- `firestore.rules` **não muda** — a API do seed usa o Admin SDK, que ignora as rules, exatamente como a
  `apps/api` (`firestore.rules:7-13`).

---

## 3. Contrato — `@repo/sdk`

**N/A.** Nenhum DTO, nenhuma action, nenhum `Create/UpdateRequest`. `packages/sdk` não é tocado.
A spec confirma: *"`packages/sdk` — Nenhum."* (§Impacto por camada).

---

## 4. API (`apps/api`)

Nenhuma **rota** nova, nenhum guard novo, nenhum schema Zod novo, nenhum `error.code` novo.
O que muda na `apps/api` são três coisas, todas fora do ciclo de requisição HTTP:

### 4.1 A base do Identity Toolkit REST

`apps/api/(shared)/lib/firebase-identity-toolkit.ts:3` tem a base **hardcoded**:

```ts
const BASE = "https://identitytoolkit.googleapis.com/v1";
```

Ela é o **ponto único** de redirecionamento server-side. As rotas que dependem dela:

| Rota da `apps/api` | Função | Viva? |
|--------------------|--------|-------|
| `POST /auth/sign-in/google` (`google/route.ts:15`) | `identitySignInWithGoogleIdToken` (`:164`) | sim |
| `POST /auth/password/reset` (`reset/route.ts:26`) | `identityResetPassword` (`:105`) | sim |
| `POST /auth/email-verification/confirm` (`confirm/route.ts:24`) | `identityApplyOobCode` (`:118`) | sim |
| `POST /users` — admin cria usuário (`users/route.ts:54`) | `identitySignUp` (`:62`) | sim |
| `PATCH /account/password` — reautenticação (`password/route.ts:35`) | `identitySignInWithPassword` (`:79`) | sim |
| `POST /auth/sign-in` (`sign-in/route.ts:7`) | `identitySignInWithPassword` | ⚠️ **sem consumidor** |
| `POST /auth/sign-up` (`sign-up/route.ts:19`) | `identitySignUp` | ⚠️ **sem consumidor** |

⚠️ Achado que corrige a leitura ingênua: **`POST /auth/sign-in` e `POST /auth/sign-up` da `apps/api` não
têm consumidor no front-end** — `packages/sdk/src/actions/auth/action.ts` expõe apenas `me`,
`signInWithGoogle`, `requestPasswordReset`, `confirmPasswordReset`, `sendEmailVerification` e
`confirmEmailVerification`. O login por e-mail/senha **não passa pela `apps/api`** (§5.1). Ainda assim a
base precisa trocar: as outras **cinco** rotas estão vivas, e sem isso "recuperar senha" e "verificar
e-mail" no ambiente emulado sairiam para a internet — funcionando contra o projeto real, sem erro nenhum.

O emulador de Auth serve a mesma API prefixando o host original como caminho:
`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<qualquer>`.

Além disso, `getWebApiKey()` (`:26-34`) **lança** sem `FIREBASE_WEB_API_KEY`; contra o emulador qualquer
chave serve, então precisa de fallback para uma constante quando emulando.

### 4.2 Os dois scripts

- **`apps/api/scripts/seed-emulator.mjs`** (novo).
- **`apps/api/scripts/create-dev-admin.mjs`** (estendido — ver §8).
- **`apps/api/scripts/emulatorTarget.mjs`** (novo, minúsculo): a **trava**, isolada em função pura para
  ser testável sem subir processo.

### 4.3 Erros

**N/A** — zero `error.code` novo, logo zero entrada em `apiErrors`
(`packages/internationalization/translations/packages/shared/utils.ts`) e zero risco no teste de paridade
(`packages/internationalization/__tests__/parity.test.ts`).

---

## 5. Front-end (`apps/app` / `apps/web`)

Nenhuma rota, nenhuma página, nenhum componente, nenhum hook, nenhum formulário, nenhuma `queryKey`.
Duas mudanças pontuais, idênticas nos dois apps:

### 5.1 O navegador precisa falar com o emulador de Auth

O login **não** é mediado pela `apps/api`: o navegador usa o client SDK e fala **direto** com o
Identity Toolkit. Cadeia medida:

`SignInForm.tsx:35` (`useAuth()`) → `SignInForm.tsx:124-129` (`signIn.mutate`) →
`packages/auth/provider.tsx:217-222` (`useMutation({ mutationFn: signIn })`) →
`packages/auth/client.ts:110-113` (`signInWithEmailAndPassword`) → **`identitytoolkit.googleapis.com`
a partir do navegador**. Só depois `provider.tsx:96-115` troca o ID token pelo session cookie em
`POST /api/auth/session`. Cadastro é idêntico (`SignUpFormClient.tsx:106-109` → `client.ts:128-131`).

⚠️ E **o session cookie é mintado nos próprios front-ends, não na `apps/api`**:
`apps/app/app/api/auth/session/route.ts` e `apps/web/app/api/auth/session/route.ts` delegam a
`packages/auth/session-routes.ts:33-70`, que chama `session.ts:80-89` → `server.ts:214-222`
(`createSessionCookie`, Admin SDK). **Consequência para o plano: `apps/app` e `apps/web` também rodam o
Admin SDK** e por isso também precisam de `FIREBASE_AUTH_EMULATOR_HOST` (§8.11) — não só a `apps/api`.

Logo o client SDK precisa de `connectAuthEmulator` (§8.3), **e** o CSP precisa liberar a origem.

### 5.2 CSP

`apps/app/proxy.ts:43-48` monta `connectSrc` com `IDENTITY_TOOLKIT_ORIGIN` (`:14`) e `SECURE_TOKEN_ORIGIN`
(`:16`); `apps/web/proxy.ts:23-27` tem o equivalente. `packages/security/middleware.ts:92` faz
`connectSrc: toSources([SELF, ...input.connectSrc])` — acrescentar uma origem é trivial, e `toSources`
(`:30-32`) já deduplica e filtra falsy.

⚠️ **Assimetria entre os dois apps**: no `apps/app` o CSP é **bloqueante** (`proxy.ts:132`, sem
`reportOnly`); no `apps/web` é **report-only** (`apps/web/proxy.ts:36` — `REPORT_ONLY = true`, aplicado em
`:69-73`). Ou seja, sem a mudança o `apps/web` não quebraria — apenas gritaria no console. A mudança lá
entra por higiene e simetria, não por necessidade funcional.

⚠️ **`127.0.0.1` e não `localhost`, de propósito.** O nosecone emite HSTS por default
(`nosecone/index.js:176-180`, `maxAge` 365 dias, `includeSubDomains: true`) e `buildBrowserAppOptions`
não o desativa (`middleware.ts:54-58` só mexe em COOP/COEP). Se o app servir em `localhost` e o emulador
também, o HSTS do primeiro pode alcançar o segundo; `127.0.0.1` é outro host e fica fora.

✅ **Risco descartado com evidência**: `upgrade-insecure-requests` **não** é emitido, então
`http://127.0.0.1:9099` não é reescrito para `https://`. Duas razões, medidas no pacote instalado
(`nosecone@1.0.0-beta.13`): o conjunto `directives` default (`nosecone/index.js:139-154`) não inclui
`upgradeInsecureRequests`, e `createContentSecurityPolicy` (`:250`) faz
`options?.directives ?? defaults...` — ou seja **substitui** o conjunto, não faz merge, e
`buildBrowserAppOptions` passa um conjunto explícito e completo (`middleware.ts:67-101`).

---

## 6. Autorização e segurança

Nenhuma regra de autorização muda. Guards, ownership e impersonação seguem intactos — nenhum handler é
tocado. O que esta entrega acrescenta é **superfície de bootstrap**, e é aí que mora o risco.

### 6.1 A armadilha que a spec nomeia

> *"Credencial de demonstração é armadilha de segurança: um fork que rode o seed em produção cria um
> admin com senha conhecida. O bootstrap tem de ser inofensivo por padrão fora do ambiente local, e isso
> precisa estar escrito, não implícito."* — `specs/firebase-emulator-seed.md:141-143`

Traduzido em **travas verificáveis**, não em aviso:

| # | Trava | Onde | Como se verifica |
|---|-------|------|------------------|
| T1 | `seed-emulator.mjs` **recusa rodar** se `FIRESTORE_EMULATOR_HOST` ou `FIREBASE_AUTH_EMULATOR_HOST` estiverem ausentes/vazios. Sai 1 antes de qualquer `initializeApp`. | `emulatorTarget.mjs` | teste unitário da função pura |
| T2 | `seed-emulator.mjs` **recusa** se o project id não começar com `demo-`. Cinto e suspensório: mesmo com host de emulador apontado para um proxy, o alvo tem de ser um projeto de demonstração. | `emulatorTarget.mjs` | teste unitário |
| T3 | `create-dev-admin.mjs` contra **projeto real** passa a exigir consentimento escrito: `--allow-real-project` (ou `DEV_ADMIN_ALLOW_REAL_PROJECT=1`). Sem isso, recusa com a instrução na mensagem. Contra o emulador, roda sem cerimônia e sem service account. | `create-dev-admin.mjs` | teste unitário do predicado |
| T4 | **Nenhuma senha versionada fora do contexto de demonstração.** As credenciais do seed são constantes `@example.com` no script e no `SETUP.md`; elas só existem em base emulada, que T1+T2 garantem. | `seed-emulator.mjs` | revisão |
| T5 | `.env.example` publica os hosts do emulador **preenchidos**; a forma de recusar é **esvaziar** (`VAR=""`), que o código lê como ausência via `\|\|`. | `.env.example` × `keys.ts` | teste unitário do predicado |

T3 é **mudança de comportamento** de um fluxo documentado (`docs/SETUP.md:199-220`). É deliberada: o
único risco real daquele script é ser rodado no lugar errado, e o `SETUP.md:219-220` hoje só **avisa**.
Ver §21-C.

### 6.2 Impersonação

Sem efeito. Nenhuma leitura RSC, nenhum `isImpersonating()`, nenhum guard tocado.

### 6.3 Dado sensível

O seed grava só e-mails `@example.com` e nomes fictícios. Nenhum token, segredo ou PII.
⚠️ `docs/features/**/test/e2e/` e `**/screenshots/` já são gitignored (`.gitignore`), e
`.claude/dev-credentials.local.md` também — nada muda aí.

---

## 7. Dependência nova — `firebase-tools`

**É dependência nova e é inevitável.** Registro explícito porque `.claude/cycle-policy.md` §2 proíbe
adotar dependência nova sem passar pelo relatório.

**Primeiro procurei o caminho transitivo** — foi assim que `file-upload-storage` saiu com zero dependência
nova, via `@google-cloud/storage` dentro do `firebase-admin`:

```
grep -c "firebase-tools" pnpm-lock.yaml   ⇒ 0
ls node_modules/.bin | grep -i firebase   ⇒ (vazio)
```

**Não vem.** `firebase-admin@13` é a biblioteca de servidor; os emuladores são um produto separado,
distribuído **só** pela CLI `firebase-tools`, que baixa e executa os JARs. Não existe substituto no repo.

| Item | Decisão |
|------|---------|
| Onde | `devDependencies` do **`package.json` da raiz** — é a raiz que dona o `firebase.json`, o `.firebaserc` e os dois `.rules` |
| Versão | **fixada exata**: `"firebase-tools": "15.30.1"` — mesmo estilo de `"@biomejs/biome": "2.3.1"` e `"ultracite": "6.0.3"` |
| Node | `engines` de `firebase-tools@15.30.1` ⇒ `>=20`; o repo está em `22.12.0` (`.nvmrc`) ✅ |
| Custo em dinheiro | **zero** (`specs/firebase-emulator-seed.md:99`) |
| Custo real herdado | `pnpm install` mais pesado (a CLI é grande) e o **runtime Java**, que o JAR do emulador exige |
| Alternativa considerada | `npx -y firebase-tools@latest` a cada invocação, como `firestore.rules:20` e `docs/SETUP.md:185` já fazem para `deploy`. **Descartada** — ver §21-A |

---

## 8. Blueprint técnico (Etapa 2)

### 8.0 A ideia central: **um** predicado, não sete

São **cinco** pontos de conexão com o Firebase espalhados pelo repo, e cada um, se esquecido, falha
**silenciosamente contra o projeto real**:

| # | Ponto | Arquivo |
|---|-------|---------|
| C1 | Admin SDK (Firestore + Auth), server-side | `packages/auth/server.ts:35-99` |
| C2 | Client SDK (browser) | `packages/auth/client.ts:62-100` |
| C3 | Identity Toolkit REST da API | `apps/api/(shared)/lib/firebase-identity-toolkit.ts:3` |
| C4 | CSP `connect-src` | `apps/app/proxy.ts:43-48`, `apps/web/proxy.ts` |
| C5 | Scripts de bootstrap | `apps/api/scripts/*.mjs` |

Seguindo `.claude/cycle-policy.md` §3 (*"corrigir na raiz, não replicar workaround"*), a decisão
"estou emulando? contra qual host? qual project id?" vive **num único módulo**, importado pelos cinco.

### 8.1 Módulo novo — `packages/auth/emulator.ts`

Sem `"server-only"` e sem `"use client"`: é lido dos dois lados.

```ts
/** Project ids com este prefixo são aceitos pelos emuladores sem credencial e nunca
 *  existem no Google — é o que permite rodar sem conta e sem rede. */
export const DEMO_PROJECT_ID = "demo-next-boilerplate";
/** O emulador de Auth aceita qualquer chave; esta existe só para a URL ficar válida. */
export const DEMO_WEB_API_KEY = "demo-api-key";

/** `||` e não `??`: `.env.example` publica `VAR=""` como a forma de recusar, e string
 *  vazia tem de ler como ausência. Mesmo motivo de packages/auth/keys.ts:51-53. */
export const authEmulatorHost = (): string | null =>
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
    null;

export const firestoreEmulatorHost = (): string | null =>
    process.env.FIRESTORE_EMULATOR_HOST || null;

export const authEmulatorOrigin = (): string | null => {
    const host = authEmulatorHost();
    return host ? `http://${host}` : null;
};

export const isEmulated = (): boolean =>
    Boolean(authEmulatorHost() || firestoreEmulatorHost());
```

⚠️ **Os acessos a `process.env.NEXT_PUBLIC_*` têm de ser literais** para o Next inlinar no bundle do
navegador — acima estão, e o `/develop` não pode refatorá-los para acesso dinâmico.

`packages/auth/package.json` ganha `"./emulator": "./emulator.ts"` em `exports`.

### 8.2 C1 — Admin SDK (`packages/auth/server.ts`)

Hoje `getFirebaseAdminApp()` **lança** sem os três `FIREBASE_ADMIN_*` (`:43-53`). Com o emulador não há
service account. Pseudo-diff:

```diff
 import { keys } from "./keys";
+import { DEMO_PROJECT_ID, isEmulated } from "./emulator";

 const getFirebaseAdminApp = () => {
     if (firebaseAdminApp) { return firebaseAdminApp; }

     const adminKeys = keys();

+    // Os emuladores não autenticam ninguém: um project id `demo-` basta, e é o que
+    // permite subir sem conta no Google e sem rede.
+    if (isEmulated()) {
+        firebaseAdminApp =
+            getApps()[0] ??
+            initializeApp({
+                projectId: adminKeys.FIREBASE_ADMIN_PROJECT_ID ?? DEMO_PROJECT_ID,
+            });
+        return firebaseAdminApp;
+    }
+
     if (!(adminKeys.FIREBASE_ADMIN_PROJECT_ID && …)) { throw new Error(…); }
```

O Admin SDK lê `FIRESTORE_EMULATOR_HOST` e `FIREBASE_AUTH_EMULATOR_HOST` do ambiente **sozinho** — é por
isso que `apps/api/(shared)/infra/database.ts:1-5` (uma linha: `getFirestoreAdmin()`) não muda em nada.
Foi o que `firestore-admin-access` barateou, como a spec registra (`:44-47`).

### 8.3 C2 — Client SDK (`packages/auth/client.ts`)

Duas coisas. **(a)** a config: `MOCK_CONFIG` (`:40-45`) usa `projectId: "mock"`, e o emulador de Auth
**namespaceia contas por project id** — se o navegador entrar como `mock` e o Admin SDK ler
`demo-next-boilerplate`, o login "funciona" e o perfil não é encontrado. Os dois lados têm de usar o
**mesmo** id. **(b)** a conexão:

```diff
+const EMULATOR_CONFIG = {
+    apiKey: DEMO_WEB_API_KEY,
+    authDomain: "localhost",
+    projectId: DEMO_PROJECT_ID,
+    appId: DEMO_PROJECT_ID,
+};

 const getFirebaseApp = () => {
     if (firebaseApp) { return firebaseApp; }
     const config = readClientConfig();
     const missing = listMissingEnvNames(config);
+    if (authEmulatorOrigin() && missing.length > 0) {
+        return initializeOnce(EMULATOR_CONFIG);
+    }
     if (missing.length === 0) { return initializeOnce(config); }
     …

 export const getAuthClient = () => {
     if (firebaseAuth) { return firebaseAuth; }
     firebaseAuth = getAuth(getFirebaseApp());
+    const origin = authEmulatorOrigin();
+    if (origin) {
+        connectAuthEmulator(firebaseAuth, origin, { disableWarnings: true });
+    }
     return firebaseAuth;
 };
```

`connectAuthEmulator` entra no import de `firebase/auth` (`client.ts:4-17`).
⚠️ Ele **tem de ser chamado antes de qualquer outra operação** no objeto `Auth` — por isso vai dentro do
`getAuthClient()`, imediatamente após o `getAuth()`, e antes do `return`. Chamar duas vezes com a mesma
URL é aceito pelo SDK; o cache em `firebaseAuth` já evita o segundo caso.

### 8.4 C3 — Identity Toolkit REST (`apps/api/(shared)/lib/firebase-identity-toolkit.ts`)

```diff
-const BASE = "https://identitytoolkit.googleapis.com/v1";
+const PRODUCTION_BASE = "https://identitytoolkit.googleapis.com/v1";
+
+/** O emulador de Auth serve a mesma API prefixando o host original como caminho. */
+const base = (): string => {
+    const origin = authEmulatorOrigin();
+    return origin
+        ? `${origin}/identitytoolkit.googleapis.com/v1`
+        : PRODUCTION_BASE;
+};

 function getWebApiKey(): string {
     const k = keys().FIREBASE_WEB_API_KEY;
-    if (!k) { throw new IdentityToolkitError(…); }
+    if (!k) {
+        // O emulador aceita qualquer chave; é a produção que exige uma de verdade.
+        if (authEmulatorOrigin()) { return DEMO_WEB_API_KEY; }
+        throw new IdentityToolkitError(…);
+    }
     return k;
 }
```

Depois, as 5 chamadas trocam `${BASE}` por `${base()}` (`:62`, `:79`, `:105`, `:118`, `:164`).
Função e não constante de módulo: o valor tem de ser resolvido por chamada, não no import, senão o teste
não consegue alternar e o bundling congela a decisão.

### 8.5 C4 — CSP (`apps/app/proxy.ts` e `apps/web/proxy.ts`)

Segue a convenção local de **declarar a var pública no `env.ts` do app** e ler dali no proxy — é o que os
comentários de `apps/web/env.ts:10-12` e `apps/api/env.ts:22-27` mandam fazer (com `skipValidation`, o que
vem de `extends` não é mesclado).

`apps/app/env.ts` e `apps/web/env.ts`, no bloco `client` + `runtimeEnv`:

```diff
 client: {
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
+    // Preenchida, o navegador fala com o emulador de Auth e a origem entra no CSP.
+    // Vazia, tudo aponta para o Firebase real, como antes.
+    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: z.string().optional(),
     …
 },
 runtimeEnv: {
+    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST:
+        process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST,
     …
 },
```

`proxy.ts` (os dois, mesma forma):

```diff
+const authEmulatorOrigin = env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
+    ? `http://${env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST}`
+    : null;
+
 const securityOptions = buildBrowserAppOptions({
     connectSrc: [
         env.NEXT_PUBLIC_API_URL ?? "",
         IDENTITY_TOOLKIT_ORIGIN,
         SECURE_TOKEN_ORIGIN,
+        ...(authEmulatorOrigin ? [authEmulatorOrigin] : []),
         …
     ],
```

`toSources` (`middleware.ts:30-32`) já filtra falsy e deduplica — nada quebra com a lista vazia.

### 8.6 `firebase.json` — bloco `emulators`

```diff
 {
   "firestore": { "rules": "firestore.rules", "indexes": "firestore.indexes.json" },
-  "storage":   { "rules": "storage.rules" }
+  "storage":   { "rules": "storage.rules" },
+  "emulators": {
+    "auth":      { "port": 9099 },
+    "firestore": { "port": 8080 },
+    "ui":        { "enabled": true, "port": 4000 },
+    "singleProjectMode": true
+  }
 }
```

Portas escolhidas: são os **defaults do Firebase**, então quem já conhece a ferramenta não se surpreende,
e nenhuma colide com as do repo (`3000` app · `3001` web · `3002` api · `3003` email —
`docs/SETUP.md:107`). `singleProjectMode` faz o emulador recusar escrita destinada a outro project id —
uma quarta camada de proteção, de graça.

⚠️ **`.firebaserc:1-5` aponta para o projeto real** `next-boilerplate-576d0`, e `docs/SETUP.md:194`
**proíbe** `firebase use <id>` em fork porque reescreve arquivo versionado. Por isso o project id vai
**na linha de comando**, nunca no `.firebaserc`.

### 8.7 Scripts da raiz (`package.json`)

```diff
     "dev": "turbo dev",
+    "emulators": "firebase emulators:start --only auth,firestore --project demo-next-boilerplate",
+    "seed": "pnpm --filter api seed",
```

Sem `--import` e sem `--export-on-exit`: **o estado não persiste entre subidas, por construção** — é a
recomendação da spec (`:167-168`), e aqui ela não custa uma linha de código, custa a **ausência** de duas
flags.

### 8.8 `apps/api/scripts/emulatorTarget.mjs` (novo) — a trava, isolada

```js
const DEMO_PREFIX = "demo-";

/** `||` e não `??`: string vazia é ausência (.env.example publica VAR=""). */
export const readEmulatorTarget = (env = process.env) => ({
    firestoreHost: env.FIRESTORE_EMULATOR_HOST || null,
    authHost: env.FIREBASE_AUTH_EMULATOR_HOST || null,
    projectId: env.FIREBASE_ADMIN_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
});

/** Devolve null quando pode rodar, ou a razão da recusa. */
export const refuseSeedReason = (target) => {
    if (!(target.firestoreHost && target.authHost)) {
        return "FIRESTORE_EMULATOR_HOST e FIREBASE_AUTH_EMULATOR_HOST precisam estar preenchidos…";
    }
    if (!target.projectId?.startsWith(DEMO_PREFIX)) {
        return `O seed só roda contra um projeto "${DEMO_PREFIX}*"…`;
    }
    return null;
};

export const isRealProjectTarget = (target) => !(target.firestoreHost || target.authHost);
```

Pura, sem import de `firebase-admin`, sem I/O — testável em milissegundos (§9).

### 8.9 `apps/api/scripts/seed-emulator.mjs` (novo)

Esqueleto (ordem obrigatória: Auth **antes** de Firestore, §2.2):

```js
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { readEmulatorTarget, refuseSeedReason } from "./emulatorTarget.mjs";

const target = readEmulatorTarget();
const refusal = refuseSeedReason(target);
if (refusal) { process.stderr.write(`${refusal}\n`); process.exit(1); }  // ← antes de initializeApp

initializeApp({ projectId: target.projectId });

// 1. apaga tudo (reset e seed são o mesmo comando)
await fetch(`http://${target.authHost}/emulator/v1/projects/${target.projectId}/accounts`,
            { method: "DELETE" });
await fetch(`http://${target.firestoreHost}/emulator/v1/projects/${target.projectId}` +
            "/databases/(default)/documents", { method: "DELETE" });

// 2. contas no Auth → 3. perfis no Firestore com o uid devolvido → 4. entities com o doc id do perfil
```

**Estado inicial** (constantes no topo do script, espelhadas no `docs/SETUP.md`):

| e-mail | senha | `user.type` | `entity` |
|--------|-------|-------------|----------|
| `admin@example.com` | `demo1234` | `admin` | — |
| `user@example.com` | `demo1234` | `common` | 4 registros (um de cada `EntityType` + um `enabled: false`) |
| `user2@example.com` | `demo1234` | `common` | 2 registros — **existe para que exista dado de outro dono**, que é o que torna o teste de ownership (404) possível sem criar conta à mão |

Contas criadas com `emailVerified: true` (mesma escolha de `create-dev-admin.mjs:64`), senão o painel cai
na tela de verificação e o seed não entrega o que promete.

Os `entity` cobrem os limites que os critérios de aceite vão pedir: `genre: null`, `birthdate: null`,
`description: ""`, `enabled: false` e os três valores de `EntityType`.
`photo` é sempre `null` — Storage está fora do corte.

Saída do script: tabela de credenciais no stdout + a lembrança de que é base emulada.

`apps/api/package.json` ganha, no molde do `:13` existente:

```diff
     "create-dev-admin": "node --env-file-if-exists=.env scripts/create-dev-admin.mjs",
+    "seed": "node --env-file-if-exists=.env scripts/seed-emulator.mjs",
```

### 8.10 `create-dev-admin.mjs` — **estender**, não reescrever

`ensureAuthUser` (`:48-67`) e `ensureAdminProfile` (`:69-97`) ficam **intactos** — é código idempotente e
correto, e é metade do item 3 do corte já entregue. Muda só a inicialização e a trava:

```diff
+import { isRealProjectTarget, readEmulatorTarget } from "./emulatorTarget.mjs";
+
+const allowRealProject = () =>
+    process.argv.includes("--allow-real-project") ||
+    process.env.DEV_ADMIN_ALLOW_REAL_PROJECT === "1";

 async function main() {
     const { email, password } = readCredentials();
-    const serviceAccount = readServiceAccount();
-    initializeApp({ credential: cert(serviceAccount) });
+    const target = readEmulatorTarget();
+
+    if (isRealProjectTarget(target)) {
+        if (!allowRealProject()) {
+            fail("Isto criaria um administrador com senha conhecida num projeto Firebase REAL…\n" +
+                 "Repita com --allow-real-project se é mesmo o que você quer.");
+        }
+        initializeApp({ credential: cert(readServiceAccount()) });
+    } else {
+        // Contra o emulador não há a quem se autenticar: o project id basta.
+        initializeApp({ projectId: target.projectId });
+    }
```

Filtrar `--allow-real-project` de `process.argv` em `readCredentials()` (`:20`), senão a flag é lida como
e-mail quando vier antes dos posicionais.

### 8.11 `.env.example` — o emulador é o default, esvaziar é recusar

Esta é a forma concreta de "emulador é o default do desenvolvimento local" sem que o **código** tenha
default algum. O código é opt-in puro; o que está pré-preenchido é a **configuração publicada**.
Copiar `.env.example` dá emulador; apagar os valores dá Firebase real, exatamente como hoje.

`apps/api/.env.example` — bloco novo no topo, antes do bloco de service account:

```bash
# Emuladores do Firebase (Auth + Firestore) — PREENCHIDOS DE PROPÓSITO.
# Preenchidos: `pnpm emulators` + `pnpm seed` e a stack roda local, offline, sem conta
# e sem tocar em dado real; o service account abaixo fica dispensável.
# Para usar um projeto Firebase REAL, ESVAZIE os três (VAR="") e preencha o service account.
# Exige Java (JDK 11+) instalado. Ver docs/SETUP.md.   <!-- previsto errado: é JDK 21+, ver §14-P1 -->
FIRESTORE_EMULATOR_HOST="127.0.0.1:8080"
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="demo-next-boilerplate"
```

`apps/app/.env.example` e `apps/web/.env.example` — os dois só verificam session cookie (Admin Auth) e
assinam o navegador, então recebem:

```bash
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9099"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="demo-next-boilerplate"
```

⚠️ `NEXT_PUBLIC_FIREBASE_PROJECT_ID` sai de `""` para `demo-next-boilerplate` nos três arquivos. Ele
alimenta `packages/auth/keys.ts:47-48` como fallback de `FIREBASE_ADMIN_PROJECT_ID` e
`packages/auth/client.ts:50`. Consequência querida: um fork que **não** esvazie os hosts e tente
Firebase real falha no login de forma **alta e imediata** (project id inexistente), em vez de falhar
depois, de lado.

### 8.12 `.gitignore`

```diff
+# Firebase — logs e cache dos emuladores
+firebase-debug.log
+firestore-debug.log
+database-debug.log
+pubsub-debug.log
+ui-debug.log
+.firebase/
```

### 8.13 `docs/SETUP.md`

1. **`## Pré-requisitos` (`:9-18`)**: acrescentar ~~**Java (JDK 11+)**~~ → **JDK 21+** (medido no
   `/develop`; ver §14-P1) — pré-requisito dos emuladores,
   como a spec exige (`:150-151`); e reescrever `:12` para dizer que as contas Firebase/Stripe/Resend só
   são necessárias **para publicar**, não para desenvolver.
2. **`## Rodando` (`:99-107`)**: o caminho local passa a ser 3 comandos, e a lista de portas ganha
   `emulador Auth 9099 · Firestore 8080 · UI 4000`.
3. **Seção nova `## Emulador do Firebase (caminho local padrão)`**, entre `:197` e `:199` — depois de
   `### Projeto alvo — .firebaserc é versionado` (que explica por que o project id vai na CLI) e
   imediatamente antes de `## Primeiro admin`, que é o consumidor natural. Conteúdo: os 3 comandos, a
   tabela de credenciais do seed, o fato de o estado não persistir, e como **sair** do emulador.
4. **`## Primeiro admin` (`:199-220`)**: documentar as duas variantes (emulador × projeto real) e a
   flag `--allow-real-project`.

### 8.14 `docs/PRE-PRODUCTION.md`

Não ganha bloqueador novo — esta entrega não exige nada em produção. Ganha **uma nota** no §1
(rules do Firestore, `:19-52`) registrando que o emulador chegou mas a **suíte de testes de rules não**,
e por quê (fora do corte). Isso impede que a próxima auditoria leia "emulador entregue" como "rules
testadas" — precisamente o erro que a spec conta em `:56-67`.

### 8.15 Env nova — resumo para o fork

| Var | Onde | Obrigatória | Vazia significa |
|-----|------|-------------|-----------------|
| `FIRESTORE_EMULATOR_HOST` | `apps/api` | não | Firestore real |
| `FIREBASE_AUTH_EMULATOR_HOST` | `apps/api`, `apps/app`, `apps/web` | não | Firebase Auth real |
| `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` | `apps/app`, `apps/web` | não | navegador fala com o Firebase Auth real |
| `DEV_ADMIN_ALLOW_REAL_PROJECT` | script | não | `create-dev-admin` recusa projeto real |

**Em produção (Vercel): nenhuma delas é definida.** Todas ausentes ⇒ comportamento idêntico ao de hoje.

---

## 9. Testes (Vitest)

Nenhuma rota, hook ou componente novo — a cobertura mira nos **predicados**, que é onde um erro é
silencioso e caro.

| Arquivo | O que prova |
|---------|-------------|
| `packages/auth/__tests__/emulator.test.ts` | `""` lê como ausência (o `\|\|`, não `??`); precedência `FIREBASE_AUTH_EMULATOR_HOST` > `NEXT_PUBLIC_*`; `authEmulatorOrigin()` monta `http://host`; `isEmulated()` liga com **qualquer um** dos dois hosts; **tudo ausente ⇒ `false`, `null`** (o modo degradado) |
| `apps/api/__tests__/emulatorTarget.test.ts` | T1 (host faltando ⇒ recusa), T2 (project id sem `demo-` ⇒ recusa), T5 (string vazia ⇒ recusa), caminho feliz ⇒ `null`; e `isRealProjectTarget` para T3 |
| `apps/api/__tests__/firebaseIdentityToolkit.test.ts` | com host de emulador, a URL chamada é `http://<host>/identitytoolkit.googleapis.com/v1/...`; **sem** host, é `https://identitytoolkit.googleapis.com/v1/...`; `getWebApiKey()` cai na constante só quando emulando, e **lança** quando não |
| `apps/app/__tests__/securityHeaders.test.ts` (existente, estender) | a origem do emulador entra em `connect-src` quando a var está preenchida, e **não** entra quando vazia |
| `packages/auth/__tests__/` (existente) | reverificar que os testes de `server.ts` não quebram com o ramo novo |

Mock de env com `vi.stubEnv` + `vi.unstubAllEnvs` no `afterEach`. Os testes são puros — nenhum sobe
emulador, nenhum toca rede, e por isso **o CI não precisa de Java**.

**Teste de paridade de i18n**: não é afetado (zero chave nova).

---

## 10. Validação visual (obrigatória)

Regra de ouro 11. Fluxos a percorrer com `agent-browser`, **em sequência** (chamadas concorrentes travam
o daemon):

1. **Caminho do emulador**: `pnpm emulators` → `pnpm seed` → `pnpm dev` → login em
   `localhost:3000` com `user@example.com` → lista de `entity` mostra os 4 registros semeados.
2. **Primeiro admin sem console**: login com `admin@example.com` → a área `/admin` abre → a listagem de
   usuários mostra os 3 perfis do seed. Isto é o sinal de pronto mais importante da spec (`:157`).
3. **Reset**: apagar/alterar registros pela UI → `pnpm seed` → recarregar → **o estado inicial voltou
   idêntico** (`:158`).
4. **Offline de verdade**: com o emulador de pé, desligar a rede e repetir (1). Este é o critério que
   separa "aponta para o emulador" de "aponta para o emulador **e mais nada**" — é o que pega um dos
   cinco pontos de conexão esquecido.
5. **Modo degradado**: esvaziar as vars do emulador, subir contra o projeto Firebase real e conferir que
   login, painel e `entity` funcionam **exatamente como antes**. Sem isto, a entrega não pode ser aceita.
6. Aba **Network** do DevTools no fluxo (1): **zero** requisição para `*.googleapis.com`.
7. Light + dark + mobile no fluxo (1) — nenhuma UI muda, mas a regra vale para a entrega.

---

## 11. Critérios de aceite (insumo para o `/test`)

O `/test` produz o arquivo no formato §9.1 do guia. Os casos que a análise levanta:

- **Subida limpa**: clone + `pnpm install` + copiar os `.env.example` + `pnpm emulators` + `pnpm seed` +
  `pnpm dev` ⇒ login funciona. Sem conta Google em momento algum.
- **Offline**: o mesmo, com a rede desligada.
- **Admin sem console**: `/admin` acessível com a conta semeada; `pnpm --filter api create-dev-admin
  outro@example.com senha` contra o emulador cria outro admin sem service account.
- **Reset idempotente**: `pnpm seed` duas vezes seguidas ⇒ mesmo estado, sem duplicata (o wipe garante).
- **Modo degradado (o mais importante)**: com as vars do emulador **vazias**, os três apps sobem, o build
  passa, a UI é idêntica e o Firebase real é usado. Nenhum `500`, nenhum comportamento novo.
- **T1**: `pnpm seed` sem `FIRESTORE_EMULATOR_HOST` ⇒ exit 1, mensagem explicando, **nada escrito**.
- **T2**: `pnpm seed` com host de emulador mas project id real ⇒ exit 1.
- **T3**: `pnpm --filter api create-dev-admin a@b.com x` com service account real e sem
  `--allow-real-project` ⇒ exit 1, mensagem dizendo como prosseguir; **com** a flag ⇒ funciona como antes.
- **Ownership continua valendo**: logado como `user@example.com`, tentar abrir um `entity` de
  `user2@example.com` pela URL ⇒ 404. (O seed existe para tornar este caso testável sem trabalho manual.)
- **Precedência de env**: `FIREBASE_AUTH_EMULATOR_HOST` preenchida e `NEXT_PUBLIC_*` vazia ⇒ o servidor
  emula e o navegador **não**. Estado misto: o login falha de forma visível, e a mensagem do `SETUP.md`
  tem de cobrir isso. É a falha mais provável de um fork.
- **Gates**: `pnpm turbo run lint typecheck test` verde, incluindo `--frozen-lockfile` com o
  `pnpm-lock.yaml` atualizado pela devDep nova.

---

## 12. Ordem de implementação e plano de commits

`packages/sdk` não entra. A ordem de dependência aqui é **raiz → packages/auth → apps/api → apps/app +
apps/web → docs**, seguindo `.claude/cycle-policy.md` §6 (um commit por app/pacote, pulverizado por
funcionalidade).

| # | Commit | Conteúdo |
|---|--------|----------|
| 1 | `chore: add firebase-tools and the emulator suite config` | `package.json` (devDep + 2 scripts), `firebase.json`, `.gitignore`, `pnpm-lock.yaml` |
| 2 | `feat(auth): single source of truth for the Firebase emulator target` | `packages/auth/emulator.ts`, `package.json` (exports), teste |
| 3 | `feat(auth): connect the admin and client SDKs to the emulator` | `server.ts`, `client.ts`, `keys.ts` |
| 4 | `feat(api): route the Identity Toolkit REST calls to the auth emulator` | `firebase-identity-toolkit.ts` + teste |
| 5 | `feat(api): refuse to bootstrap against a real Firebase project` | `emulatorTarget.mjs` + teste (as travas, antes de existir script que escreve) |
| 6 | `feat(api): seed the emulated Firebase with a reproducible initial state` | `seed-emulator.mjs`, `package.json` |
| 7 | `feat(api): let the dev admin bootstrap run against the emulator` | `create-dev-admin.mjs` |
| 8 | `chore(api): point the example env at the emulator by default` | `apps/api/.env.example` |
| 9 | `feat(app): allow the auth emulator origin in the content policy` | `apps/app/env.ts`, `proxy.ts`, `.env.example`, teste |
| 10 | `feat(web): allow the auth emulator origin in the content policy` | `apps/web/env.ts`, `proxy.ts`, `.env.example` |
| 11 | `docs: make the emulator the default local setup path` | `docs/SETUP.md`, `docs/PRE-PRODUCTION.md` |
| 12 | `test: declare an explicit timeout in every vitest config` | **item separado — §13** |
| 13 | `docs(features): firebase-emulator-seed` | artefatos do fluxo, sempre o último |

Commit 5 **antes** do 6 de propósito: a trava existe e está testada antes de existir um script capaz de
escrever em base alguma.

⚠️ O working tree já tem mudanças não commitadas da auditoria de backlog (13 arquivos em `specs/`,
`docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md`, `docs/features/account-settings/`). Elas **não** entram em
nenhum commit acima — terão o seu, separado (`docs(specs)`). ⚠️ `docs/PRE-PRODUCTION.md` está nos **dois**
conjuntos: o commit 11 precisa de `git add -p`, ou o assunto da auditoria vai junto. Registrar o porquê
na mensagem, se não der para isolar (`.claude/cycle-policy.md` §6).

---

## 13. Item separado — `testTimeout` explícito nas 9 configs do Vitest

**Não faz parte da spec.** Entra aqui porque foi medido nesta rodada e tem commit próprio.

### 13.1 O defeito

O gate de teste falhou **1 vez em 4**: `apps/app/__tests__/accountSecurityForm.test.tsx` estourou o teto
**default de 5000 ms** do Vitest.

| Medição | Valor |
|---------|-------|
| Pior teste do arquivo, **isolado** | **285 ms** |
| O mesmo teste, **sob contenção** | **7401 ms** (amplificação ≈ **26×**) |
| Causa | `apps/app` monta **36 ambientes jsdom** em paralelo, ~70 s no total |
| `testTimeout` declarado hoje | **nenhum**, em nenhuma das 9 configs (`grep -rn testTimeout --include="vitest.config*"` ⇒ 0) |

Confirmado agora: as 9 configs são `apps/{api,app,web}` e
`packages/{auth,email,internationalization,payments,security,shared}`; nenhuma declara `testTimeout`.
Confirmado também que `apps/app/__tests__` tem **36 arquivos**.

### 13.2 Por que isto não é afrouxar teste

`.claude/cycle-policy.md` §1 proíbe afrouxar teste para a suíte passar. Não é o caso, e a diferença é
verificável: **nenhuma asserção muda, nenhum teste é pulado, nenhum `.skip` é introduzido**. O que muda é
um teto de tempo de parede que hoje é implícito e foi calibrado para uma suíte que não é esta. Um teste
que leva 285 ms de trabalho real reprovando por contenção de agendador é **falso negativo**, e falso
negativo corrói a confiança no gate — que é o ativo que o gate existe para produzir.

### 13.3 O que fazer

Declarar `testTimeout: 20000` nas 9 configs, dentro do bloco `test` já existente, com uma linha de
comentário autocontida explicando o porquê (regra de negócio da suíte, não referência ao fluxo):

```diff
 export default defineConfig({
     plugins: [react()],
     test: {
         environment: "jsdom",
+        // O teto default de 5s é de tempo de parede, e esta suíte monta dezenas de
+        // ambientes jsdom em paralelo: um teste de ~300ms de trabalho real chega a
+        // levar 7s só esperando agendamento. Folga suficiente para não produzir falso
+        // negativo, curta o bastante para ainda pegar um travamento de verdade.
+        testTimeout: 20_000,
     },
```

**20 s** = ≈2,7× o pior caso medido (7401 ms) e 4× o default. Número escolhido sobre medição, não sobre
sensação.

### 13.4 Compartilhar a config? — avaliado, **descartado**

O pedido era preferir o compartilhamento se houvesse padrão vigente. Há um **análogo**
(`@repo/typescript-config`, consumido por `extends`), mas ele não transfere:

| | Config compartilhada (`@repo/vitest-config`) | Valor literal nas 9 |
|---|---|---|
| Arquivos tocados | **18** (9 configs + 9 `package.json` ganhando devDep) | **9** |
| Pacote novo em `packages/*` | sim | não |
| O que seria compartilhado | **uma chave** | — |
| Quanto as 9 já divergem | muito: `jsdom` × `node`, plugin React, aliases `@`/`@repo`, `esbuild.jsx` para o `@repo/email` | — |

`@repo/typescript-config` se paga porque compartilha dezenas de opções de compilador. Um pacote inteiro
para um número é raio de impacto maior que o problema, e `.claude/cycle-policy.md` §3 manda o contrário.
**Decisão: valor literal nas 9.** Registrada em §21-G.

---

## 14. Pré-requisitos manuais de infra

**O `/develop` não consegue satisfazer estes.** O `/test` precisa saber disso para classificar como
**não verificado**, nunca como reprovado (`.claude/cycle-policy.md` §5).

| # | Pré-requisito | Quem | Estado medido |
|---|---------------|------|---------------|
| P1 | ~~**Runtime Java (JDK 11+)**~~ → **JDK 21+** na máquina de quem desenvolve | cada pessoa / cada fork | ⛔ **a previsão desta linha estava errada e foi medida depois**: `firebase-tools@15.30.1` recusa qualquer Java anterior a 21, e o `openjdk 17.0.13` desta máquina **não serve**. Exige instalação manual do JDK 21 |
| P2 | **Download dos JARs dos emuladores** na primeira execução de `firebase emulators:start` | rede, uma vez | ⚠️ **exige internet na primeira vez**. A promessa de "sem internet" vale a partir da segunda. Tem de estar escrito no `SETUP.md`, senão a promessa é falsa |
| P3 | **`pnpm install`** com o lockfile atualizado (devDep nova) | quem clona | pesa mais; `--frozen-lockfile` reprova se o lock não for commitado junto |
| P4 | Publicar `storage.rules` e ativar o Cloud Storage | conta Firebase (plano Blaze) | ❌ continua em aberto (`docs/PRE-PRODUCTION.md:103-107`) e **esta entrega não mexe nisso** |
| P5 | Java + cache de `~/.cache/firebase/emulators/` no CI | GitHub Actions | **não necessário nesta entrega** (nenhum teste sobe emulador); vira pré-requisito de `e2e-testing` / suíte de rules |

P2 é a única promessa da spec que este corte **não** consegue cumprir integralmente
(`:155` — *"sem rede"*). Não é contornável: os JARs não vêm no pacote npm. O honesto é documentar
"depois do primeiro `pnpm emulators` com rede, nunca mais precisa".

---

## 15. Riscos — onde este plano pode estar errado

Ordenados por probabilidade × custo. O `/develop` deve tratá-los como hipóteses a **medir**, não como
fatos (`.claude/cycle-policy.md` §4).

1. 🔴 **`createSessionCookie` contra o emulador de Auth.** Toda a sessão do repo depende dele
   (`packages/auth/server.ts:214-222`) e do `verifySessionCookie(cookie, true)` com `checkRevoked`
   (`:238-241`). O emulador **suporta** session cookies, mas a revogação (`revokeRefreshTokens`,
   `:257-263`) e o `tokensValidAfterTime` (`:138-151`) são semântica fina. **Se isto não funcionar, o
   login inteiro cai e não há plano B neste desenho.** É a primeira coisa a verificar, antes de escrever
   o seed.
2. 🔴 **Um dos cinco pontos de conexão esquecido.** C1–C5 (§8.0) falham **silenciosamente contra o
   projeto real** — nada quebra, só se escreve no lugar errado. Mitigação obrigatória: o passo 6 da §10
   (Network do DevTools, zero `*.googleapis.com`) e o passo 4 (rede desligada). Sem esses dois, a
   entrega não é verificável.
3. 🟠 **Caminho REST do emulador de Auth** (§8.4): `http://<host>/identitytoolkit.googleapis.com/v1/...`
   está afirmado com base na forma documentada do emulador, **não medido aqui**. Se divergir, é o
   `/develop` que descobre — com `curl` contra o emulador de pé, antes de propagar a mudança nas 5
   chamadas.
4. 🟠 **Login com Google contra o emulador não está coberto.** O fluxo é híbrido:
   `apps/app/shared/lib/googleSignInApi.ts:23-25` abre `signInWithPopup` no navegador e só depois
   `:34-37` manda o ID token para `POST /auth/sign-in/google`. Contra o emulador, o popup é a tela falsa
   de escolha de conta do próprio emulador, e `frameSrc` hoje só tem `firebaseAuthOrigin`
   (`apps/app/proxy.ts:54`). **Decisão: fora do corte** — o seed entrega contas de e-mail/senha, que é o
   que o corte pede (`:105-106`). Se o Google não funcionar no emulador, **não reprova a entrega**; o
   `/test` deve classificar como *não verificado*. Se for barato durante o `/develop`, acrescentar a
   origem em `frameSrc` também.
5. 🟠 **`connectAuthEmulator` chamado tarde demais.** O SDK exige que seja antes de qualquer operação no
   `Auth`. `getAuthClient()` (`client.ts:93-100`) é o único ponto de criação, mas `provider.tsx` monta
   cedo — se algum caminho pegar o `Auth` por fora, o emulador não é aplicado e o navegador vai para a
   produção **sem erro**.
6. 🟠 **`singleProjectMode` + `.firebaserc`.** `.firebaserc:1-5` aponta para `next-boilerplate-576d0`. Se
   o `--project demo-next-boilerplate` cair de alguma invocação, o emulador sobe com o id real e o estado
   fica particionado de forma invisível. O project id **nunca** vai para o `.firebaserc`
   (`docs/SETUP.md:194` proíbe).
7. 🟡 **`skipValidation` da `apps/api`.** `apps/api/env.ts:46` só pula validação em `development`. Em
   `NODE_ENV=test` ou `production`, os três `FIREBASE_ADMIN_*` (`:13-15`) voltam a ser obrigatórios —
   `pnpm --filter api build` com o emulador **vai falhar**. É o comportamento de hoje
   (`docs/SETUP.md:58-60`), mas alguém vai tropeçar. Documentar; não consertar nesta tarefa (§21-F).
8. 🟡 **Colisão de porta.** 8080 é porta popular. O emulador falha alto, não silenciosamente — aceitável,
   mas a mensagem tem de estar no `SETUP.md`.
9. 🟡 **Estado misto de env** (servidor emulando, navegador não, ou vice-versa). É o erro mais provável
   de um fork que preenche metade. Não há como o código detectar com certeza os dois lados; a defesa é o
   `.env.example` tratar o bloco como uma unidade e o `SETUP.md` dizê-lo. Agravante: no `apps/web` o CSP
   é report-only, então o sintoma lá é ainda mais mudo.
10. 🟢 **Peso do `pnpm install`.** `firebase-tools` é grande. Custo real, irreversível enquanto for devDep
   da raiz — foi o preço avaliado em §7.

---

## 16. Pós-entrega

- **Env em produção (Vercel)**: **nenhuma**. Todas as vars novas ficam ausentes ⇒ Firebase real.
- **Índices e rules**: nada a publicar. `firestore.indexes.json`, `firestore.rules` e `storage.rules` não
  mudam.
- **Webhook**: N/A.
- **Rollback**: reverter os commits basta. Nada persiste fora da máquina local; o estado emulado morre com
  o processo.
- **O que um fork precisa fazer**: instalar Java, rodar `pnpm emulators` uma vez **com rede** (P2), e
  esvaziar as três vars quando for publicar.

---

## 21. Perguntas em aberto — **todas decididas**, com a alternativa descartada

Roda em `/cycle` autônomo: nada foi perguntado. Cada item traz a pergunta, as opções, **o que foi adotado**
e por quê. As 3 perguntas em aberto da própria spec (`:161-168`) **não** entram aqui — já estavam
respondidas e foram adotadas como estão: emulador default, admin por comando explícito, estado
reconstruído do seed.

**A — `firebase-tools` como devDep fixada × `npx -y firebase-tools@latest`**
O repo já usa `npx` para `deploy` (`firestore.rules:20`, `docs/SETUP.md:185`), o que seria zero dependência
nova. **Adotado: devDep fixada `15.30.1`.** Razão: `npx @latest` resolve uma versão diferente a cada
máquina e a cada dia, e o emulador é ambiente de desenvolvimento reprodutível — é exatamente a coisa que
não pode derivar. `deploy` é operação pontual de uma pessoa; `emulators:start` é rodado todo dia por todo
mundo. Custo aceito: `pnpm install` mais pesado.

**B — Uma var canônica (`FIREBASE_EMULATOR_HOST`) × as vars padrão do Google**
Uma só var e portas derivadas teria menos superfície. **Adotado: as vars padrão
(`FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`) + um espelho `NEXT_PUBLIC_*`.** Razão: as duas
primeiras o Admin SDK lê **sozinho**, o que elimina código; e são os nomes que a documentação do Firebase
usa, então quem pesquisar encontra. Custo: três vars com significado sobreposto, mitigado por tratá-las
como bloco único no `.env.example`. Risco associado em §15-8.

**C — `create-dev-admin` passa a exigir `--allow-real-project`**
Alternativa: manter só o aviso atual (`create-dev-admin.mjs:110-111`) e não quebrar nada.
**Adotado: exigir a flag.** Razão: a spec pede que o bootstrap seja *"inofensivo por padrão fora do
ambiente local, e isso precisa estar escrito, não implícito"* (`:141-143`) — aviso impresso **depois** da
escrita não é trava. Custo assumido: quebra um fluxo documentado (`docs/SETUP.md:199-220`), que o commit 11
atualiza. **É o item mais discutível do plano** — se o usuário discordar, reverter é apagar 4 linhas.

**D — Emular Storage junto**
`storage.rules` é deny-all **nunca publicada** (`docs/PRE-PRODUCTION.md:106`) e a própria spec diz que é
"o caso mais agudo" (`:68-74`); o emulador de Storage é o mesmo binário, ~3 linhas no `firebase.json`.
**Adotado: FICA DE FORA.** Razão: a seção "Fora do corte" da spec diz literalmente *"Emular serviços além
de Auth e Firestore"*, e `.claude/cycle-policy.md` §2 é inegociável nisso. Além do mais, o valor só aparece
com a suíte de rules, que também está fora. Se o usuário quiser reabrir, é barato — mas é decisão de
produto dele, não minha.

**E — Onde moram os scripts: raiz × `apps/api`**
A spec diz "scripts na raiz" (§Impacto por camada). **Adotado: `apps/api/scripts/`, com o script da raiz
delegando (`"seed": "pnpm --filter api seed"`).** Razão: `firebase-admin` já é dependência da `apps/api`
(`apps/api/package.json:27`) e não da raiz; `create-dev-admin.mjs` já mora lá; e o padrão
`node --env-file-if-exists=.env` (`:13`) vem de graça. Pôr na raiz exigiria `firebase-admin` como segunda
devDep nova. O comando que a pessoa digita é da raiz de qualquer jeito, então a spec é atendida na
superfície que importa.

**F — Fazer `pnpm --filter api build` funcionar sob o emulador**
Exigiria afrouxar `apps/api/env.ts:13-15` de `z.string().min(1)` para opcional com refine.
**Adotado: NÃO fazer.** Razão: o corte pede `pnpm dev`, que passa por `skipValidation` (`:46`); e
`docs/SETUP.md:58-60` já documenta que o build da `apps/api` exige service account — mudar isso é alterar
um contrato de boot por um motivo colateral. Raio mínimo. Registrado como risco em §15-6.

**G — `testTimeout` compartilhado × literal nas 9 configs**
Tabela comparativa completa em §13.4. **Adotado: literal nas 9.** 9 arquivos contra 18, sem pacote novo,
para compartilhar uma única chave entre configs que já divergem em quase tudo.

**H — Valor do `testTimeout`: 10 s × 20 s × 30 s**
**Adotado: 20 s** — ≈2,7× o pior caso medido (7401 ms). 10 s dá folga de só 35% sobre um número que já foi
observado, e a contenção piora conforme a suíte cresce; 30 s faz um travamento real custar meio minuto por
arquivo. Se o `/test` medir novo pior caso acima de ~12 s, o número precisa subir junto — e aí a causa
(paralelismo de jsdom) vira problema próprio, não este.

**I — Credenciais do seed: `demo1234` × senha gerada**
**Adotado: constante `demo1234`, documentada.** Razão: o valor do seed é ser **reprodutível e
documentado** (`:105-106` do corte pede "credenciais documentadas"); senha gerada obrigaria a ler o stdout
toda vez e inviabilizaria roteiro de teste escrito. A segurança vem das travas T1/T2 (§6.1), que garantem
que essas contas só existem em base emulada — não de a senha ser secreta.

**J — Reset como comando próprio × `pnpm seed` sempre apagar antes**
**Adotado: `pnpm seed` apaga e repovoa.** Razão: um comando a menos, idempotência por construção, e o item
4 do corte fica satisfeito pelo item 2. Custo: quem quiser acrescentar dado sobre o seed perde ao repetir
o comando — irrelevante para um estado que existe para ser reprodutível.

---

## 22. Referências não lidas

Nenhuma. Não há card, wiki, Figma, print ou anexo nesta tarefa; a spec é a fonte e foi lida inteira,
junto de `.claude/cycle-policy.md`, `docs/feature-analysis-guide.md`, `docs/SETUP.md`,
`docs/PRE-PRODUCTION.md` e do slice de referência `entity`.
