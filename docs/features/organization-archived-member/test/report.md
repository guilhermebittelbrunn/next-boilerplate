# Relatório do `/test`: o membro arquivado deixa de contar na organização

- **Data:** 2026-10-23
- **Branch:** `guilhermebittelbrunn/cycle-command-v8` (não protegida; nenhuma branch criada, nada commitado, índice
  intocado)
- **Escopo:** `apps/api/(shared)/lib/organization-membership.ts`, `apps/api/__tests__/organizationMembership.test.ts`
  e o teste novo `apps/api/__tests__/organizationOwnerExitArchivedMember.test.ts`

Resultado: os oito critérios passam, os três itens da lista "Verificar no `/test`" foram medidos e confirmados, e
nenhum defeito de produção apareceu.

## Verificar no `/test`

| item do `review.md` | veredito | o que foi medido |
|---------------------|----------|------------------|
| 1. `POST /account/deletion` com o helper real | confirmado | Teste de rota novo com o helper real e mocks só nos repositórios. Dono com o único outro membro arquivado: `200`, `findById("profile-archived")` chamado, `identitySignInWithPassword` chamado com e-mail e senha, `runAccountErasure` chamado uma vez. Membro vivo ao lado do arquivado: `409 ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS`, senha e erasure não chamados. `findById` rejeitando: a rota rejeita com o erro original (no Next vira `500`), sem senha, sem erasure, sem auditoria. |
| 2. `DELETE /users/:id` com o helper real | confirmado | Mesmo arquivo. Arquivado: `204`, `stripe.subscriptions.cancel("sub_123")` chamado, ordem `cancel → revoke → delete`, `userRepository.delete("profile-owner")`. Membro vivo: `409 USERS_DELETE_ORGANIZATION_HAS_MEMBERS`, `getStripe` não chamado, nenhuma revogação nem soft delete. Leitura do perfil do membro rejeitando: a rota rejeita, sem `getStripe`, sem `revokeAccountAccess`, sem `userRepository.delete`, sem evento de auditoria. |
| 3. Números do handoff | confirmado | `organizationMembership.test.ts` 16/16. A mutação `return others.length > 0` derruba 1 caso do helper, como o handoff disse (e mais 2 do teste novo). `pnpm --filter api test` passou de 122 arquivos / 1646 testes para 123 / 1652; a diferença é exatamente o arquivo novo com 6 casos. |

## Cobertura e comandos

| comando | resultado |
|---------|-----------|
| `pnpm --filter api exec vitest run __tests__/organizationOwnerExitArchivedMember.test.ts __tests__/organizationMembership.test.ts` | 2 arquivos, 22 testes passando (6 + 16) |
| mutação A: `return profiles.some(...)` trocado por `return others.length > 0`, mesmo comando | 3 falhas, 19 passando: `is false when the only other member's profile was archived`, o caso do arquivado em `POST /account/deletion` e o caso do arquivado em `DELETE /users/[id]` |
| mutação B: `findById(...)` com `.catch(() => null)` (falha de leitura tratada como arquivado), mesmo comando | 3 falhas: `surfaces a failure to read a member's profile` e os dois casos de falha de leitura das rotas |
| restauração depois das duas mutações | `shasum` do helper `34d622262b7ff418d93737722088f3b6b86d5595` antes e depois, igual ao do handoff; `git diff --stat` do arquivo igual ao de antes (12 inserções, 2 remoções) |
| `pnpm --filter api test` | 123 arquivos, 1652 testes passando |
| `pnpm --filter api typecheck` | sem erro |
| `pnpm check` | "Checked 1048 files in 470ms. No fixes applied." (os 1047 do `/review` mais o teste novo) |
| `pnpm test` (raiz, `JAVA_HOME=/opt/homebrew/opt/openjdk@21`, sem `--force`) | 15 tasks, 15 com sucesso, 13 do cache, 24 s |
| paridade de i18n | dentro do `pnpm test`: `@repo/internationalization` 7 arquivos, 67 testes. O diff não toca i18n. |

Números por workspace do `pnpm test` da raiz: api 1652, `api:test:emulator` 265 (7 arquivos), app 1099, web 207,
design-system 171, email 208, auth 136, internationalization 67, shared 56, analytics 34, next-config 32, payments 22,
security 45, sdk 14, e2e 16. Total de 4024 testes em 344 arquivos. Rodei o `pnpm test` da raiz duas vezes: a primeira
saída não trouxe a contagem por workspace legível, e a segunda serviu só para isso (14 tasks do cache; o
`test:emulator` nunca é cacheado e rodou de novo, verde nas duas).

## Teste criado

`apps/api/__tests__/organizationOwnerExitArchivedMember.test.ts`, arquivo novo. Nenhum arquivo de teste existente foi
editado.

O teste usa o helper real e as duas rotas reais, com os guards reais. Os mocks ficam nas bordas, nos mesmos moldes de
`accountDeletionRoute.test.ts` e `usersAdminDeleteBilling.test.ts`: `organizationRepository.findOwnedBy`,
`organizationMemberRepository.listByOrganization`, `userRepository` (`findById` por id, `findByReferenceId` para o
guard, `delete`), `entityRepository`, `resolveApiActor`, `identitySignInWithPassword`, `runAccountErasure`,
`revokeAccountAccess`, auditoria, `@repo/payments` e `@repo/auth/server`.

Casos:

- `POST /account/deletion`: segue para a conferência de senha quando o único outro membro tem o perfil arquivado;
  recusa com 409 antes da senha quando um membro vivo continua na organização; não apaga nada quando a leitura do
  perfil de um membro falha.
- `DELETE /users/[id]`: arquiva o dono cujo único outro membro tem o perfil arquivado, cancelando a assinatura
  primeiro; recusa com 409 quando um membro vivo continua na organização; não cancela, não revoga e não arquiva quando
  a leitura do perfil de um membro falha.

## Decisões de custo de teste

- Rota com mocks de repositório, faixa barata. O que faltava provar era a ligação entre o helper real e a ordem das
  chamadas nas duas rotas, e o mock dos repositórios prova isso em milissegundos. As mutações A e B mostram que o
  teste derruba as duas regressões que interessam: contar o arquivado e engolir a falha de leitura.
- Nenhum teste de emulador. O diff não muda consulta, regra nem serialização. "Arquivado vira `null`" é contrato do
  `BaseRepository`, já coberto por `baseRepository.test.ts` e pela suíte de emulador `userArchivedProfile`, que passou
  no `test:emulator` desta rodada.
- `organizationMemberProfiles` e `organizationMembersRoute` não ganharam caso novo: não estão no diff e passam sem
  edição.

## Critérios de aceite

| critério | status | meio |
|----------|--------|------|
| Dono cujo único outro membro está arquivado não é bloqueado | ✅ PASS | helper (caso 4) + rota, nas duas rotas |
| Um membro ativo continua bloqueando, mesmo ao lado de um arquivado | ✅ PASS | helper (casos 3 e 5) + rota, nas duas rotas |
| Vínculo sem perfil no Firestore não conta | ✅ PASS | helper (o `null` do caso 4) + leitura de `base.repository.ts:144-155` (`null` para inexistente e para `deletedAt`) |
| O perfil do dono nunca é lido, e o dono sozinho não gera leitura | ✅ PASS | helper (asserções dos casos 2 e 3) |
| Sem organização de casa, nada muda | ✅ PASS | helper (caso 1) |
| Falha ao ler um perfil não libera a exclusão | ✅ PASS | helper (caso 6) + rota, nas duas rotas + mutação B |
| A tabela da equipe continua mostrando o membro arquivado | ✅ PASS | leitura do diff (arquivos ausentes) + `organizationMemberProfiles.test.ts` e `organizationMembersRoute.test.ts` verdes na suíte |
| Nenhuma rota, contrato ou tradução muda | ✅ PASS | `git status --short` + suíte `api` 1652/1652 + typecheck |

Total: 8 ✅, 0 ❌, 0 🔒.

## Evidência e2e

Não houve passada de browser. O diff não tem superfície de UI: muda um helper da `apps/api` e os testes dele. Os dois
`409` já existiam e chegam às telas pelo `FormattedError`, com cópia nos três idiomas que esta tarefa não tocou. O
plano (§8) e o `STATE.md` registram o mesmo. Nenhum screenshot foi tirado e `test/e2e/` não existe.

## Ambiente

Não subi app, API nem emulador manualmente. O `pnpm test` da raiz sobe e derruba os emuladores de Firestore e Storage
sozinho no `test:emulator`. Antes, as portas 8080, 9199, 9099, 4001, 4400 e 4500 estavam livres, e continuavam livres
depois das duas execuções. Nenhum serviço do usuário foi reutilizado nem derrubado.

## Lacunas herdadas

| lacuna | origem | veredito |
|--------|--------|----------|
| Nenhum teste de rota passa pelo helper real | handoff e review (itens 1 e 2) | fechada aqui, com o arquivo novo |
| "Arquivado vira `null`" provado só em `baseRepository.test.ts` e no emulador `userArchivedProfile` | handoff | fora de escopo: contrato do repositório base, que o helper usa sem sobrescrever; a suíte de emulador passou nesta rodada |
| `ownsOrganizationWithMembers` contando perfil arquivado | review de `organization-guardrails` | fechada pelo `/develop` desta tarefa, agora medida também no nível de rota |
| Aceite de convite ainda conta o membro arquivado (`organization-invitation.repository.ts:269-275`) | plano §12, review 🟢 | continua aberta, fora de escopo; vai para o backlog |
| Convites pendentes de um dono arquivado continuam aceitáveis | plano §12, review 🟢 | continua aberta, fora de escopo; vai para o backlog |
| `PRE-PRODUCTION.md`, `ROPA.md` e `INCIDENT-RESPONSE.md` não dizem que perfil arquivado não conta | plano §12, review | continua aberta, fora de escopo; o texto atual não fica falso |
| `500` sem `error.code` quando a leitura do Firestore falha | backlog | continua aberta, fora de escopo; esta tarefa não muda esse comportamento |

## Observação para quem commitar

`docs/features/organization-guardrails/test/criterios-aceite.md` diz, no primeiro critério, que um vínculo de membro
com perfil arquivado ainda conta como membro. Era verdade quando aquela tarefa foi testada e deixa de ser com esta. Não
editei o arquivo, que pertence à outra tarefa. Como as duas vão na mesma PR, cabe uma nota de uma linha lá, ou aceitar
o artefato como registro daquele momento.

## Estado de dev alterado e dados de QA

Nenhum. Não criei conta, documento nem dado em projeto Firebase real nem no emulador, fora do que a própria suíte cria
e descarta.
