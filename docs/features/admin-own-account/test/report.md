# Relatório de QA: área de conta para o admin

Rodada autônoma do `/cycle`, 2026-11-25. Branch `guilhermebittelbrunn/claude-cycle-full-pipeline` (não protegida;
o nome reprova no regex do `/review`, que já propôs `feat/admin-account-and-centered-forms`). Nada commitado.

O `STATE.md` ainda trazia `review = in-progress` e não há commit da feature à frente de `main`
(`git log main..HEAD` vazio). Isso é coerente com o `/cycle`, que não commita: o gate do `/review` fecha quando
o plano de commits for executado.

## Resultado

14 critérios ✅, 1 🔒 (admin só com Google definindo senha), nenhum ❌. Nenhum defeito de produção desta feature.
Duas observações pré-existentes fora do escopo (seção "Observações").

## Cobertura e gates

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api test` | 130 arquivos, 1852/1852 verdes (33 s) |
| `pnpm --filter app test` (1.ª, antes dos testes novos) | 146 arquivos, 1351/1351 verdes |
| `pnpm --filter app exec vitest run` nos 3 arquivos novos | 9/9 verdes |
| `pnpm --filter app test` (2.ª, com os testes novos) | 1359/1360: `auditFiltersDateInput.test.tsx` estourou o `testTimeout` de 20 s com load average 52 |
| `pnpm test` (raiz, 1.ª) | `api#test` saiu com 1 erro de infraestrutura (`[vitest-pool]: Timeout starting forks runner`) com 1852/1852 verdes; o turbo parou |
| `pnpm test` (raiz, 2.ª, sem `--force`) | 14/15 tarefas (12 do cache). `api:test` 1852/1852, `api:test:emulator` 8 arquivos e 274 testes, `app:test` 1359/1360 com `signInEmailLinkEntry.test.tsx` falhando (link não encontrado no `findByRole`) |
| `pnpm --filter app typecheck` | sem erro |
| `pnpm --filter @repo/internationalization test` | 7 arquivos, 67 testes, paridade verde |
| `npx biome check` nos 3 arquivos novos | sem erro |

`pnpm check` e `pnpm --filter api typecheck` não foram medidos de novo: o `/review` mediu, e esta etapa só
acrescentou arquivos de teste em `apps/app/__tests__`, conferidos com o Biome e com o typecheck do app.

### A instabilidade do item 10

A suíte do app falhou em duas das quatro execuções completas, cada vez num arquivo diferente
(`auditFiltersDateInput.test.tsx` e `signInEmailLinkEntry.test.tsx`). Nas duas, a máquina estava com load
average entre 35 e 58 por processos alheios ao repositório. Os três arquivos suspeitos
(`auditFiltersDateInput`, `tableLoadMore`, `signInEmailLinkEntry`) passaram isolados três vezes seguidas,
11/11 em cada.

Classifiquei como instabilidade pré-existente sob carga, com esta prova: os três arquivos de teste não mudaram
em relação a `main` (`git diff main --stat` vazio para eles), e nenhum módulo que eles importam está entre os
arquivos alterados do working tree (`AuditFilters`, `SignInForm` e o `Table` do design system não aparecem em
`git diff --name-only main`; a única dependência em comum é o dicionário, que ganhou chaves novas). As falhas
são de tempo: `findByRole` com o timeout padrão de 1 s e um teste de calendário que passou de 20 s. Não montei
um worktree de `main` para rodar a suíte lá: instalar as dependências de outro checkout com a máquina nesse
estado custaria mais do que a prova pelo grafo de import acrescenta.

O risco para o CI continua se o runner estiver sob carga. Sugestão para o backlog, fora de escopo: subir o
timeout do `findByRole` em `signInEmailLinkEntry.test.tsx` ou trocar por `waitFor` com prazo explícito.

## Testes criados

Todos na faixa barata (Vitest + jsdom, com `vi.mock`), fechando as três lacunas herdadas:

- `apps/app/__tests__/adminAccountClient.test.tsx` (3): o `AdminAccountClient` monta `AccountTabs` com
  `area="admin"` e a conta do `useMyAccount`; o breadcrumb tem só a raiz do painel admin; erro de carga troca
  as abas pela mensagem traduzida.
- `apps/app/__tests__/adminAccountNavigation.test.tsx` (4): o `Navbar` repassa `accountPath` ao
  `ProfileDropdown` e não inventa um quando não recebe; o layout admin entrega `accountPath="/admin/account"` à
  navbar; o layout manda o admin personificando para `/{locale}`.
- `apps/app/__tests__/accountSecurityFormRequests.test.tsx` (2): com o `AccountSessionsPanel` real e o
  `apiClient` mockado, `passwordOnly` não chama `account.listSessions`; sem a prop, chama uma vez. O segundo
  caso é o controle positivo, para o primeiro não passar por acidente.

### Decisões de custo

- Nenhum teste da faixa cara foi criado. O Storage do avatar era o único candidato. Medi o caminho do objeto
  direto no emulador durante o e2e (`uploads/T5eHeWRVnHRB8LJBUjUB/…`, o id do perfil do admin, 177 bytes,
  `image/png`), e o `fileUploadRoute.test.ts` já trava o prefixo com mock. Um teste novo contra o emulador
  provaria o que o `api:test:emulator` já prova para upload (8 arquivos, 274 testes).
- Rotas da API tocadas (`account`, `account/password`, `account/password/set`, `files`) e o guard
  `requireOwnAccountApi`: os testes com mock do `/develop` (T1 a T6) cobrem guard, ownership, recusa sob
  personificação e escopo inválido. Não acrescentei cenário; a matriz HTTP abaixo mediu o mesmo em runtime.
- `AccountTabs`, `accountTabRouting`, `AccountProfileForm`, `AccountPreferencesForm` e `ProfileDropdown`:
  cobertos pelos testes T7 a T12 do `/develop`.

## Verificar no `/test` (lista do `review.md`)

1. **Confirmado.** Por `curl` contra a API em `next dev`, com ID tokens do emulador:
   - `GET /account/sessions` como admin: `403 COMMON_PANEL_FORBIDDEN`;
   - `PUT /account` com `x-request-role: common` e o uid de `user@example.com`: `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`;
   - `PUT /account` com `x-request-role: admin` e o uid de outro admin (`qa-admin-own-account@example.com`): `403 AUTH_REQUEST_ADMIN_TARGET_INVALID`; com `x-request-role: common` e o mesmo alvo: `403 AUTH_REQUEST_IMPERSONATION_TARGET_INVALID`;
   - `POST /files?scope=organization` como admin: `403 COMMON_PANEL_FORBIDDEN`;
   - `POST /files?scope=xyz`: `400 VALIDATION_FAILED`, com e sem token.
   Depois das tentativas, `GET /account` do comum e do admin mostrou `displayName` intacto: nada foi gravado.
2. **Confirmado.** Upload pela tela: `POST /files` 201, objeto em `uploads/T5eHeWRVnHRB8LJBUjUB/<uuid>.png` (id
   do perfil do admin), servido pelo emulador com 200 `image/png`. Depois de salvar e recarregar, as duas `<img>`
   (formulário e avatar) carregam o objeto com `naturalWidth` 64.
3. **Confirmado.** Como `user@example.com`: avatar com `POST /files` 201 em `uploads/qwLM4syDYbhsmXag9xRs/`
   (perfil do comum); `POST /files?scope=organization` 201 em `uploads/org-9aAVGYpcx3QmsnianfZb/`; Segurança
   lista "Métodos de login", "Senha", "Sessões ativas" e "Sair de todos os dispositivos" e chama
   `GET /account/sessions` 200; Perfil tem o botão "Trocar e-mail".
4. **Confirmado.** Na tela do admin, `GET /account` do navegador respondeu 200; por `curl`, 200 com e sem os
   headers de contexto.
5. **Confirmado.** O item do menu do avatar e o link lateral apontam para `/pt-br/admin/account`; o clique leva a
   `/pt-br/admin/account?tab=profile`. Título da aba: "Minha conta | next-boilerplate", "My account |
   next-boilerplate" e "Mi cuenta | next-boilerplate". Lateral: "Minha conta", "My account", "Mi cuenta".
6. **Confirmado.** A 1280 px, tabs "Perfil", "Segurança", "Preferências". A 375 px, lista lateral com
   `display: none` e `<select>` com `profile`, `security`, `preferences`. `?tab=billing&foo=1`,
   `?tab=privacy&foo=1` e `?tab=xyz&foo=1` regravam para `?tab=profile&foo=1`; sem `tab`, vira
   `?foo=1&tab=profile`.
7. **Confirmado.** Recarregando `/pt-br/admin/account?tab=security` com a captura de rede limpa, o navegador fez
   só `GET /users?type=common` (seletor de personificação), sem chamada a `/account/sessions` ou
   `/account/sign-in-methods/*`. A seção tem um único `h3`, "Senha". Senha atual errada: `POST
   /account/password` 400 e o texto "A senha atual está incorreta." na tela. Senha certa com clique duplo: um
   único `POST /account/password` 200, `DELETE /api/auth/session` 200 e volta para
   `/pt-br/sign-in?redirect=%2Fpt-br`. No emulador, a senha antiga passou a responder `INVALID_PASSWORD` e a nova
   entra; o login pela tela com a nova caiu em `/pt-br/admin`.
8. **Confirmado.** Escuro + English leva a `/en/admin/account?tab=preferences`, com `<html class="… dark">`,
   `lang="en"` e h1 "My account". Recarregado, igual. Sair e entrar: `/en/admin`, escuro, h1 "Hello, Admin".
9. **Confirmado.** Personificando `user2@example.com`, "Minha conta" leva a `/pt-br/account?tab=profile` com
   cinco seções, o aviso "Modo somente leitura … Atuando como: user2@example.com" e "Salvar" e "Trocar e-mail"
   desabilitados. `/pt-br/admin/account` digitado volta para `/pt-br`.
10. **Reproduzido; instabilidade pré-existente sob carga.** Ver "A instabilidade do item 10".

## Evidências e2e (o que foi medido)

- Coluna centralizada (feature anterior, sem regressão): a 1280 px a coluna do h1 tem `max-w-4xl mx-auto` e
  896 px de largura, começando em x=313 dentro de um `main` que vai de x=257 com 1008 px. Sobram 56 px de cada
  lado.
- Blocos sem esticar: o `<form>` do Perfil tem `class="flex w-full flex-col"` (sem `flex-1`) e 318 px de altura
  (322 px em es); o bloco de Preferências termina logo abaixo do botão.
- E-mail do admin: campo desabilitado com `admin@example.com`, sem botão de troca e sem o texto de "não
  suportado".
- Nome em branco mostra "Informe o nome de exibição." sem requisição à API. Confirmação diferente mostra "As
  senhas não coincidem." sem requisição.
- Perfil salvo: `PUT /account` 200 e, depois de recarregar, nome "Admin QA Tester", telefone
  "+55 51 98888-7777" e o avatar mostrando "Admin". O toast de sucesso não foi capturado (sumiu antes da leitura
  com a máquina lenta); a evidência é o 200 e a persistência.
- `PUT /account` do admin com referência de avatar de outro prefixo (`uploads/<perfil do comum>/…`) e com host
  externo: `400 ACCOUNT_AVATAR_INVALID` nos dois.
- Rotas do painel comum como admin: `GET /account/export`, `GET /entities`, `GET /notifications`,
  `POST /account/deletion`, `POST /account/email`, `POST /account/sessions/revoke`, `POST /account/onboarding` e
  `DELETE /account/sign-in-methods/google` responderam `403 COMMON_PANEL_FORBIDDEN`. `GET /organization`
  respondeu `404 ORGANIZATION_MEMBERS_DISABLED`, porque a flag está desligada no `.env.example`.
- Sob personificação, `POST /account/password` e `POST /files`: `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`.
- Sem token, `GET /account`, `PUT /account`, `POST /account/password` e `POST /files`: `401 AUTH_INVALID_TOKEN`.
- `PUT /account` do admin com `id` no body: `400 VALIDATION_FAILED` (o `.strict()` recusa em vez de ignorar).
- Claro: `body` com fundo `lab(100 0 0)` e texto `lab(2.75 0 0)`. Escuro: fundo `lab(2.75 0 0)` e texto
  `lab(98.26 0 0)`.
- 375 px (pt-br claro e es escuro): `scrollWidth` igual a `innerWidth` (375), sem rolagem horizontal.
- Admin sem personificação digitando `/pt-br/account` vai para `/pt-br/admin`. Comum digitando
  `/pt-br/admin/account` vai para `/pt-br`.

Prints de apoio em `test/e2e/`, descartados pelo `.gitignore`: `01-admin-perfil-light-1280.png` (saiu escuro,
porque o tema estava em "Sistema" e o navegador em escuro), `02-admin-preferencias-light-1280.png`,
`03-admin-perfil-light-375.png`, `04-admin-preferences-dark-en-1280.png`, `05-admin-seguranca-dark-es-375.png`
e `06-personificando-conta-comum.png`. Nenhum mostra dado de pessoa real.

Nenhum comportamento suspeito apareceu em `next dev`, então não houve `build && start`.

## Lacunas herdadas

- Render de `AdminAccountClient`/`page.tsx`: **fechada** para o client (`adminAccountClient.test.tsx`) e em
  runtime (item 5). O prefetch do `page.tsx` com `getServerApiClient("admin")` segue sem teste próprio; em
  runtime a tela abriu sem `GET /account` do navegador, o que indica que a query chegou hidratada.
- `Navbar` repassando `accountPath` e o layout admin passando `/admin/account`: **fechada**
  (`adminAccountNavigation.test.tsx`).
- Ausência de requisição a `/account/sessions` no modo só senha: **fechada** (`accountSecurityFormRequests.test.tsx`
  e item 7 em runtime).
- Admin só com Google definindo senha: **continua aberta** em runtime (🔒, precisa do reauth real do Google);
  coberta por unit.
- Upload sem bucket (`503 STORAGE_NOT_CONFIGURED`) e telefone vazio gravando `null`: **fora desta passada**. O
  comportamento não mudou com a feature e tem teste com mock.

## Observações (pré-existentes, fora do escopo)

- Sob personificação, o botão "Escolher imagem" do Perfil fica habilitado, enquanto "Salvar" fica desabilitado.
  A API barra a escrita (`POST /files` com `403 AUTH_REQUEST_IMPERSONATION_READ_ONLY`, medido), então nada
  vaza; o controle só deveria estar desabilitado. O `HookFormImageUpload` em `AccountProfileForm.tsx` não recebe
  `isImpersonating`, e esta feature não mexeu nisso.
- O console do `next dev` registra três vezes "An empty string ("") was passed to the src attribute" na conta
  personificada, que não tem avatar. Não investigado.

## Ambiente do e2e

Todas as portas estavam livres antes (3000, 3001, 3002, 3003, 9099, 8080, 9199, 4001). Subi e derrubei:

- `pnpm emulators` (Auth 9099, Firestore 8080, Storage 9199, UI 4001), com o JDK 21 do Homebrew no `PATH`;
- `api` em 3002 e `app` em 3000 com `next dev`, carregando o `.env.example` de cada app (emulador, projeto
  `demo-next-boilerplate`).

No fim, fechei as duas sessões do `agent-browser`, parei os processos pelo PID e conferi vazias as portas
3000, 3002, 9099, 8080, 9199, 4001, 4400, 4500 e 9150. Apaguei os `AGENTS.md` que o `next dev` gerou em
`apps/api` e `apps/app`; o `AGENTS.md` da raiz não mudou.

## Dados de QA e estado de dev

Tudo no emulador, sem export configurado: o estado sumiu quando o emulador parou. Nenhum projeto Firebase real
foi tocado.

- Contas do seed (`admin@example.com`, `user@example.com`, `user2@example.com`), com a senha documentada em
  `docs/SETUP.md`.
- `qa-admin-own-account@example.com`: segundo admin criado no emulador para o teste de alvo admin. Morreu com o
  emulador e não entra no `docs/PRE-PRODUCTION.md`.
- A senha de `admin@example.com` foi trocada no emulador no item 7 e não foi restaurada; o próximo `pnpm seed`
  recria a conta com a senha padrão.
- Nome, telefone, avatar e preferências (escuro, `en`) do admin, e um avatar órfão do comum, ficaram só no
  emulador.
