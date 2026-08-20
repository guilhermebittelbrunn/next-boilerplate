---
slug: auth-panel-context
title: Autenticação e contexto de painel (apps/app)
task: -
branch: feat/initial-files-v1
epic: -
updated: 2026-08-20 17:10
---

# Pipeline — Autenticação e contexto de painel

| etapa   | status  | quando           | artefato           | resumo (1 linha) |
|---------|---------|------------------|--------------------|------------------|
| analyze | done    | 2026-08-20 10:05 | analyze/plan.md    | Causa raiz do bug (split-brain de hidratação) + blueprint do contrato de headers, estado inicial via servidor e matriz de testes |
| develop | done    | 2026-08-20 11:12 | develop/handoff.md | Snapshot de painel resolvido no servidor, `x-user-timezone`, `GET /users` escopado pelo contexto, 99 testes verdes — validação visual pendente de credencial |
| review  | done    | 2026-08-20 14:24 | review/review.md   | Store passou a ser por request (vazamento cross-request no SSR), guard admin rejeita painel comum, 4 correções menores; 21 commits feitos, **não** enviados ao remoto |
| test    | done    | 2026-08-20 17:10 | test/report.md     | Os 4 bugs relatados não reproduzem; os 2 bloqueantes do e2e (headers apagados, seletor em dead-end) foram corrigidos junto de 3 defeitos derivados; 148 testes verdes e fluxo de impersonação confirmado no browser sem 401/403 |
| observe | pending | -                | -                  | - (opcional)     |

## Notas

- Decisões da 1ª rodada: manter `requestUserId` + adicionar `x-user-timezone`; timezone agora; cookie =
  fonte de verdade e localStorage = espelho; entrega em tarefa única.
- Decisões da 2ª rodada: aplicar filtro em `GET /users` com enforcement no servidor (A1); incluir A2/A3;
  latitude para melhorias de UX/integridade/qualidade no caminho tocado.
- Decisões da 3ª rodada (pós-review): store de painel **por request** (era singleton de módulo lido
  durante o render no servidor) e `requireAdminApi` rejeitando painel comum, fechando o caminho de
  **escrita** que a leitura escopada não cobria. Mais 4 correções menores.
- **Desvio consciente**: A2 (duplo hop no login) **não** foi corrigido no proxy — o papel vive no
  Firestore, então resolvê-lo ali custaria uma chamada de API em toda navegação. Em troca o proxy ganhou
  default-deny. Justificativa no `develop/handoff.md`.
- **Bloqueio para o `/test`**: validação visual do fluxo de impersonação exige credencial de admin de DEV
  (o usuário precisa fornecer; nunca persistir em arquivo versionado). No `/review` foi validado só o que
  dispensa login: sign-in/sign-up em light/dark/mobile e todos os gates anônimos do proxy default-deny.
- **Fora dos commits, por decisão do usuário**: `docs/AUTH-SSO.md` e `docs/PAYMENTS.md` seguem
  modificados no working tree — descrevem código que não existe em nenhuma branch. Limpeza planejada.
- **Push pendente**: os 21 commits estão locais, aguardando confirmação explícita.
- **Bloqueio do `/test` (2 defeitos, mesma causa raiz)** — os 4 bugs relatados pelo usuário foram
  verificados e **não reproduzem**; estes são novos, achados dirigindo o app:
  1. `clientLayout.tsx` chama `apiClient.clearAuthRequestContext()` no branch "token ainda não
     resolvido". O efeito do pai roda **depois** do provider filho, que aplica os `x-*` no render — a
     ordem inverteu com esta feature e os headers de contexto são destruídos. Enquanto o admin
     impersona, `GET`/`POST /entities` respondem 403 `COMMON_PANEL_FORBIDDEN`. A linha é anterior ao
     diff, mas era inofensiva quando o contexto vinha por rede.
  2. A query do seletor (`/users?type=common`) sai antes do `Authorization` (definido em efeito async) →
     401 → com `retry: 1` + `staleTime: 60s` a lista fica vazia e o seletor de ambiente fica
     **permanentemente desabilitado** (3/3 em carga fria). O gate `enabled` conhece o painel, não o token.
  Menores: 403 renderizado como "Nenhuma entidade cadastrada." e submit sem feedback de erro; aviso
  `Select is changing from uncontrolled to controlled` (`resolveSelectValue` descarta valor válido
  enquanto `options` está vazio).
- **Testes criados pelo `/test`** (no working tree, não commitados): `apps/api/__tests__/usersRoute.test.ts`,
  `apps/api/__tests__/userRepositoryList.test.ts`, `apps/app/__tests__/proxy.test.ts`,
  `apps/app/__tests__/authRequestTimeZone.test.ts`. Total 116 → **144**.
- **Nenhum dado de dev criado ou apagado** (as tentativas de criar entidade retornaram 403).
