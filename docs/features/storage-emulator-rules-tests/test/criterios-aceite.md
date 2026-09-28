# Critérios de Aceite (Checklist)

Os 15 primeiros vêm do §9 do plano. Os quatro últimos saíram do `/test`: três formalizam afirmações do
handoff e da revisão que o plano não listava como critério, e o 16 cobre uma lacuna que a medição achou.
O status de cada item está em `test/report.md`.

- [ ] **`pnpm emulators` sobe o emulador de Storage junto com Auth e Firestore**
  O script da raiz usa `--only auth,firestore,storage`, e o `firebase.json` declara a porta 9199. O hub do
  emulador (`127.0.0.1:4400/emulators`) lista `storage` em `127.0.0.1:9199`, e a UI mostra a aba em
  `http://127.0.0.1:4001/storage`. Na primeira execução o `firebase-tools` baixa o JAR de rules do Storage;
  depois disso sobe sem rede. Com JDK anterior ao 21, o comando falha com a mensagem do próprio
  `firebase-tools` ("no longer supports Java version before 21").

- [ ] **Sob o emulador de Storage a API grava no bucket emulado, nunca num bucket real**
  Com `FIREBASE_STORAGE_EMULATOR_HOST` preenchido, `isStorageConfigured()` é `true` e todo acesso usa
  `demo-next-boilerplate.appspot.com`, mesmo com `FIREBASE_STORAGE_BUCKET` apontando para um bucket real.
  Com Auth ou Firestore emulados e sem o host de Storage, a API responde 503 `STORAGE_NOT_CONFIGURED` e não
  toca bucket nenhum. Com só `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` (ou só `STORAGE_EMULATOR_HOST`) no
  env da API, o Storage continua desligado.

- [ ] **Upload sob o emulador devolve uma URL que abre o objeto enviado**
  `POST /files` com um PNG válido responde 201 com `path` sob `uploads/<profileId>/` e `url` em
  `http://127.0.0.1:9199/demo-next-boilerplate.appspot.com/...`. Um `GET` nessa URL devolve 200, o mesmo
  `content-type` e os mesmos bytes. Um arquivo que não é imagem responde 415, com a mensagem traduzida no
  formulário.

- [ ] **A URL emulada não passa por assinatura, e produção continua assinando**
  No modo emulado `signReadUrl` não chama `getSignedUrl`, então não resolve ADC nem chama
  `iamcredentials.googleapis.com`. Sem o host de Storage, `getSignedUrl` v4 continua sendo chamado com
  `action: "read"` e expiração de 15 minutos. `expiresAt` existe nos dois modos.

- [ ] **Referência a objeto de outro dono é recusada contra objetos reais**
  `PUT /account` com `avatar` apontando para um objeto existente de outro perfil responde 400
  `ACCOUNT_AVATAR_INVALID`, e o objeto continua no bucket. Nenhum documento é atualizado e nenhuma URL é
  emitida para esse objeto.

- [ ] **Trocar o avatar apaga o objeto anterior do titular**
  `PUT /account` com um avatar próprio novo, tendo um avatar próprio anterior, deixa só o novo no bucket: o
  `GET` no objeto antigo passa a responder 404. A remoção acontece depois da escrita do documento. Um avatar
  anterior que não pertence ao titular nunca é apagado.

- [ ] **O expurgo de conta apaga os objetos do titular no bucket emulado**
  `runAccountErasure` para um perfil com dois objetos devolve o passo `storage` como `done` com `count: 2`.
  O prefixo `uploads/<profileId>/` fica vazio e os objetos de outros perfis continuam. Sem Storage
  configurado, o passo continua `skipped: storage-not-configured`. Pela UI, "Excluir minha conta" com a
  senha correta produz o mesmo resultado e remove a conta do Auth.

- [ ] **`firestore.rules` recusa cliente anônimo e autenticado em toda coleção do repositório**
  Para cada coleção dos repositórios, uma coleção aleatória e um caminho aninhado, leitura por documento,
  leitura da coleção, criação, atualização e exclusão recebem `permission-denied`, com e sem
  `mockUserToken`. A sonda existe (lida pelo Admin), então a recusa não vem de documento ausente. Trocar a
  regra por `allow read, write: if true` quebra o teste, e o teste não deixa documento para trás mesmo
  nesse caso.

- [ ] **`storage.rules` recusa cliente anônimo e autenticado em leitura, escrita, remoção e listagem**
  Sobre um objeto existente, `getBytes`, `getMetadata`, `uploadBytes`, `deleteObject` e `listAll` recebem
  `storage/unauthorized`, com e sem `mockUserToken`. Um `object-not-found` conta como falha do teste, não
  como recusa. Trocar a regra por `allow read, write: if true` quebra o teste.

- [ ] **`pnpm test` roda os testes contra emulador e falha se o emulador não subir**
  O script da raiz é `turbo test test:emulator`. Com os emuladores parados, `api#test:emulator` sobe
  Firestore e Storage via `firebase emulators:exec` e os derruba no fim. Sem JDK 21 a task sai com erro,
  nunca como sucesso. `test:emulator` nunca vem do cache do turbo.

- [ ] **`pnpm test` reaproveita os emuladores de quem está desenvolvendo**
  Com `pnpm emulators` de pé (8080 e 9199 respondendo), a suíte roda contra eles sem subir outra instância
  e sem apagar o estado do seed: as mesmas coleções, os mesmos IDs de documento e os mesmos objetos do
  bucket antes e depois. Com só 8080 respondendo (o `pnpm emulators` antigo), a suíte sai com exit 1 e a
  mensagem "must be either both running or both stopped".

- [ ] **O gate hermético e o build não dependem de Java**
  `pnpm turbo run test`, `pnpm --filter api test` e `pnpm coverage` rodam sem JDK 21 e sem emulador, porque
  os `*.emulator.test.ts` ficam fora do `vitest.config.mts`. `turbo build` depende só de `test`, então o
  build da Vercel não precisa de Java.

- [ ] **O job `verify` do CI roda os testes contra emulador**
  O `verify` instala o Temurin 21, restaura o cache de `~/.cache/firebase/emulators` e roda
  `pnpm turbo run lint typecheck test test:emulator`. A chave do cache inclui `firebase.json`, para o JAR
  do Storage entrar no cache em vez de ser baixado a cada execução. O job `e2e` usa a mesma chave.

- [ ] **Com a stack local de pé, o usuário troca o avatar e vê a foto nova**
  Com os `.env.example`, `/account` mostra o seletor de avatar, o envio mostra a pré-visualização e, depois
  de salvar, o `ProfileDropdown` exibe a foto servida por `127.0.0.1:9199`, sem violação de CSP, em light,
  dark e mobile, nos três idiomas. A miniatura da entidade com foto carrega na lista. Sem o host de
  emulador e sem bucket, o campo de arquivo some e volta o campo de URL.

- [ ] **Um fork que não usa upload não precisa configurar nada novo**
  Esvaziar `FIREBASE_STORAGE_EMULATOR_HOST` e `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST` devolve o
  comportamento anterior: `POST /files` responde 503 `STORAGE_NOT_CONFIGURED` (mesmo com um nome de bucket
  preenchido, enquanto Auth e Firestore estão emulados), o `img-src` da CSP não cita o emulador e o painel
  mostra o campo de URL. Nenhuma variável nova é obrigatória em produção.

- [ ] **As rules também recusam o dono do recurso**
  Um cliente autenticado com o mesmo uid do segmento de caminho do objeto (`uploads/<uid>/...`) recebe
  `storage/unauthorized` em todas as operações acima. No Firestore, um cliente cujo uid é igual ao ID do
  documento-sonda e aos campos `reference_id` e `userId` recebe `permission-denied` em todas as operações.
  Uma regra "o dono lê o que é seu", no caminho ou no campo, quebra a suíte.

- [ ] **A suíte contra emulador nunca sai da máquina**
  O `setupFiles` aborta antes de qualquer teste se `FIRESTORE_EMULATOR_HOST` ou
  `FIREBASE_STORAGE_EMULATOR_HOST` não forem `127.0.0.1:<porta>`. Durante a execução, nenhum processo Node
  da suíte abre conexão nem resolve DNS fora do loopback; sem `METADATA_SERVER_DETECTION=none`, o Admin SDK
  tentaria o metadata server do Google (`169.254.169.254`).

- [ ] **Interromper a suíte não deixa emulador pendurado**
  Ctrl-C (SIGINT ao grupo de processos) ou SIGTERM durante `pnpm test` ou `pnpm --filter api test:emulator`
  encerra o `firebase emulators:exec`, e as portas 8080, 9199, 4400, 4500 e 9150 ficam livres, sem processo
  Java órfão. Um SIGINT entregue só ao script deixa o `emulators:exec` terminar a execução e desligar os
  emuladores sozinho.

- [ ] **A suíte E2E segue verde com o campo de upload visível**
  Com o bloco de emulador do `apps/e2e`, `/entities/create` e `/account` mostram o `ImageUploadInput`, e o
  axe (WCAG 2.0/2.1 A e AA, impacto serious ou critical) não acha violação nesse campo, em light e dark.
  `pnpm e2e` passa inteiro.
