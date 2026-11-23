# Critérios de Aceite (Checklist)

Medidos no `/test` de 2026-11-23, sobre o working tree em `388a453`. Marcado `[x]` quando o QA mediu e o
resultado bateu; `[ ]` com 🔒 quando só o GitHub consegue provar. O meio e o valor medido de cada item
estão em `report.md`.

- [x] **A chave do Arcjet chega ao proxy da landing**
  Com `ARCJET_KEY` válida no ambiente, `env.ARCJET_KEY` em `apps/web/env.ts` devolve a chave e o proxy chama
  `secure()` com a lista de permissão de buscadores, previews e monitores. Sem o `skipValidation`, o `extends`
  entra no objeto final. Chave ausente, vazia ou só com espaço chega como `undefined`; chave sem o prefixo
  `ajkey_` reprova o carregamento do `env` com "Invalid environment variables".

- [x] **A landing recusa cliente automatizado e deixa passar navegador**
  Num build de produção com a chave e `ARCJET_ENV=development`, `python-requests`, `curl` e `HeadlessChrome`
  recebem 403 em `/pt-br` e um Chrome comum recebe 200. O 403 sai com `permissions-policy`, HSTS, `nosniff`,
  `referrer-policy` e a CSP em `Report-Only`. Fora da Vercel e sem `ARCJET_ENV=development`, o Arcjet não
  recebe o IP do cliente e libera tudo; isso é limitação local documentada em `docs/FORKING.md`, não defeito.
  Googlebot falsificado a partir de `localhost` recebe 200 em modo de desenvolvimento, porque o Arcjet não
  confere o IP do robô nesse modo; a verificação real fica para a produção.

- [x] **A landing sobe e funciona sem a chave**
  Com `ARCJET_KEY=""`, o build passa e a landing responde 200 a `python-requests` e a `curl`, sem nenhuma
  linha do Arcjet no log. Esse é o modo degradado que todo fork recebe do `.env.example`.

- [x] **A landing hidrata no navegador com o `env` validado**
  Com `NEXT_PUBLIC_APP_URL` preenchida, os CTAs "Cadastrar" do hero e do rodapé apontam para o app e o
  header mostra "Ir para o painel" depois do login. Com a variável vazia, os CTAs caem em `/<locale>/sign-up`.
  Nos dois casos o console do navegador fica sem "Invalid environment variables" e sem "Attempted to access a
  server-side environment variable", e o menu de tema abre (a página hidratou).

- [x] **Permissions-Policy nos três apps**
  Toda resposta de `web`, `app` e `api` traz
  `accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()`,
  inclusive o redirecionamento de idioma (307), o 403 do Arcjet, o 401 da API, o preflight CORS (204) e as
  rotas de sessão. Na landing o cabeçalho continua aplicado com a CSP em `Report-Only`.

- [x] **Cabeçalhos nas rotas de sessão das front-ends**
  `POST /api/auth/session`, `DELETE /api/auth/session`, `POST /api/auth/session/refresh` e
  `POST /api/auth/custom-token`, em `app` e `web`, saem com HSTS, `nosniff`, `Referrer-Policy`, CSP e
  `Permissions-Policy`, tanto no erro (400 `AUTH_MISSING_TOKEN`, 401 `AUTH_NO_SESSION`) quanto no sucesso
  (200 com `set-cookie: access-token=…; HttpOnly; Secure; SameSite=lax`). O proxy não redireciona `/api/*`,
  não grava `x-locale` e não chama o Arcjet nessas rotas: um `python-requests` com a chave ativa recebe a
  resposta da rota, não 403. Caminhos que só começam com `api` (`/apis`, `/api-docs`) passam pelo roteamento
  de idioma e recebem 307 para `/pt-br/…`.

- [x] **Login, logout e SSO continuam funcionando**
  Entrar e sair pelo painel e pela landing funciona como antes, com o cookie `access-token` gravado pela rota
  de sessão. Senha errada mostra "Senha incorreta." e mantém a pessoa no formulário. Login na `web`, clique em
  "Ir para o painel" e o app abre autenticado. Sair no app apaga o cookie, manda para
  `/<locale>/sign-in?redirect=…`, e a `web`, na próxima carga, recebe 401 nas rotas de sessão e volta para o
  formulário de login. A suíte `pnpm e2e` passa.

- [x] **Logo da marca só em HTTPS fora de loopback**
  `NEXT_PUBLIC_APP_LOGO_URL` com `https:` é aceita; com `http:` só quando o host é `localhost`, `127.0.0.1`
  ou `[::1]`. Com `http://cdn.example.com/logo.png`, o build passa, o header mostra o ícone genérico e
  `cdn.example.com` não aparece na CSP nem no HTML. Com `http://localhost:3001/…`, o logo carrega e
  `img-src` ganha `http://localhost:3001`.

- [x] **Otimizador de imagem restrito ao bucket do produto**
  `apps/app/next.config.ts` não declara `images.domains`. O build do app passa com
  `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` preenchida e vazia. Preenchida, `/_next/image` aceita
  `storage.googleapis.com/<bucket>/…` (inclusive com a query de URL assinada) e recusa com 400
  `"url" parameter is not allowed` outro bucket, um bucket com o mesmo prefixo e `www.google.com`. O avatar do
  Google (`lh3.googleusercontent.com`) continua permitido.

- [ ] **Segredo no diff reprova o CI** 🔒
  O job `secrets` baixa o Gitleaks `v8.30.1` com checksum conferido e varre só os commits da PR ou do push.
  Uma PR com chave no formato da Stripe sai vermelha e uma PR limpa sai verde. Só o runner do GitHub prova o
  job; localmente, o mesmo bloco `run:` dá saída 1 com o fixture e 0 sobre os commits limpos e sobre o diff
  da branch.

- [ ] **Dependência vulnerável de produção reprova o CI** 🔒
  O job `audit` roda `pnpm audit --prod --audit-level=high` sem instalar dependências. Hoje sai 0, e o mesmo
  comando com `--audit-level=moderate` sai 1, o que prova que ele reprova quando há achado no nível pedido.
  Exceção só entra por `pnpm.auditConfig.ignoreGhsas`, com justificativa em `"//"`.

- [x] **Actions pinadas por SHA**
  As 21 linhas `uses:` do `ci.yml` apontam para um SHA de 40 caracteres com a versão em comentário, e nenhuma
  usa tag. Os 6 SHAs distintos existem no repositório de cada action, e a tag anotada do
  `pnpm/action-setup` (`v6.1.1`) dereferencia até o commit pinado.

- [ ] **Dependabot configurado** 🔒
  `.github/dependabot.yml` declara `npm` e `github-actions` em `/`, semanal, com grupos de minor e patch. O
  arquivo carrega como YAML; abrir PR e cobrir os workspaces do pnpm só o GitHub prova.

- [x] **`.gitignore` cobre variantes de `.env` e a service account**
  `.env.production`, `.env.development`, `.env` e `*-firebase-adminsdk-*.json` ficam ignorados em qualquer
  pasta, e os três `.env.example` continuam versionados (`git check-ignore` sai 1 para eles).

- [x] **Documentação sem afirmação falsa**
  O passo de `ARCJET_ENV=development` em `docs/FORKING.md` e no item 2.12 de
  `docs/delivery/02-infra-hardening.md` bate com a medição. As referências de linha de
  `docs/SUBPROCESSORS.md` batem com o código depois da correção feita neste `/test` (três referências de
  `apps/app` tinham derivado, uma delas por causa desta tarefa).
