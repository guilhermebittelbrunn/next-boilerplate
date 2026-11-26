# Critérios de Aceite (Checklist)

Status medido no `/test` de 2026-11-25, contra o emulador (Auth, Firestore e Storage) com `next dev`. Legenda:
✅ medido e passou, ❌ medido e falhou, 🔒 não verificável sem infra externa (com o que cobre no lugar). O
detalhe de cada medição está em `report.md`.

- [x] **"Minha conta" leva o admin para a área de conta do painel admin** ✅ e2e
  Logado como admin sem personificação, o item "Minha conta" do menu do avatar aponta para `/{locale}/admin/account` e abre a tela sem redirecionar para `/{locale}/admin`. O menu lateral do admin tem a entrada "Minha conta" (My account, Mi cuenta) que leva ao mesmo endereço, e a aba do navegador mostra o título da página com a marca.

- [x] **A área do admin tem só Perfil, Segurança e Preferências** ✅ e2e + unit
  A navegação lateral (desktop) e o select (mobile) listam exatamente três seções, nos modos `subscription` e `simple`. Abrir `?tab=billing`, `?tab=privacy`, `?tab=xyz` ou sem `tab` cai em Perfil e regrava a URL para `?tab=profile`, preservando outros parâmetros, como na conta comum. (Medido em `subscription`; `simple` coberto por `accountTabs.test.tsx`.)

- [x] **O admin edita nome e telefone e o valor persiste** ✅ e2e (telefone vazio → `null` só em unit)
  Salvar nome e telefone mostra o toast de perfil atualizado, e depois de recarregar os campos trazem os valores novos e o menu do avatar mostra o primeiro nome novo. Nome vazio ou só com espaços é barrado pelo formulário com a mensagem traduzida, sem requisição. Telefone vazio grava `null`.

- [x] **O admin troca o avatar com as mesmas regras da conta comum** ✅ e2e + HTTP (modo sem bucket só em unit)
  Com bucket configurado, o upload grava o objeto em `uploads/<id do perfil do admin>/` e o `PUT /account` aceita a referência; depois de recarregar a imagem aparece no formulário e no menu do avatar. Uma referência de outro prefixo ou de host fora da lista permitida responde `400 ACCOUNT_AVATAR_INVALID` com a mensagem traduzida. Sem bucket, o campo vira URL com a dica, como na conta comum, e o upload responde `503 STORAGE_NOT_CONFIGURED`.

- [x] **O admin não troca o e-mail pela área dele** ✅ e2e + HTTP
  O bloco de e-mail mostra o endereço só leitura, sem o botão de troca e sem o texto de "não suportado". A rota `POST /account/email` continua recusando o admin sem personificação com `403 COMMON_PANEL_FORBIDDEN`.

- [x] **O admin troca a própria senha pedindo a senha atual** ✅ e2e + HTTP
  A seção Segurança mostra só o formulário de senha (senha atual, nova, confirmação). Senha atual errada responde `ACCOUNT_CURRENT_PASSWORD_INVALID` com toast traduzido nos três idiomas e nada muda; confirmação diferente ou senha fora da política é barrada antes da requisição. Com tudo certo, a senha muda, todas as sessões da conta são encerradas, o navegador sai, e o login com a senha nova funciona. Clique duplo no salvar não envia duas trocas, porque o botão fica em carregamento. (Toast medido em pt-br; en/es pela paridade de `apiErrors`.)

- [ ] **Admin sem senha (só Google) define uma senha** 🔒 unit
  Para um admin cuja conta não tem o provedor de senha, a seção Segurança mostra o formulário de definir senha no lugar da troca. A definição exige o reauth do Google e passa pelas mesmas recusas da conta comum (`ACCOUNT_REAUTH_INVALID`, `ACCOUNT_PASSWORD_ALREADY_SET`). (O reauth do Google precisa de um provedor real; coberto por `accountPasswordSetRoute.test.ts` e `accountSecurityForm.test.tsx`.)

- [x] **A área do admin não mostra sessões, métodos de login nem "Sair de todos os dispositivos"** ✅ e2e + HTTP + unit
  Nenhum desses blocos é montado, e o navegador não faz requisição a `/account/sessions` nem a `/account/sign-in-methods/*` ao abrir a seção. As rotas continuam recusando o admin com `403 COMMON_PANEL_FORBIDDEN`.

- [x] **Tema e idioma salvos valem no painel admin** ✅ e2e
  Trocar para tema escuro e idioma `en` e salvar mostra o toast, navega para `/en/admin/account?tab=preferences` e aplica o tema e o idioma. Depois de recarregar, e depois de sair e entrar de novo, o admin cai em `/en/admin` com tema escuro. (Sair e entrar medido no mesmo navegador.)

- [x] **A API aceita o admin só sobre a própria conta** ✅ HTTP
  Com o token de um admin, `GET`/`PUT /account`, `POST /account/password` e `POST /account/password/set` operam só sobre o perfil e o uid dele; um id no body é ignorado. Apontar `x-request-user-id` para outro admin responde `403 AUTH_REQUEST_ADMIN_TARGET_INVALID` (papel admin) ou `403 AUTH_REQUEST_IMPERSONATION_TARGET_INVALID` (papel comum), e nada é gravado. (Medido: um `id` no body não é ignorado, é recusado com `400 VALIDATION_FAILED` pelo `.strict()`; nada é gravado, o que atende a intenção.)

- [x] **Personificar continua levando à conta comum, só leitura** ✅ e2e + HTTP
  Como admin personificando um comum, "Minha conta" leva a `/{locale}/account` com os dados do personificado, o aviso de só leitura e os botões desabilitados. Qualquer escrita nas rotas de conta (`PUT /account`, `POST /account/password`, `POST /files`) responde `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY` sem gravar, e digitar `/{locale}/admin/account` manda para `/{locale}`.

- [x] **O painel comum continua fechado ao admin** ✅ e2e + HTTP
  Admin sem personificação que digita `/{locale}/account` continua sendo levado para `/{locale}/admin`. Nas rotas da API que seguem no painel comum (entidades, organização, notificações, sessões, export, deleção, e-mail, métodos de login, onboarding, upload com `?scope=organization`), o admin sem personificação continua recebendo `403 COMMON_PANEL_FORBIDDEN`. (`GET /organization` responde `404 ORGANIZATION_MEMBERS_DISABLED` antes do guard, porque a flag de membros está desligada no ambiente; não é mudança desta feature.)

- [x] **O usuário comum não percebe mudança** ✅ e2e + HTTP
  O comum continua em `/{locale}/account` com as mesmas seções de antes (cinco em `subscription`, quatro em `simple`), troca de e-mail, métodos de login, sessões, "Sair de todos os dispositivos", exportar e excluir conta. O upload de avatar e de foto de registro continua funcionando, e salvar preferências navega para `/{locale}/account?tab=preferences`.

- [x] **Sem credencial a API responde 401** ✅ HTTP
  Sem token, as rotas de conta e o upload pessoal respondem `401 AUTH_INVALID_TOKEN`. Um escopo de upload inválido responde `400 VALIDATION_FAILED` antes de ler o corpo, com ou sem credencial.

- [x] **Texto traduzido, tema e responsivo** ✅ e2e + paridade
  Nenhum texto novo fica fora de `@repo/internationalization`, e as chaves novas existem em pt-br, en e es (teste de paridade verde). A área do admin é legível em claro e escuro, a 375 px (select de seção, sem rolagem horizontal) e a 1280 px (lista lateral, coluna estreita centralizada), e o esqueleto de carregamento ocupa a mesma coluna. (Esqueleto coberto por `adminAccountPage.test.tsx`.)

## Roteiro manual

1. `pnpm emulators` e `pnpm seed`; suba `api` (3002) e `app` (3000) com o `.env.example` de cada um. Contas do seed em `docs/SETUP.md`.
2. Entre como `admin@example.com` → avatar → "Minha conta". Esperado: `/pt-br/admin/account?tab=profile`, título "Minha conta | <marca>", três seções.
3. Abra `?tab=billing&foo=1`. Esperado: URL vira `?tab=profile&foo=1`.
4. Perfil: apague o nome e salve. Esperado: "Informe o nome de exibição." sem requisição. Preencha nome, telefone, escolha uma imagem, salve e recarregue. Esperado: valores mantidos, imagem no formulário e no avatar, objeto em `uploads/<id do perfil do admin>/`.
5. Segurança: confirmação diferente → "As senhas não coincidem." sem requisição. Senha atual errada → "A senha atual está incorreta.". Senha certa (clique duplo) → um único `POST /account/password` 200, volta ao login, entra com a senha nova.
6. Preferências: Escuro + English → `/en/admin/account?tab=preferences`, escuro e em inglês; recarregue, saia e entre: `/en/admin`, escuro.
7. Troque o ambiente para "Painel do usuário" (personificação) → "Minha conta" → `/pt-br/account` com o aviso "Modo somente leitura" e "Salvar" desabilitado. Digite `/pt-br/admin/account`: volta a `/pt-br`.
8. Como `user@example.com`: `/pt-br/account?tab=security` mostra métodos de login, senha, sessões e "Sair de todos os dispositivos"; `/pt-br/admin/account` manda para `/pt-br`.
