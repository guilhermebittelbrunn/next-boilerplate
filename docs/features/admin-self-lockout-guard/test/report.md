# Relatório do `/test`: o admin não consegue se trancar fora do painel

Rodada autônoma do `/cycle`, na branch `fix/admin-self-lockout-guard` (não protegida). Nada foi commitado e
nenhuma branch foi criada. Os critérios no formato §9.1 estão em `criterios-aceite.md`.

Resultado: nenhum defeito de produção encontrado. 11 critérios verificados e corretos, 1 não verificável
(leitor de tela). As duas lacunas de teste herdadas foram fechadas com testes novos na faixa barata.

## Cobertura

### Comandos e números

| Comando | Resultado |
|---------|-----------|
| `pnpm turbo run test --filter=api --filter=app --filter=@repo/internationalization` (antes dos testes novos) | api 1048 testes / 79 arquivos, app 764 / 92, internationalization 59 / 6; 11 tasks ok, 10 do cache |
| `pnpm --filter app exec vitest run __tests__/usersListArchiveLabels.test.tsx __tests__/userFormFieldsTypeLock.test.tsx --reporter=verbose` | 15 passaram, incluindo "treats no row as own while the signed-in user is unknown" |
| `pnpm --filter app exec vitest run __tests__/editUserPageOwnAccount.test.tsx` | 4 passaram |
| `pnpm --filter app exec vitest run __tests__/useUserCrudSelfLockout.test.tsx` | 4 passaram |
| `pnpm test` (raiz, `turbo test test:emulator`, JDK 21) | 14 tasks ok, 10 do cache. api 1048/79, app 772/94, `api:test:emulator` 170/4, internationalization 59/6, web 82/13, e2e (vitest) 16/2, demais pacotes verdes |
| `pnpm turbo run typecheck --filter=app` | 1 task ok (rodado depois de remover o `.next` corrompido, ver "Incidente de disco") |
| `npx biome check` nos 2 arquivos de teste novos | sem erro |

Sem `--force`. Não remedi `pnpm check` nem o typecheck de `api` e `@repo/internationalization`: este `/test`
só acrescentou arquivos de teste no `apps/app`, e os números do `/review` (808 arquivos, typecheck ok) valem.

### Testes criados

| Arquivo | Nível | O que prova |
|---------|-------|-------------|
| `apps/app/__tests__/editUserPageOwnAccount.test.tsx` (4 casos) | componente, com `useFindUserById`, `useUserCrud`, `useAuth` e `next/navigation` mockados | na edição de si, o select de tipo fica desabilitado e a linha de explicação aparece; trocar só o nome e salvar chama `updateUserMutation.mutate` com `type: "admin"`; com outro admin, o select fica habilitado e sem a linha; com o usuário logado ainda nulo, nada é travado |
| `apps/app/__tests__/useUserCrudSelfLockout.test.tsx` (4 casos) | hook, `renderHook` + `QueryClientProvider`, `apiClient` e `useAlert` mockados, `FormattedError` e dicionário reais | um 403 `USERS_SELF_LOCKOUT_FORBIDDEN` no toggle devolve o cache da listagem ao estado anterior e chama `errorAlert` com o texto traduzido em pt-br, en e es; no `deleteUserMutation`, mostra o texto e não mexe no cache |

Prova de mutação do teste da página de edição: trocar `lockType={isOwnAccount}` por `lockType={false}`
derruba 1 caso; trocar o cálculo por uma expressão sempre verdadeira derruba 2. O arquivo foi restaurado e
conferido com `diff`.

## Decisões de custo de teste

- `apps/api/app/(routes)/users/[id]/route.ts`: nenhum teste novo. Os 11 casos do `describe` novo em
  `usersAdminAuditTrail.test.ts` e o caso de `usersAdminDeleteBilling.test.ts` já cobrem a recusa, a ordem
  das checagens e a comparação por uid. O objeto é uma comparação no handler, sem consulta nem regra de
  Firestore, então teste contra emulador não provaria nada a mais. A chamada real contra o emulador entrou só
  como verificação manual por `curl`, sem arquivo de teste.
- `UsersListClient.tsx`: nenhum teste novo; `usersListArchiveLabels.test.tsx` já cobre linha própria, outra
  linha, outro admin e usuário não resolvido.
- `UserFormFields.tsx`: coberto por `userFormFieldsTypeLock.test.tsx`; o teste novo da página prova o que
  faltava (o cálculo de `isOwnAccount` e o `type` no submit).
- `useUserCrud.tsx` (inalterado, mas é quem leva o código novo ao toast): teste de hook novo.
- i18n: coberto pelo teste de paridade. Nenhum teste da faixa cara foi criado.

## Verificar no `/test` (lista do `review.md`)

| # | Item | Veredito |
|---|------|----------|
| 1 | API contra o emulador com bearer do admin do seed | **confirmado**. `PUT {"disabled":true}`, `PUT {"type":"common"}`, os dois misturados com `displayName` e `DELETE` sobre si: os cinco responderam `403 {"error":{"code":"USERS_SELF_LOCKOUT_FORBIDDEN"}}`. `PUT {"type":"admin","displayName":"..."}` respondeu 200. Depois das recusas, a conta no Auth emulator seguia com `disabled: false`, o perfil com `type: "admin"`, `displayName: null` e `deletedAt: null`, e a coleção `auditEvent` não ganhou nenhum documento das recusas (os 10 eventos da coleção correspondem, pelo horário, às 10 gravações bem-sucedidas). `GET /users/<próprio id>` com o mesmo token respondeu 200, e o login pelo formulário, feito depois, entrou em `/pt-br/admin`. |
| 2 | Edição do próprio perfil e de outro | **confirmado**. Na edição de si, o select de tipo do formulário estava `disabled: true` com o texto "Administrador" e a linha "Você não pode tirar o seu próprio acesso de administrador." aparecia logo abaixo. Trocar o nome e salvar enviou `PUT /users/<id>` com corpo `{"type":"admin","displayName":"Admin QA Editado"}`, a API respondeu 200, apareceu o toast "Usuário atualizado com sucesso." e a listagem mostrou "Administrador". Na edição de outro admin e de um usuário comum, o select estava habilitado e sem a linha. A página de criação não mudou. |
| 3 | Listagem: linha própria e outras | **confirmado**. Linha do admin logado: switch `disabled: true`, `aria-checked="true"`, `title` com o texto novo; menu de ações só com "Editar". Linha de outro admin (`qa-admin-self-lockout@example.com`) e dos dois comuns: switch habilitado, sem `title`, menu com "Editar" e "Arquivar". |
| 4 | Tooltip do switch desabilitado | **🔒 não verificável**. O `title` está no elemento e o cursor é `not-allowed`, mas tooltip nativo do navegador não aparece em screenshot de browser headless, então não dá para dizer se ele é exibido ao passar o mouse. |
| 5 | Teclado e leitor de tela | **parcialmente medido, o resto 🔒**. O Tab pula o switch desabilitado (do menu da linha anterior vai direto ao menu da linha própria), então o `title` não é anunciado por foco. No formulário, o select tem `aria-describedby="..-form-item-description"`, mas esse id não existe na página, e o parágrafo de explicação não está ligado ao campo. O que o leitor de tela lê não foi medido: não houve leitor de tela nesta passada. |
| 6 | Axe no dark em `/admin/users` | **confirmado, com outro instrumento**. Não rodei `pnpm e2e` (ver "Ambiente"). Injetei o `axe-core` 4.13.0 do próprio repo na página logada, no dark, com as mesmas tags da suíte (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`): 0 violações, 26 regras aprovadas, 0 casos de contraste incompleto, com o switch da linha própria desabilitado na tela. |
| 7 | Correção de `isOwnRow` do review | **confirmado**. `usersListArchiveLabels.test.tsx` passou inteiro (13 casos), incluindo "treats no row as own while the signed-in user is unknown". |
| 8 | Light, dark, mobile e 3 idiomas | **confirmado**. `title` do switch: "Você não pode desativar a sua própria conta.", "You can't disable your own account.", "No puedes desactivar tu propia cuenta.". Linha do formulário: os três textos do critério, com o select mostrando "Administrador", "Administrator" e "Administrador". Contraste da linha de explicação: 4,54:1 no light (texto rgb 110,111,111 sobre 243,243,243) e 5,86:1 no dark (161,161,161 sobre 38,38,38). No mobile (390 x 844), o menu da linha própria abriu só com "Editar", e a linha de explicação ocupou 326 px de largura em duas linhas, sem rolagem horizontal da página. A tabela rola na horizontal no mobile, como já rolava antes. |

## Critérios de aceite, item a item

| Critério | Status | Meio |
|----------|--------|------|
| Desativar a própria conta pela API | ✅ | `curl` contra emulador + teste de rota |
| Rebaixar o próprio tipo | ✅ | `curl` contra emulador + teste de rota |
| Arquivar a própria conta | ✅ | `curl` contra emulador (403, `deletedAt: null`, sem auditoria) + teste de rota (assinatura não cancelada) |
| Edições inofensivas sobre si | ✅ | `curl` (3 variações, 200) + e2e (salvar nome pela tela) + teste da página |
| Regra vale para a conta, não para o documento | ✅ | `curl` com um segundo perfil criado no Firestore emulator com o mesmo uid: `PUT disabled`, `PUT type` e `DELETE` responderam 403; o perfil foi apagado em seguida |
| Agir sobre outro admin continua permitido | ✅ | `curl` (4 `PUT` com 200) + teste de rota (`DELETE` 204) |
| Ordem das respostas de erro | ✅ | `curl`: 404 no `PUT` e no `DELETE` de id inexistente, 400 `USERS_NOTHING_TO_UPDATE`, 400 `VALIDATION_FAILED`, 403 `AUTH_REQUEST_IMPERSONATION_READ_ONLY` com `x-request-role: common` |
| Listagem sem controles na linha própria | ✅ | e2e nos 3 idiomas + teste de componente |
| Formulário trava o próprio tipo | ✅ | e2e nos 3 idiomas + teste de componente e da página |
| Erro com texto nos 3 idiomas, toast e rollback | ✅ | paridade + teste de hook novo |
| Tema e responsivo | ✅ | e2e light/dark/mobile + axe no dark |
| Teclado e leitor de tela | 🔒 | Tab medido; leitor de tela não executado |

## Evidências e2e

Tudo medido no `next dev` contra os emuladores, logado como o admin do seed. Os prints em `test/e2e/` (01, 03,
05, 06, 08, 09, 10) são descartados pelo `.gitignore`; o que vale é o texto abaixo e as tabelas acima.

- `/pt-br/admin/users`, desktop dark: 4 linhas visíveis. Só a do admin tem switch desabilitado, com
  opacidade 0,5 e cursor `not-allowed`; as outras estão com opacidade 1 e cursor `pointer`.
- Mesma página em light: switch próprio também em opacidade 0,5, legível sobre o fundo claro.
- Requisição real do formulário de edição de si: `PUT http://localhost:3002/users/<id>` com
  `{"type":"admin","displayName":"Admin QA Editado"}`, status 200; o evento de auditoria gravado tem
  `changedFields: ["type","displayName"]`.
- Erros de console na página de edição: só divergências de hidratação no `id` gerado pelo Radix nos menus do
  cabeçalho (`radix-_R_...`), que não pertencem a este diff. Nenhuma divergência em `title` ou `disabled`.

### Observações fora do critério

- A página `/admin/users` tem, além da tabela visível, uma segunda cópia das linhas dentro de um `div` com
  `display: none`. Nessa cópia escondida o switch da linha própria aparece habilitado. Ela não é visível nem
  recebe clique ou foco, então não é defeito do que o usuário vê. Não investiguei de onde vem a cópia.
- O dropdown de ações do antd não fecha com Escape. Comportamento anterior a este diff.

## Lacunas de teste herdadas

| Lacuna | Veredito |
|--------|----------|
| `edit/[id]/page.tsx`: comparação de uid entre `useFindUserById` e `useAuth` sem teste de componente | **fechada aqui**: `editUserPageOwnAccount.test.tsx`, com prova de mutação |
| Toast de `USERS_SELF_LOCKOUT_FORBIDDEN` e rollback do switch sem teste próprio | **fechada aqui**: `useUserCrudSelfLockout.test.tsx` |
| `isOwnRow` com `useAuth` fora do provider | **fora de escopo**: fechada pela correção do `/review`; o provider é montado na raiz |
| Leitor de tela e tooltip nativo (itens 4 e 5) | **continua aberta**: exige leitor de tela e browser com interface |

## Follow-ups sugeridos

- 🟡 Acessibilidade do formulário: ligar o parágrafo de explicação ao select por `aria-describedby` (hoje o
  atributo aponta para um id que não existe). Hipótese de correção: renderizar a linha como a descrição do
  campo do formulário (o mesmo id que o `aria-describedby` já espera), em vez de um `<p>` solto.
- 🟢 Se o tooltip nativo não aparecer em botão desabilitado em algum navegador-alvo, envolver o switch num
  `span` com o `title`, como o `review.md` já sugere.
- 🟢 A corrida entre dois admins que se desativam ao mesmo tempo segue como decisão em aberto do `review.md`.

## Ambiente do e2e

- Todas as portas estavam livres no início (3000, 3001, 3002, 3003, 8080, 9099, 9199, 4001, 4000). Nada foi
  reutilizado do usuário.
- Subi: `pnpm emulators` com `JAVA_HOME` apontando para o `openjdk@21` do Homebrew, `pnpm seed`,
  `pnpm --filter api dev` e `pnpm --filter app dev`. Os dois servidores rodaram com o ambiente montado pelo
  `buildStackEnv` da suíte e2e (bloco do emulador forçado, credenciais reais vazias), para que o `.env`
  local, que aponta para um projeto Firebase real, não fosse lido.
- `pnpm e2e` não rodou: a suíte exige 3000/3001/3002 livres, que estavam ocupadas pelos meus servidores, e o
  disco estava cheio (ver abaixo). O axe injetado cobriu o item 6.
- Teardown: matei por PID os servidores, os `next-server` filhos e o emulador. No fim, 3000, 3002, 8080,
  9099, 9199, 4001, 4400, 4500 e 9150 estavam sem processo escutando. A sessão do browser foi fechada e a
  pasta temporária com o token e os scripts de apoio foi apagada.
- Comportamento observado só em `next dev`: nenhum tratado como defeito.

### Incidente de disco

O volume de dados da máquina tinha cerca de 117 MB livres no início. No meio da passada ele encheu
(`ENOSPC`), e o `next dev` gravou um `apps/app/.next/dev/types/routes.d.ts` truncado. Efeitos: o servidor
reiniciado passou a responder 404 em `/pt-br/admin/users`, e o `typecheck` do app falhou dentro do `.next`.
As pastas `apps/app/.next` e `apps/api/.next` tinham sido criadas pelos meus servidores nesta rodada
(10:35), então apaguei as duas; o typecheck voltou a passar e o `next dev` seguinte funcionou. Para liberar
espaço no pico, também esvaziei dois prints (02 e 04), já removidos. O disco terminou com cerca de 4,6 GB
livres, por liberação de fora desta sessão. O `firestore-debug.log` da raiz, ignorado pelo git, foi
regravado pelo emulador.

## Dados de QA e estado de dev

Tudo foi criado no emulador, que morreu no teardown. Nenhuma conta em projeto Firebase real e nada a
acrescentar ao `docs/PRE-PRODUCTION.md`.

- Conta `qa-admin-self-lockout@example.com` (admin), criada por `POST /users` para servir de "outro admin".
- Perfil `qaDupProfileSameUid` na coleção `user`, com o uid do admin do seed, apagado logo depois do teste.
- `displayName` do admin do seed alterado várias vezes.
- O `test:emulator` do `pnpm test` reutilizou os mesmos emuladores durante a rodada.

Nenhuma senha, token ou chave foi gravada neste arquivo. A senha do seed está documentada em
`docs/SETUP.md`; a da conta de QA morreu com o emulador.
