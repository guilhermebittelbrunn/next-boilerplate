---
slug: storage-emulator-rules-tests
title: Emulador de Cloud Storage e testes das security rules
task: -
spec: storage-emulator-rules-tests
branch: feat/storage-emulator-rules-tests
epic: -
updated: 2026-09-28 15:18
---

# Pipeline — Emulador de Cloud Storage e testes das security rules

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-28 14:14 | analyze/plan.md | Storage emulado quando `FIREBASE_STORAGE_EMULATOR_HOST` existe (bucket demo, URL de caminho sem assinatura porque `getSignedUrl` chamaria o IAM do Google); suíte Vitest em `apps/api` contra o emulador (upload, troca de avatar, dono errado, expurgo, rules do Firestore e do Storage) numa task `test:emulator` sem cache que o `pnpm test` e o `verify` rodam e o `build` não; flag e CSP do `apps/app` para o avatar local; 8 commits. |
| develop | done    | 2026-09-28 14:38 | develop/handoff.md | Storage emulado com bucket demo e URL sem assinatura; suíte `test:emulator` (119 testes: upload, troca de avatar, dono errado, expurgo, rules) quebra com as duas mutações `if true`; `turbo run test`, `coverage` e `build` seguem sem Java; flag + CSP no `apps/app`; `METADATA_SERVER_DETECTION=none` acrescentado depois de medir conexão ao metadata server. |
| review  | done    | 2026-09-28 15:05 | review/review.md | Nenhum bloqueante; `docs/SETUP.md` deixou de afirmar o tempo do `verify`, que ninguém mediu depois da mudança; branch `feat/storage-emulator-rules-tests` criada e validada; 10 commits aprovados e feitos. |
| test    | done    | 2026-09-28 15:18 | test/report.md  | 19 critérios: 18 ✅, 1 🔒 (`verify` no GitHub), 0 ❌; os 9 itens do `/review` medidos (mutações, seed intacto, recusa parcial, Ctrl-C sem Java órfão, guard de loopback, 0 conexão externa com contraprova, `pnpm e2e` 22/22, fluxo visual em 3 idiomas/light/dark/mobile); 51 testes novos de rules cobrindo o dono do recurso (`test:emulator` 119 → 170); achado anterior à feature: `ProfileDropdown.tsx:45` sem `alt`. |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`. As 11 decisões tomadas sem perguntar estão em §13 do plano,
  cada uma com a alternativa descartada, e as 4 perguntas em aberto em §14 já vêm com a opção adotada.
- Branch `feat/storage-emulator-rules-tests`, criada no `/review` a partir de `barcelona` (mesmo commit de `origin/main`); o nome passou na regex de `.claude/rules/git-commits.md`.
- O plano contraria a spec num ponto: ela dizia que `apps/app` não mudaria, mas sem a flag e a CSP o
  seletor de avatar nem aparece sob emulador e a imagem de `127.0.0.1:9199` é bloqueada (§5 do plano).
- O `build` não passa a depender dos testes contra emulador, apesar de a spec dizer "antes de todo
  `pnpm build`": a Vercel não tem Java. Registrado como pergunta 1 do §14.
- Pré-requisitos manuais em §12: JDK 21 no `PATH` (o `java` padrão desta máquina é 17; o 21 está em
  `/opt/homebrew/opt/openjdk@21/bin`), internet na primeira subida para baixar o JAR de rules do Storage
  (ainda não está no cache) e copiar as duas variáveis novas para os `.env` já existentes. Os `.env`
  locais desta máquina apontam para um projeto real e não devem ser editados.
- Continua 🔒 depois desta entrega, porque exige bucket real: objeto que não abre sem assinatura e
  expiração da URL.
- ⚠️ O working tree já tinha mudanças da auditoria do backlog (`specs/*`, `docs/features/brand-config/*`)
  que não pertencem a esta feature e têm commit próprio.
- O `/test` achou `review` ainda `in-progress` com os commits não feitos (nenhum commit da feature em `git log`). O orquestrador tratou o gate como liberado; `review` segue `in-progress` até alguém commitar.
