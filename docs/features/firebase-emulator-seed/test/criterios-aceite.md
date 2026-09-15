# Critérios de Aceite (Checklist)

> Feature: **Emulador do Firebase, seed e primeiro admin**.
> Formato obrigatório da §9.1 do [`docs/feature-analysis-guide.md`](../../../feature-analysis-guide.md).
> Status por item, com o meio de verificação, está em [`report.md`](report.md).

---

## A. Subida do ambiente local

- [ ] **A1 — O stack sobe contra Firebase emulado com três comandos**
  Partindo de um `pnpm install`, copiar os três `.env.example` para `.env` e rodar `pnpm emulators`,
  `pnpm seed` e `pnpm dev` deve deixar `app` (3000), `web` (3001) e `api` (3002) respondendo, com Auth em
  `127.0.0.1:9099` e Firestore em `127.0.0.1:8080`. Nenhuma conta Google, nenhum service account e nenhum
  projeto real podem ser exigidos em momento algum do caminho. O `.env.example` já vem com os hosts do
  emulador preenchidos, e é esvaziá-los (`VAR=""`) que faz o fork optar por um projeto real.

- [ ] **A2 — O pré-requisito de runtime é JDK 21+, e o erro é explícito**
  `firebase-tools@15.30.1` recusa qualquer JDK anterior a 21 com `Error: firebase-tools no longer
  supports Java version before 21` e aborta antes de subir qualquer emulador — é teto rígido no próprio
  pacote, sem variável de escape. O `docs/SETUP.md` e os três `.env.example` têm de dizer **21+** (não
  "11+"), porque um pré-requisito errado transforma a primeira execução num beco sem saída. A máquina de
  desenvolvimento pode manter outro `java` como default desde que o 21 esteja alcançável via `JAVA_HOME`.

- [ ] **A3 — Nenhuma porta do emulador colide em silêncio**
  `emulators:start` reserva mais portas do que o `firebase.json` declara: além de 9099 (Auth), 8080
  (Firestore) e a UI, ele toma **4400** (hub), **4500** e **9150**. O `docs/SETUP.md` precisa listar as
  seis, porque o modo de falha é abortar o `emulators:start` **inteiro** — derrubando Auth e Firestore
  junto — quando qualquer uma está ocupada. A UI está na **4001** e não na 4000 (default do Firebase),
  desvio deliberado e documentado, revertível numa linha do `firebase.json`.

- [ ] **A4 — A primeira execução exige rede; as seguintes não**
  Os JARs do emulador são baixados sob demanda na primeira subida, então uma máquina recém-clonada
  precisa de internet uma única vez. Depois disso o fluxo inteiro (emuladores + seed + login + CRUD) roda
  offline. Isso tem de estar documentado como armadilha, porque a promessa "funciona sem internet" lida
  literalmente por quem clona hoje é falsa no primeiro `pnpm emulators`.

---

## B. Seed e estado inicial

- [ ] **B1 — Um comando popula um estado inicial conhecido**
  `pnpm seed` cria 3 contas (`admin@example.com` como admin, `user@example.com` e `user2@example.com`
  como comuns, todas com a senha `demo1234`), 3 perfis no Firestore e 6 `entity` distribuídas 4/2 entre
  os dois usuários comuns. O estado tem de incluir pelo menos um caso de borda visível — um `entity` com
  `enabled: false` (`Retired Unit`) — para que a lista não exiba só o caminho feliz. As credenciais são
  publicadas de propósito e só existem em base emulada.

- [ ] **B2 — O seed é idempotente: rodar N vezes devolve o mesmo estado**
  Reset e seed são o mesmo comando por construção: o script apaga a base emulada antes de popular. Rodar
  `pnpm seed` duas ou três vezes seguidas deve resultar exatamente em 3 contas Auth, 3 perfis e 6
  `entity` — sem duplicata, sem crescimento. O wipe também deve remover dados que **não** vieram do seed
  (uma conta criada à mão durante o teste desaparece), que é o que torna o comando um reset de verdade.

- [ ] **B3 — Existe caminho de código para o primeiro admin, sem console do Firebase**
  `pnpm --filter api create-dev-admin <email> <senha>` contra o emulador cria conta Auth **e** perfil
  admin no Firestore sem exigir service account. O comando tem de aceitar a flag `--allow-real-project`
  em qualquer posição sem que ela seja lida como e-mail posicional, e o `pnpm` precisa encaminhá-la (a
  linha exata do `SETUP.md` tem de funcionar como está escrita).

---

## C. Travas de isolamento (o que impede escrever em produção)

- [ ] **T1 — O seed recusa rodar sem os hosts do emulador**
  `pnpm seed` sem `FIRESTORE_EMULATOR_HOST` e `FIREBASE_AUTH_EMULATOR_HOST` deve terminar com **exit 1**,
  imprimir a razão e **não escrever nada**. A mensagem precisa ensinar a saída (subir os emuladores e
  copiar o `.env.example`), porque uma recusa sem instrução vira um `--force` no dia seguinte.

- [ ] **T2 — O seed recusa um project id que não seja `demo-*`**
  Mesmo com os hosts do emulador preenchidos, um `NEXT_PUBLIC_FIREBASE_PROJECT_ID` (ou
  `FIREBASE_ADMIN_PROJECT_ID`) apontando para um projeto real deve produzir **exit 1**. O prefixo `demo-`
  é a trava estrutural: os emuladores o aceitam sem credencial e o Google nunca o emite, então um
  vazamento para projeto real falha alto em vez de acontecer em silêncio.

- [ ] **T3 — `create-dev-admin` recusa um projeto real sem flag explícita**
  Sem host de emulador e sem `--allow-real-project`, o script deve terminar com **exit 1** e explicar
  como prosseguir. O motivo é que ele **redefine a senha de uma conta existente**, o que num projeto real
  é irreversível. Com a flag, o comportamento anterior tem de continuar disponível.

- [ ] **T4 — String vazia em variável de ambiente lê como ausência**
  `FIREBASE_AUTH_EMULATOR_HOST=""` e `FIRESTORE_EMULATOR_HOST=""` têm de significar "não estou emulando",
  não "estou emulando contra `http://`". É assim que o `.env.example` publica a recusa de uma feature
  opt-in, então o predicado precisa usar `||` e não `??` em toda leitura de env.

- [ ] **T5 — Nenhum host real do Google é contatado com o emulador de pé**
  Com o stack emulado e um fluxo completo percorrido (login, lista, admin), os processos de servidor só
  podem abrir conexão para loopback, e o navegador só pode alcançar `127.0.0.1:9099` e as portas locais
  dos apps. Nenhum `*.googleapis.com` real, nenhum `*.firebaseapp.com`. Scripts de dev pré-existentes e
  alheios ao Firebase (Vercel Analytics, telemetria do Next) não contam como violação.

---

## D. Cloud Storage — o vazamento que a revisão fechou

- [ ] **D1 — `isStorageConfigured()` é falso sob o emulador, mesmo com bucket preenchido**
  Não existe emulador de Cloud Storage neste setup. Com os hosts do emulador preenchidos e
  `FIREBASE_STORAGE_BUCKET` **também** preenchido — o estado real do `.env` do usuário hoje — o predicado
  tem de responder `false`. Vale para cada variável isoladamente (`FIREBASE_AUTH_EMULATOR_HOST`,
  `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`, `FIRESTORE_EMULATOR_HOST`) e para as três combinadas; com as
  três vazias, o predicado volta a `true` e o modo real segue intacto.

- [ ] **D2 — `POST /files` não escreve no bucket real enquanto emula**
  A rota faz `bucket().file().save()` **antes** de assinar a URL, então uma recusa tardia não adianta: o
  objeto já teria entrado num bucket real, via Application Default Credentials, em silêncio. A recusa tem
  de vir **antes de o corpo ser lido**, respondendo `503` com `error.code = STORAGE_NOT_CONFIGURED`, e
  nenhuma chamada a `bucket()` pode acontecer. Sem hosts de emulador, o upload volta a funcionar
  normalmente.

- [ ] **D3 — Leitura de foto também não assina URL contra bucket real**
  As três portas do produto (`POST /files`, foto de `entity`, avatar da conta) passam pelo mesmo
  predicado. Emulando, um `entity` cujo `photo` é um caminho de objeto válido deve sair com
  `photoUrl: null` e **zero** chamadas a `getSignedUrl`, em vez de um link assinado contra um bucket que
  o ambiente emulado não deveria tocar.

- [ ] **D4 — A degradação usa o vocabulário de erro que já existe**
  Desligar o upload sob o emulador é a mesma degradação que o produto já tem para "sem bucket": o
  `error.code` é `STORAGE_NOT_CONFIGURED`, já traduzido nos 3 idiomas, e nenhuma chave nova de i18n é
  criada. A UI não pode responder com 500, tela branca ou texto cru do provedor — tem de ser a mensagem
  traduzida, com o formulário íntegro.

---

## E. Autorização e posse (o seed existe para tornar isto testável)

- [ ] **E1 — Usuário comum enxerga apenas as próprias `entity`**
  Logado como `user@example.com`, a lista mostra exatamente as 4 `entity` semeadas para ele, com tipos e
  o toggle `Ativo` coerentes com o seed. As 2 de `user2@example.com` não podem aparecer em nenhuma
  combinação de busca ou filtro.

- [ ] **E2 — Abrir pela URL um recurso de outro usuário responde 404**
  Com o id de um `entity` de `user2@example.com` digitado direto na URL enquanto logado como
  `user@example.com`, a resposta tem de ser "página não encontrada" — nunca 403, nunca o recurso, nunca
  um vazamento do nome do registro na mensagem. 404 em vez de 403 é deliberado: 403 confirmaria a
  existência do id.

- [ ] **E3 — A conta admin do seed alcança a área admin sem console do Firebase**
  Entrar com `admin@example.com` deve rotear automaticamente para `/pt-br/admin`, e `/admin/users` tem de
  listar os 3 perfis semeados com os papéis corretos (1 Administrador, 2 Usuário). Este é o critério que
  prova o objetivo da feature: o primeiro admin nasce de um comando, não de um clique no console.

- [ ] **E4 — Não autenticado é redirecionado para o sign-in**
  Qualquer rota autenticada acessada sem sessão redireciona para `/{locale}/sign-in?redirect=...`, e o
  logout limpa a sessão compartilhada. A autorização é espelhada no servidor: esconder a UI nunca é a
  única proteção.

- [ ] **E5 — A sessão emulada é compartilhada entre `app` e `web` (SSO cross-app)**
  O cookie de sessão mintado em `apps/app` contra o emulador tem de ser lido por `apps/web`: a landing
  passa a mostrar "Sair" em vez de "Entrar". Um login feito na própria `web` também deve funcionar
  contra o emulador, sem nenhuma chamada externa.

---

## F. Modo degradado (o mais importante — é a regressão mais cara)

- [ ] **F1 — Com as variáveis do emulador vazias, os três apps sobem como antes**
  Esvaziar os hosts do emulador tem de devolver o comportamento anterior à feature, sem nenhuma
  configuração adicional: `api`, `app` e `web` respondem e o Admin SDK volta a exigir o service account,
  falhando com a mesma mensagem de antes quando ele falta.

- [ ] **F2 — O CSP volta byte a byte ao valor anterior**
  Sem `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST`, o `connect-src` não pode conter nenhuma origem
  `127.0.0.1`, e o `frame-src` tem de voltar ao valor único anterior (o `firebaseapp.com` do projeto). A
  mudança de forma do array — de ternário para concatenação condicional — não pode alterar o resultado no
  modo real.

- [ ] **F3 — O navegador volta ao Firebase real e o erro é tratado**
  Uma tentativa de login no modo degradado deve produzir `POST https://identitytoolkit.googleapis.com/…`
  e um erro de credencial (400), com a página íntegra: sem 500, sem tela branca, sem quebra do
  formulário. O que este critério **não** cobre é "credencial válida ⇒ sucesso", que exigiria uma conta
  real e é comportamento do Firebase, não nosso.

- [ ] **F4 — O Storage é reativado fora do emulador**
  Sem hosts de emulador e com bucket preenchido, `img-src` volta a nomear `storage.googleapis.com` e o
  upload volta a funcionar. A trava de D1 não pode ter efeito colateral no modo real.

---

## G. Estado misto de env (a falha mais provável de um fork)

- [ ] **G1 — Servidor emulando e navegador não falha de forma visível, não silenciosa**
  Com `FIREBASE_AUTH_EMULATOR_HOST` preenchida e `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` vazia, o CSP
  deixa de permitir a origem do emulador e o navegador vai para o Google real, enquanto o servidor
  continua verificando contra o emulador. O login tem de falhar de forma perceptível e a página tem de
  sobreviver ao erro — o inaceitável seria um login que aparenta sucesso e leva a uma conta vazia.

- [ ] **G2 — O `.env.example` trata os hosts e o project id como um bloco único**
  Os comentários dos três `.env.example` precisam dizer explicitamente "preencha todos ou esvazie todos",
  nomeando o sintoma do estado meio-preenchido. É a única defesa contra G1, já que nenhum gate lê o
  arquivo de ambiente de um fork.

- [ ] **G3 — O predicado do servidor aceita as duas variáveis; o do navegador, só a pública**
  No servidor, `FIREBASE_AUTH_EMULATOR_HOST` e `NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST` são
  equivalentes, com precedência da primeira. No bundle do navegador só a `NEXT_PUBLIC_*` existe, porque o
  Next só inlina esse prefixo — e é exatamente essa assimetria que produz G1.

---

## H. SDKs do Firebase sob o emulador

- [ ] **H1 — O Admin SDK inicializa sem credencial nenhuma quando emula**
  Com qualquer host de emulador definido, `initializeApp` tem de receber só `{ projectId }` e **nunca**
  chamar `cert()`. O id usado é o configurado (`FIREBASE_ADMIN_PROJECT_ID`) quando existe, e
  `demo-next-boilerplate` quando não — manter o id configurado importa porque o emulador particiona
  contas por projeto, e divergir entre servidor e navegador quebra o login.

- [ ] **H2 — `createSessionCookie` e a revogação funcionam contra o emulador**
  A fundação da autenticação deste repo é o session cookie: mintar, verificar com `checkRevoked` e
  revogar têm de funcionar no emulador como funcionam em produção. A resolução de
  `tokensValidAfterTime` é de 1 segundo, então um cookie mintado no mesmo segundo da revogação continua
  válido — semântica do Firebase, não limitação do emulador.

- [ ] **H3 — O SDK do navegador redireciona para o emulador uma única vez**
  `connectAuthEmulator` tem de rodar antes de qualquer operação no objeto `Auth`, no único ponto onde a
  instância é criada; pedir o cliente duas vezes não pode conectar duas vezes. Emulando sem nenhuma
  `NEXT_PUBLIC_FIREBASE_*`, a configuração do emulador é completa por si só e não pode cair no app de
  fachada (que assinaria o usuário sob o projeto "mock").

- [ ] **H4 — As chamadas REST do Identity Toolkit passam pelo emulador**
  As 5 chamadas da API ao Identity Toolkit têm de resolver para
  `http://<host>/identitytoolkit.googleapis.com/v1/...` quando emulando, com uma API key de fachada, e
  para `https://identitytoolkit.googleapis.com/...` com a key real quando não. Sem emulador e sem key, a
  recusa por falta de `FIREBASE_WEB_API_KEY` tem de continuar valendo.

---

## I. Gates e regressão

- [ ] **I1 — O gate do CI passa sem cache**
  `pnpm turbo run lint typecheck test --force` verde em todas as tasks, mais de uma vez seguida — é
  exatamente a linha que o GitHub Actions roda. `pnpm test` da raiz precisa passar porque `turbo build`
  **depende** de `test`: um teste quebrado bloqueia o build.

- [ ] **I2 — O lockfile é coerente com o `package.json`**
  A devDep nova (`firebase-tools@15.30.1`) exige que `package.json` e `pnpm-lock.yaml` entrem no mesmo
  commit, senão `pnpm install --frozen-lockfile` reprova no CI antes de qualquer teste rodar.

- [ ] **I3 — A paridade de i18n continua verde**
  Esta entrega não cria chave de tradução nem `error.code` novo, então `apiErrors` fica intacto e o teste
  de paridade pt-br/en/es não pode ser afetado. Se alguma correção introduzir um código novo, ele tem de
  existir nos três idiomas antes do merge.

- [ ] **I4 — O flake de `testTimeout` desapareceu**
  O gate falhava 1 vez em 4 por `apps/app/__tests__/accountSecurityForm.test.tsx` estourar os 5000 ms
  default do Vitest: isolado, o pior teste do arquivo leva 285 ms; sob contenção de 36 ambientes jsdom
  paralelos, 7401 ms. Com `testTimeout: 20_000` declarado nas 9 configs, execuções repetidas do gate
  completo têm de passar sem falha intermitente, e nenhuma asserção pode ter sido afastada ou pulada.

---

## J. Tema, responsivo e idiomas

- [ ] **J1 — A lista semeada renderiza em light e dark**
  A tabela é antd e não é theme-aware por padrão, então os dois temas precisam ser conferidos
  visualmente: cabeçalho, linhas alternadas, o toggle `Ativo` (inclusive no estado desligado do
  `Retired Unit`) e o menu de ações.

- [ ] **J2 — Mobile não quebra o layout**
  Em 390×844 a tabela tem de rolar horizontalmente dentro do container, sem estourar a viewport nem
  sobrepor a barra superior; a sidebar colapsa e os controles seguem alcançáveis.

- [ ] **J3 — As mensagens de erro do fluxo existem nos três idiomas**
  `STORAGE_NOT_CONFIGURED` e os demais `error.code` exercitados têm de sair traduzidos em pt-br, en e es.
  Nenhum texto cru do provedor (mensagem do SDK do Firebase, stack trace) pode aparecer como copy
  principal ao usuário.
