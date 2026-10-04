---
slug: account-active-sessions
title: Sessões ativas da conta (fatia 2 de account-security-mfa)
task: -
spec: account-security-mfa
branch: feat/account-active-sessions
epic: -
updated: 2026-10-01 01:59
---

# Pipeline — Sessões ativas da conta

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-30 22:08 | analyze/plan.md | Sessão identificada pelo instante do login (`sessionAuthTime` ou `auth_time`); coleção `session` com id `<uid>_<chave>` lida por `resolveApiActor` a cada requisição; encerrar uma ou "todas as outras" (com marca d'água) recusa na API; front-ends consultam a API antes de gravar o cookie e no proxy; logout local; painel na aba Segurança; 4 códigos novos; sem índice, regra ou env obrigatória; 14 commits |
| develop | done    | 2026-09-30 22:42 | develop/handoff.md | Slice inteiro (SDK, auth, API, app, web, i18n, docs); recusa provada com Firebase mockado e mutação; 1 desvio de ferramenta (Vitest no `@repo/sdk`); proxy limpando cookie, SSO e UI ficam para o `/test` |
| review  | in-progress | 2026-10-01 01:59 | review/review.md | Rodada 2: login no mesmo segundo do "encerrar as outras" segue recusado (lado seguro, trade-off em `AUTH-SSO.md`); comparação extraída para `mayHaveStartedBefore`, 6 testes novos, mutação da truncagem derruba 4; gates verdes; plano de 19 commits mantido (8 e 16 com conteúdo novo) |
| test    | done    | 2026-10-01 01:17 | test/report.md | 10 de 10 itens do `/review` medidos (9 confirmados, latência só no emulador); 15 critérios ✅; suíte e `test:emulator` verdes; e2e em pt-br/en/es, light/dark/375 px; nenhum defeito bloqueante, 2 observações 🟢; sem teste novo |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Fatia 2 da spec `account-security-mfa` (itens 2 e resíduo do 3). A fatia 1 está em
  `docs/features/account-security-mfa/`, que esta pasta não altera. A fatia 3 (segundo fator) fica fora.
- Plano feito em rodada autônoma do `/cycle --no-audit`. As 15 escolhas estão na §12 do plano, cada uma com
  a opção adotada e a descartada.
- O Firebase não revoga uma sessão só. A recusa acontece na API e nos front-ends; o refresh token do
  aparelho encerrado continua válido no Firebase (§8.1 do plano). "Sair de todos" segue cortando no Firebase.
- Pré-requisitos manuais de infra (§14): nenhum obrigatório. `SESSION_ABSOLUTE_MAX_AGE_DAYS` na API só se o
  fork mudou o valor nos front-ends. Não configurar TTL na coleção `session`.
- Testes planejados todos em Vitest, sem emulador. O `/test` precisa de dois ou três contextos de navegador
  com logins espaçados em pelo menos 1 segundo, porque a chave da sessão tem precisão de segundo.
- `/test` rodou com `review = in-progress`: a branch existe e nenhum commit da feature foi feito ainda; o
  `/review` espera a aprovação do plano de commits no fim do `/cycle`.
