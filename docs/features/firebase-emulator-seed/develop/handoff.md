# Handoff — Emulador do Firebase, seed e primeiro admin

> Plano: [`analyze/plan.md`](../analyze/plan.md). Rodou em `/cycle` autônomo.
> **Nada foi commitado; nenhuma branch criada.** Working tree na branch `madison`.

---

## 1. Veredito dos riscos — medidos antes de construir

O plano manda tratar os riscos como hipótese a medir. Foi o que se fez, **antes** de escrever o seed.

### 🔴 `createSessionCookie` contra o emulador de Auth — **FUNCIONA** (medido)

Era a fundação sem plano B. Medido com um script descartável (`firebase-admin` contra o emulador de pé),
depois **reconfirmado de ponta a ponta no navegador**:

| Verificação | Resultado |
|---|---|
| Admin SDK `initializeApp` **sem service account nenhum** | ✅ |
| `createSessionCookie(idToken, …)` | ✅ cookie de 531 bytes |
| `verifySessionCookie(cookie, true)` (`checkRevoked`) | ✅ devolve o uid correto |
| `revokeRefreshTokens` → cookie rejeitado | ✅ `auth/session-cookie-revoked` |
| `createCustomToken` (bootstrap da SSO cross-app) | ✅ |
| Firestore admin write + query `deletedAt == null` | ✅ |
| Endpoints de wipe do emulador (auth + firestore) | ✅ 200 |

⚠️ **Uma medição inicial deu falso negativo e foi investigada em vez de reportada como falha.** Na primeira
passada, `revokeRefreshTokens` **não** invalidou o cookie. Causa: `tokensValidAfterTime` tem resolução de
**1 segundo**, e o cookie tinha sido mintado no mesmo segundo da revogação — `auth_time < validAfter` dá
falso na igualdade. Repetindo com 3 s de intervalo: `gap = 3s`, cookie **rejeitado** com
`auth/session-cookie-revoked`. É semântica do Firebase, **não** limitação do emulador — vale igual em
produção.

### 🟠 Caminho REST do emulador do Identity Toolkit — **CONFIRMADO** (medido)

O plano se marcava como possivelmente errado aqui. Está certo:
`http://<host>/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=<qualquer>` responde 200.
Confirmado para `signInWithPassword` e `signUp` antes de propagar às 5 chamadas.

---

## 2. Desvios do plano — **três**, todos por medição

### D1 🔴 **`firebase-tools` exige JDK 21+, não "JDK 11+"** (o plano e o prompt estavam errados)

O plano (§8.11, §14-P1) e o prompt do orquestrador afirmavam "Java (JDK 11+)" e davam o Java 17 desta
máquina como suficiente. **Não é.** `firebase-tools@15.30.1` aborta antes de subir qualquer emulador:

```
Error: firebase-tools no longer supports Java version before 21.
```

É um teto rígido (`MIN_SUPPORTED_JAVA_MAJOR_VERSION = 21` em
`node_modules/firebase-tools/lib/emulator/commandUtils.js`), sem variável de escape.

**O que fiz**: instalei `openjdk@21` via **fórmula** do brew (keg-only — **não** mexe no `java` padrão do
sistema, que continua 17) e rodei os emuladores com `JAVA_HOME` apontado para ele. Corrigi o pré-requisito
para **JDK 21+** no `docs/SETUP.md` e nos três `.env.example`.

⚠️ **Pendência para o usuário**: o `java` default desta máquina **continua 17**. Quem rodar `pnpm emulators`
num shell limpo vai ver o mesmo erro até pôr o JDK 21 no `PATH`. Está documentado no `SETUP.md`, mas é
configuração de máquina que eu não devo fazer de forma permanente.

### D2 🟠 **Porta da UI do emulador: 4001, não 4000**

O plano escolheu 4000 (default do Firebase). **Medi que 4000 está ocupada nesta máquina** — por outro
workspace do Conductor (`pagamentos10/san-diego`), um processo de longa duração. E o modo de falha é ruim:
a UI não subir **aborta o `emulators:start` inteiro**, derrubando Auth e Firestore junto, que são o que
importa. Ou seja, o comando principal da feature falharia de cara na máquina do usuário.

Segui `.claude/cycle-policy.md` §3 ("defeito encontrado no caminho, corrija") e usei **4001** (medida como
livre). Documentado no `SETUP.md`, incluindo como trocar.

### D3 🟡 **`frameSrc` também recebe a origem do emulador**

O plano deixava o login com Google fora do corte (§15-4) e mencionava o `frameSrc` como "se for barato".
Foi barato — uma linha em cada proxy — então entrou. **Não testei o fluxo do Google contra o emulador**;
apenas removi o bloqueio de CSP que o impediria. Classificar como **não verificado**, não como entregue.

---

## 3. Blueprint → arquivos

| Item do plano | Arquivos |
|---|---|
| §8.1 predicado único | **novo** `packages/auth/emulator.ts`; `packages/auth/package.json` (export `./emulator`) |
| §8.2 C1 Admin SDK | `packages/auth/server.ts` (ramo `isEmulated()` antes da exigência de service account) |
| §8.3 C2 Client SDK | `packages/auth/client.ts` (`EMULATOR_CONFIG`, `connectAuthEmulator` dentro de `getAuthClient`) |
| §8.4 C3 Identity Toolkit | `apps/api/(shared)/lib/firebase-identity-toolkit.ts` (`base()` + fallback de API key; 5 chamadas) |
| §8.5 C4 CSP | `apps/app/env.ts`, `apps/app/proxy.ts`, `apps/web/env.ts`, `apps/web/proxy.ts` |
| §8.6 emuladores | `firebase.json` (UI em **4001**, ver D2) |
| §8.7 scripts raiz | `package.json` (`emulators`, `seed`, devDep `firebase-tools@15.30.1`) |
| §8.8 travas | **novo** `apps/api/scripts/emulatorTarget.mjs` |
| §8.9 seed | **novo** `apps/api/scripts/seed-emulator.mjs`; `apps/api/package.json` (script `seed`) |
| §8.10 primeiro admin | `apps/api/scripts/create-dev-admin.mjs` (estendido, `ensureAuthUser`/`ensureAdminProfile` intactos) |
| §8.11 env | `apps/api/.env.example`, `apps/app/.env.example`, `apps/web/.env.example` |
| §8.12 gitignore | `.gitignore` |
| §8.13/§8.14 docs | `docs/SETUP.md`, `docs/PRE-PRODUCTION.md` (nota do §1) |
| §9 testes | **novos** `packages/auth/__tests__/emulator.test.ts`, `apps/api/__tests__/emulatorTarget.test.ts`, `apps/api/__tests__/firebaseIdentityToolkit.test.ts`; **estendido** `apps/app/__tests__/securityPolicySources.test.ts` |
| §13 item separado | as **9** `vitest.config.mts` (`testTimeout: 20_000`) |

**Contrato**: `packages/sdk` **não foi tocado** — nenhum DTO, nenhuma action.
**i18n**: **zero** chave nova, **zero** `error.code` novo ⇒ `apiErrors` intacto, paridade não afetada.

---

## 4. O que **medi** × o que **assumi**

### Medido (executado e observado)

| # | Afirmação | Como |
|---|---|---|
| M1 | 🔴 `createSessionCookie` + `verifySessionCookie(checkRevoked)` + revogação funcionam no emulador | script de sonda, tabela §1 |
| M2 | Caminho REST do emulador está correto | sonda + as 5 chamadas em uso no fluxo real |
| M3 | `pnpm emulators` sobe Auth + Firestore | subiu em ~10 s |
| M4 | `pnpm seed` popula 3 contas + 6 `entity` | saída do script |
| M5 | **Seed é idempotente** | rodado 2×; contagem depois: **3 contas Auth, 3 perfis, 6 entities** (sem duplicata) |
| M6 | **T1** (sem hosts) recusa | exit 1, nada escrito |
| M7 | **T5** (`VAR=""`) recusa — string vazia lê como ausência | exit 1 |
| M8 | **T2** (project id real) recusa | exit 1 |
| M9 | **T3** `create-dev-admin` contra projeto real sem flag recusa | exit **1** |
| M10 | `create-dev-admin` **contra o emulador sem service account e sem flag** funciona | criou admin + perfil |
| M11 | A flag não é lida como e-mail quando vem antes dos posicionais | testado com a flag na 1ª posição |
| M12 | **Login real no navegador** com `user@example.com` | sessão criada, redirect para `/pt-br` |
| M13 | Lista de `entity` mostra os 4 registros semeados, com tipos certos | tabela renderizada |
| M14 | **Área admin** com `admin@example.com` | auto-roteado para `/pt-br/admin`; `/admin/users` lista os **3** perfis com papéis corretos |
| M15 | **Zero chamada a `*.googleapis.com` real** | HAR: as 8 ocorrências de "googleapis" eram o prefixo de caminho do emulador em `127.0.0.1:9099` |
| M16 | **Fluxo completo com a rede FISICAMENTE desligada** | `networksetup -setairportpower en0 off`; `curl` externo = `000`; login + lista funcionaram |
| M17 | HAR do teste offline: **0 requisições a host externo real** | único externo: `va.vercel-scripts.com` (script de dev do Vercel Analytics, pré-existente, servido do cache) |
| M18 | Conexões de saída da API: **só `127.0.0.1:8080`** | `lsof -a -p <pid> -iTCP -sTCP:ESTABLISHED` |
| M19 | **Modo degradado**: os 3 apps sobem sem nenhuma var de emulador | `.env` reais restaurados; api e app = 200 |
| M20 | **Modo degradado**: navegador volta ao Google real | HAR: `POST https://identitytoolkit.googleapis.com/...` → **400** (credencial inválida, erro correto — **não** 500, **não** crash) |
| M21 | **Modo degradado**: CSP idêntico ao de antes | `connect-src` sem origem de emulador; `frame-src` só o `firebaseapp.com` real |
| M22 | Light + dark + mobile | screenshots §6 |
| M23 | Gate verde | `pnpm check` (514 arquivos, 0 erro) e `pnpm turbo run lint typecheck test --force` = **23/23**, sem cache |

### Assumido / **não** verificado — tratar como tal

| # | Item | Por quê |
|---|---|---|
| A1 | **Login com Google contra o emulador** | fora do corte (plano §15-4). Só liberei o `frameSrc`; **não exercitei o popup**. |
| A2 | **`apps/web`** — não subi o app 3001 | a mudança lá é simétrica à do `apps/app` e o CSP é **report-only** (não bloqueia). Não há fluxo de login próprio na `web` para exercitar. **O `/test` deveria cobrir.** |
| A3 | **Primeira execução exige internet** (P2) | os JARs baixaram aqui **com** rede. Não testei a primeira subida offline em máquina limpa — mas é certo que falha, e está documentado. |
| A4 | **`create-dev-admin --allow-real-project` com service account real** | passou a trava e parou em "Missing Firebase Admin credentials" porque **não forneci credencial real de propósito**. O caminho de escrita num projeto real **não foi exercitado** — deliberadamente. |
| A5 | **`pnpm --filter api build` sob emulador** | não tentado; o plano (§21-F) decidiu não consertar. Documentado como armadilha. |
| A6 | Máquina limpa (`git clone` + `pnpm install` do zero) | não simulado. |

---

## 5. Modo degradado — como foi verificado

Este era "a regressão mais cara". Método: **restaurei os `.env` reais do usuário** (backup em `/tmp`,
restaurado ao fim), confirmei `grep -c EMULATOR` = **0** nos três, reiniciei api + app e exercitei.

Resultado: **sem regressão.** M19–M21 acima. O ponto decisivo é o M20 — uma tentativa de login com conta
inexistente (`qa-degraded-check@example.com`) produziu `POST https://identitytoolkit.googleapis.com/…` com
**400**, ou seja o código voltou ao caminho real e devolveu erro de credencial, o comportamento de antes.

⚠️ **Não consegui verificar um login degradado bem-sucedido** — não tenho senha de conta real do projeto e
**não criei uma** (seria poluir o projeto real, exatamente o que esta feature existe para evitar). O que
está provado é que o caminho de rede e o CSP revertem corretamente e que o erro é tratado.

---

## 6. Validação visual

`agent-browser`, estritamente sequencial. Screenshots em `develop/screenshots/` (gitignored):

| Arquivo | O que mostra |
|---|---|
| `01-entities-dark.png` | lista com os 4 `entity` semeados, **dark** — inclui `Retired Unit` com o toggle **desligado** (o caso `enabled: false` do seed) |
| `02-entities-light.png` | a mesma lista em **light** |
| `03-entities-mobile.png` | viewport 390×844, tabela antd com scroll horizontal, sem quebra |
| `04-admin-users-dark.png` | `/admin/users` com os 3 perfis e os papéis corretos |
| `05-entities-offline.png` | a mesma lista **com o Wi-Fi desligado** |
| `06-degraded-real-firebase.png` | sign-in no modo degradado (Firebase real), página íntegra |

Nenhuma UI mudou nesta entrega — os screenshots servem de prova do fluxo, não de mudança visual.

---

## 7. Credenciais e dados de QA — para limpeza

✅ **Nenhuma conta foi criada em projeto Firebase real nesta rodada.**

| Conta | Onde | Precisa limpar? |
|---|---|---|
| `admin@example.com`, `user@example.com`, `user2@example.com` (senha `demo1234`) | **só no emulador** | ❌ não — é o seed, é o produto, e morre com o processo |
| `qa-emulator-seed@example.com` (senha `demo1234`) | **só no emulador**, criada ao testar M10 | ❌ não — some no próximo `pnpm seed` |
| `qa-degraded-check@example.com` | **nunca existiu** — usada só para provocar o 400 no modo degradado | ❌ não |

Nenhuma credencial de projeto real foi gravada em arquivo. A senha `demo1234` é documentada de propósito
(decisão §21-I do plano) e só existe em base emulada, garantido pelas travas T1/T2.

**Harness temporário removido**: os dois scripts de sonda (`apps/api/scripts/.emulator-probe*.mjs`) foram
apagados; `git status` está sem resíduo. Backups dos `.env` reais ficaram em `/tmp/env-backup/` e os
originais já foram restaurados.

---

## 8. Estado do gate

```
pnpm check                                   → 514 arquivos, 0 erro
pnpm turbo run lint typecheck test --force   → 23/23 tasks, 1m23s, sem cache
```

Suítes tocadas: `@repo/auth` 49 testes (4 arquivos) · `api` 333 testes (32 arquivos) ·
`app` 265 testes (36 arquivos). Paridade de i18n: **não afetada** (zero chave nova) e verde no gate.

⚠️ **`pnpm-lock.yaml` mudou** (devDep `firebase-tools@15.30.1`). Precisa entrar no mesmo commit do
`package.json`, senão `--frozen-lockfile` reprova no CI.

---

## 9. Item separado — `testTimeout`

`testTimeout: 20_000` nas **9** configs, com comentário autocontido (sem citar o fluxo). Nenhuma asserção
mudou, nenhum teste foi pulado, nenhum `.skip`. É mudança isolada dos arquivos da feature e tem commit
próprio (§12, commit 12).

---

## 10. Pendências e perguntas em aberto

1. **JDK 21 no `PATH` da máquina** (D1) — o `java` default aqui é 17. Instalei `openjdk@21` keg-only via
   brew; **não** alterei o default do sistema. Decisão do usuário se quer torná-lo permanente.
2. **Porta 4001 em vez de 4000** (D2) — desvio deliberado e reversível em uma linha do `firebase.json`.
   Se o usuário preferir a convenção do Firebase, é só trocar (e aceitar que `pnpm emulators` falha
   enquanto o outro workspace estiver de pé).
3. **`--allow-real-project` quebra um fluxo documentado** — o plano já marcava como o item mais discutível
   (§21-C). Implementado como planejado; reverter é apagar ~4 linhas.
4. **Storage continua fora** — `storage.rules` segue sem teste e sem publicação. Registrado em
   `PRE-PRODUCTION.md` §1 com a advertência de não ler "emulador entregue" como "rules testadas".
5. **`apps/web` não exercitado** (A2).

### Lacunas que o `/test` deve cobrir

- `apps/web` subindo contra o emulador (A2).
- Posse: logado como `user@example.com`, abrir pela URL um `entity` de `user2@example.com` ⇒ **404**. O seed
  foi desenhado para isso, mas **não exercitei**.
- Estado misto de env (servidor emulando, navegador não) — o sintoma prometido pelo `SETUP.md`.
- Login com Google no emulador (A1) — classificar **não verificado**, não reprovar.
