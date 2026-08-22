---
slug: firestore-admin-access
title: Acesso ao Firestore via Admin SDK e security rules aplicáveis
task: -
spec: firestore-admin-access
branch: api/refactor/firestore-admin-access
epic: -
updated: 2026-08-22 19:20
---

# Pipeline — Acesso ao Firestore via Admin SDK e security rules aplicáveis

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-08-22 13:02 | analyze/plan.md | Migração contract-preserving do client SDK para `getFirestoreAdmin()` em 8 passos com suíte verde entre eles: tabela de tradução das duas APIs de Firestore (armadilha central `snap.exists()` → `snap.exists`), falha-cedo em 3 camadas (env tipado + assert no `instrumentation.ts` + `keys.ts` rejeitando credencial parcial), 1 índice composto versionado (C4, o caminho quente), runbook de publicação das rules e 2 arquivos de teste novos fechando a cobertura zero do `BaseRepository` |
| develop | done    | 2026-08-22 13:53 | develop/handoff.md | P0–P6 e P8 entregues: `apps/api` lê/escreve Firestore pelo Admin SDK (`dabatase.ts` → `database.ts`), `BaseRepository`+2 repositórios reescritos, `firebase` fora das deps, `findAll()` passou a aplicar o mapper, falha-cedo provada nas duas direções (API morre no boot sem credencial, sobe com ela), 1 índice versionado + `.firebaserc` + rules com cabeçalho verdadeiro, docs atualizadas. Cobertura zero fechada: 2 arquivos novos, 56→72 testes na api — e o dublê foi provado revertendo `snap.exists` para `snap.exists()` (7 falhas). Payload antes/depois diffado: **exatamente uma** divergência, a esperada (`createdAt` de `GET /users`: `{seconds,nanoseconds}` → ISO; nenhuma tela consome). CRUD `entity` + admin + impersonação percorridos no browser em light/dark/mobile (15 screenshots). **P7 e o `--dry-run` bloqueados**: Firebase CLI sem conta autorizada |
| review  | done    | 2026-08-22 19:20 | review/review.md | **9 commits feitos e enviados ao remoto** (`8c33eb3`…`5a04e94`, 56 arquivos, +2264/−258; PR não aberta). Suíte pós-commit: 209 verdes. O achado alto (1) foi **corrigido** por decisão do usuário em commit próprio (`84201b6`) — falta só a prova em runtime nos 7 endpoints, que é lacuna do `/test`. Branch `api/refactor/firestore-admin-access` criada a partir de `iniciar-specs-individualmente`, que estava **exatamente em `origin/main`** e sem commits próprios. Migração aprovada no essencial: testes novos provados **load-bearing** por mutação (`snap.exists` → `snap.exists()` = 7 falhas; reverter o mapper do `findAll` = 1 falha) e defeito do `update()` confirmado preservado **no dado cru** (`createdAt` volta String, `updatedAt` Timestamp). **2 achados altos**: (1) existe uma **segunda** mudança de payload não declarada — `mergeAuthAndFirestore` não serializa o lado Firestore, então `createdAt` sai `{_seconds,_nanoseconds}` em **7 endpoints** (`/auth/me`, sign-in/up, `/users/:id`, `POST /users`), criando incoerência com `GET /users` que virou ISO; sem consumidor hoje, virou **decisão em aberto** por mudar comportamento; (2) as docs afirmavam a proteção como vigente com as rules **não publicadas** — defeito do `PAYMENTS.md` se repetindo, **corrigido**. Corrigido também: `pnpm --filter api build` passa a exigir as três `FIREBASE_ADMIN_*` (validação eager, probada) e o índice era descrito como "exigido" quando é preventivo. Só docs editadas — zero código de produção. CRUD `entity` redirigido de ponta a ponta (light/dark/mobile, 10 prints, PII filtrada por `qa-`), 0 erro no log da API. Gates: typecheck 3 apps limpo, api 72/72, i18n 2/2, `pnpm check` 192/37 |
| test    | pending | -                | -               | -                |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- **Origem**: `specs/firestore-admin-access.md` (`status: in-progress` desde 2026-08-22, `feature:
  firestore-admin-access`, `value: alto`, `effort: M`). O
  problema, a evidência de mercado e o corte de MVP são decisão de produto tomada — o plano responde só ao
  *como*. **Não editar a spec**: arquivá-la é do `/spec --sync`, na entrega.
- **Baseline auditada**: commit `e45669a`. **Não existe CI** (`.github/` não existe) — o gate é manual:
  `pnpm check` (baseline conhecida 197 erros / 39 warnings), `pnpm test`, `pnpm --filter <app> typecheck`.
- **Peça central já existe e é código morto**: `getFirestoreAdmin` (`packages/auth/server.ts:74-80`) tem
  **zero chamadores** no repo (grep repo-wide: 3 hits, 2 deles em documentação). A tarefa é a API passar a
  consumi-la. Nenhuma API nova em `packages/*`.
- **A mudança é indivisível em P3** (plano §1.3): `BaseRepository` recebe `Firestore` no construtor
  (`base.repository.ts:36`) e o tipo do `firebase/firestore` é **incompatível** com o do
  `firebase-admin/firestore`. Trocar a instância sem reescrever os métodos não compila; o inverso não roda.
- **Armadilha central da tradução**: `snap.exists()` (método, client) → `snap.exists` (propriedade,
  admin), em `base.repository.ts:60`. Não é pega pelo typecheck. Coberta pelo teste T1 com dublê que expõe
  `exists` como booleano.
- **Referência viva do dialeto Admin SDK dentro do repo**: `apps/api/scripts/create-dev-admin.mjs:71-96`
  (`db.collection()`, `.where().limit().get()`, `.empty`, `.add()`, `ref.update()`). O `/develop` espelha
  esse arquivo.
- ✅ **Precondição verificada para publicar `deny-all`**: nenhum cliente lê Firestore direto — o único
  `firebase/app` fora da api é `packages/auth/client.ts:4`, que importa só `firebase/auth`; não há uso de
  `firebase/storage` em nenhum app.
- 🔴 **Uma mudança de payload é esperada e conhecida**: `user.mapper.ts:31` compara com
  `instanceof Timestamp` importado de `firebase-admin/firestore` (`:2`) enquanto os dados chegam do
  **client SDK** — o `instanceof` é sempre falso e `GET /users` devolve hoje `createdAt` como
  `{seconds, nanoseconds}`. Depois da migração vira **string ISO**. Nenhuma tela consome o campo (grep por
  `createdAt` na área admin de `users`: zero) e `UserDTO.createdAt: Date` já era mentira em JSON. Precisa
  de asserção de teste explícita (T6) e registro no handoff.
- ✅ **O slice `entity` é imune por construção**: `normalizeFirestoreInstant`
  (`packages/shared/utils/helpers/normalizeFirestoreInstant.ts:15-18`) faz **duck typing** em `.toDate()`,
  não `instanceof` — funciona com os dois SDKs, e trata `string`/`Date`/`null`.
- **`apps/api/env.ts` não roda no boot**: o único importador de `@/env` na api é
  `app/(routes)/webhooks/payments/route.ts:6`, e `env.ts:17` tem
  `skipValidation: NODE_ENV === "development"`. Por isso a exigência de credencial fica em **3 camadas**, e
  o "falha de imediato" real vem do `register()` de `apps/api/instrumentation.ts` (hoje um stub vazio).
- **`firebase-admin` já é runtime de fato** da api, declarado errado em `devDependencies`
  (`apps/api/package.json:39`): `user.mapper.ts:2,31` importa `Timestamp` como **valor**. Funciona por
  hoisting via `packages/auth`. `firebase` (`:26`) sai das dependências no fim do P3.
- **Cobertura zero no código que será 100% reescrito**: dos 8 arquivos de `apps/api/__tests__/`, só
  `userRepositoryList.test.ts` toca o módulo de banco — e só o **nome** (`:11`, `vi.mock` de
  `@/(shared)/infra/dabatase`), com `findAll` espionado (`:54`). A suíte ficaria verde com a migração toda
  errada. Fechar isso (2 arquivos novos, §7.2) é entregável, não extra.
- **Índices**: das 4 consultas do repo (plano §2.2), **nenhuma exige** índice composto hoje — três são
  igualdade única (cobertas pelos single-field automáticos) e uma é leitura por id. Vai versionada **uma**
  entrada, a de `findByReferenceId` (`user.repository.ts:17-25`, duas igualdades, roda em **todo** request
  autenticado). Gate empírico obrigatório: nenhum `FAILED_PRECONDITION … requires an index` nos fluxos.
- ⛔ **Ordem inegociável**: publicar as rules **depois** de a API rodar no Admin SDK. E o rollback correto
  é reverter o código e só então republicar — republicar rules permissivas sem reverter reexpõe a base.
- **Higiene de artefato**: os payloads de `GET /users` e os prints da lista admin carregam e-mail/nome de
  pessoas reais. Usar conta `@example.com` ou redigir — nada de PII em `plan.md`/`handoff.md`/screenshot.
- ✅ **As 6 perguntas foram decididas pelo usuário em 2026-08-22 (plano §10) — o `/develop` não reabre
  nenhuma**: **Q1** publicar rules+índices no projeto de referência (P7) · **Q2** corrigir `findAll()` em
  commit próprio (P4) · **Q3** endurecer `packages/auth/keys.ts` contra credencial parcial (P1) ·
  **Q4 não** — read-modify-write do `update()` fica fora, o defeito é **preservado** e vira achado ·
  **Q5 não** — só o bloco `FIREBASE_ADMIN_*` do `.env.example` · **Q6 versionar o `.firebaserc`**, contra a
  recomendação do plano: em troca, `docs/SETUP.md` **precisa** dizer que o fork usa `--project <id>` e não
  `firebase use`, que reescreveria arquivo versionado (§6.3).
- **3 achados para o `specs/BACKLOG.md`** no `/spec --sync` (não agora): o `update()` do §9.2; o
  `docs/SETUP.md:5` afirmando que o `.env.example` foi limpo das heranças do next-forge (não foi); e o
  `createdAt` de `GET /users` — este último **morre nesta tarefa**, só vira achado se o `/develop` não
  consertar.
- **Sem SDK, sem i18n, sem `error.code` novo, sem rota, sem guard, sem migração de dado.** Um
  `error.code` para falta de credencial seria justamente o modo degradado que a spec proíbe (`:97-99`).
- **Branch**: dono é o `revisor-codigo`. Sugestão registrada no plano §8.1:
  `api/refactor/firestore-admin-access`. A branch atual é **`iniciar-specs-individualmente`** (não `tacoma`,
  como o plano supunha): não é protegida, mas não segue o padrão `<project>/<type>/<title>`. Nada commitado.
- ⛔ **Pendência que sai do `/develop` para o usuário**: publicar rules + índices (P7) e o
  `deploy --dry-run` do P6 **não foram executados** — `firebase login:list` responde "No authorized
  accounts" e `firebase login` é interativo. Comandos exatos no `develop/handoff.md` §6. Os sinais de
  pronto `:111` e `:113` da spec seguem abertos; todo o resto está entregue e medido. O gate do P6 foi
  substituído por validação local com o **próprio** validador do firebase-tools
  (`FirestoreApi().validateSpec()`), e o corpo aplicável de `firestore.rules` é byte-idêntico (só
  comentários mudaram).
- **Estado do projeto Firebase de dev**: ficaram 2 entidades de snapshot e 2 contas `@example.com`
  (`qa-admin`, `qa-common`) para o `/review` e o `/test` redirigirem os fluxos. Remover ao fechar o
  pipeline. Senhas descartáveis, geradas na hora, **não gravadas em arquivo**.
- **`specs/**` tem 7 arquivos modificados no working tree que NÃO são desta tarefa** (auditoria anterior) —
  não entram nos commits desta feature. Estão na branch nova junto com o resto; o `/review` propõe um
  commit próprio para eles (`docs(specs): sync the backlog audit`).
- 🔴 **A afirmação “exatamente uma divergência de payload” do `develop/handoff.md` §4 está incompleta.**
  Existe uma segunda, medida no `review/review.md` (achado 1): `mergeAuthAndFirestore`
  (`user.mapper.ts:52-60`) não passa o lado Firestore por `serializeFirestoreData`, então `createdAt`
  sai como `Timestamp` cru — e o `Timestamp` do Admin SDK serializa `{_seconds,_nanoseconds}` contra
  `{type,seconds,nanoseconds}` do client SDK. Atinge `/auth/me`, os 3 sign-in/sign-up, `GET`/`PUT
  /users/:id` e `POST /users`. Sem consumidor em `apps/app` hoje, mas cria incoerência com `GET /users`
  (que virou ISO). **Decisão em aberto para o usuário** — não foi editado, porque muda comportamento.
- **Efeito de build descoberto no review**: `apps/api/env.ts` declara as três `FIREBASE_ADMIN_*` como
  server vars obrigatórias e é importado por `app/(routes)/webhooks/payments/route.ts`; `createEnv` valida
  eagerly, então **`pnpm --filter api build` falha sem elas** (antes o build da api rodava sem segredo
  nenhum). Documentado em `docs/SETUP.md`. Importa para `specs/ci-pipeline`.
- **Docs corrigidas no review**: `docs/SECURITY.md` e `docs/SETUP.md` afirmavam a base como protegida com as
  rules **não publicadas**. Agora dizem explicitamente que arquivo em `deny-all` ≠ publicado, e que a leitura
  direta ainda devolve `200` com dados.
- **Dados de teste adicionais deixados no projeto de dev pelo review** (remover ao fechar o pipeline):
  conta `qa-review-common@example.com` (`QA Review Renamed`) e 1 entidade soft-deleted
  (`Review Admin SDK Entity (edited)`). A senha do `qa-admin` foi redefinida via `create-dev-admin` e
  **não está gravada em arquivo**.
