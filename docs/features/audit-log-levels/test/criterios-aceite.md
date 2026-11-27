# Critérios de Aceite (Checklist): audit-log-levels

Status medido no `/test` de 2026-11-27 (rodada 1 e remedição da rodada 2), no emulador (`demo-next-boilerplate`) com `api` e `app` em
`next dev`. Legenda: ✅ aprovado, ❌ reprovado, 🔒 não verificado por falta de infra externa. O meio de
cada medição está entre parênteses; os detalhes ficam em [`report.md`](report.md).

- [x] ✅ **Todo evento novo grava o nível derivado da ação** (unit + emulador)
  Cada documento gravado em `auditEvent` tem `level` igual a `sensitive` ou `info`, definido pelo mapa do
  servidor e nunca por parâmetro do chamador. As 18 ações anteriores e `user.create` gravam `sensitive`; as
  sete de ciclo de vida gravam `info`. Uma ação nova sem nível no mapa quebra o `typecheck`. No emulador,
  `account.signUp`, `account.email.verify` e `account.onboarding.complete` saíram `info`, e `user.create`
  e `account.delete` saíram `sensitive`.

- [x] ✅ **Registro antigo lê como sensível** (emulador + API + browser)
  Um documento sem `level` aparece na listagem "Todos os níveis" com o rótulo "Sensível" ("Sensitive",
  "Sensible"). Antes do backfill ele não aparece no filtro "Sensível"; depois de
  `pnpm --filter api backfill-audit-levels --apply` aparece. O script em modo padrão é dry-run, e a segunda
  execução não altera nada. Medido também com 458 documentos, o que passa por duas páginas do laço.

- [x] ✅ **Admin cria usuário e o evento é sensível** (browser + emulador + rota)
  `POST /users` bem-sucedido grava `user.create` com ator = admin, alvo = perfil criado e rótulo do alvo =
  e-mail informado, sem `expiresAt`. Se a criação do perfil falhar (500 `USERS_PROFILE_CREATE_FAILED`),
  nenhum evento é gravado (`usersRoute.test.ts`). A resposta da rota não muda.

- [x] ✅ **Cadastro grava um evento informativo** (browser + emulador para senha; unit para Google/link)
  Cadastro por senha e primeiro contato por Google ou link gravam um `account.signUp`, com ator e alvo
  iguais ao titular. O cadastro por senha leva o `requestId`; o primeiro contato por Google/link grava
  `requestId: null`. Conta com perfil arquivado não ganha perfil nem evento. O caminho Google/link só tem
  prova por teste unitário (`googleSignInProfile`, `userMergeArchivedProfile`).

- [x] ✅ **E-mail confirmado grava evento do titular** (emulador + unit) · 🔒 no Identity Toolkit real
  `POST /auth/email-verification/confirm` com código válido grava `account.email.verify` do dono do e-mail.
  O Auth emulator devolve `localId` em `accounts:update` com `oobCode`, e o evento saiu com o titular certo,
  sem `audit/subject-not-found` no log. Código inválido ou de outro tipo (`AUTH_OOB_CODE_INVALID`) não grava
  (unit). Sem projeto Firebase real, a presença do `localId` na resposta de produção continua 🔒.

- [x] ✅ **Onboarding concluído grava uma vez, inclusive com duas abas** (API + emulador + unit)
  Só a transição que preenche `completedAt` grava `account.onboarding.complete`. Duplo clique em "Concluir"
  disparou um único `POST`. Na remedição, 5 rodadas de requisições concorrentes no último passo (2, 2, 2, 3
  e 3 requisições) responderam todas 200 com o mesmo `completedAt`, igual ao do documento, e gravaram um
  evento por perfil. Envio repetido depois da conclusão responde o estado salvo e não grava nada. Na rodada
  1 essa corrida gravava dois eventos.

- [ ] 🔒 **Eventos de assinatura sem repetição** (unit) · navegador sem Stripe
  Ativação, troca de plano, cancelamento agendado e encerramento gravam o evento correspondente, com id
  determinístico `stripe_<event.id>_<action>`, e reentrega não duplica. Provado por
  `subscriptionAudit.test.ts` e `paymentsWebhookRoute.test.ts`; ninguém viu os eventos no navegador porque
  não há Stripe em modo teste.

- [x] ✅ **Coluna de nível na listagem** (browser)
  `/admin/audit` mostra a coluna "Nível" / "Level" / "Nivel" com badge vermelho para sensível e neutro para
  informativo, legível em light e dark. No mobile a tabela rola dentro do próprio contêiner e a página não
  rola na horizontal.

- [x] ✅ **Filtro por nível combinável** (browser + aba de rede)
  O filtro tem "Todos os níveis", "Sensível" e "Informativo", com "Todos os níveis" como padrão. Com
  usuário e período, a requisição levou `userId`, `from`, `to` e `level` juntos e a lista trouxe só os três
  eventos que casavam. Lista vazia mostra "Nenhum evento registrado.". "Limpar" voltou o nível para "Todos
  os níveis" e a requisição seguinte foi `?limit=20`, sem `level`.

- [x] ✅ **Validação do parâmetro na borda** (API + unit)
  `GET /audit-events?level=critical` e `?level=INFO` respondem 400 `VALIDATION_FAILED`; no navegador a
  mensagem aparece como "Dados inválidos." com os filtros ainda visíveis. `level=` vazio é tratado como
  ausente.

- [x] ✅ **Autorização da listagem inalterada** (API + unit)
  Usuário comum recebe 403 `ADMIN_FORBIDDEN`; sem token, 401 `AUTH_INVALID_TOKEN`. Nenhuma rota nova grava,
  edita ou apaga evento.

- [ ] 🔒 **Modo degradado sem índice publicado** (unit) · projeto real
  Num projeto real sem os índices novos, filtrar por nível responde 503 `PAGINATION_INDEX_MISSING` e nunca
  500. O emulador não exige índice composto; a prova é `auditEventsRoute.test.ts`.

- [x] ✅ **Vencimento só nos eventos informativos** (emulador) · TTL de fato 🔒
  Os eventos `info` gravaram `expiresAt` como `timestampValue` exatamente 365 dias depois de `createdAt`
  (2026-11-27T03:21:47.576Z → 2027-11-27T03:21:47.576Z); `user.create` não tem o campo, e o backfill não o
  acrescenta. A TTL apagando documento depende do plano Blaze e continua 🔒.

- [x] ✅ **Exclusão de conta anonimiza os informativos** (API + emulador)
  Excluir a conta `qa-audit-levels-race@example.com` limpou `actorLabel` e `targetLabel` do `account.signUp`
  e dos dois `account.onboarding.complete` dela, e os eventos continuaram na trilha com ação, instante e
  `requestId`.

- [x] ✅ **Falha de gravação não derruba a ação** (unit)
  Se o Firestore recusar a gravação, a rota responde o mesmo que sem a trilha e o log `audit/write-failed`
  registra o motivo. Provado só por teste unitário (`auditRecorder.test.ts` e testes de rota).

- [x] ✅ **Textos nos 3 idiomas** (browser + paridade)
  Rótulos de nível, coluna, filtro e as ações novas apareceram em pt-br, en e es, sem chave crua na tabela.
  O teste de paridade de `@repo/internationalization` passou (67 testes).

## Roteiro de teste manual

1. `pnpm emulators`, `pnpm seed`, `pnpm --filter api dev` e `pnpm --filter app dev`, com os `.env` copiados
   dos `.env.example`.
2. Cadastrar `qa-audit-levels@example.com` em `/pt-br/sign-up` e concluir o onboarding com duplo clique em
   "Concluir". Esperado: um "Cadastro" e um "Onboarding concluído", ambos "Informativo".
3. Gerar um código `VERIFY_EMAIL` no Auth emulator, ler em `/emulator/v1/projects/demo-next-boilerplate/oobCodes`
   e chamar `POST /auth/email-verification/confirm`. Esperado: 200 e um "E-mail confirmado".
4. Entrar como `admin@example.com` e criar um usuário em `/admin/users`. Esperado: "Usuário criado pelo
   admin", "Sensível".
5. Gravar no emulador um `auditEvent` sem `level`. Esperado: aparece como "Sensível" em "Todos os níveis" e
   some no filtro "Sensível" até o `backfill-audit-levels --apply`.
6. Em `/admin/audit`, aplicar nível, usuário e período juntos e conferir a URL da requisição; depois
   "Limpar".
7. Repetir a página em `/en` e `/es`, em light e dark, com 1440, 820 e 390 px de largura.
