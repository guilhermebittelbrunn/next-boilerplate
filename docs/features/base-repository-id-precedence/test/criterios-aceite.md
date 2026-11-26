# Critérios de aceite: o id do documento vence no BaseRepository

Escopo: `apps/api/(shared)/repositories/base.repository.ts`. Não há superfície de UI, i18n, modo de produto nem papel de usuário envolvido. Autorização entra só pelo critério 4, porque o perfil que o guard resolve define a posse.

- [x] **O id do documento vence em toda leitura com mapper**
  Um documento com `id` gravado no corpo, lido por `findById`, `findAll` ou `paginate` de um repositório com mapper, sai com o id do documento. O campo do corpo não aparece no DTO.

- [x] **O id do documento vence nas leituras sem mapper**
  `findAll` e `paginate` de um repositório sem mapper (`organization`, `paidInvoice`, `paymentEvent`, `planLabel`) devolvem o id do documento mesmo com `id` no corpo. O `findById` sem mapper continua devolvendo o id do documento, como já fazia antes da mudança.

- [x] **O retorno do create traz o id gerado pelo Firestore**
  Se um payload chegar ao `create` com `id` (só por cast, porque `CreateRequest` omite o campo), o DTO devolvido traz o `docRef.id`. O que fica gravado no corpo não muda nesta tarefa.

- [x] **O perfil resolvido pelo guard não troca de identidade**
  `userRepository.findByReferenceId` devolve o id do documento do perfil mesmo que o corpo tenha o `id` de outro perfil. Assim um campo no documento não consegue forjar o `subjectProfile.id`, que define a posse de entidades, membros e notificações. Vale para o fake em memória e para um documento real lido do emulador do Firestore.

- [x] **Documentos normais não mudam**
  Para documentos sem `id` no corpo, que são todos os gravados pelo código atual, a saída dos repositórios é a mesma de antes. As suítes `test` e `test:emulator` da `apps/api` passam sem alterar teste existente.

## Roteiro manual

Não se aplica. A mudança não tem tela nem rota nova, e todos os critérios têm teste automatizado que reprova a versão anterior do código.
