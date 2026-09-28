# Relatório do `/test`: emulador de Storage e testes das security rules

Rodada autônoma do `/cycle`, 2026-09-28, no workspace `barcelona` (branch `barcelona`; a branch
`feat/storage-emulator-rules-tests` proposta pelo `/review` ainda não existe). Nada foi commitado nem
preparado no índice: `git diff --cached --stat` continua mostrando só o rename da auditoria
(`specs/brand-config.md → docs/features/brand-config/spec.md`).

Resultado: 19 critérios, 18 aprovados, 1 não verificável (job `verify` no GitHub), nenhum reprovado. A
medição achou um ponto cego na suíte de rules (uma regra "o dono lê o que é seu" passava sem quebrar
nada) e esta etapa fechou com 51 testes novos nos dois arquivos de rules. Um achado de acessibilidade
anterior à feature ficou registrado para o backlog.

## Verificar no `/test`: veredito por item

| # | Afirmação herdada | Veredito | O que foi medido |
|---|---|---|---|
| 1 | Mutação `if true` quebra a suíte; rules intactas depois | **Confirmado** | `firestore.rules` → `allow read, write: if true`, modo `emulators:exec`: exit 1, 90 falhas / 29 ok, todas em `firestoreRules.emulator.test.ts`. `storage.rules` → `if true`: exit 1, 13 falhas / 106 ok, todas em `storageRules.emulator.test.ts`. Mutações mais sutis também quebraram: `allow get: if request.auth != null` em `/entity/{id}` (1 falha), `allow get` autenticado em `/uploads/{uid}/{file}` (2 falhas), `allow list` autenticado em `/{allPaths=**}` (1 falha). `git diff firestore.rules storage.rules \| wc -l` = 0 depois de cada uma. |
| 2 | Modo reaproveitado não suja nem apaga o seed | **Confirmado** | `pnpm emulators` + seed (3 contas, 6 entidades, coleções `entity` e `user`) + um objeto-sentinela `uploads/qa-sentinel/keep.png`. Depois de `pnpm --filter api test:emulator` (119/119, 0 ocorrências de "Starting emulators"): mesmas duas coleções raiz, mesmas contagens e o mesmo hash da lista de IDs em cada uma (listagem com `showMissing=true`, que também pega subcoleção órfã), sentinela presente, 3 contas no Auth. Repetido com as duas mutações `if true` aplicadas no emulador de pé (103 falhas / 16 ok): o estado depois ficou idêntico. |
| 3 | Recusa com o `pnpm emulators` antigo | **Confirmado** | `firebase emulators:start --only auth,firestore` de verdade de pé (não um listener falso): `pnpm --filter api test:emulator` → exit 1 com "The Firestore and Storage emulators must be either both running or both stopped." |
| 4 | Limpeza de processo quando a execução é interrompida | **Confirmado, sem defeito** | Harness que roda o comando num grupo de processos próprio e manda o sinal quando 8080 e 9199 respondem. SIGINT ao grupo durante `pnpm test` (duas vezes), SIGTERM ao grupo durante `pnpm --filter api test:emulator`, e SIGINT só ao processo `node scripts/emulator-tests.mjs`. Nos quatro casos, 3 s depois: nenhuma porta 8080/9199/4400/4500/9150/4000/4001 ouvindo e nenhum processo `cloud-firestore`, `emulators:exec` ou `vitest run --config` vivo. No sinal só ao script, o `emulators:exec` órfão terminou a suíte (119 passed) e desligou os emuladores sozinho. A recomendação da revisão (repassar sinal ao filho) não é necessária. |
| 5 | `setupFiles` aborta com host fora do loopback | **Confirmado** | `loopback()` trocado temporariamente para `localhost:${port}`, emuladores de pé: exit 1, `Error: FIRESTORE_EMULATOR_HOST is "localhost:8080". The emulator suite only runs against emulators on 127.0.0.1...`, "Test Files 4 failed", "Tests no tests". Arquivo restaurado e conferido com `cmp`. |
| 6 | Fluxo visual sob o emulador | **Confirmado** | Ver "Evidências e2e". Seletor, pré-visualização, `ProfileDropdown` com imagem de `127.0.0.1:9199`, 0 violação de CSP, miniatura, expurgo e 503 sem o host, em light, dark, mobile e nos três idiomas. |
| 7 | `pnpm e2e` com o `ImageUploadInput` visível | **Confirmado** | `pnpm e2e`: 22 passed (1,3 min), inclusive `a11yDark` em `/pt-br/entities/create`. Na passada de browser, com o mesmo env do `stackEnv.ts`, `/entities/create` e `/account` têm 1 `input[type=file]` cada. axe 4.13 injetado nas duas páginas, light e dark, com as tags do e2e: só `document-title` (já na allowlist) e `image-alt` no avatar do `ProfileDropdown`, que não é do campo novo (ver "Achado fora do escopo"). O `a11yDark` passa porque o usuário do seed não tem avatar. |
| 8 | Zero conexão fora de `127.0.0.1` | **Confirmado, com contraprova** | Hook de `net.Socket.prototype.connect` e `dns.lookup` via `NODE_OPTIONS=--require`: 5 processos Node (o script e 4 workers), 12 conexões, todas para `127.0.0.1:8080` ou `:9199`, 0 externa, 0 DNS. Sem `METADATA_SERVER_DETECTION` no config (removido só para a contraprova e restaurado): 2 conexões externas (`169.254.169.254:80`, `metadata.google.internal.:80`) e 1 DNS (`metadata.google.internal.`). O hook enxerga a conexão que o flag evita. |
| 9 | Job `verify` no GitHub | **🔒 Não verificável** | Só observável na PR (Temurin 21, cache dos JARs, tempo total). |

## Critérios de aceite: status por item

Checklist completo em `test/criterios-aceite.md`. ✅ aprovado · ❌ reprovado · 🔒 não verificado.

| # | Critério | Status | Meio |
|---|---|---|---|
| 1 | `pnpm emulators` sobe Storage junto | ✅ | e2e (hub lista `storage` em `127.0.0.1:9199`; log mostra `Storage │ 127.0.0.1:9199 │ http://127.0.0.1:4001/storage`); a falha com Java 17 foi medida via `pnpm test`. O download do JAR na primeira subida não foi observado: o JAR já estava em `~/.cache/firebase/emulators/`. |
| 2 | API grava no bucket emulado, nunca no real | ✅ | `test:emulator` (`storageUpload` com `a-real-bucket.firebasestorage.app` no env mockado) + unit (`storageEmulatorIsolation`) + runtime: API sem o host e com `FIREBASE_STORAGE_BUCKET=a-real-bucket.firebasestorage.app` → 503 `STORAGE_NOT_CONFIGURED` |
| 3 | URL de upload abre o objeto | ✅ | `test:emulator` + e2e (201 em `POST /files`; `<img>` com `naturalWidth` 128 de `http://127.0.0.1:9199/demo-next-boilerplate.appspot.com/uploads/...`); arquivo não-imagem → 415 com a mensagem traduzida |
| 4 | URL emulada sem assinatura; produção assina | ✅ | unit (`storageEmulatorIsolation`); runtime: a `url` devolvida não tem query string de assinatura |
| 5 | Referência de outro dono recusada | ✅ | `test:emulator` (`storageUpload`) |
| 6 | Trocar avatar apaga o anterior | ✅ | e2e (objeto antigo `GET` → 404; bucket só com o novo) + `test:emulator` |
| 7 | Expurgo apaga objetos do titular | ✅ | e2e (conta QA com 2 objetos; depois de "Delete forever", `POST /account/deletion` 200, prefixo vazio, objetos de outros perfis intactos, conta some do Auth) + `test:emulator` |
| 8 | `firestore.rules` recusa anônimo e autenticado | ✅ | `test:emulator` + mutações (item 1 acima) |
| 9 | `storage.rules` recusa anônimo e autenticado | ✅ | `test:emulator` + mutações |
| 10 | `pnpm test` roda a suíte e falha sem emulador | ✅ | `pnpm test` com JDK 21: exit 0, 13 tarefas, log "cache bypass, force executing" em `api:test:emulator`; com Java 17: exit 1, `Failed: api#test:emulator`, mensagem de Java do `firebase-tools` |
| 11 | Reaproveita os emuladores do dev | ✅ | itens 2 e 3 acima |
| 12 | Gate hermético e build sem Java | ✅ | Java 17: `pnpm turbo run test` exit 0 (12/12 do cache); `pnpm coverage` exit 0, 212 arquivos / 2237 testes, nenhum `*.emulator.test.ts`; `pnpm turbo run build --dry=json`: 34 tarefas, só `build` e `test` |
| 13 | `verify` do CI roda a suíte | 🔒 | exige o runner do GitHub |
| 14 | Usuário troca o avatar e vê a foto nova | ✅ | e2e (ver "Evidências e2e") |
| 15 | Fork sem upload não configura nada | ✅ | e2e: API e app sem os dois hosts → 503 `STORAGE_NOT_CONFIGURED`, `img-src 'self' data: blob: https://lh3.googleusercontent.com`, campos "Foto de perfil (URL)" e "Foto (URL)", 0 `input[type=file]` |
| 16 | Rules recusam o dono do recurso | ✅ | teste novo em `test:emulator`; a mutação que antes passava agora falha |
| 17 | Suíte nunca sai da máquina | ✅ | itens 5 e 8 acima |
| 18 | Interrupção não deixa emulador pendurado | ✅ | item 4 acima |
| 19 | E2E verde com o upload visível | ✅ | item 7 acima |

Contagem: 18 ✅, 1 🔒, 0 ❌.

## Cobertura: comandos e números

Todos rodados neste workspace, sem `--force` e sem editar nenhum `.env`.

| Comando | Resultado |
|---|---|
| `PATH=openjdk@21 pnpm test` (primeira medição, antes dos testes novos) | exit 0; 13 tarefas (12 do cache); `api` 75 arquivos / 949 testes, `app` 86 / 688, `@repo/auth` 9 / 107, `api#test:emulator` 4 / 119 |
| `PATH=openjdk@21 pnpm test` (final, com os testes novos) | exit 0; 13 tarefas (11 do cache); `api` 949, `app` 688, `@repo/auth` 107, `api#test:emulator` 170 |
| `pnpm test` com Java 17 | exit 1, `Failed: api#test:emulator` |
| `pnpm turbo run test` com Java 17 | exit 0, 12/12 do cache |
| `pnpm coverage` com Java 17 | exit 0, 212 arquivos / 2237 testes |
| `pnpm turbo run build --dry=json` | 34 tarefas, `build` e `test` |
| `pnpm e2e` (emuladores reaproveitados, api/app/web subidos pelo Playwright) | 22 passed |
| `pnpm --filter api typecheck` | exit 0 |
| `pnpm exec biome check` nos dois arquivos de teste editados | 0 erro, sem fix |

Paridade de i18n: não se aplica, nenhuma chave nova. `pnpm check` completo e o `typecheck` de `app` e
`@repo/auth` não foram remedidos: esta etapa só mexeu em dois arquivos de teste da `api`, e o `/review`
já registrou 782 arquivos com 0 erro e 3/3 no typecheck.

### Testes criados

- `apps/api/__tests__/storageRules.emulator.test.ts`: identidade `owner`, autenticada com o mesmo uid do
  segmento do caminho do objeto (`uploads/<OWNER_ID>/...`), entra no `describe.each` junto de anônimo e
  autenticado. +6 testes.
- `apps/api/__tests__/firestoreRules.emulator.test.ts`: identidade `owner` com uid igual ao ID da sonda, e a
  sonda passa a gravar `reference_id` e `userId` com esse mesmo valor (os campos de dono que os
  repositórios usam). +45 testes (5 operações × 9 caminhos).

Por que existem: a regra `allow read: if request.auth.uid == uid` em `/uploads/{uid}/{file}`, junto com
`allow read: if request.auth.uid == resource.data.reference_id` em `/user/{id}`, passou pela suíte original
(119/119, exit 0). É a forma mais provável de alguém abrir as rules, e a suíte só testava um estranho. Com os
testes novos, a mesma mutação (mais `allow get` por ID em `/entity/{id}`) sai com exit 1 e 4 falhas, todas na
identidade `owner`; o `if true` sai com 154 falhas / 16 ok; as rules atuais passam 170/170.

## Decisões de custo de teste

- **Faixa cara, criada:** os 51 testes novos rodam contra o emulador porque o objeto é a própria regra de
  segurança. Mock nenhum prova que `storage.rules` ou `firestore.rules` barram o dono. Entraram nos dois
  arquivos que já existiam, sem processo novo nem arquivo novo.
- **`storage.ts`, `packages/auth/emulator.ts`, `storageEnabled.ts`, `proxy.ts`:** nenhum teste novo. Os
  unitários do `/develop` (`storageEmulatorIsolation`, `storageEmulatorHost`, `storageEnabled`,
  `securityPolicySources`) cobrem cada ramo do env, e a passada de browser confirmou o efeito em runtime.
- **`emulator-tests.mjs`:** nenhum teste novo. `emulatorTestRun.test.ts` cobre a decisão pura, e os três
  caminhos (subir, reaproveitar, recusar) foram medidos de verdade nos itens 2, 3 e 10.
- **Rotas `files`, `account`, `account/deletion`:** nenhuma mudou de contrato. O que o diff mudou nelas
  (bucket emulado) está coberto em `storageUpload` e `accountErasureStorage`.

## Evidências e2e

Stack subida com o env de emulador montado como o `apps/e2e/support/stackEnv.ts` faz: chaves dos `.env`
locais esvaziadas, valores do `.env.example`, chaves de projeto real forçadas vazias e o bloco de
emulador. `next dev` em 3002 (api) e 3000 (app). Browser: `agent-browser` em 1440×900 e 390×844, comandos
em sequência.

- **Seletor em `/account`, pt-br:** aba "Perfil" com botão "Foto de perfil" e "Escolher imagem". Depois de
  escolher um PNG 128×128: `POST /files 201`, os botões viram "Trocar imagem" e "Remover imagem", e a
  pré-visualização (`alt` "Pré-visualização da foto de perfil") carrega com `naturalWidth` 128 de
  `http://127.0.0.1:9199/demo-next-boilerplate.appspot.com/uploads/<profileId>/<uuid>.png`.
- **Salvar:** `PUT /account 200`, toast "Perfil atualizado.", e o avatar do `ProfileDropdown` passa a ser um
  `<img>` da mesma URL com `naturalWidth` 128. O menu aberto em dark mostra o nome e o e-mail do seed.
- **CSP:** header do app com `img-src 'self' data: blob: https://lh3.googleusercontent.com http://127.0.0.1:9199`
  e `connect-src` sem `9199`. Um listener de `securitypolicyviolation` instalado antes da troca de avatar
  registrou 0 violação. Contraprova: uma imagem de `http://127.0.0.2:9199` na mesma página gerou
  `img-src http://127.0.0.2:9199/probe.png`, então o listener enxerga violação quando ela existe. O
  comando `console` do `agent-browser` não mostra mensagens de CSP; o listener é o instrumento.
- **Troca de avatar:** segundo PNG, salvar; o bucket fica só com o novo objeto do titular e o `GET` no
  objeto antigo responde 404.
- **Entidade:** "Acme Franchise" editada com foto: `PUT /entities/<id> 200`, volta para `/pt-br/entities`, e
  a coluna "Foto" mostra a miniatura (`alt` "Acme Franchise", `naturalWidth` 128) em light, dark e mobile
  (390 px, tabela com rolagem horizontal). Em en, a entidade nova "QA Storage Entity" com foto também
  aparece na lista.
- **Expurgo:** conta `qa-storage-emulator@example.com` criada por `POST /auth/sign-up` (201), onboarding
  concluído na UI, avatar e uma entidade com foto (2 objetos sob `uploads/VNh8INnuMApTvwaAVQha/`). Aba
  "Privacy" → "Delete my account" → senha → "Delete forever": `POST /account/deletion 200`, redireciona
  para `/en/sign-in`, prefixo vazio (`{"kind":"storage#objects"}`), os 3 objetos de outros perfis
  continuam, e `accounts:lookup` no Auth não devolve usuário.
- **503 sem o host:** API reiniciada com `FIREBASE_STORAGE_EMULATOR_HOST=""` e
  `FIREBASE_STORAGE_BUCKET=a-real-bucket.firebasestorage.app`: `POST /files` com Bearer do usuário do seed
  → `{"error":{"code":"STORAGE_NOT_CONFIGURED"}}`, HTTP 503; `GET /account` devolve `avatarUrl` nulo. A
  mesma chamada contra a API com o host tinha dado 201 minutos antes.
- **App sem o host:** `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST=""`: `img-src` sem `9199`, `/pt-br/account`
  mostra "Foto de perfil (URL)" e `/pt-br/entities/create` mostra "Foto (URL)", sem `input[type=file]`.
- **Idiomas:** `/en/account` com "Profile picture", "Replace image", "Remove image", "Save" e "Profile picture
  preview"; `/es/account` com "Foto de perfil", "Cambiar imagen", "Quitar imagen", "Guardar" e "Vista previa
  de la foto de perfil"; imagens com `naturalWidth` 128 nos dois. Erro de formato em es: "Formato no
  aceptado. Envía JPG, PNG o WebP." com o código do erro, `POST /files 415`. "No file chosen" é o rótulo
  nativo do Chrome em en-US, não texto da app.
- **Tema e responsivo:** `/account` em dark (classe `dark` no `<html>`) com o avatar e os campos legíveis;
  mobile 390 px em light e dark com avatar e botões empilhados, sem corte. A tabela antd de entidades segue
  o tema dark.

Prints em `test/e2e/` (`01-account-perfil-light.png` a `14-sem-host-account.png`), descartados pelo
`.gitignore`. O texto acima é a evidência.

A passada rodou em `next dev`. Nenhum defeito de entrega apareceu, então não houve o que confirmar em
`build && start`.

## Achado fora do escopo (anterior à feature)

- **`apps/app/shared/components/ui/ProfileDropdown.tsx:45`:** `<AvatarImage src={avatarSrc} />` sem `alt`.
  Com avatar preenchido, o axe acusa `image-alt` (serious) em toda página autenticada: medido em `/account`
  e `/entities/create`, light e dark. O código vem do commit `a4df5ed` (#12), e o mesmo acontece em
  produção com bucket real. O `a11yDark` do e2e não pega porque o usuário do seed não tem avatar. Hipótese
  de correção: `alt=""`, já que o gatilho tem `aria-label` ("Abrir menu do perfil"), no padrão do
  `AvatarImage` de `apps/app/app/[locale]/(unauthenticated)/layout.tsx:24`. Não é ❌ desta entrega; o
  revisor decide se entra como fix separado ou vai ao backlog.

## Lacunas: veredito

Do `handoff.md` e do `review.md`:

- **Teste do `apps/app` renderizando o seletor com só o host:** continua aberta como teste automatizado,
  fora do corte. O comportamento foi confirmado nesta passada (seletor presente com o host, ausente sem ele).
- **`signReadUrl` emulado não codifica o `path`:** continua aberta, condicional ao `STORAGE_OBJECT_PATH_RE`
  afrouxar.
- **Objeto que não abre sem assinatura e expiração da URL V4:** fora de escopo, exige bucket real
  (`docs/PRE-PRODUCTION.md` §6).
- **`playwright.config.ts` espera só a porta do Auth, e o e2e agora sobe o Storage junto:** continua aberta,
  não medida. Nesta rodada o e2e reaproveitou emuladores já de pé, então o caminho em que o Playwright sobe
  o `pnpm emulators` não rodou. A suíte não faz upload.
- **`SETUP.md` sem número para o tempo do `verify`:** continua aberta, depende da primeira PR.

Novas:

- **O dono do recurso não era testado nas rules:** fechada nesta etapa (testes acima).
- **`listAll` só é testado na raiz `uploads`:** aberta, risco baixo. Uma mutação `allow list` em
  `/uploads/{uid}/{file}` passou pela suíte, mas não medi se ela abre de fato a listagem de
  `uploads/<uid>/`; pode ser uma regra que não casa com nenhuma chamada.

## Ambiente do e2e

Antes de começar, nenhuma das portas 3000/3001/3002/3003/4000/4001/4400/4500/8080/9099/9150/9199 estava
ouvindo. Nada do usuário foi reaproveitado.

Subido e derrubado por mim:

- `firebase emulators:start --only auth,firestore` (item 3), derrubado com `kill -INT` no PID do
  `firebase-tools`.
- `pnpm emulators` (Auth, Firestore, Storage) para os itens 2, 5 e 8, o `pnpm e2e` e a passada de browser,
  derrubado com `kill -INT` no PID do `firebase-tools`.
- `next dev` da api (3002) e do app (3000), duas vezes cada, em grupos de processo próprios, derrubados com
  `kill -- -<pgid>`. Uma tentativa de segunda API em 3012 não subiu (lock do `.next/dev`) e não deixou
  processo.
- O `pnpm e2e` subiu e derrubou api/app/web pelo próprio Playwright.
- Os `emulators:exec` do `test:emulator` se encerram sozinhos.

No fim, `lsof -nP -iTCP -sTCP:LISTEN` nessas portas saiu vazio, igual ao começo, e o browser foi fechado.
O harness temporário (lançador de stack, harness de sinal, hook de rede) ficou só em `/tmp`, fora do repo,
e foi apagado. `firestore.rules`, `storage.rules` e `apps/api/vitest.emulator.config.mts` foram editados só
durante as medições e voltaram ao conteúdo original (`git diff` vazio nos dois primeiros, `cmp` no
terceiro).

## Dados de QA e estado de dev

- Tudo aconteceu nos emuladores, projeto `demo-next-boilerplate`. Nenhuma conta foi criada em projeto
  Firebase real, então a lista de contas do `docs/PRE-PRODUCTION.md` não muda.
- Conta criada e depois excluída pela própria UI: `qa-storage-emulator@example.com` (senha gerada na hora,
  não gravada em arquivo).
- Usuário do seed `user@example.com` (senha pública do seed, documentada em `docs/SETUP.md`): nome de
  exibição "QA Storage Emulator", avatar e foto de "Acme Franchise". O estado morreu com o emulador.
- Objeto-sentinela `uploads/qa-sentinel/keep.png` no bucket emulado, descartado com o emulador.

## Observações

- Com SIGINT, o `pnpm` sai com código 0 mesmo quando o turbo imprime "run failed". É comportamento do
  `pnpm`, não desta entrega, mas quem automatizar em cima de `pnpm test` não deve ler o exit de uma
  execução interrompida como sucesso.
- `docs/PRE-PRODUCTION.md:55` diz que "cliente anônimo e autenticado são recusados". Continua verdade; com
  os testes novos, a suíte também cobre o dono do recurso.
