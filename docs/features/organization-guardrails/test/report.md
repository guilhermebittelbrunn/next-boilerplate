# Relatório de teste: travas da organização

Escopo: o diff de `apps/api` (`users/[id]/route.ts`, `organization/invitations/route.ts`, `proxy.ts` e cinco arquivos
de teste), as duas chaves novas de `apiErrors` e as âncoras dos cinco documentos. Branch:
`guilhermebittelbrunn/cycle-command-v8` (não protegida; a troca para `api/fix/organization-guardrails` fica para a
aprovação dos commits, como o `review.md` registra). Nenhum arquivo de produção foi alterado nesta etapa e nenhum teste
novo foi criado.

Resultado: 14 critérios, 12 verificados, 0 com falha, 2 não verificáveis sem infra externa. Nenhum defeito de
produção encontrado.

## Verificar no `/test`

| # | item do `review.md` | veredito | medição |
|---|---------------------|----------|---------|
| 1 | Números dos arquivos de teste e da suíte da api | confirmado | 4 arquivos do `DELETE` (`usersAdminArchiveAccess` 11, `usersAdminDeleteBilling` 13, `usersAdminAuditTrail` 29, `mergedUserPayload` 7) = 60 passando; `organizationInvitationsRoute` 23 passando; `proxyArcjetKey` 7 passando; `pnpm --filter api test` 122 arquivos, 1643 testes passando. |
| 2 | Teste de mutação ("5 failed / 36 passed") | confirmado | Medi cada mutação isolada, no arquivo de teste correspondente. Detalhe abaixo. Total: 5 falhas e 36 passando nos 41 testes dos três arquivos. |
| 3 | Helper real no `DELETE` contra o emulador | não executado, por decisão de custo | Ver "Decisões de custo de teste". A cadeia de ids foi confirmada por leitura e a troca de id pela mutação 1. |
| 4 | Membro arquivado contando como membro (🟡) | confirmado por leitura | `userRepository.delete(id)` (`users/[id]/route.ts:228`) marca `deletedAt` só no perfil; `listByOrganization` (`organization-member.repository.ts:81-92`) filtra só o `deletedAt` do vínculo; `ownsOrganizationWithMembers` (`organization-membership.ts:105-117`) conta qualquer vínculo com `userId` diferente do dono. Um dono cujo único membro foi arquivado recebe `409`. O achado continua aberto para o backlog. |
| 5 | 🔒 `429` real da Arcjet | não verificável | Exige `ARCJET_KEY` válida, pendência existente no `docs/PRE-PRODUCTION.md`. |
| 6 | 🔒 Falha real do Firebase Auth no convite | não verificável | O emulador não produz a falha sem mock; o teste de rota é a prova. |

O item R2 do handoff (`HEAD /organization/invitations` não conta) saiu da lista no `/review`, que o confirmou por
leitura. Reconferi: o mapa `RATE_LIMITED_METHODS` só tem `["POST"]` para esse caminho, e `methods.includes("HEAD")` é
falso.

### Teste de mutação

Antes de mutar, copiei as três rotas para `/tmp/og-mut/` e anotei o `shasum`. Cada mutação foi aplicada sozinha, os
testes rodaram e o arquivo voltou da cópia. Os três `shasum` depois da restauração são iguais aos de antes:
`c3069f1c…` (`users/[id]/route.ts`), `5d76b002…` (`proxy.ts`), `f6ee6faa…` (`organization/invitations/route.ts`).

| mutação | arquivo de teste | resultado |
|---------|------------------|-----------|
| `ownsOrganizationWithMembers(profile.reference_id)` em `users/[id]/route.ts:191` | `usersAdminArchiveAccess.test.ts` | 2 falhas, 9 passando: "refuses to archive the owner…" e "archives an owner who is alone…" |
| `["POST", "GET"]` em `proxy.ts:82` | `proxyArcjetKey.test.ts` | 1 falha, 6 passando: "lets the owner's invitation table through…" |
| `email` acrescentado ao `logEvent` em `organization/invitations/route.ts:81` | `organizationInvitationsRoute.test.ts` | 2 falhas, 21 passando: os dois casos de `503` |

## Cobertura e comandos

| comando | resultado |
|---------|-----------|
| `pnpm --filter api exec vitest run __tests__/usersAdminArchiveAccess.test.ts __tests__/usersAdminDeleteBilling.test.ts __tests__/usersAdminAuditTrail.test.ts __tests__/mergedUserPayload.test.ts` | 4 arquivos, 60 testes passando |
| `pnpm --filter api exec vitest run __tests__/organizationInvitationsRoute.test.ts` | 23 passando |
| `pnpm --filter api exec vitest run __tests__/proxyArcjetKey.test.ts` | 7 passando |
| `pnpm --filter api test` | 122 arquivos, 1643 testes passando |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes passando (inclui `parity.test.ts`) |
| `pnpm --filter api typecheck` | exit 0 |
| `pnpm test` (raiz, com `JAVA_HOME=/opt/homebrew/opt/openjdk@21`) | exit 0; 15 tasks, 4 do cache; 1m9s; 343 arquivos e 4015 testes passando |

Contagem por workspace no `pnpm test` da raiz: `api` 1643, `api:test:emulator` 265 (7 arquivos), `app` 1099,
`@repo/email` 208, `web` 207, `@repo/design-system` 171, `@repo/auth` 136, `@repo/internationalization` 67,
`@repo/shared` 56, `@repo/security` 45, `@repo/analytics` 34, `@repo/next-config` 32, `@repo/payments` 22, `e2e` 16,
`@repo/sdk` 14. Rodei sem `--force`.

Não remedi `pnpm check`: esta etapa não alterou arquivo de código. Vale o número do `/review` ("Checked 1047 files …
No fixes applied").

A cópia dos dois códigos foi conferida no dicionário: 6 ocorrências em
`translations/packages/shared/utils.ts` (dois códigos em três idiomas). `FormattedError.apiResponseMessage`
(`packages/shared/utils/helpers/formattedError.ts:60-85`) devolve `apiErrors[code]` quando o código existe; o
`deleteUserMutation` de `useUserCrud.tsx:142` e o `inviteMutation` de `useOrganizationActions.tsx:40` passam o erro
por esse caminho.

## Critérios de aceite

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | Admin não arquiva dono de equipe com outros membros | ✅ | rota (`usersAdminArchiveAccess`), mutação 1, leitura da cadeia de ids (`ownerUserId` e id do vínculo gravados com o id do documento em `organization-member.repository.ts:37-50`) e da ausência de leitura da variável de membros |
| 2 | Dono sozinho e perfil sem organização continuam arquiváveis | ✅ | rota (ordem `disable → revoke → delete`) e unitário do helper (`organizationMembership.test.ts`, três casos) |
| 3 | Ordem das recusas do arquivamento | ✅ | rota (404 e 403 sem chamar o helper; nenhum efeito antes do 409) e mutação 1 |
| 4 | Bloquear o dono continua possível | ✅ | leitura (o `PUT` não chama o helper; a única chamada está na linha 191) e casos existentes de `disabled: true` passando |
| 5 | Mensagem do arquivamento recusado nos 3 idiomas | ✅ | paridade de i18n e leitura do dicionário e do `FormattedError` |
| 6 | A tabela de convites não gasta a cota | ✅ | proxy com limitador mockado (`GET` passa, `OPTIONS` 204, sem chamar o limitador; sem chave, no-op) e mutação 2 |
| 7 | O convite continua limitado | ✅ | proxy (`POST` 429 com `Retry-After`; `GET /account/export` 429); 17 caminhos contados em `proxy.ts:60-78`; `docs/SECURITY.md:163` diz que só o `POST` conta |
| 8 | Falha do Auth ao conferir o convidado responde com código | ✅ | rota (Auth e Firestore falhando → 503, `issue` e `sendEmail` não chamados) |
| 9 | Log da falha sem dado pessoal | ✅ | rota (log sem endereço, sem e-mail do dono e sem mensagem) e mutação 3 |
| 10 | Mensagem do convite que falhou nos 3 idiomas | ✅ | paridade de i18n e leitura |
| 11 | Comportamento anterior preservado no convite | ✅ | rota (casos existentes de 201, 409, 403, personificação, 503 sem e-mail, 429 e teto) |
| 12 | Paridade de i18n e gates | ✅ | comandos acima |
| 13 | Rate limit real da Arcjet | 🔒 | exige `ARCJET_KEY` válida |
| 14 | Falha real do Firebase Auth | 🔒 | o emulador não produz a falha |

## Decisões de custo de teste

Não criei teste. Por arquivo tocado:

- `users/[id]/route.ts` (`DELETE`): a rota mockada em `usersAdminArchiveAccess.test.ts` cobre a recusa, a ordem e o id
  passado ao helper, e a mutação 1 mostrou que ela pega a troca de id. O helper já tem três casos com repositório
  mockado. Não subi API e emulador para o `curl` opcional do §8 do plano: as duas consultas do helper são de campo
  único (`ownerUserId ==` e `organizationId ==`), sem índice composto nem limite de `in`, e o helper já roda na
  exclusão pelo titular. Isso fica fora da lista de casos que justificam a faixa cara.
- Membro arquivado contando (🟡): não escrevi teste. Um teste agora fixaria um comportamento que o backlog ainda vai
  decidir se é defeito; a leitura basta como evidência do achado.
- `proxy.ts`: o `proxyArcjetKey.test.ts` cobre `GET`, `OPTIONS`, `POST` e um caminho sem exceção. O `429` real exige a
  Arcjet de verdade, que não tem emulador.
- `organization/invitations/route.ts`: os dois casos de `503` cobrem a falha do Auth e a do Firestore, com o log. A
  falha real do Auth não se reproduz sem mock.
- `apiErrors`: a paridade cobre os dois códigos.

O `test:emulator` rodou dentro do `pnpm test` da raiz (265 testes) e não ganhou caso novo.

## Browser

Não abri o `agent-browser`. O diff não muda nada em `apps/app`, `apps/web` nem `packages/design-system`: os dois
códigos novos chegam às telas existentes pelo `FormattedError`, e a cópia foi conferida no dicionário e na paridade.
Pela política do ciclo, diff sem superfície de UI não sobe app.

## Ambiente do e2e

Antes de rodar, as portas 3000, 3001, 3002, 3003, 9099, 8080, 9199, 4000 e 4001 estavam livres. Não subi app, API nem
emulador manualmente. O `test:emulator` dentro do `pnpm test` subiu os emuladores pelo próprio runner
(`scripts/emulator-tests.mjs`, via `firebase emulators:exec`) e os derrubou no fim; depois do comando, 9099, 8080,
9199, 4000, 4001, 4400 e 4500 estavam livres. O JDK 21 veio de `/opt/homebrew/opt/openjdk@21`, exportado só no
comando (o `java` do `PATH` é o 17).

## Lacunas herdadas

| lacuna (origem) | veredito |
|-----------------|----------|
| `isMemberOfOrganization` com erro do Auth diferente de `user-not-found` (PR #57) | fechada no `/develop`, reconfirmada aqui: o caso de `503` passa e a mutação 3 o derruba |
| Promoção a admin do dono de organização com membros (`users/[id]/route.ts:138-140`) | fora de escopo, continua aberta no backlog |
| Outros `500` sem `error.code`, incluindo falha do Firestore dentro do helper no `DELETE` (🟢 do `review.md`) | fora de escopo, continua aberta |
| `ownsOrganizationWithMembers` contando perfil arquivado (🟡 do `review.md`) | continua aberta; comportamento confirmado por leitura, vai para o backlog |
| Variável de membros desligada trava o arquivamento do dono (🟢 do `review.md`) | continua aberta; confirmado por leitura que nem a rota nem o helper consultam a variável |
| Helper real contra o Firestore no `DELETE` (handoff) | fora de escopo por custo, com o motivo acima |
| `HEAD /organization/invitations` (R2 do plano) | fechada por leitura no `/review` e reconferida aqui |
| 🔒 `429` real da Arcjet e falha real do Auth | continuam abertas, dependem de infra externa |

## Estado de dev e dados de QA

Nenhum dado criado nem apagado. Nenhuma conta de QA criada; as contas `qa-organization-guardrails-*@example.com`
previstas no plano não foram usadas porque o passo do emulador não rodou. Os emuladores do `test:emulator` usam o
projeto `demo-next-boilerplate` e morrem com o processo.
