# Critérios de Aceite (Checklist)

Critérios do `analyze/plan.md` §9, revisados no `/test`. O critério 20 é novo: o plano o descrevia em 5.4 e na
decisão D10, mas não o listava. O status de cada item, nas duas rodadas, está em `test/report.md`.

- [ ] **1. Usuário comum recém-cadastrado é desviado para o onboarding**
  Uma conta criada por e-mail/senha ou Google, ao entrar na área comum, é redirecionada no servidor para
  `/{locale}/onboarding` antes de qualquer página do painel renderizar. O redirect acontece num salto só
  (`307` emitido pelo layout comum), sem página intermediária do painel e sem redirect feito pelo cliente.
  Entrando pela home, a URL do onboarding não carrega `?redirect=`.

- [ ] **2. O perfil novo nasce com o estado inicial**
  O documento criado em `createDefaultUserProfile` e em `POST /auth/sign-up` traz
  `onboarding: { step: "profile", completedAt: null }`. Contas criadas pelo admin em `POST /users` não
  recebem o campo e contam como concluídas, assim como as contas do seed.

- [ ] **3. Progresso visível**
  Cada tela mostra "Passo X de 2" traduzido e uma barra de progresso coerente com o passo (metade no passo 1,
  cheia no passo 2). Os textos existem nos 3 idiomas e seguem o locale da URL.

- [ ] **4. Nome de exibição é obrigatório**
  O passo 1 não mostra "Pular". Nome vazio ou só com espaços mostra a mensagem de validação traduzida e não
  chama a API; acima de 120 caracteres também é recusado com mensagem própria. Um
  `POST /account/onboarding` forjado com `{ step: "profile", outcome: "skipped" }` responde 400
  `ONBOARDING_STEP_NOT_SKIPPABLE`.

- [ ] **5. Nome é salvo pelo endpoint de conta existente**
  Concluir o passo 1 grava o nome por `PUT /account` antes de avançar o passo, e `GET /account` passa a
  devolvê-lo. Nenhum campo de coleta novo aparece no `UserDTO`.

- [ ] **6. Idioma é pulável e salvo quando escolhido**
  O passo 2 mostra "Pular". Concluir grava `preferences.locale` por `PUT /account`; pular não altera a
  preferência e conclui o fluxo do mesmo jeito, levando ao destino no locale da URL.

- [ ] **7. Retomável**
  Recarregar, fechar a aba ou sair e entrar de novo no meio do fluxo reabre no passo em que parou, com o
  nome já preenchido quando o passo 1 foi concluído. O passo vem do servidor e não da URL, então editar a
  URL não pula passo.

- [ ] **8. Deep link preservado**
  Quem pediu `/{locale}/qualquer/rota` com o onboarding pendente vai para
  `/{locale}/onboarding?redirect=%2F{locale}%2Fqualquer%2Frota` e, ao concluir, cai na rota pedida. Sem
  deep link (entrada pela home), a URL do onboarding não carrega `?redirect=` e o destino é `/{locale}`. A
  query string da rota pedida não é preservada, porque o proxy repassa só o `pathname`.

- [ ] **9. Troca de idioma leva o destino junto**
  Se o passo 2 foi concluído com um idioma diferente do da URL, o destino final usa o novo locale, o cookie
  `x-locale` é gravado e o `<html lang>` e os textos já aparecem no idioma novo. Pular o passo mantém o
  locale da URL.

- [ ] **10. Concluído nunca mais é interceptado**
  Depois de concluir, `completedAt` fica preenchido e nenhuma entrada no painel desvia de novo, inclusive
  depois de sair e entrar. Abrir `/{locale}/onboarding` à mão leva ao destino. "Voltar" no navegador depois
  de concluir não prende o usuário no onboarding.

- [ ] **11. Perfil legado entra direto**
  Um perfil sem o campo `onboarding` (criado antes da feature ou pelo seed) nunca é desviado, inclusive com
  `?redirect=` no login, e `POST /account/onboarding` responde 200 com `data: null` sem escrever nada.

- [ ] **12. Admin e impersonação não são interceptados**
  Admin continua indo para `/{locale}/admin`. Admin personificando um usuário pendente vê o painel comum
  dele sem desvio, inclusive em deep link, e `/onboarding` o manda para o destino. `POST /account/onboarding`
  responde 403 `COMMON_PANEL_FORBIDDEN` para admin e 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` sob
  impersonação, sem alterar o estado do usuário personificado.

- [ ] **13. Sem open redirect e sem laço**
  `?redirect=` com URL absoluta, `//host`, caminho sem locale ou apontando para `/onboarding` (com ou sem
  query e hash) cai no fallback `/{locale}`. Nenhuma combinação de estado e `?redirect=` produz redirect em
  laço. Um `x-app-path` enviado pelo navegador é sobrescrito pelo proxy.

- [ ] **14. Transição fora de ordem é recusada e a tela se ressincroniza**
  Um `POST` com passo à frente do atual responde 409 `ONBOARDING_STEP_OUT_OF_ORDER`; a tela mostra a
  mensagem traduzida e passa a exibir o passo que o servidor registra, sem o usuário recarregar a página. O
  nome já salvo continua preenchido e o fluxo pode ser concluído a partir dali. Um `POST` com passo anterior
  ao atual responde 200 com o estado atual, sem escrita, e a tela vai para o passo certo. Clicar de novo
  depois do 409 não pode repetir o erro.

- [ ] **15. Clique duplo não gera erro**
  Dois cliques rápidos em "Continuar" ou "Pular" produzem uma transição só (um `PUT /account` e um
  `POST /account/onboarding` no passo 1; um `POST` no "Pular"). O primário fica bloqueado durante o envio.

- [ ] **16. Validação do corpo na API**
  Passo desconhecido, `outcome` fora de `completed`/`skipped`, corpo vazio, corpo que não é JSON ou com
  chave extra (`id`, `uid`) respondem 400 `VALIDATION_FAILED`. Sem sessão, 401 `AUTH_INVALID_TOKEN`. Falha
  de escrita no Firestore responde 500 `ONBOARDING_UPDATE_FAILED`, nunca stack trace.

- [ ] **17. Interruptor desliga tudo sem tocar em auth**
  Com `ONBOARDING_ENABLED="false"`, o app sobe, ninguém é desviado e `/onboarding` leva ao destino; o perfil
  criado nesse período continua com o estado pendente. Com a variável vazia, ausente ou `"true"`, o
  onboarding fica ligado e essa mesma conta passa a ser desviada. Nenhum guard de autenticação muda.

- [ ] **18. Erros traduzidos**
  Os três códigos novos têm texto em pt-br, en e es em `apiErrors`, e o teste de paridade passa. O toast do
  409 aparece no idioma da tela.

- [ ] **19. Tema e responsivo**
  As duas telas funcionam em light, dark e mobile (375 px) sem rolagem horizontal, com o formulário e os
  botões alcançáveis sem rolar numa tela de 667 px de altura.

- [ ] **20. O idioma pré-selecionado no passo 2 é o da URL**
  O passo 2 pré-seleciona o locale da tela em que o usuário está, e não a preferência que `GET /account`
  devolve (a API preenche `pt-br` quando o perfil não tem preferência gravada). Quem lê a tela em inglês e
  clica em "Finish" sem mexer no campo continua em `/en/...`, com `x-locale=en`, `<html lang="en">` e
  `preferences.locale` gravado como `en`; o mesmo vale para `/es`. Uma conta com onboarding pendente não
  chega à área de conta, então a preferência gravada não tem por onde divergir da tela durante o fluxo.
