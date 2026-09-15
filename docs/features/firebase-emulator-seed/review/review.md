# Review — Emulador do Firebase, seed e primeiro admin

> Rodou dentro de um `/cycle` autônomo. **Nada foi commitado e nenhuma branch foi criada.**
> O working tree carrega **três assuntos distintos** — ver §8.

---

## 1. Branch

| Item | Valor |
|---|---|
| Branch | `madison` — **reutilizada**, não criada |
| Base | é a própria branch de trabalho do workspace; não é protegida |
| Por quê reutilizar | o diff inteiro (três assuntos) já vive aqui; mover para `<project>/<type>/<title>` exigiria replay dos commits e só traria ganho de nomenclatura |

⚠️ `madison` **não segue** o padrão `<project>/<type>/<title>` e carrega três assuntos que, pelo padrão do
repo, seriam três PRs. Registrado em §7 como decisão do usuário, não minha.

---

## 2. Reverificação independente do isolamento — **confirma o handoff, e vai além dele**

O handoff mediu isolamento com Wi-Fi desligado, HAR e `lsof -sTCP:ESTABLISHED`. Não aceitei a medição:
refiz com um método **diferente e estritamente mais forte** — um hook `NODE_OPTIONS` que instrumenta
`net.Socket.prototype.connect`, `tls.connect` e todo o `dns.*` dentro dos processos da `api`, do `app` e da
`web`. Ele registra **tentativas**, não só conexões estabelecidas, e por isso enxerga o que o `lsof` não
pode enxergar.

Stack subido do jeito documentado (`cp .env.example .env` nos três, `pnpm emulators`, `pnpm seed`,
`pnpm dev`), fluxo percorrido no navegador.

### Servidor — tudo que os três processos tentaram alcançar

| Destino | Veredito |
|---|---|
| `127.0.0.1:9099` (Auth) — 32 conexões | ✅ emulador |
| `127.0.0.1:8080` (Firestore) | ✅ emulador |
| `localhost:3002` / `::1:3002` | ✅ interno (`app` → `api`) |
| `telemetry.nextjs.org:443`, `registry.npmjs.org:443` | ⚪ tagarelice do dev server do Next, pré-existente, nada a ver com Firebase |
| **`metadata.google.internal.:80` e `169.254.169.254:80`** | 🟠 **achado novo — o handoff não viu** |

Nenhum host real do Firebase/Google foi contatado. **A afirmação de isolamento do handoff bate.**

### O que o método do handoff não podia ver

`metadata.google.internal.` / `169.254.169.254` é a sonda de **Application Default Credentials** do
`google-auth-library` dentro do `firebase-admin`. Ela **nunca estabelece** numa máquina de desenvolvimento
(não resolve), então **não aparece em `lsof -sTCP:ESTABLISHED`** — o handoff não errou, mediu com um
instrumento cego para isso.

Ela não vaza nada por si só, mas prova um fato que muda a conclusão: **sob o emulador o Admin SDK roda em
modo de descoberta de credencial**, porque `packages/auth/server.ts` inicializa com `initializeApp({ projectId })`,
**sem** `credential`. Auth e Firestore ficam imunes (os `*_EMULATOR_HOST` curto-circuitam a credencial por
completo). **Cloud Storage não** — e foi por aí que apareceu o único vazamento real. Ver §3, S1.

### Navegador — HAR, medido por mim

| App | Hosts contatados |
|---|---|
| `app` (3000), login + lista + admin | `localhost:3000`, `127.0.0.1:9099` (7×), `localhost:3002`, `va.vercel-scripts.com` (script de dev do Vercel Analytics, pré-existente) |
| `web` (3001), login | `localhost:3001`, `127.0.0.1:9099` (10×) — **zero** externo |

`securetoken.googleapis.com` **não** foi contatado: o `connectAuthEmulator` redireciona também a renovação
de token. Nenhum `*.googleapis.com` real em nenhum dos dois.

### Uma razão estrutural que o plano não creditou

`pnpm emulators` roda com `--project demo-next-boilerplate` e o `firebase-tools` responde:

> *"Detected demo project ID … attempts to access non-emulated services for this project will fail."*

Como o Google nunca emite um id `demo-`, **um vazamento para o projeto real falharia alto**, não em
silêncio. Isso reduz muito a gravidade do modo de falha silencioso — exceto onde o id do projeto não entra
na conta, que é exatamente o caso do bucket do Storage (S1).

---

## 3. Achados

| # | Sev | Onde | Problema | Ação |
|---|-----|------|----------|------|
| S1 | 🔴 | `apps/api/(shared)/lib/storage.ts:23` | **Único vazamento real para projeto de verdade.** Cloud Storage não é emulado e não era travado: com os hosts do emulador preenchidos e um bucket ainda preenchido (**o estado exato do `.env` atual do usuário**), `POST /files` faz `bucket().file().save()` **antes** de assinar a URL — o objeto entra num bucket **real**, via ADC, e mesmo que a assinatura falhe depois o objeto já está lá | **corrigido** |
| S2 | 🟡 | `apps/app/proxy.ts:63` | Comentário justificava o `frameSrc` com "account-chooser **no popup**". Medi: o popup não é o mecanismo — o SDK carrega um **iframe** `/emulator/auth/iframe` em `127.0.0.1:9099`. O comentário nomeava o mecanismo errado numa linha que afrouxa política de segurança | **corrigido** (e o `frameSrc` fica **justificado por medição**) |
| S3 | 🟡 | `docs/SETUP.md:117` | Lista 3 portas do emulador; o `emulators:start` também reserva **4400**, **4500** e **9150**, não configuráveis. Omissão contradiz a própria armadilha "porta ocupada derruba tudo" logo abaixo | **corrigido** |
| S4 | 🟡 | `docs/.../analyze/plan.md:939` | §14-P1 afirmava "JDK 11+" e dava `openjdk 17.0.13` como ✅ **presente e suficiente**. As duas coisas são falsas (D1). `SETUP.md`, os três `.env.example`, `STATE.md` e o handoff já diziam 21+; só o plano ficou mentindo com cara de checklist | **corrigido**, preservando o texto original tachado (o erro é parte do histórico) |
| S5 | 🟢 | 9× `vitest.config.mts` | O mesmo comentário de 4 linhas copiado 9 vezes | **não corrigido** — não há preset de vitest compartilhado neste repo; hoistar é refactor maior que o próprio item. Fica como primeiro candidato se um preset nascer |
| S6 | 🟢 | `specs/firebase-emulator-seed.md` | Continua `proposed` no `BACKLOG.md`. Correto: a auditoria rodou **antes** da implementação | **não corrigido** — é o próximo `/spec --sync` que move a spec para `docs/features/firebase-emulator-seed/spec.md` |

### Correções aplicadas

| Arquivo | O que mudou |
|---|---|
| `apps/api/(shared)/lib/storage.ts` | `isStorageConfigured()` passa a ser `Boolean(bucket) && !isEmulated()` + import de `@repo/auth/emulator`. Fecha **de uma vez** as três portas (`POST /files`, `entity-photo`, `account-avatar`), porque as três já passavam por esse mesmo predicado |
| `apps/app/proxy.ts` | Comentário do `frameSrc` reescrito para o mecanismo medido (iframe de relay, não popup) |
| `docs/SETUP.md` | Portas 4400/4500/9150 na lista; armadilha nova de upload desligado sob o emulador |
| `apps/api/.env.example` | Nota em `FIREBASE_STORAGE_BUCKET`: ignorado enquanto os hosts do emulador estiverem preenchidos |
| `docs/.../analyze/plan.md` | §14-P1 corrigida (JDK 21+), com o texto errado tachado em vez de apagado |

⚠️ **S1 é mudança de comportamento**: emulando, upload de imagem fica desligado e o formulário cai no campo
de URL da foto. É a degradação que o produto **já** tem para "sem bucket", com `error.code` e i18n
existentes — zero chave nova. Reverter é apagar `&& !isEmulated()`.

---

## 4. Raio de impacto

`packages/sdk` **não foi tocado** — nenhum DTO, nenhuma action, nenhum contrato. Zero chave de i18n nova,
zero `error.code` novo ⇒ `apiErrors` intacto e teste de paridade não afetado.

| Mudança | Consumidores |
|---|---|
| `packages/auth/emulator.ts` (módulo novo) | `packages/auth/server.ts`, `packages/auth/client.ts`, `apps/api/(shared)/lib/firebase-identity-toolkit.ts`, `apps/api/(shared)/lib/storage.ts` (meu) — **os 4 importadores de produção, todos verificados em uso** |
| `packages/auth/server.ts` (ramo `isEmulated()`) | toda leitura autenticada dos 3 apps. Verificado nos dois modos |
| `isStorageConfigured()` | `files/route.ts`, `entity-photo.ts`, `account-avatar.ts` |
| `frameSrc` dos dois proxies | forma do array mudou; valor em modo degradado **idêntico** ao anterior — confirmado no servidor real (§5) |

**Nenhum import fantasma.** `pnpm check` cobre `noUndeclaredVariables` nos 514 arquivos e ficou verde —
é justamente o detector dessa classe de erro. Aliás, o hook de format **me pegou uma vez**: removeu o
`import { isEmulated }` entre duas edições minhas, o `pnpm check` acusou, foi reposto.

---

## 5. Reverificação independente do modo degradado — **sem regressão**

`.env` reais do usuário restaurados (backup + `diff` byte a byte: idênticos), `grep -c EMULATOR` = **0** nos
três, `api` e `app` reiniciados.

| # | Verificação | Resultado |
|---|---|---|
| D1 | Os apps sobem | ✅ `api` e `app` respondem |
| D2 | `connect-src` volta ao anterior | ✅ `'self' localhost:3002 identitytoolkit securetoken` — **zero** `127.0.0.1` na política inteira |
| D3 | **`frame-src` volta ao anterior** (o risco do desvio D3) | ✅ exatamente `https://next-boilerplate-576d0.firebaseapp.com`, valor único — igual ao que `firebaseAuthOrigin ? [x] : []` produzia |
| D4 | `img-src` volta a nomear `storage.googleapis.com` | ✅ (Storage reativado fora do emulador — confirma que S1 não afeta o modo real) |
| D5 | O navegador volta ao Google real | ✅ `POST https://identitytoolkit.googleapis.com/…?key=AIza…` → **400** |
| D6 | A página sobrevive ao erro | ✅ formulário íntegro, sem 500, sem tela branca (screenshot `06`) |
| D7 | Servidor **não** sonda mais ADC | ✅ **nenhuma** `metadata.google.internal` — confirma que o ramo do `cert()` é mesmo o que roda |

**Lacuna que permanece** (herdada, não reprovação): não existe verificação de um **login degradado
bem-sucedido** — exigiria senha de conta real, e criar uma polui o projeto real, que é o que esta feature
existe para evitar. O que está provado é que a rota de rede, a chave, o CSP e o tratamento de erro voltam
ao estado anterior. O único trecho não exercitado é "credencial válida ⇒ sucesso", que é comportamento do
Firebase, não nosso.

---

## 6. Validação visual e funcional

`agent-browser`, **estritamente em sequência**. Screenshots em `review/screenshots/` (gitignored).

| Arquivo | O que mostra |
|---|---|
| `01-entities-dark.png` | lista com os 4 `entity` semeados, **dark** |
| `02-entities-light.png` | a mesma lista em **light**, com `Retired Unit` de switch desligado (`enabled: false` do seed) |
| `03-entities-mobile.png` | 390×844, tabela com scroll horizontal, sem quebra |
| `04-admin-users-light.png` | `/admin/users` com os 3 perfis e papéis corretos |
| `05-web-signed-in-light.png` | **`apps/web` logada contra o emulador** |
| `06-degraded-real-firebase.png` | sign-in no modo degradado, página íntegra |

### Travas, re-executadas por mim

| Trava | Resultado |
|---|---|
| T1 — sem hosts | exit 1, recusa antes de `initializeApp` |
| T5 — `VAR=""` | exit 1 (string vazia lê como ausência) |
| T2 — project id real (`next-boilerplate-576d0`) | exit 1 |
| T3 — `create-dev-admin` sem host de emulador e sem flag | exit 1 |
| Flag antes dos posicionais | ✅ criou `x@y.com`, não leu a flag como e-mail |
| `pnpm --filter api create-dev-admin --allow-real-project …` | ✅ o pnpm encaminha a flag (a linha do `SETUP.md` funciona) |
| **Idempotência** | rodei `pnpm seed` 2× e consultei os emuladores direto: **3 contas, 3 perfis, 6 entities**. O wipe também apagou a conta de teste que eu tinha criado |

### Três lacunas do handoff que eu fechei

| Lacuna | Resultado |
|---|---|
| **A2 — `apps/web` nunca exercitada** | ✅ **fechada.** Subi a 3001: a sessão compartilhada minta no `app` é lida pela `web` (SSO cross-app funciona sob o emulador), e um login completo na `web` fez **10 chamadas ao 9099 e zero externas** |
| **Posse (404)** | ✅ **fechada.** Logado como `user@example.com`, abri pela URL um `entity` de `user2@example.com` ⇒ **"Página não encontrada"** |
| **A1 — Google contra o emulador** | 🟠 **parcial, e rendeu dois fatos** (abaixo) |

#### A1, em detalhe — o que o `frameSrc` realmente faz

Cliquei em "Continuar com Google". O popup abre em
`127.0.0.1:9099/emulator/auth/handler` (*Auth Emulator IDP Login Widget*) e o SDK carrega
`127.0.0.1:9099/emulator/auth/iframe`. Ou seja:

1. **O `frameSrc` está certo e agora é justificado por medição** — existe iframe, e ele vem da origem do
   emulador. O que estava errado era só o comentário (S2).
2. 🟠 **Fato novo: o fluxo do Google não é offline.** Mesmo contra o emulador, o navegador busca
   `apis.google.com` (o loader `gapi`, já permitido no `script-src`) e o widget do emulador puxa
   `unpkg.com` e `fonts.gstatic.com`. **A promessa "funciona sem internet" vale para e-mail+senha, não
   para o botão do Google.** Não é vazamento (nenhum dado de auth sai; a autenticação em si fica no 9099),
   mas contradiz a leitura literal do `SETUP.md`.

Não consegui fechar o round-trip (o popup não devolveu ao opener) — sem violação de CSP e sem erro de auth
no console, o que aponta para artefato do CDP (`window.opener` sob automação), não defeito do produto.
**Classificar como não verificado, não reprovar.**

---

## 7. Decisões em aberto (para o usuário)

| # | Decisão | Recomendação |
|---|---|---|
| A | **UI do emulador: 4001 ou 4000?** Confirmei o motivo empírico do desvio: a 4000 está mesmo ocupada nesta máquina, por `pagamentos10/san-diego` (PID 23456), processo de longa duração de **outro workspace** | **Manter 4001.** A 4000 é convenção, mas o custo dos dois lados é assimétrico: 4001 custa uma surpresa documentada; 4000 custa `emulators:start` abortando **inteiro** — derrubando Auth e Firestore junto — sempre que a porta estiver tomada, e 4000 é das portas mais disputadas num laptop de dev. A UI é opcional; Auth e Firestore não |
| B | **`--allow-real-project` quebra o fluxo do `SETUP.md:199-220`** | **Manter.** Verifiquei que a recusa é clara, ensina a saída e que o `pnpm` encaminha a flag. O script redefine a senha de conta existente — num projeto real isso é irreversível. Reverter são ~4 linhas |
| C | **S1 desliga upload sob o emulador** | **Manter.** A alternativa é gravar objeto real num bucket real achando que está offline. Se preferir o comportamento antigo, é apagar `&& !isEmulated()` |
| D | **Branch `madison`** — fora do padrão e com três assuntos | **Reutilizar e abrir PR daqui.** Separar em três branches exigiria replay dos commits; o plano de commits já separa os três assuntos de forma legível na PR |
| E | **JDK 21 no `PATH`** — o `java` default da máquina segue 17 | Config de máquina, decisão sua. Está documentada no `SETUP.md`. Eu rodei tudo com `JAVA_HOME=/opt/homebrew/opt/openjdk@21` |

---

## 8. Lacunas de teste (para o `/test`)

1. 🔴 **`isStorageConfigured()` sob o emulador** — a correção S1 **não tem teste**. É o caso mais óbvio a
   cobrir: `FIREBASE_STORAGE_BUCKET` preenchido + host de emulador ⇒ `false`; sem emulador ⇒ `true`.
2. 🟠 **Estado misto de env** (servidor emulando, navegador não) — o sintoma que o `SETUP.md` promete.
3. 🟠 **`create-dev-admin --allow-real-project` com service account real** — caminho de escrita em projeto
   real, deliberadamente não exercitado por ninguém.
4. 🟢 **Primeira subida em máquina limpa** (`git clone` + `pnpm install`) e primeira execução offline (P2).
5. 🟢 **Google + emulador**: round-trip completo fora de automação CDP.

---

## 9. Gates

| Comando | Resultado |
|---|---|
| `pnpm check` | ✅ 514 arquivos, 0 erro (**com** minhas correções) |
| `pnpm turbo run lint typecheck test --force` | ✅ **23/23**, sem cache, 2m51s |
| Paridade de i18n | ✅ verde no gate; **não afetada** (zero chave nova) |
| `pnpm install --frozen-lockfile` | ✅ lockfile coerente com o `package.json` (`firebase-tools@15.30.1`) |
| Varredura de segredo no diff + artefatos | ✅ nada. A única credencial é `demo1234`, proposital e só emulada |
| Resíduo no working tree | ✅ nenhum; os `*-debug.log` do emulador são pegos pelo `.gitignore` novo |

---

## 10. Plano de commits proposto

Três assuntos, **não** misturados. Ordem de dependência: `packages` → `apps/api` → `apps/app`/`apps/web` →
docs. Artefatos do fluxo por último.

> ⚠️ **`docs/PRE-PRODUCTION.md` pertence aos TRÊS assuntos** e exige `git add -p`. São exatamente 3 hunks,
> um por commit:
> | hunk | conteúdo | vai para |
> |---|---|---|
> | `@@ -51` | nota *"o emulador chegou; a suíte de rules, não"* | commit **12** (feature) |
> | `@@ -197` | reescrita do §8: o `testTimeout` deixou de ser preventivo e virou bloqueante medido | commit **13** (higiene) — é a **evidência** daquela mudança |
> | `@@ -217` | contas de QA acumuladas (PR #11 e #12) | commit **1** (auditoria) |

### Assunto A — auditoria de backlog (`/spec --sync`)

| # | Mensagem | Arquivos |
|---|---|---|
| 1 | `docs(specs): reconcile the backlog with the delivered code` | `specs/BACKLOG.md`, `specs/account-security-mfa.md`, `specs/audit-log.md`, `specs/billing-subscription.md`, `specs/cookie-consent.md`, `specs/cursor-pagination.md`, `specs/dashboard-home.md`, `specs/data-rights-lgpd.md`, `specs/e2e-testing.md`, `specs/firebase-emulator-seed.md`, `specs/observability-logging.md`, `specs/onboarding-flow.md`, `specs/teams-organizations.md`, `docs/PAYMENTS.md`, **`docs/PRE-PRODUCTION.md` — só o hunk `@@ -217`** |
| 2 | `docs(features): retire the account-settings spec into its feature folder` | `specs/account-settings.md` → `docs/features/account-settings/spec.md` (**rename já staged**), `docs/features/account-settings/STATE.md` |

### Assunto B — a feature

| # | Mensagem | Arquivos |
|---|---|---|
| 3 | `feat(auth): single source of truth for emulator targeting` | `packages/auth/emulator.ts`, `packages/auth/package.json`, `packages/auth/__tests__/emulator.test.ts` |
| 4 | `feat(auth): run the Firebase SDKs against the emulators when configured` | `packages/auth/server.ts`, `packages/auth/client.ts` |
| 5 | `chore: add firebase-tools and the emulator scripts` | `package.json`, `pnpm-lock.yaml`, `firebase.json`, `.gitignore` (⚠️ `package.json` + `pnpm-lock.yaml` **no mesmo commit**, senão `--frozen-lockfile` reprova no CI) |
| 6 | `feat(api): route the Identity Toolkit calls through the emulator` | `apps/api/(shared)/lib/firebase-identity-toolkit.ts`, `apps/api/__tests__/firebaseIdentityToolkit.test.ts` |
| 7 | `fix(api): keep Cloud Storage out of an emulated stack` | `apps/api/(shared)/lib/storage.ts` |
| 8 | `feat(api): seed the emulators and bootstrap the first admin` | `apps/api/scripts/emulatorTarget.mjs`, `apps/api/scripts/seed-emulator.mjs`, `apps/api/scripts/create-dev-admin.mjs`, `apps/api/package.json`, `apps/api/__tests__/emulatorTarget.test.ts` |
| 9 | `feat(app): allow the emulator origin in the content security policy` | `apps/app/env.ts`, `apps/app/proxy.ts`, `apps/app/__tests__/securityPolicySources.test.ts` |
| 10 | `feat(web): allow the emulator origin in the content security policy` | `apps/web/env.ts`, `apps/web/proxy.ts` |
| 11 | `chore: point the example environments at the emulators` | `apps/api/.env.example`, `apps/app/.env.example`, `apps/web/.env.example` |
| 12 | `docs(setup): document the emulator as the default local path` | `docs/SETUP.md`, **`docs/PRE-PRODUCTION.md` — só o hunk `@@ -51`** |

### Assunto C — higiene separada

| # | Mensagem | Arquivos |
|---|---|---|
| 13 | `test: raise the vitest timeout so scheduling delay stops failing suites` | as **9** `vitest.config.mts` (`apps/api`, `apps/app`, `apps/web`, `packages/auth`, `packages/email`, `packages/internationalization`, `packages/payments`, `packages/security`, `packages/shared`), **`docs/PRE-PRODUCTION.md` — só o hunk `@@ -197`** |

### Artefatos do fluxo — por último

| # | Mensagem | Arquivos |
|---|---|---|
| 14 | `docs(features): firebase-emulator-seed` | `docs/features/firebase-emulator-seed/STATE.md`, `analyze/plan.md`, `develop/handoff.md`, `review/review.md` (os `screenshots/` são gitignored e **não** entram) |

**Título de PR sugerido**: `feat: run the whole stack against the Firebase emulators, with a seeded first admin`

⛔ Eu **não** commitei e **não** pushei. Depois do último commit aprovado, o orquestrador deve **perguntar**
se sincroniza com `git push -u origin madison`.

---

## 11. Commits realizados

_(em branco — preenchido pelo orquestrador do `/review` após os commits aprovados)_
