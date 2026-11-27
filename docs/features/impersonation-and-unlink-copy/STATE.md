---
slug: impersonation-and-unlink-copy
title: Copy do desvincular com sessões abertas e o menu do perfil sob personificação
task: -
spec: -
branch: feat/audit-log-levels
epic: -
updated: 2026-11-27 12:20
---

# Pipeline — Copy do desvincular com sessões abertas e o menu do perfil sob personificação

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-11-27 10:07 | analyze/plan.md | Desvincular a senha com `500 AUTH_SESSIONS_NOT_REVOKED` ganha mensagem própria (`account.messages.passwordUnlinkedSessionsNotRevoked`, 3 idiomas) que aponta "Sair de todos os dispositivos" na mesma tela; a copy de `apiErrors` fica, porque serve aos outros 4 fluxos; `ProfileDropdown` ignora o usuário do Firebase (nome, e-mail e foto) sob personificação via `useAuthRequestPanel().isImpersonating`; 8 arquivos, sem API, SDK, env nem infra; 4 commits sugeridos |
| develop | done    | 2026-11-27 10:50 | develop/handoff.md | 8 arquivos do plano: desvio de `AUTH_SESSIONS_NOT_REVOKED` no `onError` do desvincular com a chave nova nos 3 idiomas e `ProfileDropdown` sem fallback do Firebase sob personificação; teste ajustado porque o sufixo "(Código do erro: …)" é o `requestId`, não o `error.code`; app 1409 testes, i18n 67, typecheck e `pnpm check` ok; mutações derrubam 2/13 e 3/4 |
| review  | done    | 2026-11-27 10:55 | review/review.md | Sem bloqueante; critério 3 do plano registrado como errado (o sufixo é o `requestId`, não o `error.code`); desvio do desvincular restrito ao `providerId` da senha; provider, rótulo do botão e autorização na API conferidos; check e typecheck ok. Rodada 2 (12:20): saudação do início sob personificação corrigida em `CommonHomeClient.tsx:61-64` com o padrão do `ProfileDropdown` (varredura achou 2 pontos, não 3), 3 casos novos, 13/13, mutação derruba 2/13; 5 commits propostos depois das outras duas tarefas |
| test    | done    | 2026-11-27 12:50 | test/report.md | 13/13 critérios ✅; rodada 2 mediu a saudação do início sob personificação nos 3 idiomas ("Olá"/"Hello"/"Hola" sem nome, primeiro nome da conta com nome, nunca o admin com `GET /account` atrasado 6 s); `pnpm test` root 15/15 na 2ª tentativa (a 1ª teve 2 timeouts por carga em testes de outras áreas); teste novo do Google (3 idiomas) |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- Tarefa direta, sem spec, a partir de `specs/reference/AUDIT.md:348-349` e dos achados em `:1937` e `:1940`.
  Plano feito em rodada autônoma do `/cycle`: as 7 decisões tomadas sem perguntar estão na §12 do plano, cada
  uma com a alternativa descartada, e as 3 perguntas da §11 já vêm com a opção adotada.
- O item da copy foi reduzido ao desvincular: a mesma copy de `apiErrors` está certa na redefinição de senha,
  na confirmação de troca de e-mail e, pela medição de `delivery-security-review`, na troca de senha.
- O item do menu foi ampliado para e-mail e foto, que vêm do mesmo fallback (`ProfileDropdown.tsx:42-44`).
- O working tree tem a feature `audit-log-levels` sem commit; nenhum dos 8 arquivos do plano coincide com ela.
- Pré-requisitos manuais de infra: nenhum.
- Rodada 2 do review mexeu em `CommonHomeClient.tsx` e `commonHomeClient.test.tsx` depois do `/test`; a saudação sob personificação precisa ser remedida no browser (lista em `review/review.md`, "Rodada 2").
