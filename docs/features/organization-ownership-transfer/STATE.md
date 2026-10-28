---
slug: organization-ownership-transfer
title: Transferir a propriedade da organização
task: -
spec: organization-ownership-transfer
branch: guilhermebittelbrunn/cycle-value-task
epic: -
updated: 2026-10-28 01:22
---

# Pipeline: transferir a propriedade da organização

| etapa   | status  | quando           | artefato        | resumo (1 linha) |
|---------|---------|------------------|-----------------|------------------|
| analyze | done    | 2026-10-28 00:02 | analyze/plan.md | `POST /organization/members/[id]/ownership` troca `organization.ownerUserId` e os dois papéis numa transação (4 leituras antes das 3 escritas; recusas `403 ORGANIZATION_FORBIDDEN`, `404 ORGANIZATION_MEMBER_NOT_FOUND`, novos `400 ORGANIZATION_OWNERSHIP_TARGET_SELF` e `409 ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED`); `remove` passa a recusar vínculo de dono; posse lida como lista (`listOwnedBy`) na regra de saída e no expurgo, porque o dono novo fica dono de duas organizações; prévia e aceite recusam dono arquivado e o aceite conta só membro vivo; cinco ações de equipe na trilha; item "Tornar dono" com diálogo na tabela; E2E com a flag ligada na pilha inteira e convite gravado no emulador; sem env, índice, dependência ou infra nova |
| develop | done    | 2026-10-28 00:27 | develop/handoff.md | Rota `POST /organization/members/[id]/ownership` com transação, `remove` com três desfechos, posse em lista no expurgo e na regra de saída, aceite que recusa dono arquivado e conta só membro vivo, cinco ações na trilha, item "Tornar dono" com diálogo e E2E com a flag ligada (23 de 23 specs); gates verdes |
| review  | done    | 2026-10-28 01:20 | review/review.md | Primeira passada sem bloqueante; `previousOrganizationNotice` reescrito nos 3 idiomas. Segunda passada, depois do `/test`: "Tornar dono" pelo teclado abria e fechava o diálogo no mesmo Enter; corrigido na raiz, no `ActionsMenu` (cancela o `keydown` que executa o item), com teste que falha sem e passa com a correção; gates estáticos verdes; branch proposta `feat/organization-ownership-transfer` (não criada) e 15 commits planejados |
| test    | done    | 2026-10-28 01:22 | test/report.md  | 16 ✅, 2 🔒 de 18 critérios. O ❌ da rodada 1 ("Tornar dono" pelo teclado fechava o diálogo no mesmo Enter) foi corrigido no `ActionsMenu` e medido na rodada 2: diálogo fica aberto, 1 chamada à API, foco volta a "Membros", sem regressão nos outros menus. Gates: `pnpm test` 15/15, `pnpm e2e` 23/23. 🔒: envio de convite e rótulo de convite enviado, sem provedor de e-mail |
| observe | pending | -                | -               | - (opcional)     |

## Notas

- A spec está `proposed` e veio ao ciclo por instrução de foco do usuário ("uma tarefa maior e que agregue valor"),
  como `teams-organizations`. Aprovar ou rejeitar a spec continua sendo decisão do usuário; este passo não mexeu no
  arquivo dela.
- Rodada autônoma do `/cycle`: as 12 perguntas da §17 do plano já vêm com a opção adotada, a descartada e o motivo.
- Três desvios em relação à spec, explicados na §1.1 do plano: a suíte E2E não lê link de e-mail (o convite entra no
  emulador com token conhecido); a transferência deixa o dono novo com duas organizações, e a regra de saída e o
  expurgo da conta passam a ler a lista; o evento de convite enviado não grava o e-mail do convidado.
- Pré-requisitos manuais de infra: nenhum (§16 do plano). As pendências de membros e convites que já existem
  (flag nas duas apps, Resend, `ARCJET_KEY`, TTL opcional) não reprovam esta entrega.
- Atenção para o `/develop`: os casos existentes de `organizationInvitation.emulator.test.ts` precisam gravar o
  documento `user/{profileId}` vivo do dono e dos membros, senão o aceite passa a recusar tudo depois da regra de
  dono arquivado (§9 do plano).
- A auditoria do backlog desta rodada (`specs/`) entrou num commit próprio, `docs(specs)`, separado do código da
  feature.
- A PR saiu da branch do workspace, `guilhermebittelbrunn/cycle-value-task`, e não da proposta pela revisão
  (`feat/organization-ownership-transfer`), por instrução do usuário ao pedir a PR.
