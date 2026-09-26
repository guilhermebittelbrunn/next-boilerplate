# Relatório do `/test`: política de senha (fatia 1 de `account-security-mfa`)

Rodada autônoma do `/cycle`, 2026-09-26. Branch `cycle-full-pipeline-run` (não protegida; o nome proposto
pelo `/review` é `feat/account-security-password-policy`, ainda não criada). Nada foi commitado.

## Placar

| status | critérios |
|--------|-----------|
| ✅ verificado e correto | 16 |
| ❌ falha | 1 (contraste do erro no dark, anterior à fatia e já no backlog) |
| 🔒 sem infraestrutura externa | 3 (Identity Platform, Arcjet, entrega de e-mail) |

Nenhum defeito introduzido por esta fatia. O único ❌ é o token `--destructive` do dark, que o diff não
toca.

Portão do `/review`: o `STATE.md` ainda mostra `review` como `in-progress`. Os commits da feature não
existem (`git log origin/main..HEAD` vazio), então é o estado esperado de um plano de commits aguardando
aprovação, e não um gate esquecido depois de commitar.

## Cobertura automatizada

Todas as suítes rodaram sem `--force`.

| comando | resultado |
|---------|-----------|
| `pnpm test` (raiz, 1ª rodada, antes dos testes novos) | 11/11 tasks, 11 do cache (FULL TURBO), 2092 testes |
| `pnpm --filter app exec vitest run __tests__/signUpFormSubmitLock.test.tsx` | 2/2 |
| `pnpm --filter web exec vitest run __tests__/signUpFormSubmitLock.test.tsx` | 3/3 |
| `pnpm test` (raiz, final) | 11/11 tasks, 9 do cache; exit 0 |
| `pnpm turbo run typecheck --filter=app --filter=web` | 2/2 |
| `pnpm exec biome check` nos dois arquivos novos | sem erro |
| `pnpm --filter e2e exec playwright test tests/signUp.spec.ts` | 5 passed (setup 4 + `signUp.spec.ts`), 54,3 s; `POST /auth/sign-up 201` no log |

Números por workspace no `pnpm test` final: api 935 (74 arquivos), app 656 (82), web 62 (12),
`@repo/auth` 101, `@repo/email` 137, `@repo/internationalization` 59 (inclui a paridade), `@repo/shared`
44, `@repo/analytics` 34, `@repo/security` 31, `@repo/payments` 22, e2e (Vitest) 16. Total: 2097.

Não remedi `pnpm check` do repositório inteiro nem o typecheck dos outros workspaces: só acrescentei dois
arquivos de teste, e o `/review` mediu `pnpm turbo run lint typecheck` 15/15.

### Testes criados

| arquivo | casos | o que prova |
|---------|-------|-------------|
| `apps/app/__tests__/signUpFormSubmitLock.test.tsx` | 2 | Com `signIn` como mutation real do React Query, os botões de envio e de Google ficam desabilitados da criação até o fim do login, e um `MutationObserver` no atributo `disabled` registra exatamente `[true, false]`, ou seja, nenhum instante habilitado entre criar a conta e começar o login. Segundo clique com a criação pendente não gera outra chamada. |
| `apps/web/__tests__/signUpFormSubmitLock.test.tsx` | 3 | O HTML do botão de envio sai com `disabled` quando a criação está pendente e quando o login está pendente, e sem `disabled` quando nada está pendente. |

Conferi que os testes pegam a regressão que dizem pegar. Tirei `signIn.isPending` do `isSubmitting` da app
e o primeiro teste falhou (`expected true, received false`); tirei o mesmo termo do `disabled` da web e o
terceiro teste falhou. Restaurei os dois arquivos de produção a partir de cópia de segurança e rodei a
suíte de novo.

### Decisões de custo de teste

- Os cinco testes novos estão na faixa barata: jsdom na app, `renderToString` na web (o mesmo recurso que
  `signUpFormApi.test.tsx` já usava, sem dependência nova).
- Não criei teste com emulador. A política é lógica nossa na borda Zod e está coberta por testes de rota com
  mock (`signUpProfile.test.ts`, `authPasswordReset.test.ts`, `accountPasswordRoute.test.ts`,
  `usersRoute.test.ts`). A única afirmação que dependia da infra real, "o Admin SDK cria a conta no emulador
  e o perfil nasce com onboarding", foi medida uma vez nesta passada e já é exercitada pelo
  `signUp.spec.ts` no job `e2e` do CI.
- Rotas tocadas sem teste novo: `POST /auth/sign-up` (18 casos em `signUpProfile.test.ts` cobrem 201,
  rollback, 7 caracteres, e-mail inválido, JSON quebrado, e-mail em uso, erro desconhecido e o `reason` do
  log), `POST /auth/password/reset`, `POST /account/password` e `POST /users` (os testes de rota do
  `/develop` já assertam `AUTH_PASSWORD_TOO_SHORT` e o teto de 1024).

## Verificar no `/test` (lista do `review.md`)

| # | item | veredito | medida |
|---|------|----------|--------|
| 1 | Caminho feliz do cadastro na app contra o emulador | **confirmado** | `/pt-br/sign-up` com 8 caracteres e duplo clique: um `POST /auth/sign-up` 201, `signInWithPassword` no emulador 200, `POST /api/auth/session` 200, URL final `/pt-br/onboarding` com "Passo 1 de 2", `POST /auth/email-verification/send` disparado (503 `EMAIL_NOT_CONFIGURED`, esperado sem Resend). A API rodou com `FIREBASE_ADMIN_*` vazias e só com os hosts do emulador, então não havia como alcançar o projeto de dev; a conta aparece em `accounts:query` do emulador e o perfil em `user` tem `type = "common"` e `onboarding.step = "profile"`. `signUp.spec.ts` verde. |
| 2 | Cadastro na web, mensagens por idioma, toast | **confirmado** | `/en/sign-up` com 8: um `POST /auth/sign-up` 201, login, URL `/en` com "Sign Out" e "Go to panel"; "Go to panel" leva a `/en/onboarding` da app. Nenhum pedido de verificação. Mensagens: pt-br "Email inválido" / "As senhas não coincidem"; en "Invalid email" / "Passwords do not match"; es "Email no válido" / "Las contraseñas no coinciden"; senha curta "Password must be at least 8 characters" e "La contraseña debe tener al menos 8 caracteres". Toast em `/es`: "Este correo ya está en uso.". |
| 3 | Preflight CORS 3001 → 3002 | **confirmado** | `OPTIONS /auth/sign-up` com `Origin: http://localhost:3001` → 204, `access-control-allow-origin: http://localhost:3001`, métodos com `POST`, cabeçalhos com `Content-Type`. Origem `http://evil.example.com` → 204 sem `access-control-allow-origin`. |
| 4 | Botão desabilitado sem janela entre criar e logar | **confirmado** | Teste novo da app (`[true, false]` nos dois botões) e da web. No navegador, `dblclick` real gerou um único `POST /auth/sign-up` na app e na web. Observação: dois cliques no mesmo tick de JavaScript (sonda descartável em jsdom) geram duas chamadas, porque o `handleSubmit` do RHF é assíncrono e o botão só desabilita no render seguinte. A segunda chamada recebe `400 USERS_AUTH_EMAIL_ALREADY_IN_USE` (medido por `curl`), então não nasce conta duplicada; no pior caso aparece um toast de e-mail em uso enquanto a primeira requisição segue para o login. Não reproduzi isso com clique real. |
| 5 | E-mail repetido nas duas front-ends | **confirmado** | App pt-br: "Este e-mail já está em uso. (Código do erro: …)". Web es: "Este correo ya está en uso. (Código del error: …)". API: `400 USERS_AUTH_EMAIL_ALREADY_IN_USE`. |
| 6 | Login falha depois da conta criada | **confirmado (comportamento registrado)** | Com o `fetch` de `signInWithPassword` bloqueado depois do 201, aparece "Erro de conexão. Verifique sua internet.", a URL fica em `/pt-br/sign-up` e o botão volta a habilitar. Reenviar mostra "Este e-mail já está em uso.". A conta existe e entra pelo login. A recomendação (a) do `/review` segue valendo. |
| 7 | Conta antiga com senha de 6 | **confirmado** | Contas criadas por REST no emulador com 6 caracteres. Web: login → `/pt-br` com "Sair". App: login → onboarding; troca com a atual de 6 e nova de 8 → `POST /account/password` 200, "Senha alterada. Entre novamente para continuar.", redireciona ao login; o novo login funciona. Exclusão: confirmação de 5 mostra "A senha deve ter ao menos 6 caracteres."; com 6, `POST /account/deletion` 200, volta ao login e o emulador responde `EMAIL_NOT_FOUND` para a conta. |
| 8 | Troca de senha: mensagens de 6 e de 8 | **confirmado** | pt-br, en e es em dark 375 px, atual de 5, nova de 7 e confirmação diferente: "A senha deve ter ao menos 6 caracteres." / "A nova senha deve ter ao menos 8 caracteres." / "As senhas não conferem."; "The password must have at least 6 characters." / "The new password must have at least 8 characters." / "The passwords do not match."; "La contraseña debe tener al menos 6 caracteres." / "La nueva contraseña debe tener al menos 8 caracteres." / "Las contraseñas no coinciden.". Com a atual de 6 e a nova de 7, só a mensagem de 8 aparece. |
| 9 | Redefinição e criação pelo admin | **confirmado** | Reset: 7 recusado inline sem requisição; 8 → `POST /auth/password/reset` 200 e tela "Senha alterada". Admin: 7 → "A senha deve ter pelo menos 8 caracteres." sem requisição; 8 → `POST /users` 201 e volta para `/pt-br/admin/users`. `curl` com 7 nas quatro rotas → `400 AUTH_PASSWORD_TOO_SHORT`; 1025 → `400 VALIDATION_FAILED`; 1024 aceito no cadastro (201). O `oobCode` recusado continuou válido (`accounts:resetPassword` do emulador sem senha nova devolveu o e-mail). |
| 10 | Layout em light, dark e 375 px, 3 idiomas; colar senha | **confirmado para layout e colar; contraste dark ❌ anterior** | A 375 px, `scrollWidth` 360 em todas as telas medidas; a mensagem quebra linha dentro do card. Light: contraste 4,76:1. Dark: 1,97:1 (ver Defeitos). Colar: `ClipboardEvent('paste')` despachado em cada campo de senha do cadastro (app e web) e da troca de senha não foi cancelado, e nenhum campo tem `onpaste`. |

## Critérios de aceite: status por item

Texto completo em `test/criterios-aceite.md`. Meios: U = Vitest, E = navegador (`agent-browser`), A = `curl`
na API do emulador, P = Playwright, G = busca no código.

| # | critério | status | meio |
|---|----------|--------|------|
| 1 | Cadastro na app recusa menos de 8 e cria com 8 | ✅ | E, U, P |
| 2 | Duplo clique não cria duas contas | ✅ | U (novo), E, A |
| 3 | Cadastro na web com mensagens no idioma da rota | ✅ | E, U |
| 4 | Cadastro passa pela API; caminho direto saiu | ✅ | E, A, G |
| 5 | API recusa senha curta nas 4 rotas; teto 1024; `oobCode` preservado | ✅ | A, U |
| 6 | Conta com senha de 6 continua usável | ✅ | E |
| 7 | Troca distingue atual e nova, 3 idiomas | ✅ | E, U |
| 8 | Redefinição e criação pelo admin | ✅ | E, A |
| 9 | Criação de usuário restrita ao admin | ✅ | A, U |
| 10 | Erros da API traduzidos; 500 sem stack | ✅ | E, U |
| 11 | Colar senha; sem regra de composição | ✅ | E |
| 12 | Fonte única da regra | ✅ | G, U |
| 13 | CORS da web para `/auth/sign-up` | ✅ | A, E |
| 14 | Falha do login após a criação tem saída pelo login | ✅ | E |
| 15 | Layout em light, dark e 375 px | ✅ | E |
| 16 | Mensagem de erro legível no dark | ❌ (anterior) | E (cor computada) |
| 17 | Sem regressão no fluxo de entrada | ✅ | E, U, P |
| 18 | REST direto do Identity Toolkit recusa senha curta | 🔒 | exige Identity Platform |
| 19 | Limite do Arcjet no cadastro | 🔒 | exige `ARCJET_KEY` |
| 20 | E-mail de verificação entregue | 🔒 | exige Resend |

Buscas dos critérios 4 e 12, com `rg` para incluir os arquivos novos ainda não rastreados (o `git grep`
ignora arquivo não rastreado): `rg 'MIN_PASSWORD_LENGTH =' apps packages` → 0;
`rg createUserWithEmailAndPassword apps packages` → 0; as três constantes aparecem só em
`packages/shared/utils/helpers/passwordPolicy.ts`.

## Defeitos

### D1 (🟡, anterior à fatia): erro de formulário com contraste 1,97:1 no dark

- Repro: `/es/sign-up` na app em dark, 375 px, senha de 7. A cor computada de `[data-slot=form-message]` é
  `lab(28.51 44.55 29.05)` (cerca de `rgb(130, 24, 26)`) sobre `lab(2.75 0 0)` (`rgb(10, 10, 10)`):
  1,97:1. O mesmo vale para a troca de senha e para o cadastro da web.
- Origem: `--destructive` do dark em `packages/design-system/styles/globals.css:63`, usado como cor de texto
  em `ui/form.tsx:156`. O diff não toca nenhum dos dois.
- Já registrado em `specs/BACKLOG.md:396`, com a hipótese de correção (usar o `--destructive-foreground` do
  dark como cor de texto de erro). Não reabro aqui.

Nenhum defeito introduzido por esta fatia.

## Evidências e2e (o texto é a prova)

Os prints ficaram em `docs/features/account-security-mfa/test/e2e/` (23 arquivos), que o `.gitignore`
descarta. O que eles mostram está descrito acima e resumido aqui.

- App, `/pt-br/sign-up`, light 1280 px, senha de 7: "A senha deve ter pelo menos 8 caracteres" sob "Senha" e
  sob "Confirmar senha", rótulos em vermelho, nenhuma requisição para `localhost:3002`
  (`01-app-signup-7-ptbr-light.png`).
- App, onboarding depois do cadastro: "Vamos configurar sua conta", "Passo 1 de 2", campo "Nome de exibição"
  (`02-app-signup-ok-onboarding.png`).
- App, dark 375 px: mesmas mensagens em en e es, sem rolagem horizontal
  (`05-app-signup-{pt-br,en,es}-dark-375.png`).
- App, light 375 px em `/en/sign-up`: "Password must be at least 8 characters" nos dois campos.
- Web, light 1280 px nos 3 idiomas, e dark e light a 375 px (`06`, `07`, `09`, `10`, `15`).
- Troca de senha nos 3 idiomas, dark 375 px (`12-app-security-{pt-br,en,es}-dark-375.png`); na aba
  "Seguridad" a mensagem de 8 quebra em duas linhas dentro do card.
- Redefinição e criação pelo admin com 7 (`13-app-reset-7-ptbr.png`, `14-admin-create-7-ptbr.png`).
- Logout pelo menu do perfil → `/pt-br/sign-in?redirect=%2Fpt-br`; abrir `/pt-br/admin` depois disso →
  `/pt-br/sign-in?redirect=%2Fpt-br%2Fadmin`.

Fora do escopo, visto de passagem e sem ação: os botões de mostrar senha não têm nome acessível e os campos
de senha têm como nome acessível o placeholder "••••••••"; a home da web a 1280 px mostra barra de rolagem
horizontal. Nenhum dos dois vem deste diff.

## Lacunas herdadas: veredito

| lacuna | veredito |
|--------|----------|
| Nenhum teste prova o `disabled` dos botões de cadastro durante criação e login | **fechada aqui**: `signUpFormSubmitLock.test.tsx` na app e na web |
| O teste da web não monta DOM | **continua aberta**: a web segue sem jsdom, como define o `apps/web/CLAUDE.md`; o teste novo confere o HTML renderizado, e o clique real foi medido no navegador |
| Mensagem cravada em pt-br no login da web | **fora de escopo** (D12 do plano) |
| `apps/api/scripts/create-dev-admin.mjs` não aplica a política | **fora de escopo** (P4) |
| Log de falha do Admin SDK sem motivo | fechada no `/review`; o teste roda verde na suíte da api |
| Caminho feliz do cadastro coberto só por mock (handoff) | **fechada aqui**: medido contra o emulador |

## Ambiente do e2e

- Portas 3000, 3001, 3002, 3003, 9099, 8080, 4001, 4400, 4500 e 9150 estavam livres no início. Nada do
  usuário foi reutilizado.
- 1ª subida: `pnpm --filter e2e exec playwright test tests/signUp.spec.ts`, que sobe e derruba emulador,
  api, app e web sozinho. Portas livres ao fim.
- 2ª subida, para a passada com `agent-browser`: `pnpm emulators` com `JAVA_HOME` apontando para o
  `openjdk@21` do Homebrew, seed pelo `scripts/seed-emulator.mjs`, e `next dev` de api (3002), app (3000) e
  web (3001). O ambiente de cada app saiu do `buildStackEnv` de `apps/e2e/support/stackEnv.ts`, o mesmo do
  Playwright: ele esvazia `FIREBASE_ADMIN_*`, `GOOGLE_APPLICATION_CREDENTIALS` e a config pública do
  Firebase, aponta para `demo-next-boilerplate` e lança erro se o alvo não for emulador. Para a web
  acrescentei `NEXT_PUBLIC_API_URL=http://localhost:3002` e as URLs de app e web.
- Teardown: `kill` nos PIDs guardados (os wrappers do pnpm), `SIGINT` no processo do firebase-tools e, para
  os `next-server` filhos que sobraram presos às portas que eu abri, `lsof -ti tcp:<porta> | xargs kill`.
  No fim, nenhuma das dez portas estava escutando e nenhum processo da rodada seguia vivo.
- O harness temporário (script de ambiente, scripts de `curl`, logs) ficou em `/tmp` e foi apagado. Nenhum
  arquivo temporário ficou no repositório; a sonda de duplo clique em jsdom foi criada e apagada na mesma
  execução.

## Contas e dados de QA

Todos no emulador (`demo-next-boilerplate`), que morreu com o processo. Nada foi criado no projeto Firebase
de dev e nada entra no `docs/PRE-PRODUCTION.md`.

- Criadas pela API: `qa-password-policy-api@example.com`, `qa-password-policy-api-1024@example.com`.
- Criadas pela UI da app: `qa-password-policy-app-{1,2,3,4,5}@example.com`.
- Criada pela UI da web: `qa-password-policy-web-1@example.com`.
- Criada pelo admin: `qa-password-policy-admin@example.com`.
- Contas antigas criadas por REST com 6 caracteres: `qa-password-policy-legacy-app@example.com` (senha
  trocada para 8 no teste), `qa-password-policy-legacy-web@example.com` e
  `qa-password-policy-legacy-del@example.com` (excluída no teste).
- A senha de `user2@example.com` do seed mudou no teste de redefinição; o seed reconstrói o estado.

As senhas dessas contas eram de teste e só valiam no emulador; nenhuma foi gravada aqui.

## Roteiro manual

Para repetir com o emulador (`pnpm emulators`, depois `pnpm seed`, depois api, app e web):

1. `/pt-br/sign-up` na app, e-mail novo, senha de 7 → mensagem de 8 nos dois campos, nada sai para a API.
2. Mesma tela, senha de 8 igual nos dois campos → onboarding passo 1.
3. Repetir o e-mail → toast "Este e-mail já está em uso.".
4. `/en/sign-up` e `/es/sign-up` na web com `a@b` e senhas diferentes → mensagens no idioma da rota.
5. Criar uma conta com 6 caracteres por REST no emulador (`accounts:signUp?key=demo-key`), entrar na app, ir
   em Conta → Segurança e trocar informando a atual de 6 e uma nova de 7 (recusa) e depois de 8 (aceita).
6. Com outra conta de 6, Conta → Privacidade → Excluir minha conta com a senha de 6.
7. `curl` com senha de 7 em `/auth/sign-up`, `/auth/password/reset`, `/account/password` e `/users` →
   `400 AUTH_PASSWORD_TOO_SHORT`.

## Cross-check

- `apps/app` × `apps/web`: cadastro nas duas; login com senha de 6 nas duas.
- Comum × admin: criação de usuário como admin (201), como comum (403), sem credencial (401). Impersonação
  não muda nesta fatia e não foi percorrida.
- `subscription` × `simple`: sem relação com a política de senha; a passada rodou em `subscription`.
- Mobile × desktop e light × dark: medidos nas telas de cadastro e de troca de senha.
- Idiomas: pt-br, en e es no cadastro das duas front-ends e na troca de senha; redefinição e admin em pt-br.

## Follow-ups

- A decisão do `/review` sobre o reenvio depois de login falho continua em (a). A medida mostra a pessoa
  diante de um toast de e-mail em uso, sem link direto para o login; se isso incomodar, (b) resolve e pede
  teste próprio.
- Dois cliques no mesmo tick disparam duas criações (a segunda recusada pela API). Hipótese de correção: uma
  trava síncrona no `onSubmit` que ignore o envio enquanto `createAccount.isPending`. Não medida.
