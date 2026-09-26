---
slug: account-security-mfa
title: Política de senha (fatia 1 de MFA, sessões e política de senha)
task: -
spec: account-security-mfa
branch: -
epic: -
updated: 2026-09-26 12:56
---

# Pipeline — Política de senha (fatia 1 de `account-security-mfa`)

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-26 12:01 | analyze/plan.md | Mínimo de 8 caracteres sem regra de composição para toda senha definida (cadastro app e web, redefinição, troca, criação pelo admin), com `PASSWORD_MIN_LENGTH`/`EXISTING_PASSWORD_MIN_LENGTH` em `@repo/shared` substituindo as 11 cópias; login e senha atual seguem aceitando 6; cadastro passa pela rota `POST /auth/sign-up` (Zod + Admin SDK `createUser`) e o caminho direto ao Firebase sai do código; código novo `AUTH_PASSWORD_TOO_SHORT` |
| develop | done    | 2026-09-26 12:18 | develop/handoff.md | Constantes em `@repo/shared`, `AUTH_PASSWORD_TOO_SHORT` nas 4 rotas que definem senha, cadastro das duas front-ends por `POST /auth/sign-up` (Admin SDK) seguido de `signIn`, `signUp` fora de `packages/auth`; `pnpm turbo run lint typecheck test` 26/26; 5 desvios pequenos no handoff |
| review  | in-progress | 2026-09-26 12:32 | review/review.md | Nenhum bloqueante; 4 atenções corrigidas (motivo no log de falha do Admin SDK na rota de cadastro, com teste, e três afirmações erradas em `SECURITY.md`/`PRE-PRODUCTION.md`); `pnpm turbo run lint typecheck` 15/15, paridade 59/59; branch atual inválida, proposta `feat/account-security-password-policy`; plano de 13 commits aguardando aprovação |
| test    | done    | 2026-09-26 12:56 | test/report.md  | 16 ✅ · 1 ❌ · 3 🔒 em 20 critérios; o único ❌ é o contraste 1,97:1 do erro no dark, anterior à fatia e já em `specs/BACKLOG.md:396`; cadastro medido contra o emulador (app e web, 3 idiomas, light/dark/375 px), `signUp.spec.ts` verde, `pnpm test` 2097 testes; 5 testes novos fecham a lacuna do botão desabilitado; `review` segue `in-progress` porque os commits aguardam aprovação |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Plano feito em rodada autônoma do `/cycle`, aplicando o reescopo que a auditoria gravou na spec: só o item 4 (política de senha). Sessões, logout local, encerramento seletivo e segundo fator ficam para as próximas fatias, e a spec não é arquivada depois desta.
- As cinco perguntas em aberto já vêm com a opção adotada (seção 12 do plano), e as 13 decisões tomadas sem perguntar estão na seção 13, cada uma com a alternativa descartada.
- O risco do cadastro direto ao Firebase foi resolvido pela API: a rota de cadastro já existia, sem uso e sem validação, e passa a ser o único caminho das duas front-ends. O REST direto com a chave pública ainda aceita 6 ou 7 caracteres; fechar isso exige Identity Platform (teto de 3.000 DAU no Spark ou cartão no Blaze) e fica como pergunta P1 e declaração no `docs/PRE-PRODUCTION.md`.
- A rota cria a conta pelo Admin SDK para não concentrar todo cadastro no limite do Firebase de 100 contas por hora por IP do servidor. Com isso o Arcjet vira a única trava de `/auth/sign-up`, o que entra no item 8 do `docs/PRE-PRODUCTION.md`.
- Pré-requisitos manuais de infra (seção 14 do plano): nenhum bloqueia a entrega. `ARCJET_KEY` segue recomendada e Identity Platform é opcional. O `/test` não reprova por eles.
- Testes planejados todos em Vitest, sem emulador; o E2E de cadastro existente usa `demo1234` (8 caracteres) e segue valendo.
