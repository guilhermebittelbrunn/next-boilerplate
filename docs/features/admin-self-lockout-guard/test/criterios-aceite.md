# Critérios de Aceite (Checklist)

Status de cada critério depois do `/test`: ✅ verificado e correto, ❌ falhou, 🔒 não verificável sem infra
externa. O meio de verificação e o valor medido de cada um estão em `report.md`.

- [x] **O admin não consegue desativar a própria conta pela API** ✅
  `PUT /users/:id` com `disabled: true`, quando o perfil alvo tem o mesmo uid do admin que chama, responde
  `403 { error: { code: "USERS_SELF_LOCKOUT_FORBIDDEN" } }`. Nada é gravado: o Firebase Auth não recebe
  `updateUser`, as sessões não são revogadas e nenhum evento de auditoria é registrado. Depois da recusa o
  admin segue com acesso ao painel: a requisição seguinte com o mesmo token responde 200 e um login novo
  pelo formulário entra em `/admin`.

- [x] **O admin não consegue rebaixar o próprio tipo** ✅
  `PUT /users/:id` sobre a própria conta com `type: "common"` responde 403 com o mesmo código, e o documento
  `user` continua com `type: "admin"`. Se o corpo misturar o rebaixamento ou a desativação com `displayName`,
  o pedido inteiro é recusado e o nome também não muda (segue `null` no perfil do seed).

- [x] **O admin não consegue arquivar a própria conta** ✅
  `DELETE /users/:id` sobre a própria conta responde 403 com o mesmo código. O perfil continua com
  `deletedAt: null`, nada vai para a trilha de auditoria e a assinatura do admin, se existir, não é
  cancelada (`getStripe` e `subscriptions.cancel` não são chamados). Sem essa recusa, o login seguinte
  criaria um perfil comum novo para o mesmo uid.

- [x] **Edições inofensivas sobre si continuam funcionando** ✅
  `PUT` sobre a própria conta com `type: "admin"` e `displayName`, só com `displayName`, ou com
  `disabled: false` responde 200 com o usuário mesclado. O formulário de edição manda `type` em toda
  gravação: trocar o próprio nome pela tela envia `{"type":"admin","displayName":"..."}`, a API responde 200,
  aparece o toast de sucesso e o tipo segue "Administrador" na listagem.

- [x] **A regra vale para a conta, não para o documento** ✅
  Um perfil com `id` diferente do perfil do ator, mas com o mesmo `reference_id` (uid), é tratado como a
  própria conta. Desativar, rebaixar e arquivar por ele também respondem 403 `USERS_SELF_LOCKOUT_FORBIDDEN`.

- [x] **Agir sobre outro admin continua permitido** ✅
  Desativar, reativar, rebaixar e promover outro admin (uid diferente) respondem 200, e arquivar responde
  204 (este último medido no teste de rota, não contra o emulador).
  O painel não ganha regra de último admin. Fica aceita a corrida em que dois admins se desativam ao mesmo
  tempo, registrada como decisão em aberto na revisão.

- [x] **A ordem das respostas de erro se mantém** ✅
  Perfil inexistente responde `404 USERS_NOT_FOUND` no `PUT` e no `DELETE`, antes de qualquer checagem sobre
  si. Corpo vazio sobre a própria conta responde `400 USERS_NOTHING_TO_UPDATE` e corpo inválido
  `400 VALIDATION_FAILED`, não 403. Personificando um usuário comum, o guard responde
  `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` antes do handler, mesmo para `disabled: true` sobre si.

- [x] **A listagem não oferece os controles na linha do próprio admin** ✅
  Em `/admin/users`, a linha do admin logado mostra o switch de status desabilitado e ligado, com a
  explicação no `title` ("Você não pode desativar a sua própria conta.", "You can't disable your own
  account.", "No puedes desactivar tu propia cuenta."), e o menu de ações só com "Editar". As demais linhas,
  inclusive a de outro admin, mantêm o switch habilitado e o menu com "Editar" e "Arquivar". Enquanto o
  usuário logado ainda não foi resolvido, nenhuma linha é tratada como própria e a API é a proteção.

- [x] **O formulário não deixa o admin trocar o próprio tipo** ✅
  Na edição do próprio perfil, o select de tipo aparece desabilitado com "Administrador" e uma linha de
  explicação nos 3 idiomas ("Você não pode tirar o seu próprio acesso de administrador.", "You can't remove
  your own admin access.", "No puedes quitar tu propio acceso de administrador."). O campo de nome segue
  editável e salvar dá o toast de sucesso. Na edição de outro admin ou de um usuário comum, o select fica
  habilitado e a linha não aparece. A criação de usuário não muda.

- [x] **O erro tem texto nos 3 idiomas** ✅
  `USERS_SELF_LOCKOUT_FORBIDDEN` existe em `apiErrors` em pt-br, en e es, e o teste de paridade passa. Se a
  recusa chegar à tela (aba antiga, corrida), o toast mostra o texto traduzido e o switch volta ao estado
  anterior pelo rollback da mutation otimista. Arquivar a si mesmo pela mutation também mostra o texto
  traduzido e não mexe no cache da listagem. Pela tela esse caminho não é alcançável, porque os controles
  somem.

- [x] **Tema e responsivo** ✅
  O switch desabilitado e a linha de explicação do formulário ficam legíveis em light e dark: o switch cai
  para 50% de opacidade e a linha tem contraste de 4,54:1 no light e 5,86:1 no dark. No mobile (390 px) o
  menu da linha própria continua abrindo só com "Editar", e a linha de explicação quebra em duas linhas sem
  estourar a largura. O axe (WCAG 2.0/2.1 A e AA) não aponta violação em `/pt-br/admin/users` no dark com o
  switch desabilitado.

- [ ] **Teclado e leitor de tela na linha própria e no formulário** 🔒
  O switch desabilitado sai da ordem de tabulação: o Tab vai do menu de ações da linha anterior direto para
  o menu da linha própria, então quem navega por teclado não ouve o `title`. O nome acessível do switch é o
  `aria-label` ("Usuário ativo: <nome>"). No formulário, o `aria-describedby` do select aponta para um id que
  não existe na página, e a linha de explicação não está ligada a ele. O que um leitor de tela anuncia não
  foi medido, porque esta passada não rodou leitor de tela.
