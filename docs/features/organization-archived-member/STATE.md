---
slug: organization-archived-member
title: O membro arquivado deixa de contar na organização
task: -
spec: none (achado BACKLOG)
branch: api/fix/organization-guardrails (a mesma de organization-guardrails; proposta, a criar com `git switch -c` na aprovação dos commits)
epic: -
updated: 2026-10-23 17:49
---

# Pipeline: o membro arquivado deixa de contar na organização

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-23 17:34 | analyze/plan.md | `ownsOrganizationWithMembers` passa a contar só vínculos de outras pessoas com perfil vivo (`userRepository.findById` em paralelo; arquivado ou ausente vira `null`); o dono sozinho não gera leitura de perfil; rotas, SDK, i18n e docs intactos; prova em 3 casos novos e 2 asserções no teste unitário do helper; sem emulador, sem browser, sem infra |
| develop | done    | 2026-10-23 17:38 | develop/handoff.md | helper filtra vínculos de perfil arquivado/ausente via `userRepository.findById` em paralelo; 3 casos novos + 2 asserções; api 1646/1646, typecheck e `pnpm check` limpos; mutação derruba o caso do arquivado; sem desvio |
| review  | done    | 2026-10-23 17:52 | review/review.md | Nenhum 🔴/🟡; leitura confirma a regra nos dois consumidores (dono sozinho, arquivado, órfão, falha de leitura = 500 antes de qualquer escrita); 🟢 aceite de convite ainda conta o arquivado (backlog); âncora do helper corrigida em `docs/SECURITY.md:40`; `pnpm check` 1047 limpo, typecheck api ok; mesma branch e PR de `organization-guardrails`, plano de 9 commits sem commit feito |
| test    | done    | 2026-10-23 17:49 | test/report.md | 8/8 ✅; teste de rota novo (`organizationOwnerExitArchivedMember.test.ts`, 6 casos, helper real) confirma os itens 1-2 do review; mutações A e B derrubam 3 casos cada, helper restaurado (shasum igual); api 1652/1652, `pnpm test` raiz 15/15 (4024 testes), `pnpm check` 1048 limpo; sem browser (diff sem UI); sem dado de QA |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: recomendação "A próxima: tarefa direta `organization-archived-member`" de
  `specs/BACKLOG.md:225-256`. Fecha o 🟡 "Um perfil arquivado pelo admin continua contando como membro da
  organização" (`specs/BACKLOG.md:1439`), que o `/review` de `organization-guardrails` deixou para o backlog.
- Rodada autônoma do `/cycle`: as quatro perguntas da §11 do plano já vêm com a opção adotada.
- Escopo de arquivos: `apps/api/(shared)/lib/organization-membership.ts` e
  `apps/api/__tests__/organizationMembership.test.ts`. Nenhum dos dois aparece no `git status` de 2026-10-23 17:34, e
  nenhum arquivo da tarefa `organization-guardrails` (sem commit) nem da auditoria do backlog é tocado.
- Sem superfície de UI: o `/test` roda as suítes e a mutação da §7 do plano, sem `agent-browser`.
- Pré-requisitos manuais de infra: nenhum.
- Três achados novos para o backlog, fora do escopo (§12 do plano): o aceite de convite ainda conta o membro
  arquivado; os convites pendentes de um dono arquivado continuam aceitáveis; os quatro documentos da recusa podem
  dizer que perfil arquivado não conta.
- `specs/BACKLOG.md` não é editado aqui: fechar o achado é do `/spec --sync`.
- O índice git tem um `git mv` da auditoria (`specs/teams-organizations.md` →
  `docs/features/teams-organizations/spec.md`) que não pertence a esta tarefa; este passo não mexeu nele.
