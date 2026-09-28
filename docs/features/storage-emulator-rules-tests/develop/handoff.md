# Handoff do `/develop`: emulador de Storage e testes das security rules

Rodada autônoma do `/cycle`, 2026-09-28. Nada foi commitado nem preparado no índice. O índice continua só
com o rename da auditoria (`specs/brand-config.md → docs/features/brand-config/spec.md`), que não é desta
feature. As outras mudanças da auditoria no working tree (`specs/BACKLOG.md`, `specs/observability-logging.md`,
`specs/teams-organizations.md`, `specs/storage-emulator-rules-tests.md`, `docs/features/brand-config/*`)
também não foram tocadas.

## Blueprint → arquivos

| Item do plano | Arquivos |
|---|---|
| §10.1 `packages/auth/emulator.ts` | `packages/auth/emulator.ts` (`DEMO_STORAGE_BUCKET`, `storageEmulatorHost()`), `packages/auth/__tests__/storageEmulatorHost.test.ts` (novo) |
| §10.2 `storage.ts` | `apps/api/(shared)/lib/storage.ts`, `apps/api/__tests__/storageEmulatorIsolation.test.ts` (estendido: `clearEmulatorEnv` limpa as três variáveis de Storage; 9 casos novos) |
| §10.3 suíte contra emulador | `apps/api/vitest.config.mts` (exclude `**/*.emulator.test.ts`), `apps/api/vitest.emulator.config.mts`, `apps/api/__tests__/emulatorGuard.emulator-setup.ts`, `storageUpload.emulator.test.ts`, `accountErasureStorage.emulator.test.ts`, `firestoreRules.emulator.test.ts`, `storageRules.emulator.test.ts` |
| §10.4 script | `apps/api/scripts/emulator-tests.mjs`, `apps/api/__tests__/emulatorTestRun.test.ts`, `apps/api/package.json` (script `test:emulator`, devDependency `firebase`), `pnpm-lock.yaml` (+3 linhas, só o importer; `pnpm install --offline` baixou 0 pacote) |
| §10.5 infra da raiz | `firebase.json` (storage 9199), `package.json` (`--only auth,firestore,storage`; `test` = `turbo test test:emulator`), `turbo.json` (`test:emulator`, `cache: false`, `dependsOn: ["test"]`) |
| §10.6 CI | `.github/workflows/ci.yml` (`verify` com Temurin 21, cache dos JARs e `test:emulator`; chave do cache do `e2e` passa a incluir `firebase.json`) |
| §10.7 env | `apps/api/.env.example`, `apps/app/.env.example` |
| §10.8 `apps/app` | `apps/app/env.ts`, `apps/app/shared/lib/storageEnabled.ts`, `apps/app/proxy.ts`, `apps/app/__tests__/storageEnabled.test.ts` (novo), `apps/app/__tests__/securityPolicySources.test.ts` (estendido) |
| §10.9 docs | `CLAUDE.md`, `README.md`, `docs/SETUP.md`, `docs/AI-WORKFLOW.md`, `docs/TASK-PIPELINE.md`, `docs/review-checklist.md`, `.claude/skills/payments-flow/SKILL.md`, `docs/PRE-PRODUCTION.md` |

## Contrato

Nenhum DTO ou action do `@repo/sdk` mudou. `POST /files` continua devolvendo
`{ data: { path, url, expiresAt, contentType, size } }`. Sob o emulador de Storage, `url` passa a ser
`http://<FIREBASE_STORAGE_EMULATOR_HOST>/demo-next-boilerplate.appspot.com/<path>`. Quem consome `url`,
`photoUrl` e `avatarUrl` no `apps/app` renderiza com `ResponsiveImage unoptimized` ou `<img>` do Radix,
então só a CSP precisava conhecer o host novo (conferido lendo `EntitiesListClient.tsx`,
`image-upload-input.tsx` e `ProfileDropdown.tsx`).

`packages/auth/emulator.ts` ganhou dois exports. Quem os importa hoje: `apps/api/(shared)/lib/storage.ts` e
os testes emulados.

## Códigos de erro

Nenhum código novo. `apiErrors` não mudou.

## Desvios do plano

Nenhuma decisão do plano estava errada. Os desvios abaixo são acréscimos que a medição pediu.

1. **`METADATA_SERVER_DETECTION: "none"` no `vitest.emulator.config.mts`.** O plano previa que zerar
   `GOOGLE_APPLICATION_CREDENTIALS` e `FIREBASE_ADMIN_*` bastaria para não haver rede fora da máquina (R-2).
   A medição mostrou que não bastava: o Admin SDK do Firestore, dentro de `firestoreRules.emulator.test.ts`,
   abriu conexão com `169.254.169.254:80` e resolveu `metadata.google.internal` (detecção de Compute
   Engine do `gcp-metadata`, via `gaxios`). Com a variável, a contagem caiu para zero. Instrumento na seção
   de validação.
2. **O teste de rules do Firestore registra cada documento que tentou criar e o apaga no `afterAll`.** Sem
   isso, a mutação `allow read, write: if true` deixou documentos `created-*` no emulador reaproveitado (8
   contados nas 4 coleções que listei: `user`, `entity`, `auditEvent` e a coleção aleatória),
   contrariando "a suíte remove tudo o que gravou" (§9). Depois da mudança, a mesma mutação deixou 0.
3. **`setLogLevel("silent")` no cliente Firestore**, porque cada recusa esperada imprimia um
   `PERMISSION_DENIED` no stderr (100 linhas por execução). Contagem depois: 0.
4. O config emulado também zera `STORAGE_EMULATOR_HOST`, os hosts de Auth, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   e os dois nomes de bucket, para o shell ou um `.env` exportado não mudarem o resultado, e define
   `hookTimeout: 30_000`.
5. `storageUpload` e `accountErasureStorage` mockam `@/env` com um nome de bucket real preenchido
   (`a-real-bucket.firebasestorage.app`), para a suíte provar contra o emulador que o nome é ignorado.
6. O caminho aninhado do teste de rules usa `user/<sonda>/nested` fixo, em vez da primeira coleção que o
   `readdir` devolver.
7. Três arquivos de prosa fora da lista de §10.9 ficariam mentindo e foram corrigidos:
   `docs/SECURITY.md` (a leitura "sai por URL assinada V4" ganhou a exceção do emulador),
   `apps/api/scripts/seed-emulator.mjs` (comentário dizia "Cloud Storage is not emulated") e a tabela de
   `docs/review-checklist.md` (linha do `test:emulator`; "Estes três itens" virou "Estes itens", porque a
   tabela já tinha quatro linhas antes desta mudança).
8. `storageEmulatorIsolation.test.ts` também cobre `STORAGE_EMULATOR_HOST` sozinho (além da variante
   `NEXT_PUBLIC_`): Storage continua desligado e nada é gravado.

## Riscos do plano medidos

- **R-1 (cwd do `emulators:exec`).** `firebase emulators:exec --only firestore,storage ... 'echo "CHILD_CWD=$(pwd)"'`
  rodado em `apps/api` imprimiu `CHILD_CWD=.../barcelona/apps/api`: o filho herda o cwd de quem chamou. O
  script passa o config por caminho absoluto de qualquer forma. O `firestore-debug.log` fica em
  `apps/api/`, já coberto pelo `.gitignore` (`git status --ignored` → `!!`).
- **R-2 (rede fora de 127.0.0.1).** Instrumento: um hook em `/tmp/netprobe.cjs` (não versionado) carregado
  com `NODE_OPTIONS=--require`, que registra `net.Socket.prototype.connect` e `dns.lookup` por processo.
  Sem a variável do desvio 1: 7 conexões externas e 6 DNS, sendo 2 do worker do Vitest (metadata server,
  só no arquivo de rules do Firestore) e 5 do próprio `firebase-tools` para `www.google-analytics.com`
  (telemetria da CLI, fora do nosso código). Com a variável, rodando o Vitest direto contra emuladores de pé:
  0 conexão externa e 0 DNS, 119/119 testes. Os processos Java dos emuladores não passam pelo hook.
- **R-3 (`@repo/auth/server` real nos testes).** Carrega com `vi.mock("server-only")`; `next/headers` e
  `keys()` não atrapalharam. As quatro suítes passam usando o `getStorageAdmin`/`getFirestoreAdmin` reais.
- **R-6 (rules recarregadas no emulador reaproveitado).** O log do emulador mostrou
  `firestore: Change detected, updating rules... ✔ Rules updated.` e o equivalente do Storage. A mutação
  quebrou a suíte nos dois modos (números abaixo).

## Validação (instrumento → resultado)

Todos os comandos rodaram neste workspace, sem editar `.env`, com as portas 8080/9199/9099/4000/4001/4400/4500/9150
livres antes (`lsof` vazio).

| Comando | Resultado |
|---|---|
| `PATH=openjdk@21 pnpm --filter api test:emulator` (emuladores parados, caminho `emulators:exec`) | exit 0, 4 arquivos, 119 testes, 7,6 s de parede. O JAR `cloud-storage-rules-runtime-v1.1.3.jar` já tinha sido baixado na medição do R-1 |
| Mesmo comando com `firebase emulators:start --only firestore,storage` de pé em segundo plano (caminho reaproveitar; sem Auth, que a suíte não usa) | exit 0, 119 testes, 0 ocorrências de "Starting emulators" no log |
| Listener falso só no 8080 + `pnpm --filter api test:emulator` | exit 1 com a mensagem "The Firestore and Storage emulators must be either both running or both stopped..." |
| `pnpm --filter api test:emulator` com o `java` padrão (17.0.13) | exit 1: "firebase-tools no longer supports Java version before 21" |
| Mutação `firestore.rules` → `if true`, modo `emulators:exec` | exit 1, 90 falhas / 29 ok (as 90 em `firestoreRules.emulator.test.ts`) |
| Mutação `storage.rules` → `if true`, modo `emulators:exec` | exit 1, 13 falhas / 106 ok (as 13 em `storageRules.emulator.test.ts`) |
| Mesmas mutações no modo reaproveitado | Firestore 90 falhas / 10 ok; Storage 13 falhas / 1 ok |
| `git diff firestore.rules storage.rules \| wc -l` depois das mutações | 0 |
| `PATH=openjdk@21 pnpm test` | exit 0, 13 tarefas; `api` 75 arquivos / 949 testes, `app` 86 / 688, `@repo/auth` 9 / 107, `api#test:emulator` 119 |
| `pnpm turbo run test` com Java 17 | exit 0, 12 tarefas (todas do cache, com o mesmo hash da execução acima) |
| `pnpm --filter api test` com Java 17 (fora do turbo, sem cache) | exit 0, 75 arquivos / 949 testes, 0 menção a `.emulator.test` |
| `pnpm test` com Java 17 | exit 1, `Failed: api#test:emulator`, com a mensagem de Java do `firebase-tools` |
| `pnpm coverage` com Java 17 | exit 0, 212 arquivos / 2237 testes, nenhum `*.emulator.test.ts` |
| `pnpm turbo run build --dry=json` | 34 tarefas, só `build` e `test`; `test:emulator` fora do grafo do build |
| `pnpm turbo run typecheck --filter app --filter @repo/auth --filter api` | 3/3 ok, sem cache |
| `pnpm check` | 782 arquivos, 0 erro |
| Resíduo no emulador reaproveitado depois de uma execução normal | 0 objeto no bucket (`GET /storage/v1/b/demo-next-boilerplate.appspot.com/o` → `{"kind":"storage#objects"}`); os únicos documentos que sobraram vieram da primeira mutação, antes do desvio 2 |

Paridade de i18n não se aplica: nenhuma chave nova.

## Processos

Subi e derrubei dois tipos de processo. O `emulators:exec` para sozinho. O `emulators:start` em segundo
plano (PID 93790, `pnpm exec firebase ...`) não repassou o SIGINT: foi preciso mandar `kill -INT` direto no
processo do `firebase-tools` (PID 93812), que então desligou o Java do Firestore. Um listener `node` de teste
no 8080 foi morto pelo PID. A conferência final `lsof -nP -i :8080 -i :9199 -i :9099 -i :4000 -i :4001 -i :4400 -i :4500 -i :9150`
voltou vazia.

## A verificar no `/test`

- Fluxo visual do avatar e da foto de entidade sob o emulador (§8, fluxos 1 a 6): seletor aparece com os
  `.env.example`, pré-visualização, `ProfileDropdown` com a imagem de `127.0.0.1:9199`, sem violação de CSP,
  light/dark/mobile e 3 idiomas. Nada disso foi aberto no navegador aqui. Precisa do bloco de emulador
  inline (como `apps/e2e/support/stackEnv.ts`), porque os `.env` desta máquina apontam para um projeto real.
- `pnpm e2e`. Os `.env.example` agora ligam o upload, então o formulário de `/entities/create`, que o
  `a11yDark.spec.ts` varre com axe, mostra o `ImageUploadInput` no lugar do campo de URL. Não rodei a
  suíte; uma violação nova do axe ali é possível.
- Job `verify` no GitHub: Temurin 21, cache dos JARs e tempo total (R-4). `docs/SETUP.md` ainda diz que o
  `verify` "leva cerca de um minuto"; não medi o número novo.
- O `setupFiles` (`emulatorGuard.emulator-setup.ts`) aborta com host fora de `127.0.0.1`: escrito, não
  exercitado, porque o config força os valores. Repro: trocar temporariamente o `loopback()` do config por
  outro host e rodar `pnpm --filter api test:emulator`.
- O e2e sobe o Storage junto (`pnpm emulators`), mas o `playwright.config.ts` só espera a porta do Auth. A
  suíte não faz upload, então não deveria importar; não medido.

## Lacunas de teste conhecidas

- Nenhum teste automatizado do `apps/app` renderizando o seletor com só o host de emulador; a cobertura é o
  unitário de `isStorageEnabled()` e o da CSP.
- `signReadUrl` emulado não codifica o `path` na URL. Hoje o `STORAGE_OBJECT_PATH_RE` só deixa passar
  caracteres seguros, então não há caso a cobrir, mas qualquer afrouxamento dessa regex precisa de teste.
- Continua 🔒 porque exige bucket real: objeto que não abre sem assinatura e expiração da URL V4.

## Decisões em aberto

As quatro perguntas do §14 do plano seguem com a opção adotada e nada nesta etapa mudou a recomendação.
Uma observação nova para o `/review`: o `R-5` (host de emulador esquecido em produção sem trava de boot)
continua como sugestão de backlog, fora do corte.
