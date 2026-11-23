---
slug: delivery-security-review
title: "Core aprovado na parte 1 da entrega: fatia 1 (o que expõe hoje)"
task: -
spec: delivery-security-review
branch: feat/delivery-security-review
epic: -
updated: 2026-11-23
---

# Pipeline — Core aprovado na parte 1 da entrega (fatia 1)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-19 16:22 | analyze/plan.md | Fatia 1 em cinco itens independentes: dependências (`firebase-admin` ^13.10.0, `next` 16.4.6, `axios` ^1.21.1, `@arcjet/next` 1.16.0, override do `zod` para 4.6.7, preview de e-mail em devDeps, `@stripe/agent-toolkit` removido por não ter importador); orçamento padrão de 60/min por IP + sujeito em todo método mutável, com o estrito de 20/min ganhando troca/definição de senha e cobrança; `revokeUserSessionsOrThrow` em 5 rotas com `AUTH_SESSIONS_NOT_REVOKED` (novo) e `ACCOUNT_SESSIONS_REVOKE_FAILED`; `/auth/me` e os dois logins com allowlist de 5 campos; `poweredByHeader: false` no `next-config`. 12 decisões tomadas por padrão (Q1–Q12) |
| develop | done    | 2026-11-19 19:00 | develop/handoff.md | Cinco itens no working tree: `pnpm audit --prod --audit-level=high` de 8 críticas/120 altas para saída 0 (uma exceção escrita, `@grpc/grpc-js`); orçamento `standard` de 60/min por IP + sujeito em todo método mutável e estrito com 21 caminhos; `/auth/me` e os dois logins por allowlist de 5 campos; 5 rotas com revogação que responde 500; `poweredByHeader: false`. Arcjet 1.16 sem plano B |
| review  | done    | 2026-11-23 | review/review.md | Branch `feat/delivery-security-review` criada de `c9b4d9c` (regex OK). Rodada 1: nada bloqueante, uma correção de doc (`docs/SECURITY.md:180`). Rodada 2, defeitos do `/test`: redefinição de senha com `500 AUTH_SESSIONS_NOT_REVOKED` passa a mostrar o cartão de sucesso (`ResetPasswordForm.tsx` + `resetPasswordForm.test.tsx`, falha sem a correção); spec de equipe com seletor por role, causa provável o reload de `next dev` da 16.4.4 (#100619). Gates: `pnpm check` 1077, typecheck `app`+`e2e` 2/2. Plano de 17 commits |
| test    | done    | 2026-11-19 22:49 | test/report.md | Rodada 2: 15 ✅, 0 ❌, 1 🔒 (429 real sem `ARCJET_KEY`). Spec da equipe verde 3× e `pnpm e2e` completo 29/29; em produção "Convites pendentes" aparece 1× visível em 5 reloads. Redefinição com revogação falhando vira cartão de sucesso nos 3 idiomas (light, dark, 390×844), sem form nem toast; senha nova entra. `pnpm --filter app test` 136/1203 saída 0. Rodada 1: `pnpm test` da raiz saída 0 (15/15), `pnpm audit` saída 0 |
| observe | pending | -                | -               | - (opcional) |

## Notas

### Origem

- Spec `specs/delivery-security-review.md` (`status: approved`). Só a fatia 1; fatias 2 e 3 fora, como a
  spec recomenda. Não editar a spec: arquivá-la é do `/spec --sync`.
- Rodou em modo autônomo dentro do `/cycle`. Nenhuma pergunta feita; decisões em
  `analyze/plan.md` → "Perguntas em aberto (decididas por padrão)".

### Para o `/develop`

- O item de dependências segue um procedimento em quatro passos (`analyze/plan.md` §8): direta, depois
  re-resolução do lockfile, depois override com seletor dentro do major, depois exceção escrita. Registrar no
  handoff o `pnpm audit --prod` antes e depois.
- Plano B do Arcjet: se a 1.16 quebrar além de ajuste de tipo, voltar ao beta.13 e registrar `undici` como
  exceção.
- Nada de dependência nova. Nenhuma variável de ambiente nova.

### Pré-requisitos manuais de infra (não reprovam o `/test`)

- `ARCJET_KEY` em produção (já é o item 8 de `docs/PRE-PRODUCTION.md`). Sem ela os dois orçamentos são no-op.
- Conferir o plano do Arcjet contra o volume novo: o orçamento padrão consulta o Arcjet em toda requisição
  mutável.
- `pnpm e2e` verde depois das subidas (exige JDK 21 e browser).

### Do `/develop` para o `/review`

- A suíte da `api` passou com 126 arquivos e 1718 testes, mas a tarefa saiu 1 por "Timeout starting forks runner"
  sob load average acima de 20. Rodar `pnpm --filter api test` numa máquina sem carga para fechar com saída 0.
- `app` e `web`: 10 casos falharam por tempo (~25 s, load average 137) em arquivos não tocados; os 10 arquivos passaram
  ao rodar de novo com `--maxWorkers=1` (104 + 22 testes).
- `docs/PRE-PRODUCTION.md` mistura o hunk da auditoria do backlog com o do item 8 desta feature.

### Do `/review` para o `/test`

- Comece pela lista "Verificar no `/test`" de `review/review.md`: suítes com saída 0 numa máquina sem carga,
  `test:emulator` e `pnpm e2e`, `X-Powered-By`, as chaves de `/auth/me`, os dois orçamentos com e sem
  `ARCJET_KEY`, o logout pelo servidor do front e F1 a F5 do plano.
- Lacuna nova e barata: um caso em `corsOrigin.test.ts` para `DELETE /auth/session` no orçamento padrão.

### Rodada 2 (`/test` → `/review`)

- Corrigidos os dois defeitos do `test/report.md`. O `/test` começa pela lista "Verificar no `/test` (rodada 2)"
  de `review/review.md`: `pnpm e2e tests/organizationOwnership.spec.ts` três vezes, a tela de equipe em
  `build && start`, e a redefinição de senha com a revogação falhando.
