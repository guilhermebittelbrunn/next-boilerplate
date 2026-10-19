---
slug: admin-archive-access-revocation
title: Arquivar um usuário pelo admin tira o acesso dele
task: -
spec: none (achado BACKLOG)
branch: fix/admin-archive-access-revocation (proposta; atual guilhermebittelbrunn/cycle-v3, inválida)
epic: -
updated: 2026-10-19 17:15
---

# Pipeline: arquivar um usuário pelo admin tira o acesso dele

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-19 15:40 | analyze/plan.md | `DELETE /users/[id]` desativa a conta no Auth e revoga as sessões depois do billing e antes do soft delete (falha vira 503 `USERS_DELETE_AUTH_FAILED`, novo); `getMergedUser*` não recria perfil para uid com perfil arquivado e desativa a conta legada no primeiro contato; `/auth/sign-in/google` responde 404 `USERS_NOT_FOUND` sem perfil; só `apps/api` + 1 código em `apiErrors`; testes de unidade; sem env e sem infra |
| develop | done    | 2026-10-19 15:54 | develop/handoff.md | `revokeAccountAccess` no `DELETE` (503 `USERS_DELETE_AUTH_FAILED`) e em `findOrCreateProfile` do `user-merge`; 404 no Google; código nos 3 idiomas; +16 testes de unidade (api 103 arquivos/1320 testes, i18n 67), check e typecheck limpos; T4 reforçado para cair na reversão |
| review  | in-progress | 2026-10-19 17:05 | review/review.md | rodada 2 (pós-`/test`): `googleSignInApi.ts` desloga o usuário do popup quando a API recusa a conta (CA8 Google, CA13), +5 testes, reversão derruba 2; check 934, app typecheck ok; 4 achados novos e 1 ampliado no `BACKLOG.md`; branch proposta `fix/admin-archive-access-revocation`; 7 commits propostos |
| test    | done    | 2026-10-19 17:15 | test/report.md  | 2 rodadas no emulador; F0 confirmado no `4eeb07b` (1→2 perfis, `/auth/me` 200); loader preso do Google legado corrigido no `/review` e re-medido ✅ (entrada e cadastro); CA1–CA13 ✅, Stripe e falha persistente do lockout 🔒; +1 teste de emulador (5); api 1320, emulador 191, app 924, `pnpm test` raiz exit 0 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec: achado 🟡 de `specs/BACKLOG.md:1543`, indicado pela auditoria como próxima tarefa
  direta (`specs/BACKLOG.md:276-300`). Plano feito em rodada autônoma do `/cycle`; as quatro perguntas da §11
  já vêm com a opção adotada e as oito decisões da §12 com a alternativa descartada.
- O `/test` começa pela medição do defeito no código anterior (F0, §8), que o backlog pede antes da correção.
- Sem mudança em `packages/sdk`, `apps/app`, `apps/web` ou `packages/auth`; sem env nova; pré-requisitos
  manuais de infraestrutura: nenhum.
- Fora do corte: restaurar usuário arquivado (não existe hoje) e revogar o acesso de quem já ganhou um perfil
  novo pelo defeito (§11, P2).
