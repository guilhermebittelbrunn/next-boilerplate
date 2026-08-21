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
- **Os 4 bugs relatados pelo usuário foram verificados dirigindo o app e não reproduzem.**
- **O `/test` achou 2 bloqueantes novos e corrigi-los revelou 4 derivados — todos resolvidos.** Detalhe
  de cada um em `test/report.md` (seção "Resolução"). Em uma linha: a propriedade dos headers de auth
  estava dividida entre dois componentes, e a ordem em que React roda efeitos de pai e filho fazia um
  apagar o que o outro acabara de aplicar. Hoje o `AuthRequestPanelProvider` é o dono único.
- **Regras que nasceram desses defeitos** (documentadas em `docs/AUTH-PANEL.md` e `apps/app/CLAUDE.md`):
  dono único dos headers · `useAuthorizedQuery` em todo hook autenticado · `resetQueries` (não `clear`) e
  **uma** navegação por troca de sujeito · nunca escrever no store de dentro de uma subscription dele.
- **Cobertura**: 116 → **148** testes. O guard de regressão do defeito principal
  (`apps/app/__tests__/authHeaderOwnership.test.tsx`) foi verificado contra o código antigo — ele falha
  lá, então não é tautologia.
- **Pendente**: mobile no fluxo de impersonação (o `agent-browser` instalado não expõe comando de
  viewport) · credencial de usuário **comum** (esse papel só tem cobertura unit) · modo de produto
  `simple` não exercitado · dois defeitos menores de UI conhecidos e **não** corrigidos (erro de carga
  renderizado como estado vazio; submit sem feedback de erro).
- **Nenhum dado de dev criado ou apagado** (as tentativas de criar entidade retornaram 403).
