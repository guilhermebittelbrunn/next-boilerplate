---
slug: organization-guardrails
title: Travas da organização (arquivamento do dono, rate limit do convite e falha do Auth no convite)
task: -
spec: none (achados BACKLOG)
branch: api/fix/organization-guardrails (proposta; a criar com `git switch -c` na aprovação dos commits)
epic: -
updated: 2026-10-23 17:27
---

# Pipeline: travas da organização

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-23 17:04 | analyze/plan.md | `DELETE /users/:id` recusa dono com membros com `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS` (reaproveita `ownsOrganizationWithMembers`, antes de Stripe/Auth/soft delete); o proxy conta só o `POST` de `/organization/invitations` (mapa de exceção por método, lista de 17 caminhos intacta); falha do Auth ao conferir o convidado vira `503 ORGANIZATION_INVITATION_FAILED` com log sem endereço; dois códigos novos em `apiErrors`; só `apps/api`, i18n e docs; sem SDK, `apps/app`, env ou infra |
| develop | done    | 2026-10-23 17:13 | develop/handoff.md | `DELETE /users/:id` recusa dono com membros (`409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`), proxy conta só o `POST` de `/organization/invitations` (`RATE_LIMITED_METHODS`), falha na conferência do convidado vira `503 ORGANIZATION_INVITATION_FAILED`; 2 códigos nos 3 idiomas; âncoras de 5 docs; api 1643/1643, i18n 67/67, typecheck e `pnpm check` limpos |
| review  | done    | 2026-10-23 17:20 | review/review.md | Nenhum bloqueante e nenhuma correção; 🟡 perfil arquivado conta como membro em `ownsOrganizationWithMembers` e 🟢 variável de membros desligada travam o arquivamento do dono (backlog); `pnpm check` 1047 limpo, typecheck api ok, i18n 67/67; 7 commits propostos, sem commit feito |
| test    | done    | 2026-10-23 17:27 | test/report.md  | 14 critérios: 12 ✅, 0 ❌, 2 🔒 (429 real da Arcjet, falha real do Auth); mutação confirmada (5 falhas / 36 passando, código restaurado com o mesmo `shasum`); api 122/1643, i18n 7/67, typecheck api ok, `pnpm test` raiz 4015 testes com `test:emulator` 265; sem teste novo, sem browser (diff sem UI), sem dado de QA |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação "A próxima: tarefa direta `organization-guardrails`" de
  `specs/BACKLOG.md:211-245`. Fecha três achados da PR #57 registrados em `specs/BACKLOG.md:1350-1352`: D10 (admin
  arquiva dono com membros, D3 do `docs/features/teams-organizations/review/review.md`), D11 (rate limit conta a
  leitura da tabela de convites, D2 do mesmo `review.md`) e o `500` sem `error.code` quando o Auth falha no convite.
  Também fecha a lacuna de teste "`isMemberOfOrganization` com erro do Auth diferente de `user-not-found`" do mesmo
  `review.md`.
- Rodada autônoma do `/cycle`: as cinco perguntas da §11 do plano já vêm com a opção adotada, e a §12 lista as
  decisões tomadas sem perguntar.
- Sem superfície de UI nova: os códigos chegam às telas existentes pelo `FormattedError`. O `/test` roda as suítes e
  não usa `agent-browser` (§8 do plano).
- Pré-requisitos manuais de infra: nenhum. O `429` real depende de `ARCJET_KEY`, pendência que já existe.
- Achado novo para o backlog, fora do escopo: promover a admin o dono de uma organização com membros deixa a
  organização sem gestão, como o D10 (`users/[id]/route.ts:137-139`).
- `docs/SECURITY.md` já tem mudança da auditoria no working tree; o `/review` separa o que é de cada assunto.
- `specs/BACKLOG.md` não é editado aqui: fechar os achados é do `/spec --sync`.
- O índice git tem um `git mv` da auditoria (`specs/teams-organizations.md` →
  `docs/features/teams-organizations/spec.md`) que não pertence a esta tarefa; este passo não mexeu nele.
