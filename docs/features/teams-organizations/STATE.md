---
slug: teams-organizations
title: Organizações, membros e convites
task: -
spec: teams-organizations
branch: guilhermebittelbrunn/tarefa-maior-/cycle (não passa no regex; o nome proposto era feat/teams-organizations)
epic: -
updated: 2026-10-23
---

# Pipeline: Organizações, membros e convites

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-22 11:36 | analyze/plan.md | Corte inteiro em duas fases. A: `organization` + `organizationMember/{profileId}` criados no cadastro ou no primeiro pedido (lote com `create()`, retrocarga preguiçosa dos `entity` antigos), `entity.organizationId` como chave de escopo num helper do repositório, guard `requireOrganizationApi` com papel dono/membro, fotos de `entity` em `uploads/org-<id>/`, expurgo e exportação separando pessoa e organização, três índices novos, declaração B2B/B2C. B: convites com hash do token (7 dias, uso único, um por organização e endereço), aceite em `/invite` exigindo o e-mail do convite, página da equipe, dono que nunca sai, tudo atrás de `NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED` |
| develop | done    | 2026-10-22 12:42 | develop/handoff.md | Fases A e B implementadas, nada commitado. A chave de membros embrulha a rota inteira e responde 404 antes de autenticar, e o guard de organização compõe sobre o do painel comum: os dois desvios evitam que a fase A dependa da fase B e que um teste de guard tivesse de ser afrouxado. Gates: 29/29 tarefas do turbo, emulador 7 arquivos e 264 testes, build de `app` e `api` com a variável ausente. A fronteira entre as fases, arquivo a arquivo, está no handoff |
| review  | done    | 2026-10-23       | review/review.md | Rodada 2, volta do `/test`: o D-1 está corrigido (o `generateMetadata` de `/invite` usa o título do 404 com a chave desligada; 7 casos novos, e os 6 da chave desligada falham sem a correção). O 500 sem código do convite com o Auth falhando segue o comportamento de outras rotas e virou achado. A faixa do rodapé do convite foi corrigida; o e-mail no cadastro a partir do convite ficou para o backlog. Rodada 1: nenhum bloqueante, vínculo removido numa transação que confere a organização, cartão de convite inválido que piscava, 15 âncoras. Gates: `pnpm check` 1047 arquivos, typecheck da app sem erro. 29 commits feitos a pedido do usuário, cobrindo os 152 caminhos, e PR aberta |
| test    | done    | 2026-10-23 01:23 | test/report.md | 27 critérios: 23 ✅, 0 ❌, 4 🔒 (infra externa). O D-1 (título de equipe no 404 de `/invite` com a flag desligada) foi corrigido na rodada 2 do `/review` e remedido no build de produção nos três idiomas; a faixa do rodapé do convite sumiu em light, dark, desktop e 375 px. `pnpm test` 15/15 tasks (3999 testes, emulador 265), `pnpm e2e` 22/22 |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- A spec entrou no ciclo ainda `deferred`, por instrução de foco do usuário nesta rodada ("uma tarefa maior"), como a
  auditoria pós-PR #56 recomendou. Reabrir a spec ou aprová-la continua sendo decisão do usuário; o frontmatter dela só
  ganhou `feature: teams-organizations`.
- Plano feito em rodada autônoma do `/cycle`. As 21 perguntas em aberto trazem a opção adotada, a descartada e o
  motivo, no fim do `analyze/plan.md`.
- A fase A tem de ficar verde e commitável sozinha antes de a fase B começar. Nenhum arquivo da fase A depende de código
  da fase B.
- Medições no emulador de Firestore (porta 8096, projeto `demo-teams-measure`, derrubado no fim, portas conferidas
  livres): 8 criações simultâneas gravam 1 organização e nenhum órfão; campo ausente não casa com `== null`; a
  retrocarga carimba só o que falta e a segunda passada encontra 0; a consulta paginada por `organizationId` não vaza
  entre organizações; 3 aceites simultâneos do mesmo token terminam com 1 aceito, o repetido da mesma pessoa como
  sucesso e o de outra pessoa recusado.
- Pré-requisitos manuais de infra (índices antes do deploy da API, TTL opcional de convite, Resend, a flag nas duas
  apps, `ARCJET_KEY`) estão no §12 do plano, cada um com o modo degradado esperado.
- `/develop` (2026-10-22): sete arquivos de código e seis de documentação têm trechos das duas fases e pedem
  `git add -p`; a lista está em `develop/handoff.md`, "Fronteira entre as fases".
- `/review` (2026-10-22): a branch atual não passa no regex de `.claude/rules/git-commits.md`; o nome proposto é
  `feat/teams-organizations`, e renomear fica com você (D1 no `review/review.md`). O rate limit conta o `GET` da tabela
  de convites (D2), e o admin consegue arquivar um dono com membros (D3). A lista "Verificar no `/test`" começa pelo
  isolamento entre organizações chamando a API direto.
- `/test` (2026-10-23): a linha `review` continua `in-progress` porque nada foi commitado nesta rodada do `/cycle`; não
  há commit da feature à frente de `9c793c6`. O D-1 volta para o `/review`, com repro e correção sugerida no
  `test/report.md`. Os dados de QA ficaram só nos emuladores, que pararam sem exportar, e as portas foram devolvidas.
- `/review`, rodada 2 (2026-10-23): o `/test` reprovou "fork B2C não vê organização" pelo título de `/invite` no 404.
  Corrigido; o `/test` precisa remedir só esse item no build de produção, com a variável vazia.
- `/test`, remedição (2026-10-23): o D-1 e a faixa do rodapé, depois da rodada 2 do `/review`, medidos em dois builds
  de produção da `app` (flag vazia e flag ligada). Os dois passaram, e a linha `test` foi de `blocked` para `done`.
