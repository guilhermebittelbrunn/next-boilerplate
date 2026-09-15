---
slug: firebase-emulator-seed
title: Emulador do Firebase, seed e primeiro admin
task: -
spec: firebase-emulator-seed
branch: madison
epic: -
updated: 2026-09-15 17:15
---

# Pipeline — Emulador do Firebase, seed e primeiro admin

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-15 12:11 | analyze/plan.md | 5 itens do corte via 5 pontos de conexão (`emulator.ts` único predicado), seed wipe-and-repopulate em `apps/api/scripts/`, `firebase-tools` como devDep fixada da raiz, + item separado de `testTimeout`; 13 commits. |
| develop | done    | 2026-09-15 16:05 | develop/handoff.md | Corte inteiro entregue e medido: 🔴 `createSessionCookie` funciona no emulador, login+admin OK **com a rede desligada** e **zero** chamada a `*.googleapis.com`; modo degradado sem regressão; gate 23/23. 3 desvios (JDK **21+**, UI na porta 4001, `frameSrc`). |
| review  | done    | 2026-09-15 16:35 | review/review.md | Isolamento **reverificado por método independente** (hook em `net`/`dns` dentro dos processos, que enxerga tentativa e não só conexão estabelecida): bate com o handoff, e revelou o Admin SDK em modo ADC sob emulador ⇒ **1 vazamento real corrigido** (Cloud Storage gravava em bucket de verdade). Modo degradado sem regressão, incl. `frame-src`. Fechei 2 lacunas (`apps/web`, posse 404). Gate 23/23. 5 decisões para o usuário. |
| test    | done    | 2026-09-15 17:15 | test/criterios-aceite.md | **34 ✅ / 0 ❌ / 5 🔒.** A lacuna 🔴 do `/review` foi fechada: `storageEmulatorIsolation.test.ts` prova que sob emulador com bucket preenchido nada entra no bucket real — e **falha 7/13 contra o código pré-correção**, então não é teste vazio. +26 testes em 3 arquivos (storage, admin SDK, client SDK). Gate **23/23 sem cache em 3 execuções** (1m34s/1m19s/1m03s), `pnpm check` 517/0, `--frozen-lockfile` limpo: **o flake do `testTimeout` sumiu**. Validação executável completa (emulador+seed+3 apps, login, admin, posse 404, SSO cross-app, upload recusado ao vivo com bucket real no `.env`, estado misto). 3 observações não bloqueantes para o `/review` (§7). |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Rodando dentro de um **`/cycle` autônomo**: nada foi perguntado. As 10 decisões tomadas sem consulta
  estão em **§21 do plano**, cada uma com a alternativa descartada. As 3 perguntas em aberto da própria
  spec (`specs/firebase-emulator-seed.md:161-168`) já vinham respondidas e foram adotadas como estão:
  emulador é o default local, primeiro admin por comando explícito, estado reconstruído do seed.

- ⚠️ **Dependência nova, registrada de propósito**: `firebase-tools@15.30.1` como devDependency fixada da
  raiz. Conferido antes que **não** vem transitivamente (`grep -c firebase-tools pnpm-lock.yaml` ⇒ **0**;
  `node_modules/.bin` sem binário `firebase`) — o caminho que fez `file-upload-storage` sair com zero
  dependência nova não existe aqui: os emuladores são distribuídos só pela CLI. Justificativa e a
  alternativa `npx @latest` em **§7** e **§21-A**.

- ⚠️ **O risco número 1 é `createSessionCookie` contra o emulador de Auth** (§15-1). Toda a sessão do
  repo depende dele (`packages/auth/server.ts:214-222`, `:238-241`), e o session cookie é mintado nos
  **front-ends**, não na `apps/api`. Se não funcionar, o login inteiro cai e **não há plano B neste
  desenho**. O `/develop` deve medir isso **antes** de escrever o seed.

- ⚠️ **São 5 pontos de conexão com o Firebase** (§8.0, C1–C5) e cada um esquecido falha **em silêncio
  contra o projeto real** — nada quebra, só se escreve no lugar errado. As duas verificações que tornam
  isso detectável são obrigatórias: **rede desligada** (§10, passo 4) e **Network do DevTools sem nenhuma
  chamada a `*.googleapis.com`** (§10, passo 6). Sem elas a entrega não é verificável.

- **Pré-requisitos manuais de infra em §14.** O que o `/develop` não consegue satisfazer: runtime **Java**
  e o **download dos JARs na primeira execução, que exige internet**. Este último é a única promessa da
  spec (`:155`, *"sem rede"*) que o corte **não** cumpre integralmente — é honesto documentar "com rede uma
  vez, offline daí em diante". O `/test` classifica isso como *não verificado*, nunca reprovado.

- ⛔ **CORRIGIDO no `/develop`: o pré-requisito é JDK 21+, não "JDK 11+"/Java 17.** O plano (§8.11, §14-P1)
  e a nota anterior desta seção davam o `openjdk 17.0.13` desta máquina como suficiente. **Não é**:
  `firebase-tools@15.30.1` aborta com *"no longer supports Java version before 21"* (teto rígido em
  `MIN_SUPPORTED_JAVA_MAJOR_VERSION`, sem escape). O `/develop` instalou `openjdk@21` keg-only via brew
  para medir; **o `java` default da máquina continua 17**, então `pnpm emulators` num shell limpo ainda
  falha até o JDK 21 entrar no `PATH`. Detalhes no handoff (desvio D1).

- **Dois itens ficam declaradamente fora e não podem ser lidos como entregues**: a suíte de testes das
  security rules (fora do corte da spec) e o **emulador de Storage** — logo `storage.rules` continua
  deny-all sem teste e sem publicação depois desta entrega (§21-D; `docs/PRE-PRODUCTION.md:106`). O
  commit 11 acrescenta uma nota no `PRE-PRODUCTION.md` justamente para a próxima auditoria não confundir
  "emulador entregue" com "rules testadas".

- **Item extra, fora da spec, com commit próprio (§13)**: declarar `testTimeout: 20_000` nas **9** configs
  do Vitest (hoje nenhuma declara — medido). Motivo: `accountSecurityForm.test.tsx` estourou o teto
  default de 5000 ms em 1 de 4 rodadas; o pior teste isolado leva **285 ms** e sob contenção **7401 ms**
  (≈26×), porque `apps/app` monta 36 ambientes jsdom em paralelo. **Nenhuma asserção muda e nenhum teste
  é pulado** — não é afrouxar teste, é corrigir um teto calibrado para outra suíte. Compartilhar a config
  num pacote foi avaliado e descartado (18 arquivos contra 9, pacote novo para uma chave) — §13.4/§21-G.

- **`.github/workflows/ci.yml` e `turbo.json` não mudam** nesta entrega — nenhum teste novo sobe o
  emulador, então o CI não precisa de Java nem de cache de JAR. Isso vira pré-requisito de `e2e-testing`.

- ⚠️ **Atenção ao commitar**: o working tree já tinha mudanças não commitadas da auditoria de backlog
  (13 arquivos em `specs/`, `docs/PAYMENTS.md`, `docs/PRE-PRODUCTION.md`,
  `docs/features/account-settings/`), que têm commit próprio e **não** pertencem a esta feature.
  `docs/PRE-PRODUCTION.md` está nos **dois** conjuntos — o commit 11 vai precisar de `git add -p`.

- ⛔ **CORRIGIDO no `/review`: o Cloud Storage vazava para um bucket real sob o emulador.** O ponto cego
  não estava nos 5 pontos de conexão do §8.0 — estava fora deles. Sob o emulador, `packages/auth/server.ts`
  inicializa o Admin SDK **sem credencial**, e Auth/Firestore ficam imunes porque os `*_EMULATOR_HOST`
  curto-circuitam a autenticação. **Storage não é emulado e não tinha trava**: com um bucket ainda
  preenchido (o estado do `.env` real do usuário hoje), `POST /files` gravava o objeto num bucket **de
  verdade**, via Application Default Credentials, antes mesmo de tentar assinar a URL. `isStorageConfigured()`
  passou a exigir `!isEmulated()`. Detalhe e evidência no `review/review.md` §2 e §3-S1.

- ⚠️ **A promessa "funciona sem internet" vale para e-mail+senha, não para o botão do Google.** Medido no
  `/review`: mesmo contra o emulador, o fluxo do Google busca `apis.google.com` (loader `gapi`) e o widget
  do emulador puxa `unpkg.com` e `fonts.gstatic.com`. Não é vazamento — a autenticação em si fica no 9099 —
  mas contradiz a leitura literal do `SETUP.md`.

- ⚠️ **Achado do `/test`, não bloqueante: com o bucket preenchido sob o emulador a UI oferece um upload
  que a API vai recusar.** O servidor decide por `isStorageConfigured()` (que já inclui `!isEmulated()`);
  o cliente decide por `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, que não sabe nada sobre emulador. **Nada é
  escrito no bucket real** — confirmado ao vivo por `lsof` (a `api` só abriu `127.0.0.1:8080`) — mas o
  usuário escolhe o arquivo e só então recebe `STORAGE_NOT_CONFIGURED`. Isso também torna imprecisa a
  frase do `review.md` §3 *"o formulário cai no campo de URL da foto"*: isso só vale quando o bucket
  **também** está vazio, que é o default do `.env.example`. Decisão do usuário: espelhar `!isEmulated()`
  no cliente ou aceitar a recusa tardia.

- ⚠️ **Achado do `/test`, pré-existente e fora do diff: erro cru do SDK do Firebase chega à UI como copy.**
  No estado misto de env, o toast exibe `Firebase: Error (auth/api-key-not-valid...)`. A causa é
  `packages/shared/utils/helpers/formattedError.ts:49`, que cai em `error.message` para um `Error` que não
  é `AxiosError`. Contra a regra de ouro 3, mas nem introduzido nem tocado por esta entrega — esta apenas
  torna o estado alcançável por configuração.

- Esta spec é a **#1 do backlog** e a única elegível que desbloqueia outra (`specs/e2e-testing.md:10`).
  A spec segue em `specs/` — arquivá-la em `docs/features/firebase-emulator-seed/spec.md` é do
  `/spec --sync`, na entrega, não desta etapa.
