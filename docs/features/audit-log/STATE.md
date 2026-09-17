---
slug: audit-log
title: Trilha de auditoria de ações sensíveis
task: -
spec: audit-log
branch: feat/audit-log
epic: -
updated: 2026-09-17 08:30
---

# Pipeline — Trilha de auditoria de ações sensíveis

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-09-17 00:34 | analyze/plan.md | Coleção `auditEvent` somente-adição, cinco ações instrumentadas na API, impersonação registrada pelo servidor em janelas de 15 min, e tela `/admin/audit` reusando o cursor da PR #17 |
| develop | done    | 2026-09-17 01:12 | develop/handoff.md | Slice completo entregue e validado no navegador com as cinco ações gravando de verdade; dois defeitos de UI corrigidos e três desvios do plano registrados |
| review  | in-progress | 2026-09-17 01:42 | review/review.md | Branch `feat/audit-log` criada; as cinco ações reverificadas documento a documento no Firestore e o 503 do caminho degradado reproduzido; três correções aplicadas e três achados 🟡 registrados sem corrigir |
| test    | done    | 2026-09-17 08:30 | test/criterios-aceite.md | 18 critérios aprovados e 1 não verificável sem projeto Firebase real; suíte em 124 arquivos/1227 testes com 5 lacunas de teste fechadas, e as cinco ações reprovocadas no navegador |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- **Impersonação é registrada pelo servidor, não por marco do painel.** O documento tem id determinístico
  (`imp_<actorUid>_<subjectUid>_<janela de 15 min>`) e é gravado com `doc().create()`, que falha em
  `ALREADY_EXISTS`. Um endpoint de marco `start`/`end` foi descartado: a spec proíbe escrita exposta ao
  cliente, e ele não funcionaria na troca de alvo, porque `assertReadOnlyWhileImpersonating` recusa o
  `POST` enquanto o contexto de impersonação está ativo. O custo é não ter instante exato de saída.
  Detalhe em `analyze/plan.md`, §4.1 e decisão D2.
- **A gravação da trilha é fail-open.** Ela nunca derruba a ação principal, porque metade das ações
  auditadas escreve no Firebase Auth e não há transação entre Auth e Firestore. Em falha, o evento vai para
  o stdout via `logEvent("audit", "write-failed", …)` com o mesmo `requestId`. §4.4.
- **Nenhum `error.code` novo.** A rota reusa `VALIDATION_FAILED`, `PAGINATION_CURSOR_INVALID` e
  `PAGINATION_INDEX_MISSING`, todos já traduzidos nos 3 idiomas. O teste de paridade do
  `@repo/internationalization` não é afetado pela parte de `apiErrors`.
- **Uma mudança aditiva de contrato de guard**: `AdminAuthContext` (`apps/api/app/(guards)/admin.ts:12-15`)
  precisa expor `actorProfile: UserDTO`, hoje resolvido dentro do guard (`:42`) e descartado. Sem isso os
  handlers de `users/[id]` não têm o doc id Firestore do ator. Não quebra handler existente.
- **Três pré-requisitos manuais de infra**, em `analyze/plan.md` §10, que o `/develop` não satisfaz e que
  não reprovam a entrega: publicar o índice composto de `auditEvent`; decidir e aplicar a retenção da
  coleção no projeto do fork; ajustar a retenção do log de acesso no painel do provedor.
- **O emulador do Firestore não cobra índice composto.** Nenhum gate local pega a falta da publicação. A
  defesa é o teste estático sobre `firestore.indexes.json`, que prova que a declaração existe no arquivo,
  não que ela foi publicada.
- **Modo degradado projetado**: sem o índice, a listagem e o filtro de período funcionam; só o filtro por
  usuário responde 503 `PAGINATION_INDEX_MISSING`, com a mensagem traduzida. Nunca 500.
- O corte inclui duas ações além da lista literal da spec: `account.sessions.revoke` e
  `account.password.change`. A spec as apresenta nas linhas 53-66 como o argumento que mudou de natureza
  com a PR #12, e o custo marginal é uma chamada por handler. Decisão D4.
- **Um sinal de pronto da spec está desatualizado.** Ela pede "um admin entra, altera algo e sai", mas
  alterar sob impersonação já não é possível desde `docs/features/impersonation-read-only/`. O roteiro
  verificável é "entra, lê e sai". Decisão D10.
- **O `/develop` corrigiu três pontos em que o plano estava errado**: `UserDTO` não tem `email` nem
  `name`, então o rótulo do alvo é lido do Firebase Auth por `audit-label.ts`; `windowEndsAt` é gravado
  como string ISO, porque o DTO tipa todos os instantes assim; e o `calendarDaySchema` virou um predicado
  único, porque o Zod v4 executa os `refine` seguintes mesmo depois de uma falha e lançava `RangeError`
  numa data malformada. Detalhe em `develop/handoff.md`.
- **Dois defeitos de UI apareceram só no navegador e foram corrigidos**: o `loading` do `Container`
  desmontava o formulário de filtros a cada consulta, e o `loadError` escondia os filtros junto com a
  tabela no caminho degradado, deixando o admin sem como desfazer o filtro que causou o erro.
- **A revisão não aceitou o "validado" do `/develop` e refez a prova.** As cinco ações foram provocadas
  pela UI de novo, contra os emuladores, e conferidas documento a documento no Firestore; o 503 do
  caminho degradado foi reproduzido com um patch temporário aplicado e removido dentro da própria
  revisão. Tudo que o handoff afirmava se sustentou. A única ressalva é de método: a prova de que o
  patch do `/develop` tinha sido revertido (`git diff` vazio) não vale para arquivo não rastreado.
- **Três achados 🟡 ficaram em aberto, nenhum reprova a entrega**: evento de usuário excluído não é
  alcançável pelo filtro (o select vem do `useListUsers`), o `DateInput` compartilhado formata data e
  calendário sempre em inglês, e `resolveUserAuditLabel` engole a falha sem log.
- **O QA fechou cinco das sete lacunas de teste e confirmou dois dos três 🟡.** Três arquivos novos
  (`accountAuditTrail`, `commonPanelImpersonationTrail`, `auditFilters`) e dois estendidos
  (`usersAdminAuditTrail` com a falha do Firebase Auth, `auditRecorder` com o `status`), todos unitários.
  A suíte foi de 121 arquivos/1192 testes para 124/1227. O filtro que perde o usuário excluído e o
  calendário em inglês foram reproduzidos no navegador; o log ausente em `resolveUserAuditLabel` não.
- **Um critério ficou 🔒, não verificável.** A recusa real do Firestore por índice ausente exige projeto
  Firebase real: o emulador serve qualquer consulta, indexada ou não. O 503 e a mensagem traduzida estão
  provados por teste unitário nas duas pontas, e a publicação do índice segue como pré-requisito manual em
  `docs/PRE-PRODUCTION.md` §1.2.
- **O `test/report.md` foi gravado pelo orquestrador, não pelo agent de QA.** A ferramenta de escrita do
  agent recusou o arquivo, então o conteúdo veio pela mensagem de retorno e foi persistido em seguida, sem
  alteração.
