# Análise e blueprint — Direitos do titular: exportar dados e excluir conta

| | |
|---|---|
| Spec de origem | [`specs/data-rights-lgpd.md`](../spec.md) |
| Esforço declarado na spec | G |
| Data da análise | 2026-09-23 |
| Branch | a definir pelo `/review` (a atual, `kathmandu-v1`, não segue o padrão do repo) |
| Slice de referência | `entity` (CRUD) e `account` (PR #12, superfície mais próxima) |

As três perguntas em aberto da spec chegaram com recomendação escrita e foram **adotadas sem
reabertura**: anonimizar o que tem retenção obrigatória e apagar o resto; anunciar o prazo de 15 dias e
documentar a folga da Res. CD/ANPD 2/2022; exigir reautenticação recente para excluir e manter a
exportação síncrona.

## Medições que a análise recebeu prontas

Foram feitas nesta rodada, antes do planejamento, e mudam o corte. Não as refaça no `/develop`.

| Medição | Resultado | Consequência |
|---|---|---|
| Cloud Storage do projeto de referência | 404 em `firebasestorage.app` e em `appspot.com`. Nenhum bucket existe; exige plano Blaze | O expurgo de arquivos nasce como ponto de extensão que degrada, não como caminho verificável |
| Chave da Stripe | Não existe nenhum `.env.local` no repositório; `billing-subscription` em 0/6 | O cancelamento de assinatura idem. Reforçado pelo código: `grep` por `customerId`/`stripeCustomerId` em `apps/`, `packages/sdk` e `packages/payments` devolve zero, então não há sequer vínculo entre perfil e cliente Stripe para cancelar |
| Índices compostos publicados | 1 de 7 declarados em `firestore.indexes.json` (`user`: `reference_id` + `deletedAt`) | Todo desenho abaixo evita índice novo. Ver seção 2.2 |
| CI | `03498ae` é `origin/main` e o HEAD local, com CI `success` | Base limpa para trabalhar |

## Etapa 1 — Análise

### 1. Contexto

Quem se cadastra num fork não consegue levar os próprios dados embora nem sair. `apps/api/app/(routes)/account/`
expõe `GET` (`route.ts:97`), `PUT` (`route.ts:107`), `POST /account/password` e
`POST /account/sessions/revoke`, e nada mais. O `DELETE` que existe está em
`apps/api/app/(routes)/users/[id]/route.ts:101`, sob `requireAdminApi`, fora do alcance do usuário comum.

Pior que a ausência: o mecanismo que existe mente. `BaseRepository.delete()`
(`apps/api/(shared)/repositories/base.repository.ts:209-211`) é `this.update({ id, deletedAt: new Date() })`
e nada mais. A conta no Firebase Auth continua existindo, o e-mail continua ocupado e o documento de perfil
continua inteiro, com `phone`, `avatar`, `preferences` e `lastAccessAt` dentro. Um fork que hoje declare
conformidade com o art. 18-VI está declarando o que o código não faz, e
[`docs/PRE-PRODUCTION.md:531-534`](../../../PRE-PRODUCTION.md) já registra isso por escrito.

A área de conta criada pela PR #12 barateia o trabalho: existe rota, guard de painel comum, abas e copy
traduzida. Esta tarefa acrescenta uma aba a uma tela pronta em vez de inaugurar superfície.

#### Objetivo em uma frase

O titular baixa um arquivo com os próprios dados e apaga a própria conta pela área de conta, sem pedir a
ninguém, e o que a exclusão não pode destruir fica anonimizado em vez de intacto.

#### Corte desta rodada

Os cinco itens do corte da spec entram, com o item 3 recortado conforme as medições acima.

| # | Item do corte da spec | Entra? | Como |
|---|---|---|---|
| 1 | Baixar os próprios dados em formato legível por máquina | sim | `GET /account/export` + download montado no cliente |
| 2 | Excluir a própria conta com confirmação explícita | sim | `POST /account/deletion` com reautenticação por senha + `AlertDialog` |
| 3 | Exclusão coordenada, sem órfãos | **parcial, por infra** | Expurgo real de Firestore e Firebase Auth. Arquivos e assinatura viram passos declarados do orquestrador que reportam `skipped` com motivo. Ver seção 4.4 |
| 4 | Declarar o prazo aplicável nos 3 idiomas | sim | Copy na aba de privacidade e na página legal, 15 dias |
| 5 | Canal de privacidade publicado + política que declare os próprios cookies | sim | `NEXT_PUBLIC_PRIVACY_CONTACT` + seção de cookies nas páginas legais |

A obrigação herdada de [`user-activity-tracking`](../../user-activity-tracking/spec.md) está coberta:
`lastAccessAt` (`packages/sdk/src/types/user/user.ts:27`) vive no documento de perfil, que o export lê
inteiro e o expurgo apaga inteiro. O custo é uma asserção em cada um dos dois testes, não um fluxo.

#### Fora do corte

Herdado da spec, sem reabertura: os demais direitos do art. 18 com fluxo próprio (correção, bloqueio,
informação sobre compartilhamento, revogação de consentimento); painel administrativo de pedidos com fila
e SLA; exportação assíncrona com link expirável; e tudo que é documento em vez de código (RoPA, runbook de
incidente, DPA e subprocessadores, transferência internacional).

Acrescentado por esta análise, com a justificativa em cada linha:

| Fora do corte | Por quê |
|---|---|
| Registro de consentimento durável no servidor | A escolha vive no cookie `bp:cookie-consent` (`packages/analytics/consent.ts:1`). Guardá-la no servidor é coleta nova, com base legal própria, e é spec separada. O export carrega a cópia lida do navegador, rotulada como tal |
| Janela de arrependimento antes da exclusão | Exigiria agendador, e não há nenhum no repo. A exclusão é imediata, como a spec pede em "não consegue mais entrar" |
| Exclusão em autoatendimento para conta só com Google | Sem provedor de senha não há como reautenticar sem um segundo fluxo de popup. A rota recusa e aponta o canal, igual ao que `POST /account/password` já faz em `route.ts:30-35`. Ver decisão D5 |
| Transformar o `DELETE /users/[id]` do admin em expurgo | O admin apagar de verdade por iniciativa própria é o controlador destruindo dado sem pedido do titular. Ver decisão D8 |
| Confirmação por e-mail da exclusão | `sendEmail` degrada para `not-configured` sem `RESEND_*` (`packages/email/index.ts:99-102`), e a conta já não existe para receber. Nada a provar nesta rodada |

### 1.2 Apps impactados, painel e modo de produto

| Camada | O que muda |
|---|---|
| `packages/sdk` | 2 actions, 3 tipos, 2 valores de `AuditAction` |
| `apps/api` | 2 rotas, 1 schema, 1 orquestrador de expurgo, 3 métodos de repositório, 1 helper de storage, 1 entrada de rate limit |
| `apps/app` | 1 aba na área de conta, 1 hook, 1 schema de formulário, 1 helper de download |
| `apps/web` | Conteúdo das páginas legais: seção de cookies, direitos reescritos, canal publicado |
| `packages/internationalization` | Chaves da aba, rótulos de 2 ações de auditoria, `apiErrors` novos, seções legais |
| `packages/next-config` | `NEXT_PUBLIC_PRIVACY_CONTACT` |

**Área do painel**: comum. O guard é `requireCommonPanelApi` (`apps/api/app/(guards)/common-panel.ts:32`),
nunca `requireAdminApi`.

**Modo de produto**: a aba vive no grupo `(common)`, que no modo `simple` o usuário comum não alcança
(o painel é admin-only). Nesse modo o fork depende do canal publicado na `apps/web`, que o item 5 entrega.
Nenhum arquivo desta tarefa lê `NEXT_PUBLIC_PRODUCT_MODE`, então não há ramificação de código; a
consequência é de produto e fica registrada aqui.

**Assinatura ativa**: não há dependência. Não existe fluxo de assinatura para depender dele.

**Contenção evitada**: a spec declara `contends_on: packages/auth/server.ts`, disputado com
`account-security-mfa`. O desenho abaixo **não toca nesse arquivo**: usa `getAuthInstance().deleteUser(uid)`
direto na API, que é o padrão já praticado em `account/route.ts:80` e `users/[id]/route.ts:81` com
`updateUser`. A contenção desaparece.

### 1.3 Fontes

A entrada foi a spec do backlog, lida integralmente. Não há card do ClickUp, wiki, Figma nem print
associados. Nenhuma referência ficou por ler.

### 2. Dados (Firestore)

#### 2.1 Coleções e documentos

Nenhum campo novo, nenhuma coleção nova. A tarefa muda o que se faz com o que já existe.

| Coleção | Papel aqui |
|---|---|
| `user` | Perfil do titular. Export lê; expurgo **apaga de verdade** |
| `entity` | Registros criados pelo titular. Export lê todos, inclusive os soft-deletados; expurgo apaga de verdade |
| `auditEvent` | Trilha. Export lê a parte que envolve o titular; expurgo **retém e anonimiza os rótulos** |

O que o expurgo faz com cada alvo, que é a tradução da recomendação adotada ("anonimizar o que tem
retenção obrigatória, apagar o resto"):

| Alvo | Ação | Justificativa |
|---|---|---|
| Conta no Firebase Auth | apagar | Libera o e-mail e impede o login. É o que faz "excluir" excluir |
| Documento `user` | apagar | Carrega `phone`, `avatar`, `preferences` e `lastAccessAt`. Soft delete preservaria tudo |
| Documentos `entity` do titular | apagar | Conteúdo do titular; o core não tem obrigação de retenção sobre ele |
| Objetos em `uploads/<profileId>/` | apagar por prefixo | Avatar e fotos de entidade. Hoje degradado (sem bucket) |
| Documentos `auditEvent` que envolvem o titular | reter, limpando `actorLabel`/`targetLabel` | A trilha é prestação de contas do controlador (LGPD art. 37) e é append-only por desenho. O que ela guarda de pessoal é o e-mail no rótulo, e é isso que sai |
| Assinatura Stripe | ponto de extensão | Não existe vínculo perfil↔cliente para cancelar |

Sobre o `targetLabel` que sai: o que sobra no evento é `targetUserId`, o id do documento de perfil. Depois
que o perfil é apagado, esse id não resolve para pessoa nenhuma em lugar nenhum da base. A trilha continua
provando que uma exclusão aconteceu, quando, e sob qual `requestId`, sem nomear quem.

O rótulo existir na trilha é decisão anterior e deliberada: `packages/sdk/src/types/audit/audit.ts:22`
documenta que ele é gravado "so the trail survives a deletion". A anonimização respeita o motivo (o evento
sobrevive) e retira só a parte que é dado pessoal.

#### 2.2 Consultas, e por que nenhuma exige índice novo

Dos 7 índices compostos declarados, só 1 está publicado. Qualquer índice novo entraria na mesma fila, e o
`/test` não conseguiria exercitar a consulta contra projeto real. **Todas as consultas desta tarefa usam um
único filtro de igualdade, servido pelo índice de campo único que o Firestore cria sozinho.**

| Consulta | Forma | Índice |
|---|---|---|
| Entidades do titular, inclusive soft-deletadas | `.where("userId","==",id)` | nenhum |
| Eventos de trilha que envolvem o titular | `.where("involvedUserIds","array-contains",id)` | nenhum (índice de array é automático) |
| Perfil por id | `doc(id).get()` | nenhum |

Nenhuma delas usa `orderBy`, e é essa ausência que mantém `firestore.indexes.json` intocado. O teste
`apps/api/__tests__/firestoreIndexes.test.ts` continua passando sem alteração, e nada entra na fila de
publicação.

Duas consequências a aceitar de olhos abertos, e a registrar:

1. O export lê as entidades sem ordenação. A ordem no arquivo é a que o Firestore devolver. Não importa
   para um arquivo de portabilidade, e evitar `orderBy` é o que mantém a consulta sem índice.
2. A varredura da trilha busca todos os eventos do titular em uma consulta só. Para um fork de MVP isso
   cabe. O limite fica declarado na seção 12.

Regras do Firestore não mudam: `firestore.rules` nega todo acesso direto de cliente e a API usa o Admin
SDK, que ignora as regras.

#### 2.3 Dados já gravados

Perfis soft-deletados pelo `DELETE /users/[id]` do admin continuam onde estão. Esta tarefa não faz
backfill: o expurgo só roda a pedido do titular, e um documento marcado como deletado não tem titular
pedindo. Sem script de migração.

### 3. Contrato `@repo/sdk`

Tipos novos em `packages/sdk/src/types/account/account.ts`, ao lado de `AccountDTO` (`:3-8`) e
`AccountConfirmation` (`:22-24`). Ver a forma escrita na seção 10.1.

| Símbolo | O que é |
|---|---|
| `AccountDataExportDTO` | O dossiê que `GET /account/export` devolve |
| `AccountDataExportRecord` | Um evento de trilha já reduzido para o export |
| `DeleteAccountRequest` | `{ currentPassword: string }` |

Actions novas em `packages/sdk/src/actions/account/action.ts`, que hoje tem 4 métodos (`:16`, `:25`, `:35`,
`:49`):

| Método | Verbo e path | Retorno |
|---|---|---|
| `exportData()` | `GET /account/export` | `Promise<AccountDataExportDTO>` |
| `deleteAccount(body)` | `POST /account/deletion` | `Promise<AccountConfirmation>` |

`AccountActions` já está registrada no `Client` (`packages/sdk/src/client/index.ts:19,24`), então não há
registro novo. Contexto `common`.

`AuditAction` (`packages/sdk/src/types/audit/audit.ts:2-8`) ganha dois valores: `ACCOUNT_DATA_EXPORT` e
`ACCOUNT_DELETE`. `AuditTargetType.ACCOUNT` já existe (`:12`).

**Quem quebra**: ninguém. Só há acréscimo. `rg` por `AccountActions` e por `AuditAction` confirma que os
consumidores são `apps/app` (aba de conta e trilha do admin) e a própria API, e ambos continuam compilando.
A única obrigação derivada é a copy: cada valor novo de `AuditAction` precisa de rótulo em
`packages/internationalization/translations/apps/app/pages/admin/auditTrail.ts` nos 3 idiomas (`:15-19`,
`:49-53`, `:83-87`), e o teste de paridade cobra isso porque são chaves de objeto.

### 4. API (`apps/api`)

#### 4.1 Rotas e guards

| Rota | Método | Guard | Rate limit |
|---|---|---|---|
| `/account/export` | `GET` | `requireCommonPanelApi` | sim, entrada nova em `proxy.ts` |
| `/account/deletion` | `POST` | `requireCommonPanelApi` | sim, entrada nova em `proxy.ts` |

Sem rota `[id]`: o sujeito vem sempre de `ctx.subjectProfile.id`, nunca do corpo nem da URL. Não há
ownership a checar porque não há id de entrada para confrontar, que é a forma mais forte de espelhar a
autorização.

O rate limit é obrigatório e não opcional. `apps/api/proxy.ts:42-51` casa o caminho por igualdade exata e o
comentário em `:40` diz o que isso significa: "a new endpoint is unlimited until it is listed here". As duas
rotas entram em `RATE_LIMITED_PATHS`. É o que responde ao vetor que a própria spec nomeia (exportação sem
limite é enumeração barata). Com `ARCJET_KEY` ausente o limitador é no-op
(`packages/security/index.ts:41-43`), o que é pendência de infra já catalogada, não desenho desta tarefa.

#### 4.2 Validação na borda

Só a exclusão tem corpo. Schema novo em `apps/api/(shared)/validation/account.schema.ts`, ao lado de
`changePasswordSchema` (`:39-47`) e com o mesmo `.strict()`, cujo comentário em `:21-25` explica que o
`.strict()` é a própria guarda de ownership do payload: um corpo que carregue `id` ou `uid` falha alto em
vez de ser ignorado em silêncio.

#### 4.3 Reautenticação

A recomendação adotada pede reautenticação recente. O repo já tem o mecanismo e o precedente:
`account/password/route.ts:38` chama `identitySignInWithPassword(email, currentPassword)` antes de trocar a
senha, e mapeia a falha com `mapPasswordCheckMessageToCode(error.message, "ACCOUNT_CURRENT_PASSWORD_INVALID")`
(`:41-44`) e `statusForAuthErrorCode` (`:47`). A exclusão usa exatamente isso.

Duas recusas antes de chegar lá:

- Sem e-mail no registro de Auth: `ACCOUNT_PASSWORD_UNSUPPORTED`, 400. Mesmo código e mesma situação de
  `account/password/route.ts:30-35`.
- Conta sem provedor de senha (só Google): `ACCOUNT_DELETION_REAUTH_UNSUPPORTED`, 400, detectada em
  `ctx.user.providerData` (o campo existe no `UserRecord` que o guard já resolveu, e está tipado em
  `packages/sdk/src/types/user/user.ts:67-73`). A aba mostra o canal de privacidade em vez do formulário.
  Ver decisão D5.

Não uso `lastSignInTime` como prova de login recente. O comentário de `packages/auth/session.ts:33-36`
registra que o bootstrap de SSO entre apps é uma autenticação nova e reescreve `auth_time`, então uma sessão
sequestrada consegue se fazer passar por recente. Contra o ataque que a spec nomeia, esse sinal não vale
nada; a senha vale.

#### 4.4 Orquestração do expurgo

Módulo novo `apps/api/(shared)/lib/account-erasure.ts`, exportando `runAccountErasure(input)`. Fica fora da
rota porque é o que torna o item 3 testável por unidade sem infra: cada passo devolve um resultado, e o
conjunto é o valor de retorno da função.

```ts
type ErasureStepName = "storage" | "billing" | "entities" | "auditTrail" | "profile" | "authAccount";
type ErasureStepResult =
    | { step: ErasureStepName; status: "done"; count?: number }
    | { step: ErasureStepName; status: "skipped"; reason: string }
    | { step: ErasureStepName; status: "failed"; reason: string };
```

Ordem dos passos, escolhida para que a conta continue utilizável enquanto o dado ainda está lá, e para que
o último passo irreversível seja o que tranca a porta:

1. Ler o rótulo do titular, **antes** de destruir qualquer coisa. Depois não haverá de onde ler.
2. `storage`: apagar objetos sob `uploads/<profileId>/`. Sem `isStorageConfigured()`, devolve
   `skipped: "storage-not-configured"`.
3. `billing`: ponto de extensão. Hoje devolve `skipped: "billing-not-configured"`, porque `getStripe()`
   responde `null` sem chave (`packages/payments/index.ts:16-20`) e porque não existe vínculo perfil↔cliente
   para cancelar.
4. `entities`: apagar de verdade, em páginas, inclusive as soft-deletadas.
5. `auditTrail`: limpar os rótulos pessoais dos eventos que envolvem o titular.
6. `profile`: apagar o documento `user`.
7. `authAccount`: `revokeUserSessions(uid)` e `getAuthInstance().deleteUser(uid)`.

Um passo `failed` **não** aborta os seguintes. Parar no meio deixaria o titular com a conta viva e metade
dos dados apagados, que é o pior dos dois estados. O relatório completo vai para `logEvent`, correlacionado
por `requestId`.

Depois do orquestrador, a rota grava o evento `ACCOUNT_DELETE` com `actorLabel: null` e `targetLabel: null`.
O evento tem de nascer sem rótulo, senão a gravação reintroduz o e-mail que o passo 5 acabou de tirar. A
`recordAuditEvent` nunca lança (`audit-recorder.ts:86-90`), então ela não pode falhar uma exclusão que já
aconteceu.

#### 4.5 Exportação

`GET /account/export` monta o dossiê e devolve `{ data }`. Três recortes deliberados:

- **Recusa sob impersonação.** O `assertReadOnlyWhileImpersonating` só barra métodos de escrita
  (`impersonation-read-only.ts:5,23`), então um `GET` passa. Um admin personificando já vê as telas do
  usuário, mas produzir um arquivo com o dossiê inteiro é extração, não suporte. A rota recusa com
  `ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN`, 403.
- **`avatarUrl` fora.** É URL assinada com 15 minutos de validade (`storage.ts:13`). Num arquivo que fica no
  disco do titular ela nasce morta e, enquanto viva, é um link público. O dossiê leva `avatar` (o caminho do
  objeto) e a lista de objetos.
- **Rótulo de terceiro redigido.** Um evento em que um admin agiu sobre o titular carrega o e-mail do admin
  em `actorLabel`. Entregar isso ao titular é vazar dado pessoal de outra pessoa. O export leva ação,
  instante e um `actorRole` (`self` ou `operator`), sem o rótulo alheio.

Teto de registros: constante `EXPORT_MAX_RECORDS`. Ao bater o teto, o dossiê traz `truncated: true` no bloco
correspondente em vez de responder pela metade em silêncio.

#### 4.6 Códigos de erro

Cinco códigos novos. Todos precisam de entrada em `apiErrors` nos 3 idiomas
(`packages/internationalization/translations/packages/shared/utils.ts`, blocos em `:7-85`, `:92-166`,
`:173-254`), que hoje tem 50 chaves por idioma. Sem isso o teste de paridade falha.

| `error.code` | Status | Quando |
|---|---|---|
| `ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN` | 403 | Export chamado por admin personificando |
| `ACCOUNT_EXPORT_FAILED` | 500 | A montagem do dossiê falhou |
| `ACCOUNT_DELETION_REAUTH_UNSUPPORTED` | 400 | Conta sem provedor de senha |
| `ACCOUNT_DELETION_FAILED` | 500 | O orquestrador não conseguiu apagar a conta de Auth |
| `ACCOUNT_DELETION_CONFIRMATION_INVALID` | 400 | Corpo sem `currentPassword` utilizável (fora do `VALIDATION_FAILED` genérico) |

Reaproveitados sem mudança: `ACCOUNT_CURRENT_PASSWORD_INVALID`, `ACCOUNT_PASSWORD_UNSUPPORTED`,
`USERS_AUTH_RATE_LIMITED`, `VALIDATION_FAILED`, `AUTH_REQUEST_IMPERSONATION_READ_ONLY`, `AUTH_RATE_LIMITED`.

### 5. Front-end (`apps/app`)

#### 5.1 Onde entra

Quinta aba na área de conta. `AccountTabs.tsx:19-24` declara `accountTabValues` como tupla `as const`, e
`resolveTab` (`:28-31`) resolve `?tab=` com fallback `profile`. Acrescentar `"privacy"` à tupla faz o deep
link `/account?tab=privacy` funcionar sem código novo de roteamento, e é isso que dá à página legal um
destino estável para onde apontar.

Sem prefetch RSC: as duas ações são disparadas pelo usuário, não são dado de tela. A página
`(home)/page.tsx` continua como está.

#### 5.2 Dados

Ambas as ações são `useMutation`, em `(hooks)/useAccountDataRights.tsx`, seguindo o formato de
`useAccountMutations.tsx` (`:19-20` para o tratamento de erro, `:22-57` para a forma das mutations).

A exportação **não** é `useQuery`. Ela tem efeito colateral (produz arquivo, é auditada, é limitada por
taxa) e um `useQuery` dispararia sozinho e manteria o dossiê inteiro em cache de memória. Por consequência,
não há chave nova em `queryKeys.ts` e `useAuthorizedQuery` não entra aqui.

| Mutation | Chama | Depois |
|---|---|---|
| `exportDataMutation` | `apiClient.account.exportData()` | Monta o arquivo no cliente e dispara o download; `successAlert` |
| `deleteAccountMutation` | `apiClient.account.deleteAccount(body)` | `signOut.mutate()`, que já limpa cookie e cache (`packages/auth/provider.tsx:372-382`) |

Erro pelo caminho de sempre: `handleClientError(new FormattedError(error, locale))` e `errorAlert`.

Não existe download de arquivo em nenhum lugar do repositório hoje, confirmado por varredura por
`createObjectURL`, `Blob`, `responseType` e `Content-Disposition`. O helper novo
`apps/app/shared/lib/downloadJsonFile.ts` é a primeira ocorrência, e por isso ganha teste próprio.

O download tem de ser montado no cliente, e não servido pela API com `Content-Disposition`: o SDK autentica
por bearer em header (`packages/sdk/src/client/base.ts:100-114`, escrito só pelo
`AuthRequestPanelProvider`), e uma navegação do browser para a URL da API não levaria header nenhum.

#### 5.3 Formulário e componentes

Arquivo novo `(components)/AccountPrivacyPanel.tsx`, com dois blocos, espelhando a estrutura de
`AccountSecurityForm.tsx` (formulário em cima, cartão `rounded-lg border` com ação destrutiva embaixo,
`:104-147`).

| Bloco | Componentes |
|---|---|
| Baixar meus dados | Texto do dicionário + `Button` que dispara `exportDataMutation`, com `isPending` bloqueando duplo clique |
| Excluir minha conta | `AlertDialog` com um `HookFormInputPassword` (`currentPassword`) e `Footer` dentro do `<form>` |

A confirmação explícita que a spec pede é o `AlertDialog`. Não há frase digitada além da senha: contra um
clique acidental o diálogo basta, e contra sessão sequestrada digitar o próprio e-mail não acrescenta nada,
porque o e-mail está na tela.

Sob impersonação os dois blocos ficam desabilitados, como `AccountSecurityForm.tsx:97,115` já faz, e o
`ImpersonationReadOnlyNotice` que `AccountTabs.tsx:65` renderiza acima do conteúdo explica o porquê.

Schema em `(validations)/accountDeletionSchema.ts`, factory `buildAccountDeletionSchema(dictionary)`, mesma
forma de `buildAccountPasswordSchema`.

Entradas de navegação: `paths.ts` ganha `account.privacy` ao lado de `account.billing` (`:54-57`) e
`routes.tsx` ganha o item correspondente em `settingsItems` (`:51-54`).

### 5.4 Front-end (`apps/web`)

As páginas legais são estáticas e leem o dicionário (`legal/privacy/page.tsx:17`). A mudança é de conteúdo
e de uma prop.

- `privacy.sections` ganha uma quarta entrada declarando os cookies que o próprio boilerplate grava. Hoje
  `grep -ci cookie` nesse dicionário devolve 0 nos 3 idiomas, enquanto o banner de consentimento aponta para
  `/legal/privacy` (`apps/web/app/[locale]/layout.tsx:39` e `apps/app/app/layout.tsx:48`). O produto pede
  consentimento e linka uma política que não fala de cookies.
- `privacy.sections` "Seus direitos" é reescrito: hoje manda "entrar em contato conosco" sem dizer com quem
  (pt-br `:38-41`, en `:88-91`, es `:138-141`). Passa a apontar o autoatendimento no painel e o canal, e a
  declarar o prazo de 15 dias.
- O canal vira prop do `LegalDocument`, renderizado como `mailto:` quando `NEXT_PUBLIC_PRIVACY_CONTACT`
  existe, e como link para `/contact` quando não existe. A rota `/contact` já funciona e entrega em
  `ownerInbox()` (`apps/web/app/[locale]/contact/actions/contact.tsx:18`), então o canal nasce funcional sem
  infra nova.

O inventário de cookies a declarar, com a fonte de cada nome. O `/develop` relê cada constante antes de
escrever a copy:

| Cookie | Onde é definido | Finalidade |
|---|---|---|
| `access-token` | `packages/auth/session.ts:14` | Sessão. Estritamente necessário |
| `bp:cookie-consent` | `packages/analytics/consent.ts:1`, TTL 180 dias em `:10-13` | Guarda a própria escolha de consentimento |
| `x-theme` | `apps/app/app/layout.tsx:21` | Tema claro/escuro |
| `x-locale` | lido em `packages/internationalization/server.ts:20` | Idioma |
| `sidebar_state` | `packages/design-system/components/ui/sidebar.tsx:28,108` | Barra lateral aberta ou fechada |
| `bp:panel-request-role`, `bp:impersonate-firebase-uid` | `apps/app/shared/lib/panelState.ts:18-19` | Contexto de painel e impersonação |
| `_ga*` | Google Analytics | Só quando `NEXT_PUBLIC_GA_MEASUREMENT_ID` está configurado e o consentimento foi dado |

A política continua sendo modelo, e o `disclaimer` que avisa isso continua onde está
(`legal/index.ts:27-28`, `:77-78`, `:127-128`). O que muda é que o modelo passa a ser honesto sobre o que o
próprio código faz. Escrever política real é de cada fork.

### 5.5 i18n

Árvore nova em `translations/apps/app/pages/common/account.ts`, que hoje tem 4 abas (`tabs` em `:5-9`):

```
tabs.privacy
privacy.description
privacy.export.{title,description,action,filenameHint}
privacy.delete.{title,description,action,dialogTitle,dialogDescription,
                currentPassword,confirm,cancel,unsupportedTitle,unsupportedDescription}
privacy.delete.validation.{required,min}
privacy.deadline
messages.{dataExported,accountDeleted}
```

Também: `routes.platform.settingsItems.privacy` em `translations/apps/app/pages/common/routes/index.ts`;
`"account.data.export"` e `"account.delete"` em `admin/auditTrail.ts`; os 5 `apiErrors`; e as seções legais
em `apps/web/pages/legal/index.ts`.

Atenção a um buraco real do teste de paridade: `parity.test.ts:16` trata array como folha, então
`privacy.sections` conta como **uma** chave e acrescentar a seção de cookies em só um idioma **não seria
pego**. Por isso a seção 7 planeja um teste dedicado a isso.

### 6. Autorização e segurança

| Ponto | Tratamento |
|---|---|
| Autorização no servidor | `requireCommonPanelApi` nas duas rotas; sujeito sempre de `ctx.subjectProfile.id`; nenhum id vem do cliente |
| Impersonação, exclusão | Já recusada: `POST` sob impersonação para em `assertReadOnlyWhileImpersonating` (`impersonation-read-only.ts:19`) com `AUTH_REQUEST_IMPERSONATION_READ_ONLY` 403, sem código novo. O teste prova que continua assim |
| Impersonação, export | Recusa explícita nova, porque `GET` passa pelo guard existente |
| Sessão sequestrada vira destruição de conta | Reautenticação por senha na borda |
| Exportação como enumeração barata | Escopo fixo no sujeito da sessão + rate limit por caminho |
| Vazamento de PII de terceiro no export | Rótulo de operador redigido |
| PII em log | O relatório de passos leva nomes de passo e contagens, nunca valores. `audit-recorder.ts:69-73` já estabelece que só o nome do erro vai para o log, porque a mensagem carrega caminhos e payload |
| Regras do Firestore, Arcjet | Regras não mudam. Arcjet ganha dois caminhos na lista |

Um detalhe que engana quem lê rápido: o helper se chama `assertReadOnlyWhileImpersonating`, mas nunca
lança. Ele devolve a resposta de recusa, e o guard faz early return com ela (`common-panel.ts:65-71`).

### 7. Testes

Todos no nível mais barato que prova o comportamento. Nenhum exige processo externo.

| Arquivo | Nível | O que prova |
|---|---|---|
| `apps/api/__tests__/accountErasure.test.ts` | unidade | A ordem dos passos; que `storage` devolve `skipped` sem `isStorageConfigured()`; que `billing` devolve `skipped`; que um passo `failed` não aborta os seguintes |
| `apps/api/__tests__/accountExportRoute.test.ts` | rota, `vi.mock` de repositórios e guard | Forma do dossiê; presença de `lastAccessAt`; ausência de `avatarUrl`; rótulo de operador redigido; recusa sob impersonação; `truncated` no teto |
| `apps/api/__tests__/accountDeletionRoute.test.ts` | rota | Senha errada devolve `ACCOUNT_CURRENT_PASSWORD_INVALID`; conta sem provedor de senha devolve `ACCOUNT_DELETION_REAUTH_UNSUPPORTED`; caminho feliz chama `deleteUser`; `POST` sob impersonação devolve `AUTH_REQUEST_IMPERSONATION_READ_ONLY` |
| `apps/api/__tests__/auditTrailAnonymization.test.ts` | repositório, Firestore falso | Limpa o rótulo do papel certo e **não** limpa o do admin quando o admin foi o ator; preserva ação, instante e `requestId` |
| `apps/api/__tests__/baseRepository.test.ts` | unidade, arquivo existente | `purge` apaga de fato e `delete` continua soft |
| `apps/app/__tests__/downloadJsonFile.test.ts` | unidade | Nome do arquivo, tipo MIME, e que o `objectURL` é revogado |
| `apps/app/__tests__/accountDeletionSchema.test.ts` | unidade | Mensagens vindas do dicionário real |
| `apps/app/__tests__/accountPrivacyPanel.test.tsx` | componente | Blocos desabilitados sob impersonação; estado de conta sem senha mostra o canal em vez do formulário |
| `apps/app/__tests__/useAccountDataRights.test.tsx` | hook | Exclusão bem-sucedida chama `signOut` |
| `packages/internationalization/__tests__/legalSections.test.ts` | unidade, novo | Os 3 idiomas têm o mesmo número de seções legais e todos têm a seção de cookies. Fecha o buraco do `parity.test.ts:16` |

Nenhum teste de emulador está planejado. O que o emulador provaria aqui (que o Firestore de verdade aceita
as consultas) é exatamente o que o desenho sem índice novo torna desinteressante, e o emulador serve
qualquer consulta de qualquer jeito, indexada ou não (`firestoreIndexes.test.ts:22-24`).

### 8. O que o `/test` vai ter de percorrer

Fluxos nomeados, para `agent-browser`, nos 3 idiomas, em light, dark e mobile:

1. **Baixar meus dados.** `/account?tab=privacy`, clicar, arquivo baixado. Abrir o arquivo e conferir que o
   perfil está lá com `lastAccessAt`, que as entidades estão lá, e que não há `avatarUrl`.
2. **Excluir a conta, senha errada.** Mensagem traduzida de `ACCOUNT_CURRENT_PASSWORD_INVALID`, conta intacta.
3. **Excluir a conta, senha certa.** Deslogado, e então a prova que importa: **tentar cadastrar de novo com
   o mesmo e-mail e conseguir.** É o que distingue esta entrega do soft delete de hoje, e é observável na
   tela sem abrir console nenhum.
4. **Depois da exclusão**, o admin abre a trilha e encontra o evento de exclusão sem e-mail, e os eventos
   anteriores daquele usuário também sem e-mail.
5. **Admin personificando** abre a aba: os dois blocos desabilitados, com o aviso de leitura.
6. **Páginas legais** nos 3 idiomas: seção de cookies presente, canal de privacidade clicável, prazo de 15
   dias visível. Sem `NEXT_PUBLIC_PRIVACY_CONTACT` o link cai em `/contact`.
7. **Duplo clique** no botão de exportar e no de confirmar exclusão: `isPending` bloqueia o segundo.

Estados a produzir: conta de QA com pelo menos duas entidades (uma delas soft-deletada, criando e
apagando), e um evento de trilha gerado por uma troca de senha antes da exclusão.

Credencial de QA vai para `.claude/dev-credentials.local.md`, que é gitignored. **Nenhuma senha, token ou
e-mail de pessoa real entra em arquivo de `docs/features/`**, nem em roteiro, nem em log colado, nem em nome
de arquivo.

#### O que o `/test` não consegue verificar, e por quê

| Item | Marca | Motivo |
|---|---|---|
| Objetos somem do bucket | 🔒 | Nenhum bucket existe (404 medido hoje em `firebasestorage.app` e `appspot.com`); exige plano Blaze. Não há emulador de Storage neste setup, e `storage.ts:25-30` documenta que fingir que há escreveria no bucket real |
| Assinatura cancelada junto | 🔒 | Sem chave da Stripe e sem vínculo perfil↔cliente. O passo existe e reporta `skipped` |
| Consulta real contra projeto Firestore | 🔒 parcial | O desenho não adiciona índice, então não há nada na fila. O emulador prova o comportamento; produção fica para a primeira execução real |
| Entrega do e-mail no canal de privacidade | 🔒 | Depende de `RESEND_*` configurado no fork. O link renderizar é verificável; a entrega não |
| Rate limit efetivo | 🔒 | Sem `ARCJET_KEY` o limitador é no-op (`packages/security/index.ts:41-43`). Que o caminho está na lista é verificável por leitura e por teste |

Nenhum desses é falha de código. Reprovar qualquer um deles seria reprovar a ausência de cartão de crédito.

### 9. Critérios de aceite

Os critérios no formato da §9.1 são gerados pelo `/test`. Os eixos que eles têm de cobrir, além dos fluxos
acima: usuário comum, admin, admin personificando e não autenticado; corpo com campo a mais
(`.strict()` recusa); senha vazia, curta e só com espaços; conta sem provedor de senha; export com zero
entidades; export no teto de registros; exclusão com duplo clique; e cada `error.code` novo com a mensagem
traduzida nos 3 idiomas.

## Etapa 2 — Blueprint técnico

### 10.1 Contrato

```ts
// packages/sdk/src/types/account/account.ts
export type AccountDataExportRecord = {
    action: string;
    /** Quem agiu, sem nomear terceiro: o próprio titular ou um operador. */
    actorRole: "self" | "operator";
    createdAt: string;
    requestId: string | null;
};

export type AccountDataExportDTO = {
    generatedAt: string;
    format: { name: "account-data-export"; version: 1 };
    subject: { profileId: string; uid: string };
    /** Perfil como o titular o vê, sem `avatarUrl`: a URL assinada expira em 15 minutos. */
    account: Omit<AccountDTO, "avatarUrl">;
    records: { entities: EntityDTO[]; truncated: boolean };
    auditEvents: { items: AccountDataExportRecord[]; truncated: boolean };
    storageObjects: { path: string }[];
};

export type DeleteAccountRequest = { currentPassword: string };
```

```ts
// packages/sdk/src/actions/account/action.ts
async exportData(): Promise<AccountDataExportDTO> {
    const { data } = await this.client.request<Response<AccountDataExportDTO>>({
        url: "/account/export",
        method: "GET",
    });
    return data.data;
}

async deleteAccount(body: DeleteAccountRequest): Promise<AccountConfirmation> {
    const { data } = await this.client.request<Response<AccountConfirmation>>({
        url: "/account/deletion",
        method: "POST",
        data: body,
    });
    return data.data;
}
```

O bloco `cookieConsent` não está no DTO de propósito: ele é acrescentado no cliente, ao montar o arquivo,
porque a escolha vive no cookie do navegador e o servidor não tem cópia. O arquivo salvo traz a seção
rotulada como lida daquele navegador.

### 10.2 Rotas

```ts
// apps/api/app/(routes)/account/export/route.ts
export const GET = requireCommonPanelApi(async (req, ctx) => {
    if (ctx.authRequest.isImpersonating) {
        return Response.json(
            { error: { code: "ACCOUNT_EXPORT_IMPERSONATION_FORBIDDEN" } },
            { status: HTTP_STATUS.FORBIDDEN }
        );
    }

    let payload: AccountDataExportDTO;
    try {
        payload = await buildAccountDataExport(ctx.subjectProfile);
    } catch {
        return Response.json(
            { error: { code: "ACCOUNT_EXPORT_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    await recordAuditEvent({
        action: AuditAction.ACCOUNT_DATA_EXPORT,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: ctx.user.email ?? null,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: ctx.user.email ?? null,
        requestId: requestIdFrom(req),
    });

    return Response.json({ data: payload });
});
```

```ts
// apps/api/app/(routes)/account/deletion/route.ts
export const POST = requireCommonPanelApi(async (req, ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = parseDeleteAccount(parsedBody.value);
    if (!parsed.ok) return parsed.response;

    const email = ctx.user.email;
    if (!email) {
        return Response.json(
            { error: { code: "ACCOUNT_PASSWORD_UNSUPPORTED" } },
            { status: HTTP_STATUS.BAD_REQUEST }
        );
    }
    if (!hasPasswordProvider(ctx.user)) {
        return Response.json(
            { error: { code: "ACCOUNT_DELETION_REAUTH_UNSUPPORTED" } },
            { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

    try {
        await identitySignInWithPassword(email, parsed.value.currentPassword);
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            const code = mapPasswordCheckMessageToCode(
                error.message,
                "ACCOUNT_CURRENT_PASSWORD_INVALID"
            );
            return Response.json({ error: { code } }, { status: statusForAuthErrorCode(code) });
        }
        throw error;
    }

    const requestId = requestIdFrom(req);
    const report = await runAccountErasure({
        profile: ctx.subjectProfile,
        uid: ctx.user.uid,
        requestId,
    });

    if (report.some((s) => s.step === "authAccount" && s.status !== "done")) {
        return Response.json(
            { error: { code: "ACCOUNT_DELETION_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    // Sem rótulo: a varredura acabou de retirar o e-mail dos eventos antigos, e escrever
    // um evento novo com ele o traria de volta.
    await recordAuditEvent({
        action: AuditAction.ACCOUNT_DELETE,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: null,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: null,
        requestId,
    });

    return Response.json({ data: { confirmed: true } });
});
```

Resposta de exemplo do export, abreviada:

```json
{
  "data": {
    "generatedAt": "2026-09-23T20:14:00.000Z",
    "format": { "name": "account-data-export", "version": 1 },
    "subject": { "profileId": "6h2k...", "uid": "M1n0..." },
    "account": {
      "id": "6h2k...", "type": "common", "email": "titular@example.com",
      "displayName": "Titular", "phone": null, "avatar": "uploads/6h2k.../a1b2.jpg",
      "preferences": { "theme": "system", "locale": "pt-br" },
      "lastAccessAt": "2026-09-23T19:58:00.000Z",
      "createdAt": "2026-05-02T10:00:00.000Z"
    },
    "records": { "entities": [{ "id": "e1", "name": "Alfa", "deletedAt": null }], "truncated": false },
    "auditEvents": {
      "items": [{ "action": "account.password.change", "actorRole": "self",
                  "createdAt": "2026-09-20T12:00:00.000Z", "requestId": "req_..." }],
      "truncated": false
    },
    "storageObjects": [{ "path": "uploads/6h2k.../a1b2.jpg" }]
  }
}
```

Payload da exclusão: `{ "currentPassword": "..." }`. Resposta: `{ "data": { "confirmed": true } }`, 200.

### 10.3 Persistência

Três métodos novos de repositório e um helper de storage.

```ts
// base.repository.ts — ao lado do delete() soft, que fica como está
/**
 * Remove o documento de fato. `delete()` só carimba `deletedAt`, e um titular que
 * exerceu o direito de eliminação não pode continuar guardado.
 * `protected`: só o repositório que decidir expor é que expõe.
 */
protected async purge(id: string): Promise<void> {
    await this.db.collection(this.table).doc(id).delete();
}
```

```ts
// user.repository.ts
purgeProfile(id: string): Promise<void> {
    return this.purge(id);
}

// entity.repository.ts — sem filtro de deletedAt de propósito: um registro soft-deletado
// guarda os mesmos dados do titular que um ativo.
async purgeAllByUserId(userId: string): Promise<number> { /* páginas de 500 até esvaziar */ }
async findAllByUserId(userId: string): Promise<EntityDTO[]> { /* leitura única, para o export */ }

// audit-event.repository.ts — a coleção é append-only e update() lança
// AuditEventImmutableError. Este método é a exceção deliberada: o evento permanece,
// com ação, instante e requestId intactos; sai apenas o rótulo que nomeia a pessoa.
async anonymizeUserLabels(userId: string): Promise<number> { /* array-contains + WriteBatch */ }
```

`anonymizeUserLabels` limpa por papel, não em bloco: zera `actorLabel` quando `actorUserId === userId` e
`targetLabel` quando `targetUserId === userId`. Um evento em que um admin agiu sobre o titular mantém o
rótulo do admin, que não pediu eliminação nenhuma.

```ts
// storage.ts — hoje só existe deleteObjectQuietly(path), e os 2 call sites de produção
// (entities/[id]/route.ts:90 e account/route.ts:158) são de troca, nunca de expurgo.
export async function deleteObjectsByPrefix(prefix: string): Promise<number> {
    // bucket().deleteFiles({ prefix, force: true }) e contagem do que havia
}
```

Varrer por prefixo, e não objeto a objeto, é o que faz o expurgo não dobrar de trabalho a cada recurso novo
que aceite upload: tudo de um titular já vive sob `uploads/<profileId>/` por construção
(`storage.ts:37-38`).

### 10.4 Árvore de arquivos do front

```
apps/app/app/[locale]/(authenticated)/(common)/(pages)/account/
  (components)/AccountPrivacyPanel.tsx        novo
  (components)/AccountTabs.tsx                editado (5ª aba)
  (hooks)/useAccountDataRights.tsx            novo
  (validations)/accountDeletionSchema.ts      novo
apps/app/app/[locale]/(authenticated)/(common)/
  paths.ts                                    editado (account.privacy)
  routes.tsx                                  editado (settingsItems.privacy)
apps/app/shared/lib/downloadJsonFile.ts       novo
```

Campos do formulário de exclusão:

| Campo | Componente | Label |
|---|---|---|
| `currentPassword` | `HookFormInputPassword` | `privacy.delete.currentPassword` |

### 10.5 Pseudo-diffs dos arquivos existentes

```diff
  // apps/api/proxy.ts:42-51
  const RATE_LIMITED_PATHS = [
      ...
      "/files",
+     "/account/export",
+     "/account/deletion",
  ];
```

```diff
  // packages/sdk/src/types/audit/audit.ts:2-8
  export enum AuditAction {
      ...
      ACCOUNT_PASSWORD_CHANGE = "account.password.change",
+     ACCOUNT_DATA_EXPORT = "account.data.export",
+     ACCOUNT_DELETE = "account.delete",
  }
```

```diff
  // account/(components)/AccountTabs.tsx:19-24
  const accountTabValues = [
      "profile",
      "security",
      "preferences",
      "billing",
+     "privacy",
  ] as const;
```

```diff
  // packages/next-config/keys.ts, bloco client
+     /** Endereço de privacidade do fork. Vazio: as páginas legais caem no link de /contact. */
+     NEXT_PUBLIC_PRIVACY_CONTACT: z.string().optional(),
```

```diff
  // apps/web/app/[locale]/legal/components/legal-document.tsx
- export function LegalDocument({ doc }: { doc: LegalDoc }) {
+ export function LegalDocument({ doc, contact }: { doc: LegalDoc; contact: string | null }) {
```

Ponto de atenção no `AccountTabs.tsx`: a aba ativa é semeada uma vez no mount
(`useState(() => resolveTab(...))`, `:42-44`) e a URL é sincronizada por `window.history.replaceState`
(`:52`). Chegar em `/account?tab=privacy` vindo da página legal funciona; trocar de aba não navega. Não
mexa nesse mecanismo.

### 10.6 Ordem de implementação e commits

Nove commits, na ordem de dependência do repo. Cada linha é um commit.

| # | Escopo | Mensagem |
|---|---|---|
| 1 | `packages/sdk` | `feat(sdk): account data export and deletion contract` |
| 2 | `packages/next-config` | `feat(next-config): privacy contact env` |
| 3 | `apps/api` | `feat(api): account data export endpoint` |
| 4 | `apps/api` | `feat(api): erase the account of the data subject` |
| 5 | `apps/api` | `feat(api): rate limit the data rights endpoints` |
| 6 | `apps/app` | `feat(app): privacy tab with data export and account deletion` |
| 7 | `apps/web` | `feat(web): declare cookies and publish the privacy channel` |
| 8 | `packages/internationalization` | `feat(internationalization): data rights copy and api errors` |
| 9 | `docs/features` | `docs(features): data-rights-lgpd` |

Testes acompanham o commit da funcionalidade que cobrem. Se a rodada apertar, o ponto de corte limpo é
entre 5 e 6: os commits 1 a 5 entregam a API inteira e os 6 a 8 a superfície. O item 5 do corte (commit 7)
não depende de nenhum dos outros e pode ir sozinho.

⚠️ Antes do primeiro commit, `git diff --cached --stat` tem de sair vazio. O working tree desta rodada tem
um `git mv` de spec já preparado pela auditoria do backlog, e ele **não** pertence a nenhum commit desta
lista.

### 10.7 Env nova

| Variável | Onde | Obrigatória? | Sem ela |
|---|---|---|---|
| `NEXT_PUBLIC_PRIVACY_CONTACT` | `packages/next-config/keys.ts`, consumida por `apps/web` | não | As páginas legais linkam `/contact` em vez de um `mailto:` |

Entra também nos dois `.env.example` (`apps/web/.env.example`, `apps/app/.env.example`) e na lista de
variáveis de [`docs/SETUP.md`](../../../SETUP.md).

## 11. Pré-requisitos de infra, que o `/develop` não consegue satisfazer

Vão para [`docs/PRE-PRODUCTION.md`](../../../PRE-PRODUCTION.md) na entrega. O `/test` precisa desta lista
para classificar como 🔒 em vez de ❌.

| Pré-requisito | Quem resolve | Sem ele |
|---|---|---|
| Cloud Storage ativado (plano Blaze) | Operador do fork | O passo `storage` reporta `skipped`. Um fork que use upload e não ative isso deixa objetos órfãos no bucket depois de uma exclusão |
| Chaves da Stripe e vínculo perfil↔cliente | `billing-subscription` | O passo `billing` reporta `skipped` |
| `NEXT_PUBLIC_PRIVACY_CONTACT` por fork | Operador do fork | Canal cai no formulário de contato |
| `RESEND_FROM` e `RESEND_TOKEN` | Operador do fork | O formulário de contato não entrega |
| `ARCJET_KEY` | Operador do fork | Rate limit é no-op |
| Política de privacidade real | Operador do fork | O modelo declara os cookies do core, e o aviso de que é modelo continua na página |

## 12. Pós-entrega e limites conhecidos

- **Rollback**: reverter os commits devolve o código. O dado apagado não volta, e não há de onde voltar. É
  a natureza da funcionalidade, não um defeito do plano.
- **Toda coleção nova passa a ter dívida.** Um recurso novo que guarde dado do titular precisa entrar no
  export e no orquestrador, ou os dois passam a mentir. O orquestrador ser uma lista de passos nomeados
  existe para que essa dívida seja visível em um arquivo só.
- **Teto de escala da varredura da trilha**: a anonimização busca todos os eventos do titular em uma
  consulta. Um fork com volume alto de trilha por pessoa precisa paginar isso.
- **Dois sentidos para "excluir"** convivem depois desta entrega: o admin continua fazendo soft delete
  (`users/[id]/route.ts:117`) e o titular passa a fazer expurgo. Ver decisão D8.
- **A declaração do `lastAccessAt` em `docs/PRE-PRODUCTION.md:531-534` fica desatualizada na entrega** e
  precisa ser reescrita no mesmo ciclo. Ela diz hoje que a exclusão de verdade "depende de
  `specs/data-rights-lgpd.md`, que ainda não foi implementada". Depois desta tarefa passa a ser verdade
  pelo caminho do titular e continua falso pelo caminho do admin, e o texto tem de dizer as duas coisas.

## Decisões tomadas sem perguntar

Modo autônomo. Cada linha traz a alternativa descartada.

| # | Decisão | Alternativa descartada |
|---|---|---|
| D1 | Aba nova `privacy` na área de conta | Dobrar os dois blocos dentro da aba `security`. Custaria 2 arquivos a menos, mas a página legal precisa de um destino estável para onde mandar o titular, e o mecanismo de `?tab=` já entrega isso |
| D2 | `POST /account/deletion` | `DELETE /account`. O payload carrega credencial, e o repo já resolve ação sensível com payload como sub-recurso `POST` (`/account/password`, `/account/sessions/revoke`) |
| D3 | Download montado no cliente | `Content-Disposition` servido pela API. Impossível: o SDK autentica por header e uma navegação do browser não levaria o bearer |
| D4 | Reautenticação por senha | `lastSignInTime` como prova de login recente. `packages/auth/session.ts:33-36` registra que o bootstrap de SSO reescreve `auth_time`, então o sinal não resiste ao ataque que ele deveria barrar |
| D5 | Conta sem provedor de senha não exclui em autoatendimento; a aba mostra o canal | Popup do Google para reautenticar. É um segundo fluxo de autenticação inteiro. O repo já trata o caso análogo assim em `POST /account/password` |
| D6 | Nenhuma consulta nova com `orderBy`, para não criar índice | Paginar o export com `paginate()`, que ordena por `createdAt` e exigiria índice composto. Com 1 de 7 índices publicados, seria funcionalidade nascendo bloqueada |
| D7 | Trilha retida com rótulos anonimizados | Apagar os eventos do titular. Destruiria a prestação de contas do controlador, que é justamente a retenção que a recomendação adotada manda preservar |
| D8 | `DELETE /users/[id]` do admin continua soft delete | Unificar os dois no expurgo. O admin apagar de verdade por iniciativa própria é o controlador destruindo dado sem pedido do titular, que é outra decisão de produto |
| D9 | Eventos de trilha entram no export com o rótulo de terceiro redigido | Omitir a trilha do export. São dados sobre o titular e cabem no art. 18-II; o que não cabe é entregar junto o e-mail do operador |
| D10 | `avatarUrl` fora do arquivo | Incluir. A URL assinada expira em 15 minutos: nasce morta no arquivo e, enquanto viva, é um link aberto |
| D11 | Relatório de passos vai para `logEvent`, não para a resposta nem para `changedFields` | Devolver os passos ao titular. É informação de operação, e `changedFields` está documentado como "nomes de campo, nunca valores" |
| D12 | Consentimento de cookie entra no arquivo pelo cliente, rotulado como lido daquele navegador | Guardar o consentimento no servidor. É coleta nova com base legal própria, e é spec separada |
| D13 | `purge` como nome do método, `protected` na base | `hardDelete`. `purge` não se confunde com o `delete` soft que fica ao lado |
| D14 | Exclusão imediata | Janela de arrependimento de 30 dias. Exigiria agendador, que não existe no repo |
| D15 | `apiClient.account.deleteAccount(body)` | `delete(body)`. Em todas as outras actions `delete` recebe um id e emite HTTP DELETE; reusar o nome faria o SDK mentir sobre a própria convenção |

## Perguntas em aberto

Nenhuma bloqueia a implementação. Cada uma já tem a opção adotada, e o plano foi escrito em cima dela.

1. **Conta só com Google fica sem exclusão em autoatendimento.** Opções: (a) recusar e apontar o canal;
   (b) implementar reautenticação por popup do Google. **Adotada: (a)**, por consistência com
   `POST /account/password`, que já recusa a mesma classe de conta. O direito continua atendido pelo canal,
   mas a experiência é pior para quem entrou com Google, e num fork que só ofereça Google isso vira o
   caminho único.
2. **O `DELETE /users/[id]` do admin continua sendo soft delete.** Depois desta entrega "excluir" quer dizer
   duas coisas diferentes conforme quem clica. Opções: (a) manter; (b) unificar no expurgo; (c) renomear a
   ação do admin para algo como "desativar". **Adotada: (a)** nesta rodada. A (c) é barata e resolveria a
   ambiguidade de vocabulário sem tocar em comportamento.
3. **A aba nova é `privacy` ou `data`?** **Adotada: `privacy`**, porque é o termo que a página legal e o
   banner de cookies já usam. `data` descreveria melhor a exportação e pior a exclusão.
4. **Teto de registros no export.** Adotado um limite com `truncated: true` em vez de resposta parcial
   silenciosa. O valor exato (5000 foi o número considerado) é arbitrário e nenhum fork tem volume medido
   para justificá-lo.
5. **O prazo de 15 dias é anunciado em texto fixo.** Um fork que se declare agente de pequeno porte tem
   direito a 30 dias pela Res. CD/ANPD 2/2022 e teria de editar a tradução. **Adotada:** texto fixo com a
   folga documentada, conforme a recomendação da spec. A alternativa seria uma env com o número, o que
   parece precisão demais para o que é uma frase.

## Referências não lidas

Nenhuma. A spec foi a única fonte e não aponta para material externo inacessível.
