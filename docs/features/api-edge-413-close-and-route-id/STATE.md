---
slug: api-edge-413-close-and-route-id
title: Borda da API, conexão fechada no 413 e id inválido nas rotas [id]
task: -
spec: none (achados BACKLOG)
branch: api/fix/edge-413-close-and-route-id (proposta; a atual guilhermebittelbrunn/cycle-command-v6 não passa na regex e não foi renomeada)
epic: -
updated: 2026-10-20 12:39
---

# Pipeline: borda da API, conexão fechada no 413 e id inválido nas rotas `[id]`

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-20 11:51 | analyze/plan.md | `refuseTooLarge()` no `parseRequestJson` responde os dois 413 com `connection: close` (hipótese conferida no `send-response.js` do Next 16.0.0 e já medida numa variante em `next start`); `BaseRepository.findById` devolve `null` para id que `isUsableDocumentId` recusa, o que leva `entities/[id]` e `users/[id]` a 404 `ENTITY_NOT_FOUND`/`USERS_NOT_FOUND` sem mexer nas rotas; limite do id passa a ser 1 500 bytes UTF-8; só `apps/api` + `docs/SECURITY.md` e `AGENTS.md`; sem SDK, i18n, env ou infra |
| develop | done    | 2026-10-20 12:08 | develop/handoff.md | `refuseTooLarge()` e guarda em `findById` implementados como no plano; medido em `next start` + emulador: `a%2Fb` e `__x__` davam 500 e agora dão 404, 413 passou a fechar a conexão (20 → 0 sockets abertos); `.`/`..` nunca chegam ao handler por HTTP (critério a reler); suíte da api 1 453/1 453 |
| review  | done    | 2026-10-20 12:13 | review/review.md | sem achado 🔴/🟡 no diff; JSDoc de `isUsableDocumentId` corrigido para cobrir id de rota e o reservado recusado pelo servidor; todos os chamadores de `findById` tratam `null`; `Buffer.byteLength` ok (api só em Node); 2 achados fora do escopo para o backlog (`packages/auth/keys.ts:49-50`, `instrumentation.ts:63-67`); 11 itens em "Verificar no `/test`"; plano de 5 commits na branch proposta `api/fix/edge-413-close-and-route-id` |
| test    | done    | 2026-10-20 12:39 | test/report.md | 12 ✅, 0 ❌, 1 🔒 (Vercel); medido em `next start` + emulador: 50 × 413 `chunked` deixam 0 sockets aos 60 s (40 sem o header), 24/24 ids inválidos → 404, webhook com `profileId` inválido → 200; R1 derrubado (`fetch` do Node: 10/240 `ECONNRESET`/`EPIPE`) e `SECURITY.md` reescrito; api 1 455/1 455, `pnpm test` 15/15 com emulador; +2 testes de `decodeCursor` |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação de `specs/BACKLOG.md:230-249`, que junta os achados 🟡 de
  `specs/BACKLOG.md:1698` (conexão aberta depois do 413) e `:1721` (id com `%2F` nas rotas `[id]`). Rodada autônoma
  do `/cycle`: as quatro perguntas da §11 do plano já vêm com a opção adotada, e a §12 lista as decisões tomadas sem
  perguntar.
- O passo 0 do `/develop` mede o 500 de hoje com `curl` contra o emulador antes de corrigir (§10.6 do plano).
- O diff não tem UI: o `/test` mede em `next start` com `curl` e `fetch` do Node, sem `agent-browser` (§8 do plano).
- Pré-requisitos manuais de infra: nenhum. O comportamento na Vercel fica 🔒, sem pendência em `PRE-PRODUCTION.md`.
- `specs/BACKLOG.md` não é editado aqui: fechar os achados é do `/spec --sync`.
- O índice git tem um `git mv` da auditoria (`specs/in-app-notifications.md` → `docs/features/in-app-notifications/spec.md`)
  que não pertence a esta tarefa; este passo não mexeu nele.
