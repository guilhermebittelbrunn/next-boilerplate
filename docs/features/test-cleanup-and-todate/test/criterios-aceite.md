# Critérios de Aceite (Checklist)

Tarefa direta `test-cleanup-and-todate`. Os critérios partem da §9 do plano; o status de cada um, com o instrumento
que o mediu, está no `test/report.md`. A mudança não tem superfície de UI: nenhum critério depende de browser, tema,
idioma ou responsivo.

- [x] **A limpeza do Testing Library vale para todo teste da `app`**
  `apps/app/vitest.config.mts` aponta `setupFiles` para `vitest.setup.ts`, que registra `afterEach(cleanup)`. O teste
  `testingLibraryCleanup.test.tsx` renderiza num `it` e, no seguinte, encontra `document.body` sem filhos sem chamar
  `cleanup`. Sem o `setupFiles`, o segundo `it` cai com `expected 1 to be +0`, o que prova que é a configuração que
  limpa.

- [x] **Ligar a limpeza não perde nem afrouxa teste**
  `pnpm --filter app test` roda 155 arquivos e 1405 testes, sem teste pulado. A suíte rodada sem o `setupFiles` tem os
  mesmos 155 arquivos com a mesma contagem de testes por arquivo; a única diferença é o segundo `it` do canário, que
  cai. Nenhum arquivo do repositório usa `RTL_SKIP_AUTO_CLEANUP`.

- [x] **As chamadas manuais de `cleanup` continuam funcionando**
  Os arquivos que chamam `cleanup` por conta própria passam sem edição. A chamada no meio de um teste
  (`usersListLastAccess.test.tsx:314`) segue limpando naquele ponto: o arquivo rodado isolado passa 10 de 10, e a
  limpeza global que roda depois dela não lança.

- [x] **Uma só função decide o que é um instante legível**
  `readFirestoreInstant` em `@repo/shared` devolve `Date` para `Date` válido, string que o `Date` entende e objeto com
  `toDate()` que devolve data válida. Devolve `null` para `Date` inválido, string ilegível, `toDate()` que devolve data
  inválida ou algo que não é `Date`, `null`, `undefined`, número, array e objeto sem `toDate`. Não há mais
  `instantOf`, `toIsoInstant` nem `typeof ...toDate === "function"` em `user.mapper.ts`,
  `organization-invitation.repository.ts` e `onboarding.ts`.

- [x] **O mapper de usuário não muda de comportamento**
  `toDate` em `user.mapper.ts` delega a leitura e devolve o valor original quando ela falha. `userMapper.test.ts` não
  tem diff e passa dentro da suíte da api.

- [x] **O convite falha fechado com validade ilegível**
  Na aceitação, `expiresAt` com `Date` inválido, string ilegível, `toDate()` inválido ou ausente vira `expired`, que a
  rota traduz para `ORGANIZATION_INVITATION_EXPIRED`. Na contagem de pendentes do `issue`, um convite com validade
  ilegível não conta contra o limite; um convite com validade futura gravada como string ISO conta. No reenvio, um
  convite cuja validade ou cujo último envio não se lê pode ser reenviado. `organizationInvitationsRoute`,
  `invitationsRoutes` e `organizationInvitation.emulator.test.ts` seguem verdes.

- [x] **O `completedAt` do onboarding sai sempre em ISO completo**
  `"2026-01-02"` sai `"2026-01-02T00:00:00.000Z"`. `null` continua `null`. Valor ilegível, incluindo `toDate()` que
  devolve data inválida, torna o estado inteiro `null` em vez de lançar `RangeError`.

- [x] **`normalizeFirestoreInstant` não muda**
  O diff do arquivo tem 18 linhas adicionadas e nenhuma removida: só a função nova entra.

- [x] **Gates do working tree inteiro verdes**
  `pnpm test` na raiz (com `test:emulator`, JDK 21) e `pnpm turbo run lint typecheck` passam com as cinco tarefas da
  branch juntas no working tree.

## Roteiro manual

Não há. A mudança só aparece com dado malformado no Firestore, que a api não grava, e na configuração da suíte da
`app`. Os passos de repro estão no `test/report.md`, todos por linha de comando.
