# Critérios de Aceite (Checklist)

Base: seção 11 do `analyze/plan.md`, expandida no formato da §9.1. Separei o critério de hidratação em dois
(`apps/app` e `apps/web`), porque a web tem um erro de hidratação que não depende de idioma e existe desde
antes desta tarefa, e juntar os dois esconderia o resultado da `apps/app`. O cancelamento real na Stripe
ficou num critério próprio no fim, para a parte medida não ficar atrás do cadeado. O status de cada item,
com o meio de prova, está em `test/report.md`.

- [ ] **SSR em `/en` e `/es` sai no idioma da URL em todo componente client**
  Com a URL em `/en/...` ou `/es/...`, o HTML que o servidor manda já traz os textos dos componentes client
  (sidebar, navbar, breadcrumb, cabeçalho e células de tabela, cartões da home do admin, header da web) no
  idioma do segmento, e não em pt-br. Vale sem cookie `x-locale` (primeira visita) e com `x-locale=pt-br`
  divergente da URL. Rota sem segmento `[locale]` (`not-found`, raiz) cai no padrão pt-br nos dois lados.
  Datas formatadas no cliente, como a coluna de último acesso de `/en/admin/users`, saem no formato do
  idioma já no SSR (`Sep 25, 2026, 3:07 PM` em inglês, `25 sept 2026, 15:07` em espanhol).

- [ ] **Sem erro de hidratação por idioma na `apps/app`**
  Carregar direto `/en/admin`, `/es/admin`, `/en/admin/users`, `/en`, `/en/entities`, `/en/account` e
  `/en/sign-in`, com e sem cookie divergente, não produz "Hydration failed" nem "didn't match" no console,
  e `/pt-br/admin` serve de controle. Em build de produção, nenhum `Minified React error #418`. No
  terminal do `next dev`, nenhuma ocorrência de "Context can only be read while React is rendering" ao
  carregar `/en/admin/users` e `/en/entities`.

- [ ] **Sem erro de hidratação na `apps/web` em `/en` e `/es`**
  A landing em `/en`, `/es` e `/pt-br` hidrata sem "Hydration failed" no console, em `next dev` e em
  `next build && next start`. O header, que é componente client, sai no idioma da URL no HTML do servidor.

- [ ] **Troca de idioma por navegação suave atualiza componentes client e callbacks**
  Pelo `LanguageSwitcher` da navbar, de `/en/entities` para `/es/entities` (e de `/en/admin/users` para
  `/es/admin/users`), a página não recarrega (o estado de `window` sobrevive), e sidebar, breadcrumb,
  cabeçalho e células da tabela passam para espanhol. Toasts disparados depois da troca, tanto de hooks
  da página (criar entidade) quanto do `AuthProvider` que fica acima do segmento (login com sucesso,
  sessão expirada), saem no idioma novo. O redirect do `AuthProvider` usa o locale novo (`/es`,
  `/es/sign-in?redirect=...`).

- [ ] **pt-br sem regressão**
  Em `/pt-br/admin`, `/pt-br/admin/users` e `/pt-br/entities`, os textos e datas saem como antes
  (`Olá`, `25 de set. de 2026, 18:07`), sem aviso novo no console. A paridade de chaves entre pt-br, en e es
  continua passando.

- [ ] **Arquivar usuário sem assinatura: 204, igual a antes**
  Admin arquiva um perfil comum sem `subscription` pela listagem `/admin/users`: a API responde 204, a Stripe
  não é chamada, o toast "Usuário arquivado com sucesso." aparece e o usuário sai da listagem. No Firestore,
  o documento ganha `deletedAt` com o instante do arquivamento. Duplo clique no "Sim" não gera segundo
  DELETE efetivo, porque o diálogo fecha na primeira confirmação.

- [ ] **Arquivar usuário com assinatura viva cancela antes do soft delete**
  Com `subscription.status` em `active`, `trialing`, `past_due`, `unpaid` ou `paused`, a rota chama
  `cancelSubscriptionForErasure` com o `subscriptionId` do perfil antes de `userRepository.delete`. Status
  terminal (`canceled`, `incomplete_expired`) arquiva sem chamar a Stripe. Perfil inexistente responde 404
  `USERS_NOT_FOUND` sem tocar na Stripe.

- [ ] **Stripe desligada com assinatura viva: 503 e o usuário continua ativo**
  Com `STRIPE_SECRET_KEY` vazia na API e um perfil com `subscription.status = "active"`, arquivar responde
  503 `{ error: { code: "USERS_DELETE_BILLING_FAILED" } }`, o documento continua com `deletedAt: null` e a
  assinatura intacta, e o usuário segue na listagem. O toast mostra a mensagem traduzida nos 3 idiomas,
  acompanhada do código de requisição. O log registra `admin-user-delete-billing-failed` com `requestId`
  e `reason=billing-not-configured`, sem dado pessoal. A trilha de auditoria não registra a tentativa.

- [ ] **Falha da Stripe: mesmo resultado da Stripe desligada**
  Se `subscriptions.cancel` lança, a resposta é a mesma 503 `USERS_DELETE_BILLING_FAILED`, o perfil não é
  arquivado e o log leva só `error.name`, nunca a mensagem do provedor.

- [ ] **Assinatura que a Stripe já não tem: arquiva normalmente**
  Quando a Stripe responde `resource_missing` para o `subscriptionId`, `cancelSubscriptionForErasure` trata
  como já cancelada e o arquivamento segue com 204.

- [ ] **Diálogo de arquivamento avisa do cancelamento nos 3 idiomas**
  A confirmação de arquivar mostra, além da frase de antes, "Se houver assinatura ativa, ela é cancelada na
  hora." (pt-br), "If there is an active subscription, it is canceled right away." (en) e "Si hay una
  suscripción activa, se cancela de inmediato." (es). A frase é fixa, porque a listagem não sabe se o
  usuário tem assinatura.

- [ ] **Só admin arquiva**
  O `DELETE /users/[id]` continua atrás de `requireAdminApi`: sem credencial, 401; perfil comum, 403
  `ADMIN_FORBIDDEN`. A mudança não mexe no guard.

- [ ] **Light, dark e mobile sem mudança visual**
  `/en/admin`, `/en/admin/users` e a web `/en` renderizam em light e dark, em desktop (1280 px) e mobile
  (375 px), sem quebra de layout. A tabela antd respeita o tema escuro, e a página não ganha rolagem
  horizontal (a tabela rola dentro do próprio contêiner).

- [ ] **Gates do CI**
  `pnpm turbo run lint typecheck test` passa, e `pnpm test` da raiz, do qual o `turbo build` depende,
  sai verde em todos os workspaces.

- [ ] **Cancelamento real numa conta Stripe de teste**
  Com uma conta Stripe de teste e uma assinatura criada pelo checkout, arquivar o usuário pelo admin cancela
  a assinatura no dashboard da Stripe na hora e o webhook `customer.subscription.deleted` não reativa o
  perfil arquivado. Exige conta no provedor.
