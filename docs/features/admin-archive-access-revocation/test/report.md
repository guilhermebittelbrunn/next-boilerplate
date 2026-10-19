# Relatório do `/test`: arquivar um usuário pelo admin tira o acesso dele

Rodada de 2026-10-19 dentro de um `/cycle` autônomo, sobre o working tree em `4eeb07b` (branch
`guilhermebittelbrunn/cycle-v3`, ainda sem os commits da feature). Tudo rodou contra os emuladores de Auth,
Firestore e Storage do projeto `demo-next-boilerplate`, com a API em `next dev` e a app em `next dev` e depois em
`next build` + `next start`.

Resultado: a API faz o que o plano pede em todos os cenários medidos, inclusive o defeito antigo medido no
código anterior. Na primeira rodada, um critério falhou na tela: o login com Google de uma conta arquivada antes
da correção terminava num carregamento infinito em `/pt-br/sign-in` (CA8 e CA13, ver "Defeito encontrado"). O
`/review` corrigiu `apps/app/shared/lib/googleSignInApi.ts` e a segunda rodada (seção "Re-medição") mediu os dois
critérios de novo: passaram. Todos os critérios estão ✅ ou 🔒, e a etapa fica `done`.

## Cobertura

| comando | resultado |
|---------|-----------|
| `pnpm --filter api test` | 103 arquivos, 1320 testes, todos passando |
| `pnpm --filter @repo/internationalization test` (paridade) | 7 arquivos, 67 testes, todos passando |
| `pnpm --filter api test:emulator` (com JDK 21, reaproveitando os emuladores de pé) | 5 arquivos, 191 testes, todos passando (o arquivo novo traz 5) |
| `pnpm --filter api typecheck` | exit 0 |
| `npx biome check apps/api/__tests__/userArchivedProfile.emulator.test.ts` | sem correções |
| `pnpm test` (raiz), 1ª rodada | exit 1: `@repo/design-system#test` falhou em `actionMenu.test.tsx > closes the open menu on Escape and returns focus to the trigger` (3711 ms), com dois `next dev`, o Chrome do `agent-browser` e o build da app disputando a máquina |
| `pnpm --filter @repo/design-system test`, duas vezes, isolado | 14 arquivos, 171 testes, as duas passando |
| `pnpm test` (raiz), 2ª rodada, com os servidores derrubados | exit 0, 15 de 15 tasks, 9 do cache, 5m58s |

Na 2ª rodada da raiz: `api` 1320, `api:test:emulator` 191, `app` 919, `web` 169, `@repo/design-system` 171,
`@repo/email` 205, `@repo/auth` 132, `@repo/internationalization` 67, `@repo/shared` 56, `@repo/security` 45,
`@repo/analytics` 34, `@repo/next-config` 32, `@repo/payments` 22, `e2e` 16 e `@repo/sdk` 11, todos passando. A
falha do design-system é de tempo sob carga: o diff não toca nesse pacote e o teste passou três vezes depois.
Nenhum comando usou `--force`.

### Teste criado

`apps/api/__tests__/userArchivedProfile.emulator.test.ts`, 5 casos de `userRepository.hasArchivedProfile` contra o
emulador de Firestore:

- perfil arquivado pelo próprio `userRepository.delete` → `true`, e `findByReferenceId` passa a devolver `null`;
- perfil vivo com `deletedAt: null` gravado → `false`;
- perfil gravado sem o campo `deletedAt` → `false`;
- uid sem perfil → `false`;
- perfil arquivado ao lado de um vivo para o mesmo uid → `true`, com o vivo ainda encontrado.

Prova de que o teste pega a regressão: troquei a leitura por `deletedAt === undefined` (confunde `null` com campo
ausente) e 3 dos 5 casos caíram. Restaurei o arquivo e conferi o `shasum` contra a cópia de antes.

## Decisões de custo de teste

| módulo tocado | decisão |
|---------------|---------|
| `user.repository.ts` (`hasArchivedProfile`) | Faixa cara, um arquivo novo na suíte `test:emulator`, que já existe e roda no CI. O objeto do teste é o contrato do `BaseRepository` com o documento real: a projeção `select("deletedAt")` do Admin SDK sobre `null`, campo ausente e `Timestamp` gravado pelo `delete()`. O Firestore falso do `userRepositoryBilling.test.ts` devolve o que o teste manda e não prova isso. O emulador não cobra índice, então a ausência de índice composto continua apoiada só na regra do Firestore para igualdade num campo só. |
| `account-access.ts` | Sem teste novo. T1 a T4 e M4 cobrem a ordem `updateUser` → `revokeUserSessions`, o `auth/user-not-found` e a falha; o efeito real no emulador foi medido no e2e (CA1, CA5). |
| `users/[id]/route.ts` (`DELETE`) | Sem teste novo. `usersAdminArchiveAccess.test.ts` (7) e `usersAdminDeleteBilling.test.ts` cobrem; o e2e mediu 204, 503, 403 e 404 contra o emulador. |
| `user-merge.ts` | Sem teste novo. `userMergeArchivedProfile.test.ts` (6) cobre; o e2e mediu o desvio em `/auth/me`, `/auth/sign-in`, Google e `GET /users/[id]`. |
| `auth/sign-in/google/route.ts` | Sem teste novo. G1 em `googleSignInProfile.test.ts` cobre o 404; o e2e mediu o corpo. |
| `apiErrors` | Paridade dos 3 idiomas no teste existente; o texto dos 3 foi visto no toast. |

## Critérios de aceite

| critério | status | meio |
|----------|--------|------|
| CA1. Desativa e revoga antes do soft delete | ✅ | rota (T1, T2), e2e tela + emulador |
| CA2. Falha na desativação responde `USERS_DELETE_AUTH_FAILED` | ✅ (segunda tentativa com Stripe 🔒) | rota (T3), e2e API + toast nos 3 idiomas |
| CA3. Conta inexistente no Auth arquiva normalmente | ✅ | rota (T4); não reproduzido no emulador |
| CA4. Ordem com billing e recusas existentes | ✅ | rota (T5 a T7), e2e API |
| CA5. Sessão aberta deixa de valer | ✅ | e2e API (bearer, cookie, rota de sessão, proxy) |
| CA6. Nenhum login recria perfil arquivado | ✅ | unidade (M1 a M6), e2e API |
| CA7. Conta legada desativada no primeiro contato | ✅ (falha da desativação só em unidade) | unidade (M4), e2e API + browser |
| CA8. Sem laço de redirecionamento na app | ✅ (❌ na 1ª rodada) | e2e browser: e-mail e senha na 1ª rodada, Google na re-medição |
| CA9. Google de conta arquivada sem sessão | ✅ | unidade (G1), e2e API |
| CA10. Texto nos 3 idiomas | ✅ | paridade i18n, e2e toast |
| CA11. Antes e depois medidos | ✅ | e2e no `4eeb07b` e no working tree; reversão medida no `/develop` e no teste novo |
| CA12. Sessão aberta de conta legada para no login | ✅ | e2e browser com HAR e log da app |
| CA13. Google de conta legada volta ao formulário | ✅ (❌ na 1ª rodada) | e2e browser na re-medição (entrada e cadastro); `googleSignInApi.test.ts` (5) |

## Verificar no `/test`

| item do `review.md` | veredito |
|---------------------|----------|
| 1. Laço com conta legada de sessão aberta (F3) | **Confirmado** sem laço. Um 307 de `/pt-br` para `/pt-br/sign-in`, nenhum `POST /api/auth/session`, nenhum `window.location.replace`; o Firebase client recebe 400 no `accounts:lookup`, a app recebe 401 no `/api/auth/custom-token`, e o formulário fica parado por 15 s. `POST /api/auth/session` com o ID token de uma conta desativada responde 401 `AUTH_INVALID_TOKEN`. Conta `disabled: true`, 1 perfil. |
| 2. Mesmo cenário com Google (F4) | **Derrubado** em parte. Sem laço e sem sessão, mas a tela não volta ao login: toast "Usuário não encontrado." e depois carregamento infinito em `/pt-br/sign-in`, medido 30 s em `next dev` e 20 s em `next start`. Recarregar a página traz o formulário. Ver "Defeito encontrado". **Confirmado** na re-medição, depois da correção: toast e formulário de volta. |
| 3. `hasArchivedProfile` contra o Firestore real | **Confirmado** na execução: a consulta rodou no Admin SDK contra o emulador em todos os caminhos do e2e e nenhum respondeu 500. A parte do índice fica 🔒, porque o emulador não cobra índice. Coberto agora pelo teste novo de emulador. |
| 4. Sessão aberta no arquivamento (F2) | **Confirmado.** Bearer antigo e cookie de sessão: 401 `AUTH_INVALID_TOKEN` nos dois. `validSince` de 1792437222 para 1792437230. 1 perfil. |
| 5. Arquivamento pela tela (F1) | **Confirmado.** `disabled: true`, `validSince` de 1792437256 para 1792437533, `deletedAt` gravado, um evento `user.delete` com o rótulo do alvo. |
| 6. Defeito no código anterior (F0) | **Confirmado.** No `4eeb07b`: `DELETE` 204, conta segue `disabled: false` com o mesmo `validSince`, `/auth/me` com o token antigo responde 200 e o número de perfis vai de 1 para 2; um login novo também responde 200. |
| 7. Segunda tentativa com Stripe e webhook atrasado | 🔒 Sem conta Stripe. Medido só o lado sem Stripe: 503 `USERS_DELETE_BILLING_FAILED`, conta intocada. |
| 8. Toast de `USERS_DELETE_AUTH_FAILED` (F5) | **Confirmado** com harness: um perfil com `reference_id` de 129 caracteres faz o `updateUser` recusar com `auth/invalid-uid`. A API respondeu 503 com o código, o perfil ficou com `deletedAt: null` e o log gravou só `requestId` e `reason`. O toast apareceu nos 3 idiomas (textos em "Evidências"). |

## Defeito encontrado

**🟡 Login com Google de conta legada para num carregamento infinito** (`apps/app`, fora do corte do plano).
Corrigido pelo `/review` na rodada 2 e confirmado na re-medição abaixo.

Repro no emulador:

1. Conta Google habilitada com perfil vivo; gravar `deletedAt` direto no documento `user` dela (o estado de quem
   foi arquivado antes da correção).
2. Em `/pt-br/sign-in`, clicar "Continuar com Google" e escolher a conta no popup do emulador.
3. A API responde 404 `USERS_NOT_FOUND` e desativa a conta (`disabled: true` medido). A app mostra o toast
   "Usuário não encontrado. (Código do erro: <requestId>)" e fica no `FullScreenLoader` em `/pt-br/sign-in`, sem
   formulário, até a página ser recarregada.

Causa, pela leitura do código e pela ordem das chamadas no log: o `signInWithPopup` de
`apps/app/shared/lib/googleSignInApi.ts` deixa um usuário no Firebase client antes da chamada à API. Quando a API
recusa, nada faz o logout. O provider tenta gravar o cookie (`/api/auth/session/refresh` 401 e depois
`/api/auth/session` 401 duas vezes), recebe `AUTH_INVALID_TOKEN`, que `sessionEndReasonFor` não trata, e o usuário
fica em memória. O `SignInForm` mostra o loader enquanto há `user`, e o efeito dele recebe 401 e não navega. O mesmo
caminho prende a tela em qualquer erro da API depois do popup; esta entrega só passou a tornar esse erro comum para
contas legadas.

Correção sugerida (hipótese): em `signInWithGoogleViaApi`, envolver a chamada a `apiClient.authApi.signInWithGoogle`
e a gravação do cookie num `try` e chamar `signOut(auth)` de `firebase/auth` antes de relançar o erro, para o
`SignInForm` voltar ao formulário com o toast. Não corrigi: é código de produção e o plano deixa `apps/app` fora.

Impacto: nenhuma sessão nem perfil vaza; a conta fica desativada e a próxima tentativa, depois de recarregar,
mostra "Esta conta foi desativada.". Acontece uma vez por conta Google arquivada antes da correção.

## Achados fora do diff (informativo)

- `POST /auth/sign-in/google` de conta já desativada responde 401 com `{ "error": "USER_DISABLED" }`, uma string
  em vez de `{ error: { code } }` (`route.ts`, `catch` de `IdentityToolkitError`). Pela app não chega a acontecer,
  porque o popup recusa antes com `auth/user-disabled`; afeta quem chama a API direto.
- `POST /auth/sign-in` de conta desativada responde 400 `AUTH_INVALID_CREDENTIALS`, sem um código que diga que a
  conta está desativada. A app não usa essa rota para entrar.
- A primeira entrada por e-mail e senha de uma conta legada volta ao formulário sem mensagem nenhuma: a conta só
  é desativada no meio do caminho, e o recarregamento de página descarta o toast. A segunda tentativa mostra
  "Esta conta foi desativada.". É o comportamento que a §6.2 do plano descreve.
- Aviso de hidratação no console da tela de usuários do admin em `next dev`. Não há mudança de `apps/app` no
  diff.

## Evidências e2e

Os prints estão em `test/e2e/` (`01` a `17`) e o `.gitignore` descarta a pasta; o que vale é o texto abaixo.

- **Confirmação do arquivamento** (pt-br, escuro): título "Arquivar usuário", texto "O usuário sai da listagem e
  perde o acesso, mas o cadastro é preservado e o e-mail continua ocupado. Se houver assinatura ativa, ela é
  cancelada na hora.", botões "Não" e "Sim". Depois do "Sim": toast "Usuário arquivado com sucesso." e a linha
  some da tabela.
- **Toast de falha na desativação**: pt-br escuro desktop "Não foi possível bloquear o acesso deste usuário, então
  ele não foi arquivado. Tente de novo em instantes. (Código do erro: a9dafb59-…)", com o mesmo `requestId` no log
  da API; en escuro desktop "We couldn't block this user's access, so they were not archived. Try again in a
  moment. (Error code: …)"; es claro a 390×844 "No pudimos bloquear el acceso de este usuario, así que no se
  archivó. Inténtalo de nuevo en unos instantes. (Código del error: …)". Nos três o texto é legível e o toast cabe
  na tela.
- **Login de conta arquivada depois da correção**: pt-br "Esta conta foi desativada." (escuro e claro), en "User
  disabled." e es "Esta cuenta ha sido desactivada.", os dois em claro a 390×844. O formulário continua na tela.
- **Login de conta legada por e-mail e senha** (arquivada pelo código do `4eeb07b`): `signInWithPassword` 200, três
  `POST /api/auth/session` 200, dois `/auth/me` 401, navegação para `/pt-br` e de volta para
  `/pt-br/sign-in?redirect=%2Fpt-br`, `accounts:lookup` 400, `custom-token` 401. Parada no formulário após 15 s.
  Conta `disabled: true`, `validSince` 1792437626, 1 perfil.
- **Sessão aberta de conta legada**: ver item 1 acima.
- **Google de conta legada**: ver "Defeito encontrado". Reproduzido três vezes, com três contas, duas em `next dev`
  e uma em `next start`.
- **Google de conta desativada**: toast "Esta conta foi desativada." e o formulário na tela.
- **API**: Google legado 404 com `error` como única chave e conta desativada em seguida; Google de conta nova 200
  com `session` e 1 perfil, e 200 de novo na segunda entrada, ainda com 1 perfil; `/auth/sign-in` de conta legada
  404 `USERS_NOT_FOUND`; `GET /users/<uid>` de conta legada 404; conta nova sem perfil: 0 perfis antes, `/auth/me`
  200, 1 perfil depois. Cada um dos 5 arquivamentos bem-sucedidos deixou um evento `user.delete`; o 503 não deixou
  nenhum.

Matriz de tema, tela e idioma reduzida de propósito: o diff não tem UI nova. Cobri o que ele faz aparecer na tela:
o toast de falha do arquivamento nos 3 idiomas (escuro desktop e claro mobile) e a mensagem de conta desativada nos
3 idiomas (escuro desktop e claro mobile). O fluxo de laço foi medido só em pt-br, porque não depende de texto.

## Ambiente do e2e

Todas as portas estavam livres no início, então subi tudo e derrubei tudo pelos PIDs guardados.

- `pnpm emulators` (Auth 9099, Firestore 8080, Storage 9199, UI 4001) com `JAVA_HOME` no openjdk@21, e
  `pnpm --filter api seed`.
- API: `pnpm --filter api exec next dev -p 3002`, com o ambiente montado a partir do `.env.example` e o bloco do
  emulador forçado, no mesmo molde de `apps/e2e/support/stackEnv.ts`. O `.env` local aponta para um projeto real e
  não foi lido.
- App: a porta 3000 foi tomada no meio da rodada por um processo Electron de outro workspace
  (`comanda10/wellington`), que não toquei. A app rodou em 3010, com `CORS_ORIGIN` e `NEXT_PUBLIC_APP_URL`
  ajustados no ambiente do processo. Primeiro em `next dev`, depois em `next build` + `next start` para confirmar o
  defeito.
- Para o F0, troquei temporariamente os quatro arquivos de produção da API pela versão do `4eeb07b`
  (`git show`), medi e devolvi a versão do working tree, conferida por `shasum`. O `account-access.ts` novo ficou
  no lugar, sem uso pelo código antigo.
- Harness do F5: um documento `user/qaArchiveAuthFail` no emulador e um patch de `XMLHttpRequest.open` na aba do
  admin, que redirecionava o `DELETE` para esse documento. A listagem responde 500 enquanto o documento existe,
  então ele foi criado depois de cada carga da tabela e apagado em seguida.
- Fim: sessões do `agent-browser` fechadas; API, app e emulador encerrados pelos PIDs (o emulador com SIGINT).
  3000, 3002, 3010, 9099, 8080, 9199, 4001, 4400, 4500 e 9150 sem processo ouvindo. Removi a saída do
  `next build` em `apps/app/.next` (ficou só o `dev`, como estava). Scripts, ambiente e senha da rodada viviam em
  `/tmp/qa-archive` e foram apagados.

## Dados de QA

Só no emulador, que morreu com o processo. Nenhuma conta em projeto real, então nada vai para o
`docs/PRE-PRODUCTION.md`. Todas com a mesma senha aleatória gerada para a rodada, guardada só em `/tmp` e apagada:
`qa-archive-f0`, `qa-archive-f1`, `qa-archive-f2`, `qa-archive-open`, `qa-archive-legacy`, `qa-archive-billing`,
`qa-archive-imp`, `qa-archive-signin`, `qa-archive-getuid` e `qa-archive-fresh`, e as contas Google
`qa-archive-google`, `qa-archive-google-new`, `qa-archive-google-2` e `qa-archive-google-3`, todas em
`@example.com`. Estado de dev alterado: nenhum.

## Lacunas

| lacuna | veredito |
|--------|----------|
| Nenhum teste de emulador para desativação, revogação e consulta nova (handoff) | **Fechada em parte.** A consulta ganhou teste permanente de emulador. Desativação e revogação foram medidas no e2e e seguem só com unidade, porque o objeto ali é a chamada, e o efeito no Firebase já tem `serverSessionRevocation.test.ts`. |
| Laço da §6.2 sem teste automatizado (handoff) | **Continua aberta.** Medido no e2e (sem laço por e-mail e senha). Um teste automatizado precisaria da suíte Playwright com o emulador, fora do corte. |
| Revogação que falha depois de desativar não tem caso no `DELETE` (review) | **Fora de escopo**, como o `/review` sugeriu: o helper real engole o erro e já tem teste no `@repo/auth`. |
| Laço quando a desativação no primeiro contato falha sempre (🟡 do review) | **Continua aberta**, 🔒: o emulador não deixa recusar o `updateUser` de uma conta que existe. Segue como decisão em aberto do `/review`. |
| Segunda tentativa com Stripe (item 7) | **Continua aberta**, 🔒 sem Stripe. |
| Google de conta legada termina em carregamento infinito (novo) | **Fechada** na rodada 2: correção do `/review`, teste de unidade novo e re-medição na tela. |

## Re-medição depois da correção (rodada 2)

Rodada de 2026-10-19, 17:15, depois de o `/review` mover para `exchangeForApiSession` tudo o que vem depois do
popup em `apps/app/shared/lib/googleSignInApi.ts`, com `signOut(auth)` quando essa troca falha. O ambiente foi o
mesmo da primeira rodada: emuladores, seed, API em 3002 e app em 3010, todos em `next dev`, com as portas livres
no início. Como o resultado bateu com o esperado, não subi o `next start`.

| cenário | resultado |
|---------|-----------|
| Entrada com Google de conta legada (`qa-archive-google-r2-signin`, `deletedAt` gravado direto, conta habilitada) | ✅ Toast "Usuário não encontrado. (Código do erro: 3e2d7463-…)" com o formulário de login na tela; 15 s depois, ainda em `/pt-br/sign-in` com o botão "Entrar" visível. Sem navegação nem laço: depois do `POST /auth/sign-in/google` 404, a app registrou só `/api/auth/session/refresh` 401 e `/api/auth/session` 401 duas vezes. Nenhum cookie `access-token`. Conta `disabled: true`, `validSince` 1792440364, 1 perfil. |
| Segunda tentativa da mesma conta, na mesma página | ✅ Toast "Esta conta foi desativada.", formulário na tela. O toast passou rápido demais para os snapshots; o texto foi capturado por um `MutationObserver` instalado na página. |
| Cadastro com Google de conta legada (`qa-archive-google-r2-signup`, em `/pt-br/sign-up`) | ✅ Toast "Usuário não encontrado. (Código do erro: f778dd8c-…)", formulário de cadastro na tela depois de 16 s, sem cookie de sessão. Conta `disabled: true`, `validSince` 1792440623, 1 perfil. |
| Entrada com Google de conta com perfil vivo (`qa-archive-google-r2-live`) | ✅ Termina em `/pt-br/onboarding` com o cookie `access-token` gravado: a correção não desloga quem a API aceita. |

Observação de ferramenta: na tela de cadastro, a 1280×720, o clique do `agent-browser` no botão do Google não abriu
o popup em três tentativas, e o Enter no botão abriu. Depois de `scrollintoview`, o clique também abriu. O botão
fica abaixo da dobra e o clique caía fora dele; não é comportamento da app.

| comando | resultado |
|---------|-----------|
| `pnpm --filter app test` | 112 arquivos, 924 testes, todos passando (o `googleSignInApi.test.ts` novo traz 5) |
| `pnpm test` (raiz, com cache, JDK 21) | exit 0, 15 de 15 tasks, 13 do cache, 1m11s: `api` 1320, `api:test:emulator` 191, `app` 924, `web` 169, `@repo/design-system` 171 e os demais como na primeira rodada. O `actionMenu.test.tsx` passou. |

Ambiente: subi emuladores, API e app, guardei os PIDs e derrubei tudo no fim (o emulador com SIGINT). 3000, 3002,
3010, 9099, 8080, 9199, 4001, 4400, 4500 e 9150 ficaram sem processo ouvindo, inclusive depois da suíte
`test:emulator`, que sobe e derruba os próprios emuladores. O harness da rodada (ambiente e scripts em `/tmp`) foi
apagado. Contas criadas, só no emulador: `qa-archive-google-r2-signin`, `qa-archive-google-r2-signup` e
`qa-archive-google-r2-live`, em `@example.com`. Prints em `test/e2e/r2-01` a `r2-03`.
