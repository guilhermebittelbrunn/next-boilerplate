# Critérios de Aceite (Checklist)

Escopo: só `apps/api`. Sem tela, rota, guard, `error.code` ou chave de i18n novos. Autorização,
ownership, modo de produto, tema, responsivo e idiomas não se aplicam: o diff não muda quem acessa o quê
nem o que aparece na tela.

- [x] **`findByStripeCustomerId` devolve datas como `Date`**
  Um perfil vivo com `createdAt`, `updatedAt` e `subscription.lastEventAt` gravados como `Timestamp` volta
  com esses campos como instâncias de `Date`, no mesmo instante. O teste correspondente reprova contra o
  código anterior à correção e passa depois dela.

- [x] **Semântica de busca do webhook preservada**
  `findByStripeCustomerId` continua consultando só por `stripeCustomerId`, ignora perfil com `deletedAt`
  preenchido e aceita perfil sem o campo `deletedAt`. Com dois perfis para o mesmo cliente, um apagado e
  um vivo, devolve o vivo. Sem correspondência, devolve `null`.

- [x] **`findByReferenceId`, `findById` e `findAll` passam pelo mapper**
  Os três devolvem todos os instantes como `Date` quando o documento traz `Timestamp`, inclusive os
  aninhados (`onboarding.completedAt`, `subscription.currentPeriodEnd`, `subscription.lastEventAt`,
  `entitlements.lastEventAt`). Perfil apagado continua resultando em `null` em `findById` e
  `findByReferenceId`.

- [x] **Campos ausentes continuam ausentes**
  Perfil sem `onboarding`, `lastAccessAt` ou `subscription` não ganha esses campos depois do mapper, nem
  com `null`. "Sem onboarding" continua querendo dizer fluxo concluído, e "sem `lastAccessAt`" continua
  querendo dizer que o usuário nunca acessou. `deletedAt: null` e `subscription.currentPeriodEnd: null`
  continuam `null`.

- [x] **Campos fora do tipo passam intactos**
  Qualquer campo do documento que não é instante, inclusive os que não estão em `UserDTO`, chega ao
  chamador com o mesmo valor. O mapper não descarta nada.

- [x] **Respostas HTTP inalteradas para instantes gravados como `Timestamp` ou ISO completa**
  Contra o Firestore real, `serializeFirestoreData` aplicado ao resultado de `findById` e ao item de
  `findAll()` é igual, campo a campo, ao que o código anterior serializava a partir do snapshot cru. Isso
  vale para perfil com `Timestamp` em todos os instantes e para perfil com instante gravado como string
  ISO completa.

- [x] **Instante gravado como data sem hora passa a sair como meia-noite UTC**
  Um instante salvo como `"2026-01-02"` sai serializado como `"2026-01-02T00:00:00.000Z"`, onde antes saía
  como estava. É mudança de contrato aceita: nenhum escritor do perfil grava instante nesse formato, e os
  leitores no `apps/app` interpretam o valor com `Date.parse`/`new Date`, que dão o mesmo instante para as
  duas formas.

- [x] **Um `Date` lido e regravado volta ao Firestore como `Timestamp`**
  Ler o perfil, mandar `onboarding` de volta por `userRepository.update` e reler o documento cru mostra
  `onboarding.completedAt` como `Timestamp`, no mesmo instante.

- [ ] **Webhook da Stripe real acha o perfil por `stripeCustomerId`**
  Com `stripe trigger` contra uma chave de teste, o webhook encontra o perfil vivo e ignora o apagado.
  Não verificado: não há chave de teste da Stripe neste ambiente. A query não mudou nesta tarefa.

- [x] **Gates verdes**
  `pnpm --filter api typecheck`, `pnpm check`, `pnpm --filter api test`, `pnpm --filter api test:emulator`
  e `pnpm test` da raiz passam.
