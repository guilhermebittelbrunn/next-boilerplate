# Critérios de Aceite (Checklist)

Fatia 3 de `specs/delivery-security-review.md` ("arestas"). O status de cada item, com o meio de prova, está em
[`report.md`](report.md).

- [x] **Avatar externo novo fora da allowlist é recusado**
  `PUT /account` com `avatar: "https://example.com/a.png"` responde 400 `ACCOUNT_AVATAR_INVALID` e não grava nada.
  O mesmo vale para `http://lh3.googleusercontent.com/x`, para porta explícita, para credencial na URL, para
  `https://lh4.googleusercontent.com/x` e para `https://lh3.googleusercontent.com.evil.example/x`. Com
  `https://lh3.googleusercontent.com/a/x`, responde 200 e grava.

- [x] **Avatar já gravado continua salvável**
  Uma conta com URL externa gravada antes desta mudança salva nome e telefone pelo formulário, que reenvia o avatar
  sem mudança, e recebe 200 com o toast "Perfil atualizado.". Nenhum objeto do bucket é apagado nesse salvamento.
  Trocar esse avatar por outra URL externa fora da allowlist é recusado com 400 `ACCOUNT_AVATAR_INVALID`.

- [x] **Foto de entidade fora da allowlist é recusada**
  `POST /entities` com foto `https://cdn.example.com/a.png` responde 400 `ENTITY_PHOTO_INVALID` sem criar o
  registro. A edição que reenvia a foto externa já gravada responde 200; a edição que troca para outra URL fora da
  allowlist responde 400; a edição que troca para `https://lh3.googleusercontent.com/...` responde 200. Objeto da
  organização continua aceito, e objeto do prefixo pessoal ou de outro dono continua recusado.

- [x] **Leitura de URL externa antiga não muda**
  Registro e conta com URL externa gravada continuam saindo com `photoUrl`/`avatarUrl` iguais ao valor guardado, sem
  assinatura e sem erro. A lista de entidades e a página da conta carregam normalmente; a imagem bloqueada pela CSP
  cai no ícone de fallback.

- [x] **Upload sem `content-length` acima do teto é recusado durante a leitura**
  Um corpo `chunked` de 6 MiB em `POST /files` recebe 413 `UPLOAD_FILE_TOO_LARGE` com `connection: close`, e o
  handler para de ler logo depois de 4 MiB mais 64 KiB. O mesmo arquivo com `content-length` também recebe 413 com
  `connection: close`. Um arquivo de exatamente 4 MiB continua aceito nos dois modos; com 1 byte a mais, 413.

- [x] **JPEG gravado sem metadados e com orientação preservada**
  Um JPEG com EXIF de GPS, XMP, IPTC e comentário é gravado sem nenhum deles e sem os bytes depois do `EOI`. Se o
  original tinha `Orientation` de 2 a 8, o objeto gravado tem só um `APP1` de 36 bytes (campo de tamanho 34) com essa
  tag, e a foto aparece em retrato no painel. Perfil ICC e o segmento Adobe ficam. A resposta traz `size` igual ao
  tamanho gravado. Orientação gravada com tipo diferente de `SHORT` é descartada sem recusar a imagem.

- [x] **PNG e WebP gravados sem metadados**
  Um PNG com `tEXt`, `iTXt`, `zTXt`, `eXIf` e `tIME` é gravado sem esses blocos, com os blocos de imagem idênticos.
  Um WebP estendido com `EXIF` e `XMP ` é gravado sem os dois, com as flags do `VP8X` zeradas e o tamanho do RIFF
  correto; WebP animado mantém `ANIM` e todos os `ANMF`, e WebP com `ALPH` separado de `VP8 ` mantém os dois. Os três
  formatos abrem no navegador depois do envio.

- [x] **Imagem com estrutura quebrada é recusada**
  Um JPEG com segmento de tamanho impossível (0 ou além do fim) ou sem `EOI`, um PNG sem `IEND` e um WebP com bloco
  além do fim do arquivo recebem 415 `UPLOAD_FILE_TYPE_NOT_ALLOWED`, e nada é gravado. A chave do código existe nos
  três idiomas. O arquivo `GIF89a` renomeado para `.png` continua recebendo 415, como antes.

- [x] **Cadastro da landing trava os dois botões**
  Em `/<locale>/sign-up` da `web`, enquanto o popup do Google está aberto, o botão de envio e o do Google ficam
  desabilitados (opacidade 0,5); enquanto a criação da conta está pendente, os dois também ficam, e enquanto o login
  que vem depois está pendente, o do Google fica. Duplo clique no envio gera uma requisição só. Sem nada pendente, e
  depois de um erro, os dois voltam a ficar habilitados, em light e dark, desktop e mobile (390 px), nos três idiomas.

- [x] **Componente legado removido**
  `git grep "auth/components" -- apps packages` sai vazio, `packages/auth/package.json` não exporta mais
  `./components/sign-in`, e `pnpm --filter @repo/auth typecheck` passa.

- [ ] **`@repo/email` só no servidor**
  `packages/email/index.ts` começa por `import "server-only"`. Importar o pacote fora do servidor falha com a
  mensagem do `server-only`, e `pnpm --filter api build` continua verde. Os e-mails de contato, convite e recuperação
  de senha saem como antes quando o Resend está configurado (esta última parte depende de chave do Resend e não foi
  verificada).

- [ ] **Sem Storage, nada muda além da caixa de URL**
  Sem bucket, `POST /files` responde 503 `STORAGE_NOT_CONFIGURED` antes de ler o corpo. A caixa de URL do formulário
  aceita só objeto do bucket ou foto do Google; outra URL volta com o toast traduzido do código da API (o toast na
  caixa de URL não foi percorrido no navegador).

---

## Roteiro de teste manual

Pré-requisito: emuladores de pé (`pnpm emulators`, JDK 21), `api` com `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199`,
`app` com `NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199` e `web` com `NEXT_PUBLIC_API_URL` apontando
para a API. Conta de QA no emulador (`qa-<feature>@example.com`), senha fora de arquivo versionado.

1. Em `/pt-br/sign-up` da `web`, clicar em "Continuar com Google". Com o popup aberto, os botões "Cadastrar" e
   "Continuar com Google" ficam desabilitados. Fechar o popup: em 6 a 11 segundos os dois voltam a habilitar, sem
   toast.
2. Preencher e-mail e senha de uma conta que já existe e dar duplo clique em "Cadastrar". Uma requisição só a
   `/auth/sign-up`; os dois botões ficam desabilitados até a resposta; aparece o toast "Este e-mail já está em uso."
   ("This email is already in use." em `en`, "Este correo ya está en uso." em `es`) e os botões voltam a habilitar.
3. No `app`, em Minha conta, enviar um JPEG de 400x200 com `Orientation=6` e GPS fictício, salvar e recarregar. A
   prévia mostra a foto em retrato (`naturalWidth` 200, `naturalHeight` 400). Baixar o objeto pela URL do emulador:
   sem a string de GPS, com um único `APP1` de 36 bytes.
4. Com um avatar externo antigo gravado direto no Firestore (`https://cdn.example.com/...`), mudar só o telefone e
   salvar. Toast "Perfil atualizado."; o avatar continua o mesmo.
5. `curl` com `Transfer-Encoding: chunked` e um arquivo de 6 MiB em `POST /files`: 413 `UPLOAD_FILE_TOO_LARGE` com
   `connection: close`. Arquivo de exatamente 4 MiB: 201.
6. `PUT /account` com `avatar: "https://cdn.example.com/a.png"`: 400 `ACCOUNT_AVATAR_INVALID`. Com
   `https://lh3.googleusercontent.com/a/x`: 200.
